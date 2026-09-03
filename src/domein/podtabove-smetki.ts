/**
 * ПОДТАБОВЕТЕ НА СМЕТКИ · главния и четирите (резен 115 · ADR-161).
 *
 * Негово, 03.09 (И136): „Табовете в СМетки са главния Сметки и подтабове:
 * Приход, Разход, Отчвт, Баланс."
 *
 * ═══ ЕКРАНЪТ СЕ КАЗВА ПАК „СМЕТКИ" ═══
 *
 * ADR-120 §6 го преименува на „Баланс". Тази дума го надживява: Баланс става
 * ЕДИН от петте подтаба, а екранът носи старото си име. Последната дума бие
 * (правило 28), и мястото на факта е тук — един дом (правило 17).
 *
 * ═══ ПЛОЧКИТЕ СТОЯТ НАД ПОДТАБОВЕТЕ ═══
 *
 * „данните от подтаб на Сметки Баланс се взимат и се вкарват и участват в
 * показаните полета с данни отгоре. Те участват в сметките и на Коефициентите
 * в Отчети." Затова плочките и периодът НЕ влизат в нито един подтаб: те се
 * рисуват веднъж, над лентата, и се виждат на всеки. Подтаб, който крие
 * собствения си хранител, би показал числа без произход.
 *
 * ═══ КОЯ СЕКЦИЯ КЪДЕ ═══
 *
 * Всяка секция на екрана има ЕДИН подтаб. Непозната секция пада в главния —
 * по-добре видяна на грешното място, отколкото изчезнала (правило 15). Списъкът
 * е ПИН С РЪКА: той е договорът между този файл и рисувача, и тест го брои.
 */

export const PODTABOVE_NA_SMETKI = Object.freeze([
  Object.freeze({ klyuch: 'smetki', ime: 'Сметки', opis: 'салдата · делата · таблицата и диаграмата' }),
  Object.freeze({ klyuch: 'prihod', ime: 'Приход', opis: 'влизащите пари и таблиците им' }),
  Object.freeze({ klyuch: 'razhod', ime: 'Разход', opis: 'разходите · заплатите · кредитите' }),
  Object.freeze({ klyuch: 'otchet', ime: 'Отчет', opis: 'коефициентите · гнездата · полетата с формула' }),
  Object.freeze({ klyuch: 'balans', ime: 'Баланс', opis: 'потоците · ДДС · сверките · счетоводството' }),
]);

export type KlyuchPodtabSmetki = (typeof PODTABOVE_NA_SMETKI)[number]['klyuch'];

/** Подразбраният подтаб · главният, същият, с който екранът се отваря днес. */
export const PARVIYAT_PODTAB: KlyuchPodtabSmetki = 'smetki';

const KADE: Readonly<Record<string, KlyuchPodtabSmetki>> = Object.freeze({
  // ── СМЕТКИ · състоянието сега и работата с делата ──
  'smetki-salda': 'smetki',
  'smetki-dela': 'smetki',
  'smetki-dela-diagrama': 'smetki',
  'smetki-dela-tablitsa': 'smetki',
  'smetki-razbivki': 'smetki',
  'smetki-mesetsat': 'smetki',
  'smetki-kalendar': 'smetki',

  // ── ПРИХОД · влизащите пари и внесените таблици ──
  'smetki-prihodite': 'prihod',
  'tablitsa-ot-fayl': 'prihod',
  'sazdadenite-tablitsi': 'prihod',
  'semeystvo-kato-edna': 'prihod',

  // ── РАЗХОД · излизащите пари ──
  'smetki-razhodite': 'razhod',
  'smetki-nov-razhod': 'razhod',
  'smetki-razhodi': 'razhod',
  'razhodi-pogasenite': 'razhod',
  zaplati: 'razhod',
  'zaplati-prehvarlyane': 'razhod',
  krediti: 'razhod',
  'krediti-red': 'razhod',
  'krediti-plan': 'razhod',
  'krediti-predstoyashti': 'razhod',
  'kredit-kalkulator': 'razhod',
  'smetki-kalkulator': 'razhod',

  // ── ОТЧЕТ · коефициентите, гнездата, полетата с формула ──
  'otchet-dela': 'otchet',
  'otchet-dyal': 'otchet',
  'smetki-otcheti': 'otchet',
  'smetki-poleta-formula': 'otchet',
  'koef-izbor': 'otchet',
  'koef-izbraniyat': 'otchet',
  'koef-sastoyanie': 'otchet',
  'koef-svoy': 'otchet',
  'koef-vsichki': 'otchet',

  // ── БАЛАНС · потоците, ДДС, сверките и счетоводството ──
  'smetki-smetki': 'balans',
  'prodazhbi-granitsa': 'balans',
  'smetki-dds': 'balans',
  'smetki-sverka-dds': 'balans',
  'smetki-sverka': 'balans',
  'smetki-spravka': 'balans',
  'smetki-izvlechenie': 'balans',
  'nap-spravki': 'balans',
});

/** Подтабът на една секция · непознатата пада в главния, вместо да изчезне. */
export function podtabatNaSmetki(sektsiya: string): KlyuchPodtabSmetki {
  return KADE[sektsiya] ?? PARVIYAT_PODTAB;
}

/** Секциите, картирани поименно · броят им се БРОИ, не се преписва. */
export function sektsiiteNaSmetki(): readonly string[] {
  return Object.freeze(Object.keys(KADE));
}

/** Секциите на един подтаб · за сверка вход↔изход на картата. */
export function sektsiiteNaPodtab(klyuch: KlyuchPodtabSmetki): readonly string[] {
  return Object.freeze(Object.keys(KADE).filter((s) => KADE[s] === klyuch));
}

/**
 * КЛЮЧЪТ НА ПАМЕТТА НА ПАДАЩИЯ РЕД · ПО ПОДТАБ (резен 115 · ADR-161).
 *
 * Редът на екрана се строи от паметта на устройството, а тя се пълни от онова,
 * което е нарисувано. Сметки рисува ЕДИН подтаб наведнъж — значи една обща
 * памет би носела една пета от екрана, а всеки опит да се „слива" старото с
 * новото е гадаене кое е още вярно. Затова паметта е ПЕТ ключа: всеки подтаб
 * пише само своя, когато е нарисуван, и нищо не пипа чуждите.
 */
export function klyuchNaPametta(podtab: KlyuchPodtabSmetki): string {
  return `sektsii.smetki.${podtab}`;
}

/** Една група в падащия ред · подтабът, името му и каквото паметта пази за него. */
export interface GrupaPoPodtab<T> {
  readonly podtab: KlyuchPodtabSmetki;
  readonly ime: string;
  readonly sektsii: readonly T[];
}

/**
 * ПЕТТЕ СПИСЪКА В РЕДА НА ЛЕНТАТА · празната група пада, за да няма глава без
 * нищо под нея (правило 15). Четецът се подава, за да е чиста функцията — тя
 * не знае нито за паметта, нито за DOM-а, и затова се тества без браузър.
 */
export function podredeniPoPodtab<T>(
  cheti: (podtab: KlyuchPodtabSmetki) => readonly T[],
): readonly GrupaPoPodtab<T>[] {
  return PODTABOVE_NA_SMETKI.map((p) => ({ podtab: p.klyuch, ime: p.ime, sektsii: cheti(p.klyuch) }))
    .filter((g) => g.sektsii.length > 0);
}

export function ePodtabNaSmetki(klyuch: string): klyuch is KlyuchPodtabSmetki {
  return PODTABOVE_NA_SMETKI.some((p) => p.klyuch === klyuch);
}
