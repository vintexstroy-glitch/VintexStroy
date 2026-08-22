import type { Operatsiya } from '../src/yadro/index.js';

/** Детерминистичен генератор — без Math.random, за да са тестовете повторяеми. */
export function seyalka(seme = 1): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export function operatsiya(chast: Partial<Operatsiya> & { opId: string }): Operatsiya {
  return {
    ts: '2026-08-22T09:00:00.000Z',
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    type: 'НаемДобавен',
    sashtnost: { vid: 'naem', id: 'N-1' },
    payload: {},
    ...chast,
  };
}
