/**
 * ПРЕМЕСТВАНЕ НА КОЛОНА · и деветте места, които сочат колоната по НОМЕР.
 *
 * Описът на дълга (M15) го държеше като „ръчно пренареждане на колоните чрез
 * влачене" — тоест като удобство на екрана. То не е.
 *
 * ═══ НАХОДКАТА · местенето ПРЕНОМЕРИРА ═══
 *
 * В този модел колоната няма самоличност — тя Е своят номер. Деветте места,
 * които го сочат, са изброени ПОИМЕННО долу, и всяко от тях трябва да се
 * пренесе заедно с нея. Пропуснато едно, таблицата не се чупи на глас: тя
 * почва да показва ЧУЖДА стойност под правилното име. Формула, сочила колона
 * 3, след местене сочи същия номер и събира друго число.
 *
 * Затова тук не се мести само заглавието, а се строи ПРЕНАРЕДБА и се прилага
 * навсякъде наведнъж.
 *
 * ═══ ЗАЩО СПИСЪКЪТ Е МАШИНА, А НЕ ОБЕЩАНИЕ ═══
 *
 * Утре моделът ще получи десето поле по колона, и онзи, който го добави, няма
 * да знае за този файл. Затова `POLETA_NA_MODELA` изброява ВСИЧКИ полета на
 * модела, разделени на „сочи колона" и „не сочи", а тест ги сверява срещу
 * истинските ключове на един модел. Ново поле, което не е класирано, пада на
 * червено — вместо да замълчи (ADR-056: обход, който само стои в правило,
 * разчита на дисциплина).
 *
 * ═══ ОТПЕЧАТЪКЪТ СЕ СМЕНЯ · и старият се ПАЗИ ═══
 *
 * Главата се познава по отпечатък, а той е заглавията В РЕД. Разместени, те
 * дават друг отпечатък — и вчерашният файл спира да се познава. Затова старият
 * влиза в `predishni`, точно както при преименуване: списъкът само расте.
 */

import type { ModelNaTablitsa } from '../iztochnik/model.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';

export class GreshkaPremestvane extends Error {
  override readonly name = 'GreshkaPremestvane';
}

/**
 * ВСИЧКИ ПОЛЕТА НА МОДЕЛА · разделени на две, поименно.
 *
 * Това е ЕДИНСТВЕНИЯТ дом на въпроса „кое сочи колона" (правило 17). Тестът
 * сверява двата списъка срещу ключовете на истински модел: поле, което не е в
 * нито един от тях, е ново и НЕКЛАСИРАНО.
 */
export const SOCHAT_KOLONA = [
  'koloni', // роля → НОМЕР на колона · стойността е индекс
  'izklyucheni', // списък от индекси
  'zatvoreni', // списък от индекси
  'glavi', // самият масив · тук се мести елементът
  'menyuta', // ключът е индекс
  'otVavezhdane', // списък от индекси
  'zaklyucheni', // списък от индекси
  'vidove', // ключът е индекс
  'formuli', // ключът е индекс · И операндите вътре са индекси
  'nomera', // ключът е индекс · СТОЙНОСТТА е номер на връзка, тя НЕ мърда
] as const;

export const NE_SOCHAT_KOLONA = [
  'klyuch',
  'redNaGlavata',
  'ddsE',
  'otpechatak', // мени се, но по ДРУГ път: пресмята се от новите заглавия
  'predishni', // расте със стария отпечатък
  'ekran',
] as const;

export const POLETA_NA_MODELA: readonly string[] = Object.freeze([
  ...SOCHAT_KOLONA,
  ...NE_SOCHAT_KOLONA,
]);

/**
 * ПРЕНАРЕДБАТА · стар номер → нов номер.
 *
 * Строи се ВЕДНЪЖ и се прилага навсякъде. Отделни сметки на място биха дали
 * девет възможности да се сгреши по различен начин.
 */
function prenaredba(broy: number, ot: number, kade: number): readonly number[] {
  const red = [...Array(broy).keys()];
  const [vzet] = red.splice(ot, 1);
  red.splice(kade, 0, vzet!);
  // `red[nov] = star` · обръща се, за да се пита „старият N къде отиде".
  const kam = Array<number>(broy);
  red.forEach((star, nov) => {
    kam[star] = nov;
  });
  return Object.freeze(kam);
}

const spisak = (s: readonly number[], kam: readonly number[]): readonly number[] =>
  Object.freeze([...s].map((i) => kam[i] ?? i).sort((a, b) => a - b));

function poKlyuch<T>(r: Readonly<Record<number, T>>, kam: readonly number[]): Record<number, T> {
  const iz: Record<number, T> = {};
  for (const [k, v] of Object.entries(r)) iz[kam[Number(k)] ?? Number(k)] = v;
  return iz;
}

/**
 * МЕСТИ КОЛОНА · и пренася деветте неща заедно с нея.
 *
 * `ot` и `kade` са номера НА КОЛОНИ, не на пиксели: екранът превежда влаченето
 * в две числа и нищо повече. Така същото действие се вика и с клавиатура, и от
 * тест, и от бъдещ внос — влаченето е ЕДИН вход, не единственият.
 */
export function premestiKolona(m: ModelNaTablitsa, ot: number, kade: number): ModelNaTablitsa {
  const broy = m.glavi.length;
  if (!Number.isInteger(ot) || ot < 0 || ot >= broy) {
    throw new GreshkaPremestvane(`Няма колона ${ot + 1} — таблицата има ${broy}.`);
  }
  if (!Number.isInteger(kade) || kade < 0 || kade >= broy) {
    throw new GreshkaPremestvane(`Не може на място ${kade + 1} — таблицата има ${broy} колони.`);
  }
  if (ot === kade) return m;

  const kam = prenaredba(broy, ot, kade);
  const glavi = Array<string>(broy);
  m.glavi.forEach((ime, star) => {
    glavi[kam[star]!] = ime;
  });

  // ФОРМУЛИТЕ · и ключът, и ОПЕРАНДИТЕ вътре. Само ключът щеше да премести
  // сметката, но да я остави да събира старите номера — тоест чужди числа.
  const formuli = poKlyuch(m.formuli, kam);
  for (const [k, f] of Object.entries(formuli)) {
    formuli[Number(k)] = Object.freeze({ ...f, ot: Object.freeze(f.ot.map((i) => kam[i] ?? i)) });
  }

  const koloni: Record<string, number> = {};
  for (const [rolya, star] of Object.entries(m.koloni)) {
    if (star !== undefined) koloni[rolya] = kam[star] ?? star;
  }

  return Object.freeze({
    ...m,
    glavi: Object.freeze(glavi),
    koloni: Object.freeze(koloni) as ModelNaTablitsa['koloni'],
    izklyucheni: spisak(m.izklyucheni, kam),
    zatvoreni: spisak(m.zatvoreni, kam),
    otVavezhdane: spisak(m.otVavezhdane, kam),
    zaklyucheni: spisak(m.zaklyucheni, kam),
    menyuta: Object.freeze(poKlyuch(m.menyuta, kam)),
    vidove: Object.freeze(poKlyuch(m.vidove, kam)),
    nomera: Object.freeze(poKlyuch(m.nomera, kam)),
    formuli: Object.freeze(formuli),
    // ОТПЕЧАТЪКЪТ е заглавията В РЕД · разместени, те дават друг. Старият се
    // ПАЗИ, инак вчерашният файл спира да се познава.
    otpechatak: glavi.map((g) => g.trim().toLocaleLowerCase('bg-BG')).join('|'),
    predishni: Object.freeze([...m.predishni, m.otpechatak]),
  });
}

/**
 * СВЕРКА ВХОД↔ИЗХОД на местенето (правило 7).
 *
 * Мери онова, което местенето НЕ бива да мени: броя колони и броя записи във
 * всяко от деветте места. Разликата се записва дори когато е нула.
 *
 * ЗАЩО БРОЙ, А НЕ СЪДЪРЖАНИЕ. Съдържанието се сверява от тестовете поименно;
 * тук стои онова, което може да се мери на ЖИВО, при всяко местене, и което
 * лови най-тихата повреда: запис, паднал при пренасянето.
 */
export function sveriPremestvaneto(
  predi: ModelNaTablitsa,
  sled: ModelNaTablitsa,
  kogato: string,
): readonly Sverka[] {
  const broi = (m: ModelNaTablitsa): readonly [string, number][] => [
    ['колони', m.glavi.length],
    ['роли', Object.keys(m.koloni).length],
    ['изключени', m.izklyucheni.length],
    ['затворени', m.zatvoreni.length],
    ['от въвеждане', m.otVavezhdane.length],
    ['заключени', m.zaklyucheni.length],
    ['менюта', Object.keys(m.menyuta).length],
    ['видове', Object.keys(m.vidove).length],
    ['номера', Object.keys(m.nomera).length],
    ['формули', Object.keys(m.formuli).length],
  ];
  const sled_ = new Map(broi(sled));
  return Object.freeze(
    broi(predi).map(([kakvo, n]) => sverka(kakvo, n, sled_.get(kakvo) ?? 0, kogato, MERKA.broy)),
  );
}
