/**
 * Екран „Сметки" — потоците пари и ДДС-то на ОТДЕЛЕН РЕД.
 *
 * Думата на собственика: цените са общи, с ДДС вътре; ДДС-то не се разделя
 * при наема, а се смята тук, на свой ред, и се разбива по акумулатори.
 *
 * Нищо на този екран не пише в Журнала. Всичко е изведено от Огледалото и се
 * преизчислява при всяко показване — включително сверката.
 */

import { GreshkaPari, kakvoPishe, otLeva, pishi, pishiVPole } from '../src/yadro/pari.js';
import { GreshkaData, otData } from '../src/yadro/data.js';
import { MERKA } from '../src/yadro/sverka.js';
import { eZamrazen } from '../src/domein/zamrazyavane.js';
import { platenoDDSZaPerioda } from '../src/ogledalo/ogledalo.js';
import {
  akumulator,
  ddsOtObshta,
  sektoriNaRazhod,
  stavkaNaReda,
  STAVKI,
} from '../src/domein/dds.js';
import {
  potok,
  potototsiNaRazhod,
  razhodiZaPerioda,
  smetki,
  type RedDDS,
  type RedSmetka,
} from '../src/domein/smetki.js';
import { sDumi, type RezultatSverka } from '../src/domein/sverka-dds.js';
import {
  IMENA_NA_DZHOBOVETE,
  otcheti,
  saldoNa,
  type Otcheti,
  type Pole,
} from '../src/domein/otcheti.js';
import { sboratZaKapitala } from './stoynost.js';
import { VID } from '../src/domein/sabitiya.js';
import type { Ogledalo, Razhod } from '../src/ogledalo/ogledalo.js';
import { dumiZaGreshka, ekraniraj } from './imoti.js';
import { opitajStorno } from './storno.js';
import { filtriray, glavaSFiltar, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import { butonIstoriya } from './istoriya.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './main.js';

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdRazhod = crypto.randomUUID();
let opIdSaldo = crypto.randomUUID();
/**
 * Ключът на ЕДНО подаване на справка · живее, докато формата стои отворена.
 *
 * Дотук стоеше `spravka:${mesets}` — ключ от СЪДЪРЖАНИЕТО, който правило 20
 * забранява поименно. Последицата беше тиха и скъпа: сторнираш подадена
 * справка, за да я поправиш, подаваш втора за същия месец — и `opId`-ът вече е
 * минавал, значи Вратата връща стария резултат, нищо не влиза в Журнала, а
 * екранът пише „Справката е записана". Месецът остава ОТКЛЮЧЕН, докато
 * собственикът мисли, че е подал.
 */
let opIdSpravka = crypto.randomUUID();
let greshkaSaldo = '';

/** Кой месец се гледа · помни се (ADR-022): счетоводителят живее в един месец. */
let period: string | null = chetiEkranno<string | null>('smetki.period', null);

/** Редовете на Калкулатора — само в паметта, никъде другаде. */
interface RedNaSmyatane {
  readonly opis: string;
  readonly obshta_st: number;
  readonly stavka: number;
}
let smyatane: RedNaSmyatane[] = [];

/** Колоните на списъка „Разходи" — фините филтри в стил Уиндоус. */
const KOLONI_RAZHODI: KolonaSFiltar<Razhod>[] = [
  // Петата глава пише „ДДС" и колоната Е ДДС (правило 20 · ADR-014): дотук
  // беше описана като ДАТА и филтърът под „ДДС" предлагаше „Днес · Вчера ·
  // Тази седмица" — глава, която лъже какво стои под нея. Дата-филтърът пада
  // с лъжата; датата се търси свободно през „Търси в таблицата".
  { klyuch: 'koy', ime: 'Доставчик и описание', vid: 'tekst', vzemi: (r) => r.dostavchik },
  { klyuch: 'potok', ime: 'Поток', vid: 'tekst', vzemi: (r) => potok(r.potok)?.ime ?? r.potok },
  { klyuch: 'sektor', ime: 'Сектор', vid: 'tekst', vzemi: (r) => akumulator(r.sektor).sektor },
  { klyuch: 'suma', ime: 'Обща сума', vid: 'evro', vzemi: (r) => r.suma_st },
  {
    klyuch: 'dds',
    ime: 'ДДС',
    vid: 'evro',
    vzemi: (r) => ddsOtObshta(r.suma_st, stavkaNaReda(r.sektor, r.stavka)).dds_st,
  },
];

export function narisuvaySmetki(o: Ogledalo, dnes: string): string {
  const mesets = period ?? dnes.slice(0, 7);
  const s = smetki(o, mesets, new Date().toISOString());
  const razlika = s.sverki.reduce((sbor, x) => sbor + x.razlika, 0);
  const razhodi = razhodiZaPerioda(o, mesets);
  const filtriraniRazhodi = filtriray('razhodi', razhodi, KOLONI_RAZHODI, dnes);

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Приход за ${ekraniraj(mesets)}</span>
        <span class="chislo" translate="no">${pishi(s.prihod_st)}</span>
        <span class="pod">начислено · обща цена с ДДС</span>
      </div>
      <div class="plochka">
        <span class="etiket">ДДС ${s.zaVnasyane_st < 0 ? 'за възстановяване' : 'за внасяне'}</span>
        <span class="chislo" translate="no">${pishi(s.zaVnasyane_st)}</span>
        <span class="pod">изход ${pishi(s.dds_izhod_st)} − вход ${pishi(s.dds_vhod_st)}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Разход за ${ekraniraj(mesets)}</span>
        <span class="chislo" translate="no">${pishi(s.razhod_st)}</span>
        <span class="pod">заплати + кредити + фактури</span>
      </div>
      <div class="plochka${s.nared ? '' : ' trevoga'}">
        <span class="etiket">Разлика по сверката</span>
        <span class="chislo" translate="no">${pishi(razlika)}</span>
        <span class="pod">${s.nared ? 'сверката затваря' : 'НЕ затваря — виж долу'}</span>
      </div>
    </div>

    ${formaSalda(o)}

    <section class="karta">
      <div class="dyalglava"><h2>Период</h2><span>сметките се смятат наново за всеки месец</span></div>
      <form id="forma-period">
        <div class="poleta tesni">
          <div class="pole">
            <label for="smetki-period">Месец</label>
            <input translate="no" id="smetki-period" name="period" type="month" value="${ekraniraj(mesets)}" required>
          </div>
        </div>
        <div class="deystviya">
          <button type="submit" class="vtorichen">Покажи</button>
          <p class="drebno">Нищо не се записва — изгледът се изчислява от Журнала при всяко показване.</p>
        </div>
      </form>
    </section>

    <section>
      <div class="dyalglava">
        <h2>Сметки</h2><span>${ekraniraj(mesets)}</span>
      </div>
      <div class="tablitsa">
        <div class="glava smetka">
          <span>Поток</span><span>Посока</span><span>Записи</span>
          <span class="suma">Сума</span>
        </div>
        ${s.redove.map(redNaSmetka).join('')}
      </div>
    </section>

    <section>
      <div class="dyalglava">
        <h2>ДДС</h2>
        <span>отделни акумулатори по държава и сектор — не един общ</span>
      </div>
      <div class="tablitsa">
        <div class="glava dds">
          <span>Страна</span><span>Сектор</span><span>Ставка</span>
          <span class="suma">Основа</span><span class="suma">ДДС</span>
        </div>
        ${
          s.dds.length === 0
            ? '<p class="prazno">Няма начислено за този месец.<br>ДДС се извежда от начисленото, не от влезлите пари.</p>'
            : s.dds.map(redNaDDS).join('')
        }
        <div class="red dds sbor" translate="no">
          <span></span>
          <span class="kletka"><b>${s.zaVnasyane_st < 0 ? 'За възстановяване' : 'За внасяне'}</b><span>изход ${pishi(s.dds_izhod_st)} − вход ${pishi(s.dds_vhod_st)}</span></span>
          <span></span>
          <span class="suma"></span>
          <span class="suma duljimo" data-st="${s.zaVnasyane_st}">${pishi(s.zaVnasyane_st)}</span>
        </div>
      </div>
      <p class="drebno">Данъчното събитие е падежът, не денят на парите — затова редът ДДС не мърда, когато влезе плащане.</p>
    </section>

    ${blokNaOtchetite(o, mesets)}

    ${blokNaSverkataDDS(s.ddsSverka)}

    ${blokNaSpravkata(o, mesets, s.zaVnasyane_st)}

    <section>
      <div class="dyalglava"><h2>Сверка</h2><span>вход ↔ изход ↔ разлика</span></div>
      <div class="tablitsa">
        <div class="glava sverka">
          <span>Какво</span><span class="suma">Вход</span><span class="suma">Изход</span>
          <span class="suma">Разлика</span><span></span>
        </div>
        ${s.sverki
          .map(
            (x) => `
          <div class="red sverka" translate="no">
            <span class="kletka"><b>${ekraniraj(x.kakvo)}</b></span>
            <span class="suma"${vStotinki(x.belezhka, x.vhod)}>${merka(x.belezhka, x.vhod)}</span>
            <span class="suma"${vStotinki(x.belezhka, x.izhod)}>${merka(x.belezhka, x.izhod)}</span>
            <span class="suma${x.nared ? '' : ' duljimo'}"${vStotinki(x.belezhka, x.razlika)}>${merka(x.belezhka, x.razlika)}</span>
            <span><span class="znachka ${x.nared ? 'dobre' : 'trevoga'}">${
              x.nared ? 'затваря' : 'НЕ затваря'
            }</span></span>
          </div>`,
          )
          .join('')}
      </div>
      <p class="drebno">Разликата се записва и когато е нула — иначе „няма разлика" е неразличимо от „не е сверявано".</p>
    </section>

    ${formaRazhod(mesets)}

    ${
      razhodi.length === 0
        ? ''
        : `<section>
      <div class="dyalglava"><h2>Разходи за ${ekraniraj(mesets)}</h2><span>${razhodi.length}</span></div>
      ${poleZaTarsene('razhodi')}
      <div class="tablitsa">
        <div class="glava razhod">
          ${KOLONI_RAZHODI.map((kol) =>
            glavaSFiltar('razhodi', kol, razhodi, dnes, kol.vid !== 'tekst'),
          ).join('')}<span></span>
        </div>
        ${
          filtriraniRazhodi.redove.length === 0
            ? '<p class="prazno">Филтърът не остави нито един ред.</p>'
            : filtriraniRazhodi.redove.map(redNaRazhod).join('')
        }
      </div>
      ${redZaSkritoto(filtriraniRazhodi, 'razhodi')}
    </section>`
    }

    ${kalkulator()}
  `;
}

/**
 * САЛДАТА · „Редактируеми отгоре в Сметки" *(р57·[18])*.
 *
 * Тук влиза САМО началото. Движенията се четат от Журнала — ако и двете се
 * пишеха, едно движение би се броило два пъти и Ликвидността щеше да лъже
 * точно там, където се гледа.
 */
function formaSalda(o: Ogledalo): string {
  const banka_st = saldoNa(o, 'banka');
  const trezor_st = saldoNa(o, 'trezor');
  const lipsvat = !o.salda.has('banka') || !o.salda.has('trezor');
  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Салда</h2>
        <span>ръчно начало · движенията идват от Журнала</span>
      </div>
      <form id="forma-saldo">
        <div class="poleta tesni">
          <div class="pole">
            <label for="saldo-kade">Джоб</label>
            <select id="saldo-kade" name="kade">
              <option value="banka">${IMENA_NA_DZHOBOVETE.banka} · сега ${pishi(banka_st)}</option>
              <option value="trezor">${IMENA_NA_DZHOBOVETE.trezor} · сега ${pishi(trezor_st)}</option>
            </select>
          </div>
          <div class="pole">
            <label for="saldo-suma">Начално салдо</label>
            <input translate="no" id="saldo-suma" name="suma" inputmode="decimal" placeholder="10 000,00" required>
          </div>
          <div class="pole">
            <label for="saldo-ot">От дата</label>
            <input translate="no" id="saldo-ot" name="ot" type="date" required>
          </div>
        </div>
        <div class="deystviya">
          <button type="submit" class="vtorichen">Запиши салдото</button>
          <p class="greshka" id="greshka-saldo">${ekraniraj(greshkaSaldo)}</p>
        </div>
        <p class="drebno">${
          lipsvat
            ? 'Липсващо салдо се брои за нула — Ликвидността го казва, вместо да го скрие.'
            : 'Повторен запис ПОПРАВЯ салдото на джоба; втори ред не се ражда.'
        } Отрицателно се приема — овърдрафтът е дълг, не грешка.</p>
      </form>
    </section>`;
}

/**
 * ОТЧЕТИТЕ · всяко число с формулата си под него.
 *
 * Негова поръчка (И90): „ще правиш полета в Секция Отчети където ще се сложар
 * полета които да покзват тези стойности с формули между всички таблици."
 *
 * Затова тук няма голо число: под всяко стои от какво е съставено и откъде се
 * чете. Число, което никой не може да разглоби, е усещане с цифра пред себе си.
 */
function blokNaOtchetite(o: Ogledalo, mesets: string): string {
  // Липсващият сбор се ПРОПУСКА, не се подава като undefined: полето трябва да
  // може да различи „нула" от „още не е смятано" (правило 15).
  const stoynost_st = sboratZaKapitala();
  const r: Otcheti = otcheti(
    o,
    mesets,
    new Date().toISOString(),
    stoynost_st === undefined ? {} : { stoynostNaSastoyanie_st: stoynost_st },
  );
  return `
    <section>
      <div class="dyalglava">
        <h2>Отчети</h2>
        <span>${ekraniraj(mesets)} · всяко число с формулата си</span>
      </div>
      <div class="otcheti">
        ${r.poleta.map(poleNaOtcheta).join('')}
      </div>
      <div class="tablitsa">
        <div class="glava sverka">
          <span>Какво</span><span class="suma">Вход</span><span class="suma">Изход</span>
          <span class="suma">Разлика</span><span></span>
        </div>
        <div class="red sverka otchet-sverka" translate="no">
          <span class="kletka"><b>Капиталът, сметнат по два пътя</b><span>съставки ↔ активи−задължения</span></span>
          <span class="suma" data-st="${r.sverka.ot_sastavki_st}">${pishi(r.sverka.ot_sastavki_st)}</span>
          <span class="suma" data-st="${r.sverka.aktivi_st - r.sverka.zadalzheniya_st}">${pishi(r.sverka.aktivi_st - r.sverka.zadalzheniya_st)}</span>
          <span class="suma${r.sverka.razlika_st === 0 ? '' : ' duljimo'}" data-st="${r.sverka.razlika_st}">${pishi(r.sverka.razlika_st)}</span>
          <span><span class="znachka ${r.sverka.razlika_st === 0 ? 'dobre' : 'trevoga'}">${
            r.sverka.razlika_st === 0 ? 'затваря' : 'НЕ затваря'
          }</span></span>
        </div>
      </div>
      <p class="drebno">Разликата се показва и когато е нула — проверената нула е различна от нулата, за която никой не е питал.</p>
    </section>`;
}

function poleNaOtcheta(p: Pole): string {
  return `
    <article class="pole-otchet" data-pole="${ekraniraj(p.klyuch)}">
      <div class="glavata">
        <span class="etiket">${ekraniraj(p.ime)}</span>
        <span class="chislo" translate="no">${pishi(p.sbor_st)}</span>
      </div>
      <p class="kakvo">${ekraniraj(p.kakvo)}</p>
      <ul class="formula" translate="no">
        ${p.sastavki
          .map(
            (c) => `<li>
              <span class="ime">${ekraniraj(c.ime)}</span>
              <span class="suma${c.suma_st < 0 ? ' duljimo' : ''}">${pishi(c.suma_st)}</span>
              <span class="otkade">${ekraniraj(c.otkade)}</span>
            </li>`,
          )
          .join('')}
      </ul>
      ${
        p.chaka.length === 0
          ? '<p class="drebno palno">Числото е пълно — нищо не липсва.</p>'
          : `<p class="drebno chaka">Чака: ${p.chaka.map(ekraniraj).join(' · ')}</p>`
      }
    </article>`;
}

function formaRazhod(mesets: string): string {
  return `
    <section class="karta">
      <div class="dyalglava"><h2>Нов разход</h2><span>сумата е обща цена с ДДС — както при наема</span></div>
      <form id="forma-razhod">
        <div class="poleta">
          <div class="pole">
            <label for="razhod-potok">Поток</label>
            <select translate="no" id="razhod-potok" name="potok" required>
              ${potototsiNaRazhod()
                .map((p) => `<option value="${ekraniraj(p.klyuch)}">${ekraniraj(p.ime)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="razhod-sektor">Сектор — важи за Фактури</label>
            <select translate="no" id="razhod-sektor" name="sektor" required>
              ${sektoriNaRazhod()
                .filter((a) => a.stavka > 0)
                .map((a) => `<option value="${ekraniraj(a.klyuch)}">${ekraniraj(a.sektor)} · ${a.stavka}%</option>`)
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="razhod-stavka">Ставка на ТАЗИ фактура</label>
            <select translate="no" id="razhod-stavka" name="stavka" required>
              ${STAVKI.map(
                (st) => `<option value="${st}"${st === 20 ? ' selected' : ''}>${st}%</option>`,
              ).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="razhod-dostavchik">Доставчик или получател</label>
            <input translate="no" id="razhod-dostavchik" name="dostavchik" required placeholder="напр. Материали ООД" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-opis">За какво</label>
            <input translate="no" id="razhod-opis" name="opis" required placeholder="напр. цимент" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-suma">Обща сума, € — с ДДС</label>
            <input translate="no" id="razhod-suma" name="suma" required inputmode="decimal" placeholder="600,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-nachin">Платено</label>
            <select translate="no" id="razhod-nachin" name="nachin">
              <option value="банка">по банка</option>
              <option value="в брой">в брой</option>
            </select>
          </div>
          <div class="pole">
            <label for="razhod-data">Дата</label>
            <input translate="no" id="razhod-data" name="data" type="date" value="${ekraniraj(mesets)}-01" required>
          </div>
          <div class="pole">
            <label for="razhod-dokument">Документ (по избор)</label>
            <input translate="no" id="razhod-dokument" name="dokument" placeholder="номер на фактура" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-razhod"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши разхода</button>
          <p class="drebno">Записва се като <b>РазходЗаписан</b>. Заплатите и кредитите нямат ДДС — секторът им се слага сам. При <b>Фактури</b> ставката е <b>на тази фактура</b>: секторът само предлага, а нощувките на 9% и необлагаемата доставка се въвеждат както са.</p>
        </div>
      </form>
    </section>`;
}

function redNaRazhod(r: Razhod): string {
  const a = akumulator(r.sektor);
  // Ставката е НА РЕДА; секторът само подсказва, когато редът мълчи.
  const stavka = stavkaNaReda(r.sektor, r.stavka);
  const razbivka = ddsOtObshta(r.suma_st, stavka);
  return `
    <div class="red razhod" translate="no">
      <span class="kletka"><b>${ekraniraj(r.dostavchik)}</b><span>${ekraniraj(r.opis)} · ${ekraniraj(r.data)}${
        r.dokument ? ` · док. ${ekraniraj(r.dokument)}` : ''
      } · ${ekraniraj(r.nachin)}</span></span>
      <span class="kletka"><span>${ekraniraj(potok(r.potok)?.ime ?? r.potok)}</span></span>
      <span class="kletka"><span>${ekraniraj(a.sektor)} · ${stavka}%${
        r.stavka === undefined ? '' : ' · от реда'
      }</span></span>
      <span class="suma duljimo" data-st="${razbivka.obshta_st}">${kakvoPishe(razbivka.obshta_st)}</span>
      <span class="suma" data-st="${razbivka.dds_st}">${kakvoPishe(razbivka.dds_st)}</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-storno-razhod="${r.seq}">Сторно</button>
        ${butonIstoriya('razhod', r.id)}
      </span>
    </div>`;
}

/** Стотинките се показват в евро; бройките — както са. */
function merka(belezhka: string | undefined, chislo: number): string {
  return belezhka === MERKA.pari ? pishi(chislo) : String(chislo);
}

/** `data-st` за статус-лентата — само когато мярката наистина е пари.
 *  Бройка без белега не влиза в сбор: евро и бройки не се смесват. */
function vStotinki(belezhka: string | undefined, chislo: number): string {
  return belezhka === MERKA.pari ? ` data-st="${chislo}"` : '';
}

/**
 * ТРИТЕ ЧИСЛА НА ДДС: изчислено ↔ декларирано ↔ платено.
 * Разликата СВЕТИ, не се замазва — думата на собственика.
 * Подадената справка ЗАКЛЮЧВА периода; сторно на справката го отключва.
 */
function blokNaSpravkata(o: Ogledalo, mesets: string, izchisleno_st: number): string {
  const spravka = o.spravki.get(mesets);
  const plateno_st = platenoDDSZaPerioda(o, mesets);
  const zakluchen = eZamrazen(o, mesets);

  const razlikaDeklarirano = spravka ? spravka.deklarirano_st - izchisleno_st : 0;
  const razlikaPlateno = spravka ? plateno_st - spravka.deklarirano_st : 0;

  return `
    <section class="karta${zakluchen ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>Справка и внасяне</h2>
        <span>${
          zakluchen
            ? `периодът е ЗАКЛЮЧЕН от справка от ${ekraniraj(spravka!.data)} — поправка само през сверена промяна`
            : 'подадената справка заключва месеца'
        }</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">Изчислено в Сметки</span>
          <span class="chislo" translate="no">${pishi(izchisleno_st)}</span>
          <span class="pod">изход − вход, от Журнала</span>
        </div>
        <div class="plochka${spravka && razlikaDeklarirano !== 0 ? ' trevoga' : ''}">
          <span class="etiket">Декларирано</span>
          <span class="chislo" translate="no">${spravka ? pishi(spravka.deklarirano_st) : '—'}</span>
          <span class="pod">${
            spravka
              ? razlikaDeklarirano === 0
                ? 'съвпада с изчисленото'
                : `РАЗМИНАВАНЕ ${pishi(razlikaDeklarirano)} — провери`
              : 'още няма справка'
          }</span>
        </div>
        <div class="plochka${spravka && razlikaPlateno !== 0 ? ' trevoga' : ''}">
          <span class="etiket">Платено</span>
          <span class="chislo" translate="no">${pishi(plateno_st)}</span>
          <span class="pod">${
            !spravka
              ? 'въвежда се от платежното'
              : razlikaPlateno === 0
                ? 'внесено докрай'
                : razlikaPlateno < 0
                  ? `остават ${pishi(-razlikaPlateno)}`
                  : `надвнесени ${pishi(razlikaPlateno)}`
          }</span>
        </div>
      </div>

      ${
        spravka
          ? `<form id="forma-dds-plateno">
        <div class="poleta">
          <div class="pole">
            <label for="dds-suma">Внесено, €</label>
            <input translate="no" id="dds-suma" name="suma" required inputmode="decimal" placeholder="200,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="dds-data">Дата на плащането</label>
            <input translate="no" id="dds-data" name="data" type="date" required>
          </div>
          <div class="pole">
            <label for="dds-nachin">Начин</label>
            <select translate="no" id="dds-nachin" name="nachin">
              <option value="банка">по банка</option>
              <option value="в брой">в брой</option>
            </select>
          </div>
        </div>
        <p class="greshka" id="greshka-dds"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши внесеното</button>
          <button type="button" class="vtorichen" data-otkluchi="${spravka.seq}">Отключи периода (сторно на справката)</button>
          <p class="drebno">Внесеното се въвежда НА РЪКА от платежното — може на части. Разликата с декларираното свети горе.</p>
        </div>
      </form>`
          : `<form id="forma-spravka">
        <div class="poleta">
          <div class="pole">
            <label for="spravka-dds">Деклариран ДДС, €</label>
            <input translate="no" id="spravka-dds" name="dds" required inputmode="decimal"
              value="${pishiVPole(izchisleno_st)}" autocomplete="off">
          </div>
          <div class="pole">
            <label for="spravka-data">Дата на подаване</label>
            <input translate="no" id="spravka-data" name="data" type="date" required>
          </div>
          <div class="pole">
            <label for="spravka-belezhka">Бележка (по избор)</label>
            <input translate="no" id="spravka-belezhka" name="belezhka" placeholder="напр. вх. номер" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-spravka"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Подай справката — заключи ${ekraniraj(mesets)}</button>
          <p class="drebno">Предложеното е изчисленото, но се редактира — записва се каквото РЕАЛНО е декларирано, а разликата свети. След подаване вземания, плащания и разходи за месеца се отказват; поправка = сверена промяна от таблица или сторно на справката.</p>
        </div>
      </form>`
      }
    </section>`;
}

/**
 * ТРЕТИЯТ ЪГЪЛ · „виждам разлика — КЪДЕ е тя".
 *
 * Дотук екранът казваше КОЛКО: изчислено ↔ декларирано ↔ платено. Три числа,
 * и когато не съвпаднат, човек тръгва да рови на ръка.
 *
 * Тук е другият въпрос — неговият: „когато се прочетат извлеченията… веднага
 * се хваща липсата и се намира по извлеченията или липсата на кешови фактури."
 * Затова редовете долу не са число, а СПИСЪК: кое движение няма фактура, коя
 * фактура няма движение.
 *
 * Разликата се показва и когато е НУЛА (правило 7): проверената нула е нещо
 * различно от нулата, за която никой не е питал.
 */
function blokNaSverkataDDS(r: RezultatSverka): string {
  const bezDvizheniya =
    r.dds_ot_fakturi_st === 0 && r.dds_ot_izvlecheniya_st === 0 && r.nesvarsheni.length === 0;

  return `
    <section class="karta${r.svereno || bezDvizheniya ? '' : ' izbrana'}">
      <div class="dyalglava">
        <h2>Сверка на ДДС</h2>
        <span>фактури ↔ извлечения ↔ внесено</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">ДДС от фактури</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_ot_fakturi_st)}</span>
          <span class="pod">каквото е въведено на ръка</span>
        </div>
        <div class="plochka">
          <span class="etiket">ДДС от извлечения</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_ot_izvlecheniya_st)}</span>
          <span class="pod">каквото е прочетено от таблица</span>
        </div>
        <div class="plochka">
          <span class="etiket">Внесено</span>
          <span class="chislo" translate="no">${kakvoPishe(r.dds_vneseno_st)}</span>
          <span class="pod">от платежното, на ръка</span>
        </div>
        <div class="plochka${r.razlika_st === 0 ? '' : ' trevoga'}">
          <span class="etiket">Разлика</span>
          <span class="chislo" translate="no">${kakvoPishe(r.razlika_st)}</span>
          <span class="pod">${
            bezDvizheniya
              ? 'няма движения за този месец'
              : r.razlika_st === 0
                ? 'проверена нула — не е „не е питано"'
                : 'виж КЪДЕ е, долу'
          }</span>
        </div>
      </div>

      <p class="drebno">${ekraniraj(bezDvizheniya ? 'Още няма нито фактури, нито прочетени извлечения за този месец.' : sDumi(r))}</p>

      ${
        r.nesvarsheni.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava nesvarshen">
          <span>Какво липсва</span><span>Движение</span><span>Дата</span>
          <span class="suma">Сума</span>
        </div>
        ${r.nesvarsheni
          .map(
            (n) => `<div class="red nesvarshen" translate="no">
            <span><span class="znachka trevoga">${
              n.prichina === 'lipsva-faktura' ? 'липсва фактура' : 'липсват пари'
            }</span></span>
            <span class="kletka"><b>${ekraniraj(n.dvizhenie.opisanie)}</b><span>${
              n.dvizhenie.dokument
                ? `док. ${ekraniraj(n.dvizhenie.dokument)}`
                : 'БЕЗ номер на документ — затова не се сдвоява'
            }</span></span>
            <span>${ekraniraj(n.dvizhenie.data)}</span>
            <span class="suma duljimo" data-st="${n.dvizhenie.suma_st}">${kakvoPishe(n.dvizhenie.suma_st)}</span>
          </div>`,
          )
          .join('')}
      </div>
      <p class="drebno">Сдвоява се по <b>номер на документ</b>, не по сума и дата: две фактури за 1200 € в един ден се случват, а два документа с един номер — не. Движение без номер не се преглъща, а стои тук.</p>`
      }
    </section>`;
}

function redNaSmetka(r: RedSmetka): string {
  return `
    <div class="red smetka" translate="no">
      <span class="kletka"><b>${ekraniraj(r.ime)}</b><span>${ekraniraj(r.belezhka)}</span></span>
      <span><span class="znachka ${r.posoka === 'приход' ? 'dobre' : 'tiha'}">${r.posoka}</span></span>
      <span>${r.broi}</span>
      <span class="suma${r.suma_st === 0 ? '' : r.posoka === 'приход' ? ' plateno' : ' duljimo'}" data-st="${r.suma_st}">${pishi(r.suma_st)}</span>
    </div>`;
}

function redNaDDS(r: RedDDS): string {
  return `
    <div class="red dds" translate="no">
      <span><span class="znachka ${r.strana === 'изход' ? 'dobre' : 'tiha'}">${r.strana}</span></span>
      <span class="kletka"><b>${ekraniraj(r.akumulator.sektor)}</b><span>${r.broi} ${
        r.strana === 'изход'
          ? r.broi === 1
            ? 'вземане'
            : 'вземания'
          : r.broi === 1
            ? 'разход'
            : 'разхода'
      } · ${pishi(r.obshta_st)} с ДДС</span></span>
      <span>${r.stavka}%</span>
      <span class="suma" data-st="${r.osnova_st}">${pishi(r.osnova_st)}</span>
      <span class="suma" data-st="${r.dds_st}">${pishi(r.dds_st)}</span>
    </div>`;
}

function kalkulator(): string {
  const redove = smyatane.map((r) => ({ ...r, razbivka: ddsOtObshta(r.obshta_st, r.stavka) }));
  const sborOsnova = redove.reduce((s, r) => s + r.razbivka.osnova_st, 0);
  const sborDDS = redove.reduce((s, r) => s + r.razbivka.dds_st, 0);
  const sborObshta = redove.reduce((s, r) => s + r.razbivka.obshta_st, 0);

  return `
    <section class="karta">
      <div class="dyalglava"><h2>Калкулатор</h2><span>обща цена → основа и ДДС</span></div>
      <form id="forma-smyatane">
        <div class="poleta">
          <div class="pole">
            <label for="smyatane-opis">За какво (по избор)</label>
            <input translate="no" id="smyatane-opis" name="opis" placeholder="напр. фактура 1042" autocomplete="off">
          </div>
          <div class="pole">
            <label for="smyatane-suma">Обща цена, € — с ДДС</label>
            <input translate="no" id="smyatane-suma" name="suma" required inputmode="decimal" placeholder="1200,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="smyatane-stavka">Ставка</label>
            <select translate="no" id="smyatane-stavka" name="stavka" required>
              ${STAVKI.map((st) => `<option value="${st}"${st === 20 ? ' selected' : ''}>${st}%</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <p class="greshka" id="greshka-smyatane"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Добави ред</button>
          ${smyatane.length ? '<button type="button" class="vtorichen" id="izchisti-smyatane">Изчисти</button>' : ''}
          <p class="drebno">Само смятане — нищо оттук не влиза в Журнала.</p>
        </div>
      </form>

      ${
        redove.length === 0
          ? ''
          : `<div class="tablitsa">
        <div class="glava smyatane">
          <span>Ред</span><span>Ставка</span>
          <span class="suma">Основа</span><span class="suma">ДДС</span><span class="suma">Общо</span>
        </div>
        ${redove
          .map(
            (r, i) => `
          <div class="red smyatane" translate="no">
            <span class="kletka"><b>${ekraniraj(r.opis || `ред ${i + 1}`)}</b></span>
            <span>${r.stavka}%</span>
            <span class="suma" data-st="${r.razbivka.osnova_st}">${kakvoPishe(r.razbivka.osnova_st)}</span>
            <span class="suma" data-st="${r.razbivka.dds_st}">${kakvoPishe(r.razbivka.dds_st)}</span>
            <span class="suma" data-st="${r.razbivka.obshta_st}">${kakvoPishe(r.razbivka.obshta_st)}</span>
          </div>`,
          )
          .join('')}
        <div class="red smyatane sbor" translate="no">
          <span><b>Сбор</b></span><span></span>
          <span class="suma" data-st="${sborOsnova}">${pishi(sborOsnova)}</span>
          <span class="suma" data-st="${sborDDS}">${pishi(sborDDS)}</span>
          <span class="suma" data-st="${sborObshta}">${pishi(sborObshta)}</span>
        </div>
      </div>`
      }
    </section>`;
}

export function zakachiSmetki(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  const formaPeriod = koren.querySelector<HTMLFormElement>('#forma-period');
  formaPeriod?.addEventListener('submit', async (e) => {
    e.preventDefault();
    period = String(new FormData(formaPeriod).get('period'));
    zapomniEkranno('smetki.period', period);
    await prerisuvay();
  });

  const formaSmyatane = koren.querySelector<HTMLFormElement>('#forma-smyatane');
  formaSmyatane?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-smyatane')!;
    greshka.textContent = '';
    const danni = new FormData(formaSmyatane);

    let obshta_st: number;
    try {
      obshta_st = otLeva(String(danni.get('suma')));
    } catch (err) {
      greshka.textContent = err instanceof GreshkaPari ? err.message : String(err);
      return;
    }

    smyatane = [
      ...smyatane,
      {
        opis: String(danni.get('opis') ?? '').trim(),
        obshta_st,
        stavka: Number(danni.get('stavka')),
      },
    ];
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#izchisti-smyatane')?.addEventListener('click', async () => {
    smyatane = [];
    await prerisuvay();
  });

  // ── салдото на един джоб ─────────────────────────────────────────────────
  const formaNaSaldo = koren.querySelector<HTMLFormElement>('#forma-saldo');
  formaNaSaldo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    greshkaSaldo = '';
    const izhod = koren.querySelector<HTMLElement>('#greshka-saldo')!;
    izhod.textContent = '';
    const danni = new FormData(formaNaSaldo);
    const buton = formaNaSaldo.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let saldo_st: number;
    let ot: string;
    try {
      saldo_st = otLeva(String(danni.get('suma')));
      ot = otData(String(danni.get('ot') ?? ''), 'Датата, от която важи салдото');
    } catch (err) {
      izhod.textContent =
        err instanceof GreshkaPari || err instanceof GreshkaData ? err.message : String(err);
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.zapishiSaldo(
        { kade: String(danni.get('kade')) as 'banka' | 'trezor', saldo_st, ot },
        { opId: opIdSaldo },
      );
      // нов opId чак СЛЕД успешен запис — дотогава повторното натискане е
      // същата операция и Журналът връща същия резултат (правило 5)
      opIdSaldo = crypto.randomUUID();
      k.vest('dobre', 'Салдото е записано.');
      await prerisuvay();
    } catch (err) {
      izhod.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── нов разход ───────────────────────────────────────────────────────────
  const formaRazhoda = koren.querySelector<HTMLFormElement>('#forma-razhod');
  formaRazhoda?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-razhod')!;
    greshka.textContent = '';
    const danni = new FormData(formaRazhoda);
    const buton = formaRazhoda.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let suma_st: number;
    let data: string;
    try {
      suma_st = otLeva(String(danni.get('suma')));
      data = otData(String(danni.get('data') ?? ''), 'Датата на разхода');
    } catch (err) {
      greshka.textContent =
        err instanceof GreshkaPari || err instanceof GreshkaData ? err.message : String(err);
      return;
    }
    if (suma_st <= 0) {
      greshka.textContent = 'Сумата трябва да е повече от нула.';
      return;
    }

    // Заплатите и кредитите си носят сектора — изборът важи само за фактурите.
    const potokKlyuch = String(danni.get('potok'));
    const sektor = potokKlyuch === 'fakturi' ? String(danni.get('sektor')) : potokKlyuch;
    // Ставката се пита само при фактури; заплатите и кредитите си носят нула.
    const stavka = potokKlyuch === 'fakturi' ? Number(danni.get('stavka')) : 0;

    buton.disabled = true;
    try {
      await k.deystviya.zapishiRazhod(
        `R:${crypto.randomUUID()}`,
        {
          potok: potokKlyuch,
          dostavchik: String(danni.get('dostavchik')).trim(),
          opis: String(danni.get('opis')).trim(),
          suma_st,
          sektor,
          nachin: String(danni.get('nachin')) as 'банка' | 'в брой',
          data,
          dokument: String(danni.get('dokument') ?? '').trim(),
          stavka,
        },
        { opId: opIdRazhod },
      );
      opIdRazhod = crypto.randomUUID();
      k.vest('dobre', 'Разходът е записан. Входящият ДДС влезе в акумулатора си.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    } finally {
      buton.disabled = false;
    }
  });

  // ── справката: подаване, внасяне, отключване ─────────────────────────────
  const mesets = period ?? new Date().toISOString().slice(0, 7);

  const formaSpravka = koren.querySelector<HTMLFormElement>('#forma-spravka');
  formaSpravka?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-spravka')!;
    greshka.textContent = '';
    const danni = new FormData(formaSpravka);
    try {
      await k.deystviya.podaySpravka(
        {
          period: mesets,
          dds_deklarirano_st: otLeva(String(danni.get('dds'))),
          data: otData(String(danni.get('data') ?? ''), 'Датата на подаване'),
          belezhka: String(danni.get('belezhka') ?? '').trim(),
        },
        { opId: opIdSpravka },
      );
      opIdSpravka = crypto.randomUUID();
      k.vest('dobre', `Справката е записана. ${mesets} е заключен — поправка само през сверена промяна.`);
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    }
  });

  const formaDDS = koren.querySelector<HTMLFormElement>('#forma-dds-plateno');
  formaDDS?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-dds')!;
    greshka.textContent = '';
    const danni = new FormData(formaDDS);
    try {
      const data = otData(String(danni.get('data') ?? ''), 'Датата на плащането');
      await k.deystviya.platiDDS(
        `DP:${mesets}:${crypto.randomUUID()}`,
        {
          period: mesets,
          suma_st: otLeva(String(danni.get('suma'))),
          data,
          nachin: String(danni.get('nachin')) as 'банка' | 'в брой',
        },
        { opId: `dds-plateno:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Внесеното е записано. Разликата с декларираното се вижда горе.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = dumiZaGreshka(err);
    }
  });

  koren.querySelector<HTMLButtonElement>('[data-otkluchi]')?.addEventListener('click', async (e) => {
    const buton = e.currentTarget as HTMLButtonElement;
    const izhod = await opitajStorno(k, Number(buton.dataset['otkluchi']), VID.spravka, 'справката');
    if (izhod.kazano) k.vest(izhod.vid, izhod.kazano);
    await prerisuvay();
  });

  // ── сторно на разход ─────────────────────────────────────────────────────
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-storno-razhod]')) {
    b.addEventListener('click', async () => {
      b.disabled = true;
      const izhod = await opitajStorno(k, Number(b.dataset['stornoRazhod']), VID.razhod, 'разходът');
      if (izhod.kazano) k.vest(izhod.vid, izhod.kazano);
      await prerisuvay();
    });
  }
}
