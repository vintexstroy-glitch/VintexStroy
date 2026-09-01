/**
 * КОНТАКТИ И ПРЕПИСКИ · един таб, две секции (резен 38 · M10).
 *
 * ═══ НЕГОВИТЕ ДУМИ · дословно ═══
 *
 * „**Един таб, две секции**" *(р57·[30])*
 *
 * „Има още **събери Преписки и контакти** и опция да вържеш преписките с
 * календара, **кога са за взимане** кто опция и дата за въвеждане и пращане към
 * календара, а с контактите да правиш среща която пак отива в календара"
 * *(р57·[28])*
 *
 * „**КОгато се вкарва човек става от Преписки и контакти**, но да можеш и от
 * управления да вкарваш много неща." *(р65·[46])*
 *
 * „по-добре е, като се зареждат хората, падащото меню с тях е **навсякъде,
 * където пише отговорник**, а в таблицата за преписки е същото" *(р48·[1318])*
 *
 * „**Не** — остават **отделни записи в Контакти**" *(р64·[76])*
 *
 * ═══ НАХОДКА В ОПИСА · M10 стоеше в „БЕЗ дословен цитат" ═══
 *
 * Описът държеше М10 в раздел Б — онзи, чиито редове чакат да се намери негово
 * изречение в кавички. А `docs/izvori/02` §M10 носи ДЕСЕТ негови изречения,
 * дословни и с адреси. Описът сочеше два ДРУГИ адреса (`docs/03` и `izvori/04`),
 * на които наистина стои преразказ — и заключи от тях за целия модул.
 *
 * ═══ ЕДИН ТАБ, ДВЕ СЕКЦИИ · и защо не са два екрана ═══
 *
 * Контактът е ЧОВЕК; преписката е РАБОТА с човек. Разделени на два екрана, човек
 * би скачал между тях за всяко вписване — а неговата дума е „събери" и „един
 * таб". Затова са една същност-двойка на един екран, като Калкулатора и
 * Ценовата листа (ADR-034).
 *
 * ═══ КОНТАКТЪТ Е НОМЕНКЛАТУРА, НЕ ДОСТЪП ═══
 *
 * „Падащото меню с тях е навсякъде, където пише отговорник" — тоест контактите
 * ХРАНЯТ менютата. Но контакт НЕ дава достъп до програмата: достъпът е при
 * доставчика (правило 14), а „само тези валидираини имейли вкаранои в програмата
 * да могат да се логват" *(р57·[102])* е за СЛУЖИТЕЛИТЕ, които са свой екран.
 * Слети, вписването на контакт щеше да е тиха врата към данните.
 */

import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import { OTSENKI, type OtsenkaNaRed } from './dela.js';

export class GreshkaKontakt extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKontakt';
  }
}

/**
 * СВЕДЕНОТО ИМЕ · ключът на контакта.
 *
 * Същият избор като при мястото (ADR-091): човек пише „Иван Петров" веднъж и
 * „иван петров" следващия път, а това е ЕДИН човек. Ключ по свободен текст щеше
 * да роди двама и да раздели преписките им.
 */
export function svedenoIme(ime: string): string {
  return ime.trim().replace(/\s+/g, ' ').toLocaleLowerCase('bg-BG');
}

export function sashtnostNaKontakta(ime: string): string {
  return `KNT:${svedenoIme(ime)}`;
}

/**
 * ПРОВЕРКАТА при Вратата · ЕДИН отказ, и той е за името.
 *
 * Телефонът и имейлът са ПО ИЗБОР. Контакт само с име е нормален случай — той е
 * име в падащото меню „Отговорник", а поле, което човек е принуден да измисли,
 * се пълни с боклук и после се брои като данни (дословно както при мястото).
 */
export function proveriKontakta(ime: string): string {
  const t = ime.trim().replace(/\s+/g, ' ');
  if (t === '') {
    throw new GreshkaKontakt(
      'Контактът няма име. Името е и адресът му — падащото меню „Отговорник" ' +
        'сочи контакта по име, значи безименен контакт не може да се избере никъде.',
    );
  }
  return t;
}

export interface Kontakt {
  /** името, ДОСЛОВНО както го е написал човекът */
  readonly ime: string;
  /** телефон за връзка · празно значи „не е записан" */
  readonly telefon: string;
  /** имейл · празно значи, че писмо не може да тръгне оттук */
  readonly imeyl: string;
  /** какъвто и да е той · свободен текст, защото ролите му са негови */
  readonly kakav: string;
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
}

/**
 * СЪСТОЯНИЯТА НА ПРЕПИСКАТА · три, и всяко е РАЗЛИЧЕН изход.
 *
 * „чака" и „взето" са двата края на неговото „кога са за взимане". Третото —
 * „отпаднало" — е урокът от резен 30: без него човек или трие (лъжа за
 * миналото), или пише „взето" (лъжа за настоящето).
 */
export const SASTOYANIYA_NA_PREPISKA = ['чака', 'взето', 'отпаднало'] as const;
export type SastoyanieNaPrepiska = (typeof SASTOYANIYA_NA_PREPISKA)[number];

export interface Prepiska {
  readonly id: string;
  /** С КОГО · името на контакта, както делата сочат мястото — по ИМЕ */
  readonly kontakt: string;
  /** ЗА КАКВО · едно изречение */
  readonly kakvo: string;
  /**
   * КОГА Е ЗА ВЗИМАНЕ · „кога са за взимане кто ОПЦИЯ и дата" *(р57·[28])*.
   *
   * По ИЗБОР — „опция" е негова дума. Празното значи „без срок", не „днес":
   * подразбран срок би оцветил в червено преписка, за която никой не е бързал.
   *
   * И е САМО ДАТА, без час: „**Не, само дата**" *(р57·[34])*.
   */
  readonly zaVzimane: string;
  /**
   * ЧАСЪТ · „преписката има… и **дата с час**" *(негова дума, 30.08)*.
   *
   * ПО ИЗБОР, „ЧЧ:ММ" или празно. Празното значи „само дата" — точно каквото
   * беше преписката до резен 41, тъй че всеки вече записан ред остава верен без
   * да се пипа (правило 1). Задължителен час щеше да поиска човек да измисли
   * число за всяка стара преписка, и то щеше да се брои като данни.
   *
   * И той е ЧАС НА ПРЕПИСКАТА, не на светофара: дните до срока се броят по
   * КАЛЕНДАР, а не по часовник — иначе преписка в 23:00 и преписка в 01:00 на
   * същия ден щяха да светят различно.
   */
  readonly chas: string;
  /** ОТ УПРАВЛЕНИЕ · кой я върши · празно значи „още не е казано" */
  readonly otgovornik: string;
  /** ОТ УПРАВЛЕНИЕ · Айзенхауер, същите ЧЕТИРИ като при делото (И124 т.6);
   * празна = изключена — стар запис с петата „завършено", преведен при четене */
  readonly otsenka: OtsenkaNaRed;
  /** КЪМ КАКВО е закачена · „имот" · „дело" · празно значи „към нищо" */
  readonly zakachenaKam: VidNaZakachaneto;
  /** идентификаторът на закаченото · празен, когато видът е празен */
  readonly zakachenaId: string;
  readonly sastoyanie: SastoyanieNaPrepiska;
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
}

/**
 * КЪМ КАКВО СЕ ЗАКАЧА ЕДНА ПРЕПИСКА · негова дума, 30.08:
 *
 *   „преписката има всичко което се попълва в Управление като данни и дата с
 *    час, **както и имот, дело или поддело**."
 *
 * ТРИТЕ МУ ДУМИ СА ДВА ВИДА, и това не е свиване. Подделото Е дело — то е дело
 * с `nadDelo`, и второ име за него в кода би направило от една същност две.
 * Трите се виждат там, където той ги е казал: в МЕНЮТО, където подделата стоят
 * с номера си (1.2 · 1.2.3) и се четат като поддела.
 *
 * ЕДНО закачане, не списък. Преписка, закачена и за имот, и за дело, отговаря
 * два пъти на въпроса „къде е това" — а двата отговора могат да се разминат.
 */
export const VIDOVE_ZAKACHANE = ['имот', 'дело'] as const;
export type VidNaZakachaneto = (typeof VIDOVE_ZAKACHANE)[number] | '';

/**
 * ПРОВЕРКАТА на преписката · контактът и какво, останалото по избор.
 *
 * Преписка без контакт е бележка, не преписка — тя не може да влезе в „с кого".
 * Преписка без „какво" е празен ред, който заема място в списъка за взимане.
 */
export function proveriPrepiskata(n: {
  readonly kontakt: string;
  readonly kakvo: string;
  readonly sastoyanie: string;
  readonly zaVzimane: string;
  readonly chas: string;
  readonly otsenka: string;
  readonly zakachenaKam: string;
  readonly zakachenaId: string;
}): void {
  if (n.kontakt.trim() === '') {
    throw new GreshkaKontakt('Преписката няма контакт. „С кого" е половината от нея.');
  }
  if (n.kakvo.trim() === '') {
    throw new GreshkaKontakt('Преписката няма „за какво". Празен ред заема място и не казва нищо.');
  }
  if (!(SASTOYANIYA_NA_PREPISKA as readonly string[]).includes(n.sastoyanie)) {
    throw new GreshkaKontakt(
      `Непознато състояние „${n.sastoyanie}". Изброените са: ` +
        `${SASTOYANIYA_NA_PREPISKA.join(' · ')}.`,
    );
  }
  if (!(OTSENKI as readonly string[]).includes(n.otsenka)) {
    throw new GreshkaKontakt(
      `Непозната оценка „${n.otsenka}". Тя е СЪЩАТА като при делото — ` +
        `${OTSENKI.join(' · ')} — защото преписката е работа, а работата се мери еднакво.`,
    );
  }
  proveriChasa(n.chas, n.zaVzimane);
  proveriZakachaneto(n.zakachenaKam, n.zakachenaId);
}

/**
 * ЧАСЪТ · „ЧЧ:ММ" или празно, и час БЕЗ дата се отказва.
 *
 * Час без дата е обещание без ден: той не може нито да свети, нито да влезе в
 * червения списък, а на екрана изглежда като уговорено време.
 */
export function proveriChasa(chas: string, zaVzimane: string): void {
  if (chas === '') return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(chas)) {
    throw new GreshkaKontakt(
      `Нечетим час „${chas}". Очаква се ЧЧ:ММ (24-часов) или празно. ` +
        'Празното значи „само дата" — то е нормален случай, не пропуск.',
    );
  }
  if (zaVzimane.trim() === '') {
    throw new GreshkaKontakt(
      `Час „${chas}" без дата. Час без ден не свети и не влиза в червения списък, ` +
        'а на екрана изглежда като уговорено време.',
    );
  }
}

/**
 * ЗАКАЧАНЕТО · видът и адресът вървят ЗАЕДНО или ги няма.
 *
 * Вид без адрес е надпис „закачено за дело", зад който няма дело; адрес без вид
 * е низ, който никой не знае къде да търси. Двете половини се отказват поотделно
 * и с думи, защото и двете грешки изглеждат еднакво на екрана: празна клетка.
 */
function proveriZakachaneto(kam: string, id: string): void {
  if (kam === '' && id.trim() === '') return;
  if (kam === '') {
    throw new GreshkaKontakt(
      `Има адрес „${id}", но не е казано КЪМ КАКВО. Изброените са: ` +
        `${VIDOVE_ZAKACHANE.join(' · ')}.`,
    );
  }
  if (!(VIDOVE_ZAKACHANE as readonly string[]).includes(kam)) {
    throw new GreshkaKontakt(
      `Непознат вид закачане „${kam}". Изброените са: ${VIDOVE_ZAKACHANE.join(' · ')} — ` +
        'подделото Е дело, затова свой вид няма.',
    );
  }
  if (id.trim() === '') {
    throw new GreshkaKontakt(
      `Казано е „${kam}", но не е казано КОЕ. Вид без адрес е надпис, зад който няма нищо.`,
    );
  }
}

/**
 * ИМЕНАТА ЗА ПАДАЩОТО МЕНЮ · „навсякъде, където пише отговорник" *(ред 1318)*.
 *
 * Връща ИМЕНАТА, не контактите: викащият слага име в поле, а не обект. И са
 * подредени по азбука, защото менюто се чете от човек.
 */
export function imenataNaKontaktite(kontakti: readonly Kontakt[]): readonly string[] {
  return Object.freeze([...kontakti.map((k) => k.ime)].sort((a, b) => a.localeCompare(b, 'bg')));
}

/**
 * КОИ ПРЕПИСКИ СА ЗА ВЗИМАНЕ · с дата и още не взети.
 *
 * Отпадналите не влизат (резен 30), и без-срочните също: „кога са за взимане"
 * е въпрос към онези, за които има КОГА.
 */
export function zaVzimane(prepiski: readonly Prepiska[]): readonly Prepiska[] {
  return Object.freeze(
    prepiski
      .filter((p) => p.sastoyanie === 'чака' && p.zaVzimane !== '')
      .sort((a, b) => a.zaVzimane.localeCompare(b.zaVzimane)),
  );
}

export interface RedNaKontakt {
  readonly ime: string;
  readonly telefon: string;
  readonly imeyl: string;
  readonly kakav: string;
  /** колко преписки стоят на този контакт · брои се, не се твърди */
  readonly prepiski: number;
  /** записан ли е · или само се среща по преписките */
  readonly zapisan: boolean;
}

/**
 * ВСИЧКИ КОНТАКТИ · и онези, които само се СРЕЩАТ по преписките.
 *
 * Дословно решението при местата (ADR-091): вторите се показват със същия ред,
 * но с `zapisan: false` — така човек вижда къде има какво да допълни, вместо
 * контактът да го няма, докато не се сети да го запише.
 */
export function kontaktite(
  kontakti: readonly Kontakt[],
  prepiski: readonly Prepiska[],
): readonly RedNaKontakt[] {
  const broy = new Map<string, number>();
  for (const p of prepiski) {
    const k = svedenoIme(p.kontakt);
    if (k === '') continue;
    broy.set(k, (broy.get(k) ?? 0) + 1);
  }
  const redove: RedNaKontakt[] = kontakti.map((k) =>
    Object.freeze({
      ime: k.ime,
      telefon: k.telefon,
      imeyl: k.imeyl,
      kakav: k.kakav,
      prepiski: broy.get(svedenoIme(k.ime)) ?? 0,
      zapisan: true,
    }),
  );
  const zapisani = new Set(kontakti.map((k) => svedenoIme(k.ime)));
  const sreshtani = new Map<string, string>();
  for (const p of prepiski) {
    const sveden = svedenoIme(p.kontakt);
    if (sveden === '' || zapisani.has(sveden) || sreshtani.has(sveden)) continue;
    sreshtani.set(sveden, p.kontakt.trim());
  }
  for (const [sveden, ime] of sreshtani) {
    redove.push(
      Object.freeze({
        ime,
        telefon: '',
        imeyl: '',
        kakav: '',
        prepiski: broy.get(sveden) ?? 0,
        zapisan: false,
      }),
    );
  }
  return Object.freeze(redove.sort((a, b) => a.ime.localeCompare(b.ime, 'bg')));
}

/**
 * СВЕРКАТА · всяка преписка има СВОЙ контакт в списъка (правило 7).
 *
 * Входът е броят преписки; изходът — сборът на преписките, преброени ПО
 * КОНТАКТИ. Разлика значи, че преписка е увиснала на контакт, който списъкът не
 * показва — най-тихата повреда, защото списък от контакти изглежда пълен и
 * когато една преписка е паднала от него.
 */
export function sveriKontaktite(
  kontakti: readonly Kontakt[],
  prepiski: readonly Prepiska[],
  kogato: string,
): Sverka {
  const poKontakti = kontaktite(kontakti, prepiski).reduce((s, r) => s + r.prepiski, 0);
  return sverka('контакти · преписки ↔ по контакти', prepiski.length, poKontakti, kogato, MERKA.broy);
}

// ── СРЕЩАТА · третият извор на авто-дело (резен 39) ────────────────────────

/**
 * СРЕЩАТА · негово изречение, и то е ЕДНО с „два секции" (правило 22).
 *
 * „Един таб, две секции" · „**за контактите среща добавяш с място, телефо, име,
 * и дата с час**" · „**Става дело автоматично**" *(р57·[30])* — ЕДНО негово
 * съобщение, три факта.
 *
 * И поправката му, ден по-късно: „**Не, само дата**" · „**Адрес на срещата**"
 * *(р57·[34])*. Часът пада; адресът остава като СВОЕ поле.
 *
 * ═══ ЗАЩО СРЕЩАТА НЕ Е ТРЕТА СЕКЦИЯ ═══
 *
 * „Един таб, ДВЕ секции" и „за КОНТАКТИТЕ среща добавяш" стоят в едно и също
 * негово съобщение. Значи срещата живее ВЪТРЕ в секцията с контактите, не до
 * нея — трета секция би счупила собственото му число.
 *
 * ═══ ТЕЛЕФОНЪТ И ИМЕТО НЕ СЕ ПРЕПИСВАТ ═══
 *
 * Той изброява „място, телефо, име" — но телефонът и името вече имат дом:
 * КОНТАКТЪТ. Срещата ги СОЧИ по име, не ги преписва (правило 17). Преписан
 * телефон би остарял в мига, в който човек си смени номера, и после два реда
 * биха казвали различно за един човек.
 */
export const SASTOYANIYA_NA_SRESHTA = ['чака', 'проведена', 'отпаднала'] as const;
export type SastoyanieNaSreshta = (typeof SASTOYANIYA_NA_SRESHTA)[number];

/**
 * ВИДЪТ НА АНГАЖИМЕНТА · негови думи (И124 т.1):
 *
 *   „А час има само не дело а еквивалент на среща, доставка или по избор
 *    някаква бележка която да квараш, дори напомняне."
 *
 * И т.8: „или друго вкарано по избор от стопанина" — номенклатурата е
 * ОТВОРЕНА: четирите са начални, стопанинът вкарва свои. Затова проверката
 * иска само НЕПРАЗНО, а менюто предлага (`predlozheniVidove`), не заключва.
 */
export const VIDOVE_ANGAZHIMENT = ['среща', 'доставка', 'бележка', 'напомняне'] as const;

/**
 * КАКВО ПРЕДЛАГА МЕНЮТО НА ВИДА · „за другите показваш най използваните и
 * последните" (И124 т.8). Началните четири стоят винаги; вкараните от
 * стопанина се нареждат по УПОТРЕБА (най-използваните напред), а при равна
 * употреба — по-скорошният пръв.
 */
export function predlozheniVidove(
  sreshti: readonly { readonly vid: string; readonly kogato: string }[],
): readonly string[] {
  const broy = new Map<string, { broy: number; posleden: string }>();
  for (const s of sreshti) {
    const vid = s.vid.trim();
    if (vid === '') continue;
    const dosega = broy.get(vid) ?? { broy: 0, posleden: '' };
    broy.set(vid, {
      broy: dosega.broy + 1,
      posleden: s.kogato > dosega.posleden ? s.kogato : dosega.posleden,
    });
  }
  const svoi = [...broy.entries()]
    .filter(([vid]) => !(VIDOVE_ANGAZHIMENT as readonly string[]).includes(vid))
    .sort((a, b) => b[1].broy - a[1].broy || b[1].posleden.localeCompare(a[1].posleden))
    .map(([vid]) => vid);
  return [...VIDOVE_ANGAZHIMENT, ...svoi];
}

export interface Sreshta {
  readonly id: string;
  /** ВИДЪТ · среща · доставка · бележка · напомняне · или негов собствен */
  readonly vid: string;
  /** С КОГО · името на контакта, точно както преписката го сочи */
  readonly kontakt: string;
  /** „**Адрес на срещата**" *(р57·[34])* · по избор — среща по телефона няма адрес */
  readonly adres: string;
  /** КОГА · датата; часът е ОТДЕЛЕН и по избор */
  readonly data: string;
  /**
   * ЧАСЪТ · по избор; празно значи „само дата".
   *
   * „Не, само дата" *(р57·[34])* е НАДЖИВЯНО от И124 т.1 (правило 28):
   * „час има само не дело а еквивалент на среща, доставка или… бележка…
   * дори напомняне." Дните до срока пак се броят по КАЛЕНДАР (ADR-101).
   */
  readonly chas: string;
  readonly sastoyanie: SastoyanieNaSreshta;
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
}

/**
 * ПРОВЕРКАТА на срещата · контактът и ДАТАТА, адресът по избор.
 *
 * Датата е задължителна, за разлика от преписката: „кога са за взимане" е ОПЦИЯ
 * при преписката *(р57·[28])*, но среща без дата не е среща — тя е намерение.
 * И точно датата я прави дело („Става дело автоматично"): без нея няма какво да
 * влезе в списъка и няма какво да свети.
 *
 * СРЕДНАТА ДУМА Е МОЯ. „чака" и „отпаднала" са неговите две от преписката;
 * „проведена" я избрах, защото среща се ПРОВЕЖДА, а преписка се ВЗИМА. Изход от
 * списъка трябва да има — ангажимент без изход свети вечно.
 */
export function proveriSreshtata(
  kontakt: string,
  data: string,
  sastoyanie: string,
  vid = 'среща',
  chas = '',
): void {
  if (kontakt.trim() === '') {
    throw new GreshkaKontakt('Срещата няма с кого. „За контактите среща добавяш" — контактът е първата ѝ половина.');
  }
  // Видът е ОТВОРЕН („друго вкарано по избор от стопанина"), но не празен:
  // ангажимент без вид не може да се предложи на следващия.
  if (vid.trim() === '') {
    throw new GreshkaKontakt(
      `Ангажиментът няма вид. Началните са ${VIDOVE_ANGAZHIMENT.join(' · ')}, а свой се вкарва свободно.`,
    );
  }
  proveriChasa(chas, data);
  if (data.trim() === '') {
    throw new GreshkaKontakt(
      'Срещата няма дата. Без дата тя не става дело и не влиза в червения списък — ' +
        'остава намерение, което никой няма да види.',
    );
  }
  if (!(SASTOYANIYA_NA_SRESHTA as readonly string[]).includes(sastoyanie)) {
    throw new GreshkaKontakt(
      `Непознато състояние „${sastoyanie}". Изброените са: ${SASTOYANIYA_NA_SRESHTA.join(' · ')}.`,
    );
  }
}

/**
 * КОИ СРЕЩИ ПРЕДСТОЯТ · чакащите, подредени по дата.
 *
 * Проведените и отпадналите не влизат — точно както взетата преписка не влиза в
 * „за взимане". Дата има всяка (Вратата не пуска без нея), затова тук няма втора
 * проверка за празно.
 */
export function predstoyashtiSreshti(sreshti: readonly Sreshta[]): readonly Sreshta[] {
  return Object.freeze(
    sreshti.filter((s) => s.sastoyanie === 'чака').sort((a, b) => a.data.localeCompare(b.data)),
  );
}

// ── КЪДЕ Е ЗАКАЧЕНА ЕДНА ПРЕПИСКА (резен 41) ──────────────────────────────

/**
 * МЯСТОТО И ОБЕКТЪТ НЕ СЕ ПРЕПИСВАТ · СМЯТАТ СЕ от закаченото (правило 17).
 *
 * Той казва „преписката има всичко което се попълва в Управление като данни…
 * както и имот, дело или поддело". Първата половина изкушава да се препишат
 * Място и Обект в самата преписка — и точно това не се прави: делото вече ги
 * носи, имотът също. Преписан адрес остарява в мига, в който делото се премести,
 * и после два реда казват различно за едно място.
 *
 * Затова тук стои ЧЕТЕНЕ, не поле: закачането носи вида и адреса, а името се
 * чете от онова, за което е закачено. Изчезнало закачане се КАЗВА поименно —
 * дело, което вече го няма, не бива да минава за „никъде".
 */
export interface Zakachaneto {
  readonly kam: VidNaZakachaneto;
  /** какво пише на екрана · „—" когато няма закачане */
  readonly nadpis: string;
  /** намери ли се онова, за което е закачена */
  readonly nameren: boolean;
}

export function zakachanetoNa(
  p: Prepiska,
  imoti: ReadonlyMap<string, { readonly adres: string; readonly edinitsa: string }>,
  dela: ReadonlyMap<string, { readonly myasto: string; readonly obekt: string; readonly ime: string }>,
): Zakachaneto {
  if (p.zakachenaKam === '') return Object.freeze({ kam: '', nadpis: '—', nameren: true });
  if (p.zakachenaKam === 'имот') {
    const i = imoti.get(p.zakachenaId);
    return i
      ? Object.freeze({
          kam: 'имот' as const,
          nadpis: i.edinitsa === '' ? i.adres : `${i.adres} · ${i.edinitsa}`,
          nameren: true,
        })
      : Object.freeze({ kam: 'имот' as const, nadpis: 'имотът вече го няма', nameren: false });
  }
  const d = dela.get(p.zakachenaId);
  if (!d) return Object.freeze({ kam: 'дело' as const, nadpis: 'делото вече го няма', nameren: false });
  const kade = [d.myasto, d.obekt].filter((x) => x !== '').join(' · ');
  return Object.freeze({
    kam: 'дело' as const,
    nadpis: kade === '' ? d.ime : `${d.ime} · ${kade}`,
    nameren: true,
  });
}

/**
 * КОГА · датата и часът, слепени за екрана и за календара.
 *
 * Празната дата дава празен низ; дата без час дава само датата. Слепени с
 * интервал, а не с „T": това е четиво за човек, не ISO за машина — ISO-то се
 * прави там, където тръгва към календара.
 */
export function kogaEZaVzimane(p: Prepiska): string {
  if (p.zaVzimane === '') return '';
  return p.chas === '' ? p.zaVzimane : `${p.zaVzimane} ${p.chas}`;
}

/**
 * СВЕРКАТА НА ЗАКАЧАНЕТО · вход↔изход, и нулата се записва (правило 7).
 *
 * ВХОД: преписките, които ТВЪРДЯТ закачане. ИЗХОД: онези, чието закачане се
 * НАМИРА. Разлика значи преписка, увиснала на изтрито дело или имот — тя
 * изглежда закачена и на екрана, и в износа, а зад нея няма нищо.
 */
export function sveriZakachaniyata(
  prepiski: readonly Prepiska[],
  imoti: ReadonlyMap<string, { readonly adres: string; readonly edinitsa: string }>,
  dela: ReadonlyMap<string, { readonly myasto: string; readonly obekt: string; readonly ime: string }>,
  kogato: string,
): Sverka {
  const tvardyat = prepiski.filter((p) => p.zakachenaKam !== '');
  const namereni = tvardyat.filter((p) => zakachanetoNa(p, imoti, dela).nameren);
  return sverka(
    'преписки · закачени ↔ намерени',
    tvardyat.length,
    namereni.length,
    kogato,
    MERKA.broy,
  );
}
