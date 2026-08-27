/**
 * ИЗСКАЧАЩИЯТ ПРОЗОРЕЦ · един дом за механиката (правило 17).
 *
 * ═══ ЗАЩО СЕ ИЗВАДИ ═══
 *
 * Историята на реда (ADR-022) и темите на Настройките (ADR-045) отваряха по
 * един и същ прозорец, всяка със СВОЕ копие на механиката: фон, карта,
 * `Escape`, натискане отстрани, бутон „Затвори". Обходът за чистота
 * (`npm run chistota`) ги намери като дословно еднакви.
 *
 * Две копия на този похват не са безобидни. ADR-045 обещава поименно:
 * „**Клавиатурата не остава в капан:** `Escape` затваря, `aria-expanded` казва
 * състоянието, **фокусът се връща на бутона**." Обещание, изпълнено на две
 * места, се спазва наполовина при първата поправка — и половината, която
 * изостава, е винаги онази, която никой не отваря често.
 *
 * ═══ КАКВО ДОБАВЯ, ОСВЕН ЧЕ СЛИВА ═══
 *
 * Едното копие ВРЪЩАШЕ фокуса, другото — не. Слети, двете го връщат: прозорец,
 * който изхвърля фокуса в началото на документа, кара човека с клавиатура да
 * извърви целия екран наново.
 */

import { ekraniraj } from './obshto.js';
import { lostatNaGoleminata, zakachiGoleminata } from './golemina.js';

interface Prozorets {
  /** заглавието вътре · и достъпното име на прозореца */
  readonly zaglavie: string;
  /** ред под заглавието · празен, ако няма какво да се каже */
  readonly pod?: string;
  /** ГОТОВА разметка · викащият я е екранирал сам, тя е негова */
  readonly tyalo: string;
}

/**
 * Отваря прозорец и връща затварящата го функция.
 *
 * Връща я, вместо да я крие: викащ, който отваря прозорец в отговор на
 * действие, понякога трябва да го затвори сам (записът мина, темата се смени).
 * Без това той нямаше друг път освен да търси възела в документа.
 */
export function otvoriProzorets(p: Prozorets): () => void {
  // ФОКУСЪТ СЕ ЗАПОМНЯ ПРЕДИ да се вземе — иначе няма къде да се върне.
  const otkade = document.activeElement as HTMLElement | null;

  const fon = document.createElement('div');
  fon.className = 'istoriya-fon';
  fon.innerHTML = `
    <div class="istoriya-karta" role="dialog" aria-modal="true" aria-label="${ekraniraj(p.zaglavie)}">
      ${
        /* ЛОСТЪТ ЗА РАЗМЕРА И ТУК · негово: „на всеки прозорец" (резен 10).
           Прозорецът ПОКРИВА шапката, значи лостът горе остава зад воала — а
           точно тук се чете най-дребният текст. Разметката идва от ЕДНА
           функция; двете места не са две истини. */
        lostatNaGoleminata()
      }
      <h3>${ekraniraj(p.zaglavie)}</h3>
      ${p.pod ? `<p class="pod">${ekraniraj(p.pod)}</p>` : ''}
      ${p.tyalo}
      <button type="button" class="vtorichen istoriya-zatvori">Затвори</button>
    </div>`;

  const zatvori = (): void => {
    fon.remove();
    document.removeEventListener('keydown', priKlavish);
    otkade?.focus?.();
  };
  const priKlavish = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') zatvori();
  };

  // Натискане ВЪРХУ ФОНА затваря; натискане в картата — не. Затова се сверява
  // самата цел, а не се разчита на изкачването на събитието.
  fon.addEventListener('click', (e) => {
    if (e.target === fon) zatvori();
  });
  fon.querySelector('.istoriya-zatvori')!.addEventListener('click', zatvori);
  document.addEventListener('keydown', priKlavish);
  document.body.append(fon);

  // Фокусът влиза В прозореца, за да е следващият Tab вътре в него.
  zakachiGoleminata(fon);
  fon.querySelector<HTMLButtonElement>('.istoriya-zatvori')!.focus();
  return zatvori;
}
