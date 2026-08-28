/**
 * КАЛЕНДАРЪТ НА GOOGLE · СВЪРЗВАЩАТА ЧАСТ (резен 14б · И110).
 *
 * ТРЕТИЯТ и последен файл, който пипа мрежа заради Google. Като първите два
 * (`vhod-google.ts` · `drayv-google.ts`) той е онова, което офлайн изданието НЕ
 * носи — и този път обещанието държи наистина: файлът се тегли с ДИНАМИЧЕН внос
 * и е изброен в `SVARZVASHTI` на печата, значи джобът не го прибира
 * предварително (ADR-063 · дефект 2).
 *
 * ═══ НУЛА ЗАВИСИМОСТИ ═══
 *
 * Calendar REST се вика с чист `fetch`, точно като Драйва. Клиентската
 * библиотека на Google не влиза и не е нужна: едно събитие е един POST.
 *
 * ═══ ОБХВАТЪТ · и защо е ТОЗИ, а не по-тесният ═══
 *
 * `calendar.events` е ЧУВСТВИТЕЛЕН обхват при Google: до верификация на
 * приложението екранът за съгласие пише „това приложение не е проверено" и има
 * таван потребители. Това е ЦЕНА, която Драйвът (`drive.file`) не плащаше, и тя
 * се казва предварително, не след първия отказ.
 *
 * По-тесният кандидат е `calendar.app.created` — приложението прави СВОЙ
 * календар и пише само в него. Той НЕ Е ИЗБРАН, и причината е честна:
 * **не можа да се провери оттук.** Документацията на Google (`developers.google.com`)
 * е блокирана от проксито на средата — същото, което спря и XSD-то на НАП
 * (ADR-047). А непроверено предположение за обхват значи бутон, който минава
 * тестовете и отказва в истински браузър — точно находката от И101 т.4.
 *
 * ПРОВЕРКАТА, която ще реши: пусни поканата с `calendar.app.created` срещу
 * СВОЙ календар и виж дали участникът получава писмо. Ако да — обхватът се
 * стеснява с една дума и верификацията отпада. Ако не — остава този.
 *
 * ЖЕТОНЪТ НЕ СЕ ПАЗИ. Живее в паметта на този раздел и умира с него — същото
 * решение като при Драйва: записан в `localStorage`, той би бил ключ към
 * календара, който всеки скрипт на страницата може да прочете (правило 13).
 *
 * ВТОРО СЪГЛАСИЕ, НЕ ВТОРО ВЛИЗАНЕ. Влизането дава САМОЛИЧНОСТ; поканата иска
 * ОТДЕЛНО разрешение. Човек, който не праща покани, не бива да дава достъп до
 * календара си, за да влезе.
 */

import {
  chetiOtgovora,
  GreshkaKalendar,
  type Kalendar,
  type OtgovorOtKalendara,
  type SabitieZaKalendar,
} from '../src/domein/kalendar.js';
import { pitayGoogle, vzemiZhetonZaObhvat } from './gis-skript.js';

const OBHVAT = 'https://www.googleapis.com/auth/calendar.events';

/**
 * `primary` е КАЛЕНДАРЪТ НА ВЛЕЗЛИЯ, назован с дума вместо с адрес.
 *
 * Събитието се прави в НЕГОВИЯ календар, а служителят е УЧАСТНИК. Обратното —
 * запис в чужд календар — Google не позволява с този жетон, и точно затова
 * неговата дума е „ще пратиш ИСКАНЕ" *(р48·[52])*.
 */
const SABITIYA = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * ИСКА СЪГЛАСИЕ за КАЛЕНДАРА · механиката е обща, ДУМИТЕ са тукашни.
 *
 * Общото беше преписано от Драйва дума по дума и обходът за чистота го хвана
 * с девет еднакви къса. Сега машината е една (`vzemiZhetonZaObhvat`), а тези
 * три изречения са единственото, което е СОБСТВЕНО на поканата — и те трябва
 * да са собствени: „затвори се прозорчето" значи различно нещо тук и там.
 */
export async function vzemiZhetonZaKalendar(): Promise<string> {
  return vzemiZhetonZaObhvat(OBHVAT, (t) => new GreshkaKalendar(t), {
    otkazan: (prichina) => `Google отказа достъп до календара: ${prichina}.`,
    zatvoren: 'Прозорецът се затвори без съгласие — покана НЕ е тръгнала.',
    nepoluchen: (vid) => `Достъпът до календара не се получи (${vid}).`,
  });
}

export class KalendaratNaGoogle implements Kalendar {
  readonly #zheton: string;

  constructor(zheton: string) {
    this.#zheton = zheton;
  }

  /**
   * `sendUpdates=all` е онова, което праща ПИСМОТО.
   *
   * Без него събитието се прави, участникът стои в него — и никой не получава
   * нищо. Тоест поканата щеше да е „изпратена" само в нашата глава.
   */
  async pokani(s: SabitieZaKalendar): Promise<string> {
    const otgovor = await this.#pitay(`${SABITIYA}?sendUpdates=all&fields=id`, {
      method: 'POST',
      body: JSON.stringify(s),
      headers: { 'Content-Type': 'application/json' },
    });
    const danni = (await otgovor.json()) as { id?: string };
    if (!danni.id) {
      throw new GreshkaKalendar('Google прие събитието, но не върна номер — поканата не се проследява.');
    }
    return danni.id;
  }

  async otgovorat(id: string): Promise<OtgovorOtKalendara> {
    const otgovor = await this.#pitay(
      `${SABITIYA}/${encodeURIComponent(id)}?fields=${encodeURIComponent('attendees(responseStatus)')}`,
      { method: 'GET' },
    );
    const danni = (await otgovor.json()) as { attendees?: { responseStatus?: string }[] };
    // ЕДИН участник има поканата · ако Google върне празно, това НЕ е „не е
    // отговорил", а „няма кого да питаме" — и си има своя дума.
    const parviyat = danni.attendees?.[0];
    return parviyat ? chetiOtgovora(parviyat.responseStatus) : 'nepoznat';
  }

  /** Едно място за жетона и за отказите · с ДУМИ, не с номер (както при Драйва). */
  async #pitay(adres: string, kak: RequestInit): Promise<Response> {
    return pitayGoogle(this.#zheton, adres, kak, (sastoyanie) => {
      if (sastoyanie === 401) {
        return new GreshkaKalendar('Разрешението за календара изтече. Натисни пак — Google ще попита наново.');
      }
      if (sastoyanie === 403) {
        return new GreshkaKalendar(
          'Google отказа: или достъпът до календара не е даден, или приложението още не е ' +
            'проверено от тях. Задачата в програмата НЕ е пипана — само поканата не тръгна.',
        );
      }
      if (sastoyanie === 404) {
        return new GreshkaKalendar('Това събитие вече го няма в календара — покана за него не се проследява.');
      }
      return new GreshkaKalendar(`Календарът отговори с ${sastoyanie}. Покана НЕ е тръгнала.`);
    });
  }
}
