/**
 * ЧЕТЕНЕТО НА ИЗТОЧНИЦИ · CSV и Excel, без чужда библиотека.
 *
 * Три капана се пазят тук нарочно: разделителят у нас е „;", защото запетаята
 * е десетичният знак; клетка в кавички носи и разделителя, и нов ред; а
 * файлът често започва с BOM, който залепва за първото заглавие.
 */

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { otCSV, pogadniRazdelitel, tekstOtBaytove } from '../src/iztochnik/csv.js';
import { GreshkaXLSX, kolonaOtAdres, otXLSX } from '../src/iztochnik/xlsx.js';
import { bezPrazni, nameriGlavata, nameriKolona } from '../src/iztochnik/tablitsa.js';
import { GreshkaPDF, otPDF, tablitsaOtPDF } from '../src/iztochnik/pdf.js';

describe('CSV', () => {
  it('познава „;" когато запетаята е десетичен знак', () => {
    const t = otCSV('Място;Единица;Наем\nМалинова;АП. № 1;1150,50');
    expect(pogadniRazdelitel('а;б;в')).toBe(';');
    expect(t.redove[1]).toEqual(['Малинова', 'АП. № 1', '1150,50']);
  });

  it('чете и запетая, и табулация', () => {
    expect(otCSV('а,б,в\n1,2,3').redove[1]).toEqual(['1', '2', '3']);
    expect(otCSV('а\tб\n1\t2').redove[1]).toEqual(['1', '2']);
  });

  it('кавичките държат разделителя и новия ред вътре', () => {
    const t = otCSV('а;б\n"Малинова; бл. 1";"два\nреда"');
    expect(t.redove[1]).toEqual(['Малинова; бл. 1', 'два\nреда']);
  });

  it('двойна кавичка вътре в клетка', () => {
    expect(otCSV('а\n"той каза ""да"""').redove[1]).toEqual(['той каза "да"']);
  });

  it('BOM не залепва за първото заглавие', () => {
    const t = otCSV('﻿Място;Наем\nМалинова;100');
    expect(t.redove[0]![0]).toBe('Място');
  });

  it('празните редове отпадат при поискване', () => {
    const t = otCSV('а;б\n;\n1;2\n');
    expect(bezPrazni(t).redove).toHaveLength(2);
  });
});

describe('Excel · .xlsx направо, без библиотека', () => {
  it('чете листа, общите низове и числата', async () => {
    const danni = new Uint8Array(await readFile('tests/mostri/naemi.xlsx'));
    const listove = await otXLSX(danni, 'naemi.xlsx');

    expect(listove).toHaveLength(1);
    expect(listove[0]!.ime).toBe('Наеми');
    expect(listove[0]!.redove[0]).toEqual(['Място', 'Единица', 'Наем']);
    expect(listove[0]!.redove[1]).toEqual(['Малинова', 'АП. № 1', '1150.5']);
    expect(listove[0]!.redove[2]).toEqual(['Дианабад', 'ОФИС № 3', '800']);
  });

  it('намира главата и колоните по думи', async () => {
    const danni = new Uint8Array(await readFile('tests/mostri/naemi.xlsx'));
    const t = (await otXLSX(danni))[0]!;
    const glava = nameriGlavata(t, ['място', 'наем']);
    expect(glava).toBe(0);
    expect(nameriKolona(t, glava, 'наем')).toBe(2);
    expect(nameriKolona(t, glava, 'няма такава')).toBe(-1);
  });

  it('адресът на колоната пази дупките', () => {
    expect(kolonaOtAdres('A1')).toBe(0);
    expect(kolonaOtAdres('C2')).toBe(2);
    expect(kolonaOtAdres('Z9')).toBe(25);
    expect(kolonaOtAdres('AA1')).toBe(26);
    expect(kolonaOtAdres('AB100')).toBe(27);
  });

  it('отказва файл, който не е архив', async () => {
    await expect(otXLSX(new TextEncoder().encode('това не е xlsx'))).rejects.toThrow(GreshkaXLSX);
  });
});

describe('PDF · чете текста, казва когато не може', () => {
  it('вади редовете от свит поток', async () => {
    const danni = new Uint8Array(await readFile('tests/mostri/razhodi.pdf'));
    const prochetten = await otPDF(danni);

    expect(prochetten.imaTekst).toBe(true);
    expect(prochetten.redove[0]).toContain('Dostavchik');
    expect(prochetten.redove.join(' ')).toContain('600,00');
  });

  it('колоните се късат по разстоянието', async () => {
    const danni = new Uint8Array(await readFile('tests/mostri/razhodi.pdf'));
    const t = tablitsaOtPDF(await otPDF(danni), 'razhodi.pdf');
    expect(t.redove[1]).toEqual(['Materiali OOD', '600,00', '14.02.2026']);
    expect(t.redove[2]).toEqual(['Tok EAD', '120,00', '20.02.2026']);
  });

  it('отказва това, което не е PDF', async () => {
    await expect(otPDF(new TextEncoder().encode('нищо'))).rejects.toThrow(GreshkaPDF);
  });

  it('отказва шифрован PDF с думи какво да се направи', async () => {
    const shifrovan = new TextEncoder().encode('%PDF-1.4\n<< /Encrypt 9 0 R >>');
    await expect(otPDF(shifrovan)).rejects.toThrow(/без парола/);
  });
});

describe('кодировката на CSV', () => {
  it('CP1251 се чете като кирилица, не като маймуница', () => {
    // „Материали ООД" в windows-1251 — така го изнасят българските банки.
    const cp1251 = new Uint8Array([
      0xcc, 0xe0, 0xf2, 0xe5, 0xf0, 0xe8, 0xe0, 0xeb, 0xe8, 0x20, 0xce, 0xce, 0xc4,
    ]);
    expect(tekstOtBaytove(cp1251)).toBe('Материали ООД');
  });

  it('UTF-8 си остава UTF-8', () => {
    const utf8 = new TextEncoder().encode('Материали ООД');
    expect(tekstOtBaytove(utf8)).toBe('Материали ООД');
  });
});
