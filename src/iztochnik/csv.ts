/**
 * CSV · най-евтиният вход и най-често сгрешеният.
 *
 * Три капана, заради които не се чете с `split(',')`:
 *   1. Разделителят у нас е точка и запетая — Excel на български пише така,
 *      защото запетаята е десетичният знак.
 *   2. Клетка в кавички може да съдържа разделителя И нов ред.
 *   3. Файлът често започва с BOM, който залепва за първото заглавие.
 */

import type { Tablitsa } from './tablitsa.js';

const BOM = '﻿';

/** Познава разделителя по първия ред извън кавички. */
export function pogadniRazdelitel(tekst: string): string {
  const parviRed = tekst.slice(0, 5000).split(/\r?\n/)[0] ?? '';
  let vKavichki = false;
  const broy = new Map<string, number>([
    [',', 0],
    [';', 0],
    ['\t', 0],
  ]);
  for (const znak of parviRed) {
    if (znak === '"') vKavichki = !vKavichki;
    else if (!vKavichki && broy.has(znak)) broy.set(znak, (broy.get(znak) ?? 0) + 1);
  }
  return [...broy.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

export function otCSV(tekst: string, ime = 'CSV', razdelitel?: string): Tablitsa {
  const chisto = tekst.startsWith(BOM) ? tekst.slice(1) : tekst;
  const r = razdelitel ?? pogadniRazdelitel(chisto);

  const redove: string[][] = [];
  let red: string[] = [];
  let kletka = '';
  let vKavichki = false;

  for (let i = 0; i < chisto.length; i += 1) {
    const znak = chisto[i]!;

    if (vKavichki) {
      if (znak === '"') {
        // Две кавички една до друга значат една кавичка в текста.
        if (chisto[i + 1] === '"') {
          kletka += '"';
          i += 1;
        } else vKavichki = false;
      } else kletka += znak;
      continue;
    }

    if (znak === '"') vKavichki = true;
    else if (znak === r) {
      red.push(kletka);
      kletka = '';
    } else if (znak === '\n') {
      red.push(kletka);
      redove.push(red);
      red = [];
      kletka = '';
    } else if (znak !== '\r') kletka += znak;
  }

  if (kletka !== '' || red.length > 0) {
    red.push(kletka);
    redove.push(red);
  }

  return { ime, redove };
}
