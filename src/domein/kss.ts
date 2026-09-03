/**
 * КОЛИЧЕСТВЕНО-СТОЙНОСТНАТА СМЕТКА · четене и сверка (резен 110 · ADR-166).
 *
 * Негово, 03.09: „…а КСС е за Сметки." Файлът е ПДФ, изнесен от Excel: раздели
 * (ПРОЕКТ И ДОКУМЕНТАЦИЯ · ОРГАНИЗАЦИЯ НА СТРОИТЕЛСТВОТО · ЧАСТ: АРХИТЕКТУРА…)
 * и шест колони — № по ред · описание · ед. мярка · количество · ед. цена ·
 * стойност.
 *
 * ═══ ТРИТЕ ПРАВИЛА, КОИТО ДЪРЖАТ ТОЗИ ФАЙЛ ═══
 *
 * 1. **Числата са ЦЕЛИ най-малки единици** (правило 3). Файлът пише „2 000.00"
 *    — интервал за хиляди и ТОЧКА за дробното. Това не е нито нашата норма за
 *    евро („1 234,56 €"), нито тази за долар: то е нормата на ЧУЖДИЯ файл и
 *    затова се чете тук, а не с `otSuma`. Прочетеното си остава число на
 *    ФАЙЛА — не се превръща във валута на книгата и не влиза в Журнала.
 * 2. **Всеки ред носи своята сверка** (правило 7): количество × единична цена
 *    трябва да дава стойността. Разликата се СМЯТА и се показва — и когато е
 *    нула. Закръгленото не влиза в сбор: сборът е от ПРОЧЕТЕНИТЕ стойности,
 *    не от пресметнатите.
 * 3. **Редът „Общо:" е ВТОРА сверка** — сборът на файла срещу нашия сбор. Файл,
 *    чийто край не съвпада с редовете си, се показва с разликата, а не се
 *    поправя тихо.
 *
 * Количеството се пази в ХИЛЯДНИ (цяло число), защото в КСС стоят и „4 500.00
 * кг", и „0.99 м²": дробно като float събира грешка, а хилядните я нямат.
 *
 * Редовете се сглобяват ПО КООРДИНАТИ (`redoveOtBlokove`): в ПДФ таблица няма,
 * а числата на сметката са ПОДРАВНЕНИ ВДЯСНО — тоест `x`-ът им се мени от ред
 * на ред. Затова колоната тук не се търси по място, а по РЕД отляво надясно:
 * последните три числа на реда са количество · единична цена · стойност.
 */

import { redoveOtBlokove, type TekstovBlok } from '../iztochnik/pdf.js';
import { deliZakragleno } from '../yadro/pari.js';

export interface RedNaKSS {
  /** номерът в раздела · може да се повтаря между разделите */
  readonly nomer: string;
  readonly opisanie: string;
  /** „бр." · „м" · „м2" · „кг" — както го пише файлът */
  readonly myarka: string;
  /** количеството в ХИЛЯДНИ: „250.00" → 250 000 */
  readonly kolichestvo_hil: number;
  /** единичната цена в цели най-малки единици на файла */
  readonly edinichna_st: number;
  /** стойността, както я КАЗВА файлът */
  readonly stoynost_st: number;
  /** количество × единична цена, сметнато тук */
  readonly smetnato_st: number;
}

export interface ProchetenaKSS {
  readonly redove: readonly RedNaKSS[];
  /** сборът на прочетените стойности */
  readonly sbor_st: number;
  /** сборът, който казва самият файл (ред „Общо:"); 0 значи „не го каза" */
  readonly obyaven_st: number;
  /** обявеното минус нашето · нулата се казва (правило 7) */
  readonly razlika_st: number;
  /** редове с номер и описание, но без три числа */
  readonly propusnati: number;
}

/**
 * Число от чужд файл · „2 000.00" · „151,80" · „1 234.5" → цели стотни.
 *
 * И двата дробни знака се приемат, защото и двата идват от истински файлове:
 * банката пише точка, българският Excel — запетая. Интервалите (включително
 * твърдият и тесният) падат, защото те са хиляди, не знак.
 */
function tsyaloOtFayla(tekst: string, znatsi: 2 | 3): number | null {
  const chisto = tekst.replace(/[\s  ']/g, '');
  if (!/^-?\d+([.,]\d{1,3})?$/.test(chisto)) return null;
  const otritsatelno = chisto.startsWith('-');
  const bezZnak = otritsatelno ? chisto.slice(1) : chisto;
  const [tsyala = '0', drobna = ''] = bezZnak.split(/[.,]/);
  const drobni = Number(drobna.slice(0, znatsi).padEnd(znatsi, '0'));
  const sbor = Number(tsyala) * 10 ** znatsi + drobni;
  return otritsatelno ? -sbor : sbor;
}

export function chisloOtFayla(tekst: string): number | null {
  return tsyaloOtFayla(tekst, 2);
}

/**
 * Същото число, но в ХИЛЯДНИ — за количествата, които НЕ са пари.
 *
 * Двете четения бяха написани поотделно и обходът за чистота ги хвана като
 * пет еднакви реда. Разликата им е ЕДНА — колко знака след дробния знак се
 * пазят; написани два пъти, те щяха да се разминат при първата поправка на
 * разделителите (правило 17).
 */
export function kolichestvoOtFayla(tekst: string): number | null {
  return tsyaloOtFayla(tekst, 3);
}

/** Мярката е кратка дума; числата и описанията не са мярка. */
export function eMyarka(kletka: string): boolean {
  return /^(бр\.?|м|м['`’]|м2|м3|кв\.?м\.?|куб\.?м\.?|кг|т|л|компл\.?|дка|бр|m|m2|m3|kg)$/i.test(
    kletka.trim(),
  );
}

/** Клетка, която е само номер на ред. */
function eNomer(kletka: string): boolean {
  return /^\d{1,3}$/.test(kletka.trim());
}

/**
 * ЧЕТЕ КСС · ред по ред, а колоните — по реда отляво надясно.
 *
 * Заглавията на разделите („ЧАСТ: АРХИТЕКТУРА") нямат номер и три числа и
 * затова падат сами: те са подредба, не работа. Шапката с номерата на
 * колоните („1 2 3 4 5 6") пада по същото правило — тя няма описание.
 */
export function prochetiKSS(stranitsi: readonly (readonly TekstovBlok[])[]): ProchetenaKSS {
  const redove: RedNaKSS[] = [];
  let propusnati = 0;
  let obyaven_st = 0;

  /** висяща степен („2" от „м²"), която чака реда си — виж по-долу */
  let viseshtaStepen = '';

  for (const stranitsa of stranitsi) {
    for (const red of redoveOtBlokove(stranitsa)) {
      const kletki = red.map((b) => b.tekst.trim()).filter((t) => t !== '');
      if (kletki.length === 0) continue;

      // СТЕПЕНТА НА КВАДРАТА · „м" и „2" се рисуват като ДВЕ парчета, а
      // горният индекс стои по-високо от своя ред — тоест пада на свой ред
      // ПРЕДИ него. Затова се запомня и се лепи за мярката на СЛЕДВАЩИЯ ред.
      if (kletki.length === 1 && /^[23]$/.test(kletki[0]!)) {
        viseshtaStepen = kletki[0]!;
        continue;
      }

      // РЕДЪТ „ОБЩО:" · сборът на файла. Взима се ПОСЛЕДНОТО число на реда,
      // защото пред него стоят сборовете на другите колони.
      if (/^общо\s*:?$/i.test(kletki[0] ?? '')) {
        for (let i = kletki.length - 1; i > 0; i -= 1) {
          const chislo = chisloOtFayla(kletki[i]!);
          if (chislo !== null) {
            obyaven_st = chislo;
            break;
          }
        }
        continue;
      }

      if (!eNomer(kletki[0] ?? '')) continue;

      // Числата на реда, отляво надясно. Последните ТРИ са количество ·
      // единична цена · стойност; всичко пред тях е описание и мярка.
      const chisla: { tekst: string; kade: number }[] = [];
      for (let i = 1; i < kletki.length; i += 1) {
        if (chisloOtFayla(kletki[i]!) !== null) chisla.push({ tekst: kletki[i]!, kade: i });
      }
      if (chisla.length < 3) {
        // Ред с номер, но без трите числа: раздел или пренесено описание.
        if (kletki.length > 1) propusnati += 1;
        continue;
      }
      const posledniTri = chisla.slice(-3);
      const parvoChislo = posledniTri[0]!.kade;
      const dumi = kletki.slice(1, parvoChislo);
      const myarka = dumi.length > 0 && eMyarka(dumi[dumi.length - 1]!) ? dumi.pop()! : '';
      const opisanie = dumi.join(' ').replace(/\s+/g, ' ').trim();
      // ШАПКАТА С НОМЕРАТА НА КОЛОНИТЕ („1 2 3 4 5 6") · описание от голи
      // цифри не е работа. Тя се повтаря на всяка страница на неговата сметка
      // и без това правило ставаше ред за 20 стотинки.
      if (opisanie === '' || /^[\d\s.,]+$/.test(opisanie)) {
        propusnati += opisanie === '' ? 1 : 0;
        continue;
      }
      const kolichestvo_hil = kolichestvoOtFayla(posledniTri[0]!.tekst) ?? 0;
      const edinichna_st = chisloOtFayla(posledniTri[1]!.tekst) ?? 0;
      const stoynost_st = chisloOtFayla(posledniTri[2]!.tekst) ?? 0;
      redove.push({
        nomer: kletki[0]!,
        opisanie,
        myarka: myarka !== '' && viseshtaStepen !== '' && !/\d$/.test(myarka)
          ? `${myarka}${viseshtaStepen}`
          : myarka,
        kolichestvo_hil,
        edinichna_st,
        stoynost_st,
        // Количеството е в хилядни · делението връща цели стотинки нагоре от
        // половинката (`deliZakragleno` — един дом за закръглянето).
        smetnato_st: deliZakragleno(kolichestvo_hil * edinichna_st, 1000),
      });
      viseshtaStepen = '';
    }
  }

  const sbor_st = redove.reduce((s, r) => s + r.stoynost_st, 0);
  return {
    redove: Object.freeze(redove),
    sbor_st,
    obyaven_st,
    razlika_st: obyaven_st === 0 ? 0 : obyaven_st - sbor_st,
    propusnati,
  };
}

/** Колко реда не се връзват · количество × цена ≠ стойност (правило 7). */
export function nevarzaniRedove(k: ProchetenaKSS): readonly RedNaKSS[] {
  return k.redove.filter((r) => r.smetnato_st !== r.stoynost_st);
}
