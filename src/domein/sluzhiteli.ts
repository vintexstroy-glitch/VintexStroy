/**
 * СЛУЖИТЕЛИТЕ · записваме кой е пуснат, не каним никого.
 *
 * Правило 14, дословно: „Сигурността на достъпа е при доставчика. Не каним
 * хора, не пазим чужди пароли, не отнемаме достъп. Виждаме онзи, когото
 * доставчикът е пуснал, и записваме имейла му като `actor`."
 *
 * Негови думи, с които този файл се роди (23.08):
 *
 *   „Поканен е нов служител с имейл: Ivaylo85Petkov@gmail.com с име Бамстера и
 *    му е даден достъп на редактор."
 *
 *   „Аз съм дал на редактор ОТ ДРАЙВА, за да може все пак да е отворена вратата
 *    за проба дали филтърът работи."
 *
 * Затова събитието се казва `СлужителЗаписан`, а не „Поканен": ние не правим
 * поканата и не можем да я отменим. Записваме факта, че този имейл работи тук и
 * с каква роля — за да има кого да пита колонното право.
 *
 * ЗАЩО ЧОВЕК НЕ СЕ ТРИЕ. Негови думи: „вече създал един път история с това име,
 * акаунт, имейл — можеш да го изтриеш, но историята в Журнала и навсякъде седи."
 * Значи махането е смяна на ролята, не изчезване: `actor` в старите събития
 * остава и трябва да има кой да го обясни.
 */

import { IMENA_NA_ROLITE, type Rolya } from '../yadro/samolichnost.js';
import type { PayloadSluzhitelZapisan } from './sabitiya.js';

export class GreshkaSluzhitel extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaSluzhitel';
  }
}

export type Sluzhitel = PayloadSluzhitelZapisan;

/**
 * Прави служител от подадените данни и веднага го проверява.
 *
 * Имейлът се сваля в малки букви: `Ivaylo85Petkov@gmail.com` и
 * `ivaylo85petkov@gmail.com` са един и същ човек при доставчика — ако тук
 * станат двама, единият ще носи права, а другият ще влиза.
 */
export function napraviSluzhitel(n: {
  imeyl: string;
  ime: string;
  rolya: Rolya;
}): Sluzhitel {
  const imeyl = n.imeyl.trim().toLowerCase();
  const ime = n.ime.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(imeyl)) {
    throw new GreshkaSluzhitel(`„${n.imeyl}" не прилича на имейл — той е и подписът в Журнала.`);
  }
  if (ime === '') {
    throw new GreshkaSluzhitel('Служителят иска име — по него се разпознава на екрана.');
  }
  if (!(n.rolya in IMENA_NA_ROLITE)) {
    throw new GreshkaSluzhitel(`Непозната роля „${n.rolya}".`);
  }

  return Object.freeze({ imeyl, ime, rolya: n.rolya });
}

/** „смени ли се нещо изобщо" — за сравнение преди запис, НЕ за `opId`. */
export function belegNaSluzhitel(s: Sluzhitel): string {
  return `${s.imeyl}|${s.ime}|${s.rolya}`;
}

/** Служителите, подредени по име — за екрана и за падащото меню. */
export function podredeni(sluzhiteli: Iterable<Sluzhitel>): readonly Sluzhitel[] {
  return [...sluzhiteli].sort((a, b) => a.ime.localeCompare(b.ime));
}

/** Едно изречение за екрана. */
export function sDumi(s: Sluzhitel): string {
  return `${s.ime} · ${s.imeyl} · ${IMENA_NA_ROLITE[s.rolya]}`;
}
