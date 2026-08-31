/**
 * СВЕРКАТА С ИЗВЛЕЧЕНИЯТА · книгата срещу банката (резен 17в).
 *
 * ═══ НЕГОВИТЕ ДУМИ · ДВА ПЪТИ, С ОСЕМНАЙСЕТ ДНИ РАЗЛИКА ═══
 *
 * 11.08 *(р83·[27])*, и оттам „Фактури Банка не е таблица, а СВЕРКА":
 *
 *   „да рам се връзва с папка Извлечения. От там чете и сравнява с Наеми Банка
 *    и Платени фактури с Карата. Ако не ги намира в сверката в Извлечение
 *    светва и до тях в ощедно поле с дебела цифра и броя мрюесеци се смятат."
 *
 * 29.08:
 *
 *   „За разходите и приходите по банка се сравняват с извлеченията, а за
 *    кешовите приходи и разходи се въвеждат на ръка и се сравняват с банкови
 *    извлечения за платено на ръка с карта. За останалите се прави списък за
 *    счетоводството — единият за платени фактури на ръка без карта, и приход
 *    на ръка от наем без банка."
 *
 * Второто изречение не е ново задание, а ВТОРО КАЗВАНЕ на първото. Затова тук
 * няма измислен механизъм: има неговия, построен.
 *
 * ═══ ТРИТЕ НАЧИНА И ДВЕТЕ СЪДБИ ═══
 *
 * | начин | търси ли се в извлечението | защо |
 * | :---- | :---- | :---- |
 * | банка | ДА | нареждането оставя ред |
 * | карта | ДА | плаща се на ръка, но парите излизат от сметката |
 * | в брой | НЕ | няма банка, значи няма ред · отива в СПИСЪКА |
 *
 * „В брой" НЕ Е НАХОДКА. Ненамереният кеш не е грешка — той е нормалното му
 * състояние; грешка щеше да е да се търси и после да „свети" всеки месец.
 * Затова той не влиза сред ненамерените, а в неговите ДВА СПИСЪКА за
 * счетоводството.
 *
 * ═══ ЗАЩО НЕ СЕ ПИШЕ НИЩО ОТ ИЗВЛЕЧЕНИЕТО ═══
 *
 * Извлечението е ЧУЖД ФАКТ — банката го казва, не ние. Влиза в сметката, не в
 * Журнала: същото решение като при отговора на Google (ADR-064). В Журнала
 * влиза само СВЕРКАТА — вход, изход и разликата, дори когато е нула (правило
 * 7), през същото събитие `СверкаЗаписана`, което вече съществува.
 *
 * Затова тук няма ново събитие. Резен, който не ражда събитие, е по-евтин от
 * резен, който ражда — и тази цена се плаща веднъж, при четенето.
 *
 * ═══ КАК СЕ ПОЗНАВА РЕДЪТ · и защо СБЛЪСЪКЪТ Е НАХОДКА ═══
 *
 * Сумата е ТОЧНА до цент; датата — в прозорец, защото банката осчетоводява
 * със закъснение. Няколко реда, които пасват на един запис, НЕ се решават от
 * машината: тя ги ПОКАЗВА (правило 6 · правило 18). Тихият избор между два
 * еднакви реда е точно грешката, която никой не намира после.
 */

import type { Ogledalo, Plashtane } from '../ogledalo/ogledalo.js';
import type { RedOtKarta } from '../iztochnik/karta.js';
import { MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import type { NachinNaPlashtane } from './sabitiya.js';

export class GreshkaSverkaIzvlechenie extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaSverkaIzvlechenie';
  }
}

/**
 * ПРОЗОРЕЦЪТ В ДНИ · колко късно банката може да осчетоводи.
 *
 * Три дни, а не нула: наем, платен в петък, влиза в извлечението в понеделник.
 * Нулев прозорец би обявил всеки петъчен наем за липсващ — и справката щеше да
 * свети всеки месец, докато човек спре да я гледа.
 *
 * И не повече: широкият прозорец сближава РАЗЛИЧНИ месеци, а месецът е
 * единицата на всичко тук (ДДС, замразяване, отчет).
 */
export const PROZORETS_DNI = 3;

/** Кои начини оставят следа в банката · изброено, не гадано. */
const TARSYAT_SE: readonly NachinNaPlashtane[] = Object.freeze(['банка', 'карта']);

export function seTarsiVIzvlechenieto(nachin: string): boolean {
  return (TARSYAT_SE as readonly string[]).includes(nachin);
}

/** Един запис от КНИГАТА, сведен до онова, по което се познава. */
export interface ZapisZaSverka {
  /** `plashtane:<id>` или `razhod:<id>` — следата назад към същността */
  readonly klyuch: string;
  readonly posoka: 'prihod' | 'razhod';
  readonly data: string;
  readonly suma_st: number;
  readonly nachin: NachinNaPlashtane;
  /** кой е насреща · наемател или доставчик, за окото */
  readonly koy: string;
  /**
   * ДОГОВОРЪТ · `naemId` на наема, през който е дошло плащането (резен 36).
   *
   * Негова дума *(р84·[28])*: „в извлечения да се сверява с филтър за
   * КОНКРЕТЕН ИЗБОР НА ДОГОВОРИ по филтруте и филттите."
   *
   * ПРАЗНО е ЧЕСТНО и значи „този запис не принадлежи на договор": разходите
   * нямат наем, а плащане с изгубена връзка също. Слети с „всички", те щяха да
   * се появяват под всеки избран договор.
   */
  readonly dogovor: string;
}

/** Какво е станало с един запис при срещата с извлечението. */
export type Sadba =
  /** намерен е ТОЧНО един ред — сверено */
  | 'nameren'
  /** търси се, но го няма в извлечението — НАХОДКА, „свети" */
  | 'lipsva'
  /** пасват няколко реда · човек решава, не машината */
  | 'nyakolko'
  /** не се търси (в брой) — отива в списъка за счетоводството */
  | 'bezBanka';

export interface RedNaSverkata {
  readonly zapis: ZapisZaSverka;
  readonly sadba: Sadba;
  /** ключовете на редовете от извлечението, които пасват */
  readonly sreshtu: readonly string[];
}

/** Ред от ИЗВЛЕЧЕНИЕТО, който няма насреща си запис в книгата. */
export interface SamoVBankata {
  readonly klyuch: string;
  readonly data: string;
  readonly posoka: 'prihod' | 'razhod';
  readonly suma_st: number;
  readonly koy: string;
}

export interface RezultatNaSverkata {
  readonly period: string;
  readonly redove: readonly RedNaSverkata[];
  readonly samoVBankata: readonly SamoVBankata[];
  /** сборът на КНИГАТА за периода · входът на сверката */
  readonly vhod_st: number;
  /** сборът на онова, което се е СРЕЩНАЛО с извлечението · изходът */
  readonly izhod_st: number;
  /** обхватът на самото извлечение · извън него не се съди за нищо */
  readonly ot: string;
  readonly do: string;
}

/** Дните между две дати по ISO · цяло число, без часови пояси. */
function dniMezhdu(a: string, b: string): number {
  const den = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / den);
}

/**
 * ЗАПИСИТЕ НА КНИГАТА за един месец · плащанията и разходите заедно.
 *
 * Заедно, а не поотделно: извлечението не знае кое е приход и кое разход по
 * нашите таблици, то знае само посока и сума. Две отделни сверки биха дали
 * две числа за едно извлечение — и когато не затворят, никой няма да знае
 * коя от двете е счупената (същата причина като при месеците в `sveryavane.ts`).
 */
export function zapisiteNaKnigata(o: Ogledalo, period: string): readonly ZapisZaSverka[] {
  const redove: ZapisZaSverka[] = [];
  for (const p of o.plashtaniya.values()) {
    if (p.data.slice(0, 7) !== period) continue;
    redove.push({
      klyuch: `plashtane:${p.id}`,
      posoka: 'prihod',
      data: p.data.slice(0, 10),
      suma_st: p.suma_st,
      nachin: p.nachin as NachinNaPlashtane,
      koy: koyPlashta(o, p),
      dogovor: o.vzemaniya.get(p.vzemaneId)?.naemId ?? '',
    });
  }
  for (const r of o.razhodi.values()) {
    if (r.data.slice(0, 7) !== period) continue;
    redove.push({
      klyuch: `razhod:${r.id}`,
      posoka: 'razhod',
      data: r.data.slice(0, 10),
      suma_st: r.suma_st,
      nachin: r.nachin as NachinNaPlashtane,
      koy: r.dostavchik,
      // РАЗХОДЪТ НЯМА ДОГОВОР · празното тук не е пропуск, а факт.
      dogovor: '',
    });
  }
  return Object.freeze(redove);
}

/** Кой е платил · през вземането към наема, защото плащането носи само връзка. */
function koyPlashta(o: Ogledalo, p: Plashtane): string {
  const v = o.vzemaniya.get(p.vzemaneId);
  if (!v) return '';
  return o.naemi.get(v.naemId)?.naemetel ?? '';
}

/**
 * СРЕЩАТА · книгата срещу редовете на извлечението.
 *
 * ЕДИН ред от извлечението се харчи ВЕДНЪЖ. Иначе две еднакви плащания от
 * 500,00 биха се сверили и двете срещу ЕДИН банков ред, и липсата на второто
 * щеше да изчезне — точно обратното на онова, за което сверката съществува.
 */
export function sverkaSIzvlechenie(n: {
  readonly period: string;
  readonly zapisi: readonly ZapisZaSverka[];
  readonly izvlechenie: readonly RedOtKarta[];
  readonly ot: string;
  readonly do: string;
}): RezultatNaSverkata {
  if (!/^\d{4}-\d{2}$/.test(n.period)) {
    throw new GreshkaSverkaIzvlechenie(`Периодът се пише „ГГГГ-ММ"; получено: „${n.period}".`);
  }

  const izharcheni = new Set<string>();
  const redove: RedNaSverkata[] = [];

  for (const zapis of n.zapisi) {
    if (!seTarsiVIzvlechenieto(zapis.nachin)) {
      redove.push({ zapis, sadba: 'bezBanka', sreshtu: Object.freeze([]) });
      continue;
    }
    const pasvat = n.izvlechenie.filter(
      (r) =>
        !izharcheni.has(r.klyuch) &&
        r.suma_st === zapis.suma_st &&
        r.posoka === zapis.posoka &&
        Math.abs(dniMezhdu(zapis.data, r.data)) <= PROZORETS_DNI,
    );
    if (pasvat.length === 1) {
      izharcheni.add(pasvat[0]!.klyuch);
      redove.push({ zapis, sadba: 'nameren', sreshtu: Object.freeze([pasvat[0]!.klyuch]) });
    } else if (pasvat.length === 0) {
      redove.push({ zapis, sadba: 'lipsva', sreshtu: Object.freeze([]) });
    } else {
      // НЕ СЕ ИЗБИРА · човек решава (правило 18). И нито един не се харчи:
      // избран наум, той би липсвал на истинския си запис по-нататък.
      redove.push({
        zapis,
        sadba: 'nyakolko',
        sreshtu: Object.freeze(pasvat.map((r) => r.klyuch)),
      });
    }
  }

  const samoVBankata = n.izvlechenie
    .filter((r) => !izharcheni.has(r.klyuch))
    .map((r) => ({
      klyuch: r.klyuch,
      data: r.data,
      posoka: r.posoka,
      suma_st: r.suma_st,
      koy: r.koy,
    }));

  // ВХОДЪТ е книгата ЦЯЛА — и кешът влиза в него. Изваден, сверката щеше да
  // затваря винаги и нямаше да мери нищо.
  const vhod_st = n.zapisi.reduce((s, z) => s + z.suma_st, 0);
  const izhod_st = redove
    .filter((r) => r.sadba === 'nameren' || r.sadba === 'bezBanka')
    .reduce((s, r) => s + r.zapis.suma_st, 0);

  return Object.freeze({
    period: n.period,
    redove: Object.freeze(redove),
    samoVBankata: Object.freeze(samoVBankata),
    vhod_st,
    izhod_st,
    ot: n.ot,
    do: n.do,
  });
}

/**
 * СВЕРКАТА ВХОД↔ИЗХОД · и разликата се записва, дори когато е нула (правило 7).
 *
 * Разликата е сборът на онова, което книгата твърди, а банката не показва.
 * Нула значи „всичко се среща"; различно от нула значи точно колко пари стоят
 * необяснени — не „има някакъв проблем".
 */
export function sverkataNaIzvlechenieto(r: RezultatNaSverkata, kogato: string): Sverka {
  return sverka(`сверка с извлечение ${r.period}`, r.vhod_st, r.izhod_st, kogato, MERKA.pari);
}

/** „Свети" ли нещо · броят на находките, с които човек има работа. */
export function broyNahodki(r: RezultatNaSverkata): number {
  return (
    r.redove.filter((x) => x.sadba === 'lipsva' || x.sadba === 'nyakolko').length +
    r.samoVBankata.length
  );
}

/**
 * ДВАТА СПИСЪКА ЗА СЧЕТОВОДСТВОТО · негови, поименно.
 *
 * „За останалите се прави списък за счетоводството — единият за платени
 * фактури на ръка без карта, и приход на ръка от наем без банка."
 *
 * Тоест ЕДИН списък с ДВА дяла, разделени по посока. Не са два механизма:
 * критерият е ЕДИН — платено без никаква банкова следа, — а посоката само
 * казва накъде са тръгнали парите.
 */
export interface SpisatsiteZaSchetovodstvoto {
  /** платени фактури НА РЪКА, без карта */
  readonly platenoNaRaka: readonly ZapisZaSverka[];
  /** приход на ръка от наем, без банка */
  readonly prihodNaRaka: readonly ZapisZaSverka[];
  readonly platenoNaRaka_st: number;
  readonly prihodNaRaka_st: number;
}

export function spisatsiteZaSchetovodstvoto(
  r: RezultatNaSverkata,
): SpisatsiteZaSchetovodstvoto {
  const bez = r.redove.filter((x) => x.sadba === 'bezBanka').map((x) => x.zapis);
  const platenoNaRaka = bez.filter((z) => z.posoka === 'razhod');
  const prihodNaRaka = bez.filter((z) => z.posoka === 'prihod');
  return Object.freeze({
    platenoNaRaka: Object.freeze(platenoNaRaka),
    prihodNaRaka: Object.freeze(prihodNaRaka),
    platenoNaRaka_st: platenoNaRaka.reduce((s, z) => s + z.suma_st, 0),
    prihodNaRaka_st: prihodNaRaka.reduce((s, z) => s + z.suma_st, 0),
  });
}

/**
 * „и броя мрюесеци се смятат" · КОЛКО МЕСЕЦА свети едно и също.
 *
 * Негово изречение от 11.08, и то е за ТЪРПЕНИЕТО: един липсващ ред този месец
 * е случайност, същият липсващ ред трети месец подред е проблем. Броят се
 * СМЯТА от периодите, в които записът е останал ненамерен — не се записва,
 * защото се извежда.
 */
export function mesetsiSvetene(
  istoriya: readonly RezultatNaSverkata[],
  klyuch: string,
): number {
  let broy = 0;
  for (const r of [...istoriya].sort((a, b) => b.period.localeCompare(a.period))) {
    const red = r.redove.find((x) => x.zapis.klyuch === klyuch);
    if (!red || (red.sadba !== 'lipsva' && red.sadba !== 'nyakolko')) break;
    broy += 1;
  }
  return broy;
}

/** Думите на съдбата · за екрана, на едно място (правило 17). */
export const IMENA_NA_SADBITE: Readonly<Record<Sadba, string>> = Object.freeze({
  nameren: 'сверен',
  lipsva: 'няма го в извлечението',
  nyakolko: 'пасват няколко реда',
  bezBanka: 'в брой · няма банкова следа',
});

/**
 * МЕСЕЦИТЕ, ПОКРИТИ ОТ ЕДИН ФАЙЛ · от най-ранната до най-късната дата.
 *
 * Извлечението е ОБХВАТ, не месец: човек тегли „последните 90 дни" (същата
 * причина, поради която `lichen-vnos.ts` не сторнира извън обхвата).
 */
export function mesetsiteNaObhvata(ot: string, do_: string): readonly string[] {
  const parvi = ot.slice(0, 7);
  const posleden = do_.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(parvi) || !/^\d{4}-\d{2}$/.test(posleden)) {
    throw new GreshkaSverkaIzvlechenie(`Обхватът иска дати; получено: „${ot}" → „${do_}".`);
  }
  const mesetsi: string[] = [];
  let g = Number(parvi.slice(0, 4));
  let m = Number(parvi.slice(5, 7));
  for (let pazach = 0; pazach < 120; pazach += 1) {
    const sega = `${String(g).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
    mesetsi.push(sega);
    if (sega >= posleden) break;
    m += 1;
    if (m > 12) {
      m = 1;
      g += 1;
    }
  }
  return Object.freeze(mesetsi);
}

/**
 * СВЕРЯВА ВСЕКИ МЕСЕЦ на файла ПООТДЕЛНО · и това не е удобство.
 *
 * Файл за 90 дни, сверен срещу ЕДИН месец, обявява другите два за „само в
 * банката" — шейсет фалшиви находки, които карат човек да спре да гледа
 * справката. Месецът е единицата на всичко тук (ДДС, замразяване, отчет), и
 * сверката го уважава.
 *
 * И оттук идва „броя месеци се смятат": същият запис, ненамерен три месеца
 * подред, вече не е случайност.
 */
export function sverkaPoMesetsi(n: {
  readonly zapisiNaMesetsa: (mesets: string) => readonly ZapisZaSverka[];
  readonly izvlechenie: readonly RedOtKarta[];
  readonly ot: string;
  readonly do: string;
}): readonly RezultatNaSverkata[] {
  return mesetsiteNaObhvata(n.ot, n.do).map((mesets) =>
    sverkaSIzvlechenie({
      period: mesets,
      zapisi: n.zapisiNaMesetsa(mesets),
      // САМО редовете на ТОЗИ месец · инак юнският ред би светил и в май
      izvlechenie: n.izvlechenie.filter((r) => r.data.slice(0, 7) === mesets),
      ot: n.ot,
      do: n.do,
    }),
  );
}

/* ══ ФИЛТЪРЪТ ПО КОНКРЕТЕН ДОГОВОР (резен 36 · M02 · ADR-096) ═══════════════
 *
 * Негова дума *(р84·[28])*: „в извлечения да се сверява с филтър за КОНКРЕТЕН
 * ИЗБОР НА ДОГОВОРИ по филтруте и филттите."
 *
 * ═══ СТЕСНЯВАНЕ, НЕ ВТОРА СВЕРКА ═══
 *
 * Филтърът НЕ пуска сверката наново върху отсято извлечение. Ако книгата се
 * стесни, а банката не, всеки чужд ред щеше да стане „само в банката" — и един
 * договор от три би родил двойно повече фалшиви находки, отколкото истински.
 *
 * Затова се стеснява РЕЗУЛТАТЪТ: същата среща, гледана през един договор.
 *
 * ═══ ЧАСТИТЕ СЕ СЪБИРАТ ДО ЦЯЛОТО ═══
 *
 * Това е проверката, която прави филтъра честен: сборът на всички договори плюс
 * онова БЕЗ договор дава ТОЧНО целия вход. Изгубен или преброен два пъти ред се
 * вижда като число, не като усещане (правило 7 · умение `matematika`).
 */

/** Един договор, както се предлага за избор · с броя си, за да не е сляп изборът. */
export interface DogovorVSverkata {
  readonly id: string;
  /** името на наемателя · празно, ако наемът вече го няма */
  readonly ime: string;
  readonly broy: number;
}

export const BEZ_DOGOVOR = '';

/**
 * КОИ ДОГОВОРИ УЧАСТВАТ · четат се от самата сверка, не от Огледалото.
 *
 * Списък от всички наеми щеше да предлага договори с НУЛА реда за месеца —
 * избор, който води до празен екран и нищо не казва.
 */
export function dogovoriteVSverkata(
  r: RezultatNaSverkata,
  imeNa: (id: string) => string,
): readonly DogovorVSverkata[] {
  const broy = new Map<string, number>();
  for (const x of r.redove) {
    if (x.zapis.dogovor === BEZ_DOGOVOR) continue;
    broy.set(x.zapis.dogovor, (broy.get(x.zapis.dogovor) ?? 0) + 1);
  }
  return Object.freeze(
    [...broy.entries()]
      .map(([id, n]) => Object.freeze({ id, ime: imeNa(id), broy: n }))
      .sort((a, b) => a.ime.localeCompare(b.ime, 'bg') || a.id.localeCompare(b.id)),
  );
}

export interface StesnenaSverka {
  /** избраният договор · празно значи „всички" */
  readonly dogovor: string;
  readonly redove: readonly RedNaSverkata[];
  readonly vhod_st: number;
  readonly izhod_st: number;
  /**
   * Колко реда от извлечението са СКРИТИ · те нямат договор по определение.
   *
   * Числото се КАЗВА, вместо редовете просто да изчезнат (правило 15): иначе
   * човек с избран договор би решил, че находките от банката са свършили.
   */
  readonly skritiOtBankata: number;
}

/**
 * СТЕСНЯВА сверката до един договор · празният избор връща всичко.
 *
 * „Само в банката" се СКРИВА при избран договор, защото банков ред без насрещен
 * запис няма договор — той е находка на цялата книга, не на този наем. Броят
 * му обаче се казва.
 */
export function stesniPoDogovor(r: RezultatNaSverkata, dogovor: string): StesnenaSverka {
  if (dogovor === BEZ_DOGOVOR) {
    return Object.freeze({
      dogovor,
      redove: r.redove,
      vhod_st: r.vhod_st,
      izhod_st: r.izhod_st,
      skritiOtBankata: 0,
    });
  }
  const redove = r.redove.filter((x) => x.zapis.dogovor === dogovor);
  return Object.freeze({
    dogovor,
    redove: Object.freeze(redove),
    vhod_st: redove.reduce((s, x) => s + x.zapis.suma_st, 0),
    // ИЗХОДЪТ е онова, което се е ОБЯСНИЛО · сверено плюс в брой, както при
    // целия месец. Един дом за правилото няма как да има, защото там то се
    // смята върху друг вход — затова тук се повтаря сметката, не числото.
    izhod_st: redove
      .filter((x) => x.sadba === 'nameren' || x.sadba === 'bezBanka')
      .reduce((s, x) => s + x.zapis.suma_st, 0),
    skritiOtBankata: r.samoVBankata.length,
  });
}

/**
 * СВЕРКАТА НА ФИЛТЪРА · частите се събират до цялото (правило 7).
 *
 * Входът е сборът на КНИГАТА за месеца; изходът — сборът на всички стеснявания
 * по договор ПЛЮС онова без договор. Разлика значи, че филтърът е изгубил ред
 * или го е преброил два пъти — най-тихата възможна повреда, защото стеснен
 * списък и без това изглежда по-къс.
 */
export function sveriStesnyavaneto(
  r: RezultatNaSverkata,
  dogovori: readonly DogovorVSverkata[],
  kogato: string,
): Sverka {
  const poDogovori = dogovori.reduce((s, d) => s + stesniPoDogovor(r, d.id).vhod_st, 0);
  const bezDogovor = r.redove
    .filter((x) => x.zapis.dogovor === BEZ_DOGOVOR)
    .reduce((s, x) => s + x.zapis.suma_st, 0);
  return sverka(
    'филтър по договор · частите ↔ цялото',
    r.vhod_st,
    poDogovori + bezDogovor,
    kogato,
    MERKA.pari,
  );
}
