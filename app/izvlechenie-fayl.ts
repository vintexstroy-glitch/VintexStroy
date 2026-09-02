/**
 * ИЗБРАНИТЕ ФАЙЛОВЕ → СНИМКИ НА ИЗВЛЕЧЕНИЕТО · ЕДИН дом (правило 17).
 *
 * Личните пари четат извлечение от карта; Сметки чете извлечение от банка.
 * Файлът е ЕДИН И СЪЩ вид: редове с дата, кой, посока и сума. Обходът за
 * чистота намери двете копия на този цикъл ПЕТ РЕДА едно до друго — и е прав:
 * два пъти написан, той се разминава при първата поправка, а поправката тук е
 * винаги една и съща (нов формат на банка, нов вид файл).
 *
 * ═══ ГРАНИЦАТА ═══
 *
 * Файлът се ЧЕТЕ и се забравя. Нито един негов байт не влиза в Журнала —
 * извлечението е ЧУЖД факт (банката го казва, не ние), и влиза в СМЕТКАТА, не
 * в книгата. Оттук излизат само разчетените редове и отпечатъкът на файла.
 */

import { tablitsiteNa } from '../src/iztochnik/chetetsat.js';
import { prochetiKarta, sleiIzvlecheniya, type SlyataKarta } from '../src/iztochnik/karta.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';

/**
 * Един файл → листове.
 *
 * Празните редове падат ПРЕДИ четенето: те не са данни, а форматиране, и биха
 * се броили сред пропуснатите — число, което лъже за качеството на файла.
 */
export interface ProchetenoIzvlechenie {
  readonly slyata: SlyataKarta;
  /** по един отпечатък на ФАЙЛ · следата кой файл е бил четен */
  readonly otpechatatsi: readonly string[];
  /** колко реда не се разчетоха · БРОЯТ СЕ, не се преглъщат */
  readonly propusnati: number;
}

/**
 * ЧЕТЕ избраните файлове и ги слива в едно извлечение.
 *
 * ОТКАЗВА ГЛАСНО, когато нито един ред не се разчете: тих празен резултат
 * изглежда точно като „чист месец, няма нищо за сверяване" — а разликата
 * между двете е цялата полза от сверката.
 */
export async function prochetiIzvlecheniyata(
  faylove: readonly File[],
): Promise<ProchetenoIzvlechenie> {
  const snimki = [];
  for (const f of faylove) {
    const danni = new Uint8Array(await f.arrayBuffer());
    const otp = await otpechatak(danni, sha256Web);
    for (const t of await tablitsiteNa(danni, f.name)) {
      snimki.push(prochetiKarta({ tablitsa: t, ime: f.name, otpechatak: otp }));
    }
  }
  const slyata = sleiIzvlecheniya(snimki);
  if (slyata.redove.length === 0) {
    throw new Error('Нито един ред не се разчете. Провери дали листът е извлечението.');
  }
  return {
    slyata,
    otpechatatsi: [...new Set(snimki.map((x) => x.otpechatak))],
    propusnati: snimki.reduce((n, x) => n + x.propusnati.length, 0),
  };
}
