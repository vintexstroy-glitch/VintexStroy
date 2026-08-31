/**
 * ПОЛЕТО С ФОРМУЛА В ОТЧЕТИ · между ВСИЧКИ таблици (резен 42 · M11 · И90).
 *
 * „За финанситее ще хледаш формулата **ще правиш полета в Секция Отчети** където
 * ще се сложар полета които да покзват тези стойности **с формули между всички
 * таблици** нак вероятно." *(И90 · 23.08)*
 *
 * ═══ КАКВО Е РАЗЛИЧНОТО ОТ КОЛОННИТЕ ФОРМУЛИ ═══
 *
 * `formuli.ts` смята ВЪТРЕ в една таблица: операндите ѝ са КОЛОНИ на същия
 * модел. Тук операндите са ЧИСЛА ОТ РАЗЛИЧНИ таблици — точно онова, което
 * описът на дълга броеше като липсващо: „Формулите днес живеят в конструктора
 * на таблици, не между всички."
 *
 * ═══ ЧЕТИРИТЕ ДЕЙСТВИЯ НЕ СЕ ИЗМИСЛЯТ ВТОРИ ПЪТ ═══
 *
 * Сбор · разлика · произведение · процент от — същите, от `formuli.ts`
 * (правило 17). Втори набор тук щеше да значи, че „сбор" в Отчети може да
 * стане различен от „сбор" в таблица, и никой нямаше да разбере кога.
 *
 * Същото важи и за ПРАВИЛАТА кое с кое върви: `vidNaFormulata` вече решава, че
 * евро по евро няма смисъл и че процент не се сборува. Тук се превежда само
 * речникът (`vidNaIztochnika`), не се преписва решението.
 *
 * ═══ ПЛИТЪК ГРАФ · поле НЕ сочи поле ═══
 *
 * Същата забрана като при колоните, и тук е по-остра: изворите стоят в ЕДИН
 * регистър, тъй че поле, сочещо поле, би могло да се затвори в кръг. Плитко =
 * проследимо със свирка и очи.
 *
 * ═══ ЛИПСВАЩОТО НЕ СЕ ЗАГЛАЖДА ДО НУЛА ═══
 *
 * Извор без стойност (коефициент, който не се смята; отчет, който чака салдо)
 * прави полето БЕЗ стойност, и полето казва ЗАЩО — с думите на извора. Нула на
 * това място е тиха лъжа: тя изглежда като сметнат отговор.
 */

import {
  DEYSTVIYA_NA_FORMULA,
  GreshkaFormula,
  IMENA_NA_DEYSTVIYATA,
  vidNaFormulata,
  type DeystvieNaFormula,
} from './formuli.js';
import { vidNaIztochnika, iztochnikPoKlyuch, type IztochnikNaChislo } from './iztochnitsi-na-chisla.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import type { VidStoynost } from './vid-stoynost.js';

export interface PoleSFormula {
  readonly id: string;
  /** името, което човекът дава · то е онова, което после чете */
  readonly ime: string;
  readonly deystvie: DeystvieNaFormula;
  /** ключът на ЛЕВИЯ извор */
  readonly lyavo: string;
  /** ключът на ДЕСНИЯ извор */
  readonly dyasno: string;
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
}

/**
 * ПРОВЕРКАТА ПРИ СЪЗДАВАНЕ · счупено поле изобщо не се записва.
 *
 * Същият избор като при колонните формули (Notion 2.0): по-добре отказ с думи
 * сега, отколкото колона, която мълчи по-късно. Връща вида, който формулата
 * налага — той се показва до полето, за да се вижда в какво се мери.
 */
export function proveriPoleto(
  ime: string,
  deystvie: string,
  lyavo: string,
  dyasno: string,
  iztochnitsi: readonly IztochnikNaChislo[],
): VidStoynost {
  if (ime.trim() === '') {
    throw new GreshkaFormula(
      'Полето няма име. Името е онова, което човек чете в Отчети — безименно поле ' +
        'е число без въпрос, на който отговаря.',
    );
  }
  if (!(DEYSTVIYA_NA_FORMULA as readonly string[]).includes(deystvie)) {
    throw new GreshkaFormula(
      `Няма такова действие: „${deystvie}". Изброените са: ` +
        `${DEYSTVIYA_NA_FORMULA.map((d) => IMENA_NA_DEYSTVIYATA[d]).join(' · ')}.`,
    );
  }
  if (lyavo === dyasno) {
    throw new GreshkaFormula(
      `Двата операнда сочат ЕДИН и същ извор („${lyavo}"). Сбор на число със себе си ` +
        'е удвояване, а разлика — нула: и двете изглеждат като сметка, а не са.',
    );
  }
  const l = iztochnikPoKlyuch(iztochnitsi, lyavo);
  const d = iztochnikPoKlyuch(iztochnitsi, dyasno);
  if (!l) throw new GreshkaFormula(`Няма извор „${lyavo}". Изворите се четат от живия код, не се пишат.`);
  if (!d) throw new GreshkaFormula(`Няма извор „${dyasno}". Изворите се четат от живия код, не се пишат.`);

  // ПРАВИЛАТА кое с кое върви идват от `formuli.ts` · тук се превежда речникът.
  return vidNaFormulata(
    { deystvie: deystvie as DeystvieNaFormula, ot: [0, 1] },
    (k) => vidNaIztochnika((k === 0 ? l : d).merka),
  );
}

export interface SmetnatoPole {
  readonly pole: PoleSFormula;
  /** цяло число според вида · `undefined` значи „не се смята" */
  readonly stoynost: number | undefined;
  readonly vid: VidStoynost;
  /** празно, когато има стойност; иначе причината С ДУМИ */
  readonly zashto: string;
  /** формулата с думи, за екрана: „разлика(Приход · Разход)" */
  readonly sDumi: string;
}

/**
 * СМЕТКАТА · същата аритметика като при колоните, върху два ГОТОВИ броя.
 *
 * Цели най-малки единици навсякъде (правило 3). Произведението дели веднъж
 * накрая, процентът — два пъти: точно както в `smetniFormula`, защото това е
 * една и съща сметка, а не втора.
 */
export function smetniPoleto(
  p: PoleSFormula,
  iztochnitsi: readonly IztochnikNaChislo[],
): SmetnatoPole {
  const l = iztochnikPoKlyuch(iztochnitsi, p.lyavo);
  const d = iztochnikPoKlyuch(iztochnitsi, p.dyasno);
  const imeNa = (k: string, i: IztochnikNaChislo | undefined) => i?.ime ?? `няма извор „${k}"`;
  const sDumi = `${IMENA_NA_DEYSTVIYATA[p.deystvie]}(${imeNa(p.lyavo, l)} · ${imeNa(p.dyasno, d)})`;

  const bez = (zashto: string): SmetnatoPole =>
    Object.freeze({ pole: p, stoynost: undefined, vid: 'chislo' as VidStoynost, zashto, sDumi });

  if (!l) return bez(`Изворът „${p.lyavo}" вече го няма.`);
  if (!d) return bez(`Изворът „${p.dyasno}" вече го няма.`);
  // ЛИПСВАЩОТО СЕ ПРЕНАСЯ С ДУМИТЕ СИ · не се заглажда до нула.
  if (l.stoynost === undefined) return bez(`${l.ime}: ${l.zashto}`);
  if (d.stoynost === undefined) return bez(`${d.ime}: ${d.zashto}`);

  let vid: VidStoynost;
  try {
    vid = vidNaFormulata({ deystvie: p.deystvie, ot: [0, 1] }, (k) =>
      vidNaIztochnika((k === 0 ? l : d).merka),
    );
  } catch (e) {
    // Изворът може да е СМЕНИЛ мярката си след записа на полето. Тогава полето
    // не се чупи мълчаливо и не се трие — то КАЗВА, и човек решава.
    return bez(e instanceof Error ? e.message : String(e));
  }

  const a = l.stoynost;
  const b = d.stoynost;
  const stoynost =
    p.deystvie === 'sbor'
      ? a + b
      : p.deystvie === 'razlika'
        ? a - b
        : p.deystvie === 'proizvedenie'
          ? Math.round((a * b) / 100)
          : Math.round((a * b) / 10_000);

  return Object.freeze({ pole: p, stoynost, vid, zashto: '', sDumi });
}

/**
 * СВЕРКАТА · СОЧЕНИТЕ извори ↔ НАМЕРЕНИТЕ (правило 7).
 *
 * ВХОД: колко извора сочат полетата — по два на поле. ИЗХОД: колко от тях се
 * намират в регистъра.
 *
 * ПЪРВАТА ВЕРСИЯ БЕШЕ ТАВТОЛОГИЯ и падна още преди да се пусне: тя броеше
 * „сметнати + чакащи" срещу „записани", а тези две половини СЪБИРАТ цялото по
 * аритметика — разликата излизаше нула, каквото и да се счупи. Проверена нула,
 * която не е проверена, е по-лоша от липсваща (същият урок като при Капитала в
 * `otcheti.ts`).
 *
 * Сега сверката мери нещо, което МОЖЕ да не съвпадне: поле, сочещо извор, който
 * вече го няма. То изглежда като поле и на екрана, и в износа, а зад него няма
 * число — най-тихата повреда, която този резен може да роди.
 */
export function sveriPoletata(
  poleta: readonly PoleSFormula[],
  iztochnitsi: readonly IztochnikNaChislo[],
  kogato: string,
): Sverka {
  const socheni = poleta.flatMap((p) => [p.lyavo, p.dyasno]);
  const namereni = socheni.filter((k) => iztochnikPoKlyuch(iztochnitsi, k) !== undefined);
  return sverka(
    'полета с формула · сочени извори ↔ намерени',
    socheni.length,
    namereni.length,
    kogato,
    MERKA.broy,
  );
}

/** Кои полета ЧАКАТ число · брои се, и причината се КАЗВА поименно. */
export function chakashtitePoleta(
  poleta: readonly PoleSFormula[],
  iztochnitsi: readonly IztochnikNaChislo[],
): readonly SmetnatoPole[] {
  return Object.freeze(
    poleta.map((p) => smetniPoleto(p, iztochnitsi)).filter((s) => s.stoynost === undefined),
  );
}
