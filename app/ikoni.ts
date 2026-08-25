/**
 * ТЕМАТИЧНИТЕ ИКОНИ · един дом за знаците на управленията (И101 т.2).
 *
 * Негови думи: „искам същите цветове, **тематични икони до всяко управление**,
 * дизайн по темата на таба и това, което е сложил сам в него… Да е скрито с
 * дребни бутончета и падащи менюта и отметки."
 *
 * ═══ ЗАЩО ЕДИН ДОМ, А НЕ ИКОНА НА МЯСТО ═══
 *
 * Иконите на екраните вече живееха в регистъра (`ekranite.ts`) — по една на
 * екран, и това работеше, докато бяха десет. Управленията са десетки: сторно,
 * поправка, история, износ, филтър, подредба, ново, скриване. Нарисувана на
 * място, всяка от тях се разминава при първата поправка — и „сторно" получава
 * два различни знака на два екрана, което е по-лошо от никакъв знак.
 *
 * ═══ ЗАЩО СЪЩИЯТ СТИЛ ═══
 *
 * Всички са 24×24, само `stroke`, без `fill`, дебелина 1.6 — точно както
 * иконите на лентата. Един стил значи, че цветът им идва от текста до тях и се
 * мени с темата; икона със свой цвят би заживяла отделен живот при първата
 * смяна на палитрата.
 *
 * ═══ ИКОНАТА НЕ Е ЕДИНСТВЕНИЯТ НОСИТЕЛ ═══
 *
 * Същото правило като при цветовете (ADR-032 · правило: цветът НАМИРА, думата
 * ОБЯСНЯВА). Затова всяко бутонче с икона носи и `title`, и достъпно име —
 * знакът съкращава пътя за окото, но не отнема думата на онзи, който я чете.
 */

import { ekraniraj } from './obshto.js';

/**
 * ЗНАЦИТЕ · по ТЕМА, не по екран.
 *
 * Името е онова, което управлението ПРАВИ („storno", „istoriya"), не къде
 * стои. Така един знак служи на всички екрани, които вършат същото.
 */
export const IKONI: Readonly<Record<string, string>> = Object.freeze({
  // ── записът и поправката ───────────────────────────────────────────────
  storno: '<path d="M9 5.5 4.5 10 9 14.5"></path><path d="M4.5 10h9a6 6 0 0 1 0 12H8"></path>',
  popravka: '<path d="M4 20.5h4l11-11a2.1 2.1 0 0 0-3-3l-11 11z"></path><path d="M14.5 7.5l3 3"></path>',
  istoriya: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5.5l3.5 2"></path>',
  novo: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  mahni: '<path d="M5 12h14"></path>',

  // ── файловете · навън и навътре ────────────────────────────────────────
  iznos: '<path d="M12 16V4"></path><path d="M8 8l4-4 4 4"></path><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"></path>',
  vnos: '<path d="M12 4v12"></path><path d="M8 12l4 4 4-4"></path><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"></path>',
  arhiv: '<rect x="3" y="4.5" width="18" height="5" rx="1"></rect><path d="M5 9.5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"></path><path d="M10 13h4"></path>',
  veriga: '<path d="M10 14a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7L11 7.3"></path><path d="M14 10a4 4 0 0 0-5.7 0L5.8 12.5a4 4 0 0 0 5.7 5.7L13 16.7"></path>',
  obrazets: '<path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"></path><path d="M14 3.5v4h4"></path><path d="M8.5 13h7"></path><path d="M8.5 16.5h4.5"></path>',

  // ── гледането · филтър, ред, групи ─────────────────────────────────────
  filtar: '<path d="M3.5 5.5h17l-6.5 7.5v5.5l-4 2.5v-8z"></path>',
  tarsene: '<circle cx="10.5" cy="10.5" r="6"></circle><path d="M15 15l4.5 4.5"></path>',
  podredba: '<path d="M4 6.5h11"></path><path d="M4 12h8"></path><path d="M4 17.5h5"></path><path d="M17 8.5V18"></path><path d="M14.5 15.5 17 18l2.5-2.5"></path>',
  grupirane: '<rect x="3.5" y="4.5" width="17" height="5" rx="1"></rect><rect x="3.5" y="14.5" width="17" height="5" rx="1"></rect>',
  skriy: '<path d="M4 12s3.2-5.5 8-5.5 8 5.5 8 5.5-3.2 5.5-8 5.5S4 12 4 12z"></path><path d="M4.5 4.5l15 15"></path>',
  pokazhi: '<path d="M4 12s3.2-5.5 8-5.5 8 5.5 8 5.5-3.2 5.5-8 5.5S4 12 4 12z"></path><circle cx="12" cy="12" r="2.3"></circle>',

  // ── строежът на изгледи ────────────────────────────────────────────────
  tab: '<rect x="3" y="5.5" width="18" height="14" rx="1.5"></rect><path d="M3 10h18"></path><path d="M9 5.5V10"></path>',
  tablitsa: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"></rect><path d="M3.5 9.5h17"></path><path d="M9 9.5V19.5"></path><path d="M15 9.5V19.5"></path>',
  diagrama: '<path d="M4 19.5V11"></path><path d="M9.5 19.5V5.5"></path><path d="M15 19.5v-6"></path><path d="M20.5 19.5V8.5"></path>',
  svrazka: '<circle cx="6.5" cy="7" r="2.5"></circle><circle cx="17.5" cy="17" r="2.5"></circle><path d="M8.7 8.6 15.3 15.4"></path>',

  // ── хората и правото ───────────────────────────────────────────────────
  sluzhitel: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 20a7 7 0 0 1 14 0"></path>',
  pravo: '<rect x="5" y="10.5" width="14" height="9" rx="1.5"></rect><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"></path>',
  zaklyucheno: '<rect x="5" y="10.5" width="14" height="9" rx="1.5"></rect><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"></path><path d="M12 14v2.5"></path>',
  otkluchen: '<rect x="5" y="10.5" width="14" height="9" rx="1.5"></rect><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.3"></path>',

  // ── темите на Настройките ──────────────────────────────────────────────
  nastroyki: '<circle cx="12" cy="12" r="3"></circle><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"></path>',
  hedar: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"></rect><path d="M3.5 9.5h17"></path>',
  buton: '<rect x="3.5" y="8" width="17" height="8" rx="4"></rect><circle cx="8" cy="12" r="2"></circle>',
  model: '<path d="M12 3.5 20 8v8l-8 4.5L4 16V8z"></path><path d="M4 8l8 4.5L20 8"></path><path d="M12 12.5v8"></path>',
  sverka: '<path d="M4.5 12.5 9 17l10.5-10.5"></path>',
  agent: '<rect x="4" y="7" width="16" height="12" rx="2"></rect><path d="M9 12v3M15 12v3"></path><path d="M12 3.5V7"></path>',
  lichno: '<path d="M12 21s-7.5-4.4-7.5-9.6A4.4 4.4 0 0 1 12 8.3a4.4 4.4 0 0 1 7.5 3.1C19.5 16.6 12 21 12 21z"></path>',
  // ── ЕКРАНИТЕ · пренесени от регистъра (`ekranite.ts`), правило 17 ──────
  //
  // „Настройки" и „Лично" ГИ НЯМА тук с представка `ekran-`: техните знаци
  // вече стояха горе, а пренасянето щеше да ги удвои. Тестът го хвана — два
  // ключа за един знак е точно дубълът, който този дом премахва.
  //
  // Живееха ВГРАДЕНИ там, всеки като низ с пътища. Работеше, докато иконите
  // бяха само десет и само за лентата. Щом се появи втори дом за знаци, двата
  // почнаха да се разминават по стил и дебелина — затова екранът вече посочва
  // ИМЕ, а самият знак живее тук, до всички останали.
  'ekran-imoti': '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path><path d="M9.5 21v-6.5h5V21"></path>',
  'ekran-pari': '<rect x="2.5" y="6" width="19" height="12" rx="1.5"></rect><path d="M2.5 10h19"></path><path d="M6 14.5h4"></path>',
  'ekran-smetki': '<path d="M5 3.5h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"></path><path d="M7.5 8h9"></path><path d="M7.5 12h4"></path><path d="M7.5 16h4"></path><path d="M15 12v4.5"></path><path d="M12.75 14.25h4.5"></path>',
  'ekran-stoynost': '<path d="M4 20V9"></path><path d="M9.5 20V4"></path><path d="M15 20v-7"></path><path d="M20.5 20V7"></path><path d="M2.5 20h19"></path>',
  'ekran-gant': '<path d="M3 5.5h18"></path><path d="M3 12h11"></path><path d="M3 18.5h7"></path><path d="M17.5 10v4.5"></path><path d="M15.25 12.25h4.5"></path>',
  'ekran-ii': '<rect x="4" y="7" width="16" height="12" rx="2"></rect><path d="M9 12v3M15 12v3"></path><path d="M12 3.5V7"></path><circle cx="12" cy="3" r="1"></circle>',
  'ekran-tabove': '<rect x="3" y="4.5" width="18" height="15" rx="1.5"></rect><path d="M3 9h18"></path><path d="M8.5 9v10.5"></path>',
  'ekran-tablo': '<circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"></path>',

  sigurnost: '<path d="M12 3.5 19.5 6.5v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9v-6z"></path><path d="M9 12.2l2.2 2.2 4-4.3"></path>',

  // ── счетоводството пред държавата (И96 т.11) ───────────────────────────
  kniga: '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z"></path><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z"></path>',
  kontragent: '<path d="M4 20.5V6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14.5"></path><path d="M13 10h6a1 1 0 0 1 1 1v9.5"></path><path d="M2.5 20.5h19"></path><path d="M7 9h3M7 13h3M16 14h1"></path>',
});

export type ImeNaIkona = keyof typeof IKONI;

/** Има ли такъв знак · за да пада на глас, а не мълчешком (правило 17). */
export function imaIkona(ime: string): boolean {
  return Object.hasOwn(IKONI, ime);
}

/**
 * Рисува знак · празен низ при непознато име, вместо счупена разметка.
 *
 * Непознатото име НЕ хвърля: липсващата икона прави управлението по-бедно, а
 * хвърлянето би съборило целия екран заради един знак. Тестът я лови вместо
 * човека (`tests/ikoni.test.ts`).
 */
export function ikona(ime: string, klas = 'ikona'): string {
  const patishta = IKONI[ime];
  if (!patishta) return '';
  return `<svg class="${ekraniraj(klas)}" viewBox="0 0 24 24" aria-hidden="true">${patishta}</svg>`;
}

export interface ButonSIkona {
  readonly ikona: string;
  /** id-то на бутона · закачането го търси по него, не по разметката вътре */
  readonly id?: string;
  /** думата · тя ОСТАВА, дори когато не се вижда на тесен екран */
  readonly tekst: string;
  /** какво пише при задържане · по подразбиране самата дума */
  readonly title?: string;
  readonly klas?: string;
  /** готови `data-` двойки · ключът е БЕЗ представката `data-` */
  readonly danni?: Readonly<Record<string, string>>;
  readonly izklyuchen?: boolean;
  readonly vid?: 'button' | 'submit';
}

/**
 * ДРЕБНОТО БУТОНЧЕ · знак отпред, дума до него (И101 т.2).
 *
 * Думата НЕ пада заедно с мястото: тя се свива на тесен екран с CSS, а
 * `aria-label` я държи цяла за четеца. „Скрито с дребни бутончета" значи
 * по-малко мастило, не по-малко смисъл.
 */
export function butonSIkona(b: ButonSIkona): string {
  const danni = Object.entries(b.danni ?? {})
    .map(([k, v]) => ` data-${ekraniraj(k)}="${ekraniraj(v)}"`)
    .join('');
  const title = b.title ?? b.tekst;
  return `<button type="${b.vid ?? 'button'}" class="${ekraniraj(b.klas ?? 'vtorichen malak')} sIkona"` +
    `${b.id ? ` id="${ekraniraj(b.id)}"` : ''}${danni}` +
    ` title="${ekraniraj(title)}" aria-label="${ekraniraj(title)}"${b.izklyuchen ? ' disabled' : ''}>` +
    `${ikona(b.ikona)}<span class="duma">${ekraniraj(b.tekst)}</span></button>`;
}

/**
 * ГЛАВАТА НА ДЯЛ · заглавие с тематичен знак пред него.
 *
 * „Дизайн по темата на таба и това, което е сложил сам в него": знакът идва от
 * ТЕМАТА на секцията, не от екрана — една и съща таблица в два таба носи един
 * и същ знак, защото прави едно и също нещо.
 */
export function dyalglavaSIkona(imeNaIkona: string, zaglavie: string, podnaslov: string): string {
  return `
    <div class="dyalglava sIkona">
      ${ikona(imeNaIkona, 'ikona golyama')}
      <div>
        <h2>${ekraniraj(zaglavie)}</h2>
        <span>${ekraniraj(podnaslov)}</span>
      </div>
    </div>`;
}
