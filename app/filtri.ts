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
import type { VidStoynost } from '../src/domein/vid-stoynost.js';

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

/** Изборът живее, докато екранът се прерисува — по таблица и колона. */
const izbrano = new Map<string, Set<string>>();
let otvoreno: string | null = null;

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

function podrediGrupi(vid: VidStoynost, grupi: Map<string, number>): [string, number][] {
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
  return redove.sort((a, b) => a[0].localeCompare(b[0], 'bg'));
}

// ── прилагането ───────────────────────────────────────────────────────────
export interface Filtrirano<T> {
  readonly redove: T[];
  /** колко скри филтърът — казва се, не се премълчава */
  readonly skriti: number;
}

export function filtriray<T>(
  tablitsa: string,
  redove: readonly T[],
  koloni: readonly KolonaSFiltar<T>[],
  dnes: string,
): Filtrirano<T> {
  const aktivni = koloni.filter((k) => (izbrano.get(klyuchNa(tablitsa, k.klyuch))?.size ?? 0) > 0);
  if (aktivni.length === 0) return { redove: [...redove], skriti: 0 };

  const ostanali = redove.filter((red) =>
    aktivni.every((k) => izbrano.get(klyuchNa(tablitsa, k.klyuch))!.has(grupaNa(k, red, dnes))),
  );
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
  return `<span class="glavicha${suma ? ' suma' : ''}">
    ${ekraniraj(k.ime)}
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

  return `<span class="filtar-menyu" data-menyu>
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

/** Ред с думи под таблицата, когато филтърът крие нещо. */
export function redZaSkritoto(f: Filtrirano<unknown>, tablitsa: string): string {
  if (f.skriti === 0) return '';
  return `<p class="drebno filtar-skrito">Филтърът крие ${f.skriti} ${
    f.skriti === 1 ? 'ред' : 'реда'
  } · <button type="button" class="vrazka" data-filtar-izchisti-vsichko="${ekraniraj(tablitsa)}">покажи всичко</button></p>`;
}

/** Закача се веднъж на екран — обслужва всички таблици в него. */
export function zakachiFiltri(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
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
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar-izchisti]')) {
    b.addEventListener('click', async () => {
      izbrano.delete(b.dataset['filtarIzchisti']!);
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar-izchisti-vsichko]')) {
    b.addEventListener('click', async () => {
      const tablitsa = b.dataset['filtarIzchistiVsichko']!;
      for (const pald of [...izbrano.keys()]) {
        if (pald.startsWith(`${tablitsa}:`)) izbrano.delete(pald);
      }
      otvoreno = null;
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
}
