/**
 * ЦЕНОВАТА ЛИСТА · вторият вход и единственият изход.
 *
 * Негови думи (23.08):
 *
 *   „Има вече една папка с площите и друга с Ценови листи. **Чете от папката с
 *    площите и записва в таблицата с Цените.**"
 *
 * Значи две посоки, и всяка е ЕДНА (правило 20 · ADR-010):
 *
 *   Площообразуване  →  Калкулатор   ЧЕТЕ   (`chetene.ts`)
 *   Ценови листи     ↔  Калкулатор   чете изложението, пише цената
 *
 * ЗАЩО СЕ ЧЕТЕ И ЦЕНОВАТА ЛИСТА. Площообразуването няма изложение, стаи и
 * тераси — те живеят само тук. Той каза за изложението „избираш произволно за
 * тестовете", но търсенето го намери в собствения му файл (колона „Изложение":
 * СИ · И · З · СЗ за всичките 22 апартамента). Нищо не се измисля, щом го има.
 *
 * ХЕДЪРЪТ Е НЕГОВ, ДОСЛОВНО:
 *
 *   Имоти · Етаж Кота · Стаи · Чиста площ · Общи части % · Общи части м2 ·
 *   Обща площ · Изложение · Тераси · Цена с ДДС · Евро / кв.м.
 *
 * „ПРОДАДЕН" СТОИ НА МЯСТОТО НА ЦЕНАТА. Не е отделна колона — това е неговият
 * начин и се чете както е. Продаденото не влиза в стойността на състоянието.
 */

import { kletka, svedenaGlava, type Tablitsa } from '../iztochnik/tablitsa.js';
import { pishi } from '../yadro/pari.js';
import { kvSmVM2, ploshtVKvSm } from './chetene.js';
import type { OtTsenovaLista, RedNaStoynost } from './stoynost.js';
import type { KolonaNaLista, List } from '../iznos/excel.js';

/** Думата, с която той бележи продаденото — на мястото на цената. */
export const PRODADEN = 'ПРОДАДЕН';

/** Хедърът на неговата ценова листа, дословно и по ред. */
export const GLAVA_NA_TSENITE: readonly string[] = Object.freeze([
  'Имоти',
  'Етаж Кота',
  'Стаи',
  'Чиста площ',
  'Общи части %',
  'Общи части м2',
  'Обща площ',
  'Изложение',
  'Тераси',
  'Цена с ДДС',
  'Евро / кв.м.',
]);

/**
 * ЧЕТЕ каквото само ценовата листа знае: изложение, стаи, тераси, продаден ли е.
 *
 * Ключът е името на обекта („Апартамент 1") — единственото, което двете
 * таблици споделят. Празна листа връща празна карта; Калкулаторът работи и
 * без нея, само че без коефициент за изложение.
 */
export function prochetiTsenovaLista(t: Tablitsa): ReadonlyMap<string, OtTsenovaLista> {
  const izhod = new Map<string, OtTsenovaLista>();

  // Главата е редът, който носи „изложение" — тя е на 2-ри или 3-ти ред заради
  // заглавието на обекта отгоре.
  let red = -1;
  let koloni: Record<string, number> = {};
  for (let r = 0; r < Math.min(t.redove.length, 12); r += 1) {
    const glava = (t.redove[r] ?? []).map(svedenaGlava);
    const i = glava.indexOf('изложение');
    if (i < 0) continue;
    red = r;
    koloni = {
      obekt: glava.findIndex((g) => g === 'имоти' || g === 'обект'),
      stai: glava.indexOf('стаи'),
      izlozhenie: i,
      terasi: glava.indexOf('тераси'),
      tsena: glava.findIndex((g) => g.startsWith('цена')),
    };
    break;
  }
  if (red < 0 || koloni['obekt'] === undefined || koloni['obekt'] < 0) return izhod;

  for (let r = red + 1; r < t.redove.length; r += 1) {
    const obekt = kletka(t, r, koloni['obekt']).trim();
    if (obekt === '') continue;
    const tsena = koloni['tsena']! >= 0 ? kletka(t, r, koloni['tsena']!).trim() : '';
    izhod.set(obekt, {
      izlozhenie: koloni['izlozhenie']! >= 0 ? kletka(t, r, koloni['izlozhenie']!).trim() : '',
      stai: broyOt(koloni['stai']! >= 0 ? kletka(t, r, koloni['stai']!) : ''),
      terasi_kvsm: koloni['terasi']! >= 0 ? bezopasnaPlosht(kletka(t, r, koloni['terasi']!)) : 0,
      prodaden: svedenaGlava(tsena) === svedenaGlava(PRODADEN),
    });
  }
  return izhod;
}

function broyOt(surovo: string): number {
  const t = surovo.trim();
  return /^\d+$/.test(t) ? Number(t) : 0;
}

/** Площ, която не спира партидата: нечетимото става нула, не грешка. */
function bezopasnaPlosht(surovo: string): number {
  try {
    return ploshtVKvSm(surovo);
  } catch {
    return 0;
  }
}

/**
 * КОЯ ЦЕНА СЕ ПУСКА · негов избор, с три възможности.
 *
 * Негови думи (23.08): „Добре е да има две таблици едновременно с две ценови
 * колони една до друга за сравнение. И **когато искаш да пуснеш цените,
 * избираш само едната да се вижда**." А на въпроса коя е готовият избор —
 * **„и двете"**.
 *
 * Затова по подразбиране излизат ДВЕТЕ, а свиването до една е действие.
 */
export type KoyaTsena = 'dvete' | 'plosht' | 'sastoyanie' | 'razhod' | 'saglasuvana';

/**
 * НАДПИСЪТ НА ПЪРВИЯ СМЕНИ СЕ, ПОВЕДЕНИЕТО МУ — НЕ (резен 16б).
 *
 * Дотук пишеше „и двете", когато числата бяха две. Днес са ЧЕТИРИ, и „и двете"
 * стана лъжа по премълчаване: човек чете „двете" и мисли, че вижда всичко.
 * Затова надписът казва КОИ две.
 *
 * КЛЮЧЪТ обаче остава `dvete` — той живее в паметта на екрана и смяната му би
 * изтрила запомнения избор на всеки. Ключът е адрес, надписът е дума; те не се
 * менят заедно.
 */
export const IMENA_NA_IZBORA: Readonly<Record<KoyaTsena, string>> = Object.freeze({
  dvete: 'А и Б · за сравнение',
  plosht: 'само по площ · за продажба',
  sastoyanie: 'само по състояние · оценката',
  razhod: 'само по разход · себестойността',
  saglasuvana: 'съгласуваната · трите, претеглени',
});

/** Двете колони, които се долепят отдясно при избор „и двете". */
const DOPALNITELNI_KOLONI: readonly string[] = Object.freeze([
  'Стойност на Състояние',
  'Евро / кв.м. (състояние)',
]);

/**
 * ПИША ценовата листа — с ТОЧНО неговия хедър.
 *
 * Не се пресъздава чужда таблица: това е неговият формат, попълнен с изчислени
 * цени. „ПРОДАДЕН" се връща както е било — Калкулаторът не преоценява продадено.
 *
 * ХЕДЪРЪТ МУ ОСТАВА НЕПОКЪТНАТ И В ТРИТЕ СЛУЧАЯ. При „и двете" сравнението се
 * ДОЛЕПЯ отдясно (колони 12 и 13); неговите единайсет не се разместват и не
 * сменят смисъла си. Файл, който мени реда на чужди колони, спира да е същият
 * файл.
 *
 * Числата излизат като ТЕКСТ в българския формат, защото такъв е файлът, от
 * който идват („45,22" с десетична запетая).
 */
export function listNaTsenite(
  redove: readonly RedNaStoynost[],
  ime = 'ЦЕНИ',
  koya: KoyaTsena = 'dvete',
): List {
  const zaglaviya =
    koya === 'dvete' ? [...GLAVA_NA_TSENITE, ...DOPALNITELNI_KOLONI] : GLAVA_NA_TSENITE;
  const koloni: KolonaNaLista[] = zaglaviya.map((zaglavie) => ({
    ime: zaglavie,
    shirina: zaglavie === 'Имоти' ? 28 : 16,
  }));

  return {
    ime,
    koloni,
    redove: redove.map((r) => {
      // При „само по състояние" оценката влиза в НЕГОВАТА колона „Цена с ДДС" —
      // тя е мястото за цената, каквато и да е тя.
      // Всеки единичен избор влиза в НЕГОВАТА колона „Цена с ДДС" — тя е
      // мястото за цената, каквато и да е тя. Хедърът му не се разширява.
      const tsena_st =
        koya === 'sastoyanie'
          ? r.sastoyanie_st
          : koya === 'razhod'
            ? r.razhod_st
            : koya === 'saglasuvana'
              ? r.saglasuvana_st
              : r.tsena_st;
      const naKvadrat_st =
        koya === 'sastoyanie'
          ? r.sastoyanieNaKvadrat_st
          : koya === 'razhod'
            ? r.razhodNaKvadrat_st
            : koya === 'saglasuvana'
              ? r.saglasuvanaNaKvadrat_st
              : r.evroNaKvadrat_st;

      const negovite: (string | number)[] = [
        r.obekt,
        [r.etazh, r.kota].filter((x) => x !== '').join(' · '),
        r.stai === 0 ? '' : String(r.stai),
        kvSmVM2(r.chista_kvsm),
        procentOtChasti(r),
        kvSmVM2(r.obshti_chasti_kvsm),
        kvSmVM2(r.obshta_kvsm),
        r.izlozhenie,
        r.terasi_kvsm === 0 ? '' : kvSmVM2(r.terasi_kvsm),
        r.prodaden ? PRODADEN : bezZnak(tsena_st),
        r.prodaden ? '' : bezZnak(naKvadrat_st),
      ];

      if (koya !== 'dvete') return negovite;
      return [
        ...negovite,
        r.prodaden ? PRODADEN : bezZnak(r.sastoyanie_st),
        r.prodaden ? '' : bezZnak(r.sastoyanieNaKvadrat_st),
      ];
    }),
  };
}

/** Общите части като процент от общата площ — в неговата листа е така. */
function procentOtChasti(r: RedNaStoynost): string {
  if (r.obshta_kvsm === 0) return '';
  // до два знака, в цели стотни от процента — пак без float в записа
  const stotni = Math.round((r.obshti_chasti_kvsm * 10_000) / r.obshta_kvsm);
  return `${Math.floor(stotni / 100)},${String(stotni % 100).padStart(2, '0')}`;
}

/** Сумата без знака на валутата — колоната вече казва, че е евро. */
function bezZnak(suma_st: number): string {
  return pishi(suma_st)
    .replace(/ ?€$/, '')
    .trim();
}
