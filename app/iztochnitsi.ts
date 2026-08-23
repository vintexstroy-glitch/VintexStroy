/**
 * ИЗТОЧНИЦИТЕ · един бутон, падащо меню, един път навътре.
 *
 * Собственикът избира откъде да дойдат данните: на ръка, от таблица (CSV или
 * Excel) или от PDF. Каквото и да избере, нататък пътят е ЕДИН:
 *
 *   файл → таблица → снимка (с отпечатък) → сравнение с Журнала → разлики → Вратата
 *
 * Файлът НЕ се качва и не се запазва никъде — чете се и се взима снимка на
 * числата. Самият файл си остава в главния Драйв; в Журнала влиза само следата:
 * име, големина, час на промяна и sha256 на прочетените байтове.
 */

import { kakvoPishe } from '../src/yadro/pari.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import { otPDF, tablitsaOtPDF } from '../src/iztochnik/pdf.js';
import { otpechatak, type Izvor, type Snimka, type VidIzvor } from '../src/iztochnik/snimka.js';
import { periodPoModel, pogadniPeriod, razchetiPoModel, razchetiRazhodi } from '../src/iztochnik/razchitane.js';
import { bezPrazni, kletka, type Tablitsa } from '../src/iztochnik/tablitsa.js';
import {
  belegNaModel,
  GreshkaModel,
  IMENA_NA_ROLITE,
  nameriModel,
  napraviModel,
  podskazhi,
  ZADALZHITELNI_ROLI,
  type ModelNaTablitsa,
  type Rolya,
} from '../src/iztochnik/model.js';
import { sektoriNaRazhod } from '../src/domein/dds.js';
import { potototsiNaRazhod } from '../src/domein/smetki.js';
import {
  imaShtoDaSePravi,
  prilozhi,
  sravni,
  type Plan,
  type Razlika,
} from '../src/domein/aktualizatsiya.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

type Filtar = 'promenite' | 'vsichko';

let otvoreno = false;
let plan: Plan | null = null;
let filtar: Filtar = 'promenite';
let greshka = '';
/** Дръжката към файла живее, докато трае сесията — за „Препрочети". */
let drazhka: FileSystemFileHandle | null = null;

/**
 * ПИТАНЕТО · когато никой модел не познава таблицата.
 *
 * Дотук непознат файл беше СЛЯПА УЛИЦА: „Не разчитам този файл." Оттук е
 * въпрос. Държи се таблицата и следата ѝ, за да не се иска файлът пак —
 * човекът вече го е посочил веднъж.
 */
interface Pitane {
  readonly izvor: Izvor;
  readonly tablitsa: Tablitsa;
  redNaGlavata: number;
}
let pitane: Pitane | null = null;

const IZTOCHNITSI: readonly { vid: VidIzvor; ime: string; opis: string; vidove: string }[] = [
  { vid: 'raka', ime: 'На ръка, тук в приложението', opis: 'формите долу', vidove: '' },
  { vid: 'xlsx', ime: 'От Excel (.xlsx)', opis: 'чете файла от Драйва', vidove: '.xlsx' },
  { vid: 'csv', ime: 'От таблица (.csv)', opis: 'изнесена от Excel или от банката', vidove: '.csv,.txt' },
  { vid: 'pdf', ime: 'От PDF', opis: 'чете текста, ако PDF-ът има такъв', vidove: '.pdf' },
];

export function narisuvayButona(): string {
  return `
    <div class="padashto">
      <button type="button" class="glaven" id="vzemi" aria-expanded="${otvoreno}">
        Въведи разходи ▾
      </button>
      ${
        otvoreno
          ? `<div class="menyu" id="menyu">
        ${IZTOCHNITSI.map(
          (i) => `<button type="button" class="punkt" data-iztochnik="${i.vid}">
            <b>${ekraniraj(i.ime)}</b><span>${ekraniraj(i.opis)}</span>
          </button>`,
        ).join('')}
        <p class="drebno">Файлът не се качва и не се запазва — чете се и се взима снимка на числата. В Журнала влиза само следата: име, час и отпечатък.</p>
      </div>`
          : ''
      }
    </div>
    <input translate="no" type="file" id="fayl-iztochnik" hidden>`;
}

export function narisuvayPlana(): string {
  if (pitane) {
    return `${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}${narisuvayPitaneto(pitane)}`;
  }
  if (greshka && !plan) {
    return `<div class="vest zle">${ekraniraj(greshka)}</div>`;
  }
  if (!plan) return '';

  const p = plan;
  const promeni = p.redove.filter((r) => r.kakvo !== 'bezPromyana');
  const pokazani = filtar === 'vsichko' ? p.redove : promeni;
  const broy = (kakvo: Razlika['kakvo']) => p.redove.filter((r) => r.kakvo === kakvo).length;

  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>${p.parvoChetene ? 'Прочетено' : 'Разликите'} · ${ekraniraj(p.snimka.period)}</h2>
        <span>${ekraniraj(p.snimka.izvor.ime)} · отпечатък ${ekraniraj(p.snimka.izvor.otpechatak.slice(0, 12))}…</span>
      </div>

      ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Сега в Журнала</span>
          <span class="chislo" translate="no">${kakvoPishe(p.sega_st as never)}</span>
          <span class="pod">${p.rachni ? `${p.rachni} ръчни не се пипат` : 'от източник'}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Според файла</span>
          <span class="chislo" translate="no">${kakvoPishe(p.sled_st as never)}</span>
          <span class="pod">${p.snimka.redove.length} ${p.snimka.redove.length === 1 ? 'ред' : 'реда'}</span>
        </div>
        <div class="plochka${p.sled_st !== p.sega_st ? ' trevoga' : ''}">
          <span class="etiket">Разлика</span>
          <span class="chislo" translate="no">${kakvoPishe((p.sled_st - p.sega_st) as never)}</span>
          <span class="pod">${broy('nov')} нови · ${broy('promenen')} поправени · ${broy('izchezval')} махнати</span>
        </div>
        <div class="plochka${p.snimka.propusnati.length ? ' trevoga' : ''}">
          <span class="etiket">Непрочетени редове</span>
          <span class="chislo" translate="no">${p.snimka.propusnati.length}</span>
          <span class="pod">${p.snimka.propusnati.length ? 'виж долу' : 'нищо не е пропуснато'}</span>
        </div>
      </div>

      <div class="poleta">
        <div class="pole">
          <label for="plan-potok">Поток</label>
          <select translate="no" id="plan-potok">
            ${potototsiNaRazhod()
              .map((x) => `<option value="${ekraniraj(x.klyuch)}"${x.klyuch === 'fakturi' ? ' selected' : ''}>${ekraniraj(x.ime)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="plan-sektor">Сектор</label>
          <select translate="no" id="plan-sektor">
            ${sektoriNaRazhod()
              .map((a) => `<option value="${ekraniraj(a.klyuch)}"${a.klyuch === 'pokupki-materiali' ? ' selected' : ''}>${ekraniraj(a.sektor)} · ${a.stavka}%</option>`)
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="plan-nachin">Платено</label>
          <select translate="no" id="plan-nachin">
            <option value="банка">по банка</option>
            <option value="в брой">в брой</option>
          </select>
        </div>
      </div>

      <div class="dyalglava">
        <h2 class="malko">Редовете</h2>
        <span class="filtar">
          <button type="button" class="vtorichen malak${filtar === 'promenite' ? ' tuk' : ''}" data-filtar="promenite">Само промените (${promeni.length})</button>
          <button type="button" class="vtorichen malak${filtar === 'vsichko' ? ' tuk' : ''}" data-filtar="vsichko">Всичко (${p.redove.length})</button>
        </span>
      </div>

      <div class="tablitsa">
        <div class="glava razlika">
          <span>Какво</span><span>Доставчик и описание</span><span>Дата</span>
          <span class="suma">Беше</span><span class="suma">Става</span>
        </div>
        ${
          pokazani.length === 0
            ? '<p class="prazno">Нищо за промяна — файлът казва същото, което казва Журналът.</p>'
            : pokazani.map(redNaRazlika).join('')
        }
      </div>

      ${
        p.snimka.propusnati.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava propusnat"><span>Ред</span><span>Защо не е прочетен</span></div>
        ${p.snimka.propusnati
          .map(
            (x) => `<div class="red propusnat" translate="no"><span>ред ${x.red}</span><span>${ekraniraj(x.zashto)}</span></div>`,
          )
          .join('')}
      </div>`
      }

      <div class="deystviya">
        <button type="button" class="glaven" id="prilozhi"${imaShtoDaSePravi(p) ? '' : ' disabled'}>
          ${p.parvoChetene ? 'Запиши' : 'Приложи поправките'}
        </button>
        ${drazhka ? '<button type="button" class="vtorichen" id="prechetii">Препрочети файла</button>' : ''}
        <button type="button" class="vtorichen" id="otkazhi-plan">Откажи</button>
        <p class="drebno">Поправката е <b>сторно + ново</b>, не презапис. Старото остава в Журнала с бележка кой файл го е поправил — затова „Провери веригата" ще казва ЦЯЛА и след това.</p>
      </div>
    </section>`;
}

/**
 * ЕКРАНЪТ ЗА КАРТАТА НА ХЕДЪРА · питаме ВЕДНЪЖ.
 *
 * Показва се само когато нито един записан модел не познава таблицата. Оттук
 * нататък същият хедър минава сам — затова въпросът не дразни: задава се
 * веднъж на банка, не веднъж на файл.
 *
 * Предложението идва от `podskazhi()`; то е ПРЕДЛОЖЕНИЕ, а не решение. Утре на
 * това място може да застане ИИ — правило 18 остава спазено, защото записва
 * човекът, с натискане на бутона.
 */
function narisuvayPitaneto(pi: Pitane): string {
  const glava = pi.tablitsa.redove[pi.redNaGlavata] ?? [];
  const predlozheno = podskazhi(pi.tablitsa, pi.redNaGlavata);
  const primer = pi.tablitsa.redove[pi.redNaGlavata + 1] ?? [];

  const kolonaIzbor = (rolya: Rolya): string => {
    const izbrano = predlozheno[rolya];
    const zadalzhitelna = ZADALZHITELNI_ROLI.includes(rolya);
    return `
      <div class="pole">
        <label for="karta-${rolya}">${ekraniraj(IMENA_NA_ROLITE[rolya])}${zadalzhitelna ? ' · задължителна' : ''}</label>
        <select translate="no" id="karta-${rolya}" data-rolya="${rolya}">
          <option value="">${zadalzhitelna ? '— избери —' : '— няма —'}</option>
          ${glava
            .map((zaglavie, i) => {
              const etiket = zaglavie.trim() === '' ? `колона ${i + 1}` : zaglavie.trim();
              return `<option value="${i}"${izbrano === i ? ' selected' : ''}>${ekraniraj(etiket)}</option>`;
            })
            .join('')}
        </select>
      </div>`;
  };

  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>Не познавам тази таблица</h2>
        <span>${ekraniraj(pi.izvor.ime)} · отпечатък ${ekraniraj(pi.izvor.otpechatak.slice(0, 12))}…</span>
      </div>

      <p class="drebno">Кажи веднъж коя колона какво е. Записва се като <b>МоделЗаписан</b> в Журнала и следващият файл със същата глава минава без питане. Нищо не се гадае — предложеното долу е само предложение.</p>

      <div class="poleta tesni">
        <div class="pole">
          <label for="karta-ime">Име на модела</label>
          <input translate="no" id="karta-ime" placeholder="напр. Банка ОББ" autocomplete="off" value="${ekraniraj(imeOtIzvor(pi.izvor.ime))}">
        </div>
        <div class="pole">
          <label for="karta-glava">Кой ред е главата</label>
          <select translate="no" id="karta-glava">
            ${pi.tablitsa.redove
              .map((red, i) => {
                const opis = red
                  .map((k) => k.trim())
                  .filter((k) => k !== '')
                  .slice(0, 4)
                  .join(' · ');
                return `<option value="${i}"${i === pi.redNaGlavata ? ' selected' : ''}>ред ${i + 1} · ${ekraniraj(opis || 'празен')}</option>`;
              })
              .slice(0, 20)
              .join('')}
          </select>
        </div>
      </div>

      <div class="poleta">
        ${(Object.keys(IMENA_NA_ROLITE) as Rolya[]).map(kolonaIzbor).join('')}
        <div class="pole">
          <label for="karta-dds-e">Колоната за ДДС носи</label>
          <select translate="no" id="karta-dds-e">
            <option value="stavka">процент · 0, 9 или 20</option>
            <option value="suma">сума в левове</option>
          </select>
        </div>
      </div>

      <div class="tablitsa">
        <div class="glava propusnat"><span>Първи ред с данни</span><span>какво пише в него</span></div>
        ${
          primer.length === 0
            ? '<p class="prazno">Под главата няма редове.</p>'
            : glava
                .map((zaglavie, i) => {
                  const stoynost = kletka(pi.tablitsa, pi.redNaGlavata + 1, i);
                  if (zaglavie.trim() === '' && stoynost === '') return '';
                  return `<div class="red propusnat" translate="no"><span>${ekraniraj(zaglavie.trim() || `колона ${i + 1}`)}</span><span>${ekraniraj(stoynost)}</span></div>`;
                })
                .join('')
        }
      </div>

      <div class="deystviya">
        <button type="button" class="glaven" id="zapomni-model">Запомни модела и прочети файла</button>
        <button type="button" class="vtorichen" id="otkazhi-pitane">Откажи</button>
        <p class="drebno">Задължителни са <b>дата</b> и <b>сума</b> — без тях ред не става запис. Една колона носи една роля; ако дадеш една и съща колона на две роли, записът се отказва на глас.</p>
      </div>
    </section>`;
}

/** Име по подразбиране: файлът без наставка и без брояча „(3)". */
function imeOtIzvor(ime: string): string {
  return ime
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

function redNaRazlika(r: Razlika): string {
  const znachki: Record<Razlika['kakvo'], string> = {
    nov: '<span class="znachka dobre">нов</span>',
    promenen: '<span class="znachka trevoga">поправен</span>',
    izchezval: '<span class="znachka trevoga">махнат</span>',
    bezPromyana: '<span class="znachka tiha">същият</span>',
  };
  const koy = r.nov?.koy ?? r.star?.dostavchik ?? '—';
  const opis = r.nov?.opis ?? r.star?.opis ?? '';
  const dokument = r.nov?.dokument ?? r.star?.dokument ?? '';
  return `
    <div class="red razlika" translate="no">
      <span>${znachki[r.kakvo]}</span>
      <span class="kletka"><b>${ekraniraj(koy)}</b><span>${ekraniraj(opis)}${dokument ? ` · док. ${ekraniraj(dokument)}` : ''}</span></span>
      <span>${ekraniraj(r.nov?.data ?? r.star?.data ?? '')}</span>
      <span class="suma">${r.star ? kakvoPishe(r.star.suma_st as never) : '—'}</span>
      <span class="suma${r.kakvo === 'izchezval' ? ' duljimo' : ''}">${
        r.nov ? kakvoPishe(r.nov.suma_st as never) : '—'
      }</span>
    </div>`;
}

// ── четенето ───────────────────────────────────────────────────────────────
async function tablitsiOtFayl(
  danni: Uint8Array,
  ime: string,
  vid: VidIzvor,
): Promise<Tablitsa[]> {
  if (vid === 'xlsx') return (await otXLSX(danni, ime)).map(bezPrazni);
  if (vid === 'pdf') return [bezPrazni(tablitsaOtPDF(await otPDF(danni), ime))];
  return [bezPrazni(otCSV(new TextDecoder().decode(danni), ime))];
}

async function napraviPlan(fayl: File, vid: VidIzvor, k: Konteks): Promise<void> {
  // Файлът се чете ВЕДНЪЖ: същите байтове дават и отпечатъка, и таблицата.
  const danni = new Uint8Array(await fayl.arrayBuffer());
  const izvor: Izvor = {
    vid,
    ime: fayl.name,
    golemina: fayl.size,
    promenen: new Date(fayl.lastModified).toISOString(),
    otpechatak: await otpechatak(danni, sha256Web),
  };

  const tablitsi = await tablitsiOtFayl(danni, fayl.name, vid);
  const o = await k.deystviya.ogledalo();
  const s = nameriTablitsata(tablitsi, izvor, [...o.modeli.values()]);

  // Никой модел не позна и нито един лист не се разчита сам — питаме.
  if (!s) {
    const t = tablitsi.find((x) => x.redove.length > 0) ?? tablitsi[0];
    if (!t) throw new Error('Файлът няма нито един ред.');
    pitane = { izvor, tablitsa: t, redNaGlavata: pogadniRedNaGlavata(t) };
    plan = null;
    greshka = '';
    return;
  }

  pitane = null;
  plan = sravni(o, s);
  filtar = 'promenite';
  greshka = '';
}

/**
 * Кой лист да се чете и как.
 *
 * Редът е нарочен:
 *   1. ЗАПИСАН МОДЕЛ — човекът вече е казал коя колона какво е. Неговата дума
 *      бие всяко разпознаване по думи, дори когато и двете биха сработили.
 *   2. Старият път по думи („Доставчик", „Сума", „Дата") — таблиците, писани
 *      в самото приложение, минават без да се пита за нищо.
 *   3. `undefined` — никой не позна. Не се хвърля грешка: горе се пита.
 */
function nameriTablitsata(
  tablitsi: readonly Tablitsa[],
  izvor: Izvor,
  modeli: readonly ModelNaTablitsa[],
): Snimka | undefined {
  for (const t of tablitsi) {
    const m = nameriModel(modeli, t);
    if (!m) continue;
    const period = periodPoModel(m, t);
    if (period === '') continue;
    return razchetiPoModel({ model: m, tablitsa: t, izvor, period });
  }

  for (const t of tablitsi) {
    const period = pogadniPeriod(t);
    if (period === '') continue;
    return razchetiRazhodi({ tablitsa: t, izvor, period });
  }

  return undefined;
}

/**
 * Кой ред ПРЕДЛАГАМЕ за глава: първият с поне две пълни клетки.
 *
 * Това е подсказка за окото, не решение — човекът вижда падащия списък с
 * всички редове и може да посочи друг. Затова е позволено да е просто.
 */
function pogadniRedNaGlavata(t: Tablitsa): number {
  const i = t.redove.findIndex((red) => red.filter((klet) => klet.trim() !== '').length >= 2);
  return i < 0 ? 0 : i;
}

/** Прочита таблицата на питането през вече записания модел. */
async function prilozhiModela(m: ModelNaTablitsa, k: Konteks): Promise<void> {
  const pi = pitane!;
  const period = periodPoModel(m, pi.tablitsa);
  if (period === '') {
    throw new Error(
      'С тази карта не се разчита нито една дата — провери коя колона си дал за „дата".',
    );
  }
  plan = sravni(
    await k.deystviya.ogledalo(),
    razchetiPoModel({ model: m, tablitsa: pi.tablitsa, izvor: pi.izvor, period }),
  );
  pitane = null;
  filtar = 'promenite';
  greshka = '';
}

export function zakachiIztochnitsi(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLButtonElement>('#vzemi')?.addEventListener('click', async () => {
    otvoreno = !otvoreno;
    await prerisuvay();
  });

  const fayl = koren.querySelector<HTMLInputElement>('#fayl-iztochnik');

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-iztochnik]')) {
    b.addEventListener('click', async () => {
      const vid = b.dataset['iztochnik'] as VidIzvor;
      otvoreno = false;
      greshka = '';
      if (vid === 'raka') {
        plan = null;
        await prerisuvay();
        return;
      }
      const opis = IZTOCHNITSI.find((i) => i.vid === vid)!;
      await prerisuvay();
      await izberiFayl(vid, opis.vidove, k, prerisuvay);
    });
  }

  fayl?.addEventListener('change', async () => {
    const izbran = fayl.files?.[0];
    const vid = (fayl.dataset['vid'] ?? 'csv') as VidIzvor;
    fayl.value = '';
    if (!izbran) return;
    drazhka = null;
    await opitaj(() => napraviPlan(izbran, vid, k), prerisuvay);
  });

  koren.querySelector<HTMLButtonElement>('#prechetii')?.addEventListener('click', async () => {
    if (!drazhka || !plan) return;
    const vid = plan.snimka.izvor.vid;
    await opitaj(async () => napraviPlan(await drazhka!.getFile(), vid, k), prerisuvay);
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar]')) {
    b.addEventListener('click', async () => {
      filtar = b.dataset['filtar'] as Filtar;
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#otkazhi-plan')?.addEventListener('click', async () => {
    plan = null;
    greshka = '';
    drazhka = null;
    await prerisuvay();
  });

  // ── картата на хедъра ────────────────────────────────────────────────────
  koren.querySelector<HTMLSelectElement>('#karta-glava')?.addEventListener('change', async (e) => {
    if (!pitane) return;
    pitane.redNaGlavata = Number((e.currentTarget as HTMLSelectElement).value);
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-pitane')?.addEventListener('click', async () => {
    pitane = null;
    plan = null;
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#zapomni-model')?.addEventListener('click', async (e) => {
    if (!pitane) return;
    const buton = e.currentTarget as HTMLButtonElement;
    const pi = pitane;

    const koloni: Partial<Record<Rolya, number>> = {};
    for (const izbor of koren.querySelectorAll<HTMLSelectElement>('[data-rolya]')) {
      if (izbor.value === '') continue;
      koloni[izbor.dataset['rolya'] as Rolya] = Number(izbor.value);
    }
    const ime = koren.querySelector<HTMLInputElement>('#karta-ime')?.value ?? '';
    const ddsE = koren.querySelector<HTMLSelectElement>('#karta-dds-e')?.value as
      | 'stavka'
      | 'suma';

    buton.disabled = true;
    try {
      const model = napraviModel({
        klyuch: ime,
        tablitsa: pi.tablitsa,
        redNaGlavata: pi.redNaGlavata,
        koloni,
        ...(koloni.dds === undefined ? {} : { ddsE }),
      });
      // Първо в Журнала, после на екрана: моделът трябва да ПРЕЖИВЕЕ прочита.
      await k.deystviya.zapishiModel(model, {
        // Белегът е от СЪДЪРЖАНИЕТО: поправена карта е нов запис, не повторение.
        opId: `model:${model.klyuch}:${belegNaModel(model)}`,
      });
      await prilozhiModela(model, k);
      k.vest(
        'dobre',
        `Моделът „${model.klyuch}" е записан. Следващият файл със същата глава минава без питане.`,
      );
    } catch (err) {
      greshka =
        err instanceof GreshkaModel || err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#prilozhi')?.addEventListener('click', async (e) => {
    if (!plan) return;
    const buton = e.currentTarget as HTMLButtonElement;
    const vzemi = (izbor: string) => koren.querySelector<HTMLSelectElement>(izbor)!.value;

    buton.disabled = true;
    try {
      const rezultat = await prilozhi(
        k.deystviya,
        plan,
        {
          potok: vzemi('#plan-potok'),
          sektor: vzemi('#plan-sektor'),
          nachin: vzemi('#plan-nachin') as 'банка' | 'в брой',
        },
        new Date().toISOString(),
      );
      k.vest(
        'dobre',
        `${rezultat.zapisani} ${rezultat.zapisani === 1 ? 'записан' : 'записани'}` +
          `${rezultat.stornirani ? `, ${rezultat.stornirani} сторнирани` : ''}` +
          `${rezultat.bezPromyana ? `, ${rezultat.bezPromyana} без промяна` : ''}. ` +
          'Сверката затваря; следата за файла остава в Журнала.',
      );
      plan = null;
      greshka = '';
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });
}

/** Показва файла за четене. Където има модерен избирач, дръжката се пази. */
async function izberiFayl(
  vid: VidIzvor,
  vidove: string,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): Promise<void> {
  const izbirach = (globalThis as { showOpenFilePicker?: unknown }).showOpenFilePicker;
  if (typeof izbirach === 'function') {
    try {
      const [dr] = (await (izbirach as (n: unknown) => Promise<FileSystemFileHandle[]>)({
        multiple: false,
        types: [{ description: vidove, accept: { '*/*': vidove.split(',') } }],
      })) as FileSystemFileHandle[];
      if (!dr) return;
      drazhka = dr;
      await opitaj(async () => napraviPlan(await dr.getFile(), vid, k), prerisuvay);
      return;
    } catch (err) {
      // Отказан избор не е грешка; всичко друго пада към стария избирач.
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  const fayl = document.getElementById('fayl-iztochnik') as HTMLInputElement | null;
  if (!fayl) return;
  fayl.accept = vidove;
  fayl.dataset['vid'] = vid;
  fayl.click();
}

async function opitaj(rabota: () => Promise<void>, prerisuvay: () => Promise<void>): Promise<void> {
  try {
    await rabota();
  } catch (err) {
    plan = null;
    pitane = null;
    greshka = err instanceof Error ? err.message : String(err);
  }
  await prerisuvay();
}

/** Има ли какво да се покаже в панела — план, въпрос за картата, или грешка. */
export function imaPlan(): boolean {
  return plan !== null || pitane !== null || greshka !== '';
}
