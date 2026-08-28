/**
 * РЕГИСТЪРЪТ НА ТАБЛИЦИТЕ · и защо ИНДЕКСЪТ на затворената колона иска пазач.
 *
 * Регистърът казва кои колони на вградените таблици са СМЕТНАТИ — с НОМЕРА,
 * защото имената им живеят в екраните (правило 17). Номер, който сочи другаде,
 * е тиха грешка от най-лошия вид: човек дава „редактира" на колона, която не
 * се редактира, или обратното — а екранът показва думата, все едно е вярна.
 *
 * Добави ли някой колона в средата на „Имоти", тези тестове падат ПРЕДИ да е
 * качено. Точно затова индексите се БРОЯТ, не се оценяват.
 */

import { describe, expect, it } from 'vitest';
import { fold } from '../src/ogledalo/ogledalo.js';
import { eVgradena, tablitsiteNaProgramata } from '../app/tablitsite.js';
import { vidNaKolona } from '../src/domein/kolonno.js';

const PRAZNO = fold([]);

describe('регистърът на таблиците', () => {
  const vsichki = tablitsiteNaProgramata(PRAZNO);

  it('вградените са ШЕСТ и всяка носи име, таб и глави', () => {
    const vgradeni = vsichki.filter((t) => eVgradena(t.klyuch));
    expect(vgradeni).toHaveLength(6);
    for (const t of vgradeni) {
      expect(t.ime).not.toBe('');
      expect(t.ekran).not.toBe('');
      expect(t.glavi.length).toBeGreaterThan(0);
    }
  });

  it('ВСЕКИ номер на затворена колона СОЧИ съществуваща колона', () => {
    for (const t of vsichki) {
      for (const k of t.zatvoreni) {
        expect(
          k >= 0 && k < t.glavi.length,
          `„${t.ime}" · затворена колона ${k}, а главите са ${t.glavi.length}`,
        ).toBe(true);
      }
    }
  });

  it('затворената колона се чете като затворена, а съседната ѝ — не', () => {
    const imoti = vsichki.find((t) => t.klyuch === 'vgraden:imoti')!;
    // „Наем / мес." е СБОР на живите наеми — сметка, не поле.
    expect(imoti.glavi[3]).toContain('Наем');
    expect(vidNaKolona(imoti, 3)).toBe('zatvorena');
    // „Площ" е записано число и се редактира.
    expect(imoti.glavi[2]).toBe('Площ');
    expect(vidNaKolona(imoti, 2)).toBe('promenlyva');
  });

  it('нито една вградена таблица не е ИЗЦЯЛО затворена · инак правото е надпис', () => {
    for (const t of vsichki.filter((x) => eVgradena(x.klyuch))) {
      expect(t.zatvoreni.length, t.ime).toBeLessThan(t.glavi.length);
    }
  });

  it('ключовете са УНИКАЛНИ · два еднакви биха слели правата на две таблици', () => {
    const klyuchove = vsichki.map((t) => t.klyuch);
    expect(new Set(klyuchove).size).toBe(klyuchove.length);
  });

  it('вградените носят представка · ръчно кръстен хедър не им краде правата', () => {
    for (const t of vsichki.filter((x) => eVgradena(x.klyuch))) {
      expect(t.klyuch.startsWith('vgraden:')).toBe(true);
    }
  });

  it('таблицата на УПРАВЛЕНИЕ още НЕ влиза · границата се брои, не се премълчава', () => {
    // Тя не е построена върху колонния описател (`app/gant.ts` рисува своя
    // глава). Падне ли този тест, значи е влязла — и редът в `docs/10` пада с него.
    expect(vsichki.some((t) => t.ekran === 'gant')).toBe(false);
  });
});
