/**
 * Сторното от екрана — винаги през вратаря.
 *
 * Правилото: сторно се отказва, докато нещо живо виси на събитието
 * (`src/domein/storno.ts`). Отказът се казва с думи, не се преглъща.
 */

import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
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

  const otkaz = await stornirajSled(k, seq, vid, prichina);
  if (otkaz !== null) return { stana: false, kazano: otkaz, vid: 'zle' };

  return {
    stana: true,
    kazano: `Сторнирано seq ${seq}. И двете събития остават в Журнала.`,
    vid: 'dobre',
  };
}

/**
 * ОКАЧВА сторно-бутоните на един екран · един механизъм, три екрана.
 *
 * Имоти, Пари и Сметки пишеха една и съща обиколка: изключи бутона, викни
 * вратаря, кажи вестта, прерисувай. Три копия на един ред мисъл — и всяка
 * поправка в единия оставяше другите два както са били.
 *
 * Разликата между трите е ЕДНА: какво става СЛЕД сторното — Имоти връща
 * режима си, Пари маха избраното, Сметки само прерисува. Затова обиколката
 * е тук, а разликата идва като `sled`.
 *
 * И една дребна печалба, платена веднага: видът вече не се взима с `!`.
 * Чужд белег се отказва С ДУМИ още при закачането — тих пропуск изглежда
 * като бутон, който просто не работи.
 */
export function zakachiStornoButoni(
  koren: HTMLElement,
  k: Konteks,
  znatsi: readonly (readonly [string, string])[],
  sled: () => Promise<void>,
): void {
  for (const [znak, kakvo] of znatsi) {
    const vid = vidOtAtribut(znak);
    if (vid === null) {
      throw new Error(`„${znak}" не е сторно-белег. Домът им е VID_OT_BELEGA в този файл.`);
    }
    for (const b of koren.querySelectorAll<HTMLButtonElement>(`[${znak}]`)) {
      b.addEventListener('click', async () => {
        // Изключва се и НЕ се връща: екранът се прерисува целият, а дотогава
        // второ натискане би пуснало вратаря втори път по същия seq.
        b.disabled = true;
        const izhod = await opitajStorno(k, Number(b.getAttribute(znak)), vid, kakvo);
        if (izhod.kazano) k.vest(izhod.vid, izhod.kazano);
        await sled();
      });
    }
  }
}

// ── сторно на избраните · груповото минава през СЪЩАТА врата ──────────────

/**
 * Кой вид същност носи белегът на бутона „Сторно" във всеки ред.
 *
 * ЕДИНСТВЕНИЯТ дом на този факт (правило 17): и екраните при закачането на
 * единичното сторно, и груповото четат ОТТУК. Втори списък другаде би се
 * разминал тихо — ред с непознат белег просто изпада от „Сторно на
 * избраните", без грешка. Ключът е самият HTML-атрибут — без преводач
 * kebab↔camel по средата.
 */
const VID_OT_BELEGA: Readonly<Record<string, Vid>> = {
  'data-storno-imot': VID.imot,
  'data-storno-naem': VID.naem,
  'data-storno-vzemane': VID.vzemane,
  'data-storno': VID.plashtane,
  'data-storno-razhod': VID.razhod,
};
const BELEZITE = Object.entries(VID_OT_BELEGA);

/** Видът по HTML-атрибута („data-storno-naem" → наем) — или null за чужд белег. */
export function vidOtAtribut(atribut: string): Vid | null {
  return VID_OT_BELEGA[atribut] ?? null;
}

export interface ZaStorno {
  readonly seq: number;
  readonly vid: Vid;
}

/** Чете от бутон на ред кое сторно носи — или null, ако не е сторно-бутон. */
export function stornoOtButona(b: HTMLButtonElement): ZaStorno | null {
  for (const [atribut, vid] of BELEZITE) {
    const seq = b.getAttribute(atribut);
    if (seq !== null) return { seq: Number(seq), vid };
  }
  return null;
}

/**
 * Сторнира един seq с ГОТОВА причина — ядрото, през което минават и
 * единичното, и груповото: една врата, един запис, едни думи на отказа.
 * Връща null при успех, иначе отказа с думи. Чете живото наново — при
 * партида предишният запис променя какво е позволено.
 */
async function stornirajSled(
  k: Konteks,
  seq: number,
  vid: Vid,
  prichina: string,
): Promise<string | null> {
  const [sabitiya, ogledalo] = await Promise.all([k.deystviya.sabitiya(), k.deystviya.ogledalo()]);
  const otgovor = mozheLiDaSeStornira(sabitiya, ogledalo, seq);
  if (!otgovor.mozhe) return otgovor.prichina;
  try {
    await k.deystviya.storniraj(
      `S:${crypto.randomUUID()}`,
      { pogasyavaSeq: seq, prichina: prichina.trim() || 'без посочена причина' },
      { opId: `storno:${crypto.randomUUID()}` },
      vid,
    );
    return null;
  } catch (greshka) {
    return dumiZaGreshka(greshka);
  }
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
    const otkaz = await stornirajSled(k, seq, vid, prichina);
    if (otkaz !== null) otkazani.push(`seq ${seq}: ${otkaz}`);
    else stanali += 1;
  }
  return {
    stana: stanali > 0,
    kazano: sDumiZaStornoto(spisak.length, stanali, otkazani),
    vid: otkazani.length === 0 ? 'dobre' : 'zle',
  };
}
