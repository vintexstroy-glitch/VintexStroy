/**
 * РАЗРЕЗЪТ ПО СОБСТВЕНА КОЛОНА · групиране на редовете на създадена таблица.
 *
 * Описът го изброи сред онова, което чакаше редовете: „колоните на Продажби,
 * РАЗРЕЗЪТ ПО СОБСТВЕНА КОЛОНА, rollup-ът". Редовете влязоха (ADR-111), тъй че
 * това не чака дума, а работа.
 *
 * ═══ КАКВО Е РАЗРЕЗ ═══
 *
 * Избираш колона; редовете се събират на групи по СТОЙНОСТТА ѝ, и всяка група
 * носи броя си и сбора на всяка парична колона. „По доставчик", „по месец",
 * „по обект" — една и съща сметка, различна колона.
 *
 * ═══ ГРУПАТА Е СМЕТКА, НЕ ЗАПИС ═══
 *
 * Нищо не влиза в Журнала. Разрезът се смята при всяко показване, както знакът
 * и скритото (правила 20 · 23): записан, той щеше да остарее при първия нов ред
 * и да лъже точно онзи, който му вярва.
 *
 * ═══ ПРАЗНАТА КЛЕТКА Е СВОЯ ГРУПА ═══
 *
 * Ред без стойност в тази колона НЕ се изхвърля — той отива в група „(празно)".
 * Изхвърлен, той щеше да изчезне от сборовете, а сборът на разреза трябва да е
 * равен на сбора на цялата таблица. Точно това сверява `sveriRazreza`.
 */

import type { PayloadTablitsaOtFaylSazdadena } from './sabitiya.js';
import { sborNaKolona, vidaNaKolonata, type RedNaTablitsa } from './redove-na-tablitsa.js';
import { kakvoPishe, stotinki } from '../yadro/pari.js';

class GreshkaRazrez extends Error {
  override readonly name = 'GreshkaRazrez';
}

/** Какво стои в клетката като ТЕКСТ · за групиране и за показване. */
export function kletkataKatoTekst(
  r: RedNaTablitsa,
  t: PayloadTablitsaOtFaylSazdadena,
  kolona: string,
): string {
  const vid = vidaNaKolonata(t, kolona);
  if (vid === 'evro') {
    const st = r.pari_st[kolona];
    return st === undefined ? '' : kakvoPishe(stotinki(st));
  }
  if (vid === 'protsent' || vid === 'chislo') {
    const n = r.chisla[kolona];
    return n === undefined ? '' : String(n);
  }
  return r.tekst[kolona] ?? '';
}

/** Групата · стойността, редовете ѝ и сборът на всяка парична колона. */
export interface Grupa {
  /** стойността, по която е събрана; празната клетка е СВОЯ група */
  readonly stoynost: string;
  readonly broy: number;
  /** колона → сбор в цели стотинки · само паричните колони */
  readonly sbor_st: Readonly<Record<string, number>>;
}

/** Кои колони са пари · един дом за въпроса, задаван на две места. */
export function parichniteKoloni(t: PayloadTablitsaOtFaylSazdadena): readonly string[] {
  return t.glavi.map((_, i) => String(i)).filter((k) => vidaNaKolonata(t, k) === 'evro');
}

/**
 * РАЗРЕЗЪТ · групите, подредени по стойност.
 *
 * Подредбата е по низ и не зависи от азбуката на машината: разрез, подреден
 * различно на два компютъра, кара двама души да спорят за една и съща таблица.
 */
export function razrezPoKolona(
  redove: readonly RedNaTablitsa[],
  t: PayloadTablitsaOtFaylSazdadena,
  kolona: string,
): readonly Grupa[] {
  const nomer = Number(kolona);
  if (!Number.isInteger(nomer) || nomer < 0 || nomer >= t.glavi.length) {
    throw new GreshkaRazrez(`Колона „${kolona}" я няма в главата на „${t.klyuch}".`);
  }

  const pari = parichniteKoloni(t);
  const po = new Map<string, RedNaTablitsa[]>();
  for (const r of redove) {
    if (r.mahnat) continue;
    const klyuch = kletkataKatoTekst(r, t, kolona);
    po.set(klyuch, [...(po.get(klyuch) ?? []), r]);
  }

  return [...po.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([stoynost, redoveNaGrupata]) => ({
      stoynost,
      broy: redoveNaGrupata.length,
      sbor_st: Object.fromEntries(pari.map((k) => [k, sborNaKolona(redoveNaGrupata, k)])),
    }));
}

export interface SverkaNaRazreza {
  readonly redove: number;
  readonly vGrupite: number;
  /** колона → сбор на цялата таблица минус сбора на групите · нула в здрав разрез */
  readonly razlika_st: Readonly<Record<string, number>>;
  readonly razlikaVBroya: number;
}

/**
 * СВЕРКАТА · цялото ↔ сборът на частите, и нулата се записва (правило 7).
 *
 * ДВЕ страни, които се смятат ПО РАЗЛИЧЕН път: лявата минава по редовете, без
 * да знае за групи; дясната събира групите. Изпадне ли ред при групирането —
 * например защото празната клетка е била изхвърлена — разликата го казва.
 */
export function sveriRazreza(
  redove: readonly RedNaTablitsa[],
  t: PayloadTablitsaOtFaylSazdadena,
  grupi: readonly Grupa[],
): SverkaNaRazreza {
  const zhivi = redove.filter((r) => !r.mahnat);
  const vGrupite = grupi.reduce((s, g) => s + g.broy, 0);
  const razlika_st: Record<string, number> = {};
  for (const k of parichniteKoloni(t)) {
    const tsyaloto = sborNaKolona(zhivi, k);
    const chastite = grupi.reduce((s, g) => s + (g.sbor_st[k] ?? 0), 0);
    razlika_st[k] = tsyaloto - chastite;
  }
  return {
    redove: zhivi.length,
    vGrupite,
    razlika_st,
    razlikaVBroya: zhivi.length - vGrupite,
  };
}
