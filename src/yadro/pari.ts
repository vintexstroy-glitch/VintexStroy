/**
 * Парите са цели НАЙ-МАЛКИ ЕДИНИЦИ на валутата. Никога float.
 * Правило от Архитектурния документ §5 и План за изпълнение П2.1.
 *
 * Негова дума (23.08): „ЛЕВ НЯМА… пишеш в евро, не в евроцента." Затова всичко,
 * което човек ВИЖДА, е в евро с думата и знака — а вътре се пази най-малката
 * единица, защото ДДС, изваден от обща цена, я ражда: без нея инвариантът
 * „основа + ДДС == обща" пада. Типът остава `Stotinki` — той е ЕДИНИЦАТА,
 * не левът; преименуване би пипнало всеки запис в Журнала за нула полза.
 */

import { EVRO, type Valuta } from './valuta.js';

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

/**
 * За четене от човек: 123456 → „1 234,56 €".
 *
 * Знакът на валутата стои СЛЕД числото, с тясна пауза — както се пише в
 * България. Хиляди се делят с тясна пауза, за да се четат едри цени.
 */
export function kakvoPishe(s: Stotinki, v: Valuta = EVRO): string {
  const znak = s < 0 ? '-' : '';
  const abs = Math.abs(s);
  // хилядите на ръка, не през локала: не всяка среда носи български правила,
  // а числото пред собственика трябва да е еднакво навсякъде
  const tsyalo = String(Math.floor(abs / v.drobni)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return `${znak}${tsyalo},${String(abs % v.drobni).padStart(2, '0')}\u202F${v.znak}`;
}

/**
 * Чете сума, написана от човек, и я превръща в цели най-малки единици.
 * Приема „1150,50", „1150.50", „1 150,50", „1150", със или без знак на валута.
 * Отказва всичко друго — входът е мястото, където се спира дробното, не Вратата.
 */
export function otSuma(tekst: string): Stotinki {
  const chisto = tekst
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/€|EUR|евро/gi, '')
    .replace(',', '.');
  const nameren = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(chisto);
  if (!nameren) {
    throw new GreshkaPari(`Не е сума: „${tekst}"`);
  }
  const [, znak, tsyala, drobna = ''] = nameren;
  const stotni = Number(drobna.padEnd(2, '0'));
  const sbor = Number(tsyala) * 100 + stotni;
  return stotinki(znak === '-' ? -sbor : sbor);
}

/** Старото име · остава като мост, за да не гръмне никой вносител. */
export const otLeva = otSuma;

/**
 * ЕДИН ОТКАЗ, ЕДИН ДОМ (правило 17).
 *
 * Формите за плащане и за разход казваха това поотделно. Две форми, които
 * отказват едно и също с два свои текста, започват да се разминават в деня,
 * в който едната се поправи — и човекът вижда две различни правила там,
 * където правилото е едно.
 */
export const SUMATA_NAD_NULA = 'Сумата трябва да е повече от нула.';

/**
 * ЗА ПИСАНЕ · чисто число за поле във форма: 123456 → „1234,56".
 *
 * Без знак на валута и без паузи за хиляди: полето е за РЕДАКТИРАНЕ, и
 * човекът пише върху числото, не върху украсата. `kakvoPishe` е за четене.
 */
export function zaPisane(s: Stotinki, drobni = 100): string {
  const znak = s < 0 ? '-' : '';
  const abs = Math.abs(s);
  return `${znak}${Math.floor(abs / drobni)},${String(abs % drobni).padStart(2, '0')}`;
}

/**
 * ЗА ЕКРАНА · същото, но приема гол `number`.
 *
 * ЗАЩО СЪЩЕСТВУВА. `Stotinki` е маркиран тип и това е правилно: там, където се
 * СМЯТА, марката пази да не влезе цена в левове или наполовина закръглено
 * число. Но полетата в Огледалото са `number` — марката се губи, щом сумата
 * мине през Журнала.
 *
 * Затова екраните пишеха `kakvoPishe(x as never)` на **71 места**. `as never`
 * не е тесен кръпка: то изключва проверката на типа ИЗЦЯЛО за този довод.
 * `undefined as never` минаваше компилацията и рисуваше „NaN €" — тихо грешно
 * число на екран за пари.
 *
 * Тези две функции приемат `number`, значи проверката остава, а невъзможното
 * число се КАЗВА, вместо да мине за нула.
 */
export function pishi(st: number, v: Valuta = EVRO): string {
  if (!Number.isSafeInteger(st)) return `⚠ не е цели стотинки: ${String(st)}`;
  return kakvoPishe(st as Stotinki, v);
}

/** Същото за полето за писане — без знака на валутата. */
export function pishiVPole(st: number, drobni = 100): string {
  if (!Number.isSafeInteger(st)) return '';
  return zaPisane(st as Stotinki, drobni);
}
