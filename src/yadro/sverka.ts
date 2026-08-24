/**
 * СВЕРКА ВХОД↔ИЗХОД.
 *
 * Правилото над плана: всяко преместване или пренос на данни завършва със сверка,
 * и разликата се записва — ДОРИ КОГАТО Е НУЛА.
 *
 * Това не е украса. Липсата точно на тази сверка скри 24,2% загуба при
 * пресяването на извора (виж docs/04-odit-na-verigata.md).
 */

export interface Sverka {
  /** какво се сверява: 'migratsiya Naemi KESH' | 'iznos kam Sheets' | ... */
  readonly kakvo: string;
  readonly vhod: number;
  readonly izhod: number;
  /** izhod - vhod; отрицателно = загуба */
  readonly razlika: number;
  readonly nared: boolean;
  /** ISO време на сверката */
  readonly kogato: string;
  readonly belezhka?: string;
}

/**
 * В какво се мери една сверка. Стои в `belezhka`, за да не се показват
 * стотинки и бройки с един и същи вид — 120000 и 1 не са едно и също нещо.
 */
export const MERKA = { pari: 'стотинки', broy: 'брой' } as const;

/**
 * ЗАЩО СЕ ЗАПИСВА И НУЛАТА · правило 7, с думи, за екрана.
 *
 * Изречението е ЕДНО и живее при сверката, не при екраните: Сметки и
 * Настройки го казваха поотделно, а те показват РАЗЛИЧНИ таблици — едната
 * изчислени сверки, другата записани. Различните таблици могат да се
 * разминат; правилото зад тях — не.
 *
 * Тук е ТЕКСТ, не HTML: ядрото не знае за екрани и не бива да научава.
 */
export const ZASHTO_I_NULATA =
  'Разликата се записва и когато е нула — иначе „няма разлика" е неразличимо от „не е сверявано".';

export function sverka(
  kakvo: string,
  vhod: number,
  izhod: number,
  kogato: string,
  belezhka?: string,
): Sverka {
  const razlika = izhod - vhod;
  return {
    kakvo,
    vhod,
    izhod,
    razlika,
    nared: razlika === 0,
    kogato,
    ...(belezhka === undefined ? {} : { belezhka }),
  };
}

export class GreshkaSverka extends Error {
  readonly sverka: Sverka;

  constructor(s: Sverka) {
    super(
      `Сверка „${s.kakvo}" не затваря: вход ${s.vhod}, изход ${s.izhod}, разлика ${s.razlika}`,
    );
    this.name = 'GreshkaSverka';
    this.sverka = s;
  }
}

/**
 * Дневник на сверките. Пази ВСЯКА сверка, включително нулевите —
 * иначе „няма записана разлика" е неразличимо от „не е сверявано".
 */
export class DnevnikNaSverki {
  readonly #redove: Sverka[] = [];

  zapishi(s: Sverka): Sverka {
    this.#redove.push(Object.freeze(s));
    return s;
  }

  /** Записва и хвърля, ако не затваря. Ползва се в края на всяка партида. */
  zapishiIliPadni(s: Sverka): Sverka {
    this.zapishi(s);
    if (!s.nared) throw new GreshkaSverka(s);
    return s;
  }

  get vsichki(): readonly Sverka[] {
    return this.#redove;
  }

  get nezatvoreni(): readonly Sverka[] {
    return this.#redove.filter((s) => !s.nared);
  }
}
