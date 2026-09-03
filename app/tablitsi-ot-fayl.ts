/**
 * ТАБЛИЦИТЕ ОТ ФАЙЛ, ПРЕЗ СИТО · един дом за двата викащи (резен 104).
 *
 * Дотук живееше в `stoynost.ts`; площообразуването вече се чете и от Имоти
 * (дървото на строежа, ADR-165), и второ копие щеше да значи два реда, които
 * се разминават на първата поправка. Четецът е този на Драйва (`tablitsiteNa`);
 * тук е само ситото — кой лист от книга с много листове влиза.
 */

import { tablitsiteNa } from '../src/iztochnik/chetetsat.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';

export async function tablitsiSasSito(
  fayl: File,
  sito: (t: Tablitsa) => boolean,
): Promise<Tablitsa[]> {
  const danni = await fayl.arrayBuffer();
  const vsichki = await tablitsiteNa(new Uint8Array(danni), fayl.name);
  // Ситото е за книга с МНОГО листове: там „Sheet3" и „разбивка" носят друг
  // обект и биха добавили чужди квадрати. Файл с един лист е самият той —
  // изнесеното от човека рядко се казва „площо".
  if (vsichki.length <= 1) return vsichki;

  const minali = vsichki.filter((t) => sito(t));
  if (minali.length === 0) {
    throw new Error(
      `Във „${fayl.name}" няма лист с площи. От книга с много листове се четат ` +
        'само „площо" и „земя" — останалите носят друг обект или обобщения.',
    );
  }
  return minali;
}
