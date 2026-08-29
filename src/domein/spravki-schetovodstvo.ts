/**
 * СПРАВКИТЕ ЗА СЧЕТОВОДСТВОТО · четирите, поименно (резен 17г).
 *
 * ═══ НЕГОВИТЕ ДУМИ ═══
 *
 *   „При таба на НАП се прави място за работа на счетоводството и справки за
 *    платени, неплатени, декларирани фактури и недекларирани, но платени
 *    фактури." *(29.08)*
 *
 * Четири справки, две оси. Това не са четири механизма, а ДВЕ ДУМИ, зададени
 * на всеки ред:
 *
 *   ПЛАТЕНО ЛИ Е?        · парите минали ли са
 *   ДЕКЛАРИРАНО ЛИ Е?    · периодът му подаден ли е в справка
 *
 * Четирите му справки са четири от четирите клетки на тази таблица — и
 * последната, „недекларирани, но платени", е ЕДИНСТВЕНАТА, която струва пари:
 * платил си, а още не си го обявил.
 *
 * ═══ ГРАНИЦАТА, КОЯТО СЕ БРОИ, А НЕ СЕ ТВЪРДИ ═══
 *
 * „Неплатена фактура" съществува само от ЕДНАТА страна:
 *
 * | страна | има ли „неплатено" | защо |
 * | :---- | :---- | :---- |
 * | приход · вземане | ДА | `ostatak_st > 0` е точно това |
 * | разход · фактура от доставчик | **НЕ** | разходът се ЗАПИСВА вече платен |
 *
 * `Razhod` носи `nachin` и `data` — значи в мига на записа парите вече са
 * минали. Състояние „получена фактура, още неплатена" няма в Журнала, и то не
 * се измисля тук: това е негово решение (правило 18), не аритметика.
 *
 * Затова липсата стои в `LIPSVASHTITE` — списък, който екранът БРОИ. Изречение
 * в коментар не пада на червено, когато някой го надживее (ADR-067 · ADR-072).
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { eZamrazen } from './zamrazyavane.js';

export class GreshkaSpravka extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaSpravka';
  }
}

/**
 * КАКВОТО ДАННИТЕ ОЩЕ НЕ МОГАТ ДА КАЖАТ · изброено поименно.
 *
 * Празен списък би значел „всичко се смята". Този не е празен, и екранът чете
 * оттук — не от изречение, което никой обход не проверява.
 */
export const LIPSVASHTITE: readonly string[] = Object.freeze([
  'фактура от доставчик, получена и ОЩЕ НЕПЛАТЕНА — разходът се записва вече платен, ' +
    'значи такова състояние няма в Журнала',
]);

/** Едната от двете оси · платени ли са парите. */
export type Plateno = 'plateno' | 'neplateno';

/** Другата ос · подадена ли е справка за периода му. */
export type Deklarirano = 'deklarirano' | 'nedeklarirano';

export interface RedZaSchetovodstvoto {
  /** `vzemane:<id>` или `razhod:<id>` · следата назад към същността */
  readonly klyuch: string;
  readonly posoka: 'prihod' | 'razhod';
  /** данъчният период „ГГГГ-ММ" · по него се съди за декларирането */
  readonly period: string;
  readonly data: string;
  readonly koy: string;
  readonly osnovanie: string;
  /** цялата сума на реда */
  readonly suma_st: number;
  /** колко от нея е погасена · при разхода е цялата */
  readonly plateno_st: number;
  readonly sastoyanie: Plateno;
  readonly deklarirano: Deklarirano;
}

/**
 * РЕДОВЕТЕ · вземанията и разходите, сведени до двете оси.
 *
 * ЗАЕДНО, не поотделно: счетоводителят гледа ЕДИН списък, в който има и
 * издадени, и получени фактури — разделени по посока, не по екран. Две
 * отделни справки биха дали две числа за един месец и биха мълчали точно за
 * онова, което ги свързва.
 */
export function redoveteZaSchetovodstvoto(
  o: Ogledalo,
  ot: string,
  do_: string,
): readonly RedZaSchetovodstvoto[] {
  if (!/^\d{4}-\d{2}$/.test(ot) || !/^\d{4}-\d{2}$/.test(do_)) {
    throw new GreshkaSpravka(`Периодите се пишат „ГГГГ-ММ"; получено: „${ot}" → „${do_}".`);
  }
  if (do_ < ot) {
    throw new GreshkaSpravka(`Краят е преди началото: „${ot}" → „${do_}".`);
  }

  const redove: RedZaSchetovodstvoto[] = [];

  for (const v of o.vzemaniya.values()) {
    if (v.period < ot || v.period > do_) continue;
    redove.push({
      klyuch: `vzemane:${v.id}`,
      posoka: 'prihod',
      period: v.period,
      data: v.padezh.slice(0, 10),
      koy: naemetelyaNa(o, v.naemId),
      osnovanie: v.osnovanie,
      suma_st: v.nachisleno_st,
      plateno_st: v.pogaseno_st,
      // НАДПЛАТЕНОТО е платено · остатъкът му е нула или под нея
      sastoyanie: v.ostatak_st > 0 ? 'neplateno' : 'plateno',
      deklarirano: eZamrazen(o, v.period) ? 'deklarirano' : 'nedeklarirano',
    });
  }

  for (const r of o.razhodi.values()) {
    const period = r.data.slice(0, 7);
    if (period < ot || period > do_) continue;
    redove.push({
      klyuch: `razhod:${r.id}`,
      posoka: 'razhod',
      period,
      data: r.data.slice(0, 10),
      koy: r.dostavchik,
      osnovanie: r.opis,
      suma_st: r.suma_st,
      // РАЗХОДЪТ СЕ ЗАПИСВА ВЕЧЕ ПЛАТЕН · виж `LIPSVASHTITE`
      plateno_st: r.suma_st,
      sastoyanie: 'plateno',
      deklarirano: eZamrazen(o, period) ? 'deklarirano' : 'nedeklarirano',
    });
  }

  return Object.freeze(
    redove.sort((a, b) => a.period.localeCompare(b.period) || a.data.localeCompare(b.data)),
  );
}

function naemetelyaNa(o: Ogledalo, naemId: string): string {
  return o.naemi.get(naemId)?.naemetel ?? '';
}

/** Едната справка · редовете ѝ и сборът им. */
export interface Spravka {
  readonly klyuch: string;
  readonly ime: string;
  /** какво пита · с думи, за да не се гадае от името */
  readonly pita: string;
  readonly redove: readonly RedZaSchetovodstvoto[];
  readonly sbor_st: number;
}

const IMENATA = Object.freeze({
  plateni: {
    ime: 'Платени',
    pita: 'парите са минали · и от двете страни',
  },
  neplateni: {
    ime: 'Неплатени',
    pita: 'парите ги няма · само издадени фактури (вземания)',
  },
  deklarirani: {
    ime: 'Декларирани',
    pita: 'периодът им е подаден в ДДС-справка',
  },
  nedeklariraniNoPlateni: {
    ime: 'Недекларирани, но платени',
    pita: 'платено е, а месецът още не е подаден · ТОВА струва пари',
  },
});

export type KoyaSpravka = keyof typeof IMENATA;

/**
 * ЧЕТИРИТЕ СПРАВКИ · от ЕДИН обход по редовете.
 *
 * Един ред влиза в НЯКОЛКО справки, и това е нарочно: „платен" и „недеклариран,
 * но платен" описват един и същ ред от два ъгъла. Затова сборовете им НЕ се
 * събират — те не са дялове на едно цяло, а четири въпроса към една маса.
 */
export function chetiriteSpravki(
  redove: readonly RedZaSchetovodstvoto[],
): Readonly<Record<KoyaSpravka, Spravka>> {
  const napravi = (klyuch: KoyaSpravka, kade: (r: RedZaSchetovodstvoto) => boolean): Spravka => {
    const svoi = redove.filter(kade);
    return Object.freeze({
      klyuch,
      ime: IMENATA[klyuch].ime,
      pita: IMENATA[klyuch].pita,
      redove: Object.freeze(svoi),
      sbor_st: svoi.reduce((s, r) => s + r.suma_st, 0),
    });
  };

  return Object.freeze({
    plateni: napravi('plateni', (r) => r.sastoyanie === 'plateno'),
    neplateni: napravi('neplateni', (r) => r.sastoyanie === 'neplateno'),
    deklarirani: napravi('deklarirani', (r) => r.deklarirano === 'deklarirano'),
    nedeklariraniNoPlateni: napravi(
      'nedeklariraniNoPlateni',
      (r) => r.sastoyanie === 'plateno' && r.deklarirano === 'nedeklarirano',
    ),
  });
}

/**
 * СВЕРКА ВХОД↔ИЗХОД · и тук, върху самите справки (правило 7).
 *
 * Платени + неплатени трябва да дадат ЦЯЛАТА маса — това са единствените две
 * взаимно изключващи се справки от четирите. Декларирано и недекларирано също.
 * Разлика различна от нула значи, че някой ред е изпаднал и от двете — тиха
 * загуба, точно каквато сверката съществува да лови.
 */
export interface SverkaNaSpravkite {
  readonly vsichki: number;
  readonly poPlateno: number;
  readonly poDeklarirano: number;
  readonly nared: boolean;
}

export function sveriSpravkite(
  redove: readonly RedZaSchetovodstvoto[],
  s: Readonly<Record<KoyaSpravka, Spravka>>,
): SverkaNaSpravkite {
  const poPlateno = s.plateni.redove.length + s.neplateni.redove.length;
  const poDeklarirano =
    s.deklarirani.redove.length +
    redove.filter((r) => r.deklarirano === 'nedeklarirano').length;
  return Object.freeze({
    vsichki: redove.length,
    poPlateno,
    poDeklarirano,
    nared: poPlateno === redove.length && poDeklarirano === redove.length,
  });
}

/**
 * МЕСЕЦИТЕ, КОИТО ЧАКАТ ПОДАВАНЕ · платено, но недекларирано.
 *
 * Негово „недекларирани, но платени фактури", обърнато на действие: не списък
 * от редове, а списък от МЕСЕЦИ, всеки с числото си. Човек не подава фактура —
 * той подава МЕСЕЦ.
 */
export interface MesetsZaPodavane {
  readonly period: string;
  readonly broy: number;
  readonly suma_st: number;
}

export function mesetsiteZaPodavane(
  s: Readonly<Record<KoyaSpravka, Spravka>>,
): readonly MesetsZaPodavane[] {
  const po = new Map<string, { broy: number; suma_st: number }>();
  for (const r of s.nedeklariraniNoPlateni.redove) {
    const veche = po.get(r.period) ?? { broy: 0, suma_st: 0 };
    po.set(r.period, { broy: veche.broy + 1, suma_st: veche.suma_st + r.suma_st });
  }
  return Object.freeze(
    [...po.entries()]
      .map(([period, x]) => ({ period, ...x }))
      .sort((a, b) => a.period.localeCompare(b.period)),
  );
}
