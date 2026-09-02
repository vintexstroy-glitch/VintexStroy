/**
 * ВНОСЪТ НА РЕДОВЕТЕ · инвариантите на резен 61.
 *
 * Формата на данните е от НЕГОВИЯ файл („приходи · Винтекс Строй АД"): глава на
 * втори ред, сборни редове между данните, суми с интервал за хиляди. Самите
 * стойности са измислени — файлът му носи чужди имена и телефони.
 */
import { describe, expect, it } from 'vitest';
import { kolonataNaKlyucha, podgotviVnos } from '../src/domein/vnos-na-redove.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';

const GLAVATA: PayloadTablitsaOtFaylSazdadena = {
  klyuch: 'Малинова',
  otFayl: 'p.xlsb',
  otpechatak: 'ab'.repeat(32),
  glavi: ['апартамент', 'квадратура', 'цена', 'цена банка', 'проверка', 'ставка'],
  vidove: { 0: 'tekst', 1: 'chislo', 2: 'evro', 3: 'evro', 4: 'evro', 5: 'protsent' },
  formuli: { 4: { deystvie: 'razlika', ot: [2, 3] } },
  nekopirani: [],
};

/** Ред 1 · заглавие · ред 2 · глава · после данните, със СБОРЕН ред между тях. */
const FAYLAT: Tablitsa = {
  ime: 'Малинова',
  redove: [
    ['Т А Б Л И Ц А за продажбите'],
    ['апартамент', 'квадратура', 'цена', 'цена банка', 'проверка'],
    ['апартамент № 3', '63.31', '147800', '60000', '0', '20%'],
    ['', '', '110113.23', '27381.62', '0'],
    ['апартамент № 4', '34.2', '56 300,00', '14000', '0'],
    ['апартамент № 3', '20', '1000', '500', '0'],
    ['апартамент № 5', 'един', '135000', '56800', '0'],
    ['апартамент № 6', '62.1', 'без цена', '1', '0'],
  ],
};

/**
 * НЕГОВИЯТ ВТОРИ ЛИСТ · пред името стои „№".
 *
 * Тази глава е тук заради счупване, което МИНА: „ключът е винаги колона 0"
 * даваше зелено, защото в първата глава текстовата колона наистина е първа.
 * Проверка, зелена по стара причина, не пази нищо.
 */
const GLAVATA_S_NOMER: PayloadTablitsaOtFaylSazdadena = {
  klyuch: 'Студентски',
  otFayl: 'p.xlsb',
  otpechatak: 'cd'.repeat(32),
  glavi: ['№', 'апартамент', 'цена'],
  vidove: { 0: 'chislo', 1: 'tekst', 2: 'evro' },
  formuli: {},
  nekopirani: [],
};

describe('вносът · кой ред влиза', () => {
  it('ключът идва от първата ТЕКСТОВА колона', () => {
    expect(kolonataNaKlyucha(GLAVATA)).toBe(0);
  });

  it('и когато пред нея стои число, ключът е ВТОРАТА колона', () => {
    expect(kolonataNaKlyucha(GLAVATA_S_NOMER)).toBe(1);
  });

  it('и намереният ключ ПЪТУВА до записа · номерът не става име', () => {
    const v = podgotviVnos(
      { ime: 'Студентски', redove: [['№', 'апартамент', 'цена'], ['1', 'ателие А', '1000']] },
      GLAVATA_S_NOMER,
      1,
    );
    expect(v.redove.map((r) => r.red)).toEqual(['ателие А']);
  });

  it('глава БЕЗ нито една текстова колона пада на първата · не отказва', () => {
    expect(
      kolonataNaKlyucha({ ...GLAVATA_S_NOMER, vidove: { 0: 'chislo', 1: 'evro', 2: 'evro' } }),
    ).toBe(0);
  });

  it('редовете с име влизат · СБОРНИЯТ ред се пропуска и се КАЗВА защо', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.redove.map((r) => r.red)).toEqual(['апартамент № 3', 'апартамент № 4']);
    expect(v.propusnati.find((p) => p.red === 4)?.zashto).toMatch(/СБОРЕН/);
  });

  it('повторен ключ не се записва втори път', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.propusnati.find((p) => p.red === 6)?.zashto).toMatch(/повторен ключ/);
  });

  it('ред с нечисло и ред с несума се пропускат, всеки с КОЛОНАТА си', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.propusnati.find((p) => p.red === 7)?.zashto).toMatch(/квадратура.*не е число/);
    expect(v.propusnati.find((p) => p.red === 8)?.zashto).toMatch(/цена.*не е сума/);
  });
});

describe('вносът · какво влиза в клетките', () => {
  it('парите стават ЦЕЛИ центове · и интервалът за хиляди се чете', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    // Числата са писани С РЪКА: 147 800,00 € = 14 780 000 цента.
    expect(v.redove[0]!.pari_st['2']).toBe(14_780_000);
    expect(v.redove[1]!.pari_st['2']).toBe(5_630_000);
    expect(Number.isInteger(v.redove[1]!.pari_st['2'])).toBe(true);
  });

  it('числото си остава число, текстът — текст', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.redove[0]!.chisla['1']).toBe(63.31);
    expect(v.redove[0]!.tekst['0']).toBe('апартамент № 3');
  });

  it('ПРОЦЕНТЪТ със знака си влиза · „20%" не е повреден ред', () => {
    // Първата ми проба четеше процента с голо `Number` и пропускаше ЦЕЛИЯ лист
    // заради един знак. Числото е писано с ръка: 20% → 20.
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.redove[0]!.chisla['5']).toBe(20);
  });

  it('ЗАТВОРЕНАТА колона не влиза · тя се смята', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.redove[0]!.pari_st['4']).toBeUndefined();
  });
});

describe('вносът · сверката вход↔изход', () => {
  it('прочетени = записани + пропуснати · и разликата е НУЛА', () => {
    const v = podgotviVnos(FAYLAT, GLAVATA, 2);
    expect(v.sverka).toEqual({ procheteni: 6, zapisani: 2, propusnati: 4, razlika: 0 });
  });

  it('празната таблица дава ПРОВЕРЕНА нула, не мълчание', () => {
    const v = podgotviVnos({ ime: 'празна', redove: [] }, GLAVATA, 2);
    expect(v.sverka).toEqual({ procheteni: 0, zapisani: 0, propusnati: 0, razlika: 0 });
  });
});
