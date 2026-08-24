/**
 * ЧЕРНОВАТА · Ctrl+Z връща написаното, което прерисуването уби.
 *
 * Екранът се строи наново на всяко действие (сортиране, филтър, отметка) —
 * и наполовина написаната форма умира насред дума. Това е предпазната мрежа,
 * без която никой не смее да пише бързо (ADR-022 · вълна 2, предложение 13).
 *
 * ГРАНИЦАТА Е ВРАТАТА (правило 1): Ctrl+Z работи само ДО нея — върху
 * чернови, които никога не са ставали събития. Затова ИЗПРАЩАНЕТО на форма
 * ИЗЯЖДА черновата ѝ: каквото е тръгнало към Вратата, не се „връща назад"
 * с Ctrl+Z — за него има сторно, със следа. Без това правило записаното
 * плащане би се възкресявало в празната форма и второ „Запиши" би направило
 * дубликат.
 *
 * КЛЮЧЪТ Е ФОРМАТА ПЛЮС СЪЩНОСТТА Ѝ. Едно и също `#forma-plashtane` служи
 * на различни вземания (`data-vzemane`); чернова, писана за едното, няма
 * какво да търси във формата на другото. Затова ключът включва и `data-*`
 * атрибутите — чернова се връща само там, откъдето е тръгнала.
 *
 * Двете половини:
 *   - всяко писане в поле СНИМА цялата форма (жива чернова);
 *   - прерисуване, което подмени стойностите под снимката, я мести при
 *     умрелите — стек, от който Ctrl+Z вади, последната първа. Преди да
 *     върне старата, ЖИВОТО в формата се спасява в същия стек — Ctrl+Z
 *     никога не изтрива по-нов текст безвъзвратно.
 *
 * Връщането е ЯВНО действие: нищо не се попълва тихо. Ctrl+Z с фокус в
 * поле е на браузъра (undo на текста); нашият слушател мълчи там — същата
 * граница, по която мълчи и клавиатурната карта (`fokusVPole`).
 * Черновите живеят в паметта на страницата и умират със затварянето ѝ —
 * черновата е чернова, не запис.
 */

import { fokusVPole } from './klaviatura.js';

/** Стекът не расте до безкрай — под тавана старото пада мълчаливо. */
const TAVAN_NA_STEKA = 20;

export interface Chernova {
  /** ключът: id на формата · нейните data-* атрибути (същността) */
  readonly klyuch: string;
  readonly id: string;
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

/**
 * Ключът на форма от нейния id и data-* атрибути — чиста по съдържание,
 * за да има тест. Подредбата е закована по азбучен ред: един и същ ключ,
 * както и да са изредени атрибутите.
 */
export function klyuchNaChernova(id: string, danni: Readonly<Record<string, string | undefined>>): string {
  const chasti = Object.entries(danni)
    .filter((dvojka): dvojka is [string, string] => dvojka[1] !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ime, st]) => `${ime}=${st}`);
  return [id, ...chasti].join('·');
}

/** Ключът е неизменен, докато формата живее — смята се веднъж, не на клавиш. */
const klyuchove = new WeakMap<HTMLFormElement, string>();

function klyuchNaFormata(forma: HTMLFormElement): string {
  let k = klyuchove.get(forma);
  if (k === undefined) {
    k = klyuchNaChernova(forma.id, { ...forma.dataset });
    klyuchove.set(forma, k);
  }
  return k;
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

const zhivi = new Map<string, Chernova>();
const umreli: Chernova[] = [];

function pogrebi(ch: Chernova): void {
  umreli.push(ch);
  if (umreli.length > TAVAN_NA_STEKA) umreli.shift();
}

let zakacheno = false;

export function zakachiChernovata(koren: HTMLElement): void {
  // След всяко прерисуване: чия жива чернова е подменена на екрана?
  for (const [klyuch, ch] of [...zhivi]) {
    const forma = document.getElementById(ch.id);
    if (!(forma instanceof HTMLFormElement)) continue; // друг екран — чака
    // подменена стойност — или същият id с ДРУГА същност: черновата умира,
    // но не ляга върху чуждото
    if (klyuchNaFormata(forma) !== klyuch || umryalaLi(ch.poleta, snimka(forma))) {
      pogrebi(ch);
      zhivi.delete(klyuch);
    }
  }
  if (zakacheno) return;
  zakacheno = true;

  // Писането снима формата · делегирано, живее през всички прерисувания.
  koren.addEventListener('input', (e) => {
    const forma = (e.target as HTMLElement).closest('form');
    if (forma?.id) {
      const klyuch = klyuchNaFormata(forma);
      zhivi.set(klyuch, { klyuch, id: forma.id, poleta: snimka(forma) });
    }
  });

  // ИЗПРАЩАНЕТО изяжда черновата: тръгналото към Вратата не е чернова вече.
  // При отказ на Вратата формата остава на екрана със стойностите си, а
  // следващото писане я снима наново — нищо не се губи.
  koren.addEventListener('submit', (e) => {
    const forma = e.target;
    if (forma instanceof HTMLFormElement && forma.id) zhivi.delete(klyuchNaFormata(forma));
  });

  document.addEventListener('keydown', (e) => {
    // По `code`, не по буквата — кирилската клавиатура няма латинско „z".
    if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyZ' || fokusVPole()) return;
    // Последната умряла чернова, чиято форма (СЪС същата същност) е на екрана.
    for (let i = umreli.length - 1; i >= 0; i -= 1) {
      const ch = umreli[i]!;
      const forma = document.getElementById(ch.id);
      if (!(forma instanceof HTMLFormElement) || klyuchNaFormata(forma) !== ch.klyuch) continue;
      umreli.splice(i, 1);

      // Живото във формата се спасява ПРЕДИ да легне старото — Ctrl+Z не
      // изтрива по-нов текст безвъзвратно, а го нарежда следващ в стека.
      const segashni = snimka(forma);
      if (
        umryalaLi(ch.poleta, segashni) &&
        Object.values(segashni).some((st) => st.trim() !== '')
      ) {
        pogrebi({ klyuch: ch.klyuch, id: ch.id, poleta: segashni });
      }

      let parvo: HTMLElement | null = null;
      for (const [ime, st] of Object.entries(ch.poleta)) {
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
      zhivi.set(ch.klyuch, { klyuch: ch.klyuch, id: ch.id, poleta: snimka(forma) });
      parvo?.focus();
      e.preventDefault();
      return;
    }
  });
}
