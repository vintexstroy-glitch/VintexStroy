/**
 * МЕСЕЦЪТ КАТО ТАБЛИЦА · храната на счетоводния агент (резен 15б · ADR-005).
 *
 * Негови думи, от които тръгва резенът:
 *
 *   „Никой агент не пише сам… в **Сметки**, където смята и предлага, и
 *    анализира финансовите показатели и отчети — оценява, предлага и показва."
 *                                                            *(ADR-005 · И11)*
 *   „агентът смята, предлага, анализира и ПОКАЗВА — но не записва."  *(И12)*
 *
 * ЗАЩО ТАБЛИЦА, А НЕ БРОЙКИ. Дотук навън излизаха сборове и бройки:
 * „Приходи: 1 700,00 € (2 плащания)". От такова изречение агентът може да
 * повтори числото и толкова — не може да сравни, не може да намери накъде
 * мърда нещо, не може да покаже КЪДЕ е разминаването. Анализ върху обобщение
 * е мнение; анализ върху таблица е сметка.
 *
 * КАКВО ИЗЛИЗА И КАКВО НЕ. Таблицата носи РАЗДЕЛИТЕ на месеца — потоците,
 * акумулаторите и показателите от Отчетите — с числата им, с числата на
 * ПРЕДХОДНИЯ месец и с разликата. Тя НЕ носи имена на наематели и доставчици:
 * те нямат работа на чужд сървър (ADR-029), а за да се прецени посока, редът
 * на раздела стига. Това не е свенливост — то е границата, отвъд която един
 * бутон „анализирай" би станал бутон „изпрати клиентите ми навън".
 *
 * Δ СЕ СМЯТА, НЕ СЕ ЗАПИСВА — както знакът на колоната (правило 20). Записано
 * число, което е разлика на други две, се разминава с тях при първата поправка.
 *
 * И ТУК СВЕРКАТА Е ЗАДЪЛЖИТЕЛНА (правило 7). Таблица, тръгнала към агент,
 * е вход на партида: ако разделите ѝ не се сберат до онова, което Сметки и
 * Отчети казват поотделно, агентът ще анализира повреден месец и ще звучи
 * убедително. Затова четирите сверки се смятат ТУК и пътуват С таблицата —
 * разликата се показва дори когато е нула.
 */

import { smetki } from './smetki.js';
import { otcheti, type VanshniZaKapitala } from './otcheti.js';
import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Period } from './nachislyavane.js';

/** Трите раздела на месеца. Нов се добавя ТУК, където се вижда. */
export const RAZDELI = ['potok', 'akumulator', 'pokazatel'] as const;

type Razdel = (typeof RAZDELI)[number];

export const IMENA_NA_RAZDELITE: Readonly<Record<Razdel, string>> = Object.freeze({
  potok: 'Поток',
  akumulator: 'Акумулатор',
  pokazatel: 'Показател',
});

/** Един ред от таблицата на месеца. */
export interface RedNaMesetsa {
  readonly razdel: Razdel;
  readonly ime: string;
  /** числото за ТОЗИ месец · цели стотинки */
  readonly stoynost_st: number;
  /** колко записа са го образували · за сверката вход↔изход */
  readonly broy: number;
  /** същото число за ПРЕДХОДНИЯ месец */
  readonly predi_st: number;
  /** едно изречение: какво Е това число */
  readonly kakvo: string;
}

/** Δ спрямо предходния месец · СМЯТА се, не се записва (правило 20). */
export function delta(r: RedNaMesetsa): number {
  return r.stoynost_st - r.predi_st;
}

/**
 * Δ в цели десети от процента · за да се сравняват РЕДОВЕ, не само суми.
 *
 * Връща `undefined`, когато предходният месец е нула: „от нула на нещо" няма
 * процент, а изписан като „+∞ %" или „+100 %" той лъже в двете посоки.
 * Липсата се КАЗВА, вместо да се запълни с измислено число.
 */
export function deltaProtsentiDeseti(r: RedNaMesetsa): number | undefined {
  if (r.predi_st === 0) return undefined;
  return Math.round((delta(r) * 1000) / Math.abs(r.predi_st));
}

interface MesetsatKatoTablitsa {
  readonly period: Period;
  readonly predishniyat: Period;
  readonly glavi: readonly string[];
  readonly redove: readonly RedNaMesetsa[];
  /** четирите сверки · пътуват С таблицата, не се смятат наново от четеца */
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
}

/** Предходният месец · „2026-01" → „2025-12". */
export function predishniyatPeriod(period: Period): Period {
  const [g, m] = period.split('-').map(Number) as [number, number];
  return m === 1
    ? `${g - 1}-12`
    : `${g}-${String(m - 1).padStart(2, '0')}`;
}

/** Редовете на един месец, БЕЗ сверките — за да се вика и за предходния. */
function razdeliteNaMesetsa(
  o: Ogledalo,
  period: Period,
  kogato: string,
  vanshni: VanshniZaKapitala,
): { readonly ime: string; readonly razdel: Razdel; readonly suma_st: number; readonly broy: number; readonly kakvo: string }[] {
  const s = smetki(o, period, kogato);
  const redove: { ime: string; razdel: Razdel; suma_st: number; broy: number; kakvo: string }[] = [];

  for (const r of s.redove) {
    redove.push({
      razdel: 'potok',
      ime: r.ime,
      suma_st: r.suma_st,
      broy: r.broi,
      kakvo: r.belezhka,
    });
  }

  // Акумулаторите · по СТРАНА и по СТАВКА, както ги дава Сметки. Един
  // акумулатор с две ставки дава два реда — ставката е на РЕДА (ADR-009), и
  // слети в един ред двете биха скрили точно това.
  for (const r of s.dds) {
    redove.push({
      razdel: 'akumulator',
      ime: `${r.akumulator.sektor} · ${r.stavka}% · ${r.strana}`,
      suma_st: r.dds_st,
      broy: r.broi,
      kakvo: `ДДС от обща цена ${r.obshta_st} ст. при ставка ${r.stavka}%`,
    });
  }

  for (const p of otcheti(o, period, kogato, vanshni).poleta) {
    redove.push({
      razdel: 'pokazatel',
      ime: p.ime,
      suma_st: p.sbor_st,
      broy: p.sastavki.length,
      kakvo: p.chaka.length === 0 ? p.kakvo : `${p.kakvo} · ЧАКА: ${p.chaka.join(' · ')}`,
    });
  }

  return redove;
}

/**
 * МЕСЕЦЪТ, сглобен като таблица и СВЕРЕН.
 *
 * `kogato` се подава отвън, за да са тестовете повторяеми — същият порт като
 * навсякъде другаде.
 */
export function mesetsatKatoTablitsa(
  o: Ogledalo,
  period: Period,
  kogato: string,
  vanshni: VanshniZaKapitala = {},
): MesetsatKatoTablitsa {
  const predishniyat = predishniyatPeriod(period);
  const sega = razdeliteNaMesetsa(o, period, kogato, vanshni);
  const predi = razdeliteNaMesetsa(o, predishniyat, kogato, vanshni);

  // Съпоставя се ПО ИМЕ на реда. Ред, който го е нямало миналия месец, тръгва
  // от нула — и това е вярното му минало, не липса.
  const predishniPoIme = new Map(predi.map((r) => [`${r.razdel}|${r.ime}`, r.suma_st]));

  const redove: RedNaMesetsa[] = sega.map((r) => ({
    razdel: r.razdel,
    ime: r.ime,
    stoynost_st: r.suma_st,
    broy: r.broy,
    predi_st: predishniPoIme.get(`${r.razdel}|${r.ime}`) ?? 0,
    kakvo: r.kakvo,
  }));

  // ── СВЕРКИТЕ · таблицата ↔ онова, което Сметки и Отчети казват поотделно ──
  const s = smetki(o, period, kogato);
  const ot = otcheti(o, period, kogato, vanshni);
  const dnevnik = new DnevnikNaSverki();

  const sborNa = (izbor: (r: RedNaMesetsa) => boolean): number =>
    redove.filter(izbor).reduce((x, r) => x + r.stoynost_st, 0);

  // Приходът е НАЧИСЛЕНОТО плюс ВНОСКИТЕ по сделка (резен 23 · ADR-083). КЕШ и
  // БАНКА само показват как е дошло и затова не влизат в сбора — иначе едно и
  // също би се броило два пъти.
  //
  // Двата приходни реда стоят ПОИМЕННО, а не „всичко приходно": така новият
  // сбиращ поток утре чупи сверката вместо тихо да се изпусне.
  dnevnik.zapishi(
    sverka(
      `Месецът ${period} · приходните потоци ↔ приход`,
      s.prihod_st + s.prihodProdazhbi_st,
      sborNa((r) => r.razdel === 'potok' && ['Наеми', 'Продажби'].includes(r.ime)),
      kogato,
      MERKA.pari,
    ),
  );

  dnevnik.zapishi(
    sverka(
      `Месецът ${period} · разходните потоци ↔ разход`,
      s.razhod_st,
      sborNa(
        (r) =>
          r.razdel === 'potok' && ['Заплати', 'Кредити', 'Фактури'].includes(r.ime),
      ),
      kogato,
      MERKA.pari,
    ),
  );

  dnevnik.zapishi(
    sverka(
      `Месецът ${period} · акумулаторите ↔ ДДС за внасяне`,
      s.zaVnasyane_st,
      sborNa((r) => r.razdel === 'akumulator' && r.ime.endsWith('изход')) -
        sborNa((r) => r.razdel === 'akumulator' && r.ime.endsWith('вход')),
      kogato,
      MERKA.pari,
    ),
  );

  // Капиталът пътува със своята СОБСТВЕНА сверка (Отчети я смята по два пътя).
  // Тя се пренася тук, вместо да се смята наново: два пътя до едно число са
  // проверка, три са място, където се разминават.
  dnevnik.zapishi(
    sverka(
      `Месецът ${period} · Капиталът ↔ Активи − Задължения`,
      ot.sverka.ot_sastavki_st,
      ot.sverka.aktivi_st - ot.sverka.zadalzheniya_st,
      kogato,
      MERKA.pari,
    ),
  );

  return Object.freeze({
    period,
    predishniyat,
    glavi: Object.freeze(['Раздел', 'Ред', 'Сега', 'Предходен', 'Разлика', 'Брой']),
    redove: Object.freeze(redove),
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0,
  });
}

/**
 * ТАБЛИЦАТА, изписана като ТЕКСТ · това тръгва навън към агента.
 *
 * Разделено с табулация, защото това е форматът, който и Ексел разбира, и
 * моделът чете без да гадае къде свършва колоната. Сумите излизат в ЕВРО с
 * точка — не защото навън се смята в дробни числа, а защото навън се ЧЕТЕ:
 * вътре стотинката си остава цяла и никой float не пипа Журнала (правило 3).
 */
export function kamTekst(t: MesetsatKatoTablitsa): string {
  const evro = (st: number): string => (st / 100).toFixed(2);
  const redove = t.redove.map((r) => {
    const d = delta(r);
    const p = deltaProtsentiDeseti(r);
    return [
      IMENA_NA_RAZDELITE[r.razdel],
      r.ime,
      evro(r.stoynost_st),
      evro(r.predi_st),
      `${d >= 0 ? '+' : ''}${evro(d)}${p === undefined ? '' : ` (${p >= 0 ? '+' : ''}${(p / 10).toFixed(1)}%)`}`,
      String(r.broy),
    ].join('\t');
  });

  const sverki = t.sverki.map(
    (s) => `${s.kakvo}: вход ${evro(s.vhod)} · изход ${evro(s.izhod)} · разлика ${evro(s.razlika)}`,
  );

  return [
    `МЕСЕЦ ${t.period} (сравнен с ${t.predishniyat}) · всички суми в евро`,
    t.glavi.join('\t'),
    ...redove,
    '',
    'СВЕРКИ (разликата се показва и когато е нула):',
    ...sverki,
    t.nared
      ? 'Всички сверки затварят.'
      : 'ВНИМАНИЕ: сверка НЕ затваря — числата по-долу може да са непълни.',
  ].join('\n');
}
