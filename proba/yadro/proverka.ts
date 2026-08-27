/**
 * БРОЯЧЪТ · СЪЩАТА семантика като преди пренаписването.
 *
 * Сравнението е низово нарочно (`String(x) === String(y)`) — „всяко очакване
 * е низ, както го чете човек" (шапката на стария `prohod.mjs`). Не се
 * „модернизира" в assertion библиотека: смяна на семантиката тук би развалила
 * значението на всичките 813 проверки, не само стила им.
 *
 * `razdel` се подава при ВСЯКО извикване, не се пази като поле — така всеки
 * от 44-те блока държи своя `razdel` като локална променлива (точно както
 * оригиналният `let razdel` на модулно ниво), без споделено мутируемо
 * състояние между модулите (правило: нула скрити глобали в пренаписаното).
 */

export interface Nahodka {
  readonly razdel: string;
  readonly kakvo: string;
  readonly vidyano: string;
  readonly ochakvano: string;
}

export class Broyach {
  readonly #minali: string[] = [];
  readonly #nahodki: Nahodka[] = [];
  #posledenRazdel = '—';

  proveri(razdel: string, kakvo: string, vidyano: unknown, ochakvano: unknown): boolean {
    this.#posledenRazdel = razdel;
    const naredE = String(vidyano) === String(ochakvano);
    if (naredE) this.#minali.push(`${razdel} · ${kakvo}`);
    else this.#nahodki.push({ razdel, kakvo, vidyano: String(vidyano), ochakvano: String(ochakvano) });
    return naredE;
  }

  /** Ръчно добавена находка · ползва се при спъване на самия проход (не на проверка). */
  dobaviNahodka(n: Nahodka): void {
    this.#nahodki.push(n);
  }

  get minali(): readonly string[] {
    return this.#minali;
  }

  get nahodki(): readonly Nahodka[] {
    return this.#nahodki;
  }

  /** Разделът на ПОСЛЕДНАТА проверка · за отчет при спъване извън `proveri()`. */
  get posledenRazdel(): string {
    return this.#posledenRazdel;
  }
}
