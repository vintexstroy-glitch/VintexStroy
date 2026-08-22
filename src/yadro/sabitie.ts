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
 * Записано събитие. Само за четене — Журналът е само за добавяне.
 * Полетата за пари в payload завършват на `_st` и са цели стотинки.
 */
export interface Sabitie {
  /** цяло, монотонно В РАМКИТЕ НА НАЕМАТЕЛ */
  readonly seq: number;
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
  /** хеш на предишното събитие на същия наемател; празен низ за първото */
  readonly prevHash: string;
  readonly hash: string;
}

/** Операция, подадена на Вратата. Още не е събитие — може да бъде отказана. */
export interface Operatsiya {
  readonly opId: string;
  readonly ts: string;
  readonly naematel: string;
  readonly actor: string;
  readonly type: string;
  readonly sashtnost: Sashtnost;
  readonly payload: Readonly<Record<string, unknown>>;
  /**
   * rev-предпазител: seq на последното събитие за тази същност, което си видял.
   * Пропуснато = без проверка (нови същности, миграции).
   */
  readonly expectedRev?: number;
}

/** Полетата, които влизат в хеша — всичко без самия хеш. */
export type ZaHeshirane = Omit<Sabitie, 'hash'>;
