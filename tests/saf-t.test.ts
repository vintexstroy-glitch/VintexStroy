/**
 * ОДИТНИЯТ ФАЙЛ · SAF-T и контрагентите зад него (И96 т.11 · ADR-047).
 *
 * Този файл отива в държавна институция и минава автоматична валидация.
 * Затова тук се пази ТРОЙНО:
 *
 *   1. **числата във ФАЙЛА** отговарят на числата в Журнала — сверката се
 *      брои върху изхода, не върху намерението;
 *   2. **пречките се КАЗВАТ** — липсващ ЕИК, немапната сметка, несвалена
 *      номенклатура. Файл, обявен за готов, когато не е, е най-скъпата лъжа:
 *      човекът разбира от акта;
 *   3. **непозната версия на схемата ПАДА** — схемата на НАП е жива и вече е
 *      сменяна веднъж; стар генератор върху нова схема пише мълчаливо грешно.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold, type Ogledalo } from '../src/ogledalo/ogledalo.js';
import { OTKRIVASHTO_SABITIE } from '../src/domein/stopanin.js';
import { safT } from '../src/iznos/saf-t.js';
import { GreshkaShema, POZNATI_VERSII, prechkiOtShemata, proveriShema, SHEMA } from '../src/iznos/saf-t-shema.js';
import { ekvXML, sumaXML } from '../src/iznos/xml.js';
import {
  GreshkaKontragent,
  kakvoLipsva,
  klyuchNaKontragent,
  proveriKontragent,
  veretDDSNomer,
  veretEIK,
} from '../src/domein/kontragenti.js';

const GLAVEN = 'vintexstroy@gmail.com';
const KOGATO = '2026-08-25T09:00:00.000Z';
/** Истински по контролна цифра — точно затова става за тест. */
const EIK = '131071587';

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

async function mesets() {
  const vsichko = await knigata();
  const { deystviya } = vsichko;
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
  return vsichko;
}

// ── КОНТРАГЕНТИТЕ ─────────────────────────────────────────────────────────

describe('ЕИК · контролната цифра се СМЯТА, не се брои', () => {
  it('верните минават', () => {
    for (const e of ['131071587', '831641791', '121817309']) {
      expect(veretEIK(e), e).toBe(true);
    }
  });

  it('сменена цифра пада · точно това пази проверката', () => {
    expect(veretEIK('131071588')).toBe(false);
    expect(veretEIK('131071597')).toBe(false);
  });

  it('грешна дължина пада', () => {
    for (const e of ['', '12345678', '1310715870', '8316417910000']) {
      expect(veretEIK(e), e).toBe(false);
    }
  });

  it('номерът по ДДС е държава плюс номер · телефон не минава', () => {
    expect(veretDDSNomer(`BG${EIK}`)).toBe(true);
    expect(veretDDSNomer('BG8001011234')).toBe(true);
    expect(veretDDSNomer('DE123456789')).toBe(true);
    expect(veretDDSNomer('0888123456')).toBe(false);
    expect(veretDDSNomer('BG131071588')).toBe(false);
  });
});

describe('контрагентът · един дом на име, което се пише различно', () => {
  it('сведеното име слива изписванията', () => {
    expect(klyuchNaKontragent('  ЕООД   Иван ')).toBe(klyuchNaKontragent('еоод иван'));
  });

  it('празното НЕ е грешка · то е „още не е вписано"', () => {
    expect(() =>
      proveriKontragent({
        vid: 'klient',
        ime: 'Някой',
        eik: '',
        ddsNomer: '',
        adres: '',
        grad: '',
        poshtenskiKod: '',
        darzhava: '',
      }),
    ).not.toThrow();
  });

  it('но вписаното трябва да е ВЯРНО', () => {
    const osnova = {
      vid: 'klient' as const,
      ime: 'Някой',
      eik: '',
      ddsNomer: '',
      adres: '',
      grad: '',
      poshtenskiKod: '',
      darzhava: '',
    };
    expect(() => proveriKontragent({ ...osnova, eik: '131071588' })).toThrow(GreshkaKontragent);
    expect(() => proveriKontragent({ ...osnova, ddsNomer: '123' })).toThrow(GreshkaKontragent);
    expect(() => proveriKontragent({ ...osnova, darzhava: 'България' })).toThrow(GreshkaKontragent);
    expect(() => proveriKontragent({ ...osnova, ime: '   ' })).toThrow(/без име/);
  });

  it('липсващото се КАЗВА с думи, не с брой', () => {
    const lipsva = kakvoLipsva({
      vid: 'firma',
      ime: 'Моята',
      eik: '',
      ddsNomer: '',
      adres: '',
      grad: '',
      poshtenskiKod: '',
      darzhava: '',
    });
    expect(lipsva).toContain('ЕИК');
    expect(lipsva).toContain('номер по ДДС');
  });

  it('вписва се САМО от Стопанина', async () => {
    const { vrata, dnevnik } = await knigata();
    const sluzhitel = new Deystviya({
      vrata,
      dnevnik,
      naematel: 'vintexstroy',
      actor: 'petar@example.bg',
      chasovnik: () => KOGATO,
    });
    await expect(
      sluzhitel.zapishiKontragent(
        {
          vid: 'firma',
          ime: 'Моята',
          eik: EIK,
          ddsNomer: `BG${EIK}`,
          adres: 'ул. Първа 1',
          grad: 'София',
          poshtenskiKod: '1000',
          darzhava: 'BG',
        },
        { opId: 'op-k' },
      ),
    ).rejects.toThrow(GreshkaKontragent);
  });

  it('вторият запис ДОПЪЛВА, не удвоява', async () => {
    const { deystviya, ogledalo } = await knigata();
    const danni = {
      vid: 'klient' as const,
      ime: 'ЕООД Наемател',
      eik: '',
      ddsNomer: '',
      adres: '',
      grad: '',
      poshtenskiKod: '',
      darzhava: 'BG',
    };
    await deystviya.zapishiKontragent(danni, { opId: 'op-k1' });
    await deystviya.zapishiKontragent({ ...danni, ime: 'еоод наемател', eik: EIK }, { opId: 'op-k2' });
    const o = await ogledalo();
    expect(o.kontragenti.size).toBe(1);
    expect(o.kontragenti.get(klyuchNaKontragent('ЕООД Наемател'))?.eik).toBe(EIK);
  });
});

// ── СХЕМАТА ───────────────────────────────────────────────────────────────

describe('схемата · данни, не код', () => {
  it('познатата минава', () => {
    expect(() => proveriShema(SHEMA)).not.toThrow();
    expect(POZNATI_VERSII).toContain(SHEMA.versiya);
  });

  it('непозната версия ХВЪРЛЯ · схемата на НАП е жива', () => {
    expect(() => proveriShema({ ...SHEMA, versiya: '2.0.0' })).toThrow(GreshkaShema);
  });

  it('валутата е евро · съвпада с модела на приложението', () => {
    expect(SHEMA.valuta).toBe('EUR');
  });

  it('несвалените номенклатури са ПРЕЧКА, а не мълчание', () => {
    expect(prechkiOtShemata(SHEMA).length).toBeGreaterThan(0);
    expect(prechkiOtShemata({ ...SHEMA, nomenklaturiteSaSvaleni: true }).length).toBe(0);
  });
});

// ── XML ───────────────────────────────────────────────────────────────────

describe('писането на XML', () => {
  it('амперсандът и скобите се екранират', () => {
    expect(ekvXML('А & Б <виж> "тук"')).toBe('А &amp; Б &lt;виж&gt; &quot;тук&quot;');
  });

  it('управляващ знак става видим белег, не невалиден файл', () => {
    expect(ekvXML('аб')).toBe('а·б');
  });

  it('сумата се пише с ТОЧКА и две цифри, каквото и да е устройството', () => {
    expect(sumaXML(120000)).toBe('1200.00');
    expect(sumaXML(5)).toBe('0.05');
    expect(sumaXML(-1234)).toBe('-12.34');
  });

  it('нецяла сума ХВЪРЛЯ · никакъв float във файл за НАП', () => {
    expect(() => sumaXML(12.5)).toThrow(TypeError);
  });
});

// ── ФАЙЛЪТ ────────────────────────────────────────────────────────────────

describe('одитният файл за един месец', () => {
  it('носи четирите главни части в реда на схемата', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    for (const chast of ['<Header>', '<MasterFiles>', '<GeneralLedgerEntries>', '<SourceDocuments>']) {
      expect(r.xml, chast).toContain(chast);
    }
    expect(r.xml.indexOf('<Header>')).toBeLessThan(r.xml.indexOf('<MasterFiles>'));
    expect(r.xml.indexOf('<MasterFiles>')).toBeLessThan(r.xml.indexOf('<GeneralLedgerEntries>'));
    expect(r.xml.indexOf('<GeneralLedgerEntries>')).toBeLessThan(r.xml.indexOf('<SourceDocuments>'));
  });

  /**
   * СВЕРКАТА СЕ БРОИ ВЪВ ФАЙЛА · правило 7 върху изхода, не върху намерението.
   * Точно това пази проучването да не остане обещание: „преброй записи/суми в
   * Журнала срещу записи/суми във файла, разликата се записва дори нулева".
   */
  it('всички сверки затварят · и се записват дори нулеви', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.sverki.length).toBeGreaterThan(0);
    for (const s of r.sverki) expect(s.nared, s.kakvo).toBe(true);
    expect(r.nared).toBe(true);
  });

  it('броевете отговарят на Журнала', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.broiProdazhbi).toBe(1);
    expect(r.broiPokupki).toBe(1);
    expect(r.broiPlashtaniya).toBe(1);
    expect(r.broiStatii).toBe(3);
  });

  it('общата сума на фактурата стои във файла така, както е в Журнала', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.xml).toContain(`<GrossTotal>${sumaXML(120000)}</GrossTotal>`);
    expect(r.xml).toContain(`<TotalDebit>${sumaXML(r.kniga.debit_st)}</TotalDebit>`);
  });

  it('името на файла носи периода · два месеца не се смесват в папката', async () => {
    const { ogledalo } = await mesets();
    expect(safT(await ogledalo(), '2026-07', KOGATO).ime).toContain('2026-07');
  });

  it('празен месец пак дава валиден по структура файл', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-02', KOGATO);
    expect(r.broiStatii).toBe(0);
    expect(r.nared).toBe(true);
    expect(r.xml).toContain('<GeneralLedgerEntries>');
  });

  it('непозната версия на схемата спира писането', async () => {
    const { ogledalo } = await mesets();
    const o = await ogledalo();
    expect(() => safT(o, '2026-07', KOGATO, { ...SHEMA, versiya: '9.9.9' })).toThrow(GreshkaShema);
  });
});

describe('пречките · какво СПИРА подаването', () => {
  it('без вписана фирма файлът НЕ се обявява за готов', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.prechki.some((p) => p.includes('фирмата'))).toBe(true);
  });

  it('контрагент без ЕИК се назовава ПОИМЕННО', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.prechki.some((p) => p.includes('ЕООД Наемател'))).toBe(true);
  });

  it('немапнатите сметки също са пречка · и се броят', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.prechki.some((p) => p.includes('националния сметкоплан'))).toBe(true);
  });

  /**
   * ПРЕЧКА НЕ Е ГРЕШКА. Файлът се пише и с пречки — за да го погледнеш, да го
   * подадеш ТЕСТОВО в НАП и да видиш какво липсва. Само не се преструва на
   * готов.
   */
  it('пречка НЕ спира писането · файлът пак излиза', async () => {
    const { ogledalo } = await mesets();
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.prechki.length).toBeGreaterThan(0);
    expect(r.xml.length).toBeGreaterThan(100);
  });

  it('вписаните данни МАХАТ своята пречка', async () => {
    const { deystviya, ogledalo } = await mesets();
    await deystviya.zapishiKontragent(
      {
        vid: 'firma',
        ime: 'ВинтексСтрой ЕООД',
        eik: EIK,
        ddsNomer: `BG${EIK}`,
        adres: 'ул. Първа 1',
        grad: 'София',
        poshtenskiKod: '1000',
        darzhava: 'BG',
      },
      { opId: 'op-firma' },
    );
    const r = safT(await ogledalo(), '2026-07', KOGATO);
    expect(r.prechki.some((p) => p.includes('фирмата'))).toBe(false);
    expect(r.xml).toContain(`<RegistrationNumber>${EIK}</RegistrationNumber>`);
    expect(r.ime).toContain(EIK);
  });
});
