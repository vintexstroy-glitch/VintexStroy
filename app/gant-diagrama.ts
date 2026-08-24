/**
 * ДИАГРАМАТА НА ГАНТА · дизайнът на графиката.
 *
 * Това е нещото, което И56 ЧАКА, за да се вземе решение:
 *
 *   „когато разработим не таблицата на Гант, а **диаграмата му**, чак тогава ще
 *    решим кое къде да ползваме и дали таблицата на Гант ще остане навсякъде
 *    или не."
 *
 * И52 казва КЪДЕ живее всяко от двете: „десктоп = диаграма; телефон и HTML =
 * таблица с оцветени полета". Затова двете стоят едно до друго и се сменят с
 * бутон — за да могат да се сравнят с очи, преди той да реши.
 *
 * ── ДИЗАЙНЪТ · какво го различава от таблицата ──────────────────────────────
 *
 * Таблицата с оцветени полета е РЕШЕТКА: всяка клетка е ден, лентата е блок от
 * клетки. Тя е точна и се чете на телефон.
 *
 * Диаграмата е ВРЕМЕВА ОС: лентата е непрекъсната, започва и свършва там, където
 * е денят, а не където е клетката. Затова тя показва неща, които решетката не
 * може:
 *
 *   1. **пропорцията** — дело от три дни и дело от трийсет се виждат като
 *      различни по дължина, не като „3 клетки" и „30 клетки";
 *   2. **днешната линия** — вертикала през цялата диаграма, която реже лентите
 *      и показва докъде е стигнало времето;
 *   3. **гнездото** — подделото се рисува по-тънко и отместено под своето дело,
 *      така че сгъването се вижда и без да се натиска;
 *   4. **опашката на просроченото** — щрихована част след днешната линия, която
 *      казва „това вече е трябвало да свърши".
 *
 * ── ЗАЩО SVG, а не платно ──────────────────────────────────────────────────
 *
 * Правило 10: нула зависимости. SVG е в браузъра, мащабира се без размиване,
 * има `title` за четец на екран и се пренася в ПДФ износ без нито един ред нов
 * код. Платното (`canvas`) би искало собствено рисуване на текст и би било
 * невидимо за търсене в страницата.
 *
 * ── ЦВЕТОВЕТЕ ───────────────────────────────────────────────────────────────
 *
 * Не са избрани „да е красиво": те са неговият светофар *(р59·[71])* —
 * нормално · жълто седмица преди · червено два дни преди · просрочено. Плюс
 * тъмно графитеното за Мястото *(р52·[221])*.
 */

import {
  eEdnodnevno,
  svetofar,
  type Delo,
} from '../src/domein/dela.js';
import type { Reshetka } from '../src/domein/gant.js';
import { ekraniraj } from './obshto.js';

/** Височина на един ред · подделото е по-тънко и това се вижда. */
const RED = 26;
const REDLO = 20;
const GLAVA = 34;
const IMENA = 210;
const OTSTAP = 14;

export function narisuvayDiagrama(
  dela: readonly Delo[],
  r: Reshetka,
  dnes: string,
): string {
  const parva = r.koloni[0]!;
  const posledna = r.koloni[r.koloni.length - 1]!;
  const nachalo = Date.parse(`${parva.ot}T00:00:00Z`);
  const kray = Date.parse(`${posledna.do}T00:00:00Z`) + 86_400_000;
  const obhvat = kray - nachalo;

  // Ширината расте с броя колони, за да не се смачка при такт „месец".
  const shirinaVreme = Math.max(560, r.koloni.length * 26);
  const shirina = IMENA + shirinaVreme;
  const visochina = GLAVA + dela.reduce((s, d) => s + (d.nadDelo ? REDLO : RED), 0) + 28;

  const x = (data: string): number =>
    IMENA + ((Date.parse(`${data}T00:00:00Z`) - nachalo) / obhvat) * shirinaVreme;

  const dnesX = x(dnes);

  let y = GLAVA;
  const redove = dela
    .map((d) => {
      const visok = d.nadDelo ? REDLO : RED;
      const red = redNaDiagramata(d, y, visok, x, dnes);
      y += visok;
      return red;
    })
    .join('');

  return `
    <section>
      <div class="dyalglava">
        <h2>Диаграма на Ганта</h2>
        <span>${parva.ot} → ${posledna.do} · лентата е ВРЕМЕ, не клетки</span>
      </div>
      <div class="diagrama-obvivka">
        <svg class="diagrama" viewBox="0 0 ${shirina} ${visochina}"
             width="${shirina}" height="${visochina}" role="img"
             aria-label="Диаграма на Ганта с ${dela.length} дела">
          ${resetkaOtLinii(r, x, visochina)}
          <line class="diagrama-dnes" x1="${dnesX.toFixed(1)}" y1="8"
                x2="${dnesX.toFixed(1)}" y2="${visochina - 14}"></line>
          <text class="diagrama-dnesnadpis" x="${(dnesX + 4).toFixed(1)}" y="16">днес</text>
          ${redove}
        </svg>
      </div>
      <p class="drebno">Днешната линия реже лентите — щрихованото след нея е закъснялото.
      Подделото е по-тънко и отместено: гнездото се вижда, без да се натиска.
      Лентите не се влачат (негова забрана) — срокът се мени от полето за срок.</p>
    </section>`;
}

/**
 * Вертикалните линии на решетката · само на границите на колоните.
 *
 * Рисуват се БЛЕДИ нарочно: те са ориентир, не съдържание. Диаграмата, в която
 * решетката се вижда колкото лентите, е таблица с извити ъгли.
 */
function resetkaOtLinii(r: Reshetka, x: (d: string) => number, visochina: number): string {
  return r.koloni
    .map((k, i) => {
      const gx = x(k.ot).toFixed(1);
      const nadpis =
        i % Math.max(1, Math.round(r.koloni.length / 12)) === 0
          ? `<text class="diagrama-nadpis" x="${(Number(gx) + 3).toFixed(1)}" y="${GLAVA - 12}">${ekraniraj(
              k.nadpis,
            )}</text>`
          : '';
      return `<line class="diagrama-liniya" x1="${gx}" y1="${GLAVA - 8}" x2="${gx}" y2="${
        visochina - 14
      }"></line>${nadpis}`;
    })
    .join('');
}

function redNaDiagramata(
  d: Delo,
  y: number,
  visok: number,
  x: (data: string) => number,
  dnes: string,
): string {
  const svet = svetofar(d, dnes);
  const otstap = d.nadDelo ? OTSTAP : 0;
  const x1 = x(d.ot);
  // Еднодневното дело няма дължина по времевата ос — дава му се минимална,
  // иначе изчезва напълно и „днес имам задача" изглежда като „нямам".
  const x2 = Math.max(x(d.do) + (eEdnodnevno(d) ? 0 : 0), x1 + 6);
  const kray = Math.max(x2, x1 + 6);
  const visokaLenta = visok - 8;
  const yl = y + 4;

  // ОПАШКАТА НА ПРОСРОЧЕНОТО · частта след днес, щрихована.
  const dnesX = x(dnes);
  const zakasnyalo =
    svet === 'prosrocheno' && kray > x1
      ? `<rect class="diagrama-zakasnyalo" x="${Math.max(x1, Math.min(kray, dnesX)).toFixed(
          1,
        )}" y="${yl}" width="${Math.max(0, kray - Math.max(x1, Math.min(kray, dnesX))).toFixed(
          1,
        )}" height="${visokaLenta}" rx="3"></rect>`
      : '';

  return `<g class="diagrama-red ${svet}${d.nadDelo ? ' poddelo' : ''}" data-delo="${ekraniraj(d.id)}">
    <text class="diagrama-ime" x="${8 + otstap}" y="${y + visok / 2 + 4}">${ekraniraj(
      skasi(d.ime, d.nadDelo ? 24 : 26),
    )}</text>
    <rect class="diagrama-lenta" x="${x1.toFixed(1)}" y="${yl}" width="${(kray - x1).toFixed(
      1,
    )}" height="${visokaLenta}" rx="3">
      <title>${ekraniraj(`${d.ime} · ${d.ot} → ${d.do} · ${d.otgovornik}`)}</title>
    </rect>
    ${zakasnyalo}
  </g>`;
}

/** Дългото име се реже с многоточие — но само НА ЕКРАНА; `title` носи цялото. */
function skasi(tekst: string, dalzhina: number): string {
  return tekst.length <= dalzhina ? tekst : `${tekst.slice(0, dalzhina - 1)}…`;
}
