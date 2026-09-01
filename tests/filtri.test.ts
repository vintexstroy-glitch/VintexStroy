/**
 * ФИНИТЕ ФИЛТРИ · редът на групите в падащото меню.
 *
 * Този файл се появи, защото `app/filtri.ts` нямаше НИТО ЕДИН модулен тест —
 * покриваше го само проходът в браузър. А вътре живееше дефект, който проход
 * не лови: числовите колони се подреждаха като ТЕКСТ, значи „10" стоеше преди
 * „9" и „100" преди „20". Филтър в такъв ред изглежда развален и човек спира
 * да му вярва — а числата бяха верни.
 */

import { describe, expect, it } from 'vitest';
import { filtriray, podrediGrupi, prezOtdo, slozhiOtdo } from '../app/filtri.js';

function grupi(...imena: string[]): Map<string, number> {
  return new Map(imena.map((i, k) => [i, k + 1]));
}

function imena(redove: [string, number][]): string[] {
  return redove.map(([i]) => i);
}

describe('числовата колона се подрежда като ЧИСЛО', () => {
  it('9 идва преди 10, а 20 преди 100', () => {
    expect(imena(podrediGrupi('chislo', grupi('10', '9', '100', '20')))).toEqual([
      '9',
      '10',
      '20',
      '100',
    ]);
  });

  it('процентите също — и знакът не пречи', () => {
    expect(imena(podrediGrupi('protsent', grupi('100%', '9%', '20%')))).toEqual([
      '9%',
      '20%',
      '100%',
    ]);
  });

  it('отрицателното е ПО-МАЛКО, не по-голямо', () => {
    expect(imena(podrediGrupi('chislo', grupi('5', '-10', '0')))).toEqual(['-10', '0', '5']);
  });

  it('десетичната ЗАПЕТАЯ се чете — форматът е български', () => {
    expect(imena(podrediGrupi('chislo', grupi('1,5', '1,25', '10')))).toEqual([
      '1,25',
      '1,5',
      '10',
    ]);
  });

  it('разделителят на хиляди не разваля числото', () => {
    // Неразделим тесен интервал U+202F — така пишем хилядите.
    expect(imena(podrediGrupi('chislo', grupi('1 000', '999', '2 000')))).toEqual([
      '999',
      '1 000',
      '2 000',
    ]);
  });

  it('нечисловото пада НАКРАЯ, подредено по азбука — не разбърква останалото', () => {
    expect(imena(podrediGrupi('chislo', grupi('(празно)', '10', 'няма', '2')))).toEqual([
      '2',
      '10',
      '(празно)',
      'няма',
    ]);
  });
});

describe('другите видове запазват своя ред', () => {
  it('текстът си остава по азбука, на български', () => {
    expect(imena(podrediGrupi('tekst', grupi('Янев', 'Ангелов', 'Иванов')))).toEqual([
      'Ангелов',
      'Иванов',
      'Янев',
    ]);
  });

  it('еврото върви по СВОИТЕ групи, не по азбука', () => {
    const r = imena(podrediGrupi('evro', grupi('над 5000 €', 'до 100 €', '100 – 500 €')));
    expect(r[0]).toBe('до 100 €');
    expect(r[r.length - 1]).toBe('над 5000 €');
  });

  it('датите слагат Днес · Вчера · Тази седмица отпред, после месеците назад', () => {
    const r = imena(podrediGrupi('data', grupi('2026-07', 'Вчера', '2026-08', 'Днес')));
    expect(r.slice(0, 2)).toEqual(['Днес', 'Вчера']);
    expect(r.slice(2)).toEqual(['2026-08', '2026-07']);
  });
});

/**
 * ОТ–ДО НА ДАТОВА КОЛОНА (резен 75 · И124 т.2) · погълнатата способност.
 *
 * Дубльорите по екраните даваха точен обхват, а готовите групи — не. Преди
 * дубльор да падне, двигателят трябва да може всичко, което той може.
 */
describe('От–До на датова колона', () => {
  it('реже по двете граници · включително самите гранични дни', () => {
    const granitsi = { ot: '2026-05-01', do_: '2026-05-31' };
    expect(prezOtdo('2026-05-01', granitsi)).toBe(true);
    expect(prezOtdo('2026-05-31', granitsi)).toBe(true);
    expect(prezOtdo('2026-04-30', granitsi)).toBe(false);
    expect(prezOtdo('2026-06-01', granitsi)).toBe(false);
    // и стойност с час се реже по ДЕНЯ си, не по низа
    expect(prezOtdo('2026-05-31T23:59:00.000Z', granitsi)).toBe(true);
  });

  it('празната граница значи ОТВОРЕНО натам', () => {
    expect(prezOtdo('1999-01-01', { ot: '', do_: '2026-05-31' })).toBe(true);
    expect(prezOtdo('2099-01-01', { ot: '2026-05-01', do_: '' })).toBe(true);
    expect(prezOtdo('2026-04-30', { ot: '2026-05-01', do_: '' })).toBe(false);
  });

  it('празни и двете — записът пада целият · „нищо въведено" не е филтър', () => {
    slozhiOtdo('proba:Дата', 'ot', '2026-05-01');
    slozhiOtdo('proba:Дата', 'ot', '');
    // Няма как да пипнем скритата карта отвън — но filtriray я чете: без
    // граници нито един ред не пада.
    const koloni = [
      { klyuch: 'Дата', ime: 'Дата', vid: 'data' as const, vzemi: (r: { data: string }) => r.data },
    ];
    const redove = [{ data: '1999-01-01' }, { data: '2099-12-31' }];
    expect(filtriray('proba', redove, koloni, '2026-09-01').redove).toHaveLength(2);
  });

  it('filtriray реже по От–До, а „изчистването" връща всичко', () => {
    const koloni = [
      { klyuch: 'Дата', ime: 'Дата', vid: 'data' as const, vzemi: (r: { data: string }) => r.data },
    ];
    const redove = [{ data: '2026-05-10' }, { data: '2026-06-10' }, { data: '2026-07-10' }];
    slozhiOtdo('proba2:Дата', 'ot', '2026-06-01');
    slozhiOtdo('proba2:Дата', 'do_', '2026-06-30');
    const f = filtriray('proba2', redove, koloni, '2026-09-01');
    expect(f.redove.map((r) => r.data)).toEqual(['2026-06-10']);
    expect(f.skriti).toBe(2);
    slozhiOtdo('proba2:Дата', 'ot', '');
    slozhiOtdo('proba2:Дата', 'do_', '');
    expect(filtriray('proba2', redove, koloni, '2026-09-01').redove).toHaveLength(3);
  });
});
