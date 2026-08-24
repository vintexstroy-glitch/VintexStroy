/**
 * ВРЪЗКИТЕ · картата на сигнала, като данни.
 *
 * Негова поръчка (23.08):
 *
 *   „Добави и спецификации на прозорците от таблото и връзката на всяко едно с
 *    останалите. ПОСОКА НА СИГНАЛА С МЕСТА — когато излиза и влиза, каква
 *    функция има: ОГЛЕДАЛО, ВРАТА С ПАЗАЧ, С БУТОН или друго."
 *
 * И поправката му за рисунката:
 *
 *   „Цветовете показват ПОСОКАТА… Движението се предизвиква от БУТОНИТЕ, които
 *    описахме, и ВИДА НА ТАБЛИЦАТА. Има СМЕСЕНИ ТАБЛИЦИ."
 *
 * ЗАЩО ТОВА Е КОД, А НЕ САМО ДОКУМЕНТ. Картата в `docs/izvori/04` е за четене.
 * Тук същата карта е проверима: връзка, обявена „огледало", която се опита да
 * пише, се отказва; и всяка непостроена връзка се брои, вместо да мълчи.
 *
 * Документ без пазач остарява тихо. Този файл е пазачът му.
 */

/**
 * ПЕТТЕ ФУНКЦИИ. Той назова четири и остави „или друго" — петата е кранът,
 * който не е връзка, а спирачка над всички.
 *
 * Изброени са ПОИМЕННО: стрелка, която не е една от петте, е ненаписан код и
 * се обявява като такъв, вместо да се нарисува като съществуваща.
 */
export type Funktsiya =
  | 'vrata' // единственият вход за факт · иска actor, opId, незамразен период
  | 'ogledalo' // производен изглед · сигналът само ИЗЛИЗА
  | 'buton' // път с ЕДНА посока и място
  | 'smyatach' // чиста сметка · същият вход дава същия изход
  | 'kran'; // спирачка НАД всички · не пипа Журнала

export const IMENA_NA_FUNKTSIITE: Readonly<Record<Funktsiya, string>> = Object.freeze({
  vrata: 'врата с пазач',
  ogledalo: 'огледало',
  buton: 'бутон',
  smyatach: 'смятач',
  kran: 'кран',
});

/**
 * Пише ли тази функция в Журнала.
 *
 * ПРАВИЛОТО: през Вратата се ВЛИЗА, през Огледалото се ИЗЛИЗА, бутонът НОСИ,
 * смятачът не мърда нищо. Само вратата пише — правило 2.
 */
export function pishe(f: Funktsiya): boolean {
  return f === 'vrata';
}

export class GreshkaVrazka extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaVrazka';
  }
}

export interface Vrazka {
  /** откъде тръгва сигналът */
  readonly ot: string;
  /** накъде отива */
  readonly kam: string;
  /** МЯСТОТО — къде точно влиза или излиза; негова дума „с места" */
  readonly myasto: string;
  readonly funktsiya: Funktsiya;
  /** има ли код зад нея, или е само обявена */
  readonly postroena: boolean;
  /** връща ли се сигнал обратно по същия път */
  readonly ednoposochna: boolean;
}

/**
 * КАРТАТА · всяка връзка от неговата рисунка.
 *
 * Редът следва рисунката отгоре надолу. Всяка носи адреса на думите му —
 * пълните цитати са в `docs/izvori/04-prozortsite-i-vrazkite.md`.
 */
export const VRAZKI: readonly Vrazka[] = Object.freeze([
  // ── Приходи и Разходи · двете постоянни ────────────────────────────────
  {
    ot: 'Наем Кеш · Наем Банка',
    kam: 'Приходи',
    myasto: 'сборът на колоната',
    funktsiya: 'ogledalo',
    postroena: true,
    ednoposochna: true,
  },
  {
    ot: 'Приходи · Разходи',
    kam: 'подпапката',
    myasto: 'папката на бутона',
    funktsiya: 'buton',
    postroena: true,
    ednoposochna: true,
  },
  {
    ot: 'подпапка',
    kam: 'Журнала',
    myasto: 'колоната с роля „сума"',
    funktsiya: 'vrata',
    postroena: true,
    ednoposochna: true,
  },

  // ── Управление ↔ Сметки · най-важната ─────────────────────────────────
  {
    ot: 'Управление',
    kam: 'Сметки',
    myasto: 'периодът',
    funktsiya: 'ogledalo',
    postroena: true,
    ednoposochna: true,
  },
  {
    ot: 'Сметки',
    kam: 'Сметки',
    myasto: 'симулацията · тук триенето е позволено',
    funktsiya: 'smyatach',
    postroena: true,
    ednoposochna: true,
  },
  {
    ot: 'Сметки',
    kam: 'Управление',
    myasto: 'сигнал за преглед и одобрение',
    funktsiya: 'vrata',
    postroena: false,
    ednoposochna: false,
  },
  {
    ot: 'Управление',
    kam: 'Сметки',
    myasto: 'бутонът „връщане към настоящо"',
    funktsiya: 'buton',
    postroena: false,
    ednoposochna: true,
  },

  // ── терминалът ─────────────────────────────────────────────────────────
  {
    ot: 'Продажби',
    kam: 'Продажби Архив',
    myasto: 'Състояние = Продаден',
    funktsiya: 'vrata',
    postroena: false,
    ednoposochna: true, // „Няма връщане от Продажби Архив."
  },

  // ── Калкулаторът ──────────────────────────────────────────────────────
  {
    ot: 'площообразуване',
    kam: 'Калкулатор',
    myasto: 'таблицата с площите',
    funktsiya: 'buton',
    postroena: false,
    ednoposochna: true,
  },
  {
    ot: 'Калкулатор',
    kam: 'Сметки на Стойност',
    myasto: 'цената',
    funktsiya: 'smyatach',
    postroena: false,
    ednoposochna: true,
  },

  // ── номенклатурите ────────────────────────────────────────────────────
  {
    ot: 'Контакти',
    kam: 'всички таблици',
    myasto: 'падащото меню „Отговорник"',
    funktsiya: 'ogledalo',
    postroena: false,
    ednoposochna: true,
  },
  {
    ot: 'Контакт',
    kam: 'покана по имейл',
    myasto: 'бутонът за съгласие',
    funktsiya: 'buton',
    postroena: false,
    ednoposochna: true,
  },

  // ── спирачката · не е връзка, а е над всички ──────────────────────────
  {
    ot: 'човекът',
    kam: 'Вратата',
    myasto: 'спирателният кран',
    funktsiya: 'kran',
    postroena: true,
    ednoposochna: true,
  },
]);

/**
 * Проверява една връзка, преди да се ползва.
 *
 * Отказва ГЛАСНО, когато нещо се опита да ПИШЕ през връзка, която не е врата.
 * Това е правило 2 („Вратата е единственият вход за запис"), направено
 * проверимо: документът го казва, този ред го пази.
 */
export function proveriPosoka(v: Vrazka, iskaZapis: boolean): void {
  if (iskaZapis && !pishe(v.funktsiya)) {
    throw new GreshkaVrazka(
      `„${v.ot} → ${v.kam}" е ${IMENA_NA_FUNKTSIITE[v.funktsiya]}, не врата. ` +
        'През нея се чете, не се пише — Вратата е единственият вход (правило 2).',
    );
  }
  if (!v.postroena) {
    throw new GreshkaVrazka(
      `„${v.ot} → ${v.kam}" е ОБЯВЕНА, но не е построена. ` +
        'Връзка, която мълчи при ползване, е по-лоша от липсваща.',
    );
  }
}

/** Връзките, които тръгват от този прозорец. */
export function ot(ime: string): readonly Vrazka[] {
  return VRAZKI.filter((v) => v.ot === ime);
}

/** Връзките, които влизат в този прозорец. */
export function kam(ime: string): readonly Vrazka[] {
  return VRAZKI.filter((v) => v.kam === ime);
}

/** Колко от картата има код зад себе си — броено, не оценявано (правило 17). */
export function dokade(): { postroeni: number; vsichki: number } {
  return {
    postroeni: VRAZKI.filter((v) => v.postroena).length,
    vsichki: VRAZKI.length,
  };
}

/** Обявените, но непостроени — за честния списък и за екрана. */
export function obyaveni(): readonly Vrazka[] {
  return VRAZKI.filter((v) => !v.postroena);
}
