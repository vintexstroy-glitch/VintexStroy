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
export type Nachin = 'dostavchik' | 'klyuch';

/**
 * РОЛЯТА на един влязъл имейл. Само в плановете, които позволяват
 * `roli-za-dostap`; в Личния има един и той е стопанинът.
 *
 * Ролята казва какво може В ПРИЛОЖЕНИЕТО. Дали човекът изобщо стига дотук —
 * това го решава доставчикът, не ние.
 */
export type Rolya = 'stopanin' | 'redaktor' | 'nablyudatel';

export const IMENA_NA_ROLITE: Readonly<Record<Rolya, string>> = Object.freeze({
  stopanin: 'стопанин',
  redaktor: 'редактира',
  nablyudatel: 'наблюдава',
});

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
  /** през доставчика ли влезе, или с ключа на машината */
  readonly nachin: Nachin;
  /** какво може В ПРИЛОЖЕНИЕТО; стопанинът е този, чието е хранилището */
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

/** Може ли да пише. Наблюдателят гледа и сваля, но не мърда Журнала. */
export function mozheDaRedaktira(koj: Samolichnost): boolean {
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
