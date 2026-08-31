/**
 * СПРАВКИТЕ ЗА СЧЕТОВОДСТВОТО · четирите, преместени в Сметки (резен 53).
 *
 * Негово, 31.08: „**НАП отпада**" — и на въпроса докъде: пада ПОДАВАНЕТО, не
 * счетоводството.
 *
 * Затова тези четири справки НЕ падат с екрана НАП. Те питат „платено ли е" и
 * „декларирано ли е" — две работи, които остават задължение на фирмата, независимо
 * дали приложението сглобява одитен файл. Единственото, което се смени, е ДОМЪТ
 * им: от таба НАП в Сметки, където живеят Отчетите и парите.
 *
 * Негови думи, 29.08, които ги родиха и остават в сила:
 *
 *   „При таба на НАП се прави място за работа на счетоводството и справки за
 *    платени, неплатени, декларирани фактури и недекларирани, но платени
 *    фактури."
 *
 * Изречението назовава ТАБА, който вече го няма. Това не отменя четирите справки
 * — назовава мястото им тогава. Мястото се смени; работата не.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import {
  chetiriteSpravki,
  LIPSVASHTITE,
  mesetsiteZaPodavane,
  redoveteZaSchetovodstvoto,
  sveriSpravkite,
  type RedZaSchetovodstvoto,
  type Spravka,
} from '../src/domein/spravki-schetovodstvo.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { pishi } from '../src/yadro/pari.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

/**
 * ОБХВАТЪТ НА СПРАВКИТЕ · СВОЙ, не месецът на одитния файл.
 *
 * Файлът се подава по МЕСЕЦ; справките са за РАБОТА и се гледат назад — три
 * месеца по подразбиране, защото точно толкова назад стои неподаденото, преди
 * да стане проблем. Един общ месец за двете щеше да върже несвързани неща:
 * смяната на месеца за подаване щеше да мени и работния изглед.
 */
function obhvatatNaSpravkite(dnes: string): { ot: string; do_: string } {
  const do_ = chetiEkranno('smetki.spravki.do', dnes.slice(0, 7));
  return { ot: chetiEkranno('smetki.spravki.ot', predi(do_, 2)), do_ };
}

/** N месеца назад · без часови пояси и без библиотека. */
function predi(period: string, mesetsi: number): string {
  let g = Number(period.slice(0, 4));
  let m = Number(period.slice(5, 7)) - mesetsi;
  while (m < 1) {
    m += 12;
    g -= 1;
  }
  return `${String(g).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}
/**
 * МЯСТОТО ЗА РАБОТА НА СЧЕТОВОДСТВОТО · четирите справки (резен 17г · ADR-075).
 *
 * Негови думи, 29.08: „При таба на НАП се прави място за работа на
 * счетоводството и справки за платени, неплатени, декларирани фактури и
 * недекларирани, но платени фактури."
 *
 * ОБХВАТ, не месец. Одитният файл горе е за ЕДИН месец — той се подава по месец.
 * Тези справки са за РАБОТА: счетоводителят гледа тримесечие назад, за да види
 * какво е останало неподадено. Затова тук има свои две полета, а не месецът от
 * горния блок.
 *
 * ═══ И СЕКЦИЯТА КАЗВА С КАКЪВ ОБХВАТ Е НАРИСУВАНА (резен 18) ═══
 *
 * `data-obhvat` носи двата месеца, с които редовете СА пресметнати. Полетата
 * казват какво е ПОИСКАНО; този надпис — какво е ПОКАЗАНО, и двете се разминават
 * точно в мига между смяната и прерисуването.
 *
 * Платено с находка: §92 падаше през път — веднъж мина, веднъж не. Броенето на
 * редовете хващаше екрана, нарисуван още със СТАРИЯ обхват, защото чакането
 * гледаше стойността на полето, а тя се появява от писането, преди изобщо да е
 * почнало прерисуване. Проверка, която веднъж минава и веднъж пада, е по-лоша
 * от липсваща: тя учи да се пуска повторно, вместо да се търси причина.
 */
export function narisuvaySpravkite(o: Ogledalo, dnes: string): string {
  const { ot, do_ } = obhvatatNaSpravkite(dnes);
  let redove: readonly RedZaSchetovodstvoto[];
  try {
    redove = redoveteZaSchetovodstvoto(o, ot, do_);
  } catch (err) {
    return `
    <section data-sektsiya="nap-spravki" data-obhvat="${ekraniraj(ot)}·${ekraniraj(do_)}">
      ${glavataNaSpravkite(ot, do_)}
      <p class="greshka">${ekraniraj(dumiZaGreshka(err))}</p>
    </section>`;
  }

  const s = chetiriteSpravki(redove);
  const sverka = sveriSpravkite(redove, s);
  const chakat = mesetsiteZaPodavane(s);

  return `
    <section data-sektsiya="nap-spravki" data-obhvat="${ekraniraj(ot)}·${ekraniraj(do_)}">
      ${glavataNaSpravkite(ot, do_)}

      <p class="drebno">Четирите справки са ДВЕ ДУМИ, зададени на всеки ред:
      <b>платено ли е</b> и <b>декларирано ли е</b>. Затова един ред влиза в
      няколко от тях, а сборовете им НЕ се събират — те са четири въпроса към
      една маса, не четири дяла от нея.</p>

      <div class="plochki">
        ${Object.values(s).map(plochkaNaSpravkata).join('')}
      </div>

      ${
        chakat.length === 0
          ? `<p class="drebno" data-chakat="0">Няма платен месец, който да чака подаване.
             И тази нула се КАЗВА: празно поле не различава „всичко е подадено"
             от „не е поглеждано".</p>`
          : `<p class="drebno"><b data-chakat="${chakat.length}">${chakat.length}</b>
             ${chakat.length === 1 ? 'месец ЧАКА' : 'месеца ЧАКАТ'} подаване — платено е,
             а справката още не е подадена. Човек подава МЕСЕЦ, не фактура.</p>
             <div class="tablitsa" data-tablitsa="chakat-podavane">
               <div class="glava chakapodavane">
                 <span data-kolona="period" data-ime="Месец">Месец</span>
                 <span data-kolona="broy" data-ime="Редове">Редове</span>
                 <span data-kolona="suma" data-ime="Сума">Сума</span>
               </div>
               ${chakat
                 .map(
                   (m) => `
                 <div class="red chakapodavane duljimo" translate="no" data-chaka="${ekraniraj(m.period)}">
                   <span class="kletka"><b>${ekraniraj(m.period)}</b></span>
                   <span class="kletka"><span>${m.broy}</span></span>
                   <span class="suma" data-st="${m.suma_st}">${pishi(m.suma_st)}</span>
                 </div>`,
                 )
                 .join('')}
             </div>`
      }

      <div class="tablitsa" data-tablitsa="spravki-redove">
        <div class="glava spravkared">
          <span data-kolona="koy" data-ime="Кой">Кой</span>
          <span data-kolona="osnovanie" data-ime="Основание">Основание</span>
          <span data-kolona="period" data-ime="Период">Период</span>
          <span data-kolona="suma" data-ime="Сума">Сума</span>
          <span data-kolona="plateno" data-ime="Платено">Платено</span>
          <span data-kolona="deklarirano" data-ime="Декларирано">Декларирано</span>
        </div>
        ${
          redove.length === 0
            ? '<p class="prazno">Няма нито един ред в този обхват.</p>'
            : redove.map(redNaSpravkata).join('')
        }
      </div>

      <p class="drebno" data-sverka-spravki="${sverka.nared ? 'nared' : 'ne'}">
        Сверка вход↔изход: <b>${sverka.vsichki}</b> реда в масата ·
        <b>${sverka.poPlateno}</b> по платено · <b>${sverka.poDeklarirano}</b> по декларирано.
        ${sverka.nared ? 'Нищо не е изпаднало.' : 'РАЗМИНАВАНЕ — ред е изпаднал и от двете страни.'}
      </p>

      <div class="dyalglava">
        <h2>Какво данните ОЩЕ не могат да кажат</h2>
        <span>${LIPSVASHTITE.length} ${LIPSVASHTITE.length === 1 ? 'нещо' : 'неща'} · брои се, не се твърди</span>
      </div>
      <ul class="prechki" data-lipsvashti="${LIPSVASHTITE.length}">
        ${LIPSVASHTITE.map((x) => `<li>${ekraniraj(x)}</li>`).join('')}
      </ul>
      <p class="drebno">Дали да има състояние „получена фактура, още неплатена"
      е <b>негово</b> решение, не аритметика (правило 18). Дотогава графата
      „Неплатени" показва само издадените фактури — и го КАЗВА, вместо да мълчи.</p>
    </section>`;
}

function glavataNaSpravkite(ot: string, do_: string): string {
  return `
      <div class="dyalglava">
        <h2>Мястото на счетоводството</h2>
        <span>четири справки · обхват, не месец</span>
      </div>
      <div class="redditsa">
        <label class="pole">
          <span>От месец</span>
          <input translate="no" type="month" id="spravki-ot" value="${ekraniraj(ot)}">
        </label>
        <label class="pole">
          <span>До месец</span>
          <input translate="no" type="month" id="spravki-do" value="${ekraniraj(do_)}">
        </label>
      </div>`;
}

function plochkaNaSpravkata(x: Spravka): string {
  const sveti = x.klyuch === 'nedeklariraniNoPlateni' && x.redove.length > 0;
  return `
        <div class="plochka${sveti ? ' duljimo' : ''}" data-plochka="${ekraniraj(x.ime)}">
          <span class="ime">${ekraniraj(x.ime.toUpperCase())}</span>
          <b data-st="${x.sbor_st}" data-spravka="${ekraniraj(x.klyuch)}">${pishi(x.sbor_st)}</b>
          <span class="pod">${x.redove.length} ${x.redove.length === 1 ? 'ред' : 'реда'} · ${ekraniraj(x.pita)}</span>
        </div>`;
}

function redNaSpravkata(r: RedZaSchetovodstvoto): string {
  const chaka = r.sastoyanie === 'plateno' && r.deklarirano === 'nedeklarirano';
  return `
        <div class="red spravkared${chaka ? ' duljimo' : ''}" translate="no"
             data-plateno="${r.sastoyanie}" data-deklarirano="${r.deklarirano}">
          <span class="kletka"><b>${ekraniraj(r.koy)}</b><span>${r.posoka === 'prihod' ? 'издадена' : 'получена'}</span></span>
          <span class="kletka"><span>${ekraniraj(r.osnovanie)}</span></span>
          <span class="kletka"><span>${ekraniraj(r.period)}</span></span>
          <span class="suma" data-st="${r.suma_st}">${pishi(r.suma_st)}</span>
          <span class="kletka"><span>${
            r.sastoyanie === 'plateno'
              ? 'платено'
              : `остават ${pishi(r.suma_st - r.plateno_st)}`
          }</span></span>
          <span class="kletka"><span>${r.deklarirano === 'deklarirano' ? 'декларирано' : 'НЕ е декларирано'}</span></span>
        </div>`;
}

/**
 * ДВЕТЕ ПОЛЕТА за обхвата · сменят изгледа, не пипат нищо друго.
 *
 * Паметта им се пренесе от `nap.spravki.*` на `smetki.spravki.*` заедно с
 * екрана. Старият ключ НЕ се чете: обхватът е удобство, не запис, и загубеното
 * му помнене струва един избор, докато четенето на два ключа би оставило две
 * места, които се разминават.
 */
export function zakachiSpravkite(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  for (const [znak, klyuch] of [
    ['#spravki-ot', 'smetki.spravki.ot'],
    ['#spravki-do', 'smetki.spravki.do'],
  ] as const) {
    koren.querySelector<HTMLInputElement>(znak)?.addEventListener('change', async (e) => {
      zapomniEkranno(klyuch, (e.target as HTMLInputElement).value);
      await prerisuvay();
    });
  }
}
