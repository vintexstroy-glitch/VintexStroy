/**
 * ЧЕТЕЦЪТ, КОЙТО НАУЧАВА МОДЕЛА · резен 12.
 *
 * Тук се пази обещанието на резена, изречено с четири изречения:
 *   1. Питаме ВЕДНЪЖ — вторият файл със същата глава минава сам.
 *   2. Модел с ДРУГА глава НЕ се прилага; отпечатъкът пази.
 *   3. Ставката идва от РЕДА, не от сектора.
 *   4. Ред, който не се разчита, влиза в `propusnati` с думи защо.
 *
 * Всяко от четирите беше проверимо само на ръка, преди този файл.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import {
  belegNaModel,
  nameriModel,
  napraviModel,
  podskazhi,
  type ModelNaTablitsa,
} from '../src/iztochnik/model.js';
import {
  periodPoModel,
  razchetiPoModel,
  stavkaOtKletka,
  stavkaOtSuma,
} from '../src/iztochnik/razchitane.js';
import { prilozhi, sravni } from '../src/domein/aktualizatsiya.js';
import { smetki, sveriDDSZaPerioda } from '../src/domein/smetki.js';
import type { Izvor } from '../src/iztochnik/snimka.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-23T09:00:00.000Z';
const PERIOD = '2026-02';
const NASTROYKI = { potok: 'fakturi', sektor: 'pokupki-materiali', nachin: 'банка' as const };

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

function izvor(ime: string, otpechatak: string): Izvor {
  return { vid: 'csv', ime, golemina: 300, promenen: '2026-03-01T10:00:00.000Z', otpechatak };
}

/**
 * Глава на българско банково извлечение. Нарочно НЯМА колона „Доставчик" —
 * точно затова старият път по думи не я хваща и приложението трябва да пита.
 */
const OBB = 'Дата на вальор;Основание;Наредител;Сума по документа;Реф. номер;ДДС %';

const REDOVE = [
  '14.02.2026;цимент;Материали ООД;600,00;1042;20',
  '20.02.2026;нощувки;Хотел ЕООД;109,00;7788;9',
].join('\n');

function tablitsa(redove: string): ReturnType<typeof otCSV> {
  return otCSV(`${OBB}\n${redove}`);
}

function model(t = tablitsa(REDOVE)): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Банка ОББ',
    tablitsa: t,
    redNaGlavata: 0,
    koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 4, dds: 5 },
    ddsE: 'stavka',
  });
}

describe('старият път не хваща извлечението — затова се пита', () => {
  it('главата няма „Доставчик" и подсказката оставя контрагента за човека', () => {
    const t = tablitsa(REDOVE);
    const p = podskazhi(t, 0);
    // Дата и сума се познават по думи; „Наредител" — не.
    expect(p.data).toBe(0);
    expect(p.suma).toBe(3);
    expect(p.kontragent).toBeUndefined();
  });
});

describe('картата на хедъра', () => {
  it('прочита реда през казаните колони', () => {
    const t = tablitsa(REDOVE);
    const m = model(t);
    expect(periodPoModel(m, t)).toBe(PERIOD);

    const s = razchetiPoModel({ model: m, tablitsa: t, izvor: izvor('обб.csv', 'aaa'), period: PERIOD });
    expect(s.propusnati).toEqual([]);
    expect(s.redove.map((r) => r.koy)).toEqual(['Материали ООД', 'Хотел ЕООД']);
    expect(s.redove.map((r) => r.suma_st)).toEqual([600_00, 109_00]);
    expect(s.redove.map((r) => r.opis)).toEqual(['цимент', 'нощувки']);
  });

  it('ВТОРИЯТ файл със същата глава минава без питане', () => {
    const m = model();
    const vtori = tablitsa('28.02.2026;тухли;Тухли АД;240,00;9001;20');
    expect(nameriModel([m], vtori)).toBe(m);
  });

  it('модел с ДРУГА глава не се прилага — отпечатъкът пази', () => {
    const m = model();
    const drugaBanka = otCSV('Дата;Описание;Кредит;Дебит\n14.02.2026;нещо;10,00;0,00');
    expect(nameriModel([m], drugaBanka)).toBeUndefined();
  });

  it('белегът се мени, щом се мени картата — поправката не се преглъща', () => {
    const t = tablitsa(REDOVE);
    const parvi = model(t);
    const vtori = napraviModel({
      klyuch: 'Банка ОББ',
      tablitsa: t,
      redNaGlavata: 0,
      // същото име, друга колона за основание
      koloni: { data: 0, osnovanie: 2, kontragent: 1, suma: 3, dokument: 4, dds: 5 },
      ddsE: 'stavka',
    });
    expect(belegNaModel(vtori)).not.toBe(belegNaModel(parvi));
  });
});

describe('ставката идва от реда', () => {
  it('колоната дава 20% и 9% на два реда от един сектор', () => {
    const t = tablitsa(REDOVE);
    const s = razchetiPoModel({ model: model(t), tablitsa: t, izvor: izvor('обб.csv', 'bbb'), period: PERIOD });
    expect(s.redove.map((r) => r.stavka)).toEqual([20, 9]);
  });

  it('„20%", „20" и „0,20" са едно и също', () => {
    expect(stavkaOtKletka('20%')).toBe(20);
    expect(stavkaOtKletka(' 20 ')).toBe(20);
    expect(stavkaOtKletka('0,20')).toBe(20);
    expect(stavkaOtKletka('9')).toBe(9);
    expect(stavkaOtKletka('0')).toBe(0);
  });

  it('непозволена ставка НЕ се закръгля към най-близката — казва се', () => {
    expect(() => stavkaOtKletka('21')).toThrow(/не съществува/);
    expect(() => stavkaOtKletka('осемнайсет')).toThrow(/не е ставка/);
  });

  it('колона със СУМА на ДДС дава ставката наобратно', () => {
    expect(stavkaOtSuma(600_00, 100_00)).toBe(20);
    expect(stavkaOtSuma(109_00, 9_00)).toBe(9);
    expect(stavkaOtSuma(500_00, 0)).toBe(0);
    expect(() => stavkaOtSuma(600_00, 77_77)).toThrow(/нито една позволена ставка/);
  });

  it('крив ред влиза в „непрочетени" с думи защо — не се преглъща', () => {
    const t = tablitsa(`${REDOVE}\n25.02.2026;боя;Бои ООД;150,00;5000;21`);
    const s = razchetiPoModel({ model: model(t), tablitsa: t, izvor: izvor('обб.csv', 'ccc'), period: PERIOD });
    expect(s.redove).toHaveLength(2);
    expect(s.propusnati).toHaveLength(1);
    expect(s.propusnati[0]!.zashto).toMatch(/Ставка 21 не съществува/);
  });
});

describe('моделът живее в Журнала', () => {
  it('записан модел се намира през Огледалото и разчита втори файл', async () => {
    const { deystviya: d } = stend();
    const m = model();
    await d.zapishiModel(m, { opId: `model:${m.klyuch}:${belegNaModel(m)}` });

    const o = await d.ogledalo();
    expect(o.modeli.get('Банка ОББ')?.otpechatak).toBe(m.otpechatak);

    const vtori = tablitsa('28.02.2026;тухли;Тухли АД;240,00;9001;20');
    const namerensh = nameriModel([...o.modeli.values()], vtori);
    expect(namerensh).toBeDefined();

    const s = razchetiPoModel({
      model: namerensh!,
      tablitsa: vtori,
      izvor: izvor('обб-2.csv', 'ddd'),
      period: PERIOD,
    });
    expect(s.redove.map((r) => r.koy)).toEqual(['Тухли АД']);
  });

  it('поправена карта е НОВО събитие върху същата същност, не втори модел', async () => {
    const { deystviya: d } = stend();
    const t = tablitsa(REDOVE);
    const parvi = model(t);
    await d.zapishiModel(parvi, { opId: `model:${parvi.klyuch}:${belegNaModel(parvi)}` });

    const popraven = napraviModel({
      klyuch: 'Банка ОББ',
      tablitsa: t,
      redNaGlavata: 0,
      koloni: { data: 0, osnovanie: 2, kontragent: 1, suma: 3, dokument: 4, dds: 5 },
      ddsE: 'stavka',
    });
    await d.zapishiModel(popraven, { opId: `model:${popraven.klyuch}:${belegNaModel(popraven)}` });

    const o = await d.ogledalo();
    expect(o.modeli.size).toBe(1);
    expect(o.modeli.get('Банка ОББ')?.koloni.osnovanie).toBe(2);
    // Нищо не е изтрито: и двата записа стоят в Журнала.
    expect((await d.sabitiya()).filter((x) => x.type === 'МоделЗаписан')).toHaveLength(2);
  });
});

describe('ставката на реда стига до Сметки', () => {
  it('един сектор с два процента дава ДВА реда в разбивката, не среден', async () => {
    const { deystviya: d } = stend();
    const t = tablitsa(REDOVE);
    const s = razchetiPoModel({ model: model(t), tablitsa: t, izvor: izvor('обб.csv', 'eee'), period: PERIOD });
    await prilozhi(d, sravni(await d.ogledalo(), s), NASTROYKI, KOGATO);

    const sm = smetki(await d.ogledalo(), PERIOD, KOGATO);
    const vhod = sm.dds.filter((r) => r.strana === 'вход');
    expect(vhod.map((r) => r.stavka).sort((a, b) => a - b)).toEqual([9, 20]);
    // 600,00 при 20% дава 100,00; 109,00 при 9% дава 9,00.
    expect(sm.dds_vhod_st).toBe(109_00);
    // Партидата пак затваря: разбивката по ставки не изпуска цент.
    expect(sm.nared).toBe(true);
  });
});

describe('сверката на ДДС · къде е липсата', () => {
  it('движение в банката без фактура СВЕТИ, с посочено кое е', async () => {
    const { deystviya: d } = stend();
    const t = tablitsa(REDOVE);
    const s = razchetiPoModel({ model: model(t), tablitsa: t, izvor: izvor('обб.csv', 'fff'), period: PERIOD });
    await prilozhi(d, sravni(await d.ogledalo(), s), NASTROYKI, KOGATO);

    const r = sveriDDSZaPerioda(await d.ogledalo(), PERIOD);
    expect(r.svereno).toBe(false);
    expect(r.nesvarsheni.map((n) => n.prichina)).toEqual(['lipsva-faktura', 'lipsva-faktura']);
    // Редът е както ги показват Сметки — най-новото движение отгоре.
    expect(r.nesvarsheni.map((n) => n.dvizhenie.dokument)).toEqual(['7788', '1042']);
  });

  it('разликата се смята и когато няма нищо — нулата е проверена', async () => {
    const { deystviya: d } = stend();
    const r = sveriDDSZaPerioda(await d.ogledalo(), PERIOD);
    expect(r.razlika_st).toBe(0);
    expect(r.ostava_st).toBe(0);
    expect(r.nesvarsheni).toEqual([]);
    expect(r.svereno).toBe(true);
  });

  it('въведената на ръка фактура затваря движението от извлечението', async () => {
    const { deystviya: d } = stend();
    // Човекът въвежда каквото знае: фактура 1042.
    await d.zapishiRazhod(
      'R:raka-1042',
      {
        potok: 'fakturi',
        dostavchik: 'Материали ООД',
        opis: 'цимент',
        suma_st: 600_00,
        sektor: 'pokupki-materiali',
        nachin: 'банка',
        data: '2026-02-14',
        dokument: '1042',
        stavka: 20,
      },
      { opId: 'raka:1042' },
    );

    // После се чете извлечението — то носи същия документ и още един.
    const t = tablitsa(REDOVE);
    const s = razchetiPoModel({ model: model(t), tablitsa: t, izvor: izvor('обб.csv', 'ggg'), period: PERIOD });
    await prilozhi(d, sravni(await d.ogledalo(), s), NASTROYKI, KOGATO);

    const r = sveriDDSZaPerioda(await d.ogledalo(), PERIOD);
    // 1042 се сдвои; остава само 7788 — точно липсата, която се търси.
    expect(r.nesvarsheni).toHaveLength(1);
    expect(r.nesvarsheni[0]!.dvizhenie.dokument).toBe('7788');
    expect(r.nesvarsheni[0]!.prichina).toBe('lipsva-faktura');
  });
});
