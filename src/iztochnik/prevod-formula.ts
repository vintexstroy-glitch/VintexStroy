/**
 * ПРЕВОДЪТ НА ФОРМУЛА · от Excel към нашите ЧЕТИРИ (резен 21 · ADR-081).
 *
 * Негови думи, дословно:
 *
 *   „Дали с формули или без формули. Ако може с копирани формули, ако не може
 *    само структура на таблица с числа и допълнително вътре се правят
 *    формулите от стопанина."
 *
 * ═══ ЗАЩО САМО ЧЕТИРИ ═══
 *
 * Наборът ни е МАЛЪК И ИЗБРОИМ — сбор · разлика · произведение · процент от
 * (`formuli.ts`). Той е такъв нарочно: свободен текст с `eval` е взрив и на
 * обхвата, и на нулата зависимости (правило 10).
 *
 * Затова преводът не е „разбери каквото и да е", а РАЗПОЗНАЙ ЕДНА ОТ ЧЕТИРИТЕ.
 * Всичко друго се ОТКАЗВА — и отказът носи ПРИЧИНАТА, за да знае човекът защо
 * тази колона е дошла с числата си, а не със сметката си.
 *
 * ═══ И ЗАЩО ПРЕВЕДЕНОТО СЕ ПРОВЕРЯВА ═══
 *
 * Разпознаването е по ФОРМА. Формата може да съвпадне, а смисълът да не —
 * абсолютен адрес, скрит ред, колона, която сочи навън. Затова преведената
 * формула се ПРЕСМЯТА върху редовете на файла и се сравнява с числата, които
 * самият Excel е кеширал в клетките.
 *
 * Разминат ли се, преводът пада. Сметка, преписана без проверка, е сметка, на
 * която никой не е гледал.
 */

import { kolonaOtAdres } from './xlsx.js';

class GreshkaPrevod extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPrevod';
  }
}

/** Действията, които изобщо могат да дойдат от файл. */
export type DeystvieOtFayl = 'sbor' | 'razlika' | 'proizvedenie' | 'protsent';

export interface PrevedenaFormula {
  readonly deystvie: DeystvieOtFayl;
  /** НОМЕРА на колони, нулево-базирани · същият език като `formuli.ts` */
  readonly ot: readonly number[];
}

export interface Prevod {
  /** дословно, както стои в файла — за следата и за екрана */
  readonly izraz: string;
  /** `undefined`, когато не се превежда; тогава `zashto` казва защо */
  readonly formula: PrevedenaFormula | undefined;
  /** празно, когато преводът е станал */
  readonly zashto: string;
}

/** Един адрес на клетка в СЪЩИЯ ред · `B2`, но не `$B$2` и не `Лист2!B2`. */
const ADRES = /^[A-Z]{1,3}\d{1,7}$/;

/**
 * ЧЕТЕ ЕДИН ОПЕРАНД · връща номера на колоната или хвърля с причина.
 *
 * АБСОЛЮТНИЯТ адрес (`$B$2`) се ОТКАЗВА, а не се чисти от долара: при
 * разтегляне надолу той сочи ЕДИН ред, а нашата формула е колонна и смята за
 * всеки. Приетият без питане, той щеше да даде сметка, вярна само на първия ред.
 */
function operand(chast: string): number {
  const t = chast.trim();
  if (t.includes('$')) {
    throw new GreshkaPrevod(
      `„${t}" е закован адрес. Той сочи ЕДИН ред, а колонната формула смята за всеки — ` +
        'преписан наум, би бил верен само на първия.',
    );
  }
  if (t.includes('!')) {
    throw new GreshkaPrevod(`„${t}" сочи ДРУГ лист. Колоната се храни от своята таблица.`);
  }
  if (!ADRES.test(t)) {
    throw new GreshkaPrevod(`„${t}" не е адрес на клетка.`);
  }
  return kolonaOtAdres(t);
}

/** Всички адреси в един обхват `A2:D2` · само в ЕДИН ред. */
function obhvat(chast: string): number[] {
  const [ot, do_] = chast.split(':').map((x) => x.trim());
  const redOt = /\d+$/.exec(ot ?? '')?.[0];
  const redDo = /\d+$/.exec(do_ ?? '')?.[0];
  if (redOt !== redDo) {
    throw new GreshkaPrevod(
      `„${chast}" е обхват през РЕДОВЕ. Нашата формула смята в един ред, колона по колона.`,
    );
  }
  const a = operand(ot ?? '');
  const b = operand(do_ ?? '');
  if (b < a) throw new GreshkaPrevod(`„${chast}" върви наобратно.`);
  const nomera: number[] = [];
  for (let i = a; i <= b; i += 1) nomera.push(i);
  return nomera;
}

/** Разделя по знак на ВЪРХОВНО ниво · скобите се броят, не се игнорират. */
function razdeli(izraz: string, znak: string): string[] | undefined {
  const chasti: string[] = [];
  let dulbochina = 0;
  let ot = 0;
  for (let i = 0; i < izraz.length; i += 1) {
    const z = izraz[i]!;
    if (z === '(') dulbochina += 1;
    else if (z === ')') dulbochina -= 1;
    else if (z === znak && dulbochina === 0) {
      chasti.push(izraz.slice(ot, i));
      ot = i + 1;
    }
  }
  if (chasti.length === 0) return undefined;
  chasti.push(izraz.slice(ot));
  return chasti;
}

/**
 * ПРЕВЕЖДА ЕДНА ФОРМУЛА · или КАЗВА защо не може.
 *
 * Разпознава точно пет писмени форми, всичките за ЕДИН ред:
 *
 *   `SUM(A2:C2)` · `SUM(A2;B2)` → сбор (две или три колони)
 *   `A2+B2` (+ трета)           → сбор
 *   `A2-B2`                     → разлика
 *   `A2*B2`                     → произведение
 *   `A2*B2/100` · `A2*B2%`      → процент от
 *
 * Всичко друго — IF, VLOOKUP, вложени скоби, константи, адреси от друг лист —
 * се отказва С ДУМИ. Това НЕ е дефект: точно то е неговият втори вариант,
 * „само структура на таблица с числа".
 */
export function prevediFormula(izrazSurov: string): Prevod {
  const izraz = izrazSurov.trim().replace(/^=/, '').replace(/\s+/g, '');
  const bez = (zashto: string): Prevod =>
    Object.freeze({ izraz: izrazSurov.trim(), formula: undefined, zashto });
  const sas = (deystvie: DeystvieOtFayl, ot: readonly number[]): Prevod =>
    Object.freeze({
      izraz: izrazSurov.trim(),
      formula: Object.freeze({ deystvie, ot: Object.freeze([...ot]) }),
      zashto: '',
    });

  if (izraz === '') return bez('Празен израз.');

  try {
    // ── SUM(…) ─────────────────────────────────────────────────────────────
    const sbor = /^SUM\((.+)\)$/i.exec(izraz);
    if (sbor) {
      const vatre = sbor[1]!;
      const nomera = vatre.includes(':')
        ? obhvat(vatre)
        : vatre.split(/[;,]/).map((x) => operand(x));
      if (nomera.length < 2 || nomera.length > 3) {
        return bez(
          `SUM над ${nomera.length} ${nomera.length === 1 ? 'колона' : 'колони'} — ` +
            'нашият сбор е за две или три.',
        );
      }
      return sas('sbor', nomera);
    }

    // ── процент · A2*B2/100 и A2*B2% ───────────────────────────────────────
    const protsent =
      /^([A-Z]{1,3}\d{1,7})\*([A-Z]{1,3}\d{1,7})\/100$/i.exec(izraz) ??
      /^([A-Z]{1,3}\d{1,7})\*([A-Z]{1,3}\d{1,7})%$/i.exec(izraz);
    if (protsent) return sas('protsent', [operand(protsent[1]!), operand(protsent[2]!)]);

    // ── сбор със знак „+" ──────────────────────────────────────────────────
    const sasPlyus = razdeli(izraz, '+');
    if (sasPlyus) {
      if (sasPlyus.length > 3) {
        return bez(`Сбор от ${sasPlyus.length} колони — нашият е за две или три.`);
      }
      return sas('sbor', sasPlyus.map((x) => operand(x)));
    }

    // ── разлика ────────────────────────────────────────────────────────────
    const sasMinus = razdeli(izraz, '-');
    if (sasMinus) {
      if (sasMinus.length !== 2) {
        return bez(`Разлика от ${sasMinus.length} части — нашата е точно две.`);
      }
      return sas('razlika', sasMinus.map((x) => operand(x)));
    }

    // ── произведение ───────────────────────────────────────────────────────
    const sasZvezda = razdeli(izraz, '*');
    if (sasZvezda) {
      if (sasZvezda.length !== 2) {
        return bez(`Произведение от ${sasZvezda.length} части — нашето е точно две.`);
      }
      return sas('proizvedenie', sasZvezda.map((x) => operand(x)));
    }

    const ime = /^([A-Z]+)\(/i.exec(izraz)?.[1];
    return bez(
      ime === undefined
        ? `„${izrazSurov.trim()}" не е сбор, разлика, произведение или процент.`
        : `${ime.toUpperCase()} го няма сред нашите четири — сбор, разлика, произведение, процент.`,
    );
  } catch (greshka) {
    return bez(greshka instanceof Error ? greshka.message : String(greshka));
  }
}
