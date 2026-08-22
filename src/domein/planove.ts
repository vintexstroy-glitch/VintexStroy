/**
 * ПЛАНОВЕТЕ · един двигател, четири продукта.
 *
 * Думата на собственика: версиите се правят ОТ ОСНОВАТА на двигателя, отсега.
 * Основният продукт — стартъпът — е неговият БЕЗПЛАТЕН Gmail акаунт със
 * споделен Драйв: всички служители влизат като ЕДИН акаунт в приложението,
 * без роли и без персонализация — не защото не можем, а защото безплатното
 * споделяне не ги носи и продуктът е скроен по тази истина.
 *
 * Оттам: за по-евтиния отпадат функции; единичният е вариант с отпаднали
 * функции; над основния са холдинги и корпорации — платени хранилища,
 * сигурност и индивидуални разработки.
 *
 * Тук стои САМО таблицата и вратичката `mozhe()`. Никаква проверка на
 * самоличност — тя е П3 и чака думата му. Кодът навсякъде пита възможността
 * по име, никога плана по име — така нов план е нов ред тук, не търсене
 * из кода.
 */

export type Vazmozhnost =
  | 'zapis' // писане през Вратата — всички го имат
  | 'smetki-dds' // Сметки, справки, замразяване
  | 'iztochnitsi' // четене от Excel/CSV/PDF и сверена промяна
  | 'arhiv-eksel' // архивът за Ексел
  | 'iznos-vnos' // JSON износ и внасяне
  | 'fini-filtri' // фините филтри по колоните
  | 'spodelen-akaunt' // споделеният Драйв: всички като един акаунт
  | 'roli-i-personalizatsiya' // роли, колонни права, персонални изгледи
  | 'golemi-hranilishta' // платени хранилища и сигурност
  | 'individualni-razrabotki'; // поръчкови разработки

export interface Plan {
  readonly klyuch: string;
  readonly ime: string;
  readonly opisanie: string;
  readonly vazmozhnosti: ReadonlySet<Vazmozhnost>;
}

const OSNOVNI: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'iztochnitsi',
  'arhiv-eksel',
  'iznos-vnos',
  'fini-filtri',
  'spodelen-akaunt',
];

/**
 * Четирите плана. Подредени от малкия към големия — и таблицата е ЗАКОН:
 * тестът пази всеки по-голям план да носи всичко от по-малкия.
 */
export const PLANOVE: readonly Plan[] = Object.freeze([
  {
    klyuch: 'edinichen',
    ime: 'Единичен',
    opisanie: 'един човек, една машина — без споделяне и без източници отвън',
    vazmozhnosti: new Set<Vazmozhnost>(['zapis', 'smetki-dds', 'iznos-vnos']),
  },
  {
    klyuch: 'evtin',
    ime: 'Евтин',
    opisanie: 'основният с отпаднали функции — без архив за Ексел и без фини филтри',
    vazmozhnosti: new Set<Vazmozhnost>([
      'zapis',
      'smetki-dds',
      'iztochnitsi',
      'iznos-vnos',
      'spodelen-akaunt',
    ]),
  },
  {
    klyuch: 'osnoven',
    ime: 'Малък и среден бизнес',
    opisanie:
      'СТАРТЪПЪТ: споделен безплатен Gmail Драйв — всички влизат като един акаунт, без роли',
    vazmozhnosti: new Set<Vazmozhnost>(OSNOVNI),
  },
  {
    klyuch: 'holding',
    ime: 'Холдинги и корпорации',
    opisanie: 'платени хранилища, сигурност, роли и индивидуални разработки',
    vazmozhnosti: new Set<Vazmozhnost>([
      ...OSNOVNI,
      'roli-i-personalizatsiya',
      'golemi-hranilishta',
      'individualni-razrabotki',
    ]),
  },
]);

const PO_KLYUCH = new Map(PLANOVE.map((p) => [p.klyuch, p]));

/** Планът по подразбиране Е стартъпът. */
export const PLAN_PO_PODRAZBIRANE = 'osnoven';

export function plan(klyuch: string | undefined): Plan {
  return PO_KLYUCH.get(klyuch ?? '') ?? PO_KLYUCH.get(PLAN_PO_PODRAZBIRANE)!;
}

/** Единственият въпрос, който кодът задава: „този план може ли това?" */
export function mozhe(p: Plan, v: Vazmozhnost): boolean {
  return p.vazmozhnosti.has(v);
}
