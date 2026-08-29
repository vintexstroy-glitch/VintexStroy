/**
 * КРЕДИТНАТА АРИТМЕТИКА · ЕДИН дом за двата кредита (правило 17).
 *
 * Кредит има на ДВЕ места: личният (ADR-038, само за Стопанина) и фирменият
 * (ADR-079, таблицата под Разходи). Сметките им са едни и същи — лихвата за
 * месеца, делението на вноската, остатъкът от главниците.
 *
 * ЗАЩО НЕ ДВЕ КОПИЯ. Едно и също деление, написано два пъти, се разминава в
 * деня, в който единият се поправи. И разминаването не се вижда като грешка, а
 * като ГРЕШЕН ОСТАТЪК по чужд кредит — число, което човек чете като истина.
 *
 * ЦЕЛИ ЦЕНТОВЕ, БЕЗ НИТО ЕДИН FLOAT (правило 3). Степенуването на анюитетната
 * формула изобщо не влиза тук: вноската се ВЪВЕЖДА от договора, защото банката
 * вече я е сметнала и погасителният план е в него. Тогава месец по месец
 * всичко е цяло — лихвата от остатъка, главницата като разлика, новият остатък.
 */

import { deliZakragleno } from '../yadro/pari.js';

export class GreshkaKredit extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKredit';
  }
}

// ── ВИДОВЕТЕ ───────────────────────────────────────────────────────────────

export const VIDOVE_KREDIT = ['ipoteka', 'potrebitelski', 'lizing', 'zaem'] as const;

export type VidKredit = (typeof VIDOVE_KREDIT)[number];

export const IMENA_NA_VIDOVETE_KREDIT: Readonly<Record<VidKredit, string>> = Object.freeze({
  ipoteka: 'ипотечен',
  potrebitelski: 'потребителски',
  lizing: 'лизинг',
  zaem: 'заем',
});

// ── ЛИХВАТА ────────────────────────────────────────────────────────────────

/** 100 % = 10 000 базисни пункта; на месец се дели на 12 → 120 000. */
export const BAZISNI_ZA_MESETS = 120_000;

/**
 * ЛИХВАТА ЗА ЕДИН МЕСЕЦ · целочислено, от остатъка.
 *
 * `остатък × годишни базисни пунктове ÷ (10 000 × 12)`
 *
 * Най-лошият реален случай не прелива: остатък 10 000 000 00 ц. (10 млн. €)
 * по 5 000 б.п. дава 5 × 10¹² — далеч под 2⁵³.
 */
export function lihvaZaMesetsa(ostatak_st: number, lihva_bp: number): number {
  if (!Number.isSafeInteger(ostatak_st) || !Number.isSafeInteger(lihva_bp)) {
    throw new GreshkaKredit('Остатъкът е в цели центове, а лихвата — в цели базисни пунктове.');
  }
  if (lihva_bp < 0) throw new GreshkaKredit('Лихвата не може да е отрицателна.');
  return deliZakragleno(ostatak_st * lihva_bp, BAZISNI_ZA_MESETS);
}

/**
 * КАК СЕ ДЕЛИ ЕДНА ВНОСКА · предложение, не запис (правило 18).
 *
 * Смята се от остатъка към днес; човекът вижда двете числа и записва. Ако
 * вноската е по-малка от лихвата (случва се при просрочие), главницата би
 * излязла отрицателна — вместо това цялата вноска отива в лихва и се КАЗВА.
 *
 * ═══ ПОСЛЕДНАТА ВНОСКА Е ПО-МАЛКА, А НЕ ПО-ЛИХВЕНА ═══
 *
 * Дотук, когато главницата опреше в остатъка, ОСТАТЪКЪТ ОТ ВНОСКАТА се
 * изсипваше в ЛИХВАТА, за да се запази сборът. При 106,06 € дълг и 300 €
 * договорна вноска това даваше „лихва 193,94 €" — число, което човек чете
 * като истина и записва в книгата.
 *
 * Истината е обратната: лихвата е онова, което е (30 ц.), а ВНОСКАТА се свива.
 * Затова трите числа вече НЕ се събират до договорната вноска при последната —
 * и точно това прави сбора на главниците равен на остатъка, точно.
 *
 * Намерено от плана по дати (резен 19); стар тест го пазеше като вярно.
 */
export function predlozhiVnoska(
  ostatak_st: number,
  lihva_bp: number,
  vnoska_st: number,
): { readonly lihva_st: number; readonly glavnitsa_st: number; readonly stiga: boolean } {
  const lihva_st = lihvaZaMesetsa(ostatak_st, lihva_bp);
  if (lihva_st >= vnoska_st) {
    return Object.freeze({ lihva_st: vnoska_st, glavnitsa_st: 0, stiga: false });
  }
  // Главницата не бива да надхвърли остатъка — тогава вноската се СВИВА.
  const glavnitsa_st = Math.min(vnoska_st - lihva_st, ostatak_st);
  return Object.freeze({ lihva_st, glavnitsa_st, stiga: true });
}

/**
 * ИНВАРИАНТЪТ НА ВНОСКАТА · трите части СЪБИРАТ вноската, точно.
 *
 * Проверява се в ДОМЕЙНА, не във Вратата: Вратата знае, че числото е цяло —
 * че трите се събират до четвъртото е знание за смисъла, не за формата.
 *
 * `eVnoska` е false за обикновен ред: тогава трите ТРЯБВА да са нула, иначе
 * някой е попълнил главница на разход, който не е по кредит.
 */
export function proveriTriteChasti(
  suma_st: number,
  glavnitsa_st: number,
  lihva_st: number,
  taksa_st: number,
  eVnoska: boolean,
): void {
  if (!eVnoska) {
    if (glavnitsa_st !== 0 || lihva_st !== 0 || taksa_st !== 0) {
      throw new GreshkaKredit(
        'Главница, лихва и такса имат смисъл САМО при вноска по кредит. ' +
          'Посочи кой кредит, или махни трите числа.',
      );
    }
    return;
  }
  if (glavnitsa_st < 0 || lihva_st < 0 || taksa_st < 0) {
    throw new GreshkaKredit('Главница, лихва и такса не може да са отрицателни.');
  }
  const sbor = glavnitsa_st + lihva_st + taksa_st;
  if (sbor !== suma_st) {
    throw new GreshkaKredit(
      `Трите части не събират вноската: ${glavnitsa_st} + ${lihva_st} + ${taksa_st} = ${sbor}, ` +
        `а вноската е ${suma_st} (в цели центове). Вноска, чиито части не се ` +
        'събират, поправя остатъка по кредита с грешно число.',
    );
  }
}

// ── ПЛАНЪТ ПО ДАТИ ─────────────────────────────────────────────────────────

/**
 * ДЕНЯТ НА ВНОСКАТА В ЕДИН МЕСЕЦ · 31-ви се СВИВА до последния ден.
 *
 * Договор с падеж 31-во число има падеж и през февруари. Банковият занаят го
 * решава по един начин: последният ден на месеца. Отказ при въвеждане („денят
 * е между 1 и 28") щеше да е по-лесен за кода и невъзможен за човека с такъв
 * договор; тихо местене напред щеше да мени МЕСЕЦА на вноската.
 */
export function denNaVnoskata(godina: number, mesets: number, den: number): string {
  const posledniyat = new Date(Date.UTC(godina, mesets, 0)).getUTCDate();
  const d = Math.min(den, posledniyat);
  return `${godina}-${String(mesets).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface VnoskaOtPlana {
  readonly data: string;
  readonly vnoska_st: number;
  readonly lihva_st: number;
  readonly glavnitsa_st: number;
  /** остатъкът СЛЕД тази вноска */
  readonly ostatak_st: number;
}

/**
 * Повече вноски от това не се разнасят. 50 години месечни вноски — по-дълъг
 * кредит не съществува, а безкраен цикъл при вноска, по-малка от лихвата, би
 * запушил екрана вместо да каже какво не е наред.
 */
export const NAY_MNOGO_VNOSKI = 600;

/**
 * ИНТЕРПОЛАЦИЯТА · неговите думи, дословно *(р59·[18])*:
 *
 *   „…интерполирай за тези кредити вноските в времето което остава по дати…"
 *
 * Разнася оставащия остатък по ДАТИ напред: ден `den` от всеки следващ месец,
 * започвайки от първия падеж СЛЕД `dnes`. Всяка вноска се дели по вече
 * написания път (`predlozhiVnoska`), тоест планът и реалното плащане смятат с
 * ЕДНА И СЪЩА функция — иначе прогнозата и истината биха се разминали.
 *
 * ПОСЛЕДНАТА ВНОСКА Е ПО-МАЛКА: главницата се реже до остатъка, а вноската е
 * лихвата плюс тази главница. Сборът на главниците е ТОЧНО остатъкът — това е
 * инвариантът, който тестът чупи нарочно.
 *
 * Вноска, по-малка от лихвата, не гони остатъка надолу: планът СПИРА и връща
 * празен списък, вместо да върти 600 реда, които не значат нищо.
 */
export function interpoliraiPlana(
  ostatak_st: number,
  lihva_bp: number,
  vnoska_st: number,
  den: number,
  dnes: string,
): readonly VnoskaOtPlana[] {
  if (ostatak_st <= 0 || vnoska_st <= 0) return Object.freeze([]);
  if (lihvaZaMesetsa(ostatak_st, lihva_bp) >= vnoska_st) return Object.freeze([]);

  const plan: VnoskaOtPlana[] = [];
  let ostava = ostatak_st;
  let godina = Number(dnes.slice(0, 4));
  let mesets = Number(dnes.slice(5, 7));

  // Първият падеж е този месец, ако още не е минал; иначе следващия.
  if (denNaVnoskata(godina, mesets, den) <= dnes) {
    mesets += 1;
    if (mesets > 12) {
      mesets = 1;
      godina += 1;
    }
  }

  while (ostava > 0 && plan.length < NAY_MNOGO_VNOSKI) {
    const { lihva_st, glavnitsa_st } = predlozhiVnoska(ostava, lihva_bp, vnoska_st);
    ostava -= glavnitsa_st;
    plan.push(
      Object.freeze({
        data: denNaVnoskata(godina, mesets, den),
        vnoska_st: lihva_st + glavnitsa_st,
        lihva_st,
        glavnitsa_st,
        ostatak_st: ostava,
      }),
    );
    mesets += 1;
    if (mesets > 12) {
      mesets = 1;
      godina += 1;
    }
  }
  return Object.freeze(plan);
}

// ── ДВАТА ПРОЦЕНТА ─────────────────────────────────────────────────────────

/**
 * ДВАТА ПРОЦЕНТА · неговите думи, дословно *(р59·[18])*:
 *
 *   „…за това ще има **два процента** единя е за целия кредит в началот, а за
 *    момента на деня спрямо оставащото колко се променя лихвата"
 *
 * | процентът | какво е | откъде |
 * | договорният | за целия кредит, от началото, непроменен | от договора |
 * | към деня | какъв ДЯЛ от вноската е лихва СЕГА | остатъкът към днес |
 *
 * Двата се разминават още от втората вноска и разминаването е самата поука:
 * договорът казва 3 %, а в началото 78 % от вноската отива за лихва. В края
 * вторият клони към нула — главницата е изяла лихвата.
 *
 * И ДВАТА СА В БАЗИСНИ ПУНКТОВЕ (1 % = 100 б.п.), но мерят РАЗЛИЧНИ неща, и
 * затова се показват с различни думи, не един до друг като „преди и сега".
 */
export interface DvataProtsenta {
  readonly dogovoren_bp: number;
  /** дялът на лихвата в СЛЕДВАЩАТА вноска · базисни пунктове от вноската */
  readonly kamDenya_bp: number;
  /** празно, когато и двата имат смисъл; иначе причината С ДУМИ */
  readonly zashto: string;
}

export function dvataProtsenta(
  ostatak_st: number,
  lihva_bp: number,
  vnoska_st: number,
): DvataProtsenta {
  if (ostatak_st <= 0) {
    return Object.freeze({
      dogovoren_bp: lihva_bp,
      kamDenya_bp: 0,
      zashto: 'Кредитът е погасен — няма остатък, върху който да тече лихва.',
    });
  }
  if (vnoska_st <= 0) {
    return Object.freeze({
      dogovoren_bp: lihva_bp,
      kamDenya_bp: 0,
      zashto: 'Няма вноска — дял от нула не съществува.',
    });
  }
  const lihva_st = lihvaZaMesetsa(ostatak_st, lihva_bp);
  return Object.freeze({
    dogovoren_bp: lihva_bp,
    kamDenya_bp: deliZakragleno(Math.min(lihva_st, vnoska_st) * 10_000, vnoska_st),
    zashto: '',
  });
}

/**
 * КАКВО ТУК НЯМА · обявено, не премълчано (правило 15).
 *
 * Изречението за втория процент има и ВТОРО четене: ефективна годишна
 * доходност (IRR) на оставащите вноски. Тя иска половене по цели базисни
 * пунктове и е свой резен — а две тълкувания, построени наведнъж, биха дали
 * две числа под едно име.
 *
 * Стои ПОИМЕННО, за да го брои машина, не изречение (шарката на ADR-067 ·
 * ADR-072 · ADR-078).
 */
export const CHAKA_NEGOVA_DUMA: readonly string[] = Object.freeze([
  'Вторият процент: дял на лихвата във вноската (построено) ИЛИ ефективна ' +
    'годишна доходност на оставащите вноски (не е построено). Изречението ' +
    'носи и двете; числото е различно.',
]);
