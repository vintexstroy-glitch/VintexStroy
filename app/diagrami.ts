/**
 * СТЪЛБОВЕТЕ НА МЕСЕЦИТЕ · диаграмата в Отчетите (И92 т.4).
 *
 * SVG, не платно — по същите причини като диаграмата на Ганта (правило 10):
 * в браузъра е, мащабира се без размиване, носи `title` за четец на екран и
 * влиза в ПДФ износ без нов код.
 *
 * Всеки месец носи ДВА стълба — приход и разход, един до друг, в цветовете
 * на обобщения ред на Ганта (зелено · теракота), за да е един езикът на
 * парите навсякъде. Нето не се рисува: двете суми не се сливат.
 */

import { pishi } from '../src/yadro/pari.js';
import type { MesetsSPari } from '../src/domein/diagrami.js';
import { ekraniraj } from './imoti.js';

/** Геометрията · един месец е гнездо от два стълба и надпис под тях. */
const GNEZDO = 58;
const STALB = 20;
const VISOKO = 170;
const GLAVA = 26;
const DOLU = 30;

export function stalboveNaMesetsite(mesetsi: readonly MesetsSPari[]): string {
  const nayGolyamo = Math.max(...mesetsi.map((x) => Math.max(x.prihod_st, x.razhod_st)));
  if (nayGolyamo <= 0) {
    return '<p class="prazno">Още няма нито едно плащане или разход.<br>Стълбовете растат от Журнала — диаграмата не се пълни на ръка.</p>';
  }

  const shirina = mesetsi.length * GNEZDO + 16;
  const visochina = GLAVA + VISOKO + DOLU;
  const dolniyaRab = GLAVA + VISOKO;
  const visok = (st: number): number => (st / nayGolyamo) * VISOKO;

  const gnezda = mesetsi
    .map((x, i) => {
      const levo = 8 + i * GNEZDO + (GNEZDO - 2 * STALB - 4) / 2;
      const nadpis = `${x.mesets.slice(5, 7)}.${x.mesets.slice(2, 4)}`;
      const vPrihod = visok(x.prihod_st);
      const vRazhod = visok(x.razhod_st);
      return `<g class="stalbove-mesets" data-mesets="${ekraniraj(x.mesets)}"
        data-prihod-st="${x.prihod_st}" data-razhod-st="${x.razhod_st}">
        <title>${ekraniraj(`${x.mesets} · приход ${pishi(x.prihod_st)} · разход ${pishi(x.razhod_st)}`)}</title>
        <rect class="stalb-prihod" x="${levo.toFixed(1)}" y="${(dolniyaRab - vPrihod).toFixed(1)}"
          width="${STALB}" height="${vPrihod.toFixed(1)}"></rect>
        <rect class="stalb-razhod" x="${(levo + STALB + 4).toFixed(1)}" y="${(dolniyaRab - vRazhod).toFixed(1)}"
          width="${STALB}" height="${vRazhod.toFixed(1)}"></rect>
        <text class="stalbove-nadpis" x="${(levo + STALB + 2).toFixed(1)}" y="${dolniyaRab + 16}"
          text-anchor="middle">${nadpis}</text>
      </g>`;
    })
    .join('');

  return `
    <div class="diagrama-obvivka">
      <svg class="diagrama stalbove" viewBox="0 0 ${shirina} ${visochina}"
           width="${shirina}" height="${visochina}" role="img"
           aria-label="Приходи и разходи по месеци · ${mesetsi.length} месеца">
        <g class="stalbove-legenda">
          <rect class="stalb-prihod" x="8" y="6" width="10" height="10"></rect>
          <text class="stalbove-nadpis" x="22" y="15">приход · влезли пари</text>
          <rect class="stalb-razhod" x="150" y="6" width="10" height="10"></rect>
          <text class="stalbove-nadpis" x="164" y="15">разход · обща цена с ДДС</text>
        </g>
        <line class="diagrama-liniya" x1="4" y1="${dolniyaRab}" x2="${shirina - 4}" y2="${dolniyaRab}"></line>
        ${gnezda}
      </svg>
    </div>
    <p class="drebno">Стълбовете са СЪБРАНОТО и ПЛАТЕНОТО по месеци — същите числа като
    обобщения ред на Ганта. Нето не се рисува: месец с равни приход и разход не е празен месец.</p>`;
}
