/**
 * ЛИЧНИТЕ ПАРИ · приход, разход и КРЕДИТ по теми (И96 т.10).
 *
 * Негови думи, дословно:
 *
 *   „Там се въвеждат **по теми** личните Разходи и Приходи. Регистрира се с
 *    **извлеченията на карти** и после сортира по теми **кое къде отива**…
 *    И на едно място по един събран **деликатно** начин да се събере всичко
 *    лично… тук да е събрана едно **кредит, приход, разход**. Да може да се
 *    добавя и редактира лично. **Не го попълвай там.**"
 *
 * ═══ ТРИТЕ НЕЩА НЕ СА ТРИ ВИДА ЗАПИС ═══
 *
 * Приходът и разходът са СЪБИТИЯ — случили са се на дата и не се менят.
 * Кредитът е СЪСТОЯНИЕ — има салдо, което събитията менят. Затова движението
 * е едно, кредитът е свой запис, а остатъкът му НЕ се пази никъде: смята се
 * при всяко четене (правило 17).
 *
 * ═══ „НЕ ГО ПОПЪЛВАЙ ТАМ" ═══
 *
 * Този файл няма примерни данни и няма да има. Служебната страна има
 * „Малинова Долина", за да се вижда как работи; личната почва ПРАЗНА, защото
 * измислен ред в чужд личен Журнал е по-лош от празен екран — той изглежда
 * като нещо, което човекът е записал и е забравил.
 *
 * ═══ КАКВО ТУК НЯМА ═══
 *
 * Няма ДДС, няма акумулатори, няма сектори. Личният разход не се облага и
 * няма справка, която да замрази месеца му — `proveriZamrazen` чете `spravki`
 * от СВОЯ Журнал, а в личния такива няма и не бива да има. Тоест правило 9 не
 * важи тук ПО КОНСТРУКЦИЯ, а не защото някой го е изключил.
 */

import { deliZakragleno } from '../yadro/pari.js';
import { podravni } from './padashti-menyuta.js';
import type { PayloadLichnoDvizhenieZapisano } from './sabitiya.js';

export class GreshkaLichniPari extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaLichniPari';
  }
}

// ── ТЕМИТЕ ─────────────────────────────────────────────────────────────────

export interface LichnaTema {
  readonly temaId: string;
  readonly ime: string;
  /** празно = „Без група" · групата е ИМЕ, не същност */
  readonly grupa: string;
  readonly spryana: boolean;
}

export const BEZ_GRUPA = 'Без група';
export const BEZ_TEMA = 'Без тема';

/**
 * Прави и проверява една тема.
 *
 * РЕГИСТЪРЪТ НЕ СЕ СВЕЖДА (И97 т.13): маха се излишният интервал, главните
 * букви остават. „Кола" и „кола" може да са различни неща, а темата е ИМЕ в
 * речник, не машинен ключ.
 */
export function napraviTema(n: {
  temaId: string;
  ime: string;
  grupa?: string;
  spryana?: boolean;
}): LichnaTema {
  const ime = podravni(n.ime);
  if (ime === '') {
    throw new GreshkaLichniPari('Темата иска име — без него редовете под нея не значат нищо.');
  }
  if (ime.length > 60) {
    throw new GreshkaLichniPari('Името на темата е твърде дълго — 60 знака стигат.');
  }
  return Object.freeze({
    temaId: n.temaId,
    ime,
    grupa: podravni(n.grupa ?? ''),
    spryana: n.spryana ?? false,
  });
}

/** Кои теми се ПРЕДЛАГАТ · спрените не се трият, само падат от списъка. */
export function predlaganiTemi(vsichki: Iterable<LichnaTema>): readonly LichnaTema[] {
  return [...vsichki]
    .filter((t) => !t.spryana)
    .sort((a, b) => a.grupa.localeCompare(b.grupa) || a.ime.localeCompare(b.ime));
}

/** Темите, подредени по група · за менюто и за екрана. */
export function temiPoGrupi(
  vsichki: Iterable<LichnaTema>,
): readonly { readonly grupa: string; readonly temi: readonly LichnaTema[] }[] {
  const po = new Map<string, LichnaTema[]>();
  for (const t of predlaganiTemi(vsichki)) {
    const g = t.grupa === '' ? BEZ_GRUPA : t.grupa;
    const spisak = po.get(g);
    if (spisak) spisak.push(t);
    else po.set(g, [t]);
  }
  return [...po.entries()]
    .sort(([a], [b]) => (a === BEZ_GRUPA ? 1 : b === BEZ_GRUPA ? -1 : a.localeCompare(b)))
    .map(([grupa, temi]) => Object.freeze({ grupa, temi: Object.freeze(temi) }));
}

// ── ДВИЖЕНИЕТО ─────────────────────────────────────────────────────────────

export interface LichnoDvizhenie {
  readonly dvizhenieId: string;
  readonly data: string;
  readonly posoka: 'prihod' | 'razhod';
  readonly suma_st: number;
  readonly temaId: string;
  readonly koy: string;
  readonly opis: string;
  readonly dokument: string;
  readonly klyuch: string;
  readonly izvor: string;
  readonly kreditId: string;
  readonly glavnitsa_st: number;
  readonly lihva_st: number;
  readonly taksa_st: number;
  /** изключен от сборовете с решение на човек (правило 23) */
  readonly izklyuchen: boolean;
  /** защо е изключен · празно, когато не е */
  readonly prichina: string;
}

/** Дошло ли е от файл, или човек го е написал · същата граница като `razhodi`. */
export function otIzvlechenie(d: LichnoDvizhenie): boolean {
  return d.klyuch !== '';
}

/**
 * КОЛКО ОТ ЕДНО ДВИЖЕНИЕ Е РАЗХОД · единственият дом на този въпрос.
 *
 * За обикновения ред отговорът е скучен: цялата сума. За ВНОСКА ПО КРЕДИТ той
 * е друг, и разликата не е естетическа, а математическа:
 *
 *   ГЛАВНИЦАТА НЕ Е РАЗХОД. Тя е движение между два джоба — кешът пада с
 *   612,34, дългът пада с 324,84, и нетното богатство пада само с ЛИХВАТА.
 *   Записана като разход, тя надува месечните разходи с точния си размер, а
 *   богатството се брои двойно.
 *
 * Всичките водещи стигат дотам по различни пътища: YNAB прави главницата
 * ТРАНСФЕР (изобщо не е разход), MoneyWiz иска две отделни категории, Monarch
 * показва principal и interest поотделно.
 *
 * ЕДИН ДОМ, защото този въпрос се задава на четири места (сборът по теми,
 * редът на Ганта, диаграмата, разписката) и четири отговора биха се разминали
 * в деня, в който единият се поправи.
 */
export function razhodnaChast(d: LichnoDvizhenie): number {
  if (d.posoka !== 'razhod') return 0;
  if (d.kreditId === '') return d.suma_st;
  return d.lihva_st + d.taksa_st;
}

/** Колко от движението е приход · симетрично, за да няма два въпроса. */
export function prihodnaChast(d: LichnoDvizhenie): number {
  return d.posoka === 'prihod' ? d.suma_st : 0;
}

/**
 * ИНВАРИАНТЪТ НА ВНОСКАТА · трите части СЪБИРАТ вноската, точно.
 *
 * Проверява се в ДОМЕЙНА, не във Вратата: Вратата знае, че числото е цяло —
 * че трите се събират до четвъртото е знание за смисъла, не за формата.
 */
export function proveriChastite(d: PayloadLichnoDvizhenieZapisano): void {
  const eVnoska = (d.kreditId ?? '') !== '';
  const g = d.glavnitsa_st ?? 0;
  const l = d.lihva_st ?? 0;
  const t = d.taksa_st ?? 0;
  if (!eVnoska) {
    if (g !== 0 || l !== 0 || t !== 0) {
      throw new GreshkaLichniPari(
        'Главница, лихва и такса имат смисъл САМО при вноска по кредит. ' +
          'Посочи кой кредит, или махни трите числа.',
      );
    }
    return;
  }
  if (g < 0 || l < 0 || t < 0) {
    throw new GreshkaLichniPari('Главница, лихва и такса не може да са отрицателни.');
  }
  if (g + l + t !== d.suma_st) {
    throw new GreshkaLichniPari(
      `Трите части не събират вноската: ${g} + ${l} + ${t} = ${g + l + t}, ` +
        `а вноската е ${d.suma_st} (в цели центове). Вноска, чиито части не се ` +
        'събират, поправя остатъка по кредита с грешно число.',
    );
  }
}

// ── КРЕДИТЪТ ───────────────────────────────────────────────────────────────

export const VIDOVE_KREDIT = ['ipoteka', 'potrebitelski', 'lizing', 'zaem'] as const;

export type VidKredit = (typeof VIDOVE_KREDIT)[number];

export const IMENA_NA_VIDOVETE_KREDIT: Readonly<Record<VidKredit, string>> = Object.freeze({
  ipoteka: 'ипотечен',
  potrebitelski: 'потребителски',
  lizing: 'лизинг',
  zaem: 'заем',
});

export interface LichenKredit {
  readonly kreditId: string;
  readonly ime: string;
  readonly vid: VidKredit;
  /** остатъкът В ДЕНЯ `ot` — кредитът се вписва по средата, не от първия ден */
  readonly ostatak_st: number;
  readonly ot: string;
  readonly lihva_bp: number;
  readonly vnoska_st: number;
  readonly den: number;
  readonly temaId: string;
}

/** 100 % = 10 000 базисни пункта; на месец се дели на 12 → 120 000. */
export const BAZISNI_ZA_MESETS = 120_000;

/**
 * ЛИХВАТА ЗА ЕДИН МЕСЕЦ · целочислено, от остатъка.
 *
 * `остатък × годишни базисни пунктове ÷ (10 000 × 12)`
 *
 * Степенуването на анюитетната формула ИЗОБЩО не влиза тук, и това е ключът
 * към целите центове: вноската се ВЪВЕЖДА от договора — банката вече я е
 * сметнала и погасителният план е в него. Тогава месец по месец всичко е
 * цяло: лихвата от остатъка, главницата като разлика, новият остатък.
 *
 * Най-лошият реален случай не прелива: остатък 10 000 000 00 ц. (10 млн. €)
 * по 5 000 б.п. дава 5 × 10¹² — далеч под 2⁵³.
 */
export function lihvaZaMesetsa(ostatak_st: number, lihva_bp: number): number {
  if (!Number.isSafeInteger(ostatak_st) || !Number.isSafeInteger(lihva_bp)) {
    throw new GreshkaLichniPari('Остатъкът е в цели центове, а лихвата — в цели базисни пунктове.');
  }
  if (lihva_bp < 0) throw new GreshkaLichniPari('Лихвата не може да е отрицателна.');
  return deliZakragleno(ostatak_st * lihva_bp, BAZISNI_ZA_MESETS);
}

/**
 * КАК СЕ ДЕЛИ ЕДНА ВНОСКА · предложение, не запис (правило 18).
 *
 * Смята се от остатъка към днес; човекът вижда двете числа и записва. Ако
 * вноската е по-малка от лихвата (случва се при просрочие), главницата би
 * излязла отрицателна — вместо това цялата вноска отива в лихва и се КАЗВА.
 */
export function predlozhiVnoska(
  ostatak_st: number,
  lihva_bp: number,
  vnoska_st: number,
): { readonly lihva_st: number; readonly glavnitsa_st: number; readonly stiga: boolean } {
  const lihva_st = lihvaZaMesetsa(ostatak_st, lihva_bp);
  if (lihva_st >= vnoska_st) {
    return Object.freeze({ lihva_st: vnoska_st, glavnitsa_st: 0, stiga: false });
  }
  // Главницата не бива да надхвърли остатъка — последната вноска е по-малка.
  const glavnitsa_st = Math.min(vnoska_st - lihva_st, ostatak_st);
  return Object.freeze({ lihva_st: vnoska_st - glavnitsa_st, glavnitsa_st, stiga: true });
}

/**
 * ОСТАТЪКЪТ ПО ЕДИН КРЕДИТ · СМЯТА се, не се пази.
 *
 * `начален остатък − сбора на главниците по вноските му`
 *
 * Сторнирана вноска пада от сбора САМА, защото Огледалото вече не я носи —
 * остатъкът се поправя без нито един ред допълнителен код. Записан втори път
 * като поле, той щеше да се разминава точно в деня, в който някой сторнира.
 *
 * Изключеният ред (правило 23) НЕ пипа остатъка: изключването е за СБОРОВЕТЕ
 * на екрана, а вноската по кредит е платена, каквото и да е решил човекът за
 * месечната си статистика.
 */
export function ostatakNaKredita(
  k: LichenKredit,
  dvizheniya: Iterable<LichnoDvizhenie>,
): number {
  let platena = 0;
  for (const d of dvizheniya) {
    if (d.kreditId === k.kreditId) platena += d.glavnitsa_st;
  }
  return k.ostatak_st - platena;
}

/** Погасен ли е · СМЯТА се от остатъка, няма поле „затворен". */
export function pogasenLiE(k: LichenKredit, dvizheniya: Iterable<LichnoDvizhenie>): boolean {
  return ostatakNaKredita(k, dvizheniya) <= 0;
}

// ── СБОРОВЕТЕ ──────────────────────────────────────────────────────────────

export interface SborPoTema {
  readonly temaId: string;
  readonly ime: string;
  readonly grupa: string;
  readonly prihod_st: number;
  readonly razhod_st: number;
  readonly broy: number;
}

/**
 * СБОРЪТ ПО ТЕМИ · „кое къде отива", преброено.
 *
 * ИЗКЛЮЧЕНИТЕ РЕДОВЕ НЕ ВЛИЗАТ, но и не изчезват — те се броят отделно, за да
 * не изглежда сборът по-малък без обяснение (правило 23: „скритото ПАК се
 * смята"; тук е обратното — изключеното е решение на човек и се вижда).
 *
 * Разходната част минава през `razhodnaChast`, значи вноската по кредит влиза
 * със СВОЯТА лихва, не с цялата си сума.
 */
export function sborovePoTemi(
  dvizheniya: Iterable<LichnoDvizhenie>,
  temi: ReadonlyMap<string, LichnaTema>,
  ot = '',
  do_ = '',
): readonly SborPoTema[] {
  const po = new Map<string, { prihod_st: number; razhod_st: number; broy: number }>();
  for (const d of dvizheniya) {
    if (d.izklyuchen) continue;
    if (ot !== '' && d.data < ot) continue;
    if (do_ !== '' && d.data > do_) continue;
    const k = d.temaId;
    const v = po.get(k) ?? { prihod_st: 0, razhod_st: 0, broy: 0 };
    v.prihod_st += prihodnaChast(d);
    v.razhod_st += razhodnaChast(d);
    v.broy += 1;
    po.set(k, v);
  }
  return [...po.entries()]
    .map(([temaId, v]) => {
      const t = temi.get(temaId);
      return Object.freeze({
        temaId,
        ime: t?.ime ?? BEZ_TEMA,
        grupa: t?.grupa ?? '',
        prihod_st: v.prihod_st,
        razhod_st: v.razhod_st,
        broy: v.broy,
      });
    })
    .sort((a, b) => b.razhod_st - a.razhod_st || b.prihod_st - a.prihod_st || a.ime.localeCompare(b.ime));
}

/** Двата общи сбора · за лентата и за сверката. */
export function obshtoPari(dvizheniya: Iterable<LichnoDvizhenie>): {
  readonly prihod_st: number;
  readonly razhod_st: number;
  readonly izklyucheni: number;
} {
  let prihod_st = 0;
  let razhod_st = 0;
  let izklyucheni = 0;
  for (const d of dvizheniya) {
    if (d.izklyuchen) {
      izklyucheni += 1;
      continue;
    }
    prihod_st += prihodnaChast(d);
    razhod_st += razhodnaChast(d);
  }
  return Object.freeze({ prihod_st, razhod_st, izklyucheni });
}
