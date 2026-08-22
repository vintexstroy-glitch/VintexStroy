/**
 * ЖУРНАЛЪТ — единствената истина. Само добавяне, никога презапис.
 *
 * Това е ПОРТ: интерфейсът е един и същ за трите носителя.
 * Тук е реализацията в паметта (за тестове и за първия резен).
 * Следват адаптери: IndexedDB (В), Postgres (Б), Sheets (А).
 */

import type { Sabitie, Sashtnost } from './sabitie.js';
import { klyuchNaSashtnost } from './sabitie.js';

export interface Dnevnik {
  /** Последното събитие на наемателя — дава prevHash и следващия seq. */
  posledno(naematel: string): Promise<Sabitie | undefined>;

  /** Търси по opId — основата на идемпотентността. */
  poOpId(naematel: string, opId: string): Promise<Sabitie | undefined>;

  /** seq на последното събитие за същността; 0, ако още няма такова. */
  tekushtRev(naematel: string, sashtnost: Sashtnost): Promise<number>;

  /** Добавя. Реализацията НЕ трябва да позволява презапис. */
  dobavi(s: Sabitie): Promise<void>;

  /** Всички събития на наемателя, подредени по seq. */
  chetiVsichki(naematel: string): Promise<Sabitie[]>;

  /** Събитията за една същност, подредени по seq — входът на Огледалото. */
  chetiZaSashtnost(naematel: string, sashtnost: Sashtnost): Promise<Sabitie[]>;
}

export class GreshkaDnevnik extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaDnevnik';
  }
}

/** Реализация в паметта. Изолацията на наемател е на ниво данни. */
export class DnevnikVPametta implements Dnevnik {
  readonly #poNaematel = new Map<string, Sabitie[]>();
  readonly #poOpId = new Map<string, Sabitie>();

  async posledno(naematel: string): Promise<Sabitie | undefined> {
    const redica = this.#poNaematel.get(naematel);
    return redica?.[redica.length - 1];
  }

  async poOpId(naematel: string, opId: string): Promise<Sabitie | undefined> {
    return this.#poOpId.get(`${naematel} ${opId}`);
  }

  async tekushtRev(naematel: string, sashtnost: Sashtnost): Promise<number> {
    const klyuch = klyuchNaSashtnost(sashtnost);
    const redica = this.#poNaematel.get(naematel) ?? [];
    for (let i = redica.length - 1; i >= 0; i -= 1) {
      const s = redica[i]!;
      if (klyuchNaSashtnost(s.sashtnost) === klyuch) return s.seq;
    }
    return 0;
  }

  async dobavi(s: Sabitie): Promise<void> {
    const redica = this.#poNaematel.get(s.naematel) ?? [];
    const ochakvanSeq = redica.length + 1;
    if (s.seq !== ochakvanSeq) {
      throw new GreshkaDnevnik(
        `Журналът е само за добавяне: очакван seq ${ochakvanSeq}, получен ${s.seq}`,
      );
    }
    const klyuchOp = `${s.naematel} ${s.opId}`;
    if (this.#poOpId.has(klyuchOp)) {
      throw new GreshkaDnevnik(`opId вече съществува: ${s.opId}`);
    }
    redica.push(Object.freeze(s));
    this.#poNaematel.set(s.naematel, redica);
    this.#poOpId.set(klyuchOp, s);
  }

  async chetiVsichki(naematel: string): Promise<Sabitie[]> {
    return [...(this.#poNaematel.get(naematel) ?? [])];
  }

  async chetiZaSashtnost(naematel: string, sashtnost: Sashtnost): Promise<Sabitie[]> {
    const klyuch = klyuchNaSashtnost(sashtnost);
    const redica = this.#poNaematel.get(naematel) ?? [];
    return redica.filter((s) => klyuchNaSashtnost(s.sashtnost) === klyuch);
  }

  /** Само за тестове: колко наематели са пипани. */
  get naemateli(): string[] {
    return [...this.#poNaematel.keys()];
  }
}
