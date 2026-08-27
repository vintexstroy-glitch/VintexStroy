/**
 * РАЗМЕРЪТ НА ТЕКСТА · лост, видим по всяко време.
 *
 * Негови думи, 27.08: „Бутоните за размера на текста да е видим по всяко време
 * горе в дясно, на всеки прозорец."
 */

import { describe, expect, it } from 'vitest';
import { GOLEMINI, MNOZHITELI, lostatNaGoleminata } from '../app/golemina.ts';

describe('размерът на текста · трите стъпала', () => {
  it('стъпалата са ТРИ и са различни числа · инак лостът е декорация', () => {
    expect(GOLEMINI).toHaveLength(3);
    expect(new Set(GOLEMINI.map((g) => MNOZHITELI[g])).size).toBe(3);
  });

  it('нормалното е РОВНО едно · подразбраното не мени нищо', () => {
    // Числото е множител върху `--text-base`. Различно от 1 значи, че човек,
    // който никога не е пипал лоста, вижда друг размер от вчерашния.
    expect(MNOZHITELI.normalno).toBe(1);
  });

  it('редът е от дребно към едро · лостът се чете отляво надясно', () => {
    expect(MNOZHITELI.drebno).toBeLessThan(MNOZHITELI.normalno);
    expect(MNOZHITELI.normalno).toBeLessThan(MNOZHITELI.edro);
  });

  it('стъпките са умерени · нито едно не мени размера повече от една пета', () => {
    for (const g of GOLEMINI) {
      expect(MNOZHITELI[g]).toBeGreaterThanOrEqual(0.8);
      expect(MNOZHITELI[g]).toBeLessThanOrEqual(1.2);
    }
  });
});

describe('размерът на текста · разметката на лоста', () => {
  const razmetka = lostatNaGoleminata();

  it('рисува по един бутон на стъпало', () => {
    for (const g of GOLEMINI) expect(razmetka).toContain(`data-golemina="${g}"`);
    expect(razmetka.match(/data-golemina=/g)).toHaveLength(3);
  });

  it('всеки бутон носи ДУМА за четеца на екран · буква сама не се чете', () => {
    expect(razmetka).toContain('aria-label="Дребен текст"');
    expect(razmetka).toContain('aria-label="Нормален текст"');
    expect(razmetka).toContain('aria-label="Едър текст"');
  });

  it('отбелязано е ТОЧНО едно стъпало', () => {
    expect(razmetka.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it('групата се обявява на четеца · инак три голи „A" не значат нищо', () => {
    expect(razmetka).toContain('role="group"');
    expect(razmetka).toContain('aria-label="Размер на текста"');
  });
});
