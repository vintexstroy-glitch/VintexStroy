/**
 * ПЕТТЕ ЗАЛОЖЕНИ МОДЕЛА ПО БРАНШ · честен статус (резен 33 · ADR-093).
 *
 * Двете му изречения от 12.08, които са ЕДНО решение на две части:
 *
 *   „Да, но да има зал8жени модели за избор, както е в МС Прочект. Строителна
 *    фирма, магазин и още 3 общо най основните 5 модела ще се опитаме да дадем
 *    за тях накаква подредена база." *(р83·[132])*
 *
 *   „Склад · Услуги · Ресторант" *(р83·[134])*
 *
 * Шестте обещания:
 *
 *   1. Петте са ПЕТ · и имената са НЕГОВИ, в неговия ред.
 *   2. Всяко носи АДРЕСА на думата си · находка без адрес не се слива.
 *   3. Построен е ЕДИН · и това се БРОИ, не се твърди.
 *   4. Базата му се БРОИ от живия код · преписано число щеше да остарее.
 *   5. Непостроеният има ЧЕСТНА нула · не чужди числа.
 *   6. И не се предлага за избор · бутон без последица е надпис.
 */

import { describe, expect, it } from 'vitest';
import { AKUMULATORI } from '../src/domein/dds.js';
import { POTOTSI } from '../src/domein/smetki.js';
import {
  bazataNa,
  branshovete,
  broyPostroeni,
  MODELI_PO_BRANSH,
  mozheDaSeIzbere,
  NEGOVITE_PET,
  POSTROENITE,
  sveriBranshovete,
} from '../src/domein/modeli-po-bransh.js';

const KOGATO = '2026-08-30T12:00:00.000Z';

// ── 1 и 2 · ИМЕНАТА И АДРЕСИТЕ ────────────────────────────────────────────

describe('петте модела', () => {
  it('са ПЕТ · и числото е негово', () => {
    expect(NEGOVITE_PET).toBe(5);
    expect(MODELI_PO_BRANSH).toHaveLength(5);
  });

  it('и имената са НЕГОВИ, в НЕГОВИЯ ред', () => {
    expect(MODELI_PO_BRANSH.map((m) => m.ime)).toEqual([
      'Строителна фирма',
      'Магазин',
      'Склад',
      'Услуги',
      'Ресторант',
    ]);
  });

  it('всяко носи АДРЕСА на думата си · находка без адрес не се слива', () => {
    // Първите две са от [132]; трите — от [134], същия ден. Двете изречения са
    // ЕДНО решение, и точно затова адресите им са различни, а не един.
    expect(MODELI_PO_BRANSH.map((m) => m.izvor)).toEqual([
      'р83·[132]',
      'р83·[132]',
      'р83·[134]',
      'р83·[134]',
      'р83·[134]',
    ]);
  });
});

// ── 3 · КОЛКО СА ПОСТРОЕНИ ────────────────────────────────────────────────

describe('построените', () => {
  it('са ЕДИН · и това се БРОИ, не се твърди', () => {
    expect(broyPostroeni()).toBe(1);
    expect(POSTROENITE.has('stroitelna')).toBe(true);
  });

  it('и това е СТРОИТЕЛНАТА ФИРМА · тя е днешното приложение', () => {
    const r = branshovete().find((x) => x.klyuch === 'stroitelna')!;
    expect(r.postroen).toBe(true);
    expect(r.kakvo).toContain('днешното приложение');
  });

  it('останалите ЧЕТИРИ казват честно, че чакат', () => {
    const chakat = branshovete().filter((r) => !r.postroen);
    expect(chakat).toHaveLength(4);
    for (const r of chakat) expect(r.kakvo).toContain('чака неговата дума');
  });
});

// ── 4 и 5 · БАЗАТА ────────────────────────────────────────────────────────

describe('базата на модела', () => {
  it('се БРОИ от ЖИВИЯ код · не се преписва', () => {
    const b = bazataNa('stroitelna');
    // Числата НЕ са закована седмица: те идват от самите списъци, тъй че осми
    // акумулатор утре ги мени сам.
    expect(b.sektori).toBe(AKUMULATORI.length);
    expect(b.pototsi).toBe(POTOTSI.length);
  });

  it('и седемте сектора СА на строителна фирма · това го казва самият списък', () => {
    const imena = AKUMULATORI.map((a) => a.sektor).join(' · ');
    expect(imena).toContain('строителни услуги');
    expect(imena).toContain('покупки · материали');
  });

  it('а непостроеният има ЧЕСТНА нула · не чужди числа', () => {
    for (const k of ['magazin', 'sklad', 'uslugi', 'restorant'] as const) {
      expect(bazataNa(k)).toEqual({ sektori: 0, pototsi: 0 });
    }
  });
});

// ── 6 · ИЗБОРЪТ ───────────────────────────────────────────────────────────

describe('изборът на модел', () => {
  it('се предлага САМО за построения · бутон без последица е надпис', () => {
    expect(mozheDaSeIzbere('stroitelna')).toBe(true);
    for (const k of ['magazin', 'sklad', 'uslugi', 'restorant'] as const) {
      expect(mozheDaSeIzbere(k)).toBe(false);
    }
  });
});

// ── СВЕРКАТА ──────────────────────────────────────────────────────────────

describe('сверката на регистъра', () => {
  it('брои неговите имена срещу регистъра · и нулата се записва', () => {
    const s = sveriBranshovete(KOGATO);
    expect(s.vhod).toBe(5);
    expect(s.izhod).toBe(5);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });
});
