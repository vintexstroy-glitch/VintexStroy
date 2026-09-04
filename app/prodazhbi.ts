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
  etapite,
  imeNaSastoyanieto,
  koloni,
  OTGOVORENITE,
  podredeni,
  posokata,
  redovete,
  SASTOYANIYA,
  sveri,
  vArhiva,
  zatvoreniteKoloni,
  type Etap,
  type RedNaProdazhbite,
} from '../src/domein/prodazhbi.js';
import { NACHINI_NA_PLASHTANE } from '../src/domein/sabitiya.js';
import { broyDokumenti, butonNaDokumentite } from './dokumenti.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  filtriray,
  glaviNaTablitsata,
  poleZaTarsene,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Коя сделка е отворена за движения · ПОГЛЕД, нула събития (ADR-022). */
function izbranata(): string {
  return chetiEkranno('prodazhbi.izbrana', '');
}

/**
 * Колоните, които носят ПАРИ · само те се пишат с валутен знак (ADR-014).
 *
 * Смятат се от ЖИВИЯ списък: добавеният етап също е пари, и преписан тук ръчно
 * щеше да остане текст в деня, в който Стопанинът го добави (правило 17).
 */
function parichni(etapi: readonly Etap[]): ReadonlySet<string> {
  return new Set([
    'Цена €',
    'Продажба €',
    'СМР €',
    'ПД',
    'проверка',
    // ВСЕКИ ДОБАВЕН етап е пари · базовите „връщане" и „неустойка" нямат
    // колона и не влизат тук (те живеят в своя блок).
    ...etapi.filter((e) => e.vnoska || !e.bazov).map((e) => e.klyuch),
  ]);
}

/** Стойността на една клетка · един дом за „кое къде е" (правило 17). */
function kletkata(r: RedNaProdazhbite, kolona: string): string {
  const p = r.prodazhba;
  switch (kolona) {
    case 'Обект':
      return r.obekt;
    case 'Имот':
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
      return pishi(r.poEtap[kolona] ?? 0);
  }
}

/** Числото в центове · за сортиране и за сверка от прохода. */
function vTsentove(
  r: RedNaProdazhbite,
  kolona: string,
  pari: ReadonlySet<string>,
): number | undefined {
  const p = r.prodazhba;
  if (kolona === 'Цена €') return p.tsena_st;
  if (kolona === 'Продажба €') return p.prodazhba_st;
  if (kolona === 'СМР €') return p.smr_st;
  if (kolona === 'ПД') return p.pd_st;
  if (kolona === 'проверка') return r.proverka.razlika_st;
  if (pari.has(kolona)) return r.poEtap[kolona] ?? 0;
  return undefined;
}

/**
 * КОЛОНИТЕ ЗА ДВИГАТЕЛЯ · смятат се от ЖИВИЯ списък (резен 75в · И124 т.2).
 *
 * Продажби е единствената таблица с ДИНАМИЧНИ колони: добавеният етап е
 * колона като всяка друга, а колонното право решава кои изобщо са живи
 * (`koloni(o)` ги дава ВЕЧЕ стеснени — правото минава ПРЕЗ филтъра, не
 * покрай него). Затова описът не се пише на ръка, а се извежда: парична
 * колона дава центовете си (за групите по прагове и сбора), текстова —
 * изписаното. Затворените индекси идват от същия дом като досега.
 */
function koloniSFiltar(
  zhivi: readonly string[],
  zatvoreni: readonly number[],
  pari: ReadonlySet<string>,
): readonly KolonaSFiltar<RedNaProdazhbite>[] {
  return zhivi.map((ime, i) => ({
    klyuch: ime,
    ime,
    vid: pari.has(ime) ? ('evro' as const) : ('tekst' as const),
    vzemi: (r: RedNaProdazhbite) =>
      pari.has(ime) ? (vTsentove(r, ime, pari) ?? 0) : kletkata(r, ime),
    zatvorena: zatvoreni.includes(i),
  }));
}

function redNaTablitsata(
  r: RedNaProdazhbite,
  zhivi: readonly string[],
  pari: ReadonlySet<string>,
): string {
  const p = r.prodazhba;
  const nezadadeno = p.sastoyanie === 'nezadadeno';
  const izbran = izbranata() === p.id;
  return `
      <div class="red prodazhbared${nezadadeno ? ' duljimo' : ''}${izbran ? ' izbran' : ''}"
           translate="no" data-prodazhba="${ekraniraj(p.id)}"
           data-sastoyanie="${ekraniraj(p.sastoyanie)}"
           data-proverka="${r.proverka.razlika_st}">
        ${zhivi
          .map((k) => {
            const tsentove = vTsentove(r, k, pari);
            const st = tsentove === undefined ? '' : ` data-st="${tsentove}"`;
            return `<span class="kletka${pari.has(k) ? ' suma' : ''}"${st}>${ekraniraj(
              kletkata(r, k),
            )}</span>`;
          })
          .join('')}
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
  const etapi = etapite(o);
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

      <p class="drebno">Хартията по сделката се закача тук:
      ${butonNaDokumentite('prodazhba', r.prodazhba.id, broyDokumenti(o, 'prodazhba', r.prodazhba.id))}
      Негово, 29.08: информацията за плащанията по банка от ПД „<b>ще е в фолдър
      който ще се чете от ПДФ или друго</b>, където ще пише какви са вноските
      името и друга нужна информация". Файлът остава в Драйва — влиза
      отпечатъкът му, не байтовете (ADR-073).</p>

      <p class="drebno"><b>ПД и СМР са двата пътя на парите ПО БАНКА</b> — негово,
      29.08: „Пд и СМР е двата пътя на парите по банка за покупка с ПД(Предварителен
      Договор и) и СМР(Строително монтажнио работи(. Тях ги получаваме ние на ръка и
      са кеш." Затова всяко движение носи СВОЙ начин, а не се подразбира от вида.</p>

      <p class="drebno">Връщането и неустойката стоят ОТДЕЛНО и НЕ влизат в
      проверката — негово: „Неустойките се превеждат <b>отделно</b>, никакво
      нетиране." Затова тук са две числа, а не едно:
      <b translate="no" data-vrashtane="${r.izvan.vrashtane_st}">${pishi(r.izvan.vrashtane_st)}</b>
      върнато ·
      <b translate="no" data-neustoyka="${r.izvan.neustoyka_st}">${pishi(r.izvan.neustoyka_st)}</b>
      неустойка.</p>

      ${
        zaklyuchena
          ? `<p class="drebno">Сделката е в <b>Продажби Завършени</b>. „Няма връщане
             от Продажби Архив. Там не се трив нищо а само се сверява." Ново движение
             оттук нататък влиза в Приходи, не тук.</p>`
          : `<form id="forma-dvizhenie" class="redditsa">
          <label class="pole">
            <span>Вид</span>
            <select name="vid" id="dvizhenie-vid">
              ${etapi
                .map(
                  (v) =>
                    `<option value="${ekraniraj(v.klyuch)}">${ekraniraj(v.klyuch)}${
                      v.vnoska ? '' : ' · извън проверката'
                    }${v.bazov ? '' : ' · добавен'}</option>`,
                )
                .join('')}
            </select>
          </label>
          <label class="pole">
            <span>Начин</span>
            <select name="nachin" id="dvizhenie-nachin">
              ${NACHINI_NA_PLASHTANE.map(
                (n) => `<option value="${ekraniraj(n.klyuch)}">${ekraniraj(n.ime)}</option>`,
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
          <span class="kletka">Начин</span>
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
             data-posoka="${posokata(d.suma_st)}" data-nachin="${ekraniraj(d.nachin)}">
          <span class="kletka">${ekraniraj(d.vid)}</span>
          <span class="suma" data-st="${d.suma_st}">${pishi(d.suma_st)}</span>
          <span class="kletka">${ekraniraj(d.nachin)}</span>
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

export function narisuvayProdazhbi(o: Ogledalo, dnes: string): string {
  const zhivi = koloni(o);
  const zatvoreni = zatvoreniteKoloni(o);
  const pari = parichni(etapite(o));
  const koloniF = koloniSFiltar(zhivi, zatvoreni, pari);
  const vsichki = podredeni(redovete(o));
  const tekushti = vsichki.filter((r) => !vArhiva(r.prodazhba.sastoyanie));
  const arhiv = vsichki.filter((r) => vArhiva(r.prodazhba.sastoyanie));
  const fTekushti = filtriray('prodazhbi', tekushti, koloniF, dnes);
  const fArhiv = filtriray('prodazhbi-zavarsheni', arhiv, koloniF, dnes);
  const izbrana = vsichki.find((r) => r.prodazhba.id === izbranata());
  const s = sveri(o, vsichki);
  const imoti = [...o.imoti.values()];

  return `
    <section data-sektsiya="prodazhbi-tekushti">
      <div class="dyalglava">
        <h2>Продажби Активни</h2>
        <span>петнайсет колони · неговите, в неговия ред</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Активни</span>
          <span class="chislo" translate="no" data-tekushti="${tekushti.length}">${tekushti.length}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Завършени</span>
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
          ? `<p class="drebno">Няма нито един обект. Сделката се <b>вади от таблица
             Наеми</b> и се мести тук ръчно — без обект няма какво да се продаде.</p>`
          : `<form id="forma-prodazhba" class="redditsa">
        <label class="pole">
          <span>Обект</span>
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

      ${poleZaTarsene('prodazhbi')}
      <div class="tablitsa" data-tablitsa="prodazhbi">
        <div class="red glava prodazhbared" translate="no">
          ${glaviNaTablitsata('prodazhbi', koloniF, tekushti, dnes)}
        </div>
        ${
          tekushti.length === 0
            ? '<p class="drebno">Няма нито една текуща сделка.</p>'
            : fTekushti.redove.map((r) => redNaTablitsata(r, zhivi, pari)).join('')
        }
      </div>
      ${redZaSkritoto(fTekushti, 'prodazhbi')}
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
        <p class="drebno"><b>„Продадена · завършена" е еднопосочна.</b> Щом сделката
        влезе там, нито тя, нито движенията ѝ се пипат повече — „Там не се трив
        нищо а само се сверява."</p>
      </section>`
      }`
    }

    <section data-sektsiya="prodazhbi-zavarsheni">
      <div class="dyalglava">
        <h2>Продажби Завършени</h2>
        <span>терминалът · оттук няма връщане</span>
      </div>
      ${arhiv.length ? poleZaTarsene('prodazhbi-zavarsheni') : ''}
      <div class="tablitsa" data-tablitsa="prodazhbi-zavarsheni">
        <div class="red glava prodazhbared" translate="no">
          ${glaviNaTablitsata('prodazhbi-zavarsheni', koloniF, arhiv, dnes)}
        </div>
        ${
          arhiv.length === 0
            ? '<p class="drebno">Няма завършена сделка · нито една не е стигнала до нотариус.</p>'
            : fArhiv.redove.map((r) => redNaTablitsata(r, zhivi, pari)).join('')
        }
      </div>
      ${redZaSkritoto(fArhiv, 'prodazhbi-zavarsheni')}
    </section>

    <section data-sektsiya="prodazhbi-chakat">
      <div class="dyalglava">
        <h2>Какво ЧАКА негова дума</h2>
        <span>броено, не твърдяно</span>
      </div>
      ${
        CHAKAT_NEGOVA_DUMA.length === 0
          ? `<p class="drebno" data-chakat="0">Нищо не чака. И тази нула се КАЗВА:
             празно поле не различава „всичко е отговорено" от „никой не е питал".</p>`
          : `<p class="drebno" data-chakat="${CHAKAT_NEGOVA_DUMA.length}">Тези
             ${CHAKAT_NEGOVA_DUMA.length} неща нямат негов отговор и затова не се
             измислят тук (правило 18):</p>
           <ul class="drebno">
             ${CHAKAT_NEGOVA_DUMA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
           </ul>`
      }
      <p class="drebno" data-otgovoreni="${OTGOVORENITE.length}">С негови думи,
      29.08:</p>
      <ul class="drebno">
        ${OTGOVORENITE.map(
          (x) =>
            `<li><b>${ekraniraj(x.vapros)}</b> — „${ekraniraj(x.dumite)}"</li>`,
        ).join('')}
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
          nachin: String(danni.get('nachin') ?? ''),
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

/**
 * Колоните за регистъра на таблиците · колонното право ги чете оттук.
 *
 * ЖИВИТЕ, не закованите петнайсет: добавеният етап е колона като всяка друга и
 * правото върху него се раздава по същия начин. Инак Стопанинът щеше да добави
 * колона, която матрицата не вижда — тоест право, което никой не може да стесни.
 */
export function koloniNaProdazhbite(o: Ogledalo): readonly { ime: string }[] {
  return koloni(o).map((ime) => ({ ime }));
}
