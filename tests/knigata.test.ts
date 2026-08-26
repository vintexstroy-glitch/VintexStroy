/**
 * КНИГАТА · пиша в своята, чета от всички (ADR-055 · резен 3).
 *
 * Двете посоки са НЕСИМЕТРИЧНИ и точно това се пази тук. Слее ли се четенето
 * обратно в една верига, нищо не хвърля — просто половината книга изчезва от
 * екрана, и то мълчаливо. Затова проверката е за СЪДЪРЖАНИЕ (имотът на другия
 * се вижда), не само за брой.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { NASTAVKA_LICHEN, NASTAVKA_PISACH } from '../src/domein/akaunt.js';
import { prochetiKnigata, verigiteNa } from '../src/domein/knigata.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { SHA } from './pomoshtni.js';

const KNIGA = 'vintexstroy';
const MIRA = `${KNIGA}${NASTAVKA_PISACH}mira@example.bg`;
const PETAR = `${KNIGA}${NASTAVKA_PISACH}petar@example.bg`;
const KOGATO = '2026-08-26T10:00:00.000Z';

async function nasadi() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  const imot = (naematel: string, id: string, sek: number) =>
    vrata.dobavi({
      opId: `${naematel}-${id}`,
      ts: new Date(Date.UTC(2026, 7, 26, 9, 0, sek)).toISOString(),
      naematel,
      actor: 'kojto@example.bg',
      type: 'ИмотДобавен' as const,
      sashtnost: { vid: 'imot' as const, id },
      payload: { adres: `ул. ${id}`, edinitsa: 'А', ploshtad_kvsm: 60 },
    });

  await imot(KNIGA, 'stopanski', 0);
  await imot(MIRA, 'na-mira', 1);
  await imot(PETAR, 'na-petar', 2);
  // Чужда книга и ЛИЧНИЯТ Журнал на стопанина — и двете хванати от префикса.
  await imot(`${KNIGA}${NASTAVKA_LICHEN}`, 'lichen', 3);
  await imot('vintexstroy-drugata', 'chuzhd', 4);
  return dnevnik;
}

describe('веригите на книгата', () => {
  it('нулата е ПЪРВА · там лежи първото събитие, от което се извежда стопанинът', async () => {
    expect(await verigiteNa(await nasadi(), KNIGA)).toEqual([KNIGA, MIRA, PETAR]);
  });

  it('личният Журнал НЕ е верига на книгата, макар префиксът да го хваща', async () => {
    const imena = await verigiteNa(await nasadi(), KNIGA);
    expect(imena).not.toContain(`${KNIGA}${NASTAVKA_LICHEN}`);
  });

  it('чужда книга със същото начало не влиза', async () => {
    const imena = await verigiteNa(await nasadi(), KNIGA);
    expect(imena).not.toContain('vintexstroy-drugata');
  });

  it('празна книга дава празен списък, не хвърля', async () => {
    expect(await verigiteNa(new DnevnikVPametta(), KNIGA)).toEqual([]);
  });
});

describe('четенето на цялата книга', () => {
  it('вижда имотите на ВСИЧКИ писачи · не само своя', async () => {
    const r = await prochetiKnigata(await nasadi(), KNIGA, KOGATO);
    const o = fold(r.potok);

    expect([...o.imoti.keys()].sort()).toEqual(['na-mira', 'na-petar', 'stopanski']);
    // …и нищо от личния или от чуждата книга не се е промъкнало.
    expect(o.imoti.has('lichen')).toBe(false);
    expect(o.imoti.has('chuzhd')).toBe(false);
  });

  it('сверката затваря и се записва дори когато е нула (правило 7)', async () => {
    const r = await prochetiKnigata(await nasadi(), KNIGA, KOGATO);
    expect(r.verigi.map((v) => v.veriga)).toEqual([KNIGA, MIRA, PETAR]);
    expect(r.sverka.razlika).toBe(0);
    expect(r.sverka.nared).toBe(true);
    expect(r.sverka.kogato).toBe(KOGATO);
  });
});
