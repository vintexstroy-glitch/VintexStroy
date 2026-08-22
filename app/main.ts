/**
 * MasterBook · местно-първо (ADR-001, носител В).
 *
 * Журналът живее в браузъра на собственика. Няма сървър, няма мрежа,
 * няма чакане. Вратата стои над него и не знае кой носител е отдолу.
 */

import { Vrata, VsichkoRazresheno, proveriVerigata } from '../src/yadro/index.js';
import { otvoriDnevnik, type DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { duljimo, prosrocheni } from '../src/ogledalo/ogledalo.js';
import { ekraniraj, narisuvayImoti, zakachiFormite } from './imoti.js';
import { narisuvayPari, zakachiPari } from './pari.js';

const NAEMATEL = 'vintexstroy';
const ACTOR = 'vintexstroy@gmail.com';

export type KoyEkran = 'imoti' | 'pari';

export interface Konteks {
  readonly deystviya: Deystviya;
  readonly dnevnik: DnevnikVIndexedDB;
  readonly vrata: Vrata;
  readonly vest: (vid: 'dobre' | 'zle', tekst: string) => void;
}

const koren = document.getElementById('ekran')!;
let poslednaVest: { vid: 'dobre' | 'zle'; tekst: string } | null = null;
let sastoyanieNaVerigata = { tsyala: true, proverena: false, broi: 0 };
let ekran: KoyEkran = 'imoti';

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
};

async function trugvay(): Promise<void> {
  const dnevnik = await otvoriDnevnik('masterbook');
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: sha256Web });
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: ACTOR,
    chasovnik: () => new Date().toISOString(),
  });

  const k: Konteks = {
    deystviya,
    dnevnik,
    vrata,
    vest: (vid, tekst) => {
      poslednaVest = { vid, tekst };
    },
  };

  async function prerisuvay(): Promise<void> {
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    sastoyanieNaVerigata = { ...sastoyanieNaVerigata, broi: sabitiya.length };
    const ogledalo = await deystviya.ogledalo();
    const dnes = new Date().toISOString().slice(0, 10);
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
            <button type="button" class="vtorichen" id="proveri">Провери веригата</button>
            <button type="button" class="vtorichen" id="iznesi">Изнеси Журнала</button>
          </div>
        </header>
        <div class="telo">
          ${vestHTML()}
          ${
            ekran === 'imoti'
              ? narisuvayImoti({ ogledalo, sabitiya: sabitiya.length }, k)
              : narisuvayPari(ogledalo, dnes)
          }
        </div>
      </main>`;

    poslednaVest = null;
    if (ekran === 'imoti') zakachiFormite(koren, k, prerisuvay);
    else zakachiPari(koren, k, prerisuvay);
    zakachiGlavnite(k, prerisuvay);
  }

  await prerisuvay();
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
        <div class="redche">${v.broi} ${v.broi === 1 ? 'събитие' : 'събития'} · местно, в този браузър</div>
      </div>
    </aside>`;
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
    k.vest('dobre', `Изнесени ${sabitiya.length} събития.`);
    await prerisuvay();
  });
}

trugvay().catch((greshka: unknown) => {
  koren.innerHTML = `<div class="telo"><div class="vest zle">Приложението не тръгна: ${
    ekraniraj(greshka instanceof Error ? greshka.message : String(greshka))
  }</div></div>`;
});
