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
  LichnoESamoTvoe,
} from '../src/yadro/index.js';
import {
  klyuchalkaMezhduRazdeli,
  kolkoMyasto,
  osiguriHranilishte,
  type SastoyanieNaHranilishteto,
} from '../src/nositel/hranilishte.js';
import { otvoriDnevnik, type DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import {
  chetiBelegZaIznos,
  dnesKato,
  ekraniraj,
  svaliFayl,
  zapishiBelegZaIznos,
  type BelegZaIznos,
} from './obshto.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { duljimo, fold, prosrocheni, type Ogledalo } from '../src/ogledalo/ogledalo.js';
import { pregledayIznos, vnesiZhurnal } from '../src/domein/vnos.js';
import { butonSIkona, ikona } from './ikoni.js';
import { redNaNastroykite, zakachiMenyutoNaNastroykite } from './menyu-nastroyki.js';
import { koyGleda, type KoyGleda } from '../src/domein/temi-nastroyki.js';
import { narisuvayImoti, zakachiFormite } from './imoti.js';
import { narisuvayStoynost, zakachiStoynost } from './stoynost.js';
import { narisuvayGant, zakachiGant } from './gant.js';
import { narisuvayPari, zakachiPari } from './pari.js';
import { narisuvaySmetki, zakachiSmetki } from './smetki.js';
import { narisuvayButona, narisuvayPlana, zakachiIztochnitsi } from './iztochnitsi.js';
import { arhivZaEksel } from './arhiv.js';
import { zakachiFiltri } from './filtri.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { zakachiIstoriya } from './istoriya.js';
import { zakachiKontekstnoMenyu } from './kontekstno-menyu.js';
import { zakachiKlaviatura } from './klaviatura.js';
import { zakachiChernovata } from './chernova.js';
import { prilozhiSkritite } from './skriti-koloni.js';
import { zakachiRedaktsiya } from './redaktsiya.js';
import { chetiIzbor, narisuvayTablo, zakachiTablo } from './tablo.js';
import { narisuvayNastroyki, zakachiNastroyki } from './nastroyki.js';
import { narisuvayII, zakachiII } from './ii.js';
import { narisuvayTabove, zakachiTabove } from './tabove.js';
import { type Rolya, type Samolichnost } from '../src/yadro/samolichnost.js';
import { VhodSGoogle, zapomneniyat } from './vhod-google.js';
import { type Izbor, mozhe, type Vazmozhnost } from '../src/domein/planove.js';
import { paket, PAKET_PO_PODRAZBIRANE } from '../src/domein/azbuki.js';
import { SEGA } from '../src/izdanie.js';
import {
  KLYUCH_OT_ALFA,
  NASTAVKA_LICHEN,
  klyuchNaLichniya,
  koyZhurnal,
  sDumiZaAkaunta,
  svediImeyl,
} from '../src/domein/akaunt.js';
import {
  eStopanin,
  kakvoSStopanina,
  mozheDaVzemeZhurnala,
  otpechatakNaTelefon,
  OTKRIVASHTO_SABITIE,
  poslednite2,
  rolyataNa,
} from '../src/domein/stopanin.js';

/**
 * ПОКАЗАЛЕЦЪТ КЪМ ВЪРНАТ ЖУРНАЛ · местен, като запомнения вход (И100).
 *
 * Живее в `localStorage`, не в Журнала: това е удобство на ТОЗИ браузър — къде
 * да се погледне — а не факт от историята. Може и да го няма; тогава човекът
 * връща архива пак, което е скучно, но безопасно. Изтрие ли се хранилището,
 * изчезва и самият Журнал, тъй че показалецът е точно толкова траен, колкото
 * данните, които сочи.
 */
const KLYUCH_NA_POKAZATELYA = 'masterbook:vrasten';

function chetiPokazatelya(imeyl: string): string | null {
  try {
    const karta = JSON.parse(localStorage.getItem(KLYUCH_NA_POKAZATELYA) ?? '{}') as Record<string, string>;
    return karta[svediImeyl(imeyl)] ?? null;
  } catch {
    return null;
  }
}

function zapishiPokazatelya(imeyl: string, naematel: string): void {
  try {
    const karta = JSON.parse(localStorage.getItem(KLYUCH_NA_POKAZATELYA) ?? '{}') as Record<string, string>;
    karta[svediImeyl(imeyl)] = naematel;
    localStorage.setItem(KLYUCH_NA_POKAZATELYA, JSON.stringify(karta));
  } catch {
    // Частен прозорец · връщането пак стана, само не се помни за следващия път.
  }
}
import { dopusnatiImeyli, pishatImeyli } from '../src/domein/lichen-dostap.js';
import { zabraviIzbora } from './lichno.js';
import { dostapenLiE, EKRANI, type Konteks, type KoyEkran } from './ekranite.js';

/**
 * Белегът на СЛУЖЕБНИЯ износ. Домът на четенето и писането е `obshto.ts` —
 * ключът се подава, защото личният Журнал носи свой белег под свой ключ.
 */
const KLYUCH_IZNOS = 'masterbook:posleden-iznos';

const koren = document.getElementById('ekran')!;
let ekran: KoyEkran = chetiEkranno<KoyEkran>('ekran', 'imoti');
let hranilishte: SastoyanieNaHranilishteto = {
  postoyanstvo: 'неизвестно',
  zaeto: -1,
  pozvoleno: -1,
};
let poslednaVest: { vid: 'dobre' | 'zle'; tekst: string } | null = null;
let sastoyanieNaVerigata = { tsyala: true, proverena: false, broi: 0 };

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

const chetiBeleg = () => chetiBelegZaIznos(KLYUCH_IZNOS);
const zapishiBeleg = (beleg: BelegZaIznos) => zapishiBelegZaIznos(KLYUCH_IZNOS, beleg);


/**
 * КЛЮЧЪТ НА АКАУНТА · вече не е закован ред.
 *
 * Решава се веднъж, при тръгване (`koyZhurnal`): ако на това устройство вече
 * има Журнал от Алфа, отваря се ТОЙ — ключът му влиза в хеша и не се преселва
 * (правило 4). Иначе акаунтът тръгва с имейла на влезлия.
 *
 * `let`, защото стойността се знае едва СЛЕД влизането и след първото четене
 * от носителя; дотогава е ключът от Алфа, за да има какво да се прочете.
 */
let akaunt = KLYUCH_OT_ALFA;

/**
 * КОЙ Е ВЛЯЗЪЛ · вече истински.
 *
 * Дотук тук стоеше ЗАКОВАНА самоличност, която пазеше мястото на входа. Сега
 * влизането минава през Google и `actor` в Журнала е имейл, който доставчикът
 * е потвърдил (ADR-021). Ключът на акаунта идва от същия имейл (ADR-020) —
 * затова истинският вход е и онова, което прави втория акаунт истински.
 *
 * `kojSam` няма начална стойност: празната самоличност е по-честна от
 * измислената. Който чете преди влизането, гърми — вместо да получи име, което
 * никой не е дал.
 */
const vhod = new VhodSGoogle({
  kade: () => document.getElementById('butonat-na-google'),
});
let kojSam: Samolichnost;
let izbor: Izbor = chetiIzbor();

/**
 * ЕКРАНЪТ „ВЛЕЗ" · когато няма нито обхват, нито запомнен вход.
 *
 * НЕ се пада тихо към измислена самоличност. Това би отворило Журнал под име,
 * което никой не е дал — и всяко събитие оттам нататък носи грешен `actor`.
 * По-добре празен екран с обяснение, отколкото история, на която не се вярва.
 */
function ekranatVlez(kazano = ''): string {
  return `
    <div class="telo">
      <section class="karta izbrana vhod">
        <div class="dyalglava">
          <h2>Влез</h2>
          <span>без парола · самоличността идва от доставчика</span>
        </div>
        ${kazano ? `<p class="greshka">${ekraniraj(kazano)}</p>` : ''}
        <div id="butonat-na-google"></div>
        <p class="drebno">
          Приложението никога не вижда парола — няма своя, няма възстановяване,
          няма какво да изтече. Записва се имейлът, който Google потвърждава, и
          той става <b>actor</b> в Журнала.
        </p>
      </section>
    </div>`;
}

/**
 * ВЛИЗАНЕТО · три пътя, в този ред, и нито един от тях не е измислена самоличност.
 *
 *   1. запомнен вход — тръгване без обхват отваря същия Журнал;
 *   2. бутонът на Google — истинският вход;
 *   3. екранът „Влез" с думи защо — когато няма нито едно от двете.
 */
async function vlizane(): Promise<Samolichnost> {
  const zapomnen = zapomneniyat();
  if (zapomnen) return zapomnen;

  koren.innerHTML = ekranatVlez();
  try {
    return await vhod.vlez('google');
  } catch (greshka) {
    koren.innerHTML = ekranatVlez(dumiZaGreshka(greshka));
    throw greshka;
  }
}

async function trugvay(): Promise<void> {
  // Влизането е първото нещо: `actor` в Журнала е имейл от доставчика,
  // а не низ по подразбиране — историята трябва да знае КОЙ е писал.
  kojSam = await vlizane();

  const dnevnik = await otvoriDnevnik('masterbook');
  const kotva = new KotvaVLocalStorage();
  // Един писач и МЕЖДУ разделите, не само в този.
  const klyuchalka = klyuchalkaMezhduRazdeli();
  /**
   * ПРАВОТО · служебният минава както досега, личният — само на своя човек
   * и на онези, на които той е дал (И98 · И99).
   *
   * Допуснатите се четат от ЛИЧНОТО Огледало и се обновяват при всяко
   * прерисуване. Ядрото пита функция; домейнът я пълни.
   *
   * ДВА списъка, защото Вратата пита два въпроса: наблюдателят ВИЖДА личното
   * и може да го изнесе, но не мени сроковете в него.
   */
  let vizhdatLichnoto: ReadonlySet<string> = new Set();
  let pishatVLichnoto: ReadonlySet<string> = new Set();
  const pravata = new LichnoESamoTvoe(
    NASTAVKA_LICHEN,
    svediImeyl,
    () => vizhdatLichnoto,
    () => pishatVLichnoto,
  );
  const vrata = new Vrata({
    dnevnik,
    pravata,
    sha: sha256Web,
    kotva,
    // ПЪРВОТО СЪБИТИЕ В ЖУРНАЛА Е СТОПАНИНЪТ (И97 т.8 · ADR-043). Ядрото не
    // знае имената на домейна — затова името се ПОДАВА оттук, от единствения
    // си дом (`stopanin.ts`), вместо да се преписва като низ.
    parvoto: OTKRIVASHTO_SABITIE,
    ...(klyuchalka ? { klyuchalka } : {}),
  });

  // Постоянство: изтриваемото хранилище е дупката №1 за „нула загуба".
  hranilishte = await osiguriHranilishte();

  /**
   * ВЪРНАТИЯТ ЖУРНАЛ · показалец, който НЕ дава право (И100 · ADR-044).
   *
   * След връщане на архив с запасния контакт Журналът си остава под СТАРИЯ
   * ключ — веригата не се преписва (правило 1 · `naematel` е в хеша). Затова
   * тук се помни само КЪДЕ да се погледне, а дали този човек има право върху
   * него, решава самата верига: чете се и се проверява, че сегашният ѝ
   * стопанин е влезлият. Не е ли — показалецът се пренебрегва.
   */
  const posochen = chetiPokazatelya(kojSam.imeyl);
  let vrasten: string | undefined;
  if (posochen) {
    const negovite = await dnevnik.chetiVsichki(posochen);
    if (negovite.length > 0 && eStopanin(kojSam.imeyl, fold(negovite))) vrasten = posochen;
  }

  // КОЙ ЖУРНАЛ · първо се пита има ли вече такъв от Алфа, после кой е влязъл.
  // Обратният ред би оставил първия Журнал невидим в мига, в който истинският
  // вход тръгне: данните му стоят на диска, но под ключ, който никой не пита.
  akaunt = koyZhurnal(kojSam, (await dnevnik.chetiVsichki(KLYUCH_OT_ALFA)).length > 0, vrasten);

  // Котвата срещу скъсяване отзад: по-къс Журнал от помненото = дръпнат кран.
  const sabitiyaVNachaloto = await dnevnik.chetiVsichki(akaunt);
  const proverka = proveriKotvata(
    kotva.cheti(akaunt),
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
    naematel: akaunt,
    actor: kojSam.imeyl,
    chasovnik: () => new Date().toISOString(),
  });

  const k: Konteks = {
    deystviya,
    dnevnik,
    vrata,
    pravata,
    akaunt,
    kojSam,
    vest: (vid, tekst) => {
      poslednaVest = { vid, tekst };
    },
  };

  /**
   * ВТОРИЯТ КОНТЕКСТ · личният Журнал (И98).
   *
   * Същата Врата и същият носител: опашката, ключалката и котвата ВЕЧЕ са по
   * наемател, тъй че ядрото не се пипа с нито един ред. Различава се само
   * `naematel` — и точно това прави смесването физически невъзможно.
   *
   * Ключът се строи от ИМЕЙЛА на човека, никога от `akaunt`: на това
   * устройство `akaunt` може да е Алфа-ключът на ФИРМАТА, а личното е на
   * всеки служител поотделно (И98 т.3).
   */
  const lichenKlyuch = klyuchNaLichniya(kojSam);
  const lichen: Konteks = {
    ...k,
    akaunt: lichenKlyuch,
    deystviya: new Deystviya({
      vrata,
      dnevnik,
      naematel: lichenKlyuch,
      actor: kojSam.imeyl,
      chasovnik: () => new Date().toISOString(),
    }),
  };

  /**
   * ОСИГУРЯВА СТОПАНИНА на един Журнал · ЕДИН дом за двата Журнала.
   *
   * Вратата отказва всичко друго в празен Журнал (ADR-043), тъй че това не е
   * удобство, а условието, при което приложението изобщо може да пише.
   *
   * `opId` е СТАБИЛЕН и това е нарочно. Правило 20 забранява ключ от
   * СЪДЪРЖАНИЕТО, защото връщането към предишно състояние тогава връща стария
   * резултат — тук такова връщане няма: „откриването на този Журнал" се случва
   * веднъж по определение. Стабилният ключ пази точно случая с два отворени
   * раздела: вторият получава същия резултат, вместо отказ.
   */
  async function osiguriStopanina(d: Deystviya, naematel: string): Promise<void> {
    const o = await d.ogledalo();
    const parvo = await dnevnik.parvo(naematel);
    const kakvo = kakvoSStopanina(kojSam.imeyl, o, parvo?.actor);
    if (kakvo.sastoyanie === 'ima' || !kakvo.mozheDaZapishe) return;
    await d.zapishiStopanina(
      {
        imeyl: svediImeyl(kojSam.imeyl),
        ime: kojSam.ime,
        dostavchik: kojSam.dostavchik,
        ...(kakvo.sastoyanie === 'chaka-dopisvane' ? { dopisan: true } : {}),
      },
      { opId: `stopanin:${naematel}` },
    );
  }

  /**
   * ВПИСВАНЕ НА ЗАПАСНИЯ КОНТАКТ · пътят обратно (И100 · ADR-044).
   *
   * Телефонът се превръща в ОТПЕЧАТЪК тук, преди да тръгне към действието:
   * самият номер не бива да стигне до Журнала, а оттам — до изнесения файл.
   */
  function zakachiZapasniya(koren: HTMLElement): void {
    koren.querySelector<HTMLButtonElement>('#zapishi-zapasen')?.addEventListener('click', async (e) => {
      const buton = e.target as HTMLButtonElement;
      const greshka = koren.querySelector<HTMLElement>('#greshka-zapasen');
      const imeyl = koren.querySelector<HTMLInputElement>('#zapasen-imeyl')?.value ?? '';
      const telefon = koren.querySelector<HTMLInputElement>('#zapasen-telefon')?.value ?? '';
      if (greshka) greshka.textContent = '';
      buton.disabled = true;
      try {
        await deystviya.zapishiZapasenKontakt(
          {
            imeyl: svediImeyl(imeyl),
            telefonOtpechatak: await otpechatakNaTelefon(telefon, sha256Web),
            poslednite: poslednite2(telefon),
          },
          { opId: crypto.randomUUID() },
        );
        k.vest('dobre', 'Запасният контакт е вписан. Пътят обратно вече съществува.');
        await prerisuvay();
      } catch (err) {
        if (greshka) greshka.textContent = dumiZaGreshka(err);
      } finally {
        buton.disabled = false;
      }
    });
  }

  /**
   * ВРЪЩАНЕ НА АРХИВ ОТ ДРУГ ИМЕЙЛ (И100 · ADR-044) · четирите крачки.
   *
   *   1. файлът се ПРЕГЛЕЖДА, без да се пише — чий е и какъв запасен носи;
   *   2. доказателството се проверява СРЕЩУ ФАЙЛА, не срещу нещо тукашно;
   *   3. веригата влиза под СВОЯ ключ, непокътната — `naematel` е в хеша и
   *      преписването ѝ би я счупило (правило 4);
   *   4. чак тогава се дописва смяната на Стопанина — в стария Журнал, със
   *      свой автор и своя причина.
   *
   * Ако някоя крачка откаже, следващите не се правят. Файлът, който не докаже
   * правото си, не влиза ИЗОБЩО — иначе устройството щеше да се пълни с чужди
   * Журнали, които никой не може да отвори.
   */
  function zakachiVrashtaneto(koren: HTMLElement): void {
    const poleto = koren.querySelector<HTMLInputElement>('#vrashtane-fayl');
    koren.querySelector<HTMLButtonElement>('#vrashtane-izberi')?.addEventListener('click', () =>
      poleto?.click(),
    );
    poleto?.addEventListener('change', async () => {
      const izbran = poleto.files?.[0];
      const greshka = koren.querySelector<HTMLElement>('#greshka-vrashtane');
      if (greshka) greshka.textContent = '';
      if (!izbran) return;
      const telefon = koren.querySelector<HTMLInputElement>('#vrashtane-telefon')?.value ?? '';
      const prichina = koren.querySelector<HTMLInputElement>('#vrashtane-prichina')?.value ?? '';
      try {
        const tekst = await izbran.text();
        const pregled = pregledayIznos(tekst);
        const otgovor = mozheDaVzemeZhurnala({
          imeyl: kojSam.imeyl,
          telefonOtpechatak: await otpechatakNaTelefon(telefon, sha256Web),
          o: pregled.ogledalo,
        });
        if (!otgovor.mozhe) throw new Error(otgovor.kazva);

        await vnesiZhurnal({
          vrata: k.vrata,
          dnevnik: k.dnevnik,
          naematel: pregled.naematel,
          actor: kojSam.imeyl,
          tekst,
          kogato: new Date().toISOString(),
        });
        const staraKniga = new Deystviya({
          vrata: k.vrata,
          dnevnik: k.dnevnik,
          naematel: pregled.naematel,
          actor: kojSam.imeyl,
          chasovnik: () => new Date().toISOString(),
        });
        await staraKniga.smeniStopanina(
          {
            telefonOtpechatak: await otpechatakNaTelefon(telefon, sha256Web),
            prichina: prichina.trim() || 'върнат архив със запасния контакт',
          },
          { opId: crypto.randomUUID() },
        );
        zapishiPokazatelya(kojSam.imeyl, pregled.naematel);
        k.vest(
          'dobre',
          `Архивът е върнат: ${pregled.broy} събития под ключ „${pregled.naematel}". ` +
            'Стопанинът вече си ти. Презареждам, за да се отвори.',
        );
        await prerisuvay();
        location.reload();
      } catch (err) {
        if (greshka) greshka.textContent = dumiZaGreshka(err);
      } finally {
        poleto.value = '';
      }
    });
  }

  /**
   * ПРЕВКЛЮЧВА личното · едно събитие в ЛИЧНИЯ Журнал (И98).
   *
   * Пускането е ПЪРВОТО събитие на този Журнал — съществуването му Е
   * активацията, огледано на И97 („стопанинът е първото събитие"). Затова
   * няма отделно „създай Журнал": Вратата тръгва от seq 1 сама.
   */
  function zakachiPrevklyuchvaneto(koren: HTMLElement, znak: string, vklyucheno: boolean): void {
    koren.querySelector<HTMLButtonElement>(znak)?.addEventListener('click', async (e) => {
      const buton = e.target as HTMLButtonElement;
      buton.disabled = true;
      try {
        // СТОПАНИНЪТ Е ПЪРВОТО СЪБИТИЕ И В ЛИЧНИЯ ЖУРНАЛ (ADR-043). Пише се
        // тук, а не при тръгване: личен Журнал, създаден предварително,
        // престава да е „не е пипано" — а трите състояния са различни (И99).
        if (vklyucheno) await osiguriStopanina(lichen.deystviya, lichen.akaunt);
        // МЯСТОТО · при пускане се чете от полето; при прибиране не трябва.
        const poleto = koren.querySelector<HTMLInputElement>('#lichno-myasto');
        await lichen.deystviya.prevklyuchiLichno(
          {
            vklyucheno,
            sluzhebniyat: akaunt,
            ...(vklyucheno && poleto ? { myasto: poleto.value } : {}),
          },
          { opId: crypto.randomUUID() },
        );
        zabraviIzbora();
        k.vest(
          'dobre',
          vklyucheno
            ? `Личното е пуснато. Журналът му живее под „${lichen.akaunt}" и никога не се смесва със служебния.`
            : 'Личното е прибрано. Журналът остава непокътнат — прибраното не е изтрито.',
        );
      } catch (err) {
        k.vest('zle', dumiZaGreshka(err));
      }
      await prerisuvay();
    });
  }

  async function prerisuvay(): Promise<void> {
    const sabitiya = await dnevnik.chetiVsichki(akaunt);
    sastoyanieNaVerigata = { ...sastoyanieNaVerigata, broi: sabitiya.length };
    const ogledalo = await deystviya.ogledalo();
    // ЛИЧНОТО · чете се ОТДЕЛНО и никога не влиза в служебното Огледало.
    // `null` значи „не е активирано" — липсващ контур, не празен екран.
    const lichniteSabitiya = await dnevnik.chetiVsichki(lichen.akaunt);
    const lichnoOgledalo = lichniteSabitiya.length > 0 ? await lichen.deystviya.ogledalo() : null;
    const lichnoVklyucheno = lichnoOgledalo?.lichnoVklyucheno ?? false;
    const lichniDostapi = lichnoOgledalo ? [...lichnoOgledalo.lichniDostapi.values()] : [];
    vizhdatLichnoto = dopusnatiImeyli(lichniDostapi);
    pishatVLichnoto = pishatImeyli(lichniDostapi);
    const dnes = dnesKato();
    // Изключен екран не се показва празен — връщаме се на Имоти.
    const iskanoto = EKRANI[ekran].iska;
    if (iskanoto && !mozhe(izbor, iskanoto)) ekran = 'imoti';
    // `opis` СЛЕД падането — иначе заглавието остава на екрана, който току-що
    // беше отказан, а тялото рисува другия.
    const opis = EKRANI[ekran];

    koren.innerHTML = `
      ${strana(
        ogledalo,
        dnes,
        lichnoVklyucheno,
        rolyataNa(kojSam.imeyl, ogledalo),
        lichnoOgledalo !== null,
        koyGleda(kojSam.imeyl, ogledalo),
      )}
      <main class="glavno">
        <header class="shapka">
          <div>
            <h1>${opis.ime}</h1>
            <p>${opis.podnaslov}</p>
          </div>
          <div class="desno-gore">
            ${
              /**
               * ПЕТТЕ СЛУЖЕБНИ ПЪТЯ НЕ СЕ РИСУВАТ НА ЛИЧНИЯ ЕКРАН.
               *
               * Всеки от тях чете или пише `akaunt` — СЛУЖЕБНИЯ ключ. Дотук
               * това беше само излишно: личният екран носеше дела и никой не
               * търсеше „Изнеси" оттам. Отсега носи ПАРИ, и бутон „Изнеси
               * Журнала" на екран със заглавие „Лично" обещава нещо, което не
               * прави: изнася СЛУЖЕБНИЯ Журнал.
               *
               * Да ги скриеш е по-честно от това да ги оставиш видими и мъртви.
               * Личният износ е СВОЙ резен и се обявява поименно долу, вместо
               * да се открие при инцидент.
               */
              ekran === 'lichno'
                ? '<span class="drebno">Личният Журнал се изнася и проверява в секцията си долу — отделно от служебния.</span>'
                : `${mozhe(izbor, 'iztochnitsi') ? narisuvayButona([...ogledalo.butoni.values()]) : ''}
            ${
              /**
               * ЧЕТИРИТЕ ЛОСТА · знак отпред, дума до него (И101 т.2 · ADR-045).
               *
               * Дотук бяха четири еднакви правоъгълника с думи — окото ги четеше
               * едно по едно всеки път. Знакът дава посоката отдалеч (стрелка
               * нагоре = навън, надолу = навътре), думата остава за точността.
               */
              butonSIkona({ ikona: 'veriga', tekst: 'Провери веригата', klas: 'vtorichen', id: 'proveri' })
            }
            ${
              mozhe(izbor, 'iznos-vnos')
                ? butonSIkona({ ikona: 'iznos', tekst: 'Изнеси Журнала', klas: 'vtorichen', id: 'iznesi' })
                : ''
            }
            ${
              mozhe(izbor, 'arhiv-eksel')
                ? butonSIkona({ ikona: 'arhiv', tekst: 'Архив за Ексел', klas: 'vtorichen', id: 'arhiv' })
                : ''
            }
            ${
              mozhe(izbor, 'iznos-vnos')
                ? butonSIkona({ ikona: 'vnos', tekst: 'Внеси Журнал', klas: 'vtorichen', id: 'vnesi' })
                : ''
            }
            <input translate="no" type="file" id="fayl" accept="application/json,.json" hidden>`
            }
          </div>
        </header>
        <div class="telo">
          ${vestHTML()}
          ${ekran !== 'lichno' && mozhe(izbor, 'iztochnitsi') ? narisuvayPlana() : ''}
          ${opis.narisuvay({
            ogledalo,
            broySabitiya: sabitiya.length,
            dnes,
            izbor,
            kojSam,
            akaunt,
            kranatEOtvoren: !vrata.zatvorena,
            lichnoOgledalo,
            lichenAkaunt: lichen.akaunt,
            broyLichni: lichniteSabitiya.length,
          })}
        </div>
      </main>`;

    poslednaVest = null;
    opis.zakachi({
      koren,
      k,
      lichen,
      prerisuvay,
      prevklyuchiLichnoto: (znak, vklyucheno) => zakachiPrevklyuchvaneto(koren, znak, vklyucheno),
      zakachiTabloto: () => {
        zakachiTablo(
          koren,
          () => izbor,
          (nov) => {
            izbor = nov;
          },
          prerisuvay,
        );
        // Таблото ВРЪЩА прибраното (мястото вече е записано) и ПРИБИРА
        // включеното. Първото пускане е на самия екран „Лично" — там е полето
        // за мястото, без което личното не тръгва (И99).
        zakachiPrevklyuchvaneto(koren, '#tablo-lichno', !lichnoVklyucheno);
        zakachiZapasniya(koren);
        zakachiVrashtaneto(koren);
        koren.querySelector<HTMLButtonElement>('#izlez')?.addEventListener('click', async () => {
          await vhod.izlez();
          // Презареждането е нарочно: следващото тръгване минава по целия път
          // на влизането. Опит да се „смени самоличността в движение" би
          // оставил отворено Огледало на един акаунт под името на друг.
          location.reload();
        });
      },
    });
    /**
     * СЛУЖЕБНИТЕ ПЪТИЩА НЕ ВИСЯТ НА ЛИЧНИЯ ЕКРАН.
     *
     * Тези шест се закачат на ВСЕКИ екран със СЛУЖЕБНИЯ контекст `k`. Дотук
     * това беше безобидно — личният екран носеше само дела. Отсега носи ПАРИ
     * и ИЗВЛЕЧЕНИЯ, а „Прочети извлечение" на служебния пункт би записало
     * личната карта на човека в СЛУЖЕБНИЯ Журнал.
     *
     * Представка `lp-` не решава това: рискът не е сблъсък на id, а видим
     * бутон, който пише в грешния Журнал (правило 2 — Вратата е единственият
     * вход, и той трябва да е ПРАВИЛНАТА врата).
     *
     * Личният екран си има свои закачания в `zakachiLichno`, с личния контекст.
     */
    const sluzhebenEkran = ekran !== 'lichno';
    if (sluzhebenEkran && mozhe(izbor, 'iztochnitsi')) zakachiIztochnitsi(koren, k, prerisuvay);
    if (mozhe(izbor, 'fini-filtri')) zakachiFiltri(koren, prerisuvay);
    if (sluzhebenEkran) {
      zakachiIstoriya(koren, k);
      zakachiKontekstnoMenyu(koren, k);
      zakachiKlaviatura(koren, k, prerisuvay);
      zakachiRedaktsiya(koren, k, prerisuvay);
    }
    zakachiChernovata(koren);
    prilozhiSkritite(koren);
    zakachiGlavnite(k, prerisuvay);
  }

  /**
   * СТОПАНИНЪТ ПРЕДИ ПЪРВОТО РИСУВАНЕ · иначе първият запис ще бъде отказан.
   *
   * Отказът тук НЕ спира тръгването: дръпнат кран (котвата не съвпада) е
   * точно случаят, в който Журналът не се пипа (правило 8), а човекът трябва
   * да види екрана и думите защо. Затова причината се КАЗВА и се продължава.
   */
  try {
    await osiguriStopanina(deystviya, akaunt);
  } catch (greshka) {
    poslednaVest = {
      vid: 'zle',
      tekst: `Стопанинът не можа да се запише: ${dumiZaGreshka(greshka)}`,
    };
  }

  await prerisuvay();
  // Последно, за да не бави първото рисуване.
  await zakachiDzhoba(prerisuvay);
}

function strana(
  o: Parameters<typeof duljimo>[0],
  dnes: string,
  lichnoVklyucheno = false,
  rolya: Rolya = 'sobstvenik',
  lichnoPipnato = false,
  /** кой гледа · оттам идват темите на падащия ред (И101 т.2) */
  gledashtiyat: KoyGleda = 'stopanin',
): string {
  const v = sastoyanieNaVerigata;
  const tekst = !v.proverena
    ? 'Веригата не е проверявана в тази сесия'
    : v.tsyala
      ? 'Веригата е цяла'
      : 'Веригата е СКЪСАНА';
  const zakasneli = prosrocheni(o, dnes).length;

  const punktove = (Object.keys(EKRANI) as KoyEkran[])
    .filter((koy) => {
      // ЛИЧНОТО се вижда, докато е ВКЛЮЧЕНО — и докато НИКОГА не е пипано,
      // за да може изобщо да се пусне (И99: активацията иска МЯСТО в личния
      // драйв, а полето за него живее на самия екран).
      //
      // ПРИБРАНОТО пада от лентата и се връща от Таблото, където изключеното
      // се връща. Трите състояния са различни: „не е пипано" ≠ „прибрано"
      // ≠ „включено", и това е причината да не е един булев.
      if (koy === 'lichno') return lichnoVklyucheno || !lichnoPipnato;
      // НАСТРОЙКИ СТОИ ВИНАГИ · съдържанието му е по роля, не самият пункт
      // (И101 т.2). Скрит пункт би отнел на служителя и темите, които са
      // НЕГОВИ — езикът на интерфейса и личният таб.
      if (koy === 'nastroyki') return true;
      const iska = EKRANI[koy].iska;
      if (iska && !mozhe(izbor, iska)) return false;
      return dostapenLiE(koy, rolya);
    })
    .map((koy) => {
      const e = EKRANI[koy];
      /**
       * НАСТРОЙКИ Е ПАДАЩ РЕД, не обикновен пункт (И101 т.2 · ADR-045).
       *
       * Негови думи: „управление на всяка тема от настройки **като падащ ред
       * при натискане на настройки**". Пунктът остава на мястото си в лентата;
       * различава се само с това, което прави при натискане.
       */
      if (koy === 'nastroyki') return redNaNastroykite(gledashtiyat, dostapenLiE(koy, rolya));
      const znachka = koy === 'pari' && zakasneli > 0
        ? `<span class="broyach">${zakasneli}</span>`
        : '';
      return `<button type="button" class="navred${koy === ekran ? ' tuk' : ''}" data-ekran="${koy}">
        ${ikona(e.ikona, 'ikona navikona')}${e.ime}${znachka}
      </button>`;
    })
    .join('');

  return `
    <aside class="strana">
      <div class="marka">
        <b>VintexStroy</b>
        <span>MasterBook · ${SEGA.ime}</span>
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
          }${hranilishte.zaeto >= 0 ? ` · ${kolkoMyasto(hranilishte.zaeto)}${hranilishte.pozvoleno > 0 ? ` от ${kolkoMyasto(hranilishte.pozvoleno)}` : ''}` : ''}
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
      zapomniEkranno('ekran', ekran);
      await prerisuvay();
    });
  }

  // ПАДАЩИЯТ РЕД НА НАСТРОЙКИТЕ (И101 т.2 · ADR-045). Отварянето на екран е
  // подадено, а не вградено: компонентът не знае кой екран е отворен и не бива
  // да научава — той води до ТЕМА, а къде живее тя, казва домейнът.
  zakachiMenyutoNaNastroykite(koren, prerisuvay, async (koy) => {
    ekran = koy as KoyEkran;
    zapomniEkranno('ekran', ekran);
  });

  koren.querySelector<HTMLButtonElement>('#proveri')?.addEventListener('click', async () => {
    const sabitiya = await k.dnevnik.chetiVsichki(akaunt);
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
    if (!(await k.pravata.mozheDaIznasya(kojSam.imeyl, akaunt))) {
      k.vest('zle', 'Нямаш право да сваляш Журнала. Свалянето се дава по списък.');
      await prerisuvay();
      return;
    }
    const sabitiya = await k.dnevnik.chetiVsichki(akaunt);
    const fayl = new Blob([JSON.stringify(sabitiya, null, 2)], {
      type: 'application/json',
    });
    svaliFayl(fayl, `zhurnal-${akaunt}-${dnesKato()}.json`);

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
    if (!(await k.pravata.mozheDaIznasya(kojSam.imeyl, akaunt))) {
      k.vest('zle', 'Нямаш право да сваляш архива. Свалянето се дава по списък.');
      await prerisuvay();
      return;
    }
    const sabitiya = await k.dnevnik.chetiVsichki(akaunt);
    const ogledalo = await k.deystviya.ogledalo();
    const bajtove = arhivZaEksel(sabitiya, ogledalo, new Date().toISOString());
    const fayl = new Blob([bajtove.slice().buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    svaliFayl(fayl, `masterbook-arhiv-${dnesKato()}.xlsx`);
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

    const sega = (await k.dnevnik.chetiVsichki(akaunt)).length;
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
        naematel: akaunt,
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
      // GreshkaVnos РАЗШИРЯВА Error — изброяването ѝ поименно не добавяше
      // нищо освен впечатление за точност (същият капан като другите шест).
      k.vest('zle', `Внасянето е отказано. ${dumiZaGreshka(greshka)}`);
    } finally {
      fayl.value = '';
      await prerisuvay();
    }
  });
}

trugvay().catch((greshka: unknown) => {
  koren.innerHTML = `<div class="telo"><div class="vest zle">Приложението не тръгна: ${
    ekraniraj(dumiZaGreshka(greshka))
  }</div></div>`;
});
