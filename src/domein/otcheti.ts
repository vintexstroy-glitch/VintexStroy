/**
 * ОТЧЕТИТЕ · полетата с формули.
 *
 * Негова поръчка, 23.08, дословно (И90):
 *
 *   „За финанситее ще хледаш формулата ще правиш полета в Секция Отчети където
 *    ще се сложар полета които да покзват тези стойности с формули между всички
 *    таблици нак вероятно."
 *
 * И определението на Вземането, от същото изречение:
 *
 *   „Вземанията са Плащания по незавършили сделки където е минала сделката но
 *    има плащания нба Акт 16. След нотариална сделка и да има неплатен суми по
 *    договор сдеката е приключила и е в архива."
 *
 * И капиталът (И87): „**Активи минус задължения**" — което НАДЖИВЯВА
 * по-ранното „Собстъвен Капитал… е разликата между Приход и Разход"
 * *(р57·[207]·09.08)*. Двете числа остават, но с различни имена: разликата
 * приход−разход е СРЕДСТВА *(р64·[113])*, а не Капитал.
 *
 * ЗАЩО ВСЯКО ПОЛЕ НОСИ ФОРМУЛАТА СИ. Число в отчет, което никой не може да
 * разглоби, е усещане с цифра пред себе си. Затова `Pole` носи `sastavki` —
 * какво е влязло, поименно и с адрес — и `chaka` — какво още липсва. Поле,
 * чийто извор го няма, показва НУЛА и казва какво чака; не се скрива
 * (правило 15: изключено ≠ липсващо).
 *
 * Всичко е цели стотинки (правило 3). Нула float, нула `toFixed`.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { duljimo } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';
import { smetki } from './smetki.js';

/** Двата джоба, назовани от него: „Банка — салдо, Трезор — салдо". */
export type Dzhob = 'banka' | 'trezor';

export const IMENA_NA_DZHOBOVETE: Readonly<Record<Dzhob, string>> = Object.freeze({
  banka: 'Банка',
  trezor: 'Трезор',
});

/** Една съставка на едно поле — какво влиза и откъде се чете. */
export interface Sastavka {
  readonly ime: string;
  /** цели стотинки · знакът е ИСТИНСКИ: отрицателното се вади */
  readonly suma_st: number;
  /** откъде идва — за следата назад */
  readonly otkade: string;
}

/**
 * Едно поле в Отчети.
 *
 * `sbor_st` е сборът на `sastavki` — винаги, без изключение. Тестът го пази с
 * независим втори път, защото поле, чийто сбор не отговаря на съставките си,
 * е точно повредата, която отчетите трябва да ловят.
 */
export interface Pole {
  readonly klyuch: string;
  readonly ime: string;
  readonly sbor_st: number;
  readonly sastavki: readonly Sastavka[];
  /** какво липсва, за да е пълно числото · празно значи пълно */
  readonly chaka: readonly string[];
  /** едно изречение: какво Е това число */
  readonly kakvo: string;
}

export interface Otcheti {
  readonly period: Period;
  readonly poleta: readonly Pole[];
  /**
   * СВЕРКА ВХОД↔ИЗХОД на самия Капитал (правило 7).
   *
   * Капиталът се смята ДВА пъти по различни пътища: веднъж като сбор на
   * съставките си, веднъж като Активи − Задължения, събрани поотделно.
   * Разликата се показва **дори когато е нула** — проверената нула е различна
   * от нулата, за която никой не е питал.
   */
  readonly sverka: {
    readonly ot_sastavki_st: number;
    readonly aktivi_st: number;
    readonly zadalzheniya_st: number;
    readonly razlika_st: number;
  };
}

/** Салдото на един джоб · нула, ако още не е записано. */
export function saldoNa(o: Ogledalo, kade: Dzhob): number {
  return o.salda.get(kade)?.saldo_st ?? 0;
}

/**
 * ЛИКВИДНОСТТА · ръчно начало + автоматични движения.
 *
 * Негов трети вариант *(р48·[71])*, и защо ръчно *(р75·[38])*:
 * „ръчно, защото озвлечението се бави."
 *
 * Движенията са ВСИЧКИ до днес, не само за периода: салдото на един джоб не се
 * нулира на първо число. Затова тук няма филтър по месец — това е състояние,
 * не оборот.
 */
export function likvidnost(o: Ogledalo): Pole {
  const banka_st = saldoNa(o, 'banka');
  const trezor_st = saldoNa(o, 'trezor');
  let vlyazlo_st = 0;
  for (const p of o.plashtaniya.values()) vlyazlo_st += p.suma_st;
  let izlyazlo_st = 0;
  for (const r of o.razhodi.values()) izlyazlo_st += r.suma_st;

  const sastavki: Sastavka[] = [
    { ime: 'Банка · начално салдо', suma_st: banka_st, otkade: 'ръчно, в Сметки' },
    { ime: 'Трезор · начално салдо', suma_st: trezor_st, otkade: 'ръчно, в Сметки' },
    { ime: 'Влязло · плащания', suma_st: vlyazlo_st, otkade: 'Журналът' },
    { ime: 'Излязло · разходи', suma_st: -izlyazlo_st, otkade: 'Журналът' },
  ];

  const chaka: string[] = [];
  if (!o.salda.has('banka')) chaka.push('началното салдо на Банка');
  if (!o.salda.has('trezor')) chaka.push('началното салдо на Трезор');

  return {
    klyuch: 'likvidnost',
    ime: 'ЛИКВИДНОСТ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka,
    kakvo: 'Парите, с които се разполага ДНЕС — начало на ръка, движения от Журнала.',
  };
}

/**
 * ВЗЕМАНИЯТА · ДВА ВИДА, които не се сливат в едно число.
 *
 * От НАЕМ: начислено, което още не е погасено — „кой ми дължи" (И8).
 * От ПРОДАЖБА: плащания по НЕЗАВЪРШИЛА сделка, до Акт 16 (И90). Границата е
 * актът: след нотариалната сделка сделката е приключила и е в архива, дори с
 * неплатени суми по договор.
 *
 * Продажбите още ги няма като същност (M04 · M03 · нула код), затова вторият
 * ред стои с нула и казва какво чака. Скриването му би направило Вземанията да
 * изглеждат пълни, когато са наполовина.
 */
export function vzemaniya(o: Ogledalo): Pole {
  const otNaem_st = duljimo(o);
  const sastavki: Sastavka[] = [
    { ime: 'От наем · непогасено', suma_st: otNaem_st, otkade: 'Журналът · вземания' },
    { ime: 'От продажби · до Акт 16', suma_st: 0, otkade: 'таблица Архив Продажби' },
  ];
  return {
    klyuch: 'vzemaniya',
    ime: 'ВЗЕМАНИЯ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka: ['таблица Продажби · сверката с банковите извлечения по Архив Продажби'],
    kakvo: 'Какво дължат на нас. Наемът — непогасеното; продажбата — платеното до Акт 16.',
  };
}

/**
 * СРЕДСТВАТА · приход − разход за периода.
 *
 * Негови думи *(р64·[113])*: „разлика между приход разход е Средства, Средства
 * е разликата от миналия период. **Реално е Печалба, но се пише Средства**."
 *
 * НЕ Е КАПИТАЛ. Двете стояха слети, докато И87 не ги раздели.
 */
export function sredstva(o: Ogledalo, period: Period, kogato: string): Pole {
  const s = smetki(o, period, kogato);
  const sastavki: Sastavka[] = [
    { ime: 'Приход · начислено', suma_st: s.prihod_st, otkade: `Сметки · ${period}` },
    { ime: 'Разход', suma_st: -s.razhod_st, otkade: `Сметки · ${period}` },
  ];
  return {
    klyuch: 'sredstva',
    ime: 'СРЕДСТВА',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka: [],
    kakvo: 'Разликата приход−разход за периода. Реално е печалба, но се пише Средства.',
  };
}

/**
 * КАПИТАЛЪТ · Активи минус задължения (И87).
 *
 * Активи: Стойност на Състояние + Ликвидност + Вземания.
 * Задължения: остатъчна главница по кредити + неплатени задължения.
 *
 * Стойността на Състояние се смята в Калкулатора, но НЕ се записва в Журнала —
 * там влиза изборът на матрица, не самите цени (ADR-015). Затова тя се подава
 * отвън: екранът я дава, когато я има, и полето казва, че я чака, когато я
 * няма. Числото не се гади от имотите — площ без цена не е стойност.
 */
export interface VanshniZaKapitala {
  /** сборът от Стойност на Състояние, ако екранът го е смятал в тази сесия */
  readonly stoynostNaSastoyanie_st?: number;
  /** остатъчна главница по кредити · чака M04 */
  readonly kredititeOstatak_st?: number;
}

export function kapital(o: Ogledalo, vanshni: VanshniZaKapitala = {}): Pole {
  const stoynost_st = vanshni.stoynostNaSastoyanie_st ?? 0;
  const krediti_st = vanshni.kredititeOstatak_st ?? 0;
  const lik = likvidnost(o);
  const vze = vzemaniya(o);

  const sastavki: Sastavka[] = [
    { ime: 'Стойност на Състояние', suma_st: stoynost_st, otkade: 'Калкулаторът' },
    { ime: 'Ликвидност', suma_st: lik.sbor_st, otkade: 'поле ЛИКВИДНОСТ' },
    { ime: 'Вземания', suma_st: vze.sbor_st, otkade: 'поле ВЗЕМАНИЯ' },
    { ime: 'Кредити · остатъчна главница', suma_st: -krediti_st, otkade: 'таблица Кредити' },
  ];

  const chaka: string[] = [];
  if (vanshni.stoynostNaSastoyanie_st === undefined) {
    chaka.push('Стойност на Състояние · смята се в Калкулатора');
  }
  if (vanshni.kredititeOstatak_st === undefined) {
    chaka.push('остатъчната главница по кредитите · таблица Кредити');
  }

  return {
    klyuch: 'kapital',
    ime: 'КАПИТАЛ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka,
    kakvo: 'Активи минус задължения. Не е разликата приход−разход — тя е Средства.',
  };
}

/**
 * Всички полета за един период, плюс сверката вход↔изход на Капитала.
 *
 * Редът е нарочен: първо какво ИМАМЕ (Капитал), после от какво е съставен
 * (Ликвидност, Вземания), накрая какво е СТАНАЛО за периода (Средства).
 */
export function otcheti(
  o: Ogledalo,
  period: Period,
  kogato: string,
  vanshni: VanshniZaKapitala = {},
): Otcheti {
  const kap = kapital(o, vanshni);
  const lik = likvidnost(o);
  const vze = vzemaniya(o);
  const sre = sredstva(o, period, kogato);

  // ВТОРИЯТ ПЪТ · Активи и Задължения, събрани ОТ ЖУРНАЛА наново.
  //
  // Дотук тук пишеше `stoynost + lik.sbor_st + vze.sbor_st` — тоест същите
  // готови сборове, от които е направен и Капиталът, само с разместени скоби.
  // Разликата излизаше нула по АЛГЕБРА, не по проверка: не можеше да хване
  // нищо, а стоеше на екрана като доказана нула. Проверена нула, която не е
  // проверена, е по-лоша от липсваща — тя носи доверие, което не е спечелено.
  //
  // Сега вторият път брои сам, от същите Огледала, но без да минава през
  // полетата: ако `likvidnost` или `vzemaniya` пропусне джоб, забрави знак или
  // преброи нещо два пъти, двата пътя се разминават и разликата светва.
  //
  // Какво ТОЗИ път НЕ хваща, казано на глас: грешка в самото Огледало (ако
  // едно плащане изобщо не е стигнало до `o.plashtaniya`, липсва и в двата
  // пътя). За това пази сверката при партидите — тя гледа файл ↔ Журнал.
  let vlyazlo_st = 0;
  for (const pl of o.plashtaniya.values()) vlyazlo_st += pl.suma_st;
  let izlyazlo_st = 0;
  for (const r of o.razhodi.values()) izlyazlo_st += r.suma_st;
  let vzemaniya_st = 0;
  for (const v of o.vzemaniya.values()) vzemaniya_st += v.ostatak_st;

  const aktivi_st =
    (vanshni.stoynostNaSastoyanie_st ?? 0) +
    saldoNa(o, 'banka') +
    saldoNa(o, 'trezor') +
    vlyazlo_st -
    izlyazlo_st +
    vzemaniya_st;
  const zadalzheniya_st = vanshni.kredititeOstatak_st ?? 0;

  return {
    period,
    poleta: [kap, lik, vze, sre],
    sverka: {
      ot_sastavki_st: kap.sbor_st,
      aktivi_st,
      zadalzheniya_st,
      razlika_st: kap.sbor_st - (aktivi_st - zadalzheniya_st),
    },
  };
}

/** Двете суми за един ден · приход и разход, поотделно. */
export interface DenSPari {
  readonly data: string;
  readonly prihod_st: number;
  readonly razhod_st: number;
}

/**
 * КОЛКО ВЛИЗА И КОЛКО ИЗЛИЗА ВЪВ ВСЕКИ ДЕН НА ЕДИН МЕСЕЦ.
 *
 * Негови думи, от същото изречение като И90: „Както и **всички приходи и
 * разходи са с цифри в полето на календара**."
 *
 * ЧИСЛОТО Е ТУК, МЯСТОТО ГО НЯМА. Календарът идва с Ганта (M07) и днес не
 * съществува нито един негов ред код. Затова функцията стои готова и сверена,
 * а екранът я чака — вместо да се построи полусляп календар само за да има
 * къде да се сложат цифрите.
 *
 * Двете суми НЕ се сливат в едно нето число. Ден с 1 000 приход и 1 000 разход
 * не е празен ден; неттото би го направило такъв.
 *
 * Приходът тук е СЪБРАНОТО (пари, влезли на този ден), не начисленото:
 * календарът е за дни, а начислението няма ден — то има падеж.
 */
export function sumiZaDen(o: Ogledalo, period: Period): readonly DenSPari[] {
  const po = new Map<string, { prihod_st: number; razhod_st: number }>();
  const vzemi = (data: string) => {
    let v = po.get(data);
    if (!v) {
      v = { prihod_st: 0, razhod_st: 0 };
      po.set(data, v);
    }
    return v;
  };

  for (const p of o.plashtaniya.values()) {
    if (p.data.slice(0, 7) !== period) continue;
    vzemi(p.data).prihod_st += p.suma_st;
  }
  for (const r of o.razhodi.values()) {
    if (r.data.slice(0, 7) !== period) continue;
    vzemi(r.data).razhod_st += r.suma_st;
  }

  return [...po.entries()]
    .map(([data, v]) => ({ data, ...v }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * СЪЩОТО, НО ЗА ОБХВАТ ОТ ДНИ · за решетката на Ганта.
 *
 * Решетката покрива месеци напред и назад (петкратният обхват, И-числото на
 * собственика), а `sumiZaDen` реже по ЕДИН календарен месец. Хранена с него,
 * всяка колона извън месеца показваше нула — а нулата на екран за пари
 * изглежда като „няма движение", не като „не е питано" (находка на сверката).
 *
 * Границите са включителни, ISO текст — както говорят колоните на решетката.
 */
export function sumiZaObhvat(o: Ogledalo, ot: string, doo: string): readonly DenSPari[] {
  const po = new Map<string, { prihod_st: number; razhod_st: number }>();
  const vzemi = (data: string) => {
    let v = po.get(data);
    if (!v) {
      v = { prihod_st: 0, razhod_st: 0 };
      po.set(data, v);
    }
    return v;
  };

  for (const p of o.plashtaniya.values()) {
    if (p.data < ot || p.data > doo) continue;
    vzemi(p.data).prihod_st += p.suma_st;
  }
  for (const r of o.razhodi.values()) {
    if (r.data < ot || r.data > doo) continue;
    vzemi(r.data).razhod_st += r.suma_st;
  }

  return [...po.entries()]
    .map(([data, v]) => ({ data, ...v }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Сборът на съставките. Знакът е в самата съставка, не в сбирача. */
function sbor(sastavki: readonly Sastavka[]): number {
  let s = 0;
  for (const c of sastavki) s += c.suma_st;
  return s;
}
