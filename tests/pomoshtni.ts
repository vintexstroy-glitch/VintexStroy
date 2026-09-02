import type { Operatsiya } from '../src/yadro/index.js';
import { sha256Node } from '../src/nositel/hash-node.js';

/** Носителят за тестовете. Ядрото нарочно няма стойност по подразбиране. */
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { Deystviya } from '../src/domein/deystviya.js';

const KOGATO_NA_MESETSA = '2026-08-25T09:00:00.000Z';

export const SHA = sha256Node;

/** Детерминистичен генератор — без Math.random, за да са тестовете повторяеми. */
export function seyalka(seme = 1): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export function operatsiya(chast: Partial<Operatsiya> & { opId: string }): Operatsiya {
  return {
    ts: '2026-08-22T09:00:00.000Z',
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    type: 'НаемДобавен',
    sashtnost: { vid: 'naem', id: 'N-1' },
    payload: {},
    ...chast,
  };
}

/**
 * ЕДИН МЕСЕЦ С ЧИСЛА · имот, наем, начисление, плащане и два разхода.
 *
 * Изнесен тук в резен 51, когато втори тест поиска същия Журнал. Копие щеше да
 * даде два месеца, които се разминават при първата поправка — а точно върху
 * този Журнал се сверява, че Активите имат ЕДИН дом.
 */
export async function mesetsSChisla(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, {
    opId: 'op-imot',
  });
  await d.dobaviNaem(
    'N-1',
    {
      imotId: 'I-1',
      naemetel: 'Наемател',
      naem_st: tsentove(1000_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-naem' },
  );
  await nachisliZaPeriod({ deystviya: d, period: '2026-08', kogato: KOGATO_NA_MESETSA });

  const vzemane = [...(await d.ogledalo()).vzemaniya.values()][0]!;
  await d.priemiPlashtane(
    'P-1',
    { vzemaneId: vzemane.id, suma_st: tsentove(800_00), nachin: 'банка', data: '2026-08-10' },
    { opId: 'op-plashtane' },
  );

  await d.zapishiRazhod(
    'R-op',
    {
      potok: 'fakturi',
      dostavchik: 'Доставчик',
      opis: 'поддръжка',
      suma_st: tsentove(300_00),
      sektor: 'pokupki-uslugi',
      nachin: 'банка',
      data: '2026-08-12',
      dokument: 'Ф-1',
      stavka: 20,
    },
    { opId: 'op-razhod-op' },
  );
  await d.zapishiRazhod(
    'R-kredit',
    {
      potok: 'krediti',
      dostavchik: 'Банка',
      opis: 'вноска',
      suma_st: tsentove(200_00),
      sektor: 'krediti',
      nachin: 'банка',
      data: '2026-08-15',
      dokument: '',
    },
    { opId: 'op-razhod-kredit' },
  );
}

/**
 * СТЕНДЪТ · Журнал в паметта, Врата с всички права и часовник, който тиктака.
 *
 * Изнесен тук в резен 51 по същата причина като `mesetsSChisla`: втори тест го
 * поиска. Часовникът е СТЪПКОВ, не истински — два записа в една милисекунда
 * биха дали еднакъв такт, а тактът е част от наредбата (правило 6).
 */
export function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 25, 9, 0, tik++)).toISOString(),
  });
  return { deystviya, dnevnik };
}
