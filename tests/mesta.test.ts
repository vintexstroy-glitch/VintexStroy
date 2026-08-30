/**
 * МЯСТОТО СТАВА ЗАПИС · отговорник-ФИРМА и папка (резен 31 · ADR-091).
 *
 * Едно негово изречение, два реда от описа *(р48·[42])*:
 *
 *   „На нивото на проекта дай **линк към папката с проекта**…"
 *   „в таблицата за отговорник напиши **фирмата която управлява проекта**"
 *
 * И границата, от следващия ден *(р48·[44])*: отговорникът на ДЕЛОТО е ЧОВЕК.
 *
 * Седемте обещания:
 *
 *   1. Мястото се записва · с фирма и папка, и двете ПО ИЗБОР.
 *   2. Празно име отказва с ДУМИ · името е и адресът.
 *   3. Свързва се по СВЕДЕНО име · „Малинова Долина" = „малинова долина ".
 *   4. Второто записване ПОПРАВЯ · не ражда второ място.
 *   5. Двата отговорника НЕ се смесват · фирма на мястото, човек на делото.
 *   6. Незаписаните места СЕ ПОКАЗВАТ · списък само от записаните крие работата.
 *   7. Сверката брои различните имена · и нулата се казва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { zhivite } from '../src/domein/dela.js';
import {
  GreshkaMyasto,
  mestata,
  myastotoNa,
  proveriMyastoto,
  sashtnostNaMyastoto,
  svedenotoMyasto,
  sveriMestata,
} from '../src/domein/mesta.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-30T12:00:00.000Z';

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
  do: '2026-09-30',
  otsenka: 'спешно-важно' as const,
  sastoyanie: 'чака' as const,
  nadDelo: '',
  dokument: '',
};

// ── 1 и 2 · ЗАПИСВАНЕТО ───────────────────────────────────────────────────

describe('мястото', () => {
  it('се записва · с фирма и папка', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'Винтекс Строй ЕООД', papka: 'папка-мд' },
      { opId: 'op-1' },
    );

    const m = myastotoNa(await ogledaloto(dnevnik), 'Малинова Долина')!;
    expect(m.ime).toBe('Малинова Долина');
    expect(m.firma).toBe('Винтекс Строй ЕООД');
    expect(m.papka).toBe('папка-мд');
    expect(m.koy).toBe('vintexstroy@gmail.com');
  });

  it('и фирмата с папката са ПО ИЗБОР · име стига', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: '', papka: '' }, { opId: 'op-1' });

    const m = myastotoNa(await ogledaloto(dnevnik), 'Хисаря')!;
    expect(m.ime).toBe('Хисаря');
    expect(m.firma).toBe('');
  });

  it('но празно име отказва с ДУМИ · името е и адресът', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiMyasto({ ime: '   ', firma: 'Х', papka: '' }, { opId: 'op-1' }),
    ).rejects.toThrow(GreshkaMyasto);
    expect(() => proveriMyastoto('')).toThrow(/няма име/);
  });
});

// ── 3 и 4 · СВЕЖДАНЕТО И ПОПРАВКАТА ───────────────────────────────────────

describe('свързването', () => {
  it('е по СВЕДЕНО име · регистърът и интервалите не правят второ място', () => {
    expect(svedenotoMyasto('Малинова Долина')).toBe(svedenotoMyasto('малинова долина '));
    expect(sashtnostNaMyastoto('  Хисаря ')).toBe(sashtnostNaMyastoto('хисаря'));
  });

  it('и Огледалото ги вижда като ЕДНО', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'А ЕООД', papka: '' },
      { opId: 'op-1' },
    );

    const o = await ogledaloto(dnevnik);
    expect(o.mesta.size).toBe(1);
    expect(myastotoNa(o, ' малинова долина ')?.firma).toBe('А ЕООД');
  });

  it('второто записване ПОПРАВЯ · не ражда второ място', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'А ЕООД', papka: '' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'Б ЕООД', papka: 'нова-папка' },
      { opId: 'op-2' },
    );

    const o = await ogledaloto(dnevnik);
    expect(o.mesta.size).toBe(1);
    expect(myastotoNa(o, 'Малинова Долина')?.firma).toBe('Б ЕООД');
    expect(myastotoNa(o, 'Малинова Долина')?.papka).toBe('нова-папка');
    // Историята е цяла · Журналът пази и двата записа (правило 1).
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });

  it('и seq-ът на СЪЗДАВАНЕТО не мърда от поправка', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: 'А', papka: '' }, { opId: 'op-1' });
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: 'Б', papka: '' }, { opId: 'op-2' });
    expect(myastotoNa(await ogledaloto(dnevnik), 'Хисаря')?.seq).toBe(1);
  });
});

// ── 5 · ДВАТА ОТГОВОРНИКА ─────────────────────────────────────────────────

describe('двата отговорника', () => {
  it('НЕ се смесват · фирма на МЯСТОТО, човек на ДЕЛОТО', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d' });
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'Винтекс Строй ЕООД', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    expect(o.dela.get('D-1')!.otgovornik).toBe('Николай Петков');
    expect(myastotoNa(o, 'Малинова Долина')!.firma).toBe('Винтекс Строй ЕООД');
    // Двете полета живеят в РАЗЛИЧНИ същности — няма как едното да изяде другото.
    expect(o.dela.get('D-1')!.otgovornik).not.toBe(myastotoNa(o, 'Малинова Долина')!.firma);
  });

  it('и делото си работи, докато мястото му НЕ е записано', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d' });

    const o = await ogledaloto(dnevnik);
    expect(o.dela.size).toBe(1);
    expect(myastotoNa(o, 'Малинова Долина')).toBeUndefined();
  });
});

// ── 6 · СПИСЪКЪТ ──────────────────────────────────────────────────────────

describe('списъкът на местата', () => {
  it('показва и НЕЗАПИСАНИТЕ · инак крие точно работата', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d1' });
    await deystviya.zapishiDelo('D-2', { ...DELO, myasto: 'Хисаря' }, { opId: 'op-d2' });
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'А ЕООД', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));

    expect(redove).toHaveLength(2);
    const hisarya = redove.find((r) => r.ime === 'Хисаря')!;
    expect(hisarya.zapisano).toBe(false);
    expect(hisarya.dela).toBe(1);
    const md = redove.find((r) => r.ime === 'Малинова Долина')!;
    expect(md.zapisano).toBe(true);
    expect(md.firma).toBe('А ЕООД');
  });

  it('и БРОИ живите дела на всяко · отпадналото не се брои', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d1' });
    await deystviya.zapishiDelo('D-2', DELO, { opId: 'op-d2' });
    await deystviya.zapishiDelo(
      'D-2',
      { ...DELO, sastoyanie: 'отпаднало' },
      { opId: 'op-d2-otp' },
    );

    const o = await ogledaloto(dnevnik);
    const md = mestata(o, zhivite([...o.dela.values()])).find((r) => r.ime === 'Малинова Долина')!;
    expect(md.dela).toBe(1);
  });

  it('записаното ИМЕ бие · то е написаното НАРОЧНО', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', { ...DELO, myasto: 'малинова долина' }, { opId: 'op-d' });
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: '', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));
    expect(redove).toHaveLength(1);
    expect(redove[0]!.ime).toBe('Малинова Долина');
  });
});

// ── 7 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на местата', () => {
  it('брои РАЗЛИЧНИТЕ имена · и нулата се записва', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d1' });
    await deystviya.zapishiDelo('D-2', { ...DELO, myasto: 'Хисаря' }, { opId: 'op-d2' });

    const o = await ogledaloto(dnevnik);
    const s = sveriMestata(o, zhivite([...o.dela.values()]), KOGATO);
    expect(s.vhod).toBe(2);
    expect(s.izhod).toBe(2);
    expect(s.nared).toBe(true);
  });

  it('и празната книга дава ЧЕСТНА нула', async () => {
    const { dnevnik } = stend();
    const o = await ogledaloto(dnevnik);
    const s = sveriMestata(o, [], KOGATO);
    expect(s.vhod).toBe(0);
    expect(s.izhod).toBe(0);
    expect(s.nared).toBe(true);
    expect(mestata(o, [])).toEqual([]);
  });

  it('дело с ПРАЗНО място не ражда безименен ред', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', { ...DELO, myasto: '' }, { opId: 'op-d' });

    const o = await ogledaloto(dnevnik);
    expect(mestata(o, zhivite([...o.dela.values()]))).toEqual([]);
    expect(sveriMestata(o, zhivite([...o.dela.values()]), KOGATO).nared).toBe(true);
  });
});
