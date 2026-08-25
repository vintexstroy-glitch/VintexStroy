/**
 * ВНОСЪТ НА ИЗВЛЕЧЕНИЕ · срещата на файла с личния Журнал (И96 т.10).
 *
 * ═══ ЕДНАТА РАЗЛИКА, КОЯТО ПРАВИ ВСИЧКО ═══
 *
 * Служебният внос (`aktualizatsiya.ts`) сравнява файла с ЦЕЛИЯ МЕСЕЦ и всичко
 * останало от месеца, което го няма във файла, обявява за ИЗЧЕЗНАЛО и го
 * сторнира. За поправен ексел това е ВЯРНО: файлът Е пълната истина за своя
 * месец.
 *
 * Извлечението от карта не е такъв файл. То е ОБХВАТ, не месец: човек тегли
 * „последните 90 дни" или „15.07–15.08". Копиран дословно, онзи цикъл би
 * сторнирал всеки ред от 01.07 до 14.07 — защото „ги няма във файла".
 *
 * Затова тук:
 *   1. Сравнява се САМО в `[ot, do]` на снимката.
 *   2. Изчезналият се ПОКАЗВА и НЕ се гаси. Машината предлага, човекът
 *      записва (правило 18); нито Monarch, нито Actual, нито MoneyWiz трият
 *      съществуваща транзакция при внос.
 *
 * ═══ ПАМЕТТА „КОЙ ТЪРГОВЕЦ КОЯ ТЕМА" ═══
 *
 * Не е ново събитие и няма скрит модел. Извежда се от СОБСТВЕНИТЕ МУ минали
 * избори: същият търговец, най-често избираната тема. Така паметта е видима и
 * поправима ПО КОНСТРУКЦИЯ — тя Е историята му, — а урокът на GnuCash („тихо
 * научена грешка се чисти през няколко вноса") не може да се случи: поправиш
 * ли реда, паметта се е поправила.
 */

import { klyuchNaLichnoDvizhenie, type RedOtKarta, type SlyataKarta } from '../iztochnik/karta.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { LichnoDvizhenie } from './lichni-pari.js';

class GreshkaLichenVnos extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaLichenVnos';
  }
}

export type KakvoStavaLichno = 'nov' | 'promenen' | 'bezPromyana' | 'lipsva';

export interface RedNaPlana {
  readonly klyuch: string;
  readonly kakvo: KakvoStavaLichno;
  readonly nov?: RedOtKarta;
  readonly star?: LichnoDvizhenie;
  /** темата, която ще получи · от стария запис или от паметта */
  readonly temaId: string;
  /** откъде идва темата · за да се вижда, че не е паднала от небето */
  readonly otKade: 'от стария запис' | 'от паметта' | 'няма';
  /** подозрение за дубъл · само ПОКАЗВА, не решава (правило 18) */
  readonly podozrenie?: string;
}

export interface PlanZaVnos {
  readonly redove: readonly RedNaPlana[];
  readonly ot: string;
  readonly do: string;
  readonly izvori: readonly string[];
  readonly propusnati: readonly { readonly red: number; readonly zashto: string }[];
  readonly povtoreni: readonly { readonly klyuch: string; readonly fayl: string; readonly suma_st: number }[];
  /** сборовете на ФАЙЛА · входът на сверката */
  readonly vhodPrihod_st: number;
  readonly vhodRazhod_st: number;
}

/**
 * ПАМЕТТА · коя тема е избирал за този търговец.
 *
 * Броят решава, при равенство — последният по дата. Ръчно въведените редове
 * важат наравно с внесените: изборът е негов и в двата случая.
 */
export function temaOtPametta(
  koy: string,
  dvizheniya: Iterable<LichnoDvizhenie>,
): string {
  const targovets = koy.trim().toLowerCase().normalize('NFC');
  if (targovets === '') return '';
  const broy = new Map<string, { broy: number; posledna: string }>();
  for (const d of dvizheniya) {
    if (d.temaId === '') continue;
    if (d.koy.trim().toLowerCase().normalize('NFC') !== targovets) continue;
    const v = broy.get(d.temaId) ?? { broy: 0, posledna: '' };
    v.broy += 1;
    if (d.data > v.posledna) v.posledna = d.data;
    broy.set(d.temaId, v);
  }
  let nay = '';
  let nayV = { broy: 0, posledna: '' };
  for (const [temaId, v] of broy) {
    if (v.broy > nayV.broy || (v.broy === nayV.broy && v.posledna > nayV.posledna)) {
      nay = temaId;
      nayV = v;
    }
  }
  return nay;
}

/** Колко дни има между две ISO дати · за прозореца на подозрението. */
function dniMezhdu(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/** Прозорецът, в който близък ред буди подозрение · същият като при Actual. */
const DNI_PODOZRENIE = 7;

/**
 * СРАВНЯВА снимката с Журнала · и НИЩО не гаси.
 *
 * Четирите присъди:
 *   `nov`         · ключът го няма в Журнала
 *   `promenen`    · има го, но нещо се е сменило (сума, дата, търговец)
 *   `bezPromyana` · съвпада едно към едно
 *   `lipsva`      · в Журнала е, във файла — не, И Е В ОБХВАТА. Показва се.
 */
export function sravniLichno(o: Ogledalo, slyata: SlyataKarta): PlanZaVnos {
  const poKlyuch = new Map<string, LichnoDvizhenie>();
  for (const d of o.lichniDvizheniya.values()) {
    if (d.klyuch !== '') poKlyuch.set(d.klyuch, d);
  }
  const vsichkiDvizheniya = [...o.lichniDvizheniya.values()];
  const redove: RedNaPlana[] = [];
  let vhodPrihod_st = 0;
  let vhodRazhod_st = 0;

  for (const r of slyata.redove) {
    if (r.posoka === 'prihod') vhodPrihod_st += r.suma_st;
    else vhodRazhod_st += r.suma_st;

    const star = poKlyuch.get(r.klyuch);
    poKlyuch.delete(r.klyuch);

    if (star) {
      const smenen =
        star.suma_st !== r.suma_st ||
        star.data !== r.data ||
        star.posoka !== r.posoka ||
        star.koy !== r.koy;
      redove.push({
        klyuch: r.klyuch,
        kakvo: smenen ? 'promenen' : 'bezPromyana',
        nov: r,
        star,
        // ТЕМАТА СЕ НАСЛЕДЯВА · иначе всяка следваща обиколка изтрива работата
        // по разпределянето: файлът не знае тема, Журналът знае, и без това
        // наследяване новият запис я губи МЪЛЧАЛИВО.
        temaId: star.temaId,
        otKade: star.temaId === '' ? 'няма' : 'от стария запис',
      });
      continue;
    }

    const otPametta = temaOtPametta(r.koy, vsichkiDvizheniya);
    const podozrenie = podozreniyeZa(r, vsichkiDvizheniya);
    redove.push({
      klyuch: r.klyuch,
      kakvo: 'nov',
      nov: r,
      temaId: otPametta,
      otKade: otPametta === '' ? 'няма' : 'от паметта',
      ...(podozrenie ? { podozrenie } : {}),
    });
  }

  // ОСТАНАЛИТЕ В ЖУРНАЛА · само онези В ОБХВАТА, и само ПОКАЗАНИ.
  for (const star of poKlyuch.values()) {
    if (slyata.ot !== '' && star.data < slyata.ot) continue;
    if (slyata.do !== '' && star.data > slyata.do) continue;
    redove.push({ klyuch: star.klyuch, kakvo: 'lipsva', star, temaId: star.temaId, otKade: 'от стария запис' });
  }

  return Object.freeze({
    redove: Object.freeze(redove),
    ot: slyata.ot,
    do: slyata.do,
    izvori: slyata.izvori,
    propusnati: slyata.propusnati,
    povtoreni: slyata.povtoreni,
    vhodPrihod_st,
    vhodRazhod_st,
  });
}

/**
 * ПОДОЗРЕНИЕ ЗА ДУБЪЛ · същата сума, близка дата, друг ключ.
 *
 * Само ПОКАЗВА. Реф. номерът на банката се мени при преиздаване на карта, а
 * ръчно въведеният ред няма ключ изобщо — тогава истинският дубъл минава за
 * нов. MoneyWiz прави точно това: „намери ли възможни дубли, пита ви какво да
 * прави". Тихото сливане и тихото удвояване са еднакво лоши.
 */
export function podozreniyeZa(
  r: RedOtKarta,
  dvizheniya: readonly LichnoDvizhenie[],
): string | null {
  for (const d of dvizheniya) {
    if (d.klyuch === r.klyuch) continue;
    if (d.suma_st !== r.suma_st || d.posoka !== r.posoka) continue;
    const dni = dniMezhdu(d.data, r.data);
    if (dni > DNI_PODOZRENIE) continue;
    return dni === 0
      ? `същата сума на същия ден вече стои в Журнала (${d.koy || 'без търговец'})`
      : `същата сума на ${dni} ${dni === 1 ? 'ден' : 'дни'} разлика вече стои в Журнала (${d.koy || 'без търговец'})`;
  }
  return null;
}

/** Кои редове ще се ПИШАТ · изчезналият не се пише и не се гаси. */
export function zaPisane(plan: PlanZaVnos): readonly RedNaPlana[] {
  return plan.redove.filter((r) => r.kakvo === 'nov' || r.kakvo === 'promenen');
}

export interface SverkaNaVnos {
  readonly redove: number;
  readonly nov: number;
  readonly promenen: number;
  readonly bezPromyana: number;
  readonly lipsva: number;
  readonly podozreni: number;
  readonly vhod_st: number;
  readonly izhod_st: number;
  readonly razlika_st: number;
  readonly prihod_st: number;
  readonly razhod_st: number;
}

/**
 * СВЕРКАТА НА ПАРТИДАТА (правило 7) · и тя се записва при НУЛА.
 *
 * `vhod_st` е сборът на ФАЙЛА; `izhod_st` — сборът на онова, което ще влезе в
 * Журнала. Двете се разминават нарочно с точно толкова, колкото носят редовете
 * `bezPromyana` и `lipsva` — затова разликата се смята, а не се очаква нула.
 */
export function sverkaNaVnos(plan: PlanZaVnos): SverkaNaVnos {
  const broy = (k: KakvoStavaLichno) => plan.redove.filter((r) => r.kakvo === k).length;
  const pishat = zaPisane(plan);
  const izhodPrihod = pishat.reduce((s, r) => s + (r.nov?.posoka === 'prihod' ? r.nov.suma_st : 0), 0);
  const izhodRazhod = pishat.reduce((s, r) => s + (r.nov?.posoka === 'razhod' ? r.nov.suma_st : 0), 0);
  const vhod_st = plan.vhodPrihod_st + plan.vhodRazhod_st;
  const izhod_st = izhodPrihod + izhodRazhod;
  return Object.freeze({
    redove: plan.redove.length,
    nov: broy('nov'),
    promenen: broy('promenen'),
    bezPromyana: broy('bezPromyana'),
    lipsva: broy('lipsva'),
    podozreni: plan.redove.filter((r) => r.podozrenie).length,
    vhod_st,
    izhod_st,
    razlika_st: vhod_st - izhod_st,
    prihod_st: izhodPrihod,
    razhod_st: izhodRazhod,
  });
}

/** Има ли изобщо какво да се прави · празният план не се пуска. */
export function imaShtoDaSePravi(plan: PlanZaVnos): boolean {
  return zaPisane(plan).length > 0;
}

/** Ключът на един ред · за екрана, който трябва да го сочи. */
export function klyuchNaRed(r: RedOtKarta): string {
  return klyuchNaLichnoDvizhenie(r);
}
