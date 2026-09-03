/**
 * ЛЕНТАТА НА ПОДТАБОВЕТЕ · ЕДИН механизъм за всеки екран (резен 115 · ADR-161).
 *
 * Негово, 03.09 (И133): „когато цъкнеш на подтаб от менюто **да отваря само
 * секцията вътре, а не да те препраща в скрола**. Искам да са разделени и да са
 * самостоятелни активни подтабове."
 *
 * Резен 112 го построи В Настройки. И136 поиска същото и за Сметки — затова
 * механизмът излиза от онзи файл и застава сам: два екрана, един код. Копие
 * щеше да значи два реда, които се разминават на първата поправка.
 *
 * ═══ КАКВО ЖИВЕЕ ТУК И КАКВО НЕ ═══
 *
 * Тук: лентата, паметта на избора и закачането. НЕ тук: КОИ са подтабовете и
 * коя секция къде — това е ДОМЕЙН и всеки екран си го носи (`temi-nastroyki.ts`
 * за Настройки, `podtabove-smetki.ts` за Сметки). Лентата не знае имена.
 *
 * Изборът е ПОГЛЕД — памет на устройството, нула събития. Журналът не помни на
 * кой таб е стоял човекът, и не бива: това е поглед, не решение.
 */

import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/** Един ред от лентата · толкова знае рисувачът. */
export interface PodtabZaLentata {
  readonly klyuch: string;
  readonly ime: string;
}

/** Ключът в паметта на устройството · един дом за низа (правило 17). */
function klyuchNaPodtaba(ekran: string): string {
  return `${ekran}.podtab`;
}

/**
 * КОЙ Е АКТИВНИЯТ · запомненият, ако още го има, иначе първият.
 *
 * Запомненият може да е чужд (служител на устройството на Стопанина) или
 * изчезнал — тогава се пада на ПЪРВИЯ видим, а не на празно.
 */
export function aktivniyatPodtab(
  ekran: string,
  spisak: readonly PodtabZaLentata[],
  podrazbran: string,
): string {
  const zapomnen = chetiEkranno(klyuchNaPodtaba(ekran), podrazbran);
  return spisak.some((p) => p.klyuch === zapomnen) ? zapomnen : (spisak[0]?.klyuch ?? podrazbran);
}

/**
 * ЛЕНТАТА · бутони, които сменят КОЕ се рисува, не къде скролва.
 *
 * `data-podtabove-na` носи екрана, за да може закачането да пише в неговата
 * памет, а проходът да пита поименно вместо с гол селектор (честност, обход Б).
 */
export function lentataNaPodtabovete(
  ekran: string,
  spisak: readonly PodtabZaLentata[],
  aktiven: string,
  nadpis: string,
): string {
  return `
    <nav class="podtabove" data-podtabove="${spisak.length}" data-podtabove-na="${ekraniraj(ekran)}"
      aria-label="${ekraniraj(nadpis)}">
      ${spisak
        .map(
          (p) => `<button type="button" class="podtab${p.klyuch === aktiven ? ' tuk' : ''}"
        data-podtab="${ekraniraj(p.klyuch)}" aria-pressed="${p.klyuch === aktiven ? 'true' : 'false'}"
        translate="no">${ekraniraj(p.ime)}</button>`,
        )
        .join('')}
    </nav>`;
}

/**
 * ЗАКАЧАНЕТО · пише избора в паметта на СВОЯ екран и прерисува.
 *
 * Екранът се чете от лентата, а не се подава втори път: два източника на един
 * факт се разминават точно когато някой добави трети екран.
 */
export function zakachiPodtabovete(
  koren: ParentNode,
  podrazbran: string,
  prerisuvay: () => Promise<void>,
): void {
  for (const buton of koren.querySelectorAll<HTMLButtonElement>('[data-podtab]')) {
    buton.addEventListener('click', async () => {
      const ekran = buton.closest<HTMLElement>('[data-podtabove-na]')?.dataset['podtaboveNa'] ?? '';
      if (ekran === '') return;
      zapomniEkranno(klyuchNaPodtaba(ekran), buton.dataset['podtab'] ?? podrazbran);
      await prerisuvay();
    });
  }
}
