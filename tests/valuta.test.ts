/**
 * ВАЛУТАТА И ЗАКРЪГЛЯНЕТО · неговите решения, пазени от машина.
 *
 *   1. „Левът вече не съществува" — валутите са ДВЕ: евро и долар (И96 т.7).
 *   2. Всяка се изписва по СВОИТЕ норми — знак отпред или отзад, запетая или
 *      точка. Долар по български правила не е долар, а евро с чужд знак.
 *   3. „Цените НАГОРЕ, сметките към най-близкото" — и никога в сбор.
 *
 * КУРС НЯМА и не се връща. Онова, което падна на 23.08 — осемте валути,
 * `Paket.valuti`, смяната в движение — си остава паднало. Изборът е при
 * регистрация, и толкова: смяна после би преоценила всяко записано число.
 */

import { describe, expect, it } from 'vitest';
import {
  DOLAR,
  EVRO,
  VALUTI,
  razlikaOtZakraglyane,
  tsenaNagore,
  valuta,
  zakragli,
} from '../src/yadro/valuta.js';
import { kakvoPishe, otSuma, sabiri, stotinki } from '../src/yadro/pari.js';

describe('левът вече не съществува · валутите са ДВЕ', () => {
  it('и двете са изброени поименно, със сто цента', () => {
    expect(VALUTI.map((v) => v.kod)).toEqual(['EUR', 'USD']);
    for (const v of VALUTI) expect(v.drobni, v.kod).toBe(100);
  });

  it('намират се по ISO код, а измисленият се отказва С ДУМИ', () => {
    expect(valuta('EUR')).toBe(EVRO);
    expect(valuta('usd')).toBe(DOLAR);
    // Тиха замяна тук значи числа, прочетени в грешна валута — и никой не разбира.
    expect(() => valuta('BGN')).toThrow(/Няма валута/);
    expect(() => valuta('BGN')).toThrow(/EUR/);
  });
});

describe('всяка се изписва по СВОИТЕ норми', () => {
  it('еврото · знакът ОТЗАД, тясна пауза, запетая', () => {
    expect(kakvoPishe(stotinki(123456))).toBe('1\u202F234,56\u202F€');
    expect(kakvoPishe(stotinki(-305))).toBe('-3,05\u202F€');
  });

  it('доларът · знакът ОТПРЕД, запетая за хилядите, ТОЧКА за дробните', () => {
    expect(kakvoPishe(stotinki(123456), DOLAR)).toBe('$1,234.56');
    expect(kakvoPishe(stotinki(-305), DOLAR)).toBe('$-3.05');
  });

  it('едно и също число изглежда РАЗЛИЧНО в двете — и това е целта', () => {
    const milion = stotinki(1_000_000_00);
    // Тясната пауза се пише ИЗРИЧНО: обикновен интервал тук изглежда еднакво
    // на екрана и различно за машината — точно капанът, който правило 11 лови
    // при буквите, само че при паузите.
    expect(kakvoPishe(milion)).toBe('1\u202F000\u202F000,00\u202F€');
    expect(kakvoPishe(milion, DOLAR)).toBe('$1,000,000.00');
  });
});

describe('четенето · валутата решава, не гадаенето', () => {
  it('еврото приема своите записи', () => {
    expect(otSuma('1\u202F234,56\u202F€')).toBe(123456);
    expect(otSuma('1234.56')).toBe(123456);
    expect(otSuma('1150')).toBe(115000);
    expect(() => otSuma('сто евро')).toThrow(/Не е сума/);
  });

  it('доларът приема СВОИТЕ', () => {
    expect(otSuma('$1,234.56', DOLAR)).toBe(123456);
    expect(otSuma('1234.56', DOLAR)).toBe(123456);
    expect(otSuma('1,150', DOLAR)).toBe(115000);
  });

  it('„1,234" е ХИЛЯДОКРАТНО различно в двете — затова не се гадае', () => {
    // На долар запетаята дели хилядите: хиляда двеста трийсет и четири.
    expect(otSuma('1,234', DOLAR)).toBe(123400);
    // На евро същите знаци не са сума: три дробни цифри не съществуват.
    expect(() => otSuma('1,234')).toThrow(/Не е сума/);
  });

  it('отказът КАЗВА в коя валута е чакал', () => {
    expect(() => otSuma('сто долара', DOLAR)).toThrow(/долар/);
  });
});

describe('закръглянето · цените НАГОРЕ, сметките към най-близкото', () => {
  it('цена: 1 250,49 € става 1 251 € — продажната цена не пада', () => {
    expect(zakragli(125049, 'tsyalo')).toBe(125100);
    expect(zakragli(125000, 'tsyalo')).toBe(125000); // цялото си остава
    expect(zakragli(1, 'tsyalo')).toBe(100);
  });

  it('сметка: към най-близката стотица', () => {
    expect(zakragli(125000, 'stotitsi')).toBe(130000); // 1250 → 1300 · среда, далече от нулата
    expect(zakragli(124999, 'stotitsi')).toBe(120000); // 1249,99 → 1200
    expect(zakragli(125001, 'stotitsi')).toBe(130000);
  });

  it('разход не „порасва" от закръгляне — знакът се пази', () => {
    expect(zakragli(-125049, 'tsyalo')).toBe(-125100);
    expect(zakragli(-125000, 'stotitsi')).toBe(-130000);
  });

  it('закръглянето приема ВАЛУТАТА, вместо да я знае наизуст', () => {
    // Днес не боли — и двете са със сто цента. Но подадена, валутата не може
    // да се размине; закована вътре, тя се разминава тихо.
    expect(zakragli(125049, 'tsyalo', DOLAR)).toBe(125100);
    expect(tsenaNagore(125049, DOLAR)).toBe(130000);
    expect(razlikaOtZakraglyane(125049, 'tsyalo', DOLAR)).toBe(51);
  });

  it('точното не се пипа — Журналът и ДДС-то не закръглят', () => {
    // изчерпателно около границите на стотицата и цялото, плюс едри суми
    for (let s = -20_050; s <= 20_050; s += 1) expect(zakragli(s, 'tochno')).toBe(s);
    for (const s of [123_456_789, -987_654_321, 0]) expect(zakragli(s, 'tochno')).toBe(s);
  });

  it('дробното се отказва на глас — закръгля се цяла сума', () => {
    expect(() => zakragli(0.5, 'tsyalo')).toThrow(RangeError);
  });

  it('ЗАКОНЪТ · закръгленото не влиза в сбор — смята се точно, закръгля се веднъж', () => {
    // псевдослучайни списъци с фиксирано семе — повторимо, без зависимости
    let seme = 42;
    const sledvashto = () => (seme = (seme * 1103515245 + 12345) % 2147483648);
    for (let opit = 0; opit < 200; opit += 1) {
      const broy = 2 + (sledvashto() % 19);
      const sumi = Array.from({ length: broy }, () => 1 + (sledvashto() % 99_999));
      const tochno = sumi.reduce((a, b) => a + b, 0);
      const pravilno = zakragli(tochno, 'tsyalo');
      const greshno = sumi.map((s) => zakragli(s, 'tsyalo')).reduce((a, b) => a + b, 0);
      // грешният път никога не дава ПО-МАЛКО — той системно надува
      expect(greshno).toBeGreaterThanOrEqual(pravilno);
    }
    // и конкретният пример, който се помни: три по 50 цента
    const chasti = [50, 50, 50].map((s) => stotinki(s));
    expect(zakragli(sabiri(...chasti), 'tsyalo')).toBe(200); // 1,50 → 2 €
    expect(chasti.map((s) => zakragli(s, 'tsyalo')).reduce((a, b) => a + b, 0)).toBe(300); // 3 € — грешно
  });

  it('разликата от закръглянето се ВИЖДА, не се преглъща (правило 7)', () => {
    expect(razlikaOtZakraglyane(125049, 'tsyalo')).toBe(51);
    expect(razlikaOtZakraglyane(124999, 'stotitsi')).toBe(-4999);
    expect(razlikaOtZakraglyane(125000, 'tochno')).toBe(0);
  });
});

describe('цената на Калкулатора · НАГОРЕ до стотица', () => {
  it('214 350 € става 214 400 € — цената не пада от закръгляне', () => {
    expect(tsenaNagore(21_435_000)).toBe(21_440_000);
    expect(tsenaNagore(21_440_000)).toBe(21_440_000); // кръглото си остава
    expect(tsenaNagore(1)).toBe(10_000); // един цент пак ражда стотица
  });

  it('неговата собствена ценова листа: всяка цена завършва на две нули', () => {
    // от „ЦЕНИ МД нова.xlsx" — Ап. 2, Ап. 6, Гараж 1, Двоен гараж 7 и 8
    for (const evro of [215_400, 224_800, 38_700, 72_500]) {
      expect(tsenaNagore(evro * 100)).toBe(evro * 100);
    }
  });

  it('разход не „порасва" — знакът се пази и тук', () => {
    expect(tsenaNagore(-21_435_000)).toBe(-21_440_000);
  });

  it('дробното се отказва на глас', () => {
    expect(() => tsenaNagore(0.5)).toThrow(RangeError);
  });
});
