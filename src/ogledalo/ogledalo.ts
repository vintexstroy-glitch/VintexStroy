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

import type { Sabitie } from '../yadro/index.js';
import { SEKTOR_PO_PODRAZBIRANE } from '../domein/dds.js';
import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { Buton } from '../domein/butoni.js';
import type { PravaZaModel } from '../domein/kolonno.js';
import type { Delo } from '../domein/dela.js';
import type {
  PayloadDeloZapisano,
  PayloadSluzhitelZapisan,
  PayloadPotokZapisan,
  PayloadSaldoZapisano,
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
  PayloadSverkaZapisana,
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
export function fold(sabitiya: readonly Sabitie[]): Ogledalo {
  const pogaseni = new Set<number>();
  for (const s of sabitiya) {
    if (s.type === 'Сторно') {
      const p = s.payload as unknown as PayloadStorno;
      pogaseni.add(p.pogasyavaSeq);
      pogaseni.add(s.seq);
    }
  }

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
  const prava = new Map<string, PravaZaModel>();
  const pototsi = new Map<string, PayloadPotokZapisan>();
  const salda = new Map<string, PayloadSaldoZapisano>();
  const dela = new Map<string, Delo>();
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
        sluzhiteli.set(p.imeyl, p);
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
        prava.set(`${p.imeyl}|${p.model}`, p);
        break;
      }


      case 'СверкаЗаписана': {
        const p = s.payload as unknown as PayloadSverkaZapisana;
        sverki.push({ ...p, seq: s.seq, kogato: s.ts });
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
          naemi.set(naem.id, {
            ...naem,
            naemetel: p.naemetel,
            telefon: p.telefon ?? '',
            imeyl: p.imeyl ?? '',
            naem_st: p.naem_st,
            padezhDen: p.padezhDen,
            ot: p.ot,
            do: p.do,
            depozit_st: p.depozit_st,
            sektor: p.sektor ?? SEKTOR_PO_PODRAZBIRANE,
          });
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
