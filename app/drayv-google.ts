/**
 * ДРАЙВЪТ НА GOOGLE · СВЪРЗВАЩАТА ЧАСТ (ADR-055 · резен 6).
 *
 * Вторият и последен файл, който пипа мрежа заради Google — и като първия
 * (`vhod-google.ts`) е онова, което офлайн изданието НЕ носи. Правило 10 не
 * пада: скриптът не се пакетира и не се тегли при тръгване, а само когато
 * човек натисне бутона.
 *
 * ═══ НУЛА ЗАВИСИМОСТИ ═══
 *
 * Drive REST се вика с чист `fetch`. Клиентската библиотека на Google не влиза
 * и не е нужна: качването е един multipart HTTP, а не изкуство.
 *
 * ═══ КОЙ ОБХВАТ И ЗАЩО ТОЧНО ТОЙ ═══
 *
 * `drive.file` — приложението вижда САМО файловете, които е създало, и онези,
 * които човек изрично му е дал. Не вижда останалия Драйв. Това е най-тясното,
 * което върши работа, и е буквално неговото правило: „достъпът е даден от
 * Драйва" (И50 · И57 · И62). По-широкото (`drive`) би значело да искаме да
 * четем всичко на човека, за да пренесем един свой файл.
 *
 * ЖЕТОНЪТ НЕ СЕ ПАЗИ. Живее в паметта на този раздел и умира с него. Записан в
 * `localStorage`, той би бил ключ към Драйва, който всеки скрипт на страницата
 * може да прочете — а правило 13 казва: каквото го няма, не изтича.
 *
 * ВТОРО СЪГЛАСИЕ, НЕ ВТОРО ВЛИЗАНЕ. Влизането дава САМОЛИЧНОСТ (кой си);
 * достъпът до Драйва е ОТДЕЛНО разрешение (какво може приложението). Google ги
 * дели нарочно и ние не ги сливаме: човек, който не иска да пренася нищо, не
 * бива да дава достъп до файлове, за да влезе.
 */

import type { Drayv, FaylVDrayva } from '../src/nositel/drayv.js';
import { GreshkaDrayv } from '../src/nositel/drayv.js';
import { osiguriSkriptaNaGoogle } from './gis-skript.js';

const OBHVAT = 'https://www.googleapis.com/auth/drive.file';
const KLIENT_NOMER =
  '41382209788-ggjrn13mf5upp068flm6kup5u9usg5lg.apps.googleusercontent.com';

const SPISAK = 'https://www.googleapis.com/drive/v3/files';
const KACHVANE = 'https://www.googleapis.com/upload/drive/v3/files';

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
 * ИСКА СЪГЛАСИЕ и връща жетон · всеки път наново.
 *
 * Не се кешира между натискания нарочно. Жетонът на Google живее около час, а
 * изтекъл жетон дава 401 в средата на пренасяне — тоест половин работа и
 * съобщение, което човек не свързва с изтекло разрешение.
 */
export async function vzemiZheton(): Promise<string> {
  await osiguriSkriptaNaGoogle(() => Boolean(google()?.oauth2), (t) => new GreshkaDrayv(t));
  return new Promise<string>((gotovo, greshka) => {
    const klient = google()!.oauth2!.initTokenClient({
      client_id: KLIENT_NOMER,
      scope: OBHVAT,
      callback: (o) => {
        if (o.access_token) gotovo(o.access_token);
        else greshka(new GreshkaDrayv(`Google отказа достъп до Драйва: ${o.error ?? 'без причина'}.`));
      },
      error_callback: (o) =>
        greshka(
          new GreshkaDrayv(
            o.type === 'popup_closed'
              ? 'Прозорецът се затвори без съгласие — нищо не е пренесено.'
              : `Достъпът до Драйва не се получи (${o.type ?? 'непозната пречка'}).`,
          ),
        ),
    });
    klient.requestAccessToken();
  });
}

/** Реализацията на порта · четирите повиквания, с чист `fetch`. */
export class DrayvNaGoogle implements Drayv {
  readonly #zheton: string;

  constructor(zheton: string) {
    this.#zheton = zheton;
  }

  async spisak(pristavka: string): Promise<readonly FaylVDrayva[]> {
    // Апострофът е разделителят на Drive-заявката; в имената ни го няма, но
    // екранирането струва един ред и маха цял клас изненади.
    const zayavka = `name contains '${pristavka.replace(/'/g, "\\'")}' and trashed = false`;
    const adres = `${SPISAK}?q=${encodeURIComponent(zayavka)}&fields=${encodeURIComponent('files(id,name)')}&pageSize=100`;
    const otgovor = await this.#pitay(adres, { method: 'GET' });
    const danni = (await otgovor.json()) as { files?: { id: string; name: string }[] };
    return (danni.files ?? []).map((f) => ({ id: f.id, ime: f.name }));
  }

  async cheti(id: string): Promise<string> {
    return (await this.#pitay(`${SPISAK}/${encodeURIComponent(id)}?alt=media`, { method: 'GET' })).text();
  }

  async sazday(ime: string, sadarzhanie: string): Promise<string> {
    const otgovor = await this.#pitay(`${KACHVANE}?uploadType=multipart&fields=id`, {
      method: 'POST',
      body: mnogochastno({ name: ime, mimeType: 'application/json' }, sadarzhanie),
      headers: { 'Content-Type': `multipart/related; boundary=${GRANITSA}` },
    });
    return ((await otgovor.json()) as { id: string }).id;
  }

  async presazday(id: string, sadarzhanie: string): Promise<void> {
    await this.#pitay(`${KACHVANE}/${encodeURIComponent(id)}?uploadType=media`, {
      method: 'PATCH',
      body: sadarzhanie,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Едно място за жетона и за отказите · с ДУМИ, не с номер.
   *
   * „403" на екрана не казва нищо на човек. Трите чести случая си имат смисъл
   * и всеки води до различно действие.
   */
  async #pitay(adres: string, kak: RequestInit): Promise<Response> {
    const otgovor = await fetch(adres, {
      ...kak,
      headers: { ...(kak.headers ?? {}), Authorization: `Bearer ${this.#zheton}` },
    });
    if (otgovor.ok) return otgovor;
    if (otgovor.status === 401) {
      throw new GreshkaDrayv('Разрешението за Драйва изтече. Натисни пак — Google ще попита наново.');
    }
    if (otgovor.status === 403) {
      throw new GreshkaDrayv(
        'Google отказа: или достъпът не е даден, или дневната бройка е изчерпана. ' +
          'Журналът на устройството не е пипан.',
      );
    }
    throw new GreshkaDrayv(`Драйвът отговори с ${otgovor.status}. Нищо не е пренесено.`);
  }
}

const GRANITSA = 'masterbook-granitsa';

/** Едно качване = описание + съдържание, в едно тяло. */
function mnogochastno(opisanie: Readonly<Record<string, string>>, sadarzhanie: string): string {
  return [
    `--${GRANITSA}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(opisanie),
    `--${GRANITSA}`,
    'Content-Type: application/json',
    '',
    sadarzhanie,
    `--${GRANITSA}--`,
    '',
  ].join('\r\n');
}
