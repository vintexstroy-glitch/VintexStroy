/**
 * ЦЕНОВАТА ЛИСТА · вторият вход и единственият изход.
 *
 * Негови думи (23.08):
 *
 *   „Има вече една папка с площите и друга с Ценови листи. **Чете от папката с
 *    площите и записва в таблицата с Цените.**"
 *
 * Значи две посоки, и всяка е ЕДНА (правило 20 · ADR-010):
 *
 *   Площообразуване  →  Калкулатор   ЧЕТЕ   (`chetene.ts`)
 *   Ценови листи     ↔  Калкулатор   чете изложението, пише цената
 *
 * ЗАЩО СЕ ЧЕТЕ И ЦЕНОВАТА ЛИСТА. Площообразуването няма изложение, стаи и
 * тераси — те живеят само тук. Той каза за изложението „избираш произволно за
 * тестовете", но търсенето го намери в собствения му файл (колона „Изложение":
 * СИ · И · З · СЗ за всичките 22 апартамента). Нищо не се измисля, щом го има.
 *
 * ХЕДЪРЪТ Е НЕГОВ, ДОСЛОВНО:
 *
 *   Имоти · Етаж Кота · Стаи · Чиста площ · Общи части % · Общи части м2 ·
 *   Обща площ · Изложение · Тераси · Цена с ДДС · Евро / кв.м.
 *
 * „ПРОДАДЕН" СТОИ НА МЯСТОТО НА ЦЕНАТА. Не е отделна колона — това е неговият
 * начин и се чете както е. Продаденото не влиза в стойността на състоянието.
 */

import { kletka, type Tablitsa } from '../iztochnik/tablitsa.js';
import { kakvoPishe } from '../yadro/pari.js';
import { kvSmVM2, ploshtVKvSm } from './chetene.js';
import type { OtTsenovaLista, RedNaStoynost } from './stoynost.js';
import type { KolonaNaLista, List } from '../iznos/excel.js';

/** Думата, с която той бележи продаденото — на мястото на цената. */
export const PRODADEN = 'ПРОДАДЕН';

/** Хедърът на неговата ценова листа, дословно и по ред. */
export const GLAVA_NA_TSENITE: readonly string[] = Object.freeze([
  'Имоти',
  'Етаж Кота',
  'Стаи',
  'Чиста площ',
  'Общи части %',
  'Общи части м2',
  'Обща площ',
  'Изложение',
  'Тераси',
  'Цена с ДДС',
  'Евро / кв.м.',
]);

function svedeno(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * ЧЕТЕ каквото само ценовата листа знае: изложение, стаи, тераси, продаден ли е.
 *
 * Ключът е името на обекта („Апартамент 1") — единственото, което двете
 * таблици споделят. Празна листа връща празна карта; Калкулаторът работи и
 * без нея, само че без коефициент за изложение.
 */
export function prochetiTsenovaLista(t: Tablitsa): ReadonlyMap<string, OtTsenovaLista> {
  const izhod = new Map<string, OtTsenovaLista>();

  // Главата е редът, който носи „изложение" — тя е на 2-ри или 3-ти ред заради
  // заглавието на обекта отгоре.
  let red = -1;
  let koloni: Record<string, number> = {};
  for (let r = 0; r < Math.min(t.redove.length, 12); r += 1) {
    const glava = (t.redove[r] ?? []).map(svedeno);
    const i = glava.indexOf('изложение');
    if (i < 0) continue;
    red = r;
    koloni = {
      obekt: glava.findIndex((g) => g === 'имоти' || g === 'обект'),
      stai: glava.indexOf('стаи'),
      izlozhenie: i,
      terasi: glava.indexOf('тераси'),
      tsena: glava.findIndex((g) => g.startsWith('цена')),
    };
    break;
  }
  if (red < 0 || koloni['obekt'] === undefined || koloni['obekt'] < 0) return izhod;

  for (let r = red + 1; r < t.redove.length; r += 1) {
    const obekt = kletka(t, r, koloni['obekt']).trim();
    if (obekt === '') continue;
    const tsena = koloni['tsena']! >= 0 ? kletka(t, r, koloni['tsena']!).trim() : '';
    izhod.set(obekt, {
      izlozhenie: koloni['izlozhenie']! >= 0 ? kletka(t, r, koloni['izlozhenie']!).trim() : '',
      stai: broyOt(koloni['stai']! >= 0 ? kletka(t, r, koloni['stai']!) : ''),
      terasi_kvsm: koloni['terasi']! >= 0 ? bezopasnaPlosht(kletka(t, r, koloni['terasi']!)) : 0,
      prodaden: svedeno(tsena) === svedeno(PRODADEN),
    });
  }
  return izhod;
}

function broyOt(surovo: string): number {
  const t = surovo.trim();
  return /^\d+$/.test(t) ? Number(t) : 0;
}

/** Площ, която не спира партидата: нечетимото става нула, не грешка. */
function bezopasnaPlosht(surovo: string): number {
  try {
    return ploshtVKvSm(surovo);
  } catch {
    return 0;
  }
}

/**
 * ПИША ценовата листа — с ТОЧНО неговия хедър.
 *
 * Не се пресъздава чужда таблица: това е неговият формат, попълнен с изчислени
 * цени. „ПРОДАДЕН" се връща както е било — Калкулаторът не преоценява продадено.
 *
 * Числата излизат като ТЕКСТ в българския формат, защото такъв е файлът, от
 * който идват („45,22" с десетична запетая).
 */
export function listNaTsenite(redove: readonly RedNaStoynost[], ime = 'ЦЕНИ'): List {
  const koloni: KolonaNaLista[] = GLAVA_NA_TSENITE.map((ime) => ({
    ime,
    shirina: ime === 'Имоти' ? 28 : 14,
  }));

  return {
    ime,
    koloni,
    redove: redove.map((r) => [
      r.obekt,
      [r.etazh, r.kota].filter((x) => x !== '').join(' · '),
      r.stai === 0 ? '' : String(r.stai),
      kvSmVM2(r.chista_kvsm),
      procentOtChasti(r),
      kvSmVM2(r.obshti_chasti_kvsm),
      kvSmVM2(r.obshta_kvsm),
      r.izlozhenie,
      r.terasi_kvsm === 0 ? '' : kvSmVM2(r.terasi_kvsm),
      r.prodaden ? PRODADEN : bezZnak(r.tsena_st),
      r.prodaden ? '' : bezZnak(r.evroNaKvadrat_st),
    ]),
  };
}

/** Общите части като процент от общата площ — в неговата листа е така. */
function procentOtChasti(r: RedNaStoynost): string {
  if (r.obshta_kvsm === 0) return '';
  // до два знака, в цели стотни от процента — пак без float в записа
  const stotni = Math.round((r.obshti_chasti_kvsm * 10_000) / r.obshta_kvsm);
  return `${Math.floor(stotni / 100)},${String(stotni % 100).padStart(2, '0')}`;
}

/** Сумата без знака на валутата — колоната вече казва, че е евро. */
function bezZnak(suma_st: number): string {
  return kakvoPishe(suma_st as never)
    .replace(/ ?€$/, '')
    .trim();
}
