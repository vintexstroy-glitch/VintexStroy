/**
 * СЕДЕМТЕ РАЗБИВКИ · редовете, които темата „Пари" ДОБАВЯ (резен 115 · ADR-161).
 *
 * Негово, 03.09 (И136), дословно:
 *
 *   „КОгато избираш темата на таблицата разликата е, че добавя редове от
 *    табовете а Сметки: Наеми Кеш, Наеми Банка, Активни Продажби, Кредити,
 *    Заплати, Фактури Банка, Фактури Кеш. Тези редове могат с избор да се
 *    добавят като редове и да се покаже в диаграмата цифрите за тях…"
 *
 * ═══ ЗАЩО ТОВА НЕ Е СЕДМИ РАЗРЕЗ ═══
 *
 * Разрезите (`RAZREZI` в `otcheti.ts`) РЕЖАТ един и същ сбор на парчета: сборът
 * на парчетата е равен на цялото, каквото и да избереш. Седемте тук НЕ са такова
 * рязане — те идват от ТРИ различни места (плащанията по наем, движенията по
 * продажби и разходите), а едното от тях — Активни Продажби — изобщо НЕ влиза в
 * общата обиколка `poDni`. Сложени като разрез, те щяха да обещаят „сборът на
 * редовете = общият ред", а той нямаше да излиза. Затова са СВОЯ сметка, добавят
 * се по отметка и екранът казва кой от тях е вътре в общия ред и кой не е.
 *
 * ═══ КОЕ ОТКЪДЕ ИДВА · поименно ═══
 *
 * | ред | откъде идва | вътре в общия ред? |
 * | Наеми Кеш        | `plashtaniya`, начин „в брой"                              | ДА |
 * | Наеми Банка      | `plashtaniya`, всеки друг начин                            | ДА |
 * | Активни Продажби | `dvizheniyaNaProdazhbi` · вноските по НЕархивирана сделка   | НЕ |
 * | Кредити          | `razhodi`, поток „krediti"                                 | ДА |
 * | Заплати          | `razhodi`, поток „zaplati"                                 | ДА |
 * | Фактури Банка    | `razhodi`, поток „fakturi", не в брой                      | ДА |
 * | Фактури Кеш      | `razhodi`, поток „fakturi", в брой                         | ДА |
 *
 * КАРТАТА НЕ Е КЕШ. `NACHINI_NA_PLASHTANE` са три — банка · карта · в брой, — а
 * имената му са две. Картата е банкови пари и затова стои при Банка; редът го
 * КАЗВА на екрана, вместо да го замълчи (правило 15).
 *
 * АКТИВНИТЕ ПРОДАЖБИ се смятат по ДАТАТА НА ВНОСКАТА, не на сделката, и не носят
 * връщане и неустойка — „Неустойките се превеждат ОТДЕЛНО, никакво нетиране".
 * Същата сметка като `prihodOtProdazhbi`, само разстлана по дни.
 */

import type { DenSPari } from './otcheti.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { eVnoska, etapite, vArhiva } from './prodazhbi.js';

/** Ключът на една разбивка · същият низ в паметта, в отметката и в реда. */
export const RAZBIVKITE = Object.freeze([
  Object.freeze({
    klyuch: 'naemi-kesh', ime: 'Наеми Кеш', posoka: 'приход', vObshtiya: true,
    otkade: 'плащанията по наем, приети в брой',
  }),
  Object.freeze({
    klyuch: 'naemi-banka', ime: 'Наеми Банка', posoka: 'приход', vObshtiya: true,
    otkade: 'плащанията по наем по банка и с карта',
  }),
  Object.freeze({
    klyuch: 'aktivni-prodazhbi', ime: 'Активни Продажби', posoka: 'приход', vObshtiya: false,
    otkade: 'вноските по НЕархивирана сделка, по датата на вноската',
  }),
  Object.freeze({
    klyuch: 'krediti', ime: 'Кредити', posoka: 'разход', vObshtiya: true,
    otkade: 'разходите с поток „Кредити"',
  }),
  Object.freeze({
    klyuch: 'zaplati', ime: 'Заплати', posoka: 'разход', vObshtiya: true,
    otkade: 'разходите с поток „Заплати"',
  }),
  Object.freeze({
    klyuch: 'fakturi-banka', ime: 'Фактури Банка', posoka: 'разход', vObshtiya: true,
    otkade: 'разходите с поток „Фактури", платени по банка или с карта',
  }),
  Object.freeze({
    klyuch: 'fakturi-kesh', ime: 'Фактури Кеш', posoka: 'разход', vObshtiya: true,
    otkade: 'разходите с поток „Фактури", платени в брой',
  }),
]);

export type Razbivka = (typeof RAZBIVKITE)[number];
export type KlyuchNaRazbivka = Razbivka['klyuch'];

/** Начинът, който човек нарича КЕШ. Всичко друго е банка (картата е банкови пари). */
const V_BROY = 'в брой';

export function eRazbivka(klyuch: string): klyuch is KlyuchNaRazbivka {
  return RAZBIVKITE.some((i) => i.klyuch === klyuch);
}

export function razbivka(klyuch: string): Razbivka | undefined {
  return RAZBIVKITE.find((i) => i.klyuch === klyuch);
}

/**
 * СУМИТЕ НА ИЗБРАНИТЕ РАЗБИВКИ, по ден · в същия вид, който решетката чете.
 *
 * Връща `DenSPari` с `razrez` = ключа на разбивката, за да мине през същия
 * `obobshteniRedove` като общия ред: един механизъм, не втори.
 *
 * Границите са включителни, ISO текст — както говорят колоните на решетката.
 * Неизбрана разбивка не се обикаля изобщо: отметката е и филтър, и цена.
 */
export function sumiPoRazbivki(
  o: Ogledalo,
  ot: string,
  doo: string,
  izbrani: readonly string[],
): readonly DenSPari[] {
  const iskani = new Set(izbrani.filter(eRazbivka));
  if (iskani.size === 0) return Object.freeze([]);

  const po = new Map<
    string,
    { data: string; razrez: string; nadpis: string; prihod_st: number; razhod_st: number }
  >();
  const vzemi = (data: string, klyuch: string): { prihod_st: number; razhod_st: number } => {
    // Датата и ключът се слепват със знак, който не може да е в нито едно
    // от двете — същото сглобяване като в `poDni` (`otcheti.ts`).
    // Датата и ключът се слепват със знак, който не може да е в нито едно
    // от двете — същото сглобяване като в `poDni` (`otcheti.ts`).
    const id = `${data}\u0000${klyuch}`;
    let v = po.get(id);
    if (!v) {
      v = {
        data,
        razrez: klyuch,
        nadpis: razbivka(klyuch)?.ime ?? klyuch,
        prihod_st: 0,
        razhod_st: 0,
      };
      po.set(id, v);
    }
    return v;
  };
  const vObhvata = (data: string): boolean => data >= ot && data <= doo;

  if (iskani.has('naemi-kesh') || iskani.has('naemi-banka')) {
    for (const p of o.plashtaniya.values()) {
      if (!vObhvata(p.data)) continue;
      const klyuch = p.nachin.normalize('NFC').trim() === V_BROY ? 'naemi-kesh' : 'naemi-banka';
      if (iskani.has(klyuch)) vzemi(p.data, klyuch).prihod_st += p.suma_st;
    }
  }

  if (iskani.has('aktivni-prodazhbi')) {
    const etapi = etapite(o);
    for (const d of o.dvizheniyaNaProdazhbi) {
      if (!vObhvata(d.data) || !eVnoska(d.vid, etapi)) continue;
      const sdelka = o.prodazhbi.get(d.prodazhbaId);
      if (!sdelka || vArhiva(sdelka.sastoyanie)) continue;
      vzemi(d.data, 'aktivni-prodazhbi').prihod_st += d.suma_st;
    }
  }

  for (const r of o.razhodi.values()) {
    if (!vObhvata(r.data)) continue;
    const klyuch = klyuchNaRazhoda(r.potok, r.nachin);
    if (klyuch !== undefined && iskani.has(klyuch)) vzemi(r.data, klyuch).razhod_st += r.suma_st;
  }

  return Object.freeze(
    [...po.values()].sort(
      (a, b) => a.data.localeCompare(b.data) || a.razrez.localeCompare(b.razrez),
    ),
  );
}

/** Потокът решава реда; при Фактури решава и начинът. Чужд поток → никой ред. */
function klyuchNaRazhoda(potok: string, nachin: string): KlyuchNaRazbivka | undefined {
  const p = potok.normalize('NFC').trim();
  if (p === 'krediti') return 'krediti';
  if (p === 'zaplati') return 'zaplati';
  if (p !== 'fakturi') return undefined;
  return nachin.normalize('NFC').trim() === V_BROY ? 'fakturi-kesh' : 'fakturi-banka';
}
