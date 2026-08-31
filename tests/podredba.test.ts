/**
 * ПОДРЕДБАТА НА ЕКРАНА · всеки сам мести секциите си (И101 т.2 · ADR-045).
 *
 * Двете функции тук са ЧИСТИ нарочно: разместването на възли в DOM се вижда с
 * очи и се проверява от прохода, а правилото „нищо не изчезва" трябва да се
 * доказва без браузър.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  broySganati,
  podredi,
  premesti,
  preobarniSgavaneto,
  prevediZapomnenoto,
  sganiVsichki,
} from '../app/podredba.js';

describe('подредбата · нищо не изчезва', () => {
  it('запомненият ред важи', () => {
    expect(podredi(['а', 'б', 'в'], ['в', 'а', 'б'])).toEqual(['в', 'а', 'б']);
  });

  /**
   * НОВАТА СЕКЦИЯ ОТИВА НАКРАЯ и не изчезва. Обратното — да се показват само
   * запомнените — би скрило всяка нова функция от онзи, който веднъж е пипал
   * подредбата, и то мълчешком.
   */
  it('непозната секция отива НАКРАЯ, а не в нищото', () => {
    expect(podredi(['а', 'б', 'нова'], ['б', 'а'])).toEqual(['б', 'а', 'нова']);
  });

  it('изчезнала секция просто отпада', () => {
    expect(podredi(['а', 'б'], ['б', 'махната', 'а'])).toEqual(['б', 'а']);
  });

  it('без памет редът е онзи, който екранът е нарисувал', () => {
    expect(podredi(['а', 'б', 'в'], [])).toEqual(['а', 'б', 'в']);
  });

  it('нито един ключ не се губи и не се удвоява', () => {
    const izhod = podredi(['а', 'б', 'в', 'г'], ['г', 'б']);
    expect([...izhod].sort()).toEqual(['а', 'б', 'в', 'г']);
    expect(new Set(izhod).size).toBe(4);
  });
});

describe('местенето · една стъпка, без изненади', () => {
  it('нагоре и надолу разменят съседи', () => {
    expect(premesti(['а', 'б', 'в'], 'б', 'gore')).toEqual(['б', 'а', 'в']);
    expect(premesti(['а', 'б', 'в'], 'б', 'dolu')).toEqual(['а', 'в', 'б']);
  });

  it('на ръба не мърда и не хвърля', () => {
    expect(premesti(['а', 'б'], 'а', 'gore')).toEqual(['а', 'б']);
    expect(premesti(['а', 'б'], 'б', 'dolu')).toEqual(['а', 'б']);
  });

  it('непознат ключ оставя реда непокътнат', () => {
    expect(premesti(['а', 'б'], 'няма', 'gore')).toEqual(['а', 'б']);
  });

  it('НЕ мени подадения ред · връща нов', () => {
    const red = ['а', 'б'];
    premesti(red, 'а', 'dolu');
    expect(red).toEqual(['а', 'б']);
  });
});

/**
 * ПРЕВОДЪТ НА СТАРИТЕ КЛЮЧОВЕ · платен при слагането на маркерите.
 *
 * Без него подредбата на онзи, който вече е местил секции, нямаше да се нулира
 * — щеше да се РАЗБЪРКА: съвпадащите ключове остават по местата си, другите
 * падат накрая. Затова тестът пази не „не гърми", а „стои където го е оставил".
 */
describe('преводът на ключовете · без разбъркване', () => {
  it('старият ключ пази мястото си под новото си име', () => {
    const karta = new Map([['zaglavie:Нов имот', 'imoti-nov']]);
    expect(prevediZapomnenoto(['zaglavie:Нов имот', 'imoti-spisak'], karta)).toEqual([
      'imoti-nov',
      'imoti-spisak',
    ]);
  });

  it('вече преведен ред не се мени · вторият проход е без работа', () => {
    const karta = new Map([['zaglavie:Нов имот', 'imoti-nov']]);
    const predenPat = prevediZapomnenoto(['zaglavie:Нов имот', 'imoti-spisak'], karta);
    expect(prevediZapomnenoto(predenPat, karta)).toEqual(predenPat);
  });

  it('празна карта връща същия ред · нищо за превеждане', () => {
    expect(prevediZapomnenoto(['а', 'б'], new Map())).toEqual(['а', 'б']);
  });

  it('непреведеното си остава · `podredi` после го отсява', () => {
    const karta = new Map([['zaglavie:Нов имот', 'imoti-nov']]);
    expect(prevediZapomnenoto(['zaglavie:Няма такава'], karta)).toEqual(['zaglavie:Няма такава']);
  });

  /**
   * ДВА СТАРИ КЛЮЧА В ЕДИН НОВ · секция, местена и преди, и след преименуване.
   * Пази се ПЪРВИЯТ — той е по-скорошното решение; удвоеният ключ би дал възел,
   * прибавен два пъти.
   */
  it('удвояване не се допуска · пази се първият', () => {
    const karta = new Map([
      ['zaglavie:Старо име', 'imoti-nov'],
      ['zaglavie:Ново име', 'imoti-nov'],
    ]);
    expect(prevediZapomnenoto(['zaglavie:Старо име', 'x', 'zaglavie:Ново име'], karta)).toEqual([
      'imoti-nov',
      'x',
    ]);
  });
});

/**
 * СГЪВАНЕТО НА ДЯЛА · резен 64.
 *
 * Негово (И101): „Да е СКРИТО с дребни бутончета и падащи менюта и отметки."
 * Преброено: Сметки държи 78 черупкови управления на един екран. Смаляването
 * им не мени нищо — двайсет отворени форми една под друга остават двайсет.
 */
describe('сгъването на дяла', () => {
  // ПАМЕТТА НА ЕКРАНА · подставена, както при другите ѝ тестове. Извън браузър
  // `localStorage` го няма, а функциите тук четат точно през него.
  const zapisi = new Map<string, string>();
  beforeEach(() => {
    zapisi.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => zapisi.get(k) ?? null,
      setItem: (k: string, v: string) => void zapisi.set(k, v),
      removeItem: (k: string) => void zapisi.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('по подразбиране НИЩО не е сгънато · нищо не се крие само', () => {
    expect(broySganati('smetki')).toBe(0);
  });

  it('превключването сгъва, второто разтваря · ЕДИН знак, не два бутона', () => {
    expect(preobarniSgavaneto('smetki', 'период')).toEqual(['период']);
    expect(broySganati('smetki')).toBe(1);
    expect(preobarniSgavaneto('smetki', 'период')).toEqual([]);
    expect(broySganati('smetki')).toBe(0);
  });

  it('всеки ЕКРАН помни СВОИТЕ · сгънатото в Сметки не пипа Имоти', () => {
    preobarniSgavaneto('smetki', 'период');
    expect(broySganati('smetki')).toBe(1);
    expect(broySganati('imoti')).toBe(0);
  });

  it('„Сгъни всички" хваща всичките · и „Разтвори" ги пуска', () => {
    sganiVsichki('smetki', ['а', 'б', 'в'], true);
    expect(broySganati('smetki')).toBe(3);
    sganiVsichki('smetki', ['а', 'б', 'в'], false);
    expect(broySganati('smetki')).toBe(0);
  });

  it('разтварянето на всички НЕ пипа другия екран', () => {
    sganiVsichki('smetki', ['а'], true);
    sganiVsichki('imoti', ['б'], true);
    sganiVsichki('smetki', ['а'], false);
    expect(broySganati('imoti')).toBe(1);
  });
});
