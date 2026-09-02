/**
 * ГЕЙТЪТ НА ОГЛЕДАЛАТА · изключеното се КАЗВА (резен 93 · И128 · ADR-151).
 *
 * Негова дума, 02.09: „оправи ог;еда;ата и гейта".
 *
 * ═══ КАКВО ТОЧНО БЕШЕ СЧУПЕНО ═══
 *
 * Възможността `ogledala` стоеше в таблицата на плановете и имаше своя отметка
 * в Таблото. Двата изгледа обаче — „По обект" и „По контрагент" — не питаха
 * НИКОГО: рисуваха се винаги. Тоест човекът сваляше отметката и НИЩО не се
 * случваше. Отметката беше надпис.
 *
 * Правило 15: „Изключено ≠ липсващо. `mozhe()` пита ДВЕ неща: планът позволява
 * ли, и отметката включена ли е. Двете не се сливат."
 *
 * ═══ ЗАЩО ДВЕ РАЗЛИЧНИ ДУМИ, А НЕ ЕДНА ═══
 *
 * Слети в един текст, двете състояния карат човека да се чуди дали не му искат
 * пари за нещо, което сам е изключил. Затова тук се проверява, че текстовете са
 * РАЗЛИЧНИ и че всеки води на своето място: изключената се връща от Таблото,
 * липсващата иска друг план.
 */

import { describe, expect, it } from 'vitest';
import { izborPoPodrazbirane, prevklyuchi, type Izbor } from '../src/domein/planove.js';
import { sVazmozhnostta } from '../app/vazmozhnostta.js';

const OTKAZAT = {
  sektsiya: 'po-imot',
  zaglavie: 'По обект',
  zashto: 'Изгледът показва кой обект колко носи.',
};

const BLOK = '<div class="tablitsa" data-tablitsa="po-imot">редовете</div>';

/** Планът я дава и отметката е вдигната — стартовото състояние. */
function svklyuchena(): Izbor {
  return izborPoPodrazbirane('profesionalen');
}

/** Планът я дава, но отметката е СВАЛЕНА — решение на човека. */
function sIzklyuchena(): Izbor {
  return prevklyuchi(svklyuchena(), 'ogledala', false);
}

describe('възможността е включена', () => {
  it('блокът се рисува · и се ВИКА (изчислява се само тогава)', () => {
    let vikan = 0;
    const izlyaz = sVazmozhnostta(svklyuchena(), 'ogledala', OTKAZAT, () => {
      vikan += 1;
      return BLOK;
    });
    expect(izlyaz).toBe(BLOK);
    expect(vikan).toBe(1);
  });
});

describe('възможността е ИЗКЛЮЧЕНА от Таблото', () => {
  it('блокът НЕ се вика · изключеното не струва', () => {
    let vikan = 0;
    sVazmozhnostta(sIzklyuchena(), 'ogledala', OTKAZAT, () => {
      vikan += 1;
      return BLOK;
    });
    expect(vikan).toBe(0);
  });

  it('на мястото му стои секция, която КАЗВА защо го няма', () => {
    const izlyaz = sVazmozhnostta(sIzklyuchena(), 'ogledala', OTKAZAT, () => BLOK);
    expect(izlyaz).not.toContain('data-tablitsa="po-imot"');
    expect(izlyaz).toContain('data-sektsiya="po-imot"');
    expect(izlyaz).toContain('data-bez="ogledala"');
    expect(izlyaz).toContain('По обект');
    expect(izlyaz).toContain('изключена от Таблото');
  });

  it('думите сочат ТАБЛОТО · човекът си я връща сам', () => {
    const izlyaz = sVazmozhnostta(sIzklyuchena(), 'ogledala', OTKAZAT, () => BLOK);
    expect(izlyaz).toContain('Таблото');
    expect(izlyaz).not.toContain('няма я в този план');
  });
});

describe('двете състояния НЕ се сливат (правило 15)', () => {
  it('изключената и липсващата се изписват РАЗЛИЧНО', () => {
    // Липсваща се прави с празен план: нито една възможност не е позволена.
    const bezPlan: Izbor = {
      plan: { ...svklyuchena().plan, vazmozhnosti: new Set() },
      vklyucheni: new Set(),
    };
    const izklyuchena = sVazmozhnostta(sIzklyuchena(), 'ogledala', OTKAZAT, () => BLOK);
    const lipsvashta = sVazmozhnostta(bezPlan, 'ogledala', OTKAZAT, () => BLOK);

    expect(izklyuchena).not.toBe(lipsvashta);
    expect(lipsvashta).toContain('няма я в този план');
    expect(lipsvashta).toContain('иска се друг план');
    expect(lipsvashta).not.toContain('изключена от Таблото');
  });
});

describe('отказът не пропуска чужд текст в екрана', () => {
  it('думите на отказа се екранират', () => {
    const izlyaz = sVazmozhnostta(
      sIzklyuchena(),
      'ogledala',
      { sektsiya: 'x', zaglavie: '<b>у</b>', zashto: 'а & б' },
      () => BLOK,
    );
    expect(izlyaz).toContain('&lt;b&gt;у&lt;/b&gt;');
    expect(izlyaz).toContain('а &amp; б');
  });
});
