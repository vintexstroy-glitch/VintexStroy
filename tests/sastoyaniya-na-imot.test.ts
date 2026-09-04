/**
 * СЪСТОЯНИЯТА НА ИМОТА · номенклатура като етапите (резен 99 · ADR-157).
 *
 * Негово, 02.09: „Състояние и Статут е едно и стщо ползвай Състояние." И на
 * 03.09, на въпроса как да живее списъкът: **номенклатура от Настройки, като
 * етапите** — шест начални и растеж без код.
 *
 * Петте обещания:
 *
 *   1. Шестте му са с РЪКА · списък, изведен от кода, не е пин.
 *   2. Новото се ДОБАВЯ · след шестте, не между тях.
 *   3. Негово от начало НЕ се презаписва · и празното се отказва с думи.
 *   4. Записано два пъти · пак едно · последната дума за ключа бие.
 *   5. Адресът е `SASTOYANIE:<ключ>` · ключът е самото име.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  BAZOVI_SASTOYANIYA_NA_IMOT,
  GreshkaSastoyanieNaImot,
  proveriSastoyanieNaImot,
  sashtnostNaSastoyanie,
  sastoyaniyataNaImota,
  zemniteSastoyaniya,
} from '../src/domein/sastoyaniya-na-imot.js';
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
    chasovnik: () => new Date(Date.UTC(2026, 8, 3, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

describe('шестте начални', () => {
  it('са НЕГОВИТЕ · с ръка, не изведени от кода', () => {
    // Списък, прочетен от самия код, би минал и когато някой махне едно.
    expect([...BAZOVI_SASTOYANIYA_NA_IMOT]).toEqual([
      'Строителство',
      'Ремонт',
      'Наем',
      'Продажба',
      'Продаден',
      'Собствено ползване',
    ]);
  });

  it('и стоят в списъка на празна книга · базови, преди всичко добавено', async () => {
    const { dnevnik } = stend();
    const spisak = sastoyaniyataNaImota(await ogledaloto(dnevnik));
    expect(spisak.map((s) => s.klyuch)).toEqual([...BAZOVI_SASTOYANIYA_NA_IMOT]);
    expect(spisak.every((s) => s.bazov)).toBe(true);
  });
});

describe('отметката ЗЕМЯ · „земя е Имот с различен Статут" (резен 111 · ADR-170)', () => {
  it('по подразбиране НИТО ЕДНО състояние не е земя', async () => {
    const { dnevnik } = stend();
    const o = await ogledaloto(dnevnik);
    expect(sastoyaniyataNaImota(o).every((s) => !s.zemya)).toBe(true);
    expect(zemniteSastoyaniya(o).size).toBe(0);
  });

  it('отметката ляга и върху БАЗОВО състояние · те живеят в кода, не в запис', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.otbelezhiSastoyanieKatoZemya(
      { klyuch: 'Собствено ползване', zemya: true },
      { opId: 'op-z1' },
    );
    const o = await ogledaloto(dnevnik);
    expect([...zemniteSastoyaniya(o)]).toEqual(['Собствено ползване']);
    expect(sastoyaniyataNaImota(o).find((s) => s.klyuch === 'Собствено ползване')?.zemya).toBe(true);
  });

  it('и върху ДОБАВЕНО · имената са негови, кодът не ги гадае', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSastoyanieNaImot({ klyuch: 'Земя' }, { opId: 'op-z2' });
    await deystviya.otbelezhiSastoyanieKatoZemya({ klyuch: 'Земя', zemya: true }, { opId: 'op-z3' });
    expect([...zemniteSastoyaniya(await ogledaloto(dnevnik))]).toEqual(['Земя']);
  });

  it('маха се със СЪЩОТО събитие · последната дума бие, Журналът не се пипа', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.otbelezhiSastoyanieKatoZemya({ klyuch: 'Наем', zemya: true }, { opId: 'op-z4' });
    await deystviya.otbelezhiSastoyanieKatoZemya({ klyuch: 'Наем', zemya: false }, { opId: 'op-z5' });
    expect(zemniteSastoyaniya(await ogledaloto(dnevnik)).size).toBe(0);
  });

  it('отметка върху дума ИЗВЪН менюто се отказва с думи', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.otbelezhiSastoyanieKatoZemya({ klyuch: 'Ливада', zemya: true }, { opId: 'op-z6' }),
    ).rejects.toThrow(/Няма състояние/);
  });
});

describe('растежът', () => {
  it('новото се ДОБАВЯ · след шестте, и се знае, че е добавено', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSastoyanieNaImot({ klyuch: 'в ремонт по проект' }, { opId: 'op-1' });

    const spisak = sastoyaniyataNaImota(await ogledaloto(dnevnik));
    expect(spisak).toHaveLength(BAZOVI_SASTOYANIYA_NA_IMOT.length + 1);
    expect(spisak.at(-1)).toEqual({ klyuch: 'в ремонт по проект', bazov: false, zemya: false });
    // Шестте не мърдат от мястото си.
    expect(spisak[0]!.klyuch).toBe('Строителство');
  });

  it('записано ДВА ПЪТИ · пак едно · последната дума за ключа бие', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSastoyanieNaImot({ klyuch: 'Замразен' }, { opId: 'op-1' });
    await deystviya.zapishiSastoyanieNaImot({ klyuch: 'Замразен' }, { opId: 'op-2' });

    const o = await ogledaloto(dnevnik);
    expect(sastoyaniyataNaImota(o).filter((s) => s.klyuch === 'Замразен')).toHaveLength(1);
    // Историята е цяла · Журналът пази и двата записа (правило 1).
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });

  it('и празните интервали падат · „ Замразен " е същото състояние', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSastoyanieNaImot({ klyuch: '  Замразен  ' }, { opId: 'op-1' });
    expect(sastoyaniyataNaImota(await ogledaloto(dnevnik)).at(-1)!.klyuch).toBe('Замразен');
  });
});

describe('отказите', () => {
  it('негово от НАЧАЛО не се презаписва · вече стои в менюто', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiSastoyanieNaImot({ klyuch: 'Наем' }, { opId: 'op-1' }),
    ).rejects.toThrow(GreshkaSastoyanieNaImot);
    expect(() => proveriSastoyanieNaImot('Продаден')).toThrow(/от начало/);
  });

  it('и празното се отказва с ДУМИ · състояние без дума не се избира', () => {
    expect(() => proveriSastoyanieNaImot('   ')).toThrow(GreshkaSastoyanieNaImot);
    expect(() => proveriSastoyanieNaImot('')).toThrow(/иска име/);
  });
});

describe('адресът на същността', () => {
  it('е `SASTOYANIE:<ключ>` · ключът е самото име', () => {
    expect(sashtnostNaSastoyanie('Замразен')).toBe('SASTOYANIE:Замразен');
  });
});
