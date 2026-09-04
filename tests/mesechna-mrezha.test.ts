/**
 * КАЛЕНДАРЪТ · месечната мрежа с цифрите (резен 40 · M11 · И90 · ADR-100).
 *
 * Негова дума, дословно:
 *
 *   „…и общата сума на всички показан в Приходи когато дойде време и в
 *    календара. Както и всички приходи и разходи са с цифри в полето на
 *    календара." *(И90 · 23.08 · izvori/02:353)*
 *
 * Всяко число тук се проверява с НЕЗАВИСИМ ВТОРИ ПЪТ (умението `matematika`):
 * веднъж от мрежата, веднъж сметнато на ръка от съставките.
 *
 * Осемте обещания:
 *
 *   1. Седмицата почва в ПОНЕДЕЛНИК · и всеки ред е СЕДЕМ клетки, винаги.
 *   2. Мрежата покрива ЦЕЛИЯ месец · нито ден по-малко, нито повече.
 *   3. Чуждият ден стои, но е БЕЗ пари · той държи решетката, нищо друго.
 *   4. Двете числа НЕ се сливат · ден с равни приход и разход не е празен.
 *   5. Приходът е СЪБРАНОТО, не начисленото.
 *   6. Февруари в високосна година има 29 дни · и мрежата ги побира.
 *   7. Месецът напред и назад се смята от ПЕРИОДА, не с добавяне към дата.
 *   8. Сверката брои дните ↔ клетките · и нулата се записва (правило 7).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { sumiZaDen } from '../src/domein/otcheti.js';
import {
  DNITE_NA_SEDMITSATA,
  GreshkaMrezha,
  mrezhataNa,
  mrezhataNaMesetsa,
  sledvashtMesets,
  sveriMrezhata,
} from '../src/domein/mesechna-mrezha.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-08';

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

/** Един имот, един наем, начислен за периода · и вземането се връща. */
async function nasadi(d: Deystviya): Promise<string> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: 'op-i' });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Домакинство',
      naem_st: tsentove(500_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-n' },
  );
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });
  const o = await d.ogledalo();
  return [...o.vzemaniya.keys()][0]!;
}

// ── 1, 2 и 6 · ГОЛАТА МРЕЖА ───────────────────────────────────────────────

describe('голата мрежа', () => {
  it('почва в ПОНЕДЕЛНИК · и всеки ред е СЕДЕМ клетки', () => {
    expect(DNITE_NA_SEDMITSATA[0]).toBe('пн');
    expect(DNITE_NA_SEDMITSATA).toHaveLength(7);
    const m = mrezhataNaMesetsa(PERIOD);
    for (const sedmitsa of m) expect(sedmitsa).toHaveLength(7);
    // 1 август 2026 е СЪБОТА · значи първата седмица носи пет чужди дни.
    expect(m[0]!.slice(0, 5).every((d) => d.startsWith('2026-07'))).toBe(true);
    expect(m[0]![5]).toBe('2026-08-01');
  });

  it('покрива ЦЕЛИЯ месец · нито ден по-малко, нито повече', () => {
    const svoi = mrezhataNaMesetsa(PERIOD).flat().filter((d) => d.startsWith('2026-08'));
    // Август има 31 дни · вторият път, на ръка.
    expect(svoi).toHaveLength(31);
    expect(svoi[0]).toBe('2026-08-01');
    expect(svoi[30]).toBe('2026-08-31');
    // И нито един ден не се повтаря.
    expect(new Set(svoi).size).toBe(31);
  });

  it('високосният февруари побира двайсет и деветте си дни', () => {
    const svoi = mrezhataNaMesetsa('2028-02').flat().filter((d) => d.startsWith('2028-02'));
    expect(svoi).toHaveLength(29);
    expect(svoi[28]).toBe('2028-02-29');
    // А 2026 не е високосна.
    expect(mrezhataNaMesetsa('2026-02').flat().filter((d) => d.startsWith('2026-02'))).toHaveLength(28);
  });

  it('месец, който почва в ПОНЕДЕЛНИК, няма чужди дни отпред', () => {
    // 1 юни 2026 е понеделник.
    const m = mrezhataNaMesetsa('2026-06');
    expect(m[0]![0]).toBe('2026-06-01');
  });

  it('а нечетимият период КРЕЩИ · празна мрежа би минала за месец без движение', () => {
    expect(() => mrezhataNaMesetsa('август')).toThrow(GreshkaMrezha);
    expect(() => mrezhataNaMesetsa('2026-8')).toThrow(/ГГГГ-ММ/);
    expect(() => mrezhataNaMesetsa('2026-13')).toThrow(/не съществува/);
  });
});

// ── 7 · МЕСЕЦЪТ НАПРЕД И НАЗАД ────────────────────────────────────────────

describe('месецът напред и назад', () => {
  it('се смята от ПЕРИОДА · 31 януари плюс месец не става 3 март', () => {
    expect(sledvashtMesets('2026-01', 1)).toBe('2026-02');
    expect(sledvashtMesets('2026-12', 1)).toBe('2027-01');
    expect(sledvashtMesets('2026-01', -1)).toBe('2025-12');
    expect(sledvashtMesets('2026-08', 0)).toBe('2026-08');
    expect(sledvashtMesets('2026-08', -12)).toBe('2025-08');
  });
});

// ── 3, 4, 5 и 8 · МРЕЖАТА С ПАРИТЕ ────────────────────────────────────────

describe('мрежата с парите', () => {
  it('слага числата в СВОЯ ден · и сборът е сметнатият на ръка', async () => {
    const { deystviya } = stend();
    const vzemaneId = await nasadi(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: tsentove(300_00), nachin: 'банка', data: '2026-08-10' },
      { opId: 'op-p' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'заплата',
        suma_st: tsentove(800_00),
        sektor: 'zaplati',
        nachin: 'в брой',
        data: '2026-08-12',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r' },
    );

    const m = mrezhataNa(await deystviya.ogledalo(), PERIOD);
    const kletki = m.sedmitsi.flat();
    const deseti = kletki.find((k) => k.data === '2026-08-10')!;
    const dvanaysti = kletki.find((k) => k.data === '2026-08-12')!;
    expect(deseti.prihod_st).toBe(300_00);
    expect(deseti.razhod_st).toBe(0);
    expect(dvanaysti.razhod_st).toBe(800_00);
    // ВТОРИЯТ ПЪТ, на ръка.
    expect(m.prihod_st).toBe(300_00);
    expect(m.razhod_st).toBe(800_00);
    expect(m.dniSPari).toBe(2);
  });

  it('двете числа НЕ се сливат · ден с равни приход и разход не е празен', async () => {
    const { deystviya } = stend();
    const vzemaneId = await nasadi(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: tsentove(500_00), nachin: 'банка', data: '2026-08-14' },
      { opId: 'op-p' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'заплата',
        suma_st: tsentove(500_00),
        sektor: 'zaplati',
        nachin: 'банка',
        data: '2026-08-14',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r' },
    );
    const m = mrezhataNa(await deystviya.ogledalo(), PERIOD);
    const den = m.sedmitsi.flat().find((k) => k.data === '2026-08-14')!;
    expect(den.prihod_st).toBe(500_00);
    expect(den.razhod_st).toBe(500_00);
    // Нетото би било нула и денят би изглеждал празен. Тук той НОСИ движение.
    expect(m.dniSPari).toBe(1);
  });

  it('чуждият ден стои, но е БЕЗ пари · той държи решетката, нищо друго', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'юлска заплата',
        suma_st: tsentove(900_00),
        sektor: 'zaplati',
        nachin: 'банка',
        // 31 юли 2026 е ПЕТЪК и стои в първата седмица на августовската мрежа.
        data: '2026-07-31',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r' },
    );
    const m = mrezhataNa(await deystviya.ogledalo(), PERIOD);
    const yulski = m.sedmitsi.flat().find((k) => k.data === '2026-07-31')!;
    expect(yulski.svoy).toBe(false);
    expect(yulski.razhod_st).toBe(0);
    // И НЕ влиза в сбора на месеца · инак августът би носил юлски пари.
    expect(m.razhod_st).toBe(0);
    expect(m.dniSPari).toBe(0);
  });

  it('приходът е СЪБРАНОТО, не начисленото', async () => {
    const { deystviya } = stend();
    // `nasadi` НАЧИСЛЯВА 500 €, но нищо не е платено.
    await nasadi(deystviya);
    const m = mrezhataNa(await deystviya.ogledalo(), PERIOD);
    expect(m.prihod_st).toBe(0);
    expect(m.dniSPari).toBe(0);
  });

  it('и празният месец е ПРАЗЕН, не изкривен', async () => {
    const { deystviya } = stend();
    const m = mrezhataNa(await deystviya.ogledalo(), PERIOD);
    expect(m.sedmitsi.flat().filter((k) => k.svoy)).toHaveLength(31);
    expect(m.prihod_st).toBe(0);
    expect(m.razhod_st).toBe(0);
  });
});

// ── 8 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на мрежата', () => {
  it('брои дните ↔ клетките · И ДВЕТЕ страни, не само прихода', async () => {
    const { deystviya } = stend();
    const vzemaneId = await nasadi(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: tsentove(300_00), nachin: 'банка', data: '2026-08-10' },
      { opId: 'op-p' },
    );
    // РАЗХОДЪТ Е ЗАДЪЛЖИТЕЛЕН ТУК (находка, резен 40): без него приходът и
    // сборът приход+разход са едно и също число, и сверка, която брои само
    // едната страна, минаваше — примерът не можеше да я различи.
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'заплата',
        suma_st: tsentove(800_00),
        sektor: 'zaplati',
        nachin: 'в брой',
        data: '2026-08-12',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r' },
    );
    const o = await deystviya.ogledalo();
    const sv = sveriMrezhata(o, PERIOD, KOGATO);
    // ВТОРИЯТ ПЪТ, на ръка · от самия `sumiZaDen`.
    let naRaka = 0;
    for (const d of sumiZaDen(o, PERIOD)) naRaka += d.prihod_st + d.razhod_st;
    expect(naRaka).toBe(300_00 + 800_00);
    expect(sv.vhod).toBe(naRaka);
    expect(sv.izhod).toBe(naRaka);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('и когато няма нито едно движение · нулата пак се записва (правило 7)', async () => {
    const { deystviya } = stend();
    const sv = sveriMrezhata(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(sv.vhod).toBe(0);
    expect(sv.izhod).toBe(0);
    expect(sv.razlika).toBe(0);
  });
});
