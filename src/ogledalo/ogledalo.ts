/**
 * ОГЛЕДАЛОТО — производно състояние.
 *
 * Не се съхранява. Изчислява се от Журнала при всяко поискване:
 *   състояние = fold(събития, приложи)
 *
 * Правилото, за което се плати скъпо: „текущо състояние" е АГРЕГАТ на всички
 * събития за същността, не последният ред (Архитектурен документ §2).
 *
 * Сторното се самопогасява: събитие, което е сторнирано, не се прилага —
 * и самото сторно не се прилага. Нищо не се трие; просто не се брои.
 */

import type { Sabitie } from '../yadro/index.js';
import { SEKTOR_PO_PODRAZBIRANE } from '../domein/dds.js';
import type {
  PayloadImotDobaven,
  PayloadImotPopraven,
  PayloadNaemDobaven,
  PayloadNaemPopraven,
  PayloadNaemPrekraten,
  PayloadPlashtanePrieto,
  PayloadStorno,
  PayloadVzemaneNachisleno,
} from '../domein/sabitiya.js';

export interface Imot {
  readonly id: string;
  /** seq на събитието, което го създаде — сторното сочи именно него */
  readonly seq: number;
  readonly adres: string;
  readonly edinitsa: string;
  readonly ploshtad_kvsm: number;
}

export interface Naem {
  readonly id: string;
  /** seq на „НаемДобавен“ — не се мени от поправки */
  readonly seq: number;
  readonly imotId: string;
  readonly naemetel: string;
  readonly naem_st: number;
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  /** ключ на акумулатор за ДДС — виж `src/domein/dds.ts` */
  readonly sektor: string;
  readonly prekraten: boolean;
  readonly kraj?: string;
}

export type SastoyanieVzemane = 'отворено' | 'частично' | 'затворено' | 'надплатено';

export interface Vzemane {
  readonly id: string;
  readonly seq: number;
  readonly naemId: string;
  readonly period: string;
  readonly osnovanie: string;
  readonly nachisleno_st: number;
  readonly pogaseno_st: number;
  readonly ostatak_st: number;
  readonly padezh: string;
  readonly sastoyanie: SastoyanieVzemane;
}

export interface Plashtane {
  readonly id: string;
  /** seq на събитието — сторното сочи именно него */
  readonly seq: number;
  readonly vzemaneId: string;
  readonly suma_st: number;
  readonly nachin: string;
  readonly data: string;
}

export interface Ogledalo {
  readonly imoti: ReadonlyMap<string, Imot>;
  readonly naemi: ReadonlyMap<string, Naem>;
  readonly vzemaniya: ReadonlyMap<string, Vzemane>;
  readonly plashtaniya: ReadonlyMap<string, Plashtane>;
  /** колко събития са влезли в състоянието */
  readonly prilozheni: number;
  /** seq-овете, които сторно е погасило (и самите сторна) */
  readonly pogaseni: ReadonlySet<number>;
}

/**
 * Изгражда Огледалото от подредена по seq редица събития.
 * Две минавания: първо кои seq са погасени, после кои се прилагат.
 */
export function fold(sabitiya: readonly Sabitie[]): Ogledalo {
  const pogaseni = new Set<number>();
  for (const s of sabitiya) {
    if (s.type === 'Сторно') {
      const p = s.payload as unknown as PayloadStorno;
      pogaseni.add(p.pogasyavaSeq);
      pogaseni.add(s.seq);
    }
  }

  const imoti = new Map<string, Imot>();
  const naemi = new Map<string, Naem>();
  const vzemaniya = new Map<string, Vzemane>();
  const plashtaniya = new Map<string, Plashtane>();
  let prilozheni = 0;

  for (const s of sabitiya) {
    if (pogaseni.has(s.seq)) continue;
    prilozheni += 1;

    switch (s.type) {
      case 'ИмотДобавен': {
        const p = s.payload as unknown as PayloadImotDobaven;
        imoti.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          adres: p.adres,
          edinitsa: p.edinitsa,
          ploshtad_kvsm: p.ploshtad_kvsm,
        });
        break;
      }

      case 'НаемДобавен': {
        const p = s.payload as unknown as PayloadNaemDobaven;
        naemi.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          imotId: p.imotId,
          naemetel: p.naemetel,
          naem_st: p.naem_st,
          padezhDen: p.padezhDen,
          ot: p.ot,
          do: p.do,
          depozit_st: p.depozit_st,
          // Наем, записан преди резен 4, няма сектор — пада към жилищен.
          sektor: p.sektor ?? SEKTOR_PO_PODRAZBIRANE,
          prekraten: false,
        });
        break;
      }

      case 'ИмотПоправен': {
        const p = s.payload as unknown as PayloadImotPopraven;
        const imot = imoti.get(p.imotId);
        // Поправка на несъществуващ имот не създава имот от нищото.
        if (imot) {
          imoti.set(imot.id, {
            ...imot,
            adres: p.adres,
            edinitsa: p.edinitsa,
            ploshtad_kvsm: p.ploshtad_kvsm,
          });
        }
        break;
      }

      case 'НаемПоправен': {
        const p = s.payload as unknown as PayloadNaemPopraven;
        const naem = naemi.get(p.naemId);
        if (naem) {
          // Прекратеността НЕ се пипа оттук — тя си има свое събитие.
          naemi.set(naem.id, {
            ...naem,
            naemetel: p.naemetel,
            naem_st: p.naem_st,
            padezhDen: p.padezhDen,
            ot: p.ot,
            do: p.do,
            depozit_st: p.depozit_st,
            sektor: p.sektor ?? SEKTOR_PO_PODRAZBIRANE,
          });
        }
        break;
      }

      case 'НаемПрекратен': {
        const p = s.payload as unknown as PayloadNaemPrekraten;
        const naem = naemi.get(p.naemId);
        if (naem) naemi.set(naem.id, { ...naem, prekraten: true, kraj: p.kraj });
        break;
      }

      case 'ВземанеНачислено': {
        const p = s.payload as unknown as PayloadVzemaneNachisleno;
        vzemaniya.set(
          s.sashtnost.id,
          presmetni({
            id: s.sashtnost.id,
            seq: s.seq,
            naemId: p.naemId,
            period: p.period,
            osnovanie: p.osnovanie,
            nachisleno_st: p.suma_st,
            pogaseno_st: 0,
            padezh: p.padezh,
          }),
        );
        break;
      }

      case 'ПлащанеПрието': {
        const p = s.payload as unknown as PayloadPlashtanePrieto;
        plashtaniya.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          vzemaneId: p.vzemaneId,
          suma_st: p.suma_st,
          nachin: p.nachin,
          data: p.data,
        });
        const vzemane = vzemaniya.get(p.vzemaneId);
        if (vzemane) {
          vzemaniya.set(
            vzemane.id,
            presmetni({ ...vzemane, pogaseno_st: vzemane.pogaseno_st + p.suma_st }),
          );
        }
        break;
      }

      default:
        // Непознат тип не събаря Огледалото — брои се, но не мени нищо.
        break;
    }
  }

  return { imoti, naemi, vzemaniya, plashtaniya, prilozheni, pogaseni };
}

type BezPresmetnato = Omit<Vzemane, 'ostatak_st' | 'sastoyanie'>;

function presmetni(v: BezPresmetnato): Vzemane {
  const ostatak_st = v.nachisleno_st - v.pogaseno_st;
  let sastoyanie: SastoyanieVzemane;
  if (v.pogaseno_st === 0) sastoyanie = 'отворено';
  else if (ostatak_st > 0) sastoyanie = 'частично';
  else if (ostatak_st === 0) sastoyanie = 'затворено';
  else sastoyanie = 'надплатено';
  return { ...v, ostatak_st, sastoyanie };
}

/** Сборът, който трябва да затваря: начислено − погасено по всички вземания. */
export function duljimo(o: Ogledalo): number {
  let sbor = 0;
  for (const v of o.vzemaniya.values()) sbor += v.ostatak_st;
  return sbor;
}

/** Всичко събрано — сборът на непогасените плащания. */
export function sabrano(o: Ogledalo): number {
  let sbor = 0;
  for (const p of o.plashtaniya.values()) sbor += p.suma_st;
  return sbor;
}

/** Вземанията за един наем, подредени по период. */
export function vzemaniyaZaNaem(o: Ogledalo, naemId: string): Vzemane[] {
  return [...o.vzemaniya.values()]
    .filter((v) => v.naemId === naemId)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface ProsrocheneVzemane extends Vzemane {
  readonly dniZakasnenie: number;
}

/**
 * Незатворените вземания с падеж преди `dnes`, най-закъснелите отгоре.
 * Датите са ISO низове — сравняват се лексикографски, без часови пояси.
 */
export function prosrocheni(o: Ogledalo, dnes: string): ProsrocheneVzemane[] {
  const den = dnes.slice(0, 10);
  return [...o.vzemaniya.values()]
    .filter((v) => v.ostatak_st > 0 && v.padezh < den)
    .map((v) => ({ ...v, dniZakasnenie: dniMezhdu(v.padezh, den) }))
    .sort((a, b) => b.dniZakasnenie - a.dniZakasnenie || a.id.localeCompare(b.id));
}

/** Остатъкът по наеми — карта naemId → дължимо в стотинки. */
export function duljimoPoNaem(o: Ogledalo): Map<string, number> {
  const karta = new Map<string, number>();
  for (const v of o.vzemaniya.values()) {
    if (v.ostatak_st === 0) continue;
    karta.set(v.naemId, (karta.get(v.naemId) ?? 0) + v.ostatak_st);
  }
  return karta;
}

/** Цели дни между две ISO дати. */
export function dniMezhdu(ot: string, doo: string): number {
  const a = Date.parse(`${ot.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${doo.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}
