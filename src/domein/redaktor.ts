/**
 * РЕДАКТОРЪТ НА ХЕДЪРИ · операциите, с които главата се променя.
 *
 * Негови думи (23.08 · И58), от които този файл се крои:
 *
 *   „Две отделни, но свързани, и се редактират от едно място със смяна на
 *    редактора. Правата са след завършване на таблицата. Когато избереш някои
 *    колони от хедъра, те създават определени номенклатури. Изброил съм ги.
 *    НЕ ВСЯКА КОЛОНА ОТ ХЕДЪРА ИМА ПАДАЩИ НОМЕНКЛАТУРИ. ДРУГИ ИМАТ. ТРЕТИ —
 *    НОМЕНКЛАТУРИТЕ СА ОТ ВЪВЕЖДАНЕТО на делото или имота."
 *
 * Оттук ТРИТЕ ВИДА номенклатура — изброени поименно, не измислени:
 *   1. `svobodna`   — колона БЕЗ падащо меню; пише се направо;
 *   2. `opis`       — колона с ГОТОВО падащо меню от Описа;
 *   3. `vavezhdane` — номенклатурата се РАЖДА от въвеждането и расте сама.
 *
 * ЗАКОНИТЕ НА МАХАНЕТО, платени с негови изречения (`docs/izvori/03` §3):
 *
 *   „Когато има създадена работеща таблица, КОЛОНИ НЕ СЕ ТРИЯТ, А САМО СЕ
 *    ДОБАВЯТ; ако няма данни в колоната, никаква информация в таблиците —
 *    само тогава може да промениш." (ред 1572)
 *
 *   „Раждането/триенето на колона само за управител… САМО УПРАВИТЕЛИТЕ."
 *    (ред 1494) — при нас управителят е ролята `sobstvenik`.
 *
 *   „…може и да се изтрие всичко в списъка — тогава се пише директно,
 *    премахва се падащото меню и СЕ ЗАКЛЮЧВА НАИМЕНОВАНИЕТО НА ПОЛЕТО от
 *    хедъра." (ред 1994)
 *
 * ЗАЩО ВСЯКА ОПЕРАЦИЯ ВРЪЩА НОВ МОДЕЛ, А НЕ ПИПА СТАРИЯ. Промяната на хедър
 * е ново събитие `МоделЗаписан` със същия ключ — поправка = нов запис
 * (правило 1). Огледалото държи последния; историята стои в Журнала.
 *
 * СЕМЕЙСТВОТО. Негово (ред 1982): „когато създаваш нови колони в хедърите,
 * те се появяват на таблици, които работят с еднакви хедъри." Кой е роднина
 * казва `semeystvo()`; ДАЛИ новата колона отива и при роднините, решава
 * човекът с отметките в скрития ред — не кодът.
 *
 * ОПИСЪТ НА ПОДРЕДБА. Негово (ред 1970–1971): „Всичко именувано = ред в
 * Номенклатурите… и вече таблицата се казва Опис на Подредба." · „Всички
 * хедъри от таблица се редактират от таблица Опис на Подредба." Затова
 * `opisNaPodredba()` не е втора истина, а ИЗГЛЕД върху моделите: хедър,
 * колона и член на меню — всяко именувано нещо е ред.
 *
 * Пълната тема — `docs/izvori/03-koloni-hedari-tablitsi.md` §5 и §6.
 */

import type { ModelNaTablitsa, Rolya } from '../iztochnik/model.js';
import { IMENA_NA_ROLITE } from '../iztochnik/model.js';
import type { Rolya as RolyaNaChovek } from '../yadro/samolichnost.js';
import { vidNaKolona, IMENA_NA_VIDOVETE } from './kolonno.js';
import { svedenaGlava } from '../iztochnik/tablitsa.js';
import { VIDOVE_STOYNOST, type VidStoynost } from './vid-stoynost.js';
import { proveriFormula, sDumiFormula, type Formula } from './formuli.js';
import { proveriNomer } from './adresna-kniga.js';

export class GreshkaRedaktor extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaRedaktor';
  }
}

/** Трите вида номенклатура на една колона — по И58, изброени поименно. */
type VidNomenklatura = 'svobodna' | 'opis' | 'vavezhdane';

export const IMENA_NA_NOMENKLATURITE: Readonly<Record<VidNomenklatura, string>> = Object.freeze({
  svobodna: 'без падащо меню',
  opis: 'готово меню от Описа',
  vavezhdane: 'ражда се от въвеждането',
});

/** Кой от трите вида носи тази колона. Липсата на запис е първият вид. */
export function vidNomenklatura(m: ModelNaTablitsa, kolona: number): VidNomenklatura {
  if (m.menyuta[kolona] !== undefined) return 'opis';
  if (m.otVavezhdane.includes(kolona)) return 'vavezhdane';
  return 'svobodna';
}

/** Сведеното име — както отпечатъкът свежда главата, за да се сравнява. */
/** Отпечатъкът, пресметнат от главите — редакторът няма таблица под ръка. */
function otpechatakOtGlavi(glavi: readonly string[]): string {
  return glavi.map(svedenaGlava).join('|');
}

/** Старият отпечатък влиза в историята веднъж — списъкът расте, не се дублира. */
function sPredishen(m: ModelNaTablitsa, novi: readonly string[]): readonly string[] {
  const nov = otpechatakOtGlavi(novi);
  if (nov === m.otpechatak) return m.predishni;
  return m.predishni.includes(m.otpechatak)
    ? m.predishni
    : Object.freeze([...m.predishni, m.otpechatak]);
}

function proveriIme(m: ModelNaTablitsa, ime: string, osven?: number): string {
  const chisto = ime.trim().replace(/\s+/g, ' ');
  if (chisto === '') throw new GreshkaRedaktor('Колоната иска име — по него се разпознава.');
  const zaeto = m.glavi.findIndex((g, i) => i !== osven && svedenaGlava(g) === svedenaGlava(chisto));
  if (zaeto >= 0) {
    throw new GreshkaRedaktor(
      `Име „${chisto}" вече носи колона ${zaeto}. Две колони с едно име се разменят при четене.`,
    );
  }
  return chisto;
}

function samoUpravitel(rolya: RolyaNaChovek, deystvie: string): void {
  if (rolya !== 'sobstvenik') {
    throw new GreshkaRedaktor(
      `${deystvie} е само за управителите (ред 1494) — ролята тук е „${rolya}".`,
    );
  }
}

function proveriKolona(m: ModelNaTablitsa, kolona: number): void {
  if (!Number.isInteger(kolona) || kolona < 0 || kolona >= m.glavi.length) {
    throw new GreshkaRedaktor(`Колона ${kolona} я няма в главата (${m.glavi.length} колони).`);
  }
}

function chistiChlenove(chlenove: readonly string[]): readonly string[] {
  const chisti = chlenove.map((c) => c.trim().replace(/\s+/g, ' ')).filter((c) => c !== '');
  const videni = new Set<string>();
  for (const c of chisti) {
    const s = svedenaGlava(c);
    if (videni.has(s)) throw new GreshkaRedaktor(`Член „${c}" се повтаря в менюто.`);
    videni.add(s);
  }
  return Object.freeze(chisti);
}

/** Сглобява новия модел: главите се менят, отпечатъкът се пресмята наново. */
function sGlavi(m: ModelNaTablitsa, glavi: readonly string[]): ModelNaTablitsa {
  return Object.freeze({
    ...m,
    glavi: Object.freeze([...glavi]),
    otpechatak: otpechatakOtGlavi(glavi),
    predishni: sPredishen(m, glavi),
  });
}

/**
 * ДОБАВЯ КОЛОНА в края на главата. Работеща таблица само расте (ред 1572).
 *
 * Новата колона се ражда с вида и номенклатурата си наведнъж — така екранът
 * пита веднъж, а Журналът получава ЕДНО събитие, не три.
 */
export function dobaviKolona(
  m: ModelNaTablitsa,
  n: {
    readonly ime: string;
    readonly rolya: RolyaNaChovek;
    /** затворена = сметка или пренесен текст; не носи меню */
    readonly zatvorena?: boolean;
    /** готово падащо меню от Описа (вторият вид) */
    readonly menyu?: readonly string[];
    /** номенклатурата се ражда от въвеждането (третият вид) */
    readonly otVavezhdane?: boolean;
  },
): ModelNaTablitsa {
  samoUpravitel(n.rolya, 'Раждането на колона');
  const ime = proveriIme(m, n.ime);
  if (n.menyu && n.otVavezhdane) {
    throw new GreshkaRedaktor(
      'Менюто или е готово от Описа, или се ражда от въвеждането — не и двете.',
    );
  }
  if (n.zatvorena && (n.menyu || n.otVavezhdane)) {
    throw new GreshkaRedaktor(
      'Затворената колона е сметка или пренесен текст — в нея не се избира, меню не ѝ трябва.',
    );
  }

  const kolona = m.glavi.length;
  const glavi = [...m.glavi, ime];
  const menyu = n.menyu ? chistiChlenove(n.menyu) : undefined;
  if (menyu && menyu.length === 0) {
    throw new GreshkaRedaktor('Готовото меню иска поне един член — празното меню е първият вид.');
  }

  return Object.freeze({
    ...sGlavi(m, glavi),
    ...(n.zatvorena ? { zatvoreni: Object.freeze([...m.zatvoreni, kolona]) } : {}),
    ...(menyu ? { menyuta: Object.freeze({ ...m.menyuta, [kolona]: menyu }) } : {}),
    ...(n.otVavezhdane ? { otVavezhdane: Object.freeze([...m.otVavezhdane, kolona]) } : {}),
  });
}

/**
 * ПРЕИМЕНУВА колона. Заключеното име не мърда — то е заключено от негово
 * решение (ред 1994), не от код.
 */
export function preimenuvayKolona(
  m: ModelNaTablitsa,
  kolona: number,
  novoIme: string,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Преименуването на колона');
  proveriKolona(m, kolona);
  if (m.zaklyucheni.includes(kolona)) {
    throw new GreshkaRedaktor(
      `Името на колона „${m.glavi[kolona]}" е заключено — падащото ѝ меню беше изтрито (ред 1994).`,
    );
  }
  const ime = proveriIme(m, novoIme, kolona);
  const glavi = [...m.glavi];
  glavi[kolona] = ime;
  return sGlavi(m, glavi);
}

/**
 * ЗАДАВА ГОТОВО МЕНЮ на променяща се колона (вторият вид номенклатура).
 * Членовете са редове в Описа на Подредба — „всичко именувано = ред".
 */
export function zadayMenyu(
  m: ModelNaTablitsa,
  kolona: number,
  chlenove: readonly string[],
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Менюто на колона');
  proveriKolona(m, kolona);
  if (vidNaKolona(m, kolona) === 'zatvorena') {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" е затворена — сметка не се избира от меню.`,
    );
  }
  const chisti = chistiChlenove(chlenove);
  if (chisti.length === 0) {
    throw new GreshkaRedaktor('Менюто иска поне един член. Празно меню се маха с изтриване.');
  }
  return Object.freeze({
    ...m,
    menyuta: Object.freeze({ ...m.menyuta, [kolona]: chisti }),
    // Готовото меню измества раждането от въвеждане — двата вида не се сливат.
    otVavezhdane: Object.freeze(m.otVavezhdane.filter((k) => k !== kolona)),
  });
}

/**
 * СМЕНЯ ВИДА НА СТОЙНОСТТА · евро · процент · число · текст · дата.
 *
 * Това е втората половина на ADR-014. Първата беше подсказката: `podskazhiVid()`
 * гадае по заглавието при внасяне. Но собственият ѝ коментар казва
 * „**ПРЕДЛОЖЕНИЕ, не решение. Човекът потвърждава в Редактора на хедъри**" —
 * а такова потвърждение нямаше къде да се даде. Ето го.
 *
 * ЗАЩО Е ВАЖНО, а не удобство: **само `evro` влиза в двата сбора** (правило 20
 * · `ePari`). Колона, която подсказката е сбъркала, тихо влиза или тихо изпада
 * от Приходи и Разходи. Речникът на подсказката е тесен нарочно — непознатата
 * колона става `tekst` и чака човек. Дотук чакаше напразно.
 *
 * СМЯНАТА НЕ ПИПА ДАННИТЕ. Видът е свойство на КОЛОНАТА, не на клетките в нея
 * (ADR-014). Смяната мени накъде отива сборът ѝ занапред; вече записаните
 * потоци си остават — те са отделни събития със свой период.
 */
export function smeniVidNaStoynost(
  m: ModelNaTablitsa,
  kolona: number,
  vid: VidStoynost,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Смяната на вида на стойността');
  proveriKolona(m, kolona);
  if (!(VIDOVE_STOYNOST as readonly string[]).includes(vid)) {
    throw new GreshkaRedaktor(`Няма такъв вид стойност: „${vid}".`);
  }
  return Object.freeze({
    ...m,
    vidove: Object.freeze({ ...m.vidove, [kolona]: vid }),
  });
}

/**
 * ИЗТРИВА МЕНЮТО и ЗАКЛЮЧВА ИМЕТО. Негово, дословно (ред 1994): „може и да
 * се изтрие всичко в списъка — тогава се пише директно, премахва се падащото
 * меню и се заключва наименованието на полето от хедъра."
 */
export function iztriyMenyu(
  m: ModelNaTablitsa,
  kolona: number,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Изтриването на меню');
  proveriKolona(m, kolona);
  if (m.menyuta[kolona] === undefined) {
    throw new GreshkaRedaktor(`Колона „${m.glavi[kolona]}" няма готово меню за изтриване.`);
  }
  const menyuta = { ...m.menyuta };
  delete menyuta[kolona];
  return Object.freeze({
    ...m,
    menyuta: Object.freeze(menyuta),
    zaklyucheni: m.zaklyucheni.includes(kolona)
      ? m.zaklyucheni
      : Object.freeze([...m.zaklyucheni, kolona]),
  });
}

/**
 * ОТБЕЛЯЗВА, че номенклатурата на колоната се ражда от въвеждането (третият
 * вид). Менюто ѝ е списъкът на вече въведеното — то не се пише тук.
 */
export function otbelezhiVavezhdane(
  m: ModelNaTablitsa,
  kolona: number,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Номенклатурата на колона');
  proveriKolona(m, kolona);
  if (vidNaKolona(m, kolona) === 'zatvorena') {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" е затворена — сметка не ражда номенклатура.`,
    );
  }
  if (m.menyuta[kolona] !== undefined) {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" носи готово меню — първо то се изтрива, после се сменя видът.`,
    );
  }
  if (m.otVavezhdane.includes(kolona)) return m;
  return Object.freeze({
    ...m,
    otVavezhdane: Object.freeze([...m.otVavezhdane, kolona]),
  });
}

/** Помощник при махане: номерата над махнатата колона слизат с едно. */
function bezKolona(spisak: readonly number[], kolona: number): readonly number[] {
  return Object.freeze(spisak.filter((k) => k !== kolona).map((k) => (k > kolona ? k - 1 : k)));
}

/**
 * Същото, но за КАРТА, чийто ключ е номер на колона.
 *
 * ЗАЩО СЪЩЕСТВУВА. Махането на колона мести номерата на всички след нея, а
 * номерът е ключ на четири карти и на четири списъка. Списъците се местеха;
 * `vidove` — не, защото беше единствената карта извън цикъла за `menyuta`.
 * Едно място за двете значи, че следващата карта няма как да се забрави.
 */
function bezKolonaVKarta<T>(
  karta: Readonly<Record<number, T>>,
  kolona: number,
): Readonly<Record<number, T>> {
  const izhod: Record<number, T> = {};
  for (const [k, stoynost] of Object.entries(karta)) {
    const nomer = Number(k);
    if (nomer === kolona) continue;
    izhod[nomer > kolona ? nomer - 1 : nomer] = stoynost;
  }
  return Object.freeze(izhod);
}

/**
 * ПРЕМАХВА колона — и това е ИЗКЛЮЧЕНИЕТО, не правилото.
 *
 * Негово (ред 1572): само когато „няма данни в колоната, никаква информация
 * в таблиците". Дали има данни знае ЕКРАНЪТ, който гледа таблиците — затова
 * го казва подателят, а домейнът отказва и при колона, която носи роля:
 * роля без колона чупи четенето на всеки следващ файл.
 */
export function premahniKolona(
  m: ModelNaTablitsa,
  kolona: number,
  n: { readonly rolya: RolyaNaChovek; readonly imaDanni: boolean },
): ModelNaTablitsa {
  samoUpravitel(n.rolya, 'Триенето на колона');
  proveriKolona(m, kolona);
  if (n.imaDanni) {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" носи данни — колони не се трият, а само се добавят (ред 1572).`,
    );
  }
  const nositel = (Object.entries(m.koloni) as [Rolya, number][]).find(([, k]) => k === kolona);
  if (nositel) {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" е ролята „${IMENA_NA_ROLITE[nositel[0]]}" на модела — ` +
        'без нея редът не става запис. Първо се дава ролята на друга колона.',
    );
  }
  // ОПЕРАНД НЕ СЕ МАХА ИЗПОД ФОРМУЛА. Проучването: „веригите гният тихо" —
  // Airtable дава #ERROR след факта. Тук се отказва ПРЕДИ, и се казва коя
  // формула държи колоната.
  const zavisim = Object.entries(m.formuli).find(([, f]) => f.ot.includes(kolona));
  if (zavisim) {
    const [nomer, formula] = zavisim;
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" влиза във формулата на „${m.glavi[Number(nomer)]}" ` +
        `(${sDumiFormula(m, formula)}). Първо се сменя формулата.`,
    );
  }

  const glavi = m.glavi.filter((_, i) => i !== kolona);
  const koloni: Partial<Record<Rolya, number>> = {};
  for (const [rolya, k] of Object.entries(m.koloni) as [Rolya, number][]) {
    koloni[rolya] = k > kolona ? k - 1 : k;
  }
  // ВСИЧКО, чийто ключ е номер на колона, се мести ЗАЕДНО. Пропуснатото поле
  // не гърми — то тихо лепва стойността си за съседа отляво.
  return Object.freeze({
    ...m,
    glavi: Object.freeze(glavi),
    otpechatak: otpechatakOtGlavi(glavi),
    predishni: sPredishen(m, glavi),
    koloni: Object.freeze(koloni),
    izklyucheni: bezKolona(m.izklyucheni, kolona),
    zatvoreni: bezKolona(m.zatvoreni, kolona),
    otVavezhdane: bezKolona(m.otVavezhdane, kolona),
    zaklyucheni: bezKolona(m.zaklyucheni, kolona),
    menyuta: bezKolonaVKarta(m.menyuta, kolona),
    // ТОВА ЛИПСВАШЕ. `vidove` казва коя колона е евро (ADR-014), а само
    // `evro` влиза в двата сбора (правило 20). Останел на стария си ключ,
    // видът се лепва за колоната отляво: колона с пари тихо пада към текст и
    // изчезва от Приходи/Разходи, а колона с номер на фактура може да влезе
    // в сбор. Числото си остава число — затова никой не забелязва.
    vidove: bezKolonaVKarta(m.vidove, kolona),
    // Формулите се местят с два хода: ключът (коя колона е формулна) и
    // операндите ВЪТРЕ в нея. Само първото би оставило формула, сочеща
    // съседа отляво — сметка, която мълчи и лъже.
    formuli: bezKolonaVFormuli(m.formuli, kolona),
    nomera: bezKolonaVKarta(m.nomera, kolona),
  });
}

/** Формулите след махане на колона: ключът слиза, операндите — също. */
function bezKolonaVFormuli(
  karta: Readonly<Record<number, Formula>>,
  kolona: number,
): Readonly<Record<number, Formula>> {
  const izhod: Record<number, Formula> = {};
  for (const [k, f] of Object.entries(karta)) {
    const nomer = Number(k);
    if (nomer === kolona) continue;
    izhod[nomer > kolona ? nomer - 1 : nomer] = Object.freeze({
      ...f,
      ot: Object.freeze(f.ot.map((o) => (o > kolona ? o - 1 : o))),
    });
  }
  return Object.freeze(izhod);
}

/**
 * ДОБАВЯ ФОРМУЛНА КОЛОНА · сметката се дава ПРИ СЪЗДАВАНЕТО (И92 т.8).
 *
 * „Формулите ще се пишат само при създаване на таблиците, а след това ще се
 * редактира само от Стопанина." Тук е първата половина: раждането. Втората е
 * `smeniFormula` — и двете минават през `samoUpravitel`.
 *
 * Формулната колона е ЗАТВОРЕНА по устройство, не по избор: в нея не се пише,
 * тя се смята (правило 23 — затворената не се редактира от никого). Видът ѝ
 * също не се избира — СМЯТА СЕ от операндите (`vidNaFormulata`), защото
 * „евро × число" е евро, каквото и да е сложил човекът в падащото меню.
 */
export function dobaviFormulnaKolona(
  m: ModelNaTablitsa,
  n: { readonly ime: string; readonly formula: Formula; readonly rolya: RolyaNaChovek },
): ModelNaTablitsa {
  samoUpravitel(n.rolya, 'Раждането на формулна колона');
  const ime = proveriIme(m, n.ime);
  const vid = proveriFormula(m, n.formula);

  const kolona = m.glavi.length;
  return Object.freeze({
    ...sGlavi(m, [...m.glavi, ime]),
    zatvoreni: Object.freeze([...m.zatvoreni, kolona]),
    vidove: Object.freeze({ ...m.vidove, [kolona]: vid }),
    formuli: Object.freeze({ ...m.formuli, [kolona]: n.formula }),
  });
}

/**
 * СМЕНЯ ФОРМУЛАТА на вече родена колона — само Стопанинът (И92 т.8).
 *
 * Смяната е ново събитие `МоделЗаписан` (правило 1): старата формула остава в
 * Журнала и се вижда кой я е сменил и кога. Видът се пресмята наново — новата
 * сметка може да го е сменила от число на евро.
 */
export function smeniFormula(
  m: ModelNaTablitsa,
  kolona: number,
  formula: Formula,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Смяната на формула');
  proveriKolona(m, kolona);
  if (m.formuli[kolona] === undefined) {
    throw new GreshkaRedaktor(
      `Колона „${m.glavi[kolona]}" носи данни, не формула. Формула се дава при създаване на колоната.`,
    );
  }
  const vid = proveriFormula(m, formula, kolona);
  return Object.freeze({
    ...m,
    vidove: Object.freeze({ ...m.vidove, [kolona]: vid }),
    formuli: Object.freeze({ ...m.formuli, [kolona]: formula }),
  });
}

/**
 * ДАВА НОМЕР НА ВРЪЗКА на колона (И94 т.2 · адресната книга).
 *
 * „Връзката между таблиците както в Ексел, с номер на полето." Две колони
 * с един номер са свързани. Номер 0 МАХА връзката — и това е решение на
 * човек, затова също минава оттук, а не с изтриване на ключ някъде.
 * Проверката на самия номер е в `adresna-kniga.ts` — един дом.
 */
export function dayNomer(
  m: ModelNaTablitsa,
  kolona: number,
  nomer: number,
  rolya: RolyaNaChovek,
): ModelNaTablitsa {
  samoUpravitel(rolya, 'Номерът на връзка');
  proveriKolona(m, kolona);
  proveriNomer(nomer);
  if (nomer === 0) {
    const nomera = { ...m.nomera };
    delete nomera[kolona];
    return Object.freeze({ ...m, nomera: Object.freeze(nomera) });
  }
  return Object.freeze({
    ...m,
    nomera: Object.freeze({ ...m.nomera, [kolona]: nomer }),
  });
}

/**
 * СЕМЕЙСТВОТО на един модел: другите модели, които работят със СЪЩАТА глава —
 * днешната или някоя от предишните ѝ. Негово (ред 1982): новата колона „се
 * появява на таблици, които работят с еднакви хедъри" — но ДАЛИ отива при
 * роднина, решава отметката на човека, не този списък.
 */
export function semeystvo(
  modeli: readonly ModelNaTablitsa[],
  m: ModelNaTablitsa,
): readonly ModelNaTablitsa[] {
  const negovite = new Set([m.otpechatak, ...m.predishni]);
  return modeli.filter(
    (drug) =>
      drug.klyuch !== m.klyuch &&
      (negovite.has(drug.otpechatak) || drug.predishni.some((p) => negovite.has(p))),
  );
}

/** Един ред в Описа на Подредба — всичко именувано е ред (ред 1970). */
interface RedVOpisa {
  /** името, дословно */
  readonly ime: string;
  /** какво е именуваното */
  readonly vid: 'hedar' | 'kolona' | 'chlen';
  /** къде живее: моделът, или „модел · колона" за член на меню */
  readonly dom: string;
  /** видът на колоната и номенклатурата ѝ — за колоните */
  readonly belezhka: string;
}

export const IMENA_V_OPISA: Readonly<Record<RedVOpisa['vid'], string>> = Object.freeze({
  hedar: 'хедър',
  kolona: 'колона',
  chlen: 'член на меню',
});

/**
 * ОПИСЪТ НА ПОДРЕДБА · изглед, не втора истина.
 *
 * „Всичко именувано = ред в Номенклатурите" — хедърите, колоните им и
 * членовете на готовите менюта. Смята се от моделите при всяко показване;
 * записът е самият модел, затова тук няма какво да се разсинхронизира.
 */
export function opisNaPodredba(modeli: readonly ModelNaTablitsa[]): readonly RedVOpisa[] {
  const redove: RedVOpisa[] = [];
  const podredeni = [...modeli].sort((a, b) => a.klyuch.localeCompare(b.klyuch, 'bg'));
  for (const m of podredeni) {
    redove.push({ ime: m.klyuch, vid: 'hedar', dom: 'Настройки', belezhka: `${m.glavi.length} колони` });
    m.glavi.forEach((ime, kolona) => {
      const vid = IMENA_NA_VIDOVETE[vidNaKolona(m, kolona)];
      const nomenklatura = IMENA_NA_NOMENKLATURITE[vidNomenklatura(m, kolona)];
      const zaklyucheno = m.zaklyucheni.includes(kolona) ? ' · името е заключено' : '';
      // Формулната колона казва СМЕТКАТА си на мястото на номенклатурата: тя
      // няма меню, а човекът, който чете Описа, пита точно „откъде идва това".
      const formula = m.formuli[kolona];
      redove.push({
        ime,
        vid: 'kolona',
        dom: m.klyuch,
        belezhka: formula
          ? `${vid} · формула: ${sDumiFormula(m, formula)}`
          : `${vid} · ${nomenklatura}${zaklyucheno}`,
      });
      for (const chlen of m.menyuta[kolona] ?? []) {
        redove.push({ ime: chlen, vid: 'chlen', dom: `${m.klyuch} · ${ime}`, belezhka: '' });
      }
    });
  }
  return Object.freeze(redove);
}
