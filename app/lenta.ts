/**
 * ЛЕНТАТА · свива се и се застопорява (негова дума, 27.08).
 *
 * „В менюто да се скрива като при клод и **да може да се застопори**."
 *
 * Две състояния, едно копче:
 *
 *   · ЗАСТОПОРЕНА — стои разтворена и не мърда. Това е подразбраното: човек,
 *     който още не е избирал, не бива да губи имената на пунктовете.
 *   · СВИТА — остават само знаците (52px вместо 232). Минаването с мишка я
 *     разтваря НАД съдържанието, не до него.
 *
 * ═══ ЗАЩО РАЗТВАРЯНЕТО Е НАД СЪДЪРЖАНИЕТО ═══
 *
 * Ако лентата бутне таблицата при всяко минаване с мишка, редовете под курсора
 * се местят и човек натиска друго, не което е гледал. Затова при разтваряне тя
 * ЛЯГА върху екрана (`position: absolute`) и нищо отдолу не помръдва — точно
 * заради това `.ekran` получава `position: relative`.
 *
 * ═══ ЗАЩО В ПАМЕТТА НА ЕКРАНА, А НЕ В ЖУРНАЛА ═══
 *
 * „Свита ли ми е лентата" е ПОГЛЕД, не факт (ADR-022 · правило 23): мой е, на
 * това устройство, и не мени какво четат другите.
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { ikona } from './ikoni.js';

const KLYUCH = 'lenta.svita';

export function lentataESvita(): boolean {
  return chetiEkranno<boolean>(KLYUCH, false);
}

/**
 * Копчето · рисува се в шапката на лентата.
 *
 * Носи `aria-pressed`, а не `aria-expanded`: това е ПРЕВКЛЮЧВАТЕЛ на състояние
 * („застопорена ли е"), не дръжка на падащ ред. Четецът на екран казва различни
 * неща за двете и объркването се чува.
 */
export function kopchetoNaLentata(svita: boolean): string {
  const dumi = svita ? 'Застопори лентата разтворена' : 'Свий лентата';
  return (
    `<button type="button" class="svivach" id="svii-lentata"` +
    ` aria-pressed="${svita ? 'false' : 'true'}" title="${dumi}" aria-label="${dumi}">` +
    `${ikona('zastopori')}</button>`
  );
}

/** Закача копчето · вика се СЛЕД всяко рисуване. */
export function zakachiSvivachaNaLentata(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLButtonElement>('#svii-lentata')?.addEventListener('click', async () => {
    zapomniEkranno(KLYUCH, !lentataESvita());
    await prerisuvay();
  });
}

// ── РАЗДЕЛИТЕЛНАТА ЛИНИЯ · резен 63 ─────────────────────────────────────────
/**
 * ШИРИНАТА НА ПАНЕЛА · негова поръчка, дословно (31.08):
 *
 * „…прибирането му с ЕДНО ДОКОСВАНЕ на разделителната линия и движението на
 *  ширините на таблото с ЗАДЪРЖАНЕ."
 *
 * Тоест ЕДНА линия, ДВЕ действия, разделени по време: късо докосване прибира,
 * задържане и влачене мери. Без този праг всяко влачене щеше да завършва и с
 * прибиране — панелът се свива точно когато човек го е разширил.
 */
const KLYUCH_SHIRINA = 'lenta.shirina';

/** Подразбраната ширина · същата, с която панелът живя досега. */
export const SHIRINA_PODRAZBIRANA = 232;
/** По-тясно от това имената не се четат; по-широко изяжда таблицата. */
export const SHIRINA_NAY_MALKO = 168;
export const SHIRINA_NAY_MNOGO = 420;
/**
 * Колко пиксела правят влаченето ВЛАЧЕНЕ · под този праг то е ДОКОСВАНЕ.
 *
 * Пръст, който само докосва, мърда с един-два пиксела. Праг нула би направил
 * всяко докосване влачене и панелът никога не би се прибирал.
 */
export const MRADVA_ZA_VLACHENE = 4;

/** Ширината, свита в границите си · чиста функция, за да се проверява. */
export function shirinaVGranitsi(shirina: number): number {
  if (!Number.isFinite(shirina)) return SHIRINA_PODRAZBIRANA;
  return Math.min(SHIRINA_NAY_MNOGO, Math.max(SHIRINA_NAY_MALKO, Math.round(shirina)));
}

function shirinataNaLentata(): number {
  return shirinaVGranitsi(chetiEkranno<number>(KLYUCH_SHIRINA, SHIRINA_PODRAZBIRANA));
}

/**
 * ПОЛАГА ширината върху корена · през CSS-променлива, не през атрибут.
 *
 * НАХОДКА, платена от прохода: приложението носи `default-src 'self'` и
 * БРАУЗЪРЪТ ОТКАЗВА всеки inline `style="…"` в разметката. Първият ми опит
 * пишеше ширината точно така — и тя мълчаливо не се прилагаше, а конзолата
 * се пълнеше с откази. Правилото не се разхлабва заради една ширина.
 *
 * През CSSOM (`setProperty`) е позволено и е по-точно: стилът стои на КОРЕНА,
 * тъй че преживява прерисуването на цялата черупка.
 */
export function polozhiShirinata(): void {
  document.documentElement.style.setProperty('--shirina-lenta', `${shirinataNaLentata()}px`);
}

/** Разделителната линия · рисува се МЕЖДУ панела и екрана. */
export function razdelitelyat(): string {
  return (
    `<div class="razdelitel" id="razdelitel" role="separator" aria-orientation="vertical"` +
    ` title="Докосни, за да прибереш · задръж и влачи, за да мериш"` +
    ` aria-label="Разделителна линия · докосване прибира панела, задържане мени ширината"></div>`
  );
}

/**
 * Закача линията · вика се СЛЕД всяко рисуване.
 *
 * Ширината се пише ПРАВО в стила, докато трае влаченето, и се ЗАПОМНЯ чак на
 * пускане. Прерисуване на всеки пиксел би било прерисуване на цялата книга —
 * а тук се мени един размер, не едно число в нея.
 */
export function zakachiRazdelitelya(koren: HTMLElement, prerisuvay: () => Promise<void>): void {
  const liniya = koren.querySelector<HTMLElement>('#razdelitel');
  const panel = koren.querySelector<HTMLElement>('.strana');
  if (!liniya || !panel) return;

  liniya.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const nachalo = e.clientX;
    const bilo = panel.getBoundingClientRect().width;
    let vlacheno = false;
    liniya.setPointerCapture(e.pointerId);

    const mesti = (h: PointerEvent): void => {
      if (Math.abs(h.clientX - nachalo) >= MRADVA_ZA_VLACHENE) vlacheno = true;
      if (!vlacheno) return;
      document.documentElement.style.setProperty(
        '--shirina-lenta',
        `${shirinaVGranitsi(bilo + (h.clientX - nachalo))}px`,
      );
    };
    const pusni = async (h: PointerEvent): Promise<void> => {
      liniya.removeEventListener('pointermove', mesti);
      liniya.removeEventListener('pointerup', pusni);
      liniya.removeEventListener('pointercancel', pusni);
      if (vlacheno) {
        // ВЛАЧЕНЕ · мерене. Свитият панел се разтваря сам: човек, който мери
        // ширина, я иска видима.
        zapomniEkranno(KLYUCH_SHIRINA, shirinaVGranitsi(bilo + (h.clientX - nachalo)));
        if (lentataESvita()) zapomniEkranno(KLYUCH, false);
      } else {
        // ДОКОСВАНЕ · прибиране.
        zapomniEkranno(KLYUCH, !lentataESvita());
      }
      await prerisuvay();
    };
    liniya.addEventListener('pointermove', mesti);
    liniya.addEventListener('pointerup', (h) => void pusni(h));
    liniya.addEventListener('pointercancel', (h) => void pusni(h));
  });
}

// ── ДВАТА СЛОЯ НА РЕДА · резен 15 · И111 ─────────────────────────────────────
/**
 * РЕДЪТ НА ПУНКТОВЕТЕ · негово решение от 28.08, взето измежду три:
 * **„И ДВЕТЕ · начален ред + личен"**.
 *
 * Питах го, защото планът носеше в кавички изречение като негово — „Стопанинът
 * заковава реда, другите само скриват" — а претърсването по правило 24 върна за
 * него НУЛА попадения в изворите, докато две негови дати казваха обратното:
 * „всеки човек сам да подреди и размества" (И101) и „всеки сам да създава и
 * подрежда по собствения си бизнес" (И91). Изречение в жив документ, сложено в
 * неговата уста без адрес, изглежда като решение в сила и се цитира с години.
 *
 * ═══ ТРИТЕ СЛОЯ, отдолу нагоре ═══
 *
 * | слой | кой | къде живее | Журнал |
 * | обявеният ред | кодът · `EKRANI` | регистърът на екраните | — |
 * | НАЧАЛНИЯТ ред | само Стопанинът | Журналът → `o.redNaLentata` | **ДА** |
 * | МОЯТ ред | всеки, за себе си | паметта на екрана | не |
 *
 * И отделно от трите — **скрит ли е пунктът**: лично, паметта на екрана, нула
 * събития. Скриването НЕ е ред и не се смесва с него.
 *
 * ═══ ЗАЩО СЛИВАНЕТО Е `podredi`, ВИКАНА ДВА ПЪТИ ═══
 *
 * `podredi(imena, zapomneni)` връща запомнените в своя ред, а непознатите
 * НАКРАЯ. Значи:
 *
 *   осн = podredi(живите, редНаСтопанина)   ← основата
 *   мой = podredi(осн, моятРед)             ← моето отгоре
 *
 * Пункт, който НЕ съм пипал, следва реда на Стопанина; нов екран се появява
 * НАКРАЯ и в двата слоя, без никой да е пипал записания ред. Точно затова
 * единайсетият екран се появи сам, и дванайсетият ще се появи също така.
 */

import { podredi, premesti } from './podredba.js';

const KLYUCH_RED = 'lenta.red';
const KLYUCH_SKRITI = 'lenta.skriti';

/**
 * ДВАТА ПУНКТА, КОИТО НЕ СЕ СКРИВАТ · и причината е различна за всеки.
 *
 * ТАБЛОТО е мястото, където скритото се ВРЪЩА. Скрито Табло е врата, заключена
 * отвътре: човек изключва пункт, после няма откъде да го върне.
 *
 * НАСТРОЙКИ стои по вече записана причина (`main.ts`): съдържанието му е по
 * роля, не самият пункт, и скриването му би отнело на служителя теми, които са
 * НЕГОВИ — езикът на интерфейса и личният таб.
 */
export const NESKRIVAEMI: readonly string[] = Object.freeze(['tablo', 'nastroyki']);

/** Моят ред · поглед, значи паметта на екрана (ADR-022 · правило 23). */
export function moyatRed(): readonly string[] {
  return chetiEkranno<readonly string[]>(KLYUCH_RED, []);
}

/** Кои пунктове съм скрил · пак поглед, пак моя. */
export function skritiPunktove(): readonly string[] {
  return chetiEkranno<readonly string[]>(KLYUCH_SKRITI, []);
}

/**
 * РЕДЪТ, КОЙТО СЕ РИСУВА · трите слоя, слети. ЧИСТА функция, за да има тест.
 *
 * Не пипа паметта и не чете нищо отвън: подава ѝ се всичко. Затова и трите
 * обещания по-долу се проверяват без браузър.
 */
export function podredeniPunktove(
  zhivi: readonly string[],
  osnoven: readonly string[],
  lichen: readonly string[],
): readonly string[] {
  return podredi(podredi(zhivi, osnoven), lichen);
}

/**
 * КОИ СЕ ВИЖДАТ · подредените минус скритите, но НЕСКРИВАЕМИТЕ остават.
 *
 * Отделна функция от подреждането нарочно: „кой е редът" и „кое се вижда" са
 * два въпроса с два различни дома, и слети щяха да дадат един списък, от който
 * не се вижда кое липсва, защото е скрито, и кое — защото го няма.
 */
export function vidimiPunktove(
  podredeni: readonly string[],
  skriti: readonly string[],
): readonly string[] {
  return podredeni.filter((k) => !skriti.includes(k) || NESKRIVAEMI.includes(k));
}

/** Скрива или връща един пункт · връща НОВ списък, старият не се пипа. */
export function sPrevklyuchenPunkt(
  skriti: readonly string[],
  klyuch: string,
): readonly string[] {
  if (NESKRIVAEMI.includes(klyuch)) return skriti;
  return skriti.includes(klyuch) ? skriti.filter((k) => k !== klyuch) : [...skriti, klyuch];
}

/** Мести пункт в МОЯ ред · записва и връща новия ред. */
export function premestiVMoyaRed(
  zhivi: readonly string[],
  osnoven: readonly string[],
  klyuch: string,
  posoka: 'gore' | 'dolu',
): readonly string[] {
  const nov = premesti(podredeniPunktove(zhivi, osnoven, moyatRed()), klyuch, posoka);
  zapomniEkranno(KLYUCH_RED, [...nov]);
  return nov;
}

/**
 * ЗАБРАВЯ МОЯ РЕД · връща се редът на Стопанина.
 *
 * Без този бутон човек, който веднъж е разместил, няма как да се върне към
 * общия ред — а „върни както беше" е първото, което се търси след разместване.
 */
export function zabraviMoyaRed(): void {
  zapomniEkranno(KLYUCH_RED, []);
}

/** Скрива/връща пункт · записва и връща новия списък скрити. */
export function prevklyuchiPunkt(klyuch: string): readonly string[] {
  const nov = sPrevklyuchenPunkt(skritiPunktove(), klyuch);
  zapomniEkranno(KLYUCH_SKRITI, [...nov]);
  return nov;
}
