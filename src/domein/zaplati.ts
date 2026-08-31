/**
 * ЗАПЛАТИТЕ · седмицата, кеш-джобът и следата (резен 20 · ADR-080).
 *
 * Негови думи, дословно:
 *
 *   „Име, длъжност, обект, дневна ставка, брой дни, седмична заплата"
 *    *(р48·[71]·06.08)*
 *   „При заплати **Проект да е най отпред**" *(р48·[81])*
 *   „Прехвърли седмичните заплати в Разходи **да се прави ръчно**, когато се
 *    актуализира в Петък обикновенно, **трябва да се пази архив** на това и да
 *    **оставя следа в таба ЗАПЛАТИ**" *(р48·[83])*
 *   „За заплати добави **бутон за вкарване ма пари** и **поле което поксзва
 *    салдо на кеша** за Заплати о Фактури Кеш, които се записват заедно."
 *    *(р75·[32])*
 *   „**Замрази седмицата**" *(р65·[24])*
 *
 * ═══ ЗАЩО СЕДМИЦА, А НЕ МЕСЕЦ ═══
 *
 * Заплатата се актуализира „в Петък обикновенно" — тя е СЕДМИЧНО понятие, за
 * разлика от ДДС-то, което е месечно по закон. Двата периода не се сливат:
 * седмицата решава кое се прехвърля наведнъж, месецът — кое е заключено.
 *
 * ═══ КАКВО СЕ СМЯТА И КАКВО СЕ ПИШЕ ═══
 *
 * ПИШЕ СЕ: име · длъжност · проект · обект · дневна ставка · брой дни.
 * СМЯТА СЕ: седмичната заплата (ставка × дни), сборът на седмицата, и дали
 * седмицата е прехвърлена.
 *
 * Записана като поле, седмичната заплата щеше да се разминава с двата си
 * множителя в деня, в който единият се поправи — а разминаването се вижда
 * като грешна сума пред човек, не като грешка (правило 17).
 */

export class GreshkaZaplata extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaZaplata';
  }
}

// ── СЕДМИЦАТА ──────────────────────────────────────────────────────────────

/**
 * ISO-СЕДМИЦАТА на една дата · `ГГГГ-Wnn`, и ЕДИН дом за въпроса.
 *
 * ISO, а не „седми ден от годината": седмицата почва в ПОНЕДЕЛНИК и принадлежи
 * на годината, в която пада четвъртъкът ѝ. Затова 1 януари понякога е седмица
 * 52 на МИНАЛАТА година — и точно това би разцепило една заплата на две
 * години, ако се броеше наивно.
 */
export function sedmitsataNa(data: string): string {
  const [g, m, d] = data.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(g, m - 1, d));
  // Четвъртъкът на същата седмица решава ГОДИНАТА (неделя = 7, не 0).
  const den = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
  t.setUTCDate(t.getUTCDate() + 4 - den);
  const godina = t.getUTCFullYear();
  const parviYanuari = new Date(Date.UTC(godina, 0, 1));
  const nomer = Math.ceil(((t.getTime() - parviYanuari.getTime()) / 86_400_000 + 1) / 7);
  return `${godina}-W${String(nomer).padStart(2, '0')}`;
}

/** Понеделникът и неделята на една ISO-седмица · за екрана и за отказите. */
export function dnitteNaSedmitsata(sedmitsa: string): { readonly ot: string; readonly do_: string } {
  const godina = Number(sedmitsa.slice(0, 4));
  const nomer = Number(sedmitsa.slice(6));
  const chetvartak = new Date(Date.UTC(godina, 0, 4));
  const den = chetvartak.getUTCDay() === 0 ? 7 : chetvartak.getUTCDay();
  const ponedelnik = new Date(chetvartak.getTime() + (nomer - 1) * 7 * 86_400_000 - (den - 1) * 86_400_000);
  const nedelya = new Date(ponedelnik.getTime() + 6 * 86_400_000);
  return Object.freeze({
    ot: ponedelnik.toISOString().slice(0, 10),
    do_: nedelya.toISOString().slice(0, 10),
  });
}

// ── ЗАПИСИТЕ ───────────────────────────────────────────────────────────────

export interface RedNaZaplata {
  readonly id: string;
  readonly seq: number;
  /** ISO-седмицата `ГГГГ-Wnn` · СМЯТА се от датата при записа */
  readonly sedmitsa: string;
  /** „Проект да е най отпред" · празен е позволен и се КАЗВА */
  readonly proektId: string;
  readonly ime: string;
  readonly dlazhnost: string;
  readonly obekt: string;
  readonly dnevna_st: number;
  readonly dni: number;
}

export interface PrehvarlenaSedmitsa {
  readonly sedmitsa: string;
  /** id-то на разхода, който прехвърлянето роди */
  readonly razhodId: string;
  readonly suma_st: number;
  readonly kogato: string;
  readonly koy: string;
  /** заключена ли е седмицата · „Замрази седмицата" */
  readonly zamrazena: boolean;
}

export interface ZahranvaneNaKesha {
  readonly id: string;
  readonly seq: number;
  readonly suma_st: number;
  readonly data: string;
  readonly belezhka: string;
}

/** Онова от Огледалото, което заплатите четат · нищо повече. */
export interface OgledaloNaZaplati {
  readonly zaplati: ReadonlyMap<string, RedNaZaplata>;
  readonly prehvarleniSedmitsi: ReadonlyMap<string, PrehvarlenaSedmitsa>;
  readonly zahranvaniyaNaKesha: readonly ZahranvaneNaKesha[];
}

// ── КОЛОНИТЕ ───────────────────────────────────────────────────────────────

/**
 * Неговите шест полета, с ПРОЕКТА най-отпред.
 *
 * „При заплати Проект да е най отпред" *(р48·[81])* — това е негова наредба,
 * не подредба по азбука, и затова стои в СПИСЪК, който тест брои.
 */
export const KOLONI_ZAPLATI: readonly string[] = Object.freeze([
  'Проект',
  'Име',
  'Длъжност',
  'Обект',
  'Дневна ставка',
  'Дни',
  'Седмична заплата',
]);

/** Последната колона се СМЯТА · тя не се редактира от никого (правило 23). */
export const ZATVORENI_ZAPLATI: readonly number[] = Object.freeze([6]);

// ── СМЕТКИТЕ ───────────────────────────────────────────────────────────────

/**
 * СЕДМИЧНАТА ЗАПЛАТА · дневна ставка × брой дни, цели центове.
 *
 * Няма деление, значи няма остатък и няма закръгляне — най-чистият случай на
 * правило 3. Проверява се само, че двете влизащи числа са цели.
 */
export function sedmichnaZaplata(r: Pick<RedNaZaplata, 'dnevna_st' | 'dni'>): number {
  if (!Number.isSafeInteger(r.dnevna_st) || !Number.isSafeInteger(r.dni)) {
    throw new GreshkaZaplata('Дневната ставка е в цели центове, а дните — цяло число.');
  }
  return r.dnevna_st * r.dni;
}

/** Редовете на една седмица · подредени по реда на записа. */
export function redoveNaSedmitsata(
  o: OgledaloNaZaplati,
  sedmitsa: string,
): readonly RedNaZaplata[] {
  return Object.freeze(
    [...o.zaplati.values()].filter((r) => r.sedmitsa === sedmitsa).sort((a, b) => a.seq - b.seq),
  );
}

/** СБОРЪТ на една седмица · сборът на редовете ѝ, нищо друго. */
export function sboraNaSedmitsata(o: OgledaloNaZaplati, sedmitsa: string): number {
  let sbor = 0;
  for (const r of redoveNaSedmitsata(o, sedmitsa)) sbor += sedmichnaZaplata(r);
  return sbor;
}

/** Всички седмици със записи · най-новата отпред. */
export function sedmitsiteSZapisi(o: OgledaloNaZaplati): readonly string[] {
  return Object.freeze([...new Set([...o.zaplati.values()].map((r) => r.sedmitsa))].sort().reverse());
}

// ── СЛЕДАТА ────────────────────────────────────────────────────────────────

/**
 * СЛЕДАТА · „да оставя следа в таба ЗАПЛАТИ" *(р48·[83])*.
 *
 * СМЯТА се от Журнала, не се пази като поле на реда. Второ поле „прехвърлена"
 * щеше да се разминава със самия разход в деня, в който разходът се сторнира —
 * и таблицата щеше да твърди „прехвърлена", докато разход няма.
 */
export function prehvarlenaLiE(o: OgledaloNaZaplati, sedmitsa: string): boolean {
  return o.prehvarleniSedmitsi.has(sedmitsa);
}

/** Заключена ли е седмицата · „Замрази седмицата". */
export function zamrazenaLiE(o: OgledaloNaZaplati, sedmitsa: string): boolean {
  return o.prehvarleniSedmitsi.get(sedmitsa)?.zamrazena === true;
}

/**
 * ОТКАЗЪТ СЕ КАЗВА С ДУМИ · и с датите на седмицата.
 *
 * Празен низ значи „може". Викащият е ВРАТАТА — екранът само показва същия
 * текст, за да не се разминат двата отговора (правило 15 · ADR-050).
 */
export function zashtoNeMozhe(o: OgledaloNaZaplati, sedmitsa: string): string {
  if (zamrazenaLiE(o, sedmitsa)) {
    const { ot, do_ } = dnitteNaSedmitsata(sedmitsa);
    return (
      `Седмица ${sedmitsa} (${ot} – ${do_}) е ЗАМРАЗЕНА. Поправка след замразяване ` +
      'минава през сторно, не през нов ред.'
    );
  }
  return '';
}

// ── КЕШ-ДЖОБЪТ ─────────────────────────────────────────────────────────────

/**
 * КЪДЕ Е КЕШ-ДЖОБЪТ · вече има дом, не се строи втори.
 *
 * „Един общ кеш-джоб за фирмата" *(р75·[36])* за Заплати и Фактури Кеш заедно,
 * и „Кеш = Трезор" *(р57·[44])*. Двете заедно казват едно: джобът Е трезорът,
 * и салдото му се чете с `saldoNa(o, 'trezor')`.
 *
 * Затова тук няма нов джоб. Има само ИМЕТО, което екранът показва — за да не
 * пише „трезор" там, където човекът мисли „кеш за заплати".
 */
export const DZHOBAT_NA_ZAPLATITE = 'trezor';

export const IMETO_NA_DZHOBA = 'Кеш · Заплати и Фактури Кеш';

/**
 * ЗАХРАНВАНЕТО · движение НАГОРЕ по кеша, с дата и бележка.
 *
 * „само кешът се води" *(р75·[36])*: захранването не пипа Банка. Затова тук
 * няма избор на джоб — има ЕДИН, и той е обявен горе.
 */
export interface Zahranvane {
  readonly suma_st: number;
  readonly data: string;
  readonly belezhka: string;
}

export function proveriZahranvane(z: Pick<Zahranvane, 'suma_st' | 'data'>): void {
  if (!Number.isSafeInteger(z.suma_st) || z.suma_st <= 0) {
    throw new GreshkaZaplata('Захранването е цели центове, повече от нула.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(z.data)) {
    throw new GreshkaZaplata('Захранването иска дата във вида ГГГГ-ММ-ДД.');
  }
}

// ── ЧЕТИВОТО НА ЕКРАНА ─────────────────────────────────────────────────────

export interface RedZaEkrana {
  readonly zaplata: RedNaZaplata;
  readonly sedmichna_st: number;
}

export interface SedmitsaZaEkrana {
  readonly sedmitsa: string;
  readonly ot: string;
  readonly do_: string;
  readonly redove: readonly RedZaEkrana[];
  readonly sbor_st: number;
  readonly prehvarlena: boolean;
  readonly zamrazena: boolean;
  /** празно, когато няма пречка */
  readonly zashto: string;
}

export function sedmitsataZaEkrana(o: OgledaloNaZaplati, sedmitsa: string): SedmitsaZaEkrana {
  const { ot, do_ } = dnitteNaSedmitsata(sedmitsa);
  const redove = redoveNaSedmitsata(o, sedmitsa).map((zaplata) =>
    Object.freeze({ zaplata, sedmichna_st: sedmichnaZaplata(zaplata) }),
  );
  return Object.freeze({
    sedmitsa,
    ot,
    do_,
    redove: Object.freeze(redove),
    sbor_st: redove.reduce((s, r) => s + r.sedmichna_st, 0),
    prehvarlena: prehvarlenaLiE(o, sedmitsa),
    zamrazena: zamrazenaLiE(o, sedmitsa),
    zashto: zashtoNeMozhe(o, sedmitsa),
  });
}

/**
 * КОЛКО ИМА В КЕША ДНЕС · и защо се СМЯТА, а не се пази.
 *
 * `начално салдо + захранванията − прехвърленото по заплати`
 *
 * Началното салдо е РЪЧНО („ръчно, защото озвлечението се бави", р75·[38]) и
 * се подава отвън — то живее в `otcheti.saldoNa` и не се преписва тук
 * (правило 17). Останалите две идват от Журнала.
 *
 * СТОРНИРАНО захранване пада от сбора САМО, защото Огледалото вече не го носи.
 *
 * ОБЯВЕНА ГРАНИЦА: Фактури Кеш още не се вадят оттук — таблицата им я няма
 * (`docs/10` M06). Джобът е общ по НЕГОВО решение, но днес го харчат само
 * заплатите, и екранът го КАЗВА, вместо да показва число, което изглежда пълно.
 */
export function keshaNaZaplatite(
  o: OgledaloNaZaplati,
  nachalnoSaldo_st: number,
): { readonly saldo_st: number; readonly zahraneno_st: number; readonly plateno_st: number } {
  let zahraneno_st = 0;
  for (const z of o.zahranvaniyaNaKesha) zahraneno_st += z.suma_st;
  let plateno_st = 0;
  for (const p of o.prehvarleniSedmitsi.values()) plateno_st += p.suma_st;
  return Object.freeze({
    saldo_st: nachalnoSaldo_st + zahraneno_st - plateno_st,
    zahraneno_st,
    plateno_st,
  });
}
