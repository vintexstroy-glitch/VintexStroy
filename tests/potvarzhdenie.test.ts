/**
 * ПОТВЪРЖДЕНИЕТО С ИМЕЙЛ · честна спирачка (И94 т.1).
 *
 * Пази четири неща, всяко платено с причина:
 *   · кодът НЕ се пази — само отпечатъкът му;
 *   · кодът е в ПИСМОТО и никъде другаде;
 *   · изтеклото и сгрешеното се различават С ДУМИ;
 *   · в следата за Журнала кодът го НЯМА.
 */

import { describe, expect, it } from 'vitest';
import { sha256Node } from '../src/nositel/hash-node.js';
import {
  GreshkaPotvarzhdenie,
  IMENA_ZA_KAKVO,
  ZA_KAKVO,
  ZHIVOT_V_MINUTI,
  chistKod,
  eIzteklo,
  napraviKod,
  pismoto,
  poiskay,
  proveri,
  sledata,
  type Iskane,
} from '../src/domein/potvarzhdenie.js';

const SEGA = '2026-08-24T09:00:00.000Z';

async function iskane(n: Partial<Parameters<typeof poiskay>[0]> = {}): Promise<Iskane> {
  return poiskay(
    {
      zaKakvo: 'zadacha',
      kakvo: 'сверѝ ДДС за август',
      doImeyl: 'ivaylo85petkov@gmail.com',
      kod: '123456',
      kogato: SEGA,
      ...n,
    },
    sha256Node,
  );
}

/** Часовник напред с толкова минути — за проверката на живота. */
function sled(minuti: number): string {
  return new Date(Date.parse(SEGA) + minuti * 60_000).toISOString();
}

describe('кодът', () => {
  it('е ШЕСТ цифри, дори когато случайното число е малко', () => {
    expect(napraviKod(() => Uint32Array.of(7))).toBe('000007');
    expect(napraviKod(() => Uint32Array.of(999_999))).toBe('999999');
    // Големите числа се свиват по модул — пак шест цифри, не повече.
    expect(napraviKod(() => Uint32Array.of(4_294_967_295))).toHaveLength(6);
  });

  it('интервали и тирета при преписване не пречат', () => {
    expect(chistKod('123 456')).toBe('123456');
    expect(chistKod('123-456')).toBe('123456');
  });

  it('не се приема код, който не е шест цифри', async () => {
    await expect(iskane({ kod: '123' })).rejects.toThrow(/шест цифри/);
  });
});

describe('искането', () => {
  it('пази ОТПЕЧАТЪКА, не кода', async () => {
    const i = await iskane();
    const tyaloto = JSON.stringify(i);
    expect(tyaloto).not.toContain('123456');
    expect(i.otpechatak).toBe(await sha256Node('123456'));
  });

  it('иска до кого тръгва писмото', async () => {
    await expect(iskane({ doImeyl: '   ' })).rejects.toThrow(/липсва имейл/);
  });

  it('трите неща, които се потвърждават, са изброени ПОИМЕННО', () => {
    expect([...ZA_KAKVO]).toEqual(['pusnati-agent', 'umenie', 'zadacha']);
    for (const z of ZA_KAKVO) expect(IMENA_ZA_KAKVO[z]).not.toBe('');
  });
});

describe('писмото носи кода · екранът не го носи', () => {
  it('кодът е В ПИСМОТО и се вижда изчистен', async () => {
    const p = pismoto(await iskane(), '123 456');
    expect(p.tyalo).toContain('КОД: 123456');
    expect(p.tyalo).toContain(`${ZHIVOT_V_MINUTI} минути`);
    expect(p.zaglavie).toContain('MasterBook');
  });

  it('писмото казва КАКВО се потвърждава — кодът не е гол номер', async () => {
    const p = pismoto(await iskane(), '123456');
    expect(p.tyalo).toContain('сверѝ ДДС за август');
    expect(p.tyalo).toContain('задача');
  });

  it('и какво да се направи, ако човекът не е искал това', async () => {
    expect(pismoto(await iskane(), '123456').tyalo).toContain('Ако не си искал');
  });
});

describe('проверката · отказът е С ДУМИ', () => {
  it('верният код минава', async () => {
    await expect(proveri(await iskane(), '123456', sled(1), sha256Node)).resolves.toBeUndefined();
  });

  it('верният код с интервали пак минава', async () => {
    await expect(
      proveri(await iskane(), '123 456', sled(1), sha256Node),
    ).resolves.toBeUndefined();
  });

  it('сгрешеният казва „не съвпада", а не „изтекло"', async () => {
    const grah = proveri(await iskane(), '654321', sled(1), sha256Node);
    await expect(grah).rejects.toThrow(GreshkaPotvarzhdenie);
    await expect(grah).rejects.toThrow(/не съвпада/);
  });

  it('животът е ПЕТНАЙСЕТ минути · числото се твърди, не се чете', () => {
    // Границите отдолу се пишат с РЪКА (15 и 16). Смятани от самата константа
    // (`ZHIVOT_V_MINUTI + 1`), те се местят ЗАЕДНО с нея: разтегната на час,
    // тя оставя и двете проверки зелени — тоест те мерят себе си, не кода.
    expect(ZHIVOT_V_MINUTI).toBe(15);
  });

  it('изтеклият казва „изтекло" — човекът иска НОВО писмо, не нов опит', async () => {
    const grah = proveri(await iskane(), '123456', sled(16), sha256Node);
    await expect(grah).rejects.toThrow(/изтекло/);
  });

  it('изтичането е точно на границата, не преди нея', async () => {
    const i = await iskane();
    expect(eIzteklo(i, sled(15))).toBe(false);
    expect(eIzteklo(i, sled(16))).toBe(true);
  });

  it('счупено време брои за изтекло — неясното не пуска', async () => {
    expect(eIzteklo(await iskane(), 'вчера')).toBe(true);
  });
});

describe('следата за Журнала', () => {
  it('носи КАКВО · ДО КОГО · КОГА и НИЩО повече', async () => {
    const s = sledata(await iskane(), sled(2));
    expect(s).toEqual({
      zaKakvo: 'zadacha',
      kakvo: 'сверѝ ДДС за август',
      doImeyl: 'ivaylo85petkov@gmail.com',
      kogato: sled(2),
    });
  });

  it('в нея НЯМА нито кода, нито отпечатъка му', async () => {
    const tyaloto = JSON.stringify(sledata(await iskane(), sled(2)));
    expect(tyaloto).not.toContain('123456');
    expect(tyaloto).not.toContain(await sha256Node('123456'));
  });
});
