/**
 * ДАННИТЕ НА ДИАГРАМИТЕ · чисто смятане, без нито един ред SVG.
 *
 * И92 т.4: „Прави диаграмите — има ги в Сметки, до таблицата, която е копие
 * на тази от Управление… Има диаграма и в Отчети, пак в Сметки."
 *
 * Диаграмата в Отчетите е месечният ход на парите. Изворите ѝ са СЪЩИТЕ два
 * като на `sumiZaDen` (плащания → приход · разходи → разход): календарът,
 * решетката на Ганта и диаграмата трябва да казват едно и също число, иначе
 * онзи, който ги сравни, намира разлика там, където разлика няма.
 *
 * Двете суми НЕ се сливат в нето — ден (и месец) с 1 000 приход и 1 000
 * разход не е празен; неттото би го направило такъв.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';

export interface MesetsSPari {
  /** „2026-08" — както говорят периодите навсякъде */
  readonly mesets: string;
  readonly prihod_st: number;
  readonly razhod_st: number;
}

/**
 * Последните `broy` месеца, завършващи с месеца на `dnes`.
 *
 * ВСЕКИ месец присъства — месец без движение носи нули, защото дупка в оста
 * на времето прави съседните стълбове да изглеждат съседни месеци, а не са.
 * Нулата тук е вярна нула: обхватът е питан цял.
 */
export function mesechnitePari(o: Ogledalo, dnes: string, broy = 12): readonly MesetsSPari[] {
  const g = Number(dnes.slice(0, 4));
  const m = Number(dnes.slice(5, 7));

  const mesetsi: string[] = [];
  for (let i = broy - 1; i >= 0; i -= 1) {
    mesetsi.push(new Date(Date.UTC(g, m - 1 - i, 1)).toISOString().slice(0, 7));
  }

  const po = new Map(mesetsi.map((x) => [x, { prihod_st: 0, razhod_st: 0 }]));
  for (const p of o.plashtaniya.values()) {
    const v = po.get(p.data.slice(0, 7));
    if (v) v.prihod_st += p.suma_st;
  }
  for (const r of o.razhodi.values()) {
    const v = po.get(r.data.slice(0, 7));
    if (v) v.razhod_st += r.suma_st;
  }

  return mesetsi.map((x) => ({ mesets: x, ...po.get(x)! }));
}
