/**
 * ГОДИНАТА СЕ ЗАТВАРЯ · и разминаването се МЕРИ (резен 28).
 *
 * ═══ НЕГОВАТА ДУМА ═══
 *
 * „Става на календарна година автоматично прави пълен годишен архив и
 * променяш само през журнала назад." *(р85·[51])*
 *
 * ═══ КОЕ СЕ СМЯТА И КОЕ СЕ ЗАПИСВА · цялата граница на резена ═══
 *
 * Изкушението е да се ЗАПИШЕ архивът. Отхвърлено: съдържанието на една година
 * е ФУНКЦИЯ от Журнала и се пресмята по всяко време — записано, то става второ
 * копие, което ще се разминава с първото при първата поправка.
 *
 * Прецедентът е негов и стои в правило 20: като каза „сумата се изпраща
 * автоматично", построеното беше „знакът се СМЯТА и НЕ се записва; ЗАПИСВА се
 * само махането, защото то е решение на човек".
 *
 * Тук същото. СМЯТАТ се: кои години има книгата · коя е приключила · колко
 * записа и колко пари носи. ЗАПИСВА се ЕДНО нещо, което не може да се смята —
 * МОМЕНТЪТ на затварянето и КОЙ го е затворил.
 *
 * ═══ ГОДИНАТА НЕ ОТКАЗВА ═══
 *
 * Замразяването на ДДС-месеца ОТКАЗВА събития (`zamrazyavane.ts`). Годината —
 * не: неговата дума е „променяш само през журнала назад", тоест позволение, а
 * не забрана. Отказ тук би блъснал и сторното, и сверената промяна.
 *
 * Затворената година прави разминаването ВИДИМО, с число. Това е разликата
 * между архив и отчет.
 */

import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import { klyuchNaZveno } from '../yadro/sabitie.js';
import { pogaseniteZvena } from './storno.js';
import { godinataNaZapisa } from './opis-na-zapisa.js';
import type { Ogledalo, ZatvorenaGodina } from '../ogledalo/ogledalo.js';
import type { Sabitie } from '../yadro/index.js';

/** Година във вида '2025'. */
export type Godina = string;

/** Годината на един ЗАПИС · датата му е с ЕДИН дом (резен 27 · резен 28). */
export function godinataNa(s: Sabitie): Godina {
  return godinataNaZapisa(s);
}

/**
 * ЧЕТИРИТЕ СЪСТОЯНИЯ на една година.
 *
 * `tekushta` — още върви, не се затваря: непълна година не е архив.
 * `chaka`    — приключила и незатворена.
 * `zatvorena`— затворена и книгата ѝ не е мръднала оттогава.
 * `razminava`— затворена, но броят ѝ днес е ДРУГ.
 */
export type SastoyanieNaGodina = 'tekushta' | 'chaka' | 'zatvorena' | 'razminava';

export interface RedNaGodina {
  readonly godina: Godina;
  readonly sastoyanie: SastoyanieNaGodina;
  readonly broy: number;
  /**
   * РАЗМИНАВАНЕТО СЪС ЗНАК · днешният брой минус броя при затварянето.
   *
   * Знакът значи нещо и затова се пази: ПЛЮС са влезли нови записи в затворена
   * година; МИНУС е сторно, погасило запис от нея (самото сторно пада в СВОЯТА
   * година — погасеното напуска картите, резен 27).
   *
   * Затова сравнението е `!== 0`, а не `> 0`: с `>` проверката щеше да мълчи
   * точно при поправката, тоест при най-честия случай.
   */
  readonly raznika: number;
  readonly zatvorena: ZatvorenaGodina | undefined;
}

/** Текущата година от подадения ден. Часовникът се ПОДАВА, не се чете. */
export function tekushtataGodina(dnes: string): Godina {
  return String(dnes).slice(0, 4);
}

/**
 * СЪСТОЯНИЕТО НА ВСИЧКИ ГОДИНИ · най-новата отпред.
 *
 * Чете само Огледалото: двете карти се пълнят в СЪЩИЯ обход (резен 24), тъй че
 * екранът не иска книгата, за да покаже реда.
 */
export function godinite(o: Ogledalo, dnes: string): readonly RedNaGodina[] {
  const tekushta = tekushtataGodina(dnes);
  const imena = new Set<string>([...o.godinite.keys(), ...o.zatvorenite.keys()]);
  const redove: RedNaGodina[] = [];

  for (const godina of [...imena].sort().reverse()) {
    const broy = o.godinite.get(godina) ?? 0;
    const zatvorena = o.zatvorenite.get(godina);
    const raznika = zatvorena === undefined ? 0 : broy - zatvorena.broySabitiya;
    const sastoyanie: SastoyanieNaGodina =
      godina >= tekushta
        ? 'tekushta'
        : zatvorena === undefined
          ? 'chaka'
          : raznika !== 0
            ? 'razminava'
            : 'zatvorena';
    redove.push(
      Object.freeze({
        godina,
        sastoyanie,
        broy,
        raznika,
        zatvorena,
      }),
    );
  }
  return Object.freeze(redove);
}

/** Приключилите години без затваряне · това чака Стопанина. */
export function chakashtiteGodini(o: Ogledalo, dnes: string): readonly Godina[] {
  return Object.freeze(
    godinite(o, dnes)
      .filter((r) => r.sastoyanie === 'chaka')
      .map((r) => r.godina),
  );
}

export class GreshkaGodina extends Error {
  readonly godina: Godina;

  constructor(godina: Godina, kakvo: string) {
    super(`Годината ${godina} не може да се затвори: ${kakvo}`);
    this.name = 'GreshkaGodina';
    this.godina = godina;
  }
}

/**
 * МОЖЕ ЛИ да се затвори · хвърля с думи, вместо да върне `false`.
 *
 * Двете проверки са ТУК, а не само при Вратата, защото екранът пита същото,
 * преди да нарисува бутон. Вратата пази записа; това пази предложението.
 */
export function proveriZatvaryane(o: Ogledalo, godina: Godina, dnes: string): void {
  if (godina >= tekushtataGodina(dnes)) {
    throw new GreshkaGodina(godina, 'тя още върви, а непълна година не е архив.');
  }
  if (!o.godinite.has(godina)) {
    throw new GreshkaGodina(godina, 'книгата няма нито един запис в нея.');
  }
}

/**
 * СВЕРКАТА на една година · вход↔изход по ВТОРИ независим път (правило 7).
 *
 * Входът е броят от Огледалото (пълнен в обхода); изходът се брои НАНОВО от
 * подадената книга. Двата пътя не си делят код — иначе сверката щеше да сравнява
 * едно число със себе си, а такава проверка не може да падне.
 */
export function sveriGodinata(
  o: Ogledalo,
  godina: Godina,
  sabitiya: readonly Sabitie[],
  kogato: string,
): Sverka {
  const vhod = o.godinite.get(godina) ?? 0;

  // ПОГАСЕНИТЕ се смятат НАНОВО от сторната в книгата, а не се четат от
  // `o.pogasenite`: вторият път щеше да ползва резултата на първия и сверката
  // би сравнявала едно число със себе си.
  const pogaseni = pogaseniteZvena(sabitiya);

  let izhod = 0;
  for (const s of sabitiya) {
    if (godinataNa(s) !== godina) continue;
    if (pogaseni.has(klyuchNaZveno(s))) continue;
    izhod += 1;
  }
  return sverka(`година ${godina} · записи`, vhod, izhod, kogato, MERKA.broy);
}
