/**
 * КОЙ КАКВО ВИЖДА · колонното право, в Настройки, с ДВЕ падащи менюта
 * (резен 97 · ADR-156 · И129 т.2).
 *
 * Негови думи, 02.09:
 *
 *   „Стопанина в Главни настойки има много настройки, но за даването на контрол
 *    и видимост към останалите юзъри става с **2 падащи менюта**. От едното
 *    избираш от вкаранати служители, а от другото избираш заредените хедърина
 *    таблици и когато избереш хедърт, **над всяка колона от хедъра има падащо
 *    меню** за да избереш вижда, редактира, скрито. Така е чисто и подредено."
 *
 * ═══ ДОМЪТ · два пъти с един ред ═══
 *
 * И103 (27.08) прати матрицата при картата на служителите — „ОТ ТАМ се дават и
 * хедъруите на всички таблици" (ADR-071 §2). Днешната дума я връща в Главни
 * настройки. Последната бие (правило 28); темата в `temi-nastroyki.ts` смени
 * адреса си с ЕДИН ред — и в двете посоки. Вписването на човек остава в
 * Служители: там се РАБОТИ с хора, тук се НАСТРОЙВА какво виждат.
 *
 * ═══ ЕДИН ХЕДЪР НАВЕДНЪЖ ═══
 *
 * Второто падащо стеснява ИЗГЛЕДА, не записа: правото си остава на двойката
 * (служител, хедър), както досега (ADR-011 · ADR-065). Дотук екранът рисуваше
 * всички хедъри, групирани по табове; сега табовете са групи В падащото меню,
 * а на екрана стои избраният хедър с падащо меню над всяка колона.
 *
 * ═══ ЛОСТОВЕТЕ ═══
 *
 * И103: „можеш по ЦЯЛО МЕНЮ или по отделна ТАБЛИЦА и КОЛОНА от хедъра да дадеш
 * достъп." Трите обхвата остават — колона (клетката), цялата таблица (лостът в
 * главата на хедъра) и целият таб (лостът под хедъра, само когато табът носи
 * повече от една таблица). Записът винаги е право на двойката; по-широкият
 * обхват просто пише повече от тях и КАЗВА колко.
 *
 * Само Стопанинът раздава (И57); правото само СТЕСНЯВА (правило 23); скритото
 * пак се смята (ADR-011 §3). Нищо от това не се пипа тук.
 */

import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Rolya as RolyaNaChovek } from '../src/yadro/samolichnost.js';
import { podredeni } from '../src/domein/sluzhiteli.js';
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
  type GrupaHedari,
  type PunktNaMenyuto,
  type TablitsaSHedar,
} from '../src/domein/hedari-po-tabove.js';
import { eVgradena, tablitsiteNaProgramata } from './tablitsite.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './ekranite.js';

/**
 * ХОРАТА В ПРОГРАМАТА · Стопанинът първи, после вписаните.
 *
 * Стопанинът не е „служител" и не се вписва като такъв — той е ПЪРВОТО събитие
 * в Журнала (ADR-043). Затова се добавя поименно, с ролята си, вместо да се
 * крие в картата на служителите: скрит там, той щеше да прилича на вписан
 * човек. Един дом за Служители и за правата (правило 17).
 */
export function horataVProgramata(
  o: Ogledalo,
): readonly { readonly imeyl: string; readonly ime: string; readonly rolya: RolyaNaChovek }[] {
  return [
    ...(o.stopanin === ''
      ? []
      : [{ imeyl: o.stopanin, ime: 'Стопанинът', rolya: 'sobstvenik' as const }]),
    ...podredeni(o.sluzhiteli.values()).filter((h) => h.imeyl !== o.stopanin),
  ];
}

/** Двата избора са ПОГЛЕД върху екрана · помнят се, не се записват (ADR-022). */
let izbranChovek = chetiEkranno('pravata.chovek', '');
let izbranHedar = chetiEkranno('pravata.hedar', '');
let greshka = '';

/**
 * РЕДЪТ НА МЕНЮТО, какъвто човекът го е ВИДЯЛ при последното рисуване.
 *
 * Лостът „цял таб" трябва да знае кои таблици стоят под кой таб. Може да ги
 * прочете от разметката — но тогава ще действа по онова, което DOM-ът казва, а
 * не по онова, което кодът е показал. Затова редът се оставя тук при рисуването
 * и слушателят смята групите ПАК, от същия регистър. Не е втори дом на факта:
 * домът на реда е `podredeniPunktove` (ADR-066); това е следата от четенето.
 */
let redNaMenyuto: readonly PunktNaMenyuto[] = [];

export function sektsiyaNaPravata(
  o: Ogledalo,
  izbor: Izbor,
  /** влезлият · Стопанинът ли е (ADR-043 · ролята се СМЯТА от Журнала) */
  negoviyat: boolean,
  punktove: readonly PunktNaMenyuto[],
): string {
  redNaMenyuto = punktove;
  const hora = horataVProgramata(o);
  const kazano = greshka;
  greshka = '';

  const glava = `
      <div class="dyalglava">
        <h2>Кой какво вижда</h2>
        <span>колонно право · служител · хедър · три думи, и всяка само СТЕСНЯВА</span>
      </div>`;

  if (hora.length === 0) {
    return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <p class="prazno" data-pravata-otkaz>Още няма на кого да се раздават права.<br>
      Вписва се човек в Служители; достъпът се дава при доставчика, не оттук (правило 14).</p>
    </section>`;
  }

  // И57, дословно: „Вижда и скрито са редактор САМО ЗА ГЛАВНИЯ АКАУНТ."
  // Отказът се КАЗВА (правило 15), а не се показва празна секция.
  if (!negoviyat) {
    return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <p class="prazno" data-pravata-otkaz>Правата ги раздава <b>само Стопанинът</b>.<br>
      Раздаването не е втора врата към достъпа (правило 14).</p>
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

  // Ако запомненият човек го няма (махнат, друг Журнал), пада на ПЪРВИЯ — а
  // първият е Стопанинът. Празен екран, който не казва защо е празен, е по-лош.
  const kogo = hora.some((h) => h.imeyl === izbranChovek) ? izbranChovek : hora[0]!.imeyl;
  // РОЛЯТА на ИЗБРАНИЯ · тя е ТАВАН и се казва в клетката. Литерал тук би дал
  // на пазача отговора, който иска (ADR-050): наблюдател, на когото пише
  // „редактира", е точно надписът, който правило 15 гони.
  const rolya = hora.find((h) => h.imeyl === kogo)?.rolya ?? 'nablyudatel';

  const tablitsi = tablitsiteNaProgramata(o);
  const grupi = grupiraniPoTabove(tablitsi, redNaMenyuto);
  const chakat = bezTab(tablitsi, redNaMenyuto);
  const hedar = tablitsi.find((t) => t.klyuch === izbranHedar);
  const grupataNaHedara = hedar
    ? grupi.find((g) => g.tablitsi.some((t) => t.klyuch === hedar.klyuch))
    : undefined;

  return `
    <section data-sektsiya="pravata" class="karta">
      ${glava}
      <div class="poleta">
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
        <label class="pole">
          <span>Хедър</span>
          <select translate="no" id="izbor-pravo-hedar">
            <option value=""${hedar ? '' : ' selected'}>— избери хедър —</option>
            ${grupi
              .map(
                (g) =>
                  `<optgroup label="${ekraniraj(g.ime)}" data-ekran="${ekraniraj(g.ekran)}">${g.tablitsi
                    .map(
                      (t) =>
                        `<option value="${ekraniraj(t.klyuch)}"${
                          t.klyuch === izbranHedar ? ' selected' : ''
                        }>${ekraniraj(t.ime)}</option>`,
                    )
                    .join('')}</optgroup>`,
              )
              .join('')}
          </select>
        </label>
      </div>
      <p class="drebno">Хедъри: <b data-broy-hedari>${tablitsi.length}</b> в
      <b data-broy-grupi>${grupi.length}</b> групи, както са по табовете на менюто${
        chakat > 0 ? ` · <b data-bez-tab>${chakat}</b> ${ekraniraj(IME_BEZ_TAB)}` : ''
      }. Табът на вносния хедър се дава в Редактора на хедъри по-горе.</p>
      ${kazano ? `<p class="greshka" data-pravata-greshka>${ekraniraj(kazano)}</p>` : ''}
      ${
        hedar
          ? hedaraNa(o, kogo, rolya, hedar) +
            (grupataNaHedara && grupataNaHedara.ekran !== '' && grupataNaHedara.tablitsi.length > 1
              ? lostatNaTaba(grupataNaHedara, kogo)
              : '')
          : `<p class="drebno" data-pravata-izberi>Избери хедър — над всяка негова колона застава
      падащо меню с трите думи. Таблиците стоят в падащото по табовете на менюто.</p>`
      }
      <p class="drebno">Скритата колона пак се смята: сборовете ѝ остават в Сметки и в
      Управление. Скриването пипа екрана, не числата.</p>
    </section>`;
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

/** ЦЕЛИЯТ ТАБ · под избрания хедър, само когато табът носи повече от една таблица. */
function lostatNaTaba(g: GrupaHedari, kogo: string): string {
  return `
        <div class="obhvat-tab" data-obhvat-tab="${ekraniraj(g.ekran)}">
          ${lostatNaObhvata('menyu', g.ekran, kogo, `целият таб „${g.ime}" · ${g.tablitsi.length} таблици`)}
        </div>`;
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
                : 'вносен хедър · табът се дава в Редактора на хедъри'
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

export function zakachiPravata(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  // ДВЕТЕ ПАДАЩИ · поглед, не запис: нула събития, само прерисуване.
  koren
    .querySelector<HTMLSelectElement>('#izbor-pravo-chovek')
    ?.addEventListener('change', async (e) => {
      izbranChovek = (e.target as HTMLSelectElement).value;
      zapomniEkranno('pravata.chovek', izbranChovek);
      await prerisuvay();
    });
  koren
    .querySelector<HTMLSelectElement>('#izbor-pravo-hedar')
    ?.addEventListener('change', async (e) => {
      izbranHedar = (e.target as HTMLSelectElement).value;
      zapomniEkranno('pravata.hedar', izbranHedar);
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
   * ЦЯЛА ТАБЛИЦА И ЦЯЛ ТАБ · един и същ слушател, две ширини.
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
}
