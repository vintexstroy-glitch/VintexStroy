/**
 * НАП · честният опис и празните кодове (резен 17 · И108 · И112).
 *
 * ЗАЩО ТОЗИ ТЕСТ СЪЩЕСТВУВА. Екранът показва ДОКЪДЕ е стигнала всяка типова
 * таблица с ТРИ думи: построено · частично · непостроено. Двустойностният опис
 * („построено / обявено") тук би лъгал — Дневникът за продажбите ГО ИМА, но
 * фактурата е ЕДИН ред, не ред по ред.
 *
 * Дума, която липсва, кара половината работа да мине за цяла. Затова описът е
 * ДАННА и се БРОИ оттук, вместо да се чете от разметка при рисуване.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { preborenoDokade, TIPOVITE_TABLITSI } from '../app/nap.js';
import {
  bezEIK,
  edinRedZaImeto,
  IZVAN_PROGRAMATA,
  KAKVO_NE_VLIZA,
  KAKVO_VLIZA_V_FAYLA,
  preborenoPoVid,
  type ImeVFayla,
} from '../src/domein/nap-dostap.js';
import { SMETKOPLAN } from '../src/domein/glavna-kniga.js';
import { SHEMA } from '../src/iznos/saf-t-shema.js';

describe('честният опис · три думи, не две', () => {
  it('всяка типова таблица носи име, състояние и ИЗРЕЧЕНИЕ', () => {
    expect(TIPOVITE_TABLITSI.length).toBeGreaterThan(0);
    for (const t of TIPOVITE_TABLITSI) {
      expect(t.ime.trim()).not.toBe('');
      // Изречение, не етикет: „частично" без какво точно липсва е надпис.
      expect(t.kakvo.length).toBeGreaterThan(30);
    }
  });

  it('и ТРИТЕ състояния наистина се ползват', () => {
    const b = preborenoDokade();
    expect(b.postroeno).toBeGreaterThan(0);
    expect(b.chastichno).toBeGreaterThan(0);
    expect(b.nepostroeno).toBeGreaterThan(0);
  });

  it('сверка вход↔изход · сборът на трите е ЦЕЛИЯТ опис', () => {
    const b = preborenoDokade();
    expect(b.postroeno + b.chastichno + b.nepostroeno).toBe(TIPOVITE_TABLITSI.length);
  });

  /**
   * ЕДИНСТВЕНОТО „ПОСТРОЕНО" ДНЕС е одитният файл — и то с обявена граница:
   * не е проверен срещу самата XSD на НАП. Тестът пази точно това изречение,
   * защото без него „построено" би значело „готово за подаване".
   */
  it('построеното КАЗВА и границата си', () => {
    const gotovi = TIPOVITE_TABLITSI.filter((t) => t.dokade === 'postroeno');
    expect(gotovi).toHaveLength(1);
    expect(gotovi[0]!.ime).toContain('SAF-T');
    expect(gotovi[0]!.kakvo).toContain('XSD');
  });
});

describe('празните кодове · броят се, не се гадаят', () => {
  it('НИТО ЕДНА сметка още няма национален код', () => {
    const nemapnati = SMETKOPLAN.filter((s) => s.nra === '');
    expect(nemapnati).toHaveLength(SMETKOPLAN.length);
    expect(SMETKOPLAN).toHaveLength(13);
  });

  /**
   * ИЗМИСЛЕН КОД = ОТКАЗ ПЛЮС ГЛОБА. Затова празното е РЕШЕНИЕ, не пропуск, и
   * схемата го обявява като пречка, вместо да мълчи.
   */
  it('и схемата го КАЗВА като пречка, докато номенклатурите не са свалени', () => {
    expect(SHEMA.nomenklaturiteSaSvaleni).toBe(false);
  });

  it('екранът брои сметките, вместо да ги преписва', () => {
    const izvor = readFileSync('app/nap.ts', 'utf8');
    expect(izvor).toContain("SMETKOPLAN.filter((s) => s.nra === '')");
    expect(izvor).toContain('data-broi-kodove');
    // И казва ЗАЩО стоят празни — числото без причина е обвинение, не обяснение.
    expect(izvor).toContain('чл. 277а');
  });
});

/**
 * НУЛА ПЪТ КЪМ ВРАТАТА · екранът ЧЕТЕ и СВАЛЯ.
 *
 * Това не е стил, а свойството, което прави активирането безопасно: дори
 * служител с достъп до екрана не може да напише нищо в Журнала оттам.
 */
describe('екранът НЯМА път към Вратата', () => {
  const IZVOR = readFileSync('app/nap.ts', 'utf8');

  it('не вика нито едно действие, което пише', () => {
    // Единственото повикване към Действията е `ogledalo()` — четене.
    const kam = [...IZVOR.matchAll(/deystviya\.(\w+)/g)].map((m) => m[1]);
    expect([...new Set(kam)]).toEqual(['ogledalo']);
  });

  it('и не внася Вратата', () => {
    expect(IZVOR).not.toContain('vrata');
  });
});

/**
 * КАКВО НАПУСКА УСТРОЙСТВОТО · трите списъка са ДАННА, не разметка.
 *
 * ADR-030 §4 закова, че имена на наематели и доставчици не напускат
 * устройството. Одитният файл е ИЗРИЧНОТО изключение — и точно затова описът му
 * се брои оттук: списък, който живее в разметка, се разкрасява при рисуване.
 */
describe('какво напуска устройството · поименно, не с категории', () => {
  it('трите списъка са пълни и всеки ред е ИЗРЕЧЕНИЕ, не етикет', () => {
    for (const spisak of [KAKVO_VLIZA_V_FAYLA, KAKVO_NE_VLIZA, IZVAN_PROGRAMATA]) {
      expect(spisak.length).toBeGreaterThan(2);
      for (const red of spisak) expect(red.length).toBeGreaterThan(25);
    }
  });

  /**
   * ОТРИЦАТЕЛНИЯТ СПИСЪК НЕ Е УКРАСА. Без него положителният се чете като
   * „и вероятно още нещо" — а границата на ADR-030 §4 иска точно обратното.
   */
  it('казва се и какво НЕ влиза · включително самият Журнал', () => {
    expect(KAKVO_NE_VLIZA.join(' ')).toContain('Журнал');
    expect(KAKVO_NE_VLIZA.join(' ')).toContain('лични');
  });

  it('и трите стъпки ИЗВЪН програмата са назовани · включително тестовото подаване', () => {
    const vsichko = IZVAN_PROGRAMATA.join(' ');
    expect(vsichko).toContain('portal.nra.bg');
    expect(vsichko).toContain('ТЕСТОВО');
  });

  const IMENA: readonly ImeVFayla[] = Object.freeze([
    { vid: 'firma', ime: 'ВинтексСтрой ЕООД', sEIK: true },
    { vid: 'klient', ime: 'Наемател Едно', sEIK: true },
    { vid: 'klient', ime: 'Наемател Две', sEIK: false },
    { vid: 'dostavchik', ime: 'Стройпласт ЕООД', sEIK: false },
  ]);

  it('сверка вход↔изход · сборът по вид Е целият списък', () => {
    const b = preborenoPoVid(IMENA);
    expect(b.firma + b.klient + b.dostavchik).toBe(IMENA.length);
    expect(b.klient).toBe(2);
  });

  it('непълните се отделят поименно, не само с бройка', () => {
    expect(bezEIK(IMENA).map((i) => i.ime)).toEqual(['Наемател Две', 'Стройпласт ЕООД']);
  });

  it('редът за едно име казва вида и дали ЕИК-ът липсва', () => {
    expect(edinRedZaImeto(IMENA[0]!)).toBe('ВинтексСтрой ЕООД · фирмата');
    expect(edinRedZaImeto(IMENA[3]!)).toBe('Стройпласт ЕООД · доставчик · БЕЗ ЕИК');
  });
});

/**
 * ДОСТЪПЪТ ЗА СЧЕТОВОДИТЕЛЯ · екранът е ЕДИН И СЪЩ за трите роли.
 *
 * Това не е пропуск, а следствие: тук няма нито един път към Вратата (пази го
 * описът по-горе), значи гате по роля би бил НАДПИС — а надпис, взет за защита,
 * е по-опасен от липсата ѝ (ADR-041 · ADR-050). Тестът пази, че такъв надпис не
 * се появява по-късно „за всеки случай".
 */
describe('достъпът за счетоводителя · без измислена четвърта роля', () => {
  const IZVOR = readFileSync('app/nap.ts', 'utf8');

  it('екранът НЕ се разклонява по роля', () => {
    expect(IZVOR).not.toContain('rolya');
    expect(IZVOR).not.toContain('sobstvenik');
  });

  it('но КАЗВА защо · и сочи къде се записва човекът', () => {
    expect(IZVOR).toContain('правило 14');
    expect(IZVOR).toContain('Служители');
  });

  it('и трите стъпки навън стигат до екрана от ЕДИН дом', () => {
    expect(IZVOR).toContain('IZVAN_PROGRAMATA');
    // Преписани в разметката, те щяха да остареят при първата промяна.
    for (const stapka of IZVAN_PROGRAMATA) expect(IZVOR).not.toContain(stapka);
  });
});
