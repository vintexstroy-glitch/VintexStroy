/**
 * ВИСОЧИНАТА НА РЕДА · ЕДНА за цялата таблица, и колоните не я следват.
 *
 * Негови думи, 27.08: „Когато местиш една височина на един ред заедно местиш на
 * всички редове височината, ЗА КОЛОНИТЕ НЕ ВАЖИ."
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GASTOTI,
  NAY_GOLYAMO,
  NAY_MALKO,
  VISOCHINI,
  gastotaNa,
  ogranichi,
  sledvashtataGastota,
  zapomnenaVisochina,
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

describe('лостът · един бутон обхожда трите гъстоти', () => {
  it('кръгът е сбито → средно → широко → сбито · нищо не се пропуска', () => {
    expect(sledvashtataGastota('sbito')).toBe('sredno');
    expect(sledvashtataGastota('sredno')).toBe('shiroko');
    expect(sledvashtataGastota('shiroko')).toBe('sbito');
  });
});

describe('запомнената височина · за рисувачи извън CSS (диаграмата на Ганта)', () => {
  it('без хранилище пада на началото · node няма localStorage', () => {
    expect(zapomnenaVisochina('gant-redove', 26)).toBe(26);
  });

  it('и началото минава през границите · шум не стига до екрана', () => {
    expect(zapomnenaVisochina('x', 900)).toBe(NAY_GOLYAMO);
    expect(zapomnenaVisochina('x', -5)).toBe(NAY_MALKO);
  });
});

describe('Гантът · подразбраните 26 на двете си места', () => {
  // Числото стои в `stil.css` (за CSS променливата) и в `gant-diagrama.ts`
  // (за SVG координатите) — двата дома не могат да са един, защото SVG не
  // чете CSS променливи. 26 тук е ЗАКОВАНО С РЪКА: разместят ли се, решетката
  // и диаграмата спират да са „едно" (И104), без никой да го види.
  it('stil.css казва 26px на .gant', () => {
    expect(readFileSync('app/stil.css', 'utf8')).toMatch(
      /\.gant \{[^}]*--red-visochina: 26px;/s,
    );
  });

  it('gant-diagrama.ts казва СЪЩОТО 26', () => {
    expect(readFileSync('app/gant-diagrama.ts', 'utf8')).toMatch(
      /const RED_NACHALO = 26;/,
    );
  });
});
