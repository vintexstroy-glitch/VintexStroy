/**
 * ВНАСЯНЕ НА ЖУРНАЛ · връщането на изнесеното.
 *
 * Най-важните два теста тук са отказите: скъсана верига във файла и две
 * различни истории. И в двата случая в Журнала не влиза НИЩО.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  GreshkaVrata,
  proveriVerigata,
  stotinki,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { GreshkaVnos, prochetiIznos, vnesiZhurnal } from '../src/domein/vnos.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const ACTOR = 'vintexstroy@gmail.com';
const KOGATO = '2026-08-22T09:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: ACTOR,
    chasovnik: () => new Date(Date.UTC(2026, 7, 22, 9, 0, tik++)).toISOString(),
  });
  return { dnevnik, vrata, deystviya };
}

async function nasadi(d: Deystviya, kolko = 2) {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'АП. № 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  if (kolko > 1) {
    await d.dobaviNaem(
      'N-1',
      {
        imotId: 'I-1', naemetel: 'Стройпласт ЕООД', naem_st: stotinki(1200_00),
        padezhDen: 5, ot: '2026-01-01', do: '', depozit_st: 0, sektor: 'naem-targovski',
      },
      { opId: 'op-naem' },
    );
  }
}

async function iznos(dnevnik: DnevnikVPametta): Promise<string> {
  return JSON.stringify(await dnevnik.chetiVsichki(NAEMATEL), null, 2);
}

function vnes(stend: ReturnType<typeof stendTip>, tekst: string) {
  return vnesiZhurnal({
    vrata: stend.vrata,
    dnevnik: stend.dnevnik,
    naematel: NAEMATEL,
    actor: ACTOR,
    tekst,
    kogato: KOGATO,
  });
}
const stendTip = stend;

describe('връщане в празен Журнал', () => {
  it('връща всичко и Огледалото е същото', async () => {
    const a = stend();
    await nasadi(a.deystviya);
    const fayl = await iznos(a.dnevnik);
    const staroOgledalo = await a.deystviya.ogledalo();

    const b = stend();
    const r = await vnes(b, fayl);

    expect(r.vneseni).toBe(2);
    expect(r.veche).toBe(0);
    expect(r.vsichko).toBe(2);
    expect(r.nared).toBe(true);
    expect(r.sverki).toHaveLength(3);
    expect(r.sverki.every((s) => s.nared)).toBe(true);

    const novo = await b.deystviya.ogledalo();
    expect([...novo.imoti.keys()]).toEqual([...staroOgledalo.imoti.keys()]);
    expect(novo.naemi.get('N-1')!.naem_st).toBe(1200_00);
    expect((await proveriVerigata(await b.dnevnik.chetiVsichki(NAEMATEL), SHA)).tsyala).toBe(true);
  });

  it('второ внасяне на същия файл не добавя нищо', async () => {
    const a = stend();
    await nasadi(a.deystviya);
    const fayl = await iznos(a.dnevnik);

    const b = stend();
    await vnes(b, fayl);
    const vtoro = await vnes(b, fayl);

    expect(vtoro.vneseni).toBe(0);
    expect(vtoro.veche).toBe(2);
    expect(vtoro.vsichko).toBe(2);
  });

  it('по-нов износ върху по-старо състояние дописва само липсващото', async () => {
    const a = stend();
    await nasadi(a.deystviya, 1);
    const star = await iznos(a.dnevnik);
    await nasadi(a.deystviya, 2);
    const nov = await iznos(a.dnevnik);

    const b = stend();
    await vnes(b, star);
    const r = await vnes(b, nov);

    expect(r.veche).toBe(1);
    expect(r.vneseni).toBe(1);
    expect((await b.deystviya.ogledalo()).naemi.size).toBe(1);
  });

  it('по-стар износ върху по-ново състояние се отказва', async () => {
    const a = stend();
    await nasadi(a.deystviya, 1);
    const star = await iznos(a.dnevnik);

    const b = stend();
    await nasadi(b.deystviya, 2);
    await expect(vnes(b, star)).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    expect(await b.dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(2);
  });
});

describe('отказите — и в Журнала не влиза нищо', () => {
  it('скъсана верига във файла', async () => {
    const a = stend();
    await nasadi(a.deystviya);
    const redica = await a.dnevnik.chetiVsichki(NAEMATEL);
    // Подменяме съдържанието, без да пипаме хеша — точно това е фалшификатът.
    redica[1] = { ...redica[1]!, payload: { ...redica[1]!.payload, naem_st: 999_99 } };
    const fayl = JSON.stringify(redica);

    const b = stend();
    await expect(vnes(b, fayl)).rejects.toThrow(GreshkaVrata);
    await expect(vnes(b, fayl)).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    expect(await b.dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(0);
  });

  it('две различни истории не се сливат', async () => {
    const a = stend();
    await nasadi(a.deystviya);
    const fayl = await iznos(a.dnevnik);

    const b = stend();
    // Друг журнал, който почва различно — първият hash няма да съвпадне.
    await b.deystviya.dobaviImot('I-2', { adres: 'Друго', edinitsa: 'X', ploshtad_kvsm: 0 },
      { opId: 'op-drugo' });

    await expect(vnes(b, fayl)).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    expect(await b.dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(1);
  });

  it('чужд наемател', async () => {
    const a = stend();
    await nasadi(a.deystviya, 1);
    const redica = await a.dnevnik.chetiVsichki(NAEMATEL);
    const fayl = JSON.stringify([{ ...redica[0]!, naematel: 'някой друг' }]);

    const b = stend();
    await expect(vnes(b, fayl)).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    expect(await b.dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(0);
  });

  it('спряна Врата не възстановява', async () => {
    const a = stend();
    await nasadi(a.deystviya);
    const fayl = await iznos(a.dnevnik);

    const b = stend();
    b.vrata.zatvori('скъсана верига');
    await expect(vnes(b, fayl)).rejects.toMatchObject({ kod: 'SPRYAN' });
    expect(await b.dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(0);
  });

  it('файл, който не е Журнал', () => {
    expect(() => prochetiIznos('не е json')).toThrow(GreshkaVnos);
    expect(() => prochetiIznos('{"a":1}')).toThrow(/не е редица/);
    expect(() => prochetiIznos('[]')).toThrow(/празен/);
    expect(() => prochetiIznos('[{"seq":1}]')).toThrow(/няма поле/);
    expect(() => prochetiIznos('[3]')).toThrow(/не е събитие/);
  });
});
