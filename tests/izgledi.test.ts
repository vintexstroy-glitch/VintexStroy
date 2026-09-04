/**
 * НОВИТЕ ОГЛЕДАЛА · „по имот" и „по контрагент".
 *
 * Сборовете им трябва да затварят срещу главното Огледало до цент —
 * иначе двата ъгъла лъжат различно и никой не знае кой е верният.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { poImot, poKontragent } from '../src/ogledalo/izgledi.js';
import { duljimo } from '../src/ogledalo/ogledalo.js';
import { SHA } from './pomoshtni.js';

describe('огледалата по имот и по контрагент', () => {
  async function nasadi() {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    let tik = 0;
    const d = new Deystviya({
      vrata, dnevnik, naematel: 'vintexstroy', actor: 'x',
      chasovnik: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tik++)).toISOString(),
    });

    await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0 }, { opId: 'i1' });
    await d.dobaviImot('I-2', { adres: 'Дианабад', edinitsa: 'ОФИС № 3', ploshtad_kvsm: 0 }, { opId: 'i2' });
    await d.dobaviNaem('N-1', {
      imotId: 'I-1', naemetel: 'Домакинство', naem_st: tsentove(500_00), padezhDen: 5,
      ot: '2026-01-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten',
    }, { opId: 'n1' });
    await d.dobaviNaem('N-2', {
      imotId: 'I-2', naemetel: 'Стройпласт ЕООД', naem_st: tsentove(1200_00), padezhDen: 5,
      ot: '2026-01-01', do: '', depozit_st: 0, sektor: 'naem-targovski',
    }, { opId: 'n2' });

    await d.nachisliVzemane('V-1', {
      naemId: 'N-1', period: '2026-02', osnovanie: 'наем', suma_st: tsentove(500_00), padezh: '2026-02-05',
    }, { opId: 'v1' });
    await d.nachisliVzemane('V-2', {
      naemId: 'N-2', period: '2026-02', osnovanie: 'наем', suma_st: tsentove(1200_00), padezh: '2026-02-05',
    }, { opId: 'v2' });
    // Стройпласт плаща с 10 дни закъснение; Домакинството — 2 дни предсрочно.
    await d.priemiPlashtane('P-1', {
      vzemaneId: 'V-2', suma_st: tsentove(1200_00), nachin: 'банка', data: '2026-02-15',
    }, { opId: 'p1' });
    await d.priemiPlashtane('P-2', {
      vzemaneId: 'V-1', suma_st: tsentove(200_00), nachin: 'в брой', data: '2026-02-03',
    }, { opId: 'p2' });
    await d.zapishiRazhod('R-1', {
      potok: 'fakturi', dostavchik: 'Стройпласт ЕООД ', opis: 'материали',
      suma_st: tsentove(300_00), sektor: 'pokupki-materiali', nachin: 'банка',
      data: '2026-02-20', dokument: '9',
    }, { opId: 'r1' });
    return d.ogledalo();
  }

  it('по имот: сборовете затварят срещу главното Огледало', async () => {
    const o = await nasadi();
    const karta = poImot(o);

    expect(karta.map((i) => i.adres)).toEqual(['Дианабад', 'Малинова']);
    const dianabad = karta[0]!;
    expect(dianabad.nachisleno_st).toBe(1200_00);
    expect(dianabad.sabrano_st).toBe(1200_00);
    expect(dianabad.duljimo_st).toBe(0);
    const malinova = karta[1]!;
    expect(malinova.duljimo_st).toBe(300_00);

    // Инвариантът: сборът на дълга по имоти = дължимото в главното Огледало.
    expect(karta.reduce((s, i) => s + i.duljimo_st, 0)).toBe(duljimo(o));
  });

  it('по контрагент: кой дължи, кой закъснява, и двете роли на едно име не се сливат', async () => {
    const o = await nasadi();
    const kontragenti = poKontragent(o);

    const domakinstvo = kontragenti.find((k) => k.ime === 'Домакинство')!;
    expect(domakinstvo.duljimo_st).toBe(300_00);
    expect(domakinstvo.srednoZakasnenie).toBe(-2);

    const naemodatel = kontragenti.find((k) => k.ime === 'Стройпласт ЕООД' && k.rolya === 'наемател')!;
    expect(naemodatel.duljimo_st).toBe(0);
    expect(naemodatel.srednoZakasnenie).toBe(10);

    // Същото име като ДОСТАВЧИК е отделен ред — ролите не се смесват,
    // а разстоянието в „Стройпласт ЕООД " не прави втори контрагент.
    const dostavchik = kontragenti.find((k) => k.ime === 'Стройпласт ЕООД' && k.rolya === 'доставчик')!;
    expect(dostavchik.nachisleno_st).toBe(300_00);
  });
});
