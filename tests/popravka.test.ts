/**
 * ПОПРАВКАТА · прекратяване, поправка на описание, сторно с вратар.
 *
 * Двете неща, които се пазят тук:
 *   1. Журналът не се пипа — всяка поправка е НОВО събитие.
 *   2. Сторното не оставя дупка — вратарят отказва, докато нещо живо виси.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { VID } from '../src/domein/sabitiya.js';
import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { duljimo } from '../src/ogledalo/ogledalo.js';
import { smetki } from '../src/domein/smetki.js';
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
  const vsichki = () => dnevnik.chetiVsichki(NAEMATEL);
  return { dnevnik, deystviya, vsichki };
}

const IMOT = { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 724_000 };
const NAEM = {
  imotId: 'I-1',
  naemetel: 'Стройпласт ЕООД',
  naem_st: stotinki(1200_00),
  padezhDen: 5,
  ot: '2026-01-01',
  do: '',
  depozit_st: 0,
  sektor: 'naem-targovski',
};

async function nasadi(d: Deystviya) {
  await d.dobaviImot('I-1', IMOT, { opId: 'op-imot' });
  await d.dobaviNaem('N-1', NAEM, { opId: 'op-naem' });
}

describe('прекратяване на наем', () => {
  it('спира начисляването за следващия месец, но не пипа начисленото', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });

    await d.prekratiNaem(
      { naemId: 'N-1', kraj: '2026-02-28', prichina: 'изнесоха се' },
      { opId: 'op-prekrati' },
    );

    const o = await d.ogledalo();
    expect(o.naemi.get('N-1')!.prekraten).toBe(true);
    expect(o.naemi.get('N-1')!.kraj).toBe('2026-02-28');
    // Начисленото стои — то е отделно събитие и си остава дължимо.
    expect(duljimo(o)).toBe(1200_00);

    const mart = await nachisliZaPeriod({ deystviya: d, period: '2026-03', kogato: KOGATO });
    expect(mart.nachisleni).toBe(0);
    expect((await d.ogledalo()).vzemaniya.size).toBe(1);
  });
});

describe('поправка на описание', () => {
  it('сменя адреса, без да къса наемите, и оставя двете събития в Журнала', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);

    await d.popraviImot(
      { imotId: 'I-1', adres: 'Малинова 12', edinitsa: 'АП. № 1А', ploshtad_kvsm: 800_000, prichina: 'сбъркан номер' },
      { opId: 'op-popravka' },
    );

    const o = await d.ogledalo();
    expect(o.imoti.get('I-1')!.adres).toBe('Малинова 12');
    expect(o.imoti.get('I-1')!.edinitsa).toBe('АП. № 1А');
    expect(o.imoti.size).toBe(1);
    // Наемът още сочи същия имот — id-то не се е сменило.
    expect(o.naemi.get('N-1')!.imotId).toBe('I-1');

    const zhurnal = await vsichki();
    expect(zhurnal.map((s) => s.type)).toEqual(['ИмотДобавен', 'НаемДобавен', 'ИмотПоправен']);
    expect((zhurnal[0]!.payload as { adres: string }).adres).toBe('Малинова');
  });

  it('новата сума важи за напред — вече начисленото не мърда', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });

    await d.popraviNaem(
      { ...NAEM, naemId: 'N-1', naem_st: 1500_00, prichina: 'вдигнат наем' },
      { opId: 'op-popravi-naem' },
    );
    await nachisliZaPeriod({ deystviya: d, period: '2026-03', kogato: KOGATO });

    const o = await d.ogledalo();
    expect(o.vzemaniya.get('V:2026-02:N-1')!.nachisleno_st).toBe(1200_00);
    expect(o.vzemaniya.get('V:2026-03:N-1')!.nachisleno_st).toBe(1500_00);
  });

  it('смяната на сектора мени акумулатора за напред', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await d.popraviNaem(
      { ...NAEM, naemId: 'N-1', sektor: 'naem-zhilishten', prichina: 'жилищен е' },
      { opId: 'op-sektor' },
    );
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });

    const s = smetki(await d.ogledalo(), '2026-02', KOGATO);
    expect(s.dds).toHaveLength(1);
    expect(s.dds[0]!.akumulator.klyuch).toBe('naem-zhilishten');
    expect(s.zaVnasyane_st).toBe(0);
  });

  it('не съживява прекратен наем', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await d.prekratiNaem({ naemId: 'N-1', kraj: '2026-02-28', prichina: '' }, { opId: 'op-p' });
    await d.popraviNaem(
      { ...NAEM, naemId: 'N-1', naemetel: 'ново име', prichina: 'печатна грешка' },
      { opId: 'op-pop' },
    );

    const naem = (await d.ogledalo()).naemi.get('N-1')!;
    expect(naem.naemetel).toBe('ново име');
    expect(naem.prekraten).toBe(true);
  });

  it('поправка на несъществуващ имот не създава имот от нищото', async () => {
    const { deystviya: d } = stend();
    await d.popraviImot(
      { imotId: 'НЯМА', adres: 'а', edinitsa: 'б', ploshtad_kvsm: 0, prichina: '' },
      { opId: 'op-nishto' },
    );
    expect((await d.ogledalo()).imoti.size).toBe(0);
  });
});

describe('вратарят на сторното', () => {
  it('отказва вземане, по което има прието плащане', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });
    await d.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V:2026-02:N-1', suma_st: stotinki(600_00), nachin: 'в брой', data: '2026-02-10' },
      { opId: 'op-pl' },
    );

    const zhurnal = await vsichki();
    const o = await d.ogledalo();
    const vzemaneSeq = zhurnal.find((s) => s.type === 'ВземанеНачислено')!.seq;

    const otgovor = mozheLiDaSeStornira(zhurnal, o, vzemaneSeq);
    expect(otgovor.mozhe).toBe(false);
    expect(otgovor.prichina).toContain('прието плащане');

    // Махаме плащането — тогава вземането се пуска.
    const plashtaneSeq = o.plashtaniya.get('P-1')!.seq;
    await d.storniraj('S-1', { pogasyavaSeq: plashtaneSeq, prichina: 'грешка' }, { opId: 'op-s1' });

    const sled = mozheLiDaSeStornira(await vsichki(), await d.ogledalo(), vzemaneSeq);
    expect(sled.mozhe).toBe(true);
  });

  it('отказва наем с начислени вземания и имот с наеми', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });

    const zhurnal = await vsichki();
    const o = await d.ogledalo();
    const naemSeq = zhurnal.find((s) => s.type === 'НаемДобавен')!.seq;
    const imotSeq = zhurnal.find((s) => s.type === 'ИмотДобавен')!.seq;

    expect(mozheLiDaSeStornira(zhurnal, o, naemSeq).prichina).toContain('начислено вземане');
    expect(mozheLiDaSeStornira(zhurnal, o, imotSeq).prichina).toContain('наем');
  });

  it('прекратеният наем също държи имота — вземанията му остават дължими', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await d.prekratiNaem({ naemId: 'N-1', kraj: '2026-02-28', prichina: '' }, { opId: 'op-p' });

    const zhurnal = await vsichki();
    const imotSeq = zhurnal.find((s) => s.type === 'ИмотДобавен')!.seq;
    expect(mozheLiDaSeStornira(zhurnal, await d.ogledalo(), imotSeq).mozhe).toBe(false);
  });

  it('отказва сторно на сторно, вече сторнирано и несъществуващ seq', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });
    await d.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V:2026-02:N-1', suma_st: stotinki(600_00), nachin: 'в брой', data: '2026-02-10' },
      { opId: 'op-pl' },
    );
    const plashtaneSeq = (await d.ogledalo()).plashtaniya.get('P-1')!.seq;
    await d.storniraj('S-1', { pogasyavaSeq: plashtaneSeq, prichina: 'грешка' }, { opId: 'op-s1' });

    const zhurnal = await vsichki();
    const o = await d.ogledalo();
    const stornoSeq = zhurnal.find((s) => s.type === 'Сторно')!.seq;

    expect(mozheLiDaSeStornira(zhurnal, o, stornoSeq).prichina).toContain('Сторно не се сторнира');
    expect(mozheLiDaSeStornira(zhurnal, o, plashtaneSeq).prichina).toContain('вече е сторнирано');
    expect(mozheLiDaSeStornira(zhurnal, o, 9999).prichina).toContain('Няма събитие');
  });

  it('сторнирано вземане пада от дължимото и от ДДС-реда', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: KOGATO });
    const vzemaneSeq = (await vsichki()).find((s) => s.type === 'ВземанеНачислено')!.seq;

    await d.storniraj(
      'S-V',
      { pogasyavaSeq: vzemaneSeq, prichina: 'начислено по грешка' },
      { opId: 'op-sv' },
      VID.vzemane,
    );

    const o = await d.ogledalo();
    expect(duljimo(o)).toBe(0);
    expect(smetki(o, '2026-02', KOGATO).zaVnasyane_st).toBe(0);
    // Журналът пази и двете — нищо не е изтрито.
    expect((await vsichki()).map((s) => s.type)).toContain('Сторно');
    expect((await vsichki())).toHaveLength(4);
  });

  it('сторно на прекратяването съживява наема', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await d.prekratiNaem({ naemId: 'N-1', kraj: '2026-02-28', prichina: 'грешка' }, { opId: 'op-p' });
    const prekratSeq = (await vsichki()).find((s) => s.type === 'НаемПрекратен')!.seq;

    await d.storniraj(
      'S-P',
      { pogasyavaSeq: prekratSeq, prichina: 'не се изнесоха' },
      { opId: 'op-sp' },
      VID.naem,
    );

    expect((await d.ogledalo()).naemi.get('N-1')!.prekraten).toBe(false);
  });
});
