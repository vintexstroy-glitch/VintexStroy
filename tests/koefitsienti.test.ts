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
import { mesetsSChisla, stend } from './pomoshtni.js';

const OT = '2026-08-01';
const DO = '2026-08-31';
const KOGATO = '2026-08-25T09:00:00.000Z';


/**
 * Числа, ИЗБРАНИ да се проверяват наум:
 *   начислено 1 000 · събрано 800 · оперативен разход 300 · кредит 200
 *   → NOI 500 · паричен поток 300 · събираемост 80 % · OER 37,5 % · DSCR 2,50×
 */

async function danni(): Promise<DanniZaPerioda> {
  const { deystviya } = stend();
  await mesetsSChisla(deystviya);
  return danniZaPerioda(await deystviya.ogledalo(), OT, DO);
}

/**
 * КРЕДИТЪТ СТИГА ЛИ ДО КОЕФИЦИЕНТИТЕ · резен 19.
 *
 * ═══ ЗАЩО ГО ИМА ═══
 *
 * `danniZaPerioda` дълго връщаше `zadalzheniya_st: 0` — закована нула, защото
 * нямаше откъде да дойде число. Резен 19 ѝ даде източник, и СЧУПВАНЕТО НА
 * ТОЗИ ИЗТОЧНИК МИНА: върнах нулата, цялата порта остана зелена.
 *
 * Значи нищо не пазеше половината от резена. Тези четири проверки я пазят, и
 * падат с ЧИСЛА, не с „нещо не е наред".
 */
describe('кредитът стига до коефициентите · счупването МИНА, преди да го има', () => {
  const KREDIT = {
    kreditId: 'KR-1',
    ime: 'Ипотека',
    vid: 'ipoteka',
    proektId: '',
    ostatak_st: 50_000_00,
    ot: '2026-01-15',
    lihva_bp: 345,
    vnoska_st: 612_34,
    den: 15,
    otgovornik: 'vintexstroy@gmail.com',
    obezpechenie_st: 100_000_00,
  };

  async function sKredit(): Promise<DanniZaPerioda> {
    const { deystviya } = stend();
    await mesetsSChisla(deystviya);
    await deystviya.zapishiKredit(KREDIT, { opId: 'op-kredit' });
    return danniZaPerioda(await deystviya.ogledalo(), OT, DO);
  }

  it('ЗАДЪЛЖЕНИЯТА вече НЕ са закована нула · те са остатъчната главница', async () => {
    expect((await danni()).zadalzheniya_st).toBe(0);
    const d = await sKredit();
    expect(d.zadalzheniya_st).toBe(50_000_00);
    expect(d.obezpechenie_st).toBe(100_000_00);
  });

  it('ЛИКВИДНОСТТА спира да мълчи · тя иска и двете страни', async () => {
    expect(smetniKoefitsient(koefitsient('likvidnost'), await danni()).zashto).toContain(
      'Няма записани текущи задължения',
    );
    const s = smetniKoefitsient(koefitsient('likvidnost'), await sKredit());
    expect(s.stoynost).toBeDefined();
    expect(s.zashto).toBe('');
  });

  it('LTV е остатък ÷ обезпечение · и без обезпечение КАЗВА защо', async () => {
    const s = smetniKoefitsient(koefitsient('ltv'), await sKredit());
    // ВТОРИЯТ ПЪТ, на ръка: 50 000 ÷ 100 000 = 50,00 % = 5 000 базисни пункта.
    expect(s.stoynost).toBe(5_000);
    const bez = smetniKoefitsient(koefitsient('ltv'), await danni());
    expect(bez.stoynost).toBeUndefined();
    expect(bez.zashto).toContain('обезпечението');
  });

  it('Дълг/доход е ЗАПАС към ПОТОК · и на година се ДЕЛИ, не се умножава', async () => {
    const d = await sKredit();
    const s = smetniKoefitsient(koefitsient('dalg-kam-ebitda'), d);
    const noi = d.prihod_st - d.operativni_st;
    expect(noi).toBeGreaterThan(0);
    // ВТОРИЯТ ПЪТ: остатък ÷ NOI, в стотни от „пъти".
    expect(s.stoynost).toBe(Math.round((50_000_00 * 100) / noi));

    expect(koefitsient('dalg-kam-ebitda').vid).toBe('zapas-kam-potok');
    expect(mozheDaSePriravni(koefitsient('dalg-kam-ebitda'))).toBe(true);
    // ЕДИН месец в периода → делене на 12 ÷ 1, тоест стойност × 1 ÷ 12.
    expect(priravniKamGodina(s, 1)).toBe(Math.round(s.stoynost! / 12));
    // И НЕ е умножение · обратната посока би дала 144 пъти по-голямо число.
    expect(priravniKamGodina(s, 1)).not.toBe(s.stoynost! * 12);
  });
});

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
    obezpechenie_st: 0,
    zaeti: 0,
    vsichki_obekti: 0,
    dni: 31,
    mesetsi: 1,
    aktivi_st: 0,
    sobstven_kapital_st: 0,
    stoynost_st: 0,
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

describe('пинът · броят се твърди с ръка (резен 46 · група В)', () => {
  it('коефициентите на Сметки са ДЕВЕТНАЙСЕТ', () => {
    // ДЕВЕТНАЙСЕТ, не пет: съименникът в Калкулатора е ДРУГА константа, с друг
    // брой и свой пин. Едно име, два дома — затова пинът е при своя тест.
    // Бяха ДВАНАЙСЕТ до резен 51; седемте нови са популярните, които липсваха.
    expect(KOEFITSIENTI).toHaveLength(19);
  });

  it('и се делят на СЕДЕМ състояния и ДВАНАЙСЕТ за период', () => {
    const broy = (kogato: string): number => KOEFITSIENTI.filter((k) => k.kogato === kogato).length;
    expect([broy('sastoyanie'), broy('period')]).toEqual([7, 12]);
  });
});
