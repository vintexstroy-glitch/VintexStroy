/**
 * НАСТРОЙКИ · мястото, където се създават БУТОНИТЕ.
 *
 * Негови думи: „Създаваш бутон и го връзваш от Настройки по избран начин, с
 * филтър за видимост на служители за бутона, и свързан по различен начин с
 * хедър и комбинацията хедъри. **Бутоните са модели на пътища.**"
 *
 * Този екран е контейнер **M16 · Настройки и номенклатури** от Заданието —
 * „настройка · номенклатура · речник · шаблон · МОДЕЛ НА КЛИЕНТА". Той липсваше
 * и от плана, и от приложението, а точно в него живее третият закон на скелета:
 * „Нищо не е константа. Всяко име/роля/номенклатура е данна от Настройки, не
 * зашито в кода."
 *
 * Тук няма нищо, което да пази състояние само за себе си: бутоните и моделите
 * живеят в Журнала и се четат от Огледалото при всяко показване.
 */

import { blokNaKredititeVNastroyki, zakachiKreditite } from './krediti.js';
import { pishi } from '../src/yadro/pari.js';
import {
  OPISI,
  type NastroykaNaProblem,
  type OpisNaProblem,
  type VidProblem,
} from '../src/domein/vhodni-problemi.js';
import { butonSIkona } from './ikoni.js';
import {
  // ПСЕВДОНИМ. „Видове" има и `vid-stoynost.ts` (евро · процент · число), и
  // двете имена са верни в своя дом. Кръстени еднакво ТУК, те се бият — затова
  // се различават на мястото, където се срещат, а не в домовете си.
  IMENA_NA_VIDOVETE as IMENA_NA_KONTRAGENTITE,
  kakvoLipsva,
  VIDOVE_KONTRAGENT,
  type Kontragent,
} from '../src/domein/kontragenti.js';
import { etapite } from '../src/domein/prodazhbi.js';
import { sektsiyaZhurnalat, zakachiZhurnalat } from './zhurnalat.js';
import { sektsiyaGodinite, zakachiGodinite } from './godinite.js';
import { branshovete, broyPostroeni, sveriBranshovete } from '../src/domein/modeli-po-bransh.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { bezopasnoIme, dnesKato, ekraniraj, menyuNaDeystviyata, svaliFayl } from './obshto.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import { obrazetsOtModel, ZNAK_ZATVORENA } from '../src/iznos/ot-model.js';
import {
  belegNaButon,
  DEYSTVIYA,
  IMENA_NA_DOKADE,
  napraviButon,
  papki,
  posokaNa,
  vPapka,
  type Buton,
  type Deystvie,
} from '../src/domein/butoni.js';
import { belegNaModel, IMENA_NA_ROLITE, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import {
  dobaviKolona,
  IMENA_NA_NOMENKLATURITE,
  IMENA_V_OPISA,
  iztriyMenyu,
  opisNaPodredba,
  otbelezhiVavezhdane,
  preimenuvayKolona,
  premahniKolona,
  dayEkran,
  dobaviFormulnaKolona,
  semeystvo,
  smeniFormula,
  smeniVidNaStoynost,
  vidNomenklatura,
  zadayMenyu,
} from '../src/domein/redaktor.js';
import {
  DEYSTVIYA_NA_FORMULA,
  IMENA_NA_DEYSTVIYATA,
  sDumiFormula,
  type DeystvieNaFormula,
  type Formula,
} from '../src/domein/formuli.js';
import { dokade, IMENA_NA_FUNKTSIITE, obyaveni, VRAZKI } from '../src/domein/vrazki.js';
import {
  ePari,
  IMENA_NA_VIDOVETE_STOYNOST,
  VIDOVE_STOYNOST,
  ZNAK_NA_VIDA,
  type VidStoynost,
} from '../src/domein/vid-stoynost.js';
import { kartataNaSaglasieto } from './saglasie.js';
import { IMENA_NA_VIDOVETE, vidNaKolona } from '../src/domein/kolonno.js';
import type { PunktNaMenyuto } from '../src/domein/hedari-po-tabove.js';
import { IME_BEZ_TAB } from '../src/domein/hedari-po-tabove.js';
import type { Rolya as RolyaNaChovek } from '../src/yadro/samolichnost.js';
import type { Ogledalo, ZapisanaSverka } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';
import { ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import { izborPoPodrazbirane, mozhe, type Izbor } from '../src/domein/planove.js';
import { rolyataNa } from '../src/domein/stopanin.js';

/** Отворена ли е формата за нов бутон. Живее, докато екранът стои отворен. */
let dobavyam = false;
let greshka = '';

const POSOKA_S_DUMI: Readonly<Record<string, string>> = Object.freeze({
  chete: 'чете',
  pishe: 'пише',
  smyata: 'смята',
});

/** Кой служител се редактира в момента. Празно значи „никой" — нагласа, не факт. */

/**
 * ЕДНОТО МЯСТО с двете лица (И58): „Две отделни, но свързани, и се редактират
 * от едно място СЪС СМЯНА НА РЕДАКТОРА." Смяната е това поле, не втори екран.
 */
let litseNaRedaktora: 'hedari' | 'opis' = 'hedari';
/** Кой хедър е отворен в Редактора. Празно значи „никой". */
let izbranHedar = '';

/**
 * ПУНКТОВЕТЕ НА МЕНЮТО, каквито последното рисуване ги е видяло.
 *
 * Падащото меню „на кой таб стои" ги изрежда, а слушателят му ги ПРОВЕРЯВА
 * (`dayEkran` отказва ключ, който не е между тях). Следа от четене, не втори
 * дом: домът е `podredeniPunktove` (ADR-066).
 */
let punktoveNaLentata: readonly PunktNaMenyuto[] = [];
/** Отворена ли е формата за нова колона. */
let dobavyamKolona = false;
/** Коя формулна колона се мени в момента · `null` значи никоя (И92 т.8). */
let smenyamFormula: number | null = null;

export function narisuvayNastroyki(
  o: Ogledalo,
  sabitiya = 0,
  izbor: Izbor = izborPoPodrazbirane(),
  /** влезлият · Стопанинът ли е (ADR-043 · ролята се СМЯТА от Журнала) */
  negoviyat = true,
  /**
   * ПУНКТОВЕТЕ НА МЕНЮТО · за въпроса „на кой таб стои този хедър" (И103).
   *
   * Подават се, не се смятат тук: домът на реда е `podredeniPunktove`
   * (ADR-066). Празен списък значи, че въпросът не се задава — а не че
   * отговорът е „никъде".
   */
  punktove: readonly PunktNaMenyuto[] = [],
  /** ДНЕШНИЯТ ден · подава се, не се чете: часовникът е довод (резен 26) */
  dnes = '',
): string {
  punktoveNaLentata = punktove;
  const butoni = [...o.butoni.values()];
  const modeli = [...o.modeli.values()];

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Бутони</span>
        <span class="chislo" translate="no">${butoni.length}</span>
        <span class="pod">${butoni.length ? `в ${papki(butoni).length} папки` : 'още няма нито един'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Модели на таблици</span>
        <span class="chislo" translate="no">${modeli.length}</span>
        <span class="pod">${modeli.length ? 'карти на хедъри' : 'правят се при първото четене'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Записани сверки</span>
        <span class="chislo" translate="no">${o.sverki.length}</span>
        <span class="pod">включително нулевите — правило 7</span>
      </div>
      <div class="plochka">
        <span class="etiket">Построени действия</span>
        <span class="chislo" translate="no">${
          DEYSTVIYA.filter((d) => d.dokade === 'postroen').length
        } / ${DEYSTVIYA.length}</span>
        <span class="pod">${
          DEYSTVIYA.filter((d) => d.dokade === 'bez-buton').length
        } са построени, но БЕЗ БУТОН · останалите са само обявени</span>
      </div>
    </div>

    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    ${
      /**
       * ДВЕТЕ СЕКЦИИ, КОИТО ИСКАТ ДРАЙВА · и само те.
       *
       * Дотук ЦЕЛИЯТ екран искаше `iztochnitsi` (`EKRANI.nastroyki.iska`), а
       * тази възможност я дава само Драйвът. На двата ЛОКАЛНИ плана пунктът
       * стоеше в лентата и натискането връщаше на Имоти — без дума защо, и с
       * него падаха петнайсет теми, които нямат нищо общо с Драйва.
       *
       * Сега изискването живее на ТЕМАТА (`temi-nastroyki.ts`), а тук отпадат
       * само двете ѝ секции. Правило 15: изключеното се КАЗВА, не се преглъща.
       */
      mozhe(izbor, 'iztochnitsi')
        ? blokNaButonite(butoni)
        : `<section data-sektsiya="butoni">
      <div class="dyalglava"><h2>Бутоните · пътищата</h2><span>иска Драйв</span></div>
      <p class="drebno">Бутонът е ПЪТ към файл в Драйва, а това издание е МЕСТНО —
      Журналът е само на устройството. Възможността не е изключена, а я НЯМА в този
      план: пътища без облак водят наникъде. Всичко останало в Настройки работи.</p>
    </section>`
    }
    ${dobavyam ? formaNaButon(modeli) : ''}
    ${
      mozhe(izbor, 'iztochnitsi')
        ? blokNaModelite(modeli)
        : `<section data-sektsiya="modeli">
      <div class="dyalglava"><h2>Модели на таблици</h2><span>иска Драйв</span></div>
      <p class="drebno">Моделът описва ВЪНШЕН файл — картата на неговата глава. Без
      Драйв няма откъде да дойде такъв файл, затова темата я няма в този план.
      Хедърите и колоните им се редактират нормално.</p>
    </section>`
    }
    ${blokNaRedaktora(modeli)}
    ${blokNaParametrite(o)}
    ${blokNaEtapite(o)}

    ${blokNaKredititeVNastroyki()}
    ${blokNaKontragentite(o)}
    ${blokNaSverkite(o)}
    ${sektsiyaZhurnalat(o, sabitiya, dnes)}
    ${sektsiyaGodinite(o, dnes, negoviyat)}
    ${blokNaBranshovete(dnes)}
    ${blokNaDeystviyata()}
    ${blokNaKartata()}`;
}

// ── НАП · активирането със съгласие (резен 17 · И108 · И112) ────────────────
// ── бутоните ───────────────────────────────────────────────────────────────
function blokNaButonite(butoni: readonly Buton[]): string {
  return `
    <section data-sektsiya="butoni">
      <div class="dyalglava">
        <h2>Бутоните</h2>
        <span>един бутон = един път · посоката е ЕДНА</span>
      </div>
      ${
        butoni.length === 0
          ? '<p class="prazno">Още няма нито един бутон.<br>Бутонът е път: коя папка, кое действие, кои модели.</p>'
          : papki(butoni)
              .map(
                (p) => `<div class="tablitsa">
        <div class="glava buton">
          <span>Папка ${ekraniraj(p)}</span><span>Действие</span><span>Посока</span>
          <span>Модели</span><span></span>
        </div>
        ${vPapka(butoni, p).map(redNaButon).join('')}
      </div>`,
              )
              .join('')
      }
      <div class="deystviya">
        <button type="button" class="glaven" id="nov-buton"${dobavyam ? ' disabled' : ''}>Нов бутон</button>
        <p class="drebno">Папката <b>групира</b>, не съхранява: тя е име в Журнала, не директория на диска. Затова бутоните работят и на телефон, и без мрежа.</p>
      </div>
    </section>`;
}

function redNaButon(b: Buton): string {
  const opis = DEYSTVIYA.find((d) => d.klyuch === b.deystvie)!;
  const posoka = posokaNa(b.deystvie);
  return `
    <div class="red buton" translate="no">
      <span class="kletka"><b>${ekraniraj(b.klyuch)}</b><span>${ekraniraj(b.papka)}</span></span>
      <span>${ekraniraj(opis.ime)}</span>
      <span><span class="znachka ${posoka === 'chete' ? 'dobre' : 'tiha'}">${POSOKA_S_DUMI[posoka]}</span></span>
      <span class="kletka"><span>${
        b.modeli.length === 0
          ? '<b>всички</b> — приема кой да е познат хедър'
          : ekraniraj(b.modeli.join(' · '))
      }</span></span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-mahni-buton="${ekraniraj(b.klyuch)}">Изчисти моделите</button>
      </span>
    </div>`;
}

function formaNaButon(modeli: readonly ModelNaTablitsa[]): string {
  // САМО достижимите от бутон · „построен, но без бутон" не влиза в избора,
  // защото такъв бутон би отворил файл и после отказал (`butoni.ts`).
  const postroeni = DEYSTVIYA.filter((d) => d.dokade === 'postroen');
  return `
    <section data-sektsiya="nastroyki-nov-buton" class="karta izbrana">
      <div class="dyalglava"><h2>Нов бутон</h2><span>име · папка · действие · позволени модели</span></div>
      <form id="forma-buton">
        <div class="poleta">
          <div class="pole">
            <label for="buton-ime">Име на бутона</label>
            <input translate="no" id="buton-ime" name="ime" required placeholder="напр. Извлечения ОББ" autocomplete="off">
          </div>
          <div class="pole">
            <label for="buton-papka">Папка</label>
            <input translate="no" id="buton-papka" name="papka" required placeholder="напр. Извлечения" autocomplete="off">
          </div>
          <div class="pole">
            <label for="buton-deystvie">Действие</label>
            <select translate="no" id="buton-deystvie" name="deystvie" required>
              ${postroeni
                .map(
                  (d) => `<option value="${ekraniraj(d.klyuch)}">${ekraniraj(d.ime)} · ${POSOKA_S_DUMI[d.posoka]}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="tablitsa">
          <div class="glava propusnat"><span>Позволени модели</span><span>нищо избрано = всички</span></div>
          ${
            modeli.length === 0
              ? '<p class="prazno">Още няма модели. Бутонът ще приема всеки познат хедър, докато не се появят.</p>'
              : modeli
                  .map(
                    (m) => `<div class="red propusnat" translate="no">
            <span><label class="vazm"><input type="checkbox" data-model="${ekraniraj(m.klyuch)}"> ${ekraniraj(m.klyuch)}</label></span>
            <span>${ekraniraj(m.otpechatak.slice(0, 60))}…</span>
          </div>`,
                  )
                  .join('')
          }
        </div>
        <p class="greshka" id="greshka-buton"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши бутона</button>
          <button type="button" class="vtorichen" id="otkazhi-buton">Откажи</button>
          <p class="drebno">Записва се като <b>БутонЗаписан</b>. Поправка е ново събитие върху същото име — старото остава в Журнала, както всичко останало.</p>
        </div>
      </form>
    </section>`;
}

// ── моделите ───────────────────────────────────────────────────────────────
function blokNaModelite(modeli: readonly ModelNaTablitsa[]): string {
  return `
    <section data-sektsiya="modeli">
      <div class="dyalglava">
        <h2>Модели на таблици</h2>
        <span>по един на глава · правят се при първото непознато четене</span>
      </div>
      ${
        modeli.length === 0
          ? '<p class="prazno">Още няма модели.<br>Първата непозната таблица ще пита коя колона какво е — и оттам се ражда модел.</p>'
          : `<div class="tablitsa">
        <div class="glava model">
          <span>Име</span><span>Колони</span><span>Махнати от сборовете</span><span>Отпечатък на главата</span>
        </div>
        ${modeli.map(redNaModel).join('')}
      </div>`
      }
    </section>`;
}

function redNaModel(m: ModelNaTablitsa): string {
  const roli = (Object.keys(m.koloni) as (keyof typeof IMENA_NA_ROLITE)[])
    .map((r) => IMENA_NA_ROLITE[r])
    .join(' · ');
  return `
    <div class="red model" translate="no">
      <span class="kletka"><b>${ekraniraj(m.klyuch)}</b><span>глава на ред ${m.redNaGlavata + 1}</span></span>
      <span>${ekraniraj(roli)}</span>
      <span>${m.izklyucheni.length === 0 ? '—' : `${m.izklyucheni.length}`}</span>
      <span class="kletka"><span>${ekraniraj(m.otpechatak.slice(0, 48))}…</span></span>
    </div>`;
}

// ── Редакторът на хедъри и Описът на Подредба ──────────────────────────────
/**
 * ЕДНОТО МЯСТО (И58): „Две отделни, но свързани, и се редактират от едно място
 * със смяна на редактора. Правата са след завършване на таблицата."
 *
 * Затова правата („Кой какво вижда") стоят ПОД този блок — първо таблицата се
 * завършва тук, после се раздава. И затова редакцията подава роля „собственик":
 * Настройки е екранът на главния акаунт (И57); кой точно е натиснал, записва
 * Вратата в `actor`, не този файл.
 */
function blokNaRedaktora(modeli: readonly ModelNaTablitsa[]): string {
  const izbran = modeli.find((m) => m.klyuch === izbranHedar);
  return `
    <section data-sektsiya="hedari">
      <div class="dyalglava">
        <h2>Редакторът на хедъри</h2>
        <span>и Описът на Подредба · две отделни, но свързани · едно място</span>
      </div>
      <div class="deystviya">
        <button type="button" class="${litseNaRedaktora === 'hedari' ? 'glaven' : 'vtorichen'}" id="litse-hedari">Редактор на хедъри</button>
        <button type="button" class="${litseNaRedaktora === 'opis' ? 'glaven' : 'vtorichen'}" id="litse-opis">Опис на Подредба</button>
      </div>
      ${litseNaRedaktora === 'opis' ? litseOpis(modeli) : litseHedari(modeli, izbran)}
    </section>`;
}

/** Лицето „Опис на Подредба" — всичко именувано е ред (ред 1970). Изглед, не втора истина. */
function litseOpis(modeli: readonly ModelNaTablitsa[]): string {
  const redove = opisNaPodredba(modeli);
  if (redove.length === 0) {
    return '<p class="prazno">Още няма нищо именувано.<br>Всеки хедър, колона и член на меню ще е ред тук.</p>';
  }
  return `
    <div class="tablitsa">
      <div class="glava opis"><span>Име</span><span>Какво е</span><span>Дом</span><span>Бележка</span></div>
      ${redove
        .map(
          (r) => `<div class="red opis" translate="no">
        <span><b>${ekraniraj(r.ime)}</b></span>
        <span>${IMENA_V_OPISA[r.vid]}</span>
        <span>${ekraniraj(r.dom)}</span>
        <span>${ekraniraj(r.belezhka)}</span>
      </div>`,
        )
        .join('')}
    </div>
    <p class="drebno">Описът се смята от моделите при всяко показване — записът е самият модел, затова тук няма какво да се разсинхронизира.</p>`;
}

/** Лицето „Редактор на хедъри" — избран хедър, колоните му, нова колона. */
function litseHedari(
  modeli: readonly ModelNaTablitsa[],
  izbran: ModelNaTablitsa | undefined,
): string {
  if (modeli.length === 0) {
    return '<p class="prazno">Още няма хедъри.<br>Първата непозната таблица ражда модел — и той се редактира тук.</p>';
  }
  return `
    <label class="pole">
      <span>Хедър</span>
      <select translate="no" id="izbor-hedar">
        <option value="">— избери —</option>
        ${modeli
          .map(
            (m) =>
              `<option value="${ekraniraj(m.klyuch)}"${m.klyuch === izbranHedar ? ' selected' : ''}>${ekraniraj(m.klyuch)} · ${m.glavi.length} колони</option>`,
          )
          .join('')}
      </select>
    </label>
    ${izbran === undefined ? '' : poleZaTaba(izbran)}
    ${izbran === undefined ? '' : koloniteNa(izbran, modeli)}`;
}

/**
 * НА КОЙ ТАБ СТОИ ТОЗИ ХЕДЪР · И103, и се ПИТА, а не се гади.
 *
 * По него матрицата на правата (таб „Служители") подрежда хедърите „както са по
 * табовете в менюто". Хедър без отговор не изчезва — той стои в последната
 * група и се БРОИ (правило 15).
 *
 * ЗАЩО ТУК, а не при правата: това е свойство на ХЕДЪРА, като номера на
 * връзката и вида на стойността, и се редактира там, където се редактира
 * хедърът. Свойство, питано на два екрана, се разминава.
 */
function poleZaTaba(m: ModelNaTablitsa): string {
  if (punktoveNaLentata.length === 0) {
    return `<p class="drebno" data-bez-punktove>Няма живи пунктове в лентата, значи няма
      от какво да се избере таб. Хедърът стои в групата „${ekraniraj(IME_BEZ_TAB)}".</p>`;
  }
  const sega = m.ekran ?? '';
  return `
    <label class="pole" data-pole-tab>
      <span>На кой таб стои</span>
      <select translate="no" id="izbor-tab-na-hedar" data-hedar="${ekraniraj(m.klyuch)}">
        <option value=""${sega === '' ? ' selected' : ''}>— ${ekraniraj(IME_BEZ_TAB)} —</option>
        ${punktoveNaLentata
          .map(
            (p) =>
              `<option value="${ekraniraj(p.klyuch)}"${p.klyuch === sega ? ' selected' : ''}>${ekraniraj(p.ime)}</option>`,
          )
          .join('')}
      </select>
    </label>
    <p class="drebno">По този таб се подреждат хедърите в „Кой какво вижда" (таб
    <b>Служители</b>). Празното е състояние, не липса — брои се и се показва.</p>`;
}

function koloniteNa(m: ModelNaTablitsa, modeli: readonly ModelNaTablitsa[]): string {
  return `
    <div class="tablitsa">
      <div class="glava redaktor">
        <span>Колона</span><span>Вид</span><span>Стойност</span><span>Номенклатура</span><span>Готово меню</span><span></span>
      </div>
      ${m.glavi.map((ime, k) => redNaKolona(m, ime, k)).join('')}
    </div>
    <div class="deystviya">
      <button type="button" class="glaven" id="nova-kolona"${dobavyamKolona ? ' disabled' : ''}>Нова колона</button>
      <p class="drebno">Работеща таблица само расте: „колони не се трият, а само се добавят" — празна колона без роля е единственото изключение, и то само за управителите.</p>
    </div>
    ${obrazetsatNa(m)}
    ${dobavyamKolona ? formaNaKolona(m, modeli) : ''}`;
}

/**
 * ОБРАЗЕЦЪТ · път №4 от десетте („Създаване на таблица", ADR-010).
 *
 * Негови думи: „ФУНКЦИОНАЛНОСТТА ДАВА ВЪЗМОЖНОСТ ДА ПРЕТВОРИШ МОДЕЛА НА
 * ТАБЛИЦАТА, ОТ КОЯТО ЧЕТЕШ. Така ще се напълнят контейнерите с таблици за
 * експеримент."
 *
 * Мостът (`src/iznos/ot-model.ts`) беше построен в резен 14 и оттогава го
 * викаха само тестовете — пътят нямаше бутон. Ето го.
 *
 * ОБРАЗЕЦЪТ Е ЦЯЛ · всички колони, включително скритите за някого. Това НЕ е
 * изключение от колонното право, а негово следствие: правило 23 казва, че
 * скриването пипа ЕКРАНА и нищо друго — „нито сбор, нито Журнал, нито износ".
 * И тук то е не просто правило, а МЕХАНИКА: главата на файла е отпечатъкът, по
 * който `poznavaLi` го разпознава на връщане. Образец с махната колона е файл,
 * който самото приложение после отказва да прочете.
 */
function obrazetsatNa(m: ModelNaTablitsa): string {
  const zatvoreni = m.glavi.filter((_, k) => vidNaKolona(m, k) === 'zatvorena').length;
  return `
    <div class="karta" data-sektsiya="obrazets">
      <div class="dyalglava">
        <h3>Образец по този модел</h3>
        <span>път №4 · „претвори модела на таблицата, от която четеш"</span>
      </div>
      <p class="drebno">Сваля празна таблица с <b>точно тези ${m.glavi.length} колони</b> и с
      ролите им в заглавието. Попълниш ли я и я върнеш, същият модел я познава — главата ѝ е
      отпечатъкът.${
        zatvoreni > 0
          ? ` <b>${zatvoreni}</b> ${zatvoreni === 1 ? 'затворена колона носи' : 'затворени колони носят'}
             знак ${ekraniraj(ZNAK_ZATVORENA)} и остават празни: те се <b>смятат</b>, не се пишат.`
          : ''
      }</p>
      <p class="drebno"><b>Образецът е ЦЯЛ</b> — носи и колоните, скрити за някой служител.
      Скриването пипа екрана и нищо друго (правило 23), а тук това е и механика: махната
      колона сменя главата, и файлът става непознаваем на връщане.</p>
      <div class="poleta">
        <label class="pole"><span>Празни редове</span>
          <input translate="no" type="number" min="1" max="500" step="1" id="obrazets-redove" value="12"></label>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="svali-obrazets">Свали образец</button>
      </div>
    </div>`;
}

function redNaKolona(m: ModelNaTablitsa, ime: string, k: number): string {
  const vid = vidNaKolona(m, k);
  // Видът на СТОЙНОСТТА — различен въпрос от вида на КОЛОНАТА. Първият казва
  // дали сборът ѝ отива в Приходи и Разходи (ADR-014 · правило 20); вторият
  // казва дали се редактира. Двата не се сливат.
  const vidNaStoynostta = m.vidove[k] ?? 'tekst';
  const nomenklatura = vidNomenklatura(m, k);
  const zaklyucheno = m.zaklyucheni.includes(k);
  const nosiRolya = Object.values(m.koloni).includes(k);
  // Формулната колона не се пише и не се маха оттук: тя е сметка (правило 23).
  const formula = m.formuli[k];
  return `
    <div class="red redaktor" translate="no">
      <span class="kletka">
        <input data-ime-vhod="${k}" value="${ekraniraj(ime)}"${zaklyucheno ? ' disabled title="името е заключено — падащото меню беше изтрито"' : ''} aria-label="име на колоната">
        ${zaklyucheno ? '<span>🔒 името е заключено</span>' : ''}
      </span>
      <span>${IMENA_NA_VIDOVETE[vid]}</span>
      <span class="kletka">
        <select data-vid-stoynost="${k}" aria-label="вид на стойността">
          ${VIDOVE_STOYNOST.map(
            (v) =>
              `<option value="${v}"${v === vidNaStoynostta ? ' selected' : ''}>${
                IMENA_NA_VIDOVETE_STOYNOST[v]
              }${ZNAK_NA_VIDA[v] ? ` ${ZNAK_NA_VIDA[v]}` : ''}</option>`,
          ).join('')}
        </select>
        ${ePari(vidNaStoynostta) ? '<span>влиза в двата сбора</span>' : '<span>не влиза в сбор</span>'}
      </span>
      <span>${
        formula ? `формула · ${ekraniraj(sDumiFormula(m, formula))}` : IMENA_NA_NOMENKLATURITE[nomenklatura]
      }</span>
      <span class="kletka">${
        vid === 'zatvorena'
          ? '<span>—</span>'
          : `<input data-menyu-vhod="${k}" value="${ekraniraj((m.menyuta[k] ?? []).join(' · '))}" placeholder="членове през ·" aria-label="готово меню">`
      }</span>
      <span class="butoni">
        ${formula ? '' : `<button type="button" class="vtorichen malak" data-zapishi-kolona="${k}">Запиши</button>`}
        ${formula ? `<button type="button" class="vtorichen malak" data-smeni-formula="${k}">Смени формулата</button>` : ''}
        ${nomenklatura === 'opis' ? `<button type="button" class="vtorichen malak" data-iztriy-menyu="${k}">Изтрий менюто</button>` : ''}
        ${nomenklatura === 'svobodna' && vid === 'promenlyva' ? `<button type="button" class="vtorichen malak" data-vavezhdane="${k}">От въвеждането</button>` : ''}
        ${nosiRolya || formula ? '' : `<button type="button" class="vtorichen malak" data-premahni-kolona="${k}">Премахни</button>`}
      </span>
    </div>
    ${smenyamFormula === k && formula ? formaNaFormulata(m, k, formula) : ''}`;
}

/**
 * ФОРМАТА НА ФОРМУЛАТА · падащи менюта, не текстово поле (И92 т.9: „всичко
 * деликатно скрито под падащи менюта").
 *
 * Свободен текст би искал собствен език и `eval` — двете са забранени
 * (правило 10 · нула зависимости). Наборът е малък и изброим: четири действия
 * и колоните на СЪЩАТА таблица, които носят данни.
 */
function formaNaFormulata(m: ModelNaTablitsa, kolona: number, sega?: Formula): string {
  const operandi = m.glavi
    .map((ime, k) => ({ ime, k }))
    .filter(({ k }) => k !== kolona && m.formuli[k] === undefined);
  const izbor = (nomer: number, izbrano: number | undefined, sPrazno: boolean): string => `
    <select translate="no" name="operand${nomer}" aria-label="колона ${nomer}">
      ${sPrazno ? `<option value=""${izbrano === undefined ? ' selected' : ''}>— няма —</option>` : ''}
      ${operandi
        .map(
          ({ ime, k }) =>
            `<option value="${k}"${k === izbrano ? ' selected' : ''}>${ekraniraj(ime)} · ${
              IMENA_NA_VIDOVETE_STOYNOST[m.vidove[k] ?? 'tekst']
            }</option>`,
        )
        .join('')}
    </select>`;
  return `
    <form class="red-forma" id="forma-formula" data-kolona="${kolona}">
      <div class="poleta tesni">
        <div class="pole">
          <label>Действие</label>
          <select translate="no" name="deystvie">
            ${DEYSTVIYA_NA_FORMULA.map(
              (d) =>
                `<option value="${d}"${d === sega?.deystvie ? ' selected' : ''}>${IMENA_NA_DEYSTVIYATA[d]}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole"><label>Първа колона</label>${izbor(1, sega?.ot[0], false)}</div>
        <div class="pole"><label>Втора колона</label>${izbor(2, sega?.ot[1], false)}</div>
        <div class="pole"><label>Трета · само при сбор</label>${izbor(3, sega?.ot[2], true)}</div>
      </div>
      <p class="greshka" id="greshka-formula"></p>
      <div class="deystviya">
        <button type="submit" class="glaven">${sega ? 'Смени формулата' : 'Дай формулата'}</button>
        <button type="button" class="vtorichen" id="otkazhi-formula">Откажи</button>
        <p class="drebno">Видът на колоната се СМЯТА от операндите: евро + евро е евро, евро × число е евро,
        „процент от" дава вида на първата. Формула върху формула не се прави — веригата гние тихо.</p>
      </div>
    </form>`;
}

function formaNaKolona(m: ModelNaTablitsa, modeli: readonly ModelNaTablitsa[]): string {
  const rodnini = semeystvo(modeli, m);
  return `
    <section data-sektsiya="nastroyki-nova-kolona" class="karta izbrana">
      <div class="dyalglava"><h2>Нова колона</h2><span>ражда се с вида и номенклатурата си</span></div>
      <form id="forma-kolona">
        <div class="poleta">
          <div class="pole">
            <label for="kolona-ime">Име на колоната</label>
            <input translate="no" id="kolona-ime" name="ime" required placeholder="напр. Наемател" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kolona-vid">Вид</label>
            <select translate="no" id="kolona-vid" name="vid">
              <option value="promenlyva">променяща се</option>
              <option value="zatvorena">затворена · сметка или пренесен текст</option>
              <option value="formula">формулна · смята се от други колони</option>
            </select>
          </div>
          <div class="pole">
            <label for="kolona-nomenklatura">Номенклатура</label>
            <select translate="no" id="kolona-nomenklatura" name="nomenklatura">
              <option value="svobodna">${IMENA_NA_NOMENKLATURITE.svobodna}</option>
              <option value="opis">${IMENA_NA_NOMENKLATURITE.opis}</option>
              <option value="vavezhdane">${IMENA_NA_NOMENKLATURITE.vavezhdane}</option>
            </select>
          </div>
          <div class="pole">
            <label for="kolona-menyu">Членове на готовото меню</label>
            <input translate="no" id="kolona-menyu" name="menyu" placeholder="Кеш · Банка" autocomplete="off">
          </div>
        </div>
        ${
          rodnini.length === 0
            ? ''
            : `<div class="tablitsa">
          <div class="glava propusnat"><span>Семейството · еднакви хедъри</span><span>отметнатите получават колоната</span></div>
          ${rodnini
            .map(
              (r) => `<div class="red propusnat" translate="no">
            <span><label class="vazm"><input type="checkbox" data-rodnina="${ekraniraj(r.klyuch)}" checked> ${ekraniraj(r.klyuch)}</label></span>
            <span>новата колона „се появява на таблици, които работят с еднакви хедъри"</span>
          </div>`,
            )
            .join('')}
        </div>`
        }
        <div id="mvsto-za-formula" hidden>
          <div class="poleta tesni">
            <div class="pole">
              <label for="nova-deystvie">Действие</label>
              ${menyuNaDeystviyata('nova-deystvie')}
            </div>
            ${[1, 2, 3]
              .map(
                (nomer) => `<div class="pole">
              <label for="nova-operand${nomer}">${nomer === 3 ? 'Трета · само при сбор' : `${nomer === 1 ? 'Първа' : 'Втора'} колона`}</label>
              <select translate="no" id="nova-operand${nomer}" name="operand${nomer}">
                ${nomer === 3 ? '<option value="">— няма —</option>' : ''}
                ${m.glavi
                  .map((ime, k) =>
                    m.formuli[k] === undefined
                      ? `<option value="${k}">${ekraniraj(ime)} · ${IMENA_NA_VIDOVETE_STOYNOST[m.vidove[k] ?? 'tekst']}</option>`
                      : '',
                  )
                  .join('')}
              </select>
            </div>`,
              )
              .join('')}
          </div>
          <p class="drebno">Формулната колона се ражда ЗАТВОРЕНА и видът ѝ се смята от операндите —
          в нея не се пише, тя се смята. Формулата се дава при създаване; после я мени само Стопанинът.</p>
        </div>
        <p class="greshka" id="greshka-kolona"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Добави колоната</button>
          <button type="button" class="vtorichen" id="otkazhi-kolona">Откажи</button>
          <p class="drebno">Промяната е нов <b>МоделЗаписан</b> със същия ключ — поправка, не презапис. Старата глава остава в историята и старите файлове пак се познават.</p>
        </div>
      </form>
    </section>`;
}

// ── сверките ───────────────────────────────────────────────────────────────
/**
 * ПАРАМЕТРИТЕ ПРИ ВЪВЕЖДАНЕ · осемте вида, настроени за ТОЗИ бизнес (И96 т.1).
 *
 * Негови думи: „Тези неща са **параметри при различни бизнеси** и да може да ги
 * контролираш от Настройки, и дори стопанинът да дава **негова бележка**, когато
 * се случи."
 *
 * Дотук `nastroykiteNaVhoda` и `smeniNastroykiteNaVhoda` бяха построени и НИКОЙ
 * не ги викаше — същата болест като образеца в ADR-041: функция без екран.
 * Одитът на И101 т.4 ги намери поименно; ето им екрана.
 *
 * ЗНАКЪТ И ЦВЕТЪТ стоят до всеки ред, за да се разпознае видът, без да се чете
 * (ADR-032: цветът намира, знакът различава, думата обяснява).
 */
/**
 * ПЕТТЕ МОДЕЛА ПО БРАНШ · честен статус (резен 33 · ADR-093).
 *
 * „Да, но да има зал8жени модели за избор, както е в МС Прочект. Строителна
 * фирма, магазин и още 3 общо най основните 5 модела…" *(р83·[132])*, и трите
 * останали, назовани от него същия ден: „Склад · Услуги · Ресторант"
 * *(р83·[134])*.
 *
 * ═══ КАКВО КАЗВА ТОЗИ БЛОК, КОЕТО ДОСЕГА НЕ СЕ ВИЖДАШЕ ═══
 *
 * Че приложението е за СТРОИТЕЛНА ФИРМА — и то с ЧИСЛО: седемте сектора и
 * седемте потока са нейни. Дотук това беше вярно, но невидимо: човек го
 * научаваше от имената на акумулаторите, ако изобщо ги погледне.
 *
 * Останалите четири стоят с имената си и с честното „чака неговата дума".
 * Празният не се предлага за избор: бутон без последица е надпис (ADR-041).
 */
function blokNaBranshovete(dnes: string): string {
  const redove = branshovete();
  const postroeni = broyPostroeni();
  const sv = sveriBranshovete(dnes);

  return `
    <section data-sektsiya="branshove" data-postroeni="${postroeni}" data-vsichki="${redove.length}">
      <div class="dyalglava">
        <h2>Модели по бранш</h2>
        <span>„както е в МС Прочект" · имената са негови, базата се БРОИ</span>
      </div>

      <div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="branshove">
          <thead>
            <tr><th>Модел</th><th>Състояние</th><th>Какво носи</th><th>Извор</th></tr>
          </thead>
          <tbody>${redove
            .map(
              (r) => `
            <tr data-bransh="${r.klyuch}"${r.postroen ? '' : ' class="chaka"'}>
              <td translate="no">${ekraniraj(r.ime)}</td>
              <td>${r.postroen ? 'построен' : 'чака негова дума'}</td>
              <td>${ekraniraj(r.kakvo)}</td>
              <td class="drebno" translate="no">${ekraniraj(r.izvor)}</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>

      <p class="drebno"><b>${postroeni} от ${redove.length} са построени.</b>
      Имената са НЕГОВИ и са пълни — двете от едно негово изречение, трите от
      следващото същия ден. Чака се „подредената база" за останалите четири:
      кои сектори и кои потоци са техни. Тя не се домисля тук, защото сектор,
      измислен вместо него, влиза в ДДС-акумулатор и почва да смята.</p>

      <p class="drebno" data-branshove-sverka>Сверка вход↔изход: ${sv.vhod} → ${sv.izhod},
      разлика ${sv.razlika}.</p>
    </section>`;
}

function blokNaParametrite(o: Ogledalo): string {
  const n = o.parametriNaVhoda;
  return `
    <section data-sektsiya="parametri">
      <div class="dyalglava">
        <h2>Проверките при въвеждане</h2>
        <span>осем вида · всеки със своя сила и своя бележка · важат за целия бизнес</span>
      </div>
      <div class="tablitsa" data-tablitsa="parametri">
        <div class="glava parametar">
          <span>Вид</span><span>Включен</span><span>Сила</span><span>Твоята бележка</span><span></span>
        </div>
        ${OPISI.map((opis) => redNaParametar(opis, n[opis.vid])).join('')}
      </div>
      <p class="drebno">
        <b>Силата</b> казва дали редът може изобщо да се запише: „спира" отказва при
        Вратата, „предупреждава" оцветява и пуска. <b>Бележката</b> стои под легендата,
        когато този вид се случи — тя не заменя обяснението, а го допълва с думи за
        този бизнес. <b>Замразеният период</b> е единственият, който не се разхлабва:
        подадената справка заключва месеца и това е закон, не параметър (правило 9).
      </p>
    </section>`;
}

function redNaParametar(opis: OpisNaProblem, n: NastroykaNaProblem): string {
  const zakovan = opis.vid === 'zamrazen-period';
  return `
    <div class="red parametar" data-parametar="${ekraniraj(opis.vid)}" translate="no">
      <span class="kletka">
        <span class="znak-problem ${ekraniraj(opis.tsvyat)}">${ekraniraj(opis.znak)}</span>
        <b>${ekraniraj(opis.ime)}</b>
      </span>
      <span>
        <input type="checkbox" data-parametar-vklyuchen${n.vklyuchen ? ' checked' : ''}${
          zakovan ? ' disabled' : ''
        } aria-label="включен">
      </span>
      <span>
        <select translate="no" data-parametar-sila${zakovan ? ' disabled' : ''} aria-label="сила">
          <option value="spira"${n.sila === 'spira' ? ' selected' : ''}>спира</option>
          <option value="preduprezhdava"${n.sila === 'preduprezhdava' ? ' selected' : ''}>предупреждава</option>
        </select>
      </span>
      <span>
        <input translate="no" data-parametar-belezhka value="${ekraniraj(n.belezhka)}"
               maxlength="200" placeholder="${ekraniraj(opis.zashto)}" autocomplete="off">
      </span>
      <span class="butoni">
        ${butonSIkona({
          ikona: 'sverka',
          tekst: 'Запиши',
          title: 'Запиши параметъра в Журнала',
          danni: { 'parametar-zapishi': opis.vid },
        })}
      </span>
    </div>`;
}

/**
 * КОНТРАГЕНТИТЕ · номерата, които одитният файл иска (И96 т.11 · ADR-047).
 *
 * ЕДНА ФОРМА, ТРИ ВИДА. Собствената фирма отива в `Header` на файла, клиентите
 * и доставчиците — в `MasterFiles`. Полетата им са едни и същи; три отделни
 * форми щяха да са три места, които се разминават при първото ново поле.
 *
 * ИМЕТО Е ВРЪЗКАТА. Наемът и разходът вече сочат контрагента по име — затова
 * тук се вписва СЪЩОТО име, а сведеното му изписване ги слива. Нов ключ щеше
 * да иска втора връзка, която никой не поддържа.
 */
/**
 * ЕТАПИТЕ НА ПРОДАЖБАТА · новите колони на таблицата (29.08).
 *
 * Негови думи: „Етапа след акт 15 е в таблицата продажби и какъвто и да е той
 * може да се добави като колона и да се вкара в функционалност по плана, да
 * може всеки да рзвие своя бизнес."
 *
 * ЗАЩО ТУК, А НЕ НА ЕКРАНА ПРОДАЖБИ. Етапът решава дали сумата влиза в
 * колоната „проверка" — тоест системата СМЯТА върху него. Негов закон (И97):
 * „Меню, което ОПИСВА → расте свободно. Меню, върху което системата СМЯТА →
 * расте само от Настройки." А Настройки се вижда само от Стопанина, значи и
 * правото е тукашно, без втора врата към достъпа (правило 23).
 */
function blokNaEtapite(o: Ogledalo): string {
  const spisak = etapite(o);
  const dobaveni = spisak.filter((e) => !e.bazov);
  return `
    <section data-sektsiya="etapi-prodazhbi">
      <div class="dyalglava">
        <h2>Етапите на продажбата</h2>
        <span>всеки нов етап става КОЛОНА в таблица Продажби</span>
      </div>

      <p class="drebno">Негово, 29.08: „Етапа след акт 15 е в таблицата продажби
      и какъвто и да е той <b>може да се добави като колона</b> и да се вкара в
      функционалност по плана, <b>да може всеки да рзвие своя бизнес</b>."</p>

      <form id="forma-etap" class="redditsa">
        <label class="pole">
          <span>Име на етапа</span>
          <input translate="no" name="etap" id="etap-ime" placeholder="както ще стои в главата">
        </label>
        <label class="pole">
          <span>Влиза ли в „проверка"</span>
          <select translate="no" name="vnoska" id="etap-vnoska">
            <option value="da">да · сумата му се брои като вноска</option>
            <option value="ne">не · стои отделно, като неустойката</option>
          </select>
        </label>
        <button type="submit">Добави етап</button>
      </form>
      <p class="greshka" id="greshka-etap"></p>

      <p class="drebno" data-etapi="${spisak.length}" data-dobaveni="${dobaveni.length}">
      ${spisak.length} етапа общо · ${dobaveni.length} добавени.
      ${
        dobaveni.length === 0
          ? 'Нито един още — таблицата стои с неговите седем.'
          : 'Новата колона застава ПРЕДИ „проверка", защото проверката е СБОР върху вноските.'
      }</p>

      <div class="tablitsa" data-tablitsa="etapi-prodazhbi">
        <div class="red glava etapred" translate="no">
          <span class="kletka">Етап</span>
          <span class="kletka">В проверката</span>
          <span class="kletka">Откъде</span>
        </div>
        ${spisak
          .map(
            (e) => `
        <div class="red etapred" translate="no" data-etap="${ekraniraj(e.klyuch)}"
             data-vnoska="${e.vnoska ? 'da' : 'ne'}">
          <span class="kletka">${ekraniraj(e.klyuch)}</span>
          <span class="kletka">${e.vnoska ? 'да' : 'не'}</span>
          <span class="kletka">${e.bazov ? 'негов от начало' : 'добавен'}</span>
        </div>`,
          )
          .join('')}
      </div>

      <p class="drebno"><b>Неговите седем не се презаписват.</b> Те са дума, не
      настройка: кръщаване на нов етап с тяхното име би сменило смисъла на вече
      записани движения — мълчаливо, и назад във времето.</p>
    </section>`;
}

function blokNaKontragentite(o: Ogledalo): string {
  const spisak = [...o.kontragenti.values()].sort(
    (a, b) => a.vid.localeCompare(b.vid) || a.ime.localeCompare(b.ime, 'bg'),
  );
  return `
    <section data-sektsiya="kontragenti">
      <div class="dyalglava">
        <h2>Контрагенти</h2>
        <span>моята фирма · клиенти · доставчици — ЕИК и адрес за одитния файл</span>
      </div>

      <form id="forma-kontragent">
        <div class="poleta">
          <div class="pole">
            <label for="kontragent-vid">Вид</label>
            <select translate="no" id="kontragent-vid" name="vid">
              ${VIDOVE_KONTRAGENT.map(
                (v) => `<option value="${v}">${ekraniraj(IMENA_NA_KONTRAGENTITE[v])}</option>`,
              ).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="kontragent-ime">Име</label>
            <input translate="no" id="kontragent-ime" name="ime" required maxlength="120"
              placeholder="както е в наема или разхода" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kontragent-eik">ЕИК</label>
            <input translate="no" id="kontragent-eik" name="eik" maxlength="13"
              inputmode="numeric" placeholder="9 или 13 цифри" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kontragent-dds">Номер по ДДС</label>
            <input translate="no" id="kontragent-dds" name="ddsNomer" maxlength="14"
              placeholder="BG…" autocomplete="off">
          </div>
        </div>
        <div class="poleta">
          <div class="pole">
            <label for="kontragent-adres">Адрес</label>
            <input translate="no" id="kontragent-adres" name="adres" maxlength="160"
              placeholder="улица и номер" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kontragent-grad">Град</label>
            <input translate="no" id="kontragent-grad" name="grad" maxlength="80" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kontragent-kod">Пощенски код</label>
            <input translate="no" id="kontragent-kod" name="poshtenskiKod" maxlength="12" autocomplete="off">
          </div>
          <div class="pole">
            <label for="kontragent-darzhava">Държава</label>
            <input translate="no" id="kontragent-darzhava" name="darzhava" maxlength="2"
              value="BG" placeholder="BG" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-kontragent"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши контрагента</button>
          <p class="drebno">Контролната цифра на ЕИК се СМЯТА, не се брои — сбъркана при
          преписване цифра пада тук, вместо в НАП. Празно поле минава: то значи „още не е
          вписано" и одитният файл го брои като пречка с думи.</p>
        </div>
      </form>

      ${
        spisak.length === 0
          ? '<p class="prazno">Още няма вписан контрагент.<br>Без данните на фирмата одитният файл няма кой да го подава.</p>'
          : `<div class="tablitsa" data-tablitsa="kontragenti">
        <div class="glava kontragent">
          <span>Име</span><span>Вид</span><span>ЕИК</span><span>По ДДС</span><span>Липсва</span>
        </div>
        ${spisak.map(redNaKontragent).join('')}
      </div>`
      }
    </section>`;
}

function redNaKontragent(kt: Kontragent): string {
  const lipsva = kakvoLipsva(kt);
  return `
    <div class="red kontragent" translate="no">
      <span class="kletka"><b>${ekraniraj(kt.ime)}</b><span>${ekraniraj(
        [kt.adres, kt.grad, kt.darzhava].filter(Boolean).join(', ') || 'без адрес',
      )}</span></span>
      <span>${ekraniraj(IMENA_NA_KONTRAGENTITE[kt.vid] ?? kt.vid)}</span>
      <span>${kt.eik === '' ? '—' : ekraniraj(kt.eik)}</span>
      <span>${kt.ddsNomer === '' ? '—' : ekraniraj(kt.ddsNomer)}</span>
      <span>${
        lipsva.length === 0
          ? '<span class="znachka dobre">пълен</span>'
          : `<span class="znachka trevoga">${ekraniraj(lipsva.join(' · '))}</span>`
      }</span>
    </div>`;
}

function blokNaSverkite(o: Ogledalo): string {
  const posledni = [...o.sverki].reverse().slice(0, 12);
  return `
    <section data-sektsiya="sverki">
      <div class="dyalglava">
        <h2>Записани сверки</h2>
        <span>всяка минала през бутон · и нулевите</span>
      </div>
      ${
        posledni.length === 0
          ? '<p class="prazno">Още няма нито една.<br>Сверката се записва при всяко натискане на бутон, който чете.</p>'
          : `<div class="tablitsa">
        <div class="glava zapisanasverka">
          <span>Бутон и период</span><span class="suma">Файлове</span><span class="suma">Журнал</span>
          <span class="suma">Разлика</span><span></span>
        </div>
        ${posledni.map(redNaSverka).join('')}
      </div>`
      }
      <p class="drebno">${ZASHTO_I_NULATA}</p>
    </section>`;
}

function redNaSverka(s: ZapisanaSverka): string {
  return `
    <div class="red zapisanasverka" translate="no">
      <span class="kletka"><b>${ekraniraj(s.buton)}</b><span>${ekraniraj(s.period)} · ${s.izvori.length} ${
        s.izvori.length === 1 ? 'файл' : 'файла'
      }${s.propusnati ? ` · ${s.propusnati} непрочетени` : ''}</span></span>
      <span class="suma" data-st="${s.vhod_st}">${pishi(s.vhod_st)}</span>
      <span class="suma" data-st="${s.izhod_st}">${pishi(s.izhod_st)}</span>
      <span class="suma${s.razlika_st === 0 ? '' : ' duljimo'}" data-st="${s.razlika_st}">${pishi(s.razlika_st)}</span>
      <span><span class="znachka ${s.razlika_st === 0 ? 'dobre' : 'trevoga'}">${
        s.razlika_st === 0 ? 'затваря' : 'НЕ затваря'
      }</span></span>
    </div>`;
}

// ── честният списък ────────────────────────────────────────────────────────
function blokNaDeystviyata(): string {
  return `
    <section data-sektsiya="patishta">
      <div class="dyalglava">
        <h2>Десетте пътя</h2>
        <span>обявени поименно · построеното си личи</span>
      </div>
      <div class="tablitsa">
        <div class="glava deystvie">
          <span>#</span><span>Път</span><span>Посока</span><span>Състояние</span>
        </div>
        ${DEYSTVIYA.map(
          (d, i) => `<div class="red deystvie" translate="no">
          <span>${i + 1}</span>
          <span>${ekraniraj(d.ime)}</span>
          <span>${POSOKA_S_DUMI[d.posoka]}</span>
          <span><span class="znachka ${
            d.dokade === 'postroen' ? 'dobre' : d.dokade === 'bez-buton' ? 'trevoga' : 'tiha'
          }">${IMENA_NA_DOKADE[d.dokade]}</span></span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Бутон с обявено действие се отказва при създаване — бутон, който мълчи
      при натискане, е по-лош от липсващ бутон. <b>БЕЗ БУТОН</b> е третата дума и значи
      друго: пътят Е построен, но никой викащ не се разклонява по действието — днес
      „Създаване на таблица" се извървява от „Свали образец" в Редактора на хедъри.</p>
    </section>`;
}

/**
 * КАРТАТА НА ВРЪЗКИТЕ · същият честен опис като „Десетте пътя", но за сигналите
 * МЕЖДУ прозорците.
 *
 * `src/domein/vrazki.ts` описва тринайсетте връзки поименно и има `dokade()`,
 * който ги БРОИ. Дотук обаче целият този файл се внасяше само от собствения си
 * тест: числото „седем от тринайсет" живееше ПРЕПИСАНО в `docs/09` §3, а
 * преписаното число се разминава (правило 17 — платено вече три пъти).
 *
 * Оттук нататък се брои на екрана, от същия списък, който `proveriPosoka` пази.
 * Обявената, но непостроена връзка не се крие: връзка, която мълчи при
 * ползване, е по-лоша от липсваща — така го казва и самият модул.
 */
function blokNaKartata(): string {
  const { postroeni, vsichki } = dokade();
  const chakat = obyaveni();
  return `
    <section data-sektsiya="karta">
      <div class="dyalglava">
        <h2>Картата на връзките</h2>
        <span>построени <b>${postroeni}</b> от <b>${vsichki}</b> · броени, не преписани${
          chakat.length === 0
            ? ''
            : ` · чакат: ${ekraniraj(chakat.map((v) => `${v.ot} → ${v.kam}`).join(' · '))}`
        }</span>
      </div>
      <div class="tablitsa">
        <div class="glava deystvie">
          <span>Откъде</span><span>Накъде</span><span>Място</span><span>Състояние</span>
        </div>
        ${VRAZKI.map(
          (v) => `<div class="red deystvie" translate="no">
          <span>${ekraniraj(v.ot)}</span>
          <span>${ekraniraj(v.kam)}${v.ednoposochna ? '' : ' ⇄'}</span>
          <span>${ekraniraj(v.myasto)} · ${ekraniraj(IMENA_NA_FUNKTSIITE[v.funktsiya])}</span>
          <span><span class="znachka ${v.postroena ? 'dobre' : 'tiha'}">${
            v.postroena ? 'построена' : 'обявена'
          }</span></span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Стрелката <b>⇄</b> значи, че сигналът се връща по същия път. Обявената връзка стои в списъка нарочно — <b>връзка, която мълчи при ползване, е по-лоша от липсваща</b>.</p>
    </section>`;
}

// ── закачането ─────────────────────────────────────────────────────────────
export function zakachiNastroyki(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
  /** ДНЕШНИЯТ ден · за затварянето на година (резен 28) */
  dnes = '',
): void {
  // ОТМЕТКАТА ЗА ТАБЛИЦАТА КРЕДИТИ · същата дръжка, втори екран (резен 19).
  zakachiKreditite(koren, k, prerisuvay);

  /**
   * КОЯ Е РОЛЯТА · СМЯТА се от Журнала, не се твърди с литерал.
   *
   * Дотук ДЕСЕТ викащи в затварянето подаваха дословно `'sobstvenik'` (плюс
   * един единайсети в `app/tabove.ts`, поправен със същия ход).
   * Днес това съвпадаше с истината — екранът е само за Стопанина — но пазачът
   * `samoUpravitel` получаваше отговора, който иска, и затова не пазеше нищо:
   * обявена защита без ВИКАЩ е надпис (ADR-041 · ADR-050). Загуби ли екранът
   * `iskaRolya` някой ден, единайсет операции щяха да се отворят мълчешком.
   *
   * Смята се при всяко действие, не веднъж при закачането: Журналът се мени,
   * а закачането става веднъж на рисуване.
   */
  const rolyata = async (): Promise<RolyaNaChovek> =>
    rolyataNa(k.kojSam.imeyl, await k.deystviya.ogledalo());

  // Журналът от таблица (И96 т.8) · своя секция, свое закачане.
  zakachiZhurnalat(koren, k, prerisuvay);
  zakachiGodinite(koren, k, prerisuvay, dnes);

  /**
   * ПАРАМЕТРИТЕ ПРИ ВЪВЕЖДАНЕ (И96 т.1 · ADR-046).
   *
   * Записва се РЕД ПО РЕД, с изричен бутон: осемте вида менят какво влиза през
   * Вратата за целия бизнес, и промяна „в движение", докато човек само гледа
   * списъка, би влязла в Журнала, без той да е решил.
   */
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-parametar-zapishi]')) {
    b.addEventListener('click', async () => {
      const vid = b.dataset['parametarZapishi']!;
      const red = koren.querySelector<HTMLElement>(`[data-parametar="${CSS.escape(vid)}"]`);
      if (!red) return;
      const vklyuchen = red.querySelector<HTMLInputElement>('[data-parametar-vklyuchen]')!.checked;
      const sila = red.querySelector<HTMLSelectElement>('[data-parametar-sila]')!.value;
      const belezhka = red.querySelector<HTMLInputElement>('[data-parametar-belezhka]')!.value;
      b.disabled = true;
      try {
        await k.deystviya.zapishiParametarNaVhoda(
          { vid, vklyuchen, sila, belezhka: belezhka.trim() },
          { opId: crypto.randomUUID() },
        );
        k.vest('dobre', `Проверката „${vid}" е записана. Важи за целия бизнес.`);
      } catch (err) {
        k.vest('zle', dumiZaGreshka(err));
      } finally {
        b.disabled = false;
      }
      await prerisuvay();
    });
  }

  /**
   * КОНТРАГЕНТЪТ (И96 т.11) · вписва се от форма, записва се през Вратата.
   *
   * Отказът се ПОКАЗВА в полето за грешка, а не се преглъща: сбъркан ЕИК е
   * точно онова, което човекът трябва да поправи веднага, докато номерът му
   * е още пред очите му.
   */
  const formaEtap = koren.querySelector<HTMLFormElement>('#forma-etap');
  formaEtap?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const izhod = koren.querySelector<HTMLElement>('#greshka-etap')!;
    izhod.textContent = '';
    const danni = new FormData(formaEtap);
    try {
      await k.deystviya.zapishiEtapNaProdazhba(
        {
          klyuch: String(danni.get('etap') ?? ''),
          vnoska: String(danni.get('vnoska') ?? '') === 'da',
        },
        { opId: `etap-prodazhba:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Етапът е добавен · колоната вече стои в Продажби.');
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    }
  });

  const formaKontragent = koren.querySelector<HTMLFormElement>('#forma-kontragent');
  formaKontragent?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const izhod = koren.querySelector<HTMLElement>('#greshka-kontragent')!;
    izhod.textContent = '';
    const d = new FormData(formaKontragent);
    const vzemi = (ime: string) => String(d.get(ime) ?? '').trim();
    const buton = formaKontragent.querySelector<HTMLButtonElement>('button[type=submit]')!;
    buton.disabled = true;
    try {
      await k.deystviya.zapishiKontragent(
        {
          vid: vzemi('vid'),
          ime: vzemi('ime'),
          eik: vzemi('eik'),
          ddsNomer: vzemi('ddsNomer').toUpperCase(),
          adres: vzemi('adres'),
          grad: vzemi('grad'),
          poshtenskiKod: vzemi('poshtenskiKod'),
          darzhava: vzemi('darzhava').toUpperCase(),
        },
        { opId: crypto.randomUUID() },
      );
      formaKontragent.reset();
      k.vest('dobre', `Контрагентът „${vzemi('ime')}" е записан.`);
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  koren.querySelector<HTMLButtonElement>('#nov-buton')?.addEventListener('click', async () => {
    dobavyam = true;
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-buton')?.addEventListener('click', async () => {
    dobavyam = false;
    greshka = '';
    await prerisuvay();
  });

  const forma = koren.querySelector<HTMLFormElement>('#forma-buton');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-buton')!;
    kazhi.textContent = '';
    const danni = new FormData(forma);

    const modeli = [...koren.querySelectorAll<HTMLInputElement>('[data-model]')]
      .filter((x) => x.checked)
      .map((x) => x.dataset['model']!);

    try {
      const buton = napraviButon({
        klyuch: String(danni.get('ime') ?? ''),
        papka: String(danni.get('papka') ?? ''),
        deystvie: String(danni.get('deystvie')) as Deystvie,
        modeli,
      });
      // Ключът носи ДЕЙСТВИЕТО, не съдържанието (правило 20). Ключ от белега
      // би счупил А → Б → А: третият запис би върнал резултата на първия и
      // бутонът щеше да остане с настройките на Б, макар екранът да казва А.
      // Белегът си остава — но за друго: „смени ли се нещо изобщо".
      const star = (await k.deystviya.ogledalo()).butoni.get(buton.klyuch);
      if (star && belegNaButon(star) === belegNaButon(buton)) {
        dobavyam = false;
        k.vest('dobre', `„${buton.klyuch}" е същият — нищо не влиза в Журнала.`);
        await prerisuvay();
        return;
      }
      await k.deystviya.zapishiButon(buton, { opId: `buton:${crypto.randomUUID()}` });
      dobavyam = false;
      greshka = '';
      k.vest('dobre', `Бутонът „${buton.klyuch}" е записан в папка „${buton.papka}".`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  
  // ── Редакторът на хедъри · двете лица и операциите му ────────────────────
  koren.querySelector<HTMLButtonElement>('#litse-hedari')?.addEventListener('click', async () => {
    litseNaRedaktora = 'hedari';
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#litse-opis')?.addEventListener('click', async () => {
    litseNaRedaktora = 'opis';
    await prerisuvay();
  });
  koren.querySelector<HTMLSelectElement>('#izbor-hedar')?.addEventListener('change', async (e) => {
    izbranHedar = (e.target as HTMLSelectElement).value;
    dobavyamKolona = false;
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#nova-kolona')?.addEventListener('click', async () => {
    dobavyamKolona = true;
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-kolona')?.addEventListener('click', async () => {
    dobavyamKolona = false;
    await prerisuvay();
  });

  /**
   * ПЪТ №4 · образецът от модела (ADR-010 · ADR-041).
   *
   * Не пише НИЩО в Журнала — той е път „pishe" към ФАЙЛ, не към записа.
   * Затова тук няма `opId`, няма сверка и няма събитие: нищо не се е случило
   * с истината, само е слязъл лист хартия.
   */
  koren.querySelector<HTMLButtonElement>('#svali-obrazets')?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    try {
      const m = await hedarSega();
      if (!m) {
        k.vest('zle', 'Първо избери хедър — образецът се прави от модел, не от нищото.');
        return;
      }
      const poleto = koren.querySelector<HTMLInputElement>('#obrazets-redove');
      const iskani = Number(poleto?.value ?? 12);
      // Празните редове са УДОБСТВО: човек пише в тях. Извън разумното те само
      // правят файла тежък, затова се подрязват мълчаливо — това не е данна.
      const redove = Number.isSafeInteger(iskani) ? Math.min(Math.max(iskani, 1), 500) : 12;
      const bayove = rabotnaKniga([obrazetsOtModel(m, redove)]);
      svaliFayl(
        new Blob([bayove.slice().buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `obrazets-${bezopasnoIme(m.klyuch)}-${dnesKato()}.xlsx`,
      );
      k.vest(
        'dobre',
        `Образецът по „${m.klyuch}" е свален · ${m.glavi.length} колони, ${redove} празни реда. ` +
          'Попълни го и го върни през същия бутон — главата му е отпечатъкът, по който се познава.',
      );
    } finally {
      buton.disabled = false;
      await prerisuvay();
    }
  });

  /** Текущият вид на избрания хедър — винаги от Огледалото, не от екрана. */
  const hedarSega = async (): Promise<ModelNaTablitsa | undefined> =>
    (await k.deystviya.ogledalo()).modeli.get(izbranHedar);

  // ТАБЪТ НА ХЕДЪРА (И103) · поправка на модела, не нов вид събитие.
  koren
    .querySelector<HTMLSelectElement>('#izbor-tab-na-hedar')
    ?.addEventListener('change', async (e) => {
      const menyu = e.target as HTMLSelectElement;
      menyu.disabled = true;
      try {
        const m = await hedarSega();
        if (!m) throw new Error('Хедърът вече го няма.');
        // РОЛЯТА се СМЯТА от Журнала, не се твърди с литерал (ADR-050).
        const nov = dayEkran(
          m,
          menyu.value,
          punktoveNaLentata.map((p) => p.klyuch),
          await rolyata(),
        );
        await k.deystviya.zapishiModel(nov, { opId: `model:${crypto.randomUUID()}` });
        greshka = '';
        k.vest(
          'dobre',
          menyu.value === ''
            ? `„${m.klyuch}" вече няма таб — стои в групата „${IME_BEZ_TAB}".`
            : `„${m.klyuch}" стои на таб „${punktoveNaLentata.find((p) => p.klyuch === menyu.value)?.ime ?? menyu.value}".`,
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });

  /**
   * Записва променения хедър: нов МоделЗаписан със същия ключ — поправка, не
   * презапис. Еднакъв белег значи „нищо ново" и в Журнала не влиза нищо.
   */
  const zapishiHedar = async (star: ModelNaTablitsa, nov: ModelNaTablitsa, vest: string) => {
    if (belegNaModel(star) === belegNaModel(nov) && star.otpechatak === nov.otpechatak) {
      k.vest('dobre', `„${star.klyuch}" е същият — нищо не влиза в Журнала.`);
      return;
    }
    await k.deystviya.zapishiModel(nov, { opId: `model:${crypto.randomUUID()}` });
    k.vest('dobre', vest);
  };

  const chlenoveOt = (tekst: string): string[] =>
    tekst
      .split(/[·,;]/)
      .map((c) => c.trim())
      .filter((c) => c !== '');

  /** Формулата, сглобена от падащите менюта на една форма. */
  const formulaOtFormata = (danni: FormData): Formula => {
    const ot = [danni.get('operand1'), danni.get('operand2'), danni.get('operand3')]
      .map((x) => String(x ?? '').trim())
      .filter((x) => x !== '')
      .map(Number);
    return { deystvie: String(danni.get('deystvie')) as DeystvieNaFormula, ot };
  };

  // Полетата на формулата се показват само когато видът е „формулна" —
  // „деликатно скрито", не трето поле, което всеки гледа и не пипа.
  const vidNaNovata = koren.querySelector<HTMLSelectElement>('#kolona-vid');
  const myastoZaFormula = koren.querySelector<HTMLElement>('#mvsto-za-formula');
  vidNaNovata?.addEventListener('change', () => {
    if (myastoZaFormula) myastoZaFormula.hidden = vidNaNovata.value !== 'formula';
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-smeni-formula]')) {
    b.addEventListener('click', async () => {
      smenyamFormula = Number(b.dataset['smeniFormula']);
      await prerisuvay();
    });
  }
  koren.querySelector<HTMLButtonElement>('#otkazhi-formula')?.addEventListener('click', async () => {
    smenyamFormula = null;
    await prerisuvay();
  });

  const formaFormula = koren.querySelector<HTMLFormElement>('#forma-formula');
  formaFormula?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-formula')!;
    kazhi.textContent = '';
    const kolona = Number(formaFormula.dataset['kolona']);
    try {
      const star = await hedarSega();
      if (!star) throw new Error('Хедърът вече го няма — избери наново.');
      const nov = smeniFormula(star, kolona, formulaOtFormata(new FormData(formaFormula)), await rolyata());
      await zapishiHedar(star, nov, `Формулата на „${star.glavi[kolona]}" е сменена.`);
      smenyamFormula = null;
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaKolona = koren.querySelector<HTMLFormElement>('#forma-kolona');
  formaKolona?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-kolona')!;
    kazhi.textContent = '';
    const danni = new FormData(formaKolona);
    const nomenklatura = String(danni.get('nomenklatura'));
    const rodnini = [...koren.querySelectorAll<HTMLInputElement>('[data-rodnina]')]
      .filter((x) => x.checked)
      .map((x) => x.dataset['rodnina']!);
    try {
      const star = await hedarSega();
      if (!star) throw new Error('Хедърът вече го няма — избери наново.');

      // ФОРМУЛНАТА КОЛОНА върви по свой път: тя няма номенклатура и не отива
      // при роднините — формулата сочи НОМЕРА на колони в СВОЯ модел, а
      // роднината има същата глава, но може да носи друг вид в тях.
      if (String(danni.get('vid')) === 'formula') {
        const ime = String(danni.get('ime') ?? '');
        const nov = dobaviFormulnaKolona(star, {
          ime,
          formula: formulaOtFormata(danni),
          rolya: await rolyata(),
        });
        await k.deystviya.zapishiModel(nov, { opId: `model:${crypto.randomUUID()}` });
        dobavyamKolona = false;
        k.vest('dobre', `Формулната колона „${ime.trim()}" е добавена — тя се смята, не се пише.`);
        await prerisuvay();
        return;
      }

      const opts = {
        ime: String(danni.get('ime') ?? ''),
        // Настройки е екранът на главния акаунт (И57); кой е натиснал, пише Вратата.
        rolya: await rolyata(),
        zatvorena: String(danni.get('vid')) === 'zatvorena',
        ...(nomenklatura === 'opis' ? { menyu: chlenoveOt(String(danni.get('menyu') ?? '')) } : {}),
        ...(nomenklatura === 'vavezhdane' ? { otVavezhdane: true } : {}),
      };
      const nov = dobaviKolona(star, opts);
      await k.deystviya.zapishiModel(nov, { opId: `model:${crypto.randomUUID()}` });
      // Семейството: „когато създаваш нови колони в хедърите, те се появяват
      // на таблици, които работят с еднакви хедъри" — отметнатите роднини.
      const og = await k.deystviya.ogledalo();
      for (const ime of rodnini) {
        const rodnina = og.modeli.get(ime);
        if (!rodnina) continue;
        await k.deystviya.zapishiModel(dobaviKolona(rodnina, opts), {
          opId: `model:${crypto.randomUUID()}`,
        });
      }
      dobavyamKolona = false;
      k.vest(
        'dobre',
        `Колоната „${opts.ime.trim()}" е добавена${rodnini.length ? ` · и при ${rodnini.length} от семейството` : ''}.`,
      );
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-zapishi-kolona]')) {
    b.addEventListener('click', async () => {
      const kolona = Number(b.dataset['zapishiKolona']);
      const ime = koren.querySelector<HTMLInputElement>(`[data-ime-vhod="${kolona}"]`)?.value ?? '';
      const menyuTekst =
        koren.querySelector<HTMLInputElement>(`[data-menyu-vhod="${kolona}"]`)?.value ?? '';
      try {
        const star = await hedarSega();
        if (!star) return;
        let nov = star;
        if (ime.trim() !== '' && ime.trim() !== star.glavi[kolona]) {
          nov = preimenuvayKolona(nov, kolona, ime, await rolyata());
        }
        const chlenove = chlenoveOt(menyuTekst);
        const stari = nov.menyuta[kolona] ?? [];
        if (chlenove.length > 0 && chlenove.join('¦') !== stari.join('¦')) {
          nov = zadayMenyu(nov, kolona, chlenove, await rolyata());
        }
        // ВИДЪТ НА СТОЙНОСТТА · това е потвърждението, което `podskazhiVid()`
        // чакаше. Смяната минава само ако наистина се мени — иначе всеки запис
        // на реда би раждал събитие за нищо.
        const izbranVid = koren.querySelector<HTMLSelectElement>(
          `[data-vid-stoynost="${kolona}"]`,
        )?.value as VidStoynost | undefined;
        if (izbranVid && izbranVid !== (nov.vidove[kolona] ?? 'tekst')) {
          nov = smeniVidNaStoynost(nov, kolona, izbranVid, await rolyata());
        }
        await zapishiHedar(star, nov, `Колоната е записана в „${star.klyuch}".`);
        greshka = '';
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-iztriy-menyu]')) {
    b.addEventListener('click', async () => {
      const kolona = Number(b.dataset['iztriyMenyu']);
      // Негово (ред 1994): изтритото меню отваря директно писане и ЗАКЛЮЧВА името.
      if (!confirm('Изтритото меню отваря писане на текст или число — и ЗАКЛЮЧВА името на полето. Продължаваш ли?')) return;
      try {
        const star = await hedarSega();
        if (!star) return;
        const nov = iztriyMenyu(star, kolona, await rolyata());
        await zapishiHedar(star, nov, 'Менюто е изтрито — името на полето е заключено.');
        greshka = '';
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-vavezhdane]')) {
    b.addEventListener('click', async () => {
      const kolona = Number(b.dataset['vavezhdane']);
      try {
        const star = await hedarSega();
        if (!star) return;
        const nov = otbelezhiVavezhdane(star, kolona, await rolyata());
        await zapishiHedar(star, nov, 'Номенклатурата ще се ражда от въвеждането.');
        greshka = '';
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-premahni-kolona]')) {
    b.addEventListener('click', async () => {
      const kolona = Number(b.dataset['premahniKolona']);
      // „Ако няма данни в колоната, никаква информация в таблиците — само
      // тогава може да промениш." (ред 1572) Дали е празна, знае човекът.
      if (
        !confirm(
          'Колони не се трият, а само се добавят. Премахването минава САМО за колона БЕЗ данни в никоя таблица. Потвърждаваш ли, че е празна?',
        )
      )
        return;
      try {
        const star = await hedarSega();
        if (!star) return;
        const nov = premahniKolona(star, kolona, { rolya: await rolyata(), imaDanni: false });
        await zapishiHedar(star, nov, `Колоната е премахната от „${star.klyuch}".`);
        greshka = '';
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-mahni-buton]')) {
    b.addEventListener('click', async () => {
      const ime = b.dataset['mahniButon']!;
      const star = (await k.deystviya.ogledalo()).butoni.get(ime);
      if (!star) return;
      b.disabled = true;
      try {
        const nov = napraviButon({ ...star, modeli: [] });
        await k.deystviya.zapishiButon(nov, { opId: `buton:${crypto.randomUUID()}` });
        k.vest('dobre', `„${ime}" вече приема кой да е познат хедър.`);
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }
}
