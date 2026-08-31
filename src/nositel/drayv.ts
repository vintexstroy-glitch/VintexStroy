/**
 * НОСИТЕЛЯТ · Драйвът, ФАЙЛ НА ПИСАЧ (ADR-055 · резен 6).
 *
 * Негови думи (И50 · И57 · И62): „достъпът е даден от Драйва."
 *
 * ═══ КАКВО ПРЕНАСЯ ═══
 *
 * Всяка верига е ЕДИН файл. Форматът е вече наличният износ — редица събития,
 * същата, която „Изнеси Журнала" сваля и `prochetiIznos` чете. Нов формат не
 * се измисля: два формата за едно нещо са два начина да се разминат.
 *
 * ═══ ДВЕТЕ ПОСОКИ, И ЗАЩО НЕ СА ОГЛЕДАЛНИ ═══
 *
 *   БУТАМ  само своята верига  · чуждият файл се пише от неговия автор
 *   ДЪРПАМ всички чужди        · и всяка минава през `proveriVerigata`
 *
 * Бутането на чужда верига би значило да заменя файл, чието съдържание съм
 * получил, а не написал — тоест да стана посредник, през когото минава чужд
 * подпис. Ако файлът ми е стар (не съм видял последните му звена), бутането го
 * СКЪСЯВА — а по-къс Журнал от помненото е точно това, което котвата брои за
 * инцидент.
 *
 * ═══ ЗАЩО ТОЗИ ФАЙЛ НЕ ПИПА МРЕЖА ═══
 *
 * Тук живеят РЕШЕНИЯТА: как се казва файлът, чий е, приема ли се. Самите
 * повиквания стоят в `app/drayv-google.ts` — свързващата част, която офлайн
 * изданието не носи (ADR-021 · правило 10). Разделението не е стил: решение,
 * вплетено в `fetch`, се проверява само с истинска мрежа, тоест на практика не
 * се проверява.
 */

import type { Sabitie } from '../yadro/sabitie.js';
import { proveriVerigata } from '../yadro/hash.js';

/** Началото на всяко наше име във файловото пространство на Драйва. */
export const PRISTAVKA_NA_FAYLA = 'masterbook-zhurnal-';

/**
 * Името на файла за една верига.
 *
 * Ключът на веригата влиза ЦЯЛ, вкл. наставката `#pero:` — по него се разбира
 * чий е файлът, без да се отваря. Знаците, забранени в имена на файлове по
 * Windows (`\\ / : * ? " < > |`), падат на долна черта: „:" е в наставката, а
 * файл, чието име дразни операционната система, е файл, който човек не може да
 * свали и погледне.
 */
export function imeNaFayla(veriga: string): string {
  return `${PRISTAVKA_NA_FAYLA}${veriga.replace(/[\\/:*?"<>|]/g, '_')}.json`;
}

/**
 * ЧИЯ Е ВЕРИГАТА КАЗВА СЪДЪРЖАНИЕТО, не името (правило 17).
 *
 * Изкушението е да се чете обратно от името — но то е ПОЧИСТЕНО (двоеточието
 * на наставката пада на долна черта), тъй че не се връща същото. По-важното:
 * името на файл се сменя с едно преименуване, а `naematel` е ПОДПИСАН. Име,
 * решаващо чия е веригата, би значело чуждият да се преименува на мой.
 *
 * Затова името служи за ЕДНО нещо — да се намерят файловете на тази книга — и
 * за нищо друго.
 */
export function nashLiE(ime: string): boolean {
  return ime.startsWith(PRISTAVKA_NA_FAYLA) && ime.endsWith('.json');
}

import type { KvotaNaDrayva } from '../domein/spiratchka.js';

/** Един файл, както Драйвът го описва. Само каквото ползваме. */
export interface FaylVDrayva {
  readonly id: string;
  readonly ime: string;
}

/**
 * ПОРТЪТ КЪМ ДРАЙВА · четири повиквания, нищо повече.
 *
 * Умишлено е беден: колкото по-малко може да прави свързващата част, толкова
 * по-малко има какво да се обърка в нея, без тест да го улови.
 */
export interface Drayv {
  /** Файловете, чието име започва с представката. */
  spisak(pristavka: string): Promise<readonly FaylVDrayva[]>;
  cheti(id: string): Promise<string>;
  sazday(ime: string, sadarzhanie: string): Promise<string>;
  presazday(id: string, sadarzhanie: string): Promise<void>;
  /**
   * ПЕТОТО повикване · таванът и заетото (резен Д).
   *
   * Портът беше умишлено беден и остава беден: това не е ново умение, а
   * ЕДИНСТВЕНИЯТ начин да се СМЕНИ едно заковано подразбиране с измерване.
   * Дотук видът на акаунта се пишеше `'безплатно'` при влизане — никога питан,
   * а сравняван с плановете като факт.
   *
   * И НЕ ИСКА НОВ ОБХВАТ: `about.get` работи и с `drive.file`, най-тясното,
   * което вече имаме. Честната спирачка не струва нито едно ново разрешение —
   * инак тя щеше да е по-скъпа от дупката, която затваря.
   */
  kvota(): Promise<KvotaNaDrayva>;
}

/** Какво стана при бутане · за да го КАЖЕ екранът, вместо да мълчи. */
export interface Butnato {
  readonly veriga: string;
  readonly broy: number;
  readonly novFayl: boolean;
}

/**
 * БУТАМ СВОЯТА ВЕРИГА · създава файла, ако го няма, иначе го пресъздава.
 *
 * ОТКАЗВА ДА СКЪСИ. Пресъздаването е пълно съдържание, не добавяне — тъй че
 * файл с ПОВЕЧЕ звена от моите значи, че някой (друг раздел, друго устройство)
 * вече е бутнал по-нова версия и моята е стара. Тогава бутането би изтрило
 * чужди звена ЗАВИНАГИ, при това без нищо да хвърли: файлът просто става
 * по-къс. Правило 1 не прави изключение за файлове.
 */
export async function butniSvoyata(
  drayv: Drayv,
  veriga: string,
  moite: readonly Sabitie[],
): Promise<Butnato> {
  if (moite.length === 0) {
    throw new GreshkaDrayv('Празна верига не се бута — няма какво да се пренесе.');
  }
  if (moite.some((s) => s.naematel !== veriga)) {
    throw new GreshkaDrayv(`Файлът на „${veriga}" носи само нейни звена.`);
  }
  const ime = imeNaFayla(veriga);
  const nalichen = (await drayv.spisak(ime)).find((f) => f.ime === ime);
  const sadarzhanie = JSON.stringify(moite, null, 2);
  if (!nalichen) {
    await drayv.sazday(ime, sadarzhanie);
    return { veriga, broy: moite.length, novFayl: true };
  }
  const gorePri = prochetiTiho(await drayv.cheti(nalichen.id));
  if (gorePri !== undefined && gorePri > moite.length) {
    throw new GreshkaDrayv(
      `Горе има ${gorePri} звена, а тук ${moite.length}. Бутането би ги СКЪСИЛО. ` +
        'Дръпни първо, после бутай.',
    );
  }
  await drayv.presazday(nalichen.id, sadarzhanie);
  return { veriga, broy: moite.length, novFayl: false };
}

/** Една дръпната верига · с присъдата ѝ. */
export interface Drapnata {
  readonly veriga: string;
  readonly sabitiya: readonly Sabitie[];
  readonly tsyala: boolean;
  /** Защо е отказана · празно, когато е приета. */
  readonly prichina: string;
}

/**
 * ДЪРПАМ ЧУЖДИТЕ · всяка верига минава през `proveriVerigata`.
 *
 * СВОЯТА НЕ СЕ ДЪРПА, и това не е пестеливост: моята верига е на устройството
 * ми, а файлът горе е нейно КОПИЕ. Дръпнато копие би трябвало да се слее с
 * оригинала, а сливане на две вериги в една е точно онова, което ADR-055
 * отхвърля.
 *
 * СЧУПЕНАТА НЕ СЕ ХВЪРЛЯ, а се ВРЪЩА с причина. Чужд файл, който не се
 * проверява, е инцидент за КАЗВАНЕ (правило 8): мълчаливото му пропускане
 * оставя човека да гледа непълна книга и да смята, че я вижда цяла.
 */
export async function drapniChuzhdite(
  drayv: Drayv,
  kniga: string,
  moyata: string,
  sha: (t: string) => Promise<string>,
): Promise<readonly Drapnata[]> {
  const moyatFayl = imeNaFayla(moyata);
  const faylove = await drayv.spisak(`${PRISTAVKA_NA_FAYLA}${kniga}`);
  const naideni: Drapnata[] = [];
  for (const fayl of faylove) {
    if (!nashLiE(fayl.ime) || fayl.ime === moyatFayl) continue;
    naideni.push(await preseyEdna(drayv, fayl, fayl.ime, sha));
  }
  return naideni.sort((a, b) => a.veriga.localeCompare(b.veriga));
}

async function preseyEdna(
  drayv: Drayv,
  fayl: FaylVDrayva,
  imeto: string,
  sha: (t: string) => Promise<string>,
): Promise<Drapnata> {
  // `imeto` влиза САМО в отказите, за да има човек какво да търси в Драйва,
  // когато файлът не се чете и подписаният ключ не може да се извади от него.
  let sabitiya: Sabitie[];
  try {
    const surovo: unknown = JSON.parse(await drayv.cheti(fayl.id));
    if (!Array.isArray(surovo) || surovo.length === 0) {
      return { veriga: imeto, sabitiya: [], tsyala: false, prichina: 'файлът е празен или не е редица' };
    }
    sabitiya = surovo as Sabitie[];
  } catch {
    return { veriga: imeto, sabitiya: [], tsyala: false, prichina: 'файлът не е JSON' };
  }
  const veriga = sabitiya[0]!.naematel;
  if (sabitiya.some((s) => s.naematel !== veriga)) {
    return { veriga, sabitiya: [], tsyala: false, prichina: 'файлът смесва вериги' };
  }
  const proverka = await proveriVerigata(sabitiya, sha);
  if (!proverka.tsyala) {
    return {
      veriga,
      sabitiya: [],
      tsyala: false,
      prichina: `веригата се къса на seq ${proverka.parvoSchupeno} (${proverka.prichina})`,
    };
  }
  return { veriga, sabitiya, tsyala: true, prichina: '' };
}

/** Колко звена има горе · `undefined`, когато файлът не се чете. */
function prochetiTiho(tekst: string): number | undefined {
  try {
    const surovo: unknown = JSON.parse(tekst);
    return Array.isArray(surovo) ? surovo.length : undefined;
  } catch {
    return undefined;
  }
}

export class GreshkaDrayv extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaDrayv';
  }
}
