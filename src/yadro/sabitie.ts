/**
 * Схемата на събитието — договорът, на който виси всичко останало.
 * System design §3.1. Еднаква за трите носителя (А Sheets+GAS · Б сървър · В местно-първо).
 */

/** Върху коя същност действа събитието. */
export interface Sashtnost {
  /** вид: 'imot' | 'naem' | 'plashtane' | ... */
  readonly vid: string;
  readonly id: string;
}

/** Ключ за сравнение на същности. */
export function klyuchNaSashtnost(s: Sashtnost): string {
  return `${s.vid} ${s.id}`;
}

/**
 * СЪРЦЕВИНАТА · каквото операцията и събитието носят ЕДНАКВО.
 *
 * Кой (`actor`), при кого (`naematel`), какво (`type` · `payload`), над коя
 * същност и кога. Написани два пъти, тези седем полета се разминават:
 * добавено поле на входа и забравено в записа минава компилацията и стига до
 * Журнала само наполовина.
 *
 * Затова НЕ е `Sabitie extends Operatsiya`, колкото и да изглежда така.
 * `expectedRev` е rev-предпазител НА ВХОДА и не влиза в Журнала — с `extends`
 * той тихо ставаше позволено поле на записаното събитие и на `ZaHeshirane`.
 * Разликата между вход и запис е точно онова, което този тип пази.
 */
interface Sarzevina {
  /** uuid на операцията — носи идемпотентността */
  readonly opId: string;
  /** ISO време, една зона (UTC) */
  readonly ts: string;
  /** tenant_id — изолация на наемател */
  readonly naematel: string;
  /** имейл на извършителя — самоличност */
  readonly actor: string;
  /** 'НаемДобавен' | 'ПлащанеПрието' | 'Сторно' | ... */
  readonly type: string;
  readonly sashtnost: Sashtnost;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Операция, подадена на Вратата. Още не е събитие — може да бъде отказана. */
export interface Operatsiya extends Sarzevina {
  /**
   * rev-предпазител: seq на последното събитие за тази същност, което си видял.
   * Пропуснато = без проверка (нови същности, миграции).
   *
   * САМО НА ВХОДА. Вратата строи записа поле по поле и не го пренася — той
   * казва какво си ВИДЯЛ, не какво е СТАНАЛО.
   */
  readonly expectedRev?: number;
}

/**
 * Записано събитие. Само за четене — Журналът е само за добавяне.
 * Полетата за пари в payload завършват на `_st` и са цели стотинки.
 */
export interface Sabitie extends Sarzevina {
  /** цяло, монотонно В РАМКИТЕ НА НАЕМАТЕЛ */
  readonly seq: number;
  /** хеш на предишното събитие на същия наемател; празен низ за първото */
  readonly prevHash: string;
  readonly hash: string;
}

/** Полетата, които влизат в хеша — всичко без самия хеш. */
export type ZaHeshirane = Omit<Sabitie, 'hash'>;
