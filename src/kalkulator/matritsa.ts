/**
 * МАТРИЦАТА · база по вид обект × коефициенти.
 *
 * Негови думи (23.08):
 *
 *   „Проучване на методологии на калкулатори за изчисляване на цената на имоти.
 *    Апартаменти, гаражи, паркоместа, по район, степен и т.н… **Ексел е в
 *    основата на всичко. Матрици и висша математика.**"
 *
 * И за числото по подразбиране:
 *
 *   „**3000 евро** беше цената, която калкулаторът да ползва, да се разработи и
 *    да се направят тестове."
 *
 * ФОРМАТА:
 *
 *   цена = обща площ × база(вид) × коеф(етаж) × коеф(изложение)
 *
 * ВСИЧКО В ЦЕЛИ БАЗИСНИ ТОЧКИ. 1,00 = 10 000 б.т.; 1,05 = 10 500. Никакъв
 * float — умножават се цели числа и се дели ВЕДНЪЖ, накрая (умението
 * `matematika` §1). Коефициент 1,05 × 0,97 във float дава 1,0184999999999998;
 * в базисни точки дава 10 185 и това число не мърда.
 *
 * ЧИСЛАТА ОСТАВАТ НЕГОВИ. Тези тук са ЗАЛОЖЕНИ ЗА РАЗРАБОТКА, не са оферта —
 * `docs/otcheti/kalkulator-metodologii.md` §6 ги държи като „чакат него".
 * Затова матрицата е ДАННА, не константа в кода: сменя се от Настройки, и
 * новият район е нов РЕД, не нов код (третият закон на скелета).
 */

import type { VidObekt } from './chetene.js';

/** Една базисна точка е 1/10 000. Коефициент 1,00 = 10 000 б.т. */
export const EDINITSA_BT = 10_000;

export class GreshkaMatritsa extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaMatritsa';
  }
}

/**
 * Базовата цена на квадратен метър, в цели ЕВРОЦЕНТА, по вид обект.
 *
 * Числата за разработка идват от НЕГОВАТА ценова листа („ЦЕНИ МД нова.xlsx"),
 * за да е тестът честен: там апартаментите вървят по 2 838–3 151 €/м², а
 * 3 000 — неговото число — стои точно по средата. Гаражите и паркоместата са
 * закръглени средни от същата листа.
 */
export interface Matritsa {
  /** име на района — „Малинова долина"; нов район е нов ред */
  readonly rayon: string;
  /** вид обект → база в евроцента за квадратен метър */
  readonly baza_st: Readonly<Record<VidObekt, number>>;
  /** етаж (словом, както е в таблицата) → коефициент в б.т. */
  readonly etazhi: Readonly<Record<string, number>>;
  /** изложение („Ю", „СИ"…) → коефициент в б.т. */
  readonly izlozheniya: Readonly<Record<string, number>>;
}

/**
 * МАТРИЦАТА ЗА РАЗРАБОТКА. Всяко число тук чака него.
 *
 * Коефициентите на етажа следват занаята: партерът и последният етаж се
 * търгуват под средното, средните етажи — над него. Изложението: юг и изток
 * над север и запад. Всички са в базисни точки.
 */
export const MATRITSA_ZA_RAZRABOTKA: Matritsa = Object.freeze({
  rayon: 'Малинова долина',
  baza_st: Object.freeze({
    apartament: 300_000, // 3 000 € · неговото число за разработка и тестове
    garazh: 100_000, // 1 000 €/м² · средно от неговата листа
    parkomyasto: 190_000, // 1 900 €/м² · открито и закрито, средно
    sklad: 133_000, // 1 330 €/м²
    drug: 300_000,
  }),
  etazhi: Object.freeze({
    подземен: 10_000,
    партер: 9_500,
    първи: 9_700,
    втори: 10_000,
    трети: 10_200,
    четвърти: 10_200,
    пети: 10_100,
    шести: 10_000,
    терен: 10_000,
  }),
  izlozheniya: Object.freeze({
    Ю: 10_500,
    ЮИ: 10_400,
    ЮЗ: 10_300,
    И: 10_200,
    З: 10_000,
    СИ: 9_800,
    СЗ: 9_700,
    С: 9_600,
  }),
});

/** Коефициент по ключ; липсващият е 1,00 — не се измисля, не се отказва. */
export function koefitsient(karta: Readonly<Record<string, number>>, klyuch: string): number {
  const t = klyuch.trim();
  if (t === '') return EDINITSA_BT;
  return karta[t] ?? EDINITSA_BT;
}

/**
 * ЦЕНАТА, ТОЧНО · в евроцента, БЕЗ закръгляне.
 *
 * Закръглянето става ВЕДНЪЖ, накрая, и то извън тази функция (`stoynost.ts`) —
 * законът от ADR-012: закръгленото никога не влиза в сбор.
 *
 * Редът на делението е нарочен: първо се умножават ЦЕЛИТЕ числа (площ в кв.см
 * × база в стотинки × два коефициента в б.т.), после се дели веднъж. Обратният
 * ред би закръглил по средата и разликата щеше да расте с всеки обект.
 */
export function tsenaTochno(n: {
  readonly obshta_kvsm: number;
  readonly vid: VidObekt;
  readonly etazh: string;
  readonly izlozhenie: string;
  readonly matritsa?: Matritsa;
}): number {
  const m = n.matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  const baza_st = m.baza_st[n.vid];
  if (baza_st === undefined) {
    throw new GreshkaMatritsa(`Матрицата няма база за вид „${n.vid}".`);
  }
  if (!Number.isSafeInteger(n.obshta_kvsm) || n.obshta_kvsm < 0) {
    throw new GreshkaMatritsa(`Площта се дава в цели квадратни сантиметри; получено: ${n.obshta_kvsm}`);
  }

  const kEtazh = koefitsient(m.etazhi, n.etazh);
  const kIzlozhenie = koefitsient(m.izlozheniya, n.izlozhenie);

  // площ (кв.см) × база (ст./м²) → ст. × 10 000, после двата коефициента
  // → ст. × 10 000 × 10 000 × 10 000. Делим веднъж, накрая.
  const gore = BigInt(n.obshta_kvsm) * BigInt(baza_st) * BigInt(kEtazh) * BigInt(kIzlozhenie);
  const dolu = BigInt(10_000) * BigInt(EDINITSA_BT) * BigInt(EDINITSA_BT);
  // към най-близкото — точната среда отива нагоре, както човек смята на ръка
  const rezultat = (gore * 2n + dolu) / (dolu * 2n);
  return Number(rezultat);
}

/**
 * ЕВРО НА КВАДРАТ · производното число в неговата листа.
 *
 * Проверено срещу „ЦЕНИ МД нова.xlsx": 224 800 € ÷ 75,914 851 71 м² дава
 * 2 961,212 397 €/м² — точно каквото пише там. Затова тук се смята така, а не
 * от матрицата: неговата колона е ЧАСТНО на цената и площта.
 *
 * Връща цели евроцента на квадратен метър.
 */
export function evroNaKvadrat_st(tsena_st: number, obshta_kvsm: number): number {
  if (obshta_kvsm <= 0) return 0;
  return Math.round((tsena_st * 10_000) / obshta_kvsm);
}
