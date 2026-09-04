/**
 * ВРЪЗКАТА ОТ ПАРИТЕ КЪМ ПРЕПИСКАТА · `prepId` (М12 · р69·[48] · резен 89).
 *
 * „Да — нова колона prepId (връзка към преписка в Регистъра), prep остава
 * разчетът-число" — колоната е ПО ИЗБОР, но записана веднъж, трябва да сочи
 * жива преписка: Журналът е само за добавяне (правило 1) и счупена връзка
 * би висяла в него завинаги. Затова проверката е при ВХОДА, не при четенето.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
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

async function nasadiPrepiska(d: Deystviya, id = 'PR-1') {
  await d.zapishiPrepiska(
    id,
    { kontakt: 'Иван Петров', kakvo: 'договор', zaVzimane: '', chas: '', otgovornik: '', otsenka: 'нито-едно', zakachenaKam: '', zakachenaId: '', sastoyanie: 'чака' },
    { opId: `op-${id}` },
  );
}

function razhod(chast: Partial<Parameters<Deystviya['zapishiRazhod']>[1]> = {}) {
  return {
    potok: 'fakturi',
    dostavchik: 'Материали ООД',
    opis: 'цимент',
    suma_st: tsentove(600_00),
    sektor: 'pokupki-materiali',
    nachin: 'банка' as const,
    data: '2026-02-14',
    dokument: '1042',
    ...chast,
  };
}

/** Наем → начисление, за да има вземане с известен адрес `V:2026-08:N-1`. */
async function nasadiVzemane(d: Deystviya) {
  await d.dobaviImot('I-1', { adres: 'Дианабад', edinitsa: 'ОФИС № 3', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Стройпласт ЕООД',
      naem_st: tsentove(1200_00),
      padezhDen: 5,
      ot: '2026-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-naem' },
  );
  await nachisliZaPeriod({ deystviya: d, period: '2026-08', kogato: KOGATO });
}

describe('prepId при разхода', () => {
  it('жива преписка минава и Огледалото я връща на записа', async () => {
    const { deystviya: d } = stend();
    await nasadiPrepiska(d);
    await d.zapishiRazhod('R-1', razhod({ prepId: 'PR-1' }), { opId: 'op-r1' });

    const o = await d.ogledalo();
    expect(o.razhodi.get('R-1')!.prepId).toBe('PR-1');
  });

  it('счупен prepId се отказва С ДУМИ и нищо не влиза в Журнала', async () => {
    const { dnevnik, deystviya: d } = stend();
    await nasadiPrepiska(d);
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    await expect(
      d.zapishiRazhod('R-1', razhod({ prepId: 'PR-NYAMA' }), { opId: 'op-r1' }),
    ).rejects.toThrow(/Преписка „PR-NYAMA" няма/);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
  });

  it('без prepId — както преди: полето ЛИПСВА, не стои празно', async () => {
    const { deystviya: d } = stend();
    await d.zapishiRazhod('R-1', razhod(), { opId: 'op-r1' });

    const r = (await d.ogledalo()).razhodi.get('R-1')!;
    expect('prepId' in r).toBe(false);
  });
});

describe('prepId при плащането', () => {
  it('двете страни на парите носят една и съща връзка', async () => {
    const { deystviya: d } = stend();
    await nasadiPrepiska(d);
    await nasadiVzemane(d);
    await d.priemiPlashtane(
      'P-1',
      { vzemaneId: 'V:2026-08:N-1', suma_st: tsentove(500_00), nachin: 'банка', data: '2026-08-10', prepId: 'PR-1' },
      { opId: 'op-p1' },
    );

    expect((await d.ogledalo()).plashtaniya.get('P-1')!.prepId).toBe('PR-1');
  });

  it('и тук счупената връзка се спира при входа', async () => {
    const { deystviya: d } = stend();
    await nasadiVzemane(d);
    await expect(
      d.priemiPlashtane(
        'P-1',
        { vzemaneId: 'V:2026-08:N-1', suma_st: tsentove(500_00), nachin: 'банка', data: '2026-08-10', prepId: 'PR-NYAMA' },
        { opId: 'op-p1' },
      ),
    ).rejects.toThrow(/сочила в нищото/);
  });
});
