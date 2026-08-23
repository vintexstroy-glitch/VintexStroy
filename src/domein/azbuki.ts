/**
 * АЗБУЧНИТЕ ПАКЕТИ · какво тегли телефонът и какво пази джобът.
 *
 * Думите на собственика: „Може ли да е избор при инсталация… По рекламата на
 * регионите са групирани езиците и азбуките. Искам да е опция при сваляне само."
 *
 * Затова азбуките са ПАКЕТИ по регион, а не отметка в приложението. Изборът се
 * прави ВЕДНЪЖ, при сваляне — адресът го носи (`?azbuki=evropa`) — и оттам
 * нататък не се пипа.
 *
 * Защо не всичко наведнъж: `unicode-range` кара браузъра да тегли само азбуката,
 * която му трябва, така че ОНЛАЙН цената е нула независимо колко пакета има.
 * Тежестта се усеща само в ДЖОБА — онова, което работникът пази предварително,
 * за да го има и без мрежа. Затова пакетът решава какво се предкешира, и нищо
 * друго.
 *
 * Всички азбуки стоят в хранилището при всеки пакет. Липсваща азбука се тегли
 * при нужда, ако има мрежа; офлайн пада на резервния стек. Никога празно място.
 *
 * ВАЛУТА ТУК НЯМА. Тя е ЕДНА (евро) и не се избира с пакета — негова поправка
 * от 23.08: „защо се изгражда валута, ако тя е само една и няма смяна с курс“.
 * Какво е една КОЛОНА — евро, процент или число — казва `vid-stoynost.ts`.
 */

/** Подмножествата, както Google ги дели — имената са техните, за да се сверяват. */
export type Podmnozhestvo =
  | 'latin'
  | 'latin-ext'
  | 'cyrillic'
  | 'cyrillic-ext'
  | 'greek'
  | 'greek-ext'
  | 'vietnamese';

export interface Paket {
  readonly klyuch: string;
  readonly ime: string;
  /** кои страни и езици покрива — това е рекламният му смисъл */
  readonly zaKogo: string;
  readonly podmnozhestva: readonly Podmnozhestvo[];
}

/**
 * Пакетите, от малкия към големия. По-големият носи всичко от по-малкия —
 * тест го пази, както при плановете.
 */
export const PAKETI: readonly Paket[] = Object.freeze([
  {
    klyuch: 'bg',
    ime: 'България',
    zaKogo: 'българска кирилица и цялата латиница',
    podmnozhestva: ['latin', 'cyrillic'],
  },
  {
    klyuch: 'evropa',
    ime: 'Европа',
    zaKogo: 'плюс полски, чешки, турски, украински, сръбски',
    podmnozhestva: ['latin', 'cyrillic', 'latin-ext', 'cyrillic-ext'],
  },
  {
    klyuch: 'plus',
    ime: 'Разширен',
    zaKogo: 'плюс гръцки и виетнамски',
    podmnozhestva: ['latin', 'cyrillic', 'latin-ext', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
  },
]);

/** Най-малкият. Той влиза, когато адресът не казва друго. */
export const PAKET_PO_PODRAZBIRANE = 'bg';

const PO_KLYUCH = new Map(PAKETI.map((p) => [p.klyuch, p]));

/** Непознат ключ пада към най-малкия — по-добре малко, отколкото нищо. */
export function paket(klyuch: string | null | undefined): Paket {
  return PO_KLYUCH.get(klyuch ?? '') ?? PO_KLYUCH.get(PAKET_PO_PODRAZBIRANE)!;
}

/** Носи ли пакетът тази азбука в джоба си. */
export function nosi(p: Paket, podmn: Podmnozhestvo): boolean {
  return p.podmnozhestva.includes(podmn);
}
