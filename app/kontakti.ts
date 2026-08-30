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
 *
 * СРЕЩИТЕ (резен 39) стоят ВЪТРЕ във втората секция, не като трета: „Един таб,
 * **две** секции" и „за КОНТАКТИТЕ среща добавяш" са едно и също негово
 * съобщение *(р57·[30])*. Трета секция би счупила собственото му число.
 */

import {
  imenataNaKontaktite,
  kontaktite,
  predstoyashtiSreshti,
  SASTOYANIYA_NA_PREPISKA,
  SASTOYANIYA_NA_SRESHTA,
  sveriKontaktite,
  zaVzimane,
  type Kontakt,
  type Prepiska,
  type Sreshta,
} from '../src/domein/kontakti.js';
import { svetofarNaSroka } from '../src/domein/dela.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';
import { ekraniraj } from './obshto.js';

/**
 * СВЕТОФАРЪТ · ВИКА СЕ, не се преписва (резен 39).
 *
 * „1 седмица преди да дойде деня се оцветява автоматично с жъл цвят текста или
 * цифрите, когато останат 2 дниу свети в червено. Стщото и за Ъправление и за
 * СМетки" *(р59·[71])* — „същото" значи ЕДИН дом, а не еднакъв препис.
 *
 * Резен 38 остави тук СВОЕ копие на двата прага. Копието работеше, и точно
 * затова беше опасно: смяна на числото в `dela.ts` нямаше как да стигне дотук,
 * и двата екрана щяха да светят различно за един и същ ден.
 */

/**
 * СЪСТОЯНИЕТО СЕ МЕНИ ОТ САМИЯ РЕД · и това е ЗАТВАРЯНЕТО на извора.
 *
 * Без него авто-делото (резен 39) няма как да си отиде: изворът се затваря —
 * взима се преписката, провежда се срещата — и точно затова редът пада от
 * червения списък. Формата горе само РАЖДА; всеки следващ път би раждала нова
 * преписка, вместо да затвори старата.
 *
 * Смяната е НОВО СЪБИТИЕ със същия `id` (правило 1): последната дума бие, а
 * предишното състояние си остава в Журнала.
 */
function padashtoSastoyanie(
  koe: 'prepiska' | 'sreshta',
  id: string,
  sega: string,
  spisak: readonly string[],
): string {
  return `<select translate="no" data-smeni="${koe}" data-id="${ekraniraj(id)}">${spisak
    .map((x) => `<option value="${x}"${x === sega ? ' selected' : ''}>${x}</option>`)
    .join('')}</select>`;
}

export function narisuvayKontaktite(o: Ogledalo, dnes: string): string {
  const kontakti = [...o.kontakti.values()];
  const prepiski = [...o.prepiski.values()];
  const sreshti = [...o.sreshti.values()];
  const predstoyat = predstoyashtiSreshti(sreshti);
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
      <div class="plochka">
        <span class="etiket">Предстоящи срещи</span>
        <span class="chislo" translate="no">${predstoyat.length}</span>
        <span class="pod">от ${sreshti.length} записани</span>
      </div>
    </div>

    ${sektsiyaPrepiski(prepiski, imena, dnes)}
    ${sektsiyaKontakti(redove, sv, sreshti, imena, dnes)}`;
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
            <tr data-prepiska="${ekraniraj(p.id)}" data-svetofar="${svetofarNaSroka(p.zaVzimane, dnes)}"
                data-sastoyanie="${ekraniraj(p.sastoyanie)}">
              <td translate="no">${ekraniraj(p.kontakt)}</td>
              <td translate="no">${ekraniraj(p.kakvo)}</td>
              <td translate="no">${p.zaVzimane === '' ? '—' : ekraniraj(p.zaVzimane)}</td>
              <td>${padashtoSastoyanie('prepiska', p.id, p.sastoyanie, SASTOYANIYA_NA_PREPISKA)}</td>
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

/** ВТОРАТА секция · хората, и срещите с тях. */
function sektsiyaKontakti(
  redove: readonly { ime: string; telefon: string; imeyl: string; kakav: string; prepiski: number; zapisan: boolean }[],
  sv: { vhod: number; izhod: number; razlika: number },
  sreshti: readonly Sreshta[],
  imena: readonly string[],
  dnes: string,
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

      ${blokSreshti(sreshti, imena, dnes)}
    </section>`;
}

/**
 * СРЕЩИТЕ · вътре във втората секция, не до нея.
 *
 * „за контактите среща добавяш с място, телефо, име, и дата с час" · „Става дело
 * автоматично" *(р57·[30])*, поправено на „**Не, само дата**" · „**Адрес на
 * срещата**" *(р57·[34])*.
 *
 * Името и телефонът НЕ се питат тук — те живеят в контакта и се сочат по име
 * (правило 17). Питат се само онези две, които са СВОИ на срещата: адресът и
 * датата.
 */
function blokSreshti(
  sreshti: readonly Sreshta[],
  imena: readonly string[],
  dnes: string,
): string {
  const podredeni = [...sreshti].sort(
    (a, b) => a.data.localeCompare(b.data) || a.kontakt.localeCompare(b.kontakt, 'bg'),
  );
  return `
    <div class="dyalglava" data-blok="sreshti">
      <h3>Срещи</h3>
      <span>с кого · адрес · дата · и всяка чакаща става дело автоматично</span>
    </div>

    <form id="forma-sreshta">
      <div class="poleta">
        <div class="pole">
          <label for="sr-kontakt">С кого</label>
          <input translate="no" id="sr-kontakt" name="kontakt" required autocomplete="off"
                 list="spisak-kontakti-sreshti" placeholder="име на човек">
          <datalist id="spisak-kontakti-sreshti">${imena
            .map((i) => `<option value="${ekraniraj(i)}"></option>`)
            .join('')}</datalist>
        </div>
        <div class="pole">
          <label for="sr-adres">Адрес на срещата (по избор)</label>
          <input translate="no" id="sr-adres" name="adres" autocomplete="off"
                 placeholder="напр. кантора на нотариуса">
        </div>
        <div class="pole">
          <label for="sr-data">Дата</label>
          <input translate="no" type="date" id="sr-data" name="data" required>
          <span class="drebno">САМО дата, без час — „Не, само дата".</span>
        </div>
        <div class="pole">
          <label for="sr-sastoyanie">Състояние</label>
          <select translate="no" id="sr-sastoyanie" name="sastoyanie">
            ${SASTOYANIYA_NA_SRESHTA.map((x) => `<option value="${x}">${x}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="greshka" id="greshka-sreshta"></p>
      <div class="deystviya">
        <button type="submit" class="glaven">Запиши срещата</button>
        <p class="drebno">Записва се като събитие <b>СрещаЗаписана</b>. Датата е
        ЗАДЪЛЖИТЕЛНА — без нея срещата не става дело и не влиза в червения
        списък в Управление.</p>
      </div>
    </form>

    ${
      podredeni.length === 0
        ? '<p class="prazno">Още няма нито една среща.</p>'
        : `<div class="skrolkutiya">
      <table class="tablitsa" data-tablitsa="sreshti">
        <thead>
          <tr><th>С кого</th><th>Адрес</th><th>Дата</th><th>Състояние</th></tr>
        </thead>
        <tbody>${podredeni
          .map(
            (x) => `
          <tr data-sreshta="${ekraniraj(x.id)}" data-sastoyanie="${ekraniraj(x.sastoyanie)}"
              data-svetofar="${x.sastoyanie === 'чака' ? svetofarNaSroka(x.data, dnes) : 'normalno'}">
            <td translate="no">${ekraniraj(x.kontakt)}</td>
            <td translate="no">${x.adres === '' ? '—' : ekraniraj(x.adres)}</td>
            <td translate="no">${ekraniraj(x.data)}</td>
            <td>${padashtoSastoyanie('sreshta', x.id, x.sastoyanie, SASTOYANIYA_NA_SRESHTA)}</td>
          </tr>`,
          )
          .join('')}</tbody>
      </table>
    </div>`
    }
    <p class="drebno">Проведената и отпадналата НЕ светят и не стават дело:
    ангажимент без изход би светил вечно.</p>`;
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

  // СМЯНАТА НА СЪСТОЯНИЕ · един слушател за двете таблици.
  for (const el of koren.querySelectorAll<HTMLSelectElement>('select[data-smeni]')) {
    el.addEventListener('change', async () => {
      const koe = el.dataset.smeni;
      const id = el.dataset.id ?? '';
      const o = await k.deystviya.ogledalo();
      try {
        if (koe === 'prepiska') {
          const p = o.prepiski.get(id);
          if (!p) return;
          await k.deystviya.zapishiPrepiska(
            id,
            { kontakt: p.kontakt, kakvo: p.kakvo, zaVzimane: p.zaVzimane, sastoyanie: el.value },
            { opId: `prepiska:${crypto.randomUUID()}` },
          );
        } else {
          const x = o.sreshti.get(id);
          if (!x) return;
          await k.deystviya.zapishiSreshta(
            id,
            { kontakt: x.kontakt, adres: x.adres, data: x.data, sastoyanie: el.value },
            { opId: `sreshta:${crypto.randomUUID()}` },
          );
        }
      } catch (err) {
        k.vest('zle', err instanceof Error ? err.message : String(err));
        return;
      }
      await prerisuvay();
    });
  }

  const formaSreshta = koren.querySelector<HTMLFormElement>('#forma-sreshta');
  formaSreshta?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-sreshta')!;
    greshka.textContent = '';
    const d = new FormData(formaSreshta);
    try {
      await k.deystviya.zapishiSreshta(
        crypto.randomUUID(),
        {
          kontakt: String(d.get('kontakt') ?? '').trim(),
          adres: String(d.get('adres') ?? '').trim(),
          data: String(d.get('data') ?? ''),
          sastoyanie: String(d.get('sastoyanie') ?? 'чака'),
        },
        { opId: `sreshta:${crypto.randomUUID()}` },
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
