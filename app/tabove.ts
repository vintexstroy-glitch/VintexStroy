/**
 * ТАБОВЕТЕ И СЕКЦИИТЕ · екранът (И92 т.9, втората половина).
 *
 * Негови думи: „Стационарните пак вътре в тях можеш да добавяш таблици,
 * графики. Те са на секции и се комбинират… искам всичко да е деликатно
 * скрито под падащи менюта."
 *
 * Затова табовете живеят на ЕДИН екран — не разпилени по навигацията.
 * Стационарен таб не заема отделно място: избира се тук като „кого
 * допълвам", секциите му се добавят тук, и се виждат тук — прегледът, не
 * дублиране на истинския екран. Собственият таб е същото, само че името му
 * не е закован към нищо.
 *
 * СВЪРЗВАНЕТО („изборът в едната стеснява другата", Grist Select By): клик
 * на ред в изворна секция запомня КЛЮЧОВЕТЕ на реда; вързаната секция
 * филтрира по своя `po`. Изборът е ЕКРАННО състояние — не Журнал, не факт
 * от историята — и затова не остава между презарежданията (ADR-022 говори
 * за ПОГЛЕДА върху екрана, не за всеки клик по ред).
 */

import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import {
  eSashtnostZaZakachane,
  IMENA_NA_SASHTNOSTITE,
  redoveNa,
  SASHTNOSTI_ZA_ZAKACHANE,
  svarzanite,
  sveriZakachkite,
  type SashtnostZaZakachane,
} from '../src/domein/mnogo-kam-mnogo.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { ekraniraj } from './obshto.js';
import {
  dobaviSektsiya,
  eStatsionaren,
  GreshkaTab,
  IMENA_NA_DIAGRAMITE,
  IMENA_NA_IZTOCHNITSITE,
  IMENA_NA_VIDOVETE_SEKTSII,
  IMENA_NA_VRAZKITE,
  IZTOCHNITSI_DIAGRAMA,
  IZTOCHNITSI_TABLITSA,
  napraviTab,
  nosiKlyucha,
  premahniSektsiya,
  premestiSektsiya,
  razvarzhiSektsiya,
  STATSIONARNI,
  svarzhiSektsii,
  vazmozhniIzvori,
  type IztochnikDiagrama,
  type IztochnikTablitsa,
  type PoKakvo,
  type Sektsiya,
  type Tab,
  type VidSektsiya,
} from '../src/domein/tabove.js';
import { podredi, zhivite } from '../src/domein/dela.js';
import {
  adresnaKniga,
  samotni,
  sledvashtNomer,
  svarzaniPoNomer,
  type RedVKnigata,
} from '../src/domein/adresna-kniga.js';
import { rolyataNa } from '../src/domein/stopanin.js';
import { dayNomer } from '../src/domein/redaktor.js';
import { reshetka } from '../src/domein/gant.js';
import { sumiZaObhvat } from '../src/domein/otcheti.js';
import { mesechnitePari } from '../src/domein/diagrami.js';
import { pishi } from '../src/yadro/pari.js';
import { narisuvayDiagrama } from './gant-diagrama.js';
import { stalboveNaMesetsite } from './diagrami.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import type { Konteks } from './ekranite.js';

/** Кой таб се преглежда — поглед върху екрана, помни се (ADR-022). */
let izbranTab = chetiEkranno('tabove.izbran', '');
let dobavyamTab = false;
/** Отворена ли е формата за нова секция В този таб. */
let dobavyamSektsiya = false;
let greshka = '';

/**
 * КОИ ДВА ВИДА се закачат в момента · ПАМЕТ НА ЕКРАНА, не факт (ADR-022).
 *
 * Изборът „кого с кого гледам" не е решение на човек за бизнеса — той е поглед.
 * В Журнала биха влезли стотици записи за разглеждане, а правило 1 не позволява
 * да се изчистят после.
 */
let vidA = chetiEkranno('tabove.zakachki.vidA', 'razhod') as SashtnostZaZakachane;
let vidB = chetiEkranno('tabove.zakachki.vidB', 'imot') as SashtnostZaZakachane;

/** КОЙ ред е избран отляво · пак поглед: от него се чете „за какво е закачен". */
let redA = chetiEkranno('tabove.zakachki.redA', '');

/** Изборът за Select By: секция → ключовете на кликнатия ѝ ред. Ефимерно. */
const izbraniRedove = new Map<string, Readonly<Partial<Record<PoKakvo, string>>>>();
const izbraniIdta = new Map<string, string>();

interface RedZaSektsiya {
  readonly id: string;
  readonly etiket: string;
  readonly detayl: string;
  readonly klyuchove: Readonly<Partial<Record<PoKakvo, string>>>;
}

/**
 * Редовете на един източник, с ключовете им за връзване.
 *
 * Джойновете тук са НАРОЧНИ: вземане не носи `imotId` пряко, а през наема —
 * точно както Огледалото само държи връзките. Резолюцията пада тихо (без
 * ключ), не гърми — ред без връзка просто не се филтрира от нищо.
 */
function redoveZaIztochnik(o: Ogledalo, iztochnik: IztochnikTablitsa): readonly RedZaSektsiya[] {
  switch (iztochnik) {
    case 'imoti':
      return [...o.imoti.values()].map((im) => ({
        id: im.id,
        etiket: `${im.adres} · ${im.edinitsa}`,
        detayl: `${(im.ploshtad_kvsm / 10000).toFixed(2)} м²`,
        klyuchove: { imot: im.id, myasto: im.adres },
      }));
    case 'naemi':
      return [...o.naemi.values()].map((n) => ({
        id: n.id,
        etiket: n.naemetel,
        detayl: pishi(n.naem_st),
        klyuchove: { imot: n.imotId },
      }));
    case 'vzemaniya':
      return [...o.vzemaniya.values()].map((v) => ({
        id: v.id,
        etiket: `${v.period} · ${v.osnovanie}`,
        detayl: pishi(v.ostatak_st),
        klyuchove: { imot: o.naemi.get(v.naemId)?.imotId ?? '' },
      }));
    case 'plashtaniya':
      return [...o.plashtaniya.values()].map((p) => {
        const vz = o.vzemaniya.get(p.vzemaneId);
        const imotId = vz ? (o.naemi.get(vz.naemId)?.imotId ?? '') : '';
        return {
          id: p.id,
          etiket: `${p.data} · ${p.nachin}`,
          detayl: pishi(p.suma_st),
          klyuchove: { imot: imotId },
        };
      });
    case 'razhodi':
      return [...o.razhodi.values()].map((r) => ({
        id: r.id,
        etiket: `${r.dostavchik} · ${r.opis}`,
        detayl: pishi(r.suma_st),
        klyuchove: {},
      }));
    case 'dela':
      return zhivite([...o.dela.values()]).map((d) => ({
        id: d.id,
        etiket: d.ime,
        detayl: `${d.ot} → ${d.do}`,
        klyuchove: { myasto: d.myasto, obekt: d.obekt },
      }));
  }
}

function svobodniIme(vzeti: readonly string[], osnova: string): string {
  let ime = osnova;
  let i = 2;
  while (vzeti.includes(ime)) {
    ime = `${osnova} ${i}`;
    i += 1;
  }
  return ime;
}

export function narisuvayTabove(o: Ogledalo, dnes: string): string {
  const vsichkiTabove = [...o.tabove.values()];
  const dobaveni = vsichkiTabove.filter((t) => !t.statsionaren);
  // Стационарен екран без нито една добавена секция още няма запис в
  // Журнала — синтезира се празен таб, за да мине по СЪЩИЯ път като
  // всеки друг. Два пътя за едно нещо се разминават (тук се разминаваха:
  // единият нямаше бутона „Нова секция").
  const izbran =
    vsichkiTabove.find((t) => t.klyuch === izbranTab) ??
    (izbranTab && eStatsionaren(izbranTab)
      ? napraviTab({ ime: imeNaStatsionaren(izbranTab), klyuch: izbranTab, statsionaren: true })
      : undefined);

  return `
    <section data-sektsiya="tabove-tabovete" class="karta">
      <div class="dyalglava">
        <h2>Табовете</h2>
        <span>стационарни — допълваш екраните с още секции · добавени — изцяло твои</span>
      </div>
      <div class="poleta tesni">
        <div class="pole">
          <label for="izbor-tab">Кой преглеждам</label>
          <select translate="no" id="izbor-tab">
            <option value="">— избери —</option>
            <optgroup label="Стационарни · допълват екран">
              ${STATSIONARNI.map(
                (k) =>
                  `<option value="${k}"${k === izbranTab ? ' selected' : ''}>${ekraniraj(imeNaStatsionaren(k))}</option>`,
              ).join('')}
            </optgroup>
            ${
              dobaveni.length
                ? `<optgroup label="Добавени">
              ${dobaveni
                .map(
                  (t) =>
                    `<option value="${ekraniraj(t.klyuch)}"${t.klyuch === izbranTab ? ' selected' : ''}>${ekraniraj(t.ime)}</option>`,
                )
                .join('')}
            </optgroup>`
                : ''
            }
          </select>
        </div>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="nov-tab"${dobavyamTab ? ' disabled' : ''}>Нов таб</button>
        <p class="drebno">Стационарният е закован към екран на програмата — не се маха. Добавеният е изцяло твой.</p>
      </div>
      ${dobavyamTab ? formaNovTab() : ''}
    </section>
    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}
    ${izbran ? blokTab(o, izbran, dnes) : ''}
    ${blokAdresnaKniga(o)}
    ${blokZakachki(o)}`;
}

/**
 * АДРЕСНАТА КНИГА · общата таблица на връзките (И94 т.2).
 *
 * Негови думи: „обща екселска таблица, където да имат СХОДНИ НОМЕРА за
 * връзка." Номерът е ВРЪЗКА, не адрес: две колони с един номер са свързани.
 * Книгата е ОГЛЕДАЛО — смята се от моделите при всяко показване; записът е
 * самият модел (правило 17). Номер дава само Стопанинът, и това е ново
 * събитие МоделЗаписан — със следа.
 */
function blokAdresnaKniga(o: Ogledalo): string {
  const kniga = adresnaKniga([...o.modeli.values()]);
  const bezDvoyka = samotni(kniga);
  const sledvasht = sledvashtNomer(kniga);

  return `
    <section data-sektsiya="tabove-adresna-kniga">
      <div class="dyalglava">
        <h2>Адресната книга</h2>
        <span>връзката е ПО НОМЕР, като в Ексел · сходни номера = свързани колони</span>
      </div>
      <div class="tablitsa" data-tablitsa="adresna-kniga">
        <div class="glava opis"><span>№</span><span>Таблица</span><span>Колона</span><span>Свързана с</span></div>
        ${kniga.map((r) => redVKnigata(kniga, r)).join('')}
      </div>
      ${
        bezDvoyka.length
          ? `<p class="drebno" id="samotnite">Номер${bezDvoyka.length === 1 ? '' : 'а'} с ЕДИН край: ${bezDvoyka.join(' · ')} —
        връзка с един край не връзва нищо; чака втората колона.</p>`
          : ''
      }
      <p class="drebno">Вградените връзки носят номера 1 · 2 · 3 и не се менят. На колона от твой
      хедър номер дава Стопанинът — следващият свободен е <b>${sledvasht}</b>; номер 0 маха връзката.
      Книгата се смята от моделите при всяко показване — тя е Огледало, не втори носител.</p>
    </section>`;
}

/**
 * ЗАКАЧКИТЕ · много-към-много между РЕДОВЕ (M17).
 *
 * Негово: „Занимай се първо с много-към-много."
 *
 * Стои точно под Адресната книга, защото двете отговарят на съседни въпроси:
 * книгата казва кои КОЛОНИ говорят една с друга, закачките — кои РЕДОВЕ са
 * закачени. Едно място за връзките, две нива.
 *
 * Падащите менюта се пълнят от ДОМЕЙНА (`redoveNa`): меню, което си избира
 * колекция само, предлага ред, който Вратата после отказва.
 */
function blokZakachki(o: Ogledalo): string {
  const redoveA = redoveNa(o, vidA);
  const redoveB = redoveNa(o, vidB);
  const zhivi = [...o.zakachki.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
  const sverka = sveriZakachkite(o.zakachki, o);

  const menyu = (id: string, izbran: SashtnostZaZakachane): string => `
    <select translate="no" id="${id}">
      ${SASHTNOSTI_ZA_ZAKACHANE.map(
        (v) =>
          `<option value="${v}"${v === izbran ? ' selected' : ''}>${ekraniraj(IMENA_NA_SASHTNOSTITE[v])}</option>`,
      ).join('')}
    </select>`;

  // Избраният отляво ред се ПОМНИ; смени ли се видът, паметта може да сочи ред
  // от другия вид — тогава пада на първия. Иначе „закачен за" би показвал
  // връзките на ред, който вече не стои в менюто.
  const izbranA = redoveA.includes(redA) ? redA : (redoveA[0] ?? '');
  const zakachenoZa = svarzanite(o.zakachki, { vid: vidA, id: izbranA });

  const redove = (id: string, spisak: readonly string[], izbran = ''): string => `
    <select translate="no" id="${id}"${spisak.length ? '' : ' disabled'}>
      ${
        spisak.length
          ? spisak
              .map(
                (r) =>
                  `<option value="${ekraniraj(r)}"${r === izbran ? ' selected' : ''}>${ekraniraj(r)}</option>`,
              )
              .join('')
          : '<option value="">— няма редове —</option>'
      }
    </select>`;

  return `
    <section data-sektsiya="tabove-zakachki">
      <div class="dyalglava">
        <h2>Закачки между редове</h2>
        <span>един ред се закача за много редове, и обратно · двете посоки са ЕДИН запис</span>
      </div>
      <div class="poleta tesni">
        <div class="pole"><label for="zak-vid-a">Този ред</label>${menyu('zak-vid-a', vidA)}</div>
        <div class="pole"><label for="zak-red-a">кой</label>${redove('zak-red-a', redoveA, izbranA)}</div>
        <div class="pole"><label for="zak-vid-b">се закача за</label>${menyu('zak-vid-b', vidB)}</div>
        <div class="pole"><label for="zak-red-b">кой</label>${redove('zak-red-b', redoveB)}</div>
        <div class="pole">
          <label for="zak-zashto">Защо · по избор</label>
          <input translate="no" id="zak-zashto" placeholder="кратка причина">
        </div>
      </div>
      <div class="deystviya">
        <button type="button" id="zak-zakachi"${redoveA.length && redoveB.length ? '' : ' disabled'}>Закачи</button>
        ${
          redoveA.length && redoveB.length
            ? ''
            : '<p class="drebno">Няма редове от единия вид — закачка не се прави от нищо.</p>'
        }
      </div>
      <p class="drebno" id="zakacheno-za" translate="no">${
        izbranA === ''
          ? 'Няма избран ред.'
          : zakachenoZa.size === 0
            ? `<b>${ekraniraj(izbranA)}</b> не е закачен за нищо.`
            : `<b>${ekraniraj(izbranA)}</b> е закачен за: ` +
              [...zakachenoZa.entries()]
                .map(
                  ([vid, idta]) =>
                    `${ekraniraj(IMENA_NA_SASHTNOSTITE[vid])} · ${ekraniraj(idta.join(', '))}`,
                )
                .join(' · ')
      }</p>
      <div class="tablitsa" data-tablitsa="zakachki">
        <div class="glava opis"><span>Единият край</span><span>Другият край</span><span>Защо</span><span></span></div>
        ${
          zhivi.length
            ? zhivi
                .map(
                  ([klyuch, z]) => `
          <div class="red opis${sverka.viseshti.includes(klyuch) ? ' propusnat' : ''}" translate="no" data-zakachka="${ekraniraj(klyuch)}">
            <span><b>${ekraniraj(IMENA_NA_SASHTNOSTITE[z.a.vid])}</b> · ${ekraniraj(z.a.id)}</span>
            <span><b>${ekraniraj(IMENA_NA_SASHTNOSTITE[z.b.vid])}</b> · ${ekraniraj(z.b.id)}</span>
            <span>${ekraniraj(z.zashto) || '<span class="znachka tiha">без причина</span>'}</span>
            <span><button type="button" class="vtorichen malak" data-razkachi="${ekraniraj(klyuch)}">Разкачи</button></span>
          </div>`,
                )
                .join('')
            : '<div class="red opis"><span>Няма нито една закачка.</span><span></span><span></span><span></span></div>'
        }
      </div>
      <p class="drebno" id="sverka-zakachki">Живи закачки: <b>${sverka.zhivi}</b> · висящи: <b>${sverka.viseshti.length}</b>${
        sverka.viseshti.length ? ` — ${ekraniraj(sverka.viseshti.join(' · '))}` : ''
      }. Висяща е двойка, чийто край вече го няма — стои, за да се види, а не за да мълчи.</p>
      <p class="drebno">Разкачането е ЗАПИС, не триене: в Журнала остават и закачането, и разкачането.
      Редовете на моделна и на внесена таблица още ги няма в Журнала (описът · M12), затова закачка
      към чужда таблица не се предлага — страна без редове не може да бъде проверена.</p>
    </section>`;
}

/**
 * ЕДИН РЕД от адресната книга · номерът, колоната и КОЙ ГО СПОДЕЛЯ.
 *
 * „Кои колони носят този номер" се пита от ДОМЕЙНА (`svarzaniPoNomer`), а не се
 * преписва тук. Дотук екранът си го смяташе сам с второ `filter` — и двете
 * версии вече се различаваха по нюанс (домейновата връща и себе си). Второ
 * място за един факт е второ място, което се разминава (правило 17), а
 * функцията в домейна стоеше с НУЛА живи викащи, само с теста си.
 *
 * САМИЯТ РЕД се маха тук, не в домейна: „свързаните" е свойство на номера, а
 * „другите освен мен" е въпрос на ЕКРАНА, който рисува точно този ред.
 */
function redVKnigata(kniga: readonly RedVKnigata[], r: RedVKnigata): string {
  const drugite = svarzaniPoNomer(kniga, r.nomer).filter(
    (x) => !(x.tablitsa === r.tablitsa && x.kolona === r.kolona),
  );
  return `
    <div class="red opis${r.nomer === 0 ? ' propusnat' : ''}" translate="no">
      <span>${
        r.otkade === 'vgradena'
          ? `<b>${r.nomer}</b>`
          : `<input translate="no" data-nomer-vhod="${ekraniraj(r.tablitsa)}·${r.indeks}" value="${r.nomer || ''}"
              inputmode="numeric" placeholder="—" aria-label="номер на връзка" class="tesen">`
      }</span>
      <span>${ekraniraj(r.tablitsa)}${r.otkade === 'vgradena' ? '' : ' · хедър'}</span>
      <span><b>${ekraniraj(r.kolona)}</b></span>
      <span>${
        r.nomer === 0
          ? '<span class="znachka tiha">без връзка</span>'
          : // ТЕРНАР С ДВА ЕДНАКВИ КЛОНА стоеше тук и викаше `vrazkataNaNomer`
            // само за да не ползва отговора му. Шум в най-чистия си вид —
            // негова дума за резен 18: „без никакъв шум" (ADR-069).
            ekraniraj(
              drugite.map((x) => `${x.tablitsa} · ${x.kolona}`).join(' · ') || 'чака втори край',
            )
      }${
        r.otkade === 'model'
          ? ` <button type="button" class="vtorichen malak" data-zapishi-nomer="${ekraniraj(r.tablitsa)}·${r.indeks}">Запиши</button>`
          : ''
      }</span>
    </div>`;
}

const IMENA_NA_STATSIONARNITE: Readonly<Record<string, string>> = Object.freeze({
  imoti: 'Имоти',
  pari: 'Пари',
  smetki: 'Сметки',
  stoynost: 'Стойност на Състояние',
  gant: 'Управление',
  nastroyki: 'Настройки',
  ii: 'ИИ',
  tablo: 'Табло',
});

function imeNaStatsionaren(k: string): string {
  return IMENA_NA_STATSIONARNITE[k] ?? k;
}

function formaNovTab(): string {
  return `
    <form id="forma-tab" class="karta izbrana">
      <div class="poleta">
        <div class="pole">
          <label for="tab-ime">Име на новия таб</label>
          <input translate="no" id="tab-ime" name="ime" required placeholder="напр. Малинова Долина" autocomplete="off">
        </div>
      </div>
      <p class="greshka" id="greshka-tab"></p>
      <div class="deystviya">
        <button type="submit" class="glaven">Създай таба</button>
        <button type="button" class="vtorichen" id="otkazhi-tab">Откажи</button>
      </div>
    </form>`;
}

function blokTab(o: Ogledalo, t: Tab, dnes: string): string {
  return `
    <section data-sektsiya="tabove-izbraniyat">
      <div class="dyalglava">
        <h2>${ekraniraj(t.ime)}</h2>
        <span>${t.sektsii.length} ${t.sektsii.length === 1 ? 'секция' : 'секции'}${t.statsionaren ? ' · допълва екрана' : ''}</span>
      </div>
      ${
        t.sektsii.length === 0
          ? '<p class="prazno">Още няма нито една секция.<br>Добави таблица или графика долу.</p>'
          : t.sektsii.map((s) => blokSektsiya(o, t, s, dnes)).join('')
      }
      <div class="deystviya">
        <button type="button" class="vtorichen" id="nova-sektsiya"${dobavyamSektsiya ? ' disabled' : ''}>Нова секция</button>
      </div>
      ${dobavyamSektsiya ? formaNovaSektsiya(t) : ''}
    </section>`;
}

function blokSektsiya(o: Ogledalo, t: Tab, s: Sektsiya, dnes: string): string {
  const svarzana = s.svarzanaS ? t.sektsii.find((x) => x.klyuch === s.svarzanaS) : undefined;
  const glava = `
    <div class="dyalglava">
      <h3>${ekraniraj(s.ime)}</h3>
      <span>${IMENA_NA_VIDOVETE_SEKTSII[s.vid]}${
        svarzana ? ` · стеснена от „${ekraniraj(svarzana.ime)}" ${IMENA_NA_VRAZKITE[s.po as PoKakvo]}` : ''
      }</span>
    </div>
    <div class="butoni">
      <button type="button" class="vtorichen malak" data-sektsiya-gore="${ekraniraj(s.klyuch)}" aria-label="нагоре">▲</button>
      <button type="button" class="vtorichen malak" data-sektsiya-dolu="${ekraniraj(s.klyuch)}" aria-label="надолу">▼</button>
      ${
        s.vid === 'tablitsa'
          ? `<button type="button" class="vtorichen malak" data-sektsiya-svarzhi="${ekraniraj(s.klyuch)}">${
              svarzana ? 'Смени връзката' : 'Свържи'
            }</button>`
          : ''
      }
      ${svarzana ? `<button type="button" class="vtorichen malak" data-sektsiya-razvarzhi="${ekraniraj(s.klyuch)}">Развържи</button>` : ''}
      <button type="button" class="vtorichen malak" data-sektsiya-mahni="${ekraniraj(s.klyuch)}">Махни</button>
    </div>`;

  const svarzvane = svarzvaneOtvoreno === s.klyuch ? formaSvarzvane(t, s) : '';

  if (s.vid === 'diagrama') {
    return `<div class="karta">${glava}${diagramaNaSektsiya(o, s.iztochnik as IztochnikDiagrama, dnes)}</div>`;
  }

  return `<div class="karta">${glava}${tablitsaNaSektsiya(o, t, s)}${svarzvane}</div>`;
}

function diagramaNaSektsiya(o: Ogledalo, iztochnik: IztochnikDiagrama, dnes: string): string {
  if (iztochnik === 'mesetsi') return stalboveNaMesetsite(mesechnitePari(o, dnes));
  const dela = podredi(zhivite([...o.dela.values()]), dnes);
  if (dela.length === 0) return '<p class="prazno">Още няма дела.</p>';
  const r = reshetka(dela, 'mesets', dnes);
  return narisuvayDiagrama(dela, r, dnes);
}

function tablitsaNaSektsiya(o: Ogledalo, t: Tab, s: Sektsiya): string {
  const vsichkiRedove = redoveZaIztochnik(o, s.iztochnik as IztochnikTablitsa);
  const masterIzbor = s.svarzanaS ? izbraniRedove.get(s.svarzanaS) : undefined;
  const filtrirano = Boolean(s.po && masterIzbor && masterIzbor[s.po] !== undefined);
  const redove =
    filtrirano && s.po
      ? vsichkiRedove.filter((r) => r.klyuchove[s.po as PoKakvo] === masterIzbor![s.po as PoKakvo])
      : vsichkiRedove;
  const izbranId = izbraniIdta.get(s.klyuch);

  if (vsichkiRedove.length === 0) {
    return `<p class="prazno">Още няма нищо в „${ekraniraj(IMENA_NA_IZTOCHNITSITE[s.iztochnik as IztochnikTablitsa])}".</p>`;
  }
  return `
    ${filtrirano ? `<p class="drebno">стеснено от избрания ред отгоре · ${redove.length} от ${vsichkiRedove.length}</p>` : ''}
    <div class="tablitsa" data-tablitsa="${ekraniraj(`${t.klyuch}.${s.klyuch}`)}">
      ${
        redove.length === 0
          ? '<p class="prazno">Изборът отгоре не оставя нито един ред тук.</p>'
          : redove
              .slice(0, 200)
              .map(
                (r) => `<div class="red kliknat-red${r.id === izbranId ? ' izbrana' : ''}"
              data-sektsiya-red="${ekraniraj(s.klyuch)}" data-red-id="${ekraniraj(r.id)}" translate="no">
              <span class="kletka"><b>${ekraniraj(r.etiket)}</b></span>
              <span>${ekraniraj(r.detayl)}</span>
            </div>`,
              )
              .join('')
      }
    </div>`;
}

let svarzvaneOtvoreno = '';

function formaSvarzvane(t: Tab, s: Sektsiya): string {
  return `
    <form class="red-forma" id="forma-svarzhi" data-sektsiya="${ekraniraj(s.klyuch)}">
      <div class="poleta tesni">
        <div class="pole">
          <label>По кое</label>
          <select translate="no" name="po">
            ${(['imot', 'obekt', 'myasto'] as const)
              .filter((po) => nosiKlyucha(s.iztochnik as IztochnikTablitsa, po))
              .map((po) => `<option value="${po}">${IMENA_NA_VRAZKITE[po]}</option>`)
              .join('')}
          </select>
        </div>
        <div class="pole">
          <label>От коя секция</label>
          <select translate="no" name="izvor">
            ${t.sektsii
              .filter((x) => x.klyuch !== s.klyuch && x.vid === 'tablitsa')
              .map((x) => `<option value="${ekraniraj(x.klyuch)}">${ekraniraj(x.ime)}</option>`)
              .join('')}
          </select>
        </div>
      </div>
      <p class="greshka" id="greshka-svarzhi"></p>
      <div class="deystviya">
        <button type="submit" class="glaven malak">Свържи</button>
        <button type="button" class="vtorichen malak" id="otkazhi-svarzhi">Откажи</button>
      </div>
    </form>`;
}

function formaNovaSektsiya(t: Tab): string {
  return `
    <form id="forma-sektsiya" data-tab="${ekraniraj(t.klyuch)}" class="karta izbrana">
      <div class="poleta">
        <div class="pole">
          <label for="sektsiya-ime">Име на секцията</label>
          <input translate="no" id="sektsiya-ime" name="ime" required placeholder="напр. Обектите" autocomplete="off">
        </div>
        <div class="pole">
          <label for="sektsiya-vid">Вид</label>
          <select translate="no" id="sektsiya-vid" name="vid">
            <option value="tablitsa">${IMENA_NA_VIDOVETE_SEKTSII.tablitsa}</option>
            <option value="diagrama">${IMENA_NA_VIDOVETE_SEKTSII.diagrama}</option>
          </select>
        </div>
        <div class="pole">
          <label for="sektsiya-iztochnik">Източник</label>
          <select translate="no" id="sektsiya-iztochnik" name="iztochnik">
            <optgroup label="${IMENA_NA_VIDOVETE_SEKTSII.tablitsa}" data-grupa="tablitsa">
              ${IZTOCHNITSI_TABLITSA.map((k) => `<option value="${k}">${IMENA_NA_IZTOCHNITSITE[k]}</option>`).join('')}
            </optgroup>
            <optgroup label="${IMENA_NA_VIDOVETE_SEKTSII.diagrama}" data-grupa="diagrama" hidden>
              ${IZTOCHNITSI_DIAGRAMA.map((k) => `<option value="${k}">${IMENA_NA_DIAGRAMITE[k]}</option>`).join('')}
            </optgroup>
          </select>
        </div>
      </div>
      <p class="greshka" id="greshka-sektsiya"></p>
      <div class="deystviya">
        <button type="submit" class="glaven">Добави секцията</button>
        <button type="button" class="vtorichen" id="otkazhi-sektsiya">Откажи</button>
        <p class="drebno">Свързването с друга секция се прави след добавянето — от бутона „Свържи" на самата секция.</p>
      </div>
    </form>`;
}

export function zakachiTabove(koren: HTMLElement, k: Konteks, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLSelectElement>('#izbor-tab')?.addEventListener('change', async (e) => {
    izbranTab = (e.target as HTMLSelectElement).value;
    zapomniEkranno('tabove.izbran', izbranTab);
    dobavyamSektsiya = false;
    svarzvaneOtvoreno = '';
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#nov-tab')?.addEventListener('click', async () => {
    dobavyamTab = true;
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#otkazhi-tab')?.addEventListener('click', async () => {
    dobavyamTab = false;
    await prerisuvay();
  });

  const formaTab = koren.querySelector<HTMLFormElement>('#forma-tab');
  formaTab?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-tab')!;
    kazhi.textContent = '';
    try {
      const ime = String(new FormData(formaTab).get('ime') ?? '');
      const tab = napraviTab({ ime });
      // СЪЗДАВАНЕ, не поправка: `sazdayTab` отказва зает ключ. Дотук новото
      // име се записваше върху стария таб и той се връщаше ПРАЗЕН — секциите
      // му изчезваха без нито една дума (дефект от голямата сверка).
      await k.deystviya.sazdayTab(tab, { opId: `tab:${crypto.randomUUID()}` });
      izbranTab = tab.klyuch;
      zapomniEkranno('tabove.izbran', izbranTab);
      dobavyamTab = false;
      greshka = '';
      k.vest('dobre', `Табът „${tab.ime}" е създаден — добави му секции долу.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  /** Текущият таб от Огледалото · ако още го няма, се прави чисто нов. */
  const tabSega = async (klyuch: string, ime: string, statsionaren: boolean): Promise<Tab> => {
    const o = await k.deystviya.ogledalo();
    return o.tabove.get(klyuch) ?? napraviTab({ ime, klyuch, statsionaren });
  };
  const zapishiTaba = async (t: Tab, vest: string) => {
    await k.deystviya.zapishiTab(t, { opId: `tab:${crypto.randomUUID()}` });
    greshka = '';
    k.vest('dobre', vest);
    await prerisuvay();
  };

  koren.querySelector<HTMLButtonElement>('#nova-sektsiya')?.addEventListener('click', async () => {
    dobavyamSektsiya = true;
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#otkazhi-sektsiya')?.addEventListener('click', async () => {
    dobavyamSektsiya = false;
    await prerisuvay();
  });

  // Видът превключва коя листа с източници се вижда — деликатно, падащо меню.
  const vidNaSektsiya = koren.querySelector<HTMLSelectElement>('#sektsiya-vid');
  vidNaSektsiya?.addEventListener('change', () => {
    const iztochnikSelect = koren.querySelector<HTMLSelectElement>('#sektsiya-iztochnik');
    for (const grupa of koren.querySelectorAll<HTMLOptGroupElement>('[data-grupa]')) {
      grupa.hidden = grupa.dataset['grupa'] !== vidNaSektsiya.value;
    }
    const parva = koren.querySelector<HTMLOptionElement>(
      `[data-grupa="${vidNaSektsiya.value}"] option`,
    );
    if (iztochnikSelect && parva) iztochnikSelect.value = parva.value;
  });

  const formaSektsiya = koren.querySelector<HTMLFormElement>('#forma-sektsiya');
  formaSektsiya?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-sektsiya')!;
    kazhi.textContent = '';
    const klyuchTab = formaSektsiya.dataset['tab']!;
    const d = new FormData(formaSektsiya);
    try {
      const t = await tabSega(klyuchTab, imeNaStatsionaren(klyuchTab), eStatsionaren(klyuchTab));
      const nov = dobaviSektsiya(t, {
        ime: String(d.get('ime') ?? ''),
        vid: String(d.get('vid')) as VidSektsiya,
        iztochnik: String(d.get('iztochnik')),
      });
      dobavyamSektsiya = false;
      await zapishiTaba(nov, 'Секцията е добавена.');
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sektsiya-gore], [data-sektsiya-dolu]')) {
    b.addEventListener('click', async () => {
      const klyuch = b.dataset['sektsiyaGore'] ?? b.dataset['sektsiyaDolu']!;
      const kade = b.dataset['sektsiyaGore'] ? 'gore' : 'dolu';
      try {
        const t = await tabSega(izbranTab, imeNaStatsionaren(izbranTab), eStatsionaren(izbranTab));
        await zapishiTaba(premestiSektsiya(t, klyuch, kade), 'Редът е записан.');
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sektsiya-mahni]')) {
    b.addEventListener('click', async () => {
      const klyuch = b.dataset['sektsiyaMahni']!;
      try {
        const t = await tabSega(izbranTab, imeNaStatsionaren(izbranTab), eStatsionaren(izbranTab));
        const ime = t.sektsii.find((s) => s.klyuch === klyuch)?.ime ?? klyuch;
        await zapishiTaba(premahniSektsiya(t, klyuch), `Секцията „${ime}" е махната.`);
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sektsiya-svarzhi]')) {
    b.addEventListener('click', async () => {
      svarzvaneOtvoreno = svarzvaneOtvoreno === b.dataset['sektsiyaSvarzhi'] ? '' : b.dataset['sektsiyaSvarzhi']!;
      await prerisuvay();
    });
  }
  koren.querySelector<HTMLButtonElement>('#otkazhi-svarzhi')?.addEventListener('click', async () => {
    svarzvaneOtvoreno = '';
    await prerisuvay();
  });

  const formaSvarzhi = koren.querySelector<HTMLFormElement>('#forma-svarzhi');
  formaSvarzhi?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-svarzhi')!;
    kazhi.textContent = '';
    const klyuchSektsiya = formaSvarzhi.dataset['sektsiya']!;
    const d = new FormData(formaSvarzhi);
    try {
      const t = await tabSega(izbranTab, imeNaStatsionaren(izbranTab), eStatsionaren(izbranTab));
      const nov = svarzhiSektsii(t, klyuchSektsiya, String(d.get('izvor')), String(d.get('po')) as PoKakvo);
      svarzvaneOtvoreno = '';
      await zapishiTaba(nov, 'Секциите са свързани.');
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-sektsiya-razvarzhi]')) {
    b.addEventListener('click', async () => {
      const klyuch = b.dataset['sektsiyaRazvarzhi']!;
      try {
        const t = await tabSega(izbranTab, imeNaStatsionaren(izbranTab), eStatsionaren(izbranTab));
        await zapishiTaba(razvarzhiSektsiya(t, klyuch), 'Връзката е махната.');
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // АДРЕСНАТА КНИГА · номерът се дава от Стопанина, запис = ново събитие.
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-zapishi-nomer]')) {
    b.addEventListener('click', async () => {
      const [klyuchModel, indeks] = b.dataset['zapishiNomer']!.split('·');
      const pole = koren.querySelector<HTMLInputElement>(
        `[data-nomer-vhod="${CSS.escape(b.dataset['zapishiNomer']!)}"]`,
      );
      try {
        const o = await k.deystviya.ogledalo();
        const m = o.modeli.get(klyuchModel!);
        if (!m) throw new Error('Хедърът вече го няма.');
        const nomer = pole?.value.trim() === '' ? 0 : Number(pole?.value);
        if (Number.isNaN(nomer)) throw new Error(`„${pole?.value}" не е номер.`);
        // РОЛЯТА се СМЯТА от Журнала, не се твърди с литерал: пазачът
        // `samoUpravitel` иначе получава отговора, който иска (ADR-050).
        const nov = dayNomer(m, Number(indeks), nomer, rolyataNa(k.kojSam.imeyl, o));
        await k.deystviya.zapishiModel(nov, { opId: `model:${crypto.randomUUID()}` });
        greshka = '';
        k.vest('dobre', nomer === 0 ? 'Връзката е махната.' : `Колоната носи номер ${nomer}.`);
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // ЗАКАЧКИТЕ · много-към-много (M17). Смяната на вида е ПОГЛЕД — помни се на
  // екрана и не влиза в Журнала.
  for (const [id, koe] of [
    ['zak-vid-a', 'a'],
    ['zak-vid-b', 'b'],
  ] as const) {
    koren.querySelector<HTMLSelectElement>(`#${id}`)?.addEventListener('change', async (e) => {
      const v = (e.target as HTMLSelectElement).value;
      if (!eSashtnostZaZakachane(v)) return;
      if (koe === 'a') {
        vidA = v;
        zapomniEkranno('tabove.zakachki.vidA', v);
      } else {
        vidB = v;
        zapomniEkranno('tabove.zakachki.vidB', v);
      }
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLSelectElement>('#zak-red-a')?.addEventListener('change', async (e) => {
    redA = (e.target as HTMLSelectElement).value;
    zapomniEkranno('tabove.zakachki.redA', redA);
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#zak-zakachi')?.addEventListener('click', async () => {
    const idA = koren.querySelector<HTMLSelectElement>('#zak-red-a')?.value ?? '';
    const idB = koren.querySelector<HTMLSelectElement>('#zak-red-b')?.value ?? '';
    const zashto = koren.querySelector<HTMLInputElement>('#zak-zashto')?.value.trim() ?? '';
    try {
      // `opId` носи ДЕЙСТВИЕТО (правило 20): закачане СЛЕД разкачане е ново
      // решение. Ключ от двойката би върнал стария резултат и втората закачка
      // би изчезнала мълчаливо.
      await k.deystviya.zakachiRedove({ vid: vidA, id: idA }, { vid: vidB, id: idB }, zashto, {
        opId: `zakachka:${crypto.randomUUID()}`,
      });
      greshka = '';
      k.vest('dobre', 'Двата реда са закачени.');
      await prerisuvay();
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  });

  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-razkachi]')) {
    b.addEventListener('click', async () => {
      const klyuch = b.dataset['razkachi']!;
      try {
        const o = await k.deystviya.ogledalo();
        const z = o.zakachki.get(klyuch);
        if (!z) throw new Error('Тази закачка вече я няма.');
        await k.deystviya.razkachiRedove(z.a, z.b, '', {
          opId: `razkachka:${crypto.randomUUID()}`,
        });
        greshka = '';
        k.vest('dobre', 'Разкачени. Записът остава в Журнала.');
        await prerisuvay();
      } catch (err) {
        greshka = dumiZaGreshka(err);
        await prerisuvay();
      }
    });
  }

  // КЛИК ВЪРХУ РЕД · Select By. Втори клик на СЪЩИЯ ред разчиства избора.
  for (const red of koren.querySelectorAll<HTMLElement>('[data-sektsiya-red]')) {
    red.addEventListener('click', async () => {
      const sektsiya = red.dataset['sektsiyaRed']!;
      const redId = red.dataset['redId']!;
      if (izbraniIdta.get(sektsiya) === redId) {
        izbraniIdta.delete(sektsiya);
        izbraniRedove.delete(sektsiya);
      } else {
        izbraniIdta.set(sektsiya, redId);
        const t = await tabSega(izbranTab, imeNaStatsionaren(izbranTab), eStatsionaren(izbranTab));
        const s = t.sektsii.find((x) => x.klyuch === sektsiya);
        if (s) {
          const o = await k.deystviya.ogledalo();
          const red2 = redoveZaIztochnik(o, s.iztochnik as IztochnikTablitsa).find((r) => r.id === redId);
          if (red2) izbraniRedove.set(sektsiya, red2.klyuchove);
        }
      }
      await prerisuvay();
    });
  }
}
