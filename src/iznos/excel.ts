/**
 * ПИСАЧ НА .XLSX · без нито една чужда библиотека.
 *
 * Огледално на четеца (`src/iztochnik/xlsx.ts`): .xlsx е ZIP с XML вътре.
 * Записите са НЕСВИТИ (stored) — архивът е за сверки, не за икономия на
 * място, а несвитият ZIP е най-простият правилен ZIP.
 *
 * Всеки лист получава AutoFilter върху заглавния ред и замразен първи ред —
 * „удобните за търсене филтри", които собственикът поиска: отваряш архива
 * в Excel и стрелките за филтриране са вече там.
 */

export interface KolonaNaLista {
  readonly ime: string;
  /** широчина в знаци; по подразбиране 14 */
  readonly shirina?: number;
}

export interface List {
  readonly ime: string;
  readonly koloni: readonly KolonaNaLista[];
  /** низ → текст; число → число (Excel смята и филтрира по него) */
  readonly redove: readonly (readonly (string | number)[])[];
}

// ── CRC32 · нужен на ZIP-а, таблицата се строи веднъж ─────────────────────
const TABLITSA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(danni: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of danni) c = TABLITSA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── ZIP · несвити записи + централен опис ─────────────────────────────────
interface Zapis {
  readonly ime: string;
  readonly danni: Uint8Array;
  readonly crc: number;
  readonly nachalo: number;
}

function zip(faylove: readonly { ime: string; tekst: string }[]): Uint8Array {
  const kodirach = new TextEncoder();
  const chasti: Uint8Array[] = [];
  const zapisi: Zapis[] = [];
  let mesto = 0;

  const chislo16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
  const chislo32 = (n: number) =>
    new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);

  for (const f of faylove) {
    const ime = kodirach.encode(f.ime);
    const danni = kodirach.encode(f.tekst);
    const crc = crc32(danni);
    // местен запис: подпис, версия 20, флаг UTF-8 (0x0800), метод 0 (stored)
    const glava = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0x08, 0, 0, 0, 0, 0, 0,
      ...chislo32(crc), ...chislo32(danni.length), ...chislo32(danni.length),
      ...chislo16(ime.length), 0, 0,
    ]);
    zapisi.push({ ime: f.ime, danni, crc, nachalo: mesto });
    chasti.push(glava, ime, danni);
    mesto += glava.length + ime.length + danni.length;
  }

  const nachaloNaOpisa = mesto;
  for (const z of zapisi) {
    const ime = kodirach.encode(z.ime);
    chasti.push(
      new Uint8Array([
        0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0x08, 0, 0, 0, 0, 0, 0,
        ...chislo32(z.crc), ...chislo32(z.danni.length), ...chislo32(z.danni.length),
        ...chislo16(ime.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...chislo32(z.nachalo),
      ]),
      ime,
    );
    mesto += 46 + ime.length;
  }

  chasti.push(
    new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0,
      ...chislo16(zapisi.length), ...chislo16(zapisi.length),
      ...chislo32(mesto - nachaloNaOpisa), ...chislo32(nachaloNaOpisa), 0, 0,
    ]),
  );

  const obshto = chasti.reduce((s, ch) => s + ch.length, 0);
  const izhod = new Uint8Array(obshto);
  let kade = 0;
  for (const ch of chasti) {
    izhod.set(ch, kade);
    kade += ch.length;
  }
  return izhod;
}

// ── XML ───────────────────────────────────────────────────────────────────
function ekvXML(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Управляващите знаци са невалидни в XML — по-добре видим белег от счупен файл.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '·');
}

function bukvaNaKolona(n: number): string {
  let ime = '';
  let ostanalo = n + 1;
  while (ostanalo > 0) {
    ime = String.fromCharCode(64 + ((ostanalo - 1) % 26) + 1) + ime;
    ostanalo = Math.floor((ostanalo - 1) / 26);
  }
  return ime;
}

function listXML(list: List): string {
  const posledna = bukvaNaKolona(list.koloni.length - 1);
  const koloni = list.koloni
    .map((k, i) => `<col min="${i + 1}" max="${i + 1}" width="${k.shirina ?? 14}" customWidth="1"/>`)
    .join('');

  const redove: string[] = [];
  // Заглавният ред — по него застава AutoFilter.
  redove.push(
    `<row r="1">${list.koloni
      .map((k, i) => `<c r="${bukvaNaKolona(i)}1" t="inlineStr"><is><t>${ekvXML(k.ime)}</t></is></c>`)
      .join('')}</row>`,
  );
  for (const [nomer, red] of list.redove.entries()) {
    const r = nomer + 2;
    redove.push(
      `<row r="${r}">${red
        .map((kletka, i) =>
          typeof kletka === 'number'
            ? `<c r="${bukvaNaKolona(i)}${r}"><v>${kletka}</v></c>`
            : kletka === ''
              ? ''
              : `<c r="${bukvaNaKolona(i)}${r}" t="inlineStr"><is><t xml:space="preserve">${ekvXML(kletka)}</t></is></c>`,
        )
        .join('')}</row>`,
    );
  }

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // замразен заглавен ред — при превъртане главата остава
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${koloni}</cols>` +
    `<sheetData>${redove.join('')}</sheetData>` +
    `<autoFilter ref="A1:${posledna}${list.redove.length + 1}"/>` +
    '</worksheet>'
  );
}

/** Сглобява цялата работна книга и връща байтовете на .xlsx файла. */
export function rabotnaKniga(listove: readonly List[]): Uint8Array {
  const tipove =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    listove
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '</Types>';

  const koren =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const kniga =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    listove
      .map((l, i) => `<sheet name="${ekvXML(l.ime.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('') +
    '</sheets></workbook>';

  const vrazki =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    listove
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    '</Relationships>';

  return zip([
    { ime: '[Content_Types].xml', tekst: tipove },
    { ime: '_rels/.rels', tekst: koren },
    { ime: 'xl/workbook.xml', tekst: kniga },
    { ime: 'xl/_rels/workbook.xml.rels', tekst: vrazki },
    ...listove.map((l, i) => ({ ime: `xl/worksheets/sheet${i + 1}.xml`, tekst: listXML(l) })),
  ]);
}
