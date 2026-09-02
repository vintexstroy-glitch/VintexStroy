/**
 * РЕДОВЕТЕ НА СЪЗДАДЕНАТА ТАБЛИЦА · данните живеят ВЪТРЕ (M12).
 *
 * Описът на дълга го нарича НАЙ-ТЕЖКОТО, дословно: „Огледалото пази само
 * ГЛАВАТА на моделна таблица… Оттук идва половината от останалия дълг: колоните
 * на Продажби, разрезът по собствена колона, rollup-ът. Не е дребно — иска нов
 * вид запис през Вратата."
 *
 * ═══ НАХОДКАТА, КОЯТО ГО ПРАВИ ПО-ГОЛЯМО ═══
 *
 * Създадената таблица ВЛИЗАШЕ в Журнала и после я нямаше никъде: картата
 * `tablitsiOtFayl` в Огледалото имаше НУЛА четци — нито екран, нито тест, нито
 * проход. Тоест човек създаваше таблица вътре и тя изчезваше от очите му.
 * Обявена възможност без консуматор е надпис (ADR-041).
 *
 * ═══ КАКВО ПАЗИ ВИДА НА СТОЙНОСТТА ═══
 *
 * Стойностите НЕ стоят в една обща карта. Три са, и всяка казва какво носи:
 *
 *   `pari_st` — цели центове, само за колона от вид `evro` (правило 3);
 *   `chisla`  — процент и число;
 *   `tekst`   — текст и дата.
 *
 * Една обща карта би приела 12.34 в колона за пари и никой не би я спрял.
 * Затова Вратата пита ГЛАВАТА: коя колона в коя карта може да стои. Стойност
 * в чужда карта се отказва с думи — а не се преобразува тихо.
 *
 * ═══ ЗАТВОРЕНАТА КОЛОНА НЕ СЕ ПИШЕ ═══
 *
 * Колона с формула показва СМЕТКА (правило 23: „затворена колона не се
 * редактира от никого, дори от собственика"). Записана стойност там би
 * застанала до сметката и двете биха се разминали при първата промяна.
 *
 * ═══ ПОПРАВКАТА И МАХАНЕТО СА ЗАПИСИ ═══
 *
 * Един тип събитие, последната дума бие — по образеца на своя коефициент.
 * „Махнат" е нов запис със същия ключ и `mahnat: true`: вижда се КОЙ и КОГА, а
 * върнатият ред е СЪЩИЯТ, не нов (правило 1).
 */

import type { PayloadTablitsaOtFaylSazdadena } from './sabitiya.js';
import type { VidStoynost } from './vid-stoynost.js';

class GreshkaRedNaTablitsa extends Error {
  override readonly name = 'GreshkaRedNaTablitsa';
}

/** Един ред, както живее в Огледалото. */
export interface RedNaTablitsa {
  readonly tablitsa: string;
  /** ключ на реда · дава го викащият, не се извежда от съдържанието */
  readonly red: string;
  /** колона (номер като низ) → ЦЕЛИ центове · само за вид `evro` */
  readonly pari_st: Readonly<Record<string, number>>;
  /** колона → число · процент и число */
  readonly chisla: Readonly<Record<string, number>>;
  /** колона → текст · текст и дата */
  readonly tekst: Readonly<Record<string, string>>;
  readonly mahnat: boolean;
}

/**
 * КОЯ КАРТА НОСИ КОЙ ВИД · един дом (правило 17).
 *
 * Пазачът чете оттук, и екранът чете оттук. Нов вид стойност няма да мине
 * мълчаливо: типът пада, докато някой не каже в коя карта живее.
 */
export const KARTATA_NA_VIDA: Readonly<Record<VidStoynost, 'pari_st' | 'chisla' | 'tekst'>> =
  Object.freeze({
    evro: 'pari_st',
    protsent: 'chisla',
    chislo: 'chisla',
    tekst: 'tekst',
    data: 'tekst',
  });

/** Видът на колоната, както го е записала главата · `tekst`, ако мълчи. */
export function vidaNaKolonata(t: PayloadTablitsaOtFaylSazdadena, kolona: string): VidStoynost {
  const v = t.vidove[kolona];
  return v !== undefined && v in KARTATA_NA_VIDA ? (v as VidStoynost) : 'tekst';
}

/** Затворена ли е колоната · тоест показва ли СМЕТКА, а не въведено. */
export function zatvorenaE(t: PayloadTablitsaOtFaylSazdadena, kolona: string): boolean {
  return t.formuli[kolona] !== undefined;
}

/**
 * ПАЗАЧЪТ · вика се от ВРАТАТА, преди записа.
 *
 * Проверява СРЕЩУ ГЛАВАТА, а не срещу себе си: колоната трябва да съществува,
 * да е отворена, и стойността ѝ да стои в картата на своя вид.
 */
export function proveriRed(r: RedNaTablitsa, t: PayloadTablitsaOtFaylSazdadena): void {
  if (r.red.trim() === '') {
    throw new GreshkaRedNaTablitsa('Редът иска ключ — празен ключ не се записва.');
  }

  const vidyani = new Set<string>();
  const obhod: readonly [ReadonlyMap<string, unknown>, 'pari_st' | 'chisla' | 'tekst'][] = [
    [new Map(Object.entries(r.pari_st)), 'pari_st'],
    [new Map(Object.entries(r.chisla)), 'chisla'],
    [new Map(Object.entries(r.tekst)), 'tekst'],
  ];

  for (const [karta, ime] of obhod) {
    for (const [kolona, stoynost] of karta) {
      const nomer = Number(kolona);
      if (!Number.isInteger(nomer) || nomer < 0 || nomer >= t.glavi.length) {
        throw new GreshkaRedNaTablitsa(
          `Колона „${kolona}" я няма в главата на „${t.klyuch}" — ред с колона извън главата не се записва.`,
        );
      }
      if (vidyani.has(kolona)) {
        throw new GreshkaRedNaTablitsa(
          `Колона „${t.glavi[nomer]}" носи стойност на две места — една колона, една стойност.`,
        );
      }
      vidyani.add(kolona);

      if (zatvorenaE(t, kolona)) {
        throw new GreshkaRedNaTablitsa(
          `„${t.glavi[nomer]}" е затворена колона — тя се СМЯТА, не се въвежда.`,
        );
      }

      const trebva = KARTATA_NA_VIDA[vidaNaKolonata(t, kolona)];
      if (trebva !== ime) {
        throw new GreshkaRedNaTablitsa(
          `„${t.glavi[nomer]}" е от вид „${vidaNaKolonata(t, kolona)}" — стойността ѝ не стои при „${ime}".`,
        );
      }

      if (ime === 'pari_st') {
        const n = stoynost as number;
        if (!Number.isInteger(n)) {
          throw new GreshkaRedNaTablitsa(
            `„${t.glavi[nomer]}" е пари — иска ЦЕЛИ центове, а дойде ${String(n)}.`,
          );
        }
      }
      if (ime === 'chisla' && !Number.isFinite(stoynost as number)) {
        throw new GreshkaRedNaTablitsa(`„${t.glavi[nomer]}" иска число, а дойде ${String(stoynost)}.`);
      }
    }
  }
}

/** ЖИВИТЕ редове на една таблица · подредени по ключ, махнатите извън. */
export function redovete(
  vsichki: ReadonlyMap<string, ReadonlyMap<string, RedNaTablitsa>>,
  tablitsa: string,
): readonly RedNaTablitsa[] {
  const na = vsichki.get(tablitsa);
  if (na === undefined) return [];
  return [...na.values()]
    .filter((r) => !r.mahnat)
    .sort((a, b) => (a.red < b.red ? -1 : a.red > b.red ? 1 : 0));
}

/**
 * СБОРЪТ НА КОЛОНА · в цели центове, без нито едно закръгляне.
 *
 * Оттук нататък „месечен сбор на колона" не е отделен запис в Журнала, а
 * СМЕТКА върху редовете — както знакът и скритото (правила 20 · 23).
 * Закръгленото никога не влиза в сбор (`/matematika`).
 */
export function sborNaKolona(redove: readonly RedNaTablitsa[], kolona: string): number {
  let sbor = 0;
  // МАХНАТИТЕ се изхвърлят ТУК, а не се разчита викащият да ги е изхвърлил.
  // Сбор, който зависи от чистотата на подадения списък, е верен точно докато
  // някой не го извика от второто място.
  for (const r of redove) if (!r.mahnat) sbor += r.pari_st[kolona] ?? 0;
  return sbor;
}

/**
 * КАКВО Е ВИДЯЛО СГЪВАНЕТО · входната страна на сверката.
 *
 * Брои се ДОКАТО се сгъва, отделно от картата, която се строи. Затова е
 * НЕЗАВИСИМ път: изгуби ли картата ред, двете числа се разминават и разликата
 * го казва. Сверка, смятана от същата карта, която проверява, е тавтология —
 * платено с нарочно счупване, което мина.
 */
export interface VhodNaRedovete {
  /** различни ключове на редове, срещнати в Журнала */
  readonly zapisani: number;
  /** от тях: онези, чиято ПОСЛЕДНА дума е „махнат" */
  readonly mahnati: number;
}

export interface SverkaNaRedovete {
  readonly zapisani: number;
  readonly mahnati: number;
  readonly zhivi: number;
  /**
   * РАЗЛИКАТА · записани − махнати − живи. Нула в здрава книга.
   *
   * Тук стоеше БУЛЕВО „наред" — и то беше НАДПИС: при съгласувана карта то не
   * можеше да стане `false` по никакъв вход, тъй че нарочното му заковаване на
   * `true` минаваше незабелязано. Число, което се БРОИ, няма това свойство:
   * счупеният филтър на живите го изкарва различно от нула, и то се вижда.
   */
  readonly razlika: number;
}

/**
 * СВЕРКАТА · вход↔изход, и НУЛАТА се казва (правило 7).
 *
 * записани − махнати − живи = 0. Разликата се ЗАПИСВА, дори когато е нула:
 * проверената нула е различна от нулата, за която никой не е питал.
 *
 * Пада при първата тиха загуба на ред — например ако сгъването почне да
 * ИЗХВЪРЛЯ махнатите вместо да ги пази, или ако филтърът на живите се обърне.
 */
export function sveriRedovete(
  vhod: ReadonlyMap<string, VhodNaRedovete>,
  vsichki: ReadonlyMap<string, ReadonlyMap<string, RedNaTablitsa>>,
  tablitsa: string,
): SverkaNaRedovete {
  const v = vhod.get(tablitsa) ?? { zapisani: 0, mahnati: 0 };
  const zhivi = redovete(vsichki, tablitsa).length;
  return {
    zapisani: v.zapisani,
    mahnati: v.mahnati,
    zhivi,
    razlika: v.zapisani - v.mahnati - zhivi,
  };
}
