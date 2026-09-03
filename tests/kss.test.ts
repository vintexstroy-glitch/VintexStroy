import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { otPDF } from '../src/iztochnik/pdf.js';
import {
  chisloOtFayla,
  eMyarka,
  kolichestvoOtFayla,
  nevarzaniRedove,
  prochetiKSS,
} from '../src/domein/kss.js';

/** Мострата е измислена и се строи с `node stroezh/mostri-pdf.mjs` (правило 29). */
async function mostrata() {
  const danni = new Uint8Array(await readFile('tests/mostri/kss.pdf'));
  return prochetiKSS((await otPDF(danni)).stranitsi);
}

describe('КСС · числата на чуждия файл', () => {
  it('чете и точка, и запетая, и интервал за хиляди', () => {
    expect(chisloOtFayla('2 000.00')).toBe(200_000);
    expect(chisloOtFayla('151,80')).toBe(15_180);
    expect(chisloOtFayla('18')).toBe(1800);
  });

  it('което не е число, връща null · не нула', () => {
    // Нулата е ЧИСЛО и значи „нула"; липсата е друго и се казва с null.
    expect(chisloOtFayla('бр.')).toBeNull();
    expect(chisloOtFayla('')).toBeNull();
    expect(chisloOtFayla('0.00')).toBe(0);
  });

  it('количествата се пазят в ХИЛЯДНИ · „0.99 м²" не се губи', () => {
    expect(kolichestvoOtFayla('250.00')).toBe(250_000);
    expect(kolichestvoOtFayla('0,99')).toBe(990);
    expect(kolichestvoOtFayla('4 500.00')).toBe(4_500_000);
  });

  it('мярката се познава, описанието — не', () => {
    expect(eMyarka('бр.')).toBe(true);
    expect(eMyarka('м3')).toBe(true);
    expect(eMyarka('кг')).toBe(true);
    expect(eMyarka('Бетон С25/30')).toBe(false);
  });
});

describe('КСС · четене от истински ПДФ', () => {
  it('чете петте реда на мострата', async () => {
    const k = await mostrata();
    expect(k.redove).toHaveLength(5);
    expect(k.propusnati).toBe(0);
  });

  it('редът носи мярка, количество, цена и стойност', async () => {
    const k = await mostrata();
    expect(k.redove[1]).toMatchObject({
      nomer: '2',
      opisanie: 'Механизиран изкоп с извозване',
      myarka: 'м3',
      kolichestvo_hil: 250_000,
      edinichna_st: 1800,
      stoynost_st: 450_000,
    });
  });

  it('количество × цена се СМЯТА и се сравнява със стойността (правило 7)', async () => {
    const k = await mostrata();
    for (const r of k.redove) expect(r.smetnato_st).toBe(r.stoynost_st);
    expect(nevarzaniRedove(k)).toHaveLength(0);
  });

  it('сборът на редовете и редът „Общо:" се сверяват · разликата е нула', async () => {
    const k = await mostrata();
    expect(k.sbor_st).toBe(5_050_000);
    expect(k.obyaven_st).toBe(5_050_000);
    expect(k.razlika_st).toBe(0);
  });

  it('невързан ред се ХВАЩА · количеството не отговаря на стойността', () => {
    const stranitsa = [
      { x: 40, y: 700, tekst: '№ по ред' },
      { x: 90, y: 700, tekst: 'Описание' },
      { x: 300, y: 700, tekst: 'КОЛИЧЕСТВО' },
      { x: 40, y: 680, tekst: '1' },
      { x: 90, y: 680, tekst: 'Бетон' },
      { x: 250, y: 680, tekst: 'м3' },
      { x: 300, y: 680, tekst: '10.00' },
      { x: 380, y: 680, tekst: '100.00' },
      { x: 460, y: 680, tekst: '1 500.00' },
    ];
    const k = prochetiKSS([stranitsa]);
    expect(k.redove).toHaveLength(1);
    expect(k.redove[0]?.smetnato_st).toBe(100_000);
    expect(k.redove[0]?.stoynost_st).toBe(150_000);
    expect(nevarzaniRedove(k)).toHaveLength(1);
  });

  it('файл без ред „Общо:" казва нула обявен сбор, не измисля разлика', () => {
    const stranitsa = [
      { x: 40, y: 680, tekst: '1' },
      { x: 90, y: 680, tekst: 'Изкоп' },
      { x: 250, y: 680, tekst: 'м3' },
      { x: 300, y: 680, tekst: '2.00' },
      { x: 380, y: 680, tekst: '50.00' },
      { x: 460, y: 680, tekst: '100.00' },
    ];
    const k = prochetiKSS([stranitsa]);
    expect(k.obyaven_st).toBe(0);
    expect(k.razlika_st).toBe(0);
    expect(k.sbor_st).toBe(10_000);
  });
});
