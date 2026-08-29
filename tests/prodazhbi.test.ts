/**
 * ПРОДАЖБИТЕ · сделката, петнайсетте колони и терминалът (резен 18б).
 *
 * Осемте обещания:
 *
 *   1. Петнайсетте колони са НЕГОВИТЕ, в НЕГОВИЯ ред · броят се, не се четат.
 *   2. „проверка" = ПД + СМР срещу сбора на ВНОСКИТЕ · и нищо друго.
 *   3. Връщането и неустойката НЕ влизат в нея — „никакво нетиране" (И97).
 *   4. Посоката се СМЯТА от знака · няма поле за нея (правило 20).
 *   5. Архивът е ЕДНОПОСОЧЕН · нито поправка, нито ново движение.
 *   6. Сторното на вноска я вади от проверката · редът в Журнала ОСТАВА.
 *   7. Сторното на СЪЗДАВАНЕТО убива сделката · тя не възкръсва от поправка си.
 *   8. Сверка вход↔изход върху движенията · и увисналото се БРОИ.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  CHAKAT_NEGOVA_DUMA,
  eVnoska,
  GreshkaProdazhba,
  imeNaSastoyanieto,
  izvanProverkata,
  KOLONI,
  obektIMyasto,
  podredeni,
  posokata,
  proverkata,
  redovete,
  SASTOYANIYA,
  sashtnostNaProdazhba,
  sveri,
  vArhiva,
  VIDOVE_DVIZHENIE,
  ZATVORENI,
} from '../src/domein/prodazhbi.js';
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
    chasovnik: () => new Date(Date.UTC(2026, 7, 29, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) =>
  fold(await dnevnik.chetiVsichki(NAEMATEL));

/** Един имот и една сделка върху него · общото начало на почти всеки тест. */
async function sasSdelka(sastoyanie = 'tekushta') {
  const { dnevnik, deystviya } = stend();
  await deystviya.dobaviImot(
    'IM-1',
    { adres: 'Малинова долина, бл. 3', edinitsa: 'ап. 12', ploshtad_kvsm: 8_240_000 },
    { opId: 'op-imot' },
  );
  await deystviya.zapishiProdazhba(
    {
      prodazhbaId: 'PR-1',
      imotId: 'IM-1',
      kupuvach: 'Иван Петров',
      telefon: '0888123456',
      tsena_st: 25_000_00,
      prodazhba_st: 24_000_00,
      smr_st: 14_000_00,
      pd_st: 10_000_00,
      sastoyanie,
    },
    { opId: 'op-sdelka' },
  );
  return { dnevnik, deystviya };
}

describe('петнайсетте колони са НЕГОВИ', () => {
  it('1 · имената и редът се БРОЯТ, не се четат на око', () => {
    expect(KOLONI).toHaveLength(15);
    // Собствената му корекция: седемте след „СМР €" в ТОЗИ ред.
    expect(KOLONI.slice(7)).toEqual([
      'ПД',
      'Капаро',
      'НС',
      'НС кеш',
      'Акт 15',
      'Акт 16',
      'проверка',
      'Състояние',
    ]);
    // Обект и Място са първите две · те идват от имота.
    expect(KOLONI.slice(0, 2)).toEqual(['Обект', 'Място']);
  });

  it('затворени са ТРИ · двете от имота и сметката', () => {
    expect(ZATVORENI).toEqual([0, 1, 13]);
    expect(ZATVORENI.map((i) => KOLONI[i])).toEqual(['Обект', 'Място', 'проверка']);
  });

  it('състоянията са ЧЕТИРИ · и точно едно е архив', () => {
    expect(SASTOYANIYA.filter((s) => s.arhiv).map((s) => s.klyuch)).toEqual(['prodadena']);
    expect(vArhiva('prodadena')).toBe(true);
    expect(vArhiva('tekushta')).toBe(false);
    // Непознатата стойност НЕ е архив · инак печатна грешка би заключила сделка.
    expect(vArhiva('продадена')).toBe(false);
    expect(imeNaSastoyanieto('nezadadeno')).toBe('не е зададено');
  });

  it('етапите след Акт 15 ЧАКАТ него · и това се БРОИ, не се твърди', () => {
    // ADR-033 §7 ги отложи ИМЕННО за този резен. Празен списък би значел
    // „всичко е решено" — затова числото стои, а не изречение в коментар.
    expect(CHAKAT_NEGOVA_DUMA.length).toBe(3);
    expect(CHAKAT_NEGOVA_DUMA.join(' ')).toContain('Акт 15');
  });

  it('Обект и Място се ЧЕТАТ от имота · не се преписват', async () => {
    const { dnevnik } = await sasSdelka();
    const o = await ogledaloto(dnevnik);
    const p = o.prodazhbi.get('PR-1')!;
    expect(obektIMyasto(p, o.imoti)).toEqual({
      obekt: 'ап. 12',
      myasto: 'Малинова долина, бл. 3',
    });
    // Изчезне ли имотът, двете са ПРАЗНИ, не измислени.
    expect(obektIMyasto(p, new Map())).toEqual({ obekt: '', myasto: '' });
  });
});

describe('проверката · неговата формула', () => {
  it('2 · сделката е ПД + СМР, а вноските се вадят от нея', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      {
        dvizhenieId: 'DV-1',
        prodazhbaId: 'PR-1',
        vid: 'Капаро',
        suma_st: 2_000_00,
        data: '2026-03-01',
        belezhka: 'капаро при предварителния',
      },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      {
        dvizhenieId: 'DV-2',
        prodazhbaId: 'PR-1',
        vid: 'Акт 15',
        suma_st: 8_000_00,
        data: '2026-06-15',
        belezhka: '',
      },
      { opId: 'op-2' },
    );
    const o = await ogledaloto(dnevnik);
    const p = proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi);
    expect(p.sdelka_st).toBe(24_000_00); // 10 000 ПД + 14 000 СМР
    expect(p.vnoski_st).toBe(10_000_00);
    expect(p.razlika_st).toBe(14_000_00);
    expect(p.duma).toBe('остава да плати');
  });

  it('изплатената дава НУЛА · и нулата си има дума', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'НС', suma_st: 24_000_00, data: '2026-07-01', belezhka: '' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    expect(proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi).duma).toBe('изплатена');
  });

  it('3 · връщането и неустойката НЕ влизат · „никакво нетиране"', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 2_000_00, data: '2026-03-01', belezhka: '' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-2', prodazhbaId: 'PR-1', vid: 'връщане', suma_st: -1_500_00, data: '2026-05-01', belezhka: 'върнато капаро' },
      { opId: 'op-2' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-3', prodazhbaId: 'PR-1', vid: 'неустойка', suma_st: 500_00, data: '2026-05-01', belezhka: 'по чл. 8' },
      { opId: 'op-3' },
    );
    const o = await ogledaloto(dnevnik);
    const p = proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi);
    // ВНОСКИТЕ са само 2 000 · другите две стоят ОТДЕЛНО
    expect(p.vnoski_st).toBe(2_000_00);
    const izvan = izvanProverkata('PR-1', o.dvizheniyaNaProdazhbi);
    expect(izvan.vrashtane_st).toBe(-1_500_00);
    expect(izvan.neustoyka_st).toBe(500_00);
    // и ДВЕТЕ числа стоят поотделно · слети, това щеше да е нетирането
    expect(izvan.vrashtane_st + izvan.neustoyka_st).not.toBe(izvan.neustoyka_st);
  });

  it('еВноска дели седемте вида на пет и две', () => {
    expect(VIDOVE_DVIZHENIE).toHaveLength(7);
    expect(VIDOVE_DVIZHENIE.filter((v) => v.vnoska)).toHaveLength(5);
    expect(eVnoska('Акт 16')).toBe(true);
    expect(eVnoska('неустойка')).toBe(false);
    // непознатият вид НЕ е вноска · инак печатна грешка би влязла в сметката
    expect(eVnoska('акт 16')).toBe(false);
  });

  it('4 · посоката се СМЯТА от знака · няма поле за нея', () => {
    expect(posokata(500_00)).toBe('prihod');
    expect(posokata(-500_00)).toBe('razhod');
    expect(posokata(0)).toBe('nula');
  });
});

describe('терминалът · Продажби Архив', () => {
  it('5 · продадената сделка НЕ се презаписва', async () => {
    const { deystviya } = await sasSdelka('prodadena');
    await expect(
      deystviya.zapishiProdazhba(
        {
          prodazhbaId: 'PR-1',
          imotId: 'IM-1',
          kupuvach: 'Друг купувач',
          telefon: '',
          tsena_st: 0,
          prodazhba_st: 0,
          smr_st: 0,
          pd_st: 0,
          sastoyanie: 'tekushta',
        },
        { opId: 'op-nazad' },
      ),
    ).rejects.toThrow(GreshkaProdazhba);
  });

  it('и НЕ приема ново движение · там само се сверява', async () => {
    const { deystviya } = await sasSdelka('prodadena');
    await expect(
      deystviya.zapishiDvizhenieNaProdazhba(
        { dvizhenieId: 'DV-9', prodazhbaId: 'PR-1', vid: 'Акт 16', suma_st: 100_00, data: '2026-09-01', belezhka: '' },
        { opId: 'op-late' },
      ),
    ).rejects.toThrow(GreshkaProdazhba);
  });

  it('трите отказа на Вратата имат РАЗЛИЧНИ думи', async () => {
    const { deystviya } = await sasSdelka();
    const dumi: string[] = [];
    const hvani = async (f: () => Promise<unknown>) => {
      try {
        await f();
      } catch (e) {
        dumi.push((e as Error).message);
      }
    };
    await hvani(() =>
      deystviya.zapishiProdazhba(
        { prodazhbaId: 'PR-2', imotId: 'НЯМА', kupuvach: '', telefon: '', tsena_st: 0, prodazhba_st: 0, smr_st: 0, pd_st: 0, sastoyanie: 'tekushta' },
        { opId: 'o1' },
      ),
    );
    await hvani(() =>
      deystviya.zapishiProdazhba(
        { prodazhbaId: 'PR-3', imotId: 'IM-1', kupuvach: '', telefon: '', tsena_st: 0, prodazhba_st: 0, smr_st: 0, pd_st: 0, sastoyanie: 'изпечена' },
        { opId: 'o2' },
      ),
    );
    await hvani(() =>
      deystviya.zapishiDvizhenieNaProdazhba(
        { dvizhenieId: 'DV-X', prodazhbaId: 'PR-1', vid: 'бакшиш', suma_st: 1, data: '2026-01-01', belezhka: '' },
        { opId: 'o3' },
      ),
    );
    expect(dumi).toHaveLength(3);
    expect(new Set(dumi).size).toBe(3);
    expect(dumi[0]).toContain('имот');
    expect(dumi[1]).toContain('състояние');
    expect(dumi[2]).toContain('вид движение');
  });
});

describe('сторното · добавя, не отменя', () => {
  it('6 · сторнирана вноска излиза от проверката · но остава в Журнала', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 2_000_00, data: '2026-03-01', belezhka: '' },
      { opId: 'op-1' },
    );
    const predi = await ogledaloto(dnevnik);
    const vnoskaSeq = predi.dvizheniyaNaProdazhbi[0]!.seq;
    expect(proverkata(predi.prodazhbi.get('PR-1')!, predi.dvizheniyaNaProdazhbi).vnoski_st).toBe(2_000_00);

    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: vnoskaSeq, prichina: 'сделката се разваля' },
      { opId: 'op-storno' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(sled.dvizheniyaNaProdazhbi).toHaveLength(0);
    expect(proverkata(sled.prodazhbi.get('PR-1')!, sled.dvizheniyaNaProdazhbi).vnoski_st).toBe(0);
    // „Сторното не отменя — то ДОБАВЯ": Журналът РАСТЕ, не се свива.
    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    expect(vsichki.filter((s) => s.type === 'ДвижениеПоПродажба')).toHaveLength(1);
    expect(vsichki.filter((s) => s.type === 'Сторно')).toHaveLength(1);
  });

  it('7 · сторното на СЪЗДАВАНЕТО убива сделката · тя не възкръсва от поправка', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    const predi = await ogledaloto(dnevnik);
    const sazdadena = predi.prodazhbi.get('PR-1')!.seq;

    await deystviya.zapishiProdazhba(
      {
        prodazhbaId: 'PR-1',
        imotId: 'IM-1',
        kupuvach: 'Иван Петров',
        telefon: '0888123456',
        tsena_st: 25_000_00,
        prodazhba_st: 24_000_00,
        smr_st: 14_000_00,
        pd_st: 10_000_00,
        sastoyanie: 'tekushta',
        prichina: 'сгрешен телефон',
      },
      { opId: 'op-popravka' },
    );
    await deystviya.storniraj(
      'ST-2',
      { pogasyavaSeq: sazdadena, prichina: 'сделката не е ставала' },
      { opId: 'op-storno' },
    );

    const sled = await ogledaloto(dnevnik);
    // ТОЧНО дупката, заради която делото възкръсваше от собствената си поправка.
    expect(sled.prodazhbi.has('PR-1')).toBe(false);
  });
});

describe('таблицата · редовете, подредбата и сверката', () => {
  it('редът носи вноските ПО ВИД и последната им дата', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 1_000_00, data: '2026-03-01', belezhka: '' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-2', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 1_000_00, data: '2026-04-01', belezhka: 'втора вноска' },
      { opId: 'op-2' },
    );
    const r = redovete(await ogledaloto(dnevnik));
    expect(r).toHaveLength(1);
    // ДВЕ вноски от един вид се СЪБИРАТ · датата е на ПОСЛЕДНАТА
    expect(r[0]!.vnoski['Капаро']).toBe(2_000_00);
    expect(r[0]!.dati['Капаро']).toBe('2026-04-01');
    expect(r[0]!.dati['Акт 16']).toBe('');
  });

  it('подредбата слага АРХИВНИТЕ най-долу · „завършените долу"', async () => {
    const { dnevnik, deystviya } = await sasSdelka('prodadena');
    await deystviya.zapishiProdazhba(
      {
        prodazhbaId: 'PR-2',
        imotId: 'IM-1',
        kupuvach: 'Втори',
        telefon: '',
        tsena_st: 0,
        prodazhba_st: 0,
        smr_st: 0,
        pd_st: 5_000_00,
        sastoyanie: 'tekushta',
      },
      { opId: 'op-2' },
    );
    const podredba = podredeni(redovete(await ogledaloto(dnevnik)));
    expect(podredba.map((r) => r.prodazhba.id)).toEqual(['PR-2', 'PR-1']);
  });

  it('8 · сверка вход↔изход · и увисналото движение се БРОИ', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'НС', suma_st: 500_00, data: '2026-03-01', belezhka: '' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    const s = sveri(o, redovete(o));
    expect(s.vhod).toBe(1);
    expect(s.izhod).toBe(1);
    expect(s.razlika).toBe(0); // проверената нула се записва (правило 7)
    expect(s.bezSdelka).toEqual([]);

    // УВИСНАЛОТО · сглобено на ръка, защото Вратата не го пуска (и това е добре)
    const bezSdelka = sveri(
      { ...o, prodazhbi: new Map() } as typeof o,
      [],
    );
    expect(bezSdelka.razlika).toBe(1);
    expect(bezSdelka.bezSdelka).toEqual(['DV-1']);
  });

  it('адресът на сделката е ЕДИН · и започва с PRD:', () => {
    expect(sashtnostNaProdazhba('PR-1')).toBe('PRD:PR-1');
  });
});
