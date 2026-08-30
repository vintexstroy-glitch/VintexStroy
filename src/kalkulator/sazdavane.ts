/**
 * „СЪЗДАЙ СГРАДА" · Калкулаторът и РАЖДА (резен 29).
 *
 * ═══ НЕГОВАТА ДУМА ═══
 *
 * „да ще е най интересно да има **създай сграда** там . Качваш таблицата и
 * управлваш" *(р83·[20] · 11.08)*.
 *
 * И обхватът, от същия ден: „Да, но всипки се създават от Упрсвление. Само от
 * там.. **При сгради ще е от калкулатова**" *(р83·[18])*. Тоест Управление е
 * единственият родител — освен за СГРАДИ, където ражда Калкулаторът.
 *
 * ═══ РАЖДАНЕТО Е ЕДНО ДЕЙСТВИЕ С ЕДИН АДРЕС ═══
 *
 * `SGRADA:<адрес>:<обект>` носи ДЕЙСТВИЕТО, не съдържанието (правило 20):
 * „роди този обект в тази сграда". Второ качване на същия файл не удвоява
 * нищо — Вратата връща същия резултат по `opId`.
 *
 * Това е и разликата от по-стария път: раждането на „Малинова Долина" ползва
 * `opId` от `randomUUID()`, тоест НЕ е идемпотентно, и се пази само от
 * проверка в Огледалото ПРЕДИ записа. Две бързи натискания я заобикалят;
 * `opId`-ът от адреса — не.
 */

import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import type { ProchetenObekt } from './chetene.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

/**
 * КОЯ ПЛОЩ ВЛИЗА В ИМОТА · решението има ЕДИН дом (правило 17).
 *
 * Имотът носи ЕДНО число, а прочетеният обект — три: чиста (F1), обща (F1+F2)
 * и двор. Влиза ЧИСТАТА, и това не се мени: 45-те имота на Малинова Долина са
 * родени с нея, а смяна би преоценила всяко вече записано число.
 *
 * Дотук решението живееше в един израз насред `app/stoynost.ts` — тоест беше
 * невидимо за втория викащ, който сега съществува.
 */
export function ploshttaZaImota(o: ProchetenObekt): number {
  return o.chista_kvsm;
}

/** Адресът на ДЕЙСТВИЕТО · един обект в една сграда се ражда ВЕДНЪЖ. */
export function opIdNaObekta(adres: string, obekt: string): string {
  return `SGRADA:${adres}:${obekt}`;
}

/** Ключът, по който се познава вече роденото · същият, който Имоти ползват. */
export function klyuchNaImota(adres: string, obekt: string): string {
  return `${adres}·${obekt}`;
}

export class GreshkaSazdavane extends Error {
  constructor(kakvo: string) {
    super(kakvo);
    this.name = 'GreshkaSazdavane';
  }
}

/** Име на сграда · празното отказва с думи, а не ражда безименни имоти. */
export function proveriImetoNaSgradata(adres: string): string {
  const t = adres.trim();
  if (t === '') {
    throw new GreshkaSazdavane(
      'Сградата няма име. Файлът не носи адрес, а име, гадано от файла, би ' +
        'кръстило сграда по „копие (3).xlsx" — затова се въвежда.',
    );
  }
  return t;
}

export interface ZaVpisvane {
  /** обектите, които още ги няма в Имоти */
  readonly novi: readonly ProchetenObekt[];
  /** колко от прочетените вече съществуват под този адрес */
  readonly veche: number;
}

/**
 * КОИ ОБЕКТИ СА НОВИ · чете Огледалото, не гадае.
 *
 * Празният списък е ОТКАЗ, а не тиха нула: „създай сграда" от нула обекта е
 * бутон без последица (ADR-041), и човекът трябва да разбере, че файлът му не
 * е бил прочетен.
 */
export function zaVpisvane(
  obekti: readonly ProchetenObekt[],
  adres: string,
  o: Ogledalo,
): ZaVpisvane {
  if (obekti.length === 0) {
    throw new GreshkaSazdavane(
      'Няма нито един прочетен обект. Качи площообразуване, преди да създаваш сграда.',
    );
  }
  const ima = new Set([...o.imoti.values()].map((i) => klyuchNaImota(i.adres, i.edinitsa)));
  const novi: ProchetenObekt[] = [];
  let veche = 0;
  for (const ob of obekti) {
    if (ima.has(klyuchNaImota(adres, ob.obekt))) veche += 1;
    else novi.push(ob);
  }
  return { novi: Object.freeze(novi), veche };
}

/**
 * СВЕРКАТА на партидата · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът е колкото реда файлът е дал (прочетени + пропуснати); изходът е
 * колкото са намерили дом (родени + вече съществували + пропуснати). Партида
 * без сверка не се приема.
 */
export function sveriSazdavaneto(
  prochetetni: number,
  propusnati: number,
  rodeni: number,
  veche: number,
  kogato: string,
): Sverka {
  return sverka(
    'създай сграда · редове',
    prochetetni + propusnati,
    rodeni + veche + propusnati,
    kogato,
    MERKA.broy,
  );
}
