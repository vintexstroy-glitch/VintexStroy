/**
 * КАЛЕНДАРЪТ · месечната мрежа с цифрите (резен 40 · M11 · И90 · ADR-100).
 *
 * „Както и **всички приходи и разходи са с цифри в полето на календара**."
 * *(И90 · 23.08)*
 *
 * СТОИ В СМЕТКИ, под таблицата на месеца, и ползва СЪЩИЯ месец: „кой месец
 * гледам" има ЕДИН дом — формата „Период" горе (правило 17). Свой избор на
 * месец тук би дал два месеца на един екран, които се разминават.
 *
 * НЕ РИСУВА ДЕЛА. Календарът е за ПАРИ; сроковете на делата живеят в решетката
 * на Ганта, която има свой такт и свои ленти. Слети, единият изглед би трябвало
 * да покаже ден с три дела и две плащания в една клетка — и нито едното от
 * двете нямаше да се чете.
 */

import { mrezhataNa, sveriMrezhata, DNITE_NA_SEDMITSATA } from '../src/domein/mesechna-mrezha.js';
import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';

export function narisuvayKalendara(o: Ogledalo, mesets: string, dnes: string): string {
  const m = mrezhataNa(o, mesets);
  const sv = sveriMrezhata(o, mesets, dnes);

  return `
    <section data-sektsiya="smetki-kalendar">
      <div class="dyalglava">
        <h2>Календарът</h2>
        <span>всички приходи и разходи, с цифри в полето на деня</span>
      </div>

      <div class="kalendar" data-kalendar="${ekraniraj(mesets)}" data-dni-s-pari="${m.dniSPari}">
        <div class="kalendar-glava">
          ${DNITE_NA_SEDMITSATA.map((d) => `<span>${d}</span>`).join('')}
        </div>
        ${m.sedmitsi
          .map(
            (sedmitsa) => `<div class="kalendar-sedmitsa">${sedmitsa
              .map((k) =>
                k.svoy
                  ? `<div class="kalendar-den${k.data === dnes ? ' dnes' : ''}${
                      k.prihod_st || k.razhod_st ? ' s-pari' : ''
                    }" data-den="${ekraniraj(k.data)}">
                      <span class="kalendar-chislo" translate="no">${k.den}</span>
                      ${
                        k.prihod_st || k.razhod_st
                          ? `<span class="kalendar-pari">
                              <b translate="no">${pishi(k.prihod_st)}</b>
                              <i translate="no">${pishi(k.razhod_st)}</i>
                            </span>`
                          : ''
                      }
                    </div>`
                  : // ЧУЖДИЯТ ДЕН държи решетката и нищо друго: с числа окото го
                    // събира с месеца и получава сбор, различен от онзи отдолу.
                    `<div class="kalendar-den chuzhd" data-den="${ekraniraj(k.data)}" data-chuzhd>
                      <span class="kalendar-chislo" translate="no">${k.den}</span>
                    </div>`,
              )
              .join('')}</div>`,
          )
          .join('')}
      </div>

      <div class="kalendar-sbor">
        <span>Месецът:</span>
        <b translate="no" data-kalendar-prihod="${m.prihod_st}">${pishi(m.prihod_st)}</b>
        <i translate="no" data-kalendar-razhod="${m.razhod_st}">${pishi(m.razhod_st)}</i>
        <span class="drebno">${m.dniSPari} ${m.dniSPari === 1 ? 'ден носи' : 'дни носят'} движение</span>
      </div>

      <p class="drebno">Двете числа НЕ се сливат в едно: ден с 1 000 приход и 1 000 разход
      не е празен ден, а неттото би го направило такъв. Приходът е СЪБРАНОТО — календарът е
      за дни, а начислението няма ден, то има падеж.</p>

      <p class="drebno">Дните от съседните месеци стоят СИВИ и без числа — те държат
      решетката права, за да не се измести денят от седмицата, и не влизат в сбора.</p>

      <p class="drebno" data-kalendar-sverka>Сверка вход↔изход: ${pishi(sv.vhod)} по дните →
      ${pishi(sv.izhod)} в клетките, разлика ${pishi(sv.razlika)}.</p>
    </section>`;
}
