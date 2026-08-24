/**
 * АГЕНТИТЕ · картата, протоколът, законите и присъдите (И92 т.10).
 *
 * Негова поръчка: „Правиш табло. Там да има ИИ активиран и свързване. С
 * питане за потвърждение. Описани рисковете… за работа име и достъп на
 * агента. Виж практиката. Да има поле със закони. Неговата работа и
 * длъжностна характеристика. И едно поле за даване на текущи задачи и списък
 * с журнал за този таб — работата на агентите, вкараните задачи и всичко
 * нужно от такива управления."
 *
 * КАКВО КАЗВА ЗАНАЯТЪТ (`docs/otcheti/prouchvaniya-i92.md`): Microsoft Entra
 * дава на всеки агент самоличност и ЧОВЕК-СПОНСОР; Salesforce Agentforce
 * държи длъжностната като ЧЕТИМ ДОКУМЕНТ (Topics + Instructions + Actions) и
 * изброява guardrails-ите поименно; Claude Code оценява по ред забрана →
 * питане → позволение; LangGraph дава на човека четири присъди (приеми ·
 * поправи · отхвърли · отговори); Purview логва всяко решение на политика.
 *
 * И КЪДЕ СМЕ ПО-СТРОГИ. Индустрията одобрява ДЕЙСТВИЕ по действие — агентът
 * пак пише, само с позволение. Тук агентът НЯМА път към запис (правило 18):
 * той чете, смята и ПРЕДЛАГА; записва ЧОВЕКЪТ и `actor` е неговият имейл.
 * Затова екранът не казва „одобри и той ще запише", а „приеми и АЗ записвам".
 *
 * ЕДИН ДОМ (правило 17): протоколът е този документ. Промптът се СГЛОБЯВА от
 * него (`sglobiProtokol`), не се пише втори път — иначе двата се разминават,
 * както „132 проверки" срещу 152, и следата „предложено от агент X с протокол
 * Y" сочи протокол, който вече лъже.
 */

export class GreshkaAgent extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaAgent';
  }
}

/** Трите състояния на агента. Спрян ≠ изключен: кранът е трети контрол. */
export const SASTOYANIYA_NA_AGENT = ['izklyuchen', 'vklyuchen', 'spryan'] as const;

export type SastoyanieNaAgent = (typeof SASTOYANIYA_NA_AGENT)[number];

export const IMENA_NA_SASTOYANIYATA: Readonly<Record<SastoyanieNaAgent, string>> = Object.freeze({
  izklyuchen: 'изключен',
  vklyuchen: 'включен',
  spryan: 'спрян с крана',
});

/**
 * Обхватът · КОИ екрана вижда агентът. Посоката е ЕДНА — само четене
 * (правило 20: бутон, който чете, няма път към писане). Затова тук няма
 * стойност „пише" и не се добавя.
 */
export const OBHVATI = ['smetki', 'pari', 'imoti', 'stoynost', 'gant'] as const;

export type Obhvat = (typeof OBHVATI)[number];

export const IMENA_NA_OBHVATITE: Readonly<Record<Obhvat, string>> = Object.freeze({
  smetki: 'Сметки',
  pari: 'Пари',
  imoti: 'Имоти',
  stoynost: 'Стойност на Състояние',
  gant: 'Управление',
});

/**
 * ЗАКОНИТЕ · guardrails, изброени ПОИМЕННО (Agentforce), с реда на оценка на
 * Claude Code: забрана → питане → позволение, първото съвпадение печели.
 * Подразбраното е ЗАБРАНА (правило 18), докато някой не намери начин.
 */
export interface Zakon {
  readonly klyuch: string;
  readonly kakvo: string;
  /** къде живее правилото, което го поражда — за следата назад */
  readonly dom: string;
}

export const ZAKONITE: readonly Zakon[] = Object.freeze([
  Object.freeze({
    klyuch: 'ne-pishe',
    kakvo: 'Агентът не пише в Журнала. Никога, при никакво позволение.',
    dom: 'правило 18 · ADR-005',
  }),
  Object.freeze({
    klyuch: 'chovek-zapisva',
    kakvo: 'Записва човекът и `actor` е неговият имейл; бележката носи „предложено от агент: …".',
    dom: 'правило 18',
  }),
  Object.freeze({
    klyuch: 'sverka',
    kakvo: 'Всяко предложение носи сверка вход↔изход, дори когато разликата е нула.',
    dom: 'правило 7',
  }),
  Object.freeze({
    klyuch: 'ne-vizhda-upravlenie',
    kakvo: 'Счетоводният агент живее в Сметки и НЕ вижда Управление.',
    dom: 'правило 18',
  }),
  Object.freeze({
    klyuch: 'zamrazen-period',
    kakvo: 'Предложение за замразен месец минава по пътя на сверената промяна: сторно + ново + следа.',
    dom: 'правило 9',
  }),
  Object.freeze({
    klyuch: 'podrazbiranata-zabrana',
    kakvo: 'Каквото не е изброено като позволено, е забранено — редът е забрана → питане → позволение.',
    dom: 'правило 18 · практиката на Claude Code',
  }),
]);

/**
 * ЕДНО УМЕНИЕ · негова поръчка (24.08), дословно:
 *
 *   „Добави и Умения, които могат да се добавят, махат, включват и изключват.
 *    Има характеристика, като се създаде, и добавени умения после. Ако е
 *    по-добре, нека и Характеристиката е умение, активирано постоянно, а
 *    задачите да се добавят ръчно или след разговор с изкуствения интелект."
 *
 * Затова умението е ЗАПИС, не низ: има име, съдържание и състояние. И затова
 * ХАРАКТЕРИСТИКАТА е умение като другите, само че ПОСТОЯННО — не се маха и
 * не се изключва. Така има ЕДИН списък вместо две полета (правило 17): без
 * него длъжностната живее отделно и се разминава с уменията, които я описват.
 */
export interface Umenie {
  readonly klyuch: string;
  readonly ime: string;
  /** какво носи умението, с думи — влиза в промпта, когато е включено */
  readonly tekst: string;
  readonly vklyucheno: boolean;
  /** постоянното не се маха и не се изключва — такава е характеристиката */
  readonly postoyanno: boolean;
}

/** Ключът на постоянното умение · характеристиката. Един е и се знае. */
export const KLYUCH_HARAKTERISTIKA = 'harakteristika';

/** Картата на агента — един агент, един ред (Agent Registry на Microsoft). */
export interface Agent {
  readonly klyuch: string;
  /** името, дадено от човека: „Счетоводителят" */
  readonly ime: string;
  /** ЧОВЕКЪТ-отговорник · неговият имейл става `actor` при всяко записване */
  readonly otgovornik: string;
  readonly sastoyanie: SastoyanieNaAgent;
  /** от коя дата е включен · празно, докато не е включван */
  readonly ot: string;
  /** обхватът · кои екрана ЧЕТЕ */
  readonly obhvat: readonly Obhvat[];
  /** ЗАБРАНИТЕ, изброени поименно от човека (правило 18) */
  readonly zabrani: readonly string[];
  /**
   * УМЕНИЯТА · първото е характеристиката (постоянна), останалите се добавят,
   * махат, включват и изключват. Правило 25 не пада — то важи за ЗАДАЧАТА:
   * всяко предложение назовава ТРИ умения, избрани измежду ВКЛЮЧЕНИТЕ.
   */
  readonly umeniya: readonly Umenie[];
}

/** Колко умения назовава ЕДНА ЗАДАЧА (правило 25). */
export const BROY_UMENIYA = 3;

/** Характеристиката на агента — постоянното умение. */
export function harakteristika(a: Agent): Umenie | undefined {
  return a.umeniya.find((u) => u.postoyanno);
}

/** Включените умения — те влизат в промпта и се избират за задача. */
export function vklyuchenite(a: Agent): readonly Umenie[] {
  return a.umeniya.filter((u) => u.vklyucheno);
}

function chistKlyuch(ime: string): string {
  return ime.trim().replace(/\s+/g, '-').toLowerCase();
}

/**
 * ДОБАВЯ УМЕНИЕ · ново се ражда ВКЛЮЧЕНО, защото човек го добавя, за да го
 * ползва. Изключването е отделно действие и оставя следа.
 */
export function dobaviUmenie(
  a: Agent,
  n: { readonly ime: string; readonly tekst: string },
): Agent {
  const ime = n.ime.trim().replace(/\s+/g, ' ');
  if (ime === '') throw new GreshkaAgent('Умението иска име — по него се избира за задача.');
  const klyuch = chistKlyuch(ime);
  if (a.umeniya.some((u) => u.klyuch === klyuch)) {
    throw new GreshkaAgent(`Умение „${ime}" вече го има при „${a.ime}".`);
  }
  return Object.freeze({
    ...a,
    umeniya: Object.freeze([
      ...a.umeniya,
      Object.freeze({ klyuch, ime, tekst: n.tekst.trim(), vklyucheno: true, postoyanno: false }),
    ]),
  });
}

/** МАХА умение · постоянното не се маха (то е характеристиката). */
export function premahniUmenie(a: Agent, klyuch: string): Agent {
  const u = a.umeniya.find((x) => x.klyuch === klyuch);
  if (!u) throw new GreshkaAgent(`Няма умение „${klyuch}" при „${a.ime}".`);
  if (u.postoyanno) {
    throw new GreshkaAgent(
      `„${u.ime}" е ПОСТОЯННО умение — характеристиката не се маха. Тя се пренаписва.`,
    );
  }
  return Object.freeze({ ...a, umeniya: Object.freeze(a.umeniya.filter((x) => x.klyuch !== klyuch)) });
}

/** ВКЛЮЧВА или ИЗКЛЮЧВА умение · постоянното си стои включено. */
export function prevklyuchiUmenie(a: Agent, klyuch: string, vklyucheno: boolean): Agent {
  const u = a.umeniya.find((x) => x.klyuch === klyuch);
  if (!u) throw new GreshkaAgent(`Няма умение „${klyuch}" при „${a.ime}".`);
  if (u.postoyanno && !vklyucheno) {
    throw new GreshkaAgent(
      `„${u.ime}" е ПОСТОЯННО умение — то не се изключва, иначе агентът остава без работа.`,
    );
  }
  return Object.freeze({
    ...a,
    umeniya: Object.freeze(
      a.umeniya.map((x) => (x.klyuch === klyuch ? Object.freeze({ ...x, vklyucheno }) : x)),
    ),
  });
}

/** ПРЕНАПИСВА характеристиката · тя не се маха, но се поправя. */
export function smeniHarakteristikata(a: Agent, tekst: string): Agent {
  if (tekst.trim() === '') {
    throw new GreshkaAgent('Длъжностната характеристика не е украса — без нея агентът няма работа.');
  }
  return Object.freeze({
    ...a,
    umeniya: Object.freeze(
      a.umeniya.map((u) => (u.postoyanno ? Object.freeze({ ...u, tekst: tekst.trim() }) : u)),
    ),
  });
}

/**
 * ТРИТЕ УМЕНИЯ НА ЗАДАЧАТА (правило 25) · избират се измежду ВКЛЮЧЕНИТЕ.
 *
 * „Подразбраното умение е забрана, докато някой не избере" — затова изборът е
 * изричен и точно три, а изключеното умение не може да бъде избрано: иначе
 * изключването щеше да е украса.
 */
export function proveriTriUmeniya(a: Agent, klyuchove: readonly string[]): readonly string[] {
  const chisti = [...new Set(klyuchove.map((x) => x.trim()).filter((x) => x !== ''))];
  if (chisti.length !== BROY_UMENIYA) {
    throw new GreshkaAgent(
      `Задачата назовава ТРИ умения, избрани за нея (правило 25); подадени са ${chisti.length}.`,
    );
  }
  const vklyucheni = new Set(vklyuchenite(a).map((u) => u.klyuch));
  for (const k of chisti) {
    if (!vklyucheni.has(k)) {
      const ima = a.umeniya.find((u) => u.klyuch === k);
      throw new GreshkaAgent(
        ima
          ? `Умение „${ima.ime}" е ИЗКЛЮЧЕНО — изключеното не се избира за задача.`
          : `Няма умение „${k}" при „${a.ime}".`,
      );
    }
  }
  return Object.freeze(chisti);
}

/**
 * Прави агент от избора на човека и веднага го проверява.
 *
 * При СЪЗДАВАНЕ се дава характеристиката — тя става ПОСТОЯННОТО умение.
 * Другите умения се добавят после (`dobaviUmenie`), негова поръчка: „има
 * характеристика, като се създаде, и добавени умения после".
 */
export function napraviAgent(n: {
  klyuch: string;
  ime: string;
  otgovornik: string;
  sastoyanie?: SastoyanieNaAgent;
  ot?: string;
  /** длъжностната характеристика · става постоянното умение */
  harakteristika: string;
  obhvat: readonly Obhvat[];
  zabrani: readonly string[];
  /** умения, добавени още при създаването · всяко се ражда включено */
  umeniya?: readonly { readonly ime: string; readonly tekst: string }[];
}): Agent {
  const ime = n.ime.trim().replace(/\s+/g, ' ');
  if (ime === '') throw new GreshkaAgent('Агентът иска име — по него се разпознава в журнала.');

  const otgovornik = n.otgovornik.trim();
  if (otgovornik === '') {
    throw new GreshkaAgent(
      'Агентът иска ЧОВЕК-отговорник — неговият имейл става `actor` на всичко, което той предложи.',
    );
  }

  const zabrani = n.zabrani.map((z) => z.trim()).filter((z) => z !== '');
  if (zabrani.length === 0) {
    throw new GreshkaAgent(
      'Протоколът иска забраните да са ИЗБРОЕНИ ПОИМЕННО (правило 18) — празен списък не е протокол.',
    );
  }

  for (const o of n.obhvat) {
    if (!(OBHVATI as readonly string[]).includes(o)) {
      throw new GreshkaAgent(`Няма такъв обхват: „${o}".`);
    }
  }

  if (n.harakteristika.trim() === '') {
    throw new GreshkaAgent('Длъжностната характеристика не е украса — без нея агентът няма работа.');
  }

  const gol: Agent = Object.freeze({
    klyuch: n.klyuch.trim() || ime,
    ime,
    otgovornik,
    sastoyanie: n.sastoyanie ?? 'izklyuchen',
    ot: n.ot ?? '',
    obhvat: Object.freeze([...new Set(n.obhvat)]),
    zabrani: Object.freeze(zabrani),
    umeniya: Object.freeze([
      Object.freeze({
        klyuch: KLYUCH_HARAKTERISTIKA,
        ime: 'Характеристика',
        tekst: n.harakteristika.trim(),
        vklyucheno: true,
        postoyanno: true,
      }),
    ]),
  });

  return (n.umeniya ?? []).reduce((a, u) => dobaviUmenie(a, u), gol);
}

/**
 * ПРОМПТЪТ СЕ СГЛОБЯВА ОТ ДОКУМЕНТА · един дом (правило 17).
 *
 * Ако екранният протокол и истинският промпт се пишат поотделно, ще се
 * разминат — и следата „предложено от агент с протокол Х" ще сочи протокол,
 * който вече лъже. Затова има само този сглобител.
 */
export function sglobiProtokol(a: Agent): string {
  const har = harakteristika(a);
  const dobaveni = vklyuchenite(a).filter((u) => !u.postoyanno);
  return [
    `Ти си „${a.ime}" — агент на MasterBook, отговорник ${a.otgovornik}.`,
    `РАБОТА: ${har?.tekst ?? ''}`,
    `ОБХВАТ (само ЧЕТЕНЕ): ${a.obhvat.map((o) => IMENA_NA_OBHVATITE[o]).join(' · ') || 'няма'}`,
    `ЗАБРАНИ, изброени поименно: ${a.zabrani.join(' · ')}`,
    // ИЗКЛЮЧЕНОТО умение НЕ влиза в промпта — иначе изключването щеше да е
    // само надпис на екрана, а агентът пак щеше да го носи.
    `ВКЛЮЧЕНИ УМЕНИЯ: ${dobaveni.map((u) => `${u.ime}${u.tekst ? ` (${u.tekst})` : ''}`).join(' · ') || 'няма добавени'}`,
    `ЗАКОНИ: ${ZAKONITE.map((z) => z.kakvo).join(' ')}`,
    'Ти ЧЕТЕШ, СМЯТАШ и ПРЕДЛАГАШ. Не записваш нищо — записва човекът.',
  ].join('\n');
}

/** Четирите присъди на човека върху предложение (LangGraph HITL). */
export const PRISADI = ['chaka', 'prieto', 'popraveno', 'othvarleno'] as const;

export type Prisada = (typeof PRISADI)[number];

export const IMENA_NA_PRISADITE: Readonly<Record<Prisada, string>> = Object.freeze({
  chaka: 'чака',
  prieto: 'прието',
  popraveno: 'поправено и прието',
  othvarleno: 'отхвърлено',
});

/**
 * Едно предложение на агент, каквото стои във входящата кутия.
 *
 * `sverka` е задължителна: prompt injection може да изкриви какво агентът
 * СМЯТА, дори когато няма право да пише — предложение, прието на доверие,
 * пренася заразата. Затова числата се сверяват вход↔изход преди присъдата
 * (правило 7), и разликата се показва дори нулева.
 */
export interface Predlozhenie {
  readonly id: string;
  readonly agent: string;
  /** задачата, по която е дадено */
  readonly zadacha: string;
  /** какво предлага, с думи */
  readonly kakvo: string;
  /** ТРИТЕ умения, избрани за ТАЗИ задача (правило 25) — ключове */
  readonly umeniya: readonly string[];
  readonly sverka: { readonly vhod: number; readonly izhod: number };
  readonly prisada: Prisada;
  /** причината при отхвърляне или поправка — празна при „чака" */
  readonly prichina: string;
  /** кой е отсъдил · празно, докато чака */
  readonly otsadil: string;
  readonly kogato: string;
}

export function razlikaNaSverkata(p: Predlozhenie): number {
  return p.sverka.izhod - p.sverka.vhod;
}

/** Затваря ли сверката. Нулата ТУК е проверена нула, не липса на въпрос. */
export function sverkataZatvarya(p: Predlozhenie): boolean {
  return razlikaNaSverkata(p) === 0;
}

/**
 * МОЖЕ ЛИ АГЕНТЪТ ДА РАБОТИ СЕГА · тройният контрол, показан ПООТДЕЛНО.
 *
 * Правило 15: „изключено ≠ липсващо". Затова трите не се сливат в едно
 * булево — всяко се вижда само за себе си, и екранът казва кое липсва.
 */
export interface TroyniyatKontrol {
  /** планът дава ли възможността `svarzhi-ii` */
  readonly pravo: boolean;
  /** отметката на Таблото включена ли е */
  readonly otmetka: boolean;
  /** кранът отворен ли е (`vrata.zatvorena === false`) */
  readonly kran: boolean;
}

export function mozheDaRaboti(a: Agent, k: TroyniyatKontrol): boolean {
  return a.sastoyanie === 'vklyuchen' && k.pravo && k.otmetka && k.kran;
}

/** Какво липсва, с думи — за екрана. Празно значи „работи". */
export function kakvoLipsva(a: Agent, k: TroyniyatKontrol): readonly string[] {
  const lipsva: string[] = [];
  if (!k.pravo) lipsva.push('планът не дава свързване на ИИ');
  if (!k.otmetka) lipsva.push('отметката на Таблото е изключена');
  if (!k.kran) lipsva.push('кранът е дръпнат — Вратата е затворена');
  if (a.sastoyanie === 'izklyuchen') lipsva.push('агентът не е включен');
  if (a.sastoyanie === 'spryan') lipsva.push('агентът е спрян');
  return Object.freeze(lipsva);
}

/** Броените показатели на журнала — числа, които се БРОЯТ (правило 17). */
export interface BroyeniPokazateli {
  readonly vsichki: number;
  readonly chakat: number;
  readonly prieti: number;
  readonly othvarleni: number;
  readonly razminavaniya: number;
}

export function pokazateli(predlozheniya: readonly Predlozhenie[]): BroyeniPokazateli {
  return {
    vsichki: predlozheniya.length,
    chakat: predlozheniya.filter((p) => p.prisada === 'chaka').length,
    prieti: predlozheniya.filter((p) => p.prisada === 'prieto' || p.prisada === 'popraveno').length,
    othvarleni: predlozheniya.filter((p) => p.prisada === 'othvarleno').length,
    razminavaniya: predlozheniya.filter((p) => !sverkataZatvarya(p)).length,
  };
}
