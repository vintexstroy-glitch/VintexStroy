/**
 * МЕРКИТЕ · бързината като договор, не като усещане.
 *
 * Пуска се с `npm run merki` — нарочно ОТДЕЛНО от `npm test`, за да не тръпнат
 * редовите тестове от натоварена машина. Всяка мярка има БЮДЖЕТ: пробие ли се,
 * командата връща червено и регресията се вижда в CI, а не при собственика.
 *
 * ═══ ЕДНО ПУСКАНЕ ЛЪЖЕ · и точно това намери резен 24 (ADR-084) ═══
 *
 * Мярката „fold върху слетия поток" се движеше между 11,5 и 20,0 ms при бюджет
 * 20 и веднъж го проби. Изглеждаше като бавен код. Не беше: тя се мереше с
 * ЕДНО пускане, ВЕДНАГА след `sgani`, който току-що е родил 10 000 такта и един
 * масив от 10 000. Сметката на чистача на паметта падаше върху следващия
 * измерван блок. Със загрявка и най-ниско от `POVTORENIYA` същият код дава
 * 4,9 ms — тоест мярката е приписвала на `fold` чужд боклук.
 *
 * Затова всяка мярка сега: ЗАГРЯВА се, пуска се `POVTORENIYA` пъти и се взима
 * НАЙ-НИСКОТО. Най-ниското е най-малко замърсено от чистача и от планировчика;
 * средното мери машината, не кода.
 *
 * ═══ БЮДЖЕТИТЕ СА ×10 · и това вече се БРОИ ═══
 *
 * Шапката дотук твърдеше „десетократно хлабави", а „fold върху слетия поток"
 * стоеше на 1,26× — тоест файлът твърдеше нещо, което числата му опровергаваха.
 * Сега бюджетите са изведени като ×10 от мереното, изходът печата ЗАПАСА до
 * всяко число, и `ZAPAS_NAY_MALKO` пада в червено, щом запасът слезе под ×4 —
 * дълго преди тавана. Обход, който само стои в шапка, разчита на дисциплина
 * (ADR-056).
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

/** НАЙ-МАЛКО толкова пускания на мярка · взима се НАЙ-НИСКОТО от всички. */
const POVTORENIYA = 5;

/** Таван на пробите · за да не мери мярката до безкрай на бавна машина. */
const POVTORENIYA_NAY_MNOGO = 60;

/** Таван на времето за ЕДНА мярка · пробите спират, дори да още падат. */
const TAVAN_NA_MYARKA_MS = 2_000;

/**
 * КОЛКО ПРОБИ БЕЗ ПОДОБРЕНИЕ СПИРАТ МЕРЕНЕТО.
 *
 * Пет фиксирани проби стигаха на празна машина и падаха на заета: минимумът
 * от пет носи чуждия шум, и мярката казваше „кодът се е забавил", когато
 * забавен беше СЪСЕДЪТ — пълният тестов пакет, пуснат преди нея. Мярка, чиято
 * присъда зависи от онова, което е текло ПРЕДИ нея, не мери кода.
 *
 * Затова се мери, докато най-ниското още пада. Прагът НЕ помръдва — сетивото
 * се разширява, не тревогата се приглушава.
 */
const BEZ_PODOBRENIE = 12;

/**
 * НАЙ-МАЛКИЯТ ДОПУСТИМ ЗАПАС.
 *
 * Бюджетът е ×10; тревогата бие на ×4. Между двете има място за машина, която
 * не е еднаква два пъти — но не и за удвояване на кода, минало незабелязано.
 */
const ZAPAS_NAY_MALKO = 4;

/** Бюджетите · ×10 от мереното (резен 24). Едно място, за да се четат като договор. */
const BYUDZHET = {
  fold_ms: 45,
  sgavane_ms: 70,
  fold_n_verigi_ms: 50,
  veriga_ms: 900,
  smetki_ms: 6,
  append_na_sekunda: 500,
  studen_start_ms: 1000,
} as const;

const izmereno: Record<string, string> = {};

/** НАЙ-НИСКОТО от пробите · с една загрявка преди тях. */
function nayNiskoto(kakvo: () => void): number {
  kakvo();
  let nay = Infinity;
  let bezPodobrenie = 0;
  const kray = performance.now() + TAVAN_NA_MYARKA_MS;
  for (let i = 0; i < POVTORENIYA_NAY_MNOGO; i += 1) {
    const t = performance.now();
    kakvo();
    const sega = performance.now() - t;
    if (sega < nay) { nay = sega; bezPodobrenie = 0; } else { bezPodobrenie += 1; }
    if (i + 1 >= POVTORENIYA && (bezPodobrenie >= BEZ_PODOBRENIE || performance.now() >= kray)) break;
  }
  return nay;
}

/** Същото, но за мярка, която чака · всяко пускане си има свой ред. */
async function nayNiskotoChakashto(kakvo: (n: number) => Promise<void>): Promise<number> {
  await kakvo(0);
  let nay = Infinity;
  let bezPodobrenie = 0;
  const kray = performance.now() + TAVAN_NA_MYARKA_MS;
  for (let i = 1; i <= POVTORENIYA_NAY_MNOGO; i += 1) {
    const t = performance.now();
    await kakvo(i);
    const sega = performance.now() - t;
    if (sega < nay) { nay = sega; bezPodobrenie = 0; } else { bezPodobrenie += 1; }
    if (i >= POVTORENIYA && (bezPodobrenie >= BEZ_PODOBRENIE || performance.now() >= kray)) break;
  }
  return nay;
}

function meri(ime: string, ms: number, byudzhet: number): void {
  const zapas = byudzhet / ms;
  izmereno[ime] = `${ms.toFixed(1)} ms · бюджет ${byudzhet} ms · запас ×${zapas.toFixed(1)}`;
  expect(ms, `${ime}: ${ms.toFixed(1)} ms > бюджет ${byudzhet} ms`).toBeLessThan(byudzhet);
  expect(
    zapas,
    `${ime}: запасът падна на ×${zapas.toFixed(1)} · под ×${ZAPAS_NAY_MALKO}. ` +
      'Или кодът се е забавил, или бюджетът е изведен от бавно число — ' +
      'бюджет се пипа САМО след като мярката е паднала, и то надолу.',
  ).toBeGreaterThanOrEqual(ZAPAS_NAY_MALKO);
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

    const o = fold(sabitiya);
    meri('fold', nayNiskoto(() => { fold(sabitiya); }), BYUDZHET.fold_ms);
    meri(
      'smetki',
      nayNiskoto(() => { smetki(o, '2023-06', '2026-01-01T00:00:00.000Z'); }),
      BYUDZHET.smetki_ms,
    );

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

    meri(
      'сгъване на 5 вериги',
      nayNiskoto(() => { sgani(naryazani, '2026-01-01T00:00:00.000Z'); }),
      BYUDZHET.sgavane_ms,
    );
    const sgunato = sgani(naryazani, '2026-01-01T00:00:00.000Z');
    expect(sgunato.sverka.nared).toBe(true);

    meri(
      'fold върху слетия поток',
      nayNiskoto(() => { fold(sgunato.potok); }),
      BYUDZHET.fold_n_verigi_ms,
    );

    let veriga = await proveriVerigata(sabitiya, SHA);
    meri(
      'proveriVerigata',
      await nayNiskotoChakashto(async () => { veriga = await proveriVerigata(sabitiya, SHA); }),
      BYUDZHET.veriga_ms,
    );
    expect(veriga.tsyala).toBe(true);

    // append през Вратата, в паметта — колко записа в секунда.
    // ВСЯКО пускане иска СВОЙ дневник и свои `opId`: повторен ключ връща същия
    // резултат, без да пише (правило 5), и мярката щеше да мери идемпотентност.
    const KOLKO = 1000;
    const msNaPartida = await nayNiskotoChakashto(async (krug) => {
      const dnevnik = new DnevnikVPametta();
      const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
      for (let i = 1; i <= KOLKO; i += 1) {
        await vrata.dobavi({
          opId: `m-${krug}-${i}`, ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL, actor: 'x',
          type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: `I-${i}` },
          payload: { adres: `А ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
        });
      }
    });
    const naSekunda = KOLKO / (msNaPartida / 1000);
    izmereno['append'] = `${Math.round(naSekunda)}/с · бюджет ${BYUDZHET.append_na_sekunda}/с`;
    expect(naSekunda).toBeGreaterThan(BYUDZHET.append_na_sekunda);

    // СТУДЕН СТАРТ: наливане в IndexedDB, после отваряне и четене отначало.
    //
    // Всяко пускане иска СВОЯ база — второто отваряне на същата вече е топло,
    // тоест би мерило нещо друго. Наливането стои ИЗВЪН часовника: то е
    // подготовка, не студен старт.
    let procheteni: Sabitie[] = [];
    let studenMs = Infinity;
    for (let krug = 0; krug <= POVTORENIYA; krug += 1) {
      const ime = `merki-${Date.now()}-${krug}`;
      const palnene = await otvoriDnevnik(ime);
      for (const s of sabitiya) await palnene.dobavi(s);
      palnene.zatvori();

      const t = performance.now();
      const studen = await otvoriDnevnik(ime);
      procheteni = await studen.chetiVsichki(NAEMATEL);
      const izteklo = performance.now() - t;
      studen.zatvori();
      // Кръг НУЛА е загрявката · тя плаща компилацията, не носителя.
      if (krug > 0) studenMs = Math.min(studenMs, izteklo);
    }
    meri('студен старт (отваряне + четене)', studenMs, BYUDZHET.studen_start_ms);
    expect(procheteni.length).toBe(BROY);

    console.log('\n═══ МЕРКИТЕ ═══');
    for (const [ime2, stoynost] of Object.entries(izmereno)) {
      console.log(`  ${ime2}: ${stoynost}`);
    }
  }, 180_000);
});
