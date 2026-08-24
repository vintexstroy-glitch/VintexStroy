/**
 * КОЛОННОТО ПРАВО · Вижда · Скрито · и защо „Редактира" не е тук.
 *
 * Негови думи от 11.08, казани ВЪТРЕ в отговор за хедърите:
 *
 *   „напиши само тези филтри — 3 филтри: Вижда, Скрито, Редактира…
 *    Редакторът на хедъри къде живее? (ВЗС) В Настройки — единственото място ★"
 *
 * И последната му дума (23.08), която ги стеснява:
 *
 *   „Вижда и скрито са редактор САМО ЗА ГЛАВНИЯ АКАУНТ. Там с това разпределя
 *    достъпа и ролята. За всеки служител с дадена му вече роля и достъп, може с
 *    тази функция НЕ ДА РЕДАКТИРА, А ДА СКРИВА САМО."
 *
 * Оттук трите решения на този файл:
 *
 * 1. ПРАВОТО ПО КОЛОНА СКРИВА. То не раздава редакция. Редакцията идва от
 *    ролята (`mozheDaRedaktira` в `samolichnost.ts`) и от ВИДА на колоната.
 *    Затова `PravoNaKolona` има две стойности, а филтрите на екрана са три:
 *    третата не се раздава, тя се СМЯТА.
 *
 * 2. ЗАТВОРЕНА КОЛОНА НЕ СЕ РЕДАКТИРА ОТ НИКОГО. Негови думи: „Затворената
 *    колона от всякъде е само скриване за удобство и връщане, ако решиш."
 *    Тя е сметка или пренесен текст — да ѝ се даде редакция значи да се пише
 *    върху резултат.
 *
 * 3. СКРИТОТО ПАК СЕ СМЯТА. Негови думи: „сметките остават, ако са скрити, и се
 *    смятат и в двата варианта." Скриването пипа ЕКРАНА и нищо друго — нито
 *    сбор, нито Журнал. Иначе „скрий" би значело „изтрий" и някой ден числото
 *    щеше да падне, без някой да е искал.
 *
 * ЗАЩО КОЛОНА СЕ СКРИВА, А РЕД СЕ ИЗКЛЮЧВА. Негово: „той е различен от
 * падащите менюта, защото за колоната я скрива, а за редовете ги изключва." И
 * причината, също негова: „да изключва колоната от сметката ще изключи всички
 * редове с Дела и Срещи". Двете не се разменят и този файл не дава начин.
 *
 * ЗАЩО ФИЛТЪРЪТ ОСТАВА. Негова поправка (23.08): „може да се филтрира от
 * филтъра в името — малко бутонче, както е подробният филтър в Линдолс."
 * Затвореността спира ПИСАНЕТО, не гледането.
 *
 * Пълната тема — `docs/izvori/03-koloni-hedari-tablitsi.md`.
 */

import type { ModelNaTablitsa } from '../iztochnik/model.js';
import { mozheDaRedaktira, type Rolya as RolyaNaChovek } from '../yadro/samolichnost.js';

/**
 * ДВАТА ВИДА КОЛОНИ · негово деление, дословно.
 *
 * Внимание за две думи, които си приличат: `Rolya` в `samolichnost.ts` е роля
 * на ЧОВЕК, а `Rolya` в `model.ts` е роля на КОЛОНА. Колонното право е точно
 * пресечната им точка — затова тук човешката се внася преименувана.
 */
export type VidKolona = 'promenlyva' | 'zatvorena';

export const IMENA_NA_VIDOVETE: Readonly<Record<VidKolona, string>> = Object.freeze({
  promenlyva: 'променяща се',
  zatvorena: 'затворена',
});

/** Какво може ЕДИН СЛУЖИТЕЛ да прави с една колона. Две, не три — вж. шапката. */
export type PravoNaKolona = 'vizhda' | 'skrito';

export class GreshkaPravo extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPravo';
  }
}

/**
 * ПРАВАТА НА ЕДИН СЛУЖИТЕЛ ВЪРХУ ЕДИН ХЕДЪР.
 *
 * Записват се САМО скритите. Видимото е подразбиране: списък с всичко видимо
 * би трябвало да се пренаписва при всяка нова колона и първата забравена
 * колона щеше да изчезне тихо от нечий екран.
 */
export interface PravaZaModel {
  /** на кого — имейлът, същият, който влиза в Журнала като `actor` */
  readonly imeyl: string;
  /** кой хедър — ключът на модела */
  readonly model: string;
  /** номерата на СКРИТИТЕ колони */
  readonly skriti: readonly number[];
}

/** Същността в Журнала. Едно право на двойка (служител, хедър). */
export function sashtnostNaPravo(imeyl: string, model: string): string {
  return `PRAVO:${imeyl}:${model}`;
}

export function napraviPrava(n: {
  imeyl: string;
  model: string;
  skriti?: readonly number[];
}): PravaZaModel {
  const imeyl = n.imeyl.trim().toLowerCase();
  const model = n.model.trim();

  if (imeyl === '') throw new GreshkaPravo('Правото иска имейл — на него се записва.');
  if (model === '') throw new GreshkaPravo('Правото иска хедър — то важи за един модел.');

  const skriti = [...new Set(n.skriti ?? [])].sort((a, b) => a - b);
  for (const k of skriti) {
    if (!Number.isInteger(k) || k < 0) {
      throw new GreshkaPravo(`Колона „${k}" не е номер на колона.`);
    }
  }

  return Object.freeze({ imeyl, model, skriti: Object.freeze(skriti) });
}

/**
 * „Смени ли се нещо изобщо" · за сравнение преди запис, НЕ за `opId`.
 *
 * Същата работа като `belegNaModel` и `belegNaButon`, и същата причина да не
 * става за ключ: скрий → покажи → скрий връща старото съдържание, и повторен
 * ключ от него би върнал стария резултат, а колоната щеше да остане видима.
 */
export function belegNaPravo(p: PravaZaModel): string {
  return `${p.imeyl}|${p.model}|${[...p.skriti].join('.')}`;
}

/** Видът на една колона — от модела на хедъра, където го е записал човекът. */
export function vidNaKolona(m: ModelNaTablitsa, kolona: number): VidKolona {
  return m.zatvoreni.includes(kolona) ? 'zatvorena' : 'promenlyva';
}

/** Правото на този служител върху тази колона. Празни права значи „вижда". */
export function pravoNaKolona(
  prava: PravaZaModel | undefined,
  kolona: number,
): PravaNaKolonaRezultat {
  return prava?.skriti.includes(kolona) ? 'skrito' : 'vizhda';
}

type PravaNaKolonaRezultat = PravoNaKolona;

/**
 * МОЖЕ ЛИ ТОЗИ ЧОВЕК ДА РЕДАКТИРА ТАЗИ КОЛОНА · двата въпроса, събрани в един.
 *
 * Точно това ADR-002 наричаше „остава разчертаването колона по колона". Не се
 * разчертава от нас: ролята идва от акаунта, видът — от хедъра.
 *
 * Скритата колона не се редактира не защото правото го забранява, а защото не
 * се вижда. Казва се на глас, за да не се търси после друга причина.
 */
export function mozheDaRedaktiraKolona(n: {
  rolya: RolyaNaChovek;
  vid: VidKolona;
  pravo: PravoNaKolona;
}): boolean {
  if (n.vid === 'zatvorena') return false;
  if (n.pravo === 'skrito') return false;
  return mozheDaRedaktira({ rolya: n.rolya });
}

/** Кои колони вижда този служител — от всички номера на колони в таблицата. */
export function vidimiKoloni(
  vsichki: readonly number[],
  prava: PravaZaModel | undefined,
): readonly number[] {
  return prava === undefined ? vsichki : vsichki.filter((k) => !prava.skriti.includes(k));
}

/** Едно изречение за екрана: какво е скрито и на кого. */
export function sDumi(p: PravaZaModel): string {
  if (p.skriti.length === 0) return `${p.imeyl} · вижда всичко в „${p.model}"`;
  return `${p.imeyl} · ${p.skriti.length} скрити колони в „${p.model}"`;
}

/**
 * Прехвърля една колона между скрита и видима. Връща НОВ списък.
 *
 * Същият похват като `sPrevklyuchena` за изключените: старият списък не се
 * пипа, за да може екранът да сравни двете състояния, преди да пише.
 */
export function sPrevklyuchenaVidimost(
  p: PravaZaModel,
  kolona: number,
): readonly number[] {
  return p.skriti.includes(kolona)
    ? p.skriti.filter((k) => k !== kolona)
    : [...p.skriti, kolona].sort((a, b) => a - b);
}
