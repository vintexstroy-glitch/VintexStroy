/**
 * СВОЙ КОЕФИЦИЕНТ · човекът си прави свой, през Вратата.
 *
 * Негово, 30.08, дословно: „**Можеш да вкарваш сам коефициенти.** Всеки
 * коефициент има формула с нужните данни и ти ги събираш, показваш данните
 * участващи в формулите."
 *
 * ═══ ЗАЩО НЕ СВОБОДЕН ТЕКСТ ЗА ФОРМУЛА ═══
 *
 * „Формула" като низ иска четец на изрази, а четец на изрази иска пясъчник:
 * низ, който се смята, е път към Вратата през заден вход. Затова формулата тук
 * е ИЗБОР ОТ СПИСЪК — две ВЕЛИЧИНИ и едно ДЕЙСТВИЕ между тях.
 *
 * Това не е беднота, а граница: дванайсетте величини долу са точно онова, което
 * Огледалото знае да нахрани. Величина, която я няма, не може да бъде написана —
 * вместо да бъде написана и да мълчи (ADR-041).
 *
 * ═══ ЗАЩО ПРЕЗ ВРАТАТА, А НЕ В ПАМЕТТА НА ЕКРАНА ═══
 *
 * Свой коефициент е РЕШЕНИЕ на човек — кое число до кое число казва нещо. Той
 * пътува със служителите, влиза в износа и трябва да носи `actor`. Памет на
 * екрана значи „моят коефициент го няма на другото устройство", а това е тих
 * инцидент, не удобство.
 *
 * САМАТА СТОЙНОСТ не влиза в Журнала — тя се СМЯТА (правило 20). Записва се
 * рецептата, не резултатът.
 *
 * ═══ МАХАНЕТО Е ЗАПИС ═══
 *
 * Правило 1: нищо не се трие. „Махнат" е ново събитие със същия ключ и
 * `mahnat: true` — последната дума бие. Така се вижда КОЙ и КОГА го е махнал, а
 * върнатият коефициент не е нов, а същият.
 */

import type { DanniZaPerioda, Kogato, Merka } from './koefitsienti.js';

export class GreshkaSvoyKoefitsient extends Error {
  override readonly name = 'GreshkaSvoyKoefitsient';
}

/**
 * ВЕЛИЧИНИТЕ · какво може да застане от двете страни на чертата.
 *
 * Всяка сочи ЕДНО поле на `DanniZaPerioda`, тоест нещо, което Огледалото вече
 * смята. Списъкът е ЕДИН дом (правило 17): екранът чете имената оттук, а
 * сметката чете ключовете — двете не могат да се разминат.
 */
export const VELICHINI = [
  'prihod_st',
  'nachisleno_st',
  'razhod_st',
  'operativni_st',
  'krediti_st',
  'dds_za_vnasyane_st',
  'sredstva_st',
  'vzemaniya_st',
  'zadalzheniya_st',
  'aktivi_st',
  'sobstven_kapital_st',
  'stoynost_st',
] as const;

export type Velichina = (typeof VELICHINI)[number];

export const IMENA_NA_VELICHINITE: Readonly<Record<Velichina, string>> = Object.freeze({
  prihod_st: 'приход (събрано)',
  nachisleno_st: 'начислено',
  razhod_st: 'разход · всички',
  operativni_st: 'оперативни разходи',
  krediti_st: 'вноски по кредит',
  dds_za_vnasyane_st: 'ДДС за внасяне',
  sredstva_st: 'средства',
  vzemaniya_st: 'вземания',
  zadalzheniya_st: 'текущи задължения',
  aktivi_st: 'активи',
  sobstven_kapital_st: 'собствен капитал',
  stoynost_st: 'стойност на състоянието',
});

/**
 * КОИ ВЕЛИЧИНИ СА ПОТОК · и защо това решава ВРЕМЕТО на коефициента.
 *
 * Потокът се натрупва през периода (приход, разход); запасът е снимка (средства,
 * задължения). Коефициент, в който участва ПОТОК, няма число без период — и това
 * не се пита човека, а се СМЯТА от избора му.
 *
 * Питането щеше да позволи „състояние", в което участва приходът — число, което
 * тихо зависи от прозорец, който никой не е избирал (същата повреда, която тестът
 * на резен 51 хвана с нулевата точка).
 */
const POTOTSI: ReadonlySet<Velichina> = new Set<Velichina>([
  'prihod_st',
  'nachisleno_st',
  'razhod_st',
  'operativni_st',
  'krediti_st',
  'dds_za_vnasyane_st',
]);

/** Четирите действия · и какво излиза от всяко. */
export const DEYSTVIYA = ['delenie', 'razlika', 'sbor', 'dyal'] as const;

export type DeystvieKoefitsient = (typeof DEYSTVIYA)[number];

export const IMENA_NA_DEYSTVIYATA: Readonly<Record<DeystvieKoefitsient, string>> = Object.freeze({
  delenie: 'А ÷ Б · колко пъти',
  razlika: 'А − Б · разлика в пари',
  sbor: 'А + Б · сбор в пари',
  dyal: 'А ÷ Б · дял в проценти',
});

/** Мярката НЕ се пита — тя следва от действието (правило 17). */
export const MERKATA_NA_DEYSTVIETO: Readonly<Record<DeystvieKoefitsient, Merka>> = Object.freeze({
  delenie: 'pati',
  razlika: 'pari',
  sbor: 'pari',
  dyal: 'protsent',
});

/** Рецептата · това, което влиза в Журнала. Стойността НЕ влиза. */
export interface SvoyKoefitsient {
  readonly klyuch: string;
  readonly ime: string;
  readonly gore: Velichina;
  readonly dolu: Velichina;
  readonly deystvie: DeystvieKoefitsient;
  /** едно изречение: какво КАЗВА това число · може да е празно */
  readonly kakvo: string;
  /** махнат ли е · махането е ЗАПИС, не триене (правило 1) */
  readonly mahnat: boolean;
}

/**
 * КЛЮЧЪТ СЕ СВЕЖДА ОТ ИМЕТО · по същото правило като при мястото.
 *
 * Не се пита с второ поле: две полета за едно нещо са две места, където може да
 * се разминат. Същото име = СЪЩИЯТ коефициент, тоест поправка, не втори ред.
 *
 * NFC го прави Вратата (правило 12); тук падат само крайните интервали и
 * регистърът.
 */
export function klyuchOtImeto(ime: string): string {
  return ime.trim().toLocaleLowerCase('bg-BG');
}

/** Времето се СМЯТА от величините, не се пита. */
export function kogatoSeSmyata(k: Pick<SvoyKoefitsient, 'gore' | 'dolu'>): Kogato {
  return POTOTSI.has(k.gore) || POTOTSI.has(k.dolu) ? 'period' : 'sastoyanie';
}

/** Формулата с ДУМИ · на един ред, както при вградените (негово искане). */
export function formulata(k: Pick<SvoyKoefitsient, 'ime' | 'gore' | 'dolu' | 'deystvie'>): string {
  const znak = k.deystvie === 'razlika' ? '−' : k.deystvie === 'sbor' ? '+' : '÷';
  const opashka = k.deystvie === 'dyal' ? ' × 100' : '';
  return `${k.ime} = ${IMENA_NA_VELICHINITE[k.gore]} ${znak} ${IMENA_NA_VELICHINITE[k.dolu]}${opashka}`;
}

/**
 * ПРОВЕРКАТА · какво Вратата отказва, и то с ДУМИ.
 *
 * Отказът учи: „непозволено" не казва нищо, а „двете страни са едно и също
 * число" казва точно какво да се смени.
 */
export function proveri(k: SvoyKoefitsient): void {
  if (k.klyuch.trim() === '') {
    throw new GreshkaSvoyKoefitsient('Коефициентът иска ключ — по него се намира после.');
  }
  if (k.ime.trim() === '') {
    throw new GreshkaSvoyKoefitsient('Коефициент без име не се чете от човек.');
  }
  if (!VELICHINI.includes(k.gore) || !VELICHINI.includes(k.dolu)) {
    throw new GreshkaSvoyKoefitsient(
      'Величина извън списъка. Пише се само онова, което Огледалото може да нахрани.',
    );
  }
  if (!DEYSTVIYA.includes(k.deystvie)) {
    throw new GreshkaSvoyKoefitsient('Непознато действие между двете величини.');
  }
  // ЕДНА И СЪЩА ВЕЛИЧИНА ОТ ДВЕТЕ СТРАНИ дава 1,00× или 0,00 € — число, което
  // изглежда като отговор и не е ничий въпрос.
  if (k.gore === k.dolu) {
    throw new GreshkaSvoyKoefitsient(
      `И двете страни са „${IMENA_NA_VELICHINITE[k.gore]}" — това дава едно и също число винаги.`,
    );
  }
}

/**
 * СМЯТА един свой коефициент · и КАЗВА, когато не може.
 *
 * Делител нула НЕ дава нула, а ЛИПСА — същото правило като при вградените.
 * Тук то е още по-важно: човекът сам е избрал знаменателя и трябва да види, че
 * е празен, а не да получи нула, която прилича на отговор.
 */
export interface SmetnatSvoy {
  readonly stoynost: number | undefined;
  readonly merka: Merka;
  readonly zashto: string;
}

export function smetni(k: SvoyKoefitsient, d: DanniZaPerioda): SmetnatSvoy {
  const merka = MERKATA_NA_DEYSTVIETO[k.deystvie];
  const a = d[k.gore];
  const b = d[k.dolu];
  if (k.deystvie === 'razlika') return Object.freeze({ stoynost: a - b, merka, zashto: '' });
  if (k.deystvie === 'sbor') return Object.freeze({ stoynost: a + b, merka, zashto: '' });
  if (b === 0) {
    return Object.freeze({
      stoynost: undefined,
      merka,
      zashto: `„${IMENA_NA_VELICHINITE[k.dolu]}" е нула — отношение към нула не съществува.`,
    });
  }
  // Цели числа докрай: стотни при „пъти", базисни точки при „процент".
  const mnozhitel = k.deystvie === 'dyal' ? 10_000 : 100;
  return Object.freeze({
    stoynost: Math.round((a * mnozhitel) / b),
    merka,
    zashto: '',
  });
}

/**
 * СВЕРКА ВХОД↔ИЗХОД · колко са записани, колко са живи, колко махнати.
 *
 * Разликата се записва дори когато е нула (правило 7). Махнатите се БРОЯТ, а не
 * изчезват: „нямаше го" и „махнахме го" са различни неща.
 */
export interface SverkaNaSvoite {
  readonly vhod: number;
  readonly zhivi: number;
  readonly mahnati: number;
  readonly razlika: number;
}

export function sveriSvoite(vsichki: readonly SvoyKoefitsient[]): SverkaNaSvoite {
  const mahnati = vsichki.filter((k) => k.mahnat).length;
  const zhivi = vsichki.length - mahnati;
  return Object.freeze({
    vhod: vsichki.length,
    zhivi,
    mahnati,
    razlika: vsichki.length - (zhivi + mahnati),
  });
}
