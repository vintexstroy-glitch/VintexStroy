/**
 * ТАБЛИЦАТА — общият вид, до който се свежда всеки източник.
 *
 * CSV, Excel и PDF влизат по различни пътища, но излизат едно и също: редици
 * от клетки-низове. Оттук нататък има ЕДИН път към Вратата, а не три.
 * Затова проверката на входа се пише веднъж.
 *
 * Клетките остават НИЗОВЕ. Превръщането в пари и дати става после, през
 * `otLeva` и `otData` — там, където се знае коя колона какво значи.
 */

export interface Tablitsa {
  /** име на листа или на файла */
  readonly ime: string;
  readonly redove: readonly (readonly string[])[];
}

/** Празните редове отпадат — Excel ги ражда с хиляди. */
export function bezPrazni(t: Tablitsa): Tablitsa {
  return {
    ime: t.ime,
    redove: t.redove.filter((r) => r.some((k) => k.trim() !== '')),
  };
}

/** Клетка по ред и колона, без да пука извън обхвата. */
export function kletka(t: Tablitsa, red: number, kolona: number): string {
  return (t.redove[red]?.[kolona] ?? '').trim();
}

/**
 * Намира реда със заглавията: първият, в който всяка търсена дума се среща.
 * Връща -1, ако няма такъв — тогава файлът не е този, за който се мисли.
 */
export function nameriGlavata(t: Tablitsa, dumi: readonly string[]): number {
  for (const [i, red] of t.redove.entries()) {
    const dolu = red.map((k) => k.trim().toLowerCase());
    if (dumi.every((d) => dolu.some((k) => k.includes(d.toLowerCase())))) return i;
  }
  return -1;
}

/** Коя колона носи тази дума в реда със заглавията. */
export function nameriKolona(t: Tablitsa, glava: number, duma: string): number {
  const red = t.redove[glava] ?? [];
  return red.findIndex((k) => k.trim().toLowerCase().includes(duma.toLowerCase()));
}
