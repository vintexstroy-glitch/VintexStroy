/**
 * ВНАСЯНЕ НА ЖУРНАЛ · връщането на изнесеното.
 *
 * Изнасянето без внасяне е половин застраховка: файлът стои на диска, а няма
 * как да се върне. Тук е другата половина.
 *
 * Формата е същата като при миграцията (`naemi-kesh.ts`): **сверката е ПРЕДИ
 * записа**. Веригата се проверява цяла, съвместимостта се проверява цяла, и
 * едва тогава нещо влиза. При разминаване не влиза НИЩО.
 */

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import type { Dnevnik, Sabitie, Vrata } from '../yadro/index.js';

export class GreshkaVnos extends Error {
  readonly sverki: readonly Sverka[];

  constructor(message: string, sverki: readonly Sverka[] = []) {
    super(message);
    this.name = 'GreshkaVnos';
    this.sverki = sverki;
  }
}

export interface RezultatVnos {
  readonly vneseni: number;
  readonly veche: number;
  readonly vsichko: number;
  readonly posledenHash: string;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

export interface NastroykiVnos {
  readonly vrata: Vrata;
  readonly dnevnik: Dnevnik;
  readonly naematel: string;
  readonly actor: string;
  /** съдържанието на изнесения файл */
  readonly tekst: string;
  readonly kogato: string;
}

const POLETA = ['seq', 'opId', 'ts', 'naematel', 'actor', 'type', 'sashtnost', 'payload', 'prevHash', 'hash'] as const;

/** Чете изнесения файл и отказва всичко, което не прилича на Журнал. */
export function prochetiIznos(tekst: string): Sabitie[] {
  let surovo: unknown;
  try {
    surovo = JSON.parse(tekst);
  } catch {
    throw new GreshkaVnos('Файлът не е JSON. Внеси същия файл, който „Изнеси Журнала" сваля.');
  }
  if (!Array.isArray(surovo)) {
    throw new GreshkaVnos('Файлът не е редица от събития.');
  }
  if (surovo.length === 0) {
    throw new GreshkaVnos('Файлът е празен — няма какво да се върне.');
  }

  return surovo.map((red, i) => {
    if (red === null || typeof red !== 'object' || Array.isArray(red)) {
      throw new GreshkaVnos(`Ред ${i + 1} не е събитие.`);
    }
    for (const pole of POLETA) {
      if (!(pole in (red as object))) {
        throw new GreshkaVnos(`Ред ${i + 1} няма поле „${pole}" — това не е изнесен Журнал.`);
      }
    }
    return red as Sabitie;
  });
}

/**
 * Внася изнесен Журнал. Връща сверките — и при успех, и при отказ през
 * `GreshkaVnos`, за да се вижда какво не е затворило.
 */
export async function vnesiZhurnal(n: NastroykiVnos): Promise<RezultatVnos> {
  const otFayla = prochetiIznos(n.tekst);
  const predi = (await n.dnevnik.chetiVsichki(n.naematel)).length;

  const rezultat = await n.vrata.vazstanovi(n.naematel, n.actor, otFayla);

  const sled = await n.dnevnik.chetiVsichki(n.naematel);
  const posledno = sled[sled.length - 1];

  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka('Внасяне · брой събития във файла ↔ в Журнала', otFayla.length, sled.length, n.kogato, MERKA.broy),
  );
  dnevnik.zapishi(
    sverka(
      'Внасяне · нови ↔ прираст на Журнала',
      rezultat.vneseni,
      sled.length - predi,
      n.kogato,
      MERKA.broy,
    ),
  );

  // Последният hash е котвата: съвпадне ли, върнатото е същото, а не подобно.
  const posledenSavpada = posledno?.hash === rezultat.posledenHash;
  dnevnik.zapishi(
    sverka('Внасяне · последен hash съвпада', 1, posledenSavpada ? 1 : 0, n.kogato, MERKA.broy),
  );

  const nezatvoreni = dnevnik.nezatvoreni;
  if (nezatvoreni.length > 0) {
    throw new GreshkaVnos(
      `Внасянето не затваря (${nezatvoreni.length} ${
        nezatvoreni.length === 1 ? 'разлика' : 'разлики'
      }).`,
      dnevnik.vsichki,
    );
  }

  return {
    vneseni: rezultat.vneseni,
    veche: rezultat.veche,
    vsichko: sled.length,
    posledenHash: rezultat.posledenHash,
    sverki: dnevnik.vsichki,
    nared: true,
  };
}
