/**
 * СГЪВАНЕТО · много вериги, един поток.
 *
 * ═══ КАКВО ПРАВИ, И КАКВО НАРОЧНО НЕ ПРАВИ ═══
 *
 * Прави: взима N вериги, връща ЕДИН поток, подреден по такт. `fold` после
 * работи както винаги — тя не научава нищо ново и не се пренаписва.
 *
 * НЕ прави: не слива вериги. Нито едно събитие не сменя своята верига, своя
 * `seq` или своя хеш. Потокът е ПОГЛЕД — производно нареждане за четене, — а
 * не нов запис. Затова правило 1 не се и доближава: сливането щеше да е
 * презапис, преоблечен като синхрон.
 *
 * ═══ ЗАЩО k-ПЪТНО, А НЕ „слепи и сортирай" ═══
 *
 * Всяка верига ВЕЧЕ е подредена — по `seq`, по построение. Слепването и
 * сортирането хвърля това знание и плаща O(N log N) за него. k-пътното сливане
 * го ползва: по едно перо на верига, всеки път се взима най-малкото. При k
 * вериги това е O(N log k), а k е броят на служителите — единични числа.
 *
 * ═══ СВЕРКАТА (правило 7) ═══
 *
 * Партидата завършва със сверка вход↔изход и разликата се записва, дори когато
 * е нула. Тук входът е сборът на дължините, изходът — дължината на потока.
 * Разминаване значи изгубено или удвоено събитие, а такова нещо трябва да се
 * види, не да се предположи.
 */

import type { Sabitie } from '../yadro/index.js';
import { sravniTakt, taktNaSabitie, type Takt } from '../yadro/takt.js';
import { sverka, type Sverka } from '../yadro/sverka.js';

/** Какво знаем за една верига, след като е сгъната. */
export interface RezyumeNaVeriga {
  /** ключът на веригата — той е и номерът на писача */
  readonly veriga: string;
  readonly broy: number;
  /** авторът на ПЪРВОТО ѝ събитие · оттам се извежда чия е (ADR-043) */
  readonly parviyatActor: string;
  /** върхът ѝ · за сравнение с чужд файл, без да се чете целият */
  readonly posledenHash: string;
}

export interface SgunatoOgledalo {
  /** всички събития, подредени по такт · вход за `fold` */
  readonly potok: readonly Sabitie[];
  /** по една за всяка подадена НЕПРАЗНА верига */
  readonly verigi: readonly RezyumeNaVeriga[];
  /** Σ дължини ↔ дължина на потока · правило 7 */
  readonly sverka: Sverka;
}

/**
 * Сгъва подадените вериги в един поток.
 *
 * РЕДЪТ НА ПОДАВАНЕ НЯМА ЗНАЧЕНИЕ и това е договорът, който тестът пази с
 * пермутации: разбъркаш ли веригите, потокът излиза байт за байт същият.
 * Причината е в `sravniPoTakt` — тя гледа само подписани полета и е тотална.
 *
 * Празна верига се пропуска мълчаливо: тя не е събитие и няма какво да каже.
 *
 * ЛИПСВА КАРТА, И ТОВА Е НАРОЧНО. Първият подпис приемаше `Map<ключ, събития>`
 * и веднага роди своя грешка: ключът на картата и `naematel` на събитията са
 * ДВА записа на един факт, тъй че могат да се разминат — а разминат ли се,
 * всяка находка сочи грешната верига. Ключът е В СЪБИТИЯТА и е подписан
 * (`hash.ts`). Един факт, един дом (правило 17).
 */
export function sgani(
  verigi: readonly (readonly Sabitie[])[],
  /** времето на сверката · подава се, не се чете — часовникът е довод навсякъде тук */
  kogato: string,
): SgunatoOgledalo {
  const neprazni = verigi.filter((s) => s.length > 0);

  const rezyumeta: RezyumeNaVeriga[] = neprazni.map((s) => {
    const parvo = s[0]!;
    const posledno = s[s.length - 1]!;
    return Object.freeze({
      veriga: parvo.naematel,
      broy: s.length,
      parviyatActor: parvo.actor,
      posledenHash: posledno.hash,
    });
  });
  rezyumeta.sort((a, b) => (a.veriga < b.veriga ? -1 : a.veriga > b.veriga ? 1 : 0));

  const potok = slej(neprazni);
  const ochakvani = rezyumeta.reduce((sbor, r) => sbor + r.broy, 0);

  return Object.freeze({
    potok: Object.freeze(potok),
    verigi: Object.freeze(rezyumeta),
    sverka: sverka('сгъване на вериги', ochakvani, potok.length, kogato),
  });
}

/**
 * k-пътно сливане на вече подредени редици.
 *
 * Перото на всяка верига стои в `mesta`; на всяка стъпка се избира веригата с
 * най-малък такт. Без купчина: при единични числа вериги линейното търсене е
 * по-бързо от поддържането на структура, а и се чете.
 */
function slej(redici: readonly (readonly Sabitie[])[]): Sabitie[] {
  // ТАКТЪТ СЕ СМЯТА ВЕДНЪЖ НА СЪБИТИЕ. Сметнат при всяко сравнение, той плаща
  // по два `Date.parse` на стъпка — и точно това изкара мярката над бюджета.
  const taktove: Takt[][] = redici.map((r) => r.map(taktNaSabitie));

  const mesta = new Array<number>(redici.length).fill(0);
  const obshto = redici.reduce((sbor, r) => sbor + r.length, 0);
  const izhod: Sabitie[] = [];

  for (let n = 0; n < obshto; n += 1) {
    let nay = -1;
    for (let i = 0; i < redici.length; i += 1) {
      const mesto = mesta[i]!;
      if (mesto >= redici[i]!.length) continue;
      if (nay === -1 || sravniTakt(taktove[i]![mesto]!, taktove[nay]![mesta[nay]!]!) < 0) {
        nay = i;
      }
    }
    // Не може да не намери: `obshto` е точно сборът на дължините.
    izhod.push(redici[nay]![mesta[nay]!]!);
    mesta[nay] = mesta[nay]! + 1;
  }

  return izhod;
}
