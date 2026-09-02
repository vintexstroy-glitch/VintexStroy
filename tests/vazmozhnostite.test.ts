/**
 * ВСЯКА ОБЯВЕНА ВЪЗМОЖНОСТ СТИГА ДО ЕКРАНА · праг НУЛА (резен 93 · И128 · ADR-151).
 *
 * ═══ ЗАЩО МАШИНА, А НЕ ЧЕСТЕН СПИСЪК ═══
 *
 * ADR-041 нарече класа поименно: „обявена възможност без консуматор". ADR-053
 * изчисти три такива на ръка и остави ЧЕСТЕН СПИСЪК — тоест дисциплина.
 *
 * Дисциплината пропусна една: `ogledala` стоеше в таблицата на плановете, имаше
 * своя отметка в Таблото, и НИТО ЕДИН ред код не я питаше. Изгледите „По обект"
 * и „По контрагент" работеха и когато човекът свали отметката — тоест отметката
 * беше НАДПИС, а правило 15 („изключено ≠ липсващо") — нарушено на едно място,
 * без нищо да го покаже.
 *
 * Оттук нататък го брои машина (ADR-056). Тестът чете САМИТЕ файлове: съюзът
 * `Vazmozhnost` е обявеното, а консуматор е `mozhe(…, 'x')` или `iska: 'x'`.
 *
 * ═══ ТРИТЕ, КОИТО НЯМАТ ЕКРАНЕН КОНСУМАТОР · и защо ═══
 *
 * Списъкът НЕ е праг и НЕ е отстъпка — той е ПИН. Всяко име в него носи своята
 * причина; всяко ново име отвън пада тестът. Разхлабен праг не пада никъде
 * (`docs/11`), затова тук се сравняват МНОЖЕСТВА, а не бройки.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PLANOVE = readFileSync('src/domein/planove.ts', 'utf8');

/**
 * ТРИТЕ БЕЗ ЕКРАНЕН КОНСУМАТОР · поименно, с причината до името.
 *
 * Причината се чете тук, а не в доклад: списък без причини се разраства,
 * защото добавянето на ред в него не струва нищо.
 */
const BEZ_EKRANEN_KONSUMATOR: Readonly<Record<string, string>> = Object.freeze({
  zapis:
    'ЗАДЪЛЖИТЕЛНА (ZADALZHITELNI) · тя Е Вратата. Отметка, която не се сваля, ' +
    'няма какво да гаси: без нея няма приложение, а не по-малко приложение.',
  'poveche-hranilishte':
    'ТЪРГОВСКА, не екранна · тя казва че иска ПЛАТЕН план при Google, Microsoft ' +
    'или Apple. Мери се размерът (`hranilishte`), а не се гаси екран.',
  'individualni-razrabotki':
    'ТЪРГОВСКА, не екранна · поръчкови разработки ПО ДОГОВОР. Няма и не бива да ' +
    'има бутон, който тя пали или гаси.',
});

/** Обявеното · съюзът `Vazmozhnost` в `planove.ts`, прочетен от самия файл. */
function obyavenite(): readonly string[] {
  const sayuzat = /export type Vazmozhnost =([\s\S]*?);\n/.exec(PLANOVE)?.[1];
  if (sayuzat === undefined) throw new Error('съюзът Vazmozhnost не се намери в planove.ts');
  return [...sayuzat.matchAll(/\|\s*'([a-z-]+)'/g)]
    .map((m) => m[1])
    .filter((ime): ime is string => ime !== undefined);
}

/** Всеки `.ts` под `app/` и `src/`, без самата таблица на плановете. */
function izvorite(koren: string): readonly string[] {
  const namereni: string[] = [];
  for (const vpis of readdirSync(koren, { withFileTypes: true })) {
    const pat = join(koren, vpis.name);
    if (vpis.isDirectory()) namereni.push(...izvorite(pat));
    else if (vpis.name.endsWith('.ts') && !vpis.name.endsWith('.d.ts')) namereni.push(pat);
  }
  return namereni;
}

const KODAT = [...izvorite('app'), ...izvorite('src')]
  .filter((p) => !p.endsWith(join('domein', 'planove.ts')))
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

/**
 * Пита ли някой за нея · ТРИТЕ начина, по които възможност стига до екрана:
 *
 * - `mozhe(izbor, 'x')` — питане на място, вътре в шаблона;
 * - `sVazmozhnostta(izbor, 'x', …)` — блокът с думите на отказа (правило 15);
 * - `iska: 'x'` — цял екран или цяла тема в Настройки.
 *
 * Четвърти няма. Появи ли се, той се ДОБАВЯ тук — иначе този тест ще нарече
 * построеното липсващо, а обход, който лъже, е по-скъп от липсващ (ADR-051).
 */
function imaKonsumator(v: string): boolean {
  return [`mozhe\\([^)]*,\\s*'${v}'\\)`, `sVazmozhnostta\\([^,]*,\\s*'${v}'`, `iska:\\s*'${v}'`].some(
    (izraz) => new RegExp(izraz).test(KODAT),
  );
}

describe('обявената възможност стига до екрана', () => {
  it('съюзът се чете · и не е празен', () => {
    expect(obyavenite().length).toBeGreaterThan(10);
  });

  it('БЕЗ КОНСУМАТОР са точно трите пиннати · нито една повече', () => {
    const bez = obyavenite().filter((v) => !imaKonsumator(v));
    expect(bez.sort(), `без консуматор: ${bez.join(' · ')}`).toEqual(
      Object.keys(BEZ_EKRANEN_KONSUMATOR).sort(),
    );
  });

  it('всяко пиннато име е ЖИВА възможност · пинът не надживява своята', () => {
    const obyaveni = new Set(obyavenite());
    for (const ime of Object.keys(BEZ_EKRANEN_KONSUMATOR)) {
      expect(obyaveni.has(ime), `${ime} е пиннат, но вече не е обявен`).toBe(true);
    }
  });

  it('всяко пиннато име носи ПРИЧИНА, не празен ред', () => {
    for (const [ime, prichina] of Object.entries(BEZ_EKRANEN_KONSUMATOR)) {
      expect(prichina.length, `${ime} е без причина`).toBeGreaterThan(40);
    }
  });

  it('`ogledala` ВЕЧЕ има консуматор · това е самата поправка', () => {
    expect(imaKonsumator('ogledala')).toBe(true);
  });

  it('и мярката НЕ е сляпа · измислена възможност няма консуматор', () => {
    expect(imaKonsumator('nyama-takava-vazmozhnost')).toBe(false);
  });
});
