/**
 * ДОКУМЕНТИТЕ · закачени за разхода, делото и имота (резен 17б).
 *
 * ═══ НЕГОВИТЕ ДУМИ ═══
 *
 * Планът: „фактурата закачена за разхода". А от 05.08 *(р48·[42])*:
 *
 *   „На нивото на проекта дай линк към папката с проекта, а за всяка задача дай
 *    в мястото за линк връзка с документ ако има нужда задачата от такъв."
 *
 * Обхватът е ТРИ места — негов избор (28.08): разход · дело · имот. Един
 * механизъм, три викащи; три отделни решения щяха да се разминат при първата
 * поправка.
 *
 * ═══ ФАЙЛЪТ НЕ ВЛИЗА. ВЛИЗА ОТПЕЧАТЪКЪТ МУ ═══
 *
 * Двете му правила за файловете са най-твърдите, които е давал:
 *
 *   „Никакъв файл без изрично разрешение за конкретния файл." *(р89·[20])*
 *   „Да, без качване" · само ЧЕТЕНЕ *(р57·[110])*
 *
 * Затова тук няма нито един байт съдържание. Влиза същото, което `snimka.ts`
 * вече пази за източниците: име · големина · час на промяна · sha256. Това е
 * ДОКАЗАТЕЛСТВО кой файл е бил закачен, не копие от него. Оригиналът остава в
 * Драйва, където той го е сложил.
 *
 * И „изричното разрешение" не е надпис: файлът се избира ПООТДЕЛНО, през
 * прозорчето за избор. Нищо не се обхожда и нищо не се закача само.
 *
 * ═══ ЗАЩО СПИСЪК, А НЕ ЕДНО ПОЛЕ ═══
 *
 * Един разход носи фактурата И платежното; понякога и протокол. Едно поле би
 * оставило втората хартия без място — човек или подменя първата, или я държи
 * извън програмата. И двете са загуба на следа.
 *
 * ═══ ЗАЩО СВОЯ СЪЩНОСТ, А НЕ ПОЛЕ НА РАЗХОДА ═══
 *
 * Разходите идват от ВНЕСЕН файл (`klyuch` · `izvor`). Закачено като поле на
 * разхода, прикачването щеше да се презапише при следващия внос на същия файл —
 * тихо, и точно тогава, когато никой не гледа. Отделната същност преживява
 * всеки повторен внос.
 *
 * ═══ МАХАНЕТО Е ЗАПИС, НЕ ТРИЕНЕ ═══
 *
 * Пише се списъкът БЕЗ него; Журналът пази всяка предишна версия (правило 1).
 * Последният запис за същността бие — както при правата и при лентата.
 */

export class GreshkaDokument extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaDokument';
  }
}

/** Към какво се закача · изброено поименно, не се открива от данните. */
const KAM_KAKVO = ['razhod', 'delo', 'imot', 'prodazhba'] as const;

export type KamKakvo = (typeof KAM_KAKVO)[number];

export const IMENA_NA_KAM: Readonly<Record<KamKakvo, string>> = Object.freeze({
  razhod: 'разход',
  delo: 'дело',
  imot: 'имот',
  // ЧЕТВЪРТИЯТ · негово, 29.08: „информацията за плащанията по банка от ПД…
  // ще е в фолдър който ще се чете от ПДФ или друго, където ще пише какви са
  // вноските името и друга нужна информация."
  prodazhba: 'продажба',
});

/**
 * ВИДОВЕТЕ ДОКУМЕНТ · пет, изброени поименно.
 *
 * Нов вид се добавя ТУК, където се вижда — свободният текст щеше да роди
 * „фактура", „Фактура" и трета, изписана с латинско „а" накрая, в един и същ
 * Журнал (правило 11). Третата не се ПИШЕ дори за пример: `tests/imena.test.ts`
 * я лови и в коментар, и е право — обход, който прощава на примера, прощава и
 * на грешката.
 */
const VIDOVE_DOKUMENT = ['faktura', 'platezhno', 'protokol', 'dogovor', 'drugo'] as const;

export type VidDokument = (typeof VIDOVE_DOKUMENT)[number];

export const VIDOVE: readonly VidDokument[] = Object.freeze([...VIDOVE_DOKUMENT]);

export const IMENA_NA_VIDOVETE_DOKUMENT: Readonly<Record<VidDokument, string>> = Object.freeze({
  faktura: 'фактура',
  platezhno: 'платежно',
  protokol: 'протокол',
  dogovor: 'договор',
  drugo: 'друго',
});

/** Един закачен документ · доказателство за файл, не самият файл. */
export interface Dokument {
  /** името на файла, както го дава дискът */
  readonly ime: string;
  /** големина в БАЙТОВЕ · цяло число, както всяка мярка (правило 3 по дух) */
  readonly golemina: number;
  /** ISO на последната промяна — часът, който дискът казва */
  readonly promenen: string;
  /** sha256 на суровите байтове · ТОЙ е ключът на документа */
  readonly otpechatak: string;
  readonly vid: VidDokument;
  /**
   * ВРЪЗКАТА КЪМ ДРАЙВА · ПО ИЗБОР, и празното е нормалното.
   *
   * Офлайн изданието няма Драйв, значи няма и връзка. Отпечатъкът пак работи:
   * той доказва КОЙ файл е бил закачен, без да го отваря. Липсата се КАЗВА на
   * екрана (правило 15), а не се преглъща.
   */
  readonly vrazka: string;
}

/** Какво стои закачено за ЕДИН запис. */
export interface ZakacheniDokumenti {
  readonly kam: KamKakvo;
  readonly id: string;
  readonly dokumenti: readonly Dokument[];
}

/** Същността в Журнала · един дом за адреса (правило 17). */
export function sashtnostNaDokumenti(kam: KamKakvo, id: string): string {
  return `DOK:${kam}:${id}`;
}

/** Ключът в картата на Огледалото · СЪЩАТА двойка, същият дом. */
export function klyuchNaDokumenti(kam: KamKakvo, id: string): string {
  return `${kam}|${id}`;
}

/** Празното начало · запис без нито един документ. Не е липса, а състояние. */
export function bezDokumenti(kam: KamKakvo, id: string): ZakacheniDokumenti {
  proveriAdresa(kam, id);
  return Object.freeze({ kam, id, dokumenti: Object.freeze([]) });
}

function proveriAdresa(kam: KamKakvo, id: string): void {
  if (!(KAM_KAKVO as readonly string[]).includes(kam)) {
    throw new GreshkaDokument(`Няма такова място за закачане: „${kam}".`);
  }
  if (id.trim() === '') {
    throw new GreshkaDokument('Документът се закача за ЗАПИС — без него няма адрес.');
  }
}

/**
 * Прави документ от избраното и веднага го проверява.
 *
 * ОТКАЗВА ГЛАСНО при празно име, празен отпечатък, отрицателна големина и
 * непознат вид. По-добре отказ сега, отколкото ред в Журнала, който сочи
 * никъде.
 */
export function napraviDokument(n: {
  readonly ime: string;
  readonly golemina: number;
  readonly promenen: string;
  readonly otpechatak: string;
  readonly vid: VidDokument;
  readonly vrazka?: string;
}): Dokument {
  const ime = n.ime.trim().replace(/\s+/g, ' ');
  if (ime === '') throw new GreshkaDokument('Документът иска име — по него се познава.');
  const otpechatak = n.otpechatak.trim();
  if (otpechatak === '') {
    throw new GreshkaDokument('Без отпечатък няма доказателство КОЙ файл е закачен.');
  }
  if (!Number.isSafeInteger(n.golemina) || n.golemina < 0) {
    throw new GreshkaDokument(`Големината е цели байтове от нула нагоре; получено: ${n.golemina}`);
  }
  if (!(VIDOVE_DOKUMENT as readonly string[]).includes(n.vid)) {
    throw new GreshkaDokument(`Няма такъв вид документ: „${n.vid}".`);
  }
  return Object.freeze({
    ime,
    golemina: n.golemina,
    promenen: n.promenen,
    otpechatak,
    vid: n.vid,
    vrazka: (n.vrazka ?? '').trim(),
  });
}

/**
 * ЗАКАЧА документ · ОТПЕЧАТЪКЪТ е ключът, не името.
 *
 * Същият файл, избран два пъти, дава ЕДИН запис — и вторият път ПОПРАВЯ първия
 * (нов вид, нова връзка), вместо да роди близнак. Име като ключ щеше да сбърка:
 * „скан.pdf" се казват десет различни файла, а един и същ файл се преименува.
 */
export function sZakachen(z: ZakacheniDokumenti, d: Dokument): ZakacheniDokumenti {
  const bez = z.dokumenti.filter((x) => x.otpechatak !== d.otpechatak);
  return Object.freeze({ ...z, dokumenti: Object.freeze([...bez, d]) });
}

/** МАХА по отпечатък · връща НОВ списък; старият остава в Журнала. */
export function bezDokument(z: ZakacheniDokumenti, otpechatak: string): ZakacheniDokumenti {
  return Object.freeze({
    ...z,
    dokumenti: Object.freeze(z.dokumenti.filter((x) => x.otpechatak !== otpechatak)),
  });
}

/**
 * „Смени ли се нещо изобщо" · за сравнение ПРЕДИ запис, НЕ за `opId`.
 *
 * Същата работа като `belegNaModel` и `belegNaPravo`, и същата причина да не
 * става за ключ: закачи → махни → закачи връща старото съдържание, и повторен
 * ключ от него би върнал стария резултат, а документът щеше да остане махнат
 * (правило 20).
 */
export function belegNaDokumentite(z: ZakacheniDokumenti): string {
  return [...z.dokumenti]
    .map((d) => `${d.otpechatak}:${d.vid}:${d.vrazka}`)
    .sort()
    .join('|');
}

/** Колко байта тежат закачените · броят се, не се усещат. */
export function brutoNaDokumentite(z: ZakacheniDokumenti): number {
  return z.dokumenti.reduce((s, d) => s + d.golemina, 0);
}

/**
 * ЕДНО ИЗРЕЧЕНИЕ ЗА ЕКРАНА · и нулата се КАЗВА.
 *
 * Празният ред не бива да мълчи: „няма закачени" е различно от „не е питано".
 */
export function sDumiDokumentite(z: ZakacheniDokumenti): string {
  if (z.dokumenti.length === 0) return 'няма закачени документи';
  const poVid = new Map<VidDokument, number>();
  for (const d of z.dokumenti) poVid.set(d.vid, (poVid.get(d.vid) ?? 0) + 1);
  return [...poVid.entries()]
    .map(([vid, broy]) => `${broy} × ${IMENA_NA_VIDOVETE_DOKUMENT[vid]}`)
    .join(' · ');
}
