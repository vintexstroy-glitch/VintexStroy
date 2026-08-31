/**
 * ПОЛЕТАТА С ФОРМУЛА · в секция Отчети (резен 42 · M11 · И90 · ADR-102).
 *
 * „За финанситее ще хледаш формулата **ще правиш полета в Секция Отчети** където
 * ще се сложар полета които да покзват тези стойности **с формули между всички
 * таблици** нак вероятно." *(И90 · 23.08)*
 *
 * Блокът стои ПОД петте вградени полета на Отчети — те са ЗАКОВАНИ (Капитал,
 * Средства, Вземания, Ликвидност…), а тези са НЕГОВИ. Смесени в един списък,
 * човек не би различил кое е закон и кое е собствен избор.
 *
 * ИЗВОРИТЕ СЕ ЧЕТАТ ОТ ЖИВИЯ КОД. Менюто е групирано по произход — Отчети,
 * Коефициенти, Данни на периода — и броят им се БРОИ, не се твърди в изречение
 * (правило 17 · ADR-067).
 */

import {
  chakashtitePoleta,
  smetniPoleto,
  sveriPoletata,
  type PoleSFormula,
} from '../src/domein/pole-s-formula.js';
import { iztochnitsiteNaChisla, type IztochnikNaChislo } from '../src/domein/iztochnitsi-na-chisla.js';
import { pishi } from '../src/yadro/pari.js';
import { ekraniraj, menyuNaDeystviyata } from './obshto.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Числото според вида си · парите с валутата, останалите като число. */
function chetimo(stoynost: number, vid: string): string {
  if (vid === 'evro') return pishi(stoynost);
  if (vid === 'protsent') return `${(stoynost / 100).toFixed(2).replace('.', ',')} %`;
  return (stoynost / 100).toFixed(2).replace('.', ',');
}

/** Обхватът на един месец · първото и последното му число. */
function obhvatNaMesetsa(mesets: string): { ot: string; do: string } {
  const g = Number(mesets.slice(0, 4));
  const m = Number(mesets.slice(5, 7));
  const posleden = new Date(Date.UTC(g, m, 0)).getUTCDate();
  return { ot: `${mesets}-01`, do: `${mesets}-${String(posleden).padStart(2, '0')}` };
}

export function narisuvayPoletata(o: Ogledalo, mesets: string, dnes: string): string {
  const { ot, do: doo } = obhvatNaMesetsa(mesets);
  const iztochnitsi = iztochnitsiteNaChisla(o, mesets, ot, doo, dnes);
  const poleta: readonly PoleSFormula[] = [...o.poletaSFormula.values()];
  const smetnati = poleta.map((p) => smetniPoleto(p, iztochnitsi));
  const chakat = chakashtitePoleta(poleta, iztochnitsi);
  const sv = sveriPoletata(poleta, iztochnitsi, dnes);

  return `
    <section data-sektsiya="smetki-poleta-formula">
      <div class="dyalglava">
        <h3>Свои полета с формула</h3>
        <span data-izvori="${iztochnitsi.length}">между ВСИЧКИ таблици · ${iztochnitsi.length} извора</span>
      </div>

      <form id="forma-pole">
        <div class="poleta">
          <div class="pole">
            <label for="pf-ime">Име на полето</label>
            <input translate="no" id="pf-ime" name="ime" required autocomplete="off"
                   placeholder="напр. Свободен паричен поток">
          </div>
          <div class="pole">
            <label for="pf-deystvie">Действие</label>
            ${menyuNaDeystviyata('pf-deystvie')}
          </div>
          <div class="pole">
            <label for="pf-lyavo">Първо число</label>
            ${menyuNaIzvorite('pf-lyavo', 'lyavo', iztochnitsi)}
          </div>
          <div class="pole">
            <label for="pf-dyasno">Второ число</label>
            ${menyuNaIzvorite('pf-dyasno', 'dyasno', iztochnitsi)}
          </div>
        </div>
        <p class="greshka" id="greshka-pole"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши полето</button>
          <p class="drebno">Проверката е ПРИ СЪЗДАВАНЕ: счупена формула изобщо не се
          записва. Полето НЕ може да сочи друго поле — плитък граф, проследим с очи.</p>
        </div>
      </form>

      ${
        smetnati.length === 0
          ? '<p class="prazno">Още няма нито едно свое поле.</p>'
          : `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="poleta-formula">
          <thead>
            <tr><th>Поле</th><th>Формула</th><th class="chislo">Стойност</th></tr>
          </thead>
          <tbody>${smetnati
            .map(
              (s) => `
            <!-- СВОЕ ИМЕ, не data-pole: петте ВГРАДЕНИ полета на Отчети вече
                 го носят и стоят НАД тези. Гол селектор четеше чуждото — същата
                 спънка като data-myasto (резен 34) и .prazno (резен 39). -->
            <tr data-svoe-pole="${ekraniraj(s.pole.id)}"${s.stoynost === undefined ? ' data-chaka' : ''}>
              <td translate="no">${ekraniraj(s.pole.ime)}</td>
              <td translate="no">${ekraniraj(s.sDumi)}</td>
              <td class="chislo" translate="no">${
                s.stoynost === undefined
                  ? `<span class="drebno">${ekraniraj(s.zashto)}</span>`
                  : chetimo(s.stoynost, s.vid)
              }</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>`
      }

      ${
        chakat.length === 0
          ? ''
          : `<p class="drebno" data-poleta-chakat="${chakat.length}">${chakat.length} ${
              chakat.length === 1 ? 'поле чака' : 'полета чакат'
            } число, и всяко казва защо. Нула на това място щеше да изглежда като
          сметнат отговор.</p>`
      }

      <p class="drebno" data-poleta-sverka>Сверка вход↔изход: ${sv.vhod} сочени извора →
      ${sv.izhod} намерени, разлика ${sv.razlika}.</p>
    </section>`;
}

/** Менюто, ГРУПИРАНО по произход · „между всички таблици" се вижда с очи. */
function menyuNaIzvorite(id: string, ime: string, iztochnitsi: readonly IztochnikNaChislo[]): string {
  const grupi = [...new Set(iztochnitsi.map((i) => i.otkade))];
  return `<select translate="no" id="${id}" name="${ime}" required>
    ${grupi
      .map(
        (g) => `<optgroup label="${ekraniraj(g)}">${iztochnitsi
          .filter((i) => i.otkade === g)
          .map(
            (i) =>
              `<option value="${ekraniraj(i.klyuch)}">${ekraniraj(i.ime)}${
                i.stoynost === undefined ? ' (чака)' : ''
              }</option>`,
          )
          .join('')}</optgroup>`,
      )
      .join('')}
  </select>`;
}

export function zakachiPoletata(
  koren: HTMLElement,
  k: Konteks,
  mesets: string,
  prerisuvay: () => Promise<void>,
): void {
  const forma = koren.querySelector<HTMLFormElement>('#forma-pole');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-pole')!;
    greshka.textContent = '';
    const d = new FormData(forma);
    try {
      await k.deystviya.zapishiPole(
        crypto.randomUUID(),
        {
          ime: String(d.get('ime') ?? '').trim(),
          deystvie: String(d.get('deystvie') ?? 'sbor'),
          lyavo: String(d.get('lyavo') ?? ''),
          dyasno: String(d.get('dyasno') ?? ''),
        },
        { period: mesets, ...obhvatNaMesetsa(mesets) },
        { opId: `pole:${crypto.randomUUID()}` },
      );
    } catch (err) {
      greshka.textContent = err instanceof Error ? err.message : String(err);
      return;
    }
    await prerisuvay();
  });
}
