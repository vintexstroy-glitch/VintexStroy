/**
 * КОЙ ФАЙЛ С КОЙ ЧЕТЕЦ · домът на въпроса получава своя проверка.
 *
 * Файлът беше единственият нов от резен 60 без нито един тест: живееше през
 * прохода, тоест през браузър. А той е ЕДИН дом на правило (правило 17) —
 * пътят от името на файла до четеца. Дом без проверка не е дом.
 */

import { describe, expect, it } from 'vitest';
import { rabotnaKniga } from '../src/iznos/excel.js';
import { tablitsiSFormuli, tablitsiteNa, vidaNaFayla } from '../src/iztochnik/chetetsat.js';

/** Малка книга с ЕДНА формула · достатъчна, за да се види, че формулите минават. */
function knigaSFormula(): Uint8Array {
  return rabotnaKniga([
    {
      ime: 'Фактури',
      koloni: [{ ime: 'Доставчик' }, { ime: 'Основа' }],
      redove: [['Пощенска', 100]],
    },
  ]);
}

describe('видът се познава по ИМЕТО, не по съдържанието', () => {
  it('всяко от четирите имена води до своя четец', () => {
    expect(vidaNaFayla('приходи.xlsx')).toBe('xlsx');
    expect(vidaNaFayla('приходи.xlsb')).toBe('xlsb');
    expect(vidaNaFayla('договор.pdf')).toBe('pdf');
    expect(vidaNaFayla('извлечение.csv')).toBe('csv');
  });

  it('главните букви не правят друг файл', () => {
    expect(vidaNaFayla('ПРИХОДИ.XLSX')).toBe('xlsx');
    expect(vidaNaFayla('Приходи.XlsB')).toBe('xlsb');
  });

  it('непознатото окончание пада при CSV · не отказва', () => {
    expect(vidaNaFayla('нещо.txt')).toBe('csv');
    expect(vidaNaFayla('безокончание')).toBe('csv');
  });

  it('окончанието се чете НАКРАЯ, не където и да е в името', () => {
    expect(vidaNaFayla('xlsx-архив на приходите.csv')).toBe('csv');
    expect(vidaNaFayla('копие.xlsx.csv')).toBe('csv');
  });
});

describe('листовете идват от верния четец', () => {
  it('.xlsx се разчита като работна книга', async () => {
    const listove = await tablitsiteNa(knigaSFormula(), 'приходи.xlsx');
    expect(listove.map((l) => l.ime)).toEqual(['Фактури']);
    expect(listove[0]!.redove[1]).toEqual(['Пощенска', '100']);
  });

  it('.csv се разчита като текст', async () => {
    const danni = new TextEncoder().encode('А;Б\n1;2\n');
    const listove = await tablitsiteNa(danni, 'извлечение.csv');
    expect(listove[0]!.redove).toEqual([
      ['А', 'Б'],
      ['1', '2'],
    ]);
  });

  it('CSV, кръстен .xlsx, пада с думите на СВОЯ четец · не се познава мълчаливо', async () => {
    const danni = new TextEncoder().encode('А;Б\n1;2\n');
    await expect(tablitsiteNa(danni, 'излъган.xlsx')).rejects.toThrow(/архив/);
  });
});

describe('липсата на формули КАЗВА защо', () => {
  it('при .xlsx няма какво да се обяснява', async () => {
    const { formuli, bezFormuli } = await tablitsiSFormuli(knigaSFormula(), 'приходи.xlsx');
    expect(bezFormuli).toBe('');
    expect(formuli.map((f) => f.ime)).toEqual(['Фактури']);
  });

  it('при .csv причината е СВОЯ, не обща', async () => {
    const danni = new TextEncoder().encode('А;Б\n1;2\n');
    const { formuli, bezFormuli } = await tablitsiSFormuli(danni, 'извлечение.csv');
    expect(bezFormuli).toContain('CSV');
    expect(formuli[0]!.poKolona.size).toBe(0);
  });
});
