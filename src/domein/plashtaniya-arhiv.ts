/**
 * ПЛАЩАНИЯ АРХИВ · седмичният регистър и трите вида плащане (резен 22 · ADR-082).
 *
 * Негови думи, дословно:
 *
 *   „Трябва и да има обобщен бутон за запис в таб **ПЛащания Архив** сложен
 *    след Продажби Архив, където в този таб **сумарно за всяка седмица** ще се
 *    събира фаилс екселска таблица за сваляне събиращ **Запалати, Фактъри Кеш,
 *    Фактъри Карта**." *(р52·[288]·08.08)*
 *   „Фактурите и двете са с **еднакъв хедър**. Така се групират" *(р82·[7])*
 *   „**Да, точно така**" *(р57·[223])* — за реда на колоните:
 *    Дата · Място · Обект · Страна · Вид · Начин · Сметка · Бележка · Заплата ·
 *    Дни · Фактура № · Сверка · Сума €
 *
 * ═══ ТОВА Е ОГЛЕДАЛО, НЕ ЖУРНАЛ ═══
 *
 * Тук НИЩО не се записва. Редът се СМЯТА от вече записаното — заплатите от
 * `zaplati`, фактурите от разходите по потока „Фактури". Втори запис би дал
 * две истини за едно плащане и щеше да се разминава при първото сторно:
 * сторнираната заплата пада оттук САМА, без нито един ред код за това.
 *
 * ═══ ЗАЩО НЕ Е СЪЩЕСТВУВАЩАТА ТАБЛИЦА „Плащания" ═══
 *
 * В кода вече има вградена таблица `plashtaniya` (екран Пари) — тя е парите,
 * които ВЛИЗАТ срещу вземане по наем. Неговите тринайсет колони не са нейните:
 * „Заплата", „Дни" и „Фактура №" нямат смисъл за плащане по наем и имат точно
 * смисъл за заплата и за фактура. Значи негово „Плащания Архив" е седмичният
 * регистър на ИЗЛИЗАЩИТЕ пари. Съществуващата таблица не се пипа.
 *
 * ═══ ОБЯВЕНИ ГРАНИЦИ (правило 15 · изключено ≠ липсващо) ═══
 *
 * · Фактури БАНКА не влизат — негово: те „няма да се въвеждат ръчно, а ще се
 *   обобщават от извлеченията" *(р48·[83])*. Тук са само кеш и карта.
 * · „Място" за фактура е ПРАЗНО: разходът още не носи проект. Празната клетка
 *   е честна; измисленото място е повреда на записа.
 */

import { MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { smetkataNaRazhoda } from './glavna-kniga.js';
import {
  dnitteNaSedmitsata,
  redoveNaSedmitsata,
  sboraNaSedmitsata,
  sedmichnaZaplata,
  sedmitsataNa,
  type OgledaloNaZaplati,
} from './zaplati.js';
import type { Razhod } from '../ogledalo/ogledalo.js';

// ── ВИДОВЕТЕ ───────────────────────────────────────────────────────────────

/**
 * ТРИТЕ ВИДА · неговите три, изброени, не свободен текст.
 *
 * Изброени, защото свободна стойност би паднала тихо в четвърти вид и листът
 * ѝ никога нямаше да се появи във файла — платено веднъж при начина на
 * плащане (ADR-074).
 */
export const VIDOVE_PLASHTANE = ['zaplata', 'faktura-kesh', 'faktura-karta'] as const;

export type VidPlashtane = (typeof VIDOVE_PLASHTANE)[number];

export const IMENATA_NA_VIDOVETE: Readonly<Record<VidPlashtane, string>> = Object.freeze({
  zaplata: 'Заплати',
  'faktura-kesh': 'Фактури Кеш',
  'faktura-karta': 'Фактури Карта',
});

/** Кой начин на плащане ражда кой вид фактура · един дом за въпроса. */
const VIDAT_NA_FAKTURATA: Readonly<Record<string, VidPlashtane>> = Object.freeze({
  'в брой': 'faktura-kesh',
  карта: 'faktura-karta',
});

/**
 * Влиза ли този разход в регистъра · и защо се пита ТУК.
 *
 * Потокът „Фактури" носи и банковите фактури. Те се обобщават от извлечението,
 * не се въвеждат на ръка — значи в седмичния файл нямат място, а мълчаливото
 * им пропускане би изглеждало като загубени пари. Затова изборът е ФУНКЦИЯ с
 * име, а не условие, скрито във филтър.
 */
export function vidatNaRazhoda(r: Pick<Razhod, 'potok' | 'nachin'>): VidPlashtane | undefined {
  if (r.potok !== 'fakturi') return undefined;
  return VIDAT_NA_FAKTURATA[r.nachin];
}

// ── КОЛОНИТЕ ───────────────────────────────────────────────────────────────

/**
 * НЕГОВИТЕ ТРИНАЙСЕТ, в НЕГОВИЯ ред · „Да, точно така" *(р57·[223])*.
 *
 * Списък, който тест БРОИ — редът е негова наредба, не подредба при рисуване.
 */
export const KOLONI_PLASHTANIYA_ARHIV: readonly string[] = Object.freeze([
  'Дата',
  'Място',
  'Обект',
  'Страна',
  'Вид',
  'Начин',
  'Сметка',
  'Бележка',
  'Заплата',
  'Дни',
  'Фактура №',
  'Сверка',
  'Сума €',
]);

/** Колоните, които се СМЯТАТ · не се редактират от никого (правило 23). */
export const ZATVORENI_PLASHTANIYA: readonly number[] = Object.freeze([4, 6, 11, 12]);

/** Колоните, които са ПАРИ · видът живее в колоната, не се гади по данните. */
export const PARICHNI_PLASHTANIYA: readonly string[] = Object.freeze(['Заплата', 'Сума €']);

/**
 * Колоните, които един вид НИКОГА не пълни.
 *
 * Оттук се смятат хедърите на листовете — за да не се изпишат втори път на
 * ръка и да се разминат с реда (правило 17). И оттук идва изпълнението на
 * неговото „Фактурите и двете са с еднакъв хедър": двете фактури делят ЕДИН
 * запис в тази таблица.
 */
const PRAZNI_ZA_VIDA: Readonly<Record<VidPlashtane, readonly string[]>> = Object.freeze({
  zaplata: Object.freeze(['Фактура №']),
  'faktura-kesh': Object.freeze(['Място', 'Обект', 'Заплата', 'Дни']),
  'faktura-karta': Object.freeze(['Място', 'Обект', 'Заплата', 'Дни']),
});

/** Хедърът на един лист · тринайсетте минус онези, които видът не пълни. */
export function koloniteNaVida(vid: VidPlashtane): readonly string[] {
  const prazni = PRAZNI_ZA_VIDA[vid];
  return Object.freeze(KOLONI_PLASHTANIYA_ARHIV.filter((k) => !prazni.includes(k)));
}

// ── РЕДЪТ ──────────────────────────────────────────────────────────────────

export interface RedNaPlashtane {
  readonly id: string;
  readonly vid: VidPlashtane;
  readonly sedmitsa: string;
  readonly data: string;
  readonly myasto: string;
  readonly obekt: string;
  readonly strana: string;
  readonly nachin: string;
  readonly smetka: string;
  readonly belezhka: string;
  /** дневната ставка · празно за фактура */
  readonly zaplata_st: number | undefined;
  /** брой дни · празно за фактура */
  readonly dni: number | undefined;
  /** номерът на фактурата · празен за заплата */
  readonly faktura: string;
  readonly svereno: string;
  readonly suma_st: number;
}

/**
 * СТОЙНОСТТА НА ЕДНА КЛЕТКА · ЕДИН дом за „кое къде е".
 *
 * Екранът и файлът четат оттук ЕДНАКВО. Два четеца биха се разминали точно
 * в деня, в който колона се добави — и разминаването щеше да се види като
 * разместени числа в свален файл, тоест късно.
 *
 * Празният низ значи ПРАЗНА клетка, не нула: заплата няма номер на фактура,
 * и това не се измисля (правило 15).
 */
export function kletkata(r: RedNaPlashtane, kolona: string): string | number | '' {
  switch (kolona) {
    case 'Дата':
      return r.data;
    case 'Място':
      return r.myasto;
    case 'Обект':
      return r.obekt;
    case 'Страна':
      return r.strana;
    case 'Вид':
      return IMENATA_NA_VIDOVETE[r.vid];
    case 'Начин':
      return r.nachin;
    case 'Сметка':
      return r.smetka;
    case 'Бележка':
      return r.belezhka;
    case 'Заплата':
      return r.zaplata_st ?? '';
    case 'Дни':
      return r.dni ?? '';
    case 'Фактура №':
      return r.faktura;
    case 'Сверка':
      return r.svereno;
    case 'Сума €':
      return r.suma_st;
    default:
      return '';
  }
}

// ── ТРИТЕ ИЗТОЧНИКА ────────────────────────────────────────────────────────

/** Онова от Огледалото, което регистърът чете · нищо повече. */
export interface OgledaloNaPlashtaniyata extends OgledaloNaZaplati {
  readonly razhodi: ReadonlyMap<string, Razhod>;
  readonly imoti: ReadonlyMap<string, { readonly adres: string }>;
}

/**
 * ЗАПЛАТИТЕ на една седмица.
 *
 * Датата е НЕДЕЛЯТА на седмицата — същата, с която прехвърлянето ражда разхода
 * (`prehvarliSedmitsata`). Различна дата тук щеше да сложи едно плащане в две
 * седмици според това кой го гледа.
 *
 * „Сверка" е СЛЕДАТА: прехвърлена седмица значи, че входът вече има изход.
 */
function redoveOtZaplatite(
  o: OgledaloNaPlashtaniyata,
  sedmitsa: string,
): readonly RedNaPlashtane[] {
  const { do_ } = dnitteNaSedmitsata(sedmitsa);
  const prehvarlena = o.prehvarleniSedmitsi.has(sedmitsa);
  return redoveNaSedmitsata(o, sedmitsa).map((z) =>
    Object.freeze({
      id: z.id,
      vid: 'zaplata' as VidPlashtane,
      sedmitsa,
      data: do_,
      myasto: z.proektId === '' ? '' : (o.imoti.get(z.proektId)?.adres ?? z.proektId),
      obekt: z.obekt,
      strana: z.ime,
      nachin: 'в брой',
      smetka: smetkataNaRazhoda('zaplati'),
      belezhka: z.dlazhnost,
      zaplata_st: z.dnevna_st,
      dni: z.dni,
      faktura: '',
      svereno: prehvarlena ? 'в Разходи' : 'чака петък',
      suma_st: sedmichnaZaplata(z),
    }),
  );
}

/**
 * ФАКТУРИТЕ на една седмица · кеш и карта, банката НЕ.
 *
 * „Сверка" тук е другото: фактура без номер на документ е фактура, която НАП
 * няма как да намери — и това се казва на екрана, вместо да мине за наред.
 */
function redoveOtFakturite(
  o: OgledaloNaPlashtaniyata,
  sedmitsa: string,
): readonly RedNaPlashtane[] {
  const redove: RedNaPlashtane[] = [];
  for (const r of o.razhodi.values()) {
    const vid = vidatNaRazhoda(r);
    if (vid === undefined) continue;
    if (sedmitsataNa(r.data) !== sedmitsa) continue;
    redove.push(
      Object.freeze({
        id: r.id,
        vid,
        sedmitsa,
        data: r.data,
        myasto: '',
        obekt: '',
        strana: r.dostavchik,
        nachin: r.nachin,
        smetka: smetkataNaRazhoda(r.sektor),
        belezhka: r.opis,
        zaplata_st: undefined,
        dni: undefined,
        faktura: r.dokument,
        svereno: r.dokument === '' ? 'БЕЗ документ' : 'с документ',
        suma_st: r.suma_st,
      }),
    );
  }
  return Object.freeze(redove.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id)));
}

/** ВСИЧКИ редове на една седмица · по дата, после по вид. */
export function redoveNaPlashtaniyata(
  o: OgledaloNaPlashtaniyata,
  sedmitsa: string,
): readonly RedNaPlashtane[] {
  return Object.freeze(
    [...redoveOtZaplatite(o, sedmitsa), ...redoveOtFakturite(o, sedmitsa)].sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        VIDOVE_PLASHTANE.indexOf(a.vid) - VIDOVE_PLASHTANE.indexOf(b.vid) ||
        a.id.localeCompare(b.id),
    ),
  );
}

/** Редовете на ЕДИН вид · оттук се пълни листът му във файла. */
export function redoveNaVida(
  redove: readonly RedNaPlashtane[],
  vid: VidPlashtane,
): readonly RedNaPlashtane[] {
  return Object.freeze(redove.filter((r) => r.vid === vid));
}

/** Седмиците, в които има поне едно плащане · най-новата отпред. */
export function sedmitsiSPlashtaniya(o: OgledaloNaPlashtaniyata): readonly string[] {
  const sas = new Set<string>();
  for (const z of o.zaplati.values()) sas.add(z.sedmitsa);
  for (const r of o.razhodi.values()) {
    if (vidatNaRazhoda(r) !== undefined) sas.add(sedmitsataNa(r.data));
  }
  return Object.freeze([...sas].sort().reverse());
}

// ── СБОРОВЕТЕ И СВЕРКАТА ───────────────────────────────────────────────────

export interface SborNaVida {
  readonly vid: VidPlashtane;
  readonly ime: string;
  readonly broy: number;
  readonly suma_st: number;
}

export function sborovetePoVid(redove: readonly RedNaPlashtane[]): readonly SborNaVida[] {
  return Object.freeze(
    VIDOVE_PLASHTANE.map((vid) => {
      const svoi = redoveNaVida(redove, vid);
      return Object.freeze({
        vid,
        ime: IMENATA_NA_VIDOVETE[vid],
        broy: svoi.length,
        suma_st: svoi.reduce((s, r) => s + r.suma_st, 0),
      });
    }),
  );
}

/**
 * СВЕРКАТА ВХОД↔ИЗХОД · и защо входът се смята по ВТОРИ път.
 *
 * ВХОД е сборът, смятан направо от ИЗТОЧНИЦИТЕ — заплатите през
 * `sboraNaSedmitsata`, фактурите с независим обход на разходите. ИЗХОД е
 * сборът на построените редове, тоест онова, което ще влезе във файла.
 *
 * Сверка „сборът на редовете срещу сбора на същите редове по вид" щеше да е
 * НАДПИС: тя не може да падне (ADR-041). Тази тук може, и лови точно едно —
 * плащане, паднало при построяването на реда, тоест изчезнало от файла.
 *
 * И разликата се записва ДОРИ КОГАТО Е НУЛА (правило 7): проверената нула е
 * различно нещо от нулата, за която никой не е питал.
 */
export function sveriSedmitsata(
  o: OgledaloNaPlashtaniyata,
  sedmitsa: string,
  redove: readonly RedNaPlashtane[],
  kogato: string,
): Sverka {
  let vhod = sboraNaSedmitsata(o, sedmitsa);
  for (const r of o.razhodi.values()) {
    if (vidatNaRazhoda(r) !== undefined && sedmitsataNa(r.data) === sedmitsa) vhod += r.suma_st;
  }
  const izhod = redove.reduce((s, r) => s + r.suma_st, 0);
  return sverka(`plashtaniya-arhiv ${sedmitsa}`, vhod, izhod, kogato, MERKA.pari);
}

// ── ЧЕТИВОТО НА ЕКРАНА ─────────────────────────────────────────────────────

export interface SedmitsaNaPlashtaniyata {
  readonly sedmitsa: string;
  readonly ot: string;
  readonly do_: string;
  readonly redove: readonly RedNaPlashtane[];
  readonly sborove: readonly SborNaVida[];
  readonly obshto_st: number;
  readonly sverka: Sverka;
}

export function sedmitsataZaEkrana(
  o: OgledaloNaPlashtaniyata,
  sedmitsa: string,
  kogato: string,
): SedmitsaNaPlashtaniyata {
  const { ot, do_ } = dnitteNaSedmitsata(sedmitsa);
  const redove = redoveNaPlashtaniyata(o, sedmitsa);
  const sborove = sborovetePoVid(redove);
  return Object.freeze({
    sedmitsa,
    ot,
    do_,
    redove,
    sborove,
    obshto_st: sborove.reduce((s, v) => s + v.suma_st, 0),
    sverka: sveriSedmitsata(o, sedmitsa, redove, kogato),
  });
}
