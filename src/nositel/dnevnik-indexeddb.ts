/**
 * ЖУРНАЛЪТ върху IndexedDB — носител „В · местно-първо" (ADR-001).
 *
 * Същият порт `Dnevnik`, същият договор. Разликата е само къде лежат байтовете:
 * тук — в браузъра на собственика, без сървър и без мрежа.
 *
 * Пази същите откази като реализацията в паметта:
 *   · seq извън реда → отказ (Журналът е само за добавяне)
 *   · повторен opId → отказ (уникален индекс, не проверка в кода)
 */

import type { Dnevnik } from '../yadro/dnevnik.js';
import { GreshkaDnevnik } from '../yadro/dnevnik.js';
import type { Sabitie, Sashtnost } from '../yadro/sabitie.js';

const HRANILISHTE = 'sabitiya';
const INDEKS_OPID = 'po-opId';
const INDEKS_SASHTNOST = 'po-sashtnost';

/** Отваря (и при нужда създава) базата. */
export function otvoriDnevnik(ime = 'masterbook'): Promise<DnevnikVIndexedDB> {
  return new Promise((resolve, reject) => {
    const zayavka = indexedDB.open(ime, 1);

    zayavka.onupgradeneeded = () => {
      const db = zayavka.result;
      if (!db.objectStoreNames.contains(HRANILISHTE)) {
        const hranilishte = db.createObjectStore(HRANILISHTE, {
          keyPath: ['naematel', 'seq'],
        });
        hranilishte.createIndex(INDEKS_OPID, ['naematel', 'opId'], { unique: true });
        hranilishte.createIndex(INDEKS_SASHTNOST, [
          'naematel',
          'sashtnost.vid',
          'sashtnost.id',
        ]);
      }
    };

    zayavka.onsuccess = () => {
      const db = zayavka.result;
      // Друг раздел иска нова версия на базата — тази връзка се пуска чисто,
      // вместо да я държи заключена завинаги.
      db.onversionchange = () => db.close();
      resolve(new DnevnikVIndexedDB(db));
    };
    zayavka.onerror = () => reject(zayavka.error);
  });
}

export class DnevnikVIndexedDB implements Dnevnik {
  readonly #db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.#db = db;
  }

  zatvori(): void {
    this.#db.close();
  }

  /** Затворена ли е връзката — Вратата пита, за да откаже с думи, не с гниене. */
  get zatvorena(): boolean {
    try {
      this.#db.transaction(HRANILISHTE, 'readonly');
      return false;
    } catch {
      return true;
    }
  }

  async posledno(naematel: string): Promise<Sabitie | undefined> {
    const hranilishte = this.#chete();
    const kursor = await naiPurviyat(hranilishte.openCursor(obhvat(naematel), 'prev'));
    return kursor?.value as Sabitie | undefined;
  }

  /** ПЪРВОТО · същият обхват, но напред. Оттам се чете Стопанинът (ADR-043). */
  async parvo(naematel: string): Promise<Sabitie | undefined> {
    const hranilishte = this.#chete();
    const kursor = await naiPurviyat(hranilishte.openCursor(obhvat(naematel), 'next'));
    return kursor?.value as Sabitie | undefined;
  }

  async poOpId(naematel: string, opId: string): Promise<Sabitie | undefined> {
    const indeks = this.#chete().index(INDEKS_OPID);
    return (await obeshtay(indeks.get([naematel, opId]))) as Sabitie | undefined;
  }

  async tekushtRev(naematel: string, sashtnost: Sashtnost): Promise<number> {
    const indeks = this.#chete().index(INDEKS_SASHTNOST);
    const klyuch = [naematel, sashtnost.vid, sashtnost.id];
    const kursor = await naiPurviyat(
      indeks.openCursor(IDBKeyRange.only(klyuch), 'prev'),
    );
    return kursor ? (kursor.value as Sabitie).seq : 0;
  }

  async dobavi(s: Sabitie): Promise<void> {
    // durability: 'strict' — записът се брои за станал, когато е НА ДИСКА.
    // По подразбиране браузърът може да отговори „да" преди изхвърлянето на
    // буфера — и токът да отнесе последното звено, а котвата да го помни.
    const transaktsiya = this.#db.transaction(HRANILISHTE, 'readwrite', {
      durability: 'strict',
    });
    const hranilishte = transaktsiya.objectStore(HRANILISHTE);

    // Проверката и записът са в ЕДНА транзакция — тя е единичният писач.
    const posledno = await naiPurviyat(
      hranilishte.openCursor(obhvat(s.naematel), 'prev'),
    );
    const ochakvanSeq = ((posledno?.value as Sabitie | undefined)?.seq ?? 0) + 1;
    if (s.seq !== ochakvanSeq) {
      transaktsiya.abort();
      throw new GreshkaDnevnik(
        `Журналът е само за добавяне: очакван seq ${ochakvanSeq}, получен ${s.seq}`,
      );
    }

    try {
      await obeshtay(hranilishte.add(s));
    } catch (greshka) {
      if (greshka instanceof DOMException && greshka.name === 'ConstraintError') {
        throw new GreshkaDnevnik(`opId вече съществува: ${s.opId}`);
      }
      throw greshka;
    }

    await zavursheno(transaktsiya);
  }

  async chetiVsichki(naematel: string): Promise<Sabitie[]> {
    return (await obeshtay(this.#chete().getAll(obhvat(naematel)))) as Sabitie[];
  }

  async chetiZaSashtnost(naematel: string, sashtnost: Sashtnost): Promise<Sabitie[]> {
    const indeks = this.#chete().index(INDEKS_SASHTNOST);
    const klyuch = [naematel, sashtnost.vid, sashtnost.id];
    const redove = (await obeshtay(indeks.getAll(IDBKeyRange.only(klyuch)))) as Sabitie[];
    return redove.sort((a, b) => a.seq - b.seq);
  }

  /**
   * КОИ ВЕРИГИ ИМА · прескачащ обход, не четене на всичко.
   *
   * Наивното „прочети всички събития и събери имената" би вдигнало целия Журнал
   * в паметта, за да върне шепа низа — при 10 000 събития това е секунди на
   * телефон. Затова курсорът стъпва на първото събитие на всяка верига и
   * ПРЕСКАЧА до следващата с `continue([име, []])`: `[име, []]` е по-голямо от
   * всяко `[име, число]`, тъй че скокът минава цялата верига наведнъж. Броят на
   * стъпките е броят на ВЕРИГИТЕ, не на събитията.
   */
  async verigi(prefiks: string): Promise<string[]> {
    const naideni: string[] = [];
    const zayavka = this.#chete().openKeyCursor(obhvatNaPrefiks(prefiks));
    await new Promise<void>((resolve, reject) => {
      zayavka.onerror = () => reject(zayavka.error);
      zayavka.onsuccess = () => {
        const kursor = zayavka.result;
        if (!kursor) {
          resolve();
          return;
        }
        const ime = (kursor.key as [string, number])[0];
        naideni.push(ime);
        kursor.continue([ime, []]);
      };
    });
    return naideni.sort();
  }

  #chete(): IDBObjectStore {
    return this.#db.transaction(HRANILISHTE, 'readonly').objectStore(HRANILISHTE);
  }
}

/**
 * Всички вериги, чието име започва с префикса.
 *
 * Горната граница е `префикс + '\uffff'`: всеки низ, започващ с префикса, е
 * по-малък от него, защото по-нататъшните знаци са от базовата равнина или са
 * сурогати (`\ud800`–`\udfff`), а те са ПОД `\uffff`. Тоест границата държи и
 * за емоджи в името, без да се разчита на „никой няма да сложи такова".
 */
function obhvatNaPrefiks(prefiks: string): IDBKeyRange {
  return IDBKeyRange.bound([prefiks], [`${prefiks}\uffff`, []]);
}

/**
 * Всички събития на един наемател.
 * `[naematel]` е по-малко от `[naematel, 0]` (по-късият масив е по-малък),
 * а `[naematel, []]` е по-голямо от всяко число (числата се нареждат преди масиви).
 */
function obhvat(naematel: string): IDBKeyRange {
  return IDBKeyRange.bound([naematel], [naematel, []]);
}

function obeshtay<T>(zayavka: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    zayavka.onsuccess = () => resolve(zayavka.result);
    zayavka.onerror = () => reject(zayavka.error);
  });
}

function naiPurviyat(
  zayavka: IDBRequest<IDBCursorWithValue | null>,
): Promise<IDBCursorWithValue | null> {
  return obeshtay(zayavka);
}

function zavursheno(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new GreshkaDnevnik('Транзакцията беше прекъсната'));
  });
}
