/**
 * ПАРИТЕ В ЛИЧНОТО · „на едно място, ДЕЛИКАТНО" (И96 т.10).
 *
 * Негово: „И на едно място по един събран **деликатно** начин да се събере
 * всичко лично… тук да е събрана едно **кредит, приход, разход**."
 *
 * ═══ КАКВО ЗНАЧИ „ДЕЛИКАТНО" В КОД ═══
 *
 * Три неща, и всяко е решение, не украса:
 *
 *   1. ЧИСЛАТА ТРЪГВАТ СКРИТИ. Личният екран се отваря и до него може да стои
 *      човек. Сборовете се показват с натискане и състоянието се помни на ТОЗИ
 *      браузър — не в Журнала, защото „скрих числата" не е факт от историята.
 *      Това НЕ Е сигурност и екранът го казва: който има устройството, има
 *      Журнала. Спирачка за случайния поглед, не ключалка.
 *   2. НУЛА ПРИМЕРНИ ДАННИ. „Не го попълвай там" — празният екран показва
 *      покана, не измислен ред.
 *   3. НИЩО НЕ СЕ ЗАПИСВА БЕЗ НАТИСКАНЕ. Внесеното извлечение се ПОКАЗВА като
 *      план; редовете влизат, когато човекът каже.
 *
 * ═══ СВОЯ ПРЕДСТАВКА И СВОИ ИМЕНА ═══
 *
 * Представката е `lp-`, а имената на таблиците — `lichni-*`. Второто е важно:
 * имената на таблиците се помнят в `localStorage` (филтър, подредба, сгънато).
 * Кръстена `'razhodi'`, личната таблица щеше да дели филтъра си със служебната
 * — отметнат филтър „над 5 000 €" в Сметки почваше да крие лични редове.
 */

import { otSuma, pishi } from '../src/yadro/pari.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  IMENA_NA_VIDOVETE_KREDIT,
  VIDOVE_KREDIT,
  obshtoPari,
  ostatakNaKredita,
  pogasenLiE,
  predlaganiTemi,
  predlozhiVnoska,
  razhodnaChast,
  sborovePoTemi,
  type LichnaTema,
  type LichenKredit,
  type LichnoDvizhenie,
  type VidKredit,
} from '../src/domein/lichni-pari.js';
import { otCSV, tekstOtBaytove } from '../src/iztochnik/csv.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import { bezPrazni } from '../src/iztochnik/tablitsa.js';
import { prochetiKarta, sleiIzvlecheniya, saldoNaFayla, type SnimkaNaKarta } from '../src/iztochnik/karta.js';
import { prochetiIzvlecheniyata } from './izvlechenie-fayl.js';
import {
  sravniLichno,
  sverkaNaVnos,
  zaPisane,
  type PlanZaVnos,
} from '../src/domein/lichen-vnos.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import {
  menyuOtZhivi,
  poleSIzbor,
  poleSMenyu,
  rechnitsite,
  zakachiMenyuta,
  zapomniRechnitsite,
} from './menyu.js';
import type { Menyu } from '../src/domein/padashti-menyuta.js';
import type { Konteks } from './ekranite.js';

/** Ключът на речниците на ЛИЧНИЯ екран · нарочно различен от служебния. */
const RECHNIK_LICHEN = 'lichni-pari';

/** РЕЧНИКЪТ НА ТЪРГОВЦИТЕ · изведен от личните движения, без ново събитие. */
function menyutoNaTargovtsite(o: Ogledalo): Menyu {
  return menyuOtZhivi(
    'koy',
    'Кой',
    [...o.lichniDvizheniya.values()].map((d) => d.koy),
  );
}

/** Представка на всяко id · служебният екран носи свои и не бива да се бият. */
const PREDSTAVKA_PARI = 'lp-';

/** Скрити ли са числата · помни се на ТОЗИ браузър, не в Журнала. */
const KLYUCH_SKRITI = 'lichnipari.skriti';

let planat: PlanZaVnos | null = null;
let greshka = '';
/** Причината за изключване · живее на екрана, докато той стои отворен. */
let prichinaZaIzklyuchvane = '';
/** Кой ред коя тема получава · човекът пипа плана, преди да го запише. */
const temiNaPlana = new Map<string, string>();

/**
 * ПАДАЩОТО МЕНЮ НА ТЕМИТЕ · един дом за четирите му места (правило 17).
 *
 * Строеше се дословно четири пъти в този файл — два пъти във форма и два пъти
 * в таблица. Разликата беше САМО дали има вече избрана тема; тя става довод.
 *
 * Обходът за дублирано го намери чак когато прогледна за `app/`: дотук
 * изчистването на низовете сливаше и различни блокове, и обходът беше
 * полусляп точно за екранните файлове (ADR-051).
 */
function menyuNaTemite(
  atribut: string,
  temi: readonly LichnaTema[],
  izbrana = '',
): string {
  const redove = temi
    .map(
      (t) =>
        `<option value="${ekraniraj(t.temaId)}"${t.temaId === izbrana ? ' selected' : ''}>${ekraniraj(t.ime)}</option>`,
    )
    .join('');
  return `<select translate="no" ${atribut}>
            <option value="">— без тема —</option>
            ${redove}
          </select>`;
}

export function zabraviPlana(): void {
  planat = null;
  greshka = '';
  prichinaZaIzklyuchvane = '';
  temiNaPlana.clear();
}

function skritiLiSa(): boolean {
  return chetiEkranno(KLYUCH_SKRITI, true);
}

/**
 * СЕКЦИЯТА „ПАРИ" · всичко лично на едно място.
 *
 * Редът е нарочен: първо сборовете (какво става), после темите (къде отива),
 * после кредитите (какво дължа), и накрая вносът (откъде идват числата).
 * Човек, който отваря екрана, гледа отгоре надолу и стига до въвеждането
 * последен — а не обратното.
 */
export function sektsiyaPari(o: Ogledalo, dnes: string): string {
  const dvizheniya = [...o.lichniDvizheniya.values()];
  const skriti = skritiLiSa();
  return `
    <section data-sektsiya="lichni-pari">
      <div class="dyalglava">
        <h2>Моите пари</h2>
        <span>кредит · приход · разход, събрани на едно място</span>
      </div>
      ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}
      ${lentataSSborove(dvizheniya, skriti)}
      ${dvizheniya.length === 0 && o.lichniKrediti.size === 0 ? pokana() : ''}
      ${dvizheniya.length > 0 ? tablitsataPoTemi(o, skriti) : ''}
      ${dvizheniya.length > 0 ? tablitsataNaRedovete(o, skriti) : ''}
      ${formaRed(o, dnes)}
      ${formaTema(o)}
      ${sektsiyaKrediti(o, dnes, skriti)}
      ${sektsiyaVnos(o, skriti)}
    </section>`;
}

/**
 * САМИТЕ РЕДОВЕ · „да може да се добавя и РЕДАКТИРА лично".
 *
 * Сборът по теми казва КЪДЕ отиват парите; тази таблица казва КОИ са. Без нея
 * човекът вижда, че „Храна" е 350 €, и няма как да разбере кой ред е сгрешен.
 *
 * Тук се правят и двете поправки, които този екран изобщо позволява:
 * СМЯНА НА ТЕМАТА (ново `ЛичноДвижениеЗаписано` върху същия номер) и
 * ИЗКЛЮЧВАНЕ на реда с причина (свое събитие, правило 23). Триене няма.
 */
function tablitsataNaRedovete(o: Ogledalo, skriti: boolean): string {
  const redove = [...o.lichniDvizheniya.values()].sort(
    (a, b) => b.data.localeCompare(a.data) || a.koy.localeCompare(b.koy),
  );
  const temi = predlaganiTemi(o.lichniTemi.values());
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  return `
    <div class="dyalglava"><h3>Редовете</h3><span>${redove.length} · най-новите отгоре</span></div>
    <div class="tablitsa" data-tablitsa="lichni-dvizheniya">
      <div class="glava dvizhenie">
        <span>Дата</span><span>Кой</span><span>Сума</span><span>Тема</span><span></span>
      </div>
      ${redove
        .map(
          (d) => `<div class="red dvizhenie${d.izklyuchen ? ' mahnata' : ''}" translate="no">
            <span>${ekraniraj(d.data)}</span>
            <span class="kletka">${ekraniraj(d.koy || d.opis || '—')}${
              d.kreditId ? ' <span class="znachka tiha">вноска</span>' : ''
            }${d.klyuch === '' ? '' : ' <span class="znachka tiha">от файл</span>'}</span>
            <span class="chislo">${d.posoka === 'prihod' ? '+' : '−'}${chislo(d.suma_st)}${
              d.kreditId
                ? `<span class="drebno"> разход ${chislo(razhodnaChast(d))}</span>`
                : ''
            }</span>
            <span>${
              d.izklyuchen
                ? `<span class="znachka tiha">изключен · ${ekraniraj(d.prichina)}</span>`
                : menyuNaTemite(`data-smeni-tema="${ekraniraj(d.dvizhenieId)}"`, temi, d.temaId)
            }</span>
            <span>${
              d.izklyuchen
                ? `<button type="button" class="vtorichen malak" data-vurni="${ekraniraj(d.dvizhenieId)}">Върни</button>`
                : `<button type="button" class="vtorichen malak" data-izklyuchi="${ekraniraj(d.dvizhenieId)}">Изключи</button>`
            }</span>
          </div>`,
        )
        .join('')}
    </div>
    <div class="poleta">
      <label class="pole"><span>Защо се изключва</span>
        <input translate="no" type="text" id="${PREDSTAVKA_PARI}prichina" value="${ekraniraj(prichinaZaIzklyuchvane)}"
          placeholder="върнати пари · прехвърляне между свои сметки"></label>
    </div>
    <p class="drebno"><b>Ред се ИЗКЛЮЧВА, не се трие</b> (правило 23): пада от сборовете, остава в
    Журнала с причината си. Причината е <b>задължителна</b> — следа без причина не обяснява нищо
    след половин година. Смяната на тема е нов запис върху същия ред, не презапис.</p>`;
}

/** Ръчният ред · „да може да се добавя лично". */
function formaRed(o: Ogledalo, dnes: string): string {
  zapomniRechnitsite(RECHNIK_LICHEN, new Map([['koy', menyutoNaTargovtsite(o)]]));
  const temi = predlaganiTemi(o.lichniTemi.values());
  return `
    <details class="karta" data-forma="${PREDSTAVKA_PARI}red">
      <summary>Добави ред на ръка</summary>
      <div class="poleta">
        <label class="pole"><span>Дата</span>
          <input translate="no" type="date" id="${PREDSTAVKA_PARI}r-data" value="${ekraniraj(dnes)}"></label>
        ${poleSIzbor({
          id: `${PREDSTAVKA_PARI}r-posoka`,
          etiket: 'Посока',
          spisak: 'posoka',
          opcii: '<option value="razhod">разход</option><option value="prihod">приход</option>',
        })}
        <label class="pole"><span>Сума</span>
          <input translate="no" type="text" inputmode="decimal" id="${PREDSTAVKA_PARI}r-suma" placeholder="35,00"></label>
        ${
          /**
           * КОЙ · живо меню от ЛИЧНИЯ Журнал (ADR-042).
           *
           * Търговците се повтарят повече от всичко друго в личните пари, а
           * речникът им е ДРУГ: личното и служебното никога не се смесват
           * (И98), значи и списъкът тук идва само от личните движения.
           */
          poleSMenyu({
            id: `${PREDSTAVKA_PARI}r-koy`,
            etiket: 'Кой',
            menyu: menyutoNaTargovtsite(o),
            mestodarzhatel: 'ЛИДЛ',
          })
        }
        <label class="pole"><span>Тема</span>
          ${menyuNaTemite(`id="${PREDSTAVKA_PARI}r-tema"`, temi)}</label>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="${PREDSTAVKA_PARI}r-zapishi">Добави реда</button>
      </div>
    </details>`;
}

/** Темите · менюто, което ОПИСВА, значи расте свободно (ADR-033). */
function formaTema(o: Ogledalo): string {
  const vsichki = [...o.lichniTemi.values()];
  const zhivi = predlaganiTemi(vsichki);
  return `
    <details class="karta" data-forma="${PREDSTAVKA_PARI}tema">
      <summary>Темите (${zhivi.length})</summary>
      ${
        vsichki.length === 0
          ? '<p class="drebno">Още няма теми. Първата се прави тук; после всеки ред може да я избере.</p>'
          : `<div class="tablitsa" data-tablitsa="lichni-temi-opis">
              <div class="glava tema-opis"><span>Тема</span><span>Група</span><span></span></div>
              ${vsichki
                .map(
                  (t) => `<div class="red tema-opis${t.spryana ? ' mahnata' : ''}" translate="no">
                    <span class="kletka"><b>${ekraniraj(t.ime)}</b></span>
                    <span>${ekraniraj(t.grupa || '—')}</span>
                    <span>${
                      t.spryana
                        ? `<button type="button" class="vtorichen malak" data-vurni-tema="${ekraniraj(t.temaId)}">Върни</button>`
                        : `<button type="button" class="vtorichen malak" data-spri-tema="${ekraniraj(t.temaId)}">Спри да я предлагаш</button>`
                    }</span>
                  </div>`,
                )
                .join('')}
             </div>
             <p class="drebno">Спряната тема <b>не се трие</b> — тя пада от списъка, а редовете,
             които вече я носят, остават непокътнати (И97 т.12).</p>`
      }
      <div class="poleta">
        <label class="pole"><span>Име</span>
          <input translate="no" type="text" id="${PREDSTAVKA_PARI}t-ime" placeholder="Храна"></label>
        <label class="pole"><span>Група</span>
          <input translate="no" type="text" id="${PREDSTAVKA_PARI}t-grupa" placeholder="Дом"></label>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="${PREDSTAVKA_PARI}t-zapishi">Добави тема</button>
      </div>
    </details>`;
}

function lentataSSborove(dvizheniya: readonly LichnoDvizhenie[], skriti: boolean): string {
  const s = obshtoPari(dvizheniya);
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  return `
    <div class="plochki" data-tablitsa="lichni-sborove">
      <div class="plochka">
        <span class="etiket">Приход</span>
        <span class="chislo" translate="no">${chislo(s.prihod_st)}</span>
        <span class="pod">всичко, влязло</span>
      </div>
      <div class="plochka">
        <span class="etiket">Разход</span>
        <span class="chislo" translate="no">${chislo(s.razhod_st)}</span>
        <span class="pod">главницата по кредит НЕ е разход</span>
      </div>
      <div class="plochka${s.prihod_st - s.razhod_st < 0 ? ' trevoga' : ''}">
        <span class="etiket">Остава</span>
        <span class="chislo" translate="no">${chislo(s.prihod_st - s.razhod_st)}</span>
        <span class="pod">${s.izklyucheni > 0 ? `${s.izklyucheni} изключени реда не влизат` : 'нищо не е изключено'}</span>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="${PREDSTAVKA_PARI}pokazhi">${
          skriti ? 'Покажи числата' : 'Скрий числата'
        }</button>
      </div>
    </div>
    <p class="drebno">Числата тръгват <b>скрити</b> — личният екран се отваря и до него може да стои
    човек. Това е <b>спирачка за случайния поглед, не ключалка</b>: който има устройството, има и
    Журнала. Изборът се помни на този браузър и не влиза в Журнала — „скрих числата" не е факт
    от историята.</p>`;
}

function pokana(): string {
  return `
    <div class="karta">
      <p>Тук отиват <b>личните</b> приходи и разходи, подредени <b>по теми</b>, и кредитите —
      всичко на едно място, отделно от служебното.</p>
      <p class="drebno">Празно е нарочно: нищо не е попълнено вместо теб. Започни с
      <b>извлечение от картата</b> долу, или добави ред на ръка.</p>
    </div>`;
}

function tablitsataPoTemi(o: Ogledalo, skriti: boolean): string {
  const sborove = sborovePoTemi(o.lichniDvizheniya.values(), o.lichniTemi);
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  return `
    <div class="dyalglava"><h3>По теми</h3><span>кое къде отива</span></div>
    <div class="tablitsa" data-tablitsa="lichni-temi">
      <div class="glava tema">
        <span>Тема</span><span>Група</span><span>Приход</span><span>Разход</span><span>Редове</span>
      </div>
      ${sborove
        .map(
          (s) => `<div class="red tema" translate="no">
            <span class="kletka"><b>${ekraniraj(s.ime)}</b></span>
            <span>${ekraniraj(s.grupa || '—')}</span>
            <span class="chislo">${s.prihod_st ? chislo(s.prihod_st) : '—'}</span>
            <span class="chislo">${s.razhod_st ? chislo(s.razhod_st) : '—'}</span>
            <span class="chislo">${s.broy}</span>
          </div>`,
        )
        .join('')}
    </div>`;
}

function sektsiyaKrediti(o: Ogledalo, dnes: string, skriti: boolean): string {
  const krediti = [...o.lichniKrediti.values()];
  const dvizheniya = [...o.lichniDvizheniya.values()];
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  return `
    <div class="dyalglava"><h3>Кредити</h3><span>остатъкът се СМЯТА, не се пази</span></div>
    ${
      krediti.length === 0
        ? '<p class="drebno">Няма вписан кредит. Кредитът е <b>трето</b> нещо до прихода и разхода — той има салдо, а те нямат.</p>'
        : `<div class="tablitsa" data-tablitsa="lichni-krediti">
            <div class="glava kredit">
              <span>Кредит</span><span>Вид</span><span>Лихва</span><span>Вноска</span><span>Остава</span><span></span>
            </div>
            ${krediti
              .map((k) => redNaKredita(k, dvizheniya, chislo))
              .join('')}
          </div>
          <p class="drebno">Вноската се записва с <b>три числа</b> — главница, лихва и такса, — които
          събират точно вноската. <b>Главницата не е разход</b>: тя мести пари от джоба в дълга, а
          богатството пада само с лихвата.</p>`
    }
    ${formaKredit(o, dnes)}`;
}

function redNaKredita(
  k: LichenKredit,
  dvizheniya: readonly LichnoDvizhenie[],
  chislo: (st: number) => string,
): string {
  const ostava = ostatakNaKredita(k, dvizheniya);
  const pogasen = pogasenLiE(k, dvizheniya);
  const p = predlozhiVnoska(Math.max(ostava, 0), k.lihva_bp, k.vnoska_st);
  return `<div class="red kredit${pogasen ? ' mahnata' : ''}" translate="no">
    <span class="kletka"><b>${ekraniraj(k.ime)}</b></span>
    <span>${ekraniraj(IMENA_NA_VIDOVETE_KREDIT[k.vid])}</span>
    <span class="chislo">${lihvaSDumi(k.lihva_bp)}</span>
    <span class="chislo">${chislo(k.vnoska_st)}</span>
    <span class="chislo">${pogasen ? '<span class="znachka dobre">погасен</span>' : chislo(ostava)}</span>
    <span>${
      pogasen
        ? ''
        : `<button type="button" class="vtorichen malak" data-vnoska="${ekraniraj(k.kreditId)}"
             data-lihva="${p.lihva_st}" data-glavnitsa="${p.glavnitsa_st}">Запиши вноска</button>`
    }</span>
  </div>`;
}

function formaKredit(o: Ogledalo, dnes: string): string {
  const temi = predlaganiTemi(o.lichniTemi.values());
  return `
    <details class="karta" data-forma="${PREDSTAVKA_PARI}kredit">
      <summary>Впиши кредит</summary>
      <p class="drebno">Впиши <b>остатъка към днес</b>, не главницата от договора — кредитът се
      вписва по средата на живота си. Лихвата е <b>годишна, в цели базисни пунктове</b>:
      3,45 % се пише <b>345</b>. Вноската се <b>въвежда от договора</b>, не се изчислява.</p>
      <div class="poleta">
        <label class="pole"><span>Име</span>
          <input translate="no" type="text" id="${PREDSTAVKA_PARI}k-ime" placeholder="Ипотека · Пощенска"></label>
        <label class="pole"><span>Вид</span>
          <select translate="no" id="${PREDSTAVKA_PARI}k-vid">
            ${VIDOVE_KREDIT.map((v) => `<option value="${v}">${ekraniraj(IMENA_NA_VIDOVETE_KREDIT[v])}</option>`).join('')}
          </select></label>
        <label class="pole"><span>Остатък днес</span>
          <input translate="no" type="text" inputmode="decimal" id="${PREDSTAVKA_PARI}k-ostatak" placeholder="87 400,00"></label>
        <label class="pole"><span>Към дата</span>
          <input translate="no" type="date" id="${PREDSTAVKA_PARI}k-ot" value="${ekraniraj(dnes)}"></label>
        <label class="pole"><span>Лихва (б.п.)</span>
          <input translate="no" type="number" min="0" max="10000" step="1" id="${PREDSTAVKA_PARI}k-lihva" placeholder="345"></label>
        <label class="pole"><span>Вноска</span>
          <input translate="no" type="text" inputmode="decimal" id="${PREDSTAVKA_PARI}k-vnoska" placeholder="612,34"></label>
        <label class="pole"><span>Ден от месеца</span>
          <input translate="no" type="number" min="1" max="31" step="1" id="${PREDSTAVKA_PARI}k-den" value="5"></label>
        <label class="pole"><span>Тема на лихвата</span>
          ${menyuNaTemite(`id="${PREDSTAVKA_PARI}k-tema"`, temi)}</label>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="${PREDSTAVKA_PARI}k-zapishi">Впиши кредита</button>
      </div>
    </details>`;
}

function sektsiyaVnos(o: Ogledalo, skriti: boolean): string {
  return `
    <div class="dyalglava"><h3>Извлечение от карта</h3><span>прочита се, показва се, ти решаваш</span></div>
    <p class="drebno">Файлът се <b>чете</b>, не се качва никъде — от него остава само отпечатък в
    Журнала. Редовете се показват като <b>план</b> и влизат чак когато натиснеш.</p>
    <div class="deystviya">
      <button type="button" class="glaven" id="${PREDSTAVKA_PARI}izberi">Прочети извлечение</button>
      <input translate="no" type="file" id="${PREDSTAVKA_PARI}fayl" multiple hidden>
      ${planat ? `<button type="button" class="vtorichen" id="${PREDSTAVKA_PARI}otkazhi">Откажи плана</button>` : ''}
    </div>
    ${planat ? planatNaEkrana(planat, o, skriti) : ''}
    ${razpiskite(o, skriti)}`;
}

function planatNaEkrana(p: PlanZaVnos, o: Ogledalo, skriti: boolean): string {
  const s = sverkaNaVnos(p);
  const temi = predlaganiTemi(o.lichniTemi.values());
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  const pishat = zaPisane(p);
  return `
    <div class="plochki">
      <div class="plochka"><span class="etiket">Обхват</span>
        <span class="chislo" translate="no">${ekraniraj(p.ot)} … ${ekraniraj(p.do)}</span>
        <span class="pod">гледа се САМО тук</span></div>
      <div class="plochka"><span class="etiket">Нови</span>
        <span class="chislo" translate="no">${s.nov}</span>
        <span class="pod">${s.bezPromyana} вече ги има</span></div>
      <div class="plochka${p.povtoreni.length ? ' trevoga' : ''}"><span class="etiket">Дошли два пъти</span>
        <span class="chislo" translate="no">${p.povtoreni.length}</span>
        <span class="pod">броят се веднъж</span></div>
      <div class="plochka${s.podozreni ? ' trevoga' : ''}"><span class="etiket">Подозрителни</span>
        <span class="chislo" translate="no">${s.podozreni}</span>
        <span class="pod">${s.podozreni ? 'виж долу · ти решаваш' : 'нищо не мирише на дубъл'}</span></div>
      <div class="plochka${p.propusnati.length ? ' trevoga' : ''}"><span class="etiket">Непрочетени</span>
        <span class="chislo" translate="no">${p.propusnati.length}</span>
        <span class="pod">${p.propusnati.length ? 'виж долу' : 'нищо не е пропуснато'}</span></div>
    </div>
    ${
      s.lipsva > 0
        ? `<p class="drebno"><b>${s.lipsva}</b> ${s.lipsva === 1 ? 'ред е' : 'реда са'} в Журнала, но
           ${s.lipsva === 1 ? 'липсва' : 'липсват'} в този файл, макар да ${s.lipsva === 1 ? 'е' : 'са'}
           в обхвата му. <b>Нищо не се гаси</b> — показва се, за да го погледнеш.</p>`
        : ''
    }
    <div class="tablitsa" data-tablitsa="lichni-plan">
      <div class="glava plan">
        <span>Какво</span><span>Дата</span><span>Търговец</span><span>Сума</span><span>Тема</span>
      </div>
      ${p.redove
        .map((r) => {
          const d = r.nov;
          const izbrana = temiNaPlana.get(r.klyuch) ?? r.temaId;
          return `<div class="red plan${r.kakvo === 'lipsva' ? ' mahnata' : ''}" translate="no">
            <span>${
              r.kakvo === 'nov'
                ? '<span class="znachka dobre">нов</span>'
                : r.kakvo === 'promenen'
                  ? '<span class="znachka">променен</span>'
                  : r.kakvo === 'lipsva'
                    ? '<span class="znachka tiha">липсва във файла</span>'
                    : '<span class="znachka tiha">вече го има</span>'
            }${r.podozrenie ? `<span class="znachka trevoga" title="${ekraniraj(r.podozrenie)}">?</span>` : ''}</span>
            <span>${ekraniraj(d?.data ?? r.star?.data ?? '')}</span>
            <span class="kletka">${ekraniraj(d?.koy ?? r.star?.koy ?? '')}</span>
            <span class="chislo">${
              (d?.posoka ?? r.star?.posoka) === 'prihod' ? '+' : '−'
            }${chislo(d?.suma_st ?? r.star?.suma_st ?? 0)}</span>
            <span>${
              r.kakvo === 'nov' || r.kakvo === 'promenen'
                ? `${menyuNaTemite(`data-tema-za="${ekraniraj(r.klyuch)}"`, temi, izbrana)}${r.otKade === 'от паметта' ? '<span class="drebno"> ← от паметта</span>' : ''}`
                : ekraniraj(o.lichniTemi.get(r.temaId)?.ime ?? '—')
            }</span>
          </div>`;
        })
        .join('')}
    </div>
    ${
      p.propusnati.length
        ? `<p class="drebno"><b>Непрочетени редове:</b> ${p.propusnati
            .map((x) => `ред ${x.red} — ${ekraniraj(x.zashto)}`)
            .join(' · ')}</p>`
        : ''
    }
    <p class="drebno">Вход <b>${chislo(s.vhod_st)}</b> · ще влезе <b>${chislo(s.izhod_st)}</b> ·
    разлика <b>${chislo(s.razlika_st)}</b>. Разликата е точно онова, което вече стои в Журнала —
    затова се смята, а не се очаква нула.</p>
    <div class="deystviya">
      <button type="button" class="glaven" id="${PREDSTAVKA_PARI}pusni"${pishat.length === 0 ? ' disabled' : ''}>
        Запиши ${pishat.length} ${pishat.length === 1 ? 'ред' : 'реда'}
      </button>
    </div>`;
}

function razpiskite(o: Ogledalo, skriti: boolean): string {
  const partidi = [...o.lichniPartidi.values()];
  if (partidi.length === 0) return '';
  const chislo = (st: number) => (skriti ? '•••' : ekraniraj(pishi(st)));
  return `
    <div class="dyalglava"><h3>Минали партиди</h3><span>сверката се записва и когато е нула</span></div>
    <div class="tablitsa" data-tablitsa="lichni-partidi">
      <div class="glava partida">
        <span>Обхват</span><span>Редове</span><span>Нови</span><span>Приход</span><span>Разход</span><span>Разлика</span>
      </div>
      ${partidi
        .map(
          (x) => `<div class="red partida" translate="no">
            <span class="kletka">${ekraniraj(x.ot)} … ${ekraniraj(x.do)}</span>
            <span class="chislo">${x.redove}</span>
            <span class="chislo">${x.nov}</span>
            <span class="chislo">${chislo(x.prihod_st)}</span>
            <span class="chislo">${chislo(x.razhod_st)}</span>
            <span class="chislo">${chislo(x.razlika_st)}</span>
          </div>`,
        )
        .join('')}
    </div>`;
}

// ── закачането ─────────────────────────────────────────────────────────────

export function zakachiLichniPari(
  koren: HTMLElement,
  lichen: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  const id = (ime: string) => `#${PREDSTAVKA_PARI}${ime}`;
  // ЗАКОНЪТ ЗА МЕНЮТАТА · тук речникът е ЛИЧНИЯТ и не се смесва със служебния.
  zakachiMenyuta(koren, rechnitsite(RECHNIK_LICHEN));

  koren.querySelector<HTMLButtonElement>(id('pokazhi'))?.addEventListener('click', async () => {
    zapomniEkranno(KLYUCH_SKRITI, !skritiLiSa());
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>(id('izberi'))?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>(id('fayl'))?.click();
  });

  koren.querySelector<HTMLButtonElement>(id('otkazhi'))?.addEventListener('click', async () => {
    zabraviPlana();
    await prerisuvay();
  });

  koren.querySelector<HTMLInputElement>(id('fayl'))?.addEventListener('change', async (e) => {
    const vhod = e.target as HTMLInputElement;
    const faylove = [...(vhod.files ?? [])];
    if (faylove.length === 0) return;
    try {
      const slyata = (await prochetiIzvlecheniyata(faylove)).slyata;
      planat = sravniLichno(await lichen.deystviya.ogledalo(), slyata);
      temiNaPlana.clear();
      greshka = '';
    } catch (err) {
      planat = null;
      greshka = dumiZaGreshka(err);
    }
    vhod.value = '';
    await prerisuvay();
  });

  for (const s of koren.querySelectorAll<HTMLSelectElement>('[data-tema-za]')) {
    s.addEventListener('change', () => {
      temiNaPlana.set(s.dataset['temaZa']!, s.value);
    });
  }

  koren.querySelector<HTMLButtonElement>(id('pusni'))?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    if (!planat) return;
    buton.disabled = true;
    try {
      await zapishiPlana(lichen, planat);
      lichen.vest('dobre', 'Редовете влязоха в личния Журнал, а сверката е записана — и нулевата.');
      zabraviPlana();
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  // ── темите ───────────────────────────────────────────────────────────────
  koren.querySelector<HTMLButtonElement>(id('t-zapishi'))?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    await opitaj(prerisuvay, async () => {
      await lichen.deystviya.zapishiLichnaTema(
        {
          temaId: crypto.randomUUID(),
          ime: koren.querySelector<HTMLInputElement>(id('t-ime'))?.value ?? '',
          grupa: koren.querySelector<HTMLInputElement>(id('t-grupa'))?.value ?? '',
          spryana: false,
        },
        { opId: crypto.randomUUID() },
      );
    });
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-spri-tema], [data-vurni-tema]')) {
    b.addEventListener('click', async () => {
      const spri = b.dataset['spriTema'] !== undefined;
      const temaId = (spri ? b.dataset['spriTema'] : b.dataset['vurniTema'])!;
      b.disabled = true;
      await opitaj(prerisuvay, async () => {
        const t = (await lichen.deystviya.ogledalo()).lichniTemi.get(temaId);
        if (!t) return;
        await lichen.deystviya.zapishiLichnaTema(
          { temaId, ime: t.ime, grupa: t.grupa, spryana: spri },
          { opId: crypto.randomUUID() },
        );
      });
    });
  }

  // ── ръчният ред ──────────────────────────────────────────────────────────
  koren.querySelector<HTMLButtonElement>(id('r-zapishi'))?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    const vzemi = (ime: string) =>
      koren.querySelector<HTMLInputElement | HTMLSelectElement>(id(ime))?.value ?? '';
    buton.disabled = true;
    await opitaj(prerisuvay, async () => {
      await lichen.deystviya.zapishiLichnoDvizhenie(
        {
          dvizhenieId: crypto.randomUUID(),
          data: vzemi('r-data'),
          posoka: vzemi('r-posoka') === 'prihod' ? 'prihod' : 'razhod',
          suma_st: paraOtPole(vzemi('r-suma')),
          temaId: vzemi('r-tema'),
          koy: vzemi('r-koy'),
          opis: '',
          dokument: '',
          // ПРАЗЕН КЛЮЧ · това е границата ръчно↔извлечение и тя се тегли тук.
          klyuch: '',
          izvor: '',
        },
        { opId: crypto.randomUUID() },
      );
    });
  });

  // ── поправките по един ред ───────────────────────────────────────────────
  for (const s of koren.querySelectorAll<HTMLSelectElement>('[data-smeni-tema]')) {
    s.addEventListener('change', async () => {
      const dvizhenieId = s.dataset['smeniTema']!;
      await opitaj(prerisuvay, async () => {
        const d = (await lichen.deystviya.ogledalo()).lichniDvizheniya.get(dvizhenieId);
        if (!d) return;
        // Поправката е ПАК същото действие върху същия номер — не втори ред.
        await lichen.deystviya.zapishiLichnoDvizhenie(
          {
            dvizhenieId,
            data: d.data,
            posoka: d.posoka,
            suma_st: d.suma_st,
            temaId: s.value,
            koy: d.koy,
            opis: d.opis,
            dokument: d.dokument,
            klyuch: d.klyuch,
            izvor: d.izvor,
            ...(d.kreditId
              ? {
                  kreditId: d.kreditId,
                  glavnitsa_st: d.glavnitsa_st,
                  lihva_st: d.lihva_st,
                  taksa_st: d.taksa_st,
                }
              : {}),
          },
          { opId: crypto.randomUUID() },
        );
      });
    });
  }

  koren
    .querySelector<HTMLInputElement>(id('prichina'))
    ?.addEventListener('input', (e) => {
      prichinaZaIzklyuchvane = (e.target as HTMLInputElement).value;
    });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-izklyuchi], [data-vurni]')) {
    b.addEventListener('click', async () => {
      const izklyuchvame = b.dataset['izklyuchi'] !== undefined;
      const dvizhenieId = (izklyuchvame ? b.dataset['izklyuchi'] : b.dataset['vurni'])!;
      // ПОЛЕ НА ЕКРАНА, не `prompt`. Изскачащият прозорец не се стилизира, в
      // част от средите изобщо не се показва, и не оставя написаното пред
      // очите на човека, докато натиска.
      const prichina = izklyuchvame ? prichinaZaIzklyuchvane : 'върнат в сборовете';
      b.disabled = true;
      await opitaj(prerisuvay, async () => {
        await lichen.deystviya.izklyuchiLichenRed(
          { dvizhenieId, izklyuchen: izklyuchvame, prichina },
          { opId: crypto.randomUUID() },
        );
        prichinaZaIzklyuchvane = '';
      });
    });
  }

  koren.querySelector<HTMLButtonElement>(id('k-zapishi'))?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    const vzemi = (ime: string) => koren.querySelector<HTMLInputElement>(id(ime))?.value ?? '';
    buton.disabled = true;
    try {
      await lichen.deystviya.zapishiLichenKredit(
        {
          kreditId: crypto.randomUUID(),
          ime: vzemi('k-ime'),
          vid: (koren.querySelector<HTMLSelectElement>(id('k-vid'))?.value ?? 'ipoteka') as VidKredit,
          ostatak_st: paraOtPole(vzemi('k-ostatak')),
          ot: vzemi('k-ot'),
          lihva_bp: Number(vzemi('k-lihva')),
          vnoska_st: paraOtPole(vzemi('k-vnoska')),
          den: Number(vzemi('k-den')),
          temaId: koren.querySelector<HTMLSelectElement>(id('k-tema'))?.value ?? '',
        },
        { opId: crypto.randomUUID() },
      );
      greshka = '';
      lichen.vest('dobre', 'Кредитът е вписан. Остатъкът оттук нататък се СМЯТА от вноските.');
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-vnoska]')) {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        const kreditId = b.dataset['vnoska']!;
        const lihva_st = Number(b.dataset['lihva']);
        const glavnitsa_st = Number(b.dataset['glavnitsa']);
        const o = await lichen.deystviya.ogledalo();
        const k = o.lichniKrediti.get(kreditId);
        if (!k) return;
        await lichen.deystviya.zapishiLichnoDvizhenie(
          {
            dvizhenieId: crypto.randomUUID(),
            data: new Date().toISOString().slice(0, 10),
            posoka: 'razhod',
            suma_st: lihva_st + glavnitsa_st,
            temaId: k.temaId,
            koy: k.ime,
            opis: 'вноска по кредит',
            dokument: '',
            klyuch: '',
            izvor: '',
            kreditId,
            glavnitsa_st,
            lihva_st,
            taksa_st: 0,
          },
          { opId: crypto.randomUUID() },
        );
        greshka = '';
        lichen.vest(
          'dobre',
          `Вноската е записана · от ${pishi(lihva_st + glavnitsa_st)} разход е само ${pishi(lihva_st)} — ` +
            'останалото е главница и мести пари, не ги харчи.',
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }
}

/**
 * ПАРТИДАТА · N реда и ЕДНА разписка, с ПРЕЧИТАНЕ накрая.
 *
 * Броенето проверява ИСКАНЕТО; пречитането проверява РЕЗУЛТАТА (образецът е
 * `prenos.ts`). Разписката се пише и когато разликата е нула — „няма разлика"
 * иначе е неразличимо от „не е сверявано" (правило 7).
 */
async function zapishiPlana(lichen: Konteks, p: PlanZaVnos): Promise<void> {
  const partidaId = crypto.randomUUID();
  const pishat = zaPisane(p);
  const s = sverkaNaVnos(p);
  const izvor = p.izvori.join('|');

  for (const [i, r] of pishat.entries()) {
    const d = r.nov!;
    await lichen.deystviya.zapishiLichnoDvizhenie(
      {
        dvizhenieId: r.star?.dvizhenieId ?? `${partidaId}:${i}`,
        data: d.data,
        posoka: d.posoka,
        suma_st: d.suma_st,
        temaId: temiNaPlana.get(r.klyuch) ?? r.temaId,
        koy: d.koy,
        opis: '',
        dokument: d.dokument,
        klyuch: d.klyuch,
        izvor,
      },
      // opId носи ДЕЙСТВИЕТО, не съдържанието: изведен от партидата, той
      // довършва прекъснат внос, вместо да върне стария резултат (правило 20).
      { opId: `${partidaId}:red:${i}` },
    );
  }

  // ПРЕЧИТАНЕ · Огледалото се чете НАНОВО и се брои какво наистина влезе.
  const sled = await lichen.deystviya.ogledalo();
  let vlezli = 0;
  for (const r of pishat) {
    const nameren = [...sled.lichniDvizheniya.values()].find((d) => d.klyuch === r.nov!.klyuch);
    if (nameren) vlezli += 1;
  }

  const saldo = saldoNaFayla(p.redove.filter((r) => r.nov).map((r) => r.nov!));
  const ochakvano = p.vhodPrihod_st - p.vhodRazhod_st;

  await lichen.deystviya.zapishiLichnaPartida(
    {
      partidaId,
      izvori: p.izvori,
      ot: p.ot,
      do: p.do,
      redove: p.redove.length,
      nov: vlezli,
      povtoreni: p.povtoreni.length,
      podozreni: s.podozreni,
      bezPromyana: s.bezPromyana,
      propusnati: p.propusnati.length,
      vhod_st: s.vhod_st,
      izhod_st: s.izhod_st,
      razlika_st: s.razlika_st,
      prihod_st: s.prihod_st,
      razhod_st: s.razhod_st,
      saldoKazano_st: saldo ?? 0,
      saldoOchakvano_st: ochakvano,
      saldoRazlika_st: saldo === null ? 0 : saldo - ochakvano,
    },
    { opId: `${partidaId}:razpiska` },
  );
}

async function tablitsiOtFayl(danni: Uint8Array, ime: string) {
  if (ime.toLowerCase().endsWith('.xlsx')) return (await otXLSX(danni, ime)).map(bezPrazni);
  return [bezPrazni(otCSV(tekstOtBaytove(danni), ime))];
}

/**
 * ЕДИН ДОМ ЗА ОТКАЗА · всяко действие тук минава оттук.
 *
 * Осем бутона с по свой `try/catch` се разминават при първата поправка: един
 * забравя да изчисти старата грешка, друг забравя да прерисува, трети показва
 * суровото `Error` вместо думите. Тук трите неща стават на едно място.
 */
async function opitaj(prerisuvay: () => Promise<void>, deystvie: () => Promise<void>): Promise<void> {
  try {
    await deystvie();
    greshka = '';
  } catch (err) {
    greshka = dumiZaGreshka(err);
  }
  await prerisuvay();
}

/**
 * Чете сума от поле · през ЕДИНСТВЕНИЯ четец (`otSuma`), не през свой.
 *
 * Празното връща нула нарочно: тогава действието отказва с „повече от нула" —
 * ЕДИН текст за две сгрешавания вместо два различни (правило 17). А самоделен
 * четец тук би бил ТРЕТИ дом на въпроса „кое е сума"; вторият вече е скъп.
 */
function paraOtPole(tekst: string): number {
  if (tekst.trim() === '') return 0;
  return otSuma(tekst);
}

/** Лихвата, изписана за човек · 345 б.п. → „3,45 %". */
function lihvaSDumi(lihva_bp: number): string {
  return `${(lihva_bp / 100).toFixed(2).replace('.', ',')} %`;
}