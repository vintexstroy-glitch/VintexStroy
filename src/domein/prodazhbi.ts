/**
 * ПРОДАЖБИТЕ · сделката, петнайсетте колони и терминалът (резен 18б).
 *
 * ═══ НЕГОВИТЕ ДУМИ · ДОСЛОВНО ═══
 *
 * Хедърът, поименно *(р52·[284])*:
 *
 *   „Обект, Място, Купувач, Телефон, Цена €, Продажба €, СМР €, ПД, Капаро,
 *    НС, НС кеш, АКт 15, Акт 16, проверка, Състояние"
 *
 * И собствената му корекция на реда *(р52·[280])*:
 *
 *   „Преди да продължиш едма корекция, реда в Продажби е: ПД, Капаро, НС,
 *    НС кеш, АКт 15, Акт 16, проверка"
 *
 * Какво СМЯТА колоната „проверка" *(р52·[282])*:
 *
 *   „заедно ги събери като една обюа проверка на обющата Сума на сделката от
 *    ПД и СМРи общата сума на вноските"
 *
 * ═══ ТРИТЕ ВИДА КОЛОНА, И ЗАЩО ТУК ГИ НЯМА ВСИЧКИТЕ ═══
 *
 * | вид | кои | къде живее |
 * | :---- | :---- | :---- |
 * | четена от ЧУЖДА същност | Обект · Място | имотът (`imotId`) |
 * | записана на сделката | Купувач · Телефон · Цена € · Продажба € · СМР € · ПД · Състояние | `PayloadProdazhbaZapisana` |
 * | ДВИЖЕНИЕ, не поле | Капаро · НС · НС кеш · Акт 15 · Акт 16 | `PayloadDvizhenieProdazhba` |
 * | СМЯТАНА | проверка | `proverkata()` тук |
 *
 * Петте вноски са движения, а не полета, заради едно негово изречение
 * *(р75·[50])*: „в продажби и е добре да вкараме дати под вноските за да е
 * прегледно после и в архива." Поле носи ЕДНО число; дата под него значи, че
 * вноската има СВОЙ миг — тоест е събитие, не клетка.
 *
 * ═══ РАЗВАЛЯНЕТО · ТРИ ДВИЖЕНИЯ, НУЛА НЕТИРАНЕ ═══
 *
 * Негово (И97 · 25.08), и това е половината от изречение, което НЕ беше
 * стигнало до пресятото — намерено в чистия извор по реда на правило 24:
 *
 *   „**Отпада сметката-задължение за капаро**… Развалянето е ТРИ отделни
 *    движения: сторно на вноските · връщане на парите · неустойка…
 *    **Сторното не отменя — то добавя**… Неустойките се превеждат
 *    **отделно**, никакво нетиране."
 *
 * Затова:
 *   · СТОРНОТО е съществуващото събитие `Сторно` — то гаси вноската и с това
 *     я вади от проверката. Ново сторно тук не се строи (правило 17);
 *   · ВРЪЩАНЕТО и НЕУСТОЙКАТА са движения със свои редове и НЕ влизат в
 *     проверката. „Никакво нетиране" е точно забраната да се съберат наум;
 *   · ПОСОКАТА няма поле — чете се от ЗНАКА (правило 20).
 *
 * ═══ ТЕРМИНАЛЪТ ═══
 *
 *   „само след Продажби спира движението и отиват в Продажби Архив. иначе се
 *    въртят постоянно в наеми, ремонт и прпдажби." *(р79·[32])*
 *   „Няма връщане от Продажби Архив. Там не се трив нищо а само се сверява."
 *    *(р79·[34])*
 *
 * Архивът е ЕДНОПОСОЧЕН и това се пази ТУК, не на екрана: екран без бутон се
 * заобикаля с конзолата.
 */

import type { Imot, Ogledalo } from '../ogledalo/ogledalo.js';

export class GreshkaProdazhba extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaProdazhba';
  }
}

/**
 * ПЕТНАЙСЕТТЕ КОЛОНИ · в НЕГОВИЯ ред, с НЕГОВИТЕ имена.
 *
 * Списък, не разметка: така се брои от тест и не може да се разкраси при
 * рисуване. Редът е неговият — включително собствената му корекция за седемте
 * след „СМР €".
 *
 * „Колони не се трият, а само се добавят" — затова новото се ДОЛЕПЯ отдясно,
 * а тези петнайсет стоят на местата си (същият закон като при ценовата листа,
 * ADR-016 §4).
 */
export const KOLONI: readonly string[] = Object.freeze([
  'Обект',
  'Имот',
  'Купувач',
  'Телефон',
  'Цена €',
  'Продажба €',
  'СМР €',
  'ПД',
  'Капаро',
  'НС',
  'НС кеш',
  'Акт 15',
  'Акт 16',
  'проверка',
  'Състояние',
]);

/**
 * КОЛОНИТЕ НА ЖИВАТА ТАБЛИЦА · петнайсетте му плюс добавените етапи.
 *
 * НОВИЯТ ЕТАП ЗАСТАВА ПРЕДИ „проверка", не най-отдясно, и това е решение с
 * причина: „проверка" е СБОР върху вноските, а колона след сбора се чете като
 * „не влиза в него". Неговите петнайсет запазват реда си помежду си — мести се
 * само мястото на сбора, който по устройство стои след слаганите.
 */
export function koloni(o: Ogledalo): readonly string[] {
  /**
   * ВСЕКИ ДОБАВЕН ЕТАП СТАВА КОЛОНА · но от РАЗНИ страни на „проверка".
   *
   * Негов пример, 29.08: „ако реша да вкарам лихва на забавени плащания сам да
   * мога да направя колона в таблицата". Лихвата НЕ е вноска по сделката —
   * значи ограничението „само вноските стават колони" щеше да блокира точно
   * неговия пример. То падна.
   *
   * Мястото обаче не е едно и също, и разликата не е украса:
   *   · ВНОСКА → ПРЕДИ „проверка", защото сборът е върху нея;
   *   · НЕ-вноска → СЛЕД „проверка", защото колона преди сбор, която не влиза
   *     в него, се чете грешно от всеки.
   *
   * Базовите „връщане" и „неустойка" НЯМАТ колона: те не са етапи на сделката,
   * а движения на РАЗВАЛЯНЕТО (§4 на ADR-078), и живеят в своя блок.
   */
  const dobaveni = etapite(o).filter((e) => !e.bazov);
  if (dobaveni.length === 0) return KOLONI;
  const predi = dobaveni.filter((e) => e.vnoska).map((e) => e.klyuch);
  const sled = dobaveni.filter((e) => !e.vnoska).map((e) => e.klyuch);
  const kade = KOLONI.indexOf('проверка');
  return Object.freeze([
    ...KOLONI.slice(0, kade),
    ...predi,
    'проверка',
    ...sled,
    ...KOLONI.slice(kade + 1),
  ]);
}

/** Кои от ЖИВИТЕ колони са затворени · номерата се местят с добавените. */
export function zatvoreniteKoloni(o: Ogledalo): readonly number[] {
  const zhivi = koloni(o);
  return Object.freeze(
    ZATVORENI.map((i) => zhivi.indexOf(KOLONI[i]!)).filter((i) => i >= 0),
  );
}

/**
 * ЗАТВОРЕНИТЕ · колони, които никой не редактира (правило 23).
 *
 * Позиции в `KOLONI`: 0 „Обект" и 1 „Място" идват от имота; 13 „проверка" е
 * сметка. Негово: „Затворената колона от всякъде е само скриване за удобство
 * и връщане, ако решиш" — тоест затвореността спира ПИСАНЕТО, не гледането.
 *
 * Петте вноски НЕ са тук: те се пишат, но през ДВИЖЕНИЕ, не в клетката.
 */
export const ZATVORENI: readonly number[] = Object.freeze([0, 1, 13]);

/**
 * ВИДОВЕТЕ ДВИЖЕНИЕ · петте му вноски плюс двете от развалянето.
 *
 * ИЗБРОЕНИ, не свободен текст — по същата причина, по която „карта" беше
 * изброен при начините на плащане (ADR-074): свободна стойност би паднала
 * ТИХО в чужда графа, и то точно в графата, която решава проверката.
 *
 * ═══ И ТЕ СА БАЗАТА, НЕ ЦЕЛИЯТ СПИСЪК (29.08) ═══
 *
 * Негови думи: „Етапа след акт 15 е в таблицата продажби и какъвто и да е той
 * може да се добави като колона и да се вкара в функционалност по плана, да
 * може всеки да рзвие своя бизнес."
 *
 * Затова етапите РАСТАТ: `etapite(o)` слепва тези седем с онези, които
 * Стопанинът е записал. Тук стои само НЕГОВОТО начало — то не се пипа и не се
 * презаписва, а новото се ДОБАВЯ (`ЕтапНаПродажбаЗаписан`).
 */
export const VIDOVE_DVIZHENIE = [
  { klyuch: 'Капаро', vnoska: true },
  { klyuch: 'НС', vnoska: true },
  { klyuch: 'НС кеш', vnoska: true },
  { klyuch: 'Акт 15', vnoska: true },
  { klyuch: 'Акт 16', vnoska: true },
  { klyuch: 'връщане', vnoska: false },
  { klyuch: 'неустойка', vnoska: false },
] as const;

/** Един етап, както го носи списъкът · базов или добавен. */
export interface Etap {
  readonly klyuch: string;
  readonly vnoska: boolean;
  /** негов ли е от начало, или е добавен от Стопанина */
  readonly bazov: boolean;
}

/**
 * ВСИЧКИТЕ ЕТАПИ · седемте негови плюс добавените, В ТОЗИ РЕД.
 *
 * Базовите СТОЯТ отпред и не се презаписват: те са негови думи, а добавеното
 * е разширение на бизнеса, не поправка на казаното. Дубликат по ключ Вратата
 * не пуска, но и тук се пази — книга може да дойде отвън (правило 1).
 */
export function etapite(o: Ogledalo): readonly Etap[] {
  const bazovi: Etap[] = VIDOVE_DVIZHENIE.map((v) => ({
    klyuch: v.klyuch,
    vnoska: v.vnoska,
    bazov: true,
  }));
  const dobaveni: Etap[] = [];
  for (const e of o.etapiNaProdazhbite.values()) {
    if (bazovi.some((b) => b.klyuch === e.klyuch)) continue;
    if (dobaveni.some((d) => d.klyuch === e.klyuch)) continue;
    dobaveni.push({ klyuch: e.klyuch, vnoska: e.vnoska, bazov: false });
  }
  return Object.freeze([...bazovi, ...dobaveni]);
}

/**
 * Вноска ли е · тоест влиза ли в проверката.
 *
 * ПРИЕМА `string`, не тесен съюз, и това е нарочно: видът идва от ЖУРНАЛА, а
 * той може да носи стойност, писана от по-стара версия или от чужда верига.
 * Тесен тип тук би значел, че четенето се доверява на писането — точно
 * обратното на онова, за което Огледалото съществува.
 *
 * ВТОРИЯТ довод дойде с добавените етапи: списъкът вече НЕ е известен при
 * компилация. Съюзен тип щеше да излъже, че е.
 */
export function eVnoska(vid: string, etapi: readonly Etap[] = VIDOVE_DVIZHENIE.map((v) => ({
  klyuch: v.klyuch,
  vnoska: v.vnoska,
  bazov: true,
}))): boolean {
  return etapi.some((e) => e.klyuch === vid && e.vnoska);
}

/**
 * СЪСТОЯНИЯТА · стрелочникът, с онова, което той Е казал.
 *
 * „Състоянието всъщност прави връзка с определени възможности между таблиците —
 * кога една част от колоните на хедъра, кога друга."
 *
 * ЧЕТИРИ, и всяко има негова дума зад себе си:
 *
 *   · `nezadadeno` — „предупреждение в червено докато не му се смени статъса"
 *     *(р57·[76])*. Новата продажба СЕ ОТВАРЯ тук и стои червена, докато човек
 *     не каже какво е. Това не е липса, а състояние (правило 15);
 *   · `tekushta`   — неговата „Таблица Текущи Продажби" *(р51·[66])*;
 *   · `prodadena`  — „Продажби Архив" · ТЕРМИНАЛЪТ;
 *   · `razvalena`  — „Развалянето е ТРИ отделни движения" *(И97)*.
 *
 * ЕТАПИТЕ МЕЖДУ ТЯХ ГИ НЯМА, и това е ЧЕСТНО, не пропуск: „етапите след
 * Акт 15" стоят в списъка на седемте въпроса без негов отговор, отложени
 * ИМЕННО за този резен (ADR-033 §7). Затова те се БРОЯТ от `CHAKAT_NEGOVA_DUMA`,
 * а не се измислят тук — приложението не гади (ADR-072 §4).
 */
export const SASTOYANIYA = [
  { klyuch: 'nezadadeno', ime: 'не е зададено', arhiv: false },
  { klyuch: 'tekushta', ime: 'текуща', arhiv: false },
  // КЛЮЧЪТ НЕ СЕ МЕНИ, само името: Журналът вече носи „prodadena" и не се
  // преписва (правило 1). Негово, 29.08: „Архив Продажби с ново име Продажби
  // Завършени."
  { klyuch: 'prodadena', ime: 'продадена · завършена', arhiv: true },
  { klyuch: 'razvalena', ime: 'развалена', arhiv: false },
] as const;

/** Името на състоянието · един дом за думите (правило 17). */
export function imeNaSastoyanieto(k: string): string {
  return SASTOYANIYA.find((s) => s.klyuch === k)?.ime ?? k;
}

/** В архива ли е · тоест заключена ли е сделката завинаги. */
export function vArhiva(sastoyanie: string): boolean {
  return SASTOYANIYA.some((s) => s.klyuch === sastoyanie && s.arhiv);
}

/**
 * КАКВОТО ЧАКА НЕГОВАТА ДУМА · изброено поименно, БРОЕНО от екрана.
 *
 * ДНЕС Е ПРАЗЕН, и това е СЪСТОЯНИЕ, не пропуск: трите въпроса, с които този
 * резен беше предаден, получиха отговор на 29.08 — виж `OTGOVORENITE`. Празният
 * списък се КАЗВА на екрана (правило 15), вместо да мълчи.
 *
 * Списъкът остава, защото механизмът важи занапред: следващият въпрос без
 * негов отговор влиза ТУК, а не в изречение, което никой обход не проверява
 * (ADR-067 · ADR-072 · ADR-075).
 */
export const CHAKAT_NEGOVA_DUMA: readonly string[] = Object.freeze([]);

/**
 * КОЕТО ВЕЧЕ ИМА НЕГОВ ОТГОВОР · с дословните му думи (29.08).
 *
 * Стои като СПИСЪК, а не в шапка, по същата причина, по която чакащото стои
 * като списък: така се БРОИ и се показва, вместо да се твърди. Отговор, скрит
 * в коментар, не се вижда от онзи, който утре пита същото.
 */
export const OTGOVORENITE: readonly { readonly vapros: string; readonly dumite: string }[] =
  Object.freeze([
    Object.freeze({
      vapros: 'етапите след Акт 15',
      dumite:
        'Етапа след акт 15 е в таблицата продажби и какъвто и да е той може да се ' +
        'добави като колона и да се вкара в функционалност по плана, да може всеки ' +
        'да рзвие своя бизнес. Акт 16 е след Акт 15.',
    }),
    Object.freeze({
      vapros: 'лихвата при просрочие на вноска',
      dumite: 'Няма лихва.',
    }),
    Object.freeze({
      vapros: '„Продажба €" срещу „ПД + СМР"',
      dumite:
        'Пд и СМР е двата пътя на парите по банка за покупка с ПД(Предварителен ' +
        'Договор и) и СМР(Строително монтажнио работи(. Тях ги получаваме ние на ' +
        'ръка и са кеш. Даа има избор.',
    }),
  ]);

/** Едно движение, както Огледалото го пази. */
export interface DvizhenieNaProdazhba {
  readonly id: string;
  readonly seq: number;
  readonly prodazhbaId: string;
  readonly vid: string;
  readonly suma_st: number;
  readonly data: string;
  readonly belezhka: string;
  /** банка · карта · в брой — „Даа има избор." (29.08) */
  readonly nachin: string;
}

/** Една сделка, както Огледалото я пази. */
export interface Prodazhba {
  readonly id: string;
  readonly seq: number;
  readonly imotId: string;
  readonly kupuvach: string;
  readonly telefon: string;
  readonly tsena_st: number;
  readonly prodazhba_st: number;
  readonly smr_st: number;
  readonly pd_st: number;
  readonly sastoyanie: string;
}

/** Адресът на една сделка · един дом (правило 17). */
export function sashtnostNaProdazhba(id: string): string {
  return `PRD:${id}`;
}

/** Адресът на едно движение. */
export function sashtnostNaDvizhenie(id: string): string {
  return `PRDD:${id}`;
}

/**
 * ПРОВЕРКАТА · неговата колона, смятана.
 *
 * „обющата Сума на сделката от ПД и СМР" срещу „общата сума на вноските".
 *
 * ТРИ неща, които тя НЕ прави, и всяко е решение:
 *   · НЕ брои връщането и неустойката — „никакво нетиране";
 *   · НЕ брои сторнираните движения — тях Огледалото вече ги е свалило;
 *   · НЕ се закръгля — тя е РАЗЛИКА на цели центове (правило 3 · `/matematika`:
 *     закръгленото никога не влиза в сбор).
 */
export interface Proverka {
  /** ПД + СМР */
  readonly sdelka_st: number;
  /** сборът на ВНОСКИТЕ · без връщане и неустойка */
  readonly vnoski_st: number;
  /** сделката минус вноските · нула значи изплатена */
  readonly razlika_st: number;
  /** ДУМАТА · за да не се чете знакът наум */
  readonly duma: string;
}

export function proverkata(
  p: Prodazhba,
  dvizheniya: readonly DvizhenieNaProdazhba[],
  etapi?: readonly Etap[],
): Proverka {
  const sdelka_st = p.pd_st + p.smr_st;
  const vnoski_st = dvizheniya
    .filter((d) => d.prodazhbaId === p.id && (etapi ? eVnoska(d.vid, etapi) : eVnoska(d.vid)))
    .reduce((s, d) => s + d.suma_st, 0);
  const razlika_st = sdelka_st - vnoski_st;
  return Object.freeze({
    sdelka_st,
    vnoski_st,
    razlika_st,
    duma: razlika_st === 0 ? 'изплатена' : razlika_st > 0 ? 'остава да плати' : 'надплатено',
  });
}

/**
 * КОЕТО НЕ ВЛИЗА В ПРОВЕРКАТА · показва се ОТДЕЛНО, не се събира.
 *
 * „Неустойките се превеждат ОТДЕЛНО, никакво нетиране." Едно число за двете
 * би било точно нетирането, което той забрани — затова се връщат две.
 */
export interface IzvanProverkata {
  readonly vrashtane_st: number;
  readonly neustoyka_st: number;
}

export function izvanProverkata(
  prodazhbaId: string,
  dvizheniya: readonly DvizhenieNaProdazhba[],
): IzvanProverkata {
  const moite = dvizheniya.filter((d) => d.prodazhbaId === prodazhbaId);
  return Object.freeze({
    vrashtane_st: moite.filter((d) => d.vid === 'връщане').reduce((s, d) => s + d.suma_st, 0),
    neustoyka_st: moite.filter((d) => d.vid === 'неустойка').reduce((s, d) => s + d.suma_st, 0),
  });
}

/**
 * ПОСОКАТА · СМЯТА се от знака, никога не се записва (правило 20).
 *
 * Негово, за неустойката: тя „няма поле за посока — вижда се от
 * Приходи/Разходи". Тоест посоката Е знакът, а не втора клетка до него: две
 * места за един факт се разминават при първата поправка (правило 17).
 */
export type Posoka = 'prihod' | 'razhod' | 'nula';

export function posokata(suma_st: number): Posoka {
  if (suma_st > 0) return 'prihod';
  if (suma_st < 0) return 'razhod';
  return 'nula';
}

/**
 * ОБЕКТЪТ И МЯСТОТО · ЧЕТАТ се от имота, не се преписват на сделката.
 *
 * Имотът носи `adres` и `edinitsa`. Негов „Обект" е единицата (кой апартамент),
 * негово „Място" е адресът (коя сграда) — същото разделение, което таблицата
 * Имоти слепва в една колона „Място и единица".
 *
 * Преписани в сделката, двете щяха да се разминат при първата поправка на
 * адреса — а поправката на имот е събитие, което сделките не виждат.
 */
export function obektIMyasto(p: Prodazhba, imoti: ReadonlyMap<string, Imot>): {
  readonly obekt: string;
  readonly myasto: string;
} {
  const i = imoti.get(p.imotId);
  return Object.freeze({
    obekt: i ? i.edinitsa : '',
    myasto: i ? i.adres : '',
  });
}

/**
 * ЕДИН РЕД от таблицата · петнайсетте колони, готови за екрана.
 *
 * Смята се ТУК, не при рисуването: втора сметка на екрана щеше да се разминава
 * с първата в деня, в който едната се поправи (правило 17).
 */
export interface RedNaProdazhbite {
  readonly prodazhba: Prodazhba;
  readonly obekt: string;
  readonly myasto: string;
  /**
   * СБОРЪТ ПО ЕТАП · всеки етап, не само вноските (29.08).
   *
   * Добавената „лихва" също носи пари и също иска клетка — иначе колоната ѝ
   * щеше да стои празна. Кое от тях влиза в проверката, решава `eVnoska`, не
   * тази карта: една сметка, един дом (правило 17).
   */
  readonly poEtap: Readonly<Record<string, number>>;
  readonly proverka: Proverka;
  readonly izvan: IzvanProverkata;
  /** датите под вноските · „за да е прегледно после и в архива" */
  readonly dati: Readonly<Record<string, string>>;
}

export function redovete(o: Ogledalo): readonly RedNaProdazhbite[] {
  const dvizheniya = [...o.dvizheniyaNaProdazhbi];
  const etapi = etapite(o);
  return Object.freeze(
    [...o.prodazhbi.values()].map((p) => {
      const moite = dvizheniya.filter((d) => d.prodazhbaId === p.id);
      const poEtap: Record<string, number> = {};
      const dati: Record<string, string> = {};
      for (const v of etapi) {
        const negovite = moite.filter((d) => d.vid === v.klyuch);
        poEtap[v.klyuch] = negovite.reduce((s, d) => s + d.suma_st, 0);
        // ПОСЛЕДНАТА дата, не първата: човек гледа докъде е стигнало плащането.
        dati[v.klyuch] = negovite.length === 0 ? '' : negovite[negovite.length - 1]!.data;
      }
      const { obekt, myasto } = obektIMyasto(p, o.imoti);
      return Object.freeze({
        prodazhba: p,
        obekt,
        myasto,
        poEtap: Object.freeze(poEtap),
        dati: Object.freeze(dati),
        proverka: proverkata(p, moite, etapi),
        izvan: izvanProverkata(p.id, moite),
      });
    }),
  );
}

/**
 * НАЧАЛНАТА ПОДРЕДБА · негова, приета: „По правилото (спешност → Оценка →
 * завършените долу)" *(р75·[50])*.
 *
 * Тук „завършените долу" е онова, което кодът МОЖЕ да изпълни днес: архивните
 * падат най-отдолу, недовършените стоят горе. „Спешност" и „Оценка" искат
 * етапите, които още чакат негова дума — затова не се преструваме, че ги има.
 */
export function podredeni(redove: readonly RedNaProdazhbite[]): readonly RedNaProdazhbite[] {
  return Object.freeze(
    [...redove].sort((a, b) => {
      const aa = vArhiva(a.prodazhba.sastoyanie) ? 1 : 0;
      const bb = vArhiva(b.prodazhba.sastoyanie) ? 1 : 0;
      if (aa !== bb) return aa - bb;
      // вътре в групата: първо онези, които ОЩЕ дължат
      return b.proverka.razlika_st - a.proverka.razlika_st;
    }),
  );
}

/**
 * СВЕРКА ВХОД↔ИЗХОД върху таблицата (правило 7).
 *
 * ВХОД: всяко движение, което Огледалото носи.
 * ИЗХОД: онова, което таблицата ПОКАЗВА — вноски + връщане + неустойка.
 *
 * Разликата е нула и тогава, когато всичко е наред — и точно затова се записва:
 * проверената нула е различна от нулата, за която никой не е питал.
 *
 * Хваща движение, увиснало на несъществуваща сделка: то е в Журнала, но никой
 * ред не го показва — тиха загуба, ако не се брои.
 */
export interface SverkaNaProdazhbite {
  readonly vhod: number;
  readonly izhod: number;
  readonly razlika: number;
  readonly bezSdelka: readonly string[];
}

export function sveri(
  o: Ogledalo,
  redove: readonly RedNaProdazhbite[],
): SverkaNaProdazhbite {
  const vhod = o.dvizheniyaNaProdazhbi.length;
  let izhod = 0;
  for (const r of redove) {
    izhod += o.dvizheniyaNaProdazhbi.filter((d) => d.prodazhbaId === r.prodazhba.id).length;
  }
  const bezSdelka = o.dvizheniyaNaProdazhbi
    .filter((d) => !o.prodazhbi.has(d.prodazhbaId))
    .map((d) => d.id);
  return Object.freeze({ vhod, izhod, razlika: vhod - izhod, bezSdelka: Object.freeze(bezSdelka) });
}

// ── ИЗХОДЪТ НА СДЕЛКАТА · Вземания и Приход (резен 23 · ADR-083) ───────────

/**
 * ДОКЪДЕ СЕ БРОИ ВЗЕМАНЕ · границата, казана точно.
 *
 * Негова (И90): вземането от продажба е „до Акт 16". А шапката на полето в
 * Отчети добавя второто: „след нотариалната сделка сделката е приключила и е в
 * архива, дори с неплатени суми по договор."
 *
 * Значи границите са ДВЕ и важи по-РАННАТА:
 *
 *   · записано движение „Акт 16" — актът е дошъл;
 *   · състояние В АРХИВА (`vArhiva`) — сделката е приключена от човек.
 *
 * Едната без другата би оставила вземане да виси: сделка в архива без Акт 16
 * щеше да дължи вечно, а Акт 16 по текуща сделка щеше да я брои след акта.
 */
export const ETAP_KOYTO_ZATVARYA = 'Акт 16';

export interface VzemaneOtProdazhba {
  readonly prodazhbaId: string;
  readonly kupuvach: string;
  readonly ostatak_st: number;
}

export interface VzemaniyataOtProdazhbi {
  readonly redove: readonly VzemaneOtProdazhba[];
  readonly sbor_st: number;
  /**
   * НАДПЛАТЕНИТЕ · БРОЯТ се, не се нетират.
   *
   * Надплатена сделка е ЗАДЪЛЖЕНИЕ към купувача, не отрицателно вземане.
   * Извадена наум от сбора, тя щеше да намали „кой ми дължи" с пари, които
   * НИЕ дължим — точно нетирането, което той забрани при неустойките.
   * Мястото ѝ сред Задълженията иска негова дума; дотогава се КАЗВА.
   */
  readonly nadplateni: readonly string[];
}

/**
 * ВЗЕМАНИЯТА ОТ ПРОДАЖБИ · сметнати от вече построената проверка.
 *
 * `proverkata` дава `razlika_st` = сделка − вноски. Втора сметка тук би се
 * разминала с колоната „проверка" в деня, в който едната се поправи
 * (правило 17) — затова се ЧЕТЕ, не се смята наново.
 */
export function vzemaniyaOtProdazhbi(o: Ogledalo): VzemaniyataOtProdazhbi {
  const etapi = etapite(o);
  const redove: VzemaneOtProdazhba[] = [];
  const nadplateni: string[] = [];

  for (const p of o.prodazhbi.values()) {
    if (vArhiva(p.sastoyanie)) continue;
    const moite = o.dvizheniyaNaProdazhbi.filter((d) => d.prodazhbaId === p.id);
    if (moite.some((d) => d.vid === ETAP_KOYTO_ZATVARYA)) continue;
    const { razlika_st } = proverkata(p, moite, etapi);
    if (razlika_st > 0) {
      redove.push(Object.freeze({ prodazhbaId: p.id, kupuvach: p.kupuvach, ostatak_st: razlika_st }));
    } else if (razlika_st < 0) {
      nadplateni.push(p.id);
    }
  }

  return Object.freeze({
    redove: Object.freeze(redove.sort((a, b) => b.ostatak_st - a.ostatak_st)),
    sbor_st: redove.reduce((s, r) => s + r.ostatak_st, 0),
    nadplateni: Object.freeze(nadplateni.sort()),
  });
}

/**
 * ПРИХОДЪТ ОТ ВНОСКИ за един месец · „по датата на вноската".
 *
 * Негово *(р75·[50])*: „Така ще се праща директно с датат в редовете с Приход
 * в главната таблица." Тоест месецът се решава от датата на ДВИЖЕНИЕТО, не от
 * датата на сделката — сделка от март с вноска през август е приход за август.
 *
 * СМЯТА СЕ, не се записва. Записан, той щеше да се удвои с реалното плащане от
 * извлечението — същата поука, която направи ред-проекцията на кредитите сбор,
 * а не запис (ADR-079).
 *
 * ВРЪЩАНЕТО И НЕУСТОЙКАТА НЕ ВЛИЗАТ. Негово: „Неустойките се превеждат
 * ОТДЕЛНО, никакво нетиране." Те се показват на своя ред в Продажби
 * (`izvanProverkata`) и чакат собствен резен; събрани тук, те щяха да са точно
 * нетирането, което той забрани.
 */
export interface PrihodOtProdazhbi {
  readonly suma_st: number;
  readonly broy: number;
}

export function prihodOtProdazhbi(o: Ogledalo, period: string): PrihodOtProdazhbi {
  const etapi = etapite(o);
  const nashi = o.dvizheniyaNaProdazhbi.filter(
    (d) =>
      d.data.slice(0, 7) === period &&
      eVnoska(d.vid, etapi) &&
      o.prodazhbi.has(d.prodazhbaId),
  );
  return Object.freeze({
    suma_st: nashi.reduce((s, d) => s + d.suma_st, 0),
    broy: nashi.length,
  });
}

/**
 * КАКВО ЧАКА НЕГОВАТА ДУМА ЗА ДДС · изброено поименно, БРОЕНО от екрана.
 *
 * Вноската по продажба на СГРАДА носи ДДС по правила, които зависят от това
 * дали сградата е „нова" и от чл. 45 ЗДДС — това е СЧЕТОВОДНА ПРЕЦЕНКА, не
 * аритметика (правило 18). Затова приходът от продажби НЕ влиза в
 * ДДС-акумулаторите, и мълчанието тук би било по-скъпо от празния ред:
 * тихо начислени 20 % върху продажба на имот са глоба, не закръгляне.
 */
export const CHAKA_DUMA_ZA_DDS: readonly string[] = Object.freeze([
  'нова ли е сградата по смисъла на ЗДДС · от това зависи облагаема ли е доставката',
  'коя част от вноската е земя и коя — сграда (чл. 45 ЗДДС ги дели)',
  'ставката на реда, ако доставката е облагаема',
]);
