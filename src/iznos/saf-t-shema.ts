/**
 * СХЕМАТА НА ОДИТНИЯ ФАЙЛ · ДАННИ, не код (И96 т.11).
 *
 * ═══ ЗАЩО ОТДЕЛЕН ФАЙЛ ═══
 *
 * Схемата на НАП е ЖИВА. Версия 1.0.2 влезе в сила на 01.04.2026 и замени
 * действалата дотогава — една смяна вече мина, ще има и други. Заковани в
 * генератора, версията и номенклатурите правят следващата смяна претърсване
 * из кода; тук са таблица, която се сменя на едно място.
 *
 * Същото решение като при азбуките: пакетът носи данните, кодът чете от тях.
 *
 * ═══ ПРАЗНОТО Е ЧЕСТНО ═══
 *
 * Номенклатурите на НАП (националният сметкоплан, кодовете за вид документ,
 * начин на плащане, данъчни кодове) се свалят от страницата на проекта в
 * nra.bg. Тази среда НЯМА достъп дотам — проксито го блокира и това е
 * записано в проучването, не се крие.
 *
 * Затова кодовете тук са ПРАЗНИ и генераторът ги брои като пречка пред
 * подаването. Измислен код е по-скъп от липсващ: файлът минава автоматична
 * валидация при НАП и грешен код е отхвърляне плюс глоба по чл. 277а, докато
 * липсващият се вижда на екрана предварително.
 */

interface Nomenklatura {
  readonly klyuch: string;
  readonly ime: string;
  /** кодът по номенклатурата на НАП · празно значи „не е свалена" */
  readonly kod: string;
}

export interface Shema {
  readonly versiya: string;
  /** от кога е в сила · ISO дата */
  readonly vSilaOt: string;
  /** пространството от имена на XML-а */
  readonly prostranstvo: string;
  readonly darzhava: string;
  /** DefaultCurrencyCode · в 1.0.2 примерът на НАП е EUR */
  readonly valuta: string;
  /** свалени ли са номенклатурите на НАП */
  readonly nomenklaturiteSaSvaleni: boolean;
  /** начин на плащане → код */
  readonly nachiniNaPlashtane: readonly Nomenklatura[];
  /** вид документ → код */
  readonly vidoveDokument: readonly Nomenklatura[];
}

/**
 * ВЕРСИЯТА, срещу която е строен генераторът.
 *
 * Смени ли се — файлът НЕ се пише мълчаливо по стария начин: `proveriShema`
 * пада с думи, а тестът я пази поименно.
 */
export const SHEMA: Shema = Object.freeze({
  versiya: '1.0.2',
  vSilaOt: '2026-04-01',
  prostranstvo: 'mf:BG:SAFT:1.0.2',
  darzhava: 'BG',
  valuta: 'EUR',
  nomenklaturiteSaSvaleni: false,
  nachiniNaPlashtane: Object.freeze([
    { klyuch: 'в брой', ime: 'В брой', kod: '' },
    { klyuch: 'банка', ime: 'Банков превод', kod: '' },
    { klyuch: 'карта', ime: 'Карта', kod: '' },
  ]),
  vidoveDokument: Object.freeze([
    { klyuch: 'faktura', ime: 'Фактура', kod: '' },
    { klyuch: 'kreditno', ime: 'Кредитно известие', kod: '' },
    { klyuch: 'debitno', ime: 'Дебитно известие', kod: '' },
  ]),
});

/** Версиите, които този код познава. Непозната версия НЕ се пише наслуки. */
export const POZNATI_VERSII: readonly string[] = Object.freeze(['1.0.2']);

export class GreshkaShema extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaShema';
  }
}

export function proveriShema(s: Shema = SHEMA): void {
  if (!POZNATI_VERSII.includes(s.versiya)) {
    throw new GreshkaShema(
      `Схема ${s.versiya} не е позната на този генератор (познати: ${POZNATI_VERSII.join(', ')}). ` +
        'Свали новата схема и номенклатурите от НАП, преди да се пише файл — ' +
        'стар генератор върху нова схема дава файл, който валидаторът отхвърля цял.',
    );
  }
}

/** Кодът по номенклатура · празен низ, когато не е свалена. */
export function kod(spisak: readonly Nomenklatura[], klyuch: string): string {
  return spisak.find((n) => n.klyuch === klyuch)?.kod ?? '';
}

/**
 * КОЕ ОЩЕ ЛИПСВА ОТ СХЕМАТА · изречения за екрана, не флагове.
 *
 * Стои ТУК, а не в генератора: пречката е свойство на схемата (какво не е
 * свалено), а не на един месец данни.
 */
export function prechkiOtShemata(s: Shema = SHEMA): readonly string[] {
  if (s.nomenklaturiteSaSvaleni) return Object.freeze([]);
  return Object.freeze([
    `Номенклатурите на НАП за схема ${s.versiya} не са свалени — кодовете за ` +
      'начин на плащане, вид документ и националният сметкоплан остават празни.',
  ]);
}
