/**
 * АДРЕСНАТА КНИГА · връзката между таблиците ПО НОМЕР (И94 т.2).
 *
 * Негови думи: „Връзката между таблиците както в Ексел, с номер на полето.
 * Дали една идея, която съм дал — да има ОБЩА екселска таблица, където да
 * имат СХОДНИ НОМЕРА за връзка… Виж най-оптималния вариант да се изпълни
 * правилно и надеждно с функционалност."
 *
 * РЕШЕНИЕТО, взето тук и обяснено в ADR-028:
 *
 *   **Номерът е ВРЪЗКА, не адрес.** Две колони, които носят ЕДИН И СЪЩ
 *   номер, се връзват — точно неговото „сходни номера за връзка". Номерът
 *   не казва КЪДЕ стои колоната (това го знае моделът ѝ), а С КОГО говори.
 *
 * Защо не адрес (като R1C1): адресът мърда — махната празна колона мести
 *   всички след себе си, и връзка по адрес се чупи тихо. Номерът-връзка
 *   не мърда: той е ЗАПИСАН на колоната (в модела ѝ) и се мести с нея,
 *   както формулите се местят с колоните си (ADR-025).
 *
 * Защо ОБЩАТА ТАБЛИЦА е Огледало, а не файл: втори носител на истина се
 *   разсинхронизира (правило 17). Книгата се СМЯТА от моделите и от
 *   вградените таблици при всяко показване — записът е самият модел.
 *
 * Отговорът на въпроса му „как ще натовари системата": не се гадае — МЕРИ
 *   се. Книгата е обиколка по колоните на моделите: десетки редове, не
 *   хиляди. Мерките под договор (`npm run merki`) пазят бюджета; сметката
 *   при показване е същият механизъм като знака и скритото (правила 20 · 23).
 */

import type { ModelNaTablitsa } from '../iztochnik/model.js';
import {
  IMENA_NA_IZTOCHNITSITE,
  IZTOCHNITSI_TABLITSA,
  type IztochnikTablitsa,
  type PoKakvo,
} from './tabove.js';

export class GreshkaAdresnaKniga extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaAdresnaKniga';
  }
}

/**
 * ЗАКОВАНИТЕ НОМЕРА на вградените връзки. Дотук връзките имот · място ·
 * обект живееха като думи (`PoKakvo`); номерата ги правят видими в книгата
 * и с тях се връзват и МОДЕЛНИТЕ колони. Номерата под 100 са запазени за
 * вградените — моделните почват от 100, за да не се сблъскат никога.
 */
export const NOMER_NA_VRAZKATA: Readonly<Record<PoKakvo, number>> = Object.freeze({
  imot: 1,
  myasto: 2,
  obekt: 3,
});

export const PARVI_SVOBODEN_NOMER = 100;

/** Обратното: номер → вградената връзка, ако е такава. */
export function vrazkataNaNomer(nomer: number): PoKakvo | undefined {
  return (Object.entries(NOMER_NA_VRAZKATA) as [PoKakvo, number][]).find(
    ([, n]) => n === nomer,
  )?.[0];
}

/**
 * Кои КОЛОНИ на вградените таблици носят кой номер — изброено поименно,
 * както `tabove.ts` изброява ключовете. Едното се извежда от другото, за да
 * няма два списъка, които да се разминат.
 */
export interface RedVKnigata {
  /** номерът на връзката · 0 значи „не е свързана" */
  readonly nomer: number;
  /** „Имоти" · „Наеми" · или ключът на модел */
  readonly tablitsa: string;
  /** името на колоната, както се вижда */
  readonly kolona: string;
  /** вградена таблица или модел от Настройки */
  readonly otkade: 'vgradena' | 'model';
  /** за моделите: номерът на колоната в главата — трябва за редакция */
  readonly indeks: number;
}

/** Колоните на вградените, които носят връзка — от `tabove.KLYUCHOVE`. */
const VGRADENI_KOLONI: Readonly<Record<IztochnikTablitsa, readonly { ime: string; po: PoKakvo }[]>> =
  Object.freeze({
    imoti: [
      { ime: 'Обектът', po: 'imot' },
      { ime: 'Адресът', po: 'myasto' },
    ],
    naemi: [{ ime: 'Обектът', po: 'imot' }],
    vzemaniya: [{ ime: 'Обектът · през наема', po: 'imot' }],
    plashtaniya: [{ ime: 'Обектът · през вземането', po: 'imot' }],
    razhodi: [],
    dela: [
      { ime: 'Имотът', po: 'myasto' },
      { ime: 'Обектът', po: 'obekt' },
    ],
  });

/**
 * ОБЩАТА ТАБЛИЦА · всички таблици, всички връзки, един поглед.
 *
 * Вградените стоят първи със закованите си номера; после моделите с
 * номерата, които Стопанинът им е дал. Колона без номер също е РЕД — с
 * номер 0 — за да се вижда какво ОЩЕ не е свързано, не само какво е.
 */
export function adresnaKniga(modeli: readonly ModelNaTablitsa[]): readonly RedVKnigata[] {
  const redove: RedVKnigata[] = [];

  for (const iztochnik of IZTOCHNITSI_TABLITSA) {
    for (const k of VGRADENI_KOLONI[iztochnik]) {
      redove.push({
        nomer: NOMER_NA_VRAZKATA[k.po],
        tablitsa: IMENA_NA_IZTOCHNITSITE[iztochnik],
        kolona: k.ime,
        otkade: 'vgradena',
        indeks: -1,
      });
    }
  }

  const podredeni = [...modeli].sort((a, b) => a.klyuch.localeCompare(b.klyuch, 'bg'));
  for (const m of podredeni) {
    m.glavi.forEach((ime, indeks) => {
      redove.push({
        nomer: (m.nomera ?? {})[indeks] ?? 0,
        tablitsa: m.klyuch,
        kolona: ime,
        otkade: 'model',
        indeks,
      });
    });
  }

  return Object.freeze(redove);
}

/** Кои колони носят този номер — те са свързаните. */
export function svarzaniPoNomer(kniga: readonly RedVKnigata[], nomer: number): readonly RedVKnigata[] {
  if (nomer === 0) return Object.freeze([]);
  return Object.freeze(kniga.filter((r) => r.nomer === nomer));
}

/**
 * Следващият свободен номер за нова връзка — БРОИ СЕ от книгата, не се
 * пази на второ място. Почва от 100: под него са вградените.
 */
export function sledvashtNomer(kniga: readonly RedVKnigata[]): number {
  const zaeti = kniga.map((r) => r.nomer).filter((n) => n >= PARVI_SVOBODEN_NOMER);
  return zaeti.length === 0 ? PARVI_SVOBODEN_NOMER : Math.max(...zaeti) + 1;
}

/**
 * Проверка ПРЕДИ запис: номерът е цял и положителен, а номер под 100 е
 * само вграден — модел не се закача за запазената зона с измислен номер,
 * само със СЪЩЕСТВУВАЩА вградена връзка (1 · 2 · 3).
 */
export function proveriNomer(nomer: number): void {
  if (!Number.isInteger(nomer) || nomer < 0) {
    throw new GreshkaAdresnaKniga(`Номерът на връзка е цяло положително число; получено: ${nomer}.`);
  }
  if (nomer > 0 && nomer < PARVI_SVOBODEN_NOMER && vrazkataNaNomer(nomer) === undefined) {
    throw new GreshkaAdresnaKniga(
      `Номерата под ${PARVI_SVOBODEN_NOMER} са запазени за вградените връзки — ` +
        `свободните почват от ${PARVI_SVOBODEN_NOMER}.`,
    );
  }
}

/**
 * САМОТНИТЕ номера · връзка с ЕДИН край не връзва нищо.
 *
 * Не е грешка — колоната чака втория си край — но се КАЗВА (правило 7 по
 * дух): номер, който стои на една-единствена колона, изглежда като връзка
 * и не е.
 *
 * Броят се само номера с поне един МОДЕЛЕН край: вградената връзка е
 * дефиниция на ключ и стои в книгата винаги — тя не е заявка за връзка и
 * не бива да „виси" като вечно самотна (хванато от теста).
 */
export function samotni(kniga: readonly RedVKnigata[]): readonly number[] {
  const broy = new Map<number, number>();
  const sModelenKray = new Set<number>();
  for (const r of kniga) {
    if (r.nomer === 0) continue;
    broy.set(r.nomer, (broy.get(r.nomer) ?? 0) + 1);
    if (r.otkade === 'model') sModelenKray.add(r.nomer);
  }
  return Object.freeze(
    [...broy.entries()]
      .filter(([n, b]) => b === 1 && sModelenKray.has(n))
      .map(([n]) => n)
      .sort((a, b) => a - b),
  );
}
