/**
 * ДРЪЖКИТЕ ОТ МЕНЮТО НА ИМОТА · четири, по роля (резен 100 · ADR-164).
 *
 * Негово, 31.08 (И124 т.8): „Има място където се създават Имоти и отделно Дело
 * или Среща или друго вкарано по избор от стопанина." И т.3: „на всеки обект…
 * опция с десен бутон да го управляваш, да влезе към фолдъра в драйва, да
 * избереш други необходими функции там… да има пътища за неща само от там".
 *
 * ═══ ДРЪЖКИ, НЕ ВРАТИ ═══
 *
 * Дръжката ОТВАРЯ СЪЩАТА форма, която екранът вече има — Имоти (`#forma-imot`),
 * Управление (`#d-forma-delo`), Контакти (`#forma-sreshta`) — с предварително
 * избран Имот. Не пише нищо в Журнала и не ражда втора форма: „Делото се
 * създава от Управление" (И124 т.8) и „Срещата си остава в Контакти" (ADR-157)
 * остават в сила. Затова думата е „дръжка" (ADR-022 §6), не „вход" — „един
 * вход за запис" е Вратата (правило 2), и той е друг.
 *
 * ═══ ПО РОЛЯ ═══
 *
 * Трите дръжки към форми са път към ПИСАНЕ. Наблюдателят не ги вижда: меню, което
 * му ги предлага и после отказва, е втора врата към достъпа (правило 23 · ADR-050).
 * Папката е поглед и се вижда от всекиго.
 *
 * ═══ ИМОТ И ОБЕКТ ═══
 *
 * На реда на ИМОТА са и четирите. На реда на ОБЕКТА — само „Ново дело" и
 * Папката: „Делата са за Имот и за Обект" (И131 т.2), а Обект под Обект той
 * няма и среща с Обект не е моделирана.
 */

import { DUMITE } from './dumite.js';

export type RolyaZaDrazhkite = 'sobstvenik' | 'redaktor' | 'nablyudatel';
export type RedSDrazhki = 'imot' | 'obekt';

export interface Drazhka {
  readonly klyuch: 'nov-obekt' | 'novo-delo' | 'nova-sreshta';
  readonly ime: string;
  /** накъде води · екранът и секцията, които `zavediDoSektsiyata` отваря */
  readonly ekran: 'imoti' | 'gant' | 'kontakti';
  readonly sektsiya: string;
}

/** Четирите, поименно · думите идват от `DUMITE`, за да има ЕДИН дом (правило 17). */
export const DRAZHKITE_NA_IMOTA: readonly Drazhka[] = Object.freeze([
  Object.freeze({ klyuch: 'nov-obekt', ime: `Нов ${DUMITE.obekt.toLocaleLowerCase('bg-BG')}`, ekran: 'imoti', sektsiya: 'imoti-nov' }),
  Object.freeze({ klyuch: 'novo-delo', ime: `Ново ${DUMITE.delo.toLocaleLowerCase('bg-BG')}`, ekran: 'gant', sektsiya: 'gant-forma' }),
  Object.freeze({ klyuch: 'nova-sreshta', ime: `Нова ${DUMITE.sreshta.toLocaleLowerCase('bg-BG')}`, ekran: 'kontakti', sektsiya: 'kontakti' }),
] as const);

/** Кои дръжки носи един ред за една роля · чиста функция, за да има тест. */
export function drazhkiteNa(rolya: RolyaZaDrazhkite, red: RedSDrazhki): readonly Drazhka[] {
  if (rolya === 'nablyudatel') return Object.freeze([]);
  return red === 'imot'
    ? DRAZHKITE_NA_IMOTA
    : Object.freeze(DRAZHKITE_NA_IMOTA.filter((d) => d.klyuch === 'novo-delo'));
}
