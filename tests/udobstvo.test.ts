/**
 * УДОБСТВОТО · сортиране, търсене и паметта на екрана (ADR-022).
 *
 * Три неща, които изглеждат дребни и се чупят тихо:
 *
 *   1. Сравнителят по вид: „10" след „9" в числова колона, „я" след „б" в
 *      текстова. Сгрешеният ред не гърми — изглежда развален и човек спира
 *      да вярва на таблицата.
 *   2. Търсенето реже по всички колони, без регистър, и цикълът на подредбата
 *      се прибира на изходния ред — не на „някакъв".
 *   3. Паметта на екрана НИКОГА не гърми: счупен JSON, липсващо хранилище,
 *      препълнено хранилище — всичко пада мълчаливо към подразбраното.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  filtriray,
  grupiraj,
  sboroveNaGrupata,
  smeniPodredba,
  sravnitel,
  tarsi,
  type KolonaSFiltar,
} from '../app/filtri.js';
import { chetiEkranno, zabraviEkranno, zapomniEkranno } from '../app/pamet-ekran.js';
import { klipbordniVkusove, smetniIzbora } from '../app/klaviatura.js';
import { klyuchNaChernova, umryalaLi } from '../app/chernova.js';
import { sDumiZaStornoto, vidOtAtribut } from '../app/storno.js';
import { bezPatechka } from '../app/skriti-koloni.js';
import { readdirSync, readFileSync } from 'node:fs';

// ── сравнителят по вид ─────────────────────────────────────────────────────
describe('сравнителят по вид (ADR-014)', () => {
  it('числата се подреждат като числа · 9 преди 10, 20 преди 100', () => {
    const s = sravnitel('chislo');
    expect([10, 9, 100, 20].sort(s)).toEqual([9, 10, 20, 100]);
  });

  it('евро — по стотинки, с отрицателните най-отпред', () => {
    const s = sravnitel('evro');
    expect([500_00, -120_00, 0, 1200_50].sort(s)).toEqual([-120_00, 0, 500_00, 1200_50]);
  });

  it('нечислото в числова колона пада НАКРАЯ, не разбърква средата', () => {
    const s = sravnitel('chislo');
    expect(['10', 'абв', '9'].sort(s)).toEqual(['9', '10', 'абв']);
  });

  it('текстът върви по българската азбука · „я" след „б"', () => {
    const s = sravnitel('tekst');
    expect(['Ябълка', 'Банка', 'ябълка', 'банка'].map(String).sort(s).map((x) => x.toLowerCase()))
      .toEqual(['банка', 'банка', 'ябълка', 'ябълка']);
  });

  it('датите са хронология · ISO текстът я носи сам', () => {
    const s = sravnitel('data');
    expect(['2026-03-01', '2025-12-31', '2026-01-15'].sort(s)).toEqual([
      '2025-12-31',
      '2026-01-15',
      '2026-03-01',
    ]);
  });
});

// ── търсенето и подредбата през filtriray ──────────────────────────────────
interface Red {
  koy: string;
  suma_st: number;
}

const KOLONI: KolonaSFiltar<Red>[] = [
  { klyuch: 'koy', ime: 'Кой', vid: 'tekst', vzemi: (r) => r.koy },
  { klyuch: 'suma', ime: 'Сума', vid: 'evro', vzemi: (r) => r.suma_st },
];

const REDOVE: Red[] = [
  { koy: 'СТРОЙПЛАСТ ЕООД', suma_st: 1200_00 },
  { koy: 'Домакинство', suma_st: 500_00 },
  { koy: 'Ток ЕАД', suma_st: 120_00 },
];

describe('търсенето в цялата таблица', () => {
  afterEach(() => tarsi('proba-t', ''));

  it('реже по всички колони, без регистър · „строй" намира „СТРОЙПЛАСТ"', () => {
    tarsi('proba-t', 'строй');
    const f = filtriray('proba-t', REDOVE, KOLONI, '2026-08-24');
    expect(f.redove.map((r) => r.koy)).toEqual(['СТРОЙПЛАСТ ЕООД']);
    expect(f.skriti).toBe(2); // скритото СЕ КАЗВА, не се премълчава
  });

  it('празното търсене връща всичко', () => {
    tarsi('proba-t', '  ');
    expect(filtriray('proba-t', REDOVE, KOLONI, '2026-08-24').skriti).toBe(0);
  });
});

describe('цикълът на подредбата', () => {
  it('нагоре → надолу → ИЗХОДНИЯТ ред, не някакъв', () => {
    const izhoden = REDOVE.map((r) => r.koy);

    smeniPodredba('proba-p', 'suma');
    let f = filtriray('proba-p', REDOVE, KOLONI, '2026-08-24');
    expect(f.redove.map((r) => r.suma_st)).toEqual([120_00, 500_00, 1200_00]);

    smeniPodredba('proba-p', 'suma');
    f = filtriray('proba-p', REDOVE, KOLONI, '2026-08-24');
    expect(f.redove.map((r) => r.suma_st)).toEqual([1200_00, 500_00, 120_00]);

    smeniPodredba('proba-p', 'suma');
    f = filtriray('proba-p', REDOVE, KOLONI, '2026-08-24');
    expect(f.redove.map((r) => r.koy)).toEqual(izhoden);
  });

  it('смяната на колоната почва отначало, нагоре', () => {
    smeniPodredba('proba-p2', 'suma');
    smeniPodredba('proba-p2', 'koy'); // друга колона → пак „нагоре"
    const f = filtriray('proba-p2', REDOVE, KOLONI, '2026-08-24');
    expect(f.redove[0]!.koy).toBe('Домакинство');
    smeniPodredba('proba-p2', 'koy');
    smeniPodredba('proba-p2', 'koy'); // прибиране
  });
});

// ── сметката на избора · статус-лентата (вълна 2) ──────────────────────────
describe('сметката на избора', () => {
  it('брои непразните; сборува САМО клетките, които казват, че са пари', () => {
    const s = smetniIzbora([
      { tekst: 'СТРОЙПЛАСТ ЕООД', st: null },
      { tekst: '1 200,00 €', st: 1200_00 },
      { tekst: '84 м²', st: null }, // площ — число е, пари НЕ е
      { tekst: '', st: null },
      { tekst: '500,00 €', st: 500_00 },
    ]);
    expect(s.broy).toBe(4); // празната клетка не се брои
    expect(s.broyPari).toBe(2);
    expect(s.sbor_st).toBe(1700_00);
    expect(s.sredno_st).toBe(850_00);
  });

  it('средното се закръгля до стотинка и НЕ влиза обратно в сбора', () => {
    const s = smetniIzbora([
      { tekst: 'а', st: 100 },
      { tekst: 'б', st: 100 },
      { tekst: 'в', st: 101 },
    ]);
    expect(s.sbor_st).toBe(301); // сборът е от точните стотинки
    expect(s.sredno_st).toBe(100); // 100,333… → 100 · само за показ
  });

  it('минусът се закръгля симетрично — дълговете нямат друга посока', () => {
    expect(smetniIzbora([
      { tekst: 'а', st: -1 },
      { tekst: 'б', st: -2 },
    ]).sredno_st).toBe(-2); // -1,5 → -2, огледално на +1,5 → +2
  });

  it('без нито една парична клетка сборът е нула и не се показва', () => {
    const s = smetniIzbora([{ tekst: 'текст', st: null }]);
    expect(s.broyPari).toBe(0);
    expect(s.sbor_st).toBe(0);
  });
});

// ── скриването на колона (вълна 1 · предложение 9, последното парче) ───────
describe('пътечките на решетката', () => {
  it('маха пътечка по номер, без да реже вътре в скобите', () => {
    expect(bezPatechka('minmax(0, 2fr) minmax(0, 1.6fr) 96px', 1)).toBe('minmax(0, 2fr) 96px');
    expect(bezPatechka('290.5px 232px 96px', 0)).toBe('232px 96px');
  });

  it('номер извън списъка не пипа нищо', () => {
    expect(bezPatechka('96px 120px', 5)).toBe('96px 120px');
  });
});

// ── групирането със сбор (вълна 2 · предложение 12) ────────────────────────
describe('групирането по колона', () => {
  interface RedNaem {
    imot: string;
    naem_st: number;
  }
  const KOL: KolonaSFiltar<RedNaem>[] = [
    { klyuch: 'imot', ime: 'Имот', vid: 'tekst', vzemi: (r) => r.imot },
    { klyuch: 'naem', ime: 'Наем', vid: 'evro', vzemi: (r) => r.naem_st },
  ];
  const NAEMI: RedNaem[] = [
    { imot: 'Малинова', naem_st: 500_00 },
    { imot: 'Дианабад', naem_st: 1200_00 },
    { imot: 'Малинова', naem_st: 300_00 },
  ];

  it('дели по стойност и пази реда ВЪТРЕ в групата', () => {
    const g = grupiraj(NAEMI, KOL[0]!, '2026-08-24');
    expect(g.map((x) => x.ime)).toEqual(['Дианабад', 'Малинова']); // българска азбука
    expect(g[1]!.redove.map((r) => r.naem_st)).toEqual([500_00, 300_00]); // както дойдоха
  });

  it('групата СУМИРА — само евро колоните, в цели стотинки', () => {
    const g = grupiraj(NAEMI, KOL[0]!, '2026-08-24');
    expect(sboroveNaGrupata(g[1]!.redove, KOL)).toEqual([{ ime: 'Наем', sbor_st: 800_00 }]);
    // текстовата колона не ражда сбор — няма какво да значи
    expect(sboroveNaGrupata(g[1]!.redove, [KOL[0]!])).toEqual([]);
  });

  it('празната стойност (напр. продаден обект) не влиза като нула по право', () => {
    const s = sboroveNaGrupata(
      [{ imot: 'х', naem_st: '' as unknown as number }, { imot: 'х', naem_st: 100 }],
      KOL,
    );
    expect(s[0]!.sbor_st).toBe(100);
  });

  it('евро колоната се групира по праговете на филтъра, в реда на праговете', () => {
    const g = grupiraj(NAEMI, KOL[1]!, '2026-08-24');
    expect(g.map((x) => x.ime)).toEqual(['100 – 500 €', '500 – 1000 €', '1000 – 5000 €']);
  });
});

// ── клипбордният мост навън (вълна 2 · предложение 8) ──────────────────────
describe('двата вкуса на клипборда', () => {
  it('TSV — таб между клетките, нов ред между редовете', () => {
    const { tsv } = klipbordniVkusove([
      ['СТРОЙПЛАСТ ЕООД', '1200,00'],
      ['Ток ЕАД', '120,00'],
    ]);
    expect(tsv).toBe('СТРОЙПЛАСТ ЕООД\t1200,00\nТок ЕАД\t120,00');
  });

  it('HTML — истинска таблица, а опасното в текста се екранира', () => {
    const { html } = klipbordniVkusove([['<b>не е удебелено</b>', '5,00']]);
    expect(html).toBe(
      '<table><tr><td>&lt;b&gt;не е удебелено&lt;/b&gt;</td><td>5,00</td></tr></table>',
    );
  });
});

// ── черновата и груповото сторно (вълна 2 · предложение 13) ────────────────
describe('черновата · кога е умряла', () => {
  it('подменена стойност на писано поле = умряла', () => {
    expect(umryalaLi({ adres: 'Витоша 12', edinitsa: 'ап. 3' }, { adres: '', edinitsa: '' })).toBe(
      true,
    );
  });

  it('същите стойности = жива, нищо за връщане', () => {
    expect(umryalaLi({ adres: 'Витоша 12' }, { adres: 'Витоша 12', drugo: 'х' })).toBe(false);
  });

  it('поле, което формата ВЕЧЕ НЯМА, не я убива — сменен е режимът, не текстът', () => {
    expect(umryalaLi({ prichina: 'сбъркан номер' }, { adres: 'Витоша 12' })).toBe(false);
  });
});

describe('ключът на черновата · формата ПЛЮС същността', () => {
  it('същият id с друга същност дава ДРУГ ключ — чернова за А не ляга у Б', () => {
    const a = klyuchNaChernova('forma-plashtane', { vzemane: 'VZ:2026-01:naem-1' });
    const b = klyuchNaChernova('forma-plashtane', { vzemane: 'VZ:2026-01:naem-2' });
    expect(a).not.toBe(b);
  });

  it('редът на атрибутите не сменя ключа', () => {
    expect(klyuchNaChernova('f', { b: '2', a: '1' })).toBe(klyuchNaChernova('f', { a: '1', b: '2' }));
  });
});

describe('белег → вид · единственият дом (правило 17)', () => {
  it('всеки data-storno* белег в екраните има вид — непознат белег изпада ТИХО', () => {
    const belezi = new Set<string>();
    for (const ime of readdirSync('app')) {
      if (!ime.endsWith('.ts')) continue;
      const kod = readFileSync(`app/${ime}`, 'utf-8');
      for (const m of kod.matchAll(/data-storno[a-z-]*/g)) belezi.add(m[0]);
    }
    expect(belezi.size).toBeGreaterThanOrEqual(5);
    for (const beleg of belezi) {
      // „сторно на избраните" е бутонът на действието, не белег на ред
      if (beleg === 'data-storno-izbrani') continue;
      expect(vidOtAtribut(beleg), `${beleg} няма вид в storno.ts`).not.toBeNull();
    }
  });
});

describe('думите на груповото сторно', () => {
  it('всички минали — казва се пълно', () => {
    expect(sDumiZaStornoto(2, 2, [])).toBe(
      'Сторнирани 2 от 2. Всички събития остават в Журнала.',
    );
  });

  it('отказаното се КАЗВА поименно, не се преглъща в брояча', () => {
    expect(sDumiZaStornoto(3, 2, ['seq 7: виси плащане'])).toBe(
      'Сторнирани 2 от 3. Отказани — seq 7: виси плащане',
    );
  });
});

// ── паметта на екрана · никога не гърми ────────────────────────────────────
describe('паметта на екрана', () => {
  const zapisi = new Map<string, string>();

  beforeEach(() => {
    zapisi.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => zapisi.get(k) ?? null,
      setItem: (k: string, v: string) => void zapisi.set(k, v),
      removeItem: (k: string) => void zapisi.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('запомня и чете, с версиониран ключ', () => {
    zapomniEkranno('proba', { takt: 'mesets', broy: 3 });
    expect(zapisi.has('ui.v1.proba')).toBe(true);
    expect(chetiEkranno('proba', null)).toEqual({ takt: 'mesets', broy: 3 });
  });

  it('СЧУПЕН запис пада към подразбраното, не гърми', () => {
    zapisi.set('ui.v1.schupen', '{това не е JSON');
    expect(chetiEkranno('schupen', 'inache')).toBe('inache');
  });

  it('липсата е подразбраното, забравянето трие', () => {
    expect(chetiEkranno('nyama-go', 42)).toBe(42);
    zapomniEkranno('shte-padne', 1);
    zabraviEkranno('shte-padne');
    expect(chetiEkranno('shte-padne', 'prazno')).toBe('prazno');
  });

  it('хранилище, което ХВЪРЛЯ, не спира екрана', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('заключено');
      },
      setItem: () => {
        throw new Error('пълно');
      },
      removeItem: () => {
        throw new Error('заключено');
      },
    };
    expect(() => zapomniEkranno('x', 1)).not.toThrow();
    expect(chetiEkranno('x', 'zhivo')).toBe('zhivo');
    expect(() => zabraviEkranno('x')).not.toThrow();
  });
});
