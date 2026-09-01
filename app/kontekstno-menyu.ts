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

import type { Konteks } from './ekranite.js';
import { prilozhiSkritite, skriyKolona } from './skriti-koloni.js';
import { KLIPBORDAT_OTKAZA, kopirayKletkite } from './klaviatura.js';

let otvorenoMenyu: HTMLElement | null = null;

/** Слушателят на скрола се закача при отваряне и се маха при затваряне —
 *  виж дългата бележка при отварянето защо не може да стои постоянно. */
const SLUSHATEL = { capture: true, passive: true } as const;

function zatvori(): void {
  document.removeEventListener('scroll', zatvori, SLUSHATEL);
  otvorenoMenyu?.remove();
  otvorenoMenyu = null;
}

/** Закача се ВЕДНЪЖ — коренът живее през всички прерисувания, а менюто
 *  работи чрез делегиране: гледа кой ред е под клика в момента. Повторно
 *  закачане би трупало по един слушател на всяко прерисуване. */
let zakacheno = false;

export function zakachiKontekstnoMenyu(koren: HTMLElement, k: Konteks): void {
  if (zakacheno) return;
  zakacheno = true;
  // „⋯" · ВТОРАТА ДРЪЖКА за iOS (И124 т.3 · резен 77 · ADR-134): там
  // `contextmenu` не се вдига от докосване. Бутонът не носи свое меню — той
  // ВДИГА същото събитие върху реда си: една врата, две дръжки (ADR-022 §6).
  koren.addEventListener('click', (e) => {
    const dratska = (e.target as HTMLElement).closest<HTMLElement>('[data-mnogotochie]');
    if (!dratska) return;
    e.stopPropagation();
    const kade = dratska.getBoundingClientRect();
    dratska.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: kade.left, clientY: kade.bottom }),
    );
  });
  koren.addEventListener('contextmenu', (e) => {
    // Освен `.red` менюто се вдига и на ОБЕКТЕН ред от истинска `<table>`
    // (местата) — той се познава по адреса на папката си (резен 77).
    const red = (e.target as HTMLElement).closest<HTMLElement>('.red, [data-papka-adres]');
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

    // ── ПЪТЯТ НА ОБЕКТА (И124 т.3 · т.7 · резен 77 · ADR-134) ──────────────
    //
    // „Зареждането на фолдъра става с дясно копче САМО за обектите и имотите"
    // и „да има пътища за неща само от там". Редът, който носи папка
    // (`data-papka-adres`), я отваря ОТТУК — видимият линк в колоната падна.
    // Обект без папка го КАЗВА (правило 15), вместо редът да изглежда като
    // ред без път.
    const papkaAdres = red.dataset['papkaAdres'];
    if (papkaAdres !== undefined) {
      if (papkaAdres === '') {
        const nyama = document.createElement('span');
        nyama.className = 'drebno';
        nyama.setAttribute('role', 'menuitem');
        nyama.setAttribute('aria-disabled', 'true');
        nyama.textContent = 'Папката в Драйва · още няма линк';
        menyu.append(nyama);
      } else {
        dobavi('Папката в Драйва', () => {
          window.open(papkaAdres, '_blank', 'noopener,noreferrer');
        });
      }
      menyu.append(document.createElement('hr'));
    }

    // Копирането минава през СЪЩАТА врата като Ctrl+C върху селекция —
    // един текст на клетка, същите чисти числа от `data-st`.
    dobavi('Копирай реда', async () => {
      try {
        await kopirayKletkite([
          [...red.children].filter((kl) => !kl.querySelector('button')) as HTMLElement[],
        ]);
        k.vest('dobre', 'Редът е в клипборда — поставя се в Excel като ред.');
      } catch {
        k.vest('zle', KLIPBORDAT_OTKAZA);
      }
    });

    // „Скрий колоната" · само на екрана — скритото ПАК се смята (правило 23).
    // Ключът и името идват от главата (двигателят ги печата) — нищо не се
    // остъргва от боядисан текст. Бутоните не са колона.
    const kletka = (e.target as HTMLElement).closest<HTMLElement>('.red > *');
    const tablitsa = red.closest<HTMLElement>('.tablitsa');
    const imeNaTablitsata = tablitsa?.dataset['tablitsa'];
    if (kletka && tablitsa && imeNaTablitsata) {
      const nomer = [...red.children].indexOf(kletka);
      const glavata = tablitsa.querySelector<HTMLElement>('.glava')?.children[nomer] as
        | HTMLElement
        | undefined;
      const kolona = glavata?.dataset['kolona'];
      const ime = glavata?.dataset['ime'];
      if (kolona !== undefined && ime !== undefined && !kletka.querySelector('button')) {
        dobavi(`Скрий колоната „${ime}"`, () => {
          skriyKolona(imeNaTablitsata, kolona);
          // на живо, без прерисуване — скриването е козметика върху DOM
          prilozhiSkritite(document.body);
        });
      }
    }

    // Бутоните на реда, като редове в менюто. Без дубликати по име. „⋯" не
    // влиза — то е дръжката на СЪЩОТО това меню, не действие (резен 77).
    const butoni = [...red.querySelectorAll<HTMLButtonElement>('button')].filter(
      (b) => b.textContent!.trim() !== '' && !b.disabled && b.dataset['mnogotochie'] === undefined,
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
    // `preventScroll` по същата причина като в `grupa-deystviya.ts` (ADR-057):
    // фокусът върху пресен възел вдига скрол, а скролът затваря менюто — тоест
    // менюто изчезва в мига на отварянето.
    menyu.querySelector('button')?.focus({ preventScroll: true });
    // СКРОЛЪТ СЕ СЛУША ЧАК ОТ СЛЕДВАЩИЯ КАДЪР.
    //
    // Събитието `scroll` е АСИНХРОННО: браузърът го пуска на следващия кадър,
    // не в мига на скролването. Значи скрол, случил се ПРЕДИ менюто да се
    // отвори — например когато нещо придърпва клетката във видимото — пристига
    // СЛЕД отварянето и затваря меню, което няма нищо общо с него.
    //
    // Дотук това не личеше, защото скролираше страницата. Резен 9а направи
    // `.telo` скролиращата кутия и го извади наяве: проходът отваряше менюто,
    // прочиташе го вярно, и на следващия ред не намираше нито един бутон.
    requestAnimationFrame(() => {
      if (otvorenoMenyu === menyu) document.addEventListener('scroll', zatvori, SLUSHATEL);
    });
  });

  // Затваря се както в Уиндоус: клик другаде, Escape, скрол.
  document.addEventListener('click', (e) => {
    if (otvorenoMenyu && !otvorenoMenyu.contains(e.target as Node)) zatvori();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') zatvori();
  });
}
