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
import { sashtnostNaPravo } from './kolonno.js';
import { GreshkaZamrazen } from './zamrazyavane.js';
import type {
  PayloadImotDobaven,
  PayloadNaemDobaven,
  PayloadImotPopraven,
  PayloadButonZapisan,
  PayloadModelZapisan,
  PayloadSverkaZapisana,
  PayloadNaemPopraven,
  PayloadNaemPrekraten,
  PayloadPlashtanePrieto,
  PayloadDDSPlateno,
  PayloadRazhodZapisan,
  PayloadSpravkaPodadena,
  PayloadStorno,
  PayloadVzemaneNachisleno,
  PayloadSluzhitelZapisan,
  PayloadPravoZapisano,
  PayloadPotokZapisan,
  PayloadSaldoZapisano,
  PayloadDeloZapisano,
  TipSabitie,
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

  /**
   * ИЗПРАЩА СБОРА НА ЕДНА КОЛОНА към Приходи или Разходи.
   *
   * Негово (23.08): „сумата от колоните с валута се изпраща ДИРЕКТНО
   * АВТОМАТИЧНО към Приходи, ако е с +, и в Разходи, ако е с −."
   *
   * ИСКА ОТКЛЮЧЕН ПЕРИОД — за разлика от модела и бутона. Този запис е ЧИСЛО
   * ЗА МЕСЕЦ: влезе ли в замразен период, подадената справка спира да отговаря
   * на данните под нея (правило 9). Поправка в заключен месец минава само по
   * неговия път: сверена промяна от таблица.
   *
   * Същността е ДВОЙКА модел·колона за периода — така повторното изпращане
   * поправя реда, вместо да ражда втори.
   */
  async zapishiPotok(danni: PayloadPotokZapisan, z: Zayavka): Promise<Rezultat> {
    proveriZamrazen(await this.ogledalo(), danni.period, z.svereno);
    return this.#pusni(
      'ПотокЗаписан',
      VID.potok,
      `POTOK:${danni.model}:${danni.kolona}:${danni.period}`,
      danni,
      z,
    );
  }

  /**
   * ЗАПИСВА ЕДНО ДЕЛО · ново или поправено.
   *
   * НЕ иска отключен период. Делото не е число за месец: то не влиза в ДДС
   * справка и затова не я разминава. Срокът може да мине през заключен месец
   * и това е нормално — работата не спира, защото данъкът е подаден.
   *
   * Повторният запис на същия `id` ПОПРАВЯ делото. Срок, сменен от
   * Управлението, и срок, сменен от Ганта, са едно събитие *(р48·[75])*.
   */
  async zapishiDelo(
    id: string,
    danni: PayloadDeloZapisano,
    z: Zayavka,
  ): Promise<Rezultat> {
    return this.#pusni('ДелоЗаписано', VID.delo, id, danni, z);
  }

  /**
   * ЗАПИСВА НАЧАЛНОТО САЛДО НА ЕДИН ДЖОБ · Банка или Трезор.
   *
   * Негов трети вариант *(р48·[71])*: „Комбинация — ръчно начало + автоматични
   * движения". Тук влиза САМО началото; движенията се четат от плащанията и
   * разходите. Ако и двете влизаха в Журнала, едно движение би се броило два
   * пъти — и Ликвидността щеше да лъже точно там, където се гледа.
   *
   * НЕ иска отключен период. Салдото е НАЧАЛО, не число за месец: то не влиза
   * в подадена справка и затова не я разминава.
   *
   * Същността е ДЖОБЪТ — повторният запис поправя салдото му, не ражда втори.
   */
  async zapishiSaldo(danni: PayloadSaldoZapisano, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('СалдоЗаписано', VID.saldo, `SALDO:${danni.kade}`, danni, z);
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
   * Записва картата на хедъра — какво коя колона значи в една таблица.
   *
   * НЕ иска отключен период: моделът не е запис за месец, а описание на файл.
   * Записите, които той после ражда, си минават през своите проверки.
   */
  async zapishiModel(danni: PayloadModelZapisan, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('МоделЗаписан', VID.model, `MODEL:${danni.klyuch}`, danni, z);
  }

  /**
   * Записва бутон — модела на един ПЪТ (Настройки).
   *
   * НЕ иска отключен период, както и моделът: бутонът не е запис за месец, а
   * описание на път. Каквото той после ражда, минава през своите проверки.
   */
  async zapishiButon(danni: PayloadButonZapisan, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('БутонЗаписан', VID.buton, `BUTON:${danni.klyuch}`, danni, z);
  }

  /**
   * Записва сверка — И КОГАТО РАЗЛИКАТА Е НУЛА (правило 7).
   *
   * НЕ иска отключен период НАРОЧНО: сверката не мени нито едно число, тя само
   * казва какво е видяла. Заключен месец се сверява точно толкова, колкото и
   * отворен — иначе замразяването щеше да значи и „не гледай".
   */
  async zapishiSverka(id: string, danni: PayloadSverkaZapisana, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('СверкаЗаписана', VID.sverka, id, danni, z);
  }

  /**
   * Записва служител — имейл, име и роля.
   *
   * НЕ иска отключен период: човекът не е запис за месец. И НЕ кани никого —
   * достъпът е даден при доставчика (правило 14); тук се записва само кой е
   * пуснат и с каква роля работи вътре.
   */
  async zapishiSluzhitel(danni: PayloadSluzhitelZapisan, z: Zayavka): Promise<Rezultat> {
    return this.#pusni(
      'СлужителЗаписан',
      VID.sluzhitel,
      `SLUZHITEL:${danni.imeyl}`,
      danni,
      z,
    );
  }

  /**
   * Записва колонното право — кои колони са СКРИТИ за един служител в един хедър.
   *
   * НЕ иска отключен период НАРОЧНО: скриването не мени нито едно число.
   * Заключен месец се гледа през същите скрити колони, както и отворен.
   */
  async zapishiPravo(danni: PayloadPravoZapisano, z: Zayavka): Promise<Rezultat> {
    return this.#pusni(
      'ПравоЗаписано',
      VID.pravo,
      sashtnostNaPravo(danni.imeyl, danni.model),
      danni,
      z,
    );
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

  /**
   * ПИШЕЩИЯТ Е СТРОГ, ЧЕТЯЩИЯТ Е СНИЗХОДИТЕЛЕН.
   *
   * `type` е `TipSabitie`, не `string`. Разликата не е козметична: с `string`
   * едно сгрешено име — например с латинско „o" в кирилска дума (правило 11) —
   * минава компилацията, влиза в Журнала и после пада в `default` на `fold()`,
   * където се брои, но не мени нищо. Тих загубен запис в система, чието първо
   * правило е нула загуба на данни.
   *
   * `default` в `fold()` ОСТАВА снизходителен нарочно: стар код трябва да може
   * да чете по-нов Журнал, без да се събаря. Строгостта е при ВХОДА.
   */
  async #pusni(
    type: TipSabitie,
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
