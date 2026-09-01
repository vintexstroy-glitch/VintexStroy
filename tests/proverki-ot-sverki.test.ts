/**
 * ПРОВЕРКИ ОТ СВЕРКИ · остатъкът по теми, в двете посоки (резен 72 · И124 т.10).
 *
 * Петте обещания:
 *
 *   1. Темите са ПЕТ и редът им е закован · неговите три плюс двете от книгата.
 *   2. Таксата се познава по думата на банката; останалото — по посоката.
 *   3. Двете посоки: ред от извлечението без запис И запис без ред — и двете
 *      влизат, всяко с „откъде".
 *   4. Кешът и свереното НЕ влизат · остатък е само неучаствалото.
 *   5. Сверката вход↔изход затваря срещу `broyNahodki` — и нулата се казва.
 */

import { describe, expect, it } from 'vitest';
import type { RedOtKarta } from '../src/iztochnik/karta.js';
import {
  proverkiOtSverki,
  temaNaBankovOstatak,
  TEMI_NA_PROVERKITE,
} from '../src/domein/proverki-ot-sverki.js';
import {
  broyNahodki,
  sverkaSIzvlechenie,
  type RezultatNaSverkata,
  type ZapisZaSverka,
} from '../src/domein/sverka-izvlechenie.js';

const KOGATO = '2026-09-01T10:00:00.000Z';

function zapis(n: Partial<ZapisZaSverka> & { klyuch: string; suma_st: number }): ZapisZaSverka {
  return {
    posoka: 'razhod',
    data: '2026-05-12',
    nachin: 'банка',
    koy: 'Материали ООД',
    dogovor: '',
    ...n,
  };
}

function bankov(n: Partial<RedOtKarta> & { klyuch: string; suma_st: number }): RedOtKarta {
  return {
    data: '2026-05-12',
    posoka: 'razhod',
    koy: 'МАТЕРИАЛИ ООД',
    dokument: '',
    saldoSled_st: 0,
    ...n,
  };
}

function sverkata(
  zapisi: readonly ZapisZaSverka[],
  izvlechenie: readonly RedOtKarta[],
): RezultatNaSverkata {
  return sverkaSIzvlechenie({
    period: '2026-05',
    zapisi,
    izvlechenie,
    ot: '2026-05-01',
    do: '2026-05-31',
  });
}

describe('1 · темите — пет, и редът им е закован', () => {
  it('неговите три отпред, двете от книгата отзад', () => {
    expect(TEMI_NA_PROVERKITE).toHaveLength(5);
    expect(TEMI_NA_PROVERKITE).toEqual([
      'Банкови такси',
      'Грешни преводи',
      'Грешни плащания с карта',
      'Вкарано, а липсва в извлечението',
      'Пасват няколко реда',
    ]);
  });

  it('и празната тема СТОИ в описа по теми · нулата се казва (правило 15)', () => {
    const pr = proverkiOtSverki([sverkata([], [])], KOGATO);
    expect(pr.poTemi).toHaveLength(5);
    expect(pr.poTemi.map((t) => t.redove.length)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('2 · таксата се познава по думата на банката', () => {
  it('такса · комисиона · лихва · обслужване — с каквито и букви да е', () => {
    expect(temaNaBankovOstatak('ТАКСА УПРАВЛЕНИЕ СМЕТКА', 'razhod')).toBe('Банкови такси');
    expect(temaNaBankovOstatak('месечна комисиона', 'razhod')).toBe('Банкови такси');
    expect(temaNaBankovOstatak('Лихва по депозит', 'prihod')).toBe('Банкови такси');
    expect(temaNaBankovOstatak('Обслужване на пакет', 'razhod')).toBe('Банкови такси');
  });

  it('останалото се дели по посоката · навътре превод, навън плащане', () => {
    expect(temaNaBankovOstatak('НЕПОЗНАТ ЕООД', 'prihod')).toBe('Грешни преводи');
    expect(temaNaBankovOstatak('НЕПОЗНАТ ЕООД', 'razhod')).toBe('Грешни плащания с карта');
  });
});

describe('3 · двете посоки, всяка с „откъде"', () => {
  it('ред от извлечението без запис → „извлечението"; запис без ред → „книгата"', () => {
    const r = sverkata(
      // вкарано С КАРТА, а липсва в извлечението — неговият пример, дословно
      [zapis({ klyuch: 'razhod:K', suma_st: 40_000, nachin: 'карта', koy: 'Липсваща Карта ООД' })],
      [
        bankov({ klyuch: 'b-taksa', suma_st: 5_00, koy: 'ТАКСА ОБСЛУЖВАНЕ' }),
        bankov({ klyuch: 'b-prevod', suma_st: 50_00, posoka: 'prihod', koy: 'ГРЕШЕН ПРЕВОД' }),
      ],
    );
    const pr = proverkiOtSverki([r], KOGATO);

    expect(pr.redove).toHaveLength(3);
    const poTema = new Map(pr.redove.map((x) => [x.tema, x]));
    expect(poTema.get('Банкови такси')?.otkade).toBe('извлечението');
    expect(poTema.get('Грешни преводи')?.otkade).toBe('извлечението');
    expect(poTema.get('Вкарано, а липсва в извлечението')?.otkade).toBe('книгата');
    expect(poTema.get('Вкарано, а липсва в извлечението')?.koy).toBe('Липсваща Карта ООД');
  });

  it('няколко пасващи реда са НЕСЪОТВЕТСТВИЕ от книгата, не избор на машината', () => {
    const r = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 10_000 })],
      [bankov({ klyuch: 'b1', suma_st: 10_000 }), bankov({ klyuch: 'b2', suma_st: 10_000 })],
    );
    const pr = proverkiOtSverki([r], KOGATO);
    const nyakolko = pr.poTemi.find((t) => t.tema === 'Пасват няколко реда')!;
    expect(nyakolko.redove).toHaveLength(1);
    expect(nyakolko.redove[0]!.otkade).toBe('книгата');
    // и двата банкови реда стоят като остатък от извлечението — никой не е харчен
    expect(pr.redove.filter((x) => x.otkade === 'извлечението')).toHaveLength(2);
  });
});

describe('4 · кешът и свереното НЕ влизат', () => {
  it('остатък е само неучаствалото', () => {
    const r = sverkata(
      [
        zapis({ klyuch: 'razhod:B', suma_st: 10_000, nachin: 'банка' }),
        zapis({ klyuch: 'razhod:V', suma_st: 30_000, nachin: 'в брой' }),
      ],
      [bankov({ klyuch: 'b1', suma_st: 10_000 })],
    );
    const pr = proverkiOtSverki([r], KOGATO);
    expect(pr.redove).toHaveLength(0);
    expect(pr.sverka.razlika).toBe(0);
  });
});

describe('5 · сверката затваря срещу broyNahodki · и по няколко месеца', () => {
  it('частите ↔ цялото, с втори събирач', () => {
    const may = sverkata(
      [zapis({ klyuch: 'razhod:L', suma_st: 70_000 })],
      [bankov({ klyuch: 'b-t', suma_st: 3_00, koy: 'ТАКСА ПРЕВОД' })],
    );
    const yuni = sverkaSIzvlechenie({
      period: '2026-06',
      zapisi: [],
      izvlechenie: [bankov({ klyuch: 'b-yu', suma_st: 12_345, data: '2026-06-03' })],
      ot: '2026-05-01',
      do: '2026-06-30',
    });
    const pr = proverkiOtSverki([may, yuni], KOGATO);

    expect(pr.redove).toHaveLength(3);
    expect(pr.sverka.vhod).toBe(broyNahodki(may) + broyNahodki(yuni));
    expect(pr.sverka.izhod).toBe(3);
    expect(pr.sverka.razlika).toBe(0);
    // и периодът пътува с реда · остатъкът от юни не се губи, гледайки май
    expect(pr.redove.map((x) => x.period).sort()).toEqual(['2026-05', '2026-05', '2026-06']);
    // сборът на темата се брои
    const taksi = pr.poTemi.find((t) => t.tema === 'Банкови такси')!;
    expect(taksi.sbor_st).toBe(3_00);
  });
});
