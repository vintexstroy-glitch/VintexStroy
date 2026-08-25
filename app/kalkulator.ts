/**
 * СЕКЦИЯ „КАЛКУЛАТОР" · входът, легендата и разбивката (И96 т.2).
 *
 * Негови думи, дословно:
 *
 *   „За калкулатора съм казал много пъти. **Аз не разбирам как се смята**,
 *    искам да видиш проучването си и да направиш такова за дава начина на
 *    смятане и да ми ги предложиш **с разлика в цената в 2 графи как се смята
 *    и какви стойности ти трябват**… и ги напиши като възможно за въвеждане
 *    **с легенда и пример за коефициент или меню с тези нужни филтри**. Аз не
 *    знам. **Ако се налага направи секция Калкулатор и секция Ценова листа.**"
 *
 * ЧЕТИРИ НЕЩА, И ВСЯКО Е НЕГОВО ИЗРЕЧЕНИЕ:
 *
 *   1 · МЕНЮ ВМЕСТО ЧИСЛО. „Аз не знам" значи, че поле за „коефициент за етаж"
 *       не помага. Всеки коефициент е меню от ДУМИ; числото стои до думата.
 *   2 · ЛЕГЕНДА. До всяко меню — защо занаятът го брои и какво мени.
 *   3 · ПРИМЕР ЗА КОЕФИЦИЕНТ. Не „0,92", а „партер · 0,920 · −8,00 % ·
 *       −18 816,00 €" — процентът върху ЧИСЛО, иначе е знак без смисъл.
 *   4 · КАК СЕ СМЯТА. Двете графи, ред по ред, всяка с междинното си число.
 *
 * ЗАЩО СЕКЦИЯТА Е ГОРЕ, А ЛИСТАТА ДОЛУ. Матрицата се пипа веднъж на сезон,
 * листата — всеки ден. Разделени са, защото се гледат от различни хора в
 * различен момент.
 *
 * ТУК НЕ СЕ ПИШЕ В ЖУРНАЛА. „Няма редакция оттам, а само изчисляване" (негово,
 * 09.08). Настройките живеят в паметта на екрана; в Журнала влиза изборът,
 * когато той поиска — не самите цени.
 */

import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { IMENA_NA_VIDOVETE_OBEKT, kvSmVM2 } from '../src/kalkulator/chetene.js';
import {
  DOBAVKI,
  KLASOVE,
  KOEFITSIENTI,
  PO_PODRAZBIRANE,
  klas,
  proveriNastroyki,
  sBaza,
  sIzbranaStapka,
  sKlas,
  stapka,
  vKoefitsient,
  vProtsent,
  type KlyuchKoefitsient,
  type Nastroyki,
} from '../src/kalkulator/nastroyki.js';
import {
  PRIMEREN_OBEKT,
  ZNATSI,
  osnovaZaPrimera,
  primerZaKoefitsient,
  razbivka,
  type RedNaRazbivka,
  type Vhod,
} from '../src/kalkulator/razbivka.js';

/**
 * Настройките живеят като ПОГЛЕД на екрана (ADR-022), не като факт в Журнала.
 * Помни се само изборът — числата идват от `nastroyki.ts`, за да не се
 * разминат двата дома при обновяване (правило 17).
 */
let nastroyki: Nastroyki = Object.freeze({
  ...PO_PODRAZBIRANE,
  izbrani: Object.freeze({
    ...PO_PODRAZBIRANE.izbrani,
    ...chetiEkranno<Partial<Record<KlyuchKoefitsient, string>>>('kalk.izbrani', {}),
  }),
  klas: chetiEkranno('kalk.klas', PO_PODRAZBIRANE.klas),
  dohodnost_bt: chetiEkranno('kalk.dohodnost', PO_PODRAZBIRANE.dohodnost_bt),
  baza_st: Object.freeze({
    ...PO_PODRAZBIRANE.baza_st,
    apartament: chetiEkranno('kalk.baza', PO_PODRAZBIRANE.baza_st.apartament),
  }),
});

/** Кой обект се показва в разбивката · примерният, докато няма прочетен файл. */
let pokazan: Vhod = PRIMEREN_OBEKT;

/** Кое меню е разгънато с примера си · празно значи „нито едно". */
let razgarnato = '';

export function nastroykiteNaKalkulatora(): Nastroyki {
  return nastroyki;
}

/**
 * КОЙ ОБЕКТ СЕ РАЗБИВА · Ценовата листа го подава, когато е чела файл.
 *
 * Докато няма прочетен файл, разбивката работи върху ПРИМЕРНИЯ обект — така
 * секцията обяснява сметката и на празен екран. Празният екран, който не
 * обяснява нищо, е точно онова, което той нарече „аз не разбирам как се смята".
 */
export function pokazhiObekt(v: Vhod): void {
  pokazan = v;
}

export function primernObektLiSePokazva(): boolean {
  return pokazan === PRIMEREN_OBEKT;
}

// ── рисуването ─────────────────────────────────────────────────────────────

export function sektsiyaKalkulator(): string {
  const r = razbivka(nastroyki, pokazan);
  const nahodki = proveriNastroyki(nastroyki);
  const k = klas(nastroyki.klas);

  return `
    <section data-sektsiya="kalkulator">
      <div class="dyalglava">
        <h2>Калкулатор</h2>
        <span>входът · тук се СМЯТА · матрицата се пипа веднъж на сезон</span>
      </div>

      ${
        nahodki.length
          ? `<div class="vest zle">${nahodki.map((n) => ekraniraj(n)).join(' · ')}</div>`
          : ''
      }

      <div class="poleta">
        <label class="pole">
          <span>Базова цена · €/м²</span>
          <input translate="no" type="text" id="kalk-baza" value="${pishiCyalo(nastroyki.baza_st.apartament)}" inputmode="decimal">
        </label>
        <label class="pole">
          <span>Доходност · клас</span>
          <select translate="no" id="kalk-klas">
            ${KLASOVE.map(
              (x) =>
                `<option value="${x.klyuch}"${x.klyuch === nastroyki.klas ? ' selected' : ''}>${ekraniraj(x.ime)} · ${vProtsent(x.bt)}</option>`,
            ).join('')}
          </select>
        </label>
        <label class="pole tyasno">
          <span>Доходност · %</span>
          <input translate="no" type="text" id="kalk-dohodnost" value="${vProtsent(nastroyki.dohodnost_bt).replace(' %', '')}" inputmode="decimal">
        </label>
      </div>
      <p class="drebno" translate="no">${ekraniraj(k.zashto)} Скалата на занаята върви от ${vProtsent(KLASOVE[1]!.ot_bt)} до ${vProtsent(KLASOVE[3]!.do_bt)}; ${ekraniraj(KLASOVE[0]!.ime)} стои под нея, и това е информация, не грешка.</p>

      <div class="dyalglava">
        <h3>Петте коефициента</h3>
        <span>меню от думи, не свободно число · натисни „примерът", за да видиш какво прави всяка стъпка</span>
      </div>
      <p class="drebno"><b>Етажът и изложението идват от файла</b>, обект по обект — там всеки апартамент си има свои. Избраното тук важи за онова, което файлът НЕ казва (гараж без изложение, лист без етаж). <b>Състоянието, възрастта и асансьорът</b> са свойства на СГРАДАТА и важат за цялата партида наведнъж.</p>
      <div class="tablitsa" data-tablitsa="kalk-koef">
        <div class="glava kalk-koef">
          <span>Коефициент</span><span>Избрано</span><span>Множител</span>
          <span>Мени цената</span><span></span>
        </div>
        ${KOEFITSIENTI.map((koef) => redNaKoefitsient(koef.klyuch, r)).join('')}
      </div>

      <div class="dyalglava">
        <h3>Как се смята · ${ekraniraj(pokazan.obekt)}</h3>
        <span>${kvSmVM2(pokazan.obshta_kvsm)} м² · ${IMENA_NA_VIDOVETE_OBEKT[pokazan.vid]}${
          primernObektLiSePokazva() ? ' · примерен обект, докато няма прочетен файл' : ''
        }</span>
      </div>
      <div class="dve-grafi">
        ${grafa('А · за колко се ПРОДАВА', r.a, r.a_st, 'Цената по площ: база × площ × коефициентите, плюс добавките.')}
        ${
          r.b.length
            ? grafa('Б · колко СТРУВА като актив', r.b, r.b_st, 'Оценката: годишен наем, изчистен от незаетост и разходи, разделен на доходността.')
            : `<div class="grafa"><div class="grafaglava"><b>Б · колко СТРУВА като актив</b></div>
               <p class="drebno">Този обект няма наем — нито в Журнала, нито очакван. Обект без доход не се оценява доходно, и това е ОТГОВОР, не липса на данни.</p></div>`
        }
      </div>

      ${razlikata(r)}

      <p class="drebno"><b>Легендата.</b> ${ZNATSI['osnova']} основата · ${ZNATSI['umnozhi']} умножава се по коефициент · ${ZNATSI['dobavi']} добавя се цяла сума · ${ZNATSI['razdeli']} дели се · ${ZNATSI['zakragli']} закръгля се. Всеки ред казва <b>с колко мени</b> — това е коефициентът, преведен в пари. Междинните числа не се трупат едно от друго: всяко се смята наново от началото, за да не влезе закръгляне в следващия ред (правило 3).</p>
      <p class="drebno"><b>Гараж, паркомясто и мазе не са на квадратен метър.</b> ${DOBAVKI.map((d) => `${ekraniraj(d.ime.toLowerCase())} — ${d.vid === 'broy' ? `${pishi(d.stoynost)} за брой` : `${vProtsent(d.stoynost)} от базата, по площ`}`).join(' · ')}. Добавката влиза <b>след</b> умножението: коефициентът за изложение не мени цената на едно паркомясто.</p>
    </section>`;
}

/** Един ред от таблицата с коефициентите · с примера си отдолу, като се разгъне. */
function redNaKoefitsient(klyuch: KlyuchKoefitsient, r: ReturnType<typeof razbivka>): string {
  const koef = KOEFITSIENTI.find((x) => x.klyuch === klyuch)!;
  const s = stapka(koef, nastroyki.izbrani[klyuch]);
  const red = r.a.find((x) => x.kakvo.startsWith(koef.ime.toLowerCase()));
  const otvoren = razgarnato === klyuch;

  return `
    <div class="red kalk-koef" translate="no">
      <span class="kletka"><b>${ekraniraj(koef.ime)}</b></span>
      <span>
        <select translate="no" data-koef="${klyuch}">
          ${koef.stapki
            .map(
              (x) =>
                `<option value="${x.klyuch}"${x.klyuch === s.klyuch ? ' selected' : ''}>${ekraniraj(x.ime)}</option>`,
            )
            .join('')}
        </select>
      </span>
      <span class="suma">${vKoefitsient(s.bt)}</span>
      <span class="suma${red && red.meni_st !== 0 ? (red.meni_st > 0 ? ' plateno' : ' zle') : ''}">${
        red ? sZnak(red.meni_st) : '—'
      }</span>
      <span><button type="button" class="vtorichen malak" data-primer="${klyuch}">${otvoren ? 'скрий' : 'примерът'}</button></span>
    </div>
    ${otvoren ? primerat(klyuch) : ''}`;
}

/**
 * ПРИМЕРЪТ ЗА КОЕФИЦИЕНТ · негово изрично искане.
 *
 * „0,92" не значи нищо, докато не се види върху число. Затова всяка стъпка
 * идва с това, което прави ВЪРХУ ТОЗИ обект — и с легендата защо изобщо я има.
 */
function primerat(klyuch: KlyuchKoefitsient): string {
  const koef = KOEFITSIENTI.find((x) => x.klyuch === klyuch)!;
  const osnova = osnovaZaPrimera(nastroyki, pokazan);
  const redove = primerZaKoefitsient(koef, nastroyki, osnova);
  return `
    <div class="red kalk-primer" translate="no">
      <div class="primerblok">
        <p class="drebno">${ekraniraj(koef.zashto)}</p>
        <table class="primer">
          <thead><tr><th>стъпка</th><th>множител</th><th>мени</th><th>върху ${pishi(osnova)}</th></tr></thead>
          <tbody>
            ${redove
              .map(
                (p) => `<tr data-stapka="${p.stapka.klyuch}"${p.izbrana ? ' class="izbran"' : ''}>
                  <td>${ekraniraj(p.stapka.ime)}${p.izbrana ? ' <span class="znachka dobre">избрано</span>' : ''}</td>
                  <td class="suma" data-mnozhitel>${vKoefitsient(p.stapka.bt)}</td>
                  <td class="suma" data-meni>${ekraniraj(p.meni)}</td>
                  <td class="suma" data-meni-pari>${sZnak(p.meni_st)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

/** Една графа · редовете ѝ и числото накрая. */
function grafa(ime: string, redove: readonly RedNaRazbivka[], krayno_st: number, pod: string): string {
  return `
    <div class="grafa">
      <div class="grafaglava">
        <b>${ekraniraj(ime)}</b>
        <span class="chislo malka" translate="no">${pishi(krayno_st)}</span>
      </div>
      <table class="razbivka" translate="no">
        <tbody>
          ${redove
            .map(
              (x) => `<tr>
                <td class="znak">${ZNATSI[x.deystvie]}</td>
                <td>${ekraniraj(x.kakvo)}<br><span class="drebno">${ekraniraj(x.zashto)}</span></td>
                <td class="suma">${ekraniraj(x.vhod)}</td>
                <td class="suma${x.meni_st > 0 ? ' plateno' : x.meni_st < 0 ? ' zle' : ''}">${sZnak(x.meni_st)}</td>
                <td class="suma"><b>${pishi(x.mezhdinno_st)}</b></td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="drebno">${ekraniraj(pod)}</p>
    </div>`;
}

/**
 * РАЗЛИКАТА · и числото, което свързва двете графи.
 *
 * Подразбиращата се доходност казва какво носи обектът, ако се купи на цената
 * от Графа А. Падне ли под скалата, значи едно от три неща — и решава ЧОВЕКЪТ,
 * не приложението: наемът е под пазара · цената е над онова, което доходът
 * оправдава · обектът се продава, не се държи.
 */
function razlikata(r: ReturnType<typeof razbivka>): string {
  if (r.b.length === 0) return '';
  const p = r.podrazbirashtaSe_bt;
  const podSkalata = p > 0 && p < KLASOVE[1]!.ot_bt;
  return `
    <div class="plochki">
      <div class="plochka golyama">
        <span class="etiket">Разлика · Б − А</span>
        <span class="chislo" translate="no">${sZnak(r.razlika_st)}</span>
        <span class="pod">${vBT(r.razlika_bt)} спрямо цената по площ</span>
      </div>
      <div class="plochka golyama">
        <span class="etiket">Подразбираща се доходност</span>
        <span class="chislo" translate="no">${p > 0 ? vProtsent(p) : '—'}</span>
        <span class="pod">${
          p === 0
            ? 'няма наем, с който да се смята'
            : podSkalata
              ? `под скалата (от ${vProtsent(KLASOVE[1]!.ot_bt)}) — наемът е под пазара, или цената е над онова, което доходът оправдава`
              : 'вътре в скалата на занаята'
        }</span>
      </div>
    </div>`;
}

// ── изписването ────────────────────────────────────────────────────────────

/** Сумата СЪС знака си; нулата се казва, не се крие. */
function sZnak(st: number): string {
  if (st === 0) return '0,00';
  return `${st > 0 ? '+' : '−'}${pishi(Math.abs(st)).replace(/ ?€$/, '').trim()}`;
}

/** Базисни точки като процент с десети: −2 543 → „−25,4 %". */
function vBT(bt: number): string {
  const znak = bt > 0 ? '+' : bt < 0 ? '−' : '';
  const desetinki = Math.round(Math.abs(bt) / 10);
  return `${znak}${Math.floor(desetinki / 10)},${desetinki % 10} %`;
}

/** Цели центове като число за поле · без знак на валута. */
function pishiCyalo(st: number): string {
  return pishi(st).replace(/ ?€$/, '').trim();
}

/**
 * Число от поле → цели центове. Приема и запетая, и точка.
 *
 * Отказът е ТИХ (връща `undefined`): полето още се пише и половин число не е
 * грешка на човека, а недовършено въвеждане.
 */
function stotinkiOtPole(tekst: string): number | undefined {
  const t = tekst.replace(/ | |\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  const [tsyalo, drobni = ''] = t.split('.');
  return Number(tsyalo) * 100 + Number(drobni.padEnd(2, '0'));
}

// ── закачането ─────────────────────────────────────────────────────────────

export function zakachiKalkulator(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  for (const izbor of koren.querySelectorAll<HTMLSelectElement>('select[data-koef]')) {
    izbor.addEventListener('change', async () => {
      const klyuch = izbor.dataset['koef'] as KlyuchKoefitsient;
      nastroyki = sIzbranaStapka(nastroyki, klyuch, izbor.value);
      zapomniEkranno('kalk.izbrani', nastroyki.izbrani);
      await prerisuvay();
    });
  }

  for (const buton of koren.querySelectorAll<HTMLButtonElement>('button[data-primer]')) {
    buton.addEventListener('click', async () => {
      const klyuch = buton.dataset['primer'] ?? '';
      razgarnato = razgarnato === klyuch ? '' : klyuch;
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLSelectElement>('#kalk-klas')?.addEventListener('change', async (e) => {
    nastroyki = sKlas(nastroyki, (e.target as HTMLSelectElement).value);
    zapomniEkranno('kalk.klas', nastroyki.klas);
    zapomniEkranno('kalk.dohodnost', nastroyki.dohodnost_bt);
    await prerisuvay();
  });

  koren.querySelector<HTMLInputElement>('#kalk-baza')?.addEventListener('change', async (e) => {
    const st = stotinkiOtPole((e.target as HTMLInputElement).value);
    if (st === undefined || st <= 0) return;
    nastroyki = sBaza(nastroyki, 'apartament', st);
    zapomniEkranno('kalk.baza', st);
    await prerisuvay();
  });

  koren.querySelector<HTMLInputElement>('#kalk-dohodnost')?.addEventListener('change', async (e) => {
    // Процентът се въвежда като „6,00" и живее като 600 базисни точки —
    // същите цели единици, в които се смята (правило 3).
    const bt = stotinkiOtPole((e.target as HTMLInputElement).value);
    if (bt === undefined || bt <= 0) return;
    nastroyki = Object.freeze({ ...nastroyki, dohodnost_bt: bt });
    zapomniEkranno('kalk.dohodnost', bt);
    await prerisuvay();
  });
}
