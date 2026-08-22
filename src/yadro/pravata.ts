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
