/**
 * КОЛОННОТО ПРАВО · Редактира · Вижда · Скрито · и защо всяка само СТЕСНЯВА.
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
import { readFileSync } from 'node:fs';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { napraviModel } from '../src/iztochnik/model.js';
import { chislovi, vDvataSbora } from '../src/domein/chisla.js';
import {
  belegNaPravo,
  deystvashtoPravo,
  GreshkaPravo,
  mozheDaRedaktiraKolona,
  napraviPrava,
  poTyasnoto,
  stesniVsichki,
  PRAVA_NA_KOLONA,
  pravaOtZhurnala,
  pravoNaKolona,
  sDumi,
  sPromenenoPravo,
  vidimiKoloni,
  vidNaKolona,
  zashtoNeDeystva,
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

describe('кой какво редактира · НАЙ-ТЯСНОТО от трите тавана', () => {
  it('затворена колона не се редактира дори от СТОПАНИНА', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'sobstvenik', vid: 'zatvorena', pravo: 'redaktira' }),
    ).toBe(false);
  });

  it('редакторът редактира променяща се, която не е стеснена', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'redaktor', vid: 'promenlyva', pravo: 'redaktira' }),
    ).toBe(true);
  });

  it('скритата не се редактира — не се и вижда', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'redaktor', vid: 'promenlyva', pravo: 'skrito' }),
    ).toBe(false);
  });

  it('наблюдателят не редактира дори променяща се и невстеснена', () => {
    expect(
      mozheDaRedaktiraKolona({ rolya: 'nablyudatel', vid: 'promenlyva', pravo: 'redaktira' }),
    ).toBe(false);
  });

  it('СВАЛЕНАТА до „вижда" се ВИЖДА, но не се пипа · третата стойност', () => {
    // Новото, което И105 върна: дотук се можеше само „скрий".
    const n = { rolya: 'redaktor', vid: 'promenlyva', pravo: 'vizhda' } as const;
    expect(deystvashtoPravo(n)).toBe('vizhda');
    expect(mozheDaRedaktiraKolona(n)).toBe(false);
    // …и НЕ пада от видимите — там е разликата между двете стеснения.
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'М', samoVizhdat: [3] });
    expect(vidimiKoloni([0, 1, 2, 3], p)).toEqual([0, 1, 2, 3]);
  });

  it('изборът само СТЕСНЯВА · „редактира" не вдига наблюдател до редактор', () => {
    // Ако можеше, този екран щеше да е втора врата към достъпа — точно
    // каквото правило 14 отказва и И57 забранява с думи.
    expect(
      deystvashtoPravo({ rolya: 'nablyudatel', vid: 'promenlyva', pravo: 'redaktira' }),
    ).toBe('vizhda');
    expect(
      deystvashtoPravo({ rolya: 'sobstvenik', vid: 'zatvorena', pravo: 'redaktira' }),
    ).toBe('vizhda');
  });

  it('по-тясното от двете е СРЕЩА, не избор · и е независимо от реда', () => {
    for (const a of PRAVA_NA_KOLONA) {
      for (const b of PRAVA_NA_KOLONA) {
        expect(poTyasnoto(a, b)).toBe(poTyasnoto(b, a));
      }
    }
    expect(poTyasnoto('redaktira', 'skrito')).toBe('skrito');
    expect(poTyasnoto('vizhda', 'redaktira')).toBe('vizhda');
  });

  it('изборът без действие се КАЗВА, не се преглъща (правило 15)', () => {
    expect(zashtoNeDeystva({ rolya: 'nablyudatel', vid: 'promenlyva', pravo: 'redaktira' }))
      .toContain('наблюдава');
    expect(zashtoNeDeystva({ rolya: 'sobstvenik', vid: 'zatvorena', pravo: 'redaktira' }))
      .toContain('СМЕТКА');
    // Действащ избор мълчи — изречение до всяка клетка би било шум.
    expect(zashtoNeDeystva({ rolya: 'redaktor', vid: 'promenlyva', pravo: 'skrito' })).toBe('');
  });
});

/**
 * ПРАВИЛО 23 СТИГА ДО ЖИВИЯ КОД · и защо тестът чете ИЗВОРА.
 *
 * Дотук четирите теста горе минаваха, а правилото го нямаше на нито един
 * екран: `mozheDaRedaktiraKolona` беше викана САМО от собствения си тест.
 * Междувременно `app/redaktsiya.ts` отваряше поле в клетката, питаше за ВИДА
 * на колоната (по конструкция — затворената няма белег) и НЕ питаше за
 * ролята; а екран Имоти нарочно не иска роля. Тоест наблюдател щракваше два
 * пъти върху наема и пишеше в Журнала.
 *
 * Никой тест върху СТОЙНОСТИ не може да хване това: дефектът беше ЛИПСА НА
 * ВИКАЩ, а липсата не се наблюдава от стойност. Затова тук се чете изворът —
 * същият похват като `imena.test.ts`, и по същата причина: правило, което
 * живее в коментар, се надживява мълчаливо.
 */
describe('правило 23 има викащ в живия код', () => {
  const IZVOR = readFileSync('app/redaktsiya.ts', 'utf8');

  it('редакцията в клетката пита за ролята', () => {
    expect(IZVOR).toContain("import { mozheDaRedaktiraKolona } from '../src/domein/kolonno.js'");
    expect(IZVOR).toContain('mozheDaRedaktiraKolona({ rolya');
  });

  it('и двата входа са пазени · единичният И групата', () => {
    // Ctrl+D не минава през отварянето на поле. Един пазач би оставил групата
    // отворена врата към заключената единична клетка.
    const pazachi = IZVOR.match(/mozheDaPopraviKletka\(rolyata\)/g) ?? [];
    expect(pazachi.length).toBe(2);
  });
});

describe('правото на един служител', () => {
  it('без записано право нищо не е стеснено', () => {
    expect(pravoNaKolona(undefined, 3)).toBe('redaktira');
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

  it('смяната на думата връща НОВИ права, старите не се пипат', () => {
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] });
    expect(sPromenenoPravo(p, 3, 'redaktira').skriti).toEqual([]);
    expect(sPromenenoPravo(p, 1, 'skrito').skriti).toEqual([1, 3]);
    expect(p.skriti).toEqual([3]);
  });

  it('колоната минава между ТРИТЕ и никога не остава в два списъка', () => {
    let p = napraviPrava({ imeyl: BAMSTERA, model: 'Банка ОББ' });
    p = sPromenenoPravo(p, 2, 'skrito');
    expect(pravoNaKolona(p, 2)).toBe('skrito');
    p = sPromenenoPravo(p, 2, 'vizhda');
    expect(pravoNaKolona(p, 2)).toBe('vizhda');
    expect(p.skriti).toEqual([]);
    p = sPromenenoPravo(p, 2, 'redaktira');
    expect(pravoNaKolona(p, 2)).toBe('redaktira');
    expect(p.samoVizhdat).toEqual([]);
  });

  it('колона в ДВАТА списъка се отказва на глас — едно право на колона', () => {
    expect(() =>
      napraviPrava({ imeyl: BAMSTERA, model: 'М', skriti: [2], samoVizhdat: [2] }),
    ).toThrow(GreshkaPravo);
  });

  it('СТАРО събитие без третата стойност се чете, не събаря Огледалото', () => {
    // Правило 1: стар код чете нов Журнал, и новият чете стария. Прочетено
    // направо, липсващото `samoVizhdat` дава `undefined` и първото `.includes`
    // събаря цялото Огледало — тоест книга, писана вчера, не се отваря днес.
    const staro = { imeyl: BAMSTERA, model: 'Банка ОББ', skriti: [3] };
    const p = pravaOtZhurnala(staro);
    expect(p.samoVizhdat).toEqual([]);
    expect(pravoNaKolona(p, 3)).toBe('skrito');
    expect(pravoNaKolona(p, 1)).toBe('redaktira');
  });

  it('думите казват и двете стеснения · нула стеснения също се казва', () => {
    expect(sDumi(napraviPrava({ imeyl: BAMSTERA, model: 'М' }))).toContain('нищо не е стеснено');
    const p = napraviPrava({ imeyl: BAMSTERA, model: 'М', skriti: [1], samoVizhdat: [2] });
    expect(sDumi(p)).toContain('1 скрити');
    expect(sDumi(p)).toContain('1 само за гледане');
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

  /**
   * ПРЕНАПИСАН при голямата сверка (резен 18) — и това е поуката му.
   *
   * Дотук тестът се казваше „действие №4 вече е ПОСТРОЕНО и бутон по него се
   * прави" и пазеше ТОЧНО дефекта. Половината беше вярна: пътят Е построен
   * (`obrazetsOtModel` → `rabotnaKniga`, проверено в теста над този). Другата
   * половина — че се извървява ОТ БУТОН — не беше вярна никога: нито един
   * викащ в `app/` не се разклонява по `b.deystvie`, тъй че такъв бутон
   * отваряше избор на файл и после отказваше с „не е за четене".
   *
   * Тест, който пази половин истина, е по-скъп от липсващ: той прави дефекта
   * официален.
   */
  it('действие №4 е построено, но БЕЗ БУТОН · и създаването се отказва с думи', () => {
    expect(opisNaDeystvie('sazdavane-tablitsa').dokade).toBe('bez-buton');
    expect(posokaNa('sazdavane-tablitsa')).toBe('pishe');
    expect(() =>
      napraviButon({ klyuch: 'Образец ОББ', papka: 'Образци', deystvie: 'sazdavane-tablitsa' }),
    ).toThrow(/Свали образец/);
  });

  it('а построеното И достижимото си прави бутон както преди', () => {
    const b = napraviButon({
      klyuch: 'Извлечения ОББ',
      papka: 'Извлечения',
      deystvie: 'sveryavane-eksel',
    });
    expect(posokaNa(b.deystvie)).toBe('chete');
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

/**
 * ТРИТЕ ОБХВАТА · И103: „по цяло меню или по отделна таблица и колона от
 * хедъра". Тук се пази СРЕДНИЯТ — цялата таблица с една дума. Цялото меню е
 * същият изход, повторен на всяка таблица в групата: право на таб няма и не се
 * измисля (`hedari-po-tabove.test.ts` пази групирането).
 */
describe('цялата таблица с ЕДНА дума', () => {
  const prazni = napraviPrava({ imeyl: 'a@b.bg', model: 'Банка' });

  it('„скрито" слага ВСИЧКИ колони в скритите', () => {
    const p = stesniVsichki(prazni, 4, 'skrito');
    expect(p.skriti).toEqual([0, 1, 2, 3]);
    expect(p.samoVizhdat).toEqual([]);
  });

  it('„вижда" слага всички в СВОЯ списък, не в скритите — двете стеснения са две', () => {
    const p = stesniVsichki(prazni, 3, 'vizhda');
    expect(p.samoVizhdat).toEqual([0, 1, 2]);
    expect(p.skriti).toEqual([]);
  });

  it('„редактира" ИЗПРАЗВА двата списъка · записват се само отклоненията', () => {
    const skrito = stesniVsichki(prazni, 3, 'skrito');
    const varnato = stesniVsichki(skrito, 3, 'redaktira');
    expect(varnato.skriti).toEqual([]);
    expect(varnato.samoVizhdat).toEqual([]);
  });

  it('по-широкият обхват ЗАМЕНЯ по-тесния избор, не се наслагва върху него', () => {
    const smesen = napraviPrava({ imeyl: 'a@b.bg', model: 'Банка', skriti: [0], samoVizhdat: [2] });
    const p = stesniVsichki(smesen, 4, 'vizhda');
    expect(p.skriti).toEqual([]);
    expect(p.samoVizhdat).toEqual([0, 1, 2, 3]);
  });

  it('имейлът и хедърът НЕ се менят — обхватът пипа колоните, не двойката', () => {
    const p = stesniVsichki(prazni, 2, 'skrito');
    expect(p.imeyl).toBe('a@b.bg');
    expect(p.model).toBe('Банка');
  });

  it('таблица с НУЛА колони дава празни списъци, не гърми', () => {
    expect(stesniVsichki(prazni, 0, 'skrito').skriti).toEqual([]);
  });

  it('брой колони, който не е брой, се ОТКАЗВА гласно', () => {
    expect(() => stesniVsichki(prazni, -1, 'skrito')).toThrow(GreshkaPravo);
    expect(() => stesniVsichki(prazni, 2.5, 'skrito')).toThrow(GreshkaPravo);
  });

  it('видът на колоната се чете и от НЕ-модел · вградената таблица няма модел', () => {
    // Вградените таблици (Имоти · Наеми · …) се раждат в кода, не от файл.
    // Правилото им е ЕДНО и също: сметнатата колона не се редактира от никого.
    expect(vidNaKolona({ zatvoreni: [1, 3] }, 1)).toBe('zatvorena');
    expect(vidNaKolona({ zatvoreni: [1, 3] }, 2)).toBe('promenlyva');
  });
});
