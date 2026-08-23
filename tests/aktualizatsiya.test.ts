/**
 * АКТУАЛИЗАЦИЯ ОТ ИЗТОЧНИК · поправеният ексел среща Журнала.
 *
 * Двете неща, които се пазят тук:
 *   1. Числата излизат точно като в новия файл — справките са чисти.
 *   2. Журналът не е презаписан: сторно + ново, и следата казва кой файл.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { razchetiRazhodi } from '../src/iztochnik/razchitane.js';
import { imaShtoDaSePravi, prilozhi, sravni } from '../src/domein/aktualizatsiya.js';
import { smetki } from '../src/domein/smetki.js';
import type { Izvor } from '../src/iztochnik/snimka.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-02';
const NASTROYKI = { potok: 'fakturi', sektor: 'pokupki-materiali', nachin: 'банка' as const };

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

function izvor(otpechatak: string): Izvor {
  return {
    vid: 'csv',
    ime: 'Разходи февруари.csv',
    golemina: 200,
    promenen: '2026-03-01T10:00:00.000Z',
    otpechatak,
  };
}

const GLAVA = 'Доставчик;За какво;Сума;Дата;Документ';

function snimka(tekst: string, otpechatak: string) {
  return razchetiRazhodi({
    tablitsa: otCSV(`${GLAVA}\n${tekst}`),
    izvor: izvor(otpechatak),
    period: PERIOD,
  });
}

const PARV = ['Материали ООД;цимент;600,00;14.02.2026;1042', 'Ток ЕАД;ток;120,00;20.02.2026;7788'].join('\n');

describe('първо четене на период', () => {
  it('записва всичко и сверката затваря', async () => {
    const { deystviya: d } = stend();
    const s = snimka(PARV, 'aaa111');
    const plan = sravni(await d.ogledalo(), s);

    expect(plan.parvoChetene).toBe(true);
    expect(plan.redove.map((r) => r.kakvo)).toEqual(['nov', 'nov']);
    expect(plan.sled_st).toBe(720_00);

    const r = await prilozhi(d, plan, NASTROYKI, KOGATO);
    expect(r.zapisani).toBe(2);
    expect(r.stornirani).toBe(0);
    expect(r.nared).toBe(true);

    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(720_00);
  });

  it('следата казва кой файл и коя негова версия', async () => {
    const { deystviya: d } = stend();
    await prilozhi(d, sravni(await d.ogledalo(), snimka(PARV, 'aaa111')), NASTROYKI, KOGATO);

    const razhod = [...(await d.ogledalo()).razhodi.values()][0]!;
    expect(razhod.izvor).toBe('Разходи февруари.csv@aaa111');
    expect(razhod.klyuch).toBe('dok:1042');
  });

  it('същият файл, прочетен два пъти, не пише втори път', async () => {
    const { deystviya: d, vsichki } = stend();
    await prilozhi(d, sravni(await d.ogledalo(), snimka(PARV, 'aaa111')), NASTROYKI, KOGATO);
    const sled = (await vsichki()).length;

    const vtoriPlan = sravni(await d.ogledalo(), snimka(PARV, 'aaa111'));
    expect(imaShtoDaSePravi(vtoriPlan)).toBe(false);
    expect(vtoriPlan.redove.every((r) => r.kakvo === 'bezPromyana')).toBe(true);

    const r = await prilozhi(d, vtoriPlan, NASTROYKI, KOGATO);
    expect(r.zapisani).toBe(0);
    expect(r.bezPromyana).toBe(2);
    expect((await vsichki()).length).toBe(sled);
  });
});

describe('поправен файл за стар период', () => {
  it('сменената сума става сторно + ново, а сборът е като в новия файл', async () => {
    const { deystviya: d, vsichki } = stend();
    await prilozhi(d, sravni(await d.ogledalo(), snimka(PARV, 'aaa111')), NASTROYKI, KOGATO);

    const popraven = ['Материали ООД;цимент;650,00;14.02.2026;1042', 'Ток ЕАД;ток;120,00;20.02.2026;7788'].join('\n');
    const plan = sravni(await d.ogledalo(), snimka(popraven, 'bbb222'));

    expect(plan.parvoChetene).toBe(false);
    const promenen = plan.redove.find((r) => r.kakvo === 'promenen')!;
    expect(promenen.razlika_st).toBe(50_00);
    expect(plan.sega_st).toBe(720_00);
    expect(plan.sled_st).toBe(770_00);

    const r = await prilozhi(d, plan, NASTROYKI, KOGATO);
    expect(r.zapisani).toBe(1);
    expect(r.stornirani).toBe(1);
    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(770_00);

    // Журналът пази и старото, и сторното, и новото — нищо не е презаписано.
    const zhurnal = await vsichki();
    expect(zhurnal.filter((s) => s.type === 'РазходЗаписан')).toHaveLength(3);
    expect(zhurnal.filter((s) => s.type === 'Сторно')).toHaveLength(1);
    expect(zhurnal.some((s) => String((s.payload as { prichina?: string }).prichina ?? '')
      .includes('поправено от източника'))).toBe(true);
  });

  it('махнатият от файла ред се сторнира', async () => {
    const { deystviya: d } = stend();
    await prilozhi(d, sravni(await d.ogledalo(), snimka(PARV, 'aaa111')), NASTROYKI, KOGATO);

    const bezToka = 'Материали ООД;цимент;600,00;14.02.2026;1042';
    const plan = sravni(await d.ogledalo(), snimka(bezToka, 'ccc333'));
    expect(plan.redove.filter((r) => r.kakvo === 'izchezval')).toHaveLength(1);

    const r = await prilozhi(d, plan, NASTROYKI, KOGATO);
    expect(r.stornirani).toBe(1);
    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(600_00);
  });

  it('ръчно въведеният разход не се пипа от таблицата', async () => {
    const { deystviya: d } = stend();
    await d.zapishiRazhod(
      'R-rachen',
      {
        potok: 'zaplati', dostavchik: 'екип', opis: 'февруари',
        suma_st: stotinki(2000_00), sektor: 'zaplati', nachin: 'в брой',
        data: '2026-02-28', dokument: '',
      },
      { opId: 'op-rachen' },
    );

    const plan = sravni(await d.ogledalo(), snimka(PARV, 'aaa111'));
    expect(plan.rachni).toBe(1);
    expect(plan.parvoChetene).toBe(true);
    expect(plan.redove.some((r) => r.kakvo === 'izchezval')).toBe(false);

    await prilozhi(d, plan, NASTROYKI, KOGATO);
    expect(smetki(await d.ogledalo(), PERIOD, KOGATO).razhod_st).toBe(2720_00);
  });
});

describe('разчитането не преглъща редове', () => {
  it('брои какво е пропуснато и защо', () => {
    const s = snimka(
      [
        'Материали ООД;цимент;600,00;14.02.2026;1042',
        'Крив ред;нещо;не-е-сума;14.02.2026;1',
        'Друг месец;нещо;100,00;14.03.2026;2',
        ';;;;',
        'Без дата;нещо;100,00;;3',
      ].join('\n'),
      'ddd444',
    );

    expect(s.redove).toHaveLength(1);
    expect(s.propusnati).toHaveLength(3);
    expect(s.propusnati[0]!.zashto).toContain('Не е сума');
    expect(s.propusnati[1]!.zashto).toContain('извън 2026-02');
    expect(s.propusnati[2]!.zashto).toContain('липсва');
  });

  it('ред без документ пак получава стабилен ключ', () => {
    const s = snimka('Материали ООД;цимент;600,00;14.02.2026;', 'eee555');
    expect(s.redove[0]!.klyuch).toBe('red:2026-02-14|материали оод|60000');
  });

  it('два еднакви реда не се сливат в един', () => {
    const s = snimka(
      ['Материали ООД;цимент;600,00;14.02.2026;', 'Материали ООД;цимент;600,00;14.02.2026;'].join('\n'),
      'fff666',
    );
    expect(s.redove).toHaveLength(2);
    expect(new Set(s.redove.map((r) => r.klyuch)).size).toBe(2);
  });

  it('чужда таблица се отказва с думи', () => {
    expect(() =>
      razchetiRazhodi({ tablitsa: otCSV('едно;две\n1;2'), izvor: izvor('x'), period: PERIOD }),
    ).toThrow(/главата на таблицата/);
  });
});
