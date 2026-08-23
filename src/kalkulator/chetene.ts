/**
 * ЧЕТЕНЕТО · Калкулаторът взима каквото му трябва, не цялата таблица.
 *
 * Негови думи (23.08), които определят целия файл:
 *
 *   „Вкарал съм и папка за Калкулатора и да чете информацията, която му е
 *    нужна… **Не е необходимо да се пресъздава самата таблица, а само да се
 *    вземат апартаментите с площи, изложение и етаж.**"
 *
 * Затова тук НЯМА модел на таблица и няма отпечатък на хедър. Има четец, който
 * търси пет колони по имената им и си тръгва. Останалите двадесет колони на
 * площообразуването — идеални части, коти, контролни сборове — не влизат.
 *
 * ЗАЩО НЕ ЧРЕЗ `ModelNaTablitsa`. Моделът пита човека коя колона каква РОЛЯ
 * носи и помни отговора — той е за източници, които се четат ПОСТОЯННО (банкови
 * извлечения). Площообразуването се чете, когато сграда се ражда, и главата му
 * е на два реда с обединени клетки. Питане за нея би било въпрос без втори път.
 *
 * КОИ ЛИСТОВЕ СЕ ЧЕТАТ. Само „площо" и „земя". Файлът носи още три —
 * „Sheet3" и „разбивка" са от ДРУГ обект (коти -2,6 и +17,1 срещу нашите -2,88
 * и +14,25, сбор 4 279 м² срещу 2 050 м²) и са пълни с `#REF!`; „Sheet1" е
 * обобщение по етажи, не по обекти. Четенето им би добавило чужди квадрати
 * към стойността на състоянието.
 *
 * ЗА ПЛОЩИТЕ, негова дума: „**използва се чиста площ и обща площ, разликата
 * между двете е общи части**." Затова се взимат ДВЕТЕ, а общите части се
 * СМЯТАТ — едно число по-малко за разминаване.
 */

import type { Tablitsa } from '../iztochnik/tablitsa.js';
import { kletka } from '../iztochnik/tablitsa.js';

export class GreshkaChetene extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaChetene';
  }
}

/** Видът обект — по него матрицата дава базова цена. */
export type VidObekt = 'apartament' | 'garazh' | 'parkomyasto' | 'sklad' | 'drug';

export const IMENA_NA_VIDOVETE_OBEKT: Readonly<Record<VidObekt, string>> = Object.freeze({
  apartament: 'апартамент',
  garazh: 'гараж',
  parkomyasto: 'паркомясто',
  sklad: 'склад',
  drug: 'друго',
});

/** Един прочетен обект. Площите са в цели КВАДРАТНИ САНТИМЕТРИ — без float. */
export interface ProchetenObekt {
  /** името, дословно: „Апартамент 1" · „Двоен гараж 7 и 8 и склад" */
  readonly obekt: string;
  readonly vid: VidObekt;
  /** етажът словом, както е в таблицата: „първи" · „подземен" */
  readonly etazh: string;
  /** котата, дословно: „кота ±0,00" — стои до етажа, не вместо него */
  readonly kota: string;
  /** застроена площ F1 · чистата */
  readonly chista_kvsm: number;
  /** Общо F1+F2 · с идеалните части */
  readonly obshta_kvsm: number;
  /** прилежащ двор, ако има — 0 иначе */
  readonly dvor_kvsm: number;
}

/**
 * Общите части се СМЯТАТ, не се четат — негова дума.
 * Отрицателна разлика значи объркани колони и се отказва гласно.
 */
export function obshtiChasti_kvsm(o: ProchetenObekt): number {
  const razlika = o.obshta_kvsm - o.chista_kvsm;
  if (razlika < 0) {
    throw new GreshkaChetene(
      `„${o.obekt}": общата площ е по-малка от чистата — колоните са разменени.`,
    );
  }
  return razlika;
}

/** Видът се познава по името — то е единственото, което таблицата казва. */
export function vidPoIme(obekt: string): VidObekt {
  const i = obekt.trim().toLowerCase();
  if (i.startsWith('апартамент') || i.startsWith('ателие') || i.startsWith('ап.')) {
    return 'apartament';
  }
  // Редът е нарочен: „Гараж 3 и склад" е ГАРАЖ, не склад — първата дума води.
  if (i.includes('гараж')) return 'garazh';
  if (i.includes('паркомяст') || i.includes('паркоместа') || i.startsWith('пм')) {
    return 'parkomyasto';
  }
  if (i.includes('склад')) return 'sklad';
  return 'drug';
}

/** Числото от клетка на площообразуването: „45,22" или „45.22" → 452 200 кв.см. */
export function ploshtVKvSm(surovo: string): number {
  const t = surovo.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return 0;
  if (!/^-?\d+(\.\d+)?$/.test(t)) {
    throw new GreshkaChetene(`„${surovo}" не е площ.`);
  }
  // два знака след запетаята в м² → цели квадратни сантиметри (× 10 000)
  const [tsyalo = '0', drobno = ''] = t.split('.');
  const stotni = (drobno + '00').slice(0, 2);
  const znak = tsyalo.startsWith('-') ? -1 : 1;
  return znak * (Math.abs(Number(tsyalo)) * 10_000 + Number(stotni) * 100);
}

/** Обратното — за екрана и за износа: 452 200 → „45,22". */
export function kvSmVM2(kvsm: number): string {
  const znak = kvsm < 0 ? '-' : '';
  const a = Math.abs(kvsm);
  return `${znak}${Math.floor(a / 10_000)},${String(Math.round((a % 10_000) / 100)).padStart(2, '0')}`;
}

/** Заглавията, които се търсят — дословно от неговия файл, сведени. */
const TARSENI = Object.freeze({
  etazh: 'етаж',
  obekt: 'обект',
  chista: 'застроена площ, f1',
  obshta: 'общо f1+f2',
  dvor: 'прилежащ (придаден) двор',
  kota: 'кота',
});

function svedeno(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Намира реда на главата и номерата на петте колони. */
function nameriGlavata(t: Tablitsa): { red: number; koloni: Record<string, number> } {
  for (let red = 0; red < Math.min(t.redove.length, 12); red += 1) {
    const glava = (t.redove[red] ?? []).map(svedeno);
    const koloni: Record<string, number> = {};
    for (const [klyuch, duma] of Object.entries(TARSENI)) {
      const i = glava.findIndex((g) => g === duma);
      if (i >= 0) koloni[klyuch] = i;
    }
    // Главата е онзи ред, който носи И обекта, И двете площи.
    if (koloni['obekt'] !== undefined && koloni['chista'] !== undefined && koloni['obshta'] !== undefined) {
      return { red, koloni };
    }
  }
  throw new GreshkaChetene(
    'В този лист няма глава с „обект", „застроена площ, F1" и „Общо F1+F2".',
  );
}

/**
 * ЧЕТЕ ЕДИН ЛИСТ на площообразуването.
 *
 * Пропуска редове без име на обект и редовете с контролни сборове (те нямат
 * име, само числа). Не хвърля при един лош ред — връща каквото е прочел, а
 * пропуснатите се броят, за да влязат в сверката вход↔изход (правило 7).
 */
export function prochetiPloshti(t: Tablitsa): {
  readonly obekti: readonly ProchetenObekt[];
  readonly propusnati: number;
} {
  const { red, koloni } = nameriGlavata(t);
  const obekti: ProchetenObekt[] = [];
  let propusnati = 0;

  // Котата и етажът стоят в обединени клетки — държат се, докато не се сменят.
  let kota = '';
  let etazh = '';

  for (let r = red + 1; r < t.redove.length; r += 1) {
    const novaKota = koloni['kota'] === undefined ? '' : kletka(t, r, koloni['kota']).trim();
    const novEtazh = koloni['etazh'] === undefined ? '' : kletka(t, r, koloni['etazh']).trim();
    if (novaKota !== '') kota = novaKota;
    if (novEtazh !== '') etazh = novEtazh;

    const obekt = kletka(t, r, koloni['obekt']!).trim();
    if (obekt === '') continue; // празен ред или контролен сбор

    try {
      const chista_kvsm = ploshtVKvSm(kletka(t, r, koloni['chista']!));
      const obshta_kvsm = ploshtVKvSm(kletka(t, r, koloni['obshta']!));
      if (chista_kvsm === 0 && obshta_kvsm === 0) {
        propusnati += 1;
        continue;
      }
      obekti.push({
        obekt,
        vid: vidPoIme(obekt),
        etazh,
        kota,
        chista_kvsm,
        obshta_kvsm,
        dvor_kvsm: koloni['dvor'] === undefined ? 0 : ploshtVKvSm(kletka(t, r, koloni['dvor'])),
      });
    } catch {
      // ред, чиито числа не се четат — не спира партидата, но се брои
      propusnati += 1;
    }
  }

  return { obekti: Object.freeze(obekti), propusnati };
}

/** Кой лист да се чете — по име. Останалите носят друг обект или обобщения. */
export const LISTOVE_S_PLOSHTI: readonly string[] = Object.freeze(['площо', 'земя']);

export function eListSPloshti(ime: string): boolean {
  return LISTOVE_S_PLOSHTI.includes(svedeno(ime));
}
