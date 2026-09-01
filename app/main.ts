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
  PoSvoyataVeriga,
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
import { smeniNastroykiteNaVhoda } from './vhodni-problemi.js';
import { redNaNastroykite, zakachiMenyutoNaNastroykite } from './menyu-nastroyki.js';
import { zakachiPodredbata } from './podredba.js';
import { zakachiGrupite } from './grupa-deystviya.js';
import { zakachiMenyutataNaEkranite } from './menyu-ekran.js';
import {
  kopchetoNaLentata,
  lentataESvita,
  polozhiShirinata,
  razdelitelyat,
  zakachiRazdelitelya,
  moyatRed,
  podredeniPunktove,
  skritiPunktove,
  zabraviMoyaRed,
  vidimiPunktove,
  zakachiSvivachaNaLentata,
} from './lenta.js';
import { koyGleda, type KoyGleda } from '../src/domein/temi-nastroyki.js';
import { narisuvayImoti, zakachiFormite } from './imoti.js';
import { narisuvayStoynost, zakachiStoynost } from './stoynost.js';
import { narisuvayGant, zakachiGant } from './gant.js';
import { narisuvayPari, zakachiPari } from './pari.js';
import { lentataNaBalansa, narisuvaySmetki, zakachiSmetki } from './smetki.js';
import { narisuvayButona, narisuvayPlana, zakachiIztochnitsi } from './iztochnitsi.js';
import { arhivZaEksel } from './arhiv.js';
import { nachaloNaProbvaneto } from '../src/domein/probvane.js';
import { prochetiKnigata } from '../src/domein/knigata.js';
import { sveriVerigite } from '../src/domein/sverka-verigi.js';
import { butniSvoyata, drapniChuzhdite } from '../src/nositel/drayv.js';
import { DrayvNaGoogle, vzemiZheton } from './drayv-google.js';
import { zakachiFiltri } from './filtri.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { zakachiIstoriya } from './istoriya.js';
import { zakachiDokumentite } from './dokumenti.js';
import { zakachiKontekstnoMenyu } from './kontekstno-menyu.js';
import { zakachiKlaviatura } from './klaviatura.js';
import { zakachiChernovata } from './chernova.js';
import { prilozhiSkritite } from './skriti-koloni.js';
import { zakachiZebrata } from './zebra.js';
import { zakachiVisochinata } from './visochina.js';
import { zakachiGoleminata } from './golemina.js';
import { narisuvayProfila, zakachiProfila } from './profil.js';
import { zakachiTemata } from './tema.js';
import { helpatEOtvoren, narisuvayHelpa, zakachiHelpa } from './help.js';
import { zakachiIzgledaNaGanta } from './gant-izgled.js';
import { zakachiRedaktsiya } from './redaktsiya.js';
import { chetiIzbor, narisuvayTablo, svarzhiPitanetoNaDrayva, zakachiTablo } from './tablo.js';
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
  klyuchNaVerigata,
  knigataNa,
  koyZhurnal,
  pisachatNa,
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
import { IMENA_NA_ROLITE } from '../src/yadro/samolichnost.js';

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
/**
 * ОТВАРЯ ЕКРАН · един дом, два викащи.
 *
 * Падащите редове (темите на Настройки и секциите на всеки екран) не знаят кой
 * екран е отворен и не бива да научават: те казват КЪДЕ да се отиде, а пътят
 * дотам е един. Дотук този път беше вписан вътре в закачането на Настройки и
 * вторият викащ щеше да си направи копие. Живее ТУК, до самото `ekran` —
 * единственото място, което го мени.
 */
async function otvoriEkran(koy: string): Promise<void> {
  ekran = koy as KoyEkran;
  zapomniEkranno('ekran', ekran);
}

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
 * МОЯТА ВЕРИГА в тази книга (ADR-055).
 *
 * Различава се от `akaunt` само когато книгата е ЧУЖДА: тогава пиша в
 * `книга#pero:моят-имейл`, а чета цялата книга. При един писач двете съвпадат.
 *
 * Всичко, което брои, проверява или изнася ЗВЕНА, гледа веригата, не книгата:
 * хеш-веригата тръгва от `seq 1` за всяка поотделно, а слят файл би имал по
 * едно `seq 1` на верига — тоест нищо, което да се провери.
 */
let veriga = KLYUCH_OT_ALFA;

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
  /**
   * И ВТОРАТА граница · всеки пише в СВОЯТА верига (ADR-055).
   *
   * Обвивка около личното, не втора политика: двете пазят различни неща —
   * личното дели двата Журнала на ЕДИН човек, това дели ПИСАЧИТЕ в една книга.
   *
   * Стопанинът се пълни, щом се разбере коя книга се отваря (по-долу): дотогава
   * е `undefined`, което значи „не знам, не възразявам" — и е вярно, защото
   * дотогава не е писано нищо.
   */
  let stopaninatNaKnigata: string | undefined;
  const pravata = new PoSvoyataVeriga(
    new LichnoESamoTvoe(
      NASTAVKA_LICHEN,
      svediImeyl,
      () => vizhdatLichnoto,
      () => pishatVLichnoto,
    ),
    pisachatNa,
    knigataNa,
    (kniga) => (kniga === akaunt ? stopaninatNaKnigata : undefined),
    svediImeyl,
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

  /**
   * КОЯ ВЕРИГА ПИША · книгата е една, веригите са по писач (ADR-055).
   *
   * Стопанинът се извежда от ПЪРВОТО събитие на книгата (ADR-043), не се пита.
   * Аз ли съм — пиша във веригата-нула, точно както досега, и нищо не се
   * мигрира. Друг е — получавам своя верига в СЪЩАТА книга.
   *
   * Празна книга дава `undefined` и значи „аз съм първият": веригата-нула, а
   * трите правила при Вратата решават дали това е законно.
   */
  stopaninatNaKnigata = (await dnevnik.parvo(akaunt))?.actor;
  veriga = klyuchNaVerigata(akaunt, kojSam.imeyl, stopaninatNaKnigata);

  // Котвата срещу скъсяване отзад: по-къс Журнал от помненото = дръпнат кран.
  // ПО ВЕРИГА, не по книга: тя брои МОИТЕ звена и чуждата верига не я мени.
  const sabitiyaVNachaloto = await dnevnik.chetiVsichki(veriga);
  const proverka = proveriKotvata(
    kotva.cheti(veriga),
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
  /**
   * ТРЕТИЯТ КОНТЕКСТ · пиша в СВОЯТА верига, чета ЦЯЛАТА книга (ADR-055).
   *
   * Двете посоки са различни ключове и точно това е резенът. При един писач
   * `veriga === akaunt` и всичко върви както досега — включително мерките,
   * защото сгъването на ЕДНА верига е самата верига.
   */
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: veriga,
    actor: kojSam.imeyl,
    chasovnik: () => new Date().toISOString(),
    kniga: akaunt,
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
    const sabitiya = await dnevnik.chetiVsichki(veriga);
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
    /**
     * ПАРАМЕТРИТЕ ПРИ ВЪВЕЖДАНЕ · от Журнала към живата проверка (ADR-046).
     *
     * `svetni` чете модулна карта, защото се вика при всяко натискане на
     * клавиш и не може да чака Огледалото. Затова картата се ПОДАВА при всяко
     * рисуване: източникът е Журналът, а модулната променлива е само нейният
     * най-близък до полето препис.
     */
    smeniNastroykiteNaVhoda(ogledalo.parametriNaVhoda);
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
      ${/* РАЗДЕЛИТЕЛНАТА ЛИНИЯ · едно докосване прибира, задържане мери (резен 63). */
        razdelitelyat()}
      <main class="glavno">
        <header class="shapka">
          <div>
            <h1>${opis.ime}</h1>
            <p>${opis.podnaslov}</p>
          </div>
          ${
            /* ПОСТОЯННАТА ЛЕНТА (И124 т.3 · т.11 · ADR-133): шапката НЕ скролва
               (`.telo` е единствената скролираща кутия), затова каквото стои
               тук е „видимо по всяко време на скрола". Периодът на Баланса е
               първото ѝ парче; бутоните вдясно са САМОСТОЯТЕЛНИ — групите
               със стрелкичка паднаха. */
            ekran === 'smetki' ? lentataNaBalansa(dnes) : ''
          }
          <div class="desno-gore">
            ${/* ХЕЛПЪТ (И124 т.5 · ADR-136) · планът на таба, вдясно. Бутонът
                  е в черупката — на всеки екран, като профила. */
              `<button type="button" class="vtorichen" id="help-vhod"
                 aria-pressed="${helpatEOtvoren() ? 'true' : 'false'}">Хелп</button>`}
            ${/* ПРОФИЛЪТ (И124 т.5 · ADR-135) · аватарът е на ВСЕКИ екран, а
                  размерът на текста и темите живеят В НЕГО: „да се създаде
                  профил и да се измести там с всичката информация за
                  потребителя". Рисува се в ЧЕРУПКАТА, не в екраните: инак
                  единайсетият екран ще се роди без него. */
              narisuvayProfila(kojSam.imeyl, IMENA_NA_ROLITE[rolyataNa(kojSam.imeyl, ogledalo)])}
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
            // ДЕНЯТ НА ПЪРВОТО СЪБИТИЕ · книгата е ТУК, значи и сметката е тук
            // (резен 32). Таблото получава готов низ и не научава за Журнала.
            parviyatZapis: nachaloNaProbvaneto(sabitiya),
            dnes,
            izbor,
            kojSam,
            akaunt,
            kranatEOtvoren: !vrata.zatvorena,
            lichnoOgledalo,
            lichenAkaunt: lichen.akaunt,
            broyLichni: lichniteSabitiya.length,
            // МЕРЕНО, не питано (правило от `CLAUDE.md`: „Размерът се МЕРИ").
            // `-1` значи „браузърът не казва" и екранът го чете като нула
            // нужно място — по-честно от измислено число.
            zaetoNaUstroystvoto: Math.max(0, hranilishte.zaeto),
            dostapniEkrani: dostapniteEkrani({
              rolya: rolyataNa(kojSam.imeyl, ogledalo),
              lichnoVklyucheno,
              lichnoPipnato: lichnoOgledalo !== null,
            }),
          })}
        </div>
      </main>
      ${/* ХЕЛПЪТ (И124 т.5 · ADR-136) · вдясно, скрит по подразбиране. */
        narisuvayHelpa()}`;

    poslednaVest = null;
    opis.zakachi({
      koren,
      k,
      lichen,
      prerisuvay,
      dnes: dnesKato(),
      prevklyuchiLichnoto: (znak, vklyucheno) => zakachiPrevklyuchvaneto(koren, znak, vklyucheno),
      zakachiTabloto: () => {
        /**
         * СВЪРЗВАЩАТА ЧАСТ · ТУК, не в екрана (ADR-021 · ADR-055).
         *
         * Таблото не знае за мрежа и не бива да научава: офлайн изданието НЕ
         * носи `drayv-google.js`, и екран, който го внася направо, би го
         * издърпал в пакета. Затова питането се ПОДАВА, а липсата му е
         * състояние, което картата казва с думи.
         */
        svarzhiPitanetoNaDrayva(async () => new DrayvNaGoogle(await vzemiZheton()).kvota());
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
        /**
         * ПУБЛИКУВА НАЧАЛНИЯ РЕД · ЕДИНСТВЕНОТО тук, което пише в Журнала.
         *
         * Взима реда, който Стопанинът вижда СЕГА (трите слоя, слети), и го
         * записва като началния за всички. Едно събитие, при натиснат бутон —
         * не при всяко местене: междинните подредби не са решения, а движение
         * на ръката, и Журналът не се пълни с тях.
         *
         * СЛЕД ЗАПИСА МОЯТ РЕД СЕ ЗАБРАВЯ. Инак личният слой би останал върху
         * основния и щеше да повтаря същия ред — после, при първа промяна на
         * основния, човекът нямаше да види нищо и щеше да реши, че бутонът лъже.
         */
        koren
          .querySelector<HTMLButtonElement>('#zapishi-nachalniya-red')
          ?.addEventListener('click', async () => {
            try {
              const og = await k.deystviya.ogledalo();
              const red = podredeniPunktove(dostapnite(og), og.redNaLentata, moyatRed());
              await k.deystviya.podrediLentata(
                { red: [...red] },
                { opId: `lenta:${crypto.randomUUID()}` },
              );
              zabraviMoyaRed();
              k.vest('dobre', 'Началният ред е записан. Всички го получават; всеки може да го пренареди за себе си.');
            } catch (greshka) {
              k.vest('zle', dumiZaGreshka(greshka));
            }
            await prerisuvay();
          });
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
      // ДОКУМЕНТИТЕ · ЕДИН закачач за трите екрана (резен 17б · ADR-073).
      zakachiDokumentite(koren, k, prerisuvay);
      zakachiKontekstnoMenyu(koren, k);
      zakachiKlaviatura(koren, k, prerisuvay);
      zakachiRedaktsiya(koren, k, prerisuvay, rolyataNa(kojSam.imeyl, ogledalo));
    }
    zakachiChernovata(koren);
    // ПОДРЕДБАТА НА ЕКРАНА · всеки сам мести секциите си (И101 т.2 · ADR-045).
    // След рисуването, защото пренарежда вече нарисувани възли.
    zakachiPodredbata(koren, ekran);
    // ГРУПИТЕ ОСТАНАХА САМО В РЕДОВЕТЕ (И124 т.3 · ADR-133): секционните и
    // таб-бутоните са самостоятелни и видими; редовият лост пази височината
    // на реда (т.4 от същото съобщение). Падна и живият хедър (резен 49):
    // „хедъра който се лепи отгоре и се сменя за всяка таблица се маха,
    // защото не работи добре и натоварва."
    zakachiGrupite(koren, ekran);
    // ПАДАЩИЯТ РЕД НА ЛЕНТАТА · секциите на всеки екран с повече от три
    // (ADR-057в). СЛЕД подредбата: редът изрежда секциите в реда, в който
    // човекът ги е наредил, а не в реда, в който екранът ги е нарисувал.
    zakachiMenyutataNaEkranite(koren, ekran, otvoriEkran, prerisuvay);
    /**
     * КОИ ЕКРАНА СА ДОСТЪПНИ · един израз за ДВАТА викащи (правило 17).
     *
     * Стрелките и бутонът „Запиши началния ред" питат едно и също, и питаха го
     * с два еднакви къса — обходът за чистота ги хвана веднага. Разминат ли се,
     * човек ще подрежда по един списък, а ще публикува друг.
     */
    const dostapnite = (og: Ogledalo) =>
      dostapniteEkrani({
        rolya: rolyataNa(kojSam.imeyl, og),
        lichnoVklyucheno,
        lichnoPipnato: lichnoOgledalo !== null,
      });

    // ЛЕНТАТА · свива се и се застопорява (негова дума, 27.08 · ADR-058).
    zakachiSvivachaNaLentata(koren, prerisuvay);
    polozhiShirinata();
    zakachiRazdelitelya(koren, prerisuvay);
    // И СЕ ПОДРЕЖДА · всеки за себе си (И111). Стрелките пишат в паметта на
    // екрана, не в Журнала — затова тук няма нито едно повикване към Вратата.
    prilozhiSkritite(koren);
    // ЗЕБРАТА е ПОСЛЕДНА: тя брои РЕДОВЕТЕ, а скритите колони и подредбата
    // могат да сменят кои редове изобщо стоят. Броене преди тях би дало ивици
    // на редове, които после се местят.
    zakachiGoleminata(koren);
    // ПРОФИЛЪТ И ТЕМИТЕ (резен 78 · ADR-135) · панелът, размерът и двете теми.
    zakachiProfila(koren);
    zakachiTemata(koren);
    // ХЕЛПЪТ (резен 78б · ADR-136) · планът на таба се чете от живия екран,
    // затова се закача СЛЕД рисуването — той оглежда каквото стои.
    zakachiHelpa(koren, prerisuvay);
    zakachiIzgledaNaGanta(koren);
    zakachiVisochinata(koren);
    zakachiZebrata(koren);
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

/**
 * КОИ ЕКРАНА СА ДОСТЪПНИ · ЕДИН дом (правило 17).
 *
 * Живееше вътре в `strana()` и стигаше, докато лентата само се рисуваше. Резен
 * 15 добави ВТОРИ викащ — стрелките, които местят МОЯ ред и трябва да знаят
 * върху какъв списък действат, включително СКРИТИТЕ (инак скриването би местило
 * пунктове, а то не е ред). Преписан на две места, филтърът щеше да се разминава
 * при първата нова възможност.
 */
function dostapniteEkrani(n: {
  readonly rolya: Rolya;
  readonly lichnoVklyucheno: boolean;
  readonly lichnoPipnato: boolean;
  /** връзката с НАП · ФАКТ от Журнала, не отметка (резен 17) */
}): readonly KoyEkran[] {
  return (Object.keys(EKRANI) as KoyEkran[]).filter((koy) => {
      // ЛИЧНОТО се вижда, докато е ВКЛЮЧЕНО — и докато НИКОГА не е пипано,
      // за да може изобщо да се пусне (И99: активацията иска МЯСТО в личния
      // драйв, а полето за него живее на самия екран).
      //
      // ПРИБРАНОТО пада от лентата и се връща от Таблото, където изключеното
      // се връща. Трите състояния са различни: „не е пипано" ≠ „прибрано"
      // ≠ „включено", и това е причината да не е един булев.
      if (koy === 'lichno') return n.lichnoVklyucheno || !n.lichnoPipnato;
      // НАСТРОЙКИ СТОИ ВИНАГИ и това вече не е изключение тук: екранът няма
      // `iskaRolya` (резен 83) — вижда го всеки, а СЕКЦИИТЕ му се стесняват
      // по човек (`vizhdaSektsiyata`). Скрит пункт би отнел на служителя и
      // темите, които са НЕГОВИ — езикът на интерфейса и личният таб.
      const iska = EKRANI[koy].iska;
      if (iska && !mozhe(izbor, iska)) return false;
    return dostapenLiE(koy, n.rolya);
  });
}

function strana(
  o: Parameters<typeof duljimo>[0],
  dnes: string,
  lichnoVklyucheno = false,
  rolya: Rolya = 'sobstvenik',
  lichnoPipnato = false,
  /** кой гледа · оттам идват темите на падащия ред (И101 т.2) */
  gledashtiyat: KoyGleda = 'stopanin',
  /** връзката с НАП · ФАКТ от Журнала, третата врата на пункта (резен 17) */
): string {
  const v = sastoyanieNaVerigata;
  const tekst = !v.proverena
    ? 'Веригата не е проверявана в тази сесия'
    : v.tsyala
      ? 'Веригата е цяла'
      : 'Веригата е СКЪСАНА';
  const zakasneli = prosrocheni(o, dnes).length;

  // СВИТА ЛИ Е · поглед, не факт: чете се от паметта на екрана (ADR-058).
  const svita = lentataESvita();

  const dostapni = dostapniteEkrani({ rolya, lichnoVklyucheno, lichnoPipnato });
  /**
   * ТРИТЕ СЛОЯ НА РЕДА · и ЧЕТВЪРТИЯТ въпрос, кое се вижда (резен 15 · И111).
   *
   * Обявеният ред (`EKRANI`) е основата; върху него ляга НАЧАЛНИЯТ на Стопанина
   * (Журналът), а най-отгоре — МОЯТ (паметта на екрана). Скриването е отделно и
   * е ЛИЧНО: то маха от лентата, но не мени нито реда, нито Журнала.
   *
   * Сливането е `podredi`, викана два пъти — непознатият ключ пада НАКРАЯ, значи
   * нов екран се появява сам, без някой да е пипал записания ред.
   */
  const podredeni = podredeniPunktove(dostapni, o.redNaLentata, moyatRed());
  const skriti = skritiPunktove();
  const punktove = (vidimiPunktove(podredeni, skriti) as KoyEkran[])
    .map((koy) => {
      const e = EKRANI[koy];
      /**
       * НАСТРОЙКИ Е ПАДАЩ РЕД, не обикновен пункт (И101 т.2 · ADR-045).
       *
       * Негови думи: „управление на всяка тема от настройки **като падащ ред
       * при натискане на настройки**". Пунктът остава на мястото си в лентата;
       * различава се само с това, което прави при натискане.
       */
      if (koy === 'nastroyki') return redNaNastroykite(gledashtiyat, izbor);
      const znachka = koy === 'pari' && zakasneli > 0
        ? `<span class="broyach">${zakasneli}</span>`
        : '';
      // ИМЕТО В СВОЙ ВЪЗЕЛ · гол текстов възел не се скрива с CSS, а свитата
      // лента трябва да остави само знака (ADR-058). `textContent` не се мени,
      // значи проходът и контекстното меню четат същото.
      // СТРЕЛКИТЕ ГИ НЯМА ТУК · негова дума, 31.08: „Махни това смешно
      // разместване. То ще се прави от всеки стопанин ОТ НАСТРОЙКИ, където да
      // определяш кое къде седи и как работи." Редът си остава негов и личен —
      // мести се от Настройки · „Подредбата на екраните" (ADR-117).
      return `<button type="button" class="navred${koy === ekran ? ' tuk' : ''}" data-ekran="${koy}">
        ${ikona(e.ikona, 'ikona navikona')}<span class="navime">${e.ime}</span>${znachka}
      </button>`;
    })
    .join('');

  return `
    <aside class="strana${svita ? ' svita' : ''}">
      <div class="marka">
        ${kopchetoNaLentata(svita)}
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
  zakachiMenyutoNaNastroykite(koren, prerisuvay, otvoriEkran);

  koren.querySelector<HTMLButtonElement>('#proveri')?.addEventListener('click', async () => {
    const sabitiya = await k.dnevnik.chetiVsichki(veriga);
    const rezultat = await proveriVerigata(sabitiya, sha256Web);
    sastoyanieNaVerigata = {
      tsyala: rezultat.tsyala,
      proverena: true,
      broi: sabitiya.length,
    };

    if (rezultat.tsyala) {
      /**
       * СЛЕД СВОЯТА ВЕРИГА · сверката МЕЖДУ веригите (ADR-055 · резен 4).
       *
       * Двете отговарят на различни въпроси и затова вървят заедно, а не едно
       * вместо друго: „цяла ли е моята" пита за подписи, „съгласни ли са
       * веригите" пита за стопански факти. Книга с шест цели вериги може да
       * има двойно начислен месец — и обратното също.
       *
       * Тук нищо не се поправя: сблъсъкът е НАХОДКА за човек (правило 18).
       */
      const potok = (await prochetiKnigata(k.dnevnik, akaunt, new Date().toISOString())).potok;
      const sverkata = sveriVerigite(potok, await k.deystviya.ogledalo(), new Date().toISOString());
      if (sverkata.nared) {
        k.vest(
          'dobre',
          `Веригата е цяла · ${rezultat.proverni} от ${sabitiya.length} звена. ` +
            `Сверката на ${sverkata.broiVerigi === 1 ? 'единствената верига' : `${sverkata.broiVerigi} вериги`}: нула сблъсъка.`,
        );
      } else {
        k.vest(
          'zle',
          `Веригата е цяла, но сверката намери ${sverkata.sblasatsi.length} сблъсъка: ` +
            sverkata.sblasatsi.map((sb) => sb.kakvo).join(' · ') +
            ' Нищо не е поправено — поправката е решение на човек и се записва като сторно.',
        );
      }
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

  /**
   * ПРЕНАСЯНЕТО · Драйвът, файл на писач (ADR-055 · резен 6).
   *
   * Двете посоки НЕ са огледални и това е целият смисъл: бутам СВОЯТА верига,
   * дърпам ЧУЖДИТЕ. Бутане на чужд файл би значело да стана посредник, през
   * когото минава чужд подпис.
   *
   * Дръпнатото влиза през ВРАТАТА (правило 2) — не се записва направо в
   * носителя, колкото и да е по-бързо: файл, който заобикаля Вратата, е втори
   * вход за запис, а такъв няма.
   */
  koren.querySelector<HTMLButtonElement>('#drapni-drayv')?.addEventListener('click', async () => {
    const buton = koren.querySelector<HTMLButtonElement>('#drapni-drayv')!;
    buton.disabled = true;
    try {
      const drayv = new DrayvNaGoogle(await vzemiZheton());
      const drapnati = await drapniChuzhdite(drayv, akaunt, veriga, sha256Web);
      let novi = 0;
      const otkazani: string[] = [];
      for (const d of drapnati) {
        if (!d.tsyala) {
          otkazani.push(`${d.veriga}: ${d.prichina}`);
          continue;
        }
        try {
          /**
           * ВРАТАТА, не носителят (правило 2).
           *
           * `vazstanovi` е входът за ПОЛУЧЕНА верига и прави повече от запис:
           * проверява NFC и валидността на всяко звено, отказва по-стар файл от
           * наличното, отказва разделили се истории и мести котвата на чуждата
           * верига. Директният запис в носителя щеше да е втори вход — а такъв
           * няма.
           *
           * `actor` е АВТОРЪТ НА ВЕРИГАТА, не аз: питането е „този човек има ли
           * право в тази верига", а за получено копие отговорът е да — и не
           * се приема на доверие, защото `actor` е в подписа (ADR-049), тъй че
           * подменен автор къса веригата и `proveriVerigata` го лови.
           */
          const r = await k.vrata.vazstanovi(d.veriga, d.sabitiya[0]!.actor, d.sabitiya);
          novi += r.vneseni;
        } catch (greshka) {
          otkazani.push(`${d.veriga}: ${dumiZaGreshka(greshka)}`);
        }
      }
      k.vest(
        otkazani.length === 0 ? 'dobre' : 'zle',
        `Дръпнати ${drapnati.length - otkazani.length} вериги · ${novi} нови звена.` +
          (otkazani.length === 0 ? '' : ` ОТКАЗАНИ: ${otkazani.join(' · ')}`),
      );
    } catch (greshka) {
      k.vest('zle', dumiZaGreshka(greshka));
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#butni-drayv')?.addEventListener('click', async () => {
    const buton = koren.querySelector<HTMLButtonElement>('#butni-drayv')!;
    buton.disabled = true;
    try {
      const drayv = new DrayvNaGoogle(await vzemiZheton());
      const r = await butniSvoyata(drayv, veriga, await k.dnevnik.chetiVsichki(veriga));
      k.vest(
        'dobre',
        `Бутнати ${r.broy} звена в ${r.novFayl ? 'нов файл' : 'своя файл'}. ` +
          'Чуждите вериги не са пипани.',
      );
    } catch (greshka) {
      k.vest('zle', dumiZaGreshka(greshka));
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#iznesi')?.addEventListener('click', async () => {
    // Свалянето е ПРАВО, не даденост — думата на собственика.
    if (!(await k.pravata.mozheDaIznasya(kojSam.imeyl, akaunt))) {
      k.vest('zle', 'Нямаш право да сваляш Журнала. Свалянето се дава по списък.');
      await prerisuvay();
      return;
    }
    // ФАЙЛ НА ПИСАЧ · моята верига, проверима сама за себе си.
    const sabitiya = await k.dnevnik.chetiVsichki(veriga);
    const fayl = new Blob([JSON.stringify(sabitiya, null, 2)], {
      type: 'application/json',
    });
    svaliFayl(fayl, `zhurnal-${veriga}-${dnesKato()}.json`);

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
    // АРХИВЪТ Е ОТЧЕТ, не проверима верига: чете се ЦЯЛАТА книга, за да не
    // излезе таблица, чието Огледало е по-широко от редовете под него.
    const sabitiya = (await prochetiKnigata(k.dnevnik, akaunt, new Date().toISOString())).potok;
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

    const sega = (await k.dnevnik.chetiVsichki(veriga)).length;
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
