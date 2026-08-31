/**
 * ГОДИШНИЯТ ФАЙЛ · трите листа на затворената година (резен 28 · ADR-088).
 *
 * Негово: „Става на календарна година автоматично прави пълен годишен архив и
 * променяш само през журнала назад" *(р85·[51])*.
 *
 * ═══ ФАЙЛЪТ СЕ СГЛОБЯВА, НЕ СЕ ПАЗИ ═══
 *
 * Съдържанието на годината е ФУНКЦИЯ от Журнала: същите събития дават същия
 * файл по всяко време. Затова нищо тук не се записва — свалянето е жест на
 * човек, а изгубеният файл се сглобява наново, буква по буква.
 *
 * ═══ ТРИТЕ ЛИСТА ═══
 *
 *   1. ЖУРНАЛ · записите НА ГОДИНАТА, по собствената им дата;
 *   2. МЕСЕЦИТЕ · дванайсетте, с приход и разход;
 *   3. РАВНОСМЕТКА · брой · сбор · кога и от кого е затворена · и колко се
 *      РАЗМИНАВА днес — това е половината смисъл на архива.
 *
 * ═══ ИМЕТО Е НА ЛАТИНИЦА ═══
 *
 * Кирилското име не оцелява през `<a download>` — брузърът го подменя с
 * „download" (платено в резен 22).
 */

import { rabotnaKniga, type List } from './excel.js';
import { godinataNa, godinite, type Godina } from '../domein/godishna-ravnosmetka.js';
import { dataNaZapisa, opisaNaZapisa, sumataNaZapisa } from '../domein/opis-na-zapisa.js';
import { klyuchNaZveno } from '../yadro/sabitie.js';
import { pogaseniteZvena } from '../domein/storno.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Sabitie } from '../yadro/index.js';

/** Стотинки → евро като ЧИСЛО: по текст Excel не смята и не филтрира. */
function evro(st: number): number {
  return st / 100;
}

/** Дванайсетте месеца на годината · като '2025-01' … '2025-12'. */
export function mesetsiteNa(godina: Godina): readonly string[] {
  return Object.freeze(
    Array.from({ length: 12 }, (_, i) => `${godina}-${String(i + 1).padStart(2, '0')}`),
  );
}

/** Лист 1 · записите на годината, по СОБСТВЕНАТА им дата. */
export function listNaZhurnala(sabitiya: readonly Sabitie[], godina: Godina): List {
  const pogaseni = pogaseniteZvena(sabitiya);

  const redove = sabitiya
    .filter((s) => godinataNa(s) === godina)
    .map((s) => {
      const suma = sumataNaZapisa(s);
      return [
        s.seq,
        dataNaZapisa(s),
        s.type,
        s.sashtnost.id,
        opisaNaZapisa(s),
        suma === undefined ? '' : evro(suma),
        // СТОРНИРАНОТО ОСТАВА В ЛИСТА, отбелязано — точно както на екрана
        // (резен 27): „сторнирано" и „никога не е било" не са едно и също.
        pogaseni.has(klyuchNaZveno(s)) ? 'да' : '',
        s.actor,
      ];
    });

  return {
    ime: `Журнал ${godina}`,
    koloni: [
      { ime: 'seq', shirina: 7 },
      { ime: 'Дата', shirina: 12 },
      { ime: 'Тип', shirina: 20 },
      { ime: 'Същност', shirina: 20 },
      { ime: 'Описание', shirina: 40 },
      { ime: 'Сума, €', shirina: 12 },
      { ime: 'Сторнирано', shirina: 11 },
      { ime: 'Кой', shirina: 26 },
    ],
    redove,
  };
}

/** Лист 2 · дванайсетте месеца, с брой и сбор на записите им. */
export function listNaMesetsite(sabitiya: readonly Sabitie[], godina: Godina): List {
  const poMesets = new Map<string, { broy: number; sbor_st: number }>();
  for (const mesets of mesetsiteNa(godina)) poMesets.set(mesets, { broy: 0, sbor_st: 0 });

  for (const s of sabitiya) {
    if (godinataNa(s) !== godina) continue;
    const mesets = dataNaZapisa(s).slice(0, 7);
    const red = poMesets.get(mesets);
    if (red === undefined) continue;
    red.broy += 1;
    red.sbor_st += sumataNaZapisa(s) ?? 0;
  }

  return {
    ime: 'Месеците',
    koloni: [
      { ime: 'Месец', shirina: 12 },
      { ime: 'Записи', shirina: 10 },
      { ime: 'Сума, €', shirina: 14 },
    ],
    redove: [...poMesets].map(([mesets, r]) => [mesets, r.broy, evro(r.sbor_st)]),
  };
}

/**
 * Лист 3 · РАВНОСМЕТКАТА, включително разминаването ДНЕС.
 *
 * Ред „Разминаване" стои дори когато е нула: проверената нула е различна от
 * нулата, за която никой не е питал (правило 7).
 */
export function listNaRavnosmetkata(o: Ogledalo, godina: Godina, dnes: string): List {
  const red = godinite(o, dnes).find((r) => r.godina === godina);
  const z = red?.zatvorena;
  return {
    ime: 'Равносметка',
    koloni: [
      { ime: 'Какво', shirina: 30 },
      { ime: 'Стойност', shirina: 34 },
    ],
    redove: [
      ['Година', godina],
      ['Състояние', red?.sastoyanie ?? 'няма такава година'],
      ['Записи днес', red?.broy ?? 0],
      ['Записи при затварянето', z?.broySabitiya ?? ''],
      ['Разминаване, записи', red?.raznika ?? 0],
      ['Затворена от', z?.koy ?? ''],
      ['Затворена на', z?.kogato ?? ''],
    ],
  };
}

export function godishenFayl(
  sabitiya: readonly Sabitie[],
  o: Ogledalo,
  godina: Godina,
  dnes: string,
): Uint8Array {
  return rabotnaKniga([
    listNaZhurnala(sabitiya, godina),
    listNaMesetsite(sabitiya, godina),
    listNaRavnosmetkata(o, godina, dnes),
  ]);
}

/** Името на файла · ЛАТИНИЦА, инак `<a download>` го подменя с „download". */
export function imetoNaGodishniyaFayl(godina: Godina): string {
  return `GODINA-${godina}.xlsx`;
}
