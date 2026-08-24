/**
 * ВРЪЗКИТЕ · картата на сигнала, пазена от машина.
 *
 * Четирите обещания, всяко от негово изречение:
 *
 *   1. Само през ВРАТАТА се пише. Огледало, което пише, се отказва (правило 2).
 *   2. Приходи и Разходи не се махат и не се трият от архива — „това е Закон".
 *   3. Смесена таблица се разпределя по ЗНАКА, не по името си.
 *   4. Обявена, но непостроена връзка се брои — не минава за построена.
 */

import { describe, expect, it } from 'vitest';
import {
  dokade,
  GreshkaVrazka,
  IMENA_NA_FUNKTSIITE,
  kam,
  obyaveni,
  ot,
  pishe,
  proveriPosoka,
  VRAZKI,
  type Funktsiya,
} from '../src/domein/vrazki.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { napraviModel } from '../src/iztochnik/model.js';
import { chislovi, vDvataSbora, znak } from '../src/domein/chisla.js';

describe('петте функции', () => {
  it('само ВРАТАТА пише · правило 2', () => {
    const vsichki: Funktsiya[] = ['vrata', 'ogledalo', 'buton', 'smyatach', 'kran'];
    expect(vsichki.filter(pishe)).toEqual(['vrata']);
  });

  it('всяка има българско име — картата се чете, не се дешифрира', () => {
    for (const f of Object.keys(IMENA_NA_FUNKTSIITE) as Funktsiya[]) {
      expect(IMENA_NA_FUNKTSIITE[f].length).toBeGreaterThan(3);
    }
  });
});

describe('картата отказва на глас', () => {
  it('огледало, през което се пише, се отказва', () => {
    const ogledalo = VRAZKI.find((v) => v.funktsiya === 'ogledalo' && v.postroena)!;
    expect(() => proveriPosoka(ogledalo, true)).toThrow(GreshkaVrazka);
    expect(() => proveriPosoka(ogledalo, true)).toThrow(/не врата/);
    // но четенето през него минава
    expect(() => proveriPosoka(ogledalo, false)).not.toThrow();
  });

  it('през вратата се пише', () => {
    const vrata = VRAZKI.find((v) => v.funktsiya === 'vrata' && v.postroena)!;
    expect(() => proveriPosoka(vrata, true)).not.toThrow();
  });

  it('обявена, но непостроена връзка се отказва — не мълчи', () => {
    const obyavena = obyaveni()[0]!;
    expect(() => proveriPosoka(obyavena, false)).toThrow(/ОБЯВЕНА, но не е построена/);
  });
});

describe('картата е пълна и честна', () => {
  it('всяка връзка носи ЕДНА от петте функции · „друго" не минава', () => {
    for (const v of VRAZKI) {
      expect(Object.keys(IMENA_NA_FUNKTSIITE)).toContain(v.funktsiya);
      expect(v.ot).not.toBe('');
      expect(v.kam).not.toBe('');
      // „посока на сигнала С МЕСТА" — негова дума; място без име е половин връзка
      expect(v.myasto).not.toBe('');
    }
  });

  it('непостроените се БРОЯТ, вместо да се крият', () => {
    const { postroeni, vsichki } = dokade();
    expect(vsichki).toBe(VRAZKI.length);
    expect(postroeni).toBeLessThan(vsichki);
    expect(obyaveni().length).toBe(vsichki - postroeni);
  });

  it('Продажби Архив е терминал · „Няма връщане от Продажби Архив"', () => {
    const vhod = kam('Продажби Архив');
    expect(vhod.length).toBeGreaterThan(0);
    expect(vhod.every((v) => v.ednoposochna)).toBe(true);
    // и нищо не тръгва обратно от него
    expect(ot('Продажби Архив')).toEqual([]);
  });

  it('към Журнала се влиза само през врата', () => {
    for (const v of kam('Журнала')) expect(v.funktsiya).toBe('vrata');
  });
});

describe('СМЕСЕНАТА ТАБЛИЦА · знакът решава, не името', () => {
  // Негова дума (23.08): „Има смесени таблици." Продажбата ражда и приход
  // (цената), и разход (комисион, нотариус). Затова таблицата пада и от двете
  // страни — а коя КОЛОНА накъде, решава сборът ѝ (правило 20).
  const GLAVA = 'Дата;Основание;Контрагент;Продажна цена;Комисион';
  const REDOVE = [
    '05.04.2026;ап. 7;Купувач ООД;120000,00;-3600,00',
    '12.04.2026;гараж 10;Купувач ЕООД;18000,00;-540,00',
  ].join('\n');

  function modelProdazhbi() {
    const t = otCSV(`${GLAVA}\n${REDOVE}`, 'Продажби');
    return {
      m: napraviModel({
        klyuch: 'Продажби',
        tablitsa: t,
        redNaGlavata: 0,
        koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3 },
      }),
      t,
    };
  }

  it('една и съща таблица пада и в Приход, и в Разход', () => {
    const { m, t } = modelProdazhbi();
    const d = vDvataSbora(chislovi(m, t));

    expect(d.prihod.map((k) => k.ime)).toEqual(['Продажна цена']);
    expect(d.razhod.map((k) => k.ime)).toEqual(['Комисион']);
    expect(d.prihod_st).toBe(13_800_000);
    // Разходът се показва като положително число — знакът е в името на сбора
    expect(d.razhod_st).toBe(414_000);
  });

  it('името „Продажби" НЕ решава нищо — решава сборът', () => {
    expect(znak(-1)).toBe('razhod');
    expect(znak(1)).toBe('prihod');
    expect(znak(0)).toBe('prihod');
  });
});

describe('Приходи и Разходи · ЗАКОНЪТ', () => {
  // Негови думи (11.08): „Приходи и Разходи са фиксирани математически модели и
  // не се махат… забрана да триеш Приходи и Разходи от архива — това е Закон."
  it('двата сбора са изброени в ТИП — не се добавят и не се махат', () => {
    const d = vDvataSbora([]);
    expect(Object.keys(d).filter((k) => k === 'prihod' || k === 'razhod').length).toBe(2);
    expect(d.prihod).toEqual([]);
    expect(d.razhod).toEqual([]);
  });

  it('празните остават празни, не изчезват — скриване, не махане', () => {
    const d = vDvataSbora([]);
    expect(d.prihod_st).toBe(0);
    expect(d.razhod_st).toBe(0);
  });
});
