/**
 * ПИСАЧЪТ НА EXCEL · кръгът се затваря със собствения четец.
 *
 * Най-силният тест за писач е неговият четец: каквото rabotnaKniga() запише,
 * otXLSX() трябва да прочете едно към едно. Плюс python zipfile като
 * независим свидетел в прохода.
 */

import { describe, expect, it } from 'vitest';
import { rabotnaKniga } from '../src/iznos/excel.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';

describe('писачът и четецът се затварят', () => {
  it('каквото се запише, се прочита едно към едно', async () => {
    const bajtove = rabotnaKniga([
      {
        ime: 'Журнал',
        koloni: [{ ime: 'seq' }, { ime: 'Тип' }, { ime: 'Сума, лв.' }],
        redove: [
          [1, 'ИмотДобавен', ''],
          [2, 'НаемДобавен', 1200.5],
          [3, 'Сторно · „причина" <с> &знаци', -600],
        ],
      },
      {
        ime: 'ДДС',
        koloni: [{ ime: 'Период' }, { ime: 'Изчислено' }],
        redove: [['2026-02', 200]],
      },
    ]);

    const listove = await otXLSX(bajtove, 'arhiv.xlsx');
    expect(listove.map((l) => l.ime)).toEqual(['Журнал', 'ДДС']);
    expect(listove[0]!.redove[0]).toEqual(['seq', 'Тип', 'Сума, лв.']);
    expect(listove[0]!.redove[2]).toEqual(['2', 'НаемДобавен', '1200.5']);
    expect(listove[0]!.redove[3]).toEqual(['3', 'Сторно · „причина" <с> &знаци', '-600']);
    expect(listove[1]!.redove[1]).toEqual(['2026-02', '200']);
  });

  it('носи AutoFilter и замразен заглавен ред', () => {
    const bajtove = rabotnaKniga([
      { ime: 'Л', koloni: [{ ime: 'А' }, { ime: 'Б' }], redove: [['1', '2']] },
    ]);
    let surovo = '';
    for (const b of bajtove) surovo += String.fromCharCode(b);
    expect(surovo).toContain('autoFilter ref="A1:B2"');
    expect(surovo).toContain('state="frozen"');
  });

  it('управляващ знак не чупи XML-а, а става видим белег', async () => {
    const bajtove = rabotnaKniga([
      { ime: 'Л', koloni: [{ ime: 'А' }], redove: [[`зленаред`]] },
    ]);
    const listove = await otXLSX(bajtove);
    expect(listove[0]!.redove[1]![0]).toBe('зле·наред');
  });
});
