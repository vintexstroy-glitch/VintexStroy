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
 * значи винаги точен. За останалите — от ПАМЕТТА на екрана. Резен 4 направи
 * това възможно: дотогава секцията нямаше стабилен ключ и запомнен списък щеше
 * да сочи в нищото при първото преименувано заглавие.
 *
 * ═══ И ЦЕНАТА ПАДНА · МЕНЮТАТА СА АКТИВНИ ОТ ПЪРВИЯ МИГ (И127 т.1) ═══
 *
 * Дотук цената беше казана и приета: „екран, който НИКОГА не е отварян, няма
 * падащ ред". Негова дума, 01.09: „Направи падащите менюта да са АКТИВНИ и да
 * са РАЗДЕЛЕНИ ТАБЛИЦИТЕ." Тоест цената пада — но НЕ с втори регистър, който
 * пак би се разминавал.
 *
 * Паметта се пълни ПРЕДВАРИТЕЛНО, от СЪЩИЯ извор: екранът се рисува НАУМ
 * (`narisuvay` връща низ — нищо не се показва и нищо не се закача), секциите
 * му се четат от този низ със същото сито, и се записват. Един извор, нула
 * предсказване: разминаване е невъзможно по построение, а не по дисциплина.
 *
 * ═══ И ТАБЛИЦИТЕ СА РАЗДЕЛЕНИ ═══
 *
 * Секция с ЕДНА таблица е един пункт. Секция с ПОВЕЧЕ таблици се разтваря:
 * под нея стои по един подпункт за всяка таблица, с ИМЕТО ѝ (`data-ime`).
 * Таблица без име не получава подпункт — измислено име е по-лошо от липсващо,
 * а проходът брои безименните с праг НУЛА.
 *
 * ═══ ЗАЩО СЕ СТРОИ ПРИ ЗАКАЧАНЕ, А НЕ ПРИ РИСУВАНЕ ═══
 *
 * Лентата се рисува в СЪЩИЯ проход, в който се рисува и тялото — значи при
 * рисуване паметта още е отпреди и редът на текущия екран щеше да изостава с
 * едно рисуване. Строен при закачане, той чете вече нарисуваното тяло и е
 * точен от първия път. Същият похват като при подредбата (`podredba.ts`).
 */

import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import { podtabatNa } from '../src/domein/temi-nastroyki.js';
import {
  PARVIYAT_PODTAB,
  PODTABOVE_NA_SMETKI,
  klyuchNaPametta,
  podredeniPoPodtab,
  podtabatNaSmetki,
} from '../src/domein/podtabove-smetki.js';
import { aktivniyatPodtab } from './podtabove.js';
import { ekraniraj } from './obshto.js';
import { zapishiRedaNaSektsiite } from './podredba.js';
import {
  broySemeystva,
  otpechatakNaEkrannaGlava,
  podrediPoSemeystvo,
} from './semeystva.js';

/** Една таблица в секция · само когато носи свое ИМЕ (И127 т.1). */
interface TablitsaVSektsiya {
  readonly klyuch: string;
  readonly ime: string;
}

/** Една секция, както се показва в реда. */
interface Sektsiya {
  readonly klyuch: string;
  readonly ime: string;
  /** отпечатъкът на главата ѝ · празен, когато секцията няма таблица (резен 11) */
  readonly otpechatak?: string;
  /** таблиците ѝ · пълни се САМО при две и повече, за да се разделят */
  readonly tablitsi?: readonly TablitsaVSektsiya[];
}

/**
 * ПОД КОЛКО СЕКЦИИ ПАДАЩ РЕД НЕ СТРУВА.
 *
 * ДВЕ (И125 · резен 85): „ако е неожходимо с падащо меню за ВСЕКИ таб от
 * менюто" — а необходимо е точно когато има ИЗБОР, тоест от втората секция
 * нагоре. Старият праг ЧЕТИРИ („три реда са повече работа от превъртането")
 * беше мое стеснение върху неговото „когато има секции вътре да ги подредиш
 * в падащо меню" (И101 · ADR-057в) — последната дума го маха. Една секция
 * не прави меню: ред с един ред не е избор, а украса.
 */
const OT_KOLKO = 2;

function klyuchat(ekran: string): string {
  // СМЕТКИ НЯМА ОБЩ КЛЮЧ (резен 115 · ADR-161): паметта му е по подтаб —
  // `klyuchNaPametta`. Общ ключ през задната врата би върнал реда с една пета
  // от екрана; затова тук се гърми, не се мълчи.
  if (ekran === 'smetki') throw new Error('Сметки пази секциите си по подтаб · ползвай klyuchNaPametta.');
  return `sektsii.${ekran}`;
}

/** Ключът, в който ТОЗИ екран пише нарисуваното · за Сметки — ключът на активния подтаб. */
function klyuchatNaZapisa(ekran: string, podtab?: string): string {
  if (ekran !== 'smetki') return klyuchat(ekran);
  const koy = podtab ?? aktivniyatPodtab('smetki', PODTABOVE_NA_SMETKI, PARVIYAT_PODTAB);
  return klyuchNaPametta(PODTABOVE_NA_SMETKI.some((p) => p.klyuch === koy) ? (koy as (typeof PODTABOVE_NA_SMETKI)[number]['klyuch']) : PARVIYAT_PODTAB);
}

/**
 * КАКВО ИЗРЕЖДА РЕДЪТ НА ЕДИН ЕКРАН · на групи.
 *
 * За екран без подтабове — една група без глава. За Сметки — петте подтаба в
 * реда на лентата, всеки с главата си, четени от СВОИТЕ ключове. Нищо не се
 * слива и не се гадае кое от старото е още вярно: всеки подтаб е записал
 * своето, когато е бил нарисуван.
 */
function grupiteNaReda(koy: string, ekran: string, tuk: readonly Sektsiya[]): readonly { readonly ime: string; readonly sektsii: readonly Sektsiya[] }[] {
  if (koy === 'smetki') return podredeniPoPodtab((p) => chetiEkranno<Sektsiya[]>(klyuchNaPametta(p), []));
  return [{ ime: '', sektsii: koy === ekran ? tuk : chetiEkranno<Sektsiya[]>(klyuchat(koy), []) }];
}

/**
 * ТАБЛИЦИТЕ НА ЕДНА СЕКЦИЯ · само когато са ДВЕ и повече, и само именуваните.
 *
 * Една таблица не се дели от себе си — там секцията вече е пунктът. При две и
 * повече всяка именувана става подпункт: „да са разделени таблиците".
 */
function tablitsiteNa(sektsiya: Element): readonly TablitsaVSektsiya[] {
  const vsichki = [...sektsiya.querySelectorAll('.tablitsa[data-tablitsa]')];
  if (vsichki.length < 2) return [];
  return vsichki
    .map((t) => ({
      klyuch: (t as HTMLElement).dataset['tablitsa'] ?? '',
      ime: (t as HTMLElement).dataset['ime'] ?? '',
    }))
    .filter((t) => t.klyuch !== '' && t.ime !== '');
}

/** Секциите на НАРИСУВАНИЯ екран · същото сито като при подредбата. */
export function sektsiiteNa(koren: ParentNode): Sektsiya[] {
  const telo = koren.querySelector('.telo');
  if (!telo) return [];
  return [...telo.children]
    .filter((e): e is HTMLElement => e instanceof HTMLElement)
    .map((e) => ({
      klyuch: e.dataset['sektsiya'] ?? '',
      ime: e.querySelector('.dyalglava h2, .dyalglava h3')?.textContent?.trim() ?? '',
      // ОТПЕЧАТЪКЪТ НА ГЛАВАТА · за подреждането по семейство (резен 11).
      // Чете се от НАРИСУВАНАТА глава, със същото свеждане като в домейна.
      otpechatak: otpechatakNaEkrannaGlava(
        [...(e.querySelector('.tablitsa .glava')?.children ?? [])].map(
          (k) => k.textContent?.trim() ?? '',
        ),
      ),
      tablitsi: tablitsiteNa(e),
    }))
    .filter((s) => s.klyuch !== '' && s.ime !== '');
}

/**
 * ЗАПОМНЯ СЕКЦИИТЕ НА ЕКРАН, НАРИСУВАН НАУМ (И127 т.1 · резен 90).
 *
 * Викащият подава готовия HTML низ на екрана — същия, който би сложил в
 * тялото. Тук той се чете със СЪЩОТО сито, което чете живия DOM: един извор,
 * нула предсказване. Пише се само когато има какво: празен резултат не гаси
 * стара, вярна памет.
 */
export function zapomniSektsiiteOtHTML(ekran: string, html: string, podtab?: string): number {
  const list = document.implementation.createHTMLDocument('');
  // Ситото търси `.telo` — низът на екрана е СЪДЪРЖАНИЕТО ѝ, не тя самата.
  list.body.innerHTML = `<div class="telo">${html}</div>`;
  const sektsii = sektsiiteNa(list.body);
  // За подтаб на Сметки и ПРАЗНОТО е отговор: ключът му е записан, значи
  // „рисуван е, няма секции" — иначе пълненето би го рисувало наум при всяко
  // отваряне на екран (проходът го намери като скорост, §37).
  if (sektsii.length > 0 || ekran === 'smetki') {
    zapomniEkranno(klyuchatNaZapisa(ekran, podtab), sektsii);
  }
  return sektsii.length;
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
  tablitsa = '',
): Promise<void> {
  /**
   * НАСТРОЙКИ ОТВАРЯ ПОДТАБА, не скролва (резен 112 · ADR-158).
   *
   * Негово, 03.09: „когато цъкнеш на подтаб от менюто да отваря само секцията
   * вътре, **а не да те препраща в скрола**." Затова редът първо СМЕНЯ подтаба
   * и чак тогава рисува — инак темата води на екран, на който секцията ѝ не се
   * рисува, и кликът изглежда като нищо.
   *
   * Кой подтаб носи коя секция знае домейнът (`podtabatNa`), не този файл:
   * втора карта тук би се разминала с групите при първата нова тема.
   */
  if (ekran === 'nastroyki') {
    const podtab = podtabatNa(sektsiya);
    if (podtab) zapomniEkranno('nastroyki.podtab', podtab);
  }
  // СМЕТКИ · същото, с втората карта (резен 115 · ADR-161). Тук подтаб ВИНАГИ
  // има: непознатата секция пада в главния, вместо да не стане нищо.
  if (ekran === 'smetki') {
    zapomniEkranno('smetki.podtab', podtabatNaSmetki(sektsiya));
  }
  await otvoriEkran(ekran);
  await prerisuvay();
  // СЛЕД прерисуването: старият възел вече го няма, а новият още не е намерен.
  // Търси се в живия документ, не в стария корен.
  //
  // ТАБЛИЦАТА БИЕ СЕКЦИЯТА (И127 т.1): подпунктът сочи КОНКРЕТНА таблица —
  // тя е по-тясната цел. Няма ли я (изчезнала между двете рисувания), пада се
  // до секцията ѝ, вместо да не стане нищо.
  const tsel =
    (tablitsa === ''
      ? null
      : document.querySelector<HTMLElement>(`.tablitsa[data-tablitsa="${CSS.escape(tablitsa)}"]`)) ??
    document.querySelector<HTMLElement>(`[data-sektsiya="${CSS.escape(sektsiya)}"]`);
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
  if (tuk.length > 0) zapomniEkranno(klyuchatNaZapisa(ekran), tuk);

  for (const vhod of koren.querySelectorAll<HTMLButtonElement>('.nav > [data-ekran]')) {
    const koy = vhod.dataset['ekran']!;
    // Настройки си има СВОЙ ред (теми, не секции) и вече е обвит.
    if (vhod.closest('.menyu-nastroyki') || vhod.closest('.padasht-menyu')) continue;
    const grupi = grupiteNaReda(koy, ekran, tuk);
    const sektsii = grupi.flatMap((g) => g.sektsii);
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
    /**
     * ПОДРЕЖДАНЕТО ПО СЕМЕЙСТВО · само на екрана, на който СТОИШ.
     *
     * Негово: таблиците с еднакви хедъри се подреждат една до друга — „като
     * СОРТИРАНЕ", тоест човек го натиска. Затова е бутон, не правило.
     *
     * Показва се само когато има какво да събере (правило 15: бутон, който не
     * прави нищо, изглежда счупен). И само за ТЕКУЩИЯ екран: отпечатъците на
     * чужд екран идват от паметта и може да са от вчера, а подредба по стари
     * глави е по-лоша от липсваща.
     */
    // Един превод към формата на семействата · ползван и от броенето, и от
    // подреждането: два превода се разминават при първата смяна на полето.
    const sGlavi = sektsii.map((x) => ({ klyuch: x.klyuch, otpechatak: x.otpechatak ?? '' }));
    const semeystva = koy === ekran ? broySemeystva(sGlavi) : 0;
    red.innerHTML =
      `<p class="drebno za-kogo">Секциите на този екран</p>` +
      grupi
        .map(
          (g) =>
            // ГЛАВА ПРЕД ВСЯКА ГРУПА (резен 115 · ADR-161) · само където има подтабове:
            // трийсет пункта в един списък се четат като стена; групирани по
            // подтаба, в който човек ще ги намери, казват и КЪДЕ отиват.
            (g.ime === '' ? '' : `<p class="drebno za-kogo">${ekraniraj(g.ime)}</p>`) +
            g.sektsii
              .map(
                (s) =>
                  `<button type="button" class="tema" role="menuitem" data-kam-sektsiya="${ekraniraj(
                    s.klyuch,
                  )}"><span class="dvete"><b>${ekraniraj(s.ime)}</b></span></button>` +
                  // ТАБЛИЦИТЕ РАЗДЕЛЕНИ · подпункт за всяка именувана, когато са 2+.
                  (s.tablitsi ?? [])
                    .map(
                      (t) =>
                        `<button type="button" class="tema podtablitsa" role="menuitem"
                     data-kam-sektsiya="${ekraniraj(s.klyuch)}"
                     data-kam-tablitsa="${ekraniraj(t.klyuch)}"><span class="dvete"><span
                     class="drebno">${ekraniraj(t.ime)}</span></span></button>`,
                    )
                    .join(''),
              )
              .join(''),
        )
        .join('') +
      (semeystva > 0
        ? `<button type="button" class="tema podredi-semeystva" role="menuitem"
             data-podredi-semeystva="${ekraniraj(koy)}"><span class="dvete"><b>Подреди
             еднаквите хедъри заедно</b><span class="drebno">${semeystva} ${
               semeystva === 1 ? 'семейство' : 'семейства'
             } с еднаква глава</span></span></button>`
        : '');
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
        await zavediDoSektsiyata(
          koy,
          b.dataset['kamSektsiya'] ?? '',
          otvoriEkran,
          prerisuvay,
          b.dataset['kamTablitsa'] ?? '',
        );
      });
    }

    // Сортирането пише в СЪЩАТА памет като стрелките ▲▼ — един дом за реда.
    red.querySelector<HTMLButtonElement>('[data-podredi-semeystva]')?.addEventListener(
      'click',
      async () => {
        zatvoriVsichki();
        zapishiRedaNaSektsiite(koy, podrediPoSemeystvo(sGlavi));
        await prerisuvay();
      },
    );
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
