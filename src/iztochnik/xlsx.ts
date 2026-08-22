/**
 * EXCEL (.xlsx) БЕЗ ЧУЖДА БИБЛИОТЕКА.
 *
 * Собственикът каза: файлът да се ЧЕТЕ, не да се качва, и то евтино. А готовият
 * пакет няма нито една зависимост — това е част от сигурността му и не се
 * харчи за удобство.
 *
 * Затова .xlsx се чете направо: той е ZIP с XML вътре, а браузърът вече умее
 * да разархивира сам (`DecompressionStream`). Оттук се вадят точно два файла —
 * листът и общите низове — и нищо друго не се изпълнява. ZIP не носи код,
 * който да тръгне; чете се като данни, байт по байт.
 */

import type { Tablitsa } from './tablitsa.js';

export class GreshkaXLSX extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaXLSX';
  }
}

// ── ZIP ────────────────────────────────────────────────────────────────────
const PODPIS_KRAY = 0x06054b50;
const PODPIS_MESTEN = 0x04034b50;

interface Zapis {
  readonly ime: string;
  readonly metod: number;
  readonly nachalo: number;
  readonly golemina: number;
}

/** Чете описа на ZIP-а — без да разархивира нищо. */
function opisNaZip(dv: DataView): Map<string, Zapis> {
  let kray = -1;
  for (let i = dv.byteLength - 22; i >= 0; i -= 1) {
    if (dv.getUint32(i, true) === PODPIS_KRAY) {
      kray = i;
      break;
    }
  }
  if (kray < 0) throw new GreshkaXLSX('Файлът не е .xlsx — липсва краят на архива.');

  const broy = dv.getUint16(kray + 10, true);
  let mesto = dv.getUint32(kray + 16, true);
  const zapisi = new Map<string, Zapis>();
  const chetets = new TextDecoder();

  for (let i = 0; i < broy; i += 1) {
    const dalzhinaNaImeto = dv.getUint16(mesto + 28, true);
    const dopalnitelno = dv.getUint16(mesto + 30, true);
    const komentar = dv.getUint16(mesto + 32, true);
    const ime = chetets.decode(
      new Uint8Array(dv.buffer, dv.byteOffset + mesto + 46, dalzhinaNaImeto),
    );
    zapisi.set(ime, {
      ime,
      metod: dv.getUint16(mesto + 10, true),
      nachalo: dv.getUint32(mesto + 42, true),
      golemina: dv.getUint32(mesto + 20, true),
    });
    mesto += 46 + dalzhinaNaImeto + dopalnitelno + komentar;
  }
  return zapisi;
}

async function izvadi(danni: Uint8Array, dv: DataView, z: Zapis): Promise<string> {
  if (dv.getUint32(z.nachalo, true) !== PODPIS_MESTEN) {
    throw new GreshkaXLSX(`Повреден запис „${z.ime}" в архива.`);
  }
  const nachaloNaDannite =
    z.nachalo + 30 + dv.getUint16(z.nachalo + 26, true) + dv.getUint16(z.nachalo + 28, true);
  const parche = danni.subarray(nachaloNaDannite, nachaloNaDannite + z.golemina);

  if (z.metod === 0) return new TextDecoder().decode(parche);
  if (z.metod !== 8) throw new GreshkaXLSX(`Непознато свиване (${z.metod}) при „${z.ime}".`);

  const potok = new Blob([parche.slice().buffer]).stream().pipeThrough(
    new DecompressionStream('deflate-raw'),
  );
  return new Response(potok).text();
}

// ── XML · само толкова, колкото трябва ─────────────────────────────────────
const ZNATSI = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&apos;', "'"],
]);

function razkodiray(tekst: string): string {
  return tekst.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-z]+);/g, (tsyalo, des, shest) => {
    if (des !== undefined) return String.fromCodePoint(Number(des));
    if (shest !== undefined) return String.fromCodePoint(parseInt(shest, 16));
    return ZNATSI.get(tsyalo) ?? tsyalo;
  });
}

/** Текстът в един възел — всички <t> вътре, слепени. */
function tekstNaVazel(xml: string): string {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((n) => razkodiray(n[1] ?? ''))
    .join('');
}

function obshtiNizove(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((n) => tekstNaVazel(n[1] ?? ''));
}

/** „C12" → 2 (нулево броене). Пази дупките, вместо да ги слепва. */
export function kolonaOtAdres(adres: string): number {
  const bukvi = /^([A-Z]+)/.exec(adres.toUpperCase())?.[1] ?? '';
  let n = 0;
  for (const b of bukvi) n = n * 26 + (b.charCodeAt(0) - 64);
  return n - 1;
}

function listVTablitsa(xml: string, ime: string, nizove: readonly string[]): Tablitsa {
  const redove: string[][] = [];

  for (const red of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const kletki: string[] = [];
    for (const k of (red[1] ?? '').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const svoystva = k[1] ?? '';
      const tyalo = k[2] ?? '';
      const adres = /r="([A-Z]+\d+)"/i.exec(svoystva)?.[1] ?? '';
      const vid = /t="([^"]+)"/.exec(svoystva)?.[1] ?? '';

      let stoynost: string;
      if (vid === 's') {
        const nomer = Number(/<v>([\s\S]*?)<\/v>/.exec(tyalo)?.[1] ?? '-1');
        stoynost = nizove[nomer] ?? '';
      } else if (vid === 'inlineStr') {
        stoynost = tekstNaVazel(tyalo);
      } else {
        stoynost = razkodiray(/<v>([\s\S]*?)<\/v>/.exec(tyalo)?.[1] ?? '');
      }

      const kade = adres ? kolonaOtAdres(adres) : kletki.length;
      while (kletki.length < kade) kletki.push('');
      kletki[kade] = stoynost;
    }
    redove.push(kletki);
  }

  return { ime, redove };
}

/** Имената на листовете, по реда им в работната книга. */
function imenaNaListove(xml: string): string[] {
  return [...xml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((n) => razkodiray(n[1] ?? ''));
}

/** Всички листове на .xlsx файл, като таблици. */
export async function otXLSX(danni: Uint8Array, ime = 'Excel'): Promise<Tablitsa[]> {
  const dv = new DataView(danni.buffer, danni.byteOffset, danni.byteLength);
  const opis = opisNaZip(dv);

  const nizove = opis.has('xl/sharedStrings.xml')
    ? obshtiNizove(await izvadi(danni, dv, opis.get('xl/sharedStrings.xml')!))
    : [];

  const imena = opis.has('xl/workbook.xml')
    ? imenaNaListove(await izvadi(danni, dv, opis.get('xl/workbook.xml')!))
    : [];

  const listove = [...opis.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => Number(/(\d+)/.exec(a)![1]) - Number(/(\d+)/.exec(b)![1]));

  if (listove.length === 0) throw new GreshkaXLSX(`Във файла „${ime}" няма нито един лист.`);

  const izhod: Tablitsa[] = [];
  for (const [i, klyuch] of listove.entries()) {
    const xml = await izvadi(danni, dv, opis.get(klyuch)!);
    izhod.push(listVTablitsa(xml, imena[i] ?? `лист ${i + 1}`, nizove));
  }
  return izhod;
}
