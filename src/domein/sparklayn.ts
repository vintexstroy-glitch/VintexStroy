/**
 * СПАРКЛАЙНЪТ · посоката на едно число, в един ред (резен 35).
 *
 * „**Петте + спарклайни + bullet (препоръката)**" *(р59·[94])*.
 *
 * ═══ КАКВО Е И КАКВО НЕ Е ═══
 *
 * Спарклайнът е ФОРМАТА на редицата, не нейните числа. Той няма ос, няма
 * етикети и няма скала на екрана — точно затова стои ВЪТРЕ в реда, до самото
 * число, а не заема секция.
 *
 * И точно затова числата пак се пишат до него: линия без число казва „расте",
 * но не казва „колко". Диаграма, която замества число, е украса.
 *
 * ═══ ГЕОМЕТРИЯТА Е ТУК, НЕ В ЕКРАНА ═══
 *
 * Екранът рисува `<polyline>`; кои са точките е СМЕТКА и се проверява с тест.
 * Дотук всяка такава сметка живееше вътре в шаблонен низ и никой тест не я
 * виждаше (обход 7 · „без тест" за `app/`).
 *
 * ═══ ПРАЗНОТО НЕ Е НУЛА ═══
 *
 * Стъпка без стойност (`undefined`) НЕ се рисува като нула — това би начертало
 * пропадане до дъното там, където просто няма данни. Тя се ПРЕСКАЧА, а линията
 * се води през онова, което има.
 */

export interface TochkaNaSparklayn {
  readonly x: number;
  readonly y: number;
  /** коя стъпка е това · за `title`, когато редът се посочи */
  readonly nomer: number;
}

export interface Sparklayn {
  readonly tochki: readonly TochkaNaSparklayn[];
  /** ЕДНА линия „points" за `<polyline>` · празна, когато няма какво да се води */
  readonly patyat: string;
  /** колко стъпки СА имали стойност · брои се, не се твърди */
  readonly sChisla: number;
  /** посоката между първото и последното число · за думите до линията */
  readonly posoka: 'nagore' | 'nadolu' | 'ravno' | 'nyama';
}

/**
 * СМЯТА точките · нула стъпки и една стъпка са РАЗЛИЧНИ случаи.
 *
 * Нула значи „няма редица" — нищо не се рисува. ЕДНА значи „има число, но не и
 * посока": рисува се точка, не линия, защото линия от една точка е лъжа за
 * тенденция, каквато никой не е измерил.
 */
export function sparklayn(
  stoynosti: readonly (number | undefined)[],
  shirina: number,
  visochina: number,
): Sparklayn {
  const sChisla = stoynosti.filter((v) => v !== undefined).length;
  if (sChisla === 0 || stoynosti.length === 0) {
    return Object.freeze({ tochki: [], patyat: '', sChisla: 0, posoka: 'nyama' as const });
  }

  const chisla = stoynosti.filter((v): v is number => v !== undefined);
  const gore = Math.max(...chisla);
  const dolu = Math.min(...chisla);
  // РАЗМАХ НУЛА · всички числа са равни. Тогава линията стои по СРЕДАТА, а не
  // на дъното: залепена долу, тя щеше да изглежда като „падна на нула".
  const razmah = gore - dolu;
  const naSredata = visochina / 2;
  // ЕДНА стъпка не се дели на нула · точката застава в средата по ширина.
  const stapka = stoynosti.length > 1 ? shirina / (stoynosti.length - 1) : 0;

  const tochki: TochkaNaSparklayn[] = [];
  stoynosti.forEach((v, i) => {
    if (v === undefined) return;
    tochki.push(
      Object.freeze({
        x: stoynosti.length > 1 ? i * stapka : shirina / 2,
        y: razmah === 0 ? naSredata : visochina - ((v - dolu) / razmah) * visochina,
        nomer: i,
      }),
    );
  });

  const parvo = chisla[0]!;
  const posledno = chisla[chisla.length - 1]!;
  return Object.freeze({
    tochki: Object.freeze(tochki),
    patyat: tochki.map((t) => `${okragli(t.x)},${okragli(t.y)}`).join(' '),
    sChisla,
    posoka:
      chisla.length < 2 ? 'nyama' : posledno > parvo ? 'nagore' : posledno < parvo ? 'nadolu' : 'ravno',
  });
}

/**
 * ДВА ЗНАКА след запетаята · координатите не са пари.
 *
 * Кръгленето тук е за ДЪЛЖИНАТА на низа, не за смисъла: `12.000000000000002`
 * в `points` работи, но прави разликите между два построя нечетими.
 */
function okragli(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Думата за посоката · до линията, защото стрелка сама не се чете. */
export function dumataNaPosokata(s: Sparklayn): string {
  switch (s.posoka) {
    case 'nagore':
      return 'нагоре';
    case 'nadolu':
      return 'надолу';
    case 'ravno':
      return 'без промяна';
    case 'nyama':
      return s.sChisla === 1 ? 'една стъпка · няма посока' : 'няма данни';
  }
}
