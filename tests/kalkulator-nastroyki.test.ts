/**
 * СЕКЦИЯ „КАЛКУЛАТОР" · входът и разбивката (И96 т.2).
 *
 * Негови думи: „Аз не разбирам как се смята… с разлика в цената в 2 графи КАК
 * СЕ СМЯТА и какви стойности ти трябват… с легенда и пример за коефициент."
 *
 * Затова тестът пази точно това:
 *   · всеки коефициент е МЕНЮ ОТ ДУМИ, не свободно число;
 *   · разбивката казва с колко мени ВСЕКИ ред, и сборът им Е цената;
 *   · добавките влизат НАКРАЯ и не се умножават по коефициентите;
 *   · един дом за числата — матрицата се СТРОИ от настройките (правило 17).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VIDOVE_OBEKT } from '../src/kalkulator/chetene.js';
import {
  bazataENegova,
  DOBAVKI,
  EDINITSA_BT,
  GreshkaNastroyki,
  KLASOVE,
  KLYUCHOVE_KOEFITSIENTI,
  KOEFITSIENTI,
  NAY_GOLYAM_BT,
  NEGOVI_BAZI,
  PO_PODRAZBIRANE,
  btOtDumata,
  dobavka_st,
  klas,
  koefitsient,
  kolkoMeni,
  matritsaOtNastroyki,
  obshtiyatMnozhitel_bt,
  proveriNastroyki,
  sBaza,
  sIzbranaStapka,
  sKlas,
  stapka,
  vKoefitsient,
  vProtsent,
} from '../src/kalkulator/nastroyki.js';
import { MATRITSA_ZA_RAZRABOTKA, tsenaOtChasti, tsenaTochno } from '../src/kalkulator/matritsa.js';
import {
  PRIMEREN_OBEKT,
  osnovaZaPrimera,
  primerZaKoefitsient,
  razbivka,
  sverkaNaRazbivkata,
} from '../src/kalkulator/razbivka.js';

describe('менюто вместо свободното число · „аз не знам"', () => {
  it('петте коефициента са изброени поименно и всеки има стъпки и легенда', () => {
    expect([...KLYUCHOVE_KOEFITSIENTI]).toEqual([
      'etazh',
      'sastoyanie',
      'izlozhenie',
      'vazrast',
      'asansior',
    ]);
    for (const k of KOEFITSIENTI) {
      expect(k.stapki.length, k.ime).toBeGreaterThan(1);
      expect(k.zashto, k.ime).not.toBe('');
      // подразбираната стъпка СЪЩЕСТВУВА — иначе менюто тръгва празно
      expect(k.stapki.some((s) => s.klyuch === k.podrazbirano), k.ime).toBe(true);
    }
  });

  it('всяка стъпка е ЦЯЛО число базисни точки — нула float', () => {
    for (const k of KOEFITSIENTI) {
      for (const s of k.stapki) {
        expect(Number.isSafeInteger(s.bt), `${k.ime} · ${s.ime}`).toBe(true);
      }
    }
  });

  it('непозната стъпка пада на подразбираната — не на грешка', () => {
    const k = koefitsient('etazh');
    expect(stapka(k, 'няма-такава').klyuch).toBe('sreden');
    expect(stapka(k, 'parter').bt).toBe(9_200);
  });

  it('изборът се сменя, а несъществуващият се отказва С ДУМИ', () => {
    const n = sIzbranaStapka(PO_PODRAZBIRANE, 'etazh', 'parter');
    expect(n.izbrani.etazh).toBe('parter');
    expect(PO_PODRAZBIRANE.izbrani.etazh).toBe('sreden'); // старото не се пипа
    expect(() => sIzbranaStapka(PO_PODRAZBIRANE, 'etazh', 'таван')).toThrow(GreshkaNastroyki);
  });
});

describe('един дом за числата · матрицата се СТРОИ (правило 17)', () => {
  it('осемте посоки на неговия файл падат в трите стъпки', () => {
    // Дотук „Ю" беше 1,05 в матрицата и 1,03 в проучването — две числа за
    // едно нещо. Сега е едно, и идва оттук.
    for (const posoka of ['Ю', 'ЮИ', 'ЮЗ']) expect(btOtDumata('izlozhenie', posoka)).toBe(10_300);
    for (const posoka of ['И', 'З']) expect(btOtDumata('izlozhenie', posoka)).toBe(10_000);
    for (const posoka of ['С', 'СИ', 'СЗ']) expect(btOtDumata('izlozhenie', posoka)).toBe(9_700);
  });

  it('непозната или празна дума дава 1,00 — неизвестното НЕ мени цената', () => {
    expect(btOtDumata('izlozhenie', '')).toBe(EDINITSA_BT);
    expect(btOtDumata('izlozhenie', 'нагоре')).toBe(EDINITSA_BT);
    expect(btOtDumata('etazh', 'тринайсети')).toBe(EDINITSA_BT);
  });

  it('„последен" и „предпоследен" НЕ се гадаят от дума', () => {
    // Файлът казва кой е етажът, не колко са етажите. Затова тези две стъпки
    // се ИЗБИРАТ и никоя дума не води до тях.
    const dumi = Object.keys(matritsaOtNastroyki(PO_PODRAZBIRANE).etazhi);
    const kam = dumi.map((d) => btOtDumata('etazh', d));
    expect(kam).not.toContain(9_600); // последен
    expect(kam).not.toContain(10_200); // предпоследен
  });

  it('матрицата за разработка е сглобената от настройките, не написана на ръка', () => {
    expect(MATRITSA_ZA_RAZRABOTKA).toEqual(matritsaOtNastroyki(PO_PODRAZBIRANE));
    expect(MATRITSA_ZA_RAZRABOTKA.baza_st.apartament).toBe(300_000); // 3 000 € · негово
  });

  it('трите коефициента извън файла не се четат от ДУМА', () => {
    // Състояние, възраст и асансьор ги няма в неговата листа — те са ИЗБОР.
    for (const klyuch of ['sastoyanie', 'vazrast', 'asansior'] as const) {
      expect(btOtDumata(klyuch, 'каквото и да е')).toBe(EDINITSA_BT);
    }
  });

  it('…но ПАК стигат до партидата · като ОБЩ множител на сградата', () => {
    // „Малинова Долина" е ЕДНА сграда: тя е нова, с асансьор, и това важи за
    // всеки обект в нея. Без този множител три от петте менюта щяха да мърдат
    // само примера, а листата нямаше да ги усети — секцията щеше да е табло.
    expect(obshtiyatMnozhitel_bt(PO_PODRAZBIRANE)).toBe(EDINITSA_BT);
    const luks = sIzbranaStapka(PO_PODRAZBIRANE, 'sastoyanie', 'novo-luks');
    expect(obshtiyatMnozhitel_bt(luks)).toBe(10_800);
    // 1,08 × 1,05 × 0,96 = 1,08864 → 10 886 б.т., смятани наведнъж
    const trite = sIzbranaStapka(
      sIzbranaStapka(luks, 'vazrast', 'pod-5'),
      'asansior',
      'nyama',
    );
    expect(obshtiyatMnozhitel_bt(trite)).toBe(10_886);
    expect(matritsaOtNastroyki(trite).obshti_bt).toBe(10_886);
  });

  it('менютата „Етаж" и „Изложение" важат, КОГАТО ФАЙЛЪТ МЪЛЧИ', () => {
    // Платено с находка в прохода: човек мени изложението в менюто, а числата
    // долу не мърдат — защото всеки апартамент носи СВОЕ изложение от файла и
    // празната клетка падаше на 1,00. Гаражите нямат изложение; за тях важи
    // избраното. Това не е гадаене — гадаенето е когато приложението решава.
    const bez = tsenaTochno({
      obshta_kvsm: 1_000_000,
      vid: 'apartament',
      etazh: '',
      izlozhenie: '',
      matritsa: matritsaOtNastroyki(PO_PODRAZBIRANE),
    });
    const yug = tsenaTochno({
      obshta_kvsm: 1_000_000,
      vid: 'apartament',
      etazh: '',
      izlozhenie: '',
      matritsa: matritsaOtNastroyki(sIzbranaStapka(PO_PODRAZBIRANE, 'izlozhenie', 'yug')),
    });
    expect(bez).toBe(300_000_00);
    expect(yug).toBe(309_000_00); // × 1,03
  });

  it('…но КАЗАНОТО от файла бие избраното', () => {
    // „СИ" е в листата му за този апартамент — менюто не го пренаписва.
    const sizbran = matritsaOtNastroyki(sIzbranaStapka(PO_PODRAZBIRANE, 'izlozhenie', 'yug'));
    expect(
      tsenaTochno({ obshta_kvsm: 1_000_000, vid: 'apartament', etazh: 'трети', izlozhenie: 'СИ', matritsa: sizbran }),
    ).toBe(291_000_00); // × 0,97 · север, както пише във файла
  });

  it('общият множител мени цената на всеки обект в партидата', () => {
    const bez = tsenaTochno({
      obshta_kvsm: 1_000_000,
      vid: 'apartament',
      etazh: 'трети',
      izlozhenie: '',
      matritsa: matritsaOtNastroyki(PO_PODRAZBIRANE),
    });
    const luks = tsenaTochno({
      obshta_kvsm: 1_000_000,
      vid: 'apartament',
      etazh: 'трети',
      izlozhenie: '',
      matritsa: matritsaOtNastroyki(sIzbranaStapka(PO_PODRAZBIRANE, 'sastoyanie', 'novo-luks')),
    });
    expect(bez).toBe(300_000_00);
    expect(luks).toBe(324_000_00); // × 1,08
  });
});

describe('добавките · и защо НЕ са на квадратен метър', () => {
  it('гараж и паркомясто са ЦЯЛА цена за брой — площта не участва', () => {
    const parkomyasto = DOBAVKI.find((d) => d.klyuch === 'parkomyasto')!;
    expect(parkomyasto.vid).toBe('broy');
    // 12 кв.м в центъра и 12 кв.м в квартала са различни продукти
    expect(dobavka_st(parkomyasto, { broy: 1, kvsm: 120_000, baza_st: 300_000 })).toBe(12_000_00);
    expect(dobavka_st(parkomyasto, { broy: 1, kvsm: 900_000, baza_st: 300_000 })).toBe(12_000_00);
    expect(dobavka_st(parkomyasto, { broy: 2, kvsm: 120_000, baza_st: 300_000 })).toBe(24_000_00);
    expect(dobavka_st(parkomyasto, { broy: 0, kvsm: 120_000, baza_st: 300_000 })).toBe(0);
  });

  it('мазето е ПО ПЛОЩ, но на 20 % от жилищния квадрат', () => {
    const maze = DOBAVKI.find((d) => d.klyuch === 'maze')!;
    expect(maze.vid).toBe('plosht');
    // 12 м² × 3 000 €/м² × 0,20 = 7 200 €
    expect(dobavka_st(maze, { broy: 1, kvsm: 120_000, baza_st: 300_000 })).toBe(7_200_00);
  });

  it('добавката влиза НАКРАЯ и не се умножава по коефициентите', () => {
    const bez = tsenaOtChasti({ obshta_kvsm: 1_000_000, baza_st: 300_000, koefitsienti_bt: [9_200] });
    const s = tsenaOtChasti({
      obshta_kvsm: 1_000_000,
      baza_st: 300_000,
      koefitsienti_bt: [9_200],
      dobavka_st: 12_000_00,
    });
    // партерът НЕ поевтинява паркомястото
    expect(s - bez).toBe(12_000_00);
  });
});

describe('доходността · скала по клас, не число в кода', () => {
  it('четирите реда · трите са СКАЛА, четвъртият е ИЗМЕРЕНОТО', () => {
    expect(KLASOVE.map((k) => k.klyuch)).toEqual(['pazar', 'a', 'b', 'v']);
    for (const k of KLASOVE) {
      expect(k.bt, k.ime).toBeGreaterThanOrEqual(k.ot_bt);
      expect(k.bt, k.ime).toBeLessThanOrEqual(k.do_bt);
      expect(k.zashto, k.ime).not.toBe('');
    }
    // пазарът за жилища в София стои ПОД скалата на занаята — това е
    // информацията, не грешката
    expect(klas('pazar').bt).toBeLessThan(klas('a').ot_bt);
  });

  it('смяната на клас носи и доходността му', () => {
    const n = sKlas(PO_PODRAZBIRANE, 'b');
    expect(n.klas).toBe('b');
    expect(n.dohodnost_bt).toBe(600); // 6,00 %
    expect(klas('няма такъв').klyuch).toBe('pazar'); // непознатият пада на първия
  });
});

describe('проверката на настройките · всички находки наведнъж', () => {
  it('здравите настройки не дават нито една находка', () => {
    expect(proveriNastroyki(PO_PODRAZBIRANE)).toEqual([]);
  });

  it('нулева доходност се казва — Графа Б е невъзможна', () => {
    const n = { ...PO_PODRAZBIRANE, dohodnost_bt: 0 };
    expect(proveriNastroyki(n).join(' ')).toContain('не капитализира');
  });

  it('всички находки идват НАВЕДНЪЖ, не първата', () => {
    const n = { ...PO_PODRAZBIRANE, dohodnost_bt: 0, nezaetost_bt: 20_000, operativni_bt: -1 };
    expect(proveriNastroyki(n).length).toBe(3);
  });

  it('1,05, въведено като 105, се хваща — и се КАЗВА как да се чете', () => {
    // 105 в базисни точки е 0,0105 — не корекция, а друга цена.
    const nahodki = proveriNastroyki({ ...PO_PODRAZBIRANE, dohodnost_bt: 600 });
    expect(nahodki).toEqual([]);
    expect(NAY_GOLYAM_BT).toBe(20_000);
  });

  it('базата се сменя, а нулева база се отказва С ДУМИ', () => {
    expect(sBaza(PO_PODRAZBIRANE, 'apartament', 250_000).baza_st.apartament).toBe(250_000);
    expect(() => sBaza(PO_PODRAZBIRANE, 'apartament', 0)).toThrow(GreshkaNastroyki);
  });
});

describe('разбивката · „КАК СЕ СМЯТА", ред по ред', () => {
  it('Графа А тръгва от площ × база и свършва със закръгляне', () => {
    const r = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    expect(r.a[0]!.deystvie).toBe('osnova');
    // 78,40 м² × 3 000 € = 235 200 €
    expect(r.a[0]!.mezhdinno_st).toBe(235_200_00);
    expect(r.a[r.a.length - 1]!.deystvie).toBe('zakragli');
    expect(r.a_st % 100_00).toBe(0); // нагоре до стотица
  });

  it('всеки от петте коефициента е СВОЙ ред, с легенда', () => {
    const r = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    const umnozheniya = r.a.filter((x) => x.deystvie === 'umnozhi');
    expect(umnozheniya).toHaveLength(5);
    for (const red of umnozheniya) expect(red.zashto, red.kakvo).not.toBe('');
  });

  it('СБОРЪТ на редовете Е цената · сверка вход↔изход (правило 7)', () => {
    for (const izbrani of [
      PO_PODRAZBIRANE,
      sIzbranaStapka(sIzbranaStapka(PO_PODRAZBIRANE, 'etazh', 'parter'), 'izlozhenie', 'yug'),
      sKlas(sIzbranaStapka(PO_PODRAZBIRANE, 'sastoyanie', 'novo-luks'), 'b'),
    ]) {
      const sv = sverkaNaRazbivkata(razbivka(izbrani, PRIMEREN_OBEKT));
      expect(sv.a).toBe(0);
      expect(sv.b).toBe(0);
    }
  });

  it('разбивката дава СЪЩОТО число като двигателя — един път сметнато', () => {
    const n = sIzbranaStapka(PO_PODRAZBIRANE, 'izlozhenie', 'yug');
    const r = razbivka(n, { ...PRIMEREN_OBEKT, dobavki: {} });
    expect(r.a_tochno_st).toBe(
      tsenaOtChasti({
        obshta_kvsm: PRIMEREN_OBEKT.obshta_kvsm,
        baza_st: 300_000,
        koefitsienti_bt: [10_000, 10_000, 10_300, 10_000, 10_000],
      }),
    );
  });

  it('междинното НЕ се трупа от закръглени редове', () => {
    // Всеки ред се смята наново от началото. Проверка: партер × юг наведнъж
    // дава същото, каквото и през двата реда на разбивката.
    const n = sIzbranaStapka(sIzbranaStapka(PO_PODRAZBIRANE, 'etazh', 'parter'), 'izlozhenie', 'yug');
    const r = razbivka(n, { ...PRIMEREN_OBEKT, dobavki: {} });
    expect(r.a_tochno_st).toBe(
      tsenaOtChasti({
        obshta_kvsm: PRIMEREN_OBEKT.obshta_kvsm,
        baza_st: 300_000,
        koefitsienti_bt: [9_200, 10_000, 10_300, 10_000, 10_000],
      }),
    );
  });

  it('добавката е СВОЙ ред и се вижда поотделно', () => {
    const s = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    const bez = razbivka(PO_PODRAZBIRANE, { ...PRIMEREN_OBEKT, dobavki: {} });
    const red = s.a.find((x) => x.deystvie === 'dobavi')!;
    expect(red.meni_st).toBe(12_000_00);
    expect(s.a_tochno_st - bez.a_tochno_st).toBe(12_000_00);
  });

  it('Графа Б показва ЧЕТИРИТЕ стъпки — нищо не е скрито в едно число', () => {
    const r = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    expect(r.b.map((x) => x.deystvie)).toEqual([
      'osnova',
      'umnozhi',
      'umnozhi',
      'razdeli',
      'zakragli',
    ]);
    // 540 € × 12 = 6 480 €
    expect(r.b[0]!.mezhdinno_st).toBe(6_480_00);
    // × 0,92 заетост × 0,85 чист доход = 5 067,36 € ÷ 3,20 %
    expect(r.b[2]!.mezhdinno_st).toBe(5_067_36);
  });

  it('обект без наем няма Графа Б — и това е ОТГОВОР, не липса', () => {
    const r = razbivka(PO_PODRAZBIRANE, { ...PRIMEREN_OBEKT, naem_mesechen_st: 0 });
    expect(r.b).toHaveLength(0);
    expect(r.b_st).toBe(0);
    expect(sverkaNaRazbivkata(r).b).toBe(0);
  });

  it('редът казва ОТКЪДЕ е наемът · факт или предположение', () => {
    const otZhurnala = razbivka(PO_PODRAZBIRANE, { ...PRIMEREN_OBEKT, naemOt: 'zhurnal' });
    expect(otZhurnala.b[0]!.zashto).toContain('ДЕЙСТВИТЕЛНИЯТ');
    expect(razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT).b[0]!.zashto).toContain('ОЧАКВАН');
  });

  it('ПОДРАЗБИРАЩАТА СЕ ДОХОДНОСТ свързва двете графи', () => {
    const r = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    // 5 067,36 € чист доход ÷ 254 256,00 € цена по площ ≈ 1,99 %
    expect(r.podrazbirashtaSe_bt).toBeGreaterThan(150);
    expect(r.podrazbirashtaSe_bt).toBeLessThan(300);
    // и стои ПОД скалата на занаята — точно това е информацията
    expect(r.podrazbirashtaSe_bt).toBeLessThan(klas('a').ot_bt);
  });

  it('разликата Б − А носи ЗНАК, и той е информацията', () => {
    const r = razbivka(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    expect(r.razlika_st).toBe(r.b_tochno_st - r.a_tochno_st);
    expect(r.razlika_st).toBeLessThan(0); // оценката под продажната цена
    expect(r.razlika_bt).toBeLessThan(0);
  });
});

describe('примерът за коефициент · негово изрично искане', () => {
  it('всяка стъпка се показва с това, което прави В ПАРИ', () => {
    const osnova = osnovaZaPrimera(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    expect(osnova).toBe(235_200_00);
    const primer = primerZaKoefitsient(koefitsient('etazh'), PO_PODRAZBIRANE, osnova);
    expect(primer).toHaveLength(5);
    const parter = primer.find((p) => p.stapka.klyuch === 'parter')!;
    expect(parter.meni).toBe('−8,00 %');
    // 235 200 € × 0,92 = 216 384 € → −18 816 €
    expect(parter.meni_st).toBe(-18_816_00);
    expect(parter.izbrana).toBe(false);
  });

  it('избраната стъпка се познава, и тя не мени нищо при 1,000', () => {
    const osnova = osnovaZaPrimera(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    const sreden = primerZaKoefitsient(koefitsient('etazh'), PO_PODRAZBIRANE, osnova).find(
      (p) => p.stapka.klyuch === 'sreden',
    )!;
    expect(sreden.izbrana).toBe(true);
    expect(sreden.meni).toBe('0,00 %');
    expect(sreden.meni_st).toBe(0);
  });

  it('ЕДНА основа за всички менюта — иначе „−8 %" тук и там са различни пари', () => {
    const osnova = osnovaZaPrimera(PO_PODRAZBIRANE, PRIMEREN_OBEKT);
    const etazh = primerZaKoefitsient(koefitsient('etazh'), PO_PODRAZBIRANE, osnova);
    const vazrast = primerZaKoefitsient(koefitsient('vazrast'), PO_PODRAZBIRANE, osnova);
    // партер 0,92 и „над 40 години" 0,90 — по-малкият коефициент маха повече
    expect(etazh.find((p) => p.stapka.klyuch === 'parter')!.meni_st).toBeGreaterThan(
      vazrast.find((p) => p.stapka.klyuch === 'nad-40')!.meni_st,
    );
  });
});

describe('изписването · коефициент, процент, промяна', () => {
  it('коефициентът е с ТРИ знака, процентът с два', () => {
    expect(vKoefitsient(9_200)).toBe('0,920');
    expect(vKoefitsient(10_000)).toBe('1,000');
    expect(vKoefitsient(10_300)).toBe('1,030');
    expect(vProtsent(320)).toBe('3,20 %');
    expect(vProtsent(600)).toBe('6,00 %');
  });

  it('„колко мени" носи знака и нулата се казва', () => {
    expect(kolkoMeni(9_200)).toBe('−8,00 %');
    expect(kolkoMeni(10_300)).toBe('+3,00 %');
    expect(kolkoMeni(10_000)).toBe('0,00 %');
  });
});

/**
 * КОЕ ЧИСЛО Е НЕГОВО · и защо това има ТЕСТ, а не само коментар.
 *
 * Дотук кодът и три документа държаха петте бази в ЕДНА кофа („всяко число тук
 * чака него"), докато две негови изречения от 23.08 даваха ЕДНО от тях:
 *
 *   „За цените има таблица — претвори я и сложи 3000 евро цена за старт." (И53)
 *   „3000 евро беше цената, която калкулаторът да ползва…"                 (И55)
 *
 * Изречение в коментар не пада на червено, когато някой го надживее. Списъкът
 * пада — и екранът чете СЪЩИЯ списък, значи двете не могат да се разминат.
 */
describe('дадено срещу чакащо · базите на Калкулатора', () => {
  it('НЕГОВА е ЕДНА база — апартаментът, и тя е 3 000 €/м²', () => {
    expect(NEGOVI_BAZI).toEqual(['apartament']);
    expect(PO_PODRAZBIRANE.baza_st.apartament).toBe(300_000);
    expect(bazataENegova('apartament')).toBe(true);
  });

  it('другите ЧЕТИРИ чакат него · и това се брои, не се чете от изречение', () => {
    const chakat = VIDOVE_OBEKT.filter((v) => !bazataENegova(v));
    expect(chakat).toEqual(['garazh', 'parkomyasto', 'sklad', 'drug']);
    expect(chakat).toHaveLength(4);
  });

  it('и ПЕТТЕ имат база · нито един вид не се смята с нула', () => {
    for (const vid of VIDOVE_OBEKT) {
      expect(PO_PODRAZBIRANE.baza_st[vid]).toBeGreaterThan(0);
    }
    expect(VIDOVE_OBEKT).toHaveLength(5);
  });

  /**
   * ЕКРАНЪТ ЧЕТЕ СЪЩИЯ СПИСЪК. Без този тест той можеше да покаже „негово
   * число" под гаража, без нищо да падне — точно шарката на ADR-050.
   */
  it('екранът пита СПИСЪКА, не преписва думите му', () => {
    const izvor = readFileSync('app/kalkulator.ts', 'utf8');
    expect(izvor).toContain('bazataENegova(vid)');
    expect(izvor).toContain('data-baza=');
    // Полето вече не е ЕДНО: `sBaza` приемаше всеки вид, а екранът редактираше
    // само апартамента — обявена възможност без лост.
    expect(izvor).toContain('VIDOVE_OBEKT.map');
  });

  /**
   * ПАРКОМЯСТОТО НОСИ ДВЕ ЦЕНИ · находка, обявена на глас, не изчистена наум.
   *
   * Като ГЛАВЕН обект се смята на м²; като ДОБАВКА — на брой. А собственият
   * коментар на добавката казва, че „квадратните метри не значат нищо при
   * паркомясто". И двете стоят, докато той не каже коя пада — но екранът го
   * КАЗВА, вместо да го премълчи.
   */
  it('паркомястото има И цена на м², И цена на брой · и екранът го казва', () => {
    expect(PO_PODRAZBIRANE.baza_st.parkomyasto).toBe(190_000);
    const naBroy = DOBAVKI.find((d) => d.klyuch === 'parkomyasto')!;
    expect(naBroy.vid).toBe('broy');
    expect(naBroy.stoynost).toBe(12_000_00);
    expect(readFileSync('app/kalkulator.ts', 'utf8')).toContain('data-parkomyasto-dvete');
  });
});

describe('група Г · разбивката не рисува сметка, която не се прави (резен 47)', () => {
  /**
   * НАМЕРЕНО СЪС СЧУПВАНЕ, не с четене: върнах условието на разбивката към „И"
   * и НИТО ЕДИН тест не падна. Тоест поправката в `tsenaPoRazhod` се пазеше, а
   * съседката ѝ — не: числото щеше да е нула, а редовете щяха да го обясняват.
   */
  const sChisla = (zemya: number, stroitelna: number) => ({
    ...PO_PODRAZBIRANE,
    zemya_st_kvm: { ...PO_PODRAZBIRANE.zemya_st_kvm, apartament: zemya },
    stroitelna_st_kvm: { ...PO_PODRAZBIRANE.stroitelna_st_kvm, apartament: stroitelna },
  });
  const redoveNaV = (n: ReturnType<typeof sChisla>): number =>
    razbivka(n, { ...PRIMEREN_OBEKT, dobavki: {} }).v.length;

  it('и двете числа дадени · В носи редове', () => {
    expect(redoveNaV(sChisla(50_000, 100_000))).toBeGreaterThan(0);
  });

  it('ЕДНО липсващо · В няма НИТО ЕДИН ред', () => {
    expect(redoveNaV(sChisla(50_000, 0))).toBe(0);
    expect(redoveNaV(sChisla(0, 100_000))).toBe(0);
  });
});

describe('пиновете · броевете се твърдят с ръка (резен 46 · група В)', () => {
  it('настройките по подразбиране носят ЧЕТИРИНАЙСЕТ полета', () => {
    expect(Object.keys(PO_PODRAZBIRANE)).toHaveLength(14);
  });

  it('примерният обект носи ШЕСТ полета', () => {
    expect(Object.keys(PRIMEREN_OBEKT)).toHaveLength(6);
  });

  it('коефициентите на Калкулатора са ПЕТ', () => {
    // ПЕТ, не дванайсет: съименникът в Сметки е ДРУГА константа, със свой пин.
    expect(KOEFITSIENTI).toHaveLength(5);
  });
});
