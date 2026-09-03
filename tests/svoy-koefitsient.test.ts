/**
 * СВОЯТ КОЕФИЦИЕНТ · инвариантите на резен 54.
 *
 * Негово, 30.08: „Можеш да вкарваш сам коефициенти."
 */
import { describe, expect, it } from 'vitest';
import {
  DEYSTVIYA,
  formulata,
  GreshkaSvoyKoefitsient,
  IMENA_NA_DEYSTVIYATA,
  IMENA_NA_VELICHINITE,
  kogatoSeSmyata,
  MERKATA_NA_DEYSTVIETO,
  proveri,
  smetni,
  sveriSvoite,
  VELICHINI,
  type SvoyKoefitsient,
  PREDSTAVKA_SVOY,
  katoKoefitsient,
  smetniKatoKoefitsient,
} from '../src/domein/svoy-koefitsient.js';
import type { DanniZaPerioda } from '../src/domein/koefitsienti.js';
import { mesetsSChisla, stend } from './pomoshtni.js';

const DANNI: DanniZaPerioda = {
  prihod_st: 1_000_00,
  nachisleno_st: 1_200_00,
  razhod_st: 400_00,
  operativni_st: 300_00,
  krediti_st: 100_00,
  dds_za_vnasyane_st: 50_00,
  sredstva_st: 5_000_00,
  vzemaniya_st: 2_000_00,
  zadalzheniya_st: 4_000_00,
  obezpechenie_st: 10_000_00,
  zaeti: 3,
  vsichki_obekti: 4,
  dni: 31,
  mesetsi: 1,
  aktivi_st: 20_000_00,
  sobstven_kapital_st: 16_000_00,
  stoynost_st: 150_000_00,
};

function svoy(chast: Partial<SvoyKoefitsient> = {}): SvoyKoefitsient {
  return {
    klyuch: 'moy',
    ime: 'Моят',
    gore: 'sredstva_st',
    dolu: 'zadalzheniya_st',
    deystvie: 'delenie',
    kakvo: '',
    mahnat: false,
    ...chast,
  };
}

describe('рецептата · избор от списък, не свободен текст', () => {
  // ЗАЩО НЕ НИЗ: низ, който се смята, е път към Вратата през заден вход.
  it('величините са ДВАНАЙСЕТ и всяка носи ИМЕ за екрана', () => {
    expect(VELICHINI).toHaveLength(12);
    for (const v of VELICHINI) expect(IMENA_NA_VELICHINITE[v].length).toBeGreaterThan(3);
  });

  it('действията са ЧЕТИРИ и всяко носи име', () => {
    expect(DEYSTVIYA).toEqual(['delenie', 'razlika', 'sbor', 'dyal']);
    for (const d of DEYSTVIYA) expect(IMENA_NA_DEYSTVIYATA[d].length).toBeGreaterThan(5);
  });

  // МЯРКАТА НЕ СЕ ПИТА · тя следва от действието (правило 17).
  it('мярката следва от действието, не от човека', () => {
    expect(MERKATA_NA_DEYSTVIETO).toEqual({
      delenie: 'pati',
      razlika: 'pari',
      sbor: 'pari',
      dyal: 'protsent',
    });
  });

  it('формулата се чете на ЕДИН ред, с думи', () => {
    expect(formulata(svoy({ ime: 'Покритие' }))).toBe(
      'Покритие = средства ÷ текущи задължения',
    );
    expect(formulata(svoy({ ime: 'Дял', deystvie: 'dyal' }))).toContain('× 100');
    expect(formulata(svoy({ ime: 'Остатък', deystvie: 'razlika' }))).toContain('−');
  });
});

describe('времето се СМЯТА от величините, не се пита', () => {
  // ЗАЩО НЕ СЕ ПИТА: питането позволява „състояние", в което участва приходът —
  // число, което тихо зависи от прозорец, който никой не е избирал.
  it('два запаса дават СЪСТОЯНИЕ', () => {
    expect(kogatoSeSmyata({ gore: 'sredstva_st', dolu: 'zadalzheniya_st' })).toBe('sastoyanie');
  });

  it('един поток стига, за да стане ЗА ПЕРИОД · и от двете страни', () => {
    expect(kogatoSeSmyata({ gore: 'prihod_st', dolu: 'zadalzheniya_st' })).toBe('period');
    expect(kogatoSeSmyata({ gore: 'aktivi_st', dolu: 'razhod_st' })).toBe('period');
  });
});

describe('Вратата отказва · и отказът УЧИ', () => {
  it('без ключ и без име', () => {
    expect(() => proveri(svoy({ klyuch: '  ' }))).toThrow(GreshkaSvoyKoefitsient);
    expect(() => proveri(svoy({ ime: '' }))).toThrow(/не се чете от човек/);
  });

  it('величина извън списъка', () => {
    expect(() => proveri(svoy({ gore: 'измислена' as never }))).toThrow(/извън списъка/);
  });

  it('непознато действие', () => {
    expect(() => proveri(svoy({ deystvie: 'корен' as never }))).toThrow(/Непознато действие/);
  });

  // ЕДНА И СЪЩА ВЕЛИЧИНА ОТ ДВЕТЕ СТРАНИ дава 1,00× винаги — число, което
  // изглежда като отговор и не е ничий въпрос.
  it('една и съща величина от двете страни · и КАЗВА коя', () => {
    expect(() => proveri(svoy({ gore: 'prihod_st', dolu: 'prihod_st' }))).toThrow(
      /приход \(събрано\)/,
    );
  });

  it('а редовната рецепта минава', () => {
    expect(() => proveri(svoy())).not.toThrow();
  });
});

describe('сметката · цели числа и ЛИПСА вместо нула', () => {
  it('делението дава СТОТНИ от пъти', () => {
    expect(smetni(svoy(), DANNI).stoynost).toBe(125); // 5 000 ÷ 4 000 = 1,25×
  });

  it('дялът дава БАЗИСНИ ТОЧКИ', () => {
    expect(smetni(svoy({ deystvie: 'dyal' }), DANNI).stoynost).toBe(12_500); // 125,00 %
  });

  it('разликата и сборът са ПАРИ и може да са отрицателни', () => {
    expect(smetni(svoy({ deystvie: 'razlika' }), DANNI).stoynost).toBe(1_000_00);
    expect(smetni(svoy({ deystvie: 'sbor' }), DANNI).stoynost).toBe(9_000_00);
    expect(
      smetni(svoy({ gore: 'zadalzheniya_st', dolu: 'sredstva_st', deystvie: 'razlika' }), DANNI)
        .stoynost,
    ).toBe(-1_000_00);
  });

  // ДЕЛИТЕЛ НУЛА НЕ ДАВА НУЛА · тук е още по-важно: човекът сам е избрал
  // знаменателя и трябва да види, че е празен.
  it('нулев знаменател дава ЛИПСА и КАЗВА коя величина е нула', () => {
    const s = smetni(svoy(), { ...DANNI, zadalzheniya_st: 0 });
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).toContain('текущи задължения');
  });

  it('но разликата и сборът НЕ се плашат от нула · те не делят', () => {
    expect(smetni(svoy({ deystvie: 'razlika' }), { ...DANNI, zadalzheniya_st: 0 }).stoynost).toBe(
      5_000_00,
    );
  });

  // ЧИСЛАТА ТУК СЕ ДЕЛЯТ НЕТОЧНО, и това е нарочно. Дотук тестът ползваше
  // 5 000 ÷ 4 000 — деление БЕЗ остатък, тъй че махнеш ли `Math.round`, той пак
  // минаваше. Нарочното счупване го хвана: инвариант „цяло число", проверен
  // само върху точно деление, не проверява нищо.
  it('всяка стойност е ЦЯЛО число · и при деление С ОСТАТЪК', () => {
    const trudni: DanniZaPerioda = { ...DANNI, sredstva_st: 1_000_00, zadalzheniya_st: 3_000_00 };
    for (const d of DEYSTVIYA) {
      const s = smetni(svoy({ deystvie: d }), trudni);
      if (s.stoynost !== undefined) {
        expect(Number.isSafeInteger(s.stoynost), `${d} не е цяло`).toBe(true);
      }
    }
    // 100 000 ÷ 300 000 = 0,3333… → 33 стотни и 3 333 базисни точки, закръглени.
    expect(smetni(svoy(), trudni).stoynost).toBe(33);
    expect(smetni(svoy({ deystvie: 'dyal' }), trudni).stoynost).toBe(3_333);
  });
});

describe('през Вратата · записва се РЕЦЕПТАТА, не резултатът', () => {
  it('един запис влиза в Журнала и стига до Огледалото', async () => {
    const { deystviya } = stend();
    await mesetsSChisla(deystviya);
    await deystviya.zapishiKoefitsient(svoy({ kakvo: 'колко пъти покривам дълга' }), {
      opId: 'op-koef-1',
    });
    const o = await deystviya.ogledalo();
    expect(o.koefitsienti.get('moy')?.ime).toBe('Моят');
    expect(o.koefitsienti.get('moy')?.mahnat).toBe(false);
  });

  it('СЪЩИЯТ opId не ражда второ събитие · идемпотентност', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-koef-1' });
    const predi = (await deystviya.ogledalo()).koefitsienti.size;
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-koef-1' });
    expect((await deystviya.ogledalo()).koefitsienti.size).toBe(predi);
  });

  it('поправката е НОВ запис със същия ключ · последната дума бие', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-1' });
    await deystviya.zapishiKoefitsient(svoy({ ime: 'Преименуван' }), { opId: 'op-2' });
    const o = await deystviya.ogledalo();
    expect(o.koefitsienti.size).toBe(1);
    expect(o.koefitsienti.get('moy')?.ime).toBe('Преименуван');
  });

  // МАХАНЕТО Е ЗАПИС, НЕ ТРИЕНЕ (правило 1).
  it('махнатият ОСТАВА в Огледалото, с белега си', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-1' });
    await deystviya.zapishiKoefitsient(svoy({ mahnat: true }), { opId: 'op-2' });
    const o = await deystviya.ogledalo();
    expect(o.koefitsienti.get('moy')?.mahnat).toBe(true);
    expect(o.koefitsienti.size).toBe(1);
  });

  // АДРЕСЪТ В ЖУРНАЛА · Огледалото сгъва по КЛЮЧ и затова НЕ вижда, когато
  // адресът се раздвои. Нарочното счупване (`KOEF:<ключ>:<махнат>`) мина зелено
  // през всички тестове горе: описът на записа щеше да носи ДВЕ същности с едно
  // име — една жива и една махната. Затова адресът се проверява ПРЯКО.
  it('всички записи за един коефициент носят ЕДИН адрес · и при махане', async () => {
    const { deystviya, dnevnik } = stend();
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-1' });
    await deystviya.zapishiKoefitsient(svoy({ mahnat: true }), { opId: 'op-2' });
    await deystviya.zapishiKoefitsient(svoy({ ime: 'Върнат', mahnat: false }), { opId: 'op-3' });
    const sabitiya = await dnevnik.chetiVsichki('vintexstroy');
    const nashite = sabitiya.filter((x) => x.type === 'КоефициентЗаписан');
    expect(nashite).toHaveLength(3);
    // ПО СТОЙНОСТ, не по препратка: `sashtnost` е ОБЕКТ, и Set върху обекти
    // брои три различни при три еднакви адреса. Първото писане мереше точно
    // това — и щеше да мине зелено при СЧУПЕН адрес, ако не беше паднало сега.
    expect(new Set(nashite.map((x) => JSON.stringify(x.sashtnost))).size).toBe(1);
  });

  it('и се ВРЪЩА като СЪЩИЯ, не като нов', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiKoefitsient(svoy(), { opId: 'op-1' });
    await deystviya.zapishiKoefitsient(svoy({ mahnat: true }), { opId: 'op-2' });
    await deystviya.zapishiKoefitsient(svoy({ mahnat: false }), { opId: 'op-3' });
    const o = await deystviya.ogledalo();
    expect(o.koefitsienti.size).toBe(1);
    expect(o.koefitsienti.get('moy')?.mahnat).toBe(false);
  });

  // ПРОВЕРКАТА Е ПРИ ВРАТАТА, не на екрана: екранът е ЕДИН път до нея.
  it('Вратата отказва сбъркана рецепта, дошла отвсякъде', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiKoefitsient(svoy({ gore: 'prihod_st', dolu: 'prihod_st' }), {
        opId: 'op-losha',
      }),
    ).rejects.toThrow(GreshkaSvoyKoefitsient);
    expect((await deystviya.ogledalo()).koefitsienti.size).toBe(0);
  });
});

describe('сверката вход↔изход · и нулата се записва', () => {
  it('живите и махнатите се БРОЯТ поотделно · разлика нула', () => {
    const s = sveriSvoite([svoy(), svoy({ klyuch: 'b', mahnat: true }), svoy({ klyuch: 'v' })]);
    expect(s).toEqual({ vhod: 3, zhivi: 2, mahnati: 1, razlika: 0 });
  });

  it('празният вход също дава нула, а не липса', () => {
    expect(sveriSvoite([])).toEqual({ vhod: 0, zhivi: 0, mahnati: 0, razlika: 0 });
  });
});

describe('своят като един от всичките (И135 · ADR-162)', () => {
  const marzh = {
    klyuch: 'марж на кеша',
    ime: 'Марж на кеша',
    gore: 'prihod_st' as const,
    dolu: 'razhod_st' as const,
    deystvie: 'delenie' as const,
    kakvo: '',
    mahnat: false,
  };

  it('носи представка, за да не се сблъска с вграден ключ', () => {
    expect(katoKoefitsient(marzh).klyuch).toBe(`${PREDSTAVKA_SVOY}марж на кеша`);
    expect(PREDSTAVKA_SVOY).toBe('svoy:');
  });

  it('видът се СМЯТА от величините и действието · отношение на потоци', () => {
    const k = katoKoefitsient(marzh);
    expect(k.vid).toBe('otnoshenie-potoci');
    expect(k.kogato).toBe('period');
    expect(k.samoMesechen).toBe(false);
    expect(k.kakvo).toBe('свой коефициент');
    expect(k.formula).toContain('Марж на кеша');
  });

  it('разлика от два запаса е сума от запаси · снимка в един миг', () => {
    const k = katoKoefitsient({
      ...marzh,
      klyuch: 'чисти пари',
      ime: 'Чисти пари',
      gore: 'sredstva_st',
      dolu: 'zadalzheniya_st',
      deystvie: 'razlika',
    });
    expect(k.vid).toBe('suma-zapas');
    expect(k.kogato).toBe('sastoyanie');
  });

  it('смята се като вграден · параметрите са двете величини, поименно', () => {
    const d = { prihod_st: 200_00, razhod_st: 50_00 } as Parameters<typeof smetniKatoKoefitsient>[1];
    const s = smetniKatoKoefitsient(marzh, d);
    expect(s.koefitsient.klyuch).toBe('svoy:марж на кеша');
    expect(s.parametri.map((x) => x.stoynost)).toEqual([200_00, 50_00]);
    expect(s.parametri.every((x) => x.ime.length > 0)).toBe(true);
    // 200 ÷ 50 = 4,00 пъти → в стотни: 400.
    expect(s.stoynost).toBe(400);
    expect(s.zashto).toBe('');
  });

  it('делене на нула няма стойност и КАЗВА защо', () => {
    const d = { prihod_st: 200_00, razhod_st: 0 } as Parameters<typeof smetniKatoKoefitsient>[1];
    const s = smetniKatoKoefitsient(marzh, d);
    expect(s.stoynost).toBeUndefined();
    expect(s.zashto).not.toBe('');
  });
});
