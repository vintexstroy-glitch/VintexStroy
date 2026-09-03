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
 * Единайсетте обещания (седемте от резен 31 плюс четирите на резен 99 · ADR-157):
 *
 *   1. Мястото се записва · с фирма и папка, и двете ПО ИЗБОР.
 *   2. Празно име отказва с ДУМИ · името е и адресът.
 *   3. Свързва се по СВЕДЕНО име · „Малинова Долина" = „малинова долина ".
 *   4. Второто записване ПОПРАВЯ · не ражда второ място.
 *   5. Двата отговорника НЕ се смесват · фирма на мястото, човек на делото.
 *   6. Незаписаните места СЕ ПОКАЗВАТ · списък само от записаните крие работата.
 *   7. Сверката брои различните имена · и нулата се казва.
 *   8. Имотът носи СТОЙНОСТ · КВАДРАТУРА · СЪСТОЯНИЕ, и трите по избор (03.09).
 *   9. Липсващото поле НЕ трие · подадената нула чисти.
 *  10. Обектите ИЗВЕЖДАТ своя Имот · „невписан", докато не се впише.
 *  11. Обект без имот или без единица се отказва с ДУМИ.
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
  proveriImota,
  proveriMyastoto,
  proveriObekta,
  sashtnostNaMyastoto,
  svedenotoMyasto,
  sveriMestata,
} from '../src/domein/mesta.js';
import { sastoyaniyataNaImota } from '../src/domein/sastoyaniya-na-imot.js';
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
  it('срещаното САМО ПО ДЕЛАТА пак не се реди · И124 т.7 стои', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d1' });
    await deystviya.zapishiDelo('D-2', { ...DELO, myasto: 'Хисаря' }, { opId: 'op-d2' });
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: 'А ЕООД', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));

    // „Тук се появяват само заредените обекти" — Хисаря само се среща по
    // делата и НЕ се реди; делото ѝ обаче си работи (myastotoNa го пази).
    expect(redove).toHaveLength(1);
    const md = redove[0]!;
    expect(md.ime).toBe('Малинова Долина');
    expect(md.firma).toBe('А ЕООД');
    expect(md.dela).toBe(1);
  });

  it('и носи КОЙ е записал · „отговорник е този който извършва действието"', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: '', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));
    expect(redove[0]!.koy).toBe(myastotoNa(o, 'Малинова Долина')!.koy);
    expect(redove[0]!.koy.length > 0).toBe(true);
  });

  it('и БРОИ живите дела на всяко · отпадналото не се брои', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: '', papka: '' },
      { opId: 'op-m-broy' },
    );
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
  it('брои ЗАПИСАНИТЕ · срещаното по делата не влиза', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo('D-1', DELO, { opId: 'op-d1' });
    await deystviya.zapishiDelo('D-2', { ...DELO, myasto: 'Хисаря' }, { opId: 'op-d2' });
    await deystviya.zapishiMyasto(
      { ime: 'Малинова Долина', firma: '', papka: '' },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const s = sveriMestata(o, zhivite([...o.dela.values()]), KOGATO);
    expect(s.vhod).toBe(1);
    expect(s.izhod).toBe(1);
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

// ── 8 и 9 · ТРИТЕ ПОЛЕТА НА ИМОТА (резен 99 · ADR-157) ────────────────────

const OBEKT = { adres: 'Малинова Долина', edinitsa: 'ап. 4', ploshtad_kvsm: 723_000 };

describe('трите полета на имота', () => {
  it('се записват · стойност в ЦЕНТОВЕ, квадратура в кв. САНТИМЕТРИ, състояние от списъка', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      {
        ime: 'Малинова Долина',
        firma: '',
        papka: '',
        stoynost_st: 25_000_000,
        kvadratura_kvsm: 12_405_000,
        sastoyanie: 'Строителство',
      },
      { opId: 'op-1' },
    );

    const m = myastotoNa(await ogledaloto(dnevnik), 'Малинова Долина')!;
    expect(m.stoynost_st).toBe(25_000_000);
    expect(m.kvadratura_kvsm).toBe(12_405_000);
    expect(m.sastoyanie).toBe('Строителство');
  });

  it('и трите са ПО ИЗБОР · имот само с име е нула, нула и празно', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: '', papka: '' }, { opId: 'op-1' });

    const m = myastotoNa(await ogledaloto(dnevnik), 'Хисаря')!;
    expect(m.stoynost_st).toBe(0);
    expect(m.kvadratura_kvsm).toBe(0);
    expect(m.sastoyanie).toBe('');
  });

  it('числата са ЦЕЛИ и не под нулата · дробното значи евро вместо центове', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiMyasto(
        { ime: 'Хисаря', firma: '', papka: '', stoynost_st: 250_000.5 },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(GreshkaMyasto);
    await expect(
      deystviya.zapishiMyasto(
        { ime: 'Хисаря', firma: '', papka: '', kvadratura_kvsm: -1 },
        { opId: 'op-2' },
      ),
    ).rejects.toThrow(/не под нулата/);
  });

  it('състоянието е от НОМЕНКЛАТУРАТА · непознатото се отказва и изрежда списъка', async () => {
    const { dnevnik, deystviya } = stend();
    await expect(
      deystviya.zapishiMyasto(
        { ime: 'Хисаря', firma: '', papka: '', sastoyanie: 'на топло' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/Строителство · Ремонт/);

    // А ДОБАВЕНОТО от Настройки минава · същият списък, порасъл с едно.
    await deystviya.zapishiSastoyanieNaImot({ klyuch: 'на топло' }, { opId: 'op-2' });
    await deystviya.zapishiMyasto(
      { ime: 'Хисаря', firma: '', papka: '', sastoyanie: 'на топло' },
      { opId: 'op-3' },
    );
    expect(myastotoNa(await ogledaloto(dnevnik), 'Хисаря')!.sastoyanie).toBe('на топло');
  });

  it('и празното състояние минава · то значи „още не е казано"', () => {
    const chisto = proveriImota({ ime: 'Х', firma: '', papka: '', sastoyanie: '' }, []);
    expect(chisto.sastoyanie).toBe('');
  });

  it('ЛИПСВАЩОТО поле НЕ трие · поправка на фирмата пази стойността', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Хисаря', firma: 'А ЕООД', papka: '', stoynost_st: 100_00, sastoyanie: 'Наем' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: 'Б ЕООД', papka: '' }, { opId: 'op-2' });

    const m = myastotoNa(await ogledaloto(dnevnik), 'Хисаря')!;
    expect(m.firma).toBe('Б ЕООД');
    expect(m.stoynost_st).toBe(100_00);
    expect(m.sastoyanie).toBe('Наем');
    expect(m.seq).toBe(1);
  });

  it('а подадената НУЛА чисти · нулата е решение, липсата не е', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiMyasto(
      { ime: 'Хисаря', firma: '', papka: '', stoynost_st: 100_00, sastoyanie: 'Наем' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiMyasto(
      { ime: 'Хисаря', firma: '', papka: '', stoynost_st: 0, sastoyanie: '' },
      { opId: 'op-2' },
    );

    const m = myastotoNa(await ogledaloto(dnevnik), 'Хисаря')!;
    expect(m.stoynost_st).toBe(0);
    expect(m.sastoyanie).toBe('');
  });
});

// ── 10 · ИМОТИТЕ, ИЗВЕДЕНИ ОТ ОБЕКТИТЕ ────────────────────────────────────

describe('имотите по обектите', () => {
  it('обектът ИЗВЕЖДА своя имот · с белег „невписан" и с брой обекти', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot('I-1', OBEKT, { opId: 'op-o1' });
    await deystviya.dobaviImot('I-2', { ...OBEKT, edinitsa: 'ап. 5' }, { opId: 'op-o2' });

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));
    expect(redove).toHaveLength(1);
    expect(redove[0]!.ime).toBe('Малинова Долина');
    expect(redove[0]!.vpisan).toBe(false);
    expect(redove[0]!.obekti).toBe(2);
    expect(redove[0]!.koy).toBe('');
  });

  it('вписването го ДОПЪЛВА · един ред, не два', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot('I-1', OBEKT, { opId: 'op-o' });
    await deystviya.zapishiMyasto(
      { ime: 'малинова долина', firma: 'А ЕООД', papka: '', stoynost_st: 500_00 },
      { opId: 'op-m' },
    );

    const o = await ogledaloto(dnevnik);
    const redove = mestata(o, zhivite([...o.dela.values()]));
    expect(redove).toHaveLength(1);
    expect(redove[0]!.vpisan).toBe(true);
    expect(redove[0]!.firma).toBe('А ЕООД');
    expect(redove[0]!.obekti).toBe(1);
    // ЗАПИСАНОТО ИМЕ бие и над правописа на обекта.
    expect(redove[0]!.ime).toBe('малинова долина');
  });

  it('и сверката брои ВПИСАНИТЕ И ИЗВЕДЕНИТЕ · входът се смята втори път', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot('I-1', OBEKT, { opId: 'op-o' });
    await deystviya.zapishiMyasto({ ime: 'Хисаря', firma: '', papka: '' }, { opId: 'op-m' });

    const o = await ogledaloto(dnevnik);
    const s = sveriMestata(o, zhivite([...o.dela.values()]), KOGATO);
    expect(s.vhod).toBe(2);
    expect(s.izhod).toBe(2);
    expect(s.nared).toBe(true);
  });
});

// ── 11 · ПАЗАЧЪТ НА ОБЕКТА ────────────────────────────────────────────────

describe('обектът', () => {
  it('без ИМОТ се отказва с думи · адресът Е името на имота му', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.dobaviImot('I-1', { ...OBEKT, adres: '   ' }, { opId: 'op-1' }),
    ).rejects.toThrow(/обект без имот няма/i);
  });

  it('и без ЕДИНИЦА · инак два обекта на един имот не се различават', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.dobaviImot('I-1', { ...OBEKT, edinitsa: '' }, { opId: 'op-1' }),
    ).rejects.toThrow(/не се различават/);
    expect(() => proveriObekta('Малинова', ' ')).toThrow(GreshkaMyasto);
  });

  it('а интервалите падат · „ Малинова " е същият имот', () => {
    expect(proveriObekta('  Малинова  ', ' ап. 4 ')).toEqual({
      adres: 'Малинова',
      edinitsa: 'ап. 4',
    });
  });

  it('и поправката минава през същия пазач', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot('I-1', OBEKT, { opId: 'op-1' });
    await expect(
      deystviya.popraviImot(
        { imotId: 'I-1', ...OBEKT, edinitsa: '', prichina: 'грешка' },
        { opId: 'op-2' },
      ),
    ).rejects.toThrow(GreshkaMyasto);
  });
});

// ── номенклатурата се среща със списъка ───────────────────────────────────

describe('списъкът на състоянията', () => {
  it('стига до проверката · шестте базови минават без нито един запис', async () => {
    const { dnevnik } = stend();
    const spisak = sastoyaniyataNaImota(await ogledaloto(dnevnik));
    expect(proveriImota({ ime: 'Х', firma: '', papka: '', sastoyanie: 'Ремонт' }, spisak).sastoyanie)
      .toBe('Ремонт');
  });
});
