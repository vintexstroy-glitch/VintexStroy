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
import { glavataNaDelata, NADPISI_LICHNI, NADPISI_SLUZHEBNI } from '../app/gant.js';

const PRAZNO = fold([]);

describe('регистърът на таблиците', () => {
  const vsichki = tablitsiteNaProgramata(PRAZNO);

  it('вградените са ДЕВЕТ и всяка носи име, таб и глави', () => {
    // Седмата дойде с резен 18б · Продажби; ОСМАТА — с резен 48 · Управление;
    // ДЕВЕТАТА — с резен 82: САМИЯТ Журнал (сесиите), „както на всяка една…
    // така и в самия журнал" (И121 т.1). Числото е ТУК, за да падне на
    // червено, ако някой добави таблица и забрави да я обяви (ADR-041).
    const vgradeni = vsichki.filter((t) => eVgradena(t.klyuch));
    expect(vgradeni).toHaveLength(9);
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
      // ЖУРНАЛЪТ е изключението, поименно (резен 82): кодовите колони на
      // сесиите са подписани полета — производни до една, в тях не пише
      // никой. Отворените му колони се РАЖДАТ от Настройки (добавките) и
      // щом има такава, инвариантът долу пак важи — празният регистър тук
      // няма нито една.
      if (t.klyuch === 'vgraden:zhurnal') {
        expect(t.zatvoreni.length).toBe(t.glavi.length);
        continue;
      }
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

  it('таблицата на УПРАВЛЕНИЕ ВЛИЗА · и главите ѝ се ЧЕТАТ, не се преписват', () => {
    // Дотук тук стоеше обратното и границата се броеше като дълг (`docs/10`).
    // Резен 48 ѝ даде колонен описател (`koloniNaDelata`), от който четат И
    // Гантът, И матрицата — тъй че имената вече имат ЕДИН дом (правило 17).
    const dela = vsichki.find((t) => t.ekran === 'gant');
    expect(dela, 'Управление липсва от матрицата').toBeDefined();
    expect(dela!.klyuch).toBe('vgraden:dela');
    // ЧЕТИРИ, не три: редът показва и отговорника, а старата глава го премълчаваше.
    expect(dela!.glavi).toEqual(['Имот', 'Дело', 'Обект', 'Отговорник']);
  });

  it('главата на Ганта е СЪЩАТА като в матрицата · един дом, два четеца', () => {
    const dela = vsichki.find((t) => t.ekran === 'gant')!;
    expect(glavataNaDelata('Имот')).toBe(dela.glavi.join(' · '));
    // и при личните дела първата дума се СМЕНЯ, а останалите не (И98)
    expect(glavataNaDelata('Тема')).toBe('Тема · Дело · Обект · Отговорник');
  });

  it('и ЕКРАНЪТ чете описателя, вместо да преписва низ', () => {
    // НАМЕРЕНО СЪС СЧУПВАНЕ, не с четене: върнах `glavaNaImenata` на твърд низ
    // („Място · Обект · Дело") и НИТО ЕДИН тест не падна. Тоест описателят си
    // стоеше на мястото, а екранът пак говореше свои думи — точно разминаването,
    // заради което този ред беше дълг. Домът е един само ако ВСИЧКИ четат от него.
    expect(NADPISI_SLUZHEBNI.glavaNaImenata).toBe(glavataNaDelata('Имот'));
    expect(NADPISI_LICHNI.glavaNaImenata).toBe(glavataNaDelata('Тема'));
    // и подзаглавието на формата · то също изброяваше колоните на ръка
    expect(NADPISI_SLUZHEBNI.podnaslovNaFormata).toContain(glavataNaDelata('Имот'));
    expect(NADPISI_LICHNI.podnaslovNaFormata).toContain(glavataNaDelata('Тема'));
  });
});
