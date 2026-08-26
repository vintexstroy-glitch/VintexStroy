/**
 * СТОПАНИНЪТ · първото събитие в Журнала (И97 т.5 · т.8 · ADR-043).
 *
 * Тук се пази ТРОЙКАТА: правилото при Вратата (кой влиза пръв и колко пъти),
 * ролята, която се СМЯТА от него, и трите състояния на въпроса „има ли този
 * Журнал стопанин".
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  Vrata,
  VsichkoRazresheno,
  type Pravata,
} from '../src/yadro/index.js';
import { operatsiya, SHA } from './pomoshtni.js';
import {
  DVETE_ZABRANI,
  eStopanin,
  kakvoSStopanina,
  OTKRIVASHTO_SABITIE,
  rolyataNa,
} from '../src/domein/stopanin.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

function novaVrata(sParviyat: boolean, pravata: Pravata = new VsichkoRazresheno()) {
  const dnevnik = new DnevnikVPametta();
  return {
    dnevnik,
    vrata: new Vrata({
      dnevnik,
      pravata,
      sha: SHA,
      ...(sParviyat ? { parvoto: OTKRIVASHTO_SABITIE } : {}),
    }),
  };
}

/** Откриващата операция · същата навсякъде, за да не се преписва. */
function stopaninat(opId: string, imeyl = 'vintexstroy@gmail.com') {
  return operatsiya({
    opId,
    actor: imeyl,
    type: OTKRIVASHTO_SABITIE,
    sashtnost: { vid: 'stopanin', id: imeyl },
    payload: { imeyl, ime: 'Иво', dostavchik: 'google' },
  });
}

describe('Вратата · откриващото събитие', () => {
  it('ПРАЗЕН Журнал не приема нищо преди Стопанина, и го КАЗВА', async () => {
    const { vrata } = novaVrata(true);
    await expect(vrata.dobavi(operatsiya({ opId: 'op-1' }))).rejects.toMatchObject({
      kod: 'NEVALIDNO',
    });
    // Отказът назовава и какво се чака, и какво е дошло — иначе изглежда като
    // счупено приложение вместо като правило.
    await expect(vrata.dobavi(operatsiya({ opId: 'op-1' }))).rejects.toThrow(/СтопанинЗаписан/);
    await expect(vrata.dobavi(operatsiya({ opId: 'op-1' }))).rejects.toThrow(/НаемДобавен/);
  });

  it('приема го пръв, и оттам нататък всичко върви', async () => {
    const { dnevnik, vrata } = novaVrata(true);
    await vrata.dobavi(stopaninat('op-0'));
    await vrata.dobavi(operatsiya({ opId: 'op-1' }));
    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    expect(vsichki).toHaveLength(2);
    expect(vsichki[0]!.type).toBe(OTKRIVASHTO_SABITIE);
    expect(vsichki[0]!.seq).toBe(1);
  });

  /**
   * ПЪРВАТА ОТ ДВЕТЕ ЗАБРАНИ · „не може да назначи друг имейл за главен".
   * Отказът е при ВРАТАТА, не на екрана: екран без бутон се заобикаля с една
   * конзола, Врата — не.
   */
  it('ВТОРИ Стопанин не влиза — дори от същия човек', async () => {
    const { vrata } = novaVrata(true);
    await vrata.dobavi(stopaninat('op-0'));
    await expect(vrata.dobavi(stopaninat('op-2', 'drug@example.bg'))).rejects.toMatchObject({
      kod: 'NEVALIDNO',
    });
    await expect(vrata.dobavi(stopaninat('op-3'))).rejects.toThrow(/веднъж/i);
  });

  it('повторен opId връща СЪЩИЯ резултат, не отказ (правило 5)', async () => {
    const { vrata } = novaVrata(true);
    const parvo = await vrata.dobavi(stopaninat('op-0'));
    const vtoro = await vrata.dobavi(stopaninat('op-0'));
    expect(vtoro.povtoreno).toBe(true);
    expect(vtoro.hash).toBe(parvo.hash);
  });
});

describe('Вратата · Журналът, започнат ПРЕДИ правилото', () => {
  /** Журнал от преди резена: първото събитие е каквото е било тогава. */
  async function star() {
    const { dnevnik } = novaVrata(false);
    const bezPravilo = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await bezPravilo.dobavi(operatsiya({ opId: 'op-1', actor: 'ivo@example.bg' }));
    const vrata = new Vrata({
      dnevnik,
      pravata: new VsichkoRazresheno(),
      sha: SHA,
      parvoto: OTKRIVASHTO_SABITIE,
    });
    return { dnevnik, vrata };
  }

  it('приема ЕДНО дописване — от автора на ПЪРВОТО събитие', async () => {
    const { dnevnik, vrata } = await star();
    await vrata.dobavi(stopaninat('op-2', 'ivo@example.bg'));
    const vsichki = await dnevnik.chetiVsichki('vintexstroy');
    expect(vsichki).toHaveLength(2);
    expect(vsichki[1]!.type).toBe(OTKRIVASHTO_SABITIE);
  });

  /**
   * НАЙ-ВАЖНОТО в целия файл. Стопанинът на стар Журнал НЕ се избира — извежда
   * се от самата верига. Иначе всеки, който отвори чужд износ, би се вписал за
   * стопанин на чужда история с едно натискане.
   */
  it('и НЕ от когото и да е друг', async () => {
    const { vrata } = await star();
    await expect(vrata.dobavi(stopaninat('op-2', 'chuzhd@example.bg'))).rejects.toMatchObject({
      kod: 'BEZ_PRAVO',
    });
    await expect(vrata.dobavi(stopaninat('op-3', 'chuzhd@example.bg'))).rejects.toThrow(
      /ivo@example\.bg/,
    );
  });

  it('второ дописване не влиза и тук', async () => {
    const { vrata } = await star();
    await vrata.dobavi(stopaninat('op-2', 'ivo@example.bg'));
    await expect(vrata.dobavi(stopaninat('op-3', 'ivo@example.bg'))).rejects.toThrow(/веднъж/i);
  });

  /**
   * ВЪЗСТАНОВЯВАНЕТО нарочно НЕ пита за откриващото събитие: износ, направен
   * преди този резен, започва с каквото е започвал тогава. Отказ там значи
   * загубени данни заради правило, което не е важало, когато файлът е правен.
   */
  it('внос на СТАР износ минава — правилото не важи назад', async () => {
    const { dnevnik } = novaVrata(false);
    const bezPravilo = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await bezPravilo.dobavi(operatsiya({ opId: 'op-1' }));
    await bezPravilo.dobavi(operatsiya({ opId: 'op-2', sashtnost: { vid: 'naem', id: 'N-2' } }));
    const starIznos = await dnevnik.chetiVsichki('vintexstroy');

    const prazen = new DnevnikVPametta();
    const strogata = new Vrata({
      dnevnik: prazen,
      pravata: new VsichkoRazresheno(),
      sha: SHA,
      parvoto: OTKRIVASHTO_SABITIE,
    });
    const r = await strogata.vazstanovi('vintexstroy', 'ivo@example.bg', starIznos);
    expect(r.vneseni).toBe(2);
  });
});

/** Огледало от списък събития · за проверките върху ролята. */
async function ogledaloOt(
  sabitiya: readonly Parameters<typeof stopaninat>[0][],
): Promise<Ogledalo> {
  const { dnevnik, vrata } = novaVrata(true);
  for (const opId of sabitiya) await vrata.dobavi(stopaninat(opId));
  return fold(await dnevnik.chetiVsichki('vintexstroy'));
}

describe('Огледалото · Стопанинът се ЧЕТЕ, не се пази отделно', () => {
  it('вижда го от първото събитие', async () => {
    const o = await ogledaloOt(['op-0']);
    expect(o.stopanin).toBe('vintexstroy@gmail.com');
    expect(eStopanin('VintexStroy@Gmail.com', o)).toBe(true);
  });

  it('Журнал без него казва ПРАЗНО, не гадае', async () => {
    const { dnevnik } = novaVrata(false);
    const bez = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await bez.dobavi(operatsiya({ opId: 'op-1' }));
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(o.stopanin).toBe('');
    expect(eStopanin('vintexstroy@gmail.com', o)).toBe(false);
  });
});

describe('ролята се СМЯТА от Стопанина, не се раздава', () => {
  it('Стопанинът е собственик ВИНАГИ · първата забрана', async () => {
    const o = await ogledaloOt(['op-0']);
    // Дори да го впишат за наблюдател в списъка със служители, ролята му не
    // мърда: „не може сам да си отнеме правата".
    const sasSluzhitel: Ogledalo = {
      ...o,
      sluzhiteli: new Map([
        ['vintexstroy@gmail.com', { imeyl: 'vintexstroy@gmail.com', ime: 'Иво', rolya: 'nablyudatel' as const }],
      ]),
    };
    expect(rolyataNa('vintexstroy@gmail.com', sasSluzhitel)).toBe('sobstvenik');
  });

  it('служителят носи СВОЯТА роля', async () => {
    const o = await ogledaloOt(['op-0']);
    const sasSluzhitel: Ogledalo = {
      ...o,
      sluzhiteli: new Map([
        ['petar@example.bg', { imeyl: 'petar@example.bg', ime: 'Петър', rolya: 'redaktor' as const }],
      ]),
    };
    expect(rolyataNa('petar@example.bg', sasSluzhitel)).toBe('redaktor');
  });

  it('непознат имейл НАБЛЮДАВА · най-тясното, не най-широкото', async () => {
    const o = await ogledaloOt(['op-0']);
    expect(rolyataNa('chuzhd@example.bg', o)).toBe('nablyudatel');
  });

  /**
   * Журнал БЕЗ стопанин не понижава никого. Мълчаливото понижаване би заключило
   * собственика извън собствения му Журнал заради резен, който той не е искал.
   */
  it('Журнал без стопанин не отнема права', async () => {
    const { dnevnik } = novaVrata(false);
    const bez = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await bez.dobavi(operatsiya({ opId: 'op-1' }));
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(rolyataNa('kojto-i-da-e@example.bg', o)).toBe('sobstvenik');
  });
});

describe('трите състояния на въпроса „има ли стопанин"', () => {
  it('ПРАЗЕН Журнал · пише се сега', async () => {
    const { dnevnik } = novaVrata(true);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    const r = kakvoSStopanina('ivo@example.bg', o, undefined);
    expect(r.sastoyanie).toBe('prazen-zhurnal');
    expect(r.mozheDaZapishe).toBe(true);
  });

  it('ЗАПОЧНАТ Журнал · дописва го само авторът на първото събитие', async () => {
    const { dnevnik } = novaVrata(false);
    const bez = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    await bez.dobavi(operatsiya({ opId: 'op-1', actor: 'ivo@example.bg' }));
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));

    const negov = kakvoSStopanina('ivo@example.bg', o, 'ivo@example.bg');
    expect(negov.sastoyanie).toBe('chaka-dopisvane');
    expect(negov.mozheDaZapishe).toBe(true);

    const chuzhd = kakvoSStopanina('chuzhd@example.bg', o, 'ivo@example.bg');
    expect(chuzhd.mozheDaZapishe).toBe(false);
    expect(chuzhd.kazva).toContain('ivo@example.bg');
  });

  it('ГОТОВ Журнал · нищо не се пише повече', async () => {
    const o = await ogledaloOt(['op-0']);
    const r = kakvoSStopanina('vintexstroy@gmail.com', o, 'vintexstroy@gmail.com');
    expect(r.sastoyanie).toBe('ima');
    expect(r.mozheDaZapishe).toBe(false);
  });
});

describe('двете забрани стоят изписани', () => {
  it('и са именно ДВЕ, поименно', () => {
    expect(DVETE_ZABRANI).toHaveLength(2);
    expect(DVETE_ZABRANI[0]).toContain('не може сам да си отнеме правата');
    expect(DVETE_ZABRANI[1]).toContain('друг имейл за главен');
  });
});
