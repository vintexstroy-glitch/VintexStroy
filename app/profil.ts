/**
 * ПРОФИЛЪТ · аватар горе вдясно, на всеки екран (резен 78 · И124 т.5).
 *
 * Негови думи, 31.08: „**Битоните за размера на текста, да се създаде профил
 * и да се измести там с всичката информация за потребителя.** Там е и трите
 * бутона… да са 2 броя и да са теми… **и да са изнесени в дясно**."
 *
 * ═══ ПАНЕЛЪТ НОСИ ДВЕ НЕЩА · САМОЛИЧНОСТТА И ЛИЧНОТО ═══
 *
 * Дотук в него живееха и лостът за размера на текста, и двете теми на
 * натоварването. И127 т.3 (01.09) ги СВАЛИ: „Бутоните за размер на текста ги
 * махни и бутоните за гъстотата също ги махни." Последната дума бие (правило
 * 28); надживяното е записано в ADR-149.
 *
 * На 02.09 (И131 т.1 · ADR-154) панелът получи ЛИЧНОТО: „Служителя има опция
 * да активира личен таб от таб Профил." Блокът носи състоянието, полето за
 * мястото в личния драйв (И99: активацията иска МЯСТО) и бутона. Идентификаторите
 * са свои (`profil-lichno-*`): панелът стои на ВСЕКИ екран, а екранът Лично носи
 * същата форма — два еднакви `id` в един документ е дупката от ADR-036 §8.
 * Едно действие, две дръжки (ADR-134 §3).
 *
 * СТОПАНИНЪТ НЯМА ЛИЧЕН ТАБ — „Стопанина ням,а опция за личен." За него блокът
 * не се рисува; самоличността остава.
 *
 * ═══ КАКВО СЕ ЗАПИСВА ═══
 *
 * Самоличността се ЧЕТЕ (имейл, роля) — нула събития. Пускането и прибирането
 * на личното са ЕДНО събитие в ЛИЧНИЯ Журнал, същото като от екрана Лично и от
 * Таблото; закачането е в `main.ts`, там, където живее и за другите две дръжки.
 */

import { ekraniraj } from './obshto.js';

/** Инициалът на аватара · първата буква на имейла, с главна. */
function initsialat(imeyl: string): string {
  return (imeyl.trim()[0] ?? '?').toLocaleUpperCase('bg-BG');
}

/** Личното, както го вижда панелът · трите състояния (И99), плюс кой гледа. */
export interface LichnotoVProfila {
  /** Стопанинът ли е · той няма личен таб (ADR-154) */
  readonly negov: boolean;
  readonly vklyucheno: boolean;
  /** пипано ли е някога · „не е пускано" ≠ „прибрано" ≠ „включено" */
  readonly pipnato: boolean;
  readonly myasto: string;
}

function blokLichno(l: LichnotoVProfila): string {
  const sastoyanie = l.vklyucheno ? 'включено' : l.pipnato ? 'прибрано' : 'не е пускано';
  const deystvie = !l.pipnato
    ? `<label class="pole">
            <span>Място в твоя драйв</span>
            <input translate="no" type="text" id="profil-lichno-myasto" value="${ekraniraj(l.myasto)}" placeholder="MasterBook/Лично">
          </label>
          <button type="button" class="glaven" id="profil-lichno-pusni">Пусни личното</button>
          <p class="drebno">Активира се с място. Приложението не създава и не споделя папката — това
          става в самия драйв (правило 14).</p>`
    : l.vklyucheno
      ? '<button type="button" class="vtorichen" id="profil-lichno-priberi">Прибери личното</button>'
      : '<button type="button" class="vtorichen" id="profil-lichno-varni">Върни личното</button>';
  return `
        <div class="profil-lichno" data-profil-lichno="${ekraniraj(sastoyanie)}">
          <div class="dyalglava"><h3>Лично</h3><span class="znachka ${l.vklyucheno ? 'dobre' : 'tiha'}">${sastoyanie}</span></div>
          ${deystvie}
        </div>`;
}

export function narisuvayProfila(imeyl: string, rolya: string, lichno?: LichnotoVProfila): string {
  return `
    <span class="profilat">
      <button type="button" id="profil-avatar" class="avatar" aria-haspopup="dialog"
        aria-expanded="false" title="Профил · ${ekraniraj(imeyl)}"
        aria-label="Профил">${ekraniraj(initsialat(imeyl))}</button>
      <div id="profil-panel" class="profil-panel" role="dialog" aria-label="Профил" hidden>
        <div class="profil-koy" translate="no">
          <b>${ekraniraj(imeyl)}</b>
          <span class="drebno">${ekraniraj(rolya)}</span>
        </div>
        ${lichno && !lichno.negov ? blokLichno(lichno) : ''}
      </div>
    </span>`;
}

/** Отваря и затваря панела · като менютата: клик другаде и Escape затварят. */
export function zakachiProfila(koren: HTMLElement): void {
  const avatar = koren.querySelector<HTMLButtonElement>('#profil-avatar');
  const panel = koren.querySelector<HTMLElement>('#profil-panel');
  if (!avatar || !panel) return;
  const zatvori = (): void => {
    panel.hidden = true;
    avatar.setAttribute('aria-expanded', 'false');
  };
  avatar.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    avatar.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  });
  koren.addEventListener('click', (e) => {
    if (panel.hidden) return;
    const tsel = e.target as HTMLElement;
    if (tsel.closest('#profil-panel') || tsel.closest('#profil-avatar')) return;
    zatvori();
  });
  koren.ownerDocument.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') zatvori();
  });
}
