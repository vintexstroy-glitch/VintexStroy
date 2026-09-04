/**
 * ЧИСТАТА ДИАГРАМА · показаната сметка (И96 т.5 · т.6).
 *
 * Негови думи, дословно: „Има чиста диаграма БЕЗ ТАБЛИЦА, а само показани суми
 * за избрания период от време и стъпката, показани в избраната диаграма на
 * избран коефициент. Всички коефициенти са показани и параметрите от периода…
 * и всички коефициенти изредени с ФОРМУЛАТА НА ЕДИН РЕД, и под нея сметките за
 * периода на параметри и коефициенти."
 *
 * Затова тук диаграмата НЕ е картинка, а сметка, която се вижда:
 *   · горе — периодът, стъпката, коефициентът и ВИДЪТ диаграма;
 *   · в средата — самата диаграма, без нито един ред таблица;
 *   · под нея — ФОРМУЛАТА на един ред и ПАРАМЕТРИТЕ с числата им;
 *   · най-долу — ВСИЧКИТЕ коефициенти за периода, всеки с формулата си.
 *
 * ЧЕТИРИТЕ ВИДА ДИАГРАМА · и кой къде лъже. Той иска „колкото вида има, да се
 * прилагат за всеки един коефициент". Дават се и четирите за всеки — но до
 * онези, които изкривяват, стои ДУМА, вместо да се крие бутонът. Скрит бутон
 * учи човека, че приложението знае по-добре; казана причина го учи защо.
 */

import { gotovitePeriodi } from '../src/domein/dyal-otchet.js';
import { IMENA_NA_TAKTOVETE } from '../src/domein/vreme.js';
import {
  IMENA_NA_VIDOVETE,
  KOEFITSIENTI,
  PRIRAVNYAVANETO,
  STAPKI,
  ZASHTO_PRIRAVNYAVANE,
  danniZaPerioda,
  koefitsient,
  mozheDaSePriravni,
  priravniKamGodina,
  razbiyNaStapki,
  sDumiStoynost,
  smetniKoefitsient,
  danniKamDnes,
  IMENA_NA_REZULTATA,
  IMENA_NA_VREMENATA,
  KAKVO_POKAZVA,
  CHAKA_PERIOD,
  poVreme,
  VIDOVE_REZULTAT,
  zaStapka,
  belezhkaZaStapkata,
  type DanniZaPerioda,
  type Koefitsient,
  type Merka,
  type SmetnatKoefitsient,
  type Stapka,
  type VidRezultat,
} from '../src/domein/koefitsienti.js';
import {
  dumiteNaPostizhkata,
  dyalatVSkalata,
  orientiratNa,
  postignat,
  skalataNaBulleta,
  sveriOrientirite,
} from '../src/domein/orientiri.js';
import { dumataNaPosokata, sparklayn } from '../src/domein/sparklayn.js';
import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './ekranite.js';
import {
  DEYSTVIYA,
  formulata,
  klyuchOtImeto,
  IMENA_NA_DEYSTVIYATA,
  IMENA_NA_VELICHINITE,
  kogatoSeSmyata,
  smetni,
  VELICHINI,
  type DeystvieKoefitsient,
  type SvoyKoefitsient,
  type Velichina,
  PREDSTAVKA_SVOY,
  katoKoefitsient,
  smetniKatoKoefitsient,
} from '../src/domein/svoy-koefitsient.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

/** Четирите вида диаграма · и къде всеки лъже. */
const VIDOVE_DIAGRAMA = ['liniya', 'stalbove', 'ploshtta', 'tochki'] as const;

type VidDiagrama = (typeof VIDOVE_DIAGRAMA)[number];

export const IMENA_NA_DIAGRAMITE: Readonly<Record<VidDiagrama, string>> = Object.freeze({
  liniya: 'линия',
  stalbove: 'стълбове',
  ploshtta: 'площ',
  tochki: 'точки',
});

/**
 * Кога един вид изкривява · празно значи „става".
 *
 * Площта внушава ОБЕМ — сборът под кривата. За отношение (процент, пъти) такъв
 * обем не съществува: 20 % през май и 20 % през юни не правят 40 %.
 */
function kadeLazhe(v: VidDiagrama, m: Merka): string {
  if (v === 'ploshtta' && m !== 'pari') {
    return 'площта внушава сбор под кривата, а отношенията не се сборуват — 20 % и 20 % не правят 40 %';
  }
  if (v === 'tochki') return 'точките показват стойности, но не и че периодите вървят един след друг';
  return '';
}

/** Помни се като ПОГЛЕД, не като факт (ADR-022). */
let ot = chetiEkranno('koef.ot', '');
let doo = chetiEkranno('koef.do', '');
let stapka = chetiEkranno<Stapka>('koef.stapka', 'mesets');
let izbran = chetiEkranno('koef.koefitsient', 'noi');
let vidD = chetiEkranno<VidDiagrama>('koef.diagrama', 'liniya');
let kamGodina = chetiEkranno('koef.godishna', false);
/** ПЪРВОТО от двете падащи менюта (негово, 30.08) · как да видиш резултата. */
let vidR = chetiEkranno<VidRezultat>('koef.rezultat', 'diagrama');
/** Последната дума на Вратата · показва се, не се преглъща (правило 15). */
let greshkaSvoy = '';
/** ЕДИН opId на ЕДНО натискане · нов се вади чак след успешен запис. */
let opIdSvoy = crypto.randomUUID();

/** Подразбираният период · последните дванайсет месеца до днес. */
function podrazbiranPeriod(dnes: string): { ot: string; do: string } {
  const [g, m] = dnes.split('-').map(Number) as [number, number];
  return { ot: `${g - 1}-${String(m).padStart(2, '0')}-01`, do: dnes };
}

export function narisuvayKoefitsientite(o: Ogledalo, dnes: string): string {
  const p = podrazbiranPeriod(dnes);
  const nachalo = ot || p.ot;
  const kraj = doo || p.do;
  /**
   * ВСИЧКИТЕ, И НЕГОВИТЕ (резен 116 · ADR-162). Негово, 03.09 (И135): „Махаш
   * мои коефициенти, махни го глупаво е." Списъкът не зависи от стъпката, а
   * своите стоят до вградените — в менюто, в диаграмата и в таблицата — през
   * СЪЩИЯ рисувач, преведени в неговия вид (`katoKoefitsient`).
   */
  const svoiTuk = zhivite(o);
  const nalichni: readonly Koefitsient[] = [
    ...zaStapka(stapka === 'mesets' ? 'mesets' : 'drug'),
    ...svoiTuk.map(katoKoefitsient),
  ];
  const smetniTuk = (kk: Koefitsient, d: DanniZaPerioda): SmetnatKoefitsient => {
    const svoy = kk.klyuch.startsWith(PREDSTAVKA_SVOY)
      ? svoiTuk.find((x) => PREDSTAVKA_SVOY + x.klyuch === kk.klyuch)
      : undefined;
    return svoy ? smetniKatoKoefitsient(svoy, d) : smetniKoefitsient(kk, d);
  };
  const k = nalichni.find((x) => x.klyuch === izbran) ?? nalichni[0]!;

  const parcheta = kraj >= nachalo ? razbiyNaStapki(nachalo, kraj, stapka) : [];
  const redica = parcheta.map((ch) => ({
    etiket: ch.etiket,
    smetnat: smetniTuk(k, danniZaPerioda(o, ch.ot, ch.do)),
  }));

  // Целият период накуп · за формулата и параметрите под диаграмата.
  const zaTseliya = smetniTuk(k, danniZaPerioda(o, nachalo, kraj));

  return `
    ${sastoyanieto(o, dnes)}
    ${formaNaSvoya()}
    ${lentata(nalichni, svoiTuk, k, nachalo, kraj, dnes)}
    ${diagramata(redica, k)}
    ${podDiagramata(k, zaTseliya, o, nachalo, kraj)}
    ${vsichkite(o, nachalo, kraj, nalichni, parcheta, dnes, smetniTuk)}`;
}

/**
 * ЖИВИТЕ свои коефициенти · махнатите ОСТАВАТ в Огледалото, но не на екрана.
 *
 * Разделянето е ТУК, а не в Огледалото: „нямаше го" и „махнахме го" са различни
 * неща и Журналът трябва да пази второто. Кой се ПОКАЗВА е въпрос на екран.
 */
function zhivite(o: Ogledalo): readonly SvoyKoefitsient[] {
  return [...o.koefitsienti.values()].filter((k) => !k.mahnat);
}

/**
 * ПОКАЗАЛЕЦ за изписването · `sDumiStoynost` иска цял `Koefitsient`, а своят
 * носи само мярка. Вместо втора функция за изписване (второ място, където
 * „12 500" може да стане „125,00 %" по друг начин), се подава най-малкото,
 * което тя чете — и мярката се СМЕНЯ от рецептата.
 */
const POKAZALETS = KOEFITSIENTI[0]!;

/**
 * ФОРМАТА ЗА СВОЙ КОЕФИЦИЕНТ · негово: „Можеш да вкарваш сам коефициенти".
 *
 * Няма поле за „формула" като текст и няма поле за МЯРКА: и двете се СМЯТАТ от
 * избора (правило 17). Човекът избира ДВЕ величини и ЕДНО действие; формулата
 * се сглобява пред очите му, преди да натисне.
 *
 * ВРЕМЕТО също не се пита — то следва от величините. Питано, то би позволило
 * „състояние", в което участва приходът: число, което тихо зависи от прозорец,
 * който никой не е избирал.
 */
function formaNaSvoya(): string {
  return `
    <section class="karta" data-sektsiya="koef-svoy" data-dyal="otchet">
      <div class="dyalglava">
        <h2>Свой коефициент</h2>
        <span>две величини и едно действие · формулата се сглобява сама</span>
      </div>
      <form id="forma-svoy-koef" class="poleta tesni">
        <div class="pole">
          <label for="svoy-ime">Име</label>
          <input translate="no" id="svoy-ime" type="text" maxlength="60" required>
        </div>
        <div class="pole">
          <label for="svoy-gore">Величина А</label>
          <select translate="no" id="svoy-gore">
            ${VELICHINI.map(
              (v) => `<option value="${v}">${ekraniraj(IMENA_NA_VELICHINITE[v])}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="svoy-deystvie">Действие</label>
          <select translate="no" id="svoy-deystvie">
            ${DEYSTVIYA.map(
              (d) => `<option value="${d}">${ekraniraj(IMENA_NA_DEYSTVIYATA[d])}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="svoy-dolu">Величина Б</label>
          <select translate="no" id="svoy-dolu">
            ${VELICHINI.map(
              (v) =>
                `<option value="${v}"${v === 'zadalzheniya_st' ? ' selected' : ''}>${ekraniraj(
                  IMENA_NA_VELICHINITE[v],
                )}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="svoy-kakvo">Какво казва (по избор)</label>
          <input translate="no" id="svoy-kakvo" type="text" maxlength="120">
        </div>
        <button type="submit">Запиши коефициента</button>
      </form>
      <p class="drebno" id="svoy-formulata"></p>
      ${greshkaSvoy === '' ? '' : `<p class="drebno trevozhno" id="svoy-greshka">${ekraniraj(greshkaSvoy)}</p>`}
      <p class="drebno">Мярката и времето НЕ се питат — те следват от избора.
        Записва се рецептата, не резултатът: стойността се смята всеки път наново.</p>
    </section>`;
}

/**
 * СЪСТОЯНИЕТО · коефициентите, които имат число ПО ВСЯКО ВРЕМЕ.
 *
 * Негово, 30.08, дословно: „Показваш всички коефициенти и без графика, по
 * всяко време, които са налични и **не са за период**. Тези за период седят и
 * чакат да вкараш период и да покаже избрания резултат."
 *
 * Затова тук няма нито диаграма, нито период: това са СНИМКИ към днес. А под
 * тях стои какво ЧАКА — поименно, не като празно място. Скрит коефициент учи
 * човека, че го няма; казана причина го учи какво да направи (правило 15).
 *
 * Формулата стои до всяко число, както при останалите: „Всеки коефициент има
 * формула с нужните данни и ти ги събираш, показваш данните участващи във
 * формулите." Число без формула е усещане с цифра пред себе си.
 */
function sastoyanieto(o: Ogledalo, dnes: string): string {
  const d = danniKamDnes(o, dnes);
  const chakat = poVreme('period');
  const svoi = zhivite(o).filter((k) => kogatoSeSmyata(k) === 'sastoyanie');
  return `
    <section class="karta" data-sektsiya="koef-sastoyanie" data-dyal="otchet">
      <div class="dyalglava">
        <h2>${ekraniraj(IMENA_NA_VREMENATA.sastoyanie)}</h2>
        <span>без период и без графика · ${poVreme('sastoyanie').length} на брой</span>
      </div>
      <div class="otcheti">
        ${poVreme('sastoyanie')
          .map((k) => {
            const s = smetniKoefitsient(k, d);
            return `
          <article class="pole-otchet" data-sastoyanie="${ekraniraj(k.klyuch)}">
            <div class="glavata">
              <span class="etiket">${ekraniraj(k.ime)}</span>
              <span class="chislo" translate="no">${ekraniraj(sDumiStoynost(s, pishi))}</span>
            </div>
            <p class="kakvo">${ekraniraj(k.kakvo)}</p>
            <ul class="formula" translate="no">
              <li><span class="ime">${ekraniraj(k.formula)}</span></li>
              ${s.parametri
                .map(
                  (x) => `<li>
                <span class="ime">${ekraniraj(x.ime)}</span>
                <span class="suma">${ekraniraj(
                  sDumiStoynost(
                    { koefitsient: { ...k, merka: x.merka }, stoynost: x.stoynost, zashto: '', parametri: [] },
                    pishi,
                  ),
                )}</span>
              </li>`,
                )
                .join('')}
            </ul>
            ${
              s.zashto === ''
                ? '<p class="drebno palno">Числото е пълно — нищо не липсва.</p>'
                : `<p class="drebno chaka">${ekraniraj(s.zashto)}</p>`
            }
          </article>`;
          })
          .join('')}
        ${svoi
          .map((k) => {
            const s = smetni(k, d);
            return `
          <article class="pole-otchet svoy" data-svoy="${ekraniraj(k.klyuch)}">
            <div class="glavata">
              <span class="etiket">${ekraniraj(k.ime)}</span>
              <span class="chislo" translate="no">${ekraniraj(
                sDumiStoynost(
                  { koefitsient: { ...POKAZALETS, merka: s.merka }, stoynost: s.stoynost, zashto: '', parametri: [] },
                  pishi,
                ),
              )}</span>
            </div>
            <p class="kakvo">${ekraniraj(k.kakvo === '' ? 'свой коефициент' : k.kakvo)}</p>
            <ul class="formula" translate="no">
              <li><span class="ime">${ekraniraj(formulata(k))}</span></li>
            </ul>
            ${
              s.zashto === ''
                ? '<p class="drebno palno">Числото е пълно — нищо не липсва.</p>'
                : `<p class="drebno chaka">${ekraniraj(s.zashto)}</p>`
            }
            <button type="button" class="vtorichen" data-mahni-svoy="${ekraniraj(k.klyuch)}">Махни</button>
          </article>`;
          })
          .join('')}
      </div>
      <p class="drebno" data-chakat-period="${chakat.length}">Другите ${chakat.length}
        ${ekraniraj(CHAKA_PERIOD)} и стоят по-долу: ${chakat.map((k) => ekraniraj(k.ime)).join(' · ')}.</p>
    </section>`;
}

function lentata(
  nalichni: readonly Koefitsient[],
  svoiTuk: readonly SvoyKoefitsient[],
  k: Koefitsient,
  nachalo: string,
  kraj: string,
  dnes: string,
): string {
  const lazhe = kadeLazhe(vidD, k.merka);
  return `
    <section class="karta" data-sektsiya="koef-izbor" data-dyal="otchet">
      <div class="dyalglava">
        <h2>Коефициентите</h2>
        <span>чиста диаграма · без нито един ред таблица</span>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="koef-ot">От</label>
          <input translate="no" id="koef-ot" type="date" value="${ekraniraj(nachalo)}">
        </div>
        <div class="pole">
          <label for="koef-do">До</label>
          <input translate="no" id="koef-do" type="date" value="${ekraniraj(kraj)}">
        </div>
        <div class="pole">
          <label for="koef-stapka">Стъпка</label>
          <select translate="no" id="koef-stapka">
            ${STAPKI.map(
              (s) =>
                `<option value="${s}"${s === stapka ? ' selected' : ''}>${IMENA_NA_TAKTOVETE[s]}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="koef-koefitsient">Коефициент</label>
          <select translate="no" id="koef-koefitsient">
            ${nalichni
              .map(
                (x) =>
                  `<option value="${ekraniraj(x.klyuch)}"${x.klyuch === k.klyuch ? ' selected' : ''}>${ekraniraj(x.ime)}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label for="koef-rezultat">Как да видиш резултата</label>
          <select translate="no" id="koef-rezultat">
            ${VIDOVE_REZULTAT.map(
              (v) =>
                `<option value="${v}"${v === vidR ? ' selected' : ''}>${IMENA_NA_REZULTATA[v]}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="pole">
          <label for="koef-diagrama">Вид диаграма</label>
          <select translate="no" id="koef-diagrama">
            ${VIDOVE_DIAGRAMA.map(
              (v) =>
                `<option value="${v}"${v === vidD ? ' selected' : ''}>${IMENA_NA_DIAGRAMITE[v]}</option>`,
            ).join('')}
          </select>
        </div>
      </div>
      ${
        /* ГОТОВИТЕ ПЕРИОДИ (резен 74) · „Да се добавят и бутони за избор на
           готов период от време" (р75·[64]). Смятат се от днес — закован
           период остарява с календара. */ ''
      }
      <p class="drebno">Готов период:
        ${gotovitePeriodi(dnes)
          .map(
            (g) =>
              `<button type="button" class="reden" data-gotov-period="${ekraniraj(g.klyuch)}"
                data-ot="${ekraniraj(g.ot)}" data-do="${ekraniraj(g.do)}">${ekraniraj(g.ime)}</button>`,
          )
          .join(' ')}
      </p>
      ${
        /* НИЩО НЕ СЕ КРИЕ ПО СТЪПКА (И135 · ADR-162): месечните по природа стоят
           при всяка стъпка, а природата им се КАЗВА до числото. Дотук при друга
           стъпка те изчезваха — „Махаш мои коефициенти, махни го глупаво е." */ ''
      }
      <p class="drebno" data-mesechnite="${nalichni.filter((x) => x.samoMesechen).length}">Месечните по природа
        (${nalichni.filter((x) => x.samoMesechen).map((x) => ekraniraj(x.ime)).join(' · ')}) се показват при
        всяка стъпка${stapka === 'mesets' ? '' : ` — при „${ekraniraj(IMENA_NA_TAKTOVETE[stapka])}" до тях стои бележка, че са сметнати за цялото парче`}.
        Своите коефициенти стоят в менюто и в таблицата до вградените (${svoiTuk.length} на брой).</p>
      <p class="drebno" id="kakvo-pokazva">${ekraniraj(IMENA_NA_REZULTATA[vidR])} · ${ekraniraj(KAKVO_POKAZVA[vidR])}</p>
      ${lazhe ? `<p class="drebno trevozhno" id="kade-lazhe">⚠ ${ekraniraj(lazhe)}</p>` : ''}
      <label class="vazm">
        <input type="checkbox" id="koef-godishna"${kamGodina ? ' checked' : ''}${
          mozheDaSePriravni(k) ? '' : ' disabled'
        }>
        <span class="vazm-tyalo"><b>Приравнено към ГОДИНА</b><span id="zashto-priravnyavane">${ekraniraj(
          ZASHTO_PRIRAVNYAVANE[PRIRAVNYAVANETO[k.vid]],
        )}</span></span>
      </label>
    </section>`;
}

/** Височината на графиката · закована, за да не подскача при смяна. */
/**
 * СПАРКЛАЙНЪТ е МАЛЪК нарочно (резен 35) · той стои ВЪТРЕ в реда, до числото.
 * Порасне ли, става диаграма и си иска ос, етикети и нула — а тогава вече не е
 * спарклайн.
 */
const SPARK_SHIRINA = 64;
const SPARK_VIS = 16;

const VIS = 200;
const GNEZDO = 46;

/**
 * САМАТА ДИАГРАМА · без таблица под нея, както той я поиска.
 *
 * Нулата е ВИНАГИ на осата, дори когато всички стойности са положителни:
 * диаграма, отрязана над нулата, прави дребна разлика да изглежда огромна.
 */
function diagramata(
  redica: readonly { etiket: string; smetnat: SmetnatKoefitsient }[],
  k: Koefitsient,
): string {
  const sChisla = redica.filter((r) => r.smetnat.stoynost !== undefined);
  if (sChisla.length === 0) {
    return `<section><p class="prazno">За този период „${ekraniraj(k.ime)}" няма стойност.<br>${ekraniraj(
      redica[0]?.smetnat.zashto ?? 'Няма данни в избрания период.',
    )}</p></section>`;
  }

  const stoynosti = sChisla.map((r) => godishna(r.smetnat, k));
  const gore = Math.max(0, ...stoynosti);
  const dolu = Math.min(0, ...stoynosti);
  const razmah = gore - dolu || 1;
  const shirina = redica.length * GNEZDO + 40;
  const y = (v: number): number => VIS - ((v - dolu) / razmah) * VIS;
  const x = (i: number): number => 20 + i * GNEZDO + GNEZDO / 2;

  const tochki = redica
    .map((r, i) => (r.smetnat.stoynost === undefined ? '' : `${x(i)},${y(godishna(r.smetnat, k))}`))
    .filter((t) => t !== '')
    .join(' ');

  const telo = (): string => {
    switch (vidD) {
      case 'stalbove':
        return redica
          .map((r, i) => {
            if (r.smetnat.stoynost === undefined) return '';
            const v = godishna(r.smetnat, k);
            const gy = Math.min(y(v), y(0));
            return `<rect class="koef-stalb" x="${x(i) - 14}" y="${gy}" width="28" height="${Math.max(1, Math.abs(y(v) - y(0)))}"><title>${ekraniraj(r.etiket)}</title></rect>`;
          })
          .join('');
      case 'ploshtta':
        return `<polygon class="koef-plosht" points="${x(0)},${y(0)} ${tochki} ${x(redica.length - 1)},${y(0)}"></polygon>
                <polyline class="koef-liniya" points="${tochki}"></polyline>`;
      case 'tochki':
        return redica
          .map((r, i) =>
            r.smetnat.stoynost === undefined
              ? ''
              : `<circle class="koef-tochka" cx="${x(i)}" cy="${y(godishna(r.smetnat, k))}" r="5"><title>${ekraniraj(r.etiket)}</title></circle>`,
          )
          .join('');
      case 'liniya':
        return `<polyline class="koef-liniya" points="${tochki}"></polyline>${redica
          .map((r, i) =>
            r.smetnat.stoynost === undefined
              ? ''
              : `<circle class="koef-tochka" cx="${x(i)}" cy="${y(godishna(r.smetnat, k))}" r="3.5"><title>${ekraniraj(r.etiket)}</title></circle>`,
          )
          .join('')}`;
    }
  };

  return `
    <section>
      <div class="tablitsa bez-ramka">
        <svg class="koef-diagrama" viewBox="0 0 ${shirina} ${VIS + 34}" width="${shirina}" height="${VIS + 34}"
             role="img" aria-label="Диаграма на ${ekraniraj(k.ime)}">
          <line class="koef-nula" x1="12" y1="${y(0)}" x2="${shirina - 8}" y2="${y(0)}"></line>
          ${telo()}
          ${redica
            .map(
              (r, i) =>
                `<text class="koef-etiket" x="${x(i)}" y="${VIS + 24}" text-anchor="middle">${ekraniraj(r.etiket)}</text>`,
            )
            .join('')}
        </svg>
      </div>
      <p class="drebno">Нулата стои на осата винаги — диаграма, отрязана над нулата, прави дребна разлика да изглежда огромна.</p>
    </section>`;
}

/** Стойността, приравнена при нужда · тук е ЕДИНСТВЕНОТО място, което я мени. */
function godishna(s: SmetnatKoefitsient, k: Koefitsient): number {
  if (s.stoynost === undefined) return 0;
  if (!kamGodina || !mozheDaSePriravni(k)) return s.stoynost;
  try {
    return priravniKamGodina(s, 1);
  } catch {
    return s.stoynost;
  }
}

/** ФОРМУЛАТА на един ред и ПАРАМЕТРИТЕ под нея · дословно негово искане. */
function podDiagramata(
  k: Koefitsient,
  s: SmetnatKoefitsient,
  _o: Ogledalo,
  nachalo: string,
  kraj: string,
): string {
  return `
    <section class="karta" data-sektsiya="koef-izbraniyat" data-dyal="otchet">
      <div class="dyalglava">
        <h2>${ekraniraj(k.ime)}</h2>
        <span>${ekraniraj(IMENA_NA_VIDOVETE[k.vid])}</span>
      </div>
      <p class="koef-formula" id="formulata" translate="no"><b>${ekraniraj(k.formula)}</b></p>
      <p>${ekraniraj(k.kakvo)}${k.obichayno ? ` <b>Обичайно: ${ekraniraj(k.obichayno)}.</b>` : ''}</p>
      <div class="tablitsa" data-tablitsa="koef-parametri">
        <div class="glava koef-parametar"><span>Параметър за ${ekraniraj(nachalo)} → ${ekraniraj(kraj)}</span><span class="suma">Стойност</span></div>
        ${s.parametri
          .map(
            (x) => `<div class="red koef-parametar" translate="no">
          <span>${ekraniraj(x.ime)}</span>
          <span class="suma">${x.merka === 'pari' ? pishi(x.stoynost) : String(x.stoynost)}</span>
        </div>`,
          )
          .join('')}
        <div class="red koef-parametar koef-rezultat" translate="no">
          <span><b>${ekraniraj(k.ime)}</b></span>
          <span class="suma" data-koef-stoynost="${s.stoynost ?? ''}"><b>${ekraniraj(sDumiStoynost(s, pishi))}</b></span>
        </div>
      </div>
      ${s.zashto ? `<p class="drebno trevozhno">${ekraniraj(s.zashto)}</p>` : ''}
    </section>`;
}

/** ВСИЧКИТЕ коефициенти за периода · всеки с формулата си на един ред. */
function vsichkite(
  o: Ogledalo,
  nachalo: string,
  kraj: string,
  nalichni: readonly Koefitsient[],
  /**
   * ПАРЧЕТАТА на периода · оттук идват спарклайните (резен 35).
   *
   * Подават се ГОТОВИ, а не се режат втори път тук: `narisuvayKoefitsientite`
   * вече ги е нарязал за голямата диаграма, и второ рязане би могло да се
   * разсинхронизира с първото при първата поправка на стъпката (правило 17).
   */
  parcheta: readonly { readonly ot: string; readonly do: string; readonly etiket: string }[],
  dnes: string,
  smetniTuk: (k: Koefitsient, d: DanniZaPerioda) => SmetnatKoefitsient,
): string {
  const d = danniZaPerioda(o, nachalo, kraj);
  // ДАННИТЕ ЗА ВСЯКО ПАРЧЕ · веднъж за всички коефициенти, не веднъж на ред.
  // Смятани в цикъла по коефициенти, те щяха да се прочитат 12 пъти за един
  // и същ период — същата сметка, дванайсет пъти (ADR-084).
  const poParcheta = parcheta.map((ch) => danniZaPerioda(o, ch.ot, ch.do));
  const sv = sveriOrientirite(dnes);
  return `
    <section data-sektsiya="koef-vsichki" data-dyal="otchet">
      <div class="dyalglava">
        <h2>Всички коефициенти за периода</h2>
        <span>формулата на един ред · и числото до нея</span>
      </div>
      <div class="tablitsa" data-tablitsa="koef-vsichki">
        <div class="glava koef-red"><span>Коефициент</span><span>Формула</span><span>Посока</span><span class="suma">Стойност</span><span>Спрямо обичайното</span><span>На годишна база</span></div>
        ${nalichni
          .map((k) => {
            const s = smetniTuk(k, d);
            const kak = PRIRAVNYAVANETO[k.vid];
            const redica = poParcheta.map((dd) => smetniTuk(k, dd).stoynost);
            const belezhka = belezhkaZaStapkata(k, stapka);
            const eSvoy = k.klyuch.startsWith(PREDSTAVKA_SVOY);
            return `<div class="red koef-red" data-koef="${ekraniraj(k.klyuch)}" translate="no">
            <span class="kletka"><b>${ekraniraj(k.ime)}${eSvoy ? ' <span class="znachka tiha" data-svoy-v-tablitsata>свой</span>' : ''}</b><span>${ekraniraj(k.kakvo)}</span>${
              belezhka === '' ? '' : `<span class="drebno" data-mesechen-po-priroda>${ekraniraj(belezhka)}</span>`
            }</span>
            <span class="koef-formula">${ekraniraj(k.formula)}</span>
            <span>${sparklaynat(redica, k)}</span>
            <span class="suma">${ekraniraj(sDumiStoynost(s, pishi))}</span>
            <span>${bulletat(k, s.stoynost)}</span>
            <span><span class="znachka ${kak === 'mnozhi' ? 'dobre' : 'tiha'}">${
              kak === 'mnozhi' ? 'да' : kak === 'nenuzhno' ? 'не трябва' : 'не може'
            }</span></span>
          </div>`;
          })
          .join('')}
      </div>
      <p class="drebno">Колоната „на годишна база" не е настройка, а свойство: сума се приравнява, отношение на два потока вече не зависи от периода, а отношение на два запаса е снимка в един миг.</p>
      <p class="drebno">Линията показва ПОСОКАТА по стъпките, не числата — затова числото стои до нея.
      Лентата отдясно мери стойността срещу обичайното за занаята; шест от ${KOEFITSIENTI.length} имат такова число,
      а на останалите занаятът не дава едно за всички и празното е ЧЕСТНО.</p>
      <p class="drebno" data-orientiri-sverka>Сверка вход↔изход: ${sv.vhod} изречения → ${sv.izhod} числа,
      разлика ${sv.razlika}.</p>
    </section>`;
}

/**
 * СПАРКЛАЙНЪТ на един ред · формата на редицата, без ос и без етикети.
 *
 * Ширината и височината са ЗАКОВАНИ и малки нарочно: спарклайнът стои ВЪТРЕ в
 * реда, до числото. Порасне ли, той става диаграма и си иска ос.
 */
function sparklaynat(stoynosti: readonly (number | undefined)[], k: Koefitsient): string {
  const sp = sparklayn(stoynosti, SPARK_SHIRINA, SPARK_VIS);
  const dumi = dumataNaPosokata(sp);
  if (sp.tochki.length === 0) {
    return `<span class="drebno" data-spark="${ekraniraj(k.klyuch)}" data-posoka="nyama">${ekraniraj(dumi)}</span>`;
  }
  return `<span class="spark-kutiya" data-spark="${ekraniraj(k.klyuch)}" data-posoka="${sp.posoka}"
    data-stapki="${sp.sChisla}" title="${ekraniraj(`${k.ime} · ${dumi}`)}">
    <svg class="spark" viewBox="0 0 ${SPARK_SHIRINA} ${SPARK_VIS}" width="${SPARK_SHIRINA}" height="${SPARK_VIS}"
         role="img" aria-label="${ekraniraj(`${k.ime} · ${dumi}`)}">
      ${
        sp.tochki.length === 1
          ? `<circle class="spark-tochka" cx="${sp.tochki[0]!.x}" cy="${sp.tochki[0]!.y}" r="2"></circle>`
          : `<polyline class="spark-liniya" points="${sp.patyat}"></polyline>`
      }
    </svg>
    <span class="drebno">${ekraniraj(dumi)}</span>
  </span>`;
}

/**
 * BULLET · стойността срещу обичайното за занаята.
 *
 * Числото на целта идва ОБЯВЕНО (`orientiri.ts`), не разчетено от изречението:
 * разчитане на „1,25 – 1,50" работи, докато някой не напише „около 1,3".
 *
 * Коефициент без обичайно число НЕ получава лента и го КАЗВА (правило 15).
 * Празна лента щеше да значи „нула", а нулата тук е цел, каквато никой не е дал.
 */
function bulletat(k: Koefitsient, stoynost: number | undefined): string {
  const o = orientiratNa(k.klyuch);
  const p = postignat(k.klyuch, stoynost);
  if (o === undefined || stoynost === undefined) {
    return `<span class="drebno" data-bullet="${ekraniraj(k.klyuch)}" data-postizhka="${p}">${ekraniraj(
      dumiteNaPostizhkata(p),
    )}</span>`;
  }
  const dyal = (v: number) => dyalatVSkalata(k.klyuch, stoynost, v) * 100;
  return `<span class="bullet-kutiya" data-bullet="${ekraniraj(k.klyuch)}" data-postizhka="${p}"
    title="${ekraniraj(
      `${k.obichayno} · ${dumiteNaPostizhkata(p)} · лентата стига до ${krayatNaSkalata(k, stoynost)}`,
    )}">
    <span class="bullet" role="img" aria-label="${ekraniraj(`${k.ime} · ${dumiteNaPostizhkata(p)}`)}">
      <span class="bullet-tsel" data-ot="${dyal(o.ot)}" data-do="${dyal(o.do_)}"></span>
      <span class="bullet-stoynost ${p === 'v-tsel' ? 'v-tsel' : 'vun'}" data-dyal="${dyal(stoynost)}"></span>
    </span>
    <span class="drebno">${ekraniraj(k.obichayno)}</span>
  </span>`;
}

/**
 * КРАЯТ НА СКАЛАТА · казва се, защото лента без край не се чете.
 *
 * Изписва се с мярката на коефициента (`sDumiStoynost`), не като голо число:
 * „10 000" за 100 % е вярната стойност и невярното изречение.
 */
function krayatNaSkalata(k: Koefitsient, stoynost: number | undefined): string {
  const skala = skalataNaBulleta(k.klyuch, stoynost);
  return sDumiStoynost({ koefitsient: k, stoynost: skala, zashto: '', parametri: [] }, pishi);
}

/**
 * ДЯЛОВЕТЕ НА BULLET-А СЕ СЛАГАТ ОТ JS, не с `style="…"` в разметката.
 *
 * Строгата политика (CSP `default-src 'self'`) блокира inline стил, и това е
 * правилно: нищо чуждо в пакета, включително стил, дошъл от низ (правило 10).
 * Писането през CSSOM (`style.setProperty`) НЕ е inline стил и минава.
 *
 * Дословно същият капан, вече платен веднъж при отстъпа на подделата —
 * атрибутът просто не се прилагаше и никой не виждаше защо (`gant.ts` · резен 12б).
 */
function slozhiDyalovete(koren: HTMLElement): void {
  for (const el of koren.querySelectorAll<HTMLElement>('.bullet-tsel')) {
    el.style.setProperty('--ot', `${el.dataset['ot'] ?? 0}%`);
    el.style.setProperty('--do', `${el.dataset['do'] ?? 0}%`);
  }
  for (const el of koren.querySelectorAll<HTMLElement>('.bullet-stoynost')) {
    el.style.setProperty('--dyal', `${el.dataset['dyal'] ?? 0}%`);
  }
}

export function zakachiKoefitsientite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  slozhiDyalovete(koren);
  zakachiSvoya(koren, k, prerisuvay);

  const vrazhi = (id: string, kam: (v: string) => void) => {
    koren.querySelector<HTMLInputElement | HTMLSelectElement>(id)?.addEventListener(
      'change',
      async (e) => {
        kam((e.target as HTMLInputElement).value);
        await prerisuvay();
      },
    );
  };

  vrazhi('#koef-ot', (v) => {
    ot = v;
    zapomniEkranno('koef.ot', ot);
  });
  vrazhi('#koef-do', (v) => {
    doo = v;
    zapomniEkranno('koef.do', doo);
  });
  vrazhi('#koef-stapka', (v) => {
    stapka = v as Stapka;
    zapomniEkranno('koef.stapka', stapka);
  });
  vrazhi('#koef-koefitsient', (v) => {
    izbran = v;
    zapomniEkranno('koef.koefitsient', izbran);
  });
  vrazhi('#koef-diagrama', (v) => {
    vidD = v as VidDiagrama;
    zapomniEkranno('koef.diagrama', vidD);
  });
  vrazhi('#koef-rezultat', (v) => {
    vidR = v as VidRezultat;
    zapomniEkranno('koef.rezultat', vidR);
  });

  koren.querySelector<HTMLInputElement>('#koef-godishna')?.addEventListener('change', async (e) => {
    kamGodina = (e.target as HTMLInputElement).checked;
    zapomniEkranno('koef.godishna', kamGodina);
    await prerisuvay();
  });

  // ГОТОВИЯТ ПЕРИОД (резен 74 · р75·[64]) · един натиск слага От и До.
  for (const buton of koren.querySelectorAll<HTMLButtonElement>('[data-gotov-period]')) {
    buton.addEventListener('click', async () => {
      ot = buton.dataset['ot'] ?? '';
      doo = buton.dataset['do'] ?? '';
      zapomniEkranno('koef.ot', ot);
      zapomniEkranno('koef.do', doo);
      await prerisuvay();
    });
  }
}


/**
 * ЗАКАЧАНЕТО НА СВОЯ · формата, живата формула и махането.
 *
 * ЖИВАТА ФОРМУЛА се сглобява при всяка смяна на избор — човекът вижда какво ще
 * запише, ПРЕДИ да натисне. Форма, която показва резултата си чак след записа,
 * учи да се натиска и да се гледа.
 *
 * КЛЮЧЪТ СЕ СВЕЖДА ОТ ИМЕТО, не се пита: две полета за едно нещо са две места,
 * където може да се разминат. Същото име = същият коефициент, тоест ПОПРАВКА.
 */
function zakachiSvoya(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  const chetiFormata = (): SvoyKoefitsient | undefined => {
    const vzemi = (id: string): string =>
      koren.querySelector<HTMLInputElement | HTMLSelectElement>(id)?.value ?? '';
    const ime = vzemi('#svoy-ime').trim();
    if (ime === '') return undefined;
    return {
      klyuch: klyuchOtImeto(ime),
      ime,
      gore: vzemi('#svoy-gore') as Velichina,
      dolu: vzemi('#svoy-dolu') as Velichina,
      deystvie: vzemi('#svoy-deystvie') as DeystvieKoefitsient,
      kakvo: vzemi('#svoy-kakvo').trim(),
      mahnat: false,
    };
  };

  const pokazhiFormulata = (): void => {
    const red = koren.querySelector<HTMLElement>('#svoy-formulata');
    if (!red) return;
    const nov = chetiFormata();
    red.textContent = nov === undefined ? 'Дай име, за да се сглоби формулата.' : formulata(nov);
  };
  pokazhiFormulata();
  for (const znak of ['#svoy-ime', '#svoy-gore', '#svoy-dolu', '#svoy-deystvie']) {
    koren.querySelector(znak)?.addEventListener('input', pokazhiFormulata);
    koren.querySelector(znak)?.addEventListener('change', pokazhiFormulata);
  }

  koren.querySelector<HTMLFormElement>('#forma-svoy-koef')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nov = chetiFormata();
    if (nov === undefined) {
      greshkaSvoy = 'Коефициентът иска име.';
      await prerisuvay();
      return;
    }
    try {
      await k.deystviya.zapishiKoefitsient(nov, { opId: `koef:${opIdSvoy}` });
      opIdSvoy = crypto.randomUUID();
      greshkaSvoy = '';
    } catch (err) {
      greshkaSvoy = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  // МАХАНЕТО Е ЗАПИС · същият ключ, `mahnat: true`, нов `opId`. Върнатият после
  // коефициент е СЪЩИЯТ, не нов — затова ключът не се пипа.
  for (const but of koren.querySelectorAll<HTMLButtonElement>('[data-mahni-svoy]')) {
    but.addEventListener('click', async () => {
      const klyuch = but.dataset['mahniSvoy'] ?? '';
      const sega = (await k.deystviya.ogledalo()).koefitsienti.get(klyuch);
      if (sega === undefined) return;
      try {
        await k.deystviya.zapishiKoefitsient(
          { ...sega, mahnat: true },
          { opId: `koef-mahni:${klyuch}:${crypto.randomUUID()}` },
        );
        greshkaSvoy = '';
      } catch (err) {
        greshkaSvoy = dumiZaGreshka(err);
      }
      await prerisuvay();
    });
  }
}
