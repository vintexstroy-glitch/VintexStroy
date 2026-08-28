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
import { prochetiKnigata } from './knigata.js';
import { praviTsikal } from './dela.js';
import {
  GreshkaZadacha,
  napraviIzprashtane,
  napraviOtgovor,
} from './zadachi-kam-hora.js';
import { periodNaSabitie, proveriZamrazen } from './zamrazyavane.js';
import { sashtnost, VID, type Vid } from './sabitiya.js';
import { sashtnostNaPravo } from './kolonno.js';
import { GreshkaAgent, proveriPromyanata } from './agenti.js';
import { GreshkaZamrazen } from './zamrazyavane.js';
import { GreshkaTablitsa } from './zhurnal-ot-tablitsa.js';
import { GreshkaDostap, napraviDostap, proveriMyasto, proveriNeSamSiAz } from './lichen-dostap.js';
import {
  GreshkaLichniPari,
  napraviTema,
  proveriChastite,
  VIDOVE_KREDIT,
} from './lichni-pari.js';
import { SUMATA_NAD_NULA } from '../yadro/pari.js';
import { eLichenKlyuch, svediImeyl } from './akaunt.js';
import { napraviRedNaLentata } from './lenta.js';
import { proveriNovTab } from './tabove.js';
import { eStopanin, GreshkaStopanin, mozheDaVzemeZhurnala } from './stopanin.js';
import { GreshkaVhod, proveriNastroyka, type Sila } from './vhodni-problemi.js';
import {
  GreshkaKontragent,
  klyuchNaKontragent,
  proveriKontragent,
  type VidKontragent,
} from './kontragenti.js';
import type {
  PayloadImotDobaven,
  PayloadNaemDobaven,
  PayloadImotPopraven,
  PayloadButonZapisan,
  PayloadModelZapisan,
  PayloadSverkaZapisana,
  PayloadSvrazkaZapisana,
  PayloadLichnoPrevklyucheno,
  PayloadLichenDostapZapisan,
  PayloadLichnaTemaZapisana,
  PayloadLichnoDvizhenieZapisano,
  PayloadLichenRedIzklyuchen,
  PayloadLichenKreditZapisan,
  PayloadLichnoIzvlechenieprieto,
  PayloadDeloPrehvarleno,
  PayloadPrenosOtcheten,
  PayloadNaemPopraven,
  PayloadNaemPrekraten,
  PayloadPlashtanePrieto,
  PayloadDDSPlateno,
  PayloadRazhodZapisan,
  PayloadSpravkaPodadena,
  PayloadParametarNaVhodaZapisan,
  PayloadKontragentZapisan,
  PayloadStopaninSmenen,
  PayloadLentaPodredena,
  PayloadNAPVrazkaPrevklyuchena,
  PayloadStopaninZapisan,
  PayloadZapasenKontaktZapisan,
  PayloadStorno,
  PayloadVzemaneNachisleno,
  PayloadSluzhitelZapisan,
  PayloadPravoZapisano,
  PayloadPotokZapisan,
  PayloadSaldoZapisano,
  PayloadDeloZapisano,
  PayloadAgentZapisan,
  PayloadOtgovorNaZadacha,
  PayloadTabZapisan,
  PayloadZadachaIzpratena,
  PayloadPredlozhenieZapisano,
  PayloadZadachaZapisana,
  TipSabitie,
} from './sabitiya.js';

interface NastroykiDeystviya {
  readonly vrata: Vrata;
  readonly dnevnik: Dnevnik;
  readonly naematel: string;
  readonly actor: string;
  /** ISO време — подава се отвън, за да са тестовете повторяеми */
  readonly chasovnik: () => string;
  /**
   * КНИГАТА, ако е по-широка от моята верига (ADR-055).
   *
   * Пропусната значи „книгата съм аз" — точно днешното поведение, тъй че всеки
   * вече написан ред работи непроменен. Подадена значи ЧЕТА от всички вериги
   * на тази книга, а ПИША пак само в `naematel`.
   *
   * Несиметрията е нарочна и е целият избор на ADR-055: сливане на писането би
   * било презапис, преоблечен като синхрон, а свиване на четенето до своята
   * верига би скрило половин книга — мълчаливо, защото нищо не хвърля.
   */
  readonly kniga?: string;
}

interface Zayavka {
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
  readonly #kniga: string | undefined;

  constructor(n: NastroykiDeystviya) {
    this.#vrata = n.vrata;
    this.#dnevnik = n.dnevnik;
    this.#naematel = n.naematel;
    this.#actor = n.actor;
    this.#chasovnik = n.chasovnik;
    this.#kniga = n.kniga;
  }

  async dobaviImot(id: string, danni: PayloadImotDobaven, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ИмотДобавен', VID.imot, id, danni, z);
  }

  async dobaviNaem(id: string, danni: PayloadNaemDobaven, z: Zayavka): Promise<Rezultat> {
    proveriPadezhDen(danni.padezhDen);
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
    proveriPadezhDen(danni.padezhDen);
    return this.#pusni('НаемПоправен', VID.naem, danni.naemId, danni, z);
  }

  async nachisliVzemane(
    id: string,
    danni: PayloadVzemaneNachisleno,
    z: Zayavka,
  ): Promise<Rezultat> {
    proveriDvizhi(danni.suma_st, 'Начислението');
    proveriZamrazen(await this.ogledalo(), danni.period, z.svereno);
    return this.#pusni('ВземанеНачислено', VID.vzemane, id, danni, z);
  }

  async priemiPlashtane(
    id: string,
    danni: PayloadPlashtanePrieto,
    z: Zayavka,
  ): Promise<Rezultat> {
    proveriDvizhi(danni.suma_st, 'Плащането');
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
    // ПРЕХВЪРЛЕНОТО дело не се записва наново тук (И98): то живее в другия
    // Журнал. Единственият вход, който го връща, е обратният пренос
    // (`priemiPrehvarleno` в другата посока) — иначе следващият внос от МД
    // или невнимателна форма би го възкресила мълчаливо.
    const prehvarleno = (await this.ogledalo()).prehvarleni.get(id);
    if (prehvarleno) {
      throw new GreshkaTablitsa(
        `Това дело е ПРЕХВЪРЛЕНО към „${prehvarleno.kam}" (пренос ${prehvarleno.prenosId.slice(0, 8)}…). ` +
          'Върни го с обратен пренос, не със запис наново.',
      );
    }
    // ЦИКЪЛ · дело, направено свой прародител, ЗАКЛЮЧВА рисуването завинаги:
    // всяка обиколка на дървото тръгва и не се връща. Дотук такъв пазач НЯМАШЕ
    // и не се стигаше до цикъл само защото формата винаги ражда нов `id`. С
    // бутони „навътре · навън" (резен 12б) се стига веднага.
    //
    // Проверката е ТУК, не при Вратата: Вратата не чете Огледалото — дословният
    // прецедент на `vpishiZapasen` по-долу. Дървото се знае само от Огледалото.
    if (danni.nadDelo !== '') {
      const zhivi = [...(await this.ogledalo()).dela.values()];
      if (praviTsikal(zhivi, id, danni.nadDelo)) {
        throw new GreshkaTablitsa(
          'Това дело не може да е под самото себе си или под свой потомък — ' +
            'дървото щеше да се затвори в кръг и екранът нямаше да се нарисува.',
        );
      }
    }
    return this.#pusni('ДелоЗаписано', VID.delo, id, danni, z);
  }

  /**
   * ПРЕХВЪРЛЯ дело към ДРУГ Журнал · половината на ИЗПРАЩАЧА (И98).
   *
   * Свое събитие, НЕ сторно: сторно значи „грешка", а прехвърленото дело е
   * живо и вярно — само че вече не е тук. Причината е задължителна (И97).
   *
   * Това действие пише САМО в своя Журнал. Другата половина
   * (`priemiPrehvarleno`) пише в получателя, със своя Deystviya — и редът е
   * ПЪРВО получателят, ПОСЛЕДЕН изпращачът (`src/domein/prenos.ts` го държи).
   */
  async prehvarliDelo(id: string, danni: PayloadDeloPrehvarleno, z: Zayavka): Promise<Rezultat> {
    if (danni.prichina.trim() === '') {
      throw new GreshkaTablitsa(
        'Пренос без ПРИЧИНА не се записва — следа, която не обяснява нищо, е по-лоша от липсваща.',
      );
    }
    return this.#pusni('ДелоПрехвърлено', VID.delo, id, danni, z);
  }

  /**
   * ПРИЕМА прехвърлено дело · половината на ПОЛУЧАТЕЛЯ (И98).
   *
   * Записва делото със СЪЩИЯ id — детерминиран е, повторното пускане не ражда
   * второ дело, а id-то не живее на две места ЕДНОВРЕМЕННО, а последователно.
   * Заобикаля вратаря на `zapishiDelo` нарочно: обратният пренос е
   * ЕДИНСТВЕНИЯТ вход, който връща прехвърлено дело.
   */
  async priemiPrehvarleno(
    id: string,
    danni: PayloadDeloZapisano,
    z: Zayavka,
  ): Promise<Rezultat> {
    return this.#pusni('ДелоЗаписано', VID.delo, id, danni, z);
  }

  /**
   * РАЗПИСКАТА на един пренос · сверката вход↔изход (правило 7).
   *
   * По една във всеки Журнал; разликата се записва ДОРИ когато е нула —
   * проверената нула е различна от нулата, за която никой не е питал.
   */
  async zapishiPrenos(danni: PayloadPrenosOtcheten, z: Zayavka): Promise<Rezultat> {
    return this.#pusni(
      'ПреносОтчетен',
      VID.prenos,
      `PRENOS:${danni.prenosId}:${danni.posoka}`,
      danni,
      z,
    );
  }

  /**
   * ПРЕВКЛЮЧВА личното · първото събитие на личния Журнал (И98).
   *
   * „Има си и отделен журнал когато се е активирал личния" — съществуването
   * на Журнала Е активацията. Прибирането е ново събитие с `vklyucheno:
   * false`; Журналът остава непокътнат, само пунктът пада от лентата.
   */
  async prevklyuchiLichno(danni: PayloadLichnoPrevklyucheno, z: Zayavka): Promise<Rezultat> {
    // МЯСТОТО Е ЧАСТ ОТ АКТИВАЦИЯТА (И99): „личният екран се активира с
    // ДАВАНЕ НА ДОСТЪП ДО МЯСТО в личния драйв". Изисква се при ВКЛЮЧВАНЕ;
    // при прибиране няма какво да се посочва.
    //
    // Проверката е ТУК, не в типа: запис, направен преди това поле, е също
    // толкова валиден запис и Журналът не се преписва (правило 1).
    if (danni.vklyucheno) {
      const veche = (await this.ogledalo()).lichnoMyasto;
      if (proveriMyasto(danni.myasto ?? veche) === '') {
        throw new GreshkaDostap('Личното иска МЯСТО в твоя драйв, преди да тръгне.');
      }
    }
    return this.#pusni('ЛичноПревключено', VID.lichno, `LICHNO:${this.#naematel}`, danni, z);
  }

  /**
   * ЗАПИСВА ЛИЧЕН ДОСТЪП · споделянето в ОБРАТНАТА посока (И99).
   *
   * Негово: „ако иска да даде достъп на работодателя си… или да сподели на
   * външен имейл личната си папка и личен таб. Например на жена си."
   *
   * Отнемането е СЪЩОТО действие с `otnet: true` — ново събитие върху същия
   * човек, не изтрит ред. „Дадох ѝ достъп през август, отнех го през ноември"
   * е история, която триенето би направило недоказуема (правило 1).
   *
   * ПИША СЕ САМО В ЛИЧЕН ЖУРНАЛ. Кой е допуснат до личното е част от личното;
   * в служебния такъв запис няма какво да прави и не бива да го има (И98).
   */
  async zapishiLichenDostap(
    danni: PayloadLichenDostapZapisan,
    z: Zayavka,
  ): Promise<Rezultat> {
    if (!eLichenKlyuch(this.#naematel)) {
      throw new GreshkaDostap(
        'Личен достъп се дава само от ЛИЧНИЯ Журнал. В служебния такъв запис не влиза — ' +
          'кой е допуснат до личното е част от личното.',
      );
    }
    const dostap = napraviDostap({
      imeyl: danni.imeyl,
      rolya: danni.rolya,
      kakvo: danni.kakvo as never,
      kakav: danni.kakav as never,
      otnet: danni.otnet,
    });
    proveriNeSamSiAz(dostap, this.#actor);
    return this.#pusni('ЛиченДостъпЗаписан', VID.dostap, `DOSTAP:${dostap.imeyl}`, dostap, z);
  }

  // ═══ ЛИЧНИТЕ ПАРИ (И96 т.10) ═══════════════════════════════════════════
  //
  // И ЧЕТИРИТЕ почват с един и същ вратар и НИТО ЕДНО не вика
  // `proveriZamrazen`. Двете са нарочни и се обясняват веднъж тук:
  //
  // ВРАТАРЯТ: „Кредит", „Лечение", „Развод" не бива да влязат в СЛУЖЕБНИЯ
  // Журнал от сгрешен екран. Разделянето на ДАННИТЕ не спасява ИМЕНАТА
  // (ADR-036 §8) — служебният се изнася и минава пред служители.
  //
  // ЗАМРАЗЯВАНЕТО: правило 9 заключва месец, за който е подадена ДДС-справка.
  // В личния Журнал `СправкаПодадена` няма и не бива да има — личният разход
  // не се облага. Тоест правило 9 не важи тук ПО КОНСТРУКЦИЯ, а не защото
  // някой го е изключил; нова забрана тук би изглеждала като че важи.

  #samoLichno(kakvo: string): void {
    if (!eLichenKlyuch(this.#naematel)) {
      throw new GreshkaLichniPari(
        `${kakvo} се записва само в ЛИЧНИЯ Журнал. В служебния такъв запис не влиза — ` +
          'имената на личните теми не бива да минават пред служители.',
      );
    }
  }

  /**
   * ЗАПИСВА ТЕМА · и преименуването, и спирането са това действие.
   *
   * Последният запис за същия номер ПОПРАВЯ. Затова номерът се пази стабилен
   * при преименуване: редовете сочат него, не името, и една смяна на етикет
   * не поражда запис за всеки ред, който го носи.
   */
  async zapishiLichnaTema(danni: PayloadLichnaTemaZapisana, z: Zayavka): Promise<Rezultat> {
    this.#samoLichno('Лична тема');
    const tema = napraviTema(danni);
    return this.#pusni(
      'ЛичнаТемаЗаписана',
      VID.lichnaTema,
      `LTEMA:${tema.temaId}`,
      { ...tema },
      z,
    );
  }

  /**
   * ЗАПИСВА ДВИЖЕНИЕ · приход, разход или вноска по кредит.
   *
   * Поправката е ПАК това действие върху същия номер — движението няма
   * отделно събитие „Поправено", точно както делото. Огледалото пази срещу
   * възкресяване на сторнирано (ADR-036 §9).
   */
  async zapishiLichnoDvizhenie(
    danni: PayloadLichnoDvizhenieZapisano,
    z: Zayavka,
  ): Promise<Rezultat> {
    this.#samoLichno('Лично движение');
    if (danni.suma_st <= 0) {
      throw new GreshkaLichniPari(
        `${SUMATA_NAD_NULA} Посоката казва приход ли е, или разход — знакът не е в цифрата.`,
      );
    }
    if (danni.posoka !== 'prihod' && danni.posoka !== 'razhod') {
      throw new GreshkaLichniPari(`Непозната посока „${String(danni.posoka)}".`);
    }
    proveriChastite(danni);
    return this.#pusni(
      'ЛичноДвижениеЗаписано',
      VID.lichnoDvizhenie,
      `LDV:${danni.dvizhenieId}`,
      danni,
      z,
    );
  }

  /**
   * ИЗКЛЮЧВА или ВРЪЩА един ред · „ред се ИЗКЛЮЧВА" (правило 23).
   *
   * СВОЕ събитие, не поле в движението: повторният внос пренаписва реда от
   * файла и би изтрил решението на човека, ако то живееше там.
   */
  async izklyuchiLichenRed(danni: PayloadLichenRedIzklyuchen, z: Zayavka): Promise<Rezultat> {
    this.#samoLichno('Изключване на ред');
    if (danni.izklyuchen && danni.prichina.trim() === '') {
      throw new GreshkaLichniPari(
        'Изключеният ред иска ПРИЧИНА. Следа без причина не обяснява нищо след половин година.',
      );
    }
    return this.#pusni(
      'ЛиченРедИзключен',
      VID.lichnoDvizhenie,
      `LDV:${danni.dvizhenieId}`,
      danni,
      z,
    );
  }

  /**
   * ЗАПИСВА КРЕДИТ · началният остатък и условията. Остатъкът се СМЯТА после.
   */
  async zapishiLichenKredit(danni: PayloadLichenKreditZapisan, z: Zayavka): Promise<Rezultat> {
    this.#samoLichno('Личен кредит');
    if (danni.ime.trim() === '') {
      throw new GreshkaLichniPari('Кредитът иска име — „Ипотека · Пощенска", за да се различава.');
    }
    if (!VIDOVE_KREDIT.includes(danni.vid)) {
      throw new GreshkaLichniPari(`Непознат вид кредит „${String(danni.vid)}".`);
    }
    if (danni.ostatak_st <= 0) {
      throw new GreshkaLichniPari('Остатъкът по кредита трябва да е повече от нула.');
    }
    if (danni.vnoska_st <= 0) {
      throw new GreshkaLichniPari('Вноската трябва да е повече от нула.');
    }
    if (!Number.isSafeInteger(danni.lihva_bp) || danni.lihva_bp < 0 || danni.lihva_bp > 10_000) {
      throw new GreshkaLichniPari(
        'Лихвата е в ЦЕЛИ базисни пунктове: 3,45 % се пише 345. Приема се от 0 до 10 000.',
      );
    }
    if (!Number.isSafeInteger(danni.den) || danni.den < 1 || danni.den > 31) {
      throw new GreshkaLichniPari('Денят на вноската е между 1 и 31.');
    }
    return this.#pusni(
      'ЛиченКредитЗаписан',
      VID.lichenKredit,
      `LKRED:${danni.kreditId}`,
      danni,
      z,
    );
  }

  /**
   * РАЗПИСКАТА НА ЕДНА ПАРТИДА ОТ ИЗВЛЕЧЕНИЕ (правило 7).
   *
   * Записва се и когато разликата е НУЛА: „няма разлика" иначе е неразличимо
   * от „не е сверявано".
   */
  async zapishiLichnaPartida(
    danni: PayloadLichnoIzvlechenieprieto,
    z: Zayavka,
  ): Promise<Rezultat> {
    this.#samoLichno('Разписка на партида');
    return this.#pusni(
      'ЛичноИзвлечениеПрието',
      VID.lichnoIzvlechenie,
      `LPART:${danni.partidaId}`,
      danni,
      z,
    );
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
    proveriDvizhi(danni.suma_st, 'Разходът');
    proveriZamrazen(await this.ogledalo(), danni.data.slice(0, 7), z.svereno);
    return this.#pusni('РазходЗаписан', VID.razhod, id, danni, z);
  }

  /**
   * ЗАПИСВА СТОПАНИНА · първото събитие в Журнала на наемателя (И97 т.8).
   *
   * Тук няма проверка „има ли вече" — тя е при ВРАТАТА (ADR-043), защото
   * правилото трябва да важи за всеки писач, не само за този. Действието само
   * подава `expectedRev: 0`: Стопанинът е една същност и има точно едно
   * събитие. Двете проверки се повтарят нарочно — една от тях е на пътя, по
   * който се пише днес, другата е на пътя, по който ще се пише утре.
   */
  async zapishiStopanina(danni: PayloadStopaninZapisan, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('СтопанинЗаписан', VID.stopanin, danni.imeyl, danni, {
      ...z,
      expectedRev: 0,
    });
  }

  /**
   * ВПИСВА ЗАПАСНИЯ КОНТАКТ · само Стопанинът, и то предварително (И100).
   *
   * Проверката „ти ли си Стопанинът" е ТУК, а не при Вратата: Вратата не чете
   * Огледалото и не бива да го научава. Същият модел като при замразения
   * период — предусловието живее в действието, записът минава през Вратата.
   *
   * Телефонът НЕ влиза: подава се вече сметнатият му отпечатък (`stopanin.ts`).
   * Действието не смята — то записва, а какво е доказателство, решава домейнът.
   */
  async zapishiZapasenKontakt(
    danni: PayloadZapasenKontaktZapisan,
    z: Zayavka,
  ): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!eStopanin(this.#actor, o)) {
      throw new GreshkaStopanin(
        'Запасният контакт се вписва само от Стопанина — той е пътят обратно към ' +
          'НЕГОВИЯ Журнал.',
      );
    }
    if (svediImeyl(danni.imeyl) === svediImeyl(o.stopanin)) {
      throw new GreshkaStopanin(
        'Запасният контакт не може да е самият главен имейл: тогава загубата на ' +
          'единия отнася и другия, а точно това трябва да предотврати.',
      );
    }
    return this.#pusni('ЗапасенКонтактЗаписан', VID.zapasen, danni.imeyl, danni, z);
  }

  /**
   * ВКЛЮЧВА или ПРИБИРА ВРЪЗКАТА С НАП · само Стопанинът (резен 17).
   *
   * Проверката е ТУК, а не при Вратата — Вратата не чете Огледалото. Същият
   * модел и същият прецедент като при запасния контакт и при реда на лентата.
   *
   * СЪГЛАСИЕТО ВЛИЗА В ТОВАРА, не в екрана. „Прочетох какво напуска
   * устройството" е решение на ЧОВЕК, а решенията на хора имат имейл и следа
   * (правило 18). Записано само като отметка на екрана, то щеше да изчезне при
   * първото презареждане и никой нямаше да знае кой го е дал.
   *
   * ПРИБИРАНЕТО НЕ ИСКА СЪГЛАСИЕ · спирането на нещо не мени какво напуска.
   */
  async prevklyuchiNAP(danni: PayloadNAPVrazkaPrevklyuchena, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!eStopanin(this.#actor, o)) {
      throw new GreshkaStopanin(
        'Връзката с НАП се включва само от Стопанина — тя дава достъп на служител ' +
          'и мени какво напуска устройството.',
      );
    }
    if (danni.vklyucheno && danni.saglasieto.trim() === '') {
      throw new GreshkaStopanin(
        'Включването иска СЪГЛАСИЕ с имейл — кой е прочел какво напуска устройството. ' +
          'Съгласие без име не може да се провери, а границата е негово решение.',
      );
    }
    return this.#pusni('НАПВръзкаПревключена', VID.nap, 'NAP', danni, z);
  }

  /**
   * ПОДРЕЖДА ЛЕНТАТА · НАЧАЛНИЯТ ред, който всички получават (резен 15 · И111).
   *
   * Проверката „ти ли си Стопанинът" е ТУК, а не при Вратата — същият модел и
   * същата причина като при запасния контакт: Вратата не чете Огледалото и не
   * бива да го научава.
   *
   * ЗАПИСВА СЕ ЦЕЛИЯТ РЕД, не разлика. Разлика („мести Х с една нагоре") зависи
   * от състоянието в мига на записа, а при много вериги (ADR-055) две
   * едновременни размествания биха дали различен резултат според реда на
   * прочитане. Цял списък е самодостатъчен.
   *
   * ЛИЧНОТО ПРЕНАРЕЖДАНЕ НЕ МИНАВА ОТТУК и това е половината от неговото
   * решение: то е ПОГЛЕД и живее в паметта на екрана. Значи служител, който си
   * подрежда менюто, не пише нито едно събитие — и проход §72 го брои.
   */
  async podrediLentata(danni: PayloadLentaPodredena, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!eStopanin(this.#actor, o)) {
      throw new GreshkaStopanin(
        'Началният ред на менюто се задава само от Стопанина — той е онова, което ' +
          'ВСИЧКИ получават. Своя ред всеки си подрежда сам, и той не влиза в Журнала.',
      );
    }
    // СТРОГОСТТА Е ПРИ ВХОДА · дубликат, записан веднъж, рисува пункт два пъти
    // ЗАВИНАГИ (правило 1 · `lenta.ts`). Проверката е ПРЕДИ Вратата, защото
    // Вратата пази парите и NFC, не смисъла на този товар.
    return this.#pusni(
      'ЛентаПодредена',
      VID.lenta,
      'LENTA',
      { red: napraviRedNaLentata(danni.red) },
      z,
    );
  }

  /**
   * СМЕНЯ СТОПАНИНА · единственият път, и той минава само през запасния (И100).
   *
   * Тук се проверява ЦЯЛОТО условие, преди да се пише: кой го иска, съвпада ли
   * със запасния имейл и знае ли телефона. Отказът носи думи, защото човекът от
   * другата страна се опитва да си върне собствения Журнал.
   *
   * Действието НЕ пита „ти ли си Стопанинът" — точно обратното: то съществува
   * за случая, в който Стопанинът вече не може да влезе.
   */
  async smeniStopanina(
    danni: { readonly telefonOtpechatak: string; readonly prichina: string },
    z: Zayavka,
  ): Promise<Rezultat> {
    const o = await this.ogledalo();
    const otgovor = mozheDaVzemeZhurnala({
      imeyl: this.#actor,
      telefonOtpechatak: danni.telefonOtpechatak,
      o,
    });
    if (!otgovor.mozhe) throw new GreshkaStopanin(otgovor.kazva);
    if (danni.prichina.trim() === '') {
      throw new GreshkaStopanin('Смяната на Стопанина иска причина — тя остава в Журнала.');
    }
    const payload: PayloadStopaninSmenen = {
      ot: o.stopanin,
      kam: svediImeyl(this.#actor),
      prichina: danni.prichina.trim(),
    };
    return this.#pusni('СтопанинСменен', VID.stopanin, payload.kam, payload, z);
  }

  /**
   * ЗАПИСВА ПАРАМЕТЪР ПРИ ВЪВЕЖДАНЕ · само Стопанинът (И96 т.1 · ADR-046).
   *
   * Негови думи: „да може да ги контролираш от Настройки, и дори стопанинът да
   * дава негова бележка, когато се случи."
   *
   * Правото е ТУК, както при запасния контакт: Вратата не чете Огледалото и не
   * бива да го научава. Параметърът мени какво влиза през нея за ВСИЧКИ в
   * бизнеса — това не е предпочитание на един служител.
   *
   * `opId` носи ДЕЙСТВИЕТО (правило 20), а същността е ВИДЪТ: повторното
   * записване на същия вид ПОПРАВЯ реда, вместо да ражда втори.
   */
  async zapishiParametarNaVhoda(
    danni: PayloadParametarNaVhodaZapisan,
    z: Zayavka,
  ): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!eStopanin(this.#actor, o) && o.stopanin !== '') {
      throw new GreshkaVhod(
        'Параметрите при въвеждане се менят само от Стопанина — те важат за ' +
          'целия бизнес, не за един екран.',
      );
    }
    proveriNastroyka(danni.vid, {
      vklyuchen: danni.vklyuchen,
      sila: danni.sila as Sila,
      belezhka: danni.belezhka,
    });
    return this.#pusni('ПараметърНаВходаЗаписан', VID.parametar, danni.vid, danni, z);
  }

  /**
   * ЗАПИСВА КОНТРАГЕНТ · номерата, които одитният файл иска (И96 т.11).
   *
   * Само Стопанинът: ЕИК-ът и номерът по ДДС на собствената фирма отиват в
   * `Header` на файла за НАП, а чуждите — в `MasterFiles`. Сбъркан номер там е
   * отхвърлен файл и глоба по чл. 277а — това не е поле за всеки служител.
   *
   * Същността е СВЕДЕНОТО ИМЕ: втори запис за същия човек го ДОПЪЛВА, вместо
   * да го удвои. Затова ключът минава през `klyuchNaKontragent`, а не през
   * името както е написано — иначе „ЕООД Иван" и „еоод иван" стават двама.
   */
  async zapishiKontragent(danni: PayloadKontragentZapisan, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!eStopanin(this.#actor, o) && o.stopanin !== '') {
      throw new GreshkaKontragent(
        'Контрагентите се вписват само от Стопанина — техните номера отиват в ' +
          'одитния файл за НАП.',
      );
    }
    proveriKontragent({
      vid: danni.vid as VidKontragent,
      ime: danni.ime,
      eik: danni.eik,
      ddsNomer: danni.ddsNomer,
      adres: danni.adres,
      grad: danni.grad,
      poshtenskiKod: danni.poshtenskiKod,
      darzhava: danni.darzhava,
    });
    return this.#pusni(
      'КонтрагентЗаписан',
      VID.kontragent,
      klyuchNaKontragent(danni.ime),
      danni,
      z,
    );
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
    proveriDvizhi(danni.suma_st, 'Внесеното ДДС');
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
   * Записва ТАБ · секциите му и връзките между тях (И92 т.9).
   *
   * НЕ иска отключен период: табът не мени нито едно число — той решава
   * какво се ПОКАЗВА. Заключен месец се гледа през същите секции.
   */
  /**
   * ПРАЩА ЗАДАЧА НА ЧОВЕК (резен 14а · И110 · негово „ръчно", р57·[160]).
   *
   * ДВЕ проверки стоят ТУК, не на екрана — екран без бутон се заобикаля с
   * конзолата, а тези две пазят смисъла:
   *
   *   1. получателят е ЖИВ служител · инак задачата няма кой да я приеме;
   *   2. делото СЪЩЕСТВУВА · задача върху нищо е бележка, не задача.
   *
   * Проверките четат Огледалото, значи мястото им е тук, а не при Вратата —
   * дословният прецедент на `vpishiZapasen`: Вратата не чете Огледалото.
   *
   * НЕ иска отключен период: задачата не мени нито едно число.
   */
  async pratiZadacha(danni: PayloadZadachaIzpratena, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!o.dela.has(danni.deloId)) {
      throw new GreshkaZadacha(
        'Няма такова дело. Задачата виси на дело — инак не се вижда нито в таблицата, нито в диаграмата.',
      );
    }
    // Пресъздава се през домейна: така екранът и вносът минават през ЕДНА
    // проверка, вместо всеки да носи своята половина.
    // СТОПАНИНЪТ Е ВАЛИДЕН ПОЛУЧАТЕЛ · той също върши дела и също иска лист.
    // Той не е „служител" (не се вписва като такъв — той е ПЪРВОТО събитие в
    // Журнала, ADR-043), затова се добавя тук поименно, а не се крие в картата.
    const poluchateli = [...o.sluzhiteli.keys()];
    if (o.stopanin !== '') poluchateli.push(o.stopanin);
    const proveren = napraviIzprashtane(danni, poluchateli);
    return this.#pusni(
      'ЗадачаИзпратена',
      VID.zadachaKamChovek,
      `ZADACHA:${proveren.zadachaId}`,
      proveren,
      z,
    );
  }

  /**
   * ОТГОВАРЯ на задача · приема я или я отказва.
   *
   * Пише се в СВОЯТА верига (ADR-055): служителят отговаря от своя Журнал, със
   * своя `actor`. Затова тук НЕ се проверява „ти ли си получателят" — веригата
   * го казва по-силно от всяка проверка: чуждият отговор просто не е в неговата
   * книга, а Огледалото чете всички вериги и вижда кой какво е написал.
   *
   * Задачата обаче трябва да СЪЩЕСТВУВА: отговор на нищо е ехо.
   */
  async otgovoriNaZadacha(danni: PayloadOtgovorNaZadacha, z: Zayavka): Promise<Rezultat> {
    const o = await this.ogledalo();
    if (!o.izprateniZadachi.has(danni.zadachaId)) {
      throw new GreshkaZadacha('Няма такава задача — отговор на нищо не се записва.');
    }
    const proveren = napraviOtgovor(danni);
    return this.#pusni(
      'ОтговорНаЗадача',
      VID.zadachaKamChovek,
      `OTGOVOR:${proveren.zadachaId}`,
      proveren,
      z,
    );
  }

  /**
   * Записва ТАБ · ПОПРАВКА на съществуващ или запис на вече проверен нов.
   *
   * Последният запис за ключа надделява — това е поправка, не втори таб.
   * Създаването минава през `sazdayTab`, за да не може ново празно име да
   * върне стар таб празен (дефект, намерен при голямата сверка).
   */
  async zapishiTab(danni: PayloadTabZapisan, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ТабЗаписан', VID.tab, `TAB:${danni.klyuch}`, danni, z);
  }

  /**
   * СЪЗДАВА нов таб · и ОТКАЗВА, ако ключът е зает.
   *
   * Проверката стои ТУК, не на екрана — по образеца на `zapishiAgent`: вторият
   * екран, който създаде таб, няма да знае, че съществува (правило 2 по дух).
   */
  async sazdayTab(danni: PayloadTabZapisan, z: Zayavka): Promise<Rezultat> {
    proveriNovTab(danni, (await this.ogledalo()).tabove);
    return this.zapishiTab(danni, z);
  }

  /**
   * Записва АГЕНТ · картата и протоколът му (И92 т.10 · правило 18).
   *
   * НЕ иска отключен период: протоколът не мени нито едно число. Записва го
   * човек — агентът няма достъп до Вратата и не може да си пише протокола.
   */
  async zapishiAgent(danni: PayloadAgentZapisan, z: Zayavka): Promise<Rezultat> {
    // ВРАТАТА НА ПРОМЯНАТА (И94 т.6): протоколът е непроменим след
    // създаване. Проверката стои ТУК, не на екрана — иначе вторият екран,
    // който запише агент, ще я заобиколи, без да знае, че съществува.
    const star = (await this.ogledalo()).agenti.get(danni.klyuch);
    if (star) proveriPromyanata(star, danni);
    return this.#pusni('АгентЗаписан', VID.agent, `AGENT:${danni.klyuch}`, danni, z);
  }

  /**
   * Записва ПРЕДЛОЖЕНИЕ или присъдата върху него · последното бие.
   *
   * `actor` е човекът (правило 18): екранът не казва „агентът записа с мое
   * позволение", а „аз записвам". Заключеният период важи и тук — предложение
   * за замразен месец минава по пътя на сверената промяна (правило 9).
   */
  async zapishiPredlozhenie(danni: PayloadPredlozhenieZapisano, z: Zayavka): Promise<Rezultat> {
    return this.#pusni('ПредложениеЗаписано', VID.predlozhenie, danni.id, danni, z);
  }

  /**
   * Записва ЗАДАЧА на агент · възлагане, потвърждаване, превключване (И94 т.1).
   *
   * ВРАТАТА НА ЗАДАЧАТА: задача на ЗАКРИТ агент се отказва тук, не на екрана.
   * Закритият е следа (И94 т.6) — работа не приема. Проверката стои при
   * Вратата по същата причина като при протокола: втори екран, който възлага
   * задача, ще я заобиколи, без да знае, че съществува.
   *
   * Не иска отключен период: задачата не мени нито едно число. Кога и какво
   * ще предложи агентът е решение за напред, не запис за минал месец.
   */
  async zapishiZadacha(danni: PayloadZadachaZapisana, z: Zayavka): Promise<Rezultat> {
    const agent = (await this.ogledalo()).agenti.get(danni.agent);
    if (agent?.sastoyanie === 'zakrit') {
      throw new GreshkaAgent(
        `„${agent.ime}" е ЗАКРИТ — закритият агент не приема задачи. Направи нов.`,
      );
    }
    return this.#pusni('ЗадачаЗаписана', VID.zadacha, danni.id, danni, z);
  }

  /**
   * ПОВТАРЯ ПОПРАВЕНО СЪБИТИЕ · втората половина на сверената промяна (И96 т.8).
   *
   * Тесен нарочно: НЕ приема вид, същност и тип отвън — те се ПРЕПИСВАТ от
   * събитието, което се поправя. Иначе това щеше да е „запиши каквото си
   * искаш", а такъв път заобикаля всяка проверка, която другите действия
   * правят (падеж, замразен период, закрит агент).
   *
   * Иска `svereno`: това е ПЪТЯТ НА СВЕРЕНАТА ПРОМЯНА от правило 9, не
   * обикновено писане. Върви само след сторно на стария запис — първо се
   * гаси, после се записва наново.
   */
  async povtoriPopraveno(
    staro: Sabitie,
    payload: Readonly<Record<string, unknown>>,
    z: Zayavka,
  ): Promise<Rezultat> {
    if (z.svereno !== true) {
      throw new GreshkaTablitsa(
        'Повторният запис е част от СВЕРЕНА промяна и не се прави поотделно. ' +
          'Мине ли без сверката, той става втори вход към Журнала (правило 2).',
      );
    }
    return this.#pusni(
      staro.type as TipSabitie,
      staro.sashtnost.vid as Vid,
      staro.sashtnost.id,
      payload,
      z,
    );
  }

  /**
   * Записва СВРЪЗКА · третият номер, който залепва файл за файл (И96 т.8).
   *
   * Негово: „Няма редакция, а НОВ ФАЙЛ ЗАЛЕПЕН ЗА СТАРИЯ **в журнала**."
   * Затова свръзката е събитие, а не таблица встрани: свръзка извън Журнала не
   * може да се докаже след година (правило 17).
   *
   * СЛУЧАЯТ Е ЗАДЪЛЖИТЕЛЕН. „Да се отчете в Журнала за случая на промяна" е
   * негово изречение; свръзка без причина е следа, която не обяснява нищо —
   * същото правило като при сторното (И97: „защо — свободен текст, задължителен").
   *
   * Не иска отключен период: свръзката НЕ мени число. Числата се менят от
   * сторното и новия запис, всяко със своя път през Вратата.
   */
  async zapishiSvrazka(danni: PayloadSvrazkaZapisana, z: Zayavka): Promise<Rezultat> {
    if (danni.sluchay.trim() === '') {
      throw new GreshkaTablitsa(
        'Свръзка без СЛУЧАЙ на промяна не се записва — следа, която не обяснява нищо, ' +
          'е по-лоша от липсваща.',
      );
    }
    // Ключът е номер И файл: всяко залепване е свой запис, не презапис на
    // предишния. Иначе „кога дойде третият файл" би останало без отговор.
    return this.#pusni(
      'СвръзкаЗаписана',
      VID.svrazka,
      `${danni.nomer}:${danni.fayl}`,
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
    /**
     * СТОРНО ПРЕЗ ГРАНИЦА · жертвата се търси в КНИГАТА, не само в моята
     * верига (ADR-055 · резен 5).
     *
     * Двата пазача по-долу имат смисъл чак сега и се крепят на това четене:
     *
     *  1. ЖЕРТВАТА ТРЯБВА ДА Я ИМА. Дотук липсващата жертва просто не намираше
     *     нищо и сторното минаваше — при един писач това беше почти невъзможно
     *     (своя `seq` се знае), но погасяване на ЧУЖДА верига се пише по номер,
     *     който човек може да сбърка. Сторно, което не гаси нищо, е запис,
     *     изглеждащ като поправка, и после никой не намира какво е поправял.
     *  2. ЗАМРАЗЕНИЯТ ПЕРИОД се пита срещу СГЪНАТОТО Огледало. Жертва в чужда
     *     верига има свой период; четена само от моята, тя не се намираше и
     *     проверката се прескачаше цяла — тоест сторно в заключен месец
     *     минаваше, стига жертвата да е на другия.
     */
    const kade = danni.pogasyavaVeriga ?? this.#naematel;
    const zhertva = (await this.#dnevnik.chetiVsichki(kade)).find(
      (s) => s.seq === danni.pogasyavaSeq,
    );
    if (!zhertva) {
      throw new GreshkaStorno(
        `Сторното сочи звено „${kade}#${danni.pogasyavaSeq}", което го няма. ` +
          'Погасяване без жертва не поправя нищо, а изглежда като поправка.',
      );
    }
    const period = periodNaSabitie(zhertva);
    if (period !== '') proveriZamrazen(await this.ogledalo(), period, z.svereno);
    return this.#pusni('Сторно', vid, id, danni, z);
  }

  /**
   * Огледалото: изчислява се от Журнала при всяко поискване, не се пази.
   *
   * При книга с няколко вериги входът е СГЪНАТИЯТ поток — иначе замразеният
   * период, салдата и правата биха се смятали само от своята половина.
   */
  async ogledalo(): Promise<Ogledalo> {
    if (this.#kniga === undefined) {
      return fold(await this.#dnevnik.chetiVsichki(this.#naematel));
    }
    return fold((await prochetiKnigata(this.#dnevnik, this.#kniga, this.#chasovnik())).potok);
  }

  /**
   * Суровите събития на ТАЗИ ВЕРИГА — за проверки, износ и вратаря на сторното.
   *
   * НЕ се разширява до книгата, дори когато тя има няколко вериги: хеш-веригата
   * се проверява поотделно за всяка (`proveriVerigata` тръгва от `seq 1`), а
   * износът е файл НА ПИСАЧ. Слят файл би имал `seq`, повтарящ се по веднъж на
   * верига — тоест нищо, което да се провери.
   */
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

/**
 * ПАДЕЖЪТ Е ДЕН ОТ МЕСЕЦА · 1..31, цяло (находка на сверката).
 *
 * Дотук нищо не го пазеше: екранната форма имаше min/max, но внос, миграция
 * или чужд вход можеха да запишат 0, 42 или 2.5 — и `padezhZaPerioda` щеше да
 * ги преглътне с Math.min/Math.max, раждайки падеж, който никой не е искал.
 * Границата е при записа, с думи — не при смятането, мълчешком.
 */
/**
 * СТОРНО БЕЗ ЖЕРТВА · своя грешка, за да се различи от отказа за замразен
 * период. Двете идват от един и същ бутон и с общо име човек не би разбрал
 * дали да отключи месеца, или да поправи номера.
 */
class GreshkaStorno extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaStorno';
  }
}

class GreshkaNaem extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaNaem';
  }
}

function proveriPadezhDen(den: number): void {
  if (!Number.isInteger(den) || den < 1 || den > 31) {
    throw new GreshkaNaem(`Падежът е ден от месеца, 1 до 31 — получено: ${den}.`);
  }
}

/**
 * СУМА, КОЯТО НАИСТИНА МЕСТИ ПАРИ · строго над нулата.
 *
 * ═══ ЗАЩО ПОИМЕННО, А НЕ ВЪРХУ ВСЯКО `_st` ═══
 *
 * Вратата пази, че всяко поле на `_st` е ЦЕЛИ стотинки (правило 3) — но нулата
 * е цяло число и минава, а отрицателното също. За повечето суми това е ВЯРНО и
 * общ пазач щеше да отхвърли точно верните случаи:
 *
 *   · **салдото** може да е отрицателно — овърдрафтът е дълг, не грешка;
 *   · **сборът на колона** може да е отрицателен: знакът решава Приходи срещу
 *     Разходи (правило 20);
 *   · **декларираният ДДС** може да е нула (месец без обороти) и отрицателен
 *     (данък за възстановяване);
 *   · **разликата в сверка** е нула точно когато всичко е наред (правило 7);
 *   · **депозитът** е нула при договор без депозит.
 *
 * Затова пазачът се вика ПОИМЕННО, там където нулата няма смисъл: плащане за
 * нула не е плащане, начисление за нула не е задължение, разход за нула не е
 * разход.
 *
 * ═══ ЗАЩО ТУК, А НЕ САМО ВЪВ ФОРМАТА ═══
 *
 * Формите вече отказват ≤ 0 (`SUMATA_NAD_NULA`), но формата е ЕДИН вход.
 * Прочетена таблица, върнат архив и действие, писано утре, не минават през нея.
 * Правило 2 казва, че Вратата е единственият вход — значи и проверката живее по
 * пътя към нея, не пред екрана.
 *
 * Платено с находка: `platiDDS` нямаше нито пазач, нито форма, която да го
 * пази — нулев ДДС-превод влизаше в Журнала и събаряше ЦЕЛИЯ екран Сметки,
 * защото Главната книга не може да направи двустранна статия от нула.
 */
function proveriDvizhi(suma_st: number, koe: string): void {
  if (!Number.isSafeInteger(suma_st) || suma_st <= 0) {
    throw new GreshkaVhod(
      `${koe}: ${SUMATA_NAD_NULA} Получено: ${String(suma_st)}.`,
    );
  }
}
