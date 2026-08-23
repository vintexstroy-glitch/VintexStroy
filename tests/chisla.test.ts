/**
 * ЗНАКЪТ · Приход /+/ и Разход /−/.
 *
 * Негови думи: „Те не са бутон, а УМЕНИЕ НА ДАННИТЕ." Затова тук няма екран и
 * няма събитие за знака — има само пресмятане, което идва даром.
 *
 * Четирите неща, които се пазят:
 *   1. Всяка ЧИСЛОВА колона се появява сама, със сбора си.
 *   2. Знакът се СМЯТА, не се записва — затова колоната мърда сама.
 *   3. Изключването се ЗАПИСВА — то е решение на човек и иска следа.
 *   4. Изключената колона не влиза в НИТО ЕДИН от двата сбора.
 */

import { describe, expect, it } from 'vitest';
import { otCSV } from '../src/iztochnik/csv.js';
import { napraviModel, type ModelNaTablitsa } from '../src/iztochnik/model.js';
import {
  chislovi,
  IMENA_NA_SBOROVETE,
  sDumi,
  sPrevklyuchena,
  vDvataSbora,
  znak,
  ZNAK,
  primer,
  kolonaPoNomer,
} from '../src/domein/chisla.js';

const GLAVA = 'Дата;Основание;Контрагент;Сума;Такса;Документ;ДДС %';
const REDOVE = [
  '05.04.2026;наем април;Домакинство;1200,00;-15,00;4001;20',
  '12.04.2026;наем април;Стройпласт;800,00;-15,00;4002;20',
].join('\n');

function tablitsa(redove = REDOVE): ReturnType<typeof otCSV> {
  return otCSV(`${GLAVA}\n${redove}`, 'Извлечение');
}

function model(izklyucheni: readonly number[] = []): ModelNaTablitsa {
  return napraviModel({
    klyuch: 'Извлечение',
    tablitsa: tablitsa(),
    redNaGlavata: 0,
    koloni: { data: 0, osnovanie: 1, kontragent: 2, suma: 3, dokument: 5, dds: 6 },
    ddsE: 'stavka',
    izklyucheni,
  });
}

describe('кои колони носят цифри', () => {
  it('намира ги сами, със сбора на всяка', () => {
    const k = chislovi(model(), tablitsa());
    const poIme = Object.fromEntries(k.map((x) => [x.ime, x.sbor_st]));
    expect(poIme['Сума']).toBe(2000_00);
    expect(poIme['Такса']).toBe(-30_00);
  });

  it('колоната за ДДС като ПРОЦЕНТ не се предлага — 20 не е сума', () => {
    const imena = chislovi(model(), tablitsa()).map((x) => x.ime);
    expect(imena).not.toContain('ДДС %');
  });

  it('колоната за ДДС като СУМА се предлага', () => {
    const t = otCSV(`Дата;Сума;ДДС лв.\n05.04.2026;600,00;100,00`, 'Х');
    const m = napraviModel({
      klyuch: 'С ДДС в левове',
      tablitsa: t,
      redNaGlavata: 0,
      koloni: { data: 0, suma: 1, dds: 2 },
      ddsE: 'suma',
    });
    expect(chislovi(m, t).map((x) => x.ime)).toEqual(['Сума', 'ДДС лв.']);
  });

  it('колона с текст НЕ се предлага, дори да има числа в нея', () => {
    const t = otCSV('Дата;Сума;Бележка\n05.04.2026;600,00;2024\n12.04.2026;700,00;по договор', 'Х');
    const m = napraviModel({ klyuch: 'Х', tablitsa: t, redNaGlavata: 0, koloni: { data: 0, suma: 1 } });
    expect(chislovi(m, t).map((x) => x.ime)).toEqual(['Сума']);
  });

  it('датата, периодът и НОМЕРЪТ НА ДОКУМЕНТ не са пари', () => {
    const imena = chislovi(model(), tablitsa()).map((x) => x.ime);
    expect(imena).not.toContain('Дата');
    // Кръвно платено: 4001 + 4002 = 8003 лв. е точно тихата грешка.
    expect(imena).not.toContain('Документ');
  });

  it('носи ролята, когато моделът ѝ е дал такава', () => {
    const suma = chislovi(model(), tablitsa()).find((x) => x.ime === 'Сума');
    expect(suma?.rolya).toBe('suma');
    // „Такса" няма роля — тя е просто число, и пак участва.
    expect(chislovi(model(), tablitsa()).find((x) => x.ime === 'Такса')?.rolya).toBeUndefined();
  });
});

describe('знакът се СМЯТА, не се записва', () => {
  it('положителният сбор отива в Приход, отрицателният в Разход', () => {
    expect(znak(1200_00)).toBe('prihod');
    expect(znak(-30_00)).toBe('razhod');
    // Нулата трябва да е НЯКЪДЕ — невидимата нула е по-лоша от нулата на грешното място.
    expect(znak(0)).toBe('prihod');
  });

  it('колоната сменя мястото си сама, когато сборът смени знака', () => {
    const gore = vDvataSbora(chislovi(model(), tablitsa()));
    expect(gore.prihod.map((x) => x.ime)).toEqual(['Сума']);
    expect(gore.razhod.map((x) => x.ime)).toEqual(['Такса']);

    // Следващият месец таксата е върната — същият модел, без нито един нов запис.
    const dolu = vDvataSbora(
      chislovi(model(), tablitsa('05.04.2026;върнато;Банка;1200,00;15,00;4001;20')),
    );
    expect(dolu.razhod).toEqual([]);
    expect(dolu.prihod.map((x) => x.ime).sort()).toEqual(['Сума', 'Такса']);
  });

  it('разходът се показва като ПОЛОЖИТЕЛНО число — знакът е в името на сбора', () => {
    const d = vDvataSbora(chislovi(model(), tablitsa()));
    expect(d.razhod_st).toBe(30_00);
    expect(d.prihod_st).toBe(2000_00);
    expect(ZNAK.prihod).toBe('+');
    expect(IMENA_NA_SBOROVETE.razhod).toBe('Разход');
  });
});

describe('изключването се ЗАПИСВА', () => {
  it('изключената колона не влиза в НИТО ЕДИН от двата сбора', () => {
    const d = vDvataSbora(chislovi(model([4]), tablitsa()));
    expect(d.razhod).toEqual([]);
    expect(d.razhod_st).toBe(0);
    expect(d.izklyucheni.map((x) => x.ime)).toEqual(['Такса']);
    // Не изчезва — вижда се какво е махнато и може да се върне.
    expect(d.izklyucheni).toHaveLength(1);
  });

  it('превключването дава НОВ списък — старият не се пипа', () => {
    const m = model([4]);
    expect(sPrevklyuchena(m, 4)).toEqual([]);
    expect(sPrevklyuchena(m, 3)).toEqual([3, 4]);
    expect(m.izklyucheni).toEqual([4]);
  });

  it('думите казват какво е предложено и какво е махнато', () => {
    expect(sDumi(vDvataSbora(chislovi(model(), tablitsa())))).toBe('1 в Приход /+/ · 1 в Разход /−/');
    expect(sDumi(vDvataSbora(chislovi(model([4]), tablitsa())))).toContain('1 махнати');
  });
});

describe('дребните помощници на екрана', () => {
  it('примерът показва първата клетка, за да се види коя е колоната', () => {
    expect(primer(model(), tablitsa(), 3)).toBe('1200,00');
  });

  it('колоната се намира по номер', () => {
    const k = chislovi(model(), tablitsa());
    expect(kolonaPoNomer(k, 3)?.ime).toBe('Сума');
    expect(kolonaPoNomer(k, 99)).toBeUndefined();
  });
});
