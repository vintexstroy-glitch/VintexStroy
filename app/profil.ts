/**
 * ПРОФИЛЪТ · аватар горе вдясно, на всеки екран (резен 78 · И124 т.5).
 *
 * Негови думи, 31.08: „**Битоните за размера на текста, да се създаде профил
 * и да се измести там с всичката информация за потребителя.** Там е и трите
 * бутона… да са 2 броя и да са теми… **и да са изнесени в дясно**."
 *
 * ═══ ПАНЕЛЪТ ОСТАНА С ЕДНО НЕЩО · САМОЛИЧНОСТТА ═══
 *
 * Дотук в него живееха и лостът за размера на текста, и двете теми на
 * натоварването. И127 т.3 (01.09) ги СВАЛИ: „Бутоните за размер на текста ги
 * махни и бутоните за гъстотата също ги махни." Последната дума бие (правило
 * 28); надживяното е записано в ADR-149, заедно с онова, което ОСТАВА —
 * подразбраните числа и ръчното влачене по ръба.
 *
 * ═══ НИЩО НЕ СЕ ЗАПИСВА ═══
 *
 * Панелът ЧЕТЕ (имейл, роля) — нула събития. Имейлът е самоличността от
 * доставчика (правило 14) и стои тук, за да се вижда КОЙ е влязъл — не за да
 * се редактира: няма какво да му се редактира.
 */

import { ekraniraj } from './obshto.js';

/** Инициалът на аватара · първата буква на имейла, с главна. */
function initsialat(imeyl: string): string {
  return (imeyl.trim()[0] ?? '?').toLocaleUpperCase('bg-BG');
}

export function narisuvayProfila(imeyl: string, rolya: string): string {
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
