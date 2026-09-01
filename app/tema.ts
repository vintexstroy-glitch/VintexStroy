/**
 * ДВЕТЕ ТЕМИ НА НАТОВАРВАНЕТО · „Начални" и „Основни" (резен 78 · И124 т.5).
 *
 * Негови думи, 31.08:
 *
 *   „Там е и **трите бутона които не работя добре** за гъстотата и ширината
 *    на таблиците, **те да са 2 броя и да са теми за натоварването с
 *    обяснение за функциите, да са Начални и Основни когато е опозната
 *    работата** и да са изнесени в дясно **и да се избира и от там освен в
 *    настройки** как да рабори като режим."
 *
 * Трите готови гъстоти (сбито · средно · широко, 27.08) са надживени: вместо
 * три числа без думи — ДВЕ теми с обяснение. ЧИСЛАТА ИМ ГИ НЯМАШЕ никъде —
 * премерени са и се ПРЕДЛАГАТ (ADR-135): „Начални" е 48px — премереният ред
 * от резен 8 (49px), онова, което вече стои на екрана; „Основни" е 32px —
 * долната готова гъстота, при която редът спира на текста, не под него.
 *
 * ═══ ВИСОЧИНАТА, НЕ ШИРИНАТА ═══
 *
 * Той каза „за гъстотата и ширината", но ширината има ПО-СТАР негов закон:
 * „за колоните не важи" (27.08 · ADR-059 §В) — ширината живее в КОЛОНАТА и
 * тема не я пипа. Новата дума не носи число за ширина, старата носи закон —
 * двете се записват в ADR-135, а темата мени само височината на реда.
 *
 * ═══ ТЕМАТА Е ПОДРАЗБРАНОТО · ВЛАЧЕНЕТО БИЕ ═══
 *
 * Темата слага ЕДНО число на корена (`--tema-red-visochina`); таблиците го
 * наследяват. Ръчното влачене по ръба (Ексел-жестът) остава и БИЕ темата за
 * своята таблица — по-тясното решение бие по-широкото (същият ред като при
 * правата, правило 23).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

export const TEMI = ['nachalni', 'osnovni'] as const;
export type Tema = (typeof TEMI)[number];

export const IMENA_NA_TEMITE: Readonly<Record<Tema, string>> = Object.freeze({
  nachalni: 'Начални',
  osnovni: 'Основни',
});

/** „с обяснение за функциите" · думите стоят ДО избора, не в документ. */
export const OBYASNENIYA: Readonly<Record<Tema, string>> = Object.freeze({
  nachalni: 'по-широки редове · за начало, докато работата се опознае',
  osnovni: 'сбити редове · повече на екрана, когато е опозната работата',
});

/** Височината на реда по тема · премерените числа, предложени в ADR-135. */
export const VISOCHINI_NA_TEMITE: Readonly<Record<Tema, number>> = Object.freeze({
  nachalni: 48,
  osnovni: 32,
});

const KLYUCH = 'tema.natovarvane';

/** Прочетеното · непозната стойност пада на „Начални", не гърми. */
export function izbranataTema(): Tema {
  const kazano = chetiEkranno<string>(KLYUCH, 'nachalni');
  return (TEMI as readonly string[]).includes(kazano) ? (kazano as Tema) : 'nachalni';
}

/** Слага числото на КОРЕНА · оттам го наследяват всички таблици. */
function prilozhiTemata(): void {
  const t = izbranataTema();
  document.documentElement.style.setProperty(
    '--tema-red-visochina',
    `${VISOCHINI_NA_TEMITE[t]}px`,
  );
  document.documentElement.dataset['tema'] = t;
}

/** Изборът на тема · две радио-подобни копчета с обяснение. */
export function izboratNaTema(): string {
  const sega = izbranataTema();
  return `<div class="temite" role="group" aria-label="Тема на натоварването">
    ${TEMI.map(
      (t) => `<label class="tema-red">
        <input translate="no" type="radio" name="tema-natovarvane" data-tema-izbor="${t}"
          ${t === sega ? 'checked' : ''}>
        <b>${IMENA_NA_TEMITE[t]}</b>
        <span class="drebno">${OBYASNENIYA[t]}</span>
      </label>`,
    ).join('')}
  </div>`;
}

/**
 * Закача темата · вика се СЛЕД всяко рисуване, чрез делегиране: изборът
 * живее и в профила, и в Настройки („и от там освен в настройки") — двете
 * дръжки на една врата, едно число в паметта.
 */
export function zakachiTemata(koren: HTMLElement): void {
  prilozhiTemata();
  if (koren.dataset['temaZakachena'] === 'da') return;
  koren.dataset['temaZakachena'] = 'da';
  koren.addEventListener('change', (e) => {
    const izbor = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tema-izbor]');
    if (!izbor) return;
    zapomniEkranno(KLYUCH, izbor.dataset['temaIzbor']!);
    prilozhiTemata();
    // ВСИЧКИ избори се сверяват · профилът и Настройки показват едно и също.
    for (const drug of document.querySelectorAll<HTMLInputElement>('[data-tema-izbor]')) {
      drug.checked = drug.dataset['temaIzbor'] === izbranataTema();
    }
  });
}
