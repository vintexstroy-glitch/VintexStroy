/**
 * ИНВАРИАНТ 2 · ИДЕМПОТЕНТНОСТ
 * Готово когато: повторен opId не създава втори запис.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  GreshkaReplay,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { operatsiya, SHA } from './pomoshtni.js';

function novaVrata() {
  const dnevnik = new DnevnikVPametta();
  return { dnevnik, vrata: new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA }) };
}

describe('инвариант 2 · идемпотентност по opId', () => {
  it('повторен opId връща същия резултат и не добавя запис', async () => {
    const { dnevnik, vrata } = novaVrata();
    const op = operatsiya({ opId: 'op-eднократна', payload: { suma_st: 250_00 } });

    const parvo = await vrata.dobavi(op);
    const vtoro = await vrata.dobavi(op);
    const treto = await vrata.dobavi(op);

    expect(parvo.povtoreno).toBe(false);
    expect(vtoro.povtoreno).toBe(true);
    expect(treto.povtoreno).toBe(true);
    expect(vtoro.seq).toBe(parvo.seq);
    expect(vtoro.hash).toBe(parvo.hash);

    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(1);
  });

  it('20 едновременни повторения на един opId дават един-единствен запис', async () => {
    const { dnevnik, vrata } = novaVrata();
    const op = operatsiya({ opId: 'op-nadprevara', payload: { suma_st: 1_00 } });

    const rezultati = await Promise.all(Array.from({ length: 20 }, () => vrata.dobavi(op)));

    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(1);
    expect(new Set(rezultati.map((r) => r.hash)).size).toBe(1);
    expect(rezultati.filter((r) => !r.povtoreno)).toHaveLength(1);
  });

  it('един и същ opId при различни наематели са различни операции', async () => {
    const { dnevnik, vrata } = novaVrata();

    await vrata.dobavi(operatsiya({ opId: 'op-1', naematel: 'naematel-a' }));
    await vrata.dobavi(operatsiya({ opId: 'op-1', naematel: 'naematel-b' }));

    expect(await dnevnik.chetiVsichki('naematel-a')).toHaveLength(1);
    expect(await dnevnik.chetiVsichki('naematel-b')).toHaveLength(1);
  });

  it('rev-предпазителят отказва с REPLAY и връща актуалния rev', async () => {
    const { vrata } = novaVrata();
    const sashtnost = { vid: 'naem', id: 'N-7' };

    const parvo = await vrata.dobavi(operatsiya({ opId: 'op-1', sashtnost, expectedRev: 0 }));

    await expect(
      vrata.dobavi(operatsiya({ opId: 'op-2', sashtnost, expectedRev: 0 })),
    ).rejects.toBeInstanceOf(GreshkaReplay);

    // С верния rev минава.
    const vtoro = await vrata.dobavi(
      operatsiya({ opId: 'op-3', sashtnost, expectedRev: parvo.seq }),
    );
    expect(vtoro.povtoreno).toBe(false);
  });

  it('отказан запис не къса веригата за следващия', async () => {
    const { dnevnik, vrata } = novaVrata();
    const sashtnost = { vid: 'naem', id: 'N-9' };

    await vrata.dobavi(operatsiya({ opId: 'ok-1', sashtnost }));
    await expect(
      vrata.dobavi(operatsiya({ opId: 'lош-2', sashtnost, expectedRev: 999 })),
    ).rejects.toBeInstanceOf(GreshkaReplay);
    await vrata.dobavi(operatsiya({ opId: 'ok-3', sashtnost }));

    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    expect(vsichki.map((s) => s.opId)).toEqual(['ok-1', 'ok-3']);
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
  });
});
