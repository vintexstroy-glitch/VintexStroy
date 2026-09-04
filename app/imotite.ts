/**
 * ТАБЛИЦАТА НА ИМОТИТЕ · един рисувач, две места (резен 99 · ADR-157).
 *
 * Имотът получи своя същност: „Има едно ниво създаване на Имот. Там избираш
 * само Имот като **стойност, квадратура** и всички неща от общите колоните на
 * Управление и Сметки" (И131 т.2), а полетата са трите — „Само Стойност ·
 * Квадратура · Състояние" (И132).
 *
 * ═══ ЕДИН РИСУВАЧ, ДВА НАБОРА КОЛОНИ ═══
 *
 * Имоти показва ЦЕЛИЯ ред (парите, площта, състоянието, броя обекти); Управление
 * показва онова, което върши работа ДО делата — кой имот, чия фирма, кой е
 * записал, колко дела. Две таблици с два ръчно написани реда се разминават при
 * първата нова колона; затова редът се рисува ВЕДНЪЖ, а всеки екран подава
 * своя списък колони.
 *
 * ═══ БЕЛЕГЪТ Е РАЗЛИЧЕН НАРОЧНО ═══
 *
 * `data-imot` живее само тук, `data-myasto` — само в Управление. Един и същ
 * белег в два екрана прави голия селектор двусмислен, а проходът чете първото
 * съвпадение на страницата (обход Б на честността). Стойността му е ИЗПИСАНОТО
 * име: смяната на правописа е смяна на реда, и §109 го пази.
 *
 * ═══ НЕВПИСАНИЯТ РЕД ═══
 *
 * Имот, който съществува само защото под него виси Обект, се РЕДИ — със знак
 * „невписан". Негово, 03.09, за старите обекти без вписан имот: „Няма такива.
 * Да се пита, провери или да се измисли и да може да се редактира." Скрит ред
 * би значел обект без дом на екрана; знакът казва какво липсва (правило 15).
 */

import type { RedNaMyasto } from '../src/domein/mesta.js';
import { DUMITE } from '../src/domein/dumite.js';
import {
  filtriray,
  glaviTh,
  poleZaTarsene,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';
import { kvSmVM2 } from '../src/kalkulator/chetene.js';
import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import { butonIstoriya } from './istoriya.js';
import { sashtnostNaMyastoto } from '../src/domein/mesta.js';

/** Колоните на ИМОТИ · целият ред, с трите му полета. */
export const KOLONI_IMOTITE: readonly KolonaSFiltar<RedNaMyasto>[] = [
  { klyuch: 'ime', ime: DUMITE.imot, vid: 'tekst', vzemi: (r) => r.ime },
  { klyuch: 'stoynost', ime: 'Стойност', vid: 'evro', vzemi: (r) => r.stoynost_st },
  // Квадратурата пътува като „1 240,5" — сравнителят чете българския запис.
  {
    klyuch: 'kvadratura',
    ime: 'Квадратура',
    vid: 'chislo',
    vzemi: (r) => (r.kvadratura_kvsm > 0 ? kvSmVM2(r.kvadratura_kvsm) : ''),
  },
  {
    klyuch: 'sastoyanie',
    ime: 'Състояние',
    vid: 'tekst',
    vzemi: (r) => (r.sastoyanie === '' ? 'още не е казано' : r.sastoyanie),
  },
  { klyuch: 'obekti', ime: DUMITE.obekt + 'и', vid: 'chislo', vzemi: (r) => r.obekti },
  { klyuch: 'dela', ime: 'Дела', vid: 'chislo', vzemi: (r) => r.dela },
  { klyuch: 'firma', ime: 'Фирма · управлява имота', vid: 'tekst', vzemi: (r) => r.firma },
  // ПАПКАТА · филтрира се по „има/няма", не по адреса: адресът е дълъг низ,
  // който никой не помни, а въпросът е „кои имоти нямат папка" (както в Обекти).
  { klyuch: 'papka', ime: 'Папка', vid: 'tekst', vzemi: (r) => (r.papka === '' ? 'без папка' : 'има папка') },
  { klyuch: 'koy', ime: 'Записал', vid: 'tekst', vzemi: (r) => r.koy },
];

/** Колоните в УПРАВЛЕНИЕ · до делата стои онова, което им трябва. */
export const KOLONI_MESTATA: readonly KolonaSFiltar<RedNaMyasto>[] = [
  { klyuch: 'ime', ime: DUMITE.imot, vid: 'tekst', vzemi: (r) => r.ime },
  { klyuch: 'firma', ime: 'Фирма · управлява имота', vid: 'tekst', vzemi: (r) => r.firma },
  { klyuch: 'koy', ime: 'Записал', vid: 'tekst', vzemi: (r) => r.koy },
  { klyuch: 'dela', ime: 'Дела', vid: 'chislo', vzemi: (r) => r.dela },
];

/** Празното се пише с тире, не с празна клетка: тирето значи „няма", не „забравих". */
function ili(tekst: string): string {
  return tekst === '' ? '<span class="drebno">—</span>' : ekraniraj(tekst);
}

function kletka(r: RedNaMyasto, k: KolonaSFiltar<RedNaMyasto>): string {
  switch (k.klyuch) {
    case 'ime':
      return `<td translate="no"><b>${ekraniraj(r.ime)}</b>${
        r.vpisan ? '' : ' <span class="znachka tiha" data-nevpisan>невписан</span>'
      }</td>`;
    case 'stoynost':
      return `<td class="suma"${r.stoynost_st > 0 ? ` data-st="${r.stoynost_st}"` : ''} translate="no">${
        r.stoynost_st > 0 ? pishi(r.stoynost_st) : '<span class="drebno">—</span>'
      }</td>`;
    case 'kvadratura':
      return `<td class="chislo" translate="no">${
        r.kvadratura_kvsm > 0 ? `${kvSmVM2(r.kvadratura_kvsm)} м²` : '<span class="drebno">—</span>'
      }</td>`;
    case 'sastoyanie':
      return `<td translate="no">${
        r.sastoyanie === ''
          ? '<span class="drebno">още не е казано</span>'
          : `<span class="znachka tiha">${ekraniraj(r.sastoyanie)}</span>`
      }</td>`;
    case 'obekti':
      return `<td class="chislo" translate="no">${r.obekti}</td>`;
    case 'dela':
      return `<td class="chislo" translate="no">${r.dela}</td>`;
    case 'papka':
      return `<td translate="no">${
        r.papka === ''
          ? '<span class="drebno">без папка</span>'
          : `<button type="button" class="vrazka" data-mnogotochie
               title="Менюто на реда · папката се отваря оттам">има папка ⋯</button>`
      }</td>`;
    default:
      return `<td translate="no">${ili(String(k.vzemi(r)))}</td>`;
  }
}

export interface KakDaSeNarisuva {
  /** ключът на таблицата · и на филтрите ѝ */
  readonly tablitsa: string;
  /** белегът на реда · `data-imot` в Имоти, `data-myasto` в Управление */
  readonly beleg: string;
  readonly koloni: readonly KolonaSFiltar<RedNaMyasto>[];
}

/**
 * РИСУВА таблицата · търсене, глави с филтри, редове, ред за скритото.
 *
 * Редовете идват ГОТОВИ (`mestata`): двата екрана вече ги смятат за своята
 * сверка, а втора сметка тук би дала два отговора за едни и същи имоти.
 */
export function tablitsaNaImotite(
  redove: readonly RedNaMyasto[],
  dnes: string,
  n: KakDaSeNarisuva,
): string {
  const dvigatel = filtriray(n.tablitsa, redove, n.koloni, dnes);
  return `${poleZaTarsene(n.tablitsa)}<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="${ekraniraj(n.tablitsa)}">
          <thead>
            <tr>${glaviTh(n.tablitsa, n.koloni, redove, dnes)}<th></th></tr>
          </thead>
          <tbody>${dvigatel.redove
            .map(
              (r) => `
            <tr ${n.beleg}="${ekraniraj(r.ime)}" data-vpisan="${r.vpisan ? 'da' : 'ne'}"
                data-papka-adres="${ekraniraj(r.papka)}">
              ${n.koloni.map((k) => kletka(r, k)).join('')}
              <td>${
                /* ИСТОРИЯТА НА ИМОТА (резен 104 · ADR-165) · датата на всяка смяна на
                   Състоянието Е в Журнала по построение — всяко „МястоЗаписано" на
                   същността, с подписания си `ts`. Нищо не се записва втори път:
                   панелът само чете. Невписаният Имот няма запис — няма и История. */
                r.vpisan ? butonIstoriya('myasto', sashtnostNaMyastoto(r.ime)) : ''
              }<button type="button" class="vtorichen malak" data-mnogotochie
                aria-label="Менюто на реда" title="Менюто на реда">⋯</button></td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>${redZaSkritoto(dvigatel, n.tablitsa)}`;
}
