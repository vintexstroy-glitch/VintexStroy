/**
 * ВРАТАТА · спирателен кран (П1.4), право, валидност.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  GreshkaVrata,
  PoSpisak,
  Vrata,
  VsichkoRazresheno,
  type Pravata,
} from '../src/yadro/index.js';
import { operatsiya } from './pomoshtni.js';

function novaVrata(pravata: Pravata = new VsichkoRazresheno()) {
  const dnevnik = new DnevnikVPametta();
  return { dnevnik, vrata: new Vrata({ dnevnik, pravata }) };
}

describe('спирателен кран', () => {
  it('спира записа, но не събаря четенето', async () => {
    const { dnevnik, vrata } = novaVrata();
    await vrata.dobavi(operatsiya({ opId: 'op-1' }));

    vrata.zatvori('съмнение за счупена верига');
    expect(vrata.zatvorena).toBe(true);

    await expect(vrata.dobavi(operatsiya({ opId: 'op-2' }))).rejects.toMatchObject({
      kod: 'SPRYAN',
    });

    // Четенето работи.
    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(1);

    vrata.otvori();
    await vrata.dobavi(operatsiya({ opId: 'op-2' }));
    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(2);
  });

  it('носи причината за спирането', () => {
    const { vrata } = novaVrata();
    vrata.zatvori('миграция в ход');
    expect(vrata.prichinaZaZatvaryane).toBe('миграция в ход');
  });
});

describe('право', () => {
  it('отказва писане при чужд наемател', async () => {
    const { dnevnik, vrata } = novaVrata(
      new PoSpisak({ 'ivo@example.com': ['naematel-a'] }),
    );

    await vrata.dobavi(
      operatsiya({ opId: 'op-1', actor: 'ivo@example.com', naematel: 'naematel-a' }),
    );

    await expect(
      vrata.dobavi(operatsiya({ opId: 'op-2', actor: 'ivo@example.com', naematel: 'naematel-b' })),
    ).rejects.toMatchObject({ kod: 'BEZ_PRAVO' });

    expect(await dnevnik.chetiVsichki('naematel-b')).toHaveLength(0);
  });
});

describe('валидност', () => {
  it('отказва пари, които не са цели стотинки', async () => {
    const { vrata } = novaVrata();

    for (const losha of [12.5, NaN, Infinity, '100', null]) {
      await expect(
        vrata.dobavi(operatsiya({ opId: `op-${String(losha)}`, payload: { naem_st: losha } })),
      ).rejects.toMatchObject({ kod: 'NEVALIDNO' });
    }
  });

  it('проверява парите и във вложен обект', async () => {
    const { vrata } = novaVrata();

    await expect(
      vrata.dobavi(
        operatsiya({ opId: 'op-1', payload: { razbivka: { dds_st: 20.5 } } }),
      ),
    ).rejects.toMatchObject({ kod: 'NEVALIDNO' });

    const dobar = await vrata.dobavi(
      operatsiya({ opId: 'op-2', payload: { razbivka: { dds_st: 20_50 } } }),
    );
    expect(dobar.seq).toBe(1);
  });

  it('пропуска полета без наставката за пари', async () => {
    const { vrata } = novaVrata();
    const r = await vrata.dobavi(
      operatsiya({ opId: 'op-1', payload: { ploshtad: 72.5, adres: 'Лозенец' } }),
    );
    expect(r.seq).toBe(1);
  });

  it('отказва празни задължителни полета и невалидно време', async () => {
    const { vrata } = novaVrata();

    await expect(vrata.dobavi(operatsiya({ opId: '' }))).rejects.toBeInstanceOf(GreshkaVrata);
    await expect(
      vrata.dobavi(operatsiya({ opId: 'op-1', actor: '' })),
    ).rejects.toMatchObject({ kod: 'NEVALIDNO' });
    await expect(
      vrata.dobavi(operatsiya({ opId: 'op-2', ts: 'вчера следобед' })),
    ).rejects.toMatchObject({ kod: 'NEVALIDNO' });
    await expect(
      vrata.dobavi(operatsiya({ opId: 'op-3', sashtnost: { vid: 'naem', id: '' } })),
    ).rejects.toMatchObject({ kod: 'NEVALIDNO' });
  });
});
