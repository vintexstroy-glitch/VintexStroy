/**
 * СПРАВКИТЕ ЗА СЧЕТОВОДСТВОТО · четирите, поименно (резен 17г).
 *
 * Шестте обещания:
 *
 *   1. Двете оси се четат от ДАННИТЕ · остатъкът казва платено, справката —
 *      декларирано.
 *   2. Разходът е ВИНАГИ платен · и това е ГРАНИЦА, не грешка · брои се.
 *   3. „Недекларирани, но платени" е сечението на двете · и то е единствената
 *      от четирите, която струва пари.
 *   4. Един ред влиза в НЯКОЛКО справки · сборовете им не се събират.
 *   5. Сверката вход↔изход върху самите справки · нищо не изпада.
 *   6. Месеците за подаване се СМЯТАТ · човек подава месец, не фактура.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  chetiriteSpravki,
  GreshkaSpravka,
  LIPSVASHTITE,
  mesetsiteZaPodavane,
  redoveteZaSchetovodstvoto,
  sveriSpravkite,
} from '../src/domein/spravki-schetovodstvo.js';
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

/**
 * ЕДИН СТЕНД ЗА ВСИЧКО · два месеца, четири реда.
 *
 *   май  · вземане 800 · ПЛАТЕНО 800 · месецът е ПОДАДЕН
 *   май  · разход 600 · (винаги платен) · месецът е ПОДАДЕН
 *   юни  · вземане 800 · платено 300 → остатък 500 · месецът НЕ е подаден
 *   юни  · разход 200 · (винаги платен) · месецът НЕ е подаден
 */
async function dvaMesetsa() {
  const { deystviya } = stend();
  await deystviya.dobaviImot(
    'I-1',
    { adres: 'Малинова долина 1', edinitsa: 'ап. 3', ploshtad_kvsm: 850_000 },
    { opId: 'imot:1' },
  );
  await deystviya.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Наемател ЕООД',
      naem_st: 80_000,
      padezhDen: 5,
      ot: '2026-01-01',
      do: '2026-12-31',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'naem:1' },
  );

  await deystviya.nachisliVzemane(
    'V-may',
    {
      naemId: 'N-1',
      period: '2026-05',
      osnovanie: 'наем май',
      suma_st: 80_000,
      padezh: '2026-05-05',
    },
    { opId: 'vzemane:1' },
  );
  await deystviya.priemiPlashtane(
    'P-may',
    { vzemaneId: 'V-may', suma_st: 80_000, nachin: 'банка', data: '2026-05-06' },
    { opId: 'plashtane:1' },
  );
  await deystviya.zapishiRazhod(
    'R-may',
    {
      potok: 'fakturi',
      dostavchik: 'Материали ООД',
      opis: 'цимент',
      suma_st: 60_000,
      sektor: 'pokupki-materiali',
      nachin: 'банка',
      data: '2026-05-12',
      dokument: '1042',
    },
    { opId: 'razhod:1' },
  );

  await deystviya.nachisliVzemane(
    'V-yuni',
    {
      naemId: 'N-1',
      period: '2026-06',
      osnovanie: 'наем юни',
      suma_st: 80_000,
      padezh: '2026-06-05',
    },
    { opId: 'vzemane:2' },
  );
  await deystviya.priemiPlashtane(
    'P-yuni',
    { vzemaneId: 'V-yuni', suma_st: 30_000, nachin: 'банка', data: '2026-06-06' },
    { opId: 'plashtane:2' },
  );
  await deystviya.zapishiRazhod(
    'R-yuni',
    {
      potok: 'fakturi',
      dostavchik: 'Ток ЕАД',
      opis: 'ток',
      suma_st: 20_000,
      sektor: 'pokupki-materiali',
      nachin: 'карта',
      data: '2026-06-12',
      dokument: '2042',
    },
    { opId: 'razhod:2' },
  );

  // ВТОРИ юнски разход · за да има какво да СЕ ГРУПИРА в един месец. С един
  // ред групиране и негрупиране дават еднакъв изход и не могат да се различат.
  await deystviya.zapishiRazhod(
    'R-yuni-2',
    {
      potok: 'fakturi',
      dostavchik: 'Вода ЕАД',
      opis: 'вода',
      suma_st: 15_000,
      sektor: 'pokupki-materiali',
      nachin: 'банка',
      data: '2026-06-20',
      dokument: '2043',
    },
    { opId: 'razhod:3' },
  );

  // НАДПЛАТЕНОТО · юли, платено 900 срещу 800. То е ПЛАТЕНО, не „друго":
  // остатъкът му е ПОД нулата, и проверка с `> 0` го хваща, а с `!== 0` — не.
  await deystviya.nachisliVzemane(
    'V-yuli',
    {
      naemId: 'N-1',
      period: '2026-07',
      osnovanie: 'наем юли',
      suma_st: 80_000,
      padezh: '2026-07-05',
    },
    { opId: 'vzemane:3' },
  );
  await deystviya.priemiPlashtane(
    'P-yuli',
    { vzemaneId: 'V-yuli', suma_st: 90_000, nachin: 'банка', data: '2026-07-06' },
    { opId: 'plashtane:3' },
  );

  // САМО МАЙ е подаден · юни и юли чакат
  await deystviya.podaySpravka(
    { period: '2026-05', dds_deklarirano_st: 3_333, data: '2026-06-14', belezhka: '' },
    { opId: 'spravka:1' },
  );

  return deystviya;
}

describe('двете оси се четат от ДАННИТЕ', () => {
  it('1 · остатъкът казва платено · справката казва декларирано', async () => {
    const deystviya = await dvaMesetsa();
    const o = await deystviya.ogledalo();
    const redove = redoveteZaSchetovodstvoto(o, '2026-05', '2026-06');
    expect(redove).toHaveLength(5);

    // НАДПЛАТЕНОТО е ПЛАТЕНО · остатъкът му е под нулата, не над нея
    const yuli = redoveteZaSchetovodstvoto(o, '2026-07', '2026-07');
    expect(yuli).toHaveLength(1);
    expect(yuli[0]!.sastoyanie).toBe('plateno');
    expect(yuli[0]!.plateno_st).toBeGreaterThan(yuli[0]!.suma_st);

    const po = new Map(redove.map((r) => [r.klyuch, r]));
    expect(po.get('vzemane:V-may')!.sastoyanie).toBe('plateno');
    expect(po.get('vzemane:V-may')!.deklarirano).toBe('deklarirano');
    expect(po.get('vzemane:V-yuni')!.sastoyanie).toBe('neplateno');
    expect(po.get('vzemane:V-yuni')!.deklarirano).toBe('nedeklarirano');
    // частичното плащане НЕ прави реда платен · остават 500
    expect(po.get('vzemane:V-yuni')!.plateno_st).toBe(30_000);
    expect(po.get('vzemane:V-yuni')!.suma_st).toBe(80_000);
    // името се СТИГА през наема · вземането носи само връзка
    expect(po.get('vzemane:V-may')!.koy).toBe('Наемател ЕООД');
  });

  it('2 · разходът е ВИНАГИ платен · и границата се БРОИ, не се твърди', async () => {
    const deystviya = await dvaMesetsa();
    const redove = redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06');
    const razhodi = redove.filter((r) => r.posoka === 'razhod');
    expect(razhodi).toHaveLength(3);
    expect(razhodi.every((r) => r.sastoyanie === 'plateno')).toBe(true);
    expect(razhodi.every((r) => r.plateno_st === r.suma_st)).toBe(true);

    // ЛИПСАТА е изброена · екранът я чете оттук, не от изречение в коментар
    expect(LIPSVASHTITE).toHaveLength(1);
    expect(LIPSVASHTITE[0]).toContain('ОЩЕ НЕПЛАТЕНА');
  });

  it('периодите се проверяват · и краят не е преди началото', async () => {
    const deystviya = await dvaMesetsa();
    const o = await deystviya.ogledalo();
    expect(() => redoveteZaSchetovodstvoto(o, 'май', '2026-06')).toThrow(GreshkaSpravka);
    expect(() => redoveteZaSchetovodstvoto(o, '2026-06', '2026-05')).toThrow(GreshkaSpravka);
  });

  it('извън обхвата не влиза нищо', async () => {
    const deystviya = await dvaMesetsa();
    const o = await deystviya.ogledalo();
    expect(redoveteZaSchetovodstvoto(o, '2026-05', '2026-05')).toHaveLength(2);
    expect(redoveteZaSchetovodstvoto(o, '2026-06', '2026-06')).toHaveLength(3);
    expect(redoveteZaSchetovodstvoto(o, '2026-08', '2026-09')).toHaveLength(0);
  });
});

describe('четирите справки', () => {
  it('3 · „недекларирани, но платени" е СЕЧЕНИЕТО на двете оси', async () => {
    const deystviya = await dvaMesetsa();
    const redove = redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06');
    const s = chetiriteSpravki(redove);

    // май: вземане 800 + разход 600 · юни: два разхода → четири платени
    expect(s.plateni.redove.map((r) => r.klyuch).sort()).toEqual([
      'razhod:R-may',
      'razhod:R-yuni',
      'razhod:R-yuni-2',
      'vzemane:V-may',
    ]);
    // само юнското вземане е неплатено
    expect(s.neplateni.redove.map((r) => r.klyuch)).toEqual(['vzemane:V-yuni']);
    // май е подаден · двата му реда са декларирани
    expect(s.deklarirani.redove.map((r) => r.klyuch).sort()).toEqual([
      'razhod:R-may',
      'vzemane:V-may',
    ]);
    // ПЛАТЕНО И НЕДЕКЛАРИРАНО · двата юнски разхода
    expect(s.nedeklariraniNoPlateni.redove.map((r) => r.klyuch).sort()).toEqual([
      'razhod:R-yuni',
      'razhod:R-yuni-2',
    ]);
    expect(s.nedeklariraniNoPlateni.sbor_st).toBe(35_000);
  });

  it('4 · един ред влиза в НЯКОЛКО справки · сборовете им не се събират', async () => {
    const deystviya = await dvaMesetsa();
    const redove = redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06');
    const s = chetiriteSpravki(redove);

    // майското вземане е и ПЛАТЕНО, и ДЕКЛАРИРАНО — един ред, две справки
    expect(s.plateni.redove.some((r) => r.klyuch === 'vzemane:V-may')).toBe(true);
    expect(s.deklarirani.redove.some((r) => r.klyuch === 'vzemane:V-may')).toBe(true);

    const vsichki_st = redove.reduce((x, r) => x + r.suma_st, 0);
    const chetirite_st =
      s.plateni.sbor_st + s.neplateni.sbor_st + s.deklarirani.sbor_st +
      s.nedeklariraniNoPlateni.sbor_st;
    // сборът на ЧЕТИРИТЕ е ПО-ГОЛЯМ от масата · те са въпроси, не дялове
    expect(chetirite_st).toBeGreaterThan(vsichki_st);
    // а ДВЕТЕ взаимно изключващи се дават точно нея
    expect(s.plateni.sbor_st + s.neplateni.sbor_st).toBe(vsichki_st);
  });

  it('всяка справка КАЗВА какво пита · името не се гадае', async () => {
    const deystviya = await dvaMesetsa();
    const s = chetiriteSpravki(
      redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06'),
    );
    expect(Object.keys(s)).toHaveLength(4);
    expect(Object.values(s).every((x) => x.pita.length > 0)).toBe(true);
    expect(s.nedeklariraniNoPlateni.pita).toContain('струва пари');
  });

  it('5 · сверката вход↔изход · нищо не изпада от двете оси', async () => {
    const deystviya = await dvaMesetsa();
    const redove = redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06');
    const sverka = sveriSpravkite(redove, chetiriteSpravki(redove));
    expect(sverka.vsichki).toBe(5);
    expect(sverka.poPlateno).toBe(5);
    expect(sverka.poDeklarirano).toBe(5);
    expect(sverka.nared).toBe(true);
  });

  it('6 · месеците за подаване се СМЯТАТ · човек подава МЕСЕЦ, не фактура', async () => {
    const deystviya = await dvaMesetsa();
    const s = chetiriteSpravki(
      redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06'),
    );
    const mesetsi = mesetsiteZaPodavane(s);
    // ДВАТА юнски реда стават ЕДИН месец с БРОЙ 2 · това е групирането
    expect(mesetsi).toEqual([{ period: '2026-06', broy: 2, suma_st: 35_000 }]);
    // МАЙ го няма · той е подаден
    expect(mesetsi.some((m) => m.period === '2026-05')).toBe(false);
  });

  it('подаването на юни ГАСИ находката · без нищо друго да се пипа', async () => {
    const deystviya = await dvaMesetsa();
    await deystviya.podaySpravka(
      { period: '2026-06', dds_deklarirano_st: 1_111, data: '2026-07-14', belezhka: '' },
      { opId: 'spravka:2' },
    );
    const s = chetiriteSpravki(
      redoveteZaSchetovodstvoto(await deystviya.ogledalo(), '2026-05', '2026-06'),
    );
    expect(mesetsiteZaPodavane(s)).toEqual([]);
    expect(s.nedeklariraniNoPlateni.redove).toHaveLength(0);
    // а неплатеното си ОСТАВА неплатено · подаването не мени парите
    expect(s.neplateni.redove.map((r) => r.klyuch)).toEqual(['vzemane:V-yuni']);
  });
});
