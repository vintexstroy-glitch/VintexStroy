/**
 * СВЕРКАТА НА ВЕРИГИТЕ · шестте сблъсъка (ADR-055 · резен 4).
 *
 * Всеки от шестте е ТИХ без този файл: и двете вериги са цели, и двата записа
 * са минали законно през своята Врата, и никоя проверка не хвърля. Затова тук
 * се пази ПОИМЕННО — по един случай на вид, плюс огледалният му случай, който
 * НЕ трябва да свети.
 *
 * Правило 7 накрая: сверката се записва и когато е нула.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno, type Sabitie } from '../src/yadro/index.js';
import { sgani } from '../src/ogledalo/sgavane.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { sveriVerigite, type VidSblasak } from '../src/domein/sverka-verigi.js';
import { NASTAVKA_PISACH } from '../src/domein/akaunt.js';
import { SHA } from './pomoshtni.js';

const KNIGA = 'kniga';
const MIRA = `${KNIGA}${NASTAVKA_PISACH}mira@x.bg`;
const PETAR = `${KNIGA}${NASTAVKA_PISACH}petar@x.bg`;
const CHUZHD = `${KNIGA}${NASTAVKA_PISACH}nikoy@x.bg`;
const KOGATO = '2026-08-26T12:00:00.000Z';

/** Малък писач · всяко събитие с пореден такт, за да е редът предвидим. */
function pisach() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const pusni = (
    naematel: string,
    type: Sabitie['type'],
    vid: string,
    id: string,
    payload: Record<string, unknown>,
  ) =>
    vrata.dobavi({
      opId: `${naematel}-${type}-${id}-${tik}`,
      ts: new Date(Date.UTC(2026, 7, 26, 9, 0, tik++)).toISOString(),
      naematel,
      actor: naematel.includes(NASTAVKA_PISACH) ? naematel.split(NASTAVKA_PISACH)[1]! : 'ivo@x.bg',
      type,
      sashtnost: { vid: vid as never, id },
      payload,
    });
  return { dnevnik, pusni };
}

/**
 * Книга с ВПИСАНИ писачи · основата на всеки случай тук.
 *
 * Без нея всяка проверка би светила и по шестия сблъсък (писач без служител) и
 * тестовете щяха да мерят него вместо своя случай. Вписването е ЧАСТ ОТ
 * ПОДРЕДБАТА, не намаление на строгостта: невписаният писач си има свой тест.
 */
async function knigaSVpisaniPisachi() {
  const p = pisach();
  await p.pusni(KNIGA, 'СлужителЗаписан', 'sluzhitel', 'mira@x.bg',
    { imeyl: 'mira@x.bg', ime: 'Мира', rolya: 'sluzhitel' });
  await p.pusni(KNIGA, 'СлужителЗаписан', 'sluzhitel', 'petar@x.bg',
    { imeyl: 'petar@x.bg', ime: 'Петър', rolya: 'sluzhitel' });
  return p;
}

/** Сверява книгата ЦЯЛА · веригата-нула влиза винаги, тя носи служителите. */
async function sveri(dnevnik: DnevnikVPametta, verigi: readonly string[]) {
  const imena = [...new Set([KNIGA, ...verigi])];
  const redici = await Promise.all(imena.map((v) => dnevnik.chetiVsichki(v)));
  const potok = sgani(redici, KOGATO).potok;
  return sveriVerigite(potok, fold(potok), KOGATO);
}

const vidove = (r: { sblasatsi: readonly { vid: VidSblasak }[] }) =>
  r.sblasatsi.map((s) => s.vid);

describe('1 · двойно начисляване', () => {
  it('един и същ `sashtnost.id` от две вериги СВЕТИ', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    const danni = { naemId: 'N-1', period: '2026-03', osnovanie: 'наем', suma_st: 50000, padezh: '2026-03-05' };
    await pusni(MIRA, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-03', danni);
    await pusni(PETAR, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-03', danni);

    const r = await sveri(dnevnik, [MIRA, PETAR]);
    expect(vidove(r)).toEqual(['dvoyno-nachislyavane']);
    expect(r.sblasatsi[0]!.verigi).toEqual([MIRA, PETAR]);
    expect(r.sblasatsi[0]!.zvena).toHaveLength(2);
  });

  it('РАЗЛИЧНИ периоди от две вериги НЕ светят', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-03',
      { naemId: 'N-1', period: '2026-03', osnovanie: 'наем', suma_st: 50000, padezh: '2026-03-05' });
    await pusni(PETAR, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-04',
      { naemId: 'N-1', period: '2026-04', osnovanie: 'наем', suma_st: 50000, padezh: '2026-04-05' });

    expect((await sveri(dnevnik, [MIRA, PETAR])).nared).toBe(true);
  });
});

describe('2 · двойно плащане', () => {
  async function dvePlashtaniya(vtorata_st: number) {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'ВземанеНачислено', 'vzemane', 'V-1',
      { naemId: 'N-1', period: '2026-03', osnovanie: 'наем', suma_st: 50000, padezh: '2026-03-05' });
    await pusni(MIRA, 'ПлащанеПрието', 'plashtane', 'P-1',
      { vzemaneId: 'V-1', suma_st: 30000, nachin: 'в брой', data: '2026-03-05' });
    await pusni(PETAR, 'ПлащанеПрието', 'plashtane', 'P-2',
      { vzemaneId: 'V-1', suma_st: vtorata_st, nachin: 'банка', data: '2026-03-06' });
    return sveri(dnevnik, [MIRA, PETAR]);
  }

  it('преплатено от две вериги СВЕТИ, с надплатеното в думи', async () => {
    const r = await dvePlashtaniya(30000);
    expect(vidove(r)).toEqual(['dvoyno-plashtane']);
    expect(r.sblasatsi[0]!.kakvo).toContain('надплатени 10000');
  });

  it('РАЗДЕЛЕНО плащане на две части НЕ свети · то е законно', async () => {
    expect((await dvePlashtaniya(20000)).nared).toBe(true);
  });
});

describe('3 · замразен период, отворен от втора верига', () => {
  it('запис в замразения период СЛЕД справката свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'СправкаПодадена', 'spravka', '2026-03',
      { period: '2026-03', dds_deklarirano_st: 10000, data: '2026-04-10', belezhka: '' });
    await pusni(PETAR, 'ПлащанеПрието', 'plashtane', 'P-1',
      { vzemaneId: 'V-1', suma_st: 5000, nachin: 'в брой', data: '2026-03-20' });

    const r = await sveri(dnevnik, [MIRA, PETAR]);
    expect(vidove(r)).toEqual(['zamrazen-otvoren']);
    expect(r.sblasatsi[0]!.kakvo).toContain('2026-03');
  });

  it('същият запис ПРЕДИ справката НЕ свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(PETAR, 'ПлащанеПрието', 'plashtane', 'P-1',
      { vzemaneId: 'V-1', suma_st: 5000, nachin: 'в брой', data: '2026-03-20' });
    await pusni(MIRA, 'СправкаПодадена', 'spravka', '2026-03',
      { period: '2026-03', dds_deklarirano_st: 10000, data: '2026-04-10', belezhka: '' });

    expect((await sveri(dnevnik, [MIRA, PETAR])).nared).toBe(true);
  });

  it('запис в СЪЩАТА верига след своята справка не е сблъсък МЕЖДУ вериги', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'СправкаПодадена', 'spravka', '2026-03',
      { period: '2026-03', dds_deklarirano_st: 10000, data: '2026-04-10', belezhka: '' });
    await pusni(MIRA, 'ПлащанеПрието', 'plashtane', 'P-1',
      { vzemaneId: 'V-1', suma_st: 5000, nachin: 'в брой', data: '2026-03-20' });

    // Собствената Врата вече го е спряла (правило 9) — тук няма какво да се сверява.
    expect((await sveri(dnevnik, [MIRA])).nared).toBe(true);
  });
});

describe('4 · сторно без жертва', () => {
  it('сторно, сочещо непозната верига, СВЕТИ', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });
    await pusni(MIRA, 'Сторно', 'imot', 'I-1',
      { pogasyavaSeq: 1, pogasyavaVeriga: 'kniga#pero:koyto-go-nyama@x.bg', prichina: 'грешка' });

    const r = await sveri(dnevnik, [MIRA]);
    expect(vidove(r)).toEqual(['storno-bez-zhertva']);
    expect(r.sblasatsi[0]!.kakvo).toContain('koyto-go-nyama@x.bg#1');
  });

  it('сторно със СЪЩЕСТВУВАЩА жертва в друга верига НЕ свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(PETAR, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });
    await pusni(MIRA, 'Сторно', 'imot', 'I-1',
      { pogasyavaSeq: 1, pogasyavaVeriga: PETAR, prichina: 'дублирано' });

    expect((await sveri(dnevnik, [MIRA, PETAR])).nared).toBe(true);
  });
});

describe('5 · два стопанина', () => {
  it('две вериги, всяка със свой стопанин, СВЕТЯТ', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'СтопанинЗаписан', 'stopanin', 'stopanin',
      { imeyl: 'mira@x.bg', ime: 'Мира', dostavchik: 'google' });
    await pusni(PETAR, 'СтопанинЗаписан', 'stopanin', 'stopanin',
      { imeyl: 'petar@x.bg', ime: 'Петър', dostavchik: 'google' });

    const r = await sveri(dnevnik, [MIRA, PETAR]);
    expect(vidove(r)).toContain('dva-stopanina');
    expect(r.sblasatsi.find((s) => s.vid === 'dva-stopanina')!.kakvo).toContain('2 стопанина');
  });

  it('ЕДИН стопанин, записан от една верига, не свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(MIRA, 'СтопанинЗаписан', 'stopanin', 'stopanin',
      { imeyl: 'mira@x.bg', ime: 'Мира', dostavchik: 'google' });
    const r = await sveri(dnevnik, [MIRA]);
    expect(vidove(r)).not.toContain('dva-stopanina');
  });
});

describe('6 · писач без служител', () => {
  it('верига от НЕВПИСАН имейл СВЕТИ', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(CHUZHD, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });

    const r = await sveri(dnevnik, [CHUZHD]);
    expect(vidove(r)).toEqual(['pisach-bez-sluzhitel']);
    expect(r.sblasatsi[0]!.kakvo).toContain('nikoy@x.bg');
  });

  it('вписаният служител НЕ свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(PETAR, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });

    expect((await sveri(dnevnik, [PETAR])).nared).toBe(true);
  });

  it('веригата-НУЛА няма писач и никога не свети', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(KNIGA, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });
    expect((await sveri(dnevnik, [KNIGA])).nared).toBe(true);
  });
});

describe('правило 7 · нулата се ЗАПИСВА', () => {
  it('чиста книга дава сверка с нула сблъсъка и БРОЕВЕ', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    await pusni(KNIGA, 'ИмотДобавен', 'imot', 'I-1',
      { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 });
    await pusni(KNIGA, 'ИмотДобавен', 'imot', 'I-2',
      { adres: 'ул. Втора', edinitsa: 'Б', ploshtad_kvsm: 70 });

    const r = await sveri(dnevnik, [KNIGA]);
    expect(r.nared).toBe(true);
    expect(r.sblasatsi).toEqual([]);
    expect(r.broiVerigi).toBe(1);
    // Двамата служители + двата имота · всичко във веригата-нула.
    expect(r.broiSabitiya).toBe(4);
    expect(r.kogato).toBe(KOGATO);
  });

  it('СТОРНИРАНОТО начисление вече не се брои за двойно', async () => {
    const { dnevnik, pusni } = await knigaSVpisaniPisachi();
    const danni = { naemId: 'N-1', period: '2026-03', osnovanie: 'наем', suma_st: 50000, padezh: '2026-03-05' };
    await pusni(MIRA, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-03', danni);
    await pusni(PETAR, 'ВземанеНачислено', 'vzemane', 'V:N-1:2026-03', danni);
    // Човекът решава кое е излишното и го маха със сторно — не с презапис.
    await pusni(PETAR, 'Сторно', 'vzemane', 'V:N-1:2026-03',
      { pogasyavaSeq: 1, prichina: 'начислено и от Мира' });

    expect((await sveri(dnevnik, [MIRA, PETAR])).nared).toBe(true);
  });
});
