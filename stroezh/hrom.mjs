/**
 * КЪДЕ Е CHROMIUM · един дом за един факт (правило 17).
 *
 * Два файла го искат — проходът (`proba/prohod.ts`) и рисувачът на икони
 * (`stroezh/risuvai-ikoni.mjs`) — и това е ЕДИН и същ въпрос. Написан два
 * пъти, той беше две места, на които може да се разминат, и се разминаха:
 * проходът търсеше по стълба от кандидати, а рисувачът заковаваше
 * `chromium-1194` и четеше друга променлива на средата.
 *
 * ЗАЩО `playwright-core`, а не `playwright`: в пакета стои само първият
 * (правило 10 · нула излишни зависимости). Рисувачът внасяше втория, тъй че
 * `npm run ikoni` падаше с „Cannot find package 'playwright'" — обявена
 * команда, която не тръгва.
 */

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

/**
 * Пътят до Chromium · ТЪРСИ СЕ, не се заковава.
 *
 * Всеки кандидат се ПРОВЕРЯВА, че съществува. Това не е излишно: тук
 * `chromium.executablePath()` сочи `chromium-1234`, а на диска стои
 * `chromium-1194`. Път, който само изглежда верен, дава грешка две минути
 * по-късно и на съвсем друго място.
 *
 * `PROBA_HROM` се приема наравно с `HROM`: първата вече живее в настройките
 * на средата и мълчаливото ѝ изоставяне би счупило работещ проход.
 */
export function nameriHroma() {
  const kandidati = [
    process.env['HROM'],
    process.env['PROBA_HROM'],
    (() => {
      try {
        return chromium.executablePath();
      } catch {
        return null;
      }
    })(),
    '/opt/pw-browsers/chromium',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ];
  for (const k of kandidati) {
    if (k && existsSync(k)) return k;
  }
  throw new Error(
    'Не намирам Chromium. Сложи пътя в HROM или пусни ' +
      '`npx playwright-core install chromium`.',
  );
}

export { chromium };
