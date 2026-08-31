/**
 * СЕМЕЙСТВАТА ХЕДЪРИ · таблиците с еднаква глава застават една до друга.
 *
 * Негови думи, 27.08: „таблиците с еднакви хедъри се подреждат една до друга в
 * таба — като сортиране"; и от 08.08 *(р70·[32])*: „хедърите от еднаквите
 * таблици… някой хедъри имат индивидуални колони за себе си".
 */

import { describe, expect, it } from 'vitest';
import {
  broySemeystva,
  otpechatakNaEkrannaGlava,
  podrediPoSemeystvo,
  type SektsiyaSGlava,
} from '../app/semeystva.ts';

const s = (klyuch: string, otpechatak: string): SektsiyaSGlava => ({ klyuch, otpechatak });

describe('отпечатъкът на нарисуваната глава', () => {
  it('свежда като домейна · разстояния, регистър, NFC', () => {
    expect(otpechatakNaEkrannaGlava(['  Наем €', 'СЕКТОР  '])).toBe('наем €|сектор');
  });

  it('еднакви глави с различно изписване дават ЕДИН отпечатък', () => {
    expect(otpechatakNaEkrannaGlava(['Имот', 'Наем'])).toBe(
      otpechatakNaEkrannaGlava(['имот', '  НАЕМ ']),
    );
  });

  it('празна глава дава празен отпечатък, не низ от разделители', () => {
    // Инак две секции БЕЗ таблица биха се сметнали за роднини и биха се слели.
    expect(otpechatakNaEkrannaGlava([])).toBe('');
    expect(otpechatakNaEkrannaGlava(['', '  '])).toBe('');
  });

  it('различен БРОЙ колони е различно семейство', () => {
    expect(otpechatakNaEkrannaGlava(['А', 'Б'])).not.toBe(otpechatakNaEkrannaGlava(['А', 'Б', 'В']));
  });
});

describe('подреждането по семейство', () => {
  it('роднините се придърпват при първия си член', () => {
    const red = podrediPoSemeystvo([s('а', 'X'), s('б', 'Y'), s('в', 'X'), s('г', 'Y')]);
    expect(red).toEqual(['а', 'в', 'б', 'г']);
  });

  it('редът ВЪТРЕ в семейството не се разбърква · устойчиво', () => {
    // Човек вече е наредил своето; сортирането не бива да му го отнеме.
    const red = podrediPoSemeystvo([s('п1', 'X'), s('п2', 'X'), s('п3', 'X')]);
    expect(red).toEqual(['п1', 'п2', 'п3']);
  });

  it('секция БЕЗ таблица не се мести и не се слива с друга такава', () => {
    const red = podrediPoSemeystvo([s('форма', ''), s('а', 'X'), s('бележка', ''), s('в', 'X')]);
    expect(red).toEqual(['форма', 'а', 'в', 'бележка']);
  });

  it('вече подреденото остава непокътнато · повторното натискане не мърда нищо', () => {
    const veche = [s('а', 'X'), s('в', 'X'), s('б', 'Y')];
    expect(podrediPoSemeystvo(veche)).toEqual(['а', 'в', 'б']);
  });

  it('нито една секция не се губи и не се появява два пъти', () => {
    const vhod = [s('а', 'X'), s('б', ''), s('в', 'Y'), s('г', 'X'), s('д', 'Y'), s('е', '')];
    const red = podrediPoSemeystvo(vhod);
    expect(red).toHaveLength(vhod.length);
    expect(new Set(red).size).toBe(vhod.length);
    expect([...red].sort()).toEqual(vhod.map((x) => x.klyuch).sort());
  });

  it('празен вход не гърми', () => {
    expect(podrediPoSemeystvo([])).toEqual([]);
  });
});

describe('колко семейства има какво да съберат', () => {
  it('брои само онези с ПОВЕЧЕ от един член', () => {
    expect(broySemeystva([s('а', 'X'), s('б', 'X'), s('в', 'Y')])).toBe(1);
    expect(broySemeystva([s('а', 'X'), s('б', 'Y')])).toBe(0);
  });

  it('секциите без таблица не се броят за семейство', () => {
    expect(broySemeystva([s('а', ''), s('б', '')])).toBe(0);
  });
});
