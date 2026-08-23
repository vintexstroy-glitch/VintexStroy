/**
 * ЗНАКЪТ · Приход /+/ и Разход /−/ · умение на ДАННИТЕ, не бутон.
 *
 * Негови думи, дословно, и те определят всичко тук:
 *
 *   „Те са автоматична привилегия да са предложения на бутоните в тези две
 *    таблици за премахване и автоматично появяване там. **Те не са бутон, а
 *    УМЕНИЕ НА ДАННИТЕ** за таблиците на Приход с + и Разход с −."
 *
 * И по-подробно:
 *
 *   „За Приходи се появява падащо меню с името на избраната колона от тези
 *    възможни С ЦИФРИ, сумарно от цялата колона, и от съответния сбор се
 *    предлага според знака с /+/ за Приход и с /−/ за Разход… а всеки месец,
 *    ако има промяна в някоя колона, която участва, СМЕНЯ МЯСТОТО СИ
 *    АВТОМАТИЧНО, и има възможност просто да се изключи там и да не стигне в
 *    Сметки и в Управление."
 *
 * Оттук трите решения на този файл:
 *
 * 1. ЗНАКЪТ НЕ СЕ ЗАПИСВА. Той се смята от сбора при всяко показване — затова
 *    колоната мърда сама между двете таблици, без някой да я пипа. Записан
 *    знак би заковал колоната там, където е била миналия месец.
 *
 * 2. ИЗКЛЮЧВАНЕТО СЕ ЗАПИСВА. То е решение на човек и иска следа: „защо това
 *    число не е в Сметки" трябва да има отговор в Журнала, не в нечия памет.
 *
 * 3. ПРИХОД И РАЗХОД НЕ СЕ МАХАТ. Негови думи: „Тях винаги ги има. Могат да се
 *    скрият както и другите табове, но не могат да се махнат." Затова тук няма
 *    таблица от сборове, между които се избира — има точно два, изброени в тип.
 *
 * ЗАЩО ТОВА Е ПОПРАВКА, НЕ ДОБАВКА. Трети закон на скелета (ИЗВОР-3): „Нищо не
 * е константа. Всяко име/роля/номенклатура е данна от Настройки, не зашито в
 * кода." Днес `AKUMULATORI` и `POTOTSI` са заковани таблици. Знакът е пътят,
 * по който те спират да бъдат единственият начин число да влезе в Сметки.
 */

import { otLeva, GreshkaPari } from '../yadro/pari.js';
import { poRolya, redoveSDanni, type ModelNaTablitsa, type Rolya } from '../iztochnik/model.js';
import { kletka, type Tablitsa } from '../iztochnik/tablitsa.js';

/** Двата сбора. Изброени в тип, защото не се добавят и не се махат. */
export type Sbor = 'prihod' | 'razhod';

export const IMENA_NA_SBOROVETE: Readonly<Record<Sbor, string>> = Object.freeze({
  prihod: 'Приход',
  razhod: 'Разход',
});

export const ZNAK: Readonly<Record<Sbor, string>> = Object.freeze({
  prihod: '+',
  razhod: '−', // истинско минус (U+2212), не тире — така се чете и се търси
});

/** Една числова колона, каквато я вижда падащото меню. */
export interface ChislovaKolona {
  readonly kolona: number;
  /** заглавието от хедъра, както го е написал източникът */
  readonly ime: string;
  /** сборът на цялата колона, цели стотинки */
  readonly sbor_st: number;
  /** колко реда в нея са се разчели като число */
  readonly broy: number;
  /** ролята, ако моделът ѝ е дал такава — иначе колоната е само число */
  readonly rolya?: Rolya;
  /** махната ли е от човека */
  readonly izklyuchena: boolean;
}

/**
 * Знакът на един сбор. Нулата отива в Приход — не защото е приход, а защото
 * трябва да е НЯКЪДЕ и невидимата нула е по-лоша от нулата на грешното място.
 */
export function znak(sbor_st: number): Sbor {
  return sbor_st < 0 ? 'razhod' : 'prihod';
}

/**
 * КОИ КОЛОНИ НОСЯТ ЦИФРИ · и колко е сборът на всяка.
 *
 * Колоната е числова, когато поне един неин ред се чете като сума И нито един
 * непразен ред не се проваля. Прагът е нарочно строг: колона „Описание", в
 * която случайно има „2024", не бива да се предложи като пари.
 *
 * Три роли НЕ се предлагат, колкото и числови да изглеждат:
 *
 *   `data` и `period` — дата не е сума;
 *   `dokument`        — номерът на фактура е ИМЕ, а не пари. Сборът „4001 +
 *                       4002 = 8003 €" е точно тихата грешка, която този
 *                       файл трябва да лови (тестът я хвана при първото пускане);
 *   `dds` при ПРОЦЕНТ — 20 е ставка; сборът на процентите е число без смисъл.
 *
 * Колона БЕЗ роля, която пак носи номера („Реф. номер"), не може да се познае —
 * затова сборовете са ПРЕДЛОЖЕНИЯ, а човекът я маха с едно натискане.
 */
export function chislovi(m: ModelNaTablitsa, t: Tablitsa): readonly ChislovaKolona[] {
  const glava = t.redove[m.redNaGlavata] ?? [];
  const redove = redoveSDanni(m, t);
  const poKolona = new Map<number, Rolya>();
  for (const [rolya, kolona] of Object.entries(m.koloni) as [Rolya, number][]) {
    poKolona.set(kolona, rolya);
  }

  const izhod: ChislovaKolona[] = [];

  for (let k = 0; k < glava.length; k += 1) {
    const rolya = poKolona.get(k);
    // Ставката не е сума. Сборът на процентите е число без смисъл.
    if (rolya === 'dds' && m.ddsE !== 'suma') continue;
    if (rolya === 'data' || rolya === 'period' || rolya === 'dokument') continue;

    let sbor_st = 0;
    let broy = 0;
    let spanal = false;

    for (const red of redove) {
      const surovo = kletka(t, red, k);
      if (surovo === '') continue;
      try {
        sbor_st += otLeva(surovo.replace(/\s|лв\.?/gi, ''));
        broy += 1;
      } catch (greshka) {
        if (!(greshka instanceof GreshkaPari)) throw greshka;
        spanal = true;
        break;
      }
    }

    if (spanal || broy === 0) continue;

    izhod.push({
      kolona: k,
      ime: (glava[k] ?? '').trim() || `колона ${k + 1}`,
      sbor_st,
      broy,
      ...(rolya === undefined ? {} : { rolya }),
      izklyuchena: m.izklyucheni.includes(k),
    });
  }

  return izhod;
}

/**
 * Разпределя колоните между двата сбора СПОРЕД ЗНАКА.
 *
 * Изключените не влизат в нито един от двата — те са махнати от човека и не
 * стигат нито до Сметки, нито до Управление. Но НЕ изчезват: `izklyucheni`
 * ги връща, за да се вижда какво е махнато и да може да се върне.
 */
export interface DvataSbora {
  readonly prihod: readonly ChislovaKolona[];
  readonly razhod: readonly ChislovaKolona[];
  readonly izklyucheni: readonly ChislovaKolona[];
  readonly prihod_st: number;
  readonly razhod_st: number;
}

export function vDvataSbora(kolonite: readonly ChislovaKolona[]): DvataSbora {
  const prihod: ChislovaKolona[] = [];
  const razhod: ChislovaKolona[] = [];
  const izklyucheni: ChislovaKolona[] = [];

  for (const k of kolonite) {
    if (k.izklyuchena) izklyucheni.push(k);
    else if (znak(k.sbor_st) === 'prihod') prihod.push(k);
    else razhod.push(k);
  }

  return {
    prihod,
    razhod,
    izklyucheni,
    prihod_st: prihod.reduce((s, k) => s + k.sbor_st, 0),
    // Разходът се показва като ПОЛОЖИТЕЛНО число — знакът е в името на сбора,
    // не в цифрата. Иначе на екрана стоят два минуса и никой не знае кой е кой.
    razhod_st: razhod.reduce((s, k) => s + Math.abs(k.sbor_st), 0),
  };
}

/** Изключва или връща една колона. Връща НОВ списък — старият не се пипа. */
export function sPrevklyuchena(m: ModelNaTablitsa, kolona: number): readonly number[] {
  return m.izklyucheni.includes(kolona)
    ? m.izklyucheni.filter((k) => k !== kolona)
    : [...m.izklyucheni, kolona].sort((a, b) => a - b);
}

/** Едно изречение за екрана — какво е предложено и какво е махнато. */
export function sDumi(d: DvataSbora): string {
  const chasti = [
    `${d.prihod.length} в Приход /+/`,
    `${d.razhod.length} в Разход /−/`,
  ];
  if (d.izklyucheni.length) chasti.push(`${d.izklyucheni.length} махнати`);
  return chasti.join(' · ');
}

/** Колоната по номер — за екрана, когато се натисне ред от менюто. */
export function kolonaPoNomer(
  kolonite: readonly ChislovaKolona[],
  kolona: number,
): ChislovaKolona | undefined {
  return kolonite.find((k) => k.kolona === kolona);
}

/** Ролята с думи — за менюто, където колоната се разпознава по име и роля. */
export function sRolya(k: ChislovaKolona, imena: Readonly<Record<Rolya, string>>): string {
  return k.rolya === undefined ? '' : imena[k.rolya];
}

/** Първата клетка от колоната — за да се види, че е тя, преди да се махне. */
export function primer(m: ModelNaTablitsa, t: Tablitsa, kolona: number): string {
  for (const red of redoveSDanni(m, t)) {
    const stoynost = kletka(t, red, kolona);
    if (stoynost !== '') return stoynost;
  }
  return '';
}

/** Заглавието на колоната според модела — за следата в сверката. */
export function imeNaRolya(m: ModelNaTablitsa, t: Tablitsa, rolya: Rolya): string {
  const kolona = m.koloni[rolya];
  if (kolona === undefined) return '';
  return poRolya(m, t, m.redNaGlavata, rolya) || kletka(t, m.redNaGlavata, kolona);
}
