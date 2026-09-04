/**
 * МАТРИЦАТА · база по вид обект × коефициенти.
 *
 * Негови думи (23.08):
 *
 *   „Проучване на методологии на калкулатори за изчисляване на цената на имоти.
 *    Апартаменти, гаражи, паркоместа, по район, степен и т.н… **Ексел е в
 *    основата на всичко. Матрици и висша математика.**"
 *
 * И за числото по подразбиране:
 *
 *   „**3000 евро** беше цената, която калкулаторът да ползва, да се разработи и
 *    да се направят тестове."
 *
 * ФОРМАТА:
 *
 *   цена = обща площ × база(вид) × коеф(етаж) × коеф(изложение)
 *
 * ВСИЧКО В ЦЕЛИ БАЗИСНИ ТОЧКИ. 1,00 = 10 000 б.т.; 1,05 = 10 500. Никакъв
 * float — умножават се цели числа и се дели ВЕДНЪЖ, накрая (умението
 * `matematika` §1). Коефициент 1,05 × 0,97 във float дава 1,0184999999999998;
 * в базисни точки дава 10 185 и това число не мърда.
 *
 * ЧИСЛАТА ОСТАВАТ НЕГОВИ. Тези тук са ЗАЛОЖЕНИ ЗА РАЗРАБОТКА, не са оферта —
 * `docs/otcheti/kalkulator-metodologii.md` §6 ги държи като „чакат него".
 * Затова матрицата е ДАННА, не константа в кода: сменя се от Настройки, и
 * новият район е нов РЕД, не нов код (третият закон на скелета).
 */

import type { VidObekt } from './chetene.js';
import {
  EDINITSA_BT,
  PO_PODRAZBIRANE,
  matritsaOtNastroyki,
  sboratNaTeglata,
  type Tegla,
} from './nastroyki.js';

/**
 * Мерната единица идва от `nastroyki.ts` — там живеят коефициентите, значи там
 * е и домът ѝ (правило 17). Преизнася се тук, за да не се чупи стар внос.
 */
export { EDINITSA_BT };

class GreshkaMatritsa extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaMatritsa';
  }
}

/**
 * Базовата цена на квадратен метър, в цели ЕВРОЦЕНТА, по вид обект.
 *
 * Числата за разработка идват от НЕГОВАТА ценова листа („ЦЕНИ МД нова.xlsx"),
 * за да е тестът честен: там апартаментите вървят по 2 838–3 151 €/м², а
 * 3 000 — неговото число — стои точно по средата. Гаражите и паркоместата са
 * закръглени средни от същата листа.
 */
export interface Matritsa {
  /** име на района — „Малинова долина"; нов район е нов ред */
  readonly rayon: string;
  /** вид обект → база в евроцента за квадратен метър */
  readonly baza_st: Readonly<Record<VidObekt, number>>;
  /** етаж (словом, както е в таблицата) → коефициент в б.т. */
  readonly etazhi: Readonly<Record<string, number>>;
  /** изложение („Ю", „СИ"…) → коефициент в б.т. */
  readonly izlozheniya: Readonly<Record<string, number>>;
  /**
   * ОЧАКВАН НАЕМ в евроцента за квадратен метър на МЕСЕЦ, по вид обект.
   *
   * Ползва се САМО когато обектът няма действителен наем в Журнала. Негово
   * (чрез отчета): „наемът, плащан и неплатен, ВЕЧЕ Е В ЖУРНАЛА. Оценката може
   * да ползва ДЕЙСТВИТЕЛНАТА събираемост на този имот, вместо пазарно
   * предположение." Затова това тук е втори избор, не първи.
   */
  readonly naem_st_kvm: Readonly<Record<VidObekt, number>>;
  /**
   * ДОХОДНОСТТА, с която се капитализира, в базисни точки.
   *
   * „При доходност 5 % множителят е 20; при 6 % — 16.7. Тоест разликата от един
   * процентен пункт мени стойността с 20 % — затова доходността е параметър,
   * който човек вижда и мени, а не число в кода."
   */
  readonly dohodnost_bt: number;
  /** незаетост в б.т. — колко от годината имотът стои празен */
  readonly nezaetost_bt: number;
  /** оперативни разходи в б.т. ОТ НАЕМА — поддръжка, данъци, такси */
  readonly operativni_bt: number;
  /**
   * ОБЩИЯТ множител на партидата, в базисни точки.
   *
   * Тук се събират коефициентите, които неговият файл НЕ носи и които важат за
   * цялата сграда наведнъж: **състояние · възраст · асансьор**. „Малинова
   * Долина" е ЕДНА сграда — тя е нова, с асансьор, и това важи за всеки обект
   * в нея, не за някой поотделно.
   *
   * Държи се като ОТДЕЛНО число, а не сгънато в базата, за да остане делението
   * едно: сгъната база трябва да се закръгли, и закръглянето влиза във всеки
   * обект (правило 3).
   */
  readonly obshti_bt: number;
  /**
   * КАКВО ВАЖИ, КОГАТО ФАЙЛЪТ МЪЛЧИ · избраното в секция „Калкулатор".
   *
   * Етажът и изложението са свойства НА ОБЕКТА и идват от неговия файл — там
   * всеки апартамент си има свои. Но гаражите и паркоместата в същия файл
   * нямат изложение, а нов лист може да няма и етаж.
   *
   * Дотук празната клетка падаше на 1,00 и менютата „Етаж" и „Изложение" не
   * стигаха до листата изобщо: човек ги мени, а числата долу не мърдат. Затова
   * празното пада на ИЗБРАНОТО. Това не е измислен коефициент — измисленото е
   * когато приложението гадае; тук стои думата на човека за неизвестния случай.
   */
  readonly podrazbiran_etazh_bt: number;
  readonly podrazbirano_izlozhenie_bt: number;
  /** В · земята в центове за кв.м обща площ · тя НЕ овехтява */
  readonly zemya_st_kvm: Readonly<Record<VidObekt, number>>;
  /** В · строителната себестойност в центове за кв.м · тя овехтява */
  readonly stroitelna_st_kvm: Readonly<Record<VidObekt, number>>;
  /** В · полезният живот на сградата в цели години */
  readonly polezen_zhivot_g: number;
  /** В · възрастта на сградата в цели години */
  readonly vazrast_g: number;
  /** трите тегла на съгласуването · сборът им е точно 10 000 б.т. */
  readonly tegla: Tegla;
}

/**
 * МАТРИЦАТА ЗА РАЗРАБОТКА · СТРОИ СЕ, не се пише.
 *
 * Дотук числата ѝ стояха написани тук на ръка — и се бяха разминали с
 * проучването: изложение „Ю" беше 1,05 тук и 1,03 там. Разминаването не се
 * забелязва, докато някой не сравни двете файла (правило 17).
 *
 * Затова домът на коефициентите вече е ЕДИН — `nastroyki.ts`, секция
 * „Калкулатор" — а матрицата се СГЛОБЯВА оттам. Смяна на число се прави на
 * едно място и стига навсякъде.
 */
export const MATRITSA_ZA_RAZRABOTKA: Matritsa = matritsaOtNastroyki(PO_PODRAZBIRANE);

/**
 * Коефициент по ключ · липсващият пада на ПОДРАЗБИРАНИЯ, не се отказва.
 *
 * Подразбираният идва от менюто в секция „Калкулатор" (`matritsaOtNastroyki`);
 * без него — 1,00. Празна клетка и непозната дума са едно и също: и в двата
 * случая файлът не казва нищо и решава човекът.
 */
export function koefitsient(
  karta: Readonly<Record<string, number>>,
  klyuch: string,
  podrazbiran: number = EDINITSA_BT,
): number {
  const t = klyuch.trim();
  if (t === '') return podrazbiran;
  return karta[t] ?? podrazbiran;
}

/**
 * ЦЕНАТА, ТОЧНО · в евроцента, БЕЗ закръгляне.
 *
 * Закръглянето става ВЕДНЪЖ, накрая, и то извън тази функция (`stoynost.ts`) —
 * законът от ADR-012: закръгленото никога не влиза в сбор.
 *
 * Редът на делението е нарочен: първо се умножават ЦЕЛИТЕ числа (площ в кв.см
 * × база в центове × два коефициента в б.т.), после се дели веднъж. Обратният
 * ред би закръглил по средата и разликата щеше да расте с всеки обект.
 */
export function tsenaTochno(n: {
  readonly obshta_kvsm: number;
  readonly vid: VidObekt;
  readonly etazh: string;
  readonly izlozhenie: string;
  readonly matritsa?: Matritsa;
}): number {
  const m = n.matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  const baza_st = m.baza_st[n.vid];
  if (baza_st === undefined) {
    throw new GreshkaMatritsa(`Матрицата няма база за вид „${n.vid}".`);
  }
  return tsenaOtChasti({
    obshta_kvsm: n.obshta_kvsm,
    baza_st,
    koefitsienti_bt: [
      koefitsient(m.etazhi, n.etazh, m.podrazbiran_etazh_bt ?? EDINITSA_BT),
      koefitsient(m.izlozheniya, n.izlozhenie, m.podrazbirano_izlozhenie_bt ?? EDINITSA_BT),
      m.obshti_bt ?? EDINITSA_BT,
    ],
  });
}

/**
 * ЕДНАТА СМЕТКА · площ × база × коефициенти + добавка.
 *
 * Тук се смята Графа А, и НИКЪДЕ другаде. Партидата (`tsenaTochno`) ползва
 * двата коефициента, които неговият файл носи; секция „Калкулатор" ползва
 * петте, които човекът избира. Двата пътя влизат в ЕДНА сметка — иначе
 * екранът и износът почват да дават различни числа за един и същи обект.
 *
 * КОЛКО КОЕФИЦИЕНТА · без значение. Списъкът се умножава цял, преди да се
 * дели: 1,05 × 0,97 във float дава 1,0184999999999998, а в базисни точки —
 * 10 185, и това число не мърда (умението `matematika` §1).
 *
 * ДОБАВКАТА ВЛИЗА НАКРАЯ и не се умножава по нищо: коефициентът за изложение
 * не мени цената на едно паркомясто.
 */
export function tsenaOtChasti(n: {
  readonly obshta_kvsm: number;
  /** базата в цели центове за квадратен метър */
  readonly baza_st: number;
  readonly koefitsienti_bt: readonly number[];
  /** абсолютна добавка в цели центове · гараж, паркомясто, мазе */
  readonly dobavka_st?: number;
}): number {
  if (!Number.isSafeInteger(n.obshta_kvsm) || n.obshta_kvsm < 0) {
    throw new GreshkaMatritsa(
      `Площта се дава в цели квадратни сантиметри; получено: ${n.obshta_kvsm}`,
    );
  }
  if (!Number.isSafeInteger(n.baza_st) || n.baza_st < 0) {
    throw new GreshkaMatritsa(`Базата се дава в цели центове; получено: ${n.baza_st}`);
  }

  // площ (кв.см) × база (ст./м²) → ст. × 10 000; всеки коефициент добавя
  // още един множител от 10 000. Делим ВЕДНЪЖ, накрая.
  let gore = BigInt(n.obshta_kvsm) * BigInt(n.baza_st);
  let dolu = 10_000n;
  for (const bt of n.koefitsienti_bt) {
    gore *= BigInt(bt);
    dolu *= BigInt(EDINITSA_BT);
  }
  // към най-близкото — точната среда отива нагоре, както човек смята на ръка
  const tsena = Number((gore * 2n + dolu) / (dolu * 2n));
  return tsena + (n.dobavka_st ?? 0);
}

/**
 * ЦЕНАТА ПО СЪСТОЯНИЕ · доходният подход, точно, в евроцента.
 *
 * Негови думи (09.08), които дадоха и името на екрана:
 *
 *   „…казва се Стойност на Състояние… и е **калкулатор за пресмятане на
 *    стойността на всеки обект и цялата стойност** на участващото и въведено
 *    състояние."
 *
 * Формулата е на занаята и стои в `docs/otcheti/kalkulator-metodologii.md` §2.2:
 *
 *   Стойност = ЧОД ÷ доходност
 *   ЧОД = годишен наем × (1 − незаетост) − оперативни разходи
 *
 * ЗАЩО ТОВА Е ДРУГА КОЛОНА, А НЕ ДРУГА ЦЕНА. Негово: „За методът на калкулиране
 * не знам. Добре е да има две таблици едновременно с ДВЕ ЦЕНОВИ КОЛОНИ ЕДНА ДО
 * ДРУГА за сравнение." А отчетът го обяснява: „А продава, Б оценява" — един и
 * същ апартамент има продажна цена по листата и балансова стойност по
 * състоянието си, и те се разминават. Разминаването е информацията.
 *
 * НАЕМЪТ ИДВА ОТВЪН, защото има два източника и редът им е нарочен:
 * действителният от Журнала бие очаквания от матрицата (`stoynost.ts`).
 *
 * Нулев наем дава нулева стойност — обект без доход не се оценява доходно, и
 * това не е грешка, а отговор.
 */
export function tsenaPoSastoyanie(n: {
  /** месечният наем в евроцента — действителен или очакван */
  readonly naem_mesechen_st: number;
  readonly matritsa?: Matritsa;
}): number {
  const m = n.matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  if (!Number.isSafeInteger(n.naem_mesechen_st) || n.naem_mesechen_st < 0) {
    throw new GreshkaMatritsa(`Наемът се дава в цели центове; получено: ${n.naem_mesechen_st}`);
  }
  if (m.dohodnost_bt <= 0) {
    throw new GreshkaMatritsa('Доходност нула или под нула не капитализира — сметката е невъзможна.');
  }
  if (n.naem_mesechen_st === 0) return 0;

  // Всичко в цели числа, делене ВЕДНЪЖ накрая (умението `matematika` §1).
  //   год. наем × (1 − незаетост) × (1 − оперативни) ÷ доходност
  const godishen = BigInt(n.naem_mesechen_st) * 12n;
  const zaet = BigInt(EDINITSA_BT - m.nezaetost_bt);
  const chist = BigInt(EDINITSA_BT - m.operativni_bt);
  const gore = godishen * zaet * chist * BigInt(EDINITSA_BT);
  const dolu = BigInt(EDINITSA_BT) * BigInt(EDINITSA_BT) * BigInt(m.dohodnost_bt);
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

/**
 * В · РАЗХОДНИЯТ подход · земя + строителна стойност − овехтяване.
 *
 * От методологията (`docs/otcheti/kalkulator-metodologii.md` §2.3):
 *
 *   „Стойност = земя + строителна стойност − овехтяване
 *    овехтяване ≈ възраст / полезен живот (60–80 г. за жилище)"
 *
 * ═══ ЗЕМЯТА НЕ ОВЕХТЯВА · и това е ЦЯЛАТА мисъл на подхода ═══
 *
 * Овехтява СГРАДАТА — тухлите, инсталациите, дограмата. Парцелът под нея не
 * губи стойност от годините. Приложено върху сбора, овехтяването щеше да яде и
 * земята, и оценката на стара сграда щеше да клони към нула, каквото никога не
 * става: най-старите сгради в центъра струват най-скъпо ЗАРАДИ земята.
 *
 * Затова множителят пипа САМО строителната част. Това е и най-честата грешка
 * при този подход, и точно затова е написана тук, а не премълчана.
 *
 * ═══ ВЪЗРАСТ ≥ ПОЛЕЗЕН ЖИВОТ Е ОТГОВОР, НЕ ГРЕШКА ═══
 *
 * Сградата е изхабена докрай; остава земята. Същото решение като при нулевия
 * наем в Б: липсата на едното не срива сметката, а дава своя резултат.
 *
 * Всичко в цели числа, делене ВЕДНЪЖ накрая (умението `matematika` §1).
 */
export function tsenaPoRazhod(n: {
  readonly obshta_kvsm: number;
  readonly vid: VidObekt;
  readonly matritsa?: Matritsa;
  /**
   * САМО ЗЕМЯ · Имот със статут „земя" (резен 111 · ADR-170).
   *
   * Негово, 04.09: „земя е Имот с различен Статут", и на въпроса как се смята:
   * **„Само земята, без сграда и без наем."** Тогава строителната стойност и
   * овехтяването отпадат — няма сграда, която да остарява, — и подходът връща
   * земята за квадрат по площта. Липсваща земя пак е сентинел за „не е
   * дадено" и връща нула, за да отпадне подходът, вместо да излъже с половин
   * сметка.
   */
  readonly samoZemya?: boolean;
}): number {
  const m = n.matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  const zemya_st_kvm = m.zemya_st_kvm[n.vid];
  const stroitelna_st_kvm = m.stroitelna_st_kvm[n.vid];
  if (zemya_st_kvm === undefined || stroitelna_st_kvm === undefined) {
    throw new GreshkaMatritsa(`Матрицата няма разходни числа за вид „${n.vid}".`);
  }
  if (!Number.isSafeInteger(n.obshta_kvsm) || n.obshta_kvsm < 0) {
    throw new GreshkaMatritsa(`Площта е в цели кв.см от нула нагоре; получено: ${n.obshta_kvsm}`);
  }
  if (m.polezen_zhivot_g <= 0) {
    throw new GreshkaMatritsa('Полезен живот нула не дели — овехтяването е невъзможно.');
  }
  if (n.obshta_kvsm === 0) return 0;

  /**
   * ЕДНО ЛИПСВАЩО ЧИСЛО ЗНАЧИ, ЧЕ ПОДХОДЪТ НЕ РАЖДА ЧИСЛО · група Г (`docs/11`).
   *
   * Нулата тук е СЕНТИНЕЛ за „не е дадено", не цена: така я чете и
   * `proveriNastroyki` („нулева земя и нулево строителство са допустими — тогава
   * подходът просто дава нула и се изключва"), и празният `NEGOVI_PARAMETRI`,
   * който БРОИ кои от шестте числа са негови.
   *
   * Дотук сентинелът важеше само когато ДВЕТЕ са нула. При ЕДНО липсващо тук се
   * смяташе наполовина и излизаше число, което ИЗГЛЕЖДА сметнато: сто кв.м с
   * дадена строителна и липсваща земя даваха 94 080 € срещу 141 120 € — с една
   * трета по-малко, без нито една дума, че земята липсва. И това число влизаше
   * в съгласуването и дърпаше крайното надолу.
   *
   * Едно и също число не може да значи „не е дадено" на едно място и „струва
   * нула" на друго. Оттук нататък значи първото навсякъде, а `saglasuvana`
   * изхвърля подхода и го НАЗОВАВА в „отпаднали" (правило 15).
   */
  if (n.samoZemya === true) {
    if (zemya_st_kvm === 0) return 0;
    // площ(кв.см) × земя(цент/м²) ÷ 10 000 кв.см/м² · закръгляне към най-близкото
    return Number(
      (BigInt(n.obshta_kvsm) * BigInt(zemya_st_kvm) * 2n + 10_000n) / (10_000n * 2n),
    );
  }
  if (zemya_st_kvm === 0 || stroitelna_st_kvm === 0) return 0;

  // ОСТАНАЛОТО от сградата, в б.т. Възраст над живота дава нула, не отрицателно:
  // сграда не струва по-малко от нищо.
  const iztekli = Math.min(m.vazrast_g, m.polezen_zhivot_g);
  const ostavashti_bt =
    EDINITSA_BT - Math.round((iztekli * EDINITSA_BT) / m.polezen_zhivot_g);

  // площ(кв.см) × [ земя×10 000 + строителна×останали ] ÷ (10 000 кв.см/м² × 10 000 б.т.)
  const zaKvadrat =
    BigInt(zemya_st_kvm) * BigInt(EDINITSA_BT) +
    BigInt(stroitelna_st_kvm) * BigInt(ostavashti_bt);
  const gore = BigInt(n.obshta_kvsm) * zaKvadrat;
  const dolu = 10_000n * BigInt(EDINITSA_BT);
  return Number((gore * 2n + dolu) / (dolu * 2n));
}

/** Колко от сградата ОСТАВА, в базисни точки · един дом за екрана и за теста. */
export function ostavashti_bt(matritsa?: Matritsa): number {
  const m = matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  if (m.polezen_zhivot_g <= 0) return 0;
  const iztekli = Math.min(Math.max(m.vazrast_g, 0), m.polezen_zhivot_g);
  return EDINITSA_BT - Math.round((iztekli * EDINITSA_BT) / m.polezen_zhivot_g);
}

/**
 * СЪГЛАСУВАНЕТО · претеглената цена от трите подхода.
 *
 * От методологията §2.4: „Професионалната практика не избира един подход, а ги
 * ПРЕТЕГЛЯ: Цена = Σ ( тегло × стойност ), Σ тегла = 1."
 *
 * ═══ НУЛЕВИЯТ ПОДХОД СЕ ИЗКЛЮЧВА, НЕ СЕ СМЯТА ═══
 *
 * Обект без наем дава Б = 0. Влезе ли тази нула в претеглената сума с теглото
 * си, съгласуваната пада с толкова процента, колкото е теглото — без някой да е
 * решавал, и без нищо на екрана да го казва. Това е тиха загуба на пари.
 *
 * Затова нулевите подходи ОТПАДАТ и теглата на останалите се ПРЕНОРМИРАТ до
 * 10 000. Кой е отпаднал и колко тегло е пренасочено, се връща — екранът го
 * КАЗВА (правило 15).
 *
 * ОСТАТЪКЪТ ОТ ПРЕНОРМИРАНЕТО отива на НАЙ-ГОЛЯМОТО от оцелелите тегла и това
 * е назовано (`matematika` §4): остатък, който изчезва, се появява по-късно
 * като „сметката не затваря с един цент".
 *
 * Всичко в `BigInt`, делене ВЕДНЪЖ накрая.
 */
export interface Saglasuvane {
  /** претеглената цена в цели центове, БЕЗ закръгляне */
  readonly tochno_st: number;
  /** теглата СЛЕД пренормирането · сборът им е точно 10 000 */
  readonly deystvashti: Tegla;
  /** имената на подходите, отпаднали заради нулева стойност */
  readonly otpadnali: readonly string[];
}

/**
 * ЗАТВАРЯТ ЛИ ТЕГЛАТА · питат ГО, преди да викнат `saglasuvana`.
 *
 * Строгостта на `saglasuvana` е правилна и остава: сбор, различен от 100 %, не
 * бива да ражда число. Но ЕКРАНЪТ не бива да пада заради нея — човек, който
 * мени тегло, минава през 110 % при всяко въвеждане.
 *
 * Платено с находка: проходът намери, че вдигането на едно тегло срива екрана
 * с необработена грешка. Отказът е СЪОБЩЕНИЕ (правило 15), не срив; затова
 * викащите питат тук, а пазачът си стои на място.
 */
export function teglataZatvaryat(tegla: Tegla): boolean {
  return sboratNaTeglata(tegla) === EDINITSA_BT;
}

export function saglasuvana(n: {
  readonly pazaren_st: number;
  readonly dohoden_st: number;
  readonly razhoden_st: number;
  readonly tegla: Tegla;
}): Saglasuvane {
  const sbor = sboratNaTeglata(n.tegla);
  if (sbor !== EDINITSA_BT) {
    throw new GreshkaMatritsa(
      `Трите тегла дават ${sbor} б.т., а трябва точно ${EDINITSA_BT}. ` +
        'Тегло, което не затваря, е тихо изгубено число.',
    );
  }

  const podhodi = [
    { ime: 'пазарен', st: n.pazaren_st, bt: n.tegla.pazaren_bt },
    { ime: 'доходен', st: n.dohoden_st, bt: n.tegla.dohoden_bt },
    { ime: 'разходен', st: n.razhoden_st, bt: n.tegla.razhoden_bt },
  ];
  for (const p of podhodi) {
    if (!Number.isSafeInteger(p.st) || p.st < 0) {
      throw new GreshkaMatritsa(`Стойността по „${p.ime}" е в цели центове от нула нагоре.`);
    }
  }

  const zhivi = podhodi.filter((p) => p.st > 0 && p.bt > 0);
  const otpadnali = podhodi.filter((p) => p.st === 0 && p.bt > 0).map((p) => p.ime);
  if (zhivi.length === 0) {
    return Object.freeze({
      tochno_st: 0,
      deystvashti: Object.freeze({ pazaren_bt: 0, dohoden_bt: 0, razhoden_bt: 0 }),
      otpadnali: Object.freeze(otpadnali),
    });
  }

  // ПРЕНОРМИРАНЕ · всяко тегло към сбора на оцелелите; остатъкът на най-голямото.
  const sborZhivi = zhivi.reduce((s, p) => s + p.bt, 0);
  const novi = zhivi.map((p) => ({
    ...p,
    novo_bt: Math.floor((p.bt * EDINITSA_BT) / sborZhivi),
  }));
  const nay = novi.reduce((a, b) => (b.novo_bt > a.novo_bt ? b : a), novi[0]!);
  nay.novo_bt += EDINITSA_BT - novi.reduce((s, p) => s + p.novo_bt, 0);

  const gore = novi.reduce((s, p) => s + BigInt(p.novo_bt) * BigInt(p.st), 0n);
  const dolu = BigInt(EDINITSA_BT);
  const bt = (ime: string): number => novi.find((p) => p.ime === ime)?.novo_bt ?? 0;

  return Object.freeze({
    tochno_st: Number((gore * 2n + dolu) / (dolu * 2n)),
    deystvashti: Object.freeze({
      pazaren_bt: bt('пазарен'),
      dohoden_bt: bt('доходен'),
      razhoden_bt: bt('разходен'),
    }),
    otpadnali: Object.freeze(otpadnali),
  });
}

/** Очакваният месечен наем за обект без наем в Журнала — от матрицата. */
export function ochakvanNaem_st(
  obshta_kvsm: number,
  vid: VidObekt,
  matritsa?: Matritsa,
): number {
  const m = matritsa ?? MATRITSA_ZA_RAZRABOTKA;
  const naem_st_kvm = m.naem_st_kvm[vid];
  if (naem_st_kvm === undefined) return 0;
  // площ (кв.см) × наем (ст./м²) ÷ 10 000 → центове на месец
  return Math.round((obshta_kvsm * naem_st_kvm) / 10_000);
}

/**
 * ЕВРО НА КВАДРАТ · производното число в неговата листа.
 *
 * Проверено срещу „ЦЕНИ МД нова.xlsx": 224 800 € ÷ 75,914 851 71 м² дава
 * 2 961,212 397 €/м² — точно каквото пише там. Затова тук се смята така, а не
 * от матрицата: неговата колона е ЧАСТНО на цената и площта.
 *
 * Връща цели евроцента на квадратен метър.
 */
export function evroNaKvadrat_st(tsena_st: number, obshta_kvsm: number): number {
  if (obshta_kvsm <= 0) return 0;
  return Math.round((tsena_st * 10_000) / obshta_kvsm);
}
