/**
 * СТОЙНОСТ НА СЪСТОЯНИЕ (КАЛКУЛАТОР) · шестият екран.
 *
 * Негови думи (23.08), които дадоха и името, и съдържанието:
 *
 *   „**Новото име е Стойност на Състояние (Калкулатор).** Пресмята всичките
 *    налични имоти в движение като наеми и продажби, и вкарани през Управление
 *    се появяват в Калкулатора; **намираш се в Стойност на Състояние, където
 *    сборът е тази стойност на състоянието общо**. Другото е старо име."
 *
 * И за пътищата:
 *
 *   „Има вече една папка с площите и друга с Ценови листи. **Чете от папката с
 *    площите и записва в таблицата с Цените.**"
 *
 * ЗАТОВА ЕКРАНЪТ ИМА ТОЧНО ДВА БУТОНА, и всеки с ЕДНА посока (правило 20):
 * единият ЧЕТЕ площообразуването, другият ПИША ценовата листа. Бутон, който
 * чете, няма път към писане.
 *
 * „НЯМА РЕДАКЦИЯ ОТТАМ, А САМО ИЗЧИСЛЯВАНЕ" — негово изречение от 09.08, и
 * затова тук няма нито едно поле за писане в таблицата. Числата се смятат и се
 * показват; в Журнала влиза изборът на матрица, не самите цени.
 */

import { pishi } from '../src/yadro/pari.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { dnesKato, ekraniraj, svaliFayl } from './obshto.js';
import {
  opIdNaObekta,
  ploshttaZaImota,
  proveriImetoNaSgradata,
  sveriSazdavaneto,
  zaVpisvane,
} from '../src/kalkulator/sazdavane.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { tablitsiteNa } from '../src/iztochnik/chetetsat.js';
import { type Tablitsa } from '../src/iztochnik/tablitsa.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import {
  eListSPloshti,
  IMENA_NA_VIDOVETE_OBEKT,
  kvSmVM2,
  prochetiPloshti,
  vidPoIme,
  type ProchetenObekt,
} from '../src/kalkulator/chetene.js';
import { eListTseniMD, prochetiTseniMD, type ProchetenoTseniMD } from '../src/kalkulator/tseni-md.js';
import {
  sverkaNaPartida,
  stoynostNaSastoyanie,
  type OtTsenovaLista,
  type StoynostNaSastoyanie,
} from '../src/kalkulator/stoynost.js';
import {
  IMENA_NA_IZBORA,
  listNaTsenite,
  prochetiTsenovaLista,
  type KoyaTsena,
} from '../src/kalkulator/tsenova-lista.js';
import { imotatNaObekta, kartaNaImotite, kartaNaNaemite } from '../src/kalkulator/svarzvane.js';
import { PRAZEN_FILTAR, filtriray, glaviNaTablitsata, grupiranaTablitsa, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import {
  nastroykiteNaKalkulatora,
  pokazhiObekt,
  sektsiyaKalkulator,
  zakachiKalkulator,
} from './kalkulator.js';
import { matritsaOtNastroyki, sluchay } from '../src/kalkulator/nastroyki.js';
import type { Konteks } from './ekranite.js';

/** Прочетеното живее, докато екранът стои отворен — в Журнала влиза избор, не цени. */
let obekti: readonly ProchetenObekt[] = [];
let otLista: ReadonlyMap<string, OtTsenovaLista> = new Map();
/** Последният прочит на „ЦЕНИ МД" · носи цените и белега ПРОДАДЕН — за
 *  вписването в Имоти и делата (И92). */
let otMD: ProchetenoTseniMD | null = null;
/**
 * ИМЕТО НА СГРАДАТА · памет на ЕКРАНА, нула събития (резен 29).
 *
 * Живее тук, а не в Журнала: докато сградата не е създадена, това е чернова —
 * записано, то щеше да е решение, което човекът не е взел.
 */
let imeNaSgradata = '';
let smetnato: StoynostNaSastoyanie | null = null;
let naemiOtZhurnala: ReadonlyMap<string, number> = new Map();
/** обект → `imotId` · „Продаден" от менюто иска САМОЛИЧНОСТ, не число (29.08) */
let imotiPoObekt: ReadonlyMap<string, string> = new Map();
/** кои обекти вече имат сделка · продаденото се чете И от Журнала */
let prodadeniOtZhurnala: ReadonlySet<string> = new Set();
/** Коя цена се пуска при износ. Негов отговор: „и двете" · изборът се помни. */
let koyaTsena: KoyaTsena = chetiEkranno<KoyaTsena>('stoynost.koyaTsena', 'dvete');
let vest = '';
let greshka = '';

/**
 * КОЙ СБОР ДА ВЛЕЗЕ В КАПИТАЛА · Отчетите го четат оттук.
 *
 * Връща `undefined`, докато калкулаторът не е смятал в тази сесия — и това е
 * вярно, а не липса на данни: Стойността на Състояние не влиза в Журнала
 * (ADR-015), там влиза изборът на матрица. Отчетите казват, че я чакат,
 * вместо да гадаят число от площите.
 *
 * Дава сбора по **Б · по състояние** (доходния подход), защото той е ОЦЕНКА на
 * това, което имаме, а А е цена за продажба (ADR-016). В капитал влиза оценка.
 *
 * И дава ТОЧНОТО число, не закръгленото. Правило 3, дословно: „закръгленото
 * НИКОГА не влиза в сбор". Дотук тук се връщаше `sastoyanie_st` — сборът от
 * цени, всяка закръглена НАГОРЕ до цяло евро — и това качваше Капитала с до
 * един евро на обект. При 22 обекта разликата е тиха и правдоподобна: числото
 * пак изглежда като число.
 *
 * Закръгленото си остава на ЕКРАНА (`narisuvayStoynost`), където до него стои
 * и колко е закръглено. Показва се закръглено, пази се точно.
 */
export function sboratZaKapitala(): number | undefined {
  return smetnato?.sastoyanie_tochno_st;
}

/**
 * ДВЕТЕ СЕКЦИИ · неговото предложение в И96 т.2, изпълнено.
 *
 *   „Ако се налага направи **секция Калкулатор и секция Ценова листа**."
 *
 * Горе е ВХОДЪТ — матрицата, коефициентите, доходността и разбивката „как се
 * смята". Долу е ИЗХОДЪТ — обект по обект, двете графи и разликата.
 *
 * Разделени, защото се гледат от различни хора в различен момент: матрицата се
 * пипа веднъж на сезон, листата — всеки ден.
 */
export function narisuvayStoynost(): string {
  const n = nastroykiteNaKalkulatora();
  return `
    ${sektsiyaKalkulator()}

    <div class="dyalglava">
      <h2>Ценова листа</h2>
      <span>изходът · тук се ПОКАЗВА и оттук се изнася</span>
    </div>

    <div class="plochki">
      <div class="plochka golyama" data-pole="stoynost-a">
        <span class="etiket">А · по площ</span>
        <span class="chislo" translate="no">${smetnato ? pishi(smetnato.obshto_st) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `${smetnato.broy} ${smetnato.broy === 1 ? 'обект' : 'обекта'} в движение${
                smetnato.prodadeni ? ` · ${smetnato.prodadeni} продадени не влизат` : ''
              } · закръглено ${sZnak(smetnato.razlika_st)}`
            : 'прочети площообразуването, за да се смята'
        }</span>
      </div>
      <div class="plochka golyama" data-pole="stoynost-b">
        <span class="etiket">Б · по състояние</span>
        <span class="chislo" translate="no">${smetnato ? pishi(smetnato.sastoyanie_st) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `${vBT(smetnato.razlika_na_metodite_bt)} спрямо цената по площ · закръглено ${sZnak(
                smetnato.razlika_sastoyanie_st,
              )}`
            : 'оценката · годишен наем ÷ доходност'
        }</span>
      </div>
      <div class="plochka golyama" data-pole="stoynost-v">
        <span class="etiket">В · по разход</span>
        <span class="chislo" translate="no">${smetnato ? pishi(smetnato.razhod_st) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `земя + строителство − овехтяване · закръглено ${sZnak(smetnato.razlika_razhod_st)}`
            : 'себестойността · земята НЕ овехтява'
        }</span>
      </div>
      <div class="plochka golyama" data-pole="stoynost-saglasuvana">
        <span class="etiket">Съгласуваната</span>
        <span class="chislo" translate="no">${smetnato ? pishi(smetnato.saglasuvana_st) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `${ekraniraj(sluchay(n.sluchay).ime)} · ${vProtsent(n.tegla.pazaren_bt)} / ${vProtsent(
                n.tegla.dohoden_bt,
              )} / ${vProtsent(n.tegla.razhoden_bt)} · закръглено ${sZnak(smetnato.razlika_saglasuvana_st)}`
            : 'трите подхода, претеглени'
        }</span>
      </div>
      <div class="plochka">
        <span class="etiket">Матрица</span>
        <span class="chislo malka" translate="no">${ekraniraj(n.rayon)}</span>
        <span class="pod">база ${pishi(n.baza_st.apartament)}/м² · доходност ${vProtsent(n.dohodnost_bt)} · сменя се горе</span>
      </div>
    </div>

    ${vest ? `<div class="vest dobre">${ekraniraj(vest)}</div>` : ''}
    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    <section data-sektsiya="tsenova-lista">
      <div class="dyalglava">
        <h2>Двата пътя</h2>
        <span>посоката е ЕДНА · бутон, който чете, няма път към писане</span>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="cheti-ploshti">Чети от Площообразуване</button>
        <button type="button" class="vtorichen" id="cheti-tseni">Чети Ценова листа</button>
        <label class="pole tyasno">
          <span>Кои цени се пускат</span>
          <select translate="no" id="koya-tsena">
            ${(['dvete', 'plosht', 'sastoyanie', 'razhod', 'saglasuvana'] as const)
              .map(
                (k) =>
                  `<option value="${k}"${k === koyaTsena ? ' selected' : ''}>${IMENA_NA_IZBORA[k]}</option>`,
              )
              .join('')}
          </select>
        </label>
        <button type="button" class="vtorichen" id="pishi-tseni"${smetnato ? '' : ' disabled'}>Запиши в Ценови листи</button>
        ${
          otMD
            ? '<button type="button" class="glaven" id="vpishi-obekti">Впиши обектите в Имоти и делата им</button>'
            : ''
        }
      </div>
      ${
        /**
         * „СЪЗДАЙ СГРАДА" · Калкулаторът и РАЖДА (резен 29 · ADR-089).
         *
         * Негово: „да ще е най интересно да има създай сграда там . Качваш
         * таблицата и управлваш" *(р83·[20])*, и обхватът от същия ден: „всипки
         * се създават от Упрсвление. Само от там.. При сгради ще е от
         * калкулатова" *(р83·[18])*.
         *
         * Редът се ЯВЯВА чак когато има прочетени обекти: бутон, който няма
         * какво да роди, е надпис (ADR-041).
         */
        obekti.length === 0
          ? ''
          : `<div class="deystviya" data-sektsiya="sazday-sgrada">
        <label class="pole">
          <span>Име на сградата</span>
          <input translate="no" type="text" id="ime-sgrada" value="${ekraniraj(imeNaSgradata)}"
                 placeholder="ул. Иван Вазов 12, Пловдив">
        </label>
        <button type="button" class="glaven" id="sazday-sgrada">Създай сграда · ${obekti.length} обекта</button>
        <span class="drebno">Обектите се записват като <b>Обекти</b> на Имота с това име. Второто
        натискане не удвоява нищо: адресът на действието е сградата и обектът,
        не случайно число. <b>Дела не се раждат</b> — те са негов сценарий за
        конкретна сграда, а измислени дела за чужда са по-лоши от липсващи.</span>
      </div>`
      }
      <input translate="no" type="file" id="fayl-ploshti" accept=".xlsx,.xlsb,.csv" hidden>
      <input translate="no" type="file" id="fayl-tseni" accept=".xlsx,.xlsb,.csv" hidden>
      <p class="drebno">Площообразуването дава <b>обект · етаж · чиста и обща площ</b>; общите части се смятат от разликата. Ценовата листа дава <b>изложение, стаи и тераси</b> и казва кое е <b>ПРОДАДЕН</b>. Таблицата не се пресъздава — взима се само нужното.</p>
      <p class="drebno"><b>А продава, Б оценява, В казва колко струва да се построи.</b>
      Съгласуваната ги ПРЕТЕГЛЯ по избрания случай — „професионалната практика не избира
      един подход, а ги претегля". Подход с нулева стойност отпада и теглото му се
      пренормира; редът го КАЗВА, вместо цената да падне мълчаливо.</p>
    <p class="drebno"><b>А продава, Б оценява.</b> А е площ × база × коефициенти за етаж и изложение; Б е годишен наем ÷ доходност. За имотите с наем в Журнала Б ползва <b>действителния</b> наем, не очаквания — и редът го казва. При износ неговите единайсет колони остават непокътнати; сравнението се долепя отдясно.</p>
    </section>

    ${smetnato ? tablitsaNaStoynostta(smetnato) : ''}`;
}

/** Колоните на обектите — фините филтри важат и тук (ADR-022 · вълна 2). */
export function koloniNaObektite(): KolonaSFiltar<StoynostNaSastoyanie['redove'][number]>[] {
  return [
    { klyuch: 'obekt', ime: 'Обект', vid: 'tekst', vzemi: (r) => r.obekt },
    {
      klyuch: 'etazh',
      ime: 'Етаж · вид',
      vid: 'tekst',
      vzemi: (r) => `${r.etazh || '—'} · ${IMENA_NA_VIDOVETE_OBEKT[r.vid]}`,
    },
    { klyuch: 'chista', ime: 'Чиста', vid: 'chislo', vzemi: (r) => kvSmVM2(r.chista_kvsm) },
    { klyuch: 'obshta', ime: 'Обща', vid: 'chislo', vzemi: (r) => kvSmVM2(r.obshta_kvsm) },
    { klyuch: 'izlozhenie', ime: 'Изложение', vid: 'tekst', vzemi: (r) => r.izlozhenie },
    { klyuch: 'naem', ime: 'Наем', vid: 'evro', vzemi: (r) => r.naem_mesechen_st },
    { klyuch: 'a', ime: 'А · по площ', vid: 'evro', vzemi: (r) => (r.prodaden ? '' : r.tsena_st) },
    { klyuch: 'b', ime: 'Б · по състояние', vid: 'evro', vzemi: (r) => (r.prodaden ? '' : r.sastoyanie_st) },
    { klyuch: 'delta', ime: 'Разлика', vid: 'chislo', vzemi: (r) => (r.prodaden ? '' : r.razlika_bt) },
    { klyuch: 'v', ime: 'В · по разход', vid: 'evro', vzemi: (r) => (r.prodaden ? '' : r.razhod_st) },
    {
      klyuch: 'saglasuvana',
      ime: 'Съгласувана',
      vid: 'evro',
      vzemi: (r) => (r.prodaden ? '' : r.saglasuvana_st),
    },
  ];
}

function tablitsaNaStoynostta(s: StoynostNaSastoyanie): string {
  const dnes = dnesKato();
  const koloni = koloniNaObektite();
  const f = filtriray('stoynost', s.redove, koloni, dnes);
  return `
    <section data-sektsiya="stoynost-obektite">
      <div class="dyalglava">
        <h2>Обектите</h2>
        <span>${s.redove.length} реда · сборът отгоре е стойността на състоянието</span>
      </div>
      ${poleZaTarsene('stoynost')}
      <div class="tablitsa" data-tablitsa="stoynost">
        <div class="glava stoynost">
          ${glaviNaTablitsata('stoynost', koloni, s.redove, dnes)}
        </div>
        ${
          f.redove.length === 0
            ? PRAZEN_FILTAR
            : grupiranaTablitsa('stoynost', f.redove, koloni, dnes, redNaObekt)
        }
        <div class="red stoynost sbor" translate="no">
          <span class="kletka"><b>Стойност на Състояние</b><span>без продаденото</span></span>
          <span></span><span></span><span></span><span></span><span></span>
          <span class="suma plateno" data-st="${s.obshto_st}">${pishi(s.obshto_st)}</span>
          <span class="suma plateno" data-st="${s.sastoyanie_st}">${pishi(s.sastoyanie_st)}</span>
          <span class="suma">${vBT(s.razlika_na_metodite_bt)}</span>
          <span class="suma plateno" data-st="${s.razhod_st}">${pishi(s.razhod_st)}</span>
          <span class="suma plateno" data-st="${s.saglasuvana_st}">${pishi(s.saglasuvana_st)}</span>
        </div>
      </div>
      ${redZaSkritoto(f, 'stoynost')}
      <p class="greshka" id="greshka-prodaden"></p>
      <p class="drebno">Трите точки на реда отварят неговите функции. Днес там
      има ЕДНА: <b>Продаден</b> — праща реда от цените в таб <b>Продажби</b> и
      сделката застава в „Продажби Активни", червена, докато не ѝ се зададе
      състояние.</p>
      <p class="drebno">Цената на всеки обект е закръглена <b>нагоре до стотица</b>; сборът се смята от <b>точните</b> цени и се закръгля веднъж — закръгленото никога не влиза в сбор. Скритото от филтъра ПАК влиза в сбора отгоре — той е стойността на състоянието, не на екрана (правило 23).</p>
    </section>`;
}

/**
 * ТРИТЕ ВЕРТИКАЛНИ ТОЧКИ на един ред · неговата поръчка от 29.08.
 *
 *   „Всеки имот след като е вкаран в Калкулатора да има избор на всеки имот с
 *    3 вертикални точки за различни функции които да се вкарат там ако има
 *    смисъл и е по добре за кода. Там избираш продаден и го праща от цени в
 *    таб Продажби."
 *
 * ЕДНА функция днес, и тя е неговата: „Продаден". Менюто е ОТВОРЕНО за още —
 * но празни пунктове „скоро" не се слагат: надпис върху непостроено е точно
 * онова, което ADR-041 брои като дефект.
 *
 * ПРОДАДЕНИЯТ РЕД НЕ ГО ПОКАЗВА · там вече няма какво да се избира.
 */
function tochkiteNaReda(r: StoynostNaSastoyanie['redove'][number]): string {
  if (r.prodaden) return '';
  return `<button type="button" class="tochki" data-prodaden="${ekraniraj(r.obekt)}"
          title="Продаден · праща реда в Продажби">⋮</button>`;
}

function redNaObekt(r: StoynostNaSastoyanie['redove'][number]): string {
  return `
    <div class="red stoynost${r.prodaden ? ' mahnata' : ''}" translate="no">
      <span class="kletka"><b>${ekraniraj(r.obekt)}</b>${
        r.terasi_kvsm ? `<span>тераса ${kvSmVM2(r.terasi_kvsm)} м²</span>` : ''
      }${tochkiteNaReda(r)}</span>
      <span class="kletka"><span>${ekraniraj(r.etazh) || '—'}</span><span>${IMENA_NA_VIDOVETE_OBEKT[r.vid]}${
        r.stai ? ` · ${r.stai} стаи` : ''
      }</span></span>
      <span class="suma">${kvSmVM2(r.chista_kvsm)}</span>
      <span class="suma">${kvSmVM2(r.obshta_kvsm)}</span>
      <span>${ekraniraj(r.izlozhenie) || '—'}</span>
      <span class="kletka" data-st="${r.naem_mesechen_st}"><span>${pishi(r.naem_mesechen_st)}</span><span class="znachka ${
        r.naemOt === 'zhurnal' ? 'dobre' : 'tiha'
      }">${r.naemOt === 'zhurnal' ? 'от Журнала' : 'очакван'}</span></span>
      <span class="suma${r.prodaden ? '' : ' plateno'}"${r.prodaden ? '' : ` data-st="${r.tsena_st}"`}>${
        r.prodaden ? '<span class="znachka tiha">ПРОДАДЕН</span>' : pishi(r.tsena_st)
      }</span>
      <span class="suma${r.prodaden ? '' : ' plateno'}"${r.prodaden ? '' : ` data-st="${r.sastoyanie_st}"`}>${
        r.prodaden ? '' : pishi(r.sastoyanie_st)
      }</span>
      <span class="suma">${r.prodaden ? '' : vBT(r.razlika_bt)}</span>
      <span class="suma${r.prodaden ? '' : ' plateno'}"${r.prodaden ? '' : ` data-st="${r.razhod_st}"`}>${
        r.prodaden ? '' : pishi(r.razhod_st)
      }</span>
      <span class="kletka suma"${r.prodaden ? '' : ` data-st="${r.saglasuvana_st}"`}>${
        r.prodaden
          ? ''
          : `<span>${pishi(r.saglasuvana_st)}</span>${
              // ОТПАДНАЛИЯТ ПОДХОД СЕ КАЗВА НА РЕДА · инак теглото му се яде и
              // цената пада, без нищо на екрана да го обяснява (правило 15).
              r.otpadnali.length
                ? `<span class="znachka tiha" data-otpadnali>без ${ekraniraj(r.otpadnali.join(' · '))}</span>`
                : ''
            }`
      }</span>
    </div>`;
}

/**
 * Разликата от закръглянето, СЪС знака си.
 *
 * Тя се вижда, а не се преглъща (правило 7): сборът се смята от ТОЧНИТЕ цени,
 * показва се закръгленият, и колко е „изяло" закръглянето стои под него. Нулата
 * също се казва — проверената нула е различна от нулата, за която никой не пита.
 */
function sZnak(razlika_st: number): string {
  const kakvo = pishi(Math.abs(razlika_st));
  return razlika_st < 0 ? `−${kakvo}` : `+${kakvo}`;
}

/** Базисни точки → четимо: −2 543 б.т. става „−25,4 %". */
function vBT(bt: number): string {
  const znak = bt > 0 ? '+' : bt < 0 ? '−' : '';
  // Първо се закръгля до десети, ПОСЛЕ се дели: закръглянето по остатъка
  // губеше преноса — 2 599 б.т. излизаше „25,10 %" вместо „26,0 %".
  const desetinki = Math.round(Math.abs(bt) / 10);
  return `${znak}${Math.floor(desetinki / 10)},${desetinki % 10} %`;
}

/** Базисни точки като процент: 320 → „3,20 %". */
function vProtsent(bt: number): string {
  return `${Math.floor(bt / 100)},${String(bt % 100).padStart(2, '0')} %`;
}

// ── закачането ─────────────────────────────────────────────────────────────
export function zakachiStoynost(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  /**
   * ТРИТЕ ТОЧКИ · „Там избираш продаден и го праща от цени в таб Продажби."
   *
   * ЕДНО СЪБИТИЕ, не две: сделката се отваря в състояние „не е зададено" и
   * стои ЧЕРВЕНА в Продажби, докато човек не ѝ каже какво е (ADR-078 §6).
   * Купувачът и числата още не се знаят — измислени тук, те щяха да влязат в
   * книгата като факт.
   *
   * ОТКАЗЪТ СЕ КАЗВА: обект, чието име не се връзва с имот (вид + номер), няма
   * какво да продаде — и екранът го обяснява, вместо да мълчи (правило 15).
   */
  for (const b of koren.querySelectorAll<HTMLElement>('[data-prodaden]')) {
    b.addEventListener('click', async () => {
      const obekt = b.dataset['prodaden'] ?? '';
      const kazhi = koren.querySelector<HTMLElement>('#greshka-prodaden');
      if (kazhi) kazhi.textContent = '';
      const imotId = imotatNaObekta(obekt, imotiPoObekt);
      if (imotId === undefined) {
        if (kazhi) {
          kazhi.textContent =
            `„${obekt}" не се връзва с обект по вид и номер. Сделката иска обект — ` +
            'от него се четат „Обект" и „Имот".';
        }
        return;
      }
      try {
        await k.deystviya.zapishiProdazhba(
          {
            prodazhbaId: `PR:${crypto.randomUUID()}`,
            imotId,
            kupuvach: '',
            telefon: '',
            tsena_st: 0,
            prodazhba_st: 0,
            smr_st: 0,
            pd_st: 0,
            sastoyanie: 'nezadadeno',
          },
          { opId: `prodazhba-ot-kalkulatora:${crypto.randomUUID()}` },
        );
        k.vest('dobre', `${obekt} е продаден · сделката чака да ѝ се зададе състояние.`);
        await prerisuvay();
      } catch (err) {
        if (kazhi) kazhi.textContent = dumiZaGreshka(err);
      }
    });
  }

  /**
   * ЛИСТАТА СЕ СМЯТА С НАСТРОЙКИТЕ ОТ СЕКЦИЯ „КАЛКУЛАТОР".
   *
   * Това е връзката между двете секции и целият смисъл на разделянето: смени
   * базата или коефициент горе — числата долу тръгват след него. Иначе
   * секцията горе би била украса, а той поиска вход, не табло.
   *
   * И РАЗБИВКАТА тръгва след първия обект в движение: така „как се смята"
   * говори за НЕГОВ обект, а не за примерния.
   */
  const presmetni = (): void => {
    if (obekti.length === 0) {
      smetnato = null;
      return;
    }
    smetnato = stoynostNaSastoyanie(
      obekti,
      otLista,
      matritsaOtNastroyki(nastroykiteNaKalkulatora()),
      naemiOtZhurnala,
      prodadeniOtZhurnala,
    );
    const parvi = smetnato.redove.find((r) => !r.prodaden) ?? smetnato.redove[0];
    if (parvi) {
      pokazhiObekt({
        obekt: parvi.obekt,
        vid: parvi.vid,
        obshta_kvsm: parvi.obshta_kvsm,
        dobavki: {},
        naem_mesechen_st: parvi.naem_mesechen_st,
        naemOt: parvi.naemOt,
      });
    }
  };

  /** Наемите от Журнала — четат се при всяко смятане, не се помнят стари. */
  const vzemiNaemite = async (): Promise<void> => {
    const og = await k.deystviya.ogledalo();
    const imoti = [...og.imoti.values()].map((i) => {
      const naem = [...og.naemi.values()].find((n) => n.imotId === i.id && !n.prekraten);
      return { id: i.id, edinitsa: i.edinitsa, naem_mesechen_st: naem?.naem_st ?? 0 };
    });
    naemiOtZhurnala = kartaNaNaemite(imoti);
    imotiPoObekt = kartaNaImotite(imoti);
    /**
     * ПРОДАДЕНОТО СЕ ЧЕТЕ И ОТ ЖУРНАЛА, не само от неговия файл (29.08).
     *
     * Негово: „Там избираш продаден и го праща от цени в таб Продажби."
     * Значи щом за един имот вече има сделка, Калкулаторът трябва да го знае —
     * инак изборът щеше да е бутон без последица на екрана, от който тръгва.
     */
    const sImot = new Map<string, string>();
    for (const [obekt, imotId] of imotiPoObekt) sImot.set(imotId, obekt);
    prodadeniOtZhurnala = new Set(
      [...og.prodazhbi.values()]
        .map((pr) => sImot.get(pr.imotId))
        .filter((x): x is string => x !== undefined),
    );
  };

  // Секция „Калкулатор" · всяка промяна горе преизчислява листата долу.
  zakachiKalkulator(koren, async () => {
    presmetni();
    await prerisuvay();
  });

  const poleto = (id: string): HTMLInputElement | null =>
    koren.querySelector<HTMLInputElement>(`#${id}`);

  koren.querySelector<HTMLButtonElement>('#cheti-ploshti')?.addEventListener('click', () => {
    poleto('fayl-ploshti')?.click();
  });

  // ── „СЪЗДАЙ СГРАДА" · Калкулаторът и РАЖДА (резен 29 · ADR-089) ──────────
  koren.querySelector<HTMLInputElement>('#ime-sgrada')?.addEventListener('change', (e) => {
    imeNaSgradata = (e.target as HTMLInputElement).value;
  });

  koren.querySelector<HTMLButtonElement>('#sazday-sgrada')?.addEventListener('click', async (e) => {
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    try {
      const adres = proveriImetoNaSgradata(imeNaSgradata);
      const { novi, veche } = zaVpisvane(obekti, adres, await k.deystviya.ogledalo());

      for (const ob of novi) {
        await k.deystviya.dobaviImot(
          `I:${crypto.randomUUID()}`,
          { adres, edinitsa: ob.obekt, ploshtad_kvsm: ploshttaZaImota(ob) },
          // АДРЕСЪТ НА ДЕЙСТВИЕТО, не случайно число: второто натискане връща
          // същия резултат, вместо да роди втори имот със същото име.
          { opId: opIdNaObekta(adres, ob.obekt) },
        );
      }

      // Партида без сверка не се приема · и нулата се КАЗВА (правило 7).
      const sv = sveriSazdavaneto(obekti.length, 0, novi.length, veche, new Date().toISOString());
      k.vest(
        sv.nared ? 'dobre' : 'zle',
        `„${adres}": ${novi.length} нови обекта${veche > 0 ? ` · ${veche} вече ги имаше` : ''}. ` +
          `Сверка вход↔изход: ${sv.vhod} → ${sv.izhod}, разлика ${sv.razlika}. ` +
          'Дела не се раждат — те са сценарий за конкретна сграда.',
      );
    } catch (err) {
      k.vest('zle', err instanceof Error ? err.message : String(err));
    }
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#cheti-tseni')?.addEventListener('click', () => {
    poleto('fayl-tseni')?.click();
  });

  poleto('fayl-ploshti')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      // Кой лист влиза: „ЦЕНИ МД" се познава по ГЛАВАТА (не по името),
      // старото площообразуване — по името на листа, както досега.
      const t = await tablitsiSasSito(
        fayl,
        (tablitsa) => eListTseniMD(tablitsa) || eListSPloshti(tablitsa.ime),
      );
      const vsichki: ProchetenObekt[] = [];
      let propusnati = 0;
      otMD = null;
      for (const tablitsa of t) {
        if (eListTseniMD(tablitsa)) {
          // Файлът „ЦЕНИ МД" носи ВСИЧКО наведнъж: площите — тук, а
          // изложение · стаи · тераси · ПРОДАДЕН пълнят и Ценовата листа.
          const r = prochetiTseniMD(tablitsa);
          otMD = r;
          const slyato = new Map<string, OtTsenovaLista>(otLista);
          // Редовете, при които „Обща площ" на файла не излиза от неговите
          // собствени чиста + общи части, влизат в сметката СЪС сбора на
          // двете сверими колони — иначе сметката би отказала („обща
          // по-малка от чистата") или би оценила по число, което файлът сам
          // опровергава. Файлът се чете дословно, разминаването се КАЗВА
          // във вестта; поправя се само какво влиза в сметката, не записът.
          const razminati = new Set(r.sverki.map((s) => s.obekt));
          for (const red of r.redove) {
            vsichki.push({
              obekt: red.obekt,
              vid: vidPoIme(red.obekt),
              etazh: red.etazh,
              kota: red.kota,
              chista_kvsm: red.chista_kvsm,
              obshta_kvsm: razminati.has(red.obekt)
                ? red.chista_kvsm + red.obshti_kvsm
                : red.obshta_kvsm,
              dvor_kvsm: 0,
            });
            slyato.set(red.obekt, {
              izlozhenie: red.izlozhenie,
              stai: red.stai,
              terasi_kvsm: red.terasi_kvsm,
              prodaden: red.prodaden,
            });
          }
          otLista = slyato;
          propusnati += r.propusnati;
        } else {
          const r = prochetiPloshti(tablitsa);
          vsichki.push(...r.obekti);
          propusnati += r.propusnati;
        }
      }
      obekti = Object.freeze(vsichki);
      await vzemiNaemite();
      presmetni();
      // Сверката вход↔изход се казва на глас, дори когато е нула (правило 7).
      const sv = smetnato ? sverkaNaPartida(obekti, smetnato) : { vhod: 0, izhod: 0, razlika: 0 };
      const sTseni = otMD ? otMD.redove.filter((r) => r.tsena_st !== null) : [];
      const sborTseni = sTseni.reduce((s, r) => s + (r.tsena_st ?? 0), 0);
      vest =
        `Прочетени ${sv.vhod} обекта → ${sv.izhod} реда · разлика ${sv.razlika}` +
        (propusnati ? ` · ${propusnati} пропуснати реда без четими числа` : '') +
        (otMD
          ? ` · листата носи цени за ${sTseni.length} обекта · сбор ${pishi(sborTseni)}` +
            (otMD.sverki.length
              ? ` · ${otMD.sverki.length} реда, при които площите на файла не се сверяват помежду си — за тях сметката ползва чиста + общи части`
              : '')
          : '');
      greshka = '';
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  poleto('fayl-tseni')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const t = await tablitsiSasSito(fayl, () => true);
      const slyato = new Map<string, OtTsenovaLista>();
      for (const tablitsa of t) {
        for (const [ime, danni] of prochetiTsenovaLista(tablitsa)) slyato.set(ime, danni);
      }
      otLista = slyato;
      presmetni();
      vest = `Ценовата листа даде изложение и състояние за ${slyato.size} обекта.`;
      greshka = '';
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLSelectElement>('#koya-tsena')?.addEventListener('change', async (e) => {
    koyaTsena = (e.target as HTMLSelectElement).value as KoyaTsena;
    zapomniEkranno('stoynost.koyaTsena', koyaTsena);
    await prerisuvay();
  });

  // ── „ЦЕНИ МД" → Имоти и Делата · И92: „вкарани през Управление се появяват
  // в Калкулатора" — и обратно: прочетеното тук става ИСТИНСКИ имоти и дела,
  // с истински събития през Вратата. Повторното натискане не удвоява: каквото
  // огледалото вече носи, се прескача и се КАЗВА.
  koren.querySelector<HTMLButtonElement>('#vpishi-obekti')?.addEventListener('click', async (e) => {
    if (!otMD) return;
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    try {
      const izhod = await vpishiMD(k, otMD);
      k.vest(
        'dobre',
        `Вписано: ${izhod.imoti} ${izhod.imoti === 1 ? 'обект' : 'обекта'} и ${izhod.dela} дела` +
          (izhod.veche ? ` · ${izhod.veche} вече бяха вписани и не се удвояват` : '') +
          ' · всичко е в Журнала, със следа.',
      );
    } catch (err) {
      k.vest('zle', dumiZaGreshka(err));
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#pishi-tseni')?.addEventListener('click', async () => {
    if (!smetnato) return;
    try {
      const bajtove = await rabotnaKniga([listNaTsenite(smetnato.redove, 'ЦЕНИ', koyaTsena)]);
      const fayl = new Blob([bajtove.slice().buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      svaliFayl(fayl, `ЦЕНИ-${dnesKato()}.xlsx`);
      k.vest(
        'dobre',
        `Ценовата листа е записана: ${smetnato.redove.length} реда · ${IMENA_NA_IZBORA[koyaTsena]}.`,
      );
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  });
}

/**
 * ВПИСВАНЕТО НА „ЦЕНИ МД" · обектите стават Имоти, задачите — Дела (И92).
 *
 * Всяко нещо е ОТДЕЛНО събитие през Вратата, със свой opId — Журналът пази
 * събития, не партиди. Задачите са по неговата поръчка: „Акт 16 с дело към
 * Имота Малинова Долина"; за всеки НЕПРОДАДЕН обект — „Ремонт" с поддело
 * „Плащане на сметки" и „Оглед за продажба или Наем". Продаденото не се
 * ремонтира от нас. Задачите после се редактират свободно — „при всеки
 * бизнес се различават" (негови думи).
 *
 * Идемпотентността е по ОГЛЕДАЛОТО: имот с този адрес и единица, или дело
 * със същото място·обект·име, не се вписва втори път — брои се и се казва.
 */
const MD_ADRES = 'Малинова Долина';

async function vpishiMD(
  k: Konteks,
  md: ProchetenoTseniMD,
): Promise<{ imoti: number; dela: number; veche: number }> {
  const og = await k.deystviya.ogledalo();
  const imaImot = new Set(
    [...og.imoti.values()].map((i) => `${i.adres}·${i.edinitsa}`),
  );
  const imaDelo = new Set(
    [...og.dela.values()].map((d) => `${d.myasto}·${d.obekt}·${d.ime}`),
  );
  const dnes = dnesKato();
  const sledDni = (broy: number) =>
    new Date(Date.parse(`${dnes}T00:00:00Z`) + broy * 86_400_000).toISOString().slice(0, 10);

  let imoti = 0;
  let dela = 0;
  let veche = 0;

  const delo = async (
    obekt: string,
    ime: string,
    otsenka: string,
    doDni: number,
    nadDelo = '',
  ): Promise<string> => {
    const klyuch = `${MD_ADRES}·${obekt}·${ime}`;
    if (imaDelo.has(klyuch)) {
      veche += 1;
      const staro = [...og.dela.values()].find(
        (d) => d.myasto === MD_ADRES && d.obekt === obekt && d.ime === ime,
      );
      return staro?.id ?? '';
    }
    const id = crypto.randomUUID();
    await k.deystviya.zapishiDelo(
      id,
      {
        myasto: MD_ADRES,
        obekt,
        ime,
        otgovornik: '',
        ot: dnes,
        do: sledDni(doDni),
        otsenka,
        sastoyanie: 'чака',
        nadDelo,
        dokument: '',
      },
      { opId: `md-delo:${crypto.randomUUID()}` },
    );
    dela += 1;
    return id;
  };

  // имотът-майка и делата на самата сграда
  const akt16 = await delo('', 'Акт 16', 'спешно-важно', 30);
  if (akt16 !== '') await delo('', 'Документи за Акт 16', 'спешно-важно', 14, akt16);
  const remontObshti = await delo('', 'Ремонт общи части', 'важно-неспешно', 45);
  if (remontObshti !== '') {
    await delo('', 'Плащане на сметки', 'важно-неспешно', 45, remontObshti);
  }

  for (const red of md.redove) {
    // обектът става ИМОТ: адресът е сградата, единицата е обектът
    if (imaImot.has(`${MD_ADRES}·${red.obekt}`)) {
      veche += 1;
    } else {
      await k.deystviya.dobaviImot(
        `I:${crypto.randomUUID()}`,
        { adres: MD_ADRES, edinitsa: red.obekt, ploshtad_kvsm: red.chista_kvsm },
        { opId: `md-imot:${crypto.randomUUID()}` },
      );
      imoti += 1;
    }

    if (red.prodaden) continue; // продаденото не се ремонтира от нас
    const remont = await delo(red.obekt, 'Ремонт', 'важно-неспешно', 21);
    if (remont !== '') await delo(red.obekt, 'Плащане на сметки', 'нито-едно', 21, remont);
    await delo(red.obekt, 'Оглед за продажба или Наем', 'спешно-важно', 7);
  }

  return { imoti, dela, veche };
}

/**
 * Разчита избрания файл и връща листовете, които минават през ситото.
 *
 * Полето за файл живее В РАЗМЕТКАТА, а не се прави в движение: така работи и
 * в браузър без модерния избирач, и машина може да го напълни (проходът).
 */
/**
 * Чете таблиците от ЕДИН файл и ги пресява по име на лист.
 *
 * НЕ се казва `tablitsiOtFayl` — това име значи друго в `iztochnitsi.ts`: там
 * то взима байтове и вид (включително ПДФ) и не пресява нищо. Едно име за две
 * различни неща е капан за онзи, който чете кода по-късно.
 */
async function tablitsiSasSito(
  fayl: File,
  sito: (t: Tablitsa) => boolean,
): Promise<Tablitsa[]> {
  const danni = await fayl.arrayBuffer();
  const vsichki = await tablitsiteNa(new Uint8Array(danni), fayl.name);
  // Ситото е за книга с МНОГО листове: там „Sheet3" и „разбивка" носят друг
  // обект и биха добавили чужди квадрати. Файл с един лист е самият той —
  // изнесеното от човека рядко се казва „площо".
  if (vsichki.length <= 1) return vsichki;

  const minali = vsichki.filter((t) => sito(t));
  if (minali.length === 0) {
    throw new Error(
      `Във „${fayl.name}" няма лист с площи. От книга с много листове се четат ` +
        'само „площо" и „земя" — останалите носят друг обект или обобщения.',
    );
  }
  return minali;
}
