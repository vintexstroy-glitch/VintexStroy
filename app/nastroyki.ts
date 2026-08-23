/**
 * НАСТРОЙКИ · мястото, където се създават БУТОНИТЕ.
 *
 * Негови думи: „Създаваш бутон и го връзваш от Настройки по избран начин, с
 * филтър за видимост на служители за бутона, и свързан по различен начин с
 * хедър и комбинацията хедъри. **Бутоните са модели на пътища.**"
 *
 * Този екран е контейнер **M16 · Настройки и номенклатури** от Заданието —
 * „настройка · номенклатура · речник · шаблон · МОДЕЛ НА КЛИЕНТА". Той липсваше
 * и от плана, и от приложението, а точно в него живее третият закон на скелета:
 * „Нищо не е константа. Всяко име/роля/номенклатура е данна от Настройки, не
 * зашито в кода."
 *
 * Тук няма нищо, което да пази състояние само за себе си: бутоните и моделите
 * живеят в Журнала и се четат от Огледалото при всяко показване.
 */

import { kakvoPishe } from '../src/yadro/pari.js';
import {
  belegNaButon,
  DEYSTVIYA,
  napraviButon,
  papki,
  posokaNa,
  vPapka,
  type Buton,
  type Deystvie,
} from '../src/domein/butoni.js';
import { IMENA_NA_ROLITE, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import type { Ogledalo, ZapisanaSverka } from '../src/ogledalo/ogledalo.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

/** Отворена ли е формата за нов бутон. Живее, докато екранът стои отворен. */
let dobavyam = false;
let greshka = '';

const POSOKA_S_DUMI: Readonly<Record<string, string>> = Object.freeze({
  chete: 'чете',
  pishe: 'пише',
  smyata: 'смята',
});

export function narisuvayNastroyki(o: Ogledalo): string {
  const butoni = [...o.butoni.values()];
  const modeli = [...o.modeli.values()];

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Бутони</span>
        <span class="chislo" translate="no">${butoni.length}</span>
        <span class="pod">${butoni.length ? `в ${papki(butoni).length} папки` : 'още няма нито един'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Модели на таблици</span>
        <span class="chislo" translate="no">${modeli.length}</span>
        <span class="pod">${modeli.length ? 'карти на хедъри' : 'правят се при първото четене'}</span>
      </div>
      <div class="plochka">
        <span class="etiket">Записани сверки</span>
        <span class="chislo" translate="no">${o.sverki.length}</span>
        <span class="pod">включително нулевите — правило 7</span>
      </div>
      <div class="plochka">
        <span class="etiket">Построени действия</span>
        <span class="chislo" translate="no">${DEYSTVIYA.filter((d) => d.postroeno).length} / ${DEYSTVIYA.length}</span>
        <span class="pod">останалите са обявени, не построени</span>
      </div>
    </div>

    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    ${blokNaButonite(butoni)}
    ${dobavyam ? formaNaButon(modeli) : ''}
    ${blokNaModelite(modeli)}
    ${blokNaSverkite(o)}
    ${blokNaDeystviyata()}`;
}

// ── бутоните ───────────────────────────────────────────────────────────────
function blokNaButonite(butoni: readonly Buton[]): string {
  return `
    <section>
      <div class="dyalglava">
        <h2>Бутоните</h2>
        <span>един бутон = един път · посоката е ЕДНА</span>
      </div>
      ${
        butoni.length === 0
          ? '<p class="prazno">Още няма нито един бутон.<br>Бутонът е път: коя папка, кое действие, кои модели.</p>'
          : papki(butoni)
              .map(
                (p) => `<div class="tablitsa">
        <div class="glava buton">
          <span>Папка ${ekraniraj(p)}</span><span>Действие</span><span>Посока</span>
          <span>Модели</span><span></span>
        </div>
        ${vPapka(butoni, p).map(redNaButon).join('')}
      </div>`,
              )
              .join('')
      }
      <div class="deystviya">
        <button type="button" class="glaven" id="nov-buton"${dobavyam ? ' disabled' : ''}>Нов бутон</button>
        <p class="drebno">Папката <b>групира</b>, не съхранява: тя е име в Журнала, не директория на диска. Затова бутоните работят и на телефон, и без мрежа.</p>
      </div>
    </section>`;
}

function redNaButon(b: Buton): string {
  const opis = DEYSTVIYA.find((d) => d.klyuch === b.deystvie)!;
  const posoka = posokaNa(b.deystvie);
  return `
    <div class="red buton" translate="no">
      <span class="kletka"><b>${ekraniraj(b.klyuch)}</b><span>${ekraniraj(b.papka)}</span></span>
      <span>${ekraniraj(opis.ime)}</span>
      <span><span class="znachka ${posoka === 'chete' ? 'dobre' : 'tiha'}">${POSOKA_S_DUMI[posoka]}</span></span>
      <span class="kletka"><span>${
        b.modeli.length === 0
          ? '<b>всички</b> — приема кой да е познат хедър'
          : ekraniraj(b.modeli.join(' · '))
      }</span></span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-mahni-buton="${ekraniraj(b.klyuch)}">Изчисти моделите</button>
      </span>
    </div>`;
}

function formaNaButon(modeli: readonly ModelNaTablitsa[]): string {
  const postroeni = DEYSTVIYA.filter((d) => d.postroeno);
  return `
    <section class="karta izbrana">
      <div class="dyalglava"><h2>Нов бутон</h2><span>име · папка · действие · позволени модели</span></div>
      <form id="forma-buton">
        <div class="poleta">
          <div class="pole">
            <label for="buton-ime">Име на бутона</label>
            <input translate="no" id="buton-ime" name="ime" required placeholder="напр. Извлечения ОББ" autocomplete="off">
          </div>
          <div class="pole">
            <label for="buton-papka">Папка</label>
            <input translate="no" id="buton-papka" name="papka" required placeholder="напр. Извлечения" autocomplete="off">
          </div>
          <div class="pole">
            <label for="buton-deystvie">Действие</label>
            <select translate="no" id="buton-deystvie" name="deystvie" required>
              ${postroeni
                .map(
                  (d) => `<option value="${ekraniraj(d.klyuch)}">${ekraniraj(d.ime)} · ${POSOKA_S_DUMI[d.posoka]}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="tablitsa">
          <div class="glava propusnat"><span>Позволени модели</span><span>нищо избрано = всички</span></div>
          ${
            modeli.length === 0
              ? '<p class="prazno">Още няма модели. Бутонът ще приема всеки познат хедър, докато не се появят.</p>'
              : modeli
                  .map(
                    (m) => `<div class="red propusnat" translate="no">
            <span><label class="vazm"><input type="checkbox" data-model="${ekraniraj(m.klyuch)}"> ${ekraniraj(m.klyuch)}</label></span>
            <span>${ekraniraj(m.otpechatak.slice(0, 60))}…</span>
          </div>`,
                  )
                  .join('')
          }
        </div>
        <p class="greshka" id="greshka-buton"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Запиши бутона</button>
          <button type="button" class="vtorichen" id="otkazhi-buton">Откажи</button>
          <p class="drebno">Записва се като <b>БутонЗаписан</b>. Поправка е ново събитие върху същото име — старото остава в Журнала, както всичко останало.</p>
        </div>
      </form>
    </section>`;
}

// ── моделите ───────────────────────────────────────────────────────────────
function blokNaModelite(modeli: readonly ModelNaTablitsa[]): string {
  return `
    <section>
      <div class="dyalglava">
        <h2>Модели на таблици</h2>
        <span>по един на глава · правят се при първото непознато четене</span>
      </div>
      ${
        modeli.length === 0
          ? '<p class="prazno">Още няма модели.<br>Първата непозната таблица ще пита коя колона какво е — и оттам се ражда модел.</p>'
          : `<div class="tablitsa">
        <div class="glava model">
          <span>Име</span><span>Колони</span><span>Махнати от сборовете</span><span>Отпечатък на главата</span>
        </div>
        ${modeli.map(redNaModel).join('')}
      </div>`
      }
    </section>`;
}

function redNaModel(m: ModelNaTablitsa): string {
  const roli = (Object.keys(m.koloni) as (keyof typeof IMENA_NA_ROLITE)[])
    .map((r) => IMENA_NA_ROLITE[r])
    .join(' · ');
  return `
    <div class="red model" translate="no">
      <span class="kletka"><b>${ekraniraj(m.klyuch)}</b><span>глава на ред ${m.redNaGlavata + 1}</span></span>
      <span>${ekraniraj(roli)}</span>
      <span>${m.izklyucheni.length === 0 ? '—' : `${m.izklyucheni.length}`}</span>
      <span class="kletka"><span>${ekraniraj(m.otpechatak.slice(0, 48))}…</span></span>
    </div>`;
}

// ── сверките ───────────────────────────────────────────────────────────────
function blokNaSverkite(o: Ogledalo): string {
  const posledni = [...o.sverki].reverse().slice(0, 12);
  return `
    <section>
      <div class="dyalglava">
        <h2>Записани сверки</h2>
        <span>всяка минала през бутон · и нулевите</span>
      </div>
      ${
        posledni.length === 0
          ? '<p class="prazno">Още няма нито една.<br>Сверката се записва при всяко натискане на бутон, който чете.</p>'
          : `<div class="tablitsa">
        <div class="glava zapisanasverka">
          <span>Бутон и период</span><span class="suma">Файлове</span><span class="suma">Журнал</span>
          <span class="suma">Разлика</span><span></span>
        </div>
        ${posledni.map(redNaSverka).join('')}
      </div>`
      }
      <p class="drebno">Разликата се записва и когато е нула — иначе „няма разлика" е неразличимо от „не е сверявано".</p>
    </section>`;
}

function redNaSverka(s: ZapisanaSverka): string {
  return `
    <div class="red zapisanasverka" translate="no">
      <span class="kletka"><b>${ekraniraj(s.buton)}</b><span>${ekraniraj(s.period)} · ${s.izvori.length} ${
        s.izvori.length === 1 ? 'файл' : 'файла'
      }${s.propusnati ? ` · ${s.propusnati} непрочетени` : ''}</span></span>
      <span class="suma">${kakvoPishe(s.vhod_st as never)}</span>
      <span class="suma">${kakvoPishe(s.izhod_st as never)}</span>
      <span class="suma${s.razlika_st === 0 ? '' : ' duljimo'}">${kakvoPishe(s.razlika_st as never)}</span>
      <span><span class="znachka ${s.razlika_st === 0 ? 'dobre' : 'trevoga'}">${
        s.razlika_st === 0 ? 'затваря' : 'НЕ затваря'
      }</span></span>
    </div>`;
}

// ── честният списък ────────────────────────────────────────────────────────
function blokNaDeystviyata(): string {
  return `
    <section>
      <div class="dyalglava">
        <h2>Десетте пътя</h2>
        <span>обявени поименно · построеното си личи</span>
      </div>
      <div class="tablitsa">
        <div class="glava deystvie">
          <span>#</span><span>Път</span><span>Посока</span><span>Състояние</span>
        </div>
        ${DEYSTVIYA.map(
          (d, i) => `<div class="red deystvie" translate="no">
          <span>${i + 1}</span>
          <span>${ekraniraj(d.ime)}</span>
          <span>${POSOKA_S_DUMI[d.posoka]}</span>
          <span><span class="znachka ${d.postroeno ? 'dobre' : 'tiha'}">${
            d.postroeno ? 'построен' : 'обявен'
          }</span></span>
        </div>`,
        ).join('')}
      </div>
      <p class="drebno">Бутон с обявено, но непостроено действие се отказва при създаване — бутон, който мълчи при натискане, е по-лош от липсващ бутон.</p>
    </section>`;
}

// ── закачането ─────────────────────────────────────────────────────────────
export function zakachiNastroyki(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLButtonElement>('#nov-buton')?.addEventListener('click', async () => {
    dobavyam = true;
    greshka = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#otkazhi-buton')?.addEventListener('click', async () => {
    dobavyam = false;
    greshka = '';
    await prerisuvay();
  });

  const forma = koren.querySelector<HTMLFormElement>('#forma-buton');
  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-buton')!;
    kazhi.textContent = '';
    const danni = new FormData(forma);

    const modeli = [...koren.querySelectorAll<HTMLInputElement>('[data-model]')]
      .filter((x) => x.checked)
      .map((x) => x.dataset['model']!);

    try {
      const buton = napraviButon({
        klyuch: String(danni.get('ime') ?? ''),
        papka: String(danni.get('papka') ?? ''),
        deystvie: String(danni.get('deystvie')) as Deystvie,
        modeli,
      });
      await k.deystviya.zapishiButon(buton, {
        // Белегът е от СЪДЪРЖАНИЕТО: поправен бутон е нов запис, не повторение.
        opId: `buton:${buton.klyuch}:${belegNaButon(buton)}`,
      });
      dobavyam = false;
      greshka = '';
      k.vest('dobre', `Бутонът „${buton.klyuch}" е записан в папка „${buton.papka}".`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = err instanceof Error ? err.message : String(err);
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-mahni-buton]')) {
    b.addEventListener('click', async () => {
      const ime = b.dataset['mahniButon']!;
      const star = (await k.deystviya.ogledalo()).butoni.get(ime);
      if (!star) return;
      b.disabled = true;
      try {
        const nov = napraviButon({ ...star, modeli: [] });
        await k.deystviya.zapishiButon(nov, {
          opId: `buton:${nov.klyuch}:${belegNaButon(nov)}`,
        });
        k.vest('dobre', `„${ime}" вече приема кой да е познат хедър.`);
      } catch (err) {
        greshka = err instanceof Error ? err.message : String(err);
      }
      await prerisuvay();
    });
  }
}
