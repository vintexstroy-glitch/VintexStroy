/**
 * ZIP · описът и вадането на един запис, БЕЗ чужда библиотека.
 *
 * Живее отделно, защото го ползват ДВА формата: `.xlsx` (ZIP с XML) и `.xlsb`
 * (ZIP с двоични части). Два четеца на ZIP биха се разминали точно в ъгъла,
 * който никой не гледа (правило 17) — а разминат ZIP-четец не пада шумно, той
 * връща ЧУЖДИ байтове.
 *
 * Вади БАЙТОВЕ, не текст: `.xlsb` няма какво да прави с текст, а `.xlsx` си
 * ги превръща сам. Разархивирането е на браузъра (`DecompressionStream`);
 * оттук не тръгва нито ред чужд код — чете се като данни, байт по байт.
 */

export class GreshkaZip extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreshkaZip';
  }
}

const PODPIS_KRAY = 0x06054b50;
const PODPIS_MESTEN = 0x04034b50;

export interface Zapis {
  readonly ime: string;
  readonly metod: number;
  readonly nachalo: number;
  readonly golemina: number;
}

/** Чете описа на ZIP-а — без да разархивира нищо. */
export function opisNaZip(dv: DataView): Map<string, Zapis> {
  let kray = -1;
  for (let i = dv.byteLength - 22; i >= 0; i -= 1) {
    if (dv.getUint32(i, true) === PODPIS_KRAY) {
      kray = i;
      break;
    }
  }
  if (kray < 0) throw new GreshkaZip('Файлът не е архив — липсва краят на архива.');

  const broy = dv.getUint16(kray + 10, true);
  let mesto = dv.getUint32(kray + 16, true);
  const zapisi = new Map<string, Zapis>();
  const chetets = new TextDecoder();

  for (let i = 0; i < broy; i += 1) {
    const dalzhinaNaImeto = dv.getUint16(mesto + 28, true);
    const dopalnitelno = dv.getUint16(mesto + 30, true);
    const komentar = dv.getUint16(mesto + 32, true);
    const ime = chetets.decode(
      new Uint8Array(dv.buffer, dv.byteOffset + mesto + 46, dalzhinaNaImeto),
    );
    zapisi.set(ime, {
      ime,
      metod: dv.getUint16(mesto + 10, true),
      nachalo: dv.getUint32(mesto + 42, true),
      golemina: dv.getUint32(mesto + 20, true),
    });
    mesto += 46 + dalzhinaNaImeto + dopalnitelno + komentar;
  }
  return zapisi;
}

/** Вади ЕДИН запис като байтове. */
export async function izvadiBaytove(
  danni: Uint8Array,
  dv: DataView,
  z: Zapis,
): Promise<Uint8Array> {
  if (dv.getUint32(z.nachalo, true) !== PODPIS_MESTEN) {
    throw new GreshkaZip(`Повреден запис „${z.ime}" в архива.`);
  }
  const nachaloNaDannite =
    z.nachalo + 30 + dv.getUint16(z.nachalo + 26, true) + dv.getUint16(z.nachalo + 28, true);
  const parche = danni.subarray(nachaloNaDannite, nachaloNaDannite + z.golemina);

  if (z.metod === 0) return parche;
  if (z.metod !== 8) throw new GreshkaZip(`Непознато свиване (${z.metod}) при „${z.ime}".`);

  const potok = new Blob([parche.slice().buffer]).stream().pipeThrough(
    new DecompressionStream('deflate-raw'),
  );
  return new Uint8Array(await new Response(potok).arrayBuffer());
}
