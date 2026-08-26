/**
 * PDF · чете текста, без чужда библиотека.
 *
 * Какво може: вади текста от страниците. Потоците вътре са свити със същия
 * deflate, който браузърът вече разархивира сам, а текстът стои в оператори
 * `Tj` и `TJ`.
 *
 * Какво НЕ може и се казва направо: PDF не пази таблица, а рисунка от думи с
 * координати. Колоните се познават по разстоянието между тях и това понякога
 * не се получава. Затова, ако таблицата не се разчете, приложението няма да
 * гадае — ще каже „изнеси CSV от банката" и толкова.
 *
 * Шифрован PDF не се отваря. Сканиран (снимка) няма текст вътре и също не се
 * чете — за него трябва разпознаване, което е отделен разговор.
 */

import type { Tablitsa } from './tablitsa.js';

export class GreshkaPDF extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPDF';
  }
}

async function razvii(parche: Uint8Array): Promise<string> {
  const potok = new Blob([parche.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Response(potok).text();
}

/**
 * Между свитите данни и думата `endstream` често стои един нов ред. За zlib
 * той е боклук след края и събаря разархивирането — затова опашката се реже
 * с по един байт, докато мине.
 */
async function razviiTolerantno(parche: Uint8Array): Promise<string> {
  let posledna: unknown;
  for (let otryazani = 0; otryazani <= 2 && parche.length - otryazani > 0; otryazani += 1) {
    try {
      return await razvii(parche.subarray(0, parche.length - otryazani));
    } catch (greshka) {
      posledna = greshka;
    }
  }
  throw posledna;
}

/** Байтовете като латиница-1 — така двоичното не се поврежда от превод на знаци. */
function kato8bitov(danni: Uint8Array): string {
  let izhod = '';
  for (const b of danni) izhod += String.fromCharCode(b);
  return izhod;
}

const IZBYAGANI = new Map([
  ['n', '\n'],
  ['r', '\r'],
  ['t', '\t'],
  ['b', '\b'],
  ['f', '\f'],
  ['(', '('],
  [')', ')'],
  ['\\', '\\'],
]);

/** Низ в скоби, както PDF го пише: `(текст)` с обратни наклонени черти. */
function prochetiNiz(surovo: string): string {
  let izhod = '';
  for (let i = 0; i < surovo.length; i += 1) {
    const znak = surovo[i]!;
    if (znak !== '\\') {
      izhod += znak;
      continue;
    }
    const sled = surovo[i + 1] ?? '';
    if (IZBYAGANI.has(sled)) {
      izhod += IZBYAGANI.get(sled)!;
      i += 1;
    } else if (/[0-7]/.test(sled)) {
      const osmichno = /^[0-7]{1,3}/.exec(surovo.slice(i + 1))![0];
      izhod += String.fromCharCode(parseInt(osmichno, 8));
      i += osmichno.length;
    } else i += 1;
  }
  return izhod;
}

/** Текстът на едно съдържание — по редове, както са начертани. */
function tekstOtSadarzhanie(sadarzhanie: string): string[] {
  const redove: string[] = [];
  let tekusht = '';

  for (const n of sadarzhanie.matchAll(
    /\((?:\\.|[^\\()])*\)\s*Tj|\[((?:\\.|[^\\\]])*)\]\s*TJ|(T\*|Td|TD|ET)/g,
  )) {
    const tsyalo = n[0];
    if (tsyalo.endsWith('Tj')) {
      tekusht += prochetiNiz(/^\(((?:\\.|[^\\()])*)\)/.exec(tsyalo)![1] ?? '');
    } else if (tsyalo.endsWith('TJ')) {
      for (const parche of (n[1] ?? '').matchAll(/\(((?:\\.|[^\\()])*)\)|(-?\d+(?:\.\d+)?)/g)) {
        if (parche[1] !== undefined) tekusht += prochetiNiz(parche[1]);
        // Голямо отрицателно отместване значи разстояние между колони.
        else if (Number(parche[2]) < -100) tekusht += '  ';
      }
    } else {
      if (tekusht.trim() !== '') redove.push(tekusht);
      tekusht = '';
    }
  }
  if (tekusht.trim() !== '') redove.push(tekusht);
  return redove;
}

interface ProchetenPDF {
  readonly redove: readonly string[];
  /** излязла ли е поне една дума — иначе е сканиран или шифрован */
  readonly imaTekst: boolean;
}

export async function otPDF(danni: Uint8Array): Promise<ProchetenPDF> {
  const surovo = kato8bitov(danni);
  if (!surovo.startsWith('%PDF-')) throw new GreshkaPDF('Файлът не е PDF.');
  if (/\/Encrypt\b/.test(surovo)) {
    throw new GreshkaPDF('PDF-ът е шифрован. Отвори го и го запиши без парола.');
  }

  const redove: string[] = [];
  for (const n of surovo.matchAll(/stream\r?\n?([\s\S]*?)endstream/g)) {
    const telo = n[1] ?? '';
    let tekst: string;
    try {
      const baytove = Uint8Array.from(telo, (z) => z.charCodeAt(0) & 0xff);
      tekst = await razviiTolerantno(baytove);
    } catch {
      tekst = telo; // несвит поток
    }
    if (/\bTj\b|\bTJ\b/.test(tekst)) redove.push(...tekstOtSadarzhanie(tekst));
  }

  return { redove, imaTekst: redove.length > 0 };
}

/**
 * От редовете на PDF към таблица: колона се къса там, където има две или
 * повече разстояния. Не винаги се получава — затова резултатът се показва,
 * преди да влезе където и да било.
 */
export function tablitsaOtPDF(prochetten: ProchetenPDF, ime = 'PDF'): Tablitsa {
  return {
    ime,
    redove: prochetten.redove.map((r) => r.split(/\s{2,}/).map((k) => k.trim())),
  };
}
