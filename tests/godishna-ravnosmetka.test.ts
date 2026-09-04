/**
 * ГОДИНАТА СЕ ЗАТВАРЯ · и разминаването се МЕРИ (резен 28 · ADR-088).
 *
 * Негова дума: „Става на календарна година автоматично прави пълен годишен
 * архив и променяш само през журнала назад" *(р85·[51])*.
 *
 * Деветте обещания:
 *
 *   1. Годината на един запис е СОБСТВЕНАТА му дата, не часът на натискането.
 *   2. Текущата година НЕ се затваря · непълна година не е архив.
 *   3. Празна година НЕ се затваря · затваряне на нищо е надпис.
 *   4. Второто затваряне не създава втори запис · `opId` носи действието.
 *   5. Нов запис в затворена година дава разминаване **+1**.
 *   6. СТОРНО на запис от затворена година дава **−1** · знакът значи нещо.
 *   7. Затворената година НЕ отказва нито един запис · мери се.
 *   8. Сторно на затварянето връща годината в „чака" · и тя пак се предлага.
 *   9. Броят и сборът се сверяват по ВТОРИ независим път · и нулата се казва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  chakashtiteGodini,
  godinataNa,
  godinite,
  GreshkaGodina,
  proveriZatvaryane,
  sveriGodinata,
  tekushtataGodina,
} from '../src/domein/godishna-ravnosmetka.js';
import {
  imetoNaGodishniyaFayl,
  listNaMesetsite,
  listNaRavnosmetkata,
  listNaZhurnala,
  mesetsiteNa,
} from '../src/iznos/godishen-fayl.js';
import { pogaseniteZvena } from '../src/domein/storno.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const DNES = '2026-08-30';
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
    // ЧАСОВНИКЪТ е в 2026 · нарочно, за да се различи „кога е натиснато"
    // от „за коя година е записът" (обещание 1).
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const razhod = (data: string, suma_st = tsentove(240_00)) => ({
  potok: 'fakturi',
  dostavchik: 'Баумит ЕООД',
  opis: 'вар и цимент',
  suma_st,
  sektor: 'pokupki-materiali',
  nachin: 'банка' as const,
  data,
  dokument: '0000001234',
  stavka: 20,
});

/** Един разход от 2025, въведен днес (2026) · после годината се затваря. */
async function sZatvorena2025() {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiRazhod('RZ-25', razhod('2025-11-12'), { opId: 'op-1' });
  await deystviya.zatvoriGodinata('2025', DNES, { opId: 'GODINA:2025' });
  return { dnevnik, deystviya };
}

// ── 1 · ДАТАТА НА ЗАПИСА, НЕ ЧАСЪТ НА НАТИСКАНЕТО ─────────────────────────

describe('годината на един запис', () => {
  it('е СОБСТВЕНАТА му дата, а не денят, в който е натиснато', async () => {
    const { dnevnik } = await sZatvorena2025();
    const o = await ogledaloto(dnevnik);

    // Часовникът на стенда е 2026; датата на разхода е 2025.
    // КАРТАТА Е ГОЛО ЧИСЛО · сбор на годината би събрал наем, разход и внесено
    // ДДС в едно число, което не значи нищо счетоводно (находка в собствения ми
    // резен), а тип с едно поле само преписва ключа.
    expect(o.godinite.get('2025')).toBe(1);
    expect(o.godinite.has('2026')).toBe(true); // само затварянето
    expect(o.godinite.get('2026')).toBe(1);
  });

  it('и се чете от ЕДИН дом · `godinataNa` върху самото събитие', async () => {
    const { dnevnik } = await sZatvorena2025();
    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    const razhodat = potok.find((s) => s.type === 'РазходЗаписан')!;
    expect(godinataNa(razhodat)).toBe('2025');
    expect(String(razhodat.ts).slice(0, 4)).toBe('2026');
  });

  it('текущата година идва от ПОДАДЕНИЯ ден · часовникът е довод', () => {
    expect(tekushtataGodina(DNES)).toBe('2026');
    expect(tekushtataGodina('2031-01-01')).toBe('2031');
  });
});

// ── 2 и 3 · КОЕТО ВРАТАТА НЕ ПУСКА ────────────────────────────────────────

describe('какво НЕ се затваря', () => {
  it('текущата година · непълна година не е архив', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-26', razhod('2026-08-12'), { opId: 'op-1' });

    await expect(
      deystviya.zatvoriGodinata('2026', DNES, { opId: 'GODINA:2026' }),
    ).rejects.toThrow(GreshkaGodina);
    const o = await ogledaloto(dnevnik);
    expect(o.zatvorenite.size).toBe(0);
  });

  it('и бъдеща година · същата причина, същите думи', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-26', razhod('2026-08-12'), { opId: 'op-1' });
    await expect(
      deystviya.zatvoriGodinata('2031', DNES, { opId: 'GODINA:2031' }),
    ).rejects.toThrow(/още върви/);
  });

  it('празна година · затваряне на нищо е надпис (ADR-041)', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-26', razhod('2026-08-12'), { opId: 'op-1' });
    await expect(
      deystviya.zatvoriGodinata('2019', DNES, { opId: 'GODINA:2019' }),
    ).rejects.toThrow(/нито един запис/);
  });

  it('и проверката говори с ДУМИ, а не с `false`', async () => {
    const { dnevnik } = await sZatvorena2025();
    const o = await ogledaloto(dnevnik);
    expect(() => proveriZatvaryane(o, '2026', DNES)).toThrow(GreshkaGodina);
    expect(() => proveriZatvaryane(o, '2025', DNES)).not.toThrow();
  });
});

// ── 4 · ИДЕМПОТЕНТНОСТТА ──────────────────────────────────────────────────

describe('второто затваряне', () => {
  it('не създава втори запис · `opId` носи ДЕЙСТВИЕТО', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    const r = await deystviya.zatvoriGodinata('2025', DNES, { opId: 'GODINA:2025' });
    expect(r.povtoreno).toBe(true);

    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
    const o = await ogledaloto(dnevnik);
    expect(o.zatvorenite.size).toBe(1);
  });
});

// ── 5 и 6 · РАЗМИНАВАНЕТО СЪС ЗНАК ────────────────────────────────────────

describe('разминаването след затварянето', () => {
  it('нов запис в затворена година дава +1', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    expect(godinite(await ogledaloto(dnevnik), DNES)[1]!.sastoyanie).toBe('zatvorena');

    await deystviya.zapishiRazhod('RZ-25б', razhod('2025-12-01'), { opId: 'op-2' });

    const red = godinite(await ogledaloto(dnevnik), DNES).find((r) => r.godina === '2025')!;
    expect(red.raznika).toBe(1);
    expect(red.sastoyanie).toBe('razminava');
  });

  it('СТОРНО на запис от затворена година дава −1 · знакът значи нещо', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);

    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-25')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );

    const red = godinite(await ogledaloto(dnevnik), DNES).find((r) => r.godina === '2025')!;
    // МИНУС, защото погасеното напуска картите (резен 27), а самото сторно
    // пада в СВОЯТА година — 2026. Проверка с `>` тук щеше да МЪЛЧИ.
    expect(red.raznika).toBe(-1);
    expect(red.sastoyanie).toBe('razminava');
  });

  it('и годината, в която пада сторното, е ДНЕШНАТА', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-25')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );
    const o = await ogledaloto(dnevnik);
    // Картата брои ЖИВИТЕ записи: щом единственият на 2025 е погасен, годината
    // изобщо не е в нея. Читателят (`godinite()`) я показва пак — от
    // затварянето — и точно затова смята липсата като нула, а не гърми.
    expect(o.godinite.has('2025')).toBe(false);
    expect(o.godinite.has('2026')).toBe(true);
  });
});

// ── 7 · ГОДИНАТА НЕ ОТКАЗВА ───────────────────────────────────────────────

describe('затворената година', () => {
  it('НЕ отказва нито един запис · тя КАЗВА, не спира', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();

    // Три различни записа С ДАТА в затворената година — и трите минават.
    await deystviya.zapishiRazhod('RZ-a', razhod('2025-01-05'), { opId: 'op-a' });
    await deystviya.zapishiRazhod('RZ-b', razhod('2025-06-06'), { opId: 'op-b' });
    await deystviya.zapishiRazhod('RZ-v', razhod('2025-12-31'), { opId: 'op-v' });

    const o = await ogledaloto(dnevnik);
    expect(o.razhodi.size).toBe(4);
    expect(godinite(o, DNES).find((r) => r.godina === '2025')!.raznika).toBe(3);
  });
});

// ── 8 · СТОРНОТО НА САМОТО ЗАТВАРЯНЕ ──────────────────────────────────────

describe('сторно на затварянето', () => {
  it('връща годината в „чака" · и тя ПАК се предлага', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);
    expect(chakashtiteGodini(predi, DNES)).toEqual([]);

    await deystviya.storniraj(
      'ST-G',
      { pogasyavaSeq: predi.zatvorenite.get('2025')!.seq, prichina: 'затворих грешна година' },
      { opId: 'op-st-g' },
    );

    const sled = await ogledaloto(dnevnik);
    expect(sled.zatvorenite.size).toBe(0);
    expect(chakashtiteGodini(sled, DNES)).toEqual(['2025']);
    expect(godinite(sled, DNES).find((r) => r.godina === '2025')!.sastoyanie).toBe('chaka');
  });
});

// ── 9 · СВЕРКАТА · и нулата се КАЗВА ──────────────────────────────────────

describe('сверката на годината', () => {
  it('брои НАНОВО от книгата · вход↔изход, и нулата се записва', async () => {
    const { dnevnik } = await sZatvorena2025();
    const o = await ogledaloto(dnevnik);
    const s = sveriGodinata(o, '2025', await dnevnik.chetiVsichki(NAEMATEL), KOGATO);

    expect(s.vhod).toBe(1);
    expect(s.izhod).toBe(1);
    expect(s.razlika).toBe(0);
    expect(s.nared).toBe(true);
    expect(s.kakvo).toContain('2025');
  });

  it('и НЕ вижда погасеното · вторият път сам смята сторната', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-25')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );

    const o = await ogledaloto(dnevnik);
    const s = sveriGodinata(o, '2025', await dnevnik.chetiVsichki(NAEMATEL), KOGATO);
    expect(s.vhod).toBe(0);
    expect(s.izhod).toBe(0);
    expect(s.nared).toBe(true);
  });

  it('НУЛАТА се казва · книга без приключила година няма какво да чака', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-26', razhod('2026-08-12'), { opId: 'op-1' });
    const o = await ogledaloto(dnevnik);

    expect(chakashtiteGodini(o, DNES)).toEqual([]);
    expect(godinite(o, DNES)).toHaveLength(1);
    expect(godinite(o, DNES)[0]!.sastoyanie).toBe('tekushta');
  });
});

// ── 10 · ФАЙЛЪТ · сглобява се, не се пази ─────────────────────────────────

describe('годишният файл', () => {
  it('лист „Журнал" носи САМО записите на годината', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    await deystviya.zapishiRazhod('RZ-26', razhod('2026-03-03'), { opId: 'op-26' });
    const potok = await dnevnik.chetiVsichki(NAEMATEL);

    const list = listNaZhurnala(potok, '2025');
    expect(list.redove).toHaveLength(1);
    expect(list.redove[0]![1]).toBe('2025-11-12');
    expect(list.redove[0]![5]).toBe(240); // евро като ЧИСЛО, не текст
  });

  it('и СТОРНИРАНОТО остава в него, отбелязано', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-25')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );

    const list = listNaZhurnala(await dnevnik.chetiVsichki(NAEMATEL), '2025');
    expect(list.redove).toHaveLength(1);
    expect(list.redove[0]![6]).toBe('да');
  });

  it('лист „Месеците" е ВИНАГИ дванайсет реда · и празният месец е нула', async () => {
    const { dnevnik } = await sZatvorena2025();
    const list = listNaMesetsite(await dnevnik.chetiVsichki(NAEMATEL), '2025');

    expect(mesetsiteNa('2025')).toHaveLength(12);
    expect(list.redove).toHaveLength(12);
    expect(list.redove[10]).toEqual(['2025-11', 1, 240]);
    expect(list.redove[0]).toEqual(['2025-01', 0, 0]);
  });

  it('лист „Равносметка" КАЗВА разминаването · и когато е нула', async () => {
    const { dnevnik } = await sZatvorena2025();
    const list = listNaRavnosmetkata(await ogledaloto(dnevnik), '2025', DNES);
    const poIme = new Map(list.redove.map((r) => [String(r[0]), r[1]]));

    expect(poIme.get('Състояние')).toBe('zatvorena');
    expect(poIme.get('Разминаване, записи')).toBe(0);
    expect(poIme.get('Затворена от')).toBe('vintexstroy@gmail.com');
  });

  it('името е на ЛАТИНИЦА · инак `<a download>` го подменя', () => {
    expect(imetoNaGodishniyaFayl('2025')).toBe('GODINA-2025.xlsx');
    expect(/^[\x20-\x7e]+$/.test(imetoNaGodishniyaFayl('2025'))).toBe(true);
  });
});

// ── 11 · ЕДИН ДОМ за „кои звена са погасени" ──────────────────────────────

describe('погасените звена', () => {
  it('се смятат от ЕДИН дом · сверката и файлът питат него', async () => {
    const { dnevnik, deystviya } = await sZatvorena2025();
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-25')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );

    const potok = await dnevnik.chetiVsichki(NAEMATEL);
    const zvena = pogaseniteZvena(potok);

    // ДВЕ · погасеният разход И самото сторно (то е поправката, не поправеното).
    expect(zvena.size).toBe(2);
    // И ключът е `верига#seq`, не голо `seq` (ADR-055).
    for (const z of zvena) expect(z).toMatch(/^vintexstroy#\d+$/);
  });

  it('и празната книга дава празно множество · без гадаене', () => {
    expect(pogaseniteZvena([]).size).toBe(0);
  });
});
