/**
 * МИГРАЦИЯ · сверката е ПРЕДИ записа.
 *
 * Данните тук са измислени — истинският регистър не влиза в хранилището.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  stotinki,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { SHA } from './pomoshtni.js';
import {
  GreshkaMigratsiya,
  migrirajNaemiKesh,
  sveriRegistara,
  type ObyavenoOtLista,
  type RedOtRegistara,
} from '../src/migratsiya/naemi-kesh.js';

const KOGATO = '2026-08-22T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const REDOVE: RedOtRegistara[] = [
  { edinitsa: 'АП. № 1', myasto: 'Място А', kolona: 'колона 1', naem_st: stotinki(515_00) },
  { edinitsa: 'АП. № 2', myasto: 'Място А', kolona: 'колона 1', naem_st: stotinki(613_00) },
  { edinitsa: 'ОФИС № 3', myasto: 'Място Б', kolona: 'колона 2', naem_st: stotinki(517_00) },
  { edinitsa: 'ПМ № 11', myasto: 'Място Б', kolona: 'колона 2', naem_st: stotinki(77_20) },
];

const OBYAVENO: ObyavenoOtLista = {
  broiRedove: 4,
  totali_st: { 'колона 1': 1128_00, 'колона 2': 594_20 },
};

describe('сверка на регистъра, преди какъвто и да е запис', () => {
  it('затваря, когато редовете съвпадат с обявените тотали', () => {
    const sverki = sveriRegistara(REDOVE, OBYAVENO, KOGATO);
    expect(sverki).toHaveLength(3);
    expect(sverki.every((s) => s.nared)).toBe(true);
  });

  it('хваща разлика от ЕДНА стотинка', () => {
    const sverki = sveriRegistara(
      REDOVE,
      { ...OBYAVENO, totali_st: { ...OBYAVENO.totali_st, 'колона 2': 594_19 } },
      KOGATO,
    );
    const kolona2 = sverki.find((s) => s.kakvo.includes('колона 2'))!;
    expect(kolona2.nared).toBe(false);
    expect(kolona2.razlika).toBe(1);
  });

  it('сверява и колона, за която не сме прочели нито един ред', () => {
    const sverki = sveriRegistara(
      REDOVE,
      { ...OBYAVENO, totali_st: { ...OBYAVENO.totali_st, 'колона 5': 3271_00 } },
      KOGATO,
    );
    const kolona5 = sverki.find((s) => s.kakvo.includes('колона 5'))!;
    expect(kolona5.vhod).toBe(3271_00);
    expect(kolona5.izhod).toBe(0);
    expect(kolona5.razlika).toBe(-3271_00);
  });

  it('хваща разминаване в БРОЯ редове, не само в сумите', () => {
    const sverki = sveriRegistara(REDOVE, { ...OBYAVENO, broiRedove: 40 }, KOGATO);
    const broi = sverki.find((s) => s.kakvo.includes('брой редове'))!;
    expect(broi.nared).toBe(false);
    expect(broi.razlika).toBe(-36);
  });
});

describe('миграция', () => {
  it('минава и записва по един имот и един наем на ред', async () => {
    const { dnevnik, deystviya } = stend();

    const rezultat = await migrirajNaemiKesh({
      deystviya,
      redove: REDOVE,
      obyaveno: OBYAVENO,
      kogato: KOGATO,
      padezhDen: 5,
    });

    expect(rezultat.nared).toBe(true);
    expect(rezultat.zapisani).toBe(8);
    expect(rezultat.povtoreni).toBe(0);
    expect(rezultat.sverki.every((s) => s.razlika === 0)).toBe(true);

    const ogledalo = await deystviya.ogledalo();
    expect(ogledalo.imoti.size).toBe(4);
    expect(ogledalo.naemi.size).toBe(4);
    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(8);
  });

  it('НЕ записва нищо, когато сверката не затваря', async () => {
    const { dnevnik, deystviya } = stend();

    await expect(
      migrirajNaemiKesh({
        deystviya,
        redove: REDOVE,
        obyaveno: { broiRedove: 40, totali_st: { ...OBYAVENO.totali_st, 'колона 2': 594_00 } },
        kogato: KOGATO,
        padezhDen: 5,
      }),
    ).rejects.toBeInstanceOf(GreshkaMigratsiya);

    // Журналът е недокоснат — точно както при истинския регистър.
    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(0);
  });

  it('грешката носи сверките, за да се види КОЛКО не достига', async () => {
    const { deystviya } = stend();

    const greshka = await migrirajNaemiKesh({
      deystviya,
      redove: REDOVE,
      obyaveno: { ...OBYAVENO, totali_st: { ...OBYAVENO.totali_st, 'колона 2': 594_00 } },
      kogato: KOGATO,
      padezhDen: 5,
    }).catch((e: unknown) => e as GreshkaMigratsiya);

    expect(greshka).toBeInstanceOf(GreshkaMigratsiya);
    const kolona2 = greshka.sverki.find((s) => s.kakvo.includes('колона 2'))!;
    expect(kolona2.razlika).toBe(20);
  });

  it('повторно пускане не удвоява — opId е производен от единицата', async () => {
    const { dnevnik, deystviya } = stend();
    const nastroyki = {
      deystviya,
      redove: REDOVE,
      obyaveno: OBYAVENO,
      kogato: KOGATO,
      padezhDen: 5,
    };

    await migrirajNaemiKesh(nastroyki);
    const vtoro = await migrirajNaemiKesh(nastroyki);

    expect(vtoro.zapisani).toBe(0);
    expect(vtoro.povtoreni).toBe(8);
    expect(vtoro.nared).toBe(true);
    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(8);
  });

  it('отказва наем с дробни стотинки, преди сверката дори да почне', async () => {
    const { dnevnik, deystviya } = stend();

    await expect(
      migrirajNaemiKesh({
        deystviya,
        redove: [{ ...REDOVE[0]!, naem_st: 515.5 }],
        obyaveno: { broiRedove: 1, totali_st: { 'колона 1': 515.5 } },
        kogato: KOGATO,
        padezhDen: 5,
      }),
    ).rejects.toBeInstanceOf(GreshkaMigratsiya);

    expect(await dnevnik.chetiVsichki('vintexstroy')).toHaveLength(0);
  });
});
