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

import { GreshkaZip, izvadiBaytove, opisNaZip, type Zapis } from './zip.js';

/** Един запис на архива, като ТЕКСТ · `.xlsx` носи XML вътре. */
async function izvadi(danni: Uint8Array, dv: DataView, z: Zapis): Promise<string> {
  return new TextDecoder().decode(await izvadiBaytove(danni, dv, z));
}

/**
 * ГРЕШКАТА НА АРХИВА се преоблича в грешка на ФОРМАТА.
 *
 * Викащият е подал .xlsx и чака да чуе за .xlsx. „Файлът не е архив" е вярно,
 * но не е неговият въпрос — а класът на грешката е част от договора и вече го
 * има тест. Думите остават същите; сменя се само името отпред.
 */
function opisa(danni: Uint8Array, dv: DataView): Map<string, Zapis> {
  try {
    return opisNaZip(dv);
  } catch (err) {
    if (err instanceof GreshkaZip) throw new GreshkaXLSX(err.message);
    throw err;
  }
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

function listVTablitsa(
  xml: string,
  ime: string,
  nizove: readonly string[],
): { readonly tablitsa: Tablitsa; readonly formuli: ReadonlyMap<number, string> } {
  const redove: string[][] = [];
  /**
   * ФОРМУЛАТА НА КОЛОНАТА · първата, която срещнем в нея.
   *
   * По колона, не по клетка: формулната колона в Excel е ЕДНА сметка,
   * разтеглена надолу. Пазим първата и я гледаме като нейна — а дали цялата
   * колона наистина я носи, го проверява преводачът (`prevod-formula.ts`),
   * като пресмята и сравнява с кешираните стойности на самия Excel.
   */
  const formuli = new Map<number, string>();
  /** Разтеглената формула („shared") стои ЦЯЛА само в първата си клетка. */
  const spodeleni = new Map<string, string>();

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

      // ── ФОРМУЛАТА · дотук четецът виждаше само стойността (дълг M12) ──
      const vazel = /<f\b([^>]*)(?:\/>|>([\s\S]*?)<\/f>)/.exec(tyalo);
      if (vazel) {
        const svoystvaF = vazel[1] ?? '';
        const tekst = razkodiray(vazel[2] ?? '').trim();
        const si = /si="(\d+)"/.exec(svoystvaF)?.[1];
        let izraz = tekst;
        if (si !== undefined) {
          if (tekst !== '') spodeleni.set(si, tekst);
          else izraz = spodeleni.get(si) ?? '';
        }
        if (izraz !== '' && !formuli.has(kade)) formuli.set(kade, izraz);
      }
    }
    redove.push(kletki);
  }

  return { tablitsa: { ime, redove }, formuli };
}

/** Имената на листовете, по реда им в работната книга. */
function imenaNaListove(xml: string): string[] {
  return [...xml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((n) => razkodiray(n[1] ?? ''));
}

/**
 * ФОРМУЛИТЕ НА ЕДИН ЛИСТ · по номер на колона, дословно както са в файла.
 *
 * Пазят се ОТДЕЛНО от таблицата, а не в клетките ѝ: `Tablitsa` е това, което
 * ЧОВЕКЪТ вижда, и стойността е нейната истина. Формулата е ДРУГ факт за
 * същата колона — и той интересува само онзи, който строи таблица от файла.
 */
export interface FormuliteNaLista {
  readonly ime: string;
  readonly poKolona: ReadonlyMap<number, string>;
}

/**
 * Всички листове на .xlsx файл, като таблици.
 *
 * ЕДИН ПЪТ, ДВЕ ЛИЦА: тук се вика четенето с формулите и се връща само
 * половината. Втора подготовка (zip · общи низове · имена на листове) щеше да
 * се разминава с първата точно в ъгъла, който никой не гледа — а обходът за
 * дублирано я хвана още същия ден (правило 17).
 */
export async function otXLSX(danni: Uint8Array, ime = 'Excel'): Promise<Tablitsa[]> {
  return (await otXLSXSFormuli(danni, ime)).tablitsi;
}

/**
 * СЪЩИЯТ ФАЙЛ, но върнати и ФОРМУЛИТЕ · за строенето на таблица от файл.
 *
 * Свой викащ, а не втори параметър на `otXLSX`: десетките викащи на четенето
 * не искат формули и не бива да ги носят. Обхождането е същото — вика се
 * СЪЩАТА функция, не се преписва (правило 17).
 */
export async function otXLSXSFormuli(
  danni: Uint8Array,
  ime = 'Excel',
): Promise<{ readonly tablitsi: Tablitsa[]; readonly formuli: FormuliteNaLista[] }> {
  const dv = new DataView(danni.buffer, danni.byteOffset, danni.byteLength);
  const opis = opisa(danni, dv);

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

  const tablitsi: Tablitsa[] = [];
  const formuli: FormuliteNaLista[] = [];
  for (const [i, klyuch] of listove.entries()) {
    const xml = await izvadi(danni, dv, opis.get(klyuch)!);
    const imeNaLista = imena[i] ?? `лист ${i + 1}`;
    const prochetenoto = listVTablitsa(xml, imeNaLista, nizove);
    tablitsi.push(prochetenoto.tablitsa);
    formuli.push({ ime: imeNaLista, poKolona: prochetenoto.formuli });
  }
  return { tablitsi, formuli };
}
