/**
 * Парите са ЦЕЛИ СТОТИНКИ. Никога float.
 * Правило от Архитектурния документ §5 и План за изпълнение П2.1.
 */

export type Stotinki = number & { readonly __stotinki: unique symbol };

export class GreshkaPari extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPari';
  }
}

/** Прави Stotinki от число. Хвърля, ако не е цяло и безопасно. */
export function stotinki(n: number): Stotinki {
  if (!Number.isSafeInteger(n)) {
    throw new GreshkaPari(`Парите са цели стотинки; получено: ${n}`);
  }
  return n as Stotinki;
}

/** Проверка без хвърляне — ползва се от валидацията на Вратата. */
export function eStotinki(n: unknown): n is Stotinki {
  return typeof n === 'number' && Number.isSafeInteger(n);
}

export function sabiri(...chasti: readonly Stotinki[]): Stotinki {
  let sbor = 0;
  for (const ch of chasti) sbor += ch;
  return stotinki(sbor);
}

export function izvadi(a: Stotinki, b: Stotinki): Stotinki {
  return stotinki(a - b);
}

/** Обръща знака — основата на сторното. */
export function obarni(a: Stotinki): Stotinki {
  return stotinki(-a);
}

/**
 * Разпределя сума на части без загуба на стотинка.
 * Остатъкът отива към първите части, за да е сборът точен.
 */
export function razpredeli(suma: Stotinki, chasti: number): Stotinki[] {
  if (!Number.isSafeInteger(chasti) || chasti <= 0) {
    throw new GreshkaPari(`Броят части трябва да е цяло положително число; получено: ${chasti}`);
  }
  const znak = suma < 0 ? -1 : 1;
  const abs = Math.abs(suma);
  const osnova = Math.floor(abs / chasti);
  const ostatak = abs - osnova * chasti;
  return Array.from({ length: chasti }, (_, i) =>
    stotinki(znak * (osnova + (i < ostatak ? 1 : 0))),
  );
}

/** За четене от човек: 100_00 → "100,00" */
export function kakvoPishe(s: Stotinki): string {
  const znak = s < 0 ? '-' : '';
  const abs = Math.abs(s);
  return `${znak}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}
