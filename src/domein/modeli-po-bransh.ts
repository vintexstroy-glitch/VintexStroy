/**
 * ПЕТТЕ ЗАЛОЖЕНИ МОДЕЛА ПО БРАНШ · регистър с ЧЕСТЕН статус (резен 33).
 *
 * ═══ НЕГОВИТЕ ДУМИ · и двете, защото са ЕДНО решение на две части ═══
 *
 * „Да, но да има зал8жени модели за избор, както е в МС Прочект. **Строителна
 * фирма, магазин** и още 3 общо най основните 5 модела ще се опитаме да дадем
 * за тях накаква подредена база." *(р83·[132] · 12.08)*
 *
 * „**Склад · Услуги · Ресторант**" *(р83·[134] · 12.08)* — трите останали.
 *
 * ═══ НАХОДКА В ОПИСА · имената НЕ чакат него ═══
 *
 * Описът броеше този ред като „цяла продуктова функция с нула попадения" и
 * загатваше, че липсва всичко. Но второто му изречение, от същия ден, назовава
 * трите неказани поименно. Тоест ИМЕНАТА са дадени; чака се „подредената база".
 *
 * ═══ КОЕ Е ДАДЕНО И КОЕ ЧАКА · БРОИ СЕ, НЕ СЕ ТВЪРДИ ═══
 *
 * Строителната фирма е ПОСТРОЕНА — тя е днешното приложение. И това не е
 * мнение: базата ѝ са акумулаторите и потоците, които живият код носи, и се
 * БРОЯТ оттам (моделът на `NEGOVI_BAZI` · ADR-067).
 *
 * Другите четири чакат негова дума за съдържанието. Празен модел не се предлага
 * за избор: бутон без последица е надпис (ADR-041).
 */

import { AKUMULATORI } from './dds.js';
import { POTOTSI } from './smetki.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';

export type KlyuchNaBransh = 'stroitelna' | 'magazin' | 'sklad' | 'uslugi' | 'restorant';

export interface ModelPoBransh {
  readonly klyuch: KlyuchNaBransh;
  /** името, с НЕГОВАТА дума */
  readonly ime: string;
  /** дословният му цитат и адресът му (правило 21) */
  readonly izvor: string;
}

/**
 * ПЕТТЕ · в НЕГОВИЯ ред: първите две от [132], трите от [134].
 *
 * Редът не се „подрежда по азбука": той ги е изброил в този ред, и това е
 * единственото, което го определя.
 */
export const MODELI_PO_BRANSH: readonly ModelPoBransh[] = Object.freeze([
  { klyuch: 'stroitelna', ime: 'Строителна фирма', izvor: 'р83·[132]' },
  { klyuch: 'magazin', ime: 'Магазин', izvor: 'р83·[132]' },
  { klyuch: 'sklad', ime: 'Склад', izvor: 'р83·[134]' },
  { klyuch: 'uslugi', ime: 'Услуги', izvor: 'р83·[134]' },
  { klyuch: 'restorant', ime: 'Ресторант', izvor: 'р83·[134]' },
]);

/**
 * КОЙ МОДЕЛ Е ПОСТРОЕН · днес ЕДИН, и той е строителната фирма.
 *
 * Списък, а не флаг в реда: щом утре магазинът получи своята база, той влиза
 * ТУК — на едно място — вместо да се търси кой ред да се пренапише.
 */
export const POSTROENITE: ReadonlySet<KlyuchNaBransh> = new Set<KlyuchNaBransh>(['stroitelna']);

export interface BazaNaBransha {
  /** ДДС-акумулаторите (секторите), които моделът носи */
  readonly sektori: number;
  /** потоците пари, които моделът носи */
  readonly pototsi: number;
}

/**
 * БАЗАТА НА ЕДИН МОДЕЛ · БРОИ се от живия код, не се преписва.
 *
 * За строителната фирма това са акумулаторите и потоците, които приложението
 * вече носи — „наем · жилищен", „строителни услуги", „покупки · материали" и
 * останалите. Преписано число тук щеше да се разминае с първия нов акумулатор
 * и да твърди база, каквато няма (правило 17).
 *
 * За непостроен модел базата е ЧЕСТНА НУЛА, а не чужди числа.
 */
export function bazataNa(klyuch: KlyuchNaBransh): BazaNaBransha {
  if (!POSTROENITE.has(klyuch)) return Object.freeze({ sektori: 0, pototsi: 0 });
  return Object.freeze({ sektori: AKUMULATORI.length, pototsi: POTOTSI.length });
}

export interface RedNaBransha {
  readonly klyuch: KlyuchNaBransh;
  readonly ime: string;
  readonly izvor: string;
  readonly postroen: boolean;
  readonly baza: BazaNaBransha;
  /** едно изречение за екрана · какво има и какво чака */
  readonly kakvo: string;
}

export function branshovete(): readonly RedNaBransha[] {
  return Object.freeze(
    MODELI_PO_BRANSH.map((m) => {
      const postroen = POSTROENITE.has(m.klyuch);
      const baza = bazataNa(m.klyuch);
      return Object.freeze({
        ...m,
        postroen,
        baza,
        kakvo: postroen
          ? `${baza.sektori} сектора · ${baza.pototsi} потока — това е днешното приложение`
          : 'името е негово · подредената база чака неговата дума',
      });
    }),
  );
}

/** Колко от петте са ПОСТРОЕНИ · брои се, не се твърди. */
export function broyPostroeni(): number {
  return branshovete().filter((r) => r.postroen).length;
}

/**
 * МОЖЕ ЛИ ДА СЕ ИЗБЕРЕ · само построеният.
 *
 * Избор на празен модел е бутон без последица (ADR-041): той не би сложил нито
 * един сектор и нито един поток, но човекът би останал с чувството, че е
 * настроил нещо.
 */
export function mozheDaSeIzbere(klyuch: KlyuchNaBransh): boolean {
  return POSTROENITE.has(klyuch);
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът е броят имена, които той е дал; изходът е дължината на регистъра.
 * Разлика значи, че някой е добавил шести модел или е изгубил един от петте —
 * а те са НЕГОВИ и не се домислят.
 */
export const NEGOVITE_PET = 5;

export function sveriBranshovete(kogato: string): Sverka {
  return sverka(
    'модели по бранш · негови имена',
    NEGOVITE_PET,
    branshovete().length,
    kogato,
    MERKA.broy,
  );
}
