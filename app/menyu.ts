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
import {
  predlagani,
  sastoyanieNaPoleto,
  type Menyu,
  type VidVhod,
} from '../src/domein/padashti-menyuta.js';

/** Какво знае екранът за едно поле с меню. */
export interface PoleSMenyu {
  readonly id: string;
  /** име на полето във формата (`name`) · по подразбиране същото като id-то */
  readonly ime?: string;
  readonly etiket: string;
  readonly menyu: Menyu;
  readonly stoynost?: string;
  readonly zadalzhitelno?: boolean;
  readonly mestodarzhatel?: string;
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
