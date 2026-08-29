/**
 * СЕДМИЧНИЯТ ФАЙЛ · трите листа на „Плащания Архив" (резен 22 · ADR-082).
 *
 * Негово: „сумарно за всяка седмица ще се събира фаилс екселска таблица за
 * сваляне събиращ Заплати, Фактури Кеш, Фактури Карта" *(р52·[288])*, и
 * „Фактурите и двете са с еднакъв хедър. Така се групират" *(р82·[7])*.
 *
 * ═══ ЗАЩО ХЕДЪРИТЕ СЕ СМЯТАТ, А НЕ СЕ ИЗПИСВАТ ═══
 *
 * Трите листа взимат колоните си от `koloniteNaVida` — тринайсетте на екрана
 * минус онези, които видът никога не пълни. Изписан втори път на ръка, хедърът
 * щеше да се разминава с реда още при първата добавена колона, и то невидимо:
 * разместените числа се виждат едва в свален файл, тоест късно.
 *
 * Оттам иде и неговото „еднакъв хедър за двете фактури" — двете делят ЕДИН
 * запис в таблицата на празните колони, не две еднакви на пръв поглед.
 *
 * ═══ СУМИТЕ СА ЧИСЛА ═══
 *
 * Парите влизат като ЧИСЛО (в цели евро-центове), не като текст: по текст
 * Excel не смята и не филтрира, а именно затова той иска файла.
 */

import { rabotnaKniga, type List } from './excel.js';
import {
  IMENATA_NA_VIDOVETE,
  kletkata,
  koloniteNaVida,
  redoveNaVida,
  VIDOVE_PLASHTANE,
  type RedNaPlashtane,
  type VidPlashtane,
} from '../domein/plashtaniya-arhiv.js';

/** Широчината на колоната · само за да се чете, без да се разтяга на ръка. */
const SHIRINI: Readonly<Record<string, number>> = Object.freeze({
  Дата: 12,
  Място: 26,
  Обект: 18,
  Страна: 24,
  Вид: 14,
  Начин: 10,
  Сметка: 9,
  Бележка: 30,
  Заплата: 12,
  Дни: 6,
  'Фактура №': 14,
  Сверка: 14,
  'Сума €': 12,
});

/** Един лист · хедърът на вида и редовете му, в реда на тринайсетте. */
export function listNaVida(redove: readonly RedNaPlashtane[], vid: VidPlashtane): List {
  const koloni = koloniteNaVida(vid);
  return {
    ime: IMENATA_NA_VIDOVETE[vid],
    koloni: koloni.map((k) => ({ ime: k, shirina: SHIRINI[k] ?? 14 })),
    redove: redoveNaVida(redove, vid).map((r) => koloni.map((k) => kletkata(r, k))),
  };
}

/**
 * ЦЕЛИЯТ ФАЙЛ · ТРИ листа, винаги трите.
 *
 * Празният вид ражда лист с хедър и НУЛА реда, а не липсващ лист: файл с два
 * листа щеше да се чете като „карта не е имало", докато истината е „карта не е
 * имало ТАЗИ седмица" (правило 15).
 */
export function sedmichenFayl(redove: readonly RedNaPlashtane[]): Uint8Array {
  return rabotnaKniga(VIDOVE_PLASHTANE.map((vid) => listNaVida(redove, vid)));
}

/**
 * ИМЕТО НА ФАЙЛА · седмицата е В него, и то е на ЛАТИНИЦА.
 *
 * Кирилицата не оцелява по пътя `<a download>` — човекът получава „download",
 * „download (1)"… Платено веднъж при образеца (проход §24), затова тук името
 * се пише направо на латиница, а не се открива втори път.
 */
export function imetoNaSedmichniyaFayl(sedmitsa: string): string {
  return `PLASHTANIYA-${sedmitsa}.xlsx`;
}
