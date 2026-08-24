/**
 * Екран „Пари" — какво ти дължат, кой закъснява, какво е влязло.
 *
 * Начисляването е партида и си носи сверката. Плащането се разнася срещу
 * КОНКРЕТНО вземане. Поправка = сторно, не изтриване.
 */

import { SUMATA_NAD_NULA, otLeva, pishi, pishiVPole } from '../src/yadro/pari.js';
import { otData } from '../src/yadro/data.js';
import {
  duljimo,
  prosrocheni,
  type Ogledalo,
  type Plashtane,
  type Vzemane,
} from '../src/ogledalo/ogledalo.js';
import {
  GreshkaNachislyavane,
  nachisliZaPeriod,
  zaNachislyavane,
} from '../src/domein/nachislyavane.js';
import { adresZaPoshta, napishiPismo } from '../src/domein/pismo.js';
import { dumiZaGreshka, ekraniraj } from './imoti.js';
import { butonIstoriya } from './istoriya.js';
import { zakachiStornoButoni } from './storno.js';
import { PRAZEN_FILTAR, filtriray, glaviNaTablitsata, grupiranaTablitsa, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import type { Konteks } from './main.js';

/** Кое вземане чака плащане в момента. Живее, докато формата е отворена. */
let izbrano: string | null = null;
let opIdPlashtane = novOpId();

function novOpId(): string {
  return crypto.randomUUID();
}

/** Колоните на вземанията — фините филтри важат и тук (ADR-022 · вълна 2). */
function koloniNaVzemaniyata(o: Ogledalo): KolonaSFiltar<Vzemane>[] {
  return [
    {
      klyuch: 'koy',
      ime: 'Наемател и имот',
      vid: 'tekst',
      vzemi: (v) => {
        const opis = opisiVzemane(o, v);
        return `${opis.koy} · ${opis.kade}`;
      },
    },
    { klyuch: 'period', ime: 'Период', vid: 'tekst', vzemi: (v) => v.period },
    { klyuch: 'padezh', ime: 'Падеж', vid: 'data', vzemi: (v) => v.padezh },
    { klyuch: 'ostatak', ime: 'Остатък', vid: 'evro', vzemi: (v) => v.ostatak_st },
  ];
}

/** Колоните на приетите плащания. */
function koloniNaPlashtaniyata(o: Ogledalo): KolonaSFiltar<Plashtane>[] {
  return [
    { klyuch: 'data', ime: 'Дата', vid: 'data', vzemi: (p) => p.data },
    {
      klyuch: 'sreshtu',
      ime: 'Срещу',
      vid: 'tekst',
      vzemi: (p) => {
        const v = o.vzemaniya.get(p.vzemaneId);
        if (!v) return p.vzemaneId;
        const opis = opisiVzemane(o, v);
        return `${opis.koy} · ${opis.kade}`;
      },
    },
    { klyuch: 'nachin', ime: 'Начин', vid: 'tekst', vzemi: (p) => p.nachin },
    { klyuch: 'suma', ime: 'Сума', vid: 'evro', vzemi: (p) => p.suma_st },
  ];
}

export function narisuvayPari(o: Ogledalo, dnes: string): string {
  const zakasneli = prosrocheni(o, dnes);
  const otvoreni = [...o.vzemaniya.values()]
    .filter((v) => v.ostatak_st > 0 && !zakasneli.some((z) => z.id === v.id))
    .sort((a, b) => a.padezh.localeCompare(b.padezh));
  const koloniVz = koloniNaVzemaniyata(o);
  const fZakasneli = filtriray('prosrocheni', zakasneli, koloniVz, dnes);
  const fOtvoreni = filtriray('vsrok', otvoreni, koloniVz, dnes);

  const mesets = dnes.slice(0, 7);
  const sabranoMesets = [...o.plashtaniya.values()]
    .filter((p) => p.data.slice(0, 7) === mesets)
    .reduce((s, p) => s + p.suma_st, 0);
  const prosrocheno_st = zakasneli.reduce((s, v) => s + v.ostatak_st, 0);

  const zaMeseca = zaNachislyavane(o, mesets).length;
  const vecheZaMeseca = [...o.vzemaniya.values()].filter((v) => v.period === mesets).length;

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Дължимо общо</span>
        <span class="chislo" translate="no">${pishi(duljimo(o))}</span>
        <span class="pod">${o.vzemaniya.size} ${o.vzemaniya.size === 1 ? 'вземане' : 'вземания'} · €</span>
      </div>
      <div class="plochka${prosrocheno_st > 0 ? ' trevoga' : ''}">
        <span class="etiket">Просрочено</span>
        <span class="chislo" translate="no">${pishi(prosrocheno_st)}</span>
        <span class="pod">${zakasneli.length} ${zakasneli.length === 1 ? 'вземане' : 'вземания'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Събрано през ${mesets}</span>
        <span class="chislo" translate="no">${pishi(sabranoMesets)}</span>
        <span class="pod">по дата на плащане</span>
      </div>
      <div class="plochka">
        <span class="etiket">Отворени, в срок</span>
        <span class="chislo" translate="no">${otvoreni.length}</span>
        <span class="pod">още не са закъснели</span>
      </div>
    </div>

    <section class="karta">
      <div class="dyalglava">
        <h2>Начисляване</h2>
        <span>${zaMeseca} живи наема за ${mesets} · ${vecheZaMeseca} вече начислени</span>
      </div>
      <form id="forma-nachisli">
        <div class="poleta tesni">
          <div class="pole">
            <label for="period">Месец</label>
            <input translate="no" id="period" name="period" type="month" value="${mesets}" required>
          </div>
        </div>
        <p class="greshka" id="greshka-nachisli"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Начисли наемите</button>
          <p class="drebno">Натиснато два пъти, начислява веднъж — <b>opId</b> е производен от месеца и наема. Партидата завършва със сверка.</p>
        </div>
      </form>
    </section>

    ${izbrano ? formaPlashtane(o, izbrano) : ''}

    <section>
      <div class="dyalglava">
        <h2>Просрочени</h2>
        <span>${zakasneli.length ? 'най-закъснелите отгоре' : 'няма'}</span>
      </div>
      ${zakasneli.length ? poleZaTarsene('prosrocheni') : ''}
      <div class="tablitsa" data-tablitsa="prosrocheni">
        <div class="glava vzemane">
          ${glaviNaTablitsata('prosrocheni', koloniVz, zakasneli, dnes)}<span></span>
        </div>
        ${
          zakasneli.length === 0
            ? '<p class="prazno">Нищо не е просрочено.</p>'
            : fZakasneli.redove.length === 0
              ? PRAZEN_FILTAR
              : grupiranaTablitsa('prosrocheni', fZakasneli.redove, koloniVz, dnes, (v) => redVzemane(o, v, v.dniZakasnenie))
        }
      </div>
      ${redZaSkritoto(fZakasneli, 'prosrocheni')}
    </section>

    ${
      otvoreni.length === 0
        ? ''
        : `<section>
      <div class="dyalglava"><h2>В срок</h2><span>${otvoreni.length}</span></div>
      ${poleZaTarsene('vsrok')}
      <div class="tablitsa" data-tablitsa="vsrok">
        <div class="glava vzemane">
          ${glaviNaTablitsata('vsrok', koloniVz, otvoreni, dnes)}<span></span>
        </div>
        ${
          fOtvoreni.redove.length === 0
            ? PRAZEN_FILTAR
            : grupiranaTablitsa('vsrok', fOtvoreni.redove, koloniVz, dnes, (v) => redVzemane(o, v, 0))
        }
      </div>
      ${redZaSkritoto(fOtvoreni, 'vsrok')}
    </section>`
    }

    ${narisuvayPlashtaniyata(o, dnes)}
  `;
}

function narisuvayPlashtaniyata(o: Ogledalo, dnes: string): string {
  const koloni = koloniNaPlashtaniyata(o);
  const vsichki = [...o.plashtaniya.values()].sort((a, b) => b.seq - a.seq);
  const f = filtriray('plashtaniya', vsichki, koloni, dnes);
  return `
    <section>
      <div class="dyalglava">
        <h2>Приети плащания</h2>
        <span>${o.plashtaniya.size} · поправка = сторно, не триене</span>
      </div>
      ${vsichki.length ? poleZaTarsene('plashtaniya') : ''}
      <div class="tablitsa" data-tablitsa="plashtaniya">
        <div class="glava plashtane">
          ${glaviNaTablitsata('plashtaniya', koloni, vsichki, dnes)}<span></span>
        </div>
        ${
          vsichki.length === 0
            ? '<p class="prazno">Още няма прието плащане.</p>'
            : f.redove.length === 0
              ? PRAZEN_FILTAR
              : grupiranaTablitsa('plashtaniya', f.redove, koloni, dnes, (p) => redPlashtane(o, p))
        }
      </div>
      ${redZaSkritoto(f, 'plashtaniya')}
    </section>
  `;
}

function opisiVzemane(
  o: Ogledalo,
  v: Vzemane,
): { koy: string; kade: string; telefon: string; imeyl: string } {
  const naem = o.naemi.get(v.naemId);
  const imot = naem ? o.imoti.get(naem.imotId) : undefined;
  return {
    koy: naem?.naemetel ?? '—',
    kade: imot ? `${imot.adres} · ${imot.edinitsa}` : v.naemId,
    telefon: naem?.telefon ?? '',
    imeyl: naem?.imeyl ?? '',
  };
}

/**
 * БУТОНЪТ ЗА ПИСМО · само когато има КЪДЕ да отиде.
 *
 * Писмото тръгва от пощата на собственика с попълнен текст — той го чете и
 * натиска Изпрати. Автоматичното изпращане иска сървър (правило 10), а писмо
 * за пари, което никой не е прочел, отива и до онзи, който е платил в брой
 * вчера.
 *
 * Без имейл бутон НЯМА, но телефонът се вижда: тогава се звъни.
 */
function butonPismo(o: Ogledalo, v: Vzemane, dni: number): string {
  const { koy, kade, imeyl } = opisiVzemane(o, v);
  const adres = adresZaPoshta(
    napishiPismo({
      naemetel: koy,
      imeyl,
      imot: kade,
      period: v.period,
      padezh: v.padezh,
      ostatak_st: v.ostatak_st,
      dniZakasnenie: dni,
    }),
  );
  if (!adres) return '';
  return `<a class="vtorichen malak kato-buton" href="${ekraniraj(adres)}" data-pismo="${ekraniraj(v.id)}">Писмо</a>`;
}

function redVzemane(o: Ogledalo, v: Vzemane, dni: number): string {
  const { koy, kade, telefon, imeyl } = opisiVzemane(o, v);
  const zavrazka = [telefon, imeyl].filter((x) => x !== '').join(' · ');
  return `
    <div class="red vzemane" translate="no">
      <span class="kletka"><b>${ekraniraj(koy)}</b><span>${ekraniraj(kade)}${
        zavrazka ? ` · ${ekraniraj(zavrazka)}` : ''
      }</span></span>
      <span class="kletka"><span>${v.period}</span></span>
      <span class="kletka">
        <span>${v.padezh}</span>
        ${dni > 0 ? `<span class="zakasnenie">закъснял ${dni} ${dni === 1 ? 'ден' : 'дни'}</span>` : ''}
      </span>
      <span class="suma${dni > 0 ? ' duljimo' : ''}" data-st="${v.ostatak_st}">${pishi(v.ostatak_st)}</span>
      <span class="butoni">
        ${dni > 0 ? butonPismo(o, v, dni) : ''}
        <button type="button" class="vtorichen malak" data-plati="${ekraniraj(v.id)}">
          ${izbrano === v.id ? 'Затвори' : 'Приеми плащане'}
        </button>
        <button type="button" class="vtorichen malak" data-storno-vzemane="${v.seq}">Сторно</button>
        ${butonIstoriya('vzemane', v.id)}
      </span>
    </div>`;
}

function redPlashtane(o: Ogledalo, p: Plashtane): string {
  const v = o.vzemaniya.get(p.vzemaneId);
  const opis = v ? opisiVzemane(o, v) : { koy: '—', kade: p.vzemaneId };
  return `
    <div class="red plashtane" translate="no">
      <span class="kletka"><b>${ekraniraj(p.data)}</b><span>seq ${p.seq}</span></span>
      <span class="kletka"><b>${ekraniraj(opis.koy)}</b><span>${v ? `${v.period} · ` : ''}${ekraniraj(opis.kade)}</span></span>
      <span class="kletka"><span>${ekraniraj(p.nachin)}</span></span>
      <span class="suma plateno" data-st="${p.suma_st}">${pishi(p.suma_st)}</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-storno="${p.seq}">Сторно</button>
        ${butonIstoriya('plashtane', p.id)}
      </span>
    </div>`;
}

function formaPlashtane(o: Ogledalo, vzemaneId: string): string {
  const v = o.vzemaniya.get(vzemaneId);
  if (!v) return '';
  const { koy, kade } = opisiVzemane(o, v);
  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>Приеми плащане</h2>
        <span>${ekraniraj(koy)} · ${ekraniraj(kade)} · ${v.period}</span>
      </div>
      <form id="forma-plashtane" data-vzemane="${ekraniraj(v.id)}">
        <div class="poleta">
          <div class="pole">
            <label for="pl-suma">Сума, €</label>
            <input translate="no" id="pl-suma" name="suma" inputmode="decimal" required
                   value="${pishiVPole(v.ostatak_st)}" autocomplete="off">
          </div>
          <div class="pole">
            <label for="pl-nachin">Начин</label>
            <select translate="no" id="pl-nachin" name="nachin">
              <option value="банка">банка</option>
              <option value="в брой">в брой</option>
            </select>
          </div>
          <div class="pole">
            <label for="pl-data">Дата</label>
            <input translate="no" id="pl-data" name="data" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
          </div>
        </div>
        <p class="greshka" id="greshka-plashtane"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Приеми ${pishi(v.ostatak_st)}</button>
          <button type="button" class="vtorichen" data-otkazhi>Откажи</button>
          <p class="drebno">Сумата се редактира — частичното плащане е нормално и остатъкът се смята сам.</p>
        </div>
      </form>
    </section>`;
}

export function zakachiPari(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  // ── начисляване ──────────────────────────────────────────────────────────
  const formaNachisli = koren.querySelector<HTMLFormElement>('#forma-nachisli');
  formaNachisli?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-nachisli')!;
    greshka.textContent = '';
    const buton = formaNachisli.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const period = String(new FormData(formaNachisli).get('period'));

    buton.disabled = true;
    try {
      const r = await nachisliZaPeriod({
        deystviya: k.deystviya,
        period,
        kogato: new Date().toISOString(),
      });
      k.vest(
        'dobre',
        r.nachisleni === 0 && r.veche > 0
          ? `${period} вече е начислен — ${r.veche} ${r.veche === 1 ? 'вземане' : 'вземания'}, нищо ново не влезе.`
          : `${period}: ${r.nachisleni} ${r.nachisleni === 1 ? 'начислено вземане' : 'начислени вземания'}` +
              `${r.veche ? `, ${r.veche} вече бяха` : ''}. Сверката затваря.`,
      );
      await prerisuvay();
    } catch (err) {
      greshka.textContent =
        dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── избор на вземане ─────────────────────────────────────────────────────
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-plati]')) {
    b.addEventListener('click', async () => {
      const koe = b.dataset['plati']!;
      izbrano = izbrano === koe ? null : koe;
      opIdPlashtane = novOpId();
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('[data-otkazhi]')?.addEventListener('click', async () => {
    izbrano = null;
    await prerisuvay();
  });

  // ── приемане на плащане ──────────────────────────────────────────────────
  const formaPl = koren.querySelector<HTMLFormElement>('#forma-plashtane');
  formaPl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-plashtane')!;
    greshka.textContent = '';
    const danni = new FormData(formaPl);
    const buton = formaPl.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let suma_st: number;
    let data: string;
    try {
      suma_st = otLeva(String(danni.get('suma')));
      data = otData(String(danni.get('data') ?? ''), 'Датата на плащането');
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
      return;
    }
    if (suma_st <= 0) {
      greshka.textContent = SUMATA_NAD_NULA;
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.priemiPlashtane(
        `P:${crypto.randomUUID()}`,
        {
          vzemaneId: formaPl.dataset['vzemane']!,
          suma_st,
          nachin: String(danni.get('nachin')) as 'банка' | 'в брой',
          data,
        },
        { opId: opIdPlashtane },
      );
      opIdPlashtane = novOpId();
      izbrano = null;
      k.vest('dobre', 'Плащането е прието и разнесено срещу вземането.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── сторно · и на плащане, и на начисление, винаги през вратаря ─────────
  // Обиколката е една за трите екрана (`storno.ts`); тук е само разликата —
  // след сторното избраното вземане се пуска.
  zakachiStornoButoni(
    koren,
    k,
    [
      ['data-storno', 'плащането'],
      ['data-storno-vzemane', 'начислението'],
    ],
    async () => {
      izbrano = null;
      await prerisuvay();
    },
  );
}
