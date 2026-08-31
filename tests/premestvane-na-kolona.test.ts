/**
 * ПРЕМЕСТВАНЕ НА КОЛОНА · инвариантите на резен 55 (M15).
 *
 * Всеки от тях е бил СЧУПЕН нарочно, преди да влезе.
 */
import { describe, expect, it } from 'vitest';
import {
  GreshkaPremestvane,
  NE_SOCHAT_KOLONA,
  POLETA_NA_MODELA,
  premestiKolona,
  SOCHAT_KOLONA,
  sveriPremestvaneto,
} from '../src/domein/premestvane-na-kolona.js';
import type { ModelNaTablitsa } from '../src/iztochnik/model.js';

const KOGATO = '2026-08-31T09:00:00.000Z';

/**
 * Модел, в който всяко от деветте места има поне ЕДИН индекс, който МЪРДА.
 *
 * Първото писане сложи `zatvoreni: [3]`, `otVavezhdane: [3]` и формула на
 * колона 3 — а при местенето 2→0 колона 3 си стои. Нарочното счупване „не
 * пренасяй затворените" мина ЗЕЛЕНО: данни, които не мърдат, не доказват
 * местене. Същата дупка като при „цяло число", проверено с точно деление.
 */
function model(): ModelNaTablitsa {
  return {
    klyuch: 'Проба',
    redNaGlavata: 0,
    koloni: { data: 0, opis: 1, suma: 2 },
    izklyucheni: [2],
    zatvoreni: [0, 3],
    glavi: ['Дата', 'Описание', 'Сума', 'Сметка'],
    otpechatak: 'дата|описание|сума|сметка',
    menyuta: { 1: ['наем', 'ремонт'] },
    otVavezhdane: [1, 3],
    zaklyucheni: [0],
    predishni: ['стар|отпечатък'],
    vidove: { 2: 'evro', 3: 'tekst' },
    formuli: { 1: { deystvie: 'sbor', ot: [2, 0] }, 3: { deystvie: 'sbor', ot: [0] } },
    nomera: { 2: 7 },
  } as unknown as ModelNaTablitsa;
}

describe('списъкът е МАШИНА, не обещание', () => {
  // ЗАЩО ТОЗИ ТЕСТ. Утре моделът ще получи десето поле по колона, и онзи, който
  // го добави, няма да знае за този файл. Ново, некласирано поле пада ТУК —
  // вместо да замълчи и да остави колоната да носи чужда стойност.
  it('всяко поле на модела е класирано · сочи колона или не', () => {
    const zhivi = Object.keys(model());
    const neklasirani = zhivi.filter((k) => !POLETA_NA_MODELA.includes(k));
    expect(neklasirani, 'нови полета, които никой не е класирал').toEqual([]);
  });

  it('и нито едно не стои в ДВАТА списъка', () => {
    expect(SOCHAT_KOLONA.filter((k) => (NE_SOCHAT_KOLONA as readonly string[]).includes(k))).toEqual(
      [],
    );
  });

  it('деветте, които сочат колона, са изброени ПОИМЕННО', () => {
    expect([...SOCHAT_KOLONA].sort()).toEqual(
      [
        'formuli',
        'glavi',
        'izklyucheni',
        'koloni',
        'menyuta',
        'nomera',
        'otVavezhdane',
        'vidove',
        'zaklyucheni',
        'zatvoreni',
      ].sort(),
    );
  });
});

describe('местенето пренася ВСИЧКО заедно с колоната', () => {
  // „Сума" (2) отива най-отпред → 0; „Дата" 0→1, „Описание" 1→2, „Сметка" 3 стои.
  const sled = premestiKolona(model(), 2, 0);

  it('заглавията се разместват', () => {
    expect(sled.glavi).toEqual(['Сума', 'Дата', 'Описание', 'Сметка']);
  });

  it('ролите сочат новите номера · стойността е индекс, не ключ', () => {
    expect(sled.koloni).toEqual({ data: 1, opis: 2, suma: 0 });
  });

  it('списъците от индекси се пренасят', () => {
    expect(sled.izklyucheni).toEqual([0]); // беше 2
    expect(sled.zatvoreni).toEqual([1, 3]); // 0→1 · 3 стои
    expect(sled.otVavezhdane).toEqual([2, 3]); // 1→2 · 3 стои
    expect(sled.zaklyucheni).toEqual([1]); // беше 0
  });

  it('картите по ключ се пренасят', () => {
    expect(sled.menyuta).toEqual({ 2: ['наем', 'ремонт'] });
    expect(sled.vidove).toEqual({ 0: 'evro', 3: 'tekst' });
    expect(sled.nomera).toEqual({ 0: 7 }); // ключът мърда, СТОЙНОСТТА 7 не
  });

  // САМО КЛЮЧЪТ БИ ПРЕМЕСТИЛ СМЕТКАТА, но щеше да я остави да събира СТАРИТЕ
  // номера — тоест чужди числа под правилното име. Най-тихата от всички повреди.
  it('формулата пренася И ключа, И операндите вътре', () => {
    expect(sled.formuli).toEqual({
      2: { deystvie: 'sbor', ot: [0, 1] }, // ключът 1→2 · операндите 2→0 и 0→1
      3: { deystvie: 'sbor', ot: [1] },
    });
  });
});

describe('отпечатъкът се сменя · и старият се ПАЗИ', () => {
  it('новият отпечатък е новият ред на заглавията', () => {
    expect(premestiKolona(model(), 2, 0).otpechatak).toBe('сума|дата|описание|сметка');
  });

  // БЕЗ ТОВА вчерашният файл спира да се познава и минава за чужд.
  it('старият влиза в предишните · списъкът само расте', () => {
    const sled = premestiKolona(model(), 2, 0);
    expect(sled.predishni).toEqual(['стар|отпечатък', 'дата|описание|сума|сметка']);
  });
});

describe('границите · и отказът с ДУМИ', () => {
  it('колона извън таблицата', () => {
    expect(() => premestiKolona(model(), 4, 0)).toThrow(GreshkaPremestvane);
    expect(() => premestiKolona(model(), -1, 0)).toThrow(/Няма колона/);
  });

  it('място извън таблицата · и КАЗВА колко са', () => {
    expect(() => premestiKolona(model(), 0, 9)).toThrow(/има 4 колони/);
  });

  it('на СВОЕТО място е нула работа, не грешка', () => {
    const m = model();
    expect(premestiKolona(m, 2, 2)).toBe(m);
  });

  it('и обратното местене връща същото · отпечатъкът е единственото, което расте', () => {
    const m = model();
    const tam = premestiKolona(m, 2, 0);
    const obratno = premestiKolona(tam, 0, 2);
    expect(obratno.glavi).toEqual(m.glavi);
    expect(obratno.koloni).toEqual(m.koloni);
    expect(obratno.formuli).toEqual(m.formuli);
    expect(obratno.otpechatak).toBe(m.otpechatak);
    expect(obratno.predishni).toHaveLength(3);
  });
});

describe('сверката вход↔изход · и нулата се записва', () => {
  it('местенето не губи и не ражда нито един запис', () => {
    const m = model();
    const s = sveriPremestvaneto(m, premestiKolona(m, 2, 0), KOGATO);
    expect(s).toHaveLength(10);
    for (const red of s) expect(red.razlika, red.kakvo).toBe(0);
  });

  it('а изгубен запис я СВЕТВА · инак сверката е украса', () => {
    const m = model();
    const oshtetena = { ...premestiKolona(m, 2, 0), zaklyucheni: [] };
    const s = sveriPremestvaneto(m, oshtetena as ModelNaTablitsa, KOGATO);
    expect(s.find((x) => x.kakvo === 'заключени')?.razlika).toBe(-1);
  });
});
