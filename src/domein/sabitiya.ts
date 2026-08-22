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
} as const;

export type Vid = (typeof VID)[keyof typeof VID];

export type TipSabitie =
  | 'ИмотДобавен'
  | 'НаемДобавен'
  | 'НаемПрекратен'
  | 'ВземанеНачислено'
  | 'ПлащанеПрието'
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

export interface PayloadStorno {
  /** seq на събитието, което се погасява */
  readonly pogasyavaSeq: number;
  readonly prichina: string;
}

export function sashtnost(vid: Vid, id: string): Sashtnost {
  return { vid, id };
}
