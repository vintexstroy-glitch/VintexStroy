/**
 * КАКВО ПИШЕ В ЕДИН ЗАПИС · четене на товар, за човешко око (резен 27).
 *
 * ═══ ЗАЩО ТУК, А НЕ В ЕКРАНА ═══
 *
 * Двете функции живееха в `app/arhiv.ts` — тоест в екранния слой, макар да са
 * чисто четене на товар. Щом ВТОРИ викащ поиска същото („сторнираното се вижда",
 * ADR-087), копие щеше да се разминава при първото ново поле: износът и екранът
 * биха казвали различни неща за ЕДИН И СЪЩ запис.
 *
 * Един факт, един дом (правило 17).
 *
 * ═══ ГРАНИЦАТА, КАЗАНА НА ГЛАС ═══
 *
 * Тези две НЕ знаят всичко за всяко събитие и не бива да го знаят: това е
 * СЪКРАЩЕНИЕ за човек, не пълен изглед. Който иска всичко, го взима от износа
 * или от историята на реда.
 */

import type { Sabitie } from '../yadro/index.js';

/**
 * СУМАТА НА ЕДИН ЗАПИС · в цели центове, или `undefined`, ако няма такава.
 *
 * Ключовете са ИЗБРОЕНИ, а не „първото поле, което свършва на `_st`": второто
 * би хванало и депозита, и обезпечението, и дневната ставка — тоест би казало
 * „сума" за число, което не е сумата на записа.
 */
const KLYUCHOVE_NA_SUMATA: readonly string[] = Object.freeze([
  'suma_st',
  'naem_st',
  'dds_deklarirano_st',
]);

export function sumataNaZapisa(s: Sabitie): number | undefined {
  const p = s.payload as Record<string, unknown>;
  for (const klyuch of KLYUCHOVE_NA_SUMATA) {
    const v = p[klyuch];
    if (typeof v === 'number') return v;
  }
  return undefined;
}

/**
 * ОПИСАНИЕТО НА ЕДИН ЗАПИС · до три думи от товара, в реда на смисъла.
 *
 * Редът е нарочен: адресът е най-говорещото, после човекът, после какво е
 * било. `prichina` стои НАКРАЯ, защото се среща само при сторно — и тогава е
 * единственото, което носи смисъл.
 */
const POLETA_NA_OPISA: readonly string[] = Object.freeze([
  'adres',
  'naemetel',
  'dostavchik',
  'opis',
  'period',
  'prichina',
]);

export function opisaNaZapisa(s: Sabitie): string {
  const p = s.payload as Record<string, unknown>;
  return POLETA_NA_OPISA.map((k) => p[k])
    .filter((x): x is string => typeof x === 'string' && x !== '')
    .slice(0, 3)
    .join(' · ');
}

/**
 * ДАТАТА НА ЕДИН ЗАПИС · НЕГОВАТА, не тази на записването.
 *
 * ═══ НАМЕРЕНО ОТ ПРОХОДА, НЕ ОТ ТЕСТ (ADR-087 §7) ═══
 *
 * Първата версия на „сторнираното се вижда" филтрираше по `ts` — времето, в
 * което човекът е НАТИСНАЛ. Тестовете минаха, защото стендът им пише в същия
 * месец, който после гледа. Проходът падна веднага: разход с дата 12.11 се
 * въвежда ДНЕС, и по `ts` той принадлежи на ДНЕШНИЯ месец, а човек го търси в
 * ноември.
 *
 * Датата на записа е онази, която самият запис носи (`data`), после периодът
 * (`period`), и чак накрая — времето на записването. Последното е ЧЕСТНО
 * падане: запис без своя дата няма друга.
 */
export function dataNaZapisa(s: Sabitie): string {
  const p = s.payload as Record<string, unknown>;
  const data = p['data'];
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data)) return data.slice(0, 10);
  const period = p['period'];
  if (typeof period === 'string' && /^\d{4}-\d{2}/.test(period)) return `${period}-01`;
  return String(s.ts).slice(0, 10);
}
