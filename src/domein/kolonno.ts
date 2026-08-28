/**
 * КОЛОННОТО ПРАВО · Редактира · Вижда · Скрито · и защо са ТРИ, а не две.
 *
 * ═══ НЕГОВИТЕ ДУМИ, по ред на казване ═══
 *
 * 11.08 · първото броене:
 *
 *   „напиши само тези филтри — 3 филтри: Вижда, Скрито, Редактира…
 *    Редакторът на хедъри къде живее? (ВЗС) В Настройки — единственото място ★"
 *
 * 12.08 · и ЛОСТЪТ, дословно *(ред 2047 · разговор 83)*:
 *
 *   „…но по-правилното е да е с падащо меню от фиксирани — изборът,
 *    редактира, вижда, скрито."
 *
 * 23.08 · И57, което ги стесни:
 *
 *   „Вижда и скрито са редактор САМО ЗА ГЛАВНИЯ АКАУНТ. Там с това разпределя
 *    достъпа и ролята. За всеки служител с дадена му вече роля и достъп, може с
 *    тази функция НЕ ДА РЕДАКТИРА, А ДА СКРИВА САМО."
 *
 * 27.08 · И105, последната дума:
 *
 *   „нека е с падащо меню с дума на избора и да са 3 варианта. Вкарай го като
 *    план навсякъде, когато дойде момента."
 *
 * ═══ КАК СЕ ПОМИРЯВАТ · и това е ЦЕЛИЯТ избор на този файл ═══
 *
 * Дотук тук стояха ДВЕ стойности, защото И57 бие 12.08. И105 е ПО-КЪСНО и от
 * двете (правило 28: последната дума бие) и връща третата — но НЕ отменя И57.
 *
 * Двете стоят заедно по един-единствен начин: **правото е ТАВАН, не дарение.**
 *
 *   · Три стойности, наредени от най-широката към най-тясната:
 *     `redaktira` → `vizhda` → `skrito`.
 *   · Изборът може само да СТЕСНИ. „Редактира" значи „не съм стеснил нищо",
 *     а не „давам редакция на този човек".
 *   · Кой изобщо може да редактира, решава РОЛЯТА (при доставчика, правило 14)
 *     и ВИДЪТ на колоната. Значи И57 остава дословно вярно: с тази функция
 *     Стопанинът не раздава редакция — той я отнема.
 *
 * Обратното четене („редактира" ВДИГА наблюдател до редактор) би направило
 * този екран втора врата към достъпа — точно каквото правило 14 отказва, и
 * точно каквото И57 забранява с думи.
 *
 * ЗАЩО ТОГАВА Е НУЖНА ТРЕТАТА. Защото средната е новата: дотук се можеше само
 * „скрий". Сега може и „нека я гледа, но да не я пипа" — негово, дословно:
 * „може да му спреш достъпа и нищо да не вижда от реда, ИЛИ САМО ДА ВИЖДА
 * ВСИЧКО" *(ред 1646 · 12.08)*.
 *
 * ═══ ТРИТЕ ПРАВИЛА, които НЕ се менят ═══
 *
 * 1. ЗАТВОРЕНА КОЛОНА НЕ СЕ РЕДАКТИРА ОТ НИКОГО. Негови думи: „Затворената
 *    колона от всякъде е само скриване за удобство и връщане, ако решиш."
 *    Тя е сметка или пренесен текст — да ѝ се даде редакция значи да се пише
 *    върху резултат. Затова видът също е ТАВАН, и той е „вижда".
 *
 * 2. СКРИТОТО ПАК СЕ СМЯТА. Негови думи: „сметките остават, ако са скрити, и се
 *    смятат и в двата варианта." Скриването пипа ЕКРАНА и нищо друго — нито
 *    сбор, нито Журнал. Иначе „скрий" би значело „изтрий" и някой ден числото
 *    щеше да падне, без някой да е искал.
 *
 * 3. ЗАПИСВАТ СЕ САМО ОТКЛОНЕНИЯТА. Двата списъка носят стеснените колони;
 *    всичко неспоменато е „не съм стеснил нищо". Списък с всичко разрешено би
 *    трябвало да се пренаписва при всяка нова колона, и първата забравена
 *    колона щеше да изчезне тихо от нечий екран.
 *
 * ЗАЩО КОЛОНА СЕ СКРИВА, А РЕД СЕ ИЗКЛЮЧВА. Негово: „той е различен от
 * падащите менюта, защото за колоната я скрива, а за редовете ги изключва." И
 * причината, също негова: „да изключва колоната от сметката ще изключи всички
 * редове с Дела и Срещи". Двете не се разменят и този файл не дава начин.
 *
 * ЗАЩО ФИЛТЪРЪТ ОСТАВА. Негова поправка (23.08): „може да се филтрира от
 * филтъра в името — малко бутонче, както е подробният филтър в Линдолс."
 * Затвореността спира ПИСАНЕТО, не гледането.
 *
 * Пълната тема — `docs/izvori/03-koloni-hedari-tablitsi.md` · ADR-065.
 */

import type { ModelNaTablitsa } from '../iztochnik/model.js';
import {
  IMENA_NA_ROLITE,
  mozheDaRedaktira,
  type Rolya as RolyaNaChovek,
} from '../yadro/samolichnost.js';

/**
 * ДВАТА ВИДА КОЛОНИ · негово деление, дословно.
 *
 * Внимание за две думи, които си приличат: `Rolya` в `samolichnost.ts` е роля
 * на ЧОВЕК, а `Rolya` в `model.ts` е роля на КОЛОНА. Колонното право е точно
 * пресечната им точка — затова тук човешката се внася преименувана.
 */
type VidKolona = 'promenlyva' | 'zatvorena';

export const IMENA_NA_VIDOVETE: Readonly<Record<VidKolona, string>> = Object.freeze({
  promenlyva: 'променяща се',
  zatvorena: 'затворена',
});

/**
 * КАКВО МОЖЕ ЕДИН СЛУЖИТЕЛ С ЕДНА КОЛОНА · ТРИ, наредени.
 *
 * Редът НЕ е азбучен и не е случаен: от най-широкото към най-тясното. По него
 * се смята най-тясното от няколко тавана, без нито едно `if`.
 */
export type PravoNaKolona = 'redaktira' | 'vizhda' | 'skrito';

/** Трите, В РЕДА ИМ · падащото меню ги изрежда оттук, не ги преписва. */
export const PRAVA_NA_KOLONA: readonly PravoNaKolona[] = Object.freeze([
  'redaktira',
  'vizhda',
  'skrito',
]);

export const IMENA_NA_PRAVATA: Readonly<Record<PravoNaKolona, string>> = Object.freeze({
  redaktira: 'редактира',
  vizhda: 'вижда',
  skrito: 'скрито',
});

/** Едно изречение до всяка дума · човек избира по смисъл, не по име. */
export const OBYASNENIYA_NA_PRAVATA: Readonly<Record<PravoNaKolona, string>> = Object.freeze({
  redaktira: 'не е стеснена · ролята и видът решават',
  vizhda: 'гледа я, но не я пипа',
  skrito: 'не я вижда · сборът ѝ пак се смята',
});

/** Колко широко е · само за сравнение, никога за запис. */
const SHIRINA: Readonly<Record<PravoNaKolona, number>> = Object.freeze({
  redaktira: 2,
  vizhda: 1,
  skrito: 0,
});

/**
 * ПО-ТЯСНОТО ОТ ДВЕТЕ · оттук идва цялото смятане на правото.
 *
 * Таваните се СРЕЩАТ, не се избират: ролята, видът на колоната и записаният
 * избор са три ограничения върху едно и също нещо, и важи най-тясното.
 */
export function poTyasnoto(a: PravoNaKolona, b: PravoNaKolona): PravoNaKolona {
  return SHIRINA[a] <= SHIRINA[b] ? a : b;
}

export class GreshkaPravo extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaPravo';
  }
}

/**
 * ПРАВАТА НА ЕДИН СЛУЖИТЕЛ ВЪРХУ ЕДИН ХЕДЪР · записват се САМО стеснените.
 *
 * ДВА списъка, не карта колона→дума. Причината е правило 3 от шапката:
 * неспоменатата колона е „не съм стеснил нищо", значи новата колона се появява
 * без никой да я е добавял. Карта с всички стойности би трябвало да се
 * пренаписва при всяка нова колона.
 */
export interface PravaZaModel {
  /** на кого — имейлът, същият, който влиза в Журнала като `actor` */
  readonly imeyl: string;
  /** кой хедър — ключът на модела */
  readonly model: string;
  /** номерата на СКРИТИТЕ колони */
  readonly skriti: readonly number[];
  /** номерата на колоните, СВАЛЕНИ до „вижда" — гледа ги, не ги пипа */
  readonly samoVizhdat: readonly number[];
}

/** Същността в Журнала. Едно право на двойка (служител, хедър). */
export function sashtnostNaPravo(imeyl: string, model: string): string {
  return `PRAVO:${imeyl}:${model}`;
}

/**
 * Ключът в картата на Огледалото · СЪЩАТА двойка, един дом (правило 17).
 * Съставяше се на ръка на три места — форматът му беше на един разминат
 * интервал от тиха загуба на право.
 */
export function klyuchNaPravo(imeyl: string, model: string): string {
  return `${imeyl}|${model}`;
}

/** Номерата на колони · един и същ отказ за двата списъка. */
function nomeraNaKoloni(surovi: readonly number[] | undefined): readonly number[] {
  const nomera = [...new Set(surovi ?? [])].sort((a, b) => a - b);
  for (const k of nomera) {
    if (!Number.isInteger(k) || k < 0) {
      throw new GreshkaPravo(`Колона „${k}" не е номер на колона.`);
    }
  }
  return Object.freeze(nomera);
}

export function napraviPrava(n: {
  imeyl: string;
  model: string;
  skriti?: readonly number[];
  samoVizhdat?: readonly number[];
}): PravaZaModel {
  const imeyl = n.imeyl.trim().toLowerCase();
  const model = n.model.trim();

  if (imeyl === '') throw new GreshkaPravo('Правото иска имейл — на него се записва.');
  if (model === '') throw new GreshkaPravo('Правото иска хедър — то важи за един модел.');

  const skriti = nomeraNaKoloni(n.skriti);
  const samoVizhdat = nomeraNaKoloni(n.samoVizhdat);

  // ЕДНА КОЛОНА · ЕДНА ДУМА. В двата списъка наведнъж тя няма отговор, а
  // мълчаливото предпочитане на единия би било решение, скрито в кода.
  const vDvata = skriti.filter((k) => samoVizhdat.includes(k));
  if (vDvata.length > 0) {
    throw new GreshkaPravo(
      `Колона ${vDvata.map((k) => k + 1).join(', ')} е и скрита, и само за гледане. ` +
        'Едно право на колона — изборът е ЕДИН от трите.',
    );
  }

  return Object.freeze({ imeyl, model, skriti, samoVizhdat });
}

/**
 * ЧЕТЕ ПРАВО ОТ ЖУРНАЛА · снизходително, както `fold()` (правило 1).
 *
 * Събитията, писани преди третата стойност, нямат `samoVizhdat`. Прочетени
 * направо, те дават `undefined` и първото `.includes` събаря Огледалото —
 * тоест книга, писана вчера, не се отваря днес. Затова тук липсващото става
 * празен списък, а не изключение.
 */
export function pravaOtZhurnala(surovo: {
  readonly imeyl: string;
  readonly model: string;
  readonly skriti?: readonly number[];
  readonly samoVizhdat?: readonly number[];
}): PravaZaModel {
  return Object.freeze({
    imeyl: surovo.imeyl,
    model: surovo.model,
    skriti: Object.freeze([...(surovo.skriti ?? [])]),
    samoVizhdat: Object.freeze([...(surovo.samoVizhdat ?? [])]),
  });
}

/**
 * „Смени ли се нещо изобщо" · за сравнение преди запис, НЕ за `opId`.
 *
 * Същата работа като `belegNaModel` и `belegNaButon`, и същата причина да не
 * става за ключ: скрий → покажи → скрий връща старото съдържание, и повторен
 * ключ от него би върнал стария резултат, а колоната щеше да остане видима.
 */
export function belegNaPravo(p: PravaZaModel): string {
  return `${p.imeyl}|${p.model}|${[...p.skriti].join('.')}|${[...p.samoVizhdat].join('.')}`;
}

/** Видът на една колона — от модела на хедъра, където го е записал човекът. */
export function vidNaKolona(m: ModelNaTablitsa, kolona: number): VidKolona {
  return m.zatvoreni.includes(kolona) ? 'zatvorena' : 'promenlyva';
}

/**
 * ЗАПИСАНИЯТ избор за тази колона · без ролята и без вида.
 *
 * Неспоменатата колона връща `redaktira` — „не съм стеснил нищо". Това НЕ значи
 * „този човек редактира": какво излиза накрая, казва `deystvashtoPravo`.
 */
export function pravoNaKolona(
  prava: PravaZaModel | undefined,
  kolona: number,
): PravoNaKolona {
  if (prava?.skriti.includes(kolona)) return 'skrito';
  if (prava?.samoVizhdat.includes(kolona)) return 'vizhda';
  return 'redaktira';
}

/**
 * ДЕЙСТВАЩОТО право · най-тясното от ТРИТЕ тавана.
 *
 * | таван | откъде идва | най-широкото, което пуска |
 * | роля | акаунтът · при доставчика (правило 14) | наблюдател → `vizhda` |
 * | вид на колоната | хедърът | затворена → `vizhda` |
 * | записан избор | този екран | какъвто е |
 *
 * Три ограничения върху едно нещо се СРЕЩАТ. Затова тук няма подредба на
 * приоритети и няма „кое бие кое" — има най-тясно, и то се смята.
 */
export function deystvashtoPravo(n: {
  rolya: RolyaNaChovek;
  vid: VidKolona;
  pravo: PravoNaKolona;
}): PravoNaKolona {
  const otRolyata: PravoNaKolona = mozheDaRedaktira({ rolya: n.rolya }) ? 'redaktira' : 'vizhda';
  const otVida: PravoNaKolona = n.vid === 'zatvorena' ? 'vizhda' : 'redaktira';
  return [otRolyata, otVida].reduce(poTyasnoto, n.pravo);
}

/**
 * ЗАЩО ИЗБОРЪТ НЕ ДЕЙСТВА · с думи, или празно (правило 15).
 *
 * Изключено ≠ липсващо. Стопанинът може да избере „редактира" за наблюдател или
 * за затворена колона — изборът се ЗАПИСВА и стои, но не действа. Мълчаливото
 * му игнориране би направило падащото меню надпис: човек избира, нищо не се
 * мени, и никой не му казва защо.
 */
export function zashtoNeDeystva(n: {
  rolya: RolyaNaChovek;
  vid: VidKolona;
  pravo: PravoNaKolona;
}): string {
  const deystva = deystvashtoPravo(n);
  if (deystva === n.pravo) return '';
  if (n.vid === 'zatvorena') {
    return 'затворената колона е СМЕТКА — редакция не се дава на никого, дори на собственика';
  }
  return `ролята „${IMENA_NA_ROLITE[n.rolya]}" вече стеснява до „${IMENA_NA_PRAVATA[deystva]}"`;
}

/**
 * МОЖЕ ЛИ ТОЗИ ЧОВЕК ДА РЕДАКТИРА ТАЗИ КОЛОНА · трите тавана, събрани в един.
 *
 * Точно това ADR-002 наричаше „остава разчертаването колона по колона". Не се
 * разчертава от нас: ролята идва от акаунта, видът — от хедъра, а изборът е
 * само стеснение върху тях.
 *
 * Скритата колона не се редактира не защото правото го забранява, а защото не
 * се вижда. Казва се на глас, за да не се търси после друга причина.
 */
export function mozheDaRedaktiraKolona(n: {
  rolya: RolyaNaChovek;
  vid: VidKolona;
  pravo: PravoNaKolona;
}): boolean {
  return deystvashtoPravo(n) === 'redaktira';
}

/**
 * Кои колони вижда този служител — от всички номера на колони в таблицата.
 *
 * САМО `skriti` махат колона. Свалената до „вижда" СЕ ВИЖДА — там е разликата
 * между двете стеснения и точно затова са две думи, а не една.
 */
export function vidimiKoloni(
  vsichki: readonly number[],
  prava: PravaZaModel | undefined,
): readonly number[] {
  return prava === undefined ? vsichki : vsichki.filter((k) => !prava.skriti.includes(k));
}

/** Едно изречение за екрана: какво е стеснено и на кого. */
export function sDumi(p: PravaZaModel): string {
  const chasti: string[] = [];
  if (p.skriti.length > 0) chasti.push(`${p.skriti.length} скрити`);
  if (p.samoVizhdat.length > 0) chasti.push(`${p.samoVizhdat.length} само за гледане`);
  if (chasti.length === 0) return `${p.imeyl} · нищо не е стеснено в „${p.model}"`;
  return `${p.imeyl} · ${chasti.join(' · ')} в „${p.model}"`;
}

/**
 * СМЕНЯ ДУМАТА на ЕДНА колона · връща НОВИ права, старите не се пипат.
 *
 * Същият похват като при изключените редове: екранът сравнява двете състояния,
 * преди да пише, а Журналът получава цялото ново право, не разлика.
 */
export function sPromenenoPravo(
  p: PravaZaModel,
  kolona: number,
  novo: PravoNaKolona,
): PravaZaModel {
  const bez = (spisak: readonly number[]): readonly number[] => spisak.filter((k) => k !== kolona);
  const s = (spisak: readonly number[]): readonly number[] => [...bez(spisak), kolona];
  return napraviPrava({
    imeyl: p.imeyl,
    model: p.model,
    skriti: novo === 'skrito' ? s(p.skriti) : bez(p.skriti),
    samoVizhdat: novo === 'vizhda' ? s(p.samoVizhdat) : bez(p.samoVizhdat),
  });
}
