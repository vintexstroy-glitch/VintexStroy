/**
 * АВТО-ДЕЛАТА · вноска / преписка / среща → дело, и ЧЕРВЕНИЯТ СПИСЪК
 * (резен 39 · M07 · ADR-099).
 *
 * Негови думи, дословно:
 *
 *   „Да — върни авто-делата (вноска/преписка/среща → дело, червен списък)"
 *    *(р65·[68] · 10.08)*
 *   „за контактите среща добавяш с място, телефо, име, и дата с час" ·
 *   „Става дело автоматично" *(р57·[30])*
 *   „Не, само дата" · „Адрес на срещата" *(р57·[34])*
 *   „…1 седмица преди да дойде деня се оцветява автоматично с жъл цвят текста
 *    или цифрите, когато останат 2 дниу свети в червено. Стщото и за
 *    Ъправление и за СМетки" *(р59·[71])*
 *
 * Деветте обещания:
 *
 *   1. Срещата иска контакт И ДАТА · адресът е по избор.
 *   2. Състоянието на срещата е ИЗБРОЕНО · свободна дума не влиза.
 *   3. Проведената и отпадналата НЕ предстоят.
 *   4. Трите извора влизат в ЕДИН списък, подреден по СРОК, не по извор.
 *   5. Червеният списък е онези, които светят червено или са просрочени.
 *   6. Праговете имат ЕДИН дом · екранът вика, не преписва.
 *   7. Хоризонтът реже и трите извора еднакво.
 *   8. Кредит без план се КАЗВА поименно, не изчезва мълчаливо.
 *   9. Сверката брои ангажименти ↔ показани + пропуснати · и нулата се записва.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  avtoDelata,
  cherveniyatSpisak,
  IZVORI_NA_AVTODELO,
  kreditiBezPlan,
  NAPRED_DNI,
  sveriAvtoDelata,
} from '../src/domein/avtodela.js';
import {
  GreshkaKontakt,
  predstoyashtiSreshti,
  proveriSreshtata,
  SASTOYANIYA_NA_SRESHTA,
  type Sreshta,
} from '../src/domein/kontakti.js';
import { svetofarNaSroka, dniDoSroka } from '../src/domein/dela.js';
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
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const sreshta = (p: Partial<Sreshta> & { id: string; kontakt: string; data: string }): Sreshta => ({
  adres: '',
  sastoyanie: 'чака',
  seq: 1,
  kogato: KOGATO,
  koy: 'vintexstroy@gmail.com',
  ...p,
});

/** След N дни от ДНЕС · за да не се пишат дати на ръка и да се разминат. */
function sled(dni: number): string {
  const d = new Date(Date.parse(`${DNES}T00:00:00Z`) + dni * 86_400_000);
  return d.toISOString().slice(0, 10);
}

// ── 1, 2 и 3 · СРЕЩАТА ────────────────────────────────────────────────────

describe('срещата', () => {
  it('иска контакт И ДАТА · адресът е по избор', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Иван Петров', adres: '', data: sled(3), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    const s = (await deystviya.ogledalo()).sreshti.get('sr-1')!;
    expect(s.kontakt).toBe('Иван Петров');
    expect(s.adres).toBe('');
    expect(s.data).toBe(sled(3));
  });

  it('а без дата се отказва с думи · без нея не става дело', () => {
    expect(() => proveriSreshtata('Иван', '', 'чака')).toThrow(GreshkaKontakt);
    expect(() => proveriSreshtata('Иван', '   ', 'чака')).toThrow(/червения списък/);
  });

  it('и без контакт се отказва · „за контактите среща добавяш"', () => {
    expect(() => proveriSreshtata('  ', sled(3), 'чака')).toThrow(/контактът/i);
  });

  it('състоянието е ИЗБРОЕНО · свободна дума не влиза', () => {
    expect(SASTOYANIYA_NA_SRESHTA).toEqual(['чака', 'проведена', 'отпаднала']);
    expect(() => proveriSreshtata('Иван', sled(3), 'може би')).toThrow(/Непознато състояние/);
  });

  it('проведената и отпадналата НЕ предстоят · изход трябва да има', () => {
    const vsichki = [
      sreshta({ id: 'a', kontakt: 'Иван', data: sled(1) }),
      sreshta({ id: 'b', kontakt: 'Мария', data: sled(2), sastoyanie: 'проведена' }),
      sreshta({ id: 'v', kontakt: 'Петър', data: sled(3), sastoyanie: 'отпаднала' }),
    ];
    expect(predstoyashtiSreshti(vsichki).map((s) => s.id)).toEqual(['a']);
  });

  it('и последният запис бие · поправката е ново събитие, не презапис', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Иван', adres: 'кантора', data: sled(3), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Иван', adres: 'кантора', data: sled(3), sastoyanie: 'проведена' },
      { opId: 'op-2' },
    );
    const o = await deystviya.ogledalo();
    expect(o.sreshti.size).toBe(1);
    expect(o.sreshti.get('sr-1')!.sastoyanie).toBe('проведена');
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(2);
  });
});

// ── 4, 5, 6 и 7 · СПИСЪКЪТ ────────────────────────────────────────────────

/** Стенд с трите извора наведнъж · вноска, преписка и среща. */
async function tritefIzvora() {
  const { deystviya } = stend();
  await deystviya.zapishiKredit(
    {
      kreditId: 'kr-1',
      ime: 'Ипотека · Пощенска',
      vid: 'ipoteka',
      proektId: '',
      ostatak_st: 100_000_00,
      ot: '2026-01-01',
      lihva_bp: 300,
      vnoska_st: 1_000_00,
      // Денят на вноската е ДНЕС + 10, за да падне вътре в хоризонта.
      den: Number(sled(10).slice(8, 10)),
      otgovornik: 'petkowi@gmail.com',
      obezpechenie_st: 0,
    },
    { opId: 'op-kr' },
  );
  await deystviya.zapishiPrepiska(
    'pr-1',
    { kontakt: 'Иван Петров', kakvo: 'договор за подпис', zaVzimane: sled(1), sastoyanie: 'чака' },
    { opId: 'op-pr' },
  );
  await deystviya.zapishiSreshta(
    'sr-1',
    { kontakt: 'Мария', adres: 'кантора', data: sled(20), sastoyanie: 'чака' },
    { opId: 'op-sr' },
  );
  return deystviya;
}

describe('червеният списък', () => {
  it('събира ТРИТЕ извора в един списък', async () => {
    const o = await (await tritefIzvora()).ogledalo();
    const avto = avtoDelata(o, DNES);
    expect([...new Set(avto.map((a) => a.izvor))].sort()).toEqual(
      [...IZVORI_NA_AVTODELO].sort(),
    );
  });

  it('и ги реди по СРОК, не по извор · въпросът сутрин е „кое гори"', async () => {
    const o = await (await tritefIzvora()).ogledalo();
    const avto = avtoDelata(o, DNES);
    expect(avto.map((a) => a.izvor)).toEqual(['преписка', 'вноска', 'среща']);
    expect([...avto].sort((a, b) => a.do.localeCompare(b.do)).map((a) => a.do)).toEqual(
      avto.map((a) => a.do),
    );
  });

  it('червеното са само горящите и просрочените · ЖЪЛТОТО остава вън', async () => {
    // НАХОДКА (резен 39): първата версия на този тест нямаше НИТО ЕДИН жълт ред —
    // преписката беше червена, вноската и срещата нормални. Затова „червено или
    // просрочено" и „всичко, което не е нормално" даваха един и същ отговор, и
    // счупването мина. Жълтият ред е ЗАДЪЛЖИТЕЛЕН тук.
    const deystviya = await tritefIzvora();
    await deystviya.zapishiSreshta(
      'sr-zh',
      { kontakt: 'Жълт', adres: '', data: sled(5), sastoyanie: 'чака' },
      { opId: 'op-zh' },
    );
    const avto = avtoDelata(await deystviya.ogledalo(), DNES);
    expect(avto.filter((a) => a.svetofar === 'zhalto')).toHaveLength(1);
    const cherveni = cherveniyatSpisak(avto);
    expect(cherveni.map((a) => a.izvor)).toEqual(['преписка']);
    expect(cherveni.some((a) => a.svetofar === 'zhalto')).toBe(false);
  });

  it('и просроченото влиза при червеното · същият сигнал, само по-късно', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Мария', adres: '', data: sled(-5), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    const avto = avtoDelata(await deystviya.ogledalo(), DNES);
    expect(avto[0]!.svetofar).toBe('prosrocheno');
    expect(avto[0]!.dni).toBe(-5);
    expect(cherveniyatSpisak(avto)).toHaveLength(1);
  });

  it('праговете имат ЕДИН дом · седем жълто, две червено', () => {
    expect(svetofarNaSroka(sled(8), DNES)).toBe('normalno');
    expect(svetofarNaSroka(sled(7), DNES)).toBe('zhalto');
    expect(svetofarNaSroka(sled(3), DNES)).toBe('zhalto');
    expect(svetofarNaSroka(sled(2), DNES)).toBe('cherveno');
    expect(svetofarNaSroka(sled(0), DNES)).toBe('cherveno');
    expect(svetofarNaSroka(sled(-1), DNES)).toBe('prosrocheno');
    // Празната дата НЕ свети · подразбран срок не се измисля.
    expect(svetofarNaSroka('', DNES)).toBe('normalno');
    expect(dniDoSroka(sled(4), DNES)).toBe(4);
  });

  it('а НЕЧЕТИМАТА дата крещи · не минава за „нормално"', () => {
    // НАХОДКА (резен 39): преди тази проверка пазачът за празното беше надпис —
    // махнеш ли го, NaN пропада през трите сравнения и връща „normalno". Тоест
    // сгрешена дата изглеждаше като спокоен срок.
    expect(() => svetofarNaSroka('утре', DNES)).toThrow(/Нечетима дата/);
    expect(() => svetofarNaSroka('30.08.2026', DNES)).toThrow(/без срок/);
    expect(Number.isNaN(dniDoSroka('утре', DNES))).toBe(true);
  });

  it('хоризонтът е ЧЕТИРИЙСЕТ И ПЕТ дни · числото се твърди, не се чете', () => {
    // НАХОДКА (резен 39): първата версия пишеше `sled(NAPRED_DNI + 1)` и затова
    // се местеше ЗАЕДНО с константата — разтегната на 90, тя пак минаваше.
    // Числото на прага се пише тук с ръка, инак тестът мери себе си.
    expect(NAPRED_DNI).toBe(45);
  });

  it('и реже и трите извора еднакво · нищо зад четирийсет и петия ден', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPrepiska(
      'pr-1',
      { kontakt: 'Иван', kakvo: 'далечно', zaVzimane: sled(46), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Мария', adres: '', data: sled(46), sastoyanie: 'чака' },
      { opId: 'op-2' },
    );
    expect(avtoDelata(await deystviya.ogledalo(), DNES)).toHaveLength(0);
    // А на самия праг ВЛИЗАТ · границата е „до", не „преди".
    const { deystviya: d2 } = stend();
    await d2.zapishiSreshta(
      'sr-1',
      { kontakt: 'Мария', adres: '', data: sled(45), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    expect(avtoDelata(await d2.ogledalo(), DNES)).toHaveLength(1);
  });

  it('взетата преписка НЕ е дело · изворът се затваря, редът си отива', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPrepiska(
      'pr-1',
      { kontakt: 'Иван', kakvo: 'договор', zaVzimane: sled(1), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    expect(avtoDelata(await deystviya.ogledalo(), DNES)).toHaveLength(1);
    await deystviya.zapishiPrepiska(
      'pr-1',
      { kontakt: 'Иван', kakvo: 'договор', zaVzimane: sled(1), sastoyanie: 'взето' },
      { opId: 'op-2' },
    );
    expect(avtoDelata(await deystviya.ogledalo(), DNES)).toHaveLength(0);
  });

  it('и НИЩО от списъка не влиза в Журнала · авто-делото се СМЯТА', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Мария', adres: '', data: sled(1), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    const o = await deystviya.ogledalo();
    avtoDelata(o, DNES);
    cherveniyatSpisak(avtoDelata(o, DNES));
    // Второ и трето четене · нито едно не пише.
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(1);
  });
});

// ── 8 и 9 · ПРОПУСНАТОТО И СВЕРКАТА ───────────────────────────────────────

describe('пропуснатото', () => {
  it('кредит без план се КАЗВА поименно · вноската не стига за лихвата', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKredit(
      {
        kreditId: 'kr-1',
        ime: 'Ипотека · зле',
        vid: 'ipoteka',
        proektId: '',
        ostatak_st: 100_000_00,
        ot: '2026-01-01',
        lihva_bp: 1_200,
        // Вноска, по-малка от месечната лихва → планът НЕ тръгва.
        vnoska_st: 10_00,
        den: 10,
        otgovornik: '',
        obezpechenie_st: 0,
      },
      { opId: 'op-1' },
    );
    const o = await deystviya.ogledalo();
    expect(avtoDelata(o, DNES)).toHaveLength(0);
    expect(kreditiBezPlan(o, DNES)).toEqual(['Ипотека · зле']);
  });

  it('сверката брои ангажименти ↔ показани + пропуснати', async () => {
    const o = await (await tritefIzvora()).ogledalo();
    const sv = sveriAvtoDelata(o, DNES, KOGATO);
    expect(sv.vhod).toBe(3);
    expect(sv.izhod).toBe(3);
    expect(sv.razlika).toBe(0);
  });

  it('и когато нищо не чака · нулата пак се записва (правило 7)', async () => {
    const { deystviya } = stend();
    const sv = sveriAvtoDelata(await deystviya.ogledalo(), DNES, KOGATO);
    expect(sv.vhod).toBe(0);
    expect(sv.izhod).toBe(0);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('далечното и без-планното НЕ развалят сверката · те са пропуснати, не изгубени', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSreshta(
      'sr-1',
      { kontakt: 'Мария', adres: '', data: sled(NAPRED_DNI + 30), sastoyanie: 'чака' },
      { opId: 'op-1' },
    );
    await deystviya.zapishiKredit(
      {
        kreditId: 'kr-1',
        ime: 'Ипотека · зле',
        vid: 'ipoteka',
        proektId: '',
        ostatak_st: 100_000_00,
        ot: '2026-01-01',
        lihva_bp: 1_200,
        vnoska_st: 10_00,
        den: 10,
        otgovornik: '',
        obezpechenie_st: 0,
      },
      { opId: 'op-2' },
    );
    const o = await deystviya.ogledalo();
    expect(avtoDelata(o, DNES)).toHaveLength(0);
    const sv = sveriAvtoDelata(o, DNES, KOGATO);
    expect(sv.vhod).toBe(2);
    expect(sv.razlika).toBe(0);
  });
});
