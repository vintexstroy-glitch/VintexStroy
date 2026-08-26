/**
 * Хеш-веригата: hash[n] зависи от prevHash = hash[n-1].
 * Прави всяко скрито редактиране откриваемо (System design §3.1).
 */

import type { Sabitie, ZaHeshirane } from './sabitie.js';

/**
 * Портът: асинхронен, за да върви и на Web Crypto в браузъра.
 * Реализациите живеят при носителите — `src/nositel/hash-node.ts` и `hash-web.ts`.
 * Тук нарочно няма стойност по подразбиране: носителят се избира явно.
 */
export type Sha256 = (danni: string) => Promise<string>;

/**
 * Канонично представяне за хеширане.
 *
 * Ключовете на payload се подреждат, за да не зависи хешът от реда им.
 *
 * ═══ ЗАЩО `actor` Е ВЪТРЕ · и защо дотук не беше ═══
 *
 * Дотук тук пишеше: „`actor` НЕ влиза в хеша: самоличността се записва, но не
 * заключва веригата." Това беше вярно като намерение и **невярно като защита**,
 * а разликата се плаща от онзи, чийто Журнал е пипнат.
 *
 * Измерено, не предположено: износ със сменен САМО `actor` — без нито един
 * пипнат хеш — минаваше `proveriVerigata` като ЦЯЛА и влизаше през
 * `vazstanovi`. Тоест кой какво е записал беше **редактируемо без следа**, в
 * книга, чието първо правило е „само добавяне".
 *
 * Оттогава `actor` порасна и стана НОСЕЩ: ADR-043 извежда стопанина на започнат
 * Журнал именно от `actor` на първото събитие („стопанинът не се избира —
 * ИЗВЕЖДА се от самата верига"). С неподписан `actor` тази защита се заобикаля
 * с текстов редактор: сменяш автора на събитие №1 в чужд износ, връщаш го — и
 * се вписваш за стопанин на чужда история. Точно това ADR-043 иска да спре.
 *
 * Затова `actor` влиза. Веригата вече заключва и „кой", не само „какво".
 *
 * ═══ ЦЕНАТА, казана честно ═══
 *
 * Това е СМЯНА НА ПОДПИСА: журнали, писани преди нея, не се проверяват с този
 * ред. Не се преписват (правило 1) и не се приемат мълчаливо — те получават
 * СВОЯ диагноза (`star-podpis`), за да знае човекът какво точно държи в ръцете
 * си, вместо да гадае пред „веригата е счупена".
 */
function kanonichno(s: ZaHeshirane): string {
  return JSON.stringify([
    s.seq,
    s.opId,
    s.ts,
    s.naematel,
    s.actor,
    s.type,
    s.sashtnost.vid,
    s.sashtnost.id,
    podredi(s.payload),
    s.prevHash,
  ]);
}

/**
 * СТАРИЯТ подпис · само за да се РАЗПОЗНАЕ, никога за да се приеме.
 *
 * Файл отпреди смяната се къса на първото си звено. Без този ред отказът щеше
 * да казва „хешът не съвпада" — вярно и безполезно: човекът не може да различи
 * пипнат файл от файл, писан по стария ред. Тук се различават.
 */
function kanonichnoStaro(s: ZaHeshirane): string {
  return JSON.stringify([
    s.seq,
    s.opId,
    s.ts,
    s.naematel,
    s.type,
    s.sashtnost.vid,
    s.sashtnost.id,
    podredi(s.payload),
    s.prevHash,
  ]);
}

function podredi(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(podredi);
  if (v !== null && typeof v === 'object') {
    const izhod: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      izhod[k] = podredi((v as Record<string, unknown>)[k]);
    }
    return izhod;
  }
  return v;
}

export async function izchisliHash(s: ZaHeshirane, sha: Sha256): Promise<string> {
  return sha(kanonichno(s));
}

interface RezultatOtProverka {
  readonly tsyala: boolean;
  /** seq на първото счупено звено; липсва, ако веригата е цяла */
  readonly parvoSchupeno?: number;
  /**
   * ЗАЩО се е счупило.
   *
   * `star-podpis` НЕ е повреда, а ДИАГНОЗА: звеното се проверява с подписа
   * отпреди `actor` да влезе в хеша. Веригата пак не е цяла — този файл не се
   * приема — но човекът научава КАКВО държи, вместо да гадае.
   */
  readonly prichina?: 'hash' | 'prevHash' | 'seq' | 'star-podpis';
  /** колко звена са минали проверката преди счупването */
  readonly proverni: number;
}

/**
 * Проверка на веригата за един наемател.
 * Събитията трябва да са подредени по seq, възходящо.
 */
export async function proveriVerigata(
  sabitiya: readonly Sabitie[],
  sha: Sha256,
): Promise<RezultatOtProverka> {
  let ochakvanPrevHash = '';
  let ochakvanSeq = 1;

  for (const s of sabitiya) {
    if (s.seq !== ochakvanSeq) {
      return { tsyala: false, parvoSchupeno: s.seq, prichina: 'seq', proverni: ochakvanSeq - 1 };
    }
    if (s.prevHash !== ochakvanPrevHash) {
      return { tsyala: false, parvoSchupeno: s.seq, prichina: 'prevHash', proverni: ochakvanSeq - 1 };
    }
    const presmetnat = await izchisliHash(bezHash(s), sha);
    if (presmetnat !== s.hash) {
      // Пипнат файл или файл отпреди смяната на подписа? Двете искат различни
      // думи към човека, затова се различават ТУК, а не се сливат в „не съвпада".
      const staro = await sha(kanonichnoStaro(bezHash(s)));
      return {
        tsyala: false,
        parvoSchupeno: s.seq,
        prichina: staro === s.hash ? 'star-podpis' : 'hash',
        proverni: ochakvanSeq - 1,
      };
    }
    ochakvanPrevHash = s.hash;
    ochakvanSeq += 1;
  }

  return { tsyala: true, proverni: sabitiya.length };
}

function bezHash(s: Sabitie): ZaHeshirane {
  return {
    seq: s.seq,
    opId: s.opId,
    ts: s.ts,
    naematel: s.naematel,
    actor: s.actor,
    type: s.type,
    sashtnost: s.sashtnost,
    payload: s.payload,
    prevHash: s.prevHash,
  };
}
