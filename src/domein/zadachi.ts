/**
 * ЗАДАЧИТЕ НА АГЕНТА · разписанието и уменията им (И94 т.1).
 *
 * Негови думи: „Всяка задача се прикачат умения и задачата може да е
 * ВСЕКИДНЕВНА, СЕДМИЧНА, ЗА ОПРЕДЕЛЕН СРОК. Има и ПОСТОЯННИ задачи с умения
 * като длъжностната характеристика, която не може да се изключи и включи и е
 * НОРМА."
 *
 * Оттук четирите разписания — изброени поименно, не измислени в движение —
 * и едно правило, което ги дели на две:
 *
 *   **Постоянната задача е НОРМА, не поръчка.** Тя не се включва и изключва,
 *   както характеристиката не се изключва (И93). Другите три се възлагат,
 *   свършват и падат.
 *
 * Задачата НЕ пише нищо. Тя казва КОГА агентът да предложи; предложението
 * пак чака човешка присъда (правило 18).
 */

import { BROY_UMENIYA, GreshkaAgent, proveriTriUmeniya, type Agent } from './agenti.js';

/** Четирите разписания. Ново се добавя ТУК, където се вижда. */
export const RAZPISANIYA = ['vsekidnevna', 'sedmichna', 'srok', 'postoyanna'] as const;

export type Razpisanie = (typeof RAZPISANIYA)[number];

export const IMENA_NA_RAZPISANIYATA: Readonly<Record<Razpisanie, string>> = Object.freeze({
  vsekidnevna: 'всекидневна',
  sedmichna: 'седмична',
  srok: 'за определен срок',
  postoyanna: 'ПОСТОЯННА · норма',
});

/** Постоянната не се включва и изключва — тя е норма (негови думи). */
export function ePostoyanna(r: Razpisanie): boolean {
  return r === 'postoyanna';
}

export interface Zadacha {
  readonly id: string;
  /** ключът на агента, на когото е възложена */
  readonly agent: string;
  /** какво да провери или сметне, с думи */
  readonly kakvo: string;
  readonly razpisanie: Razpisanie;
  /** ТРИТЕ умения, прикачени за ТАЗИ задача (правило 25) */
  readonly umeniya: readonly string[];
  /** ден от седмицата при седмичната: 1 = понеделник … 7 = неделя */
  readonly denOtSedmitsata: number;
  /** при „за определен срок": от коя до коя дата, включително */
  readonly ot: string;
  readonly do: string;
  /** включена ли е · постоянната е ВИНАГИ включена */
  readonly vklyuchena: boolean;
  /** потвърдена ли е с имейл (И94 т.1) — иначе не тръгва */
  readonly potvardena: boolean;
  readonly kogato: string;
}

export function napraviZadacha(
  a: Agent,
  n: {
    readonly id: string;
    readonly kakvo: string;
    readonly razpisanie: Razpisanie;
    readonly umeniya: readonly string[];
    readonly denOtSedmitsata?: number;
    readonly ot?: string;
    readonly do?: string;
    readonly kogato: string;
  },
): Zadacha {
  const kakvo = n.kakvo.trim().replace(/\s+/g, ' ');
  if (kakvo === '') throw new GreshkaAgent('Задачата иска да се каже КАКВО да провери.');

  if (!(RAZPISANIYA as readonly string[]).includes(n.razpisanie)) {
    throw new GreshkaAgent(`Няма такова разписание: „${n.razpisanie}".`);
  }

  // Правило 25 · и ТУК, защото задачата е онова, за което умението се избира.
  const umeniya = proveriTriUmeniya(a, n.umeniya);

  const den = n.denOtSedmitsata ?? 1;
  if (n.razpisanie === 'sedmichna' && (!Number.isInteger(den) || den < 1 || den > 7)) {
    throw new GreshkaAgent('Седмичната задача иска ден от 1 (понеделник) до 7 (неделя).');
  }

  const ot = n.ot ?? '';
  const doo = n.do ?? '';
  if (n.razpisanie === 'srok') {
    if (ot === '' || doo === '') {
      throw new GreshkaAgent('Задачата за срок иска и начало, и край — иначе срокът е дума.');
    }
    if (doo < ot) throw new GreshkaAgent('Краят на срока не може да е преди началото.');
  }

  return Object.freeze({
    id: n.id,
    agent: a.klyuch,
    kakvo,
    razpisanie: n.razpisanie,
    umeniya: Object.freeze([...umeniya]),
    denOtSedmitsata: den,
    ot,
    do: doo,
    // Постоянната се ражда ВКЛЮЧЕНА и такава остава — тя е норма.
    vklyuchena: true,
    // Нищо не тръгва без потвърждение по имейл (И94 т.1).
    potvardena: false,
    kogato: n.kogato,
  });
}

/**
 * ВКЛЮЧВА или ИЗКЛЮЧВА задача · постоянната се отказва с думи.
 *
 * „Има и постоянни задачи… която не може да се изключи и включи и е НОРМА."
 */
export function prevklyuchiZadacha(z: Zadacha, vklyuchena: boolean): Zadacha {
  if (ePostoyanna(z.razpisanie)) {
    throw new GreshkaAgent(
      `„${z.kakvo}" е ПОСТОЯННА задача — норма. Тя не се включва и изключва; маха се със сторно.`,
    );
  }
  return Object.freeze({ ...z, vklyuchena });
}

/** Потвърждаването с имейл · без него задачата не тръгва. */
export function potvardiZadacha(z: Zadacha): Zadacha {
  return Object.freeze({ ...z, potvardena: true });
}

/** Денят от седмицата по ISO: 1 = понеделник … 7 = неделя. */
export function denOtSedmitsata(data: string): number {
  const d = new Date(`${data}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/**
 * ДЪЛЖИ ЛИ СЕ ДНЕС · чистата сметка на разписанието.
 *
 * Не пуска нищо и не пише нищо — казва само дали днес е ден за нея. Кой я
 * пуска и какво става после, решава екранът и човекът (правило 18).
 */
export function sePadaDnes(z: Zadacha, dnes: string): boolean {
  if (!z.vklyuchena || !z.potvardena) return false;
  switch (z.razpisanie) {
    case 'postoyanna':
      return true;
    case 'vsekidnevna':
      return true;
    case 'sedmichna':
      return denOtSedmitsata(dnes) === z.denOtSedmitsata;
    case 'srok':
      return dnes >= z.ot && dnes <= z.do;
  }
}

/** С думи, за екрана: кога се пада тази задача. */
export function sDumiRazpisanie(z: Zadacha): string {
  switch (z.razpisanie) {
    case 'postoyanna':
      return 'постоянна · норма, не се изключва';
    case 'vsekidnevna':
      return 'всеки ден';
    case 'sedmichna':
      return `всяка седмица · ${['понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота', 'неделя'][z.denOtSedmitsata - 1]}`;
    case 'srok':
      return `${z.ot} → ${z.do}`;
  }
}

/** Броените показатели — числа, не усещане (правило 17). */
export function pokazateliNaZadachite(zadachi: readonly Zadacha[], dnes: string): {
  readonly vsichki: number;
  readonly potvardeni: number;
  readonly dnes: number;
  readonly postoyanni: number;
} {
  return {
    vsichki: zadachi.length,
    potvardeni: zadachi.filter((z) => z.potvardena).length,
    dnes: zadachi.filter((z) => sePadaDnes(z, dnes)).length,
    postoyanni: zadachi.filter((z) => ePostoyanna(z.razpisanie)).length,
  };
}

/** Колко умения носи задачата — за екрана; домът на числото е `agenti.ts`. */
export const UMENIYA_NA_ZADACHA = BROY_UMENIYA;
