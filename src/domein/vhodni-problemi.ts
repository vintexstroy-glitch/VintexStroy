/**
 * ПРОБЛЕМИТЕ ПРИ ВЪВЕЖДАНЕ · цветът, легендата и Вратата (И96 т.1 · т.9).
 *
 * Негови думи: „Нека изолираме текстовите проблеми и ги ограничим на избраната
 * азбука в приложението, и ако има несъответствие от нея + английски и някаква
 * друга азбука, да светне в ЖЪЛТ цвят за редакция… ако има разлики във вида
 * проблем при въвеждане, да оцветява в РАЗЛИЧЕН цвят и с текст да дава ЛЕГЕНДА
 * на цветовете и защо не допуска. Тези неща са параметри при различни бизнеси и
 * да може да ги контролираш от Настройки, и дори стопанинът да дава негова
 * бележка, когато се случи."
 *
 * И т.9: „към Вратата ще се допускат само след като отговарят на изискванията."
 *
 * ═══ ЦВЕТЪТ НАМИРА, ДУМАТА ОБЯСНЯВА ═══
 *
 * Занаятът е категоричен: цветът НИКОГА не носи смисъла сам — далтонизмът е
 * между осем и дванайсет процента от мъжете, а осем цвята не се помнят и от
 * онзи, който ги вижда. Затова тук всеки вид носи ТРИ неща: цвят (за да се
 * намери с око), ЗНАК (за да се различи без цвят) и ДУМА (за да се разбере).
 * Легендата стои на екрана, не в помощ.
 *
 * ═══ ДВЕ СИЛИ, ОСЕМ ВИДА ═══
 *
 * Практиката дели проверките на СПИРАЩИ и ПРЕДУПРЕЖДАВАЩИ. Той иска цвят по
 * ВИД — и това е изпълнимо, стига силата да е отделно свойство. Затова видът
 * казва КАКВО е сбъркано, а силата — дали изобщо може да се запише.
 *
 * ═══ ЗАЩО NFC НЕ СВЕТИ ═══
 *
 * Нормализацията се прави ТИХО на Вратата (правило 12). Тя не е грешка на
 * човека — тя е работа на приложението. Светната, тя би обвинила потребителя за
 * нещо, което клавиатурата му е направила.
 */

export class GreshkaVhod extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaVhod';
  }
}

/** Осемте вида · изброени ПОИМЕННО. Нов се добавя тук, където се вижда. */
export const VIDOVE_PROBLEM = [
  'chuzhda-azbuka',
  'smeseni-azbuki',
  'ne-e-chislo',
  'prazno',
  'izvan-obhvat',
  'dublikat',
  'neviidim-znak',
  'zamrazen-period',
] as const;

export type VidProblem = (typeof VIDOVE_PROBLEM)[number];

/** Двете сили · видът казва КАКВО, силата — може ли изобщо да се запише. */
export type Sila = 'spira' | 'preduprezhdava';

export interface OpisNaProblem {
  readonly vid: VidProblem;
  readonly ime: string;
  /** името на цвета в стила · не самият цвят, той живее в CSS */
  readonly tsvyat: string;
  /** ЗНАКЪТ · за да се различи БЕЗ цвят (далтонизъм) */
  readonly znak: string;
  readonly sila: Sila;
  /** защо не се допуска · това е истинското съобщение */
  readonly zashto: string;
}

/**
 * ЛЕГЕНДАТА · един дом (правило 17).
 *
 * Екранът я чете оттук; Настройки я чете оттук; тестът я брои оттук. Написана
 * втори път на екрана, тя се разминава в деня, в който единият се поправи.
 */
export const OPISI: readonly OpisNaProblem[] = Object.freeze([
  Object.freeze({
    vid: 'chuzhda-azbuka' as const,
    ime: 'Чужда азбука',
    tsvyat: 'zhalto',
    znak: '☲',
    sila: 'preduprezhdava' as const,
    zashto:
      'Знак извън избраната азбука и английската. Приложението го приема, но търсенето и подредбата по него се чупят — затова свети за редакция.',
  }),
  Object.freeze({
    vid: 'smeseni-azbuki' as const,
    ime: 'Смесени азбуки в една дума',
    tsvyat: 'oranzhevo',
    znak: '⚭',
    sila: 'spira' as const,
    zashto:
      'Латинско „о" в кирилска дума изглежда еднакво, но е друг знак. Такава дума не се намира при търсене и никога не се сверява с близнака си.',
  }),
  Object.freeze({
    vid: 'ne-e-chislo' as const,
    ime: 'Не е число',
    tsvyat: 'cherveno',
    znak: '✕',
    sila: 'spira' as const,
    zashto:
      'Полето е за число, а въведеното не е. Парите са цели най-малки единици — дробно число не влиза в Журнала (правило 3).',
  }),
  Object.freeze({
    vid: 'prazno' as const,
    ime: 'Празно задължително поле',
    tsvyat: 'cherveno',
    znak: '✕',
    sila: 'spira' as const,
    zashto: 'Без него записът не значи нищо, а Вратата и без това го отказва.',
  }),
  Object.freeze({
    vid: 'izvan-obhvat' as const,
    ime: 'Извън позволените стойности',
    tsvyat: 'terakota',
    znak: '⊘',
    sila: 'spira' as const,
    zashto:
      'Изброените стойности са закон, не подсказка. Ставка, която не е сред тях, не съществува.',
  }),
  Object.freeze({
    vid: 'dublikat' as const,
    ime: 'Вече го има',
    tsvyat: 'sinio',
    znak: '⧉',
    sila: 'preduprezhdava' as const,
    zashto:
      'Две фактури за една сума в един ден се случват; два документа с един номер — не. Предупреждава, защото понякога е нарочно.',
  }),
  Object.freeze({
    vid: 'neviidim-znak' as const,
    ime: 'Невидим знак',
    tsvyat: 'sivo',
    znak: '◌',
    sila: 'preduprezhdava' as const,
    zashto:
      'Знак с нулева ширина, залепен при копиране от документ. Окото не го вижда, а търсачката се чупи от него.',
  }),
  Object.freeze({
    vid: 'zamrazen-period' as const,
    ime: 'Замразен период',
    tsvyat: 'lilavo',
    znak: '❄',
    sila: 'spira' as const,
    zashto:
      'Подадена ДДС-справка заключва месеца (правило 9). Входът после е само сверена промяна: сторно + ново + следа.',
  }),
]);

const PO_VID = new Map(OPISI.map((o) => [o.vid, o]));

export function opisNaProblem(vid: VidProblem): OpisNaProblem {
  const o = PO_VID.get(vid);
  if (!o) throw new GreshkaVhod(`Няма такъв вид проблем: „${vid}".`);
  return o;
}

/**
 * НАСТРОЙКАТА по вид · „параметри при различни бизнеси" (негово).
 *
 * Всеки вид може да се изключи, да смени силата си и да носи НЕГОВА бележка —
 * текст, който се показва под легендата, когато този вид се случи.
 */
export interface NastroykaNaProblem {
  readonly vklyuchen: boolean;
  readonly sila: Sila;
  /** бележката на Стопанина · празна значи „важи само общото обяснение" */
  readonly belezhka: string;
}

export type NastroykiNaVhoda = Readonly<Record<VidProblem, NastroykaNaProblem>>;

/** По подразбиране: всички включени, със силата от занаята, без бележки. */
export function nastroykiPoPodrazbirane(): NastroykiNaVhoda {
  const n = {} as Record<VidProblem, NastroykaNaProblem>;
  for (const o of OPISI) {
    n[o.vid] = Object.freeze({ vklyuchen: true, sila: o.sila, belezhka: '' });
  }
  return Object.freeze(n);
}

/** Азбуките, между които приложението избира СВОЯТА. Английската е ВИНАГИ позволена. */
export const AZBUKI = ['kirilitsa', 'latinitsa'] as const;

export type Azbuka = (typeof AZBUKI)[number];

export const IMENA_NA_AZBUKITE: Readonly<Record<Azbuka, string>> = Object.freeze({
  kirilitsa: 'кирилица',
  latinitsa: 'латиница',
});

function eKirilska(k: number): boolean {
  return (k >= 0x0400 && k <= 0x04ff) || (k >= 0x0500 && k <= 0x052f);
}

function eLatinska(k: number): boolean {
  return (
    (k >= 0x41 && k <= 0x5a) ||
    (k >= 0x61 && k <= 0x7a) ||
    (k >= 0x00c0 && k <= 0x024f) // латиница с ударения · чуждо име се пише така
  );
}

/**
 * Буква ли е изобщо · цифрите, паузите и препинателните знаци НЕ са.
 *
 * Пита се Уникод, не се гади по обхват. Дотук тук стоеше `k > 0x02ff` —
 * груба черта, която правеше „€" (U+20AC) и „№" (U+2116) на БУКВИ, и всяка
 * фактура с цена светваше „чужда азбука". Хванато от теста, не от окото.
 */
function eBukva(z: string): boolean {
  return /\p{L}/u.test(z);
}

/** Знаците с нулева ширина · залепват се при копиране и не се виждат. */
const NEVIDIMI = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad]);

/** Една находка · какво, къде и с думи. */
export interface Nahodka {
  readonly vid: VidProblem;
  /** коя дума или кой знак · за да се посочи, а не да се търси */
  readonly kade: string;
  readonly kakvo: string;
}

/** Какво се проверява за едно поле · контекстът идва отвън, не се гадае. */
export interface Kontekst {
  /** избраната азбука НА ПРИЛОЖЕНИЕТО */
  readonly azbuka: Azbuka;
  readonly zadalzhitelno?: boolean;
  /** полето е за число · тогава текстът се проверява като число */
  readonly chislovo?: boolean;
  /** изброените позволени стойности · празно значи „няма ограничение" */
  readonly pozvoleni?: readonly string[];
  /** вече съществуващи стойности · за дубликата */
  readonly veche?: readonly string[];
  /** периодът на записа и замразените периоди */
  readonly period?: string;
  readonly zamrazeni?: readonly string[];
}

/**
 * ПРОВЕРЯВА едно въведено поле и връща ВСИЧКИ находки, не първата.
 *
 * Първата находка спира поправката на едно място; човекът поправя, натиска
 * пак, и вижда втора. Всички наведнъж значи една обиколка вместо пет.
 */
export function proveriVhod(
  tekst: string,
  k: Kontekst,
  n: NastroykiNaVhoda = nastroykiPoPodrazbirane(),
): readonly Nahodka[] {
  const nahodki: Nahodka[] = [];
  const dobavi = (vid: VidProblem, kade: string, kakvo: string): void => {
    if (!n[vid].vklyuchen) return;
    nahodki.push(Object.freeze({ vid, kade, kakvo }));
  };

  if (k.zadalzhitelno === true && tekst.trim() === '') {
    dobavi('prazno', '', 'Полето е задължително и е празно.');
    return Object.freeze(nahodki);
  }

  // ── невидимите · първо, защото те кривят всичко след себе си ───────────
  for (const z of tekst) {
    if (NEVIDIMI.has(z.codePointAt(0)!)) {
      const kod = `U+${z.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
      // Кодът влиза В САМОТО съобщение, не само в `kade`: „има невидим знак"
      // праща човека да го търси, а „има U+200B" му казва какво търси.
      dobavi('neviidim-znak', kod, `Има знак с нулева ширина (${kod}) — залепен при копиране.`);
      break;
    }
  }

  // ── чужда азбука · извън избраната и английската ───────────────────────
  const svoya = k.azbuka === 'kirilitsa' ? eKirilska : eLatinska;
  for (const z of tekst) {
    const kod = z.codePointAt(0)!;
    if (!eBukva(z)) continue;
    if (svoya(kod) || eLatinska(kod)) continue;
    dobavi(
      'chuzhda-azbuka',
      z,
      `Знакът „${z}" не е нито ${IMENA_NA_AZBUKITE[k.azbuka]}, нито английски.`,
    );
    break;
  }

  // ── смесени азбуки В ЕДНА ДУМА · правило 11, преместено на входа ───────
  for (const duma of tekst.split(/[^\p{L}]+/u)) {
    if (duma === '') continue;
    let imaKirilsko = false;
    let imaLatinsko = false;
    for (const z of duma) {
      const kod = z.codePointAt(0)!;
      if (eKirilska(kod)) imaKirilsko = true;
      else if (eLatinska(kod)) imaLatinsko = true;
    }
    if (imaKirilsko && imaLatinsko) {
      dobavi('smeseni-azbuki', duma, `Думата „${duma}" смесва кирилица и латиница.`);
      break;
    }
  }

  // ── числото · когато полето е числово ──────────────────────────────────
  if (k.chislovo === true && tekst.trim() !== '') {
    const chisto = tekst.replace(/[\s  ]/g, '').replace(',', '.');
    if (!/^-?\d+(\.\d{1,2})?$/.test(chisto)) {
      dobavi('ne-e-chislo', tekst, 'Полето е за число, а въведеното не е число.');
    }
  }

  // ── изброените стойности са закон ──────────────────────────────────────
  if (k.pozvoleni !== undefined && k.pozvoleni.length > 0 && tekst.trim() !== '') {
    if (!k.pozvoleni.includes(tekst.trim())) {
      dobavi(
        'izvan-obhvat',
        tekst,
        `Позволени са само: ${k.pozvoleni.join(' · ')}.`,
      );
    }
  }

  // ── дубликат ───────────────────────────────────────────────────────────
  if (k.veche !== undefined && tekst.trim() !== '' && k.veche.includes(tekst.trim())) {
    dobavi('dublikat', tekst, `„${tekst.trim()}" вече съществува.`);
  }

  // ── замразен период ────────────────────────────────────────────────────
  if (k.period !== undefined && (k.zamrazeni ?? []).includes(k.period)) {
    dobavi('zamrazen-period', k.period, `Месец ${k.period} е заключен от подадена справка.`);
  }

  return Object.freeze(nahodki);
}

/**
 * СПИРА ЛИ · т.9, дословно: „към Вратата се допуска само каквото отговаря".
 *
 * Силата се чете от НАСТРОЙКАТА, не от описа: бизнесът може да реши, че за него
 * чуждата азбука спира, или че дубликатът само предупреждава.
 */
export function spira(
  nahodki: readonly Nahodka[],
  n: NastroykiNaVhoda = nastroykiPoPodrazbirane(),
): boolean {
  return nahodki.some((x) => n[x.vid].sila === 'spira');
}

/** Какво да се покаже под легендата · неговата бележка бие общото обяснение. */
export function dumiZaNahodka(x: Nahodka, n: NastroykiNaVhoda): string {
  const svoya = n[x.vid].belezhka.trim();
  return svoya !== '' ? svoya : opisNaProblem(x.vid).zashto;
}

/** Броените показатели · за екрана и за Настройки. */
export function pokazateliNaVhoda(nahodki: readonly Nahodka[], n: NastroykiNaVhoda): {
  readonly vsichki: number;
  readonly spirat: number;
  readonly preduprezhdavat: number;
} {
  return {
    vsichki: nahodki.length,
    spirat: nahodki.filter((x) => n[x.vid].sila === 'spira').length,
    preduprezhdavat: nahodki.filter((x) => n[x.vid].sila === 'preduprezhdava').length,
  };
}
