/**
 * ОБЩАТА ГЛАВА НА СЕМЕЙСТВОТО · две таблици стават една (резен 62).
 *
 * ═══ НАХОДКАТА · неговите ДВА листа не могат да се съберат ═══
 *
 * „приходи · Винтекс Строй АД" носи два листа с една и съща работа — продажби
 * на два обекта. Главите им обаче НЕ съвпадат:
 *
 *   · „Малинова" има БЕЗИМЕННА колона (цена на кв.м) между „квадратура" и
 *     „цена" — и оттам нататък всичко е изместено с ЕДНО спрямо „Студентски";
 *   · едно и също се казва с различни думи: „АКТ 15 банка" ↔ „15 банка",
 *     „АКТ 16 банка " ↔ „АКТ 16 " — включително интервал накрая;
 *   · „Студентски" има колона „15 кеш", каквато „Малинова" няма изобщо.
 *
 * Сборът по такива две глави е сбор по НОМЕР НА КОЛОНА — и събира цената на
 * единия обект с цената на квадратния метър на другия. Числото излиза, изглежда
 * като пари и е невярно.
 *
 * ═══ НЕГОВАТА ДУМА ═══
 *
 * „Фактурите и двете са с еднакъв хедър. Така се групират." (ред 935)
 * „…когато създаваш нови колони в хедърите, те се появяват на таблици, които
 *  работят с еднакви хедъри." (ред 1982)
 * „…той сам да ги вкарва и връзва през таблици с еднакви хедъри с такива с
 *  различни." (И32)
 *
 * Тоест еднаквостта не е дадена — тя се ПРАВИ, и я прави човекът.
 *
 * ═══ МАШИНАТА ПРЕДЛАГА, ЧОВЕКЪТ РЕШАВА (правило 18) ═══
 *
 * Тук НЕ живее речник на синонимите. „АКТ 15 банка" и „15 банка" се срещат по
 * ОБЩИ ДУМИ и се ПРЕДЛАГАТ; двойката става факт чак когато човек я потвърди и
 * тя влезе в Журнала. Автоматично слята глава би слепила „ПД банка" с
 * „НС банка" — те също делят дума.
 *
 * ═══ ЕДНАКВОСТТА НА ИМЕТО Е БЕЛЕГ, НЕ САМОТО ИМЕ ═══
 *
 * „цена смр " и „цена смр" са една колона; „АКТ 16 банка " и „АКТ 16 банка"
 * също. Затова сравнението гледа БЕЛЕГА (NFC · без крайни интервали · свити
 * вътрешни · долен регистър), а показва ИМЕТО, дословно както го е писал той.
 */

import { bezimennaE } from './tablitsa-ot-fayl.js';

/**
 * БЕЛЕГЪТ НА ИМЕТО · за СРАВНЕНИЕ, никога за показване.
 *
 * NFC е на Вратата за целия Журнал (правило 12); тук се прилага пак, защото
 * сравняваните имена идват от ЧУЖД файл и още не са минали през нея.
 */
export function belegNaIme(ime: string): string {
  return ime.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Една колона, както влиза в сравнението. */
export interface KolonaNaGlava {
  /** номерът ѝ в своята таблица, като низ — същият ключ, който носят редовете */
  readonly kolona: string;
  /** името, дословно от файла */
  readonly ime: string;
}

/** Две колони, за които е казано, че са ЕДНО и също. */
export interface Dvoyka {
  readonly a: string;
  readonly b: string;
}

export interface Sravnenie {
  /** съвпадат по белег · нищо не се пита за тях */
  readonly ednakvi: readonly { readonly ime: string; readonly a: string; readonly b: string }[];
  readonly samoA: readonly KolonaNaGlava[];
  readonly samoB: readonly KolonaNaGlava[];
  /** предложения по общи думи · предложение, не решение */
  readonly predlozheni: readonly {
    readonly a: string;
    readonly b: string;
    readonly zashto: string;
  }[];
  readonly sverka: {
    readonly a: number;
    readonly b: number;
    readonly ednakvi: number;
    readonly razlika: number;
  };
}

/**
 * КОЛОНИТЕ, КОИТО НОСЯТ НЕГОВА ДУМА · само те се свързват сами.
 *
 * Празната отпада: тя няма име, по което да е нечия. Но отпада и „Колона 21" —
 * това е НАШЕ временно име (`imeNaBezimenna`), дадено по НОМЕР. Две таблици с
 * „Колона 21" не са роднини; сливането им щеше да е сливане по ПОЗИЦИЯ,
 * преоблечено като по име — точно повредата, срещу която е целият този файл.
 *
 * Човекът може да ги свърже с двойка, ако наистина са едно и също.
 */
function imenuvanite(glavi: readonly string[]): KolonaNaGlava[] {
  const van: KolonaNaGlava[] = [];
  for (const [i, ime] of glavi.entries()) {
    if (ime.trim() !== '' && !bezimennaE(ime)) van.push({ kolona: String(i), ime });
  }
  return van;
}

/** Думите на едно име · за търсене на близост, не за сравнение. */
function dumite(ime: string): Set<string> {
  return new Set(belegNaIme(ime).split(/[^\p{L}\p{N}]+/u).filter((d) => d !== ''));
}

/**
 * СРАВНЯВА ДВЕ ГЛАВИ · какво съвпада, какво е само тук, какво прилича.
 *
 * Сверката брои и двете страни: всяка колона на всяка глава е или еднаква, или
 * само своя. Разлика различна от нула значи, че колона се е изгубила по пътя.
 */
export function sravniGlavi(glaviA: readonly string[], glaviB: readonly string[]): Sravnenie {
  const a = imenuvanite(glaviA);
  const b = imenuvanite(glaviB);
  const poBelegB = new Map<string, KolonaNaGlava>();
  for (const k of b) if (!poBelegB.has(belegNaIme(k.ime))) poBelegB.set(belegNaIme(k.ime), k);

  const ednakvi: { ime: string; a: string; b: string }[] = [];
  const vzeti = new Set<string>();
  const samoA: KolonaNaGlava[] = [];
  for (const k of a) {
    const sreshtu = poBelegB.get(belegNaIme(k.ime));
    if (sreshtu !== undefined && !vzeti.has(sreshtu.kolona)) {
      ednakvi.push({ ime: k.ime, a: k.kolona, b: sreshtu.kolona });
      vzeti.add(sreshtu.kolona);
    } else {
      samoA.push(k);
    }
  }
  const samoB = b.filter((k) => !vzeti.has(k.kolona));

  // ── БЛИЗОСТТА · обща дума, и то не коя да е ────────────────────────────────
  // Двойка се предлага само когато ЕДНОТО име се съдържа в думите на другото:
  // „15 банка" ⊂ „АКТ 15 банка". Гола обща дума би сватосала „ПД банка" с
  // „НС банка" — те делят „банка" и не са едно и също.
  const predlozheni: { a: string; b: string; zashto: string }[] = [];
  for (const ka of samoA) {
    const da = dumite(ka.ime);
    if (da.size === 0) continue;
    for (const kb of samoB) {
      const db = dumite(kb.ime);
      if (db.size === 0) continue;
      const vsichkiOtA = [...da].every((d) => db.has(d));
      const vsichkiOtB = [...db].every((d) => da.has(d));
      if (!vsichkiOtA && !vsichkiOtB) continue;
      const obshti = [...da].filter((d) => db.has(d));
      predlozheni.push({
        a: ka.kolona,
        b: kb.kolona,
        zashto: `думите на едното са в другото: ${obshti.map((d) => `„${d}"`).join(' · ')}`,
      });
    }
  }

  return {
    ednakvi,
    samoA,
    samoB,
    predlozheni,
    sverka: {
      a: a.length,
      b: b.length,
      ednakvi: ednakvi.length,
      razlika: a.length - ednakvi.length - samoA.length + (b.length - ednakvi.length - samoB.length),
    },
  };
}

/** Една таблица, както влиза в общата глава. */
export interface UchastnikVSemeystvo {
  readonly tablitsa: string;
  readonly glavi: readonly string[];
}

export interface ObshtataGlava {
  /** имената на общата глава, по ред */
  readonly koloni: readonly string[];
  /** таблица → своя колона → номер в ОБЩАТА глава (като низ) */
  readonly kartata: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly sverka: {
    /** колко именувани колони са дошли отвсякъде */
    readonly vhod: number;
    /** колко реда има картата · всяка колона трябва да е точно веднъж */
    readonly izhod: number;
    readonly razlika: number;
  };
}

/**
 * СТРОИ ОБЩАТА ГЛАВА · от еднаквите по име и от потвърдените двойки.
 *
 * Колона, за която НИКОЙ не е казал, че е нечия, НЕ пада: тя влиза в общата
 * глава сама за себе си, и картата казва, че само една таблица я дава. Негово
 * (ред 1982): „някои хедъри имат индивидуални колони за себе си."
 *
 * `dvoyki` е списък от `[таблица · колона] ↔ [таблица · колона]`, потвърдени от
 * човека. Веригата се затваря: ако A₁↔B₁ и B₁↔C₁, трите са ЕДНА колона.
 */
export function obshtaGlava(
  uchastnitsi: readonly UchastnikVSemeystvo[],
  dvoyki: readonly { readonly tablitsaA: string; readonly a: string; readonly tablitsaB: string; readonly b: string }[],
): ObshtataGlava {
  const adres = (t: string, k: string): string => `${t.length}:${t}${k}`;

  // ── СЪЮЗЪТ · кой с кого е една колона ─────────────────────────────────────
  const rod = new Map<string, string>();
  const koren = (x: string): string => {
    let t = x;
    while (rod.get(t) !== undefined && rod.get(t) !== t) t = rod.get(t)!;
    return t;
  };
  const svarzhi = (x: string, y: string): void => {
    const kx = koren(x);
    const ky = koren(y);
    if (kx !== ky) rod.set(ky, kx);
  };

  const vsichki: { t: string; k: string; ime: string }[] = [];
  for (const u of uchastnitsi) {
    for (const [i, ime] of u.glavi.entries()) {
      if (ime.trim() === '') continue;
      const id = adres(u.tablitsa, String(i));
      rod.set(id, id);
      vsichki.push({ t: u.tablitsa, k: String(i), ime });
    }
  }
  // ЕДНАКВОТО ИМЕ свързва САМО. Двойките на човека — също.
  const poBeleg = new Map<string, string>();
  for (const v of vsichki) {
    // ПЛЕЙСХОЛДЪРЪТ влиза в общата глава (той е колона с данни), но НЕ свързва:
    // „Колона 21" е наше име по номер, не негова дума.
    if (bezimennaE(v.ime)) continue;
    const b = belegNaIme(v.ime);
    const id = adres(v.t, v.k);
    const parvi = poBeleg.get(b);
    if (parvi === undefined) poBeleg.set(b, id);
    else svarzhi(parvi, id);
  }
  for (const d of dvoyki) svarzhi(adres(d.tablitsaA, d.a), adres(d.tablitsaB, d.b));

  // ── ОБЩАТА ГЛАВА · по реда на първата ѝ поява ─────────────────────────────
  const redNaKorena = new Map<string, number>();
  const koloni: string[] = [];
  const kartata: Record<string, Record<string, string>> = {};
  for (const v of vsichki) {
    const k = koren(adres(v.t, v.k));
    let nomer = redNaKorena.get(k);
    if (nomer === undefined) {
      nomer = koloni.length;
      redNaKorena.set(k, nomer);
      koloni.push(v.ime);
    }
    (kartata[v.t] ??= {})[v.k] = String(nomer);
  }

  const izhod = Object.values(kartata).reduce((s, m) => s + Object.keys(m).length, 0);
  return {
    koloni,
    kartata,
    sverka: { vhod: vsichki.length, izhod, razlika: vsichki.length - izhod },
  };
}

// ── ПАЗАЧЪТ · какво Вратата не пуска ────────────────────────────────────────

export class GreshkaSemeystvo extends Error {
  override readonly name = 'GreshkaSemeystvo';
}

/**
 * ПРОВЕРЯВА едно семейство, преди да влезе в Журнала.
 *
 * `glaviteNa` е ГЛАВАТА на всяка таблица, както я знае Огледалото — не както я
 * подава екранът. Иначе карта, сочеща колона №40 на таблица с 20 колони, щеше
 * да влезе и да лъже до първото четене.
 */
export function proveriSemeystvo(
  p: {
    readonly klyuch: string;
    readonly tablitsi: readonly string[];
    readonly koloni: readonly string[];
    readonly kartata: Readonly<Record<string, Readonly<Record<string, string>>>>;
    readonly mahnato: boolean;
  },
  glaviteNa: ReadonlyMap<string, readonly string[]>,
): void {
  if (p.klyuch.trim() === '') {
    throw new GreshkaSemeystvo('Семейството иска име — безименното не се намира после.');
  }
  // РАЗПУСНАТОТО не се проверява по-нататък: то тъкмо казва „това вече не важи",
  // а таблица от него може междувременно да е махната.
  if (p.mahnato) return;

  if (new Set(p.tablitsi).size < 2) {
    throw new GreshkaSemeystvo(
      'Семейството иска ПОНЕ ДВЕ различни таблици — една таблица си е сама глава.',
    );
  }
  if (p.koloni.length === 0 || p.koloni.some((k) => k.trim() === '')) {
    throw new GreshkaSemeystvo('Общата глава не търпи празно име на колона.');
  }

  for (const t of p.tablitsi) {
    const glavi = glaviteNa.get(t);
    if (glavi === undefined) {
      throw new GreshkaSemeystvo(`Таблица „${t}" я няма — семейство от липсваща таблица няма.`);
    }
    const moyata = p.kartata[t];
    if (moyata === undefined) {
      throw new GreshkaSemeystvo(`Таблица „${t}" е в семейството, но няма нито една свързана колона.`);
    }
    const zaeti = new Set<string>();
    for (const [svoya, obshta] of Object.entries(moyata)) {
      const nomer = Number(svoya);
      if (!Number.isInteger(nomer) || nomer < 0 || nomer >= glavi.length) {
        throw new GreshkaSemeystvo(`Таблица „${t}" няма колона №${svoya}.`);
      }
      const kam = Number(obshta);
      if (!Number.isInteger(kam) || kam < 0 || kam >= p.koloni.length) {
        throw new GreshkaSemeystvo(`Общата глава няма колона №${obshta}.`);
      }
      // ДВЕ свои колони към ЕДНА обща е сбор на две различни неща в едно число.
      if (zaeti.has(obshta)) {
        throw new GreshkaSemeystvo(
          `Таблица „${t}" сочи ДВЕ свои колони към „${p.koloni[kam]}" — това би събрало две различни числа в едно.`,
        );
      }
      zaeti.add(obshta);
    }
  }

  // Колона от общата глава, която НИКОЯ таблица не дава, е име без стойност.
  const dadeni = new Set<string>();
  for (const t of p.tablitsi) {
    for (const obshta of Object.values(p.kartata[t] ?? {})) dadeni.add(obshta);
  }
  for (let i = 0; i < p.koloni.length; i += 1) {
    if (!dadeni.has(String(i))) {
      throw new GreshkaSemeystvo(
        `Колоната „${p.koloni[i]}" в общата глава не идва от нито една таблица.`,
      );
    }
  }
}

// ── ЧЕТЕНЕТО · редовете на цялото семейство, през ЕДНА глава ────────────────

/** Един ред, преведен към общата глава. Ключовете са номера в НЕЯ. */
export interface RedVObshtata {
  readonly tablitsa: string;
  readonly red: string;
  readonly pari_st: Readonly<Record<string, number>>;
  readonly chisla: Readonly<Record<string, number>>;
  readonly tekst: Readonly<Record<string, string>>;
}

/** Толкова от реда, колкото това четене ползва · без вид и без глава. */
interface RedZaChetene {
  readonly pari_st: Readonly<Record<string, number>>;
  readonly chisla: Readonly<Record<string, number>>;
  readonly tekst: Readonly<Record<string, string>>;
  readonly mahnat: boolean;
}

interface CheteneNaSemeystvo {
  readonly redove: readonly RedVObshtata[];
  readonly sverka: {
    /** живите редове по таблиците, преброени ПРЕДИ превода */
    readonly vhod: number;
    readonly izhod: number;
    readonly razlika: number;
    /** клетки, чиято колона не е в общата глава · пропуснати НАРОЧНО и преброени */
    readonly bezDom: number;
  };
}

/**
 * ПРЕВЕЖДА редовете на цялото семейство към общата глава.
 *
 * Тук е цялата полза от резена: два листа с разместени колони се четат като
 * ЕДНА таблица, и сборът по колона събира едно и също нещо. Без него сборът
 * върви по НОМЕР и събира цената на единия обект с цената на квадратния метър
 * на другия — число, което излиза и е невярно.
 *
 * Махнатият ред НЕ влиза (той е решение на човек), а клетка, чиято колона няма
 * дом в общата глава, се пропуска и се БРОИ. Мълчаливо пропусната клетка е
 * загубено число.
 */
export function redoveVObshtataGlava(
  semeystvo: {
    readonly tablitsi: readonly string[];
    readonly kartata: Readonly<Record<string, Readonly<Record<string, string>>>>;
  },
  redoveNaTablitsi: ReadonlyMap<string, ReadonlyMap<string, RedZaChetene>>,
): CheteneNaSemeystvo {
  const redove: RedVObshtata[] = [];
  let vhod = 0;
  let bezDom = 0;

  for (const t of semeystvo.tablitsi) {
    const karta = semeystvo.kartata[t] ?? {};
    for (const [klyuch, r] of redoveNaTablitsi.get(t) ?? []) {
      if (r.mahnat) continue;
      vhod += 1;
      const pari_st: Record<string, number> = {};
      const chisla: Record<string, number> = {};
      const tekst: Record<string, string> = {};
      for (const [kolona, stoynost] of Object.entries(r.pari_st)) {
        const kam = karta[kolona];
        if (kam === undefined) bezDom += 1;
        else pari_st[kam] = stoynost;
      }
      for (const [kolona, stoynost] of Object.entries(r.chisla)) {
        const kam = karta[kolona];
        if (kam === undefined) bezDom += 1;
        else chisla[kam] = stoynost;
      }
      for (const [kolona, stoynost] of Object.entries(r.tekst)) {
        const kam = karta[kolona];
        if (kam === undefined) bezDom += 1;
        else tekst[kam] = stoynost;
      }
      redove.push({ tablitsa: t, red: klyuch, pari_st, chisla, tekst });
    }
  }

  return {
    redove,
    sverka: { vhod, izhod: redove.length, razlika: vhod - redove.length, bezDom },
  };
}

/**
 * СБОРЪТ на една ОБЩА колона · през цялото семейство, в цели центове.
 *
 * Своя функция, а не общата на една таблица: там ключът е колона на таблицата,
 * тук — колона на ОБЩАТА глава. Смесени, двете дават сбор по грешен номер точно
 * когато главите се разминават — тоест винаги, когато семейството има смисъл.
 */
export function sborNaObshtaKolona(
  redove: readonly RedVObshtata[],
  kolona: string,
): number {
  let sbor = 0;
  for (const r of redove) sbor += r.pari_st[kolona] ?? 0;
  return sbor;
}

/**
 * КОИ ДВЕ ТАБЛИЦИ И КАКВА ОБЩА ГЛАВА · ЕДИН дом за избора (правило 17).
 *
 * Екранът го викаше ДВА пъти — веднъж, за да покаже, и веднъж, за да запише — и
 * двата преписа бяха ред по ред еднакви. Обходът за дублирано ги хвана още
 * същия ден. Разминат ли се, човек ще запише ДРУГО от онова, което вижда.
 *
 * `potvardeni` са ключовете на потвърдените двойки, всеки „своя колона|своя
 * колона" — както ги носи отметката на екрана.
 */
export function izboratZaSemeystvo(
  tablitsi: readonly UchastnikVSemeystvo[],
  semA: string,
  semB: string,
  potvardeni: ReadonlySet<string>,
): {
  readonly a: UchastnikVSemeystvo;
  readonly b: UchastnikVSemeystvo;
  readonly obshtata: ObshtataGlava;
} | undefined {
  const a = tablitsi.find((t) => t.tablitsa === semA) ?? tablitsi[0];
  if (a === undefined) return undefined;
  const b = tablitsi.find((t) => t.tablitsa === semB && t.tablitsa !== a.tablitsa)
    ?? tablitsi.find((t) => t.tablitsa !== a.tablitsa);
  if (b === undefined) return undefined;
  const dvoyki = [...potvardeni]
    .map((k) => k.split('|'))
    .filter((ch): ch is [string, string] => ch.length === 2)
    .map(([ka, kb]) => ({ tablitsaA: a.tablitsa, a: ka, tablitsaB: b.tablitsa, b: kb }));
  return { a, b, obshtata: obshtaGlava([a, b], dvoyki) };
}
