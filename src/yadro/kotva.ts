/**
 * КОТВАТА · последното звено, записано ИЗВЪН Журнала.
 *
 * Проверката на веригата хваща подменено или разместено звено, но има едно
 * сляпо петно: СКЪСЯВАНЕ ОТЗАД. Махнеш ли последните N събития, остатъкът е
 * безупречна, само че по-къса верига — и проверката казва „цяла".
 *
 * Котвата затваря точно това петно: след всеки запис `{seq, hash}` отива на
 * отделно място (localStorage). При тръгване Журналът се мери срещу котвата:
 * по-къс Журнал или друг хеш на котвения seq = дръпнат кран + думи.
 *
 * Котвата е БЕЛЕГ НА ТОЗИ БРАУЗЪР, не втора истина. Загубата ѝ (нов браузър,
 * чистене на данни) не е инцидент — тя просто се захваща наново. Истината
 * за другите машини е износът с неговия последен хеш.
 */

export interface Kotva {
  readonly seq: number;
  readonly hash: string;
  /** ISO — кога е забита */
  readonly kogato: string;
}

/** Портът: къде живее котвата. Реализацията по подразбиране е localStorage. */
export interface DrajkaNaKotva {
  cheti(naematel: string): Kotva | null;
  zabij(naematel: string, kotva: Kotva): void;
}

export class KotvaVLocalStorage implements DrajkaNaKotva {
  readonly #predstavka: string;

  constructor(predstavka = 'masterbook:kotva') {
    this.#predstavka = predstavka;
  }

  cheti(naematel: string): Kotva | null {
    try {
      const surovo = localStorage.getItem(`${this.#predstavka}:${naematel}`);
      if (!surovo) return null;
      const k = JSON.parse(surovo) as Kotva;
      return Number.isSafeInteger(k.seq) && typeof k.hash === 'string' ? k : null;
    } catch {
      // Частен прозорец или забранени данни — котва просто няма.
      return null;
    }
  }

  zabij(naematel: string, kotva: Kotva): void {
    try {
      localStorage.setItem(`${this.#predstavka}:${naematel}`, JSON.stringify(kotva));
    } catch {
      // Няма къде — записът в Журнала пак е станал; котвата е допълнителна мярка.
    }
  }
}

/** За тестове и за среди без localStorage. */
export class KotvaVPametta implements DrajkaNaKotva {
  readonly #po = new Map<string, Kotva>();

  cheti(naematel: string): Kotva | null {
    return this.#po.get(naematel) ?? null;
  }

  zabij(naematel: string, kotva: Kotva): void {
    this.#po.set(naematel, kotva);
  }
}

export interface ProverkaNaKotva {
  readonly nared: boolean;
  /** празно при наред; иначе — с думи какво не съвпада */
  readonly prichina: string;
  readonly kotva: Kotva | null;
}

/**
 * Мери Журнала срещу котвата. `hashNaSeq` дава хеша на дадено звено
 * (или undefined, ако звеното липсва).
 */
export function proveriKotvata(
  kotva: Kotva | null,
  posledenSeq: number,
  hashNaSeq: (seq: number) => string | undefined,
): ProverkaNaKotva {
  if (!kotva) return { nared: true, prichina: '', kotva: null };

  if (posledenSeq < kotva.seq) {
    return {
      nared: false,
      prichina:
        `Журналът стига до seq ${posledenSeq}, а котвата помни seq ${kotva.seq} ` +
        `от ${kotva.kogato.slice(0, 10)}. Липсват ${kotva.seq - posledenSeq} ` +
        `${kotva.seq - posledenSeq === 1 ? 'събитие' : 'събития'} — Журналът е скъсяван отзад.`,
      kotva,
    };
  }

  const hash = hashNaSeq(kotva.seq);
  if (hash !== kotva.hash) {
    return {
      nared: false,
      prichina:
        `Звеното seq ${kotva.seq} носи друг хеш от този, който котвата помни. ` +
        'Историята до котвата е пренаписана.',
      kotva,
    };
  }

  return { nared: true, prichina: '', kotva };
}
