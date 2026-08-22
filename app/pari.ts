/**
 * Екран „Пари" — какво ти дължат, кой закъснява, какво е влязло.
 *
 * Начисляването е партида и си носи сверката. Плащането се разнася срещу
 * КОНКРЕТНО вземане. Поправка = сторно, не изтриване.
 */

import { GreshkaPari, kakvoPishe, otLeva } from '../src/yadro/pari.js';
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
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

/** Кое вземане чака плащане в момента. Живее, докато формата е отворена. */
let izbrano: string | null = null;
let opIdPlashtane = novOpId();

function novOpId(): string {
  return crypto.randomUUID();
}

export function narisuvayPari(o: Ogledalo, dnes: string): string {
  const zakasneli = prosrocheni(o, dnes);
  const otvoreni = [...o.vzemaniya.values()]
    .filter((v) => v.ostatak_st > 0 && !zakasneli.some((z) => z.id === v.id))
    .sort((a, b) => a.padezh.localeCompare(b.padezh));

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
        <span class="chislo">${kakvoPishe(duljimo(o) as never)}</span>
        <span class="pod">${o.vzemaniya.size} ${o.vzemaniya.size === 1 ? 'вземане' : 'вземания'} · лв.</span>
      </div>
      <div class="plochka${prosrocheno_st > 0 ? ' trevoga' : ''}">
        <span class="etiket">Просрочено</span>
        <span class="chislo">${kakvoPishe(prosrocheno_st as never)}</span>
        <span class="pod">${zakasneli.length} ${zakasneli.length === 1 ? 'вземане' : 'вземания'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Събрано през ${mesets}</span>
        <span class="chislo">${kakvoPishe(sabranoMesets as never)}</span>
        <span class="pod">по дата на плащане</span>
      </div>
      <div class="plochka">
        <span class="etiket">Отворени, в срок</span>
        <span class="chislo">${otvoreni.length}</span>
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
            <input id="period" name="period" type="month" value="${mesets}" required>
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
      <div class="tablitsa">
        <div class="glava vzemane">
          <span>Наемател и имот</span><span>Период</span><span>Падеж</span>
          <span class="suma">Остатък</span><span></span>
        </div>
        ${
          zakasneli.length === 0
            ? '<p class="prazno">Нищо не е просрочено.</p>'
            : zakasneli.map((v) => redVzemane(o, v, v.dniZakasnenie)).join('')
        }
      </div>
    </section>

    ${
      otvoreni.length === 0
        ? ''
        : `<section>
      <div class="dyalglava"><h2>В срок</h2><span>${otvoreni.length}</span></div>
      <div class="tablitsa">
        <div class="glava vzemane">
          <span>Наемател и имот</span><span>Период</span><span>Падеж</span>
          <span class="suma">Остатък</span><span></span>
        </div>
        ${otvoreni.map((v) => redVzemane(o, v, 0)).join('')}
      </div>
    </section>`
    }

    <section>
      <div class="dyalglava">
        <h2>Приети плащания</h2>
        <span>${o.plashtaniya.size} · поправка = сторно, не триене</span>
      </div>
      <div class="tablitsa">
        <div class="glava plashtane">
          <span>Дата</span><span>Срещу</span><span>Начин</span>
          <span class="suma">Сума</span><span></span>
        </div>
        ${
          o.plashtaniya.size === 0
            ? '<p class="prazno">Още няма прието плащане.</p>'
            : [...o.plashtaniya.values()]
                .sort((a, b) => b.seq - a.seq)
                .map((p) => redPlashtane(o, p))
                .join('')
        }
      </div>
    </section>
  `;
}

function opisiVzemane(o: Ogledalo, v: Vzemane): { koy: string; kade: string } {
  const naem = o.naemi.get(v.naemId);
  const imot = naem ? o.imoti.get(naem.imotId) : undefined;
  return {
    koy: naem?.naemetel ?? '—',
    kade: imot ? `${imot.adres} · ${imot.edinitsa}` : v.naemId,
  };
}

function redVzemane(o: Ogledalo, v: Vzemane, dni: number): string {
  const { koy, kade } = opisiVzemane(o, v);
  return `
    <div class="red vzemane">
      <span class="kletka"><b>${ekraniraj(koy)}</b><span>${ekraniraj(kade)}</span></span>
      <span class="kletka"><span>${v.period}</span></span>
      <span class="kletka">
        <span>${v.padezh}</span>
        ${dni > 0 ? `<span class="zakasnenie">закъснял ${dni} ${dni === 1 ? 'ден' : 'дни'}</span>` : ''}
      </span>
      <span class="suma${dni > 0 ? ' duljimo' : ''}">${kakvoPishe(v.ostatak_st as never)}</span>
      <span>
        <button type="button" class="vtorichen malak" data-plati="${ekraniraj(v.id)}">
          ${izbrano === v.id ? 'Затвори' : 'Приеми плащане'}
        </button>
      </span>
    </div>`;
}

function redPlashtane(o: Ogledalo, p: Plashtane): string {
  const v = o.vzemaniya.get(p.vzemaneId);
  const opis = v ? opisiVzemane(o, v) : { koy: '—', kade: p.vzemaneId };
  return `
    <div class="red plashtane">
      <span class="kletka"><b>${p.data}</b><span>seq ${p.seq}</span></span>
      <span class="kletka"><b>${ekraniraj(opis.koy)}</b><span>${v ? `${v.period} · ` : ''}${ekraniraj(opis.kade)}</span></span>
      <span class="kletka"><span>${ekraniraj(p.nachin)}</span></span>
      <span class="suma plateno">${kakvoPishe(p.suma_st as never)}</span>
      <span>
        <button type="button" class="vtorichen malak" data-storno="${p.seq}" data-storno-koe="${ekraniraj(p.id)}">Сторно</button>
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
            <label for="pl-suma">Сума, лв.</label>
            <input id="pl-suma" name="suma" inputmode="decimal" required
                   value="${kakvoPishe(v.ostatak_st as never)}" autocomplete="off">
          </div>
          <div class="pole">
            <label for="pl-nachin">Начин</label>
            <select id="pl-nachin" name="nachin">
              <option value="банка">банка</option>
              <option value="в брой">в брой</option>
            </select>
          </div>
          <div class="pole">
            <label for="pl-data">Дата</label>
            <input id="pl-data" name="data" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
          </div>
        </div>
        <p class="greshka" id="greshka-plashtane"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Приеми ${kakvoPishe(v.ostatak_st as never)} лв.</button>
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
        err instanceof GreshkaNachislyavane || err instanceof Error
          ? err.message
          : String(err);
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
    try {
      suma_st = otLeva(String(danni.get('suma')));
    } catch (err) {
      greshka.textContent = err instanceof GreshkaPari ? err.message : String(err);
      return;
    }
    if (suma_st <= 0) {
      greshka.textContent = 'Сумата трябва да е повече от нула.';
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
          data: String(danni.get('data')),
        },
        { opId: opIdPlashtane },
      );
      opIdPlashtane = novOpId();
      izbrano = null;
      k.vest('dobre', 'Плащането е прието и разнесено срещу вземането.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── сторно ───────────────────────────────────────────────────────────────
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-storno]')) {
    b.addEventListener('click', async () => {
      const seq = Number(b.dataset['storno']);
      const prichina = prompt(
        'Защо се сторнира това плащане?\nПричината остава в Журнала завинаги.',
        '',
      );
      if (prichina === null) return;

      b.disabled = true;
      try {
        await k.deystviya.storniraj(
          `S:${crypto.randomUUID()}`,
          { pogasyavaSeq: seq, prichina: prichina.trim() || 'без посочена причина' },
          { opId: `storno:${crypto.randomUUID()}` },
        );
        k.vest('dobre', `Плащането на seq ${seq} е сторнирано. И двете стоят в Журнала.`);
        await prerisuvay();
      } catch (err) {
        k.vest('zle', err instanceof Error ? err.message : String(err));
        await prerisuvay();
      }
    });
  }
}
