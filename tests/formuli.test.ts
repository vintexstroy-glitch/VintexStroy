/**
 * ФОРМУЛИТЕ НА КОЛОНИТЕ (И92 т.8–9).
 *
 * Пази трите неща, които проучването нарече най-скъпите капани:
 *   · формула върху формула — не се позволява (плитък граф);
 *   · операнд, махнат изпод формула — отказ ПРЕДИ, не #ERROR след това;
 *   · преименуване НЕ чупи формула (референцията е по номер, не по име).
 * И четвъртото, което е наше: видът се СМЯТА от операндите, не се избира.
 */

import { describe, expect, it } from 'vitest';
import { napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';
import {
  GreshkaFormula,
  otStotni,
  proveriFormula,
  sDumiFormula,
  smetniFormula,
  smetniKolonite,
  vidNaFormulata,
} from '../src/domein/formuli.js';
import {
  dobaviFormulnaKolona,
  GreshkaRedaktor,
  opisNaPodredba,
  preimenuvayKolona,
  premahniKolona,
  smeniFormula,
} from '../src/domein/redaktor.js';

const TABLITSA: Tablitsa = {
  ime: 'Наеми',
  redove: [
    ['Дата', 'Наем', 'Такса', 'Ставка', 'Обект'],
    ['2026-08-05', '500,00', '20,00', '20', 'АП. 1'],
    ['2026-08-05', '1 200,00', '30,00', '20', 'ОФИС 3'],
    ['2026-08-06', '', '10,00', '20', 'АП. 2'],
  ],
};

function model(): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Наеми',
    tablitsa: TABLITSA,
    redNaGlavata: 0,
    koloni: { data: 0, suma: 1 },
    vidove: { 0: 'data', 1: 'evro', 2: 'evro', 3: 'protsent', 4: 'tekst' },
  });
}

const kletkaNa = (red: number, kolona: number): string => TABLITSA.redove[red]?.[kolona] ?? '';

describe('числото в стотни', () => {
  it('чете процент и число със същата дисциплина като парите', () => {
    expect(otStotni('20')).toBe(2000);
    expect(otStotni('2,5')).toBe(250);
    expect(otStotni('20 %')).toBe(2000);
    expect(otStotni('-1 250,75')).toBe(-125075);
    expect(() => otStotni('абв')).toThrow();
  });
});

describe('видът на формулната колона се СМЯТА', () => {
  const vidove: Record<number, 'evro' | 'chislo' | 'protsent'> = {
    1: 'evro',
    2: 'evro',
    3: 'protsent',
    5: 'chislo',
  };
  const vid = (k: number) => vidove[k]!;

  it('евро + евро = евро · число × евро = евро', () => {
    expect(vidNaFormulata({ deystvie: 'sbor', ot: [1, 2] }, vid)).toBe('evro');
    expect(vidNaFormulata({ deystvie: 'proizvedenie', ot: [5, 1] }, vid)).toBe('evro');
    expect(vidNaFormulata({ deystvie: 'protsent', ot: [1, 3] }, vid)).toBe('evro');
  });

  it('евро по евро няма смисъл · процент не се сборува', () => {
    expect(() => vidNaFormulata({ deystvie: 'proizvedenie', ot: [1, 2] }, vid)).toThrow(GreshkaFormula);
    expect(() => vidNaFormulata({ deystvie: 'sbor', ot: [1, 3] }, vid)).toThrow(GreshkaFormula);
  });
});

describe('сметката на един ред', () => {
  const vid = (k: number) => (k === 3 ? ('protsent' as const) : ('evro' as const));

  it('сбор · разлика · процент от', () => {
    expect(smetniFormula({ deystvie: 'sbor', ot: [1, 2] }, ['500,00', '20,00'], vid)).toBe(52000);
    expect(smetniFormula({ deystvie: 'razlika', ot: [1, 2] }, ['500,00', '20,00'], vid)).toBe(48000);
    // 500,00 € × 20 % = 100,00 €
    expect(smetniFormula({ deystvie: 'protsent', ot: [1, 3] }, ['500,00', '20'], vid)).toBe(10000);
  });

  it('празен операнд дава ПРАЗНА клетка, не нула', () => {
    expect(smetniFormula({ deystvie: 'sbor', ot: [1, 2] }, ['', '20,00'], vid)).toBeNull();
  });

  it('нечетим операнд се КАЗВА — хвърля', () => {
    expect(() => smetniFormula({ deystvie: 'sbor', ot: [1, 2] }, ['абв', '20,00'], vid)).toThrow();
  });
});

describe('проверката при създаване', () => {
  it('формула върху формула не се позволява — плитък граф', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    expect(() =>
      proveriFormula(m, { deystvie: 'sbor', ot: [5, 1] }),
    ).toThrow(GreshkaFormula);
  });

  it('колоната не сочи себе си, нито два пъти един операнд', () => {
    const m = model();
    expect(() => proveriFormula(m, { deystvie: 'sbor', ot: [1, 1] })).toThrow(GreshkaFormula);
    expect(() => proveriFormula(m, { deystvie: 'sbor', ot: [1, 2] }, 1)).toThrow(GreshkaFormula);
  });

  it('колона извън главата пада', () => {
    expect(() => proveriFormula(model(), { deystvie: 'sbor', ot: [1, 99] })).toThrow(GreshkaFormula);
  });

  it('и броят на операндите се проверява', () => {
    expect(() => proveriFormula(model(), { deystvie: 'razlika', ot: [1] })).toThrow(GreshkaFormula);
    expect(() => proveriFormula(model(), { deystvie: 'sbor', ot: [1] })).toThrow(GreshkaFormula);
  });
});

describe('формулната колона в Редактора', () => {
  it('ражда се ЗАТВОРЕНА, с пресметнат вид', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо с такса',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    expect(m.glavi[5]).toBe('Общо с такса');
    expect(m.zatvoreni).toContain(5);
    expect(m.vidove[5]).toBe('evro');
    expect(m.formuli[5]).toEqual({ deystvie: 'sbor', ot: [1, 2] });
  });

  it('само Стопанинът · редакторът не ражда и не сменя формула', () => {
    const m = model();
    expect(() =>
      dobaviFormulnaKolona(m, {
        ime: 'Общо',
        formula: { deystvie: 'sbor', ot: [1, 2] },
        rolya: 'redaktor',
      }),
    ).toThrow(GreshkaRedaktor);

    const sFormula = dobaviFormulnaKolona(m, {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    expect(() =>
      smeniFormula(sFormula, 5, { deystvie: 'razlika', ot: [1, 2] }, 'redaktor'),
    ).toThrow(GreshkaRedaktor);
  });

  it('смяната пресмята вида наново', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    const sled = smeniFormula(m, 5, { deystvie: 'protsent', ot: [1, 3] }, 'sobstvenik');
    expect(sled.formuli[5]).toEqual({ deystvie: 'protsent', ot: [1, 3] });
    expect(sled.vidove[5]).toBe('evro');
    // старият модел не е пипнат — поправка = нов запис
    expect(m.formuli[5]).toEqual({ deystvie: 'sbor', ot: [1, 2] });
  });

  it('формула не се дава на колона с данни', () => {
    expect(() =>
      smeniFormula(model(), 1, { deystvie: 'sbor', ot: [1, 2] }, 'sobstvenik'),
    ).toThrow(GreshkaRedaktor);
  });

  it('ПРЕИМЕНУВАНЕТО не чупи формулата — референцията е по номер', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    const sled = preimenuvayKolona(m, 1, 'Месечен наем', 'sobstvenik');
    expect(sled.formuli[5]).toEqual({ deystvie: 'sbor', ot: [1, 2] });
    expect(sDumiFormula(sled, sled.formuli[5]!)).toBe('сбор(Месечен наем · Такса)');
  });

  it('операнд НЕ се маха изпод формула — казва се коя я държи', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    expect(() => premahniKolona(m, 2, { rolya: 'sobstvenik', imaDanni: false })).toThrow(
      /влиза във формулата на „Общо"/,
    );
  });

  it('махането на СТРАНИЧНА колона мести и ключа, и операндите', () => {
    // колона 4 („Обект") е преди формулната и не влиза в нея
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    const sled = premahniKolona(m, 4, { rolya: 'sobstvenik', imaDanni: false });
    expect(sled.formuli[4]).toEqual({ deystvie: 'sbor', ot: [1, 2] });
    expect(sled.formuli[5]).toBeUndefined();
    expect(sled.vidove[4]).toBe('evro');
  });

  it('Описът на Подредба казва СМЕТКАТА на формулната колона', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    const red = opisNaPodredba([m]).find((r) => r.ime === 'Общо')!;
    expect(red.belezhka).toContain('формула: сбор(Наем · Такса)');
  });
});

describe('смятането върху цялата таблица', () => {
  it('всеки ред със своята стойност · недописаният е празен, не нула', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'Общо',
      formula: { deystvie: 'sbor', ot: [1, 2] },
      rolya: 'sobstvenik',
    });
    const [k] = smetniKolonite(m, { redove: [1, 2, 3], kletka: kletkaNa });
    expect(k!.kolona).toBe(5);
    expect(k!.vid).toBe('evro');
    expect(k!.redove.map((r) => r.stoynost)).toEqual([52000, 123000, null]);
    // сборът брои само смятаните редове — празният не се приравнява на нула
    expect(k!.sbor).toBe(175000);
    expect(k!.spanali).toEqual([]);
  });

  it('процент от колона в евро · 20 % от наема', () => {
    const m = dobaviFormulnaKolona(model(), {
      ime: 'ДДС',
      formula: { deystvie: 'protsent', ot: [1, 3] },
      rolya: 'sobstvenik',
    });
    const [k] = smetniKolonite(m, { redove: [1, 2], kletka: kletkaNa });
    expect(k!.redove.map((r) => r.stoynost)).toEqual([10000, 24000]);
  });
});
