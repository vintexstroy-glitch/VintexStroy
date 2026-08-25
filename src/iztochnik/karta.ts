/**
 * ИЗВЛЕЧЕНИЕТО ОТ КАРТА · „регистрира се с извлеченията на карти" (И96 т.10).
 *
 * ═══ ЗАЩО СВОЙ ЧЕТЕЦ, А НЕ СЪЩИЯТ КАТО ЗА РАЗХОДИТЕ ═══
 *
 * Служебният четец (`razchitane.ts`) чете таблица с РАЗХОДИ: всеки ред е
 * разход, посоката не се пита, и има ДДС. Извлечението от карта е друго
 * животно и разликите не са козметични:
 *
 *   1. РЕДЪТ МОЖЕ ДА Е И ВХОД, И ИЗХОД. Заплата, върнати пари и теглене стоят
 *      в един и същ файл. Посоката се ЧЕТЕ, не се приема.
 *   2. БАНКИТЕ Я КАЗВАТ ПО ТРИ НАЧИНА: две колони (дебит · кредит), една със
 *      знак, или една със скоби („(35,00)" е изход в англосаксонската норма).
 *   3. НЯМА ДДС и няма сектор — личният разход не се облага.
 *   4. ФАЙЛЪТ Е ОБХВАТ, не месец. Извлечение 15.07–15.08 е съвършено
 *      нормално, а служебният четец гадае ЕДИН период за целия лист.
 *
 * ═══ КАКВО СЕ ПРЕИЗПОЛЗВА ═══
 *
 * Всичко под нивото на смисъла: `otCSV` · `otXLSX` · `Tablitsa` ·
 * `nameriGlavata` · `dataOtKletka` · `otSuma`. Тук се строи само онова, което
 * казва „кой ред какво значи".
 */

import { otSuma } from '../yadro/pari.js';
import { EVRO, type Valuta } from '../yadro/valuta.js';
import { dataOtKletka } from './razchitane.js';
import { nameriGlavata, nameriKolona, type Tablitsa } from './tablitsa.js';

export class GreshkaKarta extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaKarta';
  }
}

/** Думите, по които се познава глава на извлечение · достатъчна е ДАТА и още една. */
const DUMI_DATA = ['дата', 'date', 'валута'] as const;
const DUMI_OPISANIE = ['описание', 'основание', 'детайли', 'контрагент', 'description'] as const;
const DUMI_SUMA = ['сума', 'amount'] as const;
const DUMI_DEBIT = ['дебит', 'debit', 'изход', 'теглене'] as const;
const DUMI_KREDIT = ['кредит', 'credit', 'вход', 'захранване'] as const;
const DUMI_REFERENTSIYA = ['референц', 'reference', 'документ', 'номер'] as const;
const DUMI_SALDO = ['салдо', 'balance', 'остатък'] as const;

export interface KoloniNaKartata {
  readonly glava: number;
  readonly data: number;
  readonly opisanie: number;
  /** една колона със знак · -1, когато банката дава две */
  readonly suma: number;
  readonly debit: number;
  readonly kredit: number;
  readonly referentsiya: number;
  readonly saldo: number;
}

/**
 * НАМИРА КОЛОНИТЕ · по думи в главата, не по позиция.
 *
 * Позицията се мени между банки и дори между износи на една банка. Думата
 * оцелява — същият похват като `nameriGlavata` за служебните таблици.
 */
export function koloniNaKartata(t: Tablitsa): KoloniNaKartata {
  const nameri = (dumi: readonly string[], glava: number): number => {
    for (const d of dumi) {
      const k = nameriKolona(t, glava, d);
      if (k >= 0) return k;
    }
    return -1;
  };

  // Главата е редът, който носи ДАТА и поне едно от трите числови имена.
  let glava = -1;
  for (const dumaZaChislo of [DUMI_SUMA, DUMI_DEBIT, DUMI_KREDIT]) {
    for (const d of dumaZaChislo) {
      for (const dd of DUMI_DATA) {
        const r = nameriGlavata(t, [dd, d]);
        if (r >= 0 && (glava === -1 || r < glava)) glava = r;
      }
    }
  }
  if (glava === -1) {
    throw new GreshkaKarta(
      'Този файл не прилича на извлечение от карта: не се намери ред с ДАТА и СУМА ' +
        '(или ДЕБИТ и КРЕДИТ). Провери дали листът е правилният.',
    );
  }

  const koloni = {
    glava,
    data: nameri(DUMI_DATA, glava),
    opisanie: nameri(DUMI_OPISANIE, glava),
    suma: nameri(DUMI_SUMA, glava),
    debit: nameri(DUMI_DEBIT, glava),
    kredit: nameri(DUMI_KREDIT, glava),
    referentsiya: nameri(DUMI_REFERENTSIYA, glava),
    saldo: nameri(DUMI_SALDO, glava),
  };
  if (koloni.suma < 0 && koloni.debit < 0 && koloni.kredit < 0) {
    throw new GreshkaKarta('Няма нито колона „Сума", нито двойката „Дебит"/„Кредит".');
  }
  return Object.freeze(koloni);
}

/**
 * СУМА СЪС ЗНАК · трите норми, в които банките пишат изход.
 *
 *   „-35,00"    минус отпред — най-честото
 *   „(35,00)"   скоби — англосаксонската норма, и НЕ е печатна грешка
 *   „35,00 DR"  буквен признак (DR/CR), среща се в износи за счетоводство
 *
 * Валутата се ПОДАВА и не се гадае: „1,234" е 1234 на долар и 1,234 на евро.
 * Тя е избрана при регистрация и се знае (правило 3).
 */
export function sumaSaZnak(surovo: string, v: Valuta = EVRO): number {
  let t = surovo.trim();
  if (t === '') throw new GreshkaKarta('Празна клетка за сума.');
  let znak = 1;
  // скоби
  if (/^\(.*\)$/.test(t)) {
    znak = -1;
    t = t.slice(1, -1);
  }
  // буквен признак — маха се СЛЕД скобите, за да мине и „(35,00 DR)"
  const bukvi = /\s*(DR|CR|Д|К)\s*$/i.exec(t);
  if (bukvi) {
    if (/^(DR|Д)$/i.test(bukvi[1]!)) znak = -1;
    t = t.slice(0, bukvi.index);
  }
  const suma_st = otSuma(t, v);
  return znak * suma_st;
}

export interface RedOtKarta {
  readonly klyuch: string;
  readonly data: string;
  readonly posoka: 'prihod' | 'razhod';
  /** ВИНАГИ положителна · знакът е в посоката */
  readonly suma_st: number;
  readonly koy: string;
  readonly dokument: string;
  /** салдото по картата СЛЕД реда · следа, НЕ влиза в сбор */
  readonly saldoSled_st: number;
}

/**
 * КЛЮЧЪТ НА ЕДИН РЕД · стабилен, от съдържанието.
 *
 * ПОСОКАТА Е В КЛЮЧА, и това не е излишно: 35,00 навън и 35,00 навътре при
 * същия търговец на същия ден са ДВЕ различни неща (плащане и връщане). Без
 * посоката в ключа второто минава за дубъл на първото и изчезва.
 *
 * Референцията бие всичко, когато я има — тя е номерът на самата банка.
 * Иначе ключът е от датата, търговеца, посоката и сумата, свито и в NFC:
 * ключ от суров файл се разминава при NFD-клавиатура и ражда дубъл вместо
 * съвпадение (правило 12, платено веднъж в `razchitane.ts`).
 */
export function klyuchNaLichnoDvizhenie(r: {
  dokument: string;
  data: string;
  koy: string;
  posoka: string;
  suma_st: number;
}): string {
  const ref = r.dokument.trim();
  if (ref !== '') return `ref:${ref.toLowerCase().normalize('NFC')}`;
  const koy = r.koy.trim().toLowerCase().normalize('NFC');
  return `red:${r.data}|${koy}|${r.posoka}|${r.suma_st}`;
}

export interface SnimkaNaKarta {
  readonly ime: string;
  readonly otpechatak: string;
  readonly redove: readonly RedOtKarta[];
  readonly propusnati: readonly { readonly red: number; readonly zashto: string }[];
  /** ОБХВАТЪТ · от най-ранната до най-късната разчетена дата */
  readonly ot: string;
  readonly do: string;
}

/**
 * ЧЕТЕ ЕДИН ЛИСТ · ред по ред, и пропуснатото се БРОИ.
 *
 * Неразчетеният ред не се преглъща и не спира партидата: той влиза в
 * `propusnati` с причина, а човекът вижда числото. Файл, от който тихо са
 * паднали три реда, е по-опасен от файл, който отказва да се прочете.
 */
export function prochetiKarta(n: {
  tablitsa: Tablitsa;
  ime: string;
  otpechatak: string;
  valuta?: Valuta;
}): SnimkaNaKarta {
  const v = n.valuta ?? EVRO;
  const k = koloniNaKartata(n.tablitsa);
  const redove: RedOtKarta[] = [];
  const propusnati: { red: number; zashto: string }[] = [];
  const vidyani = new Map<string, number>();

  for (let i = k.glava + 1; i < n.tablitsa.redove.length; i++) {
    const red = n.tablitsa.redove[i]!;
    const kletka = (j: number) => (j >= 0 ? (red[j] ?? '').trim() : '');
    try {
      const data = dataOtKletka(kletka(k.data));
      const { posoka, suma_st } = posokaOtRed(
        { suma: kletka(k.suma), debit: kletka(k.debit), kredit: kletka(k.kredit) },
        v,
      );
      const koy = kletka(k.opisanie);
      const dokument = kletka(k.referentsiya);
      const osnoven = klyuchNaLichnoDvizhenie({ dokument, data, koy, posoka, suma_st });
      // Втори ЕДНАКЪВ ред в СЪЩИЯ файл е втори истински разход (две кафета за
      // 3,50 в един ден). Получава свой номер, вместо да презапише първия.
      const povtoreno = (vidyani.get(osnoven) ?? 0) + 1;
      vidyani.set(osnoven, povtoreno);
      let saldoSled_st = 0;
      if (k.saldo >= 0 && kletka(k.saldo) !== '') {
        try {
          saldoSled_st = sumaSaZnak(kletka(k.saldo), v);
        } catch {
          saldoSled_st = 0; // салдото е следа, не мярка — липсата му не вали реда
        }
      }
      redove.push({
        klyuch: povtoreno === 1 ? osnoven : `${osnoven}#${povtoreno}`,
        data,
        posoka,
        suma_st,
        koy,
        dokument,
        saldoSled_st,
      });
    } catch (err) {
      propusnati.push({ red: i + 1, zashto: err instanceof Error ? err.message : String(err) });
    }
  }

  const dati = redove.map((r) => r.data).sort();
  return Object.freeze({
    ime: n.ime,
    otpechatak: n.otpechatak,
    redove: Object.freeze(redove),
    propusnati: Object.freeze(propusnati),
    ot: dati[0] ?? '',
    do: dati.at(-1) ?? '',
  });
}

/**
 * ПОСОКАТА НА ЕДИН РЕД · трите начина, по които банката я казва.
 *
 * Двете колони бият една със знак: когато банката дава дебит и кредит
 * поотделно, тя вече е решила, и гадаене по знак само може да сбърка.
 */
export function posokaOtRed(
  kletki: { suma: string; debit: string; kredit: string },
  v: Valuta = EVRO,
): { readonly posoka: 'prihod' | 'razhod'; readonly suma_st: number } {
  const imaDvete = kletki.debit !== '' || kletki.kredit !== '';
  if (imaDvete) {
    if (kletki.debit !== '' && kletki.kredit !== '') {
      throw new GreshkaKarta('Редът има число и в „Дебит", и в „Кредит" — не се разчита кое е.');
    }
    const razhod = kletki.debit !== '';
    const suma_st = Math.abs(sumaSaZnak(razhod ? kletki.debit : kletki.kredit, v));
    if (suma_st === 0) throw new GreshkaKarta('Сумата е нула.');
    return Object.freeze({ posoka: razhod ? ('razhod' as const) : ('prihod' as const), suma_st });
  }
  const sas = sumaSaZnak(kletki.suma, v);
  if (sas === 0) throw new GreshkaKarta('Сумата е нула.');
  return Object.freeze({
    posoka: sas < 0 ? ('razhod' as const) : ('prihod' as const),
    suma_st: Math.abs(sas),
  });
}

export interface Povtoren {
  readonly klyuch: string;
  readonly fayl: string;
  readonly suma_st: number;
}

export interface SlyataKarta {
  readonly redove: readonly RedOtKarta[];
  readonly propusnati: readonly { readonly red: number; readonly zashto: string }[];
  readonly povtoreni: readonly Povtoren[];
  readonly izvori: readonly string[];
  readonly ot: string;
  readonly do: string;
}

/**
 * СЛЕПВА НЯКОЛКО ИЗВЛЕЧЕНИЯ · и разликата пак е ФАЙЛЪТ.
 *
 * Същият закон като при `sleiSnimki` (и същият дефект, платен там):
 *
 *   в СЪЩИЯ файл  → два истински реда, вторият вече носи свой номер
 *   в ДРУГ файл   → ЕДИН ред, донесен два пъти · брои се веднъж и се КАЗВА
 *
 * Тук случаят е още по-чест: препокриващи се извлечения са НОРМАТА, не
 * изключението — човек тегли „последните 90 дни" всеки месец.
 *
 * ОБХВАТЪТ е обединението на обхватите, не сечението: гледано е навсякъде,
 * докъдето стига който и да е от файловете.
 */
export function sleiIzvlecheniya(snimki: readonly SnimkaNaKarta[]): SlyataKarta {
  const redove: RedOtKarta[] = [];
  const propusnati: { red: number; zashto: string }[] = [];
  const povtoreni: Povtoren[] = [];
  /** ключ → отпечатъкът на файла, който го е донесъл пръв */
  const vidyani = new Map<string, string>();

  for (const s of snimki) {
    for (const r of s.redove) {
      const otKoyFayl = vidyani.get(r.klyuch);
      if (otKoyFayl === undefined) {
        vidyani.set(r.klyuch, s.otpechatak);
        redove.push(r);
      } else if (otKoyFayl !== s.otpechatak) {
        povtoreni.push({ klyuch: r.klyuch, fayl: s.ime, suma_st: r.suma_st });
      } else {
        let n = 2;
        while (vidyani.has(`${r.klyuch}#${n}`)) n++;
        vidyani.set(`${r.klyuch}#${n}`, s.otpechatak);
        redove.push({ ...r, klyuch: `${r.klyuch}#${n}` });
      }
    }
    propusnati.push(...s.propusnati);
  }

  const dati = redove.map((r) => r.data).sort();
  return Object.freeze({
    redove: Object.freeze(redove),
    propusnati: Object.freeze(propusnati),
    povtoreni: Object.freeze(povtoreni),
    izvori: Object.freeze(snimki.map((s) => s.otpechatak)),
    ot: dati[0] ?? '',
    do: dati.at(-1) ?? '',
  });
}

/**
 * КАКВО КАЗВА САМИЯТ ФАЙЛ, ЧЕ Е МРЪДНАЛО · третата, НЕЗАВИСИМА мярка.
 *
 * Всички други сверки сравняват НАШ сбор с НАШ сбор — двете страни четат един
 * и същ файл през един и същ четец, тъй че изяден ред пада еднакво от двете и
 * разликата е нула по алгебра. Салдото е ЧУЖДО твърдение: банката сама казва
 * колко е било преди и колко след.
 *
 * Връща `null`, когато файлът няма колона „Салдо" — тогава мярка просто няма,
 * а измислена нула би изглеждала като проверена.
 */
export function saldoNaFayla(redove: readonly RedOtKarta[]): number | null {
  const sas = redove.filter((r) => r.saldoSled_st !== 0);
  if (sas.length < 2) return null;
  const podredeni = [...sas].sort((a, b) => a.data.localeCompare(b.data) || a.klyuch.localeCompare(b.klyuch));
  const parvo = podredeni[0]!;
  const posledno = podredeni.at(-1)!;
  // Първият ред вече е приложен към салдото си — затова се вади самият той.
  const predi = parvo.saldoSled_st - (parvo.posoka === 'prihod' ? parvo.suma_st : -parvo.suma_st);
  return posledno.saldoSled_st - predi;
}
