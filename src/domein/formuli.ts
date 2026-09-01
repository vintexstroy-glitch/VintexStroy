/**
 * ФОРМУЛИТЕ НА КОЛОНИТЕ · сметката живее в ХЕДЪРА, не в клетката.
 *
 * И92 т.8–9: „Формулите ще се пишат само при създаване на таблиците, а след
 * това ще се редактира само от Стопанина… ще може да създаваш всякакви
 * таблици с формули вътре."
 *
 * Какво взимаме от занаята (проучването · `docs/otcheti/prouchvaniya-i92.md`):
 *
 *   - колоната е в ТРИ състояния — данни · формула · празна (Grist), и
 *     състоянието се обявява В МОДЕЛА НА ХЕДЪРА, както ADR-014 държи вида;
 *   - формулната колона е ЗАТВОРЕНА: ръчен запис в нея не влиза — сметка не
 *     се пише, сметка се смята (правило 20: знакът се смята, не се записва);
 *   - референцията е ПО НОМЕР на колоната, не по име: преименуването не чупи
 *     формула (Airtable); махането на колона преномерира (`redaktor.ts`);
 *   - формула НЕ сочи формулна колона — плитък граф (Notion: rollup върху
 *     rollup не се поддържа). Плитко = проследимо със свирка и очи;
 *   - наборът е МАЛЪК И ИЗБРОИМ, от падащи менюта, не език: свободен текст
 *     с eval е взрив и на обхвата, и на нулата зависимости (правило 10).
 *
 * Проверката е ПРИ СЪЗДАВАНЕ (Notion 2.0): счупена формула изобщо не се
 * записва. Празен операнд прави празна клетка — нулата не се измисля
 * (проверената нула е различна от нулата, за която никой не е питал).
 */

import { GreshkaPari, otSuma } from '../yadro/pari.js';
import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { VidStoynost } from './vid-stoynost.js';

export class GreshkaFormula extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaFormula';
  }
}

/** Четирите действия, изброени поименно. Ново действие се добавя ТУК. */
export const DEYSTVIYA_NA_FORMULA = ['sbor', 'razlika', 'proizvedenie', 'protsent'] as const;

export type DeystvieNaFormula = (typeof DEYSTVIYA_NA_FORMULA)[number];

export const IMENA_NA_DEYSTVIYATA: Readonly<Record<DeystvieNaFormula, string>> = Object.freeze({
  sbor: 'сбор',
  razlika: 'разлика',
  proizvedenie: 'произведение',
  protsent: 'процент от',
});

/**
 * АГРЕГАТИТЕ ПО РЕДОВЕ · трите вертикални действия (резен 81 · И121 т.2).
 *
 * Негова дума: „нещо да се смята с **комбинация от други редове**, да
 * **наблюдава сметка от други добавени редове**." Хоризонталната формула
 * (горе) смята клетка ОТ СЪЩИЯ ред; агрегатът смята ЕДНО число от ЦЯЛАТА
 * колона-източник — сбор · брой · средно — и всеки ред го показва: колоната
 * е наблюдател, не втори запис. ОТДЕЛЕН списък, защото полето с формула в
 * Отчети (две числа-извори) няма какво да прави с „по редове".
 */
export const DEYSTVIYA_PO_REDOVE = ['sbor-redove', 'broy-redove', 'sredno-redove'] as const;

export type DeystviePoRedove = (typeof DEYSTVIYA_PO_REDOVE)[number];

export const IMENA_PO_REDOVE: Readonly<Record<DeystviePoRedove, string>> = Object.freeze({
  'sbor-redove': 'сбор по редове',
  'broy-redove': 'брой по редове',
  'sredno-redove': 'средно по редове',
});

/** Агрегат ли е действието · вертикално, по редове (резен 81). */
export function eAgregat(d: Formula['deystvie']): d is DeystviePoRedove {
  return (DEYSTVIYA_PO_REDOVE as readonly string[]).includes(d);
}

/** Името на всяко действие, от двата списъка — за екрана и Описа. */
export function imeNaDeystvie(d: Formula['deystvie']): string {
  return eAgregat(d) ? IMENA_PO_REDOVE[d] : IMENA_NA_DEYSTVIYATA[d];
}

export interface Formula {
  readonly deystvie: DeystvieNaFormula | DeystviePoRedove;
  /**
   * Операндите — НОМЕРА на колони в същия модел. Номерът не мърда при
   * преименуване; при махане на колона Редакторът преномерира или отказва.
   * Агрегатът по редове сочи ТОЧНО една колона — източника си.
   */
  readonly ot: readonly number[];
}

/**
 * ЧИСЛО В СТОТНИ · за колони от вид `chislo` и `protsent`.
 *
 * Същата дисциплина като парите: цели най-малки единици, никакъв float.
 * „2,5" → 250 · „20" → 2000 · „1 250,75" → 125075. Приема и „%" — колоната
 * с проценти често го носи в клетките си.
 */
export function otStotni(tekst: string): number {
  const chisto = tekst
    .replace(/[\s  ]/g, '')
    .replace(/%/g, '')
    .replace(',', '.');
  const nameren = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(chisto);
  if (!nameren) throw new GreshkaPari(`Не е число: „${tekst}"`);
  const [, znak, tsyala, drobna = ''] = nameren;
  const sbor = Number(tsyala) * 100 + Number(drobna.padEnd(2, '0'));
  return znak === '-' ? -sbor : sbor;
}

/** Колко операнда иска всяко действие. Сборът е 2 или 3; другите — точно 2. */
function proveriBroya(f: Formula): void {
  if (eAgregat(f.deystvie)) {
    if (f.ot.length !== 1) {
      throw new GreshkaFormula(
        `„${IMENA_PO_REDOVE[f.deystvie]}" иска точно ЕДНА колона — източника, по чиито редове смята.`,
      );
    }
    return;
  }
  if (f.deystvie === 'sbor') {
    if (f.ot.length < 2 || f.ot.length > 3) {
      throw new GreshkaFormula('Сборът иска две или три колони.');
    }
    return;
  }
  if (f.ot.length !== 2) {
    throw new GreshkaFormula(`„${IMENA_NA_DEYSTVIYATA[f.deystvie]}" иска точно две колони.`);
  }
}

/**
 * ВИДЪТ НА ФОРМУЛНАТА КОЛОНА · СМЯТА СЕ от операндите, не се избира.
 *
 * Сбор и разлика: един вид (евро или число) → същият вид. Произведение:
 * евро × число → евро · число × число → число; евро × евро няма смисъл.
 * Процент от: (евро|число) × процент → видът на първата.
 */
export function vidNaFormulata(f: Formula, vidNaKolona: (k: number) => VidStoynost): VidStoynost {
  const vidove = f.ot.map(vidNaKolona);
  const [parvi, vtori] = vidove;

  // АГРЕГАТЪТ ПО РЕДОВЕ (резен 81): броят е число, каквото и да брои;
  // сборът и средното носят вида на източника — а сбор от ставки е число
  // без смисъл, затова процентът има само средно.
  if (eAgregat(f.deystvie)) {
    if (f.deystvie === 'broy-redove') return 'chislo';
    if (parvi === 'evro' || parvi === 'chislo') return parvi;
    if (parvi === 'protsent' && f.deystvie === 'sredno-redove') return parvi;
    throw new GreshkaFormula(
      f.deystvie === 'sredno-redove'
        ? '„Средно по редове" иска колона в евро, число или процент.'
        : '„Сбор по редове" иска колона в евро или число — сбор от ставки е число без смисъл.',
    );
  }

  if (f.deystvie === 'sbor' || f.deystvie === 'razlika') {
    if (!vidove.every((v) => v === parvi)) {
      throw new GreshkaFormula('Сбор и разлика искат колони от ЕДИН вид — евро с евро, число с число.');
    }
    if (parvi !== 'evro' && parvi !== 'chislo') {
      throw new GreshkaFormula('Сбор и разлика работят с евро или число — процент не се сборува.');
    }
    return parvi!;
  }

  if (f.deystvie === 'proizvedenie') {
    if (parvi === 'evro' && vtori === 'chislo') return 'evro';
    if (parvi === 'chislo' && vtori === 'evro') return 'evro';
    if (parvi === 'chislo' && vtori === 'chislo') return 'chislo';
    throw new GreshkaFormula(
      'Произведението е евро × число или число × число — евро по евро няма смисъл.',
    );
  }

  // protsent
  if ((parvi === 'evro' || parvi === 'chislo') && vtori === 'protsent') return parvi;
  throw new GreshkaFormula('„Процент от" иска първо евро или число, после колоната с процента.');
}

/**
 * ПРОВЕРКАТА ПРИ СЪЗДАВАНЕ · счупена формула не се записва (Notion 2.0).
 * Връща вида на колоната, който формулата налага.
 */
export function proveriFormula(
  m: ModelNaTablitsa,
  f: Formula,
  sebe?: number,
): VidStoynost {
  if (
    !(DEYSTVIYA_NA_FORMULA as readonly string[]).includes(f.deystvie) &&
    !(DEYSTVIYA_PO_REDOVE as readonly string[]).includes(f.deystvie)
  ) {
    throw new GreshkaFormula(`Няма такова действие: „${f.deystvie}".`);
  }
  proveriBroya(f);

  const videni = new Set<number>();
  for (const k of f.ot) {
    if (!Number.isInteger(k) || k < 0 || k >= m.glavi.length) {
      throw new GreshkaFormula(`Колона ${k} я няма в главата (${m.glavi.length} колони).`);
    }
    if (k === sebe) throw new GreshkaFormula('Формулата не може да сочи собствената си колона.');
    if (videni.has(k)) {
      throw new GreshkaFormula(`Колона „${m.glavi[k]}" е два пъти във формулата.`);
    }
    videni.add(k);
    if ((m.formuli ?? {})[k] !== undefined) {
      throw new GreshkaFormula(
        `Колона „${m.glavi[k]}" сама е формулна — формула върху формула прави верига, ` +
          'която гние тихо (проучването). Сочи се колоната с данните.',
      );
    }
  }

  return vidNaFormulata(f, (k) => m.vidove[k] ?? 'tekst');
}

/**
 * СМЕТКАТА НА ЕДИН РЕД · суровите клетки на операндите → цели най-малки
 * единици на вида на формулата.
 *
 * Празен операнд → празна клетка (`null`): недописаният ред не ражда
 * измислена нула. Нечетим операнд ХВЪРЛЯ — колоната се чупи гласно, както
 * при парите в `chislovi`.
 */
export function smetniFormula(
  f: Formula,
  surovi: readonly string[],
  vidNaKolona: (k: number) => VidStoynost,
): number | null {
  const deystvie = f.deystvie;
  if (eAgregat(deystvie)) {
    // Празен отговор без питане е по-скъп от липсващ (ADR-041): агрегатът
    // смята от ЦЯЛАТА колона, а тук има само един ред — вика се другият.
    throw new GreshkaFormula(
      `„${IMENA_PO_REDOVE[deystvie]}" се смята от всички редове — през smetniAgregat, не ред по ред.`,
    );
  }
  const chisla: number[] = [];
  for (let i = 0; i < f.ot.length; i += 1) {
    const surovo = (surovi[i] ?? '').trim();
    if (surovo === '') return null;
    const vid = vidNaKolona(f.ot[i]!);
    chisla.push(vid === 'evro' ? otSuma(surovo) : otStotni(surovo));
  }

  const [a, b] = chisla;
  switch (deystvie) {
    case 'sbor':
      return chisla.reduce((s, x) => s + x, 0);
    case 'razlika':
      return a! - b!;
    case 'proizvedenie':
      // стотинки × стотни (или стотни × стотни) → делим веднъж, накрая
      return Math.round((a! * b!) / 100);
    case 'protsent':
      // стойност × стотни от процент → / 100 (стотните) / 100 (процентът)
      return Math.round((a! * b!) / 10_000);
  }
}

/**
 * АГРЕГАТЪТ ПО РЕДОВЕ · едно число от цялата колона-източник (резен 81).
 *
 * Броят брои НЕПРАЗНИТЕ клетки, каквито и да са — и текст; сборът и
 * средното четат числата по вида на източника. Празните се ПРОПУСКАТ, не
 * стават нули (проверената нула е различна от нулата, за която никой не е
 * питал); колона без нито една стойност дава `null` — празно, не нула.
 * Средното се закръгля към най-близкото и се ПОКАЗВА — закръгленото никога
 * не влиза в сбор (`/matematika`); нечетима клетка ХВЪРЛЯ, гласно.
 */
export function smetniAgregat(
  deystvie: DeystviePoRedove,
  surovi: readonly string[],
  vidNaIztochnika: VidStoynost,
): number | null {
  const neprazni = surovi.map((s) => s.trim()).filter((s) => s !== '');
  if (deystvie === 'broy-redove') return neprazni.length * 100;
  if (neprazni.length === 0) return null;
  const chisla = neprazni.map((s) => (vidNaIztochnika === 'evro' ? otSuma(s) : otStotni(s)));
  const sbor = chisla.reduce((a, b) => a + b, 0);
  return deystvie === 'sbor-redove' ? sbor : Math.round(sbor / chisla.length);
}

/** Формулата с думи, за екрана и Описа: „сбор(Наем · ДДС)". */
export function sDumiFormula(m: ModelNaTablitsa, f: Formula): string {
  const imena = f.ot.map((k) => (m.glavi[k] ?? `колона ${k + 1}`).trim());
  return `${imeNaDeystvie(f.deystvie)}(${imena.join(' · ')})`;
}

/** Един смятан ред: номерът му в таблицата и стойността на формулата. */
interface SmetnatRed {
  readonly red: number;
  /** цели най-малки единици · `null` при недописан ред */
  readonly stoynost: number | null;
}

interface SmetnataKolona {
  readonly kolona: number;
  readonly ime: string;
  readonly vid: VidStoynost;
  readonly redove: readonly SmetnatRed[];
  /** сборът на смятаните редове · за колона в евро това са стотинки */
  readonly sbor: number;
  /** редове, при които операнд не се чете като число — казват се, не се крият */
  readonly spanali: readonly number[];
}

/**
 * СМЯТА ВСИЧКИ ФОРМУЛНИ КОЛОНИ на един модел върху една таблица.
 *
 * Смята се ПРИ ПОКАЗВАНЕ, не се записва — както знакът (правило 20) и както
 * скритото, което пак се смята (правило 23). Записът е формулата в модела;
 * стойността е нейна производна и няма собствен дом.
 *
 * Спъналият се ред не чупи цялата колона (за разлика от `chislovi`, където
 * счупена клетка обезсилва сбора): тук редът се брои поименно в `spanali`, а
 * останалите се смятат. Причината е различна — там сборът отива в Приходи и
 * половин сбор е лъжа; тук всеки ред стои сам за себе си на екрана.
 */
export function smetniKolonite(
  m: ModelNaTablitsa,
  danni: {
    readonly redove: readonly number[];
    readonly kletka: (red: number, kolona: number) => string;
  },
): readonly SmetnataKolona[] {
  const izhod: SmetnataKolona[] = [];

  for (const [klyuch, f] of Object.entries(m.formuli)) {
    const kolona = Number(klyuch);
    const redove: SmetnatRed[] = [];
    const spanali: number[] = [];
    let sbor = 0;

    // АГРЕГАТЪТ ПО РЕДОВЕ (резен 81): едно число от цялата колона-източник,
    // показано на всеки ред. „Сборът" му е самата стойност — сумирането на
    // наблюдател по броя редове би умножило истината.
    if (eAgregat(f.deystvie)) {
      let stoynost: number | null = null;
      try {
        stoynost = smetniAgregat(
          f.deystvie,
          danni.redove.map((red) => danni.kletka(red, f.ot[0] ?? 0)),
          m.vidove[f.ot[0] ?? 0] ?? 'tekst',
        );
      } catch (greshka) {
        if (!(greshka instanceof GreshkaPari)) throw greshka;
        spanali.push(...danni.redove);
      }
      for (const red of danni.redove) redove.push({ red, stoynost });
      // „сборът" на наблюдателя е самата стойност — сумиран по броя редове,
      // той би умножил истината.
      sbor = stoynost ?? 0;
    } else {
      for (const red of danni.redove) {
        try {
          const stoynost = smetniFormula(f, f.ot.map((k) => danni.kletka(red, k)), (k) => m.vidove[k] ?? 'tekst');
          redove.push({ red, stoynost });
          if (stoynost !== null) sbor += stoynost;
        } catch (greshka) {
          if (!(greshka instanceof GreshkaPari)) throw greshka;
          spanali.push(red);
          redove.push({ red, stoynost: null });
        }
      }
    }

    izhod.push({
      kolona,
      ime: (m.glavi[kolona] ?? `колона ${kolona + 1}`).trim(),
      vid: m.vidove[kolona] ?? 'tekst',
      redove: Object.freeze(redove),
      sbor,
      spanali: Object.freeze(spanali),
    });
  }

  return Object.freeze(izhod.sort((a, b) => a.kolona - b.kolona));
}
