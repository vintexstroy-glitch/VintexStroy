/**
 * ЖИВИЯТ ХЕДЪР · и трите му изречения, проверени с ЧИСЛА (резен 49 · M15).
 *
 * Половината се твърди с 0,51 и 0,49, а не се гледа на екрана: точно затова
 * решението е чиста функция, а екранът само мери.
 */

import { describe, expect, it } from 'vitest';
import {
  nadPolovinata,
  sveriZhiviyaHedar,
  vidimo,
  zhiviyatHedar,
  type TablitsaNaEkrana,
} from '../src/domein/zhiviyat-hedar.js';

const EKRAN = 800;

const t = (
  klyuch: string,
  gore: number,
  visochina: number,
  otpechatak = klyuch,
): TablitsaNaEkrana => ({ klyuch, gore, visochina, otpechatak });

describe('живият хедър · колко се вижда', () => {
  it('таблица изцяло в екрана се вижда цялата', () => {
    expect(vidimo(t('a', 100, 200), EKRAN)).toBe(200);
  });

  it('минала нагоре · вижда се само остатъкът', () => {
    // върхът е на −150, височината 200 → под линията остават 50
    expect(vidimo(t('a', -150, 200), EKRAN)).toBe(50);
  });

  it('изцяло извън екрана · нула, не отрицателно', () => {
    expect(vidimo(t('a', -500, 200), EKRAN)).toBe(0);
    expect(vidimo(t('a', 900, 200), EKRAN)).toBe(0);
  });

  it('половината е СТРОГО повече, не „поне"', () => {
    // ЧИСЛАТА СА С РЪКА · 200 висока: 101 видими минават, 100 — не.
    expect(nadPolovinata(t('a', -99, 200), EKRAN)).toBe(true);
    expect(nadPolovinata(t('a', -100, 200), EKRAN)).toBe(false);
    expect(nadPolovinata(t('a', -101, 200), EKRAN)).toBe(false);
  });

  it('нулева височина не се дели · връща „не", а не NaN', () => {
    expect(nadPolovinata(t('a', 0, 0), EKRAN)).toBe(false);
  });
});

describe('живият хедър · НАДОЛУ е нормално всичко', () => {
  it('щом втората вземе линията, главата ѝ застава горе ВЕДНАГА', () => {
    // първата е минала (−300 от 200 висока), втората държи линията
    const tablitsi = [t('a', -300, 200), t('b', -10, 400)];
    expect(zhiviyatHedar(tablitsi, 'nadolu', EKRAN, 'a')).toBe('b');
  });

  it('и НЕ чака половина · с едва десет пиксела вече е нейна', () => {
    const tablitsi = [t('a', -900, 800), t('b', -10, 400)];
    expect(nadPolovinata(tablitsi[1]!, EKRAN)).toBe(true);
    // дори при съвсем малко видяно надолу пак се сменя
    const malko = [t('a', -900, 800), t('b', -395, 400)];
    expect(nadPolovinata(malko[1]!, EKRAN)).toBe(false);
    expect(zhiviyatHedar(malko, 'nadolu', EKRAN, 'a')).toBe('b');
  });
});

describe('живият хедър · НАГОРЕ чака половината', () => {
  const gornata = (vidimiPikseli: number): readonly TablitsaNaEkrana[] => [
    t('a', vidimiPikseli - 200, 200),
    t('b', vidimiPikseli, 400),
  ];

  it('под половината · главата НЕ се сменя', () => {
    // 99 от 200 видими → под половината
    expect(zhiviyatHedar(gornata(99), 'nagore', EKRAN, 'b')).toBe('b');
  });

  it('точно половината · пак НЕ се сменя · „повече от" значи повече', () => {
    expect(zhiviyatHedar(gornata(100), 'nagore', EKRAN, 'b')).toBe('b');
  });

  it('над половината · сменя се', () => {
    expect(zhiviyatHedar(gornata(101), 'nagore', EKRAN, 'b')).toBe('a');
  });
});

describe('живият хедър · РОДНИНИТЕ не сменят глава', () => {
  it('един отпечатък · остава главата на ПЪРВАТА, в двете посоки', () => {
    const rodnini = [t('a', -300, 200, 'ЕДИН'), t('b', -10, 400, 'ЕДИН')];
    expect(zhiviyatHedar(rodnini, 'nadolu', EKRAN, 'a')).toBe('a');
    expect(zhiviyatHedar(rodnini, 'nagore', EKRAN, 'a')).toBe('a');
  });

  it('а различен отпечатък сменя · роднинството е ЕДИНСТВЕНАТА причина да не се сменя', () => {
    const chuzhdi = [t('a', -300, 200, 'ЕДИН'), t('b', -10, 400, 'ДРУГ')];
    expect(zhiviyatHedar(chuzhdi, 'nadolu', EKRAN, 'a')).toBe('b');
  });
});

describe('живият хедър · краищата', () => {
  it('без таблици · празно, не грешка', () => {
    expect(zhiviyatHedar([], 'nadolu', EKRAN, '')).toBe('');
  });

  it('първото рисуване · взима онази, която държи линията', () => {
    expect(zhiviyatHedar([t('a', -10, 200), t('b', 300, 400)], 'nadolu', EKRAN, '')).toBe('a');
  });

  it('нищо още не е минало нагоре · главата е на ПЪРВАТА', () => {
    expect(zhiviyatHedar([t('a', 50, 200), t('b', 300, 400)], 'nadolu', EKRAN, '')).toBe('a');
  });

  it('на върха първата взима главата и НАГОРЕ · дори да се вижда под половин', () => {
    // НАМЕРЕНО ОТ ПРОХОДА · първата таблица стои НИСКО под формата: при връщане
    // на нула тя се вижда едва, половината я спираше, и горе оставаше глава на
    // таблица, излязла отдавна от екрана. Правилото на половината е за
    // СЪСТЕЗАНИЕ за линията; на върха състезание няма.
    const nisko = [t('a', 700, 300), t('b', 1100, 400)];
    expect(nadPolovinata(nisko[0]!, EKRAN)).toBe(false);
    expect(zhiviyatHedar(nisko, 'nagore', EKRAN, 'b')).toBe('a');
  });

  it('изчезнала сегашна · връща се към онази, която държи линията', () => {
    expect(zhiviyatHedar([t('a', -10, 200)], 'nagore', EKRAN, 'izchezna')).toBe('a');
  });
});

describe('живият хедър · сверката вход↔изход (правило 7)', () => {
  it('колкото таблици влизат, толкова живи глави излизат · и нулата се казва', () => {
    const sv = sveriZhiviyaHedar([t('a', -300, 200), t('b', -10, 400)], EKRAN);
    expect(sv.vhod).toBe(4);
    expect(sv.izhod).toBe(4);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('без таблици · нулата пак се ЗАПИСВА', () => {
    const sv = sveriZhiviyaHedar([], EKRAN);
    expect(sv.vhod).toBe(0);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });
});
