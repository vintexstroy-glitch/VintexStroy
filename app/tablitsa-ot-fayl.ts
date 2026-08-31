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
import { otXLSXSFormuli } from '../src/iztochnik/xlsx.js';
import { otCSV, tekstOtBaytove } from '../src/iztochnik/csv.js';
import {
  predlozhiTablitsa,
  sDumi,
  type PredlozhenieZaTablitsa,
} from '../src/domein/tablitsa-ot-fayl.js';
import { IMENA_NA_DEYSTVIYATA } from '../src/domein/formuli.js';
import { IMENA_NA_VIDOVETE_STOYNOST } from '../src/domein/vid-stoynost.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import type { Konteks } from './ekranite.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';
import type { RedNaTablitsa } from '../src/domein/redove-na-tablitsa.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { kakvoPishe, otSuma, stotinki } from '../src/yadro/pari.js';
import {
  redovete,
  sborNaKolona,
  sveriRedovete,
  vidaNaKolonata,
  zatvorenaE,
} from '../src/domein/redove-na-tablitsa.js';
import { razrezPoKolona, sveriRazreza } from '../src/domein/razrez.js';

/** Каквото е прочетено, докато човекът не потвърди · нула събития дотогава. */
let predlozhenie: PredlozhenieZaTablitsa | undefined;
let imeNaFayla = '';
let otpechatakNaFayla = '';
let greshka = '';

/** КОЯ създадена таблица гледам · памет на екрана, не факт (ADR-022). */
let izbranaTablitsa = '';

/** ПО КОЯ колона е разрезът · празно значи „без разрез" (резен 59). */
let razrezPo = '';

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
        <input translate="no" type="file" id="fayl-tablitsa" accept=".xlsx,.csv" hidden>
      </div>
      <p class="greshka" id="greshka-tablitsa-fayl">${ekraniraj(greshka)}</p>

      ${predlozhenie === undefined ? '' : predlozhenieto(predlozhenie)}
    </section>
    ${blokNaSazdadenite(o)}`;
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
function blokNaSazdadenite(o: Ogledalo): string {
  const vsichki = [...o.tablitsiOtFayl.values()].sort((a, b) =>
    a.klyuch < b.klyuch ? -1 : a.klyuch > b.klyuch ? 1 : 0,
  );
  if (vsichki.length === 0) {
    return `
    <section data-sektsiya="sazdadenite-tablitsi">
      <div class="dyalglava">
        <h2>Създадените таблици</h2>
        <span>тук ще стоят таблиците, направени от файл — с редовете си</span>
      </div>
      <p class="drebno">Още няма нито една. Прочети таблица от папката горе.</p>
    </section>`;
  }

  const t = vsichki.find((x) => x.klyuch === izbranaTablitsa) ?? vsichki[0]!;
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

      ${blokNaRazreza(t, redove, nomera)}

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
          <span class="kletka">${ekraniraj(IMENA_NA_VIDOVETE_STOYNOST[k.vid])}</span>
          <span class="kletka">${
            k.formula === undefined
              ? '—'
              : ekraniraj(
                  `${IMENA_NA_DEYSTVIYATA[k.formula.deystvie]} на ${k.formula.ot
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
      if (/\.csv$/i.test(fayl.name)) {
        // CSV НЯМА формули · и това не е дефект, а свойство на формата.
        predlozhenie = predlozhiTablitsa(otCSV(tekstOtBaytove(baytove), fayl.name), new Map());
      } else {
        const { tablitsi, formuli } = await otXLSXSFormuli(baytove, fayl.name);
        predlozhenie = predlozhiTablitsa(tablitsi[0]!, formuli[0]!.poKolona);
      }
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

  koren.querySelector<HTMLSelectElement>('#izbor-razrez')?.addEventListener('change', async (e) => {
    razrezPo = (e.target as HTMLSelectElement).value;
    await prerisuvay();
  });

  const formaRed = koren.querySelector<HTMLFormElement>('#forma-red-na-tablitsa');
  formaRed?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const o = await k.deystviya.ogledalo();
    const t = o.tablitsiOtFayl.get(izbranaTablitsa) ?? [...o.tablitsiOtFayl.values()][0];
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
      const t = o.tablitsiOtFayl.get(izbranaTablitsa) ?? [...o.tablitsiOtFayl.values()][0];
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
          otFayl: imeNaFayla,
          otpechatak: otpechatakNaFayla,
          glavi: p.koloni.map((x) => x.ime),
          vidove: Object.fromEntries(p.koloni.map((x) => [x.nomer, x.vid])),
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
      k.vest('dobre', `Таблицата „${ime}" е създадена · ${p.kopirani} копирани формули.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
