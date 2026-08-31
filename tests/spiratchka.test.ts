/**
 * ЧЕСТНАТА СПИРАЧКА · заявка за плана и проверка на драйва (резен Д).
 *
 * Седемте обещания:
 *
 *   1. Видът се МЕРИ от ТАВАНА, не от пълнотата · и не се пита човека.
 *   2. Безлимитният акаунт е ПЛАТЕН, не „не знам".
 *   3. „Не е питано" е СЪСТОЯНИЕ, не „не стига" · тишината не е отказ.
 *   4. Двата отказа НЕ се смесват — видът и мястото се лекуват различно.
 *   5. „Тясно" светва ПРЕДИ да е станало късно.
 *   6. Всяка оценка си има ДУМИ, и те казват накъде да се тръгне.
 *   7. Спирачката НЕ Е КЛЮЧАЛКА — тя само предупреждава, и това е измеримо.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BEZPLATEN_TAVAN_BAYTOVE,
  GreshkaSpiratchka,
  presmetni,
  sDumi,
  svobodnoto,
  trebvaLiDaSePredupredi,
  TYASNO_DEL,
  planoveSPlatenOblak,
  vidNaHranilishteto,
} from '../src/domein/spiratchka.js';
import { PLANOVE, plan } from '../src/domein/planove.js';

const GB = 1024 * 1024 * 1024;
const LICHEN = plan('lichen-lokalno');
const PROFESIONALEN = plan('profesionalen');

/**
 * ПЛАН, КОЙТО ИСКА ПЛАТЕН ОБЛАК · измислен ТУК, защото днес такъв НЯМА.
 *
 * Механизмът се проверява със свой план, не с истински: истинските четири не
 * искат платено хранилище и никога няма да минат по този клон. Тест, който би
 * го „проверил" с тях, щеше да зелени завинаги и да не мери нищо.
 */
const ISKA_PLATEN = { ...PROFESIONALEN, iskaPlatenOblak: true };

describe('видът се МЕРИ от тавана', () => {
  it('1 · пълнотата НЕ решава · таванът решава', () => {
    // пълен безплатен акаунт · пак безплатен
    expect(vidNaHranilishteto({ limit: 15 * GB, zaeto: 15 * GB })).toBe('безплатно');
    // почти празен платен акаунт · пак платен
    expect(vidNaHranilishteto({ limit: 2048 * GB, zaeto: 1 })).toBe('платено');
    expect(BEZPLATEN_TAVAN_BAYTOVE).toBe(15 * GB);
    // ТОЧНО на тавана още не е платено · прагът е „по-голямо от"
    expect(vidNaHranilishteto({ limit: 15 * GB, zaeto: 0 })).toBe('безплатно');
    expect(vidNaHranilishteto({ limit: 15 * GB + 1, zaeto: 0 })).toBe('платено');
  });

  it('2 · безлимитният акаунт е ПЛАТЕН, не „не знам"', () => {
    expect(vidNaHranilishteto({ limit: -1, zaeto: 900 * GB })).toBe('платено');
    // и свободното му не е нула · инак най-скъпият клиент щеше да е препълнен
    expect(svobodnoto({ limit: -1, zaeto: 900 * GB })).toBeGreaterThan(1000 * GB);
  });

  it('свободното е таван минус заето · и никога под нулата', () => {
    expect(svobodnoto({ limit: 10 * GB, zaeto: 4 * GB })).toBe(6 * GB);
    // преразход при доставчика се случва · отрицателно свободно няма
    expect(svobodnoto({ limit: 10 * GB, zaeto: 12 * GB })).toBe(0);
  });

  it('нечислов таван се отказва ГЛАСНО', () => {
    expect(() => vidNaHranilishteto({ limit: Number.NaN, zaeto: 0 })).toThrow(GreshkaSpiratchka);
    expect(() => presmetni({ plan: LICHEN, kvota: null, nuzhno: -1 })).toThrow(GreshkaSpiratchka);
  });
});

describe('трите изхода и двата отказа', () => {
  it('нито един ЖИВ план не иска платен облак · и това се БРОИ', () => {
    // `CLAUDE.md`: „Няма безплатен ПЛАН. Безплатен е АКАУНТЪТ."
    // Спирачката днес спира по ЕДНА ос — мястото. Другата е механизъм без
    // данни зад себе си, и точно това число го КАЗВА.
    expect(planoveSPlatenOblak(PLANOVE)).toEqual([]);
    expect(PLANOVE.length).toBe(4);
  });

  it('3 · „не е питано" е СЪСТОЯНИЕ, не „не стига"', () => {
    const p = presmetni({ plan: PROFESIONALEN, kvota: null, nuzhno: 5 * GB });
    expect(p.otsenka).toBe('ne e pitano');
    expect(p.vid).toBe('не е питано');
    // и НЕ предупреждава · тишината не е отказ (правило 15)
    expect(trebvaLiDaSePredupredi(p)).toBe(false);
    expect(sDumi(p)).toContain('не твърдим нищо');
  });

  it('4 · двата отказа не се смесват · видът и мястото се лекуват различно', () => {
    // МЯСТОТО не стига, но видът е наред
    const myasto = presmetni({
      plan: LICHEN,
      kvota: { limit: 15 * GB, zaeto: 14 * GB },
      nuzhno: 5 * GB,
    });
    expect(myasto.otsenka).toBe('ne stiga');
    expect(myasto.vidatStiga).toBe(true);
    expect(sDumi(myasto)).toContain('Изчисти');

    // ВИДЪТ не стига · планът иска платен облак, акаунтът е безплатен
    const vid = presmetni({
      plan: ISKA_PLATEN,
      kvota: { limit: 15 * GB, zaeto: 0 },
      nuzhno: 1,
    });
    expect(vid.vidatStiga).toBe(false);
    expect(vid.otsenka).toBe('ne stiga');
    expect(sDumi(vid)).toContain('ПЛАТЕН акаунт');
    // и КАЗВА къде се купува · не при нас (правило 14)
    expect(sDumi(vid)).toContain('не при нас');
    // двете изречения СА РАЗЛИЧНИ · инак човек не знае накъде да тръгне
    expect(sDumi(vid)).not.toBe(sDumi(myasto));
  });

  it('5 · „тясно" светва ПРЕДИ да е станало късно', () => {
    expect(TYASNO_DEL).toBe(5);
    const nuzhno = 1 * GB;
    // място за 20 пъти повече · спокойно
    expect(
      presmetni({ plan: LICHEN, kvota: { limit: 100 * GB, zaeto: 80 * GB }, nuzhno }).otsenka,
    ).toBe('stiga');
    // място за ТРИ пъти повече · още стига, но вече е тясно
    expect(
      presmetni({ plan: LICHEN, kvota: { limit: 100 * GB, zaeto: 97 * GB }, nuzhno }).otsenka,
    ).toBe('tyasno');
    // и точно на границата · пет пъти нужното още е „стига"
    expect(
      presmetni({ plan: LICHEN, kvota: { limit: 5 * GB, zaeto: 0 }, nuzhno }).otsenka,
    ).toBe('stiga');
  });

  it('6 · всяка от четирите оценки си има СВОИ думи', () => {
    const dumi = [
      sDumi(presmetni({ plan: LICHEN, kvota: null, nuzhno: 1 })),
      sDumi(presmetni({ plan: LICHEN, kvota: { limit: 100 * GB, zaeto: 0 }, nuzhno: 1 })),
      sDumi(presmetni({ plan: LICHEN, kvota: { limit: 5 * GB, zaeto: 4 * GB }, nuzhno: 1 * GB })),
      sDumi(presmetni({ plan: LICHEN, kvota: { limit: 1 * GB, zaeto: 1 * GB }, nuzhno: 1 * GB })),
    ];
    expect(new Set(dumi).size).toBe(4);
    expect(dumi.every((d) => d.length > 20)).toBe(true);
  });
});

describe('спирачка, НЕ ключалка', () => {
  it('7 · предупреждава при „тясно" и „не стига" · и при нищо друго', () => {
    const kvota = (zaeto: number) => ({ limit: 100 * GB, zaeto });
    expect(trebvaLiDaSePredupredi(presmetni({ plan: LICHEN, kvota: kvota(0), nuzhno: 1 * GB }))).toBe(
      false,
    );
    expect(
      trebvaLiDaSePredupredi(presmetni({ plan: LICHEN, kvota: kvota(97 * GB), nuzhno: 1 * GB })),
    ).toBe(true);
    expect(
      trebvaLiDaSePredupredi(presmetni({ plan: LICHEN, kvota: kvota(100 * GB), nuzhno: 1 * GB })),
    ).toBe(true);
  });

  /**
   * И ТОВА НЕ Е ДУМА, А МЯРКА.
   *
   * Правилото казва „спирачка, не ключалка". Обещание, пазено само от изречение
   * в шапката, се губи при първата „дребна" поправка, която добавя `throw`.
   * Затова се БРОИ: в целия модул няма нито едно хвърляне заради МЯСТО или ВИД —
   * единствените откази са за нечислов вход, тоест за счупено ПОВИКВАНЕ.
   */
  it('в модула няма нито едно хвърляне заради място или вид · БРОИ се', () => {
    const izvor = readFileSync('src/domein/spiratchka.ts', 'utf8');
    const hvarlyaniya = izvor.match(/throw new GreshkaSpiratchka\([^)]*/g) ?? [];
    expect(hvarlyaniya).toHaveLength(2);
    for (const h of hvarlyaniya) {
      // и двете са за СЧУПЕН ВХОД, не за преценка
      expect(h).toMatch(/получено:/);
    }
    // нито едно `throw` заради оценката
    expect(izvor).not.toMatch(/otsenka === '(ne stiga|tyasno)'[^;]*throw/);
  });
});
