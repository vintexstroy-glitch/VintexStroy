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
// ЗАЩО `.mjs` внася `.ts` без строеж: от Node 22.18 обелването на типове е
// включено по подразбиране. Условието не е дребно — под 22.18 `npm run build`
// пада на този ред, — затова е вписано МАШИННО ЧЕТИМО в `package.json`
// (`engines.node`), а не само с думи тук. И двата потока карат Node 22.
import { PAKETI } from '../src/domein/azbuki.ts';

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

const vsichki = vsichkiFaylove().sort();
const adres = (f) => `./${relative(DIST, f)}`;

// Шрифтовете НЕ влизат в черупката — те се пазят по пакет (виж долу).
const eShrift = (f) => f.endsWith('.woff2');

/**
 * СВЪРЗВАЩИТЕ ЧАСТИ НЕ ВЛИЗАТ В ДЖОБА.
 *
 * CLAUDE.md обещава дословно: „Офлайн изданието се различава по едно:
 * свързващата част ЛИПСВА в него, а не е изключена." А `app/ii.ts` обяснява, че
 * динамичният внос го постига.
 *
 * ПОСТИГАШЕ ГО САМО НАПОЛОВИНА. Динамичният внос държи парчето извън ПЪРВОТО
 * зареждане — но този печат помиташе целия `dist` и го слагаше в черупката,
 * значи джобът го теглеше предварително и офлайн изданието го НОСЕШЕ. Обещание,
 * вярно в изходния код и невярно в построеното, е по-лошо от липсващо: то се
 * цитира.
 *
 * Затова тук парчетата се изключват ПОИМЕННО, а изключеното се ПЕЧАТА — да се
 * вижда, вместо да се вярва. Всеки нов свързващ файл, който е свое парче, иска
 * свой ред в този списък.
 *
 * ЗАБЕЛЕЖКА, казана на глас: това важи само за парчетата, теглени с ДИНАМИЧЕН
 * внос. Драйвът се внася СТАТИЧНО (`app/main.ts`) и стои вътре в главното
 * парче — него този списък не може да го извади. Значи обещанието днес държи
 * за Клод, и ще държи за Календара, ако и той е динамичен.
 */
const SVARZVASHTI = ['klod'];
const eSvarzvashto = (f) => {
  const ime = relative(DIST, f);
  return SVARZVASHTI.some((s) => new RegExp(`(^|/)assets/${s}-[^/]*\\.js$`).test(ime));
};

const izvan = vsichki.filter(eSvarzvashto).map(adres);
const cherupka = vsichki.filter((f) => !eShrift(f) && !eSvarzvashto(f)).map(adres);

/**
 * Кой файл на коя азбука е. Vite хешира имената (`literata-greek-BxK2.woff2`),
 * затова се разпознава по НАЧАЛОТО на името — подмножеството е в него.
 *
 * Редът е важен: `latin-ext` съдържа `latin` като подниз, затова по-дългите
 * имена се пробват първи. Иначе цялата европейска азбука би влязла в пакета
 * за България — тихо и незабелязано.
 */
const PODMNOZHESTVA = ['cyrillic-ext', 'latin-ext', 'greek-ext', 'cyrillic', 'latin', 'greek', 'vietnamese'];
function koyaAzbuka(pat) {
  const ime = relative(DIST, pat);
  return PODMNOZHESTVA.find((p) => new RegExp(`-${p}-[^/]*\\.woff2$`).test(ime));
}

const shrifty = vsichki.filter(eShrift);
const azbuki = {};
for (const p of PAKETI) {
  azbuki[p.klyuch] = shrifty.filter((f) => p.podmnozhestva.includes(koyaAzbuka(f))).map(adres);
}

// Никой шрифт не бива да остане без азбука — иначе тихо изпада от всеки пакет.
const bezdomni = shrifty.filter((f) => !koyaAzbuka(f)).map(adres);
if (bezdomni.length) {
  throw new Error(`Шрифтове без разпозната азбука: ${bezdomni.join(', ')}`);
}

// Версията идва от СЪДЪРЖАНИЕТО, не от часовника — иначе всяко построяване
// би пратило телефона да тегли същите байтове наново.
const otpechatak = createHash('sha256');
for (const f of vsichki) otpechatak.update(readFileSync(f));
const versiya = otpechatak.digest('hex').slice(0, 12);

const pat = join(DIST, 'sw.js');
const izhod = readFileSync(pat, 'utf8')
  .replace('__VERSIYA__', versiya)
  .replace('__CHERUPKA__', JSON.stringify(['./', ...cherupka], null, 2))
  .replace('__AZBUKI__', JSON.stringify(azbuki, null, 2));

// ПАЗАЧ, не надпис (ADR-056) · обявено правило, което никой не проверява, е
// дума. Ако свързващо парче все пак се промъкне в черупката, строежът ПАДА тук,
// а не се открива след месец в джоба на телефона.
for (const s of SVARZVASHTI) {
  if (new RegExp(`assets/${s}-[^"']*\\.js`).test(izhod)) {
    throw new Error(
      `Свързващата част „${s}" е влязла в черупката на джоба. ` +
        'CLAUDE.md обещава, че офлайн изданието НЕ я носи — а обещание, вярно в ' +
        'кода и невярно в построеното, се цитира с години.',
    );
  }
}

writeFileSync(pat, izhod);

const kb = (fs) => (fs.reduce((s, f) => s + statSync(f).size, 0) / 1024).toFixed(1);
console.log(`  джобът: ${cherupka.length} файла · ${kb(vsichki.filter((f) => !eShrift(f) && !eSvarzvashto(f)))} KB · версия ${versiya}`);
// Изключеното се ПЕЧАТА · обещание без число е дума (ADR-056).
console.log(
  izvan.length
    ? `    ИЗВЪН джоба · свързващите части: ${izvan.join(' · ')}`
    : '    ИЗВЪН джоба: НИТО ЕДНА свързваща част — списъкът `SVARZVASHTI` не улови нищо',
);
for (const p of PAKETI) {
  const negovi = shrifty.filter((f) => p.podmnozhestva.includes(koyaAzbuka(f)));
  console.log(`    азбуки „${p.klyuch}": ${negovi.length} файла · ${kb(negovi)} KB`);
}
