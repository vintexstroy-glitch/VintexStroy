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
 */

import { MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import type { Sabitie } from '../yadro/index.js';

/** Какво стеснява гледането · празното поле значи „не стеснявай". */
export interface FiltarNaZhurnala {
  /** ISO `ГГГГ-ММ-ДД` · включително */
  readonly ot: string;
  /** ISO `ГГГГ-ММ-ДД` · включително */
  readonly do_: string;
  /** името (имейлът) на редактора · частично съвпадение */
  readonly koy: string;
  /** свободен текст · търси във вида, същността и товара */
  readonly tarsi: string;
}

export const PRAZEN_FILTAR: FiltarNaZhurnala = Object.freeze({
  ot: '',
  do_: '',
  koy: '',
  tarsi: '',
});

/** Изключен ли е филтърът · негово „когато е изключен фултъра". */
export function filtaratEIzklyuchen(f: FiltarNaZhurnala): boolean {
  return f.ot === '' && f.do_ === '' && f.koy === '' && f.tarsi === '';
}

/** Денят на едно събитие · `ts` е ISO, денят са първите десет знака. */
export function denyaNa(s: Sabitie): string {
  return String(s.ts).slice(0, 10);
}

/**
 * СВЕДЕНОТО за търсене · NFC, малки букви, без околни празни (правило 12).
 *
 * Без него „Иван" и „иван" щяха да са двама редактора, а „й" от две различни
 * клавиатури — две различни имена.
 */
function svedeno(v: string): string {
  return v.normalize('NFC').trim().toLocaleLowerCase('bg');
}

/** Текстът, в който търсенето рови · вид, същност и товар, слепени веднъж. */
function tekstaNa(s: Sabitie): string {
  return svedeno(
    `${s.type} ${s.sashtnost.vid} ${s.sashtnost.id} ${JSON.stringify(s.payload)}`,
  );
}

/** Минава ли едно събитие през филтъра. */
export function prezFiltara(s: Sabitie, f: FiltarNaZhurnala): boolean {
  const den = denyaNa(s);
  if (f.ot !== '' && den < f.ot) return false;
  if (f.do_ !== '' && den > f.do_) return false;
  if (f.koy !== '' && !svedeno(s.actor).includes(svedeno(f.koy))) return false;
  if (f.tarsi !== '' && !tekstaNa(s).includes(svedeno(f.tarsi))) return false;
  return true;
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
export function sesiite(
  sabitiya: readonly Sabitie[],
  f: FiltarNaZhurnala = PRAZEN_FILTAR,
): readonly Sesiya[] {
  const po = new Map<string, Sabitie[]>();
  for (const s of sabitiya) {
    if (!prezFiltara(s, f)) continue;
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
  return sesiite(sabitiya, { ...PRAZEN_FILTAR, ot: dnes, do_: dnes });
}

/** Редакторите, срещани в Журнала · за менюто „име". */
export function redaktorite(sabitiya: readonly Sabitie[]): readonly string[] {
  return Object.freeze([...new Set(sabitiya.map((s) => s.actor))].sort());
}

/**
 * СВЕРКА ВХОД↔ИЗХОД · нито един ред не пада между сесиите (правило 7).
 *
 * ВХОД: колко събития минават филтъра. ИЗХОД: колко реда носят сесиите.
 * Разликата се записва и когато е нула — тя лови точно едно: събитие, което
 * филтърът е пуснал, а групирането е изгубило. Такова нещо на екран изглежда
 * като „човекът не е работил", а не като грешка.
 */
export function sveriSesiite(
  sabitiya: readonly Sabitie[],
  sesii: readonly Sesiya[],
  f: FiltarNaZhurnala,
  kogato: string,
): Sverka {
  const vhod = sabitiya.filter((s) => prezFiltara(s, f)).length;
  const izhod = sesii.reduce((sbor, s) => sbor + s.broy, 0);
  return sverka('сесии на редактора', vhod, izhod, kogato, MERKA.broy);
}

/** Целият изглед · сесиите, редакторите и сверката, на едно място. */
export interface ZhurnalatZaEkrana {
  readonly filtar: FiltarNaZhurnala;
  readonly izklyuchen: boolean;
  readonly sesii: readonly Sesiya[];
  readonly redaktori: readonly string[];
  readonly sverka: Sverka;
}

export function zhurnalatZaEkrana(
  sabitiya: readonly Sabitie[],
  f: FiltarNaZhurnala,
  dnes: string,
  kogato: string,
): ZhurnalatZaEkrana {
  const izklyuchen = filtaratEIzklyuchen(f);
  const deystvasht: FiltarNaZhurnala = izklyuchen
    ? { ...PRAZEN_FILTAR, ot: dnes, do_: dnes }
    : f;
  const sesii = sesiite(sabitiya, deystvasht);
  return Object.freeze({
    filtar: f,
    izklyuchen,
    sesii,
    redaktori: redaktorite(sabitiya),
    sverka: sveriSesiite(sabitiya, sesii, deystvasht, kogato),
  });
}
