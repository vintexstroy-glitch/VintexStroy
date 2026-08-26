/**
 * ПАДАЩИТЕ МЕНЮТА · законът от 25.08 (И97).
 *
 * Пази шестте му правила, и третото е най-финото:
 *   · избрано от списъка → СИНЬО; писано на ръка → ЧЕРНО;
 *   · редакция след избор ПОЧЕРНЯВА в мига на разликата;
 *   · **случайно точно съвпадение ОСТАВА ЧЕРНО** — човекът не е избирал;
 *   · заключеното меню НЕ почернява — то отказва, и КАЗВА кой може;
 *   · стара стойност НЕ се трие — спира да се предлага;
 *   · подравняване маха интервалите, но НЕ пипа главните букви.
 */

import { describe, expect, it } from 'vitest';
import {
  GreshkaMenyu,
  IMENA_NA_VIDOVETE_VHOD,
  SASTOYANIYA,
  VIDOVE_VHOD,
  dobaviStoynost,
  podravni,
  pokazateliNaMenyuto,
  predlagani,
  sastoyanieNaPoleto,
  spriDaSePredlaga,
  varniVSpisaka,
  veche,
  type Menyu,
} from '../src/domein/padashti-menyuta.js';

/** ОТВОРЕНО меню · описва, значи расте свободно. */
const NACHINI: Menyu = Object.freeze({
  klyuch: 'nachini',
  ime: 'Начин на плащане',
  vid: 'otvoreno',
  stoynosti: Object.freeze([
    { tekst: 'банка', predlagaSe: true },
    { tekst: 'в брой', predlagaSe: true },
  ]),
});

/** ЗАКЛЮЧЕНО меню · системата СМЯТА върху него (етапът на сделката). */
const ETAP: Menyu = Object.freeze({
  klyuch: 'etap',
  ime: 'Етап на сделката',
  vid: 'zaklyucheno',
  stoynosti: Object.freeze([
    { tekst: 'ПД', predlagaSe: true },
    { tekst: 'НС', predlagaSe: true },
  ]),
});

describe('двата вида вход · описва срещу смята', () => {
  it('са изброени поименно и всеки има име', () => {
    expect([...VIDOVE_VHOD]).toEqual(['otvoreno', 'zaklyucheno']);
    for (const v of VIDOVE_VHOD) expect(IMENA_NA_VIDOVETE_VHOD[v]).not.toBe('');
  });

  it('четирите състояния са изброени', () => {
    expect([...SASTOYANIYA]).toEqual(['prazno', 'izbrano', 'novo', 'otkazano']);
  });
});

describe('цветът казва какво си направил', () => {
  it('ИЗБРАНО от списъка · СИНЬО, и нищо ново не се създава', () => {
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'банка', izbrano: 'банка' });
    expect(r.sastoyanie).toBe('izbrano');
    expect(r.tsvyat).toBe('sinio');
    expect(r.shteDobavi).toBe(false);
  });

  it('ПИСАНО на ръка · ЧЕРНО, и влиза в списъка', () => {
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'пощенски запис' });
    expect(r.sastoyanie).toBe('novo');
    expect(r.tsvyat).toBe('cherno');
    expect(r.shteDobavi).toBe(true);
    expect(r.kazva).toContain('ще я виждат всички');
  });

  it('РЕДАКЦИЯ след избор ПОЧЕРНЯВА в мига на разликата', () => {
    // Иначе оставаш със синьо, което вече не е вярно — тихата грешка,
    // която се открива след месеци с пет варианта на едно нещо.
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'банка ДСК', izbrano: 'банка' });
    expect(r.sastoyanie).toBe('novo');
    expect(r.tsvyat).toBe('cherno');
    expect(r.shteDobavi).toBe(true);
  });

  it('СЛУЧАЙНО точно съвпадение ОСТАВА ЧЕРНО · човекът не е избирал', () => {
    // Най-финото му правило: „цветът не бива да лъже за какво си направил."
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'банка' });
    expect(r.sastoyanie).toBe('novo');
    expect(r.tsvyat).toBe('cherno');
    // ...но дубликат НЕ се създава
    expect(r.shteDobavi).toBe(false);
    expect(r.kazva).toContain('дубликат не се създава');
  });

  it('празното поле няма цвят и не казва нищо', () => {
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: '   ' });
    expect(r.sastoyanie).toBe('prazno');
    expect(r.tsvyat).toBe('');
    expect(r.kazva).toBe('');
  });

  it('НИЩО не спира човека при отворено меню', () => {
    for (const vaveden of ['банка', 'нещо съвсем ново', 'в брой']) {
      expect(sastoyanieNaPoleto({ menyu: NACHINI, vaveden }).priema, vaveden).toBe(true);
    }
  });
});

describe('цветът НЕ носи смисъла сам · вторият носител', () => {
  it('новата стойност носи ДУМА, не само чернота', () => {
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'пощенски запис' });
    // Онзи, който не различава синьо от черно, чете това.
    expect(r.znak).toContain('нова');
  });

  it('и съвпадението си има своя дума', () => {
    expect(sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'банка' }).znak).toContain('съществуваща');
  });

  it('избраното няма нужда от дума — там няма какво да се учи', () => {
    expect(sastoyanieNaPoleto({ menyu: NACHINI, vaveden: 'банка', izbrano: 'банка' }).znak).toBe('');
  });
});

describe('заключеното меню · НЕ почернява, а отказва', () => {
  it('избраното пак е СИНЬО, както навсякъде', () => {
    const r = sastoyanieNaPoleto({ menyu: ETAP, vaveden: 'ПД', izbrano: 'ПД' });
    expect(r.tsvyat).toBe('sinio');
    expect(r.priema).toBe(true);
  });

  it('новото НЕ почернява — то не се приема', () => {
    const r = sastoyanieNaPoleto({ menyu: ETAP, vaveden: 'Акт 16' });
    expect(r.sastoyanie).toBe('otkazano');
    expect(r.tsvyat).toBe('');
    expect(r.priema).toBe(false);
  });

  it('и КАЗВА кой може, вместо да мълчи', () => {
    const r = sastoyanieNaPoleto({ menyu: ETAP, vaveden: 'Акт 16' });
    expect(r.kazva).toContain('Настройки');
    expect(r.kazva).toContain('системата смята');
  });

  it('но СЪЩЕСТВУВАЩА стойност, написана на ръка, минава', () => {
    // Тя не добавя нищо — значи няма какво да се заключва.
    const r = sastoyanieNaPoleto({ menyu: ETAP, vaveden: 'НС' });
    expect(r.priema).toBe(true);
    expect(r.shteDobavi).toBe(false);
  });
});

describe('подравняването · интервалите падат, ГЛАВНИТЕ БУКВИ не', () => {
  it('маха излишния интервал в началото, в края и между думите', () => {
    expect(podravni('  Акт   15  ')).toBe('Акт 15');
  });

  it('но НЕ пипа регистъра · „Акт 15" и „акт 15" може да са различни неща', () => {
    expect(podravni('АКТ 15')).toBe('АКТ 15');
    expect(veche({ ...NACHINI, stoynosti: [{ tekst: 'Банка', predlagaSe: true }] }, 'банка')).toBe(
      false,
    );
  });

  it('и разликата само в интервали НЕ прави нова стойност', () => {
    const r = sastoyanieNaPoleto({ menyu: NACHINI, vaveden: '  в   брой ' });
    expect(r.shteDobavi).toBe(false);
  });
});

describe('добавянето в речника', () => {
  it('новата влиза и се предлага веднага', () => {
    const m = dobaviStoynost(NACHINI, 'пощенски запис');
    expect(m.stoynosti).toHaveLength(3);
    expect(predlagani(m).map((s) => s.tekst)).toContain('пощенски запис');
  });

  it('дубликат не се създава · и това не е грешка', () => {
    expect(dobaviStoynost(NACHINI, ' банка ')).toBe(NACHINI);
  });

  it('празната се отказва С ДУМИ', () => {
    expect(() => dobaviStoynost(NACHINI, '  ')).toThrow(GreshkaMenyu);
  });

  it('в ЗАКЛЮЧЕНО меню може само Стопанинът', () => {
    expect(() => dobaviStoynost(ETAP, 'Акт 16')).toThrow(/само от Стопанина/);
    expect(dobaviStoynost(ETAP, 'Акт 16', true).stoynosti).toHaveLength(3);
  });
});

describe('стара стойност НЕ се трие', () => {
  it('спира да се предлага, но ОСТАВА в списъка', () => {
    const m = spriDaSePredlaga(NACHINI, 'в брой');
    expect(m.stoynosti).toHaveLength(2); // нищо не е изчезнало
    expect(predlagani(m).map((s) => s.tekst)).toEqual(['банка']);
    // и редовете, които вече я носят, я намират
    expect(veche(m, 'в брой')).toBe(true);
  });

  it('и се връща в списъка със същия път', () => {
    const m = varniVSpisaka(spriDaSePredlaga(NACHINI, 'в брой'), 'в брой');
    expect(predlagani(m)).toHaveLength(2);
  });

  it('несъществуваща стойност се отказва С ДУМИ', () => {
    expect(() => spriDaSePredlaga(NACHINI, 'няма такова')).toThrow(GreshkaMenyu);
  });

  it('спряната НЕ пречи на съвпадението · дубликат пак не се създава', () => {
    const m = spriDaSePredlaga(NACHINI, 'в брой');
    expect(sastoyanieNaPoleto({ menyu: m, vaveden: 'в брой' }).shteDobavi).toBe(false);
  });

  it('показателите ги броят', () => {
    const p = pokazateliNaMenyuto(spriDaSePredlaga(NACHINI, 'в брой'));
    expect(p).toEqual({ vsichki: 2, predlagani: 1, sprenii: 1 });
  });
});
