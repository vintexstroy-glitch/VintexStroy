/**
 * PDF · чете текста, без чужда библиотека.
 *
 * Какво може: вади текста от страниците. Потоците вътре са свити със същия
 * deflate, който браузърът вече разархивира сам, а текстът стои в оператори
 * `Tj` и `TJ`.
 *
 * ═══ ЗАЩО ЧЕТЕЦЪТ ЗНАЕ ЗА ШРИФТОВЕ (резен 110 · ADR-166) ═══
 *
 * Първата версия четеше САМО низовете в скоби — `(текст) Tj`. Това стига за
 * файл, писан от нас, и не стига за нито един истински: неговите три файла
 * (погасителен план от банка, КСС и линеен график от MS Project) пишат текста
 * като ШЕСТНАЙСЕТИЧНИ низове — `<0424...> Tj` — където числата не са букви, а
 * НОМЕРА НА ЗНАЦИ в подмножен шрифт. Преводът им живее в `/ToUnicode` на самия
 * шрифт и е РАЗЛИЧЕН за всеки: същият номер 0x41 е „А" в единия и „5" в
 * другия. Затова редът се чете с текущия шрифт (`Tf`), а не с една обща
 * таблица — обща таблица дава смес, която изглежда като текст и лъже.
 *
 * Платено с находка: от 121 вноски в неговия погасителен план се четяха 37, а
 * шапката („Кредитополучател", „Салдо по редовна главница") я нямаше изобщо.
 * Сверката вход↔изход щеше да хване липсата (правило 7) — но чак след като
 * човекът е избрал файла и е чакал.
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
  // БАЙТОВЕ, не UTF-8. Разгънатото съдържание е СМЕС: оператори на латиница и
  // низове в чужда кодировка. Прочетено като UTF-8, всяко „лошо" байтче става
  // U+FFFD и осмичните бягства (`\350`) вече не се четат.
  return kato8bitov(new Uint8Array(await new Response(potok).arrayBuffer()));
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
  // ПОСЛЕДЕН ОПИТ · КАКВОТО Е ИЗЛЯЗЛО ДО ГРЕШКАТА.
  //
  // Разгъването е ПОТОК: когато се спъне на средата, вече е дало началото.
  // Изхвърлено, то струва цяла страница; запазено, дава редовете си, а
  // липсващите ги хваща сверката вход↔изход (правило 7), не мълчанието.
  //
  // Не е измислен случай: същият поток от неговия погасителен план се разгъва
  // ЦЯЛ в браузъра и се спъва в Node 24 (друга библиотека под същото име).
  // Четец, който работи само на едната машина, е половин четец.
  const chastichno = await dokadeStigne(parche);
  if (chastichno !== '') return chastichno;
  throw posledna;
}

/** Чете разгънатото, докато потокът върви, и връща стигнатото при спъване. */
async function dokadeStigne(parche: Uint8Array): Promise<string> {
  const parcheta: Uint8Array[] = [];
  try {
    const chetets = new Blob([parche.slice().buffer])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'))
      .getReader();
    for (;;) {
      const { done, value } = await chetets.read();
      if (done) break;
      if (value) parcheta.push(value);
    }
  } catch {
    // спънало се е — каквото е дошло дотук, остава
  }
  let dalzhina = 0;
  for (const p of parcheta) dalzhina += p.length;
  const vsichko = new Uint8Array(dalzhina);
  let kade = 0;
  for (const p of parcheta) {
    vsichko.set(p, kade);
    kade += p.length;
  }
  return kato8bitov(vsichko);
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

/** Преводът „номер на знак → буква" на ЕДИН шрифт. Празен значи „чети както е". */
type Prevod = ReadonlyMap<number, string>;

const BEZ_PREVOD: Prevod = new Map();

/**
 * `/ToUnicode` на шрифта · двата вида записи, `bfchar` и `bfrange`.
 *
 * Диапазонът се реже на 4 096 знака: повреден файл може да обяви милиард и да
 * изяде паметта на телефона, а нито един истински шрифт няма толкова.
 */
function prevodOtCMap(tekst: string): Prevod {
  const prevod = new Map<number, string>();
  const otShestnaysetichno = (h: string): string =>
    (h.match(/.{1,4}/g) ?? []).map((ch) => String.fromCharCode(parseInt(ch.padEnd(4, '0'), 16))).join('');

  for (const blok of tekst.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const dvoyka of (blok[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      prevod.set(parseInt(dvoyka[1]!, 16), otShestnaysetichno(dvoyka[2] ?? ''));
    }
  }
  for (const blok of tekst.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const troyka of (blok[1] ?? '').matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      const ot = parseInt(troyka[1]!, 16);
      const do_ = parseInt(troyka[2]!, 16);
      const kam = parseInt(troyka[3]!, 16);
      for (let i = 0; i <= Math.min(do_ - ot, 4096); i += 1) {
        if (kam + i <= 0x10ffff) prevod.set(ot + i, String.fromCodePoint(kam + i));
      }
    }
  }
  return prevod;
}

interface Obekt {
  readonly glava: string;
  readonly potok: Uint8Array | null;
}

/** Всички непреки обекти по номер · главата като текст, потокът като байтове. */
function obektite(surovo: string, danni: Uint8Array): Map<number, Obekt> {
  const obekti = new Map<number, Obekt>();
  for (const n of surovo.matchAll(/(\d+)\s+\d+\s+obj\b/g)) {
    const nachalo = n.index + n[0].length;
    const kray = surovo.indexOf('endobj', nachalo);
    const tyalo = surovo.slice(nachalo, kray === -1 ? undefined : kray);
    const s = tyalo.indexOf('stream');
    if (s === -1) {
      obekti.set(Number(n[1]), { glava: tyalo, potok: null });
      continue;
    }
    let p = nachalo + s + 'stream'.length;
    if (surovo.startsWith('\r\n', p)) p += 2;
    else if (surovo[p] === '\n' || surovo[p] === '\r') p += 1;
    const e = surovo.indexOf('endstream', p);
    obekti.set(Number(n[1]), {
      glava: tyalo.slice(0, s),
      potok: danni.subarray(p, e === -1 ? danni.length : e),
    });
  }
  return obekti;
}

async function tekstNaPotoka(o: Obekt | undefined): Promise<string> {
  if (!o || o.potok === null) return '';
  if (!/\/FlateDecode\b/.test(o.glava)) return kato8bitov(o.potok);
  try {
    return await razviiTolerantno(o.potok);
  } catch {
    return '';
  }
}

/**
 * РЕЧНИК ПО КЛЮЧ, ПРЕБРОЕН, НЕ ПОГАДАН.
 *
 * `/Resources << /Font << … >> /XObject << … >> >>` е речник В речник. Лаком
 * или мързелив израз не може да го отреже: мързеливият спира на първото `>>`
 * (тоест на затварянето на `/Font`), лакомият — на последното в целия обект.
 * Затова скобите се БРОЯТ. Платено с находка: шрифтовете на страницата
 * излизаха нула, кирилицата изчезваше, а редовете с числа се четяха — файл,
 * който изглежда прочетен наполовина, е по-лош от отказан.
 */
function rechnikSled(tekst: string, klyuch: string): string {
  const kade = tekst.indexOf(klyuch);
  if (kade === -1) return '';
  const nachalo = tekst.indexOf('<<', kade);
  if (nachalo === -1) return '';
  let dalbochina = 0;
  for (let i = nachalo; i < tekst.length - 1; i += 1) {
    if (tekst.startsWith('<<', i)) {
      dalbochina += 1;
      i += 1;
    } else if (tekst.startsWith('>>', i)) {
      dalbochina -= 1;
      if (dalbochina === 0) return tekst.slice(nachalo + 2, i);
      i += 1;
    }
  }
  return '';
}

/** Речникът на ресурсите · пряко в главата или през препратка. */
function resursite(glava: string, obekti: Map<number, Obekt>): string {
  const pryako = rechnikSled(glava, '/Resources');
  if (pryako !== '') return pryako;
  const chrez = /\/Resources\s+(\d+)\s+\d+\s+R/.exec(glava);
  return chrez ? (obekti.get(Number(chrez[1]))?.glava ?? '') : '';
}

interface Stranitsa {
  readonly sadarzhanie: string;
  /** име на шрифта (`F1`) → превод на знаците му */
  readonly shriftove: ReadonlyMap<string, Prevod>;
}

/**
 * Страниците: съдържанието им и шрифтовете, с които е писано.
 *
 * Обходът е по СТРАНИЦИ, а не по всички потоци, и това не е само подредба:
 * така се разархивира само каквото трябва (в неговия КСС картинките са 800 КБ
 * от 830), и всеки поток идва със СВОИТЕ шрифтове.
 */
async function stranitsite(surovo: string, danni: Uint8Array): Promise<Stranitsa[]> {
  const obekti = obektite(surovo, danni);
  const prevodi = new Map<number, Prevod>();
  const prevodNaShrifta = async (nomer: number): Promise<Prevod> => {
    const kam = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(obekti.get(nomer)?.glava ?? '');
    if (!kam) return BEZ_PREVOD;
    const kluch = Number(kam[1]);
    if (!prevodi.has(kluch)) prevodi.set(kluch, prevodOtCMap(await tekstNaPotoka(obekti.get(kluch))));
    return prevodi.get(kluch)!;
  };

  const stranitsi: Stranitsa[] = [];
  for (const [, o] of obekti) {
    if (!/\/Type\s*\/Page[^s]/.test(o.glava)) continue;
    const shriftove = new Map<string, Prevod>();
    const res = resursite(o.glava, obekti);
    const rechnik = rechnikSled(res, '/Font');
    const vFayl =
      rechnik !== ''
        ? rechnik
        : (() => {
            const chrez = /\/Font\s+(\d+)\s+\d+\s+R/.exec(res);
            return chrez ? (obekti.get(Number(chrez[1]))?.glava ?? '') : '';
          })();
    for (const shrift of vFayl.matchAll(/\/([A-Za-z0-9#+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
      shriftove.set(shrift[1]!, await prevodNaShrifta(Number(shrift[2])));
    }

    let sadarzhanie = '';
    const edno = /\/Contents\s+(\d+)\s+\d+\s+R/.exec(o.glava);
    if (edno) sadarzhanie = await tekstNaPotoka(obekti.get(Number(edno[1])));
    else {
      const spisak = /\/Contents\s*\[([\s\S]*?)\]/.exec(o.glava);
      for (const r of (spisak?.[1] ?? '').matchAll(/(\d+)\s+\d+\s+R/g)) {
        sadarzhanie += `${await tekstNaPotoka(obekti.get(Number(r[1])))}\n`;
      }
    }
    if (sadarzhanie !== '') stranitsi.push({ sadarzhanie, shriftove });
  }
  return stranitsi;
}

/** Шестнайсетичен низ `<0424...>` през превода на текущия шрифт. */
function prochetiShestnaysetichen(surovo: string, prevod: Prevod): string {
  const chisto = surovo.replace(/\s/g, '');
  if (chisto === '') return '';
  // Двубайтови номера, когато преводът познава такива — подмножените шрифтове
  // на банката и на MS Project пишат по два байта на знак.
  const dvubaytov = [...prevod.keys()].some((k) => k > 0xff) || chisto.length % 4 === 0;
  const stapka = dvubaytov ? 4 : 2;
  let izhod = '';
  for (let i = 0; i + stapka <= chisto.length; i += stapka) {
    const nomer = parseInt(chisto.slice(i, i + stapka), 16);
    const bukva = prevod.get(nomer);
    if (bukva !== undefined) {
      izhod += bukva;
      continue;
    }
    if (stapka === 2 && nomer >= 32 && nomer < 127) {
      izhod += String.fromCharCode(nomer);
      continue;
    }
    // ЗНАК, КОЙТО ШРИФТЪТ НЕ ПРЕВЕЖДА, СТАВА ИНТЕРВАЛ — не изчезва.
    //
    // Изнесеното от MS Project пропуска ИНТЕРВАЛА в своя `/ToUnicode` (номер
    // 3 го няма сред 123-те). Изхвърлен, той слепва думите: „Изграждане
    // ПроектвУПИ" вместо „Изграждане Проект в УПИ". Интервалът не измисля
    // буква — той признава дупка, а дупката се вижда. Поредица от непреведени
    // знаци дава ЕДИН интервал, за да не се роди фалшива колона (две и повече
    // разстояния са граница на колона в `tablitsaOtPDF`).
    if (!izhod.endsWith(' ')) izhod += ' ';
  }
  return izhod;
}

const LEKSEMI =
  /\/([A-Za-z0-9#+.-]+)\s+[-\d.]+\s+Tf|\((?:\\.|[^\\()])*\)\s*Tj|<([0-9A-Fa-f\s]*)>\s*Tj|\[((?:\\.|[^\\\]])*)\]\s*TJ|(-?[\d.]+)\s+(-?[\d.]+)\s+(Td|TD)|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(T\*|BT|ET)/g;

/**
 * ЕДНО ПАРЧЕ ТЕКСТ И КЪДЕ Е НАРИСУВАНО.
 *
 * Координатите не са украса: в ПДФ таблица НЯМА. Има думи с места, и КОЛОНАТА
 * се познава по `x`, а РЕДЪТ — по `y`. Точно затова първата версия на резен 110
 * не можеше да сглоби шестте колони на КСС: четецът връщаше само низове, а с
 * тях „кое е количество и кое цена" се гадае по вид на числото.
 *
 * И още едно, което се вижда само с `x`: ОТСТЪПЪТ на MS Project. Нивото на
 * задачата („дела и поддела", И131 т.2) не е записано никъде във файла — то е
 * колко навътре е нарисувано името. Изхвърлиш ли `x`, губиш цялото дърво.
 */
export interface TekstovBlok {
  readonly x: number;
  readonly y: number;
  readonly tekst: string;
}

/** Текстът на едно съдържание — парчетата с местата им. */
function blokoveOtSadarzhanie(
  sadarzhanie: string,
  shriftove: ReadonlyMap<string, Prevod>,
): TekstovBlok[] {
  const blokove: TekstovBlok[] = [];
  let tekusht = '';
  let prevod: Prevod = BEZ_PREVOD;
  let x = 0;
  let y = 0;
  let zapochnal = { x: 0, y: 0 };

  const zatvori = (): void => {
    if (tekusht.trim() !== '') blokove.push({ x: zapochnal.x, y: zapochnal.y, tekst: tekusht });
    tekusht = '';
  };

  for (const n of sadarzhanie.matchAll(LEKSEMI)) {
    const tsyalo = n[0];
    if (n[1] !== undefined) {
      prevod = shriftove.get(n[1]) ?? BEZ_PREVOD;
      continue;
    }
    if (n[5] !== undefined && n[6] !== undefined) {
      // `Td`/`TD` местят ОТНОСИТЕЛНО — те са „нов ред" на същата рисунка.
      zatvori();
      x += Number(n[4] ?? 0);
      y += Number(n[5] ?? 0);
      zapochnal = { x, y };
      continue;
    }
    if (n[12] !== undefined) {
      // `Tm` задава матрицата ИЗЦЯЛО: последните две числа са мястото.
      zatvori();
      x = Number(n[11] ?? 0);
      y = Number(n[12] ?? 0);
      zapochnal = { x, y };
      continue;
    }
    if (n[13] !== undefined) {
      // `T*` е нов ред, `BT`/`ET` — начало и край на текстов обект.
      zatvori();
      if (tsyalo === 'BT') {
        x = 0;
        y = 0;
        zapochnal = { x, y };
      }
      continue;
    }
    if (tekusht === '') zapochnal = { x, y };
    if (n[2] !== undefined) {
      tekusht += prochetiShestnaysetichen(n[2], prevod);
    } else if (n[3] !== undefined) {
      for (const parche of n[3].matchAll(/\(((?:\\.|[^\\()])*)\)|<([0-9A-Fa-f\s]*)>|(-?\d+(?:\.\d+)?)/g)) {
        if (parche[1] !== undefined) tekusht += prevodenNiz(parche[1], prevod);
        else if (parche[2] !== undefined) tekusht += prochetiShestnaysetichen(parche[2], prevod);
        // Голямо отрицателно отместване значи разстояние между колони.
        else if (Number(parche[3]) < -100) tekusht += '  ';
      }
    } else if (tsyalo.endsWith('Tj')) {
      tekusht += prevodenNiz(/^\(((?:\\.|[^\\()])*)\)/.exec(tsyalo)![1] ?? '', prevod);
    }
  }
  zatvori();
  return blokove;
}

/**
 * РЕДОВЕ ОТ ПАРЧЕТА · едно `y` е един ред, редът се чете отляво надясно.
 *
 * Допускът е в точки на ПДФ (72 на инч): парчета на един и същ ред се
 * разминават с частица от точката заради подравняване по основа, а два
 * съседни реда в плътна таблица са на 9–12 точки. Затова 3 е и достатъчно
 * широко, и достатъчно тясно — премерено на неговите три файла.
 */
export function redoveOtBlokove(blokove: readonly TekstovBlok[], dopusk = 3): TekstovBlok[][] {
  const podredeni = [...blokove].sort((a, b) => (b.y === a.y ? a.x - b.x : b.y - a.y));
  const redove: TekstovBlok[][] = [];
  for (const b of podredeni) {
    const posleden = redove[redove.length - 1];
    if (posleden && Math.abs((posleden[0]?.y ?? 0) - b.y) <= dopusk) posleden.push(b);
    else redove.push([b]);
  }
  for (const red of redove) red.sort((a, b) => a.x - b.x);
  return redove;
}

/** Низ в скоби, минал и през превода на шрифта, когато шрифтът има такъв. */
function prevodenNiz(surovo: string, prevod: Prevod): string {
  const chetim = prochetiNiz(surovo);
  if (prevod.size === 0) return chetim;
  let izhod = '';
  for (const znak of chetim) izhod += prevod.get(znak.charCodeAt(0)) ?? znak;
  return izhod;
}

interface ProchetenPDF {
  readonly redove: readonly string[];
  /** парчетата с местата им · страница по страница, в реда на рисуване */
  readonly stranitsi: readonly (readonly TekstovBlok[])[];
  /** излязла ли е поне една дума — иначе е сканиран или шифрован */
  readonly imaTekst: boolean;
}

export async function otPDF(danni: Uint8Array): Promise<ProchetenPDF> {
  const surovo = kato8bitov(danni);
  if (!surovo.startsWith('%PDF-')) throw new GreshkaPDF('Файлът не е PDF.');
  if (/\/Encrypt\b/.test(surovo)) {
    throw new GreshkaPDF('PDF-ът е шифрован. Отвори го и го запиши без парола.');
  }

  const poStranitsi: TekstovBlok[][] = [];
  for (const s of await stranitsite(surovo, danni)) {
    poStranitsi.push(blokoveOtSadarzhanie(s.sadarzhanie, s.shriftove));
  }

  // ПОСЛЕДЕН ОПИТ · файл без разпознаваеми страници (сглобен от инструмент,
  // който пише обектите в поток). Тогава се четат всички потоци, както преди
  // резен 110 — без шрифтове, но по-добре от празно.
  if (poStranitsi.length === 0) {
    for (const n of surovo.matchAll(/stream\r?\n?([\s\S]*?)endstream/g)) {
      const telo = n[1] ?? '';
      let tekst: string;
      try {
        tekst = await razviiTolerantno(Uint8Array.from(telo, (z) => z.charCodeAt(0) & 0xff));
      } catch {
        tekst = telo; // несвит поток
      }
      if (/\bTj\b|\bTJ\b/.test(tekst)) poStranitsi.push(blokoveOtSadarzhanie(tekst, new Map()));
    }
  }

  const redove = poStranitsi.flat().map((b) => b.tekst);
  return { redove, stranitsi: poStranitsi, imaTekst: redove.length > 0 };
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
