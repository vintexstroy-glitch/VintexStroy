/**
 * ПРОВЕРКИ ОТ СВЕРКИ · остатъкът, събран по теми, в двете посоки (резен 72).
 *
 * Негова дума *(И124 т.10 · ADR-120)*:
 *
 *   „Да има таблица Проверки от Сверки където се показва грешки и
 *    оставащотото в извлеченията което не е участвалов сверки и справки
 *    събрано по теми. Банкови такси, Грешни преводи, Гршни плащания с
 *    карта, и всичконалично в извлеченията извън обхвата на програмата и
 *    в двете посоки ако има, ако е вкарано с карта, а липсва в
 *    извлечението или някакво несъответствия при справките."
 *
 * ═══ НИЩО НОВО НЕ СЕ СМЯТА · ОСТАТЪКЪТ СЕ СЪБИРА ═══
 *
 * Сверката с извлечението (резен 17в) вече знае всичко: кой запис ЛИПСВА в
 * банката, на кой ПАСВАТ НЯКОЛКО реда, и кой банков ред остана БЕЗ насрещен
 * запис. Тук тези три остатъка се събират в ЕДНА таблица и се разпределят
 * по неговите теми — нула нови събития, нула нова аритметика по сумите.
 *
 * ═══ ТЕМАТА Е ПРЕДЛОЖЕНИЕ, НЕ ПРИСЪДА (правило 18) ═══
 *
 * Машината разпознава „такса" по думата в текста на банката и дели
 * останалото по посоката. Това е ГРУПИРАНЕ ЗА ОКОТО — никъде не се записва:
 * човекът гледа темата, решава какво е наистина и действа в книгата.
 *
 * ═══ ДВЕТЕ ПОСОКИ, поименно ═══
 *
 * | посока | какво носи | съдбата, от която идва |
 * | :---- | :---- | :---- |
 * | от ИЗВЛЕЧЕНИЕТО | ред на банката, който никой не позна | `samoVBankata` |
 * | от КНИГАТА | вкарано, което банката не показва | `lipsva` · `nyakolko` |
 *
 * Платеното В БРОЙ не е тук: то няма банкова следа по определение и си има
 * дом — двата списъка за счетоводството. Ненамереният кеш не е грешка.
 */

import { broyNahodki, type RezultatNaSverkata } from './sverka-izvlechenie.js';
import { MERKA, sverka, type Sverka } from '../yadro/sverka.js';

/** Неговите теми плюс двете от книгата · редът е закован, екранът го спазва. */
export const TEMI_NA_PROVERKITE = Object.freeze([
  'Банкови такси',
  'Грешни преводи',
  'Грешни плащания с карта',
  'Вкарано, а липсва в извлечението',
  'Пасват няколко реда',
] as const);

export type TemaNaProverka = (typeof TEMI_NA_PROVERKITE)[number];

/**
 * ПО КАКВО СЕ ПОЗНАВА ТАКСАТА · по думата на самата банка.
 *
 * Таксите, комисионите и лихвите са редове, които банката РАЖДА сама — за
 * тях никога няма запис в книгата, и точно затова са първата тема: иначе
 * всяко месечно обслужване щеше да „свети" като грешка.
 */
const DUMI_NA_TAKSATA = /такса|комисион|лихва|обслужване|fee/i;

/**
 * Темата на един банков остатък · такса по думата, иначе по посоката.
 *
 * Приход, който никой не позна, е ГРЕШЕН ПРЕВОД — пари са дошли, а книгата
 * не ги чака. Разход без насрещен запис е ГРЕШНО (или невкарано) ПЛАЩАНЕ.
 */
export function temaNaBankovOstatak(koy: string, posoka: 'prihod' | 'razhod'): TemaNaProverka {
  if (DUMI_NA_TAKSATA.test(koy)) return 'Банкови такси';
  return posoka === 'prihod' ? 'Грешни преводи' : 'Грешни плащания с карта';
}

/** Един ред в Проверките · откъде идва се КАЗВА, не се гадае. */
export interface RedNaProverka {
  readonly tema: TemaNaProverka;
  readonly period: string;
  readonly data: string;
  readonly koy: string;
  readonly posoka: 'prihod' | 'razhod';
  readonly suma_st: number;
  /** едната от двете посоки на проверката */
  readonly otkade: 'извлечението' | 'книгата';
  readonly klyuch: string;
}

export interface TemaSPodredba {
  readonly tema: TemaNaProverka;
  readonly redove: readonly RedNaProverka[];
  readonly sbor_st: number;
}

export interface ProverkiOtSverki {
  readonly redove: readonly RedNaProverka[];
  /** ВСИЧКИТЕ теми, и празните — нулата се казва (правило 15) */
  readonly poTemi: readonly TemaSPodredba[];
  /** редовете тук ↔ находките на сверките · частите се събират до цялото */
  readonly sverka: Sverka;
}

/**
 * Събира остатъка от ВСИЧКИ месеци на извлечението в една таблица по теми.
 *
 * Сверката накрая (правило 7) е срещу `broyNahodki` — броячът на самата
 * сверка с извлечението, смятан там със свои правила. Изгуби ли този събирач
 * съдба или посока, двата броя се разделят и разликата се казва — дори нула.
 */
export function proverkiOtSverki(
  rezultati: readonly RezultatNaSverkata[],
  kogato: string,
): ProverkiOtSverki {
  const redove: RedNaProverka[] = [];
  for (const r of rezultati) {
    for (const x of r.redove) {
      if (x.sadba !== 'lipsva' && x.sadba !== 'nyakolko') continue;
      redove.push({
        tema: x.sadba === 'lipsva' ? 'Вкарано, а липсва в извлечението' : 'Пасват няколко реда',
        period: r.period,
        data: x.zapis.data,
        koy: x.zapis.koy,
        posoka: x.zapis.posoka,
        suma_st: x.zapis.suma_st,
        otkade: 'книгата',
        klyuch: x.zapis.klyuch,
      });
    }
    for (const b of r.samoVBankata) {
      redove.push({
        tema: temaNaBankovOstatak(b.koy, b.posoka),
        period: r.period,
        data: b.data,
        koy: b.koy,
        posoka: b.posoka,
        suma_st: b.suma_st,
        otkade: 'извлечението',
        klyuch: b.klyuch,
      });
    }
  }

  const poTemi = TEMI_NA_PROVERKITE.map((tema) => {
    const svoi = redove.filter((r) => r.tema === tema);
    return Object.freeze({
      tema,
      redove: Object.freeze(svoi),
      sbor_st: svoi.reduce((s, r) => s + r.suma_st, 0),
    });
  });

  const nahodki = rezultati.reduce((s, r) => s + broyNahodki(r), 0);
  return Object.freeze({
    redove: Object.freeze(redove),
    poTemi: Object.freeze(poTemi),
    sverka: sverka('Проверки от Сверки · редове ↔ находки', nahodki, redove.length, kogato, MERKA.broy),
  });
}
