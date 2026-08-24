/**
 * КОЛОННОТО ПРАВО · Вижда · Скрито · и защо „Редактира" не се раздава.
 *
 * Петте обещания, които се пазят тук — всяко от негово изречение:
 *
 *   1. Затворена колона не се редактира от НИКОГО, дори от собственика.
 *      („Затворената колона от всякъде е само скриване.")
 *   2. Скритата колона НЕ мени нито един сбор.
 *      („Сметките остават, ако са скрити, и се смятат и в двата варианта.")
 *   3. Правото се записва в Журнала и скрий → покажи → скрий не се губи.
 *   4. Служителят се записва, не се кани — и не изчезва, а сменя роля.
 *   5. Наблюдателят не редактира дори променяща се колона.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { napraviModel } from '../src/iztochnik/model.js';
import { chislovi, vDvataSbora } from '../src/domein/chisla.js';
import {
  belegNaPravo,
  GreshkaPravo,
  mozheDaRedaktiraKolona,
  napraviPrava,
  pravoNaKolona,
  sPrevklyuchenaVidimost,
  vidimiKoloni,
  vidNaKolona,
} from '../src/domein/kolonno.js';
import {
  belegNaSluzhitel,
  GreshkaSluzhitel,
  napraviSluzhitel,
  podredeni,
} from '../src/domein/sluzhiteli.js';
import {
  listOtTablitsa,
  obrazetsOtModel,
  ZNAK_ZATVORENA,
} from '../src/iznos/ot-model.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import { napraviButon, opisNaDeystvie, posokaNa } from '../src/domein/butoni.js';
import { IZDANIYA, SEGA } from '../src/izdanie.js';
import { PLAN_PO_PODRAZBIRANE } from '../src/domein/planove.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const BAMSTERA = 'ivaylo85petkov@gmail.com';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const GLAVA = 'Дата;Основание;Контрагент;Сума;Начислено ДДС';

function model(zatvoreni: readonly number[] = []) {
  return napraviModel({
    klyuch: 'Банка ОББ',
    tablitsa: otCSV(`${GLAVA}\n05.04.2026;цимент;Материали ООД;600,00;100,00`, 'ОББ'),
    redNaGlavata: 0,
    koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3 },
    zatvoreni,
  });
}

describe('видът на колоната', () => {
  it('без обявяване всяка колона е ПРОМЕНЯЩА СЕ', () => {
    const m = model();
    expect(vidNaKolona(m, 3)).toBe('promenlyva');
    expect(m.zatvoreni).toEqual([]);
  });

  it('обявената е ЗАТВОРЕНА и списъкът се подрежда', () => {
    const m = model([4, 3]);
    expect(m.zatvoreni).toEqual([3, 4]);
    expect(vidNaKolona(m, 4)).toBe('zatvorena');
  });
});

describe('кой какво редактира', () => {
  it('затворена колона не се редактира дори от СТОПАНИНА', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'sobstvenik', vid: 'zatvorena', pravo: 'vizhda' }),
    ).toBe(false);
  });

  it('редакторът редактира променяща се, която вижда', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'redaktor', vid: 'promenlyva', pravo: 'vizhda' }),
    ).toBe(true);
  });

  it('скритата не се редактира — не се и вижда', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'redaktor', vid: 'promenlyva', pravo: 'skrito' }),
    ).toBe(false);
  });

  it('наблюдателят не редактира дори променяща се и видима', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'nablyudatel', vid: 'promenlyva', pravo: 'vizhda' }),
    ).toBe(false);
  });
});

describe('правото на един служител', () => {
  it('без записано право се вижда всичко', () => {
    expect(pravoNaKolona(undefined, 3)).toBe('vizhda');
    expect(vidimiKoloni([0, 1, 2, 3], undefined)).toEqual([0, 1, 2, 3]);
  });

  it('имейлът се сваля в малки букви — един човек, не двама', () => {
    const p = napraviPrava({ imeyl: 'Ivaylo85Petkov@gmail.com', model: 'Банка ОББ', skriti: [3] });
    expect(p.imeyl).toBe(BAMSTERA);
  });

  it('скритата колона пада от видимите', () => {
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] });
    expect(pravoNaKolona(p, 3)).toBe('skrito');
    expect(vidimiKoloni([0, 1, 2, 3], p)).toEqual([0, 1, 2]);
  });

  it('без имейл и без хедър се отказва на глас', () => {
    expect(() => napraviPrava({ imeyl: '  ', model: 'Х' })).toThrow(GreshkaPravo);
    expect(() => napraviPrava({ imeyl: BAMSTERA, model: '' })).toThrow(GreshkaPravo);
  });

  it('превключването връща НОВ списък, старият не се пипа', () => {
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] });
    expect(sPrevklyuchenaVidimost(p, 3)).toEqual([]);
    expect(sPrevklyuchenaVidimost(p, 1)).toEqual([1, 3]);
    expect(p.skriti).toEqual([3]);
  });
});

describe('СКРИТОТО ПАК СЕ СМЯТА · негово изречение, пазено от машина', () => {
  it('скриването не мени нито един сбор', () => {
    const m = model();
    const t = otCSV(
      `${GLAVA}\n05.04.2026;цимент;Материали ООД;600,00;100,00\n06.04.2026;тухли;Тухли АД;240,00;40,00`,
      'ОББ',
    );
    const predi = vDvataSbora(chislovi(m, t));

    // Бамстера не вижда колоната със сумата…
    const p = napraviPrava({ imeyl: BAMSTERA, model: m.klyuch, skriti: [3] });
    expect(vidimiKoloni([0, 1, 2, 3, 4], p)).not.toContain(3);

    // …но сборът е същият. Скриването пипа екрана, не числата.
    const sled = vDvataSbora(chislovi(m, t));
    expect(sled.prihod_st).toBe(predi.prihod_st);
    expect(sled.razhod_st).toBe(predi.razhod_st);
    expect(predi.prihod_st).toBe(84_000 + 14_000);
  });

  it('изключването от сборовете е ДРУГО нещо и си остава на колоната', () => {
    const t = otCSV(`${GLAVA}\n05.04.2026;цимент;Материали ООД;600,00;100,00`, 'ОББ');
    const bez = vDvataSbora(chislovi(model(), t));
    const sIzklyuchena = vDvataSbora(
      chislovi(
        napraviModel({
          klyuch: 'Банка ОББ',
          tablitsa: t,
          redNaGlavata: 0,
          koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3 },
          izklyucheni: [4],
        }),
        t,
      ),
    );
    expect(bez.prihod_st).not.toBe(sIzklyuchena.prihod_st);
  });
});

describe('правото влиза в Журнала', () => {
  it('записва се и се чете обратно от Огледалото', async () => {
    const { deystviya } = stend();
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] });
    await deystviya.zapishiPravo(p, { opId: 'pravo:1' });

    const og = await deystviya.ogledalo();
    expect(og.prava.get(`${BAMSTERA}|Банка ОББ`)?.skriti).toEqual([3]);
  });

  it('СКРИЙ → ПОКАЖИ → СКРИЙ не се губи · `opId` носи действието', async () => {
    const { deystviya, dnevnik } = stend();
    const skrita = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] });
    const vidima = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [] });

    await deystviya.zapishiPravo(skrita, { opId: 'pravo:1' });
    await deystviya.zapishiPravo(vidima, { opId: 'pravo:2' });
    await deystviya.zapishiPravo(skrita, { opId: 'pravo:3' });

    // Ключ от СЪДЪРЖАНИЕТО би върнал резултата на първия запис и колоната
    // щеше да остане видима. Затова ключът носи действието (правило 20).
    const og = await deystviya.ogledalo();
    expect(og.prava.get(`${BAMSTERA}|Банка ОББ`)?.skriti).toEqual([3]);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(3);
  });

  it('белегът лови „нищо не се е сменило"', () => {
    const a = napraviPrava({ imeyl: BAMSTERA, model: 'М', skriti: [1, 2] });
    const b = napraviPrava({ imeyl: BAMSTERA, model: 'М', skriti: [2, 1] });
    expect(belegNaPravo(a)).toBe(belegNaPravo(b));
  });
});

describe('служителят', () => {
  it('Бамстера се записва с ролята си', async () => {
    const { deystviya } = stend();
    const chovek = napraviSluzhitel({
      imeyl: 'Ivaylo85Petkov@gmail.com',
      ime: 'Бамстера',
      rolya: 'redaktor',
    });
    expect(chovek.imeyl).toBe(BAMSTERA);

    await deystviya.zapishiSluzhitel(chovek, { opId: 'sluzhitel:1' });
    const og = await deystviya.ogledalo();
    expect(og.sluzhiteli.get(BAMSTERA)).toEqual(chovek);
  });

  it('смяната на ролята е ново събитие върху СЪЩИЯ човек', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSluzhitel(
      napraviSluzhitel({ imeyl: BAMSTERA, ime: 'Бамстера', rolya: 'redaktor' }),
      { opId: 'sluzhitel:1' },
    );
    await deystviya.zapishiSluzhitel(
      napraviSluzhitel({ imeyl: BAMSTERA, ime: 'Бамстера', rolya: 'nablyudatel' }),
      { opId: 'sluzhitel:2' },
    );

    const og = await deystviya.ogledalo();
    expect(og.sluzhiteli.size).toBe(1);
    expect(og.sluzhiteli.get(BAMSTERA)?.rolya).toBe('nablyudatel');
  });

  it('крив имейл и празно име се отказват на глас', () => {
    expect(() => napraviSluzhitel({ imeyl: 'бамстера', ime: 'Х', rolya: 'redaktor' })).toThrow(
      GreshkaSluzhitel,
    );
    expect(() => napraviSluzhitel({ imeyl: BAMSTERA, ime: ' ', rolya: 'redaktor' })).toThrow(
      GreshkaSluzhitel,
    );
  });

  it('подреждат се по име и белегът лови промяната', () => {
    const a = napraviSluzhitel({ imeyl: BAMSTERA, ime: 'Бамстера', rolya: 'redaktor' });
    const b = napraviSluzhitel({ imeyl: 'a@b.bg', ime: 'Ана', rolya: 'nablyudatel' });
    expect(podredeni([a, b]).map((s) => s.ime)).toEqual(['Ана', 'Бамстера']);
    expect(belegNaSluzhitel(a)).not.toBe(belegNaSluzhitel({ ...a, rolya: 'nablyudatel' }));
  });
});

describe('контейнерите като таблици · моделът се ПРЕТВОРЯВА', () => {
  it('образецът носи главата и ролите от модела', () => {
    const l = obrazetsOtModel(model(), 3);
    expect(l.ime).toBe('Банка ОББ');
    expect(l.koloni.map((k) => k.ime)).toEqual([
      'Дата · дата',
      'Основание · основание',
      'Контрагент · контрагент',
      'Сума · сума',
      'Начислено ДДС',
    ]);
    expect(l.redove.length).toBe(3);
    expect(l.redove[0]).toEqual(['', '', '', '', '']);
  });

  it('затворената колона носи знак — образецът не кани да се пише в нея', () => {
    const l = obrazetsOtModel(model([4]), 1);
    expect(l.koloni[4]!.ime).toContain(ZNAK_ZATVORENA);
    expect(l.koloni[3]!.ime).not.toContain(ZNAK_ZATVORENA);
  });

  it('прочетена таблица се връща навън през същия модел', () => {
    const m = model();
    const t = otCSV(
      `${GLAVA}\n05.04.2026;цимент;Материали ООД;600,00;100,00\n06.04.2026;тухли;Тухли АД;240,00;40,00`,
      'ОББ',
    );
    const l = listOtTablitsa(m, t);
    expect(l.redove.length).toBe(2);
    expect(l.redove[0]).toEqual(['05.04.2026', 'цимент', 'Материали ООД', '600,00', '100,00']);
  });

  it('и излиза като истински .xlsx — нула зависимости (правило 10)', () => {
    const baytove = rabotnaKniga([obrazetsOtModel(model(), 2)]);
    // „PK" е подписът на всеки ZIP; .xlsx е ZIP с XML вътре.
    expect(baytove[0]).toBe(0x50);
    expect(baytove[1]).toBe(0x4b);
    expect(baytove.length).toBeGreaterThan(500);
  });

  it('действие №4 вече е ПОСТРОЕНО и бутон по него се прави', () => {
    expect(opisNaDeystvie('sazdavane-tablitsa').postroeno).toBe(true);
    const b = napraviButon({
      klyuch: 'Образец ОББ',
      papka: 'Образци',
      deystvie: 'sazdavane-tablitsa',
    });
    expect(posokaNa(b.deystvie)).toBe('pishe');
  });
});

describe('изданието · Стартъп Алфа', () => {
  it('днешното издание е Алфа и казва непълнотата си на глас', () => {
    expect(SEGA.ime).toBe('Стартъп Алфа');
    expect(SEGA.opis).toContain('непълна функционалност');
  });

  it('редът е негов: приложенията идват СЛЕД HTML версията', () => {
    expect(IZDANIYA.map((i) => i.stepen)).toEqual(['alfa', 'beta', 'prilozhenie']);
    expect(IZDANIYA.at(-1)!.gotovo).toBe(false);
  });

  it('изданието и ПЛАНЪТ са две различни неща и не се сверяват', () => {
    // „Стартъп" значи и план (Професионален · онлайн), и издание (Алфа).
    // Ако някой ден се слеят, това ще падне пръв.
    expect(PLAN_PO_PODRAZBIRANE).toBe('profesionalen');
    expect(String(SEGA.stepen)).not.toBe(String(PLAN_PO_PODRAZBIRANE));
  });
});
