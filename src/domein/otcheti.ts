/**
 * ОТЧЕТИТЕ · полетата с формули.
 *
 * Негова поръчка, 23.08, дословно (И90):
 *
 *   „За финанситее ще хледаш формулата ще правиш полета в Секция Отчети където
 *    ще се сложар полета които да покзват тези стойности с формули между всички
 *    таблици нак вероятно."
 *
 * И определението на Вземането, от същото изречение:
 *
 *   „Вземанията са Плащания по незавършили сделки където е минала сделката но
 *    има плащания нба Акт 16. След нотариална сделка и да има неплатен суми по
 *    договор сдеката е приключила и е в архива."
 *
 * И капиталът (И87): „**Активи минус задължения**" — което НАДЖИВЯВА
 * по-ранното „Собстъвен Капитал… е разликата между Приход и Разход"
 * *(р57·[207]·09.08)*. Двете числа остават, но с различни имена: разликата
 * приход−разход е СРЕДСТВА *(р64·[113])*, а не Капитал.
 *
 * ЗАЩО ВСЯКО ПОЛЕ НОСИ ФОРМУЛАТА СИ. Число в отчет, което никой не може да
 * разглоби, е усещане с цифра пред себе си. Затова `Pole` носи `sastavki` —
 * какво е влязло, поименно и с адрес — и `chaka` — какво още липсва. Поле,
 * чийто извор го няма, показва НУЛА и казва какво чака; не се скрива
 * (правило 15: изключено ≠ липсващо).
 *
 * Всичко е цели стотинки (правило 3). Нула float, нула `toFixed`.
 */

import { obshtOstatak } from './krediti.js';
import type { Ogledalo, Plashtane, Razhod } from '../ogledalo/ogledalo.js';
import { duljimo } from '../ogledalo/ogledalo.js';
import { vzemaniyaOtProdazhbi } from './prodazhbi.js';
import { kategoriyataNa, vidatNaRazhoda } from './plashtaniya-arhiv.js';
import type { Period } from './nachislyavane.js';
import { smetki } from './smetki.js';
import { prihodnaChast, razhodnaChast, type LichnoDvizhenie } from './lichni-pari.js';
import { klyuchNaKontragent } from './kontragenti.js';

/** Двата джоба, назовани от него: „Банка — салдо, Трезор — салдо". */
type Dzhob = 'banka' | 'trezor';

export const IMENA_NA_DZHOBOVETE: Readonly<Record<Dzhob, string>> = Object.freeze({
  banka: 'Банка',
  trezor: 'Трезор',
});

/** Една съставка на едно поле — какво влиза и откъде се чете. */
interface Sastavka {
  readonly ime: string;
  /** цели стотинки · знакът е ИСТИНСКИ: отрицателното се вади */
  readonly suma_st: number;
  /** откъде идва — за следата назад */
  readonly otkade: string;
}

/**
 * Едно поле в Отчети.
 *
 * `sbor_st` е сборът на `sastavki` — винаги, без изключение. Тестът го пази с
 * независим втори път, защото поле, чийто сбор не отговаря на съставките си,
 * е точно повредата, която отчетите трябва да ловят.
 */
export interface Pole {
  readonly klyuch: string;
  readonly ime: string;
  readonly sbor_st: number;
  readonly sastavki: readonly Sastavka[];
  /** какво липсва, за да е пълно числото · празно значи пълно */
  readonly chaka: readonly string[];
  /** едно изречение: какво Е това число */
  readonly kakvo: string;
}

export interface Otcheti {
  readonly period: Period;
  readonly poleta: readonly Pole[];
  /**
   * СВЕРКА ВХОД↔ИЗХОД на самия Капитал (правило 7).
   *
   * Капиталът се смята ДВА пъти по различни пътища: веднъж като сбор на
   * съставките си, веднъж като Активи − Задължения, събрани поотделно.
   * Разликата се показва **дори когато е нула** — проверената нула е различна
   * от нулата, за която никой не е питал.
   */
  readonly sverka: {
    readonly ot_sastavki_st: number;
    readonly aktivi_st: number;
    readonly zadalzheniya_st: number;
    readonly razlika_st: number;
  };
}

/** Салдото на един джоб · нула, ако още не е записано. */
export function saldoNa(o: Ogledalo, kade: Dzhob): number {
  return o.salda.get(kade)?.saldo_st ?? 0;
}

/**
 * ЛИКВИДНОСТТА · ръчно начало + автоматични движения.
 *
 * Негов трети вариант *(р48·[71])*, и защо ръчно *(р75·[38])*:
 * „ръчно, защото озвлечението се бави."
 *
 * Движенията са ВСИЧКИ до днес, не само за периода: салдото на един джоб не се
 * нулира на първо число. Затова тук няма филтър по месец — това е състояние,
 * не оборот.
 */
export function likvidnost(o: Ogledalo): Pole {
  const banka_st = saldoNa(o, 'banka');
  const trezor_st = saldoNa(o, 'trezor');
  let vlyazlo_st = 0;
  for (const p of o.plashtaniya.values()) vlyazlo_st += p.suma_st;
  let izlyazlo_st = 0;
  for (const r of o.razhodi.values()) izlyazlo_st += r.suma_st;

  const sastavki: Sastavka[] = [
    { ime: 'Банка · начално салдо', suma_st: banka_st, otkade: 'ръчно, в Сметки' },
    { ime: 'Трезор · начално салдо', suma_st: trezor_st, otkade: 'ръчно, в Сметки' },
    { ime: 'Влязло · плащания', suma_st: vlyazlo_st, otkade: 'Журналът' },
    { ime: 'Излязло · разходи', suma_st: -izlyazlo_st, otkade: 'Журналът' },
  ];

  const chaka: string[] = [];
  if (!o.salda.has('banka')) chaka.push('началното салдо на Банка');
  if (!o.salda.has('trezor')) chaka.push('началното салдо на Трезор');

  return {
    klyuch: 'likvidnost',
    ime: 'ЛИКВИДНОСТ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka,
    kakvo: 'Парите, с които се разполага ДНЕС — начало на ръка, движения от Журнала.',
  };
}

/**
 * ВЗЕМАНИЯТА · ДВА ВИДА, които не се сливат в едно число.
 *
 * От НАЕМ: начислено, което още не е погасено — „кой ми дължи" (И8).
 * От ПРОДАЖБА: онова, което купувачът още дължи по НЕЗАВЪРШИЛА сделка, до
 * Акт 16 (И90). Границата е актът: след нотариалната сделка сделката е
 * приключила и е в архива, дори с неплатени суми по договор.
 *
 * ═══ ЗАКОВАНАТА НУЛА СИ НАМЕРИ ИЗТОЧНИКА (резен 23 · ADR-083) ═══
 *
 * Дотук вторият ред стоеше с ЛИТЕРАЛНА нула и шапка „Продажбите още ги няма
 * като същност (M04 · M03 · нула код)". Резен 18б ги построи, и нулата остана
 * — точно както `zadalzheniya_st` и `kredititeOstatak_st` останаха, докато
 * резен 19 не им намери източник (ADR-079). Числото вече идва от таблицата.
 *
 * НАДПЛАТЕНОТО НЕ СЕ ВАДИ. То е задължение КЪМ купувача, а не отрицателно
 * вземане; извадено наум, би намалило „кой ми дължи" с пари, които НИЕ дължим.
 * Затова се БРОИ и се КАЗВА в `chaka`, вместо да се нетира (правило 15).
 */
export function vzemaniya(o: Ogledalo): Pole {
  const otNaem_st = duljimo(o);
  const otProdazhbi = vzemaniyaOtProdazhbi(o);
  const sastavki: Sastavka[] = [
    { ime: 'От наем · непогасено', suma_st: otNaem_st, otkade: 'Журналът · вземания' },
    {
      ime: 'От продажби · до Акт 16',
      suma_st: otProdazhbi.sbor_st,
      otkade: `таблица Продажби · ${otProdazhbi.redove.length} ${
        otProdazhbi.redove.length === 1 ? 'сделка' : 'сделки'
      }`,
    },
  ];
  const chaka: string[] = [];
  if (otProdazhbi.nadplateni.length > 0) {
    chaka.push(
      `${otProdazhbi.nadplateni.length} надплатени сделки НЕ са извадени оттук — ` +
        'надплатеното е задължение КЪМ купувача и мястото му сред Задълженията чака решение',
    );
  }
  return {
    klyuch: 'vzemaniya',
    ime: 'ВЗЕМАНИЯ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka,
    kakvo: 'Какво дължат на нас. Наемът — непогасеното; продажбата — неплатеното до Акт 16.',
  };
}

/**
 * СРЕДСТВАТА · приход − разход за периода.
 *
 * Негови думи *(р64·[113])*: „разлика между приход разход е Средства, Средства
 * е разликата от миналия период. **Реално е Печалба, но се пише Средства**."
 *
 * НЕ Е КАПИТАЛ. Двете стояха слети, докато И87 не ги раздели.
 */
export function sredstva(o: Ogledalo, period: Period, kogato: string): Pole {
  const s = smetki(o, period, kogato);
  const sastavki: Sastavka[] = [
    { ime: 'Приход · начислено', suma_st: s.prihod_st, otkade: `Сметки · ${period}` },
    // ТРЕТА СЪСТАВКА · вноските по сделка. Без нея Средствата биха мълчали за
    // пари, които реално са влезли — а мълчанието изглежда като нула.
    {
      ime: 'Приход · продажби',
      suma_st: s.prihodProdazhbi_st,
      otkade: `Сметки · ${period} · поток Продажби`,
    },
    { ime: 'Разход', suma_st: -s.razhod_st, otkade: `Сметки · ${period}` },
  ];
  return {
    klyuch: 'sredstva',
    ime: 'СРЕДСТВА',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka: [],
    kakvo: 'Разликата приход−разход за периода. Реално е печалба, но се пише Средства.',
  };
}

/**
 * КАПИТАЛЪТ · Активи минус задължения (И87).
 *
 * Активи: Стойност на Състояние + Ликвидност + Вземания.
 * Задължения: остатъчна главница по кредити + неплатени задължения.
 *
 * Стойността на Състояние се смята в Калкулатора, но НЕ се записва в Журнала —
 * там влиза изборът на матрица, не самите цени (ADR-015). Затова тя се подава
 * отвън: екранът я дава, когато я има, и полето казва, че я чака, когато я
 * няма. Числото не се гади от имотите — площ без цена не е стойност.
 */
export interface VanshniZaKapitala {
  /** сборът от Стойност на Състояние, ако екранът го е смятал в тази сесия */
  readonly stoynostNaSastoyanie_st?: number;
}

export function kapital(o: Ogledalo, vanshni: VanshniZaKapitala = {}): Pole {
  const stoynost_st = vanshni.stoynostNaSastoyanie_st ?? 0;
  // ДОТУК ТОВА ЧИСЛО СЕ ПОДАВАШЕ ОТВЪН и никой не го подаваше: полето казваше
  // „чака таблица Кредити", а таблица Кредити я нямаше. Резен 19 я построи, и
  // остатъкът вече се СМЯТА от Журнала — параметърът без източник отпадна.
  const krediti_st = obshtOstatak(o);
  const lik = likvidnost(o);
  const vze = vzemaniya(o);

  const sastavki: Sastavka[] = [
    { ime: 'Стойност на Състояние', suma_st: stoynost_st, otkade: 'Калкулаторът' },
    { ime: 'Ликвидност', suma_st: lik.sbor_st, otkade: 'поле ЛИКВИДНОСТ' },
    { ime: 'Вземания', suma_st: vze.sbor_st, otkade: 'поле ВЗЕМАНИЯ' },
    {
      ime: 'Кредити · остатъчна главница',
      // `-0` е истинско число в JavaScript и се ИЗПИСВА като „-0,00 €".
      // Дотук не се виждаше, защото параметърът никога не идваше; щом остатъкът
      // тръгна от Журнала, нулевият дълг щеше да застане на екрана със знак.
      suma_st: krediti_st === 0 ? 0 : -krediti_st,
      otkade: 'таблица Кредити',
    },
  ];

  const chaka: string[] = [];
  if (vanshni.stoynostNaSastoyanie_st === undefined) {
    chaka.push('Стойност на Състояние · смята се в Калкулатора');
  }

  return {
    klyuch: 'kapital',
    ime: 'КАПИТАЛ',
    sbor_st: sbor(sastavki),
    sastavki,
    chaka,
    kakvo: 'Активи минус задължения. Не е разликата приход−разход — тя е Средства.',
  };
}

/**
 * Всички полета за един период, плюс сверката вход↔изход на Капитала.
 *
 * Редът е нарочен: първо какво ИМАМЕ (Капитал), после от какво е съставен
 * (Ликвидност, Вземания), накрая какво е СТАНАЛО за периода (Средства).
 */
export function otcheti(
  o: Ogledalo,
  period: Period,
  kogato: string,
  vanshni: VanshniZaKapitala = {},
): Otcheti {
  const kap = kapital(o, vanshni);
  const lik = likvidnost(o);
  const vze = vzemaniya(o);
  const sre = sredstva(o, period, kogato);

  // ВТОРИЯТ ПЪТ · Активи и Задължения, събрани ОТ ЖУРНАЛА наново.
  //
  // Дотук тук пишеше `stoynost + lik.sbor_st + vze.sbor_st` — тоест същите
  // готови сборове, от които е направен и Капиталът, само с разместени скоби.
  // Разликата излизаше нула по АЛГЕБРА, не по проверка: не можеше да хване
  // нищо, а стоеше на екрана като доказана нула. Проверена нула, която не е
  // проверена, е по-лоша от липсваща — тя носи доверие, което не е спечелено.
  //
  // Сега вторият път брои сам, от същите Огледала, но без да минава през
  // полетата: ако `likvidnost` или `vzemaniya` пропусне джоб, забрави знак или
  // преброи нещо два пъти, двата пътя се разминават и разликата светва.
  //
  // Какво ТОЗИ път НЕ хваща, казано на глас: грешка в самото Огледало (ако
  // едно плащане изобщо не е стигнало до `o.plashtaniya`, липсва и в двата
  // пътя). За това пази сверката при партидите — тя гледа файл ↔ Журнал.
  let vlyazlo_st = 0;
  for (const pl of o.plashtaniya.values()) vlyazlo_st += pl.suma_st;
  let izlyazlo_st = 0;
  for (const r of o.razhodi.values()) izlyazlo_st += r.suma_st;
  let vzemaniya_st = 0;
  for (const v of o.vzemaniya.values()) vzemaniya_st += v.ostatak_st;
  // И ВТОРИЯТ ПЪТ брои продажбите САМ · иначе сверката щеше да падне точно със
  // сумата, която полето ВЗЕМАНИЯ вече показва — и това е доказателството, че
  // тя не е алгебра: махне ли се този ред, разликата светва.
  vzemaniya_st += vzemaniyaOtProdazhbi(o).sbor_st;

  const aktivi_st =
    (vanshni.stoynostNaSastoyanie_st ?? 0) +
    saldoNa(o, 'banka') +
    saldoNa(o, 'trezor') +
    vlyazlo_st -
    izlyazlo_st +
    vzemaniya_st;
  const zadalzheniya_st = obshtOstatak(o);

  return {
    period,
    poleta: [kap, lik, vze, sre],
    sverka: {
      ot_sastavki_st: kap.sbor_st,
      aktivi_st,
      zadalzheniya_st,
      razlika_st: kap.sbor_st - (aktivi_st - zadalzheniya_st),
    },
  };
}

/** Двете суми за един ден · приход и разход, поотделно. */
export interface DenSPari {
  readonly data: string;
  readonly prihod_st: number;
  readonly razhod_st: number;
  /**
   * КЛЮЧЪТ НА РАЗРЕЗА · празен при „без разбивка".
   *
   * Ключът е СВЕДЕН (контрагентът минава през `klyuchNaKontragent`), а `nadpis`
   * носи онова, което човек чете. Двете не се сливат: сливането им беше точно
   * дефектът, заради който „Стройпласт␣␣ЕООД" ставаше втори контрагент.
   */
  readonly razrez: string;
  readonly nadpis: string;
}

/**
 * ПО КАКВО СЕ РЕЖЕ СБОРЪТ · вторият му въпрос от 27.08 (И102).
 *
 *   „…разбивки по контрагенти от банковите извлечения и да се покажат в
 *    таблицата сумирано за такта на диаграмата… и съответно извлеченията
 *    БАНКОВИТЕ ИЛИ КЕШОВИТЕ… Както и по други избрани критерии."
 *
 * „Дори измислен с измислена колона" ОТПАДА по негова дума (И107, 27.08) —
 * разбивка по собствена колона иска РЕДОВЕТЕ на моделната таблица, а те не
 * живеят в приложението (ADR-027 §2). Затова всеки разрез се чете от поле,
 * което ЖУРНАЛЪТ вече носи.
 *
 * ═══ ШЕСТИЯТ · и защо той НЕ отменя И107 (резен 25 · ADR-085) ═══
 *
 * „По категории" изпълнява същото условие, не го заобикаля: категорията е
 * СЪБИТИЕ в Журнала (`КатегорияЗададена`), значи е „поле, което Журналът вече
 * носи" — точно критерия, който този коментар поставя. И107 отказа разрез по
 * колона на МОДЕЛНА таблица, чиито редове ги няма в приложението; отказът
 * остава в сила за онова, което отказва.
 */
export const RAZREZI = ['bez', 'kontragent', 'nachin', 'sektor', 'potok', 'kategoriya'] as const;
export type Razrez = (typeof RAZREZI)[number];

export const IMENA_NA_RAZREZITE: Readonly<Record<Razrez, string>> = Object.freeze({
  bez: 'Без разбивка',
  kontragent: 'По контрагент',
  nachin: 'Банка или в брой',
  sektor: 'По сектор',
  potok: 'По поток',
  kategoriya: 'По категории',
});

/**
 * КОФАТА С ИМЕ · за ред, който няма стойност по този разрез.
 *
 * НЕ празен низ: празният значи „без разбивка" и двете щяха да се слеят.
 * Личното движение няма начин на плащане (полето го НЯМА в събитието), а
 * плащането няма поток — това се ВИЖДА, вместо да изчезне в общия сбор.
 */
export const BEZ_STOYNOST = '(няма)';

/**
 * КОЛКО ВЛИЗА И КОЛКО ИЗЛИЗА ВЪВ ВСЕКИ ДЕН НА ЕДИН МЕСЕЦ.
 *
 * Негови думи, от същото изречение като И90: „Както и **всички приходи и
 * разходи са с цифри в полето на календара**."
 *
 * ЧИСЛОТО Е ТУК, МЯСТОТО ГО НЯМА — и „мястото" вече значи нещо по-тясно.
 * Гантът Е построен (ADR-018) и решетката му минава по СЪЩАТА обиколка
 * (`poDni` долу, по обхват от дати). Онова, което липсва, е КАЛЕНДАРЪТ:
 * месечна мрежа с ден по ден, в която да застанат двете числа. Функцията стои
 * готова и сверена и чака него — вместо да се построи полусляп календар само
 * за да има къде да се сложат цифрите (`docs/09` §3).
 *
 * Двете суми НЕ се сливат в едно нето число. Ден с 1 000 приход и 1 000 разход
 * не е празен ден; неттото би го направило такъв.
 *
 * Приходът тук е СЪБРАНОТО (пари, влезли на този ден), не начисленото:
 * календарът е за дни, а начислението няма ден — то има падеж.
 */
export function sumiZaDen(o: Ogledalo, period: Period, razrez: Razrez = 'bez'): readonly DenSPari[] {
  return poDni(o, (data) => data.slice(0, 7) === period, razrez);
}

/**
 * ЕДНА обиколка по дните · двата викащи се различават САМО по това КОИ дни
 * влизат.
 *
 * Написана два пъти, тя се разминава при първата поправка в едната: например
 * при решението приходът тук да е СЪБРАНОТО, не начисленото. Тогава единият
 * календар щеше да казва едно, а решетката на Ганта — друго, за едни и същи
 * пари. Затова сметката е ЕДНА, а разликата е предикат.
 */
/**
 * КЛЮЧЪТ НА ЕДИН РЕД по избрания разрез · чисти функции, по една на вид ред.
 *
 * Трите вида пари носят различни полета и това НЕ се замазва: плащането няма
 * поток, личното движение няма начин на плащане. Липсата отива в кофа с ИМЕ
 * (`BEZ_STOYNOST`), не в общия сбор — иначе „банка или в брой" щеше да отчете
 * личните разходи като банкови.
 */
interface KlyuchISNadpis {
  readonly klyuch: string;
  readonly nadpis: string;
}

const NYAMA: KlyuchISNadpis = { klyuch: BEZ_STOYNOST, nadpis: BEZ_STOYNOST };
const BEZ_RAZREZ: KlyuchISNadpis = { klyuch: '', nadpis: '' };

/** Име на контрагент → сведен ключ + четим надпис (правило 12 · правило 17). */
function poIme(ime: string): KlyuchISNadpis {
  const chisto = ime.normalize('NFC').trim().replace(/\s+/g, ' ');
  return chisto === '' ? NYAMA : { klyuch: klyuchNaKontragent(ime), nadpis: chisto };
}

/** Стойност, която е ДУМА в Журнала (начин · сектор · поток) — ключът Е думата. */
function poDuma(v: string): KlyuchISNadpis {
  const chisto = v.normalize('NFC').trim();
  return chisto === '' ? NYAMA : { klyuch: chisto, nadpis: chisto };
}

function klyuchNaPlashtane(o: Ogledalo, p: Plashtane, razrez: Razrez): KlyuchISNadpis {
  if (razrez === 'bez') return BEZ_RAZREZ;
  if (razrez === 'nachin') return poDuma(p.nachin);
  // Плащането няма СВОЙ контрагент и сектор — те висят на наема зад вземането.
  const v = o.vzemaniya.get(p.vzemaneId);
  const naem = v ? o.naemi.get(v.naemId) : undefined;
  if (!naem) return NYAMA;
  if (razrez === 'kontragent') return poIme(naem.naemetel);
  if (razrez === 'sektor') return poDuma(naem.sektor);
  // ПОТОК и КАТЕГОРИЯ · приходът от наем няма нито едното. Категорията е за
  // ИЗЛИЗАЩИТЕ пари (неговото „Плащания"); слагането ѝ и тук би било измислица.
  return NYAMA;
}

function klyuchNaRazhod(o: Ogledalo, r: Razhod, razrez: Razrez): KlyuchISNadpis {
  switch (razrez) {
    case 'bez': return BEZ_RAZREZ;
    case 'kontragent': return poIme(r.dostavchik);
    case 'nachin': return poDuma(r.nachin);
    case 'sektor': return poDuma(r.sektor);
    case 'potok': return poDuma(r.potok);
    case 'kategoriya': return poDuma(kategoriyataNa(o, vidatNaRazhoda(r) ?? '', r.id));
  }
}

function klyuchNaLichno(d: LichnoDvizhenie, razrez: Razrez): KlyuchISNadpis {
  switch (razrez) {
    case 'bez': return BEZ_RAZREZ;
    // „Кой" е търговецът от извлечението — той е контрагентът на личния ред.
    case 'kontragent': return poIme(d.koy);
    // НАЧИН НЯМА · `PayloadLichnoDvizhenieZapisano` не носи такова поле и това
    // се КАЗВА, вместо да се замаже с „банка" (находка на разузнаването).
    case 'nachin': return NYAMA;
    case 'sektor': return NYAMA;
    case 'potok': return NYAMA;
    // КАТЕГОРИЯ НЯМА · тя се закача за служебно плащане, а личното движение
    // живее в ДРУГ Журнал. Кофата с име го КАЗВА, вместо да го слее с общия.
    case 'kategoriya': return NYAMA;
  }
}

function poDni(
  o: Ogledalo,
  vlizaLi: (data: string) => boolean,
  razrez: Razrez = 'bez',
): readonly DenSPari[] {
  const po = new Map<string, { data: string; razrez: string; nadpis: string; prihod_st: number; razhod_st: number }>();
  const vzemi = (data: string, k: KlyuchISNadpis) => {
    // Датата и ключът се слепват с знак, който не може да е в нито едно от
    // двете: име с двоеточие инак би се слял с чужд ден.
    const id = `${data}\u0000${k.klyuch}`;
    let v = po.get(id);
    if (!v) {
      v = { data, razrez: k.klyuch, nadpis: k.nadpis, prihod_st: 0, razhod_st: 0 };
      po.set(id, v);
    }
    return v;
  };

  for (const p of o.plashtaniya.values()) {
    if (vlizaLi(p.data)) vzemi(p.data, klyuchNaPlashtane(o, p, razrez)).prihod_st += p.suma_st;
  }
  for (const r of o.razhodi.values()) {
    if (vlizaLi(r.data)) vzemi(r.data, klyuchNaRazhod(o, r, razrez)).razhod_st += r.suma_st;
  }
  /**
   * ТРЕТИЯТ ЦИКЪЛ · ЛИЧНИТЕ ПАРИ (И96 т.10).
   *
   * Тук, а не в близнак `poDniLichno`. Файлът го забранява с думи по-горе, и
   * има втора цена: решетката на Ганта вика `sumiZaObhvat`, тоест ТАЗИ функция.
   * Близнак в `lichni-pari.ts` никога нямаше да бъде извикан от нея и обобщеният
   * ред под ЛИЧНАТА таблица щеше да остане вечна нула — а нула на екран за пари
   * изглежда като „няма движение", не като „не е питано".
   *
   * БЕЗОПАСНО И В ДВЕТЕ ПОСОКИ: служебното Огледало няма `lichniDvizheniya`,
   * личното няма `plashtaniya` и `razhodi`. Всеки цикъл върти празна карта в
   * чуждия Журнал.
   *
   * Разходната част минава през `razhodnaChast`, значи вноската по кредит влиза
   * с ЛИХВАТА си, не с цялата вноска: главницата е движение между джобове.
   */
  for (const d of o.lichniDvizheniya.values()) {
    if (d.izklyuchen || !vlizaLi(d.data)) continue;
    const v = vzemi(d.data, klyuchNaLichno(d, razrez));
    v.prihod_st += prihodnaChast(d);
    v.razhod_st += razhodnaChast(d);
  }

  return [...po.values()].sort(
    (a, b) => a.data.localeCompare(b.data) || a.razrez.localeCompare(b.razrez),
  );
}

/**
 * СЪЩОТО, НО ЗА ОБХВАТ ОТ ДНИ · за решетката на Ганта.
 *
 * Решетката покрива месеци напред и назад (петкратният обхват, И-числото на
 * собственика), а `sumiZaDen` реже по ЕДИН календарен месец. Хранена с него,
 * всяка колона извън месеца показваше нула — а нулата на екран за пари
 * изглежда като „няма движение", не като „не е питано" (находка на сверката).
 *
 * Границите са включителни, ISO текст — както говорят колоните на решетката.
 */
export function sumiZaObhvat(
  o: Ogledalo,
  ot: string,
  doo: string,
  razrez: Razrez = 'bez',
): readonly DenSPari[] {
  return poDni(o, (data) => data >= ot && data <= doo, razrez);
}

/** Сборът на съставките. Знакът е в самата съставка, не в сбирача. */
function sbor(sastavki: readonly Sastavka[]): number {
  let s = 0;
  for (const c of sastavki) s += c.suma_st;
  return s;
}
