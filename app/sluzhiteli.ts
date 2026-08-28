/**
 * СЛУЖИТЕЛИТЕ · единайсетият екран (резен 14а · И110).
 *
 * Негови думи, 27.08:
 *
 *   „Да има **служители таб** и там да се избират **от падащо меню** и да се
 *    пращат задачите **за приемане** и влизане в таблица и диаграма."
 *
 * И по-рано, за самото изпращане *(р57·[160] · 08.08)*:
 *
 *   „важно да има **копче за всяко дело** да има отговорник и да му се праща
 *    сигнал към календара **РЪЧНО**."
 *
 * Думата „ръчно" е негова и е причината тук да няма нищо автоматично: нищо не
 * тръгва без натиснат бутон, и `actor` в Журнала е онзи, който го е натиснал
 * (правило 18).
 *
 * ═══ ЗАЩО СВОЙ ЕКРАН, а не секция в Настройки ═══
 *
 * Дотук служителите живееха на ЕДНО място и то беше Настройки — а Настройките
 * са за НАСТРОЙВАНЕ. Тук се РАБОТИ: праща се задача, чака се отговор, гледа се
 * кой какво е приел. Двете не се сливат, и той поиска точно таб.
 *
 * Номерът се освободи, защото НАП отиде накрая (И109).
 *
 * ═══ ПРИЕМАНЕТО Е В ПРОГРАМАТА ═══
 *
 * Негово: „по имейл ПО ИЗБОР и **задължително в програмата**". Затова тук няма
 * нито един ред мрежа: изпращането и приемането са събития в Журнала и работят
 * офлайн. Поканата по имейл е резен 14б и се закача ОТГОРЕ, без да мени този.
 */

import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Samolichnost, Rolya as RolyaNaChovek } from '../src/yadro/samolichnost.js';
import { IMENA_NA_ROLITE } from '../src/yadro/samolichnost.js';
import { napraviSluzhitel, podredeni } from '../src/domein/sluzhiteli.js';
import { svediImeyl } from '../src/domein/akaunt.js';
import {
  chakashti,
  IMENA_NA_SASTOYANIYATA,
  sastoyanieNaZadacha,
  zadachiNa,
  type Izprashtane,
  type SastoyanieNaZadacha,
} from '../src/domein/zadachi-kam-hora.js';
import {
  IMENA_NA_OTGOVORITE_OT_KALENDARA,
  KAKVO_NAPUSKA,
  KAKVO_NE_NAPUSKA,
  sabitieZaKalendar,
  type OtgovorOtKalendara,
} from '../src/domein/kalendar.js';
import { mozhe, type Izbor } from '../src/domein/planove.js';
import {
  IMENA_NA_PRAVATA,
  IMENA_NA_VIDOVETE,
  klyuchNaPravo,
  napraviPrava,
  OBYASNENIYA_NA_PRAVATA,
  PRAVA_NA_KOLONA,
  pravoNaKolona,
  sPromenenoPravo,
  stesniVsichki,
  vidNaKolona,
  zashtoNeDeystva,
  type PravaZaModel,
  type PravoNaKolona,
} from '../src/domein/kolonno.js';
import {
  bezTab,
  grupiraniPoTabove,
  IME_BEZ_TAB,
  type PunktNaMenyuto,
  type TablitsaSHedar,
} from '../src/domein/hedari-po-tabove.js';
import { eVgradena, tablitsiteNaProgramata } from './tablitsite.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './ekranite.js';

/** Кого гледам · поглед върху екрана, помни се (ADR-022). */
let izbran = chetiEkranno('sluzhiteli.izbran', '');
let greshka = '';

/**
 * РЕДЪТ НА МЕНЮТО, какъвто човекът го е ВИДЯЛ при последното рисуване.
 *
 * Слушателят на „цяло меню" трябва да знае кои таблици стоят под кой таб. Може
 * да ги прочете от разметката — но тогава ще действа по онова, което DOM-ът
 * казва, а не по онова, което кодът е показал. Затова редът се оставя тук при
 * рисуването и слушателят смята групите ПАК, от същия регистър.
 *
 * Не е втори дом на факта: домът на реда е `podredeniPunktove` (ADR-066); това
 * е следата от последното му четене.
 */
let redNaMenyuto: readonly PunktNaMenyuto[] = [];

export function narisuvaySluzhiteli(
  o: Ogledalo,
  kojSam: Samolichnost,
  dnes: string,
  izbor: Izbor,
  /**
   * РЕДЪТ НА МЕНЮТО · подава се, не се смята пак тук (правило 17).
   *
   * Смятането му пита и плана, и ролята, и записания ред, и личното
   * пренареждане (ADR-066). Втора негова сметка щеше да е второ място, което
   * се разминава — а разминаването тук значи хедър, който в лентата стои под
   * един таб, а в матрицата под друг.
   */
  redNaLentata: readonly PunktNaMenyuto[] = [],
  /** влезлият · Стопанинът ли е (ADR-043 · ролята се СМЯТА от Журнала) */
  negoviyat = true,
): string {
  redNaMenyuto = redNaLentata;
  const az = svediImeyl(kojSam.imeyl);
  /**
   * СТОПАНИНЪТ СТОИ В СПИСЪКА · той също върши дела и също иска лист.
   *
   * Не е „служител" и не се вписва като такъв — той е ПЪРВОТО събитие в Журнала
   * (ADR-043). Затова се добавя тук поименно, с ролята си, вместо да се крие в
   * картата на служителите: скрит там, той щеше да прилича на вписан човек.
   */
  const hora = [
    ...(o.stopanin === ''
      ? []
      : [{ imeyl: o.stopanin, ime: 'Стопанинът', rolya: 'sobstvenik' as const }]),
    ...podredeni(o.sluzhiteli.values()).filter((h) => h.imeyl !== o.stopanin),
  ];
  // Ако запомненият човек го няма (махнат, друг Журнал), пада на СЕБЕ СИ; ако и
  // ти не си в списъка — на ПЪРВИЯ. Празен екран, който не казва защо е празен,
  // е по-лош от чужд лист.
  const kogo = hora.some((h) => h.imeyl === izbran)
    ? izbran
    : hora.some((h) => h.imeyl === az)
      ? az
      : (hora[0]?.imeyl ?? az);

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Хора</span>
        <span class="chislo" translate="no">${hora.length}</span>
        <span class="pod">вписани в програмата</span>
      </div>
      <div class="plochka${chakashti(o.izprateniZadachi, o.otgovoriNaZadachi) ? ' trevoga' : ''}">
        <span class="etiket">Чакат отговор</span>
        <span class="chislo" translate="no">${chakashti(o.izprateniZadachi, o.otgovoriNaZadachi)}</span>
        <span class="pod">изпратени, неотговорени</span>
      </div>
      <div class="plochka">
        <span class="etiket">Изпратени</span>
        <span class="chislo" translate="no">${o.izprateniZadachi.size}</span>
        <span class="pod">откакто има Журнал</span>
      </div>
    </div>

    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    <section data-sektsiya="sluzhiteli-horata" class="karta">
      <div class="dyalglava">
        <h2>Хората в програмата</h2>
        <span>вписваме кой е пуснат — не каним никого (правило 14)</span>
      </div>
      ${
        hora.length === 0
          ? `<p class="prazno">Няма вписан нито един служител.<br>
             Вписва се с формата отдолу — достъпът се дава от Драйва, не оттук.</p>`
          : `<div class="tablitsa">
              <div class="glava"><span>Име</span><span>Имейл</span><span>Роля</span><span>Задачи</span></div>
              ${hora
                .map((h) => {
                  const negovi = zadachiNa(o.izprateniZadachi, h.imeyl);
                  const chakat = negovi.filter(
                    (z) => sastoyanieNaZadacha(o.otgovoriNaZadachi, z.zadachaId) === 'chaka',
                  ).length;
                  return `<div class="red${h.imeyl === kogo ? ' posochen' : ''}" data-chovek="${ekraniraj(h.imeyl)}">
                    <span translate="no"><b>${ekraniraj(h.ime)}</b></span>
                    <span translate="no">${ekraniraj(h.imeyl)}</span>
                    <span>${ekraniraj(IMENA_NA_ROLITE[h.rolya])}</span>
                    <span translate="no">${negovi.length}${chakat ? ` · ${chakat} чакат` : ''}</span>
                  </div>`;
                })
                .join('')}
            </div>`
      }
      ${mozhe(izbor, 'drugi-imeyli') ? formaZaVpisvane(izbor) : `<p class="drebno" data-bez-vpisvane><b>Вписването на други имейли е изключено</b> от Таблото. Вече вписаните СТОЯТ в Журнала и важат.</p>`}
      <p class="drebno">Не каним никого и не отнемаме достъп — това е при доставчика (правило 14).
      Тук се записва кой е пуснат и с каква роля работи вътре.</p>
    </section>

    ${hora.length === 0 ? '' : formaZaPrashtane(o, hora, kogo, dnes, mozhe(izbor, 'kalendar'))}
    ${hora.length === 0 ? '' : listatNa(o, kogo, az)}
    ${sektsiyaNaPravata(o, hora, kogo, izbor, negoviyat)}`;
}

/**
 * ВПИСВАНЕТО НА ЧОВЕК · дойде от Настройки заедно с правата (И103).
 *
 * Дотук списъкът беше тук, а формата — там, и празният екран сочеше към друг
 * екран. „От там се дават" е негово за ПРАВАТА; вписването тръгна след тях,
 * защото е същото изречение: кого добавяш · каква роля му даваш · коя колона
 * му скриваш. Разделени, първите две живееха далеч от третата.
 */
function formaZaVpisvane(izbor: Izbor): string {
  return `
      <form id="forma-sluzhitel" class="forma">
        <label class="pole"><span>Имейл</span><input translate="no" name="imeyl" type="email" required placeholder="ime@gmail.com"></label>
        <label class="pole"><span>Име</span><input translate="no" name="ime" required placeholder="как му казваш"></label>
        ${
          // РОЛИТЕ са своя възможност. Изключени, всеки нов човек влиза като
          // НАБЛЮДАТЕЛ — най-тясното, а не най-широкото: забравена отметка не
          // бива да раздава повече права, отколкото е поискано.
          mozhe(izbor, 'roli-za-dostap')
            ? `<label class="pole"><span>Роля</span>
                 <select translate="no" name="rolya">
                   <option value="redaktor">редактира</option>
                   <option value="nablyudatel">наблюдава</option>
                   <option value="sobstvenik">собственик</option>
                 </select>
               </label>`
            : `<input type="hidden" name="rolya" value="nablyudatel">
               <p class="drebno">Ролите за достъп са изключени — новият влиза като
               <b>наблюдава</b>. Най-тясното, не най-широкото.</p>`
        }
        <div class="dugmeta">
          <button type="submit" class="glavno">Запиши служителя</button>
          <span id="greshka-sluzhitel" class="greshka"></span>
        </div>
      </form>`;
}

/**
 * КОЙ КАКВО ВИЖДА · матрицата, подредена ПО ТАБОВЕТЕ НА МЕНЮТО (И103).
 *
 * Негово: „ОТ ТАМ се дават и хедърите на всички таблици." „Там" е този таб —
 * затова секцията излезе от Настройки и дойде тук. Домът на факта не се
 * раздвоява: темата в Настройки смени адреса си с един ред и води насам, точно
 * както SAF-T смени своя.
 *
 * ТРИТЕ ОБХВАТА са една и съща дума, приложена на три ширини: цяло меню · цяла
 * таблица · една колона. Не са три механизма — записът винаги е право на
 * двойката (служител, таблица), а по-широкият обхват просто пише повече от тях.
 */
function sektsiyaNaPravata(
  o: Ogledalo,
  hora: readonly { readonly imeyl: string; readonly ime: string; readonly rolya: RolyaNaChovek }[],
  kogo: string,
  izbor: Izbor,
  negoviyat: boolean,
): string {
  const tablitsi = tablitsiteNaProgramata(o);
  const grupi = grupiraniPoTabove(tablitsi, redNaMenyuto);
  const chakat = bezTab(tablitsi, redNaMenyuto);

  const glava = `
      <div class="dyalglava">
        <h2>Кой какво вижда</h2>
        <span>колонно право · три думи, и всяка само СТЕСНЯВА</span>
      </div>`;

  if (hora.length === 0) {
    return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <p class="prazno" data-pravata-otkaz>Още няма на кого да се раздават права.<br>
      Вписва се човек по-горе; достъпът се дава при доставчика, не оттук (правило 14).</p>
    </section>`;
  }

  // И57, дословно: „Вижда и скрито са редактор САМО ЗА ГЛАВНИЯ АКАУНТ."
  // Отказът се КАЗВА (правило 15), а не се показва празна секция.
  if (!negoviyat) {
    return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <p class="prazno" data-pravata-otkaz>Правата ги раздава <b>само Стопанинът</b>.<br>
      Тук ще виждаш кой какво вижда, когато той ти даде екрана — но раздаването
      не е втора врата към достъпа (правило 14).</p>
    </section>`;
  }

  if (!mozhe(izbor, 'kolonno-pravo')) {
    return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <p class="drebno" data-pravata-otkaz><b>Колонното право е изключено</b> от Таблото. Вече скритите
      колони СТОЯТ записани в Журнала и важат — изключването маха матрицата, не
      решенията (правило 15: „изключено ≠ липсващо").</p>
    </section>`;
  }

  return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <label class="pole">
        <span>Служител</span>
        <select translate="no" id="izbor-pravo-chovek">
          ${hora
            .map(
              (h) =>
                `<option value="${ekraniraj(h.imeyl)}"${h.imeyl === kogo ? ' selected' : ''}>${ekraniraj(
                  h.ime,
                )} · ${ekraniraj(h.imeyl)}</option>`,
            )
            .join('')}
        </select>
      </label>
      <p class="drebno">Хедъри: <b data-broy-hedari>${tablitsi.length}</b> в
      <b data-broy-grupi>${grupi.length}</b> групи${
        chakat > 0 ? ` · <b data-bez-tab>${chakat}</b> ${ekraniraj(IME_BEZ_TAB)}` : ''
      }. Табът на вносния хедър се дава в Настройки · Редактор на хедъри.</p>
      ${grupi
        .map((g) =>
          grupataNaHedarite(
            o,
            kogo,
            // РОЛЯТА на ИЗБРАНИЯ · тя е ТАВАН и се казва в клетката. Литерал тук
            // би дал на пазача отговора, който иска (ADR-050): наблюдател, на
            // когото пише „редактира", е точно надписът, който правило 15 гони.
            hora.find((h) => h.imeyl === kogo)?.rolya ?? 'nablyudatel',
            g.ekran,
            g.ime,
            g.tablitsi,
          ),
        )
        .join('')}
      <p class="drebno" data-granitsa-upravlenie>Таблицата на <b>Управление</b> още не влиза тук:
      тя не е построена върху колонния описател и имената на колоните ѝ нямаше да
      се прочетат, а да се препишат. Преписано име се разминава — дългът стои с
      адреса си в <code>docs/10</code>.</p>
      <p class="drebno">Скритата колона пак се смята: сборовете ѝ остават в Сметки и в
      Управление. Скриването пипа екрана, не числата.</p>
    </section>`;
}

/** Една група · заглавието ѝ ЗАЛЕПВА при скрол, и то е надпис, не бутон. */
function grupataNaHedarite(
  o: Ogledalo,
  kogo: string,
  rolya: RolyaNaChovek,
  ekran: string,
  ime: string,
  tablitsi: readonly TablitsaSHedar[],
): string {
  return `
      <div class="grupa-hedari" data-grupa-hedari="${ekraniraj(ekran)}">
        <div class="hedari-zaglavie" role="presentation">
          <span translate="no">${ekraniraj(ime)}</span>
          ${lostatNaObhvata('menyu', ekran, kogo, `цяло меню · ${tablitsi.length} таблици`)}
        </div>
        ${tablitsi.map((t) => hedaraNa(o, kogo, rolya, t)).join('')}
      </div>`;
}

/**
 * ЛОСТЪТ НА ОБХВАТА · падащо меню с трите думи и празно НАЧАЛО.
 *
 * Празната първа стойност не е украса: без нея менюто щеше да показва „редактира"
 * като избрано и всяко случайно пипване щеше да ИЗТРИЕ вече раздадени стеснения.
 * Тук изборът е ДЕЙСТВИЕ, не състояние — състоянието е в клетките отдолу.
 */
function lostatNaObhvata(
  vid: 'menyu' | 'tablitsa',
  klyuch: string,
  komu: string,
  nadpis: string,
): string {
  return `<label class="obhvat">
            <span class="drebno">${ekraniraj(nadpis)}</span>
            <select translate="no" data-obhvat="${vid}" data-klyuch="${ekraniraj(
              klyuch,
            )}" data-komu="${ekraniraj(komu)}">
              <option value="">— наведнъж —</option>
              ${PRAVA_NA_KOLONA.map(
                (v) => `<option value="${v}">${IMENA_NA_PRAVATA[v]}</option>`,
              ).join('')}
            </select>
          </label>`;
}

function hedaraNa(o: Ogledalo, kogo: string, rolya: RolyaNaChovek, t: TablitsaSHedar): string {
  const prava = o.prava.get(klyuchNaPravo(kogo, t.klyuch));
  return `
        <div class="hedar" translate="no" data-hedar-red="${ekraniraj(t.klyuch)}">
          <div class="hedar-glava">
            <b>${ekraniraj(t.ime)}</b>
            <span class="drebno" data-otkade>${
              // ЗАЩО ЕДНАТА НЕ СЕ МЕСТИ · вградената се ражда в кода и табът ѝ е
              // закован; вносната го получава в Редактора. Изборът, който го
              // няма, се КАЗВА (правило 15), не се премълчава с липсващ лост.
              eVgradena(t.klyuch)
                ? 'вградена · табът ѝ е закован'
                : 'вносен хедър · табът се дава в Настройки'
            }</span>
            ${lostatNaObhvata('tablitsa', t.klyuch, kogo, `цялата таблица · ${t.glavi.length} колони`)}
          </div>
          <div class="skritred">
            ${t.glavi.map((ime, k) => kletkaNaPravo(kogo, rolya, prava, t, ime, k)).join('')}
          </div>
        </div>`;
}

function kletkaNaPravo(
  kogo: string,
  rolya: RolyaNaChovek,
  prava: PravaZaModel | undefined,
  t: TablitsaSHedar,
  ime: string,
  kolona: number,
): string {
  const vid = vidNaKolona(t, kolona);
  const pravo = pravoNaKolona(prava, kolona);
  // ТРИТЕ ТАВАНА се срещат и важи най-тясното. Ако изборът не действа — защото
  // ролята вече стеснява, или защото колоната е СМЕТКА — това се КАЗВА, а не се
  // преглъща (правило 15). Мълчаливото игнориране прави падащото меню надпис.
  const neDeystva = zashtoNeDeystva({ rolya, vid, pravo });
  return `
            <label class="pravo pravo-${pravo}">
              <span>${ekraniraj(ime || `колона ${kolona + 1}`)}</span>
              <select translate="no"
                data-pravo="${ekraniraj(kogo)}"
                data-hedar="${ekraniraj(t.klyuch)}"
                data-kolona="${kolona}">
                ${PRAVA_NA_KOLONA.map(
                  (v) =>
                    `<option value="${v}"${v === pravo ? ' selected' : ''}>${
                      IMENA_NA_PRAVATA[v]
                    } · ${OBYASNENIYA_NA_PRAVATA[v]}</option>`,
                ).join('')}
              </select>
              <span class="drebno">${IMENA_NA_VIDOVETE[vid]}${
                neDeystva ? ` · <b data-ne-deystva>${ekraniraj(neDeystva)}</b>` : ''
              }</span>
            </label>`;
}

/**
 * КАКВО СЕ КАЗВА СЛЕД ИЗБОРА · по дума, не по номер.
 *
 * Отделна функция, не три реда в слушателя: тя носи обещанието, което човек
 * чува след натискане — че скритата колона ПАК СЕ СМЯТА.
 */
function dumiZaIzbora(novo: PravoNaKolona, imeyl: string): string {
  if (novo === 'skrito') return `Колоната е скрита за ${imeyl}. Сборът ѝ остава.`;
  if (novo === 'vizhda') return `${imeyl} ще я ГЛЕДА, но няма да я пипа.`;
  return `Колоната вече не е стеснена за ${imeyl} — решават ролята и видът ѝ.`;
}

/**
 * ФОРМАТА · падащо меню с хората, падащо меню с делата, и часът ПО ИЗБОР.
 *
 * Часът е празен по подразбиране, защото цялодневното е нормалният случай:
 * „Не, само дата" *(р57·[34])*. Дава се, когато срещата има час — тогава и
 * събитието получава час *(р59·[92])*.
 */
function formaZaPrashtane(
  o: Ogledalo,
  hora: readonly { readonly imeyl: string; readonly ime: string }[],
  kogo: string,
  dnes: string,
  sKalendar: boolean,
): string {
  const dela = [...o.dela.values()].filter((d) => d.otsenka !== 'завършено');
  return `
    <section data-sektsiya="sluzhiteli-prashtane" class="karta">
      <div class="dyalglava">
        <h2>Прати задача</h2>
        <span>ръчно · нищо не тръгва само (негово, р57·[160])</span>
      </div>
      ${
        dela.length === 0
          ? '<p class="prazno">Няма живо дело. Задачата виси на дело — първо се създава то, в Управление.</p>'
          : `<form id="forma-zadacha" autocomplete="off">
              <div class="poleta">
                <div class="pole">
                  <label for="z-chovek">На кого</label>
                  <select translate="no" id="z-chovek" name="imeyl">
                    ${hora
                      .map(
                        (h) =>
                          `<option value="${ekraniraj(h.imeyl)}"${h.imeyl === kogo ? ' selected' : ''}>${ekraniraj(
                            `${h.ime} · ${h.imeyl}`,
                          )}</option>`,
                      )
                      .join('')}
                  </select>
                </div>
                <div class="pole">
                  <label for="z-delo">Кое дело</label>
                  <select translate="no" id="z-delo" name="deloId">
                    ${dela
                      .map(
                        (d) =>
                          `<option value="${ekraniraj(d.id)}"${
                            d.id === chetiEkranno('sluzhiteli.delo', '') ? ' selected' : ''
                          }>${ekraniraj(
                            `${d.ime} · ${d.myasto} · ${d.ot} → ${d.do}`,
                          )}</option>`,
                      )
                      .join('')}
                  </select>
                </div>
              </div>
              <div class="poleta tesni">
                <div class="pole">
                  <label for="z-chas">Час от</label>
                  <input type="time" id="z-chas" name="chas">
                </div>
                <div class="pole">
                  <label for="z-do-chas">Час до</label>
                  <input type="time" id="z-do-chas" name="doChas">
                </div>
              </div>
              <div class="pole">
                <label for="z-belezhka">Бележка</label>
                <input type="text" id="z-belezhka" name="belezhka"
                  placeholder="празно значи името на делото" translate="no">
              </div>
              ${kartaNaPokanata(sKalendar)}
              <div class="deystviya">
                <button type="submit" class="glaven">Прати задачата</button>
                <p class="greshka" id="greshka-zadacha"></p>
              </div>
              <p class="drebno">Датите идват от делото · ${ekraniraj(dnes)} е днес.
              Часът е ПО ИЗБОР: празен значи цял ден. Или и двата часа, или никой.
              Задачата влиза В ПРОГРАМАТА винаги — това е задължителното; поканата
              по имейл е отделен избор и може да не тръгне, без да я пипне.</p>
            </form>`
      }
    </section>`;
}

/**
 * КАРТАТА НА ПОКАНАТА · отметката и ДОСЛОВНИЯТ списък какво напуска.
 *
 * Образецът е `kartaSaglasie` от ИИ-таблото (ADR-029): какво ще прави, какво
 * НЯМА да прави, и кутийка, която НЕ е сложена предварително. Разликата е една
 * и е важна: там съгласието пази ЗАПИС, тук пази ИЗХОДЯЩО ПОВИКВАНЕ, което
 * Вратата изобщо не вижда. Затова списъкът стои РАЗГЪНАТ, не зад „подробности".
 *
 * Списъкът се ЧЕТЕ от домейна (`KAKVO_NAPUSKA`), не се преписва тук: преписан,
 * той щеше да остарее при първото ново поле — а точно този списък не бива да
 * остарява (правило 17).
 */
function kartaNaPokanata(sKalendar: boolean): string {
  if (!sKalendar) {
    // ИЗКЛЮЧЕНО ≠ ЛИПСВАЩО (правило 15) · казва се, че го има и защо не работи.
    return `<p class="drebno">Поканата в календара е ИЗКЛЮЧЕНА за този акаунт.
      Включва се от Таблото · „Какво да се вижда"; без нея задачата пак се праща
      и пак се приема — само че само в програмата.</p>`;
  }
  return `
    <label class="vazm">
      <input type="checkbox" id="i-po-imeyl">
      <span class="vazm-tyalo"><b>И покана по имейл, в календара</b>
      <span>по избор · задачата влиза в програмата и без нея</span></span>
    </label>
    <div class="tablitsa" id="kakvo-napuska">
      <div class="glava opis"><span>Напуска устройството</span><span>НЕ напуска</span></div>
      <div class="red opis" translate="no">
        <span><ul>${KAKVO_NAPUSKA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}</ul></span>
        <span><ul>${KAKVO_NE_NAPUSKA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}</ul></span>
      </div>
    </div>
    <label class="vazm">
      <input type="checkbox" id="razbrah-kalendar">
      <span class="vazm-tyalo"><b>Прочетох какво напуска устройството</b>
      <span>отметката не е сложена предварително — изборът е изричен</span></span>
    </label>`;
}

/** Един ред от листа · състоянието се СМЯТА, не се чете от поле. */
function redNaZadacha(
  o: Ogledalo,
  z: Izprashtane,
  azSam: boolean,
): string {
  const sastoyanie: SastoyanieNaZadacha = sastoyanieNaZadacha(o.otgovoriNaZadachi, z.zadachaId);
  const delo = o.dela.get(z.deloId);
  const otgovor = o.otgovoriNaZadachi.get(z.zadachaId);
  return `<div class="red zadacha-${sastoyanie}" data-zadacha="${ekraniraj(z.zadachaId)}">
    <span translate="no"><b>${ekraniraj(delo?.ime ?? '(изтрито дело)')}</b>
      ${z.belezhka ? `<span class="drebno">${ekraniraj(z.belezhka)}</span>` : ''}</span>
    <span translate="no">${ekraniraj(z.ot)}${z.ot === z.do ? '' : ` → ${ekraniraj(z.do)}`}${
      z.chas ? ` · ${ekraniraj(z.chas)}–${ekraniraj(z.doChas)}` : ' · цял ден'
    }</span>
    <span><b>${ekraniraj(IMENA_NA_SASTOYANIYATA[sastoyanie])}</b>${
      otgovor?.prichina ? `<span class="drebno">${ekraniraj(otgovor.prichina)}</span>` : ''
    }${
      // ДВАТА ОТГОВОРА СТОЯТ ОТДЕЛНО и НЕ се сливат: горният е НАШ факт, от
      // Журнала; долният е на Google и се пита на живо. Слети, човек не би
      // знаел кой от двата гледа — а те могат да се разминават законно.
      z.kalendarId
        ? `<span class="drebno kalendaren" data-kalendar="${ekraniraj(z.kalendarId)}">покана: изпратена</span>`
        : ''
    }</span>
    <span class="butoni">${
      azSam && sastoyanie === 'chaka'
        ? `<button type="button" class="vtorichen malak" data-priemi="${ekraniraj(z.zadachaId)}">Приемам</button>
           <button type="button" class="vtorichen malak" data-otkazhi="${ekraniraj(z.zadachaId)}">Отказвам</button>`
        : ''
    }</span>
  </div>`;
}

/**
 * ЛИСТЪТ · „в листа на всеки служител СИ СЕДИ" (негово).
 *
 * Отказаната не отпада. Отказът е отговор, не изтриване — и точно затова
 * изпращачът вижда, че е питал.
 */
function listatNa(o: Ogledalo, kogo: string, az: string): string {
  const negovite = zadachiNa(o.izprateniZadachi, kogo);
  const azSam = kogo === az;
  return `
    <section data-sektsiya="sluzhiteli-listat" class="karta">
      <div class="dyalglava">
        <h2>Листът на ${ekraniraj(o.sluzhiteli.get(kogo)?.ime ?? (kogo === o.stopanin ? 'Стопанина' : kogo))}</h2>
        <span>${
          azSam
            ? 'това си ти — приемаш или отказваш оттук'
            : 'чуждият лист се ЧЕТЕ · приема го само онзи, на когото е'
        }</span>
      </div>
      ${
        negovite.length === 0
          ? '<p class="prazno">Нито една задача. Изпратената стои тук, докато не бъде отговорена — и след това.</p>'
          : `<div class="tablitsa">
              <div class="glava"><span>Дело</span><span>Кога</span><span>Състояние</span><span></span></div>
              ${negovite.map((z) => redNaZadacha(o, z, azSam)).join('')}
            </div>`
      }
      <p class="drebno">Отказаната задача НЕ изчезва — тя си седи в листа (негово).
      Отказът иска причина, за да не гадае изпращачът.${
        negovite.some((z) => z.kalendarId)
          ? ' Поканата в календара е ОТДЕЛЕН отговор и се пита с бутона до нея —' +
            ' той е на Google, а състоянието вляво е нашето.'
          : ''
      }</p>
      ${
        negovite.some((z) => z.kalendarId)
          ? '<div class="deystviya"><button type="button" class="vtorichen" id="pitay-kalendara">' +
            'Питай календара приел ли е</button></div>'
          : ''
      }
    </section>`;
}

/**
 * ПОКАНАТА · ВТОРА стъпка, никога първа.
 *
 * Свързващата част се тегли с ДИНАМИЧЕН внос — така офлайн изданието не я носи
 * (ADR-063) и правило 10 остава непокътнато: нищо чуждо в готовия пакет, а
 * скриптът на Google се тегли само при натискане.
 *
 * ПРИ УСПЕХ се пише ВТОРИ `ЗадачаИзпратена` със СЪЩИЯ `zadachaId`. Огледалото
 * поправя, вместо да ражда втора задача — това е единственият механизъм, по
 * който мрежов резултат може да влезе в append-only книга СЛЕД записа.
 *
 * ПРИ ОТКАЗ задачата остава както е: изпратена в програмата, без покана. Това
 * не е половин работа, а неговата подредба — „задължително в програмата, по
 * имейл ПО ИЗБОР".
 */
async function pratiPokanata(
  k: Konteks,
  izprashtane: Izprashtane,
  delo: { readonly ime: string },
  izhod: HTMLElement,
): Promise<void> {
  try {
    const { KalendaratNaGoogle, vzemiZhetonZaKalendar } = await import('./kalendar-google.js');
    const kalendar = new KalendaratNaGoogle(await vzemiZhetonZaKalendar());
    const kalendarId = await kalendar.pokani(
      sabitieZaKalendar(izprashtane, delo as Parameters<typeof sabitieZaKalendar>[1]),
    );
    await k.deystviya.pratiZadacha(
      { ...izprashtane, poImeyl: true, kalendarId },
      { opId: crypto.randomUUID() },
    );
    k.vest('dobre', 'Задачата е изпратена И поканата тръгна. Отговорът ѝ ще се види тук.');
  } catch (err) {
    // ЗАДАЧАТА НЕ СЕ ОТМЕНЯ · тя вече е в програмата и това е задължителното.
    //
    // КАЗВА СЕ С ВЕСТ, не в полето на формата. Полето живее ВЪТРЕ в екрана и
    // умира при следващото прерисуване — а точно тук прерисуване има веднага
    // след връщането. Съобщение, изтрито в същия миг, е по-лошо от липсващо:
    // човек вижда „изпратена" и нищо повече, и остава с усещането, че поканата
    // е тръгнала. Вестта стои в черупката и преживява прерисуването.
    izhod.textContent = '';
    k.vest('zle', `Задачата е записана, но поканата НЕ тръгна: ${dumiZaGreshka(err)}`);
  }
}

export function zakachiSluzhitelite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  for (const red of koren.querySelectorAll<HTMLElement>('[data-chovek]')) {
    red.addEventListener('click', async () => {
      izbran = red.dataset.chovek ?? '';
      zapomniEkranno('sluzhiteli.izbran', izbran);
      await prerisuvay();
    });
  }

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
      izbran = chovek.imeyl;
      zapomniEkranno('sluzhiteli.izbran', izbran);
      k.vest('dobre', `${chovek.ime} е записан · ${IMENA_NA_ROLITE[chovek.rolya]}.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  // ── колонното право · трите обхвата (И103) ──────────────────────────────
  koren
    .querySelector<HTMLSelectElement>('#izbor-pravo-chovek')
    ?.addEventListener('change', async (e) => {
      izbran = (e.target as HTMLSelectElement).value;
      zapomniEkranno('sluzhiteli.izbran', izbran);
      await prerisuvay();
    });

  for (const menyu of koren.querySelectorAll<HTMLSelectElement>('select[data-pravo]')) {
    menyu.addEventListener('change', async () => {
      const imeyl = menyu.dataset['pravo']!;
      const model = menyu.dataset['hedar']!;
      const kolona = Number(menyu.dataset['kolona']);
      const novo = menyu.value as PravoNaKolona;
      menyu.disabled = true;
      try {
        const og = await k.deystviya.ogledalo();
        const sega = og.prava.get(klyuchNaPravo(imeyl, model)) ?? napraviPrava({ imeyl, model });
        // Ключът носи ДЕЙСТВИЕТО: скрий → върни → скрий не бива да се загуби.
        await k.deystviya.zapishiPravo(sPromenenoPravo(sega, kolona, novo), {
          opId: `pravo:${crypto.randomUUID()}`,
        });
        k.vest('dobre', dumiZaIzbora(novo, imeyl));
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  /**
   * ЦЯЛА ТАБЛИЦА И ЦЯЛО МЕНЮ · един и същ слушател, две ширини.
   *
   * Записът е ЕДИН НА ТАБЛИЦА, защото правото е на двойката (служител, хедър).
   * Цял таб значи N записа — и това се КАЗВА с число, преди да се сметне за
   * едно действие: човек трябва да знае колко реда влизат в Журнала му.
   */
  for (const lost of koren.querySelectorAll<HTMLSelectElement>('select[data-obhvat]')) {
    lost.addEventListener('change', async () => {
      if (lost.value === '') return;
      const novo = lost.value as PravoNaKolona;
      const shirok = lost.dataset['obhvat'] === 'menyu';
      const klyuch = lost.dataset['klyuch']!;
      const komu = lost.dataset['komu']!;
      lost.disabled = true;
      try {
        const og = await k.deystviya.ogledalo();
        const vsichki = tablitsiteNaProgramata(og);
        const zasegnati = shirok
          ? grupiraniPoTabove(vsichki, redNaMenyuto).find((g) => g.ekran === klyuch)?.tablitsi ?? []
          : vsichki.filter((t) => t.klyuch === klyuch);
        if (zasegnati.length === 0) throw new Error('Тази група вече я няма — отвори екрана наново.');
        for (const t of zasegnati) {
          const sega =
            og.prava.get(klyuchNaPravo(komu, t.klyuch)) ??
            napraviPrava({ imeyl: komu, model: t.klyuch });
          await k.deystviya.zapishiPravo(stesniVsichki(sega, t.glavi.length, novo), {
            opId: `pravo:${crypto.randomUUID()}`,
          });
        }
        k.vest(
          'dobre',
          `„${IMENA_NA_PRAVATA[novo]}" за ${zasegnati.length} ${
            zasegnati.length === 1 ? 'таблица' : 'таблици'
          } · ${zasegnati.length} записа в Журнала. Скритото пак се смята.`,
        );
      } catch (err) {
        greshka = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }

  const forma = koren.querySelector<HTMLFormElement>('#forma-zadacha');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const izhod = koren.querySelector<HTMLElement>('#greshka-zadacha')!;
    izhod.textContent = '';
    const d = new FormData(forma);
    const deloId = String(d.get('deloId') ?? '');
    const o = await k.deystviya.ogledalo();
    const delo = o.dela.get(deloId);
    if (!delo) {
      izhod.textContent = 'Делото изчезна, докато формата стоеше отворена. Отвори екрана наново.';
      return;
    }
    const buton = forma.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const poImeyl = koren.querySelector<HTMLInputElement>('#i-po-imeyl')?.checked ?? false;
    const razbrah = koren.querySelector<HTMLInputElement>('#razbrah-kalendar')?.checked ?? false;
    // СЪГЛАСИЕТО СЕ ПРОВЕРЯВА ПРЕДИ ЗАПИСА · инак задачата влиза, поканата не
    // тръгва, и човек остава с усещането, че е пратил и двете.
    if (poImeyl && !razbrah) {
      izhod.textContent =
        'Отметката „прочетох какво напуска устройството" не е сложена — покана без нея не тръгва.';
      return;
    }

    buton.disabled = true;
    const zadachaId = crypto.randomUUID();
    try {
      // ДАТИТЕ ИДВАТ ОТ ДЕЛОТО · не се въвеждат втори път. Два входа за едно
      // число се разминават, а тук разминаването значи задача за друг ден.
      //
      // ЗАПИСЪТ Е ПЪРВИ И ВИНАГИ `poImeyl: false`. Негово: задачата влиза в
      // програмата ЗАДЪЛЖИТЕЛНО, поканата е по избор. Ако Google откаже,
      // задачата пак е изпратена — и Журналът не твърди покана, която я няма.
      const izprashtane = {
        zadachaId,
        deloId,
        imeyl: String(d.get('imeyl') ?? ''),
        ot: delo.ot,
        do: delo.do,
        chas: String(d.get('chas') ?? ''),
        doChas: String(d.get('doChas') ?? ''),
        poImeyl: false,
        kalendarId: '',
        belezhka: String(d.get('belezhka') ?? ''),
        kogato: new Date().toISOString(),
      };
      await k.deystviya.pratiZadacha(izprashtane, { opId: crypto.randomUUID() });
      k.vest('dobre', 'Задачата е изпратена. Стои в листа му, докато не отговори.');

      if (poImeyl) await pratiPokanata(k, izprashtane, delo, izhod);
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  /**
   * ПИТАЙ КАЛЕНДАРА · негово „на Стопанина му показва приел ли е".
   *
   * Отговорът НЕ се записва в Журнала. Той е факт на Google, не наш — записан,
   * той щеше да има два дома и да се разминава при всяка смяна (правило 17).
   * Показва се на живо, до нашето състояние, и двете стоят ОТДЕЛНО.
   */
  koren.querySelector<HTMLButtonElement>('#pitay-kalendara')?.addEventListener('click', async (e) => {
    const buton = e.currentTarget as HTMLButtonElement;
    buton.disabled = true;
    try {
      const { KalendaratNaGoogle, vzemiZhetonZaKalendar } = await import('./kalendar-google.js');
      const kalendar = new KalendaratNaGoogle(await vzemiZhetonZaKalendar());
      for (const belyag of koren.querySelectorAll<HTMLElement>('[data-kalendar]')) {
        const otgovor: OtgovorOtKalendara = await kalendar.otgovorat(belyag.dataset.kalendar!);
        belyag.textContent = `покана: ${IMENA_NA_OTGOVORITE_OT_KALENDARA[otgovor]}`;
      }
      k.vest('dobre', 'Питахме календара. Това е неговият отговор, не нашият запис.');
    } catch (err) {
      k.vest('zle', dumiZaGreshka(err));
      await prerisuvay();
    } finally {
      buton.disabled = false;
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-priemi], [data-otkazhi]')) {
    b.addEventListener('click', async () => {
      const priema = b.dataset.priemi !== undefined;
      const zadachaId = b.dataset.priemi ?? b.dataset.otkazhi!;
      // ОТКАЗЪТ ИСКА ПРИЧИНА · пита се ПРЕДИ записа, както при сторното.
      const prichina = priema ? '' : (prompt('Защо отказваш задачата?') ?? '').trim();
      if (!priema && prichina === '') {
        k.vest('zle', 'Отказът иска причина — инак изпращачът гадае защо.');
        await prerisuvay();
        return;
      }
      b.disabled = true;
      try {
        await k.deystviya.otgovoriNaZadacha(
          {
            zadachaId,
            otgovor: priema ? 'prieta' : 'otkazana',
            prichina,
            kogato: new Date().toISOString(),
          },
          { opId: crypto.randomUUID() },
        );
        k.vest('dobre', priema ? 'Задачата е приета.' : 'Задачата е отказана, с причина.');
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
        greshka = '';
      } finally {
        b.disabled = false;
      }
    });
  }
}
