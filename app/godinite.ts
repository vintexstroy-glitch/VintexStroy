/**
 * ГОДИНИТЕ · екранът на затварянето (резен 28 · ADR-088).
 *
 * Негово: „Става на календарна година автоматично прави пълен годишен архив и
 * променяш само през журнала назад" *(р85·[51])*.
 *
 * ═══ КАКВО Е „АВТОМАТИЧНО" ТУК ═══
 *
 * Не записът — в целия код няма нито един запис в Журнала без човешки жест,
 * дори месечното начисляване е бутон. Автоматични са ДВЕТЕ неща, които иначе
 * чакат някой да се сети:
 *
 *   1. приключилата година се ЯВЯВА сама, щом дойде 1 януари;
 *   2. разминаването се МЕРИ само, с число и със ЗНАК.
 *
 * ═══ ЗАТВАРЯНЕТО Е АКТ НА ФИРМАТА ═══
 *
 * Дедупликацията по `opId` е в рамките на ЕДНА верига, тъй че двама служители
 * биха записали по едно затваряне всеки. Затова бутонът е на Стопанина, а на
 * другите се КАЗВА, че годината чака него (правило 15: изключено ≠ липсващо).
 */

import { godinite, type RedNaGodina } from '../src/domein/godishna-ravnosmetka.js';
import { godishenFayl, imetoNaGodishniyaFayl } from '../src/iznos/godishen-fayl.js';
import { ekraniraj, svaliFayl } from './obshto.js';
import type { Konteks } from './ekranite.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

const DUMITE: Readonly<Record<RedNaGodina['sastoyanie'], string>> = Object.freeze({
  tekushta: 'тече',
  chaka: 'чака затваряне',
  zatvorena: 'затворена',
  razminava: 'разминава се',
});

/** Разминаването с ДУМИ · знакът значи посока, не сила. */
function razminavaneto(r: RedNaGodina): string {
  if (r.zatvorena === undefined) return '';
  if (r.raznika === 0) return 'няма разминаване';
  const kolko = Math.abs(r.raznika);
  const zapisa = kolko === 1 ? 'запис' : 'записа';
  return r.raznika > 0
    ? `+${kolko} ${zapisa} СЛЕД затварянето`
    : `−${kolko} ${zapisa} са ПОГАСЕНИ след затварянето`;
}

function redat(r: RedNaGodina, negoviyat: boolean): string {
  const z = r.zatvorena;
  return `
    <tr data-godina="${ekraniraj(r.godina)}" data-sastoyanie="${r.sastoyanie}">
      <td translate="no">${ekraniraj(r.godina)}</td>
      <td>${DUMITE[r.sastoyanie]}</td>
      <td class="chislo" translate="no">${r.broy}</td>
      <td class="chislo" translate="no" data-raznika="${r.raznika}">${razminavaneto(r)}</td>
      <td translate="no">${z ? ekraniraj(`${z.kogato.slice(0, 10)} · ${z.koy}`) : ''}</td>
      <td>
        ${
          r.sastoyanie === 'chaka'
            ? negoviyat
              ? `<button type="button" class="glaven" data-zatvori="${ekraniraj(r.godina)}">Затвори ${ekraniraj(r.godina)}</button>`
              : '<span class="drebno">чака Стопанина</span>'
            : ''
        }
        ${
          r.sastoyanie === 'tekushta'
            ? '<span class="drebno">непълна година не е архив</span>'
            : `<button type="button" class="vtorichen" data-svali="${ekraniraj(r.godina)}">Свали файла</button>`
        }
      </td>
    </tr>`;
}

export function sektsiyaGodinite(o: Ogledalo, dnes: string, negoviyat: boolean): string {
  const redove = godinite(o, dnes);
  const chakat = redove.filter((r) => r.sastoyanie === 'chaka').length;
  const razminavat = redove.filter((r) => r.sastoyanie === 'razminava').length;

  return `
    <section data-sektsiya="godinite" data-chakat="${chakat}" data-razminavat="${razminavat}">
      <div class="dyalglava">
        <h2>Годините · пълният годишен архив</h2>
        <span>затварянето е ЕДИН запис · съдържанието се СМЯТА</span>
      </div>

      <p class="drebno"><b>Затворената година не отказва нищо.</b> Негово е
      „променяш само през журнала назад" — позволение, не забрана: поправката
      минава през сторно и нов запис, както навсякъде. Онова, което затварянето
      добавя, е <b>МЯРКАТА</b>: колко се е променила годината, откакто е обявена
      за приключила — и в коя посока.</p>

      ${
        redove.length === 0
          ? '<p class="drebno">Книгата още няма нито един запис — няма и година за затваряне.</p>'
          : `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="godinite">
          <thead>
            <tr>
              <th>Година</th><th>Състояние</th><th class="chislo">Записи</th>
              <th>Разминаване</th><th>Затворена</th><th>Действие</th>
            </tr>
          </thead>
          <tbody>${redove.map((r) => redat(r, negoviyat)).join('')}</tbody>
        </table>
      </div>`
      }

      <p class="drebno" data-godini-nula>${
        chakat === 0
          ? 'Всички приключили години са затворени.'
          : `${chakat} ${chakat === 1 ? 'приключила година чака' : 'приключили години чакат'} затваряне.`
      }</p>
    </section>`;
}

export function zakachiGodinite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
  dnes: string,
): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-zatvori]')) {
    b.addEventListener('click', async () => {
      const godina = b.dataset['zatvori'] ?? '';
      try {
        // `opId` носи ДЕЙСТВИЕТО (правило 20): второ натискане връща същия
        // резултат, вместо да ражда второ затваряне на същата година.
        await k.deystviya.zatvoriGodinata(godina, dnes, { opId: `GODINA:${godina}` });
        k.vest(
          'dobre',
          `Годината ${godina} е затворена. Оттук нататък всяка промяна в нея се БРОИ ` +
            'и се показва — записите ѝ не се отказват.',
        );
      } catch (e) {
        k.vest('zle', e instanceof Error ? e.message : String(e));
      }
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-svali]')) {
    b.addEventListener('click', async () => {
      const godina = b.dataset['svali'] ?? '';
      // ФАЙЛЪТ СЕ СГЛОБЯВА СЕГА · нищо не се пази, значи нищо не остарява.
      const sabitiya = await k.dnevnik.chetiVsichki(k.akaunt);
      const o = await k.deystviya.ogledalo();
      const bajtove = godishenFayl(sabitiya, o, godina, dnes);
      svaliFayl(
        new Blob([bajtove.slice().buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        imetoNaGodishniyaFayl(godina),
      );
      k.vest('dobre', `Свален е ${imetoNaGodishniyaFayl(godina)} · три листа.`);
      await prerisuvay();
    });
  }
}
