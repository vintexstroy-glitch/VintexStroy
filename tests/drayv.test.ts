/**
 * НОСИТЕЛЯТ · Драйвът, файл на писач (ADR-055 · резен 6).
 *
 * Тук няма мрежа и не трябва да има: решенията („бута ли се това", „приема ли
 * се онова") живеят отделно от повикванията точно за да се проверяват. Портът
 * се пълни с прост Драйв в паметта.
 *
 * Двете най-скъпи обещания се пазят поименно:
 *   · БУТАНЕТО НЕ СКЪСЯВА — по-дълъг файл горе спира качването с думи;
 *   · ДРЪПНАТОТО СЕ ПРОВЕРЯВА — счупена чужда верига се ОТКАЗВА с причина,
 *     вместо да влезе тихо.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno, type Sabitie } from '../src/yadro/index.js';
import {
  butniSvoyata,
  drapniChuzhdite,
  GreshkaDrayv,
  imeNaFayla,
  nashLiE,
  PRISTAVKA_NA_FAYLA,
  type Drayv,
  type FaylVDrayva,
} from '../src/nositel/drayv.js';
import { NASTAVKA_PISACH } from '../src/domein/akaunt.js';
import type { KvotaNaDrayva } from '../src/domein/spiratchka.js';
import { SHA } from './pomoshtni.js';

const KNIGA = 'kniga';
const MOYATA = `${KNIGA}${NASTAVKA_PISACH}mira@x.bg`;
const CHUZHDATA = `${KNIGA}${NASTAVKA_PISACH}petar@x.bg`;

/** Драйв в паметта · брои и повикванията, за да личи какво НЕ е станало. */
class DrayvVPametta implements Drayv {
  readonly faylove = new Map<string, { ime: string; sadarzhanie: string }>();
  presazdadeni = 0;
  sazdadeni = 0;
  #nomer = 0;

  /** Кваотата се ЗАДАВА от теста · драйвът в паметта не измисля числа. */
  kvotata: KvotaNaDrayva = { limit: 15 * 1024 * 1024 * 1024, zaeto: 0 };

  async kvota(): Promise<KvotaNaDrayva> {
    return this.kvotata;
  }

  slozhi(ime: string, sadarzhanie: string): string {
    const id = `f-${(this.#nomer += 1)}`;
    this.faylove.set(id, { ime, sadarzhanie });
    return id;
  }

  async spisak(pristavka: string): Promise<readonly FaylVDrayva[]> {
    return [...this.faylove.entries()]
      .filter(([, f]) => f.ime.startsWith(pristavka))
      .map(([id, f]) => ({ id, ime: f.ime }));
  }

  async cheti(id: string): Promise<string> {
    const f = this.faylove.get(id);
    if (!f) throw new Error(`няма файл ${id}`);
    return f.sadarzhanie;
  }

  async sazday(ime: string, sadarzhanie: string): Promise<string> {
    this.sazdadeni += 1;
    return this.slozhi(ime, sadarzhanie);
  }

  async presazday(id: string, sadarzhanie: string): Promise<void> {
    this.presazdadeni += 1;
    this.faylove.set(id, { ime: this.faylove.get(id)!.ime, sadarzhanie });
  }
}

/** Истинска верига през Вратата — за да са хешовете верни, не измислени. */
async function veriga(klyuch: string, broy: number): Promise<Sabitie[]> {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  for (let i = 0; i < broy; i += 1) {
    await vrata.dobavi({
      opId: `${klyuch}-${i}`,
      ts: new Date(Date.UTC(2026, 7, 26, 9, 0, i)).toISOString(),
      naematel: klyuch,
      actor: 'kojto@x.bg',
      type: 'ИмотДобавен',
      sashtnost: { vid: 'imot', id: `i-${i}` },
      payload: { adres: `ул. ${i}`, edinitsa: 'А', ploshtad_kvsm: 60 },
    });
  }
  return dnevnik.chetiVsichki(klyuch);
}

describe('името на файла', () => {
  it('носи ЦЕЛИЯ ключ, с почистени забранени знаци', () => {
    const ime = imeNaFayla(MOYATA);
    expect(ime.startsWith(PRISTAVKA_NA_FAYLA)).toBe(true);
    expect(ime).toContain('mira@x.bg');
    expect(ime).not.toContain(':'); // двоеточието на наставката пада
    expect(ime.endsWith('.json')).toBe(true);
  });

  it('чуждите файлове в Драйва не се броят за наши', () => {
    expect(nashLiE(imeNaFayla(MOYATA))).toBe(true);
    expect(nashLiE('снимки-от-морето.json')).toBe(false);
    expect(nashLiE(`${PRISTAVKA_NA_FAYLA}нещо.txt`)).toBe(false);
  });
});

describe('бутам СВОЯТА', () => {
  it('първото бутане СЪЗДАВА файла', async () => {
    const drayv = new DrayvVPametta();
    const r = await butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 3));
    expect(r).toEqual({ veriga: MOYATA, broy: 3, novFayl: true });
    expect(drayv.sazdadeni).toBe(1);
  });

  it('следващото ПРЕСЪЗДАВА същия файл, не прави втори', async () => {
    const drayv = new DrayvVPametta();
    await butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 2));
    const r = await butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 4));
    expect(r.novFayl).toBe(false);
    expect(drayv.sazdadeni).toBe(1);
    expect(drayv.presazdadeni).toBe(1);
    expect(drayv.faylove.size).toBe(1);
  });

  it('НЕ СКЪСЯВА · по-дълъг файл горе спира бутането С ДУМИ', async () => {
    const drayv = new DrayvVPametta();
    await butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 5));
    await expect(butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 3))).rejects.toThrow(
      /СКЪСИЛО/,
    );
    // и наистина НИЩО не е пресъздадено · отказът е ПРЕДИ качването
    expect(drayv.presazdadeni).toBe(0);
    expect(JSON.parse([...drayv.faylove.values()][0]!.sadarzhanie)).toHaveLength(5);
  });

  it('чужди звена не влизат в моя файл', async () => {
    const drayv = new DrayvVPametta();
    await expect(butniSvoyata(drayv, MOYATA, await veriga(CHUZHDATA, 2))).rejects.toThrow(
      GreshkaDrayv,
    );
  });

  it('празна верига не се бута', async () => {
    await expect(butniSvoyata(new DrayvVPametta(), MOYATA, [])).rejects.toThrow(GreshkaDrayv);
  });
});

describe('дърпам ЧУЖДИТЕ', () => {
  async function sDvaFayla() {
    const drayv = new DrayvVPametta();
    await butniSvoyata(drayv, MOYATA, await veriga(MOYATA, 2));
    drayv.slozhi(imeNaFayla(CHUZHDATA), JSON.stringify(await veriga(CHUZHDATA, 3)));
    return drayv;
  }

  it('МОЯТА не се дърпа · тя е тук, горе е само копие', async () => {
    const drapnati = await drapniChuzhdite(await sDvaFayla(), KNIGA, MOYATA, SHA);
    expect(drapnati.map((d) => d.veriga)).toEqual([CHUZHDATA]);
  });

  it('цялата чужда верига се ПРИЕМА', async () => {
    const drapnati = await drapniChuzhdite(await sDvaFayla(), KNIGA, MOYATA, SHA);
    expect(drapnati[0]!.tsyala).toBe(true);
    expect(drapnati[0]!.sabitiya).toHaveLength(3);
    expect(drapnati[0]!.prichina).toBe('');
  });

  it('СЧУПЕНАТА се отказва с ПРИЧИНА, не се хвърля мълчаливо', async () => {
    const drayv = new DrayvVPametta();
    const chuzhdi = await veriga(CHUZHDATA, 3);
    // Едно пипнато поле · подписът покрива всяко (ADR-049).
    const pipnati = chuzhdi.map((s, i) => (i === 1 ? { ...s, actor: 'ne-toy@x.bg' } : s));
    drayv.slozhi(imeNaFayla(CHUZHDATA), JSON.stringify(pipnati));

    const drapnati = await drapniChuzhdite(drayv, KNIGA, MOYATA, SHA);
    expect(drapnati[0]!.tsyala).toBe(false);
    expect(drapnati[0]!.sabitiya).toEqual([]);
    expect(drapnati[0]!.prichina).toContain('seq 2');
  });

  it('файл, който СМЕСВА вериги, се отказва', async () => {
    const drayv = new DrayvVPametta();
    drayv.slozhi(
      imeNaFayla(CHUZHDATA),
      JSON.stringify([...(await veriga(CHUZHDATA, 1)), ...(await veriga(MOYATA, 1))]),
    );
    const drapnati = await drapniChuzhdite(drayv, KNIGA, MOYATA, SHA);
    expect(drapnati[0]!.prichina).toBe('файлът смесва вериги');
  });

  it('файл, който не е JSON, се отказва с думи', async () => {
    const drayv = new DrayvVPametta();
    drayv.slozhi(imeNaFayla(CHUZHDATA), 'това не е JSON');
    const drapnati = await drapniChuzhdite(drayv, KNIGA, MOYATA, SHA);
    expect(drapnati[0]!.prichina).toBe('файлът не е JSON');
  });

  it('чужди файлове в същия Драйв не се пипат', async () => {
    const drayv = await sDvaFayla();
    drayv.slozhi('данъчна-декларация.json', '[]');
    const drapnati = await drapniChuzhdite(drayv, KNIGA, MOYATA, SHA);
    expect(drapnati.map((d) => d.veriga)).toEqual([CHUZHDATA]);
  });

  it('празен Драйв дава празен списък, не хвърля', async () => {
    expect(await drapniChuzhdite(new DrayvVPametta(), KNIGA, MOYATA, SHA)).toEqual([]);
  });
});
