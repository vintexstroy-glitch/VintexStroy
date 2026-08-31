/**
 * РАЗХОДИТЕ · другата страна на ДДС-то.
 *
 * Дотук „за внасяне" беше само изходящият ДДС, защото входящата страна нямаше
 * откъде да дойде. Тук се проверява, че сметката е наистина изход − вход —
 * и че може да излезе отрицателна, тоест за възстановяване.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { VID } from '../src/domein/sabitiya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { POTOTSI, potototsiNaRazhod, razhodiZaPerioda, smetki } from '../src/domein/smetki.js';
import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-02';

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
  return { dnevnik, deystviya, vsichki: () => dnevnik.chetiVsichki(NAEMATEL) };
}

/** Търговски наем 1200,00 → изходящ ДДС 200,00. */
async function nasadiPrihod(d: Deystviya) {
  await d.dobaviImot('I-1', { adres: 'Дианабад', edinitsa: 'ОФИС № 3', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Стройпласт ЕООД',
      naem_st: stotinki(1200_00),
      padezhDen: 5,
      ot: '2026-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-naem' },
  );
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });
}

function razhod(chast: Partial<Parameters<Deystviya['zapishiRazhod']>[1]> = {}) {
  return {
    potok: 'fakturi',
    dostavchik: 'Материали ООД',
    opis: 'цимент',
    suma_st: stotinki(600_00),
    sektor: 'pokupki-materiali',
    nachin: 'банка' as const,
    data: '2026-02-14',
    dokument: '1042',
    ...chast,
  };
}

describe('входящият ДДС', () => {
  it('фактура с 20% пълни страната „вход" и сваля за внасяне', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);

    const predi = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(predi.zaVnasyane_st).toBe(200_00);
    expect(predi.dds_vhod_st).toBe(0);

    await d.zapishiRazhod('R-1', razhod(), { opId: 'op-r1' });

    const s = smetki(await d.ogledalo(), PERIOD, KOGATO);
    const vhod = s.dds.filter((r) => r.strana === 'вход');
    expect(vhod).toHaveLength(1);
    expect(vhod[0]!.akumulator.klyuch).toBe('pokupki-materiali');
    expect(vhod[0]!.osnova_st).toBe(500_00);
    expect(vhod[0]!.dds_st).toBe(100_00);

    expect(s.dds_izhod_st).toBe(200_00);
    expect(s.dds_vhod_st).toBe(100_00);
    expect(s.zaVnasyane_st).toBe(100_00);
    expect(s.razhod_st).toBe(600_00);
    expect(s.nared).toBe(true);
  });

  it('може да излезе отрицателно — за възстановяване', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);
    await d.zapishiRazhod('R-1', razhod({ suma_st: stotinki(3000_00) }), { opId: 'op-r1' });

    const s = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(s.dds_vhod_st).toBe(500_00);
    expect(s.zaVnasyane_st).toBe(-300_00);
  });

  it('заплата и вноска по кредит не носят ДДС, но влизат в разхода', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);
    await d.zapishiRazhod(
      'R-z',
      razhod({ potok: 'zaplati', sektor: 'zaplati', dostavchik: 'екип', opis: 'февруари', suma_st: stotinki(2000_00), dokument: '' }),
      { opId: 'op-rz' },
    );
    await d.zapishiRazhod(
      'R-k',
      razhod({ potok: 'krediti', sektor: 'krediti', dostavchik: 'банка', opis: 'вноска', suma_st: stotinki(800_00), dokument: '' }),
      { opId: 'op-rk' },
    );

    const s = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(s.dds_vhod_st).toBe(0);
    expect(s.zaVnasyane_st).toBe(200_00);
    expect(s.razhod_st).toBe(2800_00);

    const red = (k: string) => s.redove.find((r) => r.klyuch === k)!;
    expect(red('zaplati').suma_st).toBe(2000_00);
    expect(red('krediti').suma_st).toBe(800_00);
    expect(red('fakturi').suma_st).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('разход от друг месец не влиза в периода', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);
    await d.zapishiRazhod('R-1', razhod({ data: '2026-03-02' }), { opId: 'op-r1' });

    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(0);
    expect(smetki(await d.ogledalo(), '2026-03', KOGATO).razhod_st).toBe(600_00);
    expect(razhodiZaPerioda(await d.ogledalo(), '2026-03')).toHaveLength(1);
  });
});

describe('сверката на разхода', () => {
  it('затваря по сума и по брой и се записва дори при нула', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);
    await d.zapishiRazhod('R-1', razhod(), { opId: 'op-r1' });
    await d.zapishiRazhod('R-2', razhod({ sektor: 'pokupki-uslugi', suma_st: stotinki(240_00) }), { opId: 'op-r2' });

    const s = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(s.sverki).toHaveLength(5);
    expect(s.sverki.every((x) => x.nared)).toBe(true);
    expect(s.sverki[2]!.vhod).toBe(840_00);
    expect(s.sverki[3]!.vhod).toBe(2);
  });
});

describe('сторно на разход', () => {
  it('минава винаги — на разхода не виси нищо', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadiPrihod(d);
    await d.zapishiRazhod('R-1', razhod(), { opId: 'op-r1' });

    const o = await d.ogledalo();
    const seq = o.razhodi.get('R-1')!.seq;
    expect(mozheLiDaSeStornira(await vsichki(), o, seq).mozhe).toBe(true);

    await d.storniraj('S-R', { pogasyavaSeq: seq, prichina: 'дублирана фактура' }, { opId: 'op-sr' }, VID.razhod);

    const sled = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(sled.razhod_st).toBe(0);
    expect(sled.dds_vhod_st).toBe(0);
    expect(sled.zaVnasyane_st).toBe(200_00);
    // Журналът пази и двете.
    expect((await vsichki()).filter((x) => x.type === 'Сторно')).toHaveLength(1);
  });
});

describe('таблицата на потоците', () => {
  it('носи СЕДЕМТЕ потока и трите разходни', () => {
    expect(POTOTSI.map((p) => p.klyuch)).toEqual([
      'naemi', 'kesh', 'banka', 'prodazhbi', 'zaplati', 'krediti', 'fakturi',
    ]);
    expect(potototsiNaRazhod().map((p) => p.klyuch)).toEqual(['zaplati', 'krediti', 'fakturi']);
  });

  it('КЕШ и БАНКА не се събират с Наеми — иначе едно и също се брои два пъти', async () => {
    const { deystviya: d } = stend();
    await nasadiPrihod(d);
    await d.priemiPlashtane(
      'P-1',
      { vzemaneId: `V:${PERIOD}:N-1`, suma_st: stotinki(1200_00), nachin: 'банка', data: '2026-02-20' },
      { opId: 'op-p1' },
    );

    const s = smetki(await d.ogledalo(), PERIOD, KOGATO);
    expect(s.prihod_st).toBe(1200_00);
    expect(s.sabrano_st).toBe(1200_00);
    expect(POTOTSI.find((p) => p.klyuch === 'kesh')!.sbira).toBe(false);
  });
});
