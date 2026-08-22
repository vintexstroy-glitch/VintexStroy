/**
 * СРИВЪТ · токът спира, разделите се надпреварват, уникодът лъже.
 *
 * Трите начина, по които местно-първо приложение губи данни в истинския
 * живот — и доказателството, че този не ги губи.
 */

import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import {
  DnevnikVPametta,
  GreshkaDnevnik,
  KotvaVPametta,
  proveriKotvata,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
  type Dnevnik,
  type Sabitie,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { otvoriDnevnik } from '../src/nositel/dnevnik-indexeddb.js';
import { stotinki } from '../src/yadro/pari.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';

function deystviyata(vrata: Vrata, dnevnik: Dnevnik, otstap = 0) {
  let tik = 0;
  return new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 0, 1, otstap, 0, 0, tik++)).toISOString(),
  });
}

/** Носител, който „спира токът" след уговорен брой записа. */
class DnevnikSasSpirashtTok implements Dnevnik {
  #ostavashti: number;

  constructor(
    readonly istinski: Dnevnik,
    izdurzha: number,
  ) {
    this.#ostavashti = izdurzha;
  }

  vdigniToka(): void {
    this.#ostavashti = Number.POSITIVE_INFINITY;
  }

  posledno(n: string) {
    return this.istinski.posledno(n);
  }
  poOpId(n: string, o: string) {
    return this.istinski.poOpId(n, o);
  }
  tekushtRev(n: string, s: never) {
    return this.istinski.tekushtRev(n, s);
  }
  chetiVsichki(n: string) {
    return this.istinski.chetiVsichki(n);
  }
  chetiZaSashtnost(n: string, s: never) {
    return this.istinski.chetiZaSashtnost(n, s);
  }

  async dobavi(s: Sabitie): Promise<void> {
    if (this.#ostavashti <= 0) {
      throw new Error('токът спря');
    }
    this.#ostavashti -= 1;
    return this.istinski.dobavi(s);
  }
}

async function nasadiNaemi(d: Deystviya, kolko: number): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 },
    { opId: 'op-imot' });
  for (let i = 1; i <= kolko; i += 1) {
    await d.dobaviNaem(
      `N-${i}`,
      {
        imotId: 'I-1', naemetel: `наемател ${i}`, naem_st: stotinki(100_00 + i),
        padezhDen: 5, ot: '2025-01-01', do: '', depozit_st: 0, sektor: 'naem-zhilishten',
      },
      { opId: `op-naem-${i}` },
    );
  }
}

describe('токът спира по средата на партида', () => {
  it('няма половин събитие, а повторното пускане дописва само липсващото', async () => {
    const istinski = new DnevnikVPametta();
    // Издържа 11 записа: имот + 8 наема + 2 начисления, третото пада.
    const dnevnik = new DnevnikSasSpirashtTok(istinski, 11);
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const d = deystviyata(vrata, dnevnik);

    await nasadiNaemi(d, 8);
    await expect(
      nachisliZaPeriod({ deystviya: d, period: '2026-02', kogato: '2026-02-01T00:00:00.000Z' }),
    ).rejects.toThrow('токът спря');

    // След срива: точно 11 цели събития, верига цяла, нищо наполовина.
    const sled = await istinski.chetiVsichki(NAEMATEL);
    expect(sled).toHaveLength(11);
    expect((await proveriVerigata(sled, SHA)).tsyala).toBe(true);

    // Токът се връща; същата партида, същите opId — дописват се само шестте.
    dnevnik.vdigniToka();
    const rezultat = await nachisliZaPeriod({
      deystviya: d, period: '2026-02', kogato: '2026-02-01T00:05:00.000Z',
    });
    expect(rezultat.veche).toBe(2);
    expect(rezultat.nachisleni).toBe(6);
    expect(rezultat.nared).toBe(true);

    const nakraya = await istinski.chetiVsichki(NAEMATEL);
    expect(nakraya).toHaveLength(17);
    expect((await proveriVerigata(nakraya, SHA)).tsyala).toBe(true);
  });
});

describe('два раздела пишат едновременно', () => {
  it('две Врати, един Журнал: сто записа, нула дупки, верига цяла', async () => {
    // Един носител, две Врати — точно както два раздела на браузъра.
    // Опашките им в паметта са различни; редът се удържа от повторението
    // при сблъсък на seq (и от Web Locks в истинския браузър).
    const dnevnik = new DnevnikVPametta();
    const vrataA = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const vrataB = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const a = deystviyata(vrataA, dnevnik, 0);
    const b = deystviyata(vrataB, dnevnik, 1);

    await Promise.all([
      (async () => {
        for (let i = 1; i <= 50; i += 1) {
          await a.dobaviImot(`A-${i}`, { adres: `А ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
            { opId: `raz-a-${i}` });
        }
      })(),
      (async () => {
        for (let i = 1; i <= 50; i += 1) {
          await b.dobaviImot(`B-${i}`, { adres: `Б ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
            { opId: `raz-b-${i}` });
        }
      })(),
    ]);

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya).toHaveLength(100);
    expect(sabitiya.map((s) => s.seq)).toEqual(sabitiya.map((_, i) => i + 1));
    expect((await proveriVerigata(sabitiya, SHA)).tsyala).toBe(true);
  });

  it('двата раздела пращат ЕДНА И СЪЩА операция — печели един, другият получава povtoreno', async () => {
    const dnevnik = new DnevnikVPametta();
    const vrataA = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const vrataB = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });

    const op = {
      opId: 'dvoyna', ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL,
      actor: 'x', type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: 'I-1' },
      payload: { adres: 'Малинова', edinitsa: '1', ploshtad_kvsm: 0 },
    };
    const [r1, r2] = await Promise.all([vrataA.dobavi(op), vrataB.dobavi(op)]);

    expect([r1.povtoreno, r2.povtoreno].filter(Boolean)).toHaveLength(1);
    expect(r1.seq).toBe(r2.seq);
    expect(r1.hash).toBe(r2.hash);
    expect(await dnevnik.chetiVsichki(NAEMATEL)).toHaveLength(1);
  });

  it('и върху истинския носител (IndexedDB): две Врати, шейсет записа', async () => {
    const dnevnik = await otvoriDnevnik(`proba-sriv-${Date.now()}`);
    const vrataA = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const vrataB = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    const a = deystviyata(vrataA, dnevnik, 0);
    const b = deystviyata(vrataB, dnevnik, 1);

    await Promise.all([
      (async () => {
        for (let i = 1; i <= 30; i += 1) {
          await a.dobaviImot(`A-${i}`, { adres: `А ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
            { opId: `idb-a-${i}` });
        }
      })(),
      (async () => {
        for (let i = 1; i <= 30; i += 1) {
          await b.dobaviImot(`B-${i}`, { adres: `Б ${i}`, edinitsa: 'х', ploshtad_kvsm: 0 },
            { opId: `idb-b-${i}` });
        }
      })(),
    ]);

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya).toHaveLength(60);
    expect(sabitiya.map((s) => s.seq)).toEqual(sabitiya.map((_, i) => i + 1));
    expect((await proveriVerigata(sabitiya, SHA)).tsyala).toBe(true);
    dnevnik.zatvori();
  });
});

describe('уникод-двойникът', () => {
  const NFD = 'й'; // „й" като „и" + отделен знак — както някои клавиатури го пращат
  const NFC = 'й'; // „й" като една буква

  it('едно „й" е един запис — двата правописа падат в един opId', async () => {
    expect(NFD).not.toBe(NFC);
    expect(NFD.normalize('NFC')).toBe(NFC);

    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });

    const op = (opId: string) => ({
      opId, ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL, actor: 'x',
      type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: `imot-${opId}` },
      payload: { adres: `Ра${NFD}ково`, edinitsa: '1', ploshtad_kvsm: 0 },
    });

    const parvi = await vrata.dobavi(op(`ра${NFD}on`));
    const vtori = await vrata.dobavi(op(`ра${NFC}on`));

    expect(vtori.povtoreno).toBe(true);
    expect(vtori.seq).toBe(parvi.seq);

    // И записаното е в NFC — каквото и да е пращала клавиатурата.
    const [s] = await dnevnik.chetiVsichki(NAEMATEL);
    expect((s!.payload as { adres: string }).adres).toBe(`Ра${NFC}ково`);
  });

  it('емоджи и знаци за управление минават носителя с непроменен хеш', async () => {
    const dnevnik = await otvoriDnevnik(`proba-unikod-${Date.now()}`);
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });

    await vrata.dobavi({
      opId: 'странното', ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL, actor: 'x',
      type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: 'I-1' },
      payload: { adres: '🏠 ул. „Тиха" №5\tблок\nвход', edinitsa: '№ 1 ½', ploshtad_kvsm: 0 },
    });

    // Прочетеното от диска се проверява срещу собствения си хеш.
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect((await proveriVerigata(sabitiya, SHA)).tsyala).toBe(true);
    dnevnik.zatvori();
  });
});

describe('котвата', () => {
  function opit(n: number) {
    return {
      opId: `k-${n}`, ts: '2026-01-01T00:00:00.000Z', naematel: NAEMATEL, actor: 'x',
      type: 'ИмотДобавен', sashtnost: { vid: 'imot', id: `I-${n}` },
      payload: { adres: `А ${n}`, edinitsa: 'х', ploshtad_kvsm: 0 },
    };
  }

  it('следва всеки запис и хваща скъсен отзад Журнал', async () => {
    const dnevnik = new DnevnikVPametta();
    const kotva = new KotvaVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA, kotva });

    for (let i = 1; i <= 5; i += 1) await vrata.dobavi(opit(i));

    const zabita = kotva.cheti(NAEMATEL)!;
    expect(zabita.seq).toBe(5);

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    const hashNa = (redica: readonly Sabitie[]) => (seq: number) =>
      redica.find((s) => s.seq === seq)?.hash;

    // Цял Журнал — наред.
    expect(proveriKotvata(zabita, 5, hashNa(sabitiya)).nared).toBe(true);

    // „Изчезват" последните две събития: веригата на остатъка е цяла,
    // но котвата помни seq 5 — и точно тя вдига тревогата.
    const skusen = sabitiya.slice(0, 3);
    expect((await proveriVerigata(skusen, SHA)).tsyala).toBe(true);
    const proverka = proveriKotvata(zabita, 3, hashNa(skusen));
    expect(proverka.nared).toBe(false);
    expect(proverka.prichina).toContain('скъсяван отзад');

    // Пренаписана история със същата дължина — хешът на котвения seq издава.
    const prenapisan = [...sabitiya.slice(0, 4), { ...sabitiya[4]!, hash: 'чужд' }];
    const vtora = proveriKotvata(zabita, 5, hashNa(prenapisan));
    expect(vtora.nared).toBe(false);
    expect(vtora.prichina).toContain('пренаписана');
  });

  it('без котва няма мнение — нов браузър не е инцидент', () => {
    expect(proveriKotvata(null, 0, () => undefined).nared).toBe(true);
  });
});
