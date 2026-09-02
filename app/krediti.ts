/**
 * КРЕДИТИТЕ · таблицата и ред-проекцията ПОД Разходи (резен 19 · ADR-079).
 *
 * ═══ ЗАЩО СЕКЦИЯ В СМЕТКИ, А НЕ ЧЕТИРИНАЙСЕТИ ЕКРАН ═══
 *
 * Негово, дословно *(р83·[39])*: „не той е под реда на разходи и без намеса ако
 * е пусната таблицата." Кредитът НЕ е станция по пътя на имота (както е
 * Продажби), а РЕД в разходите с таблица зад себе си. Свой екран щеше да го
 * откъсне от единственото място, на което числото му значи нещо.
 *
 * ═══ КАКВО ПРАВИ И КАКВО НЕ ═══
 *
 * ПРАВИ: държи договорните данни, интерполира оставащите вноски ПО ДАТИ, смята
 * двата процента и „вноски още", записва плащане с трите му части и показва
 * ЕДИН ред-проекция със сбора на вноските за месеца.
 *
 * НЕ ПРАВИ: не записва разход. Редът е СБОР, не запис — записан, той щеше да се
 * удвои с реалното плащане от банковото извлечение.
 *
 * ═══ ИЗКЛЮЧВАНЕТО ═══
 *
 * „в Настройки да има опция да изключваш и последната таблица" *(р83·[39])*.
 * Отметката живее в ПАМЕТТА НА ЕКРАНА, не в Журнала: последната дума по темата
 * „кой какво скрива" е ADR-066 — скриването е ЛИЧНО и е нула събития. И
 * скритото ПАК се смята (правило 23): редът под Разходи и остатъкът в
 * коефициентите не мърдат.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { otLeva, pishi } from '../src/yadro/pari.js';
import {
  izvorNaPlana,
  KOLONI_KREDITI,
  obshtOstatak,
  planaNa,
  predstoyashtiteVnoski,
  redoveNaKreditite,
  redProektsiya,
  type RedNaKredita,
} from '../src/domein/krediti.js';
import {
  CHAKA_NEGOVA_DUMA,
  IMENA_NA_VIDOVETE_KREDIT,
  interpoliraiPlana,
  predlozhiVnoska,
  VIDOVE_KREDIT,
  type VidKredit,
} from '../src/domein/kredit-matematika.js';
import type { VnoskaOtDogovora } from '../src/domein/sabitiya.js';
import { broyDokumenti, butonNaDokumentite } from './dokumenti.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  filtriray,
  glaviNaTablitsata,
  grupiranaTablitsa,
  poleZaTarsene,
  PRAZEN_FILTAR,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/** Кой кредит е отворен за план и плащане · ПОГЛЕД, нула събития (ADR-022). */
function izbraniyat(): string {
  return chetiEkranno('krediti.izbran', '');
}

/**
 * КОЛОНИТЕ ЗА ДВИГАТЕЛЯ НА ФИЛТРИТЕ (резен 75 · И124 т.2). Имената идват от
 * `KOLONI_KREDITI` (един дом, правило 17); суровите стойности — от реда.
 * Затворените са СМЕТНАТИТЕ (правило 23): пише ги никой, филтрира ги всеки.
 */
const KOLONI_S_FILTAR: readonly KolonaSFiltar<RedNaKredita>[] = [
  { klyuch: KOLONI_KREDITI[0]!, ime: KOLONI_KREDITI[0]!, vid: 'tekst', vzemi: (r) => r.kredit.ime },
  { klyuch: KOLONI_KREDITI[1]!, ime: KOLONI_KREDITI[1]!, vid: 'tekst', vzemi: (r) => IMENA_NA_VIDOVETE_KREDIT[r.kredit.vid] },
  { klyuch: KOLONI_KREDITI[2]!, ime: KOLONI_KREDITI[2]!, vid: 'tekst', vzemi: (r) => (r.kredit.proektId === '' ? '— без проект' : r.kredit.proektId) },
  { klyuch: KOLONI_KREDITI[3]!, ime: KOLONI_KREDITI[3]!, vid: 'tekst', vzemi: (r) => r.kredit.otgovornik },
  { klyuch: KOLONI_KREDITI[4]!, ime: KOLONI_KREDITI[4]!, vid: 'evro', vzemi: (r) => r.kredit.ostatak_st },
  { klyuch: KOLONI_KREDITI[5]!, ime: KOLONI_KREDITI[5]!, vid: 'evro', vzemi: (r) => r.ostatak_st, zatvorena: true },
  { klyuch: KOLONI_KREDITI[6]!, ime: KOLONI_KREDITI[6]!, vid: 'evro', vzemi: (r) => r.kredit.vnoska_st },
  { klyuch: KOLONI_KREDITI[7]!, ime: KOLONI_KREDITI[7]!, vid: 'chislo', vzemi: (r) => r.kredit.den },
  { klyuch: KOLONI_KREDITI[8]!, ime: KOLONI_KREDITI[8]!, vid: 'protsent', vzemi: (r) => r.protsenti.dogovoren_bp / 100 },
  { klyuch: KOLONI_KREDITI[9]!, ime: KOLONI_KREDITI[9]!, vid: 'protsent', vzemi: (r) => r.protsenti.kamDenya_bp / 100, zatvorena: true },
  { klyuch: KOLONI_KREDITI[10]!, ime: KOLONI_KREDITI[10]!, vid: 'chislo', vzemi: (r) => r.mesetsiOshte, zatvorena: true },
];

/** Включена ли е таблицата · негова опция от Настройки, лична памет. */
function tablitsataEVklyuchena(): boolean {
  return chetiEkranno('krediti.tablitsa', 'da') === 'da';
}

/** Процент от базисни пунктове · един дом, за да не се пише на три места. */
function protsent(bp: number): string {
  return `${(bp / 100).toFixed(2)} %`;
}

/**
 * КАЛКУЛАТОРЪТ (резен 73 · И124 т.12) · „В Сметки един прост груп йалкулато
 * за вкарване ръчно на кредит за експеримент на прогноза."
 *
 * ЕКСПЕРИМЕНТ значи НУЛА събития: смята се на място върху готовата
 * интерполация и се забравя с презареждането. Никакъв запис, никаква памет.
 */
let kalkulator: { ostatak_st: number; lihva_bp: number; vnoska_st: number; den: number } | null =
  null;

function blokNaKalkulatora(dnes: string): string {
  const glava = `
      <div class="dyalglava">
        <h2>Кредитен калкулатор</h2>
        <span>експеримент за прогноза · нула събития</span>
      </div>
      <form id="forma-kalkulator" class="redditsa">
        <label class="pole">
          <span>Сума</span>
          <input translate="no" name="ostatak" id="kalk-ostatak" inputmode="decimal" placeholder="100 000,00">
        </label>
        <label class="pole">
          <span>Лихва · %</span>
          <input translate="no" name="lihva" id="kalk-lihva" inputmode="decimal" placeholder="3,45">
        </label>
        <label class="pole">
          <span>Вноска</span>
          <input translate="no" name="vnoska" id="kalk-vnoska" inputmode="decimal" placeholder="500,00">
        </label>
        <label class="pole">
          <span>Ден</span>
          <input translate="no" type="number" min="1" max="31" name="den" id="kalk-den" value="15">
        </label>
        <button type="submit">Сметни</button>
      </form>`;
  if (kalkulator === null) {
    return `${glava}
      <p class="drebno">Сметнатото се показва тук и се забравя — нищо не влиза в
      Журнала. За истински кредит се пише договорът горе.</p>`;
  }
  const plan = interpoliraiPlana(
    kalkulator.ostatak_st,
    kalkulator.lihva_bp,
    kalkulator.vnoska_st,
    kalkulator.den,
    dnes,
  );
  if (plan.length === 0) {
    return `${glava}
      <p class="drebno" data-kalk-mesetsi="0">Вноската не покрива дори лихвата за
      месеца — остатъкът не пада и план няма. Вдигни вноската или свали лихвата.</p>`;
  }
  const lihvaObshto = plan.reduce((s, v) => s + v.lihva_st, 0);
  return `${glava}
      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Месеци</span>
          <span class="chislo" translate="no" data-kalk-mesetsi="${plan.length}">${plan.length}</span>
          <span class="pod">до последната вноска</span>
        </div>
        <div class="plochka">
          <span class="etiket">Последна вноска</span>
          <span class="chislo" translate="no" data-kalk-kray="${ekraniraj(plan.at(-1)!.data)}">${ekraniraj(
            plan.at(-1)!.data,
          )}</span>
          <span class="pod">планът по дати</span>
        </div>
        <div class="plochka">
          <span class="etiket">Лихва общо</span>
          <span class="chislo" translate="no" data-kalk-lihva="${lihvaObshto}">${pishi(lihvaObshto)}</span>
          <span class="pod">цената на кредита</span>
        </div>
      </div>
      <p class="drebno">Смята СЪЩАТА интерполация, с която живее планът на всеки
      истински кредит (правило 17) — прогнозата и истината не бива да се
      разминават по формула.</p>`;
}

// ── РЕД-ПРОЕКЦИЯТА ─────────────────────────────────────────────────────────

/**
 * ЕДИНСТВЕНИЯТ РЕД ПОД РАЗХОДИ · и той се показва ВИНАГИ.
 *
 * Дори когато таблицата е изключена: числото участва в разходите на месеца,
 * а изключването пипа само екрана на таблицата. Скрит ред щеше да направи
 * разходите да не затварят и никой да не знае с колко.
 */
export function redPodRazhodite(o: Ogledalo, mesets: string, dnes: string): string {
  const r = redProektsiya(o, mesets, dnes);
  return `
    <section data-sektsiya="krediti-red">
      <div class="dyalglava">
        <h2>Кредити · вноски за ${ekraniraj(mesets)}</h2>
        <span>ПРОЕКЦИЯ · сбор, не запис</span>
      </div>
      <div class="red krediteured" translate="no" data-red-proektsiya="${r.vnoski_st}"
           data-broy-krediti="${r.broy}">
        <span class="kletka">Вноски по кредити</span>
        <span class="suma" data-st="${r.vnoski_st}">${pishi(r.vnoski_st)}</span>
        <span class="kletka">от ${r.broy} ${r.broy === 1 ? 'кредит' : 'кредита'}</span>
        <span class="kletka" data-lihva="${r.lihva_st}">лихва ${pishi(r.lihva_st)}</span>
        <span class="kletka" data-glavnitsa="${r.glavnitsa_st}">главница ${pishi(
          r.glavnitsa_st,
        )}</span>
      </div>
      <p class="drebno"><b>Този ред НЕ е записан разход.</b> Той е сбор на
      вноските, паднали в месеца — „Таблица + ред-проекция". Записан, щеше да се
      удвои с реалното плащане, дошло от банковото извлечение, и да надуе
      разходите точно с размера на вноската.</p>
      <p class="drebno"><b>Само ЛИХВАТА е разход.</b> Главницата е движение между
      два джоба: кешът пада, дългът пада, а нетното богатство пада само с
      лихвата. Затова двете стоят поотделно и никъде не се сливат.</p>
    </section>`;
}

// ── ТАБЛИЦАТА ──────────────────────────────────────────────────────────────

function redNaKredita(r: RedNaKredita): string {
  const k = r.kredit;
  const izbran = izbraniyat() === k.id;
  return `
      <div class="red krediteured${r.pogasen ? '' : ' izbrana'}${izbran ? ' izbran' : ''}"
           translate="no" data-kredit="${ekraniraj(k.id)}"
           data-ostatak="${r.ostatak_st}" data-mesetsi="${r.mesetsiOshte}"
           data-dogovoren="${r.protsenti.dogovoren_bp}" data-kamdenya="${r.protsenti.kamDenya_bp}">
        <span class="kletka">${ekraniraj(k.ime)}</span>
        <span class="kletka">${ekraniraj(IMENA_NA_VIDOVETE_KREDIT[k.vid])}</span>
        <span class="kletka">${ekraniraj(k.proektId === '' ? '— без проект' : k.proektId)}</span>
        <span class="kletka">${ekraniraj(k.otgovornik)}</span>
        <span class="suma" data-st="${k.ostatak_st}">${pishi(k.ostatak_st)}</span>
        <span class="suma zatvorena" data-st="${r.ostatak_st}">${pishi(r.ostatak_st)}</span>
        <span class="suma" data-st="${k.vnoska_st}">${pishi(k.vnoska_st)}</span>
        <span class="kletka">${k.den}</span>
        <span class="kletka zatvorena">${protsent(r.protsenti.dogovoren_bp)}</span>
        <span class="kletka zatvorena">${
          r.protsenti.zashto === '' ? protsent(r.protsenti.kamDenya_bp) : '—'
        }</span>
        <span class="kletka">${r.mesetsiOshte}</span>
      </div>`;
}

/** ПЛАНЪТ на избрания кредит · интерполацията, показана ред по ред. */
function blokNaPlana(o: Ogledalo, r: RedNaKredita, dnes: string): string {
  const k = r.kredit;
  const plan = planaNa(o, k, dnes);
  const izvor = izvorNaPlana(o, k);
  const predlozhenie = predlozhiVnoska(Math.max(r.ostatak_st, 0), k.lihva_bp, k.vnoska_st);
  return `
    <section data-sektsiya="krediti-plan" data-plan-izvor="${izvor}">
      <div class="dyalglava">
        <h2>Планът по дати</h2>
        <span>${ekraniraj(k.ime)} · ${
          izvor === 'договор'
            ? 'ВКАРАНИЯТ план от договора · банката е сметнала'
            : 'интерполация на оставащите вноски'
        }</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Договорна лихва</span>
          <span class="chislo" translate="no" data-dogovoren="${r.protsenti.dogovoren_bp}">${protsent(
            r.protsenti.dogovoren_bp,
          )}</span>
          <span class="pod">за целия кредит, от началото</span>
        </div>
        <div class="plochka">
          <span class="etiket">Лихва към деня</span>
          <span class="chislo" translate="no" data-kamdenya="${r.protsenti.kamDenya_bp}">${
            r.protsenti.zashto === '' ? protsent(r.protsenti.kamDenya_bp) : '—'
          }</span>
          <span class="pod">${
            r.protsenti.zashto === ''
              ? 'какъв дял от следващата вноска е лихва'
              : ekraniraj(r.protsenti.zashto)
          }</span>
        </div>
        <div class="plochka">
          <span class="etiket">Вноски още</span>
          <span class="chislo" translate="no" data-mesetsi="${r.mesetsiOshte}">${
            r.mesetsiOshte
          }</span>
          <span class="pod">месеца · СМЯТА се, не се въвежда</span>
        </div>
        <div class="plochka">
          <span class="etiket">Изплатено</span>
          <span class="chislo" translate="no" data-izplateno="${r.izplateno_bp}">${protsent(
            r.izplateno_bp,
          )}</span>
          <span class="pod">от началния остатък</span>
        </div>
      </div>

      <p class="drebno"><b>Двата процента мерят различни неща.</b> Негово
      <i>(р59·[18])</i>: „за това ще има <b>два процента</b> единя е за целия
      кредит в началот, а за момента на деня спрямо оставащото колко се променя
      лихвата". Договорът казва едно число и не мърда; вторият пада с остатъка —
      в началото по-голямата част от вноската е лихва, накрая почти нищо.</p>

      <p class="drebno">Хартията по кредита се закача тук:
      ${butonNaDokumentite('kredit', k.id, broyDokumenti(o, 'kredit', k.id))}
      Договорът и погасителният план остават в Драйва — влиза отпечатъкът им,
      не байтовете (ADR-073).</p>

      <div class="tablitsa" data-tablitsa="krediti-plan" data-ime="Планът по дати">
        <div class="red glava planred" translate="no">
          <span class="kletka">Дата</span>
          <span class="kletka">Вноска</span>
          <span class="kletka">Лихва</span>
          <span class="kletka">Главница</span>
          <span class="kletka">Остатък след нея</span>
        </div>
        ${
          plan.length === 0
            ? `<p class="drebno" data-plan="0">${
                r.pogasen
                  ? 'Кредитът е погасен — няма оставащи вноски.'
                  : 'Вноската не покрива дори лихвата за месеца, затова остатъкът не пада и план няма. Провери вноската и лихвения процент.'
              }</p>`
            : plan
                .slice(0, 24)
                .map(
                  (v) => `
        <div class="red planred" translate="no" data-data="${ekraniraj(v.data)}"
             data-ostatak="${v.ostatak_st}">
          <span class="kletka">${ekraniraj(v.data)}</span>
          <span class="suma" data-st="${v.vnoska_st}">${pishi(v.vnoska_st)}</span>
          <span class="suma" data-st="${v.lihva_st}">${pishi(v.lihva_st)}</span>
          <span class="suma" data-st="${v.glavnitsa_st}">${pishi(v.glavnitsa_st)}</span>
          <span class="suma" data-st="${v.ostatak_st}">${pishi(v.ostatak_st)}</span>
        </div>`,
                )
                .join('')
        }
      </div>
      ${
        plan.length > 24
          ? `<p class="drebno" data-oshte="${plan.length - 24}">Показани са първите
             24 от ${plan.length} вноски. Останалите се смятат по същия път.</p>`
          : ''
      }

      <form id="forma-plan" class="redditsa">
        <label class="pole shiroko">
          <span>Погасителният план от договора · ред на вноска: дата;вноска;главница;лихва</span>
          <textarea translate="no" name="plan" id="plan-tekst" rows="4"
            placeholder="2026-10-15;300,00;250,00;50,00&#10;2026-11-15;300,00;251,00;49,00"></textarea>
        </label>
        <button type="submit">Вкарай плана</button>
      </form>
      <p class="greshka" id="greshka-plan"></p>
      <p class="drebno">„наличните кредити, които <b>работят с вкаран погасителен
      план</b>" (И124 т.12). Вкараният план БИЕ интерполацията — тя остава
      резервният път, докато план няма, и заглавието горе казва кой от двата
      гледаш. Ново вкарване заменя целия план: последната дума бие.</p>

      <form id="forma-plashtane" class="redditsa">
        <label class="pole">
          <span>Дата</span>
          <input translate="no" type="date" name="data" id="plashtane-data">
        </label>
        <label class="pole">
          <span>Вноска</span>
          <input translate="no" name="suma" id="plashtane-suma" inputmode="decimal"
                 placeholder="0,00" value="${pishi(k.vnoska_st).replace(/[^\d,]/g, '')}">
        </label>
        <label class="pole">
          <span>Главница</span>
          <input translate="no" name="glavnitsa" id="plashtane-glavnitsa" inputmode="decimal"
                 placeholder="0,00" value="${String(predlozhenie.glavnitsa_st / 100).replace('.', ',')}">
        </label>
        <label class="pole">
          <span>Лихва</span>
          <input translate="no" name="lihva" id="plashtane-lihva" inputmode="decimal"
                 placeholder="0,00" value="${String(predlozhenie.lihva_st / 100).replace('.', ',')}">
        </label>
        <label class="pole">
          <span>Такса</span>
          <input translate="no" name="taksa" id="plashtane-taksa" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Бележка</span>
          <input translate="no" name="belezhka" id="plashtane-belezhka" placeholder="защо">
        </label>
        <button type="submit">Запиши плащане</button>
      </form>
      <p class="greshka" id="greshka-plashtane"></p>
      <p class="drebno">Трите числа са <b>предложение</b>, не запис (правило 18):
      сметнати са от остатъка към днес, а записва човекът. Ако не се съберат до
      вноската, Вратата отказва и казва с колко се разминават.</p>
    </section>`;
}

/** ЧЕРВЕНИЯТ СПИСЪК · „Всеки месец автоматично" · авто-делото за вноската. */
function blokNaPredstoyashtite(o: Ogledalo, dnes: string): string {
  const redove = predstoyashtiteVnoski(o, dnes);
  return `
    <section data-sektsiya="krediti-predstoyashti">
      <div class="dyalglava">
        <h2>Предстоящи вноски</h2>
        <span>СМЯТА се от плана · нула събития</span>
      </div>
      ${
        redove.length === 0
          ? '<p class="drebno" data-predstoyashti="0">Нито една вноска в следващите 45 дни.</p>'
          : `<div class="tablitsa" data-tablitsa="krediti-predstoyashti" data-ime="Предстоящи вноски">
        <div class="red glava vnoskared" translate="no">
          <span class="kletka">Кредит</span>
          <span class="kletka">Дата</span>
          <span class="kletka">Сума</span>
          <span class="kletka">Отговорник</span>
          <span class="kletka">Остават</span>
        </div>
        ${redove
          .map(
            (v) => `
        <div class="red vnoskared${v.dni < 0 ? ' duljimo' : ''}" translate="no"
             data-vnoska="${ekraniraj(v.kreditId)}" data-dni="${v.dni}">
          <span class="kletka">${ekraniraj(v.ime)}</span>
          <span class="kletka">${ekraniraj(v.data)}</span>
          <span class="suma" data-st="${v.suma_st}">${pishi(v.suma_st)}</span>
          <span class="kletka">${ekraniraj(v.otgovornik)}</span>
          <span class="kletka">${v.dni < 0 ? `просрочена с ${-v.dni} дни` : `${v.dni} дни`}</span>
        </div>`,
          )
          .join('')}
      </div>`
      }
      <p class="drebno"><b>Делото за вноската се СМЯТА, не се записва.</b> Негово:
      „Всеки месец автоматично", а отговорникът „Избира се при кредита". Записано
      като събитие, то щеше да ражда дубликат при всяко отваряне на екрана — а
      чистенето в Журнал, който само добавя, е сторно на нещо, което никой човек
      не е решавал.</p>
    </section>`;
}

/** ЦЯЛАТА секция Кредити · таблицата, планът и предстоящите. */
export function blokNaKreditite(o: Ogledalo, dnes: string): string {
  if (!tablitsataEVklyuchena()) {
    return `
    <section data-sektsiya="krediti" data-vklyuchena="ne">
      <div class="dyalglava">
        <h2>Кредити</h2>
        <span>таблицата е изключена от Настройки</span>
      </div>
      <p class="drebno" data-ostatak-obsht="${obshtOstatak(o)}"><b>Изключена е
      ТАБЛИЦАТА, не кредитите.</b> Редът под Разходи стои, остатъкът
      ${pishi(obshtOstatak(o))} влиза в Ликвидността, в LTV и в Дълг/доход, а
      предстоящите вноски се смятат. Скритото ПАК се смята (правило 23) —
      иначе изключването щеше да мени числа, а не екран.</p>
    </section>`;
  }

  const redove = redoveNaKreditite(o, dnes);
  const izbran = redove.find((r) => r.kredit.id === izbraniyat());
  const filtrirani = filtriray('krediti', redove, KOLONI_S_FILTAR, dnes);
  return `
    <section data-sektsiya="krediti" data-vklyuchena="da">
      <div class="dyalglava">
        <h2>Кредити</h2>
        <span data-broy-krediti="${redove.length}">${redove.length} · общ остатък ${pishi(
          obshtOstatak(o),
        )}</span>
      </div>

      <form id="forma-kredit" class="redditsa">
        <label class="pole">
          <span>Име</span>
          <input translate="no" name="ime" id="kredit-ime" placeholder="Ипотека · Пощенска">
        </label>
        <label class="pole">
          <span>Вид</span>
          <select translate="no" name="vid" id="kredit-vid">
            ${VIDOVE_KREDIT.map(
              (v) => `<option value="${v}">${ekraniraj(IMENA_NA_VIDOVETE_KREDIT[v])}</option>`,
            ).join('')}
          </select>
        </label>
        <label class="pole">
          <span>Проект</span>
          <select translate="no" name="proekt" id="kredit-proekt">
            <option value="">— без проект</option>
            ${[...o.imoti.values()]
              .map(
                (i) => `<option value="${ekraniraj(i.id)}">${ekraniraj(i.adres)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="pole">
          <span>Остатък днес</span>
          <input translate="no" name="ostatak" id="kredit-ostatak" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Обезпечение</span>
          <input translate="no" name="obezpechenie" id="kredit-obezpechenie" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Лихва · %</span>
          <input translate="no" name="lihva" id="kredit-lihva" inputmode="decimal" placeholder="3,45">
        </label>
        <label class="pole">
          <span>Вноска</span>
          <input translate="no" name="vnoska" id="kredit-vnoska" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Ден</span>
          <input translate="no" type="number" min="1" max="31" name="den" id="kredit-den" value="15">
        </label>
        <label class="pole">
          <span>Отговорник</span>
          <input translate="no" name="otgovornik" id="kredit-otgovornik" placeholder="имейл">
        </label>
        <button type="submit">Запиши кредит</button>
      </form>
      <p class="greshka" id="greshka-kredit"></p>

      <p class="drebno"><b>Кредитът е единственият разход, който не се пише на
      ръка</b> — негово <i>(р65·[24])</i>: „Всичко освен Кредит, а именно:
      Заплати, Фактури Кеш и Фактури Карта". Тук се въвежда ДОГОВОРЪТ; вноските
      идват от плана, а платеното се записва отделно.</p>

      ${poleZaTarsene('krediti')}
      <div class="tablitsa" data-tablitsa="krediti" data-ime="Кредити · вноски за месеца">
        <div class="red glava krediteured" translate="no">
          ${glaviNaTablitsata('krediti', KOLONI_S_FILTAR, redove, dnes)}
        </div>
        ${
          redove.length === 0
            ? '<p class="drebno">Няма нито един кредит. Нула кредита значи НУЛА дълг — истинско число, не липсващо.</p>'
            : filtrirani.redove.length === 0
              ? PRAZEN_FILTAR
              : grupiranaTablitsa('krediti', filtrirani.redove, KOLONI_S_FILTAR, dnes, (r) => redNaKredita(r))
        }
      </div>
      ${redZaSkritoto(filtrirani, 'krediti')}
      <p class="drebno">Трите сиви колони не се редактират от никого: те се
      СМЯТАТ (правило 23). Остатъкът е начален минус платените главници;
      сторнирано плащане го вдига обратно, без нито един ред код за това.</p>

      ${blokNaPredstoyashtite(o, dnes)}

      ${
        izbran === undefined
          ? `<section data-sektsiya="krediti-plan">
               <p class="drebno">Натисни ред от таблицата, за да видиш плана по
               дати и да запишеш плащане.</p>
             </section>`
          : blokNaPlana(o, izbran, dnes)
      }

      <section data-sektsiya="kredit-kalkulator">
        ${blokNaKalkulatora(dnes)}
      </section>
    </section>`;
}

// ── НАСТРОЙКИТЕ ────────────────────────────────────────────────────────────

/** Отметката „таблицата Кредити е включена" · негова опция от Настройки. */
export function blokNaKredititeVNastroyki(): string {
  const vkl = tablitsataEVklyuchena();
  return `
    <section data-sektsiya="krediti">
      <div class="dyalglava">
        <h2>Кредитите</h2>
        <span data-tablitsa-vkl="${vkl ? 'da' : 'ne'}">${vkl ? 'таблицата е включена' : 'таблицата е изключена'}</span>
      </div>
      <label class="pole">
        <input type="checkbox" id="krediti-vklyucheni"${vkl ? ' checked' : ''}>
        <span>Показвай таблицата Кредити в Сметки</span>
      </label>
      <p class="drebno">Негово <i>(р83·[39])</i>: „в Настройки да има опция да
      <b>изключваш и последната таблица</b>." Изключването пипа ЕКРАНА и нищо
      друго: редът под Разходи, остатъкът в Ликвидността и двата коефициента
      остават — скритото ПАК се смята (правило 23).</p>
      <p class="drebno">Отметката е ЛИЧНА и не влиза в Журнала. Последната дума
      по темата „кой какво скрива" е ADR-066: скриването е решение на всеки за
      СЕБЕ СИ и е нула събития. „Да вкарваш, да създаваш" от същото изречение
      е ДРУГА тема — създаването на таб живее в Таблото (И101 т.1).</p>
      ${
        CHAKA_NEGOVA_DUMA.length === 0
          ? '<p class="drebno" data-chaka-kredit="0">Нищо не чака негова дума.</p>'
          : `<p class="drebno" data-chaka-kredit="${CHAKA_NEGOVA_DUMA.length}">Това
             чака негова дума и затова не се измисля тук (правило 18):</p>
           <ul class="drebno">
             ${CHAKA_NEGOVA_DUMA.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
           </ul>`
      }
    </section>`;
}

// ── ДРЪЖКИТЕ ───────────────────────────────────────────────────────────────

export function zakachiKreditite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  for (const red of koren.querySelectorAll<HTMLElement>('[data-kredit]')) {
    red.addEventListener('click', async () => {
      zapomniEkranno('krediti.izbran', red.dataset.kredit ?? '');
      await prerisuvay();
    });
  }

  koren
    .querySelector<HTMLInputElement>('#krediti-vklyucheni')
    ?.addEventListener('change', async (e) => {
      zapomniEkranno('krediti.tablitsa', (e.target as HTMLInputElement).checked ? 'da' : 'ne');
      await prerisuvay();
    });

  const forma = koren.querySelector<HTMLFormElement>('#forma-kredit');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-kredit')!;
    kazhi.textContent = '';
    const danni = new FormData(forma);
    const id = `KR:${crypto.randomUUID()}`;
    try {
      await k.deystviya.zapishiKredit(
        {
          kreditId: id,
          ime: String(danni.get('ime') ?? '').trim(),
          vid: String(danni.get('vid') ?? 'ipoteka') as VidKredit,
          proektId: String(danni.get('proekt') ?? ''),
          ostatak_st: otLeva(String(danni.get('ostatak') || '0')),
          ot: new Date().toISOString().slice(0, 10),
          // Лихвата се въвежда в ПРОЦЕНТИ, а живее в базисни пунктове: 3,45 %
          // става 345. `otLeva` вече чете „3,45" като 345 цели най-малки
          // единици — точно базисните пунктове. Деление на 100 тук връщаше 3
          // вместо 345, тоест лихва 0,03 % вместо 3,45 %; проход §97 го хвана с
          // „чакано 345 · видяно 3".
          lihva_bp: otLeva(String(danni.get('lihva') || '0')),
          vnoska_st: otLeva(String(danni.get('vnoska') || '0')),
          den: Number(danni.get('den') ?? 15),
          otgovornik: String(danni.get('otgovornik') ?? '').trim(),
          obezpechenie_st: otLeva(String(danni.get('obezpechenie') || '0')),
        },
        { opId: `kredit:${crypto.randomUUID()}` },
      );
      zapomniEkranno('krediti.izbran', id);
      k.vest('dobre', 'Кредитът е записан · планът се смята от остатъка.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaPlan = koren.querySelector<HTMLFormElement>('#forma-plan');
  formaPlan?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-plan')!;
    kazhi.textContent = '';
    const tekst = String(new FormData(formaPlan).get('plan') ?? '');
    try {
      const vnoski: VnoskaOtDogovora[] = tekst
        .split('\n')
        .map((red) => red.trim())
        .filter((red) => red !== '')
        .map((red) => {
          const chasti = red.split(/[;\t]/).map((c) => c.trim());
          if (chasti.length !== 4) {
            throw new Error(
              `Редът „${red}" няма четирите части: дата;вноска;главница;лихва.`,
            );
          }
          return {
            data: chasti[0]!,
            vnoska_st: otLeva(chasti[1]!),
            glavnitsa_st: otLeva(chasti[2]!),
            lihva_st: otLeva(chasti[3]!),
          };
        });
      await k.deystviya.zapishiPogasitelenPlan(
        { kreditId: izbraniyat(), vnoski },
        { opId: `pogasitelen-plan:${crypto.randomUUID()}` },
      );
      k.vest('dobre', `Планът е вкаран · ${vnoski.length} вноски по договора.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaKalk = koren.querySelector<HTMLFormElement>('#forma-kalkulator');
  formaKalk?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const danni = new FormData(formaKalk);
    kalkulator = {
      ostatak_st: otLeva(String(danni.get('ostatak') || '0')),
      lihva_bp: otLeva(String(danni.get('lihva') || '0')),
      vnoska_st: otLeva(String(danni.get('vnoska') || '0')),
      den: Number(danni.get('den') ?? 15),
    };
    await prerisuvay();
  });

  const formaPl = koren.querySelector<HTMLFormElement>('#forma-plashtane');
  formaPl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-plashtane')!;
    kazhi.textContent = '';
    const danni = new FormData(formaPl);
    try {
      await k.deystviya.zapishiPlashtanePoKredit(
        {
          plashtaneId: `PL:${crypto.randomUUID()}`,
          kreditId: izbraniyat(),
          data: String(danni.get('data') ?? ''),
          suma_st: otLeva(String(danni.get('suma') || '0')),
          glavnitsa_st: otLeva(String(danni.get('glavnitsa') || '0')),
          lihva_st: otLeva(String(danni.get('lihva') || '0')),
          taksa_st: otLeva(String(danni.get('taksa') || '0')),
          belezhka: String(danni.get('belezhka') ?? '').trim(),
        },
        { opId: `plashtane-kredit:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Плащането е записано · остатъкът падна с главницата.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
