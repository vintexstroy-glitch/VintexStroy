/**
 * ЧЕСТНАТА СПИРАЧКА · заявка за плана и проверка на драйва (резен Д).
 *
 * ═══ ПРАВИЛОТО, ДУМА ПО ДУМА ═══
 *
 * `CLAUDE.md`: „**Защитата е честна спирачка, не ключалка.** Заявка за плана +
 * проверка на драйва ловят НЕВОЛНАТА грешка. Нарочна измама иска сървър."
 *
 * И: „Размерът се **МЕРИ** (`hranilishte`), не се пита."
 *
 * Двете изречения са едно решение: питаме ДОСТАВЧИКА какъв е акаунтът, мерим
 * колко място има, казваме какво значи — и **не заключваме нищо**. Човек, който
 * иска да заобиколи това, отваря конзолата и го заобикаля за трийсет секунди.
 * Спирачка, която се прави на ключалка, лъже и двете страни.
 *
 * ═══ ТРЕТОТО СЪСТОЯНИЕ · „НЕ Е ПИТАНО" ═══
 *
 * Дотук `Samolichnost.hranilishte` се пълнеше с `'безплатно'` при влизане —
 * ЗАКОВАНО, никога питано. То изглеждаше като ФАКТ и се сравняваше с плановете
 * като факт. Не беше: беше подразбиране, преоблечено като измерване.
 *
 * Затова видовете стават ТРИ, и третият е състояние, не липса (правило 15):
 * докато не сме питали, не твърдим нищо. Екранът го КАЗВА и предлага да пита.
 *
 * ═══ ЗАЩО ЛИМИТЪТ, А НЕ ЗАЕТОТО ═══
 *
 * „Платен ли е акаунтът" се чете от ТАВАНА, не от пълнотата: човек с 2 ТБ и
 * един файл вътре е платен клиент; друг с пълни 15 ГБ — не е. Заетото казва
 * друго нещо (има ли къде да се пише) и се мери отделно.
 */

import type { VidHranilishte } from '../yadro/samolichnost.js';
import type { Plan } from './planove.js';
import { stigaLiHranilishteto } from './planove.js';

export class GreshkaSpiratchka extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaSpiratchka';
  }
}

/**
 * БЕЗПЛАТНИЯТ ТАВАН · 15 ГиБ, споделени между Drive, Gmail и Photos.
 *
 * Числото е на Google и е записано ТУК, с източника си, а не разпръснато по
 * условия: сменѝ ли се, се сменя на едно място. Праг „по-голямо от това" е
 * по-честен от списък с познати платени размери — Google One продава пет
 * различни, и списъкът щеше да остарее с първия нов.
 */
export const BEZPLATEN_TAVAN_BAYTOVE = 15 * 1024 * 1024 * 1024;

/** Каквото Драйвът КАЗВА за себе си · нищо повече. */
export interface KvotaNaDrayva {
  /** таванът в байтове; -1 когато доставчикът не го казва (безлимитен акаунт) */
  readonly limit: number;
  /** заетото в байтове */
  readonly zaeto: number;
}

/**
 * ВИДЪТ СЕ МЕРИ ОТ ТАВАНА · не се пита човека и не се гади.
 *
 * `-1` значи „доставчикът не казва таван". При Google това е фирменият акаунт
 * без ограничение — тоест ПЛАТЕН. Прочетено като „не знам", то би върнало
 * най-скъпия клиент в графата на безплатните.
 */
export function vidNaHranilishteto(k: KvotaNaDrayva): VidHranilishte {
  if (!Number.isFinite(k.limit)) {
    throw new GreshkaSpiratchka(`Таванът е число байтове; получено: ${k.limit}`);
  }
  if (k.limit < 0) return 'платено';
  return k.limit > BEZPLATEN_TAVAN_BAYTOVE ? 'платено' : 'безплатно';
}

/** Свободното място · и то е ЧИСЛО, не усещане. */
export function svobodnoto(k: KvotaNaDrayva): number {
  if (k.limit < 0) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, k.limit - k.zaeto);
}

/** Трите изхода на спирачката · и нито един от тях не е „забранено". */
export type Otsenka = 'stiga' | 'tyasno' | 'ne stiga' | 'ne e pitano';

/**
 * ПРАГЪТ НА „ТЯСНО" · под една пета от нужното свободно място.
 *
 * Не е предупреждение за красота: между „стига" и „не стига" има седмици, в
 * които човек още може да купи място, без да спира работа. Праг, който светва
 * чак при нула, светва след като е станало късно.
 */
export const TYASNO_DEL = 5;

export interface Presmyatka {
  readonly otsenka: Otsenka;
  /** какво е нужно · сборът, който сме МЕРИЛИ */
  readonly nuzhno: number;
  readonly svobodno: number;
  readonly vid: VidHranilishte | 'не е питано';
  /** иска ли планът платен облак изобщо */
  readonly planatIskaPlaten: boolean;
  /** стига ли ВИДЪТ за плана · отделно от мястото */
  readonly vidatStiga: boolean;
}

/**
 * СПИРАЧКАТА · сравнява ДВЕ неща и не смесва отказите им.
 *
 *   1. ВИДЪТ на акаунта стига ли за плана (безплатен акаунт под платен план)
 *   2. МЯСТОТО стига ли за онова, което ще се пише
 *
 * Двете падат по различни причини и се лекуват различно: първото с покупка на
 * план при доставчика, второто с чистене или с по-голям пакет. Слети в един
 * булев, човек получава „не може" и не знае накъде да тръгне.
 */
export function presmetni(n: {
  readonly plan: Plan;
  readonly kvota: KvotaNaDrayva | null;
  readonly nuzhno: number;
  /**
   * КАКВОТО САМОЛИЧНОСТТА ПОМНИ · когато Драйвът не е питан В ТАЗИ сесия.
   *
   * Без него полето `Samolichnost.hranilishte` беше мъртво тегло: картата
   * четеше само пресния отговор и връщането на закованото „безплатно" не се
   * виждаше никъде. Проходът го намери — счупването МИНА.
   */
  readonly vidOtSamolichnostta?: VidHranilishte;
}): Presmyatka {
  if (n.nuzhno < 0 || !Number.isFinite(n.nuzhno)) {
    throw new GreshkaSpiratchka(`Нужното е байтове от нула нагоре; получено: ${n.nuzhno}`);
  }

  // НЕ Е ПИТАНО · и това НЕ е „не стига". Тишината не е отказ (правило 15).
  //
  // ВИДЪТ пак се КАЗВА, ако самоличността го помни от по-рано — но МЯСТОТО не
  // се измисля: таван без прясна квота е стар таван. Двете идват от различни
  // мигове и не се сливат.
  if (n.kvota === null) {
    const vid = n.vidOtSamolichnostta ?? 'не е питано';
    return Object.freeze({
      otsenka: 'ne e pitano',
      nuzhno: n.nuzhno,
      svobodno: -1,
      vid,
      planatIskaPlaten: n.plan.iskaPlatenOblak,
      vidatStiga: vid === 'не е питано' ? false : stigaLiHranilishteto(n.plan, vid),
    });
  }

  const vid = vidNaHranilishteto(n.kvota);
  const svobodno = svobodnoto(n.kvota);
  const vidatStiga = stigaLiHranilishteto(n.plan, vid);

  let otsenka: Otsenka;
  if (!vidatStiga || svobodno < n.nuzhno) otsenka = 'ne stiga';
  else if (svobodno < n.nuzhno * TYASNO_DEL) otsenka = 'tyasno';
  else otsenka = 'stiga';

  return Object.freeze({
    otsenka,
    nuzhno: n.nuzhno,
    svobodno,
    vid,
    planatIskaPlaten: n.plan.iskaPlatenOblak,
    vidatStiga,
  });
}

/**
 * ДУМИТЕ НА СПИРАЧКАТА · и те казват КЪДЕ да се тръгне, не само „не".
 *
 * Едно място за изреченията (правило 17): екранът ги показва, тестът ги мери.
 * Разпръснати по екрана, те щяха да се разминат с оценката при първата поправка.
 */
export function sDumi(p: Presmyatka): string {
  switch (p.otsenka) {
    case 'ne e pitano':
      return 'Драйвът още не е питан. Докато не питаме, не твърдим нищо за акаунта.';
    case 'stiga':
      return 'Мястото стига с голям запас.';
    case 'tyasno':
      return 'Мястото стига, но е ТЯСНО — купи място, преди да свърши, не след това.';
    case 'ne stiga':
      return p.vidatStiga
        ? 'Мястото НЕ стига за онова, което ще се пише. Изчисти или вземи по-голям пакет.'
        : 'Този план иска ПЛАТЕН акаунт при доставчика, а този е безплатен. ' +
          'Планът се купува при Google, Microsoft или Apple, не при нас (правило 14).';
  }
}

/**
 * СПИРАЧКА, НЕ КЛЮЧАЛКА · какво СЕ СЛУЧВА при отказ.
 *
 * Връща `true` само за „да се покаже предупреждение". Никъде в кода няма
 * функция, която да ЗАБРАНЯВА заради това число — и това е нарочно, обявено, и
 * пазено от тест: „нарочна измама иска сървър".
 */
export function trebvaLiDaSePredupredi(p: Presmyatka): boolean {
  return p.otsenka === 'ne stiga' || p.otsenka === 'tyasno';
}

/**
 * КОИ ПЛАНОВЕ ИСКАТ ПЛАТЕН ОБЛАК · днес НИТО ЕДИН, и това се БРОИ.
 *
 * Открито при строежа на резена: `stigaLiHranilishteto` съществува, Таблото го
 * вика, и той връща `true` ВИНАГИ — защото `iskaPlatenOblak` е `false` и на
 * четирите плана.
 *
 * И това е ВЯРНО, не пропуск. `CLAUDE.md`: „**Няма безплатен ПЛАН. Безплатен е
 * АКАУНТЪТ** — Gmail, Microsoft или Apple." Платен е НАШИЯТ план, не
 * хранилището при доставчика.
 *
 * Тоест спирачката днес спира по ЕДНА ос — мястото, — а другата е механизъм
 * без данни зад себе си. Механизмът ОСТАВА (утре може да има издание, което
 * иска повече от 15 ГБ), но фактът се БРОИ ОТ ТУК, не се твърди в коментар:
 * добави ли се такъв план, числото се мени и тестът го казва (ADR-067).
 */
export function planoveSPlatenOblak(planove: readonly Plan[]): readonly string[] {
  return Object.freeze(planove.filter((p) => p.iskaPlatenOblak).map((p) => p.klyuch));
}
