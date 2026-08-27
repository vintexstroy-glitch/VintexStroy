/**
 * ПОДРЕДБАТА НА ЕКРАНА · всеки сам мести секциите си (И101 т.2).
 *
 * Негови думи: „**Функционалност за всеки човек сам да подреди и размества
 * както намери за добре.** Да е скрито с дребни бутончета и падащи менюта и
 * отметки."
 *
 * ═══ ЗАЩО ДИНАМИЧНО, А НЕ В РАЗМЕТКАТА НА ВСЕКИ ЕКРАН ═══
 *
 * Бутончетата се ДОБАВЯТ при закачане, вместо да се впишат в десетте екрана.
 * Причината не е мързел: вписани там, те щяха да са десет отделни места, които
 * се разминават — и единайсетият екран щеше да се роди без тях, без някой да
 * забележи. Тук всеки екран ги получава по едно и също правило, а нов екран
 * ги получава даром.
 *
 * ═══ ЗАЩО ЕКРАННО, А НЕ В ЖУРНАЛА ═══
 *
 * Подредбата е ПОГЛЕД, не факт (ADR-022): „какво гледам", не „какво е вярно".
 * В Журнала тя щеше да е обща за всички — а той иска обратното: всеки СВОЯТА.
 * Затова живее там, където живеят и другите погледи — в паметта на екрана, по
 * ключ на екрана.
 *
 * ═══ КАКВО СТАВА С НОВА СЕКЦИЯ ═══
 *
 * Незапомнена секция отива НАКРАЯ и не изчезва. Обратното — да се показват
 * само запомнените — би скрило всяка нова функция от онзи, който веднъж е
 * пипал подредбата, и то мълчешком.
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { ikona } from './ikoni.js';

/** Ключът на подредбата за един екран. */
function klyuchat(ekran: string): string {
  return `podredba.${ekran}`;
}

function zapomneniyatRed(ekran: string): readonly string[] {
  return chetiEkranno<string[]>(klyuchat(ekran), []);
}

/**
 * ПОДРЕЖДА имената по запомнения ред · чиста функция, за да се тества.
 *
 * Три правила, и трите за едно: нищо не изчезва.
 *   · запомнените, които още ги има → в запомнения ред;
 *   · новите → накрая, в реда, в който екранът ги е нарисувал;
 *   · изчезналите (запомнени, но вече ги няма) → просто отпадат.
 */
export function podredi(
  imena: readonly string[],
  zapomneni: readonly string[],
): readonly string[] {
  const ima = new Set(imena);
  const podredeni = zapomneni.filter((k) => ima.has(k));
  const veche = new Set(podredeni);
  return [...podredeni, ...imena.filter((k) => !veche.has(k))];
}

/** Мести един ключ с една стъпка · връща НОВ ред, не мени подадения. */
export function premesti(
  red: readonly string[],
  klyuch: string,
  posoka: 'gore' | 'dolu',
): readonly string[] {
  const i = red.indexOf(klyuch);
  if (i < 0) return red;
  const j = posoka === 'gore' ? i - 1 : i + 1;
  if (j < 0 || j >= red.length) return red;
  const nov = [...red];
  nov[i] = nov[j]!;
  nov[j] = klyuch;
  return nov;
}

/**
 * КЛЮЧЪТ НА ЕДНА СЕКЦИЯ · маркерът, ако го има; иначе ЗАГЛАВИЕТО.
 *
 * Днес ВСЯКА секция носи `data-sektsiya` и падането към заглавието е само
 * предпазител за секция, родена без маркер. Дотук беше обратното — маркерът
 * стоеше само там, където някоя тема води до него, а останалите 50 се
 * ключуваха по заглавието си. Цената на онова решение беше записана още тогава:
 * „смени ли се заглавието, тази секция пада накрая". Именуването на секции
 * (собственическо, по негова дума) прави точно това — затова маркерът стана
 * задължителен ПРЕДИ него, а не след.
 */
function klyuchNaSektsiya(e: HTMLElement): string {
  const beleg = e.dataset['sektsiya'];
  if (beleg) return beleg;
  const zaglavie = zaglavieNa(e);
  return zaglavie ? `zaglavie:${zaglavie}` : '';
}

function zaglavieNa(e: HTMLElement): string {
  return e.querySelector('.dyalglava h2, .dyalglava h3')?.textContent?.trim() ?? '';
}

/** Ключът, по който секцията се е помнела ПРЕДИ маркерите. */
function stariyatKlyuch(e: HTMLElement): string {
  const zaglavie = zaglavieNa(e);
  return zaglavie ? `zaglavie:${zaglavie}` : '';
}

/**
 * ПРЕВОД НА СТАРИТЕ КЛЮЧОВЕ · платен при слагането на маркерите.
 *
 * Онзи, който вече е местил секции, има запомнен ред от вида
 * `zaglavie:Нов имот`. Маркерът смени ключа — и БЕЗ този превод подредбата му
 * нямаше просто да се нулира: онези ключове, които още съвпадат, щяха да си
 * останат по местата, а другите да паднат накрая. Тоест РАЗБЪРКВАНЕ, не
 * нулиране — и то мълчаливо. Разбърканият екран не казва защо е разбъркан.
 *
 * Чиста функция, за да се тества · картата се строи от живия екран, защото
 * старият ключ СЕ СМЯТА от него и никога не е трябвало да се пази някъде.
 * Непреведеното (заглавие, което вече го няма) отпада, както винаги.
 */
export function prevediZapomnenoto(
  zapomneni: readonly string[],
  karta: ReadonlyMap<string, string>,
): readonly string[] {
  if (karta.size === 0) return zapomneni;
  const vidyani = new Set<string>();
  const izhod: string[] = [];
  for (const k of zapomneni) {
    const nov = karta.get(k) ?? k;
    // Преводът може да срещне два стари ключа в един нов (преименувана секция,
    // местена и преди, и след). Пази се ПЪРВИЯТ — той е по-скорошното решение.
    if (vidyani.has(nov)) continue;
    vidyani.add(nov);
    izhod.push(nov);
  }
  return izhod;
}

/** Картата стар→нов ключ · само за секциите, при които двата се различават. */
function kartaNaKlyuchovete(sektsii: readonly HTMLElement[]): ReadonlyMap<string, string> {
  const karta = new Map<string, string>();
  for (const e of sektsii) {
    const star = stariyatKlyuch(e);
    const nov = klyuchNaSektsiya(e);
    if (star && nov && star !== nov) karta.set(star, nov);
  }
  return karta;
}

/**
 * Кои секции стоят на този екран · в реда, в който са нарисувани.
 *
 * Мести се само онова, което Е ДЯЛ — има си глава със заглавие. Съобщението
 * („вест"), плочките и лентите не са дялове и не бива да се разместват: те са
 * състояние на екрана, не съдържание, което човек подрежда.
 */
function sektsiiteNa(koren: ParentNode): HTMLElement[] {
  const telo = koren.querySelector('.telo');
  if (!telo) return [];
  return [...telo.children].filter(
    (e): e is HTMLElement =>
      e instanceof HTMLElement && e.querySelector('.dyalglava') !== null && klyuchNaSektsiya(e) !== '',
  );
}

/**
 * Прилага подредбата и закача бутончетата · вика се СЛЕД всяко рисуване.
 *
 * Не прерисува екрана: местенето е разместване на вече нарисувани възли. Пълно
 * прерисуване тук би било по-скъпо и би изгубило отвореното (падащ ред, форма
 * по средата на попълване).
 */
export function zakachiPodredbata(koren: HTMLElement, ekran: string): void {
  const sektsii = sektsiiteNa(koren);
  if (sektsii.length < 2) return;

  const imena = sektsii.map(klyuchNaSektsiya);

  /**
   * ПРЕВОДЪТ СЕ ПИШЕ ОБРАТНО — ВЕДНЪЖ НА ЕКРАН.
   *
   * Без записа старият ред щеше да се превежда при всяко рисуване: работи, но
   * оставя в паметта данни, за които вече никой не помни, че са стари. След
   * едно отваряне на екрана запомненото е с новите ключове и `kartaNaKlyuchovete`
   * връща празна карта — оттам нататък преводът е `if (karta.size === 0)`.
   * Записва се САМО при разлика: `zapomniEkranno` при всяко рисуване би било
   * писане без повод.
   */
  const zapomneno = zapomneniyatRed(ekran);
  const prevedeno = prevediZapomnenoto(zapomneno, kartaNaKlyuchovete(sektsii));
  if (prevedeno.join('|') !== zapomneno.join('|')) zapomniEkranno(klyuchat(ekran), [...prevedeno]);

  const red = podredi(imena, prevedeno);

  /**
   * МЕСТИ САМО КОГАТО РЕДЪТ НАИСТИНА СЕ РАЗЛИЧАВА.
   *
   * `append` на вече правилно стоящ възел не е безобидно: преместването на DOM
   * възел ГУБИ фокуса в него. Проходът го хвана веднага — §27 пази обещанието
   * „фокусът оцелява прерисуването", а тази функция се вика след ВСЯКО
   * рисуване, тоест и след всяко натискане на клавиш в редакция на клетка.
   */
  const telo = koren.querySelector('.telo')!;
  if (red.join('|') !== imena.join('|')) {
    for (const klyuch of red) {
      const vazel = sektsii.find((e) => klyuchNaSektsiya(e) === klyuch);
      if (vazel) telo.append(vazel);
    }
  }

  for (const vazel of sektsii) {
    const klyuch = klyuchNaSektsiya(vazel);
    const glava = vazel.querySelector('.dyalglava');
    if (!glava || glava.querySelector('[data-premesti]')) continue;
    const kutiya = document.createElement('span');
    kutiya.className = 'premestvane';
    kutiya.innerHTML =
      `<button type="button" class="premestvach" data-premesti="gore" title="Нагоре" aria-label="Премести нагоре">${ikona('podredba')}▲</button>` +
      `<button type="button" class="premestvach" data-premesti="dolu" title="Надолу" aria-label="Премести надолу">▼</button>`;
    glava.append(kutiya);
    for (const b of kutiya.querySelectorAll<HTMLButtonElement>('[data-premesti]')) {
      b.addEventListener('click', () => {
        const sega = podredi(sektsiiteNa(koren).map(klyuchNaSektsiya), zapomneniyatRed(ekran));
        const nov = premesti(sega, klyuch, b.dataset['premesti'] as 'gore' | 'dolu');
        zapomniEkranno(klyuchat(ekran), [...nov]);
        zakachiPodredbata(koren, ekran);
      });
    }
  }
}
