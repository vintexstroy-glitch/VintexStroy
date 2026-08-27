/**
 * ГАНТЪТ · решетката с времеви колони.
 *
 * Негово определение, дословно *(р84·[28] · допълнено в [30] · 12.08)*:
 *
 *   „Гант = решетката с времеви колони (★ −60)"
 *
 * И моделът, който той избра *(р56·[6]·08.08)*: „**Да, направи като Сметки
 * (периодни колони)**" — *предложено, прието: ясни периодни колони, делото =
 * лента вътре в клетките по период.*
 *
 * ПЪРВАТА КОЛОНА Е ДНЕС. Негово „Да, точно така" *(р57·[134])* на
 * *предложението: първата колона е днес; скрол наляво показва историята.*
 * Затова решетката НЕ почва от началото на годината: тя почва от днес и се
 * връща назад само когато някой я върне.
 *
 * ЗАЩО НЯМА ВЛАЧЕНЕ. Негово, кратко и без условие *(р83·[35]·11.08)*:
 * „**не можеш да го направиш това забрана**". Срокът се мени от полето за срок,
 * не с мишка върху лента — и това е добре: влаченето прави тиха промяна на
 * дата, а всяка промяна на срок е събитие в Журнала.
 */

import type { Delo } from './dela.js';
import {
  koloniNaTakta,
  kolkoSeVizhdat,
  type KolonaNaTakta,
  type SvoyPeriod,
  type Takt,
} from './vreme.js';

/**
 * ТАКТЪТ ЖИВЕЕ В `vreme.ts` · тук се СТРОИ решетката от него.
 *
 * Дотук този файл беше единият от четирите дома на времето (`TAKTOVE` тук,
 * `STAPKI` при коефициентите, дванайсетте месеца при диаграмите, четирите думи
 * за давност при филтрите). Правило 17: един факт, един дом — и домът е
 * `vreme.ts`, защото Калкулаторът реже период със същите имена, а той няма
 * работа да внася от Ганта.
 */
export type { Takt } from './vreme.js';

/** Лентата на едно дело върху решетката. */
interface Lenta {
  readonly deloId: string;
  /** индекс на първата колона, която делото покрива */
  readonly ot: number;
  /** колко колони покрива · поне 1 */
  readonly broy: number;
  /** излиза ли делото извън решетката наляво — стрелка, не отрязване */
  readonly izlizaNalyavo: boolean;
  readonly izlizaNadyasno: boolean;
}

export interface Reshetka {
  readonly takt: Takt;
  readonly koloni: readonly KolonaNaTakta[];
  /** колко от тях се побират на екран — останалите са зад скрола */
  readonly vidimi: number;
  readonly lenti: readonly Lenta[];
}

/**
 * ЛЕНТАТА НА ЕДНО ДЕЛО · от коя колона до коя.
 *
 * Дело, което почва преди решетката или свършва след нея, НЕ се отрязва тихо:
 * лентата носи `izlizaNalyavo` / `izlizaNadyasno` и екранът рисува стрелка.
 * Отрязана лента без белег изглежда като дело, което свършва днес.
 *
 * Дело изцяло извън решетката не дава лента — то не е скрито, а просто не е в
 * този прозорец от време; таблицата отляво пак го показва.
 */
export function lentaNa(d: Delo, k: readonly KolonaNaTakta[]): Lenta | null {
  if (k.length === 0) return null;
  const parva = k[0]!;
  const posledna = k[k.length - 1]!;
  if (d.do < parva.ot || d.ot > posledna.do) return null;

  let ot = k.findIndex((x) => x.do >= d.ot);
  if (ot < 0) ot = 0;
  // КРАЯТ се търси ОТЗАД-НАПРЕД, не отпред. При такт „ден" осем колони носят
  // ЕДИН и същ ден (осемте му работни часа): търсено отпред, еднодневното дело
  // заемаше ПЪРВИЯ час и изглеждаше като „час работа", а то трае целия ден.
  let doIndeks = -1;
  for (let i = k.length - 1; i >= 0; i -= 1) {
    if (k[i]!.ot <= d.do) { doIndeks = i; break; }
  }
  if (doIndeks < ot) doIndeks = ot;

  return {
    deloId: d.id,
    ot,
    broy: Math.max(1, doIndeks - ot + 1),
    izlizaNalyavo: d.ot < parva.ot,
    izlizaNadyasno: d.do > posledna.do,
  };
}

/** Цялата решетка за едно множество дела. */
export function reshetka(
  dela: readonly Delo[],
  takt: Takt,
  dnes: string,
  svoy?: SvoyPeriod,
): Reshetka {
  const k = koloniNaTakta(takt, dnes, svoy);
  const lenti: Lenta[] = [];
  for (const d of dela) {
    const l = lentaNa(d, k);
    if (l) lenti.push(l);
  }
  return { takt, koloni: k, vidimi: kolkoSeVizhdat(takt, dnes, svoy), lenti };
}

/**
 * ОБОБЩЕНИЯТ РЕД · негово искане *(р52·[303]·08.08)*:
 *
 *   „добави в всяка таблица един обобщен ред на сумите за месеци в Гант, в
 *    зависимост от времевия такт."
 *
 * „в зависимост от времевия такт" е половината от изречението, която лесно се
 * губи: сумата се събира по КОЛОНА на решетката, каквато и да е тя — не по
 * календарен месец, когато тактът е седмица.
 *
 * Сумите идват отвън (`sumiZaDen` в `otcheti.ts`), защото Гантът не знае за
 * пари и не бива да научава: смятачът остава чист.
 */
interface SumaVKolona {
  readonly prihod_st: number;
  readonly razhod_st: number;
  /**
   * КОЛКО КОЛОНИ покрива клетката · нула значи „тук няма клетка".
   *
   * ПАРИТЕ НЯМАТ ЧАС. Плащането и разходът носят ДАТА — в Журнала няма поле за
   * час и няма да има, защото банковото извлечение също не го носи. При такт
   * „ден" осемте колони са часове от ЕДИН ден: сумата му стои ВЕДНЪЖ, разпъната
   * над осемте, вместо да се повтори осем пъти (осемкратна лъжа) или да се
   * размаже по часове (измислено число).
   */
  readonly obhvat: number;
}

export function obobshtenRed(
  k: readonly KolonaNaTakta[],
  poDni: readonly { data: string; prihod_st: number; razhod_st: number }[],
): SumaVKolona[] {
  return k.map((kol, i) => {
    // Колона, която дели деня си с предишната (часовете на такт „ден"), не носи
    // своя клетка: сумата вече е разпъната над нея.
    const predishna = k[i - 1];
    if (kol.chas !== undefined && predishna?.ot === kol.ot) {
      return { prihod_st: 0, razhod_st: 0, obhvat: 0 };
    }
    let obhvat = 1;
    if (kol.chas !== undefined) {
      while (k[i + obhvat]?.ot === kol.ot) obhvat += 1;
    }
    let prihod_st = 0;
    let razhod_st = 0;
    for (const d of poDni) {
      if (d.data >= kol.ot && d.data <= kol.do) {
        prihod_st += d.prihod_st;
        razhod_st += d.razhod_st;
      }
    }
    return { prihod_st, razhod_st, obhvat };
  });
}
