/**
 * МЕСЕЧНОТО НАЧИСЛЯВАНЕ — една партида, значи една сверка.
 *
 * Веднъж месечно всеки жив наем поражда вземане. Това е партида по смисъла на
 * `docs/03-plan-za-izpalnenie.md`, затова завършва със сверка вход↔изход и
 * разликата се записва, дори когато е нула.
 *
 * `opId` е производен от периода и наема. Това е цялата защита срещу двойно
 * начисляване: натиснеш ли бутона два пъти, вторият път Вратата връща същия
 * резултат и нищо ново не влиза в Журнала.
 */

import { DnevnikNaSverki, sverka, type Sverka } from '../yadro/sverka.js';
import type { Naem, Ogledalo } from '../ogledalo/ogledalo.js';
import type { Deystviya } from './deystviya.js';

/** Период във вида '2026-08'. */
export type Period = string;

export class GreshkaNachislyavane extends Error {
  readonly sverki: readonly Sverka[];

  constructor(message: string, sverki: readonly Sverka[]) {
    super(message);
    this.name = 'GreshkaNachislyavane';
    this.sverki = sverki;
  }
}

interface RezultatNachislyavane {
  readonly period: Period;
  readonly sverki: readonly Sverka[];
  /** нови вземания, създадени сега */
  readonly nachisleni: number;
  /** вземания, които вече са били начислени за този период */
  readonly veche: number;
  readonly nared: boolean;
}

interface NastroykiNachislyavane {
  readonly deystviya: Deystviya;
  readonly period: Period;
  /** ISO време на начисляването */
  readonly kogato: string;
}

const PERIOD = /^(\d{4})-(\d{2})$/;

function razglobi(period: Period): { godina: number; mesets: number } {
  const nameren = PERIOD.exec(period);
  if (!nameren) {
    throw new GreshkaNachislyavane(`Периодът трябва да е във вида „2026-08“: ${period}`, []);
  }
  const godina = Number(nameren[1]);
  const mesets = Number(nameren[2]);
  if (mesets < 1 || mesets > 12) {
    throw new GreshkaNachislyavane(`Няма месец ${mesets}`, []);
  }
  return { godina, mesets };
}

/** Колко дни има месецът — за да не падне падеж на 31 февруари. */
export function dniVMeseca(godina: number, mesets: number): number {
  return new Date(Date.UTC(godina, mesets, 0)).getUTCDate();
}

/** Падежът на наема за периода, като ISO дата. */
export function padezhZaPerioda(naem: Naem, period: Period): string {
  const { godina, mesets } = razglobi(period);
  const den = Math.min(Math.max(naem.padezhDen, 1), dniVMeseca(godina, mesets));
  return `${period}-${String(den).padStart(2, '0')}`;
}

/**
 * Начислява ли се този наем за този период?
 * Прекратен наем — не. Договор, който не покрива месеца — не.
 */
export function seNachislyava(naem: Naem, period: Period): boolean {
  if (naem.prekraten) return false;
  const ot = naem.ot.slice(0, 7);
  if (ot && ot > period) return false;
  const doo = naem.do.slice(0, 7);
  if (doo && doo < period) return false;
  return true;
}

/** Стабилният ключ на вземането — производен, за да е повторното пускане безопасно. */
function idNaVzemane(naemId: string, period: Period): string {
  return `V:${period}:${naemId}`;
}

function opIdNaVzemane(naemId: string, period: Period): string {
  return `nachislyavane:${period}:${naemId}`;
}

/** Живите наеми за периода, подредени, за да е резултатът повторяем. */
export function zaNachislyavane(o: Ogledalo, period: Period): Naem[] {
  return [...o.naemi.values()]
    .filter((n) => seNachislyava(n, period))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function nachisliZaPeriod(
  n: NastroykiNachislyavane,
): Promise<RezultatNachislyavane> {
  razglobi(n.period);

  const predi = await n.deystviya.ogledalo();
  const naemi = zaNachislyavane(predi, n.period);

  let nachisleni = 0;
  let veche = 0;

  for (const naem of naemi) {
    const rezultat = await n.deystviya.nachisliVzemane(
      idNaVzemane(naem.id, n.period),
      {
        naemId: naem.id,
        period: n.period,
        osnovanie: 'наем',
        suma_st: naem.naem_st,
        padezh: padezhZaPerioda(naem, n.period),
      },
      { opId: opIdNaVzemane(naem.id, n.period) },
    );
    if (rezultat.povtoreno) veche += 1;
    else nachisleni += 1;
  }

  // Сверка: колкото живи наема — толкова вземания за периода.
  const sled = await n.deystviya.ogledalo();
  const vzemaniyaZaPerioda = [...sled.vzemaniya.values()].filter(
    (v) => v.period === n.period,
  );
  const nachisleno_st = vzemaniyaZaPerioda.reduce((s, v) => s + v.nachisleno_st, 0);
  const ochakvano_st = naemi.reduce((s, x) => s + x.naem_st, 0);

  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka(
      `Начисляване ${n.period} · брой`,
      naemi.length,
      vzemaniyaZaPerioda.length,
      n.kogato,
    ),
  );
  dnevnik.zapishi(
    sverka(`Начисляване ${n.period} · сума`, ochakvano_st, nachisleno_st, n.kogato),
  );

  const nezatvoreni = dnevnik.nezatvoreni;
  if (nezatvoreni.length > 0) {
    throw new GreshkaNachislyavane(
      `Начисляването за ${n.period} не затваря (${nezatvoreni.length} ` +
        `${nezatvoreni.length === 1 ? 'разлика' : 'разлики'}).`,
      dnevnik.vsichki,
    );
  }

  return {
    period: n.period,
    sverki: dnevnik.vsichki,
    nachisleni,
    veche,
    nared: true,
  };
}
