/**
 * ВИДЪТ И ЧАСЪТ НА АНГАЖИМЕНТА (резен 68 · И124 т.1 · т.8).
 *
 * „А час има само не дело а еквивалент на среща, доставка или по избор
 * някаква бележка която да квараш, дори напомняне." И менюто: „за другите
 * показваш най използваните и последните."
 */

import { describe, expect, it } from 'vitest';
import {
  predlozheniVidove,
  proveriSreshtata,
  VIDOVE_ANGAZHIMENT,
} from '../src/domein/kontakti.ts';

const zapis = (vid: string, kogato: string) => ({ vid, kogato });

describe('видовете ангажимент · отворената номенклатура', () => {
  it('началните са ЧЕТИРИ · среща, доставка, бележка, напомняне', () => {
    expect([...VIDOVE_ANGAZHIMENT]).toEqual(['среща', 'доставка', 'бележка', 'напомняне']);
  });

  it('началните стоят ВИНАГИ, и без нито един запис', () => {
    expect(predlozheniVidove([])).toEqual([...VIDOVE_ANGAZHIMENT]);
  });

  it('вкараното от Стопанина се нарежда по УПОТРЕБА · най-използваното напред', () => {
    const predlozheni = predlozheniVidove([
      zapis('оглед', '2026-08-01'),
      zapis('сервиз', '2026-08-02'),
      zapis('оглед', '2026-08-03'),
    ]);
    expect(predlozheni.slice(4)).toEqual(['оглед', 'сервиз']);
  });

  it('при равна употреба ПО-СКОРОШНИЯТ е пръв · „и последните"', () => {
    const predlozheni = predlozheniVidove([
      zapis('стар', '2026-07-01'),
      zapis('нов', '2026-08-30'),
    ]);
    expect(predlozheni.slice(4)).toEqual(['нов', 'стар']);
  });

  it('началният вид не се дублира, колкото и да се ползва', () => {
    expect(predlozheniVidove([zapis('среща', '2026-08-01')])).toEqual([...VIDOVE_ANGAZHIMENT]);
  });
});

describe('проверката на ангажимента · видът непразен, часът по образеца', () => {
  it('празният вид пада НАРОЧНО и казва началните', () => {
    expect(() => proveriSreshtata('Иван', '2026-09-10', 'чака', '  ')).toThrowError(/среща · доставка/);
  });

  it('свой вид минава · номенклатурата е отворена („друго вкарано по избор")', () => {
    expect(() => proveriSreshtata('Иван', '2026-09-10', 'чака', 'оглед')).not.toThrow();
  });

  it('часът с крив формат пада с думи', () => {
    expect(() => proveriSreshtata('Иван', '2026-09-10', 'чака', 'среща', '25:99')).toThrowError(/Нечетим час/);
  });

  it('празният час е нормален случай · „само дата"', () => {
    expect(() => proveriSreshtata('Иван', '2026-09-10', 'чака', 'среща', '')).not.toThrow();
  });

  it('час 14:30 минава', () => {
    expect(() => proveriSreshtata('Иван', '2026-09-10', 'чака', 'доставка', '14:30')).not.toThrow();
  });
});
