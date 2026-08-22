/**
 * СМЕТКИ · потоците пари и ДДС-то на отделен ред.
 *
 * Думата на собственика: „ДДС се смята в отделен ред в Сметки, определен от
 * Приходи, които включват Наеми, КЕШ и БАНКА и Заплати и Кредити."
 *
 * Затова тук няма ДДС до всеки наем — има РЕД. Той се извежда от потоците и се
 * разбива по акумулатори (държава/сектор), както искат
 * `docs/01-arhitekturen-dokument.md` §5 и `references/tables/finansi.md`:
 * отделни акумулатори, не един общ. Изходящият идва от начисленото, входящият —
 * от разходите; за внасяне е разликата.
 *
 * Изгледът е производен — не се съхранява, смята се от Огледалото при всяко
 * поискване. И понеже е партида (много събития → едно число), завършва със
 * СВЕРКА, чиято разлика се записва, дори когато е нула.
 */

import { DnevnikNaSverki, sverka, type Sverka } from '../yadro/sverka.js';
import { akumulator, ddsOtObshta, type Akumulator } from './dds.js';
import type { Ogledalo, Razhod } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';

export type Posoka = 'приход' | 'разход';
export type StranaDDS = 'изход' | 'вход';

/**
 * В какво се мери една сверка. Стои в `belezhka`, за да не се показват
 * стотинки и бройки с един и същи вид — 120000 и 1 не са едно и също нещо.
 */
export const MERKA = { pari: 'стотинки', broy: 'брой' } as const;

/**
 * ПОТОЦИТЕ — декларирана таблица, за да е смяната един ред, не търсене из кода.
 *
 * Наеми, КЕШ и БАНКА са приходната страна: „Наеми" е начисленото (данъчното
 * събитие е падежът), а КЕШ и БАНКА показват как парите реално са влезли —
 * затова не се събират с него, иначе едно и също би се броило два пъти.
 */
export interface Potok {
  readonly klyuch: string;
  readonly ime: string;
  readonly posoka: Posoka;
  /** влиза ли в сбора на посоката, или само показва как е дошло */
  readonly sbira: boolean;
  readonly belezhka: string;
}

export const POTOTSI: readonly Potok[] = Object.freeze([
  { klyuch: 'naemi', ime: 'Наеми', posoka: 'приход', sbira: true, belezhka: 'начислено за периода · обща цена с ДДС' },
  { klyuch: 'kesh', ime: 'КЕШ', posoka: 'приход', sbira: false, belezhka: 'прието в брой' },
  { klyuch: 'banka', ime: 'БАНКА', posoka: 'приход', sbira: false, belezhka: 'прието по банка' },
  { klyuch: 'zaplati', ime: 'Заплати', posoka: 'разход', sbira: true, belezhka: 'заплати и осигуровки · без ДДС' },
  { klyuch: 'krediti', ime: 'Кредити', posoka: 'разход', sbira: true, belezhka: 'вноски по кредит · без ДДС' },
  { klyuch: 'fakturi', ime: 'Фактури', posoka: 'разход', sbira: true, belezhka: 'покупки с документ · оттук идва входящият ДДС' },
]);

/** Потоците, в които може да се запише разход. */
export function potototsiNaRazhod(): readonly Potok[] {
  return POTOTSI.filter((p) => p.posoka === 'разход');
}

export function potok(klyuch: string): Potok | undefined {
  return POTOTSI.find((p) => p.klyuch === klyuch);
}

/** Един поток пари — един ред в „Сметки". */
export interface RedSmetka {
  readonly klyuch: string;
  readonly ime: string;
  readonly posoka: Posoka;
  readonly suma_st: number;
  readonly broi: number;
  readonly belezhka: string;
}

/** Един ред от ДДС-разбивката — по акумулатор и по страна, не общо. */
export interface RedDDS {
  readonly akumulator: Akumulator;
  readonly strana: StranaDDS;
  readonly obshta_st: number;
  readonly osnova_st: number;
  readonly dds_st: number;
  readonly broi: number;
}

export interface Smetki {
  readonly period: Period;
  readonly redove: readonly RedSmetka[];
  readonly dds: readonly RedDDS[];
  /** начисленото за периода — основата на изходящия ДДС */
  readonly prihod_st: number;
  /** какво реално е влязло за периода (кеш + банка) */
  readonly sabrano_st: number;
  readonly razhod_st: number;
  /** Σ ДДС изход − Σ ДДС вход; отрицателно значи за възстановяване */
  readonly zaVnasyane_st: number;
  readonly dds_izhod_st: number;
  readonly dds_vhod_st: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

/** Разходите за периода, най-новите отгоре. */
export function razhodiZaPerioda(o: Ogledalo, period: Period): Razhod[] {
  return [...o.razhodi.values()]
    .filter((r) => r.data.slice(0, 7) === period)
    .sort((a, b) => b.data.localeCompare(a.data) || b.seq - a.seq);
}

/**
 * Сметките за един период.
 *
 * Изходящият ДДС се смята върху НАЧИСЛЕНОТО — данъчното събитие е падежът, не
 * денят, в който парите са влезли. Затова КЕШ и БАНКА стоят до него на екрана:
 * двете числа се разминават и това е нормално, но не бива да е скрито.
 */
export function smetki(o: Ogledalo, period: Period, kogato: string): Smetki {
  const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.period === period);
  const plashtaniya = [...o.plashtaniya.values()].filter(
    (p) => p.data.slice(0, 7) === period,
  );
  const razhodi = razhodiZaPerioda(o, period);

  const kesh = plashtaniya.filter((p) => p.nachin === 'в брой');
  const banka = plashtaniya.filter((p) => p.nachin !== 'в брой');

  const prihod_st = vzemaniya.reduce((s, v) => s + v.nachisleno_st, 0);
  const kesh_st = kesh.reduce((s, p) => s + p.suma_st, 0);
  const banka_st = banka.reduce((s, p) => s + p.suma_st, 0);

  const poPotok = new Map<string, { suma_st: number; broi: number }>();
  for (const r of razhodi) {
    const veche = poPotok.get(r.potok) ?? { suma_st: 0, broi: 0 };
    poPotok.set(r.potok, { suma_st: veche.suma_st + r.suma_st, broi: veche.broi + 1 });
  }

  const sumi: Record<string, { suma_st: number; broi: number }> = {
    naemi: { suma_st: prihod_st, broi: vzemaniya.length },
    kesh: { suma_st: kesh_st, broi: kesh.length },
    banka: { suma_st: banka_st, broi: banka.length },
  };

  const redove: RedSmetka[] = POTOTSI.map((p) => {
    const namereno = sumi[p.klyuch] ?? poPotok.get(p.klyuch) ?? { suma_st: 0, broi: 0 };
    return {
      klyuch: p.klyuch,
      ime: p.ime,
      posoka: p.posoka,
      suma_st: namereno.suma_st,
      broi: namereno.broi,
      belezhka:
        p.posoka === 'разход' && namereno.broi === 0
          ? `${p.belezhka} · още няма записи`
          : p.belezhka,
    };
  });

  const razhod_st = redove
    .filter((r) => r.posoka === 'разход')
    .reduce((s, r) => s + r.suma_st, 0);

  // ── ДДС-редовете: по акумулатор и по страна, изведени от общата цена ────
  const dds = [
    ...razbiy(
      vzemaniya.map((v) => ({ sektor: o.naemi.get(v.naemId)?.sektor, obshta_st: v.nachisleno_st })),
      'изход',
    ),
    ...razbiy(
      razhodi.map((r) => ({ sektor: r.sektor, obshta_st: r.suma_st })),
      'вход',
    ),
  ];

  const dds_izhod_st = dds.reduce((s, r) => s + (r.strana === 'изход' ? r.dds_st : 0), 0);
  const dds_vhod_st = dds.reduce((s, r) => s + (r.strana === 'вход' ? r.dds_st : 0), 0);

  // ── сверките: нищо да не е паднало между записите и акумулаторите ───────
  const dnevnik = new DnevnikNaSverki();
  const zatvarya = (strana: StranaDDS) =>
    dds.filter((r) => r.strana === strana).reduce((s, r) => s + r.osnova_st + r.dds_st, 0);
  const broiV = (strana: StranaDDS) =>
    dds.filter((r) => r.strana === strana).reduce((s, r) => s + r.broi, 0);

  dnevnik.zapishi(
    sverka(`Сметки ${period} · приход ↔ основа + ДДС`, prihod_st, zatvarya('изход'), kogato, MERKA.pari),
  );
  dnevnik.zapishi(
    sverka(
      `Сметки ${period} · брой вземания ↔ брой в акумулаторите`,
      vzemaniya.length,
      broiV('изход'),
      kogato,
      MERKA.broy,
    ),
  );
  dnevnik.zapishi(
    sverka(`Сметки ${period} · разход ↔ основа + ДДС`, razhod_st, zatvarya('вход'), kogato, MERKA.pari),
  );
  dnevnik.zapishi(
    sverka(
      `Сметки ${period} · брой разходи ↔ брой в акумулаторите`,
      razhodi.length,
      broiV('вход'),
      kogato,
      MERKA.broy,
    ),
  );

  return {
    period,
    redove,
    dds,
    prihod_st,
    sabrano_st: kesh_st + banka_st,
    razhod_st,
    zaVnasyane_st: dds_izhod_st - dds_vhod_st,
    dds_izhod_st,
    dds_vhod_st,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
  };
}

/** Групира по акумулатор и изважда ДДС-то от общата цена. */
function razbiy(
  redove: readonly { sektor: string | undefined; obshta_st: number }[],
  strana: StranaDDS,
): RedDDS[] {
  const po = new Map<string, { a: Akumulator; obshta_st: number; broi: number }>();
  for (const r of redove) {
    const a = akumulator(r.sektor);
    const veche = po.get(a.klyuch) ?? { a, obshta_st: 0, broi: 0 };
    po.set(a.klyuch, { a, obshta_st: veche.obshta_st + r.obshta_st, broi: veche.broi + 1 });
  }

  return [...po.values()]
    .sort((x, y) => x.a.klyuch.localeCompare(y.a.klyuch))
    .map(({ a, obshta_st, broi }) => {
      const razbivka = ddsOtObshta(obshta_st, a.stavka);
      return {
        akumulator: a,
        strana,
        obshta_st,
        osnova_st: razbivka.osnova_st,
        dds_st: razbivka.dds_st,
        broi,
      };
    });
}
