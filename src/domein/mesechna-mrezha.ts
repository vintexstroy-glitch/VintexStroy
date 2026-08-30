/**
 * МЕСЕЧНАТА МРЕЖА · календарът, ден по ден, с ДВЕТЕ числа (резен 40 · M11 · И90).
 *
 * ═══ НЕГОВАТА ДУМА · дословно ═══
 *
 * „…и общата сума на всички показан в Приходи когато дойде време и в календара.
 * **Както и всички приходи и разходи са с цифри в полето на календара.**"
 * *(И90 · 23.08 · `docs/izvori/02-po-temi.md:353`)*
 *
 * И светофарът, който календара го назовава пряко: „в момента когато праща
 * **напомнянв на календа** цвета на цифрите се променя…" *(р59·[71])*.
 *
 * ═══ НАХОДКА · ЧИСЛОТО ГО ИМАШЕ, МЯСТОТО — НЕ ═══
 *
 * `sumiZaDen` стои в `otcheti.ts` от резените с Отчетите, сверена и с тестове —
 * и с бележка в собствената си шапка: „ЧИСЛОТО Е ТУК, МЯСТОТО ГО НЯМА…
 * Онова, което липсва, е КАЛЕНДАРЪТ: месечна мрежа с ден по ден, в която да
 * застанат двете числа."
 *
 * До днес нито един ЖИВ викащ не я ползваше — само тестовете ѝ. По мярката на
 * ADR-041 това е надпис, който чакаше своя дом. Този резен му е домът.
 *
 * ═══ ЗАЩО НЕ СЕ КАЗВА „КАЛЕНДАР" ═══
 *
 * `kalendar.ts` вече е зает и носи СЪВСЕМ друго: поканата в календара на Google
 * (ADR-064) — чужд факт, който НЕ влиза в Журнала. Двете нямат обща работа, и
 * едно име за двете щеше да ги слее в главата на всеки, който търси „календара".
 * Тук се рисува мрежа от НАШИ числа; там се говори с чужд сървър.
 *
 * ═══ ЧЕТИРИ РЕШЕНИЯ, И ВСЯКО ИМА ЦЕНА ═══
 *
 * 1 · СЕДМИЦАТА ПОЧВА В ПОНЕДЕЛНИК. Българската норма. Неделя-първа мести
 *     съботата и неделята в средата на реда и уикендът престава да се вижда
 *     като едно.
 *
 * 2 · ЧУЖДИЯТ ДЕН СТОИ, НО Е ПРАЗЕН. Мрежата е правоъгълна — иначе денят от
 *     седмицата се измества. Затова първата и последната седмица носят дни от
 *     съседните месеци. Те се рисуват СИВИ и БЕЗ числа: показани с числа, окото
 *     ги събира заедно с месеца и получава сбор, различен от онзи, който пише
 *     отдолу. Махнати съвсем, решетката се изкривява.
 *
 * 3 · ДВЕТЕ ЧИСЛА НЕ СЕ СЛИВАТ. Решението е старо и стои в `sumiZaDen`:
 *     „Ден с 1 000 приход и 1 000 разход не е празен ден; неттото би го
 *     направило такъв." Мрежата го наследява, не го преоткрива.
 *
 * 4 · ПРИХОДЪТ Е СЪБРАНОТО, не начисленото — също наследено: календарът е за
 *     ДНИ, а начислението няма ден, то има падеж.
 */

import { sumiZaDen } from './otcheti.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

/** Дните на седмицата, от ПОНЕДЕЛНИК · надписите на главата. */
export const DNITE_NA_SEDMITSATA = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'] as const;

export class GreshkaMrezha extends Error {
  constructor(kakvo: string) {
    super(kakvo);
    this.name = 'GreshkaMrezha';
  }
}

export interface KletkaNaMrezhata {
  /** ГГГГ-ММ-ДД */
  readonly data: string;
  /** числото на деня · 1–31 */
  readonly den: number;
  /** от ИСКАНИЯ месец ли е · чуждият държи решетката и нищо друго */
  readonly svoy: boolean;
  readonly prihod_st: number;
  readonly razhod_st: number;
}

export interface MesechnaMrezha {
  readonly period: string;
  /** редовете · всеки със СЕДЕМ клетки, винаги */
  readonly sedmitsi: readonly (readonly KletkaNaMrezhata[])[];
  /** сборовете на СВОИТЕ дни · чуждите не влизат */
  readonly prihod_st: number;
  readonly razhod_st: number;
  /** колко дни от месеца носят пари · брои се, не се твърди */
  readonly dniSPari: number;
}

/** Проверява „ГГГГ-ММ" и връща двете числа · нечетимият период КРЕЩИ. */
function razglobi(period: string): { godina: number; mesets: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) {
    throw new GreshkaMrezha(
      `Нечетим период „${period}". Очаква се ГГГГ-ММ. Мрежа на неразбран месец ` +
        'би се нарисувала празна и щеше да мине за месец без движение.',
    );
  }
  const mesets = Number(m[2]);
  if (mesets < 1 || mesets > 12) {
    throw new GreshkaMrezha(`Месец ${mesets} не съществува. Периодът е „${period}".`);
  }
  return { godina: Number(m[1]), mesets };
}

function denKato(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * МЕСЕЦЪТ НАПРЕД ИЛИ НАЗАД · за двете стрелки на екрана.
 *
 * Смята се от ПЕРИОДА, не с добавяне на месец към дата: 31 януари плюс месец
 * дава 3 март при наивно събиране, а мрежата иска ФЕВРУАРИ.
 */
export function sledvashtMesets(period: string, napred: number): string {
  const { godina, mesets } = razglobi(period);
  const obshto = godina * 12 + (mesets - 1) + napred;
  const g = Math.floor(obshto / 12);
  const m = obshto - g * 12 + 1;
  return `${String(g).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

/**
 * ГОЛАТА МРЕЖА · само датите, без пари. Чиста функция, за да има тест.
 *
 * Връща ЦЕЛИ седмици — толкова, колкото трябват, за да се поберат всички дни на
 * месеца, като първата почва от понеделника преди (или на) първо число.
 */
export function mrezhataNaMesetsa(period: string): readonly (readonly string[])[] {
  const { godina, mesets } = razglobi(period);
  const parvi = Date.UTC(godina, mesets - 1, 1);
  // `getUTCDay` брои от НЕДЕЛЯ (0); тук понеделникът е 0.
  const otmestvane = (new Date(parvi).getUTCDay() + 6) % 7;
  const dniVMesetsa = new Date(Date.UTC(godina, mesets, 0)).getUTCDate();
  const broyKletki = Math.ceil((otmestvane + dniVMesetsa) / 7) * 7;

  const sedmitsi: string[][] = [];
  for (let i = 0; i < broyKletki; i += 1) {
    if (i % 7 === 0) sedmitsi.push([]);
    sedmitsi[sedmitsi.length - 1]!.push(denKato(parvi + (i - otmestvane) * 86_400_000));
  }
  return Object.freeze(sedmitsi.map((s) => Object.freeze(s)));
}

/**
 * МРЕЖАТА С ПАРИТЕ · датите, напълнени с двете числа.
 *
 * Парите идват от `sumiZaDen` — ЕДНАТА обиколка по дните, същата, която храни и
 * решетката на Ганта. Втора сметка тук би се разминала с нея при първата
 * поправка, и двата екрана щяха да казват различно за едни и същи пари.
 */
export function mrezhataNa(o: Ogledalo, period: string): MesechnaMrezha {
  const poDen = new Map<string, { prihod_st: number; razhod_st: number }>();
  for (const d of sumiZaDen(o, period)) {
    const v = poDen.get(d.data) ?? { prihod_st: 0, razhod_st: 0 };
    v.prihod_st += d.prihod_st;
    v.razhod_st += d.razhod_st;
    poDen.set(d.data, v);
  }

  let prihod_st = 0;
  let razhod_st = 0;
  let dniSPari = 0;
  const sedmitsi = mrezhataNaMesetsa(period).map((sedmitsa) =>
    Object.freeze(
      sedmitsa.map((data) => {
        const svoy = data.slice(0, 7) === period;
        // ПАЗАЧЪТ ЗА ЧУЖДИЯ ДЕН НЕ Е ТУК, и това е нарочно (находка, резен 40).
        // Първата версия питаше `svoy ? poDen.get(data) : undefined` — пазач,
        // който НЕ МОЖЕ да се задейства: `sumiZaDen` вече е отрязала месеца,
        // тъй че в картата няма чужда дата. Нарочното му счупване МИНА, защото
        // нямаше как да се различи. Махнат е по мярката на ADR-041: пазач,
        // който никога не пази, чете се като „тук се решава нещо", а не се.
        // Чуждият ден остава без пари по ДВЕ истински причини — рязането горе
        // и `if (svoy)` долу — и двете счупени нарочно, и двете паднаха.
        const pari = poDen.get(data);
        const p = pari?.prihod_st ?? 0;
        const r = pari?.razhod_st ?? 0;
        if (svoy) {
          prihod_st += p;
          razhod_st += r;
          if (p !== 0 || r !== 0) dniSPari += 1;
        }
        return Object.freeze({ data, den: Number(data.slice(8, 10)), svoy, prihod_st: p, razhod_st: r });
      }),
    ),
  );

  return Object.freeze({ period, sedmitsi: Object.freeze(sedmitsi), prihod_st, razhod_st, dniSPari });
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * ВХОД: сборът приход+разход, както го дава `sumiZaDen` за месеца.
 * ИЗХОД: сборът на СВОИТЕ клетки в мрежата.
 *
 * Разлика значи ден, паднал между двете — най-тихата възможна повреда тук,
 * защото мрежа с една липсваща клетка изглежда точно като пълна.
 */
export function sveriMrezhata(o: Ogledalo, period: string, kogato: string): Sverka {
  let vhod = 0;
  for (const d of sumiZaDen(o, period)) vhod += d.prihod_st + d.razhod_st;
  const m = mrezhataNa(o, period);
  return sverka(
    'календарът · дните на месеца ↔ клетките',
    vhod,
    m.prihod_st + m.razhod_st,
    kogato,
    MERKA.pari,
  );
}
