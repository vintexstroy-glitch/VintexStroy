/**
 * ПОДТАБОВЕТЕ НА СМЕТКИ · петте, и картата коя секция къде (резен 115 · ADR-161).
 *
 * Тестът пази ТРИ неща: имената и редът са неговите (И136); всяка секция има
 * ЕДИН подтаб и нито един подтаб не е празен; и непознатата секция не изчезва,
 * а пада в главния (правило 15).
 */

import { describe, expect, it } from 'vitest';
import {
  PARVIYAT_PODTAB,
  PODTABOVE_NA_SMETKI,
  ePodtabNaSmetki,
  klyuchNaPametta,
  podredeniPoPodtab,
  podtabatNaSmetki,
  sektsiiteNaPodtab,
  sektsiiteNaSmetki,
} from '../src/domein/podtabove-smetki.js';

describe('петте подтаба · неговият ред и неговите думи', () => {
  it('са главния Сметки и четирите: Приход · Разход · Отчет · Баланс', () => {
    expect(PODTABOVE_NA_SMETKI.map((p) => p.ime)).toEqual([
      'Сметки',
      'Приход',
      'Разход',
      'Отчет',
      'Баланс',
    ]);
  });

  it('екранът се отваря на главния', () => {
    expect(PARVIYAT_PODTAB).toBe('smetki');
    expect(PODTABOVE_NA_SMETKI[0]!.klyuch).toBe(PARVIYAT_PODTAB);
  });

  it('всеки носи описа си · лента с голи думи не казва какво има вътре', () => {
    expect(PODTABOVE_NA_SMETKI.every((p) => p.opis.length > 10)).toBe(true);
  });

  it('познава своите ключове и отказва чуждите', () => {
    expect(ePodtabNaSmetki('balans')).toBe(true);
    expect(ePodtabNaSmetki('smetki')).toBe(true);
    expect(ePodtabNaSmetki('hora')).toBe(false);
  });
});

describe('картата · всяка секция при своя подтаб', () => {
  it('нито един подтаб не е празен · празен таб обещава нещо, което го няма', () => {
    for (const p of PODTABOVE_NA_SMETKI) {
      expect(sektsiiteNaPodtab(p.klyuch).length).toBeGreaterThan(0);
    }
  });

  it('сверка вход↔изход · сборът на петте е точно картираните секции', () => {
    const vhod = sektsiiteNaSmetki().length;
    const izhod = PODTABOVE_NA_SMETKI.reduce((s, p) => s + sektsiiteNaPodtab(p.klyuch).length, 0);
    expect(izhod - vhod).toBe(0);
  });

  it('Балансът носи потоците, ДДС и счетоводството · И136 и ADR-106', () => {
    const negovite = sektsiiteNaPodtab('balans');
    for (const s of ['smetki-smetki', 'smetki-dds', 'smetki-sverka', 'nap-spravki']) {
      expect(negovite).toContain(s);
    }
  });

  it('делата, таблицата и диаграмата стоят в ГЛАВНИЯ · те са работата', () => {
    for (const s of ['smetki-dela', 'smetki-dela-tablitsa', 'smetki-dela-diagrama', 'smetki-razbivki']) {
      expect(podtabatNaSmetki(s)).toBe('smetki');
    }
  });

  it('разходът събира заплатите, кредитите и калкулатора', () => {
    for (const s of ['smetki-razhodi', 'zaplati', 'krediti', 'kredit-kalkulator', 'smetki-kalkulator']) {
      expect(podtabatNaSmetki(s)).toBe('razhod');
    }
  });

  it('отчетът събира петте на коефициентите и гнездата', () => {
    for (const s of ['koef-izbor', 'koef-vsichki', 'smetki-otcheti', 'otchet-dyal']) {
      expect(podtabatNaSmetki(s)).toBe('otchet');
    }
  });

  it('непознатата секция пада в главния, вместо да изчезне (правило 15)', () => {
    expect(podtabatNaSmetki('нещо-което-още-не-е-построено')).toBe('smetki');
  });
});

describe('паметта на падащия ред · по подтаб, не обща (ADR-161)', () => {
  it('всеки подтаб има СВОЙ ключ и никой не е общият', () => {
    const klyuchove = PODTABOVE_NA_SMETKI.map((p) => klyuchNaPametta(p.klyuch));
    // ПЕТ, с ръка: числото, сверено със самата константа, не е пин (честност, обход В).
    expect(new Set(klyuchove).size).toBe(5);
    expect(klyuchove).not.toContain('sektsii.smetki');
    expect(klyuchNaPametta('balans')).toBe('sektsii.smetki.balans');
  });

  it('редът е петте списъка в реда на лентата · сверка вход↔изход', () => {
    const pamet: Record<string, readonly string[]> = {
      balans: ['smetki-dds', 'smetki-sverka'],
      smetki: ['smetki-salda'],
      razhod: ['zaplati', 'krediti', 'smetki-razhodi'],
    };
    const grupi = podredeniPoPodtab((p) => pamet[p] ?? []);
    expect(grupi.map((g) => g.podtab)).toEqual(['smetki', 'razhod', 'balans']);
    expect(grupi.map((g) => g.ime)).toEqual(['Сметки', 'Разход', 'Баланс']);
    const vhod = Object.values(pamet).reduce((s, x) => s + x.length, 0);
    const izhod = grupi.reduce((s, g) => s + g.sektsii.length, 0);
    expect(izhod - vhod).toBe(0);
  });

  it('празният подтаб не ражда глава без нищо под нея (правило 15)', () => {
    expect(podredeniPoPodtab(() => [])).toEqual([]);
  });
});
