/**
 * СТОПАНИНЪТ · главният имейл на един Журнал (И97 т.5 · т.8 · ADR-043).
 *
 * Негови думи, дословно:
 *
 *   „**Стопанинът не е четвърто реле. Той е самоличност** — главният имейл,
 *    собственикът на системата; всички останали са служители, добавени от
 *    него… Стопанинът НЕ може сам да си отнеме правата и НЕ може да назначи
 *    друг имейл за главен; смяна става само през екипа по сигурност… Той е
 *    **първото събитие в Журнала** на този наемател."
 *
 * ═══ ЗАЩО НЕ Е РОЛЯ ═══
 *
 * Трите релета (Вижда · Скрито · Редактира) важат за СЛУЖИТЕЛИТЕ — той ги
 * раздава. Ако Стопанинът беше четвърта роля в същия списък, тя щеше да се
 * раздава като другите три: същото поле, същият екран, същият бутон. Оттам е
 * една крачка до „собственикът си сменя ролята на наблюдател" — и Журнал без
 * стопанин, който никой не може да отключи.
 *
 * Затова тук няма функция „назначи стопанин". Има само две: КОЙ Е и КАКВА
 * РОЛЯ СЛЕДВА оттам.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Rolya } from '../yadro/samolichnost.js';
import type { Sha256 } from '../yadro/hash.js';
import type { PayloadZapasenKontaktZapisan } from './sabitiya.js';
import { svediImeyl } from './akaunt.js';

export class GreshkaStopanin extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaStopanin';
  }
}

/**
 * ТИПЪТ НА ОТКРИВАЩОТО СЪБИТИЕ · подава се на Вратата (`parvoto`).
 *
 * Ядрото не знае имената на домейна и това е нарочно: `Sabitie.type` е низ.
 * Затова името живее ТУК, на едно място, и оттук пътува към Вратата — вместо
 * да се преписва като низ в приложението.
 */
export const OTKRIVASHTO_SABITIE = 'СтопанинЗаписан';

/**
 * КАКВА РОЛЯ има един имейл в този Журнал · ЕДИН дом за въпроса.
 *
 * Редът е важен и не е произволен:
 *
 *   1. **Стопанинът е собственик ВИНАГИ.** Не се чете от списъка със служители
 *      и не може да бъде понижен оттам — това е първата от двете му забрани:
 *      „не може сам да си отнеме правата".
 *   2. **Служителят носи своята роля** — раздадена от Стопанина.
 *   3. **Всеки друг НАБЛЮДАВА.** Най-тясното, не най-широкото (същата посока
 *      като при изключените отметки, ADR-041 §3): непознат имейл, стигнал до
 *      Журнала през споделена папка, гледа — не пише.
 *
 * ЖУРНАЛ БЕЗ СТОПАНИН (започнат преди ADR-043) не отнема правата на никого:
 * тогава решава списъкът със служители, а липсата се КАЗВА на екрана и се
 * дописва. Мълчаливото понижаване би заключило собственика извън собствения
 * му Журнал заради резен, който той не е искал.
 */
export function rolyataNa(imeyl: string, o: Ogledalo): Rolya {
  const sveden = svediImeyl(imeyl);
  if (o.stopanin !== '' && sveden === svediImeyl(o.stopanin)) return 'sobstvenik';
  const sluzhitel = o.sluzhiteli.get(sveden);
  if (sluzhitel) return sluzhitel.rolya;
  return o.stopanin === '' ? 'sobstvenik' : 'nablyudatel';
}

/** Този ли е Стопанинът · за екраните, които показват само на него. */
export function eStopanin(imeyl: string, o: Ogledalo): boolean {
  return o.stopanin !== '' && svediImeyl(imeyl) === svediImeyl(o.stopanin);
}

/**
 * ТРИТЕ СЪСТОЯНИЯ на въпроса „има ли този Журнал стопанин".
 *
 * Не две. Третото — „започнат Журнал, който чака дописване" — съществува само
 * защото приложението е писало Журнали преди този резен, и то не е нито
 * грешка, нито нормално състояние: то е ЗАДАЧА, която някой трябва да свърши.
 */
export type SastoyanieNaStopanina = 'ima' | 'prazen-zhurnal' | 'chaka-dopisvane';

export interface KakvoSStopanina {
  readonly sastoyanie: SastoyanieNaStopanina;
  /** може ли ТОЗИ имейл да го запише сега */
  readonly mozheDaZapishe: boolean;
  /** какво се казва на човека · празно, когато всичко е наред */
  readonly kazva: string;
}

/**
 * Какво да прави приложението със Стопанина на един Журнал.
 *
 * `parviyatActor` е авторът на ПЪРВОТО събитие — оттам се извежда Стопанинът
 * на започнат Журнал. Той не се ИЗБИРА: който е писал пръв, той е стопанинът,
 * и това е единственото твърдение, което самата верига вече доказва.
 */
export function kakvoSStopanina(
  imeyl: string,
  o: Ogledalo,
  parviyatActor: string | undefined,
): KakvoSStopanina {
  if (o.stopanin !== '') {
    return Object.freeze({ sastoyanie: 'ima' as const, mozheDaZapishe: false, kazva: '' });
  }
  if (parviyatActor === undefined) {
    return Object.freeze({
      sastoyanie: 'prazen-zhurnal' as const,
      mozheDaZapishe: true,
      kazva: 'Празен Журнал — първото събитие е Стопанинът.',
    });
  }
  const negov = svediImeyl(imeyl) === svediImeyl(parviyatActor);
  return Object.freeze({
    sastoyanie: 'chaka-dopisvane' as const,
    mozheDaZapishe: negov,
    kazva: negov
      ? 'Този Журнал е започнат, преди Стопанинът да се записва. Дописва се сега, ' +
        'защото първото събитие в него е твое.'
      : `Този Журнал е започнат от ${parviyatActor}. Само той може да се впише за Стопанин — ` +
        'иначе чужда история би получила нов собственик с едно натискане.',
  });
}

/* ═══════════ ЗАПАСНИЯТ КОНТАКТ · пазителят на връщането (И100) ═══════════ */

/**
 * ПОДРАВНЯВАНЕ НА ТЕЛЕФОН · ЕДИН дом за въпроса „същият номер ли е".
 *
 * Един и същи номер се пише по десет начина: „0888 123 456", „+359 888 123
 * 456", „0888-123-456". Ако сравнението беше буквално, човекът щеше да въведе
 * СВОЯ номер и да получи отказ — в мига, в който най-малко му трябва.
 *
 * Затова остават САМО цифрите, а водещата нула на българския номер се чете
 * като „+359": двата записа на един и същ номер трябва да дадат един отпечатък.
 */
export function podravniTelefon(tekst: string): string {
  const samoTsifri = tekst.normalize('NFC').replace(/\D/g, '');
  if (samoTsifri === '') return '';
  // „0888…" и „359888…" са един номер. Водещата нула пада, кодът се слага.
  if (samoTsifri.startsWith('0') && !samoTsifri.startsWith('00')) {
    return `359${samoTsifri.slice(1)}`;
  }
  if (samoTsifri.startsWith('00')) return samoTsifri.slice(2);
  return samoTsifri;
}

/** Последните две цифри · само за да се познае кой номер е вписан. */
export function poslednite2(tekst: string): string {
  return podravniTelefon(tekst).slice(-2);
}

/**
 * ОТПЕЧАТЪКЪТ НА ТЕЛЕФОНА · номерът не влиза в Журнала, само следата му.
 *
 * Сол няма нарочно: тя би трябвало да се пази някъде, а „някъде" в местно-първа
 * система значи в същия файл. Кратък номер и без сол се намира с изчерпване от
 * онзи, който вече държи износа — затова тук не се обещава тайна, а СПИРАЧКА:
 * телефонът лови грешния човек, не професионалния крадец (ADR-044).
 */
export async function otpechatakNaTelefon(tekst: string, sha: Sha256): Promise<string> {
  const podraven = podravniTelefon(tekst);
  if (podraven === '') throw new GreshkaStopanin('Празен телефон не става доказателство.');
  return sha(`telefon:${podraven}`);
}

/** Живият запасен контакт · `null`, когато няма вписан. */
export function zapasniyat(o: Ogledalo): PayloadZapasenKontaktZapisan | null {
  return o.zapasenKontakt;
}

export interface OtgovorZaSmyana {
  readonly mozhe: boolean;
  readonly kazva: string;
}

/**
 * МОЖЕ ЛИ ТОЗИ ДА ВЗЕМЕ ЖУРНАЛА · четирите условия, всяко със свои думи.
 *
 * Отказът никога не е само `false`: човек, който се опитва да си върне
 * собствения Журнал, трябва да научи КОЕ не достига — иначе пробва наслуки и
 * се отказва там, където е бил на една цифра разстояние.
 *
 * `telefonOtpechatak` идва СМЕТНАТ отвън, защото смятането е асинхронно, а
 * решението — не. Така правилото се чете и се тества без нито едно чакане.
 */
export function mozheDaVzemeZhurnala(n: {
  readonly imeyl: string;
  readonly telefonOtpechatak: string;
  readonly o: Ogledalo;
}): OtgovorZaSmyana {
  const zapasen = zapasniyat(n.o);
  if (!zapasen) {
    return Object.freeze({
      mozhe: false,
      kazva:
        'Този Журнал няма вписан запасен контакт. Връщането минава само през нещо, ' +
        'вписано ПРЕДИ бедата — затова пътят е затворен, а не заобиколен.',
    });
  }
  if (svediImeyl(n.imeyl) !== svediImeyl(zapasen.imeyl)) {
    return Object.freeze({
      mozhe: false,
      kazva:
        `Запасният контакт на този Журнал е друг имейл. Влез с него — ` +
        `последните цифри на вписания телефон са …${zapasen.poslednite}.`,
    });
  }
  if (n.telefonOtpechatak !== zapasen.telefonOtpechatak) {
    return Object.freeze({
      mozhe: false,
      kazva:
        `Телефонът не съвпада с вписания (…${zapasen.poslednite}). ` +
        'Проверява се номерът, не начинът на изписване.',
    });
  }
  return Object.freeze({
    mozhe: true,
    kazva: 'Запасният контакт съвпада — Журналът минава към този имейл.',
  });
}

/**
 * ДВЕТЕ ЗАБРАНИ, изписани · за екрана, който иска да ги обясни.
 *
 * Тук няма функция, която ги заобикаля, и това е решението: смяната на главния
 * имейл иска трета страна („само през екипа по сигурност"), а такава днес няма.
 * Правило 18: подразбраната забрана е забрана, докато някой не намери начин.
 */
export const DVETE_ZABRANI: readonly string[] = Object.freeze([
  'Стопанинът не може сам да си отнеме правата.',
  'Стопанинът не може да назначи друг имейл за главен.',
]);
