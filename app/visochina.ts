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

/** Ключът на таблицата · свой, ако го има; инак този на секцията ѝ. */
function klyuchNaTablitsata(t: HTMLElement): string {
  const svoy = t.dataset['tablitsa'];
  if (svoy !== undefined && svoy !== '') return svoy;
  const sektsiya = t.closest<HTMLElement>('[data-sektsiya]');
  return sektsiya?.dataset['sektsiya'] ?? '';
}

/** Колко е висок редът на тази таблица сега. */
function visochinataNa(tablitsa: string): number {
  return ogranichi(chetiEkranno<number>(klyuchat(tablitsa), VISOCHINI.sredno));
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
  for (const t of koren.querySelectorAll<HTMLElement>('.tablitsa')) {
    const klyuch = klyuchNaTablitsata(t);
    if (klyuch === '') continue;
    const postavi = (px: number): void => {
      t.style.setProperty('--red-visochina', `${px}px`);
      const g = gastotaNa(px);
      t.dataset['gastota'] = g;
      // Отбелязаната гъстота се СМЯТА от числото, не се пази втори път.
      for (const b of glavata(t)?.querySelectorAll<HTMLButtonElement>('[data-gastota]') ?? []) {
        if (b.dataset['za'] !== klyuch) continue;
        b.setAttribute('aria-pressed', b.dataset['gastota'] === g ? 'true' : 'false');
      }
    };
    postavi(visochinataNa(klyuch));
    lostaNaGastotite(t, klyuch, postavi);
    vlacheneToPoRaba(t, klyuch, postavi);
  }
}

/** Главата на секцията, в която живее лостът · един дом за този въпрос. */
function glavata(t: HTMLElement): Element | null {
  return t.closest('[data-sektsiya]')?.querySelector('.dyalglava') ?? null;
}

/** Трите гъстоти · в главата на секцията, до стрелките за подредба. */
function lostaNaGastotite(
  t: HTMLElement,
  klyuch: string,
  postavi: (px: number) => void,
): void {
  const glava = glavata(t);
  if (!glava || glava.querySelector(`[data-gastota][data-za="${CSS.escape(klyuch)}"]`)) return;
  const kutiya = document.createElement('span');
  kutiya.className = 'gastotata';
  kutiya.setAttribute('role', 'group');
  kutiya.setAttribute('aria-label', 'Височина на реда');
  kutiya.innerHTML = GASTOTI.map(
    (g) =>
      `<button type="button" data-gastota="${g}" data-za="${klyuch}" title="${
        IMENA_NA_GASTOTITE[g]
      } · ${VISOCHINI[g]}px" aria-label="${IMENA_NA_GASTOTITE[g]}">${
        g === 'sbito' ? '≡' : g === 'sredno' ? '☰' : '▤'
      }</button>`,
  ).join('');
  glava.append(kutiya);
  for (const b of kutiya.querySelectorAll<HTMLButtonElement>('[data-gastota]')) {
    b.addEventListener('click', () => {
      const px = VISOCHINI[b.dataset['gastota'] as Gastota];
      zapomniEkranno(klyuchat(klyuch), px);
      postavi(px);
    });
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
  postavi: (px: number) => void,
): void {
  t.addEventListener('pointerdown', (e) => {
    const red = (e.target as HTMLElement).closest<HTMLElement>('.red');
    if (!red || !t.contains(red)) return;
    const ramka = red.getBoundingClientRect();
    if (e.clientY < ramka.bottom - RAB) return;
    e.preventDefault();
    const nachalo = e.clientY;
    const beshe = visochinataNa(klyuch);
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
