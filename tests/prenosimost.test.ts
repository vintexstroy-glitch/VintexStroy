/**
 * ОБХОДИТЕ РАБОТЯТ И НА WINDOWS · праг НУЛА (резен 94 · ADR-152).
 *
 * ═══ КАК СЕ НАМЕРИ ═══
 *
 * Собственикът пусна проекта на СВОЯТА машина за пръв път — Windows — и три
 * проверки паднаха. Същите три са зелени в CI от раждането си, защото CI върви
 * на Linux. Тоест обходите, които пазят проекта, не работеха там, където той
 * работи.
 *
 * ДВА КЛАСА, и двата невидими за Linux:
 *
 * 1 · ПЪТЯТ · `new URL(…, import.meta.url).pathname` връща „/C:/Users/…" на
 *     Windows. Подаден на `join()`, той става „C:\\C:\\Users\\…" — път, който не
 *     съществува. Правилното е `fileURLToPath()`, което знае за буквата на
 *     устройството. Намерени СЕДЕМ места.
 *
 * 2 · КРАЯТ НА РЕДА · израз, който иска `;\n`, не намира НИЩО в CRLF файл. И
 *     не гръмва — просто връща „няма съвпадение", което изглежда точно като
 *     „търсеното го няма". Обход, който мълчи вярно, е по-скъп от обход, който
 *     пада (ADR-051).
 *
 * ═══ КОРЕНЪТ И ВТОРАТА ЗАЩИТА ═══
 *
 * Коренът на клас 2 е `.gitattributes` — той заковава LF на всяка машина, и
 * тогава НИКОЙ израз не се спъва, не само онзи, който се спъна пръв. Тук се
 * проверява, че този файл стои и че казва точно това.
 *
 * Клас 1 няма такъв корен: `.pathname` е валиден JavaScript и никой не го
 * забранява. Затова той се БРОИ, поименно, с праг нула.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function izvorite(koren: string, kray: readonly string[]): readonly string[] {
  const namereni: string[] = [];
  for (const vpis of readdirSync(koren, { withFileTypes: true })) {
    const pat = join(koren, vpis.name);
    if (vpis.isDirectory()) namereni.push(...izvorite(pat, kray));
    else if (kray.some((k) => vpis.name.endsWith(k))) namereni.push(pat);
  }
  return namereni;
}

const VSICHKI = [
  ...izvorite('app', ['.ts']),
  ...izvorite('src', ['.ts']),
  ...izvorite('tests', ['.ts']),
  ...izvorite('proba', ['.ts']),
  ...izvorite('stroezh', ['.mjs']),
].filter((p) => !p.endsWith('.d.ts'));

describe('клас 1 · пътят на файла · праг НУЛА', () => {
  it('никой не взима път от URL с `.pathname`', () => {
    const namereni: string[] = [];
    for (const pat of VSICHKI) {
      // Самият този файл го СПОМЕНАВА в думите си — затова се пропуска.
      if (pat.endsWith('prenosimost.test.ts')) continue;
      readFileSync(pat, 'utf8')
        .split('\n')
        .forEach((red, i) => {
          if (/\.pathname\b/.test(red) && !red.trimStart().startsWith('//')) {
            namereni.push(`${pat}:${i + 1}`);
          }
        });
    }
    expect(namereni, `взимат път с .pathname: ${namereni.join(' | ')}`).toEqual([]);
  });

  it('и мярката НЕ е сляпа · съчинен ред дава находка', () => {
    const izmislen = "const K = new URL('..', import.meta.url).pathname;";
    expect(/\.pathname\b/.test(izmislen)).toBe(true);
  });
});

describe('клас 2 · краят на реда · закован в хранилището', () => {
  const ATRIBUTI = readFileSync('.gitattributes', 'utf8');

  it('`.gitattributes` заковава LF за всичко текстово', () => {
    expect(ATRIBUTI).toMatch(/^\*\s+text=auto\s+eol=lf\s*$/m);
  });

  it('и НЕ пипа двоичните · шрифт с „поправен" край е счупен файл', () => {
    for (const kray of ['woff2', 'png', 'xlsx', 'pdf', 'db']) {
      expect(ATRIBUTI, `${kray} не е обявено за двоично`).toMatch(
        new RegExp(`^\\*\\.${kray}\\s+binary\\s*$`, 'm'),
      );
    }
  });

  it('нито един жив извор не носи CRLF · дори преди пренормализация', () => {
    const sCRLF = VSICHKI.filter((p) => readFileSync(p, 'utf8').includes('\r\n'));
    expect(sCRLF, `носят CRLF: ${sCRLF.join(' | ')}`).toEqual([]);
  });
});
