/**
 * Сторното от екрана — винаги през вратаря.
 *
 * Правилото: сторно се отказва, докато нещо живо виси на събитието
 * (`src/domein/storno.ts`). Отказът се казва с думи, не се преглъща.
 */

import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { dumiZaGreshka } from './imoti.js';
import { VID, type Vid } from '../src/domein/sabitiya.js';
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
      kazano: dumiZaGreshka(greshka),
      vid: 'zle',
    };
  }

  return {
    stana: true,
    kazano: `Сторнирано seq ${seq}. И двете събития остават в Журнала.`,
    vid: 'dobre',
  };
}

// ── сторно на избраните · груповото минава през СЪЩАТА врата ──────────────

/** Кой вид същност носи белегът на бутона „Сторно" във всеки ред. */
const VID_OT_BELEGA: Readonly<Record<string, Vid>> = {
  stornoImot: VID.imot,
  stornoNaem: VID.naem,
  stornoVzemane: VID.vzemane,
  storno: VID.plashtane,
  stornoRazhod: VID.razhod,
};

export interface ZaStorno {
  readonly seq: number;
  readonly vid: Vid;
}

/** Чете от бутон на ред кое сторно носи — или null, ако не е сторно-бутон. */
export function stornoOtButona(b: HTMLButtonElement): ZaStorno | null {
  for (const [beleg, vid] of Object.entries(VID_OT_BELEGA)) {
    const seq = b.dataset[beleg];
    if (seq !== undefined) return { seq: Number(seq), vid };
  }
  return null;
}

/**
 * Думите на груповия изход — чиста функция, за да има тест.
 *
 * Отказаното се КАЗВА поименно, не се преглъща в брояча: „Сторнирани 2 от 3"
 * без причината за третия е точно тихият инцидент, който правило 7 забранява.
 */
export function sDumiZaStornoto(
  obshto: number,
  stanali: number,
  otkazani: readonly string[],
): string {
  const glava =
    stanali === obshto
      ? `Сторнирани ${stanali} от ${obshto}. Всички събития остават в Журнала.`
      : `Сторнирани ${stanali} от ${obshto}.`;
  return otkazani.length === 0 ? glava : `${glava} Отказани — ${otkazani.join(' · ')}`;
}

/**
 * Сторно на много редове наведнъж: ЕДНА причина, по един opId на ред.
 *
 * Питането е едно, защото решението е едно; записите са отделни, защото
 * Журналът пази събития, не партиди. Всеки ред минава през същата проверка
 * като единичното сторно — и то върху ЖИВОТО след предишния запис, затова
 * събитията се четат наново на всяка стъпка, не веднъж отгоре.
 */
export async function opitajStornoNaMnogo(
  k: Konteks,
  spisak: readonly ZaStorno[],
): Promise<Izhod> {
  if (spisak.length === 0) {
    return { stana: false, kazano: 'В избора няма ред със Сторно.', vid: 'zle' };
  }
  const prichina = prompt(
    `Защо се сторнират ${spisak.length} реда?\nЕдна причина за всичките; тя остава в Журнала завинаги.`,
    '',
  );
  if (prichina === null) return { stana: false, kazano: '', vid: 'dobre' };

  const otkazani: string[] = [];
  let stanali = 0;
  for (const { seq, vid } of spisak) {
    const sabitiya = await k.deystviya.sabitiya();
    const ogledalo = await k.deystviya.ogledalo();
    const otgovor = mozheLiDaSeStornira(sabitiya, ogledalo, seq);
    if (!otgovor.mozhe) {
      otkazani.push(`seq ${seq}: ${otgovor.prichina}`);
      continue;
    }
    try {
      await k.deystviya.storniraj(
        `S:${crypto.randomUUID()}`,
        { pogasyavaSeq: seq, prichina: prichina.trim() || 'без посочена причина' },
        { opId: `storno:${crypto.randomUUID()}` },
        vid,
      );
      stanali += 1;
    } catch (greshka) {
      otkazani.push(`seq ${seq}: ${dumiZaGreshka(greshka)}`);
    }
  }
  return {
    stana: stanali > 0,
    kazano: sDumiZaStornoto(spisak.length, stanali, otkazani),
    vid: otkazani.length === 0 ? 'dobre' : 'zle',
  };
}
