/**
 * ИЗГЛЕДЪТ НА ГАНТА · подвижната граница и ширината на колоната.
 *
 * Негови думи, 27.08: „Диаграмата се вижда 2 трети от екрана и също границата
 * между таблицата и диаграмата до нея се мести с мишката"; и „да запази ЕДНА
 * СТАНДАРТНА КОЛОНА като ширина… ако местиш една колона местиш ширината на
 * ВСИЧКИ колони".
 */

import { describe, expect, it } from 'vitest';
import {
  DYAL_PODRAZBIRAN,
  KOLONA_PODRAZBIRANA,
  NAY_GOLYAM_DYAL,
  NAY_MALAK_DYAL,
  NAY_SHIROKA,
  NAY_TESNA,
  ogranichiDyala,
  ogranichiKolonata,
} from '../app/gant-izgled.ts';

describe('дялът на диаграмата', () => {
  it('подразбраното е ДВЕ ТРЕТИ · неговото число от 27.08', () => {
    expect(DYAL_PODRAZBIRAN).toBeCloseTo(2 / 3, 10);
  });

  it('под една пета всяка половина престава да се чете · вдига се', () => {
    expect(ogranichiDyala(0.02)).toBe(NAY_MALAK_DYAL);
    expect(ogranichiDyala(-3)).toBe(NAY_MALAK_DYAL);
  });

  it('над четири пети другата половина изчезва · сваля се', () => {
    expect(ogranichiDyala(0.99)).toBe(NAY_GOLYAM_DYAL);
  });

  it('нечисло НЕ дава NaN на екрана · пада на подразбраното', () => {
    expect(ogranichiDyala(Number.NaN)).toBe(DYAL_PODRAZBIRAN);
    expect(ogranichiDyala(Number.POSITIVE_INFINITY)).toBe(DYAL_PODRAZBIRAN);
  });

  it('вътре в позволеното минава непокътнато', () => {
    expect(ogranichiDyala(0.5)).toBe(0.5);
  });

  it('подразбраното Е вътре в собствените си граници', () => {
    expect(ogranichiDyala(DYAL_PODRAZBIRAN)).toBe(DYAL_PODRAZBIRAN);
  });
});

describe('ширината на колоната', () => {
  it('подразбраното е 34 · долната граница на СТАРОТО minmax', () => {
    // Тоест подразбраното НЕ мени вида — то само спира разтягането.
    expect(KOLONA_PODRAZBIRANA).toBe(34);
  });

  it('под 14px не се побира и двуцифрен ден', () => {
    expect(ogranichiKolonata(3)).toBe(NAY_TESNA);
  });

  it('над 160px колоната престава да е колона', () => {
    expect(ogranichiKolonata(900)).toBe(NAY_SHIROKA);
  });

  it('връща ЦЕЛИ пиксели · дробна ширина размива границите на решетката', () => {
    expect(ogranichiKolonata(34.7)).toBe(35);
  });

  it('нечисло пада на подразбраното, не на NaN', () => {
    expect(ogranichiKolonata(Number.NaN)).toBe(KOLONA_PODRAZBIRANA);
  });
});
