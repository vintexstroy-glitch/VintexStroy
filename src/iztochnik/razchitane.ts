/**
 * РАЗЧИТАНЕ · от таблица към редове за Журнала.
 *
 * Тук е границата: отляво влизат клетки-низове от чужд файл, отдясно излизат
 * цели стотинки и ISO дати. Нищо не минава нататък неразчетено.
 *
 * Ред, който не се разчита, НЕ се преглъща — влиза в `propusnati` с думи защо.
 * Мълчаливо пропуснат ред е точно начинът, по който се губят 24,2%
 * (docs/04-odit-na-verigata.md).
 */

import { GreshkaPari, otLeva } from '../yadro/pari.js';
import { GreshkaData, otData } from '../yadro/data.js';
import { nameriGlavata, nameriKolona, type Tablitsa } from './tablitsa.js';
import type { Izvor, Propusnat, RedOtSnimka, Snimka } from './snimka.js';

export class GreshkaRazchitane extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaRazchitane';
  }
}

/** Думите, по които се познава главата на таблица с разходи. */
export const DUMI_RAZHODI = ['достав', 'сума', 'дата'] as const;

export interface NastroykiRazchitane {
  readonly tablitsa: Tablitsa;
  readonly izvor: Izvor;
  readonly period: string;
}

/**
 * Excel пази датите като брой дни от 30.12.1899. Ако клетката е число,
 * се превежда; ако е текст — минава през `otData`.
 */
export function dataOtKletka(surovo: string): string {
  const chisto = surovo.trim();
  if (/^\d+(\.\d+)?$/.test(chisto)) {
    const dni = Math.floor(Number(chisto));
    if (dni > 0 && dni < 100_000) {
      const ms = Date.UTC(1899, 11, 30) + dni * 86_400_000;
      return new Date(ms).toISOString().slice(0, 10);
    }
  }
  // „14.02.2026" и „14/02/2026" се пренареждат, преди да ги види вратарят.
  const naObratno = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(chisto);
  if (naObratno) {
    const [, d, m, g] = naObratno;
    return otData(`${g}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`, 'Датата');
  }
  return otData(chisto, 'Датата');
}

/** Ключът се вади от съдържанието, не от мястото — редът може да се размести. */
export function klyuchNaRazhod(r: {
  dokument: string;
  data: string;
  koy: string;
  suma_st: number;
}): string {
  return r.dokument.trim() !== ''
    ? `dok:${r.dokument.trim().toLowerCase()}`
    : `red:${r.data}|${r.koy.trim().toLowerCase()}|${r.suma_st}`;
}

/**
 * Кой месец е таблицата — по най-често срещаната дата, не по името на файла.
 * Празен низ, ако не се разчита нито една дата.
 */
export function pogadniPeriod(tablitsa: Tablitsa): string {
  const glava = nameriGlavata(tablitsa, [...DUMI_RAZHODI]);
  if (glava < 0) return '';
  const kolona = nameriKolona(tablitsa, glava, 'дата');
  if (kolona < 0) return '';

  const broy = new Map<string, number>();
  for (let i = glava + 1; i < tablitsa.redove.length; i += 1) {
    const surovo = (tablitsa.redove[i]?.[kolona] ?? '').trim();
    if (surovo === '') continue;
    try {
      const mesets = dataOtKletka(surovo).slice(0, 7);
      broy.set(mesets, (broy.get(mesets) ?? 0) + 1);
    } catch {
      // Неразчетена дата не гласува за период.
    }
  }
  return [...broy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function razchetiRazhodi(n: NastroykiRazchitane): Snimka {
  const glava = nameriGlavata(n.tablitsa, [...DUMI_RAZHODI]);
  if (glava < 0) {
    throw new GreshkaRazchitane(
      'Не намирам главата на таблицата. Трябват колони „Доставчик", „Сума" и „Дата".',
    );
  }

  const kolona = {
    koy: nameriKolona(n.tablitsa, glava, 'достав'),
    suma: nameriKolona(n.tablitsa, glava, 'сума'),
    data: nameriKolona(n.tablitsa, glava, 'дата'),
    opis: nameriKolona(n.tablitsa, glava, 'какво'),
    dokument: nameriKolona(n.tablitsa, glava, 'документ'),
  };

  const redove: RedOtSnimka[] = [];
  const propusnati: Propusnat[] = [];
  const vidyani = new Map<string, number>();

  for (let i = glava + 1; i < n.tablitsa.redove.length; i += 1) {
    const red = n.tablitsa.redove[i] ?? [];
    const nomer = i + 1;
    const vzemi = (k: number) => (k >= 0 ? (red[k] ?? '').trim() : '');

    const koy = vzemi(kolona.koy);
    const surovaSuma = vzemi(kolona.suma);
    const surovaData = vzemi(kolona.data);

    if (koy === '' && surovaSuma === '' && surovaData === '') continue;

    try {
      const suma_st = otLeva(surovaSuma.replace(/\s|лв\.?/gi, ''));
      if (suma_st === 0) throw new GreshkaRazchitane('Сумата е нула.');
      const data = dataOtKletka(surovaData);
      if (data.slice(0, 7) !== n.period) {
        propusnati.push({ red: nomer, zashto: `Датата ${data} е извън ${n.period}.` });
        continue;
      }
      if (koy === '') throw new GreshkaRazchitane('Няма доставчик.');

      const dokument = vzemi(kolona.dokument);
      const osnoven = klyuchNaRazhod({ dokument, data, koy, suma_st });
      // Два реда с един ключ са грешка в източника — вторият получава своя.
      const povtoreno = (vidyani.get(osnoven) ?? 0) + 1;
      vidyani.set(osnoven, povtoreno);
      const klyuch = povtoreno === 1 ? osnoven : `${osnoven}#${povtoreno}`;

      redove.push({ klyuch, koy, suma_st, data, dokument, opis: vzemi(kolona.opis) || koy });
    } catch (greshka) {
      propusnati.push({
        red: nomer,
        zashto:
          greshka instanceof GreshkaPari ||
          greshka instanceof GreshkaData ||
          greshka instanceof GreshkaRazchitane
            ? greshka.message
            : String(greshka),
      });
    }
  }

  return { vid: 'razhodi', period: n.period, izvor: n.izvor, redove, propusnati };
}
