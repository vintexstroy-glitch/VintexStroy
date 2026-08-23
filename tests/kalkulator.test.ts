/**
 * КАЛКУЛАТОРЪТ · Стойност на Състояние.
 *
 * Негови думи (23.08):
 *
 *   „Не е необходимо да се пресъздава самата таблица, а само да се вземат
 *    апартаментите с площи, изложение и етаж… Използва се чиста площ и обща
 *    площ, разликата между двете е общи части… Чете от папката с площите и
 *    записва в таблицата с Цените… **сборът е тази стойност на състоянието
 *    общо**."
 *
 * Числата тук НЕ са измислени: те са от неговите два файла в Драйва —
 * „Площо, М. долина - с двор -НОВО.xlsx" и „ЦЕНИ МД нова.xlsx".
 *
 * Осемте обещания:
 *   1. Чете се само каквото трябва — пет колони, не двайсет.
 *   2. Общите части се СМЯТАТ от двете площи.
 *   3. Видът на обекта се познава по името; „Гараж 3 и склад" е ГАРАЖ.
 *   4. Площта е в цели кв.см — нула float.
 *   5. Цената се закръгля НАГОРЕ до стотица; сборът се смята от ТОЧНИТЕ.
 *   6. ПРОДАДЕН не влиза в стойността.
 *   7. Евро/кв.м е частно на цената и площта — както в неговата листа.
 *   8. Сверка вход↔изход: N обекта влизат → N реда излизат.
 */

import { describe, expect, it } from 'vitest';
import { otCSV } from '../src/iztochnik/csv.js';
import {
  eListSPloshti,
  kvSmVM2,
  obshtiChasti_kvsm,
  ploshtVKvSm,
  prochetiPloshti,
  vidPoIme,
} from '../src/kalkulator/chetene.js';
import {
  EDINITSA_BT,
  evroNaKvadrat_st,
  koefitsient,
  MATRITSA_ZA_RAZRABOTKA,
  tsenaTochno,
} from '../src/kalkulator/matritsa.js';
import {
  sverkaNaPartida,
  stoynostNaSastoyanie,
  type OtTsenovaLista,
} from '../src/kalkulator/stoynost.js';
import {
  GLAVA_NA_TSENITE,
  listNaTsenite,
  PRODADEN,
  prochetiTsenovaLista,
} from '../src/kalkulator/tsenova-lista.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import { tsenaNagore } from '../src/yadro/valuta.js';

// ── неговото площообразуване, свито до първите редове ──────────────────────
const PLOSHTI = [
  'кота;етаж;№;обект;застроена площ, F1;общи части F2;F2;Общо F1+F2;обща площ на обекта F3;прилежащ (придаден) двор',
  'кота -2,88;подземен;1;Гараж 1;16,00;0,99;2,09;18,09;30,61;',
  ';;3;Гараж 3 и склад;19,50;1,21;2,54;22,04;37,30;',
  'кота ±0,00;първи;18;Апартамент 1;40,00;2,48;5,22;45,22;45,22;22,00',
  ';;19;Апартамент 2;57,00;3,53;7,44;64,44;64,44;22,90',
  'кота +2,85;втори;22;Апартамент 5;54,80;3,39;7,15;61,95;61,95;',
  ';;;;1614,59;100,00;210,64;1825,23;;', // контролен ред — няма име, пропуска се
].join('\n');

// ── неговата ценова листа, свита ───────────────────────────────────────────
const TSENI = [
  'ЦЕНИ;Т А Б Л И Ц А за разпределение на площите;;;;;;;;;',
  ';Имоти;Етаж Кота;Стаи;Чиста площ;Общи части;;Обща площ;Изложение;Тераси;Цена с ДДС;Евро / кв.м.',
  ';Апартамент 1;етаж 1 - кота +/- 0.00;2;40;2,48;5,22;45,43;СИ;22;ПРОДАДЕН;',
  ';Апартамент 2;;2;57;3,53;7,44;64,44;И;22,9;215400;2838,32',
  ';Апартамент 5;етаж 2 - кота +2.85;2;54,8;3,39;7,15;61,95;СИ;4,5;ПРОДАДЕН;',
  ';Гараж 1;сутерен - кота - 2.80;;16;0,99;2,09;30,61;;;38700;1264,29',
  ';Гараж 3 и склад;;;19,5;1,21;2,54;37,3;;;ПРОДАДЕН;',
].join('\n');

const ploshti = () => otCSV(PLOSHTI, 'площо');
const tseni = () => otCSV(TSENI, 'ЦЕНИ');

describe('четенето · взима каквото трябва, не таблицата', () => {
  it('чете обектите, а контролният ред не влиза', () => {
    const { obekti } = prochetiPloshti(ploshti());
    expect(obekti.map((o) => o.obekt)).toEqual([
      'Гараж 1',
      'Гараж 3 и склад',
      'Апартамент 1',
      'Апартамент 2',
      'Апартамент 5',
    ]);
  });

  it('котата и етажът се държат през обединените клетки', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const g3 = obekti.find((o) => o.obekt === 'Гараж 3 и склад')!;
    expect(g3.etazh).toBe('подземен');
    expect(g3.kota).toBe('кота -2,88');
    const ap2 = obekti.find((o) => o.obekt === 'Апартамент 2')!;
    expect(ap2.etazh).toBe('първи');
  });

  it('площта е в ЦЕЛИ квадратни сантиметри — нула float', () => {
    expect(ploshtVKvSm('45,22')).toBe(452_200);
    expect(ploshtVKvSm('45.22')).toBe(452_200);
    expect(ploshtVKvSm('40')).toBe(400_000);
    expect(ploshtVKvSm('')).toBe(0);
    expect(kvSmVM2(452_200)).toBe('45,22');
    expect(() => ploshtVKvSm('към 45')).toThrow();
  });

  it('общите части се СМЯТАТ от двете площи — негова дума', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const ap1 = obekti.find((o) => o.obekt === 'Апартамент 1')!;
    expect(ap1.chista_kvsm).toBe(400_000); // 40,00 м²
    expect(ap1.obshta_kvsm).toBe(452_200); // 45,22 м²
    expect(obshtiChasti_kvsm(ap1)).toBe(52_200); // 5,22 м²
    expect(ap1.dvor_kvsm).toBe(220_000); // 22,00 м²
  });

  it('видът се познава по името · „Гараж 3 и склад" е ГАРАЖ', () => {
    expect(vidPoIme('Апартамент 1')).toBe('apartament');
    expect(vidPoIme('Гараж 3 и склад')).toBe('garazh');
    expect(vidPoIme('Двоен гараж 7 и 8 и склад')).toBe('garazh');
    expect(vidPoIme('Паркомясто Р1')).toBe('parkomyasto');
    expect(vidPoIme('Открито паркомяста Р6')).toBe('parkomyasto');
    expect(vidPoIme('Склад Р1')).toBe('sklad');
  });

  it('четат се само листовете с площи — чуждият обект не влиза', () => {
    expect(eListSPloshti('площо')).toBe(true);
    expect(eListSPloshti('земя')).toBe(true);
    expect(eListSPloshti('Sheet3')).toBe(false); // друг обект, пълен с #REF!
    expect(eListSPloshti('разбивка')).toBe(false);
  });
});

describe('матрицата · цели базисни точки', () => {
  it('липсващият коефициент е 1,00 — не се измисля и не се отказва', () => {
    expect(koefitsient(MATRITSA_ZA_RAZRABOTKA.izlozheniya, '')).toBe(EDINITSA_BT);
    expect(koefitsient(MATRITSA_ZA_RAZRABOTKA.izlozheniya, 'непознато')).toBe(EDINITSA_BT);
    expect(koefitsient(MATRITSA_ZA_RAZRABOTKA.izlozheniya, 'Ю')).toBe(10_500);
  });

  it('3000 €/м² · неговото число за разработка', () => {
    // 100 м², втори етаж (1,00), без изложение (1,00) → 300 000 €
    expect(
      tsenaTochno({ obshta_kvsm: 1_000_000, vid: 'apartament', etazh: 'втори', izlozhenie: '' }),
    ).toBe(300_000_00);
  });

  it('коефициентите не се закръглят по средата — умножава се, дели се веднъж', () => {
    // трети етаж 1,02 × СИ 0,98 = 0,9996 · 100 м² × 3000 € = 299 880 €
    expect(
      tsenaTochno({ obshta_kvsm: 1_000_000, vid: 'apartament', etazh: 'трети', izlozhenie: 'СИ' }),
    ).toBe(299_880_00);
  });

  it('евро на квадрат е ЧАСТНО на цената и площта — както в неговата листа', () => {
    // Ап. 6 от „ЦЕНИ МД нова": 224 800 € ÷ 75,91 м² = 2 961,40 €/м²
    expect(evroNaKvadrat_st(224_800_00, 759_100)).toBe(2_961_40);
    expect(evroNaKvadrat_st(100_00, 0)).toBe(0); // нулева площ не дели
  });
});

describe('стойността на състоянието', () => {
  function otLista(): ReadonlyMap<string, OtTsenovaLista> {
    return prochetiTsenovaLista(tseni());
  }

  it('ценовата листа дава изложението, стаите и продаденото', () => {
    const l = otLista();
    expect(l.get('Апартамент 2')?.izlozhenie).toBe('И');
    expect(l.get('Апартамент 2')?.stai).toBe(2);
    expect(l.get('Апартамент 2')?.prodaden).toBe(false);
    expect(l.get('Апартамент 1')?.prodaden).toBe(true);
    expect(l.get('Апартамент 1')?.izlozhenie).toBe('СИ');
  });

  it('ПРОДАДЕН не влиза в стойността, но си остава ред', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, otLista());
    expect(s.redove).toHaveLength(5); // всички са на екрана
    expect(s.prodadeni).toBe(3); // Ап. 1, Ап. 5, Гараж 3
    expect(s.broy).toBe(2); // в сбора влизат Ап. 2 и Гараж 1
  });

  it('цената е НАГОРЕ до стотица · сборът се смята от ТОЧНИТЕ', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, otLista());
    for (const r of s.redove) {
      expect(r.tsena_st % 10_000).toBe(0); // всяка цена завършва на две нули
      expect(r.tsena_st).toBeGreaterThanOrEqual(r.tsena_tochno_st);
      expect(tsenaNagore(r.tsena_tochno_st)).toBe(r.tsena_st);
    }
    // ЗАКОНЪТ: сборът от закръглените НЕ е сборът, който се пази
    const sborOtZakragleni = s.redove
      .filter((r) => !r.prodaden)
      .reduce((a, r) => a + r.tsena_st, 0);
    expect(s.obshto_tochno_st).toBeLessThanOrEqual(sborOtZakragleni);
  });

  it('разликата от закръглянето се ВИЖДА (правило 7)', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, otLista());
    expect(s.obshto_st - s.obshto_tochno_st).toBe(s.razlika_st);
    expect(s.obshto_st % 10_000).toBe(0); // сборът е на цели стотици евро
  });

  it('СВЕРКА вход↔изход · N обекта влизат, N реда излизат', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, otLista());
    const sv = sverkaNaPartida(obekti, s);
    expect(sv.vhod).toBe(5);
    expect(sv.izhod).toBe(5);
    expect(sv.razlika).toBe(0); // и нулата се записва
  });

  it('без ценова листа Калкулаторът пак смята — само че без изложение', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, new Map());
    expect(s.broy).toBe(5); // нищо не е продадено, щом листата мълчи
    expect(s.redove.every((r) => r.izlozhenie === '')).toBe(true);
  });
});

describe('изходът · неговият хедър, дословно', () => {
  it('листът носи точно единайсетте му колони, по ред', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const list = listNaTsenite(s.redove);
    expect(list.koloni.map((k) => k.ime)).toEqual([...GLAVA_NA_TSENITE]);
  });

  it('продаденото се връща както е било — Калкулаторът не го преоценява', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const list = listNaTsenite(s.redove);
    const ap1 = list.redove.find((r) => r[0] === 'Апартамент 1')!;
    expect(ap1[9]).toBe(PRODADEN);
    expect(ap1[10]).toBe(''); // няма евро на квадрат за продадено
  });

  it('и се пише като истински .xlsx, без нито една зависимост', async () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const danni = await rabotnaKniga([listNaTsenite(s.redove)]);
    expect(danni.byteLength).toBeGreaterThan(1000);
    expect(new Uint8Array(danni.slice(0, 2))).toEqual(new Uint8Array([0x50, 0x4b])); // „PK"
  });
});
