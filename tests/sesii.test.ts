/**
 * СЕСИИТЕ НА РЕДАКТОРА (резен 26 · ADR-086).
 *
 * Осемте обещания:
 *
 *   1. Сесията е ДВОЙКАТА (кой · ден) · двама в един ден са ДВЕ сесии.
 *   2. Вътре редовете вървят по ТАЙМИНГА НА ЗАПИСА · първото записано е първо.
 *   3. Сесиите вървят от най-новата назад · човек пита „какво стана днес".
 *   4. Изключеният филтър показва ДНЕШНИЯ ден, не всичко.
 *   5. Датата, името и текстът стесняват · и трите поотделно.
 *   6. Търсенето е сведено · „Иван" и „иван" са ЕДИН редактор.
 *   7. Сверката вход↔изход затваря · нито един ред не пада между сесиите.
 *   8. Тук НИЩО не се пише · целият модул е четиво (мери се).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno, type Sabitie } from '../src/yadro/index.js';
import {
  denyaNa,
  dnevnitteSesii,
  filtaratEIzklyuchen,
  PRAZEN_FILTAR,
  prezFiltara,
  redaktorite,
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
  it('и това се КАЗВА · празният филтър се разпознава', () => {
    expect(filtaratEIzklyuchen(PRAZEN_FILTAR)).toBe(true);
    expect(filtaratEIzklyuchen({ ...PRAZEN_FILTAR, koy: 'ivan' })).toBe(false);
  });

  it('дневните сесии са само за подадения ден', () => {
    const s = dnevnitteSesii(KNIGA, '2026-08-30');
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.den === '2026-08-30')).toBe(true);
  });

  it('изгледът го прави сам · и обявява, че филтърът е изключен', () => {
    const izgled = zhurnalatZaEkrana(KNIGA, PRAZEN_FILTAR, '2026-08-30', KOGATO);
    expect(izgled.izklyuchen).toBe(true);
    expect(izgled.sesii).toHaveLength(2);
    // Целият Журнал наведнъж е ИЗНОСЪТ, не екранът.
    expect(izgled.sesii.every((x) => x.den === '2026-08-30')).toBe(true);
  });

  it('а ден без нито един запис дава празен списък, не измислена сесия', () => {
    expect(dnevnitteSesii(KNIGA, '2026-08-31')).toEqual([]);
  });
});

// ── 5 и 6 · СТЕСНЯВАНЕТО ──────────────────────────────────────────────────

describe('датата, името и текстът стесняват · и трите поотделно', () => {
  it('датите режат от двете страни, ВКЛЮЧИТЕЛНО', () => {
    const s = sesiite(KNIGA, { ...PRAZEN_FILTAR, ot: '2026-08-29', do_: '2026-08-29' });
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.den === '2026-08-29')).toBe(true);
  });

  it('името стеснява ЧАСТИЧНО · не иска цял имейл', () => {
    const s = sesiite(KNIGA, { ...PRAZEN_FILTAR, koy: 'mariya' });
    expect(s.every((x) => x.koy === 'mariya@vintex.bg')).toBe(true);
    expect(s.reduce((x, y) => x + y.broy, 0)).toBe(3);
  });

  it('и е СВЕДЕНО · „ИВАН" намира „ivan" по същия начин', () => {
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, koy: 'IVAN' })).toBe(true);
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, koy: '  Ivan  ' })).toBe(true);
  });

  it('текстът рови във вида, същността И товара', () => {
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, tarsi: 'имотдобавен' })).toBe(true);
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, tarsi: 'I-1' })).toBe(true);
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, tarsi: 'Адрес 1' })).toBe(true);
    expect(prezFiltara(KNIGA[0]!, { ...PRAZEN_FILTAR, tarsi: 'няма такова' })).toBe(false);
  });

  it('и редакторите се броят от Журнала, не се пишат на ръка', () => {
    expect([...redaktorite(KNIGA)]).toEqual(['ivan@vintex.bg', 'mariya@vintex.bg']);
  });
});

// ── 7 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката вход↔изход · нито един ред не пада между сесиите', () => {
  it('затваря на нула · и се записва, дори когато е нула', () => {
    const s = sesiite(KNIGA);
    const sv = sveriSesiite(KNIGA, s, PRAZEN_FILTAR, KOGATO);
    expect(sv.vhod).toBe(6);
    expect(sv.izhod).toBe(6);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('и МОЖЕ да падне · изгубена сесия се вижда с ЧИСЛО', () => {
    const okastreni = sesiite(KNIGA).slice(1);
    const sv = sveriSesiite(KNIGA, okastreni, PRAZEN_FILTAR, KOGATO);
    expect(sv.nared).toBe(false);
    expect(sv.razlika).toBe(-1);
  });

  it('и изгледът я носи със себе си', () => {
    const izgled = zhurnalatZaEkrana(KNIGA, { ...PRAZEN_FILTAR, koy: 'ivan' }, '2026-08-30', KOGATO);
    expect(izgled.sverka.nared).toBe(true);
    expect(izgled.sverka.vhod).toBe(3);
  });
});

// ── 8 · НИЩО НЕ СЕ ПИШЕ ───────────────────────────────────────────────────

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
    zhurnalatZaEkrana(kniga, PRAZEN_FILTAR, '2026-08-30', KOGATO);
    sesiite(kniga);
    dnevnitteSesii(kniga, '2026-08-30');

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
  });
});
