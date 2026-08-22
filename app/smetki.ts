/**
 * Екран „Сметки" — потоците пари и ДДС-то на ОТДЕЛЕН РЕД.
 *
 * Думата на собственика: цените са общи, с ДДС вътре; ДДС-то не се разделя
 * при наема, а се смята тук, на свой ред, и се разбива по акумулатори.
 *
 * Нищо на този екран не пише в Журнала. Всичко е изведено от Огледалото и се
 * преизчислява при всяко показване — включително сверката.
 */

import { GreshkaPari, kakvoPishe, otLeva } from '../src/yadro/pari.js';
import { GreshkaData, otData } from '../src/yadro/data.js';
import { AKUMULATORI, akumulator, ddsOtObshta, sektoriNaRazhod } from '../src/domein/dds.js';
import {
  MERKA,
  potok,
  potototsiNaRazhod,
  razhodiZaPerioda,
  smetki,
  type RedDDS,
  type RedSmetka,
} from '../src/domein/smetki.js';
import { VID } from '../src/domein/sabitiya.js';
import type { Ogledalo, Razhod } from '../src/ogledalo/ogledalo.js';
import { ekraniraj } from './imoti.js';
import { opitajStorno } from './storno.js';
import type { Konteks } from './main.js';

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdRazhod = crypto.randomUUID();

/** Кой месец се гледа. Живее, докато екранът стои отворен. */
let period: string | null = null;

/** Редовете на Калкулатора — само в паметта, никъде другаде. */
interface RedNaSmyatane {
  readonly opis: string;
  readonly obshta_st: number;
  readonly stavka: number;
}
let smyatane: RedNaSmyatane[] = [];

export function narisuvaySmetki(o: Ogledalo, dnes: string): string {
  const mesets = period ?? dnes.slice(0, 7);
  const s = smetki(o, mesets, new Date().toISOString());
  const razlika = s.sverki.reduce((sbor, x) => sbor + x.razlika, 0);
  const razhodi = razhodiZaPerioda(o, mesets);

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Приход за ${ekraniraj(mesets)}</span>
        <span class="chislo">${kakvoPishe(s.prihod_st as never)}</span>
        <span class="pod">начислено · обща цена с ДДС</span>
      </div>
      <div class="plochka">
        <span class="etiket">ДДС ${s.zaVnasyane_st < 0 ? 'за възстановяване' : 'за внасяне'}</span>
        <span class="chislo">${kakvoPishe(s.zaVnasyane_st as never)}</span>
        <span class="pod">изход ${kakvoPishe(s.dds_izhod_st as never)} − вход ${kakvoPishe(s.dds_vhod_st as never)}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Разход за ${ekraniraj(mesets)}</span>
        <span class="chislo">${kakvoPishe(s.razhod_st as never)}</span>
        <span class="pod">заплати + кредити + фактури</span>
      </div>
      <div class="plochka${s.nared ? '' : ' trevoga'}">
        <span class="etiket">Разлика по сверката</span>
        <span class="chislo">${kakvoPishe(razlika as never)}</span>
        <span class="pod">${s.nared ? 'сверката затваря' : 'НЕ затваря — виж долу'}</span>
      </div>
    </div>

    <section class="karta">
      <div class="dyalglava"><h2>Период</h2><span>сметките се смятат наново за всеки месец</span></div>
      <form id="forma-period">
        <div class="poleta tesni">
          <div class="pole">
            <label for="smetki-period">Месец</label>
            <input id="smetki-period" name="period" type="month" value="${ekraniraj(mesets)}" required>
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
        <div class="red dds sbor">
          <span></span>
          <span class="kletka"><b>${s.zaVnasyane_st < 0 ? 'За възстановяване' : 'За внасяне'}</b><span>изход ${kakvoPishe(
            s.dds_izhod_st as never,
          )} − вход ${kakvoPishe(s.dds_vhod_st as never)}</span></span>
          <span></span>
          <span class="suma"></span>
          <span class="suma duljimo">${kakvoPishe(s.zaVnasyane_st as never)}</span>
        </div>
      </div>
      <p class="drebno">Данъчното събитие е падежът, не денят на парите — затова редът ДДС не мърда, когато влезе плащане.</p>
    </section>

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
          <div class="red sverka">
            <span class="kletka"><b>${ekraniraj(x.kakvo)}</b></span>
            <span class="suma">${merka(x.belezhka, x.vhod)}</span>
            <span class="suma">${merka(x.belezhka, x.izhod)}</span>
            <span class="suma${x.nared ? '' : ' duljimo'}">${merka(x.belezhka, x.razlika)}</span>
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
      <div class="tablitsa">
        <div class="glava razhod">
          <span>Доставчик и описание</span><span>Поток</span><span>Сектор</span>
          <span class="suma">Обща сума</span><span class="suma">ДДС</span><span></span>
        </div>
        ${razhodi.map(redNaRazhod).join('')}
      </div>
    </section>`
    }

    ${kalkulator()}
  `;
}

function formaRazhod(mesets: string): string {
  return `
    <section class="karta">
      <div class="dyalglava"><h2>Нов разход</h2><span>сумата е обща цена с ДДС — както при наема</span></div>
      <form id="forma-razhod">
        <div class="poleta">
          <div class="pole">
            <label for="razhod-potok">Поток</label>
            <select id="razhod-potok" name="potok" required>
              ${potototsiNaRazhod()
                .map((p) => `<option value="${ekraniraj(p.klyuch)}">${ekraniraj(p.ime)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="razhod-sektor">Сектор — важи за Фактури</label>
            <select id="razhod-sektor" name="sektor" required>
              ${sektoriNaRazhod()
                .filter((a) => a.stavka > 0)
                .map((a) => `<option value="${ekraniraj(a.klyuch)}">${ekraniraj(a.sektor)} · ${a.stavka}%</option>`)
                .join('')}
            </select>
          </div>
          <div class="pole">
            <label for="razhod-dostavchik">Доставчик или получател</label>
            <input id="razhod-dostavchik" name="dostavchik" required placeholder="напр. Материали ООД" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-opis">За какво</label>
            <input id="razhod-opis" name="opis" required placeholder="напр. цимент" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-suma">Обща сума, лв. — с ДДС</label>
            <input id="razhod-suma" name="suma" required inputmode="decimal" placeholder="600,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="razhod-nachin">Платено</label>
            <select id="razhod-nachin" name="nachin">
              <option value="банка">по банка</option>
              <option value="в брой">в брой</option>
            </select>
          </div>
          <div class="pole">
            <label for="razhod-data">Дата</label>
            <input id="razhod-data" name="data" type="date" value="${ekraniraj(mesets)}-01" required>
          </div>
          <div class="pole">
            <label for="razhod-dokument">Документ (по избор)</label>
            <input id="razhod-dokument" name="dokument" placeholder="номер на фактура" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-razhod"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши разхода</button>
          <p class="drebno">Записва се като <b>РазходЗаписан</b>. Заплатите и кредитите нямат ДДС — секторът им се слага сам. При <b>Фактури</b> секторът избира ставката, с която ДДС-то се <b>изважда</b> от общата сума.</p>
        </div>
      </form>
    </section>`;
}

function redNaRazhod(r: Razhod): string {
  const a = akumulator(r.sektor);
  const razbivka = ddsOtObshta(r.suma_st, a.stavka);
  return `
    <div class="red razhod">
      <span class="kletka"><b>${ekraniraj(r.dostavchik)}</b><span>${ekraniraj(r.opis)} · ${ekraniraj(r.data)}${
        r.dokument ? ` · док. ${ekraniraj(r.dokument)}` : ''
      } · ${ekraniraj(r.nachin)}</span></span>
      <span class="kletka"><span>${ekraniraj(potok(r.potok)?.ime ?? r.potok)}</span></span>
      <span class="kletka"><span>${ekraniraj(a.sektor)} · ${a.stavka}%</span></span>
      <span class="suma duljimo">${kakvoPishe(razbivka.obshta_st)}</span>
      <span class="suma">${kakvoPishe(razbivka.dds_st)}</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-storno-razhod="${r.seq}">Сторно</button>
      </span>
    </div>`;
}

/** Стотинките се показват в левове; бройките — както са. */
function merka(belezhka: string | undefined, chislo: number): string {
  return belezhka === MERKA.pari ? kakvoPishe(chislo as never) : String(chislo);
}

function redNaSmetka(r: RedSmetka): string {
  return `
    <div class="red smetka">
      <span class="kletka"><b>${ekraniraj(r.ime)}</b><span>${ekraniraj(r.belezhka)}</span></span>
      <span><span class="znachka ${r.posoka === 'приход' ? 'dobre' : 'tiha'}">${r.posoka}</span></span>
      <span>${r.broi}</span>
      <span class="suma${r.suma_st === 0 ? '' : r.posoka === 'приход' ? ' plateno' : ' duljimo'}">${kakvoPishe(
        r.suma_st as never,
      )}</span>
    </div>`;
}

function redNaDDS(r: RedDDS): string {
  return `
    <div class="red dds">
      <span><span class="znachka ${r.strana === 'изход' ? 'dobre' : 'tiha'}">${r.strana}</span></span>
      <span class="kletka"><b>${ekraniraj(r.akumulator.sektor)}</b><span>${r.broi} ${
        r.strana === 'изход'
          ? r.broi === 1
            ? 'вземане'
            : 'вземания'
          : r.broi === 1
            ? 'разход'
            : 'разхода'
      } · ${kakvoPishe(r.obshta_st as never)} с ДДС</span></span>
      <span>${r.akumulator.stavka}%</span>
      <span class="suma">${kakvoPishe(r.osnova_st as never)}</span>
      <span class="suma">${kakvoPishe(r.dds_st as never)}</span>
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
            <input id="smyatane-opis" name="opis" placeholder="напр. фактура 1042" autocomplete="off">
          </div>
          <div class="pole">
            <label for="smyatane-suma">Обща цена, лв. — с ДДС</label>
            <input id="smyatane-suma" name="suma" required inputmode="decimal" placeholder="1200,00" autocomplete="off">
          </div>
          <div class="pole">
            <label for="smyatane-stavka">Ставка</label>
            <select id="smyatane-stavka" name="stavka" required>
              ${[...new Set(AKUMULATORI.map((a) => a.stavka))]
                .sort((a, b) => a - b)
                .map((st) => `<option value="${st}"${st === 20 ? ' selected' : ''}>${st}%</option>`)
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
          <div class="red smyatane">
            <span class="kletka"><b>${ekraniraj(r.opis || `ред ${i + 1}`)}</b></span>
            <span>${r.stavka}%</span>
            <span class="suma">${kakvoPishe(r.razbivka.osnova_st)}</span>
            <span class="suma">${kakvoPishe(r.razbivka.dds_st)}</span>
            <span class="suma">${kakvoPishe(r.razbivka.obshta_st)}</span>
          </div>`,
          )
          .join('')}
        <div class="red smyatane sbor">
          <span><b>Сбор</b></span><span></span>
          <span class="suma">${kakvoPishe(sborOsnova as never)}</span>
          <span class="suma">${kakvoPishe(sborDDS as never)}</span>
          <span class="suma">${kakvoPishe(sborObshta as never)}</span>
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
        },
        { opId: opIdRazhod },
      );
      opIdRazhod = crypto.randomUUID();
      k.vest('dobre', 'Разходът е записан. Входящият ДДС влезе в акумулатора си.');
      await prerisuvay();
    } catch (err) {
      greshka.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      buton.disabled = false;
    }
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
