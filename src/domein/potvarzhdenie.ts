/**
 * ПОТВЪРЖДЕНИЕТО С ИМЕЙЛ · честна спирачка, не ключалка (И94 т.1).
 *
 * Негови думи: „поискване на потвърждение с имейл. С имейл се потвърждават и
 * Уменията и задачите."
 *
 * ЧЕСТНО ЗА КАКВО СТАВА ДУМА. Приложението няма сървър (ADR-001). Значи то
 * не може да ПОЛУЧИ писмо и да провери, че е стигнало. Каквото може, е:
 *
 *   1. да направи код и да го сложи САМО в писмото — не на екрана;
 *   2. да пази ОТПЕЧАТЪКА на кода, не самия код;
 *   3. да приеме потвърждение само когато въведеното даде същия отпечатък.
 *
 * Това доказва достъп до пощенския клиент — и толкова. Онзи, който държи
 * устройството отключено, вижда и черновата. Затова тук пише „спирачка":
 * тя лови НЕВОЛНОТО (чужд агент пуснат по невнимание, задача, потвърдена
 * без да се погледне), както заявката за плана лови неволната грешка
 * (`CLAUDE.md` · Продуктите). Нарочна измама иска сървър — и това е казано
 * на екрана, не скрито в код.
 *
 * КОДЪТ НЕ ВЛИЗА В ЖУРНАЛА. В Журнала влиза само СЛЕДАТА: какво е
 * потвърдено, до кой имейл е пратено писмото и кога. Тайна, записана
 * завинаги в дневник само за добавяне, е тайна, изгубена завинаги.
 */

export class GreshkaPotvarzhdenie extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPotvarzhdenie';
  }
}

/** Какво се потвърждава. Изброено ПОИМЕННО — по едно писмо за всяко. */
export const ZA_KAKVO = ['pusnati-agent', 'umenie', 'zadacha'] as const;

export type ZaKakvo = (typeof ZA_KAKVO)[number];

export const IMENA_ZA_KAKVO: Readonly<Record<ZaKakvo, string>> = Object.freeze({
  'pusnati-agent': 'пускане на агент',
  umenie: 'умение',
  zadacha: 'задача',
});

/** Колко живее едно потвърждение · след това не се приема. */
export const ZHIVOT_V_MINUTI = 15;

export interface Iskane {
  readonly zaKakvo: ZaKakvo;
  /** какво точно · име на агент, умение или задача */
  readonly kakvo: string;
  /** до кой имейл тръгва писмото — отговорникът */
  readonly doImeyl: string;
  /** ОТПЕЧАТЪКЪТ на кода · самият код живее само в писмото */
  readonly otpechatak: string;
  /** ISO време на искането */
  readonly kogato: string;
}

/**
 * ШЕСТ ЦИФРИ · четими по телефона, преписваеми без грешка.
 *
 * Взимат се от `crypto.getRandomValues`, не от `Math.random`: вторият е
 * предвидим и няма работа никъде близо до потвърждение.
 */
export function napraviKod(sluchayni: (n: number) => Uint32Array): string {
  const [x] = sluchayni(1);
  return String((x ?? 0) % 1_000_000).padStart(6, '0');
}

/** Изчистеният код · интервали и тирета падат, за да не пречат при преписване. */
export function chistKod(surovo: string): string {
  return surovo.replace(/[\s-]/g, '');
}

/**
 * Сглобява искането. `sha` идва отвън — ядрото не знае как се смятат хешове
 * (същият порт като на Вратата).
 */
export async function poiskay(
  n: {
    readonly zaKakvo: ZaKakvo;
    readonly kakvo: string;
    readonly doImeyl: string;
    readonly kod: string;
    readonly kogato: string;
  },
  sha: (tekst: string) => Promise<string>,
): Promise<Iskane> {
  if (n.doImeyl.trim() === '') {
    throw new GreshkaPotvarzhdenie('Няма до кого да тръгне писмото — липсва имейл на отговорника.');
  }
  if (chistKod(n.kod).length !== 6) {
    throw new GreshkaPotvarzhdenie('Кодът е шест цифри.');
  }
  return Object.freeze({
    zaKakvo: n.zaKakvo,
    kakvo: n.kakvo,
    doImeyl: n.doImeyl.trim(),
    otpechatak: await sha(chistKod(n.kod)),
    kogato: n.kogato,
  });
}

/** Изтекло ли е искането · закъснялото потвърждение не важи. */
export function eIzteklo(i: Iskane, sega: string): boolean {
  const razlika = Date.parse(sega) - Date.parse(i.kogato);
  return !Number.isFinite(razlika) || razlika > ZHIVOT_V_MINUTI * 60_000;
}

/**
 * ПРОВЕРЯВА въведения код. Отказът е С ДУМИ, не с `false`: „изтекло" и
 * „сгрешено" искат различно действие от човека.
 */
export async function proveri(
  i: Iskane,
  vaveden: string,
  sega: string,
  sha: (tekst: string) => Promise<string>,
): Promise<void> {
  if (eIzteklo(i, sega)) {
    throw new GreshkaPotvarzhdenie(
      `Потвърждението е изтекло (живее ${ZHIVOT_V_MINUTI} минути). Поискай ново писмо.`,
    );
  }
  const otpechatak = await sha(chistKod(vaveden));
  if (otpechatak !== i.otpechatak) {
    throw new GreshkaPotvarzhdenie('Кодът не съвпада с изпратения. Виж писмото и опитай пак.');
  }
}

/**
 * ПИСМОТО · заглавие и тяло, готови за `mailto:`.
 *
 * Кодът е ТУК и никъде другаде на екрана — това е цялата идея. Писмото
 * казва и какво се потвърждава, за да не е кодът гол шестцифрен номер.
 */
export function pismoto(i: Iskane, kod: string): { readonly zaglavie: string; readonly tyalo: string } {
  return {
    zaglavie: `MasterBook · потвърждение за ${IMENA_ZA_KAKVO[i.zaKakvo]}`,
    tyalo: [
      `Потвърждаваш: ${IMENA_ZA_KAKVO[i.zaKakvo]} — „${i.kakvo}".`,
      '',
      `КОД: ${chistKod(kod)}`,
      '',
      `Кодът живее ${ZHIVOT_V_MINUTI} минути. Върни го в приложението, за да тръгне.`,
      'Ако не си искал това — не връщай кода и виж кой има достъп до устройството.',
    ].join('\n'),
  };
}

/** Следата, която ВЛИЗА в Журнала · кодът в нея го няма. */
export interface SledaOtPotvarzhdenie {
  readonly zaKakvo: ZaKakvo;
  readonly kakvo: string;
  readonly doImeyl: string;
  readonly kogato: string;
}

export function sledata(i: Iskane, kogato: string): SledaOtPotvarzhdenie {
  return Object.freeze({
    zaKakvo: i.zaKakvo,
    kakvo: i.kakvo,
    doImeyl: i.doImeyl,
    kogato,
  });
}
