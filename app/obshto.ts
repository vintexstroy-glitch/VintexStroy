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
