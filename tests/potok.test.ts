/**
 * ПОТОКЪТ · колоната стои, сборът отива.
 *
 * Негова поправка (23.08), и оттук нататък машина я пази:
 *
 *   „Колоната не отива където си реши, а където я поставиш. Не си избира —
 *    както сумата от колоните С ВАЛУТА се изпраща директно автоматично към
 *    Приходи, ако е с +, и в Разходи, ако е с −."
 *
 * Шестте обещания:
 *   1. Само колона, обявена за ЕВРО, тръгва. Процент и брой — никога.
 *   2. Знакът решава посоката; сумата тръгва ПОЛОЖИТЕЛНА.
 *   3. Колоната стои — номерът ѝ не се мени от знака.
 *   4. Изключената не тръгва.
 *   5. Един ред на КОЛОНА, не на всеки запис.
 *   6. Повторното изпращане на същото не удвоява.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import {
  belegNaPartida,
  sboroveNaPartida,
  sDumiNaPartida,
  zaIzprashtane,
} from '../src/domein/potok.js';
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
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 14, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

// Смесена таблица — точно случаят, който той описа: продажбата ражда и приход
// (цената), и разход (комисионът), а до тях стоят процент и брой.
const GLAVA = 'Дата;Обект;Продажна цена;Комисион;ДДС %;Брой дни';
const REDOVE = [
  '05.04.2026;Ап. 1;215400,00;-6462,00;20;30',
  '12.04.2026;Ап. 2;224800,00;-6744,00;20;31',
].join('\n');

function tablitsa() {
  return otCSV(`${GLAVA}\n${REDOVE}`, 'Продажби');
}

function model(izklyucheni: readonly number[] = []): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Продажби',
    tablitsa: tablitsa(),
    redNaGlavata: 0,
    koloni: { data: 0, kontragent: 1, suma: 2 },
    izklyucheni,
    vidove: { 0: 'data', 1: 'tekst', 2: 'evro', 3: 'evro', 4: 'protsent', 5: 'chislo' },
  });
}

describe('кои сборове тръгват', () => {
  it('САМО колоните в евро — процентът и броят остават', () => {
    const r = zaIzprashtane(model(), tablitsa());
    expect(r.map((x) => x.ime)).toEqual(['Продажна цена', 'Комисион']);
  });

  it('знакът решава посоката · сумата тръгва ПОЛОЖИТЕЛНА', () => {
    const r = zaIzprashtane(model(), tablitsa());
    const cena = r.find((x) => x.ime === 'Продажна цена')!;
    const komision = r.find((x) => x.ime === 'Комисион')!;
    expect(cena.kam).toBe('prihod');
    expect(cena.suma_st).toBe(440_200_00);
    expect(komision.kam).toBe('razhod');
    expect(komision.suma_st).toBe(13_206_00); // положително · знакът е в `kam`
  });

  it('КОЛОНАТА СТОИ · номерът ѝ не се мени от знака', () => {
    const r = zaIzprashtane(model(), tablitsa());
    expect(r.map((x) => x.kolona)).toEqual([2, 3]); // както са в хедъра
  });

  it('изключената не тръгва', () => {
    const r = zaIzprashtane(model([3]), tablitsa());
    expect(r.map((x) => x.ime)).toEqual(['Продажна цена']);
  });

  it('един ред на КОЛОНА, не на всеки запис', () => {
    // два реда с данни, но две колони в евро → два реда за изпращане
    expect(zaIzprashtane(model(), tablitsa())).toHaveLength(2);
    expect(zaIzprashtane(model(), tablitsa())[0]?.broy).toBe(2); // сборът е от 2 реда
  });

  it('двата сбора се броят поотделно — за сверката вход↔изход', () => {
    const { prihod_st, razhod_st } = sboroveNaPartida(zaIzprashtane(model(), tablitsa()));
    expect(prihod_st).toBe(440_200_00);
    expect(razhod_st).toBe(13_206_00);
  });

  it('думите казват какво тръгва', () => {
    expect(sDumiNaPartida(zaIzprashtane(model(), tablitsa()))).toBe(
      '1 към Приходи /+/ · 1 към Разходи /−/',
    );
    expect(sDumiNaPartida([])).toContain('нищо не тръгва');
  });
});

describe('белегът · повторното изпращане не удвоява', () => {
  it('същите сборове дават същия белег', () => {
    const a = belegNaPartida('Продажби', '2026-04', zaIzprashtane(model(), tablitsa()));
    const b = belegNaPartida('Продажби', '2026-04', zaIzprashtane(model(), tablitsa()));
    expect(a).toBe(b);
  });

  it('махната колона мени белега — това Е промяна', () => {
    const a = belegNaPartida('Продажби', '2026-04', zaIzprashtane(model(), tablitsa()));
    const b = belegNaPartida('Продажби', '2026-04', zaIzprashtane(model([3]), tablitsa()));
    expect(a).not.toBe(b);
  });

  it('друг месец е друга партида', () => {
    const r = zaIzprashtane(model(), tablitsa());
    expect(belegNaPartida('Продажби', '2026-04', r)).not.toBe(
      belegNaPartida('Продажби', '2026-05', r),
    );
  });
});

describe('в Журнала · един ред на колона за месец', () => {
  it('изпратеното се чете от Огледалото, а повторното го ПОПРАВЯ', async () => {
    const { dnevnik, deystviya } = stend();
    const redove = zaIzprashtane(model(), tablitsa());
    const period = '2026-04';
    const beleg = belegNaPartida('Продажби', period, redove);

    for (const r of redove) {
      await deystviya.zapishiPotok(
        {
          model: 'Продажби',
          kolona: r.kolona,
          ime: r.ime,
          kam: r.kam,
          suma_st: r.suma_st,
          broy: r.broy,
          period,
          beleg,
        },
        { opId: `potok:${r.kolona}` },
      );
    }

    const og = await deystviya.ogledalo();
    expect(og.pototsi.size).toBe(2);
    expect(og.pototsi.get('Продажби|2|2026-04')?.kam).toBe('prihod');
    expect(og.pototsi.get('Продажби|3|2026-04')?.suma_st).toBe(13_206_00);

    // поправка на същата колона в същия месец — един ред, не втори
    await deystviya.zapishiPotok(
      {
        model: 'Продажби',
        kolona: 2,
        ime: 'Продажна цена',
        kam: 'prihod',
        suma_st: 400_000_00,
        broy: 2,
        period,
        beleg: 'друг',
      },
      { opId: 'potok:popravka' },
    );
    const og2 = await deystviya.ogledalo();
    expect(og2.pototsi.size).toBe(2);
    expect(og2.pototsi.get('Продажби|2|2026-04')?.suma_st).toBe(400_000_00);

    // Журналът обаче пази И трите — историята не се пипа
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya.filter((s) => s.type === 'ПотокЗаписан')).toHaveLength(3);
  });

  it('замразен период не приема поток — числото за месец не влиза с обратна сила', async () => {
    const { deystviya } = stend();
    await deystviya.podaySpravka(
      { period: '2026-03', dds_deklarirano_st: 0, data: '2026-04-14', belezhka: '' },
      { opId: 'spravka:1' },
    );
    await expect(
      deystviya.zapishiPotok(
        {
          model: 'Продажби',
          kolona: 2,
          ime: 'Продажна цена',
          kam: 'prihod',
          suma_st: 100_00,
          broy: 1,
          period: '2026-03',
          beleg: 'x',
        },
        { opId: 'potok:zamrazen' },
      ),
    ).rejects.toThrow();
  });
});
