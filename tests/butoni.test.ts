/**
 * БУТОНИТЕ · моделите на пътищата.
 *
 * Четирите обещания, които се пазят тук:
 *   1. Посоката е ЕДНА — бутон, който чете, няма път към писане.
 *   2. Чужд файл в правилния бутон се отказва НА ГЛАС, с името на модела.
 *   3. Няколко файла и няколко листа влизат като ЕДНА партида, едно число.
 *   4. Сверката влиза в Журнала и когато разликата е нула (правило 7).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { belegNaModel, napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import {
  belegNaButon,
  DEYSTVIYA,
  GreshkaButon,
  modelZaTablitsata,
  napraviButon,
  papki,
  posokaNa,
  pozvoleniModeli,
  vPapka,
} from '../src/domein/butoni.js';
import {
  GreshkaSveryavane,
  sgloviPartida,
  vidimiButoni,
  zapishiSverkata,
} from '../src/domein/sveryavane.js';
import { prilozhi } from '../src/domein/aktualizatsiya.js';
import type { Izvor } from '../src/iztochnik/snimka.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const KOGATO = '2026-08-23T12:00:00.000Z';
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
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const OBB = 'Дата на вальор;Основание;Наредител;Сума по документа;Реф. номер;ДДС %';
const POSHTA = 'Дата;Описание;Платец;Сума;Документ';

function izvor(ime: string, otpechatak: string): Izvor {
  return { vid: 'csv', ime, golemina: 200, promenen: '2026-04-01T10:00:00.000Z', otpechatak };
}

function tablitsaOBB(redove: string, ime = 'ОББ'): ReturnType<typeof otCSV> {
  return otCSV(`${OBB}\n${redove}`, ime);
}

function modelOBB(): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Банка ОББ',
    tablitsa: tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20'),
    redNaGlavata: 0,
    koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 4, dds: 5 },
    ddsE: 'stavka',
  });
}

function modelPoshta(): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Пощенска банка',
    tablitsa: otCSV(`${POSHTA}\n05.04.2026;тухли;Тухли АД;240,00;5001`, 'Поща'),
    redNaGlavata: 0,
    koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 4 },
  });
}

const BUTON = napraviButon({
  klyuch: 'Извлечения ОББ',
  papka: 'Извлечения',
  deystvie: 'sveryavane-eksel',
  modeli: ['Банка ОББ'],
});

describe('бутонът се проверява при създаване', () => {
  it('иска име и папка', () => {
    expect(() => napraviButon({ klyuch: ' ', papka: 'Извлечения', deystvie: 'sveryavane-eksel' })).toThrow(
      /иска име/,
    );
    expect(() => napraviButon({ klyuch: 'Х', papka: '  ', deystvie: 'sveryavane-eksel' })).toThrow(
      /иска папка/,
    );
  });

  it('отказва действие, което е ОБЯВЕНО, но непостроено', () => {
    expect(() =>
      napraviButon({ klyuch: 'Изкарай', papka: 'Архив', deystvie: 'sazdavane-pdf' }),
    ).toThrow(/още не е построено/);
  });

  it('отказва един модел, сложен два пъти', () => {
    expect(() =>
      napraviButon({
        klyuch: 'Х',
        papka: 'П',
        deystvie: 'sveryavane-eksel',
        modeli: ['Банка ОББ', 'Банка ОББ'],
      }),
    ).toThrow(/два пъти/);
  });

  it('посоката се ВАДИ от действието — не се пише втори път', () => {
    expect(posokaNa('sveryavane-eksel')).toBe('chete');
    expect(posokaNa('prezapisvane-eksel')).toBe('pishe');
    expect(posokaNa('smyatane')).toBe('smyata');
    // Всяко действие има посока; нито едно не носи две.
    expect(DEYSTVIYA.every((d) => ['chete', 'pishe', 'smyata'].includes(d.posoka))).toBe(true);
  });

  it('белегът се мени, щом се мени бутонът', () => {
    const drug = napraviButon({ ...BUTON, modeli: ['Банка ОББ', 'Пощенска банка'] });
    expect(belegNaButon(drug)).not.toBe(belegNaButon(BUTON));
  });

  it('папките се получават от бутоните — няма отделен списък', () => {
    const vtori = napraviButon({ klyuch: 'Наеми КЕШ', papka: 'Наеми', deystvie: 'sveryavane-eksel' });
    expect(papki([BUTON, vtori])).toEqual(['Извлечения', 'Наеми']);
    expect(vPapka([BUTON, vtori], 'Наеми').map((b) => b.klyuch)).toEqual(['Наеми КЕШ']);
  });
});

describe('позволените модели', () => {
  it('празен списък значи ВСИЧКИ — първият бутон се прави преди първия модел', () => {
    const svoboden = napraviButon({ klyuch: 'Всичко', papka: 'П', deystvie: 'sveryavane-eksel' });
    const vsichki = [modelOBB(), modelPoshta()];
    expect(pozvoleniModeli(svoboden, vsichki)).toHaveLength(2);
    expect(pozvoleniModeli(BUTON, vsichki).map((m) => m.klyuch)).toEqual(['Банка ОББ']);
  });

  it('ЧУЖД файл в правилния бутон се отказва НА ГЛАС, с името на модела', () => {
    const chuzhda = otCSV(`${POSHTA}\n05.04.2026;тухли;Тухли АД;240,00;5001`, 'Поща');
    expect(() => modelZaTablitsata(BUTON, [modelOBB(), modelPoshta()], chuzhda)).toThrow(
      GreshkaButon,
    );
    expect(() => modelZaTablitsata(BUTON, [modelOBB(), modelPoshta()], chuzhda)).toThrow(
      /„Пощенска банка"/,
    );
  });

  it('непозната глава просто не се познава — без хвърляне', () => {
    const nikoy = otCSV('Абв;Где\n1;2', 'Чудо');
    expect(modelZaTablitsata(BUTON, [modelOBB()], nikoy)).toBeUndefined();
  });
});

describe('партидата · няколко файла, едно число', () => {
  const modeli = [modelOBB()];
  const ogl = async () => (await stend().deystviya.ogledalo());

  it('два файла наведнъж дават ЕДНА снимка и един отпечатък', async () => {
    const partida = await sgloviPartida({
      buton: BUTON,
      modeli,
      ogledalo: await ogl(),
      sha: SHA,
      faylove: [
        {
          izvor: izvor('обб-1.csv', 'aaa'),
          tablitsi: [tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20')],
        },
        {
          izvor: izvor('обб-2.csv', 'bbb'),
          tablitsi: [tablitsaOBB('12.04.2026;тухли;Тухли АД;240,00;4002;20')],
        },
      ],
    });

    expect(partida.plan.snimka.redove).toHaveLength(2);
    expect(partida.plan.sled_st).toBe(840_00);
    expect(partida.plan.snimka.izvor.ime).toBe('2 файла');
    expect(partida.izvori).toEqual(['aaa', 'bbb']);
    // Отпечатъкът е на ПАРТИДАТА, не на първия файл.
    expect(partida.plan.snimka.izvor.otpechatak).not.toBe('aaa');
  });

  it('един файл с ДВА листа минава и по двата', async () => {
    const partida = await sgloviPartida({
      buton: BUTON,
      modeli,
      ogledalo: await ogl(),
      sha: SHA,
      faylove: [
        {
          izvor: izvor('обб.xlsx', 'ccc'),
          tablitsi: [
            tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20', 'Април А'),
            tablitsaOBB('12.04.2026;тухли;Тухли АД;240,00;4002;20', 'Април Б'),
          ],
        },
      ],
    });
    expect(partida.dvoyki.map((x) => x.list)).toEqual(['Април А', 'Април Б']);
    expect(partida.plan.snimka.redove).toHaveLength(2);
  });

  it('различни МЕСЕЦИ се отказват — сверката не ги смесва', async () => {
    await expect(
      sgloviPartida({
        buton: BUTON,
        modeli,
        ogledalo: await ogl(),
        sha: SHA,
        faylove: [
          {
            izvor: izvor('март.csv', 'ddd'),
            tablitsi: [tablitsaOBB('05.03.2026;цимент;Материали ООД;600,00;3001;20')],
          },
          {
            izvor: izvor('април.csv', 'eee'),
            tablitsi: [tablitsaOBB('12.04.2026;тухли;Тухли АД;240,00;4002;20')],
          },
        ],
      }),
    ).rejects.toThrow(/различни месеци/);
  });

  it('непознат лист се БРОИ, не се преглъща', async () => {
    const partida = await sgloviPartida({
      buton: BUTON,
      modeli,
      ogledalo: await ogl(),
      sha: SHA,
      faylove: [
        {
          izvor: izvor('смесен.xlsx', 'fff'),
          tablitsi: [
            tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20', 'Извлечение'),
            otCSV('Абв;Где\n1;2', 'Нещо друго'),
          ],
        },
      ],
    });
    expect(partida.plan.snimka.redove).toHaveLength(1);
    expect(partida.nepoznati).toEqual([{ fayl: 'смесен.xlsx', list: 'Нещо друго' }]);
  });

  it('нито един познат лист → казва се кои са били подадени', async () => {
    await expect(
      sgloviPartida({
        buton: BUTON,
        modeli,
        ogledalo: await ogl(),
        sha: SHA,
        faylove: [{ izvor: izvor('чудо.csv', 'ggg'), tablitsi: [otCSV('Абв;Где\n1;2', 'Чудо')] }],
      }),
    ).rejects.toThrow(GreshkaSveryavane);
  });
});

describe('сверката влиза в Журнала', () => {
  it('записва се И КОГАТО разликата е нула', async () => {
    const { deystviya: d } = stend();
    const m = modelOBB();
    await d.zapishiModel(m, { opId: `model:${m.klyuch}:${belegNaModel(m)}` });

    const partida = await sgloviPartida({
      buton: BUTON,
      modeli: [m],
      ogledalo: await d.ogledalo(),
      sha: SHA,
      faylove: [
        {
          izvor: izvor('обб.csv', 'hhh'),
          tablitsi: [tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20')],
        },
      ],
    });

    const rezultat = await prilozhi(d, partida.plan, NASTROYKI, KOGATO);
    const izhod = await zapishiSverkata(d, { buton: BUTON, partida, rezultat, kogato: KOGATO });

    expect(izhod.razlika_st).toBe(0);
    expect(izhod.nared).toBe(true);

    const o = await d.ogledalo();
    expect(o.sverki).toHaveLength(1);
    expect(o.sverki[0]!.buton).toBe('Извлечения ОББ');
    expect(o.sverki[0]!.period).toBe('2026-04');
    expect(o.sverki[0]!.razlika_st).toBe(0);
    expect(o.sverki[0]!.izvori).toEqual(['hhh']);
  });

  it('бутонът се записва като събитие и се намира през Огледалото', async () => {
    const { deystviya: d } = stend();
    await d.zapishiButon(BUTON, { opId: `buton:${BUTON.klyuch}:${belegNaButon(BUTON)}` });

    const popraven = napraviButon({ ...BUTON, papka: 'Банка' });
    await d.zapishiButon(popraven, { opId: `buton:${popraven.klyuch}:${belegNaButon(popraven)}` });

    const o = await d.ogledalo();
    expect(o.butoni.size).toBe(1);
    expect(o.butoni.get('Извлечения ОББ')?.papka).toBe('Банка');
    // Нищо не е изтрито: и двата записа стоят.
    expect((await d.sabitiya()).filter((x) => x.type === 'БутонЗаписан')).toHaveLength(2);
  });
});

describe('връщането към предишно състояние · кръвно платено', () => {
  /**
   * Проход §19 го хвана: махни колона и я върни. Съдържанието се връща към
   * предишното; ако `opId` се вадеше от съдържанието, повторният ключ връщаше
   * СТАРИЯ резултат, нищо ново не влизаше в Журнала — и колоната оставаше
   * махната, макар екранът да казваше друго.
   */
  it('А → Б → А стига до А, а не остава на Б', async () => {
    const { deystviya: d } = stend();
    const t = tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20');
    const karta = {
      klyuch: 'Банка ОББ',
      tablitsa: t,
      redNaGlavata: 0,
      koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 4, dds: 5 },
      ddsE: 'stavka' as const,
    };

    const a = napraviModel(karta);
    const b = napraviModel({ ...karta, izklyucheni: [3] });

    await d.zapishiModel(a, { opId: 'gest:1' });
    await d.zapishiModel(b, { opId: 'gest:2' });
    await d.zapishiModel(a, { opId: 'gest:3' });

    expect((await d.ogledalo()).modeli.get('Банка ОББ')?.izklyucheni).toEqual([]);
    expect((await d.sabitiya()).filter((x) => x.type === 'МоделЗаписан')).toHaveLength(3);
  });

  it('белегът казва „нищо не се смени" — и тогава не се пише', () => {
    const t = tablitsaOBB('05.04.2026;цимент;Материали ООД;600,00;4001;20');
    const karta = {
      klyuch: 'Банка ОББ',
      tablitsa: t,
      redNaGlavata: 0,
      koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 4, dds: 5 },
      ddsE: 'stavka' as const,
    };
    expect(belegNaModel(napraviModel(karta))).toBe(belegNaModel(napraviModel(karta)));
    expect(belegNaModel(napraviModel({ ...karta, izklyucheni: [3] }))).not.toBe(
      belegNaModel(napraviModel(karta)),
    );
  });

  it('същият бутон, записан пак, дава същия белег', () => {
    expect(belegNaButon(napraviButon({ ...BUTON }))).toBe(belegNaButon(BUTON));
  });
});

describe('видимостта', () => {
  it('празна видимост значи ВСИЧКИ', () => {
    const skrit = napraviButon({ ...BUTON, klyuch: 'Скрит', vidimost: ['sobstvenik'] });
    expect(vidimiButoni([BUTON, skrit], []).map((b) => b.klyuch)).toEqual(['Извлечения ОББ']);
    expect(vidimiButoni([BUTON, skrit], ['sobstvenik'])).toHaveLength(2);
  });
});
