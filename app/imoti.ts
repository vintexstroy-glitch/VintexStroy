/**
 * Екран „Имоти" — тук собственикът пише истинските данни.
 *
 * Формите пишат през ВРАТАТА, не в Журнала. Списъкът се чете от ОГЛЕДАЛОТО,
 * което се преизчислява от Журнала при всяко показване — нищо не се кешира.
 */

import { GreshkaPari, kakvoPishe, otLeva } from '../src/yadro/pari.js';
import { sektoriNaNaem } from '../src/domein/dds.js';
import type { Imot, Naem, Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './main.js';

export interface SastoyanieNaEkrana {
  readonly ogledalo: Ogledalo;
  readonly sabitiya: number;
}

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdImot = novOpId();
let opIdNaem = novOpId();

function novOpId(): string {
  return crypto.randomUUID();
}

export function narisuvayImoti(sastoyanie: SastoyanieNaEkrana, k: Konteks): string {
  const { ogledalo } = sastoyanie;
  const imoti = [...ogledalo.imoti.values()];
  const naemiPoImot = new Map<string, Naem[]>();
  for (const naem of ogledalo.naemi.values()) {
    const spisak = naemiPoImot.get(naem.imotId) ?? [];
    spisak.push(naem);
    naemiPoImot.set(naem.imotId, spisak);
  }

  const mesechno = [...ogledalo.naemi.values()]
    .filter((n) => !n.prekraten)
    .reduce((sbor, n) => sbor + n.naem_st, 0);
  const zaeti = new Set([...ogledalo.naemi.values()].filter((n) => !n.prekraten).map((n) => n.imotId));

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Единици</span>
        <span class="chislo">${imoti.length}</span>
        <span class="pod">въведени от теб</span>
      </div>
      <div class="plochka">
        <span class="etiket">Отдадени</span>
        <span class="chislo">${zaeti.size} / ${imoti.length}</span>
        <span class="pod">${imoti.length - zaeti.size} без наем</span>
      </div>
      <div class="plochka">
        <span class="etiket">Месечен наем</span>
        <span class="chislo">${kakvoPishe(mesechno as never)}</span>
        <span class="pod">начислено · лв.</span>
      </div>
      <div class="plochka">
        <span class="etiket">Събития</span>
        <span class="chislo">${sastoyanie.sabitiya}</span>
        <span class="pod">в Журнала</span>
      </div>
    </div>

    <section class="karta">
      <div class="dyalglava"><h2>Нов имот</h2><span>адресът и единицата правят реда разпознаваем</span></div>
      <form id="forma-imot">
        <div class="poleta">
          <div class="pole">
            <label for="imot-adres">Място или адрес</label>
            <input id="imot-adres" name="adres" required placeholder="напр. Малинова" autocomplete="off">
          </div>
          <div class="pole">
            <label for="imot-edinitsa">Единица</label>
            <input id="imot-edinitsa" name="edinitsa" required placeholder="напр. АП. № 1" autocomplete="off">
          </div>
          <div class="pole">
            <label for="imot-ploshtad">Площ в м² (по избор)</label>
            <input id="imot-ploshtad" name="ploshtad" inputmode="decimal" placeholder="72,40" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-imot"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши имота</button>
          <p class="drebno">Записва се като събитие <b>ИмотДобавен</b>. Поправка после = ново събитие, не изтриване.</p>
        </div>
      </form>
    </section>

    <section class="karta">
      <div class="dyalglava"><h2>Нов наем</h2><span>парите се въвеждат в левове и се пазят в цели стотинки</span></div>
      ${
        imoti.length === 0
          ? '<p class="drebno">Първо въведи имот — наемът виси на него.</p>'
          : `<form id="forma-naem">
        <div class="poleta">
          <div class="pole">
            <label for="naem-imot">Имот</label>
            <select id="naem-imot" name="imotId" required>
              ${imoti.map((i) => `<option value="${ekraniraj(i.id)}">${ekraniraj(opisi(i))}</option>`).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="naem-naemetel">Наемател</label>
            <input id="naem-naemetel" name="naemetel" required placeholder="име или дружество" autocomplete="off">
          </div>
          <div class="pole">
            <label for="naem-suma">Наем на месец, лв. — с ДДС</label>
            <input id="naem-suma" name="naem" required inputmode="decimal" placeholder="1150,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="naem-sektor">Сектор — определя ставката</label>
            <select id="naem-sektor" name="sektor" required>
              ${sektoriNaNaem()
                .map(
                  (a) =>
                    `<option value="${ekraniraj(a.klyuch)}">${ekraniraj(a.sektor)} · ${a.stavka}%</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="naem-depozit">Депозит, лв. (по избор)</label>
            <input id="naem-depozit" name="depozit" inputmode="decimal" placeholder="1150,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="naem-padezh">Падеж — ден от месеца</label>
            <input id="naem-padezh" name="padezhDen" type="number" min="1" max="31" value="1" required>
          </div>
          <div class="pole">
            <label for="naem-ot">Договор от</label>
            <input id="naem-ot" name="ot" type="date" value="${dnes()}" required>
          </div>
        </div>
        <p class="greshka" id="greshka-naem"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши наема</button>
          <p class="drebno">1150,50 лв. става 115050 стотинки. Никакъв float — иначе стотинките се разминават в ДДС.<br>Сумата е <b>обща цена с ДДС</b>; ДДС-то се изважда на отделен ред в „Сметки", не се прибавя тук.</p>
        </div>
      </form>`
      }
    </section>

    <section>
      <div class="dyalglava"><h2>Имоти</h2><span>${imoti.length} ${imoti.length === 1 ? 'единица' : 'единици'}</span></div>
      <div class="tablitsa">
        <div class="glava">
          <span>Място и единица</span><span>Наемател</span><span>Площ</span>
          <span class="suma">Наем / мес.</span><span>Състояние</span>
        </div>
        ${
          imoti.length === 0
            ? `<p class="prazno">Още няма нито един имот.<br>Въведи първия горе — той влиза в Журнала като събитие и остава там завинаги.</p>`
            : imoti.map((i) => red(i, naemiPoImot.get(i.id) ?? [])).join('')
        }
      </div>
    </section>
  `;
}

function red(imot: Imot, naemi: readonly Naem[]): string {
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
    <div class="red">
      <span class="kletka"><b>${ekraniraj(imot.adres)}</b><span>${ekraniraj(imot.edinitsa)}</span></span>
      <span class="kletka">${koy}</span>
      <span class="kletka"><span>${imot.ploshtad_kvsm > 0 ? `${kakvoPishe(imot.ploshtad_kvsm / 100 as never)} м²` : '—'}</span></span>
      <span class="suma">${zhivi.length ? kakvoPishe(sbor as never) : '—'}</span>
      <span>${
        zhivi.length > 1
          ? `<span class="znachka trevoga">${zhivi.length} наема</span>`
          : zhivi.length === 1
            ? '<span class="znachka dobre">отдаден</span>'
            : '<span class="znachka tiha">свободен</span>'
      }</span>
    </div>`;
}

function opisi(i: Imot): string {
  return `${i.adres} · ${i.edinitsa}`;
}

export function zakachiFormite(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
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
        ploshtad_kvsm = otLeva(surovaPloshtad) * 100;
      } catch (e) {
        greshka.textContent = e instanceof GreshkaPari ? e.message : String(e);
        return;
      }
    }

    buton.disabled = true;
    try {
      await k.deystviya.dobaviImot(
        `I:${crypto.randomUUID()}`,
        {
          adres: String(danni.get('adres')).trim(),
          edinitsa: String(danni.get('edinitsa')).trim(),
          ploshtad_kvsm,
        },
        { opId: opIdImot },
      );
      opIdImot = novOpId();
      formaImot.reset();
      k.vest('dobre', 'Имотът е записан в Журнала.');
      await prerisuvay();
    } catch (e) {
      greshka.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      buton.disabled = false;
    }
  });

  const formaNaem = koren.querySelector<HTMLFormElement>('#forma-naem');
  formaNaem?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-naem')!;
    greshka.textContent = '';
    const danni = new FormData(formaNaem);
    const buton = formaNaem.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let naem_st: number;
    let depozit_st = 0;
    try {
      naem_st = otLeva(String(danni.get('naem')));
      const surovDepozit = String(danni.get('depozit') ?? '').trim();
      if (surovDepozit !== '') depozit_st = otLeva(surovDepozit);
    } catch (e) {
      greshka.textContent = e instanceof GreshkaPari ? e.message : String(e);
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.dobaviNaem(
        `N:${crypto.randomUUID()}`,
        {
          imotId: String(danni.get('imotId')),
          naemetel: String(danni.get('naemetel')).trim(),
          naem_st,
          padezhDen: Number(danni.get('padezhDen')),
          ot: String(danni.get('ot')),
          do: '',
          depozit_st,
          sektor: String(danni.get('sektor')),
        },
        { opId: opIdNaem },
      );
      opIdNaem = novOpId();
      formaNaem.reset();
      k.vest('dobre', 'Наемът е записан в Журнала.');
      await prerisuvay();
    } catch (e) {
      greshka.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      buton.disabled = false;
    }
  });
}

function dnes(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Всичко, написано от човек, минава оттук, преди да влезе в HTML. */
export function ekraniraj(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
