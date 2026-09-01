/**
 * ДВЕТЕ ТЕМИ НА НАТОВАРВАНЕТО (резен 78 · И124 т.5 · ADR-135).
 *
 * Негово: „те да са 2 броя и да са теми за натоварването с обяснение за
 * функциите, да са Начални и Основни когато е опозната работата."
 */

import { describe, expect, it } from 'vitest';
import {
  IMENA_NA_TEMITE,
  OBYASNENIYA,
  TEMI,
  VISOCHINI_NA_TEMITE,
  izbranataTema,
} from '../app/tema.ts';
import { NAY_GOLYAMO, NAY_MALKO, PODRAZBRANA } from '../app/visochina.ts';

describe('темите са ДВЕ · неговите имена, с обяснение', () => {
  it('точно две · „те да са 2 броя"', () => {
    expect(TEMI).toHaveLength(2);
  });

  it('казват се Начални и Основни · неговите думи', () => {
    expect(TEMI.map((t) => IMENA_NA_TEMITE[t])).toEqual(['Начални', 'Основни']);
  });

  it('всяка носи ОБЯСНЕНИЕ · „с обяснение за функциите"', () => {
    for (const t of TEMI) expect(OBYASNENIYA[t].length > 10).toBe(true);
  });
});

describe('числата на темите · премерените, предложени в ADR-135', () => {
  it('Начални Е премереното подразбрано · темата по подразбиране не мени нищо', () => {
    expect(VISOCHINI_NA_TEMITE.nachalni).toBe(PODRAZBRANA);
  });

  it('Основни е ПО-СБИТА · повече на екрана при опозната работа', () => {
    expect(VISOCHINI_NA_TEMITE.osnovni).toBeLessThan(VISOCHINI_NA_TEMITE.nachalni);
  });

  it('и двете са вътре в границите на реда', () => {
    for (const t of TEMI) {
      expect(VISOCHINI_NA_TEMITE[t]).toBeGreaterThanOrEqual(NAY_MALKO);
      expect(VISOCHINI_NA_TEMITE[t]).toBeLessThanOrEqual(NAY_GOLYAMO);
    }
  });
});

describe('изборът · непознатото не гърми', () => {
  it('без хранилище пада на „Начални" · за начало, не за опознат', () => {
    expect(izbranataTema()).toBe('nachalni');
  });
});
