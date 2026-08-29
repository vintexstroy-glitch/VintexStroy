/**
 * СМЕТКИ · ДДС-то на отделен ред, изведено от общата цена.
 *
 * Тук се пазят две неща едновременно: думата на собственика — цената е обща,
 * не се разделя — и правилото от документите: отделни акумулатори, не един общ.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { smetki } from '../src/domein/smetki.js';
import { MERKA } from '../src/yadro/sverka.js';
import { fold } from '../src/ogledalo/ogledalo.js';
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

async function nasadi(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  await d.dobaviNaem(
    'N-zhil',
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
    { opId: 'op-n-zhil' },
  );
  await d.dobaviNaem(
    'N-targ',
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
    { opId: 'op-n-targ' },
  );
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });
}

describe('редът ДДС', () => {
  it('разделя по акумулатори, вместо да събира всичко в едно число', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    expect(s.dds.map((r) => r.akumulator.klyuch)).toEqual([
      'naem-targovski',
      'naem-zhilishten',
    ]);

    const targ = s.dds.find((r) => r.akumulator.klyuch === 'naem-targovski')!;
    expect(targ.obshta_st).toBe(1200_00);
    expect(targ.osnova_st).toBe(1000_00);
    expect(targ.dds_st).toBe(200_00);

    const zhil = s.dds.find((r) => r.akumulator.klyuch === 'naem-zhilishten')!;
    expect(zhil.dds_st).toBe(0);
    expect(zhil.osnova_st).toBe(500_00);

    expect(s.zaVnasyane_st).toBe(200_00);
    expect(s.nared).toBe(true);
  });

  it('приходът остава ОБЩА цена — вземането не се разделя', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const o = await deystviya.ogledalo();
    const s = smetki(o, PERIOD, KOGATO);

    expect(s.prihod_st).toBe(1700_00);
    for (const v of o.vzemaniya.values()) {
      expect(v.nachisleno_st).toBe(o.naemi.get(v.naemId)!.naem_st);
    }
  });

  it('сверката затваря и се записва дори когато разликата е нула', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    // ПЕТ, не четири: приходната страна вече има ДВЕ числа (наеми · продажби)
    // и своя сверка върху самата таблица (резен 23 · ADR-083).
    expect(s.sverki).toHaveLength(5);
    expect(s.sverki.every((x) => x.razlika === 0)).toBe(true);
    expect(s.sverki.every((x) => x.nared)).toBe(true);
  });

  it('всяка сверка казва в какво се мери — стотинки не се четат като бройки', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(s.sverki.map((x) => x.belezhka)).toEqual([
      MERKA.pari,
      MERKA.broy,
      MERKA.pari,
      MERKA.broy,
      MERKA.pari,
    ]);
    expect(s.sverki[0]!.vhod).toBe(1700_00);
    expect(s.sverki[1]!.vhod).toBe(2);
    // Разходната страна е празна, но сверката ѝ пак се записва — нула също е отговор.
    expect(s.sverki[2]!.vhod).toBe(0);
    expect(s.sverki[3]!.vhod).toBe(0);
    // Петата гледа ТАБЛИЦАТА: сборът на приходните редове, които СЪБИРАТ.
    expect(s.sverki[4]!.vhod).toBe(1700_00);
  });
});

describe('потоците пари', () => {
  it('КЕШ и БАНКА показват какво е влязло, а редът ДДС не мърда', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const predi = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);

    await deystviya.priemiPlashtane(
      'P-1',
      {
        vzemaneId: `V:${PERIOD}:N-targ`,
        suma_st: stotinki(600_00),
        nachin: 'в брой',
        data: '2026-08-20',
      },
      { opId: 'op-p1' },
    );
    await deystviya.priemiPlashtane(
      'P-2',
      {
        vzemaneId: `V:${PERIOD}:N-zhil`,
        suma_st: stotinki(500_00),
        nachin: 'банка',
        data: '2026-08-21',
      },
      { opId: 'op-p2' },
    );

    const sled = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    const red = (k: string) => sled.redove.find((r) => r.klyuch === k)!;

    expect(red('kesh').suma_st).toBe(600_00);
    expect(red('banka').suma_st).toBe(500_00);
    expect(sled.sabrano_st).toBe(1100_00);

    // Данъчното събитие е падежът, не денят на парите.
    expect(sled.zaVnasyane_st).toBe(predi.zaVnasyane_st);
    expect(sled.prihod_st).toBe(predi.prihod_st);
  });

  it('Заплати и Кредити стоят като редове на нула, вместо да липсват', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(s.redove.map((r) => r.klyuch)).toEqual([
      'naemi',
      'kesh',
      'banka',
      'prodazhbi',
      'zaplati',
      'krediti',
      'fakturi',
    ]);
    for (const k of ['zaplati', 'krediti', 'fakturi']) {
      const r = s.redove.find((x) => x.klyuch === k)!;
      expect(r.posoka).toBe('разход');
      expect(r.suma_st).toBe(0);
    }
    expect(s.razhod_st).toBe(0);
  });

  it('плащане от друг месец не влиза в периода', async () => {
    const { deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      {
        vzemaneId: `V:${PERIOD}:N-targ`,
        suma_st: stotinki(100_00),
        nachin: 'в брой',
        data: '2026-09-02',
      },
      { opId: 'op-p1' },
    );

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(s.sabrano_st).toBe(0);
    expect(smetki(await deystviya.ogledalo(), '2026-09', KOGATO).sabrano_st).toBe(100_00);
  });
});

describe('сторно и стари събития', () => {
  it('сторнирано плащане не остава в КЕШ', async () => {
    const { dnevnik, deystviya } = stend();
    await nasadi(deystviya);
    await deystviya.priemiPlashtane(
      'P-1',
      {
        vzemaneId: `V:${PERIOD}:N-targ`,
        suma_st: stotinki(600_00),
        nachin: 'в брой',
        data: '2026-08-20',
      },
      { opId: 'op-p1' },
    );

    const o = await deystviya.ogledalo();
    const seq = o.plashtaniya.get('P-1')!.seq;
    await deystviya.storniraj(
      'P-1',
      { pogasyavaSeq: seq, prichina: 'сгрешена сума' },
      { opId: 'op-storno' },
    );

    const s = smetki(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect(s.sabrano_st).toBe(0);
    // Журналът пази и двете събития — нищо не е изтрито.
    expect((await dnevnik.chetiVsichki(NAEMATEL)).filter((x) => x.type === 'Сторно'))
      .toHaveLength(1);
  });

  it('наем, записан без сектор (преди резен 4), се брои като жилищен', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
      { opId: 'op-imot' });
    await deystviya.dobaviNaem(
      'N-staro',
      {
        imotId: 'I-1',
        naemetel: 'от старо време',
        naem_st: stotinki(300_00),
        padezhDen: 5,
        ot: '2024-01-01',
        do: '',
        depozit_st: 0,
        // Точно това е случаят: полето липсва в записаното събитие.
        sektor: undefined as unknown as string,
      },
      { opId: 'op-n-staro' },
    );
    await nachisliZaPeriod({ deystviya, period: PERIOD, kogato: KOGATO });

    const o = fold(await dnevnik.chetiVsichki(NAEMATEL));
    expect(o.naemi.get('N-staro')!.sektor).toBe('naem-zhilishten');

    const s = smetki(o, PERIOD, KOGATO);
    expect(s.dds).toHaveLength(1);
    expect(s.dds[0]!.akumulator.klyuch).toBe('naem-zhilishten');
    expect(s.nared).toBe(true);
  });
});
