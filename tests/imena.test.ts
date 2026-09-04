/**
 * ИМЕНАТА · латиница и кирилица не се смесват в една дума.
 *
 * Правилото е в CLAUDE.md: имената в домейна са на латиница с българските думи
 * от документите. Но „о" на кирилица изглежда точно като „o" на латиница —
 * и дума, слепена от двете азбуки, минава за име, докато не се счупи нещо.
 *
 * Този тест е кръвно платен: същата грешка стана три пъти в този проект,
 * а при първото пускане намери и четвърта, която стоеше в кода от седмици.
 * Затова я лови машина, не око.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// И `stroezh` (резен 100): обходът на честността носеше име, слепено от
// двете азбуки (латинско ch плюс кирилско ети), а никой не го четеше —
// правило 11 имаше дупка точно в машината, която брои честността.
const PAPKI = ['src', 'app', 'tests', 'proba', 'stroezh'];
const NASTAVKI = ['.ts', '.mjs', '.js'];

function faylove(papka: string): string[] {
  const izhod: string[] = [];
  for (const ime of readdirSync(papka)) {
    const paty = join(papka, ime);
    if (statSync(paty).isDirectory()) izhod.push(...faylove(paty));
    else if (NASTAVKI.some((n) => ime.endsWith(n))) izhod.push(paty);
  }
  return izhod;
}

/** Дума, слепена от букви на двете азбуки. */
const DUMA = /[A-Za-z0-9_$Ѐ-ӿ]+/g;
const LATINITSA = /[A-Za-z]/;
const KIRILITSA = /[Ѐ-ӿ]/;

describe('нито едно смесено име', () => {
  it('в целия код', () => {
    const nahodki: string[] = [];

    for (const paty of PAPKI.flatMap(faylove)) {
      const redove = readFileSync(paty, 'utf8').split('\n');
      for (const [i, red] of redove.entries()) {
        // `\n` пред българска дума не е смесено име — маха се преди четенето.
        for (const duma of red.replace(/\\./g, ' ').match(DUMA) ?? []) {
          if (LATINITSA.test(duma) && KIRILITSA.test(duma)) {
            nahodki.push(`${paty}:${i + 1} · „${duma}"`);
          }
        }
      }
    }

    expect(nahodki).toEqual([]);
  });
});
