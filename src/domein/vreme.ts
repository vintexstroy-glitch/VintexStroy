/**
 * ВРЕМЕТО · ЕДИН речник за такта.
 *
 * Негови думи, 27.08 (И104):
 *
 *   „Нека са **като НАП 5 вида** и да се съобразят когато избереш **колко ще се
 *    виждат** на таблицата, **за деня е от 08:00 до 17:00**. Искам в такта да
 *    има и **такъв който сам да избереш**. … **ДЕН с 8 часа. Месец с дните от
 *    календара за месеца. Тримесечие пак така. Година с 12 месеца.**"
 *
 * ═══ ЗАЩО СВОЙ ФАЙЛ ═══
 *
 * Дотук времето се режеше по ЧЕТИРИ несвързани начина, в четири файла:
 *
 *   · `TAKTOVE` в `gant.ts` — четири (ден · седмица · месец · година)
 *   · `STAPKI` в `koefitsienti.ts` — пет, единственият с ТРИМЕСЕЧИЕ
 *   · `mesechnitePari` в `diagrami.ts` — закована на 12 месеца
 *   · `grupaNaData` в `app/filtri.ts` — четири думи за ДАВНОСТ
 *
 * Правило 17 казва един факт, един дом. Без него изречението „сумирано за такта
 * на диаграмата" няма върху какво да стъпи, защото няма едно нещо на име „такт".
 *
 * Домът е ТУК. `gant.ts` строи решетката ОТ него; `koefitsienti.ts` реже периода
 * с НЕГОВИТЕ имена. Четвъртият — давността във филтъра — НЕ е такт и остава свой:
 * „Днес · Вчера · Тази седмица" са кофи за ДАВНОСТ, като в Explorer, а не мащаб
 * на ос. Сливането им би било преименуване, не обединяване.
 *
 * ═══ ИМЕТО НА ФАЙЛА ═══
 *
 * Не `takt.ts`: това име ВЕЧЕ значи друго — `src/yadro/takt.ts` е тактът на
 * ВЕРИГАТА (`ts · naematel · seq`, ADR-055). Две различни неща с едно име в един
 * проект е капанът, който правило 17 се опитва да затвори, а не да отвори.
 */

/**
 * ШЕСТТЕ · петте на НАП плюс неговия свой.
 *
 * „Като НАП 5 вида" е неговата мярка за ПЪЛНОТА: НАП мисли в ден · седмица ·
 * месец · тримесечие · година, защото по тях се подава. Шестият е негов:
 * „такъв който сам да избереш".
 */
export const TAKTOVE = ['den', 'sedmitsa', 'mesets', 'trimesechie', 'godina', 'svoy'] as const;
export type Takt = (typeof TAKTOVE)[number];

/**
 * ПЕТТЕ, с които се РЕЖЕ готов период.
 *
 * „Свой" не влиза: там периодът вече Е избран отвън, значи няма какво да реже.
 * Оттук идва и `STAPKI` на Калкулатора — един речник, две ползвания.
 */
export const TAKTOVE_ZA_REZHENE = Object.freeze(
  TAKTOVE.filter((t): t is Exclude<Takt, 'svoy'> => t !== 'svoy'),
);

export const IMENA_NA_TAKTOVETE: Readonly<Record<Takt, string>> = Object.freeze({
  den: 'Ден',
  sedmitsa: 'Седмица',
  mesets: 'Месец',
  trimesechie: 'Тримесечие',
  godina: 'Година',
  svoy: 'Свой',
});

/**
 * РАБОТНИЯТ ДЕН · осем часа между 08:00 и 17:00.
 *
 * Той каза И двете: „от 08:00 до 17:00" И „ДЕН с 8 часа". Между 08 и 17 има
 * ДЕВЕТ часа — значи един е почивка и НЕ се рисува. Приема се 12:00–13:00; ако
 * е друго, се мени ЕДНО число тук и решетката го следва.
 *
 * Казва се на глас, защото мълчаливото решение „кой час пада" е точно видът
 * дупка, в която после никой не поглежда.
 */
export const OBEDNIYAT_CHAS = 12;
export const CHASOVE_NA_DENYA: readonly number[] = Object.freeze(
  [8, 9, 10, 11, 12, 13, 14, 15, 16].filter((c) => c !== OBEDNIYAT_CHAS),
);

/**
 * ОБХВАТЪТ Е ПЕТ ПЪТИ ВИДИМОТО · негово число *(р51·[141]·07.08)*:
 *
 *   „Графиката когато избереш стъпка от време да покзава толкова видима част, а
 *    реално овеличава с пети пъти стъпката и реално за стъпка 1 година видима
 *    на екрана да се скролва до 5 години вдиаграмата."
 */
export const KRATNOST_NA_OBHVATA = 5;

/**
 * ТАВАНЪТ · колко колони най-много.
 *
 * Не е негово число и затова се КАЗВА защо съществува: при тримесечие пет крачки
 * напред дават над петстотин колони с дни. Това не е прозорец, а километър —
 * решетката спира да се чете, а браузърът рисува десетки хиляди клетки.
 *
 * Таванът реже КРАЧКИ, не половин период: по-добре четири цели тримесечия,
 * отколкото пет и половина.
 */
export const NAY_MNOGO_KOLONI = 400;

/** Свой период · от дата до дата, негов избор. */
export interface SvoyPeriod {
  readonly ot: string;
  readonly do: string;
}

export interface KolonaNaTakta {
  /** YYYY-MM-DD · първият ден на колоната */
  readonly ot: string;
  /** YYYY-MM-DD · последният ден, включително */
  readonly do: string;
  /** какво пише в главата ѝ · късо, за тясна колона */
  readonly nadpis: string;
  /** цялото, за `title` · тясната глава реже, но нищо не се губи */
  readonly opis: string;
  /** тази колона ли носи днешния ден */
  readonly dnes: boolean;
  /**
   * ЧАСЪТ · само при такт „ден".
   *
   * `ot` и `do` ОСТАВАТ денят: така всеки, който сравнява дати (лентите, сумите,
   * износът), продължава да работи без да знае за часове. Часът е ДОПЪЛНЕНИЕ,
   * не смяна на единицата — иначе шест файла трябваше да научат нов формат.
   */
  readonly chas?: number;
}

const DEN = 86_400_000;
const MESETSI = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];
const DNI = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const DALGI_MESETSI = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

function vMilisekundi(d: string): number {
  return Date.parse(`${d}T00:00:00Z`);
}

function naData(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function denNapred(data: string, dni: number): string {
  return naData(vMilisekundi(data) + dni * DEN);
}

/** Първият ден на месеца · с отместване в месеци. */
function nachaloNaMesets(data: string, otmestvane = 0): string {
  const [g, m] = data.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(g, m - 1 + otmestvane, 1)).toISOString().slice(0, 10);
}

function krayNaMesetsa(data: string): string {
  const [g, m] = data.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(g, m, 0)).toISOString().slice(0, 10);
}

/** Колко дни има месецът, в който пада датата · 28 · 29 · 30 · 31. */
function dniVMesetsa(data: string): number {
  return Number(krayNaMesetsa(data).slice(8, 10));
}

/** Първият ден на тримесечието, в което пада датата · с отместване в тримесечия. */
function nachaloNaTrimesechie(data: string, otmestvane = 0): string {
  const m = Number(data.slice(5, 7));
  const parviyat = Math.floor((m - 1) / 3) * 3 + 1;
  return nachaloNaMesets(`${data.slice(0, 4)}-${String(parviyat).padStart(2, '0')}-01`, otmestvane * 3);
}

function dniVTrimesechie(data: string): number {
  const n = nachaloNaTrimesechie(data);
  const sled = nachaloNaTrimesechie(data, 1);
  return Math.round((vMilisekundi(sled) - vMilisekundi(n)) / DEN);
}

function dniMezhdu(ot: string, doo: string): number {
  return Math.round((vMilisekundi(doo) - vMilisekundi(ot)) / DEN) + 1;
}

function nadpisNaDen(data: string): string {
  const d = new Date(vMilisekundi(data));
  return `${DNI[d.getUTCDay()]} ${d.getUTCDate()}`;
}

function opisNaDen(data: string): string {
  const d = new Date(vMilisekundi(data));
  return `${DNI[d.getUTCDay()]} ${d.getUTCDate()} ${DALGI_MESETSI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * КОЛКО КОЛОНИ СЕ ВИЖДАТ · неговото „да се съобразят когато избереш колко ще се
 * виждат на таблицата".
 *
 * Числото вече не е таблица с четири реда, а СМЯТАНЕ: месецът дава своите дни,
 * тримесечието — своите. Заковано на 31, февруари показваше три празни колони.
 */
export function kolkoSeVizhdat(takt: Takt, dnes: string, svoy?: SvoyPeriod): number {
  switch (takt) {
    case 'den':
      return CHASOVE_NA_DENYA.length;
    case 'sedmitsa':
      return 7;
    case 'mesets':
      return dniVMesetsa(dnes);
    case 'trimesechie':
      return dniVTrimesechie(dnes);
    case 'godina':
      return 12;
    case 'svoy':
      return svoy ? koloniNaTakta('svoy', dnes, svoy).length : 0;
  }
}

/**
 * ЕДИНИЦАТА НА СВОЯ ТАКТ · ден или месец, по дължината на периода.
 *
 * Питането „и коя да е колоната" би било ВТОРИ въпрос към човека за едно
 * решение. Затова се СМЯТА и се КАЗВА на екрана: до едно тримесечие колоната е
 * ден, над него — месец. Числото е границата, при която дните спират да се
 * четат в тясна колона.
 */
export const NAY_MNOGO_DNI_ZA_DNEVNA_KOLONA = 92;

export function edinitsataNaSvoya(p: SvoyPeriod): 'den' | 'mesets' {
  return dniMezhdu(p.ot, p.do) <= NAY_MNOGO_DNI_ZA_DNEVNA_KOLONA ? 'den' : 'mesets';
}

/** Колоните на един ДЕН · осемте му работни часа. */
function chasoveNaDen(data: string, dnesLi: boolean): KolonaNaTakta[] {
  return CHASOVE_NA_DENYA.map((c, i) => ({
    ot: data,
    do: data,
    // Първата колона на деня носи ДЕНЯ, не часа: инак осемте часа се повтарят и
    // не се вижда къде свършва единият ден. Часът ѝ е първият работен и се знае.
    nadpis: i === 0 ? nadpisNaDen(data) : String(c).padStart(2, '0'),
    opis: `${opisNaDen(data)} · ${String(c).padStart(2, '0')}:00–${String(c + 1).padStart(2, '0')}:00`,
    dnes: dnesLi,
    chas: c,
  }));
}

function dnevniKoloni(ot: string, doo: string, dnes: string): KolonaNaTakta[] {
  const spisak: KolonaNaTakta[] = [];
  for (let d = ot; d <= doo; d = denNapred(d, 1)) {
    spisak.push({ ot: d, do: d, nadpis: nadpisNaDen(d), opis: opisNaDen(d), dnes: d === dnes });
  }
  return spisak;
}

function mesechniKoloni(parvi: string, broy: number, dnes: string): KolonaNaTakta[] {
  const spisak: KolonaNaTakta[] = [];
  for (let i = 0; i < broy; i += 1) {
    const n = nachaloNaMesets(parvi, i);
    const k = krayNaMesetsa(n);
    const d = new Date(vMilisekundi(n));
    spisak.push({
      ot: n,
      do: k,
      nadpis: `${MESETSI[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
      opis: `${DALGI_MESETSI[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      dnes: dnes >= n && dnes <= k,
    });
  }
  return spisak;
}

/**
 * КОЛКО КРАЧКИ НАПРЕД се побират под тавана · поне една.
 *
 * Реже се на цели крачки. „Пет крачки, освен ако не се събират" е по-честно от
 * „пет и половина", защото половин тримесечие на екрана изглежда като спаднало.
 */
function krachkiNapred(kolonivKrachka: number): number {
  if (kolonivKrachka <= 0) return 1;
  const pobirat = Math.floor(NAY_MNOGO_KOLONI / kolonivKrachka) - 1;
  return Math.max(1, Math.min(KRATNOST_NA_OBHVATA, pobirat));
}

/**
 * КОЛОНИТЕ на един такт.
 *
 * ПЪРВАТА КОЛОНА Е ДНЕС · негово „Да, точно така" *(р57·[134])*: решетката не
 * почва от началото на годината, а от днес, и се връща назад само когато някой
 * я върне. Затова назад се дава ЕДНА видима крачка история.
 *
 * ПРИ „МЕСЕЦ" И „ТРИМЕСЕЧИЕ" крачката е ПЕРИОД, не прозорец от дни: неговото
 * „месец с дните от календара за месеца" значи, че февруари има 28 колони, а не
 * 31 с три празни. Тогава днешната колона вече не е на индекс `vidimi` — тя е
 * там, където денят пада в своя месец. Това е СЛЕДСТВИЕ от неговата дума, не
 * загуба: историята вляво пак е поне един цял период.
 */
export function koloniNaTakta(takt: Takt, dnes: string, svoy?: SvoyPeriod): KolonaNaTakta[] {
  switch (takt) {
    case 'den': {
      const napred = krachkiNapred(CHASOVE_NA_DENYA.length);
      const spisak: KolonaNaTakta[] = [];
      for (let i = -1; i < napred; i += 1) {
        const d = denNapred(dnes, i);
        spisak.push(...chasoveNaDen(d, d === dnes));
      }
      return spisak;
    }
    case 'sedmitsa': {
      const napred = krachkiNapred(7);
      return dnevniKoloni(denNapred(dnes, -7), denNapred(dnes, napred * 7 - 1), dnes);
    }
    case 'mesets': {
      const napred = krachkiNapred(dniVMesetsa(dnes));
      return dnevniKoloni(
        nachaloNaMesets(dnes, -1),
        krayNaMesetsa(nachaloNaMesets(dnes, napred - 1)),
        dnes,
      );
    }
    case 'trimesechie': {
      const napred = krachkiNapred(dniVTrimesechie(dnes));
      return dnevniKoloni(
        nachaloNaTrimesechie(dnes, -1),
        denNapred(nachaloNaTrimesechie(dnes, napred), -1),
        dnes,
      );
    }
    case 'godina': {
      const napred = krachkiNapred(12);
      return mesechniKoloni(nachaloNaMesets(dnes, -12), 12 + napred * 12, dnes);
    }
    case 'svoy': {
      // СВОЯТ ТАКТ показва ТОЧНО неговия период · без крачка назад и без пет
      // напред. Той е избрал границите; да ги разширим „за скрол" би значело да
      // покажем нещо, което не е искал.
      if (!svoy || svoy.do < svoy.ot) return [];
      if (edinitsataNaSvoya(svoy) === 'den') {
        const dni = Math.min(dniMezhdu(svoy.ot, svoy.do), NAY_MNOGO_KOLONI);
        return dnevniKoloni(svoy.ot, denNapred(svoy.ot, dni - 1), dnes);
      }
      const mesetsi = Math.min(
        Math.round(dniMezhdu(nachaloNaMesets(svoy.ot), svoy.do) / 28) + 1,
        NAY_MNOGO_KOLONI,
      );
      return mesechniKoloni(nachaloNaMesets(svoy.ot), mesetsi, dnes).filter((k) => k.ot <= svoy.do);
    }
  }
}
