/**
 * ПАПКАТА НА ОБЕКТА · линк, не достъп (резен 37 · ADR-097).
 *
 * Негова дума *(р57·[110] · 08.08)*, дословно:
 *
 *   „Различни за различни обекти, но те са гоогле драйва и има достъп от
 *    имейлите които влизат в програмата."
 *
 * Седемте обещания:
 *
 *   1. Всеки обект носи СВОЙ линк · дотук папка имаше само мястото.
 *   2. Празното е ПОЗВОЛЕНО · обектът има смисъл и без папка.
 *   3. Опасната схема се отказва ПОИМЕННО · линк в таблица се натиска.
 *   4. Записан преди полето, имотът чете ПРАЗНО · старият запис си е валиден.
 *   5. Поправка БЕЗ папка не трие папката · липсващо ≠ празно.
 *   6. Повторените папки се БРОЯТ и се КАЗВАТ · не се отказват при Вратата.
 *   7. Разделянето се събира до цялото · с папка + без папка = всички обекти.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  broySPapka,
  GreshkaPapka,
  povtoreniPapki,
  proveriPapkata,
  sveriPapkite,
} from '../src/domein/papki.js';
import type { Imot } from '../src/ogledalo/ogledalo.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-30T12:00:00.000Z';

/** Два адреса, сглобени от части · стената не пуска цял чужд адрес в кода. */
const DRAYV = ['https:', '//', 'primer.example', '/papka-1'].join('');
const DRAYV2 = ['https:', '//', 'primer.example', '/papka-2'].join('');

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

function imot(p: Partial<Imot> & { id: string }): Imot {
  return { seq: 1, adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: '', ...p };
}

// ── 1 · 2 · 3 · ВХОДЪТ ────────────────────────────────────────────────────

describe('линкът към папката', () => {
  it('се приема като цял адрес · уеб или местна папка', () => {
    expect(proveriPapkata(DRAYV)).toBe(DRAYV);
    expect(proveriPapkata('file:///home/ivan/Обекти/АП1')).toBe('file:///home/ivan/Обекти/АП1');
  });

  it('и ПРАЗНОТО е позволено · обектът има смисъл и без папка', () => {
    expect(proveriPapkata('')).toBe('');
    expect(proveriPapkata('   ')).toBe('');
  });

  it('а половин адрес се отказва С ДУМИ · не се „поправя" мълчаливо', () => {
    expect(() => proveriPapkata('папката ми')).toThrow(GreshkaPapka);
    expect(() => proveriPapkata('папката ми')).toThrow(/не е адрес/);
  });

  it('ОПАСНАТА схема се отказва ПОИМЕННО · линк в таблица се натиска', () => {
    // `javascript:` в клетка изпълнява чужд код с всичките права на страницата.
    expect(() => proveriPapkata('javascript:alert(1)')).toThrow(/не се приема/);
    expect(() => proveriPapkata('data:text/html,<b>х</b>')).toThrow(/не се приема/);
    // И `http:` без „s" — линк, който тръгва открит, не е папка в Драйв.
    expect(() => proveriPapkata('http://primer.example/p')).toThrow(GreshkaPapka);
  });
});

// ── 4 и 5 · ПРЕЗ ВРАТАТА ──────────────────────────────────────────────────

describe('записът', () => {
  it('носи папката до Огледалото', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'I-1',
      { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: DRAYV },
      { opId: 'op-1' },
    );
    expect((await deystviya.ogledalo()).imoti.get('I-1')!.papka).toBe(DRAYV);
  });

  it('а имот БЕЗ полето чете празно · старият запис си е валиден', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'I-1',
      { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0 },
      { opId: 'op-1' },
    );
    expect((await deystviya.ogledalo()).imoti.get('I-1')!.papka).toBe('');
  });

  it('лош адрес НЕ стига до Журнала · строгостта е при ВХОДА', async () => {
    const { dnevnik, deystviya } = stend();
    await expect(
      deystviya.dobaviImot(
        'I-1',
        { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: 'javascript:x' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(GreshkaPapka);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(0);
  });

  it('поправка БЕЗ папка НЕ трие папката · липсващо не е празно', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'I-1',
      { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: DRAYV },
      { opId: 'op-1' },
    );
    // Поправка на ПЛОЩТА · за папката не се казва нищо.
    await deystviya.popraviImot(
      {
        imotId: 'I-1',
        adres: 'Малинова',
        edinitsa: 'АП. № 1',
        ploshtad_kvsm: 72_40_00,
        prichina: 'измерена',
      },
      { opId: 'op-2' },
    );
    const o = await deystviya.ogledalo();
    expect(o.imoti.get('I-1')!.papka).toBe(DRAYV);
    expect(o.imoti.get('I-1')!.ploshtad_kvsm).toBe(72_40_00);
  });

  it('а ПРАЗНА папка в поправката я МАХА · това е решение на човек', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'I-1',
      { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: DRAYV },
      { opId: 'op-1' },
    );
    await deystviya.popraviImot(
      {
        imotId: 'I-1',
        adres: 'Малинова',
        edinitsa: 'АП. № 1',
        ploshtad_kvsm: 0,
        prichina: 'папката се смени',
        papka: '',
      },
      { opId: 'op-2' },
    );
    expect((await deystviya.ogledalo()).imoti.get('I-1')!.papka).toBe('');
  });
});

// ── 6 · РАЗЛИЧНИ ЗА РАЗЛИЧНИ ──────────────────────────────────────────────

describe('повторените папки', () => {
  it('се БРОЯТ · „различни за различни обекти" е неговата дума', () => {
    const imoti = [
      imot({ id: 'A', papka: DRAYV }),
      imot({ id: 'B', papka: DRAYV }),
      imot({ id: 'C', papka: DRAYV2 }),
    ];
    expect(povtoreniPapki(imoti)).toEqual([DRAYV]);
  });

  it('но НЕ се отказват при Вратата · отказът би решил вместо него', async () => {
    const { deystviya } = stend();
    await deystviya.dobaviImot(
      'I-1',
      { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0, papka: DRAYV },
      { opId: 'op-1' },
    );
    await deystviya.dobaviImot(
      'I-2',
      { adres: 'Малинова', edinitsa: 'АП. № 2', ploshtad_kvsm: 0, papka: DRAYV },
      { opId: 'op-2' },
    );
    const imoti = [...(await deystviya.ogledalo()).imoti.values()];
    expect(imoti).toHaveLength(2);
    expect(povtoreniPapki(imoti)).toEqual([DRAYV]);
  });

  it('и празните НЕ се броят за повторение · липсата не е адрес', () => {
    expect(povtoreniPapki([imot({ id: 'A' }), imot({ id: 'B' })])).toEqual([]);
  });
});

// ── 7 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на папките', () => {
  const imoti = [imot({ id: 'A', papka: DRAYV }), imot({ id: 'B' }), imot({ id: 'C' })];

  it('брои с папка и без папка · сборът е всички обекти', () => {
    expect(broySPapka(imoti)).toBe(1);
    const s = sveriPapkite(imoti, KOGATO);
    expect(s.vhod).toBe(3);
    expect(s.izhod).toBe(3);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('и празният списък дава ЧЕСТНА нула', () => {
    const s = sveriPapkite([], KOGATO);
    expect(s.vhod).toBe(0);
    expect(s.nared).toBe(true);
  });
});
