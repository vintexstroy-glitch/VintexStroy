/**
 * ЗАПЛАТИТЕ · секция в Сметки, НАД Разходи (резен 20 · ADR-080).
 *
 * ═══ ЗАЩО В СМЕТКИ, А НЕ СВОЙ ЕКРАН ═══
 *
 * Заплатата е РАЗХОД, който още не е прехвърлен. Тя живее на един екран с
 * онова, в което се превръща — иначе човекът щеше да сменя екрана всеки петък,
 * за да сравни двете страни на едно и също число.
 *
 * ═══ КАКВО ПРАВИ И КАКВО НЕ ═══
 *
 * ПРАВИ: държи седмичния списък с неговите шест полета, смята седмичната
 * заплата и сбора, показва салдото на общия кеш-джоб, захранва го, прехвърля
 * седмицата в Разходи с един бутон и оставя СЛЕДА.
 *
 * НЕ ПРАВИ: не прехвърля само̀ („да се прави ръчно", р48·[83]), не пипа Банка
 * („само кешът се води") и не строи таба „Плащания Архив" — той е свой резен
 * и стои в описа на дълга, M06.
 */

import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { otLeva, pishi } from '../src/yadro/pari.js';
import {
  DZHOBAT_NA_ZAPLATITE,
  IMETO_NA_DZHOBA,
  keshaNaZaplatite,
  KOLONI_ZAPLATI,
  sedmitsataNa,
  sedmitsataZaEkrana,
  sedmitsiteSZapisi,
  type RedZaEkrana,
} from '../src/domein/zaplati.js';
import { saldoNa } from '../src/domein/otcheti.js';
import { chetiEkranno, zapomniEkranno } from './pamet-ekran.js';
import {
  filtriray,
  glaviNaTablitsata,
  grupiranaTablitsa,
  poleZaTarsene,
  PRAZEN_FILTAR,
  redZaSkritoto,
  type KolonaSFiltar,
} from './filtri.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/**
 * КОЛОНИТЕ ЗА ДВИГАТЕЛЯ НА ФИЛТРИТЕ (резен 75 · И124 т.2) · „модерен филтър
 * на всяка колона в таблица". Имената идват от `KOLONI_ZAPLATI` — един дом
 * (правило 17); суровите стойности идват от реда, не от боядисания текст,
 * за да групира еврото по прагове и числото като число.
 */
const KOLONI_S_FILTAR: readonly KolonaSFiltar<RedZaEkrana>[] = [
  { klyuch: KOLONI_ZAPLATI[0]!, ime: KOLONI_ZAPLATI[0]!, vid: 'tekst', vzemi: (r) => (r.zaplata.proektId === '' ? '— без проект' : r.zaplata.proektId) },
  { klyuch: KOLONI_ZAPLATI[1]!, ime: KOLONI_ZAPLATI[1]!, vid: 'tekst', vzemi: (r) => r.zaplata.ime },
  { klyuch: KOLONI_ZAPLATI[2]!, ime: KOLONI_ZAPLATI[2]!, vid: 'tekst', vzemi: (r) => r.zaplata.dlazhnost },
  { klyuch: KOLONI_ZAPLATI[3]!, ime: KOLONI_ZAPLATI[3]!, vid: 'tekst', vzemi: (r) => r.zaplata.obekt },
  { klyuch: KOLONI_ZAPLATI[4]!, ime: KOLONI_ZAPLATI[4]!, vid: 'evro', vzemi: (r) => r.zaplata.dnevna_st },
  { klyuch: KOLONI_ZAPLATI[5]!, ime: KOLONI_ZAPLATI[5]!, vid: 'chislo', vzemi: (r) => r.zaplata.dni },
  {
    klyuch: KOLONI_ZAPLATI[6]!,
    ime: KOLONI_ZAPLATI[6]!,
    vid: 'evro',
    vzemi: (r) => r.sedmichna_st,
    // сметната · пише я никой, гледа я всеки (правило 23)
    zatvorena: true,
  },
];

/** Коя седмица е отворена · ПОГЛЕД, нула събития (ADR-022). */
function izbranata(o: Ogledalo, dnes: string): string {
  const zapomneno = chetiEkranno('zaplati.sedmitsa', '');
  if (zapomneno !== '') return zapomneno;
  const sas = sedmitsiteSZapisi(o);
  return sas[0] ?? sedmitsataNa(dnes);
}

/** Стойността на една клетка · един дом за „кое къде е" (правило 17). */
function kletkata(r: RedZaEkrana, kolona: string): string {
  const z = r.zaplata;
  switch (kolona) {
    case 'Проект':
      return z.proektId === '' ? '— без проект' : z.proektId;
    case 'Име':
      return z.ime;
    case 'Длъжност':
      return z.dlazhnost;
    case 'Обект':
      return z.obekt;
    case 'Дневна ставка':
      return pishi(z.dnevna_st);
    case 'Дни':
      return String(z.dni);
    default:
      return pishi(r.sedmichna_st);
  }
}

export function blokNaZaplatite(o: Ogledalo, dnes: string): string {
  const sedmitsa = izbranata(o, dnes);
  const s = sedmitsataZaEkrana(o, sedmitsa);
  const kesh = keshaNaZaplatite(o, saldoNa(o, DZHOBAT_NA_ZAPLATITE));
  const vsichki = sedmitsiteSZapisi(o);
  const filtrirani = filtriray('zaplati', s.redove, KOLONI_S_FILTAR, dnes);

  return `
    <section data-sektsiya="zaplati" data-sedmitsa="${ekraniraj(sedmitsa)}">
      <div class="dyalglava">
        <h2>Заплати · ${ekraniraj(sedmitsa)}</h2>
        <span translate="no">${ekraniraj(s.ot)} – ${ekraniraj(s.do_)}</span>
      </div>

      <div class="plochki">
        <div class="plochka">
          <span class="etiket">${ekraniraj(IMETO_NA_DZHOBA)}</span>
          <span class="chislo" translate="no" data-kesh="${kesh.saldo_st}">${pishi(
            kesh.saldo_st,
          )}</span>
          <span class="pod">начало + захранено ${pishi(kesh.zahraneno_st)} − платено ${pishi(
            kesh.plateno_st,
          )}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Сбор на седмицата</span>
          <span class="chislo" translate="no" data-sbor="${s.sbor_st}">${pishi(s.sbor_st)}</span>
          <span class="pod">${s.redove.length} ${s.redove.length === 1 ? 'ред' : 'реда'} · СМЯТА се</span>
        </div>
        <div class="plochka${s.prehvarlena ? '' : ' duljimo'}">
          <span class="etiket">В Разходи</span>
          <span class="chislo" translate="no" data-prehvarlena="${s.prehvarlena ? 'da' : 'ne'}">${
            s.prehvarlena ? 'прехвърлена' : 'не е'
          }</span>
          <span class="pod">${s.zamrazena ? 'и ЗАМРАЗЕНА' : 'ръчно, в петък'}</span>
        </div>
      </div>

      <p class="drebno"><b>Джобът е ЕДИН.</b> Негово: „Един общ кеш-джоб за
      фирмата" за Заплати и Фактури Кеш заедно, и „Кеш = Трезор". Затова тук няма
      избор на джоб — избор с един вариант е поле, което лъже, че има решение.
      <b>Фактури Кеш още не се вадят оттук</b>, защото таблицата им я няма
      (описът на дълга, M06) — числото е честно за онова, което днес го харчи.</p>

      <form id="forma-zahranvane" class="redditsa">
        <label class="pole">
          <span>Захрани кеша</span>
          <input translate="no" name="suma" id="zahranvane-suma" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Дата</span>
          <input translate="no" type="date" name="data" id="zahranvane-data">
        </label>
        <label class="pole">
          <span>Бележка</span>
          <input translate="no" name="belezhka" id="zahranvane-belezhka" placeholder="откъде">
        </label>
        <button type="submit">Вкарай пари</button>
      </form>
      <p class="greshka" id="greshka-zahranvane"></p>

      ${
        vsichki.length === 0
          ? ''
          : `<label class="pole">
          <span>Седмица</span>
          <select translate="no" id="izbor-sedmitsa">
            ${vsichki
              .map(
                (x) =>
                  `<option value="${ekraniraj(x)}"${x === sedmitsa ? ' selected' : ''}>${ekraniraj(
                    x,
                  )}</option>`,
              )
              .join('')}
          </select>
        </label>`
      }

      ${
        s.zashto === ''
          ? `<form id="forma-zaplata" class="redditsa">
        <label class="pole">
          <span>Проект</span>
          <select translate="no" name="proekt" id="zaplata-proekt">
            <option value="">— без проект</option>
            ${[...o.imoti.values()]
              .map((i) => `<option value="${ekraniraj(i.id)}">${ekraniraj(i.adres)}</option>`)
              .join('')}
          </select>
        </label>
        <label class="pole">
          <span>Име</span>
          <input translate="no" name="ime" id="zaplata-ime" placeholder="Иван Петров">
        </label>
        <label class="pole">
          <span>Длъжност</span>
          <input translate="no" name="dlazhnost" id="zaplata-dlazhnost" placeholder="зидар">
        </label>
        <label class="pole">
          <span>Обект</span>
          <input translate="no" name="obekt" id="zaplata-obekt" placeholder="бл. 3 · ап. 12">
        </label>
        <label class="pole">
          <span>Дневна ставка</span>
          <input translate="no" name="dnevna" id="zaplata-dnevna" inputmode="decimal" placeholder="0,00">
        </label>
        <label class="pole">
          <span>Дни</span>
          <input translate="no" type="number" min="1" max="7" name="dni" id="zaplata-dni" value="5">
        </label>
        <label class="pole">
          <span>Дата</span>
          <input translate="no" type="date" name="data" id="zaplata-data">
        </label>
        <button type="submit">Запиши заплата</button>
      </form>
      <p class="greshka" id="greshka-zaplata"></p>`
          : `<p class="drebno" data-zamrazena="da"><b>${ekraniraj(s.zashto)}</b></p>`
      }

      ${poleZaTarsene('zaplati')}
      <div class="tablitsa" data-tablitsa="zaplati">
        <div class="red glava zaplatared" translate="no">
          ${glaviNaTablitsata('zaplati', KOLONI_S_FILTAR, s.redove, dnes)}
        </div>
        ${
          s.redove.length === 0
            ? '<p class="drebno">Няма нито един ред за тази седмица.</p>'
            : filtrirani.redove.length === 0
              ? PRAZEN_FILTAR
              : grupiranaTablitsa('zaplati', filtrirani.redove, KOLONI_S_FILTAR, dnes, (r) => `
        <div class="red zaplatared" translate="no" data-zaplata="${ekraniraj(r.zaplata.id)}"
             data-sedmichna="${r.sedmichna_st}">
          ${KOLONI_ZAPLATI.map(
            (k) =>
              `<span class="kletka${k === 'Седмична заплата' ? ' suma zatvorena' : ''}"${
                k === 'Седмична заплата' ? ` data-st="${r.sedmichna_st}"` : ''
              }>${ekraniraj(kletkata(r, k))}</span>`,
          ).join('')}
        </div>`)
        }
      </div>
      ${redZaSkritoto(filtrirani, 'zaplati')}
      <p class="drebno"><b>Седмичната заплата се СМЯТА</b> — дневна ставка × дни.
      Затова колоната ѝ е сива: тя не се редактира от никого, дори от Стопанина.
      Записана като поле, щеше да се разминава с двата си множителя в деня, в
      който единият се поправи.</p>

      <section data-sektsiya="zaplati-prehvarlyane">
        <div class="dyalglava">
          <h2>Прехвърляне в Разходи</h2>
          <span>РЪЧНО · „когато се актуализира в Петък обикновенно"</span>
        </div>
        ${
          s.prehvarlena
            ? `<p class="drebno" data-sleda="${
                o.prehvarleniSedmitsi.get(sedmitsa)!.razhodId
              }"><b>Следата:</b> седмица ${ekraniraj(sedmitsa)} е прехвърлена за
              <b translate="no">${pishi(s.sbor_st)}</b> и роди разход
              <code translate="no">${ekraniraj(o.prehvarleniSedmitsi.get(sedmitsa)!.razhodId)}</code>
              на ${ekraniraj(o.prehvarleniSedmitsi.get(sedmitsa)!.kogato.slice(0, 10))},
              от ${ekraniraj(o.prehvarleniSedmitsi.get(sedmitsa)!.koy)}.
              Второ прехвърляне се отказва — то би удвоило разхода за същите дни.</p>`
            : `<form id="forma-prehvarlyane" class="redditsa">
          <label class="pole">
            <input type="checkbox" id="prehvarli-zamrazi">
            <span>и ЗАМРАЗИ седмицата</span>
          </label>
          <button type="submit"${s.redove.length === 0 ? ' disabled' : ''}>Прехвърли седмицата</button>
        </form>
        <p class="greshka" id="greshka-prehvarlyane"></p>
        <p class="drebno">Прехвърлянето ражда <b>ЕДИН</b> разход по потока
        „Заплати", с дата неделята на седмицата. Следата остава тук: коя седмица,
        кога, от кого и кой разход е родила — тя се СМЯТА от Журнала, а не се
        пази като поле, защото поле „прехвърлена" щеше да твърди своето и след
        сторно на разхода.</p>`
        }
        <p class="drebno"><b>„Замрази седмицата" е ВТОРИ, по-тесен катинар.</b>
        ДДС-справката заключва МЕСЕЦ (правило 9) и остава законовият; този тук
        затваря само заплатите на една седмица. Слети, отварянето на единия щеше
        да отвори и другия.</p>
      </section>
    </section>`;
}

export function zakachiZaplatite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  koren.querySelector<HTMLSelectElement>('#izbor-sedmitsa')?.addEventListener('change', async (e) => {
    zapomniEkranno('zaplati.sedmitsa', (e.target as HTMLSelectElement).value);
    await prerisuvay();
  });

  const formaZ = koren.querySelector<HTMLFormElement>('#forma-zaplata');
  formaZ?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-zaplata')!;
    kazhi.textContent = '';
    const d = new FormData(formaZ);
    const data = String(d.get('data') ?? '');
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        throw new Error('Заплатата иска дата — от нея се смята седмицата.');
      }
      const sedmitsa = sedmitsataNa(data);
      await k.deystviya.zapishiZaplata(
        {
          zaplataId: `ZP:${crypto.randomUUID()}`,
          sedmitsa,
          proektId: String(d.get('proekt') ?? ''),
          ime: String(d.get('ime') ?? '').trim(),
          dlazhnost: String(d.get('dlazhnost') ?? '').trim(),
          obekt: String(d.get('obekt') ?? '').trim(),
          dnevna_st: otLeva(String(d.get('dnevna') || '0')),
          dni: Number(d.get('dni') ?? 5),
        },
        { opId: `zaplata:${crypto.randomUUID()}` },
      );
      zapomniEkranno('zaplati.sedmitsa', sedmitsa);
      k.vest('dobre', 'Заплатата е записана · седмичната сума се смята.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaZah = koren.querySelector<HTMLFormElement>('#forma-zahranvane');
  formaZah?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-zahranvane')!;
    kazhi.textContent = '';
    const d = new FormData(formaZah);
    try {
      await k.deystviya.zahraniKesha(
        {
          zahranvaneId: `KS:${crypto.randomUUID()}`,
          suma_st: otLeva(String(d.get('suma') || '0')),
          data: String(d.get('data') ?? ''),
          belezhka: String(d.get('belezhka') ?? '').trim(),
        },
        { opId: `kesh:${crypto.randomUUID()}` },
      );
      k.vest('dobre', 'Кешът е захранен · салдото се вдигна със сумата.');
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });

  const formaP = koren.querySelector<HTMLFormElement>('#forma-prehvarlyane');
  formaP?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kazhi = koren.querySelector<HTMLElement>('#greshka-prehvarlyane')!;
    kazhi.textContent = '';
    const sedmitsa =
      koren.querySelector<HTMLElement>('[data-sektsiya=zaplati]')?.dataset['sedmitsa'] ?? '';
    const zamrazi = koren.querySelector<HTMLInputElement>('#prehvarli-zamrazi')?.checked === true;
    try {
      await k.deystviya.prehvarliSedmitsata(sedmitsa, zamrazi, {
        opId: `sedmitsa:${crypto.randomUUID()}`,
      });
      k.vest('dobre', `Седмица ${sedmitsa} влезе в Разходи · следата остава тук.`);
      await prerisuvay();
    } catch (err) {
      kazhi.textContent = dumiZaGreshka(err);
    }
  });
}
