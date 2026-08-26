/**
 * ТЕМАТИЧНИТЕ ИКОНИ · знакът до всяко управление (И101 т.2 · ADR-045).
 *
 * Иконата е удобство и затова се проваля тихо: липсващият знак не хвърля, а
 * просто го няма. Точно затова ѝ трябва тест — тихият провал не се вижда на
 * екрана, вижда се като „защо тук няма икона, а там има".
 */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { butonSIkona, dyalglavaSIkona, ikona, IKONI, imaIkona } from '../app/ikoni.js';

describe('знаците · какво е един знак', () => {
  it('всеки носи ПЪТ, не празно', () => {
    for (const [ime, pat] of Object.entries(IKONI)) {
      expect(pat.trim(), ime).not.toBe('');
      expect(pat.startsWith('<'), ime).toBe(true);
    }
  });

  /**
   * Правило 11 · латиница и кирилица не се смесват. Имената на знаците са
   * КЛЮЧОВЕ в кода, не текст за човек — едно „о" на кирилица тук значи икона,
   * която никога не се намира, и никой не разбира защо.
   */
  it('имената са само латиница · правило 11', () => {
    for (const ime of Object.keys(IKONI)) {
      expect(/^[a-z][a-z0-9-]*$/.test(ime), ime).toBe(true);
    }
  });

  it('няма два еднакви пътя · два знака за едно нещо са по-лошо от един', () => {
    const patishta = Object.values(IKONI);
    expect(new Set(patishta).size).toBe(patishta.length);
  });
});

describe('рисуването · тихо при непознато, но не счупено', () => {
  it('познатото име дава svg с клас и без fill', () => {
    const html = ikona('storno');
    expect(html).toContain('<svg class="ikona"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('непознатото име дава ПРАЗНО, не хвърля', () => {
    expect(imaIkona('нямагоняма')).toBe(false);
    expect(ikona('нямагоняма')).toBe('');
  });
});

describe('дребното бутонче · знакът съкращава, думата остава', () => {
  const html = butonSIkona({
    ikona: 'iznos',
    id: 'iznesi',
    tekst: 'Изнеси Журнала',
    klas: 'vtorichen',
    danni: { kade: 'gore' },
  });

  it('носи знака И думата', () => {
    expect(html).toContain('<svg class="ikona"');
    expect(html).toContain('<span class="duma">Изнеси Журнала</span>');
  });

  /**
   * НАЙ-ВАЖНОТО тук. На тесен екран думата се скрива с CSS — но `aria-label`
   * я държи цяла за четеца на екран. „Скрито с дребни бутончета" значи
   * по-малко мастило, не по-малко смисъл (ADR-032: знакът намира, думата
   * обяснява).
   */
  it('и я носи ДВА пъти · title за окото, aria-label за четеца', () => {
    expect(html).toContain('title="Изнеси Журнала"');
    expect(html).toContain('aria-label="Изнеси Журнала"');
  });

  it('id-то е истинско, не data- · закачането го търси по него', () => {
    expect(html).toContain('id="iznesi"');
    expect(html).toContain('data-kade="gore"');
  });

  it('екранира · име с кавичка не чупи разметката', () => {
    const opasno = butonSIkona({ ikona: 'storno', tekst: 'Сторно на „А"' });
    expect(opasno).toContain('&quot;');
    expect(opasno).not.toContain('aria-label="Сторно на „А""');
  });

  it('главата на дял носи знак и подзаглавие', () => {
    const glava = dyalglavaSIkona('tablitsa', 'Разходи', 'по месеци');
    expect(glava).toContain('class="ikona golyama"');
    expect(glava).toContain('<h2>Разходи</h2>');
    expect(glava).toContain('<span>по месеци</span>');
  });
});

/**
 * ДОГОВОРЪТ МЕЖДУ ЕКРАНИТЕ И РЕГИСТЪРА · същият похват като при събитията
 * (`sabitiyata.test.ts`): всяко име, което приложението ИСКА, трябва да
 * съществува. Иначе управлението остава без знак, и то мълчешком.
 */
describe('всяко искано име съществува', () => {
  function iskanite(): { readonly fayl: string; readonly ime: string }[] {
    const namereni: { fayl: string; ime: string }[] = [];
    for (const fayl of readdirSync('app').filter((f) => f.endsWith('.ts'))) {
      const tekst = readFileSync(`app/${fayl}`, 'utf8');
      for (const m of tekst.matchAll(/\bikona: '([^']+)'/g)) {
        namereni.push({ fayl, ime: m[1]! });
      }
    }
    return namereni;
  }

  it('нито един екран не иска знак, който го няма', () => {
    const lipsvashti = iskanite().filter((x) => !imaIkona(x.ime));
    expect(lipsvashti.map((x) => `${x.fayl}: ${x.ime}`)).toEqual([]);
  });

  it('и поне един екран вече ги ползва · иначе регистърът е мъртъв път', () => {
    // Същата болест като при мъртвите износи (ADR-041 §1): построено и
    // невикано. Ако този тест падне, знаците са само рисунки.
    expect(iskanite().length).toBeGreaterThan(5);
  });
});
