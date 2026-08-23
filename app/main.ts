/**
 * MasterBook · местно-първо (ADR-001, носител В).
 *
 * Журналът живее в браузъра на собственика. Няма сървър, няма мрежа,
 * няма чакане. Вратата стои над него и не знае кой носител е отдолу.
 */

import {
  KotvaVLocalStorage,
  type Pravata,
  proveriKotvata,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import {
  klyuchalkaMezhduRazdeli,
  kolkoMyasto,
  osiguriHranilishte,
  type SastoyanieNaHranilishteto,
} from '../src/nositel/hranilishte.js';
import { otvoriDnevnik, type DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { duljimo, prosrocheni } from '../src/ogledalo/ogledalo.js';
import { GreshkaVnos, vnesiZhurnal } from '../src/domein/vnos.js';
import { ekraniraj, narisuvayImoti, zakachiFormite } from './imoti.js';
import { narisuvayPari, zakachiPari } from './pari.js';
import { narisuvaySmetki, zakachiSmetki } from './smetki.js';
import { narisuvayButona, narisuvayPlana, zakachiIztochnitsi } from './iztochnitsi.js';
import { arhivZaEksel } from './arhiv.js';
import { zakachiFiltri } from './filtri.js';
import { chetiIzbor, narisuvayTablo, zakachiTablo } from './tablo.js';
import { EdinSobstvenik, type Samolichnost } from '../src/yadro/samolichnost.js';
import { type Izbor, mozhe, type Vazmozhnost } from '../src/domein/planove.js';
import { paket, PAKET_PO_PODRAZBIRANE } from '../src/domein/azbuki.js';

const NAEMATEL = 'vintexstroy';

/**
 * КОЙ Е ВЛЯЗЪЛ. Днес — един собственик, вече влязъл; истинският OAuth иска
 * регистрация при тримата доставчици и негово решение с кого се почва.
 * Портът обаче стои отсега, за да не се появи после втори вход отстрани.
 */
const SOBSTVENIKAT: Samolichnost = {
  dostavchik: 'google',
  imeyl: 'vintexstroy@gmail.com',
  ime: 'VintexStroy',
  hranilishte: 'безплатно',
  nachin: 'dostavchik',
  rolya: 'stopanin',
  svarzani: [],
};

const vhod = new EdinSobstvenik(SOBSTVENIKAT);
let kojSam: Samolichnost = SOBSTVENIKAT;
let izbor: Izbor = chetiIzbor();

export type KoyEkran = 'imoti' | 'pari' | 'smetki' | 'tablo';

/**
 * Кой екран от коя възможност зависи. Таблото го няма тук нарочно: то е
 * мястото, където отметките се връщат — не бива да може да се самозаключи.
 */
const EKRAN_ISKA: Readonly<Partial<Record<KoyEkran, Vazmozhnost>>> = {
  smetki: 'smetki-dds',
};

export interface Konteks {
  readonly deystviya: Deystviya;
  readonly dnevnik: DnevnikVIndexedDB;
  readonly vrata: Vrata;
  readonly pravata: Pravata;
  readonly vest: (vid: 'dobre' | 'zle', tekst: string) => void;
}

/**
 * Кога е бил последният износ. Живее в localStorage, не в Журнала — това е
 * удобство на този браузър, не факт от историята. Може и да го няма.
 */
const KLYUCH_IZNOS = 'masterbook:posleden-iznos';

interface BelegZaIznos {
  readonly kogato: string;
  readonly broi: number;
  readonly hash: string;
}

function chetiBeleg(): BelegZaIznos | null {
  try {
    const surovo = localStorage.getItem(KLYUCH_IZNOS);
    return surovo ? (JSON.parse(surovo) as BelegZaIznos) : null;
  } catch {
    return null;
  }
}

function zapishiBeleg(beleg: BelegZaIznos): void {
  try {
    localStorage.setItem(KLYUCH_IZNOS, JSON.stringify(beleg));
  } catch {
    // Частен прозорец или забранени данни — износът пак стана, само не се помни.
  }
}

const koren = document.getElementById('ekran')!;
let poslednaVest: { vid: 'dobre' | 'zle'; tekst: string } | null = null;
let sastoyanieNaVerigata = { tsyala: true, proverena: false, broi: 0 };
let hranilishte: SastoyanieNaHranilishteto = {
  postoyanstvo: 'неизвестно',
  zaeto: -1,
  pozvoleno: -1,
};
let ekran: KoyEkran = 'imoti';

/**
 * ДЖОБЪТ · служебният работник.
 *
 * Той прави приложението продукт, който се отваря без мрежа — план 1 от
 * ADR-006. Регистрацията е тиха: провали ли се, приложението работи както
 * досега, само че иска мрежа за да се отвори.
 *
 * `imaNova` пали ТИХ ред в лентата, когато нова версия чака. Нарочно не
 * презарежда сама: човек може да въвежда плащане точно в този миг.
 */
let imaNova = false;

/**
 * АЗБУЧНИЯТ ПАКЕТ · решава се ВЕДНЪЖ, при сваляне.
 *
 * Негови думи: „Искам да е опция при сваляне само." Затова адресът го носи
 * (`?azbuki=evropa`) — рекламата по региони дава различен адрес — и оттам
 * нататък се помни. В приложението няма бутон за него: смяната на азбуките
 * значи ново сваляне, не отметка.
 */
const KLYUCH_AZBUKI = 'masterbook:azbuki';

function koyPaket(): string {
  try {
    const otAdresa = new URLSearchParams(location.search).get('azbuki');
    if (otAdresa) {
      const izbran = paket(otAdresa).klyuch;
      localStorage.setItem(KLYUCH_AZBUKI, izbran);
      return izbran;
    }
    return paket(localStorage.getItem(KLYUCH_AZBUKI)).klyuch;
  } catch {
    // Частен прозорец: пакетът важи за тази сесия.
    return PAKET_PO_PODRAZBIRANE;
  }
}

async function zakachiDzhoba(prerisuvay: () => Promise<void>): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    // Пакетът пътува с адреса на работника — той го чете от `location.search`.
    const zapis = await navigator.serviceWorker.register(`./sw.js?azbuki=${koyPaket()}`);
    // Нова версия, която чака реда си да влезе.
    if (zapis.waiting) imaNova = true;
    zapis.addEventListener('updatefound', () => {
      const nov = zapis.installing;
      nov?.addEventListener('statechange', () => {
        // `controller` значи, че вече има стара версия — иначе е първо пускане.
        if (nov.state === 'installed' && navigator.serviceWorker.controller) {
          imaNova = true;
          void prerisuvay();
        }
      });
    });
  } catch {
    // Частен прозорец, забранени работници, или подаден през `file://`.
    // Приложението работи; само джобът го няма.
  }
}

const EKRANI: Record<KoyEkran, { ime: string; podnaslov: string; ikona: string }> = {
  imoti: {
    ime: 'Имоти',
    podnaslov: 'записва вместо да помни · всичко минава през Вратата',
    ikona: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path><path d="M9.5 21v-6.5h5V21"></path>',
  },
  pari: {
    ime: 'Пари',
    podnaslov: 'какво ти дължат, кой закъснява, какво е влязло',
    ikona: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"></rect><path d="M2.5 10h19"></path><path d="M6 14.5h4"></path>',
  },
  smetki: {
    ime: 'Сметки',
    podnaslov: 'цените са с ДДС · ДДС-то е отделен ред, изведен по акумулатори',
    ikona: '<path d="M5 3.5h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"></path><path d="M7.5 8h9"></path><path d="M7.5 12h4"></path><path d="M7.5 16h4"></path><path d="M15 12v4.5"></path><path d="M12.75 14.25h4.5"></path>',
  },
  tablo: {
    ime: 'Табло',
    podnaslov: 'кой съм · какъв е планът · какво да се вижда',
    ikona: '<circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"></path>',
  },
};

async function trugvay(): Promise<void> {
  // Влизането е първото нещо: `actor` в Журнала е имейл от доставчика,
  // а не низ по подразбиране — историята трябва да знае КОЙ е писал.
  kojSam = await vhod.vlez(SOBSTVENIKAT.dostavchik);

  const dnevnik = await otvoriDnevnik('masterbook');
  const kotva = new KotvaVLocalStorage();
  // Един писач и МЕЖДУ разделите, не само в този.
  const klyuchalka = klyuchalkaMezhduRazdeli();
  const pravata = new VsichkoRazresheno();
  const vrata = new Vrata({
    dnevnik,
    pravata,
    sha: sha256Web,
    kotva,
    ...(klyuchalka ? { klyuchalka } : {}),
  });

  // Постоянство: изтриваемото хранилище е дупката №1 за „нула загуба".
  hranilishte = await osiguriHranilishte();

  // Котвата срещу скъсяване отзад: по-къс Журнал от помненото = дръпнат кран.
  const sabitiyaVNachaloto = await dnevnik.chetiVsichki(NAEMATEL);
  const proverka = proveriKotvata(
    kotva.cheti(NAEMATEL),
    sabitiyaVNachaloto[sabitiyaVNachaloto.length - 1]?.seq ?? 0,
    (seq) => sabitiyaVNachaloto.find((s) => s.seq === seq)?.hash,
  );
  if (!proverka.nared) {
    vrata.zatvori(`котвата не съвпада: ${proverka.prichina}`);
    poslednaVest = {
      vid: 'zle',
      tekst:
        `${proverka.prichina} Вратата е спряна — четенето работи, записът не. ` +
        'Журналът не се пипа; вземи последния износ и го внеси.',
    };
  }
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: kojSam.imeyl,
    chasovnik: () => new Date().toISOString(),
  });

  const k: Konteks = {
    deystviya,
    dnevnik,
    vrata,
    pravata,
    vest: (vid, tekst) => {
      poslednaVest = { vid, tekst };
    },
  };

  async function prerisuvay(): Promise<void> {
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    sastoyanieNaVerigata = { ...sastoyanieNaVerigata, broi: sabitiya.length };
    const ogledalo = await deystviya.ogledalo();
    const dnes = new Date().toISOString().slice(0, 10);
    // Изключен екран не се показва празен — връщаме се на Имоти.
    const iska = EKRAN_ISKA[ekran];
    if (iska && !mozhe(izbor, iska)) ekran = 'imoti';
    const opis = EKRANI[ekran];

    koren.innerHTML = `
      ${strana(ogledalo, dnes)}
      <main class="glavno">
        <header class="shapka">
          <div>
            <h1>${opis.ime}</h1>
            <p>${opis.podnaslov}</p>
          </div>
          <div class="desno-gore">
            ${mozhe(izbor, 'iztochnitsi') ? narisuvayButona() : ''}
            <button type="button" class="vtorichen" id="proveri">Провери веригата</button>
            ${
              mozhe(izbor, 'iznos-vnos')
                ? '<button type="button" class="vtorichen" id="iznesi">Изнеси Журнала</button>'
                : ''
            }
            ${
              mozhe(izbor, 'arhiv-eksel')
                ? '<button type="button" class="vtorichen" id="arhiv">Архив за Ексел</button>'
                : ''
            }
            ${
              mozhe(izbor, 'iznos-vnos')
                ? '<button type="button" class="vtorichen" id="vnesi">Внеси Журнал</button>'
                : ''
            }
            <input translate="no" type="file" id="fayl" accept="application/json,.json" hidden>
          </div>
        </header>
        <div class="telo">
          ${vestHTML()}
          ${mozhe(izbor, 'iztochnitsi') ? narisuvayPlana() : ''}
          ${
            ekran === 'imoti'
              ? narisuvayImoti({ ogledalo, sabitiya: sabitiya.length }, k)
              : ekran === 'pari'
                ? narisuvayPari(ogledalo, dnes)
                : ekran === 'smetki'
                  ? narisuvaySmetki(ogledalo, dnes)
                  : narisuvayTablo(kojSam, izbor)
          }
        </div>
      </main>`;

    poslednaVest = null;
    if (ekran === 'imoti') zakachiFormite(koren, k, prerisuvay);
    else if (ekran === 'pari') zakachiPari(koren, k, prerisuvay);
    else if (ekran === 'smetki') zakachiSmetki(koren, k, prerisuvay);
    else {
      zakachiTablo(
        koren,
        () => izbor,
        (nov) => {
          izbor = nov;
        },
        prerisuvay,
      );
    }
    if (mozhe(izbor, 'iztochnitsi')) zakachiIztochnitsi(koren, k, prerisuvay);
    if (mozhe(izbor, 'fini-filtri')) zakachiFiltri(koren, prerisuvay);
    zakachiGlavnite(k, prerisuvay);
  }

  await prerisuvay();
  // Последно, за да не бави първото рисуване.
  await zakachiDzhoba(prerisuvay);
}

function strana(o: Parameters<typeof duljimo>[0], dnes: string): string {
  const v = sastoyanieNaVerigata;
  const tekst = !v.proverena
    ? 'Веригата не е проверявана в тази сесия'
    : v.tsyala
      ? 'Веригата е цяла'
      : 'Веригата е СКЪСАНА';
  const zakasneli = prosrocheni(o, dnes).length;

  const punktove = (Object.keys(EKRANI) as KoyEkran[])
    .filter((koy) => {
      const iska = EKRAN_ISKA[koy];
      return !iska || mozhe(izbor, iska);
    })
    .map((koy) => {
      const e = EKRANI[koy];
      const znachka = koy === 'pari' && zakasneli > 0
        ? `<span class="broyach">${zakasneli}</span>`
        : '';
      return `<button type="button" class="navred${koy === ekran ? ' tuk' : ''}" data-ekran="${koy}">
        <svg viewBox="0 0 24 24">${e.ikona}</svg>${e.ime}${znachka}
      </button>`;
    })
    .join('');

  return `
    <aside class="strana">
      <div class="marka">
        <b>VintexStroy</b>
        <span>MasterBook</span>
      </div>
      <nav class="nav">${punktove}</nav>
      <div class="veriga">
        <div class="redche">
          <span class="tochka ${v.proverena && !v.tsyala ? 'zle' : ''}"></span>${tekst}
        </div>
        <div class="redche" data-broi="${v.broi}">${v.broi} ${v.broi === 1 ? 'събитие' : 'събития'} · местно, в този браузър</div>
        <div class="redche">${redZaIznos(v.broi)}</div>
        ${
          imaNova
            ? `<div class="redche"><span class="tochka"></span>
                 <b>Има нова версия</b> · затвори и отвори пак</div>`
            : ''
        }
        <div class="redche">
          <span class="tochka ${hranilishte.postoyanstvo === 'изтриваемо' ? 'zle' : ''}"></span>
          ${
            hranilishte.postoyanstvo === 'постоянно'
              ? 'Хранилището е постоянно'
              : hranilishte.postoyanstvo === 'изтриваемо'
                ? 'Хранилището е ИЗТРИВАЕМО — изнасяй често'
                : 'Постоянството е неизвестно'
          }${hranilishte.zaeto >= 0 ? ` · ${kolkoMyasto(hranilishte.zaeto)}` : ''}
        </div>
      </div>
    </aside>`;
}

/** Един ред за износа — тихо напомняне, не аларма. */
function redZaIznos(sega: number): string {
  const beleg = chetiBeleg();
  if (!beleg) {
    return sega === 0
      ? 'Още няма какво да се изнася'
      : '<b>Журналът не е изнасян</b> · само в този браузър';
  }
  const dni = Math.max(0, Math.round((Date.now() - Date.parse(beleg.kogato)) / 86_400_000));
  const novi = sega - beleg.broi;
  const kolko = dni === 0 ? 'днес' : dni === 1 ? 'вчера' : `преди ${dni} дни`;
  return novi > 0
    ? `Изнесен ${kolko} · <b>${novi} ${novi === 1 ? 'ново събитие' : 'нови събития'}</b> оттогава`
    : `Изнесен ${kolko} · нищо ново оттогава`;
}

function vestHTML(): string {
  if (!poslednaVest) return '';
  return `<div class="vest ${poslednaVest.vid}">${ekraniraj(poslednaVest.tekst)}</div>`;
}

function zakachiGlavnite(k: Konteks, prerisuvay: () => Promise<void>): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-ekran]')) {
    b.addEventListener('click', async () => {
      ekran = b.dataset['ekran'] as KoyEkran;
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#proveri')?.addEventListener('click', async () => {
    const sabitiya = await k.dnevnik.chetiVsichki(NAEMATEL);
    const rezultat = await proveriVerigata(sabitiya, sha256Web);
    sastoyanieNaVerigata = {
      tsyala: rezultat.tsyala,
      proverena: true,
      broi: sabitiya.length,
    };

    if (rezultat.tsyala) {
      k.vest('dobre', `Веригата е цяла · ${rezultat.proverni} от ${sabitiya.length} звена.`);
    } else {
      // При инцидент Журналът НЕ се пипа — дърпа се спирателният кран.
      k.vrata.zatvori(`скъсана верига на seq ${rezultat.parvoSchupeno}`);
      k.vest(
        'zle',
        `Веригата се къса на seq ${rezultat.parvoSchupeno} (${rezultat.prichina}). ` +
          `Вратата е спряна — четенето работи, записът не. Журналът не се пипа.`,
      );
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#iznesi')?.addEventListener('click', async () => {
    // Свалянето е ПРАВО, не даденост — думата на собственика.
    if (!(await k.pravata.mozheDaIznasya(kojSam.imeyl, NAEMATEL))) {
      k.vest('zle', 'Нямаш право да сваляш Журнала. Свалянето се дава по списък.');
      await prerisuvay();
      return;
    }
    const sabitiya = await k.dnevnik.chetiVsichki(NAEMATEL);
    const fayl = new Blob([JSON.stringify(sabitiya, null, 2)], {
      type: 'application/json',
    });
    const adres = URL.createObjectURL(fayl);
    const vruzka = document.createElement('a');
    vruzka.href = adres;
    vruzka.download = `zhurnal-${NAEMATEL}-${new Date().toISOString().slice(0, 10)}.json`;
    vruzka.click();
    URL.revokeObjectURL(adres);

    const posledenHash = sabitiya[sabitiya.length - 1]?.hash ?? '';
    zapishiBeleg({
      kogato: new Date().toISOString(),
      broi: sabitiya.length,
      hash: posledenHash,
    });
    k.vest(
      'dobre',
      `Изнесени ${sabitiya.length} събития. Последен hash: ${posledenHash.slice(0, 12)}… ` +
        'Запиши го някъде извън браузъра — той е котвата, с която после се доказва подмяна.',
    );
    await prerisuvay();
  });

  // ── архив за Ексел · всеки лист с готови филтри ──────────────────────────
  koren.querySelector<HTMLButtonElement>('#arhiv')?.addEventListener('click', async () => {
    if (!(await k.pravata.mozheDaIznasya(kojSam.imeyl, NAEMATEL))) {
      k.vest('zle', 'Нямаш право да сваляш архива. Свалянето се дава по списък.');
      await prerisuvay();
      return;
    }
    const sabitiya = await k.dnevnik.chetiVsichki(NAEMATEL);
    const ogledalo = await k.deystviya.ogledalo();
    const bajtove = arhivZaEksel(sabitiya, ogledalo, new Date().toISOString());
    const fayl = new Blob([bajtove.slice().buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const adres = URL.createObjectURL(fayl);
    const vruzka = document.createElement('a');
    vruzka.href = adres;
    vruzka.download = `masterbook-arhiv-${new Date().toISOString().slice(0, 10)}.xlsx`;
    vruzka.click();
    URL.revokeObjectURL(adres);
    k.vest(
      'dobre',
      `Архивът е свален: 5 листа, ${sabitiya.length} събития, всеки лист с готови филтри. ` +
        'Точният архив с хешовете остава JSON-износът.',
    );
    await prerisuvay();
  });

  // ── внасяне · връщането на изнесеното ────────────────────────────────────
  const fayl = koren.querySelector<HTMLInputElement>('#fayl');
  koren.querySelector<HTMLButtonElement>('#vnesi')?.addEventListener('click', () => fayl?.click());

  fayl?.addEventListener('change', async () => {
    const izbran = fayl.files?.[0];
    if (!izbran) return;

    const sega = (await k.dnevnik.chetiVsichki(NAEMATEL)).length;
    const potvarzhdenie =
      sega === 0
        ? `Да внеса ли „${izbran.name}"?`
        : `Тук вече има ${sega} събития.\n\nВнасянето ще ги ПРОДЪЛЖИ, ако файлът е от същия ` +
          'Журнал, и ще откаже изцяло, ако е от друг. Нищо няма да се презапише. Да продължа ли?';
    if (!confirm(potvarzhdenie)) {
      fayl.value = '';
      return;
    }

    try {
      const rezultat = await vnesiZhurnal({
        vrata: k.vrata,
        dnevnik: k.dnevnik,
        naematel: NAEMATEL,
        actor: kojSam.imeyl,
        tekst: await izbran.text(),
        kogato: new Date().toISOString(),
      });
      k.vest(
        'dobre',
        rezultat.vneseni === 0
          ? `Файлът вече е тук — всичките ${rezultat.vsichko} събития съвпадат. Нищо ново не влезе.`
          : `Върнати ${rezultat.vneseni} ${rezultat.vneseni === 1 ? 'събитие' : 'събития'}` +
            `${rezultat.veche ? `, ${rezultat.veche} вече бяха` : ''}. ` +
            `Журналът е на ${rezultat.vsichko}. Веригата е проверена цяла, преди да влезе каквото и да е.`,
      );
    } catch (greshka) {
      k.vest(
        'zle',
        greshka instanceof GreshkaVnos || greshka instanceof Error
          ? `Внасянето е отказано. ${greshka.message}`
          : String(greshka),
      );
    } finally {
      fayl.value = '';
      await prerisuvay();
    }
  });
}

trugvay().catch((greshka: unknown) => {
  koren.innerHTML = `<div class="telo"><div class="vest zle">Приложението не тръгна: ${
    ekraniraj(greshka instanceof Error ? greshka.message : String(greshka))
  }</div></div>`;
});
