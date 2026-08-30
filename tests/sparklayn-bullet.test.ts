/**
 * СПАРКЛАЙНИ и BULLET · „Петте + спарклайни + bullet" (резен 35 · ADR-095).
 *
 * Негово прието предложение *(р59·[94])*, дословно:
 *
 *   „**Петте + спарклайни + bullet (препоръката)**"
 *
 * Осемте обещания:
 *
 *   1. Числото зад изречението е ОБЯВЕНО · не се разчита от думи.
 *   2. И се БРОИ срещу изреченията · сверка вход↔изход.
 *   3. Шест от дванайсет нямат ориентир · и това е ЧЕСТНО, не пропуск.
 *   4. „Няма ориентир" и „няма стойност" НЕ са „извън целта".
 *   5. Скалата се СМЯТА от двете числа · не се заковава на 100.
 *   6. Спарклайнът прескача празното · не го рисува като нула.
 *   7. Една стъпка е ТОЧКА, не линия · линия от една точка е лъжа.
 *   8. Равната редица стои по СРЕДАТА · не залепена на дъното.
 */

import { describe, expect, it } from 'vitest';
import { KOEFITSIENTI } from '../src/domein/koefitsienti.js';
import {
  dumiteNaPostizhkata,
  dyalatVSkalata,
  ORIENTIRI,
  orientiratNa,
  postignat,
  sIzrechenie,
  skalataNaBulleta,
  sveriOrientirite,
} from '../src/domein/orientiri.js';
import { dumataNaPosokata, sparklayn } from '../src/domein/sparklayn.js';

const KOGATO = '2026-08-30T12:00:00.000Z';

// ── 1 и 2 · ЧИСЛОТО ЗАД ИЗРЕЧЕНИЕТО ──────────────────────────────────────

describe('ориентирите', () => {
  it('са ОБЯВЕНИ · не се разчитат от изречението', () => {
    // „банките искат 1,25 – 1,50" · числата са в СТОТНИ, като самата стойност.
    expect(orientiratNa('dscr')).toEqual({ posoka: 'mezhdu', ot: 125, do_: 150 });
    expect(orientiratNa('oer')).toEqual({ posoka: 'pod', ot: 5000, do_: 5000 });
    expect(orientiratNa('ltv')).toEqual({ posoka: 'pod', ot: 8000, do_: 8000 });
  });

  it('и всяко число има ИЗРЕЧЕНИЕ до себе си · и обратното', () => {
    const sIzr = new Set(sIzrechenie().map((k) => k.klyuch));
    const sChislo = new Set(Object.keys(ORIENTIRI));
    expect([...sChislo].filter((k) => !sIzr.has(k))).toEqual([]);
    expect([...sIzr].filter((k) => !sChislo.has(k))).toEqual([]);
  });

  it('сверката ги БРОИ · и нулата се записва', () => {
    const s = sveriOrientirite(KOGATO);
    expect(s.vhod).toBe(6);
    expect(s.izhod).toBe(6);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('а ШЕСТТЕ без ориентир са ЧЕСТНИ · занаятът няма едно число за тях', () => {
    const bez = KOEFITSIENTI.filter((k) => orientiratNa(k.klyuch) === undefined);
    expect(bez).toHaveLength(6);
    // И нито един от тях НЕ обещава обичайно в изречението си.
    for (const k of bez) expect(k.obichayno).toBe('');
  });
});

// ── 3 и 4 · ПОПАДА ЛИ В ЦЕЛТА ────────────────────────────────────────────

describe('попадението', () => {
  it('над · под · между · всяко в своята посока', () => {
    expect(postignat('likvidnost', 120)).toBe('v-tsel'); // над 1,00
    expect(postignat('likvidnost', 80)).toBe('vun');
    expect(postignat('oer', 4000)).toBe('v-tsel'); // под 50 %
    expect(postignat('oer', 6000)).toBe('vun');
    expect(postignat('dscr', 140)).toBe('v-tsel'); // 1,25 – 1,50
    expect(postignat('dscr', 160)).toBe('vun');
    expect(postignat('dscr', 100)).toBe('vun');
  });

  it('и границата САМА е в целта · „над 1,00" значи и 1,00', () => {
    expect(postignat('likvidnost', 100)).toBe('v-tsel');
    expect(postignat('oer', 5000)).toBe('v-tsel');
    expect(postignat('dscr', 125)).toBe('v-tsel');
    expect(postignat('dscr', 150)).toBe('v-tsel');
  });

  it('липсата НЕ е „извън целта" · и двете липси са РАЗЛИЧНИ', () => {
    // Коефициент без праг не свети червено само защото никой не му е дал цел.
    expect(postignat('noi', 1000)).toBe('nyama-orientir');
    expect(postignat('oer', undefined)).toBe('nyama-stoynost');
    expect(dumiteNaPostizhkata('nyama-orientir')).toContain('занаятът');
    expect(dumiteNaPostizhkata('nyama-stoynost')).toContain('няма стойност');
  });
});

// ── 5 · СКАЛАТА ──────────────────────────────────────────────────────────

describe('скалата на bullet-а', () => {
  it('се СМЯТА от двете числа · с четвърт запас', () => {
    // Целта е 80 %, стойността 60 % → скалата се води от целта.
    expect(skalataNaBulleta('ltv', 6000)).toBe(10000);
    // Стойност НАД целта разтяга скалата, вместо да се реже.
    expect(skalataNaBulleta('ltv', 12000)).toBe(15000);
  });

  it('и не се заковава на 100 · LTV от 120 % не се рисува като 100', () => {
    const dyal = dyalatVSkalata('ltv', 12000, 12000);
    expect(dyal).toBeLessThan(1);
    expect(dyal).toBeGreaterThan(0.7);
  });

  it('дъното е НУЛАТА · лента, отрязана над нея, лъже за разликата', () => {
    expect(dyalatVSkalata('ltv', 6000, 0)).toBe(0);
  });
});

// ── 6 · 7 · 8 · СПАРКЛАЙНЪТ ──────────────────────────────────────────────

describe('спарклайнът', () => {
  it('води линията през числата · първото долу, последното горе', () => {
    const s = sparklayn([10, 20, 30], 60, 10);
    expect(s.tochki.map((t) => t.x)).toEqual([0, 30, 60]);
    expect(s.tochki[0]!.y).toBe(10); // най-малкото · на дъното
    expect(s.tochki[2]!.y).toBe(0); // най-голямото · горе
    expect(s.patyat).toBe('0,10 30,5 60,0');
    expect(s.posoka).toBe('nagore');
  });

  it('ПРЕСКАЧА празната стъпка · не я рисува като нула', () => {
    const s = sparklayn([10, undefined, 30], 60, 10);
    expect(s.sChisla).toBe(2);
    expect(s.tochki).toHaveLength(2);
    // Втората точка стои на позиция 2 (x = 60), не на 1 · дупката не се сгъва.
    expect(s.tochki.map((t) => t.nomer)).toEqual([0, 2]);
    // И най-малкото е 10, не 0 · празното не влиза в размаха.
    expect(s.tochki[0]!.y).toBe(10);
  });

  it('ЕДНА стъпка е ТОЧКА · линия от една точка е лъжа за тенденция', () => {
    const s = sparklayn([42], 60, 10);
    expect(s.tochki).toHaveLength(1);
    expect(s.tochki[0]!.x).toBe(30); // по средата
    expect(s.posoka).toBe('nyama');
    expect(dumataNaPosokata(s)).toContain('няма посока');
  });

  it('РАВНАТА редица стои по СРЕДАТА · не залепена на дъното', () => {
    const s = sparklayn([7, 7, 7], 60, 10);
    expect(s.tochki.map((t) => t.y)).toEqual([5, 5, 5]);
    expect(s.posoka).toBe('ravno');
    expect(dumataNaPosokata(s)).toBe('без промяна');
  });

  it('празната редица не рисува НИЩО · и го КАЗВА', () => {
    const s = sparklayn([undefined, undefined], 60, 10);
    expect(s.tochki).toEqual([]);
    expect(s.patyat).toBe('');
    expect(s.sChisla).toBe(0);
    expect(dumataNaPosokata(s)).toBe('няма данни');
  });

  it('и посоката се чете от ПЪРВОТО и ПОСЛЕДНОТО число, не от върха', () => {
    // Върхът е по средата, но краят е под началото — посоката е НАДОЛУ.
    expect(sparklayn([10, 90, 5], 60, 10).posoka).toBe('nadolu');
  });
});
