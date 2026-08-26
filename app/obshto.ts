/**
 * ОБЩОТО НА ЕКРАНИТЕ · четирите помощника, които всички ползват.
 *
 * ЗАЩО СЕ ИЗНЕСЕ ОТТАМ, ОТКЪДЕТО БЕШЕ. Дотук те живееха в `app/imoti.ts` —
 * тоест В ЕДИН ЕКРАН. Седемнайсет модула внасяха от него, и почти всички
 * искаха само тези четири неща: екранът Табове внасяше от екрана Имоти, за
 * да екранира текст. Това е скрито обвързване: махне ли се Имоти утре или
 * се преименува, пада всичко, което няма нищо общо с имоти.
 *
 * Тук няма нито един ред за домейн и нито едно състояние. Затова и няма
 * посока на внасяне: този файл не знае за екрани, екраните знаят за него.
 */

/**
 * ДНЕШНИЯТ ДЕН · ISO, без час.
 *
 * Имаше го ДВА ПЪТИ под две имена — частно `dnes()` и изнесено `dnesKato()`,
 * което само го викаше. Двете имена за едно нещо са по-скъпи от преписания
 * израз: човек, който търси „кой казва кое е днес", намира двете и почва да
 * се пита каква е разликата.
 */
export function dnesKato(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Всичко, написано от човек, минава оттук, преди да влезе в HTML. */
export function ekraniraj(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * СВАЛЯНЕ НА ФАЙЛ · единственият дом на танца Blob → адрес → връзка → клик.
 * Беше преписан три пъти (в main два, в Стойност един) — три места за един теч.
 */
export function svaliFayl(fayl: Blob, ime: string): void {
  const adres = URL.createObjectURL(fayl);
  const vruzka = document.createElement('a');
  vruzka.href = adres;
  vruzka.download = ime;
  vruzka.click();
  URL.revokeObjectURL(adres);
}

/**
 * КОГА Е БИЛ ПОСЛЕДНИЯТ ИЗНОС · по Журнал, не общо.
 *
 * Живее в localStorage, не в Журнала — това е удобство на този браузър, не
 * факт от историята. Може и да го няма (частен прозорец, чистени данни).
 *
 * Ключът се ПОДАВА, защото Журналите вече са два: служебният и личният на
 * всеки служител. Един общ белег би казал „изнесен вчера" за Журнал, който
 * никога не е изнасян — а точно този ред е единственото напомняне, че без
 * облак износът е задължение (ADR-036 §10: „лекарството е износът").
 */
export interface BelegZaIznos {
  readonly kogato: string;
  readonly broi: number;
  readonly hash: string;
}

export function chetiBelegZaIznos(klyuch: string): BelegZaIznos | null {
  try {
    const surovo = localStorage.getItem(klyuch);
    return surovo ? (JSON.parse(surovo) as BelegZaIznos) : null;
  } catch {
    return null;
  }
}

export function zapishiBelegZaIznos(klyuch: string, beleg: BelegZaIznos): void {
  try {
    localStorage.setItem(klyuch, JSON.stringify(beleg));
  } catch {
    // Частен прозорец или забранени данни — износът пак стана, само не се помни.
  }
}

/**
 * БЕЗОПАСНО ИМЕ НА ФАЙЛ · един дом (правило 17).
 *
 * ИЗМЕРЕНО, не предположено: същият бутон с име „obrazets-PROBA.xlsx" сваля
 * файл с това име; със „obrazets-Банка-ОББ-….xlsx" браузърът връща файл на име
 * `download`. Атрибутът `download` не оцелява с кирилица по този път, и човекът
 * получава „download", „download (1)", „download (2)" — три образеца, за които
 * после не се знае кой от кой модел е.
 *
 * ADR-039 вече беше стигнал дотук от другата страна: „ivo@example.bg#lichen" е
 * невалидно име на файл на половината системи. Оттам и правилото:
 *
 *   ИМЕТО НА ФАЙЛА Е АДРЕС, НЕ НАДПИС. То пътува през чужди файлови системи,
 *   пощи и драйвове; съдържанието е нашето, името е тяхно.
 *
 * Затова тук кирилицата се преписва на латиница по БДС-подобната таблица за
 * превод на имена, а всичко останало става тире. Никъде другаде в приложението
 * не се прави такова превръщане — данните си остават на кирилица.
 */
const NA_LATINITSA: Readonly<Record<string, string>> = Object.freeze({
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht',
  ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
});

/** Главна ли е буквата · и на кирилица, и на латиница. */
function eGlavna(z: string | undefined): boolean {
  return z !== undefined && z !== z.toLowerCase() && z === z.toUpperCase();
}

export function bezopasnoIme(tekst: string): string {
  const znatsi = [...tekst.normalize('NFC')];
  const latinitsa = znatsi
    .map((z, i) => {
      const malko = z.toLowerCase();
      const preveden = NA_LATINITSA[malko];
      if (preveden === undefined) return z;
      if (!eGlavna(z)) return preveden;
      // ЕДНОБУКВЕНИТЕ са лесни; многобуквените („ш" → „sh") искат въпроса
      // „това главна буква В ДУМА ли е, или част от изцяло главна дума".
      // „Банка" → „Banka", но „КЕШ" → „KESH", не „KESh".
      const vGlavnaDuma = eGlavna(znatsi[i - 1]) || eGlavna(znatsi[i + 1]);
      return vGlavnaDuma
        ? preveden.toUpperCase()
        : preveden.charAt(0).toUpperCase() + preveden.slice(1);
    })
    .join('');
  const chisto = latinitsa.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  // Празното име е по-лошо от родово: файл на име „-.xlsx" не се отваря никъде.
  return chisto === '' ? 'fayl' : chisto.slice(0, 80);
}
