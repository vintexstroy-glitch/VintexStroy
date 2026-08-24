/**
 * ЗАДАЧИТЕ НА АГЕНТА · четирите разписания и потвърждението (И94 т.1).
 *
 * Пази думите му: „задачата може да е ВСЕКИДНЕВНА, СЕДМИЧНА, ЗА ОПРЕДЕЛЕН
 * СРОК. Има и ПОСТОЯННИ задачи с умения като длъжностната характеристика,
 * която не може да се изключи и включи и е НОРМА."
 */

import { describe, expect, it } from 'vitest';
import { napraviAgent, GreshkaAgent, type Agent } from '../src/domein/agenti.js';
import {
  IMENA_NA_RAZPISANIYATA,
  RAZPISANIYA,
  UMENIYA_NA_ZADACHA,
  denOtSedmitsata,
  ePostoyanna,
  napraviZadacha,
  pokazateliNaZadachite,
  potvardiZadacha,
  prevklyuchiZadacha,
  sDumiRazpisanie,
  sePadaDnes,
  type Zadacha,
} from '../src/domein/zadachi.js';

const SCHETOVODITEL: Agent = napraviAgent({
  klyuch: 'schetovoditel',
  ime: 'Счетоводителят',
  otgovornik: 'ivaylo85petkov@gmail.com',
  harakteristika: 'Сверява ДДС и следи за разминавания.',
  obhvat: ['smetki', 'pari'],
  zabrani: ['не вижда Управление', 'не пише в Журнала'],
  umeniya: [
    { ime: 'matematika', tekst: 'матрици, данни и проверки' },
    { ime: 'masterbook-data', tekst: 'домейнът на приложението' },
    { ime: 'doklad', tekst: 'състоянието в проценти' },
  ],
});

function zadacha(n: Partial<Parameters<typeof napraviZadacha>[1]> = {}): Zadacha {
  return napraviZadacha(SCHETOVODITEL, {
    id: 'z1',
    kakvo: 'сверѝ ДДС за август',
    razpisanie: 'vsekidnevna',
    umeniya: ['matematika', 'masterbook-data', 'doklad'],
    kogato: '2026-08-24T09:00:00.000Z',
    ...n,
  });
}

describe('четирите разписания', () => {
  it('са изброени ПОИМЕННО и всяко има име на български', () => {
    expect([...RAZPISANIYA]).toEqual(['vsekidnevna', 'sedmichna', 'srok', 'postoyanna']);
    for (const r of RAZPISANIYA) expect(IMENA_NA_RAZPISANIYATA[r]).not.toBe('');
  });

  it('измисленото разписание се отказва С ДУМИ', () => {
    expect(() => zadacha({ razpisanie: 'mesechna' as never })).toThrow(GreshkaAgent);
    expect(() => zadacha({ razpisanie: 'mesechna' as never })).toThrow(/Няма такова разписание/);
  });

  it('само „postoyanna" е норма', () => {
    expect(ePostoyanna('postoyanna')).toBe(true);
    for (const r of RAZPISANIYA.filter((x) => x !== 'postoyanna')) {
      expect(ePostoyanna(r), r).toBe(false);
    }
  });
});

describe('какво иска всяко разписание', () => {
  it('седмичната иска ден от 1 до 7', () => {
    expect(() => zadacha({ razpisanie: 'sedmichna', denOtSedmitsata: 0 })).toThrow(/от 1/);
    expect(() => zadacha({ razpisanie: 'sedmichna', denOtSedmitsata: 8 })).toThrow(/до 7/);
    expect(zadacha({ razpisanie: 'sedmichna', denOtSedmitsata: 3 }).denOtSedmitsata).toBe(3);
  });

  it('срокът иска И начало, И край — иначе е дума', () => {
    expect(() => zadacha({ razpisanie: 'srok', ot: '2026-09-01' })).toThrow(/и начало, и край/);
    expect(() => zadacha({ razpisanie: 'srok', do: '2026-09-30' })).toThrow(/и начало, и край/);
  });

  it('краят преди началото се отказва', () => {
    expect(() => zadacha({ razpisanie: 'srok', ot: '2026-09-30', do: '2026-09-01' })).toThrow(
      /не може да е преди/,
    );
  });

  it('празната задача се отказва — не се знае КАКВО да провери', () => {
    expect(() => zadacha({ kakvo: '   ' })).toThrow(/КАКВО/);
  });
});

describe('правило 25 · три умения на ЗАДАЧАТА', () => {
  it('точно три, не две и не четири', () => {
    expect(UMENIYA_NA_ZADACHA).toBe(3);
    expect(() => zadacha({ umeniya: ['matematika', 'doklad'] })).toThrow(/ТРИ умения/);
    expect(() =>
      zadacha({ umeniya: ['matematika', 'doklad', 'masterbook-data', 'harakteristika'] }),
    ).toThrow(/ТРИ умения/);
  });

  it('изключеното умение НЕ се избира за задача', () => {
    const bez = {
      ...SCHETOVODITEL,
      umeniya: SCHETOVODITEL.umeniya.map((u) =>
        u.klyuch === 'doklad' ? { ...u, vklyucheno: false } : u,
      ),
    };
    expect(() =>
      napraviZadacha(bez, {
        id: 'z2',
        kakvo: 'нещо',
        razpisanie: 'vsekidnevna',
        umeniya: ['matematika', 'masterbook-data', 'doklad'],
        kogato: '2026-08-24T09:00:00.000Z',
      }),
    ).toThrow(/ИЗКЛЮЧЕНО/);
  });
});

describe('потвърждението пуска задачата', () => {
  it('новата се ражда НЕПОТВЪРДЕНА и не се пада на никой ден', () => {
    const z = zadacha();
    expect(z.potvardena).toBe(false);
    expect(sePadaDnes(z, '2026-08-24')).toBe(false);
  });

  it('потвърдената всекидневна се пада всеки ден', () => {
    const z = potvardiZadacha(zadacha());
    expect(sePadaDnes(z, '2026-08-24')).toBe(true);
    expect(sePadaDnes(z, '2027-01-01')).toBe(true);
  });

  it('изключената не се пада, дори потвърдена', () => {
    const z = prevklyuchiZadacha(potvardiZadacha(zadacha()), false);
    expect(sePadaDnes(z, '2026-08-24')).toBe(false);
  });
});

describe('кой ден се пада', () => {
  it('ISO денят: 24.08.2026 е понеделник', () => {
    expect(denOtSedmitsata('2026-08-24')).toBe(1);
    expect(denOtSedmitsata('2026-08-30')).toBe(7);
  });

  it('седмичната се пада само на своя ден', () => {
    const z = potvardiZadacha(zadacha({ razpisanie: 'sedmichna', denOtSedmitsata: 1 }));
    expect(sePadaDnes(z, '2026-08-24')).toBe(true);
    expect(sePadaDnes(z, '2026-08-25')).toBe(false);
  });

  it('срокът включва двата си края', () => {
    const z = potvardiZadacha(
      zadacha({ razpisanie: 'srok', ot: '2026-09-01', do: '2026-09-30' }),
    );
    expect(sePadaDnes(z, '2026-08-31')).toBe(false);
    expect(sePadaDnes(z, '2026-09-01')).toBe(true);
    expect(sePadaDnes(z, '2026-09-30')).toBe(true);
    expect(sePadaDnes(z, '2026-10-01')).toBe(false);
  });
});

describe('ПОСТОЯННАТА е норма, не поръчка', () => {
  it('ражда се включена и не се изключва — отказът е С ДУМИ', () => {
    const z = potvardiZadacha(zadacha({ razpisanie: 'postoyanna' }));
    expect(z.vklyuchena).toBe(true);
    expect(() => prevklyuchiZadacha(z, false)).toThrow(GreshkaAgent);
    expect(() => prevklyuchiZadacha(z, false)).toThrow(/ПОСТОЯННА/);
  });

  it('не се и ВКЛЮЧВА повторно — бутон, който винаги отказва, няма работа', () => {
    const z = potvardiZadacha(zadacha({ razpisanie: 'postoyanna' }));
    expect(() => prevklyuchiZadacha(z, true)).toThrow(/норма/);
  });

  it('потвърдената постоянна се пада ВСЕКИ ден', () => {
    const z = potvardiZadacha(zadacha({ razpisanie: 'postoyanna' }));
    expect(sePadaDnes(z, '2026-08-24')).toBe(true);
    expect(sePadaDnes(z, '2030-12-31')).toBe(true);
  });
});

describe('думите за екрана', () => {
  it('всяко разписание се казва с думи, и седмичната назовава деня', () => {
    expect(sDumiRazpisanie(zadacha())).toBe('всеки ден');
    expect(sDumiRazpisanie(zadacha({ razpisanie: 'sedmichna', denOtSedmitsata: 3 }))).toContain(
      'сряда',
    );
    expect(sDumiRazpisanie(zadacha({ razpisanie: 'postoyanna' }))).toContain('норма');
    expect(
      sDumiRazpisanie(zadacha({ razpisanie: 'srok', ot: '2026-09-01', do: '2026-09-30' })),
    ).toBe('2026-09-01 → 2026-09-30');
  });
});

describe('показателите се БРОЯТ (правило 17)', () => {
  it('всички · потвърдени · днес · постоянни', () => {
    const spisak = [
      zadacha({ id: 'a' }),
      potvardiZadacha(zadacha({ id: 'b' })),
      potvardiZadacha(zadacha({ id: 'v', razpisanie: 'postoyanna' })),
      potvardiZadacha(zadacha({ id: 'g', razpisanie: 'sedmichna', denOtSedmitsata: 5 })),
    ];
    const p = pokazateliNaZadachite(spisak, '2026-08-24');
    expect(p.vsichki).toBe(4);
    expect(p.potvardeni).toBe(3);
    // Непотвърдената пада; петъчната не е понеделник; остават две.
    expect(p.dnes).toBe(2);
    expect(p.postoyanni).toBe(1);
  });
});
