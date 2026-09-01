/**
 * ГРУПАТА ДЕЙСТВИЯ · един бутон с дума и стрелкичка (ADR-057).
 *
 * Негови думи: „**С падащо меню когато е повече от един** и исписване след
 * избора и показване. **Когато е една функция си го пише на бутона.**" И как
 * точно работи изборът: „Избираш действието — **то променя името на бутона** с
 * една дума описваща действието, и **чак когато избереш и натиснеш бутона
 * стартира действието**. Бутон с малко тикче за падащо меню." Дръжката е
 * „**стрелкичка**".
 *
 * Тоест не „скрий думите", а СГРУПИРАЙ. Няколко действия на едно място стават
 * ЕДИН бутон с дума и стрелкичка до него; едно действие си остава както си е.
 * Менюто СМЕНЯ думата, но НЕ действа — действа натискането на бутона.
 *
 * ═══ ЗАЩО ГЕНЕРИЧНО, А НЕ В ШЕСТНАЙСЕТТЕ ЕКРАНА ═══
 *
 * Същата причина, която е записана в `app/podredba.ts` и важи дословно:
 * вписано в шестнайсетте файла, това щяха да са шестнайсет места, които се
 * разминават, а седемнайсетият щеше да се роди без него.
 *
 * ═══ ЗАЩО БУТОНИТЕ ОСТАВАТ В DOM-А ═══
 *
 * Похватът е вече в къщата — `app/kontekstno-menyu.ts`: „менюто НЕ носи свои
 * действия: то показва бутоните, които редът ВЕЧЕ има, и ги натиска вместо
 * човека. Едно действие, един път през кода — менюто е **втора дръжка на
 * същата врата, не втора врата**."
 *
 * Затова групата не прерисува нищо и не преписва нито един слушател: увива
 * наличните бутони, оставя ЕДИН видим, а другите скрива. Всеки `id`, всяко
 * `data-` и всеки слушател си стоят точно както са били.
 *
 * ═══ ЗАЩО ИЗБОРЪТ СЕ ПОМНИ ═══
 *
 * Екранът се прерисува при ВСЯКО натискане на клавиш в редакция на клетка. Без
 * памет думата щеше да скача обратно на първата под ръцете на човека — по-лошо
 * от липсваща. А изборът е ПОГЛЕД, не факт (ADR-022 · правило 23): затова
 * живее в паметта на екрана и никога в Журнала.
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';

/**
 * САМО РЕДОВЕТЕ (стеснено в резен 76 · И124 т.3 · ADR-133).
 *
 * Групите по секциите и в шапката ПАДНАХА: „Тези бутони са самостоятелни и са
 * видими." Редовият лост ОСТАВА, защото там двете му точки се срещат: т.4
 * („височините… не са спазени") иска нисък ред, а четири видими лоста в
 * клетка правят от реда кула — премерено: 127px срещу праг 56. Стеснение,
 * казано на глас (правило 15), не тихо изключение.
 */
const KONTEYNERI = '.red .butoni';

/**
 * КЛЮЧЪТ НА ЕДНА ГРУПА · думите ѝ, в реда на рисуване.
 *
 * Чиста функция, за да се тества · думите СА самоличността: сменят ли се
 * действията, групата е друга и старият избор няма какво да значи в нея.
 * Позиция би била по-крехка (един добавен бутон отгоре мести всичко), а `id`
 * го няма на бутоните с `data-`.
 */
export function klyuchNaGrupata(imena: readonly string[]): string {
  return imena.join('·');
}

/**
 * КОЕ ДА СЕ ВИДИ · запомненото, ако още го има; иначе ПЪРВОТО.
 *
 * Изчезналото действие (условен бутон, който този път не се е нарисувал) не
 * оставя празна група и не гърми — пада обратно на първото, което е и редът,
 * в който екранът ги е нарисувал.
 */
export function koeDaSeVidi(imena: readonly string[], zapomneno: string): number {
  const i = imena.indexOf(zapomneno);
  return i < 0 ? 0 : i;
}

/**
 * Думата на един бутон · без знака, ако носи такъв.
 *
 * `butonSIkona` слага думата в `.duma`; суровият бутон я носи направо в текста
 * си. Двата случая дават ЕДНА дума, за да не зависи ключът от разметката.
 */
function dumataNa(b: HTMLButtonElement): string {
  const duma = b.querySelector('.duma');
  return (duma?.textContent ?? b.textContent ?? '').trim();
}

/**
 * ДУМА ЛИ Е · има ли поне една БУКВА.
 *
 * „Празен текст" не стига за граница: ▲ и ▼ са текст, при това непразен. Той
 * каза „исписване" — а знак не се изписва. Затова мярката е буква, на която и
 * да е азбука (`\p{L}`), не дължина и не изброен списък от знаци: изброените
 * знаци се разминават с първия нов знак, който някой сложи на бутон.
 */
function eDuma(tekst: string): boolean {
  return /\p{L}/u.test(tekst);
}

/**
 * КОИ БУТОНИ ВЛИЗАТ В ГРУПА.
 *
 * Второстепенни (`.vtorichen`), с ДУМА, и още неувити. Три граници, и всяка е
 * платена:
 *
 *   · ГЛАВНИТЕ (`.glaven`) не влизат никога — „Запиши имота" не е избор между
 *     равни, а действието, заради което формата съществува;
 *   · ГОЛИЯТ ЗНАК (▲ ▼ в Табове и в подредбата) няма дума, а той каза
 *     „исписване" — менюто е за действия с ДУМА. Стрелка, която се натиска
 *     пет пъти подред, в меню става неизползваема;
 *   · СТРЕЛКИЧКАТА на самата група — иначе втори проход би я хванал за
 *     действие и би направил група от групата.
 */
function deystviyataV(konteyner: HTMLElement): HTMLButtonElement[] {
  return [...konteyner.querySelectorAll<HTMLButtonElement>('button.vtorichen')].filter(
    (b) => eDuma(dumataNa(b)) && !b.classList.contains('strelkichka') && !b.closest('.grupa-deystviya'),
  );
}

let otvorenoMenyu: HTMLElement | null = null;
/** Дръжката, отворила менюто · пази се, за да не се затвори САМА от себе си. */
let otvorilaGo: HTMLElement | null = null;

function zatvori(): void {
  otvorenoMenyu?.remove();
  otvorenoMenyu = null;
  otvorilaGo?.setAttribute('aria-expanded', 'false');
  otvorilaGo = null;
}

/** Закача се ВЕДНЪЖ · менютата се затварят както в Уиндоус (образецът е
 *  `kontekstno-menyu.ts`): клик другаде, `Escape`, скрол. */
let zakachenoZatvaryane = false;

function zakachiZatvaryaneto(): void {
  if (zakachenoZatvaryane) return;
  zakachenoZatvaryane = true;
  document.addEventListener('click', (e) => {
    // И СТРЕЛКИЧКАТА се брои за „вътре". Иначе менюто се затваря САМО ОТ СЕБЕ
    // СИ: нейният клик я отваря, същото събитие продължава нагоре до документа,
    // и там я заварва отворена, а целта е извън менюто. Контекстното меню няма
    // тази беда, защото се вдига от `contextmenu`, не от `click` — затова
    // похватът не се пренася наум, а с тази бележка.
    if (otvorenoMenyu && !otvorenoMenyu.contains(e.target as Node) && !otvorilaGo?.contains(e.target as Node)) {
      zatvori();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') zatvori();
  });
  // ПРИ СКРОЛ МЕНЮТО СЕ ПРЕМЕСТВА, НЕ СЕ ЗАТВАРЯ.
  //
  // Контекстното меню се затваря, защото е закачено за ТОЧКА от екрана и след
  // скрол сочи нищо. Това тук е закачено за СТРЕЛКИЧКАТА — тя се мести, значи
  // и то се мести с нея.
  //
  // Разликата не е вкус, а условие за работа: натискането на ред от менюто
  // само по себе си вдига скрол (браузърът придърпва целта във видимото), а
  // затваряне при скрол значи меню, което изчезва точно докато го натискаш.
  // Проходът го хвана като „чакам ред, който го има в разметката" — най-
  // объркващата възможна грешка.
  document.addEventListener('scroll', postaviMenyuto, { capture: true, passive: true });
  addEventListener('resize', postaviMenyuto, { passive: true });
}

/** Слага менюто под своята стрелкичка · и го пази вътре в екрана. */
function postaviMenyuto(): void {
  if (!otvorenoMenyu || !otvorilaGo) return;
  const kade = otvorilaGo.getBoundingClientRect();
  otvorenoMenyu.style.left = `${Math.min(kade.left, innerWidth - otvorenoMenyu.offsetWidth - 8)}px`;
  otvorenoMenyu.style.top = `${Math.min(kade.bottom + 4, innerHeight - otvorenoMenyu.offsetHeight - 8)}px`;
}

/**
 * Свива ЕДНА група · вика се за всеки контейнер с две и повече действия.
 *
 * Скриването е с `hidden`, а не с `display: none` от клас: `hidden` е СВОЙСТВО
 * на елемента и четецът на екран го зачита без CSS. Скритият бутон си остава
 * в DOM-а с целия си слушател — менюто само сменя кой е видимият.
 */
function sviyGrupata(konteyner: HTMLElement, butoni: HTMLButtonElement[], ekran: string): void {
  const imena = butoni.map(dumataNa);
  const klyuch = `grupa.${ekran}.${klyuchNaGrupata(imena)}`;
  const izbrano = koeDaSeVidi(imena, chetiEkranno<string>(klyuch, ''));

  const grupa = document.createElement('span');
  grupa.className = 'grupa-deystviya';
  // Вмъква се ТАМ, където е стоял първият бутон — иначе групата би скочила в
  // края на контейнера и „Откажи" би минал пред обяснението под него.
  butoni[0]!.before(grupa);
  for (const b of butoni) grupa.append(b);

  const pokazhi = (i: number): void => {
    butoni.forEach((b, j) => {
      b.hidden = j !== i;
    });
    zapomniEkranno(klyuch, imena[i]);
  };
  pokazhi(izbrano);

  const strelkichka = document.createElement('button');
  strelkichka.type = 'button';
  strelkichka.className = 'vtorichen malak strelkichka';
  strelkichka.setAttribute('aria-haspopup', 'menu');
  strelkichka.setAttribute('aria-expanded', 'false');
  strelkichka.setAttribute('aria-label', 'Другите действия');
  strelkichka.title = 'Другите действия';
  strelkichka.textContent = '▾';
  grupa.append(strelkichka);

  strelkichka.addEventListener('click', () => {
    if (otvorenoMenyu) {
      zatvori();
      return;
    }
    const menyu = document.createElement('div');
    menyu.className = 'kontekstno-menyu';
    menyu.setAttribute('role', 'menu');
    imena.forEach((ime, i) => {
      const red = document.createElement('button');
      red.type = 'button';
      red.setAttribute('role', 'menuitem');
      red.dataset['deystvie'] = ime;
      red.textContent = ime;
      red.addEventListener('click', () => {
        zatvori();
        // САМО сменя думата · действието чака своето натискане. Точно това
        // разделение той поиска, и точно него пази проходът: изборът НЕ
        // добавя нито едно събитие.
        pokazhi(i);
        butoni[i]!.focus({ preventScroll: true });
      });
      menyu.append(red);
    });

    document.body.append(menyu);
    otvorenoMenyu = menyu;
    otvorilaGo = strelkichka;
    // Първо се мери, после се поставя — менюто не бива да излиза от екрана.
    postaviMenyuto();
    strelkichka.setAttribute('aria-expanded', 'true');
    // `preventScroll` НЕ е излишен: фокусът върху пресен възел кара браузъра да
    // го придърпа във видимото, това вдига `scroll`, а слушателят за скрол
    // затваря менюто — тоест менюто се затваряше САМО, в мига на отварянето.
    // Проходът го хвана като „меню без редове", което ту го има, ту го няма.
    menyu.querySelector('button')?.focus({ preventScroll: true });
  });
}

/**
 * Свива всички групи на екрана · вика се СЛЕД всяко рисуване.
 *
 * Прерисуването прави нови възли, значи всяко рисуване иска нов проход. Това
 * не е скъпо: обхожда се веднъж списък от няколко контейнера, а групите с
 * един бутон излизат веднага.
 */
export function zakachiGrupite(koren: HTMLElement, ekran: string): void {
  zakachiZatvaryaneto();
  for (const konteyner of koren.querySelectorAll<HTMLElement>(KONTEYNERI)) {
    const butoni = deystviyataV(konteyner);
    // Едно действие си пише думата на бутона — негово правило, дословно.
    if (butoni.length < 2) continue;
    sviyGrupata(konteyner, butoni, ekran);
  }
}
