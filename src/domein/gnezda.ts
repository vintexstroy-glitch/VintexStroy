/**
 * ГНЕЗДАТА · именуваните групи на Сметки.
 *
 * Негови ДВЕ изречения, дословно, от един и същи ден:
 *
 *   „Слей ги в гнезда (Отчети · Пари · Регистър)" *(р80·[50] · 11.08)*
 *   „ОТЧЕТ СРЕДСТВА/ОТЧЕТ ФИНАНСИ" *(р80·[48] · 11.08)*
 *
 * Първото дава ТРИТЕ гнезда; второто — ДВАТА поименни отчета вътре в първото.
 *
 * ЗАЩО „ГНЕЗДО" НЕ СЕ ГАДАЕ. Думата вече има дом в този код и той е един:
 * **именувана група вътре в нещо по-голямо** — „3 гнезда в менюто" *(docs/09
 * §4)*, „второто гнездо е «Дела и поддела»" *(ADR-101)*, „гнездото на
 * подделата" *(ADR-018)*, „един месец е гнездо от два стълба" *(app/diagrami)*.
 * Пет живи употреби, нито една друга. Затова изречението му не иска
 * тълкуване: групи с имена, не нов екран и не нова таблица.
 *
 * ═══ КОЕ Е НЕГОВО И КОЕ Е МОЕ · и то се БРОИ ═══
 *
 * Негови са ПЕТТЕ ИМЕНА и нищо повече. Кое поле влиза в кой отчет, той не е
 * казвал в нито едно изречение — това е МОЕ решение и стои в `NEGOVO_RAZPREDELENIE`
 * като ПРАЗЕН списък, точно както `NEGOVI_PARAMETRI` (ADR-072) държи празната
 * си кофа. Празният списък не е пропуск, а СЪСТОЯНИЕ, и екранът го чете оттук.
 *
 * Изречение в коментар не пада на червено, когато някой го надживее; списък,
 * който се брои, пада (ADR-067).
 *
 * ═══ КАКВО НЕ ПРАВИ ТОЗИ ФАЙЛ ═══
 *
 * Не мести Регистъра. Пълният Регистър — с трите изгледа, групирането и
 * месеца — живее на Имоти, защото ТАМ се пише. Тук влизат само ПАРИТЕ му за
 * периода, и посоката е една (правило 20): гнездото ЧЕТЕ. Границата се казва
 * на екрана, не се преглъща (правило 15).
 */

import type { Pole } from './otcheti.js';

/** Кое гнездо · ключовете са латиница, имената са неговите думи. */
export type KlyuchNaGnezdo = 'otcheti' | 'pari' | 'registar';

/** Кой поименен отчет · двата от р80·[48]. */
export type KlyuchNaOtchet = 'sredstva' | 'finansi';

/**
 * ПЕТТЕ ИМЕНА, КОИТО СА НЕГОВИ · дословно, без нито една буква отгоре.
 *
 * Списъкът се БРОИ от теста: сменѝ име на екрана, без да го смениш тук, и
 * тестът пада. Така „негова дума" не е твърдение в коментар.
 */
export const NEGOVITE_IMENA: readonly string[] = Object.freeze([
  'Отчети',
  'Пари',
  'Регистър',
  'Отчет Средства',
  'Отчет Финанси',
]);

/**
 * КОЕ ОТ РАЗПРЕДЕЛЕНИЕТО Е НЕГОВО · днес НИТО ЕДНО.
 *
 * Той е дал ИМЕНАТА на двата отчета, не съдържанието им. Кое от четирите
 * полета е „Средства" и кои са „Финанси" е моя преценка, направена по
 * значението на самите полета: Средства е ДВИЖЕНИЕ за периода (приход−разход,
 * негово определение от *(р64·[113])*), а другите три са СЪСТОЯНИЕ.
 *
 * Празният списък е състояние и се брои — негова дума по темата значи ЕДИН
 * ред тук, и екранът го казва сам.
 */
const NEGOVO_RAZPREDELENIE: readonly string[] = Object.freeze([]);

/** Негово ли е разпределението на едно поле · с ЕДНА дума, за екрана и теста. */
export function razpredelenietoENegovo(klyuchNaPole: string): boolean {
  return NEGOVO_RAZPREDELENIE.includes(klyuchNaPole);
}

/** Едно от четирите полета → в кой поименен отчет влиза. МОЕ решение. */
const OTCHETAT_NA_POLETO: Readonly<Record<string, KlyuchNaOtchet>> = Object.freeze({
  sredstva: 'sredstva',
  kapital: 'finansi',
  likvidnost: 'finansi',
  vzemaniya: 'finansi',
});

/** Имената на двата поименни отчета · негови думи. */
export const IMENA_NA_OTCHETITE: Readonly<Record<KlyuchNaOtchet, string>> = Object.freeze({
  sredstva: 'Отчет Средства',
  finansi: 'Отчет Финанси',
});

/** Едно изречение за всеки отчет · какво Е това, не как се смята. */
export const KAKVO_E_OTCHETAT: Readonly<Record<KlyuchNaOtchet, string>> = Object.freeze({
  sredstva: 'движението за периода — какво е влязло минус какво е излязло',
  finansi: 'състоянието към днес — какво се държи, какво се дължи, какво се чака',
});

/** Имената на трите гнезда · негови думи, в неговия ред. */
export const IMENA_NA_GNEZDATA: Readonly<Record<KlyuchNaGnezdo, string>> = Object.freeze({
  otcheti: 'Отчети',
  pari: 'Пари',
  registar: 'Регистър',
});

/** Редът на гнездата е НЕГОВИЯТ ред от изречението, не азбучен. */
export const REDAT_NA_GNEZDATA: readonly KlyuchNaGnezdo[] = Object.freeze([
  'otcheti',
  'pari',
  'registar',
]);

/** Едно изречение за всяко гнездо · включително ГРАНИЦАТА му. */
export const KAKVO_E_GNEZDOTO: Readonly<Record<KlyuchNaGnezdo, string>> = Object.freeze({
  otcheti: 'двата поименни отчета, всяко число с формулата си',
  pari: 'движението по месеци и полетата с формула',
  registar:
    'парите на наемите за периода · пълният Регистър се пише на Имоти, тук само се чете',
});

/** Един поименен отчет със своите полета. */
export interface Otchet {
  readonly klyuch: KlyuchNaOtchet;
  readonly ime: string;
  readonly kakvo: string;
  readonly poleta: readonly Pole[];
}

/**
 * СВЕРКА ВХОД↔ИЗХОД на гнездата (правило 7).
 *
 * Влизат N полета, излизат M — разпределени по двата отчета. Разликата се
 * записва **дори когато е нула**, и се казва ПОИМЕННО кое поле е останало без
 * отчет и кой ключ в разпределението сочи поле, което го няма.
 *
 * ЗАЩО ДВЕТЕ ПОСОКИ. Само броенето лови изгубено поле; само то не лови
 * разпределение, което е остаряло — ключ, чието поле е преименувано, тихо
 * престава да значи нещо. Едното без другото е половин сверка.
 */
export interface SverkaNaGnezdata {
  readonly vhod: number;
  readonly izhod: number;
  /** ключове на полета, за които разпределението мълчи */
  readonly bez_otchet: readonly string[];
  /** ключове в разпределението, за които поле няма */
  readonly bez_pole: readonly string[];
  readonly razlika: number;
}

/**
 * РАЗПРЕДЕЛЕНИЕТО · полетата се подреждат в двата поименни отчета.
 *
 * Поле без дом НЕ се изхвърля тихо — то не влиза в изхода, а името му излиза в
 * сверката. Мълчаливо изгубено число в отчет е точно повредата, която отчетите
 * трябва да ловят.
 */
export function otchetite(poleta: readonly Pole[]): readonly Otchet[] {
  const po: Record<KlyuchNaOtchet, Pole[]> = { sredstva: [], finansi: [] };
  for (const p of poleta) {
    const kade = OTCHETAT_NA_POLETO[p.klyuch];
    if (kade !== undefined) po[kade].push(p);
  }
  return Object.freeze(
    (['sredstva', 'finansi'] as const).map((k) =>
      Object.freeze({
        klyuch: k,
        ime: IMENA_NA_OTCHETITE[k],
        kakvo: KAKVO_E_OTCHETAT[k],
        poleta: Object.freeze(po[k]),
      }),
    ),
  );
}

/** Сверката вход↔изход · и нулата се записва. */
export function sveriGnezdata(poleta: readonly Pole[]): SverkaNaGnezdata {
  const imashti = new Set(poleta.map((p) => p.klyuch));
  const bez_otchet = poleta
    .filter((p) => OTCHETAT_NA_POLETO[p.klyuch] === undefined)
    .map((p) => p.klyuch);
  const bez_pole = Object.keys(OTCHETAT_NA_POLETO).filter((k) => !imashti.has(k));
  const izhod = otchetite(poleta).reduce((s, o) => s + o.poleta.length, 0);
  return Object.freeze({
    vhod: poleta.length,
    izhod,
    bez_otchet: Object.freeze(bez_otchet),
    bez_pole: Object.freeze(bez_pole),
    razlika: poleta.length - izhod,
  });
}
