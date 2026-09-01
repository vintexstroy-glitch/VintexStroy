/**
 * КРЕДИТИТЕ · таблицата, планът по дати и двата процента (резен 19 · ADR-079).
 *
 * Дванайсетте обещания:
 *
 *   1. Планът стига до НУЛА · сборът на главниците е ТОЧНО остатъкът.
 *   2. Последната вноска е по-малка · главница никога над остатъка.
 *   3. Вноска под лихвата не гони остатъка · планът е ПРАЗЕН и се КАЗВА.
 *   4. Двата процента се РАЗМИНАВАТ · иначе вторият е надпис.
 *   5. „Вноски още" = дължината на плана · нула при погасен.
 *   6. Ред-проекцията НЕ създава разход · нула нови събития (мери се).
 *   7. Сторнирано плащане ВДИГА остатъка обратно · без ред код за това.
 *   8. 31-ви се СВИВА до последния ден · февруари не се прескача.
 *   9. Трите части СЪБИРАТ вноската · и Вратата отказва с числа.
 *  10. Главница над остатъка се ОТКАЗВА · отрицателен дълг не се ражда.
 *  11. Замразеният месец не приема плащане · договорът — да.
 *  12. Аритметиката е ЕДНА · личният и фирменият кредит дават същите числа.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  denNaVnoskata,
  dvataProtsenta,
  GreshkaKredit,
  interpoliraiPlana,
  lihvaZaMesetsa,
  NAY_MNOGO_VNOSKI,
  predlozhiVnoska,
  proveriTriteChasti,
} from '../src/domein/kredit-matematika.js';
import {
  KOLONI_KREDITI,
  mesetsiOshte,
  obshtOstatak,
  obshtoObezpechenie,
  ostatakNa,
  planaNa,
  pogasen,
  predstoyashtiteVnoski,
  protsentiteNa,
  redoveNaKreditite,
  redProektsiya,
  ZATVORENI_KREDITI,
} from '../src/domein/krediti.js';
import {
  bezDokumenti,
  IMENA_NA_KAM,
  klyuchNaDokumenti,
  sZakachen,
} from '../src/domein/dokumenti.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const DNES = '2026-08-29';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 29, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const DOGOVOR = {
  kreditId: 'KR-1',
  ime: 'Ипотека · Пощенска',
  vid: 'ipoteka',
  proektId: '',
  ostatak_st: 100_000_00,
  ot: '2026-01-15',
  lihva_bp: 345,
  vnoska_st: 612_34,
  den: 15,
  otgovornik: 'vintexstroy@gmail.com',
  obezpechenie_st: 200_000_00,
};

async function sKredit(nadgradi: Partial<typeof DOGOVOR> = {}) {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiKredit({ ...DOGOVOR, ...nadgradi }, { opId: 'op-kredit' });
  return { dnevnik, deystviya };
}

// ── 1 · ПЛАНЪТ ЗАТВАРЯ ─────────────────────────────────────────────────────

describe('планът по дати · интерполацията на оставащите вноски', () => {
  it('стига до НУЛА и сборът на главниците е ТОЧНО остатъкът', () => {
    const plan = interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.at(-1)!.ostatak_st).toBe(0);

    // ВТОРИЯТ ПЪТ, независим: сборът на главниците трябва да е целият остатък.
    const glavnitsi = plan.reduce((s, v) => s + v.glavnitsa_st, 0);
    expect(glavnitsi).toBe(100_000_00);
  });

  it('всяка вноска е лихва + главница, точно · и всичките са цели центове', () => {
    for (const v of interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES)) {
      expect(v.lihva_st + v.glavnitsa_st).toBe(v.vnoska_st);
      expect(Number.isSafeInteger(v.vnoska_st)).toBe(true);
      expect(Number.isSafeInteger(v.lihva_st)).toBe(true);
      expect(Number.isSafeInteger(v.glavnitsa_st)).toBe(true);
    }
  });

  it('последната вноска НЕ надхвърля договорната · главницата се реже', () => {
    const plan = interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES);
    for (const v of plan) {
      expect(v.vnoska_st).toBeLessThanOrEqual(612_34);
      expect(v.glavnitsa_st).toBeLessThanOrEqual(100_000_00);
    }
    // НЕРАВЕН остатък · тогава последната вноска е СТРОГО по-малка. Първата
    // версия на този тест искаше „строго по-малка" винаги и падна с
    // „expected 61234 to be less than 61234": при кръгъл остатък последната
    // вноска е ЦЯЛА, и това е вярно, не дефект.
    const neraven = interpoliraiPlana(1_000_00, 345, 300_00, 15, DNES);
    expect(neraven.at(-1)!.vnoska_st).toBeLessThan(300_00);
    expect(neraven.at(-1)!.ostatak_st).toBe(0);
    expect(neraven.reduce((x, v) => x + v.glavnitsa_st, 0)).toBe(1_000_00);
  });

  it('остатъкът пада МОНОТОННО · нито една стъпка нагоре', () => {
    const plan = interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES);
    let predi = 100_000_00;
    for (const v of plan) {
      expect(v.ostatak_st).toBeLessThan(predi);
      predi = v.ostatak_st;
    }
  });

  it('датите са ПОСЛЕДОВАТЕЛНИ месеци и всички са СЛЕД днес', () => {
    const plan = interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES);
    expect(plan[0]!.data > DNES).toBe(true);
    for (let i = 1; i < plan.length; i += 1) {
      expect(plan[i]!.data > plan[i - 1]!.data).toBe(true);
    }
  });

  it('ВНОСКА ПОД ЛИХВАТА не гони остатъка · планът е ПРАЗЕН, не безкраен', () => {
    // 1 000 000 € при 12 % дават 10 000 € лихва на месец; вноска от 100 € не
    // покрива дори нея. Празен план е ЧЕСТЕН отговор; 600 реда биха били шум.
    expect(interpoliraiPlana(1_000_000_00, 1_200, 100_00, 15, DNES)).toHaveLength(0);
    expect(interpoliraiPlana(0, 345, 612_34, 15, DNES)).toHaveLength(0);
    expect(interpoliraiPlana(100_000_00, 345, 0, 15, DNES)).toHaveLength(0);
  });

  it('таванът е обявен и не се прескача', () => {
    expect(NAY_MNOGO_VNOSKI).toBe(600);
    // Вноска, едва по-голяма от лихвата: планът опира в тавана, вместо да виси.
    const plan = interpoliraiPlana(1_000_000_00, 1_200, 10_001_00, 1, DNES);
    expect(plan.length).toBeLessThanOrEqual(NAY_MNOGO_VNOSKI);
  });
});

// ── 8 · ДЕНЯТ ──────────────────────────────────────────────────────────────

describe('денят на вноската · 31-ви СЪЩЕСТВУВА', () => {
  it('свива се до последния ден на месеца, вместо да мести МЕСЕЦА', () => {
    expect(denNaVnoskata(2026, 2, 31)).toBe('2026-02-28');
    expect(denNaVnoskata(2028, 2, 31)).toBe('2028-02-29');
    expect(denNaVnoskata(2026, 4, 31)).toBe('2026-04-30');
    expect(denNaVnoskata(2026, 1, 31)).toBe('2026-01-31');
    expect(denNaVnoskata(2026, 3, 5)).toBe('2026-03-05');
  });

  it('планът с падеж 31-ви не прескача февруари', () => {
    const plan = interpoliraiPlana(10_000_00, 345, 2_000_00, 31, '2026-01-01');
    const mesetsi = plan.map((v) => v.data.slice(0, 7));
    expect(mesetsi).toContain('2026-02');
    expect(plan.find((v) => v.data.startsWith('2026-02'))!.data).toBe('2026-02-28');
  });
});

// ── 4 · ДВАТА ПРОЦЕНТА ─────────────────────────────────────────────────────

describe('двата процента · мерят РАЗЛИЧНИ неща', () => {
  it('РАЗМИНАВАТ се · договорният стои, вторият пада с остатъка', () => {
    const vNachaloto = dvataProtsenta(100_000_00, 345, 612_34);
    const kraya = dvataProtsenta(1_000_00, 345, 612_34);

    expect(vNachaloto.dogovoren_bp).toBe(345);
    expect(kraya.dogovoren_bp).toBe(345);
    // Ако двата бяха едно и също число, вторият щеше да е надпис.
    expect(vNachaloto.kamDenya_bp).not.toBe(vNachaloto.dogovoren_bp);
    expect(kraya.kamDenya_bp).toBeLessThan(vNachaloto.kamDenya_bp);
    expect(vNachaloto.zashto).toBe('');
  });

  it('в началото по-голямата част от вноската е ЛИХВА', () => {
    const p = dvataProtsenta(100_000_00, 345, 612_34);
    // 100 000 € × 3,45 % ÷ 12 = 287,50 €, което е 46,95 % от 612,34 €.
    expect(p.kamDenya_bp).toBe(4_695);
  });

  it('погасен кредит КАЗВА защо няма втори процент, вместо да върне нула', () => {
    const p = dvataProtsenta(0, 345, 612_34);
    expect(p.kamDenya_bp).toBe(0);
    expect(p.zashto).toContain('погасен');
    expect(dvataProtsenta(100_000_00, 345, 0).zashto).toContain('дял от нула');
  });
});

// ── 12 · ЕДНА АРИТМЕТИКА ───────────────────────────────────────────────────

describe('аритметиката е ЕДНА · правило 17', () => {
  it('планът дели вноската по СЪЩИЯ път, по който я дели и записът', () => {
    const parva = interpoliraiPlana(100_000_00, 345, 612_34, 15, DNES)[0]!;
    const predlozheno = predlozhiVnoska(100_000_00, 345, 612_34);
    expect(parva.lihva_st).toBe(predlozheno.lihva_st);
    expect(parva.glavnitsa_st).toBe(predlozheno.glavnitsa_st);
    expect(parva.lihva_st).toBe(lihvaZaMesetsa(100_000_00, 345));
  });

  it('трите части СЪБИРАТ вноската · отказът носи ЧИСЛАТА', () => {
    expect(() => proveriTriteChasti(612_34, 468_59, 143_75, 0, true)).not.toThrow();
    expect(() => proveriTriteChasti(612_34, 468_59, 143_74, 0, true)).toThrow(GreshkaKredit);
    expect(() => proveriTriteChasti(612_34, 468_59, 143_74, 0, true)).toThrow(/61233/);
    expect(() => proveriTriteChasti(612_34, -1, 143_75, 0, true)).toThrow(/отрицателни/);
    expect(() => proveriTriteChasti(100_00, 1, 0, 0, false)).toThrow(/САМО при вноска/);
    expect(() => proveriTriteChasti(100_00, 0, 0, 0, false)).not.toThrow();
  });
});

// ── ВРАТАТА ────────────────────────────────────────────────────────────────

describe('Вратата · четирите проверки на договора', () => {
  it('приема правилния договор и го намира в Огледалото', async () => {
    const { dnevnik } = await sKredit();
    const o = await ogledaloto(dnevnik);
    expect(o.krediti.get('KR-1')!.ime).toBe('Ипотека · Пощенска');
    expect(obshtOstatak(o)).toBe(100_000_00);
    expect(obshtoObezpechenie(o)).toBe(200_000_00);
  });

  it('отказва празно име, непознат вид, нула вноска и ден извън 1–31', async () => {
    const { deystviya } = stend();
    const opit = (n: Partial<typeof DOGOVOR>, opId: string) =>
      deystviya.zapishiKredit({ ...DOGOVOR, ...n }, { opId });
    await expect(opit({ ime: '  ' }, 'o1')).rejects.toThrow(/иска име/);
    await expect(opit({ vid: 'kartichka' }, 'o2')).rejects.toThrow(/Непознат вид/);
    await expect(opit({ ostatak_st: 0 }, 'o3')).rejects.toThrow(/повече от нула/);
    await expect(opit({ vnoska_st: 0 }, 'o4')).rejects.toThrow(/няма край/);
    await expect(opit({ den: 32 }, 'o5')).rejects.toThrow(/между 1 и 31/);
    await expect(opit({ den: 0 }, 'o6')).rejects.toThrow(/между 1 и 31/);
    // 31-ви се ПРИЕМА · свива се в плана, не се отказва при въвеждане
    await expect(opit({ den: 31 }, 'o7')).resolves.toBeDefined();
  });

  it('плащане без кредит се ОТКАЗВА · то не сваля ничий остатък', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiPlashtanePoKredit(
        {
          plashtaneId: 'PL-1',
          kreditId: 'NYAMA',
          data: '2026-02-15',
          suma_st: 612_34,
          glavnitsa_st: 468_59,
          lihva_st: 143_75,
          taksa_st: 0,
          belezhka: '',
        },
        { opId: 'op-pl' },
      ),
    ).rejects.toThrow(/Няма такъв кредит/);
  });

  it('ВРАТАТА отказва плащане, чиито три части НЕ събират вноската', async () => {
    // Дотук този инвариант се пазеше САМО на ниво чиста функция — счупих
    // викането ѝ във Вратата и портата остана зелена. Проверка, която не се
    // ВИКА от пътя, по който минават данните, е надпис (ADR-041).
    const { deystviya } = await sKredit();
    await expect(
      deystviya.zapishiPlashtanePoKredit(
        {
          plashtaneId: 'PL-1',
          kreditId: 'KR-1',
          data: '2026-02-15',
          suma_st: 612_34,
          glavnitsa_st: 468_59,
          lihva_st: 143_74,
          taksa_st: 0,
          belezhka: '',
        },
        { opId: 'op-pl' },
      ),
    ).rejects.toThrow(/не събират вноската/);
  });

  it('ГЛАВНИЦА НАД ОСТАТЪКА се отказва · отрицателен дълг не се ражда', async () => {
    const { deystviya } = await sKredit({ ostatak_st: 1_000_00 });
    await expect(
      deystviya.zapishiPlashtanePoKredit(
        {
          plashtaneId: 'PL-1',
          kreditId: 'KR-1',
          data: '2026-02-15',
          suma_st: 2_000_00,
          glavnitsa_st: 2_000_00,
          lihva_st: 0,
          taksa_st: 0,
          belezhka: '',
        },
        { opId: 'op-pl' },
      ),
    ).rejects.toThrow(/надхвърля остатъка/);
  });
});

// ── ОСТАТЪКЪТ ──────────────────────────────────────────────────────────────

describe('остатъкът се СМЯТА · няма поле', () => {
  it('пада с платената главница, не със сумата на вноската', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPlashtanePoKredit(
      {
        plashtaneId: 'PL-1',
        kreditId: 'KR-1',
        data: '2026-02-15',
        suma_st: 612_34,
        glavnitsa_st: 468_59,
        lihva_st: 143_75,
        taksa_st: 0,
        belezhka: '',
      },
      { opId: 'op-pl' },
    );
    const o = await ogledaloto(dnevnik);
    // ЛИХВАТА не пипа остатъка · тя е разход, не връщане на дълг.
    expect(ostatakNa(o.krediti.get('KR-1')!, o.plashtaniyaPoKrediti)).toBe(100_000_00 - 468_59);
    expect(pogasen(o.krediti.get('KR-1')!, o.plashtaniyaPoKrediti)).toBe(false);
  });

  it('СТОРНИРАНОТО плащане вдига остатъка обратно · без ред код за това', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPlashtanePoKredit(
      {
        plashtaneId: 'PL-1',
        kreditId: 'KR-1',
        data: '2026-02-15',
        suma_st: 612_34,
        glavnitsa_st: 468_59,
        lihva_st: 143_75,
        taksa_st: 0,
        belezhka: '',
      },
      { opId: 'op-pl' },
    );
    const predi = await ogledaloto(dnevnik);
    const seq = predi.plashtaniyaPoKrediti[0]!.seq;

    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: seq, prichina: 'сгрешена дата' },
      { opId: 'op-storno' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(sled.plashtaniyaPoKrediti).toHaveLength(0);
    expect(obshtOstatak(sled)).toBe(100_000_00);
    // „Сторното не отменя — то ДОБАВЯ": Журналът РАСТЕ, не се свива.
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBeGreaterThan(
      (await dnevnik.chetiVsichki(NAEMATEL)).filter((s) => s.type !== 'Сторно').length,
    );
  });

  it('СТОРНОТО НА ДОГОВОРА убива кредита · той не възкръсва от поправката си', async () => {
    const { dnevnik, deystviya } = await sKredit();
    const predi = await ogledaloto(dnevnik);
    const seq = predi.krediti.get('KR-1')!.seq;

    // Поправка СЛЕД създаването · същият id, ново число.
    await deystviya.zapishiKredit(
      { ...DOGOVOR, vnoska_st: 700_00 },
      { opId: 'op-popravka' },
    );
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: seq, prichina: 'кредит не е теглен' },
      { opId: 'op-storno' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(sled.krediti.has('KR-1')).toBe(false);
  });

  it('погасен кредит има НУЛА вноски още и празен план', async () => {
    const { dnevnik, deystviya } = await sKredit({ ostatak_st: 1_000_00 });
    await deystviya.zapishiPlashtanePoKredit(
      {
        plashtaneId: 'PL-1',
        kreditId: 'KR-1',
        data: '2026-02-15',
        suma_st: 1_002_87,
        glavnitsa_st: 1_000_00,
        lihva_st: 2_87,
        taksa_st: 0,
        belezhka: '',
      },
      { opId: 'op-pl' },
    );
    const o = await ogledaloto(dnevnik);
    const k = o.krediti.get('KR-1')!;
    expect(pogasen(k, o.plashtaniyaPoKrediti)).toBe(true);
    expect(mesetsiOshte(o, k, DNES)).toBe(0);
    expect(planaNa(o, k, DNES)).toHaveLength(0);
    expect(protsentiteNa(k, o.plashtaniyaPoKrediti).zashto).toContain('погасен');
  });
});

// ── 6 · РЕД-ПРОЕКЦИЯТА ─────────────────────────────────────────────────────

describe('ред-проекцията · СБОР, не запис', () => {
  it('НЕ създава нито едно събитие · мери се, не се твърди', async () => {
    const { dnevnik } = await sKredit();
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;
    const o = await ogledaloto(dnevnik);

    redProektsiya(o, '2026-09', DNES);
    redoveNaKreditite(o, DNES);
    predstoyashtiteVnoski(o, DNES);

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
    // И нито един РАЗХОД не се е родил от проекцията.
    expect([...(await ogledaloto(dnevnik)).razhodi.values()]).toHaveLength(0);
  });

  it('събира вноските на месеца и ги дели на лихва и главница', async () => {
    const { dnevnik } = await sKredit();
    const o = await ogledaloto(dnevnik);
    const r = redProektsiya(o, '2026-09', DNES);

    expect(r.broy).toBe(1);
    expect(r.vnoski_st).toBe(612_34);
    // ВТОРИЯТ ПЪТ: двете части СЪБИРАТ сбора, точно.
    expect(r.lihva_st + r.glavnitsa_st).toBe(r.vnoski_st);
    expect(r.lihva_st).toBe(lihvaZaMesetsa(100_000_00, 345));
  });

  it('месец без падеж дава НУЛА и нула кредита · истинско число, не липса', async () => {
    const { dnevnik } = await sKredit();
    const o = await ogledaloto(dnevnik);
    const r = redProektsiya(o, '2019-01', DNES);
    expect(r).toEqual({ mesets: '2019-01', vnoski_st: 0, broy: 0, lihva_st: 0, glavnitsa_st: 0 });
  });

  it('предстоящите вноски носят отговорника ОТ КРЕДИТА и се смятат', async () => {
    const { dnevnik } = await sKredit();
    const o = await ogledaloto(dnevnik);
    const v = predstoyashtiteVnoski(o, DNES);
    expect(v).toHaveLength(1);
    expect(v[0]!.otgovornik).toBe('vintexstroy@gmail.com');
    expect(v[0]!.data).toBe('2026-09-15');
    expect(v[0]!.dni).toBe(17);
    // Далечен падеж НЕ влиза в червения списък.
    expect(predstoyashtiteVnoski(o, DNES, 5)).toHaveLength(0);
  });
});

// ── ЧЕТИВОТО НА ЕКРАНА ─────────────────────────────────────────────────────

describe('редовете за екрана · и затворените колони', () => {
  it('единайсетте колони стоят в реда си · и трите сметнати са ЗАТВОРЕНИ', () => {
    expect(KOLONI_KREDITI).toHaveLength(11);
    expect(KOLONI_KREDITI[0]).toBe('Кредит');
    expect(KOLONI_KREDITI[10]).toBe('Вноски още');
    expect(ZATVORENI_KREDITI).toEqual([5, 9, 10]);
    for (const i of ZATVORENI_KREDITI) {
      expect(KOLONI_KREDITI[i]).toBeDefined();
    }
    // Затворената колона се СМЯТА, затова не е между въвежданите.
    expect(ZATVORENI_KREDITI.map((i) => KOLONI_KREDITI[i])).toEqual([
      'Остатък',
      'Лихва към деня',
      'Вноски още',
    ]);
  });

  it('изплатеният дял се смята от НАЧАЛНИЯ остатък', async () => {
    const { dnevnik, deystviya } = await sKredit({ ostatak_st: 1_000_00 });
    await deystviya.zapishiPlashtanePoKredit(
      {
        plashtaneId: 'PL-1',
        kreditId: 'KR-1',
        data: '2026-02-15',
        suma_st: 252_87,
        glavnitsa_st: 250_00,
        lihva_st: 2_87,
        taksa_st: 0,
        belezhka: '',
      },
      { opId: 'op-pl' },
    );
    const redove = redoveNaKreditite(await ogledaloto(dnevnik), DNES);
    expect(redove[0]!.izplateno_bp).toBe(2_500);
    expect(redove[0]!.ostatak_st).toBe(750_00);
  });

  it('документът се закача и за КРЕДИТ · петият адрес МИНАВА през Вратата', async () => {
    expect(Object.keys(IMENA_NA_KAM)).toEqual([
      'razhod',
      'delo',
      'imot',
      'prodazhba',
      'kredit',
    ]);
    expect(IMENA_NA_KAM.kredit).toBe('кредит');

    // ТОВА Е ИСТИНСКАТА ПРОВЕРКА. Първата версия гледаше само имената и
    // СЧУПВАНЕТО МИНА: махнах „kredit" от `KAM_KAKVO` (пазача на адреса) и
    // портата остана зелена, защото имената са ДРУГ списък. Адресът се пази от
    // `proveriAdresa`, значи проверката минава през Вратата.
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zakachiDokumenti(
      sZakachen(bezDokumenti('kredit', 'KR-1'), {
        ime: 'Договор.pdf',
        golemina: 1_024,
        promenen: '2026-01-15T10:00:00.000Z',
        otpechatak: 'otp-1',
        vid: 'dogovor',
        vrazka: '',
      }),
      { opId: 'dok:kredit' },
    );
    const o = await ogledaloto(dnevnik);
    expect(o.dokumenti.get(klyuchNaDokumenti('kredit', 'KR-1'))?.dokumenti).toHaveLength(1);
  });
});

// ── 11 · ЗАМРАЗЯВАНЕТО ─────────────────────────────────────────────────────

describe('замразеният месец · договорът минава, плащането — не', () => {
  it('плащане в подаден месец се ОТКАЗВА, а нов договор се приема', async () => {
    const { deystviya } = await sKredit();
    await deystviya.podaySpravka(
      { period: '2026-02', dds_deklarirano_st: 0, data: '2026-03-14', belezhka: '' },
      { opId: 'op-spravka' },
    );
    await expect(
      deystviya.zapishiPlashtanePoKredit(
        {
          plashtaneId: 'PL-1',
          kreditId: 'KR-1',
          data: '2026-02-15',
          suma_st: 612_34,
          glavnitsa_st: 468_59,
          lihva_st: 143_75,
          taksa_st: 0,
          belezhka: '',
        },
        { opId: 'op-pl' },
      ),
    ).rejects.toThrow();
    // Договорът НЕ е счетоводен запис в месец — той минава.
    await expect(
      deystviya.zapishiKredit({ ...DOGOVOR, kreditId: 'KR-2' }, { opId: 'op-k2' }),
    ).resolves.toBeDefined();
  });
});
