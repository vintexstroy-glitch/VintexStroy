/**
 * КОЕФИЦИЕНТИТЕ · И96 т.5 · т.6.
 *
 * Пази пет неща, и второто е причината този файл да съществува:
 *   · формулата стои на ЕДИН ред, както той я поиска;
 *   · **приравняването към година има ТРИ отговора**, не две — и отношението
 *     на два потока се ОТКАЗВА, защото вече не зависи от периода;
 *   · делител нула дава ЛИПСА с думи, не нула;
 *   · нито един float — проценти в базисни точки, пъти в стотни;
 *   · месечните се появяват САМО при стъпка месец.
 */

import { IMENA_NA_TAKTOVETE } from '../src/domein/vreme.js';
import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import {
  GreshkaKoefitsient,
  KOEFITSIENTI,
  PRIRAVNYAVANETO,
  VIDOVE,
  danniZaPerioda,
  koefitsient,
  mozheDaSePriravni,
  priravniKamGodina,
  sDumiStoynost,
  smetniKoefitsient,
  zaStapka,
  STAPKI,
  razbiyNaStapki,
  type DanniZaPerioda,
} from '../src/domein/koefitsienti.js';
import { SHA } from './pomoshtni.js';

const OT = '2026-08-01';
const DO = '2026-08-31';
const KOGATO = '2026-08-25T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 25, 9, 0, tik++)).toISOString(),
  });
  return { deystviya };
}

/**
 * Числа, ИЗБРАНИ да се проверяват наум:
 *   начислено 1 000 · събрано 800 · оперативен разход 300 · кредит 200
 *   → NOI 500 · паричен поток 300 · събираемост 80 % · OER 37,5 % · DSCR 2,50×
 */
async function mesetsSChisla(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, {
    opId: 'op-imot',
  });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Наемател',
      naem_st: stotinki(1000_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-naem' },
  );
  await nachisliZaPeriod({ deystviya: d, period: '2026-08', kogato: KOGATO });

  const vzemane = [...(await d.ogledalo()).vzemaniya.values()][0]!;
  await d.priemiPlashtane(
    'P-1',
    { vzemaneId: vzemane.id, suma_st: stotinki(800_00), nachin: 'банка', data: '2026-08-10' },
    { opId: 'op-plashtane' },
  );

  await d.zapishiRazhod(
    'R-op',
    {
      potok: 'fakturi',
      dostavchik: 'Доставчик',
      opis: 'поддръжка',
      suma_st: stotinki(300_00),
      sektor: 'pokupki-uslugi',
      nachin: 'банка',
      data: '2026-08-12',
      dokument: 'Ф-1',
      stavka: 20,
    },
    { opId: 'op-razhod-op' },
  );
  await d.zapishiRazhod(
    'R-kredit',
    {
      potok: 'krediti',
      dostavchik: 'Банка',
      opis: 'вноска',
      suma_st: stotinki(200_00),
      sektor: 'krediti',
      nachin: 'банка',
      data: '2026-08-15',
      dokument: '',
    },
    { opId: 'op-razhod-kredit' },
  );
}

async function danni(): Promise<DanniZaPerioda> {
  const { deystviya } = stend();
  await mesetsSChisla(deystviya);
  return danniZaPerioda(await deystviya.ogledalo(), OT, DO);
}

describe('изборът · най-основните, без бройка', () => {
  it('всеки носи формулата НА ЕДИН РЕД (негово т.5)', () => {
    for (const k of KOEFITSIENTI) {
      expect(k.formula, k.klyuch).not.toBe('');
      expect(k.formula.includes('\n'), `„${k.ime}" носи формула на повече от един ред`).toBe(false);
      expect(k.formula, k.klyuch).toMatch(/=/);
    }
  });

  it('всеки има вид, мярка и изречение какво КАЗВА', () => {
    for (const k of KOEFITSIENTI) {
      expect(VIDOVE, k.klyuch).toContain(k.vid);
      expect(k.kakvo, k.klyuch).not.toBe('');
    }
  });

  it('месечните се появяват САМО при стъпка месец', () => {
    const mesechni = KOEFITSIENTI.filter((k) => k.samoMesechen).map((k) => k.klyuch);
    expect(mesechni).toEqual(['sabiraemost', 'dds-kam-prihod']);
    expect(zaStapka('mesets')).toHaveLength(KOEFITSIENTI.length);
    for (const k of zaStapka('drug')) expect(k.samoMesechen, k.klyuch).toBe(false);
  });

  it('измисленият ключ се отказва С ДУМИ', () => {
    expect(() => koefitsient('nyama-takav')).toThrow(GreshkaKoefitsient);
  });
});

describe('ПРИРАВНЯВАНЕТО · трите отговора, не два', () => {
  it('сума-поток се УМНОЖАВА', () => {
    expect(PRIRAVNYAVANETO['suma-potok']).toBe('mnozhi');
    expect(mozheDaSePriravni(koefitsient('noi'))).toBe(true);
  });

  it('отношение на два ПОТОКА не се приравнява — то вече не зависи от периода', () => {
    expect(PRIRAVNYAVANETO['otnoshenie-potoci']).toBe('nenuzhno');
    expect(mozheDaSePriravni(koefitsient('marzh'))).toBe(false);
  });

  it('отношение на два ЗАПАСА не МОЖЕ да се приравни', () => {
    expect(PRIRAVNYAVANETO['otnoshenie-zapasi']).toBe('nevazmozhno');
    expect(mozheDaSePriravni(koefitsient('likvidnost'))).toBe(false);
  });

  it('NOI за три месеца × 4 дава годишния', async () => {
    const d = await danni();
    const noi = smetniKoefitsient(koefitsient('noi'), d);
    expect(noi.stoynost).toBe(500_00);
    expect(priravniKamGodina(noi, 3)).toBe(2000_00);
    expect(priravniKamGodina(noi, 12)).toBe(500_00);
  });

  it('МАРЖ × 12 се ОТКАЗВА · това е капанът, заради който има три отговора', async () => {
    const d = await danni();
    const marzh = smetniKoefitsient(koefitsient('marzh'), d);
    // 37,50 % за месец си е 37,50 % и за година. Умножен по 12 → 450 %.
    expect(marzh.stoynost).toBe(3750);
    expect(() => priravniKamGodina(marzh, 1)).toThrow(GreshkaKoefitsient);
    expect(() => priravniKamGodina(marzh, 1)).toThrow(/НЕ зависи от периода/);
  });

  it('ЛИКВИДНОСТ на годишна база се отказва като изречение без съдържание', async () => {
    const d = await danni();
    const l = smetniKoefitsient(koefitsient('likvidnost'), { ...d, zadalzheniya_st: 100_00 });
    expect(() => priravniKamGodina(l, 1)).toThrow(/снимка в ЕДИН миг/);
  });

  it('месеците са цяло число, не по-малко от едно', async () => {
    const noi = smetniKoefitsient(koefitsient('noi'), await danni());
    expect(() => priravniKamGodina(noi, 0)).toThrow(/цяло число/);
    expect(() => priravniKamGodina(noi, 1.5)).toThrow(/цяло число/);
  });
});

describe('сметките · с числа, които се проверяват наум', () => {
  it('събира данните за периода вярно', async () => {
    const d = await danni();
    expect(d.nachisleno_st).toBe(1000_00);
    expect(d.prihod_st).toBe(800_00);
    expect(d.razhod_st).toBe(500_00);
    expect(d.krediti_st).toBe(200_00);
    // NOI изключва вноските по кредит — това е самата му дефиниция
    expect(d.operativni_st).toBe(300_00);
    expect(d.dni).toBe(31);
  });

  it('NOI · приход − ОПЕРАТИВНИ, не всички разходи', async () => {
    const s = smetniKoefitsient(koefitsient('noi'), await danni());
    expect(s.stoynost).toBe(500_00);
    expect(s.parametri.map((x) => x.ime)).toEqual(['приход', 'оперативни разходи']);
  });

  it('паричният поток вади ВСИЧКИ разходи — затова е различен от NOI', async () => {
    const s = smetniKoefitsient(koefitsient('parichen-potok'), await danni());
    expect(s.stoynost).toBe(300_00);
  });

  it('събираемост · 800 от 1 000 е 80,00 %', async () => {
    const s = smetniKoefitsient(koefitsient('sabiraemost'), await danni());
    expect(s.stoynost).toBe(8000); // базисни точки
    expect(sDumiStoynost(s, String)).toBe('80.00 %');
  });

  it('OER · 300 от 800 е 37,50 %', async () => {
    const s = smetniKoefitsient(koefitsient('oer'), await danni());
    expect(s.stoynost).toBe(3750);
  });

  it('DSCR · 500 срещу 200 е 2,50 пъти', async () => {
    const s = smetniKoefitsient(koefitsient('dscr'), await danni());
    expect(s.stoynost).toBe(250); // стотни
    expect(sDumiStoynost(s, String)).toBe('2.50×');
  });

  it('всяка стойност е ЦЯЛО число — нито един float (правило 3)', async () => {
    const d = await danni();
    for (const k of KOEFITSIENTI) {
      const s = smetniKoefitsient(k, d);
      if (s.stoynost !== undefined) {
        expect(Number.isSafeInteger(s.stoynost), `${k.klyuch} не е цяло`).toBe(true);
      }
    }
  });
});

describe('делител нула дава ЛИПСА, не нула', () => {
  const prazno: DanniZaPerioda = {
    prihod_st: 0,
    nachisleno_st: 0,
    razhod_st: 0,
    operativni_st: 0,
    krediti_st: 0,
    dds_za_vnasyane_st: 0,
    sredstva_st: 0,
    vzemaniya_st: 0,
    zadalzheniya_st: 0,
    zaeti: 0,
    vsichki_obekti: 0,
    dni: 31,
    mesetsi: 1,
  };

  it('„събираемост 0 %" при нула начислено е ЛЪЖА — нищо не е било дължимо', () => {
    const s = smetniKoefitsient(koefitsient('sabiraemost'), prazno);
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain('няма какво да се събира');
  });

  it('и всеки друг делител нула се КАЗВА, вместо да мине за нула', () => {
    for (const klyuch of ['oer', 'marzh', 'dscr', 'zaetost', 'likvidnost', 'dso']) {
      const s = smetniKoefitsient(koefitsient(klyuch), prazno);
      expect(s.stoynost, klyuch).toBeUndefined();
      expect(s.zashto, klyuch).not.toBe('');
    }
  });

  it('но параметрите СЕ ПОКАЗВАТ и без стойност — сметката се вижда защо не става', () => {
    const s = smetniKoefitsient(koefitsient('oer'), prazno);
    expect(s.parametri.length).toBeGreaterThan(0);
    expect(sDumiStoynost(s, String)).toBe('—');
  });

  it('сумите-потоци НЕ отказват при нула — нула приход и нула разход дава нула NOI', () => {
    const s = smetniKoefitsient(koefitsient('noi'), prazno);
    expect(s.stoynost).toBe(0);
    expect(s.zashto).toBe('');
  });
});

describe('стъпките · режат периода без да лъжат', () => {
  it('петте са изброени поименно и всяка има име', () => {
    expect([...STAPKI]).toEqual(['den', 'sedmitsa', 'mesets', 'trimesechie', 'godina']);
    for (const st of STAPKI) expect(IMENA_NA_TAKTOVETE[st], st).not.toBe('');
    // ЕДИН РЕЧНИК (резен 13а): стъпката на Калкулатора Е тактът на Ганта, без
    // „свой" — там периодът вече е избран отвън и няма какво да реже.
    expect(STAPKI.includes('trimesechie' as never)).toBe(true);
  });

  it('месец по месец · всеки етикет е самият месец', () => {
    const p = razbiyNaStapki('2026-01-01', '2026-03-31', 'mesets');
    expect(p.map((x) => x.etiket)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(p[0]).toEqual({ ot: '2026-01-01', do: '2026-01-31', etiket: '2026-01' });
    expect(p[1]!.do).toBe('2026-02-28');
  });

  it('ПОСЛЕДНОТО парче се ПОДРЯЗВА до края на периода', () => {
    // Иначе непълен месец застава наравно с пълните и последният стълб
    // винаги изглежда спаднал — тиха лъжа, която всяка втора диаграма прави.
    const p = razbiyNaStapki('2026-01-01', '2026-02-10', 'mesets');
    expect(p).toHaveLength(2);
    expect(p[1]!.do).toBe('2026-02-10');
  });

  it('седмицата е седем дни, а денят — един', () => {
    expect(razbiyNaStapki('2026-01-01', '2026-01-14', 'sedmitsa')).toHaveLength(2);
    expect(razbiyNaStapki('2026-01-01', '2026-01-05', 'den')).toHaveLength(5);
  });

  it('тримесечието носи номера си, годината — годината', () => {
    const t = razbiyNaStapki('2026-01-01', '2026-12-31', 'trimesechie');
    expect(t.map((x) => x.etiket)).toEqual(['2026 · Т1', '2026 · Т2', '2026 · Т3', '2026 · Т4']);
    expect(razbiyNaStapki('2025-01-01', '2026-12-31', 'godina').map((x) => x.etiket)).toEqual([
      '2025',
      '2026',
    ]);
  });

  it('един ден дава едно парче, а обърнат период се отказва С ДУМИ', () => {
    expect(razbiyNaStapki('2026-05-05', '2026-05-05', 'mesets')).toHaveLength(1);
    expect(() => razbiyNaStapki('2026-05-05', '2026-05-01', 'den')).toThrow(/преди началото/);
  });
});
