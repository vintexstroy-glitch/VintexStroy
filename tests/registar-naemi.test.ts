/**
 * РЕГИСТЪРЪТ НА НАЕМИТЕ · отчитане и събиране (резен 13б · И43).
 *
 * ═══ КОЕ Е НЕГОВО И КОЕ Е МОЕ ═══
 *
 * Негова е поръчката: „Ти предложи най-модерната таблица… и предложи решения
 * като варианти" (И43 · 23.08). Негов е и ЦИКЪЛЪТ — „3 ★" (р76·[81]): старт ·
 * начисление · събиране; и месечният такт (И83).
 *
 * МОЕ е решението вариантите да са ТРИ ИЗГЛЕДА върху едни и същи редове, а не
 * три таблици. Причината се проверява точно тук, в най-важния тест долу:
 * **сборът на трите изгледа е ЕДИН И СЪЩ.** Три отделни таблици биха дали три
 * числа за едни и същи пари — и точно тогава той не би могъл да ги сравни.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dniZakasnenie,
  grupirano,
  IZGLEDI,
  registarZaMeseca,
  sboroveNaRegistara,
  stapkata,
  zhivoPrezMeseca,
  type RedNaRegistara,
} from '../src/domein/registar-naemi.js';
import type { Naem, Ogledalo, Vzemane } from '../src/ogledalo/ogledalo.js';

const naem = (n: Partial<Naem> & { id: string }): Naem => ({
  seq: 1,
  imotId: 'i1',
  naemetel: 'Наемател',
  telefon: '',
  imeyl: '',
  naem_st: 50_000,
  padezhDen: 5,
  ot: '2026-01-01',
  do: '',
  depozit_st: 0,
  sektor: 'naemi',
  prekraten: false,
  ...n,
});

const vzemane = (v: Partial<Vzemane> & { id: string; naemId: string }): Vzemane => ({
  seq: 1,
  period: '2026-08',
  osnovanie: 'наем',
  nachisleno_st: 50_000,
  pogaseno_st: 0,
  ostatak_st: 50_000,
  padezh: '2026-08-05',
  sastoyanie: 'отворено',
  ...v,
});

/** Огледало само с онова, което регистърът чете — нищо повече. */
const ogledalo = (naemi: Naem[], vzemaniya: Vzemane[]): Ogledalo =>
  ({
    naemi: new Map(naemi.map((n) => [n.id, n])),
    vzemaniya: new Map(vzemaniya.map((v) => [v.id, v])),
    plashtaniya: new Map(),
    imoti: new Map([['i1', { adres: 'Боряна 41', edinitsa: 'ап. 17' }]]),
  }) as unknown as Ogledalo;

describe('трите стъпки · СМЯТАТ се, не се записват', () => {
  it('без начисление месецът не е започнал', () => {
    expect(stapkata(0, 0)).toBe('nezapochnat');
  });

  it('начислено и нищо платено · чака', () => {
    expect(stapkata(50_000, 50_000)).toBe('nachislen');
  });

  it('част платена · частично', () => {
    expect(stapkata(50_000, 20_000)).toBe('chastichno');
  });

  it('нула остатък · събран', () => {
    expect(stapkata(50_000, 0)).toBe('sabran');
  });

  /**
   * НАДПЛАТЕНОТО Е СЪБРАНО, не отделна стъпка. Отрицателният остатък значи, че
   * човекът е дал повече — това е въпрос на връщане, не на събиране, и не бива
   * да свети като дълг.
   */
  it('надплатеното също е събрано, не четвърто състояние', () => {
    expect(stapkata(50_000, -1_000)).toBe('sabran');
  });
});

describe('закъснението · само върху НЕПЛАТЕНОТО', () => {
  it('минал падеж с остатък дава дните', () => {
    expect(dniZakasnenie('2026-08-05', 50_000, '2026-08-15')).toBe(10);
  });

  it('но платеното НЕ свети занапред', () => {
    expect(dniZakasnenie('2026-08-05', 0, '2026-08-15')).toBe(0);
  });

  it('и бъдещият падеж не е закъснение', () => {
    expect(dniZakasnenie('2026-08-25', 50_000, '2026-08-15')).toBe(0);
  });

  it('липсващ падеж не измисля дни', () => {
    expect(dniZakasnenie('', 50_000, '2026-08-15')).toBe(0);
  });
});

describe('кое наемане е живо през месеца', () => {
  it('започналото по-късно не влиза в по-ранен месец', () => {
    expect(zhivoPrezMeseca(naem({ id: 'n1', ot: '2026-09-01' }), '2026-08')).toBe(false);
  });

  /**
   * ПРЕКРАТЕНОТО НЕ ИЗЧЕЗВА ОТ МИНАЛОТО. То е носило наем тогава; регистърът за
   * юли трябва да го показва, дори наемането да е прекратено през август.
   * Затова се гледат датите, не отметката.
   */
  it('прекратеното ПРЕЗ август още е живо за юли', () => {
    const n = naem({ id: 'n1', prekraten: true, kraj: '2026-08-20' });
    expect(zhivoPrezMeseca(n, '2026-07')).toBe(true);
    expect(zhivoPrezMeseca(n, '2026-09')).toBe(false);
  });
});

describe('регистърът за един месец', () => {
  const o = ogledalo(
    [
      naem({ id: 'n1', naemetel: 'Николай Петков' }),
      naem({ id: 'n2', naemetel: 'Ивайло Петков', naem_st: 30_000 }),
    ],
    [vzemane({ id: 'v1', naemId: 'n1', pogaseno_st: 20_000, ostatak_st: 30_000 })],
  );

  it('всяко живо наемане получава ред', () => {
    expect(registarZaMeseca(o, '2026-08', '2026-08-15')).toHaveLength(2);
  });

  /**
   * ЛИПСВАЩОТО НАЧИСЛЕНИЕ Е НАХОДКА, не празнина. Наемане без вземане за
   * месеца пак стои на екрана — инак пропуснатото начисление изчезва точно
   * когато трябва да се види.
   */
  it('наемане БЕЗ вземане пак стои · с думата „няма начисление"', () => {
    const bez = registarZaMeseca(o, '2026-08', '2026-08-15').find((r) => r.naemId === 'n2')!;
    expect(bez.stapka).toBe('nezapochnat');
    expect(bez.nachisleno_st).toBe(0);
  });

  it('и просрочените стоят ПЪРВИ · най-дългото закъснение отгоре', () => {
    expect(registarZaMeseca(o, '2026-08', '2026-08-15')[0]!.naemId).toBe('n1');
  });

  it('редът носи адреса на имота, не голия му ключ', () => {
    expect(registarZaMeseca(o, '2026-08', '2026-08-15')[0]!.imot).toContain('Боряна 41');
  });
});

describe('трите изгледа · НАЙ-ВАЖНАТА проверка', () => {
  const redove: readonly RedNaRegistara[] = [
    ...registarZaMeseca(
      ogledalo(
        [
          naem({ id: 'n1', naemetel: 'Николай', imotId: 'i1' }),
          naem({ id: 'n2', naemetel: 'Ивайло', imotId: 'i1' }),
        ],
        [
          vzemane({ id: 'v1', naemId: 'n1', pogaseno_st: 20_000, ostatak_st: 30_000 }),
          vzemane({ id: 'v2', naemId: 'n2', pogaseno_st: 50_000, ostatak_st: 0 }),
        ],
      ),
      '2026-08',
      '2026-08-15',
    ),
  ];

  /**
   * СВЕРКА ВХОД↔ИЗХОД (правило 7), приложена към изгледите.
   *
   * Ако трите изгледа дадат три различни числа за едни и същи пари, вариантът
   * престава да е избор и става три отделни истини. Това е ЕДИНСТВЕНАТА
   * причина изгледите да са групировки, а не отделни таблици — и тя се брои
   * тук, не се обещава в коментар.
   */
  it('сборът на ВСЕКИ изглед е един и същ · разликата е нула', () => {
    const tselniyat = sboroveNaRegistara(redove);
    for (const izgled of IZGLEDI) {
      const grupi = grupirano(redove, izgled);
      const sbor = grupi.reduce((s, g) => s + g.sborove.ostatak_st, 0);
      expect(sbor, izgled).toBe(tselniyat.ostatak_st);
      const broy = grupi.reduce((s, g) => s + g.sborove.redove, 0);
      expect(broy, izgled).toBe(tselniyat.redove);
    }
  });

  it('но БРОЯТ на групите се различава · инак изгледът не носи нищо', () => {
    expect(grupirano(redove, 'naemateli')).toHaveLength(2);
    expect(grupirano(redove, 'imoti')).toHaveLength(1);
  });

  it('по наемател най-дължащият стои ПЪРВИ', () => {
    expect(grupirano(redove, 'naemateli')[0]!.ime).toBe('Николай');
  });

  it('и трите изгледа са назовани · нито един не е само ключ', () => {
    expect(IZGLEDI).toHaveLength(3);
    expect(new Set(IZGLEDI).size).toBe(3);
  });
});

describe('регистърът НЕ пише', () => {
  it('нито едно повикване към Вратата или Действията', () => {
    const izvor = readFileSync('src/domein/registar-naemi.ts', 'utf8');
    expect(izvor).not.toContain('deystviya');
    expect(izvor).not.toContain('vrata');
    expect(izvor).not.toContain('pusni');
  });
});
