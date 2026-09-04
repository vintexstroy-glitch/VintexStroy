/**
 * СВЕРКАТА НА ДДС · трите ъгъла и въпросът „къде е разликата".
 *
 * Дотук Сметки казваха КОЛКО се разминава. Тези тестове пазят новото: че
 * приложението казва и КЪДЕ — липсва фактура, или липсват пари.
 */

import { describe, expect, it } from 'vitest';
import { tsentove } from '../src/yadro/pari.js';
import { type Dvizhenie, sDumi, sveriDDS } from '../src/domein/sverka-dds.js';

const f = (dokument: string, suma: number, opisanie = ''): Dvizhenie => ({
  data: '2026-02-10',
  suma_st: tsentove(suma),
  dokument,
  opisanie,
});

describe('сверката на ДДС', () => {
  it('всичко се покрива → сверено, и разликата се записва като НУЛА', () => {
    // Правило 7: проверената нула е различна от нулата, за която никой не е питал.
    const r = sveriDDS({
      fakturi: [f('9871', 1200_00), f('9872', 300_00)],
      izvlecheniya: [f('9871', 1200_00), f('9872', 300_00)],
      dds_ot_fakturi_st: tsentove(250_00),
      dds_ot_izvlecheniya_st: tsentove(250_00),
      dds_vneseno_st: tsentove(250_00),
    });
    expect(r.svereno).toBe(true);
    expect(r.razlika_st).toBe(0);
    expect(r.ostava_st).toBe(0);
    expect(r.nesvarsheni).toEqual([]);
    expect(sDumi(r)).toContain('Сверено');
  });

  it('пари в банката БЕЗ фактура — точно случаят, който той описа', () => {
    const r = sveriDDS({
      fakturi: [f('9871', 1200_00)],
      izvlecheniya: [f('9871', 1200_00), f('9999', 500_00, 'непозната вноска')],
      dds_ot_fakturi_st: tsentove(200_00),
      dds_ot_izvlecheniya_st: tsentove(283_33),
      dds_vneseno_st: tsentove(200_00),
    });
    expect(r.svereno).toBe(false);
    expect(r.nesvarsheni).toHaveLength(1);
    expect(r.nesvarsheni[0]!.prichina).toBe('lipsva-faktura');
    expect(r.nesvarsheni[0]!.dvizhenie.dokument).toBe('9999');
    expect(sDumi(r)).toContain('БЕЗ фактура');
  });

  it('фактура БЕЗ движение — плащане в брой или неполучено', () => {
    const r = sveriDDS({
      fakturi: [f('9871', 1200_00), f('9880', 400_00, 'плащане в брой')],
      izvlecheniya: [f('9871', 1200_00)],
      dds_ot_fakturi_st: tsentove(266_67),
      dds_ot_izvlecheniya_st: tsentove(200_00),
      dds_vneseno_st: tsentove(266_67),
    });
    expect(r.nesvarsheni).toHaveLength(1);
    expect(r.nesvarsheni[0]!.prichina).toBe('lipsvat-pari');
    expect(sDumi(r)).toContain('БЕЗ движение');
  });

  it('движение без номер на документ НЕ се преглъща', () => {
    // Мълчаливо пропуснат ред е начинът, по който се губят пари.
    const r = sveriDDS({
      fakturi: [],
      izvlecheniya: [f('', 500_00, 'превод без основание')],
      dds_ot_fakturi_st: tsentove(0),
      dds_ot_izvlecheniya_st: tsentove(83_33),
      dds_vneseno_st: tsentove(0),
    });
    expect(r.nesvarsheni).toHaveLength(1);
    expect(r.nesvarsheni[0]!.prichina).toBe('lipsva-faktura');
  });

  it('сдвоява по документ, не по сума — две фактури за еднакво в един ден', () => {
    const r = sveriDDS({
      fakturi: [f('A-1', 1200_00), f('A-2', 1200_00)],
      izvlecheniya: [f('A-2', 1200_00), f('A-1', 1200_00)],
      dds_ot_fakturi_st: tsentove(400_00),
      dds_ot_izvlecheniya_st: tsentove(400_00),
      dds_vneseno_st: tsentove(400_00),
    });
    expect(r.svereno).toBe(true);
  });

  it('разстояния и регистър в номера не правят втори документ', () => {
    const r = sveriDDS({
      fakturi: [f(' a-1 ', 100_00)],
      izvlecheniya: [f('A-1', 100_00)],
      dds_ot_fakturi_st: tsentove(16_67),
      dds_ot_izvlecheniya_st: tsentove(16_67),
      dds_vneseno_st: tsentove(16_67),
    });
    expect(r.svereno).toBe(true);
  });

  it('остава за внасяне · когато е платено по-малко от дължимото', () => {
    const r = sveriDDS({
      fakturi: [f('9871', 1200_00)],
      izvlecheniya: [f('9871', 1200_00)],
      dds_ot_fakturi_st: tsentove(200_00),
      dds_ot_izvlecheniya_st: tsentove(200_00),
      dds_vneseno_st: tsentove(150_00),
    });
    expect(r.ostava_st).toBe(50_00);
    // Числата за движенията се покриват — липсата е само в ПЛАЩАНЕТО.
    expect(r.nesvarsheni).toEqual([]);
    expect(r.razlika_st).toBe(0);
  });

  it('надвнесено се вижда като отрицателно, не се крие', () => {
    const r = sveriDDS({
      fakturi: [f('9871', 1200_00)],
      izvlecheniya: [f('9871', 1200_00)],
      dds_ot_fakturi_st: tsentove(200_00),
      dds_ot_izvlecheniya_st: tsentove(200_00),
      dds_vneseno_st: tsentove(260_00),
    });
    expect(r.ostava_st).toBe(-60_00);
  });
});
