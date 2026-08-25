/**
 * ПАДАЩИТЕ МЕНЮТА · законът от 25.08 (И97).
 *
 * Негови думи: „Всяко падащо меню в приложението **приема и нови стойности**,
 * не само избор от списъка. Кое от двете си направил, се вижда от **цвета на
 * текста в полето**: СИН — избрал си съществуваща; ЧЕРЕН — написал си своя…
 * **Нищо не спира човека.** Няма въпрос, няма потвърждение, няма изскачащ
 * прозорец. Работиш и виждаш какво ще стане."
 *
 * ═══ ЗАЩО ЦВЕТЪТ НЕ СТИГА САМ ═══
 *
 * Законът е верен и остава непокътнат — но „син срещу черен текст" е точно
 * онова, което достъпността нарича носене на смисъл САМО с цвят. Онзи, който
 * не различава синьо от черно, вижда две еднакви полета и никога не научава,
 * че е добавил нещо в речника на системата.
 *
 * Затова тук цветът стои, а до него върви ВТОРИ носител — дума. Същото
 * правило, което вече пази цветовете при въвеждане (ADR-032): цветът НАМИРА,
 * думата ОБЯСНЯВА. Законът не се разхлабва; той се подпира.
 *
 * Занаятът стига до същото от другата страна: готовите съставки за такова
 * меню (React Select · Base UI · Chakra) показват ИЗРИЧЕН ред „Създай «X»",
 * вместо да оцветяват. Нашият избор е неговият — цвят БЕЗ спиране — плюс
 * тяхната дума.
 *
 * ═══ ДВАТА ВИДА ВХОД ═══
 *
 * „Меню, което ОПИСВА → расте свободно. Меню, върху което системата СМЯТА →
 * расте само от Настройки." Признакът е ЕДИН и не се решава за всяко меню
 * поотделно.
 *
 * ═══ СТАРА СТОЙНОСТ НЕ СЕ ТРИЕ ═══
 *
 * „Ако е сгрешена — спира се да се предлага, но редовете, които вече я носят,
 * остават непокътнати." Това е правило 1, приложено към речника: триенето би
 * пренаписало минали записи.
 */

export class GreshkaMenyu extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaMenyu';
  }
}

/** Двата вида вход · признакът е ОПИСВА срещу СМЯТА. */
export const VIDOVE_VHOD = ['otvoreno', 'zaklyucheno'] as const;

export type VidVhod = (typeof VIDOVE_VHOD)[number];

export const IMENA_NA_VIDOVETE_VHOD: Readonly<Record<VidVhod, string>> = Object.freeze({
  otvoreno: 'отворено · расте от полето',
  zaklyucheno: 'заключено · расте само от Настройки',
});

/** Една стойност в речника. Сгрешената спира да се предлага, но НЕ се трие. */
export interface Stoynost {
  readonly tekst: string;
  /** предлага ли се още · false значи „стои в старите редове, но не в менюто" */
  readonly predlagaSe: boolean;
}

export interface Menyu {
  readonly klyuch: string;
  readonly ime: string;
  readonly vid: VidVhod;
  readonly stoynosti: readonly Stoynost[];
}

/**
 * ПОДРАВНЯВАНЕТО при въвеждане · негово, дословно:
 *
 *   „маха се излишният интервал в началото, в края и между думите. Нищо
 *    повече — главните букви НЕ се пипат, защото „Акт 15" и „акт 15" може да
 *    са различни неща в различни списъци."
 *
 * Затова тук няма `toLowerCase()`. Изкушението е голямо — то би „почистило"
 * речника — но би слепило две стойности, които човекът е разделил нарочно.
 */
export function podravni(tekst: string): string {
  return tekst.trim().replace(/\s+/g, ' ');
}

/** Кои се показват в списъка · спрените ги няма, старите редове ги пазят. */
export function predlagani(m: Menyu): readonly Stoynost[] {
  return m.stoynosti.filter((s) => s.predlagaSe);
}

/** Има ли я вече · сравнява се ПОДРАВНЕНО, но със запазен регистър. */
export function veche(m: Menyu, tekst: string): boolean {
  const t = podravni(tekst);
  return m.stoynosti.some((s) => podravni(s.tekst) === t);
}

/** Какво е направил човекът · четири състояния, не две. */
export const SASTOYANIYA = ['prazno', 'izbrano', 'novo', 'otkazano'] as const;

export type Sastoyanie = (typeof SASTOYANIYA)[number];

export interface Rezultat {
  readonly sastoyanie: Sastoyanie;
  /** цветът на текста · неговият закон, непокътнат */
  readonly tsvyat: 'sinio' | 'cherno' | '';
  /**
   * ВТОРИЯТ носител · дума. Цветът намира, думата обяснява (ADR-032).
   * Празна при избрано — там няма какво да се учи.
   */
  readonly znak: string;
  /** какво ще стане · показва се, без да спира */
  readonly kazva: string;
  /** ще влезе ли НОВА стойност в речника при запис */
  readonly shteDobavi: boolean;
  /** приема ли се изобщо · false само при заключено меню с нова стойност */
  readonly priema: boolean;
}

/**
 * СЪСТОЯНИЕТО НА ПОЛЕТО · сърцето на закона.
 *
 * `izbrano` е онова, което човекът е НАТИСНАЛ от списъка; `vaveden` е онова,
 * което стои в полето сега. Разликата между двете е целият закон:
 *
 *   · натиснал и не е пипал  → СИНЬО
 *   · натиснал и е редактирал → ПОЧЕРНЯВА в мига на разликата
 *   · писал сам               → ЧЕРНО
 *   · писал сам нещо, което СЛУЧАЙНО съвпада → пак ЧЕРНО
 *
 * Последното е неговото най-фино правило и си има причина: „ти не си избирал —
 * съвпадението е случайно… цветът не бива да лъже за какво си направил."
 * При запис дубликат така или иначе не се създава — `shteDobavi` го казва.
 */
export function sastoyanieNaPoleto(n: {
  readonly menyu: Menyu;
  /** каквото стои в полето сега */
  readonly vaveden: string;
  /** каквото е НАТИСНАТО от списъка · празно значи „не е натискано" */
  readonly izbrano?: string;
}): Rezultat {
  const vaveden = podravni(n.vaveden);
  const izbrano = podravni(n.izbrano ?? '');

  if (vaveden === '') {
    return Object.freeze({
      sastoyanie: 'prazno' as const,
      tsvyat: '' as const,
      znak: '',
      kazva: '',
      shteDobavi: false,
      priema: true,
    });
  }

  // ИЗБРАНО · натиснато е и оттогава не е пипано.
  if (izbrano !== '' && vaveden === izbrano) {
    return Object.freeze({
      sastoyanie: 'izbrano' as const,
      tsvyat: 'sinio' as const,
      znak: '',
      kazva: 'Избрана съществуваща стойност — нищо ново не се създава.',
      shteDobavi: false,
      priema: true,
    });
  }

  // НОВО · или писано на ръка, или редактирано след избора. И в двата случая
  // ПОЧЕРНЯВА — „в мига, в който се различи от избраното".
  const imaGoVeche = veche(n.menyu, vaveden);

  if (n.menyu.vid === 'zaklyucheno' && !imaGoVeche) {
    // Заключеното НЕ почернява — то просто не приема (негово).
    return Object.freeze({
      sastoyanie: 'otkazano' as const,
      tsvyat: '' as const,
      znak: '🔒 заключено',
      kazva: `„${n.menyu.ime}" се променя от Настройки — върху този списък системата смята.`,
      shteDobavi: false,
      priema: false,
    });
  }

  return Object.freeze({
    sastoyanie: 'novo' as const,
    tsvyat: 'cherno' as const,
    // Думата е ВТОРИЯТ носител: онзи, който не различава синьо от черно, я чете.
    znak: imaGoVeche ? '= съществуваща' : '＋ нова стойност',
    kazva: imaGoVeche
      ? 'Съвпада със съществуваща — при запис дубликат не се създава.'
      : `Ще влезе в списъка „${n.menyu.ime}" и ще я виждат всички.`,
    shteDobavi: !imaGoVeche,
    priema: true,
  });
}

/**
 * ДОБАВЯ стойност в речника · и отказва, когато менюто е заключено.
 *
 * Отказът е С ДУМИ и назовава КОЙ може: заключено меню без обяснение изглежда
 * като счупено поле.
 */
export function dobaviStoynost(m: Menyu, tekst: string, eStopanin = false): Menyu {
  const t = podravni(tekst);
  if (t === '') throw new GreshkaMenyu('Празна стойност не влиза в списък.');
  if (m.vid === 'zaklyucheno' && !eStopanin) {
    throw new GreshkaMenyu(
      `„${m.ime}" е заключен списък — променя се само от Настройки, и само от Стопанина.`,
    );
  }
  if (veche(m, t)) return m; // дубликат не се създава · тихо, защото не е грешка
  return Object.freeze({
    ...m,
    stoynosti: Object.freeze([...m.stoynosti, Object.freeze({ tekst: t, predlagaSe: true })]),
  });
}

/**
 * СПИРА стойност да се предлага · неговият отговор на „как се чисти сгрешена".
 *
 * НЕ трие. „Редовете, които вече я носят, остават непокътнати — защото
 * триенето би пренаписало минали записи" (правило 1, приложено към речника).
 */
export function spriDaSePredlaga(m: Menyu, tekst: string): Menyu {
  const t = podravni(tekst);
  if (!veche(m, t)) throw new GreshkaMenyu(`„${t}" го няма в „${m.ime}".`);
  return Object.freeze({
    ...m,
    stoynosti: Object.freeze(
      m.stoynosti.map((s) =>
        podravni(s.tekst) === t ? Object.freeze({ ...s, predlagaSe: false }) : s,
      ),
    ),
  });
}

/** И обратното · спряна стойност се връща в списъка. */
export function varniVSpisaka(m: Menyu, tekst: string): Menyu {
  const t = podravni(tekst);
  if (!veche(m, t)) throw new GreshkaMenyu(`„${t}" го няма в „${m.ime}".`);
  return Object.freeze({
    ...m,
    stoynosti: Object.freeze(
      m.stoynosti.map((s) =>
        podravni(s.tekst) === t ? Object.freeze({ ...s, predlagaSe: true }) : s,
      ),
    ),
  });
}

/** Броените показатели · числа, не усещане (правило 17). */
export function pokazateliNaMenyuto(m: Menyu): {
  readonly vsichki: number;
  readonly predlagani: number;
  readonly sprenii: number;
} {
  return {
    vsichki: m.stoynosti.length,
    predlagani: predlagani(m).length,
    sprenii: m.stoynosti.length - predlagani(m).length,
  };
}
