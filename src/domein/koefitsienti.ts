/**
 * КОЕФИЦИЕНТИТЕ · показаната сметка, не картинката (И96 т.5 · т.6).
 *
 * Негови думи: „Има чиста диаграма без таблица, а само показани суми за
 * избрания период от време и стъпката… всички коефициенти изредени с формулата
 * на един ред и под нея сметките за периода на параметри и коефициенти."
 * И: „Имаш право да избереш… избери най-основните, използвани в повечето
 * бизнеси, без бройка."
 *
 * Затова тук всеки коефициент носи ТРИ неща, не едно число:
 *   1. **формулата на един ред** — както той я поиска, дума по дума;
 *   2. **параметрите с числата им** — сметката, показана, а не обещана;
 *   3. **какво става с него при друг период** — и това е най-важното.
 *
 * ═══ ЧЕТИРИТЕ ВИДА · и защо не са три ═══
 *
 * Той иска „опция да видиш коефициент в различен период от официалния и с
 * интерполация да се приравни на годишна диаграма". Изпълнимо е — но НЕ за
 * всички, и грешката тук е тиха и скъпа.
 *
 * Занаятът дели на поток и запас: потокът се натрупва ПРЕЗ периода, запасът е
 * снимка в ЕДИН миг. Това деление обаче не стига, защото под него се крие
 * трети случай — и точно той обърква:
 *
 * | вид | пример | приравнява ли се |
 * | :---- | :---- | :---- |
 * | **сума-поток** | NOI, паричен поток | **ДА** · × (12 ÷ месеци) |
 * | **отношение на два ПОТОКА** | марж, OER, събираемост | **НЕ ТРЯБВА** — вече не зависи от периода |
 * | **поток към ЗАПАС** | доходност, дни до плащане | **ДА**, но със СРЕДЕН запас, не с краен |
 * | **отношение на два ЗАПАСА** | ликвидност, заетост, LTV | **НЕ МОЖЕ** — снимка няма годишна база |
 *
 * Вторият ред е капанът. Марж от 20 % за един месец си е 20 % и за година —
 * той е отношение на две числа от СЪЩИЯ период и вече е нормализиран.
 * Умножен по 12, той дава 240 %, което не значи нищо. Затова приравняването не
 * е „включено/изключено", а има ТРИ отговора, и всеки се казва с думи.
 *
 * ═══ БЕЗ НИТО ЕДИН FLOAT (правило 3) ═══
 *
 * Процентите живеят в БАЗИСНИ ТОЧКИ (1 % = 100 б.т.), пъти — в стотни
 * (1,25× = 125), дни — в цели дни, пари — в центове. Делението е целочислено
 * със закръгляне на половинката, както при ДДС-то.
 */

import { obshtOstatak, obshtoObezpechenie } from './krediti.js';
import { deliZakragleno } from '../yadro/pari.js';
import { smetki } from './smetki.js';
import { aktiviIZadalzheniya, saldoNa, sumiZaObhvat, type VanshniZaKapitala } from './otcheti.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';
import { TAKTOVE_ZA_REZHENE, type Takt } from './vreme.js';

export class GreshkaKoefitsient extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKoefitsient';
  }
}

/**
 * ШЕСТТЕ вида · изброени ПОИМЕННО, защото от тях зависи приравняването.
 *
 * Петият (`zapas-kam-potok`) дойде с Дълг/доход (резен 19): дълг ÷ доход е
 * ЗАПАС върху ПОТОК, и приравняването му към година не умножава, а ДЕЛИ.
 * Без свой вид той щеше да мине като „поток към запас" и „на годишна база"
 * щеше да умножи и запаса — число, което изглежда вярно и не е.
 *
 * Шестият (`suma-zapas`) дойде с Работния капитал (резен 51) по СЪЩАТА причина:
 * той е СУМА, но сума от ЗАПАСИ — снимка в един миг, не натрупване. Сложен под
 * `suma-potok`, той щеше да се умножи по 12 и да покаже дванайсет пъти повече
 * пари, отколкото съществуват. Пети вид беше платен веднъж с находка; шестият
 * се плаща предварително, защото причината вече е известна.
 */
export const VIDOVE = [
  'suma-potok',
  'otnoshenie-potoci',
  'potok-kam-zapas',
  'zapas-kam-potok',
  'otnoshenie-zapasi',
  'suma-zapas',
] as const;

export type Vid = (typeof VIDOVE)[number];

export const IMENA_NA_VIDOVETE: Readonly<Record<Vid, string>> = Object.freeze({
  'suma-potok': 'сума · натрупва се през периода',
  'otnoshenie-potoci': 'отношение на два потока',
  'potok-kam-zapas': 'поток към запас',
  'zapas-kam-potok': 'запас към поток',
  'otnoshenie-zapasi': 'отношение на два запаса',
  'suma-zapas': 'сума от запаси · снимка в един миг',
});

/** Четирите отговора на въпроса „а на годишна база?" */
type Priravnyavane = 'mnozhi' | 'deli' | 'nenuzhno' | 'nevazmozhno';

export const PRIRAVNYAVANETO: Readonly<Record<Vid, Priravnyavane>> = Object.freeze({
  'suma-potok': 'mnozhi',
  'otnoshenie-potoci': 'nenuzhno',
  'potok-kam-zapas': 'mnozhi',
  'zapas-kam-potok': 'deli',
  'otnoshenie-zapasi': 'nevazmozhno',
  'suma-zapas': 'nevazmozhno',
});

/** Защо · с думи. Отказът трябва да УЧИ, не само да спира. */
export const ZASHTO_PRIRAVNYAVANE: Readonly<Record<Priravnyavane, string>> = Object.freeze({
  mnozhi: 'умножава се по 12 ÷ месеците — сумата се натрупва през периода',
  deli: 'дели се на 12 ÷ месеците — запасът стои, приравнява се ПОТОКЪТ под чертата',
  nenuzhno:
    'вече НЕ зависи от периода — двете числа са от един и същ период и се съкращават. Умножено по 12, то би дало число без смисъл.',
  nevazmozhno:
    'снимка в ЕДИН миг. „На годишна база" е изречение без съдържание — няма какво да се приравнява.',
});

/** Мерките · всяка с цяло число зад себе си, никакъв float. */
const MERKI = ['protsent', 'pari', 'pati', 'dni'] as const;

export type Merka = (typeof MERKI)[number];

/**
 * ДВЕТЕ ВРЕМЕНА на един коефициент.
 *
 * `sastoyanie` — чете се към ДНЕС и има число винаги (заетост, задлъжнялост).
 * `period` — няма число, докато няма период (марж, събираемост, NOI).
 */
export const KOGATO = ['sastoyanie', 'period'] as const;

export type Kogato = (typeof KOGATO)[number];

export const IMENA_NA_VREMENATA: Readonly<Record<Kogato, string>> = Object.freeze({
  sastoyanie: 'Състояние · към днес',
  period: 'За период',
});

/** Какво чака един коефициент за период · думите, които стоят вместо число. */
export const CHAKA_PERIOD = 'чака период';

export interface Koefitsient {
  readonly klyuch: string;
  readonly ime: string;
  /** ФОРМУЛАТА НА ЕДИН РЕД · негово изрично искане (т.5) */
  readonly formula: string;
  readonly vid: Vid;
  readonly merka: Merka;
  /**
   * Появява се САМО при стъпка МЕСЕЦ (негово: „такива, които са на месечна
   * база, и се появяват само тогава").
   */
  readonly samoMesechen: boolean;
  /**
   * КОГА се смята · СЪСТОЯНИЕ или ЗА ПЕРИОД (негово, 30.08).
   *
   * „Показваш всички коефициенти и без графика, по всяко време, които са
   * налични и не са за период. Тези за период седят и чакат да вкараш период
   * и да покаже избрания резултат."
   *
   * Тоест разликата не е украса на екрана, а СВОЙСТВО на самия коефициент:
   * заетостта е моментна снимка и има число още преди да си избрал период;
   * маржът няма, докато не кажеш „за кога". Затова живее ТУК, при коефициента,
   * а не в един `if` на екрана — иначе всеки нов екран щеше да го решава
   * наново и двата щяха да се разминат.
   */
  readonly kogato: Kogato;
  /** едно изречение: какво КАЗВА това число */
  readonly kakvo: string;
  /** обичайното · празно, когато занаятът няма едно число */
  readonly obichayno: string;
}

/**
 * ИЗБОРЪТ · „най-основните, използвани в повечето бизнеси, без бройка".
 *
 * Ядрото на управлението на имоти (NOI · заетост · събираемост · OER · DSCR ·
 * доходност) плюс общото счетоводство (марж · ликвидност · дни до плащане).
 * Нов се добавя ТУК, където се вижда — и заедно с вида си, защото без него
 * приравняването няма как да знае какво да прави.
 */
export const KOEFITSIENTI: readonly Koefitsient[] = Object.freeze([
  Object.freeze({
    klyuch: 'noi',
    ime: 'Нетен оперативен доход',
    formula: 'NOI = приход − оперативни разходи (БЕЗ вноски по кредит)',
    vid: 'suma-potok' as const,
    merka: 'pari' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко изкарва самият имот, преди банката.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'parichen-potok',
    ime: 'Нетен паричен поток',
    formula: 'Паричен поток = приход − ВСИЧКИ разходи',
    vid: 'suma-potok' as const,
    merka: 'pari' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко остава в джоба, след като всичко е платено.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'sabiraemost',
    ime: 'Събираемост на наема',
    formula: 'Събираемост = събрано ÷ начислено',
    vid: 'otnoshenie-potoci' as const,
    merka: 'protsent' as const,
    samoMesechen: true,
    kogato: 'period' as const,
    kakvo: 'Колко от дължимото наистина е влязло.',
    obichayno: 'цел 100 %',
  }),
  Object.freeze({
    klyuch: 'oer',
    ime: 'Оперативен разход към приход',
    formula: 'OER = оперативни разходи ÷ приход',
    vid: 'otnoshenie-potoci' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко от прихода изяжда поддръжката.',
    obichayno: 'под 50 %',
  }),
  Object.freeze({
    klyuch: 'marzh',
    ime: 'Марж',
    formula: 'Марж = (приход − разход) ÷ приход',
    vid: 'otnoshenie-potoci' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко от всяко евро приход остава.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'dds-kam-prihod',
    ime: 'ДДС към приход',
    formula: 'ДДС/приход = ДДС за внасяне ÷ приход',
    vid: 'otnoshenie-potoci' as const,
    merka: 'protsent' as const,
    samoMesechen: true,
    kogato: 'period' as const,
    kakvo: 'Колко от прихода заминава за данък.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'dscr',
    ime: 'Покритие на дълга',
    formula: 'DSCR = NOI ÷ вноски по кредит',
    vid: 'otnoshenie-potoci' as const,
    merka: 'pati' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко пъти доходът покрива вноската.',
    obichayno: 'банките искат 1,25 – 1,50',
  }),
  Object.freeze({
    klyuch: 'zaetost',
    ime: 'Заетост',
    formula: 'Заетост = заети обекти ÷ всички обекти',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Празният обект е загубен приход, не спестен разход.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'likvidnost',
    ime: 'Ликвидност',
    formula: 'Ликвидност = средства + вземания ÷ текущи задължения',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'pati' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Стигат ли парите за онова, което се дължи сега.',
    obichayno: 'над 1,00',
  }),
  Object.freeze({
    klyuch: 'ltv',
    ime: 'Кредит към обезпечение',
    formula: 'LTV = остатъчна главница ÷ стойност на обезпечението',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Каква част от обезпечението е още на банката.',
    obichayno: 'банките дават до 80 %',
  }),
  Object.freeze({
    klyuch: 'dalg-kam-ebitda',
    ime: 'Дълг към доход',
    formula: 'Дълг/доход = остатъчна главница ÷ NOI за периода',
    vid: 'zapas-kam-potok' as const,
    merka: 'pati' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'За колко периода доходът изплаща целия дълг.',
    obichayno: 'под 3,50 при имоти',
  }),
  Object.freeze({
    klyuch: 'dso',
    ime: 'Дни до плащане',
    formula: 'Дни = вземания ÷ приход × дни в периода',
    vid: 'potok-kam-zapas' as const,
    merka: 'dni' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'За колко дни средно се събира един наем.',
    obichayno: '',
  }),
  // ═══ ПОПУЛЯРНИТЕ, КОИТО ДОТУК ЛИПСВАХА (резен 51) ═══
  //
  // Негово, 30.08: „избираш всички популярни и най-използвани коефициенти за
  // отчет… Аз не знам формулите наизуст — не ме питай мен за такива работи,
  // които можеш да научиш."
  //
  // Затова формулите тук са НА ЗАНАЯТА, не измислени: те са учебникови и всяка
  // стои с ДУМИТЕ СИ на един ред, за да може да се обори. Домът им извън кода е
  // `.claude/skills/koefitsienti/` — там стои изворът на всяка, за да не се
  // извежда наново при всеки резен.
  //
  // ЧЕТИРИ са СЪСТОЯНИЕ (имат число още преди да си избрал период) и ТРИ са за
  // период. Нито един не е добавен, ако Огледалото не може да го нахрани днес —
  // коефициент, който винаги казва „липсва", е надпис (ADR-041).
  Object.freeze({
    klyuch: 'zadlazhnyalost',
    ime: 'Задлъжнялост',
    formula: 'Задлъжнялост = задължения ÷ активи',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Каква част от всичко, което държиш, всъщност дължиш.',
    obichayno: 'под 60 % при имоти',
  }),
  Object.freeze({
    klyuch: 'dalg-kam-kapital',
    ime: 'Дълг към собствен капитал',
    formula: 'Д/СК = задължения ÷ собствен капитал',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'pati' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Колко чужди пари стоят зад всеки твой лев собствени.',
    obichayno: 'под 2,00',
  }),
  Object.freeze({
    klyuch: 'dyal-na-kapitala',
    ime: 'Дял на собствения капитал',
    formula: 'Дял = собствен капитал ÷ активи',
    vid: 'otnoshenie-zapasi' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Каква част от всичко е наистина твоя.',
    obichayno: 'над 40 %',
  }),
  Object.freeze({
    klyuch: 'raboten-kapital',
    ime: 'Работен капитал',
    formula: 'Работен капитал = (средства + вземания) − текущи задължения',
    vid: 'suma-zapas' as const,
    merka: 'pari' as const,
    samoMesechen: false,
    kogato: 'sastoyanie' as const,
    kakvo: 'Колко остава, ако утре всичко текущо се плати.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'roa',
    ime: 'Възвръщаемост на активите',
    formula: 'ROA = (приход − разход) ÷ активи',
    vid: 'potok-kam-zapas' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко изкарва всяко евро, вложено в каквото и да е.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'roe',
    ime: 'Възвръщаемост на собствения капитал',
    formula: 'ROE = (приход − разход) ÷ собствен капитал',
    vid: 'potok-kam-zapas' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко изкарва всяко евро, което е ТВОЕ.',
    obichayno: '',
  }),
  Object.freeze({
    klyuch: 'dohodnost',
    ime: 'Доходност на имота',
    formula: 'Доходност = NOI за периода ÷ стойност на състоянието',
    vid: 'potok-kam-zapas' as const,
    merka: 'protsent' as const,
    samoMesechen: false,
    kogato: 'period' as const,
    kakvo: 'Колко процента годишно връща самият имот, преди банката.',
    obichayno: '4–7 % при жилищни имоти',
  }),
]);

const PO_KLYUCH = new Map(KOEFITSIENTI.map((k) => [k.klyuch, k]));

/** Непознат ключ се отказва С ДУМИ — тиха замяна тук значи грешен коефициент. */
export function koefitsient(klyuch: string): Koefitsient {
  const k = PO_KLYUCH.get(klyuch);
  if (!k) throw new GreshkaKoefitsient(`Няма коефициент „${klyuch}".`);
  return k;
}

/**
 * КАК ДА ВИДИШ РЕЗУЛТАТА · първото от двете падащи менюта (негово, 30.08).
 *
 * „Секция отчети в таба Сметки има 2 падащи менюта. През едното избираш как да
 * видиш резултата: таблица, графика, диаграма."
 *
 * ТРИ са, не четири, и не са видове диаграма. Видовете диаграма (линия ·
 * стълбове · площ · точки) са ДРУГ избор и живеят при чистата диаграма; тук се
 * избира ФОРМАТА на резултата. Слети в едно меню, те щяха да дадат меню, в
 * което „таблица" стои до „точки" — два въпроса, отговорени с един избор.
 */
export const VIDOVE_REZULTAT = ['tablitsa', 'grafika', 'diagrama'] as const;

export type VidRezultat = (typeof VIDOVE_REZULTAT)[number];

export const IMENA_NA_REZULTATA: Readonly<Record<VidRezultat, string>> = Object.freeze({
  tablitsa: 'Таблица',
  grafika: 'Графика',
  diagrama: 'Диаграма',
});

/** Едно изречение за всеки · какво показва и кога лъже. */
export const KAKVO_POKAZVA: Readonly<Record<VidRezultat, string>> = Object.freeze({
  tablitsa: 'числата едно под друго · четат се точно, сравняват се трудно',
  grafika: 'движението във времето · вижда се посоката, губи се точното число',
  diagrama: 'дяловете един спрямо друг · вижда се кой води, не се вижда кога',
});

/**
 * КОИ СЕ ПОКАЗВАТ ВЕДНАГА и КОИ ЧАКАТ ПЕРИОД (негово, 30.08).
 *
 * „Показваш всички коефициенти и без графика, по всяко време, които са налични
 * и не са за период. Тези за период седят и чакат да вкараш период и да покаже
 * избрания резултат."
 *
 * Чакащият НЕ се скрива — стои с думите си (правило 15). Скрит коефициент учи
 * човека, че го няма; казана причина го учи какво да направи.
 */
export function poVreme(kogato: Kogato): readonly Koefitsient[] {
  return KOEFITSIENTI.filter((k) => k.kogato === kogato);
}

/** Кои се показват при дадена стъпка · месечните само при месец (негово т.6). */
export function zaStapka(stapka: 'mesets' | 'drug'): readonly Koefitsient[] {
  return KOEFITSIENTI.filter((k) => stapka === 'mesets' || !k.samoMesechen);
}

/**
 * СТЪПКИТЕ · на колко парчета се реже периодът (И96 т.5).
 *
 * „Само показани суми за избрания период от време И СТЪПКАТА." Стъпката не е
 * украса на диаграмата — тя решава КОИ коефициенти изобщо се показват: онези
 * на месечна база се появяват само при месец (т.6).
 */
/**
 * РЕЧНИКЪТ Е ЕДИН · идва от `vreme.ts` (резен 13а · правило 17).
 *
 * Дотук тук стоеше СВОЙ списък от пет думи, а Гантът имаше свой от четири:
 * два дома за един факт, и те не съвпадаха — тримесечието го имаше само тук.
 * Сега стъпката Е тактът, без „свой": периодът тук вече е избран отвън, значи
 * няма какво да реже.
 */
export const STAPKI = TAKTOVE_ZA_REZHENE;

export type Stapka = Exclude<Takt, 'svoy'>;

/** Едно парче от периода · със свой етикет за оста. */
interface Parche {
  readonly ot: string;
  readonly do: string;
  readonly etiket: string;
}

function denNapred(data: string, dni: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + dni * 86_400_000).toISOString().slice(0, 10);
}

/** Последният ден на месеца, в който пада датата. */
function krayNaMesetsa(data: string): string {
  const [g, m] = data.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(g, m, 0)).toISOString().slice(0, 10);
}

/**
 * РЕЖЕ периода на парчета по стъпката.
 *
 * Последното парче се ПОДРЯЗВА до края на периода — иначе диаграмата показва
 * непълен месец наравно с пълните и последният стълб винаги изглежда спаднал.
 * Това е тиха лъжа, която всяка втора отчетна диаграма я прави.
 */
export function razbiyNaStapki(ot: string, doo: string, stapka: Stapka): readonly Parche[] {
  if (doo < ot) throw new GreshkaKoefitsient('Краят на периода е преди началото.');
  const parcheta: Parche[] = [];
  let nachalo = ot;
  let pazach = 0;

  while (nachalo <= doo && pazach++ < 2000) {
    let kraj: string;
    let etiket: string;
    switch (stapka) {
      case 'den':
        kraj = nachalo;
        etiket = nachalo.slice(5);
        break;
      case 'sedmitsa':
        kraj = denNapred(nachalo, 6);
        etiket = nachalo.slice(5);
        break;
      case 'mesets':
        kraj = krayNaMesetsa(nachalo);
        etiket = nachalo.slice(0, 7);
        break;
      case 'trimesechie': {
        const m = Number(nachalo.slice(5, 7));
        kraj = krayNaMesetsa(`${nachalo.slice(0, 4)}-${String(Math.min(12, m + 2)).padStart(2, '0')}-01`);
        etiket = `${nachalo.slice(0, 4)} · Т${Math.ceil(m / 3)}`;
        break;
      }
      case 'godina':
        kraj = `${nachalo.slice(0, 4)}-12-31`;
        etiket = nachalo.slice(0, 4);
        break;
    }
    parcheta.push(Object.freeze({ ot: nachalo, do: kraj > doo ? doo : kraj, etiket }));
    nachalo = denNapred(kraj, 1);
  }
  return Object.freeze(parcheta);
}


/** Един параметър, влязъл в сметката · показва се ПОД формулата (т.5). */
interface Parametar {
  readonly ime: string;
  /** цели центове при пари, цяло число иначе */
  readonly stoynost: number;
  readonly merka: Merka;
}

export interface SmetnatKoefitsient {
  readonly koefitsient: Koefitsient;
  /**
   * Стойността в ЦЯЛО число според мярката: базисни точки при процент,
   * центове при пари, стотни при пъти, дни при дни.
   * `undefined` значи, че НЕ се смята — и `zashto` казва защо.
   */
  readonly stoynost: number | undefined;
  readonly parametri: readonly Parametar[];
  /** празно, когато има стойност; иначе причината С ДУМИ */
  readonly zashto: string;
}

/** Данните за един период · всичко, от което коефициентите се хранят. */
export interface DanniZaPerioda {
  readonly prihod_st: number;
  readonly nachisleno_st: number;
  readonly razhod_st: number;
  readonly operativni_st: number;
  readonly krediti_st: number;
  readonly dds_za_vnasyane_st: number;
  readonly sredstva_st: number;
  readonly vzemaniya_st: number;
  readonly zadalzheniya_st: number;
  /** сборът на обезпеченията по кредитите · знаменателят на LTV */
  readonly obezpechenie_st: number;
  readonly zaeti: number;
  readonly vsichki_obekti: number;
  readonly dni: number;
  /** цели месеци в периода · за приравняването */
  readonly mesetsi: number;
  /**
   * АКТИВИТЕ и СОБСТВЕНИЯТ КАПИТАЛ · четат се от `otcheti.aktiviIZadalzheniya`,
   * не се смятат тук (правило 17). Преписани, те щяха да дадат ВТОРО „колко са
   * активите" — и Отчетите, и коефициентите щяха да са прави поотделно и
   * различни заедно.
   */
  readonly aktivi_st: number;
  readonly sobstven_kapital_st: number;
  /** стойността на състоянието · от Калкулатора · 0 значи „още не е смятана" */
  readonly stoynost_st: number;
}

/**
 * СЪБИРА данните за периода от Огледалото.
 *
 * Приходът тук е СЪБРАНОТО (влезли пари), а начисленото стои отделно — двете се
 * разминават и точно това разминаване мери събираемостта. Слети в едно число,
 * тя щеше винаги да е 100 %.
 */
export function danniZaPerioda(
  o: Ogledalo,
  ot: string,
  doo: string,
  vanshni: VanshniZaKapitala = {},
): DanniZaPerioda {
  const dni = sumiZaObhvat(o, ot, doo);
  const prihod_st = dni.reduce((s, d) => s + d.prihod_st, 0);
  const razhod_st = dni.reduce((s, d) => s + d.razhod_st, 0);

  const razhodite = [...o.razhodi.values()].filter((r) => r.data >= ot && r.data <= doo);
  const krediti_st = razhodite
    .filter((r) => r.potok === 'krediti')
    .reduce((s, r) => s + r.suma_st, 0);

  // Начисленото е МЕСЕЧНО понятие: вземане носи период „2026-08", не ден.
  // Затова се взимат месеците, които падат ИЗЦЯЛО в обхвата.
  const nachisleno_st = [...o.vzemaniya.values()]
    .filter((v) => v.period >= ot.slice(0, 7) && v.period <= doo.slice(0, 7))
    .reduce((s, v) => s + v.nachisleno_st, 0);

  const vzemaniya_st = [...o.vzemaniya.values()].reduce((s, v) => s + v.ostatak_st, 0);

  // ДДС-то е месечно по закон — взима се за месеца на НАЧАЛОТО на периода.
  const dds_za_vnasyane_st = smetki(o, ot.slice(0, 7) as Period, `${ot}T00:00:00.000Z`)
    .zaVnasyane_st;

  const naemi = [...o.naemi.values()].filter((n) => n.do === '' || n.do >= ot);
  const zaeti = new Set(naemi.map((n) => n.imotId)).size;

  const balans = aktiviIZadalzheniya(o, vanshni);
  const razlikaDni =
    Math.round((Date.parse(`${doo}T00:00:00Z`) - Date.parse(`${ot}T00:00:00Z`)) / 86_400_000) + 1;

  return {
    prihod_st,
    nachisleno_st,
    razhod_st,
    // NOI изключва вноските по кредит — това е самата му дефиниция, не избор.
    operativni_st: razhod_st - krediti_st,
    krediti_st,
    dds_za_vnasyane_st,
    sredstva_st: saldoNa(o, 'banka') + saldoNa(o, 'trezor'),
    vzemaniya_st,
    // ДОТУК СТОЕШЕ ЗАКОВАНА НУЛА, защото нямаше откъде да дойде число:
    // Ликвидността мълчеше „няма записани текущи задължения" при всеки Журнал.
    // Резен 19 ѝ даде източник — остатъчната главница по кредитите, СМЕТНАТА.
    zadalzheniya_st: obshtOstatak(o),
    obezpechenie_st: obshtoObezpechenie(o),
    zaeti,
    vsichki_obekti: o.imoti.size,
    dni: razlikaDni,
    mesetsi: Math.max(1, Math.round(razlikaDni / 30)),
    aktivi_st: balans.aktivi_st,
    sobstven_kapital_st: balans.aktivi_st - balans.zadalzheniya_st,
    stoynost_st: vanshni.stoynostNaSastoyanie_st ?? 0,
  };
}

/**
 * ДАННИТЕ ЗА СЪСТОЯНИЕТО · към ЕДИН ден, без период.
 *
 * Коефициентите на състоянието четат само ЗАПАСИ — салда, вземания, задължения,
 * обекти, активи, собствен капитал. Нито един от тях не зависи от прозореца на
 * периода: те са снимка, не натрупване. Затова прозорецът тук е ЕДИН ДЕН и това
 * не е хитрост, а следствие.
 *
 * И НЕ СЕ ПРИЕМА НА ДОВЕРИЕ: тест мени САМО полетата за поток и проверява, че
 * нито един коефициент на състоянието не помръдва. Ако утре някой добави към
 * тях коефициент, който чете приход, тестът пада — вместо числото тихо да
 * зависи от ден, който никой не е избирал.
 */
export function danniKamDnes(
  o: Ogledalo,
  dnes: string,
  vanshni: VanshniZaKapitala = {},
): DanniZaPerioda {
  return danniZaPerioda(o, dnes, dnes, vanshni);
}

/** Един параметър, готов за показване. */
function p(ime: string, stoynost: number, merka: Merka): Parametar {
  return Object.freeze({ ime, stoynost, merka });
}

/**
 * ТРИТЕ ЧИСЛА НА ТЕКУЩАТА КАРТИНА · средства, вземания, текущи задължения.
 *
 * Ликвидността ги ДЕЛИ, Работният капитал ги ВАДИ — но участващите числа са
 * едни и същи и трябва да се четат еднакво. Изнесени тук, защото обходът за
 * чистота ги преброи като дубликат в мига, в който вторият се появи: пет
 * еднакви реда на две места (ADR-048).
 */
function tekushtataKartina(d: DanniZaPerioda): readonly Parametar[] {
  return [
    p('средства', d.sredstva_st, 'pari'),
    p('вземания', d.vzemaniya_st, 'pari'),
    p('текущи задължения', d.zadalzheniya_st, 'pari'),
  ];
}

/**
 * СМЯТА един коефициент · и КАЗВА, когато не може.
 *
 * Делител нула не дава нула — дава ЛИПСА. „Събираемост 0 %" при нула начислено
 * е лъжа: нищо не е било дължимо, значи нищо не е пропуснато.
 */
export function smetniKoefitsient(k: Koefitsient, d: DanniZaPerioda): SmetnatKoefitsient {
  const bez = (zashto: string, parametri: readonly Parametar[]): SmetnatKoefitsient =>
    Object.freeze({ koefitsient: k, stoynost: undefined, parametri: Object.freeze([...parametri]), zashto });
  const sas = (stoynost: number, parametri: readonly Parametar[]): SmetnatKoefitsient =>
    Object.freeze({ koefitsient: k, stoynost, parametri: Object.freeze([...parametri]), zashto: '' });

  switch (k.klyuch) {
    case 'noi': {
      const par = [p('приход', d.prihod_st, 'pari'), p('оперативни разходи', d.operativni_st, 'pari')];
      return sas(d.prihod_st - d.operativni_st, par);
    }
    case 'parichen-potok': {
      const par = [p('приход', d.prihod_st, 'pari'), p('всички разходи', d.razhod_st, 'pari')];
      return sas(d.prihod_st - d.razhod_st, par);
    }
    case 'sabiraemost': {
      const par = [p('събрано', d.prihod_st, 'pari'), p('начислено', d.nachisleno_st, 'pari')];
      return d.nachisleno_st === 0
        ? bez('Нищо не е било начислено за периода — няма какво да се събира.', par)
        : sas(deliZakragleno(d.prihod_st * 10_000, d.nachisleno_st), par);
    }
    case 'oer': {
      const par = [p('оперативни разходи', d.operativni_st, 'pari'), p('приход', d.prihod_st, 'pari')];
      return d.prihod_st === 0
        ? bez('Няма приход за периода — отношение към нула не съществува.', par)
        : sas(deliZakragleno(d.operativni_st * 10_000, d.prihod_st), par);
    }
    case 'marzh': {
      const par = [p('приход', d.prihod_st, 'pari'), p('разход', d.razhod_st, 'pari')];
      return d.prihod_st === 0
        ? bez('Няма приход за периода — марж към нула не съществува.', par)
        : sas(deliZakragleno((d.prihod_st - d.razhod_st) * 10_000, d.prihod_st), par);
    }
    case 'dds-kam-prihod': {
      const par = [p('ДДС за внасяне', d.dds_za_vnasyane_st, 'pari'), p('приход', d.prihod_st, 'pari')];
      return d.prihod_st === 0
        ? bez('Няма приход за периода.', par)
        : sas(deliZakragleno(d.dds_za_vnasyane_st * 10_000, d.prihod_st), par);
    }
    case 'dscr': {
      const noi = d.prihod_st - d.operativni_st;
      const par = [p('NOI', noi, 'pari'), p('вноски по кредит', d.krediti_st, 'pari')];
      return d.krediti_st === 0
        ? bez('Няма вноски по кредит за периода — няма какво да се покрива.', par)
        : sas(deliZakragleno(noi * 100, d.krediti_st), par);
    }
    case 'zaetost': {
      const par = [p('заети обекти', d.zaeti, 'dni'), p('всички обекти', d.vsichki_obekti, 'dni')];
      return d.vsichki_obekti === 0
        ? bez('Още няма нито един обект.', par)
        : sas(deliZakragleno(d.zaeti * 10_000, d.vsichki_obekti), par);
    }
    case 'likvidnost': {
      const tekushti = d.sredstva_st + d.vzemaniya_st;
      const par = tekushtataKartina(d);
      return d.zadalzheniya_st === 0
        ? bez('Няма записани текущи задължения — ликвидността иска и двете страни.', par)
        : sas(deliZakragleno(tekushti * 100, d.zadalzheniya_st), par);
    }
    case 'dso': {
      const par = [
        p('вземания', d.vzemaniya_st, 'pari'),
        p('приход', d.prihod_st, 'pari'),
        p('дни в периода', d.dni, 'dni'),
      ];
      return d.prihod_st === 0
        ? bez('Няма приход за периода — дните до плащане нямат делител.', par)
        : sas(deliZakragleno(d.vzemaniya_st * d.dni, d.prihod_st), par);
    }
    case 'ltv': {
      const par = [
        p('остатъчна главница', d.zadalzheniya_st, 'pari'),
        p('обезпечение', d.obezpechenie_st, 'pari'),
      ];
      return d.obezpechenie_st === 0
        ? bez(
            'Няма записано обезпечението по нито един кредит. LTV без стойност на ' +
              'обезпечението е дроб без знаменател — нула тук би значела „нищо не ' +
              'дължим", а е точно обратното.',
            par,
          )
        : sas(deliZakragleno(d.zadalzheniya_st * 10_000, d.obezpechenie_st), par);
    }
    // ═══ СЕДЕМТЕ НОВИ (резен 51) · формули на занаята ═══
    case 'zadlazhnyalost': {
      const par = [p('задължения', d.zadalzheniya_st, 'pari'), p('активи', d.aktivi_st, 'pari')];
      return d.aktivi_st === 0
        ? bez('Няма записани активи — отношение към нула не съществува.', par)
        : sas(deliZakragleno(d.zadalzheniya_st * 10_000, d.aktivi_st), par);
    }
    case 'dalg-kam-kapital': {
      const par = [
        p('задължения', d.zadalzheniya_st, 'pari'),
        p('собствен капитал', d.sobstven_kapital_st, 'pari'),
      ];
      // ОТРИЦАТЕЛЕН собствен капитал НЕ дава отрицателно отношение, а ЛИПСА:
      // „минус 0,80 пъти" е число, което изглежда като отговор и не е. Когато
      // дължиш повече, отколкото държиш, отношението няма смисъл — има име, и
      // то се казва с думи.
      return d.sobstven_kapital_st <= 0
        ? bez('Собственият капитал е нула или отрицателен — дължимото надхвърля държаното.', par)
        : sas(deliZakragleno(d.zadalzheniya_st * 100, d.sobstven_kapital_st), par);
    }
    case 'dyal-na-kapitala': {
      const par = [
        p('собствен капитал', d.sobstven_kapital_st, 'pari'),
        p('активи', d.aktivi_st, 'pari'),
      ];
      return d.aktivi_st === 0
        ? bez('Няма записани активи — отношение към нула не съществува.', par)
        : sas(deliZakragleno(d.sobstven_kapital_st * 10_000, d.aktivi_st), par);
    }
    case 'raboten-kapital': {
      const par = tekushtataKartina(d);
      return sas(d.sredstva_st + d.vzemaniya_st - d.zadalzheniya_st, par);
    }
    case 'roa': {
      const par = [
        p('приход', d.prihod_st, 'pari'),
        p('разход', d.razhod_st, 'pari'),
        p('активи', d.aktivi_st, 'pari'),
      ];
      return d.aktivi_st === 0
        ? bez('Няма записани активи — отношение към нула не съществува.', par)
        : sas(deliZakragleno((d.prihod_st - d.razhod_st) * 10_000, d.aktivi_st), par);
    }
    case 'roe': {
      const par = [
        p('приход', d.prihod_st, 'pari'),
        p('разход', d.razhod_st, 'pari'),
        p('собствен капитал', d.sobstven_kapital_st, 'pari'),
      ];
      return d.sobstven_kapital_st <= 0
        ? bez('Собственият капитал е нула или отрицателен — доходност върху него не се смята.', par)
        : sas(deliZakragleno((d.prihod_st - d.razhod_st) * 10_000, d.sobstven_kapital_st), par);
    }
    case 'dohodnost': {
      const par = [
        p('NOI за периода', d.prihod_st - d.operativni_st, 'pari'),
        p('стойност на състоянието', d.stoynost_st, 'pari'),
      ];
      // НУЛА ТУК НЕ Е НУЛА, а „още не е смятана". Калкулаторът дава стойността;
      // без него доходността би излязла 0 % при напълно здрав имот.
      return d.stoynost_st === 0
        ? bez('Стойността на състоянието още не е смятана — Калкулаторът я дава.', par)
        : sas(deliZakragleno((d.prihod_st - d.operativni_st) * 10_000, d.stoynost_st), par);
    }
    case 'dalg-kam-ebitda': {
      const noi = d.prihod_st - d.operativni_st;
      const par = [p('остатъчна главница', d.zadalzheniya_st, 'pari'), p('NOI', noi, 'pari')];
      return noi <= 0
        ? bez(
            'NOI за периода не е положителен — дълг, разделен на нула или на ' +
              'загуба, не казва „за колко периода се изплаща".',
            par,
          )
        : sas(deliZakragleno(d.zadalzheniya_st * 100, noi), par);
    }
    default:
      throw new GreshkaKoefitsient(`Няма сметка за коефициент „${k.klyuch}".`);
  }
}

/**
 * ПРИРАВНЯВАНЕТО КЪМ ГОДИНА · и трите му отговора.
 *
 * Отказва С ДУМИ, вместо да върне число, което изглежда вярно. Това е същото
 * правило като „от нула на нещо няма процент" (ADR-030): по-добре липса, която
 * се вижда, отколкото стойност, на която някой ще повярва.
 */
export function priravniKamGodina(s: SmetnatKoefitsient, mesetsi: number): number {
  const kak = PRIRAVNYAVANETO[s.koefitsient.vid];
  if (kak !== 'mnozhi' && kak !== 'deli') {
    throw new GreshkaKoefitsient(
      `„${s.koefitsient.ime}" не се приравнява към година: ${ZASHTO_PRIRAVNYAVANE[kak]}`,
    );
  }
  if (s.stoynost === undefined) {
    throw new GreshkaKoefitsient(`„${s.koefitsient.ime}" няма стойност за приравняване.`);
  }
  if (!Number.isInteger(mesetsi) || mesetsi < 1) {
    throw new GreshkaKoefitsient('Месеците в периода са цяло число, не по-малко от едно.');
  }
  // ДВЕ ПОСОКИ, ЕДНА ДРОБ. Потокът в ЧИСЛИТЕЛЯ се умножава по 12 ÷ месеците;
  // потокът в ЗНАМЕНАТЕЛЯ — дели се на същото, тоест умножава се по месеците
  // ÷ 12. Обърнеш ли ги, тримесечен дълг/доход става четири пъти по-малък.
  return kak === 'mnozhi'
    ? deliZakragleno(s.stoynost * 12, mesetsi)
    : deliZakragleno(s.stoynost * mesetsi, 12);
}

/** Може ли изобщо · за екрана, без да се хвърля. */
export function mozheDaSePriravni(k: Koefitsient): boolean {
  const kak = PRIRAVNYAVANETO[k.vid];
  return kak === 'mnozhi' || kak === 'deli';
}

/**
 * СТОЙНОСТТА С ДУМИ · всяка мярка се пише по своя начин.
 *
 * Парите се подават на викащия, защото те носят ВАЛУТА (И96 т.7), а ядрото не
 * знае коя е избрана. Останалите три се пишат тук — те нямат валута.
 */
export function sDumiStoynost(
  s: SmetnatKoefitsient,
  pariSDumi: (st: number) => string,
): string {
  if (s.stoynost === undefined) return '—';
  switch (s.koefitsient.merka) {
    case 'pari':
      return pariSDumi(s.stoynost);
    case 'protsent':
      return `${(s.stoynost / 100).toFixed(2)} %`;
    case 'pati':
      return `${(s.stoynost / 100).toFixed(2)}×`;
    case 'dni':
      return `${s.stoynost}`;
  }
}
