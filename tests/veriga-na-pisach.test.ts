/**
 * ВЕРИГАТА НА ПИСАЧА · ключът и правото (ADR-055 · резен 2).
 *
 * Дупката, която този резен затваря, е проверима с едно изречение: до ADR-054
 * служителят отваряше СВОЯ книга и въпросът „чия е тази верига" нямаше предмет.
 * Отвори ли чуждата, той стига до веригата-нула на работодателя — и Вратата
 * дотук нямаше нито един довод да го спре, защото `LichnoESamoTvoe` пуска
 * всичко неличено (`naematel.endsWith(nastavka)` е ЛЪЖА за служебния ключ).
 *
 * Затова тук се пази ПОИМЕННО:
 *   1. чужда верига не се пише — и от стопанина също;
 *   2. веригата-нула се пише само от стопанина;
 *   3. празна книга минава — първото събитие ражда стопанина (ADR-043);
 *   4. ключът се разглобява обратно на книга и писач.
 */

import { describe, expect, it } from 'vitest';
import {
  GreshkaAkaunt,
  KLYUCH_OT_ALFA,
  NASTAVKA_PISACH,
  eVerigaNaPisach,
  klyuchNaLichniya,
  klyuchNaVerigata,
  knigataNa,
  pisachatNa,
  sDumiZaAkaunta,
  svediImeyl,
} from '../src/domein/akaunt.js';
import {
  DnevnikVPametta,
  LichnoESamoTvoe,
  PoSvoyataVeriga,
  Vrata,
  VsichkoRazresheno,
  type Pravata,
} from '../src/yadro/index.js';
import { NASTAVKA_LICHEN } from '../src/domein/akaunt.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { SHA } from './pomoshtni.js';

const STOPANIN = 'ivo@example.bg';
const SLUZHITEL = 'mira@example.bg';
const KNIGA = 'vintexstroy';
const MOYATA = `${KNIGA}${NASTAVKA_PISACH}${SLUZHITEL}`;

describe('ключът на веригата', () => {
  it('стопанинът пише в веригата-НУЛА · без наставка, без миграция', () => {
    expect(klyuchNaVerigata(KNIGA, STOPANIN, STOPANIN)).toBe(KNIGA);
    // и регистърът на имейла не прави втора верига
    expect(klyuchNaVerigata(KNIGA, 'IVO@Example.BG', STOPANIN)).toBe(KNIGA);
  });

  it('всеки друг получава СВОЯ верига в СЪЩАТА книга', () => {
    expect(klyuchNaVerigata(KNIGA, SLUZHITEL, STOPANIN)).toBe(MOYATA);
    expect(klyuchNaVerigata(KNIGA, 'Mira@Example.BG', STOPANIN)).toBe(MOYATA);
  });

  it('непозната книга значи „аз съм първият" — веригата-нула', () => {
    expect(klyuchNaVerigata(KNIGA, SLUZHITEL, undefined)).toBe(KNIGA);
  });

  it('личният Журнал няма втори писач (И98)', () => {
    const lichen = klyuchNaLichniya({ imeyl: STOPANIN } as never);
    expect(lichen.endsWith(NASTAVKA_LICHEN)).toBe(true);
    expect(() => klyuchNaVerigata(lichen, SLUZHITEL, STOPANIN)).toThrow(GreshkaAkaunt);
    // а собственикът му си пише — той е стопанинът на своята лична книга
    expect(klyuchNaVerigata(lichen, STOPANIN, STOPANIN)).toBe(lichen);
  });

  it('книга не се прави ОТ верига · наставката не се наслагва', () => {
    expect(() => klyuchNaVerigata(MOYATA, SLUZHITEL, STOPANIN)).toThrow(GreshkaAkaunt);
  });

  it('без имейл няма верига', () => {
    expect(() => klyuchNaVerigata(KNIGA, '   ', STOPANIN)).toThrow(GreshkaAkaunt);
  });

  it('ключът се разглобява обратно · книга и писач', () => {
    expect(eVerigaNaPisach(MOYATA)).toBe(true);
    expect(eVerigaNaPisach(KNIGA)).toBe(false);
    expect(knigataNa(MOYATA)).toBe(KNIGA);
    expect(knigataNa(KNIGA)).toBe(KNIGA);
    expect(pisachatNa(MOYATA)).toBe(svediImeyl(SLUZHITEL));
    expect(pisachatNa(KNIGA)).toBeUndefined();
  });

  it('Таблото КАЗВА в коя верига се пише', () => {
    expect(sDumiZaAkaunta(MOYATA)).toContain(KNIGA);
    expect(sDumiZaAkaunta(MOYATA)).toContain(SLUZHITEL);
    // и не се бърка с двата стари случая
    expect(sDumiZaAkaunta(KLYUCH_OT_ALFA)).toContain('Стартъп Алфа');
    expect(sDumiZaAkaunta(klyuchNaLichniya({ imeyl: STOPANIN } as never))).toContain('ЛИЧНИЯТ');
  });
});

/** Врата с ДВЕТЕ политики · обвивката около личното (ADR-055). */
function vrataSPravo(stopanin: string | undefined) {
  const dnevnik = new DnevnikVPametta();
  const pravata: Pravata = new PoSvoyataVeriga(
    new LichnoESamoTvoe(NASTAVKA_LICHEN, svediImeyl),
    pisachatNa,
    knigataNa,
    // Стопанин има само СЛУЖЕБНАТА книга; личната е на своя човек по друг
    // ред и обвивката нарочно няма дума за нея.
    (kniga) => (kniga === KNIGA ? stopanin : undefined),
    svediImeyl,
  );
  return { dnevnik, vrata: new Vrata({ dnevnik, pravata, sha: SHA }) };
}

describe('Вратата пуска само в СВОЯТА верига', () => {
  const vrata = vrataSPravo;

  const imot = (naematel: string, actor: string, n: number) => ({
    opId: `${naematel}-${n}`,
    ts: '2026-08-26T09:00:00.000Z',
    naematel,
    actor,
    type: 'ИмотДобавен' as const,
    sashtnost: { vid: 'imot' as const, id: `i-${n}` },
    payload: { adres: 'ул. Първа 1', edinitsa: 'А', ploshtad_kvsm: 60 },
  });

  it('служителят НЕ пише във веригата-нула на работодателя', async () => {
    const { vrata: v } = vrata(STOPANIN);
    await expect(v.dobavi(imot(KNIGA, SLUZHITEL, 1))).rejects.toThrow();
  });

  it('служителят пише в СВОЯТА верига в същата книга', async () => {
    const { dnevnik, vrata: v } = vrata(STOPANIN);
    await v.dobavi(imot(MOYATA, SLUZHITEL, 1));
    expect(await dnevnik.chetiVsichki(MOYATA)).toHaveLength(1);
  });

  it('стопанинът НЕ пише в чуждата верига · собственост ≠ чужд подпис', async () => {
    const { vrata: v } = vrata(STOPANIN);
    await expect(v.dobavi(imot(MOYATA, STOPANIN, 1))).rejects.toThrow();
  });

  it('стопанинът пише в своята нула', async () => {
    const { dnevnik, vrata: v } = vrata(STOPANIN);
    await v.dobavi(imot(KNIGA, STOPANIN, 1));
    expect(await dnevnik.chetiVsichki(KNIGA)).toHaveLength(1);
  });

  it('празна книга · първото събитие минава и ражда стопанина', async () => {
    const { dnevnik, vrata: v } = vrata(undefined);
    await v.dobavi(imot(KNIGA, SLUZHITEL, 1));
    expect(await dnevnik.chetiVsichki(KNIGA)).toHaveLength(1);
  });

  it('обвитата политика НЕ се заобикаля · личното пак е само твое', async () => {
    const lichen = klyuchNaLichniya({ imeyl: STOPANIN } as never);
    const { vrata: v } = vrata(STOPANIN);
    // Веригата няма наставка на писач и стопанинът съм аз — тоест обвивката
    // мълчи и думата остава на `LichnoESamoTvoe`, която отказва чуждия личен.
    await expect(v.dobavi(imot(lichen, SLUZHITEL, 1))).rejects.toThrow();
  });
});

/**
 * ДВАТА ПАЗАЧА, които имат смисъл чак сега (ADR-055 · резен 5).
 *
 * И двата се крепят на едно: жертвата на сторното се търси в КНИГАТА, не само
 * в моята верига. Дотук това нямаше значение — своя `seq` се знае, а чужд
 * нямаше откъде да дойде. Погасяването през граница (`pogasyavaVeriga`) го
 * донесе, и с него две тихи дупки наведнъж.
 */
describe('сторно през граница', () => {
  const KNIGA2 = 'kniga';
  const MOYATA2 = `${KNIGA2}${NASTAVKA_PISACH}mira@x.bg`;

  async function podredi() {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    let tik = 0;
    const napravi = (naematel: string) =>
      new Deystviya({
        vrata,
        dnevnik,
        naematel,
        actor: 'mira@x.bg',
        chasovnik: () => new Date(Date.UTC(2026, 7, 26, 9, 0, tik++)).toISOString(),
        kniga: KNIGA2,
      });
    const nula = napravi(KNIGA2);
    const moyata = napravi(MOYATA2);

    // Веригата-нула: наем, начисление за март и справка, която ЗАМРАЗЯВА март.
    await nula.dobaviImot('I-1', { adres: 'ул. Първа', edinitsa: 'А', ploshtad_kvsm: 60 }, { opId: 'o1' });
    await nula.nachisliVzemane(
      'V:N-1:2026-03',
      { naemId: 'N-1', period: '2026-03', osnovanie: 'наем', suma_st: 50000, padezh: '2026-03-05' },
      { opId: 'o2' },
    );
    return { dnevnik, nula, moyata };
  }

  it('сторно БЕЗ жертва се отказва С ДУМИ', async () => {
    const { moyata } = await podredi();
    await expect(
      moyata.storniraj('I-1', { pogasyavaSeq: 99, pogasyavaVeriga: KNIGA2, prichina: 'сгрешен номер' }, { opId: 's1' }),
    ).rejects.toThrow(/няма/);
  });

  it('сторно на ЧУЖДО звено в замразен период се отказва · правило 9 не се заобикаля', async () => {
    const { nula, moyata } = await podredi();
    await nula.podaySpravka(
      { period: '2026-03', dds_deklarirano_st: 10000, data: '2026-04-10', belezhka: '' },
      { opId: 'o3' },
    );
    // Жертвата (начислението за март) е в ЧУЖДАТА верига. Търсена само в
    // моята, тя не се намираше и проверката за замразен период се прескачаше.
    await expect(
      moyata.storniraj(
        'V:N-1:2026-03',
        { pogasyavaSeq: 2, pogasyavaVeriga: KNIGA2, prichina: 'начислено два пъти' },
        { opId: 's2' },
      ),
    ).rejects.toThrow(/замразен|заключен|подадена/i);
  });

  it('същото сторно ПРЕДИ справката минава', async () => {
    const { dnevnik, moyata } = await podredi();
    await moyata.storniraj(
      'V:N-1:2026-03',
      { pogasyavaSeq: 2, pogasyavaVeriga: KNIGA2, prichina: 'начислено два пъти' },
      { opId: 's3' },
    );
    expect(await dnevnik.chetiVsichki(MOYATA2)).toHaveLength(1);
  });
});

/**
 * ПОЛУЧЕНАТА ВЕРИГА · дърпането минава през ВРАТАТА (ADR-055 · резен 6).
 *
 * Изкушението е дръпнатият файл да се запише направо в носителя — по-бързо е и
 * „нали вече е проверен". Отхвърлено: това е втори вход за запис, а правило 2
 * казва, че вход е един. `vazstanovi` прави и повече — NFC, валидност на всяко
 * звено, отказ на по-стар файл и на разделили се истории.
 *
 * `actor` е АВТОРЪТ НА ВЕРИГАТА, не дърпащият. Не се приема на доверие: той е
 * в подписа (ADR-049), тъй че подменен автор къса веригата.
 */
describe('получената верига влиза през Вратата', () => {
  async function chuzhdata(broy: number) {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    for (let i = 0; i < broy; i += 1) {
      await vrata.dobavi({
        opId: `ch-${i}`,
        ts: new Date(Date.UTC(2026, 7, 26, 9, 0, i)).toISOString(),
        naematel: MOYATA,
        actor: SLUZHITEL,
        type: 'ИмотДобавен',
        sashtnost: { vid: 'imot', id: `i-${i}` },
        payload: { adres: `ул. ${i}`, edinitsa: 'А', ploshtad_kvsm: 60 },
      });
    }
    return dnevnik.chetiVsichki(MOYATA);
  }

  it('приема се, защото `actor` е нейният автор', async () => {
    const chuzhdi = await chuzhdata(3);
    const { dnevnik, vrata: v } = vrataSPravo(STOPANIN);
    const r = await v.vazstanovi(MOYATA, chuzhdi[0]!.actor, chuzhdi);
    expect(r.vneseni).toBe(3);
    expect(await dnevnik.chetiVsichki(MOYATA)).toHaveLength(3);
  });

  it('стопанинът НЕ може да я вкара от свое име · подписът е на друг', async () => {
    const chuzhdi = await chuzhdata(3);
    const { vrata: v } = vrataSPravo(STOPANIN);
    await expect(v.vazstanovi(MOYATA, STOPANIN, chuzhdi)).rejects.toThrow(/право/);
  });

  it('подменен автор КЪСА веригата · доверие няма', async () => {
    const chuzhdi = await chuzhdata(3);
    const pipnati = chuzhdi.map((s, i) => (i === 1 ? { ...s, actor: 'ne-toy@example.bg' } : s));
    const { vrata: v } = vrataSPravo(STOPANIN);
    await expect(v.vazstanovi(MOYATA, SLUZHITEL, pipnati)).rejects.toThrow(/къса|seq 2/);
  });
});
