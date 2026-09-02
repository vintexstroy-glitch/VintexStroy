/**
 * ВНЕСЕНО, НО НЕ ВИКАНО · праг НУЛА (резен 93 · ADR-151).
 *
 * ═══ КАК СЕ НАМЕРИ ═══
 *
 * `npm run chistota` брои МЪРТВОТО с праг нула — и показваше нула. А `main.ts`
 * носеше ДВАЙСЕТ И ЕДНО внасяне, което никой ред в него не викаше:
 * `narisuvayImoti`, `zakachiPari`, `narisuvayTabove`… — остатък от времето,
 * когато главният файл рисуваше екраните сам, преди регистърът да се изнесе
 * (`ekranite.ts`, ADR-041 находка 4).
 *
 * Обходът не лъжеше: тези имена СА живи — просто другаде. За него
 * `narisuvayImoti` е изнесено и викано, значи не е мъртво. Мъртва е ВРЪЗКАТА,
 * не името, и точно затова се брои отделно.
 *
 * Мъртвото внасяне не е козметика. То показва зависимост, която вече не
 * съществува: който ЧЕТЕ `main.ts`, вижда файл, зависещ от девет екрана; който
 * го МЕРИ, вижда че не зависи от нито един. Разминаването между двете се плаща
 * при всяко следващо местене.
 *
 * ═══ ЗАЩО С ЧЕТЕЦ НА ЛЕКСЕМИ, А НЕ С РЕГУЛЯРНИ ЗАМЕНИ ═══
 *
 * Първият опит тук беше с изрази върху текста и излъга веднага: коментар ВЪТРЕ
 * в скобите на внасянето стана „внесено име", и обходът обяви пет находки, които
 * не съществуват. Точно това е ADR-051 — „обход, който лъже, е по-скъп от
 * липсващ". Затова файлът се чете с четеца на самия TypeScript (`ts.createSourceFile`),
 * а не с изрази: скоби, коментари и низове са негова работа, не наша.
 *
 * Търсенето на ползването обаче е НАРОЧНО по-широко от дървото: името се брои
 * за ползвано и когато стои само в коментар (`{@link X}`). Обход, който маха
 * такова внасяне, чупи документацията — а тук се лови мъртвото, не се пише стил.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

function izvorite(koren: string): readonly string[] {
  const namereni: string[] = [];
  for (const vpis of readdirSync(koren, { withFileTypes: true })) {
    const pat = join(koren, vpis.name);
    if (vpis.isDirectory()) namereni.push(...izvorite(pat));
    else if (vpis.name.endsWith('.ts') && !vpis.name.endsWith('.d.ts')) namereni.push(pat);
  }
  return namereni;
}

interface VneseniIme {
  /** Името, както го вижда ТОЗИ файл (тоест след `as`). */
  readonly ime: string;
  readonly nachalo: number;
  readonly kray: number;
}

/** Внесените имена · именувани, по подразбиране и пространство, с местата им. */
function vnesenite(fayl: ts.SourceFile): readonly VneseniIme[] {
  const spisak: VneseniIme[] = [];
  for (const izraz of fayl.statements) {
    if (!ts.isImportDeclaration(izraz) || izraz.importClause === undefined) continue;
    const mesto = { nachalo: izraz.getStart(fayl), kray: izraz.getEnd() };
    const { name, namedBindings } = izraz.importClause;
    if (name !== undefined) spisak.push({ ime: name.text, ...mesto });
    if (namedBindings === undefined) continue;
    if (ts.isNamespaceImport(namedBindings)) spisak.push({ ime: namedBindings.name.text, ...mesto });
    else for (const el of namedBindings.elements) spisak.push({ ime: el.name.text, ...mesto });
  }
  return spisak;
}

/** Текстът на файла БЕЗ редовете на внасянето — там се търси ползването. */
function bezVnasyaniyata(izvor: string, vneseni: readonly VneseniIme[]): string {
  const vidyani = new Set<string>();
  const mesta = vneseni
    .filter((v) => {
      const klyuch = `${v.nachalo}:${v.kray}`;
      if (vidyani.has(klyuch)) return false;
      vidyani.add(klyuch);
      return true;
    })
    .sort((a, b) => a.nachalo - b.nachalo);
  let ostatak = '';
  let ot = 0;
  for (const mesto of mesta) {
    ostatak += izvor.slice(ot, mesto.nachalo);
    ot = mesto.kray;
  }
  return ostatak + izvor.slice(ot);
}

function mrtvite(pat: string): readonly string[] {
  const izvor = readFileSync(pat, 'utf8');
  const fayl = ts.createSourceFile(pat, izvor, ts.ScriptTarget.ESNext, true);
  const vneseni = vnesenite(fayl);
  const telo = bezVnasyaniyata(izvor, vneseni);
  return [...new Set(vneseni.map((v) => v.ime))]
    .filter((ime) => !new RegExp(`(?<![\\w$])${ime.replace(/\$/g, '\\$')}(?![\\w$])`).test(telo))
    .map((ime) => `${pat} · ${ime}`);
}

describe('внесено, но не викано · праг НУЛА', () => {
  it('нито един файл в app/, src/, tests/ и proba/ не внася име, което не ползва', () => {
    const namereni = [
      ...izvorite('app'),
      ...izvorite('src'),
      ...izvorite('tests'),
      ...izvorite('proba'),
    ].flatMap(mrtvite);
    expect(namereni, `мъртви внасяния (${namereni.length}): ${namereni.join(' | ')}`).toEqual([]);
  });

  it('и мярката НЕ е сляпа · съчинен файл с мъртво внасяне дава находка', () => {
    // Коментарът вътре в скобите е точно капанът, който събори първия опит.
    const izmislen = "import {\n  zhivo, // бележка\n  mrtvo,\n} from './x.js';\n\nzhivo();\n";
    const fayl = ts.createSourceFile('izmislen.ts', izmislen, ts.ScriptTarget.ESNext, true);
    const vneseni = vnesenite(fayl);
    expect(vneseni.map((v) => v.ime)).toEqual(['zhivo', 'mrtvo']);
    const telo = bezVnasyaniyata(izmislen, vneseni);
    expect(vneseni.map((v) => v.ime).filter((ime) => !new RegExp(`\\b${ime}\\b`).test(telo))).toEqual(
      ['mrtvo'],
    );
  });
});
