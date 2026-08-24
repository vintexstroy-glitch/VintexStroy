/**
 * ЖЕТОНЪТ · шестте проверки, всяка със свой отказ.
 *
 * Тук се пази онова, което дели вход от отворена врата. Всеки тест хваща ЕДНА
 * повреда, и всяка от тях е истинска атака или истинска досада:
 *
 *   чужд `aud`      · жетон за друго приложение, подхвърлен тук
 *   разминат `nonce`· жетон, взет от другаде
 *   изтекъл `exp`   · стар жетон, използван повторно
 *   непотвърден имейл · чужд адрес, обявен за свой
 *   подправен подпис  · пипана среда
 *   `alg: none`     · жетон, който сам казва „не ме проверявай"
 *
 * Подписът се проверява с ИСТИНСКИ ключ, направен тук с `crypto.subtle`. Тест
 * с измислен подпис би минавал и с развалена проверка.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  DOPUSK_SEK,
  GreshkaVhod,
  prochetiTvardeniya,
  proveriPodpis,
  proveriTvardeniya,
  type Tvardeniya,
} from '../src/yadro/index.js';

const NOMER = '41382209788-primer.apps.googleusercontent.com';
const NONCE = 'nonce-na-tova-vlizane';
const SEGA = new Date('2026-08-23T12:00:00.000Z');
const SEK = Math.floor(SEGA.getTime() / 1000);

const DOBRI: Tvardeniya = Object.freeze({
  iss: 'https://accounts.google.com',
  aud: NOMER,
  exp: SEK + 3600,
  email: 'vintexstroy@gmail.com',
  email_verified: true,
  name: 'Иво',
  nonce: NONCE,
  sub: '1029384756',
});

function vBase64URL(tekst: string): string {
  const bayta = new TextEncoder().encode(tekst);
  let dvoichno = '';
  for (const b of bayta) dvoichno += String.fromCharCode(b);
  return btoa(dvoichno).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Ключова двойка за подписване · истинска, направена веднъж за целия файл. */
let dvoyka: CryptoKeyPair;
let publichen: JsonWebKey;

beforeAll(async () => {
  dvoyka = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  publichen = await crypto.subtle.exportKey('jwk', dvoyka.publicKey);
});

async function podpishi(t: Tvardeniya, glava: Record<string, unknown> = {}): Promise<string> {
  const chast1 = vBase64URL(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...glava }));
  const chast2 = vBase64URL(JSON.stringify(t));
  const zaPodpis = new TextEncoder().encode(`${chast1}.${chast2}`);
  const podpis = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', dvoyka.privateKey, zaPodpis),
  );
  let dvoichno = '';
  for (const b of podpis) dvoichno += String.fromCharCode(b);
  const chast3 = btoa(dvoichno).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${chast1}.${chast2}.${chast3}`;
}

const klyuchovete = () =>
  Promise.resolve({ keys: [{ ...publichen, kid: 'k1', kty: 'RSA', n: publichen.n!, e: publichen.e! }] });

describe('четенето на жетона', () => {
  it('вади твърденията, с кирилицата наред', async () => {
    const t = prochetiTvardeniya(await podpishi({ ...DOBRI, name: 'Йордан Стоянов' }));
    expect(t.email).toBe('vintexstroy@gmail.com');
    expect(t.name).toBe('Йордан Стоянов'); // не „Ð™Ð¾Ñ€Ð´Ð°Ð½"
  });

  it('отказва това, което не е жетон — с думи', () => {
    expect(() => prochetiTvardeniya('просто текст')).toThrow(/не е от три части/);
    expect(() => prochetiTvardeniya('a.b')).toThrow(GreshkaVhod);
    expect(() => prochetiTvardeniya(`${vBase64URL('{}')}.${vBase64URL('не-json')}.x`)).toThrow(
      /не е JSON/,
    );
  });
});

describe('шестте проверки на твърденията', () => {
  const kak = { klientNomer: NOMER, nonce: NONCE, sega: SEGA };

  it('добрият жетон минава', () => {
    expect(() => proveriTvardeniya(DOBRI, kak)).not.toThrow();
  });

  it('ЧУЖД клиентски номер пада · жетон за друго приложение', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, aud: 'drugo.apps.googleusercontent.com' }, kak)).toThrow(
      /за ДРУГО приложение/,
    );
  });

  it('чужд издател пада', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, iss: 'https://zlonameren.com' }, kak)).toThrow(
      /не е издаден от Google/,
    );
  });

  it('РАЗМИНАТ nonce пада · жетон, взет от другаде', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, nonce: 'chuzhd' }, kak)).toThrow(
      /не отговаря на това влизане/,
    );
    // и липсващият nonce не минава за съвпадение
    const bez = { ...DOBRI };
    delete (bez as { nonce?: string }).nonce;
    expect(() => proveriTvardeniya(bez, kak)).toThrow(GreshkaVhod);
  });

  it('изтекъл жетон пада, и КАЗВА преди колко', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, exp: SEK - 600 }, kak)).toThrow(/изтекъл преди 10 минути/);
  });

  it('допускът от 60 секунди пази разминатия часовник', () => {
    // Изтекъл преди 30 секунди — валиден. Часовник, който бърза, не е вина.
    expect(() => proveriTvardeniya({ ...DOBRI, exp: SEK - 30 }, kak)).not.toThrow();
    expect(() => proveriTvardeniya({ ...DOBRI, exp: SEK - DOPUSK_SEK - 1 }, kak)).toThrow();
  });

  it('НЕПОТВЪРДЕН имейл не става ключ на Журнал', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, email_verified: false }, kak)).toThrow(
      /не потвърждава този имейл/,
    );
  });

  it('празен имейл пада — без него няма нито акаунт, нито actor', () => {
    expect(() => proveriTvardeniya({ ...DOBRI, email: '   ' }, kak)).toThrow(/не носи имейл/);
  });
});

describe('подписът', () => {
  it('истинският подпис минава', async () => {
    await expect(proveriPodpis(await podpishi(DOBRI), klyuchovete)).resolves.toBeUndefined();
  });

  it('ПИПАНАТА среда пада · един сменен байт стига', async () => {
    const zheton = await podpishi(DOBRI);
    const [g, sreda, p] = zheton.split('.') as [string, string, string];
    // същите твърдения, но с друг имейл — подписът вече не пасва
    const podmenena = vBase64URL(JSON.stringify({ ...DOBRI, email: 'chuzhd@primer.bg' }));
    await expect(proveriPodpis(`${g}.${podmenena}.${p}`, klyuchovete)).rejects.toThrow(
      /не съвпада — жетонът е пипан/,
    );
    expect(sreda).not.toBe(podmenena);
  });

  it('„без подпис" се ОТКАЗВА, вместо да мине', async () => {
    // Класическата подмяна: жетонът сам заявява, че не носи подпис.
    const zheton = await podpishi(DOBRI, { alg: 'none' });
    await expect(proveriPodpis(zheton, klyuchovete)).rejects.toThrow(/приема само RS256/);
  });

  it('непознат ключ се отказва', async () => {
    const zheton = await podpishi(DOBRI, { kid: 'nyakoy-drug' });
    await expect(proveriPodpis(zheton, klyuchovete)).rejects.toThrow(/не познава ключа/);
  });
});
