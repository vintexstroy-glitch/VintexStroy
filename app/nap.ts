/**
 * НАП · ДВАНАЙСЕТИЯТ екран (резен 17 · И108 · И112).
 *
 * ═══ ОТКЪДЕ ИДВА ТОЗИ ЕКРАН · и откъде НЕ идва ═══
 *
 * Негови са ДВЕ изречения и толкова: че резенът съществува и е „единият екран
 * (най-голям, на подрезени)" (И108), и че влиза ПРЕДИ голямата сверка (И112).
 *
 * Претърсването на четирите извора за „КЕП", „електронен подпис", „счетоводител"
 * и „подаване" върна НУЛА попадения. Значи моделът долу — сглобяваме местно,
 * подаваш ти, през портала, с КЕП — е от НАШЕ външно проучване, не от негова
 * дума. Записано е така и в ADR-068. Изречение, сложено в неговата уста без
 * адрес, изглежда като решение в сила и се цитира с години (платено при резен 15).
 *
 * ═══ ЗАЩО СВОЙ ЕКРАН, А НЕ СЕКЦИЯ В СМЕТКИ ═══
 *
 * Сметки носеше 14 секции — най-натовареният екран. Одитният файл беше една от
 * тях и доводът за това („файлът за юли се прави от юлските данни") беше верен;
 * той не пада, а се пренася: месецът се ИЗБИРА и тук.
 *
 * Онова, което мени решението, е ЧИСЛОТО НА СЪСЕДИТЕ. Одитният файл вече не е
 * сам: до него застават типовите таблици на НАП, номенклатурните кодове и
 * достъпът за счетоводителя. Четири неща с един адресат искат свой дом.
 *
 * ═══ ЧЕСТНИЯТ СТАТУС · три думи, не две ═══
 *
 * Всяка типова таблица носи ПОСТРОЕНО · ЧАСТИЧНО · НЕПОСТРОЕНО. Двустойностният
 * опис („построено / обявено") тук би лъгал: Дневникът за продажбите ГО ИМА, но
 * фактурата е ЕДИН ред, не ред по ред — това не е нито готово, нито липсващо.
 * Дума, която липсва, кара половината работа да мине за цяла.
 *
 * ═══ НУЛА ПЪТ КЪМ ВРАТАТА ═══
 *
 * Този екран ЧЕТЕ и СВАЛЯ. Няма нито един бутон, който пише в Журнала — и това
 * не е пропуск, а свойство: подаването е решение на човек, взето извън
 * програмата, с електронен подпис, който браузърът не вижда.
 */

import { ekraniraj, svaliFayl } from './obshto.js';
import { butonSIkona } from './ikoni.js';

import { safT } from '../src/iznos/saf-t.js';
import { SHEMA } from '../src/iznos/saf-t-shema.js';
import { oboroti, SMETKOPLAN } from '../src/domein/glavna-kniga.js';
import { pishi } from '../src/yadro/pari.js';
import { ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Кое е построено докъде · ТРИ думи, защото две лъжат (вж. шапката). */
type Dokade = 'postroeno' | 'chastichno' | 'nepostroeno';

const IMENA_NA_DOKADE: Readonly<Record<Dokade, string>> = Object.freeze({
  postroeno: 'построено',
  chastichno: 'ЧАСТИЧНО',
  nepostroeno: 'непостроено',
});

interface TipovaTablitsa {
  readonly ime: string;
  readonly dokade: Dokade;
  /** какво ИМА и какво ЛИПСВА · цяло изречение, не етикет */
  readonly kakvo: string;
}

/**
 * ТИПОВИТЕ ТАБЛИЦИ НА НАП · описът, който този екран показва.
 *
 * Списъкът е ДАННА, не разметка: така се брои от тест и не може да се разкраси
 * при рисуване. Всяко „частично" носи изречение какво точно липсва — иначе
 * думата става етикет и половин работа минава за цяла.
 */
export const TIPOVITE_TABLITSI: readonly TipovaTablitsa[] = Object.freeze([
  Object.freeze({
    ime: 'Справка-декларация по ЗДДС',
    dokade: 'chastichno' as const,
    kakvo:
      'ДДС-то се смята по акумулатори и справката ЗАКЛЮЧВА месеца (правило 9). ' +
      'Липсва самият типов файл DEKLAR.TXT в неговия формат.',
  }),
  Object.freeze({
    ime: 'Дневник за продажбите',
    dokade: 'chastichno' as const,
    kakvo:
      'Начисленото го има и влиза в одитния файл. Фактурата обаче е ЕДИН ред, ' +
      'не ред по ред — а дневникът иска редовете.',
  }),
  Object.freeze({
    ime: 'Дневник за покупките',
    dokade: 'chastichno' as const,
    kakvo:
      'Разходите с документ и ставка ги има. Липсва същото: редът по ред и ' +
      'типовият файл POKUPKI.TXT.',
  }),
  Object.freeze({
    ime: 'VIES декларация',
    dokade: 'nepostroeno' as const,
    kakvo: 'Няма понятие за вътреобщностни доставки — нито в Журнала, нито в Сметки.',
  }),
  Object.freeze({
    ime: 'Протокол по чл. 117',
    dokade: 'nepostroeno' as const,
    kakvo: 'Няма събитие за самоначисляване и няма кой да го напише.',
  }),
  Object.freeze({
    ime: 'Национален сметкоплан',
    dokade: 'chastichno' as const,
    kakvo:
      'Сметкопланът е построен и Главната книга е ОГЛЕДАЛО на статиите. ' +
      'Кодовете по националния план обаче са ПРАЗНИ — вж. таблицата долу.',
  }),
  Object.freeze({
    ime: 'Одитен файл (SAF-T) · месечен',
    dokade: 'postroeno' as const,
    kakvo:
      'Сглобява се местно, със ШЕСТ сверки вход↔изход, и се сваля. НЕ е проверен ' +
      'срещу самата XSD на НАП — истинската проверка е ТЕСТОВОТО подаване.',
  }),
  Object.freeze({
    ime: 'SAF-T годишен · активите',
    dokade: 'nepostroeno' as const,
    kakvo: 'Свой резен (ADR-047). Активите не се водят в Журнала днес.',
  }),
  Object.freeze({
    ime: 'SAF-T при поискване',
    dokade: 'nepostroeno' as const,
    kakvo: 'За наемен бизнес практически празен — строи се, когато има какво да носи.',
  }),
]);

/** Броевете по състояние · СМЯТАТ се от описа, не се преписват. */
export function preborenoDokade(): Readonly<Record<Dokade, number>> {
  return Object.freeze({
    postroeno: TIPOVITE_TABLITSI.filter((t) => t.dokade === 'postroeno').length,
    chastichno: TIPOVITE_TABLITSI.filter((t) => t.dokade === 'chastichno').length,
    nepostroeno: TIPOVITE_TABLITSI.filter((t) => t.dokade === 'nepostroeno').length,
  });
}

/** Кой месец се гледа · поглед, значи паметта на екрана (ADR-022). */
function mesetsat(dnes: string): string {
  return chetiEkranno('nap.mesets', dnes.slice(0, 7));
}
/**
 * ОДИТНИЯТ ФАЙЛ · Главната книга и месечният XML (И96 т.11 · ADR-047).
 *
 * ДОШЪЛ Е ОТ СМЕТКИ (резен 17б). Там шапката му обясняваше „защо в Сметки: това
 * е ЧИСЛО ЗА МЕСЕЦ, като справката до него". Доводът беше верен и остана верен —
 * затова месецът СЕ ИЗБИРА и тук, а не се предполага. Смени се другото: НАП е
 * вече СВОЙ екран, и файлът стои при останалите неща за НАП, не сред сметките.
 *
 * ЗАЩО ПРЕЧКИТЕ СА ГОРЕ: файл, обявен за готов, когато не е, се разбира от
 * акта. Пречката е ИЗРЕЧЕНИЕ, дошло готово от домейна — екранът само го изрежда
 * и не превежда флаг в дума.
 *
 * ФАЙЛЪТ СЕ СГЛОБЯВА ДВА ПЪТИ, и това е нарочно: веднъж за числата горе (при
 * всяко рисуване) и втори път при натискане на бутона. XML-ът е скъп низ, а
 * екранът иска само броевете.
 */
function blokNaOditniyaFayl(o: Ogledalo, mesets: string): string {
  const r = safT(o, mesets, new Date().toISOString());
  const ob = oboroti(r.kniga);
  return `
    <section class="karta" data-sektsiya="saf-t">
      <div class="dyalglava">
        <h2>Одитен файл (SAF-T)</h2>
        <span>схема ${ekraniraj(SHEMA.versiya)} · в сила от ${ekraniraj(SHEMA.vSilaOt)} · ${ekraniraj(mesets)}</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Статии</span>
          <span class="chislo" translate="no">${r.broiStatii}</span>
          <span class="pod">двустранни · дебит = кредит</span>
        </div>
        <div class="plochka">
          <span class="etiket">Продажби · покупки</span>
          <span class="chislo" translate="no">${r.broiProdazhbi} · ${r.broiPokupki}</span>
          <span class="pod">фактурите в SourceDocuments</span>
        </div>
        <div class="plochka">
          <span class="etiket">Плащания</span>
          <span class="chislo" translate="no">${r.broiPlashtaniya}</span>
          <span class="pod">Payments</span>
        </div>
        <div class="plochka${r.prechki.length === 0 ? '' : ' trevoga'}">
          <span class="etiket">Готовност</span>
          <span class="chislo" translate="no">${r.prechki.length === 0 ? '—' : r.prechki.length}</span>
          <span class="pod">${r.prechki.length === 0 ? 'няма пречки за подаване' : 'пречки · изброени долу'}</span>
        </div>
      </div>

      ${
        r.prechki.length === 0
          ? ''
          : `<ul class="prechki">${r.prechki.map((p) => `<li>${ekraniraj(p)}</li>`).join('')}</ul>`
      }

      <div class="tablitsa">
        <div class="glava saft">
          <span>Сметка</span><span>Национален код</span>
          <span class="suma">Дебит</span><span class="suma">Кредит</span>
        </div>
        ${
          ob.length === 0
            ? '<p class="prazno">Няма статии за този месец.<br>Празният месец пак дава валиден по структура файл.</p>'
            : ob
                .map(
                  (r2) => `
          <div class="red saft" translate="no">
            <span class="kletka"><b>${ekraniraj(r2.smetka.nomer)}</b><span>${ekraniraj(r2.smetka.ime)}</span></span>
            <span>${r2.smetka.nra === '' ? '<em>не е мапната</em>' : ekraniraj(r2.smetka.nra)}</span>
            <span class="suma" data-st="${r2.debit_st}">${pishi(r2.debit_st)}</span>
            <span class="suma" data-st="${r2.kredit_st}">${pishi(r2.kredit_st)}</span>
          </div>`,
                )
                .join('')
        }
        <div class="red saft sbor" translate="no">
          <span class="kletka"><b>Общо</b><span>дебит ↔ кредит</span></span>
          <span></span>
          <span class="suma" data-st="${r.kniga.debit_st}">${pishi(r.kniga.debit_st)}</span>
          <span class="suma${r.kniga.debit_st === r.kniga.kredit_st ? '' : ' duljimo'}" data-st="${r.kniga.kredit_st}">${pishi(r.kniga.kredit_st)}</span>
        </div>
      </div>

      <div class="deystviya">
        ${butonSIkona({
          ikona: 'iznos',
          tekst: 'Свали файла',
          title: 'Сглобява XML-а и го сваля на устройството',
          klas: 'vtorichen',
          danni: { 'svali-saft': mesets },
        })}
        <p class="drebno">Файлът се сглобява МЕСТНО и се сваля — приложението не го изпраща наникъде.
        Той НЕ е проверен срещу самата XSD-схема на НАП: истинската проверка е ТЕСТОВОТО подаване
        през портала им. ${ekraniraj(ZASHTO_I_NULATA)}</p>
      </div>
    </section>`;
}

/** ОПИСЪТ на типовите таблици · честният статус, три думи. */
function blokNaTipovite(): string {
  const b = preborenoDokade();
  return `
    <section data-sektsiya="nap-tipovi">
      <div class="dyalglava">
        <h2>Типовите таблици на НАП</h2>
        <span>${b.postroeno} построени · ${b.chastichno} частично · ${b.nepostroeno} непостроени</span>
      </div>
      <div class="tablitsa">
        <div class="glava opis"><span>Таблица</span><span>Докъде</span><span>Какво има и какво липсва</span></div>
        ${TIPOVITE_TABLITSI.map(
          (t) => `<div class="red opis" data-tipova="${ekraniraj(t.ime)}">
          <span><b>${ekraniraj(t.ime)}</b></span>
          <span data-dokade="${t.dokade}">${IMENA_NA_DOKADE[t.dokade]}</span>
          <span>${ekraniraj(t.kakvo)}</span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Три думи, не две: „частично" не е нито готово, нито липсващо —
      и точно то се разбира най-късно, ако думата я няма.</p>
    </section>`;
}

/**
 * НОМЕНКЛАТУРНИТЕ КОДОВЕ · единственото наистина ЛИПСВАЩО ДАННО.
 *
 * Не се запълват с предположения: измислен код значи отказ плюс глоба по
 * чл. 277а. Стоят ПРАЗНИ, броят се, и екранът казва откъде идват.
 */
function blokNaKodovete(): string {
  const nemapnati = SMETKOPLAN.filter((s) => s.nra === '');
  return `
    <section data-sektsiya="nap-kodove">
      <div class="dyalglava">
        <h2>Номенклатурните кодове</h2>
        <span data-broi-kodove="${nemapnati.length}">${nemapnati.length} сметки още чакат код</span>
      </div>
      <p class="drebno">Кодовете се свалят от <b translate="no">nra.bg</b>, а проксито на средата
      го блокира. Затова стоят празни и се БРОЯТ — измислен код значи отказ плюс глоба
      по чл. 277а. Мапингът е счетоводна ПРЕЦЕНКА, не аритметика (правило 18):
      вписва се от човек, не се гади от машина.</p>
      <div class="tablitsa">
        <div class="glava opis"><span>Сметка</span><span>Име</span><span>Национален код</span></div>
        ${SMETKOPLAN.map(
          (s) => `<div class="red opis" translate="no" data-smetka="${ekraniraj(s.nomer)}">
          <span><b>${ekraniraj(s.nomer)}</b></span>
          <span>${ekraniraj(s.ime)}</span>
          <span>${s.nra === '' ? '<em>чака</em>' : ekraniraj(s.nra)}</span>
        </div>`,
        ).join('')}
      </div>
    </section>`;
}

export function narisuvayNAP(o: Ogledalo, dnes: string): string {
  const mesets = mesetsat(dnes);
  return `
    <section data-sektsiya="nap-mesets">
      <div class="dyalglava">
        <h2>Кой месец</h2>
        <span>файлът за юли се прави от юлските данни — затова месецът се ИЗБИРА</span>
      </div>
      <label class="pole">
        <span>Месец</span>
        <input translate="no" type="month" id="nap-mesets" value="${ekraniraj(mesets)}">
      </label>
    </section>
    ${blokNaTipovite()}
    ${blokNaOditniyaFayl(o, mesets)}
    ${blokNaKodovete()}`;
}

export function zakachiNAP(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLInputElement>('#nap-mesets')?.addEventListener('change', async (e) => {
    zapomniEkranno('nap.mesets', (e.target as HTMLInputElement).value);
    await prerisuvay();
  });

  /**
   * СВАЛЯНЕТО · единственото действие на този екран, и то НЕ пише в Журнала.
   *
   * Файлът се сглобява ВТОРИ път тук нарочно: XML-ът е скъп низ, а числата горе
   * го искат при всяко прерисуване. Сглобен и там, той щеше да струва на всяко
   * натискане на клавиш.
   */
  koren.querySelector<HTMLButtonElement>('[data-svali-saft]')?.addEventListener('click', async (e) => {
    const mesets = (e.currentTarget as HTMLElement).dataset['svaliSaft']!;
    const r = safT(await k.deystviya.ogledalo(), mesets, new Date().toISOString());
    svaliFayl(new Blob([r.xml], { type: 'application/xml' }), r.ime);
    k.vest(
      r.prechki.length === 0 ? 'dobre' : 'zle',
      r.prechki.length === 0
        ? `${r.ime} е свален. Подаването е твое — приложението не праща нищо.`
        : `${r.ime} е свален, но ${r.prechki.length} пречки стоят. Виж ги, преди да подаваш.`,
    );
  });
}
