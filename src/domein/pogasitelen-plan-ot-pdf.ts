/**
 * ПОГАСИТЕЛНИЯТ ПЛАН ОТ ПДФ НА БАНКАТА (резен 117 · ADR-167).
 *
 * Негово, 03.09 (И134): „Кредититер се четат от пдф за погасителния план. Така
 * се зареждат, а калкулатора е само да симулира…"
 *
 * ═══ КАКВО ЧЕТЕ ═══
 *
 * Шапката (кредитополучател · сделка № · номер на договор · начало и край на
 * усвояване · начало и край на издължаване · салдо по редовна главница ·
 * валута) и ОСЕМТЕ колони: № · дата · вноска за главница · вноска за лихва ·
 * месечна вноска · такса · застраховка · общо. Накрая — редът „Общо:" с
 * шестте сбора на банката.
 *
 * Чете се ПО КООРДИНАТИ (`redoveOtBlokove`), както линейният график и КСС
 * (ADR-166): в ПДФ таблица няма, а числата на банката са подравнени ВДЯСНО —
 * тоест мястото им се мени от ред на ред. Колоната се познава по шапката си,
 * а не по вида на числото.
 *
 * ═══ ТРИТЕ СВЕРКИ (правило 7) ═══
 *
 *   1. главница + лихва = месечна вноска · банката е сметнала точно;
 *   2. вноска + такса + застраховка = общо;
 *   3. сборът на всяка колона = редът „Общо:" на самия файл.
 *
 * И трите се СМЯТАТ и се показват — включително когато разликата е нула.
 * Файл, който не се връзва, се показва с разликата си, а не се поправя тихо.
 *
 * ═══ КАКВО НЕ ПРАВИ ═══
 *
 * НЕ пише. НЕ превалутира — това е решение на входа и живее в
 * `zakonoviyat-lev.ts`, за да има ЕДИН дом (правило 17). НЕ гадае лихвен
 * процент: планът не го казва, а изведеното число се нарича изведено.
 */

import { redoveOtBlokove, type TekstovBlok } from '../iztochnik/pdf.js';

export interface VnoskaOtBankata {
  /** номерът на вноската във файла · ключът за идемпотентност */
  readonly nomer: string;
  /** YYYY-MM-DD */
  readonly data: string;
  readonly glavnitsa_st: number;
  readonly lihva_st: number;
  readonly vnoska_st: number;
  readonly taksa_st: number;
  readonly zastrahovka_st: number;
  readonly obshto_st: number;
}

export interface ShapkaNaPlana {
  readonly kreditopoluchatel: string;
  readonly sdelka: string;
  readonly dogovor: string;
  readonly nachaloIzdalzhavane: string;
  readonly krayIzdalzhavane: string;
  /** салдо по редовна главница, в цели най-малки единици НА ФАЙЛА */
  readonly saldo_st: number;
  /** „BGN" · „EUR" — както го пише файлът; празно значи „не го каза" */
  readonly valuta: string;
}

export interface Sborove {
  readonly glavnitsa_st: number;
  readonly lihva_st: number;
  readonly vnoska_st: number;
  readonly taksa_st: number;
  readonly zastrahovka_st: number;
  readonly obshto_st: number;
}

export interface ProchetenPlan {
  readonly shapka: ShapkaNaPlana;
  readonly vnoski: readonly VnoskaOtBankata[];
  /** колко номера е видял четецът · знаменателят на сверката */
  readonly nomera: number;
  /** ред с номер и дата, но без шестте числа */
  readonly propusnati: number;
  /** нашият сбор по колони */
  readonly sbor: Sborove;
  /** сборът, който казва самият файл (редът „Общо:") */
  readonly obyaven: Sborove;
  /** обявено минус наше · нулата се КАЗВА (правило 7) */
  readonly razlika: Sborove;
  /** вноски, при които главница + лихва ≠ вноска */
  readonly nevarzaniChasti: number;
  /** вноски, при които вноска + такса + застраховка ≠ общо */
  readonly nevarzanoObshto: number;
  /**
   * САЛДОТО ОТ ШАПКАТА минус сбора на главниците · петата сверка.
   *
   * „Салдо по редовна главница" е дългът; сборът на главниците в плана трябва
   * да го изплати до стотинка. Това е ПЪРВОТО, което се разминава в истински
   * файл — при частично усвояване, при предсрочно плащане, при план, изнесен
   * по средата. Нула значи „връзва се"; шапка без салдо дава нула, защото
   * няма с какво да се сверява.
   */
  readonly razlikaSaldo_st: number;
}

const PRAZNI_SBOROVE: Sborove = Object.freeze({
  glavnitsa_st: 0,
  lihva_st: 0,
  vnoska_st: 0,
  taksa_st: 0,
  zastrahovka_st: 0,
  obshto_st: 0,
});

/** „21.02.2025" · „21.2.2025" → 2025-02-21. Празно, ако не е дата. */
export function dataOtPlana(tekst: string): string {
  const nameren = /(\d{1,2})[.](\d{1,2})[.](\d{4})/.exec(tekst.trim());
  if (!nameren) return '';
  const den = Number(nameren[1]);
  const mesets = Number(nameren[2]);
  if (den < 1 || den > 31 || mesets < 1 || mesets > 12) return '';
  return `${nameren[3]}-${String(mesets).padStart(2, '0')}-${String(den).padStart(2, '0')}`;
}

/**
 * Число на банката · „4 634.41" · „1 336,38" · „ 0.00" → цели стотни.
 *
 * Банката пише ТОЧКА за дробното и интервал за хилядите; българският Excel
 * пише запетая. Приемат се и двете, защото и двете идват от истински файлове.
 */
export function chisloOtPlana(tekst: string): number | null {
  const chisto = tekst.replace(/[\s  ']/g, '');
  if (!/^-?\d+([.,]\d{1,2})?$/.test(chisto)) return null;
  const otritsatelno = chisto.startsWith('-');
  const bezZnak = otritsatelno ? chisto.slice(1) : chisto;
  const [tsyala = '0', drobna = ''] = bezZnak.split(/[.,]/);
  const sbor = Number(tsyala) * 100 + Number(drobna.padEnd(2, '0'));
  return otritsatelno ? -sbor : sbor;
}

/** Шест числа от ред, отляво надясно · липсващото е нула, не липса. */
function shestteChisla(kletki: readonly string[]): readonly number[] | null {
  const chisla: number[] = [];
  for (const k of kletki) {
    const chislo = chisloOtPlana(k);
    if (chislo !== null) chisla.push(chislo);
  }
  return chisla.length >= 6 ? chisla.slice(-6) : null;
}

function saberi(a: Sborove, v: VnoskaOtBankata): Sborove {
  return {
    glavnitsa_st: a.glavnitsa_st + v.glavnitsa_st,
    lihva_st: a.lihva_st + v.lihva_st,
    vnoska_st: a.vnoska_st + v.vnoska_st,
    taksa_st: a.taksa_st + v.taksa_st,
    zastrahovka_st: a.zastrahovka_st + v.zastrahovka_st,
    obshto_st: a.obshto_st + v.obshto_st,
  };
}

function razlikata(obyaven: Sborove, sbor: Sborove): Sborove {
  return {
    glavnitsa_st: obyaven.glavnitsa_st - sbor.glavnitsa_st,
    lihva_st: obyaven.lihva_st - sbor.lihva_st,
    vnoska_st: obyaven.vnoska_st - sbor.vnoska_st,
    taksa_st: obyaven.taksa_st - sbor.taksa_st,
    zastrahovka_st: obyaven.zastrahovka_st - sbor.zastrahovka_st,
    obshto_st: obyaven.obshto_st - sbor.obshto_st,
  };
}

/** Стойността срещу етикет от шапката · същия ред, вдясно от думата. */
function sledEtiketa(redove: readonly (readonly TekstovBlok[])[], etiket: string): string {
  for (const red of redove) {
    for (let i = 0; i < red.length; i += 1) {
      if (red[i]!.tekst.trim().toLocaleLowerCase('bg-BG').startsWith(etiket)) {
        const sled = red
          .slice(i + 1)
          .map((b) => b.tekst.trim())
          .filter((t) => t !== '' && t !== '№:');
        if (sled.length > 0) return sled[0]!;
      }
    }
  }
  return '';
}

/**
 * ЧЕТЕ ПЛАНА · шапката веднъж, вноските от всички страници.
 *
 * Шапката се повтаря на всеки лист — чете се от първия, на който я има, и не
 * се пише втори път. Редът „Общо:" стои само накрая.
 */
export function prochetiPogasitelenPlan(
  stranitsi: readonly (readonly TekstovBlok[])[],
): ProchetenPlan {
  const vnoski: VnoskaOtBankata[] = [];
  let nomera = 0;
  let propusnati = 0;
  let obyaven = PRAZNI_SBOROVE;
  let shapka: ShapkaNaPlana = {
    kreditopoluchatel: '',
    sdelka: '',
    dogovor: '',
    nachaloIzdalzhavane: '',
    krayIzdalzhavane: '',
    saldo_st: 0,
    valuta: '',
  };
  let shapkataEProchetena = false;

  for (const stranitsa of stranitsi) {
    const redove = redoveOtBlokove(stranitsa);

    if (!shapkataEProchetena) {
      const saldoTekst = sledEtiketa(redove, 'салдо по редовна главница');
      const dogovor = sledEtiketa(redove, 'номер на договор');
      if (saldoTekst !== '' || dogovor !== '') {
        shapka = {
          kreditopoluchatel: sledEtiketa(redove, 'кредитополучател'),
          sdelka: sledEtiketa(redove, 'сделка'),
          dogovor,
          nachaloIzdalzhavane: dataOtPlana(sledEtiketa(redove, 'начало на издължаване')),
          krayIzdalzhavane: dataOtPlana(sledEtiketa(redove, 'край на издължаване')),
          saldo_st: chisloOtPlana(saldoTekst) ?? 0,
          // Валутата стои ДО салдото, като отделно парче.
          valuta:
            redove
              .flat()
              .map((b) => b.tekst.trim())
              .find((t) => /^[A-Z]{3}$/.test(t)) ?? '',
        };
        shapkataEProchetena = shapka.dogovor !== '' || shapka.saldo_st > 0;
      }
    }

    for (const red of redove) {
      const kletki = red.map((b) => b.tekst.trim()).filter((t) => t !== '');
      if (kletki.length === 0) continue;

      if (/^общо\s*:?$/i.test(kletki[0] ?? '')) {
        const chisla = shestteChisla(kletki.slice(1));
        if (chisla) {
          obyaven = {
            glavnitsa_st: chisla[0]!,
            lihva_st: chisla[1]!,
            vnoska_st: chisla[2]!,
            taksa_st: chisla[3]!,
            zastrahovka_st: chisla[4]!,
            obshto_st: chisla[5]!,
          };
        }
        continue;
      }

      const nomer = kletki[0] ?? '';
      if (!/^\d{1,4}$/.test(nomer)) continue;
      const data = dataOtPlana(kletki[1] ?? '');
      if (data === '') continue; // ред с число, но без дата — не е вноска
      nomera += 1;
      const chisla = shestteChisla(kletki.slice(2));
      if (!chisla) {
        propusnati += 1;
        continue;
      }
      vnoski.push({
        nomer,
        data,
        glavnitsa_st: chisla[0]!,
        lihva_st: chisla[1]!,
        vnoska_st: chisla[2]!,
        taksa_st: chisla[3]!,
        zastrahovka_st: chisla[4]!,
        obshto_st: chisla[5]!,
      });
    }
  }

  const sbor = vnoski.reduce(saberi, PRAZNI_SBOROVE);
  // ФАЙЛ БЕЗ СВОЙ СБОР НЕ РАЖДА РАЗЛИКА · нула значи „няма с какво да се
  // сверява", а не „не се връзва". Иначе всеки лист без ред „Общо:" щеше да
  // изглежда счупен и хората щяха да свикнат да пренебрегват червеното.
  const kazvaSbor = obyaven.obshto_st !== 0 || obyaven.vnoska_st !== 0;
  return {
    shapka,
    vnoski: Object.freeze(vnoski),
    nomera,
    propusnati,
    sbor,
    obyaven,
    razlika: kazvaSbor ? razlikata(obyaven, sbor) : PRAZNI_SBOROVE,
    razlikaSaldo_st: shapka.saldo_st === 0 ? 0 : shapka.saldo_st - sbor.glavnitsa_st,
    nevarzaniChasti: vnoski.filter((v) => v.glavnitsa_st + v.lihva_st !== v.vnoska_st).length,
    nevarzanoObshto: vnoski.filter(
      (v) => v.vnoska_st + v.taksa_st + v.zastrahovka_st !== v.obshto_st,
    ).length,
  };
}

/** Има ли изобщо сбор от файла · нула значи „файлът не каза свой сбор". */
export function fayltKazvaSbor(p: ProchetenPlan): boolean {
  return p.obyaven.obshto_st !== 0 || p.obyaven.vnoska_st !== 0;
}

/**
 * `opId` НОСИ ДЕЙСТВИЕТО (правило 5 · 20) · планът на ЕДИН договор.
 *
 * Повторно четене на същия файл под същия кредит връща същия резултат, вместо
 * да сложи втори план. Номерът на договора е на БАНКАТА, не наш.
 */
export function opIdNaPlanaOtPDF(kreditId: string, dogovor: string): string {
  return `plan-pdf:${kreditId}:${dogovor}`;
}
