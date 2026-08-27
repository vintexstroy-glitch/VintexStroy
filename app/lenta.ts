/**
 * ЛЕНТАТА · свива се и се застопорява (негова дума, 27.08).
 *
 * „В менюто да се скрива като при клод и **да може да се застопори**."
 *
 * Две състояния, едно копче:
 *
 *   · ЗАСТОПОРЕНА — стои разтворена и не мърда. Това е подразбраното: човек,
 *     който още не е избирал, не бива да губи имената на пунктовете.
 *   · СВИТА — остават само знаците (52px вместо 232). Минаването с мишка я
 *     разтваря НАД съдържанието, не до него.
 *
 * ═══ ЗАЩО РАЗТВАРЯНЕТО Е НАД СЪДЪРЖАНИЕТО ═══
 *
 * Ако лентата бутне таблицата при всяко минаване с мишка, редовете под курсора
 * се местят и човек натиска друго, не което е гледал. Затова при разтваряне тя
 * ЛЯГА върху екрана (`position: absolute`) и нищо отдолу не помръдва — точно
 * заради това `.ekran` получава `position: relative`.
 *
 * ═══ ЗАЩО В ПАМЕТТА НА ЕКРАНА, А НЕ В ЖУРНАЛА ═══
 *
 * „Свита ли ми е лентата" е ПОГЛЕД, не факт (ADR-022 · правило 23): мой е, на
 * това устройство, и не мени какво четат другите.
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { ikona } from './ikoni.js';

const KLYUCH = 'lenta.svita';

export function lentataESvita(): boolean {
  return chetiEkranno<boolean>(KLYUCH, false);
}

/**
 * Копчето · рисува се в шапката на лентата.
 *
 * Носи `aria-pressed`, а не `aria-expanded`: това е ПРЕВКЛЮЧВАТЕЛ на състояние
 * („застопорена ли е"), не дръжка на падащ ред. Четецът на екран казва различни
 * неща за двете и объркването се чува.
 */
export function kopchetoNaLentata(svita: boolean): string {
  const dumi = svita ? 'Застопори лентата разтворена' : 'Свий лентата';
  return (
    `<button type="button" class="svivach" id="svii-lentata"` +
    ` aria-pressed="${svita ? 'false' : 'true'}" title="${dumi}" aria-label="${dumi}">` +
    `${ikona('zastopori')}</button>`
  );
}

/** Закача копчето · вика се СЛЕД всяко рисуване. */
export function zakachiSvivachaNaLentata(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLButtonElement>('#svii-lentata')?.addEventListener('click', async () => {
    zapomniEkranno(KLYUCH, !lentataESvita());
    await prerisuvay();
  });
}
