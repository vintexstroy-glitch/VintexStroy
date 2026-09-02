/**
 * РЕЗЕН 1 · един имот → един наем → едно плащане, от край до край.
 *
 * Условието за готовност от ADR-001: работеща функция + тест + сверка вход↔изход.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikNaSverki,
  DnevnikVPametta,
  proveriVerigata,
  tsentove,
  sverka,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { duljimo, fold, sabrano } from '../src/ogledalo/ogledalo.js';
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
  return { dnevnik, vrata, deystviya };
}

const IMOT = {
  adres: 'Лозенец · ул. Кръстьо Сарафов',
  edinitsa: 'ап. 3',
  ploshtad_kvsm: 72_4000,
};

const NAEM = {
  imotId: 'I-1',
  naemetel: 'Стройпласт ЕООД',
  naem_st: tsentove(1150_00),
  padezhDen: 16,
  ot: '2024-03-01',
  do: '2027-02-28',
  depozit_st: tsentove(1150_00),
  sektor: 'naem-targovski',
};

const VZEMANE = {
  naemId: 'N-1',
  period: '2026-08',
  osnovanie: 'наем',
  suma_st: tsentove(1150_00),
  padezh: '2026-08-16',
};

async function pusniPatya(d: Deystviya) {
  await d.dobaviImot('I-1', IMOT, { opId: 'op-imot' });
  await d.dobaviNaem('N-1', NAEM, { opId: 'op-naem' });
  await d.nachisliVzemane('V-1', VZEMANE, { opId: 'op-vzemane' });
}

describe('резен 1 · от имот до платен наем', () => {
  it('минава целия път и Огледалото показва затворено вземане', async () => {
    const { dnevnik, deystviya } = stend();

    await pusniPatya(deystviya);

    // Преди плащането: дължи се целият наем.
    let ogledalo = await deystviya.ogledalo();
    expect(ogledalo.imoti.get('I-1')?.adres).toBe(IMOT.adres);
    expect(ogledalo.naemi.get('N-1')?.naemetel).toBe('Стройпласт ЕООД');
    expect(ogledalo.vzemaniya.get('V-1')?.sastoyanie).toBe('отворено');
    expect(duljimo(ogledalo)).toBe(1150_00);

    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(1150_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-plashtane' },
    );

    ogledalo = await deystviya.ogledalo();
    const vzemane = ogledalo.vzemaniya.get('V-1');
    expect(vzemane?.pogaseno_st).toBe(1150_00);
    expect(vzemane?.ostatak_st).toBe(0);
    expect(vzemane?.sastoyanie).toBe('затворено');
    expect(duljimo(ogledalo)).toBe(0);
    expect(sabrano(ogledalo)).toBe(1150_00);

    // Веригата остава цяла през целия път.
    expect((await proveriVerigata(await dnevnik.chetiVsichki(NAEMATEL), SHA)).tsyala).toBe(true);
  });

  it('частично плащане оставя точния остатък', async () => {
    const { deystviya } = stend();
    await pusniPatya(deystviya);

    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(400_00), nachin: 'в брой', data: '2026-08-20' },
      { opId: 'op-1' },
    );
    await deystviya.priemiPlashtane(
      'P-2',
      { vzemaneId: 'V-1', suma_st: tsentove(300_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-2' },
    );

    const vzemane = (await deystviya.ogledalo()).vzemaniya.get('V-1');
    expect(vzemane?.pogaseno_st).toBe(700_00);
    expect(vzemane?.ostatak_st).toBe(450_00);
    expect(vzemane?.sastoyanie).toBe('частично');
  });

  it('сторното връща състоянието ЕДНО КЪМ ЕДНО, без да трие нищо', async () => {
    const { dnevnik, deystviya } = stend();
    await pusniPatya(deystviya);

    const predi = await deystviya.ogledalo();

    const plashtane = await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(1150_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-plashtane' },
    );
    expect(duljimo(await deystviya.ogledalo())).toBe(0);

    await deystviya.storniraj(
      'S-1',
      { pogasyavaSeq: plashtane.seq, prichina: 'сгрешен наемател' },
      { opId: 'op-storno' },
    );

    const sled = await deystviya.ogledalo();
    expect(duljimo(sled)).toBe(duljimo(predi));
    expect(sled.vzemaniya.get('V-1')?.sastoyanie).toBe('отворено');
    expect(sled.vzemaniya.get('V-1')?.pogaseno_st).toBe(0);
    expect(sabrano(sled)).toBe(0);

    // Нищо не е изтрито: и плащането, и сторното са завинаги в Журнала.
    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    expect(vsichki).toHaveLength(5);
    expect(vsichki.map((s) => s.type)).toContain('ПлащанеПрието');
    expect(vsichki.map((s) => s.type)).toContain('Сторно');
    expect((await proveriVerigata(vsichki, SHA)).tsyala).toBe(true);
  });

  it('повторено плащане със същия opId не удвоява погасяването', async () => {
    const { dnevnik, deystviya } = stend();
    await pusniPatya(deystviya);

    const danni = {
      vzemaneId: 'V-1',
      suma_st: tsentove(1150_00),
      nachin: 'банка' as const,
      data: '2026-08-22',
    };
    await deystviya.priemiPlashtane('P-1', danni, { opId: 'op-edno' });
    await deystviya.priemiPlashtane('P-1', danni, { opId: 'op-edno' });
    await deystviya.priemiPlashtane('P-1', danni, { opId: 'op-edno' });

    const vzemane = (await deystviya.ogledalo()).vzemaniya.get('V-1');
    expect(vzemane?.pogaseno_st).toBe(1150_00);
    expect(vzemane?.sastoyanie).toBe('затворено');
    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(4);
  });

  it('Огледалото е производно: два независими fold-а дават едно и също', async () => {
    const { dnevnik, deystviya } = stend();
    await pusniPatya(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(600_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-1' },
    );

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    const a = fold(sabitiya);
    const b = fold(sabitiya);

    expect(duljimo(a)).toBe(duljimo(b));
    expect([...a.vzemaniya.values()]).toEqual([...b.vzemaniya.values()]);
  });

  it('парите затварят: начислено = погасено + остатък', async () => {
    const { deystviya } = stend();
    await pusniPatya(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(333_33), nachin: 'банка', data: '2026-08-20' },
      { opId: 'op-1' },
    );
    await deystviya.priemiPlashtane(
      'P-2',
      { vzemaneId: 'V-1', suma_st: tsentove(666_67), nachin: 'банка', data: '2026-08-21' },
      { opId: 'op-2' },
    );

    const v = (await deystviya.ogledalo()).vzemaniya.get('V-1')!;
    expect(v.pogaseno_st + v.ostatak_st).toBe(v.nachisleno_st);
    expect(v.pogaseno_st).toBe(1000_00);
    expect(v.ostatak_st).toBe(150_00);
  });

  it('резенът завършва със сверка вход↔изход — и тя затваря', async () => {
    const { dnevnik, deystviya } = stend();
    const sverki = new DnevnikNaSverki();

    await pusniPatya(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V-1', suma_st: tsentove(1150_00), nachin: 'банка', data: '2026-08-22' },
      { opId: 'op-plashtane' },
    );

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    const ogledalo = fold(sabitiya);

    const podadeni = 4;
    sverki.zapishiIliPadni(sverka('резен 1 · събития', podadeni, sabitiya.length, KOGATO));
    sverki.zapishiIliPadni(
      sverka('резен 1 · приложени в Огледалото', sabitiya.length, ogledalo.prilozheni, KOGATO),
    );
    sverki.zapishiIliPadni(
      sverka('резен 1 · пари', VZEMANE.suma_st, sabrano(ogledalo) + duljimo(ogledalo), KOGATO),
    );

    expect(sverki.vsichki).toHaveLength(3);
    expect(sverki.nezatvoreni).toHaveLength(0);
    expect(sverki.vsichki.every((s) => s.razlika === 0)).toBe(true);
  });

  it('Вратата отказва наем с дробни центове, преди да стигне до Журнала', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot('I-1', IMOT, { opId: 'op-imot' });

    await expect(
      deystviya.dobaviNaem(
        'N-1',
        { ...NAEM, naem_st: 1150.5 as never },
        { opId: 'op-losh-naem' },
      ),
    ).rejects.toMatchObject({ kod: 'NEVALIDNO' });

    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(1);
  });
});
