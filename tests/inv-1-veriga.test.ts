/**
 * ИНВАРИАНТ 1 · ВЕРИГАТА Е ЦЯЛА
 * Готово когато: хиляда събития минават през Вратата и веригата остава цяла.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
  type Sabitie,
} from '../src/yadro/index.js';
import { operatsiya, seyalka } from './pomoshtni.js';

function novaVrata() {
  const dnevnik = new DnevnikVPametta();
  return { dnevnik, vrata: new Vrata({ dnevnik, pravata: new VsichkoRazresheno() }) };
}

describe('инвариант 1 · хеш-веригата', () => {
  it('остава цяла след 1000 събития през Вратата', async () => {
    const { dnevnik, vrata } = novaVrata();
    const random = seyalka(42);
    const vidove = ['naem', 'imot', 'plashtane'];

    for (let i = 1; i <= 1000; i += 1) {
      const vid = vidove[Math.floor(random() * vidove.length)]!;
      await vrata.dobavi(
        operatsiya({
          opId: `op-${i}`,
          sashtnost: { vid, id: `${vid.toUpperCase()}-${Math.floor(random() * 20) + 1}` },
          payload: { suma_st: Math.floor(random() * 500_00) },
        }),
      );
    }

    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    expect(vsichki).toHaveLength(1000);

    const rezultat = await proveriVerigata(vsichki);
    expect(rezultat.tsyala).toBe(true);
    expect(rezultat.proverni).toBe(1000);
  });

  it('първото събитие има празен prevHash, всяко следващо сочи предишното', async () => {
    const { dnevnik, vrata } = novaVrata();
    for (let i = 1; i <= 5; i += 1) {
      await vrata.dobavi(operatsiya({ opId: `op-${i}` }));
    }

    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    expect(vsichki[0]!.prevHash).toBe('');
    for (let i = 1; i < vsichki.length; i += 1) {
      expect(vsichki[i]!.prevHash).toBe(vsichki[i - 1]!.hash);
    }
  });

  it('засича подменен payload — точно на счупеното звено', async () => {
    const { dnevnik, vrata } = novaVrata();
    for (let i = 1; i <= 10; i += 1) {
      await vrata.dobavi(operatsiya({ opId: `op-${i}`, payload: { suma_st: 100_00 } }));
    }

    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    const podmenen: Sabitie[] = vsichki.map((s, i) =>
      i === 4 ? { ...s, payload: { suma_st: 999_00 } } : s,
    );

    const rezultat = await proveriVerigata(podmenen);
    expect(rezultat.tsyala).toBe(false);
    expect(rezultat.parvoSchupeno).toBe(5);
    expect(rezultat.prichina).toBe('hash');
    expect(rezultat.proverni).toBe(4);
  });

  it('засича изтрито звено по средата', async () => {
    const { dnevnik, vrata } = novaVrata();
    for (let i = 1; i <= 6; i += 1) {
      await vrata.dobavi(operatsiya({ opId: `op-${i}` }));
    }

    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    const bezTretoto = vsichki.filter((s) => s.seq !== 3);

    const rezultat = await proveriVerigata(bezTretoto);
    expect(rezultat.tsyala).toBe(false);
    expect(rezultat.prichina).toBe('seq');
  });

  it('хешът не зависи от реда на ключовете в payload', async () => {
    const a = novaVrata();
    const b = novaVrata();

    const r1 = await a.vrata.dobavi(
      operatsiya({ opId: 'op-1', payload: { naem_st: 500_00, mesets: '2026-08' } }),
    );
    const r2 = await b.vrata.dobavi(
      operatsiya({ opId: 'op-1', payload: { mesets: '2026-08', naem_st: 500_00 } }),
    );

    expect(r1.hash).toBe(r2.hash);
  });
});
