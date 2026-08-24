/**
 * ФИНИТЕ ФИЛТРИ · моделът на Уиндоус, пренесен в таблиците на приложението.
 *
 * От снимките на собственика (File Explorer): стрелка във ВСЯКА колонна
 * глава; падащо меню с ОТМЕТКИ по групи стойности; за датите — готови
 * периоди („Днес", „Тази седмица"…); филтрите на колоните се съчетават.
 *
 * Едно правило държи целия модел прост: нищо отметнато = всичко минава.
 * Отметнеш ли групи, редът минава само ако попада в отметната група —
 * по ВСЯКА филтрирана колона едновременно.
 *
 * Един двигател за всички таблици: колоните се описват, не се програмират.
 */

import { ekraniraj } from './imoti.js';
import { eChislo, type VidStoynost } from '../src/domein/vid-stoynost.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/**
 * Видът на колоната идва от ДОМЕЙНА, не се обявява втори път тук.
 *
 * Дотук този файл носеше свой `VidKolona = 'tekst' | 'data' | 'suma'`, а
 * `src/domein/kolonno.ts` носеше друг `VidKolona = 'promenlyva' | 'zatvorena'`
 * — две различни неща с едно име. Негова поправка (23.08) даде третото и
 * истинското: видът на СТОЙНОСТТА живее в колоната. Един факт, един дом
 * (правило 17).
 */
export type { VidStoynost };

export interface KolonaSFiltar<T> {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidStoynost;
  readonly vzemi: (red: T) => string | number;
}

/**
 * Изборът, подредбата и търсенето ЖИВЕЯТ И СЛЕД ПРЕЗАРЕЖДАНЕ.
 *
 * Прозорецът се отваря както е оставен (ADR-022): филтърът от сутринта стои
 * и следобед. Това е ЕКРАННО огледало — какво се гледа, не какво е вярно —
 * затова домът му е паметта на екрана, не Журналът.
 */
const izbrano = new Map<string, Set<string>>();

/** Подредбата на една таблица · една колона, една посока. */
interface Podredba {
  readonly kolona: string;
  readonly nadolu: boolean;
}
const podredbi = new Map<string, Podredba>();

/** Търсеното в цялата таблица · по таблица. */
const tarseno = new Map<string, string>();

/** Отвореното меню е моментно — то нарочно НЕ се помни. */
let otvoreno: string | null = null;

/** Коя търсачка да си върне фокуса след прерисуване — иначе всяка буква го губи. */
let fokusVTarsachka: string | null = null;

// Събуждането: каквото е било запомнено, се чете веднъж при зареждане.
for (const [k, v] of Object.entries(chetiEkranno<Record<string, string[]>>('filtri.izbrano', {}))) {
  izbrano.set(k, new Set(v));
}
for (const [k, v] of Object.entries(chetiEkranno<Record<string, Podredba>>('filtri.podredbi', {}))) {
  podredbi.set(k, v);
}
for (const [k, v] of Object.entries(chetiEkranno<Record<string, string>>('filtri.tarseno', {}))) {
  tarseno.set(k, v);
}

/**
 * ЦИКЪЛЪТ НА ПОДРЕДБАТА · име → нагоре → надолу → изходен ред.
 *
 * Третото щракване ВРЪЩА изходния ред, не оставя някакъв: човекът трябва да
 * може да се прибере там, откъдето е тръгнал — както в Explorer.
 */
export function smeniPodredba(tablitsa: string, kolona: string): void {
  const sega = podredbi.get(tablitsa);
  if (sega?.kolona !== kolona) podredbi.set(tablitsa, { kolona, nadolu: false });
  else if (!sega.nadolu) podredbi.set(tablitsa, { kolona, nadolu: true });
  else podredbi.delete(tablitsa);
  zapomniFiltrite();
}

/** Търсенето на една таблица · празното го маха. */
export function tarsi(tablitsa: string, tekst: string): void {
  if (tekst.trim() === '') tarseno.delete(tablitsa);
  else tarseno.set(tablitsa, tekst);
  zapomniFiltrite();
}

function zapomniFiltrite(): void {
  zapomniEkranno('filtri.izbrano', Object.fromEntries([...izbrano].map(([k, v]) => [k, [...v]])));
  zapomniEkranno('filtri.podredbi', Object.fromEntries(podredbi));
  zapomniEkranno('filtri.tarseno', Object.fromEntries(tarseno));
}

function klyuchNa(tablitsa: string, kolona: string): string {
  return `${tablitsa}:${kolona}`;
}

// ── групите: стойност → група, в която се отмята ──────────────────────────
const GRUPI_SUMA: readonly { ime: string; do_st: number }[] = [
  { ime: 'до 100 €', do_st: 100_00 },
  { ime: '100 – 500 €', do_st: 500_00 },
  { ime: '500 – 1000 €', do_st: 1000_00 },
  { ime: '1000 – 5000 €', do_st: 5000_00 },
  { ime: 'над 5000 €', do_st: Number.POSITIVE_INFINITY },
];

function grupaNaSuma(st: number): string {
  const abs = Math.abs(st);
  return GRUPI_SUMA.find((g) => abs < g.do_st)!.ime;
}

function grupaNaData(iso: string, dnes: string): string {
  const den = String(iso).slice(0, 10);
  if (den === dnes) return 'Днес';
  const otstap = Math.round((Date.parse(`${dnes}T00:00:00Z`) - Date.parse(`${den}T00:00:00Z`)) / 86_400_000);
  if (otstap === 1) return 'Вчера';
  if (otstap > 1 && otstap < 7) return 'Тази седмица';
  return den.slice(0, 7); // месецът, както Explorer групира по-старото
}

function grupaNa<T>(k: KolonaSFiltar<T>, red: T, dnes: string): string {
  const v = k.vzemi(red);
  if (k.vid === 'evro') return grupaNaSuma(Number(v));
  if (k.vid === 'data') return grupaNaData(String(v), dnes);
  const tekst = String(v).trim();
  return tekst === '' ? '(празно)' : tekst;
}

const RED_NA_DATITE = ['Днес', 'Вчера', 'Тази седмица'];

/**
 * РЕДЪТ НА ГРУПИТЕ във филтъра · изнесена нарочно, за да има тест.
 *
 * Тя е чиста функция с истинско правило вътре (числото се подрежда като число),
 * а единственият ѝ път през екрана минава през състояние, което се пали с клик.
 * Правило от проекта: „документ, който твърди нещо без тест, е бележка."
 * Същото важи за код.
 */
export function podrediGrupi(
  vid: VidStoynost,
  grupi: Map<string, number>,
): [string, number][] {
  const redove = [...grupi.entries()];
  if (vid === 'evro') {
    const red = GRUPI_SUMA.map((g) => g.ime);
    return redove.sort((a, b) => red.indexOf(a[0]) - red.indexOf(b[0]));
  }
  if (vid === 'data') {
    return redove.sort((a, b) => {
      const ia = RED_NA_DATITE.indexOf(a[0]);
      const ib = RED_NA_DATITE.indexOf(b[0]);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return b[0].localeCompare(a[0]); // месеците — най-новите отгоре
    });
  }
  /**
   * ЧИСЛОВАТА КОЛОНА СЕ ПОДРЕЖДА КАТО ЧИСЛО, не като текст.
   *
   * Без това „10" идва преди „9", а „100" преди „20" — защото `localeCompare`
   * сравнява знак по знак. Във филтър на числова колона това не е разкрасяване:
   * списъкът изглежда разбъркан и човек спира да му вярва.
   *
   * `evro` има свои групи (до 100 € и т.н.); `chislo` и `protsent` носят самата
   * стойност и затова се нуждаят от този ред. Оттук идва `eChislo` — тя пита
   * „изобщо число ли е", отделно от „пари ли е" (`ePari`).
   */
  if (eChislo(vid)) {
    return redove.sort((a, b) => {
      const ca = chislo(a[0]);
      const cb = chislo(b[0]);
      // „(празно)" и всичко нечислово пада НАКРАЯ, подредено по азбука —
      // иначе NaN мълчаливо би разбъркал целия списък.
      if (ca === null && cb === null) return a[0].localeCompare(b[0], 'bg');
      if (ca === null) return 1;
      if (cb === null) return -1;
      return ca - cb;
    });
  }
  return redove.sort((a, b) => a[0].localeCompare(b[0], 'bg'));
}

/** Числото зад текста на групата, или `null`, ако там няма число. */
function chislo(tekst: string): number | null {
  // Неразделимият интервал е РАЗДЕЛИТЕЛ НА ХИЛЯДИ в нашия формат, не част от
  // числото; десетичната запетая е български, не английски знак.
  const chist = tekst.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (chist === '' || !/^-?\d+(\.\d+)?%?$/.test(chist)) return null;
  return Number(chist.replace('%', ''));
}

// ── подредбата ────────────────────────────────────────────────────────────
const AZBUKA = new Intl.Collator('bg');

/**
 * СРАВНИТЕЛЯТ ПО ВИД · колоната казва как се подрежда (ADR-014).
 *
 * Евро, число и процент се сравняват като ЧИСЛА — иначе „10" идва преди „9".
 * Датата е ISO текст и се сравнява като текст (това Е хронологията ѝ).
 * Текстът минава през българската азбука: „я" след „б", не по кодови точки.
 * Нечисло в числова колона пада НАКРАЯ, не разбърква средата.
 */
export function sravnitel(vid: VidStoynost): (a: string | number, b: string | number) => number {
  if (vid === 'evro' || eChislo(vid)) {
    return (a, b) => {
      const ca = Number(a);
      const cb = Number(b);
      const na = Number.isNaN(ca);
      const nb = Number.isNaN(cb);
      if (na && nb) return AZBUKA.compare(String(a), String(b));
      if (na) return 1;
      if (nb) return -1;
      return ca - cb;
    };
  }
  if (vid === 'data') return (a, b) => String(a).localeCompare(String(b));
  return (a, b) => AZBUKA.compare(String(a), String(b));
}

// ── прилагането ───────────────────────────────────────────────────────────
export interface Filtrirano<T> {
  readonly redove: T[];
  /** колко скриха филтърът и търсенето — казва се, не се премълчава */
  readonly skriti: number;
}

/** Търсеното и стойността, сведени еднакво — за да се намира „Строй" в „СТРОЙПЛАСТ". */
function svedeno(tekst: string): string {
  return tekst.normalize('NFC').toLowerCase();
}

export function filtriray<T>(
  tablitsa: string,
  redove: readonly T[],
  koloni: readonly KolonaSFiltar<T>[],
  dnes: string,
): Filtrirano<T> {
  const aktivni = koloni.filter((k) => (izbrano.get(klyuchNa(tablitsa, k.klyuch))?.size ?? 0) > 0);

  let ostanali =
    aktivni.length === 0
      ? [...redove]
      : redove.filter((red) =>
          aktivni.every((k) => izbrano.get(klyuchNa(tablitsa, k.klyuch))!.has(grupaNa(k, red, dnes))),
        );

  // ТЪРСЕНЕТО реже след филтрите · по всички описани колони, без регистър.
  const iskano = svedeno(tarseno.get(tablitsa) ?? '').trim();
  if (iskano !== '') {
    ostanali = ostanali.filter((red) =>
      koloni.some((k) => svedeno(String(k.vzemi(red))).includes(iskano)),
    );
  }

  // ПОДРЕДБАТА е последна — тя не крие, само нарежда. Изходният ред се пази:
  // третото щракване връща точно него, не някакво „приблизително старо".
  const p = podredbi.get(tablitsa);
  const kolona = p && koloni.find((k) => k.klyuch === p.kolona);
  if (p && kolona) {
    const sravni = sravnitel(kolona.vid);
    ostanali = [...ostanali].sort((a, b) => sravni(kolona.vzemi(a), kolona.vzemi(b)));
    if (p.nadolu) ostanali.reverse();
  }

  return { redove: ostanali, skriti: redove.length - ostanali.length };
}

// ── рисуването ────────────────────────────────────────────────────────────
/** Заглавна клетка със стрелка — като колонна глава в Explorer. */
export function glavaSFiltar<T>(
  tablitsa: string,
  k: KolonaSFiltar<T>,
  redove: readonly T[],
  dnes: string,
  suma = false,
): string {
  const pald = klyuchNa(tablitsa, k.klyuch);
  const broy = izbrano.get(pald)?.size ?? 0;
  const podredba = podredbi.get(tablitsa);
  const aktivnaPodredba = podredba?.kolona === k.klyuch;
  // Името на колоната Е бутонът за подредба — както в Explorer и Excel:
  // клик подрежда нагоре, втори клик надолу, трети връща изходния ред.
  return `<span class="glavicha${suma ? ' suma' : ''}">
    <button type="button" class="ime-kolona${aktivnaPodredba ? ' podredena' : ''}"
      data-podredi="${ekraniraj(pald)}"
      aria-label="Подреди по ${ekraniraj(k.ime)}">${ekraniraj(k.ime)}${
        aktivnaPodredba ? (podredba!.nadolu ? ' ↓' : ' ↑') : ''
      }</button>
    <button type="button" class="strelka${broy ? ' aktivna' : ''}" data-filtar-glava="${ekraniraj(pald)}"
      aria-label="Филтър по ${ekraniraj(k.ime)}">${broy ? '▼' : '▾'}</button>
    ${otvoreno === pald ? menyu(tablitsa, k, redove, dnes) : ''}
  </span>`;
}

function menyu<T>(
  tablitsa: string,
  k: KolonaSFiltar<T>,
  redove: readonly T[],
  dnes: string,
): string {
  const pald = klyuchNa(tablitsa, k.klyuch);
  const izbor = izbrano.get(pald) ?? new Set<string>();

  const grupi = new Map<string, number>();
  for (const red of redove) {
    const g = grupaNa(k, red, dnes);
    grupi.set(g, (grupi.get(g) ?? 0) + 1);
  }

  // Търсачката стеснява СПИСЪКА С ОТМЕТКИ на живо, без прерисуване — точно
  // както във филтъра на Explorer. Показва се, щом групите станат много.
  const sTarsachka = grupi.size > 8;
  return `<span class="filtar-menyu" data-menyu>
    ${sTarsachka ? '<input translate="no" type="text" class="filtar-tarsi" data-filtar-tarsi placeholder="търси…" autocomplete="off">' : ''}
    ${podrediGrupi(k.vid, grupi)
      .map(
        ([grupa, broy]) => `<label class="otmetka">
        <input type="checkbox" data-filtar-grupa="${ekraniraj(pald)}" value="${ekraniraj(grupa)}"
          ${izbor.has(grupa) ? 'checked' : ''}>
        <span>${ekraniraj(grupa)}</span><b>${broy}</b>
      </label>`,
      )
      .join('')}
    ${
      izbor.size
        ? `<button type="button" class="izchisti-filtar" data-filtar-izchisti="${ekraniraj(pald)}">Изчисти филтъра</button>`
        : ''
    }
  </span>`;
}

/**
 * ТЪРСЕНЕ В ЦЯЛАТА ТАБЛИЦА · реже по всички описани колони, без регистър.
 *
 * „Намери фактурата на Стройпласт от март" дотук минаваше през износ в Excel.
 * Скритото от търсенето се брои в същия ред „Филтърът крие N реда" — търсенето
 * Е филтър и спазва същото правило: пипа екрана, нищо друго (правило 23).
 */
export function poleZaTarsene(tablitsa: string): string {
  const stoynost = tarseno.get(tablitsa) ?? '';
  return `<label class="tarsene-v-tablitsa">
    <input translate="no" type="search" data-tarsi-tablitsa="${ekraniraj(tablitsa)}" value="${ekraniraj(stoynost)}"
      placeholder="Търси в таблицата…" autocomplete="off" aria-label="Търси в таблицата">
  </label>`;
}

/** Ред с думи под таблицата, когато филтърът крие нещо. */
export function redZaSkritoto(f: Filtrirano<unknown>, tablitsa: string): string {
  if (f.skriti === 0) return '';
  return `<p class="drebno filtar-skrito">Филтърът крие ${f.skriti} ${
    f.skriti === 1 ? 'ред' : 'реда'
  } · <button type="button" class="vrazka" data-filtar-izchisti-vsichko="${ekraniraj(tablitsa)}">покажи всичко</button></p>`;
}

/** Закача се веднъж на екран — обслужва всички таблици в него. */
export function zakachiFiltri(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  // ── подредбата: име → нагоре → надолу → изходен ред ──
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-podredi]')) {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pald = b.dataset['podredi']!;
      const dvoetochie = pald.indexOf(':');
      smeniPodredba(pald.slice(0, dvoetochie), pald.slice(dvoetochie + 1));
      await prerisuvay();
    });
  }

  // ── търсенето в цялата таблица · фокусът се пази през прерисуването ──
  for (const pole of koren.querySelectorAll<HTMLInputElement>('[data-tarsi-tablitsa]')) {
    pole.addEventListener('input', async () => {
      const tablitsa = pole.dataset['tarsiTablitsa']!;
      tarsi(tablitsa, pole.value);
      fokusVTarsachka = tablitsa;
      await prerisuvay();
    });
  }

  // ── търсачката ВЪТРЕ в менюто · чисто DOM, без прерисуване ──
  for (const pole of koren.querySelectorAll<HTMLInputElement>('[data-filtar-tarsi]')) {
    pole.addEventListener('click', (e) => e.stopPropagation());
    pole.addEventListener('input', () => {
      const iskano = pole.value.normalize('NFC').toLowerCase().trim();
      const menyuto = pole.closest('[data-menyu]')!;
      for (const otmetka of menyuto.querySelectorAll<HTMLElement>('.otmetka')) {
        const tekst = otmetka.textContent!.normalize('NFC').toLowerCase();
        otmetka.hidden = iskano !== '' && !tekst.includes(iskano);
      }
    });
    // Менюто току-що се е отворило — търсачката е първото, което човек иска.
    pole.focus();
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar-glava]')) {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pald = b.dataset['filtarGlava']!;
      otvoreno = otvoreno === pald ? null : pald;
      await prerisuvay();
    });
  }

  for (const kutiyka of koren.querySelectorAll<HTMLInputElement>('[data-filtar-grupa]')) {
    kutiyka.addEventListener('change', async () => {
      const pald = kutiyka.dataset['filtarGrupa']!;
      const izbor = izbrano.get(pald) ?? new Set<string>();
      if (kutiyka.checked) izbor.add(kutiyka.value);
      else izbor.delete(kutiyka.value);
      izbrano.set(pald, izbor);
      zapomniFiltrite();
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar-izchisti]')) {
    b.addEventListener('click', async () => {
      izbrano.delete(b.dataset['filtarIzchisti']!);
      zapomniFiltrite();
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar-izchisti-vsichko]')) {
    b.addEventListener('click', async () => {
      const tablitsa = b.dataset['filtarIzchistiVsichko']!;
      for (const pald of [...izbrano.keys()]) {
        if (pald.startsWith(`${tablitsa}:`)) izbrano.delete(pald);
      }
      // „Покажи всичко" маха и търсенето — то също крие редове. Подредбата
      // остава: тя нарежда, не крие.
      tarseno.delete(tablitsa);
      otvoreno = null;
      zapomniFiltrite();
      await prerisuvay();
    });
  }

  // Щракване извън менюто го затваря — както в Explorer.
  koren.addEventListener('click', async (e) => {
    if (otvoreno === null) return;
    const tsel = e.target as HTMLElement;
    if (tsel.closest('[data-menyu]') || tsel.closest('[data-filtar-glava]')) return;
    otvoreno = null;
    await prerisuvay();
  });

  // Прерисуването строи нов DOM и убива фокуса — а човекът е насред дума.
  // Тук търсачката си го връща, с курсора В КРАЯ, не в началото.
  if (fokusVTarsachka !== null) {
    const pole = koren.querySelector<HTMLInputElement>(
      `[data-tarsi-tablitsa="${fokusVTarsachka}"]`,
    );
    fokusVTarsachka = null;
    if (pole) {
      pole.focus();
      pole.setSelectionRange(pole.value.length, pole.value.length);
    }
  }
}
