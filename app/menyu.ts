/**
 * ЖИВИТЕ ПАДАЩИ МЕНЮТА · законът от И97 стига до екрана (ADR-040).
 *
 * Негови думи:
 *
 *   „Всяко падащо меню в приложението **приема и нови стойности**, не само
 *    избор от списъка. Кое от двете си направил, се вижда от **цвета на
 *    текста**: СИН — избрал си съществуваща; ЧЕРЕН — написал си своя…
 *    **Нищо не спира човека.** Няма въпрос, няма потвърждение, няма изскачащ
 *    прозорец… Текстът почернява в мига, в който се различи от избраното."
 *
 * Домейнът (`padashti-menyuta.ts`) е построен и под тест от ADR-033; тук е
 * ЕДИНСТВЕНИЯТ екранен дом на закона. Един компонент за всички менюта, защото
 * четиринайсет полета, всяко със свое оцветяване, се разминават при първата
 * поправка — и разминаването е точно от вида, който никой не забелязва.
 *
 * ═══ ЗАЩО `datalist`, А НЕ `select` ═══
 *
 * `select` не приема нова стойност — той е точно онова, което законът отменя.
 * `datalist` дава списък И свободно писане, а е част от браузъра: нула
 * зависимости (правило 10), работи на телефон и не иска нито ред за клавиши,
 * фокус или четци на екран.
 *
 * ═══ КАК СЕ РАЗБИРА „НАТИСНАЛ" ОТ „ПИСАЛ" ═══
 *
 * Това е сърцето на закона и най-трудното за екрана: `datalist` не казва
 * направо кое от двете е станало. Казва го КОСВЕНО — избор от списъка идва
 * като `input` със `inputType === 'insertReplacementText'`, а писането — като
 * `insertText`.
 *
 * КЪДЕТО БРАУЗЪРЪТ НЕ ГО СЪОБЩАВА, полето остава ЧЕРНО. И това не е дефект,
 * а най-безопасната посока — тя съвпада с ЧЕТВЪРТОТО правило на самия закон:
 * „писал си сам нещо, което случайно съвпада → остава ЧЕРНО". Черното значи
 * „ново", а `shteDobavi` пита речника, не цвета: съществуваща стойност не се
 * добавя втори път, каквото и да пише полето. Тоест грешката в разпознаването
 * не може да развали нито един запис — само показва по-предпазливата дума.
 */

import { ekraniraj } from './obshto.js';
import { NACHINI_NA_PLASHTANE } from '../src/domein/sabitiya.js';
import { STAVKI } from '../src/domein/dds.js';
import {
  predlagani,
  sastoyanieNaPoleto,
  type Menyu,
  type VidVhod,
} from '../src/domein/padashti-menyuta.js';

/** Какво знае екранът за едно поле с меню. */
interface PoleSMenyu {
  readonly id: string;
  /** име на полето във формата (`name`) · по подразбиране същото като id-то */
  readonly ime?: string;
  readonly etiket: string;
  readonly menyu: Menyu;
  readonly stoynost?: string;
  readonly zadalzhitelno?: boolean;
  readonly mestodarzhatel?: string;
  /**
   * Готов HTML ПОД полето, вътре в неговия блок · за реда, който казва проблема
   * (ADR-032). Извън блока той се откача от полето си при първото пренареждане
   * на решетката и почва да сочи съседа.
   */
  readonly pod?: string;
}

/**
 * Прави МЕНЮ от живите стойности на едно поле · без нито едно ново събитие.
 *
 * Речникът на „Място" не се пази никъде отделно: той Е онова, което вече стои
 * в делата. Втори списък би трябвало да се пази синхронен с Журнала — и щеше
 * да се разминава точно когато някой сторнира ред.
 *
 * Подредбата е по ЧЕСТОТА, после по азбука: най-писаното стои горе, защото
 * оттам се избира най-често. Празните не влизат.
 */
export function menyuOtZhivi(
  klyuch: string,
  ime: string,
  stoynosti: Iterable<string>,
  vid: VidVhod = 'otvoreno',
): Menyu {
  const broy = new Map<string, number>();
  for (const s of stoynosti) {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t === '') continue;
    broy.set(t, (broy.get(t) ?? 0) + 1);
  }
  const podredeni = [...broy.entries()]
    .sort(([a, ba], [b, bb]) => bb - ba || a.localeCompare(b))
    .map(([tekst]) => Object.freeze({ tekst, predlagaSe: true }));
  return Object.freeze({ klyuch, ime, vid, stoynosti: Object.freeze(podredeni) });
}

/**
 * РЕЧНИЦИТЕ НА ЕДНА ФОРМА · по КЛЮЧ, и с ЕДИН дом (правило 17).
 *
 * Пълнят се при РИСУВАНЕ (там е Огледалото) и се четат при ЗАКАЧАНЕ (там е
 * DOM-ът). Двете не могат да се слеят: закачането няма Огледало и не бива да
 * го чака — то е асинхронно, а закачането става в същия кадър.
 *
 * Живееше в `gant.ts`, докато менютата бяха само там. Щом Имоти и Сметки
 * поискаха същото, преписването на картата в трети и четвърти модул щеше да е
 * точно онова, което правило 17 гони: три места, които се разминават при
 * първата поправка.
 *
 * По КЛЮЧ, а не модулно: личната форма (`l-`) и служебната (`d-`) имат
 * РАЗЛИЧНИ речници — служебните дела и личните не се смесват (И98).
 */
const RECHNITSI = new Map<string, ReadonlyMap<string, Menyu>>();

export function zapomniRechnitsite(klyuch: string, menyuta: ReadonlyMap<string, Menyu>): void {
  RECHNITSI.set(klyuch, menyuta);
}

/** Празна карта при непознат ключ — липсващ речник не бива да чупи закачането. */
export function rechnitsite(klyuch: string): ReadonlyMap<string, Menyu> {
  return RECHNITSI.get(klyuch) ?? new Map<string, Menyu>();
}

/** Ключът, под който полето помни какво е НАТИСНАТО от списъка. */
const IZBRANO = 'izbrano';

/**
 * Рисува едно поле с меню · вход, списък и мястото за думата.
 *
 * Думата се пише от JS при въвеждане, не тук: при рисуване полето още не е
 * пипано и всяка дума би била предположение.
 */
export function poleSMenyu(p: PoleSMenyu): string {
  const spisak = `${p.id}-spisak`;
  const stoynost = p.stoynost ?? '';
  return `
    <div class="pole">
      <label for="${ekraniraj(p.id)}">${ekraniraj(p.etiket)}</label>
      <input
        translate="no"
        id="${ekraniraj(p.id)}"
        name="${ekraniraj(p.ime ?? p.id)}"
        list="${ekraniraj(spisak)}"
        data-menyu="${ekraniraj(p.menyu.klyuch)}"
        data-vid="${ekraniraj(p.menyu.vid)}"
        data-ime-na-menyuto="${ekraniraj(p.menyu.ime)}"
        value="${ekraniraj(stoynost)}"
        autocomplete="off"
        ${p.zadalzhitelno ? 'required' : ''}
        ${p.mestodarzhatel ? `placeholder="${ekraniraj(p.mestodarzhatel)}"` : ''}>
      <datalist id="${ekraniraj(spisak)}" translate="no">
        ${predlagani(p.menyu)
          .map((s) => `<option value="${ekraniraj(s.tekst)}"></option>`)
          .join('')}
      </datalist>
      <span class="znak-menyu" data-znak-za="${ekraniraj(p.id)}" aria-live="polite"></span>
      ${p.pod ?? ''}
    </div>`;
}

/**
 * ═══ ВТОРОТО ЛИЦЕ НА ЗАКОНА · ЗАКЛЮЧЕНИТЕ СПИСЪЦИ (ADR-042) ═══
 *
 * Негови думи, същият закон: „заключените растат само от Настройки". Тоест
 * **заключеното меню не става свободно поле** — то си остава ИЗБОР. Изворите
 * го казват и от другата страна: „Създаваме един сектор от колони и бутони с
 * падащи менюта, **които са без възможност да пишеш, а само избираш**"
 * (`izvori/03` §6).
 *
 * Затова тук НЕ се прави `datalist` за поток, сектор, ставка и начин. `select`
 * е строго по-безопасен от текстово поле с отказ: непозната стойност просто не
 * може да се появи, вместо да се появи и после да бъде отказана.
 *
 * КАКВО ВСЕ ПАК ЛИПСВАШЕ: думата. Човекът стоеше пред четири полета, в три от
 * които може да пише свое, а в четвъртото — не, и нищо на екрана не казваше
 * защо. „Заключено ≠ счупено" е същата грешка, която правило 15 гони при
 * „изключено ≠ липсващо".
 *
 * ДУМАТА Е ЧЕСТНА, НЕ ЗАЕТА. Изкушението беше да се пише навсякъде „расте от
 * Настройки", защото така казва законът — но потоците, секторите и ставките
 * НЕ растат от Настройки днес: те са акумулатори и членове от закон. Надпис
 * „расте от Настройки" върху списък, който не расте оттам, е точно онова, за
 * което `docs/09` вече плати: **екранът лъжеше**. Затова всеки заключен списък
 * казва СВОЯТА причина, и тя се пази на едно място.
 */
export interface ZaklyuchenSpisak {
  readonly klyuch: string;
  readonly ime: string;
  /** КОЙ го определя · кратко изречение, което стои на екрана до полето */
  readonly kazva: string;
}

export const ZAKLYUCHENITE: Readonly<Record<string, ZaklyuchenSpisak>> = Object.freeze({
  potok: Object.freeze({
    klyuch: 'potok',
    ime: 'Поток',
    kazva: 'потоците са акумулаторите на Сметки',
  }),
  sektor: Object.freeze({
    klyuch: 'sektor',
    ime: 'Сектор',
    kazva: 'секторите и ставките им са от ЗДДС',
  }),
  stavka: Object.freeze({
    klyuch: 'stavka',
    ime: 'Ставка',
    kazva: '0 · 9 · 20 % по ЗДДС',
  }),
  // НАЙ-ВАЖНИЯТ от четирите, и най-невинният на вид: `smetki.ts` дели КЕШ от
  // БАНКА по този низ, и то с `!== 'в брой'`. Свободна стойност „карта" не би
  // счупила нищо шумно — би паднала ТИХО в БАНКА и би разминала два акумулатора.
  nachin: Object.freeze({
    klyuch: 'nachin',
    ime: 'Начин',
    kazva: 'КЕШ и БАНКА се делят по него',
  }),
  // Негови думи, 11.08: „Приходи и Разходи са фиксирани математически модели и
  // не се махат… забрана да триеш Приходи и Разходи от архива — това е Закон."
  posoka: Object.freeze({
    klyuch: 'posoka',
    ime: 'Посока',
    kazva: 'приход и разход са фиксирани модели',
  }),
  // Резен 99 · ADR-157: върху състоянието СМЯТА резен 104/110 („Строителство"
  // ражда голямото дело), значи свободна дума тук би родила състояние, което
  // никой сметач не познава. Единственият списък, който КАЗВА „Настройки" —
  // защото той наистина расте там, а не защото някой го е закючил в кода.
  'sastoyanie-imot': Object.freeze({
    klyuch: 'sastoyanie-imot',
    ime: 'Състояние на Имота',
    kazva: 'расте само от Настройки · „Състоянията на Имота"',
  }),
  dzhob: Object.freeze({
    klyuch: 'dzhob',
    ime: 'Джоб',
    kazva: 'джобовете са два — банка и трезор',
  }),
});

/**
 * ДВАТА ЗАКЛЮЧЕНИ СПИСЪКА, изписани веднъж (правило 17).
 *
 * „Начин на плащане" стоеше в две форми (плащане и разход), „Ставка" — също в
 * две (фактура и Калкулатор). И четирите изписваха `<option>`-ите си на ръка,
 * от един и същ домейнен списък. Обходът за чистота (`npm run chistota`) ги
 * хвана като дословно еднакви.
 *
 * Изборът НЕ е козметичен: списъкът тук е ЗАКЛЮЧЕН (ADR-033) — нова стойност
 * в него значи ново решение в домейна. Четири места, които го рисуват, са
 * четири места, в които едно от тях ще изостане.
 */
export function optsiiNaNachina(): string {
  return NACHINI_NA_PLASHTANE.map(
    (n) => `<option value="${n.klyuch}">${ekraniraj(n.ime)}</option>`,
  ).join('');
}

/** Ставките · цял процент, и подразбраната е избрана предварително. */
export function optsiiNaStavkata(podrazbirana = 20): string {
  return STAVKI.map(
    (st) => `<option value="${st}"${st === podrazbirana ? ' selected' : ''}>${st}%</option>`,
  ).join('');
}

interface PoleSIzbor {
  readonly id: string;
  /** име на полето във формата (`name`) · по подразбиране същото като id-то */
  readonly ime?: string;
  readonly etiket: string;
  /** ключ в `ZAKLYUCHENITE` · оттам идва думата */
  readonly spisak: keyof typeof ZAKLYUCHENITE | string;
  /** готовите `<option>`-и · стойностите живеят в домейна, не тук */
  readonly opcii: string;
  readonly zadalzhitelno?: boolean;
  readonly izklyuchen?: boolean;
}

/**
 * Рисува ЗАКЛЮЧЕНО поле · избор, катинар и причината, с която се заключва.
 *
 * Знакът носи същия клас като при живото меню (`znak-menyu`), защото двете са
 * едно семейство: човекът вижда или „＋ нова стойност", или „🔒" — и никога
 * поле, което мълчи за това кое от двете е.
 */
export function poleSIzbor(p: PoleSIzbor): string {
  const opis = ZAKLYUCHENITE[p.spisak];
  const kazva = opis ? opis.kazva : 'списъкът е заключен';
  return `
    <div class="pole">
      <label for="${ekraniraj(p.id)}">${ekraniraj(p.etiket)}</label>
      <select translate="no" id="${ekraniraj(p.id)}" name="${ekraniraj(p.ime ?? p.id)}"${
        p.zadalzhitelno ? ' required' : ''
      }${p.izklyuchen ? ' disabled' : ''}>${p.opcii}</select>
      <span class="znak-menyu" data-zaklyuchen="${ekraniraj(p.spisak)}">🔒 ${ekraniraj(kazva)}</span>
    </div>`;
}

/**
 * ВРЪЗКАТА КЪМ ПРЕПИСКА (М12 · р69·[48] · резен 89): „нова колона prepId
 * (връзка към преписка в Регистъра), prep остава разчетът-число."
 *
 * ЕДНО поле за ДВЕТЕ страни на парите — разходът в Сметки и плащането в
 * Пари. По избор; без нито една преписка полето не се РАЖДА — няма какво
 * да се избере (прецедентът на празните групи). Само `id`-то се различава,
 * за да не се сблъскат двете форми на един екран.
 */
export function poleZaPrepiska(
  id: string,
  prepiski: ReadonlyMap<string, { readonly id: string; readonly kontakt: string; readonly kakvo: string }>,
): string {
  if (prepiski.size === 0) return '';
  return `<div class="pole">
            <label for="${ekraniraj(id)}">Преписка (по избор)</label>
            <select translate="no" id="${ekraniraj(id)}" name="prepiska">
              <option value="">— без преписка —</option>
              ${[...prepiski.values()]
                .map((pr) => `<option value="${ekraniraj(pr.id)}">${ekraniraj(pr.kontakt)} · ${ekraniraj(pr.kakvo)}</option>`)
                .join('')}
            </select>
          </div>`;
}

/**
 * Закача закона за всички полета с меню в даден корен.
 *
 * НЕ ПРЕРИСУВА екрана. Оцветяването става при всяко натискане на клавиш; пълно
 * прерисуване там би изтрило написаното под ръцете на човека и би върнало
 * каретката в началото — същият дефект, който вече беше платен веднъж при
 * редакцията в клетката.
 *
 * Менютата се подават по КЛЮЧ, защото HTML не носи стойности: атрибутът пази
 * само кой е ключът, а речникът живее в подадената карта.
 */
export function zakachiMenyuta(
  koren: HTMLElement,
  menyuta: ReadonlyMap<string, Menyu>,
): void {
  for (const pole of koren.querySelectorAll<HTMLInputElement>('input[data-menyu]')) {
    const menyu = menyuta.get(pole.dataset['menyu'] ?? '');
    if (!menyu) continue;

    const osvezhi = () => {
      const r = sastoyanieNaPoleto({
        menyu,
        vaveden: pole.value,
        izbrano: pole.dataset[IZBRANO] ?? '',
      });
      // Цветът е КЛАС, не inline стил: CSP `default-src 'self'` блокира
      // `style="…"` в разметката, а и цветовете живеят в темата.
      pole.classList.toggle('menyu-sinio', r.tsvyat === 'sinio');
      pole.classList.toggle('menyu-cherno', r.tsvyat === 'cherno');
      pole.classList.toggle('menyu-otkazano', r.sastoyanie === 'otkazano');
      // ЗАКЛЮЧЕНОТО не спира писането — то отказва при ЗАПИС и го казва.
      // `setCustomValidity` носи отказа до самата форма, вместо да го оставя
      // само на екрана: така изпращането спира, без нито един изскачащ прозорец.
      pole.setCustomValidity(r.priema ? '' : r.kazva);
      const znak = koren.querySelector<HTMLElement>(`[data-znak-za="${CSS.escape(pole.id)}"]`);
      if (znak) {
        znak.textContent = r.znak;
        znak.title = r.kazva;
        znak.classList.toggle('trevoga', !r.priema);
      }
    };

    pole.addEventListener('input', (e) => {
      // ИЗБОР ОТ СПИСЪКА се съобщава като „подменен текст"; писането — не.
      // Където браузърът мълчи, полето остава ЧЕРНО — най-безопасната посока,
      // и същата, която законът вече иска при случайно съвпадение.
      const vid = (e as InputEvent).inputType;
      if (vid === 'insertReplacementText') pole.dataset[IZBRANO] = pole.value;
      else if (pole.dataset[IZBRANO] !== undefined && pole.value !== pole.dataset[IZBRANO]) {
        // „Почернява в мига, в който се различи от избраното" — следата от
        // натискането пада, за да не се върне синьото при обратно изтриване.
        delete pole.dataset[IZBRANO];
      }
      osvezhi();
    });
    // `change` хваща избора в браузърите, които не съобщават `inputType`.
    pole.addEventListener('change', osvezhi);

    // Полето може да идва с попълнена стойност (поправка на ред) — тогава тя
    // е ИЗБРАНА: човекът не я е писал сега, тя вече е била записана.
    if (pole.value !== '') {
      pole.dataset[IZBRANO] = pole.value;
      osvezhi();
    }
  }
}

/**
 * Кои стойности ще влязат НОВИ в речника при запис · за съобщението след него.
 *
 * Проверява се СЛЕД записа, за да каже „и „Акт 16" влезе в списъка" — човекът
 * научава какво е направил, без нищо да го е спирало преди това.
 */
export function novoteVSpisatsite(
  koren: HTMLElement,
  menyuta: ReadonlyMap<string, Menyu>,
): readonly { readonly menyu: string; readonly tekst: string }[] {
  const novi: { menyu: string; tekst: string }[] = [];
  for (const pole of koren.querySelectorAll<HTMLInputElement>('input[data-menyu]')) {
    const menyu = menyuta.get(pole.dataset['menyu'] ?? '');
    if (!menyu) continue;
    const r = sastoyanieNaPoleto({
      menyu,
      vaveden: pole.value,
      izbrano: pole.dataset[IZBRANO] ?? '',
    });
    if (r.shteDobavi) novi.push({ menyu: menyu.ime, tekst: pole.value.trim() });
  }
  return novi;
}

/** Едно изречение за новите стойности · празно, когато няма такива. */
export function sDumiZaNovite(
  novi: readonly { readonly menyu: string; readonly tekst: string }[],
): string {
  if (novi.length === 0) return '';
  const spisak = novi.map((n) => `„${n.tekst}" в „${n.menyu}"`).join(' · ');
  return novi.length === 1
    ? ` Нова стойност: ${spisak}.`
    : ` Нови стойности: ${spisak}.`;
}
