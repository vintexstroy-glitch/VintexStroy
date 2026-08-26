/**
 * БУТОНИТЕ · моделите на ПЪТИЩАТА.
 *
 * Негови думи, и от тях следва целият файл:
 *
 *   „Създаваш бутон и го връзваш от Настройки по избран начин, с филтър за
 *    видимост на служители за бутона, и свързан по различен начин с хедър и
 *    комбинацията хедъри. **Бутоните са модели на пътища.**"
 *
 * Резен 12 направи МОДЕЛА НА ТАБЛИЦА — какво значи една глава. Тук е другата
 * половина: какво се СЛУЧВА с прочетеното. Двете заедно правят изречението му
 * „всички таблици на входните данни се определят индивидуално и свободно"
 * проверимо, а не пожелание.
 *
 * ЗАЩО ПОСОКАТА Е ЕДНА. Негова поправка на собствения му списък: „едното е само
 * сверяване, а другото е записване. Не може и двете, защото е безсмислено да
 * свериш от папката и да запишеш същото." Затова `posoka` не е списък —
 * бутон, обявен „чете", няма път към писане, и това се пази от типа.
 *
 * ЗАЩО ПАПКАТА Е ЛОГИЧЕСКА, не директория. Негови думи: „избираш името на папка
 * Наеми КЕШ или Наеми Банка и я слагаш където поискаш" и „Приход и Разход
 * събират автоматично папките, които работят с /+/ и /−/". Значи папката
 * ГРУПИРА, не съхранява. Оттук: нула OAuth, нула Drive, нула избирач на
 * директории — работи на телефон, офлайн, и не чака регистрация никъде.
 *
 * ЗАЩО СПИСЪК ОТ ПОЗВОЛЕНИ МОДЕЛИ. Негов избор. Бутонът „Наеми Банка" не бива
 * да приеме фактура по погрешка. Чужд хедър се отказва НА ГЛАС — не се гади и
 * не се преглъща.
 */

import { nameriModel, type ModelNaTablitsa } from '../iztochnik/model.js';
import type { Tablitsa } from '../iztochnik/tablitsa.js';

/**
 * ДЕСЕТТЕ ПЪТЯ · неговият списък, изброен ПОИМЕННО.
 *
 * Изброени са тук, а не измисляни в движение: бутон с непознато действие е
 * бутон, за който никой не знае какво прави. Всяко ново действие е ред тук,
 * където се вижда — и носи посоката си със себе си.
 */
export type Deystvie =
  | 'sveryavane-eksel' // 1 · чете · сверява данните за минал период
  | 'prezapisvane-eksel' // 2 · пише · изкарва таблицата обратно
  | 'sveryavane-pdf' // 3 · чете
  | 'sazdavane-tablitsa' // 4 · пише
  | 'sazdavane-pdf' // 5 · пише
  | 'zasnemane-arhiv' // 6 · пише
  | 'smyatane' // 7 · нито чете файл, нито пише
  | 'zapisvane' // 8 · пише
  | 'sveryavane-vsichko' // 9 · чете · главният
  | 'spetsialni-formuli'; // 10 · смята между хедъри

export type Posoka = 'chete' | 'pishe' | 'smyata';

interface OpisNaDeystvie {
  readonly klyuch: Deystvie;
  readonly ime: string;
  readonly posoka: Posoka;
  /** построено ли е вече, или само обявено — казва се на глас */
  readonly postroeno: boolean;
}

export const DEYSTVIYA: readonly OpisNaDeystvie[] = Object.freeze([
  { klyuch: 'sveryavane-eksel', ime: 'Сверяване от Ексел', posoka: 'chete', postroeno: true },
  { klyuch: 'prezapisvane-eksel', ime: 'Презаписване в Ексел', posoka: 'pishe', postroeno: false },
  { klyuch: 'sveryavane-pdf', ime: 'Сверяване от ПДФ', posoka: 'chete', postroeno: false },
  // Построен в резен 14: `src/iznos/ot-model.ts` претворява модела на хедъра
  // в лист, а `rabotnaKniga` го изкарва като .xlsx. Негови думи: „функцията
  // дава възможност да претвориш модела на таблицата, от която четеш".
  { klyuch: 'sazdavane-tablitsa', ime: 'Създаване на таблица', posoka: 'pishe', postroeno: true },
  { klyuch: 'sazdavane-pdf', ime: 'Създаване на ПДФ', posoka: 'pishe', postroeno: false },
  { klyuch: 'zasnemane-arhiv', ime: 'Заснемане и архив', posoka: 'pishe', postroeno: false },
  { klyuch: 'smyatane', ime: 'Смятане', posoka: 'smyata', postroeno: false },
  { klyuch: 'zapisvane', ime: 'Записване', posoka: 'pishe', postroeno: false },
  { klyuch: 'sveryavane-vsichko', ime: 'Сверяване на всичко', posoka: 'chete', postroeno: false },
  { klyuch: 'spetsialni-formuli', ime: 'Специални формули', posoka: 'smyata', postroeno: false },
]);

const PO_KLYUCH = new Map(DEYSTVIYA.map((d) => [d.klyuch, d]));

export function opisNaDeystvie(klyuch: Deystvie): OpisNaDeystvie {
  const d = PO_KLYUCH.get(klyuch);
  if (!d) throw new GreshkaButon(`Непознато действие „${klyuch}".`);
  return d;
}

/** Посоката се ВАДИ от действието, не се пише втори път. Правило 17. */
export function posokaNa(klyuch: Deystvie): Posoka {
  return opisNaDeystvie(klyuch).posoka;
}

export interface Buton {
  /** име, дадено от човека: „Извлечения ОББ", „Наеми КЕШ" */
  readonly klyuch: string;
  /**
   * Име на папка — ЛОГИЧЕСКО. Групира бутоните в Настройки и влиза в следата
   * на всяка сверка. Не е директория на диска и не се създава никъде.
   */
  readonly papka: string;
  readonly deystvie: Deystvie;
  /**
   * Имената на ПОЗВОЛЕНИТЕ модели. Празен списък значи „кой да е модел" —
   * позволено е, но се вижда на екрана като предупреждение, защото точно
   * тогава бутонът може да глътне чужд файл.
   */
  readonly modeli: readonly string[];
  /**
   * Кои роли го виждат. Празно = всички. При един акаунт въпросът „кой вижда
   * какво" не съществува (ADR-007) — полето стои, за да не се преправя после.
   */
  readonly vidimost: readonly string[];
}

export class GreshkaButon extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaButon';
  }
}

/**
 * Прави бутон от избора на човека и веднага го проверява.
 *
 * Отказва ГЛАСНО при: липсващо име, липсваща папка, непознато действие,
 * непостроено действие, повторен модел в списъка. По-добре отказ сега,
 * отколкото бутон, който мълчи при натискане.
 */
export function napraviButon(n: {
  klyuch: string;
  papka: string;
  deystvie: Deystvie;
  modeli?: readonly string[];
  vidimost?: readonly string[];
}): Buton {
  const klyuch = n.klyuch.trim();
  const papka = n.papka.trim();

  if (klyuch === '') throw new GreshkaButon('Бутонът иска име — то стои на самия бутон.');
  if (papka === '') {
    throw new GreshkaButon('Бутонът иска папка — по нея се групира в Приход и Разход.');
  }

  const opis = opisNaDeystvie(n.deystvie);
  if (!opis.postroeno) {
    throw new GreshkaButon(
      `„${opis.ime}" още не е построено. Обявено е, но зад него няма код — ` +
        'бутон, който мълчи при натискане, е по-лош от липсващ бутон.',
    );
  }

  const modeli: string[] = [];
  for (const m of n.modeli ?? []) {
    const ime = m.trim();
    if (ime === '') continue;
    if (modeli.includes(ime)) {
      throw new GreshkaButon(`Моделът „${ime}" е сложен два пъти в един бутон.`);
    }
    modeli.push(ime);
  }

  return Object.freeze({
    klyuch,
    papka,
    deystvie: n.deystvie,
    modeli: Object.freeze(modeli),
    vidimost: Object.freeze([...(n.vidimost ?? [])]),
  });
}

/**
 * КРАТЪК БЕЛЕГ НА СЪДЪРЖАНИЕТО · „смени ли се нещо изобщо".
 *
 * Същата работа като `belegNaModel`: сравнява се новият бутон със записания и
 * при еднакъв белег в Журнала не влиза нищо. За `opId` НЕ се ползва — вж.
 * бележката там защо.
 */
export function belegNaButon(b: Buton): string {
  return `${b.papka}|${b.deystvie}|${[...b.modeli].sort().join(',')}|${[...b.vidimost].sort().join(',')}`;
}

/** Бутоните на една папка, подредени по име — за екрана и за менюто. */
export function vPapka(butoni: readonly Buton[], papka: string): readonly Buton[] {
  return butoni
    .filter((b) => b.papka === papka)
    .sort((a, b) => a.klyuch.localeCompare(b.klyuch));
}

/** Папките, каквито се получават от бутоните. Няма отделен списък с папки. */
export function papki(butoni: readonly Buton[]): readonly string[] {
  return [...new Set(butoni.map((b) => b.papka))].sort((a, b) => a.localeCompare(b));
}

/**
 * Кои модели може да ползва този бутон.
 *
 * Празен списък значи „всички" — нарочно позволено, защото първият бутон се
 * прави преди първия модел. Екранът го казва; кодът не го забранява.
 */
export function pozvoleniModeli(
  b: Buton,
  vsichki: readonly ModelNaTablitsa[],
): readonly ModelNaTablitsa[] {
  return b.modeli.length === 0 ? vsichki : vsichki.filter((m) => b.modeli.includes(m.klyuch));
}

/**
 * Моделът, с който ТОЗИ бутон чете ТАЗИ таблица.
 *
 * Отказва ГЛАСНО, когато таблицата се познава от модел, който бутонът НЕ
 * позволява: това е грешният файл в правилния бутон — най-скъпата грешка тук,
 * защото минава за успех. Затова съобщението казва и кой модел я познава.
 */
export function modelZaTablitsata(
  b: Buton,
  vsichki: readonly ModelNaTablitsa[],
  t: Tablitsa,
): ModelNaTablitsa | undefined {
  const moy = nameriModel(pozvoleniModeli(b, vsichki), t);
  if (moy) return moy;

  const chuzhd = nameriModel(vsichki, t);
  if (chuzhd) {
    throw new GreshkaButon(
      `„${t.ime}" се познава от модела „${chuzhd.klyuch}", но бутонът ` +
        `„${b.klyuch}" не го позволява. Позволените са: ${b.modeli.join(', ')}.`,
    );
  }
  return undefined;
}
