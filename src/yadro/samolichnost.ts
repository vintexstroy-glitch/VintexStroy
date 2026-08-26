/**
 * САМОЛИЧНОСТТА · вход БЕЗ ПАРОЛА през тримата доставчици.
 *
 * Това затваря П3 — въпросът, който стоеше отворен от началото. Отговорът е
 * негов, дословно: „Има нормален, какъвто е нашият, от безплатен акаунт в
 * Gmail или Microsoft, или Apple. С него влизаш БЕЗ ПАРОЛА и даваш достъп до
 * хранилище. Ако имаш нужда от мащаб, плащаш и на Google, Microsoft и Apple."
 *
 * Три следствия, които определят целия дизайн:
 *
 *   1. Приложението НИКОГА не вижда парола. Няма своя парола, няма възстановяване
 *      на парола, няма какво да изтече. Самоличността идва отвън.
 *   2. Хранилището е НЕГОВОТО, при неговия доставчик. Мащабът се плаща на Google,
 *      Microsoft или Apple — не на нас. Ние не сме хостинг.
 *   3. `actor` в събитията става истински имейл. Дотук беше низ по подразбиране;
 *      от днес Журналът знае КОЙ е писал.
 *
 * Тук стои само ПОРТЪТ. Истинският OAuth иска регистрация на приложението при
 * тримата и публичен адрес — идва, когато собственикът каже с кого се почва.
 * Портът стои отсега, за да не се появи после втори вход отстрани.
 */

export type Dostavchik = 'google' | 'microsoft' | 'apple';

/**
 * КАК влиза човек. Две пътеки, и нито една от тях не е парола — снимката, която
 * собственикът прати (настройките на едно живо приложение), показва точно този
 * модел: „You have not set up a password for your account" · „Passkeys: you have
 * 1 active passkey" · „Third Party Accounts: link your accounts to sign in".
 *
 *   `dostavchik` — през Google, Microsoft или Apple. Първият вход е винаги този.
 *   `klyuch`     — passkey на самата машина (WebAuthn: пръст, лице, ПИН).
 *                  Не е втора парола, а ключ, който не напуска устройството —
 *                  няма какво да се изпише в чужд екран и няма какво да изтече.
 *
 * Паролата отсъства НАРОЧНО и това е свойство, не пропуск: каквото го няма,
 * не се краде, не се забравя и не се възстановява по имейл.
 */
type Nachin = 'dostavchik' | 'klyuch' | 'parola';

/**
 * ПАРОЛАТА · изричен, ИНФОРМИРАН избор — не подразбиране.
 *
 * Негови думи: „За паролата става **информиран избор с информиран текст** за
 * тези, които го избират."
 *
 * Затова правило 13 не пада, а се СТЕСНЯВА: по подразбиране парола няма;
 * появява се само когато човек я поиска, след като е прочел какво поема.
 * Кой я поема — това е неговото право, но да я поеме НЕЗНАЕЙКИ, не е.
 *
 * Текстът е тук, а не в екрана, защото е част от решението: смени ли се,
 * сменя се обещанието към човека, и това трябва да се вижда в git.
 */
export const TEKST_ZA_PAROLATA = [
  'Приложението не пази парола никъде и не може да ти я върне.',
  'Забравиш ли я на устройство БЕЗ облак, Журналът остава заключен завинаги —',
  'няма имейл за възстановяване, защото няма кой да го изпрати.',
  'Ключът на устройството (пръст, лице или ПИН) прави същото, без този риск.',
].join(' ');

/**
 * РОЛЯТА на един влязъл имейл. Само в плановете, които позволяват
 * `roli-za-dostap`; в Личния има един и той е СОБСТВЕНИКЪТ.
 *
 * Ролята казва какво може В ПРИЛОЖЕНИЕТО. Дали човекът изобщо стига дотук —
 * това го решава доставчикът, не ние.
 *
 * ДУМАТА Е НЕГОВА · „Собственик". Дотук тук пишеше „стопанин" — дума, която
 * НЕ се среща в нито един негов ред, а беше плъзнала в осем файла. Кодът и
 * `docs/` говорят на един език (CLAUDE.md, шапката); измислен синоним прави
 * точно превода, в който се губи смисъл.
 */
export type Rolya = 'sobstvenik' | 'redaktor' | 'nablyudatel';

export const IMENA_NA_ROLITE: Readonly<Record<Rolya, string>> = Object.freeze({
  sobstvenik: 'собственик',
  redaktor: 'редактира',
  nablyudatel: 'наблюдава',
});

/**
 * СТАРАТА ДУМА, която Журналът вече носи.
 *
 * Роля, записана преди преименуването, стои в събитие „СлужителЗаписан" като
 * `sobstvenik`. Журналът е само за добавяне — това събитие не се пипа и не се
 * преписва (правило 1). Затова ЧЕТЕНЕТО знае и двете, а писането — само
 * новата.
 *
 * Непозната роля НЕ става мълчаливо наблюдател: тя се връща както е, за да
 * гръмне при проверката, вместо тихо да раздаде по-малко права от истинските.
 */
const STARI_IMENA: Readonly<Record<string, Rolya>> = Object.freeze({
  stopanin: 'sobstvenik',
});

export function chetiRolya(zapisano: string): Rolya {
  return STARI_IMENA[zapisano] ?? (zapisano as Rolya);
}

/**
 * ДОСТЪПЪТ НА ДРУГИ ХОРА · и къде свършва нашата отговорност.
 *
 * Думата му: „Стартъпът е с добавяне на ДРУГИ ИМЕЙЛИ за достъп от съответната
 * поща, и СИГУРНОСТТА ЗА ТОВА НЕ Е В НАС."
 *
 * Значи: собственикът споделя своята папка при СВОЯ доставчик с други имейли —
 * през тяхното споделяне, тяхната двуфакторна защита, тяхното отнемане на
 * достъп. Приложението не пази чужди пароли, не кани хора, не отнема достъп.
 * То вижда онзи, когото доставчикът е пуснал, и записва имейла му като `actor`.
 *
 * Това не е спестена работа, а взето решение: сигурността на входа стои при
 * онзи, който я прави професионално — и отговорността върви с нея.
 */

/** Какъв е акаунтът при доставчика — от него зависи мащабът, не функциите. */
export type VidHranilishte = 'безплатно' | 'платено';

export interface Samolichnost {
  readonly dostavchik: Dostavchik;
  /** имейлът; той е и `actor` в Журнала */
  readonly imeyl: string;
  readonly ime: string;
  readonly hranilishte: VidHranilishte;
  /** през доставчика ли влезе, с ключа на машината, или с изрично избрана парола */
  readonly nachin: Nachin;
  /**
   * ИМЕЙЛЪТ ЗА ВРЪЗКА · остава дори в напълно офлайн изданието.
   *
   * Негови думи: „Имейлът на създаващия първи главен акаунт остава за
   * комуникация, дори да е свалил офлайн цялото приложение."
   *
   * Той не е вход — входът е `nachin`. Той е адресът, на който човекът получава
   * фактурата си и по който може да се върне към акаунта си.
   */
  readonly imeylZaVrazka?: string;
  /** какво може В ПРИЛОЖЕНИЕТО; собственикът е този, чието е хранилището */
  readonly rolya: Rolya;
  /**
   * ДРУГИТЕ доставчици, вързани за същия имейл („Third Party Accounts" от
   * снимката). Влизаш с който ти е подръка, актьорът в Журнала е един и същ —
   * иначе един човек става двама в историята.
   */
  readonly svarzani: readonly Dostavchik[];
}

/** Има ли ключ на тази машина — от него зависи дали вторият вход е един жест. */
export function imaKlyuch(koj: Samolichnost): boolean {
  return koj.nachin === 'klyuch';
}

/**
 * Влиза ли с парола. Отговорът трябва да е „не" за всеки, който не я е избрал
 * ИЗРИЧНО — затова е функция, която се пита, а не поле, което се подразбира.
 */
export function sParola(koj: Samolichnost): boolean {
  return koj.nachin === 'parola';
}

/**
 * Може ли да пише. Наблюдателят гледа и сваля, но не мърда Журнала.
 *
 * Иска само РОЛЯТА, не цялата самоличност: колонното право пита същото за
 * колона (`kolonno.ts`), а един факт живее на едно място (правило 17).
 */
export function mozheDaRedaktira(koj: { readonly rolya: Rolya }): boolean {
  return koj.rolya !== 'nablyudatel';
}

export const IMENA_NA_DOSTAVCHITSITE: Readonly<Record<Dostavchik, string>> = Object.freeze({
  google: 'Google',
  microsoft: 'Microsoft',
  apple: 'Apple',
});

/**
 * Портът на входа. Три метода, нито един от които не приема парола —
 * и това не е удобство, а свойство: каквото го няма, не може да изтече.
 */
export interface VhodBezParola {
  vlez(dostavchik: Dostavchik): Promise<Samolichnost>;
  izlez(): Promise<void>;
  /** Кой е влязъл сега; `null` — никой. */
  tekushta(): Samolichnost | null;
}

export class GreshkaVhod extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaVhod';
  }
}

/**
 * Днешното поведение: един собственик, вече влязъл. Държи мястото на истинския
 * OAuth, без да се преструва на него — затова `vlez` с друг доставчик отказва
 * с думи, вместо да върне измислена самоличност.
 */
export class EdinSobstvenik implements VhodBezParola {
  #kojE: Samolichnost;

  constructor(kojE: Samolichnost) {
    this.#kojE = kojE;
  }

  async vlez(dostavchik: Dostavchik): Promise<Samolichnost> {
    // Вързан доставчик влиза за СЪЩИЯ имейл — един човек, един `actor`.
    const priznat =
      dostavchik === this.#kojE.dostavchik || this.#kojE.svarzani.includes(dostavchik);
    if (!priznat) {
      throw new GreshkaVhod(
        `${IMENA_NA_DOSTAVCHITSITE[dostavchik]} не е вързан за ${this.#kojE.imeyl}. ` +
          `Вържи го в Таблото или влез през ` +
          `${IMENA_NA_DOSTAVCHITSITE[this.#kojE.dostavchik]}.`,
      );
    }
    return this.#kojE;
  }

  /** Вързва втори доставчик за същия имейл — „Third Party Accounts". */
  svarzhi(dostavchik: Dostavchik): Samolichnost {
    if (dostavchik === this.#kojE.dostavchik || this.#kojE.svarzani.includes(dostavchik)) {
      return this.#kojE;
    }
    this.#kojE = { ...this.#kojE, svarzani: [...this.#kojE.svarzani, dostavchik] };
    return this.#kojE;
  }

  async izlez(): Promise<void> {
    // Един собственик, местно-първо: излизането не трие Журнала.
    // Затова тук няма какво да се прави — Журналът си остава на диска.
  }

  tekushta(): Samolichnost {
    return this.#kojE;
  }
}

/** За тестове: сменяема самоличност, без нищо външно. */
export class VhodVPametta implements VhodBezParola {
  #tekushta: Samolichnost | null = null;

  constructor(readonly poDostavchik: Readonly<Partial<Record<Dostavchik, Samolichnost>>>) {}

  async vlez(dostavchik: Dostavchik): Promise<Samolichnost> {
    const koj = this.poDostavchik[dostavchik];
    if (!koj) {
      throw new GreshkaVhod(
        `Няма акаунт при ${IMENA_NA_DOSTAVCHITSITE[dostavchik]} на тази машина.`,
      );
    }
    this.#tekushta = koj;
    return koj;
  }

  async izlez(): Promise<void> {
    this.#tekushta = null;
  }

  tekushta(): Samolichnost | null {
    return this.#tekushta;
  }
}
