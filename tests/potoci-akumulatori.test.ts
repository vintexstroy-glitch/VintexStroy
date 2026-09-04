/**
 * ВСИЧКИТЕ ПОТОЦИ ПРЕЗ ВСИЧКИТЕ АКУМУЛАТОРИ · И94 т.7, дословно:
 *
 *   „Изпълни всички потоци в акумолатора и направи сверки и тестове."
 *
 * Дотук всеки поток и всеки акумулатор имаха свой тест, но НИКОЙ не ги
 * прекарваше ЗАЕДНО. Разликата не е в броя: тест, който пуска един поток,
 * доказва, че той работи сам; тест, който пуска шестте наведнъж, доказва, че
 * не си пречат — че наемът не се брои и като приход, и като касова наличност,
 * че разход в чужд акумулатор не се слива с друг, и че сверките затварят,
 * когато в периода има ВСИЧКО, а не когато има едно.
 *
 * Затова тук се минава по ИСТИНСКАТА Врата — не се сглобява Огледало на ръка.
 * Сглобеното Огледало доказва, че сметката е вярна; през Вратата се доказва,
 * че вярната сметка стига дотам.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { POTOTSI, smetki, potototsiNaRazhod } from '../src/domein/smetki.js';
import { AKUMULATORI, ddsOtObshta, sektoriNaNaem, sektoriNaRazhod } from '../src/domein/dds.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const PERIOD = '2026-08';
const KOGATO = '2026-08-24T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 24, 9, 0, tik++)).toISOString(),
  });
  return { deystviya };
}

/** Приходните акумулатори · по един наем на всеки, за да не остане празен. */
const NAEMITE = [
  { sektor: 'naem-zhilishten', naemetel: 'Домакинство', naem_st: 500_00 },
  { sektor: 'naem-targovski', naemetel: 'Стройпласт ЕООД', naem_st: 1200_00 },
] as const;

/**
 * Разходните акумулатори · всеки в СВОЯ поток и със СВОЯ ставка.
 *
 * „Фактури" носи трите ставки нарочно: 20 за материали, 9 за услуга с намалена
 * ставка и 0 за необлагаема. Един поток с една ставка би минал теста, без да
 * докаже, че ставката идва от РЕДА, а не от сектора (ADR-009).
 */
const RAZHODITE = [
  { potok: 'zaplati', sektor: 'zaplati', suma_st: 3400_00, stavka: 0, opis: 'заплати за август' },
  { potok: 'krediti', sektor: 'krediti', suma_st: 890_00, stavka: 0, opis: 'вноска по кредит' },
  { potok: 'fakturi', sektor: 'pokupki-materiali', suma_st: 1440_00, stavka: 20, opis: 'цимент' },
  { potok: 'fakturi', sektor: 'pokupki-uslugi', suma_st: 654_00, stavka: 9, opis: 'нощувки на екипа' },
  { potok: 'fakturi', sektor: 'uslugi-stroitelni', suma_st: 2400_00, stavka: 20, opis: 'подизпълнител' },
  // Необлагаема доставка в облагаем сектор · ставката на РЕДА бие сектора.
  { potok: 'fakturi', sektor: 'pokupki-uslugi', suma_st: 300_00, stavka: 0, opis: 'застраховка' },
] as const;

async function vsichkiPotoci(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, {
    opId: 'op-imot',
  });

  for (const [i, n] of NAEMITE.entries()) {
    await d.dobaviNaem(
      `N-${i}`,
      {
        imotId: 'I-1',
        naemetel: n.naemetel,
        naem_st: tsentove(n.naem_st),
        padezhDen: 5,
        ot: '2024-01-01',
        do: '',
        depozit_st: 0,
        sektor: n.sektor,
      },
      { opId: `op-naem-${i}` },
    );
  }

  // ПОТОК „Наеми" · начисленото; данъчното събитие е падежът, не плащането.
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });

  // ПОТОЦИ „КЕШ" и „БАНКА" · как парите реално са влезли.
  const o = await d.ogledalo();
  const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.period === PERIOD);
  expect(vzemaniya.length, 'начислено по едно вземане на наем').toBe(NAEMITE.length);

  await d.priemiPlashtane(
    'P-kesh',
    { vzemaneId: vzemaniya[0]!.id, suma_st: tsentove(500_00), nachin: 'в брой', data: '2026-08-06' },
    { opId: 'op-p-kesh' },
  );
  await d.priemiPlashtane(
    'P-banka',
    { vzemaneId: vzemaniya[1]!.id, suma_st: tsentove(1200_00), nachin: 'банка', data: '2026-08-07' },
    { opId: 'op-p-banka' },
  );

  // ПОТОК „Продажби" · вноска по сделка, по СВОЯТА дата (резен 23 · ADR-083).
  await d.zapishiProdazhba(
    {
      prodazhbaId: 'PR-1',
      imotId: 'I-1',
      kupuvach: 'Петър Иванов',
      telefon: '0888 000 000',
      tsena_st: tsentove(200_000_00),
      prodazhba_st: tsentove(190_000_00),
      smr_st: tsentove(10_000_00),
      pd_st: tsentove(180_000_00),
      sastoyanie: 'tekushta',
    },
    { opId: 'op-prodazhba' },
  );
  await d.zapishiDvizhenieNaProdazhba(
    {
      dvizhenieId: 'PRD-1',
      prodazhbaId: 'PR-1',
      vid: 'Капаро',
      suma_st: tsentove(20_000_00),
      data: '2026-08-14',
      belezhka: 'капаро по предварителен договор',
      nachin: 'банка',
    },
    { opId: 'op-dvizhenie' },
  );

  // ПОТОЦИ „Заплати", „Кредити", „Фактури" · разходната страна.
  for (const [i, r] of RAZHODITE.entries()) {
    await d.zapishiRazhod(
      `R-${i}`,
      {
        potok: r.potok,
        dostavchik: `Доставчик ${i + 1}`,
        opis: r.opis,
        suma_st: tsentove(r.suma_st),
        sektor: r.sektor,
        nachin: 'банка',
        data: '2026-08-12',
        dokument: `Ф-${1000 + i}`,
        stavka: r.stavka,
      },
      { opId: `op-razhod-${i}` },
    );
  }
}

describe('всички потоци, наведнъж', () => {
  it('СЕДЕМТЕ потока имат СВОЯ ред, и никой не е празен', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    expect(s.redove.map((r) => r.klyuch)).toEqual(POTOTSI.map((p) => p.klyuch));
    for (const r of s.redove) {
      expect(r.broi, `потокът „${r.ime}" остана празен`).toBeGreaterThan(0);
      expect(r.suma_st, `потокът „${r.ime}" остана на нула`).toBeGreaterThan(0);
    }
  });

  it('КЕШ и БАНКА НЕ се събират с Наеми — иначе едно и също се брои два пъти', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    const naemi = s.redove.find((r) => r.klyuch === 'naemi')!;
    const kesh = s.redove.find((r) => r.klyuch === 'kesh')!;
    const banka = s.redove.find((r) => r.klyuch === 'banka')!;

    expect(naemi.suma_st).toBe(1700_00);
    expect(kesh.suma_st + banka.suma_st).toBe(1700_00);
    // Приходът е НАЧИСЛЕНОТО, не сборът на трите реда.
    expect(s.prihod_st).toBe(1700_00);
    expect(s.sabrano_st).toBe(1700_00);
    // СБИРАЩИТЕ приходни са ДВА (резен 23): наемът е НАЧИСЛЕНОТО, продажбата е
    // ВНОСКАТА. КЕШ и БАНКА пак не сбират — те само показват как е дошло.
    expect(POTOTSI.filter((p) => p.posoka === 'приход' && p.sbira).map((p) => p.klyuch)).toEqual([
      'naemi',
      'prodazhbi',
    ]);
    // И вноската НЕ пипа ДДС-основата · нея я решава счетоводна преценка.
    expect(s.prihodProdazhbi_st).toBe(20_000_00);
    expect(s.prihod_st).toBe(1700_00);
  });

  it('разходът е сборът САМО на сбиращите потоци', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    const ochakvan = RAZHODITE.reduce((sum, r) => sum + r.suma_st, 0);
    expect(s.razhod_st).toBe(ochakvan);
    // И всеки разходен поток СБИРА — там няма „само показва как е дошло".
    expect(potototsiNaRazhod().every((p) => p.sbira)).toBe(true);
  });
});

describe('акумулаторите · всеки със своето', () => {
  it('седемте акумулатора се появяват, щом имат движение', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    const dvizheni = new Set(s.dds.map((r) => r.akumulator.klyuch));
    for (const a of AKUMULATORI) {
      expect(dvizheni.has(a.klyuch), `акумулаторът „${a.sektor}" не се появи`).toBe(true);
    }
    expect(dvizheni.size).toBe(AKUMULATORI.length);
  });

  it('приходните са на страна „изход", разходните — на „вход"', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    const naemni = new Set(sektoriNaNaem().map((a) => a.klyuch));
    const razhodni = new Set(sektoriNaRazhod().map((a) => a.klyuch));
    for (const r of s.dds) {
      const ochakvana = naemni.has(r.akumulator.klyuch) ? 'изход' : 'вход';
      expect(razhodni.has(r.akumulator.klyuch) || naemni.has(r.akumulator.klyuch)).toBe(true);
      expect(r.strana, `${r.akumulator.sektor} падна на грешната страна`).toBe(ochakvana);
    }
  });

  it('един акумулатор с ДВЕ ставки дава ДВА реда — ставката е на РЕДА', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    // „покупки · услуги" носи 9% (нощувки) и 0% (застраховка) в един период.
    const uslugi = s.dds.filter((r) => r.akumulator.klyuch === 'pokupki-uslugi');
    expect(uslugi.map((r) => r.stavka).sort((a, b) => a - b)).toEqual([0, 9]);
    // Сектор с подсказка 20% приема ред с 0% — подсказката не е закон.
    expect(uslugi.find((r) => r.stavka === 0)?.obshta_st).toBe(300_00);
  });

  it('основа + ДДС дава ТОЧНО общата · на всеки ред, при всяка ставка', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    for (const r of s.dds) {
      expect(r.osnova_st + r.dds_st, `${r.akumulator.sektor} @ ${r.stavka}%`).toBe(r.obshta_st);
      // и същата сметка, направена отвън, дава същото — няма втора формула
      expect(ddsOtObshta(r.obshta_st, r.stavka).dds_st).toBe(r.dds_st);
    }
  });
});

describe('сверките затварят, когато в периода има ВСИЧКО', () => {
  it('ПЕТТЕ сверки са налице и всяка е на нула', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    expect(s.sverki).toHaveLength(5);
    for (const sv of s.sverki) {
      expect(sv.razlika, `${sv.kakvo} не затвори`).toBe(0);
    }
    expect(s.nared).toBe(true);
  });

  it('нулата се ЗАПИСВА · сверка без разлика пак е сверка (правило 7)', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    // Всичките ПЕТ са с нула — и всичките пет СЪЩЕСТВУВАТ.
    expect(s.sverki.filter((sv) => sv.razlika === 0)).toHaveLength(5);
    expect(s.sverki.map((sv) => sv.kakvo.replace(`Сметки ${PERIOD} · `, ''))).toEqual([
      'приход ↔ основа + ДДС',
      'брой вземания ↔ брой в акумулаторите',
      'разход ↔ основа + ДДС',
      'брой разходи ↔ брой в акумулаторите',
      // ПЕТАТА гледа самата таблица · четирите горни гледат акумулаторите и
      // не биха мигнали при сбиращ приходен поток без число (резен 23).
      'приход по редовете ↔ наеми + продажби',
    ]);
  });

  it('за внасяне = изходящ − входящ, и двете идват от акумулаторите', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    const izhod = s.dds.filter((r) => r.strana === 'изход').reduce((x, r) => x + r.dds_st, 0);
    const vhod = s.dds.filter((r) => r.strana === 'вход').reduce((x, r) => x + r.dds_st, 0);
    expect(s.dds_izhod_st).toBe(izhod);
    expect(s.dds_vhod_st).toBe(vhod);
    expect(s.zaVnasyane_st).toBe(izhod - vhod);

    // Жилищният наем е с нулева ставка — изходящият идва САМО от търговския.
    expect(izhod).toBe(ddsOtObshta(1200_00, 20).dds_st);
  });

  it('добавен разход мърда И сверката, и числото за внасяне', async () => {
    const { deystviya } = stend();
    await vsichkiPotoci(deystviya);
    const predi = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    await deystviya.zapishiRazhod(
      'R-nov',
      {
        potok: 'fakturi',
        dostavchik: 'Още един',
        opis: 'арматура',
        suma_st: tsentove(600_00),
        sektor: 'pokupki-materiali',
        nachin: 'банка',
        data: '2026-08-20',
        dokument: 'Ф-2000',
        stavka: 20,
      },
      { opId: 'op-razhod-nov' },
    );

    const sled = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(sled.razhod_st - predi.razhod_st).toBe(600_00);
    expect(sled.dds_vhod_st - predi.dds_vhod_st).toBe(ddsOtObshta(600_00, 20).dds_st);
    expect(predi.zaVnasyane_st - sled.zaVnasyane_st).toBe(ddsOtObshta(600_00, 20).dds_st);
    // и сверките пак затварят — новото не е паднало между записа и акумулатора
    expect(sled.sverki.every((sv) => sv.razlika === 0)).toBe(true);
  });
});

describe('пиновете · броевете се твърдят с ръка (резен 46 · група В)', () => {
  it('потоците са СЕДЕМ и акумулаторите са СЕДЕМ', () => {
    expect(POTOTSI).toHaveLength(7);
    expect(AKUMULATORI).toHaveLength(7);
  });
});
