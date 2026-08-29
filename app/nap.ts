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
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import {
  chetiriteSpravki,
  LIPSVASHTITE,
  mesetsiteZaPodavane,
  redoveteZaSchetovodstvoto,
  sveriSpravkite,
  type RedZaSchetovodstvoto,
  type Spravka,
} from '../src/domein/spravki-schetovodstvo.js';
import { butonSIkona } from './ikoni.js';

import { safT } from '../src/iznos/saf-t.js';
import { SHEMA } from '../src/iznos/saf-t-shema.js';
import { oboroti, SMETKOPLAN } from '../src/domein/glavna-kniga.js';
import {
  bezEIK,
  edinRedZaImeto,
  IZVAN_PROGRAMATA,
  KAKVO_NE_VLIZA,
  KAKVO_VLIZA_V_FAYLA,
  preborenoPoVid,
  type ImeVFayla,
} from '../src/domein/nap-dostap.js';
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

/**
 * Каквото ЕКРАНЪТ чете от одитния файл · не целият резултат.
 *
 * Стеснено нарочно: тесен договор казва какво точно се ползва и спира тихото
 * разрастване „щом го има в резултата, да го покажем".
 */
type RezultatZaEkrana = ReturnType<typeof safT>;

/** Кой месец се гледа · поглед, значи паметта на екрана (ADR-022). */
function mesetsat(dnes: string): string {
  return chetiEkranno('nap.mesets', dnes.slice(0, 7));
}

/**
 * ОБХВАТЪТ НА СПРАВКИТЕ · СВОЙ, не месецът на одитния файл.
 *
 * Файлът се подава по МЕСЕЦ; справките са за РАБОТА и се гледат назад — три
 * месеца по подразбиране, защото точно толкова назад стои неподаденото, преди
 * да стане проблем. Един общ месец за двете щеше да върже несвързани неща:
 * смяната на месеца за подаване щеше да мени и работния изглед.
 */
function obhvatatNaSpravkite(dnes: string): { ot: string; do_: string } {
  const do_ = chetiEkranno('nap.spravki.do', dnes.slice(0, 7));
  return { ot: chetiEkranno('nap.spravki.ot', predi(do_, 2)), do_ };
}

/** N месеца назад · без часови пояси и без библиотека. */
function predi(period: string, mesetsi: number): string {
  let g = Number(period.slice(0, 4));
  let m = Number(period.slice(5, 7)) - mesetsi;
  while (m < 1) {
    m += 12;
    g -= 1;
  }
  return `${String(g).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
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
 * ФАЙЛЪТ СЕ СГЛОБЯВА ВЕДНЪЖ ЗА РИСУВАНЕТО и втори път при натискане на бутона.
 * Първото е за числата горе и за описа „какво напуска" — те четат ЕДИН и същ
 * резултат, за да не могат да се разминат (правило 17). Второто е нарочно: XML-ът
 * е скъп низ, а екранът иска само броевете.
 */
function blokNaOditniyaFayl(r: RezultatZaEkrana, mesets: string): string {
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

      <div class="tablitsa" data-tablitsa="nap-kniga">
        <div class="glava saft">
          <span data-kolona="smetka" data-ime="Сметка">Сметка</span>
          <span data-kolona="nra" data-ime="Национален код">Национален код</span>
          <span class="suma" data-kolona="debit" data-ime="Дебит">Дебит</span>
          <span class="suma" data-kolona="kredit" data-ime="Кредит">Кредит</span>
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

/**
 * КАКВО ТОЧНО НАПУСКА УСТРОЙСТВОТО · поименно, ПРЕДИ да си подал.
 *
 * ═══ ЗАЩО ПОИМЕННО, А НЕ „ИМА ИМЕНА" ═══
 *
 * ADR-030 §4 закова границата: „имена на наематели и доставчици не напускат
 * устройството". Одитният файл е ИЗРИЧНОТО изключение — и изключение, което не
 * се вижда поименно, е обещание с дупка. Затова тук не стои категория („имена
 * на контрагенти"), а СПИСЪКЪТ за ТОЗИ месец, дошъл от същото място, което ги
 * пише в XML-а.
 *
 * ═══ КОЙ ДЕЙСТВА ═══
 *
 * Не се пише „изпраща се". Приложението НЕ изпраща нищо: файлът се сваля на
 * устройството и напуска, когато ЧОВЕК го подаде. Разликата не е стил — първото
 * би било лъжа за това чия е ръката.
 *
 * ═══ БЕЗ ЕИК ═══
 *
 * Име без ЕИК заминава непълно и вече си има пречка горе. Тук се показва ДО
 * името, защото пречката казва „N без ЕИК", а човек иска да види КОИ.
 *
 * ═══ ЗАЩО ИМЕНАТА СА РАЗГЪНАТИ, А КАТЕГОРИИТЕ — НЕ ═══
 *
 * ADR-030 §4 сложи дословния текст зад „подробности" и това беше вярно там.
 * ТУК не е: имената са ИЗКЛЮЧЕНИЕТО от стоящо обещание, а изключение, което
 * иска клик, е обещание с една стъпка пред него. Проходът го хвана — `innerText`
 * не вижда затворено `<details>`, точно както не го вижда и окото.
 *
 * Категориите остават прибрани: те са справка, еднаква всеки месец. Имената се
 * менят с всеки месец и са онова, което човек трябва да види, преди да подаде.
 */
function blokNaNapuskashtoto(imena: readonly ImeVFayla[], mesets: string): string {
  const b = preborenoPoVid(imena);
  const nepalni = bezEIK(imena);
  return `
    <section data-sektsiya="nap-napuska">
      <div class="dyalglava">
        <h2>Какво точно напуска устройството</h2>
        <span data-broi-imena="${imena.length}">${imena.length} имена за ${ekraniraj(mesets)} · ${b.firma} фирма · ${b.klient} клиенти · ${b.dostavchik} доставчици</span>
      </div>

      <p class="drebno">Файлът се сваля на устройството и НЕ тръгва наникъде сам.
      Напуска, когато ТИ го подадеш. Дотогава всичко долу стои само тук.</p>

      <details open>
        <summary>Имената, които ще носи файлът · ${imena.length}</summary>
        ${
          imena.length === 0
            ? '<p class="prazno">Този месец не докосва нито един контрагент.<br>Празният месец пак дава валиден по структура файл.</p>'
            : `<ul class="opis-imena" translate="no">${imena
                .map(
                  (i) =>
                    `<li data-ime-v-fayla="${ekraniraj(i.ime)}"${i.sEIK ? '' : ' class="trevoga"'}>${ekraniraj(edinRedZaImeto(i))}</li>`,
                )
                .join('')}</ul>`
        }
        ${
          nepalni.length === 0
            ? ''
            : `<p class="drebno">${nepalni.length} от тях заминават БЕЗ ЕИК — вписват се в Настройки · Контрагенти.</p>`
        }
      </details>

      <details>
        <summary>Какво ВЛИЗА във файла · ${KAKVO_VLIZA_V_FAYLA.length} вида</summary>
        <ul>${KAKVO_VLIZA_V_FAYLA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}</ul>
      </details>

      <details>
        <summary>Какво НЕ влиза · ${KAKVO_NE_VLIZA.length} вида</summary>
        <ul>${KAKVO_NE_VLIZA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}</ul>
        <p class="drebno">Отрицателният списък не е украса: без него положителният
        се чете като „и вероятно още нещо".</p>
      </details>
    </section>`;
}

/**
 * ДОСТЪПЪТ ЗА СЧЕТОВОДИТЕЛЯ · и защо екранът е ЕДНАКЪВ за трите роли.
 *
 * ═══ НЯМА ЧЕТВЪРТА РОЛЯ, И ТОВА Е РЕШЕНИЕ ═══
 *
 * Ролите са три (`IMENA_NA_ROLITE`) и остават три. Счетоводителят е СЛУЖИТЕЛ,
 * когото Стопанинът вече е записал — правило 14 казва дословно: „Не каним хора…
 * Виждаме онзи, когото доставчикът е пуснал." Четвърта роля, измислена тук, би
 * била наша дума в неговата уста; а и `mozheDaRedaktira` смята редакцията от
 * ролята — нова стойност там мени колонното право на ВСИЧКИ екрани.
 *
 * ═══ ЗАЩО НЯМА `iskaRolya` НА ТОЗИ ЕКРАН ═══
 *
 * Защото няма какво да пази. Тук няма нито един път към Вратата: `zakachiNAP`
 * вика само `deystviya.ogledalo()`, и тест го брои. Гате по роля върху екран,
 * който само чете, би бил надпис — а надписът, взет за защита, е по-опасен от
 * липсата ѝ (ADR-041 · ADR-050).
 *
 * ═══ КАКВО ОСТАВА ИЗВЪН ПРОГРАМАТА ═══
 *
 * Екран, който казва само какво НЕ прави, оставя човека без следваща стъпка.
 * Затова трите стъпки навън се изброяват поименно — те са работата на
 * счетоводителя, а не наш пропуск.
 */
function blokNaSchetovoditelya(): string {
  return `
    <section data-sektsiya="nap-schetovoditel">
      <div class="dyalglava">
        <h2>Достъпът за счетоводителя</h2>
        <span>чете и сваля · не пише · подава ИЗВЪН програмата</span>
      </div>

      <p class="drebno">Счетоводителят е СЛУЖИТЕЛ, записан в Настройки · Служители.
      Не го каним и не му отнемаме достъп — виждаме онзи, когото доставчикът е пуснал,
      и записваме имейла му (правило 14). Щом Стопанинът е включил връзката с НАП,
      екранът е ЕДИН И СЪЩ за трите роли, защото тук няма какво да се пише.</p>

      <div class="tablitsa" data-tablitsa="nap-dostap">
        <div class="glava opis">
          <span data-kolona="kade" data-ime="Къде">Къде</span>
          <span data-kolona="kakvo" data-ime="Какво става">Какво става</span>
        </div>
        <div class="red opis" data-dostap="tuk">
          <span><b>ТУК, в програмата</b></span>
          <span>Чете месеца, вижда пречките поименно и сваля файла. Нито един бутон
          на този екран не пише в Журнала — това е свойство, не пропуск.</span>
        </div>
        <div class="red opis" data-dostap="izvan">
          <span><b>ИЗВЪН програмата</b></span>
          <span>${IZVAN_PROGRAMATA.map((x) => ekraniraj(x)).join(' · ')}</span>
        </div>
      </div>

      <p class="drebno">Електронният подпис не се пази тук и не може да се пази:
      частният ключ на КЕП живее на смарт-карта, а браузърен JavaScript не я вижда.
      Затова подаването остава ръчно — това е граница, не избор за удобство.</p>
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
      <div class="tablitsa" data-tablitsa="nap-smetkoplan">
        <div class="glava opis">
          <span data-kolona="nomer" data-ime="Сметка">Сметка</span>
          <span data-kolona="ime" data-ime="Име">Име</span>
          <span data-kolona="nra" data-ime="Национален код">Национален код</span>
        </div>
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
  // ЕДНО сглобяване за целия екран: числата горе и описът „какво напуска" четат
  // ЕДИН резултат. Две сглобявания щяха да са две места, които се разминават.
  const r = safT(o, mesets, new Date().toISOString());
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
    ${blokNaOditniyaFayl(r, mesets)}
    ${blokNaNapuskashtoto(r.imenata, mesets)}
    ${blokNaSpravkiteZaSchetovodstvoto(o, dnes)}
    ${blokNaSchetovoditelya()}
    ${blokNaKodovete()}`;
}

export function zakachiNAP(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLInputElement>('#nap-mesets')?.addEventListener('change', async (e) => {
    zapomniEkranno('nap.mesets', (e.target as HTMLInputElement).value);
    await prerisuvay();
  });

  // ОБХВАТЪТ на справките · поглед, нула събития (ADR-022). Двете полета се
  // закачат еднакво, затова минават през един цикъл: две копия на този слушател
  // се разминават при първата поправка.
  for (const [znak, klyuch] of [
    ['#spravki-ot', 'nap.spravki.ot'],
    ['#spravki-do', 'nap.spravki.do'],
  ] as const) {
    koren.querySelector<HTMLInputElement>(znak)?.addEventListener('change', async (e) => {
      zapomniEkranno(klyuch, (e.target as HTMLInputElement).value);
      await prerisuvay();
    });
  }

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

/**
 * МЯСТОТО ЗА РАБОТА НА СЧЕТОВОДСТВОТО · четирите справки (резен 17г · ADR-075).
 *
 * Негови думи, 29.08: „При таба на НАП се прави място за работа на
 * счетоводството и справки за платени, неплатени, декларирани фактури и
 * недекларирани, но платени фактури."
 *
 * ОБХВАТ, не месец. Одитният файл горе е за ЕДИН месец — той се подава по месец.
 * Тези справки са за РАБОТА: счетоводителят гледа тримесечие назад, за да види
 * какво е останало неподадено. Затова тук има свои две полета, а не месецът от
 * горния блок.
 *
 * ═══ И СЕКЦИЯТА КАЗВА С КАКЪВ ОБХВАТ Е НАРИСУВАНА (резен 18) ═══
 *
 * `data-obhvat` носи двата месеца, с които редовете СА пресметнати. Полетата
 * казват какво е ПОИСКАНО; този надпис — какво е ПОКАЗАНО, и двете се разминават
 * точно в мига между смяната и прерисуването.
 *
 * Платено с находка: §92 падаше през път — веднъж мина, веднъж не. Броенето на
 * редовете хващаше екрана, нарисуван още със СТАРИЯ обхват, защото чакането
 * гледаше стойността на полето, а тя се появява от писането, преди изобщо да е
 * почнало прерисуване. Проверка, която веднъж минава и веднъж пада, е по-лоша
 * от липсваща: тя учи да се пуска повторно, вместо да се търси причина.
 */
function blokNaSpravkiteZaSchetovodstvoto(o: Ogledalo, dnes: string): string {
  const { ot, do_ } = obhvatatNaSpravkite(dnes);
  let redove: readonly RedZaSchetovodstvoto[];
  try {
    redove = redoveteZaSchetovodstvoto(o, ot, do_);
  } catch (err) {
    return `
    <section data-sektsiya="nap-spravki" data-obhvat="${ekraniraj(ot)}·${ekraniraj(do_)}">
      ${glavataNaSpravkite(ot, do_)}
      <p class="greshka">${ekraniraj(dumiZaGreshka(err))}</p>
    </section>`;
  }

  const s = chetiriteSpravki(redove);
  const sverka = sveriSpravkite(redove, s);
  const chakat = mesetsiteZaPodavane(s);

  return `
    <section data-sektsiya="nap-spravki" data-obhvat="${ekraniraj(ot)}·${ekraniraj(do_)}">
      ${glavataNaSpravkite(ot, do_)}

      <p class="drebno">Четирите справки са ДВЕ ДУМИ, зададени на всеки ред:
      <b>платено ли е</b> и <b>декларирано ли е</b>. Затова един ред влиза в
      няколко от тях, а сборовете им НЕ се събират — те са четири въпроса към
      една маса, не четири дяла от нея.</p>

      <div class="plochki">
        ${Object.values(s).map(plochkaNaSpravkata).join('')}
      </div>

      ${
        chakat.length === 0
          ? `<p class="drebno" data-chakat="0">Няма платен месец, който да чака подаване.
             И тази нула се КАЗВА: празно поле не различава „всичко е подадено"
             от „не е поглеждано".</p>`
          : `<p class="drebno"><b data-chakat="${chakat.length}">${chakat.length}</b>
             ${chakat.length === 1 ? 'месец ЧАКА' : 'месеца ЧАКАТ'} подаване — платено е,
             а справката още не е подадена. Човек подава МЕСЕЦ, не фактура.</p>
             <div class="tablitsa" data-tablitsa="chakat-podavane">
               <div class="glava chakapodavane">
                 <span data-kolona="period" data-ime="Месец">Месец</span>
                 <span data-kolona="broy" data-ime="Редове">Редове</span>
                 <span data-kolona="suma" data-ime="Сума">Сума</span>
               </div>
               ${chakat
                 .map(
                   (m) => `
                 <div class="red chakapodavane duljimo" translate="no" data-chaka="${ekraniraj(m.period)}">
                   <span class="kletka"><b>${ekraniraj(m.period)}</b></span>
                   <span class="kletka"><span>${m.broy}</span></span>
                   <span class="suma" data-st="${m.suma_st}">${pishi(m.suma_st)}</span>
                 </div>`,
                 )
                 .join('')}
             </div>`
      }

      <div class="tablitsa" data-tablitsa="spravki-redove">
        <div class="glava spravkared">
          <span data-kolona="koy" data-ime="Кой">Кой</span>
          <span data-kolona="osnovanie" data-ime="Основание">Основание</span>
          <span data-kolona="period" data-ime="Период">Период</span>
          <span data-kolona="suma" data-ime="Сума">Сума</span>
          <span data-kolona="plateno" data-ime="Платено">Платено</span>
          <span data-kolona="deklarirano" data-ime="Декларирано">Декларирано</span>
        </div>
        ${
          redove.length === 0
            ? '<p class="prazno">Няма нито един ред в този обхват.</p>'
            : redove.map(redNaSpravkata).join('')
        }
      </div>

      <p class="drebno" data-sverka-spravki="${sverka.nared ? 'nared' : 'ne'}">
        Сверка вход↔изход: <b>${sverka.vsichki}</b> реда в масата ·
        <b>${sverka.poPlateno}</b> по платено · <b>${sverka.poDeklarirano}</b> по декларирано.
        ${sverka.nared ? 'Нищо не е изпаднало.' : 'РАЗМИНАВАНЕ — ред е изпаднал и от двете страни.'}
      </p>

      <div class="dyalglava">
        <h2>Какво данните ОЩЕ не могат да кажат</h2>
        <span>${LIPSVASHTITE.length} ${LIPSVASHTITE.length === 1 ? 'нещо' : 'неща'} · брои се, не се твърди</span>
      </div>
      <ul class="prechki" data-lipsvashti="${LIPSVASHTITE.length}">
        ${LIPSVASHTITE.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
      </ul>
      <p class="drebno">Дали да има състояние „получена фактура, още неплатена"
      е <b>негово</b> решение, не аритметика (правило 18). Дотогава графата
      „Неплатени" показва само издадените фактури — и го КАЗВА, вместо да мълчи.</p>
    </section>`;
}

function glavataNaSpravkite(ot: string, do_: string): string {
  return `
      <div class="dyalglava">
        <h2>Мястото на счетоводството</h2>
        <span>четири справки · обхват, не месец</span>
      </div>
      <div class="redditsa">
        <label class="pole">
          <span>От месец</span>
          <input translate="no" type="month" id="spravki-ot" value="${ekraniraj(ot)}">
        </label>
        <label class="pole">
          <span>До месец</span>
          <input translate="no" type="month" id="spravki-do" value="${ekraniraj(do_)}">
        </label>
      </div>`;
}

function plochkaNaSpravkata(x: Spravka): string {
  const sveti = x.klyuch === 'nedeklariraniNoPlateni' && x.redove.length > 0;
  return `
        <div class="plochka${sveti ? ' duljimo' : ''}" data-plochka="${ekraniraj(x.ime)}">
          <span class="ime">${ekraniraj(x.ime.toUpperCase())}</span>
          <b data-st="${x.sbor_st}" data-spravka="${ekraniraj(x.klyuch)}">${pishi(x.sbor_st)}</b>
          <span class="pod">${x.redove.length} ${x.redove.length === 1 ? 'ред' : 'реда'} · ${ekraniraj(x.pita)}</span>
        </div>`;
}

function redNaSpravkata(r: RedZaSchetovodstvoto): string {
  const chaka = r.sastoyanie === 'plateno' && r.deklarirano === 'nedeklarirano';
  return `
        <div class="red spravkared${chaka ? ' duljimo' : ''}" translate="no"
             data-plateno="${r.sastoyanie}" data-deklarirano="${r.deklarirano}">
          <span class="kletka"><b>${ekraniraj(r.koy)}</b><span>${r.posoka === 'prihod' ? 'издадена' : 'получена'}</span></span>
          <span class="kletka"><span>${ekraniraj(r.osnovanie)}</span></span>
          <span class="kletka"><span>${ekraniraj(r.period)}</span></span>
          <span class="suma" data-st="${r.suma_st}">${pishi(r.suma_st)}</span>
          <span class="kletka"><span>${
            r.sastoyanie === 'plateno'
              ? 'платено'
              : `остават ${pishi(r.suma_st - r.plateno_st)}`
          }</span></span>
          <span class="kletka"><span>${r.deklarirano === 'deklarirano' ? 'декларирано' : 'НЕ е декларирано'}</span></span>
        </div>`;
}
