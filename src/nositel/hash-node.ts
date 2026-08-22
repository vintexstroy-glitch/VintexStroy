/**
 * Хеш за Node — за тестовете и за носител „Б · свой сървър".
 * В браузъра стои `hash-web.ts`. Портът `Sha256` не знае разликата.
 */

import type { Sha256 } from '../yadro/hash.js';

export const sha256Node: Sha256 = async (danni) => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(danni, 'utf8').digest('hex');
};
