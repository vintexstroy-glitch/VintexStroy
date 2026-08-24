/**
 * ЖЕТОНЪТ · какво казва Google за влезлия, и защо му вярваме.
 *
 * След вход Google връща подписан JSON от три части, делени с точка:
 * глава · твърдения · подпис. Тук се чете и се ПРОВЕРЯВА — без нито един
 * външен адрес, за да може всичко да се тества офлайн.
 *
 * ЗАЩО Е В ЯДРОТО. Това е сметка с точни правила, не рисуване: всяко твърдение
 * се проверява поотделно и всеки отказ си има собствен тест. Свързващата част —
 * скриптът, бутонът, мрежата — живее в `app/vhod-google.ts` и офлайн изданието
 * изобщо я няма (CLAUDE.md: „свързващата част ЛИПСВА в него, а не е изключена").
 *
 * ОТКАЗЪТ Е С ДУМИ, не с `null`. Вход, който „просто не работи", е най-скъпият
 * вид повреда: човекът натиска пак и пак, а никой не знае какво не е наред.
 */

import { GreshkaVhod } from './samolichnost.js';

/** Кой има право да е издал жетона. Google се представя и с двете изписвания. */
const IZDATELI: readonly string[] = Object.freeze([
  'accounts.google.com',
  'https://accounts.google.com',
]);

/**
 * ДОПУСК ЗА ЧАСОВНИКА · 60 секунди.
 *
 * Часовникът на устройството не е верен до секундата. Без допуск съвсем валиден
 * жетон пада с „изтекъл" на машина, която бърза с половин минута — и това е
 * отказ, за който човекът няма никаква вина и никакво лекарство.
 */
export const DOPUSK_SEK = 60;

/** Твърденията, които ни трябват. Google връща и други; те не ни интересуват. */
export interface Tvardeniya {
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly email: string;
  readonly email_verified: boolean;
  readonly name?: string;
  readonly nonce?: string;
  /** вечният номер на човека при Google — не се мени, дори имейлът да се смени */
  readonly sub: string;
}

/**
 * Чете СРЕДНАТА част, без да проверява подписа.
 *
 * Отделено нарочно: четенето и вярването са две различни неща и се бъркат
 * лесно. Който вика само това, получава данни, на които още не се вярва.
 */
export function prochetiTvardeniya(zheton: string): Tvardeniya {
  const chasti = zheton.split('.');
  if (chasti.length !== 3) {
    throw new GreshkaVhod('Жетонът не е от три части — това не е жетон от Google.');
  }
  let surovo: string;
  try {
    surovo = otBase64URL(chasti[1]!);
  } catch {
    throw new GreshkaVhod('Средната част на жетона не се чете.');
  }
  let danni: unknown;
  try {
    danni = JSON.parse(surovo);
  } catch {
    throw new GreshkaVhod('Средната част на жетона не е JSON.');
  }
  if (typeof danni !== 'object' || danni === null) {
    throw new GreshkaVhod('Жетонът не носи твърдения.');
  }
  return danni as Tvardeniya;
}

/**
 * ПРОВЕРЯВА твърденията · шест въпроса, всеки със свой отказ.
 *
 * `sega` се подава отвън, за да е тестът за изтекъл жетон истински, а не
 * зависим от часовника на машината, която го пуска.
 */
export function proveriTvardeniya(
  t: Tvardeniya,
  n: { readonly klientNomer: string; readonly nonce: string; readonly sega: Date },
): void {
  if (!IZDATELI.includes(t.iss)) {
    throw new GreshkaVhod(`Жетонът не е издаден от Google, а от „${t.iss}".`);
  }
  if (t.aud !== n.klientNomer) {
    throw new GreshkaVhod('Жетонът е за ДРУГО приложение — не е издаден за този клиентски номер.');
  }

  const sega = Math.floor(n.sega.getTime() / 1000);
  if (typeof t.exp !== 'number' || !Number.isFinite(t.exp)) {
    throw new GreshkaVhod('Жетонът не казва докога важи.');
  }
  if (t.exp + DOPUSK_SEK < sega) {
    const predi = sega - t.exp;
    throw new GreshkaVhod(
      `Жетонът е изтекъл преди ${predi < 120 ? `${predi} секунди` : `${Math.round(predi / 60)} минути`}. Влез отново.`,
    );
  }

  // Разминат `nonce` значи жетон, взет от другаде и подхвърлен тук.
  if (t.nonce !== n.nonce) {
    throw new GreshkaVhod('Жетонът не отговаря на това влизане — започни отначало.');
  }

  if (t.email_verified !== true) {
    throw new GreshkaVhod(
      'Google не потвърждава този имейл. Непотвърден имейл не става ключ на Журнал.',
    );
  }
  if (typeof t.email !== 'string' || t.email.trim() === '') {
    throw new GreshkaVhod('Жетонът не носи имейл — без него няма нито акаунт, нито `actor`.');
  }
  if (typeof t.sub !== 'string' || t.sub.trim() === '') {
    throw new GreshkaVhod('Жетонът не носи номер на човека при Google.');
  }
}

/** Base64URL → текст, с уникода наред („Йордан", не „Ð™Ð¾Ñ€Ð´Ð°Ð½"). */
function otBase64URL(chast: string): string {
  const base64 = chast.replace(/-/g, '+').replace(/_/g, '/');
  const dopalneno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const dvoichno = atob(dopalneno);
  const bayta = Uint8Array.from(dvoichno, (z) => z.charCodeAt(0));
  return new TextDecoder().decode(bayta);
}

/**
 * ПОДПИСЪТ · единственото тук, което пипа мрежа.
 *
 * Останалото в този файл е сметка над текст. Проверката на подписа иска
 * ПУБЛИЧНИТЕ ключове на Google и затова стои най-долу, отделно и с ясно име:
 * викащият вижда, че тази функция може да чака и може да няма обхват.
 *
 * НУЛА ЧУЖД КОД. RS256 е в `crypto.subtle` на всеки браузър — ключът се внася
 * като JWK и се проверява направо. Библиотека за жетони не влиза (правило 10).
 *
 * ЗАЩО ИЗОБЩО. Твърденията идват през скрипта на Google в същата страница, но
 * „идва отнякъде, на което вярваме" не е проверка. Подписът е разликата между
 * доверие и доказателство — а Журналът се отваря по имейла оттук.
 */
export const ADRES_NA_KLYUCHOVETE = 'https://www.googleapis.com/oauth2/v3/certs';

interface KlyuchOtGoogle {
  readonly kid: string;
  readonly n: string;
  readonly e: string;
  readonly kty: string;
  readonly alg?: string;
}

/**
 * Проверява подписа срещу публичните ключове на Google.
 *
 * `vzemiKlyuchove` се подава, за да може тестът да мине без мрежа — и за да е
 * видно, че мрежата е ДОВОД, а не скрито действие вътре.
 */
export async function proveriPodpis(
  zheton: string,
  vzemiKlyuchove: () => Promise<{ keys: readonly KlyuchOtGoogle[] }>,
): Promise<void> {
  const chasti = zheton.split('.');
  if (chasti.length !== 3) {
    throw new GreshkaVhod('Жетонът не е от три части — няма какво да се проверява.');
  }

  const glava = JSON.parse(otBase64URL(chasti[0]!)) as { kid?: string; alg?: string };
  if (glava.alg !== 'RS256') {
    // Жетон, който сам казва „без подпис", е класическата подмяна.
    throw new GreshkaVhod(`Жетонът е подписан с „${glava.alg ?? 'нищо'}", а се приема само RS256.`);
  }

  const { keys } = await vzemiKlyuchove();
  const klyuch = keys.find((k) => k.kid === glava.kid);
  if (!klyuch) {
    throw new GreshkaVhod('Google не познава ключа, с който е подписан жетонът.');
  }

  const publichen = await crypto.subtle.importKey(
    'jwk',
    { kty: klyuch.kty, n: klyuch.n, e: klyuch.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const podpisan = bayteOtTekst(`${chasti[0]}.${chasti[1]}`);
  const podpis = bayteOtBase64URL(chasti[2]!);
  const naredE = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publichen, podpis, podpisan);
  if (!naredE) {
    throw new GreshkaVhod('Подписът на жетона не съвпада — жетонът е пипан.');
  }
}

/**
 * Байтовете · построени в СВОЙ буфер.
 *
 * `Uint8Array.from(...)` дава масив, за който типът не обещава чий е буферът, а
 * `crypto.subtle` приема само обикновен. Строенето с изрична дължина го решава
 * без нито един каст — а каст тук би изключил точно проверката, която пази
 * подписа да се смята върху онова, което мислим.
 */
function bayteOtBase64URL(chast: string): Uint8Array<ArrayBuffer> {
  const base64 = chast.replace(/-/g, '+').replace(/_/g, '/');
  const dopalneno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const dvoichno = atob(dopalneno);
  const bayta = new Uint8Array(new ArrayBuffer(dvoichno.length));
  for (let i = 0; i < dvoichno.length; i += 1) bayta[i] = dvoichno.charCodeAt(i);
  return bayta;
}

function bayteOtTekst(tekst: string): Uint8Array<ArrayBuffer> {
  const izhod = new TextEncoder().encode(tekst);
  const bayta = new Uint8Array(new ArrayBuffer(izhod.length));
  bayta.set(izhod);
  return bayta;
}
