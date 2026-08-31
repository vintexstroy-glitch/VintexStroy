/**
 * РАЗБИВКАТА · „КАК СЕ СМЯТА", ред по ред.
 *
 * Негови думи (И96 т.2): „**Аз не разбирам как се смята**… да ми ги предложиш
 * **с разлика в цената в 2 графи как се смята** и какви стойности ти трябват…
 * с **легенда и пример за коефициент**."
 *
 * Затова тук няма едно число накрая. Има РЕДОВЕ: всеки казва какво прави, с
 * какво, колко мени и защо. Сборът им е цената, и всеки ред може да се посочи
 * с пръст.
 *
 * ═══ ЗАЩО РАЗБИВКАТА Е ДАННИ, А НЕ ТЕКСТ ═══
 *
 * Ако редовете се сглобяваха като изречения на екрана, износът и тестът щяха да
 * се разминат с него. Тук редът е ЗАПИС с число; екранът го рисува, износът го
 * пише, тестът го събира. Едно място, три ползвателя.
 *
 * ═══ МЕЖДИННОТО СЕ ПРЕСМЯТА ОТ НАЧАЛОТО ═══
 *
 * Всеки ред носи резултата СЛЕД себе си — но той не се трупа от предишния
 * закръглен ред, а се смята наново от целия низ отначало. Иначе закръглянето
 * на всеки ред щеше да влезе в следващия, и накрая да се разминем с двигателя
 * (правило 3: закръгленото никога не влиза в сбор).
 */

import { pishi } from '../yadro/pari.js';
import { tsenaNagore } from '../yadro/valuta.js';
import { kvSmVM2, type VidObekt } from './chetene.js';
import {
  ostavashti_bt,
  saglasuvana,
  teglataZatvaryat,
  tsenaOtChasti,
  tsenaPoRazhod,
  type Saglasuvane,
} from './matritsa.js';
import {
  DOBAVKI,
  EDINITSA_BT,
  KOEFITSIENTI,
  dobavka_st,
  klas,
  kolkoMeni,
  matritsaOtNastroyki,
  stapka,
  vKoefitsient,
  vProtsent,
  type Koefitsient,
  type Nastroyki,
  type Stapka,
  type Tegla,
} from './nastroyki.js';

/** Какво прави един ред. Изброено поименно — не се гадае от съдържанието. */
export const DEYSTVIYA = ['osnova', 'umnozhi', 'dobavi', 'razdeli', 'zakragli'] as const;

export type Deystvie = (typeof DEYSTVIYA)[number];

export const ZNATSI: Readonly<Record<Deystvie, string>> = Object.freeze({
  osnova: '=',
  umnozhi: '×',
  dobavi: '+',
  razdeli: '÷',
  zakragli: '≈',
});

export interface RedNaRazbivka {
  /** какво е това · „изложение · юг" */
  readonly kakvo: string;
  readonly deystvie: Deystvie;
  /** входът на реда, изписан · „1,030" · „78,40 м² × 3 000,00 €" */
  readonly vhod: string;
  /** резултатът СЛЕД този ред, в цели центове */
  readonly mezhdinno_st: number;
  /** с колко ТОЗИ ред промени числото · това е „примерът за коефициент" на живо */
  readonly meni_st: number;
  /** легендата на реда · защо занаятът го брои */
  readonly zashto: string;
}

/** Какво влиза в сметката за един обект. */
export interface Vhod {
  readonly obekt: string;
  readonly vid: VidObekt;
  /** общата площ в цели квадратни сантиметри */
  readonly obshta_kvsm: number;
  /** брой добавки по ключ · „parkomyasto" → 1 */
  readonly dobavki: Readonly<Record<string, number>>;
  /** месечният наем в цели центове · 0 значи „няма" */
  readonly naem_mesechen_st: number;
  readonly naemOt: 'zhurnal' | 'matritsa';
}

interface Razbivka {
  readonly vhod: Vhod;
  /** ГРАФА А · за колко се ПРОДАВА */
  readonly a: readonly RedNaRazbivka[];
  /** ГРАФА Б · колко СТРУВА като актив */
  readonly b: readonly RedNaRazbivka[];
  /** ГРАФА В · колко СТРУВА да се построи */
  readonly v: readonly RedNaRazbivka[];
  /** СЪГЛАСУВАНАТА · трите, претеглени */
  readonly saglasuvaneto: readonly RedNaRazbivka[];
  /** А, точно · преди закръглянето; ТЯ влиза в сбор */
  readonly a_tochno_st: number;
  /** А, закръглена нагоре до стотица · показва се, НЕ влиза в сбор */
  readonly a_st: number;
  readonly b_tochno_st: number;
  readonly b_st: number;
  readonly v_tochno_st: number;
  readonly v_st: number;
  readonly saglasuvana_tochno_st: number;
  readonly saglasuvana_st: number;
  /** кои подходи са отпаднали от съгласуването · нулевите */
  readonly otpadnali: readonly string[];
  /** теглата СЛЕД пренормирането · те са онези, с които е смятано */
  readonly deystvashti_tegla: Tegla;
  /** Б − А, в цели центове · знакът е информацията */
  readonly razlika_st: number;
  /** същата разлика в базисни точки спрямо А · 0 при нулева А */
  readonly razlika_bt: number;
  /**
   * ПОДРАЗБИРАЩАТА СЕ ДОХОДНОСТ · годишният чист доход ÷ цената по площ.
   *
   * Числото, което свързва двете графи: то казва каква доходност се получава,
   * ако обектът се купи на цената от Графа А. Падне ли много под скалата,
   * значи или наемът е под пазара, или цената е над онова, което доходът
   * оправдава — и решава човекът, не приложението.
   */
  readonly podrazbirashtaSe_bt: number;
}

/** Примерният обект — за да има какво да се показва, преди да е прочетен файл. */
export const PRIMEREN_OBEKT: Vhod = Object.freeze({
  obekt: 'Апартамент 5 · пример',
  vid: 'apartament' as const,
  obshta_kvsm: 784_000, // 78,40 м²
  dobavki: Object.freeze({ parkomyasto: 1 }),
  naem_mesechen_st: 540_00,
  naemOt: 'matritsa' as const,
});

// ── ГРАФА А · по площ ──────────────────────────────────────────────────────

/**
 * Коефициентите, приложени по ред · и какво мени всеки.
 *
 * Редът на умножението не мени резултата (умножението е разместимо), но мени
 * КОЛОНАТА „мени" — а тя е обяснението. Затова редът е фиксиран и е онзи, по
 * който човек оглежда имот: етаж, състояние, изложение, възраст, асансьор.
 */
function redoveNaA(n: Nastroyki, v: Vhod): RedNaRazbivka[] {
  const baza_st = n.baza_st[v.vid] ?? 0;
  const redove: RedNaRazbivka[] = [];

  const osnova_st = tsenaOtChasti({ obshta_kvsm: v.obshta_kvsm, baza_st, koefitsienti_bt: [] });
  redove.push({
    kakvo: `площ × база · ${v.vid === 'apartament' ? 'жилищна' : v.vid}`,
    deystvie: 'osnova',
    vhod: `${kvSmVM2(v.obshta_kvsm)} м² × ${pishi(baza_st)}/м²`,
    mezhdinno_st: osnova_st,
    meni_st: osnova_st,
    zashto: 'Базата е цената на квадратен метър за района. Оттук тръгва всичко.',
  });

  const dosega: number[] = [];
  let predi_st = osnova_st;
  for (const k of KOEFITSIENTI) {
    const s = stapka(k, n.izbrani[k.klyuch]);
    dosega.push(s.bt);
    const sega_st = tsenaOtChasti({
      obshta_kvsm: v.obshta_kvsm,
      baza_st,
      koefitsienti_bt: [...dosega],
    });
    redove.push({
      kakvo: `${k.ime.toLowerCase()} · ${s.ime}`,
      deystvie: 'umnozhi',
      vhod: vKoefitsient(s.bt),
      mezhdinno_st: sega_st,
      meni_st: sega_st - predi_st,
      zashto: k.zashto,
    });
    predi_st = sega_st;
  }

  // ДОБАВКИТЕ · след умножението, и всяка се вижда поотделно
  for (const d of DOBAVKI) {
    const broy = v.dobavki[d.klyuch] ?? 0;
    if (broy <= 0) continue;
    const koeto_st = dobavka_st(d, { broy, kvsm: v.obshta_kvsm, baza_st });
    if (koeto_st === 0) continue;
    predi_st += koeto_st;
    redove.push({
      kakvo: `${d.ime.toLowerCase()}${d.vid === 'broy' && broy > 1 ? ` · ${broy} броя` : ''}`,
      deystvie: 'dobavi',
      vhod: d.vid === 'broy' ? pishi(d.stoynost) : `${vProtsent(d.stoynost)} от базата`,
      mezhdinno_st: predi_st,
      meni_st: koeto_st,
      zashto: d.zashto,
    });
  }

  const gore_st = tsenaNagore(predi_st);
  redove.push({
    kakvo: 'цена за продажба',
    deystvie: 'zakragli',
    vhod: 'нагоре до стотица',
    mezhdinno_st: gore_st,
    meni_st: gore_st - predi_st,
    zashto:
      'Цените се закръглят НАГОРЕ до цяло, а сметките — към най-близкото. ' +
      'Закръгленото се показва; в сбора влиза точното.',
  });
  return redove;
}

// ── ГРАФА Б · по доходност ─────────────────────────────────────────────────

/** Точното междинно на Графа Б след `stapki` множителя — от началото, наведнъж. */
function bDoTuk(naem_mesechen_st: number, mnozhiteli_bt: readonly number[], dohodnost_bt?: number): number {
  let gore = BigInt(naem_mesechen_st) * 12n;
  let dolu = 1n;
  for (const bt of mnozhiteli_bt) {
    gore *= BigInt(bt);
    dolu *= BigInt(EDINITSA_BT);
  }
  if (dohodnost_bt !== undefined) {
    gore *= BigInt(EDINITSA_BT);
    dolu *= BigInt(dohodnost_bt);
  }
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

function redoveNaB(n: Nastroyki, v: Vhod): RedNaRazbivka[] {
  const redove: RedNaRazbivka[] = [];
  if (v.naem_mesechen_st <= 0) return redove;

  const godishen_st = v.naem_mesechen_st * 12;
  redove.push({
    kakvo: 'годишен наем',
    deystvie: 'osnova',
    vhod: `${pishi(v.naem_mesechen_st)} × 12 месеца`,
    mezhdinno_st: godishen_st,
    meni_st: godishen_st,
    zashto:
      v.naemOt === 'zhurnal'
        ? 'ДЕЙСТВИТЕЛНИЯТ наем от Журнала. Факт бие предположение — това е предимството, ' +
          'което калкулатор без счетоводство няма.'
        : 'ОЧАКВАН наем по вид и площ, защото за този обект Журналът още не носи наем.',
  });

  const zaet_bt = EDINITSA_BT - n.nezaetost_bt;
  const sled_zaetost_st = bDoTuk(v.naem_mesechen_st, [zaet_bt]);
  redove.push({
    kakvo: 'заетост',
    deystvie: 'umnozhi',
    vhod: vKoefitsient(zaet_bt),
    mezhdinno_st: sled_zaetost_st,
    meni_st: sled_zaetost_st - godishen_st,
    zashto: `Незаетост ${vProtsent(n.nezaetost_bt)} — колко от годината обектът стои празен. Празният месец е загубен приход, не отложен.`,
  });

  const chist_bt = EDINITSA_BT - n.operativni_bt;
  const chod_st = bDoTuk(v.naem_mesechen_st, [zaet_bt, chist_bt]);
  redove.push({
    kakvo: 'нетен оперативен доход',
    deystvie: 'umnozhi',
    vhod: vKoefitsient(chist_bt),
    mezhdinno_st: chod_st,
    meni_st: chod_st - sled_zaetost_st,
    zashto: `Оперативни разходи ${vProtsent(n.operativni_bt)} от наема — поддръжка, данъци, такси. Вноските по кредит НЕ влизат: те са на собственика, не на имота.`,
  });

  const k = klas(n.klas);
  const stoynost_st = bDoTuk(v.naem_mesechen_st, [zaet_bt, chist_bt], n.dohodnost_bt);
  redove.push({
    kakvo: `доходност · ${k.ime}`,
    deystvie: 'razdeli',
    vhod: vProtsent(n.dohodnost_bt),
    mezhdinno_st: stoynost_st,
    meni_st: stoynost_st - chod_st,
    zashto: `${k.zashto} Един процентен пункт мени стойността с около 20 % — затова числото се вижда и се мени.`,
  });

  const gore_st = tsenaNagore(stoynost_st);
  redove.push({
    kakvo: 'оценка на актива',
    deystvie: 'zakragli',
    vhod: 'нагоре до стотица',
    mezhdinno_st: gore_st,
    meni_st: gore_st - stoynost_st,
    zashto: 'Показва се закръглено; в сбора влиза точното.',
  });
  return redove;
}

// ── ДВЕТЕ ГРАФИ ЗАЕДНО ─────────────────────────────────────────────────────

// ── ГРАФА В · по разход ────────────────────────────────────────────────────

/**
 * В · КОЛКО СТРУВА ДА СЕ ПОСТРОИ · земя + строителна стойност − овехтяване.
 *
 * Редовете вървят в реда, по който човек оглежда себестойност: първо парцелът,
 * после строителството, накрая колко от него е изхабено. ЗЕМЯТА СТОИ ПЪРВА и
 * овехтяването НЕ я пипа — това е самата дефиниция на подхода и най-честата
 * грешка при него (`matritsa.ts` · `tsenaPoRazhod`).
 */
function redoveNaV(n: Nastroyki, v: Vhod): RedNaRazbivka[] {
  const redove: RedNaRazbivka[] = [];
  const zemya_st_kvm = n.zemya_st_kvm[v.vid] ?? 0;
  const stroitelna_st_kvm = n.stroitelna_st_kvm[v.vid] ?? 0;
  // ИЛИ, не И · едно липсващо число спира целия подход (`tsenaPoRazhod`), тъй
  // че разбивката не бива да рисува редове за сметка, която не се прави.
  if (v.obshta_kvsm <= 0 || zemya_st_kvm === 0 || stroitelna_st_kvm === 0) return redove;

  const m = matritsaOtNastroyki(n);
  const kvm = kvSmVM2(v.obshta_kvsm);

  // Земята сама · площ × цена на кв.м, делено ВЕДНЪЖ.
  const zemya_st = Number(
    (BigInt(v.obshta_kvsm) * BigInt(zemya_st_kvm) * 2n + 10_000n) / (10_000n * 2n),
  );
  redove.push({
    kakvo: 'земя',
    deystvie: 'osnova',
    vhod: `${kvm} м² × ${pishi(zemya_st_kvm)}`,
    mezhdinno_st: zemya_st,
    meni_st: zemya_st,
    zashto:
      'Парцелът, отнесен към площта на обекта. ЗЕМЯТА НЕ ОВЕХТЯВА — затова стои ' +
      'отделно от строителството и остава цяла, колкото и стара да е сградата.',
  });

  const stroitelna_st = Number(
    (BigInt(v.obshta_kvsm) * BigInt(stroitelna_st_kvm) * 2n + 10_000n) / (10_000n * 2n),
  );
  redove.push({
    kakvo: 'строителна стойност',
    deystvie: 'dobavi',
    vhod: `${kvm} м² × ${pishi(stroitelna_st_kvm)}`,
    mezhdinno_st: zemya_st + stroitelna_st,
    meni_st: stroitelna_st,
    zashto: 'Себестойността да се построи наново днес — груб строеж плюс довършване.',
  });

  const ostavashti = ostavashti_bt(m);
  const tselno_st = tsenaPoRazhod({ obshta_kvsm: v.obshta_kvsm, vid: v.vid, matritsa: m });
  redove.push({
    kakvo: 'овехтяване',
    deystvie: 'umnozhi',
    vhod: `${vKoefitsient(ostavashti)} върху строителството`,
    mezhdinno_st: tselno_st,
    meni_st: tselno_st - (zemya_st + stroitelna_st),
    zashto:
      `Възраст ${n.vazrast_g} г. при полезен живот ${n.polezen_zhivot_g} г. — остават ` +
      `${vProtsent(ostavashti)} от сградата. Множителят пипа САМО строителството; ` +
      'приложен върху сбора, той щеше да яде и земята.',
  });

  const gore_st = tsenaNagore(tselno_st);
  redove.push({
    kakvo: 'възстановителна стойност',
    deystvie: 'zakragli',
    vhod: 'нагоре до стотица',
    mezhdinno_st: gore_st,
    meni_st: gore_st - tselno_st,
    zashto: 'Показва се закръглено; в сбора влиза точното.',
  });
  return redove;
}

// ── СЪГЛАСУВАНЕТО · претеглената от трите ──────────────────────────────────

/**
 * СЪГЛАСУВАНАТА · всеки подход с теглото си и с приноса си В ПАРИ.
 *
 * Негово искане: „легенда и ПРИМЕР за коефициент". Тегло 0,70 не значи нищо,
 * докато не се види колко евро внася. Затова всеки ред казва и двете.
 *
 * Отпадналите подходи (нулева стойност) се показват с ПРЕНОРМИРАНОТО тегло,
 * не с първоначалното: числото на екрана е онова, с което е смятано.
 */
function redoveNaSaglasuvaneto(
  n: Nastroyki,
  a_tochno_st: number,
  b_tochno_st: number,
  v_tochno_st: number,
): { readonly redove: readonly RedNaRazbivka[]; readonly sag: Saglasuvane } {
  // ТЕГЛА, КОИТО НЕ ЗАТВАРЯТ · графата мълчи, вместо разбивката да падне.
  // Пазачът е в `saglasuvana` и си стои строг; тук се ПИТА, преди да се вика.
  if (!teglataZatvaryat(n.tegla)) {
    return {
      redove: [],
      sag: {
        tochno_st: 0,
        deystvashti: { pazaren_bt: 0, dohoden_bt: 0, razhoden_bt: 0 },
        otpadnali: [],
      },
    };
  }
  const sag = saglasuvana({
    pazaren_st: a_tochno_st,
    dohoden_st: b_tochno_st,
    razhoden_st: v_tochno_st,
    tegla: n.tegla,
  });
  const chasti = [
    { ime: 'А · по площ', st: a_tochno_st, bt: sag.deystvashti.pazaren_bt },
    { ime: 'Б · по състояние', st: b_tochno_st, bt: sag.deystvashti.dohoden_bt },
    { ime: 'В · по разход', st: v_tochno_st, bt: sag.deystvashti.razhoden_bt },
  ];

  const redove: RedNaRazbivka[] = [];
  let dotuk_st = 0;
  for (const [i, c] of chasti.entries()) {
    const prinos_st = Number(
      (BigInt(c.st) * BigInt(c.bt) * 2n + BigInt(EDINITSA_BT)) / (BigInt(EDINITSA_BT) * 2n),
    );
    dotuk_st += prinos_st;
    redove.push({
      kakvo: `${c.ime} · ${vProtsent(c.bt)}`,
      deystvie: i === 0 ? 'osnova' : 'dobavi',
      vhod: `${pishi(c.st)} × ${vKoefitsient(c.bt)}`,
      mezhdinno_st: dotuk_st,
      meni_st: prinos_st,
      zashto:
        c.bt === 0
          ? 'Този подход НЕ участва: стойността му е нула и теглото му е пренасочено ' +
            'към останалите. Иначе цената щеше да падне, без някой да е решавал.'
          : `Теглото е ${vProtsent(c.bt)} от съгласуваната цена.`,
    });
  }

  const gore_st = tsenaNagore(sag.tochno_st);
  redove.push({
    kakvo: 'съгласувана цена',
    deystvie: 'zakragli',
    vhod: 'нагоре до стотица',
    mezhdinno_st: gore_st,
    meni_st: gore_st - sag.tochno_st,
    zashto: 'Показва се закръглено; в сбора влиза точното.',
  });
  return { redove, sag };
}

export function razbivka(n: Nastroyki, v: Vhod): Razbivka {
  const a = redoveNaA(n, v);
  const b = redoveNaB(n, v);
  const vGrafa = redoveNaV(n, v);
  // Точното е междинното на реда ПРЕДИ закръглянето; закръгленото е последното.
  const a_tochno_st = a.length >= 2 ? a[a.length - 2]!.mezhdinno_st : 0;
  const a_st = a.length ? a[a.length - 1]!.mezhdinno_st : 0;
  const b_tochno_st = b.length >= 2 ? b[b.length - 2]!.mezhdinno_st : 0;
  const b_st = b.length ? b[b.length - 1]!.mezhdinno_st : 0;
  const v_tochno_st = vGrafa.length >= 2 ? vGrafa[vGrafa.length - 2]!.mezhdinno_st : 0;
  const v_st = vGrafa.length ? vGrafa[vGrafa.length - 1]!.mezhdinno_st : 0;
  const sag = redoveNaSaglasuvaneto(n, a_tochno_st, b_tochno_st, v_tochno_st);

  const zaet_bt = EDINITSA_BT - n.nezaetost_bt;
  const chist_bt = EDINITSA_BT - n.operativni_bt;
  const chod_st = v.naem_mesechen_st > 0 ? bDoTuk(v.naem_mesechen_st, [zaet_bt, chist_bt]) : 0;

  return Object.freeze({
    vhod: v,
    a: Object.freeze(a),
    b: Object.freeze(b),
    v: Object.freeze(vGrafa),
    saglasuvaneto: Object.freeze(sag.redove),
    a_tochno_st,
    a_st,
    b_tochno_st,
    b_st,
    v_tochno_st,
    v_st,
    saglasuvana_tochno_st: sag.sag.tochno_st,
    saglasuvana_st: tsenaNagore(sag.sag.tochno_st),
    otpadnali: sag.sag.otpadnali,
    deystvashti_tegla: sag.sag.deystvashti,
    razlika_st: b_tochno_st - a_tochno_st,
    razlika_bt: vBT(a_tochno_st, b_tochno_st),
    podrazbirashtaSe_bt:
      a_tochno_st > 0 && chod_st > 0 ? Math.round((chod_st * EDINITSA_BT) / a_tochno_st) : 0,
  });
}

/** Отношението на две суми в цели базисни точки; нула при нулева основа. */
function vBT(osnova_st: number, drugo_st: number): number {
  if (osnova_st === 0) return 0;
  return Math.round(((drugo_st - osnova_st) * EDINITSA_BT) / osnova_st);
}

// ── ЛЕГЕНДАТА И ПРИМЕРЪТ ───────────────────────────────────────────────────

/** Един ред от примера: стъпка, коефициент, и колко ПАРИ мени тя тук. */
interface PrimerenRed {
  readonly stapka: Stapka;
  /** с колко процента мени · „−8,00 %" */
  readonly meni: string;
  /** с колко ПАРИ мени върху тази основа */
  readonly meni_st: number;
  /** избрана ли е тя сега */
  readonly izbrana: boolean;
}

/**
 * ПРИМЕРЪТ ЗА КОЕФИЦИЕНТ · негово изрично искане.
 *
 * „…и ги напиши като възможно за въвеждане **с легенда и пример за
 * коефициент**." Процентът сам по себе си не е пример — 0,92 не значи нищо,
 * докато не се види върху ЧИСЛО. Затова всяка стъпка се показва с това, което
 * прави ВЪРХУ ТОЗИ обект: „партер · 0,920 · −8,00 % · −18 816,00 €".
 *
 * Основата е цената ПРЕДИ този коефициент — иначе примерът би зависел от реда,
 * в който коефициентите се умножават, а той е избран за четимост, не за смисъл.
 */
export function primerZaKoefitsient(
  k: Koefitsient,
  n: Nastroyki,
  osnova_st: number,
): readonly PrimerenRed[] {
  return Object.freeze(
    k.stapki.map((s) => {
      const sled_st = Math.round((osnova_st * s.bt) / EDINITSA_BT);
      return Object.freeze({
        stapka: s,
        meni: kolkoMeni(s.bt),
        meni_st: sled_st - osnova_st,
        izbrana: n.izbrani[k.klyuch] === s.klyuch,
      });
    }),
  );
}

/**
 * ОСНОВАТА ЗА ПРИМЕРА · цената по площ, без нито един коефициент.
 *
 * Едно число за всички менюта: така стъпките на различните коефициенти се
 * СРАВНЯВАТ помежду си. Основа, различна за всяко меню, би направила
 * „−8 %" при етажа и „−8 %" при състоянието различни пари — вярно за
 * умножението, но нечетимо за човек.
 */
export function osnovaZaPrimera(n: Nastroyki, v: Vhod): number {
  return tsenaOtChasti({
    obshta_kvsm: v.obshta_kvsm,
    baza_st: n.baza_st[v.vid] ?? 0,
    koefitsienti_bt: [],
  });
}

/**
 * СВЕРКА НА РАЗБИВКАТА (правило 7) · сборът на редовете Е цената.
 *
 * Всеки ред казва с колко мени; сборът на „мени" трябва да даде показаното
 * число. Разликата се връща ДОРИ когато е нула — проверената нула е различна
 * от нулата, за която никой не е питал.
 */
export function sverkaNaRazbivkata(r: Razbivka): {
  readonly a: number;
  readonly b: number;
} {
  const sbor = (redove: readonly RedNaRazbivka[]): number =>
    redove.reduce((s, x) => s + x.meni_st, 0);
  return {
    a: sbor(r.a) - r.a_st,
    b: r.b.length === 0 ? 0 : sbor(r.b) - r.b_st,
  };
}
