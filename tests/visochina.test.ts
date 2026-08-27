/**
 * ВИСОЧИНАТА НА РЕДА · ЕДНА за цялата таблица, и колоните не я следват.
 *
 * Негови думи, 27.08: „Когато местиш една височина на един ред заедно местиш на
 * всички редове височината, ЗА КОЛОНИТЕ НЕ ВАЖИ."
 */

import { describe, expect, it } from 'vitest';
import {
  GASTOTI,
  NAY_GOLYAMO,
  NAY_MALKO,
  VISOCHINI,
  gastotaNa,
  ogranichi,
} from '../app/visochina.ts';

describe('височината на реда · границите', () => {
  it('под най-малкото се вдига · под 24px редът не се пипа с пръст', () => {
    expect(ogranichi(4)).toBe(NAY_MALKO);
    expect(ogranichi(-100)).toBe(NAY_MALKO);
  });

  it('над най-голямото се сваля · над 160px редът престава да е ред', () => {
    expect(ogranichi(900)).toBe(NAY_GOLYAMO);
  });

  it('вътре в позволеното минава непокътнато, но цяло', () => {
    expect(ogranichi(48)).toBe(48);
    expect(ogranichi(48.6)).toBe(49);
  });

  it('нечисло НЕ дава NaN на екрана · пада на средното', () => {
    expect(ogranichi(Number.NaN)).toBe(VISOCHINI.sredno);
    expect(ogranichi(Number.POSITIVE_INFINITY)).toBe(VISOCHINI.sredno);
  });
});

describe('височината на реда · коя гъстота е това число', () => {
  it('трите предварителни числа се познават сами', () => {
    for (const g of GASTOTI) expect(gastotaNa(VISOCHINI[g])).toBe(g);
  });

  it('след влачене се показва НАЙ-БЛИЗКАТА, не „никоя"', () => {
    // Точното съвпадение би оставило и трите неотбелязани веднага след първото
    // дръпване — тогава лостът лъже, че нищо не е избрано.
    expect(gastotaNa(VISOCHINI.sredno + 2)).toBe('sredno');
    expect(gastotaNa(VISOCHINI.sbito - 3)).toBe('sbito');
    expect(gastotaNa(VISOCHINI.shiroko + 40)).toBe('shiroko');
  });

  it('всяко позволено число има гъстота · никое не остава без име', () => {
    for (let px = NAY_MALKO; px <= NAY_GOLYAMO; px += 1) {
      expect(GASTOTI).toContain(gastotaNa(px));
    }
  });

  it('трите гъстоти са ТРИ РАЗЛИЧНИ числа · инак лостът е декорация', () => {
    expect(new Set(GASTOTI.map((g) => VISOCHINI[g])).size).toBe(3);
  });

  it('и трите са вътре в границите', () => {
    for (const g of GASTOTI) {
      expect(VISOCHINI[g]).toBeGreaterThanOrEqual(NAY_MALKO);
      expect(VISOCHINI[g]).toBeLessThanOrEqual(NAY_GOLYAMO);
    }
  });

  it('средното Е премереният ред от резен 8 · подразбраното не мени нищо', () => {
    expect(VISOCHINI.sredno).toBe(48);
  });
});
