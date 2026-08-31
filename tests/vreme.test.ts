/**
 * ВРЕМЕТО · ЕДИН речник с ШЕСТ стойности (резен 13а).
 *
 * Негови думи, 27.08 (И104): „Нека са като НАП 5 вида… за деня е от 08:00 до
 * 17:00. Искам в такта да има и такъв който сам да избереш. … ДЕН с 8 часа.
 * Месец с дните от календара за месеца. Тримесечие пак така. Година с 12
 * месеца."
 */

import { describe, expect, it } from 'vitest';
import {
  CHASOVE_NA_DENYA,
  edinitsataNaSvoya,
  IMENA_NA_TAKTOVETE,
  koloniNaTakta,
  kolkoSeVizhdat,
  KRATNOST_NA_OBHVATA,
  NAY_MNOGO_DNI_ZA_DNEVNA_KOLONA,
  NAY_MNOGO_KOLONI,
  OBEDNIYAT_CHAS,
  TAKTOVE,
  TAKTOVE_ZA_REZHENE,
} from '../src/domein/vreme.js';

const DNES = '2026-08-27';

describe('речникът е ЕДИН · и има шест стойности', () => {
  it('петте на НАП плюс неговия свой', () => {
    expect([...TAKTOVE]).toEqual(['den', 'sedmitsa', 'mesets', 'trimesechie', 'godina', 'svoy']);
  });

  it('всеки има ИМЕ · речник без дума е ключ, не такт', () => {
    for (const t of TAKTOVE) expect(IMENA_NA_TAKTOVETE[t], t).not.toBe('');
  });

  it('за РЯЗАНЕ на готов период „свой" отпада · няма какво да реже', () => {
    expect([...TAKTOVE_ZA_REZHENE]).toEqual(['den', 'sedmitsa', 'mesets', 'trimesechie', 'godina']);
  });
});

describe('денят е РАБОТЕН ДЕН · осем часа между 08:00 и 17:00', () => {
  it('осем са, не девет · един час е почивка', () => {
    // Между 08 и 17 има ДЕВЕТ часа, а той каза ОСЕМ. Разликата не се замазва.
    expect(CHASOVE_NA_DENYA).toHaveLength(8);
    expect(CHASOVE_NA_DENYA[0]).toBe(8);
    expect(CHASOVE_NA_DENYA[CHASOVE_NA_DENYA.length - 1]).toBe(16);
  });

  it('обедът НЕ се рисува · и е ЕДНО число, не разпръснато условие', () => {
    expect(CHASOVE_NA_DENYA).not.toContain(OBEDNIYAT_CHAS);
  });

  it('колоната носи ЧАС, а „от" и „до" остават ДЕНЯТ', () => {
    // Часът е ДОПЪЛНЕНИЕ: който сравнява дати (лентите, сумите, износът),
    // продължава да работи, без да знае за часове.
    const k = koloniNaTakta('den', DNES);
    const dnesni = k.filter((x) => x.dnes);
    expect(dnesni).toHaveLength(8);
    for (const x of dnesni) {
      expect(x.ot).toBe(DNES);
      expect(x.do).toBe(DNES);
      expect(typeof x.chas).toBe('number');
    }
  });

  it('първата колона на деня носи ДЕНЯ · останалите часа', () => {
    const k = koloniNaTakta('den', DNES);
    const parva = k.findIndex((x) => x.dnes);
    expect(k[parva]!.nadpis).toBe('чт 27');
    expect(k[parva + 1]!.nadpis).toBe('09');
    // Цялото стои в описа · тясната глава реже, но нищо не се губи.
    expect(k[parva]!.opis).toContain('08:00–09:00');
    expect(k[parva]!.opis).toContain('август');
  });
});

describe('месецът е КАЛЕНДАРЕН · не закован на 31', () => {
  it('февруари дава 28 колони, не 31 с три празни', () => {
    expect(kolkoSeVizhdat('mesets', '2026-02-10')).toBe(28);
    expect(kolkoSeVizhdat('mesets', '2024-02-10')).toBe(29); // високосна
    expect(kolkoSeVizhdat('mesets', '2026-04-10')).toBe(30);
    expect(kolkoSeVizhdat('mesets', DNES)).toBe(31);
  });

  it('колоните почват от ПЪРВИЯ ден на месец · не от днес минус 31', () => {
    const k = koloniNaTakta('mesets', DNES);
    expect(k[0]!.ot).toBe('2026-07-01');
  });

  it('и свършват в КРАЯ на месец · без отрязан месец накрая', () => {
    const k = koloniNaTakta('mesets', DNES);
    expect(k[k.length - 1]!.do).toBe('2026-12-31');
  });
});

describe('тримесечието · „пак така" — дните на тримесечието', () => {
  it('трето тримесечие · юли 31 + август 31 + септември 30', () => {
    expect(kolkoSeVizhdat('trimesechie', DNES)).toBe(92);
  });

  it('първо тримесечие на невисокосна година · 90 дни', () => {
    expect(kolkoSeVizhdat('trimesechie', '2026-02-10')).toBe(90);
  });

  it('колоните почват от ПЪРВИЯ ден на тримесечие', () => {
    expect(koloniNaTakta('trimesechie', DNES)[0]!.ot).toBe('2026-04-01');
  });
});

describe('таванът · прозорец, не километър', () => {
  it('нито един такт не минава тавана', () => {
    for (const t of TAKTOVE) {
      if (t === 'svoy') continue;
      expect(koloniNaTakta(t, DNES).length, t).toBeLessThanOrEqual(NAY_MNOGO_KOLONI);
    }
  });

  it('при тримесечие таванът реже КРАЧКИ, не половин период', () => {
    // Пет крачки напред биха дали над петстотин колони. Реже се на цели
    // тримесечия: по-добре четири цели, отколкото пет и половина.
    const k = koloniNaTakta('trimesechie', DNES);
    expect(k[0]!.ot).toBe('2026-04-01');
    // Краят пада на ГРАНИЦА на тримесечие · не по средата му.
    expect(['03-31', '06-30', '09-30', '12-31']).toContain(k[k.length - 1]!.do.slice(5));
    expect(k.length).toBe(365); // едно назад + три напред, вместо пет и половина
  });

  it('където таванът НЕ стиска, петте крачки на негово число остават', () => {
    // ден · 8 колони на крачка → 1 назад + 5 напред
    expect(koloniNaTakta('den', DNES)).toHaveLength(8 * (1 + KRATNOST_NA_OBHVATA));
    expect(koloniNaTakta('sedmitsa', DNES)).toHaveLength(7 * (1 + KRATNOST_NA_OBHVATA));
    expect(koloniNaTakta('godina', DNES)).toHaveLength(12 * (1 + KRATNOST_NA_OBHVATA));
  });
});

describe('своят такт · негов период от дата до дата', () => {
  it('показва ТОЧНО периода · без крачка назад и без пет напред', () => {
    const k = koloniNaTakta('svoy', DNES, { ot: '2026-08-01', do: '2026-08-10' });
    expect(k).toHaveLength(10);
    expect(k[0]!.ot).toBe('2026-08-01');
    expect(k[9]!.do).toBe('2026-08-10');
  });

  it('до едно тримесечие колоната е ДЕН · над него МЕСЕЦ', () => {
    expect(edinitsataNaSvoya({ ot: '2026-01-01', do: '2026-04-02' })).toBe('den');
    expect(NAY_MNOGO_DNI_ZA_DNEVNA_KOLONA).toBe(92);
    expect(edinitsataNaSvoya({ ot: '2026-01-01', do: '2026-12-31' })).toBe('mesets');
  });

  it('дълъг период дава МЕСЕЧНИ колони · дванайсет за година', () => {
    const k = koloniNaTakta('svoy', DNES, { ot: '2026-01-01', do: '2026-12-31' });
    expect(k).toHaveLength(12);
    expect(k[0]!.nadpis).toBe('яну 26');
  });

  it('обърнат или празен период НЕ хвърля · връща нищо', () => {
    expect(koloniNaTakta('svoy', DNES, { ot: '2026-12-31', do: '2026-01-01' })).toEqual([]);
    expect(koloniNaTakta('svoy', DNES)).toEqual([]);
    expect(kolkoSeVizhdat('svoy', DNES)).toBe(0);
  });

  it('днешната колона се БЕЛЯЗВА, ако денят пада в периода · и не, ако не пада', () => {
    const vatre = koloniNaTakta('svoy', DNES, { ot: '2026-08-20', do: '2026-08-30' });
    expect(vatre.filter((x) => x.dnes)).toHaveLength(1);
    const izvan = koloniNaTakta('svoy', DNES, { ot: '2020-01-01', do: '2020-01-10' });
    expect(izvan.filter((x) => x.dnes)).toHaveLength(0);
  });
});
