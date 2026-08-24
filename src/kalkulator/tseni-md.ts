/**
 * ЧЕТЕЦЪТ НА „ЦЕНИ МД" · таблицата на собственика от Драйва (И92 · 24.08).
 *
 * Неговият истински файл („ЦЕНИ МД нова.xlsx") носи ВСИЧКО в един лист:
 * площите (чиста · общи части % и м² · обща), етажа по коти, стаите,
 * изложението, терасите, цената с ДДС и белега ПРОДАДЕН. Тоест той е
 * едновременно Площообразуване И Ценова листа — „да може и без таблицата
 * да стане" (негови думи). Този четец го чете дословно.
 *
 * Главата е ДВУРЕДОВА: „Общи части" стои на първия ред, а „%" и „м2" —
 * на втория, под нея и под съседката ѝ. Затова колоната на общите части
 * в м² е тази СЛЕД процентната — по мястото ѝ, не по име.
 *
 * ДАННИТЕ НЕ СЕ ПОПРАВЯТ (правило 19 по дух): каквото пише файлът, това
 * се чете — включително редове, при които „Обща площ" не излиза от
 * чиста + общи части. Разликата се СМЯТА и се ВРЪЩА на четящия
 * (`sverki`), за да застане пред собственика, не да се преглътне.
 */

import { GreshkaPari, stotinki, type Stotinki } from '../yadro/pari.js';
import { kletka, type Tablitsa } from '../iztochnik/tablitsa.js';
import { ploshtVKvSm } from './chetene.js';

export interface RedOtTseniMD {
  readonly obekt: string;
  /** „етаж 1" от „етаж 1 - кота +/- 0.00" · празно при пренасяне */
  readonly etazh: string;
  readonly kota: string;
  readonly stai: number;
  readonly chista_kvsm: number;
  /** общите части в кв.см · 0, когато редът ги няма (терен) */
  readonly obshti_kvsm: number;
  readonly obshta_kvsm: number;
  readonly izlozhenie: string;
  readonly terasi_kvsm: number;
  readonly prodaden: boolean;
  /** цената с ДДС в стотинки · null при ПРОДАДЕН (файлът не я носи) */
  readonly tsena_st: Stotinki | null;
}

export interface SverkaNaRed {
  readonly obekt: string;
  readonly kakvo: string;
}

export interface ProchetenoTseniMD {
  readonly redove: readonly RedOtTseniMD[];
  readonly propusnati: number;
  /** редове, при които числата на файла не се сверяват помежду си */
  readonly sverki: readonly SverkaNaRed[];
}

/** Сведена дума за търсене в глава — както другаде в калкулатора. */
function svedena(tekst: string): string {
  return tekst.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

const GLAVI = {
  obekt: 'имоти',
  etazhKota: 'етаж кота',
  stai: 'стаи',
  chista: 'чиста площ',
  obshti: 'общи части',
  obshta: 'обща площ',
  izlozhenie: 'изложение',
  terasi: 'тераси',
  tsena: 'цена с ддс',
} as const;

function nameriGlavata(t: Tablitsa): { red: number; koloni: Record<string, number> } | null {
  for (let red = 0; red < Math.min(t.redove.length, 12); red += 1) {
    const glava = (t.redove[red] ?? []).map(svedena);
    const koloni: Record<string, number> = {};
    for (const [klyuch, duma] of Object.entries(GLAVI)) {
      const i = glava.findIndex((g) => g === duma);
      if (i >= 0) koloni[klyuch] = i;
    }
    if (
      koloni['obekt'] !== undefined &&
      koloni['chista'] !== undefined &&
      koloni['obshta'] !== undefined
    ) {
      return { red, koloni };
    }
  }
  return null;
}

/** Този лист в формата „ЦЕНИ МД" ли е — пита се главата, не името. */
export function eListTseniMD(t: Tablitsa): boolean {
  return nameriGlavata(t) !== null;
}

/** Число от клетка на файла · точка ИЛИ запетая, празното е null. */
function chislo(surovo: string): number | null {
  const chisto = surovo.replace(/\s/g, '').replace(',', '.');
  if (chisto === '' || Number.isNaN(Number(chisto))) return null;
  return Number(chisto);
}

/** Цената с ДДС · цели евро от файла → стотинки. „ПРОДАДЕН" не е цена. */
function tsenaVSt(surovo: string): Stotinki | null {
  const n = chislo(surovo);
  if (n === null) return null;
  if (!Number.isInteger(n * 100)) {
    throw new GreshkaPari(`Цената „${surovo}" не е цели стотинки.`);
  }
  return stotinki(Math.round(n * 100));
}

export function prochetiTseniMD(t: Tablitsa): ProchetenoTseniMD {
  const nameren = nameriGlavata(t);
  if (!nameren) {
    throw new Error('В този лист няма глава с „Имоти", „Чиста площ" и „Обща площ".');
  }
  const { red, koloni } = nameren;
  const redove: RedOtTseniMD[] = [];
  const sverki: SverkaNaRed[] = [];
  let propusnati = 0;

  // етажът и котата стоят само на първия ред от групата — пренасят се
  let etazh = '';
  let kota = '';

  // главата е двуредова: данните почват след реда с „%" и „м2", ако той
  // следва главата; иначе — веднага
  const vtoraGlava = (t.redove[red + 1] ?? []).map(svedena);
  const nachalo = vtoraGlava.includes('м2') || vtoraGlava.includes('%') ? red + 2 : red + 1;

  for (let r = nachalo; r < t.redove.length; r += 1) {
    const obekt = kletka(t, r, koloni['obekt']!).trim();
    if (obekt === '') continue;

    const surovEtazh =
      koloni['etazhKota'] === undefined ? '' : kletka(t, r, koloni['etazhKota']).trim();
    if (surovEtazh !== '') {
      // „етаж 1 - кота +/- 0.00" → етаж и кота, разделени по „- кота"
      const tochka = surovEtazh.indexOf('- кота');
      etazh = tochka >= 0 ? surovEtazh.slice(0, tochka).trim() : surovEtazh;
      kota = tochka >= 0 ? surovEtazh.slice(tochka + '- кота'.length).trim() : '';
    }

    try {
      const chista_kvsm = ploshtVKvSm(kletka(t, r, koloni['chista']!));
      const obshta_kvsm = ploshtVKvSm(kletka(t, r, koloni['obshta']!));
      // общите части в м² са колоната СЛЕД процентната (двуредовата глава)
      const obshtiSurovo =
        koloni['obshti'] === undefined ? '' : kletka(t, r, koloni['obshti']! + 1);
      const obshti_kvsm = obshtiSurovo.trim() === '' ? 0 : ploshtVKvSm(obshtiSurovo);

      const tsenaSurovo = koloni['tsena'] === undefined ? '' : kletka(t, r, koloni['tsena']).trim();
      const prodaden = svedena(tsenaSurovo) === 'продаден';
      const tsena_st = prodaden ? null : tsenaVSt(tsenaSurovo);

      const terasiSurovo = koloni['terasi'] === undefined ? '' : kletka(t, r, koloni['terasi']).trim();

      redove.push({
        obekt,
        etazh,
        kota,
        stai: koloni['stai'] === undefined ? 0 : (chislo(kletka(t, r, koloni['stai'])) ?? 0),
        chista_kvsm,
        obshti_kvsm,
        obshta_kvsm,
        izlozhenie: koloni['izlozhenie'] === undefined ? '' : kletka(t, r, koloni['izlozhenie']).trim(),
        terasi_kvsm: terasiSurovo === '' ? 0 : ploshtVKvSm(terasiSurovo),
        prodaden,
        tsena_st,
      });

      // СВЕРКАТА НА САМИЯ ФАЙЛ: чиста + общи ≈ обща (до 2 кв.см от
      // закръгляне). Разликата се КАЗВА, не се поправя тихо — данните са
      // негови, находката е за него. Проверява се и редът без общи части:
      // там обща, различна от чистата, е същото разминаване.
      if (Math.abs(chista_kvsm + obshti_kvsm - obshta_kvsm) > 200) {
        sverki.push({
          obekt,
          kakvo: `чиста + общи части не дава общата (файлът пише друго число)`,
        });
      }
    } catch {
      propusnati += 1;
    }
  }

  return { redove: Object.freeze(redove), propusnati, sverki: Object.freeze(sverki) };
}
