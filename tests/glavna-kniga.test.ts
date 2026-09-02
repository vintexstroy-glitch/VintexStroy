/**
 * ГЛАВНАТА КНИГА · двустранните статии, изведени от Журнала (И96 т.11).
 *
 * Проучването по И92 нарече това „НАЙ-ГОЛЯМАТА ЛИПСА": Журналът е събитиен, а
 * SAF-T иска счетоводни статии. Тук се пази обещанието, което ги прави
 * счетоводни, а не купчина числа: **всяка статия има равни страни**, и цялата
 * книга затваря.
 *
 * Второто обещание е по-тихо, но е същото по цена: закръгленото не влиза в
 * сбор (правило 3). Основата се ВАДИ от общата, не се смята отделно — иначе
 * при 9% и при нечетни суми статията се разминава с един цент и файлът
 * пада при НАП без обяснение.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold, type Ogledalo } from '../src/ogledalo/ogledalo.js';
import { OTKRIVASHTO_SABITIE } from '../src/domein/stopanin.js';
import {
  glavnaKniga,
  GreshkaKniga,
  oboroti,
  proveriStatiya,
  smetka,
  smetkataNaParite,
  smetkataNaRazhoda,
  SMETKOPLAN,
  statiyaOtSpravka,
  type Statiya,
} from '../src/domein/glavna-kniga.js';
import { STAVKI } from '../src/domein/dds.js';
import { smetki } from '../src/domein/smetki.js';

const GLAVEN = 'vintexstroy@gmail.com';
const KOGATO = '2026-08-25T09:00:00.000Z';

async function knigata() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: SHA,
    parvoto: OTKRIVASHTO_SABITIE,
  });
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: GLAVEN,
    chasovnik: () => KOGATO,
  });
  await deystviya.zapishiStopanina(
    { imeyl: GLAVEN, ime: 'Иво', dostavchik: 'google' },
    { opId: 'op-0' },
  );
  const ogledalo = async (): Promise<Ogledalo> => fold(await dnevnik.chetiVsichki('vintexstroy'));
  return { dnevnik, vrata, deystviya, ogledalo };
}

/** Един месец с наем, плащане и разход — най-обикновеният случай. */
async function mesets() {
  const { vrata, deystviya, ogledalo } = await knigata();
  await deystviya.dobaviImot('imot-1', { adres: 'ул. Първа 1', edinitsa: 'А', ploshtad_kvsm: 60 }, { opId: 'op-i' });
  await deystviya.dobaviNaem(
    'naem-1',
    {
      imotId: 'imot-1',
      naemetel: 'ЕООД Наемател',
      telefon: '',
      imeyl: '',
      naem_st: 120000,
      padezhDen: 5,
      ot: '2026-01-01',
      do: '2026-12-31',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-n' },
  );
  await deystviya.nachisliVzemane(
    'vz-1',
    { naemId: 'naem-1', period: '2026-07', osnovanie: 'наем', suma_st: 120000, padezh: '2026-07-05' },
    { opId: 'op-v' },
  );
  await deystviya.priemiPlashtane(
    'pl-1',
    { vzemaneId: 'vz-1', suma_st: 120000, nachin: 'банка', data: '2026-07-08' },
    { opId: 'op-p' },
  );
  await deystviya.zapishiRazhod(
    'rz-1',
    {
      potok: 'fakturi',
      dostavchik: 'ЕООД Доставчик',
      opis: 'материали',
      suma_st: 24000,
      sektor: 'pokupki-materiali',
      nachin: 'банка',
      data: '2026-07-12',
      dokument: 'Ф-1',
    },
    { opId: 'op-r' },
  );
  return { vrata, deystviya, ogledalo };
}

describe('сметкопланът · законът на двустранните статии', () => {
  it('номерата са различни и всяка сметка носи име и вид', () => {
    const nomera = SMETKOPLAN.map((s) => s.nomer);
    expect(new Set(nomera).size).toBe(nomera.length);
    for (const s of SMETKOPLAN) {
      expect(s.ime.trim(), s.nomer).not.toBe('');
      expect(['aktiv', 'pasiv', 'prihod', 'razhod']).toContain(s.vid);
    }
  });

  it('непозната сметка ХВЪРЛЯ, а не пада тихо на нещо', () => {
    expect(() => smetka('999')).toThrow(GreshkaKniga);
  });

  // ПИНЪТ НА СМЕТКОПЛАНА · с ръка, не сверен сам със себе си.
  //
  // Дотук числото му се пазеше косвено от проверката за немапнатите сметки; тя
  // падна с мапинга към НАП (резен 53), и обход В веднага обяви `SMETKOPLAN` за
  // константа без нито един пин. Права беше: сметкопланът е ЗАКОН на книгата, а
  // не подробност на подаването — и остава да се пази, след като подаването го
  // няма.
  it('сметкопланът е ТРИНАЙСЕТ сметки, с двете страни на ДДС-то', () => {
    expect(SMETKOPLAN).toHaveLength(13);
    const nomera = SMETKOPLAN.map((s) => s.nomer);
    expect(nomera).toContain('4531');
    expect(nomera).toContain('4532');
    expect(new Set(nomera).size).toBe(SMETKOPLAN.length);
  });

  it('всеки сектор води до СЪЩЕСТВУВАЩА сметка · и непознатият също', () => {
    for (const sektor of ['pokupki-materiali', 'pokupki-uslugi', 'zaplati', 'krediti', 'нямагоняма']) {
      expect(() => smetka(smetkataNaRazhoda(sektor)), sektor).not.toThrow();
    }
  });

  it('в брой е касата, всичко друго е банката', () => {
    expect(smetkataNaParite('в брой')).toBe('501');
    expect(smetkataNaParite('банка')).toBe('503');
    expect(smetkataNaParite('карта')).toBe('503');
  });
});

describe('равенството на страните · онова, което прави статията счетоводна', () => {
  it('неуравновесена статия ХВЪРЛЯ', () => {
    const kriva: Statiya = {
      id: 'x',
      data: '2026-07-01',
      opis: 'крива',
      dnevnik: 'pari',
      kontragent: '',
      redove: [
        { smetka: '501', strana: 'debit', suma_st: 100, opis: '' },
        { smetka: '411', strana: 'kredit', suma_st: 99, opis: '' },
      ],
    };
    expect(() => proveriStatiya(kriva)).toThrow(/не се уравновесява/);
  });

  it('едностранна статия ХВЪРЛЯ · статията е ДВУстранна', () => {
    expect(() =>
      proveriStatiya({
        id: 'x',
        data: '2026-07-01',
        opis: '',
        dnevnik: 'pari',
        kontragent: '',
        redove: [{ smetka: '501', strana: 'debit', suma_st: 100, opis: '' }],
      }),
    ).toThrow(/под два реда/);
  });

  it('отрицателен ред ХВЪРЛЯ · знакът се носи от СТРАНАТА', () => {
    expect(() =>
      proveriStatiya({
        id: 'x',
        data: '2026-07-01',
        opis: '',
        dnevnik: 'pari',
        kontragent: '',
        redove: [
          { smetka: '501', strana: 'debit', suma_st: -100, opis: '' },
          { smetka: '411', strana: 'kredit', suma_st: -100, opis: '' },
        ],
      }),
    ).toThrow(/цели центове над нулата/);
  });
});

describe('книгата за един месец', () => {
  it('затваря · дебит = кредит, и сверката го записва', async () => {
    const { ogledalo } = await mesets();
    const k = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(k.debit_st).toBe(k.kredit_st);
    expect(k.nared).toBe(true);
    // Правило 7: разликата се записва И когато е нула.
    expect(k.sverki.length).toBeGreaterThan(0);
    expect(k.sverki.every((s) => s.nared)).toBe(true);
  });

  it('всяко живо събитие ражда СВОЯ статия · три източника, три статии', async () => {
    const { ogledalo } = await mesets();
    const k = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(k.statii.length).toBe(3);
    expect(k.statii.map((s) => s.dnevnik).sort()).toEqual(['pari', 'pokupki', 'prodazhbi']);
  });

  /**
   * СТОРНИРАНОТО ГО НЯМА. Това е цялата причина книгата да чете Огледалото, а
   * не суровите събития — и е точно начинът, по който НАП иска корекция: НОВ
   * заместващ файл, не кръпка върху стария.
   */
  it('сторнираното вземане не оставя статия', async () => {
    const { deystviya, ogledalo } = await mesets();
    const predi = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    const vzemane = (await ogledalo()).vzemaniya.get('vz-1')!;
    await deystviya.storniraj(
      'st-1',
      { pogasyavaSeq: vzemane.seq, prichina: 'сгрешен период' },
      { opId: 'op-storno' },
      'vzemane',
    );
    const sled = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(sled.statii.length).toBe(predi.statii.length - 1);
    expect(sled.nared).toBe(true);
  });

  it('празен месец дава празна, но ЗАТВАРЯЩА книга', async () => {
    const { ogledalo } = await mesets();
    const k = glavnaKniga(await ogledalo(), '2026-02', KOGATO);
    expect(k.statii.length).toBe(0);
    expect(k.nared).toBe(true);
    expect(k.sverki.length).toBeGreaterThan(0);
  });

  it('оборотите излизат само за пипнатите сметки', async () => {
    const { ogledalo } = await mesets();
    const ob = oboroti(glavnaKniga(await ogledalo(), '2026-07', KOGATO));
    const nomera = ob.map((r) => r.smetka.nomer);
    expect(nomera).toContain('411');
    expect(nomera).toContain('703');
    expect(nomera).not.toContain('604');
    const debit = ob.reduce((s, r) => s + r.debit_st, 0);
    const kredit = ob.reduce((s, r) => s + r.kredit_st, 0);
    expect(debit).toBe(kredit);
  });
});

describe('приключващата статия на ДДС', () => {
  it('дължим данък отива в 4539 „за внасяне"', () => {
    const s = statiyaOtSpravka('2026-07', 20000, 4000, '2026-08-14')!;
    const kredit4539 = s.redove.find((r) => r.smetka === '4539');
    expect(kredit4539?.strana).toBe('kredit');
    expect(kredit4539?.suma_st).toBe(16000);
  });

  it('надвнесен данък отива в 4538 „за възстановяване"', () => {
    const s = statiyaOtSpravka('2026-07', 4000, 20000, '2026-08-14')!;
    const debit4538 = s.redove.find((r) => r.smetka === '4538');
    expect(debit4538?.strana).toBe('debit');
    expect(debit4538?.suma_st).toBe(16000);
  });

  it('месец без нито едно ДДС-число НЕ ражда празна статия', () => {
    expect(statiyaOtSpravka('2026-07', 0, 0, '2026-08-14')).toBeUndefined();
  });

  /**
   * НАЙ-ОБИКНОВЕНИЯТ СЛУЧАЙ ЗА ЦЕЛЕВИЯ КЛИЕНТ · наемодател само с ЖИЛИЩНИ наеми.
   *
   * Там ставката е 0%, изходящият и входящият ДДС са нула, и приключваща статия
   * НЕ се ражда. Дотук сверката „източници ↔ статии" пак броеше справката и
   * обявяваше разлика от един запис — а одитният файл пишеше „Главната книга не
   * затваря" върху книга с равни дебит и кредит.
   *
   * Намерено от независим сверител, не от този тест — затова тестът го има сега.
   */
  it('справка БЕЗ ДДС не разминава броя · книгата пак затваря', async () => {
    const { deystviya, ogledalo } = await knigata();
    await deystviya.dobaviImot('imot-1', { adres: 'ул. Първа 1', edinitsa: 'А', ploshtad_kvsm: 60 }, { opId: 'op-i' });
    await deystviya.dobaviNaem(
      'naem-1',
      {
        imotId: 'imot-1',
        naemetel: 'Иван Наемател',
        telefon: '',
        imeyl: '',
        naem_st: 60000,
        padezhDen: 5,
        ot: '2026-01-01',
        do: '2026-12-31',
        depozit_st: 0,
        sektor: 'naem-zhilishten',
      },
      { opId: 'op-n' },
    );
    await deystviya.nachisliVzemane(
      'vz-1',
      { naemId: 'naem-1', period: '2026-07', osnovanie: 'наем', suma_st: 60000, padezh: '2026-07-05' },
      { opId: 'op-v' },
    );
    const predi = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(predi.nared).toBe(true);

    await deystviya.podaySpravka(
      { period: '2026-07', dds_deklarirano_st: 0, data: '2026-08-10', belezhka: '' },
      { opId: 'op-sp' },
    );
    const sled = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(sled.statii.length).toBe(predi.statii.length);
    expect(sled.debit_st).toBe(sled.kredit_st);
    expect(sled.nared, sled.sverki.filter((s) => !s.nared).map((s) => s.kakvo).join(' · ')).toBe(true);
  });

  it('подадена справка добавя приключващата статия в книгата', async () => {
    const { deystviya, ogledalo } = await mesets();
    await deystviya.podaySpravka(
      { period: '2026-07', dds_deklarirano_st: 16000, data: '2026-08-14', belezhka: '' },
      { opId: 'op-s' },
    );
    const k = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(k.statii.some((s) => s.dnevnik === 'dds')).toBe(true);
    expect(k.nared).toBe(true);
  });
});

/**
 * СТОТИНКАТА · най-скъпият тих дефект.
 *
 * Ако основата се смяташе отделно (обща ÷ (1+ставка)), при нечетни суми
 * основа + ДДС нямаше да дава общата и всяка такава статия щеше да виси с
 * един цент. Тук се минава през всяка ставка и през суми, избрани точно
 * да падат между центовете.
 */
describe('центът · всяка ставка, всяка неудобна сума', () => {
  it('статията затваря при всяка ставка и всяка от неудобните суми', async () => {
    const { deystviya, ogledalo } = await knigata();
    await deystviya.dobaviImot('imot-1', { adres: 'ул. Първа 1', edinitsa: 'А', ploshtad_kvsm: 60 }, { opId: 'op-i' });
    let i = 0;
    for (const stavka of STAVKI) {
      for (const suma of [1, 3, 7, 99, 101, 1234, 99999, 100001]) {
        i += 1;
        await deystviya.zapishiRazhod(
          `rz-${i}`,
          {
            potok: 'fakturi',
            dostavchik: 'ЕООД Доставчик',
            opis: `${stavka}% · ${suma}`,
            suma_st: suma,
            sektor: 'pokupki-uslugi',
            stavka,
            nachin: 'банка',
            data: '2026-07-12',
            dokument: `Ф-${i}`,
          },
          { opId: `op-r-${i}` },
        );
      }
    }
    const k = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(k.statii.length).toBe(i);
    expect(k.debit_st).toBe(k.kredit_st);
    expect(k.nared).toBe(true);
  });
});

/**
 * СЪРЦЕТО · нула не мести пари, и екранът не пада заради нея.
 *
 * Намерено чрез сверител: `platiDDS` НЯМА пазач за нула (Вратата иска цели
 * центове, а нулата е цяла). Записан нулев ДДС-превод правеше статия без
 * нито един ред; `proveriStatiya` хвърляше, хвърлянето минаваше нагоре през
 * `glavnaKniga` → `blokNaOditniyaFayl` → `narisuvaySmetki` — и ЦЕЛИЯТ екран
 * Сметки оставаше празен заради един запис за нула.
 *
 * Проекцията не бива да пада от онова, което вече стои в Журнала: там влиза и
 * прочетена таблица, и върнат архив, и стар запис. Затова тук се пази и двете —
 * че не хвърля, И че пропуснатото се БРОИ, вместо да се премълчи.
 */
describe('нулата · източник без движение', () => {
  /**
   * НУЛАТА ВЛИЗА ПОКРАЙ ДЕЙСТВИЕТО · нарочно.
   *
   * `platiDDS` вече я отказва (`proveriDvizhi`) — но проекцията не бива да
   * разчита на това. В Журнала влизат и прочетена таблица, и върнат архив, и
   * запис отпреди пазача; Вратата ги пуска, защото правило 3 иска ЦЕЛИ
   * центове, а нулата е цяла.
   *
   * Затова тук се пише направо през Вратата: така тестът пази ПРОЕКЦИЯТА, а не
   * повтаря проверката на действието.
   */
  async function sNulevoDDS() {
    const vsichko = await mesets();
    await vsichko.vrata.dobavi({
      opId: 'op-dp-nula',
      ts: KOGATO,
      naematel: 'vintexstroy',
      actor: GLAVEN,
      type: 'ДДСПлатено',
      sashtnost: { vid: 'spravka', id: 'DP:2026-07:nula' },
      payload: { period: '2026-07', suma_st: 0, data: '2026-07-20', nachin: 'банка' },
    });
    return vsichko;
  }

  it('нулево ДДС-плащане НЕ поваля книгата · брои се отделно', async () => {
    const { ogledalo } = await sNulevoDDS();
    const k = glavnaKniga(await ogledalo(), '2026-07', KOGATO);
    expect(k.bezDvizhenie).toBe(1);
    expect(k.nared, k.sverki.filter((s) => !s.nared).map((s) => s.kakvo).join(' · ')).toBe(true);
    expect(k.debit_st).toBe(k.kredit_st);
  });

  // ПРОВЕРКАТА ЗА ОДИТНИЯ ФАЙЛ ПАДНА С НЕГО (резен 53 · „НАП отпада").
  // Онова, което тя пазеше, обаче ОСТАВА и се пази тук: нулевото ДДС-плащане
  // не поваля книгата и се брои отделно — вижте теста над този ред.

  /** И пазачът на ДЕЙСТВИЕТО · за да не се разчита само на проекцията. */
  it('но самото действие вече отказва нулата', async () => {
    const { deystviya } = await mesets();
    await expect(
      deystviya.platiDDS(
        'DP:2026-07:x',
        { period: '2026-07', suma_st: 0, data: '2026-07-20', nachin: 'банка' },
        { opId: 'op-x' },
      ),
    ).rejects.toThrow(/повече от нула/);
  });
});

/**
 * КНИГАТА И СМЕТКИ КАЗВАТ ЕДНО И СЪЩО ДДС · и защо това не се подразбираше.
 *
 * Двата екрана вадеха ДДС по РАЗЛИЧЕН начин: книгата — по документ, Сметки —
 * от сбора на групата. Σ round(x) ≠ round(Σ x), затова се разминаваха с
 * центове, а НИКОЯ сверка не ги пресичаше: книгата проверява дебит = кредит
 * (вярно по построение), Сметки — приход = Σ(основа + ДДС) (също вярно по
 * построение). Две тавтологии, без мост.
 *
 * Цената: полето „Деклариран ДДС" се прифилва от Сметки, а приключващата
 * статия в SAF-T кредитира числото на КНИГАТА. Одитният файл противоречи на
 * подадената справка, и нищо не светва.
 *
 * Кой се промени и защо: **Сметки**. ADR-012 §2 слага ДДС при точност
 * `tochno` — „не пипа", — а §3 казва инварианта ПО ДОКУМЕНТ: „ДДС, изваден от
 * обща цена, ражда центове, и без тях инвариантът „основа + ДДС == обща"
 * пада". Групов сбор го спазва само за група, каквато документ няма.
 *
 * Числата тук са подбрани точно да разминат двата пътя: 350,02 € при 20 % дава
 * 58,34 ст. ДДС по документ (×3 = 175,02), а от сбора 1050,06 — 175,01.
 */
describe('едно ДДС за двата екрана', () => {
  async function triNaema() {
    const { deystviya, ogledalo } = await knigata();
    await deystviya.dobaviImot('imot-1', { adres: 'ул. Първа 1', edinitsa: 'А', ploshtad_kvsm: 60 }, { opId: 'op-i' });
    for (let n = 1; n <= 3; n += 1) {
      await deystviya.dobaviNaem(
        `naem-${n}`,
        {
          imotId: 'imot-1',
          naemetel: `ЕООД Наемател ${n}`,
          telefon: '',
          imeyl: '',
          naem_st: 35002,
          padezhDen: 5,
          ot: '2026-01-01',
          do: '2026-12-31',
          depozit_st: 0,
          sektor: 'naem-targovski',
        },
        { opId: `op-n${n}` },
      );
      await deystviya.nachisliVzemane(
        `vz-${n}`,
        { naemId: `naem-${n}`, period: '2026-07', osnovanie: 'наем', suma_st: 35002, padezh: '2026-07-05' },
        { opId: `op-v${n}` },
      );
    }
    return ogledalo();
  }

  it('книгата и Сметки дават ЕДНО число за изходния ДДС', async () => {
    const o = await triNaema();
    const kniga = oboroti(glavnaKniga(o, '2026-07', KOGATO));
    const s = smetki(o, '2026-07', KOGATO);
    const dds = kniga.find((r) => r.smetka.nomer === '4532');

    expect(dds?.kredit_st).toBe(3 * 5834);
    expect(s.dds_izhod_st).toBe(dds?.kredit_st);
    expect(s.zaVnasyane_st).toBe(dds?.kredit_st);
  });

  it('и основата им също · сборът от закръглени, не закръгленият сбор', async () => {
    const o = await triNaema();
    const kniga = oboroti(glavnaKniga(o, '2026-07', KOGATO));
    const s = smetki(o, '2026-07', KOGATO);
    const prihod = kniga.find((r) => r.smetka.nomer === '703');

    expect(prihod?.kredit_st).toBe(3 * (35002 - 5834));
    const osnova = s.dds.reduce((sbor, r) => sbor + (r.strana === 'изход' ? r.osnova_st : 0), 0);
    expect(osnova).toBe(prihod?.kredit_st);
  });

  it('инвариантът на групата ОСТАВА · основа + ДДС == обща', async () => {
    const o = await triNaema();
    const s = smetki(o, '2026-07', KOGATO);
    for (const r of s.dds) {
      expect(r.osnova_st + r.dds_st).toBe(r.obshta_st);
    }
    expect(s.nared).toBe(true);
  });
});
