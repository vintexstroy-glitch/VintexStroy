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
 * ═══ ТЕМАТА ДАВА ПОДРАЗБРАНОТО · ВЛАЧЕНЕТО БИЕ (резен 78 · И124 т.5) ═══
 *
 * Трите готови гъстоти и лостът им (☰ на всяка секция) са НАДЖИВЕНИ: „те да
 * са 2 броя и да са теми за натоварването" — двете теми живеят в профила
 * (`app/tema.ts`) и слагат подразбраната височина на корена. Тук остава
 * Ексел-жестът: влаченето по ръба, което пипа СВОЯТА таблица и бие темата.
 * Изборът се помни като ПИКСЕЛИ — име за смятане обратно вече няма.
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

/**
 * ПОДРАЗБРАНАТА ВИСОЧИНА · премереният ред след резен 8 (49px).
 * Темите (`tema.ts`) я предефинират през `--tema-red-visochina` на корена.
 */
export const PODRAZBRANA = 48;

/** Под 24px не се пипа с пръст, над 160px редът престава да е ред. */
export const NAY_MALKO = 24;
export const NAY_GOLYAMO = 160;

/** Пиксели в позволеното · чиста функция. */
export function ogranichi(px: number): number {
  if (!Number.isFinite(px)) return PODRAZBRANA;
  return Math.min(NAY_GOLYAMO, Math.max(NAY_MALKO, Math.round(px)));
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
  // Изричен разбор, не parseFloat: празна или чужда стойност пада на
  // подразбраното ПОИМЕННО, вместо NaN да тръгне към екрана.
  const surovo = /^(\d+(?:\.\d+)?)px$/.exec(
    getComputedStyle(t).getPropertyValue('--red-visochina').trim(),
  );
  return surovo === null ? PODRAZBRANA : Number(surovo[1]);
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
    // ЛОСТЪТ НА ГЪСТОТИТЕ ГО НЯМА ВЕЧЕ (резен 78 · ADR-135): подразбраното
    // идва от ТЕМАТА на корена; тук се слага само ръчно извлаченото.
    const postavi = (px: number): void => {
      t.style.setProperty('--red-visochina', `${px}px`);
    };
    const svoya = chetiEkranno<number | null>(klyuchat(klyuch), null);
    if (svoya !== null) postavi(ogranichi(svoya));
    vlacheneToPoRaba(t, klyuch, nachalo, postavi);
  }
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
