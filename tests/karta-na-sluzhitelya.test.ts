/**
 * КАРТАТА НА СЛУЖИТЕЛЯ · седмица или месец (резен 113 · ADR-159).
 *
 * И133: „да виждаш и задачите които са активни и там ги разпределяш като прави
 * картата на всеки служител за седмица или за месец."
 *
 * Петте обещания:
 *   1. Прозорецът е СЕДМИЦА (понеделник пръв) или КАЛЕНДАРЕН месец.
 *   2. Активна значи изпратена и НЕотказана; отказаната се БРОИ, не се реди.
 *   3. Задачата заема ВСИЧКИТЕ си дни в прозореца, а сверката брои РАЗЛИЧНИ.
 *   4. Чуждата задача не влиза в моята карта.
 *   5. Съседният прозорец се смята от такта, не от екрана.
 */

import { describe, expect, it } from 'vitest';
import {
  kartaNaSluzhitelya,
  prozoretsNaKartata,
  sasedenProzorets,
  sveriKartata,
  TAKTOVE_NA_KARTATA,
} from '../src/domein/karta-na-sluzhitelya.js';
import type { Izprashtane, OtgovorNaZadacha } from '../src/domein/zadachi-kam-hora.js';

const AZ = 'bamstera@example.bg';
const DRUG = 'drug@example.bg';

function izprashtane(n: {
  id: string;
  imeyl?: string;
  ot: string;
  do: string;
  chas?: string;
}): Izprashtane {
  return Object.freeze({
    zadachaId: n.id,
    deloId: `D-${n.id}`,
    imeyl: n.imeyl ?? AZ,
    ot: n.ot,
    do: n.do,
    chas: n.chas ?? '',
    doChas: n.chas === undefined ? '' : '17:00',
    poImeyl: false,
    kalendarId: '',
    belezhka: '',
    kogato: '2026-09-01T09:00:00.000Z',
  });
}

const IMENA = new Map([
  ['D-Z1', 'Кофраж'],
  ['D-Z2', 'Оглед'],
  ['D-Z3', 'Акт 15'],
]);

function karta(
  izprateni: readonly Izprashtane[],
  otgovori: readonly OtgovorNaZadacha[] = [],
  takt: (typeof TAKTOVE_NA_KARTATA)[number] = 'sedmitsa',
  den = '2026-09-02',
) {
  return kartaNaSluzhitelya({
    izprateni: new Map(izprateni.map((z) => [z.zadachaId, z])),
    otgovori: new Map(otgovori.map((o) => [o.zadachaId, o])),
    imenaNaDelata: IMENA,
    imeyl: AZ,
    takt,
    den,
  });
}

describe('прозорецът · седмица или месец', () => {
  it('седмицата почва в ПОНЕДЕЛНИК · както календарът с парите', () => {
    // 2026-09-02 е сряда; седмицата ѝ тръгва от 31.08 (понеделник).
    const dni = prozoretsNaKartata('sedmitsa', '2026-09-02');
    expect(dni).toHaveLength(7);
    expect(dni[0]).toBe('2026-08-31');
    expect(dni[6]).toBe('2026-09-06');
  });

  it('месецът е КАЛЕНДАРНИЯТ · без чужди дни', () => {
    const dni = prozoretsNaKartata('mesets', '2026-09-15');
    expect(dni).toHaveLength(30);
    expect(dni[0]).toBe('2026-09-01');
    expect(dni.at(-1)).toBe('2026-09-30');
  });

  it('съседният прозорец се смята от ТАКТА · седем дни или един месец', () => {
    expect(sasedenProzorets('sedmitsa', '2026-09-02', 1)).toBe('2026-09-09');
    expect(sasedenProzorets('sedmitsa', '2026-09-02', -1)).toBe('2026-08-26');
    expect(sasedenProzorets('mesets', '2026-09-15', 1)).toBe('2026-10-01');
    expect(sasedenProzorets('mesets', '2026-01-31', -1)).toBe('2025-12-01');
  });

  it('и денят се проверява · неден не минава мълчаливо', () => {
    expect(() => prozoretsNaKartata('sedmitsa', 'вчера')).toThrow(RangeError);
    expect(() => sasedenProzorets('mesets', '', 1)).toThrow(RangeError);
  });
});

describe('картата · кое стои на кой ден', () => {
  it('задачата заема ВСИЧКИТЕ си дни, а началото ѝ се познава', () => {
    const k = karta([izprashtane({ id: 'Z1', ot: '2026-09-01', do: '2026-09-03' })]);
    const dni = k.dni.filter((d) => d.zadachi.length > 0).map((d) => d.den);
    expect(dni).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(k.dni.find((d) => d.den === '2026-09-01')?.zadachi[0]?.nachalo).toBe(true);
    expect(k.dni.find((d) => d.den === '2026-09-03')?.zadachi[0]?.nachalo).toBe(false);
    // и носи ИМЕТО на делото, не само номера му
    expect(k.dni.find((d) => d.den === '2026-09-02')?.zadachi[0]?.delo).toBe('Кофраж');
  });

  it('сверката брои РАЗЛИЧНИ задачи, не клетки · тридневното не е три', () => {
    const k = karta([izprashtane({ id: 'Z1', ot: '2026-09-01', do: '2026-09-03' })]);
    const sv = sveriKartata(k, '2026-09-02T10:00:00.000Z');
    expect(sv.vhod).toBe(1);
    expect(sv.izhod).toBe(1);
    expect(sv.razlika).toBe(0);
    expect(sv.nared).toBe(true);
  });

  it('ОТКАЗАНАТА не се реди, но се БРОИ · тя не е изчезнала', () => {
    const k = karta(
      [
        izprashtane({ id: 'Z1', ot: '2026-09-01', do: '2026-09-01' }),
        izprashtane({ id: 'Z2', ot: '2026-09-02', do: '2026-09-02' }),
      ],
      [{ zadachaId: 'Z2', otgovor: 'otkazana', prichina: 'зает съм', kogato: '2026-09-01T12:00:00.000Z' }],
    );
    expect(k.aktivni).toBe(1);
    expect(k.otkazani).toBe(1);
    expect(k.dni.find((d) => d.den === '2026-09-02')?.zadachi).toHaveLength(0);
  });

  it('приетата СТОИ · активна е всяка, която не е отказана', () => {
    const k = karta(
      [izprashtane({ id: 'Z1', ot: '2026-09-02', do: '2026-09-02' })],
      [{ zadachaId: 'Z1', otgovor: 'prieta', prichina: '', kogato: '2026-09-01T12:00:00.000Z' }],
    );
    expect(k.aktivni).toBe(1);
    expect(k.dni.find((d) => d.den === '2026-09-02')?.zadachi[0]?.sastoyanie).toBe('prieta');
  });

  it('ЧУЖДАТА задача я няма в моята карта', () => {
    const k = karta([izprashtane({ id: 'Z9', imeyl: DRUG, ot: '2026-09-02', do: '2026-09-02' })]);
    expect(k.aktivni).toBe(0);
    expect(k.dni.every((d) => d.zadachi.length === 0)).toBe(true);
  });

  it('и задача ИЗВЪН прозореца не влиза · нито преди, нито след', () => {
    const k = karta([
      izprashtane({ id: 'Z1', ot: '2026-08-01', do: '2026-08-02' }),
      izprashtane({ id: 'Z2', ot: '2026-10-01', do: '2026-10-02' }),
    ]);
    expect(k.aktivni).toBe(0);
  });

  it('а задача, която ВЛИЗА в прозореца отвън, стои от първия си ден вътре', () => {
    // от 30.08 (миналата седмица) до 01.09 · вижда се на 31.08 и 01.09
    const k = karta([izprashtane({ id: 'Z1', ot: '2026-08-30', do: '2026-09-01' })]);
    const dni = k.dni.filter((d) => d.zadachi.length > 0).map((d) => d.den);
    expect(dni).toEqual(['2026-08-31', '2026-09-01']);
    // и НАЧАЛОТО ѝ не е тук: тя е почнала преди прозореца
    expect(k.dni[0]?.zadachi[0]?.nachalo).toBe(false);
  });

  it('часът пътува с нея · цял ден значи празен час, не нула', () => {
    const k = karta([izprashtane({ id: 'Z1', ot: '2026-09-02', do: '2026-09-02', chas: '09:30' })]);
    const z = k.dni.find((d) => d.den === '2026-09-02')?.zadachi[0];
    expect(z?.chas).toBe('09:30');
    expect(z?.doChas).toBe('17:00');
  });
});
