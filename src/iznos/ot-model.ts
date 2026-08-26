/**
 * МОСТЪТ · от МОДЕЛ НА ХЕДЪР към ТАБЛИЦА, която се пише.
 *
 * Негови думи (23.08), с които този файл се роди:
 *
 *   „Контейнерите ги направи като таблиците, които съм ти дал.
 *    ФУНКЦИОНАЛНОСТТА ДАВА ВЪЗМОЖНОСТ ДА ПРЕТВОРИШ МОДЕЛА НА ТАБЛИЦАТА, ОТ
 *    КОЯТО ЧЕТЕШ. Така ще се напълнят контейнерите с таблици за експеримент."
 *
 * Дотук моделът работеше в ЕДНА посока: файл → модел → редове. Резен 12 научи
 * приложението да познава чужда глава; тук същата глава се връща навън. Оттам
 * контейнер без данни може да получи ОБРАЗЕЦ — таблица с точно неговите
 * колони, която той пълни и връща обратно през същия модел.
 *
 * ЗАЩО НЕ Е ПРОСТО „ИЗНОС". Износът в `arhiv.ts` пише ПЕТ ЗАКОВАНИ листа —
 * тяхната глава е в кода. Тук главата идва от Журнала: сменѝ модела, сменя се
 * и образецът, без нито един ред код. Това е третият закон на скелета („нищо
 * не е константа"), приложен към изхода.
 *
 * ЗАЩО ЗАТВОРЕНИТЕ КОЛОНИ СЕ ОТБЕЛЯЗВАТ. Негово деление: затворената показва
 * сметка или пренесен текст. Образец, който кани човека да пише в нея, лъже —
 * затова тя носи знак в заглавието си и празна клетка отдолу.
 */

import {
  IMENA_NA_ROLITE,
  redoveSDanni,
  type ModelNaTablitsa,
  type Rolya,
} from '../iztochnik/model.js';
import { kletka, type Tablitsa } from '../iztochnik/tablitsa.js';
import { vidNaKolona } from '../domein/kolonno.js';
import type { KolonaNaLista, List } from './excel.js';

/** Знакът, с който се отбелязва затворена колона в заглавието на образеца. */
export const ZNAK_ZATVORENA = '🔒';

/**
 * Заглавията на един модел — така, както ги е написал източникът.
 *
 * Отпечатъкът е сведен към малки букви, за да познава същата глава от друг
 * износ; за претворяване той не става. Стар модел без `glavi` пада към него —
 * по-добре сведена глава, отколкото никаква.
 */
function glaviNaModel(m: ModelNaTablitsa): readonly string[] {
  return m.glavi.length > 0 ? m.glavi : m.otpechatak.split('|');
}

/** Роля → номер на колона, обърнато: номер → роля. За заглавията и за реда. */
function poKolona(m: ModelNaTablitsa): ReadonlyMap<number, Rolya> {
  const izhod = new Map<number, Rolya>();
  for (const [rolya, kolona] of Object.entries(m.koloni) as [Rolya, number][]) {
    izhod.set(kolona, rolya);
  }
  return izhod;
}

/**
 * ПРЕТВОРЯВА модела в лист · главата, каквато я е познал, плюс ролите.
 *
 * Заглавието носи и ролята, която моделът ѝ е дал („Сума по документа · сума"),
 * защото образецът пътува: човек го отваря след седмица и трябва да види защо
 * тази колона значи пари, без да отваря приложението.
 */
function listOtModel(
  m: ModelNaTablitsa,
  n: { ime?: string; redove?: readonly (readonly (string | number)[])[] } = {},
): List {
  const glavi = glaviNaModel(m);
  const roli = poKolona(m);

  const koloni: KolonaNaLista[] = glavi.map((ime, k) => {
    const rolya = roli.get(k);
    const zatvorena = vidNaKolona(m, k) === 'zatvorena';
    const chasti = [ime.trim() || `колона ${k + 1}`];
    if (rolya) chasti.push(IMENA_NA_ROLITE[rolya]);
    if (zatvorena) chasti.push(ZNAK_ZATVORENA);
    return { ime: chasti.join(' · '), shirina: Math.max(12, chasti.join(' · ').length + 2) };
  });

  return { ime: (n.ime ?? m.klyuch).slice(0, 31), koloni, redove: n.redove ?? [] };
}

/**
 * Празен ОБРАЗЕЦ по този модел · толкова празни реда, колкото са поискани.
 *
 * Затворените колони остават празни и в образеца: те се смятат, не се пишат.
 */
export function obrazetsOtModel(m: ModelNaTablitsa, redove = 12): List {
  const shirina = glaviNaModel(m).length;
  const prazen = Array.from({ length: shirina }, () => '');
  return listOtModel(m, { redove: Array.from({ length: redove }, () => [...prazen]) });
}

/**
 * ПРЕТВОРЯВА прочетена таблица обратно през модела ѝ.
 *
 * Взимат се само редовете С ДАННИ — главата идва от модела, не от файла, за да
 * не пътуват навън празните редове, които Excel ражда над всеки хедър.
 */
export function listOtTablitsa(m: ModelNaTablitsa, t: Tablitsa, ime?: string): List {
  const shirina = glaviNaModel(m).length;
  const redove = redoveSDanni(m, t).map((red) =>
    Array.from({ length: shirina }, (_, k) => kletka(t, red, k)),
  );
  return listOtModel(m, { ...(ime === undefined ? {} : { ime }), redove });
}
