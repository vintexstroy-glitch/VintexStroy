/**
 * РЕГИСТЪРЪТ НА ЕКРАНИТЕ · един екран, ЕДИН ДОМ (правило 17).
 *
 * Дотук един екран се знаеше на ШЕСТ места в `main.ts`: съюза `KoyEkran`,
 * картата с имена и икони, картата на възможностите, картата на ролите,
 * тернарната верига за рисуване и веригата от `else if` за закачането.
 *
 * Нов екран искаше шест пипвания, а забравеното се откриваше едва когато някой
 * натисне пункта — пункт, който се вижда, но не рисува нищо.
 *
 * Тук всичко за един екран стои на едно място. Пропуснато поле е грешка при
 * компилация, не празен екран; а понеже модулът няма странични ефекти, той се
 * ЧЕТЕ И ОТ ТЕСТ (`tests/ekranite.test.ts`) — `main.ts` не може, защото пипа
 * `document` в мига на внасянето.
 */

import { narisuvayImoti, zakachiFormite } from './imoti.js';
import { narisuvayStoynost, zakachiStoynost } from './stoynost.js';
import { narisuvayGant, zakachiGant } from './gant.js';
import { narisuvayPari, zakachiPari } from './pari.js';
import { narisuvaySmetki, zakachiSmetki } from './smetki.js';
import { moyatRed, podredeniPunktove, skritiPunktove } from './lenta.js';
import { narisuvayKontaktite, zakachiKontaktite } from './kontakti.js';
import { narisuvayProdazhbi, zakachiProdazhbite } from './prodazhbi.js';
import { narisuvayPlashtaniyaArhiv, zakachiPlashtaniyaArhiv } from './plashtaniya-arhiv.js';
import { narisuvayTablo } from './tablo.js';
import { narisuvayNastroyki, zakachiNastroyki } from './nastroyki.js';
import { narisuvayII, zakachiII } from './ii.js';
import { narisuvayTabove, zakachiTabove } from './tabove.js';
import { narisuvayLichno, pokanaZaLichno, zakachiLichno } from './lichno.js';
import { mozhe, type Izbor, type Vazmozhnost } from '../src/domein/planove.js';
import { rolyataNa } from '../src/domein/stopanin.js';
import { koyGleda } from '../src/domein/temi-nastroyki.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Deystviya } from '../src/domein/deystviya.js';
import { godinite } from '../src/domein/godishna-ravnosmetka.js';
import { probvaneto } from '../src/domein/probvane.js';
import type { DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import type { Pravata, Vrata } from '../src/yadro/index.js';
import type { Rolya, Samolichnost } from '../src/yadro/samolichnost.js';

export type KoyEkran =
  | 'imoti'
  | 'pari'
  | 'stoynost'
  | 'gant'
  | 'smetki'
  | 'nastroyki'
  | 'ii'
  | 'tabove'
  | 'lichno'
  | 'kontakti'
  | 'prodazhbi'
  | 'plashtaniya'
  | 'tablo';

/**
 * КОИ ПУНКТОВЕ ЗАВИСЯТ ОТ ДОСТЪПА · неговата поръчка, изпълнена поименно.
 *
 * Негови думи (И98): „**прецени ти** кои от основното меню са свързани с
 * достъпа естествено."
 *
 * КРИТЕРИЯТ, който избрах, е ЕДИН: екран се заключва по роля САМО когато носи
 * действие, което **колонното право не може да ограничи** — необратимо,
 * харчещо пари, или менящо ЧУЖДИ числа (И97 т.6). Всичко, което се стеснява с
 * изключен ред или скрита колона (правило 23), НЕ се заключва: скритото пак се
 * смята, а скритият ПУНКТ значи празен екран.
 *
 * | екран | зависи ли | защо |
 * | :---- | :----: | :---- |
 * | **Настройки** | ДА · собственик | оттам се раздава самото колонно право — не може да се ограничи от него |
 * | **Сметки** | ДА · редактор | ДДС-справката ЗАМРАЗЯВА месеца (правило 9); скрита колона не го спира |
 * | **ИИ** | ДА · собственик | агентът ХАРЧИ ПАРИ с ключ (ADR-029) |
 * | **Стойност** | ДА · собственик | базовата цена и коефициентите са изрично негови (И97 т.6); числото Е екранът, колона няма какво да скрие |
 * | Имоти | не | падането по подразбиране — скрито падане значи празен екран или цикъл |
 * | Пари | не | ежедневната работа на редактора; сумите се крият по КОЛОНА |
 * | Управление | не | скрит пункт значи човек, който не вижда какво му е възложено |
 * | **Табове** | ДА · собственик | негова дума (И101): табове, таблици и диаграми се създават и СВЪРЗВАТ само от Стопанина |
 * | **Лично** | не · но САМО ЗА СЛУЖИТЕЛ | зависи от СОБСТВЕНИЯ превключвател, не от чужд достъп; Стопанинът няма личен таб (ADR-154) |
 * | **Табло** | НИКОГА | там се връща изключеното и там стои ключът на личното — не бива да може да се самозаключи |
 *
 * НЕ СЕ СЛИВА с `mozhe()`: правило 15 казва, че правото (планът) и отметката
 * не се сливат; трети въпрос вътре в същата функция би направил същото.
 */
/** Стига ли ролята · наблюдател < редактор < собственик. */
export function dostapenLiE(koy: KoyEkran, rolya: Rolya): boolean {
  const iska = EKRANI[koy].iskaRolya;
  if (!iska) return true;
  if (iska === 'redaktor') return rolya !== 'nablyudatel';
  return rolya === 'sobstvenik';
}

export interface Konteks {
  readonly deystviya: Deystviya;
  readonly dnevnik: DnevnikVIndexedDB;
  readonly vrata: Vrata;
  readonly pravata: Pravata;
  /** под кой ключ е отвореният Журнал (ADR-020) — историята на реда чете по него */
  readonly akaunt: string;
  /**
   * КОЙ Е ВЛЯЗЪЛ · самоличността, не ключът на Журнала (И98).
   *
   * Дотук стигаше само до `main.ts`. Първият екран, който трябва да пита
   * „този служител може ли", я налага — а личният ключ се строи именно от
   * имейла, не от отворения акаунт.
   */
  readonly kojSam: Samolichnost;
  readonly vest: (vid: 'dobre' | 'zle', tekst: string) => void;
}


// Отваря се екранът, на който човек е спрял (ADR-022). Непознат запис (от
// стара версия) пада към Имоти — паметта никога не чупи тръгването.

/**
 * ДЖОБЪТ · служебният работник.
 *
 * Той прави приложението продукт, който се отваря без мрежа — план 1 от
 * ADR-006. Регистрацията е тиха: провали ли се, приложението работи както
 * досега, само че иска мрежа за да се отвори.
 *
 * `imaNova` пали ТИХ ред в лентата, когато нова версия чака. Нарочно не
 * презарежда сама: човек може да въвежда плащане точно в този миг.
 */
/**
 * КАКВО ТРЯБВА НА ЕДИН ЕКРАН, ЗА ДА СЕ НАРИСУВА · събрано веднъж на рисуване.
 *
 * Дотук всеки екран си вадеше своето от обхвата на `prerisuvay`, а вратичката
 * беше, че тернарната верига долу знаеше КОЙ какво иска. Тук въпросът се
 * обръща: рисуването получава ВСИЧКО и всеки взима каквото му трябва.
 */
export interface ZaRisuvane {
  readonly ogledalo: Ogledalo;
  readonly broySabitiya: number;
  readonly dnes: string;
  readonly izbor: Izbor;
  readonly kojSam: Samolichnost;
  readonly akaunt: string;
  readonly kranatEOtvoren: boolean;
  /** личното · `null` значи „не е пипано" (трето състояние, не празно) */
  readonly lichnoOgledalo: Ogledalo | null;
  readonly lichenAkaunt: string;
  readonly broyLichni: number;
  /** колко заема Журналът · МЕРЕНО от браузъра (резен Д · честната спирачка) */
  readonly zaetoNaUstroystvoto: number;
  /**
   * ДЕНЯТ НА ПЪРВОТО СЪБИТИЕ · за пробването (резен 32).
   *
   * Подава се ЕДИН низ, а не цялата книга: Таблото показва, не смята, и няма
   * защо да научава за Журнала заради едно число. Празно значи празна книга.
   */
  readonly parviyatZapis: string;
  /**
   * КОИ ЕКРАНА СА ДОСТЪПНИ на този човек · СМЯТА се в `main.ts` (правило 17).
   *
   * Подава се, а не се смята пак тук: филтърът пита и плана, и ролята, и трите
   * състояния на личното. Втора негова сметка щеше да е второ място, което се
   * разминава — а разминаването тук значи пункт, който го има в лентата и го
   * няма в картата, или обратното.
   */
  readonly dostapniEkrani: readonly string[];
}

interface ZaZakachane {
  readonly koren: HTMLElement;
  readonly k: Konteks;
  readonly lichen: Konteks;
  readonly prerisuvay: () => Promise<void>;
  /** ДНЕШНИЯТ ден · подава се, не се чете — часовникът е довод (резен 26) */
  readonly dnes: string;
  /**
   * ДВЕТЕ НЕЩА, КОИТО ЖИВЕЯТ В ЗАТВАРЯНЕТО на `trugvay` и не могат да се
   * вдигнат на модулно ниво: превключването на личното (пише в личния Журнал
   * през контекста) и връщането на изключеното от Таблото (мени `izbor`).
   *
   * Подават се като функции, вместо да се изнесат насила — така регистърът
   * остава чиста таблица, а състоянието си остава там, където се ражда.
   */
  readonly prevklyuchiLichnoto: (znak: string, vklyucheno: boolean) => void;
  readonly zakachiTabloto: () => void;
}

/**
 * ПУНКТОВЕТЕ НА МЕНЮТО · ключ и име, В РЕДА ИМ · ЕДНА сметка (правило 17).
 *
 * Два екрана питат за нея — Служители (матрицата на правата се подрежда по
 * табовете, И103) и Настройки (Редакторът пита хедъра на кой таб стои). Написана
 * два пъти, тя щеше да се разминава: хедър, който в единия списък стои под
 * „Пари", а в другия под нищо.
 *
 * Скритите пунктове ПАДАТ: скрит таб не е дом на хедър, който човек ще търси.
 */
function punktoveNaMenyuto(r: ZaRisuvane): readonly { klyuch: string; ime: string }[] {
  return podredeniPunktove(r.dostapniEkrani, r.ogledalo.redNaLentata, moyatRed())
    .filter((klyuch) => !skritiPunktove().includes(klyuch))
    .map((klyuch) => ({ klyuch, ime: EKRANI[klyuch as KoyEkran].ime }));
}

/**
 * ЕДИН ЕКРАН · ЕДИН ДОМ (правило 17).
 *
 * Дотук един екран се знаеше на ШЕСТ места: съюза `KoyEkran`, картата с имена,
 * картата на възможностите, картата на ролите, тернарната верига за рисуване и
 * веригата от `else if` за закачането. Нов екран искаше шест пипвания, а
 * забравеното се откриваше едва когато някой натисне пункта.
 *
 * Сега всичко за един екран стои на един ред. Пропуснато поле е грешка при
 * компилация, не празен екран.
 */
interface OpisNaEkran {
  readonly ime: string;
  readonly podnaslov: string;
  readonly ikona: string;
  /** от коя ВЪЗМОЖНОСТ зависи · липсва значи „от никоя" */
  readonly iska?: Vazmozhnost;
  /** каква РОЛЯ иска · липсва значи „всяка" */
  readonly iskaRolya?: Rolya;
  /**
   * САМО ЗА СЛУЖИТЕЛ · главният имейл не го вижда (ADR-154 · И131 т.1:
   * „Стопанина ням,а опция за личен."). Границата е на екрана — лентата и
   * Таблото; Вратата не се пипа. Днес го носи само Лично.
   */
  readonly samoZaSluzhitel?: true;
  readonly narisuvay: (r: ZaRisuvane) => string;
  readonly zakachi: (z: ZaZakachane) => void;
}

/**
 * НАЧАЛНИЯТ РЕД НА ЛЕНТАТА · разпределението е НЕГОВО, събрано (И125 · резен 85).
 *
 * Дотук редът беше страничен ефект от подредбата на този файл — точно
 * „бъркотията", която И121 т.6 назова. Отсега е РЕШЕНИЕ, с извора на всяко
 * място:
 *
 *   · ТАБЛОТО е първо — неговият файл почва с двете ТАБЛА (р48·[37]), а
 *     Таблото е и пътят обратно (ADR-066);
 *   · РАБОТНИЯТ блок — Имоти (наемите), Пари, Сметки, Управление, Продажби;
 *     „Плащания Архив сложен СЛЕД Продажби Архив" е дословно негово (р52·[288]);
 *   · ВТОРИЯТ РЕД, пак дословно (р52·[206]): „втория да почва с Преписки,
 *     контакти, продажби архив, цени и настройки" — Контактите (преписките са
 *     секция в тях), Стойност на Състояние (наследникът на таб Цени) и
 *     Настройки НАКРАЯ;
 *   · неказаните къде да седят (Табове · ИИ · Лично) стоят при системните,
 *     най-близо до Настройки — „Всичко което не съ казал къде да седи го дръж
 *     в настройки" (И121 т.6). Служители вече не е пункт: подтаб на Настройки
 *     (резен 112 · ADR-158).
 *   · ДВЕТЕ ГРУПИ (резен 118 · ADR-163): работата е всичко ПРЕДИ Контакти,
 *     второстепенните — от Контакти до Настройки. Границата е пин с ръка в
 *     `src/domein/lenta.ts` (`PARVIYAT_VAV_VTORATA`), не се извежда оттук.
 *
 * Това е НАЧАЛНИЯТ ред (долният слой на ADR-066): Стопанинът го пренарежда
 * със събитие, всеки — за себе си отгоре. Тестът пази, че списъкът и
 * регистърът се покриват едно към едно.
 */
export const REDAT_NA_LENTATA: readonly KoyEkran[] = Object.freeze([
  'tablo',
  'imoti',
  'pari',
  'smetki',
  'gant',
  'prodazhbi',
  'plashtaniya',
  'kontakti',
  'stoynost',
  'tabove',
  'ii',
  'lichno',
  'nastroyki',
]);

export const EKRANI: Record<KoyEkran, OpisNaEkran> = {
  imoti: {
    ime: 'Имоти',
    podnaslov: 'записва вместо да помни · всичко минава през Вратата',
    ikona: 'ekran-imoti',
    narisuvay: (r) =>
      narisuvayImoti({ ogledalo: r.ogledalo, sabitiya: r.broySabitiya, izbor: r.izbor }),
    zakachi: (z) => zakachiFormite(z.koren, z.k, z.prerisuvay),
  },
  pari: {
    ime: 'Пари',
    podnaslov: 'какво ти дължат, кой закъснява, какво е влязло',
    ikona: 'ekran-pari',
    narisuvay: (r) => narisuvayPari(r.ogledalo, r.dnes, r.izbor),
    zakachi: (z) => zakachiPari(z.koren, z.k, z.prerisuvay),
  },
  smetki: {
    // ИМЕТО СЕ ВРЪЩА НА „СМЕТКИ" (резен 115 · И136): „Табовете в СМетки са
    // главния Сметки и подтабове: Приход, Разход, Отчвт, Баланс." Тоест
    // „Баланс" вече не е името на екрана, а на ЕДИН от петте му подтаба —
    // последната дума бие (правило 28) и надживява ADR-120 §6 · И124 т.11.
    // Ключът `smetki` не е мърдал: той е кодов адрес, не име.
    ime: 'Сметки',
    podnaslov: 'Приход · Разход · Отчет · Баланс · цените са с ДДС',
    ikona: 'ekran-smetki',
    iska: 'smetki-dds',
    iskaRolya: 'redaktor',
    narisuvay: (r) => narisuvaySmetki(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiSmetki(z.koren, z.k, z.prerisuvay),
  },
  nastroyki: {
    ime: 'Настройки',
    podnaslov: 'бутоните са модели на пътища · нищо не е константа',
    ikona: 'nastroyki',
    /**
     * БЕЗ `iska` · И ТОВА Е ПОПРАВКА НА ДЕФЕКТ (резен 18).
     *
     * Дотук стоеше `iska: 'iztochnitsi'` — възможност, която дава само Драйвът.
     * Пунктът обаче се връща БЕЗУСЛОВНО (`main.ts` · И101 т.2: „Настройки не се
     * скрива от никого"), значи на двата ЛОКАЛНИ плана той стоеше в лентата и
     * натискането го връщаше на Имоти. Без дума защо, и с него падаха езикът на
     * интерфейса, личният таб, контрагентите, колонното право — петнайсет теми
     * заради две.
     *
     * Изискването слезе на ТЕМАТА (`temi-nastroyki.ts` · поле `iska`), където
     * му е мястото: две теми искат Драйва, останалите не. Това връща и
     * обещанието „ВСЯКО издание работи офлайн" на локалните планове.
     *
     * И БЕЗ `iskaRolya` (резен 83 · И121 т.1): „ТРябва за служителите да имат
     * достъп до техните възможности за настройки без тези определени само за
     * стопанина." Заключеният ЦЯЛ екран отнемаше на служителя и сверките, и
     * подредбата — неговите. Единицата на правото е СЕКЦИЯТА: кой коя вижда
     * казва `vizhdaSektsiyata` (домейнът), а екранът само пита.
     */
    narisuvay: (r) =>
      narisuvayNastroyki(
        r.ogledalo,
        r.broySabitiya,
        r.izbor,
        // КОЙ ГЛЕДА се СМЯТА от Журнала, не от самоличността (ADR-043).
        koyGleda(r.kojSam.imeyl, r.ogledalo),
        // Редакторът на хедъри пита „на кой таб стоиш" — с ЖИВИТЕ пунктове.
        punktoveNaMenyuto(r),
        r.dnes,
        r.dostapniEkrani,
        // ХОРАТА живеят в подтаб на Настройки от резен 112 (ADR-158).
        r.kojSam,
      ),
    zakachi: (z) => zakachiNastroyki(z.koren, z.k, z.prerisuvay, z.dnes),
  },
  stoynost: {
    ime: 'Стойност на Състояние',
    podnaslov: 'Калкулаторът · няма редакция оттам, а само изчисляване',
    ikona: 'ekran-stoynost',
    iskaRolya: 'sobstvenik',
    narisuvay: () => narisuvayStoynost(),
    zakachi: (z) => zakachiStoynost(z.koren, z.k, z.prerisuvay),
  },
  gant: {
    ime: 'Управление',
    podnaslov: 'Управление на Времевия Ред в Делата · Имот · Обект · Дело — три колони с филтри',
    ikona: 'ekran-gant',
    narisuvay: (r) => narisuvayGant(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiGant(z.koren, z.k, z.prerisuvay),
  },
  ii: {
    ime: 'ИИ',
    podnaslov: 'агентът чете, смята и ПРЕДЛАГА · записва човекът',
    ikona: 'ekran-ii',
    // ИИ-таблото иска ПРАВОТО (планът). Отметката и кранът се показват ВЪТРЕ,
    // поотделно (правило 15) — иначе изключената отметка би скрила екрана, на
    // който пише защо е скрит.
    iska: 'svarzhi-ii',
    iskaRolya: 'sobstvenik',
    narisuvay: (r) =>
      narisuvayII(
        r.ogledalo,
        {
          pravo: r.izbor.plan.vazmozhnosti.has('svarzhi-ii'),
          otmetka: mozhe(r.izbor, 'svarzhi-ii'),
          kran: r.kranatEOtvoren,
        },
        r.dnes,
      ),
    zakachi: (z) => zakachiII(z.koren, z.k, z.prerisuvay),
  },
  tabove: {
    ime: 'Табове',
    podnaslov: 'стационарни и добавени · секции с таблици и графики, комбинират се',
    /**
     * САМО СТОПАНИНЪТ (И101).
     *
     * Негови думи: „Всеки клиент на приложението има възможност да създава нови
     * табове от таблото и да създава таблици, диаграми, графики, да ги свързва
     * с различни таблици — **само от стопанина**."
     *
     * Двете половини на изречението не си противоречат: функцията е на ВСЕКИ
     * клиент (не е скъпа добавка), а вътре в акаунта я упражнява ЕДИН човек.
     * Причината е същата като при формулите (ADR-025): секция, вързана за чужда
     * таблица, мени какво ЧЕТАТ другите — едно действие, чужди числа (И97 т.6).
     *
     * Дотук тук пишеше „конструкторът рисува от вече позволеното" — вярно, но
     * недостатъчно: позволеното се СТЕСНЯВА от колонното право, а въпросът кой
     * може да СТРОИ изгледи, колонното право не го докосва.
     */
    iskaRolya: 'sobstvenik',
    ikona: 'ekran-tabove',
    narisuvay: (r) => narisuvayTabove(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiTabove(z.koren, z.k, z.prerisuvay),
  },
  lichno: {
    ime: 'Лично',
    podnaslov: 'същата таблица за собствени нужди · ОТДЕЛЕН Журнал, който никога не се смесва',
    ikona: 'lichno',
    samoZaSluzhitel: true,
    narisuvay: (r) =>
      r.lichnoOgledalo && r.lichnoOgledalo.lichnoVklyucheno
        ? narisuvayLichno(r.lichnoOgledalo, r.ogledalo, r.dnes, r.lichenAkaunt, r.broyLichni)
        : pokanaZaLichno(r.lichenAkaunt, r.lichnoOgledalo?.lichnoMyasto ?? ''),
    zakachi: (z) => {
      zakachiLichno(z.koren, z.k, z.lichen, z.prerisuvay);
      z.prevklyuchiLichnoto('#lichno-pusni', true);
      z.prevklyuchiLichnoto('#lichno-priberi', false);
    },
  },
  kontakti: {
    ime: 'Контакти',
    podnaslov: 'един таб, две секции · преписките и хората',
    ikona: 'ekran-sluzhiteli',
    /**
     * БЕЗ `iska` и БЕЗ `iskaRolya`.
     *
     * Контактът е НОМЕНКЛАТУРА, не достъп: вписването тук не пуска никого в
     * програмата (правило 14 · служителите са свой екран). А преписката е
     * РАБОТА — същият служител, който води делата, води и нея. Роля тук би била
     * втора врата към достъпа, точно каквото правило 23 забранява.
     */
    narisuvay: (r) => narisuvayKontaktite(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiKontaktite(z.koren, z.k, z.prerisuvay),
  },
  prodazhbi: {
    ime: 'Продажби',
    podnaslov: 'сделката, вноските ѝ и терминалът · оттам няма връщане',
    ikona: 'ekran-prodazhbi',
    /**
     * БЕЗ `iska` и БЕЗ `iskaRolya`.
     *
     * Продажбата е РАБОТА, не настройка: същият служител, който води наемите,
     * води и сделките. Роля тук би била надпис — кой какво пише, решават
     * ролята при доставчика и колонното право (правило 23), а не втора врата
     * на екрана.
     */
    narisuvay: (r) => narisuvayProdazhbi(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiProdazhbite(z.koren, z.k, z.prerisuvay),
  },
  plashtaniya: {
    ime: 'Плащания Архив',
    podnaslov: 'седмицата в три листа · Заплати · Фактури Кеш · Фактури Карта',
    ikona: 'ekran-plashtaniya',
    /**
     * БЕЗ `iska` и БЕЗ `iskaRolya`, и този път по НАЙ-силната причина:
     * екранът няма НИТО ЕДИН път към Вратата. Роля над чист поглед би била
     * втора врата към достъпа — точно онова, което правило 23 забранява.
     */
    narisuvay: (r) => narisuvayPlashtaniyaArhiv(r.ogledalo, r.dnes),
    zakachi: (z) => zakachiPlashtaniyaArhiv(z.koren, z.k, z.prerisuvay),
  },
  tablo: {
    ime: 'Табло',
    podnaslov: 'кой съм · какъв е планът · какво да се вижда',
    ikona: 'ekran-tablo',
    // ТАБЛОТО НЯМА нито `iska`, нито `iskaRolya`, и това е НАРОЧНО: там се
    // връща изключеното и там стои ключът на личното. Екран, който може да се
    // самозаключи, заключва и пътя обратно.
    narisuvay: (r) =>
      narisuvayTablo(
        r.kojSam,
        r.izbor,
        r.akaunt,
        r.lichnoOgledalo?.lichnoVklyucheno ?? false,
        r.lichnoOgledalo !== null,
        // СТОПАНИНЪТ и СМЯТАНАТА роля идват от ЖУРНАЛА, не от самоличността
        // (ADR-043): доставчикът казва КОЙ си, Журналът — какво можеш в него.
        r.ogledalo.stopanin,
        rolyataNa(r.kojSam.imeyl, r.ogledalo),
        r.ogledalo.zapasenKontakt,
        {
          vsichki: r.ogledalo.tabove.size,
          dobaveni: [...r.ogledalo.tabove.values()].filter((t) => !t.statsionaren).length,
        },
        // ПУНКТОВЕТЕ НА ЛЕНТАТА · подредени по трите слоя, с ВСИЧКИ вътре —
        // и скритите. Картата е мястото, където скритото се връща; списък само
        // с видимите щеше да е капан без изход (правило 15).
        {
          punktove: podredeniPunktove(
            r.dostapniEkrani,
            r.ogledalo.redNaLentata,
            moyatRed(),
          ).map((klyuch) => ({
            klyuch,
            ime: EKRANI[klyuch as KoyEkran].ime,
            skrit: skritiPunktove().includes(klyuch),
          })),
          moyatRedEPipnat: moyatRed().length > 0,
        },
        r.zaetoNaUstroystvoto,
        // ГОДИНИТЕ · СМЯТАТ се тук, където Огледалото и денят са налице.
        {
          chakat: godinite(r.ogledalo, r.dnes)
            .filter((g) => g.sastoyanie === 'chaka')
            .map((g) => g.godina),
          razminavat: godinite(r.ogledalo, r.dnes)
            .filter((g) => g.sastoyanie === 'razminava')
            .map((g) => g.godina),
        },
        // ПРОБВАНЕТО · СМЯТА се тук, където книгата и денят са налице.
        probvaneto(r.parviyatZapis, r.dnes),
      ),
    zakachi: (z) => z.zakachiTabloto(),
  },
};

