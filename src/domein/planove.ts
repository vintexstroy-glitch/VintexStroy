/**
 * ПЛАНОВЕТЕ · ДВА КРИТЕРИЯ, не стълба (ADR-007).
 *
 * Думите на собственика, които смениха модела:
 *
 *   „Има ДВА КРИТЕРИЯ, които променят модела на работа на двигателя. Първи
 *    критерий е КЪДЕ Е ИНФОРМАЦИЯТА — локално или онлайн. Втори критерий е
 *    1 АКАУНТ или ПОВЕЧЕ от 1 акаунт; тук се дава достъп да разпределяш права
 *    над колони. Това поражда 2 продукта с 2 линии — Личен и Професионален."
 *
 *   „Офлайн продуктът не може ли да е кодът за онлайн, но кодът за това да го
 *    няма в продукта? Напрактика ОНЛАЙН АКАУНТИТЕ ПАК ТРЯБВА ДА МОГАТ ДА
 *    РАБОТЯТ ОФЛАЙН — ако съм служител и нямам обхват, пак трябва да вкарвам,
 *    и когато имам обхват, да се ъпдейтне."
 *
 * Оттук следват четири неща, и всяко е закон в този файл:
 *
 *   1. ЧЕТИРИ КЛЕТКИ, не четири стъпала. Носител × брой акаунти. Стълбата се
 *      мери ПО ЛИНИЯ (Личен ⊂ Професионален при еднакъв носител), не изобщо.
 *   2. ОФЛАЙН РАБОТАТА НЕ Е ПЛАН. Всяко издание работи без мрежа — джобът
 *      обслужва всички. Офлайн изданието се различава по едно: свързващата
 *      част ЛИПСВА в него, а не е изключена.
 *   3. ВТОРИЯТ КРИТЕРИЙ отключва колонното право. При един акаунт въпросът
 *      „кой вижда коя колона" не съществува — няма втори човек.
 *   4. Изборът е с ОТМЕТКИ върху позволеното. Въпросът остава двуслоен:
 *      планът ПОЗВОЛЯВА ли · и собственикът ВКЛЮЧИЛ ли я е.
 *
 * Цената и защитата са в ADR-007; тук е само какво може всяка клетка.
 */

import type { VidHranilishte } from '../yadro/samolichnost.js';

/** Първи критерий: КЪДЕ Е ИНФОРМАЦИЯТА. */
export type Nositel = 'lokalno' | 'oblak';

/** Втори критерий: КОЛКО АКАУНТА. Оттук идва колонното право. */
export type Akaunti = 'edin' | 'poveche';

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
  /** ПЪРВИ КРИТЕРИЙ · къде живее Журналът */
  readonly nositel: Nositel;
  /** ВТОРИ КРИТЕРИЙ · един акаунт или повече */
  readonly akaunti: Akaunti;
  /** иска ли ПЛАТЕН план при Google/Microsoft/Apple */
  readonly iskaPlatenOblak: boolean;
  readonly vazmozhnosti: ReadonlySet<Vazmozhnost>;
}

/** Плановете с даден носител — една колона от матрицата. */
export function poNositel(nositel: Nositel): readonly Plan[] {
  return PLANOVE.filter((p) => p.nositel === nositel);
}

/** Планът в дадена клетка. Всяка двойка критерии има точно един. */
export function vKletka(nositel: Nositel, akaunti: Akaunti): Plan {
  return PLANOVE.find((p) => p.nositel === nositel && p.akaunti === akaunti)!;
}

/**
 * РАБОТИ ЛИ БЕЗ МРЕЖА. Отговорът е ВИНАГИ „да" — и затова е функция, а не поле.
 *
 * Служителят без обхват пише в Журнала си и се сверява, щом обхватът се върне.
 * Ако това някога стане свойство на един план, значи някой е счупил обещанието
 * към онзи, който работи на строеж без сигнал.
 */
export function rabotiOflayn(_p: Plan): boolean {
  return true;
}

/**
 * ЯДРОТО НА ЕДИН ЧОВЕК · каквото работи и без втори човек, и без драйв.
 * Общото на четирите клетки — оттук нататък всяка добавя своето.
 */
const EDIN_CHOVEK: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'arhiv-eksel',
  'iznos-vnos',
  'fini-filtri',
  'ogledala',
];

/** Драйвът добавя ЕДНО: таблица, от която да се чете. */
const OT_DRAYVA: readonly Vazmozhnost[] = ['iztochnitsi'];

/**
 * ВТОРИЯТ ЧОВЕК добавя трите неща, които при един акаунт нямат смисъл:
 * кой влиза, каква роля има, коя колона вижда.
 *
 * `kolonno-pravo` стои и в ОФЛАЙН професионалния нарочно: там няма други
 * имейли, но има АГЕНТ, а един и същ филтър решава какво вижда агентът и
 * какво вижда човекът (ADR-005 · ADR-007).
 */
const VTORI_CHOVEK: readonly Vazmozhnost[] = ['drugi-imeyli', 'roli-za-dostap', 'kolonno-pravo'];

/**
 * ЧЕТИРИТЕ КЛЕТКИ · носител × брой акаунти.
 *
 * Не са стълба. Стълбата се мери ПО ЛИНИЯ: при еднакъв носител
 * Личният е подмножество на Професионалния. Между носителите не се мери —
 * локалният няма драйв, значи няма и източници, и това не е „по-малко",
 * а ДРУГО.
 */
export const PLANOVE: readonly Plan[] = Object.freeze([
  {
    klyuch: 'lichen-lokalno',
    ime: 'Личен · локално',
    zaKogo:
      'един човек, без облак · Журналът е само на устройството — пълна ' +
      'независимост срещу пълна отговорност за копието',
    nositel: 'lokalno',
    akaunti: 'edin',
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>(EDIN_CHOVEK),
  },
  {
    klyuch: 'profesionalen-lokalno',
    ime: 'Професионален · локално',
    zaKogo:
      'екип без облак · колонното право върви с АГЕНТА: същият филтър решава ' +
      'какво вижда той и какво вижда човекът',
    nositel: 'lokalno',
    akaunti: 'poveche',
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>([
      ...EDIN_CHOVEK,
      'kolonno-pravo',
      'individualni-razrabotki',
      'svarzhi-ii',
    ]),
  },
  {
    klyuch: 'lichen',
    ime: 'Личен',
    zaKogo:
      'физическо лице с натоварен график и малки проекти · САМО ЕДИН АКАУНТ — ' +
      'без други имейли и без роли за редакция или наблюдение',
    nositel: 'oblak',
    akaunti: 'edin',
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>([...EDIN_CHOVEK, ...OT_DRAYVA]),
  },
  {
    klyuch: 'profesionalen',
    ime: 'Професионален',
    zaKogo:
      'СТАРТЪПЪТ · добавят се ДРУГИ ИМЕЙЛИ за достъп от съответната поща, с ' +
      'права над колоните — сигурността за достъпа е при доставчика, не в нас',
    nositel: 'oblak',
    akaunti: 'poveche',
    iskaPlatenOblak: false,
    vazmozhnosti: new Set<Vazmozhnost>([
      ...EDIN_CHOVEK,
      ...OT_DRAYVA,
      ...VTORI_CHOVEK,
      'poveche-hranilishte',
      'individualni-razrabotki',
      'svarzhi-ii',
    ]),
  },
]);

const PO_KLYUCH = new Map(PLANOVE.map((p) => [p.klyuch, p]));

/** По подразбиране е СТАРТЪПЪТ — Професионалният в облака. */
export const PLAN_PO_PODRAZBIRANE = 'profesionalen';

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
