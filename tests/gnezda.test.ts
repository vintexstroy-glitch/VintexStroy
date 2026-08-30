/**
 * ГНЕЗДАТА · инвариантите на резен 50.
 *
 * Всеки от тях е бил СЧУПЕН нарочно, преди да влезе тук. Инвариант, който не е
 * виждал червено, е надпис.
 */
import { describe, expect, it } from 'vitest';
import {
  IMENA_NA_GNEZDATA,
  IMENA_NA_OTCHETITE,
  KAKVO_E_GNEZDOTO,
  KAKVO_E_OTCHETAT,
  NEGOVITE_IMENA,
  REDAT_NA_GNEZDATA,
  otchetite,
  razpredelenietoENegovo,
  sveriGnezdata,
} from '../src/domein/gnezda.js';
import type { Pole } from '../src/domein/otcheti.js';

function pole(klyuch: string, ime = klyuch.toUpperCase()): Pole {
  return { klyuch, ime, sbor_st: 0, sastavki: [], chaka: [], kakvo: '' };
}

const CHETIRITE = [pole('kapital'), pole('likvidnost'), pole('vzemaniya'), pole('sredstva')];

describe('гнездата · неговите пет имена', () => {
  it('трите гнезда носят ДОСЛОВНО думите му, в неговия ред', () => {
    expect(REDAT_NA_GNEZDATA.map((k) => IMENA_NA_GNEZDATA[k])).toEqual([
      'Отчети',
      'Пари',
      'Регистър',
    ]);
  });

  it('двата поименни отчета носят ДОСЛОВНО думите му, в неговия ред', () => {
    expect(Object.values(IMENA_NA_OTCHETITE)).toEqual(['Отчет Средства', 'Отчет Финанси']);
  });

  // ЗАЩО ТОЗИ ТЕСТ. Списъкът `NEGOVITE_IMENA` е онова, което казва „това е
  // негова дума". Ако някой смени име на екрана, без да го смени в списъка,
  // твърдението остава, а думата вече не е негова — точно тихата повреда, за
  // която е измислен похватът `NEGOVI_BAZI` (ADR-067).
  it('петте имена, които се БРОЯТ, са точно живите имена — нито едно повече', () => {
    const zhivi = [
      ...REDAT_NA_GNEZDATA.map((k) => IMENA_NA_GNEZDATA[k]),
      ...Object.values(IMENA_NA_OTCHETITE),
    ];
    expect([...NEGOVITE_IMENA].sort()).toEqual([...zhivi].sort());
  });

  it('разпределението НЕ е негово · нито едно поле', () => {
    for (const p of CHETIRITE) expect(razpredelenietoENegovo(p.klyuch)).toBe(false);
  });
});

describe('гнездата · разпределението по двата отчета', () => {
  it('Средства е ДВИЖЕНИЕ и стои само в Отчет Средства', () => {
    const [sre, fin] = otchetite(CHETIRITE);
    expect(sre!.poleta.map((p) => p.klyuch)).toEqual(['sredstva']);
    expect(fin!.poleta.map((p) => p.klyuch)).toEqual(['kapital', 'likvidnost', 'vzemaniya']);
  });

  // ДВЕТЕ ИЗРЕЧЕНИЯ СА ЗАКОВАНИ С РЪКА, а не сверени сами със себе си. Дотук
  // тук стоеше `expect(ot.kakvo).toBe(KAKVO_E_OTCHETAT[ot.klyuch])` — тавтология,
  // която минава при ВСЯКА промяна на текста. Обход В я хвана (резен 46): това е
  // точно повредата „константа без нито един пин с ръка".
  it('двете изречения „какво Е" стоят ДОСЛОВНО', () => {
    expect(KAKVO_E_OTCHETAT.sredstva).toBe(
      'движението за периода — какво е влязло минус какво е излязло',
    );
    expect(KAKVO_E_OTCHETAT.finansi).toBe(
      'състоянието към днес — какво се държи, какво се дължи, какво се чака',
    );
  });

  it('и всеки отчет носи своето, не чуждото', () => {
    for (const ot of otchetite(CHETIRITE)) expect(ot.kakvo).toBe(KAKVO_E_OTCHETAT[ot.klyuch]);
  });

  it('редът вътре в отчета е редът на входа, не азбучен', () => {
    const obarnati = [pole('vzemaniya'), pole('kapital'), pole('likvidnost'), pole('sredstva')];
    const [, fin] = otchetite(obarnati);
    expect(fin!.poleta.map((p) => p.klyuch)).toEqual(['vzemaniya', 'kapital', 'likvidnost']);
  });

  it('гнездото „Регистър" КАЗВА границата си, вместо да я преглътне', () => {
    expect(KAKVO_E_GNEZDOTO.registar).toContain('Имоти');
    expect(KAKVO_E_GNEZDOTO.registar).toContain('чете');
  });
});

describe('гнездата · сверката вход↔изход', () => {
  it('четирите влизат, четирите излизат · и нулата се записва', () => {
    const s = sveriGnezdata(CHETIRITE);
    expect(s.vhod).toBe(4);
    expect(s.izhod).toBe(4);
    expect(s.razlika).toBe(0);
    expect(s.bez_otchet).toEqual([]);
    expect(s.bez_pole).toEqual([]);
  });

  // ЕДНОТО ОТ ДВЕТЕ ПОСОКИ: ново поле, за което разпределението мълчи. То НЕ се
  // изхвърля тихо — името му излиза.
  it('поле без отчет излиза ПОИМЕННО и разликата светва', () => {
    const s = sveriGnezdata([...CHETIRITE, pole('novo')]);
    expect(s.vhod).toBe(5);
    expect(s.izhod).toBe(4);
    expect(s.razlika).toBe(1);
    expect(s.bez_otchet).toEqual(['novo']);
  });

  // ДРУГАТА ПОСОКА: разпределение, което сочи поле, което го няма. Броенето
  // само НЕ би го хванало — затова са две.
  it('разпределение без поле излиза ПОИМЕННО, макар разликата да е нула', () => {
    const s = sveriGnezdata([pole('kapital'), pole('likvidnost'), pole('vzemaniya')]);
    expect(s.razlika).toBe(0);
    expect(s.bez_pole).toEqual(['sredstva']);
  });

  it('празен вход дава два празни отчета, не изчезнали отчети', () => {
    expect(otchetite([]).map((o) => o.ime)).toEqual(['Отчет Средства', 'Отчет Финанси']);
    expect(sveriGnezdata([]).razlika).toBe(0);
  });
});
