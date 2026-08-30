/**
 * КОНТАКТИ И ПРЕПИСКИ · един таб, две секции (резен 38 · M10 · ADR-098).
 *
 * Негови думи, дословно:
 *
 *   „Един таб, две секции" *(р57·[30])*
 *   „Има още събери Преписки и контакти… кога са за взимане кто опция и дата"
 *    *(р57·[28])*
 *   „КОгато се вкарва човек става от Преписки и контакти" *(р65·[46])*
 *   „падащото меню с тях е навсякъде, където пише отговорник" *(ред 1318)*
 *   „Не — остават отделни записи в Контакти" *(р64·[76])*
 *   „Не, само дата" *(р57·[34])*
 *
 * Осемте обещания:
 *
 *   1. Контактът иска САМО име · телефонът и имейлът са по избор.
 *   2. Ключът е СВЕДЕНОТО име · „Иван Петров" и „иван петров " са един човек.
 *   3. Преписката е СВОЯ същност · един контакт носи много.
 *   4. Преписка без контакт или без „какво" се отказва С ДУМИ.
 *   5. Състоянието е ИЗБРОЕНО · свободна дума не влиза.
 *   6. Срещаният, но незаписан контакт СТОИ в списъка.
 *   7. Без дата преписката не е „за взимане" · подразбран срок не се измисля.
 *   8. Сверката брои преписките по контакти · и нулата се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  GreshkaKontakt,
  imenataNaKontaktite,
  kontaktite,
  proveriKontakta,
  SASTOYANIYA_NA_PREPISKA,
  sashtnostNaKontakta,
  svedenoIme,
  sveriKontaktite,
  zaVzimane,
  type Kontakt,
  type Prepiska,
} from '../src/domein/kontakti.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-30T12:00:00.000Z';

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

const kontakt = (p: Partial<Kontakt> & { ime: string }): Kontakt => ({
  telefon: '',
  imeyl: '',
  kakav: '',
  seq: 1,
  kogato: KOGATO,
  koy: 'vintexstroy@gmail.com',
  ...p,
});

const prepiska = (p: Partial<Prepiska> & { id: string; kontakt: string }): Prepiska => ({
  kakvo: 'договор',
  zaVzimane: '',
  sastoyanie: 'чака',
  seq: 1,
  kogato: KOGATO,
  koy: 'vintexstroy@gmail.com',
  ...p,
});

// ── 1 и 2 · КОНТАКТЪТ ─────────────────────────────────────────────────────

describe('контактът', () => {
  it('иска САМО име · останалото е по избор', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKontakt(
      { ime: 'Иван Петров', telefon: '', imeyl: '', kakav: '' },
      { opId: 'op-1' },
    );
    const k = (await deystviya.ogledalo()).kontakti.get('иван петров')!;
    expect(k.ime).toBe('Иван Петров');
    expect(k.telefon).toBe('');
  });

  it('а БЕЗ име се отказва с думи · името е и адресът му', () => {
    expect(() => proveriKontakta('   ')).toThrow(GreshkaKontakt);
    expect(() => proveriKontakta('')).toThrow(/Отговорник/);
  });

  it('ключът е СВЕДЕНОТО име · един човек, не двама', async () => {
    expect(svedenoIme('  Иван   Петров ')).toBe('иван петров');
    expect(sashtnostNaKontakta('Иван Петров')).toBe(sashtnostNaKontakta('иван  петров '));
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiKontakt(
      { ime: 'Иван Петров', telefon: '', imeyl: '', kakav: '' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiKontakt(
      { ime: 'иван  петров ', telefon: '0888', imeyl: '', kakav: '' },
      { opId: 'op-2' },
    );
    const o = await deystviya.ogledalo();
    expect(o.kontakti.size).toBe(1);
    // ПОСЛЕДНИЯТ ЗАПИС БИЕ · и двете събития стоят в Журнала.
    expect(o.kontakti.get('иван петров')!.telefon).toBe('0888');
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });

  it('и имената хранят падащото меню · подредени по азбука', () => {
    const imena = imenataNaKontaktite([kontakt({ ime: 'Тихомир' }), kontakt({ ime: 'Ивайло' })]);
    expect(imena).toEqual(['Ивайло', 'Тихомир']);
  });
});

// ── 3 · 4 · 5 · ПРЕПИСКАТА ────────────────────────────────────────────────

describe('преписката', () => {
  it('е СВОЯ същност · един контакт носи много', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPrepiska(
      'P-1',
      { kontakt: 'Иван Петров', kakvo: 'договор', zaVzimane: '', sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiPrepiska(
      'P-2',
      { kontakt: 'Иван Петров', kakvo: 'скица', zaVzimane: '2026-09-10', sastoyanie: 'чака' },
      { opId: 'op-2' },
    );
    const o = await deystviya.ogledalo();
    expect(o.prepiski.size).toBe(2);
    expect(o.prepiski.get('P-2')!.zaVzimane).toBe('2026-09-10');
  });

  it('БЕЗ контакт се отказва · „с кого" е половината от нея', async () => {
    const { dnevnik, deystviya } = stend();
    await expect(
      deystviya.zapishiPrepiska(
        'P-1',
        { kontakt: '  ', kakvo: 'договор', zaVzimane: '', sastoyanie: 'чака' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/с кого|С кого/);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(0);
  });

  it('и БЕЗ „за какво" също · празен ред заема място', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiPrepiska(
        'P-1',
        { kontakt: 'Иван', kakvo: '', zaVzimane: '', sastoyanie: 'чака' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/за какво/);
  });

  it('състоянието е ИЗБРОЕНО · свободна дума не влиза', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiPrepiska(
        'P-1',
        { kontakt: 'Иван', kakvo: 'договор', zaVzimane: '', sastoyanie: 'зарязано' },
        { opId: 'op-1' },
      ),
    ).rejects.toThrow(/Непознато състояние/);
    expect(SASTOYANIYA_NA_PREPISKA).toEqual(['чака', 'взето', 'отпаднало']);
  });
});

// ── 6 · СРЕЩАНИЯТ, НО НЕЗАПИСАН ───────────────────────────────────────────

describe('списъкът с контакти', () => {
  it('показва и онези, които само се СРЕЩАТ по преписките', () => {
    const redove = kontaktite(
      [kontakt({ ime: 'Иван Петров' })],
      [prepiska({ id: 'P-1', kontakt: 'Мария Илиева' })],
    );
    expect(redove.map((r) => r.ime)).toEqual(['Иван Петров', 'Мария Илиева']);
    expect(redove.find((r) => r.ime === 'Мария Илиева')!.zapisan).toBe(false);
    expect(redove.find((r) => r.ime === 'Иван Петров')!.zapisan).toBe(true);
  });

  it('и брои преписките на всеки · по СВЕДЕНОТО име', () => {
    const redove = kontaktite(
      [kontakt({ ime: 'Иван Петров' })],
      [
        prepiska({ id: 'P-1', kontakt: 'иван петров' }),
        prepiska({ id: 'P-2', kontakt: 'Иван  Петров ' }),
      ],
    );
    expect(redove).toHaveLength(1);
    expect(redove[0]!.prepiski).toBe(2);
  });

  it('а срещан ДВА пъти дава ЕДИН ред, не два', () => {
    const redove = kontaktite(
      [],
      [
        prepiska({ id: 'P-1', kontakt: 'Мария Илиева' }),
        prepiska({ id: 'P-2', kontakt: 'мария илиева' }),
      ],
    );
    expect(redove).toHaveLength(1);
    expect(redove[0]!.prepiski).toBe(2);
  });
});

// ── 7 · ЗА ВЗИМАНЕ ────────────────────────────────────────────────────────

describe('за взимане', () => {
  const s = [
    prepiska({ id: 'A', kontakt: 'Иван', zaVzimane: '2026-09-20' }),
    prepiska({ id: 'B', kontakt: 'Иван', zaVzimane: '2026-09-05' }),
    prepiska({ id: 'C', kontakt: 'Иван' }),
    prepiska({ id: 'D', kontakt: 'Иван', zaVzimane: '2026-09-01', sastoyanie: 'взето' }),
    prepiska({ id: 'E', kontakt: 'Иван', zaVzimane: '2026-09-02', sastoyanie: 'отпаднало' }),
  ];

  it('са само чакащите С ДАТА · подредени по нея', () => {
    expect(zaVzimane(s).map((p) => p.id)).toEqual(['B', 'A']);
  });

  it('без дата НЕ влиза · подразбран срок не се измисля', () => {
    expect(zaVzimane(s).map((p) => p.id)).not.toContain('C');
  });

  it('нито взетото, нито отпадналото', () => {
    expect(zaVzimane(s).map((p) => p.id)).not.toContain('D');
    expect(zaVzimane(s).map((p) => p.id)).not.toContain('E');
  });
});

// ── 8 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката', () => {
  it('брои преписките по контакти · и нулата се записва', () => {
    const k = [kontakt({ ime: 'Иван Петров' })];
    const p = [
      prepiska({ id: 'P-1', kontakt: 'Иван Петров' }),
      prepiska({ id: 'P-2', kontakt: 'Мария Илиева' }),
    ];
    const s = sveriKontaktite(k, p, KOGATO);
    expect(s.vhod).toBe(2);
    expect(s.izhod).toBe(2);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('и празният списък дава ЧЕСТНА нула', () => {
    expect(sveriKontaktite([], [], KOGATO).nared).toBe(true);
  });

  it('а преписка с ПРАЗЕН контакт я счупва · тя не увисва тихо', () => {
    // Празният контакт не може да влезе през Вратата, но може да дойде от
    // чужда верига или върнат архив — и тогава сверката го КАЗВА.
    const s = sveriKontaktite([], [prepiska({ id: 'P-1', kontakt: '   ' })], KOGATO);
    expect(s.izhod).toBe(0);
    expect(s.razlika).toBe(-1);
    expect(s.nared).toBe(false);
  });
});
