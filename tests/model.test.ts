/**
 * МОДЕЛЪТ НА ТАБЛИЦА · пита веднъж, помни завинаги, и НЕ гадае.
 *
 * Тези тестове пазят три неща, всяко платено с чужда болка:
 *
 *   1. Модел, направен за една таблица, НЕ се прилага върху друга. Иначе
 *      колоната „сума" на едната банка става „дата" на другата — тихо.
 *   2. Отказът е ГЛАСЕН. Липсваща роля, две роли на една колона, колона извън
 *      таблицата — всяко спира с думи, вместо да произведе криви редове.
 *   3. Подсказката е предложение, не решение. Тя може да сгреши; затова човек
 *      потвърждава (правило 18).
 */

import { describe, expect, it } from 'vitest';
import {
  GreshkaModel,
  nameriModel,
  napraviModel,
  otpechatakNaGlavata,
  podskazhi,
  poRolya,
  poznavaLi,
  redoveSDanni,
  ZADALZHITELNI_ROLI,
} from '../src/iztochnik/model.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';

/** Извлечение, каквото би дала една банка. */
const OBB: Tablitsa = {
  ime: 'obb.csv',
  redove: [
    ['Извлечение по сметка', '', '', ''],
    ['Дата', 'Основание', 'Сума', 'Документ'],
    ['01.02.2026', 'наем ап. 3', '1 200,00', '9871'],
    ['05.02.2026', 'ток', '-84,50', '9872'],
  ],
};

/** Друга банка: същите данни, друг ред на колоните. */
const DSK: Tablitsa = {
  ime: 'dsk.csv',
  redove: [
    ['Дата', 'Сума', 'Документ', 'Основание'],
    ['01.02.2026', '1 200,00', '9871', 'наем ап. 3'],
  ],
};

const modelOBB = () =>
  napraviModel({
    klyuch: 'Банка ОББ',
    tablitsa: OBB,
    redNaGlavata: 1,
    koloni: { data: 0, osnovanie: 1, suma: 2, dokument: 3 },
  });

describe('моделът разпознава СТРУКТУРАТА, не името', () => {
  it('познава своята таблица', () => {
    expect(poznavaLi(modelOBB(), OBB)).toBe(true);
  });

  it('НЕ познава чужда таблица със същите колони в друг ред', () => {
    // Точно тук се ражда тихата грешка: „сума" на едната е „документ" на другата.
    expect(poznavaLi(modelOBB(), DSK)).toBe(false);
  });

  it('името на файла не значи нищо — структурата значи', () => {
    const prekrasten: Tablitsa = { ime: 'извлечение (3).csv', redove: OBB.redove };
    expect(poznavaLi(modelOBB(), prekrasten)).toBe(true);
  });

  it('празните колони в края не менят отпечатъка', () => {
    // Excel ражда по десет празни колони на всеки лист.
    const sOpashka: Tablitsa = {
      ime: OBB.ime,
      redove: OBB.redove.map((r, i) => (i === 1 ? [...r, '', '', ''] : r)),
    };
    expect(otpechatakNaGlavata(sOpashka, 1)).toBe(otpechatakNaGlavata(OBB, 1));
  });

  it('намира верния модел измежду няколко', () => {
    const dsk = napraviModel({
      klyuch: 'Банка ДСК',
      tablitsa: DSK,
      redNaGlavata: 0,
      koloni: { data: 0, suma: 1, dokument: 2, osnovanie: 3 },
    });
    const vsichki = [modelOBB(), dsk];
    expect(nameriModel(vsichki, DSK)?.klyuch).toBe('Банка ДСК');
    expect(nameriModel(vsichki, OBB)?.klyuch).toBe('Банка ОББ');
    expect(nameriModel(vsichki, { ime: 'x', redove: [['а', 'б']] })).toBeUndefined();
  });
});

describe('отказва ГЛАСНО, вместо да произведе криви редове', () => {
  it('без дата или сума ред не става запис', () => {
    for (const lipsva of ZADALZHITELNI_ROLI) {
      const koloni: Record<string, number> = { data: 0, suma: 2 };
      delete koloni[lipsva];
      expect(() =>
        napraviModel({ klyuch: 'x', tablitsa: OBB, redNaGlavata: 1, koloni }),
      ).toThrow(GreshkaModel);
    }
  });

  it('една колона — една роля', () => {
    expect(() =>
      napraviModel({ klyuch: 'x', tablitsa: OBB, redNaGlavata: 1, koloni: { data: 0, suma: 0 } }),
    ).toThrow(/една роля/);
  });

  it('колона извън таблицата се отказва с числа в думите', () => {
    expect(() =>
      napraviModel({ klyuch: 'x', tablitsa: OBB, redNaGlavata: 1, koloni: { data: 0, suma: 99 } }),
    ).toThrow(/извън таблицата/);
  });

  it('колона за ДДС без да е казано ставка ли е, или сума', () => {
    expect(() =>
      napraviModel({
        klyuch: 'x',
        tablitsa: OBB,
        redNaGlavata: 1,
        koloni: { data: 0, suma: 2, dds: 3 },
      }),
    ).toThrow(/ставка ли е, или сума/);
  });

  it('моделът иска име — по него ще се търси', () => {
    expect(() =>
      napraviModel({ klyuch: '   ', tablitsa: OBB, redNaGlavata: 1, koloni: { data: 0, suma: 2 } }),
    ).toThrow(/име/);
  });
});

describe('четенето през модела', () => {
  it('дава клетката за всяка роля', () => {
    const m = modelOBB();
    expect(poRolya(m, OBB, 2, 'data')).toBe('01.02.2026');
    expect(poRolya(m, OBB, 2, 'suma')).toBe('1 200,00');
    expect(poRolya(m, OBB, 2, 'osnovanie')).toBe('наем ап. 3');
  });

  it('липсваща роля дава празно, не пука', () => {
    expect(poRolya(modelOBB(), OBB, 2, 'kontragent')).toBe('');
  });

  it('редовете с данни са всичко ПОД главата', () => {
    expect(redoveSDanni(modelOBB(), OBB)).toEqual([2, 3]);
  });
});

describe('подсказката е предложение, не решение', () => {
  it('познава обичайните заглавия', () => {
    const p = podskazhi(OBB, 1);
    expect(p.data).toBe(0);
    expect(p.osnovanie).toBe(1);
    expect(p.suma).toBe(2);
    expect(p.dokument).toBe(3);
  });

  it('не дава една колона на две роли', () => {
    const p = podskazhi({ ime: 'x', redove: [['Дата на документ', 'Сума']] }, 0);
    const dadeni = Object.values(p);
    expect(new Set(dadeni).size).toBe(dadeni.length);
  });

  it('на непознат хедър мълчи, вместо да гадае', () => {
    // Мълчанието изпраща човека да посочи сам — точно каквото трябва.
    const p = podskazhi({ ime: 'x', redove: [['кол1', 'кол2', 'кол3']] }, 0);
    expect(Object.keys(p)).toEqual([]);
  });
});
