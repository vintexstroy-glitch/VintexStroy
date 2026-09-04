import { describe, expect, it } from 'vitest';
import { aktiviteOtZhurnala, mestataNaAktivite } from '../src/kalkulator/aktivi-ot-zhurnala.js';

/**
 * „Имот без ОБект и ОБект с Имот могат да се изберат в Клакулатора и това са
 * основните наши активи." *(И129 т.4 · 02.09)*
 *
 * Тестът пази ТРИ неща: кое се брои за актив, кое НЕ влиза (и се брои), и че
 * едно и също нещо не влиза два пъти.
 */
const OBEKTI = [
  { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 45_22_00 },
  { adres: 'Малинова', edinitsa: 'Гараж 3', ploshtad_kvsm: 22_04_00 },
  { adres: 'Обеля', edinitsa: 'Склад 2', ploshtad_kvsm: 0 },
];

const MESTA = [
  { ime: 'Малинова', kvadratura_kvsm: 1_240_50_00 },
  { ime: 'Гара Яна', kvadratura_kvsm: 3_000_00_00 },
  { ime: 'Витоша', kvadratura_kvsm: 0 },
];

describe('активите от Журнала · двата вида', () => {
  it('Обектът с Имот влиза със своята площ', () => {
    const r = aktiviteOtZhurnala(OBEKTI, []);
    expect(r.aktivi).toHaveLength(2);
    expect(r.aktivi[0]).toMatchObject({ vid: 'obekt', myasto: 'Малинова' });
    expect(r.aktivi[0]?.red.obekt).toBe('АП. № 1');
    expect(r.aktivi[0]?.red.obshta_kvsm).toBe(45_22_00);
  });

  it('Имотът БЕЗ Обект влиза със своята квадратура', () => {
    const r = aktiviteOtZhurnala([], MESTA);
    expect(r.aktivi.map((a) => a.red.obekt)).toEqual(['Малинова', 'Гара Яна']);
    expect(r.aktivi[1]).toMatchObject({ vid: 'myasto', myasto: 'Гара Яна' });
    expect(r.aktivi[1]?.red.obshta_kvsm).toBe(3_000_00_00);
  });

  it('място С обекти НЕ влиза второ · инак се брои два пъти', () => {
    // Сверка по построение: стойността на „Малинова" е сборът на обектите ѝ.
    // Влезе ли и мястото, същите квадрати влизат два пъти в оценката.
    const r = aktiviteOtZhurnala(OBEKTI, MESTA);
    const imena = r.aktivi.map((a) => a.red.obekt);
    expect(imena).toContain('АП. № 1');
    expect(imena).toContain('Гара Яна');
    expect(imena).not.toContain('Малинова');
  });

  it('и сравнението е по СВЕДЕНО име · „малинова" е същото място', () => {
    const r = aktiviteOtZhurnala(
      [{ adres: 'малинова ', edinitsa: 'АП. № 1', ploshtad_kvsm: 100 }],
      [{ ime: 'Малинова', kvadratura_kvsm: 500 }],
    );
    expect(r.aktivi).toHaveLength(1);
    expect(r.aktivi[0]?.vid).toBe('obekt');
  });

  it('без квадратура НЕ влиза, а се БРОИ · липсата се вижда', () => {
    const r = aktiviteOtZhurnala(OBEKTI, MESTA);
    // „Склад 2" без площ и „Витоша" без квадратура.
    expect(r.bezPlosht).toBe(2);
  });

  it('видът се чете от името · гаражът не е апартамент', () => {
    const r = aktiviteOtZhurnala(OBEKTI, []);
    expect(r.aktivi[0]?.red.vid).toBe('apartament');
    expect(r.aktivi[1]?.red.vid).toBe('garazh');
  });

  it('картата дава МЯСТОТО на всеки ред · СВЕДЕНО, за да не къса правописът', () => {
    const r = aktiviteOtZhurnala(OBEKTI, MESTA);
    const karta = mestataNaAktivite(r.aktivi);
    expect(karta.get('АП. № 1')).toBe('малинова');
    expect(karta.get('Гараж 3')).toBe('малинова');
    expect(karta.get('Гара Яна')).toBe('гара яна');
  });

  it('сверката вход↔изход може да ПАДНЕ · кандидати = активи + без квадратура', () => {
    // Не тавтология: кандидатите се броят по друг път от активите, и точно
    // това прави сверката проверка, а не преразказ (правило 7).
    const r = aktiviteOtZhurnala(OBEKTI, MESTA);
    expect(r.kandidati).toBe(r.aktivi.length + r.bezPlosht);
    expect(r.kandidati).toBe(5); // три обекта + две места без обекти
  });

  it('празната книга дава празен списък, не грешка', () => {
    expect(aktiviteOtZhurnala([], [])).toEqual({ aktivi: [], bezPlosht: 0, kandidati: 0 });
  });
});
