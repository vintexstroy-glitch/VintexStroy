/**
 * ЛЕНТАТА · трите слоя на реда и четвъртият въпрос — кое се вижда (И111).
 *
 * Негово решение от 28.08, взето измежду три: **„И ДВЕТЕ · начален ред + личен"**.
 * Оттук петте обещания, които машина пази вместо окото:
 *
 *   1. Началният ред на Стопанина важи за всички.
 *   2. Моят ред ляга ОТГОРЕ и не мени неговия.
 *   3. Нов екран се появява НАКРАЯ и в двата слоя — не изчезва.
 *   4. Скриването маха от лентата, но НЕ мени реда; Таблото и Настройки не се
 *      скриват от никого.
 *   5. Дубликат в записания ред се ОТКАЗВА при входа — записан веднъж, той би
 *      рисувал пункт два пъти ЗАВИНАГИ (правило 1).
 *
 * Чистите функции се тестват БЕЗ браузър, точно както `podredba.test.ts` тества
 * своите: разместването на възли се вижда с очи и е работа на прохода, а
 * правилото „нищо не изчезва" трябва да се доказва тук.
 */

import { describe, expect, it } from 'vitest';
import {
  MRADVA_ZA_VLACHENE,
  NESKRIVAEMI,
  podredeniPunktove,
  SHIRINA_NAY_MALKO,
  SHIRINA_NAY_MNOGO,
  SHIRINA_PODRAZBIRANA,
  shirinaVGranitsi,
  sPrevklyuchenPunkt,
  vidimiPunktove,
} from '../app/lenta.js';
import { GreshkaLenta, napraviRedNaLentata, redOtZhurnala } from '../src/domein/lenta.js';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { GreshkaStopanin } from '../src/domein/stopanin.js';
import { SHA } from './pomoshtni.js';

const ZHIVI = ['imoti', 'pari', 'smetki', 'gant', 'tablo'];

describe('трите слоя на реда', () => {
  it('без нито един слой важи редът, обявен в кода', () => {
    expect(podredeniPunktove(ZHIVI, [], [])).toEqual(ZHIVI);
  });

  it('НАЧАЛНИЯТ ред на Стопанина важи, когато моят е празен', () => {
    expect(podredeniPunktove(ZHIVI, ['tablo', 'gant'], [])).toEqual([
      'tablo', 'gant', 'imoti', 'pari', 'smetki',
    ]);
  });

  it('МОЯТ ред ляга ОТГОРЕ · неговият остава непокътнат', () => {
    const osnoven = ['tablo', 'gant'];
    expect(podredeniPunktove(ZHIVI, osnoven, ['pari'])).toEqual([
      'pari', 'tablo', 'gant', 'imoti', 'smetki',
    ]);
    // Основата не е мутирана — тя идва от Журнала и се чете от всички.
    expect(osnoven).toEqual(['tablo', 'gant']);
  });

  /**
   * НОВИЯТ ЕКРАН НЕ ИЗЧЕЗВА · това е обещанието, което направи резен 14а
   * безболезнен: единайсетият екран се появи, без някой да пипа записан ред.
   */
  it('нов екран се появява НАКРАЯ и в двата слоя', () => {
    const sNov = [...ZHIVI, 'dvanadeseti'];
    const izhod = podredeniPunktove(sNov, ['tablo', 'gant'], ['pari']);
    expect(izhod.at(-1)).toBe('dvanadeseti');
    expect(izhod).toHaveLength(6);
  });

  it('изчезнал екран отпада от двата слоя, без да събори реда', () => {
    expect(podredeniPunktove(ZHIVI, ['mahnat', 'tablo'], ['nyama-go', 'pari'])).toEqual([
      'pari', 'tablo', 'imoti', 'smetki', 'gant',
    ]);
  });

  it('нито един ключ не се губи и не се удвоява', () => {
    const izhod = podredeniPunktove(ZHIVI, ['gant', 'tablo'], ['smetki']);
    expect([...izhod].sort()).toEqual([...ZHIVI].sort());
    expect(new Set(izhod).size).toBe(ZHIVI.length);
  });
});

describe('скриването е ДРУГО нещо, не ред', () => {
  it('скритият пада от лентата, но редът остава същият', () => {
    const podredeni = podredeniPunktove(ZHIVI, [], []);
    expect(vidimiPunktove(podredeni, ['pari'])).toEqual(['imoti', 'smetki', 'gant', 'tablo']);
    // Редът не е пипнат — скриването пипа ЕКРАНА и нищо друго.
    expect(podredeni).toEqual(ZHIVI);
  });

  /**
   * ТАБЛОТО Е ПЪТЯТ ОБРАТНО. Скрито, то заключва вратата отвътре: човек
   * изключва пункт и няма откъде да го върне.
   */
  it('Таблото и Настройки НЕ се скриват — дори при опит', () => {
    expect(NESKRIVAEMI).toEqual(['tablo', 'nastroyki']);
    expect(vidimiPunktove(ZHIVI, ['tablo'])).toContain('tablo');
    expect(sPrevklyuchenPunkt([], 'tablo')).toEqual([]);
    expect(sPrevklyuchenPunkt([], 'nastroyki')).toEqual([]);
  });

  it('превключването връща НОВ списък · старият не се пипа', () => {
    const bilo: readonly string[] = ['pari'];
    expect(sPrevklyuchenPunkt(bilo, 'gant')).toEqual(['pari', 'gant']);
    expect(sPrevklyuchenPunkt(bilo, 'pari')).toEqual([]);
    expect(bilo).toEqual(['pari']);
  });
});

describe('дубликатът се ОТКАЗВА при входа · Журналът не се трие', () => {
  it('чист ред минава и се връща нормализиран', () => {
    expect(napraviRedNaLentata([' imoti ', 'pari'])).toEqual(['imoti', 'pari']);
  });

  it('празният ред е ПОЗВОЛЕН · така се отменя решението, без да се трие', () => {
    expect(napraviRedNaLentata([])).toEqual([]);
  });

  it('ДВА пъти един екран се отказва с думи', () => {
    expect(() => napraviRedNaLentata(['imoti', 'pari', 'imoti'])).toThrow(GreshkaLenta);
    expect(() => napraviRedNaLentata(['imoti', 'pari', 'imoti'])).toThrow(/два пъти/);
  });

  it('празно име се отказва · редът се пише с ключове, не с дупки', () => {
    expect(() => napraviRedNaLentata(['imoti', '  '])).toThrow(GreshkaLenta);
  });

  /**
   * НЕПОЗНАТ КЛЮЧ НЕ СЕ ОТКАЗВА и това не е пропуск: ред, записан вчера, носи
   * екран, който днес е скрит по право. Отказ би заключил подреждането завинаги.
   */
  it('непознат ключ МИНАВА при записа и се отсява при рисуването', () => {
    expect(napraviRedNaLentata(['imoti', 'mahnat-utre'])).toHaveLength(2);
    expect(podredeniPunktove(ZHIVI, ['imoti', 'mahnat-utre'], [])).not.toContain('mahnat-utre');
  });

  it('ЧЕТЕНЕТО е снизходително · дубликат отвън не рисува два пъти', () => {
    // Писачът го отказва, но книга може да дойде от чужда верига или от
    // върнат архив. Пази се ПЪРВОТО появяване — то е избраното място.
    expect(redOtZhurnala(['imoti', 'pari', 'imoti'])).toEqual(['imoti', 'pari']);
    expect(redOtZhurnala(undefined)).toEqual([]);
  });
});

/**
 * САМО СТОПАНИНЪТ ЗАДАВА НАЧАЛНИЯ РЕД · и това е ЕДИНСТВЕНОТО място, където
 * може да се провери днес.
 *
 * Проходът влиза винаги като собственик (подставеният Google зашива един имейл
 * в твърденията), значи забраната НЕ може да се види в браузър. Тук се вижда —
 * и точно затова стои тук, а не като изречение в ADR.
 */
describe('началният ред се задава само от Стопанина', () => {
  const STOPANIN = 'vintexstroy@gmail.com';
  const SLUZHITEL = 'ivaylo85petkov@gmail.com';

  /** ЕДНА книга, ДВАМА писачи · точно каквото е в живота (ADR-055). */
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
        chasovnik: () => new Date(Date.UTC(2026, 7, 28, 9, 0, tik++)).toISOString(),
      });
    return { stopaninat: kato(STOPANIN), sluzhitelyat: kato(SLUZHITEL) };
  }

  it('Стопанинът записва · и Огледалото го връща', async () => {
    const { stopaninat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await stopaninat.podrediLentata({ red: ['tablo', 'imoti'] }, { opId: 'l1' });
    expect((await stopaninat.ogledalo()).redNaLentata).toEqual(['tablo', 'imoti']);
  });

  it('СЛУЖИТЕЛЯТ НЕ записва · отказва се с думи, не мълчешком', async () => {
    const { stopaninat, sluzhitelyat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await expect(
      sluzhitelyat.podrediLentata({ red: ['tablo'] }, { opId: 'l2' }),
    ).rejects.toThrow(GreshkaStopanin);
    // И книгата остава непокътната — отказът е ПРЕДИ Вратата.
    expect((await stopaninat.ogledalo()).redNaLentata).toEqual([]);
  });

  it('дубликатът не влиза в Журнала дори от Стопанина', async () => {
    const { stopaninat } = knigata();
    await stopaninat.zapishiStopanina({ imeyl: STOPANIN, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await expect(
      stopaninat.podrediLentata({ red: ['tablo', 'tablo'] }, { opId: 'l3' }),
    ).rejects.toThrow(GreshkaLenta);
  });
});

/**
 * ШИРИНАТА НА ПАНЕЛА · резен 63.
 *
 * Негова поръчка: „прибирането му с ЕДНО ДОКОСВАНЕ на разделителната линия и
 * движението на ширините на таблото с ЗАДЪРЖАНЕ." Границите не са украса: под
 * долната имената не се четат, над горната панелът изяжда таблицата.
 */
describe('ширината на панела', () => {
  it('подразбраната е тази, с която панелът живя досега', () => {
    expect(shirinaVGranitsi(SHIRINA_PODRAZBIRANA)).toBe(SHIRINA_PODRAZBIRANA);
    expect(SHIRINA_PODRAZBIRANA).toBeGreaterThanOrEqual(SHIRINA_NAY_MALKO);
    expect(SHIRINA_PODRAZBIRANA).toBeLessThanOrEqual(SHIRINA_NAY_MNOGO);
  });

  // ЧИСЛАТА СА С РЪКА · пин, не препратка. Написани като
  // `SHIRINA_NAY_MALKO - 1`, тези проверки щяха да се местят ЗАЕДНО с
  // константата и да минават на всяка нейна стойност — обход А ги брои точно
  // затова (`docs/11`).
  it('границите са ТЕЗИ числа · сменят се нарочно, не мимоходом', () => {
    expect(SHIRINA_NAY_MALKO).toBe(168);
    expect(SHIRINA_NAY_MNOGO).toBe(420);
    expect(SHIRINA_PODRAZBIRANA).toBe(232);
  });

  it('по-тясното се вдига до долната граница · имената трябва да се четат', () => {
    expect(shirinaVGranitsi(0)).toBe(168);
    expect(shirinaVGranitsi(-500)).toBe(168);
    expect(shirinaVGranitsi(167)).toBe(168);
  });

  it('по-широкото се сваля до горната · панелът не изяжда таблицата', () => {
    expect(shirinaVGranitsi(9_000)).toBe(420);
    expect(shirinaVGranitsi(421)).toBe(420);
  });

  it('вътре в границите числото ОЦЕЛЯВА · само се закръгля до цял пиксел', () => {
    expect(shirinaVGranitsi(300)).toBe(300);
    expect(shirinaVGranitsi(300.4)).toBe(300);
    expect(shirinaVGranitsi(300.6)).toBe(301);
  });

  it('нечислото пада на подразбраната, не на нула · нула би скрила панела без дума', () => {
    expect(shirinaVGranitsi(Number.NaN)).toBe(SHIRINA_PODRAZBIRANA);
    expect(shirinaVGranitsi(Number.POSITIVE_INFINITY)).toBe(SHIRINA_PODRAZBIRANA);
  });

  it('прагът за влачене е по-голям от нула · инак всяко докосване е влачене', () => {
    expect(MRADVA_ZA_VLACHENE).toBeGreaterThan(0);
  });
});
