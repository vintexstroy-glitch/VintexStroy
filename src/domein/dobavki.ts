/**
 * ДОБАВКИТЕ · Стопанинът добавя КОЛОНА към ВГРАДЕНА таблица (резен 79 ·
 * И121 т.2 · И124 т.3).
 *
 * Негова дума (31.08): „Ще може да добавим и други включим и други продукти
 * за всеки бизнес различен и затова трябва да има таб където да редактираш
 * имената на колоните по свой избор и да избираш от цялата възможна
 * функционалност на приложението."
 *
 * ═══ НАСЛАГВАЕМ МОДЕЛ, не преписан ═══
 *
 * Вградената таблица се ражда в кода: колоните на Имоти живеят в
 * `koloniNaImotite` и НЕ се преписват тук (правило 17 — един факт, един дом).
 * Онова, което Стопанинът ДОБАВЯ, застава в модел с ключа на вградената
 * (`vgraden:imoti`) в `o.modeli`: неговите `glavi` са САМО добавките.
 * Редакторът на хедъри, формулите, менютата и колонното право работят върху
 * него, без да знаят чий е — те и не бива да знаят.
 *
 * ═══ КЛЕТКАТА Е СЪБИТИЕ, не поле ═══
 *
 * Добавената колона иска и СТОЙНОСТИ. Имотът обаче не може да ги носи:
 * неговият товар е замразен в Журнала, а добавките се раждат СЛЕД записите
 * му. Затова клетката е своя същност — `КлеткаНаДобавкаЗаписана` върху адрес
 * „таблица · ред · колона", и последната дума бие (както делото и кредитът).
 *
 * ═══ ПИЛОТЪТ Е ИМОТИ, поименно ═══
 *
 * `VGRADENI_S_DOBAVKI` изброява КОИ вградени приемат добавки — днес една.
 * Останалите седем влизат по същия път, като списъкът порасне (ADR-137 казва
 * реда); непоименна „всяка вградена" щеше да обещае клетки на екрани, които
 * още не ги рисуват — надпис, не функция (правило 15 по дух).
 */

import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { PayloadKletkaNaDobavkaZapisana } from './sabitiya.js';
import { vidNaKolona } from './kolonno.js';

class GreshkaDobavka extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaDobavka';
  }
}

/** Ключът на пилота · вградената таблица „Имоти" (`app/tablitsite.ts`). */
export const VGRADEN_IMOTI = 'vgraden:imoti';

/** Вградените, които приемат добавки · ДНЕС една, поименно (ADR-137). */
export const VGRADENI_S_DOBAVKI: readonly string[] = Object.freeze([VGRADEN_IMOTI]);

/** Вграден ли е ключът · вградените носят представка (`app/tablitsite.ts`). */
export function eVgradenKlyuch(klyuch: string): boolean {
  return klyuch.startsWith('vgraden:');
}

/**
 * ПРАЗНИЯТ МОДЕЛ на вградена · раждането на ПЪРВАТА добавка тръгва от него.
 *
 * НЕ се записва празен: записва го чак `dobaviKolona` — модел без нито една
 * добавка е състоянието „нищо не е добавено", тоест ЛИПСАТА на запис.
 * `redNaGlavata` е 0 и `koloni` са празни нарочно: този модел не чете файлове
 * (`poznavaLi` отказва празна глава), той само носи добавките.
 */
export function prazenModelZaVgradena(klyuch: string): ModelNaTablitsa {
  if (!VGRADENI_S_DOBAVKI.includes(klyuch)) {
    throw new GreshkaDobavka(
      `„${klyuch}" не е вградена таблица с добавки — списъкът е поименен (ADR-137).`,
    );
  }
  return Object.freeze({
    klyuch,
    redNaGlavata: 0,
    koloni: Object.freeze({}),
    izklyucheni: Object.freeze([]),
    zatvoreni: Object.freeze([]),
    glavi: Object.freeze([]),
    otpechatak: '',
    menyuta: Object.freeze({}),
    otVavezhdane: Object.freeze([]),
    zaklyucheni: Object.freeze([]),
    predishni: Object.freeze([]),
    vidove: Object.freeze({}),
    formuli: Object.freeze({}),
    nomera: Object.freeze({}),
  });
}

/**
 * АДРЕСЪТ НА ЕДНА КЛЕТКА · „таблица · ред · колона", слепени с „·".
 *
 * Точката на средата не се среща нито в ключ на вградена, нито в id на ред —
 * затова адресът се разцепва еднозначно (`data-redakt` ползва същия знак).
 */
export function klyuchNaKletka(tablitsa: string, redId: string, kolona: number): string {
  return `${tablitsa}·${redId}·${kolona}`;
}

/**
 * ПРОВЕРКИТЕ НА ЗАПИСА · всяка отказва С ДУМИ, преди Вратата да е видяла нищо.
 *
 * Видът ↔ полето е правило 3 в действие: колона в евро носи САМО `stoynost_st`
 * (цели центове — Вратата ги брои), всяка друга — САМО `stoynost`. Разменени,
 * „1 150,00 €" щеше да легне като текст и тихо да изпадне от всеки сбор.
 */
export function proveriKletkaNaDobavka(
  m: ModelNaTablitsa | undefined,
  danni: PayloadKletkaNaDobavkaZapisana,
): void {
  if (!VGRADENI_S_DOBAVKI.includes(danni.tablitsa)) {
    throw new GreshkaDobavka(
      `„${danni.tablitsa}" не е вградена таблица с добавки — клетки се пишат само по поименния списък.`,
    );
  }
  if (!m || m.glavi[danni.kolona] === undefined) {
    throw new GreshkaDobavka(
      `Колона ${danni.kolona} я няма сред добавките на „${danni.tablitsa}" — първо се ражда от Настройки.`,
    );
  }
  if (vidNaKolona(m, danni.kolona) === 'zatvorena') {
    throw new GreshkaDobavka(
      `Колона „${m.glavi[danni.kolona]}" е затворена — в нея не пише никой, колкото и висока да е ролята (правило 23).`,
    );
  }
  const evro = (m.vidove[danni.kolona] ?? 'tekst') === 'evro';
  if (evro && (danni.stoynost_st === undefined || danni.stoynost !== undefined)) {
    throw new GreshkaDobavka(
      `Колона „${m.glavi[danni.kolona]}" е в евро — клетката ѝ носи само цели центове (stoynost_st).`,
    );
  }
  if (!evro && (danni.stoynost === undefined || danni.stoynost_st !== undefined)) {
    throw new GreshkaDobavka(
      `Колона „${m.glavi[danni.kolona]}" не е пари — клетката ѝ носи текст (stoynost), не центове.`,
    );
  }
}
