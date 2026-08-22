/**
 * Събитията на резен 1 · имот → наем → вземане → плащане.
 *
 * Журналът пази СЪБИТИЯ за парите и договорите — там историята е закон
 * (ADR-001, находка 3). Обикновени редакции не стават събития.
 *
 * Всяко поле за пари завършва на `_st` и е цели стотинки — Вратата го проверява.
 */

import type { Sashtnost } from '../yadro/index.js';

export const VID = {
  imot: 'imot',
  naem: 'naem',
  vzemane: 'vzemane',
  plashtane: 'plashtane',
  razhod: 'razhod',
} as const;

export type Vid = (typeof VID)[keyof typeof VID];

export type TipSabitie =
  | 'ИмотДобавен'
  | 'НаемДобавен'
  | 'НаемПрекратен'
  | 'ВземанеНачислено'
  | 'ПлащанеПрието'
  | 'РазходЗаписан'
  | 'ИмотПоправен'
  | 'НаемПоправен'
  | 'Сторно';

export interface PayloadImotDobaven {
  readonly adres: string;
  readonly edinitsa: string;
  /** площ в цели квадратни сантиметри — пак без float */
  readonly ploshtad_kvsm: number;
}

export interface PayloadNaemDobaven {
  readonly imotId: string;
  readonly naemetel: string;
  readonly naem_st: number;
  /** ден от месеца, на който пада наемът */
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  /**
   * Ключ на акумулатор от `dds.ts` — определя ставката, с която ДДС-то се
   * ИЗВАЖДА от наема. Наемът си остава обща цена; тук се пази само откъде е.
   */
  readonly sektor: string;
}

/**
 * ПОПРАВКА НА ОПИСАНИЕТО — ново събитие, същият `id`.
 *
 * Сгрешен адрес не се сторнира: сторното на имота би оставило наемите му
 * да висят на нищо. Затова поправката е отделно събитие, което носи новите
 * стойности НАЦЯЛО и се налага върху старите при сглобяването на Огледалото.
 */
export interface PayloadImotPopraven {
  readonly imotId: string;
  readonly adres: string;
  readonly edinitsa: string;
  readonly ploshtad_kvsm: number;
  readonly prichina: string;
}

/**
 * Същото за наема. Смяната на `naem_st` важи за БЪДЕЩИТЕ начисления —
 * вече начислените вземания са отделни събития и не се пипат оттук.
 */
export interface PayloadNaemPopraven {
  readonly naemId: string;
  readonly naemetel: string;
  readonly naem_st: number;
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  readonly sektor: string;
  readonly prichina: string;
}

export interface PayloadNaemPrekraten {
  readonly naemId: string;
  readonly kraj: string;
  readonly prichina: string;
}

export interface PayloadVzemaneNachisleno {
  readonly naemId: string;
  /** период във вида '2026-08' */
  readonly period: string;
  readonly osnovanie: string;
  readonly suma_st: number;
  readonly padezh: string;
}

export interface PayloadPlashtanePrieto {
  readonly vzemaneId: string;
  readonly suma_st: number;
  readonly nachin: 'банка' | 'в брой';
  readonly data: string;
}

/**
 * РАЗХОД · другата страна на ДДС-то.
 *
 * `suma_st` е пак ОБЩА ЦЕНА С ДДС — правилото на собственика не се мени
 * заради посоката. Секторът определя ставката, с която ДДС-то се ИЗВАЖДА;
 * заплатите и кредитите падат в акумулатори със ставка нула.
 */
export interface PayloadRazhodZapisan {
  /** ключ на поток: 'zaplati' | 'krediti' | 'fakturi' */
  readonly potok: string;
  readonly dostavchik: string;
  readonly opis: string;
  readonly suma_st: number;
  /** ключ на акумулатор от `dds.ts` */
  readonly sektor: string;
  readonly nachin: 'банка' | 'в брой';
  readonly data: string;
  /** номер на фактура или документ; празно, ако няма */
  readonly dokument: string;
}

export interface PayloadStorno {
  /** seq на събитието, което се погасява */
  readonly pogasyavaSeq: number;
  readonly prichina: string;
}

export function sashtnost(vid: Vid, id: string): Sashtnost {
  return { vid, id };
}
