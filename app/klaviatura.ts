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
 * Кое е пари, НЕ се гадае по текста: евро-клетката носи стотинките си в
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

import { pishi, pishiVPole } from '../src/yadro/pari.js';
import { opitajStornoNaMnogo, stornoOtButona, type ZaStorno } from './storno.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

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
export interface KletkaVIzbora {
  readonly tekst: string;
  /** стотинките от `data-st`, или null — клетката не е пари */
  readonly st: number | null;
}

export interface SmetkaNaIzbora {
  /** непразните клетки — както Excel брои */
  readonly broy: number;
  readonly broyPari: number;
  readonly sbor_st: number;
  /** закръглено до стотинка САМО за показ — то никога не влиза в сбор */
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
  // към НАЙ-БЛИЗКАТА стотинка, симетрично за минуса — Math.round сам по себе
  // си тегли -0,5 към нулата, а +0,5 нагоре, и средното на дългове би куцало.
  const sredno = broyPari === 0 ? 0 : Math.sign(sbor) * Math.round(Math.abs(sbor) / broyPari);
  return { broy, broyPari, sbor_st: sbor, sredno_st: sredno };
}

/** Стотинките на една клетка · само каквото самата тя декларира. */
function stNa(kletka: HTMLElement): number | null {
  const surovo = kletka.dataset['st'];
  if (surovo === undefined) return null;
  const n = Number(surovo);
  return Number.isSafeInteger(n) ? n : null;
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
  if (lenta) lenta.hidden = true;
}

/** Лентата се показва при обхват от 2+ клетки — една клетка не е сметка. */
function pokazhiLentata(obshtoKletki: number, s: SmetkaNaIzbora, zaStorno: readonly ZaStorno[]): void {
  const l = lentata();
  if (obshtoKletki < 2) {
    l.hidden = true;
    return;
  }
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
  if (!izbrana) return [];
  const redove = redoveNa(izbrana.tablitsa);
  const posleden = redove.length - 1;
  const otKolona = Math.min(izbrana.kolona, izbrana.krayKolona);
  const doKolona = Math.max(izbrana.kolona, izbrana.krayKolona);
  const nomera = new Set<number>();
  const doRed = Math.min(Math.max(izbrana.red, izbrana.krayRed), posleden);
  for (let r = Math.min(izbrana.red, izbrana.krayRed); r <= doRed; r += 1) nomera.add(r);
  for (const r of izbrana.oshte) if (r <= posleden) nomera.add(r);

  const rezultat: HTMLElement[][] = [];
  for (const r of [...nomera].sort((a, b) => a - b)) {
    const kletki = kletkiNa(redove[r]!);
    const tsyalRed = izbrana.oshte.has(r);
    const ot = tsyalRed ? 0 : Math.min(otKolona, kletki.length - 1);
    const doo = tsyalRed ? kletki.length - 1 : Math.min(doKolona, kletki.length - 1);
    rezultat.push(kletki.slice(ot, doo + 1).filter((kl) => !kl.querySelector('button')));
  }
  return rezultat.filter((red) => red.length > 0);
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

/** Копира избора: text/plain (TSV) + text/html (истинска таблица). */
async function kopirayIzbora(): Promise<void> {
  const redove = izbranitePoRedove();
  if (redove.length === 0) return;
  const { tsv, html } = klipbordniVkusove(redove.map((red) => red.map(tekstNaKletkaZaKlipborda)));
  try {
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
    // потвърждението свети в лентата до следващото движение на селекцията
    const l = lentata();
    const s = document.createElement('span');
    s.textContent = `Копирано · ${redove.length} ${redove.length === 1 ? 'ред' : 'реда'}`;
    l.append(s);
    l.hidden = false;
  } catch {
    konteks?.vest('zle', 'Клипбордът отказа — браузърът иска разрешение за копиране.');
  }
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

  const otRed = Math.min(izbrana.red, izbrana.krayRed);
  const doRed = Math.max(izbrana.red, izbrana.krayRed);
  const otKolona = Math.min(izbrana.kolona, izbrana.krayKolona);
  const doKolona = Math.max(izbrana.kolona, izbrana.krayKolona);

  const vIzbora: KletkaVIzbora[] = [];
  const zaStorno: ZaStorno[] = [];
  let obshtoKletki = 0;
  const izbraniRedove = new Set<number>();
  for (let r = otRed; r <= doRed; r += 1) izbraniRedove.add(r);
  for (const r of izbrana.oshte) if (r <= posleden) izbraniRedove.add(r);

  for (const r of izbraniRedove) {
    const kletki = kletkiNa(redove[r]!);
    // Правоъгълникът взима колоните между котвата и края; ред от Ctrl+клик
    // влиза ЦЯЛ — той е избран като ред, не като клетки.
    const tsyalRed = izbrana.oshte.has(r);
    const ot = tsyalRed ? 0 : Math.min(otKolona, kletki.length - 1);
    const doo = tsyalRed ? kletki.length - 1 : Math.min(doKolona, kletki.length - 1);
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
    for (const b of redove[r]!.querySelectorAll<HTMLButtonElement>('button')) {
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

    // Ctrl+C · избраното тръгва към клипборда — и към Excel.
    if (doRaba && e.code === 'KeyC') {
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
        izbrana.krayRed = izbrana.red;
        izbrana.krayKolona = izbrana.kolona;
        izbrana.oshte.clear();
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
        izbrana.krayRed = izbrana.red;
        izbrana.krayKolona = izbrana.kolona;
        izbrana.oshte.clear();
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
      izbrana.krayRed = r;
      izbrana.krayKolona = c;
      if (!sShift) {
        // движение без Shift прибира всичко — и обхвата, и Ctrl-редовете
        izbrana.red = r;
        izbrana.kolona = c;
        izbrana.oshte.clear();
      }
    }
    e.preventDefault(); // иначе стрелките скролват страницата под селекцията
    pokazhi();
  });
}
