/**
 * РАЗРЕЗЪТ ПО СОБСТВЕНА КОЛОНА · инвариантите на резен 59.
 *
 * Описът го изброи сред онова, което чакаше редовете на моделната таблица.
 */
import { describe, expect, it } from 'vitest';
import {
  kletkataKatoTekst,
  parichniteKoloni,
  razrezPoKolona,
  sveriRazreza,
} from '../src/domein/razrez.js';
import type { RedNaTablitsa } from '../src/domein/redove-na-tablitsa.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';

const GLAVATA: PayloadTablitsaOtFaylSazdadena = {
  klyuch: 'Фактури',
  otFayl: 'f.xlsx',
  otpechatak: 'ab'.repeat(32),
  glavi: ['Доставчик', 'Сума', 'ДДС', 'Брой'],
  vidove: { 0: 'tekst', 1: 'evro', 2: 'evro', 3: 'chislo' },
  formuli: {},
  nekopirani: [],
};

function red(
  ime: string,
  suma_st: number,
  dds_st: number,
  chast: Partial<RedNaTablitsa> = {},
): RedNaTablitsa {
  return {
    tablitsa: 'Фактури',
    red: `${ime}-${suma_st}`,
    pari_st: { 1: suma_st, 2: dds_st },
    chisla: { 3: 1 },
    tekst: { 0: ime },
    mahnat: false,
    ...chast,
  };
}

// НАРОЧНО в разбъркан ред и с ПОВТАРЯЩИ се доставчици: подредба, която идва
// сама от въвеждането, не доказва подредба (резен 55).
const REDOVE: readonly RedNaTablitsa[] = [
  red('Янев', 100_00, 20_00),
  red('Ангелов', 250_33, 50_07),
  red('Янев', 50_00, 10_00),
  red('Ангелов', 99_67, 19_93),
];

describe('разрезът · групите', () => {
  it('събира по стойността на колоната и ги връща ПОДРЕДЕНИ', () => {
    const grupi = razrezPoKolona(REDOVE, GLAVATA, '0');
    expect(grupi.map((g) => g.stoynost)).toEqual(['Ангелов', 'Янев']);
    expect(grupi.map((g) => g.broy)).toEqual([2, 2]);
  });

  it('сборът на групата е в ЦЕЛИ центове · и точен до цент', () => {
    const [angelov, yanev] = razrezPoKolona(REDOVE, GLAVATA, '0');
    // 250,33 + 99,67 = 350,00 · нито един цент не се губи по пътя
    expect(angelov!.sbor_st['1']).toBe(350_00);
    expect(angelov!.sbor_st['2']).toBe(70_00);
    expect(yanev!.sbor_st['1']).toBe(150_00);
  });

  it('ПРАЗНАТА клетка е СВОЯ група, не изхвърлен ред', () => {
    const bezIme = { ...red('', 10_00, 2_00), tekst: {} };
    const grupi = razrezPoKolona([...REDOVE, bezIme], GLAVATA, '0');
    expect(grupi.map((g) => g.stoynost)).toEqual(['', 'Ангелов', 'Янев']);
    expect(grupi[0]!.sbor_st['1']).toBe(10_00);
  });

  it('МАХНАТИЯТ ред не влиза в нито една група', () => {
    const grupi = razrezPoKolona([...REDOVE, red('Янев', 999_00, 0, { mahnat: true })], GLAVATA, '0');
    expect(grupi.find((g) => g.stoynost === 'Янев')?.sbor_st['1']).toBe(150_00);
  });

  it('разрез по ПАРИЧНА колона също работи · стойността се пише като ПАРИ', () => {
    const grupi = razrezPoKolona(REDOVE, GLAVATA, '1');
    // Числото е ПИСАНО С РЪКА. Сравнение срещу `kletkataKatoTekst` би било
    // тавтология: същата функция строи стойността и после я проверява —
    // точно дефектът, който обход В лови (резен 57 · сверката).
    expect(grupi.map((g) => g.stoynost)).toEqual([
      '100,00\u202F€',
      '250,33\u202F€',
      '50,00\u202F€',
      '99,67\u202F€',
    ]);
    expect(grupi.every((g) => g.broy === 1)).toBe(true);
  });

  it('клетката се чете според ВИДА на колоната, не по съдържанието', () => {
    expect(kletkataKatoTekst(REDOVE[0]!, GLAVATA, '0')).toBe('Янев');
    expect(kletkataKatoTekst(REDOVE[0]!, GLAVATA, '1')).toBe('100,00\u202F€');
    expect(kletkataKatoTekst(REDOVE[0]!, GLAVATA, '3')).toBe('1');
  });

  it('колона извън главата се отказва с думи', () => {
    expect(() => razrezPoKolona(REDOVE, GLAVATA, '9')).toThrow(/я няма в главата/);
  });

  it('паричните колони се БРОЯТ от главата, не се гадаят', () => {
    expect(parichniteKoloni(GLAVATA)).toEqual(['1', '2']);
  });
});

describe('разрезът · сверката цяло ↔ части', () => {
  it('здравият разрез дава НУЛА по броя и по всяка парична колона', () => {
    const grupi = razrezPoKolona(REDOVE, GLAVATA, '0');
    const s = sveriRazreza(REDOVE, GLAVATA, grupi);
    expect(s.redove).toBe(4);
    expect(s.vGrupite).toBe(4);
    expect(s.razlikaVBroya).toBe(0);
    expect(s.razlika_st).toEqual({ 1: 0, 2: 0 });
  });

  it('изпаднала група прави разликата ЧЕРВЕНА · сверката може да падне', () => {
    // Двете страни се смятат по РАЗЛИЧЕН път: лявата по редовете, дясната по
    // групите. Махне ли се група, лявата не мърда — и разликата го казва.
    const grupi = razrezPoKolona(REDOVE, GLAVATA, '0');
    const bezEdnata = grupi.filter((g) => g.stoynost !== 'Янев');
    const s = sveriRazreza(REDOVE, GLAVATA, bezEdnata);
    expect(s.razlikaVBroya).toBe(2);
    expect(s.razlika_st['1']).toBe(150_00);
  });

  it('и МАХНАТИТЕ не се броят от нито една от двете страни', () => {
    const sMahnat = [...REDOVE, red('Янев', 999_00, 0, { mahnat: true })];
    const s = sveriRazreza(sMahnat, GLAVATA, razrezPoKolona(sMahnat, GLAVATA, '0'));
    expect(s).toMatchObject({ redove: 4, vGrupite: 4, razlikaVBroya: 0 });
  });
});
