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
import type { KvotaNaDrayva } from '../src/domein/spiratchka.js';
import { GreshkaDrayv } from '../src/nositel/drayv.js';
import { pitayGoogle, vzemiZhetonZaObhvat } from './gis-skript.js';

const OBHVAT = 'https://www.googleapis.com/auth/drive.file';

const SPISAK = 'https://www.googleapis.com/drive/v3/files';
const KACHVANE = 'https://www.googleapis.com/upload/drive/v3/files';
/**
 * КВОТАТА · `about.get`, и той работи с обхвата, който вече имаме.
 *
 * Google изброява `drive.file` сред обхватите на `about.get`; затова честната
 * спирачка не струва НИТО ЕДНО ново разрешение. Ако някой ден откаже с 403,
 * това ще е сигурно ЗНАНИЕ, не догадка — и екранът вече знае да го КАЖЕ с
 * думи, вместо да замълчи (същият похват като при схемата на НАП, ADR-047:
 * истинската проверка е ЖИВОТО повикване).
 */
const ZA_MEN = 'https://www.googleapis.com/drive/v3/about';

/**
 * ИСКА СЪГЛАСИЕ за ДРАЙВА · механиката е обща, ДУМИТЕ са тукашни.
 *
 * Машината (тегленето на скрипта, клиентът за жетон, двата вида отказ) живее
 * ЕДИН път в `gis-skript.ts`. Тук остава само онова, което е СОБСТВЕНО на
 * пренасянето: обхватът и трите изречения. „Прозорецът се затвори" тук значи
 * „нищо не е пренесено", а при Календара — „покана НЕ е тръгнала"; общо
 * съобщение би било вярно и безполезно.
 */
export async function vzemiZheton(): Promise<string> {
  return vzemiZhetonZaObhvat(OBHVAT, (t) => new GreshkaDrayv(t), {
    otkazan: (prichina) => `Google отказа достъп до Драйва: ${prichina}.`,
    zatvoren: 'Прозорецът се затвори без съгласие — нищо не е пренесено.',
    nepoluchen: (vid) => `Достъпът до Драйва не се получи (${vid}).`,
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
   * ТАВАНЪТ И ЗАЕТОТО · питаме доставчика, не човека (правило 14).
   *
   * `limit` липсва при акаунт БЕЗ ограничение (фирмен). Липсата се превежда на
   * `-1` ТУК, при мястото ѝ, а домейнът я чете като „платено": прочетена като
   * нула, тя щеше да обяви най-скъпия клиент за препълнен.
   */
  async kvota(): Promise<KvotaNaDrayva> {
    const adres = `${ZA_MEN}?fields=${encodeURIComponent('storageQuota')}`;
    const otgovor = await this.#pitay(adres, { method: 'GET' });
    const danni = (await otgovor.json()) as {
      storageQuota?: { limit?: string; usage?: string };
    };
    const k = danni.storageQuota ?? {};
    return {
      limit: k.limit === undefined ? -1 : Number(k.limit),
      zaeto: Number(k.usage ?? 0),
    };
  }

  /**
   * Едно място за жетона и за отказите · с ДУМИ, не с номер.
   *
   * „403" на екрана не казва нищо на човек. Трите чести случая си имат смисъл
   * и всеки води до различно действие.
   */
  async #pitay(adres: string, kak: RequestInit): Promise<Response> {
    return pitayGoogle(this.#zheton, adres, kak, (sastoyanie) => {
      if (sastoyanie === 401) {
        return new GreshkaDrayv('Разрешението за Драйва изтече. Натисни пак — Google ще попита наново.');
      }
      if (sastoyanie === 403) {
        return new GreshkaDrayv(
          'Google отказа: или достъпът не е даден, или дневната бройка е изчерпана. ' +
            'Журналът на устройството не е пипан.',
        );
      }
      return new GreshkaDrayv(`Драйвът отговори с ${sastoyanie}. Нищо не е пренесено.`);
    });
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
