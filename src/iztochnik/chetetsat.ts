/**
 * КОЙ ФАЙЛ С КОЙ ЧЕТЕЦ · ЕДИН дом за въпроса (правило 17).
 *
 * Дотук отговорът стоеше на ЧЕТИРИ места — Източници, Стойност, Лично,
 * Извлечение — и трите от тях бяха написани поотделно: „ако свършва на .xlsx…
 * иначе CSV". Три преписа на едно правило се разминават при първия нов формат,
 * и точно това стана: `.xlsb` трябваше да влезе на четири места, а щеше да
 * влезе на едно, ако въпросът имаше дом.
 *
 * ТУК се решава по ИМЕТО на файла и нищо друго. Съдържанието не се гадае:
 * файл, кръстен `.xlsx`, но всъщност `.xlsb`, ще падне с думите на своя четец —
 * а това е по-честно от мълчаливо познаване.
 */

import { otCSV, tekstOtBaytove } from './csv.js';
import { otXLSB } from './xlsb.js';
import { otXLSX, otXLSXSFormuli, type FormuliteNaLista } from './xlsx.js';
import { bezPrazni, type Tablitsa } from './tablitsa.js';
import type { VidIzvor } from './snimka.js';

/** Видът по името · `raka` не идва от файл и затова го няма тук. */
export function vidaNaFayla(ime: string): Exclude<VidIzvor, 'raka' | 'pdf'> | 'pdf' {
  const dolu = ime.toLowerCase();
  if (dolu.endsWith('.xlsx')) return 'xlsx';
  if (dolu.endsWith('.xlsb')) return 'xlsb';
  if (dolu.endsWith('.pdf')) return 'pdf';
  return 'csv';
}

/**
 * ЛИСТОВЕТЕ на един файл · без празните редове.
 *
 * PDF НЕ минава оттук: той се чете със свой път (`otPDF`), който иска друго
 * междинно състояние. Викащият, който го поддържа, го прави преди това.
 */
export async function tablitsiteNa(danni: Uint8Array, ime: string): Promise<Tablitsa[]> {
  const vid = vidaNaFayla(ime);
  if (vid === 'xlsx') return (await otXLSX(danni, ime)).map(bezPrazni);
  if (vid === 'xlsb') return (await otXLSB(danni, ime)).map(bezPrazni);
  return [bezPrazni(otCSV(tekstOtBaytove(danni), ime))];
}

/**
 * СЪЩОТО, но и с ФОРМУЛИТЕ · за строенето на таблица от файл.
 *
 * `.csv` и `.xlsb` връщат ПРАЗНИ формули, и по различна причина: CSV няма
 * формули по устройство, а `.xlsb` ги носи като двоични лексеми, не като
 * текст. Двете се четат еднакво отвън — празно — но екранът казва КОЯ е
 * причината, вместо да мълчи (правило 15).
 */
export async function tablitsiSFormuli(
  danni: Uint8Array,
  ime: string,
): Promise<{
  readonly tablitsi: readonly Tablitsa[];
  readonly formuli: readonly FormuliteNaLista[];
  /** празно, когато формули има; иначе ЗАЩО ги няма */
  readonly bezFormuli: string;
}> {
  const vid = vidaNaFayla(ime);
  if (vid === 'xlsx') {
    const { tablitsi, formuli } = await otXLSXSFormuli(danni, ime);
    return { tablitsi, formuli, bezFormuli: '' };
  }
  if (vid === 'xlsb') {
    const tablitsi = await otXLSB(danni, ime);
    return {
      tablitsi,
      formuli: tablitsi.map((t) => ({ ime: t.ime, poKolona: new Map<number, string>() })),
      bezFormuli:
        'Двоичният Excel (.xlsb) носи формулите като лексеми, не като текст — идват само числата им.',
    };
  }
  const t = otCSV(tekstOtBaytove(danni), ime);
  return {
    tablitsi: [t],
    formuli: [{ ime: t.ime, poKolona: new Map<number, string>() }],
    bezFormuli: 'CSV няма формули по устройство — идват само числата.',
  };
}
