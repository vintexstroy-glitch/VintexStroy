/**
 * ЖИВОТНИЯТ ЦИКЪЛ НА `vite preview` · вдига се веднъж, целият проход тече върху него.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as pochakay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const PORT = Number(process.env['PROBA_PORT'] ?? 4178);
export const ADRES = `http://localhost:${PORT}/`;

/**
 * Пуска се САМИЯТ `vite.js` с текущия `node` — не `npx`. На Windows `npx` е
 * `npx.cmd`, и `spawn` без обвивка не го намира („spawn npx ENOENT"): проходът
 * падаше ПРЕДИ да тръгне (третият клас на ADR-152 — краят на реда, пътят на файла,
 * и стартерът). Пътят до `vite.js` се строи с `fileURLToPath`, по същия урок.
 */
const VITE = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));

export function pusniServer(): ChildProcess {
  const p = spawn(process.execPath, [VITE, 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  });
  p.unref();
  return p;
}

/** Спира го по платформа: на POSIX — цялата група (`-pid`); на Windows група няма. */
export function spriServer(p: ChildProcess): void {
  if (!p.pid) return;
  if (process.platform === 'win32') p.kill();
  else process.kill(-p.pid);
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
