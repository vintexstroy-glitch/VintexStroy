/**
 * ФЪРТУНА · ядрото под обстрел.
 *
 * Два вида буря, и двете детерминистични (seyalka — повторим провал):
 *   1. Стотици СЛУЧАЙНИ ВАЛИДНИ операции → инвариантите държат до края.
 *   2. Хиляда НАРОЧНО ПОВРЕДЕНИ операции → всяка отказана, нула поражения.
 *
 * Единичните тестове доказват, че познатото работи. Фъртуната търси
 * непознатото: съчетанието, за което никой не е помислил.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  GreshkaVrata,
  proveriVerigata,
  stotinki,
  Vrata,
  VsichkoRazresheno,
  type Operatsiya,
  type Sabitie,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { VID } from '../src/domein/sabitiya.js';
import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { duljimo, fold } from '../src/ogledalo/ogledalo.js';
import { glavnaKniga } from '../src/domein/glavna-kniga.js';
import { sgani } from '../src/ogledalo/sgavane.js';
import { seyalka, SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tik++)).toISOString(),
  });
  return { dnevnik, vrata, deystviya };
}

describe('фъртуна 1 · петстотин валидни операции', () => {
  it('инвариантите държат до края', async () => {
    const { dnevnik, deystviya } = stend();
    const sluchayno = seyalka(20260822);
    const izbroy = (n: number) => Math.floor(sluchayno() * n);

    const imoti: string[] = [];
    const naemi: string[] = [];
    const vzemaniya: string[] = [];
    const plashtaniya: string[] = [];
    let broyach = 0;

    for (let i = 0; i < 500; i += 1) {
      const zar = sluchayno();
      broyach += 1;

      if (zar < 0.15 || imoti.length === 0) {
        const id = `I-${broyach}`;
        await deystviya.dobaviImot(
          id,
          { adres: `Адрес ${broyach}`, edinitsa: `№ ${broyach}`, ploshtad_kvsm: izbroy(2_000_000) },
          { opId: `f:imot:${broyach}` },
        );
        imoti.push(id);
      } else if (zar < 0.35 || naemi.length === 0) {
        const id = `N-${broyach}`;
        await deystviya.dobaviNaem(
          id,
          {
            imotId: imoti[izbroy(imoti.length)]!,
            naemetel: `наемател ${broyach}`,
            naem_st: stotinki(100 + izbroy(500_000)),
            padezhDen: 1 + izbroy(31),
            ot: '2025-01-01',
            do: '',
            depozit_st: stotinki(izbroy(200_000)),
            sektor: zar < 0.25 ? 'naem-zhilishten' : 'naem-targovski',
          },
          { opId: `f:naem:${broyach}` },
        );
        naemi.push(id);
      } else if (zar < 0.55 || vzemaniya.length === 0) {
        const id = `V-${broyach}`;
        await deystviya.nachisliVzemane(
          id,
          {
            naemId: naemi[izbroy(naemi.length)]!,
            period: `2026-${String(1 + izbroy(12)).padStart(2, '0')}`,
            osnovanie: 'наем',
            suma_st: stotinki(100 + izbroy(500_000)),
            padezh: '2026-06-15',
          },
          { opId: `f:vzemane:${broyach}` },
        );
        vzemaniya.push(id);
      } else if (zar < 0.85) {
        const id = `P-${broyach}`;
        await deystviya.priemiPlashtane(
          id,
          {
            vzemaneId: vzemaniya[izbroy(vzemaniya.length)]!,
            suma_st: stotinki(1 + izbroy(600_000)),
            nachin: zar < 0.7 ? 'в брой' : 'банка',
            data: '2026-06-20',
          },
          { opId: `f:plashtane:${broyach}` },
        );
        plashtaniya.push(id);
      } else {
        // Сторно — само през вратаря, както от екрана. Вратарят не бива да лъже:
        // каже ли „може", сторното МИНАВА.
        const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
        const o = fold(vsichki);
        const zhertva = vsichki[izbroy(vsichki.length)]!;
        const otgovor = mozheLiDaSeStornira(vsichki, o, zhertva.seq);
        if (otgovor.mozhe) {
          await deystviya.storniraj(
            `S-${broyach}`,
            { pogasyavaSeq: zhertva.seq, prichina: 'фъртуна' },
            { opId: `f:storno:${broyach}` },
            zhertva.sashtnost.vid as never,
          );
        }
      }
    }

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya.length).toBeGreaterThan(400);

    // 1 · веригата е цяла след бурята
    const veriga = await proveriVerigata(sabitiya, SHA);
    expect(veriga.tsyala).toBe(true);

    // 2 · seq е плътен: 1, 2, 3 … без дупка
    expect(sabitiya.map((s) => s.seq)).toEqual(sabitiya.map((_, i) => i + 1));

    // 3 · fold е детерминистичен — два пъти върху същото дава същото
    const o1 = fold(sabitiya);
    const o2 = fold(sabitiya);
    expect(JSON.stringify([...o1.vzemaniya.entries()])).toBe(
      JSON.stringify([...o2.vzemaniya.entries()]),
    );

    // 4 · дължимото е сборът на остатъците, а остатъкът е точно
    //     начислено − погасено, за всяко вземане поотделно
    let sbor = 0;
    for (const v of o1.vzemaniya.values()) {
      expect(v.ostatak_st).toBe(v.nachisleno_st - v.pogaseno_st);
      expect(Number.isSafeInteger(v.ostatak_st)).toBe(true);
      expect(v.pogaseno_st).toBeGreaterThanOrEqual(0);
      sbor += v.ostatak_st;
    }
    expect(duljimo(o1)).toBe(sbor);

    // 5 · всяко сторно поглъща точно две звена: себе си и жертвата
    const storna = sabitiya.filter((s) => s.type === 'Сторно');
    expect(o1.pogaseni.size).toBe(storna.length * 2);
  });
});

describe('фъртуна 2 · хиляда повредени операции', () => {
  it('всяка е отказана и нито една не поврежда веригата', async () => {
    const { dnevnik, vrata } = stend();
    const sluchayno = seyalka(19840303);

    const zdrava = (n: number): Operatsiya => ({
      opId: `zdrava-${n}`,
      ts: '2026-08-22T09:00:00.000Z',
      naematel: NAEMATEL,
      actor: 'vintexstroy@gmail.com',
      type: 'ИмотДобавен',
      sashtnost: { vid: 'imot', id: `I-${n}` },
      payload: { adres: 'Малинова', edinitsa: `№ ${n}`, ploshtad_kvsm: 0 },
    });

    // Повредите: всяка е реален начин входът да пристигне крив.
    const povredi: ((op: Operatsiya, r: () => number) => Operatsiya)[] = [
      (op) => ({ ...op, opId: '' }),
      (op) => ({ ...op, opId: '   ' }),
      (op) => ({ ...op, naematel: '' }),
      (op) => ({ ...op, actor: '' }),
      (op) => ({ ...op, type: '' }),
      (op) => ({ ...op, ts: 'не е време' }),
      (op) => ({ ...op, ts: 123456 as never }),
      (op) => ({ ...op, sashtnost: { vid: '', id: 'X' } as never }),
      (op) => ({ ...op, sashtnost: { vid: 'imot', id: '' } as never }),
      (op) => ({ ...op, sashtnost: null as never }),
      (op) => ({ ...op, payload: null as never }),
      (op) => ({ ...op, payload: [1, 2, 3] as never }),
      (op) => ({ ...op, payload: 'низ' as never }),
      (op, r) => ({ ...op, payload: { suma_st: r() * 100 + 0.5 } }),
      (op) => ({ ...op, payload: { suma_st: '100' as never } }),
      (op) => ({ ...op, payload: { suma_st: null as never } }),
      (op) => ({ ...op, payload: { suma_st: Number.NaN } }),
      (op) => ({ ...op, payload: { suma_st: Infinity } }),
      (op) => ({ ...op, payload: { suma_st: 2 ** 53 } }),
      (op) => ({ ...op, payload: { vlozheno: { dulbochina: { pari_st: 10.01 } } } }),
      (op) => ({ ...op, expectedRev: 1.5 }),
      (op) => ({ ...op, expectedRev: 'едно' as never }),
      (op) => ({ ...op, payload: { golyam: 'х'.repeat(100_000), pari_st: 0.1 } }),
    ];

    let otkazani = 0;
    let prieti = 0;

    for (let i = 0; i < 1000; i += 1) {
      if (i % 10 === 9) {
        // Всяка десета е здрава — обстрелът не бива да спре и редовния поток.
        await vrata.dobavi(zdrava(i));
        prieti += 1;
        continue;
      }
      const povreda = povredi[Math.floor(sluchayno() * povredi.length)]!;
      try {
        await vrata.dobavi(povreda(zdrava(i), sluchayno));
        throw new Error(`Повредена операция ${i} мина през Вратата.`);
      } catch (greshka) {
        expect(greshka).toBeInstanceOf(GreshkaVrata);
        expect((greshka as GreshkaVrata).kod).toBe('NEVALIDNO');
        otkazani += 1;
      }
    }

    expect(otkazani).toBe(900);
    expect(prieti).toBe(100);

    /**
     * И ЕДНА ПОВРЕДА, КОЯТО НЕ МИНАВА ПРЕЗ ВРАТАТА · пипнат ИЗНОС.
     *
     * Останалите 900 се отказват на входа. Тази идва от друга посока: файл,
     * чиито хешове са непокътнати, а е сменена САМО думата „кой е записал".
     *
     * Дотук минаваше. `actor` не влизаше в подписа — тоест кой какво е направил
     * се редактираше без следа, в книга, чието първо правило е „само добавяне".
     * И понеже ADR-043 извежда стопанина на започнат Журнал именно от `actor`
     * на първото събитие, дупката се отваряше чак до присвояване на чужд Журнал.
     */
    const chestni = await dnevnik.chetiVsichki(NAEMATEL);
    const pipnat = chestni.map((s) => ({ ...s, actor: 'chuzhd@example.bg' }));
    const sledPipvane = await proveriVerigata(pipnat, SHA);
    expect(sledPipvane.tsyala, 'сменен actor ТРЯБВА да къса веригата').toBe(false);
    expect(sledPipvane.parvoSchupeno).toBe(1);

    // Нула поражения: точно здравите записи, верига цяла.
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya).toHaveLength(100);
    expect((await proveriVerigata(sabitiya, SHA)).tsyala).toBe(true);
  });
});

/**
 * ФЪРТУНА 3 · ГЛАВНАТА КНИГА под същия обстрел.
 *
 * Книгата е ново сърце: тя е ПРОЕКЦИЯ, а проекция не бива да пада от онова,
 * което вече стои в Журнала. В Журнала влизат и прочетена таблица, и върнат
 * архив, и запис отпреди днешните пазачи — все неща, които не минават през
 * формите.
 *
 * Тази буря е писана, след като сверител намери точно такъв случай: ДДС-превод
 * за НУЛА влизаше през Вратата (правило 3 иска цели стотинки — нулата е цяла) и
 * събаряше ЦЕЛИЯ екран Сметки, защото от нула не се прави двустранна статия.
 * Единичният тест го пази, но само за онзи случай; тук се пази ПРАВИЛОТО.
 *
 * Двата инварианта, които книгата няма право да наруши при никакви данни:
 *   1. НЕ ХВЪРЛЯ · какъвто и да е Журналът;
 *   2. ЗАТВАРЯ · дебит = кредит, до стотинка, за всеки период поотделно.
 */
describe('фъртуна 3 · главната книга не пада и затваря', () => {
  it('при стотици смесени записа, включително негодни суми', async () => {
    const { dnevnik, vrata, deystviya } = stend();
    const sluchayno = seyalka(20260826);
    const izbroy = (n: number) => Math.floor(sluchayno() * n);
    const MESETSI = ['2026-01', '2026-02', '2026-03'];

    await deystviya.dobaviImot('I-1', { adres: 'Малинова', edinitsa: '№ 1', ploshtad_kvsm: 6000 }, { opId: 'op-i' });
    for (const [i, sektor] of ['naem-zhilishten', 'naem-targovski'].entries()) {
      await deystviya.dobaviNaem(
        `N-${i}`,
        { imotId: 'I-1', naemetel: `Наемател ${i}`, telefon: '', imeyl: '',
          naem_st: 60000 + i * 7777, padezhDen: 5, ot: '2026-01-01', do: '2026-12-31',
          depozit_st: 0, sektor },
        { opId: `op-n-${i}` },
      );
    }

    let n = 0;
    for (let i = 0; i < 240; i += 1) {
      const mesets = MESETSI[izbroy(MESETSI.length)]!;
      const zar = sluchayno();
      n += 1;
      try {
        if (zar < 0.35) {
          await deystviya.nachisliVzemane(
            `V-${n}`,
            { naemId: `N-${izbroy(2)}`, period: mesets, osnovanie: 'наем',
              suma_st: izbroy(300000) + 1, padezh: `${mesets}-05` },
            { opId: `op-v-${n}` },
          );
        } else if (zar < 0.6) {
          await deystviya.zapishiRazhod(
            `R-${n}`,
            { potok: izbroy(2) === 0 ? 'fakturi' : 'zaplati',
              dostavchik: `Доставчик ${izbroy(5)}`, opis: 'нещо',
              suma_st: izbroy(120000) + 1,
              sektor: ['pokupki-materiali', 'pokupki-uslugi', 'zaplati'][izbroy(3)]!,
              stavka: [0, 9, 20][izbroy(3)]!,
              nachin: izbroy(2) === 0 ? 'в брой' : 'банка',
              data: `${mesets}-1${izbroy(9)}`, dokument: `Ф-${n}` },
            { opId: `op-r-${n}` },
          );
        } else if (zar < 0.8) {
          // НЕГОДНА СУМА · влиза ПОКРАЙ действието, както влизат внесени данни
          await vrata.dobavi({
            opId: `op-nula-${n}`, ts: '2026-04-01T00:00:00.000Z', naematel: NAEMATEL,
            actor: 'vintexstroy@gmail.com', type: 'ДДСПлатено',
            sashtnost: { vid: VID.spravka, id: `DP-${n}` },
            payload: { period: mesets, suma_st: izbroy(2) === 0 ? 0 : -izbroy(5000),
              data: `${mesets}-2${izbroy(8)}`, nachin: 'банка' },
          });
        } else {
          await deystviya.platiDDS(
            `DP-ok-${n}`,
            { period: mesets, suma_st: izbroy(40000) + 1, data: `${mesets}-25`, nachin: 'банка' },
            { opId: `op-dp-${n}` },
          );
        }
      } catch (greshka) {
        // Замразен период и отказана сума са ВЕРНИ откази — бурята продължава.
        if (!(greshka instanceof Error)) throw greshka;
      }
    }

    const o = fold(await dnevnik.chetiVsichki(NAEMATEL));
    let statii = 0;
    let propusnati = 0;
    for (const mesets of MESETSI) {
      const k = glavnaKniga(o, mesets, '2026-04-01T00:00:00.000Z');
      expect(k.debit_st, `${mesets} · дебит ↔ кредит`).toBe(k.kredit_st);
      expect(
        k.nared,
        `${mesets} · ${k.sverki.filter((s) => !s.nared).map((s) => `${s.kakvo}: ${s.razlika}`).join(' · ')}`,
      ).toBe(true);
      for (const s of k.statii) {
        const debit = s.redove.filter((r) => r.strana === 'debit').reduce((x, r) => x + r.suma_st, 0);
        const kredit = s.redove.filter((r) => r.strana === 'kredit').reduce((x, r) => x + r.suma_st, 0);
        expect(debit, `статия ${s.id}`).toBe(kredit);
      }
      statii += k.statii.length;
      propusnati += k.bezDvizhenie;
    }
    // Бурята наистина е минала през двата пътя: и статии, и пропуснати.
    expect(statii).toBeGreaterThan(30);
    expect(propusnati).toBeGreaterThan(0);
  });
});

/**
 * ФЪРТУНА 4 · МНОГО ВЕРИГИ · четирима писача в една книга.
 *
 * Единичният тест пази СЛУЧАЯ; бурята пази ПРАВИЛОТО. Тук правилото е ново и
 * най-крехко: щом писачите са няколко, всяка верига тръгва от `seq 1` и
 * наредбата между тях идва от такта, не от брояча.
 *
 * ТРИ ИНВАРИАНТА, и трите се късат по различен начин, ако нещо се сбърка:
 *
 *   1. ВСЯКА ВЕРИГА ПООТДЕЛНО Е ЦЯЛА. Сгъването е ПОГЛЕД — то не бива да
 *      докосва нито един хеш. Скъса ли се верига, значи сме писали, а не чели.
 *   2. ПОТОКЪТ Е ЕДИН И СЪЩ ПРИ ВСЯКАКЪВ РЕД НА ПОДАВАНЕ. Носителят връща
 *      файловете в какъвто ред му е удобно; зависи ли „кой е последен" от това,
 *      два екрана показват различни пари.
 *   3. ГЛАВНАТА КНИГА НЕ ХВЪРЛЯ И ЗАТВАРЯ. Дебит = кредит, до стотинка — при
 *      каквито и да е данни от четирима души.
 */
describe('фъртуна 4 · четирима писача, една книга', () => {
  const KNIGA = 'vintexstroy';
  const PISACHI = [
    KNIGA,
    `${KNIGA}#pero:mira@example.bg`,
    `${KNIGA}#pero:petar@example.bg`,
    `${KNIGA}#pero:ana@example.bg`,
  ] as const;

  it('веригите са цели, потокът е един и същ, книгата затваря', async () => {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const sluchayno = seyalka(20260826);
    const izbroy = (n: number) => Math.floor(sluchayno() * n);
    const MESETSI = ['2026-01', '2026-02', '2026-03'];

    /**
     * ЧАСОВНИЦИТЕ СЕ СБЛЪСКВАТ НАРОЧНО, и това е същината на фъртуната.
     *
     * Първият вариант на този тест даваше на всеки писач свое отместване от по
     * две секунди — и минаваше ДОРИ когато разчупването по верига се махнеше.
     * Тоест твърдеше, че пази наредбата, а не я пазеше: при различни времена
     * няма какво да се разчупва.
     *
     * Затова тук времето върви ОБЩО и БАВНО: една милисекунда на всеки пет
     * записа. Четиримата пишат в едни и същи милисекунди, равенствата са
     * стотици, и наредбата виси изцяло на разчупването по верига. Махне ли се
     * то, пермутационната проверка пада.
     */
    let obshtTik = 0;
    const chasovnik = () =>
      new Date(Date.UTC(2026, 0, 1, 0, 0, 0, Math.floor(obshtTik++ / 5))).toISOString();

    const deystviyata = PISACHI.map((veriga, i) =>
      new Deystviya({
        vrata,
        dnevnik,
        naematel: veriga,
        actor: i === 0 ? 'vintexstroy@gmail.com' : veriga.split(':')[1]!,
        chasovnik,
      }),
    );

    // Всеки писач си държи свой имот и свой наем — иначе тестът щеше да мери
    // сблъсъците, а те са работа на резен 4, не на този.
    for (const [i, d] of deystviyata.entries()) {
      await d.dobaviImot(`I-${i}`, { adres: `Малинова ${i}`, edinitsa: '№ 1', ploshtad_kvsm: 6000 }, { opId: `op-i-${i}` });
      await d.dobaviNaem(
        `N-${i}`,
        { imotId: `I-${i}`, naemetel: `Наемател ${i}`, telefon: '', imeyl: '',
          naem_st: 60000 + i * 7777, padezhDen: 5, ot: '2026-01-01', do: '2026-12-31',
          depozit_st: 0, sektor: i % 2 === 0 ? 'naem-zhilishten' : 'naem-targovski' },
        { opId: `op-n-${i}` },
      );
    }

    let n = 0;
    for (let krag = 0; krag < 200; krag += 1) {
      const i = izbroy(PISACHI.length);
      const d = deystviyata[i]!;
      const mesets = MESETSI[izbroy(MESETSI.length)]!;
      const zar = sluchayno();
      n += 1;
      try {
        if (zar < 0.4) {
          await d.nachisliVzemane(
            `V-${i}-${n}`,
            { naemId: `N-${i}`, period: mesets, osnovanie: 'наем',
              suma_st: izbroy(300000) + 1, padezh: `${mesets}-05` },
            { opId: `op-v-${i}-${n}` },
          );
        } else if (zar < 0.7) {
          await d.zapishiRazhod(
            `R-${i}-${n}`,
            { potok: 'fakturi', dostavchik: `Доставчик ${izbroy(3)}`, opis: 'материали',
              suma_st: izbroy(120000) + 1, sektor: 'pokupki-materiali',
              nachin: 'банка', data: `${mesets}-12`, dokument: `Ф-${n}` },
            { opId: `op-r-${i}-${n}` },
          );
        } else {
          await d.dobaviImot(
            `I-${i}-${n}`,
            { adres: `ул. ${n}`, edinitsa: 'А', ploshtad_kvsm: izbroy(20000) },
            { opId: `op-di-${i}-${n}` },
          );
        }
      } catch {
        // Отказ на действие е ВАЛИДЕН изход (замразен период, негодна сума).
        // Фъртуната мери какво става с ЖУРНАЛА, не колко операции минават.
      }
    }

    const verigi = await Promise.all(PISACHI.map((v) => dnevnik.chetiVsichki(v)));

    // ── инвариант 1 · всяка верига поотделно е ЦЯЛА ──────────────────────
    for (const [i, v] of verigi.entries()) {
      expect(v.length, `верига ${i} е празна`).toBeGreaterThan(0);
      const proverka = await proveriVerigata(v, SHA);
      expect(proverka.tsyala, `верига ${i}: ${proverka.prichina ?? ''}`).toBe(true);
    }

    // ── инвариант 2 · редът на подаване не мени НИЩО ─────────────────────
    const KOGATO = '2026-04-01T00:00:00.000Z';
    const otpechatak = (r: readonly (readonly Sabitie[])[]) =>
      sgani(r, KOGATO).potok.map((s) => s.hash).join('|');

    const naopaki = [...verigi].reverse();
    const razmesteni = [verigi[2]!, verigi[0]!, verigi[3]!, verigi[1]!];
    expect(otpechatak(naopaki)).toBe(otpechatak(verigi));
    expect(otpechatak(razmesteni)).toBe(otpechatak(verigi));

    // и сверката затваря · правило 7
    const sgunato = sgani(verigi, KOGATO);
    expect(sgunato.sverka.nared).toBe(true);
    expect(sgunato.verigi).toHaveLength(PISACHI.length);

    // ── инвариант 3 · Главната книга не хвърля и ЗАТВАРЯ ─────────────────
    const o = fold(sgunato.potok);
    for (const period of MESETSI) {
      const kniga = glavnaKniga(o, period, KOGATO);
      expect(kniga.debit_st, `период ${period}`).toBe(kniga.kredit_st);
      for (const statiya of kniga.statii) {
        const debit = statiya.redove.reduce((s, r) => s + (r.strana === 'debit' ? r.suma_st : 0), 0);
        const kredit = statiya.redove.reduce((s, r) => s + (r.strana === 'kredit' ? r.suma_st : 0), 0);
        expect(debit, `статия ${statiya.id}`).toBe(kredit);
      }
    }
  });
});
