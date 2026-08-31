/**
 * КОГА се смята един коефициент · инвариантите на резен 51.
 *
 * Негово, 30.08: „Показваш всички коефициенти и без графика, по всяко време,
 * които са налични и не са за период. Тези за период седят и чакат да вкараш
 * период и да покаже избрания резултат."
 *
 * Всеки инвариант тук е бил СЧУПЕН нарочно, преди да влезе.
 */
import { describe, expect, it } from 'vitest';
import { otcheti } from '../src/domein/otcheti.js';
import { mesetsSChisla, stend } from './pomoshtni.js';
import {
  danniZaPerioda,
  IMENA_NA_REZULTATA,
  KAKVO_POKAZVA,
  KOEFITSIENTI,
  KOGATO,
  VIDOVE_REZULTAT,
  poVreme,
  smetniKoefitsient,
  type DanniZaPerioda,
} from '../src/domein/koefitsienti.js';

/** Данни, в които ВСИЧКО е различно от нула · за да се види кое мърда. */
const PALNI: DanniZaPerioda = {
  prihod_st: 1_000_00,
  nachisleno_st: 1_200_00,
  razhod_st: 400_00,
  operativni_st: 300_00,
  krediti_st: 100_00,
  dds_za_vnasyane_st: 50_00,
  sredstva_st: 5_000_00,
  vzemaniya_st: 2_000_00,
  zadalzheniya_st: 3_000_00,
  obezpechenie_st: 10_000_00,
  zaeti: 3,
  vsichki_obekti: 4,
  dni: 31,
  mesetsi: 1,
  aktivi_st: 20_000_00,
  sobstven_kapital_st: 17_000_00,
  stoynost_st: 150_000_00,
};

/** Полетата, които зависят от ПРОЗОРЕЦА на периода · и само те. */
const POTOTSI = [
  'prihod_st',
  'nachisleno_st',
  'razhod_st',
  'operativni_st',
  'krediti_st',
  'dds_za_vnasyane_st',
  'dni',
  'mesetsi',
] as const;

describe('първото падащо меню · как да видиш резултата', () => {
  it('трите вида са ДОСЛОВНО неговите думи, в неговия ред', () => {
    expect(VIDOVE_REZULTAT.map((v) => IMENA_NA_REZULTATA[v])).toEqual([
      'Таблица',
      'Графика',
      'Диаграма',
    ]);
  });

  it('и всеки казва какво показва · надпис без изречение е гол избор', () => {
    for (const v of VIDOVE_REZULTAT) expect(KAKVO_POKAZVA[v].length).toBeGreaterThan(20);
  });

  // ВИДЪТ РЕЗУЛТАТ НЕ Е ВИД ДИАГРАМА. Слети, те щяха да дадат меню, в което
  // „таблица" стои до „точки" — два въпроса, отговорени с един избор.
  it('видовете резултат са ТРИ, а не четирите вида диаграма', () => {
    expect(VIDOVE_REZULTAT).toHaveLength(3);
    expect(VIDOVE_REZULTAT).not.toContain('tochki');
  });
});

describe('второто падащо меню · коефициентите и тяхното време', () => {
  it('всеки коефициент знае КОГА се смята · няма трето състояние', () => {
    for (const k of KOEFITSIENTI) expect(KOGATO).toContain(k.kogato);
  });

  it('двете времена покриват ВСИЧКИ · нито един не пада между тях', () => {
    expect(poVreme('sastoyanie').length + poVreme('period').length).toBe(KOEFITSIENTI.length);
  });

  it('и двете НЕ са празни · празното време значи изгубено меню', () => {
    expect(poVreme('sastoyanie').length).toBeGreaterThan(0);
    expect(poVreme('period').length).toBeGreaterThan(0);
  });

  it('заетостта, ликвидността и LTV са СЪСТОЯНИЕ', () => {
    const klyuchove = poVreme('sastoyanie').map((k) => k.klyuch);
    expect(klyuchove).toContain('zaetost');
    expect(klyuchove).toContain('likvidnost');
    expect(klyuchove).toContain('ltv');
  });

  it('маржът, NOI и събираемостта са ЗА ПЕРИОД', () => {
    const klyuchove = poVreme('period').map((k) => k.klyuch);
    expect(klyuchove).toContain('marzh');
    expect(klyuchove).toContain('noi');
    expect(klyuchove).toContain('sabiraemost');
  });
});

describe('състоянието НЕ зависи от прозореца · доказано, не твърдяно', () => {
  // ТОВА Е ИНВАРИАНТЪТ, който държи `danniKamDnes` честна. Ако утре някой сложи
  // сред състоянията коефициент, който чете приход, числото тихо ще зависи от
  // ден, който никой не е избирал. Тестът го хваща, вместо човекът.
  // ТРИ ТОЧКИ, НЕ ДВЕ · и това е поправка на самия инвариант. Дотук тук стояха
  // две: пълните данни и данните с УМНОЖЕНИ потоци. Нарочното счупване
  // („заетостта връща 1, ако приходът е над нула") мина ЗЕЛЕНО през тях, защото
  // и в двете приходът беше над нула — тоест тестът ловеше само коефициент,
  // който се МЕНИ с прозореца, а не такъв, който изобщо го ЧЕТЕ. Нулевата точка
  // го лови: тя разделя „има поток" от „няма".
  const sPototsi = (mnozhi: number): DanniZaPerioda => {
    const iz = { ...PALNI } as Record<string, number>;
    for (const pole of POTOTSI) iz[pole] = (PALNI[pole] as number) * mnozhi;
    // Дните и месеците НЕ стават нула — делене на нула е друга повреда, не тази.
    if (mnozhi === 0) {
      iz['dni'] = 1;
      iz['mesetsi'] = 1;
    }
    return iz as unknown as DanniZaPerioda;
  };

  it('нито един коефициент на състоянието не ЧЕТЕ поток · три точки, не две', () => {
    for (const k of poVreme('sastoyanie')) {
      const [a, b, c] = [sPototsi(1), sPototsi(7), sPototsi(0)].map(
        (d) => smetniKoefitsient(k, d).stoynost,
      );
      expect(b, `${k.klyuch} се смени с умножен поток`).toBe(a);
      expect(c, `${k.klyuch} се смени при НУЛЕВ поток`).toBe(a);
    }
  });

  it('а поне един за период МЪРДА · иначе тестът горе не доказва нищо', () => {
    const mrudnali = poVreme('period').filter(
      (k) => smetniKoefitsient(k, sPototsi(7)).stoynost !== smetniKoefitsient(k, PALNI).stoynost,
    );
    expect(mrudnali.length).toBeGreaterThan(0);
  });
});

describe('активите имат ЕДИН дом · Отчетите и коефициентите четат едно число', () => {
  // ЗАЩО ТОЗИ ТЕСТ. Нарочното счупване смени `aktivi_st` в `danniZaPerioda` на
  // „само салдата" и мина ЗЕЛЕНО: нито един тест не сверяваше двете места, а
  // данните в другите тестове са ЛИТЕРАЛ, не построени от Огледало. Тоест
  // правило 17 стоеше в коментар, а не в машина — и точно това правилото
  // забранява. Сега двете числа се сравняват върху ИСТИНСКИ Журнал.
  it('една и съща стойност идва от Отчетите и от данните за коефициентите', async () => {
    const { deystviya } = stend();
    await mesetsSChisla(deystviya);
    const o = await deystviya.ogledalo();

    const vanshni = { stoynostNaSastoyanie_st: 250_000_00 };
    const otRaportite = otcheti(o, '2026-08', '2026-08-31T00:00:00.000Z', vanshni).sverka;
    const otDannite = danniZaPerioda(o, '2026-08-01', '2026-08-31', vanshni);

    expect(otDannite.aktivi_st).toBe(otRaportite.aktivi_st);
    expect(otDannite.sobstven_kapital_st).toBe(
      otRaportite.aktivi_st - otRaportite.zadalzheniya_st,
    );
  });

  it('и стойността на състоянието стига до данните, вместо да остане нула', async () => {
    const { deystviya } = stend();
    await mesetsSChisla(deystviya);
    const o = await deystviya.ogledalo();

    const bez = danniZaPerioda(o, '2026-08-01', '2026-08-31');
    const sas = danniZaPerioda(o, '2026-08-01', '2026-08-31', {
      stoynostNaSastoyanie_st: 250_000_00,
    });
    expect(sas.aktivi_st - bez.aktivi_st).toBe(250_000_00);
    expect(bez.stoynost_st).toBe(0);
    expect(sas.stoynost_st).toBe(250_000_00);
  });
});

describe('седемте нови · формулите на занаята', () => {
  it('задлъжнялостта е задължения ÷ активи, в базисни точки', () => {
    const s = smetniKoefitsient(KOEFITSIENTI.find((k) => k.klyuch === 'zadlazhnyalost')!, PALNI);
    expect(s.stoynost).toBe(1_500); // 3 000 ÷ 20 000 = 15,00 %
  });

  // И ДВЕТЕ СА ПРОЦЕНТ · нарочното счупване смени мярката на „пъти", а сборът
  // остана 10 000, защото сметката връща базисни точки при всяка мярка. Тоест
  // сборът доказваше аритметиката, не ЧЕТЕНЕТО: екранът щеше да пише „1,50
  // пъти" вместо „15,00 %". Мярката се заковава отделно.
  it('дялът на собствения капитал допълва задлъжнялостта до сто · и двете в ПРОЦЕНТ', () => {
    const kz = KOEFITSIENTI.find((k) => k.klyuch === 'zadlazhnyalost')!;
    const kd = KOEFITSIENTI.find((k) => k.klyuch === 'dyal-na-kapitala')!;
    expect([kz.merka, kd.merka]).toEqual(['protsent', 'protsent']);
    expect(smetniKoefitsient(kz, PALNI).stoynost! + smetniKoefitsient(kd, PALNI).stoynost!).toBe(
      10_000,
    );
  });

  it('работният капитал е ПАРИ и може да е отрицателен', () => {
    const k = KOEFITSIENTI.find((x) => x.klyuch === 'raboten-kapital')!;
    expect(k.merka).toBe('pari');
    expect(smetniKoefitsient(k, PALNI).stoynost).toBe(4_000_00);
    expect(
      smetniKoefitsient(k, { ...PALNI, zadalzheniya_st: 90_000_00 }).stoynost,
    ).toBe(-83_000_00);
  });

  // ОТРИЦАТЕЛЕН СОБСТВЕН КАПИТАЛ НЕ ДАВА ОТРИЦАТЕЛНО ОТНОШЕНИЕ, а ЛИПСА:
  // „минус 0,80 пъти" изглежда като отговор и не е.
  it('дългът към собствен капитал КАЗВА, вместо да даде минус', () => {
    const k = KOEFITSIENTI.find((x) => x.klyuch === 'dalg-kam-kapital')!;
    const s = smetniKoefitsient(k, { ...PALNI, sobstven_kapital_st: -1 });
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain('отрицателен');
  });

  // НУЛА ТУК НЕ Е НУЛА, а „още не е смятана" (правило 15).
  it('доходността чака Калкулатора, вместо да покаже 0 %', () => {
    const k = KOEFITSIENTI.find((x) => x.klyuch === 'dohodnost')!;
    const s = smetniKoefitsient(k, { ...PALNI, stoynost_st: 0 });
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain('Калкулатор');
  });

  it('шестият вид „сума от запаси" НЕ се приравнява към година', () => {
    const k = KOEFITSIENTI.find((x) => x.klyuch === 'raboten-kapital')!;
    expect(k.vid).toBe('suma-zapas');
  });
});
