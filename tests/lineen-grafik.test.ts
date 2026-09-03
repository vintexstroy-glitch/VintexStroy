import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { otPDF } from '../src/iztochnik/pdf.js';
import {
  dataOtGrafika,
  dniOtGrafika,
  opIdNaRedOtGrafika,
  predshestvenitsiOt,
  prochetiGrafik,
  stepeniteNa,
} from '../src/domein/lineen-grafik.js';

/**
 * Мострата се строи с `node stroezh/mostri-pdf.mjs` и е ИЗМИСЛЕНА: неговите
 * истински файлове не влизат в хранилището (правило 29 · то е публично).
 * Направата обаче е същата — шестнайсетични низове през `/ToUnicode`, без
 * интервал в превода, всяка клетка със свое място.
 */
async function mostrata() {
  const danni = new Uint8Array(await readFile('tests/mostri/lineen-grafik.pdf'));
  return prochetiGrafik((await otPDF(danni)).stranitsi);
}

describe('линейният график · датите и дните', () => {
  it('американската дата на MS Project става наша', () => {
    expect(dataOtGrafika('Mon 3/2/26')).toBe('2026-03-02');
    expect(dataOtGrafika('12/31/2025')).toBe('2025-12-31');
  });

  it('което не е дата, връща празно · не се гадае', () => {
    expect(dataOtGrafika('Wed ')).toBe('');
    expect(dataOtGrafika('13/45/26')).toBe('');
  });

  it('продължителността се чете и на двата езика', () => {
    expect(dniOtGrafika('60 days')).toBe(60);
    expect(dniOtGrafika('1 day')).toBe(1);
    expect(dniOtGrafika('7 дни')).toBe(7);
    expect(dniOtGrafika('Кофраж')).toBe(0);
  });

  it('предшествениците са само номерата · видът на връзката пада', () => {
    expect(predshestvenitsiOt('10FF+2 days')).toEqual(['10']);
    expect(predshestvenitsiOt('10,19FF+3 days')).toEqual(['10', '19']);
    expect(predshestvenitsiOt('')).toEqual([]);
  });

  it('степените излизат от отстъпите, с допуск', () => {
    const stepen = stepeniteNa([127, 138, 150, 127.4, 138.2]);
    expect(stepen(127)).toBe(0);
    expect(stepen(138.2)).toBe(1);
    expect(stepen(150)).toBe(2);
  });
});

describe('линейният график · четене от истински ПДФ', () => {
  it('чете всички редове на мострата · нула пропуснати', async () => {
    const g = await mostrata();
    expect(g.redove).toHaveLength(5);
    expect(g.nomera).toBe(5);
    expect(g.propusnati).toBe(0);
  });

  it('първият ред носи име, дни и двете дати', async () => {
    const g = await mostrata();
    expect(g.redove[0]).toMatchObject({
      nomer: '1',
      ime: 'Строеж Пример · цялата сграда',
      dni: 60,
      ot: '2026-03-02',
      do: '2026-05-22',
    });
  });

  it('ОТСТЪПЪТ прави дървото · дела и поддела (И131 т.2)', async () => {
    const g = await mostrata();
    // 1 · Строеж (степен 0) → 2 · Груб строеж (1) → 3 и 4 (2); 5 · Покрив (1).
    expect(g.redove.map((r) => r.stepen)).toEqual([0, 1, 2, 2, 1]);
    expect(g.redove.map((r) => r.nadNomer)).toEqual(['', '1', '2', '2', '1']);
  });

  it('зависимостите се четат · „след 3" НЕ е „под 3"', async () => {
    const g = await mostrata();
    const kofrazh = g.redove.find((r) => r.nomer === '4');
    expect(kofrazh?.predshestvenitsi).toEqual(['3']);
    // Предшественикът не прави родител: родителят иде от отстъпа.
    expect(kofrazh?.nadNomer).toBe('2');
  });

  it('`opId` носи Имота и номера от файла · идемпотентност (правило 5)', () => {
    expect(opIdNaRedOtGrafika('Малинова', '17')).toBe('grafik:Малинова:17');
    expect(opIdNaRedOtGrafika('Малинова', '17')).toBe(opIdNaRedOtGrafika('Малинова', '17'));
    expect(opIdNaRedOtGrafika('Малинова', '18')).not.toBe(opIdNaRedOtGrafika('Малинова', '17'));
  });

  it('празният вход дава празен резултат, не грешка', () => {
    expect(prochetiGrafik([])).toEqual({ redove: [], nomera: 0, propusnati: 0 });
  });

  it('страница без шапка се подминава цяла', () => {
    const risunka = [
      { x: 10, y: 700, tekst: 'Half 1, 2026' },
      { x: 10, y: 680, tekst: '1' },
      { x: 60, y: 680, tekst: 'Нещо, което не е таблица' },
    ];
    expect(prochetiGrafik([risunka]).redove).toHaveLength(0);
  });
});
