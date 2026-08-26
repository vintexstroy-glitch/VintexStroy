/**
 * СНИМКАТА · какво е прочетено, откъде и кога.
 *
 * Собственикът каза: файлът да не се качва, а да се ЧЕТЕ — да се вземе снимка
 * на числата, а самият файл да си остане в главния Драйв.
 *
 * Затова тук не влиза съдържанието на файла, а неговият ОТПЕЧАТЪК: име,
 * големина, час на последна промяна и sha256 на суровите байтове. Отпечатъкът
 * върши три работи наведнъж:
 *   1. следата — в Журнала стои точно коя версия на файла е прочетена;
 *   2. идемпотентността — `opId` се вади от него, значи същият файл, прочетен
 *      два пъти, не пише втори път;
 *   3. доказателството — подмени ли се файлът в Драйва, отпечатъкът се сменя.
 */

import type { Sha256 } from '../yadro/index.js';

export type VidIzvor = 'csv' | 'xlsx' | 'pdf' | 'raka';
type VidSnimka = 'razhodi' | 'naemi';

export interface Izvor {
  readonly vid: VidIzvor;
  readonly ime: string;
  readonly golemina: number;
  /** ISO на последната промяна на файла — както го дава дискът */
  readonly promenen: string;
  /** sha256 на суровите байтове */
  readonly otpechatak: string;
}

/** Един прочетен ред, вече сведен до цели стотинки и ISO дати. */
export interface RedOtSnimka {
  /** стабилен ключ за сравнение — вади се от съдържанието, не от реда */
  readonly klyuch: string;
  readonly opis: string;
  readonly koy: string;
  readonly suma_st: number;
  readonly data: string;
  readonly dokument: string;
  /**
   * Ставката, ако таблицата я казва на реда. Липсва ли — човек я избира при
   * потвърждаване и тогава важи подсказката на сектора.
   */
  readonly stavka?: number;
}

export interface Propusnat {
  /** номер на реда във файла, както го вижда човек */
  readonly red: number;
  readonly zashto: string;
}

/**
 * ЕДИН РЕД, ДОНЕСЕН ОТ ВТОРИ ФАЙЛ · препокриващи се извлечения.
 *
 * НЕ е `Propusnat`: пропуснатият не е разчетен, а този е разчетен отлично —
 * просто вече го има. Сливат се в едно, но се БРОЯТ и се показват, защото
 * еднаква сума на еднакъв ден при еднакъв търговец МОЖЕ да е и два истински
 * разхода. От данните е неразличимо; човекът решава (правило 18).
 */
export interface Povtoren {
  readonly klyuch: string;
  /** името на файла, който го донесе ВТОРИ път */
  readonly fayl: string;
  readonly suma_st: number;
}

export interface Snimka {
  readonly vid: VidSnimka;
  readonly period: string;
  readonly izvor: Izvor;
  readonly redove: readonly RedOtSnimka[];
  /** редовете, които не са разчетени — броят се, не се преглъщат */
  readonly propusnati: readonly Propusnat[];
  /**
   * Редовете, дошли ВТОРИ път от друг файл в същата партида (`sleiSnimki`).
   *
   * Незадължително, защото снимка от ЕДИН лист няма как да ги има: там втори
   * еднакъв ред е втори истински ред и получава свой ключ. Празно и липсващо
   * значат едно и също и никой не ги различава.
   */
  readonly povtoreni?: readonly Povtoren[];
}

export async function otpechatak(danni: Uint8Array, sha: Sha256): Promise<string> {
  // Байтовете се четат като латиница-1, за да не ги мени превод на знаци.
  let nizt = '';
  for (const b of danni) nizt += String.fromCharCode(b);
  return sha(nizt);
}

/** Сборът на снимката — това, което сверката трябва да намери и в Журнала. */
export function sborNaSnimka(s: Snimka): number {
  return s.redove.reduce((sbor, r) => sbor + r.suma_st, 0);
}
