/**
 * ТЕМИТЕ НА НАСТРОЙКИТЕ · падащият ред и кой какво вижда в него (И101 т.2).
 *
 * Негови думи: „Прозорци от настройки с падащо меню и изскачащи прозорци с
 * управление на всяка тема от настройки, **като падащ ред при натискане на
 * настройки**, и падащи редове с теми от Настройки, които са **различни от
 * стопанин и служителя с добавен и упълномощен служител**."
 *
 * ═══ ТРИ ЧОВЕКА, ТРИ СПИСЪКА ═══
 *
 * Дотук екранът „Настройки" беше ЕДИН и се заключваше цял: или го виждаш, или
 * не. Това е твърде грубо — служителят има свои настройки (езикът на
 * интерфейса е негов, личният таб е негов), а няма работа при моделите на
 * таблиците. Затова темата, не екранът, е единицата на правото.
 *
 * ═══ ЗАЩО ТУК, А НЕ В ЕКРАНА ═══
 *
 * „Кой вижда коя тема" е решение, не разметка. В екрана то щеше да живее като
 * поредица от `if`-ове, разпръснати между заглавията — и първата нова тема
 * щеше да се появи без своя `if`, видима за всички. Тук списъкът се чете като
 * таблица и се проверява с един тест.
 *
 * ═══ ЕДНО МЯСТО, НЕ ДВЕ ═══
 *
 * Всяка тема живее НА ЕДНО от двете места: като секция на екран (тогава
 * падащият ред скролва до нея) или като изскачащ прозорец (тогава ѝ рисува
 * съдържанието). Никоя не е и двете — иначе същото управление получава два
 * входа, които утре ще се разминат.
 */

import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { svediImeyl } from './akaunt.js';
import { eStopanin } from './stopanin.js';

/** Трите му човека, с неговите думи. */
export const KOY_GLEDA = ['stopanin', 'sluzhitel', 'upalnomoshten'] as const;

export type KoyGleda = (typeof KOY_GLEDA)[number];

export const IMENA_NA_GLEDASHTITE: Readonly<Record<KoyGleda, string>> = Object.freeze({
  stopanin: 'Стопанинът',
  sluzhitel: 'служител',
  upalnomoshten: 'упълномощен',
});

/** Къде живее управлението на една тема. */
export type KadeZhivee =
  | { readonly vid: 'sektsiya'; readonly ekran: string; readonly sektsiya: string }
  | { readonly vid: 'prozorets' };

export interface TemaNastroyka {
  readonly klyuch: string;
  readonly ime: string;
  /** един ред, който казва КАКВО се управлява — не как */
  readonly opis: string;
  /** име от единствения дом на знаците (`app/ikoni.ts`) */
  readonly ikona: string;
  readonly kade: KadeZhivee;
  /** кой я вижда · изброено ПОИМЕННО, не по формула */
  readonly za: readonly KoyGleda[];
}

const VSICHKI: readonly KoyGleda[] = Object.freeze(['stopanin', 'sluzhitel', 'upalnomoshten']);
const SAMO_STOPANINAT: readonly KoyGleda[] = Object.freeze(['stopanin']);
const RABOTESHTITE: readonly KoyGleda[] = Object.freeze(['stopanin', 'sluzhitel']);

/**
 * ТЕМИТЕ · описът, четен като таблица.
 *
 * Редът НЕ е азбучен, а по честота на пипане: онова, което се мени всеки ден,
 * стои горе; онова, което се мени веднъж — долу. Падащ ред, подреден по азбука,
 * кара човека да чете целия списък всеки път.
 */
export const TEMI: readonly TemaNastroyka[] = Object.freeze([
  {
    klyuch: 'moeto',
    ime: 'Моето',
    opis: 'кой съм · през кого влизам · какъв е планът',
    ikona: 'sluzhitel',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'koy-sam' },
    za: VSICHKI,
  },
  {
    klyuch: 'otmetki',
    ime: 'Какво да се вижда',
    opis: 'отметките на функциите · изключено ≠ липсващо',
    ikona: 'pokazhi',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'vazmozhnosti' },
    za: VSICHKI,
  },
  {
    klyuch: 'lichno',
    ime: 'Личното',
    opis: 'вторият Журнал · пуска се и се прибира оттук',
    ikona: 'lichno',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'tablo-lichno' },
    za: VSICHKI,
  },
  {
    klyuch: 'ezik',
    ime: 'Език на интерфейса',
    opis: 'на всеки сам · НЕ е право и никой не го раздава (ADR-008)',
    ikona: 'pokazhi',
    kade: { vid: 'prozorets' },
    za: VSICHKI,
  },
  {
    klyuch: 'zapasen',
    ime: 'Запасен контакт',
    opis: 'пътят обратно · вписва се ПРЕДИ да потрябва',
    ikona: 'sigurnost',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'zapasen' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'izgledi',
    ime: 'Табове и секции',
    opis: 'своите изгледи · таблици и диаграми, вързани за източник',
    ikona: 'tab',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'tablo-tabove' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'hedari',
    ime: 'Хедъри и колони',
    opis: 'Редакторът · видът, номенклатурата и формулите на колоната',
    ikona: 'hedar',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'hedari' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'modeli',
    ime: 'Модели на таблици',
    opis: 'какво коя колона значи в един файл · отпечатъкът на главата',
    ikona: 'model',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'modeli' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'butoni',
    ime: 'Бутоните · пътищата',
    opis: 'име · папка · действие · посока · позволени модели',
    ikona: 'buton',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'butoni' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'pravata',
    ime: 'Кой какво вижда',
    opis: 'служители · роли · колонно право (Вижда · Скрито)',
    ikona: 'pravo',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'pravata' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'parametri',
    ime: 'Проверките при въвеждане',
    opis: 'осем вида · своя сила и своя бележка · важат за целия бизнес',
    ikona: 'sigurnost',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'parametri' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'kontragenti',
    ime: 'Контрагенти',
    opis: 'моята фирма · клиенти · доставчици · ЕИК и адрес за одитния файл',
    ikona: 'kontragent',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'kontragenti' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'saf-t',
    ime: 'Одитен файл (SAF-T)',
    opis: 'главната книга и месечният XML за НАП · и какво още го спира',
    ikona: 'kniga',
    kade: { vid: 'sektsiya', ekran: 'smetki', sektsiya: 'saf-t' },
    za: RABOTESHTITE,
  },
  {
    klyuch: 'sverki',
    ime: 'Записани сверки',
    opis: 'вход↔изход на всяка партида · и разликата, дори когато е нула',
    ikona: 'sverka',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'sverki' },
    za: RABOTESHTITE,
  },
  {
    klyuch: 'zhurnalat',
    ime: 'Журналът като таблица',
    opis: 'изнася се четим · връща се сверен ред по ред',
    ikona: 'arhiv',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'zhurnalat' },
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'vrashtane',
    ime: 'Върни архив',
    opis: 'когато главният имейл вече не отваря',
    ikona: 'vnos',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'vrashtane' },
    za: VSICHKI,
  },
]);

/**
 * КОЙ ГЛЕДА · трите човека, различени от ЖУРНАЛА, не от екрана.
 *
 * „Упълномощен" е онзи, който НЕ е служител на този наемател, но има даден
 * достъп (И99: „да сподели на външен имейл личната си папка… например на жена
 * си"). Той не е нито стопанин, нито служител — трети случай, не празнина.
 *
 * Журнал БЕЗ стопанин (започнат преди ADR-043) не понижава никого: там решава
 * списъкът със служители, а липсата се дописва.
 */
export function koyGleda(imeyl: string, o: Ogledalo): KoyGleda {
  if (eStopanin(imeyl, o)) return 'stopanin';
  if (o.stopanin === '') return 'stopanin';
  if (o.sluzhiteli.has(svediImeyl(imeyl))) return 'sluzhitel';
  return 'upalnomoshten';
}

/** Темите, които ТОЗИ човек вижда · в реда на описа. */
export function temiZa(koy: KoyGleda): readonly TemaNastroyka[] {
  return TEMI.filter((t) => t.za.includes(koy));
}

/** Една тема по ключ · `undefined` при непозната. */
export function temaPoKlyuch(klyuch: string): TemaNastroyka | undefined {
  return TEMI.find((t) => t.klyuch === klyuch);
}

/**
 * Вижда ли ТОЗИ човек ТАЗИ тема · един въпрос, един отговор.
 *
 * Питането минава оттук, а не през `temiZa(...).some(...)` на място: два пътя
 * до един отговор се разминават точно когато някой добави условие само в
 * единия.
 */
export function vizhdaTemata(koy: KoyGleda, klyuch: string): boolean {
  const tema = temaPoKlyuch(klyuch);
  return tema !== undefined && tema.za.includes(koy);
}
