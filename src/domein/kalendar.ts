/**
 * КАЛЕНДАРЪТ · поканата, и ДОСЛОВНИЯТ списък какво напуска устройството.
 *
 * Негови думи, 27.08 (И110): „Когато се изпрати поканата, тя е **по имейл ПО
 * ИЗБОР** и задължително в програмата… но на Стопанина му показва **приел ли е
 * на календара** или не."
 *
 * И от 05.08 *(р48·[52])*: „ще пратиш **искане** за свързване с календара на
 * всеки от нас, за да пращаш подсещания за задачи." Думата е негова и е точна:
 * **искане**, не достъп.
 *
 * ═══ ЗАЩО ПОКАНА, А НЕ ЗАПИС В ЧУЖД КАЛЕНДАР ═══
 *
 * Google НЕ МОЖЕ да пише в календара на друг човек с нашия жетон, и това не е
 * заобиколимо. Онова, което може, е събитие в календара на СТОПАНИНА с
 * служителя като УЧАСТНИК — тогава Google праща истинска покана с Приемам и
 * Отказвам, а отговорът се връща като `responseStatus`.
 *
 * Тоест ограничението на Google съвпада с неговата дума: праща се ИСКАНЕ.
 *
 * ═══ ПРАВИЛО 14 НЕ ПАДА ═══
 *
 * „Не каним хора" е за ДОСТЪП: не даваме право в програмата, не пазим чужди
 * пароли, не отнемаме достъп. Календарната покана е СЪОБЩЕНИЕ — тя не отваря
 * нито един ред от Журнала и не прави никого служител. Който я приеме, е
 * приел среща, не акаунт.
 *
 * Онова, което наистина се опъва, е ADR-030 §4 („имена на наематели и
 * доставчици не напускат устройството") — затова списъкът долу е ДОСЛОВЕН и
 * стои пред очите на човека, преди да натисне.
 */

import type { Delo } from './dela.js';
import type { Izprashtane } from './zadachi-kam-hora.js';

export class GreshkaKalendar extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKalendar';
  }
}

/**
 * КАКВО ТОЧНО НАПУСКА УСТРОЙСТВОТО · поименно, не „данни за задачата".
 *
 * Този списък е ЕДИНСТВЕНИЯТ дом на отговора (правило 17) и екранът го чете
 * ОТТУК, вместо да го преписва. Преписан, той щеше да остарее при първото ново
 * поле — а точно този списък не бива да остарява.
 */
export const KAKVO_NAPUSKA: readonly string[] = Object.freeze([
  'името на делото — то става заглавие на събитието',
  'бележката, ако си написал такава',
  'началната и крайната дата, и часът, ако си дал час',
  'имейлът на служителя, на когото праща поканата',
  'имейлът на СОБСТВЕНИКА на календара — Google го знае, защото той е влязъл',
]);

/** И какво НЕ напуска · също поименно, за да не се чете като „всичко друго може". */
export const KAKVO_NE_NAPUSKA: readonly string[] = Object.freeze([
  'Мястото и Обектът на делото — те носят адреси на имоти',
  'отговорникът, вписан в самото дело',
  'нито едно число от Журнала — суми, наеми, вземания, разходи',
  'имена на наематели и доставчици (ADR-030 §4)',
  'самият Журнал — той не напуска устройството по този път',
]);

/** Един участник в събитието · само имейл, нищо друго. */
interface Uchastnik {
  readonly email: string;
  /** какво е отговорил · идва ОТ Google, не се записва от нас */
  readonly responseStatus?: string;
}

/**
 * СЪБИТИЕТО ЗА КАЛЕНДАРА · чисто сглобяване, нула мрежа.
 *
 * Тук се тества без браузър какво ТОЧНО ще замине — включително че нищо извън
 * `KAKVO_NAPUSKA` не се промъква.
 *
 * ЦЯЛОДНЕВНО срещу С ЧАС: Google ги различава по полето — `date` за цял ден,
 * `dateTime` за час. Краят на цялодневното е ИЗКЛЮЧВАЩ, затова се дава денят
 * СЛЕД последния; иначе еднодневната задача изчезва от календара.
 */
export interface SabitieZaKalendar {
  readonly summary: string;
  readonly description: string;
  readonly start: { readonly date?: string; readonly dateTime?: string };
  readonly end: { readonly date?: string; readonly dateTime?: string };
  readonly attendees: readonly Uchastnik[];
}

const DEN = 86_400_000;

function denSled(data: string): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + DEN).toISOString().slice(0, 10);
}

export function sabitieZaKalendar(z: Izprashtane, delo: Delo | undefined): SabitieZaKalendar {
  if (!delo) throw new GreshkaKalendar('Няма такова дело — покана за нищо не се праща.');
  const summary = delo.ime.trim() === '' ? 'Задача' : delo.ime.trim();
  return Object.freeze({
    summary,
    // ОПИСАНИЕТО е бележката и НИЩО друго. Изкушението да се сложи „Място:
    // …, Обект: …" е точно границата на ADR-030 §4 — те носят адреси на имоти.
    description: z.belezhka,
    start: z.chas === '' ? { date: z.ot } : { dateTime: `${z.ot}T${z.chas}:00` },
    // Краят на цялодневното е ИЗКЛЮЧВАЩ при Google · без този ден задачата
    // от един ден не се вижда изобщо.
    end: z.chas === '' ? { date: denSled(z.do) } : { dateTime: `${z.do}T${z.doChas}:00` },
    attendees: Object.freeze([{ email: z.imeyl }]),
  });
}

/**
 * ПОРТЪТ · какво умее календарът, без да се знае чий е.
 *
 * Същият похват като `Drayv` (ADR-055): домейнът говори с ПОРТ, а Google живее
 * в свързващия файл, който офлайн изданието не носи.
 */
export interface Kalendar {
  /** Прави събитието и ПРАЩА поканата · връща id-то, за да има какво да се пита после. */
  pokani(s: SabitieZaKalendar): Promise<string>;
  /** Какво е отговорил участникът · `needsAction` докато не пипне поканата. */
  otgovorat(id: string): Promise<OtgovorOtKalendara>;
}

export const OTGOVORI_NA_KALENDARA = ['needsAction', 'accepted', 'declined', 'tentative'] as const;
export type OtgovorOtKalendara = (typeof OTGOVORI_NA_KALENDARA)[number] | 'nepoznat';

/**
 * ДУМИТЕ на отговора · Google говори английски, човекът чете български.
 *
 * Непознатата стойност НЕ се превежда в „не е отговорил": това би било
 * измислен отговор. Тя си има своя дума.
 */
export const IMENA_NA_OTGOVORITE_OT_KALENDARA: Readonly<Record<OtgovorOtKalendara, string>> =
  Object.freeze({
    needsAction: 'още не е отговорил на поканата',
    accepted: 'ПРИЕЛ е поканата в календара си',
    declined: 'отказал е поканата',
    tentative: 'отговорил е „може би"',
    nepoznat: 'Google върна отговор, който не познаваме',
  });

export function chetiOtgovora(v: unknown): OtgovorOtKalendara {
  return (OTGOVORI_NA_KALENDARA as readonly string[]).includes(String(v))
    ? (v as OtgovorOtKalendara)
    : 'nepoznat';
}
