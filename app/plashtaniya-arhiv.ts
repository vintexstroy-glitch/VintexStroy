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
import { menyuOtZhivi } from './menyu.js';
import { predlagani, type Menyu } from '../src/domein/padashti-menyuta.js';
import {
  IMENATA_NA_VIDOVETE,
  kletkata,
  KOLONI_PLASHTANIYA_ARHIV,
  koloniteNaVida,
  PARICHNI_PLASHTANIYA,
  BEZ_KATEGORIYA,
  sedmitsataZaEkrana,
  sedmitsiSPlashtaniya,
  VIDOVE_PLASHTANE,
  ZATVORENI_PLASHTANIYA,
  type RedNaPlashtane,
} from '../src/domein/plashtaniya-arhiv.js';
import {
  filtriray,
  glaviNaTablitsata,
  poleZaTarsene,
  PRAZEN_FILTAR,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';
import { imetoNaSedmichniyaFayl, sedmichenFayl } from '../src/iznos/sedmichen-fayl.js';
import { sedmitsataNa } from '../src/domein/zaplati.js';
import { ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/**
 * КОЛОНИТЕ ЗА ДВИГАТЕЛЯ НА ФИЛТРИТЕ (резен 75б · И124 т.2) · извеждат се от
 * закования списък (правило 17): парите по `PARICHNI_PLASHTANIYA`, датата по
 * името си, останалото е текст; затворените — по `ZATVORENI_PLASHTANIYA`.
 */
const KOLONI_S_FILTAR: readonly KolonaSFiltar<RedNaPlashtane>[] = KOLONI_PLASHTANIYA_ARHIV.map(
  (k, i) => ({
    klyuch: k,
    ime: k,
    vid: PARICHNI_PLASHTANIYA.includes(k) ? 'evro' : k === 'Дата' ? 'data' : 'tekst',
    vzemi: (r: RedNaPlashtane) =>
      PARICHNI_PLASHTANIYA.includes(k)
        ? Number(kletkata(r, k) || 0)
        : String(kletkata(r, k) === '' ? '—' : kletkata(r, k)),
    zatvorena: ZATVORENI_PLASHTANIYA.includes(i),
  }),
);

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

/**
 * МЕНЮТО НА КАТЕГОРИИТЕ · „меню от Описа" *(р69·[50])*.
 *
 * Захранва се от ВЕЧЕ зададените категории ПЛЮС описите на разходите: първите
 * предложения идват от думите, които той вече е писал, вместо от празен списък.
 *
 * ОТВОРЕНО е (`menyuOtZhivi` по подразбиране) · законът от И97 дели по признака
 * „ОПИСВА срещу СМЯТА", а категорията ОПИСВА: върху нея се ГРУПИРА, не се смята
 * стойност — същото, което важи за контрагента.
 */
function menyutoNaKategoriite(o: Ogledalo): Menyu {
  return menyuOtZhivi('kategoriya', 'Категория', [
    ...o.kategorii.values(),
    ...[...o.razhodi.values()].map((r) => r.opis),
  ]);
}

export function narisuvayPlashtaniyaArhiv(o: Ogledalo, dnes: string): string {
  const sedmitsa = izbranata(o, dnes);
  const s = sedmitsataZaEkrana(o, sedmitsa, `${dnes}T00:00:00.000Z`);
  const vsichki = sedmitsiSPlashtaniya(o);
  const filtrirani = filtriray('plashtaniya-arhiv', s.redove, KOLONI_S_FILTAR, dnes);

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

      <datalist id="spisak-kategorii" translate="no">
        ${predlagani(menyutoNaKategoriite(o))
          .map((x) => `<option value="${ekraniraj(x.tekst)}"></option>`)
          .join('')}
      </datalist>

      ${poleZaTarsene('plashtaniya-arhiv')}
      <div class="tablitsa" data-tablitsa="plashtaniya-arhiv">
        <div class="red glava plashtred" translate="no">
          ${glaviNaTablitsata('plashtaniya-arhiv', KOLONI_S_FILTAR, s.redove, dnes)}
        </div>
        ${
          s.redove.length === 0
            ? '<p class="drebno">Няма нито едно плащане за тази седмица. Файлът пак се сваля — с трите листа и нула реда, защото „нямаше карта" и „нямаше карта ТАЗИ седмица" не са едно и също.</p>'
            : filtrirani.redove.length === 0
              ? PRAZEN_FILTAR
              : filtrirani.redove
                .map(
                  (r) => `
        <div class="red plashtred" translate="no" data-plashtane="${ekraniraj(r.id)}"
             data-vid="${ekraniraj(r.vid)}" data-suma="${r.suma_st}">
          ${KOLONI_PLASHTANIYA_ARHIV.map((k) =>
            // КАТЕГОРИЯТА е ЕДИНСТВЕНАТА клетка тук, която се ПИШЕ · всичко
            // друго е огледало на вече записаното (ADR-082 §3).
            k === 'Категория'
              ? `<span class="kletka"><input translate="no" class="kletka-kategoriya"
                   list="spisak-kategorii" data-za-vid="${ekraniraj(r.vid)}"
                   data-za-plashtane="${ekraniraj(r.id)}" placeholder="—"
                   value="${ekraniraj(r.kategoriya)}" autocomplete="off"></span>`
              : `<span class="kletka${PARICHNI_PLASHTANIYA.includes(k) ? ' suma' : ''}${
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
      ${redZaSkritoto(filtrirani, 'plashtaniya-arhiv')}

      <p class="drebno"><b>Тук нищо не се записва.</b> Редът е ОГЛЕДАЛО на вече
      записаното — заплатата от таба Заплати, фактурата от Разходи по потока
      „Фактури". Затова сторнирана заплата пада оттук сама, а второ въвеждане
      няма как да даде две истини за едно плащане.</p>

      <p class="drebno"><b>Празната клетка е честна.</b> Заплата няма номер на
      фактура, а фактура няма дни — тирето значи „няма", не нула. „Място" при
      фактура е празно, защото разходът още не носи проект.</p>

      <p class="drebno"><b>Категорията е ЕДИНСТВЕНОТО тук, което се ЗАПИСВА.</b>
      Тя е преценка на човек, не сметка — затова е свое събитие, а не поле на
      разхода: поле щеше да иска поправка на самия разход. Менюто расте от
      думите, които вече си писал, и приема нови. Празната клетка значи „още не
      е казана" — състояние, не грешка. Оттук се храни разбивката
      <b>„По категории"</b> в Пари.</p>

      <p class="drebno"><b>Фактурите по БАНКА не влизат.</b> Негово: те „няма да
      се въвеждат ръчно, а ще се обобщават от извлеченията". Тук са само кеш и
      карта — трите вида, които той изброи.</p>

      <section data-sektsiya="plashtaniya-po-kategorii">
        <div class="dyalglava">
          <h2>По категории</h2>
          <span data-kategorii="${s.poKategorii.length}">${s.poKategorii.length} ${
            s.poKategorii.length === 1 ? 'категория' : 'категории'
          }</span>
        </div>
        ${
          s.poKategorii.length === 0
            ? '<p class="drebno">Няма нито едно плащане за тази седмица.</p>'
            : `<div class="tablitsa" data-tablitsa="plashtaniya-kategorii">
          ${s.poKategorii
            .map(
              (x) => `<div class="red kategoriyared" translate="no"
                   data-kategoriya="${ekraniraj(x.kategoriya)}" data-suma="${x.suma_st}">
              <span class="kletka"><b>${ekraniraj(x.kategoriya)}</b><span>${x.broy} ${
                x.broy === 1 ? 'ред' : 'реда'
              }</span></span>
              <span class="suma">${pishi(x.suma_st)}</span>
            </div>`,
            )
            .join('')}
        </div>`
        }
        <p class="drebno"><b>Некатегоризираното НЕ изчезва</b> — то стои в кофа с
        име („${ekraniraj(BEZ_KATEGORIYA)}"), за да е сборът на категориите равен
        на сбора на седмицата. Кофа без име щеше да скрие точно онова, което
        човек още не е погледнал.</p>
      </section>

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

  // КАТЕГОРИЯТА · пише се при НАПУСКАНЕ на клетката, не при всяка буква.
  // Едно събитие на решение, не едно на натиснат клавиш (правило 1 · правило 5).
  for (const pole of koren.querySelectorAll<HTMLInputElement>('.kletka-kategoriya')) {
    const predi = pole.value;
    pole.addEventListener('change', async () => {
      const kazhi = koren.querySelector<HTMLElement>('#greshka-plashtaniya')!;
      kazhi.textContent = '';
      const nova = pole.value.trim();
      if (nova === predi.trim()) return;
      try {
        await k.deystviya.zadaydeKategoriya(
          {
            vid: pole.dataset['zaVid'] ?? '',
            plashtaneId: pole.dataset['zaPlashtane'] ?? '',
            kategoriya: nova,
          },
          { opId: `kategoriya:${crypto.randomUUID()}` },
        );
        k.vest(
          'dobre',
          nova === ''
            ? 'Категорията е махната · записът за нея остава в Журнала.'
            : `Категорията е „${nova}" · разбивката „По категории" вече я брои.`,
        );
        await prerisuvay();
      } catch (err) {
        kazhi.textContent = dumiZaGreshka(err);
        pole.value = predi;
      }
    });
  }

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
