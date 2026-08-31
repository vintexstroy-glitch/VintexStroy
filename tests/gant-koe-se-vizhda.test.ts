/**
 * КОЕ СЕ ВИЖДА · таблицата и диаграмата на Ганта (резен 52).
 *
 * Негово, 31.08: „Да и на двете места. Да може да се крие."
 */
import { describe, expect, it } from 'vitest';
import {
  dumataNaButona,
  mozheDaSeSkrie,
  prevkluchi,
  type KoeSeVizhda,
} from '../src/domein/gant.js';

const DVETE: KoeSeVizhda = { tablitsa: true, diagrama: true };

describe('кое се вижда · скриването е избор, не решение на кода', () => {
  it('от двете видими се скрива всяко от тях', () => {
    expect(prevkluchi(DVETE, 'tablitsa').sled).toEqual({ tablitsa: false, diagrama: true });
    expect(prevkluchi(DVETE, 'diagrama').sled).toEqual({ tablitsa: true, diagrama: false });
  });

  it('и скритото се връща', () => {
    const samoDiagrama = prevkluchi(DVETE, 'tablitsa').sled;
    expect(prevkluchi(samoDiagrama, 'tablitsa').sled).toEqual(DVETE);
  });

  // ПОСЛЕДНИЯТ ИЗГЛЕД НЕ СЕ СКРИВА · иначе секцията остава празна и човекът
  // вижда изчезнала работа, а не скрит изглед.
  it('последният видим не се скрива · и отказът се КАЗВА', () => {
    const samoTablitsa: KoeSeVizhda = { tablitsa: true, diagrama: false };
    const r = prevkluchi(samoTablitsa, 'tablitsa');
    expect(r.sled).toEqual(samoTablitsa);
    expect(r.otkaz).toContain('празна');
  });

  it('същото важи и когато последната е диаграмата · няма привилегирован изглед', () => {
    const samoDiagrama: KoeSeVizhda = { tablitsa: false, diagrama: true };
    expect(prevkluchi(samoDiagrama, 'diagrama').otkaz).not.toBe('');
  });

  it('а показването НИКОГА не се отказва', () => {
    for (const koe of ['tablitsa', 'diagrama'] as const) {
      expect(prevkluchi({ tablitsa: false, diagrama: false }, koe).otkaz).toBe('');
    }
  });

  it('„може ли" отговаря същото като самото превключване', () => {
    const sluchai: KoeSeVizhda[] = [
      DVETE,
      { tablitsa: true, diagrama: false },
      { tablitsa: false, diagrama: true },
    ];
    for (const s of sluchai) {
      for (const koe of ['tablitsa', 'diagrama'] as const) {
        expect(mozheDaSeSkrie(s, koe)).toBe(prevkluchi(s, koe).otkaz === '');
      }
    }
  });

  it('думата на бутона казва какво ще СТАНЕ, не какво е сега', () => {
    expect(dumataNaButona(DVETE, 'tablitsa')).toBe('Скрий таблицата');
    expect(dumataNaButona({ tablitsa: false, diagrama: true }, 'tablitsa')).toBe(
      'Покажи таблицата',
    );
  });
});
