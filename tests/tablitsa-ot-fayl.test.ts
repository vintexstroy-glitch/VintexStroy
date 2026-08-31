/**
 * ТАБЛИЦА ОТ ФАЙЛ · четем качената, създаваме вътрешната (резен 21 · ADR-081).
 *
 * Десетте обещания:
 *
 *   1. Четецът вижда `<f>` · дотук виждаше само стойността (дълг M12).
 *   2. Разтеглената формула („shared") стига до ВСЯКА своя клетка.
 *   3. Четирите форми се превеждат · SUM, +, −, ×, процент.
 *   4. Всичко друго се ОТКАЗВА с ПРИЧИНА, не мълчаливо.
 *   5. Закованият адрес (`$B$2`) се отказва · той сочи един ред.
 *   6. Видът на колоната се СМЯТА от данните · една буква я прави текст.
 *   7. Преведената формула се СВЕРЯВА с числата на самия файл.
 *   8. Разминала се формула НЕ се копира · колоната идва с числата си.
 *   9. Формула без нито един проверим ред НЕ се копира.
 *  10. И двата пътя се КАЗВАТ с думи — „с формулите" и „само структурата".
 */

import { describe, expect, it } from 'vitest';
import { zipiray } from '../src/iznos/excel.js';
import { otXLSXSFormuli } from '../src/iztochnik/xlsx.js';
import { prevediFormula } from '../src/iztochnik/prevod-formula.js';
import {
  predlozhiTablitsa,
  REDOVE_ZA_SVERKA,
  sDumi,
  vidNaKolonata,
} from '../src/domein/tablitsa-ot-fayl.js';
import type { Tablitsa } from '../src/iztochnik/tablitsa.js';

// ── ФАЙЛЪТ · истински .xlsx, сглобен на място ──────────────────────────────

interface Kletka {
  readonly v?: string;
  readonly f?: string;
  readonly si?: number;
  /** true = формулата е ЦЯЛА тук; другите ѝ клетки я сочат по `si` */
  readonly vodach?: boolean;
  readonly tekst?: boolean;
}

function bukva(n: number): string {
  let i = n;
  let ime = '';
  do {
    ime = String.fromCharCode(65 + (i % 26)) + ime;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return ime;
}

/** Сглобява .xlsx с `<f>` възли · писачът на приложението пише само стойности. */
function faylSFormuli(redove: readonly (readonly Kletka[])[]): Uint8Array {
  const listXML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    redove
      .map((r, ri) => {
        const kletki = r
          .map((k, ki) => {
            const adres = `${bukva(ki)}${ri + 1}`;
            const f =
              k.f === undefined && k.si === undefined
                ? ''
                : k.si === undefined
                  ? `<f>${k.f}</f>`
                  : k.vodach
                    ? `<f t="shared" ref="A1:Z99" si="${k.si}">${k.f}</f>`
                    : `<f t="shared" si="${k.si}"/>`;
            const t = k.tekst ? ' t="inlineStr"' : '';
            const v = k.tekst
              ? `<is><t>${k.v ?? ''}</t></is>`
              : k.v === undefined
                ? ''
                : `<v>${k.v}</v>`;
            return `<c r="${adres}"${t}>${f}${v}</c>`;
          })
          .join('');
        return `<row r="${ri + 1}">${kletki}</row>`;
      })
      .join('') +
    '</sheetData></worksheet>';

  return zipiray([
    {
      ime: '[Content_Types].xml',
      tekst:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      ime: 'xl/workbook.xml',
      tekst:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheets><sheet name="Фактури" sheetId="1"/></sheets></workbook>',
    },
    { ime: 'xl/worksheets/sheet1.xml', tekst: listXML },
  ]);
}

const T = (v: string): Kletka => ({ v, tekst: true });
const N = (v: string): Kletka => ({ v });

// ── 1–2 · ЧЕТЕЦЪТ ──────────────────────────────────────────────────────────

describe('четецът вижда ФОРМУЛАТА · дотук виждаше само стойността', () => {
  it('чете `<f>` и я връща по НОМЕР на колона', async () => {
    const { tablitsi, formuli } = await otXLSXSFormuli(
      faylSFormuli([
        [T('Основа'), T('ДДС'), T('Общо')],
        [N('100'), N('20'), { v: '120', f: 'A2+B2' }],
      ]),
      'fakturi.xlsx',
    );
    expect(tablitsi[0]!.redove[1]).toEqual(['100', '20', '120']);
    expect(formuli[0]!.poKolona.get(2)).toBe('A2+B2');
    // Колоните БЕЗ формула не се измислят.
    expect(formuli[0]!.poKolona.has(0)).toBe(false);
  });

  it('РАЗТЕГЛЕНАТА формула стига и до ЧУЖДАТА си колона', async () => {
    // ПЪРВАТА версия на този тест не проверяваше нищо: водачът стоеше в
    // СЪЩАТА колона и пръв, значи изразът се хващаше и без паметта за
    // разтеглени. Счупих паметта — и тестът МИНА.
    //
    // Excel разтегля и НАСТРАНИ: `ref="C2:D3"` слага целия израз в C2, а D2
    // носи само `si`. Тогава колона D няма СВОЙ израз никъде — и без паметта
    // остава без формула, мълчаливо.
    const { formuli } = await otXLSXSFormuli(
      faylSFormuli([
        [T('А'), T('Б'), T('Сбор'), T('Пак сбор')],
        [
          N('10'),
          N('5'),
          { v: '15', f: 'A2+B2', si: 0, vodach: true },
          { v: '15', si: 0 },
        ],
      ]),
      'f.xlsx',
    );
    expect(formuli[0]!.poKolona.get(2)).toBe('A2+B2');
    // ЧУЖДАТА колона я взима от водача · без паметта тук няма нищо.
    expect(formuli[0]!.poKolona.get(3)).toBe('A2+B2');
  });
});

// ── 3–5 · ПРЕВОДЪТ ─────────────────────────────────────────────────────────

describe('преводът · четирите форми и отказите', () => {
  it('превежда SUM, плюс, минус, по и процент', () => {
    expect(prevediFormula('=SUM(A2:C2)').formula).toEqual({ deystvie: 'sbor', ot: [0, 1, 2] });
    expect(prevediFormula('=SUM(A2;C2)').formula).toEqual({ deystvie: 'sbor', ot: [0, 2] });
    expect(prevediFormula('=A2+B2').formula).toEqual({ deystvie: 'sbor', ot: [0, 1] });
    expect(prevediFormula('=A2-B2').formula).toEqual({ deystvie: 'razlika', ot: [0, 1] });
    expect(prevediFormula('=A2*B2').formula).toEqual({ deystvie: 'proizvedenie', ot: [0, 1] });
    expect(prevediFormula('=A2*B2/100').formula).toEqual({ deystvie: 'protsent', ot: [0, 1] });
    expect(prevediFormula('=A2*B2%').formula).toEqual({ deystvie: 'protsent', ot: [0, 1] });
    // Интервалите не пречат · Excel ги пише различно според деня.
    expect(prevediFormula('= A2 + B2 ').formula).toEqual({ deystvie: 'sbor', ot: [0, 1] });
  });

  it('ОТКАЗВА всичко друго · и казва ЗАЩО, не мълчи', () => {
    expect(prevediFormula('=IF(A2>0;B2;C2)').zashto).toContain('IF');
    expect(prevediFormula('=VLOOKUP(A2;D:E;2;0)').zashto).toContain('VLOOKUP');
    expect(prevediFormula('=A2+B2+C2+D2').zashto).toContain('4 колони');
    expect(prevediFormula('=SUM(A2:E2)').zashto).toContain('5 колони');
    expect(prevediFormula('=A2/B2').zashto).toContain('не е сбор');
    expect(prevediFormula('').zashto).toContain('Празен');
    // И НИКОЙ отказ не връща формула наужким.
    for (const izraz of ['=IF(A2>0;B2;C2)', '=A2/B2', '=SUM(A2:E2)']) {
      expect(prevediFormula(izraz).formula).toBeUndefined();
    }
  });

  it('ЗАКОВАНИЯТ адрес се отказва · той сочи ЕДИН ред', () => {
    const p = prevediFormula('=A2*$B$1');
    expect(p.formula).toBeUndefined();
    expect(p.zashto).toContain('закован');
    expect(prevediFormula('=Лист2!A2+B2').zashto).toContain('ДРУГ лист');
    expect(prevediFormula('=SUM(A2:A9)').zashto).toContain('през РЕДОВЕ');
  });

  it('и пази ИЗРАЗА дословно · за следата и за екрана', () => {
    expect(prevediFormula('=IF(A2>0;B2;C2)').izraz).toBe('=IF(A2>0;B2;C2)');
  });
});

// ── 6 · ВИДЪТ ──────────────────────────────────────────────────────────────

describe('видът на колоната се СМЯТА от данните', () => {
  it('една буква прави колоната ТЕКСТ · текст, взет за пари, е повреда', () => {
    expect(vidNaKolonata(['100,00', '250,50'])).toBe('evro');
    expect(vidNaKolonata(['100,00', 'няма'])).toBe('tekst');
    expect(vidNaKolonata(['20%', '9%'])).toBe('protsent');
    expect(vidNaKolonata(['2026-08-24', '2026-08-25'])).toBe('data');
    // Празната колона е ТЕКСТ · нула клетки не доказват нищо.
    expect(vidNaKolonata([])).toBe('tekst');
    expect(vidNaKolonata(['', '  '])).toBe('tekst');
  });
});

// ── 7–10 · ПРЕДЛОЖЕНИЕТО И СВЕРКАТА ────────────────────────────────────────

const glava = ['Основа', 'ДДС', 'Общо'];
const tab = (redove: readonly (readonly string[])[]): Tablitsa => ({
  ime: 'Фактури',
  redove: [glava, ...redove],
});

describe('предложението · и сверката на формулата с числата на файла', () => {
  it('КОПИРА формулата, когато сметката съвпада с файла', () => {
    const p = predlozhiTablitsa(
      tab([
        ['100,00', '20,00', '120,00'],
        ['250,00', '50,00', '300,00'],
      ]),
      new Map([[2, 'A2+B2']]),
    );
    expect(p.koloni[2]!.formula).toEqual({ deystvie: 'sbor', ot: [0, 1] });
    expect(p.koloni[2]!.zashto).toBe('');
    expect(p.kopirani).toBe(1);
    expect(p.sverkaNaFormulite).toEqual({ provereni: 2, razlika: 0 });
    expect(sDumi(p)).toContain('ВСИЧКИТЕ 1 формули');
  });

  it('НЕ копира, когато сметката се разминава · и казва в колко реда', () => {
    const p = predlozhiTablitsa(
      tab([
        ['100,00', '20,00', '120,00'],
        ['250,00', '50,00', '999,00'],
      ]),
      new Map([[2, 'A2+B2']]),
    );
    expect(p.koloni[2]!.formula).toBeUndefined();
    expect(p.koloni[2]!.zashto).toContain('1 от 2 проверени');
    expect(p.kopirani).toBe(0);
    // А колоната ВСЕ ПАК идва · с числата си и с вида си.
    expect(p.koloni[2]!.vid).toBe('evro');
    expect(sDumi(p)).toContain('0 от 1');
  });

  it('НЕ копира непроверима формула · нула реда не доказват нищо', () => {
    const p = predlozhiTablitsa(tab([]), new Map([[2, 'A2+B2']]));
    expect(p.koloni[2]!.formula).toBeUndefined();
    expect(p.koloni[2]!.zashto).toContain('нито един ред');
  });

  it('НЕ копира формула, сочеща себе си или колона извън таблицата', () => {
    const kamSebe = predlozhiTablitsa(
      tab([['100,00', '20,00', '120,00']]),
      new Map([[2, 'C2+A2']]),
    );
    expect(kamSebe.koloni[2]!.zashto).toContain('собствената си');
    const navan = predlozhiTablitsa(
      tab([['100,00', '20,00', '120,00']]),
      new Map([[2, 'A2+Z2']]),
    );
    expect(navan.koloni[2]!.zashto).toContain('извън таблицата');
  });

  it('файл БЕЗ формули дава структурата и числата · и го КАЗВА', () => {
    const p = predlozhiTablitsa(tab([['100,00', '20,00', '120,00']]), new Map());
    expect(p.formuliVavFayla).toBe(0);
    expect(p.koloni.map((k) => k.ime)).toEqual(glava);
    expect(p.koloni.every((k) => k.formula === undefined)).toBe(true);
    expect(sDumi(p)).toContain('НЯМА формули');
  });

  it('празната глава се ОТКАЗВА · таблица без имена не се строи', () => {
    expect(() => predlozhiTablitsa({ ime: 'x', redove: [] }, new Map())).toThrow(/празен/);
  });

  it('безименната колона получава номер, а не празно име', () => {
    const p = predlozhiTablitsa({ ime: 'x', redove: [['Име', ''], ['а', 'б']] }, new Map());
    expect(p.koloni[1]!.ime).toBe('Колона 2');
  });

  it('сверката гледа НАЙ-МНОГО двайсет реда · повече не носят увереност', () => {
    const mnogo = Array.from({ length: 40 }, () => ['1,00', '1,00', '2,00']);
    const p = predlozhiTablitsa(tab(mnogo), new Map([[2, 'A2+B2']]));
    expect(p.sverkaNaFormulite.provereni).toBe(REDOVE_ZA_SVERKA);
    expect(p.redove).toBe(40);
  });
});

// ── ЦЕЛИЯТ ПЪТ · от байтовете до предложението ─────────────────────────────

describe('целият път · файл → предложение', () => {
  it('чете истински .xlsx и предлага таблица с копирана формула', async () => {
    const { tablitsi, formuli } = await otXLSXSFormuli(
      faylSFormuli([
        [T('Основа'), T('ДДС'), T('Общо'), T('Доставчик')],
        [T('100,00'), T('20,00'), { v: '120,00', f: 'A2+B2', tekst: true }, T('Иван')],
        [T('250,00'), T('50,00'), { v: '300,00', f: 'A3+B3', tekst: true }, T('Георги')],
      ]),
      'fakturi.xlsx',
    );
    const p = predlozhiTablitsa(tablitsi[0]!, formuli[0]!.poKolona);

    expect(p.ime).toBe('Фактури');
    expect(p.koloni.map((k) => k.ime)).toEqual(['Основа', 'ДДС', 'Общо', 'Доставчик']);
    expect(p.koloni.map((k) => k.vid)).toEqual(['evro', 'evro', 'evro', 'tekst']);
    expect(p.koloni[2]!.formula).toEqual({ deystvie: 'sbor', ot: [0, 1] });
    expect(p.kopirani).toBe(1);
    expect(p.sverkaNaFormulite.razlika).toBe(0);
  });
});

describe('пинът · числото се твърди с ръка (резен 46 · група В)', () => {
  it('за сверка се показват ДВАЙСЕТ реда', () => {
    expect(REDOVE_ZA_SVERKA).toBe(20);
  });
});
