/**
 * СТОЙНОСТ НА СЪСТОЯНИЕ (КАЛКУЛАТОР) · сборът Е стойността.
 *
 * Негови думи (23.08), които дадоха и името, и сметката:
 *
 *   „**Новото име е Стойност на Състояние (Калкулатор).** Пресмята всичките
 *    налични имоти в движение като наеми и продажби, и вкарани през Управление
 *    се появяват в Калкулатора; намираш се в Стойност на Състояние, където
 *    **сборът е тази стойност на състоянието общо**. Другото е старо име."
 *
 * И от по-рано, за същото място:
 *
 *   „…казва се Стойност на Състояние и **няма редакция оттам, а само
 *    изчисляване** на стойност на имотите като оценка на всички наши активи…
 *    и е калкулатор за пресмятане на стойността на всеки обект и цялата
 *    стойност." *(09.08)*
 *
 * ЗАТОВА ТУК НЯМА НИТО ЕДИН ЗАПИС. Този файл смята и връща; какво влиза в
 * Журнала, решава Вратата отвън. „Няма редакция оттам" е негово изречение и е
 * изпълнено буквално.
 *
 * ПРОДАДЕНОТО НЕ ВЛИЗА. В неговата ценова листа продаденият обект носи думата
 * „ПРОДАДЕН" на мястото на цената — това е сигналът, не отделна колона. Обект,
 * който вече не е негов, не е част от стойността на състоянието.
 *
 * ЗАКРЪГЛЯНЕТО Е ВЕДНЪЖ, НАКРАЯ. Цената на всеки обект се закръгля НАГОРЕ до
 * стотица (негово правило, и неговата листа го потвърждава — всяка цена там
 * завършва на две нули). Но СБОРЪТ се смята от ТОЧНИТЕ цени и се закръгля
 * отделно: закръгленото никога не влиза в сбор (ADR-012).
 */

import { razlikaOtZakraglyane, tsenaNagore, zakragli } from '../yadro/valuta.js';
import {
  evroNaKvadrat_st,
  MATRITSA_ZA_RAZRABOTKA,
  ochakvanNaem_st,
  saglasuvana,
  teglataZatvaryat,
  tsenaPoRazhod,
  tsenaPoSastoyanie,
  tsenaTochno,
  type Matritsa,
} from './matritsa.js';
import { obshtiChasti_kvsm, type ProchetenObekt, type VidObekt } from './chetene.js';
import { deystvitelenNaem_st } from './svarzvane.js';

/** Каквото ценовата листа знае за обекта, а площообразуването — не. */
export interface OtTsenovaLista {
  /** „СИ" · „Ю" · празно, ако още не е известно */
  readonly izlozhenie: string;
  /** брой стаи; 0 значи „не се знае" */
  readonly stai: number;
  /** тераси в кв.см; 0 значи „няма" */
  readonly terasi_kvsm: number;
  /** ПРОДАДЕН ли е — тогава не влиза в стойността */
  readonly prodaden: boolean;
}

const PRAZNO_OT_LISTA: OtTsenovaLista = Object.freeze({
  izlozhenie: '',
  stai: 0,
  terasi_kvsm: 0,
  prodaden: false,
});

/** Един ред на екрана Стойност на Състояние. */
export interface RedNaStoynost {
  readonly obekt: string;
  readonly vid: VidObekt;
  readonly etazh: string;
  readonly kota: string;
  readonly chista_kvsm: number;
  readonly obshti_chasti_kvsm: number;
  readonly obshta_kvsm: number;
  readonly izlozhenie: string;
  readonly stai: number;
  readonly terasi_kvsm: number;
  readonly prodaden: boolean;
  /** А · цената ПО ПЛОЩ, точно, преди закръгляне — тя влиза в сбора */
  readonly tsena_tochno_st: number;
  /** А · цената ПО ПЛОЩ, показана · нагоре до стотица; НЕ влиза в сбор */
  readonly tsena_st: number;
  /** евро на квадрат, от показаната цена — както е в неговата листа */
  readonly evroNaKvadrat_st: number;
  /** Б · СТОЙНОСТТА ПО СЪСТОЯНИЕ, точно — влиза във втория сбор */
  readonly sastoyanie_tochno_st: number;
  /** Б · същата, нагоре до стотица */
  readonly sastoyanie_st: number;
  /** Б · евро на квадрат по състояние */
  readonly sastoyanieNaKvadrat_st: number;
  /** месечният наем, с който Б е сметната */
  readonly naem_mesechen_st: number;
  /**
   * Откъде е наемът: `zhurnal` — действителен, записан за този имот;
   * `matritsa` — очакван по вид и площ. Екранът го КАЗВА, защото разликата
   * между двете е разликата между факт и предположение.
   */
  readonly naemOt: 'zhurnal' | 'matritsa';
  /**
   * Δ · с колко Б стои под или над А, в цели базисни точки.
   * Отрицателно значи, че оценката е под продажната цена — обичайното при
   * ново строителство. Нула, когато А е нула.
   */
  readonly razlika_bt: number;
  /** В · РАЗХОДНАТА стойност, точно · влиза в третия сбор */
  readonly razhod_tochno_st: number;
  /** В · същата, нагоре до стотица */
  readonly razhod_st: number;
  /** В · евро на квадрат по разход */
  readonly razhodNaKvadrat_st: number;
  /** СЪГЛАСУВАНАТА · претеглената от трите, точно · влиза в четвъртия сбор */
  readonly saglasuvana_tochno_st: number;
  /** СЪГЛАСУВАНАТА, нагоре до стотица */
  readonly saglasuvana_st: number;
  /** евро на квадрат по съгласуваната */
  readonly saglasuvanaNaKvadrat_st: number;
  /**
   * Кои подходи са ОТПАДНАЛИ при съгласуването, защото дават нула.
   *
   * Обект без наем няма доходна стойност. Отпадането се КАЗВА на реда, вместо
   * теглото му да се изяде мълчаливо — иначе цената пада с толкова процента,
   * колкото е било теглото, и никой не знае защо (правило 15).
   */
  readonly otpadnali: readonly string[];
}

/** Стойността на състоянието: редовете и сборът им. */
export interface StoynostNaSastoyanie {
  readonly redove: readonly RedNaStoynost[];
  /** А · сборът от ТОЧНИТЕ цени по площ */
  readonly obshto_tochno_st: number;
  /** А · същият сбор, закръглен веднъж към най-близката стотица — за екрана */
  readonly obshto_st: number;
  /** А · колко „изяде" закръглянето — вижда се, не се преглъща (правило 7) */
  readonly razlika_st: number;
  /** Б · сборът от точните стойности по състояние */
  readonly sastoyanie_tochno_st: number;
  /** Б · същият, закръглен веднъж */
  readonly sastoyanie_st: number;
  /**
   * Б · КОЛКО ИЗЯДЕ ЗАКРЪГЛЯНЕТО и при него.
   *
   * Дотук го нямаше, а плочката на Б показваше закръглен сбор — точно както А,
   * само че мълчешком. Двете плочки стоят една до друга и обещават едно и също;
   * обещание, спазено от едната, е по-лошо от неспазено и от двете, защото
   * човекът се научава да вярва на надписа.
   */
  readonly razlika_sastoyanie_st: number;
  /** Δ на двата сбора, в цели базисни точки */
  readonly razlika_na_metodite_bt: number;
  /** В · сборът от точните разходни стойности */
  readonly razhod_tochno_st: number;
  /** В · същият, закръглен веднъж */
  readonly razhod_st: number;
  /** В · колко изяде закръглянето · всяка плочка казва своето (правило 7) */
  readonly razlika_razhod_st: number;
  /** СЪГЛАСУВАНАТА · сборът от точните претеглени стойности */
  readonly saglasuvana_tochno_st: number;
  /** СЪГЛАСУВАНАТА · същият, закръглен веднъж */
  readonly saglasuvana_st: number;
  /** СЪГЛАСУВАНАТА · колко изяде закръглянето */
  readonly razlika_saglasuvana_st: number;
  /** колко обекта влизат в стойността */
  readonly broy: number;
  /** колко са пропуснати, защото са продадени */
  readonly prodadeni: number;
}

/**
 * СМЯТА стойността на състоянието.
 *
 * `otLista` дава изложението, стаите и терасите по име на обекта — те идват от
 * ценовата листа, не се измислят. Липсва ли обект в нея, коефициентът за
 * изложение е 1,00 и това е честно: неизвестното не мени цената.
 */
export function stoynostNaSastoyanie(
  obekti: readonly ProchetenObekt[],
  otLista: ReadonlyMap<string, OtTsenovaLista>,
  matritsa?: Matritsa,
  /** обект → действителен месечен наем от Журнала (`svarzvane.ts`) */
  naemiOtZhurnala: ReadonlyMap<string, number> = new Map(),
  /**
   * КОИ ОБЕКТИ ВЕЧЕ ИМАТ СДЕЛКА · продаденото се чете И от Журнала (29.08).
   *
   * Дотук единственият източник беше НЕГОВИЯТ файл. Негово: „Там избираш
   * продаден и го праща от цени в таб Продажби" — значи изборът ражда сделка,
   * а сделката е фактът. Двата източника се СЪБИРАТ: файлът пази заварените,
   * Журналът — направените оттук нататък.
   */
  prodadeniOtZhurnala: ReadonlySet<string> = new Set(),
  /**
   * КОИ РЕДОВЕ СА ЗЕМЯ · Имот със статут „земя" (резен 111 · ADR-170).
   *
   * Негово, 04.09: „**земя е Имот с различен Статут**", и как се смята:
   * „Само земята, без сграда и без наем."
   *
   * Тогава: В дава САМО земята (без строителна стойност и без овехтяване), а
   * Б отпада — празната земя няма очакван наем по площ, а измисленият наем би
   * родил доходна стойност от нищото. Действителен наем от Журнала обаче се
   * ЗАЧИТА: наета земя си е наета, и фактът бие правилото.
   */
  zemniRedove: ReadonlySet<string> = new Set(),
): StoynostNaSastoyanie {
  const redove: RedNaStoynost[] = [];
  let obshto_tochno_st = 0;
  let sastoyanie_tochno_st = 0;
  let razhod_sbor_tochno_st = 0;
  let saglasuvana_sbor_tochno_st = 0;
  let prodadeni = 0;

  for (const o of obekti) {
    const otFayla = otLista.get(o.obekt.trim()) ?? PRAZNO_OT_LISTA;
    const dop = prodadeniOtZhurnala.has(o.obekt.trim())
      ? { ...otFayla, prodaden: true }
      : otFayla;

    // ── А · ПО ПЛОЩ · продажната цена ────────────────────────────────────
    const tsena_tochno_st = tsenaTochno({
      obshta_kvsm: o.obshta_kvsm,
      vid: o.vid,
      etazh: o.etazh,
      izlozhenie: dop.izlozhenie,
      ...(matritsa ? { matritsa } : {}),
    });
    const tsena_st = tsenaNagore(tsena_tochno_st);

    // ── Б · ПО СЪСТОЯНИЕ · оценката ──────────────────────────────────────
    // Действителният наем БИЕ очаквания: факт над предположение.
    const zemya = zemniRedove.has(o.obekt.trim());
    const otZhurnala = deystvitelenNaem_st(o.obekt, naemiOtZhurnala);
    const naem_mesechen_st =
      otZhurnala !== undefined && otZhurnala > 0
        ? otZhurnala
        : zemya
          ? 0
          : ochakvanNaem_st(o.obshta_kvsm, o.vid, matritsa);
    const naemOt: 'zhurnal' | 'matritsa' =
      otZhurnala !== undefined && otZhurnala > 0 ? 'zhurnal' : 'matritsa';
    const sastoyanie_t_st = tsenaPoSastoyanie({
      naem_mesechen_st,
      ...(matritsa ? { matritsa } : {}),
    });
    const sastoyanie_st = tsenaNagore(sastoyanie_t_st);

    // ── В · ПО РАЗХОД · колко струва да се построи ───────────────────────
    // Земята НЕ овехтява; овехтява само сградата (`tsenaPoRazhod`).
    const razhod_tochno_st = tsenaPoRazhod({
      obshta_kvsm: o.obshta_kvsm,
      vid: o.vid,
      ...(matritsa ? { matritsa } : {}),
      ...(zemya ? { samoZemya: true } : {}),
    });
    const razhod_st = tsenaNagore(razhod_tochno_st);

    // ── СЪГЛАСУВАНАТА · претеглената от трите (методология §2.4) ─────────
    // Смята се от ТОЧНИТЕ, не от закръглените: закръгленото никога не влиза в
    // сметка, която ще се закръгля втори път (правило 3).
    // Тегла, които не затварят, НЕ раждат число (`saglasuvana` отказва) — но и
    // не събарят екрана: колоната мълчи и екранът казва защо (правило 15).
    const tegla = (matritsa ?? MATRITSA_ZA_RAZRABOTKA).tegla;
    const sag = teglataZatvaryat(tegla)
      ? saglasuvana({
          pazaren_st: tsena_tochno_st,
          dohoden_st: sastoyanie_t_st,
          razhoden_st: razhod_tochno_st,
          tegla,
        })
      : { tochno_st: 0, otpadnali: [] as readonly string[] };
    const saglasuvana_st = tsenaNagore(sag.tochno_st);

    if (dop.prodaden) {
      prodadeni += 1;
    } else {
      obshto_tochno_st += tsena_tochno_st;
      sastoyanie_tochno_st += sastoyanie_t_st;
      razhod_sbor_tochno_st += razhod_tochno_st;
      saglasuvana_sbor_tochno_st += sag.tochno_st;
    }

    redove.push({
      obekt: o.obekt,
      vid: o.vid,
      etazh: o.etazh,
      kota: o.kota,
      chista_kvsm: o.chista_kvsm,
      obshti_chasti_kvsm: obshtiChasti_kvsm(o),
      obshta_kvsm: o.obshta_kvsm,
      izlozhenie: dop.izlozhenie,
      stai: dop.stai,
      terasi_kvsm: dop.terasi_kvsm,
      prodaden: dop.prodaden,
      tsena_tochno_st,
      tsena_st,
      evroNaKvadrat_st: evroNaKvadrat_st(tsena_st, o.obshta_kvsm),
      sastoyanie_tochno_st: sastoyanie_t_st,
      sastoyanie_st,
      sastoyanieNaKvadrat_st: evroNaKvadrat_st(sastoyanie_st, o.obshta_kvsm),
      naem_mesechen_st,
      naemOt,
      razlika_bt: razlikaVBT(tsena_tochno_st, sastoyanie_t_st),
      razhod_tochno_st,
      razhod_st,
      razhodNaKvadrat_st: evroNaKvadrat_st(razhod_st, o.obshta_kvsm),
      saglasuvana_tochno_st: sag.tochno_st,
      saglasuvana_st,
      saglasuvanaNaKvadrat_st: evroNaKvadrat_st(saglasuvana_st, o.obshta_kvsm),
      otpadnali: sag.otpadnali,
    });
  }

  /**
   * ЕДНА ФУНКЦИЯ ЗА РАЗЛИКАТА, не изваждане на ръка.
   *
   * `razlika_st` дотук се смяташе тук като `obshto_st - obshto_tochno_st` —
   * дословно онова, което `razlikaOtZakraglyane` прави. Втори израз за едно
   * число (правило 17), при това вторият остави ИМЕНУВАНИЯ без нито един
   * викащ извън теста му, а ADR-012 го обявява за построен.
   */
  return {
    redove: Object.freeze(redove),
    obshto_tochno_st,
    obshto_st: zakragli(obshto_tochno_st, 'stotitsi'),
    razlika_st: razlikaOtZakraglyane(obshto_tochno_st, 'stotitsi'),
    sastoyanie_tochno_st,
    sastoyanie_st: zakragli(sastoyanie_tochno_st, 'stotitsi'),
    razlika_sastoyanie_st: razlikaOtZakraglyane(sastoyanie_tochno_st, 'stotitsi'),
    razlika_na_metodite_bt: razlikaVBT(obshto_tochno_st, sastoyanie_tochno_st),
    razhod_tochno_st: razhod_sbor_tochno_st,
    razhod_st: zakragli(razhod_sbor_tochno_st, 'stotitsi'),
    razlika_razhod_st: razlikaOtZakraglyane(razhod_sbor_tochno_st, 'stotitsi'),
    saglasuvana_tochno_st: saglasuvana_sbor_tochno_st,
    saglasuvana_st: zakragli(saglasuvana_sbor_tochno_st, 'stotitsi'),
    razlika_saglasuvana_st: razlikaOtZakraglyane(saglasuvana_sbor_tochno_st, 'stotitsi'),
    broy: redove.length - prodadeni,
    prodadeni,
  };
}

/**
 * С колко Б стои под или над А, в цели базисни точки.
 *
 * Нула при нулево А — деление на нула не се прави и не се измисля процент.
 * Знакът е важен: отрицателното значи, че оценката е ПОД продажната цена,
 * и точно това сравнение той поръча да се вижда.
 */
function razlikaVBT(a_st: number, b_st: number): number {
  if (a_st === 0) return 0;
  return Math.round(((b_st - a_st) * 10_000) / a_st);
}

/**
 * СВЕРКАТА ВХОД↔ИЗХОД на партидата (правило 7).
 *
 * Влизат N обекта от площообразуването → излизат N реда. Разликата се записва
 * ДОРИ когато е нула: проверената нула е различна от нулата, за която никой не
 * е питал.
 */
export function sverkaNaPartida(
  vhod: readonly ProchetenObekt[],
  izhod: StoynostNaSastoyanie,
): { readonly vhod: number; readonly izhod: number; readonly razlika: number } {
  const v = vhod.length;
  const i = izhod.redove.length;
  return { vhod: v, izhod: i, razlika: i - v };
}
