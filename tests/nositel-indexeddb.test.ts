/**
 * СЪЩИТЕ инварианти, друг носител.
 *
 * Договорът е един за трите носителя (System design §3), значи и тестът е един.
 * Ако IndexedDB реализацията мине същите проверки като тази в паметта,
 * Вратата може да стои върху която и да е от двете, без да знае разликата.
 */

import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  GreshkaReplay,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
  type Dnevnik,
} from '../src/yadro/index.js';
import { otvoriDnevnik, type DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import { operatsiya, SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
let broyach = 0;

/** Всеки тест получава своя база — иначе съседите си пречат. */
async function stend(): Promise<{ dnevnik: DnevnikVIndexedDB; vrata: Vrata }> {
  broyach += 1;
  const dnevnik = await otvoriDnevnik(`masterbook-test-${broyach}`);
  return { dnevnik, vrata: new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA }) };
}

describe('Журналът върху IndexedDB · същият договор', () => {
  it('приема записи и веригата остава цяла', async () => {
    const { dnevnik, vrata } = await stend();

    for (let i = 1; i <= 50; i += 1) {
      await vrata.dobavi(operatsiya({ opId: `op-${i}`, payload: { suma_st: i * 100 } }));
    }

    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    expect(vsichki).toHaveLength(50);
    expect(vsichki.map((s) => s.seq)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
  });

  it('повторен opId не създава втори запис', async () => {
    const { dnevnik, vrata } = await stend();
    const op = operatsiya({ opId: 'op-edno', payload: { suma_st: 250_00 } });

    const parvo = await vrata.dobavi(op);
    const vtoro = await vrata.dobavi(op);

    expect(vtoro.povtoreno).toBe(true);
    expect(vtoro.seq).toBe(parvo.seq);
    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(1);
  });

  it('едновременни записи дават редица без дупка', async () => {
    const { dnevnik, vrata } = await stend();

    await Promise.all(
      Array.from({ length: 40 }, (_, i) => vrata.dobavi(operatsiya({ opId: `op-${i}` }))),
    );

    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    expect(vsichki.map((s) => s.seq).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1),
    );
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
  });

  it('всеки наемател има своя редица — данните не се смесват', async () => {
    const { dnevnik, vrata } = await stend();

    await vrata.dobavi(operatsiya({ opId: 'a-1', naematel: 'naematel-a' }));
    await vrata.dobavi(operatsiya({ opId: 'b-1', naematel: 'naematel-b' }));
    await vrata.dobavi(operatsiya({ opId: 'a-2', naematel: 'naematel-a' }));

    const a = await dnevnik.chetiVsichki('naematel-a');
    const b = await dnevnik.chetiVsichki('naematel-b');

    expect(a.map((s) => s.seq)).toEqual([1, 2]);
    expect(b.map((s) => s.seq)).toEqual([1]);
    expect(a.every((s) => s.naematel === 'naematel-a')).toBe(true);
  });

  it('един и същ opId при различни наематели са различни операции', async () => {
    const { dnevnik, vrata } = await stend();

    await vrata.dobavi(operatsiya({ opId: 'op-1', naematel: 'naematel-a' }));
    await vrata.dobavi(operatsiya({ opId: 'op-1', naematel: 'naematel-b' }));

    expect(await dnevnik.chetiVsichki('naematel-a')).toHaveLength(1);
    expect(await dnevnik.chetiVsichki('naematel-b')).toHaveLength(1);
  });

  it('текущият rev на същност е seq на последното ѝ събитие', async () => {
    const { dnevnik, vrata } = await stend();
    const naem = { vid: 'naem', id: 'N-1' };
    const imot = { vid: 'imot', id: 'I-1' };

    expect(await dnevnik.tekushtRev(NAEMATEL, naem)).toBe(0);

    await vrata.dobavi(operatsiya({ opId: 'op-1', sashtnost: naem }));
    await vrata.dobavi(operatsiya({ opId: 'op-2', sashtnost: imot }));
    const treto = await vrata.dobavi(operatsiya({ opId: 'op-3', sashtnost: naem }));

    expect(await dnevnik.tekushtRev(NAEMATEL, naem)).toBe(treto.seq);
    expect(await dnevnik.tekushtRev(NAEMATEL, imot)).toBe(2);
  });

  it('rev-предпазителят отказва с REPLAY и следващият запис минава', async () => {
    const { dnevnik, vrata } = await stend();
    const sashtnost = { vid: 'naem', id: 'N-7' };

    await vrata.dobavi(operatsiya({ opId: 'ok-1', sashtnost }));
    await expect(
      vrata.dobavi(operatsiya({ opId: 'losh-2', sashtnost, expectedRev: 999 })),
    ).rejects.toBeInstanceOf(GreshkaReplay);
    await vrata.dobavi(operatsiya({ opId: 'ok-3', sashtnost }));

    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    expect(vsichki.map((s) => s.opId)).toEqual(['ok-1', 'ok-3']);
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
  });

  it('чете събитията за една същност, подредени по seq', async () => {
    const { dnevnik, vrata } = await stend();
    const naem = { vid: 'naem', id: 'N-1' };

    await vrata.dobavi(operatsiya({ opId: 'op-1', sashtnost: naem }));
    await vrata.dobavi(operatsiya({ opId: 'op-2', sashtnost: { vid: 'imot', id: 'I-1' } }));
    await vrata.dobavi(operatsiya({ opId: 'op-3', sashtnost: naem }));

    const zaNaema = await dnevnik.chetiZaSashtnost(NAEMATEL, naem);
    expect(zaNaema.map((s) => s.opId)).toEqual(['op-1', 'op-3']);
  });

  it('преживява затваряне и отваряне наново — данните са там', async () => {
    const ime = `masterbook-test-traynost-${(broyach += 1)}`;

    const parvi = await otvoriDnevnik(ime);
    const vrata = new Vrata({ dnevnik: parvi, pravata: new VsichkoRazresheno(), sha: SHA });
    await vrata.dobavi(operatsiya({ opId: 'op-1', payload: { naem_st: 1150_00 } }));
    await vrata.dobavi(operatsiya({ opId: 'op-2', payload: { naem_st: 640_00 } }));
    parvi.zatvori();

    const vtori = await otvoriDnevnik(ime);
    const vsichki = await vtori.chetiVsichki(NAEMATEL);

    expect(vsichki).toHaveLength(2);
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
    expect(vsichki[0]!.payload['naem_st']).toBe(1150_00);
    vtori.zatvori();
  });

  it('Вратата не знае кой носител стои под нея', async () => {
    const { dnevnik } = await stend();
    // Типова проверка: реализацията се събира в порта без изключения.
    const kato: Dnevnik = dnevnik;
    expect(await kato.chetiVsichki(NAEMATEL)).toEqual([]);
  });
});
