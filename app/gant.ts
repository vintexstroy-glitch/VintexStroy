import { imaRachenRed, nomeratNa, sledPremestvane } from '../src/domein/porednost.js';
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

import { narisuvayAvtoDelata } from './avtodela.js';
import { otData } from '../src/yadro/data.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import type { KolonaSFiltar } from './filtri.js';
import { pishi } from '../src/yadro/pari.js';
import { broyDokumenti, butonNaDokumentite } from './dokumenti.js';
import {
  CHASOVE_NA_DENYA,
  edinitsataNaSvoya,
  IMENA_NA_TAKTOVETE,
  TAKTOVE,
  type SvoyPeriod,
  type Takt,
} from '../src/domein/vreme.js';
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
  otpadnalite,
  vDnevniyaRed,
  zavarshenite,
  zhivite,
} from '../src/domein/dela.js';
import { mestata, sveriMestata } from '../src/domein/mesta.js';
import {
  dumataNaButona,
  mozheDaSeSkrie,
  obobshteniRedove,
  prevkluchi,
  reshetka,
  type RedNaRazrez,
} from '../src/domein/gant.js';
import {
  IMENA_NA_RAZREZITE,
  RAZREZI,
  sumiZaObhvat,
  type Razrez,
} from '../src/domein/otcheti.js';
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
  /** СВОЯТ такт · негов период от дата до дата (И104) */
  svoy: SvoyPeriod;
  /** ПО КАКВО се реже сборът · И102 · поглед, не факт (ADR-022) */
  razrez: Razrez;
  readonly sgunati: Set<string>;
  diagrama: boolean;
  /** негово, 31.08: „Да може да се крие" · таблицата, като диаграмата */
  tablitsa: boolean;
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
    // Менютата растат от ЖИВИТЕ · отпадналото дело не предлага място и обект
    // за нови (правило 17 · `zhivite`, резен 30).
    zhivite([...o.dela.values()]).map((d) => d[klyuch]),
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

/**
 * КАКВО КАЗВА ТАКТЪТ · един ред, който не лъже.
 *
 * Числото на колоните се БРОИ от решетката, а не се предполага: при „месец"
 * февруари дава 28, а не 31, и точно това беше неговото възражение. При „свой"
 * се казва и коя е колоната — денят или месецът — защото това е решение, взето
 * вместо него, и мълчаливото решение е по-лошото.
 */
function opisNaTakta(p: PogledNaGanta, deystvitelen: Takt, broyKoloni: number): string {
  if (p.takt === 'svoy' && deystvitelen !== 'svoy') {
    return 'свой · избери ОТ и ДО · дотогава се показва месец';
  }
  if (p.takt === 'svoy') {
    const edinitsa = edinitsataNaSvoya(p.svoy) === 'den' ? 'ДЕН' : 'МЕСЕЦ';
    return `свой · ${p.svoy.ot} → ${p.svoy.do} · колоната е ${edinitsa} · ${broyKoloni} колони`;
  }
  if (deystvitelen === 'den') {
    return `ден · ${CHASOVE_NA_DENYA.length} часа между 08:00 и 17:00 · обедът не се рисува`;
  }
  return `${IMENA_NA_TAKTOVETE[deystvitelen].toLowerCase()} · ${broyKoloni} колони`;
}

const POGLEDI = new Map<string, PogledNaGanta>();

function pogled(klyuch = 'gant'): PogledNaGanta {
  const veche = POGLEDI.get(klyuch);
  if (veche) return veche;
  const nov: PogledNaGanta = {
    klyuch,
    takt: chetiEkranno<Takt>(`${klyuch}.takt`, 'mesets'),
    svoy: chetiEkranno<SvoyPeriod>(`${klyuch}.svoy`, { ot: '', do: '' }),
    razrez: chetiEkranno<Razrez>(`${klyuch}.razrez`, 'bez'),
    sgunati: new Set<string>(chetiEkranno<string[]>(`${klyuch}.sgunati`, [])),
    diagrama: chetiEkranno(`${klyuch}.diagrama`, true),
    tablitsa: chetiEkranno(`${klyuch}.tablitsa`, true),
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
  zapomniEkranno(`${p.klyuch}.svoy`, p.svoy);
  zapomniEkranno(`${p.klyuch}.razrez`, p.razrez);
  zapomniEkranno(`${p.klyuch}.sgunati`, [...p.sgunati]);
  zapomniEkranno(`${p.klyuch}.diagrama`, p.diagrama);
  zapomniEkranno(`${p.klyuch}.tablitsa`, p.tablitsa);
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

// ГЛАВАТА СЕ СМЯТА от описателя (`glavataNaDelata`), вече не се пише като низ:
// той е ЕДИНСТВЕНИЯТ ѝ дом и матрицата чете същото (правило 17 · резен 48).
export const NADPISI_SLUZHEBNI: NadpisiNaGanta = Object.freeze({
  zaglavie: 'Управление на Времевия Ред в Делата',
  glavaNaImenata: glavataNaDelata('Място'),
  podnaslovNaFormata: `${glavataNaDelata('Място')} — колоните на делото`,
  imeNaFormata: 'Ново дело',
});

export const NADPISI_LICHNI: NadpisiNaGanta = Object.freeze({
  zaglavie: 'Моето време · личните дела',
  glavaNaImenata: glavataNaDelata('Тема'),
  podnaslovNaFormata: `${glavataNaDelata('Тема')} — същите колони`,
  imeNaFormata: 'Ново лично дело',
});

/**
 * КОЛОНИТЕ НА ДЕЛАТА · ЕДИН ДОМ, четен и от Ганта, и от матрицата (резен 48).
 *
 * Дотук главата на имената беше НИЗ (`glavaNaImenata: 'Място · Обект · Дело'`),
 * а матрицата „Кой какво вижда" изобщо не познаваше тази таблица: `docs/10`
 * носеше реда като дълг с адрес, а `app/tablitsite.ts` — граница, казана на глас.
 * Причината беше вярна: нямаше откъде да се прочетат имената, без да се препишат,
 * а преписаните се разминават при първата промяна (правило 17).
 *
 * Оттук нататък имената живеят ТУК и се четат на двете места. Първата колона е
 * ПОДАДЕНА, защото същата таблица говори с различни думи: „Място" при
 * служебните дела, „Тема" при личните (И98) — надпис, не втора структура.
 *
 * ═══ И ГЛАВАТА БЕШЕ НЕПЪЛНА ═══
 *
 * Низът изброяваше ТРИ колони, а редът показва ЧЕТИРИ: под името стои
 * „обект · отговорник". Отговорникът се виждаше на екрана и го нямаше в главата
 * му — точно разминаването, което един дом премахва.
 */
export function koloniNaDelata(parvata = 'Място'): KolonaSFiltar<Delo>[] {
  return [
    { klyuch: 'myasto', ime: parvata, vid: 'tekst', vzemi: (d) => d.myasto },
    { klyuch: 'ime', ime: 'Дело', vid: 'tekst', vzemi: (d) => d.ime },
    { klyuch: 'obekt', ime: 'Обект', vid: 'tekst', vzemi: (d) => d.obekt },
    { klyuch: 'otgovornik', ime: 'Отговорник', vid: 'tekst', vzemi: (d) => d.otgovornik },
  ];
}

/** Главата на имената · СМЯТА се от описателя, вече не се пише като низ. */
export function glavataNaDelata(parvata = 'Място'): string {
  return koloniNaDelata(parvata)
    .map((k) => k.ime)
    .join(' · ');
}

export function narisuvayGant(
  o: Ogledalo,
  dnes: string,
  klyuch = 'gant',
  nadpisi: NadpisiNaGanta = NADPISI_SLUZHEBNI,
  predstavka = 'd-',
): string {
  const p = pogled(klyuch);
  const { sgunati, diagrama, tablitsa, filtarMyasto, filtarObekt, filtarOtsenka } = p;
  // СВОЯТ ТАКТ без период е такт без решетка. Вместо празен екран се пада на
  // месец и полетата стоят отворени — правило 15: изключеното се КАЗВА.
  const svoyGotov = p.svoy.ot !== '' && p.svoy.do !== '' && p.svoy.do >= p.svoy.ot;
  const takt = p.takt === 'svoy' && !svoyGotov ? 'mesets' : p.takt;
  // ЖИВИТЕ · отпадналите имат свой изглед и не се смесват с работата.
  const vsichki = zhivite([...o.dela.values()]);
  // ПОДРЕДБАТА Е ДЪРВОВИДНА (резен 12б): детето винаги СЛЕД родителя си, а
  // вътре в едно ниво важи неговата подредба (спешност → Оценка → завършените
  // долу). Правилото му не се мени — прилага се на всяко ниво поотделно.
  // РЪЧНИЯТ РЕД ПОБЕЖДАВА · „★ Ръчният ред побеждава" *(ред 1496)* (резен 34).
  // Прилага се ВЪТРЕ в едно ниво: дървото е по-силно, защото дете, изкарано
  // пред родителя си, престава да е дете.
  const rachen = o.rachniyatRedNaDelata;
  // ДНЕВНИЯТ РЕД (И124 т.6): завършеното „не е в дневния ред" — то е в
  // архивната таблица долу, заредена по периода на изгледа.
  const podredeni = podredeniPoDarvo(vDnevniyaRed(vsichki), dnes, rachen);
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
  const r = reshetka(zaRisuvane, takt, dnes, p.svoy);
  // Сумите покриват ЦЕЛИЯ обхват на решетката — от първата до последната
  // колона — не един месец: колона извън месеца показваше нула, която
  // изглеждаше като „няма движение".
  const parvata = r.koloni[0]!;
  const poslednata = r.koloni[r.koloni.length - 1]!;
  const sumi = obobshteniRedove(
    r.koloni,
    sumiZaObhvat(o, parvata.ot, poslednata.do, p.razrez),
  );

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

    ${narisuvayAvtoDelata(o, dnes)}

    <section data-sektsiya="gant-izgled" class="karta">
      <div class="dyalglava">
        <h2>Изглед</h2>
        <span>тактът мени решетката · ${ekraniraj(opisNaTakta(p, takt, r.koloni.length))}</span>
      </div>
      <div class="lentata">
        <div class="takt" role="group" aria-label="Такт">
          ${TAKTOVE.map(
            (t) =>
              `<button type="button" data-takt="${t}" class="${t === p.takt ? 'izbran' : ''}">${
                IMENA_NA_TAKTOVETE[t]
              }</button>`,
          ).join('')}
        </div>
        ${
          p.takt === 'svoy'
            ? `<div class="svoy-period poleta tesni">
                <div class="pole">
                  <label for="svoy-ot">От</label>
                  <input type="date" id="svoy-ot" value="${ekraniraj(p.svoy.ot)}">
                </div>
                <div class="pole">
                  <label for="svoy-do">До</label>
                  <input type="date" id="svoy-do" value="${ekraniraj(p.svoy.do)}">
                </div>
              </div>`
            : ''
        }
        <button type="button" id="sega" class="vtorichen">СЕГА</button>
        ${
          /*
           * „Състоянието е бутон «подреди»" *(ред 1496)* · връща СМЕТНАТАТА
           * подредба. Появява се само когато има какво да се отменя: бутон,
           * който не мени нищо, е надпис (ADR-041).
           */
          imaRachenRed(rachen)
            ? `<button type="button" id="podredi-avtomatichno" class="vtorichen"
                title="Върни подредбата по спешност и Оценка">Подреди</button>`
            : ''
        }
        <button type="button" id="kam-diagrama" class="vtorichen"${
          mozheDaSeSkrie({ tablitsa, diagrama }, 'diagrama') ? '' : ' disabled'
        }>${ekraniraj(dumataNaButona({ tablitsa, diagrama }, 'diagrama'))}</button>
        <button type="button" id="kam-tablitsa" class="vtorichen"${
          mozheDaSeSkrie({ tablitsa, diagrama }, 'tablitsa') ? '' : ' disabled'
        }>${ekraniraj(dumataNaButona({ tablitsa, diagrama }, 'tablitsa'))}</button>
        ${
          mozheDaSeSkrie({ tablitsa, diagrama }, 'tablitsa') &&
          mozheDaSeSkrie({ tablitsa, diagrama }, 'diagrama')
            ? ''
            : `<span class="drebno" data-posleden-izgled>${ekraniraj(
                prevkluchi({ tablitsa, diagrama }, tablitsa ? 'tablitsa' : 'diagrama').otkaz,
              )}</span>`
        }
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
        <div class="pole">
          <label for="f-razrez">Разбий по</label>
          <select translate="no" id="f-razrez">${RAZREZI.map(
            (x) =>
              `<option value="${x}"${x === p.razrez ? ' selected' : ''}>${IMENA_NA_RAZREZITE[x]}</option>`,
          ).join('')}</select>
        </div>
      </div>
      <p class="drebno">Три колони с филтри, не три нива — филтрира се по която и да е, независимо от другите.
      „Разбий по" е ЧЕТВЪРТО нещо и не е филтър: то не маха редове, а реже СБОРА на части —
      ${ekraniraj(String(sumi.length))} ${sumi.length === 1 ? 'ред' : 'реда'} под решетката, чийто сбор е същият.</p>
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
            <p class="prazno" data-prazno="dela">Няма дела.<br>Времевият ред се пълни отдолу — ${ekraniraj(nadpisi.glavaNaImenata)}.</p>
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
          `<div class="gant-dvete${diagrama ? '' : ' bez-diagrama'}${tablitsa ? '' : ' bez-tablitsa'}" data-sektsiya="gant-delata">
            ${tablitsa ? `<div class="gant-tablitsata">${tablitsataSOcveteniPoleta(zaRisuvane, r, sumi, dnes, true, true, sgunati, nadpisi, sgavaemi, (id) =>
              broyDokumenti(o, 'delo', id), rachen,
            )}</div>` : ''}
            ${diagrama ? `<div class="gant-diagramata">${narisuvayDiagrama(zaRisuvane, r, dnes, sumi)}</div>` : ''}
          </div>`
    }

    ${blokNaMestata(o, dnes, predstavka)}

    ${blokNaZavarshenite(o, predstavka, parvata.ot, poslednata.do)}

    ${blokNaOtpadnalite(o, predstavka)}

    ${formaDelo(o, dnes, predstavka, nadpisi)}`;
}

/**
 * МЕСТАТА (проектите) · отговорник-ФИРМА и папка (резен 31 · ADR-091).
 *
 * „На нивото на проекта дай ЛИНК КЪМ ПАПКАТА с проекта" и „в таблицата за
 * отговорник напиши ФИРМАТА която управлява проекта" *(р48·[42])*.
 *
 * ═══ ДВА ОТГОВОРНИКА, КОИТО НЕ СЕ СМЕСВАТ ═══
 *
 * Мястото (проектът) го управлява ФИРМА; делото (задачата) го върши ЧОВЕК
 * *(р48·[44])*. Колоната тук КАЗВА кой е кой, за да не се четат двете като едно.
 *
 * ═══ НЕЗАПИСАНИТЕ СЕ ПОКАЗВАТ СЪЩО ═══
 *
 * Място, което само се среща по делата, стои в списъка с празни полета и белег
 * „още не е записано". Списък само от записаните щеше да КРИЕ точно работата —
 * човек вижда къде има какво да допълни, вместо да се сеща сам.
 */
function blokNaMestata(o: Ogledalo, dnes: string, predstavka: string): string {
  const redove = mestata(o, zhivite([...o.dela.values()]));
  const bezZapis = redove.filter((r) => !r.zapisano).length;
  const sv = sveriMestata(o, zhivite([...o.dela.values()]), dnes);

  return `
    <section data-sektsiya="gant-mesta" data-broy="${redove.length}" data-bez-zapis="${bezZapis}">
      <div class="dyalglava">
        <h2>Местата · проектите</h2>
        <span>отговорникът на МЯСТОТО е ФИРМА · на ДЕЛОТО е ЧОВЕК</span>
      </div>

      ${
        redove.length === 0
          ? '<p class="drebno">Още няма нито едно място — то се появява с първото дело или се записва оттук.</p>'
          : `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="mestata">
          <thead>
            <tr><th>Място</th><th>Фирма · управлява проекта</th><th>Папка</th><th class="chislo">Дела</th></tr>
          </thead>
          <tbody>${redove
            .map(
              (r) => `
            <tr data-myasto="${ekraniraj(r.ime)}"${r.zapisano ? '' : ' class="bez-zapis"'}>
              <td translate="no">${ekraniraj(r.ime)}${
                r.zapisano ? '' : ' <span class="drebno">още не е записано</span>'
              }</td>
              <td translate="no">${ekraniraj(r.firma) || '<span class="drebno">—</span>'}</td>
              <td translate="no">${
                r.papka === ''
                  ? '<span class="drebno">—</span>'
                  : `<a href="${ekraniraj(r.papka)}" target="_blank" rel="noopener noreferrer">папката</a>`
              }</td>
              <td class="chislo" translate="no">${r.dela}</td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>`
      }

      <form class="forma" id="${predstavka}forma-myasto">
        <div class="poleta">
          <div class="pole">
            <label for="${predstavka}m-ime">Място</label>
            <input translate="no" type="text" id="${predstavka}m-ime" name="ime" required
                   list="${predstavka}m-imena" placeholder="Малинова Долина">
            <datalist id="${predstavka}m-imena">
              ${redove.map((r) => `<option value="${ekraniraj(r.ime)}"></option>`).join('')}
            </datalist>
          </div>
          <div class="pole">
            <label for="${predstavka}m-firma">Фирма · управлява проекта</label>
            <input translate="no" type="text" id="${predstavka}m-firma" name="firma"
                   placeholder="Винтекс Строй ЕООД">
          </div>
          <div class="pole">
            <label for="${predstavka}m-papka">Линк към папката</label>
            <!-- ПЛЕЙСХОЛДЪР БЕЗ АДРЕС · стената срещу кода брои всеки адрес в
                 него, и е права да не различава плейсхолдър от истинско
                 посягане: адрес в кода е адрес в кода. Думите вършат същата
                 работа. -->
            <input translate="no" type="url" id="${predstavka}m-papka" name="papka"
                   placeholder="адресът на папката в Драйва">
          </div>
        </div>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши мястото</button>
          <span class="drebno">Фирмата и папката са <b>по избор</b> — мястото има смисъл
          и само с име. Второто записване ПОПРАВЯ същото място, не ражда второ.</span>
        </div>
      </form>

      <p class="drebno" data-mesta-sverka>Сверка вход↔изход: ${sv.vhod} → ${sv.izhod},
      разлика ${sv.razlika}.${
        bezZapis === 0
          ? ' Всяко място си има запис.'
          : ` ${bezZapis} ${bezZapis === 1 ? 'място чака' : 'места чакат'} фирма и папка.`
      }</p>
    </section>`;
}

/**
 * ОТПАДНАЛИТЕ ДЕЛА · „остават в отедлно наи тфолу" (резен 30 · ADR-090).
 *
 * Негова дума: „остават в отедлно наи тфолу тези които са отпаднали но се пази
 * история като бацк уп".
 *
 * ═══ ОТДЕЛНО, НЕ ИЗТРИТО · и НЕ сторнирано ═══
 *
 * Сторното казва „това никога не е трябвало да се записва"; отпадналото казва
 * „беше вярно, вече няма предмет". Дотук честен изход нямаше: човек или
 * сторнираше (лъжа за миналото), или пишеше „завършено" (лъжа за настоящето).
 *
 * „Бекъпът" не се строи — Журналът е само за добавяне и историята е там цяла.
 * Тук стои онова от нея, което трябва да се ВИДИ на реда: КОГА и КОЙ.
 *
 * Блокът стои и при НУЛА · проверената нула е различна от премълчаната
 * (правило 7), а и оттук човек научава, че такова състояние изобщо има.
 */
/** Един ред от архива · завършено и отпаднало споделят клетките си. */
function redVArhiva(d: Delo, atributi: string, dopalnitelni: readonly string[]): string {
  const kletki = [d.myasto, d.obekt, d.ime, d.otgovornik]
    .map((k) => ekraniraj(k))
    .concat(dopalnitelni, ekraniraj(d.promeneno.slice(0, 10)), ekraniraj(d.promeniGo))
    .map((k) => `<td translate="no">${k}</td>`)
    .join('\n              ');
  return `
            <tr ${atributi}>
              ${kletki}
            </tr>`;
}

/** Обвивката на архивната таблица · една за завършени и отпаднали. */
function arhivnaTablitsa(klyuch: string, glavi: readonly string[], redove: readonly string[]): string {
  return `<div class="skrolkutiya">
        <table class="tablitsa" data-tablitsa="${klyuch}">
          <thead>
            <tr>${glavi.map((g) => `<th>${g}</th>`).join('')}</tr>
          </thead>
          <tbody>${redove.join('')}</tbody>
        </table>
      </div>`;
}

/**
 * ЗАВЪРШЕНИТЕ ДЕЛА · архивната таблица (И124 т.6).
 *
 * „Завършено се определя от Състояние… не е в дневния ред и влиза в друга
 * таблица която се ползва за архивиране и използване само когато от
 * управление или сметки се зареди период който я включва."
 *
 * Периодът Е зареденият изглед на решетката (тактът · своят от-до) — и в
 * Управление, и в Сметки секцията живее до нея, тъй че думата му важи и на
 * двете места. Показва се завършеното СЪС СРОК В ПЕРИОДА; колко има общо се
 * КАЗВА, за да не изглежда празният период като празен архив (правило 7).
 */
function blokNaZavarshenite(o: Ogledalo, predstavka: string, ot: string, doD: string): string {
  const vsichkite = zavarshenite([...o.dela.values()]);
  const vPerioda = vsichkite.filter((d) => d.do >= ot && d.do <= doD);
  const skriti = chetiEkranno<boolean>(`${predstavka}.zavarshenite`, false);

  return `
    <section data-sektsiya="gant-zavarsheni" data-broy="${vPerioda.length}" data-obshto="${vsichkite.length}">
      <div class="dyalglava">
        <h2>Завършени дела</h2>
        <span>архивът на свършеното · зарежда се по периода на изгледа</span>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="${predstavka}zavarsheni-prevkl">
          ${skriti ? 'Покажи завършените' : 'Скрий завършените'}
        </button>
        <span class="drebno">${
          vsichkite.length === 0
            ? 'Нито едно завършено дело.'
            : `${vPerioda.length} в периода ${ot} → ${doD} · всичко ${vsichkite.length} · без оценка, извън дневния ред`
        }</span>
      </div>
      ${
        skriti || vPerioda.length === 0
          ? ''
          : arhivnaTablitsa(
              'zavarsheni-dela',
              ['Място', 'Обект', 'Дело', 'Отговорник', 'Срок', 'Завършено на', 'От кого'],
              vPerioda.map((d) =>
                redVArhiva(d, `data-zavarsheno="${ekraniraj(d.id)}"`, [ekraniraj(d.do)]),
              ),
            )
      }
    </section>`;
}

function blokNaOtpadnalite(o: Ogledalo, predstavka: string): string {
  const redove = otpadnalite([...o.dela.values()]);
  const skriti = chetiEkranno<boolean>(`${predstavka}.otpadnalite`, false);

  return `
    <section data-sektsiya="gant-otpadnali" data-broy="${redove.length}">
      <div class="dyalglava">
        <h2>Отпаднали дела</h2>
        <span>отпадналото НЕ е сторнирано · остава, но не се работи по него</span>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="${predstavka}otpadnali-prevkl">
          ${skriti ? 'Покажи отпадналите' : 'Скрий отпадналите'}
        </button>
        <span class="drebno">${
          redove.length === 0
            ? 'Нито едно отпаднало дело.'
            : `${redove.length} ${redove.length === 1 ? 'отпаднало дело' : 'отпаднали дела'} · не влизат в срока, в светофара и в диаграмата`
        }</span>
      </div>
      ${
        skriti || redove.length === 0
          ? ''
          : arhivnaTablitsa(
              'otpadnali-dela',
              ['Място', 'Обект', 'Дело', 'Отговорник', 'Отпаднало на', 'От кого'],
              redove.map((d) =>
                redVArhiva(d, `data-otpadnalo="${ekraniraj(d.id)}" class="otpadnalo"`, []),
              ),
            )
      }
    </section>`;
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
  /**
   * РЕДОВЕТЕ НА РАЗБИВКАТА (резен 13б) · един при „без разбивка", по един на
   * контрагент · начин · сектор · поток иначе. Списък, не единичен ред, защото
   * това е СЪЩАТА сметка, само нарязана — два входа щяха да се разминат.
   */
  sumi: readonly RedNaRazrez[],
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
  /**
   * КОЛКО ДОКУМЕНТА има делото · дадено ОТВЪН, и липсата му значи „без копче".
   *
   * Копието в Сметки не го подава и там копче не се рисува — то ЧЕТЕ за
   * сверка, а закачането е писане и живее в Управление. Бутон без ръка зад
   * него е лъжа (същата причина като при сгъвачите отгоре).
   */
  dokumentiNa?: (deloId: string) => number,
  /**
   * РЪЧНИЯТ РЕД · само за КОЛОНАТА „поредност" и за дръжките (резен 34).
   *
   * Подредбата вече е приложена от викащия — тук се рисува само номерът, който
   * човекът вижда. Празно значи „никой не е местил": тогава колоната я няма,
   * защото празна колона от тирета е шум, не сведение.
   */
  rachen: readonly string[] = [],
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
      <div class="gant" data-tablitsa="gant-redove" data-koloni="${r.koloni.length}">
        <div class="gant-imena">
          <div class="gant-glava">${ekraniraj(nadpisi.glavaNaImenata)}</div>
          ${[...poMyasto.entries()]
            .map(
              ([myasto, spisak]) => `
            <div class="gant-myasto" title="Мястото е колона — не се сгъва (И88)">${ekraniraj(myasto)}</div>
            ${spisak.map((d) => imeNaDeloto(d, dela, dnes, sasSgavachi, sgunati, nomera.get(d.id) ?? '', sgavaemi, dokumentiNa, nomeratNa(rachen, d.id))).join('')}`,
            )
            .join('')}
          ${
            sasTsifrite
              ? sumi
                  .map(
                    (red) =>
                      `<div class="gant-sbor" title="${ekraniraj(
                        red.nadpis === '' ? 'Приход · Разход' : red.nadpis,
                      )}">${red.nadpis === '' ? 'Приход · Разход' : ekraniraj(red.nadpis)}</div>`,
                  )
                  .join('')
              : ''
          }
        </div>
        <div class="gant-vreme" id="gant-vreme">
          <div class="gant-glava-vreme">
            ${r.koloni
              .map(
                (k) =>
                  // ОПИСЪТ носи цялото · тясната глава реже („чт 27", „09"),
                  // но нищо не се губи: денят и часът стоят в `title`.
                  `<span class="${k.dnes ? 'dnes' : ''}" data-den="${k.ot}" title="${ekraniraj(
                    k.opis,
                  )}">${ekraniraj(k.nadpis)}</span>`,
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
          ${
            sasTsifrite
              ? sumi
                  .map(
                    (red) => `<div class="gant-red sumi" data-razrez="${ekraniraj(red.klyuch)}">
            ${red.kletki
              .map((s, i) =>
                s.obhvat === 0
                  ? ''
                  : `<span class="gant-suma${r.koloni[i]!.dnes ? ' dnes' : ''}" data-obhvat="${s.obhvat}">${
                      s.prihod_st || s.razhod_st
                        ? `<b translate="no">${pishi(s.prihod_st)}</b><i translate="no">${pishi(s.razhod_st)}</i>`
                        : ''
                    }</span>`,
              )
              .join('')}
          </div>`,
                  )
                  .join('')
              : ''
          }
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
  dokumentiNa: ((deloId: string) => number) | undefined,
  /** РЪЧНАТА поредност · 0 значи „няма", и тогава нищо не се рисува */
  porednost = 0,
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
    data-stepen="${stepen}" data-ime="${ekraniraj(d.id)}"
    data-grupa="${ekraniraj(d.myasto)}" data-nad="${ekraniraj(d.nadDelo)}">
    ${
      sgavaemo
        ? `<button type="button" class="sgavach" data-sgavi="${ekraniraj(d.id)}" aria-label="сгъни">${
            sgunati.has(d.id) ? '▸' : '▾'
          }</button>`
        : '<span class="sgavach prazen"></span>'
    }
    ${
      sasSgavachi
        ? `<button type="button" class="drazhka-red" data-vlachi="${ekraniraj(d.id)}"
            title="Задръж и движи, за да преместиш реда · ↑ ↓ с клавиатурата"
            aria-label="Премести реда">⠿</button>`
        : ''
    }
    ${
      porednost > 0
        ? `<span class="porednost" translate="no" data-porednost="${porednost}"
            title="Ръчна поредност">${porednost}</span>`
        : ''
    }
    <span class="nomer-stepen" translate="no">${ekraniraj(nomer)}</span>
    <b>${ekraniraj(d.ime)}</b>
    ${
      sasSgavachi
        ? `<button type="button" class="prati-zadacha" data-prati="${ekraniraj(d.id)}"
            title="Прати задачата на служител" aria-label="Прати задачата на служител">✉</button>
          <span class="stepenki">
            <button type="button" data-navan="${ekraniraj(d.id)}" title="Навън · едно ниво нагоре"
              aria-label="Навън · едно ниво нагоре">◄</button>
            <button type="button" data-navatre="${ekraniraj(d.id)}" title="Навътре · под реда над него"
              aria-label="Навътре · под реда над него">►</button>
          </span>`
        : ''
    }
    ${dokumentiNa ? butonNaDokumentite('delo', d.id, dokumentiNa(d.id), true) : ''}
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
              ${zhivite([...o.dela.values()])
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
  // КЛЕТКАТА НА СУМИТЕ се разпъва над часовете на своя ден (резен 13а).
  // Парите нямат час: сумата на деня стои ВЕДНЪЖ, не осем пъти.
  for (const s of koren.querySelectorAll<HTMLElement>('.gant-suma[data-obhvat]')) {
    s.style.setProperty('--obhvat', String(s.dataset.obhvat ?? 1));
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

  // МЯСТОТО (проектът) · записва се от УПРАВЛЕНИЕ, „само от там" (р83·[18]).
  koren
    .querySelector<HTMLFormElement>(`#${predstavka}forma-myasto`)
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = new FormData(e.target as HTMLFormElement);
      try {
        await k.deystviya.zapishiMyasto(
          {
            ime: String(d.get('ime') ?? ''),
            firma: String(d.get('firma') ?? ''),
            papka: String(d.get('papka') ?? ''),
          },
          { opId: `myasto:${crypto.randomUUID()}` },
        );
        k.vest('dobre', `Мястото „${String(d.get('ime') ?? '')}" е записано.`);
      } catch (err) {
        k.vest('zle', err instanceof Error ? err.message : String(err));
      }
      await prerisuvay();
    });

  // ═══ РЪЧНИЯТ РЕД · „★ Ръчният ред побеждава" *(ред 1496)* (резен 34) ═══
  //
  // „да може от редактора да местиш РЕДОВЕТЕ, като задържаш на полето и го
  // движиш, за да го преместиш, както е в MS Project" *(ред 1982)*.
  //
  // Двата лоста са ЕДИН път: и влаченето, и клавишите смятат СЪЩОТО
  // преместване и минават през СЪЩОТО действие. Втори път щеше да се
  // разсинхронизира при първата поправка (правило 17).
  zakachiPodrezhdaneto(koren, k, prerisuvay);

  // СКРИВАНЕТО НА ОТПАДНАЛИТЕ Е ЛИЧНО · памет на екрана, нула събития
  // (правило 23 · ADR-022). Отпадналото дело не се мени от това, че някой не
  // иска да го гледа.
  koren
    .querySelector<HTMLButtonElement>(`#${predstavka}otpadnali-prevkl`)
    ?.addEventListener('click', async () => {
      const klyuchat = `${predstavka}.otpadnalite`;
      zapomniEkranno(klyuchat, !chetiEkranno<boolean>(klyuchat, false));
      await prerisuvay();
    });
  koren
    .querySelector<HTMLButtonElement>(`#${predstavka}zavarsheni-prevkl`)
    ?.addEventListener('click', async () => {
      const klyuchat = `${predstavka}.zavarshenite`;
      zapomniEkranno(klyuchat, !chetiEkranno<boolean>(klyuchat, false));
      await prerisuvay();
    });

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

  /**
   * РАЗБИЙ ПО · разрезът е ПОГЛЕД, не факт (ADR-022 · правило 23): мени какво
   * се показва, не какво е записано. Затова в паметта на екрана, никога в
   * Журнала — и затова НЕ добавя нито едно събитие.
   */
  koren.querySelector<HTMLSelectElement>('#f-razrez')?.addEventListener('change', async (e) => {
    p.razrez = (e.target as HTMLSelectElement).value as Razrez;
    zapomniPogleda(p);
    await prerisuvay();
  });

  /**
   * СВОЯТ ПЕРИОД · двете дати (И104 · „такъв който сам да избереш").
   *
   * Пише се при СМЯНА, не при всеки натиснат клавиш: полето за дата ражда
   * `change` чак когато датата е цяла, значи прерисуване с половин дата няма.
   */
  for (const id of ['#svoy-ot', '#svoy-do']) {
    koren.querySelector<HTMLInputElement>(id)?.addEventListener('change', async (e) => {
      const v = (e.target as HTMLInputElement).value;
      p.svoy = id === '#svoy-ot' ? { ...p.svoy, ot: v } : { ...p.svoy, do: v };
      zapomniPogleda(p);
      await prerisuvay();
    });
  }

  /**
   * КОПЧЕ ЗА ВСЯКО ДЕЛО · негово, 08.08 *(р57·[160])*: „важно да има копче за
   * всяко дело да има отговорник и да му се праща сигнал към календара РЪЧНО."
   *
   * Не отваря втора форма. Запомня КОЕ дело и минава през СЪЩАТА врата, през
   * която минава и човек — пунктът в лентата. Втора форма за едно нещо се
   * разминава с първата при първата поправка (дословният урок на ADR-057:
   * „втора дръжка на същата врата, не втора врата").
   */
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-prati]')) {
    b.addEventListener('click', () => {
      zapomniEkranno('sluzhiteli.delo', b.dataset.prati ?? '');
      document.querySelector<HTMLElement>('[data-ekran=sluzhiteli]')?.click();
    });
  }

  // ДВАТА БУТОНА минават през ЕДНО решение (`prevkluchi`), не през два `if`-а:
  // правилото „последният видим не се скрива" има ЕДНО място, където може да
  // сгреши. Отказът се КАЗВА, не се преглъща (правило 15).
  const skriy = (koe: 'tablitsa' | 'diagrama') => async () => {
    const r = prevkluchi({ tablitsa: p.tablitsa, diagrama: p.diagrama }, koe);
    // Отказът НЕ се показва тук с вест: бутонът вече е изключен, а ПРИЧИНАТА
    // стои на екрана до него (правило 15). Изключен бутон без дума учи човека,
    // че приложението е счупено; изключен бутон С дума го учи защо.
    if (r.otkaz !== '') return;
    p.tablitsa = r.sled.tablitsa;
    p.diagrama = r.sled.diagrama;
    zapomniPogleda(p);
    await prerisuvay();
  };
  koren.querySelector<HTMLButtonElement>('#kam-diagrama')?.addEventListener('click', skriy('diagrama'));
  koren.querySelector<HTMLButtonElement>('#kam-tablitsa')?.addEventListener('click', skriy('tablitsa'));

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
/**
 * ПРЕМЕСТВАНЕТО НА РЕД · дръжка с мишка и стрелки с клавиатура (резен 34).
 *
 * ═══ РЕДЪТ ИДВА ОТ ЕКРАНА ═══
 *
 * Кой е „следващият" се чете от нарисуваните редове, а не от Огледалото —
 * дословният прецедент на „навътре/навън" (ADR-059): човекът мести реда, който
 * ВИЖДА, а видимото минава през филтри и сгъване.
 *
 * ═══ СЪСЕДИ ЗНАЧИ СЪЩОТО МЯСТО И СЪЩОТО НИВО ═══
 *
 * Ред, пуснат в чуждо място, щеше да се върне при своето при следващото
 * рисуване (мястото е КОЛОНА, а не позиция) — тоест движение, което изглежда
 * направено и не е. Затова целите се стесняват до съседите и отказът се КАЗВА
 * (правило 15), вместо да се преглътне.
 *
 * ═══ ЗАПИСВА СЕ ЦЕЛИЯТ ВИДИМ РЕД ═══
 *
 * Не разлика, а списък: при много вериги (ADR-055) две едновременни
 * размествания дават различен резултат според реда на прочитане.
 */
function zakachiPodrezhdaneto(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  const redovete = (): HTMLElement[] => [...koren.querySelectorAll<HTMLElement>('.gant-delo')];

  /** СЪСЕДИТЕ на един ред · същото място, същото ниво. */
  const sasedite = (el: HTMLElement): HTMLElement[] =>
    redovete().filter(
      (x) =>
        x.dataset.grupa === el.dataset.grupa &&
        x.dataset.stepen === el.dataset.stepen &&
        x.dataset.nad === el.dataset.nad,
    );

  const zapishi = async (vsichki: HTMLElement[], ot: number, do_: number): Promise<void> => {
    const red = vsichki.map((x) => x.dataset.ime ?? '');
    try {
      await k.deystviya.podrediDelata(
        { red: [...sledPremestvane(red, ot, do_)] },
        { opId: `porednost:${crypto.randomUUID()}` },
      );
    } catch (err) {
      k.vest('zle', err instanceof Error ? err.message : String(err));
    }
    await prerisuvay();
  };

  for (const drazhka of koren.querySelectorAll<HTMLElement>('.drazhka-red')) {
    const redat = drazhka.closest<HTMLElement>('.gant-delo');
    if (!redat) continue;

    /*
     * ГРАНИЦИТЕ СЕ КАЗВАТ ПРЕДИ НАТИСКАНЕТО, не след него (правило 15).
     *
     * Първата версия отговаряше на „няма накъде" с вест — тоест с цяло
     * прерисуване за движение, което НЕ се е случило. Проходът го хвана:
     * прерисуване не тръгваше, а и не биваше да тръгва. Краят на списък не е
     * отказ, а свойство на реда — и свойството живее НА него.
     */
    const bratyata = sasedite(redat);
    const kade = bratyata.indexOf(redat);
    drazhka.dataset['nagore'] = kade > 0 ? 'da' : 'ne';
    drazhka.dataset['nadolu'] = kade >= 0 && kade < bratyata.length - 1 ? 'da' : 'ne';

    // МИШКАТА · „задръж на полето и го движи". Целта е редът ПОД показалеца.
    drazhka.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drazhka.setPointerCapture(e.pointerId);
      redat.classList.add('vlacha-se');
      let tsel = redat;
      const mesti = (m: PointerEvent): void => {
        const pod = document.elementFromPoint(m.clientX, m.clientY);
        const kandidat = pod?.closest<HTMLElement>('.gant-delo');
        if (kandidat && sasedite(redat).includes(kandidat)) tsel = kandidat;
      };
      const pusni = async (): Promise<void> => {
        drazhka.releasePointerCapture(e.pointerId);
        drazhka.removeEventListener('pointermove', mesti);
        drazhka.removeEventListener('pointerup', pusni);
        drazhka.removeEventListener('pointercancel', pusni);
        redat.classList.remove('vlacha-se');
        if (tsel === redat) return; // никъде не е мръднал · нула събития
        const vsichki = redovete();
        await zapishi(vsichki, vsichki.indexOf(redat), vsichki.indexOf(tsel));
      };
      drazhka.addEventListener('pointermove', mesti);
      drazhka.addEventListener('pointerup', pusni);
      drazhka.addEventListener('pointercancel', pusni);
    });

    // КЛАВИАТУРАТА също мести · инак дръжката е лост само за мишка (ADR-066).
    drazhka.addEventListener('keydown', async (e) => {
      const posoka = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (posoka === 0) return;
      e.preventDefault();
      const bratya = sasedite(redat);
      const tsel = bratya[bratya.indexOf(redat) + posoka];
      // КРАЯТ НА СПИСЪКА · нищо не се случва и нищо не се пише. Че е край, се
      // вижда още преди натискането — на `data-nagore` · `data-nadolu` горе.
      if (!tsel) return;
      const vsichki = redovete();
      await zapishi(vsichki, vsichki.indexOf(redat), vsichki.indexOf(tsel));
    });
  }

  // „СЪСТОЯНИЕТО Е БУТОН «ПОДРЕДИ»" · връща СМЕТНАТАТА подредба.
  // Празен ред е ВАЛИДЕН запис и значи точно това — отмяна без триене.
  koren.querySelector<HTMLButtonElement>('#podredi-avtomatichno')?.addEventListener(
    'click',
    async () => {
      try {
        await k.deystviya.podrediDelata(
          { red: [] },
          { opId: `porednost:${crypto.randomUUID()}` },
        );
        k.vest('dobre', 'Подредбата се върна на спешност → Оценка → завършените долу.');
      } catch (err) {
        k.vest('zle', err instanceof Error ? err.message : String(err));
      }
      await prerisuvay();
    },
  );
}

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
  // ОЦЕНКАТА СЕ ИЗКЛЮЧВА при завършено (И124 т.6) — и изборът, който не
  // действа, се КАЗВА (правило 15), не се преглъща: полето посивява с думи.
  {
    const sastoyanieIzbor = forma?.querySelector<HTMLSelectElement>('[name=sastoyanie]');
    const otsenkaIzbor = forma?.querySelector<HTMLSelectElement>('[name=otsenka]');
    const pokazhi = (): void => {
      if (!sastoyanieIzbor || !otsenkaIzbor) return;
      const zavarsheno = sastoyanieIzbor.value === 'завършено';
      otsenkaIzbor.disabled = zavarsheno;
      otsenkaIzbor.title = zavarsheno
        ? 'Завършеното дело е без оценка — Състоянието решава (И124 т.6).'
        : '';
    };
    sastoyanieIzbor?.addEventListener('change', pokazhi);
    pokazhi();
  }
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
          // Изключеното (disabled) поле не влиза във FormData — а при
          // завършено точно това искаме: празна оценка, не „null".
          otsenka: String(d.get('otsenka') ?? '') as Otsenka,
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
