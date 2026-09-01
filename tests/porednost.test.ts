/**
 * РЪЧНИЯТ РЕД ПОБЕЖДАВА · колоната „поредност" (резен 34 · ADR-094).
 *
 * Негови думи:
 *
 *   „★ Ръчният ред побеждава (колона „поредност"; Състоянието е бутон
 *    „подреди")" *(ИЗВОР-2 · ред 1496)*
 *
 *   „да може от редактора да местиш РЕДОВЕТЕ, като задържаш на полето и го
 *    движиш, за да го преместиш, както е в MS Project" *(ред 1982 · 10.08)*
 *
 * Осемте обещания:
 *
 *   1. Ръчният ред ПОБЕЖДАВА сметнатата подредба · и то на всяко ниво.
 *   2. Дърво ПРЕДИ ръчен ред · дете не излиза пред родителя си.
 *   3. Новото дело пада НАЙ-ОТДОЛУ · не се вмъква на познато място.
 *   4. Празният ред връща ТОЧНО сметнатото · бутонът „Подреди".
 *   5. Записва се ЦЕЛИЯТ ред, не движението · и дубликат се отказва С ДУМИ.
 *   6. Преместването е чисто · и позиция извън списъка се отказва.
 *   7. Номерът се СМЯТА от реда · не се записва.
 *   8. Сверката брои редовете вход↔изход · и нулата се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { podredeniPoDarvo, podredi, podrediSRachen, type Delo } from '../src/domein/dela.js';
import {
  GreshkaPorednost,
  imaRachenRed,
  napraviRachniyaRed,
  nomeratNa,
  rachniyatRedOtZhurnala,
  sledPremestvane,
  sveriPodredbata,
} from '../src/domein/porednost.js';
import { SHA } from './pomoshtni.js';

const DNES = '2026-08-30';
const KOGATO = '2026-08-30T12:00:00.000Z';
const NAEMATEL = 'vintexstroy';

function delo(p: Partial<Delo> & { id: string }): Delo {
  return {
    seq: 1,
    myasto: 'Малинова',
    obekt: '',
    ime: p.id,
    otgovornik: 'Николай Петков',
    chas: '',
    ot: DNES,
    do: DNES,
    otsenka: 'нито-едно',
    sastoyanie: 'чака',
    nadDelo: '',
    dokument: '',
    promeneno: KOGATO,
    promeniGo: 'vintexstroy@gmail.com',
    ...p,
  };
}

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(`${DNES}T09:00:${String(tik++).padStart(2, '0')}.000Z`).toISOString(),
  });
  return { dnevnik, deystviya };
}

// ── 1 · РЪЧНИЯТ БИЕ СМЕТНАТОТО ────────────────────────────────────────────

describe('ръчният ред', () => {
  // Спешното е ПЪРВО по сметнатата подредба (тежест 0 срещу 3).
  const speshno = delo({ id: 'A', otsenka: 'спешно-важно' });
  const nishto = delo({ id: 'B', otsenka: 'нито-едно' });

  it('ПОБЕЖДАВА сметнатата подредба · и това е цялото правило', () => {
    expect(podredi([speshno, nishto], DNES).map((d) => d.id)).toEqual(['A', 'B']);
    // А с ръчен ред — обратното, и спешното стои ВТОРО, защото човек го е сложил там.
    expect(podrediSRachen([speshno, nishto], DNES, ['B', 'A']).map((d) => d.id)).toEqual([
      'B',
      'A',
    ]);
  });

  it('и празният ред връща ТОЧНО сметнатото · бутонът „Подреди"', () => {
    expect(podrediSRachen([speshno, nishto], DNES, []).map((d) => d.id)).toEqual(
      podredi([speshno, nishto], DNES).map((d) => d.id),
    );
    expect(imaRachenRed([])).toBe(false);
    expect(imaRachenRed(['A'])).toBe(true);
  });

  it('а дело БЕЗ ръчно място пада НАЙ-ОТДОЛУ · не се вмъква', () => {
    const novo = delo({ id: 'C', otsenka: 'спешно-важно' });
    // „C" гори повече от двете, но никой не е казал къде да стои.
    expect(podrediSRachen([speshno, nishto, novo], DNES, ['B', 'A']).map((d) => d.id)).toEqual([
      'B',
      'A',
      'C',
    ]);
  });
});

// ── 2 · ДЪРВОТО Е ПО-СИЛНО ────────────────────────────────────────────────

describe('дървото', () => {
  const roditel = delo({ id: 'R', ime: 'Родител' });
  const dete = delo({ id: 'D', ime: 'Дете', nadDelo: 'R' });
  const drug = delo({ id: 'X', ime: 'Друг' });

  // СМЕТНАТАТА подредба на ВЪРХОВОТО ниво · при равни тежест, срок и светофар
  // решава ИМЕТО: „Друг" преди „Родител". Записана тук, за да се вижда срещу
  // какво се мери ръчният ред.
  it('без ръчен ред подредбата е СМЕТНАТАТА · Друг преди Родител', () => {
    expect(podredeniPoDarvo([roditel, dete, drug], DNES).map((d) => d.id)).toEqual([
      'X',
      'R',
      'D',
    ]);
  });

  it('е ПО-СИЛНО от ръчния ред · дете не излиза пред родителя си', () => {
    // Ръчният ред иска детето ПЪРВО, а „Родител" ПРЕД „Друг" — обратно на
    // сметнатото. Второто става; първото — не: дървото се обхожда ниво по ниво
    // и детето излиза само СЛЕД своя родител.
    //
    // ПЛАТЕНО СЪС СЧУПВАНЕ, КОЕТО МИНА: първата версия питаше с ред
    // `['D','X','R']` и чакаше `X · R · D` — точно сметнатата подредба. Махнах
    // ръчния ред от обхода и тестът пак мина, защото очакваното съвпадаше с
    // онова, което кодът щеше да даде и без него.
    const red = podredeniPoDarvo([roditel, dete, drug], DNES, ['D', 'R', 'X']);
    expect(red.map((d) => d.id)).toEqual(['R', 'D', 'X']);
  });

  it('но ВЪТРЕ в едно ниво ръчният ред важи · и то СРЕЩУ сметнатия', () => {
    const red = podredeniPoDarvo([roditel, drug], DNES, ['R', 'X']);
    expect(red.map((d) => d.id)).toEqual(['R', 'X']);
    // А без него — обратното.
    expect(podredeniPoDarvo([roditel, drug], DNES).map((d) => d.id)).toEqual(['X', 'R']);
  });
});

// ── 3 · ВХОДЪТ ────────────────────────────────────────────────────────────

describe('входът', () => {
  it('отказва ДУБЛИКАТ · записан веднъж, той рисува делото два пъти ЗАВИНАГИ', () => {
    expect(() => napraviRachniyaRed(['A', 'B', 'A'])).toThrow(GreshkaPorednost);
    expect(() => napraviRachniyaRed(['A', 'B', 'A'])).toThrow(/два пъти/);
  });

  it('и празно място · редът се пише с идентификатори, не с дупки', () => {
    expect(() => napraviRachniyaRed(['A', '  ', 'B'])).toThrow(/дупки/);
  });

  it('а ПРАЗНИЯТ ред е валиден · той е отмяната, без да се трие нищо', () => {
    expect(napraviRachniyaRed([])).toEqual([]);
  });

  it('четенето обаче е СНИЗХОДИТЕЛНО · чужда книга не чупи екрана', () => {
    // Писачът е отказал дубликата, но книга може да дойде отвън. Пази се
    // ПЪРВОТО появяване — то е мястото, на което човекът е пуснал реда.
    expect(rachniyatRedOtZhurnala(['A', 'B', 'A', '', 'C'])).toEqual(['A', 'B', 'C']);
    expect(rachniyatRedOtZhurnala(undefined)).toEqual([]);
  });
});

// ── 4 · ПРЕМЕСТВАНЕТО ─────────────────────────────────────────────────────

describe('преместването', () => {
  const red = ['A', 'B', 'C', 'D'];

  it('вдига реда и го пуска ТОЧНО там · надолу и нагоре', () => {
    expect(sledPremestvane(red, 0, 2)).toEqual(['B', 'C', 'A', 'D']);
    expect(sledPremestvane(red, 3, 1)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('на СВОЕТО място не мени нищо', () => {
    expect(sledPremestvane(red, 1, 1)).toEqual(red);
  });

  it('а позиция ИЗВЪН списъка се отказва · мълчаливата поправка би записала чужд ред', () => {
    expect(() => sledPremestvane(red, 0, 4)).toThrow(GreshkaPorednost);
    expect(() => sledPremestvane(red, -1, 0)).toThrow(/Няма такава позиция/);
    expect(() => sledPremestvane(red, 0.5, 1)).toThrow(/цели числа/);
  });
});

// ── 5 · НОМЕРЪТ СЕ СМЯТА ──────────────────────────────────────────────────

describe('колоната „поредност"', () => {
  it('се СМЯТА от реда · и брои от ЕДНО, защото я чете човек', () => {
    expect(nomeratNa(['A', 'B', 'C'], 'A')).toBe(1);
    expect(nomeratNa(['A', 'B', 'C'], 'C')).toBe(3);
  });

  it('а дело без ръчно място дава НУЛА · липсата е един вид', () => {
    expect(nomeratNa(['A', 'B'], 'Z')).toBe(0);
    expect(nomeratNa([], 'A')).toBe(0);
  });
});

// ── 6 · ПРЕЗ ВРАТАТА ──────────────────────────────────────────────────────

describe('записът', () => {
  it('минава през Вратата и стига до Огледалото · ЦЕЛИЯТ ред', async () => {
    const { deystviya } = stend();
    await deystviya.podrediDelata({ red: ['B', 'A'] }, { opId: 'op-1' });
    expect((await deystviya.ogledalo()).rachniyatRedNaDelata).toEqual(['B', 'A']);
  });

  it('и ПОСЛЕДНАТА дума бие · вторият запис не се слива с първия', async () => {
    const { deystviya } = stend();
    await deystviya.podrediDelata({ red: ['B', 'A'] }, { opId: 'op-1' });
    await deystviya.podrediDelata({ red: ['A', 'B'] }, { opId: 'op-2' });
    expect((await deystviya.ogledalo()).rachniyatRedNaDelata).toEqual(['A', 'B']);
  });

  it('празният ред се ЗАПИСВА · отмяната е събитие, не триене', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.podrediDelata({ red: ['B', 'A'] }, { opId: 'op-1' });
    await deystviya.podrediDelata({ red: [] }, { opId: 'op-2' });
    expect((await deystviya.ogledalo()).rachniyatRedNaDelata).toEqual([]);
    // ДВЕ събития · първото си стои, защото Журналът е само за добавяне.
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });

  it('дубликатът НЕ стига до Журнала · строгостта е при ВХОДА', async () => {
    const { dnevnik, deystviya } = stend();
    await expect(
      deystviya.podrediDelata({ red: ['A', 'A'] }, { opId: 'op-1' }),
    ).rejects.toThrow(/два пъти/);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(0);
  });

  it('и повторният `opId` не създава втори запис (правило 5)', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.podrediDelata({ red: ['B', 'A'] }, { opId: 'op-1' });
    await deystviya.podrediDelata({ red: ['B', 'A'] }, { opId: 'op-1' });
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(1);
  });
});

// ── 7 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на подредбата', () => {
  const dela = [delo({ id: 'A' }), delo({ id: 'B' }), delo({ id: 'C' })];

  it('брои редовете вход↔изход · и нулата се записва', () => {
    const s = sveriPodredbata(dela, podrediSRachen(dela, DNES, ['C', 'A']), KOGATO);
    expect(s.vhod).toBe(3);
    expect(s.izhod).toBe(3);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('а ИЗЯДЕН ред я счупва · тя не е украса', () => {
    const s = sveriPodredbata(dela, dela.slice(1), KOGATO);
    expect(s.razlika).toBe(-1);
    expect(s.nared).toBe(false);
  });
});
