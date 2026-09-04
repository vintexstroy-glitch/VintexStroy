/**
 * ДУМИТЕ НА СУРОВИНАТА · Имот · Обект · Дело · Среща (резен 96 · ADR-155).
 *
 * И131 т.2 (02.09), дословно: „Има едно ниво създаване на Имот… Обектите са
 * само към Имот, но има Имот без Обект. Делата са за Имот и за Обект." И по-рано
 * същия ден: „едната суровина е Имот(Място)".
 *
 * Дотук кодът казваше „Място" за неговия Имот и „Имот" за неговия Обект. Тестът
 * пази ТРИ неща: думите с ръка, главата на Управление, и че „Място" не стои
 * пред човека никъде другаде освен в чуждите си смисли — поименно.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUMITE, IMOT_I_OBEKT } from '../src/domein/dumite.js';
import { NADPISI_SLUZHEBNI, glavataNaDelata } from '../app/gant.js';

describe('думите · един дом', () => {
  it('четирите думи са НЕГОВИТЕ · с ръка, не изведени', () => {
    expect(DUMITE).toEqual({ imot: 'Имот', obekt: 'Обект', delo: 'Дело', sreshta: 'Среща' });
    expect(IMOT_I_OBEKT).toBe('Имот · Обект');
  });

  it('главата на Управление казва Имот, не Място', () => {
    expect(glavataNaDelata()).toBe('Имот · Дело · Обект · Отговорник');
    expect(NADPISI_SLUZHEBNI.glavaNaImenata).toBe(glavataNaDelata());
  });
});

/**
 * ОБХОДЪТ · „Място" пред човека.
 *
 * Чете `app/` и `src/`, ред по ред, БЕЗ коментарите: надписите и съобщенията
 * живеят в низове, а коментарът може да разказва история с думата в нея.
 * Чуждите смисли са ИЗБРОЕНИ, не подразбрани — изключение, което се казва, е
 * решение (правило 15).
 */
const CHUZHDI_SMISLI: readonly string[] = [
  'Място в твоя драйв', // папката в Google Drive (И99)
  'Мястото стига', // мястото в хранилището на браузъра (спирачката)
  'Мястото НЕ стига',
  'Мястото на счетоводството', // заглавие на справката · къде живее счетоводството
  'МястоЗаписано', // името на СЪБИТИЕТО · Журналът е само за добавяне (правило 1)
];

function faylovete(koren: string): string[] {
  const izhod: string[] = [];
  for (const ime of readdirSync(koren)) {
    const pat = join(koren, ime);
    if (statSync(pat).isDirectory()) izhod.push(...faylovete(pat));
    else if (ime.endsWith('.ts')) izhod.push(pat);
  }
  return izhod;
}

const DUMATA = /(^|[^А-Яа-я])(Място|Мястото|Местата)(?=$|[^А-Яа-я])/;

describe('„Място" пред човека · никъде, освен в чуждите смисли', () => {
  it('в app/ и src/ · без коментарите', () => {
    const koren = join(import.meta.dirname, '..');
    const nahodki: string[] = [];
    for (const f of [...faylovete(join(koren, 'app')), ...faylovete(join(koren, 'src'))]) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((red, i) => {
          const t = red.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
          if (!DUMATA.test(red)) return;
          if (CHUZHDI_SMISLI.some((s) => red.includes(s))) return;
          nahodki.push(`${f.slice(koren.length + 1)}:${i + 1} — ${t.slice(0, 90)}`);
        });
    }
    expect(nahodki, 'думата „Място" пред човека · неговият Имот').toEqual([]);
  });
});
