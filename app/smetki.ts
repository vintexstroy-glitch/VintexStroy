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
import { AKUMULATORI, ddsOtObshta } from '../src/domein/dds.js';
import { MERKA, smetki, type RedDDS, type RedSmetka } from '../src/domein/smetki.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

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

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Приход за ${ekraniraj(mesets)}</span>
        <span class="chislo">${kakvoPishe(s.prihod_st as never)}</span>
        <span class="pod">начислено · обща цена с ДДС</span>
      </div>
      <div class="plochka">
        <span class="etiket">ДДС за внасяне</span>
        <span class="chislo">${kakvoPishe(s.zaVnasyane_st as never)}</span>
        <span class="pod">изход − вход · по акумулатори</span>
      </div>
      <div class="plochka">
        <span class="etiket">Влязло</span>
        <span class="chislo">${kakvoPishe(s.sabrano_st as never)}</span>
        <span class="pod">кеш + банка, по дата на плащане</span>
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
          <span>Държава</span><span>Сектор</span><span>Ставка</span>
          <span class="suma">Основа</span><span class="suma">ДДС</span>
        </div>
        ${
          s.dds.length === 0
            ? '<p class="prazno">Няма начислено за този месец.<br>ДДС се извежда от начисленото, не от влезлите пари.</p>'
            : s.dds.map(redNaDDS).join('')
        }
        <div class="red dds sbor">
          <span></span><span><b>За внасяне</b></span><span></span>
          <span class="suma">${kakvoPishe(s.dds.reduce((x, r) => x + r.osnova_st, 0) as never)}</span>
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

    ${kalkulator()}
  `;
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
      <span>${ekraniraj(r.akumulator.darzhava)}</span>
      <span class="kletka"><b>${ekraniraj(r.akumulator.sektor)}</b><span>${r.broi} ${
        r.broi === 1 ? 'вземане' : 'вземания'
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
  _k: Konteks,
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
}
