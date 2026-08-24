/**
 * ТАБОВЕТЕ И СЕКЦИИТЕ (И92 т.9, втората половина).
 *
 * Пази трите капана от проучването:
 *   · връзка между несвързваеми източници не мълчи — отказва се;
 *   · кръг в стеснението се хваща, не се върти вечно;
 *   · стационарен таб приема секции, но не се маха и не заема чуждо име.
 */

import { describe, expect, it } from 'vitest';
import {
  dobaviSektsiya,
  eStatsionaren,
  GreshkaTab,
  napraviTab,
  nosiKlyucha,
  premahniSektsiya,
  premestiSektsiya,
  razvarzhiSektsiya,
  svarzhiSektsii,
  vazmozhniIzvori,
  verigaNaStesnenieto,
} from '../src/domein/tabove.js';

function smetkiSasImoti() {
  let t = napraviTab({ ime: 'Сметки', klyuch: 'smetki', statsionaren: true });
  t = dobaviSektsiya(t, { ime: 'Имотите', vid: 'tablitsa', iztochnik: 'imoti' });
  t = dobaviSektsiya(t, { ime: 'Наемите', vid: 'tablitsa', iztochnik: 'naemi' });
  return t;
}

describe('стационарният таб', () => {
  it('приема секции — точно поръчката: „пак вътре в тях можеш да добавяш"', () => {
    const t = smetkiSasImoti();
    expect(t.sektsii.length).toBe(2);
    expect(t.statsionaren).toBe(true);
  });

  it('ключът му е закован към екран на програмата', () => {
    expect(() => napraviTab({ ime: 'Каквото', klyuch: 'sunce', statsionaren: true })).toThrow(
      GreshkaTab,
    );
  });

  it('собствен таб не заема името на екран', () => {
    expect(() => napraviTab({ ime: 'Мой', klyuch: 'smetki' })).toThrow(/не заема неговото име/);
  });

  it('eStatsionaren разпознава осемте екрана', () => {
    expect(eStatsionaren('smetki')).toBe(true);
    expect(eStatsionaren('moy-tab')).toBe(false);
  });
});

describe('добавеният таб', () => {
  it('е изцяло негов — свободно име, свои секции', () => {
    const t = napraviTab({ ime: 'Малинова Долина' });
    expect(t.statsionaren).toBe(false);
    expect(t.klyuch).toBe('малинова-долина');
  });

  it('без име не се ражда', () => {
    expect(() => napraviTab({ ime: '   ' })).toThrow(GreshkaTab);
  });
});

describe('секциите', () => {
  it('таблица приема само изброените източници', () => {
    const t = napraviTab({ ime: 'Проба' });
    expect(() =>
      dobaviSektsiya(t, { ime: 'х', vid: 'tablitsa', iztochnik: 'nyama-go' }),
    ).toThrow(/не е източник/);
  });

  it('графика приема САМО графичните източници', () => {
    const t = napraviTab({ ime: 'Проба' });
    expect(() =>
      dobaviSektsiya(t, { ime: 'х', vid: 'diagrama', iztochnik: 'imoti' }),
    ).toThrow(/не е източник/);
    const s = dobaviSektsiya(t, { ime: 'Месеците', vid: 'diagrama', iztochnik: 'mesetsi' });
    expect(s.sektsii[0]?.vid).toBe('diagrama');
  });

  it('едно име не се добавя два пъти в един таб', () => {
    const t = smetkiSasImoti();
    expect(() =>
      dobaviSektsiya(t, { ime: 'имотите', vid: 'tablitsa', iztochnik: 'razhodi' }),
    ).toThrow(/вече я има/);
  });

  it('махането разкача вързаните за нея, не ги маха', () => {
    let t = smetkiSasImoti();
    t = svarzhiSektsii(t, 'имотите', 'наемите', 'imot');
    t = premahniSektsiya(t, 'наемите');
    const imotite = t.sektsii.find((s) => s.klyuch === 'имотите')!;
    expect(imotite.svarzanaS).toBe('');
    expect(t.sektsii.length).toBe(1);
  });

  it('редът се мести нагоре и надолу, а на края не гърми', () => {
    let t = smetkiSasImoti();
    t = premestiSektsiya(t, 'наемите', 'gore');
    expect(t.sektsii.map((s) => s.klyuch)).toEqual(['наемите', 'имотите']);
    t = premestiSektsiya(t, 'наемите', 'gore'); // вече е първа — не гърми
    expect(t.sektsii.map((s) => s.klyuch)).toEqual(['наемите', 'имотите']);
  });
});

describe('връзването · „изборът в едната стеснява другата"', () => {
  it('носителят на ключа се знае поименно, не се гадае', () => {
    expect(nosiKlyucha('imoti', 'imot')).toBe(true);
    expect(nosiKlyucha('razhodi', 'imot')).toBe(false);
  });

  it('връзка между несвързваеми източници се ОТКАЗВА, не мълчи', () => {
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'Имотите', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'Разходите', vid: 'tablitsa', iztochnik: 'razhodi' });
    expect(() => svarzhiSektsii(t, 'имотите', 'разходите', 'imot')).toThrow(
      /не носи по имот/,
    );
  });

  it('графика не се връзва — връзват се само таблици', () => {
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'Имотите', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'Месеците', vid: 'diagrama', iztochnik: 'mesetsi' });
    expect(() => svarzhiSektsii(t, 'имотите', 'месеците', 'imot')).toThrow(/графика/);
  });

  it('секция не се връзва сама за себе си', () => {
    const t = smetkiSasImoti();
    expect(() => svarzhiSektsii(t, 'имотите', 'имотите', 'imot')).toThrow(/сама за себе си/);
  });

  it('успешната връзка се вижда в полето и в веригата', () => {
    let t = smetkiSasImoti();
    t = svarzhiSektsii(t, 'наемите', 'имотите', 'imot');
    const naemite = t.sektsii.find((s) => s.klyuch === 'наемите')!;
    expect(naemite.svarzanaS).toBe('имотите');
    expect(naemite.po).toBe('imot');
    expect(verigaNaStesnenieto(t, 'наемите').map((s) => s.klyuch)).toEqual(['имотите']);
  });

  it('КРЪГЪТ се хваща — две секции една за друга не увисват', () => {
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'А', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'Б', vid: 'tablitsa', iztochnik: 'imoti' });
    t = svarzhiSektsii(t, 'а', 'б', 'imot');
    expect(() => svarzhiSektsii(t, 'б', 'а', 'imot')).toThrow(/кръг/);
  });

  it('по-дълга верига също се хваща', () => {
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'А', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'Б', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'В', vid: 'tablitsa', iztochnik: 'imoti' });
    t = svarzhiSektsii(t, 'а', 'б', 'imot');
    t = svarzhiSektsii(t, 'б', 'в', 'imot');
    expect(() => svarzhiSektsii(t, 'в', 'а', 'imot')).toThrow(/кръг/);
  });

  it('развързването маха стеснението, секцията остава', () => {
    let t = smetkiSasImoti();
    t = svarzhiSektsii(t, 'наемите', 'имотите', 'imot');
    t = razvarzhiSektsiya(t, 'наемите');
    expect(t.sektsii.find((s) => s.klyuch === 'наемите')?.svarzanaS).toBe('');
    expect(t.sektsii.length).toBe(2);
  });

  it('менюто предлага само възможните извори — не всичко, за да откаже после', () => {
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'Имотите', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, { ime: 'Разходите', vid: 'tablitsa', iztochnik: 'razhodi' });
    t = dobaviSektsiya(t, { ime: 'Наемите', vid: 'tablitsa', iztochnik: 'naemi' });
    const vazmozhni = vazmozhniIzvori(t, 'наемите', 'imot');
    expect(vazmozhni.map((s) => s.klyuch)).toEqual(['имотите']);
  });

  it('всяко добавяне се проверява отделно — свързването не се дублира', () => {
    // dobaviSektsiya приема svarzanaS+po директно, за да не се пропусне проверка
    let t = napraviTab({ ime: 'Проба' });
    t = dobaviSektsiya(t, { ime: 'Имотите', vid: 'tablitsa', iztochnik: 'imoti' });
    t = dobaviSektsiya(t, {
      ime: 'Наемите',
      vid: 'tablitsa',
      iztochnik: 'naemi',
      svarzanaS: 'имотите',
      po: 'imot',
    });
    expect(t.sektsii[1]?.svarzanaS).toBe('имотите');
  });
});
