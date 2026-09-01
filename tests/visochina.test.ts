/**
 * ВИСОЧИНАТА НА РЕДА · ЕДНА за цялата таблица, и колоните не я следват.
 *
 * Негови думи, 27.08: „Когато местиш една височина на един ред заедно местиш на
 * всички редове височината, ЗА КОЛОНИТЕ НЕ ВАЖИ."
 *
 * Трите готови гъстоти и лостът им са НАДЖИВЕНИ от двете теми (резен 78 ·
 * И124 т.5 · ADR-135) — темите се проверяват в `tests/tema.test.ts`; тук
 * остават границите на влаченето и домовете на Ганта.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NAY_GOLYAMO,
  NAY_MALKO,
  PODRAZBRANA,
  ogranichi,
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

  it('нечисло НЕ дава NaN на екрана · пада на подразбраното', () => {
    expect(ogranichi(Number.NaN)).toBe(PODRAZBRANA);
    expect(ogranichi(Number.POSITIVE_INFINITY)).toBe(PODRAZBRANA);
  });

  it('подразбраното Е премереният ред от резен 8', () => {
    expect(PODRAZBRANA).toBe(48);
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
