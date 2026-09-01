/**
 * ВИСОЧИНАТА НА РЕДА · ЕДНА за цялата таблица.
 *
 * Негови думи, 27.08:
 *
 *   „Когато местиш една височина на един ред **заедно местиш на всички редове**
 *    височината, **за колоните не важи**."
 *
 * Двете половини са еднакво важни. Редът е ЕДИН размер за таблицата — хванеш ли
 * ръба на кой да е ред, всички стават толкова. Колоната НЕ следва това правило:
 * всяка си остава своя (ADR-013 · видът и ширината живеят в колоната).
 *
 * ═══ ДВА ЛОСТА, ЕДНО ЧИСЛО ═══
 *
 * Негов избор беше „и двете": влачене по ръба, като в Ексел, И три готови
 * гъстоти. Те не са две настройки — те пипат ЕДНО число. Гъстотата е име на
 * число; влаченето е същото число, казано с ръка. Затова изборът се помни като
 * ПИКСЕЛИ, а името се СМЯТА обратно (`gastotaNa`): две памети за едно нещо се
 * разминават при първото влачене.
 *
 * ═══ ЗАЩО В ПАМЕТТА НА ЕКРАНА ═══
 *
 * „Колко висок ми е редът" е ПОГЛЕД, не факт (ADR-022 · правило 23): мой е, на
 * това устройство, и не мени нито едно число, което другите четат. Затова
 * `pamet-ekran`, никога Журналът.
 *
 * ═══ ЗАЩО ГЕНЕРИЧЕН ПРОХОД ═══
 *
 * Същата причина като при подредбата, групата действия и зебрата: вписано в
 * шестнайсетте екрана, това щяха да са шестнайсет места, които се разминават, а
 * седемнайсетото щеше да се роди без него.
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/** Трите готови гъстоти · име на число, не отделна настройка. */
export const GASTOTI = ['sbito', 'sredno', 'shiroko'] as const;
export type Gastota = (typeof GASTOTI)[number];

const IMENA_NA_GASTOTITE: Readonly<Record<Gastota, string>> = Object.freeze({
  sbito: 'Сбито',
  sredno: 'Средно',
  shiroko: 'Широко',
});

/**
 * ВИСОЧИНИТЕ · в пиксели.
 *
 * „Средно" е 48 — премереният ред след резен 8 (`ВИСОЧИНА НА РЕД: 49px`).
 * Тоест подразбраното НЕ мени нищо: то е онова, което вече стои на екрана.
 */
export const VISOCHINI: Readonly<Record<Gastota, number>> = Object.freeze({
  sbito: 32,
  sredno: 48,
  shiroko: 68,
});

/** Под 24px не се пипа с пръст, над 160px редът престава да е ред. */
export const NAY_MALKO = 24;
export const NAY_GOLYAMO = 160;

/** Пиксели в позволеното · чиста функция. */
export function ogranichi(px: number): number {
  if (!Number.isFinite(px)) return VISOCHINI.sredno;
  return Math.min(NAY_GOLYAMO, Math.max(NAY_MALKO, Math.round(px)));
}

/**
 * КОЯ ГЪСТОТА Е ТОВА ЧИСЛО · най-близката, не точното съвпадение.
 *
 * След влачене числото рядко пада точно върху предварително число, а лостът пак
 * трябва да покаже кое от трите е отбелязано. Точното съвпадение би оставило и
 * трите неотбелязани веднага след първото дръпване.
 */
export function gastotaNa(px: number): Gastota {
  let nay: Gastota = 'sredno';
  let razlika = Infinity;
  for (const g of GASTOTI) {
    const r = Math.abs(VISOCHINI[g] - px);
    if (r < razlika) {
      razlika = r;
      nay = g;
    }
  }
  return nay;
}

function klyuchat(tablitsa: string): string {
  return `red.visochina.${tablitsa}`;
}

/**
 * Запомнената височина за този ключ · за рисувачи, които не минават през CSS.
 *
 * Диаграмата на Ганта е SVG и смята координати с числа, не с променливи —
 * тя чете СЪЩАТА памет при всяко рисуване, за да важи И104: „Редовете в
 * таблицата и колоната са едно."
 */
export function zapomnenaVisochina(klyuch: string, nachalo: number): number {
  return ogranichi(chetiEkranno<number>(klyuchat(klyuch), nachalo));
}

/** Ключът на таблицата · свой, ако го има; инак този на секцията ѝ. */
function klyuchNaTablitsata(t: HTMLElement): string {
  const svoy = t.dataset['tablitsa'];
  if (svoy !== undefined && svoy !== '') return svoy;
  const sektsiya = t.closest<HTMLElement>('[data-sektsiya]');
  return sektsiya?.dataset['sektsiya'] ?? '';
}

/**
 * Началната височина на ТАЗИ таблица · чете се от нейния CSS, не се преписва.
 *
 * Таблиците подразбират 48 (`.tablitsa`), а Гантът 26 (`.gant`) — двете числа
 * живеят в `stil.css` и само там (правило 17). Прочете ли се оттам, влизането
 * на Ганта в двигателя не му мени изгледа: подразбраното Е днешното.
 */
function nachalotoNa(t: HTMLElement): number {
  // Изричен разбор, не parseFloat: празна или чужда стойност пада на средното
  // ПОИМЕННО, вместо NaN да тръгне към екрана.
  const surovo = /^(\d+(?:\.\d+)?)px$/.exec(
    getComputedStyle(t).getPropertyValue('--red-visochina').trim(),
  );
  return surovo === null ? VISOCHINI.sredno : Number(surovo[1]);
}

/** Колко е висок редът на тази таблица сега. */
function visochinataNa(tablitsa: string, nachalo: number): number {
  return zapomnenaVisochina(tablitsa, nachalo);
}

/** Широчината на зоната за влачене по долния ръб на реда. */
const RAB = 6;

/**
 * Закача височината · вика се СЛЕД всяко рисуване.
 *
 * Числото се слага на ТАБЛИЦАТА като променлива, а не на всеки ред: така „една
 * височина за цялата таблица" е свойство на едно място, а не обещание, което
 * трябва да се повтори за всеки нов ред.
 */
export function zakachiVisochinata(koren: HTMLElement): void {
  // `.gant` е втората шарка на таблица: редовете му са `.gant-delo` (имената)
  // и `.gant-red` (колоната на времето), не `.red` — но височината е СЪЩОТО
  // едно число, защото „редовете в таблицата и колоната са едно" (И104).
  for (const t of koren.querySelectorAll<HTMLElement>('.tablitsa, .gant')) {
    const klyuch = klyuchNaTablitsata(t);
    if (klyuch === '') continue;
    const nachalo = nachalotoNa(t);
    const postavi = (px: number): void => {
      t.style.setProperty('--red-visochina', `${px}px`);
      const g = gastotaNa(px);
      t.dataset['gastota'] = g;
      // Показаната гъстота се СМЯТА от числото, не се пази втори път.
      for (const b of glavata(t)?.querySelectorAll<HTMLButtonElement>('[data-gastota]') ?? []) {
        if (b.dataset['za'] !== klyuch) continue;
        oblechiLosta(b, g);
      }
    };
    postavi(visochinataNa(klyuch, nachalo));
    lostaNaGastotite(t, klyuch, postavi);
    vlacheneToPoRaba(t, klyuch, nachalo, postavi);
  }
}

/** Главата на секцията, в която живее лостът · един дом за този въпрос. */
function glavata(t: HTMLElement): Element | null {
  return t.closest('[data-sektsiya]')?.querySelector('.dyalglava') ?? null;
}

const ZNATSI_NA_GASTOTITE: Readonly<Record<Gastota, string>> = Object.freeze({
  sbito: '≡',
  sredno: '☰',
  shiroko: '▤',
});

/** Следващата гъстота в кръга · чиста функция, за да я пази тест. */
export function sledvashtataGastota(g: Gastota): Gastota {
  return GASTOTI[(GASTOTI.indexOf(g) + 1) % GASTOTI.length]!;
}

/** Знакът, думата и целта на лоста · за ЕДНА гъстота. */
function oblechiLosta(b: HTMLButtonElement, g: Gastota): void {
  const sledva = sledvashtataGastota(g);
  b.dataset['gastota'] = g;
  b.textContent = ZNATSI_NA_GASTOTITE[g];
  b.title = `Височина на реда · ${IMENA_NA_GASTOTITE[g]} · натисни за ${IMENA_NA_GASTOTITE[sledva]}`;
  b.setAttribute('aria-label', `Височина на реда · ${IMENA_NA_GASTOTITE[g]}`);
}

/**
 * Лостът на гъстотите · ЕДИН бутон, който обхожда трите.
 *
 * Дотук бяха три бутона на секция — и той ги видя: „трите бутона които не
 * работя добре… да са 2 броя" (И124 т.5). Трите ГОТОВИ гъстоти (негов избор,
 * 27.08) остават — обхождат се с едно натискане; финото е влаченето по ръба.
 * Падащо меню тук НЕ се строи: „Падаши менюта да има само в менюто" (И124
 * т.3). Двете ТЕМИ от т.5 идват с резен 78 и ще преначертаят този лост.
 */
function lostaNaGastotite(
  t: HTMLElement,
  klyuch: string,
  postavi: (px: number) => void,
): void {
  const glava = glavata(t);
  if (!glava || glava.querySelector(`[data-gastota][data-za="${CSS.escape(klyuch)}"]`)) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gastotata';
  b.dataset['za'] = klyuch;
  oblechiLosta(b, gastotaNa(visochinataNa(klyuch, nachalotoNa(t))));
  glava.append(b);
  b.addEventListener('click', () => {
    const px = VISOCHINI[sledvashtataGastota(b.dataset['gastota'] as Gastota)];
    zapomniEkranno(klyuchat(klyuch), px);
    postavi(px);
  });
}

/**
 * ВЛАЧЕНЕТО ПО РЪБА · като в Ексел.
 *
 * Зоната е долните шест пиксела на реда и се познава чрез СРАВНЕНИЕ на `clientY`
 * с долния ръб на реда, а не по свой възел: воал върху всеки ред би застанал
 * между пръста и клетката, а клетката се редактира с двойно натискане (резен
 * „Удобството"). Курсорът `row-resize` идва от `.red::after` в `stil.css` —
 * псевдоелемент, не възел, точно по същата причина.
 *
 * Слушателят се закача на ТАБЛИЦАТА, не на всеки ред: редовете се раждат наново
 * при всяко рисуване, а един слушател на таблицата покрива и онези, които още
 * не съществуват.
 *
 * `setPointerCapture` държи влаченето дори когато пръстът излезе от реда —
 * инак дърпане надолу спира в мига, в който курсорът напусне.
 */
function vlacheneToPoRaba(
  t: HTMLElement,
  klyuch: string,
  nachaloNaTablitsata: number,
  postavi: (px: number) => void,
): void {
  t.addEventListener('pointerdown', (e) => {
    // Редът има три лица: `.red` (решетъчните таблици), `tbody > tr`
    // (истинските `<table>` — дотук влаченето не ги познаваше и височината
    // там беше декорация), и двете половини на Ганта (И104).
    const red = (e.target as HTMLElement).closest<HTMLElement>(
      '.red, tbody > tr, .gant-delo, .gant-red',
    );
    if (!red || !t.contains(red)) return;
    const ramka = red.getBoundingClientRect();
    if (e.clientY < ramka.bottom - RAB) return;
    e.preventDefault();
    const nachalo = e.clientY;
    const beshe = visochinataNa(klyuch, nachaloNaTablitsata);
    t.setPointerCapture(e.pointerId);
    let sega = beshe;

    const mesti = (m: PointerEvent): void => {
      sega = ogranichi(beshe + (m.clientY - nachalo));
      postavi(sega);
    };
    const pusni = (): void => {
      t.releasePointerCapture(e.pointerId);
      t.removeEventListener('pointermove', mesti);
      t.removeEventListener('pointerup', pusni);
      t.removeEventListener('pointercancel', pusni);
      zapomniEkranno(klyuchat(klyuch), sega);
    };
    t.addEventListener('pointermove', mesti);
    t.addEventListener('pointerup', pusni);
    t.addEventListener('pointercancel', pusni);
  });
}
