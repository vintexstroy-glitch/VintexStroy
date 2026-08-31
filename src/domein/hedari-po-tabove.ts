/**
 * ХЕДЪРИТЕ, ПОДРЕДЕНИ ПО ТАБОВЕТЕ НА МЕНЮТО · И103.
 *
 * Негови думи, 27.08 *(`docs/izvori/01-chist-dopiska.md:862`)*:
 *
 *   „…от там се дават и хедърите на всички таблици с имена и подредени
 *    КАКТО СА ПО ТАБОВЕТЕ В МЕНЮТО и отделени при скрол."
 *
 * Дотук матрицата „Кой какво вижда" изсипваше моделите в реда, в който дойдат —
 * плосък списък без групи. При два хедъра това е все едно; при дванайсет човек
 * не намира онзи, който търси, а правата се раздават точно по таблици.
 *
 * ЗАЩО РЕДЪТ Е НА МЕНЮТО, А НЕ АЗБУЧЕН. Той каза „както са по табовете в
 * менюто", и това не е стилистика: човек помни къде е таблицата, не как се
 * пише. Редът идва отвън (`podredeniPunktove` · ADR-066) — тук не се преписва
 * втори списък с екрани (правило 17).
 *
 * ЗАЩО ГРУПА „ОЩЕ НЕ Е СЛОЖЕН НА ТАБ". Вносният хедър идва от файл и не знае
 * нищо за менюто; питаме го при самия хедър (`dayEkran`), но докато никой не е
 * отговорил, той съществува. Скрит, той щеше да изчезне от матрицата — и
 * правата върху него щяха да се раздават никога. Затова стои НАКРАЯ, преброен и
 * назован (правило 15: изключено ≠ липсващо).
 *
 * ЗАЩО ПРАЗНАТА ГРУПА НЕ СЕ РИСУВА. Същото решение като петте заглавия в
 * Настройки: заглавие без нито един ред под себе си е обещание, което екранът
 * не спазва.
 */

/** Една таблица с хедър — вградена в програмата или вносна (модел). */
export interface TablitsaSHedar {
  /** УНИКАЛНИЯТ ѝ ключ · същият, с който се записва правото */
  readonly klyuch: string;
  /** името, което човек чете */
  readonly ime: string;
  /** ключът на екрана ѝ · празно значи „още не е сложен на таб" */
  readonly ekran: string;
  /** заглавията на колоните ѝ, дословно */
  readonly glavi: readonly string[];
  /** номерата на СМЕТНАТИТЕ колони — те не се редактират от никого */
  readonly zatvoreni: readonly number[];
}

/** Един пункт от менюто · толкова, колкото групирането има нужда да знае. */
export interface PunktNaMenyuto {
  readonly klyuch: string;
  readonly ime: string;
}

export interface GrupaHedari {
  /** ключът на екрана · празно за последната група */
  readonly ekran: string;
  readonly ime: string;
  readonly tablitsi: readonly TablitsaSHedar[];
}

/** Името на последната група · един дом, за да не се преписва на екрана. */
export const IME_BEZ_TAB = 'още не е сложен на таб';

/**
 * ГРУПИРА хедърите по табовете на менюто, В РЕДА НА МЕНЮТО.
 *
 * Вътре в групата редът на подаването се пази — вградените таблици идват първи,
 * защото те са дошли първи в регистъра. Азбучно подреждане би разместило
 * „Имоти" и „Наеми" всеки път, когато някой преименува хедър.
 *
 * Таблица, чийто екран не е между ЖИВИТЕ пунктове (махнат, недостъпен за този
 * човек), пада в последната група — не изчезва. Скритата таблица е скрито
 * право.
 */
export function grupiraniPoTabove(
  tablitsi: readonly TablitsaSHedar[],
  redNaMenyuto: readonly PunktNaMenyuto[],
): readonly GrupaHedari[] {
  const zhivi = new Set(redNaMenyuto.map((p) => p.klyuch));
  const poEkran = new Map<string, TablitsaSHedar[]>();

  for (const t of tablitsi) {
    const kade = zhivi.has(t.ekran) ? t.ekran : '';
    const veche = poEkran.get(kade);
    if (veche) veche.push(t);
    else poEkran.set(kade, [t]);
  }

  const grupi: GrupaHedari[] = [];
  for (const punkt of redNaMenyuto) {
    const negovi = poEkran.get(punkt.klyuch);
    if (!negovi || negovi.length === 0) continue;
    grupi.push(Object.freeze({ ekran: punkt.klyuch, ime: punkt.ime, tablitsi: Object.freeze(negovi) }));
  }

  const bez = poEkran.get('');
  if (bez && bez.length > 0) {
    grupi.push(Object.freeze({ ekran: '', ime: IME_BEZ_TAB, tablitsi: Object.freeze(bez) }));
  }

  return Object.freeze(grupi);
}

/** Колко таблици още чакат таб · броят се, не се усещат (правило 17). */
export function bezTab(
  tablitsi: readonly TablitsaSHedar[],
  redNaMenyuto: readonly PunktNaMenyuto[],
): number {
  const zhivi = new Set(redNaMenyuto.map((p) => p.klyuch));
  return tablitsi.filter((t) => !zhivi.has(t.ekran)).length;
}
