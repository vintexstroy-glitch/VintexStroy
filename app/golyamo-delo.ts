/**
 * ГОЛЯМОТО ДЕЛО · табът, който се появява ПРИ ПОИСКВАНЕ (резен 110 · ADR-166).
 *
 * Негово, 03.09, с линейния график и КСС в ръка:
 *
 *   „Дори Гоялмо Дело се появява като отделен таб при посикване и само там
 *   може да вкараш линеен график и да направиш Линейния график с тажлицата и
 *   диаграмата от модела на Гант. Тогава ще може да го има и в Управление и в
 *   Сметки. Там ще се прибира към ИМот на който принадлежи… Изгради малка
 *   примерна част само, не цялото."
 *
 * ═══ „ПРИ ПОИСКВАНЕ" ═══
 *
 * Пунктът НЕ стои винаги в лентата. Появява се, когато под някой Имот има
 * ЖИВО голямо дело — тоест когато човекът е поискал дървото на строежа и го е
 * записал (резен 104 · ADR-165). Няма голямо дело — няма таб; и това не е
 * скриване по право (правило 15), а липса на предмет: екранът работи ВЪРХУ
 * голямото дело.
 *
 * ═══ „САМО ТАМ МОЖЕ ДА ВКАРАШ ЛИНЕЕН ГРАФИК" ═══
 *
 * Входът е ЕДИН и е тук. Показването е на ДВЕ места, защото прочетеното става
 * ДЕЛА: Управление ги рисува в своя Гант, Сметки — в своя. Нищо не се
 * дублира — един запис, два погледа.
 *
 * ═══ КАКВО ПИШЕ И КАКВО НЕ ═══
 *
 * Линейният график се ЧЕТЕ тук и се ЗАПИСВА с бутон — човекът, не машината
 * (правило 18). Всяко дело носи `opId` от номера си във файла, значи второ
 * четене на същия файл поправя същите редове, вместо да ги удвои (правило 5).
 * Сверката вход↔изход се КАЗВА, и когато е нула (правило 7).
 *
 * КСС-ът се чете и се ПОКАЗВА — в Сметки. Той не влиза в Журнала: числата му
 * са на ЧУЖД файл, в чужда валута, и са ОФЕРТА, не платен разход. Да ги
 * запишем като пари би значело да смесим намерение с факт.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { otPDF } from '../src/iztochnik/pdf.js';
import {
  opIdNaRedOtGrafika,
  prochetiGrafik,
  type ProchetenGrafik,
} from '../src/domein/lineen-grafik.js';
import { nevarzaniRedove, prochetiKSS, type ProchetenaKSS } from '../src/domein/kss.js';
import { zhiviyatKoren } from '../src/domein/darvo-na-stroezha.js';
import { zhivite, type Delo } from '../src/domein/dela.js';
import { reshetka } from '../src/domein/gant.js';
import { narisuvayDiagrama } from './gant-diagrama.js';
import { tablitsataSOcveteniPoleta } from './gant.js';
import { svedenotoMyasto } from '../src/domein/mesta.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/**
 * ПРОЧЕТЕНОТО ЖИВЕЕ В ПАМЕТТА НА МОДУЛА, не на екрана.
 *
 * „Данни не влизат никога" в паметта на устройството (ADR-022): това са
 * ЧУЖДИ редове, показани преди решение. Презареждане ги губи — и това е
 * вярното поведение: файлът е в ръцете на човека, а решението е бутонът.
 * Същата шарка като предложението за дървото в Имоти (ADR-165).
 */
let grafikat: { readonly myasto: string; readonly fayl: string; readonly chetene: ProchetenGrafik } | null =
  null;
let kss: { readonly myasto: string; readonly fayl: string; readonly chetene: ProchetenaKSS } | null = null;

/**
  * КОЙ ИМОТ ГЛЕДАМЕ · поглед, нула събития — и ЕДНА сметка (правило 17).
  *
  * Паметта е празна, докато човекът не смени менюто; тогава се гледа ПЪРВИЯТ
  * Имот със строеж — същият, който менюто показва избран. Две сметки за това
  * („паметта" при рисуване и „менюто" при четене на файл) се разминаха веднага:
  * проходът прочете графика и екранът каза „още няма прочетен график", защото
  * прочетеното беше закачено за „Гълъбец", а погледът питаше за празно.
  */
function izbraniyatImot(imoti: readonly string[]): string {
  const zapomnen = chetiEkranno('golyamodelo.imot', '');
  return zapomnen !== '' ? zapomnen : (imoti[0] ?? '');
}

/** Имотите с ЖИВО голямо дело · те и само те имат какво да показват тук. */
function imotiSGolyamoDelo(o: Ogledalo): readonly string[] {
  const zhiviDela = zhivite([...o.dela.values()]);
  const imena = new Map<string, string>();
  for (const d of zhiviDela) {
    if (zhiviyatKoren(zhiviDela, d.myasto) !== undefined) {
      imena.set(svedenotoMyasto(d.myasto), d.myasto);
    }
  }
  return Object.freeze([...imena.values()].sort((a, b) => a.localeCompare(b, 'bg')));
}

/** Има ли изобщо голямо дело · оттам зависи дали пунктът стои в лентата. */
export function imaGolyamoDelo(o: Ogledalo): boolean {
  return imotiSGolyamoDelo(o).length > 0;
}

/** Прочетеното КСС · Сметки го показва, докато стои в паметта (нула събития). */
export function prochetenoKSS(): {
  readonly myasto: string;
  readonly fayl: string;
  readonly chetene: ProchetenaKSS;
} | null {
  return kss;
}

/** Делата за ПРЕГЛЕД · истински `Delo`-та, но с измислени id и НЕзаписани. */
function delataZaPregled(g: ProchetenGrafik, myasto: string, dnes: string): readonly Delo[] {
  return g.redove.map((r, i) => ({
    id: `PREGLED:${r.nomer}`,
    seq: i,
    myasto,
    obekt: '',
    ime: r.ime,
    chas: '',
    otgovornik: '',
    ot: r.ot,
    do: r.do,
    otsenka: 'важно-неспешно' as const,
    sastoyanie: 'чака' as const,
    nadDelo: r.nadNomer === '' ? '' : `PREGLED:${r.nadNomer}`,
    dokument: '',
    promeneno: dnes,
    promeniGo: '',
  }));
}

function blokNaGrafika(izbran: string, dnes: string): string {
  const g = grafikat;
  if (g === null || g.myasto !== izbran) {
    return `
      <p class="drebno" data-grafik-redove="0">Още няма прочетен график. Файлът се
      ЧЕТЕ тук и се записва с бутон — машината предлага, човекът записва
      (правило 18).</p>`;
  }
  const dela = delataZaPregled(g.chetene, g.myasto, dnes);
  const r = reshetka(dela, 'sedmitsa', dnes);
  const nayDalboko = g.chetene.redove.reduce((s, x) => Math.max(s, x.stepen), 0);
  return `
    <p class="drebno" data-grafik-redove="${g.chetene.redove.length}"
       data-grafik-nomera="${g.chetene.nomera}" data-grafik-stepeni="${nayDalboko + 1}">
      От „${ekraniraj(g.fayl)}": <b>${g.chetene.redove.length}</b> от
      ${g.chetene.nomera} реда · ${nayDalboko + 1}
      ${nayDalboko + 1 === 1 ? 'степен' : 'степени'} на дървото ·
      пропуснати ${g.chetene.propusnati}. Нищо не е записано още.</p>
    <div class="gant-dvete">
      <div class="gant-tablitsata">${tablitsataSOcveteniPoleta(dela, r, [], dnes, false, false)}</div>
      <div class="gant-diagramata">${narisuvayDiagrama(dela, r, dnes)}</div>
    </div>
    <p>
      <button type="button" class="glaven" id="grafik-zapishi">Запиши ${g.chetene.redove.length} дела под „${ekraniraj(g.myasto)}"</button>
      <button type="button" class="vtorichen" id="grafik-otkazhi">Не сега</button>
    </p>`;
}

function blokNaKSS(izbran: string): string {
  const k = kss;
  if (k === null || k.myasto !== izbran) {
    return `<p class="drebno" data-kss-redove="0">Още няма прочетена сметка.</p>`;
  }
  const nevarzani = nevarzaniRedove(k.chetene);
  const pishi = (st: number): string => (st / 100).toFixed(2).replace('.', ',');
  return `
    <p class="drebno" data-kss-redove="${k.chetene.redove.length}"
       data-kss-razlika="${k.chetene.razlika_st}" data-kss-nevarzani="${nevarzani.length}">
      От „${ekraniraj(k.fayl)}": <b>${k.chetene.redove.length}</b> реда · сбор
      <b translate="no">${pishi(k.chetene.sbor_st)}</b> ·
      ${
        k.chetene.obyaven_st === 0
          ? 'файлът не казва свой сбор — сверката е само по редовете'
          : `файлът казва <span translate="no">${pishi(k.chetene.obyaven_st)}</span> · разлика <b translate="no">${pishi(k.chetene.razlika_st)}</b>`
      } · пропуснати ${k.chetene.propusnati} ·
      невързани ${nevarzani.length} (количество × цена ≠ стойност).</p>
    <div class="tablitsa" data-tablitsa="kss">
      <div class="red glava" translate="no">
        <span>№</span><span>Работа</span><span>Мярка</span>
        <span class="suma">Количество</span><span class="suma">Ед. цена</span><span class="suma">Стойност</span>
      </div>
      ${k.chetene.redove
        .slice(0, 40)
        .map(
          (r) => `<div class="red kss" data-kss-nomer="${ekraniraj(r.nomer)}">
            <span translate="no">${ekraniraj(r.nomer)}</span>
            <span translate="no">${ekraniraj(r.opisanie)}</span>
            <span translate="no">${ekraniraj(r.myarka)}</span>
            <span class="suma" translate="no">${(r.kolichestvo_hil / 1000).toFixed(2).replace('.', ',')}</span>
            <span class="suma" translate="no">${pishi(r.edinichna_st)}</span>
            <span class="suma${r.smetnato_st === r.stoynost_st ? '' : ' zle'}" translate="no">${pishi(r.stoynost_st)}</span>
          </div>`,
        )
        .join('')}
    </div>
    ${k.chetene.redove.length > 40 ? `<p class="drebno">Показани са първите 40 от ${k.chetene.redove.length} — това е примерна част, не целият внос.</p>` : ''}`;
}

export function narisuvayGolyamoDelo(o: Ogledalo, dnes: string): string {
  const imoti = imotiSGolyamoDelo(o);
  const izbran = izbraniyatImot(imoti);
  return `
    <section class="karta" data-sektsiya="golyamo-delo-imot">
      <div class="dyalglava">
        <h2>Голямото дело</h2>
        <span data-imoti-s-darvo="${imoti.length}">${imoti.length} ${imoti.length === 1 ? 'имот със строеж' : 'имота със строеж'}</span>
      </div>
      <label class="pole">
        <span>Имот</span>
        <select translate="no" id="gd-imot">
          ${imoti
            .map(
              (i) =>
                `<option value="${ekraniraj(i)}"${svedenotoMyasto(i) === svedenotoMyasto(izbran) ? ' selected' : ''}>${ekraniraj(i)}</option>`,
            )
            .join('')}
        </select>
      </label>
      <p class="drebno">Този таб го има, защото под Имота стои живо <b>голямо
      дело</b> (резен 104). Прочетеното тук се прибира към него — „Там ще се
      прибира към ИМот на който принадлежи".</p>
    </section>

    <section class="karta" data-sektsiya="golyamo-delo-grafik">
      <div class="dyalglava">
        <h2>Линейният график</h2>
        <span>за Управление · таблицата и диаграмата са от модела на Гант</span>
      </div>
      <p>
        <button type="button" class="vtorichen" id="gd-cheti-grafik">Чети линеен график</button>
        <input translate="no" type="file" id="gd-fayl-grafik" accept=".pdf" hidden>
      </p>
      ${blokNaGrafika(izbran, dnes)}
    </section>

    <section class="karta" data-sektsiya="golyamo-delo-kss">
      <div class="dyalglava">
        <h2>Количествено-стойностната сметка</h2>
        <span>за Сметки · чете се и се показва, в Журнала не влиза</span>
      </div>
      <p>
        <button type="button" class="vtorichen" id="gd-cheti-kss">Чети КСС</button>
        <input translate="no" type="file" id="gd-fayl-kss" accept=".pdf" hidden>
      </p>
      ${blokNaKSS(izbran)}
      <p class="drebno">Числата са на ЧУЖД файл и са ОФЕРТА, не платен разход:
      затова се показват, а не се записват. Валутата на книгата е една и няма
      курс (правило 3) — прочетеното си остава число на файла.</p>
    </section>`;
}

export function zakachiGolyamoDelo(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
  dnes: string,
): void {
  const izbor = koren.querySelector<HTMLSelectElement>('#gd-imot');
  izbor?.addEventListener('change', async () => {
    zapomniEkranno('golyamodelo.imot', izbor.value);
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#gd-cheti-grafik')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#gd-fayl-grafik')?.click();
  });
  koren.querySelector<HTMLInputElement>('#gd-fayl-grafik')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const prochetten = await otPDF(new Uint8Array(await fayl.arrayBuffer()));
      const chetene = prochetiGrafik(prochetten.stranitsi);
      if (chetene.redove.length === 0) {
        throw new Error(
          `Във „${fayl.name}" не се намери линеен график с колони ID · Task Name · Start · Finish. ` +
            'Изнеси го от MS Project като ПДФ с тези колони.',
        );
      }
      grafikat = { myasto: izbor?.value ?? '', fayl: fayl.name, chetene };
      k.vest(
        'dobre',
        `Прочетени ${chetene.redove.length} реда от ${chetene.nomera} · записва се с бутона, не сега.`,
      );
    } catch (err) {
      k.vest('zle', dumiZaGreshka(err));
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#gd-cheti-kss')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#gd-fayl-kss')?.click();
  });
  koren.querySelector<HTMLInputElement>('#gd-fayl-kss')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const prochetten = await otPDF(new Uint8Array(await fayl.arrayBuffer()));
      const chetene = prochetiKSS(prochetten.stranitsi);
      if (chetene.redove.length === 0) {
        throw new Error(
          `Във „${fayl.name}" не се намериха редове с количество, единична цена и стойност.`,
        );
      }
      kss = { myasto: izbor?.value ?? '', fayl: fayl.name, chetene };
      k.vest(
        'dobre',
        `Прочетени ${chetene.redove.length} реда · сборът им се вижда и в Сметки, докато файлът стои отворен.`,
      );
    } catch (err) {
      k.vest('zle', dumiZaGreshka(err));
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#grafik-otkazhi')?.addEventListener('click', async () => {
    grafikat = null;
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#grafik-zapishi')?.addEventListener('click', async () => {
    const g = grafikat;
    if (g === null) return;
    const ogledalo = await k.deystviya.ogledalo();
    const koren4 = zhiviyatKoren(zhivite([...ogledalo.dela.values()]), g.myasto);
    if (koren4 === undefined) {
      k.vest('zle', `Под „${g.myasto}" няма живо голямо дело — графикът няма за какво да се закачи.`);
      return;
    }
    // Номерът от файла → id на записаното дело · родителят се записва ПРЕДИ
    // детето, защото MS Project изнася дървото отгоре надолу.
    const idPoNomer = new Map<string, string>();
    let zapisani = 0;
    try {
      for (const red of g.chetene.redove) {
        const id = `D:${crypto.randomUUID()}`;
        const nadDelo = red.nadNomer === '' ? koren4.id : (idPoNomer.get(red.nadNomer) ?? koren4.id);
        await k.deystviya.zapishiDelo(
          id,
          {
            myasto: g.myasto,
            obekt: '',
            ime: red.ime,
            otgovornik: k.kojSam.imeyl,
            ot: red.ot,
            do: red.do,
            chas: '',
            otsenka: 'важно-неспешно',
            sastoyanie: 'чака',
            nadDelo,
            dokument: '',
          },
          { opId: opIdNaRedOtGrafika(g.myasto, red.nomer) },
        );
        idPoNomer.set(red.nomer, id);
        zapisani += 1;
      }
    } catch (err) {
      k.vest('zle', dumiZaGreshka(err));
      return;
    }
    const razlika = g.chetene.redove.length - zapisani;
    k.vest(
      razlika === 0 ? 'dobre' : 'zle',
      `Линейният график е записан: ${zapisani} от ${g.chetene.redove.length} дела · разлика ${razlika}. ` +
        'Стоят под голямото дело — виждат се и в Управление, и в Сметки.',
    );
    grafikat = null;
    await prerisuvay();
  });
}
