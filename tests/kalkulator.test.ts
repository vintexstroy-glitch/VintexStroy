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
import { razlikaOtZakraglyane } from '../src/yadro/valuta.js';
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
  ochakvanNaem_st,
  ostavashti_bt,
  saglasuvana,
  tsenaPoRazhod,
  tsenaPoSastoyanie,
  tsenaTochno,
  type Matritsa,
} from '../src/kalkulator/matritsa.js';
import {
  deystvitelenNaem_st,
  kartaNaNaemite,
  klyuchOtIme,
  sashtiyat,
} from '../src/kalkulator/svarzvane.js';
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
    // Осемте посоки от неговата листа падат в ТРИ стъпки (ADR-034): Ю · ЮИ · ЮЗ
    // са една стъпка „юг" · 1,030. По-фино деление се преструва на точност,
    // каквато пазарът няма — и до И96 стояха две числа за едно нещо.
    expect(koefitsient(MATRITSA_ZA_RAZRABOTKA.izlozheniya, 'Ю')).toBe(10_300);
    expect(koefitsient(MATRITSA_ZA_RAZRABOTKA.izlozheniya, 'ЮЗ')).toBe(10_300);
  });

  it('3000 €/м² · НЕГОВОТО число · И53 „цена за старт" · И55', () => {
    // 100 м², среден етаж (1,00), без изложение (1,00) → 300 000 €
    expect(
      tsenaTochno({ obshta_kvsm: 1_000_000, vid: 'apartament', etazh: 'трети', izlozhenie: '' }),
    ).toBe(300_000_00);
  });

  it('коефициентите не се закръглят по средата — умножава се, дели се веднъж', () => {
    // партер 0,92 × Ю 1,03 = 0,9476 · 100 м² × 3 000 € = 284 280 €.
    // Точно този случай пада във float: 0.92 × 1.03 дава 0.9475999999999999.
    expect(
      tsenaTochno({ obshta_kvsm: 1_000_000, vid: 'apartament', etazh: 'партер', izlozhenie: 'Ю' }),
    ).toBe(284_280_00);
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

  it('ПРОДАДЕНОТО се чете И ОТ ЖУРНАЛА, не само от неговия файл (29.08)', () => {
    // Негово: „Там избираш продаден и го праща от цени в таб Продажби."
    // Значи щом за един обект вече има сделка, Калкулаторът трябва да го знае —
    // инак изборът щеше да е бутон без последица на екрана, от който тръгва.
    const { obekti } = prochetiPloshti(ploshti());
    const bez = stoynostNaSastoyanie(obekti, otLista());
    const zhiv = bez.redove.find((r) => !r.prodaden)!;

    const sav = stoynostNaSastoyanie(
      obekti,
      otLista(),
      undefined,
      new Map(),
      new Set([zhiv.obekt]),
    );
    expect(sav.prodadeni).toBe(bez.prodadeni + 1);
    expect(sav.broy).toBe(bez.broy - 1);
    expect(sav.redove.find((r) => r.obekt === zhiv.obekt)!.prodaden).toBe(true);
    // и стойността ПАДА с неговата · продаденото не влиза в сбора
    expect(sav.obshto_st).toBeLessThan(bez.obshto_st);
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

  /**
   * И ЗА ДВЕТЕ КОЛОНИ · обещанието не е наполовина.
   *
   * Двете плочки стоят една до друга и показват сбор, закръглен по един и същи
   * начин. Дотук А казваше „закръглено −33 €", а Б мълчеше за същото —
   * обещание, спазено от едната, е по-лошо от неспазено и от двете, защото
   * човекът се научава да вярва на надписа.
   *
   * И двете вече минават през ЕДНА функция (`razlikaOtZakraglyane`); дотук А
   * я смяташе с ръчно изваждане, а именуваната нямаше нито един викащ извън
   * теста си — макар ADR-012 да я обявява за построена.
   */
  it('и Б казва своето закръгляне · не само А', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, otLista());
    expect(s.razlika_st).toBe(razlikaOtZakraglyane(s.obshto_tochno_st, 'stotitsi'));
    expect(s.razlika_sastoyanie_st).toBe(
      razlikaOtZakraglyane(s.sastoyanie_tochno_st, 'stotitsi'),
    );
    expect(s.sastoyanie_st - s.sastoyanie_tochno_st).toBe(s.razlika_sastoyanie_st);
    expect(s.sastoyanie_st % 10_000).toBe(0);
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
    // При една цена излиза ТОЧНО неговият хедър — единайсет колони, по ред.
    const list = listNaTsenite(s.redove, 'ЦЕНИ', 'plosht');
    expect(list.koloni.map((k) => k.ime)).toEqual([...GLAVA_NA_TSENITE]);
  });

  it('и при „и двете" първите единайсет са НЕГОВИТЕ, непокътнати', () => {
    const { obekti } = prochetiPloshti(ploshti());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const list = listNaTsenite(s.redove); // подразбраното е „и двете"
    expect(list.koloni.map((k) => k.ime).slice(0, 11)).toEqual([...GLAVA_NA_TSENITE]);
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

// ══ ДВЕТЕ ЦЕНОВИ КОЛОНИ · негова поръчка (23.08) ═══════════════════════════
//
//   „За методът на калкулиране не знам. Добре е да има ДВЕ ТАБЛИЦИ ЕДНОВРЕМЕННО
//    С ДВЕ ЦЕНОВИ КОЛОНИ ЕДНА ДО ДРУГА за сравнение. И когато искаш да пуснеш
//    цените, избираш само едната да се вижда."
//
// Отчетът вече беше стигнал дотам: „А продава, Б оценява… точно затова са две
// колони, а не една."

describe('колона Б · оценката по състояние', () => {
  it('годишен наем ÷ доходност, с незаетост и оперативни', () => {
    // 500 €/мес → 6 000 €/год × 0,92 (незаетост) × 0,85 (оперативни) = 4 692 €
    // ÷ 0,032 = 146 625 €
    expect(tsenaPoSastoyanie({ naem_mesechen_st: 500_00 })).toBe(146_625_00);
  });

  it('обект без доход не се оценява доходно — това е ОТГОВОР, не грешка', () => {
    expect(tsenaPoSastoyanie({ naem_mesechen_st: 0 })).toBe(0);
  });

  it('доходност нула се отказва на глас — не капитализира', () => {
    expect(() =>
      tsenaPoSastoyanie({
        naem_mesechen_st: 100_00,
        matritsa: { ...MATRITSA_ZA_RAZRABOTKA, dohodnost_bt: 0 },
      }),
    ).toThrow(/не капитализира/);
  });

  it('очакваният наем е по площ и вид', () => {
    // 64,44 м² × 8,50 €/м² = 547,74 €
    expect(ochakvanNaem_st(644_400, 'apartament')).toBe(547_74);
    expect(ochakvanNaem_st(644_400, 'garazh')).toBe(77_33);
  });
});

describe('свързването · „Апартамент 1" ↔ „АП. № 1"', () => {
  it('двата начина на писане дават един ключ', () => {
    expect(sashtiyat(klyuchOtIme('Апартамент 1'), klyuchOtIme('АП. № 1'))).toBe(true);
    expect(sashtiyat(klyuchOtIme('Гараж 3 и склад'), klyuchOtIme('ГАРАЖ № 3'))).toBe(true);
  });

  it('еднакъв номер при различен вид НЕ е същият обект', () => {
    expect(sashtiyat(klyuchOtIme('Апартамент 1'), klyuchOtIme('Гараж 1'))).toBe(false);
  });

  it('име без номер не се свързва — по-добре очакван наем, отколкото чужд', () => {
    expect(klyuchOtIme('Мазе')).toBeUndefined();
    expect(klyuchOtIme('')).toBeUndefined();
  });

  it('прекратеният наем не влиза в картата', () => {
    const karta = kartaNaNaemite([
      { id: 'IM-1', edinitsa: 'АП. № 1', naem_mesechen_st: 550_00 },
      { id: 'IM-2', edinitsa: 'АП. № 2', naem_mesechen_st: 0 }, // прекратен
    ]);
    expect(deystvitelenNaem_st('Апартамент 1', karta)).toBe(550_00);
    expect(deystvitelenNaem_st('Апартамент 2', karta)).toBeUndefined();
  });
});

describe('двете колони, една до друга', () => {
  const ploshtiSDve = () => otCSV(PLOSHTI, 'площо');

  it('всеки ред носи И ДВЕТЕ цени', () => {
    const { obekti } = prochetiPloshti(ploshtiSDve());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    for (const r of s.redove) {
      expect(r.tsena_st).toBeGreaterThan(0);
      expect(r.sastoyanie_st).toBeGreaterThan(0);
      expect(r.tsena_st % 10_000).toBe(0); // и двете · нагоре до стотица
      expect(r.sastoyanie_st % 10_000).toBe(0);
    }
  });

  it('Ап. 2 · неговата цена срещу оценката · разликата Е информацията', () => {
    const { obekti } = prochetiPloshti(ploshtiSDve());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const ap2 = s.redove.find((r) => r.obekt === 'Апартамент 2')!;
    // А · по площ: 64,44 м² × 3 000 € × 0,98 (първи етаж) × 1,00 (изток) = 189 453,60 €
    expect(ap2.tsena_st).toBe(189_500_00);
    // Б · по състояние: 64,44 м² × 8,50 €/м²/мес = 547,74 €/мес →
    // × 12 × 0,92 (заетост) × 0,85 (чист доход) ÷ 3,20 % = 160 624,75 € →
    // нагоре до стотица
    expect(ap2.sastoyanie_st).toBe(160_700_00);
    // оценката стои ПОД продажната цена — обичайното при ново строителство
    expect(ap2.razlika_bt).toBeLessThan(0);
    expect(ap2.razlika_bt).toBeGreaterThan(-3_000); // около −16 %
  });

  it('НАЕМЪТ ОТ ЖУРНАЛА бие очаквания — и редът го казва', () => {
    const { obekti } = prochetiPloshti(ploshtiSDve());
    const karta = kartaNaNaemite([{ id: 'IM-2', edinitsa: 'АП. № 2', naem_mesechen_st: 700_00 }]);
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()), undefined, karta);

    const ap2 = s.redove.find((r) => r.obekt === 'Апартамент 2')!;
    expect(ap2.naemOt).toBe('zhurnal');
    expect(ap2.naem_mesechen_st).toBe(700_00);

    const ap1 = s.redove.find((r) => r.obekt === 'Апартамент 1')!;
    expect(ap1.naemOt).toBe('matritsa'); // няма го в Журнала

    // по-високият действителен наем вдига оценката
    const bez = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const ap2Bez = bez.redove.find((r) => r.obekt === 'Апартамент 2')!;
    expect(ap2.sastoyanie_st).toBeGreaterThan(ap2Bez.sastoyanie_st);
  });

  it('ДВАТА сбора · продаденото не влиза в нито един', () => {
    const { obekti } = prochetiPloshti(ploshtiSDve());
    const s = stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni()));
    const zhivi = s.redove.filter((r) => !r.prodaden);
    expect(s.obshto_tochno_st).toBe(zhivi.reduce((a, r) => a + r.tsena_tochno_st, 0));
    expect(s.sastoyanie_tochno_st).toBe(
      zhivi.reduce((a, r) => a + r.sastoyanie_tochno_st, 0),
    );
    expect(s.razlika_na_metodite_bt).toBeLessThan(0);
  });
});

describe('износът · трите избора', () => {
  function redove() {
    const { obekti } = prochetiPloshti(otCSV(PLOSHTI, 'площо'));
    return stoynostNaSastoyanie(obekti, prochetiTsenovaLista(tseni())).redove;
  }

  it('„и двете" долепя две колони ОТДЯСНО · неговите единайсет не мърдат', () => {
    const list = listNaTsenite(redove(), 'ЦЕНИ', 'dvete');
    expect(list.koloni).toHaveLength(13);
    expect(list.koloni.slice(0, 11).map((k) => k.ime)).toEqual([...GLAVA_NA_TSENITE]);
    expect(list.koloni[11]?.ime).toBe('Стойност на Състояние');
    expect(list.koloni[12]?.ime).toBe('Евро / кв.м. (състояние)');
  });

  it('„само по площ" дава неговите единайсет и цената по площ', () => {
    const list = listNaTsenite(redove(), 'ЦЕНИ', 'plosht');
    expect(list.koloni).toHaveLength(11);
    const ap2 = list.redove.find((r) => r[0] === 'Апартамент 2')!;
    expect(ap2[9]).toBe('189 500,00'.replace(/ /g, ' '));
  });

  it('„само по състояние" слага ОЦЕНКАТА в неговата колона „Цена с ДДС"', () => {
    const list = listNaTsenite(redove(), 'ЦЕНИ', 'sastoyanie');
    expect(list.koloni).toHaveLength(11);
    expect(list.koloni[9]?.ime).toBe('Цена с ДДС'); // името му остава
    const ap2 = list.redove.find((r) => r[0] === 'Апартамент 2')!;
    expect(ap2[9]).toBe('160 700,00'.replace(/ /g, ' '));
  });

  it('продаденото си остава ПРОДАДЕН и в трите избора', () => {
    for (const koya of ['dvete', 'plosht', 'sastoyanie'] as const) {
      const list = listNaTsenite(redove(), 'ЦЕНИ', koya);
      const ap1 = list.redove.find((r) => r[0] === 'Апартамент 1')!;
      expect(ap1[9]).toBe(PRODADEN);
    }
  });
});

/**
 * ═══ В · РАЗХОДНИЯТ ПОДХОД · и съгласуването с тегла (резен 16б) ═══
 *
 * Инвариантите СА ПЪРВИ (умението `matematika` §6): какво трябва да е вярно
 * ВИНАГИ, преди която и да е сметка. Пример проверява един случай; инвариант
 * проверява правилото.
 */
describe('В · разходният подход', () => {
  /** Матрица с назовани числа, за да е сметката проверима на ръка. */
  function sVazrast(vazrast_g: number, polezen_zhivot_g = 50): Matritsa {
    return Object.freeze({
      ...MATRITSA_ZA_RAZRABOTKA,
      zemya_st_kvm: Object.freeze({
        apartament: 100_00, // 100 €/м²
        garazh: 0,
        parkomyasto: 0,
        sklad: 0,
        drug: 0,
      }),
      stroitelna_st_kvm: Object.freeze({
        apartament: 900_00, // 900 €/м²
        garazh: 0,
        parkomyasto: 0,
        sklad: 0,
        drug: 0,
      }),
      polezen_zhivot_g,
      vazrast_g,
    });
  }
  const STO_KVM = 1_000_000; // 100 м² в кв.см

  it('нова сграда · пълна строителна стойност + земята', () => {
    // 100 м² × (100 + 900) €/м² = 100 000 €
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(0) }))
      .toBe(100_000_00);
  });

  it('на ПОЛОВИН живот сградата е наполовина · земята е ЦЯЛА', () => {
    // 100 м² × (100 + 450) = 55 000 €, не 50 000 — земята не овехтява
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(25) }))
      .toBe(55_000_00);
  });

  it('ЗЕМЯТА НЕ ОВЕХТЯВА · разликата между две възрасти е точно сградата', () => {
    const nova = tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(0) });
    const stara = tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(50) });
    // Цялата строителна част: 100 м² × 900 € = 90 000 €
    expect(nova - stara).toBe(90_000_00);
    // А останалото Е земята, до последната стотинка.
    expect(stara).toBe(10_000_00);
  });

  it('възраст НАД полезния живот не прави сградата отрицателна · остава земята', () => {
    expect(tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(999) }))
      .toBe(10_000_00);
  });

  it('нулева площ дава нула · това е отговор, не грешка', () => {
    expect(tsenaPoRazhod({ obshta_kvsm: 0, vid: 'apartament', matritsa: sVazrast(0) })).toBe(0);
  });

  it('полезен живот нула се ОТКАЗВА гласно · нула не дели', () => {
    expect(() =>
      tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: sVazrast(0, 0) }),
    ).toThrow();
  });

  it('резултатът е ЦЕЛИ центове · нито един float', () => {
    for (const kvsm of [1, 7, 333, 784_000, 1_234_567]) {
      const st = tsenaPoRazhod({ obshta_kvsm: kvsm, vid: 'apartament', matritsa: sVazrast(17) });
      expect(Number.isSafeInteger(st), `${kvsm} кв.см`).toBe(true);
    }
  });

  it('единицата е ДЕСЕТ ХИЛЯДИ базисни точки · числото се твърди, не се чете', () => {
    // Без този ред всяко очакване отдолу може да се пише като `EDINITSA_BT / 2`
    // и да се мести ЗАЕДНО с нея: удвоена, тя оставя всички проверки зелени.
    expect(EDINITSA_BT).toBe(10_000);
  });

  it('останалото от сградата се БРОИ и от екрана · един дом', () => {
    // ЧИСЛАТА СА С РЪКА. „Половината" се пише 5 000, не `EDINITSA_BT / 2`:
    // второто е същата константа от двете страни на равенството.
    expect(ostavashti_bt(sVazrast(0))).toBe(10_000);
    expect(ostavashti_bt(sVazrast(25))).toBe(5_000);
    expect(ostavashti_bt(sVazrast(50))).toBe(0);
    expect(ostavashti_bt(sVazrast(999))).toBe(0);
  });
});

describe('съгласуването · претеглената цена от трите', () => {
  const RAVNI = Object.freeze({ pazaren_bt: 3_000, dohoden_bt: 4_000, razhoden_bt: 3_000 });

  it('ТРИ РАВНИ стойности дават ТОЧНО същата стойност · каквито и да са теглата', () => {
    for (const tegla of [
      RAVNI,
      { pazaren_bt: 7_000, dohoden_bt: 2_000, razhoden_bt: 1_000 },
      { pazaren_bt: 10_000, dohoden_bt: 0, razhoden_bt: 0 },
    ]) {
      const r = saglasuvana({
        pazaren_st: 123_456_78,
        dohoden_st: 123_456_78,
        razhoden_st: 123_456_78,
        tegla,
      });
      expect(r.tochno_st).toBe(123_456_78);
    }
  });

  it('тегло 100 % на един подход връща ТОЧНО него', () => {
    const r = saglasuvana({
      pazaren_st: 200_000_00,
      dohoden_st: 50_000_00,
      razhoden_st: 90_000_00,
      tegla: { pazaren_bt: 10_000, dohoden_bt: 0, razhoden_bt: 0 },
    });
    expect(r.tochno_st).toBe(200_000_00);
  });

  it('сбор на теглата, различен от 100 %, се ОТКАЗВА · не се пренормира тихо', () => {
    expect(() =>
      saglasuvana({
        pazaren_st: 100_00,
        dohoden_st: 100_00,
        razhoden_st: 100_00,
        tegla: { pazaren_bt: 5_000, dohoden_bt: 4_000, razhoden_bt: 2_000 },
      }),
    ).toThrow();
  });

  it('НУЛЕВИЯТ подход отпада и теглата се ПРЕНОРМИРАТ · не се яде мълчаливо', () => {
    // Обект без наем: Б е нула. Ако нулата влезеше с теглото си, цената щеше да
    // падне с 20 % без никой да е решавал.
    const r = saglasuvana({
      pazaren_st: 100_000_00,
      dohoden_st: 0,
      razhoden_st: 100_000_00,
      tegla: { pazaren_bt: 7_000, dohoden_bt: 2_000, razhoden_bt: 1_000 },
    });
    expect(r.tochno_st).toBe(100_000_00);
    expect(r.otpadnali).toEqual(['доходен']);
  });

  it('пренормираните тегла пак затварят на 100 % · до последната точка', () => {
    // 7 000 и 1 000 към сбор 8 000 дават 8 750 и 1 250 — остатъкът е назован.
    const r = saglasuvana({
      pazaren_st: 100_000_00,
      dohoden_st: 0,
      razhoden_st: 50_000_00,
      tegla: { pazaren_bt: 7_000, dohoden_bt: 2_000, razhoden_bt: 1_000 },
    });
    const d = r.deystvashti;
    expect(d.pazaren_bt + d.dohoden_bt + d.razhoden_bt).toBe(EDINITSA_BT);
    expect(d.dohoden_bt).toBe(0);
    expect(r.tochno_st).toBe(93_750_00);
  });

  it('остатъкът от пренормирането отива на НАЙ-ГОЛЯМОТО тегло, а не се губи', () => {
    // Три равни тегла върху два оцелели: 5 000 и 5 000 затварят точно.
    // Тук: 3 333 · 3 333 · 3 334 върху три оцелели.
    const r = saglasuvana({
      pazaren_st: 1_00,
      dohoden_st: 1_00,
      razhoden_st: 1_00,
      tegla: { pazaren_bt: 3_333, dohoden_bt: 3_333, razhoden_bt: 3_334 },
    });
    const d = r.deystvashti;
    expect(d.pazaren_bt + d.dohoden_bt + d.razhoden_bt).toBe(EDINITSA_BT);
  });

  it('ВСИЧКИ нули дават нула и празни тегла · не гърми', () => {
    const r = saglasuvana({ pazaren_st: 0, dohoden_st: 0, razhoden_st: 0, tegla: RAVNI });
    expect(r.tochno_st).toBe(0);
    expect(r.otpadnali).toEqual(['пазарен', 'доходен', 'разходен']);
  });

  it('съгласуваната стои МЕЖДУ най-малката и най-голямата · претегляне не излиза вън', () => {
    const st = [80_000_00, 120_000_00, 95_000_00];
    const r = saglasuvana({
      pazaren_st: st[0]!,
      dohoden_st: st[1]!,
      razhoden_st: st[2]!,
      tegla: RAVNI,
    });
    expect(r.tochno_st).toBeGreaterThanOrEqual(Math.min(...st));
    expect(r.tochno_st).toBeLessThanOrEqual(Math.max(...st));
  });

  it('резултатът е ЦЕЛИ центове · нито един float', () => {
    for (const p of [1, 7, 12_345_67, 999_999_99]) {
      const r = saglasuvana({
        pazaren_st: p,
        dohoden_st: p * 2,
        razhoden_st: p + 13,
        tegla: { pazaren_bt: 3_333, dohoden_bt: 3_333, razhoden_bt: 3_334 },
      });
      expect(Number.isSafeInteger(r.tochno_st), String(p)).toBe(true);
    }
  });
});

describe('група Г · липсващото НЕ се заглажда до нула (резен 47)', () => {
  /**
   * НУЛАТА Е СЕНТИНЕЛ ЗА „НЕ Е ДАДЕНО", не цена.
   *
   * Дотук сентинелът важеше само когато ДВЕТЕ разходни числа са нула. При ЕДНО
   * липсващо подходът смяташе наполовина и раждаше число, което ИЗГЛЕЖДА
   * сметнато — после то влизаше в съгласуването и дърпаше крайното надолу.
   */
  const sChisla = (zemya: number, stroitelna: number) => ({
    ...MATRITSA_ZA_RAZRABOTKA,
    zemya_st_kvm: { ...MATRITSA_ZA_RAZRABOTKA.zemya_st_kvm, apartament: zemya },
    stroitelna_st_kvm: { ...MATRITSA_ZA_RAZRABOTKA.stroitelna_st_kvm, apartament: stroitelna },
  });
  const STO_KVM = 1_000_000; // 100 м² в кв.см · с ръка, както и в съседния блок
  const po = (m: ReturnType<typeof sChisla>): number =>
    tsenaPoRazhod({ obshta_kvsm: STO_KVM, vid: 'apartament', matritsa: m });

  it('и ДВЕТЕ числа дадени · подходът ражда число', () => {
    expect(po(sChisla(50_000, 100_000))).toBeGreaterThan(0);
  });

  it('ЕДНО липсващо · подходът НЕ ражда число, вместо да смята наполовина', () => {
    // Числата с ръка: 100 кв.м × 500 €/м² земя биха дали НЕ-нула, ако липсата
    // на строителна се заглаждаше. Точно това правеше кодът досега.
    expect(po(sChisla(50_000, 0))).toBe(0);
    expect(po(sChisla(0, 100_000))).toBe(0);
  });

  it('и ДВЕТЕ липсващи · същото, както преди', () => {
    expect(po(sChisla(0, 0))).toBe(0);
  });

  it('а отпадналият подход се НАЗОВАВА, не се премълчава (правило 15)', () => {
    const sag = saglasuvana({
      pazaren_st: 100_00,
      dohoden_st: 200_00,
      razhoden_st: po(sChisla(50_000, 0)),
      tegla: MATRITSA_ZA_RAZRABOTKA.tegla,
    });
    expect(sag.otpadnali).toContain('разходен');
  });
});

describe('пиновете · главата и думата се твърдят с ръка (резен 46 · група В)', () => {
  it('главата на Ценовата листа е ЕДИНАЙСЕТ колони', () => {
    expect(GLAVA_NA_TSENITE).toHaveLength(11);
  });

  it('продаденото се пише дословно „ПРОДАДЕН"', () => {
    expect(PRODADEN).toBe('ПРОДАДЕН');
  });
});
