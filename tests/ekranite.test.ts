/**
 * РЕГИСТЪРЪТ НА ЕКРАНИТЕ · един екран, един дом (правило 17 · ADR-041).
 *
 * Дотук един екран се знаеше на ШЕСТ места: съюза `KoyEkran`, картата с имена,
 * картата на възможностите, картата на ролите, тернарната верига за рисуване и
 * веригата от `else if` за закачането. Нов екран искаше шест пипвания, а
 * забравеното се откриваше едва когато някой натисне пункта.
 *
 * Тестът пази трите неща, които компилаторът НЕ може да провери сам.
 */

import { describe, expect, it } from 'vitest';
import { EKRANI } from '../app/ekranite.js';
import { imaIkona } from '../app/ikoni.js';

const KLYUCHOVE = Object.keys(EKRANI) as (keyof typeof EKRANI & string)[];

describe('регистърът на екраните', () => {
  it('всеки екран носи ЦЯЛОТО си описание', () => {
    for (const koy of KLYUCHOVE) {
      const e = EKRANI[koy];
      expect(e.ime, `${koy} · име`).toBeTruthy();
      expect(e.podnaslov, `${koy} · поднаслов`).toBeTruthy();
      // Иконата е ИМЕ от единствения си дом (ADR-045), не вграден път: дотук
      // всеки екран носеше свой SVG на място и двата регистъра се разминаваха
      // по стил. Тестът пита ЖИВИЯ регистър, не низа.
      expect(imaIkona(e.ikona), `${koy} · икона`).toBe(true);
      expect(typeof e.narisuvay, `${koy} · рисуване`).toBe('function');
      expect(typeof e.zakachi, `${koy} · закачане`).toBe('function');
    }
  });

  it('ТАБЛОТО не иска нито възможност, нито роля · то не бива да се самозаключи', () => {
    // Там се връща изключеното и там стои ключът на личното. Екран, който може
    // да се заключи сам, заключва и пътя обратно.
    expect(EKRANI.tablo.iska).toBeUndefined();
    expect(EKRANI.tablo.iskaRolya).toBeUndefined();
  });

  it('ИМОТИ не иска нищо · то е падането по подразбиране', () => {
    // Изключен екран връща на Имоти. Ако и Имоти можеше да се заключи,
    // падането щеше да води в цикъл или в празен екран.
    expect(EKRANI.imoti.iska).toBeUndefined();
    expect(EKRANI.imoti.iskaRolya).toBeUndefined();
  });

  it('ЛИЧНО не зависи от чужд достъп · само от собствения превключвател', () => {
    expect(EKRANI.lichno.iska).toBeUndefined();
    expect(EKRANI.lichno.iskaRolya).toBeUndefined();
  });

  it('заключените по роля са ТОЧНО петте, изброени поименно', () => {
    // Четирите от И98 плюс ТАБОВЕ: негова дума от И101 — табове, таблици и
    // диаграми се създават и свързват само от Стопанина. Списъкът е поименен,
    // за да пада на глас, когато утре някой заключи пети екран мимоходом.
    const zaklyucheni = KLYUCHOVE.filter((k) => EKRANI[k].iskaRolya !== undefined).sort();
    expect(zaklyucheni).toEqual(['ii', 'nastroyki', 'smetki', 'stoynost', 'tabove']);
  });

  it('имената са РАЗЛИЧНИ · два пункта с едно име не се различават в лентата', () => {
    const imena = KLYUCHOVE.map((k) => EKRANI[k].ime);
    expect(new Set(imena).size).toBe(imena.length);
  });
});
