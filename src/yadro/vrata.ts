/**
 * ВРАТАТА — ЕДИНСТВЕНИЯТ вход за запис.
 *
 * Договор (System design §3.2):
 *   1. провери ПРАВО
 *   2. провери ВАЛИДНОСТ
 *   3. дедупликация по opId  → идемпотентно
 *   4. rev-предпазител       → REPLAY при разминаване
 *   5. append (seq, prevHash, hash)
 *   6. върни { seq, hash }
 *
 * Единичен писач на наемател: стъпки 4–5 се сериализират, иначе се къса веригата.
 */

import type { Dnevnik } from './dnevnik.js';
import { izchisliHash, sha256Node, type Sha256 } from './hash.js';
import { eStotinki } from './pari.js';
import type { Pravata } from './pravata.js';
import type { Operatsiya, Sabitie } from './sabitie.js';

export type KodGreshka = 'SPRYAN' | 'BEZ_PRAVO' | 'NEVALIDNO' | 'REPLAY';

export class GreshkaVrata extends Error {
  readonly kod: KodGreshka;

  constructor(kod: KodGreshka, message: string) {
    super(message);
    this.name = 'GreshkaVrata';
    this.kod = kod;
  }
}

/** Отказ поради rev-предпазителя. Носи актуалния seq, за да няма фалшив STALE. */
export class GreshkaReplay extends GreshkaVrata {
  readonly tekushtRev: number;
  readonly ochakvanRev: number;

  constructor(tekushtRev: number, ochakvanRev: number) {
    super('REPLAY', `Същността е на rev ${tekushtRev}, а операцията очаква ${ochakvanRev}`);
    this.name = 'GreshkaReplay';
    this.tekushtRev = tekushtRev;
    this.ochakvanRev = ochakvanRev;
  }
}

export interface Rezultat {
  readonly seq: number;
  readonly hash: string;
  /** true, когато opId вече е бил приет — върнат е същият резултат, нов запис няма */
  readonly povtoreno: boolean;
}

export interface NastroykiVrata {
  readonly dnevnik: Dnevnik;
  readonly pravata: Pravata;
  readonly sha?: Sha256;
}

export class Vrata {
  readonly #dnevnik: Dnevnik;
  readonly #pravata: Pravata;
  readonly #sha: Sha256;

  /** Спирателен кран (П1.4): спира записа, без да събаря приложението. */
  #zatvorena = false;
  #prichinaZaZatvaryane = '';

  /** Единичен писач на наемател — опашка от обещания. */
  readonly #opashki = new Map<string, Promise<unknown>>();

  constructor(n: NastroykiVrata) {
    this.#dnevnik = n.dnevnik;
    this.#pravata = n.pravata;
    this.#sha = n.sha ?? sha256Node;
  }

  get zatvorena(): boolean {
    return this.#zatvorena;
  }

  get prichinaZaZatvaryane(): string {
    return this.#prichinaZaZatvaryane;
  }

  /** Дръпва спирателния кран. Четенето продължава да работи. */
  zatvori(prichina: string): void {
    this.#zatvorena = true;
    this.#prichinaZaZatvaryane = prichina;
  }

  otvori(): void {
    this.#zatvorena = false;
    this.#prichinaZaZatvaryane = '';
  }

  async dobavi(op: Operatsiya): Promise<Rezultat> {
    if (this.#zatvorena) {
      throw new GreshkaVrata(
        'SPRYAN',
        `Вратата е спряна: ${this.#prichinaZaZatvaryane || 'без посочена причина'}`,
      );
    }

    proveriValidnost(op);

    if (!(await this.#pravata.mozheDaPishe(op.actor, op.naematel, op.sashtnost))) {
      throw new GreshkaVrata(
        'BEZ_PRAVO',
        `${op.actor} няма право да пише при наемател ${op.naematel}`,
      );
    }

    return this.#naOpashka(op.naematel, () => this.#zapishi(op));
  }

  /** Сериализира записите за един наемател — пази seq и веригата. */
  async #naOpashka<T>(naematel: string, rabota: () => Promise<T>): Promise<T> {
    const predisha = this.#opashki.get(naematel) ?? Promise.resolve();
    const sled = predisha.then(rabota, rabota);
    // Опашката не бива да пази отказите — иначе следващият запис пада с чужда грешка.
    this.#opashki.set(
      naematel,
      sled.then(
        () => undefined,
        () => undefined,
      ),
    );
    return sled;
  }

  async #zapishi(op: Operatsiya): Promise<Rezultat> {
    // 3 · дедупликация по opId
    const veche = await this.#dnevnik.poOpId(op.naematel, op.opId);
    if (veche) {
      return { seq: veche.seq, hash: veche.hash, povtoreno: true };
    }

    // 4 · rev-предпазител
    if (op.expectedRev !== undefined) {
      const tekusht = await this.#dnevnik.tekushtRev(op.naematel, op.sashtnost);
      if (tekusht !== op.expectedRev) {
        throw new GreshkaReplay(tekusht, op.expectedRev);
      }
    }

    // 5 · append
    const posledno = await this.#dnevnik.posledno(op.naematel);
    const zaHeshirane = {
      seq: (posledno?.seq ?? 0) + 1,
      opId: op.opId,
      ts: op.ts,
      naematel: op.naematel,
      actor: op.actor,
      type: op.type,
      sashtnost: op.sashtnost,
      payload: op.payload,
      prevHash: posledno?.hash ?? '',
    };
    const hash = await izchisliHash(zaHeshirane, this.#sha);
    const sabitie: Sabitie = { ...zaHeshirane, hash };
    await this.#dnevnik.dobavi(sabitie);

    // 6 · върни
    return { seq: sabitie.seq, hash, povtoreno: false };
  }
}

/** Полетата за пари завършват на `_st` и са ЦЕЛИ СТОТИНКИ. */
export const NASTAVKA_PARI = '_st';

export function proveriValidnost(op: Operatsiya): void {
  neprazen(op.opId, 'opId');
  neprazen(op.naematel, 'naematel');
  neprazen(op.actor, 'actor');
  neprazen(op.type, 'type');
  neprazen(op.sashtnost?.vid, 'sashtnost.vid');
  neprazen(op.sashtnost?.id, 'sashtnost.id');

  if (typeof op.ts !== 'string' || Number.isNaN(Date.parse(op.ts))) {
    throw new GreshkaVrata('NEVALIDNO', `ts не е валидно време: ${String(op.ts)}`);
  }

  if (op.payload === null || typeof op.payload !== 'object' || Array.isArray(op.payload)) {
    throw new GreshkaVrata('NEVALIDNO', 'payload трябва да е обект');
  }

  if (op.expectedRev !== undefined && !Number.isSafeInteger(op.expectedRev)) {
    throw new GreshkaVrata('NEVALIDNO', `expectedRev трябва да е цяло число: ${op.expectedRev}`);
  }

  proveriParite(op.payload, 'payload');
}

function proveriParite(v: Readonly<Record<string, unknown>>, pat: string): void {
  for (const [klyuch, stoynost] of Object.entries(v)) {
    const pale = `${pat}.${klyuch}`;
    if (klyuch.endsWith(NASTAVKA_PARI)) {
      if (!eStotinki(stoynost)) {
        throw new GreshkaVrata(
          'NEVALIDNO',
          `${pale} е поле за пари и трябва да е цели стотинки; получено: ${String(stoynost)}`,
        );
      }
    } else if (stoynost !== null && typeof stoynost === 'object' && !Array.isArray(stoynost)) {
      proveriParite(stoynost as Record<string, unknown>, pale);
    }
  }
}

function neprazen(v: unknown, ime: string): void {
  if (typeof v !== 'string' || v.length === 0) {
    throw new GreshkaVrata('NEVALIDNO', `${ime} е задължително и не може да е празно`);
  }
}
