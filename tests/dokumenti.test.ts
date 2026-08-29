/**
 * ДОКУМЕНТИТЕ · закачени за разхода, делото и имота (резен 17б).
 *
 * Петте обещания, всяко от плана:
 *
 *   1. Същият файл, закачен два пъти, дава ЕДИН запис — отпечатъкът е ключът.
 *   2. Махането пише НОВ списък; старият стои в Журнала (правило 1).
 *   3. Белегът не се мени, когато нищо не се е сменило → нула събития.
 *   4. Отпечатъкът на едни и същи байтове е един · на различни — различен.
 *   5. НИТО ЕДИН БАЙТ от файла не влиза в товара. Мери се, не се твърди.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import {
  belegNaDokumentite,
  bezDokument,
  bezDokumenti,
  brutoNaDokumentite,
  GreshkaDokument,
  klyuchNaDokumenti,
  napraviDokument,
  sashtnostNaDokumenti,
  sDumiDokumentite,
  sZakachen,
  VIDOVE,
} from '../src/domein/dokumenti.js';
import { SHA } from './pomoshtni.js';
import { blokNaDokumentite } from '../app/dokumenti.js';

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
    chasovnik: () => new Date(Date.UTC(2026, 7, 29, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

function faktura(otpech: string) {
  return napraviDokument({
    ime: 'Фактура 1042.pdf',
    golemina: 84_213,
    promenen: '2026-08-20T09:14:00.000Z',
    otpechatak: otpech,
    vid: 'faktura',
  });
}

describe('документът е ДОКАЗАТЕЛСТВО, не копие', () => {
  it('отказва гласно празно име, празен отпечатък, отрицателна големина и непознат вид', () => {
    const dobar = {
      ime: 'скан.pdf',
      golemina: 10,
      promenen: '2026-08-20T09:14:00.000Z',
      otpechatak: 'aa',
      vid: 'faktura' as const,
    };
    expect(() => napraviDokument({ ...dobar, ime: '   ' })).toThrow(GreshkaDokument);
    expect(() => napraviDokument({ ...dobar, otpechatak: ' ' })).toThrow(GreshkaDokument);
    expect(() => napraviDokument({ ...dobar, golemina: -1 })).toThrow(GreshkaDokument);
    expect(() => napraviDokument({ ...dobar, golemina: 1.5 })).toThrow(GreshkaDokument);
    // видът е ИЗБРОЕН поименно; свободният текст ражда „фактура" и „Фактура"
    expect(() => napraviDokument({ ...dobar, vid: 'сметка' as never })).toThrow(GreshkaDokument);
    expect(VIDOVE).toHaveLength(5);
  });

  it('адресът иска и двете · непознато място и празен запис се отказват', () => {
    expect(() => bezDokumenti('razhod', '')).toThrow(GreshkaDokument);
    expect(() => bezDokumenti('sklad' as never, 'R-1')).toThrow(GreshkaDokument);
    expect(sashtnostNaDokumenti('delo', 'D-7')).toBe('DOK:delo:D-7');
    expect(klyuchNaDokumenti('delo', 'D-7')).toBe('delo|D-7');
  });

  it('1 · СЪЩИЯТ файл втори път е ЕДИН запис · и вторият ПОПРАВЯ първия', () => {
    let z = bezDokumenti('razhod', 'R-1');
    z = sZakachen(z, faktura('otpech-1'));
    z = sZakachen(z, faktura('otpech-1'));
    expect(z.dokumenti).toHaveLength(1);

    // име като ключ щеше да сбърка: два РАЗЛИЧНИ файла с едно име
    const drug = napraviDokument({
      ime: 'Фактура 1042.pdf',
      golemina: 91_000,
      promenen: '2026-08-21T09:14:00.000Z',
      otpechatak: 'otpech-2',
      vid: 'platezhno',
    });
    z = sZakachen(z, drug);
    expect(z.dokumenti).toHaveLength(2);

    // вторият път ПОПРАВЯ: същият отпечатък, нов вид
    z = sZakachen(z, { ...faktura('otpech-1'), vid: 'protokol' });
    expect(z.dokumenti).toHaveLength(2);
    expect(z.dokumenti.find((d) => d.otpechatak === 'otpech-1')?.vid).toBe('protokol');
  });

  it('2 · махането е ЗАПИС · старият списък стои в Журнала', async () => {
    const { dnevnik, deystviya } = stend();
    const kam = 'razhod' as const;
    let z = bezDokumenti(kam, 'R-1');
    z = sZakachen(z, faktura('otpech-1'));
    z = sZakachen(z, { ...faktura('otpech-2'), vid: 'platezhno' });
    await deystviya.zakachiDokumenti(z, { opId: 'dok:1' });

    const bez = bezDokument(z, 'otpech-1');
    expect(bez.dokumenti).toHaveLength(1);
    await deystviya.zakachiDokumenti(bez, { opId: 'dok:2' });

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    const nashi = sabitiya.filter((s) => s.type === 'ДокументиЗакачени');
    expect(nashi).toHaveLength(2);
    // ПЪРВОТО събитие още носи двата документа — нищо не е презаписано
    const parvo = nashi[0]!.payload as unknown as typeof z;
    expect(parvo.dokumenti).toHaveLength(2);

    const o = await deystviya.ogledalo();
    // а Огледалото чете ПОСЛЕДНОТО: последният запис за същността бие
    expect(o.dokumenti.get(klyuchNaDokumenti(kam, 'R-1'))?.dokumenti).toHaveLength(1);
  });

  it('3 · белегът мълчи, когато нищо не се е сменило', () => {
    let z = bezDokumenti('imot', 'I-1');
    z = sZakachen(z, faktura('otpech-1'));
    const predi = belegNaDokumentite(z);

    // същият файл пак — нищо ново
    expect(belegNaDokumentite(sZakachen(z, faktura('otpech-1')))).toBe(predi);
    // редът в списъка не е факт: белегът е сортиран
    const obarnat = { ...z, dokumenti: [...z.dokumenti].reverse() };
    expect(belegNaDokumentite(obarnat)).toBe(predi);
    // нов вид на СЪЩИЯ файл ОБАЧЕ се вижда
    expect(belegNaDokumentite(sZakachen(z, { ...faktura('otpech-1'), vid: 'drugo' }))).not.toBe(
      predi,
    );
  });

  it('4 · отпечатъкът е на БАЙТОВЕТЕ · същите дават същия, различните — различен', async () => {
    const edni = new Uint8Array([0xd0, 0xa4, 0x41, 0x0a]);
    const sashti = new Uint8Array([0xd0, 0xa4, 0x41, 0x0a]);
    const drugi = new Uint8Array([0xd0, 0xa4, 0x42, 0x0a]);
    const a = await otpechatak(edni, SHA);
    expect(await otpechatak(sashti, SHA)).toBe(a);
    expect(await otpechatak(drugi, SHA)).not.toBe(a);
  });

  it('5 · НИТО ЕДИН БАЙТ на файла не влиза в товара · мери се', async () => {
    const { dnevnik, deystviya } = stend();
    // редичка, която НЕ би оцеляла в име, големина, час и sha256
    const tayna = 'ТАЙНА-СЪДЪРЖАНИЕ-НА-ФАКТУРАТА-42';
    const bayta = new Uint8Array([...tayna].map((z) => z.charCodeAt(0) & 0xff));
    const otpech = await otpechatak(bayta, SHA);

    let z = bezDokumenti('delo', 'D-7');
    z = sZakachen(
      z,
      // подава се и СЪДЪРЖАНИЕТО — точно каквото един ден някой ще подаде по
      // невнимание. `napraviDokument` изброява полетата си поименно и го
      // изпуска; разпръснат товар (`...n`) би го пренесъл в Журнала.
      napraviDokument({
        ime: 'Договор.pdf',
        golemina: bayta.length,
        promenen: '2026-08-20T09:14:00.000Z',
        otpechatak: otpech,
        vid: 'dogovor',
        vrazka: 'https://drive.google.com/file/d/xyz',
        sadarzhanie: tayna,
      } as never),
    );
    await deystviya.zakachiDokumenti(z, { opId: 'dok:1' });

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    const tsyaloto = JSON.stringify(sabitiya);
    expect(tsyaloto).toContain(otpech);
    expect(tsyaloto).not.toContain(tayna);
  });

  it('нулата се КАЗВА · и байтовете се БРОЯТ', () => {
    const prazno = bezDokumenti('razhod', 'R-1');
    expect(sDumiDokumentite(prazno)).toBe('няма закачени документи');
    expect(brutoNaDokumentite(prazno)).toBe(0);

    let z = sZakachen(prazno, faktura('otpech-1'));
    z = sZakachen(z, { ...faktura('otpech-2'), vid: 'platezhno', golemina: 1_000 });
    z = sZakachen(z, { ...faktura('otpech-3'), golemina: 2_000 });
    expect(sDumiDokumentite(z)).toBe('2 × фактура · 1 × платежно');
    expect(brutoNaDokumentite(z)).toBe(84_213 + 1_000 + 2_000);
  });

  it('ЗАМРАЗЕНИЯТ период НЕ спира закачането · документът не мени число', async () => {
    const { deystviya, dnevnik } = stend();
    await deystviya.podaySpravka(
      { period: '2026-07', dds_deklarirano_st: 12_000, data: '2026-08-14', belezhka: '' },
      { opId: 'spravka:1' },
    );
    let z = bezDokumenti('razhod', 'R-juli');
    z = sZakachen(z, faktura('otpech-1'));
    await expect(deystviya.zakachiDokumenti(z, { opId: 'dok:1' })).resolves.toBeTruthy();

    const o = await deystviya.ogledalo();
    expect(o.dokumenti.get(klyuchNaDokumenti('razhod', 'R-juli'))?.dokumenti).toHaveLength(1);
  });

  it('ЕКРАНЪТ КАЗВА замразеното · и мълчи, когато месецът е отворен', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiRazhod(
      'R-mart',
      {
        potok: 'fakturi',
        dostavchik: 'Материали ООД',
        opis: 'цимент',
        suma_st: 60_000,
        sektor: 'pokupki-materiali',
        nachin: 'банка',
        data: '2026-03-14',
        dokument: '1042',
      },
      { opId: 'razhod:1' },
    );

    // ОТВОРЕН месец · блокът мълчи: изречение, което стои винаги, не е новина
    const otvoren = blokNaDokumentite(await deystviya.ogledalo(), 'razhod', 'R-mart');
    expect(otvoren).not.toContain('ЗАМРАЗЕН');

    await deystviya.podaySpravka(
      { period: '2026-03', dds_deklarirano_st: 12_000, data: '2026-04-10', belezhka: '' },
      { opId: 'spravka:1' },
    );

    // ЗАМРАЗЕН месец · закачането пак работи, и екранът казва ЗАЩО (правило 15)
    const zamrazen = blokNaDokumentite(await deystviya.ogledalo(), 'razhod', 'R-mart');
    expect(zamrazen).toContain('ЗАМРАЗЕН');
    expect(zamrazen).toContain('2026-03');
    expect(zamrazen).toContain('не мени нито едно число');
  });

  it('`opId` носи ДЕЙСТВИЕТО · повторният връща същото, без втори запис', async () => {
    const { dnevnik, deystviya } = stend();
    let z = bezDokumenti('imot', 'I-1');
    z = sZakachen(z, faktura('otpech-1'));
    await deystviya.zakachiDokumenti(z, { opId: 'dok:1' });
    await deystviya.zakachiDokumenti(z, { opId: 'dok:1' });
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya.filter((s) => s.type === 'ДокументиЗакачени')).toHaveLength(1);
  });
});
