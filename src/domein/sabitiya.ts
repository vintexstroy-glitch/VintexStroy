/**
 * Събитията на резен 1 · имот → наем → вземане → плащане.
 *
 * Журналът пази СЪБИТИЯ за парите и договорите — там историята е закон
 * (ADR-001, находка 3). Обикновени редакции не стават събития.
 *
 * Всяко поле за пари завършва на `_st` и е цели стотинки — Вратата го проверява.
 */

import type { Sashtnost } from '../yadro/index.js';
import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { Buton } from './butoni.js';
import type { PravaZaModel } from './kolonno.js';
import type { Rolya } from '../yadro/samolichnost.js';

export const VID = {
  imot: 'imot',
  naem: 'naem',
  vzemane: 'vzemane',
  plashtane: 'plashtane',
  razhod: 'razhod',
  spravka: 'spravka',
  model: 'model',
  buton: 'buton',
  sverka: 'sverka',
  sluzhitel: 'sluzhitel',
  pravo: 'pravo',
} as const;

export type Vid = (typeof VID)[keyof typeof VID];

export type TipSabitie =
  | 'ИмотДобавен'
  | 'НаемДобавен'
  | 'НаемПрекратен'
  | 'ВземанеНачислено'
  | 'ПлащанеПрието'
  | 'РазходЗаписан'
  | 'СправкаПодадена'
  | 'ДДСПлатено'
  | 'ИмотПоправен'
  | 'НаемПоправен'
  | 'МоделЗаписан'
  | 'БутонЗаписан'
  | 'СверкаЗаписана'
  | 'СлужителЗаписан'
  | 'ПравоЗаписано'
  | 'Сторно';

export interface PayloadImotDobaven {
  readonly adres: string;
  readonly edinitsa: string;
  /** площ в цели квадратни сантиметри — пак без float */
  readonly ploshtad_kvsm: number;
}

export interface PayloadNaemDobaven {
  readonly imotId: string;
  readonly naemetel: string;
  readonly naem_st: number;
  /** ден от месеца, на който пада наемът */
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  /**
   * Ключ на акумулатор от `dds.ts` — определя ставката, с която ДДС-то се
   * ИЗВАЖДА от наема. Наемът си остава обща цена; тук се пази само откъде е.
   */
  readonly sektor: string;
}

/**
 * ПОПРАВКА НА ОПИСАНИЕТО — ново събитие, същият `id`.
 *
 * Сгрешен адрес не се сторнира: сторното на имота би оставило наемите му
 * да висят на нищо. Затова поправката е отделно събитие, което носи новите
 * стойности НАЦЯЛО и се налага върху старите при сглобяването на Огледалото.
 */
export interface PayloadImotPopraven {
  readonly imotId: string;
  readonly adres: string;
  readonly edinitsa: string;
  readonly ploshtad_kvsm: number;
  readonly prichina: string;
}

/**
 * Същото за наема. Смяната на `naem_st` важи за БЪДЕЩИТЕ начисления —
 * вече начислените вземания са отделни събития и не се пипат оттук.
 */
export interface PayloadNaemPopraven {
  readonly naemId: string;
  readonly naemetel: string;
  readonly naem_st: number;
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  readonly sektor: string;
  readonly prichina: string;
}

export interface PayloadNaemPrekraten {
  readonly naemId: string;
  readonly kraj: string;
  readonly prichina: string;
}

export interface PayloadVzemaneNachisleno {
  readonly naemId: string;
  /** период във вида '2026-08' */
  readonly period: string;
  readonly osnovanie: string;
  readonly suma_st: number;
  readonly padezh: string;
}

export interface PayloadPlashtanePrieto {
  readonly vzemaneId: string;
  readonly suma_st: number;
  readonly nachin: 'банка' | 'в брой';
  readonly data: string;
}

/**
 * РАЗХОД · другата страна на ДДС-то.
 *
 * `suma_st` е пак ОБЩА ЦЕНА С ДДС — правилото на собственика не се мени
 * заради посоката. Секторът определя ставката, с която ДДС-то се ИЗВАЖДА;
 * заплатите и кредитите падат в акумулатори със ставка нула.
 */
export interface PayloadRazhodZapisan {
  /** ключ на поток: 'zaplati' | 'krediti' | 'fakturi' */
  readonly potok: string;
  readonly dostavchik: string;
  readonly opis: string;
  readonly suma_st: number;
  /** ключ на акумулатор от `dds.ts` */
  readonly sektor: string;
  readonly nachin: 'банка' | 'в брой';
  readonly data: string;
  /** номер на фактура или документ; празно, ако няма */
  readonly dokument: string;
  /**
   * СТАВКАТА НА РЕДА, цял процент (0 · 9 · 20).
   *
   * Негови думи: „ДДС е избор при въвеждане на всяка фактура и при четене на
   * таблици." Затова ставката стои ТУК, при реда, а не се вади от сектора при
   * показване. Липсва ли — важи подсказката на сектора, както беше преди
   * резен 12, и старите записи не се менят с обратна сила.
   */
  readonly stavka?: number;
  /**
   * СЛЕДАТА от източника. Празни за ръчно въведен разход.
   * `klyuch` е стабилният ключ, по който препрочитането на същата таблица
   * разпознава своя ред; `izvor` казва кой файл и коя негова версия го донесе.
   */
  readonly klyuch?: string;
  readonly izvor?: string;
}

/**
 * СПРАВКАТА ЗА ДДС · ключалката на периода.
 *
 * Думата на собственика: „няма да може да се редактира, ако има такава
 * справка". Подадена справка ЗАКЛЮЧВА месеца: вземания, плащания и разходи
 * с дата вътре не влизат през формите. Отключване = СТОРНО на справката —
 * и то остава в Журнала като следа. Единствената поправка на заключен месец
 * е „сверената промяна" от таблица (актуализацията), която сама си носи
 * сторно + ново + бележка кой файл я е донесъл.
 *
 * `dds_deklarirano_st` е каквото РЕАЛНО е декларирано пред НАП — въвежда се
 * на ръка и нарочно не се преизчислява: разликата с изчисленото в Сметки
 * трябва да СВЕТИ, не да се замазва.
 */
export interface PayloadSpravkaPodadena {
  /** период във вида '2026-08' */
  readonly period: string;
  readonly dds_deklarirano_st: number;
  /** датата на подаване */
  readonly data: string;
  readonly belezhka: string;
}

/** Внесеното ДДС — на ръка, от платежното. Може на части. */
export interface PayloadDDSPlateno {
  readonly period: string;
  readonly suma_st: number;
  readonly data: string;
  readonly nachin: 'банка' | 'в брой';
}

/**
 * МОДЕЛЪТ НА ТАБЛИЦА · картата на хедъра, записана в Журнала.
 *
 * Защо е СЪБИТИЕ, а не настройка: моделът решава как се четат пари. Сменѝ го
 * тихо, и старите четения стават необясними — числата остават, а обяснението
 * им се губи. Като събитие се сверява, сторнира се и се вижда кой го е сменил.
 *
 * Същността е `MODEL:<име>`: поправка на картата е НОВО събитие върху същата
 * същност, не втори модел. Огледалото налага последното върху предишните —
 * точно като при `ИмотПоправен`.
 */
export type PayloadModelZapisan = ModelNaTablitsa;

/**
 * БУТОНЪТ · моделът на ПЪТЯ, записан в Журнала.
 *
 * Същата причина като при модела: бутонът решава кой файл къде отива. Смени ли
 * се тихо, старите сверки стават необясними. Същността е `BUTON:<име>` —
 * поправка е НОВО събитие върху същата същност, не втори бутон.
 */
export type PayloadButonZapisan = Buton;

/**
 * СВЕРКАТА · вход ↔ изход ↔ разлика, записана ЗАВИНАГИ.
 *
 * Негови думи: „Ако има разлика, се регистрира промяната на данните в Журнала."
 *
 * Дотук сверките живееха само в паметта на екрана и умираха с презареждането:
 * човек виждаше „затваря", но утре нямаше как да докаже, че е гледал. Оттук
 * всяка сверка на бутон има ред в Журнала — И КОГАТО РАЗЛИКАТА Е НУЛА
 * (правило 7). Проверената нула е различна от нулата, за която никой не е питал.
 */
export interface PayloadSverkaZapisana {
  /** името на бутона, който я е поръчал */
  readonly buton: string;
  readonly period: string;
  readonly vhod_st: number;
  readonly izhod_st: number;
  readonly razlika_st: number;
  /** отпечатъците на прочетените файлове — по един на файл */
  readonly izvori: readonly string[];
  /** какво не се е разчело — броят се, не се преглъщат */
  readonly propusnati: number;
}

/**
 * СЛУЖИТЕЛЯТ · имейл, име и роля — записани, не поканени.
 *
 * Негови думи (23.08): „Аз съм дал на редактор от драйва, за да може все пак да
 * е отворена вратата за проба дали филтърът работи."
 *
 * Значи достъпът е даден при ДОСТАВЧИКА (правило 14). Тук се записва само
 * онова, което приложението знае: кой е пуснат и с каква роля работи вътре.
 * Затова събитието се казва „Записан", а не „Поканен" — покана не изпращаме.
 *
 * Същността е `SLUZHITEL:<имейл>`: смяна на ролята е НОВО събитие върху същия
 * човек, не втори човек. Негови думи защо: „вече създал един път история с
 * това име, акаунт, имейл — можеш да го изтриеш, но историята в Журнала и
 * навсякъде седи."
 */
export interface PayloadSluzhitelZapisan {
  readonly imeyl: string;
  readonly ime: string;
  readonly rolya: Rolya;
}

/**
 * ПРАВОТО ПО КОЛОНА · кои колони са СКРИТИ за един служител в един хедър.
 *
 * Негови думи: „За всеки служител с дадена му вече роля и достъп, може с тази
 * функция не да редактира, а да скрива само."
 *
 * Защо е СЪБИТИЕ: „защо това число не се вижда в екрана на Бамстера" трябва да
 * има отговор в Журнала, не в нечия памет. Скриването не мени нито един сбор —
 * затова НЕ иска отключен период, точно както моделът и бутонът.
 */
export type PayloadPravoZapisano = PravaZaModel;

export interface PayloadStorno {
  /** seq на събитието, което се погасява */
  readonly pogasyavaSeq: number;
  readonly prichina: string;
}

export function sashtnost(vid: Vid, id: string): Sashtnost {
  return { vid, id };
}
