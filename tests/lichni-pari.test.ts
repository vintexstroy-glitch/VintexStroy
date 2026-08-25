/**
 * ЛИЧНИТЕ ПАРИ · приход, разход и КРЕДИТ по теми (И96 т.10 · ADR-038).
 *
 * Петте обещания, които се пазят тук:
 *   1. Личен запис НЕ влиза в служебния Журнал — вратарят хвърля.
 *   2. Главницата НЕ е разход; разходът по вноска е лихвата и таксата.
 *   3. Остатъкът по кредита се СМЯТА и сторното го поправя само.
 *   4. Изключеният ред преживява повторния внос — той е решение на човек.
 *   5. Лихвата се смята с ЦЕЛИ центове, и вторият независим път дава същото.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { NASTAVKA_LICHEN } from '../src/domein/akaunt.js';
import { VID } from '../src/domein/sabitiya.js';
import {
  BAZISNI_ZA_MESETS,
  GreshkaLichniPari,
  lihvaZaMesetsa,
  napraviTema,
  obshtoPari,
  ostatakNaKredita,
  pogasenLiE,
  predlaganiTemi,
  predlozhiVnoska,
  prihodnaChast,
  razhodnaChast,
  sborovePoTemi,
  temiPoGrupi,
  type LichnoDvizhenie,
} from '../src/domein/lichni-pari.js';
import { sumiZaObhvat } from '../src/domein/otcheti.js';
import { SHA } from './pomoshtni.js';

const IMEYL = 'ivo@example.bg';
const LICHEN = `${IMEYL}${NASTAVKA_LICHEN}`;
const SLUZHEBEN = 'firma.bg';
const MYASTO = 'MasterBook/Лично';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const zaKlyuch = (naematel: string) =>
    new Deystviya({
      vrata,
      dnevnik,
      naematel,
      actor: IMEYL,
      chasovnik: () => new Date(Date.UTC(2026, 7, 25, 12, tik++)).toISOString(),
    });
  return { dnevnik, vrata, zaKlyuch };
}

/** Личното, вече пуснато — мястото е задължително от И99. */
async function sLichno() {
  const { zaKlyuch, dnevnik } = stend();
  const lichni = zaKlyuch(LICHEN);
  await lichni.prevklyuchiLichno(
    { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
    { opId: 'l1' },
  );
  return { lichni, sluzhebni: zaKlyuch(SLUZHEBEN), dnevnik };
}

const DVIZHENIE = (n: Partial<Parameters<Deystviya['zapishiLichnoDvizhenie']>[0]> = {}) => ({
  dvizhenieId: 'd1',
  data: '2026-07-10',
  posoka: 'razhod' as const,
  suma_st: 35_00,
  temaId: 't1',
  koy: 'ЛИДЛ',
  opis: 'храна',
  dokument: '',
  klyuch: '',
  izvor: '',
  ...n,
});

describe('темите · менюто, което ОПИСВА', () => {
  it('подравнява името, но НЕ пипа главните букви', () => {
    expect(napraviTema({ temaId: 't1', ime: '  Кола   и  гориво ' }).ime).toBe('Кола и гориво');
    // „Кола" и „кола" може да са различни неща — регистърът е част от името
    expect(napraviTema({ temaId: 't1', ime: 'кола' }).ime).toBe('кола');
  });

  it('иска име и го КАЗВА', () => {
    expect(() => napraviTema({ temaId: 't1', ime: '   ' })).toThrow(/иска име/);
  });

  it('СПРЯНАТА не се предлага, но не изчезва', () => {
    const temi = [
      napraviTema({ temaId: 't1', ime: 'Храна' }),
      napraviTema({ temaId: 't2', ime: 'Гориво · старо', spryana: true }),
    ];
    expect(predlaganiTemi(temi).map((t) => t.temaId)).toEqual(['t1']);
    // но си стои в списъка, който ѝ е подаден — редовете с нея се четат
    expect(temi).toHaveLength(2);
  });

  it('групите се подреждат, а „Без група" пада НАКРАЯ', () => {
    const temi = [
      napraviTema({ temaId: 't1', ime: 'Ток', grupa: 'Дом' }),
      napraviTema({ temaId: 't2', ime: 'Кафе' }),
      napraviTema({ temaId: 't3', ime: 'Бензин', grupa: 'Кола' }),
    ];
    expect(temiPoGrupi(temi).map((g) => g.grupa)).toEqual(['Дом', 'Кола', 'Без група']);
  });
});

describe('вратарят · личното не влиза в служебния Журнал', () => {
  it('и четирите действия ХВЪРЛЯТ от служебен ключ', async () => {
    const { sluzhebni } = await sLichno();
    await expect(
      sluzhebni.zapishiLichnaTema({ temaId: 't1', ime: 'Развод', grupa: '', spryana: false }, { opId: 'a' }),
    ).rejects.toThrow(GreshkaLichniPari);
    await expect(sluzhebni.zapishiLichnoDvizhenie(DVIZHENIE(), { opId: 'b' })).rejects.toThrow(
      GreshkaLichniPari,
    );
    await expect(
      sluzhebni.izklyuchiLichenRed({ dvizhenieId: 'd1', izklyuchen: true, prichina: 'върнати' }, { opId: 'c' }),
    ).rejects.toThrow(GreshkaLichniPari);
    await expect(
      sluzhebni.zapishiLichenKredit(
        {
          kreditId: 'k1', ime: 'Ипотека', vid: 'ipoteka', ostatak_st: 100_000_00,
          ot: '2026-07-01', lihva_bp: 345, vnoska_st: 612_34, den: 5, temaId: 't1',
        },
        { opId: 'd' },
      ),
    ).rejects.toThrow(GreshkaLichniPari);
  });

  it('и НИТО ЕДНО лично събитие не е попаднало в служебния', async () => {
    const { lichni, dnevnik } = await sLichno();
    await lichni.zapishiLichnaTema({ temaId: 't1', ime: 'Храна', grupa: '', spryana: false }, { opId: 't' });
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE(), { opId: 'd' });
    expect(await dnevnik.chetiVsichki(SLUZHEBEN)).toHaveLength(0);
    expect((await dnevnik.chetiVsichki(LICHEN)).length).toBeGreaterThan(0);
  });
});

describe('движението · сумата е положителна, посоката е поле', () => {
  it('отказва нула и отрицателно · знакът НЕ е в цифрата', async () => {
    const { lichni } = await sLichno();
    await expect(lichni.zapishiLichnoDvizhenie(DVIZHENIE({ suma_st: 0 }), { opId: 'a' })).rejects.toThrow(
      /повече от нула/,
    );
    await expect(
      lichni.zapishiLichnoDvizhenie(DVIZHENIE({ suma_st: -35_00 }), { opId: 'b' }),
    ).rejects.toThrow(/повече от нула/);
  });

  it('поправката е СЪЩОТО действие върху същия номер, не втори ред', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE({ suma_st: 35_00 }), { opId: 'a' });
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE({ suma_st: 38_50, opis: 'храна · поправено' }), {
      opId: 'b',
    });
    const o = await lichni.ogledalo();
    expect(o.lichniDvizheniya.size).toBe(1);
    expect(o.lichniDvizheniya.get('d1')?.suma_st).toBe(38_50);
  });

  it('СТОРНИРАНОТО движение НЕ се възкресява от собствената си поправка', async () => {
    // Същата дупка като при делото (ADR-036 §9) — и същото лечение.
    const { lichni } = await sLichno();
    const r = await lichni.zapishiLichnoDvizhenie(DVIZHENIE(), { opId: 'a' });
    await lichni.storniraj(
      'LDV:d1',
      { pogasyavaSeq: r.seq, prichina: 'сгрешен ред' },
      { opId: 'st' },
      VID.lichnoDvizhenie,
    );
    // поправка СЛЕД сторното — не бива да го върне
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE({ suma_st: 99_00 }), { opId: 'b' });
    const o = await lichni.ogledalo();
    expect(o.lichniDvizheniya.has('d1')).toBe(false);
  });
});

describe('изключеният ред · решение на ЧОВЕК (правило 23)', () => {
  it('иска причина, когато изключва', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE(), { opId: 'a' });
    await expect(
      lichni.izklyuchiLichenRed({ dvizhenieId: 'd1', izklyuchen: true, prichina: '  ' }, { opId: 'b' }),
    ).rejects.toThrow(/ПРИЧИНА/);
  });

  it('ПРЕЖИВЯВА повторния внос · иначе човешкото решение изчезва мълчаливо', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE(), { opId: 'a' });
    await lichni.izklyuchiLichenRed(
      { dvizhenieId: 'd1', izklyuchen: true, prichina: 'върнати пари' },
      { opId: 'b' },
    );
    // вторият внос пренаписва реда от файла — и НЕ бива да отмени изключването
    await lichni.zapishiLichnoDvizhenie(DVIZHENIE({ opis: 'храна · от втория файл' }), { opId: 'c' });
    const d = (await lichni.ogledalo()).lichniDvizheniya.get('d1');
    expect(d?.izklyuchen).toBe(true);
    expect(d?.prichina).toBe('върнати пари');
    expect(d?.opis).toBe('храна · от втория файл');
  });

  it('изключване на НЕСЪЩЕСТВУВАЩ ред не създава ред от нищото', async () => {
    const { lichni } = await sLichno();
    await lichni.izklyuchiLichenRed(
      { dvizhenieId: 'няма-такъв', izklyuchen: true, prichina: 'х' },
      { opId: 'a' },
    );
    expect((await lichni.ogledalo()).lichniDvizheniya.size).toBe(0);
  });

  it('изключеният НЕ влиза в сборовете, но се БРОИ', () => {
    const dvizheniya: LichnoDvizhenie[] = [
      red({ dvizhenieId: 'a', suma_st: 10_00 }),
      red({ dvizhenieId: 'b', suma_st: 25_00, izklyuchen: true, prichina: 'върнати' }),
    ];
    const o = obshtoPari(dvizheniya);
    expect(o.razhod_st).toBe(10_00);
    expect(o.izklyucheni).toBe(1);
  });
});

describe('кредитът · главницата НЕ е разход', () => {
  it('разходът по вноска е ЛИХВАТА и таксата, не цялата вноска', () => {
    const vnoska = red({
      suma_st: 612_34,
      kreditId: 'k1',
      glavnitsa_st: 324_84,
      lihva_st: 285_00,
      taksa_st: 2_50,
    });
    // 324,84 + 285,00 + 2,50 = 612,34 · разход е само 287,50
    expect(razhodnaChast(vnoska)).toBe(287_50);
    expect(vnoska.suma_st - razhodnaChast(vnoska)).toBe(324_84);
  });

  it('обикновеният разход влиза ЦЕЛИЯТ', () => {
    expect(razhodnaChast(red({ suma_st: 35_00 }))).toBe(35_00);
    expect(prihodnaChast(red({ suma_st: 35_00, posoka: 'prihod' }))).toBe(35_00);
    expect(razhodnaChast(red({ suma_st: 35_00, posoka: 'prihod' }))).toBe(0);
  });

  it('трите части ТРЯБВА да събират вноската', async () => {
    const { lichni } = await sLichno();
    await expect(
      lichni.zapishiLichnoDvizhenie(
        DVIZHENIE({
          suma_st: 612_34,
          kreditId: 'k1',
          glavnitsa_st: 324_84,
          lihva_st: 285_00,
          taksa_st: 0, // липсва 2,50
        }),
        { opId: 'a' },
      ),
    ).rejects.toThrow(/не събират вноската/);
  });

  it('трите числа без кредит се отказват · те нямат самостоятелен смисъл', async () => {
    const { lichni } = await sLichno();
    await expect(
      lichni.zapishiLichnoDvizhenie(DVIZHENIE({ glavnitsa_st: 10_00 }), { opId: 'a' }),
    ).rejects.toThrow(/САМО при вноска по кредит/);
  });

  it('остатъкът се СМЯТА · и сторното на вноска го поправя САМО', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichenKredit(
      {
        kreditId: 'k1', ime: 'Ипотека · Пощенска', vid: 'ipoteka', ostatak_st: 100_000_00,
        ot: '2026-07-01', lihva_bp: 345, vnoska_st: 612_34, den: 5, temaId: 't1',
      },
      { opId: 'k' },
    );
    const vnoska = (id: string) =>
      DVIZHENIE({
        dvizhenieId: id, suma_st: 612_34, kreditId: 'k1',
        glavnitsa_st: 324_84, lihva_st: 285_00, taksa_st: 2_50,
      });
    await lichni.zapishiLichnoDvizhenie(vnoska('v1'), { opId: 'a' });
    const vtora = await lichni.zapishiLichnoDvizhenie(vnoska('v2'), { opId: 'b' });

    let o = await lichni.ogledalo();
    const k = o.lichniKrediti.get('k1')!;
    expect(ostatakNaKredita(k, o.lichniDvizheniya.values())).toBe(100_000_00 - 2 * 324_84);

    // сторно на втората вноска — остатъкът се връща БЕЗ нито един нов ред код
    await lichni.storniraj(
      'LDV:v2',
      { pogasyavaSeq: vtora.seq, prichina: 'сгрешена вноска' },
      { opId: 'st' },
      VID.lichnoDvizhenie,
    );
    o = await lichni.ogledalo();
    expect(ostatakNaKredita(k, o.lichniDvizheniya.values())).toBe(100_000_00 - 324_84);
    expect(pogasenLiE(k, o.lichniDvizheniya.values())).toBe(false);
  });

  it('лихвата в цели базисни пунктове се проверява С ДУМИ', async () => {
    const { lichni } = await sLichno();
    const kredit = (lihva_bp: number) => ({
      kreditId: 'k1', ime: 'Ипотека', vid: 'ipoteka' as const, ostatak_st: 100_00,
      ot: '2026-07-01', lihva_bp, vnoska_st: 10_00, den: 5, temaId: 't1',
    });
    await expect(lichni.zapishiLichenKredit(kredit(3.45), { opId: 'a' })).rejects.toThrow(/3,45 % се пише 345/);
    await expect(lichni.zapishiLichenKredit(kredit(-1), { opId: 'b' })).rejects.toThrow(/базисни/);
  });
});

/**
 * МАТЕМАТИКАТА · с ВТОРИ независим път (умението `matematika`).
 *
 * Един път проверява само че функцията прави каквото прави. Втори, сметнат по
 * друга формула, проверява че прави каквото ТРЯБВА.
 */
describe('лихвата за месеца · цели центове, никакъв float', () => {
  it('100 000 € при 3,45 % дават 287,50 € за месец · и по двата пътя', () => {
    const ostatak_st = 100_000_00;
    const lihva_bp = 345;
    // пътят на кода
    expect(lihvaZaMesetsa(ostatak_st, lihva_bp)).toBe(287_50);
    // ВТОРИ, независим път: 100 000 × 0,0345 ÷ 12 = 287,50
    const vtori = Math.round((100_000 * (345 / 10_000)) / 12 * 100);
    expect(lihvaZaMesetsa(ostatak_st, lihva_bp)).toBe(vtori);
  });

  it('знаменателят е 120 000 и това е ЕДНО число, не съвпадение', () => {
    // 100 % = 10 000 базисни пункта · 12 месеца → 10 000 × 12
    expect(BAZISNI_ZA_MESETS).toBe(10_000 * 12);
  });

  it('закръгля половинката НАГОРЕ, както навсякъде другаде', () => {
    // остатък 1,00 € при 6 000 б.п. (60 %) → 100 × 6000 / 120000 = 5 точно
    expect(lihvaZaMesetsa(1_00, 6_000)).toBe(5);
    // остатък 1,00 € при 600 б.п. (6 %) → 100 × 600 / 120000 = 0,5 → 1
    expect(lihvaZaMesetsa(1_00, 600)).toBe(1);
  });

  it('НАЙ-ЛОШИЯТ реален случай не прелива', () => {
    // 10 млн. € остатък при 50 % → 5 × 10¹², далеч под 2⁵³
    const golyam = lihvaZaMesetsa(10_000_000_00, 5_000);
    expect(Number.isSafeInteger(golyam)).toBe(true);
    expect(golyam).toBe(Math.round((10_000_000 * 0.5) / 12 * 100));
  });

  it('нулевата лихва е НОРМАЛНО число · безлихвен заем от роднина', () => {
    expect(lihvaZaMesetsa(5_000_00, 0)).toBe(0);
  });

  it('дробна лихва или дробен остатък се отказват С ДУМИ', () => {
    expect(() => lihvaZaMesetsa(100_00, 3.45)).toThrow(GreshkaLichniPari);
    expect(() => lihvaZaMesetsa(100.5, 345)).toThrow(GreshkaLichniPari);
  });
});

describe('предложението за вноска · агентът смята, човекът записва (правило 18)', () => {
  it('дели вноската на лихва и главница · и трите се събират', () => {
    const p = predlozhiVnoska(100_000_00, 345, 612_34);
    expect(p.lihva_st).toBe(287_50);
    expect(p.glavnitsa_st).toBe(612_34 - 287_50);
    expect(p.lihva_st + p.glavnitsa_st).toBe(612_34);
    expect(p.stiga).toBe(true);
  });

  it('когато вноската НЕ стига за лихвата, го КАЗВА, вместо да даде минус', () => {
    // при огромен остатък месечната лихва надхвърля вноската
    const p = predlozhiVnoska(1_000_000_00, 1_200, 100_00);
    expect(p.stiga).toBe(false);
    expect(p.glavnitsa_st).toBe(0);
    expect(p.lihva_st).toBe(100_00);
  });

  it('ПОСЛЕДНАТА вноска не надхвърля остатъка', () => {
    // остават 50 €, а вноската е 612,34 — главницата се реже до остатъка
    const p = predlozhiVnoska(50_00, 345, 612_34);
    expect(p.glavnitsa_st).toBe(50_00);
    expect(p.lihva_st + p.glavnitsa_st).toBe(612_34);
  });
});

describe('сборовете по теми · „кое къде отива"', () => {
  it('групира и подрежда по разход', () => {
    const temi = new Map([
      ['t1', napraviTema({ temaId: 't1', ime: 'Храна', grupa: 'Дом' })],
      ['t2', napraviTema({ temaId: 't2', ime: 'Кола' })],
    ]);
    const sbor = sborovePoTemi(
      [
        red({ dvizhenieId: 'a', temaId: 't1', suma_st: 35_00 }),
        red({ dvizhenieId: 'b', temaId: 't2', suma_st: 120_00 }),
        red({ dvizhenieId: 'c', temaId: 't1', suma_st: 15_00 }),
        red({ dvizhenieId: 'd', temaId: 't1', suma_st: 2_000_00, posoka: 'prihod' }),
      ],
      temi,
    );
    expect(sbor.map((s) => [s.ime, s.razhod_st, s.prihod_st, s.broy])).toEqual([
      ['Кола', 120_00, 0, 1],
      ['Храна', 50_00, 2_000_00, 3],
    ]);
  });

  it('редът БЕЗ тема се брои и се КАЗВА, не се крие', () => {
    const sbor = sborovePoTemi([red({ temaId: '', suma_st: 9_99 })], new Map());
    expect(sbor).toHaveLength(1);
    expect(sbor[0]?.ime).toBe('Без тема');
  });

  it('обхватът реже по дати', () => {
    const dvizheniya = [
      red({ dvizhenieId: 'a', data: '2026-06-30', suma_st: 10_00 }),
      red({ dvizhenieId: 'b', data: '2026-07-15', suma_st: 20_00 }),
    ];
    const sbor = sborovePoTemi(dvizheniya, new Map(), '2026-07-01', '2026-07-31');
    expect(sbor).toHaveLength(1);
    expect(sbor[0]?.razhod_st).toBe(20_00);
  });
});

describe('решетката на Ганта вече чете личните пари', () => {
  it('обобщеният ред светва · и вноската влиза с ЛИХВАТА си', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'd1', data: '2026-07-10', suma_st: 35_00 }),
      { opId: 'a' },
    );
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({
        dvizhenieId: 'd2', data: '2026-07-10', posoka: 'prihod', suma_st: 2_000_00,
      }),
      { opId: 'b' },
    );
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({
        dvizhenieId: 'd3', data: '2026-07-05', suma_st: 612_34, kreditId: 'k1',
        glavnitsa_st: 324_84, lihva_st: 285_00, taksa_st: 2_50,
      }),
      { opId: 'c' },
    );

    const o = await lichni.ogledalo();
    const dni = sumiZaObhvat(o, '2026-07-01', '2026-07-31');
    const sbor = dni.reduce(
      (s, d) => ({ prihod_st: s.prihod_st + d.prihod_st, razhod_st: s.razhod_st + d.razhod_st }),
      { prihod_st: 0, razhod_st: 0 },
    );
    expect(sbor.prihod_st).toBe(2_000_00);
    // 35,00 + 287,50 (лихва + такса), НЕ 35,00 + 612,34
    expect(sbor.razhod_st).toBe(35_00 + 287_50);
  });
});

/** Помощник · движение с подразбирания, за чистите функции. */
function red(n: Partial<LichnoDvizhenie> = {}): LichnoDvizhenie {
  return {
    dvizhenieId: 'd1',
    data: '2026-07-10',
    posoka: 'razhod',
    suma_st: 35_00,
    temaId: 't1',
    koy: 'ЛИДЛ',
    opis: '',
    dokument: '',
    klyuch: '',
    izvor: '',
    kreditId: '',
    glavnitsa_st: 0,
    lihva_st: 0,
    taksa_st: 0,
    izklyuchen: false,
    prichina: '',
    ...n,
  };
}
