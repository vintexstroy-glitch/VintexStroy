/**
 * МЕСЕЧНОТО НАЧИСЛЯВАНЕ · партида със сверка.
 *
 * Най-важният тест тук е вторият: натиснато два пъти, начислява веднъж.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  stotinki,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  dniVMeseca,
  GreshkaNachislyavane,
  nachisliZaPeriod,
  padezhZaPerioda,
  seNachislyava,
  zaNachislyavane,
} from '../src/domein/nachislyavane.js';
import { duljimo, duljimoPoNaem, prosrocheni } from '../src/ogledalo/ogledalo.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

interface OpisNaem {
  id: string;
  naem_st: number;
  padezhDen?: number;
  ot?: string;
  do?: string;
}

async function nasadi(d: Deystviya, naemi: readonly OpisNaem[]) {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  for (const n of naemi) {
    await d.dobaviNaem(
      n.id,
      {
        imotId: 'I-1',
        naemetel: `наемател ${n.id}`,
        naem_st: stotinki(n.naem_st),
        padezhDen: n.padezhDen ?? 5,
        ot: n.ot ?? '2024-01-01',
        do: n.do ?? '',
        depozit_st: 0,
        sektor: 'naem-zhilishten',
      },
      { opId: `op-${n.id}` },
    );
  }
}

describe('кой наем се начислява', () => {
  const naem = {
    id: 'N-1', seq: 2, imotId: 'I-1', naemetel: 'X', naem_st: 100_00, padezhDen: 5,
    ot: '2024-03-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten', prekraten: false,
  };

  it('жив наем с отворен договор — да', () => {
    expect(seNachislyava(naem, '2026-08')).toBe(true);
  });

  it('прекратен наем — не', () => {
    expect(seNachislyava({ ...naem, prekraten: true }, '2026-08')).toBe(false);
  });

  it('договор, който още не е започнал — не', () => {
    expect(seNachislyava({ ...naem, ot: '2026-09-01' }, '2026-08')).toBe(false);
  });

  it('договор, който вече е свършил — не', () => {
    expect(seNachislyava({ ...naem, do: '2026-07-31' }, '2026-08')).toBe(false);
  });

  it('месецът на започване и месецът на изтичане се начисляват', () => {
    expect(seNachislyava({ ...naem, ot: '2026-08-20' }, '2026-08')).toBe(true);
    expect(seNachislyava({ ...naem, do: '2026-08-03' }, '2026-08')).toBe(true);
  });
});

describe('падежът', () => {
  const naem = {
    id: 'N-1', seq: 2, imotId: 'I-1', naemetel: 'X', naem_st: 100_00, padezhDen: 16,
    ot: '2024-01-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten', prekraten: false,
  };

  it('пада на посочения ден от периода', () => {
    expect(padezhZaPerioda(naem, '2026-08')).toBe('2026-08-16');
  });

  it('не излиза извън месеца', () => {
    expect(padezhZaPerioda({ ...naem, padezhDen: 31 }, '2026-02')).toBe('2026-02-28');
    expect(padezhZaPerioda({ ...naem, padezhDen: 31 }, '2024-02')).toBe('2024-02-29');
    expect(padezhZaPerioda({ ...naem, padezhDen: 31 }, '2026-04')).toBe('2026-04-30');
  });

  it('февруари знае за високосните години', () => {
    expect(dniVMeseca(2026, 2)).toBe(28);
    expect(dniVMeseca(2024, 2)).toBe(29);
  });
});

describe('начисляване за период', () => {
  it('прави по едно вземане на жив наем и сверката затваря', async () => {
    const { dnevnik, deystviya } = stend();
    await nasadi(deystviya, [
      { id: 'N-1', naem_st: 1150_00 },
      { id: 'N-2', naem_st: 640_00 },
      { id: 'N-3', naem_st: 2300_00 },
    ]);

    const r = await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    expect(r.nachisleni).toBe(3);
    expect(r.veche).toBe(0);
    expect(r.nared).toBe(true);
    expect(r.sverki).toHaveLength(2);
    expect(r.sverki.every((s) => s.razlika === 0)).toBe(true);

    const o = await deystviya.ogledalo();
    expect(o.vzemaniya.size).toBe(3);
    expect(duljimo(o)).toBe(1150_00 + 640_00 + 2300_00);
    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(1 + 3 + 3);
  });

  it('НАТИСНАТО ДВА ПЪТИ, начислява веднъж', async () => {
    const { dnevnik, deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00 }, { id: 'N-2', naem_st: 640_00 }]);

    const parvo = await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });
    const broiSled = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    const vtoro = await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    expect(parvo.nachisleni).toBe(2);
    expect(vtoro.nachisleni).toBe(0);
    expect(vtoro.veche).toBe(2);
    expect(vtoro.nared).toBe(true);
    expect((await deystviya.ogledalo()).vzemaniya.size).toBe(2);
    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(broiSled);
  });

  it('различните периоди са различни вземания', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00 }]);

    await nachisliZaPeriod({ deystviya, period: '2026-07', kogato: KOGATO });
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    const o = await deystviya.ogledalo();
    expect(o.vzemaniya.size).toBe(2);
    expect(duljimo(o)).toBe(2300_00);
  });

  it('прекратеният наем не се начислява', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00 }, { id: 'N-2', naem_st: 640_00 }]);
    await deystviya.prekratiNaem(
      { naemId: 'N-2', kraj: '2026-07-31', prichina: 'изтекъл договор' },
      { opId: 'op-prekratyavane' },
    );

    const r = await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    expect(r.nachisleni).toBe(1);
    expect((await deystviya.ogledalo()).vzemaniya.size).toBe(1);
  });

  it('отказва безсмислен период, без да пипне Журнала', async () => {
    const { dnevnik, deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00 }]);
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    for (const losh of ['август', '2026-13', '2026', '26-08']) {
      await expect(
        nachisliZaPeriod({ deystviya, period: losh, kogato: KOGATO }),
      ).rejects.toBeInstanceOf(GreshkaNachislyavane);
    }

    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(predi);
  });

  it('без живи наеми начислява нула и сверката пак затваря', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, []);

    const r = await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    expect(r.nachisleni).toBe(0);
    expect(r.nared).toBe(true);
    expect(r.sverki.every((s) => s.razlika === 0)).toBe(true);
  });
});

describe('изведените изгледи', () => {
  it('просрочените са подредени, най-закъснелите отгоре', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [
      { id: 'N-1', naem_st: 1150_00, padezhDen: 5 },
      { id: 'N-2', naem_st: 640_00, padezhDen: 20 },
    ]);
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    const spisak = prosrocheni(await deystviya.ogledalo(), '2026-08-22');

    expect(spisak).toHaveLength(2);
    expect(spisak[0]!.naemId).toBe('N-1');
    expect(spisak[0]!.dniZakasnenie).toBe(17);
    expect(spisak[1]!.dniZakasnenie).toBe(2);
  });

  it('платеното изпада от просрочените', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00, padezhDen: 5 }]);
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V:2026-08:N-1', suma_st: stotinki(1150_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-plashtane' },
    );

    expect(prosrocheni(await deystviya.ogledalo(), '2026-08-22')).toHaveLength(0);
  });

  it('частично платеното си остава просрочено, с точен остатък', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00, padezhDen: 5 }]);
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V:2026-08:N-1', suma_st: stotinki(400_00), nachin: 'в брой', data: '2026-08-20' },
      { opId: 'op-1' },
    );

    const o = await deystviya.ogledalo();
    const spisak = prosrocheni(o, '2026-08-22');
    expect(spisak).toHaveLength(1);
    expect(spisak[0]!.ostatak_st).toBe(750_00);
    expect(duljimoPoNaem(o).get('N-1')).toBe(750_00);
  });

  it('вземане с падеж днес още не е просрочено', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1150_00, padezhDen: 22 }]);
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    expect(prosrocheni(await deystviya.ogledalo(), '2026-08-22')).toHaveLength(0);
    expect(prosrocheni(await deystviya.ogledalo(), '2026-08-23')).toHaveLength(1);
  });

  it('дължимото по наеми събира няколко периода', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [{ id: 'N-1', naem_st: 1000_00 }, { id: 'N-2', naem_st: 500_00 }]);
    await nachisliZaPeriod({ deystviya, period: '2026-07', kogato: KOGATO });
    await nachisliZaPeriod({ deystviya, period: '2026-08', kogato: KOGATO });

    const karta = duljimoPoNaem(await deystviya.ogledalo());
    expect(karta.get('N-1')).toBe(2000_00);
    expect(karta.get('N-2')).toBe(1000_00);
  });

  it('за начисляване се взимат само живите, подредени', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya, [
      { id: 'N-3', naem_st: 100_00 },
      { id: 'N-1', naem_st: 100_00 },
      { id: 'N-2', naem_st: 100_00, ot: '2026-09-01' },
    ]);

    const spisak = zaNachislyavane(await deystviya.ogledalo(), '2026-08');
    expect(spisak.map((n) => n.id)).toEqual(['N-1', 'N-3']);
  });
});
