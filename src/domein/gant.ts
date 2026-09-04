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
import { BEZ_STOYNOST } from './otcheti.js';
import {
  koloniNaTakta,
  kolkoSeVizhdat,
  type KolonaNaTakta,
  type SvoyPeriod,
  type Takt,
} from './vreme.js';

/**
 * ТАКТЪТ ЖИВЕЕ В `vreme.ts` · тук се СТРОИ решетката от него.
 *
 * Дотук този файл беше единият от четирите дома на времето (`TAKTOVE` тук,
 * `STAPKI` при коефициентите, дванайсетте месеца при диаграмите, четирите думи
 * за давност при филтрите). Правило 17: един факт, един дом — и домът е
 * `vreme.ts`, защото Калкулаторът реже период със същите имена, а той няма
 * работа да внася от Ганта.
 */
export type { Takt } from './vreme.js';

/** Лентата на едно дело върху решетката. */
interface Lenta {
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
  readonly koloni: readonly KolonaNaTakta[];
  /** колко от тях се побират на екран — останалите са зад скрола */
  readonly vidimi: number;
  readonly lenti: readonly Lenta[];
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
export function lentaNa(d: Delo, k: readonly KolonaNaTakta[]): Lenta | null {
  if (k.length === 0) return null;
  const parva = k[0]!;
  const posledna = k[k.length - 1]!;
  if (d.do < parva.ot || d.ot > posledna.do) return null;

  let ot = k.findIndex((x) => x.do >= d.ot);
  if (ot < 0) ot = 0;
  // КРАЯТ се търси ОТЗАД-НАПРЕД, не отпред. При такт „ден" осем колони носят
  // ЕДИН и същ ден (осемте му работни часа): търсено отпред, еднодневното дело
  // заемаше ПЪРВИЯ час и изглеждаше като „час работа", а то трае целия ден.
  let doIndeks = -1;
  for (let i = k.length - 1; i >= 0; i -= 1) {
    if (k[i]!.ot <= d.do) { doIndeks = i; break; }
  }
  if (doIndeks < ot) doIndeks = ot;

  return {
    deloId: d.id,
    ot,
    broy: Math.max(1, doIndeks - ot + 1),
    izlizaNalyavo: d.ot < parva.ot,
    izlizaNadyasno: d.do > posledna.do,
  };
}

/** Цялата решетка за едно множество дела. */
export function reshetka(
  dela: readonly Delo[],
  takt: Takt,
  dnes: string,
  svoy?: SvoyPeriod,
): Reshetka {
  const k = koloniNaTakta(takt, dnes, svoy);
  const lenti: Lenta[] = [];
  for (const d of dela) {
    const l = lentaNa(d, k);
    if (l) lenti.push(l);
  }
  return { takt, koloni: k, vidimi: kolkoSeVizhdat(takt, dnes, svoy), lenti };
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
interface SumaVKolona {
  readonly prihod_st: number;
  readonly razhod_st: number;
  /**
   * КОЛКО КОЛОНИ покрива клетката · нула значи „тук няма клетка".
   *
   * ПАРИТЕ НЯМАТ ЧАС. Плащането и разходът носят ДАТА — в Журнала няма поле за
   * час и няма да има, защото банковото извлечение също не го носи. При такт
   * „ден" осемте колони са часове от ЕДИН ден: сумата му стои ВЕДНЪЖ, разпъната
   * над осемте, вместо да се повтори осем пъти (осемкратна лъжа) или да се
   * размаже по часове (измислено число).
   */
  readonly obhvat: number;
}

/** Един ред с пари · дневната сума, вече отнесена към своя разрез. */
export interface DenevnaSuma {
  readonly data: string;
  readonly prihod_st: number;
  readonly razhod_st: number;
  readonly razrez?: string;
  readonly nadpis?: string;
}

/** Клетките на един ред · ЕДИН дом за логиката, два входа към нея. */
function kletkiNaKolonite(
  k: readonly KolonaNaTakta[],
  redove: readonly DenevnaSuma[],
): SumaVKolona[] {
  return k.map((kol, i) => {
    // Колона, която дели деня си с предишната (часовете на такт „ден"), не носи
    // своя клетка: сумата вече е разпъната над нея.
    const predishna = k[i - 1];
    if (kol.chas !== undefined && predishna?.ot === kol.ot) {
      return { prihod_st: 0, razhod_st: 0, obhvat: 0 };
    }
    let obhvat = 1;
    if (kol.chas !== undefined) {
      while (k[i + obhvat]?.ot === kol.ot) obhvat += 1;
    }
    let prihod_st = 0;
    let razhod_st = 0;
    for (const d of redove) {
      if (d.data >= kol.ot && d.data <= kol.do) {
        prihod_st += d.prihod_st;
        razhod_st += d.razhod_st;
      }
    }
    return { prihod_st, razhod_st, obhvat };
  });
}

export function obobshtenRed(
  k: readonly KolonaNaTakta[],
  poDni: readonly DenevnaSuma[],
): SumaVKolona[] {
  return kletkiNaKolonite(k, poDni);
}

/** Един ред от разбивката · своя ключ, свой надпис, свои клетки. */
export interface RedNaRazrez {
  readonly klyuch: string;
  readonly nadpis: string;
  readonly kletki: readonly SumaVKolona[];
}

/**
 * РАЗБИВКАТА · по ред на разрез (резен 13б · И102).
 *
 * Негов въпрос, 27.08: „…разбивки по контрагенти от банковите извлечения и да
 * се покажат в таблицата **сумирано за такта на диаграмата**."
 *
 * Тук е втората половина на отговора. Първата е в `otcheti.ts`: там всеки ред
 * получава КЛЮЧ по избрания разрез. Тук ключовете стават РЕДОВЕ върху същата
 * решетка — значи разбивката и общият сбор се смятат от едно и също място и не
 * могат да се разминат.
 *
 * СВЕРКАТА ВХОД↔ИЗХОД (правило 7) излиза даром и се пази с тест: всеки ред пада
 * в ТОЧНО една кофа, значи сборът на разрезите Е неразбитият сбор. Ако някой ден
 * не е — това е дефект, не закръгление.
 *
 * Подредбата: по надпис, а кофата „(няма)" пада НАКРАЯ — тя е остатъкът, не
 * контрагент.
 */
export function obobshteniRedove(
  k: readonly KolonaNaTakta[],
  poDni: readonly DenevnaSuma[],
): RedNaRazrez[] {
  const po = new Map<string, { nadpis: string; redove: DenevnaSuma[] }>();
  for (const d of poDni) {
    const klyuch = d.razrez ?? '';
    let v = po.get(klyuch);
    if (!v) {
      v = { nadpis: d.nadpis ?? '', redove: [] };
      po.set(klyuch, v);
    }
    v.redove.push(d);
  }
  return [...po.entries()]
    .map(([klyuch, v]) => ({ klyuch, nadpis: v.nadpis, kletki: kletkiNaKolonite(k, v.redove) }))
    .sort((a, b) => tezhest(a.nadpis) - tezhest(b.nadpis) || a.nadpis.localeCompare(b.nadpis, 'bg'));
}

/** Остатъчната кофа върви последна · тя не е контрагент, а „нищо от това". */
function tezhest(nadpis: string): number {
  return nadpis === BEZ_STOYNOST ? 1 : 0;
}

/**
 * КОЕ СЕ ВИЖДА · таблицата, диаграмата, или двете.
 *
 * Негово, 31.08, за таблицата на Ганта: „**Да и на двете места. Да може да се
 * крие.**" Тоест таблицата остава И в Управление, И в Сметки, а скриването е
 * ЛИЧЕН избор на екрана, не решение на кода.
 *
 * ЗАЩО ЧИСТА ФУНКЦИЯ, А НЕ ДВА `if`-а НА ДВА ЕКРАНА. Правилото има ЕДНО място,
 * където може да сгреши: и двете скрити наведнъж оставят празна секция, в която
 * човекът вижда изчезнала работа, а не скрит изглед. Затова последното видимо
 * не се скрива, и отказът се КАЗВА (правило 15) — вместо да се преглътне.
 *
 * Скриването пипа САМО екрана: нито сбор, нито Журнал, нито износ (правило 23).
 */
export interface KoeSeVizhda {
  readonly tablitsa: boolean;
  readonly diagrama: boolean;
}

export type KoePrevkluchva = 'tablitsa' | 'diagrama';

export interface Prevkluchvane {
  readonly sled: KoeSeVizhda;
  /** празно, когато е станало · иначе ПРИЧИНАТА с думи */
  readonly otkaz: string;
}

export function prevkluchi(sega: KoeSeVizhda, koe: KoePrevkluchva): Prevkluchvane {
  const sled = { ...sega, [koe]: !sega[koe] };
  if (!sled.tablitsa && !sled.diagrama) {
    return Object.freeze({
      sled: sega,
      otkaz: 'Последният изглед не се скрива — иначе секцията остава празна.',
    });
  }
  return Object.freeze({ sled: Object.freeze(sled), otkaz: '' });
}

/** Думите на бутона · казват какво ще СТАНЕ, не какво е сега. */
export function dumataNaButona(sega: KoeSeVizhda, koe: KoePrevkluchva): string {
  const ime = koe === 'tablitsa' ? 'таблицата' : 'диаграмата';
  return `${sega[koe] ? 'Скрий' : 'Покажи'} ${ime}`;
}

/** Може ли изобщо · за да не се предлага избор, който ще бъде отказан. */
export function mozheDaSeSkrie(sega: KoeSeVizhda, koe: KoePrevkluchva): boolean {
  return prevkluchi(sega, koe).otkaz === '';
}
/**
 * ДВЕТЕ ТЕМИ НА ДИАГРАМАТА · Текст и Пари (резен 114 · ADR-160).
 *
 * Негово, 03.09 (И133): „**Календара и Диаграмата на Гант са едно** и за това
 * нека Диаграмата на Гант има **филтър с две теми, Тейст и пари**. Така едната
 * ще кореспондира с Управление, а другата в сметки и така да са дадени, но да
 * могат да се сменят от падащо меню и да са заедно."
 *
 * ═══ ЕДНО, И ОТДОЛУ ═══
 *
 * „Едно" не е сравнение, а факт: и делата, и парите се рисуват върху ЕДНА
 * времева ос (`reshetka`), а парите на деня идват от ЕДНА обиколка (`poDni`) —
 * същата, която пълни и календара с цифрите (ADR-100). Затова тук не се строи
 * втора диаграма, а се избира КАКВО стои върху общата ос.
 *
 * ═══ ЗАЩО ДВЕ, А НЕ ВСИЧКО НАВЕДНЪЖ ═══
 *
 * Дотук диаграмата рисуваше делата ВИНАГИ, а парите — когато ги подадат.
 * В Управление това е вярно (там делата са работата), в Сметки — не: там парите
 * са работата, а делата са копие за сверка. Темата казва кое е предмет и кое
 * е фон, вместо екранът да го гадае по това дали някой е подал числа.
 *
 * Подразбраната тема е СВОЙСТВО НА ЕКРАНА, не на кода на диаграмата: „едната ще
 * кореспондира с Управление, а другата в сметки". Смяната е поглед (памет на
 * устройството), не запис.
 */
export const TEMI_NA_DIAGRAMATA = ['tekst', 'pari'] as const;

export type TemaNaDiagramata = (typeof TEMI_NA_DIAGRAMATA)[number];

export const IMENA_NA_TEMITE: Readonly<Record<TemaNaDiagramata, string>> = Object.freeze({
  tekst: 'Текст · делата',
  pari: 'Пари · приход и разход',
});

/**
 * С КОЯ ТЕМА СЕ ОТВАРЯ ЕДИН ЕКРАН · неговото „кореспондира".
 *
 * Ключът е онзи на погледа (`gant` · `smetki` · личното). Непознат ключ пада на
 * ТЕКСТ: диаграма без подадени пари е диаграма на делата, а не празно поле.
 */
export function podrazbranaTema(klyuchNaEkrana: string): TemaNaDiagramata {
  return klyuchNaEkrana === 'smetki' ? 'pari' : 'tekst';
}

