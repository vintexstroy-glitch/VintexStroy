/**
 * АГРЕГАТЪТ ПО РЕДОВЕ · сбор · брой · средно (резен 81 · ADR-139).
 *
 * Негова дума (И121 т.2): „нещо да се смята с комбинация от други редове,
 * да наблюдава сметка от други добавени редове."
 *
 * Какво пазят тестовете, поименно:
 *   1. Агрегатът иска ТОЧНО една колона-източник, и видът се смята от нея.
 *   2. `smetniFormula` отказва агрегат С ДУМИ — той не е сметка на един ред.
 *   3. Празните клетки се ПРОПУСКАТ, не стават нули; всички празни → null.
 *   4. Средното се закръгля и се ПОКАЗВА — закръгленото не влиза в сбор.
 *   5. `smetniKolonite` показва СЪЩОТО число на всеки ред, а „сборът" му е
 *      самата стойност — наблюдателят не се умножава по броя редове.
 */

import { describe, expect, it } from 'vitest';
import { napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';
import {
  DEYSTVIYA_PO_REDOVE,
  eAgregat,
  IMENA_PO_REDOVE,
  imeNaDeystvie,
  proveriFormula,
  sDumiFormula,
  smetniAgregat,
  smetniFormula,
  smetniKolonite,
} from '../src/domein/formuli.js';
import { dobaviFormulnaKolona } from '../src/domein/redaktor.js';

const TABLITSA: Tablitsa = {
  ime: 'Наеми',
  redove: [
    ['Дата', 'Наем', 'Ставка', 'Обект'],
    ['2026-08-05', '500,00', '20', 'АП. 1'],
    ['2026-08-05', '1 200,00', '9', 'ОФИС 3'],
    ['2026-08-06', '', '20', ''],
  ],
};

function model(): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Наеми',
    tablitsa: TABLITSA,
    redNaGlavata: 0,
    koloni: { data: 0, suma: 1 },
    vidove: { 0: 'data', 1: 'evro', 2: 'protsent', 3: 'tekst' },
  });
}

const kletkaNa = (red: number, kolona: number): string => TABLITSA.redove[red]?.[kolona] ?? '';

// ── 1 · СПИСЪКЪТ, ОПЕРАНДЪТ И ВИДЪТ ────────────────────────────────────────

describe('трите вертикални действия', () => {
  it('са ТРИ, поименно, с имена за човека', () => {
    expect([...DEYSTVIYA_PO_REDOVE]).toEqual(['sbor-redove', 'broy-redove', 'sredno-redove']);
    // Имената са ЗАКОВАНИ с ръка — по тях човекът избира от менюто.
    expect(IMENA_PO_REDOVE).toEqual({
      'sbor-redove': 'сбор по редове',
      'broy-redove': 'брой по редове',
      'sredno-redove': 'средно по редове',
    });
    for (const d of DEYSTVIYA_PO_REDOVE) {
      expect(eAgregat(d)).toBe(true);
      expect(imeNaDeystvie(d)).toBe(IMENA_PO_REDOVE[d]);
    }
    expect(eAgregat('sbor')).toBe(false);
    expect(imeNaDeystvie('sbor')).toBe('сбор');
  });

  it('искат точно ЕДНА колона — източника', () => {
    expect(() => proveriFormula(model(), { deystvie: 'sbor-redove', ot: [1, 2] })).toThrow(
      /точно ЕДНА колона/,
    );
    expect(proveriFormula(model(), { deystvie: 'sbor-redove', ot: [1] })).toBe('evro');
  });

  it('видът се смята от източника · и отказва безсмисленото', () => {
    expect(proveriFormula(model(), { deystvie: 'broy-redove', ot: [3] })).toBe('chislo');
    expect(proveriFormula(model(), { deystvie: 'sredno-redove', ot: [2] })).toBe('protsent');
    // сбор от ставки е число без смисъл — отказва се с думи
    expect(() => proveriFormula(model(), { deystvie: 'sbor-redove', ot: [2] })).toThrow(
      /ставки/,
    );
    expect(() => proveriFormula(model(), { deystvie: 'sredno-redove', ot: [3] })).toThrow(
      /евро, число или процент/,
    );
  });

  it('и Редакторът ги ражда като ЗАТВОРЕНИ формулни колони', () => {
    const s = dobaviFormulnaKolona(model(), {
      ime: 'Всички наеми',
      formula: { deystvie: 'sbor-redove', ot: [1] },
      rolya: 'sobstvenik',
    });
    const k = s.glavi.length - 1;
    expect(s.zatvoreni).toContain(k);
    expect(s.vidove[k]).toBe('evro');
    expect(sDumiFormula(s, s.formuli[k]!)).toBe('сбор по редове(Наем)');
  });
});

// ── 2 · СМЕТКАТА ───────────────────────────────────────────────────────────

describe('smetniAgregat', () => {
  it('сборът пропуска празните · не измисля нули', () => {
    expect(smetniAgregat('sbor-redove', ['500,00', '1 200,00', ''], 'evro')).toBe(1700_00);
  });

  it('броят брои НЕПРАЗНИТЕ · и текст, в стотни', () => {
    expect(smetniAgregat('broy-redove', ['АП. 1', 'ОФИС 3', ''], 'tekst')).toBe(200);
    // броят на нищо е нула — преброена, не липсваща (правило 7 по дух)
    expect(smetniAgregat('broy-redove', ['', ''], 'tekst')).toBe(0);
  });

  it('средното се закръгля към най-близкото', () => {
    // (500,00 + 1 200,01) / 2 = 850,005 → 850,01 (закръглено, само за показ)
    expect(smetniAgregat('sredno-redove', ['500,00', '1200,01'], 'evro')).toBe(850_01);
  });

  it('колона без нито една стойност дава ПРАЗНО, не нула', () => {
    expect(smetniAgregat('sbor-redove', ['', ''], 'evro')).toBeNull();
    expect(smetniAgregat('sredno-redove', [], 'evro')).toBeNull();
  });

  it('нечетима клетка ХВЪРЛЯ гласно · колоната не лъже мълчаливо', () => {
    expect(() => smetniAgregat('sbor-redove', ['500,00', 'абв'], 'evro')).toThrow();
  });

  it('а smetniFormula отказва агрегат С ДУМИ — друг е пътят му', () => {
    expect(() =>
      smetniFormula({ deystvie: 'sbor-redove', ot: [1] }, ['500,00'], () => 'evro'),
    ).toThrow(/smetniAgregat/);
  });
});

// ── 3 · ВСЕКИ РЕД ПОКАЗВА СЪЩОТО · сборът не умножава ─────────────────────

describe('агрегатната колона в таблицата', () => {
  it('всеки ред носи същото число, сборът е самата стойност', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Всички наеми',
      formula: { deystvie: 'sbor-redove', ot: [1] },
      rolya: 'sobstvenik',
    });
    const [k] = smetniKolonite(m, { redove: [1, 2, 3], kletka: kletkaNa });
    expect(k?.redove.map((r) => r.stoynost)).toEqual([1700_00, 1700_00, 1700_00]);
    // наблюдателят не се умножава по броя редове — 1 700, не 5 100
    expect(k?.sbor).toBe(1700_00);
    expect(k?.vid).toBe('evro');
  });
});
