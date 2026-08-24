/**
 * ГАНТЪТ · решетката, лентите, светофарът и подредбата.
 *
 * Всяко число тук е НЕГОВО и се пази поименно: 7 и 2 дни за светофара,
 * 1 · 7 · 31 · 12 колони за тактовете, 5× за обхвата, „завършените долу".
 * Тестът пази числата от „оптимизиране" — точно те са първото, което една
 * следваща ръка би закръглила.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  dniDoKraya,
  eEdnodnevno,
  IMENA_NA_OTSENKITE,
  OTSENKI,
  podredi,
  svetofar,
  vidimi,
  type Delo,
} from '../src/domein/dela.js';
import {
  KRATNOST_NA_OBHVATA,
  koloni,
  lentaNa,
  obobshtenRed,
  RESHETKA,
  reshetka,
  TAKTOVE,
} from '../src/domein/gant.js';
import { SHA } from './pomoshtni.js';

const DNES = '2026-08-23';

function delo(p: Partial<Delo> & { id: string }): Delo {
  return {
    seq: 1,
    myasto: 'Малинова',
    obekt: '',
    ime: 'дело',
    otgovornik: 'Николай Петков',
    ot: DNES,
    do: DNES,
    otsenka: 'нито-едно',
    sastoyanie: 'чака',
    nadDelo: '',
    dokument: '',
    ...p,
  };
}

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  return new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 9, 0, tik++)).toISOString(),
  });
}

describe('делото · трите колони, не трите нива', () => {
  it('се записва през Вратата и повторният запис ПОПРАВЯ същото дело', async () => {
    const d = stend();
    const danni = {
      myasto: 'Малинова',
      obekt: 'бл. 1',
      ime: 'Акт 15',
      otgovornik: 'Николай Петков',
      ot: '2026-09-01',
      do: '2026-09-30',
      otsenka: 'спешно-важно',
      sastoyanie: 'чака',
      nadDelo: '',
      dokument: '',
    };
    await d.zapishiDelo('D-1', danni, { opId: 'op-1' });
    await d.zapishiDelo('D-1', { ...danni, do: '2026-10-15' }, { opId: 'op-2' });

    const o = await d.ogledalo();
    expect(o.dela.size).toBe(1);
    expect(o.dela.get('D-1')!.do).toBe('2026-10-15');
    // seq-ът на СЪЗДАВАНЕТО не мърда — сторното сочи него
    expect(o.dela.get('D-1')!.seq).toBe(1);
  });

  it('приема дело БЕЗ обект — „задачите без обект" е негов случай', async () => {
    const d = stend();
    await d.zapishiDelo(
      'D-1',
      {
        myasto: 'Хисаря',
        obekt: '',
        ime: 'Оглед',
        otgovornik: 'Ивайло Петков',
        ot: DNES,
        do: DNES,
        otsenka: 'важно-неспешно',
        sastoyanie: 'чака',
        nadDelo: '',
        dokument: '',
      },
      { opId: 'op-1' },
    );
    expect((await d.ogledalo()).dela.get('D-1')!.obekt).toBe('');
  });
});

describe('оценката · Айзенхауер + завършено', () => {
  it('е ПЕТ, не четири — четирите квадранта плюс изхода от матрицата', () => {
    expect(OTSENKI.length).toBe(5);
    expect(IMENA_NA_OTSENKITE['спешно-важно']).toBe('Спешно и Важно');
    expect(IMENA_NA_OTSENKITE['нито-едно']).toBe('Не важно и Не спешно');
  });

  it('подрежда спешност → Оценка → завършените ДОЛУ', () => {
    const dela = [
      delo({ id: 'A', ime: 'завършено дело', otsenka: 'завършено' }),
      delo({ id: 'B', ime: 'нито едно', otsenka: 'нито-едно' }),
      delo({ id: 'C', ime: 'спешно и важно', otsenka: 'спешно-важно' }),
      delo({ id: 'D', ime: 'важно, не спешно', otsenka: 'важно-неспешно' }),
    ];
    expect(podredi(dela, DNES).map((d) => d.id)).toEqual(['C', 'D', 'B', 'A']);
  });
});

describe('светофарът · неговите две числа, 7 и 2', () => {
  it('свети нормално, докато остава повече от седмица', () => {
    expect(svetofar(delo({ id: 'A', do: '2026-09-30' }), DNES)).toBe('normalno');
  });

  it('жълто ТОЧНО от седмия ден', () => {
    expect(svetofar(delo({ id: 'A', do: '2026-08-30' }), DNES)).toBe('zhalto');
    expect(svetofar(delo({ id: 'A', do: '2026-08-31' }), DNES)).toBe('normalno');
  });

  it('червено ТОЧНО от втория ден', () => {
    expect(svetofar(delo({ id: 'A', do: '2026-08-25' }), DNES)).toBe('cherveno');
    expect(svetofar(delo({ id: 'A', do: '2026-08-26' }), DNES)).toBe('zhalto');
  });

  it('просрочено е СВОЕ състояние, не просто червено', () => {
    expect(svetofar(delo({ id: 'A', do: '2026-08-22' }), DNES)).toBe('prosrocheno');
    expect(dniDoKraya(delo({ id: 'A', do: '2026-08-22' }), DNES)).toBe(-1);
  });

  it('завършеното не гори, колкото и да е просрочено', () => {
    expect(svetofar(delo({ id: 'A', do: '2020-01-01', sastoyanie: 'завършено' }), DNES)).toBe(
      'normalno',
    );
  });

  it('еднодневното дело се познава по ot === do', () => {
    expect(eEdnodnevno(delo({ id: 'A', ot: DNES, do: DNES }))).toBe(true);
    expect(eEdnodnevno(delo({ id: 'A', ot: DNES, do: '2026-08-30' }))).toBe(false);
  });
});

describe('сгъването · само дела и поддела (И88)', () => {
  it('сгънатото дело крие подделата си', () => {
    const dela = [
      delo({ id: 'A' }),
      delo({ id: 'A1', nadDelo: 'A' }),
      delo({ id: 'A2', nadDelo: 'A' }),
      delo({ id: 'B' }),
    ];
    expect(vidimi(dela, new Set(['A'])).map((d) => d.id)).toEqual(['A', 'B']);
    expect(vidimi(dela, new Set()).map((d) => d.id)).toEqual(['A', 'A1', 'A2', 'B']);
  });

  it('крие и подподделото — сгъването не оставя сираци', () => {
    const dela = [
      delo({ id: 'A' }),
      delo({ id: 'A1', nadDelo: 'A' }),
      delo({ id: 'A1a', nadDelo: 'A1' }),
    ];
    expect(vidimi(dela, new Set(['A'])).map((d) => d.id)).toEqual(['A']);
  });
});

describe('решетката · първата колона е ДНЕС', () => {
  it('за всеки такт колоната на днес е там, където се очаква', () => {
    for (const takt of TAKTOVE) {
      const k = koloni(takt, DNES);
      const dnesni = k.filter((x) => x.dnes);
      expect(dnesni.length, takt).toBe(1);
      // назад стои точно една видима крачка история — за да има какво да покаже
      // скролът наляво, без да опира в стена
      expect(k.indexOf(dnesni[0]!), takt).toBe(RESHETKA[takt].vidimi);
    }
  });

  it('носи ПЕТ ПЪТИ видимото напред — негово число', () => {
    for (const takt of TAKTOVE) {
      const vid = RESHETKA[takt].vidimi;
      expect(koloni(takt, DNES).length, takt).toBe(vid * KRATNOST_NA_OBHVATA + vid);
    }
  });

  it('неговите числа за тактовете стоят непокътнати', () => {
    expect(RESHETKA.den.vidimi).toBe(1);
    expect(RESHETKA.sedmitsa.vidimi).toBe(7);
    expect(RESHETKA.mesets.vidimi).toBe(31); // „1 месец с стъпка 31"
    expect(RESHETKA.godina.vidimi).toBe(12);
    expect(KRATNOST_NA_OBHVATA).toBe(5);
  });

  it('годината върви по КАЛЕНДАРНИ месеци, не по 30 дни', () => {
    const k = koloni('godina', DNES);
    const dnes = k.find((x) => x.dnes)!;
    expect(dnes.ot).toBe('2026-08-01');
    expect(dnes.do).toBe('2026-08-31');
    expect(dnes.nadpis).toBe('авг 26');
  });
});

describe('лентата · от коя колона до коя', () => {
  const k = koloni('mesets', DNES);

  it('еднодневното дело дава ЕДНА колона', () => {
    const l = lentaNa(delo({ id: 'A', ot: DNES, do: DNES }), k)!;
    expect(l.broy).toBe(1);
    expect(k[l.ot]!.ot).toBe(DNES);
  });

  it('седемдневното дело дава СЕДЕМ', () => {
    const l = lentaNa(delo({ id: 'A', ot: '2026-08-23', do: '2026-08-29' }), k)!;
    expect(l.broy).toBe(7);
  });

  it('излизането се БЕЛЯЗВА, не се отрязва тихо', () => {
    const staro = lentaNa(delo({ id: 'A', ot: '2020-01-01', do: DNES }), k)!;
    expect(staro.izlizaNalyavo).toBe(true);
    expect(staro.izlizaNadyasno).toBe(false);

    const dalgo = lentaNa(delo({ id: 'B', ot: DNES, do: '2030-01-01' }), k)!;
    expect(dalgo.izlizaNadyasno).toBe(true);
  });

  it('дело изцяло извън прозореца НЕ дава лента', () => {
    expect(lentaNa(delo({ id: 'A', ot: '2019-01-01', do: '2019-02-01' }), k)).toBe(null);
  });

  it('решетката връща лента само за делата, които се виждат в нея', () => {
    const r = reshetka(
      [
        delo({ id: 'A', ot: DNES, do: DNES }),
        delo({ id: 'B', ot: '2019-01-01', do: '2019-01-02' }),
      ],
      'mesets',
      DNES,
    );
    expect(r.lenti.map((l) => l.deloId)).toEqual(['A']);
    expect(r.vidimi).toBe(31);
  });
});

describe('обобщеният ред · „в зависимост от времевия такт"', () => {
  it('събира по КОЛОНА на решетката, не по календарен месец', () => {
    const k = koloni('godina', DNES);
    const redove = obobshtenRed(k, [
      { data: '2026-08-05', prihod_st: 1000_00, razhod_st: 0 },
      { data: '2026-08-20', prihod_st: 500_00, razhod_st: 200_00 },
      { data: '2026-09-01', prihod_st: 0, razhod_st: 700_00 },
    ]);
    const avgust = k.findIndex((x) => x.ot === '2026-08-01');
    expect(redove[avgust]).toEqual({ prihod_st: 1500_00, razhod_st: 200_00 });
    expect(redove[avgust + 1]).toEqual({ prihod_st: 0, razhod_st: 700_00 });
  });

  it('при такт СЕДМИЦА същите движения падат в РАЗНИ колони', () => {
    const k = koloni('sedmitsa', DNES);
    const redove = obobshtenRed(k, [
      { data: '2026-08-23', prihod_st: 100_00, razhod_st: 0 },
      { data: '2026-08-24', prihod_st: 200_00, razhod_st: 0 },
    ]);
    const i = k.findIndex((x) => x.ot === '2026-08-23');
    expect(redove[i]!.prihod_st).toBe(100_00);
    expect(redove[i + 1]!.prihod_st).toBe(200_00);
  });

  it('дава по един ред за ВСЯКА колона, включително празните', () => {
    const k = koloni('sedmitsa', DNES);
    expect(obobshtenRed(k, []).length).toBe(k.length);
  });
});

/**
 * НЕПОЗНАТАТА ОЦЕНКА · находка на сверката: `TEZHEST[непозната]` даваше NaN,
 * NaN е лъжливо за ||, и сравнителят ставаше непоследователен — подредбата
 * по спешност се обръщаше мълчешком при стар Журнал или чужд внос.
 */
describe('подредбата при непозната оценка', () => {
  it('непознатото пада НАКРАЯ, а спешното остава първо', () => {
    const delo = (id: string, otsenka: string): Delo => ({
      id, seq: 1, myasto: 'Малинова', obekt: '', ime: id, otgovornik: '',
      ot: '2026-08-20', do: '2026-09-20',
      otsenka: otsenka as Delo['otsenka'], sastoyanie: 'чака', nadDelo: '', dokument: '',
    });
    const podredeni = podredi(
      [delo('чуждо', 'измислена-оценка'), delo('спешното', 'спешно-важно'), delo('обикновено', 'нито-едно')],
      '2026-08-24',
    );
    expect(podredeni[0]!.ime).toBe('спешното');
    expect(podredeni[podredeni.length - 1]!.ime).toBe('чуждо');
  });
});
