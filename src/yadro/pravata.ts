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

  constructor(nastavka: string, svedi: (imeyl: string) => string) {
    this.#nastavka = nastavka;
    this.#svedi = svedi;
  }

  #negovoLiE(actor: string, naematel: string): boolean {
    if (!naematel.endsWith(this.#nastavka)) return true; // служебен — както досега
    return naematel === `${this.#svedi(actor)}${this.#nastavka}`;
  }

  async mozheDaPishe(actor: string, naematel: string): Promise<boolean> {
    return this.#negovoLiE(actor, naematel);
  }

  async mozheDaIznasya(actor: string, naematel: string): Promise<boolean> {
    return this.#negovoLiE(actor, naematel);
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
