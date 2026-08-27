/**
 * ПАДАЩИЯТ РЕД НА НАСТРОЙКИТЕ · тема по тема, различен за трима (И101 т.2).
 *
 * Негови думи: „Прозорци от настройки с падащо меню и изскачащи прозорци с
 * управление на всяка тема от настройки, **като падащ ред при натискане на
 * настройки**, и падащи редове с теми от Настройки, които са **различни от
 * стопанин и служителя с добавен и упълномощен служител**."
 *
 * ═══ ЗАЩО НЕ Е ВТОРИ ЕКРАН ═══
 *
 * Темите вече ЖИВЕЯТ някъде — в Таблото или в Настройки. Ако падащият ред ги
 * рисуваше сам, всяко управление щеше да има два входа и два дома, а вторият
 * дом винаги изостава. Затова редът е ПЪТ, не съдържание: води до онова, което
 * вече стои, и го подчертава за миг, за да се види къде е стигнало окото.
 *
 * Изскачащият прозорец остава само за темите, чието управление няма своя
 * секция никъде (`kade.vid === 'prozorets'`) — днес такава е една.
 *
 * ═══ ДОСТЪПНОСТТА НЕ Е ДОПЪЛНЕНИЕ ═══
 *
 * Падащ ред, който се затваря само с мишка, е капан за клавиатурата. Тук:
 * `Escape` затваря, `aria-expanded` казва състоянието, а фокусът се връща на
 * бутона, който го е отворил.
 */

import { ekraniraj } from './obshto.js';
import { otvoriProzorets } from './prozorets.js';
import { zavediDoSektsiyata } from './menyu-ekran.js';
import { ikona } from './ikoni.js';
import {
  IMENA_NA_GLEDASHTITE,
  temaPoKlyuch,
  temiPoGrupi,
  type KoyGleda,
  type TemaNastroyka,
} from '../src/domein/temi-nastroyki.js';

/** Кой ред е отворен · `null` значи затворен. Живее, докато екранът стои. */
let otvoren = false;

/**
 * Рисува пункта „Настройки" с падащия си ред.
 *
 * Пунктът е ЕДИН бутон с две задачи и това е нарочно: натискането отваря реда,
 * а изборът в реда води до темата. Два отделни бутона („Настройки" и стрелка)
 * биха питали човека нещо, което той не се е сещал да пита.
 */
export function redNaNastroykite(koy: KoyGleda, sEkran: boolean): string {
  const grupi = temiPoGrupi(koy);
  return `
    <div class="menyu-nastroyki${otvoren ? ' otvoreno' : ''}">
      <button type="button" class="navred nastroyki-vhod" id="nastroyki-vhod"${
        /**
         * ДВЕ ЗАДАЧИ, ЕДИН БУТОН · и това е нарочно.
         *
         * Натискането отваря реда И — на онзи, който има право на екрана —
         * отваря самия екран. Два бутона („Настройки" и стрелка до него) биха
         * питали човека нещо, което той не се е сещал да пита.
         *
         * Служителят вижда СЪЩИЯ пункт, но без `data-ekran`: неговите теми
         * живеят в Таблото, а екранът „Настройки" му е заключен. Скрит пункт
         * би му отнел и темите, които са НЕГОВИ (езикът, личното).
         */
        sEkran ? ' data-ekran="nastroyki"' : ''
      }
              aria-expanded="${otvoren ? 'true' : 'false'}" aria-controls="nastroyki-red">
        ${ikona('nastroyki', 'ikona navikona')}Настройки
        <span class="strelka-dolu" aria-hidden="true">▾</span>
      </button>
      <div class="nastroyki-red" id="nastroyki-red" role="menu"
           aria-label="Теми на настройките"${otvoren ? '' : ' hidden'}>
        <p class="drebno za-kogo">Твоите теми · ${ekraniraj(IMENA_NA_GLEDASHTITE[koy])}</p>
        ${grupi.map(grupata).join('')}
      </div>
    </div>`;
}

/**
 * ЕДНА ГРУПА · заглавие и темите под него.
 *
 * `role="group"` с `aria-labelledby` е ЕДИНСТВЕНОТО, което върши работа тук:
 * вътре в `role="menu"` детето може да е `menuitem`, `group` или `separator` —
 * нищо друго. Само `<p>` със стил би било надпис, който четецът на екран
 * изговаря като изгубен текст между бутоните, вместо като име на групата им.
 *
 * Заглавието НЕ е бутон и няма `tabindex`: клавиатурата спира само там, където
 * има какво да се направи.
 */
function grupata(g: { grupa: { klyuch: string; ime: string }; temi: readonly TemaNastroyka[] }): string {
  const nomer = `grupa-nastroyki-${ekraniraj(g.grupa.klyuch)}`;
  return `
    <div role="group" aria-labelledby="${nomer}">
      <p class="grupa-zaglavie" id="${nomer}">${ekraniraj(g.grupa.ime)}</p>
      ${g.temi.map(redNaTema).join('')}
    </div>`;
}

function redNaTema(t: TemaNastroyka): string {
  return `
    <button type="button" class="tema" role="menuitem" data-tema="${ekraniraj(t.klyuch)}">
      ${ikona(t.ikona)}
      <span class="dvete">
        <b>${ekraniraj(t.ime)}</b>
        <span class="drebno">${ekraniraj(t.opis)}</span>
      </span>
    </button>`;
}

/**
 * Съдържанието на изскачащия прозорец · само за темите без своя секция.
 *
 * Днес е една: езикът на интерфейса. Тя няма къде другаде да живее — не е
 * право, не се раздава и не влиза в Журнала (ADR-008), значи няма секция, към
 * която да се скролва.
 */
function tyaloNaProzoretsa(t: TemaNastroyka): string {
  if (t.klyuch === 'ezik') {
    return `
      <p>Езикът на <b>интерфейса</b> е на всеки сам. Той НЕ е право: няма го във
      възможностите и никой не го раздава.</p>
      <p class="drebno">Езикът на счетоводния <b>терминал</b> е друго нещо — заковава се
      при инсталиране от главния акаунт, защото термините му са членове от закон,
      не надписи. И двете не правят приложението продаваемо извън България:
      данъчният модел е български (ADR-008).</p>
      <p class="drebno">Смяната идва със своя резен — таблицата с низовете е обявена,
      непостроена. Дотук приложението говори на един език и това е казано, вместо
      да стои бутон, който не мени нищо.</p>`;
  }
  return '<p class="drebno">Тази тема няма свое управление тук.</p>';
}

/**
 * Закача реда · отваряне, избор, затваряне.
 *
 * `skroliDo` е подаден, а не вграден: „заведи ме до темата" значи различно
 * нещо според това дали тя е на ТОЗИ екран или на друг — а компонентът не
 * знае кой екран е отворен и не бива да научава.
 */
export function zakachiMenyutoNaNastroykite(
  koren: HTMLElement,
  prerisuvay: () => Promise<void>,
  otvoriEkran: (ekran: string) => Promise<void>,
): void {
  const vhod = koren.querySelector<HTMLButtonElement>('#nastroyki-vhod');
  const red = koren.querySelector<HTMLElement>('#nastroyki-red');
  if (!vhod || !red) return;

  const zatvori = () => {
    otvoren = false;
    red.hidden = true;
    vhod.setAttribute('aria-expanded', 'false');
    vhod.focus();
  };

  vhod.addEventListener('click', () => {
    otvoren = !otvoren;
    red.hidden = !otvoren;
    vhod.setAttribute('aria-expanded', otvoren ? 'true' : 'false');
    if (otvoren) red.querySelector<HTMLButtonElement>('.tema')?.focus();
  });

  // Escape затваря, а фокусът се връща на бутона — иначе клавиатурата остава
  // насред затворен ред и не знае къде е.
  koren.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape' && otvoren) zatvori();
  });

  for (const b of red.querySelectorAll<HTMLButtonElement>('[data-tema]')) {
    b.addEventListener('click', async () => {
      const tema = temaPoKlyuch(b.dataset['tema'] ?? '');
      if (!tema) return;
      otvoren = false;
      if (tema.kade.vid === 'prozorets') {
        pokazhiProzoretsa(tema);
        red.hidden = true;
        vhod.setAttribute('aria-expanded', 'false');
        return;
      }
      // ЕДИН дом на похвата „заведи и подчертай за миг" (`menyu-ekran.ts`):
      // редът на секциите прави същото и копие тук би се разминало.
      await zavediDoSektsiyata(tema.kade.ekran, tema.kade.sektsiya, otvoriEkran, prerisuvay);
    });
  }
}

/**
 * Изскачащият прозорец · механиката е ЕДНА (`app/prozorets.ts`).
 *
 * Дотук тук стоеше свое копие на фона, `Escape`-а и бутона. Обходът за чистота
 * го намери дословно еднакво с онова в историята на реда — а обещанието
 * „клавиатурата не остава в капан" (ADR-045) не бива да живее на две места.
 */
function pokazhiProzoretsa(t: TemaNastroyka): void {
  otvoriProzorets({ zaglavie: t.ime, pod: t.opis, tyalo: tyaloNaProzoretsa(t) });
}
