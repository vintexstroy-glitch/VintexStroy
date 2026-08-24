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

import { otData, GreshkaData } from '../src/yadro/data.js';
import { pishi } from '../src/yadro/pari.js';
import {
  IMENA_NA_OTSENKITE,
  OTSENKI,
  podredi,
  SASTOYANIYA,
  svetofar,
  vidimi,
  imaPoddela,
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
import { ekraniraj } from './imoti.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { narisuvayDiagrama } from './gant-diagrama.js';
import type { Konteks } from './main.js';

/**
 * Погледът на Ганта СЕ ПОМНИ (ADR-022): тактът, трите филтъра, сгънатите дела
 * и изборът таблица/диаграма се отварят както са оставени. Екранно огледало —
 * какво се гледа, не какво е вярно; делата са си в Журнала.
 */
let takt: Takt = chetiEkranno<Takt>('gant.takt', 'mesets');
/** Кои дела са сгънати · само дела и поддела се сгъват (И88). */
const sgunati = new Set<string>(chetiEkranno<string[]>('gant.sgunati', []));
/** Показва ли се диаграмата вместо таблицата с оцветени полета. */
let diagrama = chetiEkranno('gant.diagrama', false);
let opIdDelo = crypto.randomUUID();
let greshkaDelo = '';
/** Трите филтъра на трите колони (И82) — плоско, не дърво. */
let filtarMyasto = chetiEkranno('gant.myasto', '');
let filtarObekt = chetiEkranno('gant.obekt', '');
let filtarOtsenka = chetiEkranno('gant.otsenka', '');

function zapomniPogleda(): void {
  zapomniEkranno('gant.takt', takt);
  zapomniEkranno('gant.sgunati', [...sgunati]);
  zapomniEkranno('gant.diagrama', diagrama);
  zapomniEkranno('gant.myasto', filtarMyasto);
  zapomniEkranno('gant.obekt', filtarObekt);
  zapomniEkranno('gant.otsenka', filtarOtsenka);
}

export function narisuvayGant(o: Ogledalo, dnes: string): string {
  const vsichki = [...o.dela.values()];
  const podredeni = podredi(vsichki, dnes);
  const filtrirani = podredeni.filter(
    (d) =>
      (!filtarMyasto || d.myasto === filtarMyasto) &&
      (!filtarObekt || d.obekt === filtarObekt) &&
      (!filtarOtsenka || d.otsenka === filtarOtsenka),
  );
  const naEkrana = vidimi(filtrirani, sgunati);
  const r = reshetka(naEkrana, takt, dnes);
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

    <section class="karta">
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
          diagrama ? 'Таблица с оцветени полета' : 'Диаграма'
        }</button>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="f-myasto">Място</label>
          <select id="f-myasto">${opcii(mesta, filtarMyasto, 'всички')}</select>
        </div>
        <div class="pole">
          <label for="f-obekt">Обект</label>
          <select id="f-obekt">${opcii(obekti, filtarObekt, 'всички')}</select>
        </div>
        <div class="pole">
          <label for="f-otsenka">Оценка</label>
          <select id="f-otsenka">${opciiOtsenki(filtarOtsenka)}</select>
        </div>
      </div>
      <p class="drebno">Три колони с филтри, не три нива — филтрира се по която и да е, независимо от другите.</p>
    </section>

    ${
      naEkrana.length === 0
        ? '<p class="prazno">Няма дела.<br>Времевият ред се пълни отдолу — Мястото е първата колона, Делото третата.</p>'
        : diagrama
          ? narisuvayDiagrama(naEkrana, r, dnes)
          : tablitsataSOcveteniPoleta(naEkrana, r, sumi, dnes)
    }

    ${formaDelo(o, dnes)}`;
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
 */
function tablitsataSOcveteniPoleta(
  dela: readonly Delo[],
  r: ReturnType<typeof reshetka>,
  sumi: readonly { prihod_st: number; razhod_st: number }[],
  dnes: string,
): string {
  const poMyasto = new Map<string, Delo[]>();
  for (const d of dela) {
    const spisak = poMyasto.get(d.myasto) ?? [];
    spisak.push(d);
    poMyasto.set(d.myasto, spisak);
  }
  const lenta = new Map(r.lenti.map((l) => [l.deloId, l]));

  return `
    <section>
      <div class="dyalglava">
        <h2>Управление на Времевия Ред в Делата</h2>
        <span>${dela.length} дела · първата колона е ДНЕС</span>
      </div>
      <div class="gant" data-koloni="${r.koloni.length}">
        <div class="gant-imena">
          <div class="gant-glava">Място · Обект · Дело</div>
          ${[...poMyasto.entries()]
            .map(
              ([myasto, spisak]) => `
            <div class="gant-myasto" title="Мястото е колона — не се сгъва (И88)">${ekraniraj(myasto)}</div>
            ${spisak.map((d) => imeNaDeloto(d, dela, dnes)).join('')}`,
            )
            .join('')}
          <div class="gant-sbor">Приход · Разход</div>
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
                        }" data-ot="${l.ot + 1}" data-broy="${l.broy}"
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
          <div class="gant-red sumi">
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
          </div>
        </div>
      </div>
      <p class="drebno">Лентите НЕ се влачат — срокът се мени от полето за срок, за да остане следа в Журнала.
      Излизащото извън прозореца носи ‹ или › вместо да се отреже мълчешком.</p>
    </section>`;
}

function kletka(dnes: boolean): string {
  return `<span class="gant-kletka${dnes ? ' dnes' : ''}"></span>`;
}

function imeNaDeloto(d: Delo, vsichki: readonly Delo[], dnes: string): string {
  const sgavaemo = imaPoddela(vsichki, d.id);
  return `<div class="gant-delo ${svetofar(d, dnes)}${d.nadDelo ? ' poddelo' : ''}" data-ime="${ekraniraj(d.id)}">
    ${
      sgavaemo
        ? `<button type="button" class="sgavach" data-sgavi="${ekraniraj(d.id)}" aria-label="сгъни">${
            sgunati.has(d.id) ? '▸' : '▾'
          }</button>`
        : '<span class="sgavach prazen"></span>'
    }
    <b>${ekraniraj(d.ime)}</b>
    <span class="drebno">${ekraniraj(d.obekt || '—')} · ${ekraniraj(d.otgovornik)}</span>
  </div>`;
}

function formaDelo(o: Ogledalo, dnes: string): string {
  return `
    <section class="karta">
      <div class="dyalglava"><h2>Ново дело</h2><span>Място · Обект · Дело — трите колони</span></div>
      <form id="forma-delo">
        <div class="poleta">
          <div class="pole">
            <label for="d-myasto">Място</label>
            <input id="d-myasto" name="myasto" required placeholder="Малинова">
          </div>
          <div class="pole">
            <label for="d-obekt">Обект</label>
            <input id="d-obekt" name="obekt" placeholder="може да е празно">
          </div>
          <div class="pole">
            <label for="d-ime">Дело</label>
            <input id="d-ime" name="ime" required placeholder="Акт 15">
          </div>
          <div class="pole">
            <label for="d-otgovornik">Отговорник</label>
            <input id="d-otgovornik" name="otgovornik" required placeholder="Николай Петков">
          </div>
          <div class="pole">
            <label for="d-ot">От</label>
            <input translate="no" id="d-ot" name="ot" type="date" value="${dnes}" required>
          </div>
          <div class="pole">
            <label for="d-do">До</label>
            <input translate="no" id="d-do" name="do" type="date" value="${dnes}" required>
          </div>
          <div class="pole">
            <label for="d-otsenka">Оценка</label>
            <select id="d-otsenka" name="otsenka">
              ${OTSENKI.map((x) => `<option value="${x}">${IMENA_NA_OTSENKITE[x]}</option>`).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="d-sastoyanie">Състояние</label>
            <select id="d-sastoyanie" name="sastoyanie">
              ${SASTOYANIYA.map((x) => `<option value="${x}">${x}</option>`).join('')}
            </select>
          </div>
          <div class="pole">
            <label for="d-nad">Поддело на</label>
            <select id="d-nad" name="nadDelo">
              <option value="">— самостоятелно —</option>
              ${[...o.dela.values()]
                .map((d) => `<option value="${ekraniraj(d.id)}">${ekraniraj(d.ime)}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="deystviya">
          <button type="submit">Запиши делото</button>
          <p class="greshka" id="greshka-delo">${ekraniraj(greshkaDelo)}</p>
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
 */
function slozhiShirinite(koren: HTMLElement): void {
  const gant = koren.querySelector<HTMLElement>('.gant');
  if (gant) {
    const broy = Number(gant.dataset.koloni ?? 0);
    gant.style.setProperty('--vreme', `repeat(${broy}, minmax(34px, 1fr))`);
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
): void {
  slozhiShirinite(koren);

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-takt]')) {
    b.addEventListener('click', async () => {
      takt = b.dataset.takt as Takt;
      zapomniPogleda();
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sgavi]')) {
    b.addEventListener('click', async () => {
      const id = b.dataset.sgavi!;
      if (sgunati.has(id)) sgunati.delete(id);
      else sgunati.add(id);
      zapomniPogleda();
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
    filtarMyasto = '';
    filtarObekt = '';
    filtarOtsenka = 'спешно-важно';
    sgunati.clear();
    zapomniPogleda();
    await prerisuvay();
    koren.querySelector<HTMLElement>('#gant-vreme .dnes')?.scrollIntoView({
      inline: 'start',
      block: 'nearest',
    });
  });

  koren.querySelector<HTMLButtonElement>('#kam-diagrama')?.addEventListener('click', async () => {
    diagrama = !diagrama;
    zapomniPogleda();
    await prerisuvay();
  });

  const vrazhi = (id: string, kam: (v: string) => void) => {
    koren.querySelector<HTMLSelectElement>(id)?.addEventListener('change', async (e) => {
      kam((e.target as HTMLSelectElement).value);
      await prerisuvay();
    });
  };
  vrazhi('#f-myasto', (v) => {
    filtarMyasto = v;
    zapomniPogleda();
  });
  vrazhi('#f-obekt', (v) => {
    filtarObekt = v;
    zapomniPogleda();
  });
  vrazhi('#f-otsenka', (v) => {
    filtarOtsenka = v;
    zapomniPogleda();
  });

  const forma = koren.querySelector<HTMLFormElement>('#forma-delo');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const izhod = koren.querySelector<HTMLElement>('#greshka-delo')!;
    izhod.textContent = '';
    const d = new FormData(forma);
    const buton = forma.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let ot: string;
    let doData: string;
    try {
      ot = otData(String(d.get('ot') ?? ''), 'Началото на делото');
      doData = otData(String(d.get('do') ?? ''), 'Краят на делото');
    } catch (err) {
      izhod.textContent = err instanceof GreshkaData ? err.message : String(err);
      return;
    }
    if (doData < ot) {
      izhod.textContent = 'Краят не може да е преди началото.';
      return;
    }

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
      k.vest('dobre', 'Делото е записано.');
      await prerisuvay();
    } catch (err) {
      izhod.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
    }
  });
}
