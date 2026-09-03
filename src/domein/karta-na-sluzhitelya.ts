/**
 * КАРТАТА НА СЛУЖИТЕЛЯ · седмица или месец (резен 113 · ADR-159).
 *
 * Негово, 03.09 (И133): „да има когато дадеш на всеки служител името освен
 * правомощията **да виждаш и задачите които са активни и там ги разпределяш**
 * като прави картата на всеки служител **за седмица или за месец**."
 *
 * И по-рано, два пъти същото: „Да, реално ще пподреди и **картата н аслужителя
 * спрямо такта на графиката**" *(р65·[70])* и „а там няма тези отчет за анализи
 * а са сменени с **всеки служител график за деня или месеца или годината**"
 * *(р57·[170])*.
 *
 * ═══ КАКВО Е „АКТИВНА ЗАДАЧА" ═══
 *
 * Изпратена и НЕотказана — тоест чакаща или приета. Отказаната не се разпределя:
 * тя е чужд отговор, а не работа, която стои. Показва се обаче в броя на
 * отказаните, за да не изглежда, че е изчезнала (правило 15).
 *
 * ═══ ЗАДАЧАТА ЗАЕМА ВСИЧКИТЕ СИ ДНИ ═══
 *
 * Задача от понеделник до сряда стои и в трите клетки — както лентата в Ганта
 * заема отрязък, не точка. Затова СВЕРКАТА брои РАЗЛИЧНИ задачи, не клетки:
 * иначе едно тридневно дело би се броило за три.
 *
 * ═══ КАРТАТА НЕ ПОЗНАВА ДЕЛА БЕЗ ИЗПРАЩАНЕ ═══
 *
 * Отговорникът на делото е ИМЕ (човек, р48·[44]), а служителят е ИМЕЙЛ. Да се
 * свържат по прилика на име значи картата да сложи чужда работа на нечий ден
 * при първия съименник. Затова тук влиза само ПОЕТОТО — изпратената задача, —
 * а екранът го КАЗВА, вместо да мълчи за разликата.
 */

import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import { svediImeyl } from './akaunt.js';
import {
  sastoyanieNaZadacha,
  zadachiNa,
  type Izprashtane,
  type OtgovorNaZadacha,
  type SastoyanieNaZadacha,
} from './zadachi-kam-hora.js';

/** Двата такта на картата · негови думи: „за седмица или за месец". */
export const TAKTOVE_NA_KARTATA = ['sedmitsa', 'mesets'] as const;
export type TaktNaKartata = (typeof TAKTOVE_NA_KARTATA)[number];

export const IMENA_NA_TAKTOVETE: Readonly<Record<TaktNaKartata, string>> = Object.freeze({
  sedmitsa: 'седмица',
  mesets: 'месец',
});

const DEN = 86_400_000;

function denKato(vreme: number): string {
  return new Date(vreme).toISOString().slice(0, 10);
}

/**
 * ПРОЗОРЕЦЪТ · дните, които картата показва, в реда им.
 *
 * Седмицата почва в ПОНЕДЕЛНИК — както календарът с парите (§118 · ADR-100):
 * два изгледа с различно начало на седмицата се четат като различни седмици.
 * Месецът е календарният, БЕЗ чуждите дни: тук няма пари, които да се сумират
 * по мрежа, а работа, която стои на ден.
 */
export function prozoretsNaKartata(takt: TaktNaKartata, den: string): readonly string[] {
  const t = Date.parse(`${den}T00:00:00Z`);
  if (Number.isNaN(t)) throw new RangeError(`„${den}" не е ден (YYYY-MM-DD).`);
  if (takt === 'sedmitsa') {
    const ponedelnik = t - ((new Date(t).getUTCDay() + 6) % 7) * DEN;
    return Object.freeze([...Array(7)].map((_, i) => denKato(ponedelnik + i * DEN)));
  }
  const d = new Date(t);
  const parvi = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const dni = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return Object.freeze([...Array(dni)].map((_, i) => denKato(parvi + i * DEN)));
}

/** Съседният прозорец · назад или напред, без да се смятат дни в екрана. */
export function sasedenProzorets(takt: TaktNaKartata, den: string, napred: number): string {
  const t = Date.parse(`${den}T00:00:00Z`);
  if (Number.isNaN(t)) throw new RangeError(`„${den}" не е ден (YYYY-MM-DD).`);
  if (takt === 'sedmitsa') return denKato(t + napred * 7 * DEN);
  const d = new Date(t);
  return denKato(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + napred, 1));
}

/** Една задача, както стои в клетка на картата. */
export interface ZadachaVKartata {
  readonly zadachaId: string;
  readonly deloId: string;
  /** името на делото · празно, ако делото го няма вече в Огледалото */
  readonly delo: string;
  readonly sastoyanie: SastoyanieNaZadacha;
  readonly ot: string;
  readonly do: string;
  readonly chas: string;
  readonly doChas: string;
  /** ПЪРВИЯТ ѝ ден в този прозорец · за да се вижда къде почва */
  readonly nachalo: boolean;
}

export interface KletkaNaKartata {
  readonly den: string;
  readonly zadachi: readonly ZadachaVKartata[];
}

export interface KartaNaSluzhitelya {
  readonly dni: readonly KletkaNaKartata[];
  /** активните РАЗЛИЧНИ задачи в прозореца · за сверката и за думите */
  readonly aktivni: number;
  /** отказаните в същия прозорец · те НЕ се разпределят, но се броят */
  readonly otkazani: number;
}

/**
 * КАРТАТА · дните на прозореца, напълнени с активните задачи на този човек.
 *
 * Изпращанията се четат ВЕДНЪЖ и се полагат по дни: втора обиколка за броя и
 * трета за клетките биха дали три отговора за едно и също (правило 7).
 */
export function kartaNaSluzhitelya(n: {
  readonly izprateni: ReadonlyMap<string, Izprashtane>;
  readonly otgovori: ReadonlyMap<string, OtgovorNaZadacha>;
  readonly imenaNaDelata: ReadonlyMap<string, string>;
  readonly imeyl: string;
  readonly takt: TaktNaKartata;
  readonly den: string;
}): KartaNaSluzhitelya {
  const dni = prozoretsNaKartata(n.takt, n.den);
  const parviyat = dni[0]!;
  const posledniyat = dni[dni.length - 1]!;
  const poDen = new Map<string, ZadachaVKartata[]>(dni.map((d) => [d, []]));

  let aktivni = 0;
  let otkazani = 0;
  for (const z of zadachiNa(n.izprateni, svediImeyl(n.imeyl))) {
    // ИЗВЪН ПРОЗОРЕЦА · задача, свършила преди него или почнала след него.
    if (z.do < parviyat || z.ot > posledniyat) continue;
    const sastoyanie = sastoyanieNaZadacha(n.otgovori, z.zadachaId);
    if (sastoyanie === 'otkazana') {
      otkazani += 1;
      continue;
    }
    aktivni += 1;
    for (const den of dni) {
      if (den < z.ot || den > z.do) continue;
      poDen.get(den)!.push(
        Object.freeze({
          zadachaId: z.zadachaId,
          deloId: z.deloId,
          delo: n.imenaNaDelata.get(z.deloId) ?? '',
          sastoyanie,
          ot: z.ot,
          do: z.do,
          chas: z.chas,
          doChas: z.doChas,
          nachalo: den === z.ot,
        }),
      );
    }
  }

  return Object.freeze({
    dni: Object.freeze(dni.map((d) => Object.freeze({ den: d, zadachi: Object.freeze(poDen.get(d)!) }))),
    aktivni,
    otkazani,
  });
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът са АКТИВНИТЕ задачи в прозореца; изходът — РАЗЛИЧНИТЕ, положени в
 * клетки. Задача, паднала между дните (срок извън прозореца по грешка в
 * смятането), се вижда като разлика, вместо да изчезне тихо от нечий ден.
 */
export function sveriKartata(karta: KartaNaSluzhitelya, kogato: string): Sverka {
  const polozheni = new Set<string>();
  for (const d of karta.dni) for (const z of d.zadachi) polozheni.add(z.zadachaId);
  return sverka('картата на служителя', karta.aktivni, polozheni.size, kogato, MERKA.broy);
}
