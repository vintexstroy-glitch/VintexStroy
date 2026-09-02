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
import { mozhe, type Izbor, type Vazmozhnost } from './planove.js';

/** Трите му човека, с неговите думи. */
export const KOY_GLEDA = ['stopanin', 'sluzhitel', 'upalnomoshten'] as const;

export type KoyGleda = (typeof KOY_GLEDA)[number];

export const IMENA_NA_GLEDASHTITE: Readonly<Record<KoyGleda, string>> = Object.freeze({
  stopanin: 'Стопанинът',
  sluzhitel: 'служител',
  upalnomoshten: 'упълномощен',
});

/** Къде живее управлението на една тема. */
type KadeZhivee =
  | { readonly vid: 'sektsiya'; readonly ekran: string; readonly sektsiya: string }
  | { readonly vid: 'prozorets' };

/**
 * ПЕТТЕ ГРУПИ · заглавия в падащия ред (негов избор, 27.08).
 *
 * Шестнайсет теми в един стълб се четат като списък с покупки: окото минава
 * всички, за да намери една. Заглавието дели стълба на пет къси списъка и
 * казва КЪДЕ да гледаш, преди да си почнал да четеш.
 *
 * Заглавията са НАДПИСИ, не бутони. Клавиатурата не спира на тях — тя спира
 * само там, където има какво да се направи; спирка, която не прави нищо, е
 * пречка, не ориентир.
 */
export const GRUPI = Object.freeze([
  { klyuch: 'moeto', ime: 'МОЕТО' },
  { klyuch: 'biznesat', ime: 'БИЗНЕСЪТ' },
  { klyuch: 'hora', ime: 'ХОРА И ПРАВА' },
  { klyuch: 'schetovodstvo', ime: 'СЧЕТОВОДСТВО' },
  { klyuch: 'sigurnost', ime: 'СИГУРНОСТ И АРХИВ' },
] as const);

export type KlyuchGrupa = (typeof GRUPI)[number]['klyuch'];

export interface TemaNastroyka {
  readonly klyuch: string;
  readonly ime: string;
  /** един ред, който казва КАКВО се управлява — не как */
  readonly opis: string;
  /** име от единствения дом на знаците (`app/ikoni.ts`) */
  readonly ikona: string;
  readonly kade: KadeZhivee;
  /** под кое заглавие стои в падащия ред */
  readonly grupa: KlyuchGrupa;
  /** кой я вижда · изброено ПОИМЕННО, не по формула */
  readonly za: readonly KoyGleda[];
  /**
   * ВЪЗМОЖНОСТТА, без която темата няма предмет · по избор.
   *
   * Живее на ТЕМАТА, не на екрана, и това е поправка на дефект: „Настройки"
   * искаше `iztochnitsi` ЦЕЛИЯТ, а тази възможност я дава само Драйвът. На
   * двата ЛОКАЛНИ плана пунктът стоеше в лентата и натискането го връщаше на
   * Имоти — без дума защо. С това падаха и езикът на интерфейса, и личният
   * таб, и контрагентите, и колонното право: седемнайсет теми заради две.
   *
   * Настройки НЕ се скрива от никого (правило 15 · И101 т.2). Стеснява се
   * СЪДЪРЖАНИЕТО му — точно каквото собствената му бележка в `main.ts` вече
   * обещаваше.
   */
  readonly iska?: Vazmozhnost;
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
 *
 * ОТКАКТО ИМА ГРУПИ, това важи ВЪТРЕ в групата, не по целия списък: най-отгоре
 * застава първата ГРУПА, а честотата решава реда в нея. Масивът остава ЕДИН и в
 * този ред — групирането става при РИСУВАНЕ (`temiPoGrupi`), не при описване.
 * Разбит на пет масива, описът щеше да иска пет места за поглеждане и шесто за
 * реда помежду им.
 */
export const TEMI: readonly TemaNastroyka[] = Object.freeze([
  {
    klyuch: 'moeto',
    ime: 'Моето',
    opis: 'кой съм · през кого влизам · какъв е планът',
    ikona: 'sluzhitel',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'koy-sam' },
    grupa: 'moeto',
    za: VSICHKI,
  },
  {
    klyuch: 'otmetki',
    ime: 'Какво да се вижда',
    opis: 'отметките на функциите · изключено ≠ липсващо',
    ikona: 'pokazhi',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'vazmozhnosti' },
    grupa: 'moeto',
    za: VSICHKI,
  },
  {
    klyuch: 'lichno',
    ime: 'Личното',
    opis: 'вторият Журнал · пуска се и се прибира оттук',
    ikona: 'lichno',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'tablo-lichno' },
    grupa: 'moeto',
    za: VSICHKI,
  },
  {
    klyuch: 'ezik',
    ime: 'Език на интерфейса',
    opis: 'на всеки сам · НЕ е право и никой не го раздава (ADR-008)',
    ikona: 'pokazhi',
    kade: { vid: 'prozorets' },
    grupa: 'moeto',
    za: VSICHKI,
  },
  {
    klyuch: 'zapasen',
    ime: 'Запасен контакт',
    opis: 'пътят обратно · вписва се ПРЕДИ да потрябва',
    ikona: 'sigurnost',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'zapasen' },
    grupa: 'sigurnost',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'izgledi',
    ime: 'Табове и секции',
    opis: 'своите изгледи · таблици и диаграми, вързани за източник',
    ikona: 'tab',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'tablo-tabove' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'hedari',
    ime: 'Хедъри и колони',
    opis: 'Редакторът · видът, номенклатурата и формулите на колоната',
    ikona: 'hedar',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'hedari' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'modeli',
    ime: 'Модели на таблици',
    opis: 'какво коя колона значи в един файл · отпечатъкът на главата',
    ikona: 'model',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'modeli' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
    // Моделът описва ВЪНШЕН файл · без Драйв няма откъде да дойде.
    iska: 'iztochnitsi',
  },
  {
    klyuch: 'butoni',
    ime: 'Бутоните · пътищата',
    opis: 'име · папка · действие · посока · позволени модели',
    ikona: 'buton',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'butoni' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
    // Бутонът е път КЪМ файл · без Драйв води наникъде.
    iska: 'iztochnitsi',
  },
  {
    klyuch: 'pravata',
    ime: 'Кой какво вижда',
    opis: 'служители · роли · колонно право (Редактира · Вижда · Скрито)',
    ikona: 'pravo',
    // ДОМЪТ Ѝ СМЕНИ АДРЕСА С ЕДИН РЕД — два пъти. И103 (27.08) я прати при
    // служителите („ОТ ТАМ се дават и хедърите"); И129 т.2 (02.09) я връща в
    // Главни настройки, с две падащи менюта (резен 97 · ADR-156). Точно
    // ползата от един дом (правило 17): без нито един втори списък да се пипа.
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'pravata' },
    grupa: 'hora',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'parametri',
    ime: 'Проверките при въвеждане',
    opis: 'осем вида · своя сила и своя бележка · важат за целия бизнес',
    ikona: 'sigurnost',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'parametri' },
    grupa: 'schetovodstvo',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'etapi-prodazhbi',
    ime: 'Етапите на продажбата',
    opis: 'всеки нов етап става КОЛОНА · „да може всеки да рзвие своя бизнес"',
    ikona: 'ekran-prodazhbi',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'etapi-prodazhbi' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'krediti',
    ime: 'Кредитите',
    opis: 'таблицата под Разходи · „в Настройки да има опция да изключваш и последната таблица"',
    ikona: 'ekran-smetki',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'krediti' },
    grupa: 'biznesat',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'kontragenti',
    ime: 'Контрагенти',
    opis: 'моята фирма · клиенти · доставчици · ЕИК и адрес за одитния файл',
    ikona: 'kontragent',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'kontragenti' },
    grupa: 'schetovodstvo',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'sverki',
    ime: 'Записани сверки',
    opis: 'вход↔изход на всяка партида · и разликата, дори когато е нула',
    ikona: 'sverka',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'sverki' },
    grupa: 'schetovodstvo',
    za: RABOTESHTITE,
  },
  {
    klyuch: 'zhurnalat',
    ime: 'Журналът като таблица',
    opis: 'изнася се четим · връща се сверен ред по ред',
    ikona: 'arhiv',
    kade: { vid: 'sektsiya', ekran: 'nastroyki', sektsiya: 'zhurnalat' },
    grupa: 'sigurnost',
    za: SAMO_STOPANINAT,
  },
  {
    klyuch: 'vrashtane',
    ime: 'Върни архив',
    opis: 'когато главният имейл вече не отваря',
    ikona: 'vnos',
    kade: { vid: 'sektsiya', ekran: 'tablo', sektsiya: 'vrashtane' },
    grupa: 'sigurnost',
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

/**
 * Темите, които ТОЗИ човек вижда · в реда на описа.
 *
 * ИЗБОРЪТ Е ПО ЖЕЛАНИЕ и това е нарочно: викащ без него получава ВСИЧКИ теми,
 * позволени за ролята — същото поведение, каквото имаше преди. Тема, чиято
 * възможност не е дадена от плана, отпада само когато има с какво да се пита.
 */
export function temiZa(koy: KoyGleda, izbor?: Izbor): readonly TemaNastroyka[] {
  return TEMI.filter((t) => t.za.includes(koy) && (!t.iska || !izbor || mozhe(izbor, t.iska)));
}

/**
 * ТЕМИТЕ НА ТОЗИ ЧОВЕК, РАЗДЕЛЕНИ ПО ГРУПИ · в реда на `GRUPI`.
 *
 * ПРАЗНА ГРУПА НЕ ИЗЛИЗА. Служителят няма нито една тема под „ХОРА И ПРАВА" —
 * а заглавие без нищо под себе си не е ориентир, а въпрос: „какво е трябвало да
 * има тук и защо го няма?". Правило 15 („изключено ≠ липсващо") казва обратното
 * за ОТМЕТКИТЕ и това не е противоречие: там човекът има правото и сам го е
 * свалил; тук няма правото и няма какво да му се обяснява на място, което не
 * е негово.
 *
 * Смята се при рисуване, не се пази: две места за „кое в коя група" се
 * разминават при първата нова тема.
 */
export function temiPoGrupi(
  koy: KoyGleda,
  izbor?: Izbor,
): readonly { readonly grupa: (typeof GRUPI)[number]; readonly temi: readonly TemaNastroyka[] }[] {
  const moite = temiZa(koy, izbor);
  return GRUPI.map((grupa) => ({ grupa, temi: moite.filter((t) => t.grupa === grupa.klyuch) })).filter(
    (g) => g.temi.length > 0,
  );
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

/**
 * СЕКЦИИТЕ НА ЕКРАН „НАСТРОЙКИ" БЕЗ СВОЯ ТЕМА, КОИТО СА ЛИЧНИ · поименно.
 *
 * „Подредбата на екраните" пише в ПАМЕТТА на това устройство (нула събития) —
 * тя е на всекиго, точно както езикът на интерфейса. Всичко останало без тема
 * е стопанско по подразбиране: секция, добавена утре без ред тук и без тема,
 * се ражда СКРИТА за служителя, а не видима — обратното би било втора врата
 * към достъпа (правило 23).
 *
 * „Темата на натоварването" беше вторият ред тук; тя падна с бутоните си
 * (И127 т.3 · ADR-149), и името ѝ не остава да виси в списъка: опис, който
 * изрежда несъществуваща секция, е опис, на който не може да се вярва.
 */
const LICHNI_SEKTSII: readonly string[] = Object.freeze(['podredbata']);

/**
 * Вижда ли ТОЗИ човек ТАЗИ секция на екран „Настройки" (И121 т.1).
 *
 * Негови думи: „ТРябва за служителите да имат достъп до техните възможности
 * за настройки без тези определени само за стопанина които създава трие и
 * променя всичко."
 *
 * Присъдата е на ТРИ стъпала и всяко има един дом: секция с ТЕМА пита темата
 * (`za` — описът горе); секция без тема е или ЛИЧНА (списъкът поименно), или
 * стопанска. Екранът пита ТУК, вместо да реди `if`-ове по заглавията — първата
 * нова секция без свой `if` щеше да се появи за всички.
 */
export function vizhdaSektsiyata(koy: KoyGleda, sektsiya: string): boolean {
  const tema = TEMI.find(
    (t) => t.kade.vid === 'sektsiya' && t.kade.ekran === 'nastroyki' && t.kade.sektsiya === sektsiya,
  );
  if (tema) return tema.za.includes(koy);
  if (LICHNI_SEKTSII.includes(sektsiya)) return true;
  return koy === 'stopanin';
}
