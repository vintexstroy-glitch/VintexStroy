/**
 * КРЕДИТИТЕ · таблицата и РЕД-ПРОЕКЦИЯТА (ADR-079).
 *
 * Негови думи, дословно:
 *
 *   „**Таблица + ред-проекция ★**" *(р83·[79])*
 *   „Кредит е в разходи" *(р83·[37])*
 *   „не той е под реда на разходи и без намеса ако е пусната таблицата.
 *    в Настройки да има опция да изключваш и последната таблица." *(р83·[39])*
 *   „За кредитите имам решения извади главните неща, които могат да симулират
 *    дълг с повече детайли… **интерполирай** за тези кредити вноските в
 *    времето което остава **по дати**…" *(р59·[18])*
 *   „ОБвързани ли са таблицата с кредити с тези от проектите за да работят
 *    формулите, това значи че за кредити да може да избираш кредит
 *    **започвайки от името на проекта** който е вкаран" *(р52·[297])*
 *   „Добре е, за кредит донави и **колко месеца има вноски още. тя се
 *    пресмята**" *(р51·[68])*
 *   отговорникът: „**Избира се при кредита**" *(р57·[100])*
 *
 * ═══ ЗАЩО ТАБЛИЦА И ПРОЕКЦИЯ, А НЕ ДВА ЗАПИСА ═══
 *
 * Договорните данни живеят ТУК. Редът под Разходи е СБОР на вноските за
 * месеца — той се СМЯТА при всяко четене и НЕ се записва като разход.
 *
 * Записан, той щеше да се удвои с реалното плащане, дошло от банковото
 * извлечение, и да надуе месечните разходи точно с размера на вноската. Затова
 * и негово: „Всичко освен Кредит, а именно: Заплати, Фактури Кеш и Фактури
 * Карта" *(р65·[24])* — кредитът е единственият разход, който не се пише ръчно.
 *
 * ═══ ОСТАТЪКЪТ СЕ СМЯТА ═══
 *
 * Няма поле „остатък днес". Има начален остатък и сбор на платените главници.
 * Сторнирано плащане пада от сбора САМО, защото Огледалото вече не го носи —
 * нито един ред код за това. Записан втори път като поле, остатъкът щеше да се
 * разминава точно в деня, в който някой сторнира.
 */

import { deliZakragleno } from '../yadro/pari.js';
import type { VnoskaOtDogovora } from './sabitiya.js';
import {
  dvataProtsenta,
  interpoliraiPlana,
  type DvataProtsenta,
  type VidKredit,
  type VnoskaOtPlana,
} from './kredit-matematika.js';

// ── ЗАПИСИТЕ ───────────────────────────────────────────────────────────────

export interface Kredit {
  readonly id: string;
  readonly seq: number;
  readonly ime: string;
  readonly vid: VidKredit;
  /** „започвайки от името на проекта" · празно е позволено и се КАЗВА */
  readonly proektId: string;
  /** остатъкът В ДЕНЯ `ot` — кредитът се вписва по средата, не от първия ден */
  readonly ostatak_st: number;
  readonly ot: string;
  readonly lihva_bp: number;
  readonly vnoska_st: number;
  readonly den: number;
  /** „Избира се при кредита" · имейлът на отговорника за вноската */
  readonly otgovornik: string;
  /** обезпечението · за LTV; нула значи „няма число", не „нула стойност" */
  readonly obezpechenie_st: number;
}

export interface PlashtanePoKredit {
  readonly id: string;
  readonly seq: number;
  readonly kreditId: string;
  readonly data: string;
  readonly suma_st: number;
  readonly glavnitsa_st: number;
  readonly lihva_st: number;
  readonly taksa_st: number;
  readonly belezhka: string;
}

/** Онова от Огледалото, което кредитите четат · нищо повече. */
export interface OgledaloNaKrediti {
  readonly krediti: ReadonlyMap<string, Kredit>;
  readonly plashtaniyaPoKrediti: readonly PlashtanePoKredit[];
  /** плановете от договорите · планът на банката БИЕ интерполацията (И124 т.12) */
  readonly pogasitelniPlanove: ReadonlyMap<string, readonly VnoskaOtDogovora[]>;
}

// ── КОЛОНИТЕ ───────────────────────────────────────────────────────────────

/**
 * Колоните на таблицата Кредити. „Остатък", „вноски още" и двата процента са
 * СМЕТНАТИ — стоят в таблицата, но не се въвеждат никъде.
 */
export const KOLONI_KREDITI: readonly string[] = Object.freeze([
  'Кредит',
  'Вид',
  'Проект',
  'Отговорник',
  'Начален остатък',
  'Остатък',
  'Вноска',
  'Ден',
  'Договорна лихва',
  'Лихва към деня',
  'Вноски още',
]);

/** Колоните, които НИКОЙ не редактира — сметнати са (правило 23). */
export const ZATVORENI_KREDITI: readonly number[] = Object.freeze([5, 9, 10]);

// ── СМЕТКИТЕ ───────────────────────────────────────────────────────────────

/** Платените главници по един кредит · сторнираното вече го няма. */
function platenaGlavnitsa(kreditId: string, plashtaniya: readonly PlashtanePoKredit[]): number {
  let sbor = 0;
  for (const p of plashtaniya) {
    if (p.kreditId === kreditId) sbor += p.glavnitsa_st;
  }
  return sbor;
}

/** ОСТАТЪКЪТ · начален минус сбора на главниците. Никога под нула. */
export function ostatakNa(k: Kredit, plashtaniya: readonly PlashtanePoKredit[]): number {
  return Math.max(0, k.ostatak_st - platenaGlavnitsa(k.id, plashtaniya));
}

/** Погасен ли е · СМЯТА се от остатъка, няма поле „затворен". */
export function pogasen(k: Kredit, plashtaniya: readonly PlashtanePoKredit[]): boolean {
  return ostatakNa(k, plashtaniya) === 0;
}

/**
 * ОТКЪДЕ ИДВА ПЛАНЪТ · казва се, не се гадае (правило 15).
 *
 * „наличните кредити, които работят с вкаран погасителен план" (И124 т.12):
 * планът на банката БИЕ интерполацията; тя остава резервният път без план.
 */
export function izvorNaPlana(o: OgledaloNaKrediti, k: Kredit): 'договор' | 'интерполация' {
  return (o.pogasitelniPlanove.get(k.id)?.length ?? 0) > 0 ? 'договор' : 'интерполация';
}

/**
 * ПЛАНЪТ на един кредит от днес нататък (резен 73 · И124 т.12).
 *
 * С ВКАРАН ПЛАН: оставащите вноски по ДОГОВОРА — редовете след `dnes`, а
 * „остатъкът след нея" се СМЯТА от остатъка днес минус главниците по реда
 * (договорът не носи остатък — записан, щеше да се разминава при сторно).
 * БЕЗ план: интерполацията, както досега.
 */
export function planaNa(
  o: OgledaloNaKrediti,
  k: Kredit,
  dnes: string,
): readonly VnoskaOtPlana[] {
  const vkaran = o.pogasitelniPlanove.get(k.id) ?? [];
  if (vkaran.length === 0) {
    return interpoliraiPlana(
      ostatakNa(k, o.plashtaniyaPoKrediti),
      k.lihva_bp,
      k.vnoska_st,
      k.den,
      dnes,
    );
  }
  const redove: VnoskaOtPlana[] = [];
  let ostava = ostatakNa(k, o.plashtaniyaPoKrediti);
  for (const v of vkaran) {
    if (v.data <= dnes || ostava <= 0) continue;
    // Главницата се реже до остатъка — както при последната интерполирана
    // вноска: сборът на главниците е ТОЧНО остатъкът, не повече.
    const glavnitsa_st = Math.min(v.glavnitsa_st, ostava);
    ostava -= glavnitsa_st;
    redove.push(
      Object.freeze({
        data: v.data,
        vnoska_st: v.lihva_st + glavnitsa_st,
        lihva_st: v.lihva_st,
        glavnitsa_st,
        ostatak_st: ostava,
      }),
    );
  }
  return Object.freeze(redove);
}

/**
 * „КОЛКО МЕСЕЦА ИМА ВНОСКИ ОЩЕ · тя се пресмята" *(р51·[68])*.
 *
 * Дължината на плана, не поле. Нула при погасен кредит; нула и когато вноската
 * не стига за лихвата — тогава планът е празен и екранът казва защо.
 */
export function mesetsiOshte(o: OgledaloNaKrediti, k: Kredit, dnes: string): number {
  return planaNa(o, k, dnes).length;
}

/** Двата процента за един кредит · към остатъка ДНЕС. */
export function protsentiteNa(
  k: Kredit,
  plashtaniya: readonly PlashtanePoKredit[],
): DvataProtsenta {
  return dvataProtsenta(ostatakNa(k, plashtaniya), k.lihva_bp, k.vnoska_st);
}

// ── РЕД-ПРОЕКЦИЯТА ─────────────────────────────────────────────────────────

export interface RedProektsiya {
  /** месецът `ГГГГ-ММ`, за който е сборът */
  readonly mesets: string;
  /** сборът на вноските, паднали в този месец */
  readonly vnoski_st: number;
  /** от колко кредита се е събрал */
  readonly broy: number;
  /** какво от него е лихва · само тя е РАЗХОД в счетоводен смисъл */
  readonly lihva_st: number;
  /** какво от него е главница · движение между два джоба, не разход */
  readonly glavnitsa_st: number;
}

/**
 * ЕДИНСТВЕНИЯТ РЕД ПОД РАЗХОДИ · сборът на вноските за месеца.
 *
 * Разделен е на лихва и главница, защото те не са едно и също: главницата не е
 * разход — тя е движение между два джоба (кешът пада, дългът пада, нетното
 * богатство пада само с ЛИХВАТА). Същото разсъждение, което вече живее в
 * `razhodnaChast` за личните пари, и същата причина да не се преписва наум.
 *
 * ПРОЕКЦИЯ ЗНАЧИ: нищо не се записва. Викането е чисто, връща число и не
 * докосва Журнала.
 */
export function redProektsiya(
  o: OgledaloNaKrediti,
  mesets: string,
  dnes: string,
): RedProektsiya {
  let vnoski_st = 0;
  let lihva_st = 0;
  let glavnitsa_st = 0;
  let broy = 0;
  for (const k of o.krediti.values()) {
    const plan = planaNa(o, k, dnes);
    const vTozi = plan.filter((v) => v.data.slice(0, 7) === mesets);
    if (vTozi.length === 0) continue;
    broy += 1;
    for (const v of vTozi) {
      vnoski_st += v.vnoska_st;
      lihva_st += v.lihva_st;
      glavnitsa_st += v.glavnitsa_st;
    }
  }
  return Object.freeze({ mesets, vnoski_st, broy, lihva_st, glavnitsa_st });
}

/** Сборът на ВСИЧКИ остатъци · оттук идва `zadalzheniya_st` в коефициентите. */
export function obshtOstatak(o: OgledaloNaKrediti): number {
  let sbor = 0;
  for (const k of o.krediti.values()) sbor += ostatakNa(k, o.plashtaniyaPoKrediti);
  return sbor;
}

/** Сборът на обезпеченията · оттук идва знаменателят на LTV. */
export function obshtoObezpechenie(o: OgledaloNaKrediti): number {
  let sbor = 0;
  for (const k of o.krediti.values()) sbor += k.obezpechenie_st;
  return sbor;
}

// ── АВТО-ДЕЛОТО ЗА ВНОСКАТА ────────────────────────────────────────────────

export interface PredstoyashtaVnoska {
  readonly kreditId: string;
  readonly ime: string;
  readonly data: string;
  readonly suma_st: number;
  readonly otgovornik: string;
  /** колко дни остават · отрицателно значи ПРОСРОЧЕНА */
  readonly dni: number;
}

/**
 * АВТО-ДЕЛОТО · „Всеки месец автоматично" *(р57·[26])*, отговорникът „Избира се
 * при кредита" *(р57·[100])*, и „да влезе в филтъра за Обекти задача вноска с
 * дата в календара" *(р57·[24])*.
 *
 * СМЯТА СЕ ОТ ПЛАНА, не се записва. Записано като събитие при всяко
 * прерисуване, то щеше да ражда дубликат на всяко отваряне на екрана и после
 * да иска чистене — а чистенето в append-only Журнал е сторно на нещо, което
 * никой човек не е решавал.
 *
 * Взима се ПЪРВАТА предстояща вноска на всеки кредит: списъкът е „какво чака
 * ДНЕС", не целият погасителен план.
 */
export function predstoyashtiteVnoski(
  o: OgledaloNaKrediti,
  dnes: string,
  napred = 45,
): readonly PredstoyashtaVnoska[] {
  const redove: PredstoyashtaVnoska[] = [];
  for (const k of o.krediti.values()) {
    const parva = planaNa(o, k, dnes)[0];
    if (!parva) continue;
    const dni = Math.round(
      (Date.parse(`${parva.data}T00:00:00Z`) - Date.parse(`${dnes}T00:00:00Z`)) / 86_400_000,
    );
    if (dni > napred) continue;
    redove.push(
      Object.freeze({
        kreditId: k.id,
        ime: k.ime,
        data: parva.data,
        suma_st: parva.vnoska_st,
        otgovornik: k.otgovornik,
        dni,
      }),
    );
  }
  return Object.freeze(redove.sort((a, b) => a.data.localeCompare(b.data)));
}

// ── ЧЕТИВОТО НА ЕКРАНА ─────────────────────────────────────────────────────

export interface RedNaKredita {
  readonly kredit: Kredit;
  readonly ostatak_st: number;
  readonly pogasen: boolean;
  readonly mesetsiOshte: number;
  readonly protsenti: DvataProtsenta;
  /** какъв дял от кредита е изплатен · базисни пунктове */
  readonly izplateno_bp: number;
}

export function redoveNaKreditite(
  o: OgledaloNaKrediti,
  dnes: string,
): readonly RedNaKredita[] {
  return Object.freeze(
    [...o.krediti.values()]
      .sort((a, b) => a.seq - b.seq)
      .map((k) => {
        const ostatak_st = ostatakNa(k, o.plashtaniyaPoKrediti);
        return Object.freeze({
          kredit: k,
          ostatak_st,
          pogasen: ostatak_st === 0,
          mesetsiOshte: mesetsiOshte(o, k, dnes),
          protsenti: protsentiteNa(k, o.plashtaniyaPoKrediti),
          izplateno_bp:
            k.ostatak_st === 0 ? 0 : deliZakragleno((k.ostatak_st - ostatak_st) * 10_000, k.ostatak_st),
        });
      }),
  );
}
