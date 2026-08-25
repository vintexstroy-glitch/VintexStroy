/**
 * ОГЛЕДАЛОТО — производно състояние.
 *
 * Не се съхранява. Изчислява се от Журнала при всяко поискване:
 *   състояние = fold(събития, приложи)
 *
 * Правилото, за което се плати скъпо: „текущо състояние" е АГРЕГАТ на всички
 * събития за същността, не последният ред (Архитектурен документ §2).
 *
 * Сторното се самопогасява: събитие, което е сторнирано, не се прилага —
 * и самото сторно не се прилага. Нищо не се трие; просто не се брои.
 */

import {
  nastroykiPoPodrazbirane,
  sPromenenaNastroyka,
  type NastroykiNaVhoda,
  type Sila,
  type VidProblem,
} from '../domein/vhodni-problemi.js';
import type { Sabitie } from '../yadro/index.js';
import { chetiRolya } from '../yadro/samolichnost.js';
import { SEKTOR_PO_PODRAZBIRANE } from '../domein/dds.js';
import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { Buton } from '../domein/butoni.js';
import type { PravaZaModel } from '../domein/kolonno.js';
import { klyuchNaPravo } from '../domein/kolonno.js';
import type { Delo } from '../domein/dela.js';
import type { Agent, Predlozhenie } from '../domein/agenti.js';
import type { Tab } from '../domein/tabove.js';
import type { Zadacha } from '../domein/zadachi.js';
import type { FaylVSvrazka, Svrazka } from '../domein/zhurnal-ot-tablitsa.js';
import type { LichenDostap } from '../domein/lichen-dostap.js';
import type { LichenKredit, LichnaTema, LichnoDvizhenie } from '../domein/lichni-pari.js';
import type {
  PayloadDeloZapisano,
  PayloadSluzhitelZapisan,
  PayloadPotokZapisan,
  PayloadSaldoZapisano,
  TipSabitie,
} from '../domein/sabitiya.js';
import type {
  PayloadImotDobaven,
  PayloadImotPopraven,
  PayloadNaemDobaven,
  PayloadNaemPopraven,
  PayloadNaemPrekraten,
  PayloadPlashtanePrieto,
  PayloadDDSPlateno,
  PayloadRazhodZapisan,
  PayloadButonZapisan,
  PayloadModelZapisan,
  PayloadSpravkaPodadena,
  PayloadParametarNaVhodaZapisan,
  PayloadStopaninSmenen,
  PayloadStopaninZapisan,
  PayloadZapasenKontaktZapisan,
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
  PayloadStorno,
  PayloadVzemaneNachisleno,
} from '../domein/sabitiya.js';

export interface Imot {
  readonly id: string;
  /** seq на събитието, което го създаде — сторното сочи именно него */
  readonly seq: number;
  readonly adres: string;
  readonly edinitsa: string;
  readonly ploshtad_kvsm: number;
}

export interface Naem {
  readonly id: string;
  /** seq на „НаемДобавен“ — не се мени от поправки */
  readonly seq: number;
  readonly imotId: string;
  readonly naemetel: string;
  /** телефон за връзка · празно, когато не е записан */
  readonly telefon: string;
  /** имейл за връзка · празно значи, че писмо не може да тръгне */
  readonly imeyl: string;
  readonly naem_st: number;
  readonly padezhDen: number;
  readonly ot: string;
  readonly do: string;
  readonly depozit_st: number;
  /** ключ на акумулатор за ДДС — виж `src/domein/dds.ts` */
  readonly sektor: string;
  readonly prekraten: boolean;
  readonly kraj?: string;
}

export type SastoyanieVzemane = 'отворено' | 'частично' | 'затворено' | 'надплатено';

export interface Vzemane {
  readonly id: string;
  readonly seq: number;
  readonly naemId: string;
  readonly period: string;
  readonly osnovanie: string;
  readonly nachisleno_st: number;
  readonly pogaseno_st: number;
  readonly ostatak_st: number;
  readonly padezh: string;
  readonly sastoyanie: SastoyanieVzemane;
}

export interface Plashtane {
  readonly id: string;
  /** seq на събитието — сторното сочи именно него */
  readonly seq: number;
  readonly vzemaneId: string;
  readonly suma_st: number;
  readonly nachin: string;
  readonly data: string;
}

/** Един разход — другата страна на ДДС-то. */
export interface Razhod {
  readonly id: string;
  readonly seq: number;
  readonly potok: string;
  readonly dostavchik: string;
  readonly opis: string;
  /** обща цена с ДДС — не се разделя тук */
  readonly suma_st: number;
  readonly sektor: string;
  readonly nachin: string;
  readonly data: string;
  readonly dokument: string;
  /**
   * Ставката, с която ДДС-то се изважда ОТ ТОЗИ РЕД.
   * Липсва при записите отпреди резен 12 — тогава важи ставката на сектора.
   */
  readonly stavka?: number;
  /** ключ от източник; празно за ръчно въведен */
  readonly klyuch: string;
  /** кой файл и коя негова версия го донесе */
  readonly izvor: string;
}

/** Подадената ДДС-справка — ключалката на периода. */
export interface Spravka {
  readonly period: string;
  readonly seq: number;
  /** каквото реално е декларирано — на ръка, не преизчислено */
  readonly deklarirano_st: number;
  readonly data: string;
  readonly belezhka: string;
}

/** Едно внасяне на ДДС — от платежното, на ръка. */
export interface PlashtaneDDS {
  readonly id: string;
  readonly seq: number;
  readonly period: string;
  readonly suma_st: number;
  readonly data: string;
  readonly nachin: string;
}

/** Една сверка, както живее в Журнала: числата плюс кога и кой seq. */
export interface ZapisanaSverka {
  readonly seq: number;
  readonly kogato: string;
  readonly buton: string;
  readonly period: string;
  readonly vhod_st: number;
  readonly izhod_st: number;
  readonly razlika_st: number;
  readonly izvori: readonly string[];
  readonly propusnati: number;
}

export interface Ogledalo {
  /**
   * СТОПАНИНЪТ · главният имейл на този Журнал (И97 т.5 · т.8 · ADR-043).
   *
   * Празен низ значи Журнал от преди резена, който още не си е дописал
   * Стопанина — и това е ВИДИМО състояние, не мълчание: екранът го казва и
   * предлага дописването на онзи, който има право на него.
   */
  readonly stopanin: string;
  /**
   * ЗАПАСНИЯТ КОНТАКТ · пазителят на връщането (И100 · ADR-044).
   *
   * `null` значи „няма вписан" — и това е ВИДИМО състояние, не мълчание:
   * Журнал без запасен контакт няма път назад, и екранът го казва, вместо да
   * го открие в деня, в който главният имейл вече го няма.
   */
  readonly zapasenKontakt: PayloadZapasenKontaktZapisan | null;
  /**
   * ПАРАМЕТРИТЕ ПРИ ВЪВЕЖДАНЕ · настроени за ТОЗИ бизнес (И96 т.1 · ADR-046).
   *
   * Винаги пълна карта: почва от подразбирането и се пренаписва вид по вид.
   * Празна тя никога не е — липсващият параметър значи „както казва занаятът",
   * а не „няма проверка".
   */
  readonly parametriNaVhoda: NastroykiNaVhoda;
  readonly imoti: ReadonlyMap<string, Imot>;
  readonly naemi: ReadonlyMap<string, Naem>;
  readonly vzemaniya: ReadonlyMap<string, Vzemane>;
  readonly plashtaniya: ReadonlyMap<string, Plashtane>;
  readonly razhodi: ReadonlyMap<string, Razhod>;
  /** период → живата справка; има я = периодът е заключен */
  readonly spravki: ReadonlyMap<string, Spravka>;
  readonly platenoDDS: ReadonlyMap<string, PlashtaneDDS>;
  /** име на модела → картата на хедъра; вж. `src/iztochnik/model.ts` */
  readonly modeli: ReadonlyMap<string, ModelNaTablitsa>;
  /** име на бутона → моделът на пътя; вж. `src/domein/butoni.ts` */
  readonly butoni: ReadonlyMap<string, Buton>;
  /** имейл → служителят с ролята му; вж. `src/domein/sluzhiteli.ts` */
  readonly sluzhiteli: ReadonlyMap<string, PayloadSluzhitelZapisan>;
  /**
   * „<имейл>|<модел>" → скритите за него колони в този хедър.
   *
   * Ключът е двоен, защото правото важи за ДВОЙКА: един човек в един хедър.
   * Вж. `src/domein/kolonno.ts`.
   */
  readonly prava: ReadonlyMap<string, PravaZaModel>;
  /**
   * „<модел>|<колона>|<период>" → сборът, изпратен към Приходи или Разходи.
   *
   * Ключът е ТРОЕН, защото редът е един за двойка колона·месец: повторното
   * изпращане ПОПРАВЯ същия ред, вместо да ражда втори. Вж. `src/domein/potok.ts`.
   */
  readonly pototsi: ReadonlyMap<string, PayloadPotokZapisan>;
  /**
   * „banka" · „trezor" → началното салдо на джоба.
   *
   * Ръчно начало; движенията се четат от плащанията и разходите и НЕ се
   * дублират тук. Повторен запис ПОПРАВЯ джоба, не ражда втори.
   */
  readonly salda: ReadonlyMap<string, PayloadSaldoZapisano>;
  /** id → делото; последният запис за същия id е ПОПРАВКА, не втори ред */
  readonly dela: ReadonlyMap<string, Delo>;
  /** ключ → табът със секциите му; последният запис ПОПРАВЯ (И92 т.9) */
  readonly tabove: ReadonlyMap<string, Tab>;
  /** ключ → агентът с протокола му; последният запис ПОПРАВЯ (И92 т.10) */
  readonly agenti: ReadonlyMap<string, Agent>;
  /**
   * id → предложението и присъдата му.
   *
   * Отделен „лог на агента" извън Журнала не се строи — той би станал втори
   * носител на истина. Тук е Огледало на събитията, както навсякъде.
   */
  readonly predlozheniya: ReadonlyMap<string, Predlozhenie>;
  /**
   * id → задачата с разписанието ѝ (И94 т.1).
   *
   * Отделна от агента нарочно: протоколът е непроменим след създаване
   * (И94 т.6), а задачите се възлагат и превключват всеки ден.
   */
  readonly zadachi: ReadonlyMap<string, Zadacha>;
  /**
   * СВРЪЗКИТЕ · третият номер, който залепва изнесения файл за върнатия
   * (И96 т.8). Ключът е номерът на свръзката, изписан.
   *
   * Номерът НЕ е `seq` и не се мери с него — той е „извън графата на нормалния
   * ред". Поколението расте с всяко залепване; номерът стои.
   */
  readonly svrazki: ReadonlyMap<number, Svrazka>;
  /**
   * ПРЕХВЪРЛЕНИТЕ дела (И98) · id → следата на преноса.
   *
   * Делото го НЯМА в `dela` — то живее в другия Журнал. Тук стои следата:
   * накъде е отишло и с кой пренос. Двойна служба: екранът обяснява празното
   * място, а `zapishiDelo` и вносът от МД знаят какво да НЕ създават наново.
   * Върне ли се делото (обратен пренос → ново `ДелоЗаписано`), следата пада.
   */
  readonly prehvarleni: ReadonlyMap<string, PayloadDeloPrehvarleno>;
  /** разписките на преносите · prenosId+посока → разписката (правило 7) */
  readonly prenosi: ReadonlyMap<string, PayloadPrenosOtcheten>;
  /**
   * ЛИЧНОТО · включено ли е (И98). Смисъл има само в ЛИЧЕН Журнал: пита се
   * от последното `ЛичноПревключено`; празният Журнал е „не е активирано".
   */
  readonly lichnoVklyucheno: boolean;
  /**
   * МЯСТОТО в личния драйв, с което личното е активирано (И99).
   * Празно значи „активирано преди това поле" — старият запис си е валиден.
   */
  readonly lichnoMyasto: string;
  /**
   * КОЙ Е ДОПУСНАТ до личното · споделянето в обратната посока (И99).
   * Ключът е имейлът; отнетите СТОЯТ в картата с `otnet: true` (правило 1).
   */
  readonly lichniDostapi: ReadonlyMap<string, LichenDostap>;
  /**
   * ЛИЧНИТЕ ПАРИ (И96 т.10) · три карти, всичките празни в служебен Журнал.
   *
   * `temaId` → темата; спрените ОСТАВАТ в картата с `spryana: true`, защото
   * редовете, които вече ги носят, не се пипат (И97 т.12).
   */
  readonly lichniTemi: ReadonlyMap<string, LichnaTema>;
  /** `dvizhenieId` → движението · последният запис за същия id е ПОПРАВКА */
  readonly lichniDvizheniya: ReadonlyMap<string, LichnoDvizhenie>;
  /** `kreditId` → кредитът · остатъкът НЕ е тук, той се смята */
  readonly lichniKrediti: ReadonlyMap<string, LichenKredit>;
  /** разписките на партидите от извлечение · `partidaId` → разписката */
  readonly lichniPartidi: ReadonlyMap<string, PayloadLichnoIzvlechenieprieto>;
  /** записаните сверки, най-новата последна — включително нулевите */
  readonly sverki: readonly ZapisanaSverka[];
  /** колко събития са влезли в състоянието */
  readonly prilozheni: number;
  /** seq-овете, които сторно е погасило (и самите сторна) */
  readonly pogaseni: ReadonlySet<number>;
}

/**
 * Изгражда Огледалото от подредена по seq редица събития.
 * Две минавания: първо кои seq са погасени, после кои се прилагат.
 */
/**
 * ПОЛЕТАТА, КОИТО ДВЕТЕ СЪБИТИЯ ЗА НАЕМ НОСЯТ ЕДНАКВО.
 *
 * „НаемДобавен" и „НаемПоправен" пишат едни и същи полета с едни и същи
 * ПАДАНИЯ за стар Журнал. Написани поотделно, те се разминават при първото
 * ново поле: добавянето го получава, поправката мълчи — и наемът тихо губи
 * стойност всеки път, щом някой му поправи телефона.
 *
 * Отвън остават САМО разликите: добавянето слага `id`, `seq`, `imotId` и
 * `prekraten: false`; поправката не ги пипа — прекратяването си има свое
 * събитие.
 */
function poletataNaNaema(p: PayloadNaemDobaven | PayloadNaemPopraven) {
  return {
    naemetel: p.naemetel,
    // Наем, записан преди контактите, ги няма — празно, не „липсва".
    telefon: p.telefon ?? '',
    imeyl: p.imeyl ?? '',
    naem_st: p.naem_st,
    padezhDen: p.padezhDen,
    ot: p.ot,
    do: p.do,
    depozit_st: p.depozit_st,
    // Наем, записан преди резен 4, няма сектор — пада към жилищен.
    sektor: p.sektor ?? SEKTOR_PO_PODRAZBIRANE,
  };
}

export function fold(sabitiya: readonly Sabitie[]): Ogledalo {
  const pogaseni = new Set<number>();
  for (const s of sabitiya) {
    if (s.type === 'Сторно') {
      const p = s.payload as unknown as PayloadStorno;
      pogaseni.add(p.pogasyavaSeq);
      pogaseni.add(s.seq);
    }
  }

  /**
   * СТОРНИРАНОТО ДЕЛО НЕ СЕ ВЪЗКРЕСЯВА ОТ СОБСТВЕНАТА СИ ПОПРАВКА.
   *
   * Делото няма отделно събитие „Поправено": и създаването, и поправката са
   * `ДелоЗаписано` върху същия id. Затова сторното на СЪЗДАВАНЕТО гасеше само
   * неговия seq — а поправката после пак викаше `dela.set(id, …)` и делото
   * СЕ ВРЪЩАШЕ, с чуждия seq на поправката.
   *
   * Имотът и наемът нямат тази дупка: там поправката е СВОЕ събитие и пази
   * `if (imot)` — „поправка на несъществуващ имот не създава имот от нищото".
   * Делото няма къде да провери същото, затова се брои тук, преди цикъла.
   *
   * ПЪРВОТО `ДелоЗаписано` за един id е СЪЗДАВАНЕТО; погасне ли то, делото не
   * се брои — каквото и да пише след него.
   */
  const storniranite = (tip: TipSabitie): ReadonlySet<string> => {
    const sazdadenoNaSeq = new Map<string, number>();
    for (const s of sabitiya) {
      if (s.type === tip && !sazdadenoNaSeq.has(s.sashtnost.id)) {
        sazdadenoNaSeq.set(s.sashtnost.id, s.seq);
      }
    }
    const mrtvi = new Set<string>();
    for (const [id, seq] of sazdadenoNaSeq) {
      if (pogaseni.has(seq)) mrtvi.add(id);
    }
    return mrtvi;
  };

  const stornirianiDela = storniranite('ДелоЗаписано');
  /**
   * Същата дупка, същото лечение · личното движение (И96 т.10).
   *
   * И то няма отделно събитие „Поправено": поправката е пак
   * `ЛичноДвижениеЗаписано` върху същия id. Не се преписва разсъждението, а се
   * ВИКА същата функция — правило 17 важи и за логиката, не само за числата.
   */
  const stornianiDvizheniya = storniranite('ЛичноДвижениеЗаписано');

  const imoti = new Map<string, Imot>();
  const naemi = new Map<string, Naem>();
  const vzemaniya = new Map<string, Vzemane>();
  const plashtaniya = new Map<string, Plashtane>();
  const razhodi = new Map<string, Razhod>();
  const spravki = new Map<string, Spravka>();
  const platenoDDS = new Map<string, PlashtaneDDS>();
  const modeli = new Map<string, ModelNaTablitsa>();
  const butoni = new Map<string, Buton>();
  const sluzhiteli = new Map<string, PayloadSluzhitelZapisan>();
  // ПЪРВИЯТ печели: втори „СтопанинЗаписан" Вратата не пуска, но Огледалото
  // не разчита на това — четенето остава вярно и върху пипнат отвън Журнал.
  let stopanin = '';
  let zapasenKontakt: PayloadZapasenKontaktZapisan | null = null;
  let parametriNaVhoda = nastroykiPoPodrazbirane();
  const prava = new Map<string, PravaZaModel>();
  const pototsi = new Map<string, PayloadPotokZapisan>();
  const salda = new Map<string, PayloadSaldoZapisano>();
  const dela = new Map<string, Delo>();
  const tabove = new Map<string, Tab>();
  const agenti = new Map<string, Agent>();
  const predlozheniya = new Map<string, Predlozhenie>();
  const zadachi = new Map<string, Zadacha>();
  const svrazki = new Map<number, Svrazka>();
  const prehvarleni = new Map<string, PayloadDeloPrehvarleno>();
  const prenosi = new Map<string, PayloadPrenosOtcheten>();
  let lichnoVklyucheno = false;
  let lichnoMyasto = '';
  const lichniDostapi = new Map<string, LichenDostap>();
  const lichniTemi = new Map<string, LichnaTema>();
  const lichniDvizheniya = new Map<string, LichnoDvizhenie>();
  const lichniKrediti = new Map<string, LichenKredit>();
  const lichniPartidi = new Map<string, PayloadLichnoIzvlechenieprieto>();
  const sverki: ZapisanaSverka[] = [];
  let prilozheni = 0;

  for (const s of sabitiya) {
    if (pogaseni.has(s.seq)) continue;
    prilozheni += 1;

    switch (s.type) {
      case 'ИмотДобавен': {
        const p = s.payload as unknown as PayloadImotDobaven;
        imoti.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          adres: p.adres,
          edinitsa: p.edinitsa,
          ploshtad_kvsm: p.ploshtad_kvsm,
        });
        break;
      }

      case 'НаемДобавен': {
        const p = s.payload as unknown as PayloadNaemDobaven;
        naemi.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          imotId: p.imotId,
          ...poletataNaNaema(p),
          prekraten: false,
        });
        break;
      }

      case 'РазходЗаписан': {
        const p = s.payload as unknown as PayloadRazhodZapisan;
        razhodi.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          potok: p.potok,
          dostavchik: p.dostavchik,
          opis: p.opis,
          suma_st: p.suma_st,
          sektor: p.sektor ?? SEKTOR_PO_PODRAZBIRANE,
          nachin: p.nachin,
          data: p.data,
          dokument: p.dokument,
          // `?? {}` не става: `stavka: undefined` не е същото като липсващо
          // поле при `exactOptionalPropertyTypes`.
          ...(p.stavka === undefined ? {} : { stavka: p.stavka }),
          klyuch: p.klyuch ?? '',
          izvor: p.izvor ?? '',
        });
        break;
      }

      case 'МоделЗаписан': {
        const p = s.payload as unknown as PayloadModelZapisan;
        // Последният запис за същото име надделява — поправка, не втори модел.
        // Моделите отпреди резен 13 нямат `izklyucheni`, отпреди резен 14 —
        // `zatvoreni` и `glavi`, отпреди резен 15 — номенклатурите на
        // Редактора. Падат към празно и към сведения отпечатък, вместо да
        // пукат при първото четене на стар Журнал.
        modeli.set(p.klyuch, {
          ...p,
          izklyucheni: p.izklyucheni ?? [],
          zatvoreni: p.zatvoreni ?? [],
          glavi: p.glavi ?? p.otpechatak.split('|'),
          menyuta: p.menyuta ?? {},
          otVavezhdane: p.otVavezhdane ?? [],
          zaklyucheni: p.zaklyucheni ?? [],
          predishni: p.predishni ?? [],
          // Моделите отпреди конструктора нямат формули — колоните им носят
          // данни. Празната карта е вярната им стойност, не липса.
          formuli: p.formuli ?? {},
          nomera: p.nomera ?? {},
        });
        break;
      }

      case 'ТабЗаписан': {
        // Последният запис за същия ключ надделява — поправка, не втори таб.
        const p = s.payload as unknown as Tab;
        tabove.set(p.klyuch, p);
        break;
      }

      case 'АгентЗаписан': {
        // Последният запис за същия ключ надделява — поправка, не втори агент.
        const p = s.payload as unknown as Agent;
        agenti.set(p.klyuch, p);
        break;
      }

      case 'ПредложениеЗаписано': {
        // Присъдата е СЪЩОТО събитие с ново съдържание: „чака" → „прието".
        const p = s.payload as unknown as Predlozhenie;
        predlozheniya.set(p.id, p);
        break;
      }

      case 'ЗадачаЗаписана': {
        // Потвърждаване и превключване са СЪЩОТО събитие с ново съдържание.
        const p = s.payload as unknown as Zadacha;
        zadachi.set(p.id, p);
        break;
      }

      case 'ДелоПрехвърлено': {
        // Делото ИЗЛИЗА от този Журнал: маха се от живите и остава следа.
        // Едно махане тук го гаси наведнъж от Управление, копието в Сметки,
        // диаграмата, секциите на конструктора и броя, който агентът чете —
        // всичките четат `dela`.
        const p = s.payload as unknown as PayloadDeloPrehvarleno;
        dela.delete(s.sashtnost.id);
        prehvarleni.set(s.sashtnost.id, p);
        break;
      }

      case 'ПреносОтчетен': {
        const p = s.payload as unknown as PayloadPrenosOtcheten;
        prenosi.set(`${p.prenosId}:${p.posoka}`, p);
        break;
      }

      case 'ЛичноПревключено': {
        const p = s.payload as unknown as PayloadLichnoPrevklyucheno;
        lichnoVklyucheno = p.vklyucheno; // последната дума бие
        // Мястото се пази и след прибиране: прибраното не е изтрито, а при
        // повторно пускане човекът не бива да го посочва наново.
        if (p.myasto) lichnoMyasto = p.myasto;
        break;
      }

      case 'ЛиченДостъпЗаписан': {
        const p = s.payload as unknown as PayloadLichenDostapZapisan;
        lichniDostapi.set(p.imeyl, {
          imeyl: p.imeyl,
          rolya: chetiRolya(p.rolya),
          kakvo: p.kakvo as LichenDostap['kakvo'],
          kakav: p.kakav as LichenDostap['kakav'],
          otnet: p.otnet,
        });
        break;
      }

      // ═══ ЛИЧНИТЕ ПАРИ (И96 т.10) ═══════════════════════════════════════
      case 'ЛичнаТемаЗаписана': {
        const p = s.payload as unknown as PayloadLichnaTemaZapisana;
        // Последният запис за същия номер ПОПРАВЯ — преименуване и спиране са
        // едно и също действие с различни полета. Спряната ОСТАВА в картата:
        // редовете, които вече я носят, трябва да могат да я покажат.
        lichniTemi.set(p.temaId, {
          temaId: p.temaId,
          ime: p.ime,
          grupa: p.grupa,
          spryana: p.spryana,
        });
        break;
      }

      case 'ЛичноДвижениеЗаписано': {
        const p = s.payload as unknown as PayloadLichnoDvizhenieZapisano;
        // Сторнираното движение не се връща от собствената си поправка —
        // същата дупка и същото лечение като при делото (ADR-036 §9).
        // Гаси се по СЪЩНОСТТА (`LDV:…`), а картата се ключира по ГОЛИЯ номер:
        // изключването и вноската сочат него, не украсения ключ на Журнала.
        if (stornianiDvizheniya.has(s.sashtnost.id)) break;
        const id = p.dvizhenieId;
        const staro = lichniDvizheniya.get(id);
        lichniDvizheniya.set(id, {
          dvizhenieId: id,
          data: p.data,
          posoka: p.posoka,
          suma_st: p.suma_st,
          temaId: p.temaId,
          koy: p.koy,
          opis: p.opis,
          dokument: p.dokument,
          klyuch: p.klyuch,
          izvor: p.izvor,
          kreditId: p.kreditId ?? '',
          glavnitsa_st: p.glavnitsa_st ?? 0,
          lihva_st: p.lihva_st ?? 0,
          taksa_st: p.taksa_st ?? 0,
          // ИЗКЛЮЧВАНЕТО ПРЕЖИВЯВА ПОПРАВКАТА. То е СВОЕ събитие и решение на
          // ЧОВЕК; повторният внос пренаписва реда от файла и би го изтрил,
          // ако се четеше оттук. Затова се носи от стария запис.
          izklyuchen: staro?.izklyuchen ?? false,
          prichina: staro?.prichina ?? '',
        });
        break;
      }

      case 'ЛиченРедИзключен': {
        const p = s.payload as unknown as PayloadLichenRedIzklyuchen;
        const d = lichniDvizheniya.get(p.dvizhenieId);
        // „Изключване на несъществуващ ред не създава ред от нищото" —
        // същият пазач като при поправката на имот.
        if (!d) break;
        lichniDvizheniya.set(p.dvizhenieId, {
          ...d,
          izklyuchen: p.izklyuchen,
          prichina: p.prichina,
        });
        break;
      }

      case 'ЛиченКредитЗаписан': {
        const p = s.payload as unknown as PayloadLichenKreditZapisan;
        lichniKrediti.set(p.kreditId, {
          kreditId: p.kreditId,
          ime: p.ime,
          vid: p.vid,
          ostatak_st: p.ostatak_st,
          ot: p.ot,
          lihva_bp: p.lihva_bp,
          vnoska_st: p.vnoska_st,
          den: p.den,
          temaId: p.temaId,
        });
        break;
      }

      case 'ЛичноИзвлечениеПрието': {
        const p = s.payload as unknown as PayloadLichnoIzvlechenieprieto;
        lichniPartidi.set(p.partidaId, p);
        break;
      }

      case 'СвръзкаЗаписана': {
        // Всяко залепване е СВОЙ запис със същия номер и порасналото поколение.
        // Огледалото ги събира: последният запис за един номер носи текущото
        // поколение, а файловете се трупат по реда, в който са дошли.
        const p = s.payload as unknown as PayloadSvrazkaZapisana;
        const bilo = svrazki.get(p.nomer);
        const fayl: FaylVSvrazka = {
          nomer: p.fayl,
          ime: p.ime,
          dataNaFayla: p.dataNaFayla,
          kogato: s.ts,
          actor: s.actor,
          sluchay: p.sluchay,
          redove: p.redove,
          otpechatak: p.otpechatak,
        };
        svrazki.set(p.nomer, {
          nomer: p.nomer,
          pokolenie: p.pokolenie,
          fayli: bilo ? [...bilo.fayli, fayl] : [fayl],
        });
        break;
      }

      case 'БутонЗаписан': {
        const p = s.payload as unknown as PayloadButonZapisan;
        butoni.set(p.klyuch, p);
        break;
      }

      case 'СлужителЗаписан': {
        const p = s.payload as unknown as PayloadSluzhitelZapisan;
        // Смяна на ролята е ново събитие върху същия човек — последното бие.
        // Ролята се ЧЕТЕ през моста: запис отпреди преименуването носи старата
        // дума, а Журналът не се преписва (правило 1).
        sluzhiteli.set(p.imeyl, { ...p, rolya: chetiRolya(p.rolya) });
        break;
      }

      case 'ПотокЗаписан': {
        const p = s.payload as unknown as PayloadPotokZapisan;
        // Последният запис за същата колона в същия месец надделява —
        // поправка, не втори ред.
        pototsi.set(`${p.model}|${p.kolona}|${p.period}`, p);
        break;
      }

      case 'ДелоЗаписано': {
        const p = s.payload as unknown as PayloadDeloZapisano;
        const id = s.sashtnost.id;
        // Сторнираното дело не се връща от поправка (виж горе).
        if (stornirianiDela.has(id)) break;
        // ВЪРНАТОТО дело (обратен пренос) сваля следата „прехвърлено":
        // делото пак е тук и празното място вече няма какво да обяснява.
        prehvarleni.delete(id);
        dela.set(id, {
          id,
          // seq-ът на СЪЗДАВАНЕТО не се мени от поправки — сторното сочи него
          seq: dela.get(id)?.seq ?? s.seq,
          myasto: p.myasto,
          obekt: p.obekt,
          ime: p.ime,
          otgovornik: p.otgovornik,
          ot: p.ot,
          do: p.do,
          otsenka: p.otsenka as Delo['otsenka'],
          sastoyanie: p.sastoyanie as Delo['sastoyanie'],
          nadDelo: p.nadDelo,
          dokument: p.dokument,
        });
        break;
      }

      case 'СалдоЗаписано': {
        const p = s.payload as unknown as PayloadSaldoZapisano;
        // Джобът е един; последният запис за него е поправка, не втори ред.
        salda.set(p.kade, p);
        break;
      }

      case 'ПравоЗаписано': {
        const p = s.payload as unknown as PravaZaModel;
        prava.set(klyuchNaPravo(p.imeyl, p.model), p);
        break;
      }


      case 'СверкаЗаписана': {
        const p = s.payload as unknown as PayloadSverkaZapisana;
        sverki.push({ ...p, seq: s.seq, kogato: s.ts });
        break;
      }

      case 'СтопанинЗаписан': {
        const p = s.payload as unknown as PayloadStopaninZapisan;
        if (stopanin === '') stopanin = p.imeyl;
        break;
      }

      /**
       * ПАРАМЕТЪРЪТ СЕ СЛИВА ПО ВИД, не подменя цялата карта: едно събитие
       * носи един вид, а останалите седем си остават каквито са били.
       */
      case 'ПараметърНаВходаЗаписан': {
        const p = s.payload as unknown as PayloadParametarNaVhodaZapisan;
        parametriNaVhoda = sPromenenaNastroyka(parametriNaVhoda, p.vid as VidProblem, {
          vklyuchen: p.vklyuchen,
          sila: p.sila as Sila,
          belezhka: p.belezhka,
        });
        break;
      }

      /**
       * ПОСЛЕДНИЯТ ВПИСАН печели · запасният контакт се СМЕНЯ, не се трупа.
       * Старите записи си остават в Журнала (правило 1) — просто вече не важат.
       */
      case 'ЗапасенКонтактЗаписан': {
        zapasenKontakt = s.payload as unknown as PayloadZapasenKontaktZapisan;
        break;
      }

      /**
       * СМЯНАТА ПРЕЗАПИСВА стопанина · за разлика от записването, където
       * ПЪРВИЯТ печели. Двете правила гледат едно и също нещо от двете му
       * страни: откриването става веднъж, връщането — колкото пъти потрябва.
       */
      case 'СтопанинСменен': {
        const p = s.payload as unknown as PayloadStopaninSmenen;
        stopanin = p.kam;
        break;
      }

      case 'СправкаПодадена': {
        const p = s.payload as unknown as PayloadSpravkaPodadena;
        spravki.set(p.period, {
          period: p.period,
          seq: s.seq,
          deklarirano_st: p.dds_deklarirano_st,
          data: p.data,
          belezhka: p.belezhka,
        });
        break;
      }

      case 'ДДСПлатено': {
        const p = s.payload as unknown as PayloadDDSPlateno;
        platenoDDS.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          period: p.period,
          suma_st: p.suma_st,
          data: p.data,
          nachin: p.nachin,
        });
        break;
      }

      case 'ИмотПоправен': {
        const p = s.payload as unknown as PayloadImotPopraven;
        const imot = imoti.get(p.imotId);
        // Поправка на несъществуващ имот не създава имот от нищото.
        if (imot) {
          imoti.set(imot.id, {
            ...imot,
            adres: p.adres,
            edinitsa: p.edinitsa,
            ploshtad_kvsm: p.ploshtad_kvsm,
          });
        }
        break;
      }

      case 'НаемПоправен': {
        const p = s.payload as unknown as PayloadNaemPopraven;
        const naem = naemi.get(p.naemId);
        if (naem) {
          // Прекратеността НЕ се пипа оттук — тя си има свое събитие.
          naemi.set(naem.id, { ...naem, ...poletataNaNaema(p) });
        }
        break;
      }

      case 'НаемПрекратен': {
        const p = s.payload as unknown as PayloadNaemPrekraten;
        const naem = naemi.get(p.naemId);
        if (naem) naemi.set(naem.id, { ...naem, prekraten: true, kraj: p.kraj });
        break;
      }

      case 'ВземанеНачислено': {
        const p = s.payload as unknown as PayloadVzemaneNachisleno;
        vzemaniya.set(
          s.sashtnost.id,
          presmetni({
            id: s.sashtnost.id,
            seq: s.seq,
            naemId: p.naemId,
            period: p.period,
            osnovanie: p.osnovanie,
            nachisleno_st: p.suma_st,
            pogaseno_st: 0,
            padezh: p.padezh,
          }),
        );
        break;
      }

      case 'ПлащанеПрието': {
        const p = s.payload as unknown as PayloadPlashtanePrieto;
        plashtaniya.set(s.sashtnost.id, {
          id: s.sashtnost.id,
          seq: s.seq,
          vzemaneId: p.vzemaneId,
          suma_st: p.suma_st,
          nachin: p.nachin,
          data: p.data,
        });
        const vzemane = vzemaniya.get(p.vzemaneId);
        if (vzemane) {
          vzemaniya.set(
            vzemane.id,
            presmetni({ ...vzemane, pogaseno_st: vzemane.pogaseno_st + p.suma_st }),
          );
        }
        break;
      }

      case 'ВалутаИзбрана':
        // ЗНАЕН тип, НАРОЧНО пренебрегнат — не „непознат".
        //
        // Старите Журнали носят това събитие; новите не го пишат (ADR-014:
        // валутата е ЕДНА, няма курс и живее в КОЛОНАТА, не в цифрата).
        // Формата му е `PayloadValutaIzbrana` в `sabitiya.ts` — типът стои
        // нарочно, за да е записано КАКВО има в един стар Журнал, макар нищо
        // от него да не ни трябва вече.
        // Затова тук няма какво да се приложи — но случаят стои поименно,
        // защото знаен тип, паднал в `default`, е неразличим от печатна грешка.
        break;

      default:
        // НЕПОЗНАТ тип не събаря Огледалото — брои се, но не мени нищо.
        //
        // Снизходителността тук е нарочна и е обратната страна на строгостта
        // при входа (`#pusni` иска `TipSabitie`): стар код трябва да може да
        // прочете по-нов Журнал. Махне ли се това, едно бъдещо събитие ще
        // събори Огледалото на всеки, който още не се е обновил.
        break;
    }
  }

  return {
    stopanin,
    zapasenKontakt,
    parametriNaVhoda,
    imoti,
    naemi,
    vzemaniya,
    plashtaniya,
    razhodi,
    spravki,
    platenoDDS,
    modeli,
    butoni,
    sluzhiteli,
    prava,
    pototsi,
    salda,
    dela,
    tabove,
    agenti,
    predlozheniya,
    zadachi,
    svrazki,
    prehvarleni,
    prenosi,
    lichnoVklyucheno,
    lichnoMyasto,
    lichniDostapi,
    lichniTemi,
    lichniDvizheniya,
    lichniKrediti,
    lichniPartidi,
    sverki,
    prilozheni,
    pogaseni,
  };
}

type BezPresmetnato = Omit<Vzemane, 'ostatak_st' | 'sastoyanie'>;

function presmetni(v: BezPresmetnato): Vzemane {
  const ostatak_st = v.nachisleno_st - v.pogaseno_st;
  let sastoyanie: SastoyanieVzemane;
  if (v.pogaseno_st === 0) sastoyanie = 'отворено';
  else if (ostatak_st > 0) sastoyanie = 'частично';
  else if (ostatak_st === 0) sastoyanie = 'затворено';
  else sastoyanie = 'надплатено';
  return { ...v, ostatak_st, sastoyanie };
}

/** Сборът, който трябва да затваря: начислено − погасено по всички вземания. */
export function duljimo(o: Ogledalo): number {
  let sbor = 0;
  for (const v of o.vzemaniya.values()) sbor += v.ostatak_st;
  return sbor;
}

/** Всичко събрано — сборът на непогасените плащания. */
export function sabrano(o: Ogledalo): number {
  let sbor = 0;
  for (const p of o.plashtaniya.values()) sbor += p.suma_st;
  return sbor;
}

export interface ProsrocheneVzemane extends Vzemane {
  readonly dniZakasnenie: number;
}

/**
 * Незатворените вземания с падеж преди `dnes`, най-закъснелите отгоре.
 * Датите са ISO низове — сравняват се лексикографски, без часови пояси.
 */
export function prosrocheni(o: Ogledalo, dnes: string): ProsrocheneVzemane[] {
  const den = dnes.slice(0, 10);
  return [...o.vzemaniya.values()]
    .filter((v) => v.ostatak_st > 0 && v.padezh < den)
    .map((v) => ({ ...v, dniZakasnenie: dniMezhdu(v.padezh, den) }))
    .sort((a, b) => b.dniZakasnenie - a.dniZakasnenie || a.id.localeCompare(b.id));
}

/** Остатъкът по наеми — карта naemId → дължимо в стотинки. */
export function duljimoPoNaem(o: Ogledalo): Map<string, number> {
  const karta = new Map<string, number>();
  for (const v of o.vzemaniya.values()) {
    if (v.ostatak_st === 0) continue;
    karta.set(v.naemId, (karta.get(v.naemId) ?? 0) + v.ostatak_st);
  }
  return karta;
}

/** Внесеното ДДС за един период — сбор на плащанията. */
export function platenoDDSZaPerioda(o: Ogledalo, period: string): number {
  let sbor = 0;
  for (const p of o.platenoDDS.values()) {
    if (p.period === period) sbor += p.suma_st;
  }
  return sbor;
}

/** Цели дни между две ISO дати. */
export function dniMezhdu(ot: string, doo: string): number {
  const a = Date.parse(`${ot.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${doo.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}
