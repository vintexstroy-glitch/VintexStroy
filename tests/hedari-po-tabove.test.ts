/**
 * ХЕДЪРИТЕ ПО ТАБОВЕТЕ · И103, преброено вместо усетено.
 *
 * Негово: „хедърите на всички таблици с имена и подредени КАКТО СА ПО ТАБОВЕТЕ
 * В МЕНЮТО." Тестът пази точно това: реда, групата за нямащите таб, и че нищо
 * не изчезва между входа и изхода (правило 7 — сверка вход↔изход).
 */

import { describe, expect, it } from 'vitest';
import {
  bezTab,
  grupiraniPoTabove,
  IME_BEZ_TAB,
  type PunktNaMenyuto,
  type TablitsaSHedar,
} from '../src/domein/hedari-po-tabove.js';

/**
 * РЕДЪТ ТУК НАРОЧНО НЕ Е АЗБУЧЕН · и това е ПЛАТЕНО.
 *
 * Първата версия на фикстурата беше `imoti · pari · smetki` — азбучна по
 * СЛУЧАЙНОСТ. Счупих групирането да сортира азбучно, и тестът МИНА: две
 * подредби, които съвпадат, не могат да се различат. Проверка, сравнила
 * съвпадение със съвпадение, е надпис.
 *
 * Затова редът е разбъркан: Стопанинът подрежда лентата както си иска
 * (ADR-066), а азбуката няма нищо общо с неговия ред.
 */
const MENYU: readonly PunktNaMenyuto[] = [
  { klyuch: 'smetki', ime: 'Сметки' },
  { klyuch: 'imoti', ime: 'Имоти' },
  { klyuch: 'pari', ime: 'Пари' },
];

function tablitsa(klyuch: string, ekran: string, koloni = 3): TablitsaSHedar {
  return {
    klyuch,
    ime: klyuch,
    ekran,
    glavi: Array.from({ length: koloni }, (_, k) => `колона ${k + 1}`),
    zatvoreni: [],
  };
}

describe('хедърите се групират по табовете на менюто', () => {
  it('редът е РЕДЪТ НА МЕНЮТО, не азбучен и не редът на подаване', () => {
    const grupi = grupiraniPoTabove(
      [tablitsa('Разходи', 'smetki'), tablitsa('Авансите', 'imoti'), tablitsa('Банка', 'pari')],
      MENYU,
    );
    expect(grupi.map((g) => g.ekran)).toEqual(['smetki', 'imoti', 'pari']);
  });

  it('вътре в групата редът на ПОДАВАНЕТО се пази', () => {
    const grupi = grupiraniPoTabove(
      [tablitsa('втора', 'imoti'), tablitsa('първа', 'imoti')],
      MENYU,
    );
    expect(grupi[0]?.tablitsi.map((t) => t.klyuch)).toEqual(['втора', 'първа']);
  });

  it('празна група НЕ се рисува · заглавие без редове е обещание, което не се спазва', () => {
    const grupi = grupiraniPoTabove([tablitsa('Банка', 'pari')], MENYU);
    expect(grupi).toHaveLength(1);
    expect(grupi[0]?.ekran).toBe('pari');
  });

  it('хедър БЕЗ таб пада в ПОСЛЕДНАТА група и тя си има име', () => {
    const grupi = grupiraniPoTabove(
      [tablitsa('без', ''), tablitsa('Банка', 'pari')],
      MENYU,
    );
    expect(grupi.at(-1)?.ime).toBe(IME_BEZ_TAB);
    expect(grupi.at(-1)?.tablitsi.map((t) => t.klyuch)).toEqual(['без']);
  });

  it('хедър, чийто екран НЕ е между живите, пада при нямащите таб · не изчезва', () => {
    const grupi = grupiraniPoTabove([tablitsa('сираче', 'nap')], MENYU);
    expect(grupi).toHaveLength(1);
    expect(grupi[0]?.ime).toBe(IME_BEZ_TAB);
    expect(grupi[0]?.tablitsi[0]?.klyuch).toBe('сираче');
  });

  it('СВЕРКА ВХОД↔ИЗХОД · нито един хедър не се губи и нито един не се дублира', () => {
    const vhod = [
      tablitsa('А', 'imoti'),
      tablitsa('Б', 'pari'),
      tablitsa('В', ''),
      tablitsa('Г', 'imoti'),
      tablitsa('Д', 'nyama-takav'),
    ];
    const izhod = grupiraniPoTabove(vhod, MENYU).flatMap((g) => g.tablitsi);
    expect(izhod).toHaveLength(vhod.length);
    expect([...izhod.map((t) => t.klyuch)].sort()).toEqual(['А', 'Б', 'В', 'Г', 'Д']);
  });

  it('нула хедъри дават нула групи, а не група с нула редове', () => {
    expect(grupiraniPoTabove([], MENYU)).toEqual([]);
  });

  it('празно меню слага ВСИЧКИ при нямащите таб · един ред, не изчезване', () => {
    const grupi = grupiraniPoTabove([tablitsa('А', 'imoti'), tablitsa('Б', 'pari')], []);
    expect(grupi).toHaveLength(1);
    expect(grupi[0]?.tablitsi).toHaveLength(2);
  });

  it('bezTab БРОИ същото, което последната група показва', () => {
    const vhod = [tablitsa('А', 'imoti'), tablitsa('Б', ''), tablitsa('В', 'nyama')];
    expect(bezTab(vhod, MENYU)).toBe(2);
    expect(grupiraniPoTabove(vhod, MENYU).at(-1)?.tablitsi).toHaveLength(2);
  });
});

describe('пинът · надписът се твърди с ръка (резен 46 · група В)', () => {
  it('името за „още не е сложен на таб" е дословно това', () => {
    expect(IME_BEZ_TAB).toBe('още не е сложен на таб');
  });
});
