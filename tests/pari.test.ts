/**
 * ПАРИТЕ · цели стотинки, никакъв float (П2.1).
 */

import { describe, expect, it } from 'vitest';
import {
  GreshkaPari,
  izvadi,
  kakvoPishe,
  obarni,
  otLeva,
  razpredeli,
  sabiri,
  stotinki,
} from '../src/yadro/index.js';

describe('цели стотинки', () => {
  it('33_33 + 66_67 = 100_00 точно', () => {
    expect(sabiri(stotinki(33_33), stotinki(66_67))).toBe(100_00);
  });

  it('отказва дробни стотинки', () => {
    expect(() => stotinki(12.5)).toThrow(GreshkaPari);
    expect(() => stotinki(NaN)).toThrow(GreshkaPari);
    expect(() => stotinki(Infinity)).toThrow(GreshkaPari);
  });

  it('сторното връща състоянието едно към едно', () => {
    const vnoska = stotinki(1234_56);
    expect(sabiri(vnoska, obarni(vnoska))).toBe(0);
  });

  it('изваждането е точно там, където float греши', () => {
    // 0.1 + 0.2 !== 0.3 при float; при стотинки няма такъв въпрос.
    expect(sabiri(stotinki(10), stotinki(20))).toBe(30);
    expect(izvadi(stotinki(30), stotinki(20))).toBe(10);
  });
});

describe('разпределяне без загуба на стотинка', () => {
  it('сборът на частите е точно изходната сума', () => {
    for (const [suma, chasti] of [
      [100_00, 3],
      [1_00, 7],
      [0, 5],
      [999_99, 12],
    ] as const) {
      const parcheta = razpredeli(stotinki(suma), chasti);
      expect(parcheta).toHaveLength(chasti);
      expect(sabiri(...parcheta)).toBe(suma);
    }
  });

  it('остатъкът отива към първите части', () => {
    expect(razpredeli(stotinki(100_00), 3)).toEqual([3334, 3333, 3333]);
  });

  it('работи и с отрицателна сума (сторно на разсрочено)', () => {
    const parcheta = razpredeli(stotinki(-100_00), 3);
    expect(sabiri(...parcheta)).toBe(-100_00);
  });

  it('отказва безсмислен брой части', () => {
    expect(() => razpredeli(stotinki(100), 0)).toThrow(GreshkaPari);
    expect(() => razpredeli(stotinki(100), 2.5)).toThrow(GreshkaPari);
  });
});

describe('за четене от човек', () => {
  it('пише сумата с две цифри след запетаята', () => {
    expect(kakvoPishe(stotinki(100_00))).toBe('100,00');
    expect(kakvoPishe(stotinki(5))).toBe('0,05');
    expect(kakvoPishe(stotinki(-1234_56))).toBe('-1234,56');
  });
});

describe('четене на сума, написана от човек', () => {
  it('приема запетая, точка и разредка', () => {
    expect(otLeva('1150,50')).toBe(1150_50);
    expect(otLeva('1150.50')).toBe(1150_50);
    expect(otLeva('1 150,50')).toBe(1150_50);
    expect(otLeva('1150')).toBe(1150_00);
    expect(otLeva('0,05')).toBe(5);
    expect(otLeva('-1150,50')).toBe(-1150_50);
  });

  it('допълва липсващата втора цифра', () => {
    expect(otLeva('1150,5')).toBe(1150_50);
  });

  it('отказва всичко, което не е сума', () => {
    for (const losho of ['', 'абв', '1150,505', '1150,', '1.2.3', '12,5лв', '1e3']) {
      expect(() => otLeva(losho)).toThrow(GreshkaPari);
    }
  });
});
