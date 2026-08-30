/**
 * ПРОБЛЕМИТЕ ПРИ ВЪВЕЖДАНЕ · И96 т.1 · т.9.
 *
 * Пази шест неща:
 *   · осемте вида носят ЦВЯТ, ЗНАК и ДУМА — цветът сам не стига (далтонизъм);
 *   · чуждата азбука свети ЖЪЛТО и само предупреждава (негово изрично);
 *   · смесените азбуки в една дума СПИРАТ — правило 11, преместено на входа;
 *   · връщат се ВСИЧКИ находки, не първата;
 *   · силата се чете от НАСТРОЙКАТА, не от описа — бизнесът си я мени;
 *   · бележката на Стопанина БИЕ общото обяснение.
 */

import { describe, expect, it } from 'vitest';
import {
  AZBUKI,
  GreshkaVhod,
  IMENA_NA_AZBUKITE,
  OPISI,
  VIDOVE_PROBLEM,
  dumiZaNahodka,
  nastroykiPoPodrazbirane,
  opisNaProblem,
  pokazateliNaVhoda,
  proveriVhod,
  spira,
  type Kontekst,
  type NastroykiNaVhoda,
} from '../src/domein/vhodni-problemi.js';

const KIRILICA: Kontekst = { azbuka: 'kirilitsa' };

/**
 * „Стройпласт" с ЛАТИНСКО „o" · СГЛОБЕНО от кодова точка, не написано.
 *
 * Написана буквално, тази дума влиза в кода като смесено име и `imena.test.ts`
 * я хваща — пазачът на правило 11 не различава нарочна проба от истинска
 * грешка, и е прав да не различава. Сглобена, тя КАЗВА кой знак е чуждият,
 * вместо да го крие пред окото.
 */
const SMESENA = `Стр${String.fromCodePoint(0x6f)}йпласт`;
const N = nastroykiPoPodrazbirane();

/** Само ключовете на находките — по-четимо в очакванията. */
function vidove(tekst: string, k: Kontekst = KIRILICA, n: NastroykiNaVhoda = N): string[] {
  return proveriVhod(tekst, k, n).map((x) => x.vid);
}

describe('легендата · цветът намира, думата обяснява', () => {
  it('осемте вида са изброени поименно и всеки има опис', () => {
    expect(OPISI).toHaveLength(VIDOVE_PROBLEM.length);
    expect(OPISI.map((o) => o.vid)).toEqual([...VIDOVE_PROBLEM]);
  });

  it('всеки носи ЦВЯТ, ЗНАК и ДУМА · цветът сам не стига', () => {
    for (const o of OPISI) {
      expect(o.tsvyat, o.vid).not.toBe('');
      // Знакът е истинската разлика за онзи, който не различава цветове.
      expect(o.znak, o.vid).not.toBe('');
      expect(o.zashto.length, o.vid).toBeGreaterThan(20);
      expect(o.ime, o.vid).not.toBe('');
    }
  });

  it('различните видове имат различни ЗНАЦИ — цветовете може да се повтарят', () => {
    // Червеното стои на два вида (не е число · празно) и това е нарочно:
    // и двата спират по една и съща причина — записът не значи нищо.
    const znatsi = OPISI.map((o) => o.znak);
    expect(new Set(znatsi).size).toBeGreaterThanOrEqual(6);
  });

  it('измисленият вид се отказва С ДУМИ', () => {
    expect(() => opisNaProblem('nyama-takav' as never)).toThrow(GreshkaVhod);
  });

  it('двете азбуки са изброени и всяка има име', () => {
    expect([...AZBUKI]).toEqual(['kirilitsa', 'latinitsa']);
    for (const a of AZBUKI) expect(IMENA_NA_AZBUKITE[a]).not.toBe('');
  });
});

describe('чуждата азбука · ЖЪЛТО и само предупреждава (негово изрично)', () => {
  it('чиста кирилица минава', () => {
    expect(vidove('Стройпласт ЕООД')).toEqual([]);
  });

  it('английското минава ВИНАГИ — то е позволено до избраната азбука', () => {
    expect(vidove('Invoice 2026')).toEqual([]);
    expect(vidove('Цимент Portland')).toEqual([]);
  });

  it('гръцко и китайско светят', () => {
    expect(vidove('Σигма')).toContain('chuzhda-azbuka');
    expect(vidove('фирма 株式会社')).toContain('chuzhda-azbuka');
  });

  it('и цветът е ЖЪЛТ, а силата — предупреждава', () => {
    const o = opisNaProblem('chuzhda-azbuka');
    expect(o.tsvyat).toBe('zhalto');
    expect(o.sila).toBe('preduprezhdava');
    expect(spira(proveriVhod('Σигма', KIRILICA), N)).toBe(false);
  });

  it('при избрана ЛАТИНИЦА кирилицата става чужда', () => {
    expect(vidove('Строй', { azbuka: 'latinitsa' })).toContain('chuzhda-azbuka');
    expect(vidove('Stroy', { azbuka: 'latinitsa' })).toEqual([]);
  });

  it('цифри, паузи и препинателни знаци НЕ са чужда азбука', () => {
    expect(vidove('Фактура № 1042/2026 · 1 250,50 €')).toEqual([]);
  });
});

describe('смесените азбуки · правило 11, преместено на ВХОДА', () => {
  it('латинско „о" в кирилска дума СПИРА', () => {
    // Окото не вижда разликата между двете „о"; машината — да.
    const nahodki = proveriVhod(SMESENA, KIRILICA);
    expect(nahodki.map((x) => x.vid)).toContain('smeseni-azbuki');
    expect(spira(nahodki, N)).toBe(true);
  });

  it('и КАЗВА коя дума е', () => {
    const n = proveriVhod(`фирма ${SMESENA} ЕООД`, KIRILICA).find(
      (x) => x.vid === 'smeseni-azbuki',
    )!;
    expect(n.kade).toBe(SMESENA);
  });

  it('но две ОТДЕЛНИ думи на различни азбуки са позволени', () => {
    // „Цимент Portland" не смесва — всяка дума си е на своята азбука.
    expect(vidove('Цимент Portland')).toEqual([]);
  });
});

describe('невидимите знаци', () => {
  it('нулевата ширина се хваща и се казва КОЙ знак е', () => {
    const n = proveriVhod('Цимент​пясък', KIRILICA).find(
      (x) => x.vid === 'neviidim-znak',
    )!;
    expect(n.kade).toBe('U+200B');
  });

  it('и мекото тире също', () => {
    expect(vidove('Цимент­пясък')).toContain('neviidim-znak');
  });

  it('но обикновената пауза НЕ е невидим знак', () => {
    expect(vidove('Цимент пясък')).toEqual([]);
  });
});

describe('числото, обхватът, дубликатът, замразеното', () => {
  it('текст в числово поле СПИРА', () => {
    const n = proveriVhod('много', { ...KIRILICA, chislovo: true });
    expect(n.map((x) => x.vid)).toContain('ne-e-chislo');
    expect(spira(n, N)).toBe(true);
  });

  it('но истинско число минава · и с точка, и със запетая', () => {
    expect(vidove('1250,50', { ...KIRILICA, chislovo: true })).toEqual([]);
    expect(vidove('1250.50', { ...KIRILICA, chislovo: true })).toEqual([]);
    expect(vidove('-300', { ...KIRILICA, chislovo: true })).toEqual([]);
  });

  it('три дробни цифри НЕ са пари', () => {
    expect(vidove('12,345', { ...KIRILICA, chislovo: true })).toContain('ne-e-chislo');
  });

  it('изброените стойности са ЗАКОН', () => {
    const k = { ...KIRILICA, pozvoleni: ['0', '9', '20'] };
    expect(vidove('20', k)).toEqual([]);
    expect(vidove('21', k)).toContain('izvan-obhvat');
  });

  it('дубликатът само ПРЕДУПРЕЖДАВА — понякога е нарочно', () => {
    const n = proveriVhod('Ф-1042', { ...KIRILICA, veche: ['Ф-1042'] });
    expect(n.map((x) => x.vid)).toContain('dublikat');
    expect(spira(n, N)).toBe(false);
  });

  it('замразеният период СПИРА', () => {
    const n = proveriVhod('нещо', {
      ...KIRILICA,
      period: '2026-07',
      zamrazeni: ['2026-07'],
    });
    expect(n.map((x) => x.vid)).toContain('zamrazen-period');
    expect(spira(n, N)).toBe(true);
  });

  it('празното задължително поле спира и НЕ трупа други находки', () => {
    const n = proveriVhod('   ', { ...KIRILICA, zadalzhitelno: true, chislovo: true });
    expect(n.map((x) => x.vid)).toEqual(['prazno']);
  });
});

describe('ВСИЧКИ находки наведнъж, не първата', () => {
  it('едно поле може да свети с няколко цвята', () => {
    // Чужда азбука И невидим знак И дубликат — трите заедно.
    const n = proveriVhod('Σигма​', { ...KIRILICA, veche: ['Σигма​'] });
    const v = n.map((x) => x.vid);
    expect(v).toContain('neviidim-znak');
    expect(v).toContain('chuzhda-azbuka');
    expect(v).toContain('dublikat');
    expect(n.length).toBeGreaterThanOrEqual(3);
  });

  it('и показателите ги броят по сила', () => {
    const n = proveriVhod(`${SMESENA}${String.fromCodePoint(0x200b)}`, KIRILICA);
    const p = pokazateliNaVhoda(n, N);
    expect(p.vsichki).toBe(p.spirat + p.preduprezhdavat);
    expect(p.spirat).toBeGreaterThanOrEqual(1); // смесените спират
  });
});

describe('параметрите по бизнес · и бележката на Стопанина', () => {
  it('изключен вид изобщо не се проверява', () => {
    const bez: NastroykiNaVhoda = {
      ...N,
      'chuzhda-azbuka': { vklyuchen: false, sila: 'preduprezhdava', belezhka: '' },
    };
    expect(vidove('Σигма', KIRILICA, bez)).toEqual([]);
  });

  it('бизнесът може да направи чуждата азбука СПИРАЩА', () => {
    const strogo: NastroykiNaVhoda = {
      ...N,
      'chuzhda-azbuka': { vklyuchen: true, sila: 'spira', belezhka: '' },
    };
    const n = proveriVhod('Σигма', KIRILICA, strogo);
    expect(spira(n, N)).toBe(false); // по подразбиране не спира
    expect(spira(n, strogo)).toBe(true); // при него — спира
  });

  it('и обратното · дубликатът да спира, ако така му е редът', () => {
    const strogo: NastroykiNaVhoda = {
      ...N,
      dublikat: { vklyuchen: true, sila: 'spira', belezhka: '' },
    };
    expect(spira(proveriVhod('Ф-1', { ...KIRILICA, veche: ['Ф-1'] }), strogo)).toBe(true);
  });

  it('НЕГОВАТА бележка БИЕ общото обяснение', () => {
    const svoya: NastroykiNaVhoda = {
      ...N,
      'chuzhda-azbuka': {
        vklyuchen: true,
        sila: 'preduprezhdava',
        belezhka: 'При нас чужди имена се пишат на латиница, не на оригинала.',
      },
    };
    const n = proveriVhod('Σигма', KIRILICA)[0]!;
    expect(dumiZaNahodka(n, svoya)).toBe(
      'При нас чужди имена се пишат на латиница, не на оригинала.',
    );
    // без бележка — общото обяснение
    expect(dumiZaNahodka(n, N)).toBe(opisNaProblem('chuzhda-azbuka').zashto);
  });

  it('по подразбиране всички са включени, със силата от занаята', () => {
    for (const o of OPISI) {
      expect(N[o.vid].vklyuchen, o.vid).toBe(true);
      expect(N[o.vid].sila, o.vid).toBe(o.sila);
      expect(N[o.vid].belezhka, o.vid).toBe('');
    }
  });
});

describe('пинът · броят се твърди с ръка (резен 46 · група В)', () => {
  it('видовете проблем са ОСЕМ', () => {
    expect(VIDOVE_PROBLEM).toHaveLength(8);
  });
});
