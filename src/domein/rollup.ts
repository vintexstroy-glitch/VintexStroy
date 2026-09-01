/**
 * ROLLUP · сбор от ДРУГА таблица по закачената връзка (резен 88).
 *
 * Последното от трите, които чакаха редовете на създадената таблица: „колоните
 * на Продажби, разрезът по собствена колона, ROLLUP-ЪТ" (`docs/10` · ADR-111).
 * Възможен е, откакто закачките стигат до тези редове (ADR-112), и е СВОЯ
 * сметка: за всеки ред на гледаната таблица — редовете на ИЗВОРНАТА, закачени
 * за него, броят им и сборът на една нейна парична колона.
 *
 * ═══ СМЕТКА, НЕ ЗАПИС ═══
 *
 * Нищо не влиза в Журнала — както разрезът (ADR-113) и знакът (правило 20):
 * записан, rollup-ът щеше да остарее при първата нова закачка и да лъже точно
 * онзи, който му вярва. Смята се при всяко показване.
 *
 * ═══ ЕДИН ИЗВОРЕН РЕД МОЖЕ ДА ВЛЕЗЕ ДВА ПЪТИ ═══
 *
 * Закачен за два реда на гледаната таблица, той се брои във ВСЕКИ от тях —
 * това е смисълът на много-към-много. Затова сверката брои РАЗЛИЧНИТЕ влезли
 * редове, не сбора на броевете: двете числа се разминават точно когато има
 * двойно закачане, и разликата се вижда, вместо да се крие.
 */

import type { PayloadTablitsaOtFaylSazdadena } from './sabitiya.js';
import type { Zakachka } from './mnogo-kam-mnogo.js';
import { sborNaKolona, vidaNaKolonata, type RedNaTablitsa } from './redove-na-tablitsa.js';

class GreshkaRollup extends Error {
  override readonly name = 'GreshkaRollup';
}

/** Rollup-ът на ЕДИН ред · кои изворни редове са закачени за него и сборът им. */
export interface RollupNaRed {
  readonly red: string;
  /** ключовете на закачените ЖИВИ изворни редове · сверката ги брои различни */
  readonly izvorni: readonly string[];
  readonly sbor_st: number;
}

/**
 * Другият край на закачката, АКО тя върже (гледана · ред) с ред на извора.
 * Двете посоки са един запис (ADR-110) — затова се гледат и двете.
 */
function kraytKamIzvora(
  z: Zakachka,
  gledana: string,
  red: string,
  izvor: string,
): string | undefined {
  for (const [moy, chuzhd] of [
    [z.a, z.b],
    [z.b, z.a],
  ] as const) {
    if (
      moy.vid === 'red' &&
      moy.tablitsa === gledana &&
      moy.id === red &&
      chuzhd.vid === 'red' &&
      chuzhd.tablitsa === izvor
    ) {
      return chuzhd.id;
    }
  }
  return undefined;
}

/**
 * ROLLUP-ЪТ · по ред на гледаната таблица, само живите от двете страни.
 *
 * Самопосочването се отказва С ДУМИ: „сбор от ДРУГА таблица" не е украса, а
 * границата с агрегата по редове (ADR-139), който вече събира собствената.
 * Непаричната колона — също: rollup, който събира текст, е число наужким.
 */
export function rollupPoZakachki(
  zakachki: ReadonlyMap<string, Zakachka>,
  gledana: string,
  redove: readonly RedNaTablitsa[],
  izvor: PayloadTablitsaOtFaylSazdadena,
  izvorniRedove: readonly RedNaTablitsa[],
  kolona: string,
): readonly RollupNaRed[] {
  if (izvor.klyuch === gledana) {
    throw new GreshkaRollup(
      'Rollup събира от ДРУГА таблица — за собствената има агрегат по редове.',
    );
  }
  if (vidaNaKolonata(izvor, kolona) !== 'evro') {
    throw new GreshkaRollup(
      `Колона „${izvor.glavi[Number(kolona)] ?? kolona}" на „${izvor.klyuch}" не е пари — rollup събира само парична колона.`,
    );
  }

  const poKlyuch = new Map(izvorniRedove.filter((r) => !r.mahnat).map((r) => [r.red, r]));
  return redove
    .filter((r) => !r.mahnat)
    .map((r) => {
      const zakacheni: RedNaTablitsa[] = [];
      for (const z of zakachki.values()) {
        const id = kraytKamIzvora(z, gledana, r.red, izvor.klyuch);
        if (id === undefined) continue;
        const izvoren = poKlyuch.get(id);
        // Закачка към вече МАХНАТ изворен ред не влиза в сбора — редът не е в
        // таблицата. Тя не се преглъща: сверката я брои поименно (kamMahnati).
        if (izvoren !== undefined) zakacheni.push(izvoren);
      }
      return {
        red: r.red,
        izvorni: zakacheni.map((x) => x.red),
        sbor_st: sborNaKolona(zakacheni, kolona),
      };
    });
}

export interface SverkaNaRollup {
  readonly zhiviVIzvora: number;
  /** РАЗЛИЧНИТЕ изворни редове, влезли поне в един rollup */
  readonly vlezli: number;
  readonly nezakacheni: number;
  /** сбор на колоната по цялата изворна таблица · лявата страна */
  readonly sborIzvora_st: number;
  /** сбор по различните влезли редове · дясната страна */
  readonly sborVlezli_st: number;
  /** парите на незакачените · нула, когато всичко е закачено (правило 7) */
  readonly razlika_st: number;
  /** закачки от гледаната към изворни редове, които вече са МАХНАТИ */
  readonly kamMahnati: number;
}

/**
 * СВЕРКАТА · изворът ↔ влезлите, по РАЗЛИЧЕН път (поуката на ADR-113 §4).
 *
 * Лявата страна минава по редовете на извора, без да знае за закачки; дясната
 * тръгва от резултата на rollup-а. Изпадне ли ред — например защото закачката
 * му сочи махнат — разликата го казва, по брой и по пари, дори когато е нула.
 */
export function sveriRollup(
  zakachki: ReadonlyMap<string, Zakachka>,
  gledana: string,
  redove: readonly RedNaTablitsa[],
  izvor: PayloadTablitsaOtFaylSazdadena,
  izvorniRedove: readonly RedNaTablitsa[],
  kolona: string,
  rollup: readonly RollupNaRed[],
): SverkaNaRollup {
  const zhivi = izvorniRedove.filter((r) => !r.mahnat);
  const poKlyuch = new Map(zhivi.map((r) => [r.red, r]));

  const vlezli = new Set<string>();
  for (const r of rollup) for (const id of r.izvorni) vlezli.add(id);

  let kamMahnati = 0;
  const zhiviGledani = new Set(redove.filter((r) => !r.mahnat).map((r) => r.red));
  for (const z of zakachki.values()) {
    for (const gledan of zhiviGledani) {
      const id = kraytKamIzvora(z, gledana, gledan, izvor.klyuch);
      if (id !== undefined && !poKlyuch.has(id)) kamMahnati += 1;
    }
  }

  const sborIzvora_st = sborNaKolona(zhivi, kolona);
  const sborVlezli_st = sborNaKolona(
    [...vlezli].map((id) => poKlyuch.get(id)!),
    kolona,
  );
  return {
    zhiviVIzvora: zhivi.length,
    vlezli: vlezli.size,
    nezakacheni: zhivi.length - vlezli.size,
    sborIzvora_st,
    sborVlezli_st,
    razlika_st: sborIzvora_st - sborVlezli_st,
    kamMahnati,
  };
}
