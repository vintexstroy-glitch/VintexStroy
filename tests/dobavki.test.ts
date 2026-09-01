/**
 * ДОБАВКИТЕ · Стопанинът добавя колона към ВГРАДЕНА таблица (резен 79 ·
 * ADR-137) — пилотът е Имоти.
 *
 * Какво пазят тестовете, поименно:
 *
 *   1. Празният модел е ЗАКОНЕН вход за Редактора — и се ражда само за
 *      вградени от поименния списък.
 *   2. Записът на клетка минава ВСИЧКИТЕ проверки: списъкът · родена колона ·
 *      затворена (правило 23) · видът ↔ полето (правило 3) · жив ред.
 *   3. Последната дума БИЕ, а сторното на ПЪРВОТО писане гаси клетката —
 *      седмият вид с поправка на място.
 *   4. Регистърът на таблиците НЕ ражда двойник: наслагваемият модел слива
 *      добавките във вградения ред, вместо да се брои втори път.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  eVgradenKlyuch,
  klyuchNaKletka,
  prazenModelZaVgradena,
  VGRADEN_IMOTI,
  VGRADENI_S_DOBAVKI,
} from '../src/domein/dobavki.js';
import { dobaviKolona, smeniVidNaStoynost } from '../src/domein/redaktor.js';
import { tablitsiteNaProgramata } from '../app/tablitsite.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 8, 1, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

/** Ражда имот и модел с една текстова и една еврова добавка. */
async function sImotIDveKoloni(d: Deystviya): Promise<void> {
  await d.dobaviImot(
    'IM-1',
    { adres: 'Малинова', edinitsa: 'ап. 12', ploshtad_kvsm: 0 },
    { opId: 'op-imot' },
  );
  let m = dobaviKolona(prazenModelZaVgradena(VGRADEN_IMOTI), {
    ime: 'Бележка',
    rolya: 'sobstvenik',
  });
  m = dobaviKolona(m, { ime: 'Капаро', rolya: 'sobstvenik' });
  m = smeniVidNaStoynost(m, 1, 'evro', 'sobstvenik');
  await d.zapishiModel(m, { opId: 'op-model' });
}

// ── 1 · ПРАЗНИЯТ МОДЕЛ И ПОИМЕННИЯТ СПИСЪК ─────────────────────────────────

describe('празният модел на вградена', () => {
  it('се ражда само за вградените от поименния списък', () => {
    // Ключът е ЗАКОВАН с ръка: правата и клетките се записват на него, и
    // тиха смяна би ги откачила от таблицата им (`app/tablitsite.ts`).
    expect(VGRADEN_IMOTI).toBe('vgraden:imoti');
    expect(VGRADENI_S_DOBAVKI).toEqual([VGRADEN_IMOTI]);
    expect(eVgradenKlyuch(VGRADEN_IMOTI)).toBe(true);
    expect(eVgradenKlyuch('Банка ОББ')).toBe(false);
    expect(() => prazenModelZaVgradena('vgraden:naemi')).toThrow(/поименен/);
    expect(() => prazenModelZaVgradena('Банка ОББ')).toThrow(/поименен/);
  });

  it('е законен вход за Редактора · първата колона тръгва от нула', () => {
    const m = prazenModelZaVgradena(VGRADEN_IMOTI);
    expect(m.glavi).toHaveLength(0);
    const s = dobaviKolona(m, { ime: 'Бележка', rolya: 'sobstvenik' });
    expect(s.glavi).toEqual(['Бележка']);
    expect(s.klyuch).toBe(VGRADEN_IMOTI);
  });

  it('и не разпознава файлове · празната глава не е хедър', () => {
    expect(prazenModelZaVgradena(VGRADEN_IMOTI).otpechatak).toBe('');
  });
});

// ── 2 · ПРОВЕРКИТЕ НА ЗАПИСА, поименно ─────────────────────────────────────

describe('записът на клетка отказва с думи', () => {
  it('таблица извън списъка', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: 'vgraden:naemi', redId: 'N-1', kolona: 0, stoynost: 'х' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/поименния списък/);
  });

  it('колона, която не е родена от Настройки', async () => {
    const { deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 5, stoynost: 'х' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/няма сред добавките/);
  });

  it('затворена колона · правило 23, не пише никой', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'IM-1',
      { adres: 'Малинова', edinitsa: 'ап. 12', ploshtad_kvsm: 0 },
      { opId: 'op-imot' },
    );
    const m = dobaviKolona(prazenModelZaVgradena(VGRADEN_IMOTI), {
      ime: 'Пренесено',
      rolya: 'sobstvenik',
      zatvorena: true,
    });
    await deystviya.zapishiModel(m, { opId: 'op-model' });
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost: 'х' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/затворена/);
  });

  it('видът ↔ полето · евро без центове или текст с центове', async () => {
    const { deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    // еврова колона с текст — правило 3 пада на глас
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 1, stoynost: '100' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/цели центове/);
    // текстова колона с центове — същата проверка, обратната посока
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost_st: 100_00 },
        { opId: 'op-2' },
      ),
    ).rejects.toThrow(/носи текст/);
  });

  it('ред, който го няма сред имотите', async () => {
    const { deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    await expect(
      deystviya.zapishiKletkaNaDobavka(
        { tablitsa: VGRADEN_IMOTI, redId: 'IM-NYAMA', kolona: 0, stoynost: 'х' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/няма сред имотите/);
  });
});

// ── 3 · ПОСЛЕДНАТА ДУМА И СТОРНОТО ─────────────────────────────────────────

describe('клетката в Огледалото', () => {
  it('последната дума бие · и центовете лягат в stoynost_st', async () => {
    const { dnevnik, deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    const adres = klyuchNaKletka(VGRADEN_IMOTI, 'IM-1', 0);
    await deystviya.zapishiKletkaNaDobavka(
      { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost: 'първо' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiKletkaNaDobavka(
      { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost: 'второ' },
      { opId: 'op-2' },
    );
    await deystviya.zapishiKletkaNaDobavka(
      { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 1, stoynost_st: 1150_00 },
      { opId: 'op-3' },
    );
    const o = await ogledaloto(dnevnik);
    expect(o.dobavkiKletki.get(adres)?.stoynost).toBe('второ');
    expect(o.dobavkiKletki.get(adres)?.koy).toBe('vintexstroy@gmail.com');
    expect(o.dobavkiKletki.get(klyuchNaKletka(VGRADEN_IMOTI, 'IM-1', 1))?.stoynost_st).toBe(
      1150_00,
    );
  });

  it('сторно на ПЪРВОТО писане гаси клетката · дори след поправка', async () => {
    const { dnevnik, deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    await deystviya.zapishiKletkaNaDobavka(
      { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost: 'първо' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiKletkaNaDobavka(
      { tablitsa: VGRADEN_IMOTI, redId: 'IM-1', kolona: 0, stoynost: 'второ' },
      { opId: 'op-2' },
    );
    const parvoto = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (s) => s.type === 'КлеткаНаДобавкаЗаписана',
    )!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: parvoto.seq, prichina: 'грешна клетка' },
      { opId: 'op-st' },
    );
    const o = await ogledaloto(dnevnik);
    expect(o.dobavkiKletki.has(klyuchNaKletka(VGRADEN_IMOTI, 'IM-1', 0))).toBe(false);
  });
});

// ── 4 · РЕГИСТЪРЪТ БЕЗ ДВОЙНИК ─────────────────────────────────────────────

describe('регистърът на таблиците слива, не удвоява', () => {
  it('добавките се долепят след кодовите колони · ключът се брои ВЕДНЪЖ', async () => {
    const { dnevnik, deystviya } = stend();
    await sImotIDveKoloni(deystviya);
    const o = await ogledaloto(dnevnik);
    const redove = tablitsiteNaProgramata(o).filter((t) => t.klyuch === VGRADEN_IMOTI);
    expect(redove).toHaveLength(1);
    const imoti = redove[0]!;
    // шестте кодови + двете добавки, в този ред
    expect(imoti.glavi.slice(-2)).toEqual(['Бележка', 'Капаро']);
    expect(imoti.glavi.length).toBeGreaterThan(2);
  });

  it('затворена добавка се отмества с броя на кодовите колони', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot(
      'IM-1',
      { adres: 'Малинова', edinitsa: 'ап. 12', ploshtad_kvsm: 0 },
      { opId: 'op-imot' },
    );
    const m = dobaviKolona(prazenModelZaVgradena(VGRADEN_IMOTI), {
      ime: 'Пренесено',
      rolya: 'sobstvenik',
      zatvorena: true,
    });
    await deystviya.zapishiModel(m, { opId: 'op-model' });
    const o = await ogledaloto(dnevnik);
    const imoti = tablitsiteNaProgramata(o).find((t) => t.klyuch === VGRADEN_IMOTI)!;
    const kodovi = imoti.glavi.length - 1;
    expect(imoti.zatvoreni).toContain(kodovi);
  });
});
