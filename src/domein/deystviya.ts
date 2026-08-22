/**
 * ДЕЙСТВИЯТА — тънкият слой между приложението и Вратата.
 *
 * Тук няма логика за състояние: всяко действие сглобява ОПЕРАЦИЯ и я подава
 * на Вратата. Състоянието се чете от Огледалото, не оттук.
 *
 * `opId` е ЗАДЪЛЖИТЕЛЕН отвън: повторното изпращане на едно и също действие
 * (мрежа падна, потребителят натисна два пъти) трябва да носи същия opId —
 * иначе идемпотентността е само дума.
 */

import type { Dnevnik, Operatsiya, Rezultat, Sabitie, Vrata } from '../yadro/index.js';
import { fold, type Ogledalo } from '../ogledalo/ogledalo.js';
import { periodNaSabitie, proveriZamrazen } from './zamrazyavane.js';
import { sashtnost, VID, type Vid } from './sabitiya.js';
import { GreshkaZamrazen } from './zamrazyavane.js';
import type {
  PayloadImotDobaven,
  PayloadNaemDobaven,
  PayloadImotPopraven,
  PayloadNaemPopraven,
  PayloadNaemPrekraten,
  PayloadPlashtanePrieto,
  PayloadDDSPlateno,
  PayloadRazhodZapisan,
  PayloadSpravkaPodadena,
  PayloadStorno,
  PayloadVzemaneNachisleno,
} from './sabitiya.js';

export interface NastroykiDeystviya {
  readonly vrata: Vrata;
  readonly dnevnik: Dnevnik;
  readonly naematel: string;
  readonly actor: string;
  /** ISO време — подава се отвън, за да са тестовете повторяеми */
  readonly chasovnik: () => string;
}

export interface Zayavka {
  readonly opId: string;
  /** rev-предпазител: seq на последното събитие за същността, което си видял */
  readonly expectedRev?: number;
  /**
   * Страничният вход на заключен период: сверената промяна от таблица.
   * Само актуализацията го вдига — формите никога.
   */
  readonly svereno?: boolean;
}

export class Deystviya {
  readonly #vrata: Vrata;
  readonly #dnevnik: Dnevnik;
  readonly #naematel: string;
  readonly #actor: string;
  readonly #chasovnik: () => string;

  constructor(n: NastroykiDeystviya) {
    this.#vrata = n.vrata;
    this.#dnevnik = n.dnevnik;
    this.#naematel = n.naematel;
    this.#actor = n.actor;
    this.#chasovnik = n.chasovnik;
  }

  async dobaviImot(id: string, danni: PayloadImotDobaven, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ИмотДобавен', VID.imot, id, danni, z);
  }

  async dobaviNaem(id: string, danni: PayloadNaemDobaven, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('НаемДобавен', VID.naem, id, danni, z);
  }

  async prekratiNaem(danni: PayloadNaemPrekraten, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('НаемПрекратен', VID.naem, danni.naemId, danni, z);
  }

  /** Поправка на описанието — ново събитие върху същия имот, не сторно. */
  async popraviImot(danni: PayloadImotPopraven, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ИмотПоправен', VID.imot, danni.imotId, danni, z);
  }

  async popraviNaem(danni: PayloadNaemPopraven, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('НаемПоправен', VID.naem, danni.naemId, danni, z);
  }

  async nachisliVzemane(
    id: string,
    danni: PayloadVzemaneNachisleno,
    z: Zayavka,
  ): Promise<Rezultat> {
    proveriZamrazen(await this.ogledalo(), danni.period, z.svereno);
    return this.#pusni('ВземанеНачислено', VID.vzemane, id, danni, z);
  }

  async priemiPlashtane(
    id: string,
    danni: PayloadPlashtanePrieto,
    z: Zayavka,
  ): Promise<Rezultat> {
    proveriZamrazen(await this.ogledalo(), danni.data.slice(0, 7), z.svereno);
    return this.#pusni('ПлащанеПрието', VID.plashtane, id, danni, z);
  }

  async zapishiRazhod(
    id: string,
    danni: PayloadRazhodZapisan,
    z: Zayavka,
  ): Promise<Rezultat> {
    proveriZamrazen(await this.ogledalo(), danni.data.slice(0, 7), z.svereno);
    return this.#pusni('РазходЗаписан', VID.razhod, id, danni, z);
  }

  /**
   * Подава ДДС-справка — и с това ЗАКЛЮЧВА периода.
   * Второ подаване се отказва: поправка = сторно на старата + нова.
   */
  async podaySpravka(danni: PayloadSpravkaPodadena, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (o.spravki.has(danni.period)) {
      throw new GreshkaZamrazen(
        danni.period,
        ' За този период вече има справка — сторнирай я, преди да подадеш нова.',
      );
    }
    return this.#pusni('СправкаПодадена', VID.spravka, `SP:${danni.period}`, danni, z);
  }

  /** Внесеното ДДС, от платежното. Нарочно НЕ иска отключен период. */
  async platiDDS(id: string, danni: PayloadDDSPlateno, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ДДСПлатено', VID.spravka, id, danni, z);
  }

  /**
   * Поправка = НОВО събитие. Журналът не се пипа.
   * Сторното сочи seq-а, който погасява; и двете остават записани завинаги.
   */
  async storniraj(
    id: string,
    danni: PayloadStorno,
    z: Zayavka,
    vid: Vid = VID.plashtane,
  ): Promise<Rezultat> {
    // Сторно на събитие ОТ заключен период също е редакция на периода.
    const zhertva = (await this.#dnevnik.chetiVsichki(this.#naematel)).find(
      (s) => s.seq === danni.pogasyavaSeq,
    );
    if (zhertva) {
      const period = periodNaSabitie(zhertva);
      if (period !== '') proveriZamrazen(await this.ogledalo(), period, z.svereno);
    }
    return this.#pusni('Сторно', vid, id, danni, z);
  }

  /** Огледалото: изчислява се от Журнала при всяко поискване, не се пази. */
  async ogledalo(): Promise<Ogledalo> {
    return fold(await this.#dnevnik.chetiVsichki(this.#naematel));
  }

  /** Суровите събития на този наемател — за проверки, износ и вратаря на сторното. */
  async sabitiya(): Promise<readonly Sabitie[]> {
    return this.#dnevnik.chetiVsichki(this.#naematel);
  }

  async #pusni(
    type: string,
    vid: Vid,
    id: string,
    payload: Readonly<object>,
    z: Zayavka,
  ): Promise<Rezultat> {
    const op: Operatsiya = {
      opId: z.opId,
      ts: this.#chasovnik(),
      naematel: this.#naematel,
      actor: this.#actor,
      type,
      sashtnost: sashtnost(vid, id),
      // Payload-ите са затворени интерфейси; Журналът ги пази като обект.
      payload: payload as Readonly<Record<string, unknown>>,
      ...(z.expectedRev === undefined ? {} : { expectedRev: z.expectedRev }),
    };
    return this.#vrata.dobavi(op);
  }
}
