/**
 * СВЕРКАТА НА ДДС · взех ли си го от всички фактури.
 *
 * Негови думи, и те са сърцето на този файл:
 *
 *   „Клиентът избира да въведе каквото знае, а накрая, когато се прочетат
 *    извлеченията и се вкара колко трябва да се плати, ВЕДНАГА СЕ ХВАЩА
 *    ЛИПСАТА и се намира по извлеченията или липсата на кешови фактури за
 *    покупка или продажба. Всичко се държи под отчет."
 *
 * Дотук Сметки сравняваха ДВЕ числа: изчислено ↔ декларирано ↔ платено. Това
 * казва КОЛКО, но не казва КЪДЕ. Тук влиза третият ъгъл — извлеченията — и
 * заедно трите отговарят на въпроса, който човек всъщност задава:
 *
 *   „Виждам разлика. Къде е тя?"
 *
 * Трите ъгъла и какво значи всеки:
 *
 *   ФАКТУРИ    — какво съм ВЪВЕЛ (ръчно или прочетено от таблица)
 *   ИЗВЛЕЧЕНИЯ — какво е МИНАЛО през банката
 *   ВНЕСЕНО    — какво реално съм платил на държавата
 *
 * Разликата между първите две сочи ПРИЧИНАТА:
 *   · пари в банката без фактура → липсва фактура (или не е въведена)
 *   · фактура без пари в банката → плащане в брой, или неполучено
 *
 * Правило 7: разликата се записва ВИНАГИ, дори когато е нула. Проверената нула
 * е различна от нулата, за която никой не е питал.
 */

import type { Stotinki } from '../yadro/pari.js';

/** Едно движение, откъдето и да идва то. */
export interface Dvizhenie {
  /** ISO дата */
  readonly data: string;
  readonly suma_st: Stotinki;
  /** номер на фактура или платежно — по него се сдвояват двата ъгъла */
  readonly dokument: string;
  readonly opisanie: string;
}

export type Prichina =
  | 'lipsva-faktura' // пари в банката, но няма фактура за тях
  | 'lipsvat-pari'; // фактура има, пари по нея — не

export interface Nesvarshen {
  readonly prichina: Prichina;
  readonly dvizhenie: Dvizhenie;
}

export interface RezultatSverka {
  readonly dds_ot_fakturi_st: Stotinki;
  readonly dds_ot_izvlecheniya_st: Stotinki;
  readonly dds_vneseno_st: Stotinki;
  /** фактури ↔ извлечения · нулата тук значи „всичко се покрива" */
  readonly razlika_st: Stotinki;
  /** изчислено ↔ внесено · това дължа още, или съм надвнесъл */
  readonly ostava_st: Stotinki;
  /** КЪДЕ е разликата — поименно, не като число */
  readonly nesvarsheni: readonly Nesvarshen[];
  readonly svereno: boolean;
}

/** Ключът за сдвояване: документът, изчистен от разстояния и регистър. */
function klyuch(d: Dvizhenie): string {
  return d.dokument.trim().toLowerCase();
}

/**
 * Сверява трите ъгъла и казва КЪДЕ е разликата.
 *
 * Сдвояването е по номер на документ, защото само той е общ между фактурата и
 * платежното. Дата и сума не стигат: две фактури за 1200 лв. в един ден се
 * случват, а два документа с един номер — не.
 *
 * Движение без документ НЕ се преглъща — влиза в несвършените с причина.
 * Мълчаливо пропуснат ред е точно начинът, по който се губят пари.
 */
export function sveriDDS(n: {
  fakturi: readonly Dvizhenie[];
  izvlecheniya: readonly Dvizhenie[];
  dds_ot_fakturi_st: Stotinki;
  dds_ot_izvlecheniya_st: Stotinki;
  dds_vneseno_st: Stotinki;
}): RezultatSverka {
  const poDokument = new Map<string, Dvizhenie>();
  for (const f of n.fakturi) {
    const k = klyuch(f);
    if (k !== '') poDokument.set(k, f);
  }

  const nesvarsheni: Nesvarshen[] = [];
  const vidyani = new Set<string>();

  for (const i of n.izvlecheniya) {
    const k = klyuch(i);
    if (k === '' || !poDokument.has(k)) {
      // Пари минали през банката, а фактура за тях няма.
      nesvarsheni.push({ prichina: 'lipsva-faktura', dvizhenie: i });
    } else {
      vidyani.add(k);
    }
  }

  for (const f of n.fakturi) {
    const k = klyuch(f);
    if (k === '' || !vidyani.has(k)) {
      // Фактура има, но пари по нея не са минали — брой, или неполучено.
      nesvarsheni.push({ prichina: 'lipsvat-pari', dvizhenie: f });
    }
  }

  const razlika = (n.dds_ot_fakturi_st - n.dds_ot_izvlecheniya_st) as Stotinki;
  const ostava = (n.dds_ot_fakturi_st - n.dds_vneseno_st) as Stotinki;

  return {
    dds_ot_fakturi_st: n.dds_ot_fakturi_st,
    dds_ot_izvlecheniya_st: n.dds_ot_izvlecheniya_st,
    dds_vneseno_st: n.dds_vneseno_st,
    razlika_st: razlika,
    ostava_st: ostava,
    nesvarsheni,
    // Сверено значи: числата се покриват И няма несдвоено движение.
    svereno: razlika === 0 && nesvarsheni.length === 0,
  };
}

/** Едно изречение за екрана — какво да прочете човек и къде да гледа. */
export function sDumi(r: RezultatSverka): string {
  if (r.svereno) return 'Сверено · всяка фактура си има движение, всяко движение — фактура.';

  const bezFaktura = r.nesvarsheni.filter((n) => n.prichina === 'lipsva-faktura').length;
  const bezPari = r.nesvarsheni.filter((n) => n.prichina === 'lipsvat-pari').length;
  const chasti: string[] = [];
  if (bezFaktura) chasti.push(`${bezFaktura} движения в банката БЕЗ фактура`);
  if (bezPari) chasti.push(`${bezPari} фактури БЕЗ движение (брой или неполучено)`);
  return chasti.join(' · ') || 'Числата не се покриват, но всяко движение си има двойник.';
}
