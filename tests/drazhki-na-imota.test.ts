/**
 * ДРЪЖКИТЕ ОТ МЕНЮТО НА ИМОТА (резен 100 · ADR-164) · четири по роля.
 */

import { describe, expect, it } from 'vitest';
import { DRAZHKITE_NA_IMOTA, drazhkiteNa } from '../src/domein/drazhki-na-imota.js';

describe('дръжките на Имота · пин с ръка', () => {
  it('са три към форми, в неговия ред: обект · дело · среща', () => {
    expect(DRAZHKITE_NA_IMOTA.map((d) => d.ime)).toEqual(['Нов обект', 'Ново дело', 'Нова среща']);
    expect(DRAZHKITE_NA_IMOTA.map((d) => d.ekran)).toEqual(['imoti', 'gant', 'kontakti']);
  });

  it('водят към СЪЩИТЕ форми · не раждат втора врата', () => {
    expect(DRAZHKITE_NA_IMOTA.map((d) => d.sektsiya)).toEqual(['imoti-nov', 'gant-forma', 'kontakti']);
  });

  it('наблюдателят не вижда нито една · те са път към писане (правило 23)', () => {
    expect(drazhkiteNa('nablyudatel', 'imot')).toEqual([]);
    expect(drazhkiteNa('nablyudatel', 'obekt')).toEqual([]);
  });

  it('редакторът и собственикът виждат и трите на реда на Имота', () => {
    expect(drazhkiteNa('redaktor', 'imot')).toHaveLength(3);
    expect(drazhkiteNa('sobstvenik', 'imot')).toHaveLength(3);
  });

  it('на реда на Обекта е само „Ново дело" · Делата са за Имот и за Обект (И131 т.2)', () => {
    expect(drazhkiteNa('redaktor', 'obekt').map((d) => d.klyuch)).toEqual(['novo-delo']);
  });
});
