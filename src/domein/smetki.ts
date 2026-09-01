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

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { akumulator, ddsOtObshta, stavkaNaReda, type Akumulator } from './dds.js';
import { prihodOtProdazhbi } from './prodazhbi.js';
import { sveriDDS, type Dvizhenie, type RezultatSverka } from './sverka-dds.js';
import type { Stotinki } from '../yadro/pari.js';
import type { Ogledalo, Razhod } from '../ogledalo/ogledalo.js';
import { platenoDDSZaPerioda } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';

export type Posoka = 'приход' | 'разход';
type StranaDDS = 'изход' | 'вход';

/**
 * ПОТОЦИТЕ — декларирана таблица, за да е смяната един ред, не търсене из кода.
 *
 * Наеми, КЕШ и БАНКА са приходната страна: „Наеми" е начисленото (данъчното
 * събитие е падежът), а КЕШ и БАНКА показват как парите реално са влезли —
 * затова не се събират с него, иначе едно и също би се броило два пъти.
 */
interface Potok {
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
  { klyuch: 'prodazhbi', ime: 'Продажби', posoka: 'приход', sbira: true, belezhka: 'вноски по сделка · по датата на вноската · без ДДС' },
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
  /**
   * Ставката НА РЕДА, не на акумулатора. Един сектор може да носи движения на
   * различни ставки — тогава той дава два реда, не един среден.
   */
  readonly stavka: number;
  readonly strana: StranaDDS;
  readonly obshta_st: number;
  readonly osnova_st: number;
  readonly dds_st: number;
  readonly broi: number;
}

interface Smetki {
  readonly period: Period;
  readonly redove: readonly RedSmetka[];
  readonly dds: readonly RedDDS[];
  /** начисленото за периода — основата на изходящия ДДС · САМО наеми */
  readonly prihod_st: number;
  /**
   * ВНОСКИТЕ ПО СДЕЛКА за периода · приход, който НЕ е ДДС-основа.
   *
   * Стои ОТДЕЛНО от `prihod_st` нарочно: то е основата, върху която се смята
   * изходящият ДДС, а ДДС-то при продажба на сграда е счетоводна преценка, не
   * аритметика (`CHAKA_DUMA_ZA_DDS`). Слети, четирите ДДС-сверки щяха да
   * почнат да не затварят — или, по-лошо, да затварят с начислен данък, който
   * никой не е решил.
   */
  readonly prihodProdazhbi_st: number;
  /** какво реално е влязло за периода (кеш + банка) */
  readonly sabrano_st: number;
  readonly razhod_st: number;
  /** Σ ДДС изход − Σ ДДС вход; отрицателно значи за възстановяване */
  readonly zaVnasyane_st: number;
  readonly dds_izhod_st: number;
  readonly dds_vhod_st: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
  /** третото число · фактури ↔ извлечения ↔ внесено */
  readonly ddsSverka: RezultatSverka;
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
  const prodazhbi = prihodOtProdazhbi(o, period);

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
    prodazhbi: { suma_st: prodazhbi.suma_st, broi: prodazhbi.broy },
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
      razhodi.map((r) => ({ sektor: r.sektor, obshta_st: r.suma_st, ot_reda: r.stavka })),
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

  // ПЕТАТА СВЕРКА · приходната страна на таблицата ↔ двете ѝ числа.
  //
  // Приходът вече е ДВЕ числа: `prihod_st` (наеми · ДДС-основа) и вноските по
  // сделка. Ако някой ден се появи трети приходен поток, който СЪБИРА, и никой
  // не му даде число, редът му ще стои с нула и никоя от четирите горни сверки
  // няма да мигне — те гледат ДДС-акумулаторите, не таблицата. Тази гледа
  // самата таблица.
  const prihodPoRedove_st = redove
    .filter((r) => r.posoka === 'приход' && POTOTSI.find((p) => p.klyuch === r.klyuch)?.sbira)
    .reduce((s, r) => s + r.suma_st, 0);
  dnevnik.zapishi(
    sverka(
      `Сметки ${period} · приход по редовете ↔ наеми + продажби`,
      prihodPoRedove_st,
      prihod_st + prodazhbi.suma_st,
      kogato,
      MERKA.pari,
    ),
  );

  return {
    period,
    redove,
    dds,
    ddsSverka: sveriDDSZaPerioda(o, period),
    prihod_st,
    prihodProdazhbi_st: prodazhbi.suma_st,
    sabrano_st: kesh_st + banka_st,
    razhod_st,
    zaVnasyane_st: dds_izhod_st - dds_vhod_st,
    dds_izhod_st,
    dds_vhod_st,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
  };
}

/**
 * Групира по акумулатор И ПО СТАВКА, после изважда ДДС-то от общата цена.
 *
 * Ставката влиза в ключа, защото от резен 12 тя идва от РЕДА: същият сектор
 * може да носи и 20%, и 9% (нощувки), и 0% (необлагаема доставка). Слеят ли се
 * в един ред, изваденото ДДС е средно аритметично на нищо.
 */
function razbiy(
  redove: readonly { sektor: string | undefined; obshta_st: number; ot_reda?: number | undefined }[],
  strana: StranaDDS,
): RedDDS[] {
  const po = new Map<
    string,
    { a: Akumulator; stavka: number; obshta_st: number; osnova_st: number; dds_st: number; broi: number }
  >();
  for (const r of redove) {
    const a = akumulator(r.sektor);
    const stavka = stavkaNaReda(r.sektor, r.ot_reda);
    const klyuch = `${a.klyuch}|${stavka}`;
    const veche = po.get(klyuch) ?? { a, stavka, obshta_st: 0, osnova_st: 0, dds_st: 0, broi: 0 };
    // ДДС се вади ПО ДОКУМЕНТ и се СБИРА · не се вади от сбора на групата.
    const razbivka = ddsOtObshta(r.obshta_st, stavka);
    po.set(klyuch, {
      a,
      stavka,
      obshta_st: veche.obshta_st + r.obshta_st,
      osnova_st: veche.osnova_st + razbivka.osnova_st,
      dds_st: veche.dds_st + razbivka.dds_st,
      broi: veche.broi + 1,
    });
  }

  return [...po.values()]
    .sort((x, y) => x.a.klyuch.localeCompare(y.a.klyuch) || x.stavka - y.stavka)
    .map(({ a, stavka, obshta_st, osnova_st, dds_st, broi }) => ({
      akumulator: a,
      stavka,
      strana,
      obshta_st,
      osnova_st,
      dds_st,
      broi,
    }));
}

// ── ТРЕТОТО ЧИСЛО · фактури ↔ извлечения ↔ внесено ────────────────────────

/**
 * Кои разходи са „фактури" и кои — „извлечения".
 *
 * Границата е СЛЕДАТА, не видът на документа. Ред без `klyuch` е въведен от
 * човек — това е каквото той ЗНАЕ. Ред с `klyuch` е дошъл от прочетена
 * таблица или извлечение — това е каквото БАНКАТА (или доставчикът) е видял.
 *
 * Затова разминаването между двете купчини е точно въпросът, който той
 * зададе: „веднага се хваща липсата и се намира по извлеченията или липсата
 * на кешови фактури."
 */
function otRaka(o: Ogledalo, period: Period): Razhod[] {
  return razhodiZaPerioda(o, period).filter((r) => r.klyuch === '');
}

export function otIzvlechenie(o: Ogledalo, period: Period): Razhod[] {
  return razhodiZaPerioda(o, period).filter((r) => r.klyuch !== '');
}

/** Едно движение за сверката — от разход, какъвто и да е неговият произход. */
function dvizhenie(r: Razhod): Dvizhenie {
  return {
    data: r.data,
    suma_st: r.suma_st as Stotinki,
    dokument: r.dokument,
    opisanie: `${r.dostavchik} · ${r.opis}`,
  };
}

/** Изваденото ДДС на купчина редове, всеки със СВОЯТА ставка. */
function ddsNa(redove: readonly Razhod[]): Stotinki {
  let sbor = 0;
  for (const r of redove) {
    sbor += ddsOtObshta(r.suma_st, stavkaNaReda(r.sektor, r.stavka)).dds_st;
  }
  return sbor as Stotinki;
}

/**
 * Сверява трите ъгъла за един период.
 *
 * НЕ влиза в `sverki` на Сметки нарочно. Онези сверки са вход↔изход на партида
 * и всяка тяхна разлика е дефект. Тази тук е ДИАГНОЗА: човек, който води само
 * на ръка, няма извлечения, и разлика от целия оборот не значи повреда. Затова
 * стои на свой ред, с думи какво значи — а разликата се записва и когато е
 * нула, точно както иска правило 7.
 */
export function sveriDDSZaPerioda(o: Ogledalo, period: Period): RezultatSverka {
  const fakturi = otRaka(o, period);
  const izvlecheniya = otIzvlechenie(o, period);

  // Единственият дом на тази сметка е platenoDDSZaPerioda (правило 17) —
  // ръчното копие тук вече се беше разминало по дух, ако не по число.
  const vneseno = platenoDDSZaPerioda(o, period);

  return sveriDDS({
    fakturi: fakturi.map(dvizhenie),
    izvlecheniya: izvlecheniya.map(dvizhenie),
    dds_ot_fakturi_st: ddsNa(fakturi),
    dds_ot_izvlecheniya_st: ddsNa(izvlecheniya),
    dds_vneseno_st: vneseno as Stotinki,
  });
}

/**
 * МЕСЕЦИТЕ В ОБХВАТА · от началния до крайния, включително (резен 70).
 *
 * Негова дума *(И124 т.11)*: „В Перид при Сметки липсва възможност за
 * въвеждане на края на раз глеждания периода." Образецът от/до е този на
 * коефициентите — ДВА механизма за период щяха да са разрез с правило 17.
 *
 * Пазачът на 120: крив вход (край преди началото минава през UI-пазача само
 * при ръчно писан localStorage) не бива да върти вечно — реже се на десет
 * години и толкова.
 */
export function mesetsiteVObhvata(ot: string, doMesets: string): readonly string[] {
  const mesetsi: string[] = [];
  let [g, m] = ot.split('-').map(Number) as [number, number];
  for (let i = 0; i < 120; i += 1) {
    const tekusht = `${g}-${String(m).padStart(2, '0')}`;
    mesetsi.push(tekusht);
    if (tekusht >= doMesets) break;
    m += 1;
    if (m > 12) {
      m = 1;
      g += 1;
    }
  }
  return mesetsi;
}
