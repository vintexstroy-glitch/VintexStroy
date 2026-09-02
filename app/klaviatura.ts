/**
 * КЛАВИАТУРНАТА КАРТА · движението на Excel върху таблиците.
 *
 * По това счетоводителят познава „истински Excel" срещу „уеб форма": ръцете
 * не посягат към мишката. Картата е неговата (И58 · ADR-022 · вълна 2):
 *
 *   клик             избира клетка
 *   стрелки          местят селекцията
 *   Shift+стрелка    ОПЪВА обхват от котвата · Shift+клик — дотам
 *   Ctrl+A           целият блок данни на таблицата
 *   Enter            надолу (как се въвежда колона от числа)
 *   Tab              надясно · Shift+Tab обратно
 *   Ctrl+стрелка     до РЪБА на таблицата — първият/последният ред или колона
 *   Home / End       началото / краят на реда
 *   Escape           маха селекцията
 *
 * СТАТУС-ЛЕНТАТА е причината обхватът да съществува: маркираш колона суми и
 * долу пише Брой · Сбор · Средно — без бутон, без екран, както в Excel.
 * Кое е пари, НЕ се гадае по текста: евро-клетката носи центовете си в
 * `data-st`, сложен при рисуването от самата стойност на модела (правило 20 ·
 * ADR-014). Клетка без `data-st` влиза в броя, но никога в сбора — затова
 * м², проценти и точки не могат да се смесят с евро в едно число.
 *
 * ГРАНИЦАТА: когато фокусът е в поле, изборник или бутон, картата МЪЛЧИ —
 * формите са си форми и стрелките там местят курсора в текста, не клетки.
 *
 * Селекцията е ЕКРАННА и умира с прерисуването — тя не е състояние, което
 * се помни, а поглед, който се движи. Редакция в клетката още няма (вълна 3);
 * груповите действия ще стъпят върху същия обхват.
 */

import { eTsentove, pishi, pishiVPole } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import { opitajStornoNaMnogo, stornoOtButona, type ZaStorno } from './storno.js';
import type { Konteks } from './ekranite.js';

/**
 * Отказът на клипборда · ЕДИН текст за двата пътя към него (правило 17).
 *
 * Клавишната комбинация и контекстното меню правят едно и също; казваха го
 * поотделно. Разминат текст в двете би изглеждал като два различни проблема
 * пред човека, който е натиснал първо едното, после другото.
 */
export const KLIPBORDAT_OTKAZA = 'Клипбордът отказа — браузърът иска разрешение за копиране.';

const ZNAK = 'kletka-izbrana';
const ZNAK_OBHVAT = 'kletka-v-obhvat';

interface Izbrana {
  readonly tablitsa: HTMLElement;
  /** котвата — активната клетка, от която обхватът се опъва */
  red: number;
  kolona: number;
  /** подвижният край · без Shift той стои върху котвата */
  krayRed: number;
  krayKolona: number;
  /** редове, добавени с Ctrl+клик — избират се ЦЕЛИ, като за сторно */
  readonly oshte: Set<number>;
}

let izbrana: Izbrana | null = null;

/** Редовете с данни на една таблица — главата не е ред за селекция. */
function redoveNa(tablitsa: HTMLElement): HTMLElement[] {
  return [...tablitsa.querySelectorAll<HTMLElement>('.red')];
}

/** Клетките на един ред · преките деца; бутоните в края също са „клетка". */
function kletkiNa(red: HTMLElement): HTMLElement[] {
  return [...red.children] as HTMLElement[];
}

function mahniZnaka(): void {
  for (const k of document.querySelectorAll(`.${ZNAK}, .${ZNAK_OBHVAT}`)) {
    k.classList.remove(ZNAK, ZNAK_OBHVAT);
  }
}

// ── сметката на избора · чиста, за да има тест ────────────────────────────
interface KletkaVIzbora {
  readonly tekst: string;
  /** центовете от `data-st`, или null — клетката не е пари */
  readonly st: number | null;
}

interface SmetkaNaIzbora {
  /** непразните клетки — както Excel брои */
  readonly broy: number;
  readonly broyPari: number;
  readonly sbor_st: number;
  /** закръглено до цент САМО за показ — то никога не влиза в сбор */
  readonly sredno_st: number;
}

export function smetniIzbora(kletki: readonly KletkaVIzbora[]): SmetkaNaIzbora {
  let broy = 0;
  let broyPari = 0;
  let sbor = 0;
  for (const k of kletki) {
    if (k.tekst !== '') broy += 1;
    if (k.st !== null) {
      broyPari += 1;
      sbor += k.st;
    }
  }
  // към НАЙ-БЛИЗКИЯ цент, симетрично за минуса — Math.round сам по себе
  // си тегли -0,5 към нулата, а +0,5 нагоре, и средното на дългове би куцало.
  const sredno = broyPari === 0 ? 0 : Math.sign(sbor) * Math.round(Math.abs(sbor) / broyPari);
  return { broy, broyPari, sbor_st: sbor, sredno_st: sredno };
}

/** Стотинките на една клетка · само каквото самата тя декларира. */
function stNa(kletka: HTMLElement): number | null {
  const surovo = kletka.dataset['st'];
  if (surovo === undefined) return null;
  const n = Number(surovo);
  return eTsentove(n) ? n : null;
}

// ── статус-лентата ────────────────────────────────────────────────────────
let lenta: HTMLElement | null = null;

function lentata(): HTMLElement {
  if (!lenta || !lenta.isConnected) {
    lenta = document.createElement('div');
    lenta.className = 'status-lenta';
    lenta.setAttribute('translate', 'no');
    lenta.hidden = true;
    document.body.append(lenta);
  }
  return lenta;
}

function skriyLentata(): void {
  if (lenta) {
    lenta.hidden = true;
    // скритата лента се и ИЗПРАЗВА — иначе следващото показване (напр.
    // „Копирано" при една клетка) би съживило сметка за отишла си селекция
    lenta.innerHTML = '';
  }
}

/** Лентата се показва при обхват от 2+ клетки — една клетка не е сметка. */
function pokazhiLentata(obshtoKletki: number, s: SmetkaNaIzbora, zaStorno: readonly ZaStorno[]): void {
  if (obshtoKletki < 2) {
    skriyLentata();
    return;
  }
  const l = lentata();
  const chasti = [`Брой: ${s.broy}`];
  if (s.broyPari > 0) chasti.push(`Сбор: ${pishi(s.sbor_st)}`);
  if (s.broyPari > 1) chasti.push(`Средно: ${pishi(s.sredno_st)}`);
  l.innerHTML = chasti.map((ch) => `<span>${ch}</span>`).join('');
  // Груповото действие се показва от 2 реда нагоре — единичният ред си има
  // своя бутон. Списъкът е снет ОТ ЕКРАНА в мига на показването: клик после
  // работи върху точно това, което човекът е гледал.
  if (zaStorno.length >= 2) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vrazka';
    b.setAttribute('data-storno-izbrani', '');
    b.textContent = `Сторно на избраните (${zaStorno.length})`;
    b.addEventListener('click', () => void stornirayIzbranite([...zaStorno]));
    l.append(b);
  }
  l.hidden = false;
}

async function stornirayIzbranite(spisak: readonly ZaStorno[]): Promise<void> {
  if (!konteks || !prerisuvayEkrana) return;
  const izhod = await opitajStornoNaMnogo(konteks, spisak);
  if (izhod.kazano === '') return; // отказан въпрос — нищо не е пипнато
  konteks.vest(izhod.vid, izhod.kazano);
  await prerisuvayEkrana();
}

// ── клипбордният мост НАВЪН · Ctrl+C поставя се в Excel като таблица ──────

/** Избраните клетки, ред по ред · бутоните не са данни и не пътуват. */
function izbranitePoRedove(): HTMLElement[][] {
  return obhvatNaIzbora(true)
    .map(({ kletki, ot, doo }) =>
      kletki.slice(ot, doo + 1).filter((kl) => !kl.querySelector('button')),
    )
    .filter((red) => red.length > 0);
}

/**
 * Текстът на една клетка за клипборда.
 *
 * Парите тръгват като ЧИСТО число („1234,56") — така Excel ги разбира като
 * число и по тях се смята веднага. „1 234,56 €" с тясната пауза и знака би
 * станало ТЕКСТ в чуждата таблица — колона, по която нищо не се сборува.
 * Стойността идва от `data-st`, не от разчитане на екрана (правило 20).
 */
function tekstNaKletkaZaKlipborda(kl: HTMLElement): string {
  const st = stNa(kl);
  if (st !== null) return pishiVPole(st);
  return kl.innerText.replace(/\s*\n\s*/g, ' · ').trim();
}

/**
 * Двата вкуса на клипборда от готовите текстове — чиста функция с тест.
 * TSV е за текстовите редактори; HTML-таблицата е това, което Excel чете
 * като РЕДОВЕ И КОЛОНИ, а не като залепен низ.
 */
export function klipbordniVkusove(tekstove: readonly (readonly string[])[]): {
  tsv: string;
  html: string;
} {
  return {
    tsv: tekstove.map((red) => red.join('\t')).join('\n'),
    html: `<table>${tekstove
      .map((red) => `<tr>${red.map((t) => `<td>${ekraniraj(t)}</td>`).join('')}</tr>`)
      .join('')}</table>`,
  };
}

/**
 * Пише редове клетки в клипборда: TSV + HTML-таблица. ЕДНАТА врата навън —
 * Ctrl+C и „Копирай реда" от контекстното меню минават оттук, с един текст
 * на клетка и едни чисти числа. Хвърля, когато клипбордът откаже.
 */
export async function kopirayKletkite(
  redove: readonly (readonly HTMLElement[])[],
): Promise<void> {
  const { tsv, html } = klipbordniVkusove(redove.map((red) => red.map(tekstNaKletkaZaKlipborda)));
  // Двата вкуса наведнъж: Excel чете text/html като таблица с клетки;
  // текстовите редактори взимат TSV. По-старият път остава като резерва.
  if (typeof ClipboardItem === 'undefined') {
    await navigator.clipboard.writeText(tsv);
  } else {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ]);
  }
}

/** Копира избора и свети в лентата, докато селекцията не мръдне. */
async function kopirayIzbora(): Promise<void> {
  const redove = izbranitePoRedove();
  if (redove.length === 0) return;
  try {
    await kopirayKletkite(redove);
    // предишното „Копирано" пада — две потвърждения едно до друго са шум
    const l = lentata();
    l.querySelector('.kopirano')?.remove();
    const s = document.createElement('span');
    s.className = 'kopirano';
    s.textContent = `Копирано · ${redove.length} ${redove.length === 1 ? 'ред' : 'реда'}`;
    l.append(s);
    l.hidden = false;
  } catch {
    konteks?.vest('zle', KLIPBORDAT_OTKAZA);
  }
}

/** Един ред от геометрията на избора · клетките и прозорецът от колони. */
interface RedOtIzbora {
  readonly red: HTMLElement;
  readonly kletki: HTMLElement[];
  readonly ot: number;
  readonly doo: number;
}

/**
 * ГЕОМЕТРИЯТА НА ИЗБОРА · едно място я смята, две политики я четат.
 *
 * Погледът (лентата, знаците) взима Ctrl-редовете цели, а правоъгълника —
 * по колони. Клипбордът, щом има и един цял ред, взима ВСИЧКИ цели —
 * иначе редовете излизат с различна дължина и колоните в Excel се
 * разместват. Двете сметки бяха преписани поотделно и дрейфът между
 * „каквото лентата смята" и „каквото Ctrl+C копира" щеше да е тих.
 */
function obhvatNaIzbora(vsichkiTseli: boolean): RedOtIzbora[] {
  if (!izbrana) return [];
  const redove = redoveNa(izbrana.tablitsa);
  const posleden = redove.length - 1;
  if (posleden < 0) return [];
  const otKolona = Math.min(izbrana.kolona, izbrana.krayKolona);
  const doKolona = Math.max(izbrana.kolona, izbrana.krayKolona);
  const nomera = new Set<number>();
  const doRed = Math.min(Math.max(izbrana.red, izbrana.krayRed), posleden);
  for (let r = Math.min(izbrana.red, izbrana.krayRed); r <= doRed; r += 1) nomera.add(r);
  for (const r of izbrana.oshte) if (r <= posleden) nomera.add(r);
  const tselite = vsichkiTseli && izbrana.oshte.size > 0;

  return [...nomera].sort((a, b) => a - b).map((nomer) => {
    const red = redove[nomer]!;
    const kletki = kletkiNa(red);
    // ред от Ctrl+клик влиза ЦЯЛ — той е избран като ред, не като клетки
    const tsyal = tselite || izbrana!.oshte.has(nomer);
    return {
      red,
      kletki,
      ot: tsyal ? 0 : Math.min(otKolona, kletki.length - 1),
      doo: tsyal ? kletki.length - 1 : Math.min(doKolona, kletki.length - 1),
    };
  });
}

/** Слага знаците, смята лентата и докарва подвижния край в очите. */
function pokazhi(): void {
  mahniZnaka();
  if (!izbrana) {
    skriyLentata();
    return;
  }
  const redove = redoveNa(izbrana.tablitsa);
  if (redove.length === 0) {
    izbrana = null;
    skriyLentata();
    return;
  }
  const posleden = redove.length - 1;
  izbrana.red = Math.min(izbrana.red, posleden);
  izbrana.krayRed = Math.min(izbrana.krayRed, posleden);

  const vIzbora: KletkaVIzbora[] = [];
  const zaStorno: ZaStorno[] = [];
  let obshtoKletki = 0;
  for (const { red, kletki, ot, doo } of obhvatNaIzbora(false)) {
    for (let c = ot; c <= doo; c += 1) {
      const kletka = kletki[c]!;
      kletka.classList.add(ZNAK_OBHVAT);
      obshtoKletki += 1;
      // бутоните не са данни — в „Брой" влизат клетките с нещо за броене,
      // същото правило, по което „Копирай реда" ги прескача
      if (!kletka.querySelector('button')) {
        vIzbora.push({ tekst: kletka.textContent?.trim() ?? '', st: stNa(kletka) });
      }
    }
    // Кое сторно носи редът — пита се БУТОНЪТ му, не се гадае по екрана.
    for (const b of red.querySelectorAll<HTMLButtonElement>('button')) {
      const s = stornoOtButona(b);
      if (s) {
        zaStorno.push(s);
        break;
      }
    }
  }

  // котвата носи рамката; крайната клетка се докарва в очите — тя се движи
  const kletkiNaKotvata = kletkiNa(redove[izbrana.red]!);
  izbrana.kolona = Math.min(izbrana.kolona, kletkiNaKotvata.length - 1);
  kletkiNaKotvata[izbrana.kolona]?.classList.add(ZNAK);
  const kletkiNaKraya = kletkiNa(redove[izbrana.krayRed]!);
  const kraen = kletkiNaKraya[Math.min(izbrana.krayKolona, kletkiNaKraya.length - 1)];
  kraen?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  pokazhiLentata(obshtoKletki, smetniIzbora(vIzbora), zaStorno);
}

/** Клетките на избора, в реда на редовете — груповото въвеждане пита оттук. */
export function kletkiteNaIzbora(): HTMLElement[] {
  return obhvatNaIzbora(false).flatMap(({ kletki, ot, doo }) => kletki.slice(ot, doo + 1));
}

/** Активната клетка (котвата) — редакцията в клетката (F2) пита оттук. */
export function aktivnataKletka(): HTMLElement | null {
  if (!izbrana || !izbrana.tablitsa.isConnected) return null;
  const red = redoveNa(izbrana.tablitsa)[izbrana.red];
  if (!red) return null;
  const kletki = kletkiNa(red);
  return kletki[Math.min(izbrana.kolona, kletki.length - 1)] ?? null;
}

/** Пишещ ли е фокусът · там картата мълчи и формата си работи.
 *  Черновата (`chernova.ts`) пита същия въпрос — границата е ЕДНА. */
export function fokusVPole(): boolean {
  const e = document.activeElement;
  return (
    e instanceof HTMLInputElement ||
    e instanceof HTMLTextAreaElement ||
    e instanceof HTMLSelectElement ||
    (e instanceof HTMLElement && e.isContentEditable)
  );
}

let zakacheno = false;
let konteks: Konteks | null = null;
let prerisuvayEkrana: (() => Promise<void>) | null = null;

export function zakachiKlaviatura(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  konteks = k;
  prerisuvayEkrana = prerisuvay;
  // Всяко прерисуване минава оттук: старият DOM е мъртъв и селекцията с него.
  // Лентата обаче живее в body и без това би останала да показва сметка за
  // клетки, които вече ги няма — лъжа на екрана, затова пада веднага.
  if (izbrana && !izbrana.tablitsa.isConnected) {
    izbrana = null;
    skriyLentata();
  }
  if (zakacheno) return;
  zakacheno = true;

  // Shift+клик опъва обхват — без това браузърът би маркирал текст.
  koren.addEventListener('mousedown', (e) => {
    if (e.shiftKey && izbrana && (e.target as HTMLElement).closest('.red > *')) e.preventDefault();
  });

  // Кликът избира · делегирано, за да живее през всички прерисувания.
  koren.addEventListener('click', (e) => {
    const kletka = (e.target as HTMLElement).closest<HTMLElement>('.red > *');
    if (!kletka || (e.target as HTMLElement).closest('button, a, input, select')) return;
    const red = kletka.parentElement as HTMLElement;
    const tablitsa = red.closest<HTMLElement>('.tablitsa');
    if (!tablitsa) return;
    const r = redoveNa(tablitsa).indexOf(red);
    const c = kletkiNa(red).indexOf(kletka);
    if (e.shiftKey && izbrana && izbrana.tablitsa === tablitsa) {
      // котвата стои, краят идва под клика — обхватът е между тях
      izbrana.krayRed = r;
      izbrana.krayKolona = c;
    } else if ((e.ctrlKey || e.metaKey) && izbrana && izbrana.tablitsa === tablitsa) {
      // Ctrl+клик добавя/маха ЦЕЛИЯ ред — изборът за групово действие.
      if (izbrana.oshte.has(r)) izbrana.oshte.delete(r);
      else izbrana.oshte.add(r);
    } else {
      izbrana = { tablitsa, red: r, kolona: c, krayRed: r, krayKolona: c, oshte: new Set() };
    }
    pokazhi();
  });

  document.addEventListener('keydown', (e) => {
    if (!izbrana || fokusVPole()) return;
    if (!izbrana.tablitsa.isConnected) {
      // Прерисуването е сменило екрана под селекцията — тя си отива тихо.
      izbrana = null;
      skriyLentata();
      return;
    }

    const redove = redoveNa(izbrana.tablitsa);
    const posledenRed = redove.length - 1;
    // Ctrl+стрелка скача до ръба — движението на Excel през блока данни.
    const doRaba = e.ctrlKey || e.metaKey;

    // Ctrl+C · избраното тръгва към клипборда — и към Excel. Но маркиран
    // ТЕКСТ другаде на екрана има предимство: неговото копиране е на
    // браузъра, както и Excel отстъпва пред жива текстова селекция.
    if (doRaba && e.code === 'KeyC') {
      const tekstova = document.getSelection();
      if (tekstova && !tekstova.isCollapsed) return;
      void kopirayIzbora();
      e.preventDefault();
      return;
    }

    // Ctrl+A · целият блок данни. По `code`, не по `key` — на кирилска
    // клавиатура „A" е „А" и жестът иначе би работил само на латиница.
    if (doRaba && e.code === 'KeyA') {
      izbrana.red = 0;
      izbrana.kolona = 0;
      izbrana.krayRed = posledenRed;
      izbrana.krayKolona = Math.max(...redove.map((r) => kletkiNa(r).length)) - 1;
      e.preventDefault();
      pokazhi();
      return;
    }

    // Какво се движи: с Shift — подвижният край; без — котвата, и краят
    // се прибира върху нея. Enter и Tab винаги прибират обхвата.
    const priberi = () => {
      izbrana!.krayRed = izbrana!.red;
      izbrana!.krayKolona = izbrana!.kolona;
      izbrana!.oshte.clear();
    };
    const sShift = e.shiftKey;
    let r = sShift ? izbrana.krayRed : izbrana.red;
    let c = sShift ? izbrana.krayKolona : izbrana.kolona;
    const kletki = kletkiNa(redove[Math.min(r, posledenRed)] ?? redove[0]!);
    const poslednaKolona = kletki.length - 1;

    let hvanato = true;
    let dvizhenie = true;
    switch (e.key) {
      case 'ArrowDown':
        r = doRaba ? posledenRed : Math.min(r + 1, posledenRed);
        break;
      case 'ArrowUp':
        r = doRaba ? 0 : Math.max(r - 1, 0);
        break;
      case 'ArrowRight':
        c = doRaba ? poslednaKolona : Math.min(c + 1, poslednaKolona);
        break;
      case 'ArrowLeft':
        c = doRaba ? 0 : Math.max(c - 1, 0);
        break;
      case 'Home':
        c = 0;
        if (doRaba) r = 0;
        break;
      case 'End':
        c = poslednaKolona;
        if (doRaba) r = posledenRed;
        break;
      case 'Enter':
        dvizhenie = false;
        izbrana.red = Math.min(izbrana.red + 1, posledenRed);
        priberi();
        break;
      case 'Tab':
        dvizhenie = false;
        if (e.shiftKey) {
          if (izbrana.kolona > 0) izbrana.kolona -= 1;
          else if (izbrana.red > 0) {
            izbrana.red -= 1;
            izbrana.kolona = poslednaKolona;
          }
        } else if (izbrana.kolona < poslednaKolona) izbrana.kolona += 1;
        else if (izbrana.red < posledenRed) {
          // Краят на реда прелива в началото на следващия — както в Excel.
          izbrana.red += 1;
          izbrana.kolona = 0;
        }
        priberi();
        break;
      case 'Escape':
        izbrana = null;
        mahniZnaka();
        skriyLentata();
        return;
      default:
        hvanato = false;
    }
    if (!hvanato) return;
    if (dvizhenie) {
      if (sShift) {
        izbrana.krayRed = r;
        izbrana.krayKolona = c;
      } else {
        // движение без Shift прибира всичко — и обхвата, и Ctrl-редовете
        izbrana.red = r;
        izbrana.kolona = c;
        priberi();
      }
    }
    e.preventDefault(); // иначе стрелките скролват страницата под селекцията
    pokazhi();
  });
}
