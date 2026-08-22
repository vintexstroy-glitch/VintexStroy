/**
 * СМЕТКИ · петте потока пари и ДДС-то на отделен ред.
 *
 * Думата на собственика: „ДДС се смята в отделен ред в Сметки, определен от
 * Приходи, които включват Наеми, КЕШ и БАНКА и Заплати и Кредити."
 *
 * Затова тук няма ДДС до всеки наем — има РЕД. Той се извежда от потоците и се
 * разбива по акумулатори (държава/сектор), както искат
 * `docs/01-arhitekturen-dokument.md` §5 и `references/tables/finansi.md`:
 * отделни акумулатори, не един общ.
 *
 * Изгледът е производен — не се съхранява, смята се от Огледалото при всяко
 * поискване. И понеже е партида (много събития → едно число), завършва със
 * СВЕРКА, чиято разлика се записва, дори когато е нула.
 */

import { DnevnikNaSverki, sverka, type Sverka } from '../yadro/sverka.js';
import { akumulator, ddsOtObshta, type Akumulator } from './dds.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';

export type Posoka = 'приход' | 'разход';

/**
 * В какво се мери една сверка. Стои в `belezhka`, за да не се показват
 * стотинки и бройки с един и същи вид — 120000 и 1 не са едно и също нещо.
 */
export const MERKA = { pari: 'стотинки', broy: 'брой' } as const;
export type StranaDDS = 'изход' | 'вход';

/** Един поток пари — един ред в „Сметки". */
export interface RedSmetka {
  readonly klyuch: string;
  readonly ime: string;
  readonly posoka: Posoka;
  readonly suma_st: number;
  readonly broi: number;
  readonly belezhka: string;
}

/** Един ред от ДДС-разбивката — по акумулатор, не общо. */
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
  /** начисленото за периода — основата на ДДС-то */
  readonly prihod_st: number;
  /** какво реално е влязло за периода (кеш + банка) */
  readonly sabrano_st: number;
  readonly razhod_st: number;
  /** Σ ДДС изход − Σ ДДС вход */
  readonly zaVnasyane_st: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

/**
 * Сметките за един период.
 *
 * ДДС-то се смята върху НАЧИСЛЕНОТО — данъчното събитие е падежът, не денят,
 * в който парите са влезли. Затова КЕШ и БАНКА стоят до него на екрана:
 * двете числа се разминават и това е нормално, но не бива да е скрито.
 */
export function smetki(o: Ogledalo, period: Period, kogato: string): Smetki {
  const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.period === period);
  const plashtaniya = [...o.plashtaniya.values()].filter(
    (p) => p.data.slice(0, 7) === period,
  );

  const kesh = plashtaniya.filter((p) => p.nachin === 'в брой');
  const banka = plashtaniya.filter((p) => p.nachin !== 'в брой');

  const prihod_st = vzemaniya.reduce((s, v) => s + v.nachisleno_st, 0);
  const kesh_st = kesh.reduce((s, p) => s + p.suma_st, 0);
  const banka_st = banka.reduce((s, p) => s + p.suma_st, 0);

  const redove: RedSmetka[] = [
    {
      klyuch: 'naemi',
      ime: 'Наеми',
      posoka: 'приход',
      suma_st: prihod_st,
      broi: vzemaniya.length,
      belezhka: 'начислено за периода · обща цена с ДДС',
    },
    {
      klyuch: 'kesh',
      ime: 'КЕШ',
      posoka: 'приход',
      suma_st: kesh_st,
      broi: kesh.length,
      belezhka: 'прието в брой',
    },
    {
      klyuch: 'banka',
      ime: 'БАНКА',
      posoka: 'приход',
      suma_st: banka_st,
      broi: banka.length,
      belezhka: 'прието по банка',
    },
    {
      klyuch: 'zaplati',
      ime: 'Заплати',
      posoka: 'разход',
      suma_st: 0,
      broi: 0,
      belezhka: 'още няма събития — влиза в следващия резен',
    },
    {
      klyuch: 'krediti',
      ime: 'Кредити',
      posoka: 'разход',
      suma_st: 0,
      broi: 0,
      belezhka: 'още няма събития — влиза в следващия резен',
    },
  ];

  // ── ДДС-редът: по акумулатор, изведен от общата цена ──────────────────
  const po = new Map<string, { a: Akumulator; obshta_st: number; broi: number }>();
  for (const v of vzemaniya) {
    const naem = o.naemi.get(v.naemId);
    const a = akumulator(naem?.sektor);
    const veche = po.get(a.klyuch) ?? { a, obshta_st: 0, broi: 0 };
    po.set(a.klyuch, {
      a,
      obshta_st: veche.obshta_st + v.nachisleno_st,
      broi: veche.broi + 1,
    });
  }

  const dds: RedDDS[] = [...po.values()]
    .sort((x, y) => x.a.klyuch.localeCompare(y.a.klyuch))
    .map(({ a, obshta_st, broi }) => {
      const r = ddsOtObshta(obshta_st, a.stavka);
      return {
        akumulator: a,
        strana: 'изход' as StranaDDS,
        obshta_st,
        osnova_st: r.osnova_st,
        dds_st: r.dds_st,
        broi,
      };
    });

  const zaVnasyane_st =
    dds.reduce((s, r) => s + (r.strana === 'изход' ? r.dds_st : 0), 0) -
    dds.reduce((s, r) => s + (r.strana === 'вход' ? r.dds_st : 0), 0);

  // ── сверката: нищо да не е паднало между вземанията и акумулаторите ───
  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka(
      `Сметки ${period} · приход ↔ основа + ДДС`,
      prihod_st,
      dds.reduce((s, r) => s + r.osnova_st + r.dds_st, 0),
      kogato,
      MERKA.pari,
    ),
  );
  dnevnik.zapishi(
    sverka(
      `Сметки ${period} · брой вземания ↔ брой в акумулаторите`,
      vzemaniya.length,
      dds.reduce((s, r) => s + r.broi, 0),
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
    razhod_st: 0,
    zaVnasyane_st,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
  };
}
