/**
 * ОРИЕНТИРИТЕ · числото зад изречението (резен 35).
 *
 * ═══ НЕГОВАТА ДУМА ═══
 *
 * „**Петте + спарклайни + bullet (препоръката)**" *(р59·[94])* — прието
 * предложение за графиките на v1.
 *
 * ═══ ЗАЩО ТОЗИ ФАЙЛ СЪЩЕСТВУВА ═══
 *
 * Bullet-диаграмата показва стойност СРЕЩУ цел. Целите вече ги имаше — но като
 * ИЗРЕЧЕНИЯ: „банките искат 1,25 – 1,50", „под 50 %", „над 1,00". Изречението е
 * за човека и си остава негово.
 *
 * Числото за рисуването НЕ се вади от изречението. Разчитане на „1,25 – 1,50"
 * с регулярен израз работи, докато някой не напише „около 1,3" или „1.25–1.50"
 * — и тогава чертата тихо застава на грешно място. Дословният прецедент е
 * `NEGOVI_BAZI` (ADR-067) и `NEGOVI_PARAMETRI` (ADR-072): **кое е дадено се
 * ОБЯВЯВА и се БРОИ, не се чете от изречение.**
 *
 * ═══ ЕДИНИЦИТЕ СА НА СТОЙНОСТТА, НЕ НА ЕКРАНА ═══
 *
 * `SmetnatKoefitsient.stoynost` носи процентите и пъртите в СТОТНИ (100 % е
 * 10 000, 1,25× е 125). Ориентирът е в СЪЩИТЕ единици — инак сравнението щеше
 * да иска превръщане на две места и да се разминава при първата поправка.
 *
 * ═══ ШЕСТ ОТ ДВАНАЙСЕТТЕ · и това е ЧЕСТНО ═══
 *
 * Останалите шест нямат ориентир, защото занаятът няма едно число за тях: NOI,
 * паричният поток и маржът зависят от бизнеса. Измислен праг там щеше да боядиса
 * здрав имот в червено.
 */

import { KOEFITSIENTI, type Koefitsient } from './koefitsienti.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';

export type PosokaNaOrientira = 'nad' | 'pod' | 'mezhdu';

export interface Orientir {
  readonly posoka: PosokaNaOrientira;
  /** долната граница · в единиците на `stoynost` (стотни за % и ×) */
  readonly ot: number;
  /** горната граница · равна на `ot`, когато границата е ЕДНА */
  readonly do_: number;
}

/**
 * ОБЯВЕНИТЕ ЧИСЛА · всяко до изречението, от което идва.
 *
 * Ключът е ключът на коефициента. Ред тук БЕЗ изречение в `obichayno`, или
 * изречение без ред тук, счупва сверката отдолу — за да няма число, което
 * никой не е казал, и казано число, което никой не рисува.
 */
export const ORIENTIRI: Readonly<Record<string, Orientir>> = Object.freeze({
  // „цел 100 %"
  sabiraemost: Object.freeze({ posoka: 'nad' as const, ot: 100_00, do_: 100_00 }),
  // „под 50 %"
  oer: Object.freeze({ posoka: 'pod' as const, ot: 50_00, do_: 50_00 }),
  // „банките искат 1,25 – 1,50"
  dscr: Object.freeze({ posoka: 'mezhdu' as const, ot: 1_25, do_: 1_50 }),
  // „над 1,00"
  likvidnost: Object.freeze({ posoka: 'nad' as const, ot: 1_00, do_: 1_00 }),
  // „банките дават до 80 %"
  ltv: Object.freeze({ posoka: 'pod' as const, ot: 80_00, do_: 80_00 }),
  // „под 3,50 при имоти"
  'dalg-kam-ebitda': Object.freeze({ posoka: 'pod' as const, ot: 3_50, do_: 3_50 }),
});

export function orientiratNa(klyuch: string): Orientir | undefined {
  return ORIENTIRI[klyuch];
}

export type Postizhka = 'nyama-orientir' | 'nyama-stoynost' | 'v-tsel' | 'vun';

/**
 * ПОПАДА ЛИ В ЦЕЛТА · и трите „не знам" са РАЗЛИЧНИ от „не".
 *
 * Липсващ ориентир и липсваща стойност не се сливат с „извън целта": иначе
 * коефициент без праг щеше да свети червено само защото никой не му е дал цел.
 */
export function postignat(klyuch: string, stoynost: number | undefined): Postizhka {
  const o = orientiratNa(klyuch);
  if (o === undefined) return 'nyama-orientir';
  if (stoynost === undefined) return 'nyama-stoynost';
  switch (o.posoka) {
    case 'nad':
      return stoynost >= o.ot ? 'v-tsel' : 'vun';
    case 'pod':
      return stoynost <= o.do_ ? 'v-tsel' : 'vun';
    case 'mezhdu':
      return stoynost >= o.ot && stoynost <= o.do_ ? 'v-tsel' : 'vun';
  }
}

/**
 * СКАЛАТА на bullet-а · СМЯТА се от двете числа, не се заковава.
 *
 * Горният край е по-голямото от стойността и целта, с четвърт запас — за да
 * се вижда и когато стойността е ДАЛЕЧ над целта. Закована скала (например
 * „винаги до 100 %") щеше да реже LTV от 120 % и да го рисува като 100.
 *
 * Дъното е НУЛАТА, а не най-малкото число: лента, отрязана над нулата, прави
 * дребна разлика да изглежда огромна (същото правило като при диаграмата).
 */
export function skalataNaBulleta(klyuch: string, stoynost: number | undefined): number {
  const o = orientiratNa(klyuch);
  const nay = Math.max(o?.do_ ?? 0, stoynost ?? 0, 1);
  return Math.ceil(nay * 1.25);
}

/** Каква ЧАСТ от скалата заема едно число · 0…1, за рисуването. */
export function dyalatVSkalata(klyuch: string, stoynost: number, kolko: number): number {
  const skala = skalataNaBulleta(klyuch, stoynost);
  return Math.min(1, Math.max(0, kolko / skala));
}

/**
 * ДУМИТЕ на ориентира · за човека, който гледа лентата.
 *
 * Изречението на коефициента (`obichayno`) си остава негово и не се пренаписва
 * тук: това е ВТОРО изречение — какво показва самата лента.
 */
export function dumiteNaPostizhkata(p: Postizhka): string {
  switch (p) {
    case 'nyama-orientir':
      return 'няма обичайно число · занаятът не дава едно за всички';
    case 'nyama-stoynost':
      return 'няма стойност за периода';
    case 'v-tsel':
      return 'в обичайното';
    case 'vun':
      return 'извън обичайното';
  }
}

/** Кои коефициенти носят ИЗРЕЧЕНИЕ за обичайното · входът на сверката. */
export function sIzrechenie(): readonly Koefitsient[] {
  return KOEFITSIENTI.filter((k) => k.obichayno !== '');
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът е броят коефициенти с ИЗРЕЧЕНИЕ за обичайното; изходът — броят
 * обявени числа. Разлика значи или число без изречение (никой не го е казал),
 * или изречение без число (казано, но не нарисувано) — и двете тихи.
 */
export function sveriOrientirite(kogato: string): Sverka {
  return sverka(
    'ориентири · изречение ↔ число',
    sIzrechenie().length,
    Object.keys(ORIENTIRI).length,
    kogato,
    MERKA.broy,
  );
}
