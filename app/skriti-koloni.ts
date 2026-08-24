/**
 * СКРИВАНЕТО НА КОЛОНА · последното парче от вълна 1 (предложение 9).
 *
 * Правило 23, дословно: „Скритото ПАК се смята. Скриването пипа екрана и
 * нищо друго — нито сбор, нито Журнал, нито износ. Колона се СКРИВА, ред
 * се ИЗКЛЮЧВА, и двете не се разменят."
 *
 * Затова този модул живее СЛЕД рисуването: данните се смятат и рисуват
 * целите, а скриването е козметика върху готовия DOM — маха клетките от
 * очите и стеснява решетката. Нито една сметка не минава оттук.
 *
 * Скритата колона не изчезва тихо: под таблицата остава ред
 * „Скрити колони: N · покажи ги" — скрито, за което нищо не напомня,
 * се превръща в изгубено.
 *
 * Помни се ЕКРАННО (`pamet-ekran`), по ключ на таблица — как се гледа,
 * не какво е вярно. Това е скриване ПО ЖЕЛАНИЕ на гледащия; скриването
 * ПО ПРАВО (колонното право, ADR-011) е друго решение с друг дом и те
 * не се сливат (правило 15: изключено ≠ липсващо).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/**
 * Маха една пътечка от grid-шаблон, по номер.
 *
 * Шаблонът е списък пътечки, делени с интервал — но „minmax(0, 2fr)" носи
 * интервал ВЪТРЕ в скобите, затова просто `split(' ')` реже погрешно.
 * Чиста функция, за да има тест.
 */
export function bezPatechka(shablon: string, nomer: number): string {
  const patechki: string[] = [];
  let dulbochina = 0;
  let tekushta = '';
  for (const znak of shablon) {
    if (znak === '(') dulbochina += 1;
    if (znak === ')') dulbochina -= 1;
    if (znak === ' ' && dulbochina === 0) {
      if (tekushta !== '') patechki.push(tekushta);
      tekushta = '';
    } else tekushta += znak;
  }
  if (tekushta !== '') patechki.push(tekushta);
  return patechki.filter((_, i) => i !== nomer).join(' ');
}

const KLYUCH = 'skriti-koloni';

function skritite(): Record<string, number[]> {
  return chetiEkranno<Record<string, number[]>>(KLYUCH, {});
}

export function skriyKolona(tablitsa: string, nomer: number): void {
  const vsichki = skritite();
  const spisak = vsichki[tablitsa] ?? [];
  if (!spisak.includes(nomer)) spisak.push(nomer);
  vsichki[tablitsa] = spisak;
  zapomniEkranno(KLYUCH, vsichki);
}

export function pokazhiKolonite(tablitsa: string): void {
  const vsichki = skritite();
  delete vsichki[tablitsa];
  zapomniEkranno(KLYUCH, vsichki);
}

/** Ключът на таблицата — от белега за подредба в собствената ѝ глава. */
export function klyuchNaTablitsata(tablitsa: HTMLElement): string | null {
  const beleg = tablitsa.querySelector<HTMLElement>('[data-podredi]')?.dataset['podredi'];
  if (!beleg) return null;
  return beleg.slice(0, beleg.indexOf(':'));
}

/**
 * Прилага скритото върху готовия DOM — вика се СЛЕД всяко рисуване и на
 * живо след „Скрий колоната". Оригиналният шаблон се пази на елемента,
 * за да може „покажи ги" да го върне без прерисуване.
 */
export function prilozhiSkritite(koren: HTMLElement): void {
  const vsichki = skritite();
  for (const tablitsa of koren.querySelectorAll<HTMLElement>('.tablitsa')) {
    const klyuch = klyuchNaTablitsata(tablitsa);
    if (!klyuch) continue;
    const skriti = vsichki[klyuch] ?? [];

    const redove = tablitsa.querySelectorAll<HTMLElement>('.glava, .red');
    for (const red of redove) {
      const shablonat = red.dataset['shablon'] ?? getComputedStyle(red).gridTemplateColumns;
      if (skriti.length === 0) {
        // връщане: оригиналът си идва, следата пада
        if (red.dataset['shablon'] !== undefined) {
          red.style.gridTemplateColumns = '';
          delete red.dataset['shablon'];
        }
        for (const kletka of red.children) (kletka as HTMLElement).hidden = false;
        continue;
      }
      red.dataset['shablon'] = shablonat;
      // пътечките падат от най-задната напред — номерата да не се разместят
      let nov = shablonat;
      for (const n of [...skriti].sort((a, b) => b - a)) nov = bezPatechka(nov, n);
      red.style.gridTemplateColumns = nov;
      [...red.children].forEach((kletka, i) => {
        (kletka as HTMLElement).hidden = skriti.includes(i);
      });
    }

    // редът „Скрити колони: N · покажи ги" — скритото не се премълчава
    const sled = tablitsa.nextElementSibling;
    const stariyat = sled?.classList.contains('skrito-koloni') ? sled : null;
    if (skriti.length === 0) {
      stariyat?.remove();
      continue;
    }
    const red = stariyat ?? document.createElement('p');
    red.className = 'drebno skrito-koloni';
    red.innerHTML = `Скрити колони: ${skriti.length} · <button type="button" class="vrazka" data-pokazhi-koloni="${klyuch}">покажи ги</button>`;
    red.querySelector('button')!.addEventListener('click', () => {
      pokazhiKolonite(klyuch);
      prilozhiSkritite(koren);
    });
    if (!stariyat) tablitsa.after(red);
  }
}
