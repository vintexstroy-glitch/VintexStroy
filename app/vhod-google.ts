/**
 * ВХОДЪТ С GOOGLE · СВЪРЗВАЩАТА ЧАСТ.
 *
 * Това е единственият файл, който пипа мрежа заради самоличността, и затова е
 * единственият, който офлайн изданието НЕ носи. CLAUDE.md го иска точно така:
 * „свързващата част ЛИПСВА в него, а не е изключена."
 *
 * ПРАВИЛО 10 НЕ ПАДА. То пази ГОТОВИЯ ПАКЕТ: „нищо чуждо в готовия пакет."
 * Скриптът на Google не се пакетира, не влиза в джоба и не се тегли при
 * тръгване — тегли се само когато човек натисне бутона. Джобът и офлайн
 * работата остават непокътнати.
 *
 * ЗАЩО ТЕХНИЯТ СКРИПТ, а не на ръка. Google затвори ръчния път за браузър:
 * token-точката приема само `client_secret_post` и `client_secret_basic`, а
 * тайна в браузър не се пази — каквото е в кода, е видимо за всеки. Прекият
 * стар път (`response_type=id_token`) още работи, но е обявен за отпаднал за
 * нови приложения, а вход, който може да спре без предупреждение, не се строи
 * нарочно. Третият вариант — свой сървър — иска месечна сметка и втора част за
 * поддръжка. Изборът е негов, 23.08 (ADR-021).
 *
 * КАКВО ТУК НЕ СЕ ПРАВИ: не се проверява жетон. Това е сметка с точни правила
 * и живее в ядрото (`src/yadro/zheton.ts`), където се тества без мрежа.
 */

import {
  GreshkaVhod,
  prochetiTvardeniya,
  proveriPodpis,
  proveriTvardeniya,
  ADRES_NA_KLYUCHOVETE,
  type Dostavchik,
  type Samolichnost,
  type VhodBezParola,
} from '../src/yadro/index.js';
import { svediImeyl } from '../src/domein/akaunt.js';

/**
 * КЛИЕНТСКИЯТ НОМЕР · публичен по устройство.
 *
 * Стои в кода нарочно и това не е пропуск: номерът се вижда в адреса при всяко
 * влизане и не отваря нищо сам. Какво се приема, решават АДРЕСИТЕ, вписани в
 * конзолата на Google — чужд сайт с този номер получава отказ.
 *
 * Тайната (`client_secret`) не влиза тук и не се ползва никъде. Приложение,
 * което живее в браузър, не може да пази тайна — затова и няма такава.
 */
const KLIENT_NOMER =
  '41382209788-ggjrn13mf5upp068flm6kup5u9usg5lg.apps.googleusercontent.com';

const ADRES_NA_SKRIPTA = 'https://accounts.google.com/gsi/client';

/** Къде се помни влезлият · местно, не в Журнала: това е състояние на устройството. */
const KLYUCH_ZA_POMNENE = 'masterbook:vlezal';

/** Формата, с която скриптът на Google отговаря. Само каквото ползваме. */
interface OtgovorNaGoogle {
  readonly credential?: string;
}

interface GoogleNaProzoretsa {
  accounts?: {
    id: {
      initialize(n: {
        client_id: string;
        callback: (o: OtgovorNaGoogle) => void;
        nonce?: string;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      prompt(): void;
      renderButton(kade: HTMLElement, n: Record<string, unknown>): void;
      disableAutoSelect(): void;
    };
  };
}

function google(): GoogleNaProzoretsa['accounts'] {
  return (window as unknown as { google?: GoogleNaProzoretsa }).google?.accounts;
}

/**
 * Тегли скрипта · САМО при натискане и САМО веднъж.
 *
 * Отказът е с думи: „няма обхват" не бива да изглежда като „входът е развален".
 */
async function osiguriSkripta(): Promise<void> {
  if (google()) return;
  await new Promise<void>((gotovo, greshka) => {
    const veche = document.querySelector<HTMLScriptElement>(`script[src="${ADRES_NA_SKRIPTA}"]`);
    const skript = veche ?? document.createElement('script');
    skript.addEventListener('load', () => gotovo());
    skript.addEventListener('error', () =>
      greshka(
        new GreshkaVhod(
          'Google не се обажда — няма обхват или мрежата го спира. ' +
            'Ако вече си влизал на това устройство, продължи със запомнения вход.',
        ),
      ),
    );
    if (!veche) {
      skript.src = ADRES_NA_SKRIPTA;
      skript.async = true;
      document.head.append(skript);
    }
  });
  if (!google()) {
    throw new GreshkaVhod('Скриптът на Google се зареди, но не се представи.');
  }
}

/** Еднократна дума за това влизане · спира жетон, взет от другаде. */
function novNonce(): string {
  const bayta = new Uint8Array(16);
  crypto.getRandomValues(bayta);
  return [...bayta].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Самоличността, запомнена местно · за тръгване без обхват. */
export function zapomneniyat(): Samolichnost | null {
  try {
    const surovo = localStorage.getItem(KLYUCH_ZA_POMNENE);
    return surovo ? (JSON.parse(surovo) as Samolichnost) : null;
  } catch {
    // Развален запис не бива да спира приложението — просто няма запомнен вход.
    return null;
  }
}

function zapomni(koj: Samolichnost): void {
  try {
    localStorage.setItem(KLYUCH_ZA_POMNENE, JSON.stringify(koj));
  } catch {
    // Пълно или заключено хранилище: влизането пак важи за ТАЗИ сесия.
  }
}

/**
 * Входът през Google · реализация на вече съществуващия порт.
 *
 * `main.ts` не научава нищо ново — получава друга реализация на `VhodBezParola`.
 */
export class VhodSGoogle implements VhodBezParola {
  #tekushta: Samolichnost | null = zapomneniyat();

  constructor(
    private readonly n: {
      /** къде да се нарисува бутонът на Google */
      readonly kade: () => HTMLElement | null;
      /** за тестове и за прохода — иначе истинските ключове на Google */
      readonly vzemiKlyuchove?: () => Promise<{ keys: readonly { kid: string; n: string; e: string; kty: string }[] }>;
      readonly sega?: () => Date;
    },
  ) {}

  async vlez(dostavchik: Dostavchik): Promise<Samolichnost> {
    if (dostavchik !== 'google') {
      throw new GreshkaVhod(
        `${dostavchik} още не е вързан. Редът е Google първи — останалите идват с ` +
          'по една регистрация всеки (ADR-009 §6б).',
      );
    }
    await osiguriSkripta();
    const nonce = novNonce();
    const zheton = await this.#pochakayZheton(nonce);

    await proveriPodpis(zheton, this.n.vzemiKlyuchove ?? vzemiKlyuchoveOtGoogle);
    const tvardeniya = prochetiTvardeniya(zheton);
    proveriTvardeniya(tvardeniya, {
      klientNomer: KLIENT_NOMER,
      nonce,
      sega: (this.n.sega ?? (() => new Date()))(),
    });

    const koj: Samolichnost = {
      dostavchik: 'google',
      imeyl: svediImeyl(tvardeniya.email),
      ime: tvardeniya.name?.trim() || svediImeyl(tvardeniya.email),
      hranilishte: 'безплатно',
      nachin: 'dostavchik',
      // Влезлият е собственик на СВОЯ Журнал — ключът е неговият имейл
      // (ADR-020). Служителят при чужд акаунт идва със споделянето на папката.
      rolya: 'sobstvenik',
      svarzani: [],
    };
    this.#tekushta = koj;
    zapomni(koj);
    return koj;
  }

  async izlez(): Promise<void> {
    // Излизането НЕ трие Журнала — той е на диска и е негов (местно-първо).
    // Трие се само кой е влязъл.
    this.#tekushta = null;
    try {
      localStorage.removeItem(KLYUCH_ZA_POMNENE);
      google()?.id.disableAutoSelect();
    } catch {
      /* няма какво да се чисти */
    }
  }

  tekushta(): Samolichnost | null {
    return this.#tekushta;
  }

  #pochakayZheton(nonce: string): Promise<string> {
    return new Promise<string>((gotovo, greshka) => {
      const gde = this.n.kade();
      if (!gde) {
        greshka(new GreshkaVhod('Няма къде да се нарисува бутонът на Google.'));
        return;
      }
      const akaunti = google();
      if (!akaunti) {
        greshka(new GreshkaVhod('Скриптът на Google не е готов.'));
        return;
      }
      akaunti.id.initialize({
        client_id: KLIENT_NOMER,
        nonce,
        cancel_on_tap_outside: false,
        callback: (o) => {
          if (o.credential) gotovo(o.credential);
          else greshka(new GreshkaVhod('Google не върна жетон.'));
        },
      });
      gde.replaceChildren();
      akaunti.id.renderButton(gde, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'bg',
      });
      akaunti.id.prompt();
    });
  }
}

async function vzemiKlyuchoveOtGoogle(): Promise<{
  keys: readonly { kid: string; n: string; e: string; kty: string }[];
}> {
  const otgovor = await fetch(ADRES_NA_KLYUCHOVETE);
  if (!otgovor.ok) {
    throw new GreshkaVhod(`Публичните ключове на Google не се четат (${otgovor.status}).`);
  }
  return (await otgovor.json()) as { keys: { kid: string; n: string; e: string; kty: string }[] };
}
