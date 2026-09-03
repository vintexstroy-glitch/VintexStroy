import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  IMENA_NA_OTSENKITE,
  OTSENKI,
  prevediOtsenkata,
  proveriOtsenkata,
  TEZHEST,
  ZAVARSHENO,
} from '../src/domein/dela.js';

/**
 * ОЦЕНКАТА Е ИЗБОР, НЕ СЪБИТИЕ (резен 105 · ADR-168).
 *
 * Негово, 02.09 (И131 т.3): „Оценката е Спешно и Важно, а Състояние и Статут е
 * едно и стщо ползвай Състояние. **Оценката не е събитие а избор.**"
 *
 * Този файл не строи нищо ново — той ЗАКОВАВА построеното, за да не се върне
 * предложението „ОценкаЗаписана" през задната врата. Проверките се четат от
 * ИЗВОРА (както `tests/sabitiyata.test.ts`), защото правилото е за формата на
 * кода, не за поведението му при едно извикване.
 */
const SABITIYA = readFileSync('src/domein/sabitiya.ts', 'utf8');
const STOYNOST = readFileSync('app/stoynost.ts', 'utf8');

/** Имената от съюза `TipSabitie`, извадени от самия извор. */
function vidoveOtSayuza(): string[] {
  const nachalo = SABITIYA.indexOf('export type TipSabitie =');
  const kray = SABITIYA.indexOf(';', nachalo);
  return [...SABITIYA.slice(nachalo, kray).matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe('оценката е ИЗБОР · четирите квадранта', () => {
  it('четири са, и „Спешно и Важно" е първото', () => {
    expect(OTSENKI).toHaveLength(4);
    expect(OTSENKI[0]).toBe('спешно-важно');
    expect(IMENA_NA_OTSENKITE['спешно-важно']).toBe('Спешно и Важно');
    expect(TEZHEST['спешно-важно']).toBe(0);
  });

  it('НЯМА вид събитие за оценка · тя пътува като ПОЛЕ на делото', () => {
    // Предложението „ОценкаЗаписана" падна още в ADR-153 §2 т.6 — то беше
    // текст на доклад, не негова дума. Пази се тук, за да не се върне.
    const sasDumata = vidoveOtSayuza().filter((v) => /оценка/i.test(v));
    expect(sasDumata).toEqual([]);
    expect(SABITIYA).toContain('readonly otsenka: string;');
  });

  it('и делото, и преписката носят СЪЩАТА оценка · един избор, две същности', () => {
    const broy = [...SABITIYA.matchAll(/readonly otsenka: string;/g)].length;
    expect(broy).toBeGreaterThanOrEqual(2);
  });

  it('името на завършеното е ЗАКОВАНО · старите Журнали го носят като оценка', () => {
    // Пин с ръка: тази дума е и СЪСТОЯНИЕ, и старата пета ОЦЕНКА в Журнали
    // отпреди ADR-122. Смени ли се низът, поименният превод спира да намира
    // старите записи — тихо, защото те просто ще паднат в „без оценка".
    expect(ZAVARSHENO).toBe('завършено');
  });

  it('завършеното е БЕЗ оценка · изборът, който не действа, се изключва', () => {
    expect(prevediOtsenkata('спешно-важно', ZAVARSHENO).otsenka).toBe('');
    expect(prevediOtsenkata(ZAVARSHENO, 'чака')).toEqual({
      otsenka: '',
      sastoyanie: ZAVARSHENO,
    });
    expect(proveriOtsenkata('спешно-важно', ZAVARSHENO)).toBe('');
  });

  it('свободна дума се ОТКАЗВА · Журналът не приема измислена оценка', () => {
    expect(proveriOtsenkata('много-спешно', 'чака')).not.toBe('');
  });
});

describe('Калкулаторът СМЯТА и ПОКАЗВА · не редактира (р57·[199])', () => {
  it('екранът Стойност НЕ пише стойност върху Имота', () => {
    // Негово, 09.08: „казва се Стойност на Състояние и НЯМА РЕДАКЦИЯ ОТ ТАМ, а
    // само изчисляане на стойност на имотите като оценка на всички наши
    // активи." Другите му по-късни думи добавиха тук два пътя за писане —
    // „Продаден" (29.08) и „създай сграда" (ADR-089), — но СТОЙНОСТТА на Имота
    // не е сред тях и не бива да стане: там числото се вписва от формата.
    expect(STOYNOST).not.toContain('zapishiMyasto');
  });

  it('но СРАВНЯВА сметнатото с вписаното · това е сметка, не редакция', () => {
    expect(STOYNOST).toContain('data-sektsiya="stoynost-sravnenie"');
    expect(STOYNOST).toContain('data-razlika=');
  });
});
