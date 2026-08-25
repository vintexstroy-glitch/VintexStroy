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

import { deliZakragleno, stotinki, type Stotinki } from '../yadro/pari.js';

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
 * Декларираната таблица на акумулаторите.
 *
 * ВАЖНО за `stavka` тук: тя е **ПОДСКАЗКА по подразбиране**, не закон.
 *
 * Негови думи: „ДДС е **избор при въвеждане на всяка фактура** и при четене на
 * таблици. Там фигурира в създадена колона от хедъра на таблицата."
 *
 * Затова истинската ставка идва от РЕДА — от фактурата или от колоната в
 * таблицата. Тази тук казва само какво да се предложи, когато редът мълчи.
 * Иначе клиент с нощувки на 9% няма как да въведе вярно, а секторът му е
 * „наем"; и обратно — необлагаема доставка в облагаем сектор би взела 20%
 * само защото съседът ѝ ги взема.
 */
export const AKUMULATORI: readonly Akumulator[] = Object.freeze([
  { klyuch: 'naem-zhilishten', darzhava: 'BG', sektor: 'наем · жилищен', stavka: 0 },
  { klyuch: 'naem-targovski', darzhava: 'BG', sektor: 'наем · търговски', stavka: 20 },
  { klyuch: 'uslugi-stroitelni', darzhava: 'BG', sektor: 'строителни услуги', stavka: 20 },
  { klyuch: 'pokupki-materiali', darzhava: 'BG', sektor: 'покупки · материали', stavka: 20 },
  { klyuch: 'pokupki-uslugi', darzhava: 'BG', sektor: 'покупки · услуги', stavka: 20 },
  // Заплатите и вноските по кредит не носят ДДС — стоят в свои акумулатори
  // със ставка нула, вместо да се крият в чужд.
  { klyuch: 'zaplati', darzhava: 'BG', sektor: 'заплати и осигуровки', stavka: 0 },
  { klyuch: 'krediti', darzhava: 'BG', sektor: 'кредити · главница и лихва', stavka: 0 },
]);

/** Старите събития нямат сектор — падат тук, вместо да пукат. */
export const SEKTOR_PO_PODRAZBIRANE = 'naem-zhilishten';

const PO_KLYUCH = new Map(AKUMULATORI.map((a) => [a.klyuch, a]));

/** Акумулаторът по ключ. Непознат ключ пада към подразбирането, не хвърля. */
export function akumulator(klyuch: string | undefined): Akumulator {
  return PO_KLYUCH.get(klyuch ?? '') ?? PO_KLYUCH.get(SEKTOR_PO_PODRAZBIRANE)!;
}

/**
 * СТАВКИТЕ, между които се избира на реда. Цял процент, не дроб.
 *
 * Изброени поименно, за да не се появи 21% от невнимание. Смени ли се закон —
 * един ред тук.
 */
export const STAVKI: readonly number[] = Object.freeze([0, 9, 20]);

export function pozvolenaStavka(s: number): boolean {
  return STAVKI.includes(s);
}

/**
 * Ставката за един ред: неговата, ако я е казал; иначе подсказката на сектора.
 *
 * Тук е поправката към старото поведение. Дотук ставката ИДВАШЕ от сектора и
 * нямаше как да се смени; сега секторът само предлага.
 */
export function stavkaNaReda(sektor: string | undefined, ot_reda?: number): number {
  if (ot_reda === undefined) return akumulator(sektor).stavka;
  if (!pozvolenaStavka(ot_reda)) {
    throw new GreshkaDDS(
      `Ставка ${ot_reda}% не съществува. Позволените са: ${STAVKI.join('%, ')}%.`,
    );
  }
  return ot_reda;
}

/** Секторите, между които се избира във формите. */
export function sektoriNaNaem(): readonly Akumulator[] {
  return AKUMULATORI.filter((a) => a.klyuch.startsWith('naem-'));
}

/** Секторите за разход — оттам идва ВХОДЯЩИЯТ ДДС. */
export function sektoriNaRazhod(): readonly Akumulator[] {
  return AKUMULATORI.filter((a) => !a.klyuch.startsWith('naem-'));
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

