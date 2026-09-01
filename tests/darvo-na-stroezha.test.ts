/**
 * ДЪРВОТО НА СТРОЕЖА (резен 69 · И124 т.1): „При започване на нов Имот с нов
 * Обекти строителството е голямо дело с мног дървесни разклонения като в
 * МСПроджект." Машината ПРЕДЛАГА, записва човекът (правило 18).
 */

import { describe, expect, it } from 'vitest';
import {
  broyatNaShablona,
  delataOtShablona,
  KORENAT_NA_STROEZHA,
  SHABLON_NA_STROEZHA,
} from '../src/domein/darvo-na-stroezha.ts';

const DNES = '2026-09-01';

function redovete() {
  let n = 0;
  return delataOtShablona('Върба', 'вила 1', 'vintexstroy@gmail.com', DNES, () => `D-${(n += 1)}`);
}

describe('шаблонът на строежа · формата на дървото', () => {
  it('броят се БРОИ и е 22 · закован с ръка, за да не мръдне тихо', () => {
    expect(broyatNaShablona()).toBe(22);
    expect(redovete().length).toBe(22);
  });

  it('коренът и петте фази · ЗАКОВАНИ С РЪКА, за да не мръднат тихо', () => {
    expect(KORENAT_NA_STROEZHA).toBe('Строителство');
    expect(SHABLON_NA_STROEZHA).toHaveLength(5);
    expect(SHABLON_NA_STROEZHA[1]).toEqual({
      ime: 'Груб строеж',
      stapki: ['Изкоп и основи', 'Конструкция', 'Зидария', 'Покрив', 'Акт 14'],
    });
    expect(SHABLON_NA_STROEZHA.map((k) => k.ime)).toEqual([
      'Проектиране и разрешителни',
      'Груб строеж',
      'Инсталации',
      'Довършителни работи',
      'Приемане',
    ]);
  });

  it('имената са уникални и непразни · две еднакви дела не се различават с очи', () => {
    const imena = [KORENAT_NA_STROEZHA, ...SHABLON_NA_STROEZHA.flatMap((k) => [k.ime, ...k.stapki])];
    expect(imena.every((i) => i.trim() !== '')).toBe(true);
    expect(new Set(imena).size).toBe(imena.length);
  });

  it('трите акта на българския строеж стоят · 14, 15 и 16', () => {
    const stapki = SHABLON_NA_STROEZHA.flatMap((k) => k.stapki).join(' ');
    for (const akt of ['Акт 14', 'Акт 15', 'Акт 16']) expect(stapki).toContain(akt);
  });
});

describe('делата от шаблона · готови за Вратата', () => {
  it('коренът е пръв и самостоятелен · фазите сочат него, стъпките — фазата си', () => {
    const redove = redovete();
    expect(redove[0]!.danni.ime).toBe(KORENAT_NA_STROEZHA);
    expect(redove[0]!.danni.nadDelo).toBe('');
    const fazi = redove.filter((r) => r.danni.nadDelo === redove[0]!.id);
    expect(fazi.length).toBe(SHABLON_NA_STROEZHA.length);
    // ВСЯКО дете идва СЛЕД родителя си — Вратата пише в този ред.
    const videni = new Set<string>();
    for (const r of redove) {
      if (r.danni.nadDelo !== '') expect(videni.has(r.danni.nadDelo)).toBe(true);
      videni.add(r.id);
    }
  });

  it('мястото, обектът и извършващият пътуват до всяко дело (И124 т.7)', () => {
    for (const r of redovete()) {
      expect(r.danni.myasto).toBe('Върба');
      expect(r.danni.obekt).toBe('вила 1');
      expect(r.danni.otgovornik).toBe('vintexstroy@gmail.com');
      expect(r.danni.sastoyanie).toBe('чака');
      expect(r.danni.ot).toBe(DNES);
    }
  });

  it('идентификаторите са уникални · две дела на един ключ се презаписват тихо', () => {
    const redove = redovete();
    expect(new Set(redove.map((r) => r.id)).size).toBe(redove.length);
  });
});
