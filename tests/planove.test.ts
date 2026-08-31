/**
 * ПЛАНОВЕТЕ · двата слоя, стълбата и отметките.
 *
 * Таблицата в `planove.ts` е ЗАКОН, а не описание. Тези тестове я пазят от
 * трите начина, по които такава таблица тихо се разваля:
 *
 *   1. по-голям план губи нещо от по-малкия (клиентът плаща и получава по-малко);
 *   2. Стартъпът престава да носи ЦЯЛАТА функционалност и нагоре почват да
 *      се добавят ФУНКЦИИ вместо КАПАЦИТЕТ — точно грешката, която ADR-003
 *      направи и ADR-004 поправя;
 *   3. отметка почва да се бърка с право — изключеното става неразличимо от
 *      липсващото.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  eIzklyuchena,
  izborPoPodrazbirane,
  mozhe,
  OPISANIE,
  OSHTE_NE_E_ZAPOCHNATO,
  plan,
  PLAN_PO_PODRAZBIRANE,
  PLANOVE,
  poNositel,
  rabotiOflayn,
  vKletka,
  type Akaunti,
  type Nositel,
  prevklyuchi,
  smeniPlan,
  stigaLiHranilishteto,
  ZADALZHITELNI,
  type Vazmozhnost,
} from '../src/domein/planove.js';

describe('матрицата · двата критерия', () => {
  it('всяка клетка има ТОЧНО един план', () => {
    const kletki: [Nositel, Akaunti][] = [
      ['lokalno', 'edin'],
      ['lokalno', 'poveche'],
      ['oblak', 'edin'],
      ['oblak', 'poveche'],
    ];
    expect(PLANOVE).toHaveLength(kletki.length);
    for (const [n, a] of kletki) {
      const namereni = PLANOVE.filter((p) => p.nositel === n && p.akaunti === a);
      expect(namereni, `клетка ${n}×${a}`).toHaveLength(1);
      expect(vKletka(n, a)).toBe(namereni[0]);
    }
  });

  it('ВСЯКО издание работи офлайн — това е обещание, не свойство на план', () => {
    // Служителят без обхват пише и се сверява, щом обхватът се върне.
    // Падне ли това, значи някой е счупил обещанието към онзи на строежа.
    for (const p of PLANOVE) expect(rabotiOflayn(p), p.ime).toBe(true);
  });

  it('стълбата се мери ПО ЛИНИЯ: Личен ⊂ Професионален при еднакъв носител', () => {
    for (const nositel of ['lokalno', 'oblak'] as const) {
      const edin = vKletka(nositel, 'edin');
      const poveche = vKletka(nositel, 'poveche');
      for (const v of edin.vazmozhnosti) {
        expect(poveche.vazmozhnosti.has(v), `${poveche.ime} губи „${v}"`).toBe(true);
      }
    }
  });

  it('локалният няма ИЗТОЧНИЦИ — няма драйв, от който да чете', () => {
    for (const p of poNositel('lokalno')) {
      expect(p.vazmozhnosti.has('iztochnitsi'), p.ime).toBe(false);
    }
    for (const p of poNositel('oblak')) {
      expect(p.vazmozhnosti.has('iztochnitsi'), p.ime).toBe(true);
    }
  });

  it('колонното право съществува само при ПОВЕЧЕ акаунти', () => {
    for (const p of PLANOVE) {
      expect(p.vazmozhnosti.has('kolonno-pravo'), p.ime).toBe(p.akaunti === 'poveche');
    }
  });

  it('другите имейли искат ОБЛАК — локално няма кого да пуснеш', () => {
    // В локалния Професионален колонното право върви с АГЕНТА, не с втори имейл.
    expect(vKletka('lokalno', 'poveche').vazmozhnosti.has('drugi-imeyli')).toBe(false);
    expect(vKletka('oblak', 'poveche').vazmozhnosti.has('drugi-imeyli')).toBe(true);
  });

  it('стартъпът е Професионалният в облака', () => {
    const startap = plan(PLAN_PO_PODRAZBIRANE);
    expect(startap.klyuch).toBe('profesionalen');
    expect(startap.nositel).toBe('oblak');
    expect(startap.akaunti).toBe('poveche');
  });

  it('непознат план пада към стартъпа, не към празно', () => {
    expect(plan('няма такъв').klyuch).toBe('profesionalen');
    expect(plan(undefined).klyuch).toBe('profesionalen');
    expect(plan('').klyuch).toBe('profesionalen');
  });

  it('всяка възможност си има изречение за таблото', () => {
    for (const p of PLANOVE) {
      for (const v of p.vazmozhnosti) expect(OPISANIE[v], `„${v}" е без описание`).toBeTruthy();
    }
  });
});

describe('отметките · вторият слой', () => {
  it('нов избор включва всичко, което планът позволява', () => {
    const izbor = izborPoPodrazbirane('profesionalen');
    for (const v of izbor.plan.vazmozhnosti) expect(mozhe(izbor, v)).toBe(true);
  });

  it('изключеното НЕ е същото като липсващото', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('profesionalen'), 'arhiv-eksel', false);

    expect(mozhe(izbor, 'arhiv-eksel')).toBe(false);
    expect(eIzklyuchena(izbor, 'arhiv-eksel')).toBe(true); // планът я дава, аз я скрих

    const lichen = izborPoPodrazbirane('lichen');
    expect(mozhe(lichen, 'roli-za-dostap')).toBe(false);
    expect(eIzklyuchena(lichen, 'roli-za-dostap')).toBe(false); // планът изобщо я няма
  });

  it('задължителната отметка не се маха', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('profesionalen'), 'zapis', false);
    expect(mozhe(izbor, 'zapis')).toBe(true);
    for (const v of ZADALZHITELNI) expect(mozhe(izbor, v)).toBe(true);
  });

  it('отметка за нещо, което планът не дава, не се пали', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('lichen'), 'drugi-imeyli', true);
    expect(mozhe(izbor, 'drugi-imeyli')).toBe(false);
  });

  it('смяна на плана пази отметките, а новото идва включено', () => {
    const bez = prevklyuchi(izborPoPodrazbirane('lichen'), 'arhiv-eksel', false);
    const golyam = smeniPlan(bez, 'profesionalen');

    expect(mozhe(golyam, 'arhiv-eksel')).toBe(false); // изборът му се уважава
    expect(mozhe(golyam, 'drugi-imeyli')).toBe(true); // новото не се крие
    expect(mozhe(golyam, 'individualni-razrabotki')).toBe(true);

    // Надолу: каквото новият план не носи, изчезва — без да гърми.
    const nadolu = smeniPlan(golyam, 'lichen');
    expect(mozhe(nadolu, 'drugi-imeyli')).toBe(false);
    expect(mozhe(nadolu, 'zapis')).toBe(true);
  });

  it('ИИ вече е ПОСТРОЕН — и таблото не му слага етикет „скоро"', () => {
    // Беше в списъка, докато беше построена само управницията (ADR-026).
    // Свързването е построено (ADR-029) и етикетът слезе: надпис „скоро"
    // върху работещ бутон е точно толкова лъжа, колкото бутон върху нищо.
    expect(OSHTE_NE_E_ZAPOCHNATO.has('svarzhi-ii')).toBe(false);
    expect(plan('profesionalen').vazmozhnosti.has('svarzhi-ii')).toBe(true);
  });

  it('списъкът „още не е започнало" ОСТАВА, макар и празен', () => {
    // Механизмът е минат през проход и не се строи наново за следващата
    // обявена, но непостроена възможност.
    expect(OSHTE_NE_E_ZAPOCHNATO.size).toBe(0);
    expect(typeof OSHTE_NE_E_ZAPOCHNATO.has).toBe('function');
  });
});

/**
 * ВСЯКА ВЪЗМОЖНОСТ СТИГА ДО ОТМЕТКА · дупката, която обходът намери.
 *
 * `OPISANIE` е `Record<Vazmozhnost, string>` — компилаторът пази да има изречение
 * за всяка. Но `RED` в `app/tablo.ts` е ОБИКНОВЕН МАСИВ: нова възможност може да
 * влезе в план, да получи описание, и НИКОГА да не получи отметка на Таблото.
 * Тогава планът я дава, човекът не може да я изключи, и нищо не пада.
 *
 * Точно това е и обратната половина на правило 15 („изключено ≠ липсващо"):
 * ако възможността я няма на Таблото, „включена" и „несъществуваща" изглеждат
 * еднакво. Затова тук се БРОИ, вместо да се разчита на дисциплина.
 *
 * Тестът чете ИЗВОРА на екрана, а не типовете: типовете се изтриват при
 * компилация, а масивът трябва да се провери такъв, какъвто е написан. Същият
 * похват като `sabitiyata.test.ts`.
 */
describe('всяка възможност има ОТМЕТКА на Таблото', () => {
  const TABLO = readFileSync('app/tablo.ts', 'utf8');

  /** Ключовете от `RED` — извадени от самия извор. */
  function vRedaNaTabloto(): string[] {
    const nachalo = TABLO.indexOf('const RED: readonly Vazmozhnost[] = [');
    expect(nachalo, 'RED трябва да съществува').toBeGreaterThan(-1);
    const blok = TABLO.slice(nachalo, TABLO.indexOf('];', nachalo));
    return [...blok.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  }

  it('НИТО ЕДНА възможност не остава без отметка', () => {
    const vRed = new Set(vRedaNaTabloto());
    const bezOtmetka = Object.keys(OPISANIE).filter((v) => !vRed.has(v));
    expect(bezOtmetka).toEqual([]);
  });

  it('и обратното · няма отметка за несъществуваща възможност', () => {
    const vsichki = new Set(Object.keys(OPISANIE));
    const izmisleni = vRedaNaTabloto().filter((v) => !vsichki.has(v));
    expect(izmisleni).toEqual([]);
  });

  it('сверка вход↔изход · и разликата се КАЗВА, дори когато е нула', () => {
    // Броят е ДВОЙКА, не единично число: две еднакви бройки с различни
    // множества щяха да минат, ако се сравняваха само числата.
    const vRed = vRedaNaTabloto();
    expect(vRed.length).toBe(Object.keys(OPISANIE).length);
    expect([...vRed].sort()).toEqual(Object.keys(OPISANIE).sort());
  });
});

describe('пинът · броят се твърди с ръка (резен 46 · група В)', () => {
  it('описанията са ЧЕТИРИНАЙСЕТ · по едно на всяка възможност', () => {
    expect(Object.keys(OPISANIE)).toHaveLength(14);
  });
});
