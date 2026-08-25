/**
 * ИЗВЛЕЧЕНИЕТО ОТ КАРТА · „кое къде отива" (И96 т.10 · ADR-038).
 *
 * Тестът, заради който този резен съществува, е един:
 *
 *   ВНОС С ОБХВАТ 15.07–15.08 НЕ ПОРАЖДА НИТО ЕДНО СТОРНО ЗА 05.07.
 *
 * Служебният внос сравнява с целия МЕСЕЦ и гаси всичко, което го няма във
 * файла. Копиран дословно, той би изтрил половин юли при всяко теглене на
 * извлечение. Обхватът не е период, и разликата се пази с тест, не с внимание.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { NASTAVKA_LICHEN } from '../src/domein/akaunt.js';
import { otCSV } from '../src/iztochnik/csv.js';
import {
  GreshkaKarta,
  klyuchNaLichnoDvizhenie,
  koloniNaKartata,
  posokaOtRed,
  prochetiKarta,
  saldoNaFayla,
  sleiIzvlecheniya,
  sumaSaZnak,
} from '../src/iztochnik/karta.js';
import {
  imaShtoDaSePravi,
  podozreniyeZa,
  sravniLichno,
  sverkaNaVnos,
  temaOtPametta,
  zaPisane,
} from '../src/domein/lichen-vnos.js';
import { DOLAR } from '../src/yadro/valuta.js';
import { SHA } from './pomoshtni.js';

const IMEYL = 'ivo@example.bg';
const LICHEN = `${IMEYL}${NASTAVKA_LICHEN}`;

/** Глава на извлечение, каквато дава българска банка. */
const GLAVA = 'Дата;Описание;Сума;Референция;Салдо';

function izvlechenie(redove: string, ime = 'карта-юли.csv') {
  return prochetiKarta({
    tablitsa: otCSV(`${GLAVA}\n${redove}`, ime),
    ime,
    otpechatak: `otp-${ime}`,
  });
}

async function sLichno() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const lichni = new Deystviya({
    vrata,
    dnevnik,
    naematel: LICHEN,
    actor: IMEYL,
    chasovnik: () => new Date(Date.UTC(2026, 7, 25, 12, tik++)).toISOString(),
  });
  await lichni.prevklyuchiLichno(
    { vklyucheno: true, sluzhebniyat: 'firma.bg', myasto: 'MasterBook/Лично' },
    { opId: 'l1' },
  );
  return lichni;
}

const DVIZHENIE = (n: Record<string, unknown> = {}) => ({
  dvizhenieId: 'd1',
  data: '2026-07-05',
  posoka: 'razhod' as const,
  suma_st: 35_00,
  temaId: '',
  koy: 'ЛИДЛ',
  opis: '',
  dokument: '',
  klyuch: '',
  izvor: '',
  ...n,
});

describe('сумата със знак · трите норми на банките', () => {
  it('минус, скоби и буквен признак значат едно и също', () => {
    expect(sumaSaZnak('-35,00')).toBe(-35_00);
    expect(sumaSaZnak('(35,00)')).toBe(-35_00);
    expect(sumaSaZnak('35,00 DR')).toBe(-35_00);
    expect(sumaSaZnak('35,00 CR')).toBe(35_00);
    expect(sumaSaZnak('35,00')).toBe(35_00);
  });

  it('и скоби, и признак наведнъж', () => {
    expect(sumaSaZnak('(35,00 DR)')).toBe(-35_00);
  });

  it('ВАЛУТАТА се подава · СЪЩИЯТ низ е две различни числа', () => {
    // „1,50“ е един и половина на евро и СТО ПЕТДЕСЕТ на долар — стократна
    // разлика от един и същ знак. Затова валутата се пита, а не се гадае.
    expect(sumaSaZnak('1,50')).toBe(1_50);
    expect(sumaSaZnak('1,50', DOLAR)).toBe(150_00);
    expect(sumaSaZnak('1,234.56', DOLAR)).toBe(1_234_56);
  });

  it('празна клетка се КАЗВА', () => {
    expect(() => sumaSaZnak('   ')).toThrow(GreshkaKarta);
  });
});

describe('посоката · трите начина, по които банката я казва', () => {
  it('една колона със знак', () => {
    expect(posokaOtRed({ suma: '-35,00', debit: '', kredit: '' })).toEqual({
      posoka: 'razhod',
      suma_st: 35_00,
    });
    expect(posokaOtRed({ suma: '2000,00', debit: '', kredit: '' })).toEqual({
      posoka: 'prihod',
      suma_st: 2_000_00,
    });
  });

  it('две колони БИЯТ една със знак · банката вече е решила', () => {
    // дори без минус, дебитната колона значи изход
    expect(posokaOtRed({ suma: '', debit: '35,00', kredit: '' })).toEqual({
      posoka: 'razhod',
      suma_st: 35_00,
    });
    expect(posokaOtRed({ suma: '', debit: '', kredit: '2000,00' })).toEqual({
      posoka: 'prihod',
      suma_st: 2_000_00,
    });
  });

  it('число и в двете се отказва, вместо да се гадае', () => {
    expect(() => posokaOtRed({ suma: '', debit: '35,00', kredit: '10,00' })).toThrow(/не се разчита/);
  });

  it('нулата е ОТКАЗ, не сума', () => {
    expect(() => posokaOtRed({ suma: '0,00', debit: '', kredit: '' })).toThrow(/нула/);
  });
});

describe('ключът · посоката е В НЕГО', () => {
  it('35,00 навън и 35,00 навътре при същия търговец са ДВЕ различни неща', () => {
    const obshto = { dokument: '', data: '2026-07-05', koy: 'ЛИДЛ', suma_st: 35_00 };
    expect(klyuchNaLichnoDvizhenie({ ...obshto, posoka: 'razhod' })).not.toBe(
      klyuchNaLichnoDvizhenie({ ...obshto, posoka: 'prihod' }),
    );
  });

  it('референцията бие всичко · тя е номерът на банката', () => {
    expect(
      klyuchNaLichnoDvizhenie({ dokument: 'REF-42', data: '2026-07-05', koy: 'х', posoka: 'razhod', suma_st: 1 }),
    ).toBe('ref:ref-42');
  });

  it('свежда се в NFC · иначе NFD-клавиатура ражда дубъл', () => {
    const nfd = 'Кафӗ'; // „й"-подобно, но разложено
    const a = klyuchNaLichnoDvizhenie({ dokument: '', data: '2026-07-05', koy: nfd, posoka: 'razhod', suma_st: 1 });
    const b = klyuchNaLichnoDvizhenie({
      dokument: '', data: '2026-07-05', koy: nfd.normalize('NFC'), posoka: 'razhod', suma_st: 1,
    });
    expect(a).toBe(b);
  });
});

describe('четенето на листа', () => {
  it('чете редовете, познава главата по ДУМИ и мери ОБХВАТА', () => {
    const s = izvlechenie(
      ['05.07.2026;ЛИДЛ;-35,00;REF-1;1000,00', '31.07.2026;Заплата;2000,00;REF-2;3000,00'].join('\n'),
    );
    expect(s.redove).toHaveLength(2);
    expect(s.ot).toBe('2026-07-05');
    expect(s.do).toBe('2026-07-31');
    expect(s.redove[0]?.posoka).toBe('razhod');
    expect(s.redove[1]?.posoka).toBe('prihod');
  });

  it('неразчетеният ред се БРОИ, а не спира партидата', () => {
    const s = izvlechenie(
      ['05.07.2026;ЛИДЛ;-35,00;REF-1;1000,00', 'не-е-дата;нещо;абв;;'].join('\n'),
    );
    expect(s.redove).toHaveLength(1);
    expect(s.propusnati).toHaveLength(1);
    expect(s.propusnati[0]?.red).toBe(3);
  });

  it('два ЕДНАКВИ реда в един файл са ДВА истински разхода', () => {
    const s = izvlechenie(['05.07.2026;ЛИДЛ;-3,50;;', '05.07.2026;ЛИДЛ;-3,50;;'].join('\n'));
    expect(s.redove).toHaveLength(2);
    expect(new Set(s.redove.map((r) => r.klyuch)).size).toBe(2);
  });

  it('файл без дата и сума се отказва С ДУМИ', () => {
    expect(() => koloniNaKartata(otCSV('Име;Адрес\nИво;София', 'х.csv'))).toThrow(/не прилича на извлечение/);
  });
});

describe('слепването · препокриващите се извлечения са НОРМАТА', () => {
  it('един и същ ред от ДВА файла се брои ВЕДНЪЖ и се КАЗВА', () => {
    const red = '05.07.2026;ЛИДЛ;-35,00;REF-1;1000,00';
    const a = izvlechenie(red, 'юли.csv');
    const b = izvlechenie(red, 'юли-и-август.csv');
    const s = sleiIzvlecheniya([a, b]);
    expect(s.redove).toHaveLength(1);
    expect(s.povtoreni).toHaveLength(1);
    expect(s.povtoreni[0]?.fayl).toBe('юли-и-август.csv');
  });

  it('обхватът е ОБЕДИНЕНИЕТО, не сечението', () => {
    const a = izvlechenie('05.07.2026;ЛИДЛ;-35,00;R1;', 'а.csv');
    const b = izvlechenie('20.08.2026;ОМВ;-80,00;R2;', 'б.csv');
    const s = sleiIzvlecheniya([a, b]);
    expect(s.ot).toBe('2026-07-05');
    expect(s.do).toBe('2026-08-20');
  });

  it('два еднакви реда в СЪЩИЯ файл оцеляват и двата', () => {
    const s = sleiIzvlecheniya([izvlechenie(['05.07.2026;ЛИДЛ;-3,50;;', '05.07.2026;ЛИДЛ;-3,50;;'].join('\n'))]);
    expect(s.redove).toHaveLength(2);
    expect(s.povtoreni).toHaveLength(0);
  });
});

describe('салдото на файла · третата, НЕЗАВИСИМА мярка', () => {
  it('казва колко твърди БАНКАТА, че е мръднало', () => {
    const s = izvlechenie(
      ['05.07.2026;ЛИДЛ;-35,00;R1;965,00', '31.07.2026;Заплата;2000,00;R2;2965,00'].join('\n'),
    );
    // преди първия ред: 965,00 + 35,00 = 1000,00 · след последния: 2965,00
    expect(saldoNaFayla(s.redove)).toBe(2_965_00 - 1_000_00);
    // и това съвпада със сбора на самите редове
    expect(saldoNaFayla(s.redove)).toBe(2_000_00 - 35_00);
  });

  it('без колона „Салдо" връща null · измислена нула изглежда като проверена', () => {
    const s = prochetiKarta({
      tablitsa: otCSV('Дата;Описание;Сума\n05.07.2026;ЛИДЛ;-35,00', 'х.csv'),
      ime: 'х.csv',
      otpechatak: 'o',
    });
    expect(saldoNaFayla(s.redove)).toBeNull();
  });
});

describe('ПАМЕТТА · от собствените му минали избори', () => {
  it('предлага темата, която е избирал за този търговец', () => {
    const minali = [
      DVIZHENIE({ dvizhenieId: 'a', koy: 'ЛИДЛ', temaId: 'hrana' }),
      DVIZHENIE({ dvizhenieId: 'b', koy: 'ЛИДЛ', temaId: 'hrana' }),
      DVIZHENIE({ dvizhenieId: 'c', koy: 'ЛИДЛ', temaId: 'dom' }),
    ].map((d) => ({ ...d, kreditId: '', glavnitsa_st: 0, lihva_st: 0, taksa_st: 0, izklyuchen: false, prichina: '' }));
    expect(temaOtPametta('ЛИДЛ', minali)).toBe('hrana');
    expect(temaOtPametta('лидл', minali)).toBe('hrana'); // регистърът не пречи
    expect(temaOtPametta('ОМВ', minali)).toBe('');
  });

  it('празен търговец не помни нищо', () => {
    expect(temaOtPametta('  ', [])).toBe('');
  });
});

describe('срещата с Журнала', () => {
  it('ВНОС С ОБХВАТ 15.07–15.08 НЕ ГАСИ РЕД ОТ 05.07', async () => {
    // Точката, заради която този резен има свой модул вместо да преизползва
    // служебния внос.
    const lichni = await sLichno();
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'star', data: '2026-07-05', klyuch: 'ref:стар-ред' }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    const slyata = sleiIzvlecheniya([izvlechenie('20.07.2026;ОМВ;-80,00;R9;', 'юли-август.csv')]);
    const plan = sravniLichno(o, slyata);

    // обхватът на файла е 20.07–20.07, значи 05.07 изобщо не се гледа
    expect(plan.redove.filter((r) => r.kakvo === 'lipsva')).toHaveLength(0);
    // и НИТО ЕДИН ред не е за гасене — присъдата „lipsva" дори не съществува тук
    expect(zaPisane(plan).every((r) => r.kakvo === 'nov' || r.kakvo === 'promenen')).toBe(true);
  });

  it('липсващият В ОБХВАТА се ПОКАЗВА, но пак не се гаси', async () => {
    const lichni = await sLichno();
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'star', data: '2026-07-20', klyuch: 'ref:няма-го-във-файла' }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    const slyata = sleiIzvlecheniya([izvlechenie('20.07.2026;ОМВ;-80,00;R9;', 'юли.csv')]);
    const plan = sravniLichno(o, slyata);

    const lipsva = plan.redove.filter((r) => r.kakvo === 'lipsva');
    expect(lipsva).toHaveLength(1);
    // ПОКАЗВА се, но НЕ влиза в онова, което ще се пише
    expect(zaPisane(plan).map((r) => r.kakvo)).toEqual(['nov']);
  });

  it('ТЕМАТА СЕ НАСЛЕДЯВА при повторен внос · иначе работата изчезва', async () => {
    const lichni = await sLichno();
    await lichni.zapishiLichnaTema({ temaId: 'gorivo', ime: 'Гориво', grupa: '', spryana: false }, { opId: 't' });
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({
        dvizhenieId: 'd1', data: '2026-07-20', suma_st: 80_00, koy: 'ОМВ',
        temaId: 'gorivo', klyuch: 'ref:r9',
      }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    // същият файл, пуснат втори път
    const plan = sravniLichno(o, sleiIzvlecheniya([izvlechenie('20.07.2026;ОМВ;-80,00;R9;', 'пак.csv')]));
    const red = plan.redove[0]!;
    expect(red.kakvo).toBe('bezPromyana');
    expect(red.temaId).toBe('gorivo');
    expect(red.otKade).toBe('от стария запис');
  });

  it('НОВИЯТ ред получава тема ОТ ПАМЕТТА и се КАЗВА откъде', async () => {
    const lichni = await sLichno();
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'd1', koy: 'ОМВ', temaId: 'gorivo', klyuch: 'ref:старо' }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    const plan = sravniLichno(o, sleiIzvlecheniya([izvlechenie('20.07.2026;ОМВ;-80,00;R-НОВ;', 'нов.csv')]));
    const red = plan.redove.find((r) => r.kakvo === 'nov')!;
    expect(red.temaId).toBe('gorivo');
    expect(red.otKade).toBe('от паметта');
  });

  it('ПОДОЗРЕНИЕТО само показва · ръчният ред няма ключ и минава за нов', async () => {
    const lichni = await sLichno();
    // въведен на ръка — без ключ
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'racheh', data: '2026-07-19', suma_st: 80_00, koy: 'ОМВ' }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    const plan = sravniLichno(o, sleiIzvlecheniya([izvlechenie('20.07.2026;ОМВ;-80,00;R9;', 'нов.csv')]));
    const red = plan.redove[0]!;
    expect(red.kakvo).toBe('nov');
    expect(red.podozrenie).toMatch(/1 ден разлика/);
    // но пак се пише — човекът решава, не машината
    expect(zaPisane(plan)).toHaveLength(1);
  });

  it('извън прозореца от 7 дни не буди подозрение', () => {
    const star = {
      ...DVIZHENIE({ data: '2026-07-01', suma_st: 80_00 }),
      kreditId: '', glavnitsa_st: 0, lihva_st: 0, taksa_st: 0, izklyuchen: false, prichina: '',
    };
    const nov = {
      klyuch: 'ref:x', data: '2026-07-20', posoka: 'razhod' as const,
      suma_st: 80_00, koy: 'ОМВ', dokument: '', saldoSled_st: 0,
    };
    expect(podozreniyeZa(nov, [star])).toBeNull();
  });
});

describe('сверката на партидата (правило 7)', () => {
  it('брои редовете и КАЗВА разликата, дори когато е нула', async () => {
    const lichni = await sLichno();
    const o = await lichni.ogledalo();
    const slyata = sleiIzvlecheniya([
      izvlechenie(['05.07.2026;ЛИДЛ;-35,00;R1;', '31.07.2026;Заплата;2000,00;R2;'].join('\n')),
    ]);
    const plan = sravniLichno(o, slyata);
    const s = sverkaNaVnos(plan);
    expect(s.redove).toBe(2);
    expect(s.nov).toBe(2);
    expect(s.vhod_st).toBe(35_00 + 2_000_00);
    expect(s.izhod_st).toBe(35_00 + 2_000_00);
    expect(s.razlika_st).toBe(0); // всичко влиза — нула, и се ЗАПИСВА
    expect(s.prihod_st).toBe(2_000_00);
    expect(s.razhod_st).toBe(35_00);
  });

  it('разликата НЕ е нула, когато ред вече е бил в Журнала — и това е вярно', async () => {
    const lichni = await sLichno();
    await lichni.zapishiLichnoDvizhenie(
      DVIZHENIE({ dvizhenieId: 'd1', data: '2026-07-05', suma_st: 35_00, koy: 'ЛИДЛ', klyuch: 'ref:r1' }),
      { opId: 'a' },
    );
    const o = await lichni.ogledalo();
    const plan = sravniLichno(o, sleiIzvlecheniya([izvlechenie('05.07.2026;ЛИДЛ;-35,00;R1;', 'пак.csv')]));
    const s = sverkaNaVnos(plan);
    expect(s.bezPromyana).toBe(1);
    expect(s.vhod_st).toBe(35_00);
    expect(s.izhod_st).toBe(0); // нищо ново не влиза
    expect(s.razlika_st).toBe(35_00); // и разликата е ТОЧНО непроменения ред
    expect(imaShtoDaSePravi(plan)).toBe(false);
  });
});
