/**
 * Хеш-веригата: hash[n] зависи от prevHash = hash[n-1].
 * Прави всяко скрито редактиране откриваемо (System design §3.1).
 */

import type { Sabitie, ZaHeshirane } from './sabitie.js';

/** Портът: асинхронен, за да върви и на Web Crypto в браузъра. */
export type Sha256 = (danni: string) => Promise<string>;

/** Реализация за Node. В браузъра се подава Web Crypto вариант. */
export const sha256Node: Sha256 = async (danni) => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(danni, 'utf8').digest('hex');
};

/**
 * Канонично представяне за хеширане.
 * Ключовете на payload се подреждат, за да не зависи хешът от реда им.
 * `actor` НЕ влиза в хеша: самоличността се записва, но не заключва веригата.
 */
export function kanonichno(s: ZaHeshirane): string {
  return JSON.stringify([
    s.seq,
    s.opId,
    s.ts,
    s.naematel,
    s.type,
    s.sashtnost.vid,
    s.sashtnost.id,
    podredi(s.payload),
    s.prevHash,
  ]);
}

function podredi(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(podredi);
  if (v !== null && typeof v === 'object') {
    const izhod: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      izhod[k] = podredi((v as Record<string, unknown>)[k]);
    }
    return izhod;
  }
  return v;
}

export async function izchisliHash(s: ZaHeshirane, sha: Sha256 = sha256Node): Promise<string> {
  return sha(kanonichno(s));
}

export interface RezultatOtProverka {
  readonly tsyala: boolean;
  /** seq на първото счупено звено; липсва, ако веригата е цяла */
  readonly parvoSchupeno?: number;
  readonly prichina?: 'hash' | 'prevHash' | 'seq';
  /** колко звена са минали проверката преди счупването */
  readonly proverni: number;
}

/**
 * Проверка на веригата за един наемател.
 * Събитията трябва да са подредени по seq, възходящо.
 */
export async function proveriVerigata(
  sabitiya: readonly Sabitie[],
  sha: Sha256 = sha256Node,
): Promise<RezultatOtProverka> {
  let ochakvanPrevHash = '';
  let ochakvanSeq = 1;

  for (const s of sabitiya) {
    if (s.seq !== ochakvanSeq) {
      return { tsyala: false, parvoSchupeno: s.seq, prichina: 'seq', proverni: ochakvanSeq - 1 };
    }
    if (s.prevHash !== ochakvanPrevHash) {
      return { tsyala: false, parvoSchupeno: s.seq, prichina: 'prevHash', proverni: ochakvanSeq - 1 };
    }
    const presmetnat = await izchisliHash(bezHash(s), sha);
    if (presmetnat !== s.hash) {
      return { tsyala: false, parvoSchupeno: s.seq, prichina: 'hash', proverni: ochakvanSeq - 1 };
    }
    ochakvanPrevHash = s.hash;
    ochakvanSeq += 1;
  }

  return { tsyala: true, proverni: sabitiya.length };
}

function bezHash(s: Sabitie): ZaHeshirane {
  return {
    seq: s.seq,
    opId: s.opId,
    ts: s.ts,
    naematel: s.naematel,
    actor: s.actor,
    type: s.type,
    sashtnost: s.sashtnost,
    payload: s.payload,
    prevHash: s.prevHash,
  };
}
