/**
 * ПЛАЩАНИЯ АРХИВ · четиринайсетият екран, СЛЕД Продажби (резен 22 · ADR-082).
 *
 * Негово: таб „ПЛащания Архив" *„сложен след Продажби Архив"*, а в него
 * „сумарно за всяка седмица" — Заплати, Фактури Кеш, Фактури Карта, с бутон,
 * който сваля една екселска таблица *(р52·[288])*.
 *
 * ═══ ЦЕЛИЯТ ЕКРАН Е ОГЛЕДАЛО ═══
 *
 * Тук няма НИТО ЕДИН път към Вратата. Редовете се смятат от заплатите и от
 * разходите; свалянето не ражда събитие. Затова сторнирана заплата пада оттук
 * сама, а „сумарно" не може да се размине с онова, което го събира.
 *
 * И точно затова екранът няма `iskaRolya`: няма действие, което да се заключва.
 * Кой какво вижда, решават ролята при доставчика и колонното право (правило 23).
 */

import { ekraniraj, svaliFayl } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { pishi } from '../src/yadro/pari.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  IMENATA_NA_VIDOVETE,
  kletkata,
  KOLONI_PLASHTANIYA_ARHIV,
  koloniteNaVida,
  PARICHNI_PLASHTANIYA,
  sedmitsataZaEkrana,
  sedmitsiSPlashtaniya,
  VIDOVE_PLASHTANE,
  ZATVORENI_PLASHTANIYA,
  type RedNaPlashtane,
} from '../src/domein/plashtaniya-arhiv.js';
import { imetoNaSedmichniyaFayl, sedmichenFayl } from '../src/iznos/sedmichen-fayl.js';
import { sedmitsataNa } from '../src/domein/zaplati.js';
import { ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Коя седмица е отворена · ПОГЛЕД, нула събития (ADR-022). */
function izbranata(o: Ogledalo, dnes: string): string {
  const zapomneno = chetiEkranno('plashtaniya.sedmitsa', '');
  if (zapomneno !== '') return zapomneno;
  return sedmitsiSPlashtaniya(o)[0] ?? sedmitsataNa(dnes);
}

/** Какво пише в клетката на ЕКРАНА · парите се изписват, останалото — както е. */
function tekstNaKletkata(r: RedNaPlashtane, kolona: string): string {
  const stoynost = kletkata(r, kolona);
  if (stoynost === '') return '—';
  if (PARICHNI_PLASHTANIYA.includes(kolona)) return pishi(Number(stoynost));
  return String(stoynost);
}

export function narisuvayPlashtaniyaArhiv(o: Ogledalo, dnes: string): string {
  const sedmitsa = izbranata(o, dnes);
  const s = sedmitsataZaEkrana(o, sedmitsa, `${dnes}T00:00:00.000Z`);
  const vsichki = sedmitsiSPlashtaniya(o);

  return `
    <section data-sektsiya="plashtaniya-arhiv" data-sedmitsa="${ekraniraj(sedmitsa)}">
      <div class="dyalglava">
        <h2>Плащания Архив · ${ekraniraj(sedmitsa)}</h2>
        <span translate="no">${ekraniraj(s.ot)} – ${ekraniraj(s.do_)}</span>
      </div>

      <div class="plochki">
        ${s.sborove
          .map(
            (v) => `<div class="plochka" data-vid="${ekraniraj(v.vid)}">
          <span class="etiket">${ekraniraj(v.ime)}</span>
          <span class="chislo" translate="no" data-suma="${v.suma_st}">${pishi(v.suma_st)}</span>
          <span class="pod">${v.broy} ${v.broy === 1 ? 'ред' : 'реда'}</span>
        </div>`,
          )
          .join('')}
        <div class="plochka">
          <span class="etiket">Общо за седмицата</span>
          <span class="chislo" translate="no" data-obshto="${s.obshto_st}">${pishi(
            s.obshto_st,
          )}</span>
          <span class="pod">трите вида, събрани</span>
        </div>
      </div>

      ${
        vsichki.length === 0
          ? ''
          : `<label class="pole">
          <span>Седмица</span>
          <select translate="no" id="plashtaniya-sedmitsa">
            ${vsichki
              .map(
                (x) =>
                  `<option value="${ekraniraj(x)}"${x === sedmitsa ? ' selected' : ''}>${ekraniraj(
                    x,
                  )}</option>`,
              )
              .join('')}
          </select>
        </label>`
      }

      <div class="redditsa">
        <button type="button" id="plashtaniya-svali">Свали седмицата</button>
        <span class="drebno">три листа · ${ekraniraj(
          VIDOVE_PLASHTANE.map((v) => IMENATA_NA_VIDOVETE[v]).join(' · '),
        )}</span>
      </div>
      <p class="greshka" id="greshka-plashtaniya"></p>

      <div class="tablitsa" data-tablitsa="plashtaniya-arhiv">
        <div class="red glava plashtred" translate="no">
          ${KOLONI_PLASHTANIYA_ARHIV.map(
            (k, i) =>
              `<span class="kletka${
                ZATVORENI_PLASHTANIYA.includes(i) ? ' zatvorena' : ''
              }" data-kolona="${ekraniraj(k)}">${ekraniraj(k)}</span>`,
          ).join('')}
        </div>
        ${
          s.redove.length === 0
            ? '<p class="drebno">Няма нито едно плащане за тази седмица. Файлът пак се сваля — с трите листа и нула реда, защото „нямаше карта" и „нямаше карта ТАЗИ седмица" не са едно и също.</p>'
            : s.redove
                .map(
                  (r) => `
        <div class="red plashtred" translate="no" data-plashtane="${ekraniraj(r.id)}"
             data-vid="${ekraniraj(r.vid)}" data-suma="${r.suma_st}">
          ${KOLONI_PLASHTANIYA_ARHIV.map(
            (k) =>
              `<span class="kletka${PARICHNI_PLASHTANIYA.includes(k) ? ' suma' : ''}${
                ZATVORENI_PLASHTANIYA.includes(KOLONI_PLASHTANIYA_ARHIV.indexOf(k))
                  ? ' zatvorena'
                  : ''
              }">${ekraniraj(tekstNaKletkata(r, k))}</span>`,
          ).join('')}
        </div>`,
                )
                .join('')
        }
      </div>

      <p class="drebno"><b>Тук нищо не се записва.</b> Редът е ОГЛЕДАЛО на вече
      записаното — заплатата от таба Заплати, фактурата от Разходи по потока
      „Фактури". Затова сторнирана заплата пада оттук сама, а второ въвеждане
      няма как да даде две истини за едно плащане.</p>

      <p class="drebno"><b>Празната клетка е честна.</b> Заплата няма номер на
      фактура, а фактура няма дни — тирето значи „няма", не нула. „Място" при
      фактура е празно, защото разходът още не носи проект.</p>

      <p class="drebno"><b>Фактурите по БАНКА не влизат.</b> Негово: те „няма да
      се въвеждат ръчно, а ще се обобщават от извлеченията". Тук са само кеш и
      карта — трите вида, които той изброи.</p>

      <section data-sektsiya="plashtaniya-sverka">
        <div class="dyalglava">
          <h2>Сверка вход↔изход</h2>
          <span data-nared="${s.sverka.nared ? 'da' : 'ne'}">${
            s.sverka.nared ? 'затваря' : 'НЕ затваря'
          }</span>
        </div>
        <p class="drebno" translate="no" data-razlika="${s.sverka.razlika}">
          вход <b>${pishi(s.sverka.vhod)}</b> · изход <b>${pishi(s.sverka.izhod)}</b> ·
          разлика <b>${pishi(s.sverka.razlika)}</b>
        </p>
        <p class="drebno">${ekraniraj(ZASHTO_I_NULATA)} Входът се смята по ВТОРИ,
        независим път — направо от заплатите и от разходите — за да може сверката
        изобщо да падне.</p>
      </section>
    </section>`;
}

export function zakachiPlashtaniyaArhiv(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren
    .querySelector<HTMLSelectElement>('#plashtaniya-sedmitsa')
    ?.addEventListener('change', async (e) => {
      zapomniEkranno('plashtaniya.sedmitsa', (e.target as HTMLSelectElement).value);
      await prerisuvay();
    });

  koren.querySelector<HTMLButtonElement>('#plashtaniya-svali')?.addEventListener('click', async () => {
    const kazhi = koren.querySelector<HTMLElement>('#greshka-plashtaniya')!;
    kazhi.textContent = '';
    const sedmitsa =
      koren.querySelector<HTMLElement>('[data-sektsiya=plashtaniya-arhiv]')?.dataset['sedmitsa'] ??
      '';
    try {
      // Огледалото се иска НАНОВО, не се затваря в рисуването: между рисуването
      // и клика може да е влязло сторно, и файлът трябва да носи истината от
      // мига на свалянето, не от мига на показването.
      const o = await k.deystviya.ogledalo();
      const s = sedmitsataZaEkrana(o, sedmitsa, new Date().toISOString());
      const bajtove = sedmichenFayl(s.redove);
      svaliFayl(
        new Blob([bajtove.slice().buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        imetoNaSedmichniyaFayl(sedmitsa),
      );
      k.vest(
        'dobre',
        `Седмица ${sedmitsa} е свалена: ${s.redove.length} реда в три листа. ` +
          'Свалянето не ражда събитие — то е поглед, не запис.',
      );
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
