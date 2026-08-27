/**
 * РАЗМЕРЪТ НА ТЕКСТА · лост, видим по всяко време.
 *
 * Негови думи, 27.08:
 *
 *   „**Бутоните за размера на текста да е видим по всяко време горе в дясно, на
 *    всеки прозорец.**"
 *
 * ═══ ТОВА НЕ Е ПРЕМЕСТВАНЕ НА БУТОН · ТО Е ЛИПСВАЩ ЛОСТ ═══
 *
 * СКАЛАТА съществува от резен 1 — `--text-base` и седемте стъпала над нея. Но
 * човек нямаше как да я пипне: нито един бутон, нито една настройка. Тоест
 * дотук приложението имаше размер на текста и нямаше размер на текста.
 *
 * ═══ И ЕДНА ПО-СТАРА НЕГОВА ДУМА, КОЯТО НЕ СЕ СЛИВА С ТАЗИ ═══
 *
 * *(р83·[99] · 12.08)*: „свойство на всяка колона. от настройки може да
 * редактираш за всички таблици някъде **с размер на текста** и корекция на броя
 * запетаи, за различни бизнеси е необходимо."
 *
 * Онова е НАСТРОЙКА — за бизнеса, при колоните, в Настройки. Това е ЛОСТ — за
 * окото, тук и сега. Двете не си противоречат и НЕ се сливат: лостът мени
 * `--golemina` и нищо друго, и не докосва „свойството на колоната".
 *
 * ═══ ЗАЩО МНОЖИТЕЛ, А НЕ НОВА СКАЛА ═══
 *
 * `--text-base` е `clamp(…rem…)` и следва настройката на устройството (резен 1).
 * Лостът я УМНОЖАВА, вместо да я замени: човек със слабо зрение, който си е
 * вдигнал шрифта в браузъра, инак би загубил своето при първото натискане.
 *
 * ═══ ЗАЩО НА КОРЕНА ═══
 *
 * „На всеки прозорец" излиза ДАРОМ, ако числото стои на `documentElement`:
 * изскачащият прозорец виси на `body` (`prozorets.ts`), значи наследява същата
 * променлива. Сложено на `.telo`, то щеше да спре точно на границата на
 * прозореца — и обещанието му щеше да е вярно навсякъде освен там, където се
 * чете най-дребният текст.
 *
 * Лостът се РИСУВА и на двете места (шапката и прозореца), защото прозорецът
 * покрива шапката: лост зад воала е лост, който го няма.
 *
 * ═══ ЗАЩО В ПАМЕТТА НА ЕКРАНА ═══
 *
 * „Колко едър ми е текстът" е ПОГЛЕД, не факт (ADR-022 · правило 23).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

export const GOLEMINI = ['drebno', 'normalno', 'edro'] as const;
export type Golemina = (typeof GOLEMINI)[number];

const IMENA: Readonly<Record<Golemina, string>> = Object.freeze({
  drebno: 'Дребен текст',
  normalno: 'Нормален текст',
  edro: 'Едър текст',
});

/**
 * МНОЖИТЕЛИТЕ · три стъпала, не плъзгач.
 *
 * Плъзгачът дава безкрайно много състояния, от които едно е вярното и никое
 * няма име. Три стъпала се помнят с дума и се казват на глас.
 */
export const MNOZHITELI: Readonly<Record<Golemina, number>> = Object.freeze({
  drebno: 0.9,
  normalno: 1,
  edro: 1.15,
});

const KLYUCH = 'tekst.golemina';

/** Прочетеното · непозната стойност пада на нормалното, не гърми. */
function izbranataGolemina(): Golemina {
  const kazano = chetiEkranno<string>(KLYUCH, 'normalno');
  return (GOLEMINI as readonly string[]).includes(kazano) ? (kazano as Golemina) : 'normalno';
}

/** Знакът на всяко стъпало · дума не се побира горе вдясно, буквата — да. */
const ZNATSI: Readonly<Record<Golemina, string>> = Object.freeze({
  drebno: 'A',
  normalno: 'A',
  edro: 'A',
});

/**
 * Разметката на лоста · ЕДИН дом, две места на рисуване.
 *
 * Трите „A" се различават по РАЗМЕР, не по знак — точно както лостът прави с
 * текста. Всяко носи и `aria-label` с дума, защото буква сама не се чете от
 * четец на екран.
 */
export function lostatNaGoleminata(): string {
  const sega = izbranataGolemina();
  return (
    `<span class="goleminata" role="group" aria-label="Размер на текста">` +
    GOLEMINI.map(
      (g) =>
        `<button type="button" class="golemina-${g}" data-golemina="${g}" title="${IMENA[g]}"` +
        ` aria-label="${IMENA[g]}" aria-pressed="${g === sega ? 'true' : 'false'}">${ZNATSI[g]}</button>`,
    ).join('') +
    `</span>`
  );
}

/** Слага числото на КОРЕНА · оттам го наследяват и екранът, и прозорците. */
function prilozhiGoleminata(): void {
  document.documentElement.style.setProperty(
    '--golemina',
    String(MNOZHITELI[izbranataGolemina()]),
  );
}

/**
 * Закача лоста · вика се СЛЕД всяко рисуване И при отваряне на прозорец.
 *
 * Слуша на подаденото поддърво чрез делегиране: бутоните се раждат наново при
 * всяко рисуване, а прозорецът се ражда след него.
 */
export function zakachiGoleminata(koren: ParentNode): void {
  prilozhiGoleminata();
  for (const kutiya of koren.querySelectorAll<HTMLElement>('.goleminata')) {
    if (kutiya.dataset['zakachena'] === 'da') continue;
    kutiya.dataset['zakachena'] = 'da';
    kutiya.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-golemina]');
      if (!b) return;
      zapomniEkranno(KLYUCH, b.dataset['golemina']!);
      prilozhiGoleminata();
      // ВСИЧКИ лостове се сверяват, не само натиснатият: шапката и прозорецът
      // показват едно и също число и не бива да се разминават.
      for (const drug of document.querySelectorAll<HTMLButtonElement>('[data-golemina]')) {
        drug.setAttribute(
          'aria-pressed',
          drug.dataset['golemina'] === izbranataGolemina() ? 'true' : 'false',
        );
      }
    });
  }
}
