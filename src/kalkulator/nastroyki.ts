/**
 * НАСТРОЙКИТЕ НА КАЛКУЛАТОРА · секция „Калкулатор" · ВХОДЪТ.
 *
 * Негови думи (И96 т.2), дословно и цялото искане в едно изречение:
 *
 *   „За калкулатора съм казал много пъти. **Аз не разбирам как се смята**,
 *    искам да видиш проучването си и да направиш такова за дава начина на
 *    смятане и да ми ги предложиш **с разлика в цената в 2 графи как се смята
 *    и какви стойности ти трябват**… и ги напиши като възможно за въвеждане
 *    **с легенда и пример за коефициент или меню с тези нужни филтри**. Аз не
 *    знам. **Ако се налага направи секция Калкулатор и секция Ценова листа.**"
 *
 * Оттам излизат три неща, и този файл е първото:
 *
 *   1 · ВХОДЪТ · всяка стойност, която сметката иска, е ПОЛЕ — тук  (този файл)
 *   2 · КАК СЕ СМЯТА · ред по ред, с легенда и пример      (`razbivka.ts`)
 *   3 · ИЗХОДЪТ · двете графи и разликата         (`stoynost.ts` · Ценова листа)
 *
 * ═══ ЗАЩО СТЪПКИ, А НЕ СВОБОДНО ЧИСЛО ═══
 *
 * „Аз не знам" е неговото изречение. Поле, което иска „коефициент за етаж",
 * не му помага — той няма откъде да знае дали е 0,92 или 1,20. Затова всеки
 * коефициент е **МЕНЮ ОТ ИМЕНОВАНИ СТЪПКИ** („партер", „среден", „последен"),
 * всяка с готово число и с казано ЗАЩО. Изборът е дума; числото стои до нея и
 * се редактира от онзи, който има свое.
 *
 * Това е и неговото „меню с тези нужни филтри" — менюто Е филтърът.
 *
 * ═══ ВСИЧКО В ЦЕЛИ БАЗИСНИ ТОЧКИ ═══
 *
 * 1,00 = 10 000 б.т.; 0,92 = 9 200. Никакъв float (правило 3). Умножават се
 * цели числа и се дели ВЕДНЪЖ, накрая — сметката живее в `matritsa.ts`.
 *
 * ═══ ЕДИН ФАКТ, ЕДИН ДОМ (правило 17) ═══
 *
 * Числата на коефициентите живеят ТУК и никъде другаде. `MATRITSA_ZA_RAZRABOTKA`
 * вече не ги носи собствени — тя се СТРОИ оттук (`matritsaOtNastroyki`). Дотук
 * стояха на две места и се бяха разминали: изложение „Ю" беше 1,05 в матрицата
 * и 1,03 в проучването. Разминаването не се забелязва, докато някой не сравни
 * двете — затова домът е един.
 */

import type { VidObekt } from './chetene.js';
// САМО ТИП · внос на тип се изтрива при превода и не прави кръг: двигателят
// внася числа ОТТУК, а оттук се внася само формата, която той връща.
import type { Matritsa } from './matritsa.js';

/**
 * Една базисна точка е 1/10 000. Коефициент 1,00 = 10 000 б.т.
 *
 * Домът на мерната единица е ТУК, при коефициентите, а не при двигателя:
 * двигателят я ПОЛЗВА, тя не е негова. (`matritsa.ts` я преизнася, за да не
 * се чупи нито един стар внос.)
 */
export const EDINITSA_BT = 10_000;

export class GreshkaNastroyki extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaNastroyki';
  }
}

// ── СТЪПКАТА · един избор в едно меню ──────────────────────────────────────

/** Една стъпка в коефициент: дума, число и защо. */
export interface Stapka {
  /** ключът е латиница и не се превежда — той е адресът на стъпката */
  readonly klyuch: string;
  /** каквото пише в менюто */
  readonly ime: string;
  /** коефициентът в цели базисни точки · 10 000 = 1,00 = „нищо не се променя" */
  readonly bt: number;
}

/** Кои коефициенти има. Изброени поименно — не се откриват от данните. */
export const KLYUCHOVE_KOEFITSIENTI = [
  'etazh',
  'sastoyanie',
  'izlozhenie',
  'vazrast',
  'asansior',
] as const;

export type KlyuchKoefitsient = (typeof KLYUCHOVE_KOEFITSIENTI)[number];

/** Едно меню: име, легенда и стъпките му. */
export interface Koefitsient {
  readonly klyuch: KlyuchKoefitsient;
  readonly ime: string;
  /** ЛЕГЕНДАТА · какво мени и защо занаятът го брои (негово искане) */
  readonly zashto: string;
  readonly stapki: readonly Stapka[];
  /** ключът на стъпката по подразбиране */
  readonly podrazbirano: string;
}

/**
 * ПЕТТЕ КОЕФИЦИЕНТА · стойностите от проучването за И96.
 *
 * Занаятът смята корекциите или в абсолютна сума, или в процент; корекцията за
 * състояние обичайно НЕ надхвърля 10 %. Оттам са и границите.
 *
 * ЧИСЛАТА ЧАКАТ НЕГО. Тези са за разработка и се редактират от екрана —
 * „базовата цена и коефициентите" са изрично негови (И97 · само Стопанинът).
 */
export const KOEFITSIENTI: readonly Koefitsient[] = Object.freeze([
  Object.freeze({
    klyuch: 'etazh' as const,
    ime: 'Етаж',
    zashto:
      'Партерът се търгува под средното заради шум и поглед отвън; последният — заради покрива. ' +
      'Средните етажи са мерилото. „Последен" и „предпоследен" не се четат от файла — ' +
      'файлът казва кой е етажът, не колко са, затова те се ИЗБИРАТ.',
    stapki: Object.freeze([
      Object.freeze({ klyuch: 'parter', ime: 'партер', bt: 9_200 }),
      Object.freeze({ klyuch: 'parvi-vtori', ime: 'първи или втори', bt: 9_800 }),
      Object.freeze({ klyuch: 'sreden', ime: 'среден', bt: 10_000 }),
      Object.freeze({ klyuch: 'predposleden', ime: 'предпоследен', bt: 10_200 }),
      Object.freeze({ klyuch: 'posleden', ime: 'последен', bt: 9_600 }),
    ]),
    podrazbirano: 'sreden',
  }),
  Object.freeze({
    klyuch: 'sastoyanie' as const,
    ime: 'Състояние',
    zashto:
      'Най-спорната корекция в занаята — затова е и най-стегната: от −15 % до +8 %. ' +
      'Ремонт, който струва 20 000 €, рядко вдига цената с 20 000 €.',
    stapki: Object.freeze([
      Object.freeze({ klyuch: 'osnoven-remont', ime: 'за основен ремонт', bt: 8_500 }),
      Object.freeze({ klyuch: 'osvezhavane', ime: 'за освежаване', bt: 9_300 }),
      Object.freeze({ klyuch: 'dobro', ime: 'добро', bt: 10_000 }),
      Object.freeze({ klyuch: 'novo-luks', ime: 'ново или луксозно', bt: 10_800 }),
    ]),
    podrazbirano: 'dobro',
  }),
  Object.freeze({
    klyuch: 'izlozhenie' as const,
    ime: 'Изложение',
    zashto:
      'Слънцето е разликата: юг топли и се търси, север не. Осемте посоки от неговата ' +
      'листа (Ю · ЮИ · ЮЗ · И · З · С · СИ · СЗ) падат в тези три стъпки — по-фино ' +
      'деление се преструва на точност, каквато пазарът няма.',
    stapki: Object.freeze([
      Object.freeze({ klyuch: 'sever', ime: 'север', bt: 9_700 }),
      Object.freeze({ klyuch: 'iztok-zapad', ime: 'изток или запад', bt: 10_000 }),
      Object.freeze({ klyuch: 'yug', ime: 'юг', bt: 10_300 }),
    ]),
    podrazbirano: 'iztok-zapad',
  }),
  Object.freeze({
    klyuch: 'vazrast' as const,
    ime: 'Възраст',
    zashto:
      'Не самата година, а овехтяването: инсталации, дограма, конструкция. ' +
      'Новото носи гаранция; старото носи предстоящ разход.',
    stapki: Object.freeze([
      Object.freeze({ klyuch: 'nad-40', ime: 'над 40 години', bt: 9_000 }),
      Object.freeze({ klyuch: '20-40', ime: 'от 20 до 40 години', bt: 9_500 }),
      Object.freeze({ klyuch: '5-20', ime: 'от 5 до 20 години', bt: 10_000 }),
      Object.freeze({ klyuch: 'pod-5', ime: 'под 5 години', bt: 10_500 }),
    ]),
    podrazbirano: '5-20',
  }),
  Object.freeze({
    klyuch: 'asansior' as const,
    ime: 'Асансьор',
    zashto:
      'Мени цената само нагоре по етажите, но се брои на целия обект — ' +
      'сграда без асансьор губи купувачи независимо от етажа.',
    stapki: Object.freeze([
      Object.freeze({ klyuch: 'nyama', ime: 'няма', bt: 9_600 }),
      Object.freeze({ klyuch: 'ima', ime: 'има', bt: 10_000 }),
    ]),
    podrazbirano: 'ima',
  }),
]);

/** Менюто по ключ · отказът е с думи, защото сгрешен ключ е грешка в кода. */
export function koefitsient(klyuch: KlyuchKoefitsient): Koefitsient {
  const k = KOEFITSIENTI.find((x) => x.klyuch === klyuch);
  if (!k) throw new GreshkaNastroyki(`Няма коефициент „${klyuch}".`);
  return k;
}

/** Стъпката по ключ; непознатият ключ пада на подразбираната — не на грешка. */
export function stapka(k: Koefitsient, klyuch: string): Stapka {
  return (
    k.stapki.find((s) => s.klyuch === klyuch) ??
    k.stapki.find((s) => s.klyuch === k.podrazbirano) ??
    k.stapki[0]!
  );
}

// ── ДОБАВКИТЕ · и защо НЕ са на квадратен метър ────────────────────────────

/**
 * Гараж, паркомясто, мазе.
 *
 * Тук масовите калкулатори грешат най-често, и грешката е системна: 12 кв.м
 * паркомясто в центъра и 12 кв.м в квартала са РАЗЛИЧНИ продукти, а цената на
 * кв.м жилище няма нищо общо с нито едно от двете.
 *
 * Затова добавката е два вида, и видът е свойство на самата добавка:
 *
 *   `broy`   — ЦЯЛА цена за брой; площта не участва (гараж · паркомясто)
 *   `plosht` — процент от базата, по площ (мазе · таван · 15–30 % от жилищния кв.м)
 *
 * Двете влизат СЛЕД умножението по коефициентите: коефициентът за изложение
 * не мени цената на едно мазе.
 */
export const VIDOVE_DOBAVKA = ['broy', 'plosht'] as const;

export type VidDobavka = (typeof VIDOVE_DOBAVKA)[number];

export interface Dobavka {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidDobavka;
  /** при `broy` — цели центове за БРОЙ; при `plosht` — дял от базата в б.т. */
  readonly stoynost: number;
  readonly zashto: string;
}

export const DOBAVKI: readonly Dobavka[] = Object.freeze([
  Object.freeze({
    klyuch: 'garazh',
    ime: 'Гараж',
    vid: 'broy' as const,
    stoynost: 18_000_00,
    zashto: 'Цяла цена за брой. Надбавка за врата с ток и за широчина над 2,60 м се вписва тук.',
  }),
  Object.freeze({
    klyuch: 'parkomyasto',
    ime: 'Паркомясто',
    vid: 'broy' as const,
    stoynost: 12_000_00,
    zashto: 'Цяла цена за брой, по район. Квадратните метри не значат нищо при паркомясто.',
  }),
  Object.freeze({
    klyuch: 'maze',
    ime: 'Мазе или таван',
    vid: 'plosht' as const,
    stoynost: 2_000,
    zashto: 'Площ, която не се обитава — 20 % от жилищния квадрат. Занаятът брои 15–30 %.',
  }),
]);

/** Колко добавя една добавка към цената, в цели центове. */
export function dobavka_st(d: Dobavka, n: { readonly broy: number; readonly kvsm: number; readonly baza_st: number }): number {
  if (d.vid === 'broy') return d.stoynost * Math.max(0, Math.trunc(n.broy));
  // площ (кв.см) × база (ст./м²) × дял (б.т.) ÷ (10 000 · 10 000)
  const gore = BigInt(Math.max(0, n.kvsm)) * BigInt(n.baza_st) * BigInt(d.stoynost);
  const dolu = 10_000n * BigInt(EDINITSA_BT);
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

// ── ДОХОДНОСТТА · скала по клас, не свободно число ─────────────────────────

/**
 * КЛАСОВЕТЕ на доходността.
 *
 * „При доходност 5 % множителят е 20; при 6 % — 16,7. Тоест разликата от един
 * процентен пункт мени стойността с 20 %" — затова доходността не е число в
 * кода, а видим избор с обяснение.
 *
 * Четвъртият ред е РАЗЛИЧЕН от първите три и това е нарочно: първите три са
 * СКАЛАТА на занаята (какво се ИЗБИРА при оценка), четвъртият е ИЗМЕРЕНОТО за
 * жилища в София (какво пазарът ДАВА). Той стои в същия списък, за да се вижда
 * разликата — при 3 000 €/м² подразбиращата се доходност излиза около 2,5 %,
 * доста под скалата. Числото не казва „грешка"; то казва, че тук се плаща за
 * запазване на стойност, не за доход.
 */
export interface Klas {
  readonly klyuch: string;
  readonly ime: string;
  readonly ot_bt: number;
  readonly do_bt: number;
  readonly bt: number;
  readonly zashto: string;
}

export const KLASOVE: readonly Klas[] = Object.freeze([
  Object.freeze({
    klyuch: 'pazar',
    ime: 'пазарът · жилища в София',
    ot_bt: 300,
    do_bt: 350,
    bt: 320,
    zashto: 'Измереното, не избраното. Жилищата тук се държат за стойност, не за доход.',
  }),
  Object.freeze({
    klyuch: 'a',
    ime: 'Клас А · първокласен',
    ot_bt: 450,
    do_bt: 550,
    bt: 500,
    zashto: 'Централно, дългосрочен наемател, нисък риск — затова и ниска доходност.',
  }),
  Object.freeze({
    klyuch: 'b',
    ime: 'Клас Б · добър',
    ot_bt: 550,
    do_bt: 700,
    bt: 600,
    zashto: 'Добър район, обичайният случай при оценка на доходен имот.',
  }),
  Object.freeze({
    klyuch: 'v',
    ime: 'Клас В · периферен',
    ot_bt: 700,
    do_bt: 900,
    bt: 800,
    zashto: 'По-къси договори и по-висок риск — купувачът иска повече, за да поеме.',
  }),
]);

export function klas(klyuch: string): Klas {
  return KLASOVE.find((k) => k.klyuch === klyuch) ?? KLASOVE[0]!;
}

// ── НАСТРОЙКИТЕ · всичко, което сметката иска, на едно място ───────────────

export interface Nastroyki {
  /** името на района — нов район е нов ред, не нов код */
  readonly rayon: string;
  /** базата в цели центове за квадратен метър, по вид обект */
  readonly baza_st: Readonly<Record<VidObekt, number>>;
  /** избраната стъпка по коефициент · ключ на коефициента → ключ на стъпката */
  readonly izbrani: Readonly<Record<KlyuchKoefitsient, string>>;
  /** класът, с който се капитализира */
  readonly klas: string;
  /** доходността в б.т. · тръгва от класа, но се редактира */
  readonly dohodnost_bt: number;
  /** незаетост в б.т. — колко от годината обектът стои празен */
  readonly nezaetost_bt: number;
  /** оперативни разходи в б.т. ОТ наема — поддръжка, данъци, такси */
  readonly operativni_bt: number;
  /** очакван наем в центове на кв.м на месец · ползва се само без Журнал */
  readonly naem_st_kvm: Readonly<Record<VidObekt, number>>;
}

/**
 * НАСТРОЙКИТЕ ЗА РАЗРАБОТКА. Всяко число тук чака него.
 *
 * Базата е **3 000 €/м²** — негово число, казано многократно, и проверено
 * срещу собствената му листа („ЦЕНИ МД нова.xlsx": 2 838–3 151 €/м²).
 */
export const PO_PODRAZBIRANE: Nastroyki = Object.freeze({
  rayon: 'Малинова долина',
  baza_st: Object.freeze({
    apartament: 300_000, // 3 000 € · неговото число
    garazh: 100_000,
    parkomyasto: 190_000,
    sklad: 133_000,
    drug: 300_000,
  }),
  izbrani: Object.freeze({
    etazh: 'sreden',
    sastoyanie: 'dobro',
    izlozhenie: 'iztok-zapad',
    vazrast: '5-20',
    asansior: 'ima',
  }),
  klas: 'pazar',
  dohodnost_bt: 320,
  nezaetost_bt: 800, // 8 % — един месец на година празен
  operativni_bt: 1_500, // 15 % от наема
  naem_st_kvm: Object.freeze({
    apartament: 850, // 8,50 €/м²/месец
    garazh: 120,
    parkomyasto: 80,
    sklad: 100,
    drug: 850,
  }),
});

// ── РЕДАКЦИЯТА · и границите, които пазят сметката ─────────────────────────

/**
 * Границите на коефициент. Под 0,50 и над 2,00 не е корекция, а друга цена —
 * и почти винаги е сбъркано въвеждане (1,05 написано като 105).
 */
export const NAY_MALAK_BT = 5_000;
export const NAY_GOLYAM_BT = 20_000;

/**
 * ПРОВЕРКА на настройките · всички находки наведнъж, не първата.
 *
 * Първата находка спира поправката на едно място; човекът поправя, натиска пак,
 * вижда втора. Същото правило като при цветовете на въвеждането (ADR-032).
 */
export function proveriNastroyki(n: Nastroyki): readonly string[] {
  const nahodki: string[] = [];
  for (const [vid, baza] of Object.entries(n.baza_st)) {
    if (!Number.isSafeInteger(baza) || baza <= 0) {
      nahodki.push(`Базата за „${vid}" трябва да е цяло число над нула; получено: ${baza}`);
    }
  }
  if (n.dohodnost_bt <= 0) {
    nahodki.push('Доходност нула или под нула не капитализира — Графа Б е невъзможна.');
  }
  if (n.nezaetost_bt < 0 || n.nezaetost_bt >= EDINITSA_BT) {
    nahodki.push('Незаетостта е дял от годината — между 0 и 100 %.');
  }
  if (n.operativni_bt < 0 || n.operativni_bt >= EDINITSA_BT) {
    nahodki.push('Оперативните разходи са дял от наема — между 0 и 100 %.');
  }
  for (const k of KOEFITSIENTI) {
    const s = stapka(k, n.izbrani[k.klyuch]);
    if (s.bt < NAY_MALAK_BT || s.bt > NAY_GOLYAM_BT) {
      nahodki.push(
        `Коефициентът „${k.ime} · ${s.ime}" е ${vProtsent(s.bt)} — извън 0,50–2,00. ` +
          'Проверете дали 1,05 не е въведено като 105.',
      );
    }
  }
  return Object.freeze(nahodki);
}

/** Сменя избраната стъпка на един коефициент. */
export function sIzbranaStapka(
  n: Nastroyki,
  klyuch: KlyuchKoefitsient,
  stapkaKlyuch: string,
): Nastroyki {
  const k = koefitsient(klyuch);
  if (!k.stapki.some((s) => s.klyuch === stapkaKlyuch)) {
    throw new GreshkaNastroyki(`„${k.ime}" няма стъпка „${stapkaKlyuch}".`);
  }
  return Object.freeze({
    ...n,
    izbrani: Object.freeze({ ...n.izbrani, [klyuch]: stapkaKlyuch }),
  });
}

/**
 * Сменя класа · и доходността тръгва с него.
 *
 * Класът НОСИ число, но не го заковава: след смяната доходността може да се
 * редактира отделно и класът остава като указание откъде е тръгнала.
 */
export function sKlas(n: Nastroyki, klyuch: string): Nastroyki {
  const k = klas(klyuch);
  return Object.freeze({ ...n, klas: k.klyuch, dohodnost_bt: k.bt });
}

/** Сменя базата за един вид обект. */
export function sBaza(n: Nastroyki, vid: VidObekt, baza_st: number): Nastroyki {
  if (!Number.isSafeInteger(baza_st) || baza_st <= 0) {
    throw new GreshkaNastroyki(`Базата се дава в цели центове над нула; получено: ${baza_st}`);
  }
  return Object.freeze({ ...n, baza_st: Object.freeze({ ...n.baza_st, [vid]: baza_st }) });
}

// ── МОСТЪТ КЪМ ДВИГАТЕЛЯ ───────────────────────────────────────────────────

/**
 * ДУМАТА ОТ ФАЙЛА → СТЪПКА.
 *
 * Неговата листа пише етажа с дума („партер", „трети", „подземен") и
 * изложението с посока („ЮИ"). Тези думи НЕ са стъпки — те са входът, от който
 * стъпката се познава.
 *
 * КАКВО НЕ СЕ ПОЗНАВА ОТ ДУМА: „последен" и „предпоследен". Файлът казва кой е
 * етажът, не колко са етажите — а без второто последният етаж е неизвестен.
 * Затова тези две стъпки се ИЗБИРАТ в секция Калкулатор и никога не се гадаят.
 */
const ETAZH_OT_DUMA: Readonly<Record<string, string>> = Object.freeze({
  подземен: 'parter',
  партер: 'parter',
  терен: 'parter',
  сутерен: 'parter',
  първи: 'parvi-vtori',
  втори: 'parvi-vtori',
  трети: 'sreden',
  четвърти: 'sreden',
  пети: 'sreden',
  шести: 'sreden',
  седми: 'sreden',
  осми: 'sreden',
});

const IZLOZHENIE_OT_DUMA: Readonly<Record<string, string>> = Object.freeze({
  Ю: 'yug',
  ЮИ: 'yug',
  ЮЗ: 'yug',
  И: 'iztok-zapad',
  З: 'iztok-zapad',
  С: 'sever',
  СИ: 'sever',
  СЗ: 'sever',
});

/**
 * Коефициентът в б.т. за дума от неговия файл.
 *
 * Непозната или празна дума дава 1,00 — неизвестното НЕ мени цената. Това е
 * честно: измисленият коефициент лъже по-лошо от липсващия.
 */
export function btOtDumata(klyuch: KlyuchKoefitsient, duma: string): number {
  const t = duma.trim();
  if (t === '') return EDINITSA_BT;
  const karta =
    klyuch === 'etazh' ? ETAZH_OT_DUMA : klyuch === 'izlozhenie' ? IZLOZHENIE_OT_DUMA : undefined;
  if (!karta) return EDINITSA_BT;
  const stapkaKlyuch = karta[t] ?? karta[t.toLowerCase()] ?? karta[t.toUpperCase()];
  if (stapkaKlyuch === undefined) return EDINITSA_BT;
  return stapka(koefitsient(klyuch), stapkaKlyuch).bt;
}

/**
 * СТРОИ матрицата на двигателя от настройките.
 *
 * Двигателят (`matritsa.ts`) чете етажа и изложението КАТО ДУМИ от файла —
 * затова тук думите се превръщат в карти. Останалите три коефициента
 * (състояние · възраст · асансьор) не са в неговия файл: те са ИЗБОР и влизат
 * през секция Калкулатор, не през партидата.
 */
export function matritsaOtNastroyki(n: Nastroyki): Matritsa {
  const etazhi: Record<string, number> = {};
  for (const duma of Object.keys(ETAZH_OT_DUMA)) etazhi[duma] = btOtDumata('etazh', duma);
  const izlozheniya: Record<string, number> = {};
  for (const duma of Object.keys(IZLOZHENIE_OT_DUMA)) {
    izlozheniya[duma] = btOtDumata('izlozhenie', duma);
  }
  return Object.freeze({
    rayon: n.rayon,
    baza_st: n.baza_st,
    etazhi: Object.freeze(etazhi),
    izlozheniya: Object.freeze(izlozheniya),
    naem_st_kvm: n.naem_st_kvm,
    dohodnost_bt: n.dohodnost_bt,
    nezaetost_bt: n.nezaetost_bt,
    operativni_bt: n.operativni_bt,
    obshti_bt: obshtiyatMnozhitel_bt(n),
  });
}

/**
 * ТРИТЕ КОЕФИЦИЕНТА, КОИТО ВАЖАТ ЗА ЦЯЛАТА ПАРТИДА.
 *
 * Състояние, възраст и асансьор ги няма в неговия файл — и не бива да ги има:
 * те са свойства на СГРАДАТА, не на отделния обект. „Малинова Долина" е една
 * сграда: тя е нова, с асансьор, и това важи за всеки апартамент в нея.
 *
 * Затова се умножават НАВЕДНЪЖ, като общ множител на партидата. Без това
 * секция „Калкулатор" щеше да е табло: три от петте менюта щяха да мърдат
 * само примера, а листата долу нямаше да ги усети.
 *
 * Смята се в цели базисни точки и се дели ВЕДНЪЖ — три коефициента, събрани
 * във float, дават число, което не се повтаря при второ смятане.
 */
export function obshtiyatMnozhitel_bt(n: Nastroyki): number {
  let gore = BigInt(EDINITSA_BT);
  let dolu = 1n;
  for (const klyuch of ['sastoyanie', 'vazrast', 'asansior'] as const) {
    gore *= BigInt(stapka(koefitsient(klyuch), n.izbrani[klyuch]).bt);
    dolu *= BigInt(EDINITSA_BT);
  }
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

// ── ИЗПИСВАНЕТО ────────────────────────────────────────────────────────────

/** Базисни точки като коефициент: 9 200 → „0,920". */
export function vKoefitsient(bt: number): string {
  const znak = bt < 0 ? '−' : '';
  const a = Math.abs(bt);
  return `${znak}${Math.floor(a / EDINITSA_BT)},${String(a % EDINITSA_BT).padStart(4, '0').slice(0, 3)}`;
}

/** Базисни точки като процент: 320 → „3,20 %". */
export function vProtsent(bt: number): string {
  const znak = bt < 0 ? '−' : '';
  const a = Math.abs(bt);
  return `${znak}${Math.floor(a / 100)},${String(a % 100).padStart(2, '0')} %`;
}

/** С колко ПРОЦЕНТА мени коефициентът: 9 200 → „−8,00 %"; 10 000 → „0,00 %". */
export function kolkoMeni(bt: number): string {
  const razlika = bt - EDINITSA_BT;
  if (razlika === 0) return '0,00 %';
  return `${razlika > 0 ? '+' : '−'}${vProtsent(Math.abs(razlika))}`;
}
