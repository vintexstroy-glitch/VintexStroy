/**
 * ЖИВОТНИЯТ ЦИКЪЛ НА `vite preview` · вдига се веднъж, целият проход тече върху него.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as pochakay } from 'node:timers/promises';

export const PORT = Number(process.env['PROBA_PORT'] ?? 4178);
export const ADRES = `http://localhost:${PORT}/`;

export function pusniServer(): ChildProcess {
  const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  });
  p.unref();
  return p;
}

export async function pochakaySurvara(): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    try {
      const otgovor = await fetch(ADRES);
      if (otgovor.ok) return;
    } catch {
      /* още не е вдигнат */
    }
    await pochakay(250);
  }
  throw new Error(`Сървърът на ${ADRES} не тръгна.`);
}
