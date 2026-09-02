/**
 * ГЛАВНАТА КНИГА · двустранните статии, изведени от Журнала (И96 т.11).
 *
 * ═══ ЗАЩО ИЗОБЩО СЪЩЕСТВУВА ═══
 *
 * Журналът е СЪБИТИЕН: „вземане начислено", „плащане прието", „разход
 * записан". SAF-T иска друго — `GeneralLedgerEntries`, тоест счетоводни
 * СТАТИИ: дебит и кредит по сметки, които се уравновесяват. Проучването по
 * И92 го нарече „НАЙ-ГОЛЯМАТА ЛИПСА" и беше право: моделът го нямаше.
 *
 * ═══ ОГЛЕДАЛО, НЕ ВТОРИ ЖУРНАЛ ═══
 *
 * Статиите НЕ се записват. Смятат се от Огледалото при всяко поискване, точно
 * както Сметки и Отчети. Записана статия щеше да е втори дом на едно и също
 * число (правило 17) и първата поправка щеше да ги размине: Журналът сторниран,
 * книгата — не.
 *
 * Затова се чете ОГЛЕДАЛОТО, а не суровите събития: сторното вече е приложено
 * там. Сторнирано вземане просто го няма — и статията му я няма. Това съвпада
 * с начина, по който НАП иска корекция: НОВ, заместващ файл за периода, не
 * кръпка върху стария.
 *
 * ═══ МАПИНГЪТ КЪМ НАП ОТПАДНА (резен 53) ═══
 *
 * Негово, 31.08: „НАП отпада" — пада ПОДАВАНЕТО, не счетоводството. Затова
 * Главната книга остава цяла, а полето `nra` — националният код на всяка сметка
 * — падна с нея: то съществуваше САМО за да носи мапинга към номенклатурите на
 * НАП, стоеше празно във всички сметки и чакаше сваляне от `nra.bg`.
 *
 * С него падна и последният ред от описа на дълга по тази тема. Празно поле,
 * което участва в проверка, е дефект с праг нула (`npm run chistota`, ADR-048) —
 * а тук то беше и обещание, което вече никой не дава.
 *
 * Сметкопланът остава СЧЕТОВОДНА ПРЕЦЕНКА (правило 18): агентът предлага,
 * човекът записва. Онова, което НЕ е преценка, е равенството: всяка статия има
 * равни страни, и това се проверява, не се вярва.
 */

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { ddsOtObshta, stavkaNaReda } from './dds.js';
import type { Ogledalo, Plashtane, Razhod, Vzemane } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';
import { razhodiZaPerioda } from './smetki.js';

export class GreshkaKniga extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKniga';
  }
}

// ── СМЕТКОПЛАНЪТ ──────────────────────────────────────────────────────────

type VidSmetka = 'aktiv' | 'pasiv' | 'prihod' | 'razhod';

interface Smetka {
  /** номерът, както се пише в статията: „411", „4532" */
  readonly nomer: string;
  readonly ime: string;
  readonly vid: VidSmetka;
  /**
   * Кодът от националния сметкоплан на НАП (`NRA_Nom_Accounts`).
   *
   * ПРАЗЕН значи „още не е мапната" — честно и видимо. Измислен код тук е
   * по-скъп от липсващ: файлът минава автоматична валидация при НАП и грешен
   * код е глоба по чл. 277а, докато липсващият се вижда на екрана предварително.
   */
}

/**
 * СМЕТКОПЛАНЪТ · изброен поименно, не изведен от нищо.
 *
 * Толкова сметки, колкото ЖИВИТЕ събития раждат — нито една повече. Празна
 * сметка в SAF-T е ред, който НАП чака да обясниш.
 */
export const SMETKOPLAN: readonly Smetka[] = Object.freeze([
  { nomer: '411', ime: 'Клиенти', vid: 'aktiv' },
  { nomer: '401', ime: 'Доставчици', vid: 'pasiv' },
  { nomer: '501', ime: 'Каса', vid: 'aktiv' },
  { nomer: '503', ime: 'Разплащателна сметка', vid: 'aktiv' },
  { nomer: '4531', ime: 'Начислен данък за покупките', vid: 'aktiv' },
  { nomer: '4532', ime: 'Начислен данък за продажбите', vid: 'pasiv' },
  { nomer: '4538', ime: 'Данък за възстановяване', vid: 'aktiv' },
  { nomer: '4539', ime: 'Данък за внасяне', vid: 'pasiv' },
  { nomer: '601', ime: 'Разходи за материали', vid: 'razhod' },
  { nomer: '602', ime: 'Разходи за външни услуги', vid: 'razhod' },
  { nomer: '604', ime: 'Разходи за заплати', vid: 'razhod' },
  { nomer: '621', ime: 'Разходи за лихви', vid: 'razhod' },
  { nomer: '703', ime: 'Приходи от продажби на услуги', vid: 'prihod' },
]);

const PO_NOMER = new Map(SMETKOPLAN.map((s) => [s.nomer, s]));

export function smetka(nomer: string): Smetka {
  const s = PO_NOMER.get(nomer);
  if (!s) throw new GreshkaKniga(`Сметка ${nomer} я няма в сметкоплана.`);
  return s;
}

/**
 * РАЗХОДНАТА СМЕТКА · по СЕКТОРА на реда, не по потока.
 *
 * Секторът вече казва „какво е това" — от него идва и ДДС-ставката. Потокът
 * казва откъде са дошли парите, а не какъв е разходът: две фактури в един
 * поток може да са материали и услуга.
 *
 * Непознат сектор пада на 602 „външни услуги" — най-широкото, което не лъже.
 */
const SMETKA_NA_SEKTORA: Readonly<Record<string, string>> = Object.freeze({
  'pokupki-materiali': '601',
  'pokupki-uslugi': '602',
  'uslugi-stroitelni': '602',
  zaplati: '604',
  krediti: '621',
});

export function smetkataNaRazhoda(sektor: string): string {
  return SMETKA_NA_SEKTORA[sektor] ?? '602';
}

/**
 * КАСА или БАНКА · по начина на плащане, с ЕДНО правило и на двете места.
 *
 * Същият израз стои в `smetki()` за разделянето КЕШ/БАНКА. Тук се пише втори
 * път нарочно с обяснение: там дели ПОТОЦИ за екрана, тук избира СМЕТКА за
 * НАП. Слеят ли се, смяната на едното мени и другото.
 */
export function smetkataNaParite(nachin: string): string {
  return nachin === 'в брой' ? '501' : '503';
}

// ── СТАТИИТЕ ──────────────────────────────────────────────────────────────

type Strana = 'debit' | 'kredit';

interface RedNaStatiya {
  readonly smetka: string;
  readonly strana: Strana;
  readonly suma_st: number;
  readonly opis: string;
}

export interface Statiya {
  /** идентификаторът на СЪЩНОСТТА, която я е родила — следата назад */
  readonly id: string;
  readonly data: string;
  readonly opis: string;
  /** кой вид събитие я ражда · за `JournalID` в SAF-T */
  readonly dnevnik: VidDnevnik;
  /** име на контрагента · празно, когато няма (приключващи статии) */
  readonly kontragent: string;
  readonly redove: readonly RedNaStatiya[];
}

/**
 * ЧЕТИРИТЕ ДНЕВНИКА · SAF-T групира статиите в `Journal`.
 *
 * Изброени поименно, защото името им отива във файла и НАП ги чете. Пети
 * дневник = пето решение, не пета константа мимоходом.
 */
const DNEVNITSI = ['prodazhbi', 'pokupki', 'pari', 'dds'] as const;

type VidDnevnik = (typeof DNEVNITSI)[number];


/**
 * ИЗТОЧНИК БЕЗ ДВИЖЕНИЕ НЕ РАЖДА СТАТИЯ · и това НЕ е дефект.
 *
 * Намерено чрез сверител: записано ДДС-плащане за НУЛА (`platiDDS` не пази от
 * нула — Вратата иска цели центове, а нулата е цяла) правеше статия без нито
 * един ред. `proveriStatiya` хвърляше „статията е ДВУстранна", хвърлянето
 * минаваше нагоре през `glavnaKniga` и `blokNaOditniyaFayl` — и **целият екран
 * Сметки оставаше празен** заради един запис за нула.
 *
 * Затова правилото е тук, на ЕДНО място, и е просто: движение няма → статия
 * няма. Нула не мести пари; отрицателна сума в източник е повреда на данните,
 * не счетоводна операция, и няма как да ѝ се измисли вярна страна.
 *
 * НО НЕ СЕ ПРЕМЪЛЧАВА. Пропуснатите се броят и се ВРЪЩАТ (`bezDvizhenie`) —
 * тихо пропуснат източник е точно онова, срещу което е правило 7. Екранът ги
 * показва; сверката „източници ↔ статии" ги изважда от очакваното, за да не
 * дава лъжлива тревога (същата поука като при справка без ДДС).
 */
function dvizhi(suma_st: number): boolean {
  return Number.isSafeInteger(suma_st) && suma_st > 0;
}

/** Редовете без сума не се пишат: нулев ред е шум във файл, който се валидира. */
function red(smetka: string, strana: Strana, suma_st: number, opis: string): RedNaStatiya[] {
  return suma_st === 0 ? [] : [{ smetka, strana, suma_st, opis }];
}

/**
 * Проверява ЕДНА статия · равни страни, познати сметки, положителни суми.
 *
 * Хвърля, вместо да сверява тихо: неуравновесена статия не е разлика за
 * записване, а дефект в правилото, което я е родило.
 */
export function proveriStatiya(s: Statiya): void {
  if (s.redove.length < 2) {
    throw new GreshkaKniga(`Статия ${s.id} има под два реда — статията е ДВУстранна.`);
  }
  let debit = 0;
  let kredit = 0;
  for (const r of s.redove) {
    smetka(r.smetka);
    if (!Number.isSafeInteger(r.suma_st) || r.suma_st <= 0) {
      throw new GreshkaKniga(
        `Статия ${s.id} · ред по сметка ${r.smetka} носи ${r.suma_st} — сумите са цели центове над нулата.`,
      );
    }
    if (r.strana === 'debit') debit += r.suma_st;
    else kredit += r.suma_st;
  }
  if (debit !== kredit) {
    throw new GreshkaKniga(
      `Статия ${s.id} не се уравновесява: дебит ${debit}, кредит ${kredit}, разлика ${debit - kredit}.`,
    );
  }
}

/**
 * НАЧИСЛЕН НАЕМ → Дт 411 / Кт 703 + Кт 4532.
 *
 * Вземането носи ОБЩАТА цена с ДДС (правило от ADR-012 и `dds.ts`): клиентът
 * дължи общата, приходът е основата, разликата е данък. Затова основата се
 * ВАДИ, а не се смята отделно — иначе центът се губи и статията не
 * затваря.
 */
function statiyaOtVzemane(v: Vzemane, o: Ogledalo): Statiya | undefined {
  if (!dvizhi(v.nachisleno_st)) return undefined;
  const naem = o.naemi.get(v.naemId);
  const razbivka = ddsOtObshta(v.nachisleno_st, stavkaNaReda(naem?.sektor));
  const s: Statiya = {
    id: v.id,
    data: v.padezh,
    opis: `${v.osnovanie} · ${v.period}`,
    dnevnik: 'prodazhbi',
    kontragent: naem?.naemetel ?? '',
    redove: [
      ...red('411', 'debit', v.nachisleno_st, 'вземане от клиент'),
      ...red('703', 'kredit', razbivka.osnova_st, 'приход от наем'),
      ...red('4532', 'kredit', razbivka.dds_st, `ДДС ${razbivka.stavka}%`),
    ],
  };
  proveriStatiya(s);
  return s;
}

/** ПРИЕТО ПЛАЩАНЕ → Дт 501/503 / Кт 411. */
function statiyaOtPlashtane(p: Plashtane, o: Ogledalo): Statiya | undefined {
  if (!dvizhi(p.suma_st)) return undefined;
  const vzemane = o.vzemaniya.get(p.vzemaneId);
  const naem = vzemane ? o.naemi.get(vzemane.naemId) : undefined;
  const s: Statiya = {
    id: p.id,
    data: p.data,
    opis: `плащане · ${p.nachin}`,
    dnevnik: 'pari',
    kontragent: naem?.naemetel ?? '',
    redove: [
      ...red(smetkataNaParite(p.nachin), 'debit', p.suma_st, 'постъпили пари'),
      ...red('411', 'kredit', p.suma_st, 'погасено вземане'),
    ],
  };
  proveriStatiya(s);
  return s;
}

/**
 * ЗАПИСАН РАЗХОД → Дт разходна + Дт 4531 / Кт 501/503.
 *
 * Кредитира се ПАРИЧНАТА сметка, не 401 „Доставчици": Журналът записва разход
 * с начин на плащане, тоест платен разход. Задължение, което стои неплатено,
 * днес няма събитие — и измислена статия през 401 щеше да покаже пред НАП
 * дълг, който го няма.
 */
function statiyaOtRazhod(r: Razhod): Statiya | undefined {
  if (!dvizhi(r.suma_st)) return undefined;
  const stavka = stavkaNaReda(r.sektor, r.stavka);
  const razbivka = ddsOtObshta(r.suma_st, stavka);
  const s: Statiya = {
    id: r.id,
    data: r.data,
    opis: `${r.opis || 'разход'}${r.dokument ? ` · ${r.dokument}` : ''}`,
    dnevnik: r.potok === 'fakturi' ? 'pokupki' : 'pari',
    kontragent: r.dostavchik,
    redove: [
      ...red(smetkataNaRazhoda(r.sektor), 'debit', razbivka.osnova_st, 'разход по същество'),
      ...red('4531', 'debit', razbivka.dds_st, `ДДС ${stavka}%`),
      ...red(smetkataNaParite(r.nachin), 'kredit', r.suma_st, 'платени пари'),
    ],
  };
  proveriStatiya(s);
  return s;
}

/**
 * ПОДАДЕНА СПРАВКА → приключващата статия на месеца.
 *
 * Дт 4532 (целият изходящ) / Кт 4531 (целият входящ) + остатъкът:
 *   · дължим данък  → Кт 4539 „за внасяне";
 *   · данък за връщане → Дт 4538 „за възстановяване".
 *
 * Двете сметки НЕ се сливат в една със знак: минус в счетоводна сметка е
 * четене наопаки, а SAF-T иска страната изрично.
 *
 * `undefined` значи „няма какво да се приключва" — период без нито едно
 * ДДС-число не ражда празна статия.
 */
export function statiyaOtSpravka(
  period: Period,
  izhod_st: number,
  vhod_st: number,
  data: string,
): Statiya | undefined {
  if (izhod_st === 0 && vhod_st === 0) return undefined;
  const razlika = izhod_st - vhod_st;
  const s: Statiya = {
    id: `spravka-${period}`,
    data,
    opis: `ДДС-справка за ${period}`,
    dnevnik: 'dds',
    kontragent: '',
    redove: [
      ...red('4532', 'debit', izhod_st, 'приключване на изходящия'),
      ...red('4531', 'kredit', vhod_st, 'приключване на входящия'),
      ...(razlika > 0
        ? red('4539', 'kredit', razlika, 'данък за внасяне')
        : red('4538', 'debit', -razlika, 'данък за възстановяване')),
    ],
  };
  proveriStatiya(s);
  return s;
}

/** ВНЕСЕН ДДС → Дт 4539 / Кт 501/503. */
function statiyaOtPlateno(p: {
  readonly id: string;
  readonly data: string;
  readonly period: string;
  readonly suma_st: number;
  readonly nachin: string;
}): Statiya | undefined {
  if (!dvizhi(p.suma_st)) return undefined;
  const s: Statiya = {
    id: p.id,
    data: p.data,
    opis: `внесен ДДС за ${p.period}`,
    dnevnik: 'dds',
    kontragent: '',
    redove: [
      ...red('4539', 'debit', p.suma_st, 'погасено задължение'),
      ...red(smetkataNaParite(p.nachin), 'kredit', p.suma_st, 'платени пари'),
    ],
  };
  proveriStatiya(s);
  return s;
}

// ── КНИГАТА ЗА ЕДИН ПЕРИОД ────────────────────────────────────────────────

export interface GlavnaKniga {
  readonly period: Period;
  readonly statii: readonly Statiya[];
  readonly debit_st: number;
  readonly kredit_st: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
  /**
   * Колко източника НЕ раждат статия, защото не местят пари (нула или
   * повредена сума). Нула е обичайното; всяко друго число иска поглед.
   */
  readonly bezDvizhenie: number;
}

function sumaNa(statii: readonly Statiya[], strana: Strana): number {
  let sbor = 0;
  for (const s of statii) {
    for (const r of s.redove) if (r.strana === strana) sbor += r.suma_st;
  }
  return sbor;
}

/** Оборотът по ЕДНА сметка за периода · дебит и кредит поотделно. */
interface OborotNaSmetka {
  readonly smetka: Smetka;
  readonly debit_st: number;
  readonly kredit_st: number;
  readonly broi: number;
}

export function oboroti(kniga: GlavnaKniga): readonly OborotNaSmetka[] {
  const po = new Map<string, { debit_st: number; kredit_st: number; broi: number }>();
  for (const s of kniga.statii) {
    for (const r of s.redove) {
      const veche = po.get(r.smetka) ?? { debit_st: 0, kredit_st: 0, broi: 0 };
      po.set(r.smetka, {
        debit_st: veche.debit_st + (r.strana === 'debit' ? r.suma_st : 0),
        kredit_st: veche.kredit_st + (r.strana === 'kredit' ? r.suma_st : 0),
        broi: veche.broi + 1,
      });
    }
  }
  return Object.freeze(
    SMETKOPLAN.filter((s) => po.has(s.nomer)).map((s) => ({ smetka: s, ...po.get(s.nomer)! })),
  );
}

/**
 * ГЛАВНАТА КНИГА за един период · и сверката, която я пази.
 *
 * Редът на статиите е по ДАТА, после по вид дневник: така файлът се чете от
 * човек и се сравнява с предишния си вариант ред по ред.
 */
export function glavnaKniga(o: Ogledalo, period: Period, kogato: string): GlavnaKniga {
  const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.period === period);
  const plashtaniya = [...o.plashtaniya.values()].filter((p) => p.data.slice(0, 7) === period);
  const razhodi = razhodiZaPerioda(o, period);
  const platenoDDS = [...o.platenoDDS.values()].filter((p) => p.data.slice(0, 7) === period);

  /**
   * ИЗТОЧНИЦИТЕ · всеки със сумата, по която се съди дали изобщо мести пари.
   * Държат се заедно, за да се броят ВЕДНЪЖ и по едно правило (`dvizhi`).
   */
  const iztochnitsi: readonly number[] = [
    ...vzemaniya.map((v) => v.nachisleno_st),
    ...plashtaniya.map((p) => p.suma_st),
    ...razhodi.map((r) => r.suma_st),
    ...platenoDDS.map((p) => p.suma_st),
  ];
  const bezDvizhenie = iztochnitsi.filter((suma) => !dvizhi(suma)).length;

  const statii: Statiya[] = [
    ...vzemaniya.map((v) => statiyaOtVzemane(v, o)),
    ...plashtaniya.map((p) => statiyaOtPlashtane(p, o)),
    ...razhodi.map(statiyaOtRazhod),
    ...platenoDDS.map(statiyaOtPlateno),
  ].filter((s): s is Statiya => s !== undefined);

  /**
   * ПРИКЛЮЧВАЩАТА влиза САМО при подадена справка.
   *
   * Изходящият и входящият се смятат от СЪЩИТЕ статии, не втори път от
   * Огледалото: два пътя до едно число се разминават точно когато някой
   * поправи само единия (правило 17).
   */
  const spravka = o.spravki.get(period);
  let priklyuchvashta = 0;
  if (spravka) {
    const ddsOt = (nomer: string, strana: Strana) =>
      statii.reduce(
        (sbor, s) =>
          sbor + s.redove.reduce((v, r) => v + (r.smetka === nomer && r.strana === strana ? r.suma_st : 0), 0),
        0,
      );
    const zatvarya = statiyaOtSpravka(period, ddsOt('4532', 'kredit'), ddsOt('4531', 'debit'), spravka.data);
    if (zatvarya) {
      statii.push(zatvarya);
      priklyuchvashta = 1;
    }
  }

  statii.sort((a, b) => a.data.localeCompare(b.data) || a.dnevnik.localeCompare(b.dnevnik) || a.id.localeCompare(b.id));

  const debit_st = sumaNa(statii, 'debit');
  const kredit_st = sumaNa(statii, 'kredit');

  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka(`Главна книга ${period} · дебит ↔ кредит`, debit_st, kredit_st, kogato, MERKA.pari),
  );
  /**
   * СПРАВКАТА СЕ БРОИ САМО КОГАТО Е РОДИЛА СТАТИЯ.
   *
   * Дотук тук стоеше `(spravka ? 1 : 0)` — и това беше ЛЪЖЛИВА ТРЕВОГА при
   * най-обикновения случай за целевия клиент: наемодател само с ЖИЛИЩНИ наеми.
   * Там ставката е 0%, изходящият и входящият ДДС са нула, `statiyaOtSpravka`
   * връща `undefined` (празна статия не се ражда) — а сверката пак броеше
   * справката и обявяваше разлика от ЕДИН запис.
   *
   * Последицата не беше козметична: `nared` падаше на `false`, а одитният
   * файл пишеше „Главната книга не затваря" върху книга, чиито дебит и кредит
   * са равни до цент. Проверка, която крещи при вярно състояние, се научава
   * да се пренебрегва — и тогава мълчи и когато трябва да крещи.
   */
  dnevnik.zapishi(
    sverka(
      `Главна книга ${period} · източници ↔ статии`,
      iztochnitsi.length - bezDvizhenie + priklyuchvashta,
      statii.length,
      kogato,
      MERKA.broy,
    ),
  );

  return {
    period,
    statii: Object.freeze(statii),
    debit_st,
    kredit_st,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
    bezDvizhenie,
  };
}
