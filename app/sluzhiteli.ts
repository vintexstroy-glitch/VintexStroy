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
import type { Samolichnost } from '../src/yadro/samolichnost.js';
import { IMENA_NA_ROLITE } from '../src/yadro/samolichnost.js';
import { podredeni } from '../src/domein/sluzhiteli.js';
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
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './ekranite.js';

/** Кого гледам · поглед върху екрана, помни се (ADR-022). */
let izbran = chetiEkranno('sluzhiteli.izbran', '');
let greshka = '';

export function narisuvaySluzhiteli(
  o: Ogledalo,
  kojSam: Samolichnost,
  dnes: string,
  izbor: Izbor,
): string {
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
             Вписват се от Настройки · „Кой какво вижда" — достъпът се дава от Драйва, не оттук.</p>`
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
    </section>

    ${hora.length === 0 ? '' : formaZaPrashtane(o, hora, kogo, dnes, mozhe(izbor, 'kalendar'))}
    ${hora.length === 0 ? '' : listatNa(o, kogo, az)}`;
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
