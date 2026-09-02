/**
 * ЧЕТЕЦЪТ НА „ЦЕНИ МД" · редовете са ДОСЛОВНО от файла на собственика
 * (Драйв · „ЦЕНИ МД нова.xlsx" · 23.08) — включително редът, при който
 * „Обща площ" не излиза от чиста + общи части. Данните не се поправят;
 * разликата се връща като сверка (правило 7).
 */

import { describe, expect, it } from 'vitest';
import { eListTseniMD, prochetiTseniMD } from '../src/kalkulator/tseni-md.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';

const LIST: Tablitsa = {
  ime: 'ЦЕНИ',
  redove: [
    ['', 'Т А Б Л И Ц А \r\nза разпределение на площите на имотите в обект: ЖИЛИЩНА СГРАДА С ПОДЗЕМНИ ГАРАЖИ в УПИ V-3508, кв. 56, м. Малинова долина, р-н Студентски, гр. София'],
    ['', 'Имоти', 'Етаж Кота', '', 'Стаи', 'Чиста площ', 'Общи части', '', 'Обща площ', 'Изложение', 'Тераси', 'Цена с ДДС', 'Евро / кв.м.'],
    ['', '', '', '', '', '', '%', 'м2', '', '', '', '', ''],
    ['', 'Апартамент 1', ' етаж 1 - кота +/- 0.00', '', '2', '40', '2.477409126', '5.218414582', '45.43', 'СИ', '22', 'ПРОДАДЕН', ''],
    ['', 'Апартамент 2', '', '', '2', '57', '3.530308004', '7.436240779', '64.44', 'И', '22.9', '215400', '2838.318619'],
    ['', 'Апартамент 5', ' етаж 2 - кота +2.85', '', '2', '54.8', '3.394050502', '7.149227977', '34.19679757', 'СИ', '4.5', 'ПРОДАДЕН', ''],
    ['', 'Гараж 1', 'сутерен - кота - 2.80', '', '', '16', '0.99096365', '2.087365833', '30.61', '', '', '38700', '1264.292715'],
    ['', 'Паркомяста Р4', 'терен - кота +/- 0.00', '', '', '13.75', '', '', '13.75', '', '', '27800', '2021.818182'],
    ['', 'Открито паркомяста Р6', '', '', '', '12.5', '', '', '12.5', '', '', '25300', '2024'],
  ],
};

describe('четецът на „ЦЕНИ МД"', () => {
  it('разпознава листа по главата, не по името', () => {
    expect(eListTseniMD(LIST)).toBe(true);
    expect(eListTseniMD({ ime: 'х', redove: [['а', 'б']] })).toBe(false);
  });

  it('чете всички редове · площите в цели кв.см · цената в центове', () => {
    const p = prochetiTseniMD(LIST);
    expect(p.redove.length).toBe(6);
    expect(p.propusnati).toBe(0);

    const ap2 = p.redove[1]!;
    expect(ap2.obekt).toBe('Апартамент 2');
    expect(ap2.chista_kvsm).toBe(57_0000);
    expect(ap2.obshta_kvsm).toBe(64_4400);
    expect(ap2.obshti_kvsm).toBe(7_4300); // 7.436… → 7,43 м²
    expect(ap2.tsena_st).toBe(215400_00); // 215 400 € с ДДС
    expect(ap2.prodaden).toBe(false);
    expect(ap2.terasi_kvsm).toBe(22_9000);
    expect(ap2.stai).toBe(2);
    expect(ap2.izlozhenie).toBe('И');
  });

  it('ПРОДАДЕН не е цена — белег е', () => {
    const ap1 = prochetiTseniMD(LIST).redove[0]!;
    expect(ap1.prodaden).toBe(true);
    expect(ap1.tsena_st).toBeNull();
  });

  it('етажът и котата се делят и се ПРЕНАСЯТ по групата', () => {
    const p = prochetiTseniMD(LIST);
    expect(p.redove[0]!.etazh).toBe('етаж 1');
    expect(p.redove[0]!.kota).toBe('+/- 0.00');
    expect(p.redove[1]!.etazh).toBe('етаж 1'); // Ап.2 няма свой — носи горния
    expect(p.redove[2]!.etazh).toBe('етаж 2');
    expect(p.redove[3]!.etazh).toBe('сутерен');
  });

  it('редът с разминала се „Обща площ" се ЧЕТЕ дословно, а разликата се казва', () => {
    const p = prochetiTseniMD(LIST);
    const ap5 = p.redove[2]!;
    // файлът пише 34.19679757 — по-малко от чистата; четем каквото пише
    expect(ap5.obshta_kvsm).toBe(34_1900);
    expect(p.sverki.some((s) => s.obekt === 'Апартамент 5')).toBe(true);
    // а сверимите редове не вдигат шум
    expect(p.sverki.some((s) => s.obekt === 'Апартамент 2')).toBe(false);
  });

  it('теренът без общи части е нула общи, не грешка', () => {
    const r4 = prochetiTseniMD(LIST).redove[4]!;
    expect(r4.obshti_kvsm).toBe(0);
    expect(r4.chista_kvsm).toBe(13_7500);
    expect(r4.tsena_st).toBe(27800_00);
  });
});
