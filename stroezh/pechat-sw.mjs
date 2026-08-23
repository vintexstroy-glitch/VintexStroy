/**
 * ПЕЧАТЪТ · вписва имената на построените файлове в служебния работник.
 *
 * Vite слага хеш в имената (`index-B1f70MVw.css`), затова работникът не може
 * да ги знае предварително. Този скрипт чете `dist/` СЛЕД build и ги впечатва.
 *
 * Защо не плъгин: правило 10. Тридесет реда наш код срещу чужда зависимост,
 * която прави същото — същата сметка като при писача на .xlsx.
 *
 * Версията е отпечатък на самото съдържание. Значи: не се ли е сменило нищо,
 * кешът не се сменя и телефонът не тегли пак.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

/** Всички файлове в dist, освен самия работник. */
function vsichkiFaylove(papka = DIST) {
  const namereni = [];
  for (const vpis of readdirSync(papka)) {
    const pat = join(papka, vpis);
    if (statSync(pat).isDirectory()) namereni.push(...vsichkiFaylove(pat));
    else if (vpis !== 'sw.js') namereni.push(pat);
  }
  return namereni;
}

const faylove = vsichkiFaylove().sort();
const cherupka = faylove.map((f) => `./${relative(DIST, f)}`);

// Версията идва от СЪДЪРЖАНИЕТО, не от часовника — иначе всяко построяване
// би пратило телефона да тегли същите байтове наново.
const otpechatak = createHash('sha256');
for (const f of faylove) otpechatak.update(readFileSync(f));
const versiya = otpechatak.digest('hex').slice(0, 12);

const pat = join(DIST, 'sw.js');
const izhod = readFileSync(pat, 'utf8')
  .replace('__VERSIYA__', versiya)
  .replace('__CHERUPKA__', JSON.stringify(['./', ...cherupka], null, 2));

writeFileSync(pat, izhod);

const bajtove = faylove.reduce((s, f) => s + statSync(f).size, 0);
console.log(
  `  джобът: ${cherupka.length} файла · ${(bajtove / 1024).toFixed(1)} KB · версия ${versiya}`,
);
