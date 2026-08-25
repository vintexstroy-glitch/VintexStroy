/**
 * ЛИЧНО · десетият екран · СЪЩАТА таблица, свой Журнал (И98).
 *
 * Негови думи, дословно:
 *
 *   „**Личния таб където имаш СЪЩАТА таблица от Управление и я прилагаш за
 *    собствени нужди** и да има възможност делата и задачите там да ги
 *    **прехвърлиш** с видимост само в таба Управление на личния акаунт и
 *    таблото там с собствените настройки… **Има си и отделен журнал когато се
 *    е активирал личния и НИКОГА не се смесват.** Това е добавка по избор и
 *    допълнение да можеш да имаш помощ в **баланса на времето и усилията**
 *    съвместно с личния живот."
 *
 * ═══ СЪЩАТА ТАБЛИЦА, БУКВАЛНО ═══
 *
 * Тук няма нито един ред, който да рисува втора таблица. Викат се СЪЩИТЕ
 * `narisuvayGant` · `formaDelo` · `zakachiGant` — само че с друг ключ на
 * погледа, друга представка на формата, други надписи и, най-важното, ДРУГ
 * КОНТЕКСТ: личната `Deystviya` пише в личния Журнал.
 *
 * ═══ ЗАЩО ЕКРАН, А НЕ СЕКЦИЯ В КОНСТРУКТОРА ═══
 *
 * Отделен Журнал значи втора `Deystviya`, второ Огледало, своя котва и свой
 * износ — това е рамка на ЕКРАН. И решаващото: `ТабЗаписан` пише ИМЕНАТА на
 * секциите в онзи Журнал, който неговата `Deystviya` обслужва. Личен таб,
 * направен от служебния контекст, слага „Кредит", „Лечение", „Развод" в
 * Журнала, който се изнася и минава пред служители. Разделянето на ДАННИТЕ
 * не спасява ИМЕНАТА.
 */

import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import {
  NADPISI_LICHNI,
  narisuvayGant,
  zakachiGant,
} from './gant.js';
import { GreshkaPrenos, mozheLiDaSePrenese, prenesiDela } from '../src/domein/prenos.js';
import {
  IMENA_NA_KAKAV,
  IMENA_NA_SPODELYANETO,
  KAKAV,
  VIDOVE_SPODELYANE,
  dopusnati,
} from '../src/domein/lichen-dostap.js';
import { IMENA_NA_ROLITE, type Rolya } from '../src/yadro/samolichnost.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './main.js';

/** Ключът на погледа · свои такт, филтри и сгънати (И98 „собствените настройки"). */
export const KLYUCH_POGLED = 'lichno';
/** Представка на формата · две `#forma-delo` на един документ се бият. */
export const PREDSTAVKA = 'l-';

/** Кои дела са отметнати за пренос · живее, докато екранът стои отворен. */
const izbrani = new Set<string>();
let prichinaZaPrenos = '';
let greshka = '';
let posoka: 'kam-lichno' | 'kam-sluzhebno' = 'kam-lichno';

export function zabraviIzbora(): void {
  izbrani.clear();
  prichinaZaPrenos = '';
  greshka = '';
}

/**
 * ЕКРАНЪТ, когато личното още НЕ е активирано.
 *
 * „Добавка ПО ИЗБОР" — затова тук стои покана, не празна таблица. Празната
 * таблица би изглеждала като загубени данни.
 */
export function pokanaZaLichno(imeyl: string, myasto = ''): string {
  return `
    <section data-sektsiya="lichno-pokana">
      <div class="dyalglava">
        <h2>Лично</h2>
        <span>добавка по избор · помощ в баланса на времето и усилията</span>
      </div>
      <div class="karta">
        <p>Личното е <b>СЪЩАТА таблица</b> от Управление, приложена за твои нужди — със свои
        срокове, свой такт и свои филтри. Делата от Управление може да се <b>прехвърлят</b> насам
        и обратно.</p>
        <p><b>Отделен Журнал, който никога не се смесва със служебния.</b> Той се създава в мига,
        в който пуснеш личното, живее под ключ <code translate="no">${ekraniraj(imeyl)}</code> и
        го чете само този имейл. Нито един ред от него не влиза в служебния, не се вижда от
        агента и не излиза в служебния износ.</p>
        <p class="drebno">Изнася се отделно и се проверява отделно. Кранът при инцидент е
        ОБЩ — Вратата е една: спре ли се записът заради подозрение, спира и тук.</p>
        <div class="poleta">
          <label class="pole">
            <span>Място в твоя драйв</span>
            <input type="text" id="lichno-myasto" value="${ekraniraj(myasto)}" placeholder="MasterBook/Лично">
          </label>
        </div>
        <p class="drebno"><b>Личното се активира с място.</b> Там ще живее и оттам се споделя;
        без място то би било Журнал, който никой не може да намери. Приложението <b>не създава</b>
        папката и <b>не я споделя</b> — това става в самия драйв, с неговите средства (правило 14).
        Тук се записва КЪДЕ е, за да го знае връзката с драйва, когато дойде.</p>
        <div class="deystviya">
          <button type="button" class="glaven" id="lichno-pusni">Пусни личното</button>
        </div>
      </div>
    </section>`;
}

/** Екранът, когато личното Е активирано · същата таблица + преносът. */
export function narisuvayLichno(
  lichnoOgledalo: Ogledalo,
  sluzhebnoOgledalo: Ogledalo,
  dnes: string,
): string {
  return `
    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}
    ${narisuvayGant(lichnoOgledalo, dnes, KLYUCH_POGLED, NADPISI_LICHNI, PREDSTAVKA)}
    ${sektsiyaPrenos(lichnoOgledalo, sluzhebnoOgledalo)}
    ${sektsiyaDostapi(lichnoOgledalo)}
    <section>
      <div class="dyalglava">
        <h2>Личният Журнал</h2>
        <span>своя верига, свой износ · никога не се смесва със служебния</span>
      </div>
      <p class="drebno">Личното се прибира от <b>Таблото</b> — пунктът пада от лентата, а Журналът
      остава непокътнат. Прибраното не е изтрито; „изключено ≠ липсващо" (правило 15).</p>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="lichno-priberi">Прибери личното</button>
      </div>
    </section>`;
}

/**
 * ПРЕНОСЪТ · двете посоки, с причина и с казано какво НЕ пътува.
 *
 * Потвърждението говори ПРЕДИ натискането: човекът чете цената, вместо да я
 * открие после.
 */
function sektsiyaPrenos(lichno: Ogledalo, sluzhebno: Ogledalo): string {
  const kamLichno = posoka === 'kam-lichno';
  const izvor = kamLichno ? sluzhebno : lichno;
  const dela = [...izvor.dela.values()];

  return `
    <section data-sektsiya="prenos">
      <div class="dyalglava">
        <h2>Прехвърляне</h2>
        <span>нищо не се мести · старото остава, новото се преразказва</span>
      </div>

      <div class="deystviya">
        <button type="button" class="${kamLichno ? 'glaven' : 'vtorichen'}" data-posoka="kam-lichno">Служебно → Лично</button>
        <button type="button" class="${kamLichno ? 'vtorichen' : 'glaven'}" data-posoka="kam-sluzhebno">Лично → Служебно</button>
      </div>

      ${
        dela.length === 0
          ? '<p class="drebno">Няма какво да се прехвърля в тази посока.</p>'
          : `<div class="tablitsa" data-tablitsa="prenos">
              <div class="glava prenos">
                <span></span><span>Дело</span><span>Място · обект</span><span>Срок</span>
              </div>
              ${dela
                .map((d) => {
                  const otgovor = mozheLiDaSePrenese(izvor.dela, d.id, izbrani);
                  return `<div class="red prenos" translate="no">
                    <span><input type="checkbox" data-prenesi="${ekraniraj(d.id)}"${
                      izbrani.has(d.id) ? ' checked' : ''
                    }${otgovor.mozhe ? '' : ' disabled'}></span>
                    <span class="kletka"><b>${ekraniraj(d.ime)}</b>${
                      otgovor.mozhe ? '' : `<span class="drebno">${ekraniraj(otgovor.prichina)}</span>`
                    }</span>
                    <span>${ekraniraj(d.myasto)}${d.obekt ? ` · ${ekraniraj(d.obekt)}` : ''}</span>
                    <span>${ekraniraj(d.ot)} → ${ekraniraj(d.do)}</span>
                  </div>`;
                })
                .join('')}
            </div>
            <div class="poleta">
              <label class="pole">
                <span>Защо се прехвърля</span>
                <input type="text" id="prenos-prichina" value="${ekraniraj(prichinaZaPrenos)}" placeholder="това е мое, не на фирмата">
              </label>
            </div>
            <div class="deystviya">
              <button type="button" class="glaven" id="prenos-pusni"${izbrani.size ? '' : ' disabled'}>Прехвърли ${izbrani.size} ${izbrani.size === 1 ? 'дело' : 'дела'}</button>
            </div>
            <p class="drebno"><b>Какво НЕ пътува с делото:</b> историята (кой го е менял остава там, откъдето тръгва) · надделото извън партидата (изпразва се, за да не остане сирак) · парите и агентските задачи (те изобщо не са дела). <b>Излизането оставя видима следа</b> в Журнала, от който делото тръгва — фирмено дело не изчезва от Управление без обяснение.</p>
            <p class="drebno">Редът е нарочен: <b>първо се пише при получателя, после се маха при изпращача</b>. Транзакция между два Журнала няма; прекъсване по средата оставя ДУБЛИКАТ, който се вижда и се довършва, вместо ЛИПСА, която не се вижда.</p>`
      }
    </section>`;
}

/**
 * СПОДЕЛЯНЕТО В ОБРАТНАТА ПОСОКА (И99).
 *
 * Негово: „ако иска да даде достъп на работодателя си… или да сподели на
 * външен имейл личната си папка и личен таб. Например на жена си."
 *
 * Дотук правата вървяха главен акаунт → служител. Тук раздава СОБСТВЕНИКЪТ НА
 * ЛИЧНОТО — и работодателят не може да си вземе, може само да му бъде дадено.
 */
function sektsiyaDostapi(o: Ogledalo): string {
  const vsichki = [...o.lichniDostapi.values()];
  const zhivi = dopusnati(vsichki);
  return `
    <section data-sektsiya="lichni-dostapi">
      <div class="dyalglava">
        <h2>Кой вижда личното</h2>
        <span>обратната посока · ТИ раздаваш, не работодателят</span>
      </div>

      ${
        vsichki.length === 0
          ? '<p class="drebno">Никой освен теб. Личното е твое, докато сам не дадеш достъп.</p>'
          : `<div class="tablitsa" data-tablitsa="dostapi">
              <div class="glava dostap">
                <span>Имейл</span><span>Кой е</span><span>Може</span><span>Какво</span><span></span>
              </div>
              ${vsichki
                .map(
                  (d) => `<div class="red dostap${d.otnet ? ' mahnata' : ''}" translate="no">
                    <span class="kletka"><b>${ekraniraj(d.imeyl)}</b></span>
                    <span>${ekraniraj(IMENA_NA_KAKAV[d.kakav])}</span>
                    <span>${ekraniraj(IMENA_NA_ROLITE[d.rolya])}</span>
                    <span>${ekraniraj(IMENA_NA_SPODELYANETO[d.kakvo])}</span>
                    <span>${
                      d.otnet
                        ? '<span class="znachka tiha">отнет</span>'
                        : `<button type="button" class="vtorichen malak" data-otnemi="${ekraniraj(d.imeyl)}">Отнеми</button>`
                    }</span>
                  </div>`,
                )
                .join('')}
            </div>
            <p class="drebno">${zhivi.length} ${zhivi.length === 1 ? 'жив достъп' : 'живи достъпа'} от ${vsichki.length}. <b>Отнетият ред НЕ се трие</b> — „дадох ѝ достъп през август, отнех го през ноември" е история, която триенето би направило недоказуема (правило 1).</p>`
      }

      <div class="poleta">
        <label class="pole">
          <span>Имейл</span>
          <input type="email" id="dostap-imeyl" placeholder="zhena@example.bg">
        </label>
        <label class="pole">
          <span>Кой е</span>
          <select id="dostap-kakav">
            ${KAKAV.map((x) => `<option value="${x}">${ekraniraj(IMENA_NA_KAKAV[x])}</option>`).join('')}
          </select>
        </label>
        <label class="pole">
          <span>Може</span>
          <select id="dostap-rolya">
            <option value="nablyudatel">${ekraniraj(IMENA_NA_ROLITE['nablyudatel'])}</option>
            <option value="redaktor">${ekraniraj(IMENA_NA_ROLITE['redaktor'])}</option>
          </select>
        </label>
        <label class="pole">
          <span>Какво</span>
          <select id="dostap-kakvo">
            ${VIDOVE_SPODELYANE.map(
              (x) => `<option value="${x}"${x === 'dvete' ? ' selected' : ''}>${ekraniraj(IMENA_NA_SPODELYANETO[x])}</option>`,
            ).join('')}
          </select>
        </label>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="dostap-day">Дай достъп</button>
      </div>
      <p class="drebno"><b>Приложението НЕ споделя папката в драйва.</b> „Не каним хора, не пазим
      чужди пароли, не отнемаме достъп" (правило 14) — самата папка се споделя от драйва, с
      неговите средства. Тук се записва кой е допуснат <b>вътре в приложението</b>, и това е
      онова, което Вратата после проверява. Двете се правят поотделно и двете трябват.</p>
      <p class="drebno"><b>Външният имейл НЕ става служител.</b> Той не влиза в екипа на фирмата,
      не получава роля в служебния Журнал и не се брои никъде в него — вижда само личното, и то
      само каквото си му дал.</p>
    </section>`;
}

// ── закачането ─────────────────────────────────────────────────────────────

export function zakachiLichno(
  koren: HTMLElement,
  k: Konteks,
  lichen: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  // СЪЩИЯТ Гант · само с друг ключ, друга представка и ЛИЧНИЯ контекст.
  zakachiGant(koren, lichen, prerisuvay, KLYUCH_POGLED, PREDSTAVKA);

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-posoka]')) {
    b.addEventListener('click', async () => {
      posoka = b.dataset['posoka'] as typeof posoka;
      izbrani.clear();
      await prerisuvay();
    });
  }

  for (const otmetka of koren.querySelectorAll<HTMLInputElement>('[data-prenesi]')) {
    otmetka.addEventListener('change', async () => {
      const id = otmetka.dataset['prenesi']!;
      if (otmetka.checked) izbrani.add(id);
      else izbrani.delete(id);
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLInputElement>('#prenos-prichina')?.addEventListener('input', (e) => {
    prichinaZaPrenos = (e.target as HTMLInputElement).value;
  });

  // ── обратната посока · даване и отнемане на достъп (И99) ─────────────────
  koren.querySelector<HTMLButtonElement>('#dostap-day')?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    const vzemi = (znak: string) => koren.querySelector<HTMLInputElement>(znak)?.value ?? '';
    buton.disabled = true;
    try {
      await lichen.deystviya.zapishiLichenDostap(
        {
          imeyl: vzemi('#dostap-imeyl'),
          rolya: vzemi('#dostap-rolya') as Rolya,
          kakvo: vzemi('#dostap-kakvo'),
          kakav: vzemi('#dostap-kakav'),
          otnet: false,
        },
        { opId: crypto.randomUUID() },
      );
      k.vest(
        'dobre',
        `Достъпът е записан. Не забравяй да споделиш и САМАТА папка от драйва — ` +
          'приложението не я споделя вместо теб (правило 14).',
      );
      greshka = '';
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-otnemi]')) {
    b.addEventListener('click', async () => {
      const imeyl = b.dataset['otnemi']!;
      b.disabled = true;
      try {
        const sega = (await lichen.deystviya.ogledalo()).lichniDostapi.get(imeyl);
        if (!sega) return;
        await lichen.deystviya.zapishiLichenDostap(
          { ...sega, otnet: true },
          { opId: crypto.randomUUID() },
        );
        k.vest(
          'dobre',
          `Достъпът на „${imeyl}" е отнет ВЪТРЕ в приложението. Отнеми го и от драйва — ` +
            'двете се правят поотделно. Редът остава в Журнала: историята се пази.',
        );
        greshka = '';
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#prenos-pusni')?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    try {
      const kamLichno = posoka === 'kam-lichno';
      const izhod = await prenesiDela({
        ot: kamLichno ? k.deystviya : lichen.deystviya,
        kam: kamLichno ? lichen.deystviya : k.deystviya,
        otKlyuch: kamLichno ? k.akaunt : lichen.akaunt,
        kamKlyuch: kamLichno ? lichen.akaunt : k.akaunt,
        dela: [...izbrani],
        prichina: prichinaZaPrenos,
        // СЛУЧАЕН номер за партидата · изведен от съдържанието би направил
        // ВТОРИЯ пренос на същото дело „повторен" и той би изчезнал мълчаливо
        // (правило 20).
        prenosId: crypto.randomUUID(),
      });
      k.vest(
        'dobre',
        `Прехвърлени ${izhod.preneseni} ${izhod.preneseni === 1 ? 'дело' : 'дела'} · ` +
          `сверка ${izhod.sverka.vhod} → ${izhod.sverka.izhod} · разлика ${izhod.sverka.razlika}. ` +
          'Старите записи стоят непокътнати и в двата Журнала.',
      );
      zabraviIzbora();
    } catch (err) {
      greshka = err instanceof GreshkaPrenos ? err.message : dumiZaGreshka(err);
    }
    await prerisuvay();
  });
}
