/**
 * СЕСИИТЕ НА РЕДАКТОРА · кой какво е пипал в един ден (резен 26 · ADR-086).
 *
 * ═══ НЕГОВИТЕ ДУМИ · ЦЯЛО СЪОБЩЕНИЕ, БЕЗ ВЪПРОС ОТ МЕН ═══
 *
 *   „Добре, но един въпрос, ако все пак сложим **дата и име на журнала за
 *    търсене** в него и направим така. Че промените направени от всеки **като
 *    сесия на всяка стъпка** и да ги подрежда заедно като редове **след
 *    филтъра**. А когато е **изключен фултъра** там се показва **днената сесия
 *    за всеки редактор** който е конкретния служиттел. Те се записват обаче под
 *    съответния ред където е само редактора и **по тайминга на записа** се
 *    пидреждат под неговот име." *(р84·[20])*
 *
 * Описът на дълга го нарича „НАЙ-ЧИСТАТА негова находка" — цяло негово
 * съобщение, без Q:/A: строеж, и точно то нямаше ред никъде.
 *
 * ═══ КАКВО Е ЕДНА СЕСИЯ ═══
 *
 * ДВОЙКАТА (кой · ден). Не „от влизане до излизане": влизането не е събитие в
 * Журнала и не бива да става такова — иначе гледането щеше да пише. Денят и
 * името ги носи ВСЯКО събитие, подписани, значи сесията се СМЯТА и е вярна и
 * върху книга, донесена отвън.
 *
 * ВЪТРЕ редовете вървят по ТАЙМИНГА НА ЗАПИСА — негово, дословно — тоест по
 * реда на работата, а не наопаки. САМИТЕ сесии вървят от най-новата назад:
 * човек пита „какво стана днес", не „какво стана през януари".
 *
 * ═══ ТУК НЕ СЕ ПИШЕ НИЩО ═══
 *
 * Целият модул е ЧЕТИВО върху Журнала: нула нови събития, нула нови полета.
 * Затова и работи назад през цялата история, а не само откакто е построен.
 *
 * ═══ КОЙ СТЕСНЯВА (резен 75в · И124 т.2) ═══
 *
 * Датата, името и текстът стесняват през ФИЛТЪРНИЯ ДВИГАТЕЛ на екрана
 * (`app/filtri.ts`) — същите отметки, От–До и търсене като на всяка таблица.
 * Домейнът получава ВЕЧЕ стеснената книга и пази двата закона, които не са
 * на двигателя: изключеният филтър значи ДНЕШНИЯ ден, не „покажи всичко";
 * и сверката вход↔изход минава ПРЕЗ стесненото, та ред да не пада тихо.
 */

import { MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import type { Sabitie } from '../yadro/index.js';

/** Денят на едно събитие · `ts` е ISO, денят са първите десет знака. */
export function denyaNa(s: Sabitie): string {
  return String(s.ts).slice(0, 10);
}

/** Една сесия · всичко, което ЕДИН човек е записал в ЕДИН ден. */
export interface Sesiya {
  /** имейлът на редактора · той е и подписаният `actor` */
  readonly koy: string;
  readonly den: string;
  /** по ТАЙМИНГА НА ЗАПИСА · първото записано е първо */
  readonly redove: readonly Sabitie[];
  /** часът на първия и на последния запис · `ЧЧ:ММ` */
  readonly ot: string;
  readonly do_: string;
  readonly broy: number;
}

/** Часът на едно събитие · `ЧЧ:ММ` от подписаното време. */
function chasa(s: Sabitie): string {
  return String(s.ts).slice(11, 16);
}

/**
 * СЕСИИТЕ · подредени, преброени и сверени.
 *
 * Наредбата вътре е по `ts`, а при равно време — по `seq`. Равното време е
 * истинско: часовникът е с милисекунда, а Вратата може да запише две събития в
 * една и съща. `seq` е монотонен в своята верига и разчупва равенството, без
 * да въвежда ново поле (същият довод като при такта, `takt.ts`).
 */
export function sesiite(sabitiya: readonly Sabitie[]): readonly Sesiya[] {
  const po = new Map<string, Sabitie[]>();
  for (const s of sabitiya) {
    // Разделителят е знак, който НЕ може да е в имейл — иначе адрес с „·"
    // би слял два редактора. Нулевият знак не оцелява в никое поле.
    const klyuch = `${denyaNa(s)}\u0000${s.actor}`;
    const veche = po.get(klyuch);
    if (veche) veche.push(s);
    else po.set(klyuch, [s]);
  }

  const sesii: Sesiya[] = [];
  for (const [klyuch, redove] of po) {
    const [den, koy] = klyuch.split('\u0000') as [string, string];
    const podredeni = [...redove].sort(
      (a, b) => String(a.ts).localeCompare(String(b.ts)) || a.seq - b.seq,
    );
    sesii.push(
      Object.freeze({
        koy,
        den,
        redove: Object.freeze(podredeni),
        ot: chasa(podredeni[0]!),
        do_: chasa(podredeni[podredeni.length - 1]!),
        broy: podredeni.length,
      }),
    );
  }

  // НАЙ-НОВАТА ОТПРЕД · човек пита „какво стана днес", не „какво стана тогава".
  // При един ден — по име, за да е наредбата една и съща при всяко показване.
  return Object.freeze(
    sesii.sort((a, b) => b.den.localeCompare(a.den) || a.koy.localeCompare(b.koy)),
  );
}

/**
 * ДНЕВНАТА СЕСИЯ за всеки редактор · негово „когато е изключен фултъра".
 *
 * Изключеният филтър НЕ значи „покажи всичко" — значи „покажи ДНЕШНИЯ ден".
 * Целият Журнал наведнъж е износът, не екранът.
 */
export function dnevnitteSesii(
  sabitiya: readonly Sabitie[],
  dnes: string,
): readonly Sesiya[] {
  return sesiite(sabitiya.filter((s) => denyaNa(s) === dnes));
}

/**
 * СВЕРКА ВХОД↔ИЗХОД · нито един ред не пада между сесиите (правило 7).
 *
 * ВХОД: колко събития са минали стесняването. ИЗХОД: колко реда носят
 * сесиите. Разликата се записва и когато е нула — тя лови точно едно:
 * събитие, което филтърът е пуснал, а групирането е изгубило. Такова нещо
 * на екран изглежда като „човекът не е работил", а не като грешка.
 */
export function sveriSesiite(
  prezFiltara: readonly Sabitie[],
  sesii: readonly Sesiya[],
  kogato: string,
): Sverka {
  const izhod = sesii.reduce((sbor, s) => sbor + s.broy, 0);
  return sverka('сесии на редактора', prezFiltara.length, izhod, kogato, MERKA.broy);
}

/** Целият изглед · сесиите и сверката, на едно място. */
export interface ZhurnalatZaEkrana {
  readonly izklyuchen: boolean;
  readonly sesii: readonly Sesiya[];
  readonly sverka: Sverka;
}

/**
 * `filtrirani` е книгата СЛЕД стесняването от двигателя на екрана;
 * `null` значи „нито един филтър не е пипнат" — тогава важи законът за
 * ДНЕШНИЯ ден. Двете не се сливат: празен резултат от истински филтър е
 * отговор, а не покана да се покаже друго.
 */
export function zhurnalatZaEkrana(
  sabitiya: readonly Sabitie[],
  filtrirani: readonly Sabitie[] | null,
  dnes: string,
  kogato: string,
): ZhurnalatZaEkrana {
  const izklyuchen = filtrirani === null;
  const deystvashti = izklyuchen
    ? sabitiya.filter((s) => denyaNa(s) === dnes)
    : filtrirani;
  const sesii = sesiite(deystvashti);
  return Object.freeze({
    izklyuchen,
    sesii,
    sverka: sveriSesiite(deystvashti, sesii, kogato),
  });
}
