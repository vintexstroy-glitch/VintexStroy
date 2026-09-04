/**
 * ДЪРВОТО НА СТРОЕЖА · шаблонът, който Състояние „Строителство" ПРЕДЛАГА
 * (резен 69 · резен 104).
 *
 * Негови думи:
 *
 *   „При започване на нов Имот с нов Обекти строителството е голямо дело с
 *    мног дървесни разклонения като в МСПроджект." *(И124 т.1 · 31.08)*
 *
 *   „Груповите дървета за обект който почва като статус Строителство за
 *    Имота… При вкарване на Голямо дело се вкарва с него и площообразуване на
 *    обкти които са продукта между суровините Имот и Голямо дело с подделата."
 *    *(И131 т.2 · 02.09)*
 *
 * Самото ДЪРВО е построено отдавна (`dela.ts` · резен 12б: под-дела на N
 * нива, номера 1.2.3). Тук е само ВРЪЗКАТА: Състоянието „Строителство" на
 * Имота ражда ПРЕДЛОЖЕНИЕ за голямото дело — а записва ЧОВЕКЪТ (правило 18):
 * машината показва дървото, човекът натиска „Създай".
 *
 * ═══ СПУСЪКЪТ Е СЪСТОЯНИЕТО, НЕ НОВИЯТ АДРЕС (резен 104 · ADR-165) ═══
 *
 * Резен 69 предлагаше дървото при Имот, който изобщо го е нямало (И124 т.1,
 * 31.08). И131 т.2 (02.09) го надживя по СПУСЪКА: „почва като статус
 * Строителство за Имота". Механизмът остана — предложение · записва човекът ·
 * сверка. Предлага се, докато под Имота няма живо коренно дело
 * „Строителство"; има ли, строежът вече е започнал и второ дърво е дубъл.
 * Коренът на дървото и първото базово състояние на Имота са ЕДНА дума — тест
 * го заковава кръстосано.
 *
 * ═══ ДЪРВОТО Е НА ИМОТА ═══
 *
 * „Голямо дело с Много поддела на ИМота" — затова делата от шаблона не носят
 * Обект: Обектите са ПРОДУКТЪТ на строежа и се раждат до него, от
 * площообразуването (`app/imoti.ts`), не се вписват в делото.
 *
 * ═══ ОТКЪДЕ СА ФАЗИТЕ ═══
 *
 * Фундаментално знание, не негова дума (правило 24 т.5: „финанси,
 * счетоводство… за тях има учебник"): българският строителен ред с трите
 * акта — Акт 14 (груб строеж), Акт 15 (предаване), Акт 16 (ползване).
 * Имената са ПРЕДЛОЖЕНИЕ — той ги мени в Управление както всяко дело;
 * сроковете тръгват от днешния ден по същата причина: неговите дати са
 * негови. Неговият КСС и линеен график (И131 т.2, средното изречение) са
 * друг ред на плана и чакат примерен файл; дотогава шаблонът е резервата.
 */

import type { PayloadDeloZapisano } from './sabitiya.js';
import { svedenotoMyasto } from './mesta.js';

export interface KlonNaShablona {
  readonly ime: string;
  readonly stapki: readonly string[];
}

/** Голямото дело · името на корена. */
export const KORENAT_NA_STROEZHA = 'Строителство';

export const SHABLON_NA_STROEZHA: readonly KlonNaShablona[] = Object.freeze([
  {
    ime: 'Проектиране и разрешителни',
    stapki: ['Виза за проектиране', 'Инвестиционен проект', 'Разрешение за строеж'],
  },
  {
    ime: 'Груб строеж',
    stapki: ['Изкоп и основи', 'Конструкция', 'Зидария', 'Покрив', 'Акт 14'],
  },
  {
    ime: 'Инсталации',
    stapki: ['Електро', 'ВиК', 'ОВК'],
  },
  {
    ime: 'Довършителни работи',
    stapki: ['Мазилки и замазки', 'Дограма', 'Подове и покрития'],
  },
  {
    ime: 'Приемане',
    stapki: ['Акт 15', 'Акт 16 · разрешение за ползване'],
  },
]);

/** Колко дела ражда шаблонът · коренът + фазите + стъпките, БРОИ се. */
export function broyatNaShablona(): number {
  return 1 + SHABLON_NA_STROEZHA.reduce((s, k) => s + 1 + k.stapki.length, 0);
}

/**
 * Делата от шаблона · готови за Вратата, в ред „родител преди дете".
 *
 * Отговорникът е ИЗВЪРШВАЩИЯТ действието — „отговорник е този който извършва
 * действието" (И124 т.7). Оценката е предложение („важно-неспешно"), не
 * присъда; сроковете са днешният ден, защото неговите дати са негови.
 */
export function delataOtShablona(
  myasto: string,
  otgovornik: string,
  dnes: string,
  novId: () => string,
): readonly { readonly id: string; readonly pat: string; readonly danni: PayloadDeloZapisano }[] {
  const obshto = (ime: string, nadDelo: string): PayloadDeloZapisano => ({
    myasto,
    // дървото е на ИМОТА · Обектите са продуктът му, не поле на делото
    obekt: '',
    ime,
    otgovornik,
    ot: dnes,
    do: dnes,
    chas: '',
    otsenka: 'важно-неспешно',
    sastoyanie: 'чака',
    nadDelo,
    dokument: '',
  });
  const koren = { id: novId(), pat: '0', danni: obshto(KORENAT_NA_STROEZHA, '') };
  const redove = [koren];
  SHABLON_NA_STROEZHA.forEach((klon, f) => {
    const faza = { id: novId(), pat: `${f + 1}`, danni: obshto(klon.ime, koren.id) };
    redove.push(faza);
    klon.stapki.forEach((stapka, st) => {
      redove.push({ id: novId(), pat: `${f + 1}.${st + 1}`, danni: obshto(stapka, faza.id) });
    });
  });
  return redove;
}

/**
 * АДРЕСЪТ НА ДЕЙСТВИЕТО за едно дело от шаблона · Имот + път в шаблона.
 *
 * Правило 5 · правило 20: `opId` носи ДЕЙСТВИЕТО, не случайно число. Резен 69
 * ползваше `randomUUID` — при грешка по средата второто натискане раждаше
 * втори корен и втори двайсет и две. С пътя в шаблона второто натискане
 * връща същия резултат, както `opIdNaObekta` при сградата (ADR-089).
 */
export function opIdNaDeloOtShablona(myasto: string, pat: string): string {
  return `darvo:${svedenotoMyasto(myasto)}:${pat}`;
}

/**
 * ЖИВИЯТ КОРЕН на строежа под този Имот · самото ГОЛЯМО ДЕЛО, ако го има.
 *
 * Един дом за въпроса „започнал ли е строежът тук" (правило 17): резен 104 го
 * пита, за да НЕ предложи второ дърво, а резен 110 — за да закачи прочетения
 * линеен график ПОД него („Голямо дело с Много поддела", И131 т.2). Две сметки
 * за едно и също щяха да се разминат при първата поправка.
 */
export function zhiviyatKoren<
  T extends { readonly myasto: string; readonly ime: string; readonly nadDelo: string },
>(zhiviDela: readonly T[], myasto: string): T | undefined {
  const sveden = svedenotoMyasto(myasto);
  return zhiviDela.find(
    (d) => d.ime === KORENAT_NA_STROEZHA && d.nadDelo === '' && svedenotoMyasto(d.myasto) === sveden,
  );
}

/** Има ли под Имота ЖИВО коренно дело „Строителство" · тогава дърво не се предлага. */
export function imaZhivKoren(
  zhiviDela: readonly { readonly myasto: string; readonly ime: string; readonly nadDelo: string }[],
  myasto: string,
): boolean {
  return zhiviyatKoren(zhiviDela, myasto) !== undefined;
}

/**
 * ПРЕДЛАГА ЛИ СЕ ДЪРВОТО · Състоянието е „Строителство" и строежът още не е
 * започнал (няма жив корен). Чиста функция, за да има тест.
 */
export function predlagaLiDarvo(
  sastoyanie: string,
  zhiviDela: readonly { readonly myasto: string; readonly ime: string; readonly nadDelo: string }[],
  myasto: string,
): boolean {
  return sastoyanie === KORENAT_NA_STROEZHA && !imaZhivKoren(zhiviDela, myasto);
}
