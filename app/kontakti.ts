/**
 * КОНТАКТИ И ПРЕПИСКИ · ЕДИН таб, ДВЕ секции (резен 38 · M10 · ADR-098).
 *
 * Негови думи: „**Един таб, две секции**" *(р57·[30])* · „Има още **събери
 * Преписки и контакти**… **кога са за взимане** кто опция и дата" *(р57·[28])* ·
 * „**КОгато се вкарва човек става от Преписки и контакти**" *(р65·[46])*.
 *
 * Редът на секциите е неговият ред в изречението: първо ПРЕПИСКИТЕ (работата),
 * после КОНТАКТИТЕ (хората). Работата се гледа всеки ден; списъкът с хора —
 * когато има какво да се допълни.
 */

import {
  imenataNaKontaktite,
  kontaktite,
  SASTOYANIYA_NA_PREPISKA,
  sveriKontaktite,
  zaVzimane,
  type Kontakt,
  type Prepiska,
} from '../src/domein/kontakti.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';
import { ekraniraj } from './obshto.js';

/** Колко дни остават до взимането · отрицателно значи просрочено. */
function dniDo(data: string, dnes: string): number {
  return Math.round(
    (Date.parse(`${data}T00:00:00Z`) - Date.parse(`${dnes}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * СВЕТОФАРЪТ на взимането · НЕГОВИТЕ прагове, същите като при делата.
 *
 * „1 седмица преди да дойде деня се оцветява автоматично с жъл цвят текста или
 * цифрите, когато останат 2 дниу свети в червено. Стщото и за Ъправление и за
 * СМетки" *(р59·[71])* — „същото" значи и тук: един праг, един дом.
 */
function svetofar(p: Prepiska, dnes: string): string {
  if (p.zaVzimane === '') return 'normalno';
  const dni = dniDo(p.zaVzimane, dnes);
  if (dni < 0) return 'prosrocheno';
  if (dni <= 2) return 'cherveno';
  if (dni <= 7) return 'zhalto';
  return 'normalno';
}

export function narisuvayKontaktite(o: Ogledalo, dnes: string): string {
  const kontakti = [...o.kontakti.values()];
  const prepiski = [...o.prepiski.values()];
  const chakat = zaVzimane(prepiski);
  const redove = kontaktite(kontakti, prepiski);
  const sv = sveriKontaktite(kontakti, prepiski, dnes);
  const imena = imenataNaKontaktite(kontakti);

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Контакти</span>
        <span class="chislo" translate="no">${redove.length}</span>
        <span class="pod">${
          redove.filter((r) => !r.zapisan).length === 0
            ? 'всички записани'
            : `${redove.filter((r) => !r.zapisan).length} само срещани`
        }</span>
      </div>
      <div class="plochka">
        <span class="etiket">Преписки</span>
        <span class="chislo" translate="no">${prepiski.length}</span>
        <span class="pod">всички, с отпадналите</span>
      </div>
      <div class="plochka${chakat.length === 0 ? '' : ' duljimo'}">
        <span class="etiket">За взимане</span>
        <span class="chislo" translate="no">${chakat.length}</span>
        <span class="pod">чакат и имат дата</span>
      </div>
    </div>

    ${sektsiyaPrepiski(prepiski, imena, dnes)}
    ${sektsiyaKontakti(redove, sv)}`;
}

/** ПЪРВАТА секция · работата. */
function sektsiyaPrepiski(
  prepiski: readonly Prepiska[],
  imena: readonly string[],
  dnes: string,
): string {
  const podredeni = [...prepiski].sort(
    (a, b) => (b.zaVzimane || '0').localeCompare(a.zaVzimane || '0') || a.kakvo.localeCompare(b.kakvo, 'bg'),
  );
  return `
    <section data-sektsiya="prepiski">
      <div class="dyalglava">
        <h2>Преписки</h2>
        <span>с кого · за какво · кога е за взимане</span>
      </div>

      <form id="forma-prepiska">
        <div class="poleta">
          <div class="pole">
            <label for="prep-kontakt">С кого</label>
            <input translate="no" id="prep-kontakt" name="kontakt" required autocomplete="off"
                   list="spisak-kontakti" placeholder="име на човек">
            <datalist id="spisak-kontakti">${imena
              .map((i) => `<option value="${ekraniraj(i)}"></option>`)
              .join('')}</datalist>
          </div>
          <div class="pole">
            <label for="prep-kakvo">За какво</label>
            <input translate="no" id="prep-kakvo" name="kakvo" required autocomplete="off"
                   placeholder="напр. договор за подпис">
          </div>
          <div class="pole">
            <label for="prep-data">Кога е за взимане (по избор)</label>
            <input translate="no" type="date" id="prep-data" name="zaVzimane">
            <span class="drebno">САМО дата, без час — „Не, само дата".</span>
          </div>
          <div class="pole">
            <label for="prep-sastoyanie">Състояние</label>
            <select translate="no" id="prep-sastoyanie" name="sastoyanie">
              ${SASTOYANIYA_NA_PREPISKA.map((s) => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <p class="greshka" id="greshka-prepiska"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши преписката</button>
          <p class="drebno">Записва се като събитие <b>ПреписказЗаписана</b>.
          Контактът се сочи по ИМЕ — преписка може да се запише и за човек, който
          още не е вписан, и списъкът долу го показва като срещан.</p>
        </div>
      </form>

      ${
        prepiski.length === 0
          ? '<p class="prazno">Още няма нито една преписка.</p>'
          : `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="prepiski">
          <thead>
            <tr><th>С кого</th><th>За какво</th><th>За взимане</th><th>Състояние</th></tr>
          </thead>
          <tbody>${podredeni
            .map(
              (p) => `
            <tr data-prepiska="${ekraniraj(p.id)}" data-svetofar="${svetofar(p, dnes)}"
                data-sastoyanie="${ekraniraj(p.sastoyanie)}">
              <td translate="no">${ekraniraj(p.kontakt)}</td>
              <td translate="no">${ekraniraj(p.kakvo)}</td>
              <td translate="no">${p.zaVzimane === '' ? '—' : ekraniraj(p.zaVzimane)}</td>
              <td>${ekraniraj(p.sastoyanie)}</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>`
      }
      <p class="drebno">Без дата преписката НЕ свети: подразбран срок би оцветил
      в червено работа, за която никой не е бързал.</p>
    </section>`;
}

/** ВТОРАТА секция · хората. */
function sektsiyaKontakti(
  redove: readonly { ime: string; telefon: string; imeyl: string; kakav: string; prepiski: number; zapisan: boolean }[],
  sv: { vhod: number; izhod: number; razlika: number },
): string {
  return `
    <section data-sektsiya="kontakti">
      <div class="dyalglava">
        <h2>Контакти</h2>
        <span>оттук се вкарва човек · и оттук се пълни падащото „Отговорник"</span>
      </div>

      <form id="forma-kontakt">
        <div class="poleta">
          <div class="pole">
            <label for="knt-ime">Име</label>
            <input translate="no" id="knt-ime" name="ime" required autocomplete="off">
          </div>
          <div class="pole">
            <label for="knt-telefon">Телефон (по избор)</label>
            <input translate="no" id="knt-telefon" name="telefon" autocomplete="off">
          </div>
          <div class="pole">
            <label for="knt-imeyl">Имейл (по избор)</label>
            <input translate="no" type="email" id="knt-imeyl" name="imeyl" autocomplete="off">
          </div>
          <div class="pole">
            <label for="knt-kakav">Какъв е (по избор)</label>
            <input translate="no" id="knt-kakav" name="kakav" autocomplete="off"
                   placeholder="напр. нотариус">
          </div>
        </div>
        <p class="greshka" id="greshka-kontakt"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши контакта</button>
          <p class="drebno">Вписването тук НЕ дава достъп до програмата —
          достъпът е при доставчика, а служителите са свой екран.</p>
        </div>
      </form>

      ${
        redove.length === 0
          ? '<p class="prazno">Още няма нито един контакт.</p>'
          : `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="kontakti">
          <thead>
            <tr><th>Име</th><th>Телефон</th><th>Имейл</th><th>Какъв е</th><th>Преписки</th></tr>
          </thead>
          <tbody>${redove
            .map(
              (r) => `
            <tr data-kontakt="${ekraniraj(r.ime)}" data-zapisan="${r.zapisan ? 'da' : 'ne'}">
              <td translate="no">${ekraniraj(r.ime)}${
                r.zapisan ? '' : ' <span class="znachka tiha">само срещан</span>'
              }</td>
              <td translate="no">${r.telefon === '' ? '—' : ekraniraj(r.telefon)}</td>
              <td translate="no">${r.imeyl === '' ? '—' : ekraniraj(r.imeyl)}</td>
              <td translate="no">${r.kakav === '' ? '—' : ekraniraj(r.kakav)}</td>
              <td translate="no">${r.prepiski}</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>`
      }
      <p class="drebno" data-kontakti-sverka>Сверка вход↔изход: ${sv.vhod} преписки →
      ${sv.izhod} преброени по контакти, разлика ${sv.razlika}.</p>
    </section>`;
}

export function zakachiKontaktite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  const formaKontakt = koren.querySelector<HTMLFormElement>('#forma-kontakt');
  formaKontakt?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-kontakt')!;
    greshka.textContent = '';
    const d = new FormData(formaKontakt);
    try {
      await k.deystviya.zapishiKontakt(
        {
          ime: String(d.get('ime') ?? ''),
          telefon: String(d.get('telefon') ?? '').trim(),
          imeyl: String(d.get('imeyl') ?? '').trim(),
          kakav: String(d.get('kakav') ?? '').trim(),
        },
        // `opId` е на ВИКАЩИЯ: поправката на телефона е ново решение, не
        // повторение — ключ от съдържанието би върнал стария резултат при
        // връщане към предишна стойност (правило 20).
        { opId: `kontakt:${crypto.randomUUID()}` },
      );
    } catch (err) {
      greshka.textContent = err instanceof Error ? err.message : String(err);
      return;
    }
    await prerisuvay();
  });

  const formaPrepiska = koren.querySelector<HTMLFormElement>('#forma-prepiska');
  formaPrepiska?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-prepiska')!;
    greshka.textContent = '';
    const d = new FormData(formaPrepiska);
    try {
      await k.deystviya.zapishiPrepiska(
        crypto.randomUUID(),
        {
          kontakt: String(d.get('kontakt') ?? '').trim(),
          kakvo: String(d.get('kakvo') ?? '').trim(),
          zaVzimane: String(d.get('zaVzimane') ?? ''),
          sastoyanie: String(d.get('sastoyanie') ?? 'чака'),
        },
        { opId: `prepiska:${crypto.randomUUID()}` },
      );
    } catch (err) {
      greshka.textContent = err instanceof Error ? err.message : String(err);
      return;
    }
    await prerisuvay();
  });
}
