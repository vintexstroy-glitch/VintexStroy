/**
 * ПОЛЕТАТА С ФОРМУЛА В ОТЧЕТИ · между ВСИЧКИ таблици (резен 42 · M11 · ADR-102).
 *
 * Негова дума, дословно:
 *
 *   „За финанситее ще хледаш формулата ще правиш полета в Секция Отчети където
 *    ще се сложар полета които да покзват тези стойности с формули между всички
 *    таблици нак вероятно." *(И90 · 23.08 · izvori/02:353)*
 *
 * Всяко число тук се проверява с НЕЗАВИСИМ ВТОРИ ПЪТ (умението `matematika`).
 *
 * Осемте обещания:
 *
 *   1. Изворите идват от ТРИ различни таблици · това е „между всички".
 *   2. Изворите се ЧЕТАТ от живия код · броят им се брои, не се твърди.
 *   3. Четирите действия са СЪЩИТЕ като при колоните · не втори набор.
 *   4. Правилата кое с кое върви са СЪЩИТЕ · евро по евро няма смисъл.
 *   5. Счупена формула изобщо НЕ се записва.
 *   6. Поле не сочи СЕБЕ СИ · сбор със себе си е удвояване, не сметка.
 *   7. Липсващият извор НЕ се заглажда до нула · казва се ЗАЩО.
 *   8. Сверката брои сочени ↔ намерени извори · и нулата се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { GreshkaFormula, DEYSTVIYA_NA_FORMULA } from '../src/domein/formuli.js';
import {
  iztochnikPoKlyuch,
  iztochnitsiteNaChisla,
  vidNaIztochnika,
} from '../src/domein/iztochnitsi-na-chisla.js';
import {
  chakashtitePoleta,
  proveriPoleto,
  smetniPoleto,
  sveriPoletata,
  type PoleSFormula,
} from '../src/domein/pole-s-formula.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-08';
const OT = '2026-08-01';
const DO = '2026-08-31';

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

const pole = (p: Partial<PoleSFormula> & { id: string; lyavo: string; dyasno: string }): PoleSFormula => ({
  ime: 'Свое поле',
  deystvie: 'razlika',
  seq: 1,
  kogato: KOGATO,
  koy: 'vintexstroy@gmail.com',
  ...p,
});

async function izvori(deystviya: Deystviya) {
  return iztochnitsiteNaChisla(await deystviya.ogledalo(), PERIOD, OT, DO, KOGATO);
}

// ── 1 и 2 · ИЗВОРИТЕ ──────────────────────────────────────────────────────

describe('изворите на числа', () => {
  it('идват от ТРИ различни таблици · това е „между всички"', async () => {
    const { deystviya } = stend();
    const otkade = [...new Set((await izvori(deystviya)).map((i) => i.otkade))];
    expect(otkade).toEqual(['Отчети', 'Коефициенти', 'Данни на периода']);
  });

  it('и всеки носи ключ с ДОМА си в представката', async () => {
    const spisak = await izvori(deystviya0());
    expect(spisak.some((i) => i.klyuch.startsWith('otchet:'))).toBe(true);
    expect(spisak.some((i) => i.klyuch.startsWith('koef:'))).toBe(true);
    expect(spisak.some((i) => i.klyuch.startsWith('danni:'))).toBe(true);
    // И НИТО ЕДИН ключ не се повтаря · два еднакви биха слели два различни числа.
    const klyuchove = spisak.map((i) => i.klyuch);
    expect(new Set(klyuchove).size).toBe(klyuchove.length);
  });

  it('мярката се превежда до вида · пари→евро, пъти и дни→число', () => {
    expect(vidNaIztochnika('pari')).toBe('evro');
    expect(vidNaIztochnika('protsent')).toBe('protsent');
    expect(vidNaIztochnika('pati')).toBe('chislo');
    expect(vidNaIztochnika('dni')).toBe('chislo');
    expect(vidNaIztochnika('broy')).toBe('chislo');
  });

  it('и непознатият ключ връща НИЩО, не първия попаднал', async () => {
    const spisak = await izvori(deystviya0());
    expect(iztochnikPoKlyuch(spisak, 'няма:такъв')).toBeUndefined();
    expect(iztochnikPoKlyuch(spisak, 'danni:prihod_st')?.ime).toBe('Приход (събран)');
  });
});

function deystviya0(): Deystviya {
  return stend().deystviya;
}

// ── 3, 4, 5 и 6 · ПРОВЕРКАТА ──────────────────────────────────────────────

describe('проверката при създаване', () => {
  it('действията са СЪЩИТЕ като при колоните · не втори набор', () => {
    expect(DEYSTVIYA_NA_FORMULA).toEqual(['sbor', 'razlika', 'proizvedenie', 'protsent']);
  });

  it('разлика на две пари дава ПАРИ', async () => {
    const spisak = await izvori(deystviya0());
    expect(proveriPoleto('Свободен поток', 'razlika', 'danni:prihod_st', 'danni:razhod_st', spisak))
      .toBe('evro');
  });

  it('а евро по евро се отказва · правилото идва от formuli.ts', async () => {
    const spisak = await izvori(deystviya0());
    expect(() =>
      proveriPoleto('X', 'proizvedenie', 'danni:prihod_st', 'danni:razhod_st', spisak),
    ).toThrow(/евро по евро/);
  });

  it('и сбор на пари с брой се отказва · сборът иска ЕДИН вид', async () => {
    const spisak = await izvori(deystviya0());
    expect(() => proveriPoleto('X', 'sbor', 'danni:prihod_st', 'danni:dni', spisak))
      .toThrow(/ЕДИН вид/);
  });

  it('безименно поле се отказва с думи', async () => {
    const spisak = await izvori(deystviya0());
    expect(() => proveriPoleto('   ', 'razlika', 'danni:prihod_st', 'danni:razhod_st', spisak))
      .toThrow(GreshkaFormula);
  });

  it('непознато действие се отказва · и изброява кои са', async () => {
    const spisak = await izvori(deystviya0());
    expect(() => proveriPoleto('X', 'корен', 'danni:prihod_st', 'danni:razhod_st', spisak))
      .toThrow(/Изброените са/);
  });

  it('поле не сочи ЕДИН и същ извор два пъти', async () => {
    const spisak = await izvori(deystviya0());
    expect(() => proveriPoleto('X', 'sbor', 'danni:prihod_st', 'danni:prihod_st', spisak))
      .toThrow(/ЕДИН и същ извор/);
  });

  it('и извор, който го няма, се отказва ПОИМЕННО', async () => {
    const spisak = await izvori(deystviya0());
    expect(() => proveriPoleto('X', 'sbor', 'няма:такъв', 'danni:razhod_st', spisak))
      .toThrow(/Няма извор „няма:такъв"/);
    expect(() => proveriPoleto('X', 'sbor', 'danni:prihod_st', 'няма:такъв', spisak))
      .toThrow(/Няма извор „няма:такъв"/);
  });

  it('и ВРАТАТА не пуска счупено поле · нула събития', async () => {
    const { dnevnik, deystviya } = stend();
    await expect(
      deystviya.zapishiPole(
        'p-1',
        { ime: 'X', deystvie: 'proizvedenie', lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' },
        { period: PERIOD, ot: OT, do: DO },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(GreshkaFormula);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(0);
  });
});

// ── 7 · СМЕТКАТА ──────────────────────────────────────────────────────────

describe('сметката', () => {
  it('разликата се смята с ЦЕЛИ центове · и се проверява на ръка', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot('I-1', { adres: 'М', edinitsa: '1', ploshtad_kvsm: 0 }, { opId: 'op-i' });
    await deystviya.zapishiRazhod(
      'R-1',
      { potok: 'zaplati', dostavchik: 'Т', opis: 'заплата', suma_st: tsentove(800_00),
        sektor: 'zaplati', nachin: 'банка', data: '2026-08-12', dokument: '', stavka: 0 },
      { opId: 'op-r' },
    );
    const spisak = await izvori(deystviya);
    const s = smetniPoleto(
      pole({ id: 'p-1', ime: 'Свободен поток', deystvie: 'razlika',
             lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' }),
      spisak,
    );
    // ВТОРИЯТ ПЪТ, на ръка · от самите извори.
    const prihod = iztochnikPoKlyuch(spisak, 'danni:prihod_st')!.stoynost!;
    const razhod = iztochnikPoKlyuch(spisak, 'danni:razhod_st')!.stoynost!;
    expect(razhod).toBe(800_00);
    expect(s.stoynost).toBe(prihod - razhod);
    expect(s.vid).toBe('evro');
    expect(s.zashto).toBe('');
    expect(s.sDumi).toBe('разлика(Приход (събран) · Разход (всичко))');
  });

  it('ПРОИЗВЕДЕНИЕТО дели на сто ВЕДНЪЖ · центове × стотни', () => {
    // НАХОДКА (резен 42): само разликата беше смятана в тест, тъй че
    // произведението и процентът минаваха със сгрешена аритметика.
    // Изворите тук са ръчни, за да са числата кръгли и проверими с очи.
    const spisak = [
      { klyuch: 'a', ime: 'Наем', otkade: 'x', stoynost: 1_000_00, merka: 'pari' as const, zashto: '' },
      { klyuch: 'b', ime: 'Брой', otkade: 'x', stoynost: 3_00, merka: 'broy' as const, zashto: '' },
    ];
    const s = smetniPoleto(
      pole({ id: 'p-1', deystvie: 'proizvedenie', lyavo: 'a', dyasno: 'b' }),
      spisak,
    );
    // 1 000,00 € × 3,00 = 3 000,00 € · ВТОРИЯТ ПЪТ, на ръка:
    // 100 000 цента × 300 стотни / 100 = 300 000 цента.
    expect(s.stoynost).toBe(3_000_00);
    expect(s.vid).toBe('evro');
  });

  it('и ПРОЦЕНТЪТ дели на десет хиляди · веднъж за стотните, веднъж за процента', () => {
    const spisak = [
      { klyuch: 'a', ime: 'Приход', otkade: 'x', stoynost: 2_000_00, merka: 'pari' as const, zashto: '' },
      { klyuch: 'b', ime: 'Дял', otkade: 'x', stoynost: 25_00, merka: 'protsent' as const, zashto: '' },
    ];
    const s = smetniPoleto(pole({ id: 'p-1', deystvie: 'protsent', lyavo: 'a', dyasno: 'b' }), spisak);
    // 25 % от 2 000,00 € = 500,00 € · на ръка: 200 000 × 2 500 / 10 000 = 50 000.
    expect(s.stoynost).toBe(500_00);
    expect(s.vid).toBe('evro');
  });

  it('и СБОРЪТ на две пари е прост сбор', () => {
    const spisak = [
      { klyuch: 'a', ime: 'Едно', otkade: 'x', stoynost: 700_00, merka: 'pari' as const, zashto: '' },
      { klyuch: 'b', ime: 'Друго', otkade: 'x', stoynost: 300_00, merka: 'pari' as const, zashto: '' },
    ];
    expect(smetniPoleto(pole({ id: 'p-1', deystvie: 'sbor', lyavo: 'a', dyasno: 'b' }), spisak).stoynost)
      .toBe(1_000_00);
    expect(smetniPoleto(pole({ id: 'p-2', deystvie: 'razlika', lyavo: 'a', dyasno: 'b' }), spisak).stoynost)
      .toBe(400_00);
  });

  it('липсващият извор НЕ се заглажда до нула · казва се ЗАЩО', async () => {
    const { deystviya } = stend();
    const spisak = await izvori(deystviya);
    // Коефициент без данни връща `undefined` и носи причината си (ADR-079).
    const bez = spisak.find((i) => i.stoynost === undefined);
    expect(bez, 'празен Журнал трябва да остави поне един коефициент несметнат').toBeDefined();
    // НАХОДКА (резен 42): дотук стоеше само `toContain(bez.zashto)` — а
    // `toContain('')` минава ВИНАГИ, тъй че загубата на причината не се
    // виждаше. Причината се твърди най-напред, че СЪЩЕСТВУВА.
    expect(bez!.zashto.length, 'извор без стойност е длъжен да каже защо').toBeGreaterThan(0);
    const s = smetniPoleto(
      pole({ id: 'p-1', deystvie: 'razlika', lyavo: bez!.klyuch, dyasno: 'danni:prihod_st' }),
      spisak,
    );
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain(bez!.ime);
    expect(s.zashto).toContain(bez!.zashto);
    // И НИТО ЕДИН несметнат извор не мълчи · всички носят думите си.
    for (const i of spisak.filter((x) => x.stoynost === undefined)) {
      expect(i.zashto.length, `„${i.ime}" няма стойност и не казва защо`).toBeGreaterThan(0);
    }
  });

  it('НЕПЪЛНИЯТ отчет не дава число · частичен сбор не се подава на формула', async () => {
    // НАХОДКА (резен 42): дотук отчетът подаваше сбора си ВИНАГИ, а „чака" беше
    // само надпис — тъй че поле върху Ликвидност без начално салдо показваше
    // сметнат отговор от частичен сбор. Числото изглеждаше цяло; сборът не беше.
    const spisak = await izvori(deystviya0());
    const lik = iztochnikPoKlyuch(spisak, 'otchet:likvidnost')!;
    expect(lik.zashto).toContain('чака');
    expect(lik.stoynost).toBeUndefined();
    // И ВСЕКИ извор без стойност носи думите си · нито един не мълчи.
    for (const i of spisak.filter((x) => x.stoynost === undefined)) {
      expect(i.zashto.length, `„${i.ime}" няма стойност и не казва защо`).toBeGreaterThan(0);
    }
    // А пълният отчет ДАВА число · отказът не е повсеместен.
    const palni = spisak.filter((i) => i.otkade === 'Отчети' && i.zashto === '');
    for (const i of palni) expect(i.stoynost).not.toBeUndefined();
  });

  it('и изчезналият извор се КАЗВА поименно, вместо да се брои за нула', async () => {
    const spisak = await izvori(deystviya0());
    const s = smetniPoleto(
      pole({ id: 'p-1', lyavo: 'няма:такъв', dyasno: 'danni:prihod_st' }),
      spisak,
    );
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain('няма:такъв');
    expect(s.sDumi).toContain('няма извор');
  });
});

// ── 8 · ЗАПИСЪТ И СВЕРКАТА ────────────────────────────────────────────────

describe('записът и сверката', () => {
  it('полето минава през Вратата и стои в Огледалото', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPole(
      'p-1',
      { ime: 'Свободен поток', deystvie: 'razlika', lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' },
      { period: PERIOD, ot: OT, do: DO },
      { opId: 'op-1' },
    );
    const o = await deystviya.ogledalo();
    expect(o.poletaSFormula.size).toBe(1);
    expect(o.poletaSFormula.get('p-1')!.ime).toBe('Свободен поток');
  });

  it('и ПОСЛЕДНИЯТ запис бие · поправката е ново събитие', async () => {
    const { dnevnik, deystviya } = stend();
    const dvete = { lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' };
    await deystviya.zapishiPole('p-1', { ime: 'Първо', deystvie: 'razlika', ...dvete },
      { period: PERIOD, ot: OT, do: DO }, { opId: 'op-1' });
    await deystviya.zapishiPole('p-1', { ime: 'Второ', deystvie: 'sbor', ...dvete },
      { period: PERIOD, ot: OT, do: DO }, { opId: 'op-2' });
    const o = await deystviya.ogledalo();
    expect(o.poletaSFormula.size).toBe(1);
    expect(o.poletaSFormula.get('p-1')!.ime).toBe('Второ');
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });

  it('сверката брои СОЧЕНИ ↔ НАМЕРЕНИ извора · по два на поле', async () => {
    const spisak = await izvori(deystviya0());
    const dobro = pole({ id: 'p-1', lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' });
    const sv = sveriPoletata([dobro], spisak, KOGATO);
    expect(sv.vhod).toBe(2);
    expect(sv.izhod).toBe(2);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('и ПАДА, когато поле сочи изчезнал извор', async () => {
    const spisak = await izvori(deystviya0());
    const gnilo = pole({ id: 'p-1', lyavo: 'няма:такъв', dyasno: 'danni:razhod_st' });
    const sv = sveriPoletata([gnilo], spisak, KOGATO);
    expect(sv.vhod).toBe(2);
    expect(sv.izhod).toBe(1);
    expect(sv.razlika).toBe(-1);
    expect(sv.nared).toBe(false);
  });

  it('без нито едно поле · нулата пак се записва (правило 7)', async () => {
    const spisak = await izvori(deystviya0());
    const sv = sveriPoletata([], spisak, KOGATO);
    expect(sv.vhod).toBe(0);
    expect(sv.izhod).toBe(0);
    expect(sv.razlika).toBe(0);
  });

  it('чакащите се БРОЯТ поименно, не се крият', async () => {
    const spisak = await izvori(deystviya0());
    const bez = spisak.find((i) => i.stoynost === undefined)!;
    const chakashto = pole({ id: 'p-1', lyavo: bez.klyuch, dyasno: 'danni:prihod_st' });
    const gotovo = pole({ id: 'p-2', lyavo: 'danni:prihod_st', dyasno: 'danni:razhod_st' });
    const chakat = chakashtitePoleta([chakashto, gotovo], spisak);
    expect(chakat).toHaveLength(1);
    expect(chakat[0]!.pole.id).toBe('p-1');
  });
});
