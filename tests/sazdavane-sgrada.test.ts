/**
 * „СЪЗДАЙ СГРАДА" · Калкулаторът и РАЖДА (резен 29 · ADR-089).
 *
 * Негова дума: „да ще е най интересно да има създай сграда там . Качваш
 * таблицата и управлваш" *(р83·[20])*, и обхватът от същия ден: „всипки се
 * създават от Упрсвление. Само от там.. При сгради ще е от калкулатова"
 * *(р83·[18])*.
 *
 * Седемте обещания:
 *
 *   1. Качено площообразуване ражда ИМОТИ под неговото име на сграда.
 *   2. Второто натискане НЕ удвоява · `opId` носи адреса на действието.
 *   3. И вече съществувалите се БРОЯТ, вместо да се прескачат тихо.
 *   4. Празно име отказва с ДУМИ · нула обекта също.
 *   5. Площта идва от ЕДИН дом · и е ЧИСТАТА, за да не преоцени вече родените.
 *   6. Сверката брои вход↔изход · и нулата се записва.
 *   7. Различни сгради НЕ се смесват · един и същ обект в две сгради е два имота.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  GreshkaSazdavane,
  klyuchNaImota,
  opIdNaObekta,
  ploshttaZaImota,
  proveriImetoNaSgradata,
  sveriSazdavaneto,
  zaVpisvane,
} from '../src/kalkulator/sazdavane.js';
import type { ProchetenObekt } from '../src/kalkulator/chetene.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const ADRES = 'ул. Иван Вазов 12, Пловдив';
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
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const obekt = (ime: string, chista: number, obshta: number): ProchetenObekt => ({
  obekt: ime,
  vid: 'apartament',
  etazh: 'първи',
  kota: 'кота ±0,00',
  chista_kvsm: chista,
  obshta_kvsm: obshta,
  dvor_kvsm: 0,
});

const TRITE: readonly ProchetenObekt[] = Object.freeze([
  obekt('Апартамент 1', 65_00_00, 78_00_00),
  obekt('Апартамент 2', 82_50_00, 99_00_00),
  obekt('Гараж 3', 18_00_00, 21_00_00),
]);

/** Ражда обектите точно както екранът · през Вратата, с адреса за `opId`. */
async function rodi(
  deystviya: Deystviya,
  obekti: readonly ProchetenObekt[],
  adres = ADRES,
): Promise<void> {
  for (const ob of obekti) {
    await deystviya.dobaviImot(
      // Идентичността на ИМОТА носи и адреса: без него един и същ обект в две
      // сгради би заел един ключ в Огледалото. Екранът ползва `randomUUID`, но
      // стендът иска повторимо име — а разликата не бива да крие сблъсъка.
      `I:${adres}:${ob.obekt}`,
      { adres, edinitsa: ob.obekt, ploshtad_kvsm: ploshttaZaImota(ob) },
      { opId: opIdNaObekta(adres, ob.obekt) },
    );
  }
}

// ── 1 · РАЖДАНЕТО ─────────────────────────────────────────────────────────

describe('качено площообразуване', () => {
  it('ражда ИМОТИ под неговото име на сградата', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, TRITE);

    const o = await ogledaloto(dnevnik);
    expect(o.imoti.size).toBe(3);
    const imena = [...o.imoti.values()].map((i) => `${i.adres} · ${i.edinitsa}`);
    expect(imena).toContain(`${ADRES} · Апартамент 1`);
    expect(imena).toContain(`${ADRES} · Гараж 3`);
  });

  it('и НИЩО друго · дела не се раждат (обявено, и мерено)', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, TRITE);

    const o = await ogledaloto(dnevnik);
    expect(o.dela.size).toBe(0);
    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    expect(potok.every((s) => s.type === 'ИмотДобавен')).toBe(true);
  });
});

// ── 2 и 3 · ИДЕМПОТЕНТНОСТТА ──────────────────────────────────────────────

describe('второто натискане', () => {
  it('НЕ удвоява · `opId` носи адреса на действието, не случайно число', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, TRITE);
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    await rodi(deystviya, TRITE);

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
    expect((await ogledaloto(dnevnik)).imoti.size).toBe(3);
  });

  it('и Вратата го КАЗВА · повторението не е тих успех', async () => {
    const { deystviya } = stend();
    await rodi(deystviya, [TRITE[0]!]);
    const r = await deystviya.dobaviImot(
      'I:друг-id',
      { adres: ADRES, edinitsa: 'Апартамент 1', ploshtad_kvsm: 1 },
      { opId: opIdNaObekta(ADRES, 'Апартамент 1') },
    );
    expect(r.povtoreno).toBe(true);
  });

  /**
   * ЗАСТЪПВАНЕТО · единственото, което САМО `opId`-ът пази.
   *
   * ═══ НАМЕРЕНО ОТ СЧУПВАНЕ, КОЕТО МИНА ═══
   *
   * Замених `opId`-а от адреса със случаен — точно както прави по-старият път
   * — и ПРОХОДЪТ мина без нито една находка. Причината: `zaVpisvane` филтрира
   * вече съществувалите ПРЕДИ записа, тъй че при второ натискане до Вратата не
   * стига нищо и `opId`-ът изобщо не се пита.
   *
   * Тоест твърдението „проходът пази идемпотентността" беше НЕВЯРНО. Пази я
   * този тест: две ЕДНОВРЕМЕННИ раждания виждат едно и също Огледало, и двете
   * смятат обекта за нов — оттам нататък единственото, което спира дубликата,
   * е адресът на действието.
   */
  it('и при ЗАСТЪПВАНЕ · двете виждат едно Огледало, ражда се ЕДИН', async () => {
    const { dnevnik, deystviya } = stend();
    const danni = { adres: ADRES, edinitsa: 'Апартамент 1', ploshtad_kvsm: 65_00_00 };

    // Адресът се СМЯТА за всеки викащ поотделно — точно както в екрана, който
    // го вика на всяка итерация. Пресметнат веднъж и подаден два пъти, той щеше
    // да е един и същ дори да беше случаен: проверката щеше да е тавтология.
    await Promise.all([
      deystviya.dobaviImot('I:първи', danni, { opId: opIdNaObekta(ADRES, 'Апартамент 1') }),
      deystviya.dobaviImot('I:втори', danni, { opId: opIdNaObekta(ADRES, 'Апартамент 1') }),
    ]);

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(1);
    expect((await ogledaloto(dnevnik)).imoti.size).toBe(1);
  });

  it('вече съществувалите се БРОЯТ, вместо да се прескачат тихо', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, [TRITE[0]!]);

    const r = zaVpisvane(TRITE, ADRES, await ogledaloto(dnevnik));
    expect(r.veche).toBe(1);
    expect(r.novi).toHaveLength(2);
    expect(r.novi.map((x) => x.obekt)).toEqual(['Апартамент 2', 'Гараж 3']);
  });
});

// ── 4 · ОТКАЗИТЕ ──────────────────────────────────────────────────────────

describe('какво отказва с думи', () => {
  it('празно име на сграда', () => {
    expect(() => proveriImetoNaSgradata('')).toThrow(GreshkaSazdavane);
    expect(() => proveriImetoNaSgradata('   ')).toThrow(/няма име/);
  });

  it('и името се СВЕЖДА · „ Вазов 12 " е същата сграда като „Вазов 12"', () => {
    expect(proveriImetoNaSgradata('  Вазов 12  ')).toBe('Вазов 12');
  });

  it('нула прочетени обекта · бутон без последица е надпис', async () => {
    const { dnevnik } = stend();
    const o = await ogledaloto(dnevnik);
    expect(() => zaVpisvane([], ADRES, o)).toThrow(GreshkaSazdavane);
    expect(() => zaVpisvane([], ADRES, o)).toThrow(/нито един прочетен обект/);
  });
});

// ── 5 · ПЛОЩТА ────────────────────────────────────────────────────────────

describe('площта на имота', () => {
  it('е ЧИСТАТА · смяна би преоценила вече родените имоти', () => {
    expect(ploshttaZaImota(TRITE[0]!)).toBe(65_00_00);
    expect(ploshttaZaImota(TRITE[0]!)).not.toBe(TRITE[0]!.obshta_kvsm);
  });

  it('и идва от ЕДИН дом · записаното в Журнала е същото число', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, TRITE);
    const o = await ogledaloto(dnevnik);
    const ap1 = [...o.imoti.values()].find((i) => i.edinitsa === 'Апартамент 1')!;
    expect(ap1.ploshtad_kvsm).toBe(ploshttaZaImota(TRITE[0]!));
  });
});

// ── 6 · СВЕРКАТА ──────────────────────────────────────────────────────────

describe('сверката на партидата', () => {
  it('брои вход↔изход · и нулата се записва', () => {
    const s = sveriSazdavaneto(3, 0, 3, 0, KOGATO);
    expect(s.vhod).toBe(3);
    expect(s.izhod).toBe(3);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('пропуснатите редове влизат от ДВЕТЕ страни · те са прочетени, но без дом', () => {
    const s = sveriSazdavaneto(3, 2, 3, 0, KOGATO);
    expect(s.vhod).toBe(5);
    expect(s.izhod).toBe(5);
    expect(s.nared).toBe(true);
  });

  it('и ПАДА, когато нещо се загуби по пътя', () => {
    const s = sveriSazdavaneto(3, 0, 2, 0, KOGATO);
    expect(s.razlika).toBe(-1);
    expect(s.nared).toBe(false);
  });
});

// ── 7 · ДВЕ СГРАДИ ────────────────────────────────────────────────────────

describe('две различни сгради', () => {
  it('НЕ се смесват · един и същ обект в две сгради е ДВА имота', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, [TRITE[0]!], 'Вазов 12');
    await rodi(deystviya, [TRITE[0]!], 'Ботев 5');

    const o = await ogledaloto(dnevnik);
    expect(o.imoti.size).toBe(2);
    expect(opIdNaObekta('Вазов 12', 'Апартамент 1')).not.toBe(
      opIdNaObekta('Ботев 5', 'Апартамент 1'),
    );
  });

  it('и ключът им ги различава · адресът е част от него', () => {
    expect(klyuchNaImota('Вазов 12', 'Апартамент 1')).not.toBe(
      klyuchNaImota('Ботев 5', 'Апартамент 1'),
    );
  });

  it('а „вече го има" се пита ЗА СВОЯТА сграда', async () => {
    const { dnevnik, deystviya } = stend();
    await rodi(deystviya, [TRITE[0]!], 'Вазов 12');
    const o = await ogledaloto(dnevnik);

    expect(zaVpisvane([TRITE[0]!], 'Вазов 12', o).veche).toBe(1);
    expect(zaVpisvane([TRITE[0]!], 'Ботев 5', o).veche).toBe(0);
  });
});
