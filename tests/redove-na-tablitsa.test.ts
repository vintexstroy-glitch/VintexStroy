/**
 * РЕДОВЕТЕ НА СЪЗДАДЕНАТА ТАБЛИЦА · инвариантите на резен 57 (M12).
 *
 * Описът: „Огледалото пази само ГЛАВАТА на моделна таблица… Не е дребно —
 * иска нов вид запис през Вратата."
 */
import { describe, expect, it } from 'vitest';
import {
  KARTATA_NA_VIDA,
  proveriRed,
  redovete,
  sborNaKolona,
  sveriRedovete,
  vidaNaKolonata,
  zatvorenaE,
  type RedNaTablitsa,
} from '../src/domein/redove-na-tablitsa.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { VIDOVE_STOYNOST } from '../src/domein/vid-stoynost.js';
import { stend } from './pomoshtni.js';

/** Глава с по една колона от всеки вид · и ЕДНА затворена (със сметка). */
const GLAVATA: PayloadTablitsaOtFaylSazdadena = {
  klyuch: 'Фактури',
  otFayl: 'fakturi.xlsx',
  otpechatak: 'ab'.repeat(32),
  glavi: ['Дата', 'Доставчик', 'Сума', 'Отстъпка', 'Брой', 'За плащане'],
  vidove: { 0: 'data', 1: 'tekst', 2: 'evro', 3: 'protsent', 4: 'chislo', 5: 'evro' },
  formuli: { 5: { deystvie: 'razlika', ot: [2, 3] } },
  nekopirani: [],
};

function red(chast: Partial<RedNaTablitsa> = {}): RedNaTablitsa {
  return {
    tablitsa: 'Фактури',
    red: 'Ф-1',
    pari_st: { 2: 120_00 },
    chisla: { 3: 10, 4: 2 },
    tekst: { 0: '2026-08-25', 1: 'Доставчик ООД' },
    mahnat: false,
    ...chast,
  };
}

async function knigata() {
  const { deystviya, dnevnik } = stend();
  await deystviya.zapishiTablitsaOtFayl(GLAVATA, { opId: 't-1' });
  const o = async () => fold(await dnevnik.chetiVsichki('vintexstroy'));
  return { deystviya, dnevnik, o };
}

describe('редовете · главата решава', () => {
  it('всеки вид стойност има СВОЯ карта · нито един не остава без дом', () => {
    for (const v of VIDOVE_STOYNOST) {
      expect(KARTATA_NA_VIDA[v], `вид без карта: ${v}`).toBeTruthy();
    }
    expect(vidaNaKolonata(GLAVATA, '2')).toBe('evro');
    expect(vidaNaKolonata(GLAVATA, '9')).toBe('tekst');
    expect(zatvorenaE(GLAVATA, '5')).toBe(true);
    expect(zatvorenaE(GLAVATA, '2')).toBe(false);
  });

  it('редът влиза в Журнала и се чете от Огледалото', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red(), { opId: 'r-1' });
    const zhivi = redovete((await o()).redoveNaTablitsi, 'Фактури');
    expect(zhivi.length).toBe(1);
    expect(zhivi[0]!.pari_st['2']).toBe(120_00);
  });

  it('редовете идват ПОДРЕДЕНИ по ключ, не по реда на въвеждане', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-2' }), { opId: 'r-2' });
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-1' }), { opId: 'r-1' });
    expect(redovete((await o()).redoveNaTablitsi, 'Фактури').map((r) => r.red)).toEqual([
      'Ф-1',
      'Ф-2',
    ]);
  });
});

describe('редовете · пазачът пита ГЛАВАТА', () => {
  it('затворена колона НЕ се въвежда · тя се СМЯТА', () => {
    expect(() => proveriRed(red({ pari_st: { 5: 100_00 } }), GLAVATA)).toThrow(/затворена колона/);
  });

  it('пари с дробна стотинка се отказват · цели стотинки (правило 3)', () => {
    expect(() => proveriRed(red({ pari_st: { 2: 120.5 } }), GLAVATA)).toThrow(/ЦЕЛИ стотинки/);
  });

  it('стойност в ЧУЖДА карта се отказва · сумата не е текст', () => {
    expect(() => proveriRed(red({ pari_st: {}, tekst: { 2: '120' } }), GLAVATA)).toThrow(
      /не стои при/,
    );
    expect(() => proveriRed(red({ chisla: { 1: 5 } }), GLAVATA)).toThrow(/не стои при/);
  });

  it('колона извън главата се отказва', () => {
    expect(() => proveriRed(red({ tekst: { 99: 'х' } }), GLAVATA)).toThrow(/я няма в главата/);
  });

  it('една колона на ДВЕ места се отказва', () => {
    expect(() => proveriRed(red({ chisla: { 3: 10 }, tekst: { 3: '10' } }), GLAVATA)).toThrow(
      /на две места/,
    );
  });

  it('празен ключ на реда се отказва С ДУМИТЕ си', () => {
    expect(() => proveriRed(red({ red: '  ' }), GLAVATA)).toThrow(/иска ключ/);
  });

  it('ред към несъществуваща таблица не се записва', async () => {
    const { deystviya } = await knigata();
    await expect(
      deystviya.zapishiRedNaTablitsa(red({ tablitsa: 'НЯМА' }), { opId: 'r-1' }),
    ).rejects.toThrow(/я няма/);
  });
});

describe('редовете · поправката и махането са ЗАПИСИ', () => {
  it('вторият запис със същия ключ ПОПРАВЯ, не прави втори ред', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red(), { opId: 'r-1' });
    await deystviya.zapishiRedNaTablitsa(red({ pari_st: { 2: 200_00 } }), { opId: 'r-2' });
    const zhivi = redovete((await o()).redoveNaTablitsi, 'Фактури');
    expect(zhivi.length).toBe(1);
    expect(zhivi[0]!.pari_st['2']).toBe(200_00);
  });

  it('махнатият ред си отива от ТАБЛИЦАТА, но остава в Журнала и в картата', async () => {
    const { deystviya, dnevnik, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red(), { opId: 'r-1' });
    await deystviya.zapishiRedNaTablitsa(red({ mahnat: true }), { opId: 'r-2' });

    const kniga = await o();
    expect(redovete(kniga.redoveNaTablitsi, 'Фактури')).toEqual([]);
    expect(kniga.redoveNaTablitsi.get('Фактури')?.size).toBe(1);
    expect(
      (await dnevnik.chetiVsichki('vintexstroy')).filter((s) => s.type === 'РедНаТаблицаЗаписан')
        .length,
    ).toBe(2);
  });
});

describe('редовете · сметките върху тях', () => {
  it('сборът на колона е в ЦЕЛИ стотинки и МАХНАТИЯТ не влиза', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-1', pari_st: { 2: 120_33 } }), {
      opId: 'r-1',
    });
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-2', pari_st: { 2: 80_67 } }), {
      opId: 'r-2',
    });
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-3', pari_st: { 2: 500_00 } }), {
      opId: 'r-3',
    });
    await deystviya.zapishiRedNaTablitsa(
      red({ red: 'Ф-3', pari_st: { 2: 500_00 }, mahnat: true }),
      { opId: 'r-4' },
    );

    // ВСИЧКИ редове, махнатият ВКЛЮЧИТЕЛНО: сборът сам трябва да го изхвърли,
    // а не да разчита викащият да го е направил преди него.
    const vsichki = [...((await o()).redoveNaTablitsi.get('Фактури') ?? new Map()).values()];
    expect(vsichki.length).toBe(3);
    // 120,33 + 80,67 = 201,00 · и нито една стотинка не се губи по пътя
    expect(sborNaKolona(vsichki, '2')).toBe(201_00);
    expect(Number.isInteger(sborNaKolona(vsichki, '2'))).toBe(true);
  });

  it('ред, махнат ОТ ПЪРВИЯ си запис, пак е ЗАПИСАН · входът брои всичко видяно', async () => {
    // Иде от внос или от чужда верига: първата дума за реда е „махнат".
    // Входът трябва да го брои — иначе се смята от същото, което проверява.
    const { deystviya, o } = await knigata();
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-9', mahnat: true }), { opId: 'r-9' });
    const kniga = await o();
    expect(kniga.vhodNaRedovete.get('Фактури')).toEqual({ zapisani: 1, mahnati: 1 });
    expect(sveriRedovete(kniga.vhodNaRedovete, kniga.redoveNaTablitsi, 'Фактури')).toEqual({
      zapisani: 1,
      mahnati: 1,
      zhivi: 0,
      razlika: 0,
    });
  });

  it('РАЗЛИКАТА пада, когато картата изгуби ред · сверката може да е ЧЕРВЕНА', () => {
    // Входът казва „видях два реда"; картата държи един. Точно това е тихият
    // инцидент, за който сверката съществува — и точно него не хващаше
    // предишната ѝ форма, смятана от самата карта.
    const vhod = new Map([['Фактури', { zapisani: 2, mahnati: 0 }]]);
    const karta = new Map([['Фактури', new Map([['Ф-1', red({ red: 'Ф-1' })]])]]);
    expect(sveriRedovete(vhod, karta, 'Фактури')).toEqual({
      zapisani: 2,
      mahnati: 0,
      zhivi: 1,
      razlika: 1,
    });
  });

  it('сверката брои ТРИТЕ числа · и записаната нула се казва', async () => {
    const { deystviya, o } = await knigata();
    expect(sveriRedovete((await o()).vhodNaRedovete, (await o()).redoveNaTablitsi, 'Фактури')).toEqual({
      zapisani: 0,
      mahnati: 0,
      zhivi: 0,
      razlika: 0,
    });

    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-1' }), { opId: 'r-1' });
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-2' }), { opId: 'r-2' });
    await deystviya.zapishiRedNaTablitsa(red({ red: 'Ф-2', mahnat: true }), { opId: 'r-3' });

    expect(sveriRedovete((await o()).vhodNaRedovete, (await o()).redoveNaTablitsi, 'Фактури')).toEqual({
      zapisani: 2,
      mahnati: 1,
      zhivi: 1,
      razlika: 0,
    });
  });
});
