/**
 * МНОГО-КЪМ-МНОГО · един ред се закача за много редове, и обратно (M17).
 *
 * Негово, дословно: „**Занимай се първо с много-към-много**" *(р88·[4])*.
 *
 * ═══ КАКВО ИМАШЕ ДОТУК И ЗАЩО НЕ СТИГА ═══
 *
 * Адресната книга (ADR-028) казва кои КОЛОНИ говорят една с друга: две колони
 * с един номер са свързани. Тя е КАРТА — казва, че връзка съществува, но никой
 * не я ВЪРВИ: няма как един разход да стои на три имота, нито едно дело да
 * държи две преписки.
 *
 * Колоната носи ЕДНА стойност. „Три имота в една клетка" значи разделител в
 * текста, а разделител в текст е повреда, която чака данните, които го
 * съдържат. Затова връзката не живее в клетка, а в СВОЙ ЗАПИС.
 *
 * ═══ ДВЕТЕ ПОСОКИ СА ЕДИН ЗАПИС ═══
 *
 * „Разходът е закачен за имота" и „имотът е закачен за разхода" са едно и също
 * решение, казано от два края. Два записа биха се разминали при първото
 * разкачане от едната страна. Затова двойката се НОРМАЛИЗИРА: страните се
 * подреждат по вид и ключ, и ключът на двойката е един, откъдето и да я гледаш.
 *
 * ═══ МАХАНЕТО Е ЗАПИС ═══
 *
 * Правило 1: нищо не се трие. Разкачането е СЪБИТИЕ — вижда се кой и кога го е
 * направил. Огледалото държи живите двойки; Журналът държи всичките.
 *
 * ЗАКАЧАНЕ СЛЕД РАЗКАЧАНЕ е ново решение, не връщане на старото: `opId` носи
 * ДЕЙСТВИЕТО (правило 20), затова се дава от викащия, а не се извежда от
 * двойката. Ключ от съдържанието тук би върнал стария резултат и втората
 * закачка би изчезнала мълчаливо.
 *
 * ═══ КАКВО НЕ Е ТУК · обявено ═══
 *
 * Редовете на МОДЕЛНА и на ВНЕСЕНА таблица ги няма в Журнала — Огледалото пази
 * само главата им (`docs/10` · M12). Затова закачка към чужда таблица не се
 * строи: страна, чиито редове не съществуват, не може да бъде проверена, а
 * непроверена страна е точно тихият инцидент, от който пази правило 7.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { redovete } from './redove-na-tablitsa.js';

class GreshkaZakachka extends Error {
  override readonly name = 'GreshkaZakachka';
}

/**
 * СЪЩНОСТИТЕ, КОИТО МОГАТ ДА СЕ ЗАКАЧАТ · изброени ПОИМЕННО.
 *
 * Условието за влизане тук е едно и се проверява: същността да има РЕДОВЕ в
 * Огледалото, всеки със свой ключ. Затова до всяко име стои и къде се проверява
 * дали редът съществува — списък без проверка е обещание (ADR-041).
 *
 * Нова същност с редове НЕ влиза сама: който я добави, минава оттук. Списък,
 * който не се допълва, се превръща в мълчалив отказ.
 */
export const SASHTNOSTI_ZA_ZAKACHANE = [
  'imot',
  'naem',
  'vzemane',
  'plashtane',
  'razhod',
  'delo',
  'prodazhba',
  'kredit',
  'kontakt',
  'prepiska',
  'zadacha',
  /**
   * РЕД НА СЪЗДАДЕНА ТАБЛИЦА · втората половина на M17 (резен 58).
   *
   * Единствената същност с ДВОЕН адрес: таблица + ред. Затова `Krai` носи
   * `tablitsa` — вместо двата ключа да се слепват в един низ с разделител,
   * който данните рано или късно съдържат.
   */
  'red',
] as const;

export type SashtnostZaZakachane = (typeof SASHTNOSTI_ZA_ZAKACHANE)[number];

/** Името на екрана · един дом (правило 17): екранът чете оттук. */
export const IMENA_NA_SASHTNOSTITE: Readonly<Record<SashtnostZaZakachane, string>> = Object.freeze({
  imot: 'Обект',
  naem: 'Наем',
  vzemane: 'Вземане',
  plashtane: 'Плащане',
  razhod: 'Разход',
  delo: 'Дело',
  prodazhba: 'Продажба',
  kredit: 'Кредит',
  kontakt: 'Контакт',
  prepiska: 'Преписка',
  zadacha: 'Задача',
  red: 'Ред на таблица',
});

/**
 * КЪДЕ ЖИВЕЯТ РЕДОВЕТЕ на всяка същност.
 *
 * Тази таблица е ПРОВЕРКАТА, не описание: `imaLiGo` пита точно нея. Ако утре
 * Огледалото прекръсти колекция, типовете падат тук — а не на екрана, месец
 * по-късно, с празен списък.
 */
const REDOVETE: Readonly<Record<SashtnostZaZakachane, (o: Ogledalo) => ReadonlyMap<string, unknown>>> =
  Object.freeze({
    imot: (o) => o.imoti,
    naem: (o) => o.naemi,
    vzemane: (o) => o.vzemaniya,
    plashtane: (o) => o.plashtaniya,
    razhod: (o) => o.razhodi,
    delo: (o) => o.dela,
    prodazhba: (o) => o.prodazhbi,
    kredit: (o) => o.krediti,
    kontakt: (o) => o.kontakti,
    prepiska: (o) => o.prepiski,
    zadacha: (o) => o.zadachi,
    // РЕДЪТ се търси в СВОЯТА таблица; без нея няма къде да се търси, и
    // празната карта е честният отговор — пазачът пита отделно за `tablitsa`.
    red: () => new Map(),
  });

/** Един край на двойката. */
export interface Krai {
  readonly vid: SashtnostZaZakachane;
  readonly id: string;
  /**
   * КОЯ таблица · САМО за вид `red`, и задължително за него.
   *
   * Другите единайсет същности живеят в една колекция и се намират по ключ.
   * Редът на създадена таблица иска ДВА ключа — а два ключа, слепени в един
   * низ, се разпадат при първия ключ, който съдържа разделителя.
   */
  readonly tablitsa?: string;
}

/** Двойката, както живее в Огледалото · вече нормализирана. */
export interface Zakachka {
  readonly a: Krai;
  readonly b: Krai;
  /** свободен текст · защо са закачени · може да е празен */
  readonly zashto: string;
  readonly kogato: string;
  readonly actor: string;
}

export function eSashtnostZaZakachane(v: string): v is SashtnostZaZakachane {
  return (SASHTNOSTI_ZA_ZAKACHANE as readonly string[]).includes(v);
}

/**
 * КЛЮЧОВЕТЕ на всички редове от този вид · подредени.
 *
 * Екранът пита ОТТУК, вместо да си избира колекция сам: втори списък на второ
 * място се разминава с първия (правило 17), а тук разминаването би значело
 * падащо меню, което предлага ред, който Вратата после отказва.
 */
export function redoveNa(
  o: Ogledalo,
  vid: SashtnostZaZakachane,
  tablitsa = '',
): readonly string[] {
  if (vid === 'red') {
    return redovete(o.redoveNaTablitsi, tablitsa)
      .map((r) => r.red)
      .sort();
  }
  return [...REDOVETE[vid](o).keys()].sort();
}

/**
 * СГЛОБЯВА край · и НЕ слага таблица там, където не ѝ е мястото.
 *
 * Пазачът отказва таблица при вградените същности нарочно (подадена и
 * пренебрегната стойност е лъжа). Затова сглобяването живее ТУК, до правилото,
 * а не във всеки екран, който строи край.
 */
export function krai(vid: SashtnostZaZakachane, id: string, tablitsa: string): Krai {
  return vid === 'red' ? { vid, id, tablitsa } : { vid, id };
}

/**
 * Съществува ли този ред ДНЕС · пита се Огледалото, не се вярва на ключа.
 *
 * МАХНАТИЯТ ред на създадена таблица НЕ съществува за закачане: той е в
 * картата, за да се чете историята му, но да го закачиш значи да вържеш нещо
 * за отсъстващо. Затова се пита ЖИВИЯТ списък, не суровата карта.
 */
function imaLiGo(o: Ogledalo, k: Krai): boolean {
  if (k.vid === 'red') {
    if (k.tablitsa === undefined) return false;
    return redovete(o.redoveNaTablitsi, k.tablitsa).some((r) => r.red === k.id);
  }
  return REDOVETE[k.vid](o).has(k.id);
}

/**
 * НОРМАЛИЗАЦИЯТА · двата края се подреждат, за да е двойката ЕДНА.
 *
 * Подрежда се по вид, после по ключ — сравнението е на низове и не зависи от
 * азбуката на екрана (`localeCompare` би подредил различно на различни машини,
 * а ключ, който зависи от машината, не е ключ).
 */
export function naredi(x: Krai, y: Krai): readonly [Krai, Krai] {
  return belegat(x) <= belegat(y) ? [x, y] : [y, x];
}

/**
 * СЛЕПВА части ОБРАТИМО · всяка носи дължината си отпред.
 *
 * Нито разделител, нито кавички. Разделителят се чупи от данните, които го
 * съдържат; кавичките пътуват ЗЛЕ — този ключ влиза в `sashtnost.id`, а
 * Журналът се изнася като CSV и се внася обратно, където кавичка значи нещо
 * друго. Дължината отпред е еднозначна и оцелява във всеки формат.
 */
function svarzhi(...chasti: readonly string[]): string {
  return chasti.map((c) => `${c.length}:${c}`).join('');
}

/** Подреждащият белег · вид · таблица · ключ, в този ред. */
function belegat(k: Krai): string {
  return svarzhi(k.vid, k.tablitsa ?? '', k.id);
}

/**
 * Ключът на двойката · един и същ, откъдето и да я гледаш.
 *
 * СЛЕПВАНЕ С РАЗДЕЛИТЕЛ НЯМА. Дотук ключът беше `вид:ключ|вид:ключ`, а
 * ключовете идват от човек: ред „Ф|1" и таблица „А:Б" биха дали един и същ
 * низ за две различни двойки — тихо слепени връзки. Затова се пише през
 * дължина отпред: `3:red16:Фактури3:Ф-7…`. Обратимо е и НЕ носи нито
 * разделител, нито кавичка — а този ключ влиза в `sashtnost.id` и пътува през
 * изнесения CSV на Журнала. Същият урок като при разделителя в клетката
 * (ADR-110), този път платен от прохода.
 */
export function klyuchNaDvoykata(x: Krai, y: Krai): string {
  const [a, b] = naredi(x, y);
  return svarzhi(a.vid, a.tablitsa ?? '', a.id, b.vid, b.tablitsa ?? '', b.id);
}

/**
 * ПАЗАЧЪТ · вика се от ВРАТАТА, преди записа, не от екрана.
 *
 * Екранът може да не е единственият викащ (агент предлага, износ внася).
 * Проверка на екрана е проверка, която първият втори викащ подминава.
 */
export function proveriZakachka(x: Krai, y: Krai, o: Ogledalo): void {
  for (const k of [x, y]) {
    if (!eSashtnostZaZakachane(k.vid)) {
      throw new GreshkaZakachka(`Непознат вид за закачане: „${String(k.vid)}".`);
    }
    if (k.id.trim() === '') {
      throw new GreshkaZakachka('Закачката иска ключ на реда — празно не се закача.');
    }
    if (k.vid === 'red' && (k.tablitsa ?? '').trim() === '') {
      throw new GreshkaZakachka('Ред на таблица иска и КОЯ таблица — само ключът не сочи никъде.');
    }
    if (k.vid !== 'red' && k.tablitsa !== undefined) {
      throw new GreshkaZakachka(
        `„${IMENA_NA_SASHTNOSTITE[k.vid]}" не живее в таблица — подадената таблица няма да се ползва, затова не се приема.`,
      );
    }
    if (!imaLiGo(o, k)) {
      throw new GreshkaZakachka(
        `${IMENA_NA_SASHTNOSTITE[k.vid]} „${k.id}"${k.tablitsa === undefined ? '' : ` в „${k.tablitsa}"`} не съществува — закачка към несъществуващ ред не се записва.`,
      );
    }
  }
  if (x.vid === y.vid && x.id === y.id && (x.tablitsa ?? '') === (y.tablitsa ?? '')) {
    throw new GreshkaZakachka('Ред не се закача за себе си.');
  }
}

/**
 * СВЪРЗАНИТЕ с този ред · групирани по вид.
 *
 * Двете посоки идват от ЕДНА двойка: гледа се кой край съвпада, и се връща
 * другият. Оттук „кои имоти има този разход" и „кои разходи има този имот" са
 * един и същ въпрос, зададен от различен край.
 */
export function svarzanite(
  zakachki: ReadonlyMap<string, Zakachka>,
  na: Krai,
): ReadonlyMap<SashtnostZaZakachane, readonly string[]> {
  const po = new Map<SashtnostZaZakachane, string[]>();
  for (const z of zakachki.values()) {
    const drugiyat = kraiotSreshta(z, na);
    if (drugiyat === undefined) continue;
    const spisak = po.get(drugiyat.vid) ?? [];
    spisak.push(drugiyat.id);
    po.set(drugiyat.vid, spisak);
  }
  for (const [vid, spisak] of po) po.set(vid, [...spisak].sort());
  return po;
}

/** Другият край, ако този ред участва в двойката. */
function kraiotSreshta(z: Zakachka, na: Krai): Krai | undefined {
  if (edin(z.a, na)) return z.b;
  if (edin(z.b, na)) return z.a;
  return undefined;
}

/** Един и същ край ли са · и ТАБЛИЦАТА участва, иначе два реда с еднакъв ключ
 *  в различни таблици минават за един. */
function edin(x: Krai, y: Krai): boolean {
  return x.vid === y.vid && x.id === y.id && (x.tablitsa ?? '') === (y.tablitsa ?? '');
}

/** Колко реда от този вид имат поне една закачка · за сверката. */
function broyPoVid(
  zakachki: ReadonlyMap<string, Zakachka>,
): ReadonlyMap<SashtnostZaZakachane, number> {
  const broy = new Map<SashtnostZaZakachane, number>();
  for (const z of zakachki.values()) {
    for (const k of [z.a, z.b]) broy.set(k.vid, (broy.get(k.vid) ?? 0) + 1);
  }
  return broy;
}

export interface SverkaNaZakachkite {
  /** живи двойки в Огледалото */
  readonly zhivi: number;
  /** двойки, чийто край вече го няма · ИМЕНУВАНИ, не само преброени */
  readonly viseshti: readonly string[];
  /** участия по вид · сборът им е два пъти броят на двойките */
  readonly poVid: ReadonlyMap<SashtnostZaZakachane, number>;
  readonly nared: boolean;
}

/**
 * СВЕРКАТА · вход↔изход, и НУЛАТА се казва (правило 7).
 *
 * ВИСЯЩАТА двойка е находката, заради която тази сверка съществува: редът,
 * който е бил закачен, може да бъде сторниран после. Двойката остава в
 * Журнала — така и трябва — но да я показваш като жива връзка значи да
 * покажеш връзка към нищо. Затова се брои и се ИМЕНУВА.
 */
export function sveriZakachkite(
  zakachki: ReadonlyMap<string, Zakachka>,
  o: Ogledalo,
): SverkaNaZakachkite {
  const viseshti: string[] = [];
  for (const [klyuch, z] of zakachki) {
    if (!imaLiGo(o, z.a) || !imaLiGo(o, z.b)) viseshti.push(klyuch);
  }
  viseshti.sort();
  return {
    zhivi: zakachki.size,
    viseshti,
    poVid: broyPoVid(zakachki),
    nared: viseshti.length === 0,
  };
}
