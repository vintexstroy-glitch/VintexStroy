/**
 * ЗАМРАЗЯВАНЕТО · подадена справка заключва месеца.
 *
 * Пази се неговото правило дословно: „няма да може да се редактира, ако има
 * такава справка" — а сверената промяна от таблица е единственият страничен
 * вход, и тя оставя следа.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { VID } from '../src/domein/sabitiya.js';
import { GreshkaZamrazen, eZamrazen } from '../src/domein/zamrazyavane.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { razchetiRazhodi } from '../src/iztochnik/razchitane.js';
import { prilozhi, sravni } from '../src/domein/aktualizatsiya.js';
import { platenoDDSZaPerioda } from '../src/ogledalo/ogledalo.js';
import { smetki } from '../src/domein/smetki.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-02';

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
  return { dnevnik, deystviya, vsichki: () => dnevnik.chetiVsichki(NAEMATEL) };
}

async function nasadi(d: Deystviya) {
  await d.dobaviImot('I-1', { adres: 'Дианабад', edinitsa: 'ОФИС № 3', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  await d.dobaviNaem('N-1', {
    imotId: 'I-1', naemetel: 'Стройпласт ЕООД', naem_st: stotinki(1200_00),
    padezhDen: 5, ot: '2026-01-01', do: '', depozit_st: 0, sektor: 'naem-targovski',
  }, { opId: 'op-naem' });
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });
}

async function poday(d: Deystviya) {
  return d.podaySpravka(
    { period: PERIOD, dds_deklarirano_st: stotinki(200_00), data: '2026-03-10', belezhka: '' },
    { opId: 'op-spravka' },
  );
}

describe('справката заключва', () => {
  it('след подаване вземане, плащане и разход за периода се отказват', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await poday(d);
    expect(eZamrazen(await d.ogledalo(), PERIOD)).toBe(true);

    const predi = (await vsichki()).length;

    await expect(
      d.nachisliVzemane('V-x', {
        naemId: 'N-1', period: PERIOD, osnovanie: 'наем',
        suma_st: stotinki(100_00), padezh: '2026-02-28',
      }, { opId: 'op-x1' }),
    ).rejects.toThrow(GreshkaZamrazen);

    await expect(
      d.priemiPlashtane('P-x', {
        vzemaneId: `V:${PERIOD}:N-1`, suma_st: stotinki(100_00),
        nachin: 'в брой', data: '2026-02-20',
      }, { opId: 'op-x2' }),
    ).rejects.toThrow(GreshkaZamrazen);

    await expect(
      d.zapishiRazhod('R-x', {
        potok: 'fakturi', dostavchik: 'Х', opis: 'х', suma_st: stotinki(100_00),
        sektor: 'pokupki-materiali', nachin: 'банка', data: '2026-02-14', dokument: '',
      }, { opId: 'op-x3' }),
    ).rejects.toThrow(GreshkaZamrazen);

    expect((await vsichki()).length).toBe(predi);
  });

  it('съседният месец не е заключен, а плащане ДНЕС по старо вземане минава', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await poday(d);

    // Март е свободен.
    await nachisliZaPeriod({ deystviya: d, period: '2026-03', kogato: KOGATO });

    // Пари, дошли ДНЕС за февруарско вземане: данъчното събитие на плащането
    // е неговата дата, а тя е в свободен месец.
    await d.priemiPlashtane('P-dnes', {
      vzemaneId: `V:${PERIOD}:N-1`, suma_st: stotinki(600_00),
      nachin: 'банка', data: '2026-03-15',
    }, { opId: 'op-dnes' });

    const o = await d.ogledalo();
    expect(o.vzemaniya.get(`V:${PERIOD}:N-1`)!.pogaseno_st).toBe(600_00);
  });

  it('сторно на събитие ОТ заключения период също се отказва', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    const vzemaneSeq = (await vsichki()).find((s) => s.type === 'ВземанеНачислено')!.seq;
    await poday(d);

    await expect(
      d.storniraj('S-x', { pogasyavaSeq: vzemaneSeq, prichina: 'опит' },
        { opId: 'op-sx' }, VID.vzemane),
    ).rejects.toThrow(GreshkaZamrazen);
  });

  it('втора справка за същия период се отказва с думи', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await poday(d);
    await expect(podayPak(d)).rejects.toThrow(/вече има справка/);

    async function podayPak(dd: Deystviya) {
      return dd.podaySpravka(
        { period: PERIOD, dds_deklarirano_st: stotinki(300_00), data: '2026-03-11', belezhka: '' },
        { opId: 'op-spravka-2' },
      );
    }
  });

  it('сторно на справката отключва — и следата остава в Журнала', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);
    await poday(d);

    const spravka = (await d.ogledalo()).spravki.get(PERIOD)!;
    await d.storniraj('S-SP', { pogasyavaSeq: spravka.seq, prichina: 'коригираща следва' },
      { opId: 'op-s-sp' }, VID.spravka);

    const o = await d.ogledalo();
    expect(eZamrazen(o, PERIOD)).toBe(false);

    // Периодът пак приема; следата — справка + сторно — стои в Журнала.
    await d.zapishiRazhod('R-sled', {
      potok: 'fakturi', dostavchik: 'Х', opis: 'късен', suma_st: stotinki(120_00),
      sektor: 'pokupki-materiali', nachin: 'банка', data: '2026-02-25', dokument: '',
    }, { opId: 'op-sled' });

    const tipove = (await vsichki()).map((s) => s.type);
    expect(tipove).toContain('СправкаПодадена');
    expect(tipove).toContain('Сторно');
  });
});

describe('сверената промяна — единственият страничен вход', () => {
  it('актуализацията от таблица минава и в заключен период, със следа', async () => {
    const { deystviya: d, vsichki } = stend();
    await nasadi(d);

    const izvor = (otpechatak: string, tekst: string) =>
      razchetiRazhodi({
        tablitsa: otCSV(`Доставчик;За какво;Сума;Дата;Документ\n${tekst}`),
        izvor: { vid: 'csv' as const, ime: 'февруари.csv', golemina: 1, promenen: KOGATO, otpechatak },
        period: PERIOD,
      });

    // Разход влиза, справка заключва.
    await prilozhi(d, sravni(await d.ogledalo(), izvor('aaa', 'Бетон ЕООД;бетон;600,00;10.02.2026;5001')),
      { potok: 'fakturi', sektor: 'pokupki-materiali', nachin: 'банка' }, KOGATO);
    await poday(d);

    // Поправеният файл минава ВЪПРЕКИ ключалката — това е сверената промяна.
    const plan = sravni(await d.ogledalo(), izvor('bbb', 'Бетон ЕООД;бетон;650,00;10.02.2026;5001'));
    const r = await prilozhi(d, plan,
      { potok: 'fakturi', sektor: 'pokupki-materiali', nachin: 'банка' }, KOGATO);
    expect(r.zapisani).toBe(1);
    expect(r.stornirani).toBe(1);
    expect(r.nared).toBe(true);

    const storno = (await vsichki()).filter((s) => s.type === 'Сторно').at(-1)!;
    expect(String((storno.payload as { prichina: string }).prichina)).toContain('сверена промяна');
    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(650_00);
  });
});

describe('трите числа на ДДС', () => {
  it('изчислено ↔ декларирано ↔ платено, и разликата свети', async () => {
    const { deystviya: d } = stend();
    await nasadi(d);
    await poday(d); // декларирано 200,00 — колкото е изчисленото

    await d.platiDDS('DP-1', { period: PERIOD, suma_st: stotinki(150_00), data: '2026-03-14', nachin: 'банка' },
      { opId: 'op-dp1' });
    await d.platiDDS('DP-2', { period: PERIOD, suma_st: stotinki(50_00), data: '2026-03-20', nachin: 'банка' },
      { opId: 'op-dp2' });

    const o = await d.ogledalo();
    const s = smetki(o, PERIOD, KOGATO);
    expect(s.zaVnasyane_st).toBe(200_00); // изчисленото
    expect(o.spravki.get(PERIOD)!.deklarirano_st).toBe(200_00);
    expect(platenoDDSZaPerioda(o, PERIOD)).toBe(200_00); // 150 + 50, на части

    // Сторнирано плащане пада от сбора.
    const dp2 = o.platenoDDS.get('DP-2')!;
    await d.storniraj('S-DP2', { pogasyavaSeq: dp2.seq, prichina: 'двойно въведено' },
      { opId: 'op-s-dp2' }, VID.spravka);
    expect(platenoDDSZaPerioda(await d.ogledalo(), PERIOD)).toBe(150_00);
  });
});
