/**
 * ФЪРТУНА · ядрото под обстрел.
 *
 * Два вида буря, и двете детерминистични (seyalka — повторим провал):
 *   1. Стотици СЛУЧАЙНИ ВАЛИДНИ операции → инвариантите държат до края.
 *   2. Хиляда НАРОЧНО ПОВРЕДЕНИ операции → всяка отказана, нула поражения.
 *
 * Единичните тестове доказват, че познатото работи. Фъртуната търси
 * непознатото: съчетанието, за което никой не е помислил.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  GreshkaVrata,
  proveriVerigata,
  stotinki,
  Vrata,
  VsichkoRazresheno,
  type Operatsiya,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { VID } from '../src/domein/sabitiya.js';
import { mozheLiDaSeStornira } from '../src/domein/storno.js';
import { duljimo, fold } from '../src/ogledalo/ogledalo.js';
import { seyalka, SHA } from './pomoshtni.js';

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
    chasovnik: () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tik++)).toISOString(),
  });
  return { dnevnik, vrata, deystviya };
}

describe('фъртуна 1 · петстотин валидни операции', () => {
  it('инвариантите държат до края', async () => {
    const { dnevnik, deystviya } = stend();
    const sluchayno = seyalka(20260822);
    const izbroy = (n: number) => Math.floor(sluchayno() * n);

    const imoti: string[] = [];
    const naemi: string[] = [];
    const vzemaniya: string[] = [];
    const plashtaniya: string[] = [];
    let broyach = 0;

    for (let i = 0; i < 500; i += 1) {
      const zar = sluchayno();
      broyach += 1;

      if (zar < 0.15 || imoti.length === 0) {
        const id = `I-${broyach}`;
        await deystviya.dobaviImot(
          id,
          { adres: `Адрес ${broyach}`, edinitsa: `№ ${broyach}`, ploshtad_kvsm: izbroy(2_000_000) },
          { opId: `f:imot:${broyach}` },
        );
        imoti.push(id);
      } else if (zar < 0.35 || naemi.length === 0) {
        const id = `N-${broyach}`;
        await deystviya.dobaviNaem(
          id,
          {
            imotId: imoti[izbroy(imoti.length)]!,
            naemetel: `наемател ${broyach}`,
            naem_st: stotinki(100 + izbroy(500_000)),
            padezhDen: 1 + izbroy(31),
            ot: '2025-01-01',
            do: '',
            depozit_st: stotinki(izbroy(200_000)),
            sektor: zar < 0.25 ? 'naem-zhilishten' : 'naem-targovski',
          },
          { opId: `f:naem:${broyach}` },
        );
        naemi.push(id);
      } else if (zar < 0.55 || vzemaniya.length === 0) {
        const id = `V-${broyach}`;
        await deystviya.nachisliVzemane(
          id,
          {
            naemId: naemi[izbroy(naemi.length)]!,
            period: `2026-${String(1 + izbroy(12)).padStart(2, '0')}`,
            osnovanie: 'наем',
            suma_st: stotinki(100 + izbroy(500_000)),
            padezh: '2026-06-15',
          },
          { opId: `f:vzemane:${broyach}` },
        );
        vzemaniya.push(id);
      } else if (zar < 0.85) {
        const id = `P-${broyach}`;
        await deystviya.priemiPlashtane(
          id,
          {
            vzemaneId: vzemaniya[izbroy(vzemaniya.length)]!,
            suma_st: stotinki(1 + izbroy(600_000)),
            nachin: zar < 0.7 ? 'в брой' : 'банка',
            data: '2026-06-20',
          },
          { opId: `f:plashtane:${broyach}` },
        );
        plashtaniya.push(id);
      } else {
        // Сторно — само през вратаря, както от екрана. Вратарят не бива да лъже:
        // каже ли „може", сторното МИНАВА.
        const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
        const o = fold(vsichki);
        const zhertva = vsichki[izbroy(vsichki.length)]!;
        const otgovor = mozheLiDaSeStornira(vsichki, o, zhertva.seq);
        if (otgovor.mozhe) {
          await deystviya.storniraj(
            `S-${broyach}`,
            { pogasyavaSeq: zhertva.seq, prichina: 'фъртуна' },
            { opId: `f:storno:${broyach}` },
            zhertva.sashtnost.vid as never,
          );
        }
      }
    }

    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya.length).toBeGreaterThan(400);

    // 1 · веригата е цяла след бурята
    const veriga = await proveriVerigata(sabitiya, SHA);
    expect(veriga.tsyala).toBe(true);

    // 2 · seq е плътен: 1, 2, 3 … без дупка
    expect(sabitiya.map((s) => s.seq)).toEqual(sabitiya.map((_, i) => i + 1));

    // 3 · fold е детерминистичен — два пъти върху същото дава същото
    const o1 = fold(sabitiya);
    const o2 = fold(sabitiya);
    expect(JSON.stringify([...o1.vzemaniya.entries()])).toBe(
      JSON.stringify([...o2.vzemaniya.entries()]),
    );

    // 4 · дължимото е сборът на остатъците, а остатъкът е точно
    //     начислено − погасено, за всяко вземане поотделно
    let sbor = 0;
    for (const v of o1.vzemaniya.values()) {
      expect(v.ostatak_st).toBe(v.nachisleno_st - v.pogaseno_st);
      expect(Number.isSafeInteger(v.ostatak_st)).toBe(true);
      expect(v.pogaseno_st).toBeGreaterThanOrEqual(0);
      sbor += v.ostatak_st;
    }
    expect(duljimo(o1)).toBe(sbor);

    // 5 · всяко сторно поглъща точно две звена: себе си и жертвата
    const storna = sabitiya.filter((s) => s.type === 'Сторно');
    expect(o1.pogaseni.size).toBe(storna.length * 2);
  });
});

describe('фъртуна 2 · хиляда повредени операции', () => {
  it('всяка е отказана и нито една не поврежда веригата', async () => {
    const { dnevnik, vrata } = stend();
    const sluchayno = seyalka(19840303);

    const zdrava = (n: number): Operatsiya => ({
      opId: `zdrava-${n}`,
      ts: '2026-08-22T09:00:00.000Z',
      naematel: NAEMATEL,
      actor: 'vintexstroy@gmail.com',
      type: 'ИмотДобавен',
      sashtnost: { vid: 'imot', id: `I-${n}` },
      payload: { adres: 'Малинова', edinitsa: `№ ${n}`, ploshtad_kvsm: 0 },
    });

    // Повредите: всяка е реален начин входът да пристигне крив.
    const povredi: ((op: Operatsiya, r: () => number) => Operatsiya)[] = [
      (op) => ({ ...op, opId: '' }),
      (op) => ({ ...op, opId: '   ' }),
      (op) => ({ ...op, naematel: '' }),
      (op) => ({ ...op, actor: '' }),
      (op) => ({ ...op, type: '' }),
      (op) => ({ ...op, ts: 'не е време' }),
      (op) => ({ ...op, ts: 123456 as never }),
      (op) => ({ ...op, sashtnost: { vid: '', id: 'X' } as never }),
      (op) => ({ ...op, sashtnost: { vid: 'imot', id: '' } as never }),
      (op) => ({ ...op, sashtnost: null as never }),
      (op) => ({ ...op, payload: null as never }),
      (op) => ({ ...op, payload: [1, 2, 3] as never }),
      (op) => ({ ...op, payload: 'низ' as never }),
      (op, r) => ({ ...op, payload: { suma_st: r() * 100 + 0.5 } }),
      (op) => ({ ...op, payload: { suma_st: '100' as never } }),
      (op) => ({ ...op, payload: { suma_st: null as never } }),
      (op) => ({ ...op, payload: { suma_st: Number.NaN } }),
      (op) => ({ ...op, payload: { suma_st: Infinity } }),
      (op) => ({ ...op, payload: { suma_st: 2 ** 53 } }),
      (op) => ({ ...op, payload: { vlozheno: { dulbochina: { pari_st: 10.01 } } } }),
      (op) => ({ ...op, expectedRev: 1.5 }),
      (op) => ({ ...op, expectedRev: 'едно' as never }),
      (op) => ({ ...op, payload: { golyam: 'х'.repeat(100_000), pari_st: 0.1 } }),
    ];

    let otkazani = 0;
    let prieti = 0;

    for (let i = 0; i < 1000; i += 1) {
      if (i % 10 === 9) {
        // Всяка десета е здрава — обстрелът не бива да спре и редовния поток.
        await vrata.dobavi(zdrava(i));
        prieti += 1;
        continue;
      }
      const povreda = povredi[Math.floor(sluchayno() * povredi.length)]!;
      try {
        await vrata.dobavi(povreda(zdrava(i), sluchayno));
        throw new Error(`Повредена операция ${i} мина през Вратата.`);
      } catch (greshka) {
        expect(greshka).toBeInstanceOf(GreshkaVrata);
        expect((greshka as GreshkaVrata).kod).toBe('NEVALIDNO');
        otkazani += 1;
      }
    }

    expect(otkazani).toBe(900);
    expect(prieti).toBe(100);

    // Нула поражения: точно здравите записи, верига цяла.
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    expect(sabitiya).toHaveLength(100);
    expect((await proveriVerigata(sabitiya, SHA)).tsyala).toBe(true);
  });
});
