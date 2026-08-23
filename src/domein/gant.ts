/**
 * ГАНТЪТ · решетката с времеви колони.
 *
 * Негово определение, дословно *(р84·[28] · допълнено в [30] · 12.08)*:
 *
 *   „Гант = решетката с времеви колони (★ −60)"
 *
 * И моделът, който той избра *(р56·[6]·08.08)*: „**Да, направи като Сметки
 * (периодни колони)**" — *предложено, прието: ясни периодни колони, делото =
 * лента вътре в клетките по период.*
 *
 * ПЪРВАТА КОЛОНА Е ДНЕС. Негово „Да, точно така" *(р57·[134])* на
 * *предложението: първата колона е днес; скрол наляво показва историята.*
 * Затова решетката НЕ почва от началото на годината: тя почва от днес и се
 * връща назад само когато някой я върне.
 *
 * ЗАЩО НЯМА ВЛАЧЕНЕ. Негово, кратко и без условие *(р83·[35]·11.08)*:
 * „**не можеш да го направиш това забрана**". Срокът се мени от полето за срок,
 * не с мишка върху лента — и това е добре: влаченето прави тиха промяна на
 * дата, а всяка промяна на срок е събитие в Журнала.
 */

import type { Delo } from './dela.js';

/** Четирите му мащаба, дословно *(р57·[174]·08.08)*: „Ден · Седмица · Месец · Година". */
export const TAKTOVE = ['den', 'sedmitsa', 'mesets', 'godina'] as const;
export type Takt = (typeof TAKTOVE)[number];

export const IMENA_NA_TAKTOVETE: Readonly<Record<Takt, string>> = Object.freeze({
  den: 'Ден',
  sedmitsa: 'Седмица',
  mesets: 'Месец',
  godina: 'Година',
});

/**
 * КОЛКО КОЛОНИ СЕ ВИЖДАТ и колко дни носи всяка.
 *
 * Негови числа, дословно *(р75·[64]·11.08)*:
 *
 *   „нека тогава да има бутон за избор на период. 1 година с стъпка месец,
 *    1 месец с стъпка 31 и 1 седмица със стъпка 7, и 1ден с стъпка 1 ден."
 *
 * „1 месец с стъпка 31" значи месец, показан по ДНИ — 31 колони. Не 31 месеца.
 */
export const RESHETKA: Readonly<Record<Takt, { vidimi: number; dniVKolona: number }>> =
  Object.freeze({
    den: { vidimi: 1, dniVKolona: 1 },
    sedmitsa: { vidimi: 7, dniVKolona: 1 },
    mesets: { vidimi: 31, dniVKolona: 1 },
    godina: { vidimi: 12, dniVKolona: 0 }, // 0 = календарен месец, не фиксирани дни
  });

/**
 * ОБХВАТЪТ Е ПЕТ ПЪТИ ВИДИМОТО · негово число *(р51·[141]·07.08)*:
 *
 *   „Графиката когато избереш стъпка от време да покзава толкова видима част, а
 *    реално овеличава с пети пъти стъпката и реално за стъпка 1 година видима
 *    на екрана да се скролва до 5 години вдиаграмата."
 *
 * Тоест: виждаш една година, скролваш пет. Числото е негово и не се „оптимизира".
 */
export const KRATNOST_NA_OBHVATA = 5;

export interface KolonaNaGanta {
  /** YYYY-MM-DD · първият ден на колоната */
  readonly ot: string;
  /** YYYY-MM-DD · последният ден, включително */
  readonly do: string;
  /** какво пише в главата ѝ */
  readonly nadpis: string;
  /** тази колона ли е днешният ден/период */
  readonly dnes: boolean;
}

/** Лентата на едно дело върху решетката. */
export interface Lenta {
  readonly deloId: string;
  /** индекс на първата колона, която делото покрива */
  readonly ot: number;
  /** колко колони покрива · поне 1 */
  readonly broy: number;
  /** излиза ли делото извън решетката наляво — стрелка, не отрязване */
  readonly izlizaNalyavo: boolean;
  readonly izlizaNadyasno: boolean;
}

export interface Reshetka {
  readonly takt: Takt;
  readonly koloni: readonly KolonaNaGanta[];
  /** колко от тях се побират на екран — останалите са зад скрола */
  readonly vidimi: number;
  readonly lenti: readonly Lenta[];
}

const DEN = 86_400_000;

function naData(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function otData(d: string): number {
  return Date.parse(`${d}T00:00:00Z`);
}

/**
 * Построява колоните · първата е ДНЕС, останалите напред във времето.
 *
 * Скролът наляво показва историята, затова решетката носи и НАЗАД толкова,
 * колкото напред: без това „скрол наляво" би опирал в стена на първия ден.
 */
export function koloni(takt: Takt, dnes: string): KolonaNaGanta[] {
  const { vidimi } = RESHETKA[takt];
  const obshto = vidimi * KRATNOST_NA_OBHVATA;
  const nazad = vidimi; // една видима крачка история — толкова, колкото се вижда
  const spisak: KolonaNaGanta[] = [];

  if (takt === 'godina') {
    const [g, m] = dnes.split('-').map(Number) as [number, number];
    for (let i = -nazad; i < obshto; i++) {
      const d = new Date(Date.UTC(g, m - 1 + i, 1));
      const kray = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      spisak.push({
        ot: d.toISOString().slice(0, 10),
        do: kray.toISOString().slice(0, 10),
        nadpis: `${MESETSI[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        dnes: i === 0,
      });
    }
    return spisak;
  }

  const nula = otData(dnes);
  for (let i = -nazad; i < obshto; i++) {
    const ot = nula + i * DEN;
    spisak.push({
      ot: naData(ot),
      do: naData(ot),
      nadpis: nadpisNaDen(ot),
      dnes: i === 0,
    });
  }
  return spisak;
}

const MESETSI = [
  'яну',
  'фев',
  'мар',
  'апр',
  'май',
  'юни',
  'юли',
  'авг',
  'сеп',
  'окт',
  'ное',
  'дек',
];
const DNI = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function nadpisNaDen(ms: number): string {
  const d = new Date(ms);
  return `${DNI[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/**
 * ЛЕНТАТА НА ЕДНО ДЕЛО · от коя колона до коя.
 *
 * Дело, което почва преди решетката или свършва след нея, НЕ се отрязва тихо:
 * лентата носи `izlizaNalyavo` / `izlizaNadyasno` и екранът рисува стрелка.
 * Отрязана лента без белег изглежда като дело, което свършва днес.
 *
 * Дело изцяло извън решетката не дава лента — то не е скрито, а просто не е в
 * този прозорец от време; таблицата отляво пак го показва.
 */
export function lentaNa(d: Delo, k: readonly KolonaNaGanta[]): Lenta | null {
  if (k.length === 0) return null;
  const parva = k[0]!;
  const posledna = k[k.length - 1]!;
  if (d.do < parva.ot || d.ot > posledna.do) return null;

  let ot = k.findIndex((x) => x.do >= d.ot);
  if (ot < 0) ot = 0;
  let doIndeks = k.findIndex((x) => x.do >= d.do);
  if (doIndeks < 0) doIndeks = k.length - 1;

  return {
    deloId: d.id,
    ot,
    broy: Math.max(1, doIndeks - ot + 1),
    izlizaNalyavo: d.ot < parva.ot,
    izlizaNadyasno: d.do > posledna.do,
  };
}

/** Цялата решетка за едно множество дела. */
export function reshetka(dela: readonly Delo[], takt: Takt, dnes: string): Reshetka {
  const k = koloni(takt, dnes);
  const lenti: Lenta[] = [];
  for (const d of dela) {
    const l = lentaNa(d, k);
    if (l) lenti.push(l);
  }
  return { takt, koloni: k, vidimi: RESHETKA[takt].vidimi, lenti };
}

/**
 * ОБОБЩЕНИЯТ РЕД · негово искане *(р52·[303]·08.08)*:
 *
 *   „добави в всяка таблица един обобщен ред на сумите за месеци в Гант, в
 *    зависимост от времевия такт."
 *
 * „в зависимост от времевия такт" е половината от изречението, която лесно се
 * губи: сумата се събира по КОЛОНА на решетката, каквато и да е тя — не по
 * календарен месец, когато тактът е седмица.
 *
 * Сумите идват отвън (`sumiZaDen` в `otcheti.ts`), защото Гантът не знае за
 * пари и не бива да научава: смятачът остава чист.
 */
export interface SumaVKolona {
  readonly prihod_st: number;
  readonly razhod_st: number;
}

export function obobshtenRed(
  k: readonly KolonaNaGanta[],
  poDni: readonly { data: string; prihod_st: number; razhod_st: number }[],
): SumaVKolona[] {
  return k.map((kol) => {
    let prihod_st = 0;
    let razhod_st = 0;
    for (const d of poDni) {
      if (d.data >= kol.ot && d.data <= kol.do) {
        prihod_st += d.prihod_st;
        razhod_st += d.razhod_st;
      }
    }
    return { prihod_st, razhod_st };
  });
}
