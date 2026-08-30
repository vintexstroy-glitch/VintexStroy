/**
 * РАЗРЕЗЪТ · разбивката по контрагент, банка/кеш, сектор и поток (резен 13б).
 *
 * Негов въпрос, 27.08 (И102): „…разбивки по контрагенти от банковите
 * извлечения и да се покажат в таблицата СУМИРАНО ЗА ТАКТА на диаграмата… и
 * съответно извлеченията БАНКОВИТЕ ИЛИ КЕШОВИТЕ… Както и по други избрани
 * критерии."
 *
 * Обещанието, което този файл пази най-строго, е СВЕРКАТА ВХОД↔ИЗХОД
 * (правило 7): **сборът на разрезите Е неразбитият сбор**. Разбивка, която не
 * се събира обратно, е по-лоша от липсваща — тя изглежда като отчет.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import {
  BEZ_STOYNOST,
  IMENA_NA_RAZREZITE,
  RAZREZI,
  sumiZaObhvat,
  type Razrez,
} from '../src/domein/otcheti.js';
import { obobshteniRedove, obobshtenRed } from '../src/domein/gant.js';
import { koloniNaTakta } from '../src/domein/vreme.js';
import { SHA } from './pomoshtni.js';

const KOGATO = '2026-08-22T09:00:00.000Z';
const PERIOD = '2026-08';
const OT = '2026-08-01';
const DO = '2026-08-31';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  return new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
}

/**
 * Двама наематели, двама доставчици, два начина на плащане.
 *
 * „Стройпласт␣␣ЕООД" е написан с ДВЕ разстояния нарочно: това е дефектът, който
 * правеше един контрагент на два.
 */
async function nasadi(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: 'o1' });
  await d.dobaviNaem('N-1', {
    imotId: 'I-1', naemetel: 'Домакинство', naem_st: stotinki(500_00), padezhDen: 5,
    ot: '2024-01-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten',
  }, { opId: 'o2' });
  await d.dobaviNaem('N-2', {
    imotId: 'I-1', naemetel: 'Стройпласт  ЕООД', naem_st: stotinki(1200_00), padezhDen: 5,
    ot: '2024-01-01', do: '', depozit_st: 0, sektor: 'naem-targovski',
  }, { opId: 'o3' });
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });

  const o = await d.ogledalo();
  const vzemaneNa = (naemId: string) => [...o.vzemaniya.values()].find((v) => v.naemId === naemId)!.id;

  await d.priemiPlashtane('P-1',
    { vzemaneId: vzemaneNa('N-1'), suma_st: stotinki(500_00), nachin: 'банка', data: '2026-08-10' },
    { opId: 'o4' });
  await d.priemiPlashtane('P-2',
    { vzemaneId: vzemaneNa('N-2'), suma_st: stotinki(300_00), nachin: 'в брой', data: '2026-08-12' },
    { opId: 'o5' });

  const razhod = (
    id: string, dostavchik: string, suma: number,
    nachin: 'банка' | 'в брой', potok: string, data: string,
  ) =>
    d.zapishiRazhod(id, {
      potok, dostavchik, opis: 'проба', suma_st: stotinki(suma), sektor: 'razhod-obsht',
      nachin, data, dokument: '', stavka: 0, klyuch: '', izvor: '',
    }, { opId: `op-${id}` });

  await razhod('R-1', 'Стройпласт ЕООД', 100_00, 'банка', 'fakturi', '2026-08-10');
  await razhod('R-2', 'Стройпласт  ЕООД', 40_00, 'в брой', 'fakturi', '2026-08-11');
  await razhod('R-3', 'Топлофикация', 60_00, 'банка', 'smetki', '2026-08-20');
}

describe('речникът на разрезите', () => {
  it('ШЕСТ са · и всеки чете поле, което ЖУРНАЛЪТ вече носи', () => {
    expect([...RAZREZI]).toEqual([
      'bez', 'kontragent', 'nachin', 'sektor', 'potok', 'kategoriya',
    ]);
    // И107 отказа разрез по колона на МОДЕЛНА таблица — редове, които ги няма
    // в приложението. Категорията е СЪБИТИЕ в Журнала, значи изпълнява същото
    // условие, вместо да го заобикаля (резен 25 · ADR-085).
  });

  it('всеки носи ДУМА · речник без дума е ключ, не разрез', () => {
    for (const r of RAZREZI) expect(IMENA_NA_RAZREZITE[r], r).not.toBe('');
  });
});

describe('СВЕРКАТА вход↔изход · сборът на разрезите Е неразбитият сбор', () => {
  it('и за ШЕСТТЕ разреза, до стотинка', async () => {
    const d = stend();
    await nasadi(d);
    const o = await d.ogledalo();

    const cyalo = sumiZaObhvat(o, OT, DO);
    const prihod = cyalo.reduce((s, x) => s + x.prihod_st, 0);
    const razhod = cyalo.reduce((s, x) => s + x.razhod_st, 0);

    for (const r of RAZREZI) {
      const razbito = sumiZaObhvat(o, OT, DO, r as Razrez);
      expect(razbito.reduce((s, x) => s + x.prihod_st, 0), r).toBe(prihod);
      expect(razbito.reduce((s, x) => s + x.razhod_st, 0), r).toBe(razhod);
    }
    // Числата НЕ се приемат на вяра: 500 + 300 приход, 100 + 40 + 60 разход.
    expect(prihod).toBe(800_00);
    expect(razhod).toBe(200_00);
  });

  it('и СЛЕД като станат редове върху решетката', async () => {
    const d = stend();
    await nasadi(d);
    const k = koloniNaTakta('mesets', '2026-08-15');
    const o = await d.ogledalo();

    const edin = obobshtenRed(k, sumiZaObhvat(o, OT, DO));
    const mnogo = obobshteniRedove(k, sumiZaObhvat(o, OT, DO, 'kontragent'));

    const sborNa = (kletki: readonly { prihod_st: number; razhod_st: number }[]) =>
      kletki.reduce((s, x) => s + x.prihod_st - x.razhod_st, 0);
    expect(mnogo.reduce((s, r) => s + sborNa(r.kletki), 0)).toBe(sborNa(edin));
  });
});

describe('по КОНТРАГЕНТ · и поправеният дефект „едно име, две групи"', () => {
  it('двете изписвания на един доставчик дават ЕДНА група', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'kontragent'),
    );
    // „Стройпласт ЕООД" и „Стройпласт␣␣ЕООД" са ЕДИН контрагент — и като
    // наемател, и като доставчик: ключът минава през `klyuchNaKontragent`.
    const imena = redove.map((r) => r.nadpis);
    expect(imena.filter((x) => x.startsWith('Стройпласт'))).toHaveLength(1);
  });

  it('всеки контрагент с движение дава СВОЙ ред', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'kontragent'),
    );
    expect(redove.map((r) => r.nadpis).sort()).toEqual([
      'Домакинство',
      'Стройпласт ЕООД',
      'Топлофикация',
    ]);
  });

  it('сумите на един контрагент са НЕГОВИТЕ · 100 + 40 по банка и в брой', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'kontragent'),
    );
    const stroyplast = redove.find((r) => r.nadpis === 'Стройпласт ЕООД')!;
    const razhod = stroyplast.kletki.reduce((s, x) => s + x.razhod_st, 0);
    const prihod = stroyplast.kletki.reduce((s, x) => s + x.prihod_st, 0);
    expect(razhod).toBe(140_00);
    expect(prihod).toBe(300_00); // наемът, който е платил
  });
});

describe('по НАЧИН · банковите или кешовите', () => {
  it('дава точно двете кофи, които Журналът познава', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'nachin'),
    );
    expect(redove.map((r) => r.nadpis).sort()).toEqual(['банка', 'в брой']);
  });

  it('в брой е 300 приход и 40 разход · банка е 500 и 160', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'nachin'),
    );
    const sbor = (nadpis: string) => {
      const r = redove.find((x) => x.nadpis === nadpis)!;
      return {
        prihod: r.kletki.reduce((s, x) => s + x.prihod_st, 0),
        razhod: r.kletki.reduce((s, x) => s + x.razhod_st, 0),
      };
    };
    expect(sbor('в брой')).toEqual({ prihod: 300_00, razhod: 40_00 });
    expect(sbor('банка')).toEqual({ prihod: 500_00, razhod: 160_00 });
  });
});

describe('по СЕКТОР и по ПОТОК', () => {
  it('секторът идва от наема при прихода и от реда при разхода', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'sektor'),
    );
    expect(redove.map((r) => r.nadpis).sort()).toEqual([
      'naem-targovski',
      'naem-zhilishten',
      'razhod-obsht',
    ]);
  });

  it('ПОТОКЪТ го носи само разходът · приходът пада в кофа с ИМЕ', async () => {
    // Кофата не е празният низ: празният значи „без разбивка" и двете щяха да
    // се слеят. Липсата се ВИЖДА.
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'potok'),
    );
    expect(redove.map((r) => r.nadpis)).toEqual(['fakturi', 'smetki', BEZ_STOYNOST]);
    const nyama = redove.find((r) => r.nadpis === BEZ_STOYNOST)!;
    expect(nyama.kletki.reduce((s, x) => s + x.prihod_st, 0)).toBe(800_00);
  });

  it('остатъчната кофа върви ПОСЛЕДНА · тя не е контрагент', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO, 'potok'),
    );
    expect(redove[redove.length - 1]!.nadpis).toBe(BEZ_STOYNOST);
  });
});

describe('без разбивка · днешното поведение НЕ се мени', () => {
  it('дава ТОЧНО един ред с празен ключ', async () => {
    const d = stend();
    await nasadi(d);
    const redove = obobshteniRedove(
      koloniNaTakta('mesets', '2026-08-15'),
      sumiZaObhvat(await d.ogledalo(), OT, DO),
    );
    expect(redove).toHaveLength(1);
    expect(redove[0]!.klyuch).toBe('');
  });

  it('и клетките му са същите като на стария обобщен ред', async () => {
    const d = stend();
    await nasadi(d);
    const k = koloniNaTakta('mesets', '2026-08-15');
    const dni = sumiZaObhvat(await d.ogledalo(), OT, DO);
    expect(obobshteniRedove(k, dni)[0]!.kletki).toEqual(obobshtenRed(k, dni));
  });
});

// ── ШЕСТИЯТ РАЗРЕЗ · „По категории" (резен 25 · ADR-085) ───────────────────

describe('разрезът „По категории"', () => {
  it('носи ДУМА и стои в речника', () => {
    expect(IMENA_NA_RAZREZITE['kategoriya']).toBe('По категории');
  });
});
