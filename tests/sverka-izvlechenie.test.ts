/**
 * СВЕРКАТА С ИЗВЛЕЧЕНИЯТА · книгата срещу банката (резен 17в).
 *
 * Седемте обещания:
 *
 *   1. Банка и КАРТА се търсят; „в брой" НЕ се търси — и това не е находка.
 *   2. Един банков ред се харчи ВЕДНЪЖ · две еднакви суми не се сверяват
 *      срещу един и същи ред.
 *   3. Прозорецът от три дни лови закъснялото осчетоводяване · четвъртият ден
 *      вече е находка.
 *   4. Няколко пасващи реда НЕ се избират от машината — показват се.
 *   5. Ред, който го има само в банката, се БРОИ.
 *   6. Сверката вход↔изход затваря · и разликата е точно необясненото.
 *   7. Двата списъка за счетоводството са неговите два, по посока.
 */

import { describe, expect, it } from 'vitest';
import type { RedOtKarta } from '../src/iztochnik/karta.js';
import {
  broyNahodki,
  GreshkaSverkaIzvlechenie,
  IMENA_NA_SADBITE,
  mesetsiSvetene,
  PROZORETS_DNI,
  seTarsiVIzvlechenieto,
  spisatsiteZaSchetovodstvoto,
  mesetsiteNaObhvata,
  sverkaPoMesetsi,
  sverkaSIzvlechenie,
  sverkataNaIzvlechenieto,
  zapisiteNaKnigata,
  type RezultatNaSverkata,
  type ZapisZaSverka,
} from '../src/domein/sverka-izvlechenie.js';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { NACHINI_NA_PLASHTANE } from '../src/domein/sabitiya.js';
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

function zapis(n: Partial<ZapisZaSverka> & { klyuch: string; suma_st: number }): ZapisZaSverka {
  return {
    posoka: 'razhod',
    data: '2026-05-12',
    nachin: 'банка',
    koy: 'Материали ООД',
    ...n,
  };
}

function bankov(n: Partial<RedOtKarta> & { klyuch: string; suma_st: number }): RedOtKarta {
  return {
    data: '2026-05-12',
    posoka: 'razhod',
    koy: 'МАТЕРИАЛИ ООД',
    dokument: '',
    saldoSled_st: 0,
    ...n,
  };
}

function sverkata(
  zapisi: readonly ZapisZaSverka[],
  izvlechenie: readonly RedOtKarta[],
): RezultatNaSverkata {
  return sverkaSIzvlechenie({
    period: '2026-05',
    zapisi,
    izvlechenie,
    ot: '2026-05-01',
    do: '2026-05-31',
  });
}

describe('трите начина и двете съдби', () => {
  it('изброени са ТРИ начина · и картата е негова дума', () => {
    expect(NACHINI_NA_PLASHTANE.map((n) => n.klyuch)).toEqual(['банка', 'карта', 'в брой']);
  });

  it('1 · банка и КАРТА се търсят · „в брой" НЕ се търси', () => {
    expect(seTarsiVIzvlechenieto('банка')).toBe(true);
    expect(seTarsiVIzvlechenieto('карта')).toBe(true);
    expect(seTarsiVIzvlechenieto('в брой')).toBe(false);

    const r = sverkata(
      [
        zapis({ klyuch: 'razhod:B', suma_st: 10_000, nachin: 'банка' }),
        zapis({ klyuch: 'razhod:K', suma_st: 20_000, nachin: 'карта' }),
        zapis({ klyuch: 'razhod:V', suma_st: 30_000, nachin: 'в брой' }),
      ],
      [bankov({ klyuch: 'b1', suma_st: 10_000 }), bankov({ klyuch: 'b2', suma_st: 20_000 })],
    );
    const po = new Map(r.redove.map((x) => [x.zapis.klyuch, x.sadba]));
    expect(po.get('razhod:B')).toBe('nameren');
    expect(po.get('razhod:K')).toBe('nameren');
    expect(po.get('razhod:V')).toBe('bezBanka');
    // и КЕШЪТ не свети · ненамереният кеш е нормално състояние, не грешка
    expect(broyNahodki(r)).toBe(0);
  });

  it('2 · един банков ред се харчи ВЕДНЪЖ', () => {
    const r = sverkata(
      [
        zapis({ klyuch: 'razhod:1', suma_st: 50_000 }),
        zapis({ klyuch: 'razhod:2', suma_st: 50_000 }),
      ],
      [bankov({ klyuch: 'b1', suma_st: 50_000 })],
    );
    const sadbi = r.redove.map((x) => x.sadba);
    expect(sadbi).toContain('nameren');
    expect(sadbi).toContain('lipsva');
    expect(sadbi.filter((s) => s === 'nameren')).toHaveLength(1);
  });

  it('3 · прозорецът е ТРИ дни · четвъртият вече е находка', () => {
    // ПОВЕДЕНИЕТО е проверката; числото се сверява НАКРАЯ. Обратният ред щеше
    // да спре теста на сравнението на константата със себе си — а точно то не
    // доказва нищо за сметката (поуката на §88 · §89).
    const treti = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000, data: '2026-05-12' })],
      [bankov({ klyuch: 'b1', suma_st: 50_000, data: '2026-05-15' })],
    );
    expect(treti.redove[0]!.sadba).toBe('nameren');

    const chetvarti = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000, data: '2026-05-12' })],
      [bankov({ klyuch: 'b1', suma_st: 50_000, data: '2026-05-16' })],
    );
    expect(chetvarti.redove[0]!.sadba).toBe('lipsva');

    // и НАЗАД · банката понякога е с ДЕН ПО-РАНО от бележката
    const nazad = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000, data: '2026-05-12' })],
      [bankov({ klyuch: 'b1', suma_st: 50_000, data: '2026-05-10' })],
    );
    expect(nazad.redove[0]!.sadba).toBe('nameren');
    expect(PROZORETS_DNI).toBe(3);
  });

  it('посоката е част от съвпадението · 500 навън не е 500 навътре', () => {
    const r = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000, posoka: 'razhod' })],
      [bankov({ klyuch: 'b1', suma_st: 50_000, posoka: 'prihod' })],
    );
    expect(r.redove[0]!.sadba).toBe('lipsva');
    expect(r.samoVBankata).toHaveLength(1);
  });

  it('4 · няколко пасващи реда НЕ се избират от машината', () => {
    const r = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000 })],
      [
        bankov({ klyuch: 'b1', suma_st: 50_000, data: '2026-05-11' }),
        bankov({ klyuch: 'b2', suma_st: 50_000, data: '2026-05-13' }),
      ],
    );
    expect(r.redove[0]!.sadba).toBe('nyakolko');
    expect(r.redove[0]!.sreshtu).toEqual(['b1', 'b2']);
    // и НИТО ЕДИН не се харчи · избран наум, той би липсвал на истинския си запис
    expect(r.samoVBankata).toHaveLength(2);
  });

  it('5 · редът само в банката се БРОИ', () => {
    const r = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000 })],
      [
        bankov({ klyuch: 'b1', suma_st: 50_000 }),
        bankov({ klyuch: 'b2', suma_st: 77_700, koy: 'Непознат ООД' }),
      ],
    );
    expect(r.samoVBankata.map((x) => x.klyuch)).toEqual(['b2']);
    expect(broyNahodki(r)).toBe(1);
  });

  it('6 · сверката вход↔изход · разликата е точно необясненото', () => {
    const r = sverkata(
      [
        zapis({ klyuch: 'razhod:1', suma_st: 50_000 }),
        zapis({ klyuch: 'razhod:2', suma_st: 12_345, nachin: 'в брой' }),
        zapis({ klyuch: 'razhod:3', suma_st: 30_000 }),
      ],
      [bankov({ klyuch: 'b1', suma_st: 50_000 })],
    );
    // ВХОДЪТ е книгата ЦЯЛА · кешът влиза, инак сверката би затваряла винаги
    expect(r.vhod_st).toBe(50_000 + 12_345 + 30_000);
    expect(r.izhod_st).toBe(50_000 + 12_345);
    const s = sverkataNaIzvlechenieto(r, '2026-06-01T10:00:00.000Z');
    expect(s.razlika).toBe(-30_000);
    expect(s.nared).toBe(false);

    const chisto = sverkata(
      [zapis({ klyuch: 'razhod:1', suma_st: 50_000 })],
      [bankov({ klyuch: 'b1', suma_st: 50_000 })],
    );
    const nula = sverkataNaIzvlechenieto(chisto, '2026-06-01T10:00:00.000Z');
    expect(nula.razlika).toBe(0);
    expect(nula.nared).toBe(true);
    // и НУЛАТА се записва · инак „няма разлика" е неразличимо от „не е сверявано"
    expect(nula.kakvo).toBe('сверка с извлечение 2026-05');
  });

  it('7 · двата списъка за счетоводството · по посока, с ЕДИН критерий', () => {
    const r = sverkata(
      [
        zapis({ klyuch: 'razhod:1', suma_st: 12_345, nachin: 'в брой' }),
        zapis({ klyuch: 'razhod:2', suma_st: 6_000, nachin: 'в брой' }),
        zapis({
          klyuch: 'plashtane:1',
          suma_st: 80_000,
          nachin: 'в брой',
          posoka: 'prihod',
          koy: 'Наемател ЕООД',
        }),
        zapis({ klyuch: 'razhod:3', suma_st: 30_000, nachin: 'карта' }),
      ],
      [bankov({ klyuch: 'b1', suma_st: 30_000 })],
    );
    const spisatsi = spisatsiteZaSchetovodstvoto(r);
    expect(spisatsi.platenoNaRaka.map((z) => z.klyuch)).toEqual(['razhod:1', 'razhod:2']);
    expect(spisatsi.prihodNaRaka.map((z) => z.klyuch)).toEqual(['plashtane:1']);
    expect(spisatsi.platenoNaRaka_st).toBe(18_345);
    expect(spisatsi.prihodNaRaka_st).toBe(80_000);
    // КАРТАТА не влиза в списъците · тя има банкова следа
    expect(spisatsi.platenoNaRaka.map((z) => z.klyuch)).not.toContain('razhod:3');
  });

  it('„и броя месеци се смятат" · подред назад, и се КЪСА при сверен месец', () => {
    const svetne = (period: string, sadba: 'lipsva' | 'nameren'): RezultatNaSverkata => ({
      period,
      redove: [{ zapis: zapis({ klyuch: 'razhod:1', suma_st: 100 }), sadba, sreshtu: [] }],
      samoVBankata: [],
      vhod_st: 100,
      izhod_st: sadba === 'nameren' ? 100 : 0,
      ot: `${period}-01`,
      do: `${period}-28`,
    });
    const istoriya = [
      svetne('2026-03', 'lipsva'),
      svetne('2026-04', 'nameren'),
      svetne('2026-05', 'lipsva'),
      svetne('2026-06', 'lipsva'),
    ];
    // от най-новия назад: юни и май светят, април е сверен и веригата се къса
    expect(mesetsiSvetene(istoriya, 'razhod:1')).toBe(2);
    expect(mesetsiSvetene(istoriya, 'razhod:НЯМА')).toBe(0);
  });

  it('периодът се проверява · „ГГГГ-ММ", не свободен текст', () => {
    expect(() =>
      sverkaSIzvlechenie({ period: 'май', zapisi: [], izvlechenie: [], ot: '', do: '' }),
    ).toThrow(GreshkaSverkaIzvlechenie);
  });

  it('думите на четирите съдби живеят на ЕДНО място', () => {
    expect(Object.keys(IMENA_NA_SADBITE)).toHaveLength(4);
    expect(IMENA_NA_SADBITE.lipsva).toContain('няма го');
  });
});

describe('записите на книгата · от Журнала, не от въздуха', () => {
  it('плащанията и разходите за месеца влизат ЗАЕДНО, с начина си', async () => {
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
      'V-1',
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
      'P-1',
      { vzemaneId: 'V-1', suma_st: 80_000, nachin: 'банка', data: '2026-05-06' },
      { opId: 'plashtane:1' },
    );
    await deystviya.zapishiRazhod(
      'R-1',
      {
        potok: 'fakturi',
        dostavchik: 'Материали ООД',
        opis: 'цимент',
        suma_st: 60_000,
        sektor: 'pokupki-materiali',
        nachin: 'карта',
        data: '2026-05-12',
        dokument: '1042',
      },
      { opId: 'razhod:1' },
    );

    const o = await deystviya.ogledalo();
    const zapisi = zapisiteNaKnigata(o, '2026-05');
    expect(zapisi).toHaveLength(2);

    const plashtane = zapisi.find((z) => z.klyuch === 'plashtane:P-1')!;
    expect(plashtane.posoka).toBe('prihod');
    expect(plashtane.nachin).toBe('банка');
    // името се СТИГА през вземането до наема · плащането носи само връзка
    expect(plashtane.koy).toBe('Наемател ЕООД');

    const razhod = zapisi.find((z) => z.klyuch === 'razhod:R-1')!;
    expect(razhod.posoka).toBe('razhod');
    expect(razhod.nachin).toBe('карта');
    expect(razhod.koy).toBe('Материали ООД');

    // ДРУГ месец не влиза
    expect(zapisiteNaKnigata(o, '2026-04')).toHaveLength(0);
  });
});

describe('файлът е ОБХВАТ, не месец', () => {
  it('месеците на обхвата се изброяват · и прескачат годината', () => {
    expect(mesetsiteNaObhvata('2026-05-14', '2026-07-20')).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(mesetsiteNaObhvata('2026-12-01', '2027-02-03')).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(mesetsiteNaObhvata('2026-05-01', '2026-05-31')).toEqual(['2026-05']);
  });

  it('всеки месец се сверява със СВОИТЕ редове · юнският не свети в май', () => {
    const kniga: Record<string, ZapisZaSverka[]> = {
      '2026-05': [zapis({ klyuch: 'razhod:may', suma_st: 50_000, data: '2026-05-12' })],
      '2026-06': [zapis({ klyuch: 'razhod:yuni', suma_st: 70_000, data: '2026-06-12' })],
    };
    const sverki = sverkaPoMesetsi({
      zapisiNaMesetsa: (m) => kniga[m] ?? [],
      izvlechenie: [
        bankov({ klyuch: 'b1', suma_st: 50_000, data: '2026-05-12' }),
        bankov({ klyuch: 'b2', suma_st: 70_000, data: '2026-06-12' }),
      ],
      ot: '2026-05-01',
      do: '2026-06-30',
    });
    expect(sverki.map((r) => r.period)).toEqual(['2026-05', '2026-06']);
    // ВСИЧКО се среща · нито един ред не е „само в банката"
    expect(sverki.flatMap((r) => r.samoVBankata)).toHaveLength(0);
    expect(sverki.every((r) => broyNahodki(r) === 0)).toBe(true);
  });

  it('и оттук „броя месеци се смятат" · СВЕТИ подред назад', () => {
    const edin = zapis({ klyuch: 'razhod:naem', suma_st: 90_000, data: '2026-05-10' });
    const kniga: Record<string, ZapisZaSverka[]> = {
      '2026-05': [{ ...edin, data: '2026-05-10' }],
      '2026-06': [{ ...edin, data: '2026-06-10' }],
      '2026-07': [{ ...edin, data: '2026-07-10' }],
    };
    const sverki = sverkaPoMesetsi({
      zapisiNaMesetsa: (m) => kniga[m] ?? [],
      // само МАЙ се намира · юни и юли ги няма в банката
      izvlechenie: [bankov({ klyuch: 'b1', suma_st: 90_000, data: '2026-05-10' })],
      ot: '2026-05-01',
      do: '2026-07-31',
    });
    expect(mesetsiSvetene(sverki, 'razhod:naem')).toBe(2);
  });
});
