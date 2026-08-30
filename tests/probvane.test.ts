/**
 * ТРИДЕСЕТТЕ ДНИ ПРОБВАНЕ · срок, не план (резен 32 · ADR-092).
 *
 * Негова дума: „с 30 дн[и] б[ез]платно пробване" *(р83·[57])*, потвърдена с
 * „da wavi" (И86) и разчетена там: „акаунтът остава безплатен, планът остава
 * платен; **пробването е СРОК преди плащането, не безплатен план**".
 *
 * Седемте обещания:
 *
 *   1. Тридесет са ТРИДЕСЕТ · първият ден се брои, и числото е негово.
 *   2. Началото е ПЪРВОТО събитие · и се СМЯТА, не се записва.
 *   3. По `ts`, не по датата на записа · разход от лани не праща срока назад.
 *   4. Празната книга още НЕ е започнала · трето състояние, не нула.
 *   5. Изтеклото НЕ заключва нищо · честна спирачка, не ключалка.
 *   6. Пробването НЕ е план · матрицата остава четири.
 *   7. Сверката брои дните по ВТОРИ път · и нулата се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { PLANOVE } from '../src/domein/planove.js';
import {
  DNI_PROBVANE,
  dumiteNaProbvaneto,
  nachaloNaProbvaneto,
  probvaneto,
  probvanetoEIzteklo,
  sveriProbvaneto,
} from '../src/domein/probvane.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-30T12:00:00.000Z';

/** Стенд с ЧАСОВНИК в подадения ден · срокът брои от него. */
function stend(den: string) {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(`${den}T09:00:${String(tik++).padStart(2, '0')}.000Z`).toISOString(),
  });
  return { dnevnik, deystviya };
}

const razhod = (data: string) => ({
  potok: 'fakturi',
  dostavchik: 'Баумит ЕООД',
  opis: 'вар',
  suma_st: stotinki(120_00),
  sektor: 'pokupki-materiali',
  nachin: 'банка' as const,
  data,
  dokument: '0000001234',
  stavka: 20,
});

// ── 1 · ТРИДЕСЕТТЕ ────────────────────────────────────────────────────────

describe('тридесетте дни', () => {
  it('са ТРИДЕСЕТ · и числото е НЕГОВО, не „месец"', () => {
    expect(DNI_PROBVANE).toBe(30);
  });

  it('първият ден се БРОИ · от 1-ви срокът важи до 30-и', () => {
    const p = probvaneto('2026-08-01', '2026-08-01');
    expect(p.do_).toBe('2026-08-30');
    expect(p.ostavat).toBe(29);
    expect(p.sastoyanie).toBe('teche');
  });

  it('последният ден още ТЕЧЕ · нула остават не значи изтекло', () => {
    const p = probvaneto('2026-08-01', '2026-08-30');
    expect(p.ostavat).toBe(0);
    expect(p.sastoyanie).toBe('teche');
    expect(probvanetoEIzteklo(p)).toBe(false);
    expect(dumiteNaProbvaneto(p)).toContain('ДНЕС');
  });

  it('а следващият е ИЗТЕКЪЛ · с числото на просрочието', () => {
    const p = probvaneto('2026-08-01', '2026-08-31');
    expect(p.ostavat).toBe(-1);
    expect(p.sastoyanie).toBe('izteklo');
    expect(probvanetoEIzteklo(p)).toBe(true);
  });
});

// ── 2 и 3 · НАЧАЛОТО ──────────────────────────────────────────────────────

describe('началото', () => {
  it('е денят на ПЪРВОТО събитие · СМЯТА се, не се записва', async () => {
    const { dnevnik, deystviya } = stend('2026-07-15');
    await deystviya.zapishiRazhod('RZ-1', razhod('2026-07-15'), { opId: 'op-1' });
    await deystviya.zapishiRazhod('RZ-2', razhod('2026-07-20'), { opId: 'op-2' });

    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    expect(nachaloNaProbvaneto(potok)).toBe('2026-07-15');
    // НИЩО не е записано за пробването · то се смята изцяло.
    expect(potok.every((s) => s.type === 'РазходЗаписан')).toBe(true);
  });

  it('и е по `ts`, НЕ по датата на записа', async () => {
    const { dnevnik, deystviya } = stend('2026-08-30');
    // Разход от МИНАЛАТА година, въведен ДНЕС. По датата на записа срокът щеше
    // да е изтекъл преди да е започнал.
    await deystviya.zapishiRazhod('RZ-1', razhod('2025-11-12'), { opId: 'op-1' });

    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    expect(nachaloNaProbvaneto(potok)).toBe('2026-08-30');
    expect(probvaneto(nachaloNaProbvaneto(potok), '2026-08-30').sastoyanie).toBe('teche');
  });

  it('и второто събитие НЕ го мести · първото е първо', async () => {
    const { dnevnik, deystviya } = stend('2026-07-15');
    await deystviya.zapishiRazhod('RZ-1', razhod('2026-07-15'), { opId: 'op-1' });
    const predi = nachaloNaProbvaneto(await dnevnik.chetiVsichki(NAEMATEL));

    await deystviya.zapishiRazhod('RZ-2', razhod('2026-07-20'), { opId: 'op-2' });
    expect(nachaloNaProbvaneto(await dnevnik.chetiVsichki(NAEMATEL))).toBe(predi);
  });
});

// ── 4 · ПРАЗНАТА КНИГА ────────────────────────────────────────────────────

describe('празната книга', () => {
  it('още НЕ е започнала · трето състояние, не нула дни', () => {
    expect(nachaloNaProbvaneto([])).toBe('');
    const p = probvaneto('', '2026-08-30');
    expect(p.sastoyanie).toBe('ne-e-zapochnalo');
    expect(p.ostavat).toBe(DNI_PROBVANE);
    expect(p.nachalo).toBe('');
  });

  it('и думите го КАЗВАТ · започва с първия запис', () => {
    expect(dumiteNaProbvaneto(probvaneto('', '2026-08-30'))).toContain('започва с първия');
  });
});

// ── 5 · ЧЕСТНА СПИРАЧКА ───────────────────────────────────────────────────

describe('изтеклото пробване', () => {
  it('НЕ заключва Журнала · записът минава както преди', async () => {
    const { dnevnik, deystviya } = stend('2026-01-01');
    await deystviya.zapishiRazhod('RZ-1', razhod('2026-01-01'), { opId: 'op-1' });

    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    const p = probvaneto(nachaloNaProbvaneto(potok), '2026-08-30');
    expect(p.sastoyanie).toBe('izteklo');

    // И ВЪПРЕКИ ТОВА · нов запис минава. Приложение, което заключва данните на
    // човека при изтекъл срок, е взело за заложник неговата книга.
    const sled = stend('2026-08-30');
    await sled.deystviya.zapishiRazhod('RZ-2', razhod('2026-08-30'), { opId: 'op-2' });
    expect((await sled.dnevnik.chetiVsichki(NAEMATEL)).length).toBe(1);
  });

  it('и думите НЕ заплашват · те казват, че нищо не е заключено', () => {
    const dumi = dumiteNaProbvaneto(probvaneto('2026-01-01', '2026-08-30'));
    expect(dumi).toContain('Нищо не е заключено');
    expect(dumi).not.toMatch(/забранен|блокиран|спрян/i);
  });
});

// ── 6 · НЕ Е ПЛАН ─────────────────────────────────────────────────────────

describe('пробването', () => {
  it('НЕ е план · матрицата остава ЧЕТИРИ (ADR-007)', () => {
    expect(PLANOVE).toHaveLength(4);
    expect(PLANOVE.map((x) => x.klyuch)).not.toContain('probvane');
  });

  it('и е СРОК върху избрания план, не негова стойност', () => {
    // Едно и също пробване важи, какъвто и план да е избран: то не се чете от
    // плана и не се пише в него.
    const p = probvaneto('2026-08-01', '2026-08-10');
    expect(p.sastoyanie).toBe('teche');
    expect(Object.keys(p)).toEqual(['sastoyanie', 'nachalo', 'do_', 'ostavat']);
  });
});

// ── 7 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на пробването', () => {
  it('брои дните по ВТОРИ път · от датите, не от числото', () => {
    const s = sveriProbvaneto(probvaneto('2026-08-01', '2026-08-10'), KOGATO);
    expect(s.vhod).toBe(30);
    expect(s.izhod).toBe(30);
    expect(s.nared).toBe(true);
  });

  it('и празната книга дава ЧЕСТНА нула', () => {
    const s = sveriProbvaneto(probvaneto('', '2026-08-30'), KOGATO);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('а разминат край я СЧУПВА · тя не е украса', () => {
    const s = sveriProbvaneto(
      { sastoyanie: 'teche', nachalo: '2026-08-01', do_: '2026-08-20', ostavat: 1 },
      KOGATO,
    );
    expect(s.izhod).toBe(20);
    expect(s.nared).toBe(false);
  });
});
