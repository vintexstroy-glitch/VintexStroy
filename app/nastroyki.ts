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

import { pishi } from '../src/yadro/pari.js';
import {
  belegNaButon,
  DEYSTVIYA,
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
import {
  ePari,
  IMENA_NA_VIDOVETE_STOYNOST,
  VIDOVE_STOYNOST,
  ZNAK_NA_VIDA,
  type VidStoynost,
} from '../src/domein/vid-stoynost.js';
import { IMENA_NA_ROLITE as ROLI_NA_HORATA } from '../src/yadro/samolichnost.js';
import { klyuchNaPravo,
  IMENA_NA_VIDOVETE,
  napraviPrava,
  pravoNaKolona,
  sPrevklyuchenaVidimost,
  vidNaKolona,
  type PravaZaModel,
} from '../src/domein/kolonno.js';
import { napraviSluzhitel, podredeni, type Sluzhitel } from '../src/domein/sluzhiteli.js';
import type { Rolya as RolyaNaChovek } from '../src/yadro/samolichnost.js';
import type { Ogledalo, ZapisanaSverka } from '../src/ogledalo/ogledalo.js';
import { dumiZaGreshka, ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

/** Отворена ли е формата за нов бутон. Живее, докато екранът стои отворен. */
let dobavyam = false;
let greshka = '';

const POSOKA_S_DUMI: Readonly<Record<string, string>> = Object.freeze({
  chete: 'чете',
  pishe: 'пише',
  smyata: 'смята',
});

/** Кой служител се редактира в момента. Празно значи „никой" — нагласа, не факт. */
let izbranSluzhitel = '';

/**
 * ЕДНОТО МЯСТО с двете лица (И58): „Две отделни, но свързани, и се редактират
 * от едно място СЪС СМЯНА НА РЕДАКТОРА." Смяната е това поле, не втори екран.
 */
let litseNaRedaktora: 'hedari' | 'opis' = 'hedari';
/** Кой хедър е отворен в Редактора. Празно значи „никой". */
let izbranHedar = '';
/** Отворена ли е формата за нова колона. */
let dobavyamKolona = false;
/** Коя формулна колона се мени в момента · `null` значи никоя (И92 т.8). */
let smenyamFormula: number | null = null;

export function narisuvayNastroyki(o: Ogledalo): string {
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
        <span class="chislo" translate="no">${DEYSTVIYA.filter((d) => d.postroeno).length} / ${DEYSTVIYA.length}</span>
        <span class="pod">останалите са обявени, не построени</span>
      </div>
    </div>

    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    ${blokNaButonite(butoni)}
    ${dobavyam ? formaNaButon(modeli) : ''}
    ${blokNaModelite(modeli)}
    ${blokNaRedaktora(modeli)}
    ${blokNaPravata(o, modeli)}
    ${blokNaSverkite(o)}
    ${blokNaDeystviyata()}`;
}

// ── бутоните ───────────────────────────────────────────────────────────────
function blokNaButonite(butoni: readonly Buton[]): string {
  return `
    <section>
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
  const postroeni = DEYSTVIYA.filter((d) => d.postroeno);
  return `
    <section class="karta izbrana">
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
    <section>
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
    <section>
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
      <select id="izbor-hedar">
        <option value="">— избери —</option>
        ${modeli
          .map(
            (m) =>
              `<option value="${ekraniraj(m.klyuch)}"${m.klyuch === izbranHedar ? ' selected' : ''}>${ekraniraj(m.klyuch)} · ${m.glavi.length} колони</option>`,
          )
          .join('')}
      </select>
    </label>
    ${izbran === undefined ? '' : koloniteNa(izbran, modeli)}`;
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
    ${dobavyamKolona ? formaNaKolona(m, modeli) : ''}`;
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
    <section class="karta izbrana">
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
              <select translate="no" id="nova-deystvie" name="deystvie">
                ${DEYSTVIYA_NA_FORMULA.map(
                  (d) => `<option value="${d}">${IMENA_NA_DEYSTVIYATA[d]}</option>`,
                ).join('')}
              </select>
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
// ── колонното право · скритият ред над хедъра ──────────────────────────────
/**
 * ПРАВАТА ПО КОЛОНА · точно неговата картина, без нов екран.
 *
 *   „Когато през настройки от падащо меню избереш служител, в всеки хедър се
 *    показва СКРИТ РЕД НАД ХЕДЪРА с отметки… само криене от служителя на колони
 *    по избор." (12.08)
 *
 * И последната му дума какво прави правото: „За всеки служител с дадена му вече
 * роля и достъп, може с тази функция НЕ ДА РЕДАКТИРА, А ДА СКРИВА САМО."
 *
 * Затова тук няма отметка „редактира": тя се СМЯТА от ролята и от вида на
 * колоната (`mozheDaRedaktiraKolona`), а не се раздава.
 */
function blokNaPravata(o: Ogledalo, modeli: readonly ModelNaTablitsa[]): string {
  const hora = podredeni(o.sluzhiteli.values());
  const izbran = hora.find((h) => h.imeyl === izbranSluzhitel);

  return `
    <section>
      <div class="dyalglava">
        <h2>Кой какво вижда</h2>
        <span>колонно право · скрива, не редактира</span>
      </div>
      ${
        hora.length === 0
          ? `<p class="prazno">Още няма записан служител.<br>Достъпът се дава при доставчика; тук се записва кой работи и с каква роля.</p>`
          : `<label class="pole">
        <span>Служител</span>
        <select id="izbor-sluzhitel">
          <option value="">— избери —</option>
          ${hora.map((h) => optsiyaZaChovek(h, h.imeyl === izbranSluzhitel)).join('')}
        </select>
      </label>`
      }
      ${izbran === undefined ? '' : hedariteNa(izbran, o, modeli)}
      <form id="forma-sluzhitel" class="forma">
        <label class="pole"><span>Имейл</span><input name="imeyl" type="email" required placeholder="ime@gmail.com"></label>
        <label class="pole"><span>Име</span><input name="ime" required placeholder="как му казваш"></label>
        <label class="pole"><span>Роля</span>
          <select name="rolya">
            <option value="redaktor">редактира</option>
            <option value="nablyudatel">наблюдава</option>
            <option value="sobstvenik">собственик</option>
          </select>
        </label>
        <div class="dugmeta">
          <button type="submit" class="glavno">Запиши служителя</button>
          <span id="greshka-sluzhitel" class="greshka"></span>
        </div>
      </form>
      <p class="drebno">Не каним никого и не отнемаме достъп — това е при доставчика (правило 14). Тук се записва кой е пуснат и с каква роля работи вътре.</p>
      <p class="drebno">Скритата колона пак се смята: сборовете ѝ остават в Сметки и в Управление. Скриването пипа екрана, не числата.</p>
    </section>`;
}

function optsiyaZaChovek(h: Sluzhitel, izbran: boolean): string {
  return `<option value="${ekraniraj(h.imeyl)}"${izbran ? ' selected' : ''}>${ekraniraj(
    h.ime,
  )} · ${ROLI_NA_HORATA[h.rolya]}</option>`;
}

function hedariteNa(
  chovek: Sluzhitel,
  o: Ogledalo,
  modeli: readonly ModelNaTablitsa[],
): string {
  if (modeli.length === 0) {
    return '<p class="prazno">Още няма нито един хедър — правото важи за модел, не за екран.</p>';
  }
  return modeli
    .map((m) => hedaraNa(chovek, o.prava.get(klyuchNaPravo(chovek.imeyl, m.klyuch)), m))
    .join('');
}

function hedaraNa(
  chovek: Sluzhitel,
  prava: PravaZaModel | undefined,
  m: ModelNaTablitsa,
): string {
  // Главите дословно, не сведеният отпечатък: „Наем €" и „наем €" не са едно.
  const glavi = m.glavi;
  return `
    <div class="hedar" translate="no">
      <b>${ekraniraj(m.klyuch)}</b>
      <div class="skritred">
        ${glavi.map((ime, k) => kletkaNaPravo(chovek, prava, m, ime, k)).join('')}
      </div>
    </div>`;
}

function kletkaNaPravo(
  chovek: Sluzhitel,
  prava: PravaZaModel | undefined,
  m: ModelNaTablitsa,
  ime: string,
  kolona: number,
): string {
  const vid = vidNaKolona(m, kolona);
  const skrita = pravoNaKolona(prava, kolona) === 'skrito';
  return `
    <label class="pravo${skrita ? ' skrita' : ''}">
      <input type="checkbox"${skrita ? '' : ' checked'}
        data-pravo="${ekraniraj(chovek.imeyl)}"
        data-hedar="${ekraniraj(m.klyuch)}"
        data-kolona="${kolona}">
      <span>${ekraniraj(ime || `колона ${kolona + 1}`)}</span>
      <span class="drebno">${IMENA_NA_VIDOVETE[vid]}</span>
    </label>`;
}

function blokNaSverkite(o: Ogledalo): string {
  const posledni = [...o.sverki].reverse().slice(0, 12);
  return `
    <section>
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
      <p class="drebno">Разликата се записва и когато е нула — иначе „няма разлика" е неразличимо от „не е сверявано".</p>
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
    <section>
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
          <span><span class="znachka ${d.postroeno ? 'dobre' : 'tiha'}">${
            d.postroeno ? 'построен' : 'обявен'
          }</span></span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Бутон с обявено, но непостроено действие се отказва при създаване — бутон, който мълчи при натискане, е по-лош от липсващ бутон.</p>
    </section>`;
}

// ── закачането ─────────────────────────────────────────────────────────────
export function zakachiNastroyki(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
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

  const formaChovek = koren.querySelector<HTMLFormElement>('#forma-sluzhitel');
  formaChovek?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-sluzhitel')!;
    kazhi.textContent = '';
    const danni = new FormData(formaChovek);
    try {
      const chovek = napraviSluzhitel({
        imeyl: String(danni.get('imeyl') ?? ''),
        ime: String(danni.get('ime') ?? ''),
        rolya: String(danni.get('rolya')) as RolyaNaChovek,
      });
      await k.deystviya.zapishiSluzhitel(chovek, { opId: `sluzhitel:${crypto.randomUUID()}` });
      izbranSluzhitel = chovek.imeyl;
      k.vest('dobre', `${chovek.ime} е записан · ${ROLI_NA_HORATA[chovek.rolya]}.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  koren
    .querySelector<HTMLSelectElement>('#izbor-sluzhitel')
    ?.addEventListener('change', async (e) => {
      izbranSluzhitel = (e.target as HTMLSelectElement).value;
      await prerisuvay();
    });

  for (const otmetka of koren.querySelectorAll<HTMLInputElement>('[data-pravo]')) {
    otmetka.addEventListener('change', async () => {
      const imeyl = otmetka.dataset['pravo']!;
      const model = otmetka.dataset['hedar']!;
      const kolona = Number(otmetka.dataset['kolona']);
      otmetka.disabled = true;
      try {
        const og = await k.deystviya.ogledalo();
        const sega = og.prava.get(klyuchNaPravo(imeyl, model)) ?? napraviPrava({ imeyl, model });
        const prava = napraviPrava({
          imeyl,
          model,
          skriti: sPrevklyuchenaVidimost(sega, kolona),
        });
        // Ключът носи ДЕЙСТВИЕТО: скрий → покажи → скрий не бива да се загуби.
        await k.deystviya.zapishiPravo(prava, { opId: `pravo:${crypto.randomUUID()}` });
        k.vest(
          'dobre',
          prava.skriti.includes(kolona)
            ? `Колоната е скрита за ${imeyl}. Сборът ѝ остава.`
            : `Колоната е върната за ${imeyl}.`,
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

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

  /** Текущият вид на избрания хедър — винаги от Огледалото, не от екрана. */
  const hedarSega = async (): Promise<ModelNaTablitsa | undefined> =>
    (await k.deystviya.ogledalo()).modeli.get(izbranHedar);

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
      const nov = smeniFormula(star, kolona, formulaOtFormata(new FormData(formaFormula)), 'sobstvenik');
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
          rolya: 'sobstvenik',
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
        rolya: 'sobstvenik' as RolyaNaChovek,
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
          nov = preimenuvayKolona(nov, kolona, ime, 'sobstvenik');
        }
        const chlenove = chlenoveOt(menyuTekst);
        const stari = nov.menyuta[kolona] ?? [];
        if (chlenove.length > 0 && chlenove.join('¦') !== stari.join('¦')) {
          nov = zadayMenyu(nov, kolona, chlenove, 'sobstvenik');
        }
        // ВИДЪТ НА СТОЙНОСТТА · това е потвърждението, което `podskazhiVid()`
        // чакаше. Смяната минава само ако наистина се мени — иначе всеки запис
        // на реда би раждал събитие за нищо.
        const izbranVid = koren.querySelector<HTMLSelectElement>(
          `[data-vid-stoynost="${kolona}"]`,
        )?.value as VidStoynost | undefined;
        if (izbranVid && izbranVid !== (nov.vidove[kolona] ?? 'tekst')) {
          nov = smeniVidNaStoynost(nov, kolona, izbranVid, 'sobstvenik');
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
        const nov = iztriyMenyu(star, kolona, 'sobstvenik');
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
        const nov = otbelezhiVavezhdane(star, kolona, 'sobstvenik');
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
        const nov = premahniKolona(star, kolona, { rolya: 'sobstvenik', imaDanni: false });
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
