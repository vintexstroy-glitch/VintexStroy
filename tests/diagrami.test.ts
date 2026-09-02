/**
 * ДАННИТЕ НА ДИАГРАМИТЕ (И92 т.4) · месечният ход на парите.
 *
 * Диаграмата и календарът (`sumiZaDen`) ядат от едни и същи два извора —
 * плащания и разходи. Тестът пази точно това: числото на стълба е числото
 * на месеца, никъде не се появява нето, и месец без движение СТОИ с нули.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { mesechnitePari } from '../src/domein/diagrami.js';
import { SHA } from './pomoshtni.js';

const KOGATO = '2026-08-22T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { deystviya };
}

async function nasadi(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: 'op-imot' });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Домакинство',
      naem_st: tsentove(500_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-n-1' },
  );
  await nachisliZaPeriod({ deystviya: d, period: '2026-06', kogato: KOGATO });
  await nachisliZaPeriod({ deystviya: d, period: '2026-08', kogato: KOGATO });
}

describe('месечните пари за диаграмата', () => {
  it('всеки месец присъства · плащането е в своя месец, разходът — в своя', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const o1 = await deystviya.ogledalo();
    const vzemaneJuni = [...o1.vzemaniya.values()].find((v) => v.period === '2026-06')!;
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: vzemaneJuni.id, suma_st: tsentove(500_00), nachin: 'банка', data: '2026-06-07' },
      { opId: 'op-p-1' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'fakturi',
        dostavchik: 'ЕВН',
        opis: 'ток',
        suma_st: tsentove(120_00),
        sektor: 'pokupki-uslugi',
        stavka: -1,
        nachin: 'банка',
        data: '2026-08-03',
        dokument: '',
      },
      { opId: 'op-r-1' },
    );

    const m = mesechnitePari(await deystviya.ogledalo(), '2026-08-22', 12);
    expect(m.length).toBe(12);
    expect(m[0]!.mesets).toBe('2025-09');
    expect(m[11]!.mesets).toBe('2026-08');

    const yuni = m.find((x) => x.mesets === '2026-06')!;
    expect(yuni.prihod_st).toBe(500_00);
    expect(yuni.razhod_st).toBe(0);

    const avgust = m.find((x) => x.mesets === '2026-08')!;
    expect(avgust.prihod_st).toBe(0); // начислено ≠ влезли пари
    expect(avgust.razhod_st).toBe(120_00);

    // месец без движение СТОИ, с вярна нула — не изчезва от оста
    const yuli = m.find((x) => x.mesets === '2026-07')!;
    expect(yuli.prihod_st).toBe(0);
    expect(yuli.razhod_st).toBe(0);
  });

  it('обхватът се брои от месеца на „днес" назад, през границата на годината', async () => {
    const { deystviya } = stend();
    const m = mesechnitePari(await deystviya.ogledalo(), '2026-01-15', 3);
    expect(m.map((x) => x.mesets)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('плащане извън обхвата не влиза в нито един стълб', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    const o = await deystviya.ogledalo();
    const vzemane = [...o.vzemaniya.values()][0]!;
    await deystviya.priemiPlashtane(
      'P-star',
      { vzemaneId: vzemane.id, suma_st: tsentove(100_00), nachin: 'в брой', data: '2020-01-01' },
      { opId: 'op-p-star' },
    );
    const m = mesechnitePari(await deystviya.ogledalo(), '2026-08-22', 12);
    expect(m.reduce((s, x) => s + x.prihod_st, 0)).toBe(0);
  });
});
