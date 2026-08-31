/**
 * EXCEL (.xlsb) БЕЗ ЧУЖДА БИБЛИОТЕКА · двоичната работна книга.
 *
 * ЗАЩО СЪЩЕСТВУВА. Неговите таблици са `.xlsb`, не `.xlsx` — „приходи ·
 * Винтекс Строй АД" дойде точно такъв. Дотук програмата четеше `.xlsx`, `.csv`
 * и `.pdf`, тоест не можеше да прочете ФОРМАТА, в който човекът работи всеки
 * ден. Това не е екзотика, а неговият работен файл.
 *
 * ═══ КАКВО Е .xlsb ═══
 *
 * Същият ZIP като `.xlsx`, но частите вътре са ДВОИЧНИ (BIFF12), не XML.
 * Всеки запис е: НОМЕР (1–2 байта, по 7 бита) · ДЪЛЖИНА (1–4 байта, по 7 бита)
 * · съдържание. Оттук се четат точно две части — общите низове и листът — и
 * нищо не се изпълнява.
 *
 * ═══ КАКВО НЕ ПРАВИ · обявено ═══
 *
 * ФОРМУЛИТЕ не се превеждат. В `.xlsx` формулата стои като текст („=A1*B1"),
 * тук е поток от двоични лексеми — друг език, друг превод. Затова четенето
 * връща СТОЙНОСТИТЕ, които Excel е изчислил, и казва, че формула няма. Пълен
 * превод на BIFF12-израз е свой резен; премълчан, той щеше да изглежда като
 * загубена сметка.
 */

import type { Tablitsa } from './tablitsa.js';
import { GreshkaZip, izvadiBaytove, opisNaZip, type Zapis } from './zip.js';

export class GreshkaXLSB extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaXLSB';
  }
}

// ── ЗАПИСИТЕ · номер · дължина · съдържание ────────────────────────────────

/** Номерата, които се четат. Всичко останало се подминава мълчаливо. */
const ZAPIS = {
  redNaLista: 0,
  klekaBlank: 1,
  kletkaRk: 2,
  kletkaBool: 4,
  kletkaChislo: 5,
  kletkaTekst: 6,
  kletkaOtObshtite: 7,
  formulaTekst: 8,
  formulaChislo: 9,
  formulaBool: 10,
  obshtNiz: 19,
} as const;

interface ProchetenZapis {
  readonly nomer: number;
  readonly tyalo: Uint8Array;
}

/**
 * Разчита потока на записи.
 *
 * Дължината се пише по 7 бита на байт, най-младите първи — същият начин, по
 * който се пише и номерът. Осмият бит казва „има още".
 */
function zapisi(buf: Uint8Array): ProchetenZapis[] {
  const out: ProchetenZapis[] = [];
  let i = 0;
  while (i < buf.length) {
    let nomer = buf[i]! & 0x7f;
    if ((buf[i]! & 0x80) !== 0) {
      i += 1;
      if (i >= buf.length) break;
      nomer |= (buf[i]! & 0x7f) << 7;
    }
    i += 1;

    let dalzhina = 0;
    for (let k = 0; k < 4; k += 1) {
      if (i >= buf.length) return out;
      const b = buf[i]!;
      i += 1;
      dalzhina |= (b & 0x7f) << (7 * k);
      if ((b & 0x80) === 0) break;
    }
    if (i + dalzhina > buf.length) return out;
    out.push({ nomer, tyalo: buf.subarray(i, i + dalzhina) });
    i += dalzhina;
  }
  return out;
}

/** Низ по мярката на Excel: дължина в ЗНАЦИ, после UTF-16 отляво надясно. */
function niz(dv: DataView, tyalo: Uint8Array, otmestvane: number): string {
  const znatsi = dv.getUint32(otmestvane, true);
  if (znatsi === 0xffffffff) return '';
  const kray = otmestvane + 4 + 2 * znatsi;
  if (kray > tyalo.byteLength) return '';
  return new TextDecoder('utf-16le').decode(tyalo.subarray(otmestvane + 4, kray));
}

/**
 * RK · СГЪСТЕНОТО ЧИСЛО на Excel, и двата му капана.
 *
 * Бит 0 казва „дели на 100", бит 1 казва „това е ЦЯЛО число". Разменени, те
 * дават числа като 271 462 080 вместо 63,31 — намерено при първото четене на
 * неговия файл, преди числата да стигнат до него.
 */
function rk(v: number): number {
  const naSto = (v & 1) !== 0;
  const tsyalo = (v & 2) !== 0;
  const bez = v & ~3;
  let chislo: number;
  if (tsyalo) {
    chislo = bez >> 2;
  } else {
    const bufer = new ArrayBuffer(8);
    new DataView(bufer).setUint32(4, bez >>> 0, true);
    chislo = new DataView(bufer).getFloat64(0, true);
  }
  return naSto ? chislo / 100 : chislo;
}

/** Числото, както го пише човек · без опашка от нули и без експонента. */
function pishiChislo(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(15)));
}

function obshtiNizove(chast: Uint8Array): string[] {
  const out: string[] = [];
  for (const z of zapisi(chast)) {
    if (z.nomer !== ZAPIS.obshtNiz) continue;
    const dv = new DataView(z.tyalo.buffer, z.tyalo.byteOffset, z.tyalo.byteLength);
    out.push(niz(dv, z.tyalo, 1));
  }
  return out;
}

/**
 * ЕДИН ЛИСТ · редовете, както ги е написал Excel.
 *
 * Празните редове НЕ се синтезират: листът носи номера на всеки ред, а между
 * тях може да зее и хиляда празни. Пропуснатите се попълват, за да не се
 * разместят данните надолу — но точно толкова, колкото са.
 */
function listVTablitsa(chast: Uint8Array, ime: string, nizove: readonly string[]): Tablitsa {
  const redove: string[][] = [];
  let tekusht: string[] | undefined;

  const slozhi = (kletki: string[], kolona: number, stoynost: string): void => {
    while (kletki.length < kolona) kletki.push('');
    kletki[kolona] = stoynost;
  };

  for (const z of zapisi(chast)) {
    const dv = new DataView(z.tyalo.buffer, z.tyalo.byteOffset, z.tyalo.byteLength);

    if (z.nomer === ZAPIS.redNaLista) {
      if (z.tyalo.byteLength < 4) continue;
      const nomer = dv.getUint32(0, true);
      while (redove.length < nomer) redove.push([]);
      tekusht = [];
      redove.push(tekusht);
      continue;
    }
    if (tekusht === undefined || z.tyalo.byteLength < 8) continue;
    const kolona = dv.getUint32(0, true);

    switch (z.nomer) {
      case ZAPIS.kletkaOtObshtite: {
        if (z.tyalo.byteLength < 12) break;
        slozhi(tekusht, kolona, nizove[dv.getUint32(8, true)] ?? '');
        break;
      }
      case ZAPIS.kletkaRk: {
        if (z.tyalo.byteLength < 12) break;
        slozhi(tekusht, kolona, pishiChislo(rk(dv.getInt32(8, true))));
        break;
      }
      case ZAPIS.kletkaChislo:
      case ZAPIS.formulaChislo: {
        if (z.tyalo.byteLength < 16) break;
        slozhi(tekusht, kolona, pishiChislo(dv.getFloat64(8, true)));
        break;
      }
      case ZAPIS.kletkaTekst:
      case ZAPIS.formulaTekst: {
        slozhi(tekusht, kolona, niz(dv, z.tyalo, 8));
        break;
      }
      case ZAPIS.kletkaBool:
      case ZAPIS.formulaBool: {
        if (z.tyalo.byteLength < 9) break;
        slozhi(tekusht, kolona, z.tyalo[8] === 0 ? 'НЕ' : 'ДА');
        break;
      }
      default:
        break;
    }
  }

  return { ime, redove };
}

/** Имената на листовете · от описа на приложението, по реда им в книгата. */
function imenaNaListove(app: string): string[] {
  const chast = /<TitlesOfParts>([\s\S]*?)<\/TitlesOfParts>/.exec(app)?.[1] ?? '';
  return [...chast.matchAll(/<vt:lpstr>([\s\S]*?)<\/vt:lpstr>/g)].map((m) => m[1] ?? '');
}

/**
 * Всички листове на .xlsb файл, като таблици.
 *
 * Формули НЕ се връщат — виж шапката. Викащият, който строи таблица от файл,
 * получава празна карта и КАЗВА, че формулите не са дошли (правило 15).
 */
export async function otXLSB(danni: Uint8Array, ime = 'Excel'): Promise<Tablitsa[]> {
  const dv = new DataView(danni.buffer, danni.byteOffset, danni.byteLength);
  let opis: Map<string, Zapis>;
  try {
    opis = opisNaZip(dv);
  } catch (err) {
    if (err instanceof GreshkaZip) throw new GreshkaXLSB(err.message);
    throw err;
  }

  const nizove = opis.has('xl/sharedStrings.bin')
    ? obshtiNizove(await izvadiBaytove(danni, dv, opis.get('xl/sharedStrings.bin')!))
    : [];

  const imena = opis.has('docProps/app.xml')
    ? imenaNaListove(new TextDecoder().decode(await izvadiBaytove(danni, dv, opis.get('docProps/app.xml')!)))
    : [];

  const listove = [...opis.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.bin$/.test(k))
    .sort((a, b) => Number(/(\d+)/.exec(a)![1]) - Number(/(\d+)/.exec(b)![1]));

  if (listove.length === 0) throw new GreshkaXLSB(`Във файла „${ime}" няма нито един лист.`);

  const tablitsi: Tablitsa[] = [];
  for (const [i, klyuch] of listove.entries()) {
    const chast = await izvadiBaytove(danni, dv, opis.get(klyuch)!);
    tablitsi.push(listVTablitsa(chast, imena[i] ?? `лист ${i + 1}`, nizove));
  }
  return tablitsi;
}
