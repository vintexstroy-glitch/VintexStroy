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
import { poRolya, redoveSDanni, type ModelNaTablitsa } from './model.js';
import { pozvolenaStavka, STAVKI } from '../domein/dds.js';
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

/**
 * Ключът се вади от съдържанието, не от мястото — редът може да се размести.
 *
 * И в NFC (правило 12): в Журнала същият текст е нормализиран от Вратата, а
 * ключът, граден от суровия файл, се разминаваше при NFD-клавиатура — редът
 * минаваше за НОВ и се раждаше дубъл вместо съвпадение.
 */
export function klyuchNaRazhod(r: {
  dokument: string;
  data: string;
  koy: string;
  suma_st: number;
}): string {
  return r.dokument.trim() !== ''
    ? `dok:${r.dokument.trim().toLowerCase().normalize('NFC')}`
    : `red:${r.data}|${r.koy.trim().toLowerCase().normalize('NFC')}|${r.suma_st}`;
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
  return naychestiyatMesets(tablitsa.redove.slice(glava + 1).map((r) => r?.[kolona] ?? ''));
}

/**
 * НАЙ-ЧЕСТИЯТ МЕСЕЦ измежду разчетените дати · ГЛАСУВАНЕ, не първата клетка.
 *
 * Първата дата лъже: една сгрешена клетка най-отгоре би обявила цялата таблица
 * за друг месец. Затова всяка разчетена дата дава ГЛАС, а неразчетената мълчи —
 * тя не знае за кого да гласува.
 *
 * Двата викащи се различават САМО по това ОТКЪДЕ идват суровите клетки: с
 * глава, намерена по думи, или през модел. Сметката е една и живее тук —
 * написана два пъти, тя щеше да се разминава при първата поправка в едната.
 */
function naychestiyatMesets(surovi: readonly string[]): string {
  const broy = new Map<string, number>();
  for (const kletka of surovi) {
    const surovo = kletka.trim();
    if (surovo === '') continue;
    try {
      const mesets = dataOtKletka(surovo).slice(0, 7);
      broy.set(mesets, (broy.get(mesets) ?? 0) + 1);
    } catch {
      // Неразчетена дата не гласува за период.
    }
  }
  // Равен брой → печели първият срещнат: Map пази реда на вписване, а
  // сортирането е устойчиво. Така два еднакво чести месеца не се разменят
  // между две четения на един и същи файл.
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

// ── четенето ПО МОДЕЛ · когато човекът е казал коя колона какво е ──────────

/**
 * СТАВКАТА ОТ КЛЕТКА · „20", „20%", „20,00%" — все едно и също.
 *
 * Приема се само цял процент от `STAVKI`. Чуждото число НЕ се закръгля към
 * най-близкото позволено: 21% в клетка значи или грешка в източника, или
 * сменен закон, и двете искат човек, а не мълчаливо приближение.
 */
export function stavkaOtKletka(surovo: string): number {
  const chisto = surovo.trim().replace(/%/g, '').replace(',', '.').trim();
  if (chisto === '') throw new GreshkaRazchitane('Клетката за ДДС е празна.');
  const chislo = Number(chisto);
  if (!Number.isFinite(chislo)) {
    throw new GreshkaRazchitane(`„${surovo.trim()}" не е ставка.`);
  }
  // „0,20" в клетка значи 20%, не 0,2% — Excel пази процентите като дроб.
  const protsenti = chislo > 0 && chislo < 1 ? chislo * 100 : chislo;
  const kato = Math.round(protsenti);
  // Толерансът е заради плаващата запетая в самия Excel (0,2 × 100 не е точно 20).
  // Това е ПРОЦЕНТ, не пари — правило 3 не се нарушава.
  if (Math.abs(protsenti - kato) > 1e-9 || !pozvolenaStavka(kato)) {
    throw new GreshkaRazchitane(
      `Ставка ${surovo.trim()} не съществува. Позволените са: ${STAVKI.join('%, ')}%.`,
    );
  }
  return kato;
}

/**
 * СТАВКАТА ОТ СУМАТА · когато колоната носи левовете на ДДС-то, не процента.
 *
 *   ставка = ДДС × 100 / (обща − ДДС)
 *
 * Смята се и веднага се СВЕРЯВА: изчислената ставка трябва да е позволена и,
 * приложена наобратно върху общата сума, да върне същите стотинки. Иначе
 * таблицата казва нещо, което не се връзва — и това е ред за човек, не за
 * закръгляне. Толерансът е една стотинка, защото източникът си закръглява сам.
 */
export function stavkaOtSuma(obshta_st: number, dds_st: number): number {
  const osnova = obshta_st - dds_st;
  if (osnova <= 0) throw new GreshkaRazchitane('ДДС-то не може да е колкото цялата сума.');

  for (const st of STAVKI) {
    if (st === 0) {
      if (dds_st === 0) return 0;
      continue;
    }
    const ochakvano = Math.round((obshta_st * st) / (100 + st));
    if (Math.abs(ochakvano - dds_st) <= 1) return st;
  }
  throw new GreshkaRazchitane(
    'ДДС-то в тази клетка не отговаря на нито една позволена ставка ' +
      `(${STAVKI.join('%, ')}%).`,
  );
}

/** Кой месец е таблицата според МОДЕЛА — пак по най-често срещаната дата. */
export function periodPoModel(m: ModelNaTablitsa, t: Tablitsa): string {
  return naychestiyatMesets([...redoveSDanni(m, t)].map((i) => poRolya(m, t, i, 'data')));
}

/**
 * Чете таблицата през картата на хедъра.
 *
 * Разликата с `razchetiRazhodi` е една: там колоните се ТЪРСЯТ по думи, тук са
 * КАЗАНИ. Всичко останало е същото — цели стотинки, ISO дати, и ред, който не
 * се разчита, влиза в `propusnati` с думи защо.
 */
export function razchetiPoModel(n: {
  model: ModelNaTablitsa;
  tablitsa: Tablitsa;
  izvor: Izvor;
  period: string;
}): Snimka {
  const { model: m, tablitsa: t } = n;
  const redove: RedOtSnimka[] = [];
  const propusnati: Propusnat[] = [];
  const vidyani = new Map<string, number>();

  for (const i of redoveSDanni(m, t)) {
    const nomer = i + 1;
    const surovaSuma = poRolya(m, t, i, 'suma');
    const surovaData = poRolya(m, t, i, 'data');
    const koy = poRolya(m, t, i, 'kontragent');
    const osnovanie = poRolya(m, t, i, 'osnovanie');

    if (surovaSuma === '' && surovaData === '' && koy === '' && osnovanie === '') continue;

    try {
      const suma_st = otLeva(surovaSuma.replace(/\s|лв\.?/gi, ''));
      if (suma_st === 0) throw new GreshkaRazchitane('Сумата е нула.');
      const data = dataOtKletka(surovaData);
      if (data.slice(0, 7) !== n.period) {
        propusnati.push({ red: nomer, zashto: `Датата ${data} е извън ${n.period}.` });
        continue;
      }

      // Кой е отсреща: контрагентът, ако таблицата го дава; иначе основанието.
      // Празно НЕ минава — ред без нито едно от двете не се разпознава после.
      const shte = koy || osnovanie;
      if (shte === '') throw new GreshkaRazchitane('Няма нито контрагент, нито основание.');

      const dokument = poRolya(m, t, i, 'dokument');
      const osnoven = klyuchNaRazhod({ dokument, data, koy: shte, suma_st });
      const povtoreno = (vidyani.get(osnoven) ?? 0) + 1;
      vidyani.set(osnoven, povtoreno);
      const klyuch = povtoreno === 1 ? osnoven : `${osnoven}#${povtoreno}`;

      const stavka = stavkaNaRed(m, t, i, suma_st);

      redove.push({
        klyuch,
        koy: shte,
        suma_st,
        data,
        dokument,
        opis: osnovanie || shte,
        ...(stavka === undefined ? {} : { stavka }),
      });
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

/** Ставката на един ред според модела. `undefined`, ако таблицата мълчи. */
function stavkaNaRed(
  m: ModelNaTablitsa,
  t: Tablitsa,
  red: number,
  suma_st: number,
): number | undefined {
  if (m.koloni.dds === undefined) return undefined;
  const surovo = poRolya(m, t, red, 'dds');
  if (surovo === '') return undefined;
  return m.ddsE === 'suma'
    ? stavkaOtSuma(suma_st, otLeva(surovo.replace(/\s|лв\.?/gi, '')))
    : stavkaOtKletka(surovo);
}
