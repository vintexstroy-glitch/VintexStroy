/**
 * ПРАВАТА — кой какво вижда и пипа.
 *
 * ⚠ П3 от Плана за изпълнение още чака дума за самоличността
 * („имейл без парола" не е думата на собственика). Затова тук стои
 * само портът и две тривиални реализации — истинската политика идва после.
 */

import type { Sashtnost } from './sabitie.js';

export interface Pravata {
  mozheDaPishe(actor: string, naematel: string, sashtnost: Sashtnost): Promise<boolean>;
  /**
   * Свалянето на Журнала и на архива е ПРАВО, не даденост — думата на
   * собственика: „от хората с разрешение до бутона". Политиката кой е в
   * списъка идва със самоличността (П3); портът стои отсега, за да не се
   * появи втори бутон без питане.
   */
  mozheDaIznasya(actor: string, naematel: string): Promise<boolean>;
}

/** Първи резен: един собственик, всичко негово. */
export class VsichkoRazresheno implements Pravata {
  async mozheDaPishe(): Promise<boolean> {
    return true;
  }

  async mozheDaIznasya(): Promise<boolean> {
    return true;
  }
}

/**
 * ЛИЧНОТО Е САМО ТВОЕ (И98) · първата НЕ-тривиална реализация на порта.
 *
 * Служебен Журнал: всичко минава (политиката там чака П3, както досега).
 * ЛИЧЕН Журнал (ключ, завършващ на наставката): пише и изнася САМО човекът,
 * чийто имейл стои пред наставката.
 *
 * Защо тук, а не на екрана: „никога не се смесват" би било гарантирано САМО
 * от подредбата на екраните — тоест надпис. Правило 14 („сигурността е при
 * доставчика") не помага: границата е между два Журнала на ЕДИН човек и
 * доставчикът не я вижда. Значи я пази Вратата или никой.
 *
 * Наставката идва отвън, за да не чете ядрото домейна (същият ред на
 * зависимостите като при `imaZhurnalOtAlfa`).
 */
export class LichnoESamoTvoe implements Pravata {
  readonly #nastavka: string;
  readonly #svedi: (imeyl: string) => string;
  readonly #vizhdat: (naematel: string) => ReadonlySet<string>;
  readonly #pishat: (naematel: string) => ReadonlySet<string>;

  /**
   * Допуснатите идват ОТВЪН · ядрото не чете домейна (И99).
   *
   * Кой е допуснат до един личен Журнал живее в самия него като събития
   * (`ЛиченДостъпЗаписан`). Да ги чете Вратата би значело ядрото да сгъва
   * Огледало — и да пита за право, за да прочете правото. Затова
   * приложението подава ЧЕТЕЦ и го обновява при всяко прерисуване; същият
   * ред на зависимостите като при `imaZhurnalOtAlfa`.
   *
   * ДВА ЧЕТЕЦА, не един. Вратата пита два различни въпроса — „може ли да
   * пише" и „може ли да изнася" — и наблюдателят отговаря различно на тях:
   * вижда таба, не мени сроковете. Един общ списък би направил всеки допуснат
   * писач МЪЛЧАЛИВО, а точно мълчаливото право е онова, което никой не
   * забелязва, докато не стане.
   *
   * Празните четци по подразбиране значат „никой освен собственика" — най-
   * тясното допускане, ако някой забрави да ги подаде.
   */
  constructor(
    nastavka: string,
    svedi: (imeyl: string) => string,
    vizhdat: (naematel: string) => ReadonlySet<string> = () => new Set(),
    pishat: (naematel: string) => ReadonlySet<string> = () => new Set(),
  ) {
    this.#nastavka = nastavka;
    this.#svedi = svedi;
    this.#vizhdat = vizhdat;
    this.#pishat = pishat;
  }

  #negovoLiE(
    actor: string,
    naematel: string,
    koito: (naematel: string) => ReadonlySet<string>,
  ): boolean {
    if (!naematel.endsWith(this.#nastavka)) return true; // служебен — както досега
    const sveden = this.#svedi(actor);
    if (naematel === `${sveden}${this.#nastavka}`) return true; // собственикът
    // …или онзи, на когото собственикът е дал ТОВА право — обратната посока (И99).
    return koito(naematel).has(sveden);
  }

  async mozheDaPishe(actor: string, naematel: string): Promise<boolean> {
    return this.#negovoLiE(actor, naematel, this.#pishat);
  }

  async mozheDaIznasya(actor: string, naematel: string): Promise<boolean> {
    return this.#negovoLiE(actor, naematel, this.#vizhdat);
  }
}

/**
 * ПО СВОЯТА ВЕРИГА (ADR-055) · всеки пише в СВОЯТА и в ничия друга.
 *
 * ОБВИВКА, не втора политика. `LichnoESamoTvoe` пази границата между личния и
 * служебния Журнал на един човек; тази пази границата между писачите в ЕДНА
 * книга. Двете са различни въпроси и преписването на едната в другата би
 * оставило два дома на едно правило (правило 17). Затова тук се пита ПЪРВО за
 * веригата, и чак ако тя не възразява, се пита обвитата.
 *
 * ТРИ СЛУЧАЯ, и третият е този, който досега липсваше:
 *
 *   1. Веригата носи наставката на писач → пише САМО той. Чужд писач се отказва
 *      дори да е стопанинът: стопанинът има СВОЯ верига и няма нужда от
 *      чуждата, а „собственикът може всичко" тук значи собственикът да добави
 *      събитие в чужд подпис.
 *   2. Веригата-нула на книга с ИЗВЕСТЕН стопанин → пише само стопанинът.
 *      Дотук всеки, отворил книгата, пишеше в нея — а служителят вече отваря
 *      ЧУЖДА книга (ADR-054), тоест дупката имаше път до нея.
 *   3. Книга без известен стопанин (нова, празна) → минава. Първото събитие
 *      ражда стопанина (ADR-043) и трите правила при Вратата решават дали
 *      това е законно; тук няма какво да се пази.
 *
 * ЧЕТЕЦЪТ ИДВА ОТВЪН — стопанинът се извежда от Огледалото на книгата, а
 * ядрото не сгъва Огледала. Същият ред на зависимостите като при
 * `imaZhurnalOtAlfa` и при допуснатите до личния.
 *
 * ИЗНОСЪТ НЕ СЕ СТЯГА тук. Четенето на цялата книга е смисълът на сгънатото
 * Огледало; ограничава го колонното право (правило 23), не веригата.
 */
export class PoSvoyataVeriga implements Pravata {
  readonly #vatre: Pravata;
  readonly #pisachat: (naematel: string) => string | undefined;
  readonly #knigata: (naematel: string) => string;
  readonly #stopaninat: (kniga: string) => string | undefined;
  readonly #svedi: (imeyl: string) => string;

  constructor(
    vatre: Pravata,
    pisachat: (naematel: string) => string | undefined,
    knigata: (naematel: string) => string,
    stopaninat: (kniga: string) => string | undefined,
    svedi: (imeyl: string) => string,
  ) {
    this.#vatre = vatre;
    this.#pisachat = pisachat;
    this.#knigata = knigata;
    this.#stopaninat = stopaninat;
    this.#svedi = svedi;
  }

  async mozheDaPishe(actor: string, naematel: string, sashtnost: Sashtnost): Promise<boolean> {
    const az = this.#svedi(actor);
    const pisach = this.#pisachat(naematel);
    if (pisach !== undefined) {
      if (this.#svedi(pisach) !== az) return false;
    } else {
      const stopanin = this.#stopaninat(this.#knigata(naematel));
      if (stopanin !== undefined && this.#svedi(stopanin) !== az) return false;
    }
    return this.#vatre.mozheDaPishe(actor, naematel, sashtnost);
  }

  async mozheDaIznasya(actor: string, naematel: string): Promise<boolean> {
    return this.#vatre.mozheDaIznasya(actor, naematel);
  }
}

/** Изрична карта actor → наематели. Ползва се в тестовете за изолация. */
export class PoSpisak implements Pravata {
  readonly #karta: ReadonlyMap<string, ReadonlySet<string>>;

  constructor(karta: Readonly<Record<string, readonly string[]>>) {
    this.#karta = new Map(
      Object.entries(karta).map(([actor, naemateli]) => [actor, new Set(naemateli)]),
    );
  }

  async mozheDaPishe(actor: string, naematel: string): Promise<boolean> {
    return this.#karta.get(actor)?.has(naematel) ?? false;
  }

  async mozheDaIznasya(actor: string, naematel: string): Promise<boolean> {
    return this.#karta.get(actor)?.has(naematel) ?? false;
  }
}
