/**
 * ПЛАНОВЕТЕ · двата слоя, стълбата и отметките.
 *
 * Таблицата в `planove.ts` е ЗАКОН, а не описание. Тези тестове я пазят от
 * трите начина, по които такава таблица тихо се разваля:
 *
 *   1. по-голям план губи нещо от по-малкия (клиентът плаща и получава по-малко);
 *   2. Стандартният престава да носи ЦЯЛАТА функционалност и нагоре почват да
 *      се добавят ФУНКЦИИ вместо КАПАЦИТЕТ — точно грешката, която ADR-003
 *      направи и ADR-004 поправя;
 *   3. отметка почва да се бърка с право — изключеното става неразличимо от
 *      липсващото.
 */

import { describe, expect, it } from 'vitest';
import {
  eIzklyuchena,
  izborPoPodrazbirane,
  mozhe,
  OPISANIE,
  OSHTE_NE_E_ZAPOCHNATO,
  plan,
  PLAN_PO_PODRAZBIRANE,
  PLANOVE,
  prevklyuchi,
  smeniPlan,
  stigaLiHranilishteto,
  ZADALZHITELNI,
  type Vazmozhnost,
} from '../src/domein/planove.js';

describe('стълбата на плановете', () => {
  it('всеки по-голям план носи всичко от по-малкия', () => {
    for (let i = 1; i < PLANOVE.length; i += 1) {
      const malak = PLANOVE[i - 1]!;
      const golyam = PLANOVE[i]!;
      for (const v of malak.vazmozhnosti) {
        expect(golyam.vazmozhnosti.has(v), `${golyam.ime} губи „${v}" спрямо ${malak.ime}`).toBe(
          true,
        );
      }
    }
  });

  it('Стандартният Е стартъпът и носи ЦЯЛАТА функционалност', () => {
    const startap = plan(PLAN_PO_PODRAZBIRANE);
    expect(startap.klyuch).toBe('standarten');
    expect(startap.iskaPlatenOblak).toBe(false);

    // Нагоре се добавя само КАПАЦИТЕТ и поръчкова работа — нищо друго.
    const kapatsitet: readonly Vazmozhnost[] = ['poveche-hranilishte', 'individualni-razrabotki'];
    for (const p of PLANOVE) {
      for (const v of p.vazmozhnosti) {
        if (kapatsitet.includes(v)) continue;
        expect(startap.vazmozhnosti.has(v), `Стандартният няма „${v}", а ${p.ime} я има`).toBe(true);
      }
    }
  });

  it('Личният е САМО един акаунт: без други имейли, без роли, без колонно право', () => {
    const lichen = plan('lichen');
    for (const v of ['drugi-imeyli', 'roli-za-dostap', 'kolonno-pravo'] as const) {
      expect(lichen.vazmozhnosti.has(v), `Личният не бива да носи „${v}"`).toBe(false);
    }
    // Но работата на самия човек е цяла — нищо от двигателя не му е взето.
    for (const v of ['zapis', 'smetki-dds', 'iztochnitsi', 'arhiv-eksel', 'fini-filtri'] as const) {
      expect(lichen.vazmozhnosti.has(v)).toBe(true);
    }
  });

  it('платеният облак се иска само отгоре, и хранилището се проверява', () => {
    expect(plan('lichen').iskaPlatenOblak).toBe(false);
    expect(plan('standarten').iskaPlatenOblak).toBe(false);
    expect(plan('razshiren').iskaPlatenOblak).toBe(true);
    expect(plan('holding').iskaPlatenOblak).toBe(true);

    expect(stigaLiHranilishteto(plan('standarten'), 'безплатно')).toBe(true);
    expect(stigaLiHranilishteto(plan('razshiren'), 'безплатно')).toBe(false);
    expect(stigaLiHranilishteto(plan('razshiren'), 'платено')).toBe(true);
  });

  it('непознат план пада към стартъпа, не към празно', () => {
    expect(plan('няма такъв').klyuch).toBe('standarten');
    expect(plan(undefined).klyuch).toBe('standarten');
    expect(plan('').klyuch).toBe('standarten');
  });

  it('всяка възможност си има изречение за таблото', () => {
    for (const p of PLANOVE) {
      for (const v of p.vazmozhnosti) {
        expect(OPISANIE[v], `„${v}" е без описание`).toBeTruthy();
      }
    }
  });
});

describe('отметките · вторият слой', () => {
  it('нов избор включва всичко, което планът позволява', () => {
    const izbor = izborPoPodrazbirane('standarten');
    for (const v of izbor.plan.vazmozhnosti) expect(mozhe(izbor, v)).toBe(true);
  });

  it('изключеното НЕ е същото като липсващото', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('standarten'), 'arhiv-eksel', false);

    expect(mozhe(izbor, 'arhiv-eksel')).toBe(false);
    expect(eIzklyuchena(izbor, 'arhiv-eksel')).toBe(true); // планът я дава, аз я скрих

    const lichen = izborPoPodrazbirane('lichen');
    expect(mozhe(lichen, 'roli-za-dostap')).toBe(false);
    expect(eIzklyuchena(lichen, 'roli-za-dostap')).toBe(false); // планът изобщо я няма
  });

  it('задължителната отметка не се маха', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('standarten'), 'zapis', false);
    expect(mozhe(izbor, 'zapis')).toBe(true);
    for (const v of ZADALZHITELNI) expect(mozhe(izbor, v)).toBe(true);
  });

  it('отметка за нещо, което планът не дава, не се пали', () => {
    const izbor = prevklyuchi(izborPoPodrazbirane('lichen'), 'drugi-imeyli', true);
    expect(mozhe(izbor, 'drugi-imeyli')).toBe(false);
  });

  it('смяна на плана пази отметките, а новото идва включено', () => {
    const bez = prevklyuchi(izborPoPodrazbirane('lichen'), 'arhiv-eksel', false);
    const golyam = smeniPlan(bez, 'holding');

    expect(mozhe(golyam, 'arhiv-eksel')).toBe(false); // изборът му се уважава
    expect(mozhe(golyam, 'drugi-imeyli')).toBe(true); // новото не се крие
    expect(mozhe(golyam, 'individualni-razrabotki')).toBe(true);

    // Надолу: каквото новият план не носи, изчезва — без да гърми.
    const nadolu = smeniPlan(golyam, 'lichen');
    expect(mozhe(nadolu, 'drugi-imeyli')).toBe(false);
    expect(mozhe(nadolu, 'zapis')).toBe(true);
  });

  it('ИИ е обявен, но не построен — и таблото трябва да го знае', () => {
    expect(OSHTE_NE_E_ZAPOCHNATO.has('svarzhi-ii')).toBe(true);
    // Стандартният го ПОЗВОЛЯВА; етикетът „скоро" идва от списъка, не от плана.
    expect(plan('standarten').vazmozhnosti.has('svarzhi-ii')).toBe(true);
  });
});
