/**
 * КАРТАТА НА СЪГЛАСИЕТО · ЕДИН дом за трите ѝ употреби (правило 17).
 *
 * ═══ ЗАЩО СЕГА, А НЕ ПРИ ВТОРАТА ═══
 *
 * Първата беше при ИИ-таблото (ADR-029). Втората — поканата в календара
 * (ADR-064) — се обяви в шапката си за копие на първата, и това беше честно, но
 * все още евтино: две места, които могат да се разминат.
 *
 * Третата е връзката с НАП, и тя мени сметката. Три ръчно писани шаблона за
 * едно и също обещание значат, че поправка в едното („кутийката не е сложена
 * предварително") ще мине покрай другите две мълчаливо — а това обещание е
 * ЕДИНСТВЕНОТО, което човек чете, преди да пусне нещо навън.
 *
 * ═══ КАКВО Е ОБЩО И КАКВО НЕ ═══
 *
 * ОБЩА е формата: какво ще прави · какво НЯМА да прави · рисковете с думи ·
 * неотметната кутийка · два бутона. ОБЩО е и правилото, че кутийката НЕ е
 * сложена предварително (правило 13 по дух: нищо не се появява без изричен избор).
 *
 * СОБСТВЕНИ остават ДУМИТЕ. „Рискът" при агента е подхвърлен текст; при
 * календара — че поканата не дава достъп; при НАП — че отговорността за
 * подадена грешна декларация е на данъчно задълженото лице. Общ текст щеше да е
 * верен и безполезен.
 *
 * ═══ ЕДНО, КОЕТО НЕ Е ТУК ═══
 *
 * Картата НЕ проверява отметката и НЕ пише нищо. Тя е РАЗМЕТКА. Кой спира какво
 * при неотметната кутийка е решение на екрана: при агента се спира ЗАПИСЪТ
 * (`ii.ts`), при календара — ИЗХОДЯЩОТО ПОВИКВАНЕ, преди записа (`sluzhiteli.ts`).
 * Двете са различни и не бива да се сливат в общ помощник.
 */

import { ekraniraj } from './obshto.js';

export interface RedNaRiska {
  /** името на риска · две-три думи */
  readonly ime: string;
  /** какво значи · цяло изречение, не етикет */
  readonly kakvo: string;
}

export interface KartaSaglasie {
  /** ключът на секцията · за прохода и за подредбата */
  readonly sektsiya: string;
  /**
   * `id` на самата секция · ПО ИЗБОР.
   *
   * Стои, защото ИИ-таблото го има от резен И92 т.10 и проходът го чака поименно.
   * Общият дом не бива да го изпусне мълчаливо — това е точно видът промяна,
   * която минава typecheck и пада чак в браузър.
   */
  readonly id?: string;
  readonly zaglavie: string;
  readonly podnaslov: string;
  /** какво ЩЕ прави · едно изречение */
  readonly shte: string;
  /** какво НЯМА да прави · едно изречение */
  readonly nyama: string;
  readonly riskove: readonly RedNaRiska[];
  /** какво пише до кутийката */
  readonly otmetka: string;
  /** id на кутийката · всяко съгласие си има свое, за да не се бъркат в прохода */
  readonly idNaOtmetkata: string;
  /** двата бутона · id и дума */
  readonly potvardi: { readonly id: string; readonly duma: string };
  readonly otkazhi: { readonly id: string; readonly duma: string };
  /** по избор · допълнителен блок ПРЕДИ кутийката (например какво напуска) */
  readonly oshte?: string;
}

/**
 * Рисува картата. Кутийката НИКОГА не идва отметната — това е част от формата,
 * не избор на викащия, и затова тук няма поле за него.
 */
export function kartataNaSaglasieto(n: KartaSaglasie): string {
  return `
    <section data-sektsiya="${ekraniraj(n.sektsiya)}" class="karta izbrana" data-saglasie${
      n.id ? ` id="${ekraniraj(n.id)}"` : ''
    }>
      <div class="dyalglava">
        <h2>${ekraniraj(n.zaglavie)}</h2>
        <span>${ekraniraj(n.podnaslov)}</span>
      </div>
      <div class="tablitsa">
        <div class="red opis" translate="no"><span><b>Ще прави</b></span><span>${ekraniraj(n.shte)}</span></div>
        <div class="red opis" translate="no"><span><b>НЯМА да прави</b></span><span>${ekraniraj(n.nyama)}</span></div>
      </div>
      <div class="tablitsa">
        <div class="glava opis"><span>Рискът</span><span>какво значи</span></div>
        ${n.riskove
          .map(
            (r) => `<div class="red opis" translate="no">
          <span><b>${ekraniraj(r.ime)}</b></span>
          <span>${ekraniraj(r.kakvo)}</span>
        </div>`,
          )
          .join('')}
      </div>
      ${n.oshte ?? ''}
      <label class="vazm">
        <input type="checkbox" id="${ekraniraj(n.idNaOtmetkata)}">
        <span class="vazm-tyalo"><b>${ekraniraj(n.otmetka)}</b><span>отметката не е сложена предварително — изборът е изричен</span></span>
      </label>
      <div class="deystviya">
        <button type="button" class="glaven" id="${ekraniraj(n.potvardi.id)}">${ekraniraj(n.potvardi.duma)}</button>
        <button type="button" class="vtorichen" id="${ekraniraj(n.otkazhi.id)}">${ekraniraj(n.otkazhi.duma)}</button>
      </div>
    </section>`;
}
