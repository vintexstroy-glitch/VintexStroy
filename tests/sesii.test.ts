/**
 * СЕСИИТЕ НА РЕДАКТОРА (резен 26 · ADR-086).
 *
 * Осемте обещания:
 *
 *   1. Сесията е ДВОЙКАТА (кой · ден) · двама в един ден са ДВЕ сесии.
 *   2. Вътре редовете вървят по ТАЙМИНГА НА ЗАПИСА · първото записано е първо.
 *   3. Сесиите вървят от най-новата назад · човек пита „какво стана днес".
 *   4. Изключеният филтър показва ДНЕШНИЯ ден, не всичко.
 *   5. Стесненото се приема ОТВЪН (филтърният двигател, резен 75в) · домейнът
 *      групира каквото получи и не решава втори път кое минава.
 *   6. Сверката вход↔изход затваря · нито един ред не пада между сесиите.
 *   7. Тук НИЩО не се пише · целият модул е четиво (мери се).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno, type Sabitie } from '../src/yadro/index.js';
import {
  denyaNa,
  dnevnitteSesii,
  sesiite,
  sveriSesiite,
  zhurnalatZaEkrana,
} from '../src/domein/sesii.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-30T12:00:00.000Z';

/** Едно събитие · само полетата, които сесиите четат. */
function sabitie(
  actor: string,
  ts: string,
  seq: number,
  id = `I-${seq}`,
  type = 'ИмотДобавен',
): Sabitie {
  return {
    opId: `op-${seq}`,
    ts,
    naematel: NAEMATEL,
    actor,
    type,
    sashtnost: { vid: 'imot', id },
    payload: { adres: `Адрес ${seq}`, edinitsa: 'х', ploshtad_kvsm: 0 },
    seq,
    prevHash: '',
    hash: `h-${seq}`,
  } as unknown as Sabitie;
}

/** Двама редактора, два дни · четири сесии. */
const KNIGA: readonly Sabitie[] = Object.freeze([
  sabitie('ivan@vintex.bg', '2026-08-29T09:15:00.000Z', 1),
  sabitie('ivan@vintex.bg', '2026-08-29T09:40:00.000Z', 2),
  sabitie('mariya@vintex.bg', '2026-08-29T14:05:00.000Z', 3),
  sabitie('ivan@vintex.bg', '2026-08-30T08:00:00.000Z', 4),
  sabitie('mariya@vintex.bg', '2026-08-30T10:30:00.000Z', 5),
  sabitie('mariya@vintex.bg', '2026-08-30T16:45:00.000Z', 6),
]);

// ── 1 · СЕСИЯТА Е ДВОЙКАТА ────────────────────────────────────────────────

describe('сесията е ДВОЙКАТА (кой · ден)', () => {
  it('двама в един ден са ДВЕ сесии, не една', () => {
    const s = sesiite(KNIGA);
    expect(s).toHaveLength(4);
    expect(s.map((x) => `${x.den} · ${x.koy}`)).toEqual([
      '2026-08-30 · ivan@vintex.bg',
      '2026-08-30 · mariya@vintex.bg',
      '2026-08-29 · ivan@vintex.bg',
      '2026-08-29 · mariya@vintex.bg',
    ]);
  });

  it('и всяка носи часа на първия и на последния си запис', () => {
    const mariya = sesiite(KNIGA).find(
      (x) => x.den === '2026-08-30' && x.koy === 'mariya@vintex.bg',
    )!;
    expect(mariya.broy).toBe(2);
    expect(mariya.ot).toBe('10:30');
    expect(mariya.do_).toBe('16:45');
  });

  it('денят се чете от подписаното време, не от отделно поле', () => {
    expect(denyaNa(KNIGA[0]!)).toBe('2026-08-29');
  });
});

// ── 2 и 3 · НАРЕДБАТА ─────────────────────────────────────────────────────

describe('наредбата · вътре напред, сесиите назад', () => {
  it('вътре редовете вървят по ТАЙМИНГА НА ЗАПИСА · негово, дословно', () => {
    // Разбъркан вход · наредбата е СМЕТНАТА, не заварена.
    const razbarkani = [KNIGA[1]!, KNIGA[0]!];
    const s = sesiite(razbarkani);
    expect(s[0]!.redove.map((x) => x.seq)).toEqual([1, 2]);
  });

  it('при ЕДНО И СЪЩО време решава seq · часовникът е с милисекунда', () => {
    const edno = '2026-08-30T08:00:00.000Z';
    const s = sesiite([
      sabitie('ivan@vintex.bg', edno, 9),
      sabitie('ivan@vintex.bg', edno, 7),
      sabitie('ivan@vintex.bg', edno, 8),
    ]);
    expect(s[0]!.redove.map((x) => x.seq)).toEqual([7, 8, 9]);
  });

  it('сесиите вървят от най-новата назад · и при равен ден по име', () => {
    const s = sesiite(KNIGA);
    expect(s[0]!.den).toBe('2026-08-30');
    expect(s.at(-1)!.den).toBe('2026-08-29');
    expect(s[0]!.koy < s[1]!.koy).toBe(true);
  });
});

// ── 4 · ИЗКЛЮЧЕНИЯТ ФИЛТЪР ────────────────────────────────────────────────

describe('изключеният филтър показва ДНЕШНИЯ ден, не всичко', () => {
  it('дневните сесии са само за подадения ден', () => {
    const s = dnevnitteSesii(KNIGA, '2026-08-30');
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.den === '2026-08-30')).toBe(true);
  });

  it('изгледът го прави сам · `null` значи „нито един филтър не е пипнат"', () => {
    const izgled = zhurnalatZaEkrana(KNIGA, null, '2026-08-30', KOGATO);
    expect(izgled.izklyuchen).toBe(true);
    expect(izgled.sesii).toHaveLength(2);
    // Целият Журнал наведнъж е ИЗНОСЪТ, не екранът.
    expect(izgled.sesii.every((x) => x.den === '2026-08-30')).toBe(true);
  });

  it('а ден без нито един запис дава празен списък, не измислена сесия', () => {
    expect(dnevnitteSesii(KNIGA, '2026-08-31')).toEqual([]);
  });
});

// ── 5 · СТЕСНЕНОТО СЕ ПРИЕМА ОТВЪН ────────────────────────────────────────

describe('стесненото идва от двигателя · домейнът не решава втори път', () => {
  it('подаденото стеснение се групира каквото е · и НЕ е „изключено"', () => {
    const samoMariya = KNIGA.filter((s) => s.actor === 'mariya@vintex.bg');
    const izgled = zhurnalatZaEkrana(KNIGA, samoMariya, '2026-08-30', KOGATO);
    expect(izgled.izklyuchen).toBe(false);
    expect(izgled.sesii.every((x) => x.koy === 'mariya@vintex.bg')).toBe(true);
    expect(izgled.sesii.reduce((x, y) => x + y.broy, 0)).toBe(3);
  });

  it('ПРАЗЕН резултат от истински филтър е отговор, не днешният ден', () => {
    const izgled = zhurnalatZaEkrana(KNIGA, [], '2026-08-30', KOGATO);
    expect(izgled.izklyuchen).toBe(false);
    expect(izgled.sesii).toEqual([]);
    expect(izgled.sverka.vhod).toBe(0);
  });
});

// ── 6 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката вход↔изход · нито един ред не пада между сесиите', () => {
  it('затваря на нула · и се записва, дори когато е нула', () => {
    const s = sesiite(KNIGA);
    const sv = sveriSesiite(KNIGA, s, KOGATO);
    expect(sv.vhod).toBe(6);
    expect(sv.izhod).toBe(6);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('и МОЖЕ да падне · изгубена сесия се вижда с ЧИСЛО', () => {
    const okastreni = sesiite(KNIGA).slice(1);
    const sv = sveriSesiite(KNIGA, okastreni, KOGATO);
    expect(sv.nared).toBe(false);
    expect(sv.razlika).toBe(-1);
  });

  it('и изгледът я носи със себе си · входът е СТЕСНЕНОТО, не цялата книга', () => {
    const samoIvan = KNIGA.filter((s) => s.actor === 'ivan@vintex.bg');
    const izgled = zhurnalatZaEkrana(KNIGA, samoIvan, '2026-08-30', KOGATO);
    expect(izgled.sverka.nared).toBe(true);
    expect(izgled.sverka.vhod).toBe(3);
  });
});

// ── 7 · НИЩО НЕ СЕ ПИШЕ ───────────────────────────────────────────────────

describe('целият модул е ЧЕТИВО', () => {
  it('гледането не ражда НИТО ЕДНО събитие', async () => {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await vrata.dobavi({
      opId: 'op-1',
      ts: '2026-08-30T08:00:00.000Z',
      naematel: NAEMATEL,
      actor: 'ivan@vintex.bg',
      type: 'ИмотДобавен',
      sashtnost: { vid: 'imot', id: 'I-1' },
      payload: { adres: 'А', edinitsa: 'х', ploshtad_kvsm: 0 },
    });
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    const kniga = await dnevnik.chetiVsichki(NAEMATEL);
    zhurnalatZaEkrana(kniga, null, '2026-08-30', KOGATO);
    sesiite(kniga);
    dnevnitteSesii(kniga, '2026-08-30');

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
  });
});
