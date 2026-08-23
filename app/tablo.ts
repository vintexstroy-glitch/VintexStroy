/**
 * ТАБЛОТО · кой съм · какъв е планът · какво е включено.
 *
 * Тук стои единственото място, където собственикът вижда СЕБЕ СИ в приложението
 * и решава какво да гледа. Неговите думи го определят изцяло:
 *
 *   „Ще има ЦЯЛАТА функционалност и ще се прилагат филтри на възможностите на
 *    ТАБЛОТО на този пълен потенциал… Най-добре индивидуално да се дава избор
 *    с ОТМЕТКИ на функционалностите."
 *
 * Затова екранът е точно три неща и нищо повече:
 *   1. КОЙ СЪМ — вход без парола, хранилище, вързани акаунти;
 *   2. ОТМЕТКИТЕ — включеното се вижда, изключеното изчезва СЕГА, не при
 *      следващо влизане;
 *   3. СРАВНЕНИЕТО — четирите плана един до друг, с честната колона „какво
 *      трябва да имаш при доставчика".
 *
 * Отметките живеят в localStorage, НЕ в Журнала. Това е нагласата на този
 * екран, не факт от историята — Журналът пази какво се е случило с парите,
 * а не кой бутон е бил скрит.
 */

import {
  IMENA_NA_DOSTAVCHITSITE,
  IMENA_NA_ROLITE,
  type Samolichnost,
} from '../src/yadro/samolichnost.js';
import {
  eIzklyuchena,
  type Izbor,
  izborPoPodrazbirane,
  mozhe,
  OPISANIE,
  OSHTE_NE_E_ZAPOCHNATO,
  plan,
  PLAN_PO_PODRAZBIRANE,
  PLANOVE,
  stigaLiHranilishteto,
  type Vazmozhnost,
  ZADALZHITELNI,
  prevklyuchi,
  smeniPlan,
} from '../src/domein/planove.js';
import { ekraniraj } from './imoti.js';

const KLYUCH = 'masterbook:izbor';

interface ZapisanIzbor {
  readonly plan: string;
  readonly vklyucheni: readonly string[];
}

/** Чете нагласата от този браузър; каквото не се разчита — пада към пълния план. */
export function chetiIzbor(): Izbor {
  try {
    const surovo = localStorage.getItem(KLYUCH);
    if (!surovo) return izborPoPodrazbirane();
    const zapis = JSON.parse(surovo) as ZapisanIzbor;
    const p = plan(zapis.plan);
    const vklyucheni = new Set<Vazmozhnost>();
    for (const v of zapis.vklyucheni ?? []) {
      if (p.vazmozhnosti.has(v as Vazmozhnost)) vklyucheni.add(v as Vazmozhnost);
    }
    for (const v of ZADALZHITELNI) if (p.vazmozhnosti.has(v)) vklyucheni.add(v);
    return { plan: p, vklyucheni };
  } catch {
    return izborPoPodrazbirane();
  }
}

export function zapishiIzbor(izbor: Izbor): void {
  try {
    const zapis: ZapisanIzbor = {
      plan: izbor.plan.klyuch,
      vklyucheni: [...izbor.vklyucheni],
    };
    localStorage.setItem(KLYUCH, JSON.stringify(zapis));
  } catch {
    // Частен прозорец: изборът важи за тази сесия и не се помни. Не е повреда.
  }
}

/** Редът, в който отметките се показват — както се ползват, не по азбука. */
const RED: readonly Vazmozhnost[] = [
  'zapis',
  'smetki-dds',
  'iztochnitsi',
  'ogledala',
  'fini-filtri',
  'arhiv-eksel',
  'iznos-vnos',
  'drugi-imeyli',
  'roli-za-dostap',
  'kolonno-pravo',
  'poveche-hranilishte',
  'individualni-razrabotki',
  'svarzhi-ii',
];

function kartaKoySam(koj: Samolichnost): string {
  const vrazki = koj.svarzani.length
    ? koj.svarzani.map((d) => IMENA_NA_DOSTAVCHITSITE[d]).join(' · ')
    : 'няма вързани';

  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Кой съм</h2>
        <span>вход без парола · самоличността идва отвън</span>
      </div>
      <div class="plochki">
        <div class="plochka">
          <div class="etiket">Влязъл като</div>
          <div class="chislo malak" translate="no">${ekraniraj(koj.ime)}</div>
          <div class="pod">${ekraniraj(koj.imeyl)}</div>
        </div>
        <div class="plochka">
          <div class="etiket">През</div>
          <div class="chislo malak" translate="no">${IMENA_NA_DOSTAVCHITSITE[koj.dostavchik]}</div>
          <div class="pod">${
            koj.nachin === 'klyuch' ? 'с ключ на тази машина' : 'през доставчика'
          }</div>
        </div>
        <div class="plochka">
          <div class="etiket">Хранилище</div>
          <div class="chislo malak" translate="no">${koj.hranilishte === 'платено' ? 'Платено' : 'Безплатно'}</div>
          <div class="pod">при ${IMENA_NA_DOSTAVCHITSITE[koj.dostavchik]}, не при нас</div>
        </div>
        <div class="plochka">
          <div class="etiket">Роля</div>
          <div class="chislo malak" translate="no">${IMENA_NA_ROLITE[koj.rolya]}</div>
          <div class="pod">вързани акаунти: ${ekraniraj(vrazki)}</div>
        </div>
      </div>
      <p class="drebno">
        Приложението никога не вижда парола — няма своя, няма възстановяване,
        няма какво да изтече. Достъпът на други имейли минава през твоя
        доставчик: поканата, защитата и отнемането са негови, не наши.
      </p>
    </section>`;
}

function redNaOtmetka(izbor: Izbor, v: Vazmozhnost): string {
  const ima = izbor.plan.vazmozhnosti.has(v);
  const vklyuchena = mozhe(izbor, v);
  const zadalzhitelna = ZADALZHITELNI.has(v);
  const skoro = OSHTE_NE_E_ZAPOCHNATO.has(v);

  const znachka = !ima
    ? '<span class="znachka tiha">няма я в този план</span>'
    : skoro
      ? '<span class="znachka tiha">скоро · отделен проект</span>'
      : zadalzhitelna
        ? '<span class="znachka tiha">основата</span>'
        : vklyuchena
          ? '<span class="znachka dobre">включена</span>'
          : '<span class="znachka tiha">изключена</span>';

  return `
    <label class="vazm${ima ? '' : ' nyama'}">
      <input type="checkbox" data-vazmozhnost="${v}"
        ${vklyuchena ? 'checked' : ''}
        ${!ima || zadalzhitelna ? 'disabled' : ''}>
      <span class="vazm-tyalo">
        <b>${ekraniraj(OPISANIE[v].split('.')[0] ?? v)}</b>
        <span>${ekraniraj(OPISANIE[v])}</span>
      </span>
      ${znachka}
    </label>`;
}

function kartaOtmetki(izbor: Izbor): string {
  const izklyucheni = RED.filter((v) => eIzklyuchena(izbor, v)).length;

  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Възможности</h2>
        <span>${
          izklyucheni === 0
            ? 'всичко от плана е включено'
            : `${izklyucheni} ${izklyucheni === 1 ? 'изключена' : 'изключени'} — планът пак ги дава`
        }</span>
      </div>
      <div class="vazmozhnosti">${RED.map((v) => redNaOtmetka(izbor, v)).join('')}</div>
      <p class="drebno">
        Изключената възможност изчезва от лентата и от бутоните веднага. Тя не е
        отнета — планът пак я дава и отметката я връща. Затова „изключена" и
        „няма я в този план" са различни думи тук.
      </p>
    </section>`;
}

function kartaSravnenie(izbor: Izbor, koj: Samolichnost): string {
  const redove = PLANOVE.map((p) => {
    const tuk = p.klyuch === izbor.plan.klyuch;
    const stiga = stigaLiHranilishteto(p, koj.hranilishte);
    const broi = p.vazmozhnosti.size;

    return `
      <div class="red planred${tuk ? ' tuk' : ''}" data-plan-red="${p.klyuch}">
        <div class="kletka">
          <b>${ekraniraj(p.ime)}${tuk ? ' · сега' : ''}</b>
          <span>${ekraniraj(p.zaKogo)}</span>
        </div>
        <div class="kletka">
          <b>${broi} ${broi === 1 ? 'възможност' : 'възможности'}</b>
          <span>${
            p.klyuch === PLAN_PO_PODRAZBIRANE ? 'ЦЯЛАТА функционалност' : 'от таблицата на плана'
          }</span>
        </div>
        <div class="kletka">
          <b>${p.iskaPlatenOblak ? 'платен план' : 'безплатен акаунт'}</b>
          <span>${
            p.iskaPlatenOblak
              ? 'при Google, Microsoft или Apple'
              : 'Gmail, Microsoft или Apple — без плащане'
          }</span>
        </div>
        <div class="butoni">
          ${
            tuk
              ? '<span class="znachka dobre">избран</span>'
              : stiga
                ? `<button type="button" class="vtorichen malak" data-plan="${p.klyuch}">Избери</button>`
                : '<span class="znachka tiha">иска платено хранилище</span>'
          }
        </div>
      </div>`;
  }).join('');

  return `
    <section class="karta">
      <div class="dyalglava">
        <h2>Плановете</h2>
        <span>нагоре расте КАПАЦИТЕТЪТ, не функциите</span>
      </div>
      <div class="tablitsa">
        <div class="glava planred">
          <div>План</div><div>Функционалност</div><div>Какво трябва при доставчика</div><div></div>
        </div>
        ${redove}
      </div>
      <p class="drebno">
        Мащабът се плаща на доставчика на хранилището, не на нас. Стартъпът е
        <b>Професионален · онлайн</b> и носи цялата функционалност; място и
        сигурност се купуват от Google, Microsoft или Apple, а поръчковата работа
        е по договор. ИИ ще е добавка с цена, която се СВЪРЗВА — не вградена;
        това е отделен проект и още не е започнал.
      </p>
    </section>`;
}

export function narisuvayTablo(koj: Samolichnost, izbor: Izbor): string {
  return kartaKoySam(koj) + kartaOtmetki(izbor) + kartaSravnenie(izbor, koj);
}

/**
 * Закача таблото. Всяка промяна се записва и екранът се прерисува веднага —
 * иначе отметката е обещание, а не действие.
 */
export function zakachiTablo(
  koren: ParentNode,
  vzemi: () => Izbor,
  sloji: (izbor: Izbor) => void,
  prerisuvay: () => Promise<void>,
): void {
  for (const kutiya of koren.querySelectorAll<HTMLInputElement>('[data-vazmozhnost]')) {
    kutiya.addEventListener('change', async () => {
      const v = kutiya.dataset['vazmozhnost'] as Vazmozhnost;
      const nov = prevklyuchi(vzemi(), v, kutiya.checked);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-plan]')) {
    b.addEventListener('click', async () => {
      const nov = smeniPlan(vzemi(), b.dataset['plan']!);
      zapishiIzbor(nov);
      sloji(nov);
      await prerisuvay();
    });
  }
}
