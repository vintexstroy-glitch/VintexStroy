/**
 * ИЗТОЧНИЦИТЕ · един бутон, падащо меню, един път навътре.
 *
 * Собственикът избира откъде да дойдат данните: на ръка, от таблица (CSV или
 * Excel) или от PDF. Каквото и да избере, нататък пътят е ЕДИН:
 *
 *   файл → таблица → снимка (с отпечатък) → сравнение с Журнала → разлики → Вратата
 *
 * Файлът НЕ се качва и не се запазва никъде — чете се и се взима снимка на
 * числата. Самият файл си остава в главния Драйв; в Журнала влиза само следата:
 * име, големина, час на промяна и sha256 на прочетените байтове.
 */

import { kakvoPishe } from '../src/yadro/pari.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { otCSV, tekstOtBaytove } from '../src/iztochnik/csv.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import {
  belegNaPartida,
  sboroveNaPartida,
  sDumiNaPartida,
  zaIzprashtane,
} from '../src/domein/potok.js';
import { otPDF, tablitsaOtPDF } from '../src/iztochnik/pdf.js';
import { otpechatak, type Izvor, type Snimka, type VidIzvor } from '../src/iztochnik/snimka.js';
import { periodPoModel, pogadniPeriod, razchetiPoModel, razchetiRazhodi } from '../src/iztochnik/razchitane.js';
import { bezPrazni, kletka, type Tablitsa } from '../src/iztochnik/tablitsa.js';
import {
  belegNaModel,
  GreshkaModel,
  IMENA_NA_ROLITE,
  nameriModel,
  napraviModel,
  podskazhi,
  ZADALZHITELNI_ROLI,
  type ModelNaTablitsa,
  type Rolya,
} from '../src/iztochnik/model.js';
import { sektoriNaRazhod } from '../src/domein/dds.js';
import { potototsiNaRazhod } from '../src/domein/smetki.js';
import {
  imaShtoDaSePravi,
  prilozhi,
  sravni,
  type Plan,
  type Razlika,
} from '../src/domein/aktualizatsiya.js';
import { belegNaButon, napraviButon, type Buton } from '../src/domein/butoni.js';
import {
  chislovi,
  IMENA_NA_SBOROVETE,
  primer,
  sDumi,
  sPrevklyuchena,
  vDvataSbora,
  znak,
  ZNAK,
  type ChislovaKolona,
  type DvataSbora,
} from '../src/domein/chisla.js';
import {
  GreshkaSveryavane,
  sgloviPartida,
  zapishiSverkata,
  type PodadenFayl,
} from '../src/domein/sveryavane.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

type Filtar = 'promenite' | 'vsichko';

let otvoreno = false;
let plan: Plan | null = null;
let filtar: Filtar = 'promenite';
let greshka = '';
/** Дръжката към файла живее, докато трае сесията — за „Препрочети". */
let drazhka: FileSystemFileHandle | null = null;

/**
 * ПИТАНЕТО · когато никой модел не познава таблицата.
 *
 * Дотук непознат файл беше СЛЯПА УЛИЦА: „Не разчитам този файл." Оттук е
 * въпрос. Държи се таблицата и следата ѝ, за да не се иска файлът пак —
 * човекът вече го е посочил веднъж.
 */
interface Pitane {
  readonly izvor: Izvor;
  readonly tablitsa: Tablitsa;
  redNaGlavata: number;
}
let pitane: Pitane | null = null;

/**
 * Кой бутон е натиснат. Бутоните са модели на пътища (`src/domein/butoni.ts`);
 * ръчният път остава като бутон без папка, за да няма два механизма.
 */
let natisnat: Buton | null = null;
/** Резултатът от последната сверка — числото, което тя записа в Журнала. */
let posledna: { razlika_st: number; vhod_st: number; izhod_st: number } | null = null;
/** Листове, които никой позволен модел не позна — броят се, не се преглъщат. */
let nepoznati: string[] = [];
/** Отпечатъците на всички файлове от партидата — влизат в записаната сверка. */
let izvori: string[] = [];
/**
 * Числовите колони на прочетеното, разпределени в двата задължителни сбора.
 * Смятат се при ЧЕТЕНЕ, защото само тогава таблицата е под ръка.
 */
let sborove: { model: ModelNaTablitsa; tablitsa: Tablitsa; dvata: DvataSbora } | null = null;

/**
 * ПЪРВИЯТ БУТОН · онзи, който съществуваше преди Настройки.
 *
 * Пази се като бутон, за да няма два механизма: старият път „Въведи разходи"
 * е просто бутон без записани модели — приема всеки познат хедър и пита за
 * непознатия. Папката му е „Разходи", защото точно там влизаше досега.
 */
const PARVIYAT: Buton = napraviButon({
  klyuch: 'Въведи разходи',
  papka: 'Разходи',
  deystvie: 'sveryavane-eksel',
});

/**
 * МЕНЮТО · списък от БУТОНИ, групирани по папка.
 *
 * Дотук пунктовете бяха четири закована вида файл. Оттук са толкова, колкото
 * бутона има човекът — плюс четирите вида, които всеки бутон приема.
 */
export function narisuvayButona(butoni: readonly Buton[] = []): string {
  const vsichki = [PARVIYAT, ...butoni.filter((b) => b.klyuch !== PARVIYAT.klyuch)];
  const poPapka = [...new Set(vsichki.map((b) => b.papka))].sort((a, b) => a.localeCompare(b));

  return `
    <div class="padashto">
      <button type="button" class="glaven" id="vzemi" aria-expanded="${otvoreno}">
        ${natisnat ? ekraniraj(natisnat.klyuch) : 'Въведи разходи'} ▾
      </button>
      ${
        otvoreno
          ? `<div class="menyu" id="menyu">
        ${poPapka
          .map(
            (p) => `<p class="menyupapka">${ekraniraj(p)}</p>
          ${vsichki
            .filter((b) => b.papka === p)
            .map(
              (b) => `<button type="button" class="punkt" data-buton="${ekraniraj(b.klyuch)}">
              <b>${ekraniraj(b.klyuch)}</b><span>${
                b.modeli.length === 0
                  ? 'приема всеки познат хедър'
                  : `само: ${ekraniraj(b.modeli.join(' · '))}`
              }</span>
            </button>`,
            )
            .join('')}`,
          )
          .join('')}
        <p class="drebno">Може да посочиш <b>няколко файла наведнъж</b> — влизат като ЕДНА партида с едно число. Файловете не се качват: чете се и се взима снимка. Нови бутони се правят в <b>Настройки</b>.</p>
      </div>`
          : ''
      }
    </div>
    <input translate="no" type="file" id="fayl-iztochnik" multiple hidden>`;
}

export function narisuvayPlana(): string {
  if (pitane) {
    return `${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}${narisuvayPitaneto(pitane)}`;
  }
  if (greshka && !plan) {
    return `<div class="vest zle">${ekraniraj(greshka)}</div>`;
  }
  if (!plan) return '';

  const p = plan;
  const promeni = p.redove.filter((r) => r.kakvo !== 'bezPromyana');
  const pokazani = filtar === 'vsichko' ? p.redove : promeni;
  const broy = (kakvo: Razlika['kakvo']) => p.redove.filter((r) => r.kakvo === kakvo).length;

  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>${p.parvoChetene ? 'Прочетено' : 'Разликите'} · ${ekraniraj(p.snimka.period)}</h2>
        <span>${ekraniraj(p.snimka.izvor.ime)} · отпечатък ${ekraniraj(p.snimka.izvor.otpechatak.slice(0, 12))}…</span>
      </div>

      ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Сега в Журнала</span>
          <span class="chislo" translate="no">${kakvoPishe(p.sega_st as never)}</span>
          <span class="pod">${p.rachni ? `${p.rachni} ръчни не се пипат` : 'от източник'}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Според файла</span>
          <span class="chislo" translate="no">${kakvoPishe(p.sled_st as never)}</span>
          <span class="pod">${p.snimka.redove.length} ${p.snimka.redove.length === 1 ? 'ред' : 'реда'}</span>
        </div>
        <div class="plochka${p.sled_st !== p.sega_st ? ' trevoga' : ''}">
          <span class="etiket">Разлика</span>
          <span class="chislo" translate="no">${kakvoPishe((p.sled_st - p.sega_st) as never)}</span>
          <span class="pod">${broy('nov')} нови · ${broy('promenen')} поправени · ${broy('izchezval')} махнати</span>
        </div>
        <div class="plochka${p.snimka.propusnati.length ? ' trevoga' : ''}">
          <span class="etiket">Непрочетени редове</span>
          <span class="chislo" translate="no">${p.snimka.propusnati.length}</span>
          <span class="pod">${p.snimka.propusnati.length ? 'виж долу' : 'нищо не е пропуснато'}</span>
        </div>
      </div>

      <div class="poleta">
        <div class="pole">
          <label for="plan-potok">Поток</label>
          <select translate="no" id="plan-potok">
            ${potototsiNaRazhod()
              .map((x) => `<option value="${ekraniraj(x.klyuch)}"${x.klyuch === 'fakturi' ? ' selected' : ''}>${ekraniraj(x.ime)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="plan-sektor">Сектор</label>
          <select translate="no" id="plan-sektor">
            ${sektoriNaRazhod()
              .map((a) => `<option value="${ekraniraj(a.klyuch)}"${a.klyuch === 'pokupki-materiali' ? ' selected' : ''}>${ekraniraj(a.sektor)} · ${a.stavka}%</option>`)
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="plan-nachin">Платено</label>
          <select translate="no" id="plan-nachin">
            <option value="банка">по банка</option>
            <option value="в брой">в брой</option>
          </select>
        </div>
      </div>

      <div class="dyalglava">
        <h2 class="malko">Редовете</h2>
        <span class="filtar">
          <button type="button" class="vtorichen malak${filtar === 'promenite' ? ' tuk' : ''}" data-filtar="promenite">Само промените (${promeni.length})</button>
          <button type="button" class="vtorichen malak${filtar === 'vsichko' ? ' tuk' : ''}" data-filtar="vsichko">Всичко (${p.redove.length})</button>
        </span>
      </div>

      <div class="tablitsa">
        <div class="glava razlika">
          <span>Какво</span><span>Доставчик и описание</span><span>Дата</span>
          <span class="suma">Беше</span><span class="suma">Става</span>
        </div>
        ${
          pokazani.length === 0
            ? '<p class="prazno">Нищо за промяна — файлът казва същото, което казва Журналът.</p>'
            : pokazani.map(redNaRazlika).join('')
        }
      </div>

      ${blokNaSborovete()}

      ${
        nepoznati.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava propusnat"><span>Непознат лист</span><span>нито един позволен модел не го позна</span></div>
        ${nepoznati
          .map((x) => `<div class="red propusnat" translate="no"><span>лист</span><span>${ekraniraj(x)}</span></div>`)
          .join('')}
      </div>`
      }

      ${
        p.snimka.propusnati.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava propusnat"><span>Ред</span><span>Защо не е прочетен</span></div>
        ${p.snimka.propusnati
          .map(
            (x) => `<div class="red propusnat" translate="no"><span>ред ${x.red}</span><span>${ekraniraj(x.zashto)}</span></div>`,
          )
          .join('')}
      </div>`
      }

      <div class="deystviya">
        <button type="button" class="glaven" id="prilozhi"${imaShtoDaSePravi(p) ? '' : ' disabled'}>
          ${p.parvoChetene ? 'Запиши' : 'Приложи поправките'}
        </button>
        ${drazhka ? '<button type="button" class="vtorichen" id="prechetii">Препрочети файла</button>' : ''}
        <button type="button" class="vtorichen" id="otkazhi-plan">Откажи</button>
        <p class="drebno">Поправката е <b>сторно + ново</b>, не презапис. Старото остава в Журнала с бележка кой файл го е поправил — затова „Провери веригата" ще казва ЦЯЛА и след това.</p>
      </div>
    </section>`;
}

/**
 * ЕКРАНЪТ ЗА КАРТАТА НА ХЕДЪРА · питаме ВЕДНЪЖ.
 *
 * Показва се само когато нито един записан модел не познава таблицата. Оттук
 * нататък същият хедър минава сам — затова въпросът не дразни: задава се
 * веднъж на банка, не веднъж на файл.
 *
 * Предложението идва от `podskazhi()`; то е ПРЕДЛОЖЕНИЕ, а не решение. Утре на
 * това място може да застане ИИ — правило 18 остава спазено, защото записва
 * човекът, с натискане на бутона.
 */
function narisuvayPitaneto(pi: Pitane): string {
  const glava = pi.tablitsa.redove[pi.redNaGlavata] ?? [];
  const predlozheno = podskazhi(pi.tablitsa, pi.redNaGlavata);
  const primer = pi.tablitsa.redove[pi.redNaGlavata + 1] ?? [];

  const kolonaIzbor = (rolya: Rolya): string => {
    const izbrano = predlozheno[rolya];
    const zadalzhitelna = ZADALZHITELNI_ROLI.includes(rolya);
    return `
      <div class="pole">
        <label for="karta-${rolya}">${ekraniraj(IMENA_NA_ROLITE[rolya])}${zadalzhitelna ? ' · задължителна' : ''}</label>
        <select translate="no" id="karta-${rolya}" data-rolya="${rolya}">
          <option value="">${zadalzhitelna ? '— избери —' : '— няма —'}</option>
          ${glava
            .map((zaglavie, i) => {
              const etiket = zaglavie.trim() === '' ? `колона ${i + 1}` : zaglavie.trim();
              return `<option value="${i}"${izbrano === i ? ' selected' : ''}>${ekraniraj(etiket)}</option>`;
            })
            .join('')}
        </select>
      </div>`;
  };

  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>Не познавам тази таблица</h2>
        <span>${ekraniraj(pi.izvor.ime)} · отпечатък ${ekraniraj(pi.izvor.otpechatak.slice(0, 12))}…</span>
      </div>

      <p class="drebno">Кажи веднъж коя колона какво е. Записва се като <b>МоделЗаписан</b> в Журнала и следващият файл със същата глава минава без питане. Нищо не се гадае — предложеното долу е само предложение.</p>

      <div class="poleta tesni">
        <div class="pole">
          <label for="karta-ime">Име на модела</label>
          <input translate="no" id="karta-ime" placeholder="напр. Банка ОББ" autocomplete="off" value="${ekraniraj(imeOtIzvor(pi.izvor.ime))}">
        </div>
        <div class="pole">
          <label for="karta-glava">Кой ред е главата</label>
          <select translate="no" id="karta-glava">
            ${pi.tablitsa.redove
              .map((red, i) => {
                const opis = red
                  .map((k) => k.trim())
                  .filter((k) => k !== '')
                  .slice(0, 4)
                  .join(' · ');
                return `<option value="${i}"${i === pi.redNaGlavata ? ' selected' : ''}>ред ${i + 1} · ${ekraniraj(opis || 'празен')}</option>`;
              })
              .slice(0, 20)
              .join('')}
          </select>
        </div>
      </div>

      <div class="poleta">
        ${(Object.keys(IMENA_NA_ROLITE) as Rolya[]).map(kolonaIzbor).join('')}
        <div class="pole">
          <label for="karta-dds-e">Колоната за ДДС носи</label>
          <select translate="no" id="karta-dds-e">
            <option value="stavka">процент · 0, 9 или 20</option>
            <option value="suma">сума в левове</option>
          </select>
        </div>
      </div>

      <div class="tablitsa">
        <div class="glava propusnat"><span>Първи ред с данни</span><span>какво пише в него</span></div>
        ${
          primer.length === 0
            ? '<p class="prazno">Под главата няма редове.</p>'
            : glava
                .map((zaglavie, i) => {
                  const stoynost = kletka(pi.tablitsa, pi.redNaGlavata + 1, i);
                  if (zaglavie.trim() === '' && stoynost === '') return '';
                  return `<div class="red propusnat" translate="no"><span>${ekraniraj(zaglavie.trim() || `колона ${i + 1}`)}</span><span>${ekraniraj(stoynost)}</span></div>`;
                })
                .join('')
        }
      </div>

      <div class="deystviya">
        <button type="button" class="glaven" id="zapomni-model">Запомни модела и прочети файла</button>
        <button type="button" class="vtorichen" id="otkazhi-pitane">Откажи</button>
        <p class="drebno">Задължителни са <b>дата</b> и <b>сума</b> — без тях ред не става запис. Една колона носи една роля; ако дадеш една и съща колона на две роли, записът се отказва на глас.</p>
      </div>
    </section>`;
}

/**
 * ДВАТА ЗАДЪЛЖИТЕЛНИ СБОРА · Приход /+/ и Разход /−/.
 *
 * Негови думи, ДВЕ отделни изречения — не се сливат в едно:
 *
 *   „Те не са бутон, а УМЕНИЕ НА ДАННИТЕ за таблиците на Приход с + и Разход с −."
 *
 *   „За Приходи се появява падащо меню с името на избраната колона от тези
 *    възможни С ЦИФРИ, сумарно от цялата колона… и има възможност просто да се
 *    изключи там и да не стигне в Сметки и в Управление."
 *
 * И неговата поправка (23.08), която казва кое мърда и кое не:
 *
 *   „КОЛОНАТА НЕ ОТИВА КЪДЕТО СИ РЕШИ, А КЪДЕТО Я ПОСТАВИШ. Не си избира —
 *    както СУМАТА от колоните с валута се изпраща директно автоматично към
 *    Приходи, ако е с +, и в Разходи, ако е с −."
 *
 * Затова колоните тук стоят В РЕДА НА ХЕДЪРА, а знакът е ЗНАЧКА на реда.
 * Дотук този блок ги изсипваше групирани — първо приходните, после разходните
 * — и с това колоната наистина „отиваше където си реши".
 *
 * КОИ КОЛОНИ СЕ ПОЯВЯВАТ: само обявените за ЕВРО (`vid-stoynost.ts`). Процент
 * и брой не са пари, колкото и числови да изглеждат.
 */
function blokNaSborovete(): string {
  if (!sborove) return '';
  const { dvata } = sborove;
  if (dvata.prihod.length + dvata.razhod.length + dvata.izklyucheni.length === 0) return '';

  const red = (k: ChislovaKolona, sbor: 'prihod' | 'razhod' | null): string => `
    <div class="red znak${k.izklyuchena ? ' mahnata' : ''}" translate="no">
      <span>${
        sbor === null
          ? '<span class="znachka tiha">махната</span>'
          : `<span class="znachka ${sbor === 'prihod' ? 'plyus' : 'minus'}">${ZNAK[sbor]}</span>`
      }</span>
      <span class="kletka"><b>${ekraniraj(k.ime)}</b><span>${k.broy} ${
        k.broy === 1 ? 'число' : 'числа'
      }${k.rolya ? ` · роля „${ekraniraj(IMENA_NA_ROLITE[k.rolya])}"` : ''}</span></span>
      <span class="kletka"><span>напр. ${ekraniraj(primer(sborove!.model, sborove!.tablitsa, k.kolona))}</span></span>
      <span class="suma${k.izklyuchena ? '' : sbor === 'razhod' ? ' duljimo' : ' plateno'}">${kakvoPishe(
        Math.abs(k.sbor_st) as never,
      )}</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-znak="${k.kolona}">${
          k.izklyuchena ? 'Върни' : 'Махни'
        }</button>
      </span>
    </div>`;

  return `
      <div class="dyalglava">
        <h2 class="malko">Приход /+/ и Разход /−/</h2>
        <span>${ekraniraj(sDumi(dvata))}</span>
      </div>
      <div class="tablitsa">
        <div class="glava znak">
          <span>Знак</span><span>Колона</span><span>Пример</span>
          <span class="suma">Сбор</span><span></span>
        </div>
        ${[...dvata.prihod, ...dvata.razhod, ...dvata.izklyucheni]
          .sort((a, b) => a.kolona - b.kolona)
          .map((k) => red(k, k.izklyuchena ? null : znak(k.sbor_st)))
          .join('')}
        <div class="red znak sbor" translate="no">
          <span></span>
          <span class="kletka"><b>${IMENA_NA_SBOROVETE.prihod} ${ZNAK.prihod} · ${IMENA_NA_SBOROVETE.razhod} ${ZNAK.razhod}</b><span>двата сбора не се махат — само се скриват</span></span>
          <span></span>
          <span class="suma plateno">${kakvoPishe(dvata.prihod_st as never)}</span>
          <span class="suma duljimo">${kakvoPishe(dvata.razhod_st as never)}</span>
        </div>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="izprati-sborove">Изпрати сборовете</button>
        <span class="drebno" translate="no">${ekraniraj(sDumiNaPartida(zaIzprashtane(sborove.model, sborove.tablitsa)))}</span>
      </div>
      <p class="drebno"><b>Колоната стои където я поставиш</b> — тук тя е в реда на хедъра. Отива <b>сборът ѝ</b>: при /+/ в Приходи, при /−/ в Разходи. Знакът се <b>смята</b> и не се записва; записва се само <b>махането</b>, защото то е решение и иска следа.</p>`;
}

/** Име по подразбиране: файлът без наставка и без брояча „(3)". */
function imeOtIzvor(ime: string): string {
  return ime
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

function redNaRazlika(r: Razlika): string {
  const znachki: Record<Razlika['kakvo'], string> = {
    nov: '<span class="znachka dobre">нов</span>',
    promenen: '<span class="znachka trevoga">поправен</span>',
    izchezval: '<span class="znachka trevoga">махнат</span>',
    bezPromyana: '<span class="znachka tiha">същият</span>',
  };
  const koy = r.nov?.koy ?? r.star?.dostavchik ?? '—';
  const opis = r.nov?.opis ?? r.star?.opis ?? '';
  const dokument = r.nov?.dokument ?? r.star?.dokument ?? '';
  return `
    <div class="red razlika" translate="no">
      <span>${znachki[r.kakvo]}</span>
      <span class="kletka"><b>${ekraniraj(koy)}</b><span>${ekraniraj(opis)}${dokument ? ` · док. ${ekraniraj(dokument)}` : ''}</span></span>
      <span>${ekraniraj(r.nov?.data ?? r.star?.data ?? '')}</span>
      <span class="suma">${r.star ? kakvoPishe(r.star.suma_st as never) : '—'}</span>
      <span class="suma${r.kakvo === 'izchezval' ? ' duljimo' : ''}">${
        r.nov ? kakvoPishe(r.nov.suma_st as never) : '—'
      }</span>
    </div>`;
}

// ── четенето ───────────────────────────────────────────────────────────────
async function tablitsiOtFayl(
  danni: Uint8Array,
  ime: string,
  vid: VidIzvor,
): Promise<Tablitsa[]> {
  if (vid === 'xlsx') return (await otXLSX(danni, ime)).map(bezPrazni);
  if (vid === 'pdf') return [bezPrazni(tablitsaOtPDF(await otPDF(danni), ime))];
  return [bezPrazni(otCSV(tekstOtBaytove(danni), ime))];
}

/** Видът на файла се вади от името, защото един бутон приема всички. */
function vidPoIme(ime: string): VidIzvor {
  const dolu = ime.toLowerCase();
  if (dolu.endsWith('.xlsx')) return 'xlsx';
  if (dolu.endsWith('.pdf')) return 'pdf';
  return 'csv';
}

/** Един файл, прочетен ВЕДНЪЖ: същите байтове дават и отпечатъка, и листовете. */
async function prochetiFayla(fayl: File): Promise<PodadenFayl> {
  const vid = vidPoIme(fayl.name);
  const danni = new Uint8Array(await fayl.arrayBuffer());
  return {
    izvor: {
      vid,
      ime: fayl.name,
      golemina: fayl.size,
      promenen: new Date(fayl.lastModified).toISOString(),
      otpechatak: await otpechatak(danni, sha256Web),
    },
    tablitsi: await tablitsiOtFayl(danni, fayl.name, vid),
  };
}

/**
 * ПАРТИДАТА · няколко файла, няколко листа, ЕДНО число.
 *
 * Бутонът решава кои модели са позволени. Ако никой не познае нищо и файлът е
 * един, се пада към стария път: разпознаване по думи, а ако и то не хване —
 * питане за картата на хедъра. Така нищо от резен 12 не се губи, а бутонът
 * добавя отгоре това, което той поиска: няколко файла и списък от модели.
 */
async function napraviPartida(faylove: readonly File[], buton: Buton, k: Konteks): Promise<void> {
  const podadeni: PodadenFayl[] = [];
  for (const f of faylove) podadeni.push(await prochetiFayla(f));

  const o = await k.deystviya.ogledalo();
  try {
    const partida = await sgloviPartida({
      buton,
      faylove: podadeni,
      modeli: [...o.modeli.values()],
      ogledalo: o,
      sha: sha256Web,
    });
    pitane = null;
    plan = partida.plan;
    nepoznati = partida.nepoznati.map((x) => `„${x.list}" от ${x.fayl}`);
    izvori = [...partida.izvori];
    sborove = presmetniSborovete(partida.dvoyki);
    filtar = 'promenite';
    greshka = '';
  } catch (err) {
    // „Не позна нито един лист" при ЕДИН файл не е грешка — това е моментът,
    // в който приложението пита. Три условия обаче трябва да са налице:
    //
    //   · грешката е точно тази (чужд модел хвърля `GreshkaButon`, не тази);
    //   · файлът е ЕДИН — при няколко питането би било гадаене за кой от тях;
    //   · бутонът НЯМА списък с модели.
    //
    // Третото е кръвно платено: без него бутон, ограничен до „Банка ОББ",
    // приемаше таблица с разходи през стария път по думи — тоест списъкът с
    // позволени модели се заобикаляше тихо. Проход §19 го хвана.
    if (!(err instanceof GreshkaSveryavane) || podadeni.length !== 1) throw err;
    if (buton.modeli.length > 0) throw err;
    await staraPateka(podadeni[0]!, o, k);
  }
}

/** Пътят отпреди бутоните: разпознаване по думи, иначе питане за картата. */
async function staraPateka(
  f: PodadenFayl,
  o: Awaited<ReturnType<Konteks['deystviya']['ogledalo']>>,
  _k: Konteks,
): Promise<void> {
  const s = nameriTablitsata(f.tablitsi, f.izvor, [...o.modeli.values()]);
  if (!s) {
    const t = f.tablitsi.find((x) => x.redove.length > 0) ?? f.tablitsi[0];
    if (!t) throw new Error('Файлът няма нито един ред.');
    pitane = { izvor: f.izvor, tablitsa: t, redNaGlavata: pogadniRedNaGlavata(t) };
    plan = null;
    nepoznati = [];
    greshka = '';
    return;
  }
  pitane = null;
  plan = sravni(o, s);
  nepoznati = [];
  izvori = [f.izvor.otpechatak];
  sborove = null;
  filtar = 'promenite';
  greshka = '';
}

/**
 * Двата сбора се смятат от ПЪРВИЯ прочетен лист.
 *
 * Нарочно не се сливат листовете: колона „Такса" в два различни модела не е
 * една и съща колона, и събирането ѝ би дало число, което не значи нищо.
 * Слепването на няколко модела в един сбор чака своя резен.
 */
function presmetniSborovete(
  dvoyki: readonly { model: ModelNaTablitsa; tablitsa: Tablitsa }[],
): { model: ModelNaTablitsa; tablitsa: Tablitsa; dvata: DvataSbora } | null {
  const parva = dvoyki[0];
  if (!parva) return null;
  return {
    model: parva.model,
    tablitsa: parva.tablitsa,
    dvata: vDvataSbora(chislovi(parva.model, parva.tablitsa)),
  };
}

/**
 * Кой лист да се чете и как.
 *
 * Редът е нарочен:
 *   1. ЗАПИСАН МОДЕЛ — човекът вече е казал коя колона какво е. Неговата дума
 *      бие всяко разпознаване по думи, дори когато и двете биха сработили.
 *   2. Старият път по думи („Доставчик", „Сума", „Дата") — таблиците, писани
 *      в самото приложение, минават без да се пита за нищо.
 *   3. `undefined` — никой не позна. Не се хвърля грешка: горе се пита.
 */
function nameriTablitsata(
  tablitsi: readonly Tablitsa[],
  izvor: Izvor,
  modeli: readonly ModelNaTablitsa[],
): Snimka | undefined {
  for (const t of tablitsi) {
    const m = nameriModel(modeli, t);
    if (!m) continue;
    const period = periodPoModel(m, t);
    if (period === '') continue;
    return razchetiPoModel({ model: m, tablitsa: t, izvor, period });
  }

  for (const t of tablitsi) {
    const period = pogadniPeriod(t);
    if (period === '') continue;
    return razchetiRazhodi({ tablitsa: t, izvor, period });
  }

  return undefined;
}

/**
 * Кой ред ПРЕДЛАГАМЕ за глава: първият с поне две пълни клетки.
 *
 * Това е подсказка за окото, не решение — човекът вижда падащия списък с
 * всички редове и може да посочи друг. Затова е позволено да е просто.
 */
function pogadniRedNaGlavata(t: Tablitsa): number {
  const i = t.redove.findIndex((red) => red.filter((klet) => klet.trim() !== '').length >= 2);
  return i < 0 ? 0 : i;
}

/**
 * Добавя новия модел към списъка на бутона — ако бутонът има списък.
 *
 * Бутон с ПРАЗЕН списък приема всичко и няма какво да се добавя. Бутон със
 * списък трябва да поеме модела, иначе следващия път ще откаже същия файл,
 * който човекът току-що му е обяснил — и това би изглеждало като повреда.
 */
async function pomniVButona(b: Buton | null, model: string, k: Konteks): Promise<boolean> {
  if (!b || b.modeli.length === 0 || b.modeli.includes(model)) return false;
  const nov = napraviButon({ ...b, modeli: [...b.modeli, model] });
  await k.deystviya.zapishiButon(nov, { opId: `buton:${crypto.randomUUID()}` });
  natisnat = nov;
  return true;
}

/** Прочита таблицата на питането през вече записания модел. */
async function prilozhiModela(m: ModelNaTablitsa, k: Konteks): Promise<void> {
  const pi = pitane!;
  const period = periodPoModel(m, pi.tablitsa);
  if (period === '') {
    throw new Error(
      'С тази карта не се разчита нито една дата — провери коя колона си дал за „дата".',
    );
  }
  plan = sravni(
    await k.deystviya.ogledalo(),
    razchetiPoModel({ model: m, tablitsa: pi.tablitsa, izvor: pi.izvor, period }),
  );
  pitane = null;
  filtar = 'promenite';
  greshka = '';
}

export function zakachiIztochnitsi(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLButtonElement>('#vzemi')?.addEventListener('click', async () => {
    otvoreno = !otvoreno;
    await prerisuvay();
  });

  const fayl = koren.querySelector<HTMLInputElement>('#fayl-iztochnik');

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-buton]')) {
    b.addEventListener('click', async () => {
      const ime = b.dataset['buton']!;
      const o = await k.deystviya.ogledalo();
      natisnat = o.butoni.get(ime) ?? (ime === PARVIYAT.klyuch ? PARVIYAT : null);
      otvoreno = false;
      greshka = '';
      await prerisuvay();
      if (natisnat) await izberiFayl(natisnat, k, prerisuvay);
    });
  }

  fayl?.addEventListener('change', async () => {
    const izbrani = [...(fayl.files ?? [])];
    fayl.value = '';
    if (izbrani.length === 0) return;
    drazhka = null;
    const buton = natisnat ?? PARVIYAT;
    await opitaj(() => napraviPartida(izbrani, buton, k), prerisuvay);
  });

  koren.querySelector<HTMLButtonElement>('#prechetii')?.addEventListener('click', async () => {
    if (!drazhka || !plan) return;
    const buton = natisnat ?? PARVIYAT;
    await opitaj(async () => napraviPartida([await drazhka!.getFile()], buton, k), prerisuvay);
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-filtar]')) {
    b.addEventListener('click', async () => {
      filtar = b.dataset['filtar'] as Filtar;
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#otkazhi-plan')?.addEventListener('click', async () => {
    plan = null;
    greshka = '';
    drazhka = null;
    nepoznati = [];
    sborove = null;
    await prerisuvay();
  });

  // ── знакът · махане и връщане на числова колона ──────────────────────────
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-znak]')) {
    b.addEventListener('click', async () => {
      if (!sborove) return;
      const kolona = Number(b.dataset['znak']);
      const stariyat = sborove.model;
      b.disabled = true;
      try {
        // Махането е РЕШЕНИЕ — записва се в модела, за да важи и утре.
        //
        // Пипа се САМО `izklyucheni`. Дотук тук се строеше нов модел от нулата
        // и с това се губеха менютата, заключените имена, видовете на колоните
        // и предишните отпечатъци — всичко, което Редакторът е записал.
        const nov: ModelNaTablitsa = Object.freeze({
          ...stariyat,
          izklyucheni: sPrevklyuchena(stariyat, kolona),
        });
        // `opId` носи ДЕЙСТВИЕТО, не съдържанието: махнеш ли колона и я върнеш,
        // съдържанието се връща към предишното, а действията са две.
        await k.deystviya.zapishiModel(nov, { opId: `znak:${crypto.randomUUID()}` });
        sborove = {
          model: nov,
          tablitsa: sborove.tablitsa,
          dvata: vDvataSbora(chislovi(nov, sborove.tablitsa)),
        };
        greshka = '';
      } catch (err) {
        greshka = err instanceof Error ? err.message : String(err);
      }
      await prerisuvay();
    });
  }

  // ── сборовете тръгват към Приходи и Разходи ──────────────────────────────
  koren.querySelector<HTMLButtonElement>('#izprati-sborove')?.addEventListener('click', async () => {
    if (!sborove) return;
    const redove = zaIzprashtane(sborove.model, sborove.tablitsa);
    if (redove.length === 0) {
      k.vest('zle', 'Няма колона, обявена за евро — нищо не тръгва.');
      return;
    }
    const period = new Date().toISOString().slice(0, 7);
    const beleg = belegNaPartida(sborove.model.klyuch, period, redove);
    const og = await k.deystviya.ogledalo();
    // Повторното изпращане на СЪЩОТО не удвоява: белегът казва дали изобщо
    // се е сменило нещо. `opId` носи ДЕЙСТВИЕТО, не съдържанието (правило 20).
    const veche = redove.every(
      (r) => og.pototsi.get(`${sborove!.model.klyuch}|${r.kolona}|${period}`)?.beleg === beleg,
    );
    if (veche) {
      k.vest('dobre', 'Същите сборове вече са изпратени — в Журнала не влиза нищо.');
      return;
    }
    try {
      for (const r of redove) {
        await k.deystviya.zapishiPotok(
          {
            model: sborove.model.klyuch,
            kolona: r.kolona,
            ime: r.ime,
            kam: r.kam,
            suma_st: r.suma_st,
            broy: r.broy,
            period,
            beleg,
          },
          { opId: `potok:${crypto.randomUUID()}` },
        );
      }
      const { prihod_st, razhod_st } = sboroveNaPartida(redove);
      k.vest(
        'dobre',
        `Изпратено: ${kakvoPishe(prihod_st as never)} в Приходи · ${kakvoPishe(razhod_st as never)} в Разходи.`,
      );
      greshka = '';
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
    }
    await prerisuvay();
  });

  // ── картата на хедъра ────────────────────────────────────────────────────
  koren.querySelector<HTMLSelectElement>('#karta-glava')?.addEventListener('change', async (e) => {
    if (!pitane) return;
    pitane.redNaGlavata = Number((e.currentTarget as HTMLSelectElement).value);
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-pitane')?.addEventListener('click', async () => {
    pitane = null;
    plan = null;
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#zapomni-model')?.addEventListener('click', async (e) => {
    if (!pitane) return;
    const buton = e.currentTarget as HTMLButtonElement;
    const pi = pitane;

    const koloni: Partial<Record<Rolya, number>> = {};
    for (const izbor of koren.querySelectorAll<HTMLSelectElement>('[data-rolya]')) {
      if (izbor.value === '') continue;
      koloni[izbor.dataset['rolya'] as Rolya] = Number(izbor.value);
    }
    const ime = koren.querySelector<HTMLInputElement>('#karta-ime')?.value ?? '';
    const ddsE = koren.querySelector<HTMLSelectElement>('#karta-dds-e')?.value as
      | 'stavka'
      | 'suma';

    buton.disabled = true;
    try {
      const model = napraviModel({
        klyuch: ime,
        tablitsa: pi.tablitsa,
        redNaGlavata: pi.redNaGlavata,
        koloni,
        ...(koloni.dds === undefined ? {} : { ddsE }),
      });
      // Първо в Журнала, после на екрана: моделът трябва да ПРЕЖИВЕЕ прочита.
      // Нищо не се пише, ако картата е същата — иначе Журналът пълнее с
      // еднакви записи, а човекът мисли, че е поправил нещо.
      const veche = (await k.deystviya.ogledalo()).modeli.get(model.klyuch);
      if (!veche || belegNaModel(veche) !== belegNaModel(model)) {
        await k.deystviya.zapishiModel(model, { opId: `model:${crypto.randomUUID()}` });
      }
      // Бутонът, през който дойде файлът, ПОЕМА новия модел: човекът вече е
      // казал „това минава оттук". Иначе следващия път пак ще го откаже.
      const poet = await pomniVButona(natisnat, model.klyuch, k);
      await prilozhiModela(model, k);
      k.vest(
        'dobre',
        `Моделът „${model.klyuch}" е записан. Следващият файл със същата глава минава без питане` +
          (poet ? `, а бутонът „${natisnat!.klyuch}" вече го приема.` : '.'),
      );
    } catch (err) {
      greshka =
        err instanceof GreshkaModel || err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#prilozhi')?.addEventListener('click', async (e) => {
    if (!plan) return;
    const natisnatiyat = e.currentTarget as HTMLButtonElement;
    const vzemi = (izbor: string) => koren.querySelector<HTMLSelectElement>(izbor)!.value;
    const tekusht = plan;
    const buton = natisnat ?? PARVIYAT;
    const kogato = new Date().toISOString();
    const izvoriteNaPartidata = izvori.length ? izvori : [tekusht.snimka.izvor.otpechatak];

    natisnatiyat.disabled = true;
    try {
      const rezultat = await prilozhi(
        k.deystviya,
        tekusht,
        {
          potok: vzemi('#plan-potok'),
          sektor: vzemi('#plan-sektor'),
          nachin: vzemi('#plan-nachin') as 'банка' | 'в брой',
        },
        kogato,
      );

      // Сверката се ЗАПИСВА — и когато разликата е нула (правило 7). Дотук тя
      // живееше само в паметта на екрана и умираше с презареждането.
      const svereno = await zapishiSverkata(k.deystviya, {
        buton,
        partida: { plan: tekusht, dvoyki: [], nepoznati: [], izvori: izvoriteNaPartidata },
        rezultat,
        kogato,
      });
      posledna = {
        razlika_st: svereno.razlika_st,
        vhod_st: svereno.vhod_st,
        izhod_st: svereno.izhod_st,
      };

      k.vest(
        svereno.nared ? 'dobre' : 'zle',
        `${rezultat.zapisani} ${rezultat.zapisani === 1 ? 'записан' : 'записани'}` +
          `${rezultat.stornirani ? `, ${rezultat.stornirani} сторнирани` : ''}` +
          `${rezultat.bezPromyana ? `, ${rezultat.bezPromyana} без промяна` : ''}. ` +
          `Сверката е ЗАПИСАНА в Журнала · разлика ${kakvoPishe(svereno.razlika_st as never)}.`,
      );
      plan = null;
      nepoznati = [];
      greshka = '';
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
    } finally {
      natisnatiyat.disabled = false;
      await prerisuvay();
    }
  });
}

/**
 * Показва файловете за четене · МНОЖЕСТВЕН избор.
 *
 * Негов избор: няколко файла наведнъж, една сверка. Затова и модерният, и
 * старият избирач приемат повече от един. Където има модерен, дръжката на
 * ПЪРВИЯ се пази — „Препрочети" има смисъл само за един файл.
 */
const VSICHKI_VIDOVE = '.xlsx,.csv,.txt,.pdf';

async function izberiFayl(
  buton: Buton,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): Promise<void> {
  const izbirach = (globalThis as { showOpenFilePicker?: unknown }).showOpenFilePicker;
  if (typeof izbirach === 'function') {
    try {
      const drazhki = (await (izbirach as (n: unknown) => Promise<FileSystemFileHandle[]>)({
        multiple: true,
        types: [{ description: 'таблици', accept: { '*/*': VSICHKI_VIDOVE.split(',') } }],
      })) as FileSystemFileHandle[];
      if (drazhki.length === 0) return;
      drazhka = drazhki.length === 1 ? drazhki[0]! : null;
      const faylove = await Promise.all(drazhki.map((d) => d.getFile()));
      await opitaj(() => napraviPartida(faylove, buton, k), prerisuvay);
      return;
    } catch (err) {
      // Отказан избор не е грешка; всичко друго пада към стария избирач.
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  const fayl = document.getElementById('fayl-iztochnik') as HTMLInputElement | null;
  if (!fayl) return;
  fayl.accept = VSICHKI_VIDOVE;
  fayl.click();
}

async function opitaj(rabota: () => Promise<void>, prerisuvay: () => Promise<void>): Promise<void> {
  try {
    await rabota();
  } catch (err) {
    plan = null;
    pitane = null;
    greshka = err instanceof Error ? err.message : String(err);
  }
  await prerisuvay();
}
