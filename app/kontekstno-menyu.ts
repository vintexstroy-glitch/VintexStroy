/**
 * КОНТЕКСТНОТО МЕНЮ · десният бутон, както в Уиндоус.
 *
 * Най-разпознаваемият Windows навик изобщо — и дотук неизползван вход.
 * Менюто НЕ носи свои действия: то показва бутоните, които редът ВЕЧЕ има
 * (Сторно, Поправи, История…), и ги натиска вместо човека. Едно действие,
 * един път през кода — менюто е втора дръжка на същата врата, не втора врата.
 *
 * Единственото собствено действие е „Копирай реда": клетките отиват в
 * клипборда с табулация помежду им — редът се поставя в Excel като ред.
 *
 * На Android дългото задържане вдига същото събитие от само себе си. На iOS
 * не — там менюто чака своя ред; бутоните на реда стоят и работят навсякъде.
 */

import type { Konteks } from './main.js';

let otvorenoMenyu: HTMLElement | null = null;

function zatvori(): void {
  otvorenoMenyu?.remove();
  otvorenoMenyu = null;
}

/** Текстът на реда за клипборда · клетките, без бутоните, с табулация. */
function redVTekst(red: HTMLElement): string {
  return [...red.children]
    .filter((k) => !k.classList.contains('butoni') && !k.querySelector('button'))
    .map((k) => (k as HTMLElement).innerText.replace(/\s*\n\s*/g, ' · ').trim())
    .filter((t) => t !== '')
    .join('\t');
}

/** Закача се ВЕДНЪЖ — коренът живее през всички прерисувания, а менюто
 *  работи чрез делегиране: гледа кой ред е под клика в момента. Повторно
 *  закачане би трупало по един слушател на всяко прерисуване. */
let zakacheno = false;

export function zakachiKontekstnoMenyu(koren: HTMLElement, k: Konteks): void {
  if (zakacheno) return;
  zakacheno = true;
  koren.addEventListener('contextmenu', (e) => {
    const red = (e.target as HTMLElement).closest<HTMLElement>('.red');
    if (!red) return; // извън ред браузърното меню си е на мястото
    e.preventDefault();
    zatvori();

    const menyu = document.createElement('div');
    menyu.className = 'kontekstno-menyu';
    menyu.setAttribute('role', 'menu');

    const dobavi = (ime: string, deystvie: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ime;
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', () => {
        zatvori();
        deystvie();
      });
      menyu.append(b);
    };

    dobavi('Копирай реда', async () => {
      try {
        await navigator.clipboard.writeText(redVTekst(red));
        k.vest('dobre', 'Редът е в клипборда — поставя се в Excel като ред.');
      } catch {
        k.vest('zle', 'Клипбордът отказа — браузърът иска разрешение за копиране.');
      }
    });

    // Бутоните на реда, като редове в менюто. Без дубликати по име.
    const butoni = [...red.querySelectorAll<HTMLButtonElement>('button')].filter(
      (b) => b.textContent!.trim() !== '' && !b.disabled,
    );
    if (butoni.length > 0) menyu.append(document.createElement('hr'));
    const videni = new Set<string>();
    for (const b of butoni) {
      const ime = b.textContent!.trim();
      if (videni.has(ime)) continue;
      videni.add(ime);
      dobavi(ime, () => b.click());
    }

    document.body.append(menyu);
    // Първо се мери, после се поставя — менюто не бива да излиза от екрана.
    const shirina = menyu.offsetWidth;
    const visochina = menyu.offsetHeight;
    menyu.style.left = `${Math.min(e.clientX, window.innerWidth - shirina - 8)}px`;
    menyu.style.top = `${Math.min(e.clientY, window.innerHeight - visochina - 8)}px`;
    otvorenoMenyu = menyu;
    menyu.querySelector('button')?.focus();
  });

  // Затваря се както в Уиндоус: клик другаде, Escape, скрол.
  document.addEventListener('click', (e) => {
    if (otvorenoMenyu && !otvorenoMenyu.contains(e.target as Node)) zatvori();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') zatvori();
  });
  document.addEventListener('scroll', zatvori, { capture: true, passive: true });
}
