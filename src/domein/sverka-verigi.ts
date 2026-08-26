/**
 * СВЕРКАТА НА ВЕРИГИТЕ · сблъсъците са НАХОДКИ, не се решават сами (ADR-055).
 *
 * ═══ ЗАЩО ИЗОБЩО ИМА КАКВО ДА СЕ СВЕРЯВА ═══
 *
 * Изборът на ADR-055 е изолирани потоци: всеки писач има своя append-only
 * верига и нищо не се слива. Това пази правило 1 и правило 4 — но не прави
 * двамата писачи съгласни. Двама, начислили един и същ период, са направили
 * ДВА валидни записа в ДВЕ цели вериги; нито един от тях не е повреден.
 *
 * Точно затова несъгласието е СТОПАНСКИ ФАКТ, не техническа грешка, и точно
 * затова не се разрешава автоматично. Автоматичното разрешаване значи някой да
 * реши, че едното начисление е излишно — а това е решение на човек и се
 * записва като сторно, с автор и причина.
 *
 * Правило 7 му дава мястото: всяка партида завършва със сверка, и разликата се
 * записва ДОРИ когато е нула. Проверената нула е различна от нулата, за която
 * никой не е питал.
 *
 * ═══ ШЕСТТЕ СБЛЪСЪКА · и защо всеки е ТИХ без този файл ═══
 *
 *  1. ДВОЙНО НАЧИСЛЯВАНЕ. `idNaVzemane(naemId, period)` е ДЕТЕРМИНИРАН, тъй че
 *     двама, начислили един период, дават един и същ `sashtnost.id` в две
 *     вериги. `fold` прави `vzemaniya.set(id, …)` — вторият МЪЛЧАЛИВО заменя
 *     първия и сумата излиза вярна, докато историята зад нея е двойна.
 *  2. ДВОЙНО ПЛАЩАНЕ. Плащанията имат свои идентификатори, тъй че двете
 *     оцеляват и вземането излиза ПРЕПЛАТЕНО — най-скъпият тих запис тук.
 *  3. ЗАМРАЗЕН ПЕРИОД, ОТВОРЕН ОТ ВТОРА ВЕРИГА. Правило 9 се проверява срещу
 *     Огледалото на пишещия. Писач, който още не е видял чуждата справка (или
 *     е бил без обхват), минава законно през своята Врата — и подадената
 *     справка спира да отговаря на данните под нея.
 *  4. СТОРНО БЕЗ ЖЕРТВА. Погасяване, сочещо звено, което го няма в книгата:
 *     верига, която още не е дошла, или сгрешена верига в самото сторно.
 *  5. ДВА СТОПАНИНА. Всяка верига тръгва празна, значи трите правила на
 *     ADR-043 са изпълнени ПООТДЕЛНО за всяка — и книгата се сдобива с двама.
 *  6. ПИСАЧ БЕЗ СЛУЖИТЕЛ. Верига от имейл, който не е вписан в книгата.
 *     Правило 14 казва, че достъпът е при доставчика; това не значи, че
 *     книгата не бива да КАЗВА кой пише в нея.
 *
 * Нищо тук не пише в Журнала (правило 18 · правило 2): чете и предлага.
 */

import type { Sabitie } from '../yadro/sabitie.js';
import { klyuchNaZveno } from '../yadro/sabitie.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import { periodNaSabitie } from './zamrazyavane.js';
import { pisachatNa, svediImeyl } from './akaunt.js';
import type { PayloadPlashtanePrieto, PayloadSpravkaPodadena } from './sabitiya.js';

export type VidSblasak =
  | 'dvoyno-nachislyavane'
  | 'dvoyno-plashtane'
  | 'zamrazen-otvoren'
  | 'storno-bez-zhertva'
  | 'dva-stopanina'
  | 'pisach-bez-sluzhitel';

export interface Sblasak {
  readonly vid: VidSblasak;
  /** С ДУМИ · екранът показва това, не кода на вида. */
  readonly kakvo: string;
  /** Кои вериги участват · подредени, за да е находката повторяема. */
  readonly verigi: readonly string[];
  /** Замесените звена като `верига#seq` — адресът, по който човек ги намира. */
  readonly zvena: readonly string[];
}

export interface SverkaNaVerigite {
  readonly kogato: string;
  readonly broiVerigi: number;
  readonly broiSabitiya: number;
  readonly sblasatsi: readonly Sblasak[];
  /** Нула сблъсъка. Записва се и когато е `true` — правило 7. */
  readonly nared: boolean;
}

/**
 * Сверява СГЪНАТИЯ поток срещу неговото Огледало.
 *
 * Иска и двете, защото въпросите са от два реда: „кой го е написал" се чете от
 * звената, а „колко излезе накрая" — от Огледалото. Пресмятането на второто
 * тук наново би било второ `fold` с всичките си възможности да се разминат.
 */
export function sveriVerigite(
  potok: readonly Sabitie[],
  ogledalo: Ogledalo,
  kogato: string,
): SverkaNaVerigite {
  const zhivi = potok.filter((s) => !ogledalo.pogaseni.has(klyuchNaZveno(s)));
  const sblasatsi: Sblasak[] = [
    ...dvoynoNachislyavane(zhivi),
    ...dvoynoPlashtane(zhivi, ogledalo),
    ...zamrazenOtvoren(zhivi),
    ...stornoBezZhertva(potok),
    ...dvaStopanina(zhivi),
    ...pisachBezSluzhitel(potok, ogledalo),
  ];
  return {
    kogato,
    broiVerigi: new Set(potok.map((s) => s.naematel)).size,
    broiSabitiya: potok.length,
    sblasatsi,
    nared: sblasatsi.length === 0,
  };
}

/** Едно и също начисление, дошло от две вериги. */
function dvoynoNachislyavane(zhivi: readonly Sabitie[]): Sblasak[] {
  const po = new Map<string, Sabitie[]>();
  for (const s of zhivi) {
    if (s.type !== 'ВземанеНачислено') continue;
    const redica = po.get(s.sashtnost.id) ?? [];
    redica.push(s);
    po.set(s.sashtnost.id, redica);
  }
  const naideni: Sblasak[] = [];
  for (const [id, redica] of po) {
    const verigi = [...new Set(redica.map((s) => s.naematel))].sort();
    if (verigi.length < 2) continue;
    naideni.push({
      vid: 'dvoyno-nachislyavane',
      kakvo:
        `Вземането „${id}" е начислено ${redica.length} пъти, от ${verigi.length} вериги. ` +
        'Огледалото пази ПОСЛЕДНОТО; излишното се маха със сторно, не се презаписва.',
      verigi,
      zvena: redica.map(klyuchNaZveno).sort(),
    });
  }
  return naideni.sort((a, b) => a.zvena[0]!.localeCompare(b.zvena[0]!));
}

/**
 * ПРЕПЛАТЕНО вземане, платено от повече от една верига.
 *
 * И двете условия са нужни. Само „две вериги" не е сблъсък — един наем може
 * законно да се плати на две части от двама. Само „преплатено" пък е въпрос на
 * домейна, не на веригите. Заедно са именно двойното плащане.
 */
function dvoynoPlashtane(zhivi: readonly Sabitie[], ogledalo: Ogledalo): Sblasak[] {
  const po = new Map<string, Sabitie[]>();
  for (const s of zhivi) {
    if (s.type !== 'ПлащанеПрието') continue;
    const vzemaneId = (s.payload as unknown as PayloadPlashtanePrieto).vzemaneId;
    const redica = po.get(vzemaneId) ?? [];
    redica.push(s);
    po.set(vzemaneId, redica);
  }
  const naideni: Sblasak[] = [];
  for (const [vzemaneId, redica] of po) {
    const verigi = [...new Set(redica.map((s) => s.naematel))].sort();
    if (verigi.length < 2) continue;
    const plateno = redica.reduce(
      (sbor, s) => sbor + (s.payload as unknown as PayloadPlashtanePrieto).suma_st,
      0,
    );
    const nachisleno = ogledalo.vzemaniya.get(vzemaneId)?.nachisleno_st;
    if (nachisleno === undefined || plateno <= nachisleno) continue;
    naideni.push({
      vid: 'dvoyno-plashtane',
      kakvo:
        `Вземането „${vzemaneId}" е платено от ${verigi.length} вериги за общо ` +
        `${plateno} ст. при начислени ${nachisleno} ст. — надплатени ${plateno - nachisleno} ст.`,
      verigi,
      zvena: redica.map(klyuchNaZveno).sort(),
    });
  }
  return naideni.sort((a, b) => a.zvena[0]!.localeCompare(b.zvena[0]!));
}

/**
 * ЗАМРАЗЕН ПЕРИОД, отворен от ДРУГА верига.
 *
 * Гледа се редът в СГЪНАТИЯ поток, не датите в полетата: „след справката"
 * значи по-късно по такт. Дата в полето казва за КОЙ период е записът, не кога
 * е бил направен — а точно второто решава дали справката е била известна.
 */
function zamrazenOtvoren(zhivi: readonly Sabitie[]): Sblasak[] {
  const naideni: Sblasak[] = [];
  zhivi.forEach((spravka, i) => {
    if (spravka.type !== 'СправкаПодадена') return;
    const period = (spravka.payload as unknown as PayloadSpravkaPodadena).period;
    const sled = zhivi
      .slice(i + 1)
      .filter((s) => s.naematel !== spravka.naematel && periodNaSabitie(s) === period);
    if (sled.length === 0) return;
    const verigi = [...new Set([spravka.naematel, ...sled.map((s) => s.naematel)])].sort();
    naideni.push({
      vid: 'zamrazen-otvoren',
      kakvo:
        `Периодът ${period} е замразен от справка във верига „${spravka.naematel}", ` +
        `но след нея в него са записани ${sled.length} събития от друга верига. ` +
        'Подадената справка вече не отговаря на данните под нея (правило 9).',
      verigi,
      zvena: [klyuchNaZveno(spravka), ...sled.map(klyuchNaZveno)],
    });
  });
  return naideni;
}

/** Сторно, сочещо звено, което го няма в книгата. */
function stornoBezZhertva(potok: readonly Sabitie[]): Sblasak[] {
  const ima = new Set(potok.map(klyuchNaZveno));
  const naideni: Sblasak[] = [];
  for (const s of potok) {
    if (s.type !== 'Сторно') continue;
    const p = s.payload as Record<string, unknown>;
    const veriga = typeof p['pogasyavaVeriga'] === 'string' ? p['pogasyavaVeriga'] : s.naematel;
    const seq = Number(p['pogasyavaSeq']);
    const zhertva = klyuchNaZveno({ naematel: veriga, seq });
    if (ima.has(zhertva)) continue;
    naideni.push({
      vid: 'storno-bez-zhertva',
      kakvo:
        `Сторното сочи звено „${zhertva}", което го няма в книгата. ` +
        'Или веригата още не е дошла, или сторното сочи сгрешена верига.',
      verigi: [...new Set([s.naematel, veriga])].sort(),
      zvena: [klyuchNaZveno(s)],
    });
  }
  return naideni;
}

/** Две вериги, всяка с първо събитие „Стопанин" — и двамата законни поотделно. */
function dvaStopanina(zhivi: readonly Sabitie[]): Sblasak[] {
  const po = new Map<string, Sabitie[]>();
  for (const s of zhivi) {
    if (s.type !== 'СтопанинЗаписан') continue;
    const imeyl = svediImeyl(String((s.payload as Record<string, unknown>)['imeyl'] ?? ''));
    const redica = po.get(imeyl) ?? [];
    redica.push(s);
    po.set(imeyl, redica);
  }
  if (po.size < 2) return [];
  const zvena = [...po.values()].flat();
  return [
    {
      vid: 'dva-stopanina',
      kakvo:
        `Книгата има ${po.size} стопанина: ${[...po.keys()].sort().join(' · ')}. ` +
        'Всяка верига тръгва празна, тъй че трите правила на ADR-043 са минали ' +
        'поотделно за всяка — книгата обаче има един стопанин.',
      verigi: [...new Set(zvena.map((s) => s.naematel))].sort(),
      zvena: zvena.map(klyuchNaZveno).sort(),
    },
  ];
}

/**
 * Верига от имейл, който книгата не познава.
 *
 * Стопанинът не се търси в списъка на служителите — той не е нает от себе си.
 * Гледа се СУРОВИЯТ поток, защото верига без нито едно живо събитие пак е
 * верига: тя си има ключ в носителя и утре ще получи нов запис.
 */
function pisachBezSluzhitel(potok: readonly Sabitie[], ogledalo: Ogledalo): Sblasak[] {
  const poznati = new Set([...ogledalo.sluzhiteli.keys()].map(svediImeyl));
  if (ogledalo.stopanin !== '') poznati.add(svediImeyl(ogledalo.stopanin));
  const naideni: Sblasak[] = [];
  for (const veriga of [...new Set(potok.map((s) => s.naematel))].sort()) {
    const pisach = pisachatNa(veriga);
    if (pisach === undefined || poznati.has(svediImeyl(pisach))) continue;
    naideni.push({
      vid: 'pisach-bez-sluzhitel',
      kakvo:
        `Веригата „${veriga}" е на „${pisach}", който не е вписан като служител. ` +
        'Достъпът се дава от Драйва (правило 14), но книгата казва кой пише в нея.',
      verigi: [veriga],
      zvena: potok.filter((s) => s.naematel === veriga).slice(0, 1).map(klyuchNaZveno),
    });
  }
  return naideni;
}
