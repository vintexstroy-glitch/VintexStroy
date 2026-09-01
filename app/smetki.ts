/**
 * Екран „Сметки" — потоците пари и ДДС-то на ОТДЕЛЕН РЕД.
 *
 * Думата на собственика: цените са общи, с ДДС вътре; ДДС-то не се разделя
 * при наема, а се смята тук, на свой ред, и се разбива по акумулатори.
 *
 * Нищо на този екран не пише в Журнала. Всичко е изведено от Огледалото и се
 * преизчислява при всяко показване — включително сверката.
 */

import { SUMATA_NAD_NULA, kakvoPishe, otLeva, pishi, pishiVPole } from '../src/yadro/pari.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { otData } from '../src/yadro/data.js';
import { MERKA, ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import { eZamrazen } from '../src/domein/zamrazyavane.js';
import {
  broyNahodki,
  BEZ_DOGOVOR,
  dogovoriteVSverkata,
  stesniPoDogovor,
  sveriStesnyavaneto,
  IMENA_NA_SADBITE,
  spisatsiteZaSchetovodstvoto,
  mesetsiSvetene,
  predlozheniyaPoKredit,
  sverkaPoMesetsi,
  sverkataNaIzvlechenieto,
  zapisiteNaKnigata,
  type RedNaSverkata,
  type RezultatNaSverkata,
} from '../src/domein/sverka-izvlechenie.js';
import { CHAKA_PO_OTCHETA, SEKTSIITE_NA_OTCHETA } from '../src/domein/dyal-otchet.js';
import { proverkiOtSverki } from '../src/domein/proverki-ot-sverki.js';
import { prochetiIzvlecheniyata } from './izvlechenie-fayl.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { platenoDDSZaPerioda } from '../src/ogledalo/ogledalo.js';
import {
  akumulator,
  ddsOtObshta,
  sektoriNaRazhod,
  stavkaNaReda,
  STAVKI,
} from '../src/domein/dds.js';
import {
  mesetsiteVObhvata,
  potok,
  potototsiNaRazhod,
  razhodiZaPerioda,
  smetki,
  type RedDDS,
  type RedSmetka,
} from '../src/domein/smetki.js';
import { sDumi, type RezultatSverka } from '../src/domein/sverka-dds.js';
import {
  bankovotoSaldo,
  trezornotoSaldo,
  IMENA_NA_DZHOBOVETE,
  otcheti,
  saldoNa,
  type Otcheti,
  type Pole,
} from '../src/domein/otcheti.js';
import { sboratZaKapitala } from './stoynost.js';
import { NACHINI_NA_PLASHTANE, VID, type NachinNaPlashtane } from '../src/domein/sabitiya.js';
import { podredi, zhivite } from '../src/domein/dela.js';
import {
  dumataNaButona,
  mozheDaSeSkrie,
  obobshteniRedove,
  prevkluchi,
  reshetka,
  type KoeSeVizhda,
} from '../src/domein/gant.js';
import { sumiZaObhvat } from '../src/domein/otcheti.js';
import { mesechnitePari } from '../src/domein/diagrami.js';
import {
  IMENA_NA_RAZDELITE,
  delta,
  deltaProtsentiDeseti,
  kamTekst,
  mesetsatKatoTablitsa,
  type RedNaMesetsa,
} from '../src/domein/mesetsat.js';
import { narisuvayKalendara } from './kalendarat.js';
import { narisuvayPoletata, zakachiPoletata } from './pole-s-formula.js';
import { narisuvaySpravkite, zakachiSpravkite } from './spravki-schetovodstvo.js';
import { stalboveNaMesetsite } from './diagrami.js';
import {
  IMENA_NA_GNEZDATA,
  KAKVO_E_GNEZDOTO,
  REDAT_NA_GNEZDATA,
  otchetite,
  sveriGnezdata,
} from '../src/domein/gnezda.js';
import { registarZaMeseca, sboroveNaRegistara } from '../src/domein/registar-naemi.js';
import { narisuvayKoefitsientite, zakachiKoefitsientite } from './koefitsienti.js';
import { legendata, zakachiPole } from './vhodni-problemi.js';
import { narisuvayDiagrama } from './gant-diagrama.js';
import { formaDelo, slozhiShirinite, tablitsataSOcveteniPoleta, zakachiFormataNaDelo } from './gant.js';
import type { Ogledalo, PogasenZapis, Razhod } from '../src/ogledalo/ogledalo.js';
import { opitajStorno, zakachiStornoButoni } from './storno.js';
import { PRAZEN_FILTAR, filtriray, glaviNaTablitsata, grupiranaTablitsa, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import { butonIstoriya } from './istoriya.js';
import { broyDokumenti, butonNaDokumentite } from './dokumenti.js';
import { blokNaKreditite, redPodRazhodite, zakachiKreditite } from './krediti.js';
import { blokNaZaplatite, zakachiZaplatite } from './zaplati.js';
import { blokNaTablitsaOtFayl, zakachiTablitsaOtFayl } from './tablitsa-ot-fayl.js';
import { butonSIkona } from './ikoni.js';
import { oboroti } from '../src/domein/glavna-kniga.js';
import { svaliFayl } from './obshto.js';
import { CHAKA_DUMA_ZA_DDS } from '../src/domein/prodazhbi.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  menyuOtZhivi,
  novoteVSpisatsite,
  optsiiNaNachina,
  optsiiNaStavkata,
  poleSIzbor,
  poleSMenyu,
  poleZaPrepiska,
  rechnitsite,
  sDumiZaNovite,
  zakachiMenyuta,
  zapomniRechnitsite,
} from './menyu.js';
import type { Menyu } from '../src/domein/padashti-menyuta.js';
import type { Konteks } from './ekranite.js';

/** Ключът на речниците на този екран · формата на разхода е една. */
const RECHNIK_RAZHOD = 'razhod';

/**
 * РЕЧНИЦИТЕ НА РАЗХОДА · изведени от записаните разходи, без ново събитие.
 *
 * Двете полета имат ЕДНА мярка и затова един помощник: и доставчикът, и „за
 * какво" са свободен текст, който се повтаря — разликата е само от кое поле
 * се чете.
 */
function menyutoNaRazhodite(o: Ogledalo, klyuch: 'dostavchik' | 'opis', ime: string): Menyu {
  return menyuOtZhivi(
    klyuch,
    ime,
    [...o.razhodi.values()].map((r) => r[klyuch]),
  );
}

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdRazhod = crypto.randomUUID();
let opIdSaldo = crypto.randomUUID();
/**
 * Ключът на ЕДНО подаване на справка · живее, докато формата стои отворена.
 *
 * Дотук стоеше `spravka:${mesets}` — ключ от СЪДЪРЖАНИЕТО, който правило 20
 * забранява поименно. Последицата беше тиха и скъпа: сторнираш подадена
 * справка, за да я поправиш, подаваш втора за същия месец — и `opId`-ът вече е
 * минавал, значи Вратата връща стария резултат, нищо не влиза в Журнала, а
 * екранът пише „Справката е записана". Месецът остава ОТКЛЮЧЕН, докато
 * собственикът мисли, че е подал.
 */
let opIdSpravka = crypto.randomUUID();
let greshkaSaldo = '';

/** Кой месец се гледа · помни се (ADR-022): счетоводителят живее в един месец. */
let period: string | null = chetiEkranno<string | null>('smetki.period', null);
/** КРАЯТ на разглеждания период (И124 т.11) · null значи „само единият месец". */
let periodDo: string | null = chetiEkranno<string | null>('smetki.periodDo', null);
/**
 * Виждат ли се Приходите и Разходите в решетката на делата (И95): „показано
 * всички те цифри там с опция да ги изключваш пускаш". Скриването пипа
 * ЕКРАНА и нищо друго (правило 23) — сборовете пак се смятат.
 */
let sTsifrite = chetiEkranno('smetki.tsifrite', true);
/**
 * КОЕ СЕ ВИЖДА тук · негово, 31.08: „Да и на двете места. Да може да се крие."
 *
 * Паметта е СВОЯ (`smetki.*`), а не споделена с Управление: това са два ЕКРАНА,
 * и човек, който крие таблицата в Сметки, не иска да я скрие и в Управление.
 * Общ ключ би пренесъл едното решение върху другото — тих инцидент.
 */
let vizhdanoTuk: KoeSeVizhda = {
  tablitsa: chetiEkranno('smetki.dela.tablitsa', true),
  diagrama: chetiEkranno('smetki.dela.diagrama', true),
};

/** Редовете на Калкулатора — само в паметта, никъде другаде. */
interface RedNaSmyatane {
  readonly opis: string;
  readonly obshta_st: number;
  readonly stavka: number;
}
let smyatane: RedNaSmyatane[] = [];

/**
 * РЕЗУЛТАТЪТ ОТ СВЕРКАТА С ИЗВЛЕЧЕНИЕТО · ПОГЛЕД, не запис (ADR-022).
 *
 * Живее в паметта на модула и умира при затваряне на екрана — както черновата
 * на разхода. В Журнала влиза само СВЕРКАТА, и то с натискане на човек
 * (правило 18): машината чете и предлага, записва човекът.
 *
 * СПИСЪК, не един резултат: файлът е ОБХВАТ, не месец (човек тегли „последните
 * 90 дни"), и всеки покрит месец си има своя сверка. Оттам се смята и „колко
 * месеца свети" един и същ ненамерен запис — негови думи, 11.08.
 */
let sverkiteNaIzvlechenieto: readonly RezultatNaSverkata[] = [];
/**
 * ИЗБРАНИЯТ ДОГОВОР при сверката · ПАМЕТ НА ЕКРАНА, нула събития (резен 36).
 *
 * Филтърът е ПОГЛЕД — кой ред гледам сега — а не решение за данните. Записан,
 * той щеше да значи, че сверката е направена „за този договор", а тя е за
 * целия месец (правило 23 · ADR-022).
 */
let dogovorNaSverkata = chetiEkranno('izvlechenie.dogovor', '');
let greshkaIzvlechenie = '';
/** Крайното салдо по месеци от последното прочетено извлечение · котвите. */
let krayniteSalda = new Map<string, number>();
let opIdSverkaIzvlechenie = crypto.randomUUID();
/** отпечатъците на прочетените файлове · влизат в записаната сверка */
let izvoriteNaIzvlechenieto: readonly string[] = [];
/** колко реда не се разчетоха · БРОЯТ СЕ, не се преглъщат */
let propusnatiOtIzvlechenieto = 0;

/** Колоните на списъка „Разходи" — фините филтри в стил Уиндоус. */
export const KOLONI_RAZHODI: KolonaSFiltar<Razhod>[] = [
  // Петата глава пише „ДДС" и колоната Е ДДС (правило 20 · ADR-014): дотук
  // беше описана като ДАТА и филтърът под „ДДС" предлагаше „Днес · Вчера ·
  // Тази седмица" — глава, която лъже какво стои под нея. Дата-филтърът пада
  // с лъжата; датата се търси свободно през „Търси в таблицата".
  { klyuch: 'koy', ime: 'Доставчик и описание', vid: 'tekst', vzemi: (r) => r.dostavchik },
  { klyuch: 'potok', ime: 'Поток', vid: 'tekst', vzemi: (r) => potok(r.potok)?.ime ?? r.potok },
  { klyuch: 'sektor', ime: 'Сектор', vid: 'tekst', vzemi: (r) => akumulator(r.sektor).sektor },
  { klyuch: 'suma', ime: 'Обща сума', vid: 'evro', vzemi: (r) => r.suma_st },
  {
    klyuch: 'dds',
    ime: 'ДДС',
    vid: 'evro',
    vzemi: (r) => ddsOtObshta(r.suma_st, stavkaNaReda(r.sektor, r.stavka)).dds_st,
  },
];

/**
 * ГЛАВАТА и ЗНАЧКАТА на сверителната таблица · ЕДИН надпис за двете.
 *
 * Екранът носи две сверителни таблици — изчислената за месеца и тази на
 * Капитала по два пътя. Различни данни, еднакъв надпис. Написан два пъти,
 * той се разминава: едната казва „затваря", другата утре ще каже „наред",
 * и човекът ще търси разликата между двете думи, каквато няма.
 */
const GLAVA_NA_SVERKATA = `
        <div class="glava sverka">
          <span>Какво</span><span class="suma">Вход</span><span class="suma">Изход</span>
          <span class="suma">Разлика</span><span></span>
        </div>`;

function znachkaNaSverkata(zatvarya: boolean): string {
  return `<span class="znachka ${zatvarya ? 'dobre' : 'trevoga'}">${
    zatvarya ? 'затваря' : 'НЕ затваря'
  }</span>`;
}

/**
 * ПЕРИОДЪТ В ПОСТОЯННАТА ЛЕНТА (И124 т.11 · резен 76 · ADR-133).
 *
 * Негово: „В Перид при Сметки липсва възможност за въвеждане на края на
 * разглеждания периода. **Това е част от постоянното меню с бутоните най
 * отгоре видимо постоянно.**" Затова формата НЕ живее в тялото (то скролва),
 * а в шапката — тя стои извън скролиращата кутия и се вижда по всяко време.
 * Рисува я `main.ts`; законите за края (сборовете гледат обхвата, месечните
 * механизми — началния месец) са си в `narisuvaySmetki`.
 */
export function lentataNaBalansa(dnes: string): string {
  const mesets = period ?? dnes.slice(0, 7);
  const krayat = periodDo !== null && periodDo > mesets ? periodDo : null;
  return `
      <form id="forma-period" class="lenta-period" translate="no">
        <label>От <input translate="no" id="smetki-period" name="period" type="month"
               value="${ekraniraj(mesets)}" required></label>
        <label>До <input translate="no" id="smetki-period-do" name="periodDo" type="month"
               value="${ekraniraj(krayat ?? '')}"></label>
        <button type="submit" class="vtorichen">Покажи</button>
      </form>`;
}

export function narisuvaySmetki(o: Ogledalo, dnes: string): string {
  const mesets = period ?? dnes.slice(0, 7);
  // КРАЯТ (И124 т.11) · сборовете и разбивките гледат ОБХВАТА; месечните
  // механизми (ДДС · сверката с извлечението · салдата) са месечни по закон
  // и работят по НАЧАЛНИЯ месец — и го КАЗВАТ (правило 15).
  const krayat = periodDo !== null && periodDo > mesets ? periodDo : null;
  const obhvatat = krayat === null ? [mesets] : mesetsiteVObhvata(mesets, krayat);
  const sega = new Date().toISOString();
  const s = smetki(o, mesets, sega);
  const poMesetsi = obhvatat.map((m) => (m === mesets ? s : smetki(o, m, sega)));
  const prihodObhvat = poMesetsi.reduce((sbor, x) => sbor + x.prihod_st, 0);
  const razhodObhvat = poMesetsi.reduce((sbor, x) => sbor + x.razhod_st, 0);
  const nadpisObhvat = krayat === null ? mesets : `${mesets} → ${krayat}`;
  const razlika = s.sverki.reduce((sbor, x) => sbor + x.razlika, 0);
  const razhodi = obhvatat.flatMap((m) => razhodiZaPerioda(o, m));
  const filtriraniRazhodi = filtriray('razhodi', razhodi, KOLONI_RAZHODI, dnes);

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Приход за ${ekraniraj(nadpisObhvat)}</span>
        <span class="chislo" translate="no">${pishi(prihodObhvat)}</span>
        <span class="pod">начислено · обща цена с ДДС</span>
      </div>
      <div class="plochka">
        <span class="etiket">ДДС ${s.zaVnasyane_st < 0 ? 'за възстановяване' : 'за внасяне'}</span>
        <span class="chislo" translate="no">${pishi(s.zaVnasyane_st)}</span>
        <span class="pod">${krayat === null ? '' : `месечно · ${ekraniraj(mesets)} · `}изход ${pishi(s.dds_izhod_st)} − вход ${pishi(s.dds_vhod_st)}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Разход за ${ekraniraj(nadpisObhvat)}</span>
        <span class="chislo" translate="no">${pishi(razhodObhvat)}</span>
        <span class="pod">заплати + кредити + фактури</span>
      </div>
      <div class="plochka${s.nared ? '' : ' trevoga'}">
        <span class="etiket">Разлика по сверката</span>
        <span class="chislo" translate="no">${pishi(razlika)}</span>
        <span class="pod">${s.nared ? 'сверката затваря' : 'НЕ затваря — виж долу'}</span>
      </div>
    </div>

    ${formaSalda(o)}

    <section data-sektsiya="smetki-smetki">
      <div class="dyalglava">
        <h2>Баланс</h2><span>${krayat === null ? ekraniraj(mesets) : `месечно · ${ekraniraj(mesets)}`}</span>
      </div>
      <div class="tablitsa">
        <div class="glava smetka">
          <span>Поток</span><span>Посока</span><span>Записи</span>
          <span class="suma">Сума</span>
        </div>
        ${s.redove.map(redNaSmetka).join('')}
      </div>
      <p class="drebno" data-sektsiya="prodazhbi-granitsa"><b>Потокът „Продажби"
      се СМЯТА</b> от вноските по сделка, всяка по СВОЯТА дата — сделка от март
      с вноска през август е приход за август. Нищо не се записва: записан, той
      щеше да се удвои с реалното плащане от извлечението.
      <b>Връщането и неустойката НЕ влизат</b> — „Неустойките се превеждат
      отделно, никакво нетиране"; те стоят на своя ред в Продажби.</p>
      <p class="drebno" data-chaka-dds="${CHAKA_DUMA_ZA_DDS.length}"><b>И НЕ влиза
      в ДДС-основата.</b> Дали доставката е облагаема зависи от това нова ли е
      сградата и коя част е земя (чл. 45 ЗДДС) — счетоводна преценка, не
      аритметика. Тихо начислени 20 % върху продажба на имот са глоба, не
      закръгляне. Чака се: ${CHAKA_DUMA_ZA_DDS.map((x) => ekraniraj(x)).join(' · ')}.</p>
    </section>

    <section data-sektsiya="smetki-dds">
      <div class="dyalglava">
        <h2>ДДС</h2>
        <span>отделни акумулатори по държава и сектор — не един общ</span>
      </div>
      <div class="tablitsa">
        <div class="glava dds">
          <span>Страна</span><span>Сектор</span><span>Ставка</span>
          <span class="suma">Основа</span><span class="suma">ДДС</span>
        </div>
        ${
          s.dds.length === 0
            ? '<p class="prazno">Няма начислено за този месец.<br>ДДС се извежда от начисленото, не от влезлите пари.</p>'
            : s.dds.map(redNaDDS).join('')
        }
        <div class="red dds sbor" translate="no">
          <span></span>
          <span class="kletka"><b>${s.zaVnasyane_st < 0 ? 'За възстановяване' : 'За внасяне'}</b><span>изход ${pishi(s.dds_izhod_st)} − вход ${pishi(s.dds_vhod_st)}</span></span>
          <span></span>
          <span class="suma"></span>
          <span class="suma duljimo" data-st="${s.zaVnasyane_st}">${pishi(s.zaVnasyane_st)}</span>
        </div>
      </div>
      <p class="drebno">Данъчното събитие е падежът, не денят на парите — затова редът ДДС не мърда, когато влезе плащане.</p>
    </section>

    ${blokNaDyalaOtchet()}
    ${blokNaOtchetite(o, mesets, dnes)}
    ${narisuvayKoefitsientite(o, dnes)}

    ${blokDelata(o, dnes)}

    ${blokNaSverkataDDS(s.ddsSverka)}

    ${blokNaSverkataSIzvlechenie(o, mesets)}

    ${blokNaSpravkata(o, mesets, s.zaVnasyane_st)}


    <section data-sektsiya="smetki-sverka">
      <div class="dyalglava"><h2>Сверка</h2><span>вход ↔ изход ↔ разлика</span></div>
      <div class="tablitsa">
        ${GLAVA_NA_SVERKATA}
        ${s.sverki
          .map(
            (x) => `
          <div class="red sverka" translate="no">
            <span class="kletka"><b>${ekraniraj(x.kakvo)}</b></span>
            <span class="suma"${vStotinki(x.belezhka, x.vhod)}>${merka(x.belezhka, x.vhod)}</span>
            <span class="suma"${vStotinki(x.belezhka, x.izhod)}>${merka(x.belezhka, x.izhod)}</span>
            <span class="suma${x.nared ? '' : ' duljimo'}"${vStotinki(x.belezhka, x.razlika)}>${merka(x.belezhka, x.razlika)}</span>
            <span>${znachkaNaSverkata(x.nared)}</span>
          </div>`,
          )
          .join('')}
      </div>
      <p class="drebno">${ZASHTO_I_NULATA}</p>
    </section>

    ${narisuvaySpravkite(o, dnes)}

    ${narisuvayKalendara(o, mesets, dnes)}

    ${blokMesetsatZaAgenta(o, mesets)}

    ${blokNaZaplatite(o, dnes)}

    ${formaRazhod(o, mesets)}

    ${
      razhodi.length === 0
        ? ''
        : `<section data-sektsiya="smetki-razhodi">
      <div class="dyalglava"><h2>Разходи за ${ekraniraj(nadpisObhvat)}</h2><span>${razhodi.length}</span></div>
      ${poleZaTarsene('razhodi')}
      <div class="tablitsa" data-tablitsa="razhodi">
        <div class="glava razhod">
          ${glaviNaTablitsata('razhodi', KOLONI_RAZHODI, razhodi, dnes)}<span></span>
        </div>
        ${
          filtriraniRazhodi.redove.length === 0
            ? PRAZEN_FILTAR
            : grupiranaTablitsa('razhodi', filtriraniRazhodi.redove, KOLONI_RAZHODI, dnes, (r) =>
                redNaRazhod(r, o),
              )
        }
      </div>
      ${redZaSkritoto(filtriraniRazhodi, 'razhodi')}
      ${blokNaPogasenite(o, mesets)}
    </section>`
    }

    ${blokNaTablitsaOtFayl(o)}

    ${redPodRazhodite(o, mesets, dnes)}

    ${blokNaKreditite(o, dnes)}

    ${kalkulator()}
  `;
}

/**
 * САЛДАТА · „Редактируеми отгоре в Сметки" *(р57·[18])*.
 *
 * Тук влиза САМО началото. Движенията се четат от Журнала — ако и двете се
 * пишеха, едно движение би се броило два пъти и Ликвидността щеше да лъже
 * точно там, където се гледа.
 */
function formaSalda(o: Ogledalo): string {
  const banka = bankovotoSaldo(o);
  const trezor = trezornotoSaldo(o);
  return `
    <section data-sektsiya="smetki-salda" class="karta">
      <div class="dyalglava">
        <h2>Салда</h2>
        <span>трезорът на ръка · банката се закотвя от извлечението (И124 т.9)</span>
      </div>
      <div class="plochki">
        <div class="plochka">
          <span class="etiket">${ekraniraj(IMENA_NA_DZHOBOVETE.banka)} · сега</span>
          <span class="chislo" translate="no" data-banka-saldo="${banka.saldo_st}">${pishi(banka.saldo_st)}</span>
          <span class="pod" data-banka-izvor="${ekraniraj(banka.izvor)}">${
            banka.izvor === 'котва'
              ? `котва от извлечението за ${ekraniraj(banka.period ?? '')} + изчислено оттогава`
              : banka.izvor === 'ръчно'
                ? 'ръчно старо начало + движения · чака първата котва'
                : 'чака първата сверка с извлечение — тя е котвата'
          }</span>
        </div>
        <div class="plochka">
          <span class="etiket">${ekraniraj(IMENA_NA_DZHOBOVETE.trezor)} · сега</span>
          <span class="chislo" translate="no" data-trezor-saldo="${trezor.saldo_st}">${pishi(trezor.saldo_st)}</span>
          <span class="pod">${trezor.izvor === 'ръчно' ? 'ръчно начало + движения в брой' : 'движения в брой · чака начало'}</span>
        </div>
      </div>
      <form id="forma-saldo">
        <div class="poleta tesni">
          <div class="pole">
            <label for="saldo-suma">Начално салдо на ТРЕЗОРА</label>
            <input translate="no" id="saldo-suma" name="suma" inputmode="decimal" placeholder="10 000,00" required>
          </div>
          <div class="pole">
            <label for="saldo-ot">От дата</label>
            <input translate="no" id="saldo-ot" name="ot" type="date" required>
          </div>
        </div>
        <div class="deystviya">
          <button type="submit" class="vtorichen">Запиши салдото на трезора</button>
          <p class="greshka" id="greshka-saldo">${ekraniraj(greshkaSaldo)}</p>
        </div>
        <p class="drebno">„Вкарва само в трезора" — банково салдо на ръка НЯМА: банката се
        закотвя всеки месец от сверката с извлечението и до следващата се ИЗЧИСЛЯВА
        (правило 15: изборът, който го няма, се казва). Повторен запис ПОПРАВЯ трезора;
        втори ред не се ражда. Отрицателно се приема — овърдрафтът е дълг, не грешка.</p>
      </form>
    </section>`;
}

/**
 * ГНЕЗДАТА · Отчети · Пари · Регистър, слети на едно място.
 *
 * Негови ДВЕ изречения от 11.08, дословно:
 *
 *   „Слей ги в гнезда (Отчети · Пари · Регистър)" *(р80·[50])*
 *   „ОТЧЕТ СРЕДСТВА/ОТЧЕТ ФИНАНСИ" *(р80·[48])*
 *
 * Дотук на този екран стояха ЕДИН дял „Отчети" с четири полета, стълбовете на
 * месеците и полетата с формула — един до друг, без имена помежду си; а
 * Регистърът беше на съвсем друг екран. Тоест нито гнезда, нито двата
 * поименни отчета: описът го броеше с нула попадения и беше прав.
 *
 * Сега трите гнезда носят НЕГОВИТЕ имена, в НЕГОВИЯ ред, а вътре в първото —
 * двата поименни отчета, пак в неговия ред („СРЕДСТВА/ФИНАНСИ"). Имената се
 * четат от `src/domein/gnezda.ts` и се БРОЯТ там; тук няма нито един низ, който
 * да може да се разсинхронизира тихо (правило 17).
 *
 * ГРАНИЦАТА, КАЗАНА НА ГЛАС. Гнездото „Регистър" показва парите на наемите за
 * периода и НИЩО повече: пълният Регистър — трите изгледа, групирането,
 * месецът — се пише на Имоти. Посоката е една (правило 20): тук се ЧЕТЕ.
 * Изключено ≠ липсващо, затова го пише на екрана, а не само тук.
 *
 * Негова поръчка отпреди (И90) остава в сила вътре в първото гнездо: „ще
 * правиш полета в Секция Отчети където ще се сложар полета които да покзват
 * тези стойности с формули между всички таблици." Затова тук няма голо число.
 */
/**
 * ДЯЛЪТ „ОТЧЕТ" (резен 74 · И124 т.12) · „Тук събери секцията Сметки наречена
 * Сметки Прогноза с Отчет, Отчет са цялата работа с коефициентите и
 * диаграмите, таблиците за тях."
 *
 * Банерът КАЗВА какво стои в дяла (съставът се брои от `dyal-otchet.ts`, не се
 * преглежда на око) и какво още ЧАКА по отчета — поименно, за да го брои
 * машина, не изречение. Секциите отдолу носят `data-dyal="otchet"`.
 */
function blokNaDyalaOtchet(): string {
  return `
    <section data-sektsiya="otchet-dyal" class="karta">
      <div class="dyalglava">
        <h2>Отчет</h2>
        <span>Прогнозата (Сметки на Дела и Състояние) · коефициентите · диаграмите · таблиците им</span>
      </div>
      <p class="drebno" data-otchet-sastav="${SEKTSIITE_NA_OTCHETA.length}">Дялът
      събира ${SEKTSIITE_NA_OTCHETA.length} секции — гнездата с Прогнозата и
      петте на коефициентите. Съставът се БРОИ, не се оценява.</p>
      <p class="drebno" data-otchet-chaka="${CHAKA_PO_OTCHETA.length}">Проверено
      по изворите („има пропуски") — още чака, поименно:</p>
      <ul class="drebno">
        ${CHAKA_PO_OTCHETA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
      </ul>
    </section>`;
}

function blokNaOtchetite(o: Ogledalo, mesets: string, dnes: string): string {
  // Липсващият сбор се ПРОПУСКА, не се подава като undefined: полето трябва да
  // може да различи „нула" от „още не е смятано" (правило 15).
  const stoynost_st = sboratZaKapitala();
  const r: Otcheti = otcheti(
    o,
    mesets,
    new Date().toISOString(),
    stoynost_st === undefined ? {} : { stoynostNaSastoyanie_st: stoynost_st },
  );
  const g = sveriGnezdata(r.poleta);
  const sborNaNaemite = sboroveNaRegistara(registarZaMeseca(o, mesets, dnes));
  return `
    <section data-sektsiya="smetki-otcheti" data-dyal="otchet">
      <div class="dyalglava">
        <h2>${REDAT_NA_GNEZDATA.map((k) => ekraniraj(IMENA_NA_GNEZDATA[k])).join(' · ')}</h2>
        <span>${ekraniraj(mesets)} · три гнезда, всяко число с формулата си</span>
      </div>

      <div class="gnezdo" data-gnezdo="otcheti">
        <div class="gnezdoglava">
          <h3>${ekraniraj(IMENA_NA_GNEZDATA.otcheti)}</h3>
          <span>${ekraniraj(KAKVO_E_GNEZDOTO.otcheti)}</span>
        </div>
        ${otchetite(r.poleta)
          .map(
            (ot) => `
          <article class="otchet" data-otchet="${ekraniraj(ot.klyuch)}">
            <div class="otchetglava">
              <h4>${ekraniraj(ot.ime)}</h4>
              <span>${ekraniraj(ot.kakvo)}</span>
            </div>
            <div class="otcheti">
              ${ot.poleta.map(poleNaOtcheta).join('')}
            </div>
          </article>`,
          )
          .join('')}
        <div class="tablitsa">
          ${GLAVA_NA_SVERKATA}
          <div class="red sverka otchet-sverka" translate="no">
            <span class="kletka"><b>Капиталът, сметнат по два пътя</b><span>съставки ↔ активи−задължения</span></span>
            <span class="suma" data-st="${r.sverka.ot_sastavki_st}">${pishi(r.sverka.ot_sastavki_st)}</span>
            <span class="suma" data-st="${r.sverka.aktivi_st - r.sverka.zadalzheniya_st}">${pishi(r.sverka.aktivi_st - r.sverka.zadalzheniya_st)}</span>
            <span class="suma${r.sverka.razlika_st === 0 ? '' : ' duljimo'}" data-st="${r.sverka.razlika_st}">${pishi(r.sverka.razlika_st)}</span>
            <span>${znachkaNaSverkata(r.sverka.razlika_st === 0)}</span>
          </div>
        </div>
        <p class="drebno">Разликата се показва и когато е нула — проверената нула е различна от нулата, за която никой не е питал.</p>
        <p class="drebno" data-gnezda-sverka="${g.razlika}">Влизат ${g.vhod} полета, излизат ${g.izhod} по двата отчета · разлика ${g.razlika}.${
          g.bez_otchet.length === 0 ? '' : ` Без отчет: ${g.bez_otchet.map(ekraniraj).join(' · ')}.`
        }${g.bez_pole.length === 0 ? '' : ` Разпределение без поле: ${g.bez_pole.map(ekraniraj).join(' · ')}.`}
          Кое поле в кой отчет влиза е НАШЕ решение, не негово изречение.</p>
      </div>

      <div class="gnezdo" data-gnezdo="pari">
        <div class="gnezdoglava">
          <h3>${ekraniraj(IMENA_NA_GNEZDATA.pari)}</h3>
          <span>${ekraniraj(KAKVO_E_GNEZDOTO.pari)}</span>
        </div>
        ${stalboveNaMesetsite(mesechnitePari(o, dnes))}
        ${narisuvayPoletata(o, mesets, dnes)}
      </div>

      <div class="gnezdo" data-gnezdo="registar">
        <div class="gnezdoglava">
          <h3>${ekraniraj(IMENA_NA_GNEZDATA.registar)}</h3>
          <span>${ekraniraj(KAKVO_E_GNEZDOTO.registar)}</span>
        </div>
        <div class="plochki">
          <div class="plochka">
            <span class="etiket">Начислено</span>
            <span class="chislo" translate="no" data-gnezdo-registar="nachisleno">${pishi(sborNaNaemite.nachisleno_st)}</span>
            <span class="pod">${sborNaNaemite.redove} ${sborNaNaemite.redove === 1 ? 'ред' : 'реда'}</span>
          </div>
          <div class="plochka">
            <span class="etiket">Събрано</span>
            <span class="chislo" translate="no" data-gnezdo-registar="plateno">${pishi(sborNaNaemite.plateno_st)}</span>
            <span class="pod">по вземанията</span>
          </div>
          <div class="plochka${sborNaNaemite.ostatak_st === 0 ? '' : ' trevoga'}">
            <span class="etiket">Остава</span>
            <span class="chislo" translate="no" data-gnezdo-registar="ostatak">${pishi(sborNaNaemite.ostatak_st)}</span>
            <span class="pod">${sborNaNaemite.prosrocheni === 0 ? 'нищо просрочено' : `${sborNaNaemite.prosrocheni} просрочени`}</span>
          </div>
        </div>
        <p class="drebno">Пълният Регистър — трите изгледа, групирането и месецът — се пише на Имоти. Тук се ЧЕТЕ: посоката е една.</p>
      </div>
    </section>`;
}

/**
 * ДЕЛАТА В СМЕТКИ · копието от Управление, с диаграмата до него (И92 т.4).
 *
 * „Прави диаграмите — има ги в Сметки, до таблицата, която е копие на тази
 * от Управление… Давай ги всички сега." И92 стъпва на И91: „ще се работи с
 * тази информация за сверка само от Сметки, където са и Отчетите."
 *
 * Копието се ЧЕТЕ: без форма, без филтри, без сгъвачи — посоката е една
 * (правило 20), пише се в Управление. Тактът е закован на месец: сверката
 * гледа месеци, не дни.
 */
/**
 * ЗАЩО НЕ `.deystviya` за двата превключвателя на изгледа.
 *
 * Класът пуска ГРУПИРАНЕТО със стрелкичка (ADR-057) — няколко действия на едно
 * място стават един бутон. Но това не са действия върху данни, а превключватели
 * на ИЗГЛЕД: свити зад стрелка, те се скриват точно от онзи, който ги търси.
 * Първото писане ги сложи в `.deystviya` и проходът ги намери СКРИТИ — намери и
 * трети бутон, самата стрелкичка.
 *
 * И ЧЕТВЪРТИ, от същия род: обвивките на диаграмата и таблицата станаха преки
 * деца на скролиращата кутия и носеха `.dyalglava`, но НЯМАХА ключ — тоест две
 * секции без ключ, които проход §68 брои като изчезнали при разместване. Ключ
 * им се даде: те наистина СА секции, щом се местят отделно.
 *
 * И ТРЕТИ: белегът им беше `data-sektsiya`, сложен ВЪТРЕ в секцията „Делата".
 * Ключът на секцията е един на секция и един на екран (проход §68) — вложен, той
 * дава два еднакви ключа. Изгледът получи СВОЙ белег.
 *
 * И втори капан, платен веднага след първия: обяснението стоеше като HTML
 * коментар ВЪТРЕ в шаблонния низ и носеше обратни апострофи. Те затварят низа —
 * страницата падна с „.deystviya is not a function". Обяснението за кода живее
 * в кода, не в разметката.
 */
/**
 * МЕСЕЦЪТ ЗА АГЕНТА · това, и НИЩО друго, тръгва навън (резен 15б · ADR-005).
 *
 * Негови думи: агентът „смята и предлага, и анализира финансовите показатели и
 * отчети — оценява, предлага и показва" *(ADR-005 · И11)*, но „не записва"
 * *(И12)*. За да анализира, му трябва ТАБЛИЦА, не сборове — от изречение
 * „Приходи: 1 700,00 €" не се вижда накъде мърда нещо.
 *
 * ЗАЩО СТОИ НА ЕКРАНА. Защото съдържанието му напуска устройството. Бутон
 * „анализирай", който не показва какво изпраща, иска доверие, което не е
 * спечелено. Тук се вижда всеки ред — и `<details>`-ът долу показва
 * ДОСЛОВНИЯ текст, дума по дума, какъвто го получава моделът.
 *
 * И се вижда какво НЕ излиза: имена на наематели и доставчици няма никъде
 * (ADR-029), а `tests/mesetsat.test.ts` го пази вместо окото.
 */
function blokMesetsatZaAgenta(o: Ogledalo, mesets: string): string {
  const t = mesetsatKatoTablitsa(o, mesets, new Date().toISOString());
  return `
    <section data-sektsiya="smetki-mesetsat">
      <div class="dyalglava">
        <h2>Месецът за агента</h2>
        <span>това — и нищо друго — напуска устройството</span>
      </div>
      <div class="tablitsa" data-tablitsa="mesetsat">
        <div class="glava mesetsat">
          <span>Раздел</span><span>Ред</span><span class="suma">Сега</span>
          <span class="suma">${ekraniraj(t.predishniyat)}</span><span class="suma">Разлика</span><span class="suma">Брой</span>
        </div>
        ${t.redove.map(redNaMesetsa).join('')}
      </div>
      <p class="drebno">Сравнява се с <b translate="no">${ekraniraj(t.predishniyat)}</b>.
      Разликата се <b>СМЯТА</b> и не се записва — записана разлика се разминава със своите две числа
      при първата поправка. „От нула на нещо" НЯМА процент: липсата се казва, вместо да се
      запълни с измислено число.</p>
      <p class="drebno">${
        t.nared
          ? 'Четирите сверки затварят — месецът е цял и агентът го вижда цял.'
          : '<b>ВНИМАНИЕ:</b> сверка НЕ затваря. Агентът ще получи месеца ЗАЕДНО с това предупреждение — анализ върху непълен месец звучи също толкова убедено.'
      }</p>
      <details>
        <summary>Дословният текст, който получава моделът</summary>
        <pre id="mesetsat-tekst" translate="no">${ekraniraj(kamTekst(t))}</pre>
      </details>
      <p class="drebno"><b>Какво НЕ излиза:</b> имена на наематели и доставчици.
      За да се прецени посока, редът на раздела стига; имената нямат работа на чужд сървър
      (ADR-029). Агентът чете, смята и <b>предлага</b> — записва човекът (правило 18).</p>
    </section>`;
}

function redNaMesetsa(r: RedNaMesetsa): string {
  const d = delta(r);
  const p = deltaProtsentiDeseti(r);
  return `
    <div class="red mesetsat" data-razdel="${r.razdel}" translate="no">
      <span><span class="znachka tiha">${IMENA_NA_RAZDELITE[r.razdel]}</span></span>
      <span class="kletka"><b>${ekraniraj(r.ime)}</b><span>${ekraniraj(r.kakvo)}</span></span>
      <span class="suma" data-st="${r.stoynost_st}">${pishi(r.stoynost_st)}</span>
      <span class="suma" data-st="${r.predi_st}">${pishi(r.predi_st)}</span>
      <span class="suma" data-delta-st="${d}">${d > 0 ? '+' : ''}${pishi(d)}${
        p === undefined ? '' : `<span class="drebno"> ${p > 0 ? '+' : ''}${(p / 10).toFixed(1)}%</span>`
      }</span>
      <span class="suma">${r.broy}</span>
    </div>`;
}

function blokDelata(o: Ogledalo, dnes: string): string {
  const dela = podredi(zhivite([...o.dela.values()]), dnes);
  if (dela.length === 0) return '';
  const r = reshetka(dela, 'mesets', dnes);
  const parvata = r.koloni[0]!;
  const poslednata = r.koloni[r.koloni.length - 1]!;
  // КОПИЕТО в Сметки чете БЕЗ разбивка: разрезът е лост на Управление, а тук
  // таблицата е за сверка (И92 т.4). Един ред влиза, един ред излиза.
  const sumi = obobshteniRedove(r.koloni, sumiZaObhvat(o, parvata.ot, poslednata.do));
  // И95: „с Приходи и Разходи вкарани… с опция да ги изключваш пускаш и да
  // създаваш както като в Управление." Цифрите носят ключ; формата е СЪЩАТА.
  return `
    <section data-sektsiya="smetki-dela">
      <div class="dyalglava">
        <h2>Делата · копието от Управление</h2>
        <span>същата таблица · със същата форма за ново дело (И95)</span>
      </div>
      <label class="vazm">
        <input type="checkbox" id="klyuch-tsifrite"${sTsifrite ? ' checked' : ''}>
        <span class="vazm-tyalo"><b>Приходите и Разходите в решетката</b>
        <span>скриването пипа екрана и нищо друго — сборовете ПАК се смятат (правило 23)</span></span>
      </label>
      <div class="lostove" data-izgled-na-delata>
        <button type="button" id="smetki-kam-diagrama" class="vtorichen"${
          mozheDaSeSkrie(vizhdanoTuk, 'diagrama') ? '' : ' disabled'
        }>${ekraniraj(dumataNaButona(vizhdanoTuk, 'diagrama'))}</button>
        <button type="button" id="smetki-kam-tablitsa" class="vtorichen"${
          mozheDaSeSkrie(vizhdanoTuk, 'tablitsa') ? '' : ' disabled'
        }>${ekraniraj(dumataNaButona(vizhdanoTuk, 'tablitsa'))}</button>
        ${
          mozheDaSeSkrie(vizhdanoTuk, 'tablitsa') && mozheDaSeSkrie(vizhdanoTuk, 'diagrama')
            ? ''
            : `<span class="drebno" data-posleden-izgled>${ekraniraj(
                prevkluchi(vizhdanoTuk, vizhdanoTuk.tablitsa ? 'tablitsa' : 'diagrama').otkaz,
              )}</span>`
        }
      </div>
    </section>
    ${vizhdanoTuk.diagrama ? `<div data-sektsiya="smetki-dela-diagrama" data-smetki-gant="diagrama">${narisuvayDiagrama(dela, r, dnes)}</div>` : ''}
    ${vizhdanoTuk.tablitsa ? `<div data-sektsiya="smetki-dela-tablitsa" data-smetki-gant="tablitsa">${tablitsataSOcveteniPoleta(dela, r, sumi, dnes, false, sTsifrite)}</div>` : ''}
    ${formaDelo(o, dnes)}`;
}

function poleNaOtcheta(p: Pole): string {
  return `
    <article class="pole-otchet" data-pole="${ekraniraj(p.klyuch)}">
      <div class="glavata">
        <span class="etiket">${ekraniraj(p.ime)}</span>
        <span class="chislo" translate="no">${pishi(p.sbor_st)}</span>
      </div>
      <p class="kakvo">${ekraniraj(p.kakvo)}</p>
      <ul class="formula" translate="no">
        ${p.sastavki
          .map(
            (c) => `<li>
              <span class="ime">${ekraniraj(c.ime)}</span>
              <span class="suma${c.suma_st < 0 ? ' duljimo' : ''}" data-st="${c.suma_st}">${pishi(c.suma_st)}</span>
              <span class="otkade">${ekraniraj(c.otkade)}</span>
            </li>`,
          )
          .join('')}
      </ul>
      ${
        p.chaka.length === 0
          ? '<p class="drebno palno">Числото е пълно — нищо не липсва.</p>'
          : `<p class="drebno chaka">Чака: ${p.chaka.map(ekraniraj).join(' · ')}</p>`
      }
    </article>`;
}

function formaRazhod(o: Ogledalo, mesets: string): string {
  // Речникът се пълни при РИСУВАНЕ (тук е Огледалото) и се чете при ЗАКАЧАНЕ.
  zapomniRechnitsite(
    RECHNIK_RAZHOD,
    new Map([
      ['dostavchik', menyutoNaRazhodite(o, 'dostavchik', 'Доставчик')],
      ['opis', menyutoNaRazhodite(o, 'opis', 'За какво')],
    ]),
  );
  return `
    <section data-sektsiya="smetki-nov-razhod" class="karta">
      <div class="dyalglava"><h2>Нов разход</h2><span>сумата е обща цена с ДДС — както при наема</span></div>
      <form id="forma-razhod">
        <div class="poleta">
          ${poleSIzbor({
            id: 'razhod-potok',
            ime: 'potok',
            etiket: 'Поток',
            spisak: 'potok',
            zadalzhitelno: true,
            opcii: potototsiNaRazhod()
              .map((p) => `<option value="${ekraniraj(p.klyuch)}">${ekraniraj(p.ime)}</option>`)
              .join(''),
          })}
          ${poleSIzbor({
            id: 'razhod-sektor',
            ime: 'sektor',
            etiket: 'Сектор — важи за Фактури',
            spisak: 'sektor',
            zadalzhitelno: true,
            opcii: sektoriNaRazhod()
              .filter((a) => a.stavka > 0)
              .map((a) => `<option value="${ekraniraj(a.klyuch)}">${ekraniraj(a.sektor)} · ${a.stavka}%</option>`)
              .join(''),
          })}
          ${poleSIzbor({
            id: 'razhod-stavka',
            ime: 'stavka',
            etiket: 'Ставка на ТАЗИ фактура',
            spisak: 'stavka',
            zadalzhitelno: true,
            opcii: optsiiNaStavkata(),
          })}
          ${
            /**
             * ДОСТАВЧИКЪТ И „ЗА КАКВО" · двете живи менюта на разхода (ADR-042).
             *
             * Дотук и двете бяха голи текстови полета. Един и същ доставчик се
             * изписваше по три начина в три месеца, а „ток" и „Ток" ставаха два
             * различни разхода в очите на всеки изглед, който групира по име.
             *
             * И двете ОПИСВАТ — системата смята по ПОТОКА и по СЕКТОРА, не по
             * името на доставчика — значи растат свободно от полето.
             */
            poleSMenyu({
              id: 'razhod-dostavchik',
              ime: 'dostavchik',
              etiket: 'Доставчик или получател',
              menyu: menyutoNaRazhodite(o, 'dostavchik', 'Доставчик'),
              zadalzhitelno: true,
              mestodarzhatel: 'напр. Материали ООД',
              pod: '<p class="kazva-problem" id="kazva-dostavchik" data-spira="ne"></p>',
            })
          }
          ${poleSMenyu({
            id: 'razhod-opis',
            ime: 'opis',
            etiket: 'За какво',
            menyu: menyutoNaRazhodite(o, 'opis', 'За какво'),
            zadalzhitelno: true,
            mestodarzhatel: 'напр. цимент',
          })}
          <div class="pole">
            <label for="razhod-suma">Обща сума, € — с ДДС</label>
            <input translate="no" id="razhod-suma" name="suma" required inputmode="decimal" placeholder="600,00" autocomplete="off">
          </div>
          ${poleSIzbor({
            id: 'razhod-nachin',
            ime: 'nachin',
            etiket: 'Платено',
            spisak: 'nachin',
            opcii: optsiiNaNachina(),
          })}
          <div class="pole">
            <label for="razhod-data">Дата</label>
            <input translate="no" id="razhod-data" name="data" type="date" value="${ekraniraj(mesets)}-01" required>
          </div>
          <div class="pole">
            <label for="razhod-dokument">Документ (по избор)</label>
            <input translate="no" id="razhod-dokument" name="dokument" placeholder="номер на фактура" autocomplete="off">
          </div>
          ${poleZaPrepiska('razhod-prepiska', o.prepiski)}
        </div>
        ${legendata()}
        <p class="greshka" id="greshka-razhod"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши разхода</button>
          <p class="drebno">Записва се като <b>РазходЗаписан</b>. Заплатите и кредитите нямат ДДС — секторът им се слага сам. При <b>Фактури</b> ставката е <b>на тази фактура</b>: секторът само предлага, а нощувките на 9% и необлагаемата доставка се въвеждат както са.</p>
        </div>
      </form>
    </section>`;
}

/**
 * СТОРНИРАНОТО СЕ ВИЖДА · „Сиво + зачертано + малък знак ★" (резен 27 · ADR-087).
 *
 * Журналът пази и записа, и сторното му завинаги, но Огледалото ПРЕСКАЧА
 * погасеното — и на екрана редът просто изчезваше. Човек не можеше да различи
 * „сторнирано" от „никога не е било записано".
 *
 * ═══ ТЕ НЕ СА В СБОРА, И ТОВА Е СТРУКТУРНО ═══
 *
 * Сборът чете от `o.razhodi`, който НЕ ги съдържа. Тоест инвариантът не се
 * пази с дисциплина, а с устройство: няма как да влязат, дори да се опита.
 *
 * ═══ ПОКАЗВАТ СЕ ПО ПОДРАЗБИРАНЕ ═══
 *
 * Негово е „сиво + зачертано", не „скрито". Скриването е ЛИЧНО и минава през
 * паметта на екрана — нула събития (ADR-022 · правило 23).
 */
function blokNaPogasenite(o: Ogledalo, mesets: string): string {
  const nashite = o.pogasenite.filter(
    // ПО ДАТАТА НА ЗАПИСА, не по времето на записването · разход с дата 12.11,
    // въведен днес, принадлежи на НОЕМВРИ (ADR-087 §7).
    (x) => x.vid === 'razhod' && x.data.slice(0, 7) === mesets,
  );
  const pokazani = chetiEkranno('razhodi.pogasenite', true);
  if (nashite.length === 0) {
    return `<p class="drebno" data-pogaseni="0">Нито един сторниран разход за този
    месец. Нулата се КАЗВА — иначе „няма сторнирани" е неразличимо от „не е
    гледано".</p>`;
  }
  return `
    <div class="deystviya" data-sektsiya="razhodi-pogasenite" data-pogaseni="${nashite.length}">
      <button type="button" class="vtorichen malak" id="pogaseni-prevkl">${
        pokazani ? 'Скрий сторнираните' : 'Покажи сторнираните'
      }</button>
      <span class="drebno">${nashite.length} ${
        nashite.length === 1 ? 'сторниран ред' : 'сторнирани реда'
      } · НЕ влизат в сбора</span>
    </div>
    ${
      pokazani
        ? `<div class="tablitsa" data-tablitsa="razhodi-pogaseni">
      ${nashite.map(redNaPogasen).join('')}
    </div>`
        : ''
    }`;
}

/** Един зачертан ред · трите носителя стоят в CSS-а, думите — тук. */
function redNaPogasen(x: PogasenZapis): string {
  return `<div class="red razhod pogasen" translate="no" data-pogasen="${x.seq}">
    <span class="kletka"><b>${ekraniraj(x.opis === '' ? x.type : x.opis)}</b><span>★ сторниран${
      x.storniranOt > 0 ? ` с № ${x.storniranOt}` : ''
    }${x.prichina === '' ? '' : ` · „${ekraniraj(x.prichina)}"`}</span></span>
    <span class="suma">${x.suma_st === undefined ? '' : pishi(x.suma_st)}</span>
    <span>${ekraniraj(x.data)}</span>
    <span>${ekraniraj(x.actor)}</span>
    <span></span>
    <span></span>
  </div>`;
}

function redNaRazhod(r: Razhod, o: Ogledalo): string {
  const a = akumulator(r.sektor);
  // Ставката е НА РЕДА; секторът само подсказва, когато редът мълчи.
  const stavka = stavkaNaReda(r.sektor, r.stavka);
  const razbivka = ddsOtObshta(r.suma_st, stavka);
  return `
    <div class="red razhod" translate="no">
      <span class="kletka"><b>${ekraniraj(r.dostavchik)}</b><span>${ekraniraj(r.opis)} · ${ekraniraj(r.data)}${
        r.dokument ? ` · док. ${ekraniraj(r.dokument)}` : ''
      } · ${ekraniraj(r.nachin)}${
        // Изгубеното закачане се КАЗВА, не се преглъща (ADR-101): преписка,
        // която Огледалото вече не намира, стои като „преп. ?".
        r.prepId === undefined
          ? ''
          : ` · преп. ${ekraniraj(o.prepiski.get(r.prepId)?.kontakt ?? '?')}`
      }</span></span>
      <span class="kletka"><span>${ekraniraj(potok(r.potok)?.ime ?? r.potok)}</span></span>
      <span class="kletka"><span>${ekraniraj(a.sektor)} · ${stavka}%${
        r.stavka === undefined ? '' : ' · от реда'
      }</span></span>
      <span class="suma duljimo" data-st="${razbivka.obshta_st}">${kakvoPishe(razbivka.obshta_st)}</span>
      <span class="suma" data-st="${razbivka.dds_st}">${kakvoPishe(razbivka.dds_st)}</span>
      <span class="butoni">
        ${butonSIkona({ ikona: 'storno', tekst: 'Сторно', title: 'Сторно · добавя ред, не трие', danni: { 'storno-razhod': String(r.seq) } })}
        ${butonNaDokumentite('razhod', r.id, broyDokumenti(o, 'razhod', r.id))}
        ${butonIstoriya('razhod', r.id)}
      </span>
    </div>`;
}

/** Стотинките се показват в евро; бройките — както са. */
function merka(belezhka: string | undefined, chislo: number): string {
  return belezhka === MERKA.pari ? pishi(chislo) : String(chislo);
}

/** `data-st` за статус-лентата — само когато мярката наистина е пари.
 *  Бройка без белега не влиза в сбор: евро и бройки не се смесват. */
function vStotinki(belezhka: string | undefined, chislo: number): string {
  return belezhka === MERKA.pari ? ` data-st="${chislo}"` : '';
}

/**
 * ТРИТЕ ЧИСЛА НА ДДС: изчислено ↔ декларирано ↔ платено.
 * Разликата СВЕТИ, не се замазва — думата на собственика.
 * Подадената справка ЗАКЛЮЧВА периода; сторно на справката го отключва.
 */
function blokNaSpravkata(o: Ogledalo, mesets: string, izchisleno_st: number): string {
  const spravka = o.spravki.get(mesets);
  const plateno_st = platenoDDSZaPerioda(o, mesets);
  const zakluchen = eZamrazen(o, mesets);

  const razlikaDeklarirano = spravka ? spravka.deklarirano_st - izchisleno_st : 0;
  const razlikaPlateno = spravka ? plateno_st - spravka.deklarirano_st : 0;

  return `
    <section data-sektsiya="smetki-spravka" class="karta${zakluchen ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>Справка и внасяне</h2>
        <span>${
          zakluchen
            ? `периодът е ЗАКЛЮЧЕН от справка от ${ekraniraj(spravka!.data)} — поправка само през сверена промяна`
            : 'подадената справка заключва месеца'
        }</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Изчислено в Баланс</span>
          <span class="chislo" translate="no">${pishi(izchisleno_st)}</span>
          <span class="pod">изход − вход, от Журнала</span>
        </div>
        <div class="plochka${spravka && razlikaDeklarirano !== 0 ? ' trevoga' : ''}">
          <span class="etiket">Декларирано</span>
          <span class="chislo" translate="no">${spravka ? pishi(spravka.deklarirano_st) : '—'}</span>
          <span class="pod">${
            spravka
              ? razlikaDeklarirano === 0
                ? 'съвпада с изчисленото'
                : `РАЗМИНАВАНЕ ${pishi(razlikaDeklarirano)} — провери`
              : 'още няма справка'
          }</span>
        </div>
        <div class="plochka${spravka && razlikaPlateno !== 0 ? ' trevoga' : ''}">
          <span class="etiket">Платено</span>
          <span class="chislo" translate="no">${pishi(plateno_st)}</span>
          <span class="pod">${
            !spravka
              ? 'въвежда се от платежното'
              : razlikaPlateno === 0
                ? 'внесено докрай'
                : razlikaPlateno < 0
                  ? `остават ${pishi(-razlikaPlateno)}`
                  : `надвнесени ${pishi(razlikaPlateno)}`
          }</span>
        </div>
      </div>

      ${
        spravka
          ? `<form id="forma-dds-plateno">
        <div class="poleta">
          <div class="pole">
            <label for="dds-suma">Внесено, €</label>
            <input translate="no" id="dds-suma" name="suma" required inputmode="decimal" placeholder="200,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="dds-data">Дата на плащането</label>
            <input translate="no" id="dds-data" name="data" type="date" required>
          </div>
          ${poleSIzbor({
            id: 'dds-nachin',
            ime: 'nachin',
            etiket: 'Начин',
            spisak: 'nachin',
            opcii: optsiiNaNachina(),
          })}
        </div>
        <p class="greshka" id="greshka-dds"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши внесеното</button>
          <button type="button" class="vtorichen" data-otkluchi="${spravka.seq}">Отключи периода (сторно на справката)</button>
          <p class="drebno">Внесеното се въвежда НА РЪКА от платежното — може на части. Разликата с декларираното свети горе.</p>
        </div>
      </form>`
          : `<form id="forma-spravka">
        <div class="poleta">
          <div class="pole">
            <label for="spravka-dds">Деклариран ДДС, €</label>
            <input translate="no" id="spravka-dds" name="dds" required inputmode="decimal"
              value="${pishiVPole(izchisleno_st)}" autocomplete="off">
          </div>
          <div class="pole">
            <label for="spravka-data">Дата на подаване</label>
            <input translate="no" id="spravka-data" name="data" type="date" required>
          </div>
          <div class="pole">
            <label for="spravka-belezhka">Бележка (по избор)</label>
            <input translate="no" id="spravka-belezhka" name="belezhka" placeholder="напр. вх. номер" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-spravka"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Подай справката — заключи ${ekraniraj(mesets)}</button>
          <p class="drebno">Предложеното е изчисленото, но се редактира — записва се каквото РЕАЛНО е декларирано, а разликата свети. След подаване вземания, плащания и разходи за месеца се отказват; поправка = сверена промяна от таблица или сторно на справката.</p>
        </div>
      </form>`
      }
    </section>`;
}

/**
 * ТРЕТИЯТ ЪГЪЛ · „виждам разлика — КЪДЕ е тя".
 *
 * Дотук екранът казваше КОЛКО: изчислено ↔ декларирано ↔ платено. Три числа,
 * и когато не съвпаднат, човек тръгва да рови на ръка.
 *
 * Тук е другият въпрос — неговият: „когато се прочетат извлеченията… веднага
 * се хваща липсата и се намира по извлеченията или липсата на кешови фактури."
 * Затова редовете долу не са число, а СПИСЪК: кое движение няма фактура, коя
 * фактура няма движение.
 *
 * Разликата се показва и когато е НУЛА (правило 7): проверената нула е нещо
 * различно от нулата, за която никой не е питал.
 */
function blokNaSverkataDDS(r: RezultatSverka): string {
  const bezDvizheniya =
    r.dds_ot_fakturi_st === 0 && r.dds_ot_izvlecheniya_st === 0 && r.nesvarsheni.length === 0;

  return `
    <section data-sektsiya="smetki-sverka-dds" class="karta${r.svereno || bezDvizheniya ? '' : ' izbrana'}">
      <div class="dyalglava">
        <h2>Сверка на ДДС</h2>
        <span>фактури ↔ извлечения ↔ внесено</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">ДДС от фактури</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_ot_fakturi_st)}</span>
          <span class="pod">каквото е въведено на ръка</span>
        </div>
        <div class="plochka">
          <span class="etiket">ДДС от извлечения</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_ot_izvlecheniya_st)}</span>
          <span class="pod">каквото е прочетено от таблица</span>
        </div>
        <div class="plochka">
          <span class="etiket">Внесено</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_vneseno_st)}</span>
          <span class="pod">от платежното, на ръка</span>
        </div>
        <div class="plochka${r.razlika_st === 0 ? '' : ' trevoga'}">
          <span class="etiket">Разлика</span>
          <span class="chislo" translate="no">${kakvoPishe(r.razlika_st)}</span>
          <span class="pod">${
            bezDvizheniya
              ? 'няма движения за този месец'
              : r.razlika_st === 0
                ? 'проверена нула — не е „не е питано"'
                : 'виж КЪДЕ е, долу'
          }</span>
        </div>
      </div>

      <p class="drebno">${ekraniraj(bezDvizheniya ? 'Още няма нито фактури, нито прочетени извлечения за този месец.' : sDumi(r))}</p>

      ${
        r.nesvarsheni.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava nesvarshen">
          <span>Какво липсва</span><span>Движение</span><span>Дата</span>
          <span class="suma">Сума</span>
        </div>
        ${r.nesvarsheni
          .map(
            (n) => `<div class="red nesvarshen" translate="no">
            <span><span class="znachka trevoga">${
              n.prichina === 'lipsva-faktura' ? 'липсва фактура' : 'липсват пари'
            }</span></span>
            <span class="kletka"><b>${ekraniraj(n.dvizhenie.opisanie)}</b><span>${
              n.dvizhenie.dokument
                ? `док. ${ekraniraj(n.dvizhenie.dokument)}`
                : 'БЕЗ номер на документ — затова не се сдвоява'
            }</span></span>
            <span>${ekraniraj(n.dvizhenie.data)}</span>
            <span class="suma duljimo" data-st="${n.dvizhenie.suma_st}">${kakvoPishe(n.dvizhenie.suma_st)}</span>
          </div>`,
          )
          .join('')}
      </div>
      <p class="drebno">Сдвоява се по <b>номер на документ</b>, не по сума и дата: две фактури за 1200 € в един ден се случват, а два документа с един номер — не. Движение без номер не се преглъща, а стои тук.</p>`
      }
    </section>`;
}

function redNaSmetka(r: RedSmetka): string {
  return `
    <div class="red smetka" translate="no" data-potok="${ekraniraj(r.klyuch)}">
      <span class="kletka"><b>${ekraniraj(r.ime)}</b><span>${ekraniraj(r.belezhka)}</span></span>
      <span><span class="znachka ${r.posoka === 'приход' ? 'dobre' : 'tiha'}">${r.posoka}</span></span>
      <span>${r.broi}</span>
      <span class="suma${r.suma_st === 0 ? '' : r.posoka === 'приход' ? ' plateno' : ' duljimo'}" data-st="${r.suma_st}">${pishi(r.suma_st)}</span>
    </div>`;
}

function redNaDDS(r: RedDDS): string {
  return `
    <div class="red dds" translate="no">
      <span><span class="znachka ${r.strana === 'изход' ? 'dobre' : 'tiha'}">${r.strana}</span></span>
      <span class="kletka"><b>${ekraniraj(r.akumulator.sektor)}</b><span>${r.broi} ${
        r.strana === 'изход'
          ? r.broi === 1
            ? 'вземане'
            : 'вземания'
          : r.broi === 1
            ? 'разход'
            : 'разхода'
      } · ${pishi(r.obshta_st)} с ДДС</span></span>
      <span>${r.stavka}%</span>
      <span class="suma" data-st="${r.osnova_st}">${pishi(r.osnova_st)}</span>
      <span class="suma" data-st="${r.dds_st}">${pishi(r.dds_st)}</span>
    </div>`;
}

function kalkulator(): string {
  const redove = smyatane.map((r) => ({ ...r, razbivka: ddsOtObshta(r.obshta_st, r.stavka) }));
  const sborOsnova = redove.reduce((s, r) => s + r.razbivka.osnova_st, 0);
  const sborDDS = redove.reduce((s, r) => s + r.razbivka.dds_st, 0);
  const sborObshta = redove.reduce((s, r) => s + r.razbivka.obshta_st, 0);

  return `
    <section data-sektsiya="smetki-kalkulator" class="karta">
      <div class="dyalglava"><h2>Калкулатор</h2><span>обща цена → основа и ДДС</span></div>
      <form id="forma-smyatane">
        <div class="poleta">
          <div class="pole">
            <label for="smyatane-opis">За какво (по избор)</label>
            <input translate="no" id="smyatane-opis" name="opis" placeholder="напр. фактура 1042" autocomplete="off">
          </div>
          <div class="pole">
            <label for="smyatane-suma">Обща цена, € — с ДДС</label>
            <input translate="no" id="smyatane-suma" name="suma" required inputmode="decimal" placeholder="1200,00" autocomplete="off">
          </div>
          ${poleSIzbor({
            id: 'smyatane-stavka',
            ime: 'stavka',
            etiket: 'Ставка',
            spisak: 'stavka',
            zadalzhitelno: true,
            opcii: optsiiNaStavkata(),
          })}
        </div>
        <p class="greshka" id="greshka-smyatane"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Добави ред</button>
          ${smyatane.length ? '<button type="button" class="vtorichen" id="izchisti-smyatane">Изчисти</button>' : ''}
          <p class="drebno">Само смятане — нищо оттук не влиза в Журнала.</p>
        </div>
      </form>

      ${
        redove.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava smyatane">
          <span>Ред</span><span>Ставка</span>
          <span class="suma">Основа</span><span class="suma">ДДС</span><span class="suma">Общо</span>
        </div>
        ${redove
          .map(
            (r, i) => `
          <div class="red smyatane" translate="no">
            <span class="kletka"><b>${ekraniraj(r.opis || `ред ${i + 1}`)}</b></span>
            <span>${r.stavka}%</span>
            <span class="suma" data-st="${r.razbivka.osnova_st}">${kakvoPishe(r.razbivka.osnova_st)}</span>
            <span class="suma" data-st="${r.razbivka.dds_st}">${kakvoPishe(r.razbivka.dds_st)}</span>
            <span class="suma" data-st="${r.razbivka.obshta_st}">${kakvoPishe(r.razbivka.obshta_st)}</span>
          </div>`,
          )
          .join('')}
        <div class="red smyatane sbor" translate="no">
          <span><b>Сбор</b></span><span></span>
          <span class="suma" data-st="${sborOsnova}">${pishi(sborOsnova)}</span>
          <span class="suma" data-st="${sborDDS}">${pishi(sborDDS)}</span>
          <span class="suma" data-st="${sborObshta}">${pishi(sborObshta)}</span>
        </div>
      </div>`
      }
    </section>`;
}

export function zakachiSmetki(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  // Копието на решетката носи същите data-ширини като в Управление.
  slozhiShirinite(koren);

  zakachiKoefitsientite(koren, k, prerisuvay);
  zakachiSpravkite(koren, prerisuvay);
  // СВОИТЕ ПОЛЕТА С ФОРМУЛА · „с формули между всички таблици" (резен 42).
  // Месецът е СЪЩИЯТ като на Сметки: изворите се смятат за конкретен период,
  // и поле, проверено срещу друг месец, не е проверено.
  zakachiPoletata(koren, k, period ?? new Date().toISOString().slice(0, 7), prerisuvay);
  // КРЕДИТИТЕ · таблицата, планът по дати и плащането (резен 19 · ADR-079).
  zakachiKreditite(koren, k, prerisuvay);
  // ЗАПЛАТИТЕ · седмицата, кешът и следата (резен 20 · ADR-080).
  zakachiZaplatite(koren, k, prerisuvay);
  // ТАБЛИЦА ОТ ФАЙЛ · експериментът с Фактури (резен 21 · ADR-081).
  zakachiTablitsaOtFayl(koren, k, prerisuvay);
  // ЗАКОНЪТ ЗА МЕНЮТАТА (И97 · ADR-040 · ADR-042) · доставчикът и „за какво".
  zakachiMenyuta(koren, rechnitsite(RECHNIK_RAZHOD));

  // ЦВЕТОВЕТЕ ПРИ ВЪВЕЖДАНЕ (И96 т.1 · т.9) · полето свети, ДОКАТО се пише.
  // Доставчикът е текстово поле, което човек пише на ръка и в което най-често
  // влиза чужд знак или залепен невидим — затова е първото закачено.
  const poleDostavchik = koren.querySelector<HTMLInputElement>('#razhod-dostavchik');
  const kazvaDostavchik = koren.querySelector<HTMLElement>('#kazva-dostavchik');
  if (poleDostavchik && kazvaDostavchik) {
    zakachiPole(poleDostavchik, { azbuka: 'kirilitsa' }, kazvaDostavchik);
  }

  // И95 · същата форма за дело работи и оттук — един механизъм, два екрана.
  zakachiFormataNaDelo(koren, k, prerisuvay);
  // ── СВЕРКАТА С ИЗВЛЕЧЕНИЕТО (резен 17в · ADR-074) ───────────────────────
  //
  // Бутонът само ОТВАРЯ прозорчето: файлът се избира поотделно, от човек.
  // Нищо не се обхожда и нищо не тръгва навън.
  koren.querySelector<HTMLButtonElement>('#izbor-izvlechenie')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#fayl-izvlechenie')?.click();
  });

  koren
    .querySelector<HTMLInputElement>('#fayl-izvlechenie')
    ?.addEventListener('change', async (e) => {
      const vhod = e.target as HTMLInputElement;
      const faylove = [...(vhod.files ?? [])];
      if (faylove.length === 0) return;
      try {
        const prochetenoto = await prochetiIzvlecheniyata(faylove);
        const slyata = prochetenoto.slyata;
        const o = await k.deystviya.ogledalo();
        sverkiteNaIzvlechenieto = sverkaPoMesetsi({
          zapisiNaMesetsa: (m) => zapisiteNaKnigata(o, m),
          izvlechenie: slyata.redove,
          ot: slyata.ot,
          do: slyata.do,
        });
        // КОТВАТА (резен 71): крайното салдо на всеки месец е салдото СЛЕД
        // последния му ред — банката го е написала, ние само го пренасяме.
        krayniteSalda = new Map();
        for (const red of [...slyata.redove].sort((a, b) => a.data.localeCompare(b.data))) {
          krayniteSalda.set(red.data.slice(0, 7), red.saldoSled_st);
        }
        // НОВ ключ на ново четене · същият ключ би върнал СТАРАТА сверка при
        // втори файл (правило 20: `opId` носи ДЕЙСТВИЕТО).
        opIdSverkaIzvlechenie = crypto.randomUUID();
        greshkaIzvlechenie = '';
        izvoriteNaIzvlechenieto = prochetenoto.otpechatatsi;
        propusnatiOtIzvlechenieto = prochetenoto.propusnati;
      } catch (err) {
        sverkiteNaIzvlechenieto = [];
        greshkaIzvlechenie = dumiZaGreshka(err);
      }
      vhod.value = '';
      await prerisuvay();
    });

  koren
    .querySelector<HTMLButtonElement>('#zapishi-sverka-izvlechenie')
    ?.addEventListener('click', async () => {
      const r = sverkataNaPokazaniyaMesets();
      if (!r) return;
      const s = sverkataNaIzvlechenieto(r, new Date().toISOString());
      try {
        await k.deystviya.zapishiSverka(
          `sverka-izvlechenie-${r.period}-${opIdSverkaIzvlechenie}`,
          {
            buton: 'Сверка с извлечението',
            period: r.period,
            vhod_st: r.vhod_st,
            izhod_st: r.izhod_st,
            razlika_st: s.razlika,
            izvori: izvoriteNaIzvlechenieto,
            propusnati: propusnatiOtIzvlechenieto,
            // Котвата на банката · крайното салдо от извлечението (И124 т.9).
            ...(krayniteSalda.has(r.period) ? { saldoKray_st: krayniteSalda.get(r.period)! } : {}),
          },
          { opId: `sverka-izvlechenie:${opIdSverkaIzvlechenie}` },
        );
        greshkaIzvlechenie = '';
        k.vest('dobre', `Сверката е записана · разлика ${pishi(s.razlika)}`);
      } catch (err) {
        greshkaIzvlechenie = dumiZaGreshka(err);
      }
      await prerisuvay();
    });

  // ПРЕДЛОЖЕНАТА ВНОСКА (резен 73) · натискането Е записът на човека.
  for (const buton of koren.querySelectorAll<HTMLButtonElement>('[data-zapishi-vnoska]')) {
    buton.addEventListener('click', async () => {
      const d = buton.dataset;
      try {
        await k.deystviya.zapishiPlashtanePoKredit(
          {
            plashtaneId: `PL:${crypto.randomUUID()}`,
            kreditId: d['kreditId'] ?? '',
            data: d['data'] ?? '',
            suma_st: Number(d['suma'] ?? 0),
            glavnitsa_st: Number(d['glavnitsa'] ?? 0),
            lihva_st: Number(d['lihva'] ?? 0),
            taksa_st: Number(d['taksa'] ?? 0),
            belezhka: 'предложено от извлечението · записано от човек',
          },
          { opId: `vnoska-ot-izvlechenie:${crypto.randomUUID()}` },
        );
        k.vest('dobre', 'Вноската е записана · остатъкът падна с главницата.');
      } catch (err) {
        greshkaIzvlechenie = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#zabravi-izvlechenie')?.addEventListener('click', async () => {
    // МАХА се от ЕКРАНА, не от Журнала: записаната сверка си остава записана.
    sverkiteNaIzvlechenieto = [];
    greshkaIzvlechenie = '';
    await prerisuvay();
  });

  // ФИЛТЪРЪТ ПО ДОГОВОР · ПОГЛЕД, не решение: нула събития (правило 23).
  koren
    .querySelector<HTMLSelectElement>('#izvlechenie-dogovor')
    ?.addEventListener('change', async (e) => {
      dogovorNaSverkata = (e.target as HTMLSelectElement).value;
      zapomniEkranno('izvlechenie.dogovor', dogovorNaSverkata);
      await prerisuvay();
    });

  koren.querySelector<HTMLInputElement>('#klyuch-tsifrite')?.addEventListener('change', async (e) => {
    sTsifrite = (e.target as HTMLInputElement).checked;
    zapomniEkranno('smetki.tsifrite', sTsifrite);
    await prerisuvay();
  });

  // ДВАТА БУТОНА · същото решение като в Управление (`prevkluchi`), друга памет.
  const skriyTuk = (koe: 'tablitsa' | 'diagrama') => async () => {
    const r = prevkluchi(vizhdanoTuk, koe);
    if (r.otkaz !== '') return;
    vizhdanoTuk = r.sled;
    zapomniEkranno('smetki.dela.tablitsa', vizhdanoTuk.tablitsa);
    zapomniEkranno('smetki.dela.diagrama', vizhdanoTuk.diagrama);
    await prerisuvay();
  };
  koren.querySelector<HTMLButtonElement>('#smetki-kam-diagrama')
    ?.addEventListener('click', skriyTuk('diagrama'));
  koren.querySelector<HTMLButtonElement>('#smetki-kam-tablitsa')
    ?.addEventListener('click', skriyTuk('tablitsa'));

  // СКРИВАНЕТО НА СТОРНИРАНИТЕ Е ЛИЧНО · памет на екрана, нула събития.
  koren.querySelector<HTMLButtonElement>('#pogaseni-prevkl')?.addEventListener('click', async () => {
    zapomniEkranno('razhodi.pogasenite', !chetiEkranno('razhodi.pogasenite', true));
    await prerisuvay();
  });

  const formaPeriod = koren.querySelector<HTMLFormElement>('#forma-period');
  formaPeriod?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(formaPeriod);
    const noviyat = String(d.get('period'));
    const noviyatKray = String(d.get('periodDo') ?? '');
    if (noviyatKray !== '' && noviyatKray < noviyat) {
      // Вестта се вижда при СЛЕДВАЩОТО рисуване — затова отказът рисува,
      // без да сменя периода: екранът остава на стария обхват и КАЗВА защо.
      k.vest('zle', `Краят „${noviyatKray}" е преди началото „${noviyat}" — обхватът върви напред.`);
      await prerisuvay();
      return;
    }
    period = noviyat;
    periodDo = noviyatKray === '' || noviyatKray === noviyat ? null : noviyatKray;
    zapomniEkranno('smetki.period', period);
    zapomniEkranno('smetki.periodDo', periodDo);
    await prerisuvay();
  });

  const formaSmyatane = koren.querySelector<HTMLFormElement>('#forma-smyatane');
  formaSmyatane?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-smyatane')!;
    greshka.textContent = '';
    const danni = new FormData(formaSmyatane);

    let obshta_st: number;
    try {
      obshta_st = otLeva(String(danni.get('suma')));
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
      return;
    }

    smyatane = [
      ...smyatane,
      {
        opis: String(danni.get('opis') ?? '').trim(),
        obshta_st,
        stavka: Number(danni.get('stavka')),
      },
    ];
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#izchisti-smyatane')?.addEventListener('click', async () => {
    smyatane = [];
    await prerisuvay();
  });

  // ── салдото на един джоб ─────────────────────────────────────────────────
  const formaNaSaldo = koren.querySelector<HTMLFormElement>('#forma-saldo');
  formaNaSaldo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    greshkaSaldo = '';
    const izhod = koren.querySelector<HTMLElement>('#greshka-saldo')!;
    izhod.textContent = '';
    const danni = new FormData(formaNaSaldo);
    const buton = formaNaSaldo.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let saldo_st: number;
    let ot: string;
    try {
      saldo_st = otLeva(String(danni.get('suma')));
      ot = otData(String(danni.get('ot') ?? ''), 'Датата, от която важи салдото');
    } catch (err) {
      izhod.textContent =
        dumiZaGreshka(err);
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.zapishiSaldo(
        // Формата пише САМО трезора (И124 т.9) — банката е при котвата.
        { kade: 'trezor', saldo_st, ot },
        { opId: opIdSaldo },
      );
      // нов opId чак СЛЕД успешен запис — дотогава повторното натискане е
      // същата операция и Журналът връща същия резултат (правило 5)
      opIdSaldo = crypto.randomUUID();
      k.vest('dobre', 'Салдото е записано.');
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── нов разход ───────────────────────────────────────────────────────────
  const formaRazhoda = koren.querySelector<HTMLFormElement>('#forma-razhod');
  formaRazhoda?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-razhod')!;
    greshka.textContent = '';
    const danni = new FormData(formaRazhoda);
    const buton = formaRazhoda.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let suma_st: number;
    let data: string;
    try {
      suma_st = otLeva(String(danni.get('suma')));
      data = otData(String(danni.get('data') ?? ''), 'Датата на разхода');
    } catch (err) {
      greshka.textContent =
        dumiZaGreshka(err);
      return;
    }
    if (suma_st <= 0) {
      greshka.textContent = SUMATA_NAD_NULA;
      return;
    }

    // Заплатите и кредитите си носят сектора — изборът важи само за фактурите.
    const potokKlyuch = String(danni.get('potok'));
    const sektor = potokKlyuch === 'fakturi' ? String(danni.get('sektor')) : potokKlyuch;
    // Ставката се пита само при фактури; заплатите и кредитите си носят нула.
    const stavka = potokKlyuch === 'fakturi' ? Number(danni.get('stavka')) : 0;

    buton.disabled = true;
    // Брои се ПРЕДИ записа: после речникът вече ги съдържа (ADR-040).
    const novite = novoteVSpisatsite(koren, rechnitsite(RECHNIK_RAZHOD));
    try {
      await k.deystviya.zapishiRazhod(
        `R:${crypto.randomUUID()}`,
        {
          potok: potokKlyuch,
          dostavchik: String(danni.get('dostavchik')).trim(),
          opis: String(danni.get('opis')).trim(),
          suma_st,
          sektor,
          nachin: String(danni.get('nachin')) as NachinNaPlashtane,
          data,
          dokument: String(danni.get('dokument') ?? '').trim(),
          stavka,
          // Празният избор НЕ пътува: липсваща връзка е липсващо поле, не ''.
          ...(String(danni.get('prepiska') ?? '') === ''
            ? {}
            : { prepId: String(danni.get('prepiska')) }),
        },
        { opId: opIdRazhod },
      );
      opIdRazhod = crypto.randomUUID();
      k.vest(
        'dobre',
        `Разходът е записан. Входящият ДДС влезе в акумулатора си.${sDumiZaNovite(novite)}`,
      );
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── справката: подаване, внасяне, отключване ─────────────────────────────
  const mesets = period ?? new Date().toISOString().slice(0, 7);

  const formaSpravka = koren.querySelector<HTMLFormElement>('#forma-spravka');
  formaSpravka?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-spravka')!;
    greshka.textContent = '';
    const danni = new FormData(formaSpravka);
    try {
      await k.deystviya.podaySpravka(
        {
          period: mesets,
          dds_deklarirano_st: otLeva(String(danni.get('dds'))),
          data: otData(String(danni.get('data') ?? ''), 'Датата на подаване'),
          belezhka: String(danni.get('belezhka') ?? '').trim(),
        },
        { opId: opIdSpravka },
      );
      opIdSpravka = crypto.randomUUID();
      k.vest('dobre', `Справката е записана. ${mesets} е заключен — поправка само през сверена промяна.`);
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    }
  });

  const formaDDS = koren.querySelector<HTMLFormElement>('#forma-dds-plateno');
  formaDDS?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-dds')!;
    greshka.textContent = '';
    const danni = new FormData(formaDDS);
    try {
      const data = otData(String(danni.get('data') ?? ''), 'Датата на плащането');
      await k.deystviya.platiDDS(
        `DP:${mesets}:${crypto.randomUUID()}`,
        {
          period: mesets,
          suma_st: otLeva(String(danni.get('suma'))),
          data,
          nachin: String(danni.get('nachin')) as NachinNaPlashtane,
        },
        { opId: `dds-plateno:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Внесеното е записано. Разликата с декларираното се вижда горе.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    }
  });

  koren.querySelector<HTMLButtonElement>('[data-otkluchi]')?.addEventListener('click', async (e) => {
    const buton = e.currentTarget as HTMLButtonElement;
    const izhod = await opitajStorno(k, Number(buton.dataset['otkluchi']), VID.spravka, 'справката');
    if (izhod.kazano) k.vest(izhod.vid, izhod.kazano);
    await prerisuvay();
  });

  // ── сторно на разход · същата обиколка като в Имоти и Пари ───────────────
  zakachiStornoButoni(koren, k, [['data-storno-razhod', 'разходът']], prerisuvay);
}

/**
 * СВЕРКАТА С ИЗВЛЕЧЕНИЕТО · книгата срещу банката (резен 17в · ADR-074).
 *
 * Файлът се ЧЕТЕ и се забравя: нищо от извлечението не влиза в Журнала —
 * банката го казва, не ние (същото решение като при отговора на Google,
 * ADR-064). В Журнала влиза само СВЕРКАТА, и то през събитието, което вече
 * съществува.
 *
 * „Ако не ги намира в сверката в Извлечение СВЕТВА" — негови думи, 11.08.
 * Затова находката не е ред в списък, а ЧИСЛО горе, и редът носи цвят.
 */
/**
 * ПРОВЕРКИ ОТ СВЕРКИ (резен 72 · И124 т.10) · остатъкът по теми, двете посоки.
 *
 * „Да има таблица Проверки от Сверки където се показва грешки и оставащотото
 * в извлеченията което не е участвалов сверки и справки събрано по теми."
 *
 * Таблицата гледа ВСИЧКИ месеци на прочетеното извлечение, не само показания:
 * остатъкът от март не е по-малко остатък, защото екранът гледа април. Живее
 * колкото самото извлечение — то се чете и се забравя, нищо не влиза в
 * Журнала. Темата е предложение на машината (правило 18), не запис.
 */
function blokNaProverkite(): string {
  // Без извлечение няма и остатък — секцията се появява с него.
  if (sverkiteNaIzvlechenieto.length === 0) return '';
  const pr = proverkiOtSverki(sverkiteNaIzvlechenieto, new Date().toISOString());
  const glava = `
      <div class="dyalglava">
        <h2>Проверки от Сверки</h2>
        <span>остатъкът, който не е участвал в сверка · по теми · в двете посоки</span>
      </div>
      <p class="drebno" data-proverki-po-temi>${pr.poTemi
        .map((t) => `${ekraniraj(t.tema)} · <b>${t.redove.length}</b>`)
        .join(' &nbsp;·&nbsp; ')}</p>`;

  if (pr.redove.length === 0) {
    return `${glava}
      <p class="drebno" data-proverki-prazno>Остатък няма — всеки ред от извлечението
      се е срещнал с книгата, и нулата е проверена, не подразбрана.</p>`;
  }

  return `${glava}
      <div class="tablitsa" data-tablitsa="proverki-ot-sverki">
        <div class="glava izvlechenie">
          <span data-kolona="koy" data-ime="Кой">Кой</span>
          <span data-kolona="data" data-ime="Дата">Дата</span>
          <span data-kolona="nachin" data-ime="Посока">Посока</span>
          <span data-kolona="suma" data-ime="Сума">Сума</span>
          <span data-kolona="sadba" data-ime="Откъде">Откъде</span>
        </div>
        ${pr.poTemi
          .filter((t) => t.redove.length > 0)
          .map(
            (t) => `
        <div class="grupa-glava" data-tema="${ekraniraj(t.tema)}" translate="no">
          <b>${ekraniraj(t.tema)}</b> · ${t.redove.length} ${t.redove.length === 1 ? 'ред' : 'реда'}
          <span class="suma" data-st="${t.sbor_st}">${pishi(t.sbor_st)}</span>
        </div>
        ${t.redove
          .map(
            (x) => `
        <div class="red izvlechenie duljimo" data-proverka-tema="${ekraniraj(t.tema)}" translate="no">
          <span class="kletka"><b>${ekraniraj(x.koy)}</b></span>
          <span class="kletka"><span>${ekraniraj(x.data)}</span></span>
          <span class="kletka"><span>${x.posoka === 'prihod' ? 'навътре' : 'навън'}</span></span>
          <span class="suma" data-st="${x.suma_st}">${pishi(x.suma_st)}</span>
          <span class="kletka"><span>${
            x.otkade === 'извлечението' ? 'в извлечението · книгата мълчи' : 'в книгата · банката мълчи'
          }</span></span>
        </div>`,
          )
          .join('')}`,
          )
          .join('')}
      </div>
      <p class="drebno" data-proverki-sverka="${pr.sverka.razlika}">Сверка вход↔изход:
      ${pr.sverka.vhod} находки от сверките ↔ ${pr.sverka.izhod}
      ${pr.sverka.izhod === 1 ? 'ред' : 'реда'} тук · разлика ${pr.sverka.razlika} —
      казва се и нулата.</p>`;
}

/**
 * ПРЕДЛОЖЕНАТА ВНОСКА (резен 73 · И124 т.12) · „От извлеченията се вкарва и
 * наличните кредити."
 *
 * Ред от банката, който никой не позна, а името му носи дума от име на
 * кредит, се ПРЕДЛАГА като вноска с готова делба. Записва ЧОВЕКЪТ, с едно
 * натискане (правило 18); бележката пази следата откъде е дошло.
 */
function blokNaPredlozhenite(o: Ogledalo): string {
  const vsichki = sverkiteNaIzvlechenieto.flatMap((r) => predlozheniyaPoKredit(r, o));
  if (vsichki.length === 0) return '';
  return `
      <div class="dyalglava">
        <h2>Предложени вноски по кредити</h2>
        <span>редове от банката с име на кредит · записва човекът</span>
      </div>
      ${
        /* НЕ е `.tablitsa` нарочно: в клетка на таблица кликът отива на
           редакцията-в-клетката (ADR-050) и бутонът остава глух — намерено от
           §97в, когато натиснатото предложение не пишеше нищо. */ ''
      }
      <div data-predlozheni-vnoski="${vsichki.length}">
        ${vsichki
          .map(
            (v) => `
        <p class="drebno" translate="no" data-predlozhena-vnoska="${ekraniraj(v.kreditId)}">
          <b>${ekraniraj(v.ime)}</b> · ${ekraniraj(v.data)} ·
          <b data-st="${v.suma_st}">${pishi(v.suma_st)}</b> ·
          главница ${pishi(v.glavnitsa_st)} · лихва ${pishi(v.lihva_st)}${
            v.taksa_st === 0 ? '' : ` · такса ${pishi(v.taksa_st)}`
          }
          <button type="button" class="reden" data-zapishi-vnoska
            data-kredit-id="${ekraniraj(v.kreditId)}" data-data="${ekraniraj(v.data)}"
            data-suma="${v.suma_st}" data-glavnitsa="${v.glavnitsa_st}"
            data-lihva="${v.lihva_st}" data-taksa="${v.taksa_st}">Запиши вноската</button>
        </p>`,
          )
          .join('')}
      </div>
      <p class="drebno">Делбата е ПРЕДЛОЖЕНИЕ — смята я същата функция, с която
      живее планът (правило 17); непокритото от главница и лихва отива в такса.
      Нищо не е записано, докато човек не натисне.</p>`;
}

function blokNaSverkataSIzvlechenie(o: Ogledalo, mesets: string): string {
  const zapisi = zapisiteNaKnigata(o, mesets);
  const r = sverkiteNaIzvlechenieto.find((x) => x.period === mesets) ?? null;
  if (r === null) {
    return `
    <section data-sektsiya="smetki-izvlechenie">
      <div class="dyalglava">
        <h2>Сверка с извлечението</h2>
        <span>книгата срещу банката · ${zapisi.length} ${zapisi.length === 1 ? 'запис' : 'записа'} за ${ekraniraj(mesets)}</span>
      </div>
      <p class="drebno">Извлечението се ЧЕТЕ и се забравя — нито един негов ред не
      влиза в Журнала. Банката е ЧУЖД факт; в Журнала влиза само сверката, с
      разликата, дори когато е нула.</p>
      <p class="drebno">Търсят се <b>по банка</b> и <b>с карта</b>. Платеното
      <b>в брой</b> НЕ се търси и не свети — то няма банкова следа и отива в
      списъка за счетоводството.</p>
      <p class="drebno" data-dvete-i-trite>Той дели наемите на ДВЕ — Банка и Кеш
      (И124 т.12). Начините в кода са ТРИ, защото картата Е банков джоб
      (р57·[44]): двете му думи и трите начина не си противоречат — картата
      стои при банката, и разликата се казва, не се преглъща.</p>
      ${
        greshkaIzvlechenie === ''
          ? ''
          : `<p class="greshka" id="greshka-izvlechenie">${ekraniraj(greshkaIzvlechenie)}</p>`
      }
      ${butonSIkona({
        ikona: 'vnos',
        tekst: 'Избери извлечение',
        title: 'Чете файла · нищо не се качва и нищо не се пази',
        klas: 'glaven',
        id: 'izbor-izvlechenie',
      })}
      <input translate="no" type="file" id="fayl-izvlechenie" multiple hidden>
      ${
        /* Извлечение за ДРУГ месец: сверката му не е на този екран, но
           остатъкът и предложенията НЕ зависят от показания месец — те гледат
           всички месеци на извлечението и стоят, за да не изглежда четенето
           като нищо (правило 15). Намерено от §97в: извлечение 14 месеца
           напред „изчезваше" заедно с предложената вноска по кредита. */
        blokNaProverkite()
      }
      ${blokNaPredlozhenite(o)}
      ${
        sverkiteNaIzvlechenieto.length === 0
          ? ''
          : `<p class="drebno">Има прочетено извлечение за друг месец
             (${sverkiteNaIzvlechenieto.map((x) => ekraniraj(x.period)).join(' · ')}) —
             самата сверка се гледа, като екранът мине на неговия месец.</p>
             ${butonSIkona({ ikona: 'mahni', tekst: 'Забрави извлечението', klas: '', id: 'zabravi-izvlechenie' })}`
      }
    </section>`;
  }

  const nahodki = broyNahodki(r);
  const spisatsi = spisatsiteZaSchetovodstvoto(r);
  const s = sverkataNaIzvlechenieto(r, new Date().toISOString());

  // ФИЛТЪРЪТ ПО КОНКРЕТЕН ДОГОВОР *(р84·[28])* · стеснява ПОГЛЕДА, не сверката.
  const dogovori = dogovoriteVSverkata(r, (id) => o.naemi.get(id)?.naemetel ?? '');
  // Изборът може да сочи договор, който този месец го няма — тогава пада на
  // „всички", вместо да остави празен екран без обяснение.
  const izbran = dogovori.some((d) => d.id === dogovorNaSverkata) ? dogovorNaSverkata : BEZ_DOGOVOR;
  const stesnena = stesniPoDogovor(r, izbran);
  const svChasti = sveriStesnyavaneto(r, dogovori, new Date().toISOString());

  return `
    <section data-sektsiya="smetki-izvlechenie" class="karta${nahodki === 0 ? '' : ' izbrana'}">
      <div class="dyalglava">
        <h2>Сверка с извлечението</h2>
        <span>${ekraniraj(r.ot)} → ${ekraniraj(r.do)} · ${r.redove.length} ${r.redove.length === 1 ? 'запис' : 'записа'}</span>
      </div>
      ${
        /* Отказът се КАЗВА и на заредения екран (правило 15) — преглътнат тук,
           той оставяше натиснат бутон без никаква следа защо нищо не е станало. */
        greshkaIzvlechenie === ''
          ? ''
          : `<p class="greshka" id="greshka-izvlechenie">${ekraniraj(greshkaIzvlechenie)}</p>`
      }

      <div class="plochki">
        <div class="plochka${nahodki === 0 ? '' : ' duljimo'}" data-plochka="Находки">
          <span class="ime">НАХОДКИ</span>
          <b data-nahodki>${nahodki}</b>
          <span class="pod">${nahodki === 0 ? 'всичко се среща' : 'светят и чакат човек'}</span>
        </div>
        <div class="plochka" data-plochka="Вход">
          <span class="ime">ВХОД · КНИГАТА</span>
          <b data-st="${r.vhod_st}">${pishi(r.vhod_st)}</b>
          <span class="pod">целият месец, кешът включен</span>
        </div>
        <div class="plochka" data-plochka="Изход">
          <span class="ime">ИЗХОД · ОБЯСНЕНОТО</span>
          <b data-st="${r.izhod_st}">${pishi(r.izhod_st)}</b>
          <span class="pod">сверено + в брой</span>
        </div>
        <div class="plochka${s.nared ? '' : ' duljimo'}" data-plochka="Разлика">
          <span class="ime">РАЗЛИКА</span>
          <b data-st="${s.razlika}">${pishi(s.razlika)}</b>
          <span class="pod">${s.nared ? 'сверката затваря' : 'необяснени пари'}</span>
        </div>
      </div>

      <p class="drebno">${ekraniraj(ZASHTO_I_NULATA)}</p>

      ${
        dogovori.length === 0
          ? ''
          : `<div class="poleta tesni">
              <div class="pole">
                <label for="izvlechenie-dogovor">Договор</label>
                <select translate="no" id="izvlechenie-dogovor" data-broy-dogovori="${dogovori.length}">
                  <option value=""${izbran === BEZ_DOGOVOR ? ' selected' : ''}>всички</option>
                  ${dogovori
                    .map(
                      (d) =>
                        `<option value="${ekraniraj(d.id)}"${d.id === izbran ? ' selected' : ''}>${ekraniraj(
                          d.ime || d.id,
                        )} · ${d.broy}</option>`,
                    )
                    .join('')}
                </select>
              </div>
            </div>
            <p class="drebno" data-chasti-sverka>Сверка вход↔изход: частите по договор плюс онова
            БЕЗ договор дават ${pishi(svChasti.izhod)} срещу ${pishi(svChasti.vhod)} в книгата,
            разлика ${pishi(svChasti.razlika)}.</p>`
      }

      <div class="tablitsa" data-tablitsa="izvlechenie">
        <div class="glava izvlechenie">
          <span data-kolona="koy" data-ime="Кой">Кой</span>
          <span data-kolona="data" data-ime="Дата">Дата</span>
          <span data-kolona="nachin" data-ime="Начин">Начин</span>
          <span data-kolona="suma" data-ime="Сума">Сума</span>
          <span data-kolona="sadba" data-ime="Какво казва извлечението">Какво казва извлечението</span>
        </div>
        ${stesnena.redove.map((x) => redNaSverkataSIzvlechenie(x, mesetsiSvetene(sverkiteNaIzvlechenieto, x.zapis.klyuch))).join('')}
      </div>

      ${
        izbran === BEZ_DOGOVOR
          ? ''
          : `<p class="drebno" data-stesneno>Показан е САМО договорът
             „${ekraniraj(o.naemi.get(izbran)?.naemetel ?? izbran)}" ·
             <b data-stesnen-vhod="${stesnena.vhod_st}">${pishi(stesnena.vhod_st)}</b> от
             <b>${pishi(r.vhod_st)}</b>${
               stesnena.skritiOtBankata === 0
                 ? ''
                 : ` · <b data-skriti-ot-bankata="${stesnena.skritiOtBankata}">${stesnena.skritiOtBankata}</b>
                    ${stesnena.skritiOtBankata === 1 ? 'ред' : 'реда'} само в банката ${
                      stesnena.skritiOtBankata === 1 ? 'е скрит' : 'са скрити'
                    }: банков ред без насрещен запис няма договор`
             }.</p>`
      }

      ${
        r.samoVBankata.length === 0
          ? ''
          : `<p class="drebno"><b data-samo-v-bankata>${r.samoVBankata.length}</b>
             ${r.samoVBankata.length === 1 ? 'ред е' : 'реда са'} в извлечението, но
             ${r.samoVBankata.length === 1 ? 'няма' : 'нямат'} насреща си запис в книгата.
             Това е ДРУГА находка: пари са минали, а книгата мълчи — редовете са долу,
             в Проверки от Сверки, по теми.</p>`
      }

      ${blokNaProverkite()}

      ${blokNaPredlozhenite(o)}

      <div class="dyalglava">
        <h2>Списъците за счетоводството</h2>
        <span>платеното без банкова следа · негови думи</span>
      </div>
      <p class="drebno">„За останалите се прави списък за счетоводството — единият
      за платени фактури на ръка без карта, и приход на ръка от наем без банка."
      Критерият е ЕДИН — платено без банкова следа; посоката само казва накъде
      са тръгнали парите.</p>
      <div class="plochki">
        <div class="plochka" data-plochka="Платено на ръка">
          <span class="ime">ПЛАТЕНИ ФАКТУРИ НА РЪКА</span>
          <b data-st="${spisatsi.platenoNaRaka_st}" data-plateno-na-raka="${spisatsi.platenoNaRaka.length}">${pishi(spisatsi.platenoNaRaka_st)}</b>
          <span class="pod">${spisatsi.platenoNaRaka.length} ${spisatsi.platenoNaRaka.length === 1 ? 'ред' : 'реда'} · без карта</span>
        </div>
        <div class="plochka" data-plochka="Приход на ръка">
          <span class="ime">ПРИХОД НА РЪКА ОТ НАЕМ</span>
          <b data-st="${spisatsi.prihodNaRaka_st}" data-prihod-na-raka="${spisatsi.prihodNaRaka.length}">${pishi(spisatsi.prihodNaRaka_st)}</b>
          <span class="pod">${spisatsi.prihodNaRaka.length} ${spisatsi.prihodNaRaka.length === 1 ? 'ред' : 'реда'} · без банка</span>
        </div>
      </div>

      <span class="butoni">
        ${butonSIkona({
          ikona: 'sverka',
          tekst: 'Запиши сверката',
          title: 'Записва вход, изход и разликата · дори когато е нула',
          klas: 'glaven',
          id: 'zapishi-sverka-izvlechenie',
        })}
        ${butonSIkona({
          ikona: 'mahni',
          tekst: 'Затвори',
          title: 'Маха резултата от екрана · нищо не се трие',
          id: 'zabravi-izvlechenie',
        })}
      </span>
      ${
        greshkaIzvlechenie === ''
          ? ''
          : `<p class="greshka" id="greshka-izvlechenie">${ekraniraj(greshkaIzvlechenie)}</p>`
      }
      <input translate="no" type="file" id="fayl-izvlechenie" multiple hidden>
    </section>`;
}

function redNaSverkataSIzvlechenie(x: RedNaSverkata, mesetsi: number): string {
  const sveti = x.sadba === 'lipsva' || x.sadba === 'nyakolko';
  return `
    <div class="red izvlechenie${sveti ? ' duljimo' : ''}" translate="no" data-sadba="${x.sadba}">
      <span class="kletka"><b>${ekraniraj(x.zapis.koy)}</b><span>${x.zapis.posoka === 'prihod' ? 'приход' : 'разход'}</span></span>
      <span class="kletka"><span>${ekraniraj(x.zapis.data)}</span></span>
      <span class="kletka"><span>${ekraniraj(imeNaNachina(x.zapis.nachin))}</span></span>
      <span class="suma" data-st="${x.zapis.suma_st}">${pishi(x.zapis.suma_st)}</span>
      <span class="kletka"><span>${ekraniraj(IMENA_NA_SADBITE[x.sadba])}${
        x.sadba === 'nyakolko' ? ` (${x.sreshtu.length})` : ''
      }</span>${
        // „и броя мрюесеци се смятат" · вторият месец подред вече не е случайност
        mesetsi > 1
          ? `<span class="znachka trevoga" data-svetene="${mesetsi}">свети ${mesetsi} месеца</span>`
          : ''
      }</span>
    </div>`;
}

/**
 * СВЕРКАТА НА ПОКАЗАНИЯ МЕСЕЦ · записва се ТОЙ, не целият файл.
 *
 * Файл за три месеца дава ТРИ сверки. Записани наведнъж, те биха дали едно
 * число за три месеца — и когато не затвори, никой няма да знае кой месец е
 * счупеният (същата причина като при партидите в `sveryavane.ts`).
 */
function sverkataNaPokazaniyaMesets(): RezultatNaSverkata | null {
  const mesets = period ?? new Date().toISOString().slice(0, 7);
  return sverkiteNaIzvlechenieto.find((x) => x.period === mesets) ?? null;
}

/** Надписът на начина · от единствения му дом (правило 17). */
function imeNaNachina(klyuch: string): string {
  return NACHINI_NA_PLASHTANE.find((n) => n.klyuch === klyuch)?.ime ?? klyuch;
}

