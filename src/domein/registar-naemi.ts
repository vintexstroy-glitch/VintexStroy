/**
 * РЕГИСТЪРЪТ НА НАЕМИТЕ · отчитане и събиране (резен 13б · И43).
 *
 * ═══ НЕГОВАТА ПОРЪЧКА, ДОСЛОВНО ═══
 *
 *   „Остави я за накрая, а ползвай каквото ще ти помогне за сметки. Тази е
 *    направена по стар, нефункционален начин. Ще я оправя. Ти предложи най-
 *    модерната таблица, използвана в такива програми за отчитане и събиране на
 *    наеми, и предложи решения като варианти." *(И43 · 23.08)*
 *
 * Значи ТУК не се избира вместо него. Строи се онова, което е ВЕЧЕ прието, а
 * трите варианта са ИЗГЛЕДИ върху едни и същи редове — той ги превключва и
 * вижда разликата, вместо да чете описание.
 *
 * ═══ КОЕ Е ПРИЕТО И НЕ Е ВАРИАНТ ═══
 *
 * · наемът е ТРИСТЪПКОВ — „3 ★" *(р76·[81])*: старт (състояние) · начисление ·
 *   събиране. Трите стъпки се СМЯТАТ от Журнала, не се записват като поле;
 * · наемът е МЕСЕЧЕН цикъл (И83 · 23.08) — периодът е месец;
 * · „в наеми само наема да регистрираш и статуса, нямаш добавяне" *(р57·[14])* —
 *   затова този файл САМО ЧЕТЕ. Нищо тук не пише в Журнала (правило 2).
 *
 * ═══ КАКВО НЕ СЕ СТРОИ НАНОВО ═══
 *
 * Начисленото и платеното вече ги има: `Vzemane` носи `nachisleno_st` ·
 * `pogaseno_st` · `ostatak_st` · `padezh`, а `Plashtane` сочи вземането си.
 * Регистърът ги СВЪРЗВА с наемането и с месеца — втора сметка за същите пари
 * би се разминала с първата (правило 17).
 */

import type { Naem, Ogledalo, Vzemane } from '../ogledalo/ogledalo.js';

/** Докъде е стигнал месецът на едно наемане · трите стъпки, СМЯТАНИ. */
export type StapkaNaNaema = 'nezapochnat' | 'nachislen' | 'chastichno' | 'sabran';

export const IMENA_NA_STAPKITE: Readonly<Record<StapkaNaNaema, string>> = Object.freeze({
  nezapochnat: 'няма начисление',
  nachislen: 'начислен · неплатен',
  chastichno: 'частично платен',
  sabran: 'събран',
});

/**
 * ЕДИН РЕД от регистъра · едно живо наемане за един месец.
 *
 * `dniZakasnenie` е ПОЛОЖИТЕЛНО само когато има остатък И падежът е минал.
 * Платеното със закъснение не свети червено занапред — то е събрано.
 */
export interface RedNaRegistara {
  readonly naemId: string;
  readonly naemetel: string;
  readonly imotId: string;
  readonly imot: string;
  readonly mesets: string;
  readonly naem_st: number;
  readonly nachisleno_st: number;
  readonly plateno_st: number;
  readonly ostatak_st: number;
  readonly padezh: string;
  readonly dniZakasnenie: number;
  readonly stapka: StapkaNaNaema;
}

/** Кой месец е един ISO ден · `2026-08-14` → `2026-08`. */
function mesetsNa(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Живо ли е наемането ПРЕЗ този месец.
 *
 * Прекратеното наемане НЕ изчезва от миналите месеци — то е носило наем тогава
 * и регистърът за юли трябва да го показва, дори да е прекратено през август.
 * Затова се гледат `ot` · `do` · `kraj`, не само отметката `prekraten`.
 */
export function zhivoPrezMeseca(n: Naem, mesets: string): boolean {
  if (n.ot && mesetsNa(n.ot) > mesets) return false;
  const kraj = n.kraj || n.do;
  if (kraj && mesetsNa(kraj) < mesets) return false;
  return true;
}

/** Колко дни закъснение · нула, когато няма остатък или падежът не е минал. */
export function dniZakasnenie(padezh: string, ostatak_st: number, dnes: string): number {
  if (ostatak_st <= 0 || !padezh) return 0;
  const dni = Math.floor((Date.parse(dnes) - Date.parse(padezh)) / 86_400_000);
  return dni > 0 ? dni : 0;
}

/** Трите стъпки · СМЯТАТ се от числата, не се записват като поле (правило 17). */
export function stapkata(nachisleno_st: number, ostatak_st: number): StapkaNaNaema {
  if (nachisleno_st <= 0) return 'nezapochnat';
  if (ostatak_st <= 0) return 'sabran';
  return ostatak_st < nachisleno_st ? 'chastichno' : 'nachislen';
}

/**
 * РЕГИСТЪРЪТ за един месец · ред на всяко наемане, живо през него.
 *
 * Наемане БЕЗ вземане за месеца пак получава ред — със стъпка „няма
 * начисление". Инак пропуснатото начисление щеше да изчезне от екрана точно
 * когато трябва да се види: липсата е находка, не празнина.
 */
export function registarZaMeseca(o: Ogledalo, mesets: string, dnes: string): readonly RedNaRegistara[] {
  const poNaem = new Map<string, Vzemane>();
  for (const v of o.vzemaniya.values()) {
    if (v.period === mesets) poNaem.set(v.naemId, v);
  }

  const redove: RedNaRegistara[] = [];
  for (const n of o.naemi.values()) {
    if (!zhivoPrezMeseca(n, mesets)) continue;
    const v = poNaem.get(n.id);
    const nachisleno_st = v?.nachisleno_st ?? 0;
    const ostatak_st = v?.ostatak_st ?? 0;
    const padezh = v?.padezh ?? '';
    const i = o.imoti.get(n.imotId);
    redove.push({
      naemId: n.id,
      naemetel: n.naemetel,
      imotId: n.imotId,
      imot: i ? `${i.adres} · ${i.edinitsa}` : n.imotId,
      mesets,
      naem_st: n.naem_st,
      nachisleno_st,
      plateno_st: (v?.pogaseno_st ?? 0),
      ostatak_st,
      padezh,
      dniZakasnenie: dniZakasnenie(padezh, ostatak_st, dnes),
      stapka: stapkata(nachisleno_st, ostatak_st),
    });
  }
  return Object.freeze(
    redove.sort((a, b) => b.dniZakasnenie - a.dniZakasnenie || a.naemetel.localeCompare(b.naemetel)),
  );
}

/** Сборовете на регистъра · за плочките горе и за сверката вход↔изход. */
export interface SborNaRegistara {
  readonly redove: number;
  readonly nachisleno_st: number;
  readonly plateno_st: number;
  readonly ostatak_st: number;
  readonly prosrocheni: number;
}

export function sboroveNaRegistara(redove: readonly RedNaRegistara[]): SborNaRegistara {
  return Object.freeze({
    redove: redove.length,
    nachisleno_st: redove.reduce((s, r) => s + r.nachisleno_st, 0),
    plateno_st: redove.reduce((s, r) => s + r.plateno_st, 0),
    ostatak_st: redove.reduce((s, r) => s + r.ostatak_st, 0),
    prosrocheni: redove.filter((r) => r.dniZakasnenie > 0).length,
  });
}

// ── ТРИТЕ ИЗГЛЕДА · един и същ ред, три въпроса ──────────────────────────────
//
// Негова поръчка (И43): „предложи решения като варианти". Вариантите НЕ са три
// различни таблици с три различни сметки — това би дало три числа за едни и
// същи пари. Те са три ГРУПИРОВКИ на едни и същи редове, и сборът им е равен.

export type IzgledNaRegistara = 'naemateli' | 'imoti' | 'mesetsi';

export const IMENA_NA_IZGLEDITE: Readonly<Record<IzgledNaRegistara, string>> = Object.freeze({
  naemateli: 'По наемател',
  imoti: 'По имот',
  mesetsi: 'По месец',
});

export const VAPROSAT_NA_IZGLEDA: Readonly<Record<IzgledNaRegistara, string>> = Object.freeze({
  naemateli: 'кой дължи и от колко дни',
  imoti: 'кое носи и кое стои празно',
  mesetsi: 'как върви събирането във времето',
});

export const IZGLEDI: readonly IzgledNaRegistara[] = Object.freeze([
  'naemateli',
  'imoti',
  'mesetsi',
]);

/** Една група в изглед · име, сборове и редовете под нея. */
export interface GrupaVRegistara {
  readonly klyuch: string;
  readonly ime: string;
  readonly sborove: SborNaRegistara;
  readonly redove: readonly RedNaRegistara[];
}

/**
 * ГРУПИРА регистъра по избрания изглед.
 *
 * „По месец" не групира ТОЗИ месец — тогава групата щеше да е една. Викащият му
 * подава редовете на няколко месеца (`registarZaGodina`), и групата е месецът.
 */
export function grupirano(
  redove: readonly RedNaRegistara[],
  izgled: IzgledNaRegistara,
): readonly GrupaVRegistara[] {
  const klyuchNa = (r: RedNaRegistara): [string, string] =>
    izgled === 'naemateli'
      ? [r.naemId, r.naemetel]
      : izgled === 'imoti'
        ? [r.imotId, r.imot]
        : [r.mesets, r.mesets];

  const po = new Map<string, { ime: string; redove: RedNaRegistara[] }>();
  for (const r of redove) {
    const [k, ime] = klyuchNa(r);
    const veche = po.get(k);
    if (veche) veche.redove.push(r);
    else po.set(k, { ime, redove: [r] });
  }

  return Object.freeze(
    [...po.entries()]
      .map(([klyuch, g]) => ({
        klyuch,
        ime: g.ime,
        sborove: sboroveNaRegistara(g.redove),
        redove: Object.freeze(g.redove),
      }))
      // Месеците вървят по календар; хората и имотите — по дължимото, най-голямото горе.
      .sort((a, b) =>
        izgled === 'mesetsi'
          ? a.klyuch.localeCompare(b.klyuch)
          : b.sborove.ostatak_st - a.sborove.ostatak_st || a.ime.localeCompare(b.ime),
      ),
  );
}

/** Дванайсетте месеца до избрания · за изгледа „По месец". */
export function registarZaGodina(o: Ogledalo, doMesets: string, dnes: string): readonly RedNaRegistara[] {
  const [g, m] = doMesets.split('-').map(Number);
  const redove: RedNaRegistara[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(g!, m! - 1 - i, 1));
    redove.push(...registarZaMeseca(o, d.toISOString().slice(0, 7), dnes));
  }
  return Object.freeze(redove);
}
