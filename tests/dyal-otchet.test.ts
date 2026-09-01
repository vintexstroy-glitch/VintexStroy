/**
 * ДЯЛЪТ „ОТЧЕТ" (резен 74 · И124 т.12).
 *
 * „Тук събери секцията Сметки наречена Сметки Прогноза с Отчет, Отчет са
 *  цялата работа с коефициентите и диаграмите, таблиците за тях."
 *
 * Трите обещания:
 *
 *   1. Съставът е ШЕСТ секции, редът закован · брои се, не се преглежда.
 *   2. Готовите периоди се СМЯТАТ от днес · закованият остарява с календара.
 *   3. Чакащото по отчета стои ПОИМЕННО · пропуск, който не се брои, се губи.
 */

import { describe, expect, it } from 'vitest';
import {
  CHAKA_PO_OTCHETA,
  gotovitePeriodi,
  SEKTSIITE_NA_OTCHETA,
} from '../src/domein/dyal-otchet.js';

describe('1 · съставът на дяла', () => {
  it('е ШЕСТ секции, и точно тези · Прогнозата първа', () => {
    expect(SEKTSIITE_NA_OTCHETA).toHaveLength(6);
    expect([...SEKTSIITE_NA_OTCHETA]).toEqual([
      'smetki-otcheti',
      'koef-sastoyanie',
      'koef-svoy',
      'koef-izbor',
      'koef-izbraniyat',
      'koef-vsichki',
    ]);
  });
});

describe('2 · готовите периоди се смятат от днес', () => {
  it('три са · дванайсетте месеца, тази година и миналата', () => {
    const g = gotovitePeriodi('2026-09-01');
    expect(g).toHaveLength(3);
    expect(g.map((x) => x.klyuch)).toEqual(['dvanayset', 'tazi', 'minalata']);

    expect(g[0]).toEqual({
      klyuch: 'dvanayset',
      ime: 'последните 12 месеца',
      ot: '2025-09-01',
      do: '2026-09-01',
    });
    expect(g[1]).toEqual({ klyuch: 'tazi', ime: 'тази година', ot: '2026-01-01', do: '2026-09-01' });
    expect(g[2]).toEqual({
      klyuch: 'minalata',
      ime: 'миналата година',
      ot: '2025-01-01',
      do: '2025-12-31',
    });
  });

  it('и се МЕСТЯТ с календара · друга дата дава други граници', () => {
    const g = gotovitePeriodi('2031-02-14');
    expect(g[0]!.ot).toBe('2030-02-01');
    expect(g[2]!.do).toBe('2030-12-31');
  });
});

describe('3 · чакащото по отчета · поименно', () => {
  it('е ДВЕ · екселът с библиотеката и симулацията', () => {
    expect(CHAKA_PO_OTCHETA).toHaveLength(2);
    expect(CHAKA_PO_OTCHETA[0]).toContain('ексел');
    expect(CHAKA_PO_OTCHETA[0]).toContain('р57·[170]');
    expect(CHAKA_PO_OTCHETA[1]).toContain('симулация');
  });
});
