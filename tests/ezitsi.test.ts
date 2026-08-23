/**
 * ЕЗИЦИТЕ · двете решения и границата между тях.
 *
 * Пази три неща, които лесно се размиват:
 *   1. изборът на език НЕ е право — не се раздава от никого;
 *   2. терминалът и интерфейсът са РАЗЛИЧНИ решения, взети от различни хора;
 *   3. непознат език не оставя празен екран.
 */

import { describe, expect, it } from 'vitest';
import {
  ezik,
  EZITSI,
  EZIK_PO_PODRAZBIRANE,
  ezikNaSluzhitelya,
  ezikNaTerminala,
} from '../src/domein/ezitsi.js';
import { PAKETI } from '../src/domein/azbuki.js';
import { OPISANIE, PLANOVE } from '../src/domein/planove.js';

describe('езиците', () => {
  it('изборът на език НЕ е право — няма го в таблицата на плановете', () => {
    // На какъв език четеш бутоните не е привилегия, която някой раздава.
    const imena = Object.keys(OPISANIE);
    expect(imena.filter((v) => /ezik|jezik|language/i.test(v))).toEqual([]);
    for (const p of PLANOVE) {
      for (const v of p.vazmozhnosti) expect(v).not.toMatch(/ezik/i);
    }
  });

  it('терминалът и интерфейсът са различни решения', () => {
    // Главният акаунт заковава терминала; служителят избира интерфейса си.
    expect(ezikNaTerminala('bg').klyuch).toBe('bg');
    expect(ezikNaSluzhitelya('bg').klyuch).toBe('bg');
    // Непознат за единия не влачи другия със себе си.
    expect(ezikNaSluzhitelya('няма такъв').klyuch).toBe(EZIK_PO_PODRAZBIRANE);
  });

  it('непознат език пада към българския, не към празно', () => {
    expect(ezik('xx').klyuch).toBe('bg');
    expect(ezik(undefined).klyuch).toBe('bg');
    expect(ezik(null).klyuch).toBe('bg');
    expect(ezik('').klyuch).toBe('bg');
  });

  it('всеки език иска азбука, която пакетите могат да носят', () => {
    // Език без азбука в нито един пакет би се показал с резервния шрифт.
    for (const e of EZITSI) {
      const nosen = PAKETI.some((p) => p.podmnozhestva.includes(e.azbuka));
      expect(nosen, `няма пакет с азбука „${e.azbuka}" за ${e.ime}`).toBe(true);
    }
  });

  it('името на езика е на СОБСТВЕНИЯ му език', () => {
    // „Български", не „Bulgarian" — човек търси своя език, както го пише сам.
    expect(ezik('bg').ime).toBe('Български');
  });
});
