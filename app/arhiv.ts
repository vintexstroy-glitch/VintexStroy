/**
 * АРХИВЪТ ЗА ЕКСЕЛ · Журналът, разгънат за човешки очи и чужди сверки.
 *
 * Думата на собственика: архив „пак в ексел, за архив и сверки… със специални
 * и удобни за търсене филтри". Затова всеки лист излиза с AutoFilter и
 * замразен заглавен ред — отваряш го и стрелките за филтриране са там.
 *
 * Сумите са в ЕВРО като числа — Excel да смята и филтрира по тях („Лев
 * няма", правило 3; колоните са озаглавени „…, €"). Това е ИЗГЛЕД за четене;
 * истината си остават центовете в Журнала, а точният архив е JSON-износът
 * с хешовете.
 */

import { rabotnaKniga, type List } from '../src/iznos/excel.js';
import { akumulator, ddsOtObshta, stavkaNaReda } from '../src/domein/dds.js';
import { potok } from '../src/domein/smetki.js';
import { smetki } from '../src/domein/smetki.js';
import { platenoDDSZaPerioda, type Ogledalo } from '../src/ogledalo/ogledalo.js';
import { klyuchNaZveno } from '../src/yadro/sabitie.js';
import { opisaNaZapisa, sumataNaZapisa } from '../src/domein/opis-na-zapisa.js';
import type { Sabitie } from '../src/yadro/index.js';

/** Стотинки → евро като число за клетка на Excel. Само за този изглед. */
function evro(st: number): number {
  return st / 100;
}

/**
 * СУМАТА за КЛЕТКА · домейнът дава центовете, изгледът ги прави евро.
 *
 * Самото четене на товара живее в `opis-na-zapisa.ts` — оттам го чете и
 * екранът, който показва сторнираните редове (ADR-087). Копие тук щеше да се
 * разминава при първото ново поле.
 */
function sumaOtPayload(s: Sabitie): number | '' {
  const st = sumataNaZapisa(s);
  return st === undefined ? '' : evro(st);
}

/** Всички месеци, в които има нещо — за листа „ДДС". */
function mesetsite(o: Ogledalo): string[] {
  const vsichki = new Set<string>();
  for (const v of o.vzemaniya.values()) vsichki.add(v.period);
  for (const r of o.razhodi.values()) vsichki.add(r.data.slice(0, 7));
  for (const sp of o.spravki.values()) vsichki.add(sp.period);
  return [...vsichki].sort();
}

export function arhivZaEksel(sabitiya: readonly Sabitie[], o: Ogledalo, kogato: string): Uint8Array {
  const zhurnal: List = {
    ime: 'Журнал',
    koloni: [
      { ime: 'seq', shirina: 7 },
      { ime: 'Дата', shirina: 12 },
      { ime: 'Тип', shirina: 18 },
      { ime: 'Същност', shirina: 20 },
      { ime: 'Описание', shirina: 36 },
      { ime: 'Сума, €', shirina: 12 },
      { ime: 'Сторнирано', shirina: 11 },
      { ime: 'opId', shirina: 26 },
      { ime: 'hash', shirina: 20 },
    ],
    redove: sabitiya.map((s) => [
      s.seq,
      s.ts.slice(0, 10),
      s.type,
      `${s.sashtnost.vid}:${s.sashtnost.id}`,
      opisaNaZapisa(s),
      sumaOtPayload(s),
      o.pogaseni.has(klyuchNaZveno(s)) ? 'да' : '',
      s.opId,
      s.hash.slice(0, 16),
    ]),
  };

  const vzemaniya: List = {
    ime: 'Вземания',
    koloni: [
      { ime: 'Период', shirina: 10 },
      { ime: 'Наемател', shirina: 24 },
      { ime: 'Падеж', shirina: 12 },
      { ime: 'Начислено, €', shirina: 14 },
      { ime: 'Погасено, €', shirina: 14 },
      { ime: 'Остатък, €', shirina: 13 },
      { ime: 'Състояние', shirina: 12 },
    ],
    redove: [...o.vzemaniya.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((v) => [
        v.period,
        o.naemi.get(v.naemId)?.naemetel ?? v.naemId,
        v.padezh,
        evro(v.nachisleno_st),
        evro(v.pogaseno_st),
        evro(v.ostatak_st),
        v.sastoyanie,
      ]),
  };

  const plashtaniya: List = {
    ime: 'Плащания',
    koloni: [
      { ime: 'Дата', shirina: 12 },
      { ime: 'Наемател', shirina: 24 },
      { ime: 'Период', shirina: 10 },
      { ime: 'Начин', shirina: 10 },
      { ime: 'Сума, €', shirina: 12 },
    ],
    redove: [...o.plashtaniya.values()]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((p) => {
        const v = o.vzemaniya.get(p.vzemaneId);
        return [
          p.data,
          v ? (o.naemi.get(v.naemId)?.naemetel ?? v.naemId) : p.vzemaneId,
          v?.period ?? '',
          p.nachin,
          evro(p.suma_st),
        ];
      }),
  };

  const razhodi: List = {
    ime: 'Разходи',
    koloni: [
      { ime: 'Дата', shirina: 12 },
      { ime: 'Доставчик', shirina: 22 },
      { ime: 'За какво', shirina: 26 },
      { ime: 'Поток', shirina: 10 },
      { ime: 'Сектор', shirina: 20 },
      { ime: 'Документ', shirina: 12 },
      { ime: 'Сума, €', shirina: 12 },
      { ime: 'ДДС, €', shirina: 10 },
      { ime: 'Източник', shirina: 24 },
    ],
    redove: [...o.razhodi.values()]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((r) => {
        const a = akumulator(r.sektor);
        // ДДС-то се смята на ЕДНО място (правило 17) и със ставката на РЕДА:
        // собствената формула тук ползваше ставката на СЕКТОРА, тоест нощувка
        // на 9% във „Фактури" излизаше в архива с 20% — разминато със Сметки.
        return [
          r.data,
          r.dostavchik,
          r.opis,
          potok(r.potok)?.ime ?? r.potok,
          a.sektor,
          r.dokument,
          evro(r.suma_st),
          evro(ddsOtObshta(r.suma_st, stavkaNaReda(r.sektor, r.stavka)).dds_st),
          r.izvor,
        ];
      }),
  };

  const dds: List = {
    ime: 'ДДС по месеци',
    koloni: [
      { ime: 'Период', shirina: 10 },
      { ime: 'Приход, €', shirina: 12 },
      { ime: 'Разход, €', shirina: 12 },
      { ime: 'ДДС изход, €', shirina: 14 },
      { ime: 'ДДС вход, €', shirina: 13 },
      { ime: 'За внасяне, €', shirina: 14 },
      { ime: 'Декларирано, €', shirina: 15 },
      { ime: 'Платено, €', shirina: 12 },
      { ime: 'Заключен', shirina: 10 },
    ],
    redove: mesetsite(o).map((period) => {
      const s = smetki(o, period, kogato);
      const spravka = o.spravki.get(period);
      return [
        period,
        evro(s.prihod_st),
        evro(s.razhod_st),
        evro(s.dds_izhod_st),
        evro(s.dds_vhod_st),
        evro(s.zaVnasyane_st),
        spravka ? evro(spravka.deklarirano_st) : '',
        evro(platenoDDSZaPerioda(o, period)),
        spravka ? 'да' : '',
      ];
    }),
  };

  return rabotnaKniga([zhurnal, vzemaniya, plashtaniya, razhodi, dds]);
}
