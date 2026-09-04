/**
 * АКТИВИТЕ ОТ ЖУРНАЛА · Имот без Обект и Обект с Имот (резен 107 · ADR-169).
 *
 * Негово, 02.09 (И129 т.4): „**Имот без ОБект и ОБект с Имот могат да се
 * изберат  в Клакулатора и това са основните наши активи**."
 *
 * ═══ КАКВО ПРАВИ ═══
 *
 * Превръща ВПИСАНОТО в Журнала в редове, каквито Калкулаторът вече умее да
 * смята (`ProchetenObekt`). Дотук такива редове идваха САМО от файл —
 * площообразуване или ценова листа, — тоест оценка можеше да се направи само
 * за онова, което човекът тъкмо е изнесъл отнякъде. А активите СТОЯТ в
 * книгата.
 *
 * Два вида актив, точно както ги нарича той:
 *
 *   · **Обект с Имот** — вписаният обект (единица под адрес), с площта си;
 *   · **Имот без Обект** — самото МЯСТО, когато под него няма нито един обект,
 *     с квадратурата си. Празен парцел, къща, апартамент, вписан без единица.
 *
 * ═══ ЗАЩО ТУК, А НЕ В ЕКРАНА ═══
 *
 * Защото е СМЯТАНЕ, не рисуване: кой ред от Журнала е актив, каква площ носи и
 * към кое място принадлежи. Чиста функция значи тест без браузър — и значи
 * ЕДИН дом за правилото „кое се брои за актив" (правило 17).
 *
 * ═══ КАКВО НЕ ПРАВИ ═══
 *
 * НЕ пише. НЕ гадае площ: актив без квадратура не влиза и се БРОИ отделно, за
 * да се види, че го няма (правило 15 · правило 7). НЕ смята цени — това е
 * работа на `stoynost.ts`, който вече го прави за същите редове.
 */

import { vidPoIme, type ProchetenObekt } from './chetene.js';
import { svedenotoMyasto } from '../domein/mesta.js';

/** Един актив от Журнала · редът за Калкулатора плюс мястото му. */
export interface AktivOtZhurnala {
  readonly red: ProchetenObekt;
  /** името на МЯСТОТО, под което стои · за разбивката по Имот */
  readonly myasto: string;
  /** „obekt" · „myasto" — кой от двата вида актив е */
  readonly vid: 'obekt' | 'myasto';
}

export interface AktiviteOtZhurnala {
  readonly aktivi: readonly AktivOtZhurnala[];
  /** вписани, но БЕЗ квадратура · броят им се казва, не се крие */
  readonly bezPlosht: number;
  /**
   * КОЛКО СА ГЛЕДАНИ · всички обекти плюс местата без обекти.
   *
   * Знаменателят на сверката вход↔изход (правило 7): кандидати = активи +
   * без квадратура. Без него „сверката" щеше да мери дължината на масива,
   * който сама е върнала — тавтология, която не може да падне.
   */
  readonly kandidati: number;
}

/** Онова от Обекта, което този модул чете · нищо повече. */
interface ObektZaAktiv {
  readonly adres: string;
  readonly edinitsa: string;
  readonly ploshtad_kvsm: number;
}

/** Онова от Мястото, което този модул чете. */
interface MyastoZaAktiv {
  readonly ime: string;
  readonly kvadratura_kvsm: number;
}

/**
 * Сведеното име · ЕДИН дом (правило 17).
 *
 * Първата версия си написа свое `svedeno()` с точно същото тяло като
 * `svedenotoMyasto` в домейна — два дома за един факт, разминаващи се при
 * първата поправка на правилото. Сверката го хвана преди коммит.
 */
const svedeno = svedenotoMyasto;

/**
 * АКТИВИТЕ, готови за Калкулатора.
 *
 * Мястото влиза САМО когато под него няма нито един обект: иначе стойността му
 * би се броила два пъти — веднъж като място, веднъж като сбор от обектите си.
 * Това е сверка по построение, не проверка след това.
 */
export function aktiviteOtZhurnala(
  obekti: readonly ObektZaAktiv[],
  mesta: readonly MyastoZaAktiv[],
): AktiviteOtZhurnala {
  const aktivi: AktivOtZhurnala[] = [];
  let bezPlosht = 0;
  let kandidati = 0;

  const sObekti = new Set(obekti.map((o) => svedeno(o.adres)));

  for (const o of obekti) {
    kandidati += 1;
    if (o.ploshtad_kvsm <= 0) {
      bezPlosht += 1;
      continue;
    }
    aktivi.push({
      vid: 'obekt',
      myasto: o.adres,
      red: {
        obekt: o.edinitsa,
        vid: vidPoIme(o.edinitsa),
        etazh: '',
        kota: '',
        // Журналът пази ЕДНА площ на обекта; тя е и чистата, и общата. Идеални
        // части не се измислят: липсващото е нула, не предположение.
        chista_kvsm: o.ploshtad_kvsm,
        obshta_kvsm: o.ploshtad_kvsm,
        dvor_kvsm: 0,
      },
    });
  }

  for (const m of mesta) {
    if (sObekti.has(svedeno(m.ime))) continue; // има обекти · те са активът
    kandidati += 1;
    if (m.kvadratura_kvsm <= 0) {
      bezPlosht += 1;
      continue;
    }
    aktivi.push({
      vid: 'myasto',
      myasto: m.ime,
      red: {
        obekt: m.ime,
        // Мястото не е апартамент, гараж или склад — то е „друго" и се смята
        // по своята база. Видът се чете от името само ако то го КАЗВА.
        vid: vidPoIme(m.ime),
        etazh: '',
        kota: '',
        chista_kvsm: m.kvadratura_kvsm,
        obshta_kvsm: m.kvadratura_kvsm,
        dvor_kvsm: 0,
      },
    });
  }

  return { aktivi: Object.freeze(aktivi), bezPlosht, kandidati };
}

/**
 * Мястото на всеки ред · име на обекта → име на мястото.
 *
 * Оттук идва РАЗБИВКАТА по Имот: сметката се прави по обекти, а човекът гледа
 * по Имоти. Без тази карта сравнението „оценка срещу книга" можеше да покаже
 * само един общ ред (ADR-168) — и го КАЗВАШЕ.
 */
export function mestataNaAktivite(
  aktivi: readonly AktivOtZhurnala[],
): ReadonlyMap<string, string> {
  const izhod = new Map<string, string>();
  // Мястото се пази СВЕДЕНО: „Малинова" на обекта и „малинова" на Мястото са
  // едно и също, а разбивката се чете по името на Мястото. Дословен ключ би
  // показал нула на ред, който има стойност — тиха лъжа вместо разлика.
  for (const a of aktivi) izhod.set(a.red.obekt.trim(), svedeno(a.myasto));
  return izhod;
}
