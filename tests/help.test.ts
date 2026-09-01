/**
 * ХЕЛПЪТ · планът на таба (резен 78б · И124 т.5 · ADR-136).
 *
 * Негово: „Цялата обяснителна информация се подрежда като план за таба и
 * ако нещо се добави в таба се включва в хелпа там."
 */

import { describe, expect, it } from 'vitest';
import { helpatEOtvoren, sglobiPlana } from '../app/help.ts';

describe('планът на таба · сглобяването', () => {
  it('реди секциите с заглавие, подзаглавие и обясненията им', () => {
    const html = sglobiPlana([
      { zaglavie: 'Салда', pod: 'трезорът на ръка', belezhki: ['Банката идва от извлечението.'] },
      { zaglavie: 'Баланс', pod: '', belezhki: [] },
    ]);
    expect(html).toContain('Салда');
    expect(html).toContain('трезорът на ръка');
    expect(html).toContain('Банката идва от извлечението.');
    expect(html).toContain('Баланс');
  });

  it('празният екран го КАЗВА · не показва празен панел (правило 15)', () => {
    expect(sglobiPlana([])).toContain('още не носи секции');
  });

  it('чуждият текст се екранира · планът е огледало, не втора врата', () => {
    const html = sglobiPlana([
      { zaglavie: '<script>лошо</script>', pod: '', belezhki: [] },
    ]);
    expect(html).not.toContain('<script>');
  });
});

describe('състоянието · скрит по подразбиране', () => {
  it('без памет хелпът е ПРИБРАН · не бута таблиците, докато не е поискан', () => {
    expect(helpatEOtvoren()).toBe(false);
  });
});
