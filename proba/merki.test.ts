/**
 * МЕРКИТЕ · бързината като договор, не като усещане.
 *
 * Пуска се с `npm run merki` — нарочно ОТДЕЛНО от `npm test`, за да не тръпнат
 * редовите тестове от натоварена машина. Всяка мярка има БЮДЖЕТ: пробие ли се,
 * командата връща червено и регресията се вижда в CI, а не при собственика.
 *
 * Бюджетите са десетократно хлабави спрямо мереното на разработната машина —
 * пазят от влошаване с порядък, не от шум в милисекундите.
 */

import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import {
  DnevnikVPametta,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
  type Sabitie,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { sgani } from '../src/ogledalo/sgavane.js';
import { smetki } from '../src/domein/smetki.js';
import { otvoriDnevnik } from '../src/nositel/dnevnik-indexeddb.js';
import { stotinki } from '../src/yadro/pari.js';
import { SHA } from '../tests/pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const BROY = 10_000;

/** Бюджетите. Едно място, за да се четат като договор. */
const BYUDZHET = {
  fold_ms: 20,
  sgavane_ms: 20,
  fold_n_verigi_ms: 20,
  veriga_ms: 400,
  smetki_ms: 10,
  append_na_sekunda: 500,
  studen_start_ms: 300,
} as const;

const izmereno: Record<string, string> = {};

function meri(ime: string, ms: number, byudzhet: number): void {
  izmereno[ime] = `${ms.toFixed(1)} ms · бюджет ${byudzhet} ms`;
  expect(ms, `${ime}: ${ms.toFixed(1)} ms > бюджет ${byudzhet} ms`).toBeLessThan(byudzhet);
}

/** 10 000 събития: 40 наема, месеци начисления и плащания. */
async function golyamZhurnal(): Promise<Sabitie[]> {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const d = new Deystviya({
    vrata, dnevnik, naematel: NAEMATEL, actor: 'x',
    chasovnik: () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tik++)).toISOString(),
  });

  await d.dobaviImot('I-1', { adres: 'А', edinitsa: 'х', ploshtad_kvsm: 0 }, { opId: 'i' });
  for (let n = 1; n <= 40; n += 1) {
    await d.dobaviNaem(`N-${n}`, {
      imotId: 'I-1', naemetel: `н ${n}`, naem_st: stotinki(500_00 + n), padezhDen: 5,
      ot: '2020-01-01', do: '', depozit_st: 0,
      sektor: n % 3 ? 'naem-zhilishten' : 'naem-targovski',
    }, { opId: `n-${n}` });
  }

  let broy = 41;
  let mesets = 0;
  while (broy < BROY) {
    const period = `${2020 + Math.floor(mesets / 12)}-${String((mesets % 12) + 1).padStart(2, '0')}`;
    for (let n = 1; n <= 40 && broy < BROY; n += 1) {
      await d.nachisliVzemane(`V-${period}-${n}`, {
        naemId: `N-${n}`, period, osnovanie: 'наем',
        suma_st: stotinki(500_00 + n), padezh: `${period}-05`,
      }, { opId: `v-${period}-${n}` });
      broy += 1;
      if (broy < BROY && n % 2 === 0) {
        await d.priemiPlashtane(`P-${period}-${n}`, {
          vzemaneId: `V-${period}-${n}`, suma_st: stotinki(500_00 + n),
          nachin: n % 4 ? 'банка' : 'в брой', data: `${period}-10`,
        }, { opId: `p-${period}-${n}` });
        broy += 1;
      }
    }
    mesets += 1;
  }
  return dnevnik.chetiVsichki(NAEMATEL);
}

describe(`мерките · ${BROY.toLocaleString('bg')} събития`, () => {
  it('държат бюджетите', async () => {
    const sabitiya = await golyamZhurnal();
    expect(sabitiya.length).toBe(BROY);

    // Загрявка — първото минаване плаща компилацията, не алгоритъма.
    smetki(fold(sabitiya), '2023-06', '2026-01-01T00:00:00.000Z');

    let t = performance.now();
    const o = fold(sabitiya);
    meri('fold', performance.now() - t, BYUDZHET.fold_ms);

    t = performance.now();
    smetki(o, '2023-06', '2026-01-01T00:00:00.000Z');
    meri('smetki', performance.now() - t, BYUDZHET.smetki_ms);

    /**
     * СГЪВАНЕТО НА МНОГО ВЕРИГИ · мери се, не се твърди.
     *
     * Един Журнал не е пет вериги, затова тук същите 10 000 събития се РЯЗАТ
     * на пет и се сгъват наново. Не е истинска книга с пет писача — но мери
     * точно онова, което новият код прави: k-пътното сливане и сгъването на
     * слетия поток. Бюджетът е СЪЩИЯТ като на `fold`: многото вериги не бива
     * да струват порядък повече от една.
     */
    const naryazani: Sabitie[][] = [[], [], [], [], []];
    sabitiya.forEach((sabitie, i) => naryazani[i % 5]!.push(sabitie));
    sgani(naryazani, '2026-01-01T00:00:00.000Z'); // загрявка

    t = performance.now();
    const sgunato = sgani(naryazani, '2026-01-01T00:00:00.000Z');
    meri('сгъване на 5 вериги', performance.now() - t, BYUDZHET.sgavane_ms);
    expect(sgunato.sverka.nared).toBe(true);

    t = performance.now();
    fold(sgunato.potok);
    meri('fold върху слетия поток', performance.now() - t, BYUDZHET.fold_n_verigi_ms);

    t = performance.now();
    const veriga = await proveriVerigata(sabitiya, SHA);
    meri('proveriVerigata', performance.now() - t, BYUDZHET.veriga_ms);
    expect(veriga.tsyala).toBe(true);

    // append през Вратата, в паметта — колко записа в секунда.
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const KOLKO = 1000;
    t = performance.now();
    for (let i = 1; i <= KOLKO; i += 1) {
      await vrata.dobavi({
        opId: `m-${i}`, ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL, actor: 'x',
        type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: `I-${i}` },
        payload: { adres: `А ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
      });
    }
    const naSekunda = KOLKO / ((performance.now() - t) / 1000);
    izmereno['append'] = `${Math.round(naSekunda)}/с · бюджет ${BYUDZHET.append_na_sekunda}/с`;
    expect(naSekunda).toBeGreaterThan(BYUDZHET.append_na_sekunda);

    // Студен старт: наливане в IndexedDB, после отваряне и четене отначало.
    const ime = `merki-${Date.now()}`;
    const idb = await otvoriDnevnik(ime);
    for (const s of sabitiya) await idb.dobavi(s);
    idb.zatvori();

    t = performance.now();
    const studen = await otvoriDnevnik(ime);
    const procheteni = await studen.chetiVsichki(NAEMATEL);
    meri('студен старт (отваряне + четене)', performance.now() - t, BYUDZHET.studen_start_ms);
    expect(procheteni.length).toBe(BROY);
    studen.zatvori();

    console.log('\n═══ МЕРКИТЕ ═══');
    for (const [ime2, stoynost] of Object.entries(izmereno)) {
      console.log(`  ${ime2}: ${stoynost}`);
    }
  }, 180_000);
});
