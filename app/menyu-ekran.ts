/**
 * ПАДАЩ РЕД ЗА ВСЕКИ ЕКРАН СЪС СЕКЦИИ (ADR-057в).
 *
 * Негови думи: „Отляво където са изредени табовете искам **когато има секции
 * вътре да ги подредиш в падащо меню** и да е **по систематизирано**."
 *
 * Настройки има такъв ред от И101 т.2 — но неговите редове са ТЕМИ (по роля,
 * една от тях води до прозорец, не до секция). Тук е другото: редът изрежда
 * СЕКЦИИТЕ на екрана и води до тях. Механиката е една и съща и не се преписва:
 * скролването и подчертаването живеят в `zavediDoSektsiyata` и се викат от
 * двете места.
 *
 * ═══ ОТКЪДЕ ИДВА СПИСЪКЪТ · и защо НЕ е втори регистър ═══
 *
 * Заглавията на ИИ са ДИНАМИЧНИ (`Протоколът на „${a.ime}"`), а секциите на
 * Сметки се менят с периода. Втори опис до `EKRANI` би трябвало да ги
 * предскаже — и щеше да се разминава при всяка смяна на агент (правило 17).
 *
 * Затова списъкът се ЧЕТЕ ОТ ЕКРАНА. За екрана, на който стоиш — от живия DOM,
 * значи винаги точен. За останалите — от ПАМЕТТА на екрана, попълнена при
 * последното им отваряне. Резен 4 направи това възможно: дотогава секцията
 * нямаше стабилен ключ и запомнен списък щеше да сочи в нищото при първото
 * преименувано заглавие.
 *
 * Цената, казана: екран, който НИКОГА не е отварян, няма падащ ред. Не се
 * лъже с предположен списък — просто пунктът е обикновен, докато не го отвориш
 * веднъж.
 *
 * ═══ ЗАЩО СЕ СТРОИ ПРИ ЗАКАЧАНЕ, А НЕ ПРИ РИСУВАНЕ ═══
 *
 * Лентата се рисува в СЪЩИЯ проход, в който се рисува и тялото — значи при
 * рисуване паметта още е отпреди и редът на текущия екран щеше да изостава с
 * едно рисуване. Строен при закачане, той чете вече нарисуваното тяло и е
 * точен от първия път. Същият похват като при подредбата (`podredba.ts`).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { ekraniraj } from './obshto.js';

/** Една секция, както се показва в реда. */
interface Sektsiya {
  readonly klyuch: string;
  readonly ime: string;
}

/**
 * ПОД КОЛКО СЕКЦИИ ПАДАЩ РЕД НЕ СТРУВА.
 *
 * Три реда в падащо меню са повече работа от превъртането: отваряш, четеш,
 * избираш — три движения за нещо, което се вижда цялото на един екран.
 */
const OT_KOLKO = 4;

function klyuchat(ekran: string): string {
  return `sektsii.${ekran}`;
}

/** Секциите на НАРИСУВАНИЯ екран · същото сито като при подредбата. */
function sektsiiteNa(koren: ParentNode): Sektsiya[] {
  const telo = koren.querySelector('.telo');
  if (!telo) return [];
  return [...telo.children]
    .filter((e): e is HTMLElement => e instanceof HTMLElement)
    .map((e) => ({
      klyuch: e.dataset['sektsiya'] ?? '',
      ime: e.querySelector('.dyalglava h2, .dyalglava h3')?.textContent?.trim() ?? '',
    }))
    .filter((s) => s.klyuch !== '' && s.ime !== '');
}

/**
 * ЗАВЕЖДА ДО ЕДНА СЕКЦИЯ · единственият дом на този похват.
 *
 * Дотук живееше само в реда на Настройки. Копиран тук, щеше да са две места, в
 * които „подчертай за миг" се разминава — обходът за чистота брои точно това.
 * Подчертаването живее 1,6 секунди и си отива само: постоянен белег би останал
 * да лъже, че там е стигнало окото.
 */
export async function zavediDoSektsiyata(
  ekran: string,
  sektsiya: string,
  otvoriEkran: (ekran: string) => Promise<void>,
  prerisuvay: () => Promise<void>,
): Promise<void> {
  await otvoriEkran(ekran);
  await prerisuvay();
  // СЛЕД прерисуването: старият възел вече го няма, а новият още не е намерен.
  // Търси се в живия документ, не в стария корен.
  const tsel = document.querySelector<HTMLElement>(`[data-sektsiya="${CSS.escape(sektsiya)}"]`);
  if (!tsel) return;
  tsel.scrollIntoView({ block: 'start' });
  tsel.classList.add('podchertana');
  setTimeout(() => tsel.classList.remove('podchertana'), 1600);
}

/** Кой ред е отворен · ключът на екрана му, или `null`. Живее през рисуванията. */
let otvoreniyat: string | null = null;

function zatvoriVsichki(): void {
  for (const red of document.querySelectorAll<HTMLElement>('.ekran-red')) red.hidden = true;
  for (const b of document.querySelectorAll<HTMLElement>('.padasht-menyu > [data-ekran]')) {
    b.setAttribute('aria-expanded', 'false');
  }
  otvoreniyat = null;
}

/**
 * Строи падащите редове в лентата · вика се СЛЕД всяко рисуване.
 *
 * Пунктът остава ЕДИН бутон с две задачи, точно както при Настройки: натискане
 * завежда И отваря реда. Два бутона („Сметки" и стрелка до него) биха питали
 * човека нещо, което той не се е сещал да пита.
 */
export function zakachiMenyutataNaEkranite(
  koren: HTMLElement,
  ekran: string,
  otvoriEkran: (ekran: string) => Promise<void>,
  prerisuvay: () => Promise<void>,
): void {
  // Първо се ЗАПОМНЯ това, което стои на екрана в момента — така утре редът му
  // работи и от другаде.
  const tuk = sektsiiteNa(koren);
  if (tuk.length > 0) zapomniEkranno(klyuchat(ekran), tuk);

  for (const vhod of koren.querySelectorAll<HTMLButtonElement>('.nav > [data-ekran]')) {
    const koy = vhod.dataset['ekran']!;
    // Настройки си има СВОЙ ред (теми, не секции) и вече е обвит.
    if (vhod.closest('.menyu-nastroyki') || vhod.closest('.padasht-menyu')) continue;
    const sektsii = koy === ekran ? tuk : chetiEkranno<Sektsiya[]>(klyuchat(koy), []);
    if (sektsii.length < OT_KOLKO) continue;

    const obvivka = document.createElement('div');
    obvivka.className = 'padasht-menyu';
    vhod.before(obvivka);
    obvivka.append(vhod);

    const nomer = `ekran-red-${koy}`;
    vhod.setAttribute('aria-expanded', otvoreniyat === koy ? 'true' : 'false');
    vhod.setAttribute('aria-controls', nomer);
    const strelka = document.createElement('span');
    strelka.className = 'strelka-dolu';
    strelka.setAttribute('aria-hidden', 'true');
    strelka.textContent = '▾';
    vhod.append(strelka);

    const red = document.createElement('div');
    red.className = 'ekran-red padasht-red';
    red.id = nomer;
    red.setAttribute('role', 'menu');
    red.setAttribute('aria-label', `Секции на ${vhod.textContent!.trim()}`);
    red.hidden = otvoreniyat !== koy;
    red.innerHTML =
      `<p class="drebno za-kogo">Секциите на този екран</p>` +
      sektsii
        .map(
          (s) =>
            `<button type="button" class="tema" role="menuitem" data-kam-sektsiya="${ekraniraj(
              s.klyuch,
            )}"><span class="dvete"><b>${ekraniraj(s.ime)}</b></span></button>`,
        )
        .join('');
    obvivka.append(red);

    vhod.addEventListener('click', () => {
      const beshe = otvoreniyat === koy;
      zatvoriVsichki();
      if (!beshe) {
        red.hidden = false;
        vhod.setAttribute('aria-expanded', 'true');
        otvoreniyat = koy;
        red.querySelector<HTMLButtonElement>('.tema')?.focus({ preventScroll: true });
      }
    });

    for (const b of red.querySelectorAll<HTMLButtonElement>('[data-kam-sektsiya]')) {
      b.addEventListener('click', async () => {
        zatvoriVsichki();
        await zavediDoSektsiyata(koy, b.dataset['kamSektsiya'] ?? '', otvoriEkran, prerisuvay);
      });
    }
  }

  zakachiEscape();
}

/**
 * Escape затваря, а фокусът се връща на пункта · закача се ВЕДНЪЖ, на документа.
 *
 * ДВЕ ПРИЧИНИ, И ДВЕТЕ ПЛАТЕНИ:
 *
 * 1 · НА ДОКУМЕНТА, не на корена. Натискането на пункт прерисува екрана, старият
 *     бутон изчезва под пръста и фокусът пада на `body` — а `body` е НАД корена,
 *     значи събитието не минава през него и Escape не правеше нищо. Проходът го
 *     хвана: „фокусът се връща на пункта" върна `null`.
 * 2 · ВЕДНЪЖ. Закачането се вика след ВСЯКО рисуване; слушател на корена щеше
 *     да се трупа по един на рисуване. Същият похват като в
 *     `kontekstno-menyu.ts`, и по същата причина.
 *
 * Живият пункт се търси в ЖИВИЯ документ, не в корена от онова рисуване, в
 * което е бил закачен слушателят.
 */
let zakachenEscape = false;

function zakachiEscape(): void {
  if (zakachenEscape) return;
  zakachenEscape = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || otvoreniyat === null) return;
    const vhod = document.querySelector<HTMLButtonElement>(
      `.padasht-menyu > [data-ekran=${otvoreniyat}]`,
    );
    zatvoriVsichki();
    vhod?.focus();
  });
}
