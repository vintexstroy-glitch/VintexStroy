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

export function zapishiIzbor(izbor: Izbor): void {
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
          <div class="chislo malak" translate="no">${koj.hranilishte === 'платено' ? 'Платено' : 'Безплатно'}</div>
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
    <section class="karta">
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
    <section class="karta">
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
): string {
  const negov = stopanin !== '' && stopanin === koj.imeyl;
  return (
    kartaKoySam(koj, akaunt, stopanin, rolya) +
    kartaTabove(negov, tabove.vsichki, tabove.dobaveni) +
    kartaZapasen(negov, zapasen) +
    kartaVrashtane() +
    kartaLichno(lichnoVklyucheno, lichnoPipnato) +
    kartaOtmetki(izbor) +
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
  // Първото пускане иска МЯСТО в личния драйв и става на самия екран „Лично"
  // (И99); тук се връща само вече записаното.
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
            : '<span class="drebno">пуска се от пункта <b>Лично</b> — там се посочва мястото в твоя драйв</span>'
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
  for (const kutiya of koren.querySelectorAll<HTMLInputElement>('[data-vazmozhnost]')) {
    kutiya.addEventListener('change', async () => {
      const v = kutiya.dataset['vazmozhnost'] as Vazmozhnost;
      const nov = prevklyuchi(vzemi(), v, kutiya.checked);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    b.addEventListener('click', async () => {
      const nov = smeniPlan(vzemi(), b.dataset['plan']!);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }
}
