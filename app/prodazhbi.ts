/**
 * ПРОДАЖБИ · ТРИНАЙСЕТИЯТ екран (резен 18б).
 *
 * ═══ ЗАЩО СВОЙ ЕКРАН ═══
 *
 * Негов маршрут *(р79·[32])*: „само след Продажби спира движението и отиват в
 * Продажби Архив. иначе се въртят постоянно в наеми, ремонт и прпдажби."
 *
 * Тоест Продажби е СТАНЦИЯ по пътя на имота, не секция в Имоти: тук се работи
 * с КУПУВАЧ и с ВНОСКИ, а там — с наемател и наем. Слети, двете таблици щяха да
 * делят хедър, който не значи едно и също нещо в двата случая.
 *
 * ═══ КАКВО ПРАВИ ТОЗИ ЕКРАН И КАКВО НЕ ═══
 *
 * ПРАВИ: отваря сделка от СЪЩЕСТВУВАЩ имот, записва вноските ѝ с датите им,
 * смята проверката, мени състоянието, показва архива отделно и сверява
 * вход↔изход.
 *
 * НЕ ПРАВИ: не мени имота, не пише в Приходи и не заключва месец. Плащането
 * след нотариалната сделка отива в Приходи — „праща се директно с датат в
 * редовете с Приход в главната таблица" *(р75·[50])* — и това е ВРЪЗКА, която
 * този резен обявява, но не строи (`vrazki.ts` я брои).
 *
 * ═══ ЧЕРВЕНОТО ═══
 *
 * „Да, пълните колони + newSale()" · „предупреждение в червено докато не му се
 * смени статъса" *(р57·[76])*. Новата сделка се отваря в състояние
 * „не е зададено" и стои червена, докато човек не каже какво е.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { otLeva, pishi } from '../src/yadro/pari.js';
import {
  CHAKAT_NEGOVA_DUMA,
  imeNaSastoyanieto,
  KOLONI,
  podredeni,
  posokata,
  redovete,
  SASTOYANIYA,
  sveri,
  vArhiva,
  VIDOVE_DVIZHENIE,
  ZATVORENI,
  type RedNaProdazhbite,
} from '../src/domein/prodazhbi.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Коя сделка е отворена за движения · ПОГЛЕД, нула събития (ADR-022). */
function izbranata(): string {
  return chetiEkranno('prodazhbi.izbrana', '');
}

/** Колоните, които носят ПАРИ · само те се пишат с валутен знак (ADR-014). */
const PARICHNI = new Set([
  'Цена €',
  'Продажба €',
  'СМР €',
  'ПД',
  'Капаро',
  'НС',
  'НС кеш',
  'Акт 15',
  'Акт 16',
  'проверка',
]);

/** Стойността на една клетка · един дом за „кое къде е" (правило 17). */
function kletkata(r: RedNaProdazhbite, kolona: string): string {
  const p = r.prodazhba;
  switch (kolona) {
    case 'Обект':
      return r.obekt;
    case 'Място':
      return r.myasto;
    case 'Купувач':
      return p.kupuvach;
    case 'Телефон':
      return p.telefon;
    case 'Цена €':
      return pishi(p.tsena_st);
    case 'Продажба €':
      return pishi(p.prodazhba_st);
    case 'СМР €':
      return pishi(p.smr_st);
    case 'ПД':
      return pishi(p.pd_st);
    case 'проверка':
      return pishi(r.proverka.razlika_st);
    case 'Състояние':
      return imeNaSastoyanieto(p.sastoyanie);
    default:
      // остават петте вноски · сборът им, СЛЕД сторната
      return pishi(r.vnoski[kolona] ?? 0);
  }
}

/** Числото в центове · за сортиране и за сверка от прохода. */
function vTsentove(r: RedNaProdazhbite, kolona: string): number | undefined {
  const p = r.prodazhba;
  if (kolona === 'Цена €') return p.tsena_st;
  if (kolona === 'Продажба €') return p.prodazhba_st;
  if (kolona === 'СМР €') return p.smr_st;
  if (kolona === 'ПД') return p.pd_st;
  if (kolona === 'проверка') return r.proverka.razlika_st;
  if (PARICHNI.has(kolona)) return r.vnoski[kolona] ?? 0;
  return undefined;
}

function glavata(): string {
  return `
      <div class="red glava prodazhbared" translate="no">
        ${KOLONI.map(
          (k, i) =>
            `<span class="kletka${ZATVORENI.includes(i) ? ' zatvorena' : ''}"
                   data-kolona="${ekraniraj(k)}">${ekraniraj(k)}</span>`,
        ).join('')}
      </div>`;
}

function redNaTablitsata(r: RedNaProdazhbite): string {
  const p = r.prodazhba;
  const nezadadeno = p.sastoyanie === 'nezadadeno';
  const izbran = izbranata() === p.id;
  return `
      <div class="red prodazhbared${nezadadeno ? ' duljimo' : ''}${izbran ? ' izbran' : ''}"
           translate="no" data-prodazhba="${ekraniraj(p.id)}"
           data-sastoyanie="${ekraniraj(p.sastoyanie)}"
           data-proverka="${r.proverka.razlika_st}">
        ${KOLONI.map((k) => {
          const tsentove = vTsentove(r, k);
          const st = tsentove === undefined ? '' : ` data-st="${tsentove}"`;
          return `<span class="kletka${PARICHNI.has(k) ? ' suma' : ''}"${st}>${ekraniraj(
            kletkata(r, k),
          )}</span>`;
        }).join('')}
      </div>`;
}

/**
 * ДВИЖЕНИЯТА НА ЕДНА СДЕЛКА · трите вида, всяко със СВОЙ ред.
 *
 * „Никакво нетиране" (И97) значи и това: връщането и неустойката се показват
 * поотделно, а не като едно число до вноските. Сборът им никъде не се пише.
 */
function blokNaDvizheniyata(o: Ogledalo, r: RedNaProdazhbite): string {
  const moite = o.dvizheniyaNaProdazhbi.filter((d) => d.prodazhbaId === r.prodazhba.id);
  const zaklyuchena = vArhiva(r.prodazhba.sastoyanie);
  return `
    <section data-sektsiya="prodazhbi-dvizheniya">
      <div class="dyalglava">
        <h2>Движения по сделката</h2>
        <span>${ekraniraj(r.obekt)} · ${ekraniraj(r.prodazhba.kupuvach)}</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Сделката · ПД + СМР</span>
          <span class="chislo" translate="no" data-sdelka="${r.proverka.sdelka_st}">${pishi(
            r.proverka.sdelka_st,
          )}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Вноски</span>
          <span class="chislo" translate="no" data-vnoski="${r.proverka.vnoski_st}">${pishi(
            r.proverka.vnoski_st,
          )}</span>
        </div>
        <div class="plochka${r.proverka.razlika_st === 0 ? '' : ' duljimo'}">
          <span class="etiket">проверка</span>
          <span class="chislo" translate="no" data-razlika="${r.proverka.razlika_st}">${pishi(
            r.proverka.razlika_st,
          )}</span>
          <span class="pod">${ekraniraj(r.proverka.duma)}</span>
        </div>
      </div>

      <p class="drebno">Връщането и неустойката стоят ОТДЕЛНО и НЕ влизат в
      проверката — негово: „Неустойките се превеждат <b>отделно</b>, никакво
      нетиране." Затова тук са две числа, а не едно:
      <b translate="no" data-vrashtane="${r.izvan.vrashtane_st}">${pishi(r.izvan.vrashtane_st)}</b>
      върнато ·
      <b translate="no" data-neustoyka="${r.izvan.neustoyka_st}">${pishi(r.izvan.neustoyka_st)}</b>
      неустойка.</p>

      ${
        zaklyuchena
          ? `<p class="drebno">Сделката е в <b>Продажби Архив</b>. „Няма връщане от
             Продажби Архив. Там не се трив нищо а само се сверява." Ново движение
             оттук нататък влиза в Приходи, не тук.</p>`
          : `<form id="forma-dvizhenie" class="redditsa">
          <label class="pole">
            <span>Вид</span>
            <select name="vid" id="dvizhenie-vid">
              ${VIDOVE_DVIZHENIE.map(
                (v) =>
                  `<option value="${ekraniraj(v.klyuch)}">${ekraniraj(v.klyuch)}${
                    v.vnoska ? '' : ' · извън проверката'
                  }</option>`,
              ).join('')}
            </select>
          </label>
          <label class="pole">
            <span>Сума</span>
            <input translate="no" name="suma" id="dvizhenie-suma" inputmode="decimal" placeholder="0,00">
          </label>
          <label class="pole">
            <span>Дата</span>
            <input translate="no" type="date" name="data" id="dvizhenie-data">
          </label>
          <label class="pole">
            <span>Бележка</span>
            <input name="belezhka" id="dvizhenie-belezhka" placeholder="защо">
          </label>
          <button type="submit">Запиши движение</button>
        </form>
        <p class="greshka" id="greshka-dvizhenie"></p>`
      }

      <div class="tablitsa" data-tablitsa="prodazhbi-dvizheniya">
        <div class="red glava dvizhenieprodazhba" translate="no">
          <span class="kletka">Вид</span>
          <span class="kletka">Сума</span>
          <span class="kletka">Посока</span>
          <span class="kletka">Дата</span>
          <span class="kletka">Бележка</span>
        </div>
        ${
          moite.length === 0
            ? '<p class="drebno">Няма нито едно движение по тази сделка.</p>'
            : moite
                .map(
                  (d) => `
        <div class="red dvizhenieprodazhba" translate="no" data-vid="${ekraniraj(d.vid)}"
             data-posoka="${posokata(d.suma_st)}">
          <span class="kletka">${ekraniraj(d.vid)}</span>
          <span class="suma" data-st="${d.suma_st}">${pishi(d.suma_st)}</span>
          <span class="kletka">${posokata(d.suma_st) === 'razhod' ? 'Разходи' : 'Приходи'}</span>
          <span class="kletka">${ekraniraj(d.data)}</span>
          <span class="kletka">${ekraniraj(d.belezhka)}</span>
        </div>`,
                )
                .join('')
        }
      </div>
    </section>`;
}

export function narisuvayProdazhbi(o: Ogledalo): string {
  const vsichki = podredeni(redovete(o));
  const tekushti = vsichki.filter((r) => !vArhiva(r.prodazhba.sastoyanie));
  const arhiv = vsichki.filter((r) => vArhiva(r.prodazhba.sastoyanie));
  const izbrana = vsichki.find((r) => r.prodazhba.id === izbranata());
  const s = sveri(o, vsichki);
  const imoti = [...o.imoti.values()];

  return `
    <section data-sektsiya="prodazhbi-tekushti">
      <div class="dyalglava">
        <h2>Текущи Продажби</h2>
        <span>петнайсет колони · неговите, в неговия ред</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Текущи</span>
          <span class="chislo" translate="no" data-tekushti="${tekushti.length}">${tekushti.length}</span>
        </div>
        <div class="plochka">
          <span class="etiket">В архива</span>
          <span class="chislo" translate="no" data-arhiv="${arhiv.length}">${arhiv.length}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Сверка вход↔изход</span>
          <span class="chislo" translate="no" data-sverka="${s.razlika}">${s.razlika}</span>
          <span class="pod">${s.vhod} движения · ${s.izhod} показани</span>
        </div>
      </div>

      ${
        imoti.length === 0
          ? `<p class="drebno">Няма нито един имот. Сделката се <b>вади от таблица
             Наеми</b> и се мести тук ръчно — без имот няма какво да се продаде.</p>`
          : `<form id="forma-prodazhba" class="redditsa">
        <label class="pole">
          <span>Имот</span>
          <select name="imot" id="prodazhba-imot">
            ${imoti
              .map(
                (i) =>
                  `<option value="${ekraniraj(i.id)}">${ekraniraj(i.edinitsa)} · ${ekraniraj(
                    i.adres,
                  )}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="pole">
          <span>Купувач</span>
          <input name="kupuvach" id="prodazhba-kupuvach" placeholder="име">
        </label>
        <label class="pole">
          <span>Телефон</span>
          <input translate="no" name="telefon" id="prodazhba-telefon" placeholder="за връзка">
        </label>
        <label class="pole">
          <span>Цена €</span>
          <input translate="no" name="tsena" id="prodazhba-tsena" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Продажба €</span>
          <input translate="no" name="prodazhba" id="prodazhba-prodazhba" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>СМР €</span>
          <input translate="no" name="smr" id="prodazhba-smr" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>ПД</span>
          <input translate="no" name="pd" id="prodazhba-pd" inputmode="decimal" placeholder="0,00">
        </label>
        <button type="submit" id="nova-prodazhba">Нова продажба</button>
      </form>
      <p class="greshka" id="greshka-prodazhba"></p>`
      }

      <p class="drebno">Новата сделка се отваря с <b>пълните колони</b> и стои
      <b>червена</b>, докато не ѝ се смени състоянието — негово решение, дословно.</p>

      <div class="tablitsa" data-tablitsa="prodazhbi">
        ${glavata()}
        ${
          tekushti.length === 0
            ? '<p class="drebno">Няма нито една текуща сделка.</p>'
            : tekushti.map(redNaTablitsata).join('')
        }
      </div>
    </section>

    ${
      izbrana === undefined
        ? `<section data-sektsiya="prodazhbi-dvizheniya">
             <p class="drebno">Натисни ред от таблицата, за да видиш и запишеш
             движенията по сделката.</p>
           </section>`
        : `${blokNaDvizheniyata(o, izbrana)}
      ${
        vArhiva(izbrana.prodazhba.sastoyanie)
          ? ''
          : `<section data-sektsiya="prodazhbi-sastoyanie">
        <div class="dyalglava">
          <h2>Състоянието · стрелочникът</h2>
          <span>то решава коя част от хедъра работи</span>
        </div>
        <form id="forma-sastoyanie" class="redditsa">
          <label class="pole">
            <span>Състояние</span>
            <select name="sastoyanie" id="prodazhba-sastoyanie">
              ${SASTOYANIYA.map(
                (x) =>
                  `<option value="${ekraniraj(x.klyuch)}"${
                    x.klyuch === izbrana.prodazhba.sastoyanie ? ' selected' : ''
                  }>${ekraniraj(x.ime)}</option>`,
              ).join('')}
            </select>
          </label>
          <button type="submit">Смени състоянието</button>
        </form>
        <p class="greshka" id="greshka-sastoyanie"></p>
        <p class="drebno"><b>„Продадена · архив" е еднопосочна.</b> Щом сделката
        влезе там, нито тя, нито движенията ѝ се пипат повече — „Там не се трив
        нищо а само се сверява."</p>
      </section>`
      }`
    }

    <section data-sektsiya="prodazhbi-arhiv">
      <div class="dyalglava">
        <h2>Продажби Архив</h2>
        <span>терминалът · оттук няма връщане</span>
      </div>
      <div class="tablitsa" data-tablitsa="prodazhbi-arhiv">
        ${glavata()}
        ${
          arhiv.length === 0
            ? '<p class="drebno">Архивът е празен · нито една сделка не е стигнала до нотариус.</p>'
            : arhiv.map(redNaTablitsata).join('')
        }
      </div>
    </section>

    <section data-sektsiya="prodazhbi-chakat">
      <div class="dyalglava">
        <h2>Какво ЧАКА негова дума</h2>
        <span>броено, не твърдяно</span>
      </div>
      <p class="drebno" data-chakat="${CHAKAT_NEGOVA_DUMA.length}">Тези
      ${CHAKAT_NEGOVA_DUMA.length} неща нямат негов отговор и затова не се
      измислят тук (правило 18):</p>
      <ul class="drebno">
        ${CHAKAT_NEGOVA_DUMA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
      </ul>
    </section>`;
}

export function zakachiProdazhbite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  for (const red of koren.querySelectorAll<HTMLElement>('[data-prodazhba]')) {
    red.addEventListener('click', async () => {
      zapomniEkranno('prodazhbi.izbrana', red.dataset.prodazhba ?? '');
      await prerisuvay();
    });
  }

  const forma = koren.querySelector<HTMLFormElement>('#forma-prodazhba');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-prodazhba')!;
    kazhi.textContent = '';
    const danni = new FormData(forma);
    const id = `PR:${crypto.randomUUID()}`;
    try {
      await k.deystviya.zapishiProdazhba(
        {
          prodazhbaId: id,
          imotId: String(danni.get('imot') ?? ''),
          kupuvach: String(danni.get('kupuvach') ?? '').trim(),
          telefon: String(danni.get('telefon') ?? '').trim(),
          tsena_st: otLeva(String(danni.get('tsena') || '0')),
          prodazhba_st: otLeva(String(danni.get('prodazhba') || '0')),
          smr_st: otLeva(String(danni.get('smr') || '0')),
          pd_st: otLeva(String(danni.get('pd') || '0')),
          // newSale() · отваря се БЕЗ състояние и стои червена, докато той не каже
          sastoyanie: 'nezadadeno',
        },
        { opId: `prodazhba:${crypto.randomUUID()}` },
      );
      zapomniEkranno('prodazhbi.izbrana', id);
      k.vest('dobre', 'Сделката е отворена · състоянието още не е зададено.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaDvizhenie = koren.querySelector<HTMLFormElement>('#forma-dvizhenie');
  formaDvizhenie?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-dvizhenie')!;
    kazhi.textContent = '';
    const danni = new FormData(formaDvizhenie);
    try {
      await k.deystviya.zapishiDvizhenieNaProdazhba(
        {
          dvizhenieId: `DV:${crypto.randomUUID()}`,
          prodazhbaId: izbranata(),
          vid: String(danni.get('vid') ?? ''),
          suma_st: otLeva(String(danni.get('suma') || '0')),
          data: String(danni.get('data') ?? ''),
          belezhka: String(danni.get('belezhka') ?? '').trim(),
        },
        { opId: `dvizhenie:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Движението е записано.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaSastoyanie = koren.querySelector<HTMLFormElement>('#forma-sastoyanie');
  formaSastoyanie?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-sastoyanie')!;
    kazhi.textContent = '';
    const danni = new FormData(formaSastoyanie);
    try {
      /**
       * ЦЯЛАТА СДЕЛКА СЕ ПРЕЗАПИСВА · „последната дума бие".
       *
       * Другите ѝ полета се четат от ОГЛЕДАЛОТО, не от екрана: изписаното е
       * форматирано за човек („1 234,56 €") и обратният му прочит е втори
       * четец на едно и също число. Огледалото носи центовете такива, каквито
       * са влезли — а това е смяна на СЪСТОЯНИЕ, не поправка на числата.
       */
      const o = await k.deystviya.ogledalo();
      const sega = o.prodazhbi.get(izbranata());
      if (!sega) return;
      await k.deystviya.zapishiProdazhba(
        {
          prodazhbaId: sega.id,
          imotId: sega.imotId,
          kupuvach: sega.kupuvach,
          telefon: sega.telefon,
          tsena_st: sega.tsena_st,
          prodazhba_st: sega.prodazhba_st,
          smr_st: sega.smr_st,
          pd_st: sega.pd_st,
          sastoyanie: String(danni.get('sastoyanie') ?? ''),
          prichina: 'смяна на състоянието',
        },
        { opId: `prodazhba-sastoyanie:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Състоянието е сменено.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}

/** Колоните за регистъра на таблиците · колонното право ги чете оттук. */
export function koloniNaProdazhbite(): readonly { ime: string }[] {
  return KOLONI.map((ime) => ({ ime }));
}
