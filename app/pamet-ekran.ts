/**
 * ПАМЕТТА НА ЕКРАНА · прозорецът се отваря както е оставен.
 *
 * Най-дълбокият Windows навик: филтърът, който човек си е сложил сутринта,
 * тактът на Ганта, гледаният месец — стоят и след презареждане. Дотук всичко
 * това живееше в модулни променливи и умираше с раздела.
 *
 * ДВЕ ГРАНИЦИ, И ДВЕТЕ ТВЪРДИ:
 *
 *   1. Тук влиза САМО ЕКРАННОТО — как се гледа, не какво е вярно. Данни не
 *      влизат никога: те са в Журнала. Скриването на колона е РЕШЕНИЕ и си
 *      остава събитие през Вратата (правило 23); отметнатият филтър е поглед
 *      и живее тук.
 *   2. Липсата не е грешка. Изтрито хранилище, друг браузър, счупен запис —
 *      всичко пада мълчаливо към подразбраното. Екран, който гърми заради
 *      изгубена отметка, е по-лош от екран, който я забравя.
 *
 * Ключовете носят версия (`ui.v1.`): смени ли се формата на записаното,
 * версията се вдига и старото просто спира да се чете — не се мигрира и не
 * се гадае.
 */

const PREFIKS = 'ui.v1.';

/** Хранилището, ако го има · тестовете и node нямат `localStorage`. */
function hranilishte(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Някои среди хвърлят при самото ДОКОСВАНЕ на localStorage.
    return null;
  }
}

export function zapomniEkranno(klyuch: string, stoynost: unknown): void {
  try {
    hranilishte()?.setItem(PREFIKS + klyuch, JSON.stringify(stoynost));
  } catch {
    // Пълно или заключено хранилище: екранът работи, просто не помни.
  }
}

/**
 * Чете запомненото, или връща подаденото подразбрано.
 *
 * `inache` се връща И при счупен JSON — записът може да е повреден от
 * разширение, чистач или прекъснат запис, и това не е повод за бял екран.
 */
export function chetiEkranno<T>(klyuch: string, inache: T): T {
  try {
    const surovo = hranilishte()?.getItem(PREFIKS + klyuch);
    if (surovo === null || surovo === undefined) return inache;
    return JSON.parse(surovo) as T;
  } catch {
    return inache;
  }
}

export function zabraviEkranno(klyuch: string): void {
  try {
    hranilishte()?.removeItem(PREFIKS + klyuch);
  } catch {
    /* няма какво да се забравя */
  }
}
