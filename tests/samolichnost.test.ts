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
  IMENA_NA_ROLITE,
  mozheDaRedaktira,
  VhodVPametta,
  type Samolichnost,
} from '../src/yadro/samolichnost.js';

const IVO: Samolichnost = {
  dostavchik: 'google',
  imeyl: 'vintexstroy@gmail.com',
  ime: 'Иво',
  hranilishte: 'безплатно',
  nachin: 'dostavchik',
  rolya: 'stopanin',
  svarzani: [],
};

describe('входът без парола', () => {
  it('портът не приема парола — нито един метод', () => {
    const vhod = new EdinSobstvenik(IVO);
    // `vlez` взима САМО доставчик. Ако някой добави втори довод, това пада.
    expect(vhod.vlez.length).toBe(1);
    expect(Object.keys(IVO)).not.toContain('parola');
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
