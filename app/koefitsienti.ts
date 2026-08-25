/**
 * ЧИСТАТА ДИАГРАМА · показаната сметка (И96 т.5 · т.6).
 *
 * Негови думи, дословно: „Има чиста диаграма БЕЗ ТАБЛИЦА, а само показани суми
 * за избрания период от време и стъпката, показани в избраната диаграма на
 * избран коефициент. Всички коефициенти са показани и параметрите от периода…
 * и всички коефициенти изредени с ФОРМУЛАТА НА ЕДИН РЕД, и под нея сметките за
 * периода на параметри и коефициенти."
 *
 * Затова тук диаграмата НЕ е картинка, а сметка, която се вижда:
 *   · горе — периодът, стъпката, коефициентът и ВИДЪТ диаграма;
 *   · в средата — самата диаграма, без нито един ред таблица;
 *   · под нея — ФОРМУЛАТА на един ред и ПАРАМЕТРИТЕ с числата им;
 *   · най-долу — ВСИЧКИТЕ коефициенти за периода, всеки с формулата си.
 *
 * ЧЕТИРИТЕ ВИДА ДИАГРАМА · и кой къде лъже. Той иска „колкото вида има, да се
 * прилагат за всеки един коефициент". Дават се и четирите за всеки — но до
 * онези, които изкривяват, стои ДУМА, вместо да се крие бутонът. Скрит бутон
 * учи човека, че приложението знае по-добре; казана причина го учи защо.
 */

import {
  IMENA_NA_STAPKITE,
  IMENA_NA_VIDOVETE,
  KOEFITSIENTI,
  PRIRAVNYAVANETO,
  STAPKI,
  ZASHTO_PRIRAVNYAVANE,
  danniZaPerioda,
  koefitsient,
  mozheDaSePriravni,
  priravniKamGodina,
  razbiyNaStapki,
  sDumiStoynost,
  smetniKoefitsient,
  zaStapka,
  type Koefitsient,
  type Merka,
  type SmetnatKoefitsient,
  type Stapka,
} from '../src/domein/koefitsienti.js';
import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

/** Четирите вида диаграма · и къде всеки лъже. */
const VIDOVE_DIAGRAMA = ['liniya', 'stalbove', 'ploshtta', 'tochki'] as const;

type VidDiagrama = (typeof VIDOVE_DIAGRAMA)[number];

export const IMENA_NA_DIAGRAMITE: Readonly<Record<VidDiagrama, string>> = Object.freeze({
  liniya: 'линия',
  stalbove: 'стълбове',
  ploshtta: 'площ',
  tochki: 'точки',
});

/**
 * Кога един вид изкривява · празно значи „става".
 *
 * Площта внушава ОБЕМ — сборът под кривата. За отношение (процент, пъти) такъв
 * обем не съществува: 20 % през май и 20 % през юни не правят 40 %.
 */
function kadeLazhe(v: VidDiagrama, m: Merka): string {
  if (v === 'ploshtta' && m !== 'pari') {
    return 'площта внушава сбор под кривата, а отношенията не се сборуват — 20 % и 20 % не правят 40 %';
  }
  if (v === 'tochki') return 'точките показват стойности, но не и че периодите вървят един след друг';
  return '';
}

/** Помни се като ПОГЛЕД, не като факт (ADR-022). */
let ot = chetiEkranno('koef.ot', '');
let doo = chetiEkranno('koef.do', '');
let stapka = chetiEkranno<Stapka>('koef.stapka', 'mesets');
let izbran = chetiEkranno('koef.koefitsient', 'noi');
let vidD = chetiEkranno<VidDiagrama>('koef.diagrama', 'liniya');
let kamGodina = chetiEkranno('koef.godishna', false);

/** Подразбираният период · последните дванайсет месеца до днес. */
function podrazbiranPeriod(dnes: string): { ot: string; do: string } {
  const [g, m] = dnes.split('-').map(Number) as [number, number];
  return { ot: `${g - 1}-${String(m).padStart(2, '0')}-01`, do: dnes };
}

export function narisuvayKoefitsientite(o: Ogledalo, dnes: string): string {
  const p = podrazbiranPeriod(dnes);
  const nachalo = ot || p.ot;
  const kraj = doo || p.do;
  const nalichni = zaStapka(stapka === 'mesets' ? 'mesets' : 'drug');
  const k = nalichni.find((x) => x.klyuch === izbran) ?? nalichni[0]!;

  const parcheta = kraj >= nachalo ? razbiyNaStapki(nachalo, kraj, stapka) : [];
  const redica = parcheta.map((ch) => ({
    etiket: ch.etiket,
    smetnat: smetniKoefitsient(k, danniZaPerioda(o, ch.ot, ch.do)),
  }));

  // Целият период накуп · за формулата и параметрите под диаграмата.
  const zaTseliya = smetniKoefitsient(k, danniZaPerioda(o, nachalo, kraj));

  return `
    ${lentata(nalichni, k, nachalo, kraj)}
    ${diagramata(redica, k)}
    ${podDiagramata(k, zaTseliya, o, nachalo, kraj)}
    ${vsichkite(o, nachalo, kraj, nalichni)}`;
}

function lentata(
  nalichni: readonly Koefitsient[],
  k: Koefitsient,
  nachalo: string,
  kraj: string,
): string {
  const lazhe = kadeLazhe(vidD, k.merka);
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Коефициентите</h2>
        <span>чиста диаграма · без нито един ред таблица</span>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="koef-ot">От</label>
          <input translate="no" id="koef-ot" type="date" value="${ekraniraj(nachalo)}">
        </div>
        <div class="pole">
          <label for="koef-do">До</label>
          <input translate="no" id="koef-do" type="date" value="${ekraniraj(kraj)}">
        </div>
        <div class="pole">
          <label for="koef-stapka">Стъпка</label>
          <select translate="no" id="koef-stapka">
            ${STAPKI.map(
              (s) =>
                `<option value="${s}"${s === stapka ? ' selected' : ''}>${IMENA_NA_STAPKITE[s]}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="koef-koefitsient">Коефициент</label>
          <select translate="no" id="koef-koefitsient">
            ${nalichni
              .map(
                (x) =>
                  `<option value="${ekraniraj(x.klyuch)}"${x.klyuch === k.klyuch ? ' selected' : ''}>${ekraniraj(x.ime)}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="koef-diagrama">Вид диаграма</label>
          <select translate="no" id="koef-diagrama">
            ${VIDOVE_DIAGRAMA.map(
              (v) =>
                `<option value="${v}"${v === vidD ? ' selected' : ''}>${IMENA_NA_DIAGRAMITE[v]}</option>`,
            ).join('')}
          </select>
        </div>
      </div>
      ${
        stapka === 'mesets'
          ? '<p class="drebno">Стъпка МЕСЕЦ · показани са и месечните коефициенти (събираемост, ДДС) — начисленото и ДДС-то са месечни понятия, не наш избор.</p>'
          : `<p class="drebno">При стъпка „${ekraniraj(IMENA_NA_STAPKITE[stapka])}" месечните коефициенти ги НЯМА — те нямат смисъл извън месец.</p>`
      }
      ${lazhe ? `<p class="drebno trevozhno" id="kade-lazhe">⚠ ${ekraniraj(lazhe)}</p>` : ''}
      <label class="vazm">
        <input type="checkbox" id="koef-godishna"${kamGodina ? ' checked' : ''}${
          mozheDaSePriravni(k) ? '' : ' disabled'
        }>
        <span class="vazm-tyalo"><b>Приравнено към ГОДИНА</b><span id="zashto-priravnyavane">${ekraniraj(
          ZASHTO_PRIRAVNYAVANE[PRIRAVNYAVANETO[k.vid]],
        )}</span></span>
      </label>
    </section>`;
}

/** Височината на графиката · закована, за да не подскача при смяна. */
const VIS = 200;
const GNEZDO = 46;

/**
 * САМАТА ДИАГРАМА · без таблица под нея, както той я поиска.
 *
 * Нулата е ВИНАГИ на осата, дори когато всички стойности са положителни:
 * диаграма, отрязана над нулата, прави дребна разлика да изглежда огромна.
 */
function diagramata(
  redica: readonly { etiket: string; smetnat: SmetnatKoefitsient }[],
  k: Koefitsient,
): string {
  const sChisla = redica.filter((r) => r.smetnat.stoynost !== undefined);
  if (sChisla.length === 0) {
    return `<section><p class="prazno">За този период „${ekraniraj(k.ime)}" няма стойност.<br>${ekraniraj(
      redica[0]?.smetnat.zashto ?? 'Няма данни в избрания период.',
    )}</p></section>`;
  }

  const stoynosti = sChisla.map((r) => godishna(r.smetnat, k));
  const gore = Math.max(0, ...stoynosti);
  const dolu = Math.min(0, ...stoynosti);
  const razmah = gore - dolu || 1;
  const shirina = redica.length * GNEZDO + 40;
  const y = (v: number): number => VIS - ((v - dolu) / razmah) * VIS;
  const x = (i: number): number => 20 + i * GNEZDO + GNEZDO / 2;

  const tochki = redica
    .map((r, i) => (r.smetnat.stoynost === undefined ? '' : `${x(i)},${y(godishna(r.smetnat, k))}`))
    .filter((t) => t !== '')
    .join(' ');

  const telo = (): string => {
    switch (vidD) {
      case 'stalbove':
        return redica
          .map((r, i) => {
            if (r.smetnat.stoynost === undefined) return '';
            const v = godishna(r.smetnat, k);
            const gy = Math.min(y(v), y(0));
            return `<rect class="koef-stalb" x="${x(i) - 14}" y="${gy}" width="28" height="${Math.max(1, Math.abs(y(v) - y(0)))}"><title>${ekraniraj(r.etiket)}</title></rect>`;
          })
          .join('');
      case 'ploshtta':
        return `<polygon class="koef-plosht" points="${x(0)},${y(0)} ${tochki} ${x(redica.length - 1)},${y(0)}"></polygon>
                <polyline class="koef-liniya" points="${tochki}"></polyline>`;
      case 'tochki':
        return redica
          .map((r, i) =>
            r.smetnat.stoynost === undefined
              ? ''
              : `<circle class="koef-tochka" cx="${x(i)}" cy="${y(godishna(r.smetnat, k))}" r="5"><title>${ekraniraj(r.etiket)}</title></circle>`,
          )
          .join('');
      case 'liniya':
        return `<polyline class="koef-liniya" points="${tochki}"></polyline>${redica
          .map((r, i) =>
            r.smetnat.stoynost === undefined
              ? ''
              : `<circle class="koef-tochka" cx="${x(i)}" cy="${y(godishna(r.smetnat, k))}" r="3.5"><title>${ekraniraj(r.etiket)}</title></circle>`,
          )
          .join('')}`;
    }
  };

  return `
    <section>
      <div class="tablitsa bez-ramka">
        <svg class="koef-diagrama" viewBox="0 0 ${shirina} ${VIS + 34}" width="${shirina}" height="${VIS + 34}"
             role="img" aria-label="Диаграма на ${ekraniraj(k.ime)}">
          <line class="koef-nula" x1="12" y1="${y(0)}" x2="${shirina - 8}" y2="${y(0)}"></line>
          ${telo()}
          ${redica
            .map(
              (r, i) =>
                `<text class="koef-etiket" x="${x(i)}" y="${VIS + 24}" text-anchor="middle">${ekraniraj(r.etiket)}</text>`,
            )
            .join('')}
        </svg>
      </div>
      <p class="drebno">Нулата стои на осата винаги — диаграма, отрязана над нулата, прави дребна разлика да изглежда огромна.</p>
    </section>`;
}

/** Стойността, приравнена при нужда · тук е ЕДИНСТВЕНОТО място, което я мени. */
function godishna(s: SmetnatKoefitsient, k: Koefitsient): number {
  if (s.stoynost === undefined) return 0;
  if (!kamGodina || !mozheDaSePriravni(k)) return s.stoynost;
  try {
    return priravniKamGodina(s, 1);
  } catch {
    return s.stoynost;
  }
}

/** ФОРМУЛАТА на един ред и ПАРАМЕТРИТЕ под нея · дословно негово искане. */
function podDiagramata(
  k: Koefitsient,
  s: SmetnatKoefitsient,
  _o: Ogledalo,
  nachalo: string,
  kraj: string,
): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>${ekraniraj(k.ime)}</h2>
        <span>${ekraniraj(IMENA_NA_VIDOVETE[k.vid])}</span>
      </div>
      <p class="koef-formula" id="formulata" translate="no"><b>${ekraniraj(k.formula)}</b></p>
      <p>${ekraniraj(k.kakvo)}${k.obichayno ? ` <b>Обичайно: ${ekraniraj(k.obichayno)}.</b>` : ''}</p>
      <div class="tablitsa" data-tablitsa="koef-parametri">
        <div class="glava koef-parametar"><span>Параметър за ${ekraniraj(nachalo)} → ${ekraniraj(kraj)}</span><span class="suma">Стойност</span></div>
        ${s.parametri
          .map(
            (x) => `<div class="red koef-parametar" translate="no">
          <span>${ekraniraj(x.ime)}</span>
          <span class="suma">${x.merka === 'pari' ? pishi(x.stoynost) : String(x.stoynost)}</span>
        </div>`,
          )
          .join('')}
        <div class="red koef-parametar koef-rezultat" translate="no">
          <span><b>${ekraniraj(k.ime)}</b></span>
          <span class="suma" data-koef-stoynost="${s.stoynost ?? ''}"><b>${ekraniraj(sDumiStoynost(s, pishi))}</b></span>
        </div>
      </div>
      ${s.zashto ? `<p class="drebno trevozhno">${ekraniraj(s.zashto)}</p>` : ''}
    </section>`;
}

/** ВСИЧКИТЕ коефициенти за периода · всеки с формулата си на един ред. */
function vsichkite(
  o: Ogledalo,
  nachalo: string,
  kraj: string,
  nalichni: readonly Koefitsient[],
): string {
  const d = danniZaPerioda(o, nachalo, kraj);
  return `
    <section>
      <div class="dyalglava">
        <h2>Всички коефициенти за периода</h2>
        <span>формулата на един ред · и числото до нея</span>
      </div>
      <div class="tablitsa" data-tablitsa="koef-vsichki">
        <div class="glava koef-red"><span>Коефициент</span><span>Формула</span><span class="suma">Стойност</span><span>На годишна база</span></div>
        ${nalichni
          .map((k) => {
            const s = smetniKoefitsient(k, d);
            const kak = PRIRAVNYAVANETO[k.vid];
            return `<div class="red koef-red" data-koef="${ekraniraj(k.klyuch)}" translate="no">
            <span class="kletka"><b>${ekraniraj(k.ime)}</b><span>${ekraniraj(k.kakvo)}</span></span>
            <span class="koef-formula">${ekraniraj(k.formula)}</span>
            <span class="suma">${ekraniraj(sDumiStoynost(s, pishi))}</span>
            <span><span class="znachka ${kak === 'mnozhi' ? 'dobre' : 'tiha'}">${
              kak === 'mnozhi' ? 'да' : kak === 'nenuzhno' ? 'не трябва' : 'не може'
            }</span></span>
          </div>`;
          })
          .join('')}
      </div>
      <p class="drebno">Колоната „на годишна база" не е настройка, а свойство: сума се приравнява, отношение на два потока вече не зависи от периода, а отношение на два запаса е снимка в един миг.</p>
    </section>`;
}

export function zakachiKoefitsientite(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  const vrazhi = (id: string, kam: (v: string) => void) => {
    koren.querySelector<HTMLInputElement | HTMLSelectElement>(id)?.addEventListener(
      'change',
      async (e) => {
        kam((e.target as HTMLInputElement).value);
        await prerisuvay();
      },
    );
  };

  vrazhi('#koef-ot', (v) => {
    ot = v;
    zapomniEkranno('koef.ot', ot);
  });
  vrazhi('#koef-do', (v) => {
    doo = v;
    zapomniEkranno('koef.do', doo);
  });
  vrazhi('#koef-stapka', (v) => {
    stapka = v as Stapka;
    zapomniEkranno('koef.stapka', stapka);
  });
  vrazhi('#koef-koefitsient', (v) => {
    izbran = v;
    zapomniEkranno('koef.koefitsient', izbran);
  });
  vrazhi('#koef-diagrama', (v) => {
    vidD = v as VidDiagrama;
    zapomniEkranno('koef.diagrama', vidD);
  });

  koren.querySelector<HTMLInputElement>('#koef-godishna')?.addEventListener('change', async (e) => {
    kamGodina = (e.target as HTMLInputElement).checked;
    zapomniEkranno('koef.godishna', kamGodina);
    await prerisuvay();
  });
}
