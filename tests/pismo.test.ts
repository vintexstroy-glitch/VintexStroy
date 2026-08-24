/**
 * КОНТАКТИТЕ НА НАЕМА и ПИСМОТО ПРИ ЗАКЪСНЕНИЕ.
 *
 * Негови думи: „Едно име и телефон и имейл, за да му се праща имейл, ако
 * закъснее."
 *
 * Тестът пази три неща, всяко от които е било грешка някъде другаде:
 *
 *   1. Контактите минават през ВРАТАТА и се връщат от Огледалото — не се пазят
 *      отстрани.
 *   2. Наем, записан ПРЕДИ двете полета, остава валиден и чете празно. Журналът
 *      е само за добавяне; старо събитие не се преписва (правило 1).
 *   3. Без имейл писмо НЕ тръгва. Бутон, който отваря празно писмо, е по-лош от
 *      липсващ бутон.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { adresZaPoshta, dniSDuma, napishiPismo } from '../src/domein/pismo.js';
import { SHA } from './pomoshtni.js';

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
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

async function sImot(d: Deystviya): Promise<void> {
  await d.dobaviImot(
    'I-1',
    { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' },
  );
}

const NAEM = {
  imotId: 'I-1',
  naemetel: 'Домакинство',
  naem_st: stotinki(500_00),
  padezhDen: 5,
  ot: '2024-01-01',
  do: '',
  depozit_st: 0,
  sektor: 'naem-zhilishten',
};

describe('контактите на наемателя', () => {
  it('минават през Вратата и се четат от Огледалото', async () => {
    const { deystviya } = stend();
    await sImot(deystviya);
    await deystviya.dobaviNaem(
      'N-1',
      { ...NAEM, telefon: '0888 123 456', imeyl: 'naemetel@primer.bg' },
      { opId: 'op-n-1' },
    );

    const naem = (await deystviya.ogledalo()).naemi.get('N-1')!;
    expect(naem.telefon).toBe('0888 123 456');
    expect(naem.imeyl).toBe('naemetel@primer.bg');
  });

  it('наем БЕЗ контакти остава валиден и чете празно, не undefined', async () => {
    // Точно така изглежда всеки наем, записан преди тези две полета.
    const { deystviya } = stend();
    await sImot(deystviya);
    await deystviya.dobaviNaem('N-1', NAEM, { opId: 'op-n-1' });

    const naem = (await deystviya.ogledalo()).naemi.get('N-1')!;
    expect(naem.telefon).toBe('');
    expect(naem.imeyl).toBe('');
  });

  it('поправката ги СМЕНЯ, а Журналът пази и двата записа', async () => {
    const { dnevnik, deystviya } = stend();
    await sImot(deystviya);
    await deystviya.dobaviNaem(
      'N-1',
      { ...NAEM, telefon: '0888 123 456', imeyl: 'staro@primer.bg' },
      { opId: 'op-n-1' },
    );
    await deystviya.popraviNaem(
      {
        naemId: 'N-1',
        naemetel: NAEM.naemetel,
        telefon: '0899 999 999',
        imeyl: 'novo@primer.bg',
        naem_st: NAEM.naem_st,
        padezhDen: NAEM.padezhDen,
        ot: NAEM.ot,
        do: NAEM.do,
        depozit_st: NAEM.depozit_st,
        sektor: NAEM.sektor,
        prichina: 'смени телефона и пощата',
      },
      { opId: 'op-popravka' },
    );

    const naem = (await deystviya.ogledalo()).naemi.get('N-1')!;
    expect(naem.imeyl).toBe('novo@primer.bg');
    expect(naem.telefon).toBe('0899 999 999');

    // Старата поща не изчезва — тя стои в събитието, което я е носило.
    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    const stari = vsichki.filter((s) => JSON.stringify(s.payload).includes('staro@primer.bg'));
    expect(stari).toHaveLength(1);
  });
});

describe('текстът на писмото', () => {
  const zaedno = {
    naemetel: 'Домакинство',
    imeyl: 'naemetel@primer.bg',
    imot: 'Малинова · бл. 1',
    period: '2026-08',
    padezh: '2026-08-05',
    ostatak_st: 500_00,
    dniZakasnenie: 12,
  };

  it('носи сумата, периода, падежа и закъснението', () => {
    const p = napishiPismo(zaedno);
    expect(p.do).toBe('naemetel@primer.bg');
    expect(p.tema).toContain('2026-08');
    expect(p.tema).toContain('500,00');
    expect(p.tyalo).toContain('Домакинство');
    expect(p.tyalo).toContain('Малинова · бл. 1');
    expect(p.tyalo).toContain('2026-08-05');
    expect(p.tyalo).toContain('12 дни');
  });

  it('допуска, че човекът вече е платил — това не е обвинение', () => {
    expect(napishiPismo(zaedno).tyalo).toContain('вече е направено');
  });

  it('подписът влиза само когато има име', () => {
    expect(napishiPismo(zaedno).tyalo).not.toContain('Поздрави');
    expect(napishiPismo({ ...zaedno, ot: 'Винтекс' }).tyalo).toContain('Винтекс');
  });

  it('един ден е ДЕН, не дни', () => {
    expect(dniSDuma(1)).toBe('1 ден');
    expect(dniSDuma(2)).toBe('2 дни');
    expect(napishiPismo({ ...zaedno, dniZakasnenie: 1 }).tyalo).toContain('1 ден)');
  });
});

describe('адресът за пощата', () => {
  const p = {
    do: 'naemetel@primer.bg',
    tema: 'Неплатен наем за 2026-08 · 500,00 €',
    tyalo: 'Здравейте,\nпървият ред и вторият.',
  };

  it('екранира темата и тялото ИЗЦЯЛО — иначе писмото се накълцва', () => {
    const adres = adresZaPoshta(p)!;
    expect(adres.startsWith('mailto:naemetel%40primer.bg?')).toBe(true);
    // новият ред, интервалът и „·" не бива да остават голи в адреса
    expect(adres).not.toContain('\n');
    expect(adres).not.toContain(' ');
    expect(adres).toContain('%0A');
    // и обратно: каквото влезе, това излиза
    const izvadeno = decodeURIComponent(adres.split('&body=')[1]!);
    expect(izvadeno).toBe(p.tyalo);
  });

  it('БЕЗ имейл няма адрес — празният бутон е по-лош от липсващия', () => {
    expect(adresZaPoshta({ ...p, do: '' })).toBeNull();
    expect(adresZaPoshta({ ...p, do: '   ' })).toBeNull();
  });
});
