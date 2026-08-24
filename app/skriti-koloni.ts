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
 * Помни се КЛЮЧЪТ на колоната (`data-kolona`, печатан от двигателя в
 * главата), не поредният ѝ номер: добавена или разместена колона утре не
 * бива да кара запомнен номер да скрие ДРУГА колона. Номерът се решава
 * при прилагане, от главата на екрана. Таблицата казва името си сама
 * (`data-tablitsa` от рисуването) — нищо не се гадае от белези на филтъра.
 *
 * Скритата колона не изчезва тихо: под таблицата остава ред
 * „Скрити колони: N · покажи ги" — скрито, за което нищо не напомня,
 * се превръща в изгубено. Помни се екранно (`pamet-ekran`), по таблица.
 * Скриването ПО ЖЕЛАНИЕ (това) и скриването ПО ПРАВО (колонното право,
 * ADR-011) са две решения с два дома и не се сливат (правило 15).
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

function skritite(): Record<string, string[]> {
  return chetiEkranno<Record<string, string[]>>(KLYUCH, {});
}

export function skriyKolona(tablitsa: string, kolona: string): void {
  const vsichki = skritite();
  const spisak = vsichki[tablitsa] ?? [];
  if (!spisak.includes(kolona)) spisak.push(kolona);
  vsichki[tablitsa] = spisak;
  zapomniEkranno(KLYUCH, vsichki);
}

function pokazhiKolonite(tablitsa: string): void {
  const vsichki = skritite();
  delete vsichki[tablitsa];
  zapomniEkranno(KLYUCH, vsichki);
}

/** Номерата на скритите колони — решени при прилагане, от главата. */
function nomeraNaSkritite(glava: HTMLElement, klyuchove: readonly string[]): Set<number> {
  const nomera = new Set<number>();
  [...glava.children].forEach((kletka, i) => {
    const k = (kletka as HTMLElement).dataset['kolona'];
    if (k !== undefined && klyuchove.includes(k)) nomera.add(i);
  });
  return nomera;
}

/**
 * Прилага скритото върху готовия DOM — вика се СЛЕД всяко рисуване и на
 * живо след „Скрий колоната". Оригиналният шаблон се пази на елемента,
 * за да може „покажи ги" да го върне без прерисуване.
 */
export function prilozhiSkritite(koren: HTMLElement): void {
  const vsichki = skritite();
  for (const tablitsa of koren.querySelectorAll<HTMLElement>('.tablitsa[data-tablitsa]')) {
    const klyuch = tablitsa.dataset['tablitsa']!;
    const klyuchove = vsichki[klyuch] ?? [];
    const glava = tablitsa.querySelector<HTMLElement>('.glava');
    // обичайният случай — нищо скрито и никаква следа: една проверка, край.
    // `getComputedStyle` по ред при всяко прерисуване би било разточително.
    if (klyuchove.length === 0 && !glava?.dataset['shablon']) continue;
    if (!glava) continue;
    const nomera = nomeraNaSkritite(glava, klyuchove);

    for (const red of tablitsa.querySelectorAll<HTMLElement>('.glava, .red')) {
      if (nomera.size === 0) {
        // връщане: оригиналът си идва, следата пада
        if (red.dataset['shablon'] !== undefined) {
          red.style.gridTemplateColumns = '';
          delete red.dataset['shablon'];
        }
        for (const kletka of red.children) (kletka as HTMLElement).hidden = false;
        continue;
      }
      const shablonat = red.dataset['shablon'] ?? getComputedStyle(red).gridTemplateColumns;
      red.dataset['shablon'] = shablonat;
      // пътечките падат от най-задната напред — номерата да не се разместят
      let nov = shablonat;
      for (const n of [...nomera].sort((a, b) => b - a)) nov = bezPatechka(nov, n);
      red.style.gridTemplateColumns = nov;
      [...red.children].forEach((kletka, i) => {
        (kletka as HTMLElement).hidden = nomera.has(i);
      });
    }

    // редът „Скрити колони: N · покажи ги" — скритото не се премълчава
    const sled = tablitsa.nextElementSibling;
    const stariyat = sled?.classList.contains('skrito-koloni') ? sled : null;
    if (nomera.size === 0) {
      stariyat?.remove();
      continue;
    }
    const red = stariyat ?? document.createElement('p');
    red.className = 'drebno skrito-koloni';
    red.innerHTML = `Скрити колони: ${nomera.size} · <button type="button" class="vrazka" data-pokazhi-koloni="${klyuch}">покажи ги</button>`;
    red.querySelector('button')!.addEventListener('click', () => {
      pokazhiKolonite(klyuch);
      prilozhiSkritite(koren);
    });
    if (!stariyat) tablitsa.after(red);
  }
}
