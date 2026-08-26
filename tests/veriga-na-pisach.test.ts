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
  type Pravata,
} from '../src/yadro/index.js';
import { NASTAVKA_LICHEN } from '../src/domein/akaunt.js';
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

describe('Вратата пуска само в СВОЯТА верига', () => {
  function vrata(stopanin: string | undefined) {
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
