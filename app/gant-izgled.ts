/**
 * ИЗГЛЕДЪТ НА ГАНТА · подвижната граница и ширината на колоната.
 *
 * Негови думи, 27.08:
 *
 *   „Искам и **скрол за хоризонталния период** на диаграмата на Гант.
 *    Диаграмата се вижда **2 трети от екрана** и също **границата между
 *    таблицата и диаграмата до нея се мести с мишката**, а на телефона
 *    диаграмата може да я пускаш в този режим на **1/3 или да я скриеш**."
 *
 * И за колоните, същия ден:
 *
 *   „Видимата страна на календара в диаграмата… да запази **една стандартна
 *    колона като ширина** в диаграмата, и там **ако местиш една колона местиш
 *    ширината на всички колони**."
 *
 * ═══ ДВЕ ГРАНИЦИ, НЕ ЕДНА ═══
 *
 * Лесно се бъркат, а са различни:
 *
 *   · ГРАНИЦАТА между ТАБЛИЦАТА и ДИАГРАМАТА (`.gant-dvete`) — тя се мести с
 *     мишката и е неговото „2 трети".
 *   · границата между ИМЕНАТА и ВРЕМЕТО вътре в самата решетка (`.gant`) —
 *     тя вече се мести, с `resize: horizontal` на `.gant-imena`.
 *
 * ═══ КОЛОНАТА · НАХОДКА, КОЯТО МЕНИ И СКРОЛА ═══
 *
 * Дотук ширината беше `repeat(N, minmax(34px, 1fr))`. `1fr` значи РАЗТЯГАНЕ:
 * при такт „година" дванайсетте колони се разпъват, за да напълнят мястото, и
 * хоризонтален скрол НЯМА КАКВО да скролва. Тоест „стандартна колона" и „скрол
 * за периода" се чупеха от една и съща дума.
 *
 * Сега е `repeat(N, var(--kolona))` — ЕДНА стандартна ширина. Оттам:
 *   · колоните не се разтягат;
 *   · скролът е истински, щом колоните не се побират;
 *   · „местиш една, местиш всички" излиза ДАРОМ — има само едно число.
 *
 * Същият похват като при височината на реда (резен 9б): числото стои на
 * КОНТЕЙНЕРА, не на всяка колона, и затова „една за всички" е свойство на едно
 * място, а не обещание, което трябва да се повтаря.
 *
 * ═══ ЗАЩО В ПАМЕТТА НА ЕКРАНА ═══
 *
 * И двете са ПОГЛЕД, не факт (ADR-022 · правило 23).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/**
 * ДЯЛЪТ НА ДИАГРАМАТА · негово число: две трети.
 *
 * ADR-018 §4 носи по-старото му „при старт е разделено на 2" *(р75·[64])* и
 * казва, че 1/3 ↔ 2/3 важи за РАЗГЪНАТА диаграма. Думата от 27.08 е по-късна и
 * говори за подразбраното: „диаграмата СЕ ВИЖДА 2 трети от екрана".
 * Последната дума бие (правило 28).
 */
export const DYAL_PODRAZBIRAN = 2 / 3;
/** Под една пета всяка от двете престава да се чете. */
export const NAY_MALAK_DYAL = 0.2;
export const NAY_GOLYAM_DYAL = 0.8;

/** Дялът в позволеното · чиста функция. */
export function ogranichiDyala(chast: number): number {
  if (!Number.isFinite(chast)) return DYAL_PODRAZBIRAN;
  return Math.min(NAY_GOLYAM_DYAL, Math.max(NAY_MALAK_DYAL, chast));
}

/**
 * ШИРИНАТА НА КОЛОНАТА · в пиксели.
 *
 * 34 е числото, което стоеше като долна граница на старото `minmax(34px, 1fr)`
 * — значи подразбраното НЕ мени вида, а само спира разтягането.
 */
export const KOLONA_PODRAZBIRANA = 34;
/** Под 14px в колоната не се побира и двуцифрен ден. */
export const NAY_TESNA = 14;
export const NAY_SHIROKA = 160;

export function ogranichiKolonata(px: number): number {
  if (!Number.isFinite(px)) return KOLONA_PODRAZBIRANA;
  return Math.min(NAY_SHIROKA, Math.max(NAY_TESNA, Math.round(px)));
}

const KLYUCH_DYAL = 'gant.dyal';
const KLYUCH_KOLONA = 'gant.kolona';

function dyalat(): number {
  return ogranichiDyala(chetiEkranno<number>(KLYUCH_DYAL, DYAL_PODRAZBIRAN));
}

function kolonata(): number {
  return ogranichiKolonata(chetiEkranno<number>(KLYUCH_KOLONA, KOLONA_PODRAZBIRANA));
}

/** Ширината на зоната за хващане · същото число като при реда (резен 9б). */
const RAB = 6;

/**
 * Закача изгледа · вика се СЛЕД всяко рисуване.
 *
 * Тихо се връща, когато екранът не е Управление: проходът е ЕДИН и се вика
 * отвсякъде, а проверка „има ли го" е по-евтина от условие при викащия.
 */
export function zakachiIzgledaNaGanta(koren: HTMLElement): void {
  postaviStepenite(koren);
  postaviKolonata(koren);
  const dvete = koren.querySelector<HTMLElement>('.gant-dvete');
  if (dvete && !dvete.classList.contains('bez-diagrama')) granitsata(dvete);
  vlacheneNaKolonata(koren);
}

/**
 * СТЕПЕНТА на всеки ред · през CSSOM, не с вграден `style` (резен 12б).
 *
 * CSP-то на приложението е `default-src 'self'` без `unsafe-inline`: браузърът
 * ОТКАЗВА вградени стилови атрибути и отстъпът нямаше да се приложи изобщо.
 * Разметката носи `data-stepen`; числото стига до стила оттук.
 *
 * Поуката, платена от прохода: правило може да е вярно И да не стига до екрана.
 * Тук пазачът не беше проверка на разметка, а КОНЗОЛАТА.
 */
function postaviStepenite(koren: HTMLElement): void {
  for (const red of koren.querySelectorAll<HTMLElement>('.gant-delo[data-stepen]')) {
    red.style.setProperty('--stepen', red.dataset['stepen'] ?? '0');
  }
}

/** Слага ширината на колоната · на самата решетка. */
function postaviKolonata(koren: HTMLElement): void {
  for (const g of koren.querySelectorAll<HTMLElement>('.gant')) {
    g.style.setProperty('--kolona', `${kolonata()}px`);
  }
}

/**
 * ПОДВИЖНАТА ГРАНИЦА между таблицата и диаграмата.
 *
 * Дръжката е СВОЙ възел, не `::after`: тук тя стои МЕЖДУ двете половини, в
 * процепа, и няма чий ръб да заеме. При реда беше обратното — там воал върху
 * реда би застанал между пръста и клетката (резен 9б).
 */
function granitsata(dvete: HTMLElement): void {
  dvete.style.setProperty('--dyal', String(dyalat()));
  if (dvete.querySelector('.gant-granitsa')) return;

  const drazhka = document.createElement('div');
  drazhka.className = 'gant-granitsa';
  drazhka.setAttribute('role', 'separator');
  drazhka.setAttribute('aria-orientation', 'vertical');
  drazhka.setAttribute('aria-label', 'Граница между таблицата и диаграмата');
  drazhka.tabIndex = 0;
  const parva = dvete.firstElementChild;
  if (parva?.nextElementSibling) dvete.insertBefore(drazhka, parva.nextElementSibling);

  drazhka.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    drazhka.setPointerCapture(e.pointerId);
    const ramka = dvete.getBoundingClientRect();
    let sega = dyalat();
    const mesti = (m: PointerEvent): void => {
      // Дялът се мери от ДЯСНО: числото е колко от ширината взима ДИАГРАМАТА.
      sega = ogranichiDyala((ramka.right - m.clientX) / ramka.width);
      dvete.style.setProperty('--dyal', String(sega));
    };
    const pusni = (): void => {
      drazhka.releasePointerCapture(e.pointerId);
      drazhka.removeEventListener('pointermove', mesti);
      drazhka.removeEventListener('pointerup', pusni);
      drazhka.removeEventListener('pointercancel', pusni);
      zapomniEkranno(KLYUCH_DYAL, sega);
    };
    drazhka.addEventListener('pointermove', mesti);
    drazhka.addEventListener('pointerup', pusni);
    drazhka.addEventListener('pointercancel', pusni);
  });

  // КЛАВИАТУРАТА също мести границата · инак тя е лост само за мишка.
  drazhka.addEventListener('keydown', (e) => {
    const kraka = e.key === 'ArrowLeft' ? -0.05 : e.key === 'ArrowRight' ? 0.05 : 0;
    if (kraka === 0) return;
    e.preventDefault();
    const nov = ogranichiDyala(dyalat() - kraka);
    zapomniEkranno(KLYUCH_DYAL, nov);
    dvete.style.setProperty('--dyal', String(nov));
  });
}

/**
 * ВЛАЧЕНЕТО НА КОЛОНАТА · по десния ръб на коя да е глава на времевата ос.
 *
 * „Ако местиш една колона местиш ширината на ВСИЧКИ колони" — това не се пази с
 * код, а излиза от устройството: ширината е ЕДНО число за цялата решетка.
 */
function vlacheneNaKolonata(koren: HTMLElement): void {
  for (const glava of koren.querySelectorAll<HTMLElement>('.gant-glava-vreme')) {
    glava.addEventListener('pointerdown', (e) => {
      const kletka = (e.target as HTMLElement).closest<HTMLElement>('span');
      if (!kletka) return;
      const ramka = kletka.getBoundingClientRect();
      if (e.clientX < ramka.right - RAB) return;
      e.preventDefault();
      glava.setPointerCapture(e.pointerId);
      const nachalo = e.clientX;
      const beshe = kolonata();
      let sega = beshe;
      const reshetki = [...koren.querySelectorAll<HTMLElement>('.gant')];
      const mesti = (m: PointerEvent): void => {
        sega = ogranichiKolonata(beshe + (m.clientX - nachalo));
        for (const g of reshetki) g.style.setProperty('--kolona', `${sega}px`);
      };
      const pusni = (): void => {
        glava.releasePointerCapture(e.pointerId);
        glava.removeEventListener('pointermove', mesti);
        glava.removeEventListener('pointerup', pusni);
        glava.removeEventListener('pointercancel', pusni);
        zapomniEkranno(KLYUCH_KOLONA, sega);
      };
      glava.addEventListener('pointermove', mesti);
      glava.addEventListener('pointerup', pusni);
      glava.addEventListener('pointercancel', pusni);
    });
  }
}
