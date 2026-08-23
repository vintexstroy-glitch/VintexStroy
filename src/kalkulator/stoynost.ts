/**
 * СТОЙНОСТ НА СЪСТОЯНИЕ (КАЛКУЛАТОР) · сборът Е стойността.
 *
 * Негови думи (23.08), които дадоха и името, и сметката:
 *
 *   „**Новото име е Стойност на Състояние (Калкулатор).** Пресмята всичките
 *    налични имоти в движение като наеми и продажби, и вкарани през Управление
 *    се появяват в Калкулатора; намираш се в Стойност на Състояние, където
 *    **сборът е тази стойност на състоянието общо**. Другото е старо име."
 *
 * И от по-рано, за същото място:
 *
 *   „…казва се Стойност на Състояние и **няма редакция оттам, а само
 *    изчисляване** на стойност на имотите като оценка на всички наши активи…
 *    и е калкулатор за пресмятане на стойността на всеки обект и цялата
 *    стойност." *(09.08)*
 *
 * ЗАТОВА ТУК НЯМА НИТО ЕДИН ЗАПИС. Този файл смята и връща; какво влиза в
 * Журнала, решава Вратата отвън. „Няма редакция оттам" е негово изречение и е
 * изпълнено буквално.
 *
 * ПРОДАДЕНОТО НЕ ВЛИЗА. В неговата ценова листа продаденият обект носи думата
 * „ПРОДАДЕН" на мястото на цената — това е сигналът, не отделна колона. Обект,
 * който вече не е негов, не е част от стойността на състоянието.
 *
 * ЗАКРЪГЛЯНЕТО Е ВЕДНЪЖ, НАКРАЯ. Цената на всеки обект се закръгля НАГОРЕ до
 * стотица (негово правило, и неговата листа го потвърждава — всяка цена там
 * завършва на две нули). Но СБОРЪТ се смята от ТОЧНИТЕ цени и се закръгля
 * отделно: закръгленото никога не влиза в сбор (ADR-012).
 */

import { tsenaNagore, zakragli } from '../yadro/valuta.js';
import {
  evroNaKvadrat_st,
  ochakvanNaem_st,
  tsenaPoSastoyanie,
  tsenaTochno,
  type Matritsa,
} from './matritsa.js';
import { obshtiChasti_kvsm, type ProchetenObekt, type VidObekt } from './chetene.js';
import { deystvitelenNaem_st } from './svarzvane.js';

/** Каквото ценовата листа знае за обекта, а площообразуването — не. */
export interface OtTsenovaLista {
  /** „СИ" · „Ю" · празно, ако още не е известно */
  readonly izlozhenie: string;
  /** брой стаи; 0 значи „не се знае" */
  readonly stai: number;
  /** тераси в кв.см; 0 значи „няма" */
  readonly terasi_kvsm: number;
  /** ПРОДАДЕН ли е — тогава не влиза в стойността */
  readonly prodaden: boolean;
}

export const PRAZNO_OT_LISTA: OtTsenovaLista = Object.freeze({
  izlozhenie: '',
  stai: 0,
  terasi_kvsm: 0,
  prodaden: false,
});

/** Един ред на екрана Стойност на Състояние. */
export interface RedNaStoynost {
  readonly obekt: string;
  readonly vid: VidObekt;
  readonly etazh: string;
  readonly kota: string;
  readonly chista_kvsm: number;
  readonly obshti_chasti_kvsm: number;
  readonly obshta_kvsm: number;
  readonly izlozhenie: string;
  readonly stai: number;
  readonly terasi_kvsm: number;
  readonly prodaden: boolean;
  /** А · цената ПО ПЛОЩ, точно, преди закръгляне — тя влиза в сбора */
  readonly tsena_tochno_st: number;
  /** А · цената ПО ПЛОЩ, показана · нагоре до стотица; НЕ влиза в сбор */
  readonly tsena_st: number;
  /** евро на квадрат, от показаната цена — както е в неговата листа */
  readonly evroNaKvadrat_st: number;
  /** Б · СТОЙНОСТТА ПО СЪСТОЯНИЕ, точно — влиза във втория сбор */
  readonly sastoyanie_tochno_st: number;
  /** Б · същата, нагоре до стотица */
  readonly sastoyanie_st: number;
  /** Б · евро на квадрат по състояние */
  readonly sastoyanieNaKvadrat_st: number;
  /** месечният наем, с който Б е сметната */
  readonly naem_mesechen_st: number;
  /**
   * Откъде е наемът: `zhurnal` — действителен, записан за този имот;
   * `matritsa` — очакван по вид и площ. Екранът го КАЗВА, защото разликата
   * между двете е разликата между факт и предположение.
   */
  readonly naemOt: 'zhurnal' | 'matritsa';
  /**
   * Δ · с колко Б стои под или над А, в цели базисни точки.
   * Отрицателно значи, че оценката е под продажната цена — обичайното при
   * ново строителство. Нула, когато А е нула.
   */
  readonly razlika_bt: number;
}

/** Стойността на състоянието: редовете и сборът им. */
export interface StoynostNaSastoyanie {
  readonly redove: readonly RedNaStoynost[];
  /** А · сборът от ТОЧНИТЕ цени по площ */
  readonly obshto_tochno_st: number;
  /** А · същият сбор, закръглен веднъж към най-близката стотица — за екрана */
  readonly obshto_st: number;
  /** колко „изяде" закръглянето — вижда се, не се преглъща (правило 7) */
  readonly razlika_st: number;
  /** Б · сборът от точните стойности по състояние */
  readonly sastoyanie_tochno_st: number;
  /** Б · същият, закръглен веднъж */
  readonly sastoyanie_st: number;
  /** Δ на двата сбора, в цели базисни точки */
  readonly razlika_na_metodite_bt: number;
  /** колко обекта влизат в стойността */
  readonly broy: number;
  /** колко са пропуснати, защото са продадени */
  readonly prodadeni: number;
}

/**
 * СМЯТА стойността на състоянието.
 *
 * `otLista` дава изложението, стаите и терасите по име на обекта — те идват от
 * ценовата листа, не се измислят. Липсва ли обект в нея, коефициентът за
 * изложение е 1,00 и това е честно: неизвестното не мени цената.
 */
export function stoynostNaSastoyanie(
  obekti: readonly ProchetenObekt[],
  otLista: ReadonlyMap<string, OtTsenovaLista>,
  matritsa?: Matritsa,
  /** обект → действителен месечен наем от Журнала (`svarzvane.ts`) */
  naemiOtZhurnala: ReadonlyMap<string, number> = new Map(),
): StoynostNaSastoyanie {
  const redove: RedNaStoynost[] = [];
  let obshto_tochno_st = 0;
  let sastoyanie_tochno_st = 0;
  let prodadeni = 0;

  for (const o of obekti) {
    const dop = otLista.get(o.obekt.trim()) ?? PRAZNO_OT_LISTA;

    // ── А · ПО ПЛОЩ · продажната цена ────────────────────────────────────
    const tsena_tochno_st = tsenaTochno({
      obshta_kvsm: o.obshta_kvsm,
      vid: o.vid,
      etazh: o.etazh,
      izlozhenie: dop.izlozhenie,
      ...(matritsa ? { matritsa } : {}),
    });
    const tsena_st = tsenaNagore(tsena_tochno_st);

    // ── Б · ПО СЪСТОЯНИЕ · оценката ──────────────────────────────────────
    // Действителният наем БИЕ очаквания: факт над предположение.
    const otZhurnala = deystvitelenNaem_st(o.obekt, naemiOtZhurnala);
    const naem_mesechen_st =
      otZhurnala !== undefined && otZhurnala > 0
        ? otZhurnala
        : ochakvanNaem_st(o.obshta_kvsm, o.vid, matritsa);
    const naemOt: 'zhurnal' | 'matritsa' =
      otZhurnala !== undefined && otZhurnala > 0 ? 'zhurnal' : 'matritsa';
    const sastoyanie_t_st = tsenaPoSastoyanie({
      naem_mesechen_st,
      ...(matritsa ? { matritsa } : {}),
    });
    const sastoyanie_st = tsenaNagore(sastoyanie_t_st);

    if (dop.prodaden) {
      prodadeni += 1;
    } else {
      obshto_tochno_st += tsena_tochno_st;
      sastoyanie_tochno_st += sastoyanie_t_st;
    }

    redove.push({
      obekt: o.obekt,
      vid: o.vid,
      etazh: o.etazh,
      kota: o.kota,
      chista_kvsm: o.chista_kvsm,
      obshti_chasti_kvsm: obshtiChasti_kvsm(o),
      obshta_kvsm: o.obshta_kvsm,
      izlozhenie: dop.izlozhenie,
      stai: dop.stai,
      terasi_kvsm: dop.terasi_kvsm,
      prodaden: dop.prodaden,
      tsena_tochno_st,
      tsena_st,
      evroNaKvadrat_st: evroNaKvadrat_st(tsena_st, o.obshta_kvsm),
      sastoyanie_tochno_st: sastoyanie_t_st,
      sastoyanie_st,
      sastoyanieNaKvadrat_st: evroNaKvadrat_st(sastoyanie_st, o.obshta_kvsm),
      naem_mesechen_st,
      naemOt,
      razlika_bt: razlikaVBT(tsena_tochno_st, sastoyanie_t_st),
    });
  }

  const obshto_st = zakragli(obshto_tochno_st, 'stotitsi');
  return {
    redove: Object.freeze(redove),
    obshto_tochno_st,
    obshto_st,
    razlika_st: obshto_st - obshto_tochno_st,
    sastoyanie_tochno_st,
    sastoyanie_st: zakragli(sastoyanie_tochno_st, 'stotitsi'),
    razlika_na_metodite_bt: razlikaVBT(obshto_tochno_st, sastoyanie_tochno_st),
    broy: redove.length - prodadeni,
    prodadeni,
  };
}

/**
 * С колко Б стои под или над А, в цели базисни точки.
 *
 * Нула при нулево А — деление на нула не се прави и не се измисля процент.
 * Знакът е важен: отрицателното значи, че оценката е ПОД продажната цена,
 * и точно това сравнение той поръча да се вижда.
 */
function razlikaVBT(a_st: number, b_st: number): number {
  if (a_st === 0) return 0;
  return Math.round(((b_st - a_st) * 10_000) / a_st);
}

/**
 * СВЕРКАТА ВХОД↔ИЗХОД на партидата (правило 7).
 *
 * Влизат N обекта от площообразуването → излизат N реда. Разликата се записва
 * ДОРИ когато е нула: проверената нула е различна от нулата, за която никой не
 * е питал.
 */
export function sverkaNaPartida(
  vhod: readonly ProchetenObekt[],
  izhod: StoynostNaSastoyanie,
): { readonly vhod: number; readonly izhod: number; readonly razlika: number } {
  const v = vhod.length;
  const i = izhod.redove.length;
  return { vhod: v, izhod: i, razlika: i - v };
}
