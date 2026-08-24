/**
 * ЧЕРНОВАТА · Ctrl+Z връща написаното, което прерисуването уби.
 *
 * Екранът се строи наново на всяко действие (сортиране, филтър, отметка) —
 * и наполовина написаната форма умира насред дума. Това е предпазната мрежа,
 * без която никой не смее да пише бързо (ADR-022 · вълна 2, предложение 13).
 *
 * ГРАНИЦАТА Е ВРАТАТА (правило 1): Ctrl+Z работи само ДО нея — върху
 * чернови, които никога не са ставали събития. Записаното не се „връща
 * назад" — за него има сторно, със следа. Затова този модул не докосва
 * нито Журнала, нито паметта на екрана: черновите живеят в паметта на
 * страницата и умират със затварянето ѝ — черновата е чернова.
 *
 * Двете половини:
 *   - всяко писане в поле СНИМА цялата форма (жива чернова);
 *   - прерисуване, което подмени стойностите под снимката, я мести при
 *     умрелите — стек, от който Ctrl+Z вади, последната първа.
 *
 * Връщането е ЯВНО действие: нищо не се попълва тихо. Ctrl+Z с фокус в
 * поле е на браузъра (undo на текста); нашият слушател мълчи там — същата
 * граница, по която мълчи и клавиатурната карта (`fokusVPole`).
 */

import { fokusVPole } from './klaviatura.js';

/** Стекът не расте до безкрай — под тавана старото пада мълчаливо. */
export const TAVAN_NA_STEKA = 20;

export interface Chernova {
  readonly forma: string;
  readonly poleta: Readonly<Record<string, string>>;
}

/**
 * Умряла ли е черновата: някое нейно поле вече носи ДРУГА стойност на
 * екрана. Поле, което формата вече няма, не се брои — режимът се е сменил,
 * а не стойността. Чиста функция, за да има тест.
 */
export function umryalaLi(
  chernova: Readonly<Record<string, string>>,
  segashni: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(chernova).some(([ime, st]) => ime in segashni && segashni[ime] !== st);
}

/** Полетата на формата, каквито са в мига — отметки и скритото не влизат. */
function snimka(forma: HTMLFormElement): Record<string, string> {
  const poleta: Record<string, string> = {};
  for (const el of forma.elements) {
    if (
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement) &&
      el.name !== '' &&
      el.type !== 'hidden' &&
      el.type !== 'checkbox' &&
      el.type !== 'radio'
    ) {
      poleta[el.name] = el.value;
    }
  }
  return poleta;
}

const zhivi = new Map<string, Record<string, string>>();
const umreli: Chernova[] = [];

let zakacheno = false;

export function zakachiChernovata(koren: HTMLElement): void {
  // След всяко прерисуване: чия жива чернова е подменена на екрана?
  for (const [id, poleta] of [...zhivi]) {
    const forma = document.getElementById(id);
    if (!(forma instanceof HTMLFormElement)) continue; // друг екран — чака
    if (umryalaLi(poleta, snimka(forma))) {
      umreli.push({ forma: id, poleta });
      if (umreli.length > TAVAN_NA_STEKA) umreli.shift();
      zhivi.delete(id);
    }
  }
  if (zakacheno) return;
  zakacheno = true;

  // Писането снима формата · делегирано, живее през всички прерисувания.
  koren.addEventListener('input', (e) => {
    const forma = (e.target as HTMLElement).closest('form');
    if (forma?.id) zhivi.set(forma.id, snimka(forma));
  });

  document.addEventListener('keydown', (e) => {
    // По `code`, не по буквата — кирилската клавиатура няма латинско „z".
    if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyZ' || fokusVPole()) return;
    // Последната умряла чернова, чиято форма е на екрана сега.
    for (let i = umreli.length - 1; i >= 0; i -= 1) {
      const { forma: id, poleta } = umreli[i]!;
      const forma = document.getElementById(id);
      if (!(forma instanceof HTMLFormElement)) continue;
      umreli.splice(i, 1);
      let parvo: HTMLElement | null = null;
      for (const [ime, st] of Object.entries(poleta)) {
        const el = forma.elements.namedItem(ime);
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        ) {
          el.value = st;
          if (!parvo && st !== '') parvo = el;
        }
      }
      // върнатото веднага е жива чернова — второ прерисуване не я губи
      zhivi.set(id, snimka(forma));
      parvo?.focus();
      e.preventDefault();
      return;
    }
  });
}
