/**
 * СЕДЕМТЕ ИЗТОЧНИКА · редовете, които темата „Пари" добавя (резен 115 · ADR-161).
 *
 * Всяко число тук се проверява с НЕЗАВИСИМ ВТОРИ ПЪТ (умението `matematika`):
 * веднъж от `sumiPoRazbivki`, веднъж сметнато на ръка от онова, което е
 * записано през Вратата. Сбор, който отговаря само на себе си, не доказва нищо.
 *
 * И най-важното, което тестът пази: **това НЕ е разрез.** Наеми Кеш и Наеми
 * Банка заедно дават общия приход от наеми, но Активни Продажби стои ИЗВЪН
 * него — тестът го заковава, за да не почне някой да ги събира.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { sumiZaObhvat } from '../src/domein/otcheti.js';
import {
  RAZBIVKITE,
  eRazbivka,
  razbivka,
  sumiPoRazbivki,
} from '../src/domein/razbivki.js';
import type { NachinNaPlashtane } from '../src/domein/sabitiya.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const OT = '2026-08-01';
const DO = '2026-08-31';
const VSICHKI = RAZBIVKITE.map((i) => i.klyuch);

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

/** Сборът на един източник за целия обхват · сметнат на ръка от върнатите дни. */
function sbor(redove: readonly { razrez: string; prihod_st: number; razhod_st: number }[], klyuch: string): number {
  return redove
    .filter((r) => r.razrez === klyuch)
    .reduce((s, r) => s + r.prihod_st + r.razhod_st, 0);
}

/** Един обект, един наем, начислено за август · после плащанията се приемат. */
async function sNaem(d: Deystviya): Promise<string> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: 'op-i' });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Стройпласт ЕООД',
      naem_st: tsentove(1_000_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-n' },
  );
  await nachisliZaPeriod({ deystviya: d, period: '2026-08', kogato: '2026-08-01T09:00:00.000Z' });
  const o = await d.ogledalo();
  const vzemane = [...o.vzemaniya.values()][0];
  if (!vzemane) throw new Error('Начисляването не роди вземане — тестът стъпва накриво.');
  return vzemane.id;
}

async function sRazhod(
  d: Deystviya,
  id: string,
  potok: string,
  nachin: NachinNaPlashtane,
  suma: number,
  data = '2026-08-10',
): Promise<void> {
  await d.zapishiRazhod(
    id,
    {
      potok,
      dostavchik: 'Доставчик ООД',
      opis: 'проба',
      suma_st: tsentove(suma),
      sektor: potok === 'zaplati' ? 'zaplati' : 'stroitelstvo',
      nachin,
      data,
      dokument: '',
      stavka: 0,
    },
    { opId: `op-${id}` },
  );
}

describe('седемте източника · списъкът е ПИН С РЪКА', () => {
  it('са точно седем, в неговия ред и с неговите имена', () => {
    expect(RAZBIVKITE.map((i) => i.ime)).toEqual([
      'Наеми Кеш',
      'Наеми Банка',
      'Активни Продажби',
      'Кредити',
      'Заплати',
      'Фактури Банка',
      'Фактури Кеш',
    ]);
  });

  it('три са приход, четири са разход · и всеки казва откъде идва', () => {
    expect(RAZBIVKITE.filter((i) => i.posoka === 'приход')).toHaveLength(3);
    expect(RAZBIVKITE.filter((i) => i.posoka === 'разход')).toHaveLength(4);
    expect(RAZBIVKITE.every((i) => i.otkade.length > 10)).toBe(true);
  });

  it('САМО Активни Продажби стои извън общата обиколка · това е причината да не са разрез', () => {
    expect(RAZBIVKITE.filter((i) => !i.vObshtiya).map((i) => i.klyuch)).toEqual([
      'aktivni-prodazhbi',
    ]);
  });

  it('непознат ключ не е източник и не връща ред', () => {
    expect(eRazbivka('naemi-kesh')).toBe(true);
    expect(eRazbivka('naemi')).toBe(false);
    expect(razbivka('naemi')).toBeUndefined();
  });
});

describe('наемите се делят на КЕШ и БАНКА · картата е банкови пари', () => {
  it('в брой отива в Кеш, банка и карта — в Банка, а сборът им е общият приход', async () => {
    const { deystviya } = stend();
    const vzemaneId = await sNaem(deystviya);
    for (const [id, nachin, suma] of [
      ['P-1', 'в брой', 300_00],
      ['P-2', 'банка', 500_00],
      ['P-3', 'карта', 200_00],
    ] as const) {
      await deystviya.priemiPlashtane(
        id,
        { vzemaneId, suma_st: tsentove(suma), nachin, data: '2026-08-15' },
        { opId: `op-${id}` },
      );
    }

    const o = await deystviya.ogledalo();
    const redove = sumiPoRazbivki(o, OT, DO, VSICHKI);
    expect(sbor(redove, 'naemi-kesh')).toBe(300_00);
    expect(sbor(redove, 'naemi-banka')).toBe(700_00);

    // НЕЗАВИСИМИЯТ ВТОРИ ПЪТ · двата реда заедно = приходът на общата обиколка.
    const obshto = sumiZaObhvat(o, OT, DO).reduce((s, d) => s + d.prihod_st, 0);
    expect(sbor(redove, 'naemi-kesh') + sbor(redove, 'naemi-banka')).toBe(obshto);
  });

  it('неизбраният източник не ражда нито един ред', async () => {
    const { deystviya } = stend();
    const vzemaneId = await sNaem(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: tsentove(300_00), nachin: 'в брой', data: '2026-08-15' },
      { opId: 'op-p1' },
    );
    const o = await deystviya.ogledalo();
    expect(sumiPoRazbivki(o, OT, DO, ['naemi-banka'])).toHaveLength(0);
    expect(sumiPoRazbivki(o, OT, DO, [])).toHaveLength(0);
  });
});

describe('разходите се делят по ПОТОК, а Фактурите — и по начин', () => {
  it('кредити · заплати · фактури банка · фактури кеш стоят на четири различни реда', async () => {
    const { deystviya } = stend();
    await sRazhod(deystviya, 'R-1', 'krediti', 'банка', 600_00);
    await sRazhod(deystviya, 'R-2', 'zaplati', 'в брой', 800_00);
    await sRazhod(deystviya, 'R-3', 'fakturi', 'банка', 100_00);
    await sRazhod(deystviya, 'R-4', 'fakturi', 'в брой', 50_00);
    await sRazhod(deystviya, 'R-5', 'fakturi', 'карта', 25_00);

    const o = await deystviya.ogledalo();
    const redove = sumiPoRazbivki(o, OT, DO, VSICHKI);
    expect(sbor(redove, 'krediti')).toBe(600_00);
    expect(sbor(redove, 'zaplati')).toBe(800_00);
    // Картата е банкови пари · 100 + 25.
    expect(sbor(redove, 'fakturi-banka')).toBe(125_00);
    expect(sbor(redove, 'fakturi-kesh')).toBe(50_00);

    // НЕЗАВИСИМИЯТ ВТОРИ ПЪТ · четирите заедно = разходът на общата обиколка.
    const obshto = sumiZaObhvat(o, OT, DO).reduce((s, d) => s + d.razhod_st, 0);
    expect(
      sbor(redove, 'krediti') +
        sbor(redove, 'zaplati') +
        sbor(redove, 'fakturi-banka') +
        sbor(redove, 'fakturi-kesh'),
    ).toBe(obshto);
  });

  it('разход извън обхвата не влиза · границите са включителни', async () => {
    const { deystviya } = stend();
    await sRazhod(deystviya, 'R-1', 'zaplati', 'банка', 100_00, '2026-07-31');
    await sRazhod(deystviya, 'R-2', 'zaplati', 'банка', 200_00, '2026-08-01');
    await sRazhod(deystviya, 'R-3', 'zaplati', 'банка', 400_00, '2026-08-31');
    await sRazhod(deystviya, 'R-4', 'zaplati', 'банка', 800_00, '2026-09-01');

    const redove = sumiPoRazbivki(await deystviya.ogledalo(), OT, DO, VSICHKI);
    expect(sbor(redove, 'zaplati')).toBe(600_00);
  });
});

describe('Активни Продажби · вноските по НЕархивирана сделка', () => {
  async function sProdazhba(d: Deystviya, sastoyanie: string, opId = 'op-s'): Promise<void> {
    if (opId === 'op-s') {
      await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'ап. 3', ploshtad_kvsm: 0 }, { opId: 'op-i' });
    }
    await d.zapishiProdazhba(
      {
        prodazhbaId: 'S-1',
        imotId: 'I-1',
        kupuvach: 'Иван Петров',
        telefon: '0888',
        tsena_st: tsentove(100_000_00),
        prodazhba_st: tsentove(95_000_00),
        smr_st: 0,
        pd_st: 0,
        sastoyanie,
        ...(opId === 'op-s' ? {} : { prichina: 'сделката се затваря' }),
      },
      // ПОВТОРНИЯТ `opId` НЕ пише втори път (правило 5) — затова презаписът
      // носи свой ключ. Първата версия на този тест го научи по трудния начин.
      { opId },
    );
  }

  async function sDvizhenie(d: Deystviya, id: string, vid: string, suma: number): Promise<void> {
    await d.zapishiDvizhenieNaProdazhba(
      {
        dvizhenieId: id,
        prodazhbaId: 'S-1',
        vid,
        suma_st: tsentove(suma),
        data: '2026-08-20',
        belezhka: vid === 'вноска' ? '' : 'по договор',
        nachin: 'банка',
      },
      { opId: `op-${id}` },
    );
  }

  it('вноската на текуща сделка влиза, а връщането и неустойката — не', async () => {
    const { deystviya } = stend();
    await sProdazhba(deystviya, 'tekushta');
    await sDvizhenie(deystviya, 'D-1', 'Капаро', 5_000_00);
    await sDvizhenie(deystviya, 'D-2', 'НС', 20_000_00);
    await sDvizhenie(deystviya, 'D-3', 'неустойка', 1_000_00);

    const redove = sumiPoRazbivki(await deystviya.ogledalo(), OT, DO, VSICHKI);
    expect(sbor(redove, 'aktivni-prodazhbi')).toBe(25_000_00);
  });

  it('АРХИВИРАНАТА сделка изпада · „Активни" е дума за състояние, не украса', async () => {
    const { deystviya } = stend();
    await sProdazhba(deystviya, 'tekushta');
    await sDvizhenie(deystviya, 'D-1', 'Капаро', 5_000_00);
    await sProdazhba(deystviya, 'prodadena', 'op-s2');

    const redove = sumiPoRazbivki(await deystviya.ogledalo(), OT, DO, VSICHKI);
    expect(sbor(redove, 'aktivni-prodazhbi')).toBe(0);
  });

  it('и НЕ влиза в общата обиколка · затова седемте не са разрез', async () => {
    const { deystviya } = stend();
    await sProdazhba(deystviya, 'tekushta');
    await sDvizhenie(deystviya, 'D-1', 'Капаро', 5_000_00);

    const o = await deystviya.ogledalo();
    expect(sumiZaObhvat(o, OT, DO).reduce((s, d) => s + d.prihod_st, 0)).toBe(0);
    expect(sbor(sumiPoRazbivki(o, OT, DO, VSICHKI), 'aktivni-prodazhbi')).toBe(5_000_00);
  });
});

describe('редът, който излиза, говори езика на решетката', () => {
  it('носи ключа на източника като разрез и името му като надпис', async () => {
    const { deystviya } = stend();
    await sRazhod(deystviya, 'R-1', 'zaplati', 'банка', 100_00);
    const redove = sumiPoRazbivki(await deystviya.ogledalo(), OT, DO, VSICHKI);
    expect(redove).toHaveLength(1);
    expect(redove[0]!.razrez).toBe('zaplati');
    expect(redove[0]!.nadpis).toBe('Заплати');
    expect(redove[0]!.data).toBe('2026-08-10');
  });

  it('дните излизат подредени · решетката ги чете отляво надясно', async () => {
    const { deystviya } = stend();
    await sRazhod(deystviya, 'R-1', 'zaplati', 'банка', 100_00, '2026-08-20');
    await sRazhod(deystviya, 'R-2', 'krediti', 'банка', 200_00, '2026-08-05');
    const redove = sumiPoRazbivki(await deystviya.ogledalo(), OT, DO, VSICHKI);
    expect(redove.map((r) => r.data)).toEqual(['2026-08-05', '2026-08-20']);
  });
});
