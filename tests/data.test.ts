/**
 * Вратарят на датите. Журналът е само за добавяне — сгрешена дата влиза
 * завинаги, затова се спира на входа, както при парите.
 */

import { describe, expect, it } from 'vitest';
import { eData, GreshkaData, otData } from '../src/yadro/data.js';

describe('датите на входа', () => {
  it('приема истински ден', () => {
    expect(otData('2026-02-28')).toBe('2026-02-28');
    expect(otData('2024-02-29')).toBe('2024-02-29');
    expect(otData(' 2026-08-22 ')).toBe('2026-08-22');
  });

  it('отказва ден, който не съществува', () => {
    expect(() => otData('2026-02-31')).toThrow(GreshkaData);
    expect(() => otData('2026-02-30')).toThrow(GreshkaData);
    expect(() => otData('2026-04-31')).toThrow(GreshkaData);
    expect(() => otData('2026-13-01')).toThrow(GreshkaData);
    expect(() => otData('2026-00-10')).toThrow(GreshkaData);
    expect(() => otData('2026-01-00')).toThrow(GreshkaData);
  });

  it('невисокосната година няма 29 февруари', () => {
    expect(eData('2026-02-29')).toBe(false);
    expect(eData('2024-02-29')).toBe(true);
    expect(eData('2000-02-29')).toBe(true);
    expect(eData('1900-02-29')).toBe(false);
  });

  it('отказва празно и чужд вид', () => {
    expect(() => otData('')).toThrow(GreshkaData);
    expect(() => otData('   ')).toThrow(GreshkaData);
    expect(() => otData('28.02.2026')).toThrow(GreshkaData);
    expect(() => otData('2026-2-8')).toThrow(GreshkaData);
    expect(() => otData('2026-02-28T10:00:00Z')).toThrow(GreshkaData);
  });

  it('казва за коя дата става дума', () => {
    expect(() => otData('няма', 'Датата на плащането')).toThrow(/Датата на плащането/);
  });

  it('eData не пука от нещо, което не е низ', () => {
    expect(eData(undefined)).toBe(false);
    expect(eData(20260228)).toBe(false);
    expect(eData(null)).toBe(false);
  });
});
