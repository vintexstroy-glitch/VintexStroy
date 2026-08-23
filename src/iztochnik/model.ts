/**
 * МОДЕЛЪТ НА ТАБЛИЦА · приложението пита ВЕДНЪЖ и помни завинаги.
 *
 * Негови думи за банковото извлечение: „Индивидуално. **Чете и създава модела
 * вътре.**" И за таблиците изобщо: „Таблиците са всевъзможни… да избираш направо
 * готова таблица от избрания фолдър и то я пресъздава същата С ФУНКЦИИТЕ В НЕЯ."
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
  /**
   * Номерата на колоните, които човекът е МАХНАЛ от двата сбора.
   *
   * Знакът (+ или −) НЕ се записва — той се смята от сбора при всяко показване,
   * затова колоната сменя мястото си сама. Записва се само изключването:
   * то е решение на човек и иска следа. Вж. `src/domein/chisla.ts`.
   */
  readonly izklyucheni: readonly number[];
  /**
   * Номерата на колоните, обявени за ЗАТВОРЕНИ.
   *
   * Негово деление: „има два вида колони. Едните са променящи се, а другите
   * затворени с изчисления и други неща." Променящата се носи падащо меню и
   * параметри; затворената показва сметка или пренесен текст.
   *
   * Записва се САМО затвореността — както при изключването, тя е решение на
   * човек и иска следа. Празен списък значи „всички са променящи се", защото
   * колона, прочетена от файл, е писана от някого, докато някой не каже друго.
   *
   * От нея зависи правото: затворена колона не се редактира от НИКОГО, колкото
   * и висока да е ролята. Вж. `src/domein/kolonno.ts`.
   */
  readonly zatvoreni: readonly number[];
  /**
   * ЗАГЛАВИЯТА, КАКТО ГИ Е НАПИСАЛ ИЗТОЧНИКЪТ · дума по дума, с главните букви.
   *
   * Отпечатъкът отдолу е СВЕДЕН (малки букви, слети интервали) — така се
   * познава същата глава, дошла от друг износ. Но „Сума по документа" и „сума
   * по документа" не са едно и също, когато таблицата се ПРЕТВОРЯВА обратно
   * навън (`src/iznos/ot-model.ts`). Затова оригиналът се пази отделно.
   *
   * Платено с тест: първият образец излезе с главата на малки букви.
   */
  readonly glavi: readonly string[];
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
/**
 * Заглавията на един ред, изчистени от празните в края.
 *
 * Excel ражда по десет празни колони на всеки лист; те не са част от главата.
 */
export function glaviNaRed(t: Tablitsa, redNaGlavata: number): string[] {
  const red = [...(t.redove[redNaGlavata] ?? [])].map((k) => k.trim());
  while (red.length && red[red.length - 1] === '') red.pop();
  return red;
}

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
  izklyucheni?: readonly number[];
  zatvoreni?: readonly number[];
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
    izklyucheni: Object.freeze([...(n.izklyucheni ?? [])].sort((a, b) => a - b)),
    zatvoreni: Object.freeze([...(n.zatvoreni ?? [])].sort((a, b) => a - b)),
    glavi: Object.freeze(glaviNaRed(tablitsa, redNaGlavata)),
    otpechatak: otpechatakNaGlavata(tablitsa, redNaGlavata),
  });
}

/**
 * КРАТЪК БЕЛЕГ НА СЪДЪРЖАНИЕТО · „смени ли се нещо изобщо".
 *
 * Служи за едно: да се сравни новият модел със записания, преди да се пише.
 * Еднакъв белег значи, че няма промяна — и тогава в Журнала не влиза нищо.
 *
 * НЕ става за `opId`. Пробвано беше и се счупи в прохода: махнеш колона и я
 * върнеш, съдържанието се връща към предишното, повторният `opId` върна
 * СТАРИЯ резултат — и колоната остана махната, макар екранът да казваше
 * друго. Затова `opId` носи самото действие, а белегът — само сравнението.
 */
export function belegNaModel(m: ModelNaTablitsa): string {
  const koloni = (Object.keys(IMENA_NA_ROLITE) as Rolya[])
    .map((r) => `${r}=${m.koloni[r] ?? ''}`)
    .join(',');
  return (
    `${m.redNaGlavata}|${koloni}|${m.ddsE ?? ''}|` +
    `${[...m.izklyucheni].join('.')}|${[...m.zatvoreni].join('.')}`
  );
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
