/**
 * МИГРАЦИЯ · „Наеми КЕШ" → първи събития в Журнала.
 *
 * Правилото над плана: партида без сверка не се приема.
 * Затова тук сверката е ПРЕДИ записа, не след него — ако листът не затваря
 * срещу собствените си тотали, НИЩО не влиза в Журнала.
 *
 * Това е поуката от 24,2%: липсата на сверка не вдига шум, тя мълчи.
 */

import { GreshkaSverka, sverka, type Sverka } from '../yadro/sverka.js';
import { DnevnikNaSverki } from '../yadro/sverka.js';
import { eStotinki } from '../yadro/pari.js';
import { SEKTOR_PO_PODRAZBIRANE } from '../domein/dds.js';
import type { Deystviya } from '../domein/deystviya.js';

/** Един ред от регистъра, вече прочетен и приведен към стотинки. */
export interface RedOtRegistara {
  /** „АП. № 1", „ОФИС № 3", „ПМ БАР № 4" */
  readonly edinitsa: string;
  /** „Малинова", „С.Г. ОФИСИ", „С. Г. ОРЕХ" */
  readonly myasto: string;
  /** коя колона за наем — регистърът има повече от една */
  readonly kolona: string;
  readonly naem_st: number;
}

/**
 * Каквото САМИЯТ лист обявява за себе си. Сверката е срещу това,
 * не срещу наше очакване — иначе проверяваме себе си със себе си.
 */
export interface ObyavenoOtLista {
  readonly broiRedove: number;
  /** колона → обявен тотал в стотинки */
  readonly totali_st: Readonly<Record<string, number>>;
}

export interface RezultatMigratsiya {
  readonly sverki: readonly Sverka[];
  readonly zapisani: number;
  readonly povtoreni: number;
  readonly nared: boolean;
}

export class GreshkaMigratsiya extends Error {
  readonly sverki: readonly Sverka[];

  constructor(message: string, sverki: readonly Sverka[]) {
    super(message);
    this.name = 'GreshkaMigratsiya';
    this.sverki = sverki;
  }
}

/**
 * Сверява прочетеното срещу обявеното от листа.
 * Връща ВСИЧКИ сверки — включително затварящите, защото нулевата разлика
 * също е резултат и също се записва.
 */
export function sveriRegistara(
  redove: readonly RedOtRegistara[],
  obyaveno: ObyavenoOtLista,
  kogato: string,
): Sverka[] {
  const sverki: Sverka[] = [
    sverka('Наеми КЕШ · брой редове', obyaveno.broiRedove, redove.length, kogato),
  ];

  const poKolona = new Map<string, number>();
  for (const r of redove) {
    poKolona.set(r.kolona, (poKolona.get(r.kolona) ?? 0) + r.naem_st);
  }

  // Всяка обявена колона се сверява — и тези, за които не сме прочели нищо.
  const koloni = new Set([...Object.keys(obyaveno.totali_st), ...poKolona.keys()]);
  for (const kolona of [...koloni].sort()) {
    sverki.push(
      sverka(
        `Наеми КЕШ · колона „${kolona}"`,
        obyaveno.totali_st[kolona] ?? 0,
        poKolona.get(kolona) ?? 0,
        kogato,
      ),
    );
  }

  return sverki;
}

export interface NastroykiMigratsiya {
  readonly deystviya: Deystviya;
  readonly redove: readonly RedOtRegistara[];
  readonly obyaveno: ObyavenoOtLista;
  readonly kogato: string;
  /** ден от месеца за падеж — регистърът не го носи */
  readonly padezhDen: number;
}

/**
 * Мигрира регистъра. Хвърля ПРЕДИ да е записала каквото и да е,
 * ако сверката срещу обявените тотали не затваря.
 */
export async function migrirajNaemiKesh(n: NastroykiMigratsiya): Promise<RezultatMigratsiya> {
  const dnevnikNaSverki = new DnevnikNaSverki();

  for (const r of n.redove) {
    if (!eStotinki(r.naem_st)) {
      throw new GreshkaMigratsiya(
        `„${r.edinitsa}" носи наем, който не е цели стотинки: ${String(r.naem_st)}`,
        [],
      );
    }
  }

  // 1 · Сверка ПРЕДИ записа. Не затваря → нищо не влиза в Журнала.
  const predi = sveriRegistara(n.redove, n.obyaveno, n.kogato);
  for (const s of predi) dnevnikNaSverki.zapishi(s);

  const nezatvoreni = predi.filter((s) => !s.nared);
  if (nezatvoreni.length > 0) {
    throw new GreshkaMigratsiya(
      `Регистърът не затваря срещу собствените си тотали (${nezatvoreni.length} ` +
        `${nezatvoreni.length === 1 ? 'разлика' : 'разлики'}). Нищо не е записано.`,
      dnevnikNaSverki.vsichki,
    );
  }

  // 2 · Записът. opId е производен от единицата — повторно пускане не удвоява.
  let zapisani = 0;
  let povtoreni = 0;

  for (const r of n.redove) {
    const imotId = idNaImot(r);
    const naemId = idNaNaem(r);

    const imot = await n.deystviya.dobaviImot(
      imotId,
      { adres: r.myasto, edinitsa: r.edinitsa, ploshtad_kvsm: 0 },
      { opId: `migratsiya:naemi-kesh:imot:${imotId}` },
    );
    imot.povtoreno ? (povtoreni += 1) : (zapisani += 1);

    const naem = await n.deystviya.dobaviNaem(
      naemId,
      {
        imotId,
        naemetel: r.kolona,
        naem_st: r.naem_st,
        padezhDen: n.padezhDen,
        ot: n.kogato.slice(0, 10),
        do: '',
        depozit_st: 0,
        // Наемите от листа са жилищни; друго не се твърди без дума за него.
        sektor: SEKTOR_PO_PODRAZBIRANE,
      },
      { opId: `migratsiya:naemi-kesh:naem:${naemId}` },
    );
    naem.povtoreno ? (povtoreni += 1) : (zapisani += 1);
  }

  // 3 · Сверка СЛЕД записа: колкото реда — толкова наема в Огледалото.
  const ogledalo = await n.deystviya.ogledalo();
  const sled = [
    sverka('Наеми КЕШ · наеми в Огледалото', n.redove.length, ogledalo.naemi.size, n.kogato),
    sverka('Наеми КЕШ · имоти в Огледалото', n.redove.length, ogledalo.imoti.size, n.kogato),
  ];
  for (const s of sled) dnevnikNaSverki.zapishiIliPadni(s);

  return {
    sverki: dnevnikNaSverki.vsichki,
    zapisani,
    povtoreni,
    nared: dnevnikNaSverki.nezatvoreni.length === 0,
  };
}

/** Стабилен ключ от място и единица — за да е повторното пускане безопасно. */
function idNaImot(r: RedOtRegistara): string {
  return `I:${klyuch(r.myasto)}:${klyuch(r.edinitsa)}`;
}

function idNaNaem(r: RedOtRegistara): string {
  return `N:${klyuch(r.myasto)}:${klyuch(r.edinitsa)}:${klyuch(r.kolona)}`;
}

function klyuch(s: string): string {
  return s.trim().replace(/\s+/g, '-');
}

export { GreshkaSverka };
