/**
 * ТАБЛИЦА ОТ ФАЙЛ · експериментът с Фактури (резен 21 · ADR-081).
 *
 * Негови думи, дословно:
 *
 *   „Знам за фактури, нека тъкмо направим с тази таблица експеримента за
 *    създаване на таблица с качване в папката, с която работи таблицата, и от
 *    там я чете и създава вътре… Дали с формули или без формули. Ако може с
 *    копирани формули, ако не може само структура на таблица с числа и
 *    допълнително вътре се правят формулите от стопанина."
 *
 * ═══ ТРИТЕ СТЪПКИ, И ЧОВЕКЪТ Е МЕЖДУ ВТОРАТА И ТРЕТАТА ═══
 *
 *   1. избира файл от папката, с която таблицата работи;
 *   2. вижда ПРЕДЛОЖЕНИЕ — колони, видове, кои формули са дошли и кои НЕ, с
 *      причината до всяка;
 *   3. потвърждава, и чак тогава се пише (правило 18).
 *
 * ═══ КАКВО НЕ ПРАВИ ═══
 *
 * НЕ качва нищо. Файлът остава в неговата папка; в Журнала влиза моделът на
 * главата и ОТПЕЧАТЪКЪТ на файла (ADR-073). „Папката" е ИМЕ, не директория
 * (правило 20) — затова всичко работи и на телефон, и без мрежа.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { otXLSXSFormuli } from '../src/iztochnik/xlsx.js';
import { otCSV, tekstOtBaytove } from '../src/iztochnik/csv.js';
import {
  predlozhiTablitsa,
  sDumi,
  type PredlozhenieZaTablitsa,
} from '../src/domein/tablitsa-ot-fayl.js';
import { IMENA_NA_DEYSTVIYATA } from '../src/domein/formuli.js';
import { IMENA_NA_VIDOVETE_STOYNOST } from '../src/domein/vid-stoynost.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import type { Konteks } from './ekranite.js';

/** Каквото е прочетено, докато човекът не потвърди · нула събития дотогава. */
let predlozhenie: PredlozhenieZaTablitsa | undefined;
let imeNaFayla = '';
let otpechatakNaFayla = '';
let greshka = '';

export function blokNaTablitsaOtFayl(): string {
  return `
    <section data-sektsiya="tablitsa-ot-fayl">
      <div class="dyalglava">
        <h2>Таблица от файл</h2>
        <span>чете качената · създава вътрешната</span>
      </div>

      <p class="drebno"><b>Файлът НЕ се качва тук.</b> Той стои в папката, с
      която таблицата работи; програмата го ЧЕТЕ и в Журнала влиза моделът на
      главата плюс отпечатъка му — име, големина, час, sha256 — не байтовете
      (ADR-073).</p>

      <div class="redditsa">
        <button type="button" id="izbor-tablitsa-fayl">Прочети таблица от папката</button>
        <input translate="no" type="file" id="fayl-tablitsa" accept=".xlsx,.csv" hidden>
      </div>
      <p class="greshka" id="greshka-tablitsa-fayl">${ekraniraj(greshka)}</p>

      ${predlozhenie === undefined ? '' : predlozhenieto(predlozhenie)}
    </section>`;
}

function predlozhenieto(p: PredlozhenieZaTablitsa): string {
  return `
      <div class="plochki" data-predlozhenie="${ekraniraj(p.ime)}">
        <div class="plochka">
          <span class="etiket">Колони</span>
          <span class="chislo" translate="no" data-koloni="${p.koloni.length}">${
            p.koloni.length
          }</span>
          <span class="pod">${p.redove} реда данни</span>
        </div>
        <div class="plochka">
          <span class="etiket">Формули във файла</span>
          <span class="chislo" translate="no" data-formuli="${p.formuliVavFayla}">${
            p.formuliVavFayla
          }</span>
          <span class="pod">намерени в главите на колоните</span>
        </div>
        <div class="plochka${p.kopirani === p.formuliVavFayla ? '' : ' duljimo'}">
          <span class="etiket">Копирани</span>
          <span class="chislo" translate="no" data-kopirani="${p.kopirani}">${p.kopirani}</span>
          <span class="pod">останалите идват с числата си</span>
        </div>
        <div class="plochka${p.sverkaNaFormulite.razlika === 0 ? '' : ' duljimo'}">
          <span class="etiket">Сверка на сметките</span>
          <span class="chislo" translate="no" data-razlika="${p.sverkaNaFormulite.razlika}">${
            p.sverkaNaFormulite.razlika
          }</span>
          <span class="pod">разлика на ${p.sverkaNaFormulite.provereni} проверени реда</span>
        </div>
      </div>

      <p class="drebno" data-sdumi="1">${ekraniraj(sDumi(p))}</p>

      <div class="tablitsa" data-tablitsa="ot-fayl">
        <div class="red glava otfaylred" translate="no">
          <span class="kletka">Колона</span>
          <span class="kletka">Вид</span>
          <span class="kletka">Сметка</span>
          <span class="kletka">От файла</span>
          <span class="kletka">Защо не се копира</span>
        </div>
        ${p.koloni
          .map(
            (k) => `
        <div class="red otfaylred${k.zashto === '' ? '' : ' duljimo'}" translate="no"
             data-kolona="${k.nomer}" data-formula="${k.formula === undefined ? 'ne' : 'da'}">
          <span class="kletka">${ekraniraj(k.ime)}</span>
          <span class="kletka">${ekraniraj(IMENA_NA_VIDOVETE_STOYNOST[k.vid])}</span>
          <span class="kletka">${
            k.formula === undefined
              ? '—'
              : ekraniraj(
                  `${IMENA_NA_DEYSTVIYATA[k.formula.deystvie]} на ${k.formula.ot
                    .map((x) => p.koloni[x]?.ime ?? `колона ${x + 1}`)
                    .join(' · ')}`,
                )
          }</span>
          <span class="kletka">${k.izraz === '' ? '—' : `<code>${ekraniraj(k.izraz)}</code>`}</span>
          <span class="kletka">${ekraniraj(k.zashto)}</span>
        </div>`,
          )
          .join('')}
      </div>

      <p class="drebno"><b>Сметка, преписана без проверка, е сметка, на която
      никой не е гледал.</b> Затова всяка разпозната формула се ПРЕСМЯТА върху
      редовете на файла и се сравнява с числата, които самият Excel е кеширал.
      Разминат ли се, формулата НЕ идва — а колоната идва с данните си, и
      сметката ѝ се прави тук, вътре.</p>

      <form id="forma-sazday-tablitsa" class="redditsa">
        <label class="pole">
          <span>Име на таблицата</span>
          <input translate="no" name="ime" id="nova-tablitsa-ime" value="${ekraniraj(p.ime)}">
        </label>
        <button type="submit">Създай таблицата вътре</button>
      </form>`;
}

export function zakachiTablitsaOtFayl(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLButtonElement>('#izbor-tablitsa-fayl')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#fayl-tablitsa')?.click();
  });

  koren.querySelector<HTMLInputElement>('#fayl-tablitsa')?.addEventListener('change', async (e) => {
    const vhod = e.target as HTMLInputElement;
    const fayl = vhod.files?.[0];
    vhod.value = '';
    if (!fayl) return;
    try {
      const baytove = new Uint8Array(await fayl.arrayBuffer());
      otpechatakNaFayla = await otpechatak(baytove, sha256Web);
      imeNaFayla = fayl.name;
      if (/\.csv$/i.test(fayl.name)) {
        // CSV НЯМА формули · и това не е дефект, а свойство на формата.
        predlozhenie = predlozhiTablitsa(otCSV(tekstOtBaytove(baytove), fayl.name), new Map());
      } else {
        const { tablitsi, formuli } = await otXLSXSFormuli(baytove, fayl.name);
        predlozhenie = predlozhiTablitsa(tablitsi[0]!, formuli[0]!.poKolona);
      }
      greshka = '';
    } catch (err) {
      predlozhenie = undefined;
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  const forma = koren.querySelector<HTMLFormElement>('#forma-sazday-tablitsa');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-tablitsa-fayl')!;
    kazhi.textContent = '';
    const p = predlozhenie;
    if (p === undefined) return;
    const ime = String(new FormData(forma).get('ime') ?? '').trim();
    try {
      await k.deystviya.zapishiTablitsaOtFayl(
        {
          klyuch: ime,
          otFayl: imeNaFayla,
          otpechatak: otpechatakNaFayla,
          glavi: p.koloni.map((x) => x.ime),
          vidove: Object.fromEntries(p.koloni.map((x) => [x.nomer, x.vid])),
          formuli: Object.fromEntries(
            p.koloni.filter((x) => x.formula !== undefined).map((x) => [x.nomer, x.formula!]),
          ),
          nekopirani: p.koloni
            .filter((x) => x.zashto !== '')
            .map((x) => `${x.ime}: ${x.izraz} — ${x.zashto}`),
        },
        { opId: `tablitsa-ot-fayl:${crypto.randomUUID()}` },
      );
      predlozhenie = undefined;
      k.vest('dobre', `Таблицата „${ime}" е създадена · ${p.kopirani} копирани формули.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
