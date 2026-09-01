/**
 * ТАБЛИЦА ОТ ФАЙЛ · експериментът с Фактури (резен 21 · ADR-081).
 *
 * Негови думи, дословно:
 *
 *   „Знам за фактури, нека тъкмо направим с тази таблица експеримента за
 *    създаване на таблица с качване в папката, с която работи таблицата, и от
 *    там я чете и създава вътре… Дали с формули или без формули. Ако може с
 *    копирани формули, ако не може само структура на таблица с числа и
 *    допълнително вътре се правят формулите от стопанина."
 *
 * ═══ ТРИТЕ СТЪПКИ, И ЧОВЕКЪТ Е МЕЖДУ ВТОРАТА И ТРЕТАТА ═══
 *
 *   1. избира файл от папката, с която таблицата работи;
 *   2. вижда ПРЕДЛОЖЕНИЕ — колони, видове, кои формули са дошли и кои НЕ, с
 *      причината до всяка;
 *   3. потвърждава, и чак тогава се пише (правило 18).
 *
 * ═══ КАКВО НЕ ПРАВИ ═══
 *
 * НЕ качва нищо. Файлът остава в неговата папка; в Журнала влиза моделът на
 * главата и ОТПЕЧАТЪКЪТ на файла (ADR-073). „Папката" е ИМЕ, не директория
 * (правило 20) — затова всичко работи и на телефон, и без мрежа.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { tablitsiSFormuli } from '../src/iztochnik/chetetsat.js';
import {
  redatNaGlavata,
  predlozhiTablitsa,
  sDumi,
  type PredlozhenieZaTablitsa,
} from '../src/domein/tablitsa-ot-fayl.js';
import { imeNaDeystvie } from '../src/domein/formuli.js';
import { IMENA_NA_VIDOVETE_STOYNOST, VIDOVE_STOYNOST, type VidStoynost } from '../src/domein/vid-stoynost.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import type { Konteks } from './ekranite.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';
import { podgotviVnos } from '../src/domein/vnos-na-redove.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';
import type { RedNaTablitsa } from '../src/domein/redove-na-tablitsa.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { kakvoPishe, otSuma, stotinki } from '../src/yadro/pari.js';
import { redoveVObshtataGlava, sborNaObshtaKolona } from '../src/domein/obshta-glava.js';
import { ZASHTO_I_NULATA } from '../src/yadro/sverka.js';
import {
  redovete,
  sborNaKolona,
  sveriRedovete,
  vidaNaKolonata,
  zatvorenaE,
} from '../src/domein/redove-na-tablitsa.js';
import { parichniteKoloni, razrezPoKolona, sveriRazreza } from '../src/domein/razrez.js';
import { rollupPoZakachki, sveriRollup } from '../src/domein/rollup.js';

/** Каквото е прочетено, докато човекът не потвърди · нула събития дотогава. */
let predlozhenie: PredlozhenieZaTablitsa | undefined;
let formulite: ReadonlyMap<number, string> = new Map();

/**
 * ВИДЪТ, ПОПРАВЕН С РЪКА · последната дума е на човека, не на разпознавача.
 *
 * В неговия файл цените са ГОЛИ ЧИСЛА („147800"), без знак и без стотинки —
 * разпознавачът ги чете като „число" и те не влизат в нито един сбор пари.
 * Позна ли се грешно, поправката трябва да е тук, ПРЕДИ записа: сменен вид
 * след това би преоценил вече записани числа.
 */
const vidoveOtRaka = new Map<number, VidStoynost>();
let imeNaFayla = '';
let otpechatakNaFayla = '';
let greshka = '';

/** ЗАЩО формули не са дошли · празно значи, че са дошли (правило 15). */
let bezFormuli = '';

/**
 * ПРОЧЕТЕНИЯТ лист · пази се, за да влязат и РЕДОВЕТЕ, не само главата.
 *
 * Дотук предложението се прибираше след потвърждението и данните умираха с
 * него: човек създаваше таблицата, а после въвеждаше 120-те ѝ реда на ръка.
 */
let prochetenList: Tablitsa | undefined;
let zaVnos = '';

/** НА КОЙ РЕД Е ГЛАВАТА · познато от файла, но последната дума е негова. */
let redNaGlavata = 0;

/** КОЯ създадена таблица гледам · памет на екрана, не факт (ADR-022). */
let izbranaTablitsa = '';

/** ПО КОЯ колона е разрезът · празно значи „без разрез" (резен 59). */
let razrezPo = '';

/** ОТ КОЯ таблица събира rollup-ът · празно значи „без" (резен 88). */
let rollupOt = '';

/** КОЯ парична колона на извора събира rollup-ът. */
let rollupKolona = '';

export function blokNaTablitsaOtFayl(o: Ogledalo): string {
  return `
    <section data-sektsiya="tablitsa-ot-fayl">
      <div class="dyalglava">
        <h2>Таблица от файл</h2>
        <span>чете качената · създава вътрешната</span>
      </div>

      <p class="drebno"><b>Файлът НЕ се качва тук.</b> Той стои в папката, с
      която таблицата работи; програмата го ЧЕТЕ и в Журнала влиза моделът на
      главата плюс отпечатъка му — име, големина, час, sha256 — не байтовете
      (ADR-073).</p>

      <div class="redditsa">
        <button type="button" id="izbor-tablitsa-fayl">Прочети таблица от папката</button>
        <input translate="no" type="file" id="fayl-tablitsa" accept=".xlsx,.xlsb,.csv" hidden>
      </div>
      <p class="greshka" id="greshka-tablitsa-fayl">${ekraniraj(greshka)}</p>
      ${bezFormuli === '' ? '' : `<p class="drebno" id="bez-formuli">${ekraniraj(bezFormuli)}</p>`}

      ${
        predlozhenie === undefined
          ? ''
          : `<div class="poleta tesni">
          <div class="pole">
            <label for="red-na-glavata">Главата е на ред</label>
            <input translate="no" id="red-na-glavata" type="number" min="1" value="${redNaGlavata + 1}"
                   class="tesen" inputmode="numeric">
          </div>
          <p class="drebno">Познато от файла. Смени го, ако главата стои другаде — всичко
          под нея са данни.</p>
        </div>`
      }
      ${predlozhenie === undefined ? '' : predlozhenieto(predlozhenie)}
    </section>
    ${blokNaSazdadenite(o)}${blokNaSemeystvataKatoEdna(o)}`;
}

/**
 * СЕМЕЙСТВОТО КАТО ЕДНА ТАБЛИЦА (резен 87 · И126 · ADR-145).
 *
 * Дългът от `docs/10`: „сборовете на общата глава на екрана —
 * `sborNaObshtaKolona` е построен и проверен, но екран още няма." Тук е
 * екранът: редовете на ВСИЧКИ таблици от едно живо семейство, преведени към
 * ОБЩАТА глава (ADR-116), със сбор на всяка парична обща колона и сверка
 * вход↔изход, казана и на нула (правило 7).
 *
 * Без нито едно живо семейство секцията НЕ се ражда: тя няма предмет, а не
 * изключена отметка — същото решение като при празните групи (ADR-045).
 */
function blokNaSemeystvataKatoEdna(o: Ogledalo): string {
  const zhivi = [...o.semeystvataNaGlavite.values()].filter((s) => !s.mahnato);
  if (zhivi.length === 0) return '';
  return `
    <section data-sektsiya="semeystvo-kato-edna">
      <div class="dyalglava">
        <h2>Семейството като ЕДНА таблица</h2>
        <span>редовете на всички таблици от семейството · през общата глава</span>
      </div>
      ${zhivi.map((s) => ednoSemeystvoKatoTablitsa(s, o)).join('')}
    </section>`;
}

function ednoSemeystvoKatoTablitsa(
  s: { readonly klyuch: string; readonly tablitsi: readonly string[]; readonly koloni: readonly string[]; readonly kartata: Readonly<Record<string, Readonly<Record<string, string>>>> },
  o: Ogledalo,
): string {
  const ch = redoveVObshtataGlava({ tablitsi: s.tablitsi, kartata: s.kartata }, o.redoveNaTablitsi);
  const nomera = s.koloni.map((_, i) => String(i));
  // ПАРИЧНА е общата колона, в която поне един ред носи пари: видът при
  // семейството се вижда от данните на превода, защото общата глава е ИМЕНА,
  // а видовете живеят по таблиците (ADR-014 не пада — сборът събира само
  // `pari_st`, тоест само каквото ВСЯКА таблица е обявила за пари).
  const parichni = new Set(nomera.filter((k) => ch.redove.some((r) => r.pari_st[k] !== undefined)));
  const kletka = (r: (typeof ch.redove)[number], k: string): string => {
    const st = r.pari_st[k];
    if (st !== undefined) return ekraniraj(kakvoPishe(stotinki(st)));
    const n = r.chisla[k];
    if (n !== undefined) return ekraniraj(String(n));
    return ekraniraj(r.tekst[k] ?? '—');
  };
  return `
      <div class="karta" data-semeystvo-kato-edna="${ekraniraj(s.klyuch)}">
        <div class="dyalglava"><h3 translate="no">${ekraniraj(s.klyuch)}</h3>
          <span translate="no">${s.tablitsi.map(ekraniraj).join(' + ')}</span></div>
        <div class="tablitsa" data-tablitsa="semeystvo-kato-edna">
          <div class="glava opis"><span>Таблица</span><span>Ред</span>${nomera
            .map((k) => `<span>${ekraniraj(s.koloni[Number(k)]!)}</span>`)
            .join('')}</div>
          ${ch.redove
            .map(
              (r) => `<div class="red opis" translate="no" data-obsht-red="${ekraniraj(`${r.tablitsa}·${r.red}`)}">
            <span>${ekraniraj(r.tablitsa)}</span><span><b>${ekraniraj(r.red)}</b></span>
            ${nomera.map((k) => `<span>${kletka(r, k)}</span>`).join('')}
          </div>`,
            )
            .join('')}
          ${
            parichni.size > 0
              ? `<div class="red opis sumi" translate="no"><span><b>Сбор</b></span><span></span>${nomera
                  .map((k) =>
                    parichni.has(k)
                      ? `<span data-obsht-sbor="${k}"><b>${ekraniraj(kakvoPishe(stotinki(sborNaObshtaKolona(ch.redove, k))))}</b></span>`
                      : '<span></span>',
                  )
                  .join('')}</div>`
              : ''
          }
        </div>
        <p class="drebno" data-semeystvo-sverka>Сверка вход↔изход: ${ch.sverka.vhod} реда →
        ${ch.sverka.izhod}, разлика ${ch.sverka.razlika} · клетки без дом в общата глава:
        ${ch.sverka.bezDom}. ${ZASHTO_I_NULATA}</p>
      </div>`;
}

/**
 * СЪЗДАДЕНИТЕ ТАБЛИЦИ · и техните РЕДОВЕ (резен 57 · M12).
 *
 * НАХОДКАТА, която роди този блок: `tablitsiOtFayl` в Огледалото имаше НУЛА
 * четци. Таблицата се създаваше, влизаше в Журнала и изчезваше от очите на
 * човека — обявена възможност без консуматор (ADR-041).
 *
 * Затворената колона (тази с формула) НЕ получава поле: тя се СМЯТА
 * (правило 23). Показва се, но с думата „смята се" вместо вход — изключеното
 * се КАЗВА, не се премълчава (правило 15).
 */
/**
 * КОЯ таблица гледам · ЕДИНСТВЕНИЯТ дом на въпроса (правило 17).
 *
 * Екранът и записът я решаваха ПО РАЗЛИЧЕН път: екранът — избраната, после
 * току-що създадената, после първата ПО АЗБУКА; записът — избраната, после
 * първата ПО РЕД НА СЪЗДАВАНЕ. При празен изричен избор двете се разминават
 * тихо: екранът показва една таблица, а редът влиза в друга. Проход §145 го
 * хвана на живо — В-1, писан пред „Втори обект", осъмна във „Фактури от файл".
 */
function gledanataTablitsa(o: Ogledalo): PayloadTablitsaOtFaylSazdadena | undefined {
  const vsichki = [...o.tablitsiOtFayl.values()].sort((a, b) =>
    a.klyuch < b.klyuch ? -1 : a.klyuch > b.klyuch ? 1 : 0,
  );
  // ТОКУ-ЩО СЪЗДАДЕНАТА се показва сама: човек, който е натиснал „Създай",
  // гледа нея, а не първата по азбука. Изричният избор пак бие.
  return (
    vsichki.find((x) => x.klyuch === izbranaTablitsa) ??
    vsichki.find((x) => x.klyuch === zaVnos) ??
    vsichki[0]
  );
}

function blokNaSazdadenite(o: Ogledalo): string {
  if (o.tablitsiOtFayl.size === 0) {
    return `
    <section data-sektsiya="sazdadenite-tablitsi">
      <div class="dyalglava">
        <h2>Създадените таблици</h2>
        <span>тук ще стоят таблиците, направени от файл — с редовете си</span>
      </div>
      <p class="drebno">Още няма нито една. Прочети таблица от папката горе.</p>
    </section>`;
  }

  const vsichki = [...o.tablitsiOtFayl.values()].sort((a, b) =>
    a.klyuch < b.klyuch ? -1 : a.klyuch > b.klyuch ? 1 : 0,
  );
  const t = gledanataTablitsa(o)!;
  const redove = redovete(o.redoveNaTablitsi, t.klyuch);
  const sverka = sveriRedovete(o.vhodNaRedovete, o.redoveNaTablitsi, t.klyuch);
  const nomera = t.glavi.map((_, i) => String(i));

  const kletkaNaReda = (r: (typeof redove)[number], k: string): string => {
    if (zatvorenaE(t, k)) return '<span class="znachka tiha">смята се</span>';
    const vid = vidaNaKolonata(t, k);
    if (vid === 'evro') {
      const st = r.pari_st[k];
      return st === undefined ? '—' : ekraniraj(kakvoPishe(stotinki(st)));
    }
    if (vid === 'protsent' || vid === 'chislo') {
      const n = r.chisla[k];
      return n === undefined ? '—' : ekraniraj(String(n));
    }
    return ekraniraj(r.tekst[k] ?? '—');
  };

  return `
    <section data-sektsiya="sazdadenite-tablitsi">
      <div class="dyalglava">
        <h2>Създадените таблици</h2>
        <span>редовете им живеят ВЪТРЕ, в Журнала — не само в чуждия файл</span>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="izbor-sazdadena">Коя гледам</label>
          <select translate="no" id="izbor-sazdadena">
            ${vsichki
              .map(
                (x) =>
                  `<option value="${ekraniraj(x.klyuch)}"${x.klyuch === t.klyuch ? ' selected' : ''}>${ekraniraj(x.klyuch)}</option>`,
              )
              .join('')}
          </select>
        </div>
      </div>

      <form id="forma-red-na-tablitsa" class="poleta tesni">
        <div class="pole">
          <label for="red-klyuch">Ключ на реда</label>
          <input translate="no" id="red-klyuch" name="red" placeholder="Р-1" required>
        </div>
        ${nomera
          .map((k) =>
            zatvorenaE(t, k)
              ? `<div class="pole"><label>${ekraniraj(t.glavi[Number(k)]!)}</label>
                 <span class="znachka tiha">смята се — затворена колона</span></div>`
              : `<div class="pole">
                   <label for="red-k-${k}">${ekraniraj(t.glavi[Number(k)]!)}</label>
                   <input translate="no" id="red-k-${k}" name="k-${k}" data-vid="${vidaNaKolonata(t, k)}">
                 </div>`,
          )
          .join('')}
        <div class="deystviya"><button type="submit">Запиши реда</button></div>
      </form>

      <div class="tablitsa" data-tablitsa="redove-na-sazdadena">
        <div class="glava opis"><span>Ред</span>${nomera
          .map((k) => `<span>${ekraniraj(t.glavi[Number(k)]!)}</span>`)
          .join('')}<span></span></div>
        ${
          redove.length
            ? redove
                .map(
                  (r) => `
          <div class="red opis" translate="no" data-red="${ekraniraj(r.red)}">
            <span><b>${ekraniraj(r.red)}</b></span>
            ${nomera.map((k) => `<span>${kletkaNaReda(r, k)}</span>`).join('')}
            <span><button type="button" class="vtorichen malak" data-mahni-red="${ekraniraj(r.red)}">Махни</button></span>
          </div>`,
                )
                .join('')
            : `<div class="red opis"><span>Няма нито един ред.</span>${nomera
                .map(() => '<span></span>')
                .join('')}<span></span></div>`
        }
        ${
          nomera.some((k) => vidaNaKolonata(t, k) === 'evro')
            ? `<div class="red opis sumi" translate="no"><span><b>Сбор</b></span>${nomera
                .map((k) =>
                  vidaNaKolonata(t, k) === 'evro' && !zatvorenaE(t, k)
                    ? `<span data-sbor-kolona="${k}"><b>${ekraniraj(kakvoPishe(stotinki(sborNaKolona(redove, k))))}</b></span>`
                    : '<span></span>',
                )
                .join('')}<span></span></div>`
            : ''
        }
      </div>

      ${blokNaVnosa(t)}
      ${blokNaRazreza(t, redove, nomera)}
      ${blokNaRollup(o, t, redove)}

      <p class="drebno" id="sverka-redove">Записани: <b>${sverka.zapisani}</b> · махнати:
      <b>${sverka.mahnati}</b> · живи: <b>${sverka.zhivi}</b> · разлика: <b>${sverka.razlika}</b>
      — и четирите се броят, дори когато са нула.
      Махането е ЗАПИС: редът си отива от таблицата, не от Журнала.</p>
    </section>`;
}

function predlozhenieto(p: PredlozhenieZaTablitsa): string {
  return `
      <div class="plochki" data-predlozhenie="${ekraniraj(p.ime)}">
        <div class="plochka">
          <span class="etiket">Колони</span>
          <span class="chislo" translate="no" data-koloni="${p.koloni.length}">${
            p.koloni.length
          }</span>
          <span class="pod">${p.redove} реда данни</span>
        </div>
        <div class="plochka">
          <span class="etiket">Формули във файла</span>
          <span class="chislo" translate="no" data-formuli="${p.formuliVavFayla}">${
            p.formuliVavFayla
          }</span>
          <span class="pod">намерени в главите на колоните</span>
        </div>
        <div class="plochka${p.kopirani === p.formuliVavFayla ? '' : ' duljimo'}">
          <span class="etiket">Копирани</span>
          <span class="chislo" translate="no" data-kopirani="${p.kopirani}">${p.kopirani}</span>
          <span class="pod">останалите идват с числата си</span>
        </div>
        <div class="plochka${p.sverkaNaFormulite.razlika === 0 ? '' : ' duljimo'}">
          <span class="etiket">Сверка на сметките</span>
          <span class="chislo" translate="no" data-razlika="${p.sverkaNaFormulite.razlika}">${
            p.sverkaNaFormulite.razlika
          }</span>
          <span class="pod">разлика на ${p.sverkaNaFormulite.provereni} проверени реда</span>
        </div>
      </div>

      <p class="drebno" data-sdumi="1">${ekraniraj(sDumi(p))}</p>

      <div class="tablitsa" data-tablitsa="ot-fayl">
        <div class="red glava otfaylred" translate="no">
          <span class="kletka">Колона</span>
          <span class="kletka">Вид</span>
          <span class="kletka">Сметка</span>
          <span class="kletka">От файла</span>
          <span class="kletka">Защо не се копира</span>
        </div>
        ${p.koloni
          .map(
            (k) => `
        <div class="red otfaylred${k.zashto === '' ? '' : ' duljimo'}" translate="no"
             data-kolona="${k.nomer}" data-formula="${k.formula === undefined ? 'ne' : 'da'}">
          <span class="kletka">${ekraniraj(k.ime)}</span>
          <span class="kletka"><select translate="no" data-vid-na="${k.nomer}">
            ${VIDOVE_STOYNOST.map(
              (v) =>
                `<option value="${v}"${v === (vidoveOtRaka.get(k.nomer) ?? k.vid) ? ' selected' : ''}>${ekraniraj(IMENA_NA_VIDOVETE_STOYNOST[v])}</option>`,
            ).join('')}
          </select></span>
          <span class="kletka">${
            k.formula === undefined
              ? '—'
              : ekraniraj(
                  `${imeNaDeystvie(k.formula.deystvie)} на ${k.formula.ot
                    .map((x) => p.koloni[x]?.ime ?? `колона ${x + 1}`)
                    .join(' · ')}`,
                )
          }</span>
          <span class="kletka">${k.izraz === '' ? '—' : `<code>${ekraniraj(k.izraz)}</code>`}</span>
          <span class="kletka">${ekraniraj(k.zashto)}</span>
        </div>`,
          )
          .join('')}
      </div>

      <p class="drebno"><b>Сметка, преписана без проверка, е сметка, на която
      никой не е гледал.</b> Затова всяка разпозната формула се ПРЕСМЯТА върху
      редовете на файла и се сравнява с числата, които самият Excel е кеширал.
      Разминат ли се, формулата НЕ идва — а колоната идва с данните си, и
      сметката ѝ се прави тук, вътре.</p>

      <form id="forma-sazday-tablitsa" class="redditsa">
        <label class="pole">
          <span>Име на таблицата</span>
          <input translate="no" name="ime" id="nova-tablitsa-ime" value="${ekraniraj(p.ime)}">
        </label>
        <button type="submit">Създай таблицата вътре</button>
      </form>`;
}

/**
 * ВНОСЪТ НА РЕДОВЕТЕ · целият файл влиза, не само главата (резен 61).
 *
 * Появява се САМО докато прочетеният лист е още в ръцете на екрана и е за
 * ТАЗИ таблица. Бутон, който предлага да внесе чужд лист, е бутон, който чака
 * да сгреши.
 */
function blokNaVnosa(t: PayloadTablitsaOtFaylSazdadena): string {
  if (prochetenList === undefined || zaVnos !== t.klyuch) return '';
  const v = podgotviVnos(prochetenList, t, (t.redNaGlavata ?? 0) + 1);
  return `
    <div class="deystviya" data-vnos="${ekraniraj(t.klyuch)}">
      <button type="button" id="vnesi-redovete"${v.redove.length ? '' : ' disabled'}>Внеси
      ${v.redove.length} реда от файла</button>
      <p class="drebno" id="sverka-vnos">Прочетени: <b>${v.sverka.procheteni}</b> · за
      записване: <b>${v.sverka.zapisani}</b> · пропуснати: <b>${v.sverka.propusnati}</b> ·
      разлика: <b>${v.sverka.razlika}</b>.${
        v.propusnati.length === 0
          ? ' Нито един ред не отпада.'
          : ` Пропуснатите се КАЗВАТ поименно: ${ekraniraj(
              v.propusnati.slice(0, 4).map((x) => `ред ${x.red} — ${x.zashto}`).join(' · '),
            )}${v.propusnati.length > 4 ? ` · и още ${v.propusnati.length - 4}` : ''}.`
      }</p>
    </div>`;
}

/**
 * РАЗРЕЗЪТ · групи по избрана колона, със сбор на всяка парична (резен 59).
 *
 * Без избор няма разрез: празният избор не е „по първата колона", а „без".
 * Сметка, която се появява сама, кара човека да ѝ вярва, без да я е поискал.
 */
function blokNaRazreza(
  t: PayloadTablitsaOtFaylSazdadena,
  redove: readonly RedNaTablitsa[],
  nomera: readonly string[],
): string {
  const menyu = `
    <div class="pole">
      <label for="izbor-razrez">Разрез по</label>
      <select translate="no" id="izbor-razrez">
        <option value=""${razrezPo === '' ? ' selected' : ''}>— без разрез —</option>
        ${nomera
          .map(
            (k) =>
              `<option value="${k}"${k === razrezPo ? ' selected' : ''}>${ekraniraj(t.glavi[Number(k)]!)}</option>`,
          )
          .join('')}
      </select>
    </div>`;

  if (razrezPo === '' || !nomera.includes(razrezPo)) {
    return `<div class="poleta tesni">${menyu}</div>`;
  }

  const grupi = razrezPoKolona(redove, t, razrezPo);
  const sverka = sveriRazreza(redove, t, grupi);
  const pari = nomera.filter((k) => vidaNaKolonata(t, k) === 'evro');
  const razlikite = Object.values(sverka.razlika_st).reduce((a, b) => a + Math.abs(b), 0);

  return `
    <div class="poleta tesni">${menyu}</div>
    <div class="tablitsa" data-tablitsa="razrez">
      <div class="glava opis"><span>${ekraniraj(t.glavi[Number(razrezPo)]!)}</span><span>Редове</span>${pari
        .map((k) => `<span>${ekraniraj(t.glavi[Number(k)]!)}</span>`)
        .join('')}</div>
      ${grupi
        .map(
          (g) => `
      <div class="red opis" translate="no" data-grupa="${ekraniraj(g.stoynost)}">
        <span><b>${g.stoynost === '' ? '<span class="znachka tiha">(празно)</span>' : ekraniraj(g.stoynost)}</b></span>
        <span>${g.broy}</span>
        ${pari.map((k) => `<span>${ekraniraj(kakvoPishe(stotinki(g.sbor_st[k] ?? 0)))}</span>`).join('')}
      </div>`,
        )
        .join('')}
    </div>
    <p class="drebno" id="sverka-razrez">Редове: <b>${sverka.redove}</b> · в групите:
    <b>${sverka.vGrupite}</b> · разлика: <b>${sverka.razlikaVBroya}</b> · по парите:
    <b>${razlikite}</b>. Цялото и сборът на частите се смятат по РАЗЛИЧЕН път — затова
    разликата значи нещо. Празната клетка е СВОЯ група, не изхвърлен ред.</p>`;
}

/**
 * ROLLUP-ЪТ · сбор от ДРУГА таблица по закачената връзка (резен 88).
 *
 * Последното от трите, които чакаха редовете (`docs/10`): за всеки ред на
 * гледаната таблица — колко реда на ИЗВОРНАТА са закачени за него и сборът на
 * една нейна парична колона. Сметка, не запис — както разрезът (ADR-113).
 * Без избор няма rollup: сметка, която се появява сама, кара човека да ѝ
 * вярва, без да я е поискал.
 */
function blokNaRollup(
  o: Ogledalo,
  t: PayloadTablitsaOtFaylSazdadena,
  redove: readonly RedNaTablitsa[],
): string {
  // Rollup събира от ДРУГА таблица — при една-единствена той няма предмет
  // (прецедентът на празните групи), а не е изключена отметка.
  const drugi = [...o.tablitsiOtFayl.keys()].filter((x) => x !== t.klyuch).sort();
  if (drugi.length === 0) return '';

  const izvorKlyuch = drugi.includes(rollupOt) ? rollupOt : '';
  const menyuTablitsa = `
    <div class="pole">
      <label for="izbor-rollup">Сбор от таблица</label>
      <select translate="no" id="izbor-rollup">
        <option value=""${izvorKlyuch === '' ? ' selected' : ''}>— без —</option>
        ${drugi
          .map(
            (x) =>
              `<option value="${ekraniraj(x)}"${x === izvorKlyuch ? ' selected' : ''}>${ekraniraj(x)}</option>`,
          )
          .join('')}
      </select>
    </div>`;

  if (izvorKlyuch === '') return `<div class="poleta tesni">${menyuTablitsa}</div>`;

  const izvor = o.tablitsiOtFayl.get(izvorKlyuch)!;
  const pari = parichniteKoloni(izvor);
  if (pari.length === 0) {
    // Правило 15: невъзможното се КАЗВА, не се преглъща с празно меню.
    return `<div class="poleta tesni">${menyuTablitsa}</div>
    <p class="drebno" id="rollup-bez-pari">„${ekraniraj(izvorKlyuch)}" няма парична колона —
    rollup няма какво да събере.</p>`;
  }

  const kolona = pari.includes(rollupKolona) ? rollupKolona : '';
  const menyuKolona = `
    <div class="pole">
      <label for="izbor-rollup-kolona">коя колона</label>
      <select translate="no" id="izbor-rollup-kolona">
        <option value=""${kolona === '' ? ' selected' : ''}>— избери —</option>
        ${pari
          .map(
            (k) =>
              `<option value="${k}"${k === kolona ? ' selected' : ''}>${ekraniraj(izvor.glavi[Number(k)]!)}</option>`,
          )
          .join('')}
      </select>
    </div>`;

  if (kolona === '') return `<div class="poleta tesni">${menyuTablitsa}${menyuKolona}</div>`;

  const izvorniRedove = redovete(o.redoveNaTablitsi, izvorKlyuch);
  const rollup = rollupPoZakachki(o.zakachki, t.klyuch, redove, izvor, izvorniRedove, kolona);
  const sverka = sveriRollup(o.zakachki, t.klyuch, redove, izvor, izvorniRedove, kolona, rollup);

  return `
    <div class="poleta tesni">${menyuTablitsa}${menyuKolona}</div>
    <div class="tablitsa" data-tablitsa="rollup">
      <div class="glava opis"><span>Ред</span><span>Закачени</span>
      <span>${ekraniraj(izvor.glavi[Number(kolona)]!)} от „${ekraniraj(izvorKlyuch)}"</span></div>
      ${
        rollup.length
          ? rollup
              .map(
                (r) => `
      <div class="red opis" translate="no" data-rollup-red="${ekraniraj(r.red)}">
        <span><b>${ekraniraj(r.red)}</b></span>
        <span>${r.izvorni.length}</span>
        <span data-rollup-sbor="${r.sbor_st}">${ekraniraj(kakvoPishe(stotinki(r.sbor_st)))}</span>
      </div>`,
              )
              .join('')
          : '<div class="red opis"><span>Няма нито един ред.</span><span></span><span></span></div>'
      }
    </div>
    <p class="drebno" id="sverka-rollup">Живи в извора: <b>${sverka.zhiviVIzvora}</b> · влезли:
    <b>${sverka.vlezli}</b> · незакачени: <b>${sverka.nezakacheni}</b> · по парите изворът е
    <b>${ekraniraj(kakvoPishe(stotinki(sverka.sborIzvora_st)))}</b>, влезлите —
    <b>${ekraniraj(kakvoPishe(stotinki(sverka.sborVlezli_st)))}</b>, разлика
    <b data-rollup-razlika="${sverka.razlika_st}">${ekraniraj(kakvoPishe(stotinki(sverka.razlika_st)))}</b>
    · закачки към махнати: <b>${sverka.kamMahnati}</b>. Двете страни се смятат по РАЗЛИЧЕН
    път; изворен ред, закачен за два реда, влиза в сбора на ВСЕКИ, а в сверката се брои
    ВЕДНЪЖ — затова тя гледа различните.</p>`;
}

export function zakachiTablitsaOtFayl(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLButtonElement>('#izbor-tablitsa-fayl')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#fayl-tablitsa')?.click();
  });

  koren.querySelector<HTMLInputElement>('#fayl-tablitsa')?.addEventListener('change', async (e) => {
    const vhod = e.target as HTMLInputElement;
    const fayl = vhod.files?.[0];
    vhod.value = '';
    if (!fayl) return;
    try {
      const baytove = new Uint8Array(await fayl.arrayBuffer());
      otpechatakNaFayla = await otpechatak(baytove, sha256Web);
      imeNaFayla = fayl.name;
      // ЕДИН път за трите формата (правило 17). Липсата на формули не е дефект,
      // а свойство на формата — и се КАЗВА с думите на своята причина.
      const prochetenoto = await tablitsiSFormuli(baytove, fayl.name);
      bezFormuli = prochetenoto.bezFormuli;
      prochetenList = prochetenoto.tablitsi[0];
      formulite = prochetenoto.formuli[0]!.poKolona;
      // ГЛАВАТА СЕ ПОЗНАВА, не се приема за първия ред: неговите листове почват
      // със заглавие в една клетка, а главата е под него.
      vidoveOtRaka.clear();
      redNaGlavata = redatNaGlavata(prochetenList!);
      predlozhenie = predlozhiTablitsa(prochetenList!, formulite, redNaGlavata);
      greshka = '';
    } catch (err) {
      predlozhenie = undefined;
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  // ── РЕДОВЕТЕ НА СЪЗДАДЕНАТА ТАБЛИЦА (резен 57 · M12) ─────────────────────
  koren.querySelector<HTMLSelectElement>('#izbor-sazdadena')?.addEventListener('change', async (e) => {
    izbranaTablitsa = (e.target as HTMLSelectElement).value;
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#vnesi-redovete')?.addEventListener('click', async () => {
    const o = await k.deystviya.ogledalo();
    const t = o.tablitsiOtFayl.get(zaVnos);
    if (t === undefined || prochetenList === undefined) return;
    const v = podgotviVnos(prochetenList, t, (t.redNaGlavata ?? 0) + 1);
    let vlezli = 0;
    try {
      for (const red of v.redove) {
        // ВСЕКИ ред е СВОЙ запис през Вратата, със свой `opId` (правило 20).
        // Един запис за цялата партида би сложил сто решения под един ключ.
        await k.deystviya.zapishiRedNaTablitsa(red, { opId: `vnos:${crypto.randomUUID()}` });
        vlezli += 1;
      }
      greshka = '';
      k.vest(
        'dobre',
        `Внесени ${vlezli} реда · пропуснати ${v.propusnati.length} · разлика ${
          v.sverka.procheteni - vlezli - v.propusnati.length
        }.`,
      );
      prochetenList = undefined;
      zaVnos = '';
      await prerisuvay();
    } catch (err) {
      // ЧАСТИЧНО ВНЕСЕНОТО ОСТАВА. Журналът е само за добавяне: редовете,
      // които вече са влезли, са факти. Казва се докъде е стигнало.
      greshka = `Спря на ред ${vlezli + 1}: ${dumiZaGreshka(err)}. Влезлите ${vlezli} остават.`;
      k.vest('zle', greshka);
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLSelectElement>('#izbor-razrez')?.addEventListener('change', async (e) => {
    razrezPo = (e.target as HTMLSelectElement).value;
    await prerisuvay();
  });

  koren.querySelector<HTMLSelectElement>('#izbor-rollup')?.addEventListener('change', async (e) => {
    rollupOt = (e.target as HTMLSelectElement).value;
    // Колоната е колона НА ИЗВОРА: сменен извор прави стария избор чужд номер.
    rollupKolona = '';
    await prerisuvay();
  });

  koren
    .querySelector<HTMLSelectElement>('#izbor-rollup-kolona')
    ?.addEventListener('change', async (e) => {
      rollupKolona = (e.target as HTMLSelectElement).value;
      await prerisuvay();
    });

  for (const izbor of koren.querySelectorAll<HTMLSelectElement>('[data-vid-na]')) {
    izbor.addEventListener('change', async () => {
      const nomer = Number(izbor.dataset['vidNa']);
      vidoveOtRaka.set(nomer, izbor.value as VidStoynost);
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLInputElement>('#red-na-glavata')?.addEventListener('change', async (e) => {
    const nov = Number((e.target as HTMLInputElement).value) - 1;
    if (prochetenList === undefined || !Number.isInteger(nov) || nov < 0) return;
    try {
      predlozhenie = predlozhiTablitsa(prochetenList, formulite, nov);
      redNaGlavata = nov;
      greshka = '';
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  const formaRed = koren.querySelector<HTMLFormElement>('#forma-red-na-tablitsa');
  formaRed?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const o = await k.deystviya.ogledalo();
    // СЪЩАТА таблица, която екранът показва — не първата по ред на създаване.
    const t = gledanataTablitsa(o);
    if (t === undefined) return;

    const danni = new FormData(formaRed);
    const pari_st: Record<string, number> = {};
    const chisla: Record<string, number> = {};
    const tekst: Record<string, string> = {};
    try {
      for (const [kolona] of t.glavi.entries()) {
        const k2 = String(kolona);
        if (zatvorenaE(t, k2)) continue;
        const surovo = String(danni.get(`k-${k2}`) ?? '').trim();
        if (surovo === '') continue;
        const vid = vidaNaKolonata(t, k2);
        // ПАРИТЕ минават през четеца на суми — той знае и запетаята, и точката,
        // и връща ЦЕЛИ стотинки. Ръчно `Number()*100` дава 12.340000000000002.
        if (vid === 'evro') pari_st[k2] = otSuma(surovo);
        else if (vid === 'protsent' || vid === 'chislo') {
          const n = Number(surovo.replace(',', '.'));
          if (!Number.isFinite(n)) throw new Error(`„${t.glavi[kolona]}" иска число, а дойде „${surovo}".`);
          chisla[k2] = n;
        } else tekst[k2] = surovo;
      }

      await k.deystviya.zapishiRedNaTablitsa(
        {
          tablitsa: t.klyuch,
          red: String(danni.get('red') ?? '').trim(),
          pari_st,
          chisla,
          tekst,
          mahnat: false,
        },
        { opId: `red-na-tablitsa:${crypto.randomUUID()}` },
      );
      greshka = '';
      k.vest('dobre', 'Редът влезе в таблицата.');
      await prerisuvay();
    } catch (err) {
      greshka = dumiZaGreshka(err);
      k.vest('zle', greshka);
      await prerisuvay();
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-mahni-red]')) {
    b.addEventListener('click', async () => {
      const o = await k.deystviya.ogledalo();
      // СЪЩАТА таблица, която екранът показва — не първата по ред на създаване.
      const t = gledanataTablitsa(o);
      const star = t === undefined ? undefined : o.redoveNaTablitsi.get(t.klyuch)?.get(b.dataset['mahniRed']!);
      if (star === undefined) return;
      try {
        // МАХАНЕТО е ЗАПИС със същия ключ (правило 1). Стойностите се пренасят
        // такива, каквито са: махнатият ред трябва да се чете утре, за да се
        // види КАКВО е било махнато, а не само че нещо е било.
        await k.deystviya.zapishiRedNaTablitsa(
          { ...star, mahnat: true },
          { opId: `red-mahnat:${crypto.randomUUID()}` },
        );
        greshka = '';
        k.vest('dobre', 'Редът е махнат. Записът остава в Журнала.');
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        k.vest('zle', greshka);
        await prerisuvay();
      }
    });
  }

  const forma = koren.querySelector<HTMLFormElement>('#forma-sazday-tablitsa');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-tablitsa-fayl')!;
    kazhi.textContent = '';
    const p = predlozhenie;
    if (p === undefined) return;
    const ime = String(new FormData(forma).get('ime') ?? '').trim();
    try {
      await k.deystviya.zapishiTablitsaOtFayl(
        {
          klyuch: ime,
          redNaGlavata,
          otFayl: imeNaFayla,
          otpechatak: otpechatakNaFayla,
          glavi: p.koloni.map((x) => x.ime),
          vidove: Object.fromEntries(
            p.koloni.map((x) => [x.nomer, vidoveOtRaka.get(x.nomer) ?? x.vid]),
          ),
          formuli: Object.fromEntries(
            p.koloni.filter((x) => x.formula !== undefined).map((x) => [x.nomer, x.formula!]),
          ),
          nekopirani: p.koloni
            .filter((x) => x.zashto !== '')
            .map((x) => `${x.ime}: ${x.izraz} — ${x.zashto}`),
        },
        { opId: `tablitsa-ot-fayl:${crypto.randomUUID()}` },
      );
      predlozhenie = undefined;
      zaVnos = ime;
      k.vest('dobre', `Таблицата „${ime}" е създадена · ${p.kopirani} копирани формули.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
