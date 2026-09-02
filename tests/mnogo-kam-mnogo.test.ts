/**
 * МНОГО-КЪМ-МНОГО · инвариантите на резен 56 (M17).
 *
 * Негово, дословно: „Занимай се първо с много-към-много" *(р88·[4])*.
 */
import { describe, expect, it } from 'vitest';
import {
  eSashtnostZaZakachane,
  IMENA_NA_SASHTNOSTITE,
  klyuchNaDvoykata,
  naredi,
  krai,
  proveriZakachka,
  redoveNa,
  SASHTNOSTI_ZA_ZAKACHANE,
  svarzanite,
  sveriZakachkite,
  type Krai,
} from '../src/domein/mnogo-kam-mnogo.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { tsentove } from '../src/yadro/pari.js';
import { stend } from './pomoshtni.js';

const IMOT: Krai = { vid: 'imot', id: 'I-1' };
const IMOT2: Krai = { vid: 'imot', id: 'I-2' };
const RAZHOD: Krai = { vid: 'razhod', id: 'R-1' };

/** Журнал с два имота и един разход · достатъчно за двата края на двойка. */
async function knigata() {
  const { deystviya, dnevnik } = stend();
  // НАРОЧНО в обратен ред: ако редовете се раждат подредени, тестът „идват
  // ПОДРЕДЕНИ" минава и когато подредбата е махната. Стойност, която не мърда,
  // не доказва нищо (резен 55).
  for (const id of ['I-2', 'I-1']) {
    await deystviya.dobaviImot(
      id,
      { adres: `А ${id}`, edinitsa: 'х', ploshtad_kvsm: 0 },
      { opId: `imot-${id}` },
    );
  }
  await deystviya.zapishiRazhod(
    'R-1',
    {
      potok: 'fakturi',
      dostavchik: 'Д',
      opis: 'ремонт',
      suma_st: tsentove(100_00),
      sektor: 'razhod-obsht',
      nachin: 'банка',
      data: '2026-08-25',
      dokument: '',
      stavka: 20,
    },
    { opId: 'razhod-1' },
  );
  const o = async () => fold(await dnevnik.chetiVsichki('vintexstroy'));
  return { deystviya, dnevnik, o };
}

describe('много-към-много · двойката', () => {
  it('двата края се четат ЕДНАКВО, откъдето и да гледаш', () => {
    expect(klyuchNaDvoykata(RAZHOD, IMOT)).toBe(klyuchNaDvoykata(IMOT, RAZHOD));
    const [a, b] = naredi(RAZHOD, IMOT);
    expect([a.vid, b.vid]).toEqual(['imot', 'razhod']);
  });

  it('един разход стои на ДВА имота · и всеки имот вижда разхода', async () => {
    const { deystviya, o } = await knigata();
    // Пак обратно: I-2 се закача ПРЪВ, за да мери подредбата, а не реда на
    // въвеждане.
    await deystviya.zakachiRedove(RAZHOD, IMOT2, 'делено', { opId: 'z-2' });
    await deystviya.zakachiRedove(RAZHOD, IMOT, 'делено', { opId: 'z-1' });

    const zakachki = (await o()).zakachki;
    expect(zakachki.size).toBe(2);
    expect(svarzanite(zakachki, RAZHOD).get('imot')).toEqual(['I-1', 'I-2']);
    expect(svarzanite(zakachki, IMOT).get('razhod')).toEqual(['R-1']);
    expect(svarzanite(zakachki, IMOT2).get('razhod')).toEqual(['R-1']);
  });

  it('същата двойка, записана от ДРУГИЯ край, не е втора връзка', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });
    await deystviya.zakachiRedove(IMOT, RAZHOD, 'пак', { opId: 'z-2' });
    expect((await o()).zakachki.size).toBe(1);
  });
});

describe('много-към-много · махането е ЗАПИС', () => {
  it('разкачането маха от картата, но ДВАТА записа остават в Журнала', async () => {
    const { deystviya, dnevnik, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });
    await deystviya.razkachiRedove(RAZHOD, IMOT, 'сгрешен имот', { opId: 'r-1' });

    expect((await o()).zakachki.size).toBe(0);
    const vidove = (await dnevnik.chetiVsichki('vintexstroy')).map((s) => s.type);
    expect(vidove).toContain('РедовеЗакачени');
    expect(vidove).toContain('РедовеРазкачени');
  });

  it('закачане СЛЕД разкачане работи · `opId` носи ДЕЙСТВИЕТО, не двойката', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });
    await deystviya.razkachiRedove(RAZHOD, IMOT, '', { opId: 'r-1' });
    await deystviya.zakachiRedove(RAZHOD, IMOT, 'пак я искам', { opId: 'z-2' });

    const z = (await o()).zakachki.get(klyuchNaDvoykata(RAZHOD, IMOT));
    expect(z?.zashto).toBe('пак я искам');
  });

  it('ПОВТОРЕН `opId` не прави втора закачка · идемпотентността', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });
    await deystviya.zakachiRedove(RAZHOD, IMOT2, '', { opId: 'z-1' });
    expect((await o()).zakachki.size).toBe(1);
  });
});

describe('много-към-много · пазачът', () => {
  it('несъществуващ ред се отказва С ДУМИ, не мълчаливо', async () => {
    const { deystviya } = await knigata();
    await expect(
      deystviya.zakachiRedove(RAZHOD, { vid: 'imot', id: 'НЯМА' }, '', { opId: 'z-1' }),
    ).rejects.toThrow(/не съществува/);
  });

  it('ред не се закача за СЕБЕ СИ', async () => {
    const { o } = await knigata();
    const kniga = await o();
    expect(() => proveriZakachka(IMOT, { vid: 'imot', id: 'I-1' }, kniga)).toThrow(/за себе си/);
  });

  it('празен ключ и непознат вид се отказват', async () => {
    const { o } = await knigata();
    const kniga = await o();
    // ДУМИТЕ, не класът: празният ключ бездруго не съществува в Огледалото и
    // падаше на СЛЕДВАЩАТА проверка. Тест, който твърди само вида на грешката,
    // е зелен по грешна причина — и махнатата проверка минаваше незабелязано.
    expect(() => proveriZakachka(RAZHOD, { vid: 'imot', id: '  ' }, kniga)).toThrow(
      /иска ключ на реда/,
    );
    expect(() =>
      proveriZakachka(RAZHOD, { vid: 'chuzhda-tablitsa' as never, id: 'X' }, kniga),
    ).toThrow(/Непознат вид/);
    expect(eSashtnostZaZakachane('chuzhda-tablitsa')).toBe(false);
  });
});

describe('много-към-много · сверката', () => {
  it('проверената НУЛА се казва · сверка без нито една висяща', async () => {
    const { deystviya, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });
    const kniga = await o();
    const s = sveriZakachkite(kniga.zakachki, kniga);
    expect(s).toMatchObject({ zhivi: 1, nared: true });
    expect(s.viseshti).toEqual([]);
    expect(s.poVid.get('imot')).toBe(1);
    expect(s.poVid.get('razhod')).toBe(1);
  });

  it('сторниран ред оставя ВИСЯЩА двойка · и тя се ИМЕНУВА', async () => {
    const { deystviya, dnevnik, o } = await knigata();
    await deystviya.zakachiRedove(RAZHOD, IMOT, '', { opId: 'z-1' });

    const razhodSeq = (await dnevnik.chetiVsichki('vintexstroy')).find(
      (s) => s.type === 'РазходЗаписан',
    )!.seq;
    await deystviya.storniraj(
      'R-1',
      { pogasyavaSeq: razhodSeq, prichina: 'сбъркан' },
      { opId: 'st-1' },
      'razhod',
    );

    const kniga = await o();
    expect(kniga.razhodi.has('R-1')).toBe(false);
    const s = sveriZakachkite(kniga.zakachki, kniga);
    expect(s.nared).toBe(false);
    expect(s.viseshti).toEqual([klyuchNaDvoykata(RAZHOD, IMOT)]);
  });
});

describe('много-към-много · РЕДЪТ НА СЪЗДАДЕНА ТАБЛИЦА (резен 58)', () => {
  const RED_A: Krai = { vid: 'red', id: 'Ф-1', tablitsa: 'Фактури' };

  async function sTablitsa() {
    const { deystviya, dnevnik } = stend();
    await deystviya.dobaviImot('I-1', { adres: 'А', edinitsa: 'х', ploshtad_kvsm: 0 }, { opId: 'i' });
    await deystviya.zapishiTablitsaOtFayl(
      {
        klyuch: 'Фактури',
        otFayl: 'f.xlsx',
        otpechatak: 'ab'.repeat(32),
        glavi: ['Доставчик', 'Сума'],
        vidove: { 0: 'tekst', 1: 'evro' },
        formuli: {},
        nekopirani: [],
      },
      { opId: 't-1' },
    );
    await deystviya.zapishiRedNaTablitsa(
      {
        tablitsa: 'Фактури',
        red: 'Ф-1',
        pari_st: { 1: tsentove(100_00) },
        chisla: {},
        tekst: { 0: 'Д' },
        mahnat: false,
      },
      { opId: 'r-1' },
    );
    const o = async () => fold(await dnevnik.chetiVsichki('vintexstroy'));
    return { deystviya, o };
  }

  it('ред от създадена таблица се закача за имот', async () => {
    const { deystviya, o } = await sTablitsa();
    await deystviya.zakachiRedove(RED_A, IMOT, 'фактурата е за този имот', { opId: 'z-1' });
    const zakachki = (await o()).zakachki;
    expect(svarzanite(zakachki, IMOT).get('red')).toEqual(['Ф-1']);
    expect(svarzanite(zakachki, RED_A).get('imot')).toEqual(['I-1']);
  });

  it('ДВА реда с еднакъв ключ в РАЗНИ таблици са различни краища', async () => {
    const { deystviya, o } = await sTablitsa();
    await deystviya.zapishiTablitsaOtFayl(
      {
        klyuch: 'Разписки',
        otFayl: 'r.xlsx',
        otpechatak: 'cd'.repeat(32),
        glavi: ['Кой'],
        vidove: { 0: 'tekst' },
        formuli: {},
        nekopirani: [],
      },
      { opId: 't-2' },
    );
    await deystviya.zapishiRedNaTablitsa(
      { tablitsa: 'Разписки', red: 'Ф-1', pari_st: {}, chisla: {}, tekst: { 0: 'х' }, mahnat: false },
      { opId: 'r-2' },
    );

    await deystviya.zakachiRedove(RED_A, IMOT, '', { opId: 'z-1' });
    await deystviya.zakachiRedove({ vid: 'red', id: 'Ф-1', tablitsa: 'Разписки' }, IMOT, '', {
      opId: 'z-2',
    });

    // ДВЕ различни двойки, не една: същият ключ, различна таблица.
    expect((await o()).zakachki.size).toBe(2);
  });

  it('МАХНАТИЯТ ред не се закача · закачаш за нещо, което го няма', async () => {
    const { deystviya } = await sTablitsa();
    await deystviya.zapishiRedNaTablitsa(
      {
        tablitsa: 'Фактури',
        red: 'Ф-1',
        pari_st: { 1: tsentove(100_00) },
        chisla: {},
        tekst: { 0: 'Д' },
        mahnat: true,
      },
      { opId: 'r-mahnat' },
    );
    await expect(deystviya.zakachiRedove(RED_A, IMOT, '', { opId: 'z-1' })).rejects.toThrow(
      /не съществува/,
    );
  });

  it('ред БЕЗ таблица и вградена същност С таблица се отказват с думи', async () => {
    const { o } = await sTablitsa();
    const kniga = await o();
    expect(() => proveriZakachka({ vid: 'red', id: 'Ф-1' }, IMOT, kniga)).toThrow(/КОЯ таблица/);
    expect(() =>
      proveriZakachka({ vid: 'imot', id: 'I-1', tablitsa: 'Фактури' }, RED_A, kniga),
    ).toThrow(/не живее в таблица/);
  });

  it('`krai` слага таблица САМО на реда · сглобката е при правилото', () => {
    expect(krai('red', 'Ф-1', 'Фактури')).toEqual({ vid: 'red', id: 'Ф-1', tablitsa: 'Фактури' });
    expect(krai('imot', 'I-1', 'Фактури')).toEqual({ vid: 'imot', id: 'I-1' });
  });

  it('ключът на двойката НЕ се слепва с разделител · разделителят е в данните', () => {
    // Таблица „А" · ред „Б:В" срещу таблица „А:Б" · ред „В". КАКЪВТО И да е
    // разделителят, слепването ги прави един низ; JSON ги различава, защото
    // екранира вместо да се надява, че знакът го няма в данните.
    const edno = klyuchNaDvoykata({ vid: 'red', id: 'Б:В', tablitsa: 'А' }, IMOT);
    const drugo = klyuchNaDvoykata({ vid: 'red', id: 'В', tablitsa: 'А:Б' }, IMOT);
    expect(edno).not.toBe(drugo);

    // И НЕ носи кавичка: ключът влиза в `sashtnost.id`, а Журналът се изнася
    // като CSV и се внася обратно — кавичка там значи нещо друго (проход §52).
    expect(edno).not.toMatch(/["';]/);

    // и със СЪЩИЯ знак, който старият ключ ползваше за другото ниво
    expect(klyuchNaDvoykata({ vid: 'red', id: 'Б|В', tablitsa: 'А' }, IMOT)).not.toBe(
      klyuchNaDvoykata({ vid: 'red', id: 'В', tablitsa: 'А|Б' }, IMOT),
    );
  });

  it('еднакъв ключ в РАЗНИ таблици не смесва свързаните', async () => {
    const { deystviya, o } = await sTablitsa();
    await deystviya.dobaviImot('I-2', { adres: 'Б', edinitsa: 'х', ploshtad_kvsm: 0 }, { opId: 'i2' });
    await deystviya.zapishiTablitsaOtFayl(
      { klyuch: 'Разписки', otFayl: 'r.xlsx', otpechatak: 'cd'.repeat(32), glavi: ['Кой'], vidove: { 0: 'tekst' }, formuli: {}, nekopirani: [] },
      { opId: 't-2' },
    );
    await deystviya.zapishiRedNaTablitsa(
      { tablitsa: 'Разписки', red: 'Ф-1', pari_st: {}, chisla: {}, tekst: { 0: 'х' }, mahnat: false },
      { opId: 'r-2' },
    );
    await deystviya.zakachiRedove(RED_A, IMOT, '', { opId: 'z-1' });
    await deystviya.zakachiRedove({ vid: 'red', id: 'Ф-1', tablitsa: 'Разписки' }, IMOT2, '', {
      opId: 'z-2',
    });

    const zakachki = (await o()).zakachki;
    // Всеки ред вижда СВОЯ имот, не двата: таблицата участва в „кой съм аз".
    expect(svarzanite(zakachki, RED_A).get('imot')).toEqual(['I-1']);
    expect(svarzanite(zakachki, { vid: 'red', id: 'Ф-1', tablitsa: 'Разписки' }).get('imot')).toEqual(
      ['I-2'],
    );
  });

  it('двата реда ЕДИН ЗА ДРУГ са една двойка, от която и посока да се запишат', async () => {
    const { deystviya, o } = await sTablitsa();
    await deystviya.zapishiTablitsaOtFayl(
      { klyuch: 'Разписки', otFayl: 'r.xlsx', otpechatak: 'cd'.repeat(32), glavi: ['Кой'], vidove: { 0: 'tekst' }, formuli: {}, nekopirani: [] },
      { opId: 't-2' },
    );
    await deystviya.zapishiRedNaTablitsa(
      { tablitsa: 'Разписки', red: 'Ф-1', pari_st: {}, chisla: {}, tekst: { 0: 'х' }, mahnat: false },
      { opId: 'r-2' },
    );
    const drugiyat: Krai = { vid: 'red', id: 'Ф-1', tablitsa: 'Разписки' };

    // ЕДНАКЪВ вид и ЕДНАКЪВ ключ, различна таблица: ако нареждането не гледа
    // таблицата, същата двойка получава два различни ключа според реда на
    // подаване — и става на две връзки.
    await deystviya.zakachiRedove(RED_A, drugiyat, '', { opId: 'z-1' });
    await deystviya.zakachiRedove(drugiyat, RED_A, 'пак', { opId: 'z-2' });
    expect((await o()).zakachki.size).toBe(1);
  });

  it('менюто на редовете не предлага МАХНАТ ред', async () => {
    const { deystviya, o } = await sTablitsa();
    expect(redoveNa(await o(), 'red', 'Фактури')).toEqual(['Ф-1']);
    await deystviya.zapishiRedNaTablitsa(
      { tablitsa: 'Фактури', red: 'Ф-1', pari_st: {}, chisla: {}, tekst: { 0: 'Д' }, mahnat: true },
      { opId: 'r-mahnat' },
    );
    expect(redoveNa(await o(), 'red', 'Фактури')).toEqual([]);
  });
});

describe('много-към-много · списъкът е МАШИНА', () => {
  it('всяка същност за закачане има ИМЕ и КОЛЕКЦИЯ · нито една не мълчи', async () => {
    const { o } = await knigata();
    const kniga = await o();
    for (const vid of SASHTNOSTI_ZA_ZAKACHANE) {
      expect(IMENA_NA_SASHTNOSTITE[vid], `вид без име: ${vid}`).toBeTruthy();
      expect(Array.isArray(redoveNa(kniga, vid)), `вид без колекция: ${vid}`).toBe(true);
    }
    // Числото е ПИН С РЪКА: расте само когато някой добави същност съзнателно.
    expect(SASHTNOSTI_ZA_ZAKACHANE.length).toBe(12);
  });

  it('редовете идват ПОДРЕДЕНИ и от Огледалото, не от догадка', async () => {
    const { o } = await knigata();
    expect(redoveNa(await o(), 'imot')).toEqual(['I-1', 'I-2']);
    expect(redoveNa(await o(), 'razhod')).toEqual(['R-1']);
  });
});
