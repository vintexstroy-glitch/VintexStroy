/**
 * АКТУАЛИЗАЦИЯ ОТ ИЗТОЧНИК · поправеният файл среща Журнала.
 *
 * Думата на собственика: поправяш стария ексел в Драйва, приложението го чете
 * пак и справките излизат чисти — а следата стои в главния Драйв.
 *
 * Тук е другата половина на същото изречение. Журналът е САМО ЗА ДОБАВЯНЕ:
 * поправка = сторно + ново, никакъв презапис. Числата на екрана излизат точно
 * като в новия файл, а в Журнала остава кой файл, коя негова версия и кога.
 * Без това хеш-веригата се къса и „Провери веригата" ще вика СКЪСАНА след
 * всяка поправка.
 *
 * Първото четене на период просто записва — няма какво да се поправя.
 * Второто показва РАЗЛИКИТЕ и чака „да".
 */

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { VID } from './sabitiya.js';
import { sborNaSnimka, type RedOtSnimka, type Snimka } from '../iztochnik/snimka.js';
import type { Ogledalo, Razhod } from '../ogledalo/ogledalo.js';
import type { Deystviya } from './deystviya.js';

type KakvoStava = 'nov' | 'promenen' | 'izchezval' | 'bezPromyana';

export interface Razlika {
  readonly klyuch: string;
  readonly kakvo: KakvoStava;
  readonly star?: Razhod;
  readonly nov?: RedOtSnimka;
  /** нова сума − стара; какво мени тегленето на чертата */
  readonly razlika_st: number;
}

export interface Plan {
  readonly snimka: Snimka;
  readonly redove: readonly Razlika[];
  /** ръчно въведените за периода — броят се, но НЕ се пипат */
  readonly rachni: number;
  readonly parvoChetene: boolean;
  readonly sega_st: number;
  readonly sled_st: number;
}

export interface Nastroyki {
  readonly potok: string;
  readonly sektor: string;
  readonly nachin: 'банка' | 'в брой';
}

const TEZHEST: Record<KakvoStava, number> = {
  promenen: 0,
  izchezval: 1,
  nov: 2,
  bezPromyana: 3,
};

/** Разходите за периода, дошли от източник. Ръчните не участват в сравнението. */
export function otIztochnik(o: Ogledalo, period: string): Razhod[] {
  return [...o.razhodi.values()].filter(
    (r) => r.data.slice(0, 7) === period && r.klyuch !== '',
  );
}

function rachniZaPerioda(o: Ogledalo, period: string): number {
  return [...o.razhodi.values()].filter(
    (r) => r.data.slice(0, 7) === period && r.klyuch === '',
  ).length;
}

/** Сравнява снимката с Журнала. Нищо не се записва — само се вижда. */
export function sravni(o: Ogledalo, snimka: Snimka): Plan {
  const sega = otIztochnik(o, snimka.period);
  const poKlyuch = new Map(sega.map((r) => [r.klyuch, r]));
  const redove: Razlika[] = [];

  for (const nov of snimka.redove) {
    const star = poKlyuch.get(nov.klyuch);
    if (!star) {
      redove.push({ klyuch: nov.klyuch, kakvo: 'nov', nov, razlika_st: nov.suma_st });
      continue;
    }
    poKlyuch.delete(nov.klyuch);
    const smenen =
      star.suma_st !== nov.suma_st ||
      star.data !== nov.data ||
      star.dostavchik !== nov.koy ||
      star.opis !== nov.opis ||
      star.dokument !== nov.dokument;
    redove.push({
      klyuch: nov.klyuch,
      kakvo: smenen ? 'promenen' : 'bezPromyana',
      star,
      nov,
      razlika_st: nov.suma_st - star.suma_st,
    });
  }

  // Каквото е останало в Журнала, но го няма в новия файл — махнало се е.
  for (const star of poKlyuch.values()) {
    redove.push({ klyuch: star.klyuch, kakvo: 'izchezval', star, razlika_st: -star.suma_st });
  }

  redove.sort((a, b) => TEZHEST[a.kakvo] - TEZHEST[b.kakvo] || a.klyuch.localeCompare(b.klyuch));

  const sega_st = sega.reduce((s, r) => s + r.suma_st, 0);
  return {
    snimka,
    redove,
    rachni: rachniZaPerioda(o, snimka.period),
    parvoChetene: sega.length === 0,
    sega_st,
    sled_st: sborNaSnimka(snimka),
  };
}

export function imaShtoDaSePravi(plan: Plan): boolean {
  return plan.redove.some((r) => r.kakvo !== 'bezPromyana');
}

interface RezultatAktualizatsiya {
  readonly zapisani: number;
  readonly stornirani: number;
  readonly bezPromyana: number;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

export class GreshkaAktualizatsiya extends Error {
  readonly sverki: readonly Sverka[];

  constructor(message: string, sverki: readonly Sverka[]) {
    super(message);
    this.name = 'GreshkaAktualizatsiya';
    this.sverki = sverki;
  }
}

/**
 * Прилага плана: сторно за старото, ново за новото — и партидата завършва със
 * сверка.
 *
 * `klyuchNaPartidata` е ключът на ЕДНО натискане на „Приложи" и идва отвън.
 * Правило 20, дословно: „`opId` носи ДЕЙСТВИЕТО, не съдържанието. Ключ от
 * съдържанието изглежда умен, докато не върнеш нещо към предишното му
 * състояние: тогава повторният ключ връща стария резултат и поправката
 * изчезва мълчаливо."
 *
 * Точно това стоеше тук: ключът се вадеше от отпечатъка на файла. Поправяш
 * ред, прилагаш, връщаш реда както е бил, прилагаш пак — вторият път носи
 * отпечатък, който вече е минавал, и връщането НЕ влиза в Журнала. Файлът
 * казва 600, Журналът казва 650, и никъде няма съобщение за грешка.
 *
 * Отпечатъкът остава там, където му е мястото: в `izvor` на записа като следа
 * и в самоличността на същността, за да се хване „смени ли се нещо изобщо".
 */
export async function prilozhi(
  deystviya: Deystviya,
  plan: Plan,
  n: Nastroyki,
  kogato: string,
  klyuchNaPartidata?: string,
): Promise<RezultatAktualizatsiya> {
  const beleg = plan.snimka.izvor.otpechatak.slice(0, 16);
  // Пропуснат ключ пада към отпечатъка — старото поведение, за да не гръмне
  // вносител, който още не го подава.
  const partida = klyuchNaPartidata ?? beleg;
  const izvor = `${plan.snimka.izvor.ime}@${beleg}`;
  let zapisani = 0;
  let stornirani = 0;
  let bezPromyana = 0;

  const zapishi = async (r: RedOtSnimka) => {
    const rezultat = await deystviya.zapishiRazhod(
      `R:${beleg}:${r.klyuch}`,
      {
        potok: n.potok,
        dostavchik: r.koy,
        opis: r.opis,
        suma_st: r.suma_st,
        sektor: n.sektor,
        nachin: n.nachin,
        data: r.data,
        dokument: r.dokument,
        // Каже ли таблицата ставката на реда — тя надделява над сектора.
        ...(r.stavka === undefined ? {} : { stavka: r.stavka }),
        klyuch: r.klyuch,
        izvor,
      },
      // „Сверена промяна": единственият вход в заключен период — партидата
      // сама си носи сторно + ново + сверка + следа кой файл я е донесъл.
      { opId: `iztochnik:${partida}:${r.klyuch}:nov`, svereno: true },
    );
    if (!rezultat.povtoreno) zapisani += 1;
  };

  const storniray = async (star: Razhod, zashto: string) => {
    const rezultat = await deystviya.storniraj(
      `S:${beleg}:${star.klyuch}`,
      { pogasyavaSeq: star.seq, prichina: `сверена промяна · ${zashto} · ${izvor}` },
      { opId: `iztochnik:${partida}:${star.klyuch}:storno`, svereno: true },
      VID.razhod,
    );
    if (!rezultat.povtoreno) stornirani += 1;
  };

  for (const red of plan.redove) {
    switch (red.kakvo) {
      case 'nov':
        await zapishi(red.nov!);
        break;
      case 'promenen':
        await storniray(red.star!, 'поправено от източника');
        await zapishi(red.nov!);
        break;
      case 'izchezval':
        await storniray(red.star!, 'махнато от източника');
        break;
      default:
        bezPromyana += 1;
        break;
    }
  }

  // Сверка: след прилагането Журналът трябва да казва точно това, което казва файлът.
  const sled = otIztochnik(await deystviya.ogledalo(), plan.snimka.period);
  const dnevnik = new DnevnikNaSverki();
  dnevnik.zapishi(
    sverka(
      `Актуализация ${plan.snimka.period} · сума във файла ↔ в Журнала`,
      sborNaSnimka(plan.snimka),
      sled.reduce((s, r) => s + r.suma_st, 0),
      kogato,
      MERKA.pari,
    ),
  );
  dnevnik.zapishi(
    sverka(
      `Актуализация ${plan.snimka.period} · брой редове ↔ записи`,
      plan.snimka.redove.length,
      sled.length,
      kogato,
      MERKA.broy,
    ),
  );

  const nezatvoreni = dnevnik.nezatvoreni;
  if (nezatvoreni.length > 0) {
    throw new GreshkaAktualizatsiya(
      `Актуализацията за ${plan.snimka.period} не затваря (${nezatvoreni.length} ` +
        `${nezatvoreni.length === 1 ? 'разлика' : 'разлики'}).`,
      dnevnik.vsichki,
    );
  }

  return { zapisani, stornirani, bezPromyana, sverki: dnevnik.vsichki, nared: true };
}
