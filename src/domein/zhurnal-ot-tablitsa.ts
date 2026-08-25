/**
 * ЖУРНАЛЪТ ОТ ТАБЛИЦА · новият файл се ЗАЛЕПВА за стария (И96 т.8).
 *
 * Негови думи, дословно:
 *
 *   „Журнала само от Настройки на стопанина и **не се трие пак**. Може през
 *    **таблица в ексела** дори създадена от приложението да се редактира и да
 *    се ъпдейтне когато се разшири периода назад и **да се отчете в Журнала за
 *    случая на промяна и дата на файла**… **Няма редакция, а НОВ ФАЙЛ ЗАЛЕПЕН
 *    ЗА СТАРИЯ** в журнала и в тайминга на журнала показани пак заедно,
 *    удобство за сверка да се виждат в журнала заедно **скачени с ТРЕТИ НОМЕР
 *    обединяващ и двата**, и да има права такъв номер в зависимост от броя
 *    редакции да се съединяват повече и показват на всичките места с новите
 *    надградени номерация **извън графата на нормалния ред**."
 *
 * ═══ КАКВО ЗНАЧИ ТОВА ЗА ЖУРНАЛА ═══
 *
 * Правило 1 не помръдва: нищо не се презаписва и нищо не се трие. „Редакция
 * през таблица" значи СВЕРЕНА ПРОМЯНА — сторно на стария запис плюс нов запис,
 * със следа (правило 9, дословно). Таблицата е УДОБСТВОТО, не входът: входът
 * пак е Вратата (правило 2).
 *
 * Затова този модул **НЕ ПИША НИЩО**. Той чете върнатата таблица, сравнява я с
 * Журнала ред по ред и връща ПРЕДЛОЖЕНИЕ: кое се е променило, какво ще стане и
 * какво се отказва. Записва човекът (правило 18).
 *
 * ═══ ТРЕТИЯТ НОМЕР ═══
 *
 * Файл №1 (изнесеният) и файл №2 (върнатият) получават ТРЕТИ номер, който ги
 * обединява. Той има СВОЯ номерация — „извън графата на нормалния ред", тоест
 * не е `seq` и не се меси със `seq`.
 *
 * При трета редакция свръзката не се преномерира, а се **НАДГРАЖДА**:
 * `С7` става `С7·2`. Сменен номер би направил всяко предишно цитиране невярно
 * — точно болестта, от която правило 17 пази. Номерът стои; поколението расте.
 */

import { kletka, svedenaGlava, type Tablitsa } from '../iztochnik/tablitsa.js';
import { kakvoPishe, otSuma, stotinki } from '../yadro/pari.js';
import type { KolonaNaLista, List } from '../iznos/excel.js';
import type { Sabitie } from '../yadro/index.js';

export class GreshkaTablitsa extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaTablitsa';
  }
}

// ══ 1 · СВРЪЗКАТА · третият номер ═══════════════════════════════════════════

/** Един файл в свръзката. Изнесеният е първи; всеки върнат се залепва за него. */
export interface FaylVSvrazka {
  /** своя номерация на файловете · НЕ е `seq` */
  readonly nomer: number;
  readonly ime: string;
  /**
   * ДАТАТА НА ФАЙЛА · негова, изрична: „дата на файла променен в таблицата".
   *
   * Различна от `kogato` НАРОЧНО, и по същата причина, по която сторното носи
   * две дати (И97): решаваш в понеделник, връщаш файла в четвъртък.
   * Счетоводството иска истинската дата, следата иска и двете.
   */
  readonly dataNaFayla: string;
  /** кога е записан в Журнала */
  readonly kogato: string;
  readonly actor: string;
  /** СЛУЧАЯТ на промяна · задължителен свободен текст */
  readonly sluchay: string;
  readonly redove: number;
  /** белег на съдържанието · два еднакви файла не правят две редакции */
  readonly otpechatak: string;
}

export interface Svrazka {
  /** ТРЕТИЯТ номер · обединяващият. Стои непроменен през целия живот. */
  readonly nomer: number;
  /**
   * ПОКОЛЕНИЕТО · 1 при два файла, 2 при три, и така нататък.
   *
   * Расте вместо номера. „Надградена номерация" — но надградена, не сменена:
   * сменен номер прави невярно всяко място, където старият е цитиран.
   */
  readonly pokolenie: number;
  readonly fayli: readonly FaylVSvrazka[];
}

/** Как се изписва свръзката · „С7" при първо поколение, „С7·2" нататък. */
export function pishiSvrazka(s: Svrazka): string {
  return s.pokolenie <= 1 ? `С${s.nomer}` : `С${s.nomer}·${s.pokolenie}`;
}

/**
 * ЗАПОЧВА свръзка от два файла · изнесения и върнатия.
 *
 * Отказва се с думи при по-малко от два: свръзка с един край не е свръзка —
 * тя изглежда като връзка и не е (същият урок като при номерата на колоните,
 * ADR-028).
 */
export function zapochniSvrazka(nomer: number, fayli: readonly FaylVSvrazka[]): Svrazka {
  if (!Number.isSafeInteger(nomer) || nomer <= 0) {
    throw new GreshkaTablitsa(`Номерът на свръзка е цяло число над нула; получено: ${nomer}`);
  }
  if (fayli.length < 2) {
    throw new GreshkaTablitsa(
      'Свръзка се прави от ДВА файла — изнесения и върнатия. Един файл не е свръзка.',
    );
  }
  return Object.freeze({ nomer, pokolenie: 1, fayli: Object.freeze([...fayli]) });
}

/**
 * ЗАЛЕПВА нов файл за свръзката · номерът стои, поколението расте.
 *
 * Еднакъв отпечатък значи „същият файл" и не прави ново поколение: повторно
 * качване на същата таблица не е редакция.
 */
export function zalepi(s: Svrazka, nov: FaylVSvrazka): Svrazka {
  if (s.fayli.some((f) => f.otpechatak === nov.otpechatak)) return s;
  return Object.freeze({
    nomer: s.nomer,
    pokolenie: s.pokolenie + 1,
    fayli: Object.freeze([...s.fayli, nov]),
  });
}

/**
 * ОТПЕЧАТЪКЪТ НА ФАЙЛА · само за въпроса „същият файл ли е това".
 *
 * НЕ Е `opId` и не заменя хеш-веригата. Той отговаря на едно-единствено нещо:
 * смени ли се съдържанието изобщо (правило 20). Качен втори път, същият файл
 * не прави второ поколение на свръзката.
 *
 * Дължина плюс разместващ се сбор: два файла с еднаква дължина и разменени
 * редове дават различни числа, защото всеки знак се умножава по мястото си.
 */
export function otpechatakNaFayla(tekst: string): string {
  let sbor = 0;
  for (let i = 0; i < tekst.length; i += 1) {
    sbor = (sbor * 31 + tekst.charCodeAt(i)) % 2_147_483_647;
  }
  return `${tekst.length}-${sbor.toString(16)}`;
}

/** Следващият свободен номер на свръзка · БРОИ се, не се гадае. */
export function sledvashtSvrazkaNomer(svrazki: readonly Svrazka[]): number {
  return svrazki.reduce((nay, s) => Math.max(nay, s.nomer), 0) + 1;
}

/**
 * КОЯ СВРЪЗКА НОСИ ТОЗИ ФАЙЛ · за тайминга на Журнала.
 *
 * „…в тайминга на журнала показани пак заедно" — редовете стоят на своите
 * дати, а свръзката е онова, което ги събира с поглед.
 */
export function svrazkaNaFayla(svrazki: readonly Svrazka[], nomer: number): Svrazka | undefined {
  return svrazki.find((s) => s.fayli.some((f) => f.nomer === nomer));
}

// ══ 2 · ИЗНОСЪТ · Журналът като ЧЕТИМА таблица ══════════════════════════════

/**
 * Главата на изнесената таблица.
 *
 * Двете последни колони са КОТВАТА: без тях върнатият файл не може да се
 * свърже ред по ред с Журнала и всяка редакция би била гадаене.
 */
export const GLAVA_NA_ZHURNALA: readonly string[] = Object.freeze([
  '№',
  'Кога',
  'Кой',
  'Какво',
  'Същност',
  'Описание',
  'Сума',
  'Ключ',
  'Отпечатък',
]);

/**
 * ЗАКЛЮЧЕНИТЕ колони · пипната заключена колона е ГРЕШКА, не поправка.
 *
 * Човек, който е сортирал таблицата в Ексел или е разбъркал реда, иначе би
 * произвел стотици „поправки" наведнъж. Заключената колона го хваща на входа
 * и го КАЗВА с думи, вместо да запише партида безсмислици.
 */
export const ZAKLYUCHENI: readonly string[] = Object.freeze([
  '№',
  'Кога',
  'Кой',
  'Какво',
  'Същност',
  'Ключ',
  'Отпечатък',
]);

/** Кои две колони СЕ редактират · и нищо друго. */
export const REDAKTIRUEMI: readonly string[] = Object.freeze(['Описание', 'Сума']);

/**
 * ПАРИТЕ на едно събитие · първото поле, което завършва на `_st`.
 *
 * Общо правило вместо таблица по вид събитие: таблицата се разминава с
 * `sabitiya.ts` при всяко ново събитие, а правилото — не. Полетата за пари
 * завършват на `_st` и Вратата го проверява (правило 3).
 */
export function parichnoPole(p: Readonly<Record<string, unknown>>): string {
  return Object.keys(p).find((k) => k.endsWith('_st') && typeof p[k] === 'number') ?? '';
}

/** Описанието на едно събитие · полето `opis`, когато го има. */
function opisnoPole(p: Readonly<Record<string, unknown>>): string {
  for (const k of ['opis', 'prichina', 'ime', 'adres']) {
    if (typeof p[k] === 'string') return k;
  }
  return '';
}

/** Как се чете едно събитие в клетка „Описание". */
export function opisanieNa(s: Sabitie): string {
  const k = opisnoPole(s.payload);
  return k === '' ? '' : String(s.payload[k]);
}

/** Сумата на едно събитие в цели стотинки; `undefined` значи „това не е пари". */
export function sumaNa(s: Sabitie): number | undefined {
  const k = parichnoPole(s.payload);
  return k === '' ? undefined : (s.payload[k] as number);
}

/**
 * ЖУРНАЛЪТ КАТО ЛИСТ · за Ексел, четимо.
 *
 * Не JSON: „през таблица в ексела дори създадена от приложението". Изнесеният
 * JSON (`vnos.ts`) остава за ВРЪЩАНЕ НА ЦЯЛ Журнал — друга работа, друг път.
 * Тази таблица е за ЧЕТЕНЕ и ПОПРАВКА от човек.
 */
export function listNaZhurnala(sabitiya: readonly Sabitie[], ime = 'ЖУРНАЛ'): List {
  const koloni: KolonaNaLista[] = GLAVA_NA_ZHURNALA.map((z) => ({
    ime: z,
    shirina: z === 'Описание' ? 34 : z === 'Ключ' || z === 'Отпечатък' ? 24 : 14,
  }));
  return {
    ime,
    koloni,
    redove: sabitiya.map((s) => {
      const suma = sumaNa(s);
      return [
        s.seq,
        s.ts,
        s.actor,
        s.type,
        `${s.sashtnost.vid}:${s.sashtnost.id}`,
        opisanieNa(s),
        suma === undefined ? '' : kakvoPishe(stotinki(suma)).replace(/ ?€$/, '').trim(),
        s.opId,
        s.hash.slice(0, 16),
      ];
    }),
  };
}

// ══ 3 · ВРЪЩАНЕТО · какво се е променило ════════════════════════════════════

/** Съдбата на един ред от върнатата таблица. Изброена поименно. */
export const SADBI = ['sasht', 'promenen', 'nov', 'lipsva', 'zaklyuchen'] as const;

type Sadba = (typeof SADBI)[number];

export const IMENA_NA_SADBITE: Readonly<Record<Sadba, string>> = Object.freeze({
  sasht: 'непипнат',
  promenen: 'променен · сторно и нов запис',
  nov: 'нов ред · НЕ влиза',
  lipsva: 'липсва във файла · НЕ се трие',
  zaklyuchen: 'пипната заключена колона · отказва се',
});

/** Една намерена промяна · вече проверена срещу Журнала. */
interface Promyana {
  readonly seq: number;
  readonly opId: string;
  /** коя колона е пипната · „Описание" или „Сума" */
  readonly kolona: string;
  readonly bilo: string;
  readonly stava: string;
  /** за „Сума" · новата стойност в цели стотинки */
  readonly stava_st?: number;
  /** името на полето в payload, което се мени */
  readonly pole: string;
}

/** Пипната заключена колона · казва се КОЯ и КАКВО е било. */
interface PipnatoZaklyucheno {
  readonly red: number;
  readonly seq: number;
  readonly kolona: string;
  readonly bilo: string;
  readonly stava: string;
}

export interface Predlozhenie {
  readonly promeni: readonly Promyana[];
  readonly sashti: number;
  /** редове във файла без ключ · казват се, не влизат */
  readonly novi: readonly number[];
  /** seq от Журнала, които файлът не е върнал · НЕ значи триене */
  readonly lipsvashti: readonly number[];
  readonly zaklyucheni: readonly PipnatoZaklyucheno[];
  /** приема ли се изобщо · false, щом има пипната заключена колона */
  readonly priema: boolean;
  /** СВЕРКА ВХОД↔ИЗХОД · разликата се връща дори когато е нула (правило 7) */
  readonly sverka: {
    readonly vhod: number;
    readonly izhod: number;
    readonly razlika: number;
  };
}

/** Намира главата на таблицата · тя е редът, който носи „ключ". */
function nameriGlavata(t: Tablitsa): { readonly red: number; readonly koloni: Map<string, number> } {
  for (let r = 0; r < Math.min(t.redove.length, 12); r += 1) {
    const glava = (t.redove[r] ?? []).map(svedenaGlava);
    if (!glava.includes('ключ')) continue;
    const koloni = new Map<string, number>();
    for (const ime of GLAVA_NA_ZHURNALA) {
      const i = glava.indexOf(svedenaGlava(ime));
      if (i >= 0) koloni.set(ime, i);
    }
    return { red: r, koloni };
  }
  throw new GreshkaTablitsa(
    'Във файла няма колона „Ключ". Върни таблицата, която „Изнеси Журнала като таблица" сваля — ' +
      'без ключа редовете не могат да се свържат с Журнала и всяка поправка би била гадаене.',
  );
}

/** Двете изписвания на едно число се сравняват като ЧИСЛА, не като текст. */
function sashtaSuma(a: string, b: string): boolean {
  const chislo = (t: string): number | undefined => {
    if (t.trim() === '') return undefined;
    try {
      return otSuma(t);
    } catch {
      return undefined;
    }
  };
  const x = chislo(a);
  const y = chislo(b);
  if (x === undefined || y === undefined) return a.trim() === b.trim();
  return x === y;
}

/**
 * СВЕРЯВА върнатата таблица с Журнала · и НЕ пише нищо.
 *
 * Четирите съдби и защо всяка е такава:
 *
 *   `sasht`      · нищо не е пипнато — нищо не става;
 *   `promenen`   · пипната редактируема колона — сторно + нов запис (правило 9);
 *   `nov`        · ред без ключ — КАЗВА се и НЕ влиза. Ново събитие се въвежда
 *                  през своя екран: свободно написан ред няма вид и същност, а
 *                  измисленият вид е по-лош от липсващия;
 *   `lipsva`     · ред от Журнала, който файлът не е върнал — КАЗВА се и НЕ
 *                  прави нищо. Изтрит ред в Ексел НЕ трие събитие (правило 1);
 *   `zaklyuchen` · пипната заключена колона — ЦЯЛОТО внасяне се отказва.
 *
 * Последното е строго нарочно: сортирана в Ексел таблица иначе би изглеждала
 * като стотици поправки. По-добре един отказ с думи, отколкото партида
 * безсмислици със следа.
 */
export function sveriTablitsata(sabitiya: readonly Sabitie[], t: Tablitsa): Predlozhenie {
  const { red: glavaRed, koloni } = nameriGlavata(t);
  for (const zadalzhitelna of ['№', 'Ключ', 'Описание', 'Сума']) {
    if (!koloni.has(zadalzhitelna)) {
      throw new GreshkaTablitsa(`Във файла липсва колона „${zadalzhitelna}".`);
    }
  }

  const poKlyuch = new Map(sabitiya.map((s) => [s.opId, s]));
  const promeni: Promyana[] = [];
  const novi: number[] = [];
  const zaklyucheni: PipnatoZaklyucheno[] = [];
  const vidyani = new Set<string>();
  let sashti = 0;
  let izhod = 0;

  const kletkata = (r: number, ime: string): string => {
    const i = koloni.get(ime);
    return i === undefined ? '' : kletka(t, r, i).trim();
  };

  for (let r = glavaRed + 1; r < t.redove.length; r += 1) {
    const opId = kletkata(r, 'Ключ');
    const prazenRed = GLAVA_NA_ZHURNALA.every((ime) => kletkata(r, ime) === '');
    if (prazenRed) continue;
    izhod += 1;

    if (opId === '') {
      novi.push(r + 1); // номер на реда, както го вижда човекът в Ексел
      continue;
    }
    const s = poKlyuch.get(opId);
    if (!s) {
      novi.push(r + 1); // ключ, който Журналът не познава — пак не влиза
      continue;
    }
    vidyani.add(opId);

    // ЗАКЛЮЧЕНИТЕ първо: пипната заключена колона отменя всичко останало.
    let zaklyuchenoRed = false;
    for (const ime of ZAKLYUCHENI) {
      if (!koloni.has(ime)) continue;
      const bilo = bilotoNa(s, ime);
      const stava = kletkata(r, ime);
      if (bilo === stava) continue;
      zaklyucheni.push({ red: r + 1, seq: s.seq, kolona: ime, bilo, stava });
      zaklyuchenoRed = true;
    }
    if (zaklyuchenoRed) continue;

    let pipnat = false;
    for (const ime of REDAKTIRUEMI) {
      const bilo = bilotoNa(s, ime);
      const stava = kletkata(r, ime);
      if (ime === 'Сума' ? sashtaSuma(bilo, stava) : bilo === stava) continue;

      const pole = ime === 'Сума' ? parichnoPole(s.payload) : opisnoPole(s.payload);
      if (pole === '') {
        // Събитие без такова поле · пипането му не е поправка, а грешка.
        zaklyucheni.push({ red: r + 1, seq: s.seq, kolona: ime, bilo, stava });
        pipnat = true;
        continue;
      }
      promeni.push({
        seq: s.seq,
        opId,
        kolona: ime,
        bilo,
        stava,
        pole,
        ...(ime === 'Сума' ? { stava_st: otSuma(stava) } : {}),
      });
      pipnat = true;
    }
    if (!pipnat) sashti += 1;
  }

  const lipsvashti = sabitiya.filter((s) => !vidyani.has(s.opId)).map((s) => s.seq);

  return Object.freeze({
    promeni: Object.freeze(promeni),
    sashti,
    novi: Object.freeze(novi),
    lipsvashti: Object.freeze(lipsvashti),
    zaklyucheni: Object.freeze(zaklyucheni),
    priema: zaklyucheni.length === 0,
    sverka: Object.freeze({ vhod: sabitiya.length, izhod, razlika: izhod - sabitiya.length }),
  });
}

/** Какво е стояло в тази клетка при износа · за сравнение с върнатото. */
function bilotoNa(s: Sabitie, kolona: string): string {
  switch (kolona) {
    case '№':
      return String(s.seq);
    case 'Кога':
      return s.ts;
    case 'Кой':
      return s.actor;
    case 'Какво':
      return s.type;
    case 'Същност':
      return `${s.sashtnost.vid}:${s.sashtnost.id}`;
    case 'Описание':
      return opisanieNa(s);
    case 'Сума': {
      const suma = sumaNa(s);
      return suma === undefined ? '' : kakvoPishe(stotinki(suma)).replace(/ ?€$/, '').trim();
    }
    case 'Ключ':
      return s.opId;
    case 'Отпечатък':
      return s.hash.slice(0, 16);
    default:
      return '';
  }
}

/**
 * НОВИЯТ PAYLOAD на една поправка · старият, с едно сменено поле.
 *
 * Всичко останало се пренася непокътнато: поправката на сума не бива да губи
 * бележката, а поправката на бележка — сумата.
 */
export function novPayload(
  s: Sabitie,
  p: Promyana,
): Readonly<Record<string, unknown>> {
  const stoynost = p.kolona === 'Сума' ? (p.stava_st ?? 0) : p.stava;
  return Object.freeze({ ...s.payload, [p.pole]: stoynost });
}

/**
 * ОТКАЗЪТ С ДУМИ · какво не се приема и защо, на един ред.
 *
 * Мълчаливият отказ прави внасяне, което „просто не работи". Тук пише КОЯ
 * колона, на КОЙ ред и какво е било.
 */
export function zashtoNeSePriema(p: Predlozhenie): string {
  if (p.priema) return '';
  const parvite = p.zaklyucheni
    .slice(0, 3)
    .map((z) => `ред ${z.red} · „${z.kolona}" (беше „${z.bilo}", стана „${z.stava}")`);
  return (
    `Заключени колони са пипнати на ${p.zaklyucheni.length} ${
      p.zaklyucheni.length === 1 ? 'място' : 'места'
    }: ${parvite.join(' · ')}` +
    (p.zaklyucheni.length > 3 ? ` и още ${p.zaklyucheni.length - 3}.` : '.') +
    ' Редактират се само „Описание" и „Сума". Ако таблицата е сортирана или разместена в Ексел, ' +
    'изнеси я наново и поправяй в свалената.'
  );
}
