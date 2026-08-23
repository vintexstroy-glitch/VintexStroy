/**
 * МОДЕЛЪТ НА ТАБЛИЦА · приложението пита ВЕДНЪЖ и помни завинаги.
 *
 * Негови думи за банковото извлечение: „Индивидуално. **Чете и създава модела
 * вътре.**" И за таблиците изобщо: „Таблиците са всевъзможни… да избираш направо
 * готова таблица от избрания фолдър и то я пресъздава същата."
 *
 * Оттук следва целият файл. Всяка банка реди колоните си различно; всеки
 * доставчик прави своя таблица. Вместо да гадаем формати — питаме човека КОЯ
 * КОЛОНА КАКВО Е, записваме отговора, и втория път разпознаваме файла сами.
 *
 * ЗАЩО НЕ ГАДАЕМ. Разпознаване „по усет" греши веднъж на сто. В ДДС-справка
 * точно тази стотна е скъпа. По-добре един въпрос, отколкото тиха грешка.
 *
 * ЗАЩО ОТПЕЧАТЪК НА ХЕДЪРА, а не име на файла. Имената се сменят („извлечение
 * (3).csv"), хедърите — не. Разпознава се СТРУКТУРАТА, не етикетът.
 *
 * ЗАЩО В ЖУРНАЛА, а не в настройките. Моделът решава как се четат пари. Смени
 * ли се тихо, старите четения стават необясними. Затова е събитие: сверява се,
 * сторнира се, и се вижда кой го е сменил.
 */

import { kletka, type Tablitsa } from './tablitsa.js';

/**
 * Какво може да бъде една колона. Изброени са ПОИМЕННО — непозната роля не се
 * измисля в движение, а се добавя тук, където се вижда.
 */
export type Rolya =
  | 'data' // датата на реда
  | 'suma' // сумата, с ДДС както винаги
  | 'osnovanie' // за какво е
  | 'dds' // ставката ИЛИ сумата на ДДС — според `ddsE`
  | 'dokument' // номер на фактура или платежно
  | 'kontragent' // кой е отсреща
  | 'period'; // ако редът сам казва за кой месец е

export const IMENA_NA_ROLITE: Readonly<Record<Rolya, string>> = Object.freeze({
  data: 'дата',
  suma: 'сума',
  osnovanie: 'основание',
  dds: 'ДДС',
  dokument: 'документ',
  kontragent: 'контрагент',
  period: 'период',
});

/** Ролите, без които ред не може да стане запис. */
export const ZADALZHITELNI_ROLI: readonly Rolya[] = ['data', 'suma'];

export interface ModelNaTablitsa {
  /** име, дадено от човека: „Банка ОББ", „Наеми КЕШ" */
  readonly klyuch: string;
  /** на кой ред стои хедърът */
  readonly redNaGlavata: number;
  /** роля → номер на колона */
  readonly koloni: Readonly<Partial<Record<Rolya, number>>>;
  /**
   * Как се чете колоната за ДДС, ако я има:
   *   `stavka` — цял процент в клетката (0 · 9 · 20)
   *   `suma`   — самата сума на ДДС в левове
   */
  readonly ddsE?: 'stavka' | 'suma';
  /** отпечатък на ХЕДЪРА — по него се познава същата таблица втори път */
  readonly otpechatak: string;
}

export class GreshkaModel extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaModel';
  }
}

/**
 * Отпечатъкът на хедъра: заглавията, изчистени и слепени.
 *
 * Нарочно НЕ е хеш — човек трябва да може да го погледне и да каже „а, това е
 * извлечението от ОББ". Отпечатък, който само машина чете, се дебъгва трудно.
 *
 * Празните колони в края отпадат: Excel ражда по десет на всеки лист и те
 * менят отпечатъка, без да менят таблицата.
 */
export function otpechatakNaGlavata(t: Tablitsa, redNaGlavata: number): string {
  const red = [...(t.redove[redNaGlavata] ?? [])];
  while (red.length && red[red.length - 1]!.trim() === '') red.pop();
  if (red.length === 0) throw new GreshkaModel('Празен ред за глава — това не е хедър.');
  return red
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|');
}

/** Същата ли е таблицата, за която е правен моделът. */
export function poznavaLi(m: ModelNaTablitsa, t: Tablitsa): boolean {
  try {
    return otpechatakNaGlavata(t, m.redNaGlavata) === m.otpechatak;
  } catch {
    return false;
  }
}

/** Първият модел, който познава тази таблица. `undefined`, ако няма такъв. */
export function nameriModel(
  modeli: readonly ModelNaTablitsa[],
  t: Tablitsa,
): ModelNaTablitsa | undefined {
  return modeli.find((m) => poznavaLi(m, t));
}

/**
 * Прави модел от избора на човека и веднага го проверява.
 *
 * Отказва ГЛАСНО при: липсваща задължителна роля, две роли на една колона,
 * колона извън таблицата. По-добре отказ сега, отколкото криви редове после.
 */
export function napraviModel(n: {
  klyuch: string;
  tablitsa: Tablitsa;
  redNaGlavata: number;
  koloni: Readonly<Partial<Record<Rolya, number>>>;
  ddsE?: 'stavka' | 'suma';
}): ModelNaTablitsa {
  const { klyuch, tablitsa, redNaGlavata, koloni } = n;

  if (klyuch.trim() === '') throw new GreshkaModel('Моделът иска име — по него ще се търси.');

  const shirina = tablitsa.redove[redNaGlavata]?.length ?? 0;
  if (shirina === 0) throw new GreshkaModel(`Ред ${redNaGlavata} е празен — не е глава.`);

  for (const r of ZADALZHITELNI_ROLI) {
    if (koloni[r] === undefined) {
      throw new GreshkaModel(`Без колона за „${IMENA_NA_ROLITE[r]}" ред не става запис.`);
    }
  }

  const zaeti = new Map<number, Rolya>();
  for (const [rolya, kolona] of Object.entries(koloni) as [Rolya, number][]) {
    if (kolona < 0 || kolona >= shirina) {
      throw new GreshkaModel(
        `Колона ${kolona} за „${IMENA_NA_ROLITE[rolya]}" е извън таблицата (${shirina} колони).`,
      );
    }
    const veche = zaeti.get(kolona);
    if (veche) {
      throw new GreshkaModel(
        `Колона ${kolona} е дадена и на „${IMENA_NA_ROLITE[veche]}", и на ` +
          `„${IMENA_NA_ROLITE[rolya]}". Една колона — една роля.`,
      );
    }
    zaeti.set(kolona, rolya);
  }

  if (koloni.dds !== undefined && !n.ddsE) {
    throw new GreshkaModel('Има колона за ДДС, но не е казано ставка ли е, или сума.');
  }

  return Object.freeze({
    klyuch: klyuch.trim(),
    redNaGlavata,
    koloni: Object.freeze({ ...koloni }),
    ...(n.ddsE ? { ddsE: n.ddsE } : {}),
    otpechatak: otpechatakNaGlavata(tablitsa, redNaGlavata),
  });
}

/**
 * КРАТЪК БЕЛЕГ НА СЪДЪРЖАНИЕТО · за `opId`.
 *
 * Идемпотентността иска ключ, който се мени точно когато се мени моделът.
 * Ключ по име на файл или по отпечатък на хедъра НЕ става: поправиш ли една
 * колона и запишеш пак, повторният `opId` би върнал СТАРИЯ резултат и
 * поправката щеше да изчезне мълчаливо. Затова белегът е от самата карта.
 */
export function belegNaModel(m: ModelNaTablitsa): string {
  const koloni = (Object.keys(IMENA_NA_ROLITE) as Rolya[])
    .map((r) => `${r}=${m.koloni[r] ?? ''}`)
    .join(',');
  return `${m.redNaGlavata}|${koloni}|${m.ddsE ?? ''}`;
}

/** Клетката за тази роля в този ред. Празен низ, ако ролята я няма в модела. */
export function poRolya(m: ModelNaTablitsa, t: Tablitsa, red: number, rolya: Rolya): string {
  const kolona = m.koloni[rolya];
  return kolona === undefined ? '' : kletka(t, red, kolona);
}

/** Редовете с данни — всичко под главата. */
export function redoveSDanni(m: ModelNaTablitsa, t: Tablitsa): readonly number[] {
  const nomera: number[] = [];
  for (let i = m.redNaGlavata + 1; i < t.redove.length; i += 1) nomera.push(i);
  return nomera;
}

/**
 * ПОДСКАЗКА за човека: кои колони приличат на коя роля.
 *
 * Това е ПРЕДЛОЖЕНИЕ, не решение — човекът потвърждава. Същото място, на което
 * утре ще застане ИИ-то (правило 18: агентът предлага, човекът записва).
 * Тогава нищо не се пренаписва — сменя се само ръката, която пълни картата.
 */
const DUMI: Readonly<Record<Rolya, readonly string[]>> = Object.freeze({
  data: ['дата', 'date', 'ден'],
  suma: ['сума', 'стойност', 'amount', 'сума с ддс', 'дължимо'],
  osnovanie: ['основание', 'описание', 'опис', 'назначение'],
  dds: ['ддс', 'vat', 'данък'],
  dokument: ['документ', 'фактура', 'номер', '№'],
  kontragent: ['контрагент', 'доставчик', 'клиент', 'наемател', 'фирма'],
  period: ['период', 'месец'],
});

export function podskazhi(
  t: Tablitsa,
  redNaGlavata: number,
): Readonly<Partial<Record<Rolya, number>>> {
  const glava = (t.redove[redNaGlavata] ?? []).map((k) => k.trim().toLowerCase());
  const namereni: Partial<Record<Rolya, number>> = {};
  const zaeti = new Set<number>();

  for (const [rolya, dumi] of Object.entries(DUMI) as [Rolya, readonly string[]][]) {
    const i = glava.findIndex((k, j) => !zaeti.has(j) && k !== '' && dumi.some((d) => k.includes(d)));
    if (i >= 0) {
      namereni[rolya] = i;
      zaeti.add(i);
    }
  }
  return namereni;
}
