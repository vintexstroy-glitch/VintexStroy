/**
 * ДАТИТЕ — вратар на входа, както `otLeva` е вратар за парите.
 *
 * Правилото е същото и е записано при парите: входът е мястото, където се спира
 * лошото, не Вратата. А тук залогът е по-голям — Журналът е САМО ЗА ДОБАВЯНЕ:
 * сгрешена дата влиза завинаги и се маха само със сторно.
 *
 * Затова се проверява и календарът, не само видът: „2026-02-31" изглежда като
 * дата, но не е ден.
 */

export class GreshkaData extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaData';
  }
}

const VID = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Вярна ли е като ден от календара. */
export function eData(tekst: unknown): tekst is string {
  if (typeof tekst !== 'string') return false;
  const nameren = VID.exec(tekst);
  if (!nameren) return false;
  const [, g, m, d] = nameren;
  const godina = Number(g);
  const mesets = Number(m);
  const den = Number(d);
  if (mesets < 1 || mesets > 12 || den < 1) return false;
  // Ден 0 на следващия месец е последният ден на този — така февруари се брои сам.
  return den <= new Date(Date.UTC(godina, mesets, 0)).getUTCDate();
}

/**
 * Чете дата, написана от човек, и я връща като ISO ден.
 * Приема „2026-02-28"; отказва празно, „28.02.2026" и „2026-02-31".
 */
export function otData(tekst: string, koe = 'Датата'): string {
  const chisto = tekst.trim();
  if (chisto === '') throw new GreshkaData(`${koe} липсва.`);
  if (!eData(chisto)) throw new GreshkaData(`${koe} не е ден от календара: „${chisto}"`);
  return chisto;
}
