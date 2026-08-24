/**
 * Екран „Имоти" — тук собственикът пише истинските данни.
 *
 * Формите пишат през ВРАТАТА, не в Журнала. Списъкът се чете от ОГЛЕДАЛОТО,
 * което се преизчислява от Журнала при всяко показване — нищо не се кешира.
 *
 * Поправката НЕ е презапис: сгрешен адрес или име ражда ново събитие
 * („ИмотПоправен“, „НаемПоправен“), а сгрешен запис се маха със сторно —
 * и то само когато вратарят пусне (`src/domein/storno.ts`).
 */

import { GreshkaPari, otLeva, pishi, pishiVPole } from '../src/yadro/pari.js';
import { GreshkaData, otData } from '../src/yadro/data.js';
import { akumulator, sektoriNaNaem } from '../src/domein/dds.js';
import { VID } from '../src/domein/sabitiya.js';
import type { Imot, Naem, Ogledalo } from '../src/ogledalo/ogledalo.js';
import { opitajStorno } from './storno.js';
import { filtriray, glavaSFiltar, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import { butonIstoriya } from './istoriya.js';
import { kvSmVM2, ploshtVKvSm } from '../src/kalkulator/chetene.js';
import type { Konteks } from './main.js';

export interface SastoyanieNaEkrana {
  readonly ogledalo: Ogledalo;
  readonly sabitiya: number;
}

/** Какво прави екранът в момента. Едно състояние, не три флага. */
type Rezhim =
  | { kakvo: 'nov' }
  | { kakvo: 'popravi-imot'; id: string }
  | { kakvo: 'popravi-naem'; id: string }
  | { kakvo: 'prekrati'; id: string };

let rezhim: Rezhim = { kakvo: 'nov' };

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdImot = novOpId();
let opIdNaem = novOpId();
let opIdDeystvie = novOpId();

function novOpId(): string {
  return crypto.randomUUID();
}

/** Колоните на таблицата „Наеми" — за фините филтри в стил Уиндоус. */
function koloniNaNaemite(o: Ogledalo): KolonaSFiltar<Naem>[] {
  return [
    { klyuch: 'koy', ime: 'Наемател', vid: 'tekst', vzemi: (n) => n.naemetel },
    {
      klyuch: 'imot',
      ime: 'Имот',
      vid: 'tekst',
      vzemi: (n) => {
        const i = o.imoti.get(n.imotId);
        return i ? `${i.adres} · ${i.edinitsa}` : n.imotId;
      },
    },
    { klyuch: 'telefon', ime: 'Телефон', vid: 'tekst', vzemi: (n) => n.telefon },
    { klyuch: 'imeyl', ime: 'Имейл', vid: 'tekst', vzemi: (n) => n.imeyl },
    { klyuch: 'sektor', ime: 'Сектор', vid: 'tekst', vzemi: (n) => akumulator(n.sektor).sektor },
    { klyuch: 'naem', ime: 'Наем / мес.', vid: 'evro', vzemi: (n) => n.naem_st },
    {
      klyuch: 'sastoyanie',
      ime: 'Състояние',
      vid: 'tekst',
      vzemi: (n) => (n.prekraten ? 'прекратен' : 'жив'),
    },
  ];
}

/**
 * СВАЛЯНЕ НА ФАЙЛ · единственият дом на танца Blob → адрес → връзка → клик.
 * Беше преписан три пъти (в main два, в Стойност един) — три места за един теч.
 */
/**
 * ДУМИТЕ НА ЕДНА ГРЕШКА · един дом за израза, преписан 28 пъти.
 * Грешка с име носи message; всичко друго се казва както е.
 */
export function dumiZaGreshka(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function svaliFayl(fayl: Blob, ime: string): void {
  const adres = URL.createObjectURL(fayl);
  const vruzka = document.createElement('a');
  vruzka.href = adres;
  vruzka.download = ime;
  vruzka.click();
  URL.revokeObjectURL(adres);
}

export function narisuvayImoti(sastoyanie: SastoyanieNaEkrana): string {
  const { ogledalo } = sastoyanie;
  const imoti = [...ogledalo.imoti.values()];
  const naemi = [...ogledalo.naemi.values()].sort(
    (a, b) => Number(a.prekraten) - Number(b.prekraten) || a.naemetel.localeCompare(b.naemetel),
  );
  const naemiPoImot = new Map<string, Naem[]>();
  for (const naem of naemi) {
    const spisak = naemiPoImot.get(naem.imotId) ?? [];
    spisak.push(naem);
    naemiPoImot.set(naem.imotId, spisak);
  }

  const zhivi = naemi.filter((n) => !n.prekraten);
  const mesechno = zhivi.reduce((sbor, n) => sbor + n.naem_st, 0);
  const zaeti = new Set(zhivi.map((n) => n.imotId));

  const filtriraniNaemi = filtriray('naemi', naemi, koloniNaNaemite(ogledalo), dnesKato());

  const popravyanImot = rezhim.kakvo === 'popravi-imot' ? ogledalo.imoti.get(rezhim.id) : undefined;
  const popravyanNaem = rezhim.kakvo === 'popravi-naem' ? ogledalo.naemi.get(rezhim.id) : undefined;
  const prekratyavan = rezhim.kakvo === 'prekrati' ? ogledalo.naemi.get(rezhim.id) : undefined;

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Единици</span>
        <span class="chislo" translate="no">${imoti.length}</span>
        <span class="pod">въведени от теб</span>
      </div>
      <div class="plochka">
        <span class="etiket">Отдадени</span>
        <span class="chislo" translate="no">${zaeti.size} / ${imoti.length}</span>
        <span class="pod">${imoti.length - zaeti.size} без наем</span>
      </div>
      <div class="plochka">
        <span class="etiket">Месечен наем</span>
        <span class="chislo" translate="no">${pishi(mesechno)}</span>
        <span class="pod">начислено · €</span>
      </div>
      <div class="plochka">
        <span class="etiket">Събития</span>
        <span class="chislo" translate="no">${sastoyanie.sabitiya}</span>
        <span class="pod">в Журнала</span>
      </div>
    </div>

    ${prekratyavan ? formaPrekratyavane(prekratyavan) : ''}

    <section class="karta${popravyanImot ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>${popravyanImot ? 'Поправи имота' : 'Нов имот'}</h2>
        <span>${
          popravyanImot
            ? 'поправката е ново събитие — старото описание остава в Журнала'
            : 'адресът и единицата правят реда разпознаваем'
        }</span>
      </div>
      <form id="forma-imot">
        <div class="poleta">
          <div class="pole">
            <label for="imot-adres">Място или адрес</label>
            <input translate="no" id="imot-adres" name="adres" required placeholder="напр. Малинова" autocomplete="off"
                   value="${popravyanImot ? ekraniraj(popravyanImot.adres) : ''}">
          </div>
          <div class="pole">
            <label for="imot-edinitsa">Единица</label>
            <input translate="no" id="imot-edinitsa" name="edinitsa" required placeholder="напр. АП. № 1" autocomplete="off"
                   value="${popravyanImot ? ekraniraj(popravyanImot.edinitsa) : ''}">
          </div>
          <div class="pole">
            <label for="imot-ploshtad">Площ в м² (по избор)</label>
            <input translate="no" id="imot-ploshtad" name="ploshtad" inputmode="decimal" placeholder="72,40" autocomplete="off"
                   value="${popravyanImot && popravyanImot.ploshtad_kvsm > 0 ? kvSmVM2(popravyanImot.ploshtad_kvsm) : ''}">
          </div>
          ${popravyanImot ? polePrichina('imot') : ''}
        </div>
        <p class="greshka" id="greshka-imot"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">${popravyanImot ? 'Запиши поправката' : 'Запиши имота'}</button>
          ${popravyanImot ? '<button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>' : ''}
          <p class="drebno">${
            popravyanImot
              ? 'Записва се като събитие <b>ИмотПоправен</b>. Старото не се трие — просто вече не е последната дума.'
              : 'Записва се като събитие <b>ИмотДобавен</b>. Поправка после = ново събитие, не изтриване.'
          }</p>
        </div>
      </form>
    </section>

    <section class="karta${popravyanNaem ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>${popravyanNaem ? 'Поправи наема' : 'Нов наем'}</h2>
        <span>${
          popravyanNaem
            ? 'новата сума важи за БЪДЕЩИТЕ начисления — вече начисленото не мърда'
            : 'парите се въвеждат в евро и се пазят в цели най-малки единици'
        }</span>
      </div>
      ${
        imoti.length === 0
          ? '<p class="drebno">Първо въведи имот — наемът виси на него.</p>'
          : `<form id="forma-naem">
        <div class="poleta">
          <div class="pole">
            <label for="naem-imot">Имот</label>
            <select translate="no" id="naem-imot" name="imotId" required ${popravyanNaem ? 'disabled' : ''}>
              ${imoti
                .map(
                  (i) =>
                    `<option value="${ekraniraj(i.id)}"${
                      popravyanNaem?.imotId === i.id ? ' selected' : ''
                    }>${ekraniraj(opisi(i))}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="naem-naemetel">Наемател</label>
            <input translate="no" id="naem-naemetel" name="naemetel" required placeholder="име или дружество" autocomplete="off"
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.naemetel) : ''}">
          </div>
          <div class="pole">
            <label for="naem-telefon">Телефон (по избор)</label>
            <input translate="no" id="naem-telefon" name="telefon" placeholder="0888 123 456" autocomplete="off"
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.telefon) : ''}">
          </div>
          <div class="pole">
            <label for="naem-imeyl">Имейл (по избор)</label>
            <input translate="no" id="naem-imeyl" name="imeyl" type="email" placeholder="ime@primer.bg" autocomplete="off"
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.imeyl) : ''}">
          </div>
          <div class="pole">
            <label for="naem-suma">Наем на месец, € — с ДДС</label>
            <input translate="no" id="naem-suma" name="naem" required inputmode="decimal" placeholder="1150,00" autocomplete="off"
                   value="${popravyanNaem ? pishiVPole(popravyanNaem.naem_st) : ''}">
          </div>
          <div class="pole">
            <label for="naem-sektor">Сектор — определя ставката</label>
            <select translate="no" id="naem-sektor" name="sektor" required>
              ${sektoriNaNaem()
                .map(
                  (a) =>
                    `<option value="${ekraniraj(a.klyuch)}"${
                      popravyanNaem?.sektor === a.klyuch ? ' selected' : ''
                    }>${ekraniraj(a.sektor)} · ${a.stavka}%</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="naem-depozit">Депозит, € (по избор)</label>
            <input translate="no" id="naem-depozit" name="depozit" inputmode="decimal" placeholder="1150,00" autocomplete="off"
                   value="${popravyanNaem && popravyanNaem.depozit_st > 0 ? pishiVPole(popravyanNaem.depozit_st) : ''}">
          </div>
          <div class="pole">
            <label for="naem-padezh">Падеж — ден от месеца</label>
            <input translate="no" id="naem-padezh" name="padezhDen" type="number" min="1" max="31" required
                   value="${popravyanNaem ? popravyanNaem.padezhDen : 1}">
          </div>
          <div class="pole">
            <label for="naem-ot">Договор от</label>
            <input translate="no" id="naem-ot" name="ot" type="date" required
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.ot.slice(0, 10)) : dnes()}">
          </div>
          ${popravyanNaem ? polePrichina('naem') : ''}
        </div>
        <p class="greshka" id="greshka-naem"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">${popravyanNaem ? 'Запиши поправката' : 'Запиши наема'}</button>
          ${popravyanNaem ? '<button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>' : ''}
          <p class="drebno">1150,50 € става 115050 най-малки единици. Никакъв float — иначе центовете се разминават в ДДС.<br>Сумата е <b>обща цена с ДДС</b>; ДДС-то се изважда на отделен ред в „Сметки", не се прибавя тук.</p>
        </div>
      </form>`
      }
    </section>

    <section>
      <div class="dyalglava"><h2>Имоти</h2><span>${imoti.length} ${imoti.length === 1 ? 'единица' : 'единици'}</span></div>
      <div class="tablitsa">
        <div class="glava imot">
          <span>Място и единица</span><span>Наемател</span><span>Площ</span>
          <span class="suma">Наем / мес.</span><span>Състояние</span><span></span>
        </div>
        ${
          imoti.length === 0
            ? `<p class="prazno">Още няма нито един имот.<br>Въведи първия горе — той влиза в Журнала като събитие и остава там завинаги.</p>`
            : imoti.map((i) => redImot(i, naemiPoImot.get(i.id) ?? [])).join('')
        }
      </div>
    </section>

    ${
      naemi.length === 0
        ? ''
        : `<section>
      <div class="dyalglava">
        <h2>Наеми</h2>
        <span>${zhivi.length} ${zhivi.length === 1 ? 'жив' : 'живи'}${
          naemi.length - zhivi.length ? ` · ${naemi.length - zhivi.length} прекратени` : ''
        }</span>
      </div>
      ${poleZaTarsene('naemi')}
      <div class="tablitsa">
        <div class="glava naem">
          ${koloniNaNaemite(ogledalo)
            .map((kol) =>
              glavaSFiltar('naemi', kol, naemi, dnesKato(), kol.vid === 'evro'),
            )
            .join('')}<span></span>
        </div>
        ${
          filtriraniNaemi.redove.length === 0
            ? '<p class="prazno">Филтърът не остави нито един ред.</p>'
            : filtriraniNaemi.redove.map((n) => redNaem(n, ogledalo)).join('')
        }
      </div>
      ${redZaSkritoto(filtriraniNaemi, 'naemi')}
    </section>`
    }
  `;
}

function polePrichina(koe: string): string {
  return `
    <div class="pole">
      <label for="${koe}-prichina">Защо се поправя</label>
      <input translate="no" id="${koe}-prichina" name="prichina" placeholder="напр. сбъркан номер" autocomplete="off">
    </div>`;
}

function formaPrekratyavane(naem: Naem): string {
  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>Прекрати наема</h2>
        <span>${ekraniraj(naem.naemetel)} · вече начисленото остава дължимо</span>
      </div>
      <form id="forma-prekrati" data-naem="${ekraniraj(naem.id)}">
        <div class="poleta">
          <div class="pole">
            <label for="prekrati-kraj">Договорът свършва на</label>
            <input translate="no" id="prekrati-kraj" name="kraj" type="date" value="${dnes()}" required>
          </div>
          <div class="pole">
            <label for="prekrati-prichina">Защо</label>
            <input translate="no" id="prekrati-prichina" name="prichina" placeholder="напр. изнесоха се" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-prekrati"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Прекрати</button>
          <button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>
          <p class="drebno">Записва се като <b>НаемПрекратен</b>. Наемът спира да се начислява от следващия месец; начисленото досега си стои.</p>
        </div>
      </form>
    </section>`;
}

function redImot(imot: Imot, naemi: readonly Naem[]): string {
  // Всички живи наеми, не само първият — нищо не изчезва тихо.
  const zhivi = naemi.filter((n) => !n.prekraten);
  const sbor = zhivi.reduce((s, n) => s + n.naem_st, 0);
  const koy = zhivi.length === 0
    ? '<span>—</span>'
    : `<b>${ekraniraj(zhivi[0]!.naemetel)}</b><span>${
        zhivi.length === 1
          ? `падеж ${zhivi[0]!.padezhDen}-о число`
          : `и още ${zhivi.length - 1} · ${zhivi.slice(1).map((n) => ekraniraj(n.naemetel)).join(', ')}`
      }</span>`;
  return `
    <div class="red imot" translate="no">
      <span class="kletka"><b>${ekraniraj(imot.adres)}</b><span>${ekraniraj(imot.edinitsa)}</span></span>
      <span class="kletka">${koy}</span>
      <span class="kletka"><span>${imot.ploshtad_kvsm > 0 ? `${kvSmVM2(imot.ploshtad_kvsm)} м²` : '—'}</span></span>
      <span class="suma">${zhivi.length ? pishi(sbor) : '—'}</span>
      <span>${
        zhivi.length > 1
          ? `<span class="znachka trevoga">${zhivi.length} наема</span>`
          : zhivi.length === 1
            ? '<span class="znachka dobre">отдаден</span>'
            : '<span class="znachka tiha">свободен</span>'
      }</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-popravi-imot="${ekraniraj(imot.id)}">Поправи</button>
        <button type="button" class="vtorichen malak" data-storno-imot="${imot.seq}">Сторно</button>
        ${butonIstoriya('imot', imot.id)}
      </span>
    </div>`;
}

function redNaem(naem: Naem, o: Ogledalo): string {
  const imot = o.imoti.get(naem.imotId);
  const a = akumulator(naem.sektor);
  return `
    <div class="red naem" translate="no">
      <span class="kletka"><b>${ekraniraj(naem.naemetel)}</b><span>падеж ${naem.padezhDen}-о число · от ${ekraniraj(naem.ot.slice(0, 10))}${
        naem.telefon ? ` · ${ekraniraj(naem.telefon)}` : ''
      }${naem.imeyl ? ` · ${ekraniraj(naem.imeyl)}` : ''}</span></span>
      <span class="kletka"><span>${imot ? ekraniraj(opisi(imot)) : ekraniraj(naem.imotId)}</span></span>
      <span class="kletka"><span>${ekraniraj(a.sektor)} · ${a.stavka}%</span></span>
      <span class="suma">${pishi(naem.naem_st)}</span>
      <span>${
        naem.prekraten
          ? `<span class="znachka tiha">прекратен${naem.kraj ? ` ${ekraniraj(naem.kraj.slice(0, 10))}` : ''}</span>`
          : '<span class="znachka dobre">жив</span>'
      }</span>
      <span class="butoni">
        ${naem.prekraten ? '' : `<button type="button" class="vtorichen malak" data-prekrati="${ekraniraj(naem.id)}">Прекрати</button>`}
        <button type="button" class="vtorichen malak" data-popravi-naem="${ekraniraj(naem.id)}">Поправи</button>
        <button type="button" class="vtorichen malak" data-storno-naem="${naem.seq}">Сторно</button>
        ${butonIstoriya('naem', naem.id)}
      </span>
    </div>`;
}

function opisi(i: Imot): string {
  return `${i.adres} · ${i.edinitsa}`;
}

export function zakachiFormite(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  // ── имот: нов или поправен ───────────────────────────────────────────────
  const formaImot = koren.querySelector<HTMLFormElement>('#forma-imot');
  formaImot?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-imot')!;
    greshka.textContent = '';
    const danni = new FormData(formaImot);
    const buton = formaImot.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let ploshtad_kvsm = 0;
    const surovaPloshtad = String(danni.get('ploshtad') ?? '').trim();
    if (surovaPloshtad !== '') {
      try {
        // Площта си има СВОЙ четец (правило 3 · ADR-014): паричният приемаше
        // „72,40 €" за площ и залепваше знака на валутата при показване.
        ploshtad_kvsm = ploshtVKvSm(surovaPloshtad);
      } catch (e) {
        greshka.textContent = dumiZaGreshka(e);
        return;
      }
    }

    const opis = {
      adres: String(danni.get('adres')).trim(),
      edinitsa: String(danni.get('edinitsa')).trim(),
      ploshtad_kvsm,
    };

    buton.disabled = true;
    try {
      if (rezhim.kakvo === 'popravi-imot') {
        await k.deystviya.popraviImot(
          { imotId: rezhim.id, ...opis, prichina: String(danni.get('prichina') ?? '').trim() },
          { opId: opIdDeystvie },
        );
        opIdDeystvie = novOpId();
        rezhim = { kakvo: 'nov' };
        k.vest('dobre', 'Поправката е записана. Старото описание остава в Журнала.');
      } else {
        await k.deystviya.dobaviImot(`I:${crypto.randomUUID()}`, opis, { opId: opIdImot });
        opIdImot = novOpId();
        formaImot.reset();
        k.vest('dobre', 'Имотът е записан в Журнала.');
      }
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── наем: нов или поправен ───────────────────────────────────────────────
  const formaNaem = koren.querySelector<HTMLFormElement>('#forma-naem');
  formaNaem?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-naem')!;
    greshka.textContent = '';
    const danni = new FormData(formaNaem);
    const buton = formaNaem.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let naem_st: number;
    let depozit_st = 0;
    let ot: string;
    try {
      naem_st = otLeva(String(danni.get('naem')));
      const surovDepozit = String(danni.get('depozit') ?? '').trim();
      if (surovDepozit !== '') depozit_st = otLeva(surovDepozit);
      ot = otData(String(danni.get('ot') ?? ''), 'Датата „Договор от“');
    } catch (e) {
      greshka.textContent =
        e instanceof GreshkaPari || e instanceof GreshkaData ? e.message : String(e);
      return;
    }

    buton.disabled = true;
    try {
      if (rezhim.kakvo === 'popravi-naem') {
        const star = (await k.deystviya.ogledalo()).naemi.get(rezhim.id)!;
        await k.deystviya.popraviNaem(
          {
            naemId: rezhim.id,
            naemetel: String(danni.get('naemetel')).trim(),
            telefon: String(danni.get('telefon') ?? '').trim(),
            imeyl: String(danni.get('imeyl') ?? '').trim(),
            naem_st,
            padezhDen: Number(danni.get('padezhDen')),
            ot,
            do: star.do,
            depozit_st,
            sektor: String(danni.get('sektor')),
            prichina: String(danni.get('prichina') ?? '').trim(),
          },
          { opId: opIdDeystvie },
        );
        opIdDeystvie = novOpId();
        rezhim = { kakvo: 'nov' };
        k.vest('dobre', 'Поправката е записана. Новата сума важи за бъдещите начисления.');
      } else {
        await k.deystviya.dobaviNaem(
          `N:${crypto.randomUUID()}`,
          {
            imotId: String(danni.get('imotId')),
            naemetel: String(danni.get('naemetel')).trim(),
            telefon: String(danni.get('telefon') ?? '').trim(),
            imeyl: String(danni.get('imeyl') ?? '').trim(),
            naem_st,
            padezhDen: Number(danni.get('padezhDen')),
            ot,
            do: '',
            depozit_st,
            sektor: String(danni.get('sektor')),
          },
          { opId: opIdNaem },
        );
        opIdNaem = novOpId();
        formaNaem.reset();
        k.vest('dobre', 'Наемът е записан в Журнала.');
      }
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── прекратяване ─────────────────────────────────────────────────────────
  const formaPrekrati = koren.querySelector<HTMLFormElement>('#forma-prekrati');
  formaPrekrati?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-prekrati')!;
    greshka.textContent = '';
    const danni = new FormData(formaPrekrati);
    const buton = formaPrekrati.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let kraj: string;
    try {
      kraj = otData(String(danni.get('kraj') ?? ''), 'Датата на края');
    } catch (e) {
      greshka.textContent = e instanceof GreshkaData ? e.message : String(e);
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.prekratiNaem(
        {
          naemId: formaPrekrati.dataset['naem']!,
          kraj,
          prichina: String(danni.get('prichina') ?? '').trim() || 'без посочена причина',
        },
        { opId: opIdDeystvie },
      );
      opIdDeystvie = novOpId();
      rezhim = { kakvo: 'nov' };
      k.vest('dobre', 'Наемът е прекратен. Начисленото досега си остава дължимо.');
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── бутоните по редовете ─────────────────────────────────────────────────
  for (const [znak, kakvo] of [
    ['data-popravi-imot', 'popravi-imot'],
    ['data-popravi-naem', 'popravi-naem'],
    ['data-prekrati', 'prekrati'],
  ] as const) {
    for (const b of koren.querySelectorAll<HTMLButtonElement>(`[${znak}]`)) {
      b.addEventListener('click', async () => {
        rezhim = { kakvo, id: b.getAttribute(znak)! };
        opIdDeystvie = novOpId();
        await prerisuvay();
      });
    }
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-otkazhi-rezhim]')) {
    b.addEventListener('click', async () => {
      rezhim = { kakvo: 'nov' };
      await prerisuvay();
    });
  }

  for (const [znak, vid, kakvo] of [
    ['data-storno-imot', VID.imot, 'имотът'],
    ['data-storno-naem', VID.naem, 'наемът'],
  ] as const) {
    for (const b of koren.querySelectorAll<HTMLButtonElement>(`[${znak}]`)) {
      b.addEventListener('click', async () => {
        b.disabled = true;
        const izhod = await opitajStorno(k, Number(b.getAttribute(znak)), vid, kakvo);
        if (izhod.kazano) k.vest(izhod.vid, izhod.kazano);
        rezhim = { kakvo: 'nov' };
        await prerisuvay();
      });
    }
  }
}

function dnes(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Днешният ден — за групите на филтъра по дата. */
function dnesKato(): string {
  return dnes();
}

/** Всичко, написано от човек, минава оттук, преди да влезе в HTML. */
export function ekraniraj(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
