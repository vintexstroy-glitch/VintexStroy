/**
 * НАЧАЛНИЯТ ИЗГЛЕД НА ЕКРАНА · ред на секциите + сгъване, от Стопанина за
 * всички (резен 86 · И126 · ADR-144).
 *
 * Дословният брат на лентата (И111 · ADR-066): Стопанинът задава начален
 * изглед със СЪБИТИЕ, всеки пренарежда и сгъва за себе си отгоре, без запис.
 * ADR-117 и ADR-118 държаха това до негова дума — И126 („довърши всичко
 * останало") я даде.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { GreshkaStopanin } from '../src/domein/stopanin.js';
import { podredi } from '../app/podredba.js';
import { SHA } from './pomoshtni.js';

const STOPANIN = 'vintexstroy@gmail.com';
const SLUZHITEL = 'ivaylo85petkov@gmail.com';

/** ЕДНА книга, ДВАМА писачи · шаблонът на лентата (ADR-055). */
function knigata() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const kato = (actor: string) =>
    new Deystviya({
      vrata,
      dnevnik,
      naematel: 'vintexstroy',
      actor,
      chasovnik: () => new Date(Date.UTC(2026, 8, 1, 9, 0, tik++)).toISOString(),
    });
  return { stopaninat: kato(STOPANIN), sluzhitelyat: kato(SLUZHITEL) };
}

describe('началният изглед · само Стопанинът, последното бие', () => {
  it('Стопанинът записва · и Огледалото го връща ПО ЕКРАН', async () => {
    const { stopaninat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await stopaninat.zadayNachalenIzgled(
      { ekran: 'smetki', red: ['sverki', 'parametri'], sganati: ['parametri'] },
      { opId: 'iz1' },
    );
    const o = await stopaninat.ogledalo();
    expect(o.nachalniIzgledi.get('smetki')).toEqual({ red: ['sverki', 'parametri'], sganati: ['parametri'] });
    expect(o.nachalniIzgledi.has('imoti')).toBe(false);
  });

  it('СЛУЖИТЕЛЯТ не записва · отказва се с думи, книгата остава', async () => {
    const { stopaninat, sluzhitelyat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await expect(
      sluzhitelyat.zadayNachalenIzgled({ ekran: 'smetki', red: ['sverki'], sganati: [] }, { opId: 'iz2' }),
    ).rejects.toThrow(GreshkaStopanin);
    expect((await stopaninat.ogledalo()).nachalniIzgledi.size).toBe(0);
  });

  it('последното бие · а ПРАЗНИТЕ списъци са валидна отмяна', async () => {
    const { stopaninat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await stopaninat.zadayNachalenIzgled({ ekran: 'gant', red: ['a', 'b'], sganati: ['a'] }, { opId: 'iz3' });
    await stopaninat.zadayNachalenIzgled({ ekran: 'gant', red: [], sganati: [] }, { opId: 'iz4' });
    expect((await stopaninat.ogledalo()).nachalniIzgledi.get('gant')).toEqual({ red: [], sganati: [] });
  });

  it('дубликат и празен екран се ОТКАЗВАТ при входа', async () => {
    const { stopaninat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await expect(
      stopaninat.zadayNachalenIzgled({ ekran: 'gant', red: ['a', 'a'], sganati: [] }, { opId: 'iz5' }),
    ).rejects.toThrow(/два пъти/);
    await expect(
      stopaninat.zadayNachalenIzgled({ ekran: '  ', red: [], sganati: [] }, { opId: 'iz6' }),
    ).rejects.toThrow(GreshkaStopanin);
  });
});

describe('трите слоя на секциите · като при лентата', () => {
  const ZHIVI = ['plochki', 'sverki', 'parametri', 'hedari'];

  it('началният ляга под личния · и никой не мутира никого', () => {
    const nachalen = ['hedari', 'sverki'];
    const lichen = ['parametri'];
    expect(podredi(podredi(ZHIVI, nachalen), lichen)).toEqual([
      'parametri', 'hedari', 'sverki', 'plochki',
    ]);
    expect(nachalen).toEqual(['hedari', 'sverki']);
  });

  it('без личен слой важи началният · нова секция пада накрая', () => {
    expect(podredi(podredi([...ZHIVI, 'nova'], ['hedari', 'sverki']), [])).toEqual([
      'hedari', 'sverki', 'plochki', 'parametri', 'nova',
    ]);
  });
});
