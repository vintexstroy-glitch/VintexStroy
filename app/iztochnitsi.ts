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
import { pogadniPeriod, razchetiRazhodi } from '../src/iztochnik/razchitane.js';
import { bezPrazni, type Tablitsa } from '../src/iztochnik/tablitsa.js';
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
  const s = nameriTablitsata(tablitsi, izvor);
  plan = sravni(await k.deystviya.ogledalo(), s);
  filtar = 'promenite';
  greshka = '';
}

/** Първият лист, който се разчита. Ако никой — казва се, вместо да се гадае. */
function nameriTablitsata(tablitsi: readonly Tablitsa[], izvor: Izvor): Snimka {
  const oplakvaniya: string[] = [];
  for (const t of tablitsi) {
    const period = pogadniPeriod(t);
    if (period === '') {
      oplakvaniya.push(`„${t.ime}": не намирам колони „Доставчик", „Сума" и „Дата".`);
      continue;
    }
    return razchetiRazhodi({ tablitsa: t, izvor, period });
  }
  throw new Error(
    `Не разчитам този файл. ${oplakvaniya.join(' ')} ` +
      'Ако е банково извлечение в PDF, изнеси CSV от банката — той е точен.',
  );
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
    greshka = err instanceof Error ? err.message : String(err);
  }
  await prerisuvay();
}

/** Има ли отворен план — главното го пита, за да покаже панела. */
export function imaPlan(): boolean {
  return plan !== null || greshka !== '';
}
