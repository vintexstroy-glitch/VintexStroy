/**
 * СКРИПТЪТ НА GOOGLE · ЕДИН дом за тегленето (правило 17).
 *
 * Две места го искат — входът (самоличност) и Драйвът (пренасяне) — и това е
 * ЕДНО и също теглене на ЕДИН и същ адрес. Написано два пъти, то беше две
 * места, на които може да се разминат: обходът за чистота го хвана като
 * дублирано още в деня, в който вторият се появи.
 *
 * ПРАВИЛО 10 НЕ ПАДА. Скриптът не се пакетира, не влиза в джоба и не се тегли
 * при тръгване — само когато човек натисне бутон. Офлайн изданието не носи
 * нито един от трите файла, които го викат.
 */

const ADRES = 'https://accounts.google.com/gsi/client';

/**
 * Тегли скрипта · само веднъж, и чака ГОТОВНОСТТА, не самото събитие.
 *
 * `gotov` е предикат, а не флаг: същият скрипт носи две различни части
 * (`accounts.id` за входа, `accounts.oauth2` за Драйва) и втората може да се
 * появи, докато първата вече я има. Чакане по „заредил ли се е файлът" би
 * увиснало завинаги при втория викащ — файлът е зареден отдавна и „load" няма
 * да се обади пак.
 */
export async function osiguriSkriptaNaGoogle(
  gotov: () => boolean,
  nyamaObhvat: (tekst: string) => Error,
): Promise<void> {
  if (gotov()) return;
  await new Promise<void>((dobre, zle) => {
    const veche = document.querySelector<HTMLScriptElement>(`script[src="${ADRES}"]`);
    if (veche && gotov()) {
      dobre();
      return;
    }
    const skript = veche ?? document.createElement('script');
    skript.addEventListener('load', () => dobre());
    skript.addEventListener('error', () =>
      zle(
        nyamaObhvat(
          'Google не се обажда — няма обхват или мрежата го спира. ' +
            'Това пипа само онова, което иска мрежа; всичко останало работи и без нея.',
        ),
      ),
    );
    if (!veche) {
      skript.src = ADRES;
      skript.async = true;
      document.head.append(skript);
    }
  });
  if (!gotov()) {
    throw nyamaObhvat('Скриптът на Google се зареди, но не предлага онова, което трябва.');
  }
}

/**
 * КЛИЕНТСКИЯТ НОМЕР · публичен по устройство, и с ЕДИН дом (правило 17).
 *
 * Стои в кода нарочно и това не е пропуск: номерът се вижда в адреса при всяко
 * влизане и не отваря нищо сам. Какво се приема, решават АДРЕСИТЕ, вписани в
 * конзолата на Google — чужд сайт с този номер получава отказ. Тайната
 * (`client_secret`) не влиза тук и не се ползва никъде: приложение, което живее
 * в браузър, не може да пази тайна — затова и няма такава.
 *
 * Живееше ПРЕПИСАН в трите свързващи файла. Преписаното число се разминава —
 * доказано в този проект с „132 проверки", които оцеляха на три места, докато
 * истината беше 152. Мокът на прохода нарочно държи свое копие: той трябва да
 * подписва за същото приложение, без да внася `app/` в себе си.
 */
export const KLIENT_NOMER =
  '41382209788-ggjrn13mf5upp068flm6kup5u9usg5lg.apps.googleusercontent.com';

interface ZhetonOtGoogle {
  readonly access_token?: string;
  readonly error?: string;
}

interface KlientZaZheton {
  requestAccessToken(): void;
}

interface GoogleNaProzoretsa {
  accounts?: {
    oauth2?: {
      initTokenClient(n: {
        client_id: string;
        scope: string;
        callback: (o: ZhetonOtGoogle) => void;
        error_callback?: (o: { type?: string }) => void;
      }): KlientZaZheton;
    };
  };
}

function google(): GoogleNaProzoretsa['accounts'] {
  return (window as unknown as { google?: GoogleNaProzoretsa }).google?.accounts;
}

/**
 * ДУМИТЕ на отказа · всяка свързваща част казва СВОЕТО, не общо „грешка".
 *
 * „Прозорецът се затвори" значи различно нещо при Драйва („нищо не е
 * пренесено") и при Календара („покана НЕ е тръгнала"). Общото съобщение би
 * било вярно и безполезно — човек не знае какво е станало с работата му.
 */
export interface DumiteZaZhetona {
  /** Google отказа изрично · причината идва от него. */
  readonly otkazan: (prichina: string) => string;
  /** Човек затвори прозорчето, без да даде съгласие. */
  readonly zatvoren: string;
  /** Всичко останало · видът, както Google го нарича. */
  readonly nepoluchen: (vid: string) => string;
}

/**
 * ИСКА СЪГЛАСИЕ и връща жетон · ЕДИН път написано, за трите обхвата.
 *
 * Живееше два пъти, дума по дума, в Драйва и в Календара — и обходът за
 * чистота го хвана в деня, в който вторият се появи, точно както хвана и
 * тегленето на скрипта преди него.
 *
 * ЖЕТОНЪТ НЕ СЕ КЕШИРА между натискания, и това е нарочно: живее около час, а
 * изтекъл жетон дава 401 в средата на работата — тоест половин свършена работа
 * и съобщение, което човек не свързва с изтекло разрешение.
 *
 * ОБХВАТЪТ Е ДОВОД, не подразбран: всяка част иска СВОЕТО и нищо повече.
 */
export async function vzemiZhetonZaObhvat(
  obhvat: string,
  greshka: (t: string) => Error,
  dumi: DumiteZaZhetona,
): Promise<string> {
  await osiguriSkriptaNaGoogle(() => Boolean(google()?.oauth2), greshka);
  return new Promise<string>((gotovo, zle) => {
    const klient = google()!.oauth2!.initTokenClient({
      client_id: KLIENT_NOMER,
      scope: obhvat,
      callback: (o) => {
        if (o.access_token) gotovo(o.access_token);
        else zle(greshka(dumi.otkazan(o.error ?? 'без причина')));
      },
      error_callback: (o) =>
        zle(greshka(o.type === 'popup_closed' ? dumi.zatvoren : dumi.nepoluchen(o.type ?? 'непозната пречка'))),
    });
    klient.requestAccessToken();
  });
}

/**
 * ЕДНО ПОВИКВАНЕ към Google · жетонът и „падна ли" на едно място.
 *
 * Слагането на жетона в главата и проверката „мина ли" бяха преписани в
 * Драйва и в Календара — обходът за чистота ги хвана като еднакви къса.
 *
 * ДУМИТЕ ОСТАВАТ ПРИ ВИКАЩИЯ, и това е нарочно: „403" на екрана не казва нищо
 * на човек, а какво значи 403 е РАЗЛИЧНО при пренасяне („дневната бройка е
 * изчерпана") и при покана („приложението още не е проверено"). Общият текст
 * би бил верен и безполезен. Затова тук минава само механиката, а всяка част
 * превежда номера на своя език.
 */
export async function pitayGoogle(
  zheton: string,
  adres: string,
  kak: RequestInit,
  prevedi: (sastoyanie: number) => Error,
): Promise<Response> {
  const otgovor = await fetch(adres, {
    ...kak,
    headers: { ...(kak.headers ?? {}), Authorization: `Bearer ${zheton}` },
  });
  if (otgovor.ok) return otgovor;
  throw prevedi(otgovor.status);
}
