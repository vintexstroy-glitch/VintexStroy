/**
 * КОНТРАГЕНТИТЕ · кой е насреща, с номера, които държавата чете (И96 т.11).
 *
 * Дотук наемателят беше име и контакти, а доставчикът — само име. За писмо
 * стига. За одитния файл не стига: `MasterFiles` иска ЕИК, номер по ДДС, адрес
 * и държава, и то ВЕДНЪЖ за контрагента, не по веднъж на всеки негов договор.
 *
 * ═══ ПРОВЕРКАТА Е СМЕТКА, НЕ ФОРМАТ ═══
 *
 * ЕИК не е „девет цифри". Деветата цифра е КОНТРОЛНА и се смята от първите
 * осем; тринайсетата — от предните дванайсет. Затова тук се смята, а не се
 * брои: сбъркана при преписване цифра се хваща на място, вместо да замине в
 * НАП и да се върне като отказ на целия файл.
 *
 * ═══ ПРАЗНОТО НЕ Е ГРЕШКА ═══
 *
 * Празен ЕИК значи „още не е вписан" и минава. Одитният файл го БРОИ като
 * пречка и я казва с думи преди подаването. Иначе всеки, който днес няма
 * нужда от SAF-T, щеше да не може да запише доставчик.
 */

export class GreshkaKontragent extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKontragent';
  }
}

export const VIDOVE_KONTRAGENT = ['firma', 'klient', 'dostavchik'] as const;

export type VidKontragent = (typeof VIDOVE_KONTRAGENT)[number];

export const IMENA_NA_VIDOVETE: Readonly<Record<VidKontragent, string>> = Object.freeze({
  firma: 'Моята фирма',
  klient: 'Клиент',
  dostavchik: 'Доставчик',
});

export interface Kontragent {
  readonly vid: VidKontragent;
  readonly ime: string;
  readonly eik: string;
  readonly ddsNomer: string;
  readonly adres: string;
  readonly grad: string;
  readonly poshtenskiKod: string;
  readonly darzhava: string;
}

/**
 * КЛЮЧЪТ · сведеното име.
 *
 * Свежда се както имейлът (ADR-020): празните отстрани падат, вътрешните
 * се свиват до едно, буквите стават малки, и всичко минава през NFC
 * (правило 12). „ЕООД  Иван" и „еоод иван" са един контрагент.
 */
export function klyuchNaKontragent(ime: string): string {
  return ime.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

// ── ЕИК · контролната цифра се СМЯТА ──────────────────────────────────────

function tsifri(t: string): number[] {
  return [...t].map((z) => z.charCodeAt(0) - 48);
}

function sSTegla(cifri: readonly number[], tegla: readonly number[]): number {
  return tegla.reduce((s, t, i) => s + t * cifri[i]!, 0) % 11;
}

/**
 * КОНТРОЛНАТА ЦИФРА · първите тегла, а при остатък 10 — вторите; при 10 и там
 * цифрата е нула.
 *
 * Двете стъпки са ЕДНА функция нарочно: и деветата, и тринайсетата цифра се
 * смятат по същото правило, само с други тегла. Написани поотделно, второто
 * копие пропуска втората стъпка — най-честата грешка при този алгоритъм,
 * защото тя се задейства рядко.
 */
function kontrolna(
  cifri: readonly number[],
  parvi: readonly number[],
  vtori: readonly number[],
): number {
  const o = sSTegla(cifri, parvi);
  if (o !== 10) return o;
  const vtoro = sSTegla(cifri, vtori);
  return vtoro === 10 ? 0 : vtoro;
}

/**
 * Верен ли е ЕИК-ът · 9 цифри (фирма) или 13 (клон).
 *
 * Празният НЕ минава оттук — той е „невписан", а не „невалиден"; кой от двата
 * е разликата, решава повикващият.
 */
function veretEIK(eik: string): boolean {
  if (!/^\d{9}$|^\d{13}$/.test(eik)) return false;
  const c = tsifri(eik);
  const deveta = kontrolna(c.slice(0, 8), [1, 2, 3, 4, 5, 6, 7, 8], [3, 4, 5, 6, 7, 8, 9, 10]);
  if (deveta !== c[8]) return false;
  if (eik.length === 9) return true;
  return kontrolna(c.slice(8, 12), [2, 7, 3, 5], [4, 9, 5, 7]) === c[12];
}

/**
 * Верен ли е номерът по ДДС.
 *
 * Български: „BG" + ЕИК (9 или 13 цифри) или + ЕГН (10 цифри). Чужд: две
 * букви държава + от 2 до 12 знака — чуждата проверка е чужда работа и не се
 * гадае, но държавата и дължината се пазят, за да не мине телефон за номер.
 */
function veretDDSNomer(nomer: string): boolean {
  const n = nomer.toUpperCase();
  if (!/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(n)) return false;
  if (!n.startsWith('BG')) return true;
  const tyalo = n.slice(2);
  if (/^\d{10}$/.test(tyalo)) return true;
  return veretEIK(tyalo);
}

/**
 * Проверява преди запис · хвърля с думи, не връща `false`.
 *
 * Празните полета минават — те са „още не е вписано". Вписаното обаче трябва
 * да е вярно: половин попълнен ЕИК е по-лош от липсващ, защото изглежда готов.
 */
export function proveriKontragent(k: Kontragent): void {
  if (!VIDOVE_KONTRAGENT.includes(k.vid)) {
    throw new GreshkaKontragent(
      `Вид „${k.vid}" няма — контрагентът е ${VIDOVE_KONTRAGENT.join(' · ')}.`,
    );
  }
  if (klyuchNaKontragent(k.ime) === '') {
    throw new GreshkaKontragent('Контрагентът е без име — по името се връзва с наемите и разходите.');
  }
  if (k.eik !== '' && !veretEIK(k.eik)) {
    throw new GreshkaKontragent(
      `ЕИК „${k.eik}" не се проверява: контролната цифра не излиза. ЕИК е 9 или 13 цифри.`,
    );
  }
  if (k.ddsNomer !== '' && !veretDDSNomer(k.ddsNomer)) {
    throw new GreshkaKontragent(
      `Номерът по ДДС „${k.ddsNomer}" не изглежда като номер: две букви държава и после номерът.`,
    );
  }
  if (k.darzhava !== '' && !/^[A-Z]{2}$/.test(k.darzhava)) {
    throw new GreshkaKontragent(
      `Държавата е двубуквен код по ISO — „BG", не „${k.darzhava}".`,
    );
  }
}

/**
 * Кое ЛИПСВА на този контрагент, за да влезе в одитен файл.
 *
 * Връща изречения, не флагове: човекът чете какво да допише, а не колко неща
 * са наред. Собствената фирма иска и номер по ДДС — тя подава справката.
 */
export function kakvoLipsva(k: Kontragent): readonly string[] {
  const lipsva: string[] = [];
  if (k.eik === '') lipsva.push('ЕИК');
  if (k.adres === '') lipsva.push('адрес');
  if (k.grad === '') lipsva.push('град');
  if (k.darzhava === '') lipsva.push('държава');
  if (k.vid === 'firma' && k.ddsNomer === '') lipsva.push('номер по ДДС');
  return Object.freeze(lipsva);
}
