/**
 * ТАБЛОТО НА ИИ · осмият екран (И92 т.10).
 *
 * Негова поръчка, дословно: „Правиш табло. Там да има ИИ активиран и
 * свързване. С питане за потвърждение. Описани рисковете… за работа име и
 * достъп на агента. Виж практиката. Да има поле със закони. Неговата работа и
 * длъжностна характеристика. И едно поле за даване на текущи задачи и списък
 * с журнал за този таб."
 *
 * ЕЗИКЪТ НА ЕКРАНА Е НАРОЧЕН. Никъде не пише „одобри и той ще запише" — навсякъде
 * „приеми и АЗ записвам". Интерфейс, в който одобрението изглежда като чуждо
 * записване, размива правило 18 тихо; думите го държат на място.
 *
 * ТРОЙНИЯТ КОНТРОЛ СЕ ПОКАЗВА, НЕ СЕ СТРОИ. Право (планът) · отметка (Таблото)
 * · кран (`vrata.zatvori`) вече съществуват; тук стоят един до друг и всеки се
 * вижда поотделно — слеят ли се, скритият бутон почва да прилича на нещо,
 * което се плаща (правило 15).
 */

import {
  broeviNaKartata,
  BROY_UMENIYA,
  dobaviUmenie,
  harakteristika,
  kartaNaDostapa,
  IMENA_NA_OBHVATITE,
  IMENA_NA_PRISADITE,
  IMENA_NA_SASTOYANIYATA,
  kakvoLipsva,
  mozheDaRaboti,
  napraviAgent,
  OBHVATI,
  pokazateli,
  premahniUmenie,
  prevklyuchiUmenie,
  proveriTriUmeniya,
  razlikaNaSverkata,
  sglobiProtokol,
  sverkataZatvarya,
  vklyuchenite,
  zakriy,
  NEPROMENIMI,
  ZAKONITE,
  type Agent,
  type Obhvat,
  type Predlozhenie,
  type TroyniyatKontrol,
} from '../src/domein/agenti.js';
import {
  IMENA_NA_RAZPISANIYATA,
  RAZPISANIYA,
  ePostoyanna,
  napraviZadacha,
  pokazateliNaZadachite,
  potvardiZadacha,
  prevklyuchiZadacha,
  sDumiRazpisanie,
  sePadaDnes,
  type Razpisanie,
  type Zadacha,
} from '../src/domein/zadachi.js';
import {
  IMENA_ZA_KAKVO,
  ZHIVOT_V_MINUTI,
  napraviKod,
  pismoto,
  poiskay,
  proveri,
  type Iskane,
  type ZaKakvo,
} from '../src/domein/potvarzhdenie.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { dnesKato, dumiZaGreshka, ekraniraj } from './obshto.js';
import { pishi } from '../src/yadro/pari.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { klyuchNaPravo, pravoNaKolona, vidNaKolona } from '../src/domein/kolonno.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './main.js';

/** Кой агент е отворен · помни се като поглед, не като факт (ADR-022). */
let izbranAgent = chetiEkranno('ii.agent', '');
/** Отворена ли е формата за нов агент. */
let dobavyam = false;
/** Отворен ли е екранът за съгласие — питането преди включване. */
let pitamZaSaglasie = false;
let greshka = '';

/**
 * ЧАКАЩОТО ИСКАНЕ за потвърждение · живее САМО в паметта на екрана.
 *
 * Не в Журнала (тайна там е тайна, изгубена завинаги) и не в хранилището
 * (презареждане на страницата трябва да го прекъсва — така изтеклото
 * потвърждение не оживява утре).
 */
let iskane: Iskane | undefined;

/**
 * Готовата чернова на писмото (`mailto:`) · прави се заедно с искането.
 *
 * ВРЪЗКА, не програмна навигация. Три причини, и третата е най-важната:
 * браузърите все по-често спират сама навигация към чужд протокол; човекът
 * вижда КЪДЕ отива, преди да натисне; и проходът минава по същия път като
 * него, без нито един подставен обект.
 */
let pismotoAdres = '';

/**
 * Какво да стане, ако кодът съвпадне. Действието се държи ТУК, а не се
 * повтаря при потвърждаването: така има един-единствен път към записа и
 * няма как да се пусне, без да мине през кода.
 */
let sledPotvarzhdenie: (() => Promise<void>) | undefined;

/** Ключът на агента се прави от името — един агент, един ред. */
function klyuchOtIme(ime: string): string {
  return ime.trim().replace(/\s+/g, ' ');
}

export function narisuvayII(o: Ogledalo, kontrol: TroyniyatKontrol, dnes: string): string {
  const agenti = [...o.agenti.values()];
  const izbran = agenti.find((a) => a.klyuch === izbranAgent) ?? agenti[0];
  const predlozheniya = [...o.predlozheniya.values()].filter(
    (p) => !izbran || p.agent === izbran.klyuch,
  );

  const zadachi = [...o.zadachi.values()].filter((z) => !izbran || z.agent === izbran.klyuch);

  return (
    kartaKontrol(kontrol, izbran) +
    (greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : '') +
    kartaPotvarzhdenie() +
    kartaAgentite(agenti, izbran) +
    (dobavyam ? formaNaAgent() : '') +
    (izbran ? kartaProtokol(izbran, kontrol, dnes) : '') +
    (izbran ? kartaNaDostapaBlok(o, izbran) : '') +
    (izbran ? kartaUmeniya(izbran) : '') +
    (izbran && pitamZaSaglasie ? kartaSaglasie(izbran) : '') +
    kartaZakonite() +
    (izbran ? kartaZadachi(izbran, zadachi, dnes) : '') +
    (izbran ? kartaKlod(izbran) : '') +
    (izbran ? kartaRachnoPredlozhenie(izbran) : '') +
    kartaZhurnal(predlozheniya)
  );
}

/**
 * ПОТВЪРЖДЕНИЕТО С ИМЕЙЛ · честна спирачка, показана честно (И94 т.1).
 *
 * Екранът КАЗВА какво доказва кодът и какво не доказва. Интерфейс, който
 * представя спирачката за ключалка, е по-опасен от липсваща спирачка:
 * човек почва да разчита на нея там, където тя не държи.
 */
function kartaPotvarzhdenie(): string {
  if (!iskane) return '';
  return `
    <section class="karta izbrana" id="potvarzhdenieto">
      <div class="dyalglava">
        <h2>Потвърждение с имейл</h2>
        <span>${IMENA_ZA_KAKVO[iskane.zaKakvo]} · „${ekraniraj(iskane.kakvo)}"</span>
      </div>
      <p>Отвори писмото до <b translate="no">${ekraniraj(iskane.doImeyl)}</b>, изпрати го и препиши
      кода оттам. <b>Кодът НЕ е изписан на този екран</b> — той пътува само в писмото.
      Живее ${ZHIVOT_V_MINUTI} минути.</p>
      <p><a class="glaven kato-buton" id="otvori-pismoto" href="${ekraniraj(pismotoAdres)}">Отвори писмото</a></p>
      <div class="poleta tesni">
        <div class="pole">
          <label for="kod">Кодът от писмото</label>
          <input translate="no" id="kod" inputmode="numeric" autocomplete="one-time-code"
            placeholder="шест цифри" maxlength="9">
        </div>
      </div>
      <p class="greshka" id="greshka-kod"></p>
      <div class="deystviya">
        <button type="button" class="glaven" id="potvardi-koda">Потвърди</button>
        <button type="button" class="vtorichen" id="otkazhi-koda">Откажи</button>
        <p class="drebno">Това е ЧЕСТНА СПИРАЧКА, не ключалка. Доказва достъп до пощата и лови
        НЕВОЛНАТА грешка — чужд агент, пуснат по невнимание; задача, потвърдена, без да се погледне.
        Онзи, който държи отключеното устройство, стига и до черновата на писмото: тук спирачката
        не държи и не се прави, че държи. Нарочна измама иска сървър.</p>
      </div>
    </section>`;
}

/** ТРОЙНИЯТ КОНТРОЛ · три плочки, не една — правило 15. */
function kartaKontrol(k: TroyniyatKontrol, izbran: Agent | undefined): string {
  const raboti = izbran ? mozheDaRaboti(izbran, k) : false;
  const lipsva = izbran ? kakvoLipsva(izbran, k) : ['още няма нито един агент'];
  return `
    <div class="plochki">
      <div class="plochka${k.pravo ? '' : ' trevoga'}">
        <span class="etiket">Право · планът</span>
        <span class="chislo malak">${k.pravo ? 'дава' : 'не дава'}</span>
        <span class="pod">възможността „свързване на ИИ"</span>
      </div>
      <div class="plochka${k.otmetka ? '' : ' trevoga'}">
        <span class="etiket">Отметка · Таблото</span>
        <span class="chislo malak">${k.otmetka ? 'включена' : 'изключена'}</span>
        <span class="pod">изключено ≠ липсващо</span>
      </div>
      <div class="plochka${k.kran ? '' : ' trevoga'}">
        <span class="etiket">Кран · Вратата</span>
        <span class="chislo malak">${k.kran ? 'отворен' : 'ДРЪПНАТ'}</span>
        <span class="pod">спира записа веднага, без да пипа Журнала</span>
      </div>
      <div class="plochka${raboti ? '' : ' trevoga'}">
        <span class="etiket">Агентът</span>
        <span class="chislo malak">${raboti ? 'работи' : 'не работи'}</span>
        <span class="pod">${ekraniraj(lipsva.join(' · ') || 'и трите са налице')}</span>
      </div>
    </div>`;
}

function kartaAgentite(agenti: readonly Agent[], izbran: Agent | undefined): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Агентите</h2>
        <span>един агент, един ред · всеки с ЧОВЕК-отговорник</span>
      </div>
      ${
        agenti.length === 0
          ? '<p class="prazno">Още няма нито един агент.<br>Агентът чете, смята и ПРЕДЛАГА — записва човекът, и следата остава на негово име.</p>'
          : `<div class="tablitsa">
        <div class="glava agent"><span>Име</span><span>Отговорник</span><span>Състояние</span><span>Обхват</span><span></span></div>
        ${agenti
          .map(
            (a) => `<div class="red agent${a.klyuch === izbran?.klyuch ? ' izbrana' : ''}" translate="no">
          <span class="kletka"><b>${ekraniraj(a.ime)}</b><span>${(() => {
            const h = harakteristika(a)?.tekst ?? '';
            return `${ekraniraj(h.slice(0, 60))}${h.length > 60 ? '…' : ''}`;
          })()}</span></span>
          <span>${ekraniraj(a.otgovornik)}</span>
          <span><span class="znachka ${a.sastoyanie === 'vklyuchen' ? 'dobre' : 'tiha'}">${IMENA_NA_SASTOYANIYATA[a.sastoyanie]}</span></span>
          <span>${ekraniraj(a.obhvat.map((x) => IMENA_NA_OBHVATITE[x]).join(' · ') || '—')}</span>
          <span class="butoni"><button type="button" class="vtorichen malak" data-izbran-agent="${ekraniraj(a.klyuch)}">Отвори</button></span>
        </div>`,
          )
          .join('')}
      </div>`
      }
      <div class="deystviya">
        <button type="button" class="glaven" id="nov-agent"${dobavyam ? ' disabled' : ''}>Нов агент</button>
        <p class="drebno">Агентът НЯМА път към Вратата. Обхватът му е списък екрани, които ЧЕТЕ — ред „пише" не съществува.</p>
      </div>
    </section>`;
}

function formaNaAgent(): string {
  return `
    <section class="karta izbrana">
      <div class="dyalglava"><h2>Нов агент</h2><span>карта · длъжностна характеристика · забрани · три умения</span></div>
      <form id="forma-agent">
        <div class="poleta">
          <div class="pole">
            <label for="agent-ime">Име на агента</label>
            <input translate="no" id="agent-ime" name="ime" required placeholder="напр. Счетоводителят" autocomplete="off">
          </div>
          <div class="pole">
            <label for="agent-otgovornik">Отговорник · имейл</label>
            <input translate="no" id="agent-otgovornik" name="otgovornik" required placeholder="неговият имейл става actor" autocomplete="off">
          </div>
        </div>
        <div class="pole">
          <label for="agent-rabota">Характеристика · какво върши <span class="drebno">(умение, активирано постоянно)</span></label>
          <textarea translate="no" id="agent-rabota" name="harakteristika" required rows="3"
            placeholder="Чете Сметки, сверява ДДС по акумулатори и предлага поправки."></textarea>
        </div>
        <div class="pole">
          <label>Обхват · кои екрана ЧЕТЕ</label>
          <div class="vazmozhnosti tesni">
            ${OBHVATI.map(
              (x) =>
                `<label class="vazm"><input type="checkbox" data-obhvat="${x}"> <span class="vazm-tyalo"><b>${IMENA_NA_OBHVATITE[x]}</b></span></label>`,
            ).join('')}
          </div>
        </div>
        <div class="pole">
          <label for="agent-zabrani">Забрани · ИЗБРОЕНИ ПОИМЕННО (правило 18)</label>
          <input translate="no" id="agent-zabrani" name="zabrani" required
            placeholder="не пише в Журнала · не вижда Управление · не праща писма" autocomplete="off">
        </div>
        <p class="greshka" id="greshka-agent"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши агента</button>
          <button type="button" class="vtorichen" id="otkazhi-agent">Откажи</button>
          <p class="drebno">Записва се ИЗКЛЮЧЕН, само с характеристиката. Уменията се добавят после — и се махат,
          включват и изключват поотделно. Включването на самия агент е отделно действие, с питане и описани рискове.</p>
        </div>
      </form>
    </section>`;
}

/** ПРОТОКОЛЪТ · четимият документ, от който се сглобява и промптът. */
function kartaProtokol(a: Agent, k: TroyniyatKontrol, dnes: string): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Протоколът на „${ekraniraj(a.ime)}"</h2>
        <span>единственият дом на длъжностната · промптът се СГЛОБЯВА оттук</span>
      </div>
      <div class="tablitsa">
        <div class="red opis"><span><b>Характеристика</b></span><span>${ekraniraj(harakteristika(a)?.tekst ?? '')} <span class="znachka tiha">умение · постоянно</span></span></div>
        <div class="red opis"><span><b>Обхват · чете</b></span><span>${ekraniraj(a.obhvat.map((x) => IMENA_NA_OBHVATITE[x]).join(' · ') || 'нищо')}</span></div>
        <div class="red opis"><span><b>Забрани</b></span><span>${ekraniraj(a.zabrani.join(' · '))}</span></div>
        <div class="red opis"><span><b>Умения</b></span><span>${
          a.umeniya.length === 1
            ? 'само характеристиката — добави умения отдолу'
            : ekraniraj(
                a.umeniya
                  .filter((u) => !u.postoyanno)
                  .map((u) => `${u.ime}${u.vklyucheno ? '' : ' (изключено)'}`)
                  .join(' · '),
              )
        }</span></div>
        <div class="red opis"><span><b>Отговорник</b></span><span>${ekraniraj(a.otgovornik)} · неговият имейл е <code>actor</code></span></div>
        <div class="red opis"><span><b>Включен от</b></span><span>${ekraniraj(a.ot || '—')}</span></div>
      </div>
      <details class="drebno">
        <summary>Промптът, сглобен от този документ</summary>
        <pre translate="no" id="promptat">${ekraniraj(sglobiProtokol(a))}</pre>
      </details>
      <div class="deystviya">
        ${
          a.sastoyanie === 'zakrit'
            ? '<span class="znachka tiha">ЗАКРИТ · следа, не запис за поправка</span>'
            : a.sastoyanie === 'vklyuchen'
              ? `<button type="button" class="vtorichen" id="spri-agenta">Спри агента</button>`
              : `<button type="button" class="glaven" id="vklyuchi-agenta"${k.pravo && k.otmetka ? '' : ' disabled'}>Включи агента…</button>`
        }
        ${
          a.sastoyanie === 'zakrit'
            ? ''
            : '<button type="button" class="vtorichen" id="zakriy-agenta">Закрий и направи нов…</button>'
        }
        <p class="drebno">${
          k.pravo && k.otmetka
            ? 'Включването пита за потвърждение и показва рисковете, преди да стане.'
            : 'Планът или отметката не позволяват — двете се виждат горе, поотделно.'
        }</p>
      </div>
      <p class="drebno">НЕПРОМЕНИМО след създаване: ${NEPROMENIMI.join(' · ')}.
      Трябва ли промяна — агентът се ЗАКРИВА и се прави нов (И94 т.6). Закритият остава
      като следа: предложенията му сочат него и трябва да си имат автор.</p>
      <p class="drebno" hidden>${ekraniraj(dnes)}</p>
    </section>`;
}

/**
 * КЪДЕ ВИЖДА · КЪДЕ РЕДАКТИРА (И94 т.6).
 *
 * „Се вижда след създаването къде вижда и къде редактира отделният агент."
 * Картата не строи ново право — чете колонното (ADR-011) и вида на колоната,
 * и то ПРЕЗ ИМЕЙЛА НА ОТГОВОРНИКА: агентът не вижда повече от човека, който
 * отговаря за него. Колоната „редактира" е нула и стои като ЧИСЛО — числото,
 * което не мърда, обещава повече от изречение, че няма да мърда.
 */
function kartaNaDostapaBlok(o: Ogledalo, a: Agent): string {
  const modeli = [...o.modeli.values()].map((m) => ({
    klyuch: m.klyuch,
    glavi: m.glavi,
    zatvorena: (kolona: number) => vidNaKolona(m, kolona) === 'zatvorena',
    vizhdaYa: (kolona: number) =>
      pravoNaKolona(o.prava.get(klyuchNaPravo(a.otgovornik, m.klyuch)), kolona) === 'vizhda',
  }));
  const karta = kartaNaDostapa(a, { modeli });
  const broi = broeviNaKartata(karta);

  return `
    <section>
      <div class="dyalglava">
        <h2>Къде вижда · къде редактира</h2>
        <span>чете се през правата на ${ekraniraj(a.otgovornik)} — агентът не вижда повече от отговорника си</span>
      </div>
      <div class="plochki">
        <div class="plochka"><span class="etiket">Колони общо</span><span class="chislo" translate="no">${broi.vsichki}</span><span class="pod">в хедърите от Настройки</span></div>
        <div class="plochka"><span class="etiket">Вижда</span><span class="chislo" translate="no">${broi.vizhda}</span><span class="pod">незакрити за отговорника</span></div>
        <div class="plochka"><span class="etiket">Може да ПРЕДЛОЖИ</span><span class="chislo" translate="no">${broi.predlaga}</span><span class="pod">променящи се · записва човекът</span></div>
        <div class="plochka"><span class="etiket">РЕДАКТИРА</span><span class="chislo" data-redaktira translate="no">${broi.redaktira}</span><span class="pod">нула по устройство (правило 18)</span></div>
      </div>
      ${
        karta.length === 0
          ? '<p class="prazno">Още няма нито един хедър.<br>Картата се пълни, щом в Настройки има модели на таблици.</p>'
          : `<div class="tablitsa" data-tablitsa="karta-dostap">
        <div class="glava opis"><span>Таблица</span><span>Колона</span><span>Вижда</span><span>Защо</span></div>
        ${karta
          .map(
            (r) => `<div class="red opis" translate="no">
          <span>${ekraniraj(r.tablitsa)}</span>
          <span><b>${ekraniraj(r.kolona)}</b></span>
          <span><span class="znachka ${r.vizhda ? 'dobre' : 'tiha'}">${r.vizhda ? 'вижда' : 'скрито'}</span>${
            r.predlaga ? '<span class="znachka tiha">може да предложи</span>' : ''
          }</span>
          <span>${ekraniraj(r.zashto)}</span>
        </div>`,
          )
          .join('')}
      </div>`
      }
      <p class="drebno">Колоната „редактира" я няма и няма да я има: агентът НЯМА път към Вратата.
      Онова, което другаде е „редактира", тук е „може да предложи" — и записва човекът, с неговия имейл.</p>
    </section>`;
}

/**
 * УМЕНИЯТА · негова поръчка (24.08): „Добави и Умения, които могат да се
 * добавят, махат, включват и изключват… нека и Характеристиката е умение,
 * активирано постоянно."
 *
 * Затова тук има ЕДИН списък: характеристиката стои първа и носи знак
 * „постоянно" — без бутони, защото няма какво да ѝ се направи оттук.
 * Останалите се включват, изключват и махат поотделно, и всяко е ново
 * събитие (правило 1), не тиха редакция.
 */
function kartaUmeniya(a: Agent): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Уменията на „${ekraniraj(a.ime)}"</h2>
        <span>характеристиката е умение, активирано ПОСТОЯННО · другите се добавят и махат</span>
      </div>
      <div class="tablitsa" data-tablitsa="umeniya">
        <div class="glava umenie"><span>Умение</span><span>Какво носи</span><span>Състояние</span><span></span></div>
        ${a.umeniya
          .map(
            (u) => `<div class="red umenie" data-umenie="${ekraniraj(u.klyuch)}" translate="no">
          <span class="kletka"><b>${ekraniraj(u.ime)}</b>${u.postoyanno ? '<span>постоянно · не се маха и не се изключва</span>' : ''}</span>
          <span>${ekraniraj(u.tekst || '—')}</span>
          <span><span class="znachka ${u.vklyucheno ? 'dobre' : 'tiha'}">${u.vklyucheno ? 'включено' : 'изключено'}</span></span>
          <span class="butoni">${
            u.postoyanno
              ? '<span class="drebno">—</span>'
              : `<button type="button" class="vtorichen malak" data-prevklyuchi-umenie="${ekraniraj(u.klyuch)}">${
                  u.vklyucheno ? 'Изключи' : 'Включи'
                }</button>
                 <button type="button" class="vtorichen malak" data-premahni-umenie="${ekraniraj(u.klyuch)}">Махни</button>`
          }</span>
        </div>`,
          )
          .join('')}
      </div>
      <form id="forma-umenie">
        <div class="poleta tesni">
          <div class="pole">
            <label for="umenie-ime">Ново умение</label>
            <input translate="no" id="umenie-ime" name="ime" required placeholder="напр. matematika" autocomplete="off">
          </div>
          <div class="pole">
            <label for="umenie-tekst">Какво носи</label>
            <input translate="no" id="umenie-tekst" name="tekst" placeholder="матрици, данни и проверки" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-umenie"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Добави умението</button>
          <p class="drebno">Новото се ражда ВКЛЮЧЕНО — човек го добавя, за да го ползва.
          Изключеното не влиза в промпта и не може да се избере за задача: иначе изключването щеше да е надпис.</p>
        </div>
      </form>
    </section>`;
}

/**
 * СЪГЛАСИЕТО · рисковете С ДУМИ, без „нула риск".
 *
 * Образецът е Claude for Chrome: prompt injection е обявен за нерешен проблем,
 * а „по-ниско" не се представя за „никакво". Отметката НЕ е сложена
 * предварително — нищо не се появява без изричен избор (правило 13 по дух).
 */
function kartaSaglasie(a: Agent): string {
  return `
    <section class="karta izbrana" id="saglasieto">
      <div class="dyalglava">
        <h2>Включване на „${ekraniraj(a.ime)}"</h2>
        <span>какво ще прави · какво НЯМА да прави · и какво може да се обърка</span>
      </div>
      <div class="tablitsa">
        <div class="red opis"><span><b>Ще прави</b></span><span>${ekraniraj(harakteristika(a)?.tekst ?? '')}</span></div>
        <div class="red opis"><span><b>НЯМА да прави</b></span><span>Не пише в Журнала, не изпраща нищо навън, не отнема достъп. Предложението му чака ТВОЯ дума.</span></div>
      </div>
      <div class="tablitsa">
        <div class="glava opis"><span>Рискът</span><span>какво значи</span></div>
        <div class="red opis">
          <span><b>Подхвърлен текст</b></span>
          <span>Агентът чете бележки, описания и имена, писани от хора. Злонамерен текст там може да изкриви какво СМЯТА и какво предлага. Защитата ни е структурна — той няма път към запис — но предложение, прието на доверие, пренася грешката. Затова всяко предложение носи сверка, и тя се гледа.</span>
        </div>
        <div class="red opis">
          <span><b>Умора от съгласия</b></span>
          <span>Ако всичко се потвърждава, човек почва да натиска сляпо. Затова „приеми всички" няма и няма да има — присъдата е ред по ред.</span>
        </div>
        <div class="red opis">
          <span><b>Сгрешена сметка</b></span>
          <span>Агентът греши като всеки, който смята. Числото му не влиза никъде, докато ти не го запишеш — и записът носи ТВОЯ имейл, не неговото име.</span>
        </div>
      </div>
      <label class="vazm">
        <input type="checkbox" id="razbrah">
        <span class="vazm-tyalo"><b>Прочетох рисковете и включвам агента</b><span>отметката не е сложена предварително — изборът е изричен</span></span>
      </label>
      <div class="deystviya">
        <button type="button" class="glaven" id="potvardi-vklyuchvane">Включи</button>
        <button type="button" class="vtorichen" id="otkazhi-vklyuchvane">Откажи</button>
      </div>
    </section>`;
}

/** ПОЛЕТО СЪС ЗАКОНИТЕ · изброени поименно, всеки със своя дом. */
function kartaZakonite(): string {
  return `
    <section>
      <div class="dyalglava">
        <h2>Законите</h2>
        <span>редът на оценка е забрана → питане → позволение · подразбраното е ЗАБРАНА</span>
      </div>
      <div class="tablitsa">
        <div class="glava opis"><span>Законът</span><span>какво значи</span><span>дом</span></div>
        ${ZAKONITE.map(
          (z) => `<div class="red opis" data-zakon="${z.klyuch}">
          <span><b>${ekraniraj(z.klyuch)}</b></span>
          <span>${ekraniraj(z.kakvo)}</span>
          <span>${ekraniraj(z.dom)}</span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Законите не се редактират от екрана: те са правила на къщата, не настройки на агент. Смяна на правило е промяна в CLAUDE.md и в ADR — с обсъждане, не с отметка.</p>
    </section>`;
}

/** Падащото поле с трите умения · един вид на две места (правило 17). */
function poletaZaTriUmeniya(a: Agent, prefiks: string): string {
  return `
    <div class="poleta tesni">
      ${[1, 2, 3]
        .map(
          (nomer) => `<div class="pole">
        <label for="${prefiks}-umenie${nomer}">${nomer === 1 ? `Три умения за ТАЗИ задача (правило 25)` : '&nbsp;'}</label>
        <select translate="no" id="${prefiks}-umenie${nomer}" name="umenie${nomer}">
          <option value="">— избери —</option>
          ${vklyuchenite(a)
            .map((u) => `<option value="${ekraniraj(u.klyuch)}">${ekraniraj(u.ime)}</option>`)
            .join('')}
        </select>
      </div>`,
        )
        .join('')}
    </div>`;
}

/**
 * ЗАДАЧИТЕ · разписанието, уменията и потвърждението (И94 т.1).
 *
 * Негови думи: „Всяка задача се прикачат умения и задачата може да е
 * ВСЕКИДНЕВНА, СДМИЧНА, ЗА ОПРЕДЕЛЕН СРОК. Има и ПОСТОЯННИ задачи с умения
 * като длъжностната характеристика, която не може да се изключи и включи и е
 * НОРМА."
 *
 * Затова постоянната няма бутон „Изключи" — не е скрит, ЛИПСВА. Бутон, който
 * винаги отказва, учи човека да не вярва на бутоните.
 */
function kartaZadachi(a: Agent, zadachi: readonly Zadacha[], dnes: string): string {
  const p = pokazateliNaZadachite(zadachi, dnes);
  const podredeni = [...zadachi].sort((x, y) => y.kogato.localeCompare(x.kogato));
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Задачите на „${ekraniraj(a.ime)}"</h2>
        <span>възлагането е мое действие · нищо не тръгва без потвърждение по имейл</span>
      </div>
      <div class="plochki">
        <div class="plochka"><span class="etiket">Задачи</span><span class="chislo" data-broi-zadachi translate="no">${p.vsichki}</span><span class="pod">всички</span></div>
        <div class="plochka${p.potvardeni === p.vsichki ? '' : ' trevoga'}"><span class="etiket">Потвърдени</span><span class="chislo" translate="no">${p.potvardeni}</span><span class="pod">с код от писмо</span></div>
        <div class="plochka"><span class="etiket">Днес</span><span class="chislo" translate="no">${p.dnes}</span><span class="pod">падат се на ${ekraniraj(dnes)}</span></div>
        <div class="plochka"><span class="etiket">Постоянни</span><span class="chislo" translate="no">${p.postoyanni}</span><span class="pod">норма · не се изключват</span></div>
      </div>
      ${
        podredeni.length === 0
          ? '<p class="prazno">Още няма задачи.<br>Възложи една отдолу — с разписание и три умения.</p>'
          : `<div class="tablitsa" data-tablitsa="zadachi">
        <div class="glava zadacha">
          <span>Задача и умения</span><span>Разписание</span><span>Потвърдена</span><span>Днес</span><span></span>
        </div>
        ${podredeni.map((z) => redNaZadacha(z, dnes)).join('')}
      </div>`
      }
      <form id="forma-nova-zadacha">
        <div class="pole">
          <label for="nova-zadacha-kakvo">Какво да провери или сметне</label>
          <input translate="no" id="nova-zadacha-kakvo" name="kakvo" required
            placeholder="напр. сверѝ ДДС за август по акумулатори" autocomplete="off">
        </div>
        <div class="poleta tesni">
          <div class="pole">
            <label for="nova-zadacha-razpisanie">Разписание</label>
            <select translate="no" id="nova-zadacha-razpisanie" name="razpisanie">
              ${RAZPISANIYA.map(
                (r) => `<option value="${r}">${ekraniraj(IMENA_NA_RAZPISANIYATA[r])}</option>`,
              ).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="nova-zadacha-den">Ден · при седмичната</label>
            <select translate="no" id="nova-zadacha-den" name="den">
              ${['понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота', 'неделя']
                .map((ime, i) => `<option value="${i + 1}">${ime}</option>`)
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="nova-zadacha-ot">От · при срок</label>
            <input translate="no" id="nova-zadacha-ot" name="ot" type="date">
          </div>
          <div class="pole">
            <label for="nova-zadacha-do">До · при срок</label>
            <input translate="no" id="nova-zadacha-do" name="do" type="date">
          </div>
        </div>
        ${poletaZaTriUmeniya(a, 'nova-zadacha')}
        <p class="greshka" id="greshka-nova-zadacha"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Възложи задачата</button>
          <p class="drebno">Задачата се ражда НЕПОТВЪРДЕНА и не се пада на никой ден, докато не мине кодът от писмото.
          ПОСТОЯННАТА е норма — тя се ражда включена и такава остава; маха се със сторно, не с бутон.</p>
        </div>
      </form>
    </section>`;
}

function redNaZadacha(z: Zadacha, dnes: string): string {
  const dnes_li = sePadaDnes(z, dnes);
  return `
    <div class="red zadacha" data-zadacha="${ekraniraj(z.id)}" translate="no">
      <span class="kletka"><b>${ekraniraj(z.kakvo)}</b><span>${ekraniraj(z.umeniya.join(' · '))}</span></span>
      <span>${ekraniraj(sDumiRazpisanie(z))}</span>
      <span><span class="znachka ${z.potvardena ? 'dobre' : 'trevoga'}">${z.potvardena ? 'потвърдена' : 'чака код'}</span></span>
      <span><span class="znachka ${dnes_li ? 'dobre' : 'tiha'}">${dnes_li ? 'да' : 'не'}</span></span>
      <span class="butoni">${
        z.potvardena
          ? `<button type="button" class="vtorichen malak" data-pusni-zadacha="${ekraniraj(z.id)}">Пусни с Клод</button>${
              ePostoyanna(z.razpisanie)
                ? ''
                : `<button type="button" class="vtorichen malak" data-prevklyuchi-zadacha="${ekraniraj(z.id)}">${
                    z.vklyuchena ? 'Изключи' : 'Включи'
                  }</button>`
            }`
          : `<button type="button" class="vtorichen malak" data-potvardi-zadacha="${ekraniraj(z.id)}">Потвърди с имейл</button>`
      }</span>
    </div>`;
}

/**
 * СВЪРЗВАНЕТО С КЛОД · ключът и какво струва (И94 т.1).
 *
 * ТАЗИ ЧАСТ ЛИПСВА В ОФЛАЙН ИЗДАНИЕТО. Затова `app/klod.ts` се тегли с
 * ДИНАМИЧЕН внос, а не статично като входа: при входа липсващият файл значи
 * друг вход (`EdinSobstvenik`), тук значи ЕДИН БУТОН по-малко — останалият
 * екран (задачи, умения, ръчни предложения) трябва да работи и без него.
 *
 * Ключът се показва само с опашката си. Екранът КАЗВА, че ключ в браузър се
 * вижда от всеки с достъп до устройството — преди да го поиска, не след това.
 */
function kartaKlod(a: Agent): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Свързването с Клод</h2>
        <span>свързваща част · офлайн изданието изобщо няма този файл</span>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="klod-klyuch">Ключ за Клод</label>
          <input translate="no" id="klod-klyuch" type="password" autocomplete="off"
            placeholder="sk-ant-…">
        </div>
        <div class="pole">
          <label>Сега</label>
          <p class="drebno" id="klod-sastoyanie" translate="no">проверявам…</p>
        </div>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="zapishi-klyuch-klod">Запиши ключа</button>
        <button type="button" class="vtorichen" id="zabravi-klyuch-klod">Забрави го</button>
        <p class="drebno">Ключът живее САМО на това устройство и НИКОГА в Журнала — тайна в дневник
        само за добавяне е тайна, изгубена завинаги. Всеки, който отвори инструментите на разработчика
        тук, ще го види: това е цената на приложение без сървър, и тя се казва, а не се крие.
        „Пусни с Клод" при задача праща протокола на „${ekraniraj(a.ime)}" и данните от обхвата му —
        нищо друго не излиза навън.</p>
      </div>
    </section>`;
}

/**
 * РЪЧНОТО ПРЕДЛОЖЕНИЕ · пътят, който остава и БЕЗ свързваща част.
 *
 * Офлайн изданието няма Клод; там човекът разговаря с агента другаде и вписва
 * заключението тук. Затова формата не пада, когато свързването се построи —
 * тя е единственият път в изданието без мрежа.
 */
function kartaRachnoPredlozhenie(a: Agent): string {
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Ръчно предложение</h2>
        <span>пътят без мрежа · вписвам заключението сам</span>
      </div>
      <form id="forma-zadacha">
        <div class="pole">
          <label for="zadacha-tekst">По коя задача</label>
          <input translate="no" id="zadacha-tekst" name="zadacha" required
            placeholder="напр. сверѝ ДДС за август по акумулатори" autocomplete="off">
        </div>
        <div class="pole">
          <label for="zadacha-kakvo">Какво предлага той · вписва се от мен</label>
          <input translate="no" id="zadacha-kakvo" name="kakvo" required
            placeholder="предложението, с думи" autocomplete="off">
        </div>
        ${poletaZaTriUmeniya(a, 'zadacha')}
        <div class="poleta tesni">
          <div class="pole">
            <label for="zadacha-vhod">Сверка · вход</label>
            <input translate="no" id="zadacha-vhod" name="vhod" inputmode="decimal" value="0,00">
          </div>
          <div class="pole">
            <label for="zadacha-izhod">Сверка · изход</label>
            <input translate="no" id="zadacha-izhod" name="izhod" inputmode="decimal" value="0,00">
          </div>
        </div>
        <p class="greshka" id="greshka-zadacha"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши предложението</button>
          <p class="drebno">Записвам АЗ — <code>actor</code> е моят имейл, а бележката носи „предложено от агент: ${ekraniraj(a.ime)}".
          Задачата назовава ТРИ умения от включените (правило 25).</p>
        </div>
      </form>
    </section>`;
}

/** ЖУРНАЛЪТ · предложенията, присъдите и броените показатели. */
function kartaZhurnal(predlozheniya: readonly Predlozhenie[]): string {
  const p = pokazateli(predlozheniya);
  const podredeni = [...predlozheniya].sort((a, b) => b.kogato.localeCompare(a.kogato));
  return `
    <section>
      <div class="dyalglava">
        <h2>Журнал на предложенията</h2>
        <span>всяко е събитие в Журнала · това тук е Огледало, не втори лог</span>
      </div>
      <div class="plochki">
        <div class="plochka"><span class="etiket">Предложения</span><span class="chislo" data-broi-predlozheniya translate="no">${p.vsichki}</span><span class="pod">всички</span></div>
        <div class="plochka"><span class="etiket">Чакат</span><span class="chislo" translate="no">${p.chakat}</span><span class="pod">моята дума</span></div>
        <div class="plochka"><span class="etiket">Приети</span><span class="chislo" translate="no">${p.prieti}</span><span class="pod">аз ги записах</span></div>
        <div class="plochka${p.razminavaniya ? ' trevoga' : ''}"><span class="etiket">Разминавания</span><span class="chislo" translate="no">${p.razminavaniya}</span><span class="pod">сверката не затваря</span></div>
      </div>
      ${
        podredeni.length === 0
          ? '<p class="prazno">Още няма предложения.<br>Възложи задача горе — и каквото агентът предложи, ще чака тук.</p>'
          : `<div class="tablitsa" data-tablitsa="predlozheniya">
        <div class="glava predlozhenie">
          <span>Задача и предложение</span><span class="suma">Вход</span><span class="suma">Изход</span>
          <span class="suma">Разлика</span><span>Присъда</span><span></span>
        </div>
        ${podredeni.map(redNaPredlozhenie).join('')}
      </div>`
      }
      <p class="drebno">Разликата се показва и когато е нула — проверената нула е различна от нулата, за която никой не е питал.</p>
    </section>`;
}

function redNaPredlozhenie(p: Predlozhenie): string {
  const razlika = razlikaNaSverkata(p);
  return `
    <div class="red predlozhenie" data-predlozhenie="${ekraniraj(p.id)}" translate="no">
      <span class="kletka"><b>${ekraniraj(p.zadacha)}</b><span>${ekraniraj(p.kakvo)}</span></span>
      <span class="suma" data-st="${p.sverka.vhod}">${pishi(p.sverka.vhod)}</span>
      <span class="suma" data-st="${p.sverka.izhod}">${pishi(p.sverka.izhod)}</span>
      <span class="suma${sverkataZatvarya(p) ? '' : ' duljimo'}" data-st="${razlika}">${pishi(razlika)}</span>
      <span><span class="znachka ${p.prisada === 'chaka' ? 'tiha' : p.prisada === 'othvarleno' ? 'trevoga' : 'dobre'}">${IMENA_NA_PRISADITE[p.prisada]}</span>${
        p.otsadil ? `<span class="drebno">${ekraniraj(p.otsadil)}</span>` : ''
      }</span>
      <span class="butoni">${
        p.prisada === 'chaka'
          ? `<button type="button" class="vtorichen malak" data-priemi="${ekraniraj(p.id)}">Приемам и записвам</button>
             <button type="button" class="vtorichen malak" data-othvarli="${ekraniraj(p.id)}">Отхвърлям</button>`
          : `<span class="drebno">${ekraniraj(p.prichina || '—')}</span>`
      }</span>
    </div>`;
}

/**
 * ДАННИТЕ, КОИТО ИЗЛИЗАТ НАВЪН · точно колкото обхватът позволява.
 *
 * Обхватът е ЕДИНСТВЕНОТО, което решава какво тръгва към Клод. Затова тук
 * няма нито един ред извън `switch`-а по обхвата: добавен екран без свой
 * `case` не изтича мълчаливо — той просто не се появява.
 *
 * И се пращат СБОРОВЕ и БРОЙКИ, не редовете. Агентът предлага посока, човекът
 * гледа числата; за да прецени посоката, обобщението стига, а имената на
 * наематели и доставчици нямат работа на чужд сървър.
 */
export function dannitezaAgenta(o: Ogledalo, a: Agent): string {
  const redove: string[] = [];
  for (const obhvat of a.obhvat) {
    switch (obhvat) {
      case 'imoti':
        redove.push(`Имоти: ${o.imoti.size} · договори за наем: ${o.naemi.size}`);
        break;
      case 'pari': {
        const prihod = [...o.plashtaniya.values()].reduce((s, p) => s + p.suma_st, 0);
        const razhod = [...o.razhodi.values()].reduce((s, r) => s + r.suma_st, 0);
        redove.push(
          `Приходи: ${pishi(prihod)} € (${o.plashtaniya.size} плащания) · ` +
            `Разходи: ${pishi(razhod)} € (${o.razhodi.size} разхода)`,
        );
        break;
      }
      case 'smetki':
        redove.push(
          `Подадени ДДС-справки: ${o.spravki.size} · платени: ${o.platenoDDS.size} · ` +
            `начислени вземания: ${o.vzemaniya.size}`,
        );
        break;
      case 'stoynost':
        redove.push(`Таблици с модел: ${o.modeli.size} · записани сверки: ${o.sverki.length}`);
        break;
      case 'gant':
        redove.push(`Дела в Управление: ${o.dela.size}`);
        break;
    }
  }
  return redove.length === 0 ? 'Обхватът му е празен — няма какво да прочете.' : redove.join('\n');
}

export function zakachiII(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-izbran-agent]')) {
    b.addEventListener('click', async () => {
      izbranAgent = b.dataset['izbranAgent']!;
      zapomniEkranno('ii.agent', izbranAgent);
      pitamZaSaglasie = false;
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#nov-agent')?.addEventListener('click', async () => {
    dobavyam = true;
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#otkazhi-agent')?.addEventListener('click', async () => {
    dobavyam = false;
    await prerisuvay();
  });

  const spisak = (tekst: string): string[] =>
    tekst
      .split(/[·,;]/)
      .map((x) => x.trim())
      .filter((x) => x !== '');

  const agentSega = async (): Promise<Agent | undefined> =>
    (await k.deystviya.ogledalo()).agenti.get(izbranAgent);

  /**
   * ПОИСКВА ПОТВЪРЖДЕНИЕ · прави кода, отваря писмото, запомня действието.
   *
   * Кодът се прави ТУК и се дава САМО на писмото. Отпечатъкът му остава в
   * `iskane`; самият код не се пази никъде — затова и не може да изтече.
   */
  const poiskayPotvarzhdenie = async (
    zaKakvo: ZaKakvo,
    kakvo: string,
    doImeyl: string,
    deystvie: () => Promise<void>,
  ): Promise<void> => {
    const kod = napraviKod((n) => crypto.getRandomValues(new Uint32Array(n)));
    iskane = await poiskay(
      { zaKakvo, kakvo, doImeyl, kod, kogato: new Date().toISOString() },
      sha256Web,
    );
    sledPotvarzhdenie = deystvie;
    const p = pismoto(iskane, kod);
    // Кодът пътува САМО в тази чернова — на екрана го няма и в Журнала няма да влезе.
    pismotoAdres = `mailto:${encodeURIComponent(doImeyl)}?subject=${encodeURIComponent(
      p.zaglavie,
    )}&body=${encodeURIComponent(p.tyalo)}`;
    greshka = '';
    await prerisuvay();
  };

  const formaAgent = koren.querySelector<HTMLFormElement>('#forma-agent');
  formaAgent?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-agent')!;
    kazhi.textContent = '';
    const d = new FormData(formaAgent);
    const obhvat = [...koren.querySelectorAll<HTMLInputElement>('[data-obhvat]')]
      .filter((x) => x.checked)
      .map((x) => x.dataset['obhvat'] as Obhvat);
    try {
      const ime = String(d.get('ime') ?? '');
      const agent = napraviAgent({
        klyuch: klyuchOtIme(ime),
        ime,
        otgovornik: String(d.get('otgovornik') ?? ''),
        harakteristika: String(d.get('harakteristika') ?? ''),
        obhvat,
        zabrani: spisak(String(d.get('zabrani') ?? '')),
      });
      await k.deystviya.zapishiAgent(agent, { opId: `agent:${crypto.randomUUID()}` });
      izbranAgent = agent.klyuch;
      zapomniEkranno('ii.agent', izbranAgent);
      dobavyam = false;
      greshka = '';
      k.vest(
        'dobre',
        `Агентът „${agent.ime}" е записан — ИЗКЛЮЧЕН, само с характеристиката. Уменията се добавят отдолу.`,
      );
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  /**
   * Всяка промяна по уменията е НОВ запис на агента (правило 1) и минава
   * през КОД ОТ ПИСМО (И94 т.1: „С имейл се потвърждават и Уменията").
   *
   * Спирачката стои на ЕДНО място — тук — за всичките три действия по
   * уменията. Сложена поотделно на трите бутона, четвъртият бутон утре ще я
   * пропусне, без някой да забележи.
   */
  const zapishiAgenta = async (
    nov: Awaited<ReturnType<typeof agentSega>>,
    kakvo: string,
    vest: string,
  ) => {
    if (!nov) return;
    await poiskayPotvarzhdenie('umenie', kakvo, nov.otgovornik, async () => {
      await k.deystviya.zapishiAgent(nov, { opId: `agent:${crypto.randomUUID()}` });
      greshka = '';
      k.vest('dobre', vest);
      await prerisuvay();
    });
  };

  const formaUmenie = koren.querySelector<HTMLFormElement>('#forma-umenie');
  formaUmenie?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-umenie')!;
    kazhi.textContent = '';
    const d = new FormData(formaUmenie);
    try {
      const star = await agentSega();
      if (!star) return;
      const ime = String(d.get('ime') ?? '');
      await zapishiAgenta(
        dobaviUmenie(star, { ime, tekst: String(d.get('tekst') ?? '') }),
        `добавяне на „${ime.trim()}"`,
        `Умението „${ime.trim()}" е добавено и е ВКЛЮЧЕНО.`,
      );
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-prevklyuchi-umenie]')) {
    b.addEventListener('click', async () => {
      try {
        const star = await agentSega();
        if (!star) return;
        const klyuch = b.dataset['prevklyuchiUmenie']!;
        const sega = star.umeniya.find((u) => u.klyuch === klyuch);
        await zapishiAgenta(
          prevklyuchiUmenie(star, klyuch, !sega?.vklyucheno),
          `${sega?.vklyucheno ? 'изключване' : 'включване'} на „${sega?.ime ?? klyuch}"`,
          `Умението „${sega?.ime ?? klyuch}" е ${sega?.vklyucheno ? 'ИЗКЛЮЧЕНО' : 'ВКЛЮЧЕНО'}.`,
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-premahni-umenie]')) {
    b.addEventListener('click', async () => {
      try {
        const star = await agentSega();
        if (!star) return;
        const klyuch = b.dataset['premahniUmenie']!;
        const sega = star.umeniya.find((u) => u.klyuch === klyuch);
        await zapishiAgenta(
          premahniUmenie(star, klyuch),
          `махане на „${sega?.ime ?? klyuch}"`,
          `Умението „${sega?.ime ?? klyuch}" е махнато. Записът за него остава в Журнала.`,
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // ВКЛЮЧВАНЕТО · първо питането с рисковете, чак после действието.
  koren.querySelector<HTMLButtonElement>('#vklyuchi-agenta')?.addEventListener('click', async () => {
    pitamZaSaglasie = true;
    await prerisuvay();
  });
  koren
    .querySelector<HTMLButtonElement>('#otkazhi-vklyuchvane')
    ?.addEventListener('click', async () => {
      pitamZaSaglasie = false;
      await prerisuvay();
    });

  koren
    .querySelector<HTMLButtonElement>('#potvardi-vklyuchvane')
    ?.addEventListener('click', async () => {
      const razbrah = koren.querySelector<HTMLInputElement>('#razbrah');
      if (!razbrah?.checked) {
        greshka = 'Отметката „прочетох рисковете" не е сложена — включване без нея не става.';
        await prerisuvay();
        return;
      }
      try {
        const star = await agentSega();
        if (!star) return;
        await k.deystviya.zapishiAgent(
          { ...star, sastoyanie: 'vklyuchen', ot: dnesKato() },
          { opId: `agent:${crypto.randomUUID()}` },
        );
        pitamZaSaglasie = false;
        greshka = '';
        k.vest('dobre', `„${star.ime}" е включен. Той предлага; записвам аз.`);
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });

  koren.querySelector<HTMLButtonElement>('#zakriy-agenta')?.addEventListener('click', async () => {
    try {
      const star = await agentSega();
      if (!star) return;
      await k.deystviya.zapishiAgent(zakriy(star), { opId: `agent:${crypto.randomUUID()}` });
      dobavyam = true; // формата за нов се отваря веднага — това е пътят
      greshka = '';
      k.vest('dobre', `„${star.ime}" е ЗАКРИТ. Направи нов с новата характеристика.`);
      await prerisuvay();
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#spri-agenta')?.addEventListener('click', async () => {
    try {
      const star = await agentSega();
      if (!star) return;
      await k.deystviya.zapishiAgent(
        { ...star, sastoyanie: 'spryan' },
        { opId: `agent:${crypto.randomUUID()}` },
      );
      k.vest('dobre', `„${star.ime}" е спрян. Журналът не е пипнат.`);
      await prerisuvay();
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-koda')?.addEventListener('click', async () => {
    iskane = undefined;
    sledPotvarzhdenie = undefined;
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#potvardi-koda')?.addEventListener('click', async () => {
    const kazhi = koren.querySelector<HTMLElement>('#greshka-kod')!;
    kazhi.textContent = '';
    const vaveden = koren.querySelector<HTMLInputElement>('#kod')?.value ?? '';
    try {
      if (!iskane || !sledPotvarzhdenie) return;
      await proveri(iskane, vaveden, new Date().toISOString(), sha256Web);
      const deystvie = sledPotvarzhdenie;
      // Изчиства се ПРЕДИ действието: втори натиснат бутон да не го пусне пак.
      iskane = undefined;
      sledPotvarzhdenie = undefined;
      await deystvie();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  // НОВА ЗАДАЧА · разписание + три умения (И94 т.1).
  const formaNovaZadacha = koren.querySelector<HTMLFormElement>('#forma-nova-zadacha');
  formaNovaZadacha?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-nova-zadacha')!;
    kazhi.textContent = '';
    const d = new FormData(formaNovaZadacha);
    try {
      const agent = await agentSega();
      if (!agent) throw new Error('Няма избран агент.');
      const z = napraviZadacha(agent, {
        id: crypto.randomUUID(),
        kakvo: String(d.get('kakvo') ?? ''),
        razpisanie: String(d.get('razpisanie') ?? 'vsekidnevna') as Razpisanie,
        umeniya: [
          String(d.get('umenie1') ?? ''),
          String(d.get('umenie2') ?? ''),
          String(d.get('umenie3') ?? ''),
        ],
        denOtSedmitsata: Number(d.get('den') ?? 1),
        ot: String(d.get('ot') ?? ''),
        do: String(d.get('do') ?? ''),
        kogato: new Date().toISOString(),
      });
      await k.deystviya.zapishiZadacha(z, { opId: `zadacha:${crypto.randomUUID()}` });
      greshka = '';
      k.vest(
        'dobre',
        `Задачата е възложена — НЕПОТВЪРДЕНА. Потвърди я с имейл, за да почне да се пада.`,
      );
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const zadachaSega = async (id: string): Promise<Zadacha | undefined> =>
    (await k.deystviya.ogledalo()).zadachi.get(id);

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-potvardi-zadacha]')) {
    b.addEventListener('click', async () => {
      try {
        const z = await zadachaSega(b.dataset['potvardiZadacha']!);
        const agent = await agentSega();
        if (!z || !agent) return;
        await poiskayPotvarzhdenie('zadacha', z.kakvo, agent.otgovornik, async () => {
          await k.deystviya.zapishiZadacha(potvardiZadacha(z), {
            opId: `zadacha:${crypto.randomUUID()}`,
          });
          k.vest('dobre', `„${z.kakvo}" е потвърдена с код от писмото.`);
          await prerisuvay();
        });
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-prevklyuchi-zadacha]')) {
    b.addEventListener('click', async () => {
      try {
        const z = await zadachaSega(b.dataset['prevklyuchiZadacha']!);
        if (!z) return;
        await k.deystviya.zapishiZadacha(prevklyuchiZadacha(z, !z.vklyuchena), {
          opId: `zadacha:${crypto.randomUUID()}`,
        });
        greshka = '';
        k.vest('dobre', `„${z.kakvo}" е ${z.vklyuchena ? 'ИЗКЛЮЧЕНА' : 'ВКЛЮЧЕНА'}.`);
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // ПУСКАНЕТО С КЛОД · бутонът от И94 т.1. Всяко пускане иска свой код:
  // то харчи пари и излиза НАВЪН от устройството — двете причини стоят на
  // екрана, не в коментар.
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-pusni-zadacha]')) {
    b.addEventListener('click', async () => {
      try {
        const z = await zadachaSega(b.dataset['pusniZadacha']!);
        const agent = await agentSega();
        if (!z || !agent) return;
        await poiskayPotvarzhdenie('pusnati-agent', z.kakvo, agent.otgovornik, async () => {
          b.disabled = true;
          try {
            const { pusniSKlod } = await import('./klod.js');
            const o = await k.deystviya.ogledalo();
            const otgovor = await pusniSKlod({
              agent,
              zadacha: z.kakvo,
              danni: dannitezaAgenta(o, agent),
            });
            await k.deystviya.zapishiPredlozhenie(
              {
                id: crypto.randomUUID(),
                agent: agent.klyuch,
                zadacha: z.kakvo,
                kakvo: otgovor.kakvo,
                umeniya: z.umeniya,
                // Сверката СТОИ на нула и чака човека: Клод връща думи, не
                // числа за Вратата. Нулата тук е „още непроверено", и точно
                // затова колоната „Разлика" се показва дори нулева.
                sverka: { vhod: 0, izhod: 0 },
                prisada: 'chaka',
                prichina: '',
                otsadil: '',
                kogato: new Date().toISOString(),
              },
              { opId: `predlozhenie:${crypto.randomUUID()}` },
            );
            greshka = '';
            k.vest(
              'dobre',
              `Клод предложи по „${z.kakvo}" (${otgovor.vhodni}+${otgovor.izhodni} жетона). Предложението чака моята дума.`,
            );
          } finally {
            b.disabled = false;
          }
          await prerisuvay();
        });
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // КЛЮЧЪТ ЗА КЛОД · динамичен внос, защото офлайн изданието няма файла.
  const klodBlok = koren.querySelector<HTMLElement>('#klod-sastoyanie');
  if (klodBlok) {
    void (async () => {
      try {
        const { imaKlyuch, opashkataNaKlyucha } = await import('./klod.js');
        klodBlok.textContent = imaKlyuch()
          ? `ключът стои ${opashkataNaKlyucha()}`
          : 'няма ключ — „Пусни с Клод" ще откаже с думи';
      } catch {
        klodBlok.textContent = 'свързващата част я няма в това издание';
      }
    })();
  }

  koren
    .querySelector<HTMLButtonElement>('#zapishi-klyuch-klod')
    ?.addEventListener('click', async () => {
      const pole = koren.querySelector<HTMLInputElement>('#klod-klyuch');
      try {
        const { zapishiKlyuch } = await import('./klod.js');
        zapishiKlyuch(pole?.value ?? '');
        if (pole) pole.value = '';
        greshka = '';
        k.vest('dobre', 'Ключът е записан МЕСТНО. В Журнала не влиза нищо.');
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });

  koren
    .querySelector<HTMLButtonElement>('#zabravi-klyuch-klod')
    ?.addEventListener('click', async () => {
      try {
        const { zabraviKlyucha } = await import('./klod.js');
        zabraviKlyucha();
        k.vest('dobre', 'Ключът е забравен от това устройство.');
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });

  const formaZadacha = koren.querySelector<HTMLFormElement>('#forma-zadacha');
  formaZadacha?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-zadacha')!;
    kazhi.textContent = '';
    const d = new FormData(formaZadacha);
    try {
      const agent = await agentSega();
      if (!agent) throw new Error('Няма избран агент.');
      // Правило 25: ТРИ умения, избрани за ТАЗИ задача, и то от включените.
      const umeniya = proveriTriUmeniya(agent, [
        String(d.get('umenie1') ?? ''),
        String(d.get('umenie2') ?? ''),
        String(d.get('umenie3') ?? ''),
      ]);
      const { otSuma } = await import('../src/yadro/pari.js');
      const p: Predlozhenie = {
        id: crypto.randomUUID(),
        agent: agent.klyuch,
        zadacha: String(d.get('zadacha') ?? '').trim(),
        kakvo: String(d.get('kakvo') ?? '').trim(),
        sverka: {
          vhod: otSuma(String(d.get('vhod') ?? '0')),
          izhod: otSuma(String(d.get('izhod') ?? '0')),
        },
        umeniya,
        prisada: 'chaka',
        prichina: '',
        otsadil: '',
        kogato: new Date().toISOString(),
      };
      await k.deystviya.zapishiPredlozhenie(p, { opId: `predlozhenie:${crypto.randomUUID()}` });
      greshka = '';
      k.vest('dobre', 'Предложението чака моята дума — нищо не е записано освен него.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  /** Присъдата е НОВО съдържание на същото събитие — последното бие. */
  const otsadi = async (id: string, prisada: 'prieto' | 'othvarleno', prichina: string) => {
    try {
      const o = await k.deystviya.ogledalo();
      const staro = o.predlozheniya.get(id);
      if (!staro) return;
      await k.deystviya.zapishiPredlozhenie(
        { ...staro, prisada, prichina, otsadil: k.akaunt },
        { opId: `prisada:${crypto.randomUUID()}` },
      );
      k.vest(
        'dobre',
        prisada === 'prieto'
          ? 'Прието — записах го аз, и следата носи моя имейл.'
          : 'Отхвърлено, с причина. Предложението остава в Журнала.',
      );
      await prerisuvay();
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  };

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-priemi]')) {
    b.addEventListener('click', () => void otsadi(b.dataset['priemi']!, 'prieto', ''));
  }
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-othvarli]')) {
    b.addEventListener('click', () => {
      const prichina = prompt('Защо се отхвърля?') ?? '';
      void otsadi(b.dataset['othvarli']!, 'othvarleno', prichina.trim() || 'без причина');
    });
  }
}

/** Колко умения иска протоколът — за екрана и за прохода (правило 25). */
export const UMENIYA_NA_ZADACHA = BROY_UMENIYA;
