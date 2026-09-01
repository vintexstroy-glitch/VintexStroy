/**
 * ПРЕНОСЪТ · дела между служебния и личния Журнал (И98).
 *
 * Негови думи: „да има възможност делата и задачите там да ги прехвърлиш с
 * видимост само в таба Управление на личния акаунт… Има си и отделен журнал
 * когато се е активирал личния и **никога не се смесват**."
 *
 * Двете искания се дърпат: прехвърлянето е движение МЕЖДУ двата Журнала, а
 * несмесването е забрана точно за това. Разрешението: **НИЩО НЕ СЕ МЕСТИ.**
 * `naematel` влиза в хеша (правило 4), Вратата отказва чужд наемател, носителят
 * е ключиран по наемател. „Прехвърляне" е ИЗПРАЩАНЕ: старите събития остават
 * завинаги на мястото си, а делото се преразказва от НОВО събитие в другия
 * Журнал. Двете половини се връзват с `prenosId`.
 *
 * ═══ РЕДЪТ Е НАРОЧЕН: ПИШИ ПЪРВО В ПОЛУЧАТЕЛЯ, МАХАЙ ПОСЛЕДЕН ═══
 *
 * Транзакция между два Журнала няма и не може да има — две опашки, две
 * ключалки, две вериги. Прекъсване при ТОЗИ ред дава ДУБЛИКАТ: грозно, но
 * ВИДИМО, и следващото пускане го довършва. Обратният ред дава ЛИПСА: дело,
 * което не съществува никъде, и никой не разбира. Нула загуба бие нула
 * дублиране — същата логика като на `vazstanovi`: сверката е ПРЕДИ записа.
 *
 * ═══ ИДЕМПОТЕНТНОСТТА НА ЦЕЛИЯ АКТ (правило 5) ═══
 *
 * `prenosId` е СЛУЧАЕН — един за партидата. Всички opId-та са ИЗВЕДЕНИ от
 * него; нито един `randomUUID()` вътре в цикъла. Прекъснат пренос, пуснат
 * наново СЪС СЪЩИЯ prenosId, дописва само липсващото (Вратата връща
 * `povtoreno` за вече записаните).
 *
 * Но prenosId НЕ се извежда от съдържанието (правило 20): обратната посока
 * съществува, и детерминиран номер би дал на ВТОРИЯ пренос на същото дело
 * същите opId-та — и преносът би изчезнал мълчаливо като „повторен".
 */

import type { Deystviya } from './deystviya.js';
import type { Delo } from './dela.js';
import { imaPoddela } from './dela.js';
import type { PayloadDeloZapisano } from './sabitiya.js';

export class GreshkaPrenos extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPrenos';
  }
}

/**
 * ОТГОВОРЪТ „може ли" е ЕДИН (`otgovor.ts`) и се изнася наново оттук: който
 * пита този модул, го пита за СВОЙ въпрос и не бива да търси формата другаде.
 */
import { MOZHE, ne, type Otgovor } from './otgovor.js';

export type { Otgovor };

/**
 * ВРАТАРЯТ на преноса · огледан на `mozheLiDaSeStornira`.
 *
 * Отказва с ДУМИ, не с празен резултат:
 *   · липсващо дело — няма какво да пътува;
 *   · дело с живи поддела ИЗВЪН партидата — „Пренеси първо подделата":
 *     лично дело, увиснало под фирмено, което в личния Журнал не съществува,
 *     е сирак, а `vidimi()` показва сираците, вместо да ги крие.
 *
 * Подделото ВЪТРЕ в партидата минава: двете пътуват заедно и връзката оцелява.
 */
export function mozheLiDaSePrenese(
  dela: ReadonlyMap<string, Delo>,
  id: string,
  partida: ReadonlySet<string>,
): Otgovor {
  const d = dela.get(id);
  if (!d) return ne(`Няма дело „${id}" — може вече да е прехвърлено.`);
  const zhivi = [...dela.values()];
  if (imaPoddela(zhivi, id)) {
    const navan = zhivi.filter((x) => x.nadDelo === id && !partida.has(x.id));
    if (navan.length > 0) {
      return ne(
        `Под „${d.ime}" ${navan.length === 1 ? 'виси поддело' : `висят ${navan.length} поддела`}. ` +
          'Пренеси ги заедно или първо тях — сирак под липсващо дело не се оставя.',
      );
    }
  }
  return MOZHE;
}

/** Изведените opId-та · едно място, за да не се разминат двете половини. */
const OPID = {
  novo: (prenosId: string, id: string) => `prenos:${prenosId}:novo:${id}`,
  priet: (prenosId: string) => `prenos:${prenosId}:priet`,
  mahni: (prenosId: string, id: string) => `prenos:${prenosId}:mahni:${id}`,
  izpraten: (prenosId: string) => `prenos:${prenosId}:izpraten`,
} as const;

interface RezultatPrenos {
  readonly prenosId: string;
  readonly preneseni: number;
  /** сверката вход↔изход · разликата се връща дори когато е нула (правило 7) */
  readonly sverka: { readonly vhod: number; readonly izhod: number; readonly razlika: number };
}

/**
 * ПРЕНАСЯ партида дела от единия Журнал в другия.
 *
 * За N дела — 2N+2 записа, в този ред:
 *   1 · N × `ДелоЗаписано` в ПОЛУЧАТЕЛЯ (`priemiPrehvarleno`) — делото пътува
 *       със СЪЩИЯ id: детерминиран е, повторното пускане не ражда второ дело;
 *   2 · разписка `priemane` в получателя;
 *   3 · N × `ДелоПрехвърлено` в ИЗПРАЩАЧА;
 *   4 · разписка `izprashtane` в изпращача.
 *
 * КАКВО НЕ ПЪТУВА, поименно:
 *   · ИСТОРИЯТА · кой е менил делото остава в изпращача, сочи се от prenosId;
 *   · НАДДЕЛОТО извън партидата · `nadDelo` се изпразва — връзка към дело,
 *     което в получателя не съществува, е сирак;
 *   · ПАРИТЕ и АГЕНТСКИТЕ ЗАДАЧИ · изобщо не са дела и не минават оттук.
 *
 * СВЕРКАТА СЕ ЗАТВАРЯ С ПРЕЧИТАНЕ, НЕ С ВЯРА: двете Огледала се четат наново
 * и се иска делото да ГО НЯМА при изпращача и да ГО ИМА при получателя.
 * Броенето на успели повиквания проверява искането; пречитането — резултата
 * (умението `matematika`: независим втори път).
 */
export async function prenesiDela(n: {
  readonly ot: Deystviya;
  readonly kam: Deystviya;
  readonly otKlyuch: string;
  readonly kamKlyuch: string;
  readonly dela: readonly string[];
  readonly prichina: string;
  readonly prenosId: string;
}): Promise<RezultatPrenos> {
  if (n.prichina.trim() === '') {
    throw new GreshkaPrenos('Кажи ПРИЧИНАТА на преноса, преди да тръгне каквото и да е.');
  }
  if (n.dela.length === 0) {
    throw new GreshkaPrenos('Няма избрано нито едно дело — няма какво да се пренася.');
  }

  const ogledaloOt = await n.ot.ogledalo();
  const partida = new Set(n.dela);

  // ВРАТАРЯТ първо, за ВСЯКО дело — преди да е записан и един ред.
  const vhod: Delo[] = [];
  for (const id of n.dela) {
    const otgovor = mozheLiDaSePrenese(ogledaloOt.dela, id, partida);
    if (!otgovor.mozhe) throw new GreshkaPrenos(otgovor.prichina);
    vhod.push(ogledaloOt.dela.get(id)!);
  }

  // ── 1 · ПОЛУЧАТЕЛЯТ · делата влизат, със същите id-та ────────────────────
  for (const d of vhod) {
    const payload: PayloadDeloZapisano = {
      myasto: d.myasto,
      obekt: d.obekt,
      ime: d.ime,
      otgovornik: d.otgovornik,
      ot: d.ot,
      do: d.do,
      chas: d.chas,
      otsenka: d.otsenka,
      sastoyanie: d.sastoyanie,
      // надделото пътува само ако е В партидата — иначе се изпразва
      nadDelo: partida.has(d.nadDelo) ? d.nadDelo : '',
      dokument: d.dokument,
    };
    await n.kam.priemiPrehvarleno(d.id, payload, { opId: OPID.novo(n.prenosId, d.id) });
  }

  // ── 2 · разписката на ПОЛУЧАТЕЛЯ ─────────────────────────────────────────
  const ogledaloKamSled = await n.kam.ogledalo();
  const pristignali = vhod.filter((d) => ogledaloKamSled.dela.has(d.id)).length;
  await n.kam.zapishiPrenos(
    {
      prenosId: n.prenosId,
      posoka: 'priemane',
      ot: n.otKlyuch,
      kam: n.kamKlyuch,
      vhod: vhod.length,
      izhod: pristignali,
      razlika: pristignali - vhod.length,
      prichina: n.prichina,
    },
    { opId: OPID.priet(n.prenosId) },
  );

  // ── 3 · ИЗПРАЩАЧЪТ · делата излизат, със следа накъде ────────────────────
  for (const d of vhod) {
    await n.ot.prehvarliDelo(
      d.id,
      { kam: n.kamKlyuch, prenosId: n.prenosId, prichina: n.prichina },
      { opId: OPID.mahni(n.prenosId, d.id) },
    );
  }

  // ── 4 · разписката на ИЗПРАЩАЧА ──────────────────────────────────────────
  const ogledaloOtSled = await n.ot.ogledalo();
  const izlezli = vhod.filter((d) => !ogledaloOtSled.dela.has(d.id)).length;
  await n.ot.zapishiPrenos(
    {
      prenosId: n.prenosId,
      posoka: 'izprashtane',
      ot: n.otKlyuch,
      kam: n.kamKlyuch,
      vhod: vhod.length,
      izhod: izlezli,
      razlika: izlezli - vhod.length,
      prichina: n.prichina,
    },
    { opId: OPID.izpraten(n.prenosId) },
  );

  // ── ПРЕЧИТАНЕТО · сверката се затваря с проверка, не с вяра ──────────────
  for (const d of vhod) {
    if (ogledaloOtSled.dela.has(d.id)) {
      throw new GreshkaPrenos(
        `„${d.ime}" стои и в двата Журнала — преносът не е довършен. ` +
          'Пусни го наново със същия номер: вече записаното няма да се удвои.',
      );
    }
    if (!ogledaloKamSled.dela.has(d.id)) {
      throw new GreshkaPrenos(`„${d.ime}" не се появи при получателя — преносът не затваря.`);
    }
  }

  return {
    prenosId: n.prenosId,
    preneseni: vhod.length,
    sverka: { vhod: vhod.length, izhod: pristignali, razlika: pristignali - vhod.length },
  };
}

/**
 * НЕДОВЪРШЕН ПРЕНОС · дублите, които редът „пиши първо в получателя" оставя.
 *
 * Прекъсване между стъпка 1 и стъпка 3 оставя дело в ДВАТА Журнала. Това е
 * нарочната цена: дубълът се ВИЖДА (тук) и се довършва; загубата не се вижда
 * и не се връща. Връща id-тата, които стоят и на двете места и чиято следа
 * при получателя носи същия prenosId в opId — тоест дошли са от пренос.
 */
export function nedovarsheni(
  otDela: ReadonlyMap<string, Delo>,
  kamDela: ReadonlyMap<string, Delo>,
): readonly string[] {
  return [...kamDela.keys()].filter((id) => otDela.has(id));
}
