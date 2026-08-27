/**
 * ПОДСТАВЕНИЯТ GOOGLE · същата логика като преди пренаписването, само типизирана.
 *
 * Проходът върви БЕЗ мрежа и не може да влезе в истински акаунт. Затова тук
 * се прави истинска ключова двойка: страницата подписва жетон с частния
 * ключ, а публичният се сервира на адреса, от който приложението ги чете.
 *
 * Така се тества НАШИЯТ код по целия път — четене, шест проверки, подпис —
 * а не скриптът на Google. Подставен подпис, който минава без проверка, би
 * тествал само това, че сме извикали функция.
 */

import type { Page } from 'playwright-core';
import { webcrypto } from 'node:crypto';

/**
 * Клиентският номер · същият като в `app/vhod-google.ts`.
 *
 * Преписан е нарочно и това е ЕДИНСТВЕНОТО преписване тук: проходът трябва да
 * подписва жетон за същото приложение, а да внася от `app/` значи да вкара
 * production кода в мока. Разминат ли се двата, разделът за входа пада с
 * „жетонът е за ДРУГО приложение" — тоест проверката сама си казва.
 */
export const KLIENT_NOMER_V_PROHODA =
  '41382209788-ggjrn13mf5upp068flm6kup5u9usg5lg.apps.googleusercontent.com';

export async function postaviGoogle(stranitsa: Page): Promise<void> {
  const dvoyka = await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const publichen = await webcrypto.subtle.exportKey('jwk', dvoyka.publicKey);
  const chasten = await webcrypto.subtle.exportKey('jwk', dvoyka.privateKey);

  await stranitsa.route('https://www.googleapis.com/oauth2/v3/certs', (put) =>
    put.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ keys: [{ ...publichen, kid: 'proba', kty: 'RSA', alg: 'RS256', use: 'sig' }] }),
    }),
  );
  await stranitsa.route('https://accounts.google.com/gsi/client', (put) =>
    put.fulfill({ status: 200, contentType: 'text/javascript', body: '/* подставен */' }),
  );

  await stranitsa.addInitScript(
    ({ chasten, nomer }) => {
      delete (globalThis as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker;

      const vBase64URL = (bayta: ArrayBuffer | Uint8Array): string => {
        let dvoichno = '';
        for (const b of new Uint8Array(bayta)) dvoichno += String.fromCharCode(b);
        return btoa(dvoichno).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };
      const tekstVBase64URL = (t: string): string => vBase64URL(new TextEncoder().encode(t));

      (globalThis as unknown as { __napraviZheton: unknown }).__napraviZheton = async (
        nonce: string,
        promeni: Record<string, unknown> = {},
      ): Promise<string> => {
        const klyuch = await crypto.subtle.importKey(
          'jwk',
          { ...chasten, alg: 'RS256' },
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const glava = tekstVBase64URL(JSON.stringify({ alg: 'RS256', kid: 'proba', typ: 'JWT' }));
        const tvardeniya = tekstVBase64URL(
          JSON.stringify({
            iss: 'https://accounts.google.com',
            aud: nomer,
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: 'vintexstroy@gmail.com',
            email_verified: true,
            name: 'Иво',
            nonce,
            sub: '1029384756',
            ...promeni,
          }),
        );
        const podpis = await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          klyuch,
          new TextEncoder().encode(`${glava}.${tvardeniya}`),
        );
        return `${glava}.${tvardeniya}.${vBase64URL(podpis)}`;
      };

      let nastroyki: { nonce: string; callback: (r: { credential: string }) => void } | null = null;
      (globalThis as unknown as { google: unknown }).google = {
        accounts: {
          id: {
            initialize: (n: { nonce: string; callback: (r: { credential: string }) => void }) => {
              nastroyki = n;
            },
            prompt: () => {},
            disableAutoSelect: () => {},
            renderButton: (kade: HTMLElement) => {
              const b = document.createElement('button');
              b.id = 'podstaven-google';
              b.type = 'button';
              b.textContent = 'Влез с Google';
              b.addEventListener('click', async () => {
                const zheton = await (
                  globalThis as unknown as { __napraviZheton: (n: string) => Promise<string> }
                ).__napraviZheton(nastroyki!.nonce);
                nastroyki!.callback({ credential: zheton });
              });
              kade.append(b);
            },
          },
        },
      };
    },
    { chasten, nomer: KLIENT_NOMER_V_PROHODA },
  );
}
