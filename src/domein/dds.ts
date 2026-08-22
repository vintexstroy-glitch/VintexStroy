/**
 * ДДС · изважда се от ОБЩАТА цена, не се прибавя към нея.
 *
 * Думата на собственика: „Всички цени се смятат с ддс… Не се разделя, а обща
 * цена." Затова вземането си остава едно число — сумата С ДДС — и никъде в
 * Журнала не се пише разделена. ДДС-то е ИЗВЕДЕНО: смята се при поискване от
 * общата цена и ставката на сектора.
 *
 * Отделни акумулатори по държава/сектор, не един общ
 * (`docs/01-arhitekturen-dokument.md` §5, `references/tables/finansi.md`).
 *
 * Всичко е цели стотинки и целочислена аритметика. Никакъв float —
 * там се губи стотинката.
 */

import { stotinki, type Stotinki } from '../yadro/pari.js';

export class GreshkaDDS extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaDDS';
  }
}

/** Един акумулатор: държава · сектор · ставка. */
export interface Akumulator {
  readonly klyuch: string;
  readonly darzhava: string;
  readonly sektor: string;
  /** цял процент: 0, 9, 20 — не десетична дроб */
  readonly stavka: number;
}

/**
 * Декларираната таблица на акумулаторите. Смени ли се ставка — един ред тук,
 * не търсене из кода.
 */
export const AKUMULATORI: readonly Akumulator[] = Object.freeze([
  { klyuch: 'naem-zhilishten', darzhava: 'BG', sektor: 'наем · жилищен', stavka: 0 },
  { klyuch: 'naem-targovski', darzhava: 'BG', sektor: 'наем · търговски', stavka: 20 },
  { klyuch: 'uslugi-stroitelni', darzhava: 'BG', sektor: 'строителни услуги', stavka: 20 },
  { klyuch: 'pokupki-materiali', darzhava: 'BG', sektor: 'покупки · материали', stavka: 20 },
  { klyuch: 'pokupki-uslugi', darzhava: 'BG', sektor: 'покупки · услуги', stavka: 20 },
]);

/** Старите събития нямат сектор — падат тук, вместо да пукат. */
export const SEKTOR_PO_PODRAZBIRANE = 'naem-zhilishten';

const PO_KLYUCH = new Map(AKUMULATORI.map((a) => [a.klyuch, a]));

/** Акумулаторът по ключ. Непознат ключ пада към подразбирането, не хвърля. */
export function akumulator(klyuch: string | undefined): Akumulator {
  return PO_KLYUCH.get(klyuch ?? '') ?? PO_KLYUCH.get(SEKTOR_PO_PODRAZBIRANE)!;
}

/** Секторите, между които се избира във формите. */
export function sektoriNaNaem(): readonly Akumulator[] {
  return AKUMULATORI.filter((a) => a.klyuch.startsWith('naem-'));
}

export interface RazbivkaDDS {
  readonly obshta_st: Stotinki;
  readonly osnova_st: Stotinki;
  readonly dds_st: Stotinki;
  readonly stavka: number;
}

/**
 * Изважда ДДС-то от обща цена.
 *
 *   ДДС = обща × ставка / (100 + ставка)     — целочислено, половинка нагоре
 *   основа = обща − ДДС
 *
 * Основата се вади, а не се смята отделно — така основа + ДДС дава ТОЧНО
 * общата при всяка сума и всяка ставка. Същият похват като `razpredeli`:
 * остатъкът се дава на някого, не се изпуска.
 */
export function ddsOtObshta(obshta_st: number, stavka: number): RazbivkaDDS {
  if (!Number.isSafeInteger(obshta_st)) {
    throw new GreshkaDDS(`Сумата е цели стотинки; получено: ${obshta_st}`);
  }
  if (!Number.isSafeInteger(stavka) || stavka < 0) {
    throw new GreshkaDDS(`Ставката е цял процент, не по-малък от нула; получено: ${stavka}`);
  }

  const znak = obshta_st < 0 ? -1 : 1;
  const abs = Math.abs(obshta_st);
  const dds = znak * deliZakragleno(abs * stavka, 100 + stavka);

  return {
    obshta_st: stotinki(obshta_st),
    dds_st: stotinki(dds),
    osnova_st: stotinki(obshta_st - dds),
    stavka,
  };
}

/** Целочислено делене със закръгляне на половинката нагоре. И двете положителни. */
function deliZakragleno(chislitel: number, znamenatel: number): number {
  const chastno = Math.floor(chislitel / znamenatel);
  const ostatak = chislitel - chastno * znamenatel;
  return 2 * ostatak >= znamenatel ? chastno + 1 : chastno;
}
