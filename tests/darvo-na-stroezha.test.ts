/**
 * ДЪРВОТО НА СТРОЕЖА (резен 69 · И124 т.1): „При започване на нов Имот с нов
 * Обекти строителството е голямо дело с мног дървесни разклонения като в
 * МСПроджект." Машината ПРЕДЛАГА, записва човекът (правило 18).
 */

import { describe, expect, it } from 'vitest';
import {
  broyatNaShablona,
  delataOtShablona,
  imaZhivKoren,
  KORENAT_NA_STROEZHA,
  opIdNaDeloOtShablona,
  predlagaLiDarvo,
  SHABLON_NA_STROEZHA,
} from '../src/domein/darvo-na-stroezha.ts';
import { BAZOVI_SASTOYANIYA_NA_IMOT } from '../src/domein/sastoyaniya-na-imot.ts';

const DNES = '2026-09-01';

function redovete() {
  let n = 0;
  return delataOtShablona('Върба', 'vintexstroy@gmail.com', DNES, () => `D-${(n += 1)}`);
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

  it('Имотът и извършващият пътуват до всяко дело · Обект НЯМА, дървото е на Имота (И131 т.2)', () => {
    for (const r of redovete()) {
      expect(r.danni.myasto).toBe('Върба');
      expect(r.danni.obekt).toBe('');
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

describe('спусъкът е СЪСТОЯНИЕТО „Строителство" (резен 104 · ADR-165)', () => {
  const zhivi = [
    { myasto: 'Върба', ime: 'Покрив', nadDelo: 'D-1' },
    { myasto: 'Хисаря', ime: KORENAT_NA_STROEZHA, nadDelo: '' },
  ];

  it('коренът на дървото и първото базово състояние са ЕДНА дума · кръстосан пин', () => {
    expect(BAZOVI_SASTOYANIYA_NA_IMOT).toContain('Строителство');
    expect(KORENAT_NA_STROEZHA).toBe(BAZOVI_SASTOYANIYA_NA_IMOT[0]);
    expect(KORENAT_NA_STROEZHA).toBe('Строителство');
  });

  it('предлага се при „Строителство" без жив корен · иначе не', () => {
    expect(predlagaLiDarvo('Строителство', zhivi, 'Върба')).toBe(true);
    expect(predlagaLiDarvo('Наем', zhivi, 'Върба')).toBe(false);
    expect(predlagaLiDarvo('', zhivi, 'Върба')).toBe(false);
    // Хисаря вече има жив корен · второ дърво е дубъл.
    expect(predlagaLiDarvo('Строителство', zhivi, 'Хисаря')).toBe(false);
    expect(predlagaLiDarvo('Строителство', zhivi, ' хисаря ')).toBe(false);
  });

  it('живият корен се познава по името, по празния родител и по СВЕДЕНИЯ Имот', () => {
    expect(imaZhivKoren(zhivi, 'Хисаря')).toBe(true);
    expect(imaZhivKoren(zhivi, 'Върба')).toBe(false);
    expect(imaZhivKoren([{ myasto: 'Върба', ime: KORENAT_NA_STROEZHA, nadDelo: 'D-9' }], 'Върба')).toBe(false);
  });

  it('opId носи ДЕЙСТВИЕТО · Имот + път в шаблона, без случайно число (правило 5 · 20)', () => {
    const redove = redovete();
    expect(redove.map((r) => r.pat).slice(0, 5)).toEqual(['0', '1', '1.1', '1.2', '1.3']);
    expect(new Set(redove.map((r) => r.pat)).size).toBe(redove.length);
    expect(opIdNaDeloOtShablona('Върба', '1.2')).toBe('darvo:върба:1.2');
    expect(opIdNaDeloOtShablona(' ВЪРБА ', '1.2')).toBe(opIdNaDeloOtShablona('върба', '1.2'));
  });
});
