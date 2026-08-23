/**
 * САМОЛИЧНОСТТА · вход без парола.
 *
 * Тези тестове пазят три неща, които лесно се развалят наум:
 *
 *   1. Никъде няма парола. Ако някой ден се появи поле „парола", тестът за
 *      формата на порта пада — каквото го няма, не изтича.
 *   2. Един човек е ЕДИН актьор в Журнала, дори когато влиза от три различни
 *      доставчика. Иначе историята показва трима души там, където е един.
 *   3. Наблюдателят наблюдава. Ролята не е украса на екрана.
 */

import { describe, expect, it } from 'vitest';
import {
  EdinSobstvenik,
  GreshkaVhod,
  imaKlyuch,
  IMENA_NA_DOSTAVCHITSITE,
  sParola,
  TEKST_ZA_PAROLATA,
  IMENA_NA_ROLITE,
  chetiRolya,
  mozheDaRedaktira,
  VhodVPametta,
  type Samolichnost,
} from '../src/yadro/samolichnost.js';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { fold } from '../src/ogledalo/ogledalo.js';
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

describe('входът без парола', () => {
  it('портът не приема парола — нито един метод', () => {
    const vhod = new EdinSobstvenik(IVO);
    // `vlez` взима САМО доставчик. Ако някой добави втори довод, това пада.
    expect(vhod.vlez.length).toBe(1);
    // Самата парола НИКОГА не се пази в самоличността — нито избрана, нито не.
    expect(Object.keys(IVO)).not.toContain('parola');
  });

  it('парола НЕ се появява без изричен избор', () => {
    // Правило 13, стеснено: по подразбиране няма парола. Тя е избор, не
    // подразбиране — и точно това пази този тест.
    expect(sParola(IVO)).toBe(false);
    expect(sParola({ ...IVO, nachin: 'klyuch' })).toBe(false);
    expect(sParola({ ...IVO, nachin: 'parola' })).toBe(true);
  });

  it('изборът на парола идва с ИНФОРМИРАН текст, не с празно поле', () => {
    // Човек има право да поеме риска. Да го поеме незнаейки — няма.
    expect(TEKST_ZA_PAROLATA).toMatch(/не може да ти я върне/);
    expect(TEKST_ZA_PAROLATA).toMatch(/заключен завинаги/);
    // И текстът сочи по-добрия път, вместо само да плаши.
    expect(TEKST_ZA_PAROLATA).toMatch(/Ключът на устройството/);
  });

  it('имейлът за връзка остава дори в напълно офлайн издание', () => {
    // Негови думи: остава за комуникация, дори приложението да е свалено офлайн.
    const oflayn = { ...IVO, nachin: 'klyuch' as const, imeylZaVrazka: 'ivo@example.com' };
    expect(oflayn.imeylZaVrazka).toBe('ivo@example.com');
    // Той НЕ е вход — входът си остава `nachin`.
    expect(sParola(oflayn)).toBe(false);
    expect(imaKlyuch(oflayn)).toBe(true);
  });

  it('влиза през своя доставчик и се помни', async () => {
    const vhod = new EdinSobstvenik(IVO);
    const koj = await vhod.vlez('google');
    expect(koj.imeyl).toBe('vintexstroy@gmail.com');
    expect(vhod.tekushta().imeyl).toBe('vintexstroy@gmail.com');
  });

  it('невързан доставчик отказва С ДУМИ, а не с измислена самоличност', async () => {
    const vhod = new EdinSobstvenik(IVO);
    await expect(vhod.vlez('apple')).rejects.toThrow(GreshkaVhod);
    await expect(vhod.vlez('apple')).rejects.toThrow(/Apple/);
  });

  it('вързан втори доставчик влиза за СЪЩИЯ имейл — един човек, един актьор', async () => {
    const vhod = new EdinSobstvenik(IVO);
    vhod.svarzhi('microsoft');

    const prez_google = await vhod.vlez('google');
    const prez_microsoft = await vhod.vlez('microsoft');
    expect(prez_microsoft.imeyl).toBe(prez_google.imeyl);
    expect(prez_microsoft.svarzani).toContain('microsoft');

    // Вързването е идемпотентно: втори път не удвоява реда.
    vhod.svarzhi('microsoft');
    expect(vhod.tekushta().svarzani.filter((d) => d === 'microsoft')).toHaveLength(1);
    // И собственият доставчик не влиза в списъка на вързаните.
    vhod.svarzhi('google');
    expect(vhod.tekushta().svarzani).not.toContain('google');
  });

  it('излизането НЕ трие Журнала — местно-първо', async () => {
    const vhod = new EdinSobstvenik(IVO);
    await vhod.izlez();
    expect(vhod.tekushta().imeyl).toBe('vintexstroy@gmail.com');
  });
});

describe('ключът на машината (passkey)', () => {
  it('ключът се различава от входа през доставчика', () => {
    expect(imaKlyuch(IVO)).toBe(false);
    expect(imaKlyuch({ ...IVO, nachin: 'klyuch' })).toBe(true);
  });
});

describe('ролите', () => {
  it('наблюдателят не мърда Журнала; другите двама пишат', () => {
    expect(mozheDaRedaktira(IVO)).toBe(true);
    expect(mozheDaRedaktira({ ...IVO, rolya: 'redaktor' })).toBe(true);
    expect(mozheDaRedaktira({ ...IVO, rolya: 'nablyudatel' })).toBe(false);
  });

  it('всяка роля и всеки доставчик си имат българско име за екрана', () => {
    expect(IMENA_NA_ROLITE.nablyudatel).toBe('наблюдава');
    expect(Object.values(IMENA_NA_DOSTAVCHITSITE)).toEqual(['Google', 'Microsoft', 'Apple']);
  });
});

describe('входът в паметта · за тестовете надолу', () => {
  it('сменя самоличността и отказва това, което го няма', async () => {
    const drug: Samolichnost = { ...IVO, dostavchik: 'apple', imeyl: 'drug@icloud.com', rolya: 'nablyudatel' };
    const vhod = new VhodVPametta({ google: IVO, apple: drug });

    expect(vhod.tekushta()).toBeNull();
    expect((await vhod.vlez('apple')).imeyl).toBe('drug@icloud.com');
    expect(mozheDaRedaktira(vhod.tekushta()!)).toBe(false);

    await vhod.izlez();
    expect(vhod.tekushta()).toBeNull();
    await expect(vhod.vlez('microsoft')).rejects.toThrow(GreshkaVhod);
  });
});

/**
 * ДУМАТА Е „СОБСТВЕНИК" · и старият запис не пада между ролите.
 *
 * Дотук кодът пишеше `stopanin` — дума, която НЕ се среща в нито един негов
 * ред. Преименуването пипа стойност, която ВЕЧЕ СТОИ в Журнала, а Журналът е
 * само за добавяне: старото събитие не се преписва (правило 1). Затова
 * четенето знае двете думи, а писането — само новата.
 */
describe('преименуването на ролята', () => {
  it('старата дума от Журнала се чете като новата', () => {
    expect(chetiRolya('stopanin')).toBe('sobstvenik');
    expect(chetiRolya('sobstvenik')).toBe('sobstvenik');
  });

  it('другите две роли минават непокътнати', () => {
    expect(chetiRolya('redaktor')).toBe('redaktor');
    expect(chetiRolya('nablyudatel')).toBe('nablyudatel');
  });

  it('НЕПОЗНАТА роля НЕ става тихо наблюдател', () => {
    // Мълчаливото падане към най-слабата роля изглежда безопасно, но крие
    // повредения запис: човек без права гледа празен екран и никой не знае защо.
    expect(chetiRolya('измислена')).toBe('измислена');
  });

  it('на екрана пише неговата дума', () => {
    expect(IMENA_NA_ROLITE.sobstvenik).toBe('собственик');
  });
});

/**
 * И през ЦЕЛИЯ път: старо събитие → Врата → Огледало → екран.
 *
 * Мостът в `chetiRolya` е верен само ако някой го вика. Тестът минава по
 * истинския път, вместо да проверява функцията сама за себе си.
 */
describe('стар запис за служител · през Журнала до Огледалото', () => {
  it('роля „stopanin" излиза от Огледалото като собственик', async () => {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await vrata.dobavi({
      naematel: 'vintexstroy',
      actor: 'vintexstroy@gmail.com',
      opId: 'op-star-sluzhitel',
      ts: '2026-08-01T09:00:00.000Z',
      type: 'СлужителЗаписан',
      sashtnost: { vid: 'sluzhitel', id: 'SLUZHITEL:ivo@primer.bg' },
      // ТОЧНО каквото е записано преди преименуването
      payload: { imeyl: 'ivo@primer.bg', ime: 'Иво', rolya: 'stopanin' },
    });

    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(o.sluzhiteli.get('ivo@primer.bg')?.rolya).toBe('sobstvenik');
  });
});
