/**
 * ДДС · изважда се от общата цена.
 *
 * Най-важният тест тук не е примерът, а инвариантът:
 * основа + ДДС дава ТОЧНО общата — при всяка сума и всяка ставка.
 */

import { describe, expect, it } from 'vitest';
import {
  akumulator,
  AKUMULATORI,
  ddsOtObshta,
  GreshkaDDS,
  SEKTOR_PO_PODRAZBIRANE,
  sektoriNaNaem,
  stavkaNaReda,
  pozvolenaStavka,
  STAVKI,
} from '../src/domein/dds.js';
import { kakvoPishe } from '../src/yadro/pari.js';

describe('изваждане на ДДС от обща цена', () => {
  it('120,00 при 20% дава основа 100,00 и ДДС 20,00', () => {
    const r = ddsOtObshta(120_00, 20);
    expect(kakvoPishe(r.osnova_st)).toBe('100,00\u202F€');
    expect(kakvoPishe(r.dds_st)).toBe('20,00\u202F€');
  });

  it('1200,00 при 20% дава 1000,00 и 200,00', () => {
    const r = ddsOtObshta(1200_00, 20);
    expect(r.osnova_st).toBe(1000_00);
    expect(r.dds_st).toBe(200_00);
  });

  it('при 0% ДДС-то е нула, а основата е цялата сума', () => {
    const r = ddsOtObshta(1150_00, 0);
    expect(r.dds_st).toBe(0);
    expect(r.osnova_st).toBe(1150_00);
  });

  it('закръглява половинката нагоре, вместо да я отреже', () => {
    // 3 × 20 / 120 = 0,5 цента → 1
    expect(ddsOtObshta(3, 20).dds_st).toBe(1);
    // 1001 × 20 / 120 = 166,83… → 167
    expect(ddsOtObshta(10_01, 20).dds_st).toBe(167);
  });

  it('отрицателна сума (сторно) дава отрицателен ДДС със същия модул', () => {
    const plus = ddsOtObshta(120_00, 20);
    const minus = ddsOtObshta(-120_00, 20);
    expect(minus.dds_st).toBe(-plus.dds_st);
    expect(minus.osnova_st).toBe(-plus.osnova_st);
  });

  it('ИНВАРИАНТ · основа + ДДС == обща, за всяка сума и всяка ставка', () => {
    for (const stavka of [0, 9, 20]) {
      for (let suma = -1000; suma <= 10_000; suma += 1) {
        const r = ddsOtObshta(suma, stavka);
        expect(r.osnova_st + r.dds_st).toBe(suma);
      }
    }
  });

  it('дробна сума и дробна ставка се отказват на входа', () => {
    expect(() => ddsOtObshta(120.5, 20)).toThrow(GreshkaDDS);
    expect(() => ddsOtObshta(120_00, 20.5)).toThrow(GreshkaDDS);
    expect(() => ddsOtObshta(120_00, -20)).toThrow(GreshkaDDS);
  });
});

describe('акумулаторите', () => {
  it('са отделни по държава и сектор, не един общ', () => {
    expect(AKUMULATORI.length).toBeGreaterThan(1);
    const klyuchove = new Set(AKUMULATORI.map((a) => a.klyuch));
    expect(klyuchove.size).toBe(AKUMULATORI.length);
  });

  it('жилищният наем е 0%, търговският — 20%', () => {
    expect(akumulator('naem-zhilishten').stavka).toBe(0);
    expect(akumulator('naem-targovski').stavka).toBe(20);
  });

  it('непознат или липсващ сектор пада към подразбирането, не хвърля', () => {
    expect(akumulator(undefined).klyuch).toBe(SEKTOR_PO_PODRAZBIRANE);
    expect(akumulator('нещо, което не съществува').klyuch).toBe(SEKTOR_PO_PODRAZBIRANE);
  });

  it('за наем се предлагат само наемните сектори', () => {
    expect(sektoriNaNaem().map((a) => a.klyuch)).toEqual([
      'naem-zhilishten',
      'naem-targovski',
    ]);
  });
});

describe('ставката идва от РЕДА, не от сектора', () => {
  it('редът, който е казал ставката си, я налага', () => {
    // Негови думи: „ДДС е избор при въвеждане на всяка фактура."
    // Нощувка на 9% в сектор с подразбиране 20% — трябва да мине на 9.
    expect(stavkaNaReda('naem-targovski', 9)).toBe(9);
    expect(stavkaNaReda('naem-zhilishten', 20)).toBe(20);
    expect(stavkaNaReda('pokupki-materiali', 0)).toBe(0);
  });

  it('мълчалив ред взема подсказката на сектора', () => {
    expect(stavkaNaReda('naem-targovski')).toBe(20);
    expect(stavkaNaReda('naem-zhilishten')).toBe(0);
    expect(stavkaNaReda(undefined)).toBe(0); // подразбиращият се сектор
  });

  it('несъществуваща ставка се отказва С ЧИСЛАТА в думите', () => {
    // 21% от невнимание не бива да мине тихо в ДДС-справка.
    expect(() => stavkaNaReda('naem-targovski', 21)).toThrow(GreshkaDDS);
    expect(() => stavkaNaReda('naem-targovski', 21)).toThrow(/0%, 9%, 20%/);
    expect(() => stavkaNaReda('naem-targovski', -1)).toThrow(GreshkaDDS);
  });

  it('9% съществува — тя беше обявена в коментар, но я нямаше никъде', () => {
    expect(pozvolenaStavka(9)).toBe(true);
    expect(STAVKI).toEqual([0, 9, 20]);
  });
});

describe('пиновете · числата се твърдят с ръка (резен 46 · група В)', () => {
  it('акумулаторите са СЕДЕМ', () => {
    expect(AKUMULATORI).toHaveLength(7);
  });

  it('секторът по подразбиране е жилищният наем', () => {
    expect(SEKTOR_PO_PODRAZBIRANE).toBe('naem-zhilishten');
  });
});
