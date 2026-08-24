/**
 * ВАЛУТАТА И ЗАКРЪГЛЯНЕТО · двете му решения, пазени от машина.
 *
 *   1. „Лев няма" — всичко се показва в евро, с думата и знака.
 *   2. „Цените НАГОРЕ, сметките към най-близкото" — и никога в сбор.
 *
 * ТРЕТОТО ОТПАДНА, по негова поправка (23.08): „защо се изгражда валута, ако
 * тя е само една и няма смяна с курс… трябва да се съдържа в самата КОЛОНА".
 * Изборът на валута, осемте валути и `Paket.valuti` бяха машина без употреба —
 * какво е една колона казва `vid-stoynost.ts`, и това се пази там.
 */

import { describe, expect, it } from 'vitest';
import { EVRO, razlikaOtZakraglyane, tsenaNagore, zakragli } from '../src/yadro/valuta.js';
import { kakvoPishe, otSuma, sabiri, stotinki } from '../src/yadro/pari.js';

describe('лев няма', () => {
  it('показаното носи знака на еврото', () => {
    expect(kakvoPishe(stotinki(123456))).toBe('1 234,56 €');
    expect(kakvoPishe(stotinki(-305))).toBe('-3,05 €');
  });

  it('входът приема евро със знак и без, но не измисля', () => {
    expect(otSuma('1 234,56 €')).toBe(123456);
    expect(otSuma('1234.56')).toBe(123456);
    expect(otSuma('1150')).toBe(115000);
    expect(() => otSuma('сто евро')).toThrow(/Не е сума/);
  });

  it('валутата е ЕДНА — няма списък, няма избор, няма курс', () => {
    expect(EVRO.kod).toBe('EUR');
    expect(EVRO.znak).toBe('€');
    expect(EVRO.drobni).toBe(100);
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
