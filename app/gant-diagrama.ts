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
import { IMENA_NA_TEMITE, type RedNaRazrez, type Reshetka, type TemaNaDiagramata } from '../src/domein/gant.js';
import { stepenNa } from '../src/domein/dela.js';
import { ekraniraj } from './obshto.js';
import { pishi } from '../src/yadro/pari.js';
import { zapomnenaVisochina } from './visochina.js';

/**
 * Началната височина на реда · СЪЩОТО 26, което стои на `.gant` в `stil.css`.
 * Двете места се пазят от прохода, който мери, че редът на решетката и редът
 * на диаграмата са еднакво високи (И104: „редовете… са едно").
 */
const RED_NACHALO = 26;
/** Подделото е по-тънко с толкова · и това се вижда. */
const PO_TANKO = 6;
const GLAVA = 34;
const IMENA = 210;
const OTSTAP = 14;
/** Височина на една лента с пари · приходът нагоре, разходът надолу от средата. */
const LENTA_PARI = 34;
/** Колко високо над (и под) стълбчето стои неговата ЦИФРА. */
const NAD_STALBCHETO = 3;
/** Колко от полукривата е за стълбче · останалото е въздух между лентите. */
const NAY_VISOKO = 10;

export function narisuvayDiagrama(
  dela: readonly Delo[],
  r: Reshetka,
  dnes: string,
  /**
   * ПАРИТЕ В ПОЛЕТО НА ДИАГРАМАТА (резен 13г · И102).
   *
   * Негов въпрос: „…а в самата диаграма **да се разпредели в полето от нея** и
   * пресято спрямо такта."
   *
   * Идват ГОТОВИ отвън — същите редове, които рисува и таблицата. Втора сметка
   * тук би дала два отговора за едни и същи пари: таблицата казва едно,
   * диаграмата друго, и никой не знае кое е вярното.
   */
  sumi: readonly RedNaRazrez[] = [],
  /**
   * ТЕМАТА · какво стои върху общата ос (резен 114 · ADR-160).
   *
   * „Текст" рисува ДЕЛАТА и не пипа парите; „Пари" рисува лентите с приход и
   * разход и не реди дела. Осата, решетката и днешната линия са общи — те са
   * онова, което прави двете „едно" (И133).
   */
  tema: TemaNaDiagramata = 'tekst',
): string {
  // ЕДНОТО число на реда (И104): диаграмата чете СЪЩАТА запомнена височина,
  // която движи решетката. SVG смята координати, не CSS променливи — затова
  // тя се изравнява при рисуване, не по средата на влаченето.
  const RED = zapomnenaVisochina('gant-redove', RED_NACHALO);
  const REDLO = RED - PO_TANKO;
  const parva = r.koloni[0]!;
  const posledna = r.koloni[r.koloni.length - 1]!;
  const nachalo = Date.parse(`${parva.ot}T00:00:00Z`);
  const kray = Date.parse(`${posledna.do}T00:00:00Z`) + 86_400_000;
  const obhvat = kray - nachalo;

  // Ширината расте с броя колони, за да не се смачка при такт „месец".
  const shirinaVreme = Math.max(560, r.koloni.length * 26);
  const shirina = IMENA + shirinaVreme;
  // ТЕМАТА РЕШАВА КОЕ СЕ РИСУВА · височината следва нея, не подадените данни.
  const naEkrana = tema === 'tekst' ? dela : [];
  const visokoNaDelata = naEkrana.reduce((s, d) => s + (d.nadDelo ? REDLO : RED), 0);
  const parichniLenti =
    tema === 'pari' ? sumi.filter((red) => red.kletki.some((k) => k.prihod_st || k.razhod_st)) : [];
  const visochina = GLAVA + visokoNaDelata + parichniLenti.length * LENTA_PARI + 28;

  const x = (data: string): number =>
    IMENA + ((Date.parse(`${data}T00:00:00Z`) - nachalo) / obhvat) * shirinaVreme;

  const dnesX = x(dnes);

  let y = GLAVA;
  const redove = naEkrana
    .map((d) => {
      // СТЕПЕНТА, не булев тест (резен 12б): дотук подподделото се рисуваше
      // ТОЧНО като подделото. Смята се ВЕДНЪЖ тук и се подава — инак всеки ред
      // би обикалял веригата на родителите си повторно.
      const stepen = stepenNa(naEkrana, d.id);
      // Височината пада само ВЕДНЪЖ: по-тънко от най-тънкото не се чете.
      // Отстъпът обаче расте с всяка степен — той носи дървото.
      const visok = stepen > 0 ? REDLO : RED;
      const red = redNaDiagramata(d, y, visok, x, dnes, stepen);
      y += visok;
      return red;
    })
    .join('');

  return `
    <section data-sektsiya="gant-diagrama">
      <div class="dyalglava">
        <h2>Диаграма на Ганта</h2>
        <span>${parva.ot} → ${posledna.do} · ${ekraniraj(IMENA_NA_TEMITE[tema])} · лентата е ВРЕМЕ, не клетки</span>
      </div>
      <div class="diagrama-obvivka">
        <svg class="diagrama" viewBox="0 0 ${shirina} ${visochina}"
             width="${shirina}" height="${visochina}" role="img"
             aria-label="${
               tema === 'tekst'
                 ? `Диаграма на Ганта с ${naEkrana.length} дела`
                 : `Диаграма на Ганта с ${parichniLenti.length} реда пари`
             }" data-tema-diagrama="${tema}">
          ${resetkaOtLinii(r, x, visochina)}
          <line class="diagrama-dnes" x1="${dnesX.toFixed(1)}" y1="8"
                x2="${dnesX.toFixed(1)}" y2="${visochina - 14}"></line>
          <text class="diagrama-dnesnadpis" x="${(dnesX + 4).toFixed(1)}" y="16">днес</text>
          ${redove}
          ${lentiSPari(parichniLenti, r, x, GLAVA + visokoNaDelata)}
        </svg>
      </div>
      <p class="drebno">Днешната линия реже лентите — щрихованото след нея е закъснялото.
      Подделото е по-тънко и отместено: гнездото се вижда, без да се натиска.
      Лентите не се влачат (негова забрана) — срокът се мени от полето за срок.${
        parichniLenti.length
          ? ` Долу парите са разпределени в полето по колоните на такта${
              parichniLenti.length > 1 ? `, по един ред на разрез (${parichniLenti.length})` : ''
            } — приходът нагоре, разходът надолу, с ЕДИН мащаб за всички.`
          : ''
      }</p>
    </section>`;
}

/**
 * ПАРИТЕ В ПОЛЕТО · по един ред на разрез, разпределени по колоните на такта.
 *
 * Негов въпрос, 27.08 (И102): „…а в самата диаграма да се РАЗПРЕДЕЛИ В ПОЛЕТО
 * от нея и ПРЕСЯТО СПРЯМО ТАКТА."
 *
 * ═══ ЕДИН МАЩАБ ЗА ВСИЧКИ ЛЕНТИ ═══
 *
 * Най-важното решение тук, и то не е графично. Ако всяка лента се мащабира по
 * СВОЯ връх, контрагент с двеста евро изглежда точно колкото контрагент с
 * двайсет хиляди — двете стълбчета опират тавана си. Мащабът е ЕДИН, взет от
 * най-голямото число в целия блок, и затова лентите са сравними с очи. Точно за
 * това служи разбивката.
 *
 * Числата идват ГОТОВИ от `obobshteniRedove` — същите, които рисува таблицата.
 * Втора сметка тук би дала два отговора за едни и същи пари.
 *
 * Нулата не се рисува. Стълбче с нулева височина е линия, а линия на нула
 * изглежда като „малко", не като „нищо".
 */
function lentiSPari(
  redove: readonly RedNaRazrez[],
  r: Reshetka,
  x: (data: string) => number,
  ot: number,
): string {
  if (redove.length === 0) return '';
  let nayGolyamo = 0;
  for (const red of redove) {
    for (const k of red.kletki) {
      if (k.prihod_st > nayGolyamo) nayGolyamo = k.prihod_st;
      if (k.razhod_st > nayGolyamo) nayGolyamo = k.razhod_st;
    }
  }
  if (nayGolyamo === 0) return '';

  return redove
    .map((red, i) => {
      const gore = ot + i * LENTA_PARI;
      const sredata = gore + LENTA_PARI / 2;
      const stalbcheta = red.kletki
        .map((k, j) => {
          // Клетка с обхват нула дели деня си с предишната (часовете на такт
          // „ден"): сумата вече е нарисувана над нея.
          if (k.obhvat === 0) return '';
          const kol = r.koloni[j];
          if (!kol) return '';
          const posledna = r.koloni[j + k.obhvat - 1] ?? kol;
          const levo = x(kol.ot);
          const dyasno = x(denSled(posledna.do));
          const shirina = Math.max(1, dyasno - levo - 1);
          const vis = (st: number): number => (st / nayGolyamo) * NAY_VISOKO;
          // ЦИФРАТА СТОИ В ДИАГРАМАТА · негово, 03.09 (И136): „В диаграмата са
          // цифри, текстът е в таблицата отляво на диаграмата." Стълбчето казва
          // ПРОПОРЦИЯТА, цифрата — точното число; без нея височината се чете на
          // око и всяко сравнение между два реда е гадаене.
          const sredNaKletkata = levo + shirina / 2;
          const tsifra = (st: number, y: number, koya: string): string =>
            `<text class="diagrama-tsifra ${koya}" x="${sredNaKletkata.toFixed(1)}" y="${y.toFixed(
              1,
            )}" text-anchor="middle" translate="no">${ekraniraj(pishi(st))}</text>`;
          const prihod =
            k.prihod_st > 0
              ? `<rect class="diagrama-pari prihod" x="${levo.toFixed(1)}" y="${(
                  sredata - vis(k.prihod_st)
                ).toFixed(1)}" width="${shirina.toFixed(1)}" height="${vis(k.prihod_st).toFixed(1)}"></rect>` +
                tsifra(k.prihod_st, sredata - vis(k.prihod_st) - NAD_STALBCHETO, 'prihod')
              : '';
          const razhod =
            k.razhod_st > 0
              ? `<rect class="diagrama-pari razhod" x="${levo.toFixed(1)}" y="${sredata.toFixed(
                  1,
                )}" width="${shirina.toFixed(1)}" height="${vis(k.razhod_st).toFixed(1)}"></rect>` +
                tsifra(k.razhod_st, sredata + vis(k.razhod_st) + NAD_STALBCHETO + 7, 'razhod')
              : '';
          return prihod + razhod;
        })
        .join('');
      return `<g class="diagrama-parichna" data-razrez="${ekraniraj(red.klyuch)}">
        <line class="diagrama-nula" x1="${IMENA}" y1="${sredata.toFixed(1)}" x2="${(
          IMENA + shirinataNaVremeto(r, x)
        ).toFixed(1)}" y2="${sredata.toFixed(1)}"></line>
        <text class="diagrama-ime" x="8" y="${(sredata + 4).toFixed(1)}">${ekraniraj(
          skasi(red.nadpis === '' ? 'Приход · Разход' : red.nadpis, 26),
        )}</text>
        ${stalbcheta}
      </g>`;
    })
    .join('');
}

/** Денят СЛЕД подадения · дясната граница на колоната е началото на следващия. */
function denSled(data: string): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Докъде стига времевата ос · последната колона плюс нейния ден. */
function shirinataNaVremeto(r: Reshetka, x: (data: string) => number): number {
  const posledna = r.koloni[r.koloni.length - 1];
  return posledna ? x(denSled(posledna.do)) - IMENA : 0;
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
  stepen: number,
): string {
  const svet = svetofar(d, dnes);
  const otstap = stepen * OTSTAP;
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

  return `<g class="diagrama-red ${svet}${stepen > 0 ? ' poddelo' : ''}" data-delo="${ekraniraj(d.id)}">
    <text class="diagrama-ime" x="${8 + otstap}" y="${y + visok / 2 + 4}">${ekraniraj(
      skasi(d.ime, stepen > 0 ? 24 : 26),
    )}</text>
    <rect class="diagrama-lenta" x="${x1.toFixed(1)}" y="${yl}" width="${(kray - x1).toFixed(
      1,
    )}" height="${visokaLenta}" rx="3">
      <title>${ekraniraj(`${d.ime} · ${d.ot} → ${d.do}${d.chas === '' ? '' : ` · ${d.chas}`} · ${d.otgovornik}`)}</title>
    </rect>
    ${zakasnyalo}
  </g>`;
}

/** Дългото име се реже с многоточие — но само НА ЕКРАНА; `title` носи цялото. */
function skasi(tekst: string, dalzhina: number): string {
  return tekst.length <= dalzhina ? tekst : `${tekst.slice(0, dalzhina - 1)}…`;
}
