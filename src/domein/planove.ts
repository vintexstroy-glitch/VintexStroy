/**
 * ПЛАНОВЕТЕ · един двигател, четири плана, отметки за всяка възможност.
 *
 * Думите на собственика, поправени от него самия и записани тук дословно:
 *
 *   „НЯМА безплатен план. Има нормален, какъвто е нашият, от безплатен АКАУНТ
 *    в Gmail или Microsoft, или Apple. С него влизаш без парола и даваш достъп
 *    до хранилище. Ако имаш нужда от мащаб, плащаш и на Google, Microsoft и
 *    Apple. По-евтиният план, стандартният, който го приемаме за стартъп, ще има
 *    ЦЯЛАТА функционалност и ще се прилагат филтри на възможностите на таблото
 *    на този пълен потенциал. Най-евтиният ще гони физически лица с натоварен
 *    график и малки проекти… Най-добре индивидуално да се дава избор с ОТМЕТКИ
 *    на функционалностите. А от Стартъпа нагоре ще е в зависимост от плана,
 *    който се избира в Google, Microsoft и Apple."
 *
 *   „ПЕРСОНАЛНИЯТ е САМО ЕДИН АКАУНТ — без да добавяш други акаунти и без да
 *    даваш роли за достъп до редакция и наблюдение. Това е най-персоналният.
 *    А СТАРТЪПЪТ е с добавяне на ДРУГИ ИМЕЙЛИ за достъп от съответната поща —
 *    и СИГУРНОСТТА ЗА ТОВА НЕ Е В НАС."
 *
 * Пет неща следват и определят целия файл:
 *
 *   1. Безплатен е АКАУНТЪТ, не планът. Хранилището е негово, при неговия
 *      доставчик; мащабът се плаща на доставчика, не на нас.
 *   2. ЛИЧНИЯТ е един акаунт и толкова. Не се добавят други акаунти, не се
 *      раздават роли — нито за редакция, нито за наблюдение. Това не е
 *      орязана функция, а СМИСЪЛЪТ на плана: един човек, неговите неща.
 *   3. СТАНДАРТНИЯТ (стартъпът) носи ЦЯЛАТА функционалност — и от него нататък
 *      се добавят други имейли. Нагоре не се добавят функции, а КАПАЦИТЕТ
 *      (купен от доставчика) и поръчкова работа.
 *   4. Изборът е с ОТМЕТКИ, поотделно. Затова въпросът е двуслоен:
 *      планът ПОЗВОЛЯВА ли · и собственикът ВКЛЮЧИЛ ли я е.
 *   5. Достъпът на други имейли минава през ДОСТАВЧИКА — от съответната поща.
 *      Сигурността за него е негова: ние не каним хора, не пазим чужди пароли
 *      и не отнемаме достъп. Виждаме онзи, когото доставчикът е пуснал.
 */

import type { VidHranilishte } from '../yadro/samolichnost.js';

export type Vazmozhnost =
  | 'zapis' // писане през Вратата — без нея няма приложение
  | 'smetki-dds' // Сметки, ДДС по акумулатори, справка, замразяване
  | 'iztochnitsi' // четене от Excel/CSV/PDF и сверена промяна
  | 'arhiv-eksel' // архивът за Ексел с готовите филтри
  | 'iznos-vnos' // JSON износ и внасяне със сверка
  | 'fini-filtri' // фините филтри по колоните
  | 'ogledala' // изгледите по имот и по контрагент
  | 'drugi-imeyli' // достъп за ДРУГИ ИМЕЙЛИ през доставчика (сигурността е негова)
  | 'roli-za-dostap' // роля на всеки добавен имейл: редактира или само наблюдава
  | 'kolonno-pravo' // коя колона се вижда и коя се редактира
  | 'poveche-hranilishte' // иска платен план при Google/Microsoft/Apple
  | 'individualni-razrabotki' // поръчкови разработки по договор
  | 'svarzhi-ii'; // ИИ — добавка с цена, НЕ вграден · отделен проект

/** Какво прави всяка възможност — с едно изречение, за отметките на таблото. */
export const OPISANIE: Readonly<Record<Vazmozhnost, string>> = Object.freeze({
  zapis: 'Записва през Вратата в Журнала — основата, не се изключва.',
  'smetki-dds': 'Сметки, ДДС по акумулатори, справка която заключва месеца.',
  iztochnitsi: 'Чете Excel, CSV и PDF от Драйва и показва разликите преди запис.',
  'arhiv-eksel': 'Сваля архив в Ексел — пет листа с готови филтри.',
  'iznos-vnos': 'Изнася и връща Журнала със сверка на веригата.',
  'fini-filtri': 'Филтри в колонните глави, като на Уиндоус.',
  ogledala: 'Изгледи по имот и по контрагент — кой носи и кой дължи.',
  'drugi-imeyli':
    'Добавяш ДРУГИ ИМЕЙЛИ за достъп от съответната поща. Поканата, паролата и ' +
    'отнемането са при твоя доставчик — сигурността за това не е в нас.',
  'roli-za-dostap': 'Роля на всеки добавен имейл: редактира или само наблюдава.',
  'kolonno-pravo': 'Коя колона се вижда и коя се редактира — по роля.',
  'poveche-hranilishte': 'Иска платен план при твоя доставчик — плаща се на него.',
  'individualni-razrabotki': 'Поръчкова работа по договор.',
  'svarzhi-ii': 'Свързване на ИИ като добавка с цена — НЕ вграден.',
});

/**
 * Възможности, които са ОБЯВЕНИ, но още не са построени. Показват се като
 * „скоро", без бутон, който лъже. Негови думи за ИИ: „отделен проект, който
 * не е започнал."
 */
export const OSHTE_NE_E_ZAPOCHNATO: ReadonlySet<Vazmozhnost> = new Set(['svarzhi-ii']);

/** Без нея приложението не е приложение — отметката ѝ не се маха. */
export const ZADALZHITELNI: ReadonlySet<Vazmozhnost> = new Set(['zapis']);

export interface Plan {
  readonly klyuch: string;
  readonly ime: string;
  readonly zaKogo: string;
  /**
   * БЕЗ ОБЛАК ли работи — Журналът живее само в устройството.
   *
   * Това е СВОЙСТВО на плана, не възможност с отметка: не можеш да „изключиш"
   * това, че нямаш драйв. Затова стои тук, до `iskaPlatenOblak`, а не в
   * таблицата от възможности.
   *
   * Оттук идва и другото: офлайн планът НЕ е по-долно стъпало на облачната
   * стълба, а ДРУГ КЛОН — същият двигател, друг носител. Стълбата се мери
   * само между облачните.
   */
  readonly bezOblak: boolean;
  /** иска ли ПЛАТЕН план при Google/Microsoft/Apple */
  readonly iskaPlatenOblak: boolean;
  readonly vazmozhnosti: ReadonlySet<Vazmozhnost>;
}

/** Облачните планове, по ред. Стълбата важи МЕЖДУ ТЯХ, не спрямо офлайн. */
export function oblachni(): readonly Plan[] {
  return PLANOVE.filter((p) => !p.bezOblak);
}

/**
 * ЛИЧНИЯТ ОФЛАЙН · без облак изобщо (ADR-006, план 1).
 *
 * Няма драйв, значи няма и `iztochnitsi` — няма таблица, от която да се чете.
 * Всичко останало от двигателя е налично: Журналът, Сметките, филтрите,
 * износът. Влиза се с ключа на машината, не през доставчик.
 *
 * Изборът, който купувачът прави: пълна независимост срещу пълна отговорност.
 * Без облак няма автоматично копие — затова износът тук не е удобство.
 */
const OFLAYN: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'arhiv-eksel',
  'iznos-vnos',
  'fini-filtri',
  'ogledala',
];

/**
 * ЛИЧНИЯТ · работата на ЕДИН човек. Носи всичко от двигателя ОСВЕН трите неща,
 * които предполагат ВТОРИ човек: други имейли, роли, колонно право.
 *
 * Това не е орязване, а смисълът на плана. Негови думи: „Персоналният е само
 * един акаунт, без да добавяш други акаунти и да даваш роли за достъп до
 * редакция и наблюдение. Това е най-персоналният."
 */
const LICHNI: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'iztochnitsi',
  'arhiv-eksel',
  'iznos-vnos',
  'fini-filtri',
  'ogledala',
];

/** Стартъпът: ЦЯЛАТА функционалност. Нагоре расте капацитетът, не функциите. */
const STANDARTNI: readonly Vazmozhnost[] = [
  ...LICHNI,
  'drugi-imeyli',
  'roli-za-dostap',
  'kolonno-pravo',
  'svarzhi-ii',
];

/**
 * Плановете. Таблицата е ЗАКОН, но с ЕДНА уговорка:
 *
 *   ОФЛАЙН планът е отделен КЛОН, не по-долно стъпало. Той няма `iztochnitsi`
 *   (няма драйв, от който да чете), затова не е подмножество на Личния.
 *   Стълбата „по-големият носи всичко от по-малкия" се мери само между
 *   ОБЛАЧНИТЕ — виж `oblachni()`.
 */
export const PLANOVE: readonly Plan[] = Object.freeze([
  {
    klyuch: 'lichen-oflayn',
    ime: 'Личен · офлайн',
    zaKogo:
      'БЕЗ облак изобщо · Журналът е само на устройството, отваря се без мрежа — ' +
      'пълна независимост срещу пълна отговорност за копието',
    bezOblak: true,
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>(OFLAYN),
  },
  {
    klyuch: 'lichen',
    ime: 'Личен',
    zaKogo:
      'физическо лице с натоварен график и малки проекти · САМО ЕДИН АКАУНТ — ' +
      'без други имейли и без роли за редакция или наблюдение',
    bezOblak: false,
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>(LICHNI),
  },
  {
    klyuch: 'standarten',
    ime: 'Стандартен',
    zaKogo:
      'СТАРТЪПЪТ · малък и среден бизнес: добавят се ДРУГИ ИМЕЙЛИ за достъп от ' +
      'съответната поща — сигурността за това е при доставчика, не в нас',
    bezOblak: false,
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>(STANDARTNI),
  },
  {
    klyuch: 'razshiren',
    ime: 'Разширен',
    zaKogo: 'екипи с обем — същата функционалност, купен капацитет',
    bezOblak: false,
    iskaPlatenOblak: true,
    vazmozhnosti: new Set<Vazmozhnost>([...STANDARTNI, 'poveche-hranilishte']),
  },
  {
    klyuch: 'holding',
    ime: 'Холдинг',
    zaKogo: 'корпорации — капацитет по договор и поръчкови разработки',
    bezOblak: false,
    iskaPlatenOblak: true,
    vazmozhnosti: new Set<Vazmozhnost>([
      ...STANDARTNI,
      'poveche-hranilishte',
      'individualni-razrabotki',
    ]),
  },
]);

const PO_KLYUCH = new Map(PLANOVE.map((p) => [p.klyuch, p]));

/** По подразбиране е СТАРТЪПЪТ — стандартният. */
export const PLAN_PO_PODRAZBIRANE = 'standarten';

export function plan(klyuch: string | undefined): Plan {
  return PO_KLYUCH.get(klyuch ?? '') ?? PO_KLYUCH.get(PLAN_PO_PODRAZBIRANE)!;
}

/**
 * ИЗБОРЪТ на собственика: планът + кои възможности е ОТМЕТНАЛ.
 * Планът казва какво МОЖЕ; отметките — какво ИСКА да вижда.
 */
export interface Izbor {
  readonly plan: Plan;
  readonly vklyucheni: ReadonlySet<Vazmozhnost>;
}

/** Нов избор: всичко, което планът позволява, е включено. */
export function izborPoPodrazbirane(klyuch?: string): Izbor {
  const p = plan(klyuch);
  return { plan: p, vklyucheni: new Set(p.vazmozhnosti) };
}

/**
 * Единственият въпрос, който кодът задава — двуслоен:
 * планът я ПОЗВОЛЯВА ли, и собственикът я е ВКЛЮЧИЛ ли.
 */
export function mozhe(izbor: Izbor, v: Vazmozhnost): boolean {
  return izbor.plan.vazmozhnosti.has(v) && izbor.vklyucheni.has(v);
}

/** Планът я позволява, но е изключена от отметките — различно от „няма я". */
export function eIzklyuchena(izbor: Izbor, v: Vazmozhnost): boolean {
  return izbor.plan.vazmozhnosti.has(v) && !izbor.vklyucheni.has(v);
}

/** Включва или изключва една възможност. Задължителните не се махат. */
export function prevklyuchi(izbor: Izbor, v: Vazmozhnost, vklyuchena: boolean): Izbor {
  if (!izbor.plan.vazmozhnosti.has(v)) return izbor;
  if (ZADALZHITELNI.has(v) && !vklyuchena) return izbor;

  const nov = new Set(izbor.vklyucheni);
  if (vklyuchena) nov.add(v);
  else nov.delete(v);
  return { plan: izbor.plan, vklyucheni: nov };
}

/** Смяна на плана: пази отметките, които новият план още позволява. */
export function smeniPlan(izbor: Izbor, klyuch: string): Izbor {
  const nov = plan(klyuch);
  const vklyucheni = new Set<Vazmozhnost>();
  for (const v of nov.vazmozhnosti) {
    if (izbor.vklyucheni.has(v) || !izbor.plan.vazmozhnosti.has(v)) vklyucheni.add(v);
  }
  for (const v of ZADALZHITELNI) if (nov.vazmozhnosti.has(v)) vklyucheni.add(v);
  return { plan: nov, vklyucheni };
}

/** Стига ли акаунтът при доставчика за този план. */
export function stigaLiHranilishteto(p: Plan, hranilishte: VidHranilishte): boolean {
  return !p.iskaPlatenOblak || hranilishte === 'платено';
}
