/**
 * ФИЛТЪРЪТ ПО КОНКРЕТЕН ДОГОВОР при сверката с извлечение (резен 36 · ADR-096).
 *
 * Негова дума *(р84·[28])*, дословно:
 *
 *   „в извлечения да се сверява с филтър за конкретен избор на договори по
 *    филтруте и филттите."
 *
 * Седемте обещания:
 *
 *   1. Записът НОСИ договора си · плащането през наема, разходът — празно.
 *   2. Договорите се четат от САМАТА сверка · не от списък с всички наеми.
 *   3. Стеснява се ПОГЛЕДЪТ, не сверката · банката не се отсява.
 *   4. „Само в банката" се СКРИВА при избран договор · и броят се КАЗВА.
 *   5. Частите се събират до ЦЯЛОТО · това е проверката, която го прави честен.
 *   6. Празният избор връща ТОЧНО всичко.
 *   7. Разходите НЕ принадлежат на договор · и не се появяват под никой.
 */

import { describe, expect, it } from 'vitest';
import { tsentove } from '../src/yadro/index.js';
import {
  BEZ_DOGOVOR,
  dogovoriteVSverkata,
  stesniPoDogovor,
  sverkaSIzvlechenie,
  sveriStesnyavaneto,
  type ZapisZaSverka,
} from '../src/domein/sverka-izvlechenie.js';
import type { RedOtKarta } from '../src/iztochnik/karta.js';

const KOGATO = '2026-08-30T12:00:00.000Z';
const PERIOD = '2026-05';

function zapis(n: Partial<ZapisZaSverka> & { klyuch: string; suma_st: number }): ZapisZaSverka {
  return {
    posoka: 'prihod',
    data: '2026-05-12',
    nachin: 'банка',
    koy: 'Наемател',
    dogovor: '',
    ...n,
  };
}

function bankov(n: Partial<RedOtKarta> & { klyuch: string; suma_st: number }): RedOtKarta {
  return {
    data: '2026-05-12',
    posoka: 'prihod',
    opis: 'наем',
    koy: 'Наемател',
    ...n,
  } as RedOtKarta;
}

/** Три записа: два по договор „N1", един по „N2", и един разход БЕЗ договор. */
function stend() {
  const zapisi = [
    zapis({ klyuch: 'plashtane:a', suma_st: tsentove(500_00), dogovor: 'N1', koy: 'Иван' }),
    zapis({ klyuch: 'plashtane:b', suma_st: tsentove(300_00), dogovor: 'N1', koy: 'Иван' }),
    zapis({ klyuch: 'plashtane:c', suma_st: tsentove(200_00), dogovor: 'N2', koy: 'Мария' }),
    zapis({ klyuch: 'razhod:d', suma_st: tsentove(100_00), posoka: 'razhod', koy: 'Баумит' }),
  ];
  // Банката вижда ДВА от четирите, плюс един свой ред без насрещен запис.
  // Имената носят платците — името е ТРЕТИЯТ белег на срещата (резен 73).
  const izvlechenie = [
    bankov({ klyuch: 'b1', suma_st: tsentove(500_00), koy: 'ПРЕВОД ОТ ИВАН' }),
    bankov({ klyuch: 'b2', suma_st: tsentove(200_00), koy: 'ПРЕВОД ОТ МАРИЯ' }),
    bankov({ klyuch: 'b3', suma_st: tsentove(777_00), koy: 'Непознат' }),
  ];
  return sverkaSIzvlechenie({
    period: PERIOD,
    zapisi,
    izvlechenie,
    ot: '2026-05-01',
    do: '2026-05-31',
  });
}

const IMENA: Readonly<Record<string, string>> = { N1: 'Иван Петров', N2: 'Мария Илиева' };
const imeNa = (id: string): string => IMENA[id] ?? '';

// ── 1 и 2 · ДОГОВОРИТЕ ────────────────────────────────────────────────────

describe('договорите в сверката', () => {
  it('се четат от САМАТА сверка · с броя си, за да не е сляп изборът', () => {
    const d = dogovoriteVSverkata(stend(), imeNa);
    expect(d).toEqual([
      { id: 'N1', ime: 'Иван Петров', broy: 2 },
      { id: 'N2', ime: 'Мария Илиева', broy: 1 },
    ]);
  });

  it('и БЕЗ договор не става избор · той не е договор, а липса', () => {
    expect(dogovoriteVSverkata(stend(), imeNa).map((d) => d.id)).not.toContain(BEZ_DOGOVOR);
  });

  it('наем без име се предлага с ключа си · не изчезва мълчаливо', () => {
    const d = dogovoriteVSverkata(stend(), () => '');
    expect(d).toHaveLength(2);
    expect(d.every((x) => x.ime === '')).toBe(true);
  });
});

// ── 3 · 4 · 6 · 7 · СТЕСНЯВАНЕТО ──────────────────────────────────────────

describe('стеснението', () => {
  it('показва САМО редовете на избрания договор', () => {
    const s = stesniPoDogovor(stend(), 'N1');
    expect(s.redove.map((x) => x.zapis.klyuch)).toEqual(['plashtane:a', 'plashtane:b']);
    expect(s.vhod_st).toBe(tsentove(800_00));
  });

  it('и РАЗХОДЪТ не се появява под никой договор · той няма наем', () => {
    for (const d of ['N1', 'N2']) {
      expect(stesniPoDogovor(stend(), d).redove.map((x) => x.zapis.klyuch)).not.toContain(
        'razhod:d',
      );
    }
  });

  it('„само в банката" се СКРИВА · и броят се КАЗВА', () => {
    const r = stend();
    expect(r.samoVBankata.length).toBeGreaterThan(0);
    const s = stesniPoDogovor(r, 'N1');
    expect(s.skritiOtBankata).toBe(r.samoVBankata.length);
  });

  it('празният избор връща ТОЧНО всичко · и нищо не се скрива', () => {
    const r = stend();
    const s = stesniPoDogovor(r, BEZ_DOGOVOR);
    expect(s.redove).toBe(r.redove);
    expect(s.vhod_st).toBe(r.vhod_st);
    expect(s.izhod_st).toBe(r.izhod_st);
    expect(s.skritiOtBankata).toBe(0);
  });

  it('а изходът брои само ОБЯСНЕНОТО · сверено плюс в брой', () => {
    // От двата реда на „N1" банката вижда само единия (500,00).
    const s = stesniPoDogovor(stend(), 'N1');
    expect(s.izhod_st).toBe(tsentove(500_00));
    expect(s.vhod_st - s.izhod_st).toBe(tsentove(300_00));
  });

  it('избор на договор, който го НЯМА, дава празно · не чужди редове', () => {
    const s = stesniPoDogovor(stend(), 'НЯМА-ТАКЪВ');
    expect(s.redove).toEqual([]);
    expect(s.vhod_st).toBe(0);
  });
});

// ── 5 · ЧАСТИТЕ СЕ СЪБИРАТ ДО ЦЯЛОТО ──────────────────────────────────────

describe('сверката на филтъра', () => {
  it('частите по договор ПЛЮС онова без договор дават целия вход', () => {
    const r = stend();
    const s = sveriStesnyavaneto(r, dogovoriteVSverkata(r, imeNa), KOGATO);
    expect(s.vhod).toBe(r.vhod_st);
    expect(s.izhod).toBe(r.vhod_st);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('а ИЗПУСНАТ договор я СЧУПВА · тя не е украса', () => {
    const r = stend();
    const bezEdin = dogovoriteVSverkata(r, imeNa).filter((d) => d.id !== 'N2');
    const s = sveriStesnyavaneto(r, bezEdin, KOGATO);
    expect(s.razlika).toBe(-tsentove(200_00));
    expect(s.nared).toBe(false);
  });

  it('и ДВА ПЪТИ броен договор също · и в двете посоки се вижда', () => {
    const r = stend();
    const dvazh = [...dogovoriteVSverkata(r, imeNa), { id: 'N1', ime: 'Иван Петров', broy: 2 }];
    const s = sveriStesnyavaneto(r, dvazh, KOGATO);
    expect(s.razlika).toBe(tsentove(800_00));
    expect(s.nared).toBe(false);
  });
});
