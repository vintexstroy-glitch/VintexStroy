/**
 * ИНВАРИАНТ 3 · СВЕРКА ВХОД↔ИЗХОД
 * Разликата се записва ДОРИ КОГАТО Е НУЛА — това е тестът, чиято липса скри 24,2%.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikNaSverki,
  DnevnikVPametta,
  GreshkaSverka,
  sverka,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { operatsiya } from './pomoshtni.js';

const KOGATO = '2026-08-22T09:00:00.000Z';

describe('инвариант 3 · сверка вход↔изход', () => {
  it('нулевата разлика СЕ ЗАПИСВА, не се премълчава', () => {
    const dnevnik = new DnevnikNaSverki();
    dnevnik.zapishi(sverka('migratsiya Naemi KESH', 4050, 4050, KOGATO));

    expect(dnevnik.vsichki).toHaveLength(1);
    expect(dnevnik.vsichki[0]!.razlika).toBe(0);
    expect(dnevnik.vsichki[0]!.nared).toBe(true);
    expect(dnevnik.nezatvoreni).toHaveLength(0);
  });

  it('загубата се вижда със знак и точно число', () => {
    const s = sverka('preszyavane na izvora v1', 475_302, 360_236, KOGATO);
    expect(s.razlika).toBe(-115_066);
    expect(s.nared).toBe(false);
  });

  it('zapishiIliPadni хвърля при незатваряне, но пак записва реда', () => {
    const dnevnik = new DnevnikNaSverki();

    expect(() =>
      dnevnik.zapishiIliPadni(sverka('iznos kam Sheets', 100, 98, KOGATO)),
    ).toThrow(GreshkaSverka);

    expect(dnevnik.vsichki).toHaveLength(1);
    expect(dnevnik.nezatvoreni).toHaveLength(1);
  });

  it('пренос през Вратата затваря: колкото подадени, толкова записани', async () => {
    const zhurnal = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik: zhurnal, pravata: new VsichkoRazresheno() });
    const sverki = new DnevnikNaSverki();

    const vhod = 250;
    for (let i = 1; i <= vhod; i += 1) {
      await vrata.dobavi(operatsiya({ opId: `mig-${i}`, payload: { suma_st: i * 100 } }));
    }
    const izhod = (await zhurnal.chetiVsichki('vintexstroy')).length;

    const rezultat = sverki.zapishiIliPadni(sverka('migratsiya', vhod, izhod, KOGATO));
    expect(rezultat.razlika).toBe(0);
    expect(sverki.vsichki).toHaveLength(1);
  });

  it('сверката хваща тихата загуба от повторени opId', async () => {
    const zhurnal = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik: zhurnal, pravata: new VsichkoRazresheno() });
    const sverki = new DnevnikNaSverki();

    // 100 реда на входа, но 10 от тях носят вече ползван opId — тихо не влизат.
    const vhod = 100;
    for (let i = 1; i <= vhod; i += 1) {
      const nomer = i <= 90 ? i : i - 90;
      await vrata.dobavi(operatsiya({ opId: `mig-${nomer}` }));
    }
    const izhod = (await zhurnal.chetiVsichki('vintexstroy')).length;

    expect(() => sverki.zapishiIliPadni(sverka('migratsiya', vhod, izhod, KOGATO))).toThrow(
      GreshkaSverka,
    );
    expect(sverki.nezatvoreni[0]!.razlika).toBe(-10);
  });
});
