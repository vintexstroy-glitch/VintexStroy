/**
 * ХЕЛПЪТ · планът на таба, вдясно, като в Клод (резен 78б · И124 т.5).
 *
 * Негови думи, 31.08:
 *
 *   „**Цялата обяснителна информация се подрежда като план за таба и ако
 *    нещо се добави в таба се вклюва в хелпа там.** Ако е много информацията
 *    да може да ги скриваш **менюто от ляво и хелпа от дясно** и да ги
 *    разширяваш и стесняваш **и по височина и по ширина** и да ги скриваш
 *    **както в Клод става**."
 *
 * ═══ ПЛАНЪТ СЕ ЧЕТЕ ОТ ЖИВИЯ ЕКРАН, НЕ ОТ ОПИС ═══
 *
 * „Ако нещо се добави в таба се включва в хелпа там" — точно това дава
 * четенето от DOM: секциите (заглавие · подзаглавие) и обяснителните им
 * абзаци (`.drebno`) се събират при отваряне, от онова, което СТОИ на
 * екрана. Втори опис би се разминал при първата нова секция (правило 17 —
 * същият довод като при падащия ред за секции, ADR-057в).
 *
 * ═══ ПРЕДУПРЕЖДЕНИЯТА НЕ СЕ МЕСТЯТ ═══
 *
 * Хелпът е ОГЛЕДАЛО на обясненията, не техен нов дом: абзаците си остават
 * при формите и таблиците, където предупреждават В МИГА на действието.
 * Предупреждение, скрито в панел, който човек не е отворил, не предупреждава
 * никого. Свалянето на дублиращи обяснения от тялото е отделна чистка, по
 * екран, с око — не еднократна операция на сляпо (ADR-136 §3).
 */

import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/** Една секция от плана · каквото екранът показва в момента. */
export interface RedOtPlana {
  readonly zaglavie: string;
  readonly pod: string;
  readonly belezhki: readonly string[];
}

/**
 * СГЛОБЯВА плана · чиста функция, за да я пази тест.
 * Празният екран го КАЗВА (правило 15), не показва празен панел.
 */
export function sglobiPlana(redove: readonly RedOtPlana[]): string {
  if (redove.length === 0) {
    return '<p class="prazno">Този екран още не носи секции с обяснения.</p>';
  }
  return redove
    .map(
      (r) => `<div class="help-sektsiya">
        <b>${ekraniraj(r.zaglavie)}</b>
        ${r.pod ? `<span class="drebno">${ekraniraj(r.pod)}</span>` : ''}
        ${r.belezhki.map((b) => `<p class="drebno">${ekraniraj(b)}</p>`).join('')}
      </div>`,
    )
    .join('');
}

const KLYUCH_OTVOREN = 'help.otvoren';
const KLYUCH_SHIRINA = 'help.shirina';
const KLYUCH_VISOCHINA = 'help.visochina';

/** Границите на мереното · под 200 не се чете, над 560 изяжда таблиците. */
function vGranitsi(px: number, malko: number, golyamo: number): number {
  return Math.min(golyamo, Math.max(malko, Math.round(px)));
}

export function helpatEOtvoren(): boolean {
  return chetiEkranno<boolean>(KLYUCH_OTVOREN, false);
}

/** Панелът · рисува се в черупката, съдържанието идва при закачане. */
export function narisuvayHelpa(): string {
  if (!helpatEOtvoren()) return '';
  return `
    <aside class="help" id="help-panel" aria-label="Хелп · планът на таба">
      <div class="help-rab" id="help-rab" role="separator"
        title="Влачи, за да мериш · ширина на широк екран, височина на тесен"></div>
      <div class="help-glava">
        <b>Планът на таба</b>
        <button type="button" class="vtorichen malak" id="help-zatvori">Скрий</button>
      </div>
      <div class="help-tyalo" id="help-tyalo"></div>
    </aside>`;
}

/** СЪБИРА плана от живия екран · секциите и обясненията им, както стоят. */
function planatOtEkrana(koren: HTMLElement): RedOtPlana[] {
  return [...koren.querySelectorAll<HTMLElement>('.telo section[data-sektsiya]')].map((s) => {
    const glava = s.querySelector('.dyalglava');
    return {
      zaglavie: glava?.querySelector('h2, h3')?.textContent?.trim() ?? s.dataset['sektsiya'] ?? '',
      pod: glava?.querySelector('span')?.textContent?.trim() ?? '',
      belezhki: [...s.querySelectorAll<HTMLElement>(':scope > .drebno, :scope > p.drebno')].map(
        (b) => b.innerText.replace(/\s+/g, ' ').trim(),
      ),
    };
  });
}

function polozhiMerkite(): void {
  document.documentElement.style.setProperty(
    '--help-shirina',
    `${vGranitsi(chetiEkranno<number>(KLYUCH_SHIRINA, 300), 200, 560)}px`,
  );
  document.documentElement.style.setProperty(
    '--help-visochina',
    `${vGranitsi(chetiEkranno<number>(KLYUCH_VISOCHINA, 40), 20, 80)}dvh`,
  );
}

/** Закача хелпа · вика се СЛЕД всяко рисуване. */
export function zakachiHelpa(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  polozhiMerkite();
  koren.querySelector<HTMLButtonElement>('#help-vhod')?.addEventListener('click', async () => {
    zapomniEkranno(KLYUCH_OTVOREN, !helpatEOtvoren());
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#help-zatvori')?.addEventListener('click', async () => {
    zapomniEkranno(KLYUCH_OTVOREN, false);
    await prerisuvay();
  });

  const tyalo = koren.querySelector<HTMLElement>('#help-tyalo');
  if (tyalo) tyalo.innerHTML = sglobiPlana(planatOtEkrana(koren));

  // МЕРЕНЕТО · единият ръб, двете посоки: на широк екран панелът е колона и
  // ръбът мени ШИРИНАТА; на тесен той лежи отдолу и същият ръб мени
  // ВИСОЧИНАТА — „и по височина и по ширина", както в Клод.
  const rab = koren.querySelector<HTMLElement>('#help-rab');
  const panel = koren.querySelector<HTMLElement>('#help-panel');
  if (!rab || !panel) return;
  rab.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const tesen = getComputedStyle(panel).getPropertyValue('--help-legnal').trim() === 'da';
    const nachalo = tesen ? e.clientY : e.clientX;
    const ramka = panel.getBoundingClientRect();
    const bilo = tesen ? ramka.height : ramka.width;
    rab.setPointerCapture(e.pointerId);

    const mesti = (m: PointerEvent): void => {
      if (tesen) {
        const px = vGranitsi(bilo + (nachalo - m.clientY), 0.2 * innerHeight, 0.8 * innerHeight);
        document.documentElement.style.setProperty(
          '--help-visochina',
          `${Math.round((px / innerHeight) * 100)}dvh`,
        );
      } else {
        document.documentElement.style.setProperty(
          '--help-shirina',
          `${vGranitsi(bilo + (nachalo - m.clientX), 200, 560)}px`,
        );
      }
    };
    const pusni = (m: PointerEvent): void => {
      rab.removeEventListener('pointermove', mesti);
      rab.removeEventListener('pointerup', pusni);
      rab.removeEventListener('pointercancel', pusni);
      if (tesen) {
        zapomniEkranno(
          KLYUCH_VISOCHINA,
          Math.round((vGranitsi(bilo + (nachalo - m.clientY), 0.2 * innerHeight, 0.8 * innerHeight) / innerHeight) * 100),
        );
      } else {
        zapomniEkranno(KLYUCH_SHIRINA, vGranitsi(bilo + (nachalo - m.clientX), 200, 560));
      }
    };
    rab.addEventListener('pointermove', mesti);
    rab.addEventListener('pointerup', pusni);
    rab.addEventListener('pointercancel', pusni);
  });
}
