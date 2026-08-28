/**
 * АГЕНТИТЕ (И92 т.10) · правило 18 в код.
 *
 * Пази четирите неща, без които таблото е украса:
 *   · агентът НЯМА път към Вратата — записва човекът, `actor` е неговият имейл;
 *   · протоколът иска забрани ПОИМЕННО и точно ТРИ умения (правила 18 и 25);
 *   · тройният контрол се вижда поотделно — три отговора, не един (правило 15);
 *   · промптът се СГЛОБЯВА от документа — един дом (правило 17).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  broeviNaKartata,
  dobaviUmenie,
  GreshkaAgent,
  harakteristika,
  kakvoLipsva,
  mozheDaRaboti,
  napraviAgent,
  pokazateli,
  premahniUmenie,
  prevklyuchiUmenie,
  kartaNaDostapa,
  NEPROMENIMI,
  proveriPromyanata,
  proveriTriUmeniya,
  razlikaNaSverkata,
  razlikaVProtokola,
  zakriy,
  sglobiProtokol,
  sverkataZatvarya,
  vklyuchenite,
  ZAKONITE,
  type Agent,
  type Predlozhenie,
} from '../src/domein/agenti.js';
import { napraviZadacha, potvardiZadacha } from '../src/domein/zadachi.js';
import { SHA } from './pomoshtni.js';

const ACTOR = 'vintexstroy@gmail.com';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: ACTOR,
    chasovnik: () => new Date(Date.UTC(2026, 7, 24, 9, 0, tik++)).toISOString(),
  });
  return { deystviya, vrata };
}

function schetovoditelyat(promeni: Partial<Parameters<typeof napraviAgent>[0]> = {}): Agent {
  return napraviAgent({
    klyuch: 'Счетоводителят',
    ime: 'Счетоводителят',
    otgovornik: ACTOR,
    harakteristika: 'Чете Сметки, сверява ДДС по акумулатори и предлага поправки.',
    obhvat: ['smetki'],
    zabrani: ['не пише в Журнала', 'не вижда Управление'],
    umeniya: [
      { ime: 'matematika', tekst: 'матрици, данни и проверки' },
      { ime: 'masterbook-data', tekst: '' },
      { ime: 'refresh', tekst: '' },
    ],
    ...promeni,
  });
}

describe('протоколът на агента', () => {
  it('иска име, отговорник и длъжностна характеристика', () => {
    expect(() => schetovoditelyat({ ime: '  ' })).toThrow(GreshkaAgent);
    expect(() => schetovoditelyat({ otgovornik: '' })).toThrow(/ЧОВЕК-отговорник/);
    expect(() => schetovoditelyat({ harakteristika: '' })).toThrow(GreshkaAgent);
  });

  it('характеристиката е УМЕНИЕ, активирано постоянно (негова поръчка)', () => {
    const a = schetovoditelyat();
    const h = harakteristika(a)!;
    expect(h.postoyanno).toBe(true);
    expect(h.vklyucheno).toBe(true);
    expect(h.tekst).toContain('сверява ДДС');
    // тя стои в СЪЩИЯ списък като другите — един дом, не второ поле
    expect(a.umeniya[0]).toBe(h);
    expect(a.umeniya.length).toBe(4); // характеристика + три добавени
  });

  it('иска забраните ИЗБРОЕНИ ПОИМЕННО (правило 18)', () => {
    expect(() => schetovoditelyat({ zabrani: [] })).toThrow(/ИЗБРОЕНИ ПОИМЕННО/);
    expect(() => schetovoditelyat({ zabrani: ['   '] })).toThrow(/ИЗБРОЕНИ ПОИМЕННО/);
  });

  it('обхватът е само от изброените екрани · и е ЧЕТЕНЕ', () => {
    expect(() => schetovoditelyat({ obhvat: ['вратата' as never] })).toThrow(/обхват/);
    // няма стойност „пише" — списъкът е екрани, не действия
    expect(schetovoditelyat().obhvat).toEqual(['smetki']);
  });

  it('ражда се ИЗКЛЮЧЕН — включването е отделно, изрично действие', () => {
    expect(schetovoditelyat().sastoyanie).toBe('izklyuchen');
    expect(schetovoditelyat().ot).toBe('');
  });

  it('промптът се СГЛОБЯВА от документа · един дом (правило 17)', () => {
    const p = sglobiProtokol(schetovoditelyat());
    expect(p).toContain('Счетоводителят');
    expect(p).toContain('не пише в Журнала');
    expect(p).toContain('matematika');
    expect(p).toContain('Сметки');
    expect(p).toContain('ПРЕДЛАГАШ');
    // законите влизат ВСИЧКИ — не се преписват втори път никъде
    for (const z of ZAKONITE) expect(p).toContain(z.kakvo);
  });
});

describe('уменията се добавят, махат, включват и изключват', () => {
  it('новото се ражда ВКЛЮЧЕНО и влиза в промпта', () => {
    const a = dobaviUmenie(schetovoditelyat(), { ime: 'ДДС по закон', tekst: 'ЗДДС, чл. 66' });
    const u = a.umeniya.find((x) => x.ime === 'ДДС по закон')!;
    expect(u.vklyucheno).toBe(true);
    expect(u.postoyanno).toBe(false);
    expect(sglobiProtokol(a)).toContain('ДДС по закон');
  });

  it('едно и също име не се добавя два пъти', () => {
    const a = dobaviUmenie(schetovoditelyat(), { ime: 'ново', tekst: '' });
    expect(() => dobaviUmenie(a, { ime: 'Ново', tekst: '' })).toThrow(/вече го има/);
  });

  it('ИЗКЛЮЧЕНОТО умение изчезва от промпта — не е само надпис', () => {
    const a = prevklyuchiUmenie(schetovoditelyat(), 'matematika', false);
    expect(sglobiProtokol(a)).not.toContain('matematika');
    expect(vklyuchenite(a).some((u) => u.klyuch === 'matematika')).toBe(false);
    // и се връща със същото действие
    expect(sglobiProtokol(prevklyuchiUmenie(a, 'matematika', true))).toContain('matematika');
  });

  it('умение се МАХА · а характеристиката НЕ се маха и НЕ се изключва', () => {
    const a = premahniUmenie(schetovoditelyat(), 'refresh');
    expect(a.umeniya.some((u) => u.klyuch === 'refresh')).toBe(false);
    expect(() => premahniUmenie(a, 'harakteristika')).toThrow(/не се маха/);
    expect(() => prevklyuchiUmenie(a, 'harakteristika', false)).toThrow(/не се изключва/);
  });

  it('старият агент не се пипа — всяка промяна е НОВ запис (правило 1)', () => {
    const star = schetovoditelyat();
    const nov = premahniUmenie(star, 'refresh');
    expect(star.umeniya.some((u) => u.klyuch === 'refresh')).toBe(true);
    expect(nov).not.toBe(star);
  });

  it('ЗАДАЧАТА назовава ТРИ умения, и то от ВКЛЮЧЕНИТЕ (правило 25)', () => {
    const a = schetovoditelyat();
    expect(proveriTriUmeniya(a, ['matematika', 'masterbook-data', 'refresh'])).toEqual([
      'matematika',
      'masterbook-data',
      'refresh',
    ]);
    expect(() => proveriTriUmeniya(a, ['matematika', 'refresh'])).toThrow(/ТРИ умения/);
    expect(() => proveriTriUmeniya(a, ['matematika', 'refresh', 'няма-го'])).toThrow(/Няма умение/);

    const bez = prevklyuchiUmenie(a, 'refresh', false);
    expect(() =>
      proveriTriUmeniya(bez, ['matematika', 'masterbook-data', 'refresh']),
    ).toThrow(/ИЗКЛЮЧЕНО/);

    // характеристиката СЕ БРОИ за умение — тя е включена постоянно
    expect(proveriTriUmeniya(bez, ['harakteristika', 'matematika', 'masterbook-data']).length).toBe(3);
  });
});

describe('непроменимият протокол (И94 т.6)', () => {
  it('НЕПРОМЕНИМИТЕ са изброени ПОИМЕННО, не „всичко освен"', () => {
    expect([...NEPROMENIMI]).toEqual([
      'характеристиката',
      'обхватът · къде вижда',
      'забраните',
      'отговорникът',
    ]);
  });

  it('смяна на характеристиката се ОТКАЗВА — трие се агентът, прави се нов', () => {
    const star = schetovoditelyat();
    const nov = schetovoditelyat({ harakteristika: 'Друга работа.' });
    expect(razlikaVProtokola(star, nov)).toEqual(['характеристиката']);
    expect(() => proveriPromyanata(star, nov)).toThrow(/Закрий агента и направи нов/);
  });

  it('и обхватът, и забраните, и отговорникът са закови', () => {
    const star = schetovoditelyat();
    expect(() =>
      proveriPromyanata(star, schetovoditelyat({ obhvat: ['smetki', 'pari'] })),
    ).toThrow(/обхватът/);
    expect(() =>
      proveriPromyanata(star, schetovoditelyat({ zabrani: ['само това'] })),
    ).toThrow(/забраните/);
    expect(() =>
      proveriPromyanata(star, schetovoditelyat({ otgovornik: 'ivaylo85petkov@gmail.com' })),
    ).toThrow(/отговорникът/);
  });

  it('а УМЕНИЯТА и състоянието се менят свободно (И93 не пада)', () => {
    const star = schetovoditelyat();
    expect(() => proveriPromyanata(star, dobaviUmenie(star, { ime: 'ново', tekst: '' }))).not.toThrow();
    expect(() => proveriPromyanata(star, prevklyuchiUmenie(star, 'refresh', false))).not.toThrow();
    expect(() =>
      proveriPromyanata(star, { ...star, sastoyanie: 'vklyuchen', ot: '2026-08-24' }),
    ).not.toThrow();
  });

  it('ЗАКРИВАНЕТО не трие — Журналът е само за добавяне', () => {
    const z = zakriy(schetovoditelyat());
    expect(z.sastoyanie).toBe('zakrit');
    // характеристиката му остава: предложенията му сочат него
    expect(harakteristika(z)?.tekst).toContain('сверява ДДС');
    // и закритият НЕ се съживява
    expect(() => proveriPromyanata(z, { ...z, sastoyanie: 'vklyuchen' })).toThrow(/не се съживява/);
    expect(zakriy(z)).toBe(z); // повторното закриване не е ново състояние
  });

  it('Вратата на промяната пази и от ДРУГ екран — тя е в Действията', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiAgent(schetovoditelyat(), { opId: 'op-1' });
    await expect(
      deystviya.zapishiAgent(schetovoditelyat({ harakteristika: 'Друго' }), { opId: 'op-2' }),
    ).rejects.toThrow(/Закрий агента/);
    // и нищо не е влязло втори път
    expect((await deystviya.sabitiya()).length).toBe(1);
  });

  it('ЗАКРИТИЯТ не приема задачи — и това е при Вратата, не на екрана', async () => {
    const { deystviya } = stend();
    const a = schetovoditelyat();
    await deystviya.zapishiAgent(a, { opId: 'op-1' });
    await deystviya.zapishiAgent(zakriy(a), { opId: 'op-2' });
    const z = napraviZadacha(a, {
      id: 'z1',
      kakvo: 'сверѝ ДДС за август',
      razpisanie: 'vsekidnevna',
      umeniya: ['matematika', 'masterbook-data', 'refresh'],
      kogato: '2026-08-24T09:00:00.000Z',
    });
    await expect(deystviya.zapishiZadacha(z, { opId: 'op-3' })).rejects.toThrow(/ЗАКРИТ/);
    expect((await deystviya.sabitiya()).length).toBe(2);
  });

  it('задачата ВЛИЗА в Журнала и се чете от Огледалото · последната бие', async () => {
    const { deystviya } = stend();
    const a = schetovoditelyat();
    await deystviya.zapishiAgent(a, { opId: 'op-1' });
    const z = napraviZadacha(a, {
      id: 'z1',
      kakvo: 'сверѝ ДДС за август',
      razpisanie: 'postoyanna',
      umeniya: ['matematika', 'masterbook-data', 'refresh'],
      kogato: '2026-08-24T09:00:00.000Z',
    });
    await deystviya.zapishiZadacha(z, { opId: 'op-2' });
    expect((await deystviya.ogledalo()).zadachi.get('z1')?.potvardena).toBe(false);

    // Потвърждаването е СЪЩОТО събитие с ново съдържание — не втора задача.
    await deystviya.zapishiZadacha(potvardiZadacha(z), { opId: 'op-3' });
    const o = await deystviya.ogledalo();
    expect(o.zadachi.size).toBe(1);
    expect(o.zadachi.get('z1')?.potvardena).toBe(true);
  });
});

describe('картата · къде вижда, къде редактира (И94 т.6)', () => {
  const dostap = (skriti: readonly number[] = [], samoGleda: readonly number[] = []) => ({
    modeli: [
      {
        klyuch: 'Банка',
        glavi: ['Дата', 'Сума', 'Салдо'],
        zatvorena: (k: number) => k === 2,
        vizhdaYa: (k: number) => !skriti.includes(k),
        pipaYa: (k: number) => !skriti.includes(k) && !samoGleda.includes(k) && k !== 2,
      },
    ],
  });

  it('РЕДАКТИРА е нула · и стои като БРОЙ, не като изречение', () => {
    const karta = kartaNaDostapa(schetovoditelyat(), dostap());
    expect(karta.every((r) => r.redaktira === false)).toBe(true);
    expect(broeviNaKartata(karta).redaktira).toBe(0);
  });

  it('затворената колона се вижда, но не се предлага — сметка не се пише', () => {
    const karta = kartaNaDostapa(schetovoditelyat(), dostap());
    const saldo = karta.find((r) => r.kolona === 'Салдо')!;
    expect(saldo.vizhda).toBe(true);
    expect(saldo.predlaga).toBe(false);
    expect(saldo.zashto).toContain('затворена');
  });

  it('агентът НЕ вижда повече от отговорника си', () => {
    const karta = kartaNaDostapa(schetovoditelyat(), dostap([1]));
    const suma = karta.find((r) => r.kolona === 'Сума')!;
    expect(suma.vizhda).toBe(false);
    expect(suma.predlaga).toBe(false);
    expect(suma.zashto).toContain(ACTOR);
    expect(broeviNaKartata(karta)).toEqual({ vsichki: 3, vizhda: 2, predlaga: 1, redaktira: 0 });
  });

  it('свалената до „вижда" СЕ ВИЖДА, но НЕ се предлага · третата стойност', () => {
    // Новото с трите стойности (ADR-065): дотук имаше само две състояния —
    // скрита или предлагана. Средното казва „гледам, не пипам", и агентът
    // не предлага там, където отговорникът му няма право да пише.
    const karta = kartaNaDostapa(schetovoditelyat(), dostap([], [1]));
    const suma = karta.find((r) => r.kolona === 'Сума')!;
    expect(suma.vizhda).toBe(true);
    expect(suma.predlaga).toBe(false);
    expect(suma.zashto).toContain('само я ГЛЕДА');
    expect(broeviNaKartata(karta)).toEqual({ vsichki: 3, vizhda: 3, predlaga: 1, redaktira: 0 });
  });

  it('вторият имейл като отговорник · пробата, която той поиска', () => {
    const vtoriyat = 'ivaylo85petkov@gmail.com';
    const a = schetovoditelyat({ otgovornik: vtoriyat });
    const karta = kartaNaDostapa(a, dostap([0]));
    expect(karta.find((r) => r.kolona === 'Дата')!.zashto).toContain(vtoriyat);
  });
});

describe('тройният контрол', () => {
  const vklyuchen = (): Agent => ({ ...schetovoditelyat(), sastoyanie: 'vklyuchen', ot: '2026-08-24' });

  it('трите се питат ПООТДЕЛНО — сливането крие кое липсва (правило 15)', () => {
    const a = vklyuchen();
    expect(mozheDaRaboti(a, { pravo: true, otmetka: true, kran: true })).toBe(true);
    expect(mozheDaRaboti(a, { pravo: false, otmetka: true, kran: true })).toBe(false);
    expect(mozheDaRaboti(a, { pravo: true, otmetka: false, kran: true })).toBe(false);
    expect(mozheDaRaboti(a, { pravo: true, otmetka: true, kran: false })).toBe(false);
  });

  it('и казват КОЕ липсва, с думи', () => {
    const lipsva = kakvoLipsva(vklyuchen(), { pravo: true, otmetka: false, kran: false });
    expect(lipsva).toContain('отметката на Таблото е изключена');
    expect(lipsva).toContain('кранът е дръпнат — Вратата е затворена');
    expect(kakvoLipsva(vklyuchen(), { pravo: true, otmetka: true, kran: true })).toEqual([]);
  });

  it('спрян агент не работи, дори когато трите са налице', () => {
    const spryan: Agent = { ...vklyuchen(), sastoyanie: 'spryan' };
    expect(mozheDaRaboti(spryan, { pravo: true, otmetka: true, kran: true })).toBe(false);
    expect(kakvoLipsva(spryan, { pravo: true, otmetka: true, kran: true })).toContain('агентът е спрян');
  });
});

describe('предложенията в Журнала', () => {
  const predlozhenie = (promeni: Partial<Predlozhenie> = {}): Predlozhenie => ({
    id: 'P-1',
    agent: 'Счетоводителят',
    zadacha: 'сверѝ ДДС за август',
    kakvo: 'Разлика от 12,00 € в акумулатора за услуги.',
    umeniya: ['matematika', 'masterbook-data', 'refresh'],
    sverka: { vhod: 120000, izhod: 120000 },
    prisada: 'chaka',
    prichina: '',
    otsadil: '',
    kogato: '2026-08-24T09:00:00.000Z',
    ...promeni,
  });

  it('записва ги ЧОВЕКЪТ · actor е неговият имейл (правило 18)', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiAgent(schetovoditelyat(), { opId: 'op-agent' });
    await deystviya.zapishiPredlozhenie(predlozhenie(), { opId: 'op-p-1' });

    const sabitiya = await deystviya.sabitiya();
    for (const s of sabitiya) expect(s.actor).toBe(ACTOR);
    expect(sabitiya.map((s) => s.type)).toEqual(['АгентЗаписан', 'ПредложениеЗаписано']);
  });

  it('присъдата е СЪЩОТО събитие с ново съдържание — последното бие', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPredlozhenie(predlozhenie(), { opId: 'op-p-1' });
    await deystviya.zapishiPredlozhenie(
      predlozhenie({ prisada: 'prieto', otsadil: ACTOR }),
      { opId: 'op-prisada' },
    );

    const o = await deystviya.ogledalo();
    expect(o.predlozheniya.size).toBe(1);
    expect(o.predlozheniya.get('P-1')?.prisada).toBe('prieto');
    // а Журналът пази И двете — нищо не се презаписва (правило 1)
    expect((await deystviya.sabitiya()).length).toBe(2);
  });

  it('включването на агента е нов запис, не редакция на стария', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiAgent(schetovoditelyat(), { opId: 'op-1' });
    await deystviya.zapishiAgent(
      { ...schetovoditelyat(), sastoyanie: 'vklyuchen', ot: '2026-08-24' },
      { opId: 'op-2' },
    );

    const o = await deystviya.ogledalo();
    expect(o.agenti.size).toBe(1);
    expect(o.agenti.get('Счетоводителят')?.sastoyanie).toBe('vklyuchen');
    expect((await deystviya.sabitiya()).length).toBe(2);
  });

  it('повторното записване със същия opId не ражда второ предложение', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiPredlozhenie(predlozhenie(), { opId: 'op-p-1' });
    await deystviya.zapishiPredlozhenie(predlozhenie(), { opId: 'op-p-1' });
    expect((await deystviya.sabitiya()).length).toBe(1);
  });

  it('сверката се смята и НУЛАТА се вижда (правило 7)', () => {
    const zatvarya = predlozhenie();
    expect(razlikaNaSverkata(zatvarya)).toBe(0);
    expect(sverkataZatvarya(zatvarya)).toBe(true);

    const ne = predlozhenie({ sverka: { vhod: 120000, izhod: 121200 } });
    expect(razlikaNaSverkata(ne)).toBe(1200);
    expect(sverkataZatvarya(ne)).toBe(false);
  });

  it('показателите се БРОЯТ, не се оценяват (правило 17)', () => {
    const p = pokazateli([
      predlozhenie({ id: 'a' }),
      predlozhenie({ id: 'b', prisada: 'prieto' }),
      predlozhenie({ id: 'c', prisada: 'popraveno' }),
      predlozhenie({ id: 'd', prisada: 'othvarleno' }),
      predlozhenie({ id: 'e', sverka: { vhod: 100, izhod: 0 } }),
    ]);
    expect(p).toEqual({ vsichki: 5, chakat: 2, prieti: 2, othvarleni: 1, razminavaniya: 1 });
  });

  it('дръпнатият кран спира и записа на предложение — Журналът не се пипа', async () => {
    const { deystviya, vrata } = stend();
    vrata.zatvori('проба');
    await expect(deystviya.zapishiPredlozhenie(predlozhenie(), { opId: 'op-p-1' })).rejects.toThrow();
    expect((await deystviya.sabitiya()).length).toBe(0);
  });
});
