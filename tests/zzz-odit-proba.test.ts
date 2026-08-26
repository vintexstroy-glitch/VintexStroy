import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold, type Ogledalo } from '../src/ogledalo/ogledalo.js';
import { OTKRIVASHTO_SABITIE } from '../src/domein/stopanin.js';
import { safT } from '../src/iznos/saf-t.js';

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

describe('проба · датата на приключващата статия', () => {
  it('дъмп', async () => {
    const { deystviya, ogledalo } = await knigata();
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
    await deystviya.podaySpravka(
      { period: '2026-07', dds_deklarirano_st: 20000, data: '2026-08-14', belezhka: '' },
      { opId: 'op-s' },
    );
    const o = await ogledalo();
    const r = safT(o, '2026-07', KOGATO);
    const h = r.xml.slice(r.xml.indexOf('<SelectionCriteria>'), r.xml.indexOf('</SelectionCriteria>') + 21);
    const j = r.xml.slice(r.xml.indexOf('<JournalID>dds'), r.xml.indexOf('<JournalID>dds') + 900);
    console.log('HEADER:', h);
    console.log('DDS JOURNAL:', j);
    console.log('prechki:', r.prechki);
    console.log('nared:', r.nared, 'statii:', r.broiStatii);
    expect(true).toBe(true);
  });
});
