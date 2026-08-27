/**
 * УПРАВЛЕНИЕ НА ВРЕМЕВИЯ РЕД В ДЕЛАТА · седмият екран.
 *
 * Името е негово, дословно *(р52·[4]·07.08)*: „Управление е с текст
 * **Управление на Времевия Ред в Делата**, Отчет за Проекти и Финанси се
 * променя на Сетки за Дела и Средства."
 *
 * ЕКРАНЪТ Е ДВЕ ПОЛОВИНИ, и това е негово число *(р75·[64]·11.08)*:
 *
 *   „лирината на таблицита и видимостта е индивидуално разместване но при
 *    старт е **разделено на 2** между таблица и частта с таблица на Гант."
 *
 * По-ранното 1/3 ↔ 2/3 *(р48·[75] · р51·[145])* НЕ е надживяно — то е за
 * случая, в който диаграмата се разгъне. При СТАРТ е 50/50, и дръжката между
 * двете се мести.
 *
 * КАКВО СЕ РИСУВА ТУК, по И52: „десктоп = диаграма; телефон и HTML = таблица с
 * оцветени полета". Изданието днес Е HTML (Стартъп Алфа), затова тук стои
 * ТАБЛИЦАТА С ОЦВЕТЕНИ ПОЛЕТА — решетката с времеви колони, а не SVG-диаграма
 * с извити стрелки. Диаграмата за десктоп е `gant-diagrama.ts`.
 *
 * ЗАБРАНЕНОТО, с неговата дума *(р83·[35])*: „**не можеш да го направиш това
 * забрана**" — за влаченето на ленти. Срокът се мени от полето за срок. Всяка
 * промяна на срок е събитие в Журнала; влаченето прави тиха промяна на дата.
 */

import { otData } from '../src/yadro/data.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import { pishi } from '../src/yadro/pari.js';
import {
  IMENA_NA_OTSENKITE,
  OTSENKI,
  nomeraPoDarvo,
  podredeniPoDarvo,
  stepenNa,
  SASTOYANIYA,
  svetofar,
  vidimi,
  noviyatRoditel,
  roditeliSDetsa,
  sObobshteniSrokove,
  eEdnodnevno,
  type Delo,
  type Otsenka,
} from '../src/domein/dela.js';
import {
  IMENA_NA_TAKTOVETE,
  obobshtenRed,
  reshetka,
  TAKTOVE,
  type Takt,
} from '../src/domein/gant.js';
import { sumiZaObhvat } from '../src/domein/otcheti.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { narisuvayDiagrama } from './gant-diagrama.js';
import {
  menyuOtZhivi,
  novoteVSpisatsite,
  poleSMenyu,
  rechnitsite,
  sDumiZaNovite,
  zakachiMenyuta,
  zapomniRechnitsite,
} from './menyu.js';
import type { Menyu } from '../src/domein/padashti-menyuta.js';

import type { Konteks } from './ekranite.js';

/**
 * Погледът на Ганта СЕ ПОМНИ (ADR-022): тактът, трите филтъра, сгънатите дела
 * и изборът таблица/диаграма се отварят както са оставени. Екранно огледало —
 * какво се гледа, не какво е вярно; делата са си в Журнала.
 *
 * ПО КЛЮЧ, не модулно (И98). Дотук шестте бяха file-scope променливи и една
 * таблица можеше да служи само на ЕДИН екран: смениш такта в Личното — сменил
 * си го и в Управление, при това МЪЛЧЕШКОМ, защото и двата пишеха в едни и
 * същи ключове. Личният таб иска СВОИ настройки („таблото там с собствените
 * настройки"), значи погледът иска свой дом за всеки поглед.
 */
interface PogledNaGanta {
  readonly klyuch: string;
  takt: Takt;
  readonly sgunati: Set<string>;
  diagrama: boolean;
  filtarMyasto: string;
  filtarObekt: string;
  filtarOtsenka: string;
}

/** Четирите полета на делото, чиито речници живеят в самите дела. */
type KlyuchNaMenyu = 'myasto' | 'obekt' | 'ime' | 'otgovornik';

/**
 * РЕЧНИКЪТ НА ЕДНО ПОЛЕ · изведен от живите дела, без нито едно ново събитие.
 *
 * Втори списък, пазен отделно, би трябвало да се държи синхронен с Журнала — и
 * щеше да се разминава точно в деня, в който някой сторнира дело.
 */
function menyutoNaDelata(o: Ogledalo, klyuch: KlyuchNaMenyu, ime: string): Menyu {
  return menyuOtZhivi(
    klyuch,
    ime,
    [...o.dela.values()].map((d) => d[klyuch]),
  );
}

/** Четирите менюта наведнъж · за закачането след рисуване. */
function menyutataNaFormata(o: Ogledalo, nadpisi: NadpisiNaGanta): ReadonlyMap<string, Menyu> {
  const parvata = nadpisi.glavaNaImenata.split(' · ')[0] ?? 'Място';
  return new Map<string, Menyu>([
    ['myasto', menyutoNaDelata(o, 'myasto', parvata)],
    ['obekt', menyutoNaDelata(o, 'obekt', 'Обект')],
    ['ime', menyutoNaDelata(o, 'ime', 'Дело')],
    ['otgovornik', menyutoNaDelata(o, 'otgovornik', 'Отговорник')],
  ]);
}

const POGLEDI = new Map<string, PogledNaGanta>();

function pogled(klyuch = 'gant'): PogledNaGanta {
  const veche = POGLEDI.get(klyuch);
  if (veche) return veche;
  const nov: PogledNaGanta = {
    klyuch,
    takt: chetiEkranno<Takt>(`${klyuch}.takt`, 'mesets'),
    sgunati: new Set<string>(chetiEkranno<string[]>(`${klyuch}.sgunati`, [])),
    diagrama: chetiEkranno(`${klyuch}.diagrama`, true),
    filtarMyasto: chetiEkranno(`${klyuch}.myasto`, ''),
    filtarObekt: chetiEkranno(`${klyuch}.obekt`, ''),
    filtarOtsenka: chetiEkranno(`${klyuch}.otsenka`, ''),
  };
  POGLEDI.set(klyuch, nov);
  return nov;
}

let opIdDelo = crypto.randomUUID();
let greshkaDelo = '';

function zapomniPogleda(p: PogledNaGanta): void {
  zapomniEkranno(`${p.klyuch}.takt`, p.takt);
  zapomniEkranno(`${p.klyuch}.sgunati`, [...p.sgunati]);
  zapomniEkranno(`${p.klyuch}.diagrama`, p.diagrama);
  zapomniEkranno(`${p.klyuch}.myasto`, p.filtarMyasto);
  zapomniEkranno(`${p.klyuch}.obekt`, p.filtarObekt);
  zapomniEkranno(`${p.klyuch}.otsenka`, p.filtarOtsenka);
}

/**
 * НАДПИСИТЕ · същата таблица говори с различни думи (И98).
 *
 * Само НАДПИС, не втора структура: групирането по място, колоните и филтрите
 * остават едни и същи. „По теми" (И96 т.10) е дума на екрана, а не втори
 * начин на подреждане — иначе двата погледа почват да се разминават в данните.
 */
interface NadpisiNaGanta {
  readonly zaglavie: string;
  readonly glavaNaImenata: string;
  readonly podnaslovNaFormata: string;
  readonly imeNaFormata: string;
}

const NADPISI_SLUZHEBNI: NadpisiNaGanta = Object.freeze({
  zaglavie: 'Управление на Времевия Ред в Делата',
  glavaNaImenata: 'Място · Обект · Дело',
  podnaslovNaFormata: 'Място · Обект · Дело — трите колони',
  imeNaFormata: 'Ново дело',
});

export const NADPISI_LICHNI: NadpisiNaGanta = Object.freeze({
  zaglavie: 'Моето време · личните дела',
  glavaNaImenata: 'Тема · Обект · Дело',
  podnaslovNaFormata: 'Тема · Обект · Дело — същите три колони',
  imeNaFormata: 'Ново лично дело',
});

export function narisuvayGant(
  o: Ogledalo,
  dnes: string,
  klyuch = 'gant',
  nadpisi: NadpisiNaGanta = NADPISI_SLUZHEBNI,
  predstavka = 'd-',
): string {
  const p = pogled(klyuch);
  const { takt, sgunati, diagrama, filtarMyasto, filtarObekt, filtarOtsenka } = p;
  const vsichki = [...o.dela.values()];
  // ПОДРЕДБАТА Е ДЪРВОВИДНА (резен 12б): детето винаги СЛЕД родителя си, а
  // вътре в едно ниво важи неговата подредба (спешност → Оценка → завършените
  // долу). Правилото му не се мени — прилага се на всяко ниво поотделно.
  const podredeni = podredeniPoDarvo(vsichki, dnes);
  const filtrirani = podredeni.filter(
    (d) =>
      (!filtarMyasto || d.myasto === filtarMyasto) &&
      (!filtarObekt || d.obekt === filtarObekt) &&
      (!filtarOtsenka || d.otsenka === filtarOtsenka),
  );
  // СГЪВАЧИТЕ се броят ПРЕДИ сгъването и веднъж за целия екран. Сметнати от
  // видимото, свитото дело оставаше без бутон — сгъването беше еднопосочно.
  const sgavaemi = roditeliSDetsa(filtrirani);
  const naEkrana = vidimi(filtrirani, sgunati);
  // ОБОБЩЕНАТА ЛЕНТА · родителят се разпъва до децата си, за да не е празен ред
  // (резен 12б). РИСУВА се с разпънатите, БРОИ се с записаните: плочките горе
  // отчитат факти от Журнала, а не изведена дата.
  const zaRisuvane = sObobshteniSrokove(naEkrana, filtrirani);
  const r = reshetka(zaRisuvane, takt, dnes);
  // Сумите покриват ЦЕЛИЯ обхват на решетката — от първата до последната
  // колона — не един месец: колона извън месеца показваше нула, която
  // изглеждаше като „няма движение".
  const parvata = r.koloni[0]!;
  const poslednata = r.koloni[r.koloni.length - 1]!;
  const sumi = obobshtenRed(r.koloni, sumiZaObhvat(o, parvata.ot, poslednata.do));

  const mesta = [...new Set(vsichki.map((d) => d.myasto))].sort();
  const obekti = [...new Set(vsichki.map((d) => d.obekt).filter(Boolean))].sort();

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Дела</span>
        <span class="chislo" translate="no">${naEkrana.length}</span>
        <span class="pod">${vsichki.length === naEkrana.length ? 'всички' : `от ${vsichki.length}`}</span>
      </div>
      <div class="plochka${broyPo(naEkrana, dnes, 'prosrocheno') ? ' trevoga' : ''}">
        <span class="etiket">Просрочени</span>
        <span class="chislo" translate="no">${broyPo(naEkrana, dnes, 'prosrocheno')}</span>
        <span class="pod">срокът е минал</span>
      </div>
      <div class="plochka">
        <span class="etiket">Горят до 2 дни</span>
        <span class="chislo" translate="no">${broyPo(naEkrana, dnes, 'cherveno')}</span>
        <span class="pod">червено · негово число</span>
      </div>
      <div class="plochka">
        <span class="etiket">Спешно и Важно</span>
        <span class="chislo" translate="no">${naEkrana.filter((d) => d.otsenka === 'спешно-важно').length}</span>
        <span class="pod">първият квадрант на Айзенхауер</span>
      </div>
    </div>

    <section data-sektsiya="gant-izgled" class="karta">
      <div class="dyalglava">
        <h2>Изглед</h2>
        <span>тактът мени решетката · ${IMENA_NA_TAKTOVETE[takt].toLowerCase()}</span>
      </div>
      <div class="lentata">
        <div class="takt" role="group" aria-label="Такт">
          ${TAKTOVE.map(
            (t) =>
              `<button type="button" data-takt="${t}" class="${t === takt ? 'izbran' : ''}">${
                IMENA_NA_TAKTOVETE[t]
              }</button>`,
          ).join('')}
        </div>
        <button type="button" id="sega" class="vtorichen">СЕГА</button>
        <button type="button" id="kam-diagrama" class="vtorichen">${
          diagrama ? 'Скрий диаграмата' : 'Покажи диаграмата'
        }</button>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="f-myasto">Място</label>
          <select translate="no" id="f-myasto">${opcii(mesta, filtarMyasto, 'всички')}</select>
        </div>
        <div class="pole">
          <label for="f-obekt">Обект</label>
          <select translate="no" id="f-obekt">${opcii(obekti, filtarObekt, 'всички')}</select>
        </div>
        <div class="pole">
          <label for="f-otsenka">Оценка</label>
          <select translate="no" id="f-otsenka">${opciiOtsenki(filtarOtsenka)}</select>
        </div>
      </div>
      <p class="drebno">Три колони с филтри, не три нива — филтрира се по която и да е, независимо от другите.</p>
    </section>

    ${
      naEkrana.length === 0
        ? // ПРАЗНОТО ПАК СЕ ПРЕДСТАВЯ. Платено с находка в прохода: празният
          // личен екран не казваше дори че е личен — заглавието на дяла се
          // рисуваше само ВЪТРЕ в таблицата, а при нула дела таблица нямаше.
          `<section data-sektsiya="gant-delata">
            <div class="dyalglava">
              <h2>${ekraniraj(nadpisi.zaglavie)}</h2>
              <span>нито едно дело · първата колона е ДНЕС</span>
            </div>
            <p class="prazno">Няма дела.<br>Времевият ред се пълни отдолу — ${ekraniraj(nadpisi.glavaNaImenata)}.</p>
          </section>`
        : // И96 т.4 · „Диаграмата на Ганта е ОТДЯСНО на таблицата в Управление."
          //
          // Дотук тук стоеше превключвател: таблица ИЛИ диаграма. Той иска
          // ДВЕТЕ — и е прав по причина, която се вижда чак когато са една до
          // друга: таблицата казва КОЛКО, диаграмата казва КОГА, и сравнението
          // между тях е самата работа. Разменени, човек помни едното, докато
          // гледа другото.
          //
          // Бутонът остава, но вече СКРИВА диаграмата, вместо да я разменя —
          // на тесен екран двете една до друга не се побират, а скриването
          // пипа само екрана (правило 23).
          // Ключът е СЪЩИЯТ като на празния случай отгоре: това са две лица
          // на ЕДНА секция, а не две секции. Различен ключ тук би значел, че
          // подредбата на човека се губи в мига, в който първото дело влезе.
          `<div class="gant-dvete${diagrama ? '' : ' bez-diagrama'}" data-sektsiya="gant-delata">
            <div class="gant-tablitsata">${tablitsataSOcveteniPoleta(zaRisuvane, r, sumi, dnes, true, true, sgunati, nadpisi, sgavaemi)}</div>
            ${diagrama ? `<div class="gant-diagramata">${narisuvayDiagrama(zaRisuvane, r, dnes)}</div>` : ''}
          </div>`
    }

    ${formaDelo(o, dnes, predstavka, nadpisi)}`;
}

function broyPo(dela: readonly Delo[], dnes: string, kakvo: string): number {
  return dela.filter((d) => svetofar(d, dnes) === kakvo).length;
}

function opcii(spisak: readonly string[], izbrano: string, prazno: string): string {
  return (
    `<option value=""${izbrano ? '' : ' selected'}>— ${prazno} —</option>` +
    spisak
      .map(
        (x) =>
          `<option value="${ekraniraj(x)}"${x === izbrano ? ' selected' : ''}>${ekraniraj(x)}</option>`,
      )
      .join('')
  );
}

function opciiOtsenki(izbrano: string): string {
  return (
    `<option value=""${izbrano ? '' : ' selected'}>— всички —</option>` +
    OTSENKI.map(
      (o) =>
        `<option value="${o}"${o === izbrano ? ' selected' : ''}>${IMENA_NA_OTSENKITE[o]}</option>`,
    ).join('')
  );
}

/**
 * ТАБЛИЦАТА С ОЦВЕТЕНИ ПОЛЕТА · това, което И52 избра за HTML.
 *
 * Устройството е негово, дословно *(р52·[231]·08.08)*: „Направи името на всеки
 * проект в първа колона, а на задачите следващите редове да започват от втора
 * колона." Затова Мястото стои само на своя ред, а делата под него са
 * отместени.
 *
 * И *(р52·[221])*: „всички проекти с един цвят тъмно графитено", задачите —
 * „с редуващи се цветове, бял и светло сив".
 *
 * Скролът е ХОРИЗОНТАЛЕН във времето *(р52·[221])*: „да не се скролва по
 * вертикла, а по хоризонтал в времето".
 *
 * Изнесена е, защото Сметки я рисува като КОПИЕ (И92 т.4) — същата таблица,
 * без сгъвачите: там се ЧЕТЕ за сверка, пише се в Управление.
 */
export function tablitsataSOcveteniPoleta(
  dela: readonly Delo[],
  r: ReturnType<typeof reshetka>,
  sumi: readonly { prihod_st: number; razhod_st: number }[],
  dnes: string,
  sasSgavachi = true,
  /** И95: Приходите и Разходите носят ключ — скрити ПАК се смятат (пр. 23) */
  sasTsifrite = true,
  /** сгънатите на ТОЗИ поглед · празно при копието в Сметки */
  sgunati: ReadonlySet<string> = new Set<string>(),
  nadpisi: NadpisiNaGanta = NADPISI_SLUZHEBNI,
  /**
   * КОИ дела имат деца · смятано от списъка ПРЕДИ сгъването (резен 12б).
   *
   * Идва отвън нарочно: тук се вижда само видимото, а свито дело няма видими
   * деца — значи сметнато оттук, то би загубило сгъвача си и нямаше да може да
   * се разгъне. Празно при копието в Сметки, където сгъвачи не се рисуват.
   */
  sgavaemi: ReadonlySet<string> = new Set<string>(),
): string {
  const poMyasto = new Map<string, Delo[]>();
  for (const d of dela) {
    const spisak = poMyasto.get(d.myasto) ?? [];
    spisak.push(d);
    poMyasto.set(d.myasto, spisak);
  }
  const lenta = new Map(r.lenti.map((l) => [l.deloId, l]));
  // НОМЕРАТА 1 · 1.1 · 1.2.3 се СМЯТАТ от реда, не се записват (резен 12б):
  // записан, номерът щеше да се разминава при всяко разместване, а всяко
  // разместване щеше да е ново събитие за нещо, което е просто позиция.
  const nomera = nomeraPoDarvo(dela);

  return `
    <section data-sektsiya="gant-delata">
      <div class="dyalglava">
        <h2>${ekraniraj(nadpisi.zaglavie)}</h2>
        <span>${dela.length} дела · първата колона е ДНЕС</span>
      </div>
      <div class="gant" data-koloni="${r.koloni.length}">
        <div class="gant-imena">
          <div class="gant-glava">${ekraniraj(nadpisi.glavaNaImenata)}</div>
          ${[...poMyasto.entries()]
            .map(
              ([myasto, spisak]) => `
            <div class="gant-myasto" title="Мястото е колона — не се сгъва (И88)">${ekraniraj(myasto)}</div>
            ${spisak.map((d) => imeNaDeloto(d, dela, dnes, sasSgavachi, sgunati, nomera.get(d.id) ?? '', sgavaemi)).join('')}`,
            )
            .join('')}
          ${sasTsifrite ? '<div class="gant-sbor">Приход · Разход</div>' : ''}
        </div>
        <div class="gant-vreme" id="gant-vreme">
          <div class="gant-glava-vreme">
            ${r.koloni
              .map(
                (k) =>
                  `<span class="${k.dnes ? 'dnes' : ''}" data-den="${k.ot}">${ekraniraj(k.nadpis)}</span>`,
              )
              .join('')}
          </div>
          ${[...poMyasto.entries()]
            .map(
              ([, spisak]) => `
            <div class="gant-red prazen">${r.koloni.map((k) => kletka(k.dnes)).join('')}</div>
            ${spisak
              .map((d) => {
                const l = lenta.get(d.id);
                return `<div class="gant-red" data-delo="${ekraniraj(d.id)}">
                  ${r.koloni.map((k) => kletka(k.dnes)).join('')}
                  ${
                    l
                      ? `<span class="gant-lenta ${svetofar(d, dnes)}${
                          eEdnodnevno(d) ? ' ednodnevno' : ''
                        }${sgavaemi.has(d.id) ? ' obobshtena' : ''}" data-ot="${l.ot + 1}" data-broy="${l.broy}"
                        title="${ekraniraj(d.ime)} · ${d.ot} → ${d.do}">${
                          l.izlizaNalyavo ? '‹' : ''
                        }<b>${ekraniraj(d.ime)}</b>${l.izlizaNadyasno ? '›' : ''}</span>`
                      : ''
                  }
                </div>`;
              })
              .join('')}`,
            )
            .join('')}
          ${sasTsifrite ? `<div class="gant-red sumi">
            ${sumi
              .map(
                (s, i) =>
                  `<span class="gant-suma${r.koloni[i]!.dnes ? ' dnes' : ''}">${
                    s.prihod_st || s.razhod_st
                      ? `<b translate="no">${pishi(s.prihod_st)}</b><i translate="no">${pishi(s.razhod_st)}</i>`
                      : ''
                  }</span>`,
              )
              .join('')}
          </div>` : ''}
        </div>
      </div>
      <p class="drebno">Лентите НЕ се влачат — срокът се мени от полето за срок, за да остане следа в Журнала.
      Излизащото извън прозореца носи ‹ или › вместо да се отреже мълчешком.</p>
    </section>`;
}

function kletka(dnes: boolean): string {
  return `<span class="gant-kletka${dnes ? ' dnes' : ''}"></span>`;
}

/**
 * Сгънатите идват като ПАРАМЕТЪР, не от модула.
 *
 * Дотук тази уж чиста рисуваща функция четеше модулния `sgunati` — а Сметки я
 * вика през `tablitsataSOcveteniPoleta`. Латентен дефект и без личния таб:
 * втори поглед със свои сгънати щеше да рисува чуждите.
 */
function imeNaDeloto(
  d: Delo,
  vsichki: readonly Delo[],
  dnes: string,
  sasSgavachi: boolean,
  sgunati: ReadonlySet<string>,
  nomer: string,
  sgavaemi: ReadonlySet<string>,
): string {
  // В копието (Сметки) сгъвач не се рисува: бутон без ръка зад него е лъжа.
  const sgavaemo = sasSgavachi && sgavaemi.has(d.id);
  // СТЕПЕНТА, не булев тест (резен 12б). Дотук тук стоеше `d.nadDelo ? … : …`
  // и затова подподделото се рисуваше ТОЧНО като подделото — трета степен
  // нямаше как да се различи. Негово *(р52·[231])*: „името на всеки проект в
  // първа колона, а на задачите следващите редове да започват от втора колона."
  const stepen = stepenNa(vsichki, d.id);
  // СТЕПЕНТА идва като `data-`, НЕ като вграден `style`: CSP-то на приложението
  // е `default-src 'self'` без `unsafe-inline`, значи браузърът ОТКАЗВА вградени
  // стилови атрибути и отстъпът просто нямаше да се приложи. Числото се слага
  // през CSSOM в `gant-izgled.ts` — там, където живеят и другите променливи на
  // решетката. Проходът го хвана през конзолата.
  return `<div class="gant-delo ${svetofar(d, dnes)}${stepen > 0 ? ' poddelo' : ''}"
    data-stepen="${stepen}" data-ime="${ekraniraj(d.id)}">
    ${
      sgavaemo
        ? `<button type="button" class="sgavach" data-sgavi="${ekraniraj(d.id)}" aria-label="сгъни">${
            sgunati.has(d.id) ? '▸' : '▾'
          }</button>`
        : '<span class="sgavach prazen"></span>'
    }
    <span class="nomer-stepen" translate="no">${ekraniraj(nomer)}</span>
    <b>${ekraniraj(d.ime)}</b>
    ${
      sasSgavachi
        ? `<span class="stepenki">
            <button type="button" data-navan="${ekraniraj(d.id)}" title="Навън · едно ниво нагоре"
              aria-label="Навън · едно ниво нагоре">◄</button>
            <button type="button" data-navatre="${ekraniraj(d.id)}" title="Навътре · под реда над него"
              aria-label="Навътре · под реда над него">►</button>
          </span>`
        : ''
    }
    <span class="drebno">${ekraniraj(d.obekt || '—')} · ${ekraniraj(d.otgovornik)}</span>
  </div>`;
}

/**
 * Изнесена: Сметки я рисува СЪЩАТА (И95 — „да създаваш както като в
 * Управление"). Един механизъм, два екрана — не втора форма.
 */
export function formaDelo(
  o: Ogledalo,
  dnes: string,
  predstavka = 'd-',
  nadpisi: NadpisiNaGanta = NADPISI_SLUZHEBNI,
): string {
  const id = (kratko: string) => `${predstavka}${kratko}`;
  const menyutata = menyutataNaFormata(o, nadpisi);
  zapomniRechnitsite(predstavka, menyutata);
  return `
    <section data-sektsiya="gant-forma" class="karta">
      <div class="dyalglava"><h2>${ekraniraj(nadpisi.imeNaFormata)}</h2><span>${ekraniraj(nadpisi.podnaslovNaFormata)}</span></div>
      <form id="${id('forma-delo')}">
        <div class="poleta">
          ${
            /**
             * ЧЕТИРИТЕ ЖИВИ МЕНЮТА (И97 · ADR-040).
             *
             * Речникът им НЕ се пази отделно — той Е онова, което вече стои в
             * делата. Всичките четири ОПИСВАТ (системата не смята върху тях),
             * значи растат свободно от полето: „нищо не спира човека".
             *
             * Първата колона носи надписа на погледа: „Място" в служебния,
             * „Тема" в личния — същото поле, същият речник, друга дума.
             */
            [
              { k: 'myasto', e: nadpisi.glavaNaImenata.split(' · ')[0] ?? 'Място', z: true, m: 'Малинова' },
              { k: 'obekt', e: 'Обект', z: false, m: 'може да е празно' },
              { k: 'ime', e: 'Дело', z: true, m: 'Акт 15' },
              { k: 'otgovornik', e: 'Отговорник', z: true, m: 'Николай Петков' },
            ]
              .map((p) =>
                poleSMenyu({
                  id: id(p.k),
                  ime: p.k,
                  etiket: p.e,
                  menyu: menyutata.get(p.k)!,
                  zadalzhitelno: p.z,
                  mestodarzhatel: p.m,
                }),
              )
              .join('')
          }
          <div class="pole">
            <label for="${id('ot')}">От</label>
            <input translate="no" id="${id('ot')}" name="ot" type="date" value="${dnes}" required>
          </div>
          <div class="pole">
            <label for="${id('do')}">До</label>
            <input translate="no" id="${id('do')}" name="do" type="date" value="${dnes}" required>
          </div>
          <div class="pole">
            <label for="${id('otsenka')}">Оценка</label>
            <select translate="no" id="${id('otsenka')}" name="otsenka">
              ${OTSENKI.map((x) => `<option value="${x}">${IMENA_NA_OTSENKITE[x]}</option>`).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="${id('sastoyanie')}">Състояние</label>
            <select translate="no" id="${id('sastoyanie')}" name="sastoyanie">
              ${SASTOYANIYA.map((x) => `<option value="${x}">${x}</option>`).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="${id('nad')}">Поддело на</label>
            <select translate="no" id="${id('nad')}" name="nadDelo">
              <option value="">— самостоятелно —</option>
              ${[...o.dela.values()]
                .map((d) => `<option value="${ekraniraj(d.id)}">${ekraniraj(d.ime)}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="deystviya">
          <button type="submit">Запиши делото</button>
          <p class="greshka" id="${id('greshka-delo')}">${ekraniraj(greshkaDelo)}</p>
        </div>
        <p class="drebno">Мястото и Обектът са КОЛОНИ, не нива: дело без обект е нормално.
        Сгъва се само дело с поддела — „Имотите не се сгъват, сгъват се само делата и поддела."</p>
      </form>
    </section>`;
}

/**
 * ШИРИНИТЕ СЕ СЛАГАТ ОТ JS, не с `style="…"` в разметката.
 *
 * Строгата политика (CSP `default-src 'self'`) блокира inline стил — и това е
 * правилно: нищо чуждо в пакета (правило 10), включително стил, дошъл от низ.
 * Писането през CSSOM (`style.setProperty`) НЕ е inline стил и минава.
 *
 * Затова решетката носи `data-koloni` и `data-ot`/`data-broy`, а тук те стават
 * истински CSS свойства. Политиката не се отслабва заради удобство.
 *
 * Изнесена е: копието в Сметки носи същата решетка и иска същите ширини.
 */
export function slozhiShirinite(koren: HTMLElement): void {
  for (const gant of koren.querySelectorAll<HTMLElement>('.gant')) {
    const broy = Number(gant.dataset.koloni ?? 0);
    // СТАНДАРТНА ширина, не разтеглива (резен 12): `1fr` разпъваше колоните да
    // напълнят мястото и оставяше хоризонталния скрол без какво да скролва.
    // Числото идва от `--kolona`, което `gant-izgled.ts` мени с влачене.
    gant.style.setProperty('--vreme', `repeat(${broy}, var(--kolona, 34px))`);
  }
  for (const l of koren.querySelectorAll<HTMLElement>('.gant-lenta')) {
    l.style.setProperty('--ot', String(l.dataset.ot ?? 1));
    l.style.setProperty('--broy', String(l.dataset.broy ?? 1));
  }
}

export function zakachiGant(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
  klyuch = 'gant',
  predstavka = 'd-',
): void {
  slozhiShirinite(koren);
  const p = pogled(klyuch);
  // ЗАКОНЪТ ЗА МЕНЮТАТА (И97 · ADR-040) · четирите живи полета на формата.
  // Речниците се четат при закачане, значи всяко ново дело ги обогатява само.
  const menyutata = rechnitsite(predstavka);
  zakachiMenyuta(koren, menyutata);

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-takt]')) {
    b.addEventListener('click', async () => {
      p.takt = b.dataset.takt as Takt;
      zapomniPogleda(p);
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sgavi]')) {
    b.addEventListener('click', async () => {
      const id = b.dataset.sgavi!;
      if (p.sgunati.has(id)) p.sgunati.delete(id);
      else p.sgunati.add(id);
      zapomniPogleda(p);
      await prerisuvay();
    });
  }

  /**
   * БУТОНЪТ СЕГА · негови думи *(р57·[176])*: „Добави и бутон за рефреш на
   * задачите за да събираш за деня най спешните и важни задачи."
   *
   * Той ПОДРЕЖДА и връща погледа на днес; не решава вместо човека и не пипа
   * нито едно дело (правило 18).
   */
  koren.querySelector<HTMLButtonElement>('#sega')?.addEventListener('click', async () => {
    p.filtarMyasto = '';
    p.filtarObekt = '';
    p.filtarOtsenka = 'спешно-важно';
    p.sgunati.clear();
    zapomniPogleda(p);
    await prerisuvay();
    koren.querySelector<HTMLElement>('#gant-vreme .dnes')?.scrollIntoView({
      inline: 'start',
      block: 'nearest',
    });
  });

  /**
   * НАВЪТРЕ · НАВЪН · „вкараш нова степен от главното дърво" (резен 12б).
   *
   * Редът идва от ЕКРАНА, не от Огледалото: „навътре" значи „под реда над мен",
   * а редът на екрана е онова, което човекът вижда. Оттам нататък решава чиста
   * функция, а записът е ПОПРАВКА на същото дело — същият `id`, същото събитие.
   */
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-navatre], [data-navan]')) {
    b.addEventListener('click', async () => {
      const posoka = b.dataset.navatre === undefined ? 'navan' : 'navatre';
      const id = b.dataset.navatre ?? b.dataset.navan!;
      const o = await k.deystviya.ogledalo();
      const redat = [...koren.querySelectorAll<HTMLElement>('.gant-delo')]
        .map((e) => o.dela.get(e.dataset.ime ?? ''))
        .filter((d): d is Delo => d !== undefined);
      const nov = noviyatRoditel(redat, id, posoka);
      if (nov === null) {
        // ВЕСТТА се вижда чак след прерисуване (`k.vest` само я запомня).
        // „Няма къде" се КАЗВА, не се мълчи — правило 15.
        k.vest('zle', posoka === 'navatre'
          ? 'Няма ред над него на същото ниво — няма под какво да влезе.'
          : 'Вече е в корена — по-навън няма.');
        await prerisuvay();
        return;
      }
      const delo = o.dela.get(id);
      if (!delo) return;
      b.disabled = true;
      try {
        await k.deystviya.zapishiDelo(
          id,
          {
            myasto: delo.myasto, obekt: delo.obekt, ime: delo.ime,
            otgovornik: delo.otgovornik, ot: delo.ot, do: delo.do,
            otsenka: delo.otsenka, sastoyanie: delo.sastoyanie,
            nadDelo: nov, dokument: delo.dokument,
          },
          { opId: crypto.randomUUID() },
        );
        await prerisuvay();
      } catch (err) {
        k.vest('zle', dumiZaGreshka(err));
      } finally {
        b.disabled = false;
      }
    });
  }

  koren.querySelector<HTMLButtonElement>('#kam-diagrama')?.addEventListener('click', async () => {
    p.diagrama = !p.diagrama;
    zapomniPogleda(p);
    await prerisuvay();
  });

  const vrazhi = (id: string, kam: (v: string) => void) => {
    koren.querySelector<HTMLSelectElement>(id)?.addEventListener('change', async (e) => {
      kam((e.target as HTMLSelectElement).value);
      await prerisuvay();
    });
  };
  vrazhi('#f-myasto', (v) => {
    p.filtarMyasto = v;
    zapomniPogleda(p);
  });
  vrazhi('#f-obekt', (v) => {
    p.filtarObekt = v;
    zapomniPogleda(p);
  });
  vrazhi('#f-otsenka', (v) => {
    p.filtarOtsenka = v;
    zapomniPogleda(p);
  });

  zakachiFormataNaDelo(koren, k, prerisuvay, predstavka);
}

/**
 * Изнесено: същият submit работи и в Сметки (И95). Записът минава през
 * СЪЩИЯ zapishiDelo — един път, два екрана.
 */
export function zakachiFormataNaDelo(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
  /**
   * ПРЕДСТАВКА на всички id-та във формата (И98).
   *
   * Две форми на един документ значат две `#forma-delo`: `querySelector`
   * хваща ПЪРВАТА, а втората изглежда работеща и не записва нищо. Затова
   * личната носи своя представка — и своята `Deystviya` през `k`.
   */
  predstavka = 'd-',
): void {
  const forma = koren.querySelector<HTMLFormElement>(`#${predstavka}forma-delo`);
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const izhod = koren.querySelector<HTMLElement>(`#${predstavka}greshka-delo`)!;
    izhod.textContent = '';
    const d = new FormData(forma);
    const buton = forma.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let ot: string;
    let doData: string;
    try {
      ot = otData(String(d.get('ot') ?? ''), 'Началото на делото');
      doData = otData(String(d.get('do') ?? ''), 'Краят на делото');
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
      return;
    }
    if (doData < ot) {
      izhod.textContent = 'Краят не може да е преди началото.';
      return;
    }

    // Кои стойности ще влязат НОВИ · брои се ПРЕДИ записа, защото после
    // речникът вече ги съдържа и отговорът би бил „нищо ново".
    const novite = novoteVSpisatsite(koren, rechnitsite(predstavka));

    buton.disabled = true;
    try {
      await k.deystviya.zapishiDelo(
        crypto.randomUUID(),
        {
          myasto: String(d.get('myasto') ?? '').trim(),
          obekt: String(d.get('obekt') ?? '').trim(),
          ime: String(d.get('ime') ?? '').trim(),
          otgovornik: String(d.get('otgovornik') ?? '').trim(),
          ot,
          do: doData,
          otsenka: String(d.get('otsenka')) as Otsenka,
          sastoyanie: String(d.get('sastoyanie')),
          nadDelo: String(d.get('nadDelo') ?? ''),
          dokument: '',
        },
        { opId: opIdDelo },
      );
      opIdDelo = crypto.randomUUID();
      // „Нищо не спира човека" — но СЛЕД записа му се казва какво е направил.
      // Преди записа това би било въпрос; след него е следа.
      k.vest('dobre', `Делото е записано.${sDumiZaNovite(novite)}`);
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });
}
