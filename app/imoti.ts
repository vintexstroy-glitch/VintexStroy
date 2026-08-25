/**
 * Екран „Имоти" — тук собственикът пише истинските данни.
 *
 * Формите пишат през ВРАТАТА, не в Журнала. Списъкът се чете от ОГЛЕДАЛОТО,
 * което се преизчислява от Журнала при всяко показване — нищо не се кешира.
 *
 * Поправката НЕ е презапис: сгрешен адрес или име ражда ново събитие
 * („ИмотПоправен“, „НаемПоправен“), а сгрешен запис се маха със сторно —
 * и то само когато вратарят пусне (`src/domein/storno.ts`).
 */

import { otLeva, pishi, pishiVPole } from '../src/yadro/pari.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { dnesKato, ekraniraj } from './obshto.js';
import { otData } from '../src/yadro/data.js';
import { akumulator, sektoriNaNaem } from '../src/domein/dds.js';
import type { Imot, Naem, Ogledalo } from '../src/ogledalo/ogledalo.js';
import { zakachiStornoButoni } from './storno.js';
import { poImot } from '../src/ogledalo/izgledi.js';
import { PRAZEN_FILTAR, filtriray, glaviNaTablitsata, grupiranaTablitsa, poleZaTarsene, redZaSkritoto, type KolonaSFiltar } from './filtri.js';
import { butonIstoriya } from './istoriya.js';
import { kvSmVM2, ploshtVKvSm } from '../src/kalkulator/chetene.js';
import {
  menyuOtZhivi,
  novoteVSpisatsite,
  poleSIzbor,
  poleSMenyu,
  rechnitsite,
  sDumiZaNovite,
  zakachiMenyuta,
  zapomniRechnitsite,
} from './menyu.js';
import type { Menyu } from '../src/domein/padashti-menyuta.js';
import type { Konteks } from './ekranite.js';

/** Ключът на речниците на този екран · формата на наема е една. */
const RECHNIK_NAEM = 'naem';

/**
 * РЕЧНИКЪТ НА НАЕМАТЕЛИТЕ · изведен от живите наеми, без ново събитие.
 *
 * Прекратените наеми ВЛИЗАТ нарочно: същият наемател често се връща, а името
 * му не престава да съществува, когато договорът свърши (правило 1, приложено
 * към речника — старото не се трие).
 */
function menyutoNaNaemite(o: Ogledalo): Menyu {
  return menyuOtZhivi(
    'naemetel',
    'Наемател',
    [...o.naemi.values()].map((n) => n.naemetel),
  );
}

export interface SastoyanieNaEkrana {
  readonly ogledalo: Ogledalo;
  readonly sabitiya: number;
}

/** Какво прави екранът в момента. Едно състояние, не три флага. */
type Rezhim =
  | { kakvo: 'nov' }
  | { kakvo: 'popravi-imot'; id: string }
  | { kakvo: 'popravi-naem'; id: string }
  | { kakvo: 'prekrati'; id: string };

let rezhim: Rezhim = { kakvo: 'nov' };

/** opId живее, докато формата стои отворена — двойно натискане дава един запис. */
let opIdImot = novOpId();
let opIdNaem = novOpId();
let opIdDeystvie = novOpId();

function novOpId(): string {
  return crypto.randomUUID();
}

/** Колоните на таблицата „Имоти" — фините филтри важат и тук (вълна 2).
 *  Картата е с ЖИВИТЕ наеми, сметната веднъж — `vzemi` се вика от търсене,
 *  подредба и групиране, и филтриране на всяко повикване би било разточително. */
function koloniNaImotite(zhiviPoImot: ReadonlyMap<string, Naem[]>): KolonaSFiltar<Imot>[] {
  const zhiviNa = (i: Imot) => zhiviPoImot.get(i.id) ?? [];
  return [
    { klyuch: 'myasto', ime: 'Място и единица', vid: 'tekst', vzemi: (i) => `${i.adres} · ${i.edinitsa}` },
    {
      klyuch: 'naematel',
      ime: 'Наемател',
      vid: 'tekst',
      vzemi: (i) => zhiviNa(i).map((n) => n.naemetel).join(', '),
    },
    // площта пътува като „72,4" — сравнителят чете българския запис
    { klyuch: 'ploshtad', ime: 'Площ', vid: 'chislo', vzemi: (i) => (i.ploshtad_kvsm > 0 ? kvSmVM2(i.ploshtad_kvsm) : '') },
    { klyuch: 'naem', ime: 'Наем / мес.', vid: 'evro', vzemi: (i) => zhiviNa(i).reduce((s, n) => s + n.naem_st, 0) },
    {
      klyuch: 'sastoyanie',
      ime: 'Състояние',
      vid: 'tekst',
      vzemi: (i) => {
        const broy = zhiviNa(i).length;
        return broy > 1 ? `${broy} наема` : broy === 1 ? 'отдаден' : 'свободен';
      },
    },
  ];
}

/** Колоните на таблицата „Наеми" — за фините филтри в стил Уиндоус. */
function koloniNaNaemite(o: Ogledalo): KolonaSFiltar<Naem>[] {
  return [
    { klyuch: 'koy', ime: 'Наемател', vid: 'tekst', vzemi: (n) => n.naemetel },
    {
      klyuch: 'imot',
      ime: 'Имот',
      vid: 'tekst',
      vzemi: (n) => {
        const i = o.imoti.get(n.imotId);
        return i ? `${i.adres} · ${i.edinitsa}` : n.imotId;
      },
    },
    // в клетката на името са, не в своя колона — търсят се, не се рисуват
    { klyuch: 'telefon', ime: 'Телефон', vid: 'tekst', vzemi: (n) => n.telefon, samoZaTarsene: true },
    { klyuch: 'imeyl', ime: 'Имейл', vid: 'tekst', vzemi: (n) => n.imeyl, samoZaTarsene: true },
    { klyuch: 'sektor', ime: 'Сектор', vid: 'tekst', vzemi: (n) => akumulator(n.sektor).sektor },
    { klyuch: 'naem', ime: 'Наем / мес.', vid: 'evro', vzemi: (n) => n.naem_st },
    {
      klyuch: 'sastoyanie',
      ime: 'Състояние',
      vid: 'tekst',
      vzemi: (n) => (n.prekraten ? 'прекратен' : 'жив'),
    },
  ];
}

export function narisuvayImoti(sastoyanie: SastoyanieNaEkrana): string {
  const { ogledalo } = sastoyanie;
  const imoti = [...ogledalo.imoti.values()];
  const naemi = [...ogledalo.naemi.values()].sort(
    (a, b) => Number(a.prekraten) - Number(b.prekraten) || a.naemetel.localeCompare(b.naemetel),
  );
  // Речникът се пълни при РИСУВАНЕ (тук е Огледалото) и се чете при ЗАКАЧАНЕ
  // (там е DOM-ът) — двете не могат да се слеят (ADR-040).
  zapomniRechnitsite(RECHNIK_NAEM, new Map([['naemetel', menyutoNaNaemite(ogledalo)]]));
  const naemiPoImot = new Map<string, Naem[]>();
  for (const naem of naemi) {
    const spisak = naemiPoImot.get(naem.imotId) ?? [];
    spisak.push(naem);
    naemiPoImot.set(naem.imotId, spisak);
  }

  const zhivi = naemi.filter((n) => !n.prekraten);
  const mesechno = zhivi.reduce((sbor, n) => sbor + n.naem_st, 0);
  const zaeti = new Set(zhivi.map((n) => n.imotId));

  // веднъж на рисуване — не по три пъти по-надолу в шаблона
  const dnes = dnesKato();
  const koloniNaemi = koloniNaNaemite(ogledalo);
  const zhiviPoImot = new Map<string, Naem[]>();
  for (const [id, spisak] of naemiPoImot) {
    zhiviPoImot.set(id, spisak.filter((n) => !n.prekraten));
  }
  const koloniImoti = koloniNaImotite(zhiviPoImot);
  const filtriraniNaemi = filtriray('naemi', naemi, koloniNaemi, dnes);
  const filtriraniImoti = filtriray('imoti', imoti, koloniImoti, dnes);

  const popravyanImot = rezhim.kakvo === 'popravi-imot' ? ogledalo.imoti.get(rezhim.id) : undefined;
  const popravyanNaem = rezhim.kakvo === 'popravi-naem' ? ogledalo.naemi.get(rezhim.id) : undefined;
  const prekratyavan = rezhim.kakvo === 'prekrati' ? ogledalo.naemi.get(rezhim.id) : undefined;

  return `
    <div class="plochki">
      <div class="plochka">
        <span class="etiket">Единици</span>
        <span class="chislo" translate="no">${imoti.length}</span>
        <span class="pod">въведени от теб</span>
      </div>
      <div class="plochka">
        <span class="etiket">Отдадени</span>
        <span class="chislo" translate="no">${zaeti.size} / ${imoti.length}</span>
        <span class="pod">${imoti.length - zaeti.size} без наем</span>
      </div>
      <div class="plochka">
        <span class="etiket">Месечен наем</span>
        <span class="chislo" translate="no">${pishi(mesechno)}</span>
        <span class="pod">начислено · €</span>
      </div>
      <div class="plochka">
        <span class="etiket">Събития</span>
        <span class="chislo" translate="no">${sastoyanie.sabitiya}</span>
        <span class="pod">в Журнала</span>
      </div>
    </div>

    ${prekratyavan ? formaPrekratyavane(prekratyavan) : ''}

    <section class="karta${popravyanImot ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>${popravyanImot ? 'Поправи имота' : 'Нов имот'}</h2>
        <span>${
          popravyanImot
            ? 'поправката е ново събитие — старото описание остава в Журнала'
            : 'адресът и единицата правят реда разпознаваем'
        }</span>
      </div>
      <form id="forma-imot">
        <div class="poleta">
          <div class="pole">
            <label for="imot-adres">Място или адрес</label>
            <input translate="no" id="imot-adres" name="adres" required placeholder="напр. Малинова" autocomplete="off"
                   value="${popravyanImot ? ekraniraj(popravyanImot.adres) : ''}">
          </div>
          <div class="pole">
            <label for="imot-edinitsa">Единица</label>
            <input translate="no" id="imot-edinitsa" name="edinitsa" required placeholder="напр. АП. № 1" autocomplete="off"
                   value="${popravyanImot ? ekraniraj(popravyanImot.edinitsa) : ''}">
          </div>
          <div class="pole">
            <label for="imot-ploshtad">Площ в м² (по избор)</label>
            <input translate="no" id="imot-ploshtad" name="ploshtad" inputmode="decimal" placeholder="72,40" autocomplete="off"
                   value="${popravyanImot && popravyanImot.ploshtad_kvsm > 0 ? kvSmVM2(popravyanImot.ploshtad_kvsm) : ''}">
          </div>
          ${popravyanImot ? polePrichina('imot') : ''}
        </div>
        <p class="greshka" id="greshka-imot"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">${popravyanImot ? 'Запиши поправката' : 'Запиши имота'}</button>
          ${popravyanImot ? '<button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>' : ''}
          <p class="drebno">${
            popravyanImot
              ? 'Записва се като събитие <b>ИмотПоправен</b>. Старото не се трие — просто вече не е последната дума.'
              : 'Записва се като събитие <b>ИмотДобавен</b>. Поправка после = ново събитие, не изтриване.'
          }</p>
        </div>
      </form>
    </section>

    <section class="karta${popravyanNaem ? ' izbrana' : ''}">
      <div class="dyalglava">
        <h2>${popravyanNaem ? 'Поправи наема' : 'Нов наем'}</h2>
        <span>${
          popravyanNaem
            ? 'новата сума важи за БЪДЕЩИТЕ начисления — вече начисленото не мърда'
            : 'парите се въвеждат в евро и се пазят в цели най-малки единици'
        }</span>
      </div>
      ${
        imoti.length === 0
          ? '<p class="drebno">Първо въведи имот — наемът виси на него.</p>'
          : `<form id="forma-naem">
        <div class="poleta">
          <div class="pole">
            <label for="naem-imot">Имот</label>
            <select translate="no" id="naem-imot" name="imotId" required ${popravyanNaem ? 'disabled' : ''}>
              ${imoti
                .map(
                  (i) =>
                    `<option value="${ekraniraj(i.id)}"${
                      popravyanNaem?.imotId === i.id ? ' selected' : ''
                    }>${ekraniraj(opisi(i))}</option>`,
                )
                .join('')}
            </select>
          </div>
          ${
            /**
             * НАЕМАТЕЛЯТ · живо меню от Журнала (ADR-042).
             *
             * Дотук беше голо текстово поле — тоест речник НЯМАШЕ, а човекът
             * пишеше едно и също име по петдесет пъти. „Петров ЕООД" и
             * „ПЕТРОВ еоод" ставаха двама наематели, които после не се събират
             * в нито един изглед — и това не се вижда, докато някой не потърси.
             *
             * Менюто ОПИСВА (системата не смята върху името), значи расте
             * свободно от полето: „нищо не спира човека".
             */
            poleSMenyu({
              id: 'naem-naemetel',
              ime: 'naemetel',
              etiket: 'Наемател',
              menyu: menyutoNaNaemite(ogledalo),
              stoynost: popravyanNaem ? popravyanNaem.naemetel : '',
              zadalzhitelno: true,
              mestodarzhatel: 'име или дружество',
            })
          }
          <div class="pole">
            <label for="naem-telefon">Телефон (по избор)</label>
            <input translate="no" id="naem-telefon" name="telefon" placeholder="0888 123 456" autocomplete="off"
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.telefon) : ''}">
          </div>
          <div class="pole">
            <label for="naem-imeyl">Имейл (по избор)</label>
            <input translate="no" id="naem-imeyl" name="imeyl" type="email" placeholder="ime@primer.bg" autocomplete="off"
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.imeyl) : ''}">
          </div>
          <div class="pole">
            <label for="naem-suma">Наем на месец, € — с ДДС</label>
            <input translate="no" id="naem-suma" name="naem" required inputmode="decimal" placeholder="1150,00" autocomplete="off"
                   value="${popravyanNaem ? pishiVPole(popravyanNaem.naem_st) : ''}">
          </div>
          ${poleSIzbor({
            id: 'naem-sektor',
            ime: 'sektor',
            etiket: 'Сектор — определя ставката',
            spisak: 'sektor',
            zadalzhitelno: true,
            opcii: sektoriNaNaem()
              .map(
                (a) =>
                  `<option value="${ekraniraj(a.klyuch)}"${
                    popravyanNaem?.sektor === a.klyuch ? ' selected' : ''
                  }>${ekraniraj(a.sektor)} · ${a.stavka}%</option>`,
              )
              .join(''),
          })}
          <div class="pole">
            <label for="naem-depozit">Депозит, € (по избор)</label>
            <input translate="no" id="naem-depozit" name="depozit" inputmode="decimal" placeholder="1150,00" autocomplete="off"
                   value="${popravyanNaem && popravyanNaem.depozit_st > 0 ? pishiVPole(popravyanNaem.depozit_st) : ''}">
          </div>
          <div class="pole">
            <label for="naem-padezh">Падеж — ден от месеца</label>
            <input translate="no" id="naem-padezh" name="padezhDen" type="number" min="1" max="31" required
                   value="${popravyanNaem ? popravyanNaem.padezhDen : 1}">
          </div>
          <div class="pole">
            <label for="naem-ot">Договор от</label>
            <input translate="no" id="naem-ot" name="ot" type="date" required
                   value="${popravyanNaem ? ekraniraj(popravyanNaem.ot.slice(0, 10)) : dnes}">
          </div>
          ${popravyanNaem ? polePrichina('naem') : ''}
        </div>
        <p class="greshka" id="greshka-naem"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">${popravyanNaem ? 'Запиши поправката' : 'Запиши наема'}</button>
          ${popravyanNaem ? '<button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>' : ''}
          <p class="drebno">1150,50 € става 115050 най-малки единици. Никакъв float — иначе центовете се разминават в ДДС.<br>Сумата е <b>обща цена с ДДС</b>; ДДС-то се изважда на отделен ред в „Сметки", не се прибавя тук.</p>
        </div>
      </form>`
      }
    </section>

    <section>
      <div class="dyalglava"><h2>Имоти</h2><span>${imoti.length} ${imoti.length === 1 ? 'единица' : 'единици'}</span></div>
      ${imoti.length ? poleZaTarsene('imoti') : ''}
      <div class="tablitsa" data-tablitsa="imoti">
        <div class="glava imot">
          ${glaviNaTablitsata('imoti', koloniImoti, imoti, dnes)}<span></span>
        </div>
        ${
          imoti.length === 0
            ? `<p class="prazno">Още няма нито един имот.<br>Въведи първия горе — той влиза в Журнала като събитие и остава там завинаги.</p>`
            : filtriraniImoti.redove.length === 0
              ? PRAZEN_FILTAR
              : grupiranaTablitsa('imoti', filtriraniImoti.redove, koloniImoti, dnes, (i) => redImot(i, naemiPoImot.get(i.id) ?? []))
        }
      </div>
      ${redZaSkritoto(filtriraniImoti, 'imoti')}
    </section>

    ${
      naemi.length === 0
        ? ''
        : `<section>
      <div class="dyalglava">
        <h2>Наеми</h2>
        <span>${zhivi.length} ${zhivi.length === 1 ? 'жив' : 'живи'}${
          naemi.length - zhivi.length ? ` · ${naemi.length - zhivi.length} прекратени` : ''
        }</span>
      </div>
      ${poleZaTarsene('naemi')}
      <div class="tablitsa" data-tablitsa="naemi">
        <div class="glava naem">
          ${glaviNaTablitsata('naemi', koloniNaemi, naemi, dnes)}<span></span>
        </div>
        ${
          filtriraniNaemi.redove.length === 0
            ? PRAZEN_FILTAR
            : grupiranaTablitsa('naemi', filtriraniNaemi.redove, koloniNaemi, dnes, (n) => redNaem(n, ogledalo))
        }
      </div>
      ${redZaSkritoto(filtriraniNaemi, 'naemi')}
    </section>`
    }
    ${sektsiyaPoImot(ogledalo)}
  `;
}

/**
 * ОЩЕ ЕДНО ОГЛЕДАЛО · „кой обект колко носи и колко яде" (възможност `ogledala`).
 *
 * `src/ogledalo/izgledi.ts` беше построен в резен 9 и оттогава го викаха само
 * тестовете — възможността „Изгледи по имот и по контрагент" стоеше в Таблото
 * с отметка, която не пипаше нищо. Отметка без последица е НАДПИС, а правило 15
 * иска обратното: „изключено ≠ липсващо".
 *
 * Изгледът е ЧИСТА ФУНКЦИЯ върху Огледалото — нула ново състояние, нула нови
 * събития. Истината е една (Журналът); ъглите към нея са колкото трябват.
 */
function sektsiyaPoImot(o: Ogledalo): string {
  const redove = poImot(o);
  if (redove.length === 0) return '';
  const sbor = redove.reduce(
    (s, r) => ({
      nachisleno: s.nachisleno + r.nachisleno_st,
      sabrano: s.sabrano + r.sabrano_st,
      duljimo: s.duljimo + r.duljimo_st,
    }),
    { nachisleno: 0, sabrano: 0, duljimo: 0 },
  );
  return `
    <section data-sektsiya="po-imot">
      <div class="dyalglava">
        <h2>По обект</h2>
        <span>кой носи и кой дължи · смята се от Журнала, не се пази</span>
      </div>
      <div class="tablitsa" data-tablitsa="po-imot">
        <div class="glava po-imot">
          <span>Обект</span><span>Живи наеми</span><span>Начислено</span><span>Събрано</span><span>Дължимо</span>
        </div>
        ${redove
          .map(
            (r) => `<div class="red po-imot${r.duljimo_st > 0 ? ' trevoga' : ''}" translate="no">
              <span class="kletka"><b>${ekraniraj(r.adres)}</b>${
                r.edinitsa ? ` <span class="drebno">${ekraniraj(r.edinitsa)}</span>` : ''
              }</span>
              <span class="chislo" translate="no">${r.zhiviNaemi}</span>
              <span class="chislo" translate="no">${ekraniraj(pishi(r.nachisleno_st))}</span>
              <span class="chislo" translate="no">${ekraniraj(pishi(r.sabrano_st))}</span>
              <span class="chislo" translate="no">${r.duljimo_st === 0 ? '—' : ekraniraj(pishi(r.duljimo_st))}</span>
            </div>`,
          )
          .join('')}
        <div class="red po-imot sbor" translate="no">
          <span class="kletka"><b>Всичко</b></span>
          <span class="chislo" translate="no">${redove.reduce((n, r) => n + r.zhiviNaemi, 0)}</span>
          <span class="chislo" translate="no">${ekraniraj(pishi(sbor.nachisleno))}</span>
          <span class="chislo" translate="no">${ekraniraj(pishi(sbor.sabrano))}</span>
          <span class="chislo" translate="no">${sbor.duljimo === 0 ? '—' : ekraniraj(pishi(sbor.duljimo))}</span>
        </div>
      </div>
      <p class="drebno"><b>Начислено</b> е онова, което е ПАДЕЖИРАЛО, не онова, което е влязло —
      затова „Дължимо" е разликата, а не отделно число. Сборът долу затваря с колоните над него:
      ако не затваряше, някой наем щеше да сочи изчезнал имот.</p>
    </section>`;
}

function polePrichina(koe: string): string {
  return `
    <div class="pole">
      <label for="${koe}-prichina">Защо се поправя</label>
      <input translate="no" id="${koe}-prichina" name="prichina" placeholder="напр. сбъркан номер" autocomplete="off">
    </div>`;
}

function formaPrekratyavane(naem: Naem): string {
  return `
    <section class="karta izbrana">
      <div class="dyalglava">
        <h2>Прекрати наема</h2>
        <span>${ekraniraj(naem.naemetel)} · вече начисленото остава дължимо</span>
      </div>
      <form id="forma-prekrati" data-naem="${ekraniraj(naem.id)}">
        <div class="poleta">
          <div class="pole">
            <label for="prekrati-kraj">Договорът свършва на</label>
            <input translate="no" id="prekrati-kraj" name="kraj" type="date" value="${dnesKato()}" required>
          </div>
          <div class="pole">
            <label for="prekrati-prichina">Защо</label>
            <input translate="no" id="prekrati-prichina" name="prichina" placeholder="напр. изнесоха се" autocomplete="off">
          </div>
        </div>
        <p class="greshka" id="greshka-prekrati"></p>
        <div class="deystviya">
          <button type="submit" class="glaven">Прекрати</button>
          <button type="button" class="vtorichen" data-otkazhi-rezhim>Откажи</button>
          <p class="drebno">Записва се като <b>НаемПрекратен</b>. Наемът спира да се начислява от следващия месец; начисленото досега си стои.</p>
        </div>
      </form>
    </section>`;
}

function redImot(imot: Imot, naemi: readonly Naem[]): string {
  // Всички живи наеми, не само първият — нищо не изчезва тихо.
  const zhivi = naemi.filter((n) => !n.prekraten);
  const sbor = zhivi.reduce((s, n) => s + n.naem_st, 0);
  const koy = zhivi.length === 0
    ? '<span>—</span>'
    : `<b>${ekraniraj(zhivi[0]!.naemetel)}</b><span>${
        zhivi.length === 1
          ? `падеж ${zhivi[0]!.padezhDen}-о число`
          : `и още ${zhivi.length - 1} · ${zhivi.slice(1).map((n) => ekraniraj(n.naemetel)).join(', ')}`
      }</span>`;
  return `
    <div class="red imot" translate="no">
      <span class="kletka"><b>${ekraniraj(imot.adres)}</b><span>${ekraniraj(imot.edinitsa)}</span></span>
      <span class="kletka">${koy}</span>
      <span class="kletka" data-redakt="imot-ploshtad·${ekraniraj(imot.id)}" data-surovo="${imot.ploshtad_kvsm}" title="Двоен клик или F2 — поправка на място"><span>${imot.ploshtad_kvsm > 0 ? `${kvSmVM2(imot.ploshtad_kvsm)} м²` : '—'}</span></span>
      <span class="suma"${zhivi.length ? ` data-st="${sbor}"` : ''}>${zhivi.length ? pishi(sbor) : '—'}</span>
      <span>${
        zhivi.length > 1
          ? `<span class="znachka trevoga">${zhivi.length} наема</span>`
          : zhivi.length === 1
            ? '<span class="znachka dobre">отдаден</span>'
            : '<span class="znachka tiha">свободен</span>'
      }</span>
      <span class="butoni">
        <button type="button" class="vtorichen malak" data-popravi-imot="${ekraniraj(imot.id)}">Поправи</button>
        <button type="button" class="vtorichen malak" data-storno-imot="${imot.seq}">Сторно</button>
        ${butonIstoriya('imot', imot.id)}
      </span>
    </div>`;
}

function redNaem(naem: Naem, o: Ogledalo): string {
  const imot = o.imoti.get(naem.imotId);
  const a = akumulator(naem.sektor);
  return `
    <div class="red naem" translate="no">
      <span class="kletka"><b>${ekraniraj(naem.naemetel)}</b><span>падеж ${naem.padezhDen}-о число · от ${ekraniraj(naem.ot.slice(0, 10))}${
        naem.telefon ? ` · ${ekraniraj(naem.telefon)}` : ''
      }${naem.imeyl ? ` · ${ekraniraj(naem.imeyl)}` : ''}</span></span>
      <span class="kletka"><span>${imot ? ekraniraj(opisi(imot)) : ekraniraj(naem.imotId)}</span></span>
      <span class="kletka"><span>${ekraniraj(a.sektor)} · ${a.stavka}%</span></span>
      <span class="suma" data-st="${naem.naem_st}" data-redakt="naem-suma·${ekraniraj(naem.id)}" data-surovo="${naem.naem_st}" title="Двоен клик или F2 — поправка на място">${pishi(naem.naem_st)}</span>
      <span>${
        naem.prekraten
          ? `<span class="znachka tiha">прекратен${naem.kraj ? ` ${ekraniraj(naem.kraj.slice(0, 10))}` : ''}</span>`
          : '<span class="znachka dobre">жив</span>'
      }</span>
      <span class="butoni">
        ${naem.prekraten ? '' : `<button type="button" class="vtorichen malak" data-prekrati="${ekraniraj(naem.id)}">Прекрати</button>`}
        <button type="button" class="vtorichen malak" data-popravi-naem="${ekraniraj(naem.id)}">Поправи</button>
        <button type="button" class="vtorichen malak" data-storno-naem="${naem.seq}">Сторно</button>
        ${butonIstoriya('naem', naem.id)}
      </span>
    </div>`;
}

function opisi(i: Imot): string {
  return `${i.adres} · ${i.edinitsa}`;
}

export function zakachiFormite(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  // ЗАКОНЪТ ЗА МЕНЮТАТА (И97 · ADR-040 · ADR-042) · наемателят е живо поле.
  zakachiMenyuta(koren, rechnitsite(RECHNIK_NAEM));

  // ── имот: нов или поправен ───────────────────────────────────────────────
  const formaImot = koren.querySelector<HTMLFormElement>('#forma-imot');
  formaImot?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-imot')!;
    greshka.textContent = '';
    const danni = new FormData(formaImot);
    const buton = formaImot.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let ploshtad_kvsm = 0;
    const surovaPloshtad = String(danni.get('ploshtad') ?? '').trim();
    if (surovaPloshtad !== '') {
      try {
        // Площта си има СВОЙ четец (правило 3 · ADR-014): паричният приемаше
        // „72,40 €" за площ и залепваше знака на валутата при показване.
        ploshtad_kvsm = ploshtVKvSm(surovaPloshtad);
      } catch (e) {
        greshka.textContent = dumiZaGreshka(e);
        return;
      }
    }

    const opis = {
      adres: String(danni.get('adres')).trim(),
      edinitsa: String(danni.get('edinitsa')).trim(),
      ploshtad_kvsm,
    };

    buton.disabled = true;
    try {
      if (rezhim.kakvo === 'popravi-imot') {
        await k.deystviya.popraviImot(
          { imotId: rezhim.id, ...opis, prichina: String(danni.get('prichina') ?? '').trim() },
          { opId: opIdDeystvie },
        );
        opIdDeystvie = novOpId();
        rezhim = { kakvo: 'nov' };
        k.vest('dobre', 'Поправката е записана. Старото описание остава в Журнала.');
      } else {
        await k.deystviya.dobaviImot(`I:${crypto.randomUUID()}`, opis, { opId: opIdImot });
        opIdImot = novOpId();
        formaImot.reset();
        k.vest('dobre', 'Имотът е записан в Журнала.');
      }
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── наем: нов или поправен ───────────────────────────────────────────────
  const formaNaem = koren.querySelector<HTMLFormElement>('#forma-naem');
  formaNaem?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-naem')!;
    greshka.textContent = '';
    const danni = new FormData(formaNaem);
    const buton = formaNaem.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let naem_st: number;
    let depozit_st = 0;
    let ot: string;
    try {
      naem_st = otLeva(String(danni.get('naem')));
      const surovDepozit = String(danni.get('depozit') ?? '').trim();
      if (surovDepozit !== '') depozit_st = otLeva(surovDepozit);
      ot = otData(String(danni.get('ot') ?? ''), 'Датата „Договор от“');
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
      return;
    }

    buton.disabled = true;
    // БРОИ СЕ ПРЕДИ ЗАПИСА: после речникът вече ги съдържа и отговорът би бил
    // „нищо ново". Преди записа това би било въпрос; след него е следа (ADR-040).
    const novite = novoteVSpisatsite(koren, rechnitsite(RECHNIK_NAEM));
    try {
      if (rezhim.kakvo === 'popravi-naem') {
        const star = (await k.deystviya.ogledalo()).naemi.get(rezhim.id)!;
        await k.deystviya.popraviNaem(
          {
            naemId: rezhim.id,
            ...poletataNaNaemaOtFormata(danni, { naem_st, depozit_st, ot }),
            do: star.do,
            prichina: String(danni.get('prichina') ?? '').trim(),
          },
          { opId: opIdDeystvie },
        );
        opIdDeystvie = novOpId();
        rezhim = { kakvo: 'nov' };
        k.vest(
          'dobre',
          `Поправката е записана. Новата сума важи за бъдещите начисления.${sDumiZaNovite(novite)}`,
        );
      } else {
        await k.deystviya.dobaviNaem(
          `N:${crypto.randomUUID()}`,
          {
            imotId: String(danni.get('imotId')),
            ...poletataNaNaemaOtFormata(danni, { naem_st, depozit_st, ot }),
            do: '',
          },
          { opId: opIdNaem },
        );
        opIdNaem = novOpId();
        formaNaem.reset();
        k.vest('dobre', `Наемът е записан в Журнала.${sDumiZaNovite(novite)}`);
      }
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── прекратяване ─────────────────────────────────────────────────────────
  const formaPrekrati = koren.querySelector<HTMLFormElement>('#forma-prekrati');
  formaPrekrati?.addEventListener('submit', async (sabitie) => {
    sabitie.preventDefault();
    const greshka = koren.querySelector<HTMLElement>('#greshka-prekrati')!;
    greshka.textContent = '';
    const danni = new FormData(formaPrekrati);
    const buton = formaPrekrati.querySelector<HTMLButtonElement>('button[type=submit]')!;

    let kraj: string;
    try {
      kraj = otData(String(danni.get('kraj') ?? ''), 'Датата на края');
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
      return;
    }

    buton.disabled = true;
    try {
      await k.deystviya.prekratiNaem(
        {
          naemId: formaPrekrati.dataset['naem']!,
          kraj,
          prichina: String(danni.get('prichina') ?? '').trim() || 'без посочена причина',
        },
        { opId: opIdDeystvie },
      );
      opIdDeystvie = novOpId();
      rezhim = { kakvo: 'nov' };
      k.vest('dobre', 'Наемът е прекратен. Начисленото досега си остава дължимо.');
      await prerisuvay();
    } catch (e) {
      greshka.textContent = dumiZaGreshka(e);
    } finally {
      buton.disabled = false;
    }
  });

  // ── бутоните по редовете ─────────────────────────────────────────────────
  for (const [znak, kakvo] of [
    ['data-popravi-imot', 'popravi-imot'],
    ['data-popravi-naem', 'popravi-naem'],
    ['data-prekrati', 'prekrati'],
  ] as const) {
    for (const b of koren.querySelectorAll<HTMLButtonElement>(`[${znak}]`)) {
      b.addEventListener('click', async () => {
        rezhim = { kakvo, id: b.getAttribute(znak)! };
        opIdDeystvie = novOpId();
        await prerisuvay();
      });
    }
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-otkazhi-rezhim]')) {
    b.addEventListener('click', async () => {
      rezhim = { kakvo: 'nov' };
      await prerisuvay();
    });
  }

  // Обиколката е една за трите екрана (`storno.ts`); тук е само разликата —
  // след сторното Имоти се връща в режим „нов".
  zakachiStornoButoni(
    koren,
    k,
    [
      ['data-storno-imot', 'имотът'],
      ['data-storno-naem', 'наемът'],
    ],
    async () => {
      rezhim = { kakvo: 'nov' };
      await prerisuvay();
    },
  );
}

/**
 * ПОЛЕТАТА НА НАЕМА, прочетени от ФОРМАТА · един път за двата пътя.
 *
 * Добавянето и поправката четат едни и същи полета. Написани поотделно, те
 * се разминават при първото ново поле — и наемът тихо губи стойност всеки
 * път, щом някой го поправи. Същият капан стоеше и в Огледалото; там е
 * затворен с `poletataNaNaema`, тук — с това.
 *
 * Числата идват ГОТОВИ отвън: те са разчетени по-рано, за да може отказът
 * при сгрешена сума да се каже, преди изобщо да се стигне до Вратата.
 *
 * Отвън остават само разликите: добавянето носи `imotId` и празен край,
 * поправката — `naemId`, СТАРИЯ край и причината.
 */
function poletataNaNaemaOtFormata(
  danni: FormData,
  chisla: { naem_st: number; depozit_st: number; ot: string },
): {
  naemetel: string;
  telefon: string;
  imeyl: string;
  naem_st: number;
  padezhDen: number;
  ot: string;
  depozit_st: number;
  sektor: string;
} {
  return {
    naemetel: String(danni.get('naemetel')).trim(),
    telefon: String(danni.get('telefon') ?? '').trim(),
    imeyl: String(danni.get('imeyl') ?? '').trim(),
    naem_st: chisla.naem_st,
    padezhDen: Number(danni.get('padezhDen')),
    ot: chisla.ot,
    depozit_st: chisla.depozit_st,
    sektor: String(danni.get('sektor')),
  };
}

