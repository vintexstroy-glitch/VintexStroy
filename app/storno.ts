/**
 * Сторното от екрана — винаги през вратаря.
 *
 * Правилото: сторно се отказва, докато нещо живо виси на събитието
 * (`src/domein/storno.ts`). Отказът се казва с думи, не се преглъща.
 */

import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import type { Vid } from '../src/domein/sabitiya.js';
import type { Konteks } from './main.js';

export interface Izhod {
  readonly stana: boolean;
  readonly kazano: string;
  readonly vid: 'dobre' | 'zle';
}

export async function opitajStorno(k: Konteks, seq: number, vid: Vid, kakvo: string): Promise<Izhod> {
  const sabitiya = await k.deystviya.sabitiya();
  const ogledalo = await k.deystviya.ogledalo();

  const otgovor = mozheLiDaSeStornira(sabitiya, ogledalo, seq);
  if (!otgovor.mozhe) return { stana: false, kazano: otgovor.prichina, vid: 'zle' };

  const prichina = prompt(
    `Защо се сторнира ${kakvo}?\nПричината остава в Журнала завинаги.`,
    '',
  );
  if (prichina === null) return { stana: false, kazano: '', vid: 'dobre' };

  try {
    await k.deystviya.storniraj(
      `S:${crypto.randomUUID()}`,
      { pogasyavaSeq: seq, prichina: prichina.trim() || 'без посочена причина' },
      { opId: `storno:${crypto.randomUUID()}` },
      vid,
    );
  } catch (greshka) {
    return {
      stana: false,
      kazano: greshka instanceof Error ? greshka.message : String(greshka),
      vid: 'zle',
    };
  }

  return {
    stana: true,
    kazano: `Сторнирано seq ${seq}. И двете събития остават в Журнала.`,
    vid: 'dobre',
  };
}
