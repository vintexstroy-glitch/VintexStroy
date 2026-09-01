/**
 * ЧЕРВЕНИЯТ СПИСЪК · трите авто-дела на едно място (резен 39 · M07).
 *
 * „**Да — върни авто-делата (вноска/преписка/среща → дело, червен списък)**"
 * *(р65·[68])*.
 *
 * Блокът стои в Управление, над таблицата с делата — там, където живеят делата.
 * Отделен екран щеше да иска втори поглед сутрин; отделна колона в таблицата
 * щеше да смеси записани дела със сметнати, а сметнатото не се редактира.
 *
 * ЧЕТЕ, НЕ ПИШЕ. Нито един бутон тук не води до Вратата: авто-делото се затваря
 * през ИЗВОРА си — плащаш вноската, взимаш преписката, провеждаш срещата.
 */

import {
  avtoDelata,
  cherveniyatSpisak,
  kreditiBezPlan,
  NAPRED_DNI,
  sveriAvtoDelata,
  type AvtoDelo,
} from '../src/domein/avtodela.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { ekraniraj } from './obshto.js';
import {
  filtriray,
  glaviTh,
  poleZaTarsene,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';

/** Как се чете едно „остават N дни" на човешки. */
function dumiZaDni(dni: number): string {
  if (dni < 0) return `просрочено с ${-dni} дни`;
  if (dni === 0) return 'днес';
  if (dni === 1) return 'утре';
  return `след ${dni} дни`;
}

/** Колоните за двигателя на филтрите (резен 75б · И124 т.2). */
const KOLONI_S_FILTAR: readonly KolonaSFiltar<AvtoDelo>[] = [
  { klyuch: 'izvor', ime: 'Извор', vid: 'tekst', vzemi: (a) => a.izvor },
  { klyuch: 'ime', ime: 'Какво', vid: 'tekst', vzemi: (a) => a.ime },
  { klyuch: 'kogo', ime: 'С кого', vid: 'tekst', vzemi: (a) => (a.kogo === '' ? '—' : a.kogo) },
  { klyuch: 'do', ime: 'Срок', vid: 'data', vzemi: (a) => a.do },
  { klyuch: 'dni', ime: 'Остават', vid: 'chislo', vzemi: (a) => a.dni },
];

export function narisuvayAvtoDelata(o: Ogledalo, dnes: string): string {
  const avto = avtoDelata(o, dnes);
  const cherveni = cherveniyatSpisak(avto);
  const bezPlan = kreditiBezPlan(o, dnes);
  const sv = sveriAvtoDelata(o, dnes, dnes);
  const filtrirani = filtriray('avtodela', avto, KOLONI_S_FILTAR, dnes);

  return `
    <section data-sektsiya="avtodela">
      <div class="dyalglava">
        <h3>Червеният списък · авто-дела</h3>
        <span data-avtodela-broy="${cherveni.length}">${
          cherveni.length === 0
            ? `нищо не гори · ${avto.length} чакат напред`
            : `${cherveni.length} горят · от ${avto.length} напред`
        }</span>
      </div>

      ${
        avto.length === 0
          ? `<p class="prazno">Нищо не чака в следващите ${NAPRED_DNI} дни.</p>`
          : `${poleZaTarsene('avtodela')}<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="avtodela">
          <thead>
            <tr>${glaviTh('avtodela', KOLONI_S_FILTAR, avto, dnes)}</tr>
          </thead>
          <tbody>${filtrirani.redove
            .map(
              (a) => `
            <tr data-avtodelo="${ekraniraj(a.izvorId)}" data-izvor="${ekraniraj(a.izvor)}"
                data-svetofar="${a.svetofar}">
              <td>${ekraniraj(a.izvor)}</td>
              <td translate="no">${ekraniraj(a.ime)}</td>
              <td translate="no">${a.kogo === '' ? '—' : ekraniraj(a.kogo)}</td>
              <td translate="no">${ekraniraj(a.do)}</td>
              <td translate="no">${dumiZaDni(a.dni)}</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>${redZaSkritoto(filtrirani, 'avtodela')}`
      }

      <p class="drebno">Тези редове се СМЯТАТ и не се записват: авто-делото не се
      редактира и не се маркира като завършено — затваря се ИЗВОРЪТ му, и редът
      си отива сам.</p>

      ${
        bezPlan.length === 0
          ? ''
          : `<p class="drebno" data-avtodela-bezplan="${bezPlan.length}">Без авто-дело
      остават ${bezPlan.length} кредита, защото вноската им не стига за лихвата:
      <b translate="no">${bezPlan.map((i) => ekraniraj(i)).join(' · ')}</b>. Мълчаливата
      липса щеше да изглежда като „нищо не чака" точно при най-зле стоящия кредит.</p>`
      }

      <p class="drebno" data-avtodela-sverka>Сверка вход↔изход: ${sv.vhod} ангажимента →
      ${sv.izhod} показани и пропуснати, разлика ${sv.razlika}.</p>
    </section>`;
}
