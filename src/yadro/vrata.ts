/**
 * ВРАТАТА — ЕДИНСТВЕНИЯТ вход за запис.
 *
 * Договор (System design §3.2):
 *   1. провери ПРАВО
 *   2. провери ВАЛИДНОСТ
 *   3. дедупликация по opId  → идемпотентно
 *   4. rev-предпазител       → REPLAY при разминаване
 *   5. append (seq, prevHash, hash)
 *   6. върни { seq, hash }
 *
 * Единичен писач на наемател: стъпки 4–5 се сериализират, иначе се къса веригата.
 */

import type { Dnevnik } from './dnevnik.js';
import { GreshkaDnevnik } from './dnevnik.js';
import type { DrajkaNaKotva } from './kotva.js';
import { izchisliHash, proveriVerigata, type Sha256 } from './hash.js';
import { eStotinki } from './pari.js';
import type { Pravata } from './pravata.js';
import type { Operatsiya, Sabitie } from './sabitie.js';

export type KodGreshka = 'SPRYAN' | 'BEZ_PRAVO' | 'NEVALIDNO' | 'REPLAY' | 'NESAVMESTIM';

export class GreshkaVrata extends Error {
  readonly kod: KodGreshka;

  constructor(kod: KodGreshka, message: string) {
    super(message);
    this.name = 'GreshkaVrata';
    this.kod = kod;
  }
}

/** Отказ поради rev-предпазителя. Носи актуалния seq, за да няма фалшив STALE. */
export class GreshkaReplay extends GreshkaVrata {
  readonly tekushtRev: number;
  readonly ochakvanRev: number;

  constructor(tekushtRev: number, ochakvanRev: number) {
    super('REPLAY', `Същността е на rev ${tekushtRev}, а операцията очаква ${ochakvanRev}`);
    this.name = 'GreshkaReplay';
    this.tekushtRev = tekushtRev;
    this.ochakvanRev = ochakvanRev;
  }
}

export interface Rezultat {
  readonly seq: number;
  readonly hash: string;
  /** true, когато opId вече е бил приет — върнат е същият резултат, нов запис няма */
  readonly povtoreno: boolean;
}

export interface RezultatVazstanovyavane {
  /** колко събития са влезли сега */
  readonly vneseni: number;
  /** колко вече са били тук — общото начало на двете редици */
  readonly veche: number;
  readonly posledenHash: string;
}

export interface NastroykiVrata {
  readonly dnevnik: Dnevnik;
  readonly pravata: Pravata;
  readonly sha: Sha256;
  /**
   * Котвата: последното звено, записано извън Журнала. По избор —
   * ядрото върви и без нея, но приложението я подава винаги.
   */
  readonly kotva?: DrajkaNaKotva;
  /**
   * Ключалка МЕЖДУ раздели (Web Locks в браузъра). Опашката в паметта пази
   * реда само в един раздел; ключалката го пази между няколко. По избор —
   * без нея сблъсъкът се оправя с повторение (виж #zapishi).
   */
  readonly klyuchalka?: <T>(naematel: string, rabota: () => Promise<T>) => Promise<T>;
}

export class Vrata {
  readonly #dnevnik: Dnevnik;
  readonly #pravata: Pravata;
  readonly #sha: Sha256;
  readonly #kotva: DrajkaNaKotva | undefined;
  readonly #klyuchalka: (<T>(naematel: string, rabota: () => Promise<T>) => Promise<T>) | undefined;

  /** Спирателен кран (П1.4): спира записа, без да събаря приложението. */
  #zatvorena = false;
  #prichinaZaZatvaryane = '';

  /** Единичен писач на наемател — опашка от обещания. */
  readonly #opashki = new Map<string, Promise<unknown>>();

  constructor(n: NastroykiVrata) {
    this.#dnevnik = n.dnevnik;
    this.#pravata = n.pravata;
    this.#sha = n.sha;
    this.#kotva = n.kotva;
    this.#klyuchalka = n.klyuchalka;
  }

  get zatvorena(): boolean {
    return this.#zatvorena;
  }

  get prichinaZaZatvaryane(): string {
    return this.#prichinaZaZatvaryane;
  }

  /** Дръпва спирателния кран. Четенето продължава да работи. */
  zatvori(prichina: string): void {
    this.#zatvorena = true;
    this.#prichinaZaZatvaryane = prichina;
  }

  otvori(): void {
    this.#zatvorena = false;
    this.#prichinaZaZatvaryane = '';
  }

  /**
   * СПИРАТЕЛНИЯТ КРАН · проверява се на ВСЕКИ вход към записа.
   *
   * Двата входа — една операция и възстановяване на цял журнал — питаха
   * поотделно. Трети вход, писан утре, щеше да пропусне въпроса, без някой да
   * забележи: кранът е дръпнат при ИНЦИДЕНТ (правило 8), а точно тогава никой
   * не чете кода, за да види кой го пита и кой не.
   */
  #akoEDrapnatKranat(): void {
    if (this.#zatvorena) {
      throw new GreshkaVrata(
        'SPRYAN',
        `Вратата е спряна: ${this.#prichinaZaZatvaryane || 'без посочена причина'}`,
      );
    }
  }

  /**
   * ВЪЗСТАНОВЯВАНЕ от износ — втората врата в същата стена, не дупка до нея.
   *
   * Внасяните събития вече са минали веднъж през Вратата; хешовете им го
   * доказват. Затова тук те НЕ се преподписват — влизат такива, каквито са.
   * Но не влизат безусловно:
   *
   *   1. Кранът важи и тук: спряна Врата не възстановява.
   *   2. Веригата се проверява ЦЯЛА, преди да е записано каквото и да е.
   *   3. Журналът трябва да е празен ИЛИ внасяното да продължава точно него —
   *      събитие по събитие, същите хешове. Две различни истории не се сливат.
   *
   * Ако нещо не съвпадне, не влиза НИЩО. Поуката от 24,2%: сверката е преди
   * записа, не след него.
   */
  async vazstanovi(
    naematel: string,
    actor: string,
    sabitiya: readonly Sabitie[],
  ): Promise<RezultatVazstanovyavane> {
    this.#akoEDrapnatKranat();
    if (sabitiya.length === 0) {
      throw new GreshkaVrata('NEVALIDNO', 'Няма нито едно събитие за възстановяване.');
    }

    for (const [i, s] of sabitiya.entries()) {
      if (s.naematel !== naematel) {
        throw new GreshkaVrata(
          'NESAVMESTIM',
          `Събитие ${s.seq} е на наемател „${s.naematel}", а се възстановява при „${naematel}".`,
        );
      }
      if (s.seq !== i + 1) {
        throw new GreshkaVrata(
          'NESAVMESTIM',
          `Редицата прескача: на място ${i + 1} стои seq ${s.seq}.`,
        );
      }
      // Същите проверки като при ЗАПИС (находка на сверката): дотук пипнат
      // файл с половин стотинка или NFD-текст влизаше, стига хешовете му да са
      // преизчислени. Байтовете НЕ се нормализират — това би счупило веригата;
      // каквото не е NFC, се ОТКАЗВА с думи (правило 12), не се поправя тихо.
      try {
        proveriValidnost(s);
        proveriNFC(s.payload, `събитие ${s.seq}`);
      } catch (e) {
        throw new GreshkaVrata(
          'NEVALIDNO',
          `Възстановяването е отказано на seq ${s.seq}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (!(await this.#pravata.mozheDaPishe(actor, naematel, { vid: 'zhurnal', id: naematel }))) {
      throw new GreshkaVrata('BEZ_PRAVO', `${actor} няма право да пише при наемател ${naematel}`);
    }

    const proverka = await proveriVerigata(sabitiya, this.#sha);
    if (!proverka.tsyala) {
      throw new GreshkaVrata(
        'NESAVMESTIM',
        `Веригата във файла се къса на seq ${proverka.parvoSchupeno} (${proverka.prichina}). ` +
          'Нищо не е внесено.',
      );
    }

    return this.#naOpashka(naematel, async () => {
      const sega = await this.#dnevnik.chetiVsichki(naematel);
      if (sega.length > sabitiya.length) {
        throw new GreshkaVrata(
          'NESAVMESTIM',
          `Тук има ${sega.length} събития, а файлът носи ${sabitiya.length}. ` +
            'Внасяното е по-старо от това, което вече стои — нищо не е внесено.',
        );
      }
      for (const [i, star] of sega.entries()) {
        if (star.hash !== sabitiya[i]!.hash) {
          throw new GreshkaVrata(
            'NESAVMESTIM',
            `Двете истории се разделят на seq ${star.seq}. Различни журнали не се сливат — ` +
              'изнеси този, преди да внасяш друг.',
          );
        }
      }

      for (const s of sabitiya.slice(sega.length)) {
        await this.#dnevnik.dobavi(s);
      }

      // Върнатата история става новото помнено — котвата се премества на върха ѝ.
      const posledno = sabitiya[sabitiya.length - 1]!;
      this.#kotva?.zabij(naematel, {
        seq: posledno.seq,
        hash: posledno.hash,
        kogato: posledno.ts,
      });

      return {
        vneseni: sabitiya.length - sega.length,
        veche: sega.length,
        posledenHash: posledno.hash,
      };
    });
  }

  async dobavi(op: Operatsiya): Promise<Rezultat> {
    this.#akoEDrapnatKranat();

    // Уникод-двойникът: „й" се пише по два начина (NFC/NFD), изглеждат
    // еднакво, но са различни низове — различни хешове, различни ключове,
    // несработила идемпотентност. Затова ВСИЧКО се привежда към NFC тук,
    // преди валидност, хеш и запис.
    const chista = normalizirayNFC(op) as Operatsiya;
    proveriValidnost(chista);

    if (!(await this.#pravata.mozheDaPishe(chista.actor, chista.naematel, chista.sashtnost))) {
      throw new GreshkaVrata(
        'BEZ_PRAVO',
        `${chista.actor} няма право да пише при наемател ${chista.naematel}`,
      );
    }

    return this.#naOpashka(chista.naematel, () =>
      this.#podKlyuch(chista.naematel, () => this.#zapishi(chista)),
    );
  }

  /** Ключалката между раздели, когато я има; иначе направо. */
  async #podKlyuch<T>(naematel: string, rabota: () => Promise<T>): Promise<T> {
    return this.#klyuchalka ? this.#klyuchalka(naematel, rabota) : rabota();
  }

  /** Сериализира записите за един наемател — пази seq и веригата. */
  async #naOpashka<T>(naematel: string, rabota: () => Promise<T>): Promise<T> {
    const predisha = this.#opashki.get(naematel) ?? Promise.resolve();
    const sled = predisha.then(rabota, rabota);
    // Опашката не бива да пази отказите — иначе следващият запис пада с чужда грешка.
    this.#opashki.set(
      naematel,
      sled.then(
        () => undefined,
        () => undefined,
      ),
    );
    return sled;
  }

  async #zapishi(op: Operatsiya): Promise<Rezultat> {
    // Друг раздел може да пише в същия Журнал. Опашката в паметта не го
    // вижда; носителят обаче отказва сгрешен seq в своята транзакция.
    // Тогава тук се препрочита и повтаря. Всеки отказ значи, че НЯКОЙ е
    // записал — системата върви напред; повтаря само изгубилият.
    let posledenOtkaz: unknown;
    for (let opit = 0; opit < 10; opit += 1) {
      // 3 · дедупликация по opId — проверява се на ВСЕКИ опит: междувременно
      // другият раздел може да е записал точно тази операция.
      const veche = await this.#dnevnik.poOpId(op.naematel, op.opId);
      if (veche) {
        return { seq: veche.seq, hash: veche.hash, povtoreno: true };
      }

      // 4 · rev-предпазител
      if (op.expectedRev !== undefined) {
        const tekusht = await this.#dnevnik.tekushtRev(op.naematel, op.sashtnost);
        if (tekusht !== op.expectedRev) {
          throw new GreshkaReplay(tekusht, op.expectedRev);
        }
      }

      // 5 · append
      const posledno = await this.#dnevnik.posledno(op.naematel);
      const zaHeshirane = {
        seq: (posledno?.seq ?? 0) + 1,
        opId: op.opId,
        ts: op.ts,
        naematel: op.naematel,
        actor: op.actor,
        type: op.type,
        sashtnost: op.sashtnost,
        payload: op.payload,
        prevHash: posledno?.hash ?? '',
      };
      const hash = await izchisliHash(zaHeshirane, this.#sha);
      const sabitie: Sabitie = { ...zaHeshirane, hash };

      try {
        await this.#dnevnik.dobavi(sabitie);
      } catch (greshka) {
        if (greshka instanceof GreshkaDnevnik) {
          // Сблъсък със съседен писач. Кратък отстъп, растящ с опита —
          // иначе двата раздела се застъпват в такт и губи все същият.
          posledenOtkaz = greshka;
          await new Promise((gotovo) => setTimeout(gotovo, opit));
          continue;
        }
        throw greshka;
      }

      // Котвата: последното звено, забито ИЗВЪН Журнала — срещу скъсяване отзад.
      this.#kotva?.zabij(op.naematel, { seq: sabitie.seq, hash, kogato: op.ts });

      // 6 · върни
      return { seq: sabitie.seq, hash, povtoreno: false };
    }

    throw posledenOtkaz;
  }
}

/**
 * Привежда всеки низ в стойността — рекурсивно, и ключовете на обектите —
 * към NFC. Едно „й" = един запис, независимо от клавиатурата, която го е писала.
 */
export function normalizirayNFC(v: unknown): unknown {
  if (typeof v === 'string') return v.normalize('NFC');
  if (Array.isArray(v)) return v.map(normalizirayNFC);
  if (v !== null && typeof v === 'object') {
    const izhod: Record<string, unknown> = {};
    for (const [klyuch, stoynost] of Object.entries(v as Record<string, unknown>)) {
      izhod[klyuch.normalize('NFC')] = normalizirayNFC(stoynost);
    }
    return izhod;
  }
  return v;
}

/**
 * Всичко текстово трябва ВЕЧЕ да е NFC · за възстановяването.
 *
 * При запис Вратата НОРМАЛИЗИРА (`normalizirayNFC`); при възстановяване не
 * може — нормализираният байт мени хеша и къса веригата. Затова тук се пита,
 * не се поправя: едно „й" в NFD значи файл, който не е излизал оттук.
 */
export function proveriNFC(v: unknown, pat: string): void {
  if (typeof v === 'string') {
    if (v !== v.normalize('NFC')) {
      throw new Error(`${pat} носи текст извън NFC — файлът не е износ на Вратата.`);
    }
    return;
  }
  if (Array.isArray(v)) {
    for (const [i, el] of v.entries()) proveriNFC(el, `${pat}[${i}]`);
    return;
  }
  if (typeof v === 'object' && v !== null) {
    for (const [klyuch, stoynost] of Object.entries(v)) {
      proveriNFC(klyuch, pat);
      proveriNFC(stoynost, `${pat}.${klyuch}`);
    }
  }
}

/** Полетата за пари завършват на `_st` и са ЦЕЛИ СТОТИНКИ. */
export const NASTAVKA_PARI = '_st';

export function proveriValidnost(op: Operatsiya): void {
  neprazen(op.opId, 'opId');
  neprazen(op.naematel, 'naematel');
  neprazen(op.actor, 'actor');
  neprazen(op.type, 'type');
  neprazen(op.sashtnost?.vid, 'sashtnost.vid');
  neprazen(op.sashtnost?.id, 'sashtnost.id');

  if (typeof op.ts !== 'string' || Number.isNaN(Date.parse(op.ts))) {
    throw new GreshkaVrata('NEVALIDNO', `ts не е валидно време: ${String(op.ts)}`);
  }

  if (op.payload === null || typeof op.payload !== 'object' || Array.isArray(op.payload)) {
    throw new GreshkaVrata('NEVALIDNO', 'payload трябва да е обект');
  }

  if (op.expectedRev !== undefined && !Number.isSafeInteger(op.expectedRev)) {
    throw new GreshkaVrata('NEVALIDNO', `expectedRev трябва да е цяло число: ${op.expectedRev}`);
  }

  proveriParite(op.payload, 'payload');
}

/**
 * ПАРИТЕ В PAYLOAD-А · всяко поле на `_st` е цели най-малки единици (правило 3).
 *
 * ВЛИЗА И В МАСИВИ. Дотук не влизаше — `!Array.isArray(...)` спираше слизането
 * нарочно, от първия коммит на ядрото. Днес нито едно събитие не носи пари в
 * масив, значи дефект не е имало; но правило 3 казва „Вратата ги проверява"
 * БЕЗ уговорка, а проверка със сляпо петно е по-лоша от липсваща: тя изглежда
 * като гаранция. Първият разделен ред („един ред от картата на две теми")
 * щеше да мине с дробна стотинка и никой нямаше да разбере откъде идва.
 *
 * Индексът влиза в пътеката (`payload.chasti[1].suma_st`), за да казва
 * отказът КОЯ част е сгрешена, а не само че някоя е.
 */
function proveriParite(v: Readonly<Record<string, unknown>>, pat: string): void {
  for (const [klyuch, stoynost] of Object.entries(v)) {
    proveriEdno(klyuch, stoynost, `${pat}.${klyuch}`);
  }
}

function proveriEdno(klyuch: string, stoynost: unknown, pale: string): void {
  // МАСИВЪТ СЕ ГЛЕДА ПРЪВ, и редът не е вкус. Гледа ли се пръв ключът, поле
  // `sumi_st: [100, 200]` пада като „не е цели стотинки" — вярно за масива,
  // безсмислено за човека. Ключът се НОСИ надолу към всеки член: така масив с
  // наставка е масив ОТ СУМИ, а масив от обекти се обхожда по полетата им.
  if (Array.isArray(stoynost)) {
    stoynost.forEach((chlen, i) => proveriEdno(klyuch, chlen, `${pale}[${i}]`));
    return;
  }
  if (klyuch.endsWith(NASTAVKA_PARI)) {
    if (!eStotinki(stoynost)) {
      throw new GreshkaVrata(
        'NEVALIDNO',
        `${pale} е поле за пари и трябва да е цели стотинки; получено: ${String(stoynost)}`,
      );
    }
    return;
  }
  if (stoynost !== null && typeof stoynost === 'object') {
    proveriParite(stoynost as Record<string, unknown>, pale);
  }
}

function neprazen(v: unknown, ime: string): void {
  // trim() — иначе opId от три интервала минава за име. Намерено от фъртуната.
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new GreshkaVrata('NEVALIDNO', `${ime} е задължително и не може да е празно`);
  }
}
