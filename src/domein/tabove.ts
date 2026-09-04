/**
 * ТАБОВЕТЕ И СЕКЦИИТЕ · втората половина на И92 т.9.
 *
 * Негови думи, дословно:
 *
 *   „Да има табове от таблото, които са СТАЦИОНАРНИ, и такива, които се
 *    ДОБАВЯТ. Стационарните пак вътре в тях можеш да добавяш таблици,
 *    графики. Те са на СЕКЦИИ и се комбинират. Абсолютна свобода и контрол."
 *
 * Оттук идва цялото устройство:
 *
 *   ТАБ = списък СЕКЦИИ. Секцията е ЕДНА таблица или ЕДНА графика върху един
 *   източник. Стационарният таб е екран на програмата — не се маха и не се
 *   преименува, но СЕ ДОПЪЛВА със секции. Добавеният таб е изцяло негов.
 *
 * Образецът е Grist (страница = списък виджети, всеки върху една таблица) и
 * Airtable Interfaces (слой НАД данните, показва само каквото е сложено).
 * Взето е и „Select By": изборът в едната секция СТЕСНЯВА другата — това е
 * връзването „в работата им заедно", но върху данни, които приложението
 * наистина държи (`docs/otcheti/prouchvaniya-i92.md`).
 *
 * ЗАЩО СЪБИТИЕ, А НЕ НАСТРОЙКА. Табът решава кой какво вижда. Смени ли се
 * тихо, вчерашният екран е необясним. Промяна = нов запис със същия ключ
 * (правило 1); Огледалото държи последния.
 *
 * ЗАЩО ИЗТОЧНИЦИТЕ СА ИЗБРОЕНИ ПОИМЕННО. „Ще познаем по данните" вече беше
 * пробвано и се счупи (ADR-014). Източник, който го няма тук, не съществува —
 * и това е по-добре от секция, която показва празно и никой не знае защо.
 */

export class GreshkaTab extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaTab';
  }
}

/** Двата вида секция. Нов вид се добавя ТУК, където се вижда. */
const VIDOVE_SEKTSII = ['tablitsa', 'diagrama'] as const;

export type VidSektsiya = (typeof VIDOVE_SEKTSII)[number];

export const IMENA_NA_VIDOVETE_SEKTSII: Readonly<Record<VidSektsiya, string>> = Object.freeze({
  tablitsa: 'таблица',
  diagrama: 'графика',
});

/** Източниците за таблична секция — каквото Огледалото наистина държи. */
export const IZTOCHNITSI_TABLITSA = [
  'imoti',
  'naemi',
  'vzemaniya',
  'plashtaniya',
  'razhodi',
  'dela',
] as const;

export type IztochnikTablitsa = (typeof IZTOCHNITSI_TABLITSA)[number];

export const IMENA_NA_IZTOCHNITSITE: Readonly<Record<IztochnikTablitsa, string>> = Object.freeze({
  imoti: 'Имоти',
  naemi: 'Наеми',
  vzemaniya: 'Вземания',
  plashtaniya: 'Плащания',
  razhodi: 'Разходи',
  dela: 'Дела',
});

/** Източниците за графична секция — двете, които вече са построени. */
export const IZTOCHNITSI_DIAGRAMA = ['mesetsi', 'gant'] as const;

export type IztochnikDiagrama = (typeof IZTOCHNITSI_DIAGRAMA)[number];

export const IMENA_NA_DIAGRAMITE: Readonly<Record<IztochnikDiagrama, string>> = Object.freeze({
  mesetsi: 'Приход и разход по месеци',
  gant: 'Диаграма на Ганта',
});

/**
 * ПО КОЕ СЕ ВРЪЗВАТ ДВЕ СЕКЦИИ · общият ключ.
 *
 * Не всяка двойка има общ ключ, и това не се гадае: `vrazkataE` казва кои
 * връзки са възможни. Връзка, обявена между несвързваеми източници, е тиха
 * лъжа — стеснението просто нищо не прави, а човекът мисли, че работи.
 */
export const VRAZKI = ['imot', 'obekt', 'myasto'] as const;

export type PoKakvo = (typeof VRAZKI)[number];

export const IMENA_NA_VRAZKITE: Readonly<Record<PoKakvo, string>> = Object.freeze({
  imot: 'по обект',
  obekt: 'по обект',
  myasto: 'по място',
});

/** Кои източници носят кой ключ. Липсващият ключ значи „не се връзва". */
const KLYUCHOVE: Readonly<Record<IztochnikTablitsa, readonly PoKakvo[]>> = Object.freeze({
  imoti: ['imot', 'myasto'],
  naemi: ['imot'],
  vzemaniya: ['imot'],
  plashtaniya: ['imot'],
  razhodi: [],
  dela: ['myasto', 'obekt'],
});

/** Може ли секция от този източник да бъде стеснена по този ключ. */
export function nosiKlyucha(iztochnik: IztochnikTablitsa, po: PoKakvo): boolean {
  return (KLYUCHOVE[iztochnik] ?? []).includes(po);
}

export interface Sektsiya {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidSektsiya;
  /** `IztochnikTablitsa` при таблица · `IztochnikDiagrama` при графика */
  readonly iztochnik: string;
  /** ключът на секцията, чийто избор СТЕСНЯВА тази · празно значи свободна */
  readonly svarzanaS: string;
  /** по кое се стеснява · празно, когато няма връзка */
  readonly po: PoKakvo | '';
}

export interface Tab {
  readonly klyuch: string;
  readonly ime: string;
  /** стационарният е екран на програмата: не се маха и не се преименува */
  readonly statsionaren: boolean;
  readonly sektsii: readonly Sektsiya[];
}

/** Ключовете на СТАЦИОНАРНИТЕ табове — екраните, които програмата носи. */
export const STATSIONARNI = [
  'imoti',
  'pari',
  'smetki',
  'stoynost',
  'gant',
  'nastroyki',
  'ii',
  'tablo',
] as const;

export function eStatsionaren(klyuch: string): boolean {
  return (STATSIONARNI as readonly string[]).includes(klyuch);
}

function chistKlyuch(ime: string): string {
  return ime
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '');
}

/** Прави таб и веднага го проверява. Стационарният носи ЗАКОВАН ключ. */
/**
 * ОТКАЗВА ВТОРИ ТАБ СЪС СЪЩИЯ КЛЮЧ · дефект, намерен при голямата сверка.
 *
 * Секцията ВИНАГИ е имала такава проверка (`dobaviSektsiya` по-долу); табът —
 * не. А Огледалото пази ПОСЛЕДНИЯ запис за ключ, и то нарочно: така се
 * ПОПРАВЯ таб, вместо да се раждат два. Двете заедно даваха тиха загуба:
 * човек кръщава нов таб както стар, натиска „Създай", и старият се връща
 * ПРАЗЕН — секциите му изчезват от екрана без нито една дума.
 *
 * ЗАЩО ТУК, А НЕ НА ЕКРАНА. Правило 2 по дух: вторият екран, който запише таб,
 * няма да знае, че проверката съществува. Точно затова и `proveriPromyanata`
 * при агента живее в Действията, не в разметката.
 *
 * ПОПРАВКАТА НЕ СЕ ЗАСЯГА. Тя минава по другия път (`zapishiTab`), защото носи
 * СЪЩИЯ таб с промяна, а не нов празен.
 */
export function proveriNovTab(nov: Tab, sashtestvuvashti: ReadonlyMap<string, Tab>): void {
  const star = sashtestvuvashti.get(nov.klyuch);
  if (star) {
    throw new GreshkaTab(
      `Таб „${star.ime}" вече го има и носи ${star.sektsii.length} секции. ` +
        'Ново име с този ключ би го върнало празен — дай друго име или пипни стария.',
    );
  }
}

export function napraviTab(n: {
  readonly ime: string;
  readonly klyuch?: string;
  readonly statsionaren?: boolean;
  readonly sektsii?: readonly Sektsiya[];
}): Tab {
  const ime = n.ime.trim().replace(/\s+/g, ' ');
  if (ime === '') throw new GreshkaTab('Табът иска име — то стои в лентата на екраните.');

  const statsionaren = n.statsionaren ?? false;
  const klyuch = (n.klyuch ?? '').trim() || chistKlyuch(ime);
  if (klyuch === '') throw new GreshkaTab(`От името „${ime}" не излиза ключ — дай му букви.`);

  if (statsionaren && !eStatsionaren(klyuch)) {
    throw new GreshkaTab(`„${klyuch}" не е екран на програмата — стационарни са само те.`);
  }
  if (!statsionaren && eStatsionaren(klyuch)) {
    throw new GreshkaTab(
      `„${klyuch}" е екран на програмата — собствен таб не заема неговото име.`,
    );
  }

  return Object.freeze({
    klyuch,
    ime,
    statsionaren,
    sektsii: Object.freeze([...(n.sektsii ?? [])]),
  });
}

/**
 * ДОБАВЯ СЕКЦИЯ в края на таба. Стационарният ГИ ПРИЕМА — точно това иска
 * поръчката: „стационарните пак вътре в тях можеш да добавяш таблици, графики".
 */
export function dobaviSektsiya(
  t: Tab,
  n: {
    readonly ime: string;
    readonly vid: VidSektsiya;
    readonly iztochnik: string;
    readonly svarzanaS?: string;
    readonly po?: PoKakvo | '';
  },
): Tab {
  const ime = n.ime.trim().replace(/\s+/g, ' ');
  if (ime === '') throw new GreshkaTab('Секцията иска име — по него се вика при връзване.');

  if (!(VIDOVE_SEKTSII as readonly string[]).includes(n.vid)) {
    throw new GreshkaTab(`Няма такъв вид секция: „${n.vid}".`);
  }
  const pozvoleni: readonly string[] =
    n.vid === 'tablitsa' ? IZTOCHNITSI_TABLITSA : IZTOCHNITSI_DIAGRAMA;
  if (!pozvoleni.includes(n.iztochnik)) {
    throw new GreshkaTab(
      `„${n.iztochnik}" не е източник за ${IMENA_NA_VIDOVETE_SEKTSII[n.vid]}. ` +
        `Изброените са: ${pozvoleni.join(' · ')}.`,
    );
  }

  const klyuch = chistKlyuch(ime);
  if (t.sektsii.some((s) => s.klyuch === klyuch)) {
    throw new GreshkaTab(`Секция „${ime}" вече я има в „${t.ime}".`);
  }

  const sektsiya: Sektsiya = Object.freeze({
    klyuch,
    ime,
    vid: n.vid,
    iztochnik: n.iztochnik,
    svarzanaS: '',
    po: '',
  });

  const nov = Object.freeze({ ...t, sektsii: Object.freeze([...t.sektsii, sektsiya]) });
  // Връзката се дава през СВОЯТА си проверка — иначе тя щеше да се проверява
  // на две места и второто щеше да остане по-снизходително.
  return n.svarzanaS && n.po ? svarzhiSektsii(nov, klyuch, n.svarzanaS, n.po) : nov;
}

/** МАХА секция. Другите, вързани за нея, се РАЗВЪРЗВАТ — не осиротяват. */
export function premahniSektsiya(t: Tab, klyuch: string): Tab {
  if (!t.sektsii.some((s) => s.klyuch === klyuch)) {
    throw new GreshkaTab(`Няма секция „${klyuch}" в „${t.ime}".`);
  }
  return Object.freeze({
    ...t,
    sektsii: Object.freeze(
      t.sektsii
        .filter((s) => s.klyuch !== klyuch)
        .map((s) => (s.svarzanaS === klyuch ? razvarzana(s) : s)),
    ),
  });
}

/** МЕСТИ секция нагоре или надолу · редът на секциите е негов избор. */
export function premestiSektsiya(t: Tab, klyuch: string, kade: 'gore' | 'dolu'): Tab {
  const i = t.sektsii.findIndex((s) => s.klyuch === klyuch);
  if (i < 0) throw new GreshkaTab(`Няма секция „${klyuch}" в „${t.ime}".`);
  const j = kade === 'gore' ? i - 1 : i + 1;
  if (j < 0 || j >= t.sektsii.length) return t; // краят е край, не грешка
  const redom = [...t.sektsii];
  [redom[i], redom[j]] = [redom[j]!, redom[i]!];
  return Object.freeze({ ...t, sektsii: Object.freeze(redom) });
}

/**
 * ВРЪЗВА ДВЕ СЕКЦИИ · изборът в едната СТЕСНЯВА другата (Grist „Select By").
 *
 * Проверява се ВСИЧКО, което може да направи връзката тиха лъжа: че двете
 * секции ги има, че не е сама за себе си, че и двете носят общия ключ, и че
 * не се прави кръг. Кръгът не гърми на екрана — той просто спира да стеснява
 * и никой не разбира защо.
 */
export function svarzhiSektsii(
  t: Tab,
  koya: string,
  sKoya: string,
  po: PoKakvo,
): Tab {
  const a = t.sektsii.find((s) => s.klyuch === koya);
  const b = t.sektsii.find((s) => s.klyuch === sKoya);
  if (!a) throw new GreshkaTab(`Няма секция „${koya}" в „${t.ime}".`);
  if (!b) throw new GreshkaTab(`Няма секция „${sKoya}" в „${t.ime}".`);
  if (koya === sKoya) throw new GreshkaTab('Секция не се връзва сама за себе си.');
  if (!(VRAZKI as readonly string[]).includes(po)) {
    throw new GreshkaTab(`Няма такава връзка: „${po}".`);
  }

  for (const s of [a, b]) {
    if (s.vid !== 'tablitsa') {
      throw new GreshkaTab(`„${s.ime}" е графика — връзват се таблици, не графики.`);
    }
    if (!nosiKlyucha(s.iztochnik as IztochnikTablitsa, po)) {
      throw new GreshkaTab(
        `„${s.ime}" не носи ${IMENA_NA_VRAZKITE[po]} — стеснението не би направило нищо.`,
      );
    }
  }

  // КРЪГЪТ · тръгва се от новата цел и се върви нагоре по веригата.
  let stapka = b;
  const minali = new Set<string>([koya]);
  while (stapka.svarzanaS !== '') {
    if (minali.has(stapka.klyuch)) break;
    minali.add(stapka.klyuch);
    const sled = t.sektsii.find((s) => s.klyuch === stapka.svarzanaS);
    if (!sled) break;
    if (sled.klyuch === koya) {
      throw new GreshkaTab('Връзката прави кръг — тогава нищо не стеснява нищо.');
    }
    stapka = sled;
  }

  return Object.freeze({
    ...t,
    sektsii: Object.freeze(
      t.sektsii.map((s) => (s.klyuch === koya ? Object.freeze({ ...s, svarzanaS: sKoya, po }) : s)),
    ),
  });
}

/** РАЗВЪРЗВА секция · стеснението пада, секцията остава. */
export function razvarzhiSektsiya(t: Tab, klyuch: string): Tab {
  if (!t.sektsii.some((s) => s.klyuch === klyuch)) {
    throw new GreshkaTab(`Няма секция „${klyuch}" в „${t.ime}".`);
  }
  return Object.freeze({
    ...t,
    sektsii: Object.freeze(t.sektsii.map((s) => (s.klyuch === klyuch ? razvarzana(s) : s))),
  });
}

/**
 * СЕКЦИЯТА БЕЗ ВРЪЗКАТА СИ · един израз, две места го викат.
 *
 * Махането на секция развързва вързаните за нея, а развързването прави същото
 * на самата нея. Написан два пъти, изразът се разминава при първото ново поле
 * на връзката — и едното място ще го чисти, другото не.
 */
function razvarzana(s: Sektsiya): Sektsiya {
  return Object.freeze({ ...s, svarzanaS: '', po: '' as const });
}

/**
 * КОИ СЕКЦИИ МОГАТ ДА СТЕСНЯВАТ ТАЗИ · за падащото меню на екрана.
 *
 * Менюто, което предлага невъзможното, го прави, за да получи после грешка —
 * по-добре да не го предлага.
 */
export function vazmozhniIzvori(t: Tab, klyuch: string, po: PoKakvo): readonly Sektsiya[] {
  const svoya = t.sektsii.find((s) => s.klyuch === klyuch);
  if (!svoya || svoya.vid !== 'tablitsa') return Object.freeze([]);
  if (!nosiKlyucha(svoya.iztochnik as IztochnikTablitsa, po)) return Object.freeze([]);
  return Object.freeze(
    t.sektsii.filter(
      (s) =>
        s.klyuch !== klyuch &&
        s.vid === 'tablitsa' &&
        nosiKlyucha(s.iztochnik as IztochnikTablitsa, po),
    ),
  );
}

/** Веригата на стесненията, от самата секция нагоре — за екрана и за теста. */
export function verigaNaStesnenieto(t: Tab, klyuch: string): readonly Sektsiya[] {
  const veriga: Sektsiya[] = [];
  let sega = t.sektsii.find((s) => s.klyuch === klyuch);
  const minali = new Set<string>();
  while (sega && sega.svarzanaS !== '' && !minali.has(sega.klyuch)) {
    minali.add(sega.klyuch);
    const gore = t.sektsii.find((s) => s.klyuch === sega!.svarzanaS);
    if (!gore) break;
    veriga.push(gore);
    sega = gore;
  }
  return Object.freeze(veriga);
}
