/**
 * СВЪРЗВАНЕТО · „Апартамент 1" в таблицата, „АП. № 1" в Журнала.
 *
 * Двете страни пишат едно и също различно, и това не е немарливост — то е
 * НЕГОВО решение от 08.08:
 *
 *   „Един формат на имената: **АП. № 1** (съкратено)." *(ред 46)*
 *
 * Приложението вътре ползва съкратеното; неговото площообразуване и ценовата
 * му листа — пълното. Затова свързването е по СМИСЪЛ, не по буква: вид обект
 * плюс номер.
 *
 * ЗАЩО ТОВА Е ВАЖНО ЗА ЦЕНАТА. Оценката по състояние (колона Б) се смята от
 * НАЕМА, а наемът живее в Журнала — на имот, не на ред от таблица. Без този
 * мост колона Б би ползвала очакван наем дори за имотите, чийто действителен
 * наем е записан. Отчетът го казва като предимство: „наемът, плащан и
 * неплатен, вече е в Журнала… ДЕЙСТВИТЕЛНАТА събираемост, вместо пазарно
 * предположение."
 *
 * ЗАЩО НЕ ПО ИМЕ. „Апартамент 1" и „АП. № 1" не си приличат като низове, а
 * „Гараж 1" и „АП. № 1" си приличат повече, отколкото трябва. Номерът сам не
 * стига — той се повтаря при всеки вид.
 */

import { vidPoIme, type VidObekt } from './chetene.js';

/** Ключът, по който двете страни се познават: вид + номер. */
interface KlyuchNaObekt {
  readonly vid: VidObekt;
  readonly nomer: number;
}

/**
 * Изважда вида и номера от име, писано на който и да е от двата начина.
 *
 * `undefined` значи „това име не носи номер" — тогава свързване няма и
 * обектът минава на очакван наем. По-добре очакван наем, отколкото чужд.
 */
export function klyuchOtIme(ime: string): KlyuchNaObekt | undefined {
  const t = ime.trim();
  if (t === '') return undefined;

  // Първото число в името е номерът. „Двоен гараж 7 и 8 и склад" дава 7 —
  // и това е вярно: той е заведен под първия си номер.
  const namereno = /(\d+)/.exec(t);
  if (!namereno) return undefined;

  return { vid: vidPoIme(t), nomer: Number(namereno[1]) };
}

/** Двата ключа сочат ли един и същ обект. */
export function sashtiyat(a: KlyuchNaObekt | undefined, b: KlyuchNaObekt | undefined): boolean {
  return a !== undefined && b !== undefined && a.vid === b.vid && a.nomer === b.nomer;
}

/** Низът, по който ключът се търси в карта. */
function nizNaKlyuch(k: KlyuchNaObekt): string {
  return `${k.vid}#${k.nomer}`;
}

/** Един имот от Журнала, сведен до каквото свързването иска. */
interface ImotZaSvarzvane {
  /** единицата, както е записана: „АП. № 1" */
  readonly edinitsa: string;
  /** месечният наем в стотинки; 0 значи „няма действащ наем" */
  readonly naem_mesechen_st: number;
}

/**
 * КАРТАТА обект → месечен наем, готова за Калкулатора.
 *
 * Прекратен наем не влиза — обект, чийто наем е спрял, няма действителен
 * доход и минава на очакван. Няколко наема на един имот (сменен наемател)
 * дават последния действащ: оценката гледа сегашното състояние.
 */
export function kartaNaNaemite(
  imoti: readonly ImotZaSvarzvane[],
): ReadonlyMap<string, number> {
  const izhod = new Map<string, number>();
  for (const i of imoti) {
    if (i.naem_mesechen_st <= 0) continue;
    const k = klyuchOtIme(i.edinitsa);
    if (!k) continue;
    izhod.set(nizNaKlyuch(k), i.naem_mesechen_st);
  }
  return izhod;
}

/** Действителният наем на един обект от таблицата, ако Журналът го знае. */
export function deystvitelenNaem_st(
  obekt: string,
  karta: ReadonlyMap<string, number>,
): number | undefined {
  const k = klyuchOtIme(obekt);
  return k ? karta.get(nizNaKlyuch(k)) : undefined;
}
