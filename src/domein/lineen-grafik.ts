/**
 * ЛИНЕЙНИЯТ ГРАФИК · от изнесеното на MS Project към дела (резен 110 · ADR-166).
 *
 * Негово, 03.09, с двата качени файла:
 *
 *   „…линейняо график от който взимаш пример за Гант. Дори Гоялмо Дело се
 *   появява като отделен таб при посикване и само там може да вкараш линеен
 *   график и да направиш Линейния график с тажлицата и диаграмата от модела
 *   на Гант… Там ще се прибира към ИМот на който принадлежи."
 *
 * ═══ ЧЕТЕ СЕ ПО КООРДИНАТИ, НЕ ПО РЕД НА РИСУВАНЕ ═══
 *
 * ПДФ не пази таблица, а думи с места. Първият опит тук сглобяваше редовете по
 * ВИДА на клетките („това прилича на дата") и се счупи на първия истински ред:
 * „451 " и „days" идват като две рисунки, тъй че числото на продължителността
 * минаваше за номер на ред. Сега колоната се познава по `x`, а редът по `y` —
 * както ги е начертал MS Project.
 *
 * И най-важното, което само `x` носи: ОТСТЪПЪТ. Нивото на задачата не е
 * записано никъде във файла — то е колко навътре е нарисувано името (127 ·
 * 138 · 150 точки в неговия график). Оттам излиза „дела и поддела" (И131 т.2);
 * без него дървото е плосък списък.
 *
 * ═══ КАКВО НЕ ПРАВИ ═══
 *
 * НЕ пише. Връща прочетеното и БРОЯ на видените номера, за да има с какво да
 * се сравни записаното (правило 7). Записва човекът, от екрана (правило 18).
 *
 * НЕ пази зависимостите („10FF+2 days"). Делото няма поле за тях
 * (`PayloadDeloZapisano` носи дванайсет полета и нито едно не е зависимост);
 * номерата се четат и се ПОКАЗВАТ, но не се записват като дума в името.
 */

import { redoveOtBlokove, type TekstovBlok } from '../iztochnik/pdf.js';

/** Един прочетен ред от графика. */
export interface RedNaGrafika {
  /** номерът от колоната ID · ключът за идемпотентност */
  readonly nomer: string;
  readonly ime: string;
  /** продължителността в дни, както я казва файлът; 0 значи „не я каза" */
  readonly dni: number;
  /** YYYY-MM-DD */
  readonly ot: string;
  /** YYYY-MM-DD */
  readonly do: string;
  /** номерата, след които върви · празно значи „не зависи от нищо" */
  readonly predshestvenitsi: readonly string[];
  /** нивото на отстъпа · 0 е най-горе */
  readonly stepen: number;
  /** номерът на ГОРНОТО дело; празно значи „най-горе" */
  readonly nadNomer: string;
}

export interface ProchetenGrafik {
  readonly redove: readonly RedNaGrafika[];
  /** колко номера е видял четецът · знаменателят на сверката (правило 7) */
  readonly nomera: number;
  /** ред с номер, но без две дати или без име · казва се, не се измисля */
  readonly propusnati: number;
}

/** „Mon 3/2/26" · „3/2/26" · „3/2/2026" → 2026-03-02. Празно, ако не е дата. */
export function dataOtGrafika(tekst: string): string {
  const nameren = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(tekst);
  if (!nameren) return '';
  const mesets = Number(nameren[1]);
  const den = Number(nameren[2]);
  const surovaGodina = Number(nameren[3]);
  // Двуцифрената година е от ТОЗИ век: износът е на жив график, не на архив
  // от миналия. Ако някога дойде „99", ще значи 2099 — по-честно от праг,
  // който да гадае вместо човека.
  const godina = surovaGodina < 100 ? 2000 + surovaGodina : surovaGodina;
  if (mesets < 1 || mesets > 12 || den < 1 || den > 31) return '';
  return `${String(godina).padStart(4, '0')}-${String(mesets).padStart(2, '0')}-${String(den).padStart(2, '0')}`;
}

/** „60 days" · „1 day" · „7 дни" → 60 · 1 · 7. Нула значи „няма число". */
export function dniOtGrafika(tekst: string): number {
  const nameren = /(\d+(?:[.,]\d+)?)\s*(days?|дни|ден|edays?|wks?|mons?)/i.exec(tekst);
  if (!nameren) return 0;
  return Math.round(Number((nameren[1] ?? '0').replace(',', '.')));
}

/**
 * Предшественици · „10FF+2 days", „13", „10,19FF+3 days" → номерата в тях.
 *
 * Видът на връзката (FF · SS · закъснението) се ЧЕТЕ, но не се пази: делото
 * няма поле за него. Да го запишем в името би значело да сложим данни там,
 * където човек чете дума.
 */
export function predshestvenitsiOt(kletka: string): readonly string[] {
  const nomera: string[] = [];
  for (const parche of kletka.split(',')) {
    const nomer = /^\s*(\d{1,4})/.exec(parche);
    if (nomer) nomera.push(nomer[1]!);
  }
  return Object.freeze(nomera);
}

/** Имената на шестте колони, както ги пише MS Project (и на български). */
const GLAVI = {
  nomer: ['id', '№'],
  ime: ['task name', 'име на задача', 'задача'],
  dni: ['duration', 'продължителност'],
  ot: ['start', 'начало'],
  do: ['finish', 'край'],
  predi: ['predecessors', 'предшественици'],
} as const;

type Kolona = keyof typeof GLAVI;

interface Koloni {
  readonly x: Readonly<Record<Kolona, number>>;
}

function svedeno(t: string): string {
  return t.trim().toLocaleLowerCase('bg-BG');
}

/** Намира шапката на страницата и `x`-а на всяка колона. Null, ако я няма. */
function koloniteNa(redove: readonly (readonly TekstovBlok[])[]): Koloni | null {
  for (const red of redove) {
    const x: Partial<Record<Kolona, number>> = {};
    for (const blok of red) {
      const duma = svedeno(blok.tekst);
      for (const [klyuch, imena] of Object.entries(GLAVI) as [Kolona, readonly string[]][]) {
        if (imena.includes(duma)) x[klyuch] = blok.x;
      }
    }
    // Шапката е тази, която носи и четирите неща, по които редът се познава.
    if (x.nomer !== undefined && x.ime !== undefined && x.ot !== undefined && x.do !== undefined) {
      return {
        x: {
          nomer: x.nomer,
          ime: x.ime,
          dni: x.dni ?? (x.ime + x.ot) / 2,
          ot: x.ot,
          do: x.do,
          predi: x.predi ?? x.do + 46,
        },
      };
    }
  }
  return null;
}

/** Коя колона е това парче · най-близката, но не по-далече от половин поле. */
function koyaKolona(blok: TekstovBlok, k: Koloni): Kolona | null {
  let nay: Kolona | null = null;
  let razstoyanie = Number.POSITIVE_INFINITY;
  for (const [klyuch, x] of Object.entries(k.x) as [Kolona, number][]) {
    const r = Math.abs(blok.x - x);
    if (r < razstoyanie) {
      razstoyanie = r;
      nay = klyuch;
    }
  }
  // ИМЕТО е широко и с ОТСТЪП: клетка вдясно от него, но преди дните, пак е
  // име. Останалите колони са тесни и подравнени, затова им стига половин
  // поле — иначе датата на съседната колона щеше да краде клетки.
  if (nay === 'ime') return blok.x < k.x.dni - 6 ? 'ime' : null;
  return razstoyanie <= 30 ? nay : null;
}

/**
 * СТЕПЕНИТЕ ОТ ОТСТЪПИТЕ · всяко ниво е свой `x`, но с допуск.
 *
 * MS Project мести името с фиксирана стъпка (в неговия график ~11 точки).
 * Стойностите се събират от ЦЕЛИЯ файл, подреждат се и всяка получава ранг —
 * така нивото е едно и също на всяка страница, вместо да се брои наново на
 * всеки лист.
 */
export function stepeniteNa(otstapi: readonly number[], dopusk = 4): (x: number) => number {
  const podredeni = [...new Set(otstapi)].sort((a, b) => a - b);
  const grupi: number[] = [];
  for (const x of podredeni) {
    const posledna = grupi[grupi.length - 1];
    if (posledna === undefined || x - posledna > dopusk) grupi.push(x);
  }
  return (x: number): number => {
    let nay = 0;
    for (let i = 0; i < grupi.length; i += 1) {
      if (x >= grupi[i]! - dopusk) nay = i;
    }
    return nay;
  };
}

interface Surov {
  nomer: string;
  ime: string;
  dni: string;
  ot: string;
  do: string;
  predi: string;
  otstap: number;
}

/**
 * ЧЕТЕ ГРАФИКА · страница по страница, ред по ред, колона по колона.
 *
 * Продължението на дълъг ред (втори ред без номер) се ЛЕПИ за предишния — и
 * то ПО КОЛОНИ: „451 " + „days" е продължителност, „Wed " + „2/1/23" е дата.
 * Страница без шапка (рисунката на диаграмата) се подминава цяла.
 */
export function prochetiGrafik(stranitsi: readonly (readonly TekstovBlok[])[]): ProchetenGrafik {
  const surovi: Surov[] = [];
  let nomera = 0;

  for (const stranitsa of stranitsi) {
    const redove = redoveOtBlokove(stranitsa);
    const koloni = koloniteNa(redove);
    if (koloni === null) continue;
    let sledShapkata = false;

    for (const red of redove) {
      const kletki: Partial<Record<Kolona, { tekst: string; x: number }>> = {};
      for (const blok of red) {
        const koya = koyaKolona(blok, koloni);
        if (koya === null) continue;
        const veche = kletki[koya];
        kletki[koya] =
          veche === undefined
            ? { tekst: blok.tekst.trim(), x: blok.x }
            : { tekst: `${veche.tekst} ${blok.tekst.trim()}`.trim(), x: veche.x };
      }
      const nomer = (kletki.nomer?.tekst ?? '').trim();
      if (svedeno(nomer) === 'id' || GLAVI.ime.includes(svedeno(kletki.ime?.tekst ?? '') as never)) {
        sledShapkata = true;
        continue;
      }
      if (!sledShapkata) continue;

      if (/^\d{1,4}$/.test(nomer)) {
        nomera += 1;
        surovi.push({
          nomer,
          ime: kletki.ime?.tekst ?? '',
          dni: kletki.dni?.tekst ?? '',
          ot: kletki.ot?.tekst ?? '',
          do: kletki.do?.tekst ?? '',
          predi: kletki.predi?.tekst ?? '',
          otstap: kletki.ime?.x ?? 0,
        });
        continue;
      }
      // ПРОДЪЛЖЕНИЕ · ред без номер допълва последния, пак по колони.
      const posleden = surovi[surovi.length - 1];
      if (posleden === undefined) continue;
      const dopalni = (koe: Exclude<Kolona, 'nomer'>): void => {
        const t = kletki[koe]?.tekst;
        if (t === undefined || t === '') return;
        posleden[koe] = posleden[koe] === '' ? t : `${posleden[koe]} ${t}`.trim();
      };
      dopalni('ime');
      dopalni('dni');
      dopalni('ot');
      dopalni('do');
      dopalni('predi');
    }
  }

  const stepenNa = stepeniteNa(surovi.map((s) => s.otstap));
  const redove: RedNaGrafika[] = [];
  let propusnati = 0;
  /** последният номер на всяка степен · оттам излиза родителят */
  const posledenNaStepen = new Map<number, string>();

  for (const s of surovi) {
    const ot = dataOtGrafika(s.ot);
    const doData = dataOtGrafika(s.do);
    const ime = s.ime.replace(/\s+/g, ' ').trim();
    if (ot === '' || doData === '' || ime === '') {
      propusnati += 1;
      continue;
    }
    const stepen = stepenNa(s.otstap);
    const nadNomer = stepen === 0 ? '' : (posledenNaStepen.get(stepen - 1) ?? '');
    posledenNaStepen.set(stepen, s.nomer);
    // По-дълбоките степени вече не важат: следващият ред на степен 2 не бива
    // да наследи родител от предишно разклонение.
    for (const nivo of [...posledenNaStepen.keys()]) {
      if (nivo > stepen) posledenNaStepen.delete(nivo);
    }
    redove.push({
      nomer: s.nomer,
      ime,
      dni: dniOtGrafika(s.dni),
      ot,
      do: doData,
      predshestvenitsi: predshestvenitsiOt(s.predi),
      stepen,
      nadNomer,
    });
  }

  return { redove: Object.freeze(redove), nomera, propusnati };
}

/**
 * `opId` НОСИ ДЕЙСТВИЕТО (правило 5 · 20) · Имот + номера от файла.
 *
 * Второ четене на същия файл под същия Имот не ражда втори комплект дела —
 * връща същите. Номерът е на ФАЙЛА, не наш: така повторното вкарване на
 * поправен график поправя ТЕЗИ редове, вместо да ги удвои.
 */
export function opIdNaRedOtGrafika(myasto: string, nomer: string): string {
  return `grafik:${myasto}:${nomer}`;
}
