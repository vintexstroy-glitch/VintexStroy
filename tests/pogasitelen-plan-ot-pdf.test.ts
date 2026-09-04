import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { otPDF } from '../src/iztochnik/pdf.js';
import {
  chisloOtPlana,
  dataOtPlana,
  fayltKazvaSbor,
  opIdNaPlanaOtPDF,
  prochetiPogasitelenPlan,
} from '../src/domein/pogasitelen-plan-ot-pdf.js';
import {
  LEVA_ZA_EVRO_STOHIL,
  otEvroVLeva,
  otLevaVEvro,
  vnoskaVEvro,
  ZNAK_NA_LEVA,
} from '../src/domein/zakonoviyat-lev.js';

/**
 * Мострата се строи с `node stroezh/mostri-pdf.mjs` и е ИЗМИСЛЕНА: неговият
 * истински план е поверителен и не влиза в публично хранилище (правило 29).
 * Капаните обаче са истински — шапка с етикети, осем колони, ПРОМЕНЛИВА лихва
 * (вноската скача от четвъртата) и собствен ред „Общо:".
 */
async function mostrata() {
  const danni = new Uint8Array(await readFile('tests/mostri/pogasitelen-plan.pdf'));
  return prochetiPogasitelenPlan((await otPDF(danni)).stranitsi);
}

describe('погасителният план · датите и числата на банката', () => {
  it('българската дата става наша', () => {
    expect(dataOtPlana('21.02.2025')).toBe('2025-02-21');
    expect(dataOtPlana('1.7.2024')).toBe('2024-07-01');
  });

  it('което не е дата, връща празно', () => {
    expect(dataOtPlana('Дата на ')).toBe('');
    expect(dataOtPlana('45.13.2025')).toBe('');
  });

  it('числото се чете и с точка, и със запетая, и с интервал за хиляди', () => {
    expect(chisloOtPlana('4 634.41')).toBe(463_441);
    expect(chisloOtPlana('1 336,38')).toBe(133_638);
    expect(chisloOtPlana(' 0.00')).toBe(0);
    expect(chisloOtPlana('BGN')).toBeNull();
  });
});

describe('законовият лев · курсът е закон, не пазар', () => {
  it('курсът е ЗАКОВАН и се пази с ръка', () => {
    // Пин с ръка: курс, който никой не проверява, е курс, който някой ще
    // „поправи". 1,95583 лева за едно евро, в стохилядни.
    expect(LEVA_ZA_EVRO_STOHIL).toBe(195_583);
    expect(ZNAK_NA_LEVA).toBe('BGN');
  });

  it('превръща по закона, със закръгляне към най-близкото', () => {
    expect(otLevaVEvro(195_583)).toBe(100_000);
    expect(otLevaVEvro(100_000)).toBe(51_129);
    // Обратното закръгля НАГОРЕ до цяло: 51 129 € са 99 999,64 лв. Затова той
    // поиска ДВЕТЕ числа — превалутирането е закръгляне, не равенство, и
    // оригиналът трябва да се вижда до превърнатото.
    expect(otEvroVLeva(51_129)).toBe(100_000);
    expect(otEvroVLeva(1)).toBe(2);
  });

  it('частите се превръщат, а вноската се СЪБИРА от тях', () => {
    // Вратата иска главница + лихва = вноска ТОЧНО. Ако и трите се превърнат
    // поотделно, закръглянето разминава сбора и записът пада — с право.
    const v = vnoskaVEvro(46_344, 13_363);
    expect(v.glavnitsa_st + v.lihva_st).toBe(v.vnoska_st);
    expect(v.glavnitsa_st).toBe(otLevaVEvro(46_344));
    expect(v.lihva_st).toBe(otLevaVEvro(13_363));
  });
});

describe('погасителният план · четене от истински ПДФ', () => {
  it('чете шапката поименно', async () => {
    const p = await mostrata();
    expect(p.shapka).toMatchObject({
      kreditopoluchatel: 'ПРИМЕР ЕООД',
      sdelka: '1234567',
      dogovor: 'BL00001',
      nachaloIzdalzhavane: '2035-02-21',
      krayIzdalzhavane: '2035-07-21',
      saldo_st: 294_000,
      valuta: 'BGN',
    });
  });

  it('чете всичките шест вноски · нула пропуснати', async () => {
    const p = await mostrata();
    expect(p.vnoski).toHaveLength(6);
    expect(p.nomera).toBe(6);
    expect(p.propusnati).toBe(0);
  });

  it('ПРОМЕНЛИВАТА лихва се вижда · вноската скача по средата (И135б)', async () => {
    const p = await mostrata();
    expect(p.vnoski[0]?.vnoska_st).toBe(60_000);
    expect(p.vnoski[3]?.vnoska_st).toBe(62_000);
    // Скокът е в ЛИХВАТА, не в главницата — точно както го прави банката.
    expect(p.vnoski[3]?.lihva_st).toBeGreaterThan(p.vnoski[0]!.lihva_st);
  });

  it('трите сверки затварят · и нулата се КАЗВА (правило 7)', async () => {
    const p = await mostrata();
    expect(p.nevarzaniChasti).toBe(0);
    expect(p.nevarzanoObshto).toBe(0);
    expect(p.sbor.obshto_st).toBe(368_700);
    expect(p.obyaven.obshto_st).toBe(368_700);
    expect(p.razlika).toEqual({
      glavnitsa_st: 0,
      lihva_st: 0,
      vnoska_st: 0,
      taksa_st: 0,
      zastrahovka_st: 0,
      obshto_st: 0,
    });
    expect(fayltKazvaSbor(p)).toBe(true);
  });

  it('таксата се ЧЕТЕ, макар да не се записва', async () => {
    const p = await mostrata();
    expect(p.sbor.taksa_st).toBe(2700);
    expect(p.vnoski[0]?.taksa_st).toBe(500);
    expect(p.vnoski[0]?.zastrahovka_st).toBe(0);
  });

  it('невързан ред се ХВАЩА · главница + лихва ≠ вноска', () => {
    const stranitsa = [
      { x: 40, y: 700, tekst: '1' },
      { x: 90, y: 700, tekst: '21.02.2026' },
      { x: 170, y: 700, tekst: '500.00' },
      { x: 240, y: 700, tekst: '100.00' },
      { x: 310, y: 700, tekst: '700.00' },
      { x: 380, y: 700, tekst: '5.00' },
      { x: 450, y: 700, tekst: '0.00' },
      { x: 520, y: 700, tekst: '705.00' },
    ];
    const p = prochetiPogasitelenPlan([stranitsa]);
    expect(p.vnoski).toHaveLength(1);
    expect(p.nevarzaniChasti).toBe(1);
    expect(p.nevarzanoObshto).toBe(0);
  });

  it('файл без ред „Общо:" го КАЗВА, вместо да измисля разлика', () => {
    const stranitsa = [
      { x: 40, y: 700, tekst: '1' },
      { x: 90, y: 700, tekst: '21.02.2026' },
      { x: 170, y: 700, tekst: '500.00' },
      { x: 240, y: 700, tekst: '100.00' },
      { x: 310, y: 700, tekst: '600.00' },
      { x: 380, y: 700, tekst: '5.00' },
      { x: 450, y: 700, tekst: '0.00' },
      { x: 520, y: 700, tekst: '605.00' },
    ];
    const p = prochetiPogasitelenPlan([stranitsa]);
    expect(fayltKazvaSbor(p)).toBe(false);
    expect(p.razlika.obshto_st).toBe(0);
  });

  it('`opId` носи договора · второ четене не слага втори план', () => {
    expect(opIdNaPlanaOtPDF('KR-1', 'BL00001')).toBe('plan-pdf:KR-1:BL00001');
    expect(opIdNaPlanaOtPDF('KR-1', 'BL00001')).toBe(opIdNaPlanaOtPDF('KR-1', 'BL00001'));
    expect(opIdNaPlanaOtPDF('KR-2', 'BL00001')).not.toBe(opIdNaPlanaOtPDF('KR-1', 'BL00001'));
  });

  it('празният вход не гърми · връща празен план', () => {
    const p = prochetiPogasitelenPlan([]);
    expect(p.vnoski).toHaveLength(0);
    expect(p.shapka.dogovor).toBe('');
  });
});
