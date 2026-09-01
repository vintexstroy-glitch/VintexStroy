/**
 * ПОГАСИТЕЛНИЯТ ПЛАН ОТ ДОГОВОРА (резен 73 · И124 т.12).
 *
 * „От извлеченията се вкарва и наличните кредити, които работят с вкаран
 *  погасителен план и договори свързан в папка за това."
 *
 * Шестте обещания:
 *
 *   1. Вратата пази: без кредит · празен · неточна делба · разбъркани дати.
 *   2. Вкараният план БИЕ интерполацията, и изворът се КАЗВА.
 *   3. Остатъкът след всяка вноска се СМЯТА, не се вкарва.
 *   4. Плащане сваля остатъка и планът се скъсява САМ.
 *   5. Ново вкарване заменя целия план · последната дума бие.
 *   6. Без план интерполацията остава · нищо старо не се чупи.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { izvorNaPlana, mesetsiOshte, planaNa } from '../src/domein/krediti.js';
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

async function sKredit() {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiKredit(
    {
      kreditId: 'KR-1',
      ime: 'Ипотека · Пощенска',
      vid: 'ipoteka',
      proektId: '',
      ostatak_st: 1_000_00,
      ot: '2026-01-15',
      lihva_bp: 345,
      vnoska_st: 300_00,
      den: 15,
      otgovornik: 'vintexstroy@gmail.com',
      obezpechenie_st: 0,
    },
    { opId: 'op-kredit' },
  );
  return { dnevnik, deystviya };
}

/** Три договорни вноски · нарочно РАЗЛИЧНИ от интерполацията, за да се види чий е планът. */
const VNOSKI = [
  { data: '2026-09-20', vnoska_st: 400_00, glavnitsa_st: 390_00, lihva_st: 10_00 },
  { data: '2026-10-20', vnoska_st: 400_00, glavnitsa_st: 395_00, lihva_st: 5_00 },
  { data: '2026-11-20', vnoska_st: 217_00, glavnitsa_st: 215_00, lihva_st: 2_00 },
] as const;

describe('1 · Вратата пази плана', () => {
  it('план без кредит се ОТКАЗВА', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiPogasitelenPlan({ kreditId: 'нЯмА', vnoski: [...VNOSKI] }, { opId: 'op-1' }),
    ).rejects.toThrow(/Няма такъв кредит/);
  });

  it('празен план се ОТКАЗВА · планът се надживява с нов, не с празен', async () => {
    const { deystviya } = await sKredit();
    await expect(
      deystviya.zapishiPogasitelenPlan({ kreditId: 'KR-1', vnoski: [] }, { opId: 'op-2' }),
    ).rejects.toThrow(/поне една вноска/);
  });

  it('вноска, чиито части не се събират, се ОТКАЗВА с датата ѝ', async () => {
    const { deystviya } = await sKredit();
    await expect(
      deystviya.zapishiPogasitelenPlan(
        {
          kreditId: 'KR-1',
          vnoski: [{ data: '2026-09-20', vnoska_st: 400_00, glavnitsa_st: 390_00, lihva_st: 9_99 }],
        },
        { opId: 'op-3' },
      ),
    ).rejects.toThrow(/2026-09-20 не се събира/);
  });

  it('разбъркани дати се ОТКАЗВАТ · разбъркан план се чете като счупен остатък', async () => {
    const { deystviya } = await sKredit();
    await expect(
      deystviya.zapishiPogasitelenPlan(
        { kreditId: 'KR-1', vnoski: [VNOSKI[1], VNOSKI[0]] },
        { opId: 'op-4' },
      ),
    ).rejects.toThrow(/трябва да растат/);
  });
});

describe('2–3 · договорът бие интерполацията · остатъкът се смята', () => {
  it('вкараният план се чете, изворът се КАЗВА, остатъкът пада по реда', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPogasitelenPlan(
      { kreditId: 'KR-1', vnoski: [...VNOSKI] },
      { opId: 'op-plan' },
    );
    const o = await ogledaloto(dnevnik);
    const k = o.krediti.get('KR-1')!;

    expect(izvorNaPlana(o, k)).toBe('договор');
    const plan = planaNa(o, k, DNES);
    expect(plan.map((v) => v.data)).toEqual(['2026-09-20', '2026-10-20', '2026-11-20']);
    // остатъкът СЛЕД всяка вноска · 1000 − 390 = 610 · 610 − 395 = 215 · 215 − 215 = 0
    expect(plan.map((v) => v.ostatak_st)).toEqual([610_00, 215_00, 0]);
    expect(mesetsiOshte(o, k, DNES)).toBe(3);
  });

  it('вноска от плана, паднала ПРЕДИ днес, не се брои в оставащото', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPogasitelenPlan(
      { kreditId: 'KR-1', vnoski: [...VNOSKI] },
      { opId: 'op-plan' },
    );
    const o = await ogledaloto(dnevnik);
    const k = o.krediti.get('KR-1')!;
    expect(planaNa(o, k, '2026-09-25').map((v) => v.data)).toEqual(['2026-10-20', '2026-11-20']);
  });
});

describe('4 · плащането скъсява плана САМ', () => {
  it('платена главница реже опашката на договорния план', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPogasitelenPlan(
      { kreditId: 'KR-1', vnoski: [...VNOSKI] },
      { opId: 'op-plan' },
    );
    await deystviya.zapishiPlashtanePoKredit(
      {
        plashtaneId: 'PL-1',
        kreditId: 'KR-1',
        data: '2026-09-20',
        suma_st: 400_00,
        glavnitsa_st: 390_00,
        lihva_st: 10_00,
        taksa_st: 0,
        belezhka: '',
      },
      { opId: 'op-pl' },
    );
    const o = await ogledaloto(dnevnik);
    const k = o.krediti.get('KR-1')!;
    // остатъкът е 610 · планът напред пак чете договора, но главниците се
    // режат до наличното: 610 − 395 = 215 · 215 − 215 = 0
    const plan = planaNa(o, k, DNES);
    expect(plan.reduce((s, v) => s + v.glavnitsa_st, 0)).toBe(610_00);
    expect(plan.at(-1)!.ostatak_st).toBe(0);
  });
});

describe('5 · последната дума бие', () => {
  it('ново вкарване ЗАМЕНЯ целия план', async () => {
    const { dnevnik, deystviya } = await sKredit();
    await deystviya.zapishiPogasitelenPlan(
      { kreditId: 'KR-1', vnoski: [...VNOSKI] },
      { opId: 'op-plan-1' },
    );
    await deystviya.zapishiPogasitelenPlan(
      {
        kreditId: 'KR-1',
        vnoski: [{ data: '2026-12-01', vnoska_st: 1_005_00, glavnitsa_st: 1_000_00, lihva_st: 5_00 }],
      },
      { opId: 'op-plan-2' },
    );
    const o = await ogledaloto(dnevnik);
    const plan = planaNa(o, o.krediti.get('KR-1')!, DNES);
    expect(plan.map((v) => v.data)).toEqual(['2026-12-01']);
  });
});

describe('6 · без план интерполацията остава', () => {
  it('изворът е интерполация и планът се смята както досега', async () => {
    const { dnevnik } = await sKredit();
    const o = await ogledaloto(dnevnik);
    const k = o.krediti.get('KR-1')!;
    expect(izvorNaPlana(o, k)).toBe('интерполация');
    const plan = planaNa(o, k, DNES);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.reduce((s, v) => s + v.glavnitsa_st, 0)).toBe(1_000_00);
  });
});
