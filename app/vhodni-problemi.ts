/**
 * ЦВЕТОВЕТЕ ПРИ ВЪВЕЖДАНЕ · легендата и светването (И96 т.1 · т.9).
 *
 * Негово: „да оцветява в различен цвят и с текст да дава ЛЕГЕНДА на цветовете
 * и защо не допуска… и дори стопанинът да дава негова бележка, когато се случи."
 *
 * ЗАЩО ЛЕГЕНДАТА СТОИ НА ЕКРАНА, а не в помощ: осем цвята никой не помни. Тя е
 * къса, стои сгъната и се отваря до полето, което свети — така се чете точно
 * когато трябва, вместо да се учи наизуст предварително.
 *
 * ТРИТЕ НОСИТЕЛЯ НА СМИСЪЛ. Цветът НАМИРА проблема с око; ЗНАКЪТ го различава
 * без цвят (далтонизмът е между осем и дванайсет процента от мъжете); ДУМАТА
 * го обяснява. Махне ли се цветът, останалите две още работят — това е
 * проверката дали интерфейсът е честен.
 */

import {
  OPISI,
  dumiZaNahodka,
  nastroykiPoPodrazbirane,
  opisNaProblem,
  pokazateliNaVhoda,
  proveriVhod,
  spira,
  type Kontekst,
  type Nahodka,
  type NastroykiNaVhoda,
} from '../src/domein/vhodni-problemi.js';
import { ekraniraj } from './obshto.js';

/** Настройките живеят в паметта на екрана, докато Настройки ги запише. */
let nastroyki: NastroykiNaVhoda = nastroykiPoPodrazbirane();

export function smeniNastroykiteNaVhoda(n: NastroykiNaVhoda): void {
  nastroyki = n;
}

/**
 * ЛЕГЕНДАТА · всички осем вида, с цвят, знак и дума.
 *
 * `otvorena` я отваря сама, когато нещо свети — иначе стои сгъната, за да не
 * заема екран, докато всичко е наред.
 */
export function legendata(otvorena = false): string {
  return `
    <details class="legenda-vhod"${otvorena ? ' open' : ''}>
      <summary>Легенда на цветовете · защо не се допуска</summary>
      <div class="tablitsa" data-tablitsa="legenda">
        <div class="glava legenda"><span>Знак</span><span>Какво е</span><span>Сила</span><span>Защо</span></div>
        ${OPISI.map(
          (o) => `<div class="red legenda" translate="no" data-vid-problem="${o.vid}">
          <span><span class="problem-znak problem-${o.tsvyat}" aria-hidden="true">${o.znak}</span></span>
          <span><b>${ekraniraj(o.ime)}</b></span>
          <span><span class="znachka ${nastroyki[o.vid].sila === 'spira' ? 'trevoga' : 'tiha'}">${
            nastroyki[o.vid].sila === 'spira' ? 'спира' : 'предупреждава'
          }</span></span>
          <span>${ekraniraj(nastroyki[o.vid].belezhka.trim() || o.zashto)}</span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Цветът НАМИРА проблема, знакът го различава без цвят, а думата го обяснява.
      Никой от трите не носи смисъла сам — затова и трите стоят.</p>
    </details>`;
}

/**
 * СВЕТВАНЕТО на едно поле · връща класа и съобщението.
 *
 * Не пипа DOM сам: екраните го викат и слагат каквото им трябва. Така една
 * логика обслужва форма, клетка в таблица и внесен ред от файл.
 */
export interface Svetnalo {
  /** класът за полето · празен, когато няма находки */
  readonly klas: string;
  /** съобщението под полето */
  readonly kazva: string;
  readonly spira: boolean;
  readonly nahodki: readonly Nahodka[];
}

function svetni(tekst: string, k: Kontekst): Svetnalo {
  const nahodki = proveriVhod(tekst, k, nastroyki);
  if (nahodki.length === 0) {
    return { klas: '', kazva: '', spira: false, nahodki };
  }
  // Свети по НАЙ-СИЛНАТА находка: поле с две беди изглежда като по-тежката.
  const naySilna =
    nahodki.find((x) => nastroyki[x.vid].sila === 'spira') ?? nahodki[0]!;
  const o = opisNaProblem(naySilna.vid);
  const p = pokazateliNaVhoda(nahodki, nastroyki);
  return {
    klas: `problem-pole problem-${o.tsvyat}`,
    kazva:
      `${o.znak} ${naySilna.kakvo} ${dumiZaNahodka(naySilna, nastroyki)}` +
      (p.vsichki > 1 ? ` (и още ${p.vsichki - 1} — виж легендата)` : ''),
    spira: spira(nahodki, nastroyki),
    nahodki,
  };
}

/**
 * Закача проверката към живо поле · свети, докато се пише.
 *
 * Проверява се при `input`, не при подаване: практиката е недвусмислена —
 * съобщение до полето, докато то се поправя, тежи по-малко от съобщение, което
 * трябва да се помни, докато се търси грешката.
 */
export function zakachiPole(
  pole: HTMLInputElement | HTMLTextAreaElement,
  k: Kontekst,
  kazhi: HTMLElement,
): void {
  const proveri = (): void => {
    const s = svetni(pole.value, k);
    pole.className = pole.className.replace(/\s*problem-\S+/g, '');
    if (s.klas !== '') pole.className = `${pole.className} ${s.klas}`.trim();
    kazhi.textContent = s.kazva;
    kazhi.dataset['spira'] = s.spira ? 'da' : 'ne';
  };
  pole.addEventListener('input', proveri);
  proveri();
}
