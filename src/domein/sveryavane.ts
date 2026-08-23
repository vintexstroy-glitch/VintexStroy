/**
 * ПЪТЯТ НА БУТОН №1 · „Сверяване от Ексел".
 *
 * Негови думи какво прави този бутон:
 *
 *   „Сверяването е само за актуализиране на данните вътре, когато периодът в
 *    Управление или Сметки се върне назад и трябва информация за това. Ако има
 *    разлика, **се регистрира промяната на данните в Журнала**."
 *
 * И какво приема:
 *
 *   няколко ФАЙЛА наведнъж, една сверка · един файл с няколко ЛИСТА, всеки със
 *   свой хедър · списък от ПОЗВОЛЕНИ модели
 *
 * Половината стои от резен 12: `nameriModel` познава главата, `razchetiPoModel`
 * вади редовете, `sravni` и `prilozhi` правят сторно + ново. Тук е онова, което
 * ги свързва в ЕДНА партида с ЕДНО число накрая.
 *
 * ЗАЩО НЕ СЕ СМЕСВАТ МЕСЕЦИ. Ако два файла са за различни месеци, сверката им
 * би дала едно число за двата — и когато то не затвори, никой няма да знае кой
 * месец е счупен. Затова се отказва НА ГЛАС, вместо да се събере.
 *
 * ЗАЩО ОТПЕЧАТЪКЪТ Е НА ЦЯЛАТА ПАРТИДА. `opId` се вади от него; ако беше на
 * първия файл, партида „А + Б" и партида „А + В" щяха да носят един ключ и
 * втората щеше да върне резултата на първата. Затова се хешират всички заедно.
 */

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { razchetiPoModel, periodPoModel } from '../iztochnik/razchitane.js';
import { sborNaSnimka, type Izvor, type Propusnat, type RedOtSnimka, type Snimka } from '../iztochnik/snimka.js';
import type { ModelNaTablitsa } from '../iztochnik/model.js';
import type { Tablitsa } from '../iztochnik/tablitsa.js';
import type { Sha256 } from '../yadro/index.js';
import { GreshkaButon, modelZaTablitsata, posokaNa, type Buton } from './butoni.js';
import { otIztochnik, sravni, type Plan } from './aktualizatsiya.js';
import type { Deystviya } from './deystviya.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

/** Един подаден файл: следата му и листовете, които носи. */
export interface PodadenFayl {
  readonly izvor: Izvor;
  readonly tablitsi: readonly Tablitsa[];
}

/** Лист, който никой позволен модел не познава — брои се, не се преглъща. */
export interface NepoznatList {
  readonly fayl: string;
  readonly list: string;
}

/** Един прочетен лист заедно с модела, през който е минал. */
export interface Dvoyka {
  readonly fayl: string;
  readonly list: string;
  readonly model: ModelNaTablitsa;
  readonly tablitsa: Tablitsa;
}

export interface Partida {
  readonly plan: Plan;
  /** кои листове са прочетени и с кой модел — оттук се вадят числовите колони */
  readonly dvoyki: readonly Dvoyka[];
  readonly nepoznati: readonly NepoznatList[];
  readonly izvori: readonly string[];
}

export class GreshkaSveryavane extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaSveryavane';
  }
}

/**
 * Сглобява ЕДНА партида от всички подадени файлове и листове.
 *
 * Нищо не се записва — само се вижда. Записът е `prilozhiPartidata` отдолу.
 */
export async function sgloviPartida(n: {
  buton: Buton;
  faylove: readonly PodadenFayl[];
  modeli: readonly ModelNaTablitsa[];
  ogledalo: Ogledalo;
  sha: Sha256;
}): Promise<Partida> {
  if (posokaNa(n.buton.deystvie) !== 'chete') {
    throw new GreshkaSveryavane(
      `Бутонът „${n.buton.klyuch}" не е за четене. Посоката е една: ` +
        'бутон, който пише, не чете, и обратно.',
    );
  }
  if (n.faylove.length === 0) throw new GreshkaSveryavane('Нито един файл не е подаден.');

  const snimki: Snimka[] = [];
  const dvoyki: Dvoyka[] = [];
  const nepoznati: NepoznatList[] = [];

  for (const f of n.faylove) {
    for (const t of f.tablitsi) {
      // Чужд модел в грешния бутон се отказва ГЛАСНО — `modelZaTablitsata`
      // хвърля с името на модела, който я познава.
      const m = modelZaTablitsata(n.buton, n.modeli, t);
      if (!m) {
        nepoznati.push({ fayl: f.izvor.ime, list: t.ime });
        continue;
      }
      const period = periodPoModel(m, t);
      if (period === '') {
        nepoznati.push({ fayl: f.izvor.ime, list: t.ime });
        continue;
      }
      snimki.push(razchetiPoModel({ model: m, tablitsa: t, izvor: f.izvor, period }));
      dvoyki.push({ fayl: f.izvor.ime, list: t.ime, model: m, tablitsa: t });
    }
  }

  if (snimki.length === 0) {
    const kakvo = nepoznati.map((x) => `„${x.list}" от ${x.fayl}`).join(', ');
    throw new GreshkaSveryavane(
      `Бутонът „${n.buton.klyuch}" не позна нито един лист: ${kakvo}. ` +
        'Или главата е друга, или моделът още не е записан.',
    );
  }

  const mesetsi = [...new Set(snimki.map((s) => s.period))];
  if (mesetsi.length > 1) {
    throw new GreshkaSveryavane(
      `Подадените файлове са за различни месеци (${mesetsi.sort().join(', ')}). ` +
        'Сверката не смесва месеци — иначе счупеното число не казва кой месец е.',
    );
  }

  const slyata = await sleiSnimki(snimki, n.sha);
  return {
    plan: sravni(n.ogledalo, slyata),
    dvoyki,
    nepoznati,
    izvori: n.faylove.map((f) => f.izvor.otpechatak),
  };
}

/**
 * Слепва няколко снимки в една · ЕДНА партида, едно число.
 *
 * Ключовете се сверяват през всички листове наведнъж: два файла с един и същ
 * ред (например препокриващи се извлечения) не пишат два записа — вторият
 * получава свой ключ, точно както прави `razchetiPoModel` вътре в един лист.
 */
export async function sleiSnimki(
  snimki: readonly Snimka[],
  sha: Sha256,
): Promise<Snimka> {
  const parva = snimki[0]!;
  const redove: RedOtSnimka[] = [];
  const propusnati: Propusnat[] = [];
  const vidyani = new Map<string, number>();

  for (const s of snimki) {
    for (const r of s.redove) {
      const povtoreno = (vidyani.get(r.klyuch) ?? 0) + 1;
      vidyani.set(r.klyuch, povtoreno);
      redove.push(povtoreno === 1 ? r : { ...r, klyuch: `${r.klyuch}#${povtoreno}` });
    }
    propusnati.push(...s.propusnati);
  }

  const otpechatak = await sha(snimki.map((s) => s.izvor.otpechatak).join('|'));
  const imena = [...new Set(snimki.map((s) => s.izvor.ime))];

  return {
    vid: parva.vid,
    period: parva.period,
    izvor: {
      vid: parva.izvor.vid,
      ime: imena.length === 1 ? imena[0]! : `${imena.length} файла`,
      golemina: snimki.reduce((sbor, s) => sbor + s.izvor.golemina, 0),
      promenen: snimki.map((s) => s.izvor.promenen).sort().at(-1)!,
      otpechatak,
    },
    redove,
    propusnati,
  };
}

export interface RezultatSveryavane {
  readonly zapisani: number;
  readonly stornirani: number;
  readonly bezPromyana: number;
  readonly vhod_st: number;
  readonly izhod_st: number;
  readonly razlika_st: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

/**
 * Записва сверката в Журнала · И КОГАТО РАЗЛИКАТА Е НУЛА.
 *
 * Вика се СЛЕД `prilozhi`. Разделено е нарочно: прилагането мени числа и иска
 * отключен период; сверката само гледа и се пише винаги. Слеят ли се, заключен
 * месец би останал и без поглед, не само без промяна.
 */
export async function zapishiSverkata(
  deystviya: Deystviya,
  n: {
    buton: Buton;
    partida: Partida;
    rezultat: { zapisani: number; stornirani: number; bezPromyana: number };
    kogato: string;
  },
): Promise<RezultatSveryavane> {
  const { partida, buton } = n;
  const period = partida.plan.snimka.period;
  const beleg = partida.plan.snimka.izvor.otpechatak.slice(0, 16);

  const vhod_st = sborNaSnimka(partida.plan.snimka);
  const sled = otIztochnik(await deystviya.ogledalo(), period);
  const izhod_st = sled.reduce((s, r) => s + r.suma_st, 0);

  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka(`${buton.klyuch} ${period} · файлове ↔ Журнал`, vhod_st, izhod_st, n.kogato, MERKA.pari),
  );
  dnevnik.zapishi(
    sverka(
      `${buton.klyuch} ${period} · брой редове ↔ записи`,
      partida.plan.snimka.redove.length,
      sled.length,
      n.kogato,
      MERKA.broy,
    ),
  );

  await deystviya.zapishiSverka(
    `SV:${beleg}`,
    {
      buton: buton.klyuch,
      period,
      vhod_st,
      izhod_st,
      razlika_st: izhod_st - vhod_st,
      izvori: partida.izvori,
      propusnati: partida.plan.snimka.propusnati.length,
    },
    { opId: `sverka:${beleg}` },
  );

  return {
    ...n.rezultat,
    vhod_st,
    izhod_st,
    razlika_st: izhod_st - vhod_st,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
  };
}

/** Бутоните, които този човек вижда. Празна видимост значи „всички". */
export function vidimiButoni(butoni: readonly Buton[], roli: readonly string[]): readonly Buton[] {
  return butoni.filter((b) => b.vidimost.length === 0 || b.vidimost.some((r) => roli.includes(r)));
}

export { GreshkaButon };
