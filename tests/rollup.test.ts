/**
 * ROLLUP · сбор от ДРУГА таблица по закачената връзка (резен 88).
 *
 * Последното от трите, които чакаха редовете на създадената таблица
 * (`docs/10` · ADR-111 · ADR-113 §„Какво НЕ влиза"). Сметка, не запис:
 * тук се проверява самата сметка и сверката ѝ — двете страни по РАЗЛИЧЕН път.
 */
import { describe, expect, it } from 'vitest';
import { rollupPoZakachki, sveriRollup } from '../src/domein/rollup.js';
import type { Zakachka } from '../src/domein/mnogo-kam-mnogo.js';
import type { RedNaTablitsa } from '../src/domein/redove-na-tablitsa.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';

const IZVOR: PayloadTablitsaOtFaylSazdadena = {
  klyuch: 'Фактури',
  otFayl: 'fakturi.xlsx',
  otpechatak: 'ab'.repeat(32),
  glavi: ['Доставчик', 'Сума'],
  vidove: { 0: 'tekst', 1: 'evro' },
  formuli: {},
  nekopirani: [],
};

function izvorenRed(red: string, suma_st: number, mahnat = false): RedNaTablitsa {
  return { tablitsa: 'Фактури', red, pari_st: { 1: suma_st }, chisla: {}, tekst: {}, mahnat };
}

function gledanRed(red: string, mahnat = false): RedNaTablitsa {
  return { tablitsa: 'Обекти', red, pari_st: {}, chisla: {}, tekst: {}, mahnat };
}

function zakachka(gledan: string, izvoren: string): [string, Zakachka] {
  return [
    `${gledan}|${izvoren}`,
    {
      a: { vid: 'red', id: gledan, tablitsa: 'Обекти' },
      b: { vid: 'red', id: izvoren, tablitsa: 'Фактури' },
      zashto: '',
      kogato: '2026-09-01T09:00:00.000Z',
      actor: 'vintexstroy@gmail.com',
    },
  ];
}

const smetni = (
  zakachki: ReadonlyMap<string, Zakachka>,
  redove: readonly RedNaTablitsa[],
  izvorni: readonly RedNaTablitsa[],
) => {
  const rollup = rollupPoZakachki(zakachki, 'Обекти', redove, IZVOR, izvorni, '1');
  const sverka = sveriRollup(zakachki, 'Обекти', redove, IZVOR, izvorni, '1', rollup);
  return { rollup, sverka };
};

describe('rollup-ът · сборът по закачените', () => {
  it('всеки ред събира СВОИТЕ закачени · незакаченият носи нула, не липсва', () => {
    const zakachki = new Map([zakachka('О-1', 'Ф-1'), zakachka('О-1', 'Ф-2'), zakachka('О-2', 'Ф-3')]);
    const { rollup } = smetni(
      zakachki,
      [gledanRed('О-1'), gledanRed('О-2'), gledanRed('О-3')],
      [izvorenRed('Ф-1', 100_00), izvorenRed('Ф-2', 23_45), izvorenRed('Ф-3', 7_00)],
    );
    expect(rollup.map((r) => [r.red, r.izvorni.length, r.sbor_st])).toEqual([
      ['О-1', 2, 123_45],
      ['О-2', 1, 7_00],
      ['О-3', 0, 0],
    ]);
  });

  it('двойно закаченият изворен ред влиза в сбора на ВСЕКИ · сверката го брои ВЕДНЪЖ', () => {
    const zakachki = new Map([zakachka('О-1', 'Ф-1'), zakachka('О-2', 'Ф-1')]);
    const { rollup, sverka } = smetni(
      zakachki,
      [gledanRed('О-1'), gledanRed('О-2')],
      [izvorenRed('Ф-1', 50_00)],
    );
    expect(rollup.map((r) => r.sbor_st)).toEqual([50_00, 50_00]);
    expect(sverka.vlezli).toBe(1);
    expect(sverka.sborVlezli_st).toBe(50_00);
    expect(sverka.razlika_st).toBe(0);
  });

  it('незакачените се БРОЯТ и по пари · разликата се казва и на нула (правило 7)', () => {
    const vsichkoZakacheno = new Map([zakachka('О-1', 'Ф-1')]);
    const napolovina = new Map([zakachka('О-1', 'Ф-1')]);

    const tsyalo = smetni(vsichkoZakacheno, [gledanRed('О-1')], [izvorenRed('Ф-1', 10_00)]);
    expect(tsyalo.sverka.nezakacheni).toBe(0);
    expect(tsyalo.sverka.razlika_st).toBe(0);

    const chast = smetni(
      napolovina,
      [gledanRed('О-1')],
      [izvorenRed('Ф-1', 10_00), izvorenRed('Ф-2', 90_00)],
    );
    expect(chast.sverka.nezakacheni).toBe(1);
    expect(chast.sverka.razlika_st).toBe(90_00);
  });

  it('закачката към МАХНАТ изворен ред не влиза в сбора · и сверката я казва', () => {
    const zakachki = new Map([zakachka('О-1', 'Ф-1'), zakachka('О-1', 'Ф-2')]);
    const { rollup, sverka } = smetni(
      zakachki,
      [gledanRed('О-1')],
      [izvorenRed('Ф-1', 10_00), izvorenRed('Ф-2', 90_00, true)],
    );
    expect(rollup[0]!.sbor_st).toBe(10_00);
    expect(sverka.kamMahnati).toBe(1);
  });

  it('махнатият ГЛЕДАН ред не получава rollup — него го няма в таблицата', () => {
    const zakachki = new Map([zakachka('О-1', 'Ф-1')]);
    const { rollup } = smetni(zakachki, [gledanRed('О-1', true)], [izvorenRed('Ф-1', 10_00)]);
    expect(rollup).toEqual([]);
  });

  it('от СЕБЕ СИ не се събира · за собствената таблица има агрегат по редове', () => {
    expect(() =>
      rollupPoZakachki(new Map(), 'Фактури', [], IZVOR, [], '1'),
    ).toThrow(/ДРУГА таблица/);
  });

  it('непарична колона се отказва С ДУМИ · rollup не събира текст', () => {
    expect(() =>
      rollupPoZakachki(new Map(), 'Обекти', [], IZVOR, [], '0'),
    ).toThrow(/не е пари/);
  });
});
