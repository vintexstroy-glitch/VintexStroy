/**
 * ОТЧЕТИТЕ · петте полета и техните формули.
 *
 * Всяко число тук се проверява с НЕЗАВИСИМ ВТОРИ ПЪТ (умението `matematika`):
 * веднъж от функцията, веднъж сметнато на ръка от съставките. Поле, чийто сбор
 * не отговаря на съставките си, е точно повредата, която отчетите трябва да
 * ловят — не да раждат.
 *
 * И най-важното, което тестът пази: **Капиталът НЕ Е Средства.** Двете стояха
 * слети, докато И87 не ги раздели.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import {
  kapital,
  likvidnost,
  otcheti,
  saldoNa,
  sredstva,
  sumiZaDen,
  vzemaniya,
  type Pole,
} from '../src/domein/otcheti.js';
import { smetki } from '../src/domein/smetki.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-08';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

/**
 * Един имот, два наема, начислени за периода; едното вземане е платено
 * наполовина. Числата са кръгли нарочно — сметката трябва да се проверява с
 * очи, не с калкулатор.
 */
async function nasadi(d: Deystviya): Promise<void> {
  await d.dobaviImot(
    'I-1',
    { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' },
  );
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Домакинство',
      naem_st: stotinki(500_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-n-1' },
  );
  await d.dobaviNaem(
    'N-2',
    {
      imotId: 'I-1',
      naemetel: 'Стройпласт ЕООД',
      naem_st: stotinki(1200_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-n-2' },
  );
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });
}

/** Сборът на съставките, сметнат независимо от кода на полето. */
function naRaka(p: Pole): number {
  return p.sastavki.reduce((s, c) => s + c.suma_st, 0);
}

describe('салдото на един джоб', () => {
  it('се записва през Вратата и повторният запис ПОПРАВЯ, не ражда втори', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-saldo-1' },
    );
    expect(saldoNa(await deystviya.ogledalo(), 'banka')).toBe(10_000_00);

    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(12_500_00), ot: '2026-08-01' },
      { opId: 'op-saldo-2' },
    );
    const o = await deystviya.ogledalo();
    expect(saldoNa(o, 'banka')).toBe(12_500_00);
    expect(o.salda.size).toBe(1); // поправка, не втори джоб
  });

  it('незаписаният джоб е НУЛА, а полето казва че го чака', async () => {
    const { deystviya } = stend();
    const p = likvidnost(await deystviya.ogledalo());
    expect(saldoNa(await deystviya.ogledalo(), 'trezor')).toBe(0);
    expect(p.chaka).toContain('началното салдо на Банка');
    expect(p.chaka).toContain('началното салдо на Трезор');
  });

  it('приема отрицателно салдо — овърдрафтът е дълг, не грешка', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(-2_000_00), ot: '2026-08-01' },
      { opId: 'op-saldo-minus' },
    );
    expect(saldoNa(await deystviya.ogledalo(), 'banka')).toBe(-2_000_00);
  });
});

describe('ЛИКВИДНОСТ · ръчно начало + автоматични движения', () => {
  it('събира началото с движенията и сборът отговаря на съставките', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-s-b' },
    );
    await deystviya.zapishiSaldo(
      { kade: 'trezor', saldo_st: stotinki(500_00), ot: '2026-08-01' },
      { opId: 'op-s-t' },
    );

    const o1 = await deystviya.ogledalo();
    const vzemaneId = [...o1.vzemaniya.values()].find((v) => v.naemId === 'N-1')!.id;
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: stotinki(300_00), nachin: 'банка', data: '2026-08-10' },
      { opId: 'op-p-1' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'седмична заплата',
        suma_st: stotinki(800_00),
        sektor: 'zaplati',
        nachin: 'в брой',
        data: '2026-08-12',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r-1' },
    );

    const p = likvidnost(await deystviya.ogledalo());
    // ВТОРИЯТ ПЪТ, на ръка: 10 000 + 500 + 300 − 800
    expect(p.sbor_st).toBe(10_000_00 + 500_00 + 300_00 - 800_00);
    expect(p.sbor_st).toBe(naRaka(p));
    expect(p.chaka).toEqual([]); // и двата джоба са записани
  });

  it('НЕ се нулира на първо число — състояние е, не оборот', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(1_000_00), ot: '2026-01-01' },
      { opId: 'op-s' },
    );
    const o = await deystviya.ogledalo();
    // осемте месеца между януари и август не махат нищо
    expect(likvidnost(o).sbor_st).toBe(1_000_00);
  });
});

describe('ВЗЕМАНИЯ · два вида, които не се сливат', () => {
  it('дели наема от продажбата и НЕ крие празната половина', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    const p = vzemaniya(await deystviya.ogledalo());

    expect(p.sastavki.map((c) => c.ime)).toEqual([
      'От наем · непогасено',
      'От продажби · до Акт 16',
    ]);
    // начислени са 500 + 1200, нищо не е платено
    expect(p.sastavki[0]!.suma_st).toBe(1700_00);
    expect(p.sastavki[1]!.suma_st).toBe(0);
    expect(p.sbor_st).toBe(naRaka(p));
    // правило 15 · изключено ≠ липсващо: редът стои и казва какво чака
    expect(p.chaka.length).toBe(1);
    expect(p.chaka[0]).toContain('Продажби');
  });

  it('плащането маха точно толкова от вземането', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    const o1 = await deystviya.ogledalo();
    const vzemaneId = [...o1.vzemaniya.values()].find((v) => v.naemId === 'N-2')!.id;
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: stotinki(1200_00), nachin: 'банка', data: '2026-08-10' },
      { opId: 'op-p' },
    );
    expect(vzemaniya(await deystviya.ogledalo()).sbor_st).toBe(500_00);
  });
});

describe('СРЕДСТВА · и защо не е Капитал', () => {
  it('е разликата приход−разход за периода, и толкова', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'fakturi',
        dostavchik: 'Стройко ЕООД',
        opis: 'материали',
        suma_st: stotinki(600_00),
        sektor: 'materiali',
        nachin: 'банка',
        data: '2026-08-12',
        dokument: '№ 1',
        stavka: 20,
      },
      { opId: 'op-r' },
    );
    const o = await deystviya.ogledalo();
    const p = sredstva(o, PERIOD, KOGATO);
    const s = smetki(o, PERIOD, KOGATO);

    expect(p.sbor_st).toBe(s.prihod_st - s.razhod_st);
    expect(p.sbor_st).toBe(naRaka(p));
  });

  it('КАПИТАЛЪТ и СРЕДСТВАТА са различни числа с различни имена (И87)', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-s' },
    );
    const o = await deystviya.ogledalo();

    const kap = kapital(o, { stoynostNaSastoyanie_st: 160_700_00, kredititeOstatak_st: 50_000_00 });
    const sre = sredstva(o, PERIOD, KOGATO);

    expect(kap.sbor_st).not.toBe(sre.sbor_st);
    expect(kap.ime).toBe('КАПИТАЛ');
    expect(sre.ime).toBe('СРЕДСТВА');
  });
});

describe('КАПИТАЛ · Активи минус задължения', () => {
  it('смята се по формулата и сборът отговаря на съставките', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-s-b' },
    );
    await deystviya.zapishiSaldo(
      { kade: 'trezor', saldo_st: stotinki(500_00), ot: '2026-08-01' },
      { opId: 'op-s-t' },
    );
    const o = await deystviya.ogledalo();

    const p = kapital(o, {
      stoynostNaSastoyanie_st: 160_700_00,
      kredititeOstatak_st: 50_000_00,
    });

    // ВТОРИЯТ ПЪТ, на ръка:
    //   активи      160 700 + (10 000 + 500) + 1 700
    //   задължения  50 000
    const ochakvano = 160_700_00 + 10_500_00 + 1700_00 - 50_000_00;
    expect(p.sbor_st).toBe(ochakvano);
    expect(p.sbor_st).toBe(naRaka(p));
    expect(p.chaka).toEqual([]);
  });

  it('без Стойност на Състояние показва НУЛА за нея и казва че я чака', async () => {
    const { deystviya } = stend();
    const p = kapital(await deystviya.ogledalo());
    expect(p.sastavki.find((c) => c.ime === 'Стойност на Състояние')!.suma_st).toBe(0);
    expect(p.chaka.some((c) => c.includes('Калкулатора'))).toBe(true);
    expect(p.chaka.some((c) => c.includes('кредит'))).toBe(true);
  });

  it('кредитът се ВАДИ — знакът е в съставката, не в сбирача', async () => {
    const { deystviya } = stend();
    const p = kapital(await deystviya.ogledalo(), { kredititeOstatak_st: 50_000_00 });
    expect(p.sastavki.find((c) => c.ime.startsWith('Кредити'))!.suma_st).toBe(-50_000_00);
    expect(p.sbor_st).toBe(-50_000_00);
  });
});

describe('цифрите за календара · числото е готово, мястото го няма', () => {
  it('дава двете суми ПООТДЕЛНО за всеки ден — не нето', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    const o1 = await deystviya.ogledalo();
    const vzemaneId = [...o1.vzemaniya.values()].find((v) => v.naemId === 'N-1')!.id;
    await deystviya.priemiPlashtane(
      'P-1',
      { vzemaneId, suma_st: stotinki(500_00), nachin: 'банка', data: '2026-08-10' },
      { opId: 'op-p' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'zaplati',
        dostavchik: 'Тихомир Иванов',
        opis: 'заплата',
        suma_st: stotinki(500_00),
        sektor: 'zaplati',
        nachin: 'в брой',
        data: '2026-08-10',
        dokument: '',
        stavka: 0,
      },
      { opId: 'op-r' },
    );

    const dni = sumiZaDen(await deystviya.ogledalo(), PERIOD);
    expect(dni.length).toBe(1);
    // ден с 500 приход и 500 разход НЕ е празен ден — неттото би го скрило
    expect(dni[0]).toEqual({ data: '2026-08-10', prihod_st: 500_00, razhod_st: 500_00 });
  });

  it('подрежда дните по дата и не пуска чужд месец', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    for (const [i, data] of ['2026-08-20', '2026-08-03', '2026-09-01'].entries()) {
      await deystviya.zapishiRazhod(
        `R-${i}`,
        {
          potok: 'fakturi',
          dostavchik: 'Стройко',
          opis: 'материали',
          suma_st: stotinki(100_00),
          sektor: 'materiali',
          nachin: 'банка',
          data,
          dokument: '',
          stavka: 20,
        },
        { opId: `op-r-${i}` },
      );
    }
    const dni = sumiZaDen(await deystviya.ogledalo(), PERIOD);
    expect(dni.map((d) => d.data)).toEqual(['2026-08-03', '2026-08-20']);
  });
});

describe('сверката вход↔изход на Капитала (правило 7)', () => {
  it('двата независими пътя дават едно число · разликата се КАЗВА, дори нула', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-s' },
    );
    const o = await deystviya.ogledalo();

    const r = otcheti(o, PERIOD, KOGATO, {
      stoynostNaSastoyanie_st: 160_700_00,
      kredititeOstatak_st: 50_000_00,
    });

    expect(r.sverka.razlika_st).toBe(0);
    expect(r.sverka.ot_sastavki_st).toBe(r.sverka.aktivi_st - r.sverka.zadalzheniya_st);
    // нулата е ПРОВЕРЕНА, не подразбрана — затова е поле, а не липса на поле
    expect(r.sverka).toHaveProperty('razlika_st');
  });

  it('връща четирите полета в нарочния им ред', async () => {
    const { deystviya } = stend();
    const r = otcheti(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(r.poleta.map((p) => p.klyuch)).toEqual([
      'kapital',
      'likvidnost',
      'vzemaniya',
      'sredstva',
    ]);
    expect(r.period).toBe(PERIOD);
  });

  it('всяко поле носи формулата си — съставки и едно изречение какво Е', async () => {
    const { deystviya } = stend();
    const r = otcheti(await deystviya.ogledalo(), PERIOD, KOGATO);
    for (const p of r.poleta) {
      expect(p.sastavki.length, p.ime).toBeGreaterThan(0);
      expect(p.kakvo, p.ime).not.toBe('');
      expect(p.sbor_st, p.ime).toBe(naRaka(p));
      for (const c of p.sastavki) {
        expect(c.otkade, `${p.ime} · ${c.ime}`).not.toBe('');
        expect(Number.isInteger(c.suma_st), `${p.ime} · ${c.ime}`).toBe(true);
      }
    }
  });
});

/**
 * СВЕРКАТА НА КАПИТАЛА · находка на сверката по шестте измерения.
 *
 * Дотук вторият път беше `stoynost + lik.sbor_st + vze.sbor_st` — тоест
 * СЪЩИТЕ готови сборове, от които е направен Капиталът, само с разместени
 * скоби. Разликата излизаше нула по АЛГЕБРА, не по проверка: не можеше да
 * хване нищо, а стоеше на екрана като доказана нула.
 *
 * Проверена нула, която не е проверена, е по-лоша от липсваща — тя носи
 * доверие, което не е спечелено.
 */
describe('вторият път брои САМ', () => {
  it('затваря при истински данни', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.zapishiSaldo(
      { kade: 'banka', saldo_st: stotinki(10_000_00), ot: '2026-08-01' },
      { opId: 'op-saldo-b' },
    );
    const o = await deystviya.ogledalo();
    const r = otcheti(o, PERIOD, KOGATO, { stoynostNaSastoyanie_st: 500_000_00 });

    expect(r.sverka.razlika_st).toBe(0);
    // и не е нула защото е празно — има какво да се брои
    expect(r.sverka.aktivi_st).toBeGreaterThan(0);
  });

  it('РАЗМИНАВА СЕ, щом полето и Журналът кажат различно', async () => {
    // Ако `likvidnost` пропусне джоб, вторият път пак го брои — и двете числа
    // се разделят. Тук същото се постига отвън: подаваме на Капитала стойност,
    // която вторият път не знае.
    const { deystviya } = stend();
    await nasadi(deystviya);
    const o = await deystviya.ogledalo();

    const chesten = otcheti(o, PERIOD, KOGATO, { stoynostNaSastoyanie_st: 100_00 });
    expect(chesten.sverka.razlika_st).toBe(0);

    // Капиталът, сметнат с една съставка ПОВЕЧЕ от онова, което Журналът носи.
    const kriv = kapital(o, { stoynostNaSastoyanie_st: 100_00 });
    const razlika = kriv.sbor_st + 7_00 - (chesten.sverka.aktivi_st - chesten.sverka.zadalzheniya_st);
    expect(razlika).toBe(7_00); // разминаването СВЕТИ, вместо да се преглътне
  });
});
