/**
 * ОБЩАТА ГЛАВА НА СЕМЕЙСТВОТО · инвариантите на резен 62.
 *
 * Главите тук са НЕГОВИТЕ, дословно от „приходи · Винтекс Строй АД" — с
 * безименната колона, с интервала накрая на „цена смр " и с двете имена на
 * едно и също („АКТ 15 банка" ↔ „15 банка"). Измислена глава щеше да провери
 * измислен проблем.
 */
import { describe, expect, it } from 'vitest';
import {
  belegNaIme,
  GreshkaSemeystvo,
  obshtaGlava,
  proveriSemeystvo,
  redoveVObshtataGlava,
  sborNaObshtaKolona,
  sravniGlavi,
} from '../src/domein/obshta-glava.js';

const MALINOVA = [
  'апартамент', 'телефон', 'име', 'имейл', 'гараж', 'п. място', 'мазе', 'квадратура',
  // ТАКА я съхранява приложението: Вратата не пуска колона без име, а листът му
  // има такава (цената на кв.м). Плейсхолдърът идва от `imeNaBezimenna`.
  'Колона 9', 'цена', 'цена банка', 'цена смр ', 'ПД банка', 'ПД кеш', 'НС банка', 'НС кеш',
  'АКТ 15 банка', 'АКТ 16 банка ', 'проверка банка', 'проверка кеш',
];

const STUDENTSKI = [
  'апартамент', 'телефон', 'име', 'имейл', 'гараж', 'п. място', 'мазе', 'квадратура',
  'цена', 'цена банка', 'цена смр ', 'ПД банка', 'ПД кеш', 'НС банка', 'НС кеш',
  '15 кеш', '15 банка', 'АКТ 16 ', 'проверка банка', 'проверка кеш',
];

describe('белегът на името', () => {
  it('интервалът накрая не прави друга колона', () => {
    expect(belegNaIme('цена смр ')).toBe(belegNaIme('цена смр'));
    expect(belegNaIme('АКТ 16 банка ')).toBe(belegNaIme('акт 16 банка'));
  });

  it('вътрешните интервали се свиват, но думите остават', () => {
    expect(belegNaIme('п.  място')).toBe('п. място');
    expect(belegNaIme('ПД банка')).not.toBe(belegNaIme('НС банка'));
  });
});

describe('сравнението на двете му глави', () => {
  const s = sravniGlavi(MALINOVA, STUDENTSKI);

  it('еднаквите се хващат САМИ · включително през интервала накрая', () => {
    const imena = s.ednakvi.map((e) => e.ime);
    expect(imena).toContain('квадратура');
    expect(imena).toContain('цена смр ');
    expect(imena).toContain('НС кеш');
  });

  it('РАЗМЕСТВАНЕТО не пречи · „цена" е №9 тук и №8 там', () => {
    const tsena = s.ednakvi.find((e) => e.ime === 'цена');
    expect(tsena).toEqual({ ime: 'цена', a: '9', b: '8' });
  });

  it('безименната колона НЕ участва · тя няма име, по което да е нечия', () => {
    expect(s.samoA.map((k) => k.kolona)).not.toContain('8');
    expect(s.ednakvi.some((e) => e.a === '8')).toBe(false);
  });

  it('различните думи за едно и също остават НЕсвързани · машината не решава', () => {
    expect(s.samoA.map((k) => k.ime)).toEqual(['АКТ 15 банка', 'АКТ 16 банка ']);
    expect(s.samoB.map((k) => k.ime)).toEqual(['15 кеш', '15 банка', 'АКТ 16 ']);
  });

  it('но се ПРЕДЛАГАТ, с думите защо', () => {
    const kam = (ime: string): string[] =>
      s.predlozheni
        .filter((p) => s.samoA.find((k) => k.kolona === p.a)?.ime === ime)
        .map((p) => s.samoB.find((k) => k.kolona === p.b)?.ime ?? '');
    expect(kam('АКТ 15 банка')).toEqual(['15 банка']);
    expect(kam('АКТ 16 банка ')).toEqual(['АКТ 16 ']);
  });

  it('„ПД банка" и „НС банка" НЕ се предлагат една за друга · общата дума не стига', () => {
    const dvete = sravniGlavi(['ПД банка'], ['НС банка']);
    expect(dvete.predlozheni).toEqual([]);
  });

  it('сверката брои и двете страни · разлика НУЛА', () => {
    expect(s.sverka).toEqual({ a: 19, b: 20, ednakvi: 17, razlika: 0 });
  });
});

describe('общата глава', () => {
  const dvoyki = [
    { tablitsaA: 'Малинова', a: '16', tablitsaB: 'Студентски', b: '16' },
    { tablitsaA: 'Малинова', a: '17', tablitsaB: 'Студентски', b: '17' },
  ];
  const uchastnitsi = [
    { tablitsa: 'Малинова', glavi: MALINOVA },
    { tablitsa: 'Студентски', glavi: STUDENTSKI },
  ];
  const og = obshtaGlava(uchastnitsi, dvoyki);

  it('еднаквите по име се сливат САМИ, без нито една двойка', () => {
    const bez = obshtaGlava(uchastnitsi, []);
    // 20 + 20 колони с име, 17 общи по име → 23 в общата глава
    expect(bez.koloni.length).toBe(23);
  });

  it('потвърдените двойки свалят общата глава с още две', () => {
    expect(og.koloni.length).toBe(21);
  });

  it('и двете таблици сочат ЕДНА и съща обща колона за „цена"', () => {
    expect(og.kartata['Малинова']!['9']).toBe(og.kartata['Студентски']!['8']);
  });

  // КАРТАТА е по СВОИ номера, не по общи — първата ми проверка ги обърка и
  // питаше дали Малинова има колона №19 (тя има, „проверка кеш"). Питането е
  // обратното: сочи ли НЯКОЯ нейна колона към общата „15 кеш".
  it('колоната САМО на едната остава · „15 кеш" не пада', () => {
    expect(og.koloni).toContain('15 кеш');
    const obshta = String(og.koloni.indexOf('15 кеш'));
    expect(Object.values(og.kartata['Малинова'] ?? {})).not.toContain(obshta);
    expect(Object.values(og.kartata['Студентски'] ?? {})).toContain(obshta);
  });

  it('името в общата глава е ПЪРВОТО срещнато, дословно', () => {
    expect(og.koloni).toContain('АКТ 15 банка');
    expect(og.koloni).not.toContain('15 банка');
  });

  // НАХОДКА, платена от самите тестове: Вратата не пуска колона БЕЗ име, тъй че
  // безименната идва наименувана — „Колона 9". Ако това име свързваше, два
  // листа с плейсхолдър на едно и също място щяха да се слеят по ПОЗИЦИЯ,
  // облечена като по име: цената на кв.м на единия с цената на другия.
  it('ПЛЕЙСХОЛДЪРЪТ не свързва · „Колона 21" на двата листа са ДВЕ колони', () => {
    const dve = obshtaGlava(
      [
        { tablitsa: 'А', glavi: ['апартамент', 'Колона 21'] },
        { tablitsa: 'Б', glavi: ['апартамент', 'Колона 21'] },
      ],
      [],
    );
    expect(dve.koloni.length).toBe(3);
    expect(dve.kartata['А']!['1']).not.toBe(dve.kartata['Б']!['1']);
  });

  it('но човекът МОЖЕ да ги свърже · двойката е негова дума', () => {
    const dve = obshtaGlava(
      [
        { tablitsa: 'А', glavi: ['Колона 21'] },
        { tablitsa: 'Б', glavi: ['Колона 21'] },
      ],
      [{ tablitsaA: 'А', a: '0', tablitsaB: 'Б', b: '0' }],
    );
    expect(dve.koloni.length).toBe(1);
  });

  it('веригата се затваря · A↔B и B↔C правят ТРИ колони една', () => {
    const tri = obshtaGlava(
      [
        { tablitsa: 'А', glavi: ['х'] },
        { tablitsa: 'Б', glavi: ['у'] },
        { tablitsa: 'В', glavi: ['з'] },
      ],
      [
        { tablitsaA: 'А', a: '0', tablitsaB: 'Б', b: '0' },
        { tablitsaA: 'Б', a: '0', tablitsaB: 'В', b: '0' },
      ],
    );
    expect(tri.koloni).toEqual(['х']);
    expect(tri.kartata['В']!['0']).toBe('0');
  });

  it('сверката брои вход ↔ изход · всяка именувана колона е точно веднъж в картата', () => {
    expect(og.sverka).toEqual({ vhod: 40, izhod: 40, razlika: 0 });
  });
});

// ── ПАЗАЧЪТ ─────────────────────────────────────────────────────────────────
const GLAVITE = new Map<string, readonly string[]>([
  ['Малинова', MALINOVA],
  ['Студентски', STUDENTSKI],
]);

const ZDRAVO = {
  klyuch: 'Продажби',
  tablitsi: ['Малинова', 'Студентски'],
  koloni: ['апартамент', 'цена'],
  kartata: { 'Малинова': { '0': '0', '9': '1' }, 'Студентски': { '0': '0', '8': '1' } },
  mahnato: false,
};

describe('пазачът на Вратата', () => {
  it('здравото минава', () => {
    expect(() => proveriSemeystvo(ZDRAVO, GLAVITE)).not.toThrow();
  });

  it('семейство от ЕДНА таблица се отказва с думи', () => {
    expect(() =>
      proveriSemeystvo({ ...ZDRAVO, tablitsi: ['Малинова', 'Малинова'] }, GLAVITE),
    ).toThrow(GreshkaSemeystvo);
  });

  it('липсваща таблица се отказва', () => {
    expect(() =>
      proveriSemeystvo({ ...ZDRAVO, tablitsi: ['Малинова', 'Няма я'] }, GLAVITE),
    ).toThrow(/Няма я/);
  });

  it('колона, каквато таблицата НЯМА, се отказва', () => {
    expect(() =>
      proveriSemeystvo(
        { ...ZDRAVO, kartata: { ...ZDRAVO.kartata, 'Малинова': { '0': '0', '40': '1' } } },
        GLAVITE,
      ),
    ).toThrow(/няма колона №40/);
  });

  it('ДВЕ свои колони към ЕДНА обща се отказва · това би събрало две числа в едно', () => {
    expect(() =>
      proveriSemeystvo(
        { ...ZDRAVO, kartata: { ...ZDRAVO.kartata, 'Малинова': { '9': '1', '10': '1' } } },
        GLAVITE,
      ),
    ).toThrow(/ДВЕ свои колони/);
  });

  it('обща колона, която никоя таблица не дава, се отказва', () => {
    expect(() =>
      proveriSemeystvo({ ...ZDRAVO, koloni: ['апартамент', 'цена', 'измислена'] }, GLAVITE),
    ).toThrow(/измислена/);
  });

  it('празно име на семейството се отказва', () => {
    expect(() => proveriSemeystvo({ ...ZDRAVO, klyuch: '  ' }, GLAVITE)).toThrow(/име/);
  });

  it('РАЗПУСКАНЕТО минава и с изчезнала таблица · то тъкмо казва „не важи"', () => {
    expect(() =>
      proveriSemeystvo({ ...ZDRAVO, tablitsi: ['Няма я'], mahnato: true }, GLAVITE),
    ).not.toThrow();
  });
});

// ── ЧЕТЕНЕТО ────────────────────────────────────────────────────────────────
interface RedZaProba {
  readonly pari_st: Readonly<Record<string, number>>;
  readonly chisla: Readonly<Record<string, number>>;
  readonly tekst: Readonly<Record<string, string>>;
  readonly mahnat: boolean;
}

const REDOVE = new Map<string, ReadonlyMap<string, RedZaProba>>([
  [
    'Малинова',
    new Map([
      ['ап. 3', { pari_st: { '9': 14_780_000, '10': 6_000_000 }, chisla: {}, tekst: { '0': 'ап. 3' }, mahnat: false }],
      ['ап. 4', { pari_st: { '9': 5_630_000 }, chisla: {}, tekst: { '0': 'ап. 4' }, mahnat: false }],
      ['махнат', { pari_st: { '9': 9_999_999 }, chisla: {}, tekst: {}, mahnat: true }],
    ]),
  ],
  [
    'Студентски',
    new Map([
      ['офис 1', { pari_st: { '8': 5_600_000, '15': 509_655 }, chisla: {}, tekst: { '0': 'офис 1' }, mahnat: false }],
    ]),
  ],
]);

describe('редовете на цялото семейство през ЕДНА глава', () => {
  const sem = {
    tablitsi: ['Малинова', 'Студентски'],
    kartata: { 'Малинова': { '0': '0', '9': '1', '10': '2' }, 'Студентски': { '0': '0', '8': '1' } },
  };
  const ch = redoveVObshtataGlava(sem, REDOVE);

  it('редовете от двете таблици идват заедно · и всеки казва от коя е', () => {
    expect(ch.redove.map((r) => `${r.tablitsa}·${r.red}`)).toEqual([
      'Малинова·ап. 3',
      'Малинова·ап. 4',
      'Студентски·офис 1',
    ]);
  });

  it('МАХНАТИЯТ не влиза', () => {
    expect(ch.redove.some((r) => r.red === 'махнат')).toBe(false);
  });

  it('„цена" от двете таблици застава в ЕДНА обща колона', () => {
    expect(ch.redove.map((r) => r.pari_st['1'])).toEqual([14_780_000, 5_630_000, 5_600_000]);
  });

  it('и сборът ѝ събира едно и също нещо', () => {
    expect(sborNaObshtaKolona(ch.redove, '1')).toBe(26_010_000);
  });

  it('клетка БЕЗ дом в общата глава се пропуска и се БРОИ', () => {
    expect(ch.sverka.bezDom).toBe(1);
  });

  it('сверката вход ↔ изход излиза на НУЛА', () => {
    expect(ch.sverka).toEqual({ vhod: 3, izhod: 3, razlika: 0, bezDom: 1 });
  });
});

// ── ПРЕЗ ВРАТАТА · целият път до Журнала и обратно ──────────────────────────
import { fold } from '../src/ogledalo/ogledalo.js';
import { stend } from './pomoshtni.js';
import type { PayloadTablitsaOtFaylSazdadena } from '../src/domein/sabitiya.js';

function glava(klyuch: string, glavi: readonly string[]): PayloadTablitsaOtFaylSazdadena {
  return {
    klyuch,
    otFayl: 'prihodi.xlsb',
    otpechatak: 'ab'.repeat(32),
    glavi: [...glavi],
    vidove: {},
    formuli: {},
    nekopirani: [],
  };
}

async function knigata() {
  const { deystviya, dnevnik } = stend();
  await deystviya.zapishiTablitsaOtFayl(glava('Малинова', MALINOVA), { opId: 't-1' });
  await deystviya.zapishiTablitsaOtFayl(glava('Студентски', STUDENTSKI), { opId: 't-2' });
  const o = async () => fold(await dnevnik.chetiVsichki('vintexstroy'));
  return { deystviya, o };
}

describe('семейството през Вратата', () => {
  it('влиза в Журнала и се чете от Огледалото', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiSemeystvoGlavi(ZDRAVO, { opId: 's-1' });
    const sem = (await o()).semeystvataNaGlavite.get('Продажби');
    expect(sem?.tablitsi).toEqual(['Малинова', 'Студентски']);
    expect(sem?.koloni).toEqual(['апартамент', 'цена']);
  });

  it('вторият път със същия `opId` не прави ВТОРО семейство', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiSemeystvoGlavi(ZDRAVO, { opId: 's-1' });
    await deystviya.zapishiSemeystvoGlavi(ZDRAVO, { opId: 's-1' });
    expect((await o()).semeystvataNaGlavite.size).toBe(1);
  });

  it('поправката е НОВ запис със СЪЩИЯ ключ · последната дума бие', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiSemeystvoGlavi(ZDRAVO, { opId: 's-1' });
    await deystviya.zapishiSemeystvoGlavi(
      { ...ZDRAVO, koloni: ['апартамент'], kartata: { 'Малинова': { '0': '0' }, 'Студентски': { '0': '0' } } },
      { opId: 's-2' },
    );
    const og = await o();
    expect(og.semeystvataNaGlavite.size).toBe(1);
    expect(og.semeystvataNaGlavite.get('Продажби')?.koloni).toEqual(['апартамент']);
  });

  it('РАЗПУСНАТОТО остава в картата, с вдигнато знаме · не изчезва', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zapishiSemeystvoGlavi(ZDRAVO, { opId: 's-1' });
    await deystviya.zapishiSemeystvoGlavi({ ...ZDRAVO, mahnato: true }, { opId: 's-2' });
    const sem = (await o()).semeystvataNaGlavite.get('Продажби');
    expect(sem?.mahnato).toBe(true);
  });

  it('Вратата пита ОГЛЕДАЛОТО за главите · измислена колона не влиза', async () => {
    const { deystviya } = await knigata();
    await expect(
      deystviya.zapishiSemeystvoGlavi(
        { ...ZDRAVO, kartata: { ...ZDRAVO.kartata, 'Малинова': { '0': '0', '77': '1' } } },
        { opId: 's-1' },
      ),
    ).rejects.toThrow(/няма колона №77/);
  });

  it('таблица, която я НЯМА в Журнала, не става семейство', async () => {
    const { deystviya } = await knigata();
    await expect(
      deystviya.zapishiSemeystvoGlavi(
        { ...ZDRAVO, tablitsi: ['Малинова', 'Измислена'], kartata: { ...ZDRAVO.kartata, 'Измислена': { '0': '0' } } },
        { opId: 's-1' },
      ),
    ).rejects.toThrow(/Измислена/);
  });
});
