/**
 * РЕДАКТОРЪТ НА ХЕДЪРИ · обещанията, всяко от негово изречение.
 *
 *   1. „Колони не се трият, а само се добавят" — работеща таблица само расте;
 *      празна колона без роля е единственото изключение. (ред 1572)
 *   2. „Раждането/триенето на колона само за управител." (ред 1494)
 *   3. Изтрито меню = директно писане + ЗАКЛЮЧЕНО име. (ред 1994)
 *   4. Трите вида номенклатура — поименно, по И58.
 *   5. Новата колона се появява при семейството — еднакви хедъри. (ред 1982)
 *   6. „Всичко именувано = ред" в Описа на Подредба. (ред 1970)
 *   7. Старият файл се познава и след като главата порасне.
 *   8. Промяната на глава е ново събитие — поправка, не презапис.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { belegNaModel, napraviModel, poznavaLi } from '../src/iztochnik/model.js';
import {
  dayEkran,
  dobaviKolona,
  GreshkaRedaktor,
  iztriyMenyu,
  opisNaPodredba,
  otbelezhiVavezhdane,
  preimenuvayKolona,
  premahniKolona,
  semeystvo,
  smeniVidNaStoynost,
  vidNomenklatura,
  zadayMenyu,
} from '../src/domein/redaktor.js';
import { vidNaKolona } from '../src/domein/kolonno.js';
import {
  ePari,
  IMENA_NA_VIDOVETE_STOYNOST,
  VIDOVE_STOYNOST,
  ZNAK_NA_VIDA,
} from '../src/domein/vid-stoynost.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 23, 13, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

// Главата на „Наеми КЕШ" — неговият собствен образец от Драйва, свит.
const CSV = 'Дата;Място;Имот;Наем\n05.08.2026;Малинова;АП. № 1;550,00';

function model() {
  return napraviModel({
    klyuch: 'Наеми КЕШ',
    tablitsa: otCSV(CSV, 'наеми'),
    redNaGlavata: 0,
    koloni: { data: 0, kontragent: 1, suma: 3 },
  });
}

describe('добавянето на колона', () => {
  it('расте в края; старият отпечатък влиза в историята', () => {
    const m = dobaviKolona(model(), { ime: 'Наемател', rolya: 'sobstvenik' });
    expect(m.glavi).toEqual(['Дата', 'Място', 'Имот', 'Наем', 'Наемател']);
    expect(m.otpechatak).toBe('дата|място|имот|наем|наемател');
    expect(m.predishni).toEqual(['дата|място|имот|наем']);
  });

  it('НЕ е за редактора и наблюдателя — само управителите (ред 1494)', () => {
    expect(() => dobaviKolona(model(), { ime: 'Х', rolya: 'redaktor' })).toThrow(GreshkaRedaktor);
    expect(() => dobaviKolona(model(), { ime: 'Х', rolya: 'nablyudatel' })).toThrow(
      GreshkaRedaktor,
    );
  });

  it('две колони с едно име не минават — и със сменени букви', () => {
    expect(() => dobaviKolona(model(), { ime: ' мЯсто ', rolya: 'sobstvenik' })).toThrow(
      /вече носи колона/,
    );
  });

  it('ражда се наведнъж с вида и номенклатурата си', () => {
    const m = dobaviKolona(model(), {
      ime: 'Начин',
      rolya: 'sobstvenik',
      menyu: ['Кеш', 'Банка'],
    });
    expect(vidNomenklatura(m, 4)).toBe('opis');
    expect(m.menyuta[4]).toEqual(['Кеш', 'Банка']);
  });

  it('затворената колона не носи меню — тя е сметка', () => {
    expect(() =>
      dobaviKolona(model(), { ime: 'Сбор', rolya: 'sobstvenik', zatvorena: true, menyu: ['а'] }),
    ).toThrow(/меню не ѝ трябва/);
    const m = dobaviKolona(model(), { ime: 'Сбор', rolya: 'sobstvenik', zatvorena: true });
    expect(vidNaKolona(m, 4)).toBe('zatvorena');
  });
});

describe('трите вида номенклатура (И58)', () => {
  it('по подразбиране колоната е БЕЗ падащо меню — първият вид', () => {
    expect(vidNomenklatura(model(), 1)).toBe('svobodna');
  });

  it('готовото меню от Описа е вторият вид', () => {
    const m = zadayMenyu(model(), 1, ['Малинова', 'Хисаря', 'Студентски град'], 'sobstvenik');
    expect(vidNomenklatura(m, 1)).toBe('opis');
  });

  it('раждането от въвеждането е третият вид и готовото меню го измества', () => {
    let m = otbelezhiVavezhdane(model(), 2, 'sobstvenik');
    expect(vidNomenklatura(m, 2)).toBe('vavezhdane');
    m = zadayMenyu(m, 2, ['АП. № 1'], 'sobstvenik');
    expect(vidNomenklatura(m, 2)).toBe('opis');
    expect(m.otVavezhdane).toEqual([]);
  });

  it('върху готово меню видът не се сменя направо — първо изтриване', () => {
    const m = zadayMenyu(model(), 1, ['Малинова'], 'sobstvenik');
    expect(() => otbelezhiVavezhdane(m, 1, 'sobstvenik')).toThrow(/първо то се изтрива/);
  });
});

describe('изтритото меню заключва името (ред 1994)', () => {
  it('менюто пада, името се заключва, преименуването отказва', () => {
    let m = zadayMenyu(model(), 1, ['Малинова', 'Хисаря'], 'sobstvenik');
    m = iztriyMenyu(m, 1, 'sobstvenik');
    expect(vidNomenklatura(m, 1)).toBe('svobodna');
    expect(m.zaklyucheni).toEqual([1]);
    expect(() => preimenuvayKolona(m, 1, 'Град', 'sobstvenik')).toThrow(/заключено/);
  });

  it('незаключеното име се преименува и това е промяна за белега', () => {
    const staro = model();
    const novo = preimenuvayKolona(staro, 3, 'Наем €', 'sobstvenik');
    expect(novo.glavi[3]).toBe('Наем €');
    expect(belegNaModel(novo)).not.toBe(belegNaModel(staro));
  });
});

describe('триенето — изключението, не правилото (ред 1572)', () => {
  it('колона с данни не се трие', () => {
    const m = dobaviKolona(model(), { ime: 'Бележка', rolya: 'sobstvenik' });
    expect(() => premahniKolona(m, 4, { rolya: 'sobstvenik', imaDanni: true })).toThrow(
      /не се трият, а само се добавят/,
    );
  });

  it('колона, която носи роля, не се трие — редът спира да става запис', () => {
    expect(() => premahniKolona(model(), 3, { rolya: 'sobstvenik', imaDanni: false })).toThrow(
      /ролята „сума"/,
    );
  });

  it('празна колона без роля пада и номерата слизат с едно', () => {
    let m = dobaviKolona(model(), { ime: 'Излишна', rolya: 'sobstvenik' });
    m = dobaviKolona(m, { ime: 'Начин', rolya: 'sobstvenik', menyu: ['Кеш', 'Банка'] });
    m = premahniKolona(m, 4, { rolya: 'sobstvenik', imaDanni: false });
    expect(m.glavi).toEqual(['Дата', 'Място', 'Имот', 'Наем', 'Начин']);
    expect(m.menyuta[4]).toEqual(['Кеш', 'Банка']);
    expect(m.menyuta[5]).toBeUndefined();
  });

  /**
   * ВИДЪТ НА СТОЙНОСТТА СЕ МЕСТИ ЗАЕДНО С КОЛОНАТА.
   *
   * Намерено от сверката по шестте измерения: `premahniKolona` местеше шест
   * неща по номер на колона и пропускаше седмото — `vidove`. Остане ли то на
   * стария си ключ, видът се лепва за колоната ОТЛЯВО.
   *
   * Цената е в пари: само `evro` влиза в двата сбора (правило 20 · ADR-014).
   * Колона с пари тихо пада към „текст" и изчезва от Приходи/Разходи, а
   * колона с номер на фактура може да стане евро и да влезе в сбор. Числото
   * си остава число — затова никой не забелязва.
   */
  it('видът на стойността слиза с колоната, не остава на съседа', () => {
    let m = dobaviKolona(model(), { ime: 'Излишна', rolya: 'sobstvenik' });
    m = dobaviKolona(m, { ime: 'Такса', rolya: 'sobstvenik' });
    m = smeniVidNaStoynost(m, 5, 'evro', 'sobstvenik');
    expect(m.glavi[5]).toBe('Такса');
    expect(m.vidove[5]).toBe('evro');

    m = premahniKolona(m, 4, { rolya: 'sobstvenik', imaDanni: false });

    expect(m.glavi[4]).toBe('Такса');
    expect(m.vidove[4]).toBe('evro'); // видът дойде със своята колона
    expect(m.vidove[5]).toBeUndefined(); // и не остана на стария номер
  });

  it('видът на ТРЕТАТА колона не се лепва за следващата', () => {
    let m = dobaviKolona(model(), { ime: 'Номер', rolya: 'sobstvenik' });
    m = dobaviKolona(m, { ime: 'Бележка', rolya: 'sobstvenik' });
    m = smeniVidNaStoynost(m, 4, 'evro', 'sobstvenik');

    m = premahniKolona(m, 4, { rolya: 'sobstvenik', imaDanni: false });

    // „Бележка" беше 5, става 4 — и НЕ наследява евро от третата колона.
    expect(m.glavi[4]).toBe('Бележка');
    expect(m.vidove[4]).toBeUndefined();
  });
});

describe('семейството и старите файлове', () => {
  it('старият файл се познава и след като главата порасне', () => {
    const m = dobaviKolona(model(), { ime: 'Наемател', rolya: 'sobstvenik' });
    expect(poznavaLi(m, otCSV(CSV, 'старият износ'))).toBe(true);
  });

  it('роднина е моделът със СЪЩАТА глава — днешна или предишна', () => {
    const naemi = model();
    const banka = napraviModel({
      klyuch: 'Наеми Банка',
      tablitsa: otCSV(CSV, 'банка'),
      redNaGlavata: 0,
      koloni: { data: 0, suma: 3 },
    });
    const chuzhd = napraviModel({
      klyuch: 'Банка ОББ',
      tablitsa: otCSV('Дата;Сума\n01.08.2026;10,00', 'обб'),
      redNaGlavata: 0,
      koloni: { data: 0, suma: 1 },
    });
    expect(semeystvo([naemi, banka, chuzhd], naemi).map((m) => m.klyuch)).toEqual([
      'Наеми Банка',
    ]);
    // Пораслият остава роднина: старата му глава е в историята.
    const porasnal = dobaviKolona(naemi, { ime: 'Наемател', rolya: 'sobstvenik' });
    expect(semeystvo([porasnal, banka, chuzhd], porasnal).map((m) => m.klyuch)).toEqual([
      'Наеми Банка',
    ]);
  });
});

describe('Описът на Подредба — всичко именувано е ред (ред 1970)', () => {
  it('хедър, колони и членове на менюта, всяко със своя дом', () => {
    const m = zadayMenyu(model(), 1, ['Малинова', 'Хисаря'], 'sobstvenik');
    const opis = opisNaPodredba([m]);
    expect(opis.filter((r) => r.vid === 'hedar')).toHaveLength(1);
    expect(opis.filter((r) => r.vid === 'kolona')).toHaveLength(4);
    expect(opis.filter((r) => r.vid === 'chlen').map((r) => r.ime)).toEqual([
      'Малинова',
      'Хисаря',
    ]);
    const mysto = opis.find((r) => r.ime === 'Място');
    expect(mysto?.dom).toBe('Наеми КЕШ');
    expect(mysto?.belezhka).toContain('готово меню');
  });
});

describe('промяната е ново събитие, не презапис', () => {
  it('вторият МоделЗаписан със същия ключ надделява в Огледалото', async () => {
    const { dnevnik, deystviya } = stend();
    const staro = model();
    await deystviya.zapishiModel(staro, { opId: 'model:1' });
    const novo = dobaviKolona(staro, { ime: 'Наемател', rolya: 'sobstvenik' });
    await deystviya.zapishiModel(novo, { opId: 'model:2' });

    const og = await deystviya.ogledalo();
    expect(og.modeli.get('Наеми КЕШ')?.glavi).toContain('Наемател');
    // Журналът пази и двете — историята не се пипа.
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya.filter((s) => s.type === 'МоделЗаписан')).toHaveLength(2);
  });
});

describe('видът на СТОЙНОСТТА · втората половина на ADR-014', () => {
  it('подсказката е ПРЕДЛОЖЕНИЕ — човекът я сменя, и това мени накъде отива сборът', () => {
    // ИСТИНСКИЯТ случай, а не измислен: речникът на подсказката е тесен
    // нарочно. „Неустойка" е пари, но не е в него — колоната се ражда „текст"
    // и сборът ѝ ТИХО не влиза в Приходи. Дотук нямаше къде да се поправи.
    const s = dobaviKolona(model(), { ime: 'Неустойка', rolya: 'sobstvenik' });
    const k = s.glavi.indexOf('Неустойка');
    expect(k).toBeGreaterThan(-1);
    expect(ePari(s.vidove[k] ?? 'tekst')).toBe(false);

    const sled = smeniVidNaStoynost(s, k, 'evro', 'sobstvenik');
    expect(sled.vidove[k]).toBe('evro');
    expect(ePari(sled.vidove[k]!)).toBe(true);
  });

  it('НЕ пипа данните — видът е свойство на КОЛОНАТА, не на клетките', () => {
    const m = model();
    const sled = smeniVidNaStoynost(m, 0, 'protsent', 'sobstvenik');
    expect(sled.glavi).toEqual(m.glavi);
    expect(sled.menyuta).toEqual(m.menyuta);
    expect(sled.zaklyucheni).toEqual(m.zaklyucheni);
  });

  it('отказва непознат вид, вместо да го запише', () => {
    expect(() => smeniVidNaStoynost(model(), 0, 'левче' as never, 'sobstvenik')).toThrow(
      GreshkaRedaktor,
    );
  });

  it('отказва колона, която я няма', () => {
    expect(() => smeniVidNaStoynost(model(), 999, 'evro', 'sobstvenik')).toThrow(GreshkaRedaktor);
  });

  it('иска УПРАВИТЕЛ — редактор не мени накъде отиват парите', () => {
    expect(() => smeniVidNaStoynost(model(), 0, 'evro', 'redaktor')).toThrow(GreshkaRedaktor);
    expect(() => smeniVidNaStoynost(model(), 0, 'evro', 'nablyudatel')).toThrow(GreshkaRedaktor);
  });

  it('петте вида са пет, и списъкът ражда типа — не два отделни реда', () => {
    expect([...VIDOVE_STOYNOST]).toEqual(['evro', 'protsent', 'chislo', 'tekst', 'data']);
    for (const v of VIDOVE_STOYNOST) {
      expect(IMENA_NA_VIDOVETE_STOYNOST[v], v).toBeTruthy();
      expect(typeof ZNAK_NA_VIDA[v], v).toBe('string');
    }
    // Само еврото влиза в двата сбора — това е правило 20, не подробност.
    expect(VIDOVE_STOYNOST.filter(ePari)).toEqual(['evro']);
  });
});

/**
 * ТАБЪТ НА ХЕДЪРА · И103, и се ПИТА, а не се гади.
 *
 * По него матрицата на правата подрежда хедърите „както са по табовете в
 * менюто". Живите екрани се ПОДАВАТ — регистърът им е един и е `EKRANI`.
 */
describe('на кой таб стои хедърът', () => {
  const ZHIVI = ['imoti', 'pari', 'smetki'];

  it('приема ЖИВ екран и го записва в модела', () => {
    const m = dayEkran(model(), 'pari', ZHIVI, 'sobstvenik');
    expect(m.ekran).toBe('pari');
  });

  it('ОТКАЗВА екран, който не е в лентата · табът се избира, не се пише', () => {
    expect(() => dayEkran(model(), 'izmislen', ZHIVI, 'sobstvenik')).toThrow(GreshkaRedaktor);
  });

  it('празното МАХА записа · „още не е сложен на таб" е състояние, не липса', () => {
    const sTab = dayEkran(model(), 'imoti', ZHIVI, 'sobstvenik');
    expect(dayEkran(sTab, '', ZHIVI, 'sobstvenik').ekran).toBeUndefined();
  });

  it('редакторът и наблюдателят НЕ местят хедър · само управителят', () => {
    expect(() => dayEkran(model(), 'pari', ZHIVI, 'redaktor')).toThrow(GreshkaRedaktor);
    expect(() => dayEkran(model(), 'pari', ZHIVI, 'nablyudatel')).toThrow(GreshkaRedaktor);
  });

  it('старият модел няма таб и това НЕ е грешка · пада към празно при четене', () => {
    expect(model().ekran).toBeUndefined();
  });

  it('табът НЕ пипа нищо друго в хедъра · глави, роли и отпечатък стоят', () => {
    const star = model();
    const nov = dayEkran(star, 'smetki', ZHIVI, 'sobstvenik');
    expect(nov.glavi).toEqual(star.glavi);
    expect(nov.otpechatak).toBe(star.otpechatak);
    expect(nov.koloni).toEqual(star.koloni);
  });
});
