/**
 * ТАБЛИЦА ОТ ФАЙЛ · четем качената, създаваме вътрешната (резен 21 · ADR-081).
 *
 * Негови думи, дословно:
 *
 *   „нека тъкмо направим с тази таблица експеримента за създаване на таблица с
 *    качване в папката с която работи таблицата и от там я чете и създава
 *    вътре. Дава с условие да се чете качена таблица и да се създаде вътре.
 *    Дали с формули или без формули. Ако може с копирани формули, ако не може
 *    само структура на таблица с числа и допълнително вътре се правят формулите
 *    от стопанина."
 *
 * ═══ ТРИТЕ НЕЩА, КОИТО ТОЗИ ФАЙЛ ПРАВИ ═══
 *
 *   1. чете ГЛАВАТА → имената на колоните, дословно;
 *   2. чете ДАННИТЕ → вида на всяка колона (евро · процент · число · дата · текст);
 *   3. чете ФОРМУЛИТЕ → превежда каквото се превежда, и КАЗВА какво не.
 *
 * ═══ И ЕДНО, КОЕТО НЕ ПРАВИ ═══
 *
 * НЕ качва файла никъде. Файлът си остава в неговата папка; влиза само
 * ОТПЕЧАТЪКЪТ (ADR-073, двете му правила за файлове). „Папката, с която работи
 * таблицата" е ИМЕ в Журнала, не директория на диска (правило 20) — затова
 * всичко тук работи и на телефон, и без мрежа.
 *
 * ═══ СВЕРКАТА, КОЯТО ПРАВИ ПРЕВОДА ЧЕСТЕН ═══
 *
 * Разпознаването на формула е по ФОРМА. Затова всяка преведена формула се
 * ПРЕСМЯТА върху редовете на файла и се сравнява с числата, които САМИЯТ Excel
 * е кеширал. Разминат ли се, формулата НЕ се копира и колоната идва с данните
 * си — точно вторият вариант, който той описва.
 *
 * Сметка, преписана без проверка, е сметка, на която никой не е гледал.
 */

import type { Tablitsa } from '../iztochnik/tablitsa.js';
import { prevediFormula, type Prevod } from '../iztochnik/prevod-formula.js';
import { otStotni, smetniFormula, type Formula } from './formuli.js';
import { otSuma } from '../yadro/pari.js';
import type { VidStoynost } from './vid-stoynost.js';

export class GreshkaTablitsaOtFayl extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaTablitsaOtFayl';
  }
}

// ── ВИДЪТ НА КОЛОНАТА ──────────────────────────────────────────────────────

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const PROTSENT = /%\s*$/;

/**
 * КОГА ЕДНО ЧИСЛО ИЗГЛЕЖДА КАТО ПАРИ.
 *
 * Знак на валута · или стотинки след разделителя · или интервал за хиляди.
 * ГОЛОТО цяло число НЕ е пари: в неговия файл „0889805575" е ТЕЛЕФОН, а се
 * четеше като сума — телефон, влязъл в сбор на пари, е същата повреда като
 * текст, взет за пари, само отзад напред.
 *
 * Стойността, която НЕ изглежда като пари, става ЧИСЛО — а човекът я поправя
 * на „евро" от падащото меню, преди да създаде таблицата. Правило 3 казва, че
 * видът живее в КОЛОНАТА; тук се решава само какво се ПРЕДЛАГА.
 */
const IZGLEZHDA_KATO_PARI = /[€$]|лв|[.,]\d{2}\s*$|\d[\s\u00a0\u202f]\d{3}/;

/**
 * ВИДЪТ СЕ СМЯТА ОТ ДАННИТЕ · и мълчаливо не се гади.
 *
 * Правилото е строго нарочно: колоната е от даден вид само ако ВСИЧКИТЕ ѝ
 * непразни клетки са такива. Една буква в колона с числа я прави ТЕКСТ — а
 * текст, взет за пари, е точно повредата, която после никой не намира.
 *
 * Празната колона е ТЕКСТ: нула клетки не доказват нищо (правило 15).
 *
 * А колона от ГОЛИ ЦЕЛИ ЧИСЛА е ЧИСЛО, не пари — виж `IZGLEZHDA_KATO_PARI`.
 */
export function vidNaKolonata(kletki: readonly string[]): VidStoynost {
  const nepr = kletki.map((k) => k.trim()).filter((k) => k !== '');
  if (nepr.length === 0) return 'tekst';
  if (nepr.every((k) => DATA.test(k))) return 'data';
  if (nepr.every((k) => PROTSENT.test(k) && chete(k, otStotni))) return 'protsent';
  if (nepr.every((k) => chete(k, otSuma)) && nepr.some((k) => IZGLEZHDA_KATO_PARI.test(k))) {
    return 'evro';
  }
  if (nepr.every((k) => chete(k, otStotni))) return 'chislo';
  return 'tekst';
}

function chete(k: string, f: (t: string) => number): boolean {
  try {
    f(k);
    return true;
  } catch {
    return false;
  }
}

// ── ПРЕДЛОЖЕНИЕТО ──────────────────────────────────────────────────────────

export interface KolonaOtFayl {
  readonly nomer: number;
  readonly ime: string;
  readonly vid: VidStoynost;
  /** `undefined`, когато колоната идва само с данните си */
  readonly formula: Formula | undefined;
  /** дословният израз от файла · празно, когато колоната няма формула */
  readonly izraz: string;
  /** празно, когато формулата е копирана; иначе ЗАЩО не е */
  readonly zashto: string;
}

export interface PredlozhenieZaTablitsa {
  readonly ime: string;
  readonly koloni: readonly KolonaOtFayl[];
  readonly redove: number;
  /** колко формули е имало във файла */
  readonly formuliVavFayla: number;
  /** колко от тях са КОПИРАНИ */
  readonly kopirani: number;
  /**
   * СВЕРКАТА ВХОД↔ИЗХОД върху самите формули · и разликата, дори нула.
   *
   * Вход: клетките, които Excel е сметнал. Изход: същите клетки, сметнати от
   * нас. Разлика: колко от проверените НЕ съвпадат.
   */
  readonly sverkaNaFormulite: {
    readonly provereni: number;
    readonly razlika: number;
  };
}

/** Колко реда се гледат при сверката · повече не носят повече увереност. */
export const REDOVE_ZA_SVERKA = 20;

/**
 * НА КОЙ РЕД Е ГЛАВАТА · познава се, не се приема за първия.
 *
 * Неговите листове почват със ЗАГЛАВИЕ в една клетка („Т А Б Л И Ц А за
 * продажбите на…"), а главата е под него. Приета за глава, тази клетка дава
 * таблица с ЕДНА колона, кръстена на цялото изречение — и 120 реда данни
 * увисват без имена.
 *
 * Главата се познава по три неща наведнъж: поне ДВЕ пълни клетки, нито една от
 * тях ЧИСЛО, и под нея да има ред с данни. Заглавието пада на първото условие,
 * ред с числа — на второто.
 *
 * Върнатото е ПРЕДЛОЖЕНИЕ. Последната дума е на човека — затова екранът го
 * показва в поле, което се мени.
 *
 * ИМЕТО е `redatNaGlavata`, а не `nameriGlavata`: в кода вече има ДВЕ функции с
 * второто име, и те питат друго — „кой ред носи ТЕЗИ думи" (`iztochnik/tablitsa`
 * и `zhurnal-ot-tablitsa`). Тук думите са НЕИЗВЕСТНИ; едно име за три въпроса
 * се цитира като едно решение и се поправя на грешното място (правило 17).
 */
export function redatNaGlavata(t: Tablitsa): number {
  for (let i = 0; i < t.redove.length - 1; i += 1) {
    const red = t.redove[i]!;
    const palni = red.filter((k) => k.trim() !== '');
    if (palni.length < 2) continue;
    if (palni.some((k) => Number.isFinite(Number(k.replace(',', '.'))))) continue;
    if (t.redove.slice(i + 1).some((r) => r.some((k) => k.trim() !== ''))) return i;
  }
  return 0;
}

/**
 * ЧЕТЕ ЕДИН ЛИСТ И ПРЕДЛАГА ТАБЛИЦА · нищо не записва (правило 18).
 *
 * `redNaGlavata` е нулево-базиран. Всичко под него са данни.
 */
export function predlozhiTablitsa(
  t: Tablitsa,
  formuliOtFayla: ReadonlyMap<number, string>,
  redNaGlavata = 0,
): PredlozhenieZaTablitsa {
  const glava = t.redove[redNaGlavata];
  if (!glava || glava.length === 0) {
    throw new GreshkaTablitsaOtFayl(
      `Ред ${redNaGlavata + 1} е празен — таблица без глава няма имена на колони.`,
    );
  }
  const danni = t.redove.slice(redNaGlavata + 1).filter((r) => r.some((k) => k.trim() !== ''));

  // ── ИМЕНАТА и ВИДЪТ ──────────────────────────────────────────────────────
  const shirina = Math.max(glava.length, ...danni.map((r) => r.length), 0);
  const imena: string[] = [];
  const vidove: VidStoynost[] = [];
  for (let k = 0; k < shirina; k += 1) {
    imena.push((glava[k] ?? '').trim() || `Колона ${k + 1}`);
    vidove.push(vidNaKolonata(danni.map((r) => r[k] ?? '')));
  }

  // ── ФОРМУЛИТЕ · превод, после СВЕРКА ─────────────────────────────────────
  const koloni: KolonaOtFayl[] = [];
  let kopirani = 0;
  let provereni = 0;
  let razlika = 0;

  for (let k = 0; k < shirina; k += 1) {
    const izrazOtFayla = formuliOtFayla.get(k);
    if (izrazOtFayla === undefined) {
      koloni.push(
        Object.freeze({ nomer: k, ime: imena[k]!, vid: vidove[k]!, formula: undefined, izraz: '', zashto: '' }),
      );
      continue;
    }

    const prevod: Prevod = prevediFormula(izrazOtFayla);
    if (prevod.formula === undefined) {
      koloni.push(
        Object.freeze({
          nomer: k,
          ime: imena[k]!,
          vid: vidove[k]!,
          formula: undefined,
          izraz: prevod.izraz,
          zashto: prevod.zashto,
        }),
      );
      continue;
    }

    const f: Formula = { deystvie: prevod.formula.deystvie, ot: prevod.formula.ot };
    const nasoche = f.ot.some((x) => x >= shirina || x === k);
    const sverka = nasoche
      ? { proveren: 0, razminat: 1 }
      : sveriFormulata(f, k, danni, vidove);
    provereni += sverka.proveren;
    razlika += sverka.razminat;

    const stana = !nasoche && sverka.razminat === 0 && sverka.proveren > 0;
    if (stana) kopirani += 1;
    koloni.push(
      Object.freeze({
        nomer: k,
        ime: imena[k]!,
        vid: vidove[k]!,
        formula: stana ? Object.freeze(f) : undefined,
        izraz: prevod.izraz,
        zashto: stana
          ? ''
          : nasoche
            ? 'Формулата сочи колона извън таблицата или собствената си.'
            : sverka.proveren === 0
              ? 'Няма нито един ред, на който сметката да се провери — непроверена не се копира.'
              : `Сметката НЕ съвпада с числата на файла в ${sverka.razminat} от ` +
                `${sverka.proveren} проверени реда.`,
      }),
    );
  }

  return Object.freeze({
    ime: t.ime,
    koloni: Object.freeze(koloni),
    redove: danni.length,
    formuliVavFayla: formuliOtFayla.size,
    kopirani,
    sverkaNaFormulite: Object.freeze({ provereni, razlika }),
  });
}

/**
 * ПРЕСМЯТА преведената формула върху редовете и я сравнява с ФАЙЛА.
 *
 * Гледат се първите `REDOVE_ZA_SVERKA` реда, на които и операндите, и самата
 * клетка носят число. Ред с празен операнд не доказва нищо и не се брои —
 * иначе празната таблица щеше да „потвърди" всяка формула.
 */
function sveriFormulata(
  f: Formula,
  sebe: number,
  danni: readonly (readonly string[])[],
  vidove: readonly VidStoynost[],
): { readonly proveren: number; readonly razminat: number } {
  const vid = (k: number): VidStoynost => vidove[k] ?? 'tekst';
  const nash = vidove[sebe] ?? 'tekst';
  if (nash !== 'evro' && nash !== 'chislo' && nash !== 'protsent') {
    return { proveren: 0, razminat: 0 };
  }

  let proveren = 0;
  let razminat = 0;
  for (const red of danni) {
    if (proveren >= REDOVE_ZA_SVERKA) break;
    const moe = (red[sebe] ?? '').trim();
    if (moe === '') continue;
    let ochakvano: number;
    try {
      ochakvano = nash === 'evro' ? otSuma(moe) : otStotni(moe);
    } catch {
      continue;
    }
    let nasheto: number | null;
    try {
      nasheto = smetniFormula(f, f.ot.map((k) => red[k] ?? ''), vid);
    } catch {
      razminat += 1;
      proveren += 1;
      continue;
    }
    if (nasheto === null) continue;
    proveren += 1;
    if (nasheto !== ochakvano) razminat += 1;
  }
  return { proveren, razminat };
}

/**
 * КАКВО СЕ КАЗВА НА ЧОВЕКА · едно изречение, преброено, не оценено.
 *
 * Двата случая имат РАЗЛИЧНИ думи нарочно: „с формулите" и „само структурата"
 * са двата пътя, които самият той назова, и екранът трябва да каже по кой е
 * тръгнала таблицата му.
 */
export function sDumi(p: PredlozhenieZaTablitsa): string {
  if (p.formuliVavFayla === 0) {
    return (
      `${p.koloni.length} колони · ${p.redove} реда · във файла НЯМА формули, ` +
      'значи таблицата идва със структурата и числата си.'
    );
  }
  if (p.kopirani === p.formuliVavFayla) {
    return (
      `${p.koloni.length} колони · ${p.redove} реда · и ВСИЧКИТЕ ${p.kopirani} формули ` +
      `се копираха, проверени на ${p.sverkaNaFormulite.provereni} реда.`
    );
  }
  return (
    `${p.koloni.length} колони · ${p.redove} реда · ${p.kopirani} от ${p.formuliVavFayla} ` +
    'формули се копираха. Останалите колони идват с числата си, а сметките им се ' +
    'правят вътре — до всяка пише защо.'
  );
}
