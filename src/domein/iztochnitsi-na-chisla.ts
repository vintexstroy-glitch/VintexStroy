/**
 * ИЗТОЧНИЦИТЕ НА ЧИСЛА · какво може да сочи една формула „между всички
 * таблици" (резен 42 · M11 · И90).
 *
 * ═══ НЕГОВАТА ДУМА · дословно ═══
 *
 * „За финанситее ще хледаш формулата ще правиш **полета в Секция Отчети** където
 * ще се сложар полета които да покзват тези стойности **с формули между всички
 * таблици** нак вероятно."
 * *(И90 · 23.08 · `docs/izvori/02-po-temi.md:353`)*
 *
 * ЕДНО негово изречение, ДВА дома (правило 22). Първата половина — „всички
 * приходи и разходи са с цифри в полето на календара" — е платена в резен 40
 * (ADR-100). Тази е втората.
 *
 * ═══ ЗАЩО ОТДЕЛЕН РЕГИСТЪР ═══
 *
 * „Между ВСИЧКИ таблици" иска отговор на въпроса „кои са всички". Той не се
 * пише на ръка: числата вече живеят в СВОИТЕ домове — Отчетите, коефициентите
 * и данните на периода — и този модул ги СЪБИРА, без да ги преписва (правило 17).
 * Списък, преписан тук, щеше да остарява при всяко ново поле там.
 *
 * ═══ ЛИПСВАЩОТО ЧИСЛО СИ ОСТАВА ЛИПСВАЩО ═══
 *
 * Коефициент без данни връща `undefined` и казва ЗАЩО (ADR-079). Тук това не се
 * заглажда до нула: нула в знаменателя на чужда формула е тиха лъжа, а „не се
 * смята, защото няма начално салдо" е отговор, който човек може да поправи.
 */

import { danniZaPerioda, KOEFITSIENTI, smetniKoefitsient, type Merka } from './koefitsienti.js';
import { otcheti } from './otcheti.js';
import type { VidStoynost } from './vid-stoynost.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

export interface IztochnikNaChislo {
  /** „otchet:kapital" · „koef:dscr" · „danni:prihod" — домът е в представката */
  readonly klyuch: string;
  readonly ime: string;
  /** от коя таблица идва · за менюто, групирано по произход */
  readonly otkade: string;
  /** цяло число според мярката · `undefined` значи „не се смята" */
  readonly stoynost: number | undefined;
  readonly merka: Merka | 'broy';
  /** празно, когато има стойност; иначе причината С ДУМИ */
  readonly zashto: string;
}

/**
 * МЯРКАТА → ВИДЪТ на стойността · за да ползва формулата ЕДНИ правила.
 *
 * `formuli.ts` вече решава кое с кое се умножава и кое се сборува (ADR-…), и
 * тези правила НЕ се преписват тук — превежда се само речникът. „Пъти" и „дни"
 * са числа: те се сборуват и умножават като числа, но не са пари.
 */
export function vidNaIztochnika(m: Merka | 'broy'): VidStoynost {
  if (m === 'pari') return 'evro';
  if (m === 'protsent') return 'protsent';
  return 'chislo';
}

/** Броят на изворите се БРОИ от живия код, не се твърди в изречение. */
export function iztochnitsiteNaChisla(
  o: Ogledalo,
  period: string,
  ot: string,
  doo: string,
  kogato: string,
): readonly IztochnikNaChislo[] {
  const spisak: IztochnikNaChislo[] = [];

  // 1 · ОТЧЕТИТЕ · петте полета, всяко с думите си защо чака (ADR-017).
  //
  // НЕПЪЛНИЯТ ОТЧЕТ НЕ ДАВА ЧИСЛО. Находка от нарочното счупване (резен 42):
  // първата версия подаваше `p.sbor_st` винаги, а `chaka` слагаше само като
  // предупреждение — тоест поле, построено върху Ликвидност без начално салдо
  // на банката, показваше СМЕТНАТ отговор от частичен сбор. Числото изглеждаше
  // цяло; сборът зад него не беше.
  //
  // Сега липсата се държи като липса — точно както при коефициентите, и точно
  // както файлът обещава в шапката си. Частичният сбор си стои в Отчети, където
  // до него пише какво чака; тук той не се подава на чужда формула.
  for (const p of otcheti(o, period, kogato).poleta) {
    const nepalno = p.chaka.length > 0;
    spisak.push(
      Object.freeze({
        klyuch: `otchet:${p.klyuch}`,
        ime: p.ime,
        otkade: 'Отчети',
        stoynost: nepalno ? undefined : p.sbor_st,
        merka: 'pari' as const,
        zashto: nepalno ? `непълно: чака ${p.chaka.join(' · ')}` : '',
      }),
    );
  }

  // 2 · КОЕФИЦИЕНТИТЕ · тринайсетте, с мерките си (ADR-079).
  const danni = danniZaPerioda(o, ot, doo);
  for (const k of KOEFITSIENTI) {
    const s = smetniKoefitsient(k, danni);
    spisak.push(
      Object.freeze({
        klyuch: `koef:${k.klyuch}`,
        ime: k.ime,
        otkade: 'Коефициенти',
        stoynost: s.stoynost,
        merka: k.merka,
        zashto: s.zashto,
      }),
    );
  }

  // 3 · ДАННИТЕ НА ПЕРИОДА · сборовете на самите таблици — Пари, Сметки,
  // Продажби, Кредити. Тук „между всички таблици" става буквално.
  const kamPari: readonly (readonly [keyof typeof danni, string])[] = [
    ['prihod_st', 'Приход (събран)'],
    ['nachisleno_st', 'Начислено'],
    ['razhod_st', 'Разход (всичко)'],
    ['operativni_st', 'Оперативни разходи'],
    ['krediti_st', 'Вноски по кредити'],
    ['dds_za_vnasyane_st', 'ДДС за внасяне'],
    ['sredstva_st', 'Средства'],
    ['vzemaniya_st', 'Вземания'],
    ['zadalzheniya_st', 'Задължения'],
    ['obezpechenie_st', 'Обезпечение'],
  ];
  for (const [pole, ime] of kamPari) {
    spisak.push(
      Object.freeze({
        klyuch: `danni:${String(pole)}`,
        ime,
        otkade: 'Данни на периода',
        stoynost: danni[pole],
        merka: 'pari' as const,
        zashto: '',
      }),
    );
  }
  const kamBroy: readonly (readonly [keyof typeof danni, string])[] = [
    ['zaeti', 'Заети обекти'],
    ['vsichki_obekti', 'Всички обекти'],
    ['dni', 'Дни в периода'],
    ['mesetsi', 'Месеци в периода'],
  ];
  for (const [pole, ime] of kamBroy) {
    spisak.push(
      Object.freeze({
        klyuch: `danni:${String(pole)}`,
        ime,
        otkade: 'Данни на периода',
        stoynost: danni[pole],
        merka: 'broy' as const,
        zashto: '',
      }),
    );
  }

  return Object.freeze(spisak);
}

/** Един извор по ключ · `undefined`, когато ключът сочи никъде. */
export function iztochnikPoKlyuch(
  spisak: readonly IztochnikNaChislo[],
  klyuch: string,
): IztochnikNaChislo | undefined {
  return spisak.find((i) => i.klyuch === klyuch);
}
