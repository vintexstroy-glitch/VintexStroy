/**
 * ПЛАЩАНИЯ АРХИВ · седмичният регистър и трите вида плащане (резен 22 · ADR-082).
 *
 * Единайсетте обещания:
 *
 *   1. Тринайсетте колони стоят в НЕГОВИЯ ред · броят се, не се четат.
 *   2. Заплата пълни „Заплата" и „Дни", но НЕ „Фактура №" · и обратно.
 *   3. Фактура по БАНКА не влиза · тук са само кеш и карта.
 *   4. Прехвърлената седмица не се брои ВТОРИ път като разход по заплати.
 *   5. Сборът по вид = сборът на седмицата · сверката затваря и при нула.
 *   6. Сверката може да ПАДНЕ · вход и изход са два независими пътя.
 *   7. Сторнирана заплата пада от реда САМА.
 *   8. Файлът носи ТРИ листа · и двете фактури имат ЕДИН хедър.
 *   9. Сумите във файла са ЧИСЛА, не текст · Excel смята по тях.
 *  10. Празна седмица дава три празни листа, а не липсващ файл.
 *  11. Целият екран е ОГЛЕДАЛО · нула нови събития (мери се).
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  IMENATA_NA_VIDOVETE,
  kletkata,
  BEZ_KATEGORIYA,
  kategoriyataNa,
  KOLONI_PLASHTANIYA_ARHIV,
  koloniteNaVida,
  NEGOVITE_TRINAYSET,
  sashtnostNaKategoriya,
  redoveNaPlashtaniyata,
  redoveNaVida,
  sborovetePoKategoriya,
  sborovetePoVid,
  sedmitsataZaEkrana,
  sedmitsiSPlashtaniya,
  sveriSedmitsata,
  vidatNaRazhoda,
  VIDOVE_PLASHTANE,
  ZATVORENI_PLASHTANIYA,
  type RedNaPlashtane,
} from '../src/domein/plashtaniya-arhiv.js';
import { imetoNaSedmichniyaFayl, listNaVida, sedmichenFayl } from '../src/iznos/sedmichen-fayl.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
/** 2026-W35 · понеделник 24.08, неделя 30.08 */
const SEDMITSA = '2026-W35';
const KOGATO = '2026-08-29T12:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 29, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const ZAPLATA = {
  zaplataId: 'ZP-1',
  sedmitsa: SEDMITSA,
  proektId: '',
  ime: 'Иван Петров',
  dlazhnost: 'зидар',
  obekt: 'бл. 3 · ап. 12',
  dnevna_st: 120_00,
  dni: 5,
};

const FAKTURA = {
  potok: 'fakturi',
  dostavchik: 'Баумит ЕООД',
  opis: 'вар и цимент',
  suma_st: 240_00,
  sektor: 'pokupki-materiali',
  nachin: 'в брой' as const,
  data: '2026-08-26',
  dokument: '0000001234',
  stavka: 20,
};

/** Пълният стенд · заплата + фактура в брой + фактура с карта + една по банка. */
async function sVsichko() {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiZaplata(ZAPLATA, { opId: 'op-zpl' });
  await deystviya.zapishiRazhod('RZ-kesh', FAKTURA, { opId: 'op-f1' });
  await deystviya.zapishiRazhod(
    'RZ-karta',
    { ...FAKTURA, nachin: 'карта', suma_st: 60_00, dokument: '0000005678', data: '2026-08-27' },
    { opId: 'op-f2' },
  );
  await deystviya.zapishiRazhod(
    'RZ-banka',
    { ...FAKTURA, nachin: 'банка', suma_st: 999_00, dokument: '0000009999', data: '2026-08-28' },
    { opId: 'op-f3' },
  );
  return { dnevnik, deystviya };
}

// ── 1 · КОЛОНИТЕ ───────────────────────────────────────────────────────────

describe('тринайсетте колони · неговата наредба, не подредба при рисуване', () => {
  it('са ТРИНАЙСЕТ и в НЕГОВИЯ ред', () => {
    // НЕГОВИТЕ тринайсет стоят на местата си · новото се ДОЛЕПЯ отдясно.
    expect(KOLONI_PLASHTANIYA_ARHIV.slice(0, NEGOVITE_TRINAYSET).join(' · ')).toBe(
      'Дата · Имот · Обект · Страна · Вид · Начин · Сметка · Бележка · Заплата · Дни · ' +
        'Фактура № · Сверка · Сума €',
    );
    expect(NEGOVITE_TRINAYSET).toBe(13);
    expect(KOLONI_PLASHTANIYA_ARHIV).toHaveLength(14);
    expect(KOLONI_PLASHTANIYA_ARHIV.at(-1)).toBe('Категория');
  });

  it('и СМЕТНАТИТЕ са затворени · те не се редактират от никого', () => {
    expect(ZATVORENI_PLASHTANIYA.map((i) => KOLONI_PLASHTANIYA_ARHIV[i]).join(' · ')).toBe(
      'Вид · Сметка · Сверка · Сума €',
    );
  });

  it('хедърът на един лист е тринайсетте МИНУС ненужните · не се изписва втори път', () => {
    expect(koloniteNaVida('zaplata')).not.toContain('Фактура №');
    expect(koloniteNaVida('zaplata')).toContain('Дни');
    expect(koloniteNaVida('faktura-kesh')).toContain('Фактура №');
    expect(koloniteNaVida('faktura-kesh')).not.toContain('Дни');
    // всяка колона на лист е колона от тринайсетте, в същия ред
    for (const vid of VIDOVE_PLASHTANE) {
      const koloni = koloniteNaVida(vid);
      const redut = koloni.map((k) => KOLONI_PLASHTANIYA_ARHIV.indexOf(k));
      expect(redut.every((x, i) => x >= 0 && (i === 0 || x > redut[i - 1]!))).toBe(true);
    }
  });

  it('и ДВЕТЕ ФАКТУРИ носят ЕДИН И СЪЩ хедър · „така се групират"', () => {
    expect(koloniteNaVida('faktura-kesh')).toEqual(koloniteNaVida('faktura-karta'));
    expect(koloniteNaVida('zaplata')).not.toEqual(koloniteNaVida('faktura-kesh'));
  });
});

// ── 2 · КОЙ КОЯ КЛЕТКА ПЪЛНИ ───────────────────────────────────────────────

describe('заплата и фактура пълнят РАЗЛИЧНИ клетки · празното е честно', () => {
  it('заплатата носи ставка и дни, а „Фактура №" ѝ е празна', async () => {
    const { dnevnik } = await sVsichko();
    const r = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA).find(
      (x) => x.vid === 'zaplata',
    )!;
    expect(kletkata(r, 'Заплата')).toBe(120_00);
    expect(kletkata(r, 'Дни')).toBe(5);
    expect(kletkata(r, 'Фактура №')).toBe('');
    expect(kletkata(r, 'Сума €')).toBe(600_00);
    // датата е НЕДЕЛЯТА · същата, с която прехвърлянето ражда разхода
    expect(kletkata(r, 'Дата')).toBe('2026-08-30');
    expect(kletkata(r, 'Сметка')).toBe('604');
  });

  it('фактурата носи номер, а „Заплата" и „Дни" ѝ са празни', async () => {
    const { dnevnik } = await sVsichko();
    const r = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA).find(
      (x) => x.vid === 'faktura-kesh',
    )!;
    expect(kletkata(r, 'Фактура №')).toBe('0000001234');
    expect(kletkata(r, 'Заплата')).toBe('');
    expect(kletkata(r, 'Дни')).toBe('');
    expect(kletkata(r, 'Страна')).toBe('Баумит ЕООД');
    expect(kletkata(r, 'Сметка')).toBe('601');
  });

  it('и „Сверка" КАЗВА две различни неща за двата вида', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    const predi = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(predi.find((x) => x.vid === 'zaplata')!.svereno).toBe('чака петък');
    expect(predi.find((x) => x.vid === 'faktura-kesh')!.svereno).toBe('с документ');

    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const sled = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(sled.find((x) => x.vid === 'zaplata')!.svereno).toBe('в Разходи');
  });
});

// ── 3 · БАНКАТА НЕ ВЛИЗА ───────────────────────────────────────────────────

describe('фактура по БАНКА не влиза · тя се обобщава от извлечението', () => {
  it('трите вида са три · банковата фактура няма вид', () => {
    expect(vidatNaRazhoda({ potok: 'fakturi', nachin: 'в брой' })).toBe('faktura-kesh');
    expect(vidatNaRazhoda({ potok: 'fakturi', nachin: 'карта' })).toBe('faktura-karta');
    expect(vidatNaRazhoda({ potok: 'fakturi', nachin: 'банка' })).toBeUndefined();
    expect(vidatNaRazhoda({ potok: 'zaplati', nachin: 'в брой' })).toBeUndefined();
    expect(vidatNaRazhoda({ potok: 'krediti', nachin: 'в брой' })).toBeUndefined();
  });

  it('и 999,00 € по банка НЕ се появяват в седмицата', async () => {
    const { dnevnik } = await sVsichko();
    const redove = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(redove.map((r) => r.id)).not.toContain('RZ-banka');
    expect(redove.reduce((s, r) => s + r.suma_st, 0)).toBe(600_00 + 240_00 + 60_00);
  });

  it('а ПРЕХВЪРЛЕНАТА седмица не се брои втори път като разход', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const redove = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    // Разходът, който прехвърлянето роди, е по потока „Заплати" — не „Фактури".
    expect(redove.filter((r) => r.vid === 'zaplata')).toHaveLength(1);
    expect(redove.reduce((s, r) => s + r.suma_st, 0)).toBe(600_00 + 240_00 + 60_00);
  });
});

// ── 4 · СБОРОВЕТЕ И СВЕРКАТА ───────────────────────────────────────────────

describe('сборовете по вид и сверката вход↔изход', () => {
  it('трите сбора дават сбора на седмицата', async () => {
    const { dnevnik } = await sVsichko();
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);
    expect(s.sborove.map((v) => [v.ime, v.broy, v.suma_st])).toEqual([
      ['Заплати', 1, 600_00],
      ['Фактури Кеш', 1, 240_00],
      ['Фактури Карта', 1, 60_00],
    ]);
    expect(s.obshto_st).toBe(900_00);
  });

  it('сверката ЗАТВАРЯ · и разликата се записва, дори когато е нула', async () => {
    const { dnevnik } = await sVsichko();
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);
    expect(s.sverka.razlika).toBe(0);
    expect(s.sverka.nared).toBe(true);
    expect(s.sverka.vhod).toBe(900_00);
    expect(s.sverka.kakvo).toContain(SEDMITSA);
  });

  it('и МОЖЕ да падне · вход и изход са два независими пътя', async () => {
    const { dnevnik } = await sVsichko();
    const o = await ogledaloto(dnevnik);
    const redove = redoveNaPlashtaniyata(o, SEDMITSA);
    // Изгубен ред · точно онова, което сверката е сложена да лови.
    const okastreni = redove.filter((r) => r.vid !== 'faktura-karta');
    const padnala = sveriSedmitsata(o, SEDMITSA, okastreni, KOGATO);
    expect(padnala.nared).toBe(false);
    expect(padnala.razlika).toBe(-60_00);
  });

  it('празна седмица дава нули · и трите вида пак се КАЗВАТ', async () => {
    const { dnevnik } = await sVsichko();
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), '2026-W20', KOGATO);
    expect(s.redove).toHaveLength(0);
    expect(s.sborove).toHaveLength(3);
    expect(s.sverka.nared).toBe(true);
    expect(s.obshto_st).toBe(0);
  });

  it('седмиците със записи излизат най-новата отпред', async () => {
    const { dnevnik } = await sVsichko();
    expect(sedmitsiSPlashtaniya(await ogledaloto(dnevnik))).toEqual([SEDMITSA]);
  });
});

// ── 5 · ОГЛЕДАЛО, НЕ ЖУРНАЛ ────────────────────────────────────────────────

describe('целият регистър е ОГЛЕДАЛО · нищо не се записва', () => {
  it('сторнирана заплата пада от реда САМА · без нито един ред код за това', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    const predi = await ogledaloto(dnevnik);
    expect(redoveNaPlashtaniyata(predi, SEDMITSA)).toHaveLength(3);

    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.zaplati.get('ZP-1')!.seq, prichina: 'човекът не е идвал' },
      { opId: 'op-storno-z' },
    );
    const bezZaplata = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(bezZaplata.filter((r) => r.vid === 'zaplata')).toHaveLength(0);
    expect(bezZaplata.reduce((s, r) => s + r.suma_st, 0)).toBe(240_00 + 60_00);
  });

  it('и сторнирана ФАКТУРА пада по същия път · сверката остава затворена', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-2',
      { pogasyavaSeq: predi.razhodi.get('RZ-karta')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-storno-f' },
    );
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);
    expect(s.redove.map((r) => r.id)).not.toContain('RZ-karta');
    expect(s.obshto_st).toBe(600_00 + 240_00);
    // Сверката пак затваря · и двата ѝ пътя са изгубили СЪЩИЯ ред.
    expect(s.sverka.nared).toBe(true);
  });

  it('гледането и свалянето не раждат НИТО ЕДНО събитие', async () => {
    const { dnevnik } = await sVsichko();
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;
    const o = await ogledaloto(dnevnik);
    const s = sedmitsataZaEkrana(o, SEDMITSA, KOGATO);
    sedmichenFayl(s.redove);
    sborovetePoVid(s.redove);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
  });
});

// ── 6 · ФАЙЛЪТ ─────────────────────────────────────────────────────────────

describe('седмичният файл · три листа, числа, едно име', () => {
  it('носи ТРИ листа с неговите имена', async () => {
    const { dnevnik } = await sVsichko();
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);
    const tablitsi = await otXLSX(sedmichenFayl(s.redove), 'ПЛАЩАНИЯ.xlsx');
    expect(tablitsi.map((t) => t.ime)).toEqual([
      IMENATA_NA_VIDOVETE['zaplata'],
      IMENATA_NA_VIDOVETE['faktura-kesh'],
      IMENATA_NA_VIDOVETE['faktura-karta'],
    ]);
  });

  it('и празният вид дава лист с ХЕДЪР и нула реда, а не липсващ лист', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiZaplata(ZAPLATA, { opId: 'op-zpl' });
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);
    const tablitsi = await otXLSX(sedmichenFayl(s.redove), 'ПЛАЩАНИЯ.xlsx');
    expect(tablitsi).toHaveLength(3);
    const karta = tablitsi.find((t) => t.ime === 'Фактури Карта')!;
    expect(karta.redove.length).toBeGreaterThanOrEqual(1);
    expect(karta.redove[0]).toContain('Фактура №');
  });

  it('сумите влизат като ЧИСЛА · по текст Excel не смята', async () => {
    const red: RedNaPlashtane = {
      id: 'X',
      vid: 'faktura-kesh',
      sedmitsa: SEDMITSA,
      data: '2026-08-26',
      myasto: '',
      obekt: '',
      strana: 'Баумит ЕООД',
      nachin: 'в брой',
      smetka: '601',
      belezhka: 'вар',
      zaplata_st: undefined,
      dni: undefined,
      faktura: '0000001234',
      svereno: 'с документ',
      suma_st: 240_00,
      kategoriya: '',
    };
    const list = listNaVida([red], 'faktura-kesh');
    const kade = list.koloni.findIndex((k) => k.ime === 'Сума €');
    expect(typeof list.redove[0]![kade]).toBe('number');
    expect(list.redove[0]![kade]).toBe(240_00);
  });

  it('и името носи СЕДМИЦАТА · за да не се преименува на ръка', () => {
    expect(imetoNaSedmichniyaFayl(SEDMITSA)).toBe('PLASHTANIYA-2026-W35.xlsx');
    // ЛАТИНИЦА · кирилицата не оцелява по пътя `<a download>` (проход §24).
    expect(/^[\u0021-\u007e]+$/.test(imetoNaSedmichniyaFayl(SEDMITSA))).toBe(true);
  });

  it('редовете на един вид са само неговите', async () => {
    const { dnevnik } = await sVsichko();
    const redove = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(redoveNaVida(redove, 'faktura-karta').map((r) => r.id)).toEqual(['RZ-karta']);
  });
});

// ── КАТЕГОРИЯТА · четиринайсетата колона (резен 25 · ADR-085) ──────────────

describe('категорията е ЗАПИС, не поле на огледалото', () => {
  it('празната е ЧЕСТНА · плащане без категория не е грешка', async () => {
    const { dnevnik } = await sVsichko();
    const r = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(r.every((x) => x.kategoriya === '')).toBe(true);
    expect(kletkata(r[0]!, 'Категория')).toBe('');
  });

  it('задава се и се ЧЕТЕ от реда', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
      { opId: 'op-kat' },
    );
    const r = redoveNaPlashtaniyata(await ogledaloto(dnevnik), SEDMITSA);
    expect(r.find((x) => x.id === 'RZ-kesh')!.kategoriya).toBe('Материали');
    // и не се разлива по съседите
    expect(r.find((x) => x.id === 'RZ-karta')!.kategoriya).toBe('');
  });

  it('АДРЕСЪТ е ДВОЙКА · еднакъв id при различен вид не се смесва', async () => {
    const { dnevnik, deystviya } = stend();
    // Заплата и разход с ЕДНО И СЪЩО id · допустимо е, картите са различни.
    await deystviya.zapishiZaplata({ ...ZAPLATA, zaplataId: 'X-1' }, { opId: 'op-z' });
    await deystviya.zapishiRazhod('X-1', FAKTURA, { opId: 'op-r' });
    await deystviya.zadaydeKategoriya(
      { vid: 'zaplata', plashtaneId: 'X-1', kategoriya: 'Труд' },
      { opId: 'op-k1' },
    );
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'X-1', kategoriya: 'Материали' },
      { opId: 'op-k2' },
    );
    const o = await ogledaloto(dnevnik);
    expect(kategoriyataNa(o, 'zaplata', 'X-1')).toBe('Труд');
    expect(kategoriyataNa(o, 'faktura-kesh', 'X-1')).toBe('Материали');
    expect(sashtnostNaKategoriya('zaplata', 'X-1')).not.toBe(
      sashtnostNaKategoriya('faktura-kesh', 'X-1'),
    );
  });

  it('повторното задаване е НОВО събитие · последната дума е в сила', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
      { opId: 'op-k1' },
    );
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Строителни материали' },
      { opId: 'op-k2' },
    );
    expect(kategoriyataNa(await ogledaloto(dnevnik), 'faktura-kesh', 'RZ-kesh')).toBe(
      'Строителни материали',
    );
    // ДВЕ събития, не едно поправено · историята остава цяла (правило 1)
    expect(
      (await dnevnik.chetiVsichki(NAEMATEL)).filter((x) => x.type === 'КатегорияЗададена'),
    ).toHaveLength(2);
  });

  it('празната МАХА категорията · но записът остава в Журнала', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
      { opId: 'op-k1' },
    );
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: '' },
      { opId: 'op-k2' },
    );
    const o = await ogledaloto(dnevnik);
    expect(kategoriyataNa(o, 'faktura-kesh', 'RZ-kesh')).toBe('');
    expect(
      (await dnevnik.chetiVsichki(NAEMATEL)).filter((x) => x.type === 'КатегорияЗададена'),
    ).toHaveLength(2);

    // И КЛЮЧЪТ ИЗЛИЗА ОТ КАРТАТА, не остава с празна стойност.
    //
    // Тази проверка се роди от СЧУПВАНЕ, което МИНА: заменях `delete` със
    // `set(id, '')` и нищо не падаше, защото `kategoriyataNa` връща `''` и в
    // двата случая. Разликата обаче е истинска — картата е ПУБЛИЧНА
    // (`Ogledalo.kategorii`) и празният запис е призрак в нея: расте вечно и
    // всеки бъдещ обход по нея го брои за категория (ADR-085 §7).
    expect(o.kategorii.has(sashtnostNaKategoriya('faktura-kesh', 'RZ-kesh'))).toBe(false);
    expect([...o.kategorii.values()].every((v) => v !== '')).toBe(true);
  });

  it('Вратата отказва категория за НЕСЪЩЕСТВУВАЩО плащане · и за непознат вид', async () => {
    const { deystviya } = await sVsichko();
    await expect(
      deystviya.zadaydeKategoriya(
        { vid: 'faktura-kesh', plashtaneId: 'НЯМА', kategoriya: 'Материали' },
        { opId: 'op-a' },
      ),
    ).rejects.toThrow(/Няма такова плащане/);
    await expect(
      deystviya.zadaydeKategoriya(
        { vid: 'faktura-banka', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
        { opId: 'op-b' },
      ),
    ).rejects.toThrow(/Непознат вид/);
  });

  it('СТОРНИРАН разход отнася категорията си със себе си · редът пада цял', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
      { opId: 'op-k1' },
    );
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.razhodi.get('RZ-kesh')!.seq, prichina: 'сгрешен документ' },
      { opId: 'op-st' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(redoveNaPlashtaniyata(sled, SEDMITSA).map((x) => x.id)).not.toContain('RZ-kesh');
    // Самата категория си стои в картата · тя е ДРУГО събитие и никой не я е
    // гасил. Това не е дефект: редът, който я показваше, вече го няма.
    expect(kategoriyataNa(sled, 'faktura-kesh', 'RZ-kesh')).toBe('Материали');
  });

  it('и листовете носят колоната · и двете фактури пак с ЕДИН хедър', () => {
    expect(koloniteNaVida('zaplata')).toContain('Категория');
    expect(koloniteNaVida('faktura-kesh')).toEqual(koloniteNaVida('faktura-karta'));
  });
});

describe('сборовете ПО КАТЕГОРИЯ · сборът на сериите Е сборът на седмицата', () => {
  it('некатегоризираното пада в кофа с ИМЕ, не в общия сбор', async () => {
    const { dnevnik, deystviya } = await sVsichko();
    await deystviya.zadaydeKategoriya(
      { vid: 'faktura-kesh', plashtaneId: 'RZ-kesh', kategoriya: 'Материали' },
      { opId: 'op-k' },
    );
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA, KOGATO);

    expect(s.poKategorii.map((x) => [x.kategoriya, x.broy, x.suma_st])).toEqual([
      [BEZ_KATEGORIYA, 2, 600_00 + 60_00],
      ['Материали', 1, 240_00],
    ]);
    // СВЕРКАТА · сборът на сериите е сборът на седмицата, до цент
    expect(s.poKategorii.reduce((x, k) => x + k.suma_st, 0)).toBe(s.obshto_st);
  });

  it('и празната седмица дава празен списък, а не измислена кофа', async () => {
    const { dnevnik } = await sVsichko();
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), '2026-W20', KOGATO);
    expect(sborovetePoKategoriya(s.redove)).toEqual([]);
    expect(s.poKategorii).toEqual([]);
  });
});

describe('пиновете · числата и думите се твърдят с ръка (резен 46 · група В)', () => {
  it('видовете плащане са ТРИ', () => {
    expect(Object.keys(IMENATA_NA_VIDOVETE)).toHaveLength(3);
  });

  it('кофата без категория се казва дословно „(без категория)"', () => {
    // И НЕ Е празният низ: празният значи „без разбивка" и двете биха се слели.
    expect(BEZ_KATEGORIYA).toBe('(без категория)');
  });
});
