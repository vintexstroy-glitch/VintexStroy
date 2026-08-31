/**
 * ЖИВИЯТ ХЕДЪР · екранната половина (резен 49 · M15).
 *
 * РЕШЕНИЕТО НЕ Е ТУК — то е в `src/domein/zhiviyat-hedar.ts` и се проверява с
 * числа. Тук се МЕРИ и се слага ЕДИН клас. Разделението не е стил: „Дано при
 * скролване нагоре не се появява лаг при смяна на хедъра, а е мигновено!" —
 * значи на всяко движение няма право да се случва нищо освен четене на четири
 * числа и превключване на един клас.
 *
 * ЗАЩО НЕ `IntersectionObserver`. Той съобщава ПРАГОВЕ, а прагът на половината
 * зависи от ПОСОКАТА — надолу е нула, нагоре е половин. Наблюдател с два прага
 * пак нямаше да знае накъде се движи страницата, тъй че посоката пак щеше да се
 * пази отстрани. Едно четене на `scrollTop` носи и двете.
 */

import { zhiviyatHedar, type Posoka, type TablitsaNaEkrana } from '../src/domein/zhiviyat-hedar.js';

/** Белегът, който екранът чете · таблица без него не участва. */
const TABLITSI = '[data-tablitsa]';

/** Отпечатъкът на ГЛАВАТА · еднакъв прави две таблици роднини (домейнът решава). */
function otpechatakNaGlavata(tablitsa: HTMLElement): string {
  const glavi = [...tablitsa.querySelectorAll('thead th, .glava > *')].map((k) =>
    (k as HTMLElement).textContent?.trim() ?? '',
  );
  return glavi.join('·');
}

/**
 * СКРОЛИРАЩАТА КУТИЯ · тя е ЕДНА и е `.telo`, не прозорецът (резен 9а · `stil.css`).
 *
 * НАМЕРЕНО ОТ ПРОХОДА, не от четене: първата версия слушаше `window` и четеше
 * `window.scrollY`. Тестовете на домейна минаваха — те получават числа наготово,
 * — а в браузъра главата не мърдаше изобщо, защото прозорецът не се скролва.
 * Точно за това е проходът: числата бяха верни, съдът — грешен.
 */
function kutiyata(koren: HTMLElement): HTMLElement {
  // ТЪРСИ СЕ НАДОЛУ, не нагоре · `.telo` е ВЪТРЕ в корена (`main.ts` я рисува).
  // Втора находка на прохода: `closest` гледа предшествениците, връщаше нищо, и
  // слушателят кацваше на `documentElement` — елемент, който изобщо не скролва.
  // Тестовете на домейна пак минаваха: те получават числа наготово. Мярка, която
  // не пипа истинския съд, мери себе си.
  return koren.querySelector<HTMLElement>('.telo') ?? koren.ownerDocument.documentElement;
}

/**
 * Какво вижда екранът СЕГА · чисти числа за чистата функция.
 *
 * `gore` е спрямо ГОРНИЯ РЪБ НА КУТИЯТА, не на прозореца: залепването брои
 * спрямо своя скролиращ предшественик, значи и мярката трябва да брои спрямо
 * него — инак половината се мери от друга линия, различна от онази, на която
 * главата стои.
 */
export function izmeri(koren: HTMLElement, kutiya?: HTMLElement): TablitsaNaEkrana[] {
  const k = kutiya ?? kutiyata(koren);
  const gornata = k.getBoundingClientRect().top;
  return [...koren.querySelectorAll<HTMLElement>(TABLITSI)].map((t) => {
    const r = t.getBoundingClientRect();
    return {
      klyuch: t.dataset['tablitsa'] ?? '',
      gore: Math.round(r.top - gornata),
      visochina: Math.round(r.height),
      otpechatak: otpechatakNaGlavata(t),
    };
  });
}

/**
 * ЗАКАЧА ЖИВИЯ ХЕДЪР · връща как да се отвърже, за да не се трупат слушатели.
 *
 * Живата глава носи `data-zhiv-hedar`; останалите го нямат. Класът е ЕДИН, за да
 * може екранът да реши как го показва в темата, без домейнът да знае за цветове.
 */
/**
 * ПРЕДИШНАТА ЗАКАЧКА НА ТАЗИ КУТИЯ · за да не се трупат слушатели.
 *
 * Викащият връща дръжка и се очаква да я извика. Нарочното счупване показа, че
 * ако той я забрави, НИЩО не пада: слушателите се трупат тихо и всеки мери целия
 * екран на всеки кадър — тоест точно лагът, който той нарочно е поискал да го
 * няма, се връща по мълчание. Затова закачката чисти СВОЯ предшественик сама:
 * дисциплина, която не се проверява, не е защита.
 */
const predishnata = new WeakMap<HTMLElement, () => void>();

export function zakachiZhiviyaHedar(koren: HTMLElement): () => void {
  const kutiya = kutiyata(koren);
  predishnata.get(kutiya)?.();
  let predishenSkrol = kutiya.scrollTop;
  let segashniyat = '';
  let chaka = false;

  const presmetni = (): void => {
    chaka = false;
    const sega = kutiya.scrollTop;
    const posoka: Posoka = sega >= predishenSkrol ? 'nadolu' : 'nagore';
    predishenSkrol = sega;

    const visochina = kutiya.clientHeight;
    const tablitsi = izmeri(koren, kutiya);
    const zhiv = zhiviyatHedar(tablitsi, posoka, visochina, segashniyat);
    if (zhiv === segashniyat) return;
    segashniyat = zhiv;
    for (const t of koren.querySelectorAll<HTMLElement>(TABLITSI)) {
      // ОТМЕТКА, не стил · темата решава как изглежда живата глава.
      if (t.dataset['tablitsa'] === zhiv) t.dataset['zhivHedar'] = '';
      else delete t.dataset['zhivHedar'];
    }
  };

  // ЕДНО СМЯТАНЕ НА КАДЪР · скролът вали по десетки събития в секунда, а екранът
  // се пречертава веднъж. Без това мерките се четат по средата на подредбата и
  // браузърът я смята наново — точно лагът, който той не иска.
  const priSkrol = (): void => {
    if (chaka) return;
    chaka = true;
    requestAnimationFrame(presmetni);
  };

  kutiya.addEventListener('scroll', priSkrol, { passive: true });
  window.addEventListener('resize', priSkrol, { passive: true });
  presmetni();
  const otvarzhi = (): void => {
    kutiya.removeEventListener('scroll', priSkrol);
    window.removeEventListener('resize', priSkrol);
    predishnata.delete(kutiya);
  };
  predishnata.set(kutiya, otvarzhi);
  return otvarzhi;
}
