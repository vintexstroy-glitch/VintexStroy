/**
 * ЧЕСТНОСТТА НА ПРОВЕРКИТЕ · брои дефектите на ТЕСТОВЕТЕ и ПРОХОДА.
 *
 * ЗАЩО ОТДЕЛНА КОМАНДА, а не десети обход в `chistota`. Двете мерят различни
 * неща и по различни файлове: `chistota` брои хигиената на ИЗПРАТЕНИЯ код
 * (`src/` и `app/`, ADR-048), а тук се брои дали ПРОВЕРКИТЕ могат да паднат.
 * Слети, прагът на едното щеше да мълчи заради другото — и точно `proba/` е
 * извън деветте по решение (ADR-056).
 *
 * ЗАЩО ИЗОБЩО. Десет поредни резена намериха ЕДНИ И СЪЩИ видове повреда, и аз
 * ги записвах с думи („същата спънка като…", четиринайсет пъти), а не с число.
 * Дефект, който не се брои, не пита за себе си — същият урок като при описа на
 * дълга. Оттук нататък се БРОИ.
 *
 * ГРАНИЦАТА, КАЗАНА НА ГЛАС. Не всеки клас се лови от машина. „Тест, който не
 * може да падне" има ОСЕМ известни случая, а форма, която програма разпознава —
 * четири. Останалите се ловят само с нарочно счупване. Затова тук се брои
 * онова, което Е броимо, и никъде не се твърди, че това са ВСИЧКИ.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const KOREN = new URL('..', import.meta.url).pathname;

function faylove(papka, kray = '.ts') {
  const spisak = [];
  const obhod = (p) => {
    for (const ime of readdirSync(join(KOREN, p))) {
      const patq = join(p, ime);
      if (statSync(join(KOREN, patq)).isDirectory()) obhod(patq);
      else if (ime.endsWith(kray)) spisak.push(patq);
    }
  };
  obhod(papka);
  return spisak.sort();
}

const chети = (f) => readFileSync(join(KOREN, f), 'utf8');

// ── КОИ БЕЛЕЗИ СА ДВУСМИСЛЕНИ · живеят в ПОВЕЧЕ от един екран ─────────────
const poBeleg = new Map();
for (const f of faylove('app')) {
  for (const m of chети(f).matchAll(/\bdata-([a-z][a-z0-9-]*)\s*=/g)) {
    if (!poBeleg.has(m[1])) poBeleg.set(m[1], new Set());
    poBeleg.get(m[1]).add(f);
  }
}
const dvusmisleni = new Set([...poBeleg].filter(([, fs]) => fs.size > 1).map(([b]) => b));

/**
 * ОБХОД Б · ГОЛ СЕЛЕКТОР върху двусмислен белег.
 *
 * `$eval('[data-pole]')` взима ПЪРВОТО съвпадение на цялата страница. Когато
 * белегът живее в два екрана, проходът чете чуждото — и не пада, а ЛЪЖЕ.
 * Хванато четири пъти с ръка: `data-myasto` (резен 34), `.prazno` (резен 39),
 * `data-pole` (резен 42), плюс името на файл (резен 40).
 *
 * БЕЗОПАСЕН е селектор със СТОЙНОСТ (`[data-sektsiya=gant-delata]`) или с
 * ОБХВАТ отпред (`[data-tablitsa=x] [data-red]`) — и двете сочат едно място.
 */
function obhodB() {
  const nam = [];
  for (const f of faylove('proba')) {
    chети(f).split('\n').forEach((red, i) => {
      for (const m of red.matchAll(/\$\$?eval\(\s*['"`]([^'"`]+)['"`]/g)) {
        const g = /^\[data-([a-z0-9-]+)\]/.exec(m[1].trim());
        if (g && dvusmisleni.has(g[1])) nam.push(`${f}:${i + 1} — [data-${g[1]}] · живее в ${poBeleg.get(g[1]).size} екрана`);
      }
    });
  }
  return nam;
}

/**
 * ОБХОД Е · ЧЕТЕНЕ БЕЗ ИЗЧАКВАНЕ.
 *
 * Действие, а до три реда след него — четене, без нищо, което да чака екрана.
 * Хванато с ръка при §89 (`fill` не вдига `change`) и §58 (вестта се слага СЛЕД
 * като свалянето се развърже). Пада веднъж на три пускания — проход, който лъже
 * през ден, е по-скъп от липсващ (ADR-051).
 */
function obhodE() {
  const deystvie = /\.(click|selectOption|fill|waitForEvent)\(/;
  const chete = /\$\$?eval\(|tekstNa\(/;
  const chaka = /waitFor|deystvieSPrerisuvane|sSabitie|sSabitiya|napishiVPoleto/;
  const nam = [];
  for (const f of faylove('proba')) {
    const redove = chети(f).split('\n');
    redove.forEach((red, i) => {
      if (!deystvie.test(red) || chaka.test(red)) return;
      const opashka = redove.slice(i + 1, i + 4);
      if (opashka.some((x) => chete.test(x)) && !opashka.some((x) => chaka.test(x))) {
        nam.push(`${f}:${i + 1} — ${red.trim().slice(0, 62)}`);
      }
    });
  }
  return nam;
}

/**
 * ОБХОД А · ТЕСТЪТ СЕ МЕСТИ ЗАЕДНО С КОДА.
 *
 * Входът се СМЯТА от същата константа, чието действие се проверява:
 * `sled(NAPRED_DNI + 1)` се мести заедно с `NAPRED_DNI`, тъй че разтягането ѝ
 * минаваше (резен 39). Числото на прага се пише с ръка, отделно от рязането.
 *
 * Тази форма е ЕДНА от няколко; другите се ловят само с нарочно счупване.
 */
function obhodA() {
  const nam = [];
  for (const f of [...faylove('tests'), ...faylove('proba')]) {
    chети(f).split('\n').forEach((red, i) => {
      const t = red.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      if (/\b[a-z]\w*\(\s*[A-Z][A-Z_0-9]{3,}\s*[+\-*/]/.test(red)) {
        nam.push(`${f}:${i + 1} — ${t.slice(0, 62)}`);
      }
    });
  }
  return nam;
}

const OBHODI = [
  { ime: 'Б · гол селектор върху двусмислен белег', prag: 0, kart: obhodB },
  { ime: 'Е · четене без изчакване след действие', prag: 0, kart: obhodE },
  { ime: 'А · тестът се мести заедно с кода', prag: 0, kart: obhodA },
];

console.log('\n═══ ЧЕСТНОСТТА НА ПРОВЕРКИТЕ ═══\n');
console.log(`двусмислени белега (живеят в >1 екран): ${dvusmisleni.size} от ${poBeleg.size}\n`);
let nad = 0;
for (const o of OBHODI) {
  const n = o.kart();
  const zle = n.length > o.prag;
  if (zle) nad += 1;
  console.log(`  ${zle ? '✗' : '·'} ${o.ime}: ${n.length} · праг ${o.prag}`);
  for (const r of n.slice(0, 8)) console.log(`      ${r}`);
  if (n.length > 8) console.log(`      … и още ${n.length - 8}`);
}
console.log(
  nad === 0
    ? '\nЧестно: нито един обход над прага си.\n'
    : `\nНАХОДКИ: ${nad} обхода над прага си. Честността се БРОИ, не се оценява.\n`,
);
