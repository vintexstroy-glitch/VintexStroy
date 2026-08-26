/**
 * ОЩЕ ОГЛЕДАЛА · различни ъгли към същия Журнал.
 *
 * Отговорът на въпроса му „няма ли да помогне?": да — и е почти безплатно.
 * Огледалото се смята от нулата за 0,3 ms (мерките), значи всеки нов изглед
 * е чиста функция без цена и без ново състояние. Истината е една (Журналът);
 * ъглите към нея са колкото трябват.
 *
 * Тук са двата, които вадят отговори на истински въпроси:
 *   · ПО ИМОТ — „кой обект колко носи и колко яде" (метриката
 *     „приход/разход по обект" от думите му, `references/metrics.md`)
 *   · ПО КОНТРАГЕНТ — „кой ми дължи, кой плаща навреме, на кого плащам"
 */

import type { Ogledalo } from './ogledalo.js';
import { dniMezhdu } from './ogledalo.js';

/** Единият обект: какво носи, какво дължат по него, какво е ял. */
interface PoImot {
  readonly imotId: string;
  readonly adres: string;
  readonly edinitsa: string;
  /** живи наеми в момента */
  readonly zhiviNaemi: number;
  /** начислено по наемите на имота — всичко, обща цена с ДДС */
  readonly nachisleno_st: number;
  readonly sabrano_st: number;
  readonly duljimo_st: number;
}

/** Приход и дълг по обект — картата, от която се вижда кой обект работи. */
export function poImot(o: Ogledalo): PoImot[] {
  const naemKamImot = new Map<string, string>();
  for (const n of o.naemi.values()) naemKamImot.set(n.id, n.imotId);

  const sboriste = new Map<string, { nachisleno: number; pogaseno: number }>();
  for (const v of o.vzemaniya.values()) {
    const imotId = naemKamImot.get(v.naemId);
    if (!imotId) continue;
    const s = sboriste.get(imotId) ?? { nachisleno: 0, pogaseno: 0 };
    s.nachisleno += v.nachisleno_st;
    s.pogaseno += v.pogaseno_st;
    sboriste.set(imotId, s);
  }

  return [...o.imoti.values()]
    .map((i) => {
      const s = sboriste.get(i.id) ?? { nachisleno: 0, pogaseno: 0 };
      return {
        imotId: i.id,
        adres: i.adres,
        edinitsa: i.edinitsa,
        zhiviNaemi: [...o.naemi.values()].filter((n) => n.imotId === i.id && !n.prekraten).length,
        nachisleno_st: s.nachisleno,
        sabrano_st: s.pogaseno,
        duljimo_st: s.nachisleno - s.pogaseno,
      };
    })
    .sort((a, b) => b.nachisleno_st - a.nachisleno_st);
}

/** Единият контрагент — наемател или доставчик, събран от всичките му следи. */
interface PoKontragent {
  readonly ime: string;
  readonly rolya: 'наемател' | 'доставчик';
  readonly nachisleno_st: number;
  readonly plateno_st: number;
  readonly duljimo_st: number;
  /** среден брой дни между падеж и плащане — под 0 значи плаща предсрочно */
  readonly srednoZakasnenie: number | null;
  readonly broySledi: number;
}

/**
 * Кой ми дължи и кой плаща навреме; на кого колко съм платил.
 * Имената се сравняват без глас и без разстояния — „Стройпласт ЕООД" и
 * „стройпласт еоод " са един контрагент, докато Контактите (М10) не дойдат
 * като истинска същност.
 */
export function poKontragent(o: Ogledalo): PoKontragent[] {
  const izhod = new Map<string, {
    ime: string;
    rolya: 'наемател' | 'доставчик';
    nachisleno: number;
    plateno: number;
    zakasneniya: number[];
    sledi: number;
  }>();

  const klyuchNa = (ime: string, rolya: string) => `${rolya}:${ime.trim().toLowerCase()}`;
  const vzemi = (ime: string, rolya: 'наемател' | 'доставчик') => {
    const k = klyuchNa(ime, rolya);
    const veche = izhod.get(k);
    if (veche) return veche;
    const nov = { ime: ime.trim(), rolya, nachisleno: 0, plateno: 0, zakasneniya: [] as number[], sledi: 0 };
    izhod.set(k, nov);
    return nov;
  };

  for (const v of o.vzemaniya.values()) {
    const naem = o.naemi.get(v.naemId);
    if (!naem) continue;
    const k = vzemi(naem.naemetel, 'наемател');
    k.nachisleno += v.nachisleno_st;
    k.plateno += v.pogaseno_st;
    k.sledi += 1;
  }

  for (const p of o.plashtaniya.values()) {
    const v = o.vzemaniya.get(p.vzemaneId);
    const naem = v ? o.naemi.get(v.naemId) : undefined;
    if (!v || !naem) continue;
    vzemi(naem.naemetel, 'наемател').zakasneniya.push(dniMezhdu(v.padezh, p.data));
  }

  for (const r of o.razhodi.values()) {
    const k = vzemi(r.dostavchik, 'доставчик');
    k.nachisleno += r.suma_st;
    k.plateno += r.suma_st;
    k.sledi += 1;
  }

  return [...izhod.values()]
    .map((k) => ({
      ime: k.ime,
      rolya: k.rolya,
      nachisleno_st: k.nachisleno,
      plateno_st: k.plateno,
      duljimo_st: k.nachisleno - k.plateno,
      srednoZakasnenie:
        k.zakasneniya.length === 0
          ? null
          : Math.round(k.zakasneniya.reduce((s, d) => s + d, 0) / k.zakasneniya.length),
      broySledi: k.sledi,
    }))
    .sort((a, b) => b.duljimo_st - a.duljimo_st || b.nachisleno_st - a.nachisleno_st);
}
