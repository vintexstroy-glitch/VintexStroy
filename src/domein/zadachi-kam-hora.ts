/**
 * ЗАДАЧИТЕ КЪМ ХОРАТА · праща се, приема се, и си седи в листа (резен 14а).
 *
 * Негови думи, 27.08 (И110):
 *
 *   „Вкарай **изпращане на задачи по календара от диаграмата на Гант**… и да и
 *    праща задачите **да ги приемат**."
 *
 * И уточнението, което мени чертежа:
 *
 *   „Когато се изпрати поканата, тя е **по имейл ПО ИЗБОР и ЗАДЪЛЖИТЕЛНО В
 *    ПРОГРАМАТА**… но **в листа на всеки служител си седи**."
 *
 * Не е ново искане. Негово, от 08.08 *(р57·[160])*: „важно да има **копче за
 * всяко дело** да има отговорник и **да му се праща сигнал към календара
 * РЪЧНО**." Думата „ръчно" е негова и е причината тук да няма нищо автоматично.
 *
 * ═══ ЗАЩО ФАЙЛЪТ НЕ СЕ КАЗВА `zadachi.ts` ═══
 *
 * `zadachi.ts` вече значи ДРУГО: задачите на АГЕНТА, с разписание и три умения
 * (И94 т.1). Тези тук са задачи на ЧОВЕК, върху дело, и се приемат. Две различни
 * неща с едно име е капанът, който правило 17 затваря.
 *
 * ═══ ДВЕ СЪБИТИЯ, НЕ ЕДНО ═══
 *
 * Изпращането и отговорът са решения на РАЗЛИЧНИ хора и живеят в РАЗЛИЧНИ вериги
 * (ADR-055: всеки писач е своя верига). Слети в едно събитие, отговорът щеше да
 * носи `actor` на изпращача — точно дупката, която ADR-049 затвори при подписа.
 *
 * ═══ СЪСТОЯНИЕТО СЕ СМЯТА ═══
 *
 * „Чака" не се записва никъде: то е ЛИПСАТА на отговор. Записано, то щеше да се
 * разминава с отговора при всяко приемане и щеше да има два дома за един факт.
 */

import { otData } from '../yadro/data.js';
import { svediImeyl } from './akaunt.js';

export class GreshkaZadacha extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaZadacha';
  }
}

/**
 * ЧАСЪТ ЖИВЕЕ В ИЗПРАЩАНЕТО, не в делото.
 *
 * Той каза и двете: „**Не, само дата**" за делата *(р57·[34])* и „**Да — дело с
 * час → събитие с час**" *(р59·[92])*. Помиряват се точно тук: делото си остава
 * с дата, а часът се дава в мига на изпращането и важи само за него.
 *
 * Празен час значи ЦЯЛОДНЕВНО — и това е нормалният случай, не изключение.
 */
export interface Izprashtane {
  readonly zadachaId: string;
  readonly deloId: string;
  /** на кого · сведен имейл на ЖИВ служител */
  readonly imeyl: string;
  /** YYYY-MM-DD · копира се от делото в мига на изпращането */
  readonly ot: string;
  readonly do: string;
  /** HH:MM · празно значи цял ден */
  readonly chas: string;
  readonly doChas: string;
  /**
   * ТРЪГНАЛА ЛИ Е И ПОКАНА ПО ИМЕЙЛ (резен 14б) · негово „по имейл ПО ИЗБОР".
   *
   * Пише се `false` ПЪРВО и става `true` едва СЛЕД като Google е върнал id.
   * Обратното — да се вярва на отметката преди повикването — би сложило в
   * Журнала „изпратено по имейл" за покана, която никога не е тръгнала.
   * Поправката е втори запис със същия `zadachaId` (Огледалото поправя, не
   * ражда втора задача) — единственият механизъм, по който мрежов резултат
   * може да влезе в append-only книга СЛЕД записа.
   */
  readonly poImeyl: boolean;
  /**
   * ID-то на календарното събитие · празно, докато покана не е тръгнала.
   *
   * Без него поканата не може нито да се пита за отговор, нито да се отмени —
   * а „на Стопанина му показва приел ли е" (негово) иска точно питане.
   */
  readonly kalendarId: string;
  /** какво пише в поканата · празно значи името на делото */
  readonly belezhka: string;
  readonly kogato: string;
}

export const OTGOVORI = ['prieta', 'otkazana'] as const;
export type Otgovor = (typeof OTGOVORI)[number];

export const IMENA_NA_OTGOVORITE: Readonly<Record<Otgovor, string>> = Object.freeze({
  prieta: 'приета',
  otkazana: 'отказана',
});

export interface OtgovorNaZadacha {
  readonly zadachaId: string;
  readonly otgovor: Otgovor;
  /** защо · задължително при отказ, свободно при приемане */
  readonly prichina: string;
  readonly kogato: string;
}

/** Трите състояния · „чака" е ЛИПСА на отговор и затова не се записва. */
export type SastoyanieNaZadacha = 'chaka' | Otgovor;

export const IMENA_NA_SASTOYANIYATA: Readonly<Record<SastoyanieNaZadacha, string>> = Object.freeze({
  chaka: 'чака отговор',
  prieta: 'приета',
  otkazana: 'отказана',
});

const CHAS = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Прави изпращане и веднага го проверява.
 *
 * `zhiviImeyli` идва отвън: домейнът не чете Огледалото. Празен списък значи
 * „няма служители" и тогава изпращане просто не може да има — казва се с думи.
 */
export function napraviIzprashtane(
  n: {
    zadachaId: string;
    deloId: string;
    imeyl: string;
    ot: string;
    do: string;
    chas?: string;
    doChas?: string;
    poImeyl?: boolean;
    kalendarId?: string;
    belezhka?: string;
    kogato: string;
  },
  zhiviImeyli: readonly string[],
): Izprashtane {
  const imeyl = svediImeyl(n.imeyl);
  if (imeyl === '') throw new GreshkaZadacha('Задачата иска на КОГО да отиде.');
  if (!zhiviImeyli.map(svediImeyl).includes(imeyl)) {
    throw new GreshkaZadacha(
      `„${n.imeyl}" не е служител тук. Задача се праща на човек, вписан в програмата — ` +
        'иначе няма кой да я приеме.',
    );
  }
  if (n.deloId.trim() === '') throw new GreshkaZadacha('Задачата иска ДЕЛО — тя е върху него.');

  const ot = otData(n.ot, 'Началото на задачата');
  const doData = otData(n.do, 'Краят на задачата');
  if (doData < ot) throw new GreshkaZadacha('Краят не може да е преди началото.');

  const chas = (n.chas ?? '').trim();
  const doChas = (n.doChas ?? '').trim();
  // ЕДИН ЧАС БЕЗ ДРУГИЯ не е час, а половин уговорка. Или двата, или никой.
  if ((chas === '') !== (doChas === '')) {
    throw new GreshkaZadacha('Часът иска и НАЧАЛО, и КРАЙ — или остави и двете празни за цял ден.');
  }
  for (const [koe, v] of [['Началният час', chas], ['Крайният час', doChas]] as const) {
    if (v !== '' && !CHAS.test(v)) throw new GreshkaZadacha(`${koe} не е час: „${v}".`);
  }
  if (chas !== '' && ot === doData && doChas <= chas) {
    throw new GreshkaZadacha('В един ден краят на часа не може да е преди началото.');
  }

  // „ПО ИМЕЙЛ: ДА" БЕЗ ID Е ЛЪЖА · правило 7 иска сверка вход↔изход, а тук
  // входът е натиснатата отметка, изходът е id-то от Google. Без изхода
  // записът твърди нещо, което не е станало.
  if ((n.poImeyl ?? false) && (n.kalendarId ?? '').trim() === '') {
    throw new GreshkaZadacha(
      'Задача не може да се запише като „изпратена по имейл", преди Google да е върнал ' +
        'номер на събитието. Първо се записва без покана, после поканата я поправя.',
    );
  }

  return Object.freeze({
    zadachaId: n.zadachaId,
    deloId: n.deloId.trim(),
    imeyl,
    ot,
    do: doData,
    chas,
    doChas,
    poImeyl: n.poImeyl ?? false,
    kalendarId: (n.kalendarId ?? '').trim(),
    belezhka: (n.belezhka ?? '').trim(),
    kogato: n.kogato,
  });
}

export function napraviOtgovor(n: {
  zadachaId: string;
  otgovor: string;
  prichina?: string;
  kogato: string;
}): OtgovorNaZadacha {
  if (!(OTGOVORI as readonly string[]).includes(n.otgovor)) {
    throw new GreshkaZadacha(`Няма такъв отговор: „${n.otgovor}".`);
  }
  const prichina = (n.prichina ?? '').trim();
  // ОТКАЗЪТ ИСКА ПРИЧИНА · същото правило като при прехвърленото дело (И97):
  // отказ без причина оставя изпращача да гадае, а гадаенето ражда втори опит.
  if (n.otgovor === 'otkazana' && prichina === '') {
    throw new GreshkaZadacha('Отказът иска причина — инак изпращачът гадае защо.');
  }
  return Object.freeze({
    zadachaId: n.zadachaId,
    otgovor: n.otgovor as Otgovor,
    prichina,
    kogato: n.kogato,
  });
}

/** Състоянието на една задача · СМЯТА се от двете карти, не се записва. */
export function sastoyanieNaZadacha(
  otgovori: ReadonlyMap<string, OtgovorNaZadacha>,
  zadachaId: string,
): SastoyanieNaZadacha {
  return otgovori.get(zadachaId)?.otgovor ?? 'chaka';
}

/**
 * Листът на един служител · „в листа на всеки служител СИ СЕДИ" (негово).
 *
 * Отказаната НЕ отпада. Отказът е отговор, не изтриване — и точно затова
 * изпращачът вижда, че е питал.
 */
export function zadachiNa(
  izprateni: ReadonlyMap<string, Izprashtane>,
  imeyl: string,
): readonly Izprashtane[] {
  const kogo = svediImeyl(imeyl);
  return [...izprateni.values()]
    .filter((z) => z.imeyl === kogo)
    .sort((a, b) => a.ot.localeCompare(b.ot) || a.kogato.localeCompare(b.kogato));
}

/** Колко чакат отговор · за картата в Таблото. */
export function chakashti(
  izprateni: ReadonlyMap<string, Izprashtane>,
  otgovori: ReadonlyMap<string, OtgovorNaZadacha>,
): number {
  let broy = 0;
  for (const z of izprateni.values()) {
    if (sastoyanieNaZadacha(otgovori, z.zadachaId) === 'chaka') broy += 1;
  }
  return broy;
}

/**
 * КОИ ЗАДАЧИ ВИСЯТ НА ЕДНО ДЕЛО · за белега върху реда в Управление.
 *
 * Негово: приетата задача да води до „влизане в таблица и диаграма". Делото
 * ВЕЧЕ е там; добавя се СЪСТОЯНИЕТО на задачата към него.
 */
export function zadachiNaDeloto(
  izprateni: ReadonlyMap<string, Izprashtane>,
  deloId: string,
): readonly Izprashtane[] {
  return [...izprateni.values()].filter((z) => z.deloId === deloId);
}
