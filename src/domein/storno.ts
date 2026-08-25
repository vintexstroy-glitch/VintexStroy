/**
 * КОГА СТОРНОТО Е БЕЗОПАСНО.
 *
 * Сторното не трие — то казва „това не се брои". Точно затова може да остави
 * дупка: сторнираш вземане, а плащанията по него остават да сочат нищо;
 * сторниращ наем, а вземанията му висят на въздух. Огледалото няма да се пукне,
 * ще замълчи — а тихото разминаване е най-скъпото (docs/04-odit-na-verigata.md).
 *
 * Затова тук стои вратарят: сторно се отказва, докато нещо живо виси на
 * събитието. Първо се маха горното, после долното.
 *
 * Поправка на ОПИСАНИЕ (адрес, име, сума за напред) не минава оттук — тя е
 * отделно събитие „…Поправен", което не къса нищо.
 */

import type { Sabitie } from '../yadro/index.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

export interface Otgovor {
  readonly mozhe: boolean;
  /** празно, когато може; иначе — с думи, защо не */
  readonly prichina: string;
}

const MOZHE: Otgovor = { mozhe: true, prichina: '' };

function ne(prichina: string): Otgovor {
  return { mozhe: false, prichina };
}

function broy(n: number, edno: string, mnogo: string): string {
  return `${n} ${n === 1 ? edno : mnogo}`;
}

/** Кое събитие носи този seq. */
function sabitiePoSeq(sabitiya: readonly Sabitie[], seq: number): Sabitie | undefined {
  return sabitiya.find((s) => s.seq === seq);
}

export function mozheLiDaSeStornira(
  sabitiya: readonly Sabitie[],
  o: Ogledalo,
  seq: number,
): Otgovor {
  const s = sabitiePoSeq(sabitiya, seq);
  if (!s) return ne(`Няма събитие със seq ${seq}.`);
  // Първо типът, после погасеността: самото сторно стои в `pogaseni`, а
  // „вече е сторнирано“ би било лъжа за него.
  if (s.type === 'Сторно') {
    return ne('Сторно не се сторнира. Ако е сгрешено, впиши наново това, което трябва.');
  }
  if (o.pogaseni.has(seq)) return ne('Това вече е сторнирано. Второ сторно не го връща.');

  const id = s.sashtnost.id;

  switch (s.type) {
    case 'ВземанеНачислено': {
      const plashtaniya = [...o.plashtaniya.values()].filter((p) => p.vzemaneId === id);
      if (plashtaniya.length > 0) {
        return ne(
          `По това вземане има ${broy(plashtaniya.length, 'прието плащане', 'приети плащания')}. ` +
            'Сторнирай първо плащанията, после вземането.',
        );
      }
      return MOZHE;
    }

    case 'НаемДобавен': {
      const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.naemId === id);
      if (vzemaniya.length > 0) {
        return ne(
          `По този наем има ${broy(vzemaniya.length, 'начислено вземане', 'начислени вземания')}. ` +
            'Сторнирай първо тях. За смяна на име или сума ползвай „Поправи“ — не сторно.',
        );
      }
      return MOZHE;
    }

    case 'ИмотДобавен': {
      // Прекратеният наем също виси тук: вземанията му остават да се плащат.
      const naemi = [...o.naemi.values()].filter((n) => n.imotId === id);
      if (naemi.length > 0) {
        return ne(
          `На този имот ${naemi.length === 1 ? 'виси' : 'висят'} ${broy(naemi.length, 'наем', 'наема')}. ` +
            'Махни първо тях. За смяна на адрес ползвай „Поправи“ — не сторно.',
        );
      }
      return MOZHE;
    }

    default:
      // Плащане, прекратяване, поправка — нищо не виси отдолу.
      return MOZHE;
  }
}

