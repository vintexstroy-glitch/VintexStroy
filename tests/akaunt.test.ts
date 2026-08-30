/**
 * ДВАТА АКАУНТА · вторият критерий на матрицата (ADR-007).
 *
 * Дотук ключът беше закован ред в `app/main.ts` и вторият акаунт не
 * съществуваше, колкото и планът да го позволява. Тези тестове пазят трите
 * неща, които правят разликата между „два акаунта" и „една обща купчина":
 *
 *   1. ИЗОЛАЦИЯТА е пълна и в двете посоки — през Журнала, през Огледалото и
 *      през курсора на всеки (правило 6: курсор на наемател, не общ).
 *   2. Веригата на всеки акаунт е СВОЯ. Чуждото събитие не влиза в моя `prevHash`.
 *   3. Старият Журнал от Алфа не се преселва: `naematel` влиза в хеша, значи
 *      преписването му е ново съдържание на старо събитие (правила 1 и 4).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { proveriVerigata } from '../src/yadro/hash.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  GreshkaAkaunt,
  KLYUCH_OT_ALFA,
  klyuchNaAkaunta,
  koyZhurnal,
  sDumiZaAkaunta,
  svediImeyl,
} from '../src/domein/akaunt.js';
import type { Samolichnost } from '../src/yadro/samolichnost.js';
import { SHA } from './pomoshtni.js';

const IVO: Samolichnost = {
  dostavchik: 'google',
  imeyl: 'vintexstroy@gmail.com',
  ime: 'Иво',
  hranilishte: 'безплатно',
  nachin: 'dostavchik',
  rolya: 'sobstvenik',
  svarzani: [],
};

/** Двама собственика върху ЕДИН носител — най-строгият случай за изолацията. */
function dvamata() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  const napravi = (akaunt: string, imeyl: string) => {
    let tik = 0;
    return new Deystviya({
      vrata,
      dnevnik,
      naematel: akaunt,
      actor: imeyl,
      chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
    });
  };
  return {
    dnevnik,
    parviyat: napravi('ivo@primer.bg', 'ivo@primer.bg'),
    vtoriyat: napravi('mira@primer.bg', 'mira@primer.bg'),
  };
}

async function sImot(d: Deystviya, id: string, adres: string): Promise<void> {
  await d.dobaviImot(id, { adres, edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: `op-${id}` });
}

describe('ключът на акаунта', () => {
  it('е имейлът, сведен до един вид', () => {
    expect(klyuchNaAkaunta(IVO)).toBe('vintexstroy@gmail.com');
    expect(klyuchNaAkaunta({ ...IVO, imeyl: '  Ivo@Gmail.COM ' })).toBe('ivo@gmail.com');
  });

  it('един акаунт с две изписвания НЕ става два Журнала', () => {
    // Точно това би разцепило историята на две и половината би „изчезнала".
    expect(svediImeyl('Ivo@Gmail.com')).toBe(svediImeyl('ivo@gmail.com'));
  });

  it('свежда и уникода · едно „й" = един ключ', () => {
    const nfc = 'йордан@primer.bg'.normalize('NFC');
    const nfd = 'йордан@primer.bg'.normalize('NFD');
    expect(nfc === nfd).toBe(false); // два различни низа...
    expect(svediImeyl(nfc)).toBe(svediImeyl(nfd)); // ...един акаунт
  });

  it('празният имейл ГРЪМВА, вместо да отвори акаунта на никого', () => {
    expect(() => klyuchNaAkaunta({ ...IVO, imeyl: '' })).toThrow(GreshkaAkaunt);
    expect(() => klyuchNaAkaunta({ ...IVO, imeyl: '   ' })).toThrow(GreshkaAkaunt);
  });
});

describe('кой Журнал се отваря', () => {
  it('щом на устройството ИМА Журнал от Алфа — отваря се той', () => {
    expect(koyZhurnal(IVO, true)).toBe(KLYUCH_OT_ALFA);
  });

  it('иначе акаунтът тръгва с имейла на влезлия', () => {
    expect(koyZhurnal(IVO, false)).toBe('vintexstroy@gmail.com');
  });

  it('и екранът КАЗВА кой е отворен — иначе „къде ми отидоха данните" няма отговор', () => {
    expect(sDumiZaAkaunta(KLYUCH_OT_ALFA)).toContain('първият Журнал');
    expect(sDumiZaAkaunta('mira@primer.bg')).toContain('по имейл');
  });
});

describe('изолацията между два акаунта на един носител', () => {
  it('всеки вижда САМО своето, и в двете посоки', async () => {
    const { dnevnik, parviyat, vtoriyat } = dvamata();
    await sImot(parviyat, 'I-1', 'Малинова');
    await sImot(vtoriyat, 'I-2', 'Дианабад');

    const nego = await dnevnik.chetiVsichki('ivo@primer.bg');
    const neyni = await dnevnik.chetiVsichki('mira@primer.bg');
    expect(nego).toHaveLength(1);
    expect(neyni).toHaveLength(1);
    expect(JSON.stringify(nego)).not.toContain('Дианабад');
    expect(JSON.stringify(neyni)).not.toContain('Малинова');

    const ogledaloto = await parviyat.ogledalo();
    expect([...ogledaloto.imoti.keys()]).toEqual(['I-1']);
  });

  it('курсорът е НА АКАУНТ, не общ · вторият почва от 1, не от 2', async () => {
    // Общият курсор прескача събития — тих инцидент (правило 6).
    const { dnevnik, parviyat, vtoriyat } = dvamata();
    await sImot(parviyat, 'I-1', 'Малинова');
    await sImot(parviyat, 'I-2', 'Хисаря');
    await sImot(vtoriyat, 'I-3', 'Дианабад');

    const neyni = await dnevnik.chetiVsichki('mira@primer.bg');
    expect(neyni[0]?.seq).toBe(1);
  });

  it('веригата на всеки е СВОЯ · чуждото не влиза в prevHash', async () => {
    const { dnevnik, parviyat, vtoriyat } = dvamata();
    await sImot(parviyat, 'I-1', 'Малинова');
    await sImot(vtoriyat, 'I-2', 'Дианабад');
    await sImot(parviyat, 'I-3', 'Хисаря');

    for (const akaunt of ['ivo@primer.bg', 'mira@primer.bg']) {
      const negovi = await dnevnik.chetiVsichki(akaunt);
      expect((await proveriVerigata(negovi, SHA)).tsyala).toBe(true);
    }

    // Първото събитие на ВТОРИЯ сочи празно, а не последния хеш на първия.
    const neyni = await dnevnik.chetiVsichki('mira@primer.bg');
    expect(neyni[0]?.prevHash).toBe('');
  });

  it('един и същ opId в двата акаунта прави ДВА записа, не един', async () => {
    // Идемпотентността е В РАМКИТЕ на акаунта. Ако беше обща, вторият акаунт
    // би получил чужд резултат, без изобщо да е писал.
    const { dnevnik, parviyat, vtoriyat } = dvamata();
    await parviyat.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, { opId: 'ednakav' });
    await vtoriyat.dobaviImot('I-2', { adres: 'Дианабад', edinitsa: 'оф. 3', ploshtad_kvsm: 0 }, { opId: 'ednakav' });

    expect(await dnevnik.chetiVsichki('ivo@primer.bg')).toHaveLength(1);
    expect(await dnevnik.chetiVsichki('mira@primer.bg')).toHaveLength(1);
  });

  it('и парите не се смесват', async () => {
    const { parviyat, vtoriyat } = dvamata();
    await sImot(parviyat, 'I-1', 'Малинова');
    await parviyat.dobaviNaem(
      'N-1',
      {
        imotId: 'I-1', naemetel: 'Домакинство', naem_st: stotinki(500_00), padezhDen: 5,
        ot: '2024-01-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten',
      },
      { opId: 'op-n-1' },
    );

    expect((await parviyat.ogledalo()).naemi.size).toBe(1);
    expect((await vtoriyat.ogledalo()).naemi.size).toBe(0);
  });
});

describe('пинът · ключът се твърди с ръка (резен 46 · група В)', () => {
  it('ключът от Алфа е „vintexstroy"', () => {
    expect(KLYUCH_OT_ALFA).toBe('vintexstroy');
  });
});
