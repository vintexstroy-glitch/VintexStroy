/**
 * ДЪРВОТО НА СТРОЕЖА · шаблонът, който новият Имот ПРЕДЛАГА (резен 69).
 *
 * Негова дума *(И124 т.1 · ADR-120)*:
 *
 *   „При започване на нов Имот с нов Обекти строителството е голямо дело с
 *    мног дървесни разклонения като в МСПроджект."
 *
 * Самото ДЪРВО е построено отдавна (`dela.ts` · резен 12б: под-дела на N
 * нива, номера 1.2.3). Тук е само ВРЪЗКАТА: новият адрес ражда ПРЕДЛОЖЕНИЕ
 * за голямото дело — а записва ЧОВЕКЪТ (правило 18): машината показва
 * дървото, човекът натиска „Създай".
 *
 * ═══ ОТКЪДЕ СА ФАЗИТЕ ═══
 *
 * Фундаментално знание, не негова дума (правило 24 т.5: „финанси,
 * счетоводство… за тях има учебник"): българският строителен ред с трите
 * акта — Акт 14 (груб строеж), Акт 15 (предаване), Акт 16 (ползване).
 * Имената са ПРЕДЛОЖЕНИЕ — той ги мени в Управление както всяко дело;
 * сроковете тръгват от днешния ден по същата причина: неговите дати са
 * негови.
 */

import type { PayloadDeloZapisano } from './sabitiya.js';

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
  obekt: string,
  otgovornik: string,
  dnes: string,
  novId: () => string,
): readonly { readonly id: string; readonly danni: PayloadDeloZapisano }[] {
  const obshto = (ime: string, nadDelo: string): PayloadDeloZapisano => ({
    myasto,
    obekt,
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
  const koren = { id: novId(), danni: obshto(KORENAT_NA_STROEZHA, '') };
  const redove = [koren];
  for (const klon of SHABLON_NA_STROEZHA) {
    const faza = { id: novId(), danni: obshto(klon.ime, koren.id) };
    redove.push(faza);
    for (const stapka of klon.stapki) {
      redove.push({ id: novId(), danni: obshto(stapka, faza.id) });
    }
  }
  return redove;
}
