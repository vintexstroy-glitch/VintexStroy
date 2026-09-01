/**
 * ВИДОВЕТЕ С ПОПРАВКА НА МЯСТО · ЕДИН обход вместо шест (резен 24 · ADR-084).
 *
 * Пет вида се създават и се поправят с ЕДНО И СЪЩО събитие: делото, личното
 * движение, продажбата, кредитът и заплатата. Всеки от тях носи една и съща
 * дупка — сторното на СЪЗДАВАНЕТО гаси само неговия seq, а поправката после
 * пише пак и записът СЕ ВРЪЩА.
 *
 * Дотук всеки си имаше СВОЙ пълен обход на потока, и всеки нов вид добавяше
 * още един. Сега стоят в ИМЕНУВАН СПИСЪК и се събират в един обход.
 *
 * Шестте обещания:
 *
 *   1. Списъкът е ПЕТ и се БРОИ, не се чете на око.
 *   2. Всеки вид в него ИМА викащ · списък без викащ е надпис (ADR-041).
 *   3. Вид ИЗВЪН списъка ХВЪРЛЯ · празен отговор без питане е по-скъп.
 *   4. Сторно на СЪЗДАВАНЕТО убива записа · дори след поправка.
 *   5. Сторно на ПОПРАВКАТА НЕ убива записа · тя не е създаването.
 *   6. Огледалото не се мени от резена · същите числа, по-малко обхождания.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold, VIDOVE_S_POPRAVKA_NA_MYASTO } from '../src/ogledalo/ogledalo.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

// ── 1 и 2 · СПИСЪКЪТ И ВИКАЩИТЕ МУ ─────────────────────────────────────────

describe('списъкът се БРОИ, не се чете на око', () => {
  it('е ПЕТ, и точно тези', () => {
    expect(VIDOVE_S_POPRAVKA_NA_MYASTO).toHaveLength(5);
    expect([...VIDOVE_S_POPRAVKA_NA_MYASTO]).toEqual([
      'ДелоЗаписано',
      'ЛичноДвижениеЗаписано',
      'ПродажбаЗаписана',
      'КредитЗаписан',
      'ЗаплатаЗаписана',
    ]);
  });

  it('и всеки вид в него ИМА викащ · списък без викащ е надпис', () => {
    const izvor = readFileSync(new URL('../src/ogledalo/ogledalo.ts', import.meta.url), 'utf8');
    const vikaniya = [...izvor.matchAll(/storniranite\('([^']+)'\)/g)].map((m) => m[1]!);
    // Всеки вид се вика ТОЧНО веднъж · два пъти значи двойна работа.
    expect([...vikaniya].sort()).toEqual([...VIDOVE_S_POPRAVKA_NA_MYASTO].sort());
  });
});

// ── 3 · ГУАРДЪТ ────────────────────────────────────────────────────────────

describe('вид ИЗВЪН списъка не се преглъща', () => {
  it('гуардът СТОИ · и това се чете от кода, не се вярва', () => {
    const izvor = readFileSync(new URL('../src/ogledalo/ogledalo.ts', import.meta.url), 'utf8');
    // ЧЕСТНО за какво пази ТОЗИ тест: че гуардът не е ИЗТРИТ. Че той РАБОТИ,
    // се доказа с нарочно счупване — изваден вид от списъка събори шест теста
    // с неговите думи (ADR-084 §7). Оттук е недостижимо: списъкът е замразен,
    // а функцията живее вътре във `fold`.
    expect(izvor).toContain('if (negovite === undefined) {');
    expect(izvor).toContain('VIDOVE_S_POPRAVKA_NA_MYASTO. Добави го ТАМ');
  });
});

// ── 4 и 5 · СТОРНОТО ───────────────────────────────────────────────────────

const DELO = {
  myasto: 'Малинова',
  obekt: 'бл. 3',
  ime: 'Замазка',
  otgovornik: 'vintexstroy@gmail.com',
  ot: '2026-08-01',
  do: '2026-08-20',
  otsenka: 'важно-неспешно',
  sastoyanie: 'чака',
  nadDelo: '',
  dokument: '',
};

const KREDIT = {
  kreditId: 'KR-1',
  ime: 'Ипотека',
  vid: 'ipoteka',
  proektId: '',
  ostatak_st: 100_000_00,
  ot: '2026-01-01',
  lihva_bp: 345,
  vnoska_st: 612_34,
  den: 15,
  otgovornik: 'vintexstroy@gmail.com',
  obezpechenie_st: 200_000_00,
};

const ZAPLATA = {
  zaplataId: 'ZP-1',
  sedmitsa: '2026-W35',
  proektId: '',
  ime: 'Иван Петров',
  dlazhnost: 'зидар',
  obekt: 'бл. 3',
  dnevna_st: 120_00,
  dni: 5,
};

/** Създава, после ПОПРАВЯ същия id · връща seq-овете на двете събития. */
async function sazdayIPopravi(
  d: Deystviya,
  sazday: () => Promise<unknown>,
  popravi: () => Promise<unknown>,
): Promise<void> {
  await sazday();
  await popravi();
}

describe('сторното на СЪЗДАВАНЕТО убива записа · дори след поправка', () => {
  it('делото', async () => {
    const { dnevnik, deystviya } = stend();
    await sazdayIPopravi(
      deystviya,
      () => deystviya.zapishiDelo('D-1', DELO, { opId: 'op-1' }),
      () => deystviya.zapishiDelo('D-1', { ...DELO, ime: 'Замазка · поправено' }, { opId: 'op-2' }),
    );
    const predi = await ogledaloto(dnevnik);
    expect(predi.dela.get('D-1')?.ime).toBe('Замазка · поправено');

    const sazdavaneto = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (s) => s.type === 'ДелоЗаписано',
    )!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: sazdavaneto.seq, prichina: 'грешно въведено' },
      { opId: 'op-st' },
    );
    expect((await ogledaloto(dnevnik)).dela.has('D-1')).toBe(false);
  });

  it('продажбата', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot(
      'IM-1',
      { adres: 'Малинова', edinitsa: 'ап. 12', ploshtad_kvsm: 0 },
      { opId: 'op-imot' },
    );
    const SDELKA = {
      prodazhbaId: 'PR-1',
      imotId: 'IM-1',
      kupuvach: 'Иван',
      telefon: '0888',
      tsena_st: 25_000_00,
      prodazhba_st: 24_000_00,
      smr_st: 14_000_00,
      pd_st: 10_000_00,
      sastoyanie: 'tekushta',
    };
    await sazdayIPopravi(
      deystviya,
      () => deystviya.zapishiProdazhba(SDELKA, { opId: 'op-1' }),
      () => deystviya.zapishiProdazhba({ ...SDELKA, kupuvach: 'Иван Петров' }, { opId: 'op-2' }),
    );
    const predi = await ogledaloto(dnevnik);
    expect(predi.prodazhbi.get('PR-1')?.kupuvach).toBe('Иван Петров');

    const sazdavaneto = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (s) => s.type === 'ПродажбаЗаписана',
    )!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: sazdavaneto.seq, prichina: 'сделката не е ставала' },
      { opId: 'op-st' },
    );
    expect((await ogledaloto(dnevnik)).prodazhbi.has('PR-1')).toBe(false);
  });

  it('кредитът', async () => {
    const { dnevnik, deystviya } = stend();
    await sazdayIPopravi(
      deystviya,
      () => deystviya.zapishiKredit(KREDIT, { opId: 'op-1' }),
      () => deystviya.zapishiKredit({ ...KREDIT, ime: 'Ипотека · Пощенска' }, { opId: 'op-2' }),
    );
    expect((await ogledaloto(dnevnik)).krediti.get('KR-1')?.ime).toBe('Ипотека · Пощенска');

    const sazdavaneto = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (s) => s.type === 'КредитЗаписан',
    )!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: sazdavaneto.seq, prichina: 'сгрешен кредит' },
      { opId: 'op-st' },
    );
    expect((await ogledaloto(dnevnik)).krediti.has('KR-1')).toBe(false);
  });

  it('заплатата', async () => {
    const { dnevnik, deystviya } = stend();
    await sazdayIPopravi(
      deystviya,
      () => deystviya.zapishiZaplata(ZAPLATA, { opId: 'op-1' }),
      () => deystviya.zapishiZaplata({ ...ZAPLATA, dni: 4 }, { opId: 'op-2' }),
    );
    expect((await ogledaloto(dnevnik)).zaplati.get('ZP-1')?.dni).toBe(4);

    const sazdavaneto = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (s) => s.type === 'ЗаплатаЗаписана',
    )!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: sazdavaneto.seq, prichina: 'човекът не е идвал' },
      { opId: 'op-st' },
    );
    expect((await ogledaloto(dnevnik)).zaplati.has('ZP-1')).toBe(false);
  });
});

describe('сторното на ПОПРАВКАТА не убива записа', () => {
  it('кредитът остава · и се връща към стойността ПРЕДИ поправката', async () => {
    const { dnevnik, deystviya } = stend();
    await sazdayIPopravi(
      deystviya,
      () => deystviya.zapishiKredit(KREDIT, { opId: 'op-1' }),
      () => deystviya.zapishiKredit({ ...KREDIT, ime: 'Ипотека · Пощенска' }, { opId: 'op-2' }),
    );
    const popravkata = (await dnevnik.chetiVsichki(NAEMATEL))
      .filter((s) => s.type === 'КредитЗаписан')
      .at(-1)!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: popravkata.seq, prichina: 'поправката е сгрешена' },
      { opId: 'op-st' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(sled.krediti.has('KR-1')).toBe(true);
    expect(sled.krediti.get('KR-1')?.ime).toBe('Ипотека');
  });
});
