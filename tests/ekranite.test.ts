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
import { EKRANI, REDAT_NA_LENTATA } from '../app/ekranite.js';
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

  it('ЛИЧНО е САМО ЗА СЛУЖИТЕЛ · Стопанинът няма личен таб (ADR-154)', () => {
    // И131 т.1, дословно: „Стопанина ням,а опция за личен. Служителя има опция да
    // активира личен таб от таб Профил." Пинът е поименен: ако утре втори екран
    // стане „само за служител", да падне на глас, не мимоходом.
    expect(EKRANI.lichno.samoZaSluzhitel).toBe(true);
    const samoZaSluzhitel = KLYUCHOVE.filter((k) => EKRANI[k].samoZaSluzhitel).sort();
    expect(samoZaSluzhitel).toEqual(['lichno']);
  });

  it('заключените по роля са ТОЧНО четирите, изброени поименно', () => {
    // Трите от И98 плюс ТАБОВЕ: негова дума от И101 — табове, таблици и
    // диаграми се създават и свързват само от Стопанина. Списъкът е поименен,
    // за да пада на глас, когато утре някой заключи пети екран мимоходом.
    // НАСТРОЙКИ излезе оттук с резен 83 (И121 т.1): служителят влиза и вижда
    // СВОИТЕ секции — правото слезе на секцията (`vizhdaSektsiyata`), точно
    // както възможността слезе на темата (резен 18).
    const zaklyucheni = KLYUCHOVE.filter((k) => EKRANI[k].iskaRolya !== undefined).sort();
    expect(zaklyucheni).toEqual(['ii', 'smetki', 'stoynost', 'tabove']);
    expect(EKRANI.nastroyki.iskaRolya).toBeUndefined();
  });

  it('имената са РАЗЛИЧНИ · два пункта с едно име не се различават в лентата', () => {
    const imena = KLYUCHOVE.map((k) => EKRANI[k].ime);
    expect(new Set(imena).size).toBe(imena.length);
  });

  it('НАЧАЛНИЯТ ред на лентата покрива регистъра едно към едно', () => {
    // Списък с дупка значи екран, който го има в регистъра и го няма в
    // лентата — тих пропуск; излишен ключ значи пункт към нищото.
    expect([...REDAT_NA_LENTATA].sort()).toEqual([...KLYUCHOVE].sort());
    expect(new Set(REDAT_NA_LENTATA).size).toBe(REDAT_NA_LENTATA.length);
  });

  it('редът е НЕГОВОТО разпределение · закован поименно (И125 · резен 85)', () => {
    // Таблото първо (файлът му почва с двете табла · р48·[37]); Плащания
    // Архив СЛЕД Продажби (р52·[288]); вторият ред — Контакти и Стойност
    // (Цени), с Настройки НАКРАЯ (р52·[206]). Пада на глас при разместване.
    expect(REDAT_NA_LENTATA).toEqual([
      'tablo', 'imoti', 'pari', 'smetki', 'gant', 'prodazhbi', 'plashtaniya',
      'kontakti', 'stoynost', 'sluzhiteli', 'tabove', 'ii', 'lichno', 'nastroyki',
    ]);
  });
});
