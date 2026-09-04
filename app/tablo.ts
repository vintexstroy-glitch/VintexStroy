/**
 * ТАБЛОТО · кой съм · какъв е планът · какво е включено.
 *
 * Тук стои единственото място, където собственикът вижда СЕБЕ СИ в приложението
 * и решава какво да гледа. Неговите думи го определят изцяло:
 *
 *   „Ще има ЦЯЛАТА функционалност и ще се прилагат филтри на възможностите на
 *    ТАБЛОТО на този пълен потенциал… Най-добре индивидуално да се дава избор
 *    с ОТМЕТКИ на функционалностите."
 *
 * Затова екранът е точно три неща и нищо повече:
 *   1. КОЙ СЪМ — вход без парола, хранилище, вързани акаунти;
 *   2. ОТМЕТКИТЕ — включеното се вижда, изключеното изчезва СЕГА, не при
 *      следващо влизане;
 *   3. СРАВНЕНИЕТО — четирите плана един до друг, с честната колона „какво
 *      трябва да имаш при доставчика".
 *
 * Отметките живеят в localStorage, НЕ в Журнала. Това е нагласата на този
 * екран, не факт от историята — Журналът пази какво се е случило с парите,
 * а не кой бутон е бил скрит.
 */

import {
  IMENA_NA_DOSTAVCHITSITE,
  IMENA_NA_ROLITE,
  type Rolya,
  type Samolichnost,
} from '../src/yadro/samolichnost.js';
import {
  eIzklyuchena,
  type Izbor,
  izborPoPodrazbirane,
  mozhe,
  OPISANIE,
  OSHTE_NE_E_ZAPOCHNATO,
  plan,
  PLAN_PO_PODRAZBIRANE,
  PLANOVE,
  stigaLiHranilishteto,
  type Vazmozhnost,
  ZADALZHITELNI,
  prevklyuchi,
  smeniPlan,
} from '../src/domein/planove.js';
import { sDumiZaAkaunta } from '../src/domein/akaunt.js';
import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { butonSIkona } from './ikoni.js';
import { kolkoMyasto } from '../src/nositel/hranilishte.js';
import { presmetni, sDumi, type KvotaNaDrayva } from '../src/domein/spiratchka.js';
import { NESKRIVAEMI, prevklyuchiPunkt, zabraviMoyaRed } from './lenta.js';
import { IMENA_NA_GRUPITE, grupataNa, rabotnite } from '../src/domein/lenta.js';
import { REDAT_NA_LENTATA } from './ekranite.js';
import { dumiteNaProbvaneto, probvanetoEIzteklo, type Probvane } from '../src/domein/probvane.js';

const KLYUCH = 'masterbook:izbor';

interface ZapisanIzbor {
  readonly plan: string;
  readonly vklyucheni: readonly string[];
}

/** Чете нагласата от този браузър; каквото не се разчита — пада към пълния план. */
export function chetiIzbor(): Izbor {
  try {
    const surovo = localStorage.getItem(KLYUCH);
    if (!surovo) return izborPoPodrazbirane();
    const zapis = JSON.parse(surovo) as ZapisanIzbor;
    const p = plan(zapis.plan);
    const vklyucheni = new Set<Vazmozhnost>();
    for (const v of zapis.vklyucheni ?? []) {
      if (p.vazmozhnosti.has(v as Vazmozhnost)) vklyucheni.add(v as Vazmozhnost);
    }
    for (const v of ZADALZHITELNI) if (p.vazmozhnosti.has(v)) vklyucheni.add(v);
    return { plan: p, vklyucheni };
  } catch {
    return izborPoPodrazbirane();
  }
}

function zapishiIzbor(izbor: Izbor): void {
  try {
    const zapis: ZapisanIzbor = {
      plan: izbor.plan.klyuch,
      vklyucheni: [...izbor.vklyucheni],
    };
    localStorage.setItem(KLYUCH, JSON.stringify(zapis));
  } catch {
    // Частен прозорец: изборът важи за тази сесия и не се помни. Не е повреда.
  }
}

/** Редът, в който отметките се показват — както се ползват, не по азбука. */
const RED: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'iztochnitsi',
  'ogledala',
  'fini-filtri',
  'arhiv-eksel',
  'iznos-vnos',
  'drugi-imeyli',
  'roli-za-dostap',
  'kolonno-pravo',
  'poveche-hranilishte',
  'individualni-razrabotki',
  'svarzhi-ii',
  'kalendar',
];

function kartaKoySam(koj: Samolichnost, akaunt: string, stopanin: string, rolya: Rolya): string {
  const vrazki = koj.svarzani.length
    ? koj.svarzani.map((d) => IMENA_NA_DOSTAVCHITSITE[d]).join(' · ')
    : 'няма вързани';

  return `
    <section class="karta" data-sektsiya="koy-sam">
      <div class="dyalglava">
        <h2>Кой съм</h2>
        <span>вход без парола · самоличността идва отвън</span>
      </div>
      <div class="plochki">
        <div class="plochka">
          <div class="etiket">Влязъл като</div>
          <div class="chislo malak" translate="no">${ekraniraj(koj.ime)}</div>
          <div class="pod">${ekraniraj(koj.imeyl)}</div>
        </div>
        <div class="plochka">
          <div class="etiket">През</div>
          <div class="chislo malak" translate="no">${IMENA_NA_DOSTAVCHITSITE[koj.dostavchik]}</div>
          <div class="pod">${
            koj.nachin === 'klyuch' ? 'с ключ на тази машина' : 'през доставчика'
          }</div>
        </div>
        <div class="plochka">
          <div class="etiket">Хранилище</div>
          <div class="chislo malak" translate="no" data-hranilishte="${ekraniraj(koj.hranilishte)}">${
            koj.hranilishte === 'платено'
              ? 'Платено'
              : koj.hranilishte === 'безплатно'
                ? 'Безплатно'
                : 'Не е питано'
          }</div>
          <div class="pod">при ${IMENA_NA_DOSTAVCHITSITE[koj.dostavchik]}, не при нас</div>
        </div>
        <div class="plochka">
          <div class="etiket">Роля</div>
          <div class="chislo malak" translate="no">${IMENA_NA_ROLITE[rolya]}</div>
          <div class="pod">вързани акаунти: ${ekraniraj(vrazki)}</div>
        </div>
        <div class="plochka" data-pole="stopanin">
          <div class="etiket">Стопанин</div>
          <div class="chislo malak" translate="no">${
            stopanin === '' ? '—' : ekraniraj(stopanin)
          }</div>
          <div class="pod">${
            stopanin === ''
              ? 'този Журнал е започнат, преди Стопанинът да се записва'
              : stopanin === koj.imeyl
                ? 'това си ти · първото събитие в Журнала'
                : 'главният имейл на този Журнал'
          }</div>
        </div>
        <div class="plochka">
          <div class="etiket">Кой Журнал</div>
          <div class="chislo malak" translate="no">${ekraniraj(akaunt)}</div>
          <div class="pod">${ekraniraj(sDumiZaAkaunta(akaunt).split(' · ')[1] ?? '')}</div>
        </div>
      </div>
      <p class="drebno">
        Приложението никога не вижда парола — няма своя, няма възстановяване,
        няма какво да изтече. Достъпът на други имейли минава през твоя
        доставчик: поканата, защитата и отнемането са негови, не наши.
      </p>
      <p class="drebno" data-pole="granitsa-na-knigata">
        <b>Ключът на Журнала идва от ТВОЯ имейл.</b> Влезеш ли от друго
        устройство със същия имейл, отваря се същата книга. Влезе ли ДРУГ човек —
        своя. Две книги НЕ се сливат: всеки писач има своя верига и нищо не се
        презаписва. <b>Пренасянето минава през Драйва</b> — бутам само своята
        верига, дърпам чуждите и всяка се проверява, преди да влезе. Несъгласията
        (двойно начислен месец, преплатено вземане) не се решават сами: излизат
        като находки при „Провери", защото поправката е решение на човек.
      </p>
      <div class="deystviya" data-sektsiya="prenasyane">
        <button type="button" class="vtorichen" id="drapni-drayv">Дръпни от Драйва</button>
        <button type="button" class="vtorichen" id="butni-drayv">Бутни в Драйва</button>
        <p class="drebno">
          Достъпът е <b>второ съгласие</b>, не второ влизане: Google пита
          отделно и приложението вижда САМО своите файлове, не целия Драйв.
          Разрешението живее в този раздел и не се пази никъде.
        </p>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="izlez">Излез</button>
        <p class="drebno">
          Излизането маха <b>кой е влязъл</b> — Журналът остава на устройството.
          Влизането обратно със същия имейл отваря същия Журнал.
        </p>
      </div>
    </section>`;
}

function redNaOtmetka(izbor: Izbor, v: Vazmozhnost): string {
  const ima = izbor.plan.vazmozhnosti.has(v);
  const vklyuchena = mozhe(izbor, v);
  const zadalzhitelna = ZADALZHITELNI.has(v);
  const skoro = OSHTE_NE_E_ZAPOCHNATO.has(v);

  const znachka = !ima
    ? '<span class="znachka tiha">няма я в този план</span>'
    : skoro
      ? '<span class="znachka tiha">скоро · още не е построено</span>'
      : zadalzhitelna
        ? '<span class="znachka tiha">основата</span>'
        : vklyuchena
          ? '<span class="znachka dobre">включена</span>'
          : '<span class="znachka tiha">изключена</span>';

  return `
    <label class="vazm${ima ? '' : ' nyama'}">
      <input type="checkbox" data-vazmozhnost="${v}"
        ${vklyuchena ? 'checked' : ''}
        ${!ima || zadalzhitelna ? 'disabled' : ''}>
      <span class="vazm-tyalo">
        <b>${ekraniraj(OPISANIE[v].split('.')[0] ?? v)}</b>
        <span>${ekraniraj(OPISANIE[v])}</span>
      </span>
      ${znachka}
    </label>`;
}

function kartaOtmetki(izbor: Izbor): string {
  const izklyucheni = RED.filter((v) => eIzklyuchena(izbor, v)).length;

  return `
    <section data-sektsiya="tablo-vazmozhnosti" class="karta">
      <div class="dyalglava">
        <h2>Възможности</h2>
        <span>${
          izklyucheni === 0
            ? 'всичко от плана е включено'
            : `${izklyucheni} ${izklyucheni === 1 ? 'изключена' : 'изключени'} — планът пак ги дава`
        }</span>
      </div>
      <div class="vazmozhnosti" data-sektsiya="vazmozhnosti">${RED.map((v) => redNaOtmetka(izbor, v)).join('')}</div>
      <p class="drebno">
        Изключената възможност изчезва от лентата и от бутоните веднага. Тя не е
        отнета — планът пак я дава и отметката я връща. Затова „изключена" и
        „няма я в този план" са различни думи тук.
      </p>
    </section>`;
}

/**
 * КАРТАТА „МЕНЮТО" · тук се ВРЪЩА скритото и оттук се ПУБЛИКУВА редът (И111).
 *
 * ═══ ЗАЩО ТЯ Е ЕДНА, А ДЕЙСТВИЯТА СА ТРИ ═══
 *
 * Редът се подрежда от Настройки · „Подредбата на екраните" (ADR-117: „Махни
 * това смешно разместване. То ще се прави от всеки стопанин от настройки") —
 * дотук тук пишеше „в лентата, там са стрелките", а стрелките паднаха от нея.
 * Тук стоят ДРУГИТЕ три неща, които там нямат място:
 *
 *   · ВИДИМОСТТА · отметка на всеки пункт, ЛИЧНА. Скритият пункт го няма в
 *     лентата — значи няма и къде да се върне от нея. Затова картата изрежда
 *     ВСИЧКИ, не само видимите (правило 15: изключено ≠ липсващо).
 *   · „ЗАБРАВИ МОЯ РЕД" · връща реда на Стопанина. Без него човек, разместил
 *     веднъж, няма как да се върне към общия — а „върни както беше" е първото,
 *     което се търси след разместване.
 *   · „ЗАПИШИ НАЧАЛНИЯ РЕД" · САМО за Стопанина. Взима РЕДА, който той вижда в
 *     момента, и го записва като началния за ВСИЧКИ. Едно събитие, при натиснат
 *     бутон — не при всяко местене: инак Журналът щеше да се пълни с междинни
 *     подредби, а те не са решения, а движение на ръката.
 *
 * ЕДНА ВРАТА, ДВЕ ДРЪЖКИ. Редът се мени на едно място (Настройки) и се
 * ПУБЛИКУВА на друго. Дотук същият похват е в `kontekstno-menyu.ts`: „менюто е
 * втора дръжка на същата врата, не втора врата."
 */
function kartaLenta(
  punktove: readonly { readonly klyuch: string; readonly ime: string; readonly skrit: boolean }[],
  negov: boolean,
  moyatRedEPipnat: boolean,
): string {
  const skriti = punktove.filter((p) => p.skrit).length;
  const rabotni = rabotnite(REDAT_NA_LENTATA);
  return `
    <section data-sektsiya="tablo-lenta" class="karta">
      <div class="dyalglava">
        <h2>Менюто</h2>
        <span>${
          skriti === 0
            ? `${punktove.length} пункта · нищо не е скрито`
            : `${skriti} ${skriti === 1 ? 'скрит пункт' : 'скрити пункта'} от ${punktove.length}`
        }</span>
      </div>
      <div class="vazmozhnosti" data-sektsiya="lenta-punktove">
        ${punktove
          .map(
            (p, i) => `${
              // РАЗДЕЛИТЕЛЯТ И ТУК (резен 118 · ADR-163) · пред първия от втората
              // група; без белег на пункт, за да не се брои като пункт.
              i > 0 && grupataNa(p.klyuch, rabotni) === 'vtorostepennite' && grupataNa(punktove[i - 1]!.klyuch, rabotni) === 'rabotata'
                ? `<p class="drebno navrazdel" data-lenta-razdel="vtorostepennite">${IMENA_NA_GRUPITE.vtorostepennite}</p>`
                : ''
            }
          <label class="vazm${p.skrit ? ' izklyuchena' : ''}">
            <input type="checkbox" data-punkt="${ekraniraj(p.klyuch)}"${p.skrit ? '' : ' checked'}${
              NESKRIVAEMI.includes(p.klyuch) ? ' disabled' : ''
            }>
            <span class="vazm-tyalo">
              <b>${ekraniraj(p.ime)}</b>
              <span>${
                NESKRIVAEMI.includes(p.klyuch)
                  ? p.klyuch === 'tablo'
                    ? 'не се скрива — оттук се връща скритото'
                    : 'не се скрива — темите му са различни за всяка роля'
                  : p.skrit
                    ? 'скрит от МОЯТА лента · другите не са пипнати'
                    : 'вижда се'
              }</span>
            </span>
          </label>`,
          )
          .join('')}
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="zabravi-moya-red"${
          moyatRedEPipnat ? '' : ' disabled'
        }>Забрави моя ред</button>
        ${
          negov
            ? `<button type="button" class="glaven" id="zapishi-nachalniya-red">Запиши началния ред за всички</button>`
            : ''
        }
      </div>
      <p class="drebno">
        Редът се мести от Настройки · „Подредбата на екраните" и е <b>твой</b> —
        нула записа в Журнала; местенето е вътре в групата (резен 118). ${
          negov
            ? 'Бутонът горе взима реда, който виждаш СЕГА, и го записва като НАЧАЛНИЯ за всички; всеки после може да го пренарежда за себе си.'
            : 'Началният ред идва от Стопанина; твоите размествания стоят върху него и не го менят.'
        }
        Скриването е лично и също не влиза в Журнала.
      </p>
    </section>`;
}

function kartaSravnenie(izbor: Izbor, koj: Samolichnost): string {
  const redove = PLANOVE.map((p) => {
    const tuk = p.klyuch === izbor.plan.klyuch;
    const stiga = stigaLiHranilishteto(p, koj.hranilishte);
    const broi = p.vazmozhnosti.size;

    return `
      <div class="red planred${tuk ? ' tuk' : ''}" data-plan-red="${p.klyuch}">
        <div class="kletka">
          <b>${ekraniraj(p.ime)}${tuk ? ' · сега' : ''}</b>
          <span>${ekraniraj(p.zaKogo)}</span>
        </div>
        <div class="kletka">
          <b>${broi} ${broi === 1 ? 'възможност' : 'възможности'}</b>
          <span>${
            p.klyuch === PLAN_PO_PODRAZBIRANE ? 'ЦЯЛАТА функционалност' : 'от таблицата на плана'
          }</span>
        </div>
        <div class="kletka">
          <b>${p.iskaPlatenOblak ? 'платен план' : 'безплатен акаунт'}</b>
          <span>${
            p.iskaPlatenOblak
              ? 'при Google, Microsoft или Apple'
              : 'Gmail, Microsoft или Apple — без плащане'
          }</span>
        </div>
        <div class="butoni">
          ${
            tuk
              ? '<span class="znachka dobre">избран</span>'
              : stiga
                ? `<button type="button" class="vtorichen malak" data-plan="${p.klyuch}">Избери</button>`
                : '<span class="znachka tiha">иска платено хранилище</span>'
          }
        </div>
      </div>`;
  }).join('');

  return `
    <section data-sektsiya="tablo-planovete" class="karta">
      <div class="dyalglava">
        <h2>Плановете</h2>
        <span>нагоре расте КАПАЦИТЕТЪТ, не функциите</span>
      </div>
      <div class="tablitsa">
        <div class="glava planred">
          <div>План</div><div>Функционалност</div><div>Какво трябва при доставчика</div><div></div>
        </div>
        ${redove}
      </div>
      <p class="drebno">
        Мащабът се плаща на доставчика на хранилището, не на нас. Стартъпът е
        <b>Професионален · онлайн</b> и носи цялата функционалност; място и
        сигурност се купуват от Google, Microsoft или Apple, а поръчковата работа
        е по договор. ИИ е добавка с цена, която се СВЪРЗВА — не вградена:
        ключът за модела е твой и стои на устройството, а сметката за него идва
        от доставчика му, не от нас.
      </p>
    </section>`;
}

/**
 * ЗАПАСНИЯТ КОНТАКТ · пътят обратно, вписан ПРЕДВАРИТЕЛНО (И100 · ADR-044).
 *
 * Негови думи: „дай възможност за въстановяване на акаунт с добавен свързан за
 * сигурност… от верификация на вкаран преди това имейл и телефон."
 *
 * Показва се САМО на Стопанина, защото само той може да го впише — това е
 * пътят обратно към НЕГОВИЯ Журнал. На всеки друг картата липсва изцяло:
 * телефонът, дори с две цифри, е чужд личен данни.
 *
 * ЛИПСАТА СЕ КАЗВА. Журнал без запасен контакт няма път назад, и това трябва
 * да се научи ДНЕС, а не в деня, в който главният имейл вече го няма.
 */
function kartaZapasen(
  tozi: boolean,
  zapasen: { readonly imeyl: string; readonly poslednite: string } | null,
): string {
  if (!tozi) return '';
  return `
    <section class="karta" data-sektsiya="zapasen">
      <div class="dyalglava">
        <h2>Запасен контакт</h2>
        <span>пътят обратно · вписва се ПРЕДИ да потрябва</span>
      </div>
      ${
        zapasen
          ? `<p class="drebno"><b>Вписан:</b> <span translate="no">${ekraniraj(zapasen.imeyl)}</span>
             · телефон …${ekraniraj(zapasen.poslednite)}. Този имейл може да вземе Журнала,
             ако твоят вече не отваря — с влизане при доставчика И знание на телефона.</p>`
          : `<p class="drebno trevoga"><b>Няма вписан запасен контакт.</b> Без него този Журнал
             няма път назад: изгуби ли се главният имейл, остава само износът, но никой не може
             да го отвори под друго име.</p>`
      }
      <div class="poleta">
        <div class="pole">
          <label for="zapasen-imeyl">Запасен имейл</label>
          <input translate="no" id="zapasen-imeyl" type="email" placeholder="zhena@example.bg" autocomplete="off">
        </div>
        <div class="pole">
          <label for="zapasen-telefon">Телефон</label>
          <input translate="no" id="zapasen-telefon" placeholder="0888 123 456" autocomplete="off">
        </div>
      </div>
      <p class="greshka" id="greshka-zapasen"></p>
      <div class="deystviya">
        <button type="button" class="glaven" id="zapishi-zapasen">${
          zapasen ? 'Смени запасния контакт' : 'Впиши запасен контакт'
        }</button>
        <p class="drebno">
          Телефонът <b>не влиза в Журнала</b> — влиза само отпечатъкът му, за да не
          пътува личен номер в изнесения файл. Затова и не се показва: помни се, не се чете.
          Кодове не се пращат (няма сървър и не се строи): това е <b>честна спирачка</b>,
          която лови грешния човек, не професионалния крадец.
        </p>
      </div>
    </section>`;
}

/**
 * ВРЪЩАНЕ НА АРХИВ ОТ ДРУГ ИМЕЙЛ (И100 · ADR-044).
 *
 * Негови думи: „…и да се възстанови архив на друг имейл, от верификация на
 * вкаран преди това имейл и телефон."
 *
 * Стои на ВСЕКИ Табло, не само при беда: човекът, който е загубил главния си
 * имейл, влиза с ЗАПАСНИЯ и попада в празен Журнал — точно тогава пътят трябва
 * да е пред очите му, а не скрит зад състояние, което той не може да достигне.
 *
 * Нищо тук не се обещава без файл: без износа няма какво да се върне. Затова и
 * текстът го казва пръв — най-честното напомняне, че износът е задължение.
 */
function kartaVrashtane(): string {
  return `
    <section class="karta" data-sektsiya="vrashtane">
      <div class="dyalglava">
        <h2>Върни архив от друг имейл</h2>
        <span>когато главният имейл вече не отваря</span>
      </div>
      <p class="drebno">
        Носи износа на стария Журнал и телефона, вписан в него като запасен контакт.
        Файлът сам казва чий е и кой има право върху него — веригата му пътува с него.
        <b>Без износ няма връщане:</b> ако главният имейл го няма, а файл няма, няма и какво да се отвори.
      </p>
      <div class="poleta">
        <div class="pole">
          <label for="vrashtane-telefon">Телефонът, вписан като запасен</label>
          <input translate="no" id="vrashtane-telefon" placeholder="0888 123 456" autocomplete="off">
        </div>
        <div class="pole">
          <label for="vrashtane-prichina">Защо се връща</label>
          <input translate="no" id="vrashtane-prichina" placeholder="акаунтът е закрит" autocomplete="off">
        </div>
      </div>
      <p class="greshka" id="greshka-vrashtane"></p>
      <div class="deystviya">
        <input translate="no" type="file" id="vrashtane-fayl" accept=".json" hidden>
        <button type="button" class="vtorichen" id="vrashtane-izberi">Избери износа</button>
        <p class="drebno">
          Проверява се <b>номерът</b>, не начинът на изписване. Смяната влиза в стария Журнал
          като събитие с автор и причина — нищо не се презаписва и нищо не се трие.
        </p>
      </div>
    </section>`;
}

/**
 * ТАБОВЕТЕ ОТ ТАБЛОТО (И101 т.1) · входът към конструктора, там където е и
 * всичко останало за „кой съм и какво мога".
 *
 * Негови думи: „Всеки клиент на приложението има възможност да създава нови
 * табове **от таблото**… само от стопанина."
 *
 * Картата се вижда САМО на Стопанина — същото право, което пази и самия екран
 * (`ekranite.ts`). Показва се и на него, когато няма нито един свой таб: тогава
 * тя е покана, а не отчет.
 */
/**
 * ПРОБВАНЕТО · тридесет дни, СМЯТАНИ от книгата (резен 32 · ADR-092).
 *
 * „с 30 дн[и] б[ез]платно пробване" *(р83·[57])*, потвърдено с „da wavi" (И86)
 * и разчетено там: „пробването е СРОК преди плащането, не безплатен план".
 *
 * ═══ ЧЕСТНА СПИРАЧКА, НЕ КЛЮЧАЛКА ═══
 *
 * Изтеклият срок КАЗВА, че е изтекъл — и нищо повече. Нито един бутон не
 * изчезва, Журналът не се заключва, износът работи. Приложение, което заключва
 * данните на човека при изтекъл срок, е взело за заложник неговата книга.
 *
 * Затова и картата няма червено: тя е покана, не заплаха.
 */
function kartaProbvane(p: Probvane): string {
  return `
    <section class="karta" data-sektsiya="tablo-probvane" data-sastoyanie="${p.sastoyanie}">
      <div class="dyalglava">
        <h2>Пробване</h2>
        <span>срок преди плащането · не безплатен план</span>
      </div>
      <div class="plochki">
        <div class="plochka" data-pole="ostavat-dni">
          <div class="etiket">${probvanetoEIzteklo(p) ? 'Изтекло преди' : 'Остават'}</div>
          <div class="chislo malak" translate="no">${Math.abs(p.ostavat)}</div>
          <div class="pod">${Math.abs(p.ostavat) === 1 ? 'ден' : 'дни'}${
            p.nachalo === '' ? '' : ` · от ${ekraniraj(p.nachalo)}`
          }</div>
        </div>
      </div>
      <div class="deystviya">
        <p class="drebno">${ekraniraj(dumiteNaProbvaneto(p))}</p>
      </div>
    </section>`;
}

/**
 * ГОДИНИТЕ · и нулата се КАЗВА (резен 28 · ADR-088).
 *
 * Негово: „Става на календарна година автоматично прави пълен годишен архив"
 * *(р85·[51])*. Автоматичен ЗАПИС няма — в целия код няма запис без човешки
 * жест. Автоматично е ЯВЯВАНЕТО: щом дойде 1 януари, миналата година застава
 * ТУК, вместо да чака някой да си спомни за нея.
 *
 * Картата стои и когато няма какво да каже: проверената нула е различна от
 * нулата, за която никой не е питал (правило 7).
 */
function kartaGodinite(godini: {
  readonly chakat: readonly string[];
  readonly razminavat: readonly string[];
}): string {
  const chakat = godini.chakat.length;
  const razminavat = godini.razminavat.length;
  return `
    <section class="karta" data-sektsiya="tablo-godini">
      <div class="dyalglava">
        <h2>Годините</h2>
        <span>приключилата година се явява сама · затварянето е негово решение</span>
      </div>
      <div class="plochki">
        <div class="plochka" data-pole="chakat-godini">
          <div class="etiket">Чакат затваряне</div>
          <div class="chislo malak" translate="no">${chakat}</div>
          <div class="pod">${chakat === 0 ? 'всички приключили са затворени' : godini.chakat.join(' · ')}</div>
        </div>
        <div class="plochka" data-pole="razminavat-godini">
          <div class="etiket">Разминават се</div>
          <div class="chislo malak" translate="no">${razminavat}</div>
          <div class="pod">${razminavat === 0 ? 'нито една затворена не е мръднала' : godini.razminavat.join(' · ')}</div>
        </div>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" data-ekran="nastroyki">Отвори Годините</button>
        <p class="drebno">
          Затворената година <b>не отказва записи</b> — негово е „променяш само през
          журнала назад". Онова, което затварянето добавя, е <b>мярката</b>: колко се е
          променила годината оттогава, и в коя посока.
        </p>
      </div>
    </section>`;
}

function kartaTabove(tozi: boolean, broy: number, dobaveni: number): string {
  if (!tozi) return '';
  return `
    <section class="karta" data-sektsiya="tablo-tabove">
      <div class="dyalglava">
        <h2>Твоите изгледи</h2>
        <span>табове · секции · таблици и диаграми, вързани за източник</span>
      </div>
      <div class="plochki">
        <div class="plochka" data-pole="broy-tabove">
          <div class="etiket">Добавени табове</div>
          <div class="chislo malak" translate="no">${dobaveni}</div>
          <div class="pod">${broy - dobaveni} стационарни са допълнени</div>
        </div>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" data-ekran="tabove">
          ${dobaveni === 0 ? 'Направи първия си таб' : 'Направи нов таб'}
        </button>
        <p class="drebno">
          Табовете, секциите и връзките им се правят <b>само от Стопанина</b>: секция,
          вързана за чужда таблица, мени какво ЧЕТАТ другите — едно действие, чужди числа.
        </p>
      </div>
    </section>`;
}

/**
 * КВОТАТА · ПОГЛЕД, не запис (ADR-022 · ADR-064).
 *
 * Живее в паметта на модула и умира с раздела. Отговорът на Google е ЧУЖД
 * факт — той се пита наново, не се помни като наш. Записан в Журнала, той
 * щеше да остарее мълчаливо в деня, в който човек си купи място.
 */
let kvotata: KvotaNaDrayva | null = null;
let greshkaSpiratchka = '';

/** Питането минава ОТТУК · подава се от `main.ts`, за да няма мрежа в екрана. */
let pitayDrayvaZaKvota: (() => Promise<KvotaNaDrayva>) | null = null;

export function svarzhiPitanetoNaDrayva(f: () => Promise<KvotaNaDrayva>): void {
  pitayDrayvaZaKvota = f;
}

export function narisuvayTablo(
  koj: Samolichnost,
  izbor: Izbor,
  akaunt: string,
  lichnoVklyucheno = false,
  lichnoPipnato = false,
  /**
   * СТОПАНИНЪТ и СМЯТАНАТА роля (ADR-043).
   *
   * Ролята се ПОДАВА, а не се чете от `koj.rolya`: самоличността носи каквото
   * е казал доставчикът, а какво може човекът в ТОЗИ Журнал решава Журналът.
   * Дотук екранът показваше първото и то изглеждаше като второто.
   */
  stopanin = '',
  rolya: Rolya = koj.rolya,
  zapasen: { readonly imeyl: string; readonly poslednite: string } | null = null,
  /** табовете · брой всички и брой ДОБАВЕНИ (И101 т.1) */
  tabove: { readonly vsichki: number; readonly dobaveni: number } = { vsichki: 0, dobaveni: 0 },
  /** пунктовете на лентата · подредени и с това кой е скрит (резен 15 · И111) */
  lenta: {
    readonly punktove: readonly { readonly klyuch: string; readonly ime: string; readonly skrit: boolean }[];
    readonly moyatRedEPipnat: boolean;
  } = { punktove: [], moyatRedEPipnat: false },
  /**
   * КОЛКО ЗАЕМА ЖУРНАЛЪТ · МЕРЕНО от браузъра, не питано (резен Д).
   *
   * Подава се, защото мярката идва от `navigator.storage.estimate()`, а тя
   * живее в `main.ts` заедно с останалото за носителя.
   */
  nuzhnoZaZhurnala = 0,
  /**
   * ГОДИНИТЕ · кои приключили чакат затваряне и кои се РАЗМИНАВАТ (резен 28).
   *
   * Подават се СМЕТНАТИ, не се четат тук: Таблото не познава Огледалото, и
   * това е нарочно — то показва, не смята.
   */
  godini: { readonly chakat: readonly string[]; readonly razminavat: readonly string[] } = {
    chakat: [],
    razminavat: [],
  },
  /**
   * ПРОБВАНЕТО · СМЯТА се от книгата и деня, подава се СМЕТНАТО (резен 32).
   *
   * Таблото не познава Журнала и не бива да го научава: то показва, не смята.
   */
  probvane: Probvane = { sastoyanie: 'ne-e-zapochnalo', nachalo: '', do_: '', ostavat: 30 },
): string {
  const negov = stopanin !== '' && stopanin === koj.imeyl;
  return (
    kartaKoySam(koj, akaunt, stopanin, rolya) +
    kartaTabove(negov, tabove.vsichki, tabove.dobaveni) +
    kartaGodinite(godini) +
    kartaProbvane(probvane) +
    kartaZapasen(negov, zapasen) +
    kartaVrashtane() +
    // СТОПАНИНЪТ НЯМА ЛИЧЕН ТАБ (ADR-154) — и карта за него няма.
    (negov ? '' : kartaLichno(lichnoVklyucheno, lichnoPipnato)) +
    kartaLenta(lenta.punktove, negov, lenta.moyatRedEPipnat) +
    kartaOtmetki(izbor) +
    kartaSpiratchka(izbor, koj, nuzhnoZaZhurnala) +
    kartaSravnenie(izbor, koj)
  );
}

/**
 * ВТОРОСТЕПЕННИТЕ настройки НА СЛУЖИТЕЛЯ · личният таб (И98).
 *
 * Негови думи: „Може ако служителят не иска да го ползва, от неговите
 * ВТОРОСТЕПЕННИ настройки."
 *
 * ЗАЩО НЕ Е ОТМЕТКА ДО ОСТАНАЛИТЕ. Другите отметки на Таблото са
 * `Vazmozhnost` — тоест ПРАВО, което планът дава или не дава (правило 15).
 * Личното не е право: то не се плаща, не се раздава и никой не го отнема.
 * Затова стои в СВОЯ карта и превключвателят му е СЪБИТИЕ в личния Журнал,
 * не ред в `masterbook:izbor` — localStorage е на БРАУЗЪРА и би казал
 * „включено" тук и „изключено" там, докато данните лежат на диска.
 */
function kartaLichno(vklyucheno: boolean, pipnato: boolean): string {
  // ТРИ състояния, не две: „не е пипано" ≠ „прибрано" ≠ „включено".
  // Първото пускане иска МЯСТО в личния драйв и става от Профила (ADR-154)
  // или на самия екран „Лично" (И99); тук се връща само вече записаното.
  // „Пипано" е превключване, не съществуване на Журнала (резен 98).
  const sastoyanie = vklyucheno ? 'включено' : pipnato ? 'прибрано' : 'не е пускано';
  return `
    <section class="karta" data-sektsiya="tablo-lichno">
      <div class="dyalglava">
        <h2>Лично</h2>
        <span>второстепенна настройка · твоя, не на наемателя</span>
      </div>
      <div class="deystviya">
        <span class="znachka ${vklyucheno ? 'dobre' : 'tiha'}">${sastoyanie}</span>
        ${
          pipnato
            ? `<button type="button" class="vtorichen" id="tablo-lichno">${
                vklyucheno ? 'Прибери личното' : 'Върни личното'
              }</button>`
            : '<span class="drebno">пуска се от <b>Профила</b> (аватарът горе вдясно) — там се посочва мястото в твоя драйв</span>'
        }
      </div>
      <p class="drebno">Личният таб е <b>същата таблица</b> от Управление за собствени нужди, с
      <b>отделен Журнал</b>, който никога не се смесва със служебния. Прибирането сваля пункта от
      лентата и <b>не трие нищо</b> — „изключено ≠ липсващо" (правило 15). Ключът на личния Журнал
      е твоят имейл с наставка; чете го само той.</p>
    </section>`;
}

/**
 * Закача таблото. Всяка промяна се записва и екранът се прерисува веднага —
 * иначе отметката е обещание, а не действие.
 */
export function zakachiTablo(
  koren: ParentNode,
  vzemi: () => Izbor,
  sloji: (izbor: Izbor) => void,
  prerisuvay: () => Promise<void>,
): void {
  /**
   * ПИТАЙ ДРАЙВА · единственото действие на честната спирачка (резен Д).
   *
   * Пита и ПОКАЗВА. Нищо не записва в Журнала и нищо не забранява — отговорът
   * е чужд факт и живее в паметта на раздела (ADR-064).
   *
   * Липсващата връзка НЕ е грешка: офлайн изданието няма свързваща част, и
   * тогава бутонът казва защо, вместо да мълчи (правило 15).
   */
  koren.querySelector<HTMLButtonElement>('#pitay-drayva')?.addEventListener('click', async () => {
    const buton = koren.querySelector<HTMLButtonElement>('#pitay-drayva')!;
    buton.disabled = true;
    try {
      if (!pitayDrayvaZaKvota) {
        throw new Error(
          'Това издание няма свързваща част към Драйва — то работи изцяло офлайн. ' +
            'Спирачката остава непитана, и това е състояние, не повреда.',
        );
      }
      kvotata = await pitayDrayvaZaKvota();
      greshkaSpiratchka = '';
    } catch (err) {
      kvotata = null;
      greshkaSpiratchka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  for (const kutiya of koren.querySelectorAll<HTMLInputElement>('[data-vazmozhnost]')) {
    kutiya.addEventListener('change', async () => {
      const v = kutiya.dataset['vazmozhnost'] as Vazmozhnost;
      const nov = prevklyuchi(vzemi(), v, kutiya.checked);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }

  // ВИДИМОСТТА НА ПУНКТ · лична, паметта на екрана, НУЛА събития (И111).
  for (const kutiya of koren.querySelectorAll<HTMLInputElement>('[data-punkt]')) {
    kutiya.addEventListener('change', async () => {
      prevklyuchiPunkt(kutiya.dataset['punkt']!);
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#zabravi-moya-red')?.addEventListener('click', async () => {
    zabraviMoyaRed();
    await prerisuvay();
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    b.addEventListener('click', async () => {
      const nov = smeniPlan(vzemi(), b.dataset['plan']!);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }
}

/**
 * ДРАЙВЪТ И ПЛАНЪТ · ЧЕСТНАТА СПИРАЧКА (резен Д · ADR-076).
 *
 * `CLAUDE.md`: „Защитата е честна спирачка, не ключалка. Заявка за плана +
 * проверка на драйва ловят НЕВОЛНАТА грешка. Нарочна измама иска сървър."
 *
 * Затова тази карта има ЕДИН бутон, който ПИТА, и нула бутона, които
 * забраняват. Онова, което тя прави, е да покаже числата и да каже какво
 * значат — включително когато не са питани.
 */
function kartaSpiratchka(izbor: Izbor, koj: Samolichnost, nuzhno: number): string {
  const p = presmetni({
    plan: izbor.plan,
    kvota: kvotata,
    nuzhno,
    vidOtSamolichnostta: koj.hranilishte,
  });
  const znachka =
    p.otsenka === 'stiga' ? 'dobre' : p.otsenka === 'ne e pitano' ? 'tiha' : 'trevoga';

  return `
    <section class="karta" data-sektsiya="tablo-spiratchka">
      <div class="dyalglava">
        <h2>Драйвът и планът</h2>
        <span>спирачка, не ключалка · нищо тук не забранява нищо</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <div class="etiket">Акаунтът при ${ekraniraj(IMENA_NA_DOSTAVCHITSITE[koj.dostavchik])}</div>
          <div class="chislo malak" translate="no" data-vid-hranilishte="${ekraniraj(p.vid)}">${ekraniraj(
            p.vid === 'не е питано' ? 'Не е питано' : p.vid === 'платено' ? 'Платено' : 'Безплатно',
          )}</div>
          <div class="pod">${p.vid === 'не е питано' ? 'докато не питаме, не твърдим' : 'МЕРИ се от тавана'}</div>
        </div>
        <div class="plochka">
          <div class="etiket">Свободно в Драйва</div>
          <div class="chislo malak" translate="no" data-svobodno="${p.svobodno}">${
            p.svobodno < 0 ? '—' : kolkoMyasto(p.svobodno)
          }</div>
          <div class="pod">${p.svobodno < 0 ? 'няма число, защото не е питано' : 'таван минус заето'}</div>
        </div>
        <div class="plochka">
          <div class="etiket">Нужно за Журнала</div>
          <div class="chislo malak" translate="no" data-nuzhno="${nuzhno}">${kolkoMyasto(nuzhno)}</div>
          <div class="pod">МЕРЕНО от браузъра, не питано</div>
        </div>
      </div>

      <p class="drebno">
        <!-- СВОЙ БЕЛЕГ, не „оценка": същата дума в Контакти носи Айзенхауер
             (спешно-важно…), а тук — мястото на устройството (stiga · tyasno).
             Един белег с две значения е двусмислен за всеки обход и смесва
             латиница с кирилица в едно поле (правило 11). Намерено при
             сверката на резен 105 (ADR-168). -->
        <span class="znachka ${znachka}" data-mestoto="${ekraniraj(p.otsenka)}">${ekraniraj(
          p.otsenka === 'ne e pitano'
            ? 'не е питано'
            : p.otsenka === 'stiga'
              ? 'стига'
              : p.otsenka === 'tyasno'
                ? 'тясно'
                : 'не стига',
        )}</span>
        ${ekraniraj(sDumi(p))}
      </p>

      ${
        greshkaSpiratchka === ''
          ? ''
          : `<p class="greshka" id="greshka-spiratchka">${ekraniraj(greshkaSpiratchka)}</p>`
      }

      ${butonSIkona({
        ikona: 'veriga',
        tekst: kvotata === null ? 'Питай Драйва' : 'Питай пак',
        title: 'Пита доставчика за тавана и заетото · нищо не се качва и нищо не се записва',
        klas: 'glaven',
        id: 'pitay-drayva',
      })}

      <p class="drebno">Питането иска СЪГЛАСИЕ за Драйва — второ разрешение, не
      второ влизане. Използва се обхватът, който вече имаме
      (<code translate="no">drive.file</code>): честната спирачка не струва нито
      едно ново разрешение. Отговорът НЕ влиза в Журнала — той е чужд факт и се
      пита наново (същото решение като при отговора на Google, ADR-064).</p>

      <p class="drebno"><b>И нищо не се заключва.</b> Приложението е в браузъра;
      който иска да заобиколи това число, отваря конзолата и го заобикаля.
      Спирачката лови НЕВОЛНАТА грешка — човек, който тръгва да пренася повече,
      отколкото има къде да се събере. Нарочната измама иска сървър, и това е
      казано, вместо да се прави, че не е така.</p>
    </section>`;
}
