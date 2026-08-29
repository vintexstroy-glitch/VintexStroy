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
  etapite,
  eVnoska,
  GreshkaProdazhba,
  imeNaSastoyanieto,
  izvanProverkata,
  koloni,
  KOLONI,
  obektIMyasto,
  OTGOVORENITE,
  podredeni,
  posokata,
  proverkata,
  redovete,
  SASTOYANIYA,
  sashtnostNaProdazhba,
  sveri,
  vArhiva,
  VIDOVE_DVIZHENIE,
  vzemaniyaOtProdazhbi,
  ZATVORENI,
  CHAKA_DUMA_ZA_DDS,
  ETAP_KOYTO_ZATVARYA,
  prihodOtProdazhbi,
} from '../src/domein/prodazhbi.js';
import { SHA } from './pomoshtni.js';
import { IMENA_NA_KAM as VIDOVE_KAM_IMENA, sashtnostNaDokumenti } from '../src/domein/dokumenti.js';
import { imotatNaObekta, kartaNaImotite } from '../src/kalkulator/svarzvane.js';

const VIDOVE_KAM = Object.keys(VIDOVE_KAM_IMENA);

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

  it('трите въпроса имат негов ОТГОВОР · и нулата чакащи се БРОИ', () => {
    // На 29.08 и трите получиха отговор. Празният списък е СЪСТОЯНИЕ, не
    // пропуск — и точно затова насреща стои `OTGOVORENITE`: отговор, скрит в
    // коментар, не се вижда от онзи, който утре пита същото.
    expect(CHAKAT_NEGOVA_DUMA).toEqual([]);
    expect(OTGOVORENITE).toHaveLength(3);
    // и думите са НЕГОВИ, дословно · включително правописа му
    expect(OTGOVORENITE.map((x) => x.dumite).join(' ')).toContain('да рзвие своя бизнес');
    expect(OTGOVORENITE.map((x) => x.dumite).join(' ')).toContain('Няма лихва');
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
        nachin: 'банка',
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
        nachin: 'банка',
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
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'НС', suma_st: 24_000_00, data: '2026-07-01', belezhka: '', nachin: 'банка' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    expect(proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi).duma).toBe('изплатена');
  });

  it('3 · връщането и неустойката НЕ влизат · „никакво нетиране"', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 2_000_00, data: '2026-03-01', belezhka: '', nachin: 'банка' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-2', prodazhbaId: 'PR-1', vid: 'връщане', suma_st: -1_500_00, data: '2026-05-01', belezhka: 'върнато капаро', nachin: 'банка' },
      { opId: 'op-2' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-3', prodazhbaId: 'PR-1', vid: 'неустойка', suma_st: 500_00, data: '2026-05-01', belezhka: 'по чл. 8', nachin: 'банка' },
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
        { dvizhenieId: 'DV-9', prodazhbaId: 'PR-1', vid: 'Акт 16', suma_st: 100_00, data: '2026-09-01', belezhka: '', nachin: 'банка' },
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
        { dvizhenieId: 'DV-X', prodazhbaId: 'PR-1', vid: 'бакшиш', suma_st: 1, data: '2026-01-01', belezhka: '', nachin: 'банка' },
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
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 2_000_00, data: '2026-03-01', belezhka: '', nachin: 'банка' },
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
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 1_000_00, data: '2026-03-01', belezhka: '', nachin: 'банка' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-2', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 1_000_00, data: '2026-04-01', belezhka: 'втора вноска', nachin: 'банка' },
      { opId: 'op-2' },
    );
    const r = redovete(await ogledaloto(dnevnik));
    expect(r).toHaveLength(1);
    // ДВЕ вноски от един вид се СЪБИРАТ · датата е на ПОСЛЕДНАТА
    expect(r[0]!.poEtap['Капаро']).toBe(2_000_00);
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
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'НС', suma_st: 500_00, data: '2026-03-01', belezhka: '', nachin: 'банка' },
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

describe('етапите РАСТАТ · негова дума от 29.08', () => {
  it('нов етап става КОЛОНА · и застава ПРЕДИ „проверка"', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    expect(koloni(await ogledaloto(dnevnik))).toEqual(KOLONI);

    await deystviya.zapishiEtapNaProdazhba(
      { klyuch: 'Акт 17', vnoska: true },
      { opId: 'op-etap' },
    );
    const zhivi = koloni(await ogledaloto(dnevnik));
    expect(zhivi).toHaveLength(16);
    // ПРЕДИ проверката, защото тя е СБОР върху вноските
    expect(zhivi.indexOf('Акт 17')).toBe(zhivi.indexOf('проверка') - 1);
    // и НЕГОВИТЕ петнайсет пазят реда си помежду си
    expect(zhivi.filter((k) => KOLONI.includes(k))).toEqual(KOLONI);
  });

  it('добавеният етап ВЛИЗА в проверката, когато е обявен за вноска', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'Акт 17', vnoska: true }, { opId: 'e1' });
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'Акт 17', suma_st: 3_000_00, data: '2026-08-01', belezhka: '', nachin: 'банка' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    expect(proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi, etapite(o)).vnoski_st)
      .toBe(3_000_00);
  });

  it('а обявеният ИЗВЪН проверката НЕ влиза в нея', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'бонус', vnoska: false }, { opId: 'e1' });
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'бонус', suma_st: 3_000_00, data: '2026-08-01', belezhka: '', nachin: 'в брой' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    expect(proverkata(o.prodazhbi.get('PR-1')!, o.dvizheniyaNaProdazhbi, etapite(o)).vnoski_st)
      .toBe(0);
    // НО КОЛОНА ПАК ИМА · негово, 29.08: „ако реша да вкарам лихва на забавени
    // плащания сам да мога да направя колона". Мястото ѝ обаче е СЛЕД
    // „проверка" — колона преди сбор, която не влиза в него, се чете грешно.
    const zhivi = koloni(o);
    expect(zhivi).toContain('бонус');
    expect(zhivi.indexOf('бонус')).toBe(zhivi.indexOf('проверка') + 1);
  });

  it('НЕГОВИТЕ седем не се презаписват · дори с друго „вноска"', async () => {
    const { deystviya } = await sasSdelka();
    await expect(
      deystviya.zapishiEtapNaProdazhba({ klyuch: 'Капаро', vnoska: false }, { opId: 'e1' }),
    ).rejects.toThrow(GreshkaProdazhba);
    await expect(
      deystviya.zapishiEtapNaProdazhba({ klyuch: '   ', vnoska: true }, { opId: 'e2' }),
    ).rejects.toThrow(GreshkaProdazhba);
  });

  it('преименуването е НОВ запис за същия ключ · не втори етап', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'Акт 17', vnoska: true }, { opId: 'e1' });
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'Акт 17', vnoska: false }, { opId: 'e2' });
    const etapi = etapite(await ogledaloto(dnevnik));
    expect(etapi.filter((e) => e.klyuch === 'Акт 17')).toHaveLength(1);
    expect(etapi.find((e) => e.klyuch === 'Акт 17')!.vnoska).toBe(false);
  });
});

describe('начинът е ИЗБОР · „Даа има избор." (29.08)', () => {
  it('непознат начин се отказва ГЛАСНО', async () => {
    const { deystviya } = await sasSdelka();
    await expect(
      deystviya.zapishiDvizhenieNaProdazhba(
        { dvizhenieId: 'DV-X', prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 1, data: '2026-01-01', belezhka: '', nachin: 'бартер' },
        { opId: 'o1' },
      ),
    ).rejects.toThrow(GreshkaProdazhba);
  });

  it('и трите изброени минават · банка · карта · в брой', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    const nachini = ['банка', 'карта', 'в брой'];
    for (const [i, n] of nachini.entries()) {
      await deystviya.zapishiDvizhenieNaProdazhba(
        { dvizhenieId: `DV-${i}`, prodazhbaId: 'PR-1', vid: 'Капаро', suma_st: 100_00, data: '2026-03-01', belezhka: '', nachin: n },
        { opId: `o${i}` },
      );
    }
    const o = await ogledaloto(dnevnik);
    expect(o.dvizheniyaNaProdazhbi.map((d) => d.nachin)).toEqual(nachini);
  });
});

describe('неговите поправки от 29.08 · вечерта', () => {
  it('ЛИХВАТА може да е колона · и тя застава СЛЕД „проверка"', async () => {
    // Негов пример, дословно: „ако реша да вкарам лихва на забавени плащания
    // сам да мога да направя колона в таблицата". Той обори моето „само
    // вноските стават колони" — то щеше да блокира точно неговия случай.
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiEtapNaProdazhba(
      { klyuch: 'лихва', vnoska: false },
      { opId: 'e-lihva' },
    );
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'Акт 17', vnoska: true }, { opId: 'e-17' });
    const o = await ogledaloto(dnevnik);
    const zhivi = koloni(o);
    expect(zhivi).toHaveLength(17);
    // вноската ПРЕДИ сбора, лихвата СЛЕД него
    expect(zhivi.indexOf('Акт 17')).toBe(zhivi.indexOf('проверка') - 1);
    expect(zhivi.indexOf('лихва')).toBe(zhivi.indexOf('проверка') + 1);
    // и „Състояние" си остава ПОСЛЕДНА · стрелочникът не се мести
    expect(zhivi[zhivi.length - 1]).toBe('Състояние');
  });

  it('лихвата НЕ влиза в проверката · само стои до нея', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await deystviya.zapishiEtapNaProdazhba({ klyuch: 'лихва', vnoska: false }, { opId: 'e1' });
    await deystviya.zapishiDvizhenieNaProdazhba(
      { dvizhenieId: 'DV-1', prodazhbaId: 'PR-1', vid: 'лихва', suma_st: 120_00, data: '2026-09-01', belezhka: 'закъснение', nachin: 'банка' },
      { opId: 'op-1' },
    );
    const o = await ogledaloto(dnevnik);
    const r = redovete(o)[0]!;
    expect(r.proverka.vnoski_st).toBe(0);
    // но клетката ѝ НЕ е празна · инак колоната щеше да е надпис
    expect(r.poEtap['лихва']).toBe(120_00);
  });

  it('името на завършената се смени · КЛЮЧЪТ не', () => {
    // Негово: „Архив Продажби с ново име Продажби Завършени." Ключът остава
    // `prodadena`, защото Журналът вече го носи и не се преписва (правило 1).
    expect(imeNaSastoyanieto('prodadena')).toBe('продадена · завършена');
    expect(SASTOYANIYA.filter((x) => x.arhiv).map((x) => x.klyuch)).toEqual(['prodadena']);
  });

  it('документите се закачат и за ПРОДАЖБА · четвъртият адрес', () => {
    expect(VIDOVE_KAM).toContain('prodazhba');
    expect(sashtnostNaDokumenti('prodazhba', 'PR-1')).toBe('DOK:prodazhba:PR-1');
  });

  it('обектът намира ИМОТА си по вид и номер · инак сделка не се отваря', () => {
    const karta = kartaNaImotite([
      { id: 'IM-7', edinitsa: 'АП. № 7', naem_mesechen_st: 0 },
    ]);
    expect(imotatNaObekta('Апартамент 7', karta)).toBe('IM-7');
    // име без номер НЕ се връзва · и това е отказ, не догадка
    expect(imotatNaObekta('Мазе', karta)).toBeUndefined();
  });
});

// ── ИЗХОДЪТ НА СДЕЛКАТА · Вземания и Приход (резен 23 · ADR-083) ───────────

/** Едно движение по сделката · с СВОЯ дата, защото месецът се решава от нея. */
async function sDvizhenie(
  d: Deystviya,
  vid: string,
  suma_st: number,
  data: string,
  id = `PRD-${vid}`,
) {
  await d.zapishiDvizhenieNaProdazhba(
    {
      dvizhenieId: id,
      prodazhbaId: 'PR-1',
      vid,
      suma_st,
      data,
      belezhka: `${vid} по сделката`,
      nachin: 'банка',
    },
    { opId: `op-${id}` },
  );
}

describe('ВЗЕМАНИЯТА от продажби · закованата нула си намери източника', () => {
  it('сделка с капаро и без Акт 16 дължи ТОЧНО остатъка от проверката', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
    const o = await ogledaloto(dnevnik);

    const v = vzemaniyaOtProdazhbi(o);
    // сделката е ПД 10 000 + СМР 14 000 = 24 000; платено 5 000
    expect(v.sbor_st).toBe(19_000_00);
    expect(v.redove).toHaveLength(1);
    expect(v.redove[0]!.kupuvach).toBe('Иван Петров');
    // и числото е СЪЩОТО, което колоната „проверка" показва · един дом
    const red = redovete(o).find((r) => r.prodazhba.id === 'PR-1')!;
    expect(v.sbor_st).toBe(red.proverka.razlika_st);
  });

  it('движението „Акт 16" я ВАДИ · актът е границата (И90)', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
    expect((await ogledaloto(dnevnik)) && vzemaniyaOtProdazhbi(await ogledaloto(dnevnik)).sbor_st).toBe(
      19_000_00,
    );

    await sDvizhenie(deystviya, ETAP_KOYTO_ZATVARYA, 1_000_00, '2026-09-01');
    const v = vzemaniyaOtProdazhbi(await ogledaloto(dnevnik));
    expect(v.sbor_st).toBe(0);
    expect(v.redove).toEqual([]);
  });

  it('и АРХИВЪТ я вади · дори с неплатени суми по договор', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
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
        sastoyanie: 'prodadena',
      },
      { opId: 'op-arhiv' },
    );
    expect(vzemaniyaOtProdazhbi(await ogledaloto(dnevnik)).sbor_st).toBe(0);
  });

  it('НАДПЛАТЕНАТА сделка не прави вземането отрицателно · брои се', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 30_000_00, '2026-08-10');
    const v = vzemaniyaOtProdazhbi(await ogledaloto(dnevnik));
    expect(v.sbor_st).toBe(0);
    expect(v.redove).toEqual([]);
    // Тя не изчезва мълчаливо: БРОИ се, защото е задължение КЪМ купувача.
    expect(v.nadplateni).toEqual(['PR-1']);
  });

  it('СТОРНИРАНО движение вдига вземането обратно · без ред код за това', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
    const predi = await ogledaloto(dnevnik);
    expect(vzemaniyaOtProdazhbi(predi).sbor_st).toBe(19_000_00);

    const seq = predi.dvizheniyaNaProdazhbi.find((d) => d.id === 'PRD-Капаро')!.seq;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: seq, prichina: 'грешна сума' },
      { opId: 'op-storno' },
    );
    expect(vzemaniyaOtProdazhbi(await ogledaloto(dnevnik)).sbor_st).toBe(24_000_00);
  });
});

describe('ПРИХОДЪТ от вноски · „директно с датат"', () => {
  it('вноската влиза в месеца на СВОЯТА дата, не на сделката', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
    await sDvizhenie(deystviya, 'НС', 3_000_00, '2026-09-04');
    const o = await ogledaloto(dnevnik);

    expect(prihodOtProdazhbi(o, '2026-08')).toEqual({ suma_st: 5_000_00, broy: 1 });
    expect(prihodOtProdazhbi(o, '2026-09')).toEqual({ suma_st: 3_000_00, broy: 1 });
    expect(prihodOtProdazhbi(o, '2026-07')).toEqual({ suma_st: 0, broy: 0 });
  });

  it('ВРЪЩАНЕТО и НЕУСТОЙКАТА не влизат · „никакво нетиране"', async () => {
    const { dnevnik, deystviya } = await sasSdelka();
    await sDvizhenie(deystviya, 'Капаро', 5_000_00, '2026-08-10');
    await sDvizhenie(deystviya, 'връщане', -2_000_00, '2026-08-12');
    await sDvizhenie(deystviya, 'неустойка', 500_00, '2026-08-13');

    const o = await ogledaloto(dnevnik);
    expect(prihodOtProdazhbi(o, '2026-08')).toEqual({ suma_st: 5_000_00, broy: 1 });
    // а те си стоят на своя ред в таблицата — показани, не събрани
    const izvan = izvanProverkata('PR-1', o.dvizheniyaNaProdazhbi);
    expect(izvan.vrashtane_st).toBe(-2_000_00);
    expect(izvan.neustoyka_st).toBe(500_00);
  });

  it('движение по НЕСЪЩЕСТВУВАЩА сделка изобщо не се записва · Вратата го спира', async () => {
    const { deystviya } = await sasSdelka();
    await expect(
      deystviya.zapishiDvizhenieNaProdazhba(
        {
          dvizhenieId: 'PRD-X',
          prodazhbaId: 'PR-NYAMA',
          vid: 'Капаро',
          suma_st: 1_000_00,
          data: '2026-08-10',
          belezhka: 'висящо',
          nachin: 'банка',
        },
        { opId: 'op-visyashto' },
      ),
    ).rejects.toThrow();
  });

  it('ДДС-то ЧАКА негова дума · и се БРОИ, вместо да се начисли тихо', () => {
    expect(CHAKA_DUMA_ZA_DDS).toHaveLength(3);
    expect(CHAKA_DUMA_ZA_DDS.join(' ')).toContain('чл. 45');
  });
});
