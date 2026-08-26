/**
 * ПАРИТЕ · цели стотинки, никакъв float (П2.1).
 */

import { describe, expect, it } from 'vitest';
import {
  GreshkaPari,
  izvadi,
  kakvoPishe,
  obarni,
  otLeva,
  razpredeli,
  sabiri,
  stotinki,
} from '../src/yadro/index.js';
import { deliZakragleno, pishi, pishiVPole, zaPisane } from '../src/yadro/pari.js';

describe('цели стотинки', () => {
  it('33_33 + 66_67 = 100_00 точно', () => {
    expect(sabiri(stotinki(33_33), stotinki(66_67))).toBe(100_00);
  });

  it('отказва дробни стотинки', () => {
    expect(() => stotinki(12.5)).toThrow(GreshkaPari);
    expect(() => stotinki(NaN)).toThrow(GreshkaPari);
    expect(() => stotinki(Infinity)).toThrow(GreshkaPari);
  });

  it('сторното връща състоянието едно към едно', () => {
    const vnoska = stotinki(1234_56);
    expect(sabiri(vnoska, obarni(vnoska))).toBe(0);
  });

  it('изваждането е точно там, където float греши', () => {
    // 0.1 + 0.2 !== 0.3 при float; при стотинки няма такъв въпрос.
    expect(sabiri(stotinki(10), stotinki(20))).toBe(30);
    expect(izvadi(stotinki(30), stotinki(20))).toBe(10);
  });
});

/**
 * ЕДИН ДОМ ЗА ДЕЛЕНЕТО (правило 17, платено с находка).
 *
 * `deliZakragleno` живееше на ДВЕ места — `dds.ts` и `koefitsienti.ts` — с
 * еднакво име и еднакъв коментар, но с РАЗЛИЧНО поведение при отрицателно
 * число. Преписаната функция се разминава по-тихо от преписаното число:
 * и двете изглеждат прави, докато не подадеш минус.
 */
describe('целочислено делене · един дом', () => {
  it('закръгля половинката НАГОРЕ, не към четното', () => {
    expect(deliZakragleno(5, 2)).toBe(3); // 2,5 → 3
    expect(deliZakragleno(7, 2)).toBe(4); // 3,5 → 4
    expect(deliZakragleno(4, 2)).toBe(2); // точно
    expect(deliZakragleno(1, 3)).toBe(0); // 0,33 → 0
    expect(deliZakragleno(2, 3)).toBe(1); // 0,67 → 1
  });

  it('ЗНАКЪТ СЕ ПАЗИ · иначе сторното на ДДС не е минус самия ДДС', () => {
    // Точно тук се разминаваха двете копия: версията „и двете положителни"
    // праща -2,5 надолу до -3 през Math.floor, вместо симетрично на +2,5.
    expect(deliZakragleno(-5, 2)).toBe(-3);
    expect(deliZakragleno(5, -2)).toBe(-3);
    expect(deliZakragleno(-5, -2)).toBe(3);
    // и симетрията, изказана като закон:
    for (const ch of [1, 5, 7, 33, 12_345, 999_999]) {
      for (const zn of [2, 3, 7, 120_000]) {
        expect(deliZakragleno(-ch, zn)).toBe(-deliZakragleno(ch, zn));
      }
    }
  });

  it('лихвата за месец е точно това делене · базисни пунктове / 120 000', () => {
    // 3,45 % годишно = 345 базисни пункта; остатък 100 000,00 € = 10 000 000 ц.
    // месечна лихва = 10 000 000 × 345 / 120 000 = 28 750 ц. = 287,50 €
    expect(deliZakragleno(10_000_000 * 345, 120_000)).toBe(28_750);
  });

  it('делене на нула се КАЗВА, а не връща нула', () => {
    expect(() => deliZakragleno(100, 0)).toThrow(GreshkaPari);
  });
});

describe('разпределяне без загуба на стотинка', () => {
  it('сборът на частите е точно изходната сума', () => {
    for (const [suma, chasti] of [
      [100_00, 3],
      [1_00, 7],
      [0, 5],
      [999_99, 12],
    ] as const) {
      const parcheta = razpredeli(stotinki(suma), chasti);
      expect(parcheta).toHaveLength(chasti);
      expect(sabiri(...parcheta)).toBe(suma);
    }
  });

  it('остатъкът отива към първите части', () => {
    expect(razpredeli(stotinki(100_00), 3)).toEqual([3334, 3333, 3333]);
  });

  it('работи и с отрицателна сума (сторно на разсрочено)', () => {
    const parcheta = razpredeli(stotinki(-100_00), 3);
    expect(sabiri(...parcheta)).toBe(-100_00);
  });

  it('отказва безсмислен брой части', () => {
    expect(() => razpredeli(stotinki(100), 0)).toThrow(GreshkaPari);
    expect(() => razpredeli(stotinki(100), 2.5)).toThrow(GreshkaPari);
  });
});

describe('за четене от човек', () => {
  it('пише сумата с две цифри след запетаята', () => {
    expect(kakvoPishe(stotinki(100_00))).toBe('100,00\u202F€');
    expect(kakvoPishe(stotinki(5))).toBe('0,05\u202F€');
    expect(kakvoPishe(stotinki(-1234_56))).toBe('-1\u202F234,56\u202F€');
  });
});

describe('четене на сума, написана от човек', () => {
  it('приема запетая, точка и разредка', () => {
    expect(otLeva('1150,50')).toBe(1150_50);
    expect(otLeva('1150.50')).toBe(1150_50);
    expect(otLeva('1 150,50')).toBe(1150_50);
    expect(otLeva('1150')).toBe(1150_00);
    expect(otLeva('0,05')).toBe(5);
    expect(otLeva('-1150,50')).toBe(-1150_50);
  });

  it('допълва липсващата втора цифра', () => {
    expect(otLeva('1150,5')).toBe(1150_50);
  });

  it('отказва всичко, което не е сума', () => {
    for (const losho of ['', 'абв', '1150,505', '1150,', '1.2.3', '12,5лв', '1e3']) {
      expect(() => otLeva(losho)).toThrow(GreshkaPari);
    }
  });
});

describe('за екрана · числото от Огледалото е гол number', () => {
  it('пише същото, каквото и маркираният път', () => {
    expect(pishi(123_456)).toBe(kakvoPishe(stotinki(123_456)));
    expect(pishiVPole(123_456)).toBe(zaPisane(stotinki(123_456)));
  });

  it('НЕВЪЗМОЖНОТО ЧИСЛО СЕ КАЗВА, не минава за нула', () => {
    // Дотук екраните пишеха `kakvoPishe(x as never)` — а `as never` изключва
    // проверката ИЗЦЯЛО. Половин стотинка или NaN рисуваше „NaN €" на екран за
    // пари: тихо грешно число, което изглежда като число.
    expect(pishi(1.5)).toContain('не е цели стотинки');
    expect(pishi(Number.NaN)).toContain('не е цели стотинки');
    expect(pishi(undefined as unknown as number)).toContain('не е цели стотинки');
    expect(pishi(Number.POSITIVE_INFINITY)).toContain('не е цели стотинки');
  });

  it('в ПОЛЕ за писане невъзможното става празно — там маркер би се записал', () => {
    // Разликата е нарочна: полето е за редактиране и съдържанието му се ЧЕТЕ
    // обратно. Маркер в него би тръгнал към Вратата като текст.
    expect(pishiVPole(1.5)).toBe('');
    expect(pishiVPole(Number.NaN)).toBe('');
  });

  it('нулата и отрицателното са НОРМАЛНИ числа, не грешки', () => {
    expect(pishi(0)).toBe(kakvoPishe(stotinki(0)));
    expect(pishi(-500_00)).toBe(kakvoPishe(stotinki(-500_00)));
    expect(pishiVPole(-500_00)).toBe('-500,00');
  });
});
