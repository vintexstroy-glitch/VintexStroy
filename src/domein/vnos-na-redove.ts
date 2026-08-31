/**
 * ВНОСЪТ НА РЕДОВЕТЕ · целият файл влиза, не само главата (резен 61).
 *
 * Дотук от качен файл влизаше МОДЕЛЪТ на главата, а редовете се въвеждаха на
 * ръка. Неговият файл носи 156 реда на три листа — въвеждане на ръка не е
 * работа, а наказание.
 *
 * ═══ КЛЮЧЪТ НА РЕДА ИДВА ОТ ПЪРВАТА ТЕКСТОВА КОЛОНА ═══
 *
 * В неговия лист това е „апартамент № 3". Ред без такава стойност НЕ се
 * измисля с пореден номер: в тези таблици редовете БЕЗ име са СБОРНИ — между
 * данните стоят суми. Номериран автоматично, сборът щеше да влезе като продажба
 * и да удвои всичко.
 *
 * Затова редът без ключ се ПРОПУСКА и се КАЗВА защо. Пропуснатото, което никой
 * не преброява, е загубено мълчаливо.
 *
 * ═══ ПАРИТЕ СЕ ЧЕТАТ ПРЕЗ ЧЕТЕЦА НА СУМИ ═══
 *
 * Не `Number(x) * 100`: то дава 12.340000000000002. Четецът връща ЦЕЛИ
 * стотинки и знае и запетаята, и точката, и интервалите за хиляди.
 *
 * ═══ СВЕРКАТА ═══
 *
 * прочетени = записани + пропуснати, и разликата се записва дори когато е нула
 * (правило 7). Двете страни се броят по РАЗЛИЧЕН път: лявата от таблицата,
 * дясната от двата списъка.
 */

import { otSuma } from '../yadro/pari.js';
import { otStotni } from './formuli.js';
import { vidaNaKolonata, zatvorenaE } from './redove-na-tablitsa.js';
import type { PayloadRedNaTablitsaZapisan, PayloadTablitsaOtFaylSazdadena } from './sabitiya.js';
import type { Tablitsa } from '../iztochnik/tablitsa.js';

/** Един пропуснат ред · номерът му във файла и ПРИЧИНАТА, с думи. */
export interface Propusnat {
  /** номерът, както го вижда човек в Excel (от 1) */
  readonly red: number;
  readonly zashto: string;
}

export interface PodgotvenVnos {
  readonly redove: readonly PayloadRedNaTablitsaZapisan[];
  readonly propusnati: readonly Propusnat[];
  readonly sverka: {
    readonly procheteni: number;
    readonly zapisani: number;
    readonly propusnati: number;
    readonly razlika: number;
  };
}

/** Коя колона дава ключа · първата ТЕКСТОВА в главата. */
export function kolonataNaKlyucha(glavata: PayloadTablitsaOtFaylSazdadena): number {
  for (let i = 0; i < glavata.glavi.length; i += 1) {
    if (vidaNaKolonata(glavata, String(i)) === 'tekst') return i;
  }
  return 0;
}

/**
 * ПОДГОТВЯ реда за писане · нищо не се записва тук (правило 18).
 *
 * `otRed` е първият ред С ДАННИ — главата и заглавието над нея не се внасят.
 */
export function podgotviVnos(
  t: Tablitsa,
  glavata: PayloadTablitsaOtFaylSazdadena,
  otRed: number,
): PodgotvenVnos {
  const redove: PayloadRedNaTablitsaZapisan[] = [];
  const propusnati: Propusnat[] = [];
  const klyuchova = kolonataNaKlyucha(glavata);
  const vidyani = new Set<string>();
  let procheteni = 0;

  for (let i = otRed; i < t.redove.length; i += 1) {
    const red = t.redove[i]!;
    if (red.every((k) => k.trim() === '')) continue;
    procheteni += 1;

    const klyuch = (red[klyuchova] ?? '').trim();
    if (klyuch === '') {
      propusnati.push({
        red: i + 1,
        zashto: `няма стойност в „${glavata.glavi[klyuchova] ?? '?'}" — такъв ред е СБОРЕН, не запис`,
      });
      continue;
    }
    if (vidyani.has(klyuch)) {
      propusnati.push({ red: i + 1, zashto: `повторен ключ „${klyuch}" — вторият не се записва` });
      continue;
    }

    const pari_st: Record<string, number> = {};
    const chisla: Record<string, number> = {};
    const tekst: Record<string, string> = {};
    let greshka = '';

    for (let k = 0; k < glavata.glavi.length && greshka === ''; k += 1) {
      const kolona = String(k);
      if (zatvorenaE(glavata, kolona)) continue;
      const surovo = (red[k] ?? '').trim();
      if (surovo === '') continue;
      const vid = vidaNaKolonata(glavata, kolona);
      if (vid === 'evro') {
        try {
          pari_st[kolona] = otSuma(surovo);
        } catch {
          greshka = `„${glavata.glavi[k]}" носи „${surovo}", което не е сума`;
        }
      } else if (vid === 'protsent' || vid === 'chislo') {
        // ЧЕТЕ СЕ С ЧЕТЕЦА НА ЧИСЛА, не с голо `Number`: колоната с проценти
        // носи знака „%" в клетките си, а „20%" не е число за `Number`. Първата
        // ми проба падна точно тук — целият лист се пропускаше заради знак.
        try {
          chisla[kolona] = otStotni(surovo) / 100;
        } catch {
          greshka = `„${glavata.glavi[k]}" носи „${surovo}", което не е число`;
        }
      } else {
        tekst[kolona] = surovo;
      }
    }

    if (greshka !== '') {
      propusnati.push({ red: i + 1, zashto: greshka });
      continue;
    }

    vidyani.add(klyuch);
    redove.push({ tablitsa: glavata.klyuch, red: klyuch, pari_st, chisla, tekst, mahnat: false });
  }

  return {
    redove,
    propusnati,
    sverka: {
      procheteni,
      zapisani: redove.length,
      propusnati: propusnati.length,
      razlika: procheteni - redove.length - propusnati.length,
    },
  };
}
