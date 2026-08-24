/**
 * АДРЕСНАТА КНИГА (И94 т.2) · връзката е ПО НОМЕР, като в Ексел.
 *
 * Пази решението: номерът е ВРЪЗКА, не адрес — записан е на колоната и се
 * мести с нея; общата таблица е Огледало, не втори носител; номерата под
 * 100 са на вградените; връзка с един край се КАЗВА.
 */

import { describe, expect, it } from 'vitest';
import { napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';
import {
  adresnaKniga,
  GreshkaAdresnaKniga,
  NOMER_NA_VRAZKATA,
  PARVI_SVOBODEN_NOMER,
  proveriNomer,
  samotni,
  sledvashtNomer,
  svarzaniPoNomer,
  vrazkataNaNomer,
} from '../src/domein/adresna-kniga.js';
import { dayNomer, GreshkaRedaktor, premahniKolona } from '../src/domein/redaktor.js';

const TABLITSA: Tablitsa = {
  ime: 'Банка',
  redove: [
    ['Дата', 'Сума', 'Имот', 'Описание'],
    ['2026-08-05', '500,00', 'АП. 1', 'наем'],
  ],
};

function model(klyuch = 'Банка'): ModelNaTablitsa {
  return napraviModel({
    klyuch,
    tablitsa: TABLITSA,
    redNaGlavata: 0,
    koloni: { data: 0, suma: 1 },
  });
}

describe('номерата', () => {
  it('вградените връзки носят закованите 1 · 2 · 3', () => {
    expect(NOMER_NA_VRAZKATA.imot).toBe(1);
    expect(NOMER_NA_VRAZKATA.myasto).toBe(2);
    expect(NOMER_NA_VRAZKATA.obekt).toBe(3);
    expect(vrazkataNaNomer(1)).toBe('imot');
    expect(vrazkataNaNomer(99)).toBeUndefined();
  });

  it('под 100 е запазена зона — измислен номер там се отказва', () => {
    expect(() => proveriNomer(7)).toThrow(GreshkaAdresnaKniga);
    expect(() => proveriNomer(-1)).toThrow(GreshkaAdresnaKniga);
    expect(() => proveriNomer(2.5)).toThrow(GreshkaAdresnaKniga);
    // вградените и свободните минават
    expect(() => proveriNomer(1)).not.toThrow();
    expect(() => proveriNomer(0)).not.toThrow();
    expect(() => proveriNomer(PARVI_SVOBODEN_NOMER)).not.toThrow();
  });

  it('дава се само от Стопанина, и е нов модел — не редакция', () => {
    const m = model();
    expect(() => dayNomer(m, 2, 100, 'redaktor')).toThrow(GreshkaRedaktor);
    const nov = dayNomer(m, 2, 100, 'sobstvenik');
    expect(nov.nomera[2]).toBe(100);
    expect(m.nomera[2]).toBeUndefined(); // старият не е пипнат
  });

  it('номер 0 МАХА връзката', () => {
    const m = dayNomer(model(), 2, 100, 'sobstvenik');
    const bez = dayNomer(m, 2, 0, 'sobstvenik');
    expect(bez.nomera[2]).toBeUndefined();
  });

  it('колона от модел се закача и за ВГРАДЕНА връзка (номер 1 = имот)', () => {
    const m = dayNomer(model(), 2, 1, 'sobstvenik');
    expect(m.nomera[2]).toBe(1);
  });

  it('номерът се МЕСТИ с колоната при махане — не се лепи за съседа', () => {
    const m = dayNomer(model(), 2, 100, 'sobstvenik');
    // колона 3 („Описание") е след номерираната; маха се колона 0? — тя носи
    // роля. Маха се 3 (без данни за теста): номерът на 2 не мърда.
    const sled = premahniKolona(m, 3, { rolya: 'sobstvenik', imaDanni: false });
    expect(sled.nomera[2]).toBe(100);
  });
});

describe('общата таблица · Огледалото', () => {
  it('вградените стоят първи със закованите номера, моделите след тях', () => {
    const kniga = adresnaKniga([model()]);
    const vgradeni = kniga.filter((r) => r.otkade === 'vgradena');
    const modelni = kniga.filter((r) => r.otkade === 'model');
    expect(vgradeni.length).toBeGreaterThan(0);
    expect(vgradeni.every((r) => r.nomer > 0 && r.nomer < PARVI_SVOBODEN_NOMER)).toBe(true);
    expect(modelni.length).toBe(4); // четирите колони на „Банка"
  });

  it('колона без номер е РЕД с номер 0 — вижда се какво не е свързано', () => {
    const kniga = adresnaKniga([model()]);
    expect(kniga.filter((r) => r.otkade === 'model' && r.nomer === 0).length).toBe(4);
  });

  it('сходни номера = свързани · и през вградено, и между модели', () => {
    const a = dayNomer(model('Банка'), 2, 1, 'sobstvenik'); // „Имот" → имот
    const b = dayNomer(model('Каса'), 2, 1, 'sobstvenik');
    const kniga = adresnaKniga([a, b]);
    const svarzani = svarzaniPoNomer(kniga, 1);
    // двете моделни колони + вградените носители на „имот"
    expect(svarzani.filter((r) => r.otkade === 'model').length).toBe(2);
    expect(svarzani.filter((r) => r.otkade === 'vgradena').length).toBeGreaterThan(0);
  });

  it('номер с ЕДИН край се казва — връзка с един край не връзва нищо', () => {
    const a = dayNomer(model(), 2, 100, 'sobstvenik');
    expect(samotni(adresnaKniga([a]))).toEqual([100]);
    const b = dayNomer(a, 3, 100, 'sobstvenik');
    expect(samotni(adresnaKniga([b]))).toEqual([]);
  });

  it('следващият свободен се БРОИ от книгата, не се пази на второ място', () => {
    expect(sledvashtNomer(adresnaKniga([model()]))).toBe(PARVI_SVOBODEN_NOMER);
    const a = dayNomer(model(), 2, 100, 'sobstvenik');
    expect(sledvashtNomer(adresnaKniga([a]))).toBe(101);
  });

  it('svarzaniPoNomer(0) е празно — нулата не е връзка', () => {
    expect(svarzaniPoNomer(adresnaKniga([model()]), 0)).toEqual([]);
  });
});
