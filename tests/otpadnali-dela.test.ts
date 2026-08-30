/**
 * ОТПАДНАЛИТЕ ДЕЛА · остават отделно, не изчезват (резен 30 · ADR-090).
 *
 * Негова дума: „остават в отедлно наи тфолу тези които са отпаднали но се пази
 * история като бацк уп" *(`docs/izvori/02-po-temi.md:617-618`)*.
 *
 * Седемте обещания:
 *
 *   1. „Отпаднало" е ЧЕТВЪРТО състояние · и се различава от сторно.
 *   2. Отпадналото НЕ е сред живите · седемте екрана го питат от ЕДИН дом.
 *   3. Но СТОИ · отделният списък го носи, с кога и от кого.
 *   4. Светофарът МЪЛЧИ за него · срок, който никой няма да гони, не е спешен.
 *   5. Връщането го оживява · историята е цяла, нищо не се е загубило.
 *   6. Сторното е ДРУГО нещо · то маха записа, а отпадането го оставя.
 *   7. И нулата се казва · книга без отпаднали дела го КАЗВА.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { OTPADNALO, SASTOYANIYA, otpadnalite, svetofar, zhivite } from '../src/domein/dela.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const DNES = '2026-08-30';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const DELO = {
  myasto: 'Малинова Долина',
  obekt: 'ап. 4',
  ime: 'Ремонт баня',
  otgovornik: 'Николай Петков',
  ot: '2026-08-25',
  // СРОКЪТ Е УТРЕ · нарочно: така светофарът би светил ЧЕРВЕНО, ако делото е
  // живо, и мълчанието му при отпадналото значи нещо.
  do: '2026-08-31',
  otsenka: 'спешно-важно' as const,
  sastoyanie: 'чака' as const,
  nadDelo: '',
  dokument: '',
};

/** Едно дело, после отпаднало · вторият запис е върху СЪЩАТА същност. */
async function sOtpadnalo() {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-1' });
  await deystviya.zapishiDelo('D-1', { ...DELO, sastoyanie: OTPADNALO }, { opId: 'op-2' });
  return { dnevnik, deystviya };
}

// ── 1 · ЧЕТВЪРТОТО СЪСТОЯНИЕ ──────────────────────────────────────────────

describe('„отпаднало"', () => {
  it('е ЧЕТВЪРТО състояние · изброено, не свободна дума', () => {
    expect(SASTOYANIYA).toHaveLength(4);
    expect(SASTOYANIYA).toContain(OTPADNALO);
  });

  it('и Вратата приема само изброените', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiDelo('D-1', { ...DELO, sastoyanie: 'зарязано' as never }, { opId: 'op-1' }),
    ).rejects.toThrow();
  });
});

// ── 2 и 3 · ИЗВЪН ЖИВИТЕ, НО СТОИ ─────────────────────────────────────────

describe('отпадналото дело', () => {
  it('НЕ е сред живите · ЕДИН дом за въпроса', async () => {
    const { dnevnik } = await sOtpadnalo();
    const vsichki = [...(await ogledaloto(dnevnik)).dela.values()];

    expect(vsichki).toHaveLength(1);
    expect(zhivite(vsichki)).toHaveLength(0);
  });

  it('но СТОИ · отделният списък го носи', async () => {
    const { dnevnik } = await sOtpadnalo();
    const spisak = otpadnalite([...(await ogledaloto(dnevnik)).dela.values()]);

    expect(spisak).toHaveLength(1);
    expect(spisak[0]!.ime).toBe('Ремонт баня');
  });

  it('и казва КОГА и ОТ КОГО е отпаднало', async () => {
    const { dnevnik } = await sOtpadnalo();
    const d = otpadnalite([...(await ogledaloto(dnevnik)).dela.values()])[0]!;

    expect(d.promeniGo).toBe('vintexstroy@gmail.com');
    expect(d.promeneno.slice(0, 10)).toBe(DNES);
  });

  it('а „кога" е на ПОСЛЕДНОТО записване, не на създаването', async () => {
    const { dnevnik, deystviya } = await sOtpadnalo();
    const predi = otpadnalite([...(await ogledaloto(dnevnik)).dela.values()])[0]!.promeneno;

    await deystviya.zapishiDelo(
      'D-1',
      { ...DELO, sastoyanie: OTPADNALO, ime: 'Ремонт баня · отменен' },
      { opId: 'op-3' },
    );

    const sled = otpadnalite([...(await ogledaloto(dnevnik)).dela.values()])[0]!;
    expect(sled.promeneno > predi).toBe(true);
    // а seq-ът на СЪЗДАВАНЕТО не мърда — сторното сочи него
    expect(sled.seq).toBe(1);
  });
});

// ── 4 · СВЕТОФАРЪТ ────────────────────────────────────────────────────────

describe('светофарът', () => {
  it('МЪЛЧИ за отпадналото · срок, който никой няма да гони, не е спешен', async () => {
    const { dnevnik } = await sOtpadnalo();
    const d = otpadnalite([...(await ogledaloto(dnevnik)).dela.values()])[0]!;
    expect(svetofar(d, DNES)).toBe('normalno');
  });

  it('но СЪЩИЯТ срок свети ЧЕРВЕНО, докато делото е живо', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-1' });
    const d = zhivite([...(await ogledaloto(dnevnik)).dela.values()])[0]!;
    // Двете проверки заедно значат нещо: мълчанието идва от СЪСТОЯНИЕТО,
    // а не от това, че срокът е далеч.
    expect(svetofar(d, DNES)).toBe('cherveno');
  });
});

// ── 5 · ВРЪЩАНЕТО ─────────────────────────────────────────────────────────

describe('връщането', () => {
  it('оживява делото · историята е цяла, нищо не се е загубило', async () => {
    const { dnevnik, deystviya } = await sOtpadnalo();
    await deystviya.zapishiDelo('D-1', { ...DELO, sastoyanie: 'в процес' }, { opId: 'op-3' });

    const vsichki = [...(await ogledaloto(dnevnik)).dela.values()];
    expect(zhivite(vsichki)).toHaveLength(1);
    expect(otpadnalite(vsichki)).toHaveLength(0);
    expect(zhivite(vsichki)[0]!.sastoyanie).toBe('в процес');
  });

  it('и Журналът пази ВСИЧКИ три стъпки · „бекъп" не се строи', async () => {
    const { dnevnik, deystviya } = await sOtpadnalo();
    await deystviya.zapishiDelo('D-1', { ...DELO, sastoyanie: 'в процес' }, { opId: 'op-3' });

    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    const negovite = potok.filter((s) => s.type === 'ДелоЗаписано');
    expect(negovite).toHaveLength(3);
    expect(negovite.map((s) => (s.payload as { sastoyanie: string }).sastoyanie)).toEqual([
      'чака',
      OTPADNALO,
      'в процес',
    ]);
  });
});

// ── 6 · СТОРНОТО Е ДРУГО НЕЩО ─────────────────────────────────────────────

describe('сторното и отпадането', () => {
  it('са РАЗЛИЧНИ · сторното МАХА записа, отпадането го ОСТАВЯ', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-1' });
    await deystviya.zapishiDelo('D-2', DELO, { opId: 'op-2' });

    const predi = await ogledaloto(dnevnik);
    // D-1 се СТОРНИРА · D-2 ОТПАДА
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.dela.get('D-1')!.seq, prichina: 'сгрешено дело' },
      { opId: 'op-st' },
    );
    await deystviya.zapishiDelo('D-2', { ...DELO, sastoyanie: OTPADNALO }, { opId: 'op-3' });

    const o = await ogledaloto(dnevnik);
    // Сторнираното НАПУСКА картата (резен 27); отпадналото ОСТАВА в нея.
    expect(o.dela.has('D-1')).toBe(false);
    expect(o.dela.has('D-2')).toBe(true);
    expect(otpadnalite([...o.dela.values()]).map((d) => d.id)).toEqual(['D-2']);
    // И сторнираното си има СВОЙ списък — двата не се смесват.
    expect(o.pogasenite.map((x) => x.id)).toEqual(['D-1']);
  });
});

// ── 7 · НУЛАТА ────────────────────────────────────────────────────────────

describe('книга без отпаднали дела', () => {
  it('го КАЗВА · проверената нула е различна от премълчаната', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-1' });

    const vsichki = [...(await ogledaloto(dnevnik)).dela.values()];
    expect(otpadnalite(vsichki)).toEqual([]);
    expect(zhivite(vsichki)).toHaveLength(1);
  });

  it('и празната книга не гърми · нула плюс нула е нула', () => {
    expect(zhivite([])).toEqual([]);
    expect(otpadnalite([])).toEqual([]);
  });
});
