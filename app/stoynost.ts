/**
 * СТОЙНОСТ НА СЪСТОЯНИЕ (КАЛКУЛАТОР) · шестият екран.
 *
 * Негови думи (23.08), които дадоха и името, и съдържанието:
 *
 *   „**Новото име е Стойност на Състояние (Калкулатор).** Пресмята всичките
 *    налични имоти в движение като наеми и продажби, и вкарани през Управление
 *    се появяват в Калкулатора; **намираш се в Стойност на Състояние, където
 *    сборът е тази стойност на състоянието общо**. Другото е старо име."
 *
 * И за пътищата:
 *
 *   „Има вече една папка с площите и друга с Ценови листи. **Чете от папката с
 *    площите и записва в таблицата с Цените.**"
 *
 * ЗАТОВА ЕКРАНЪТ ИМА ТОЧНО ДВА БУТОНА, и всеки с ЕДНА посока (правило 20):
 * единият ЧЕТЕ площообразуването, другият ПИША ценовата листа. Бутон, който
 * чете, няма път към писане.
 *
 * „НЯМА РЕДАКЦИЯ ОТТАМ, А САМО ИЗЧИСЛЯВАНЕ" — негово изречение от 09.08, и
 * затова тук няма нито едно поле за писане в таблицата. Числата се смятат и се
 * показват; в Журнала влиза изборът на матрица, не самите цени.
 */

import { kakvoPishe } from '../src/yadro/pari.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { bezPrazni, type Tablitsa } from '../src/iztochnik/tablitsa.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import {
  eListSPloshti,
  IMENA_NA_VIDOVETE_OBEKT,
  kvSmVM2,
  prochetiPloshti,
  type ProchetenObekt,
} from '../src/kalkulator/chetene.js';
import { MATRITSA_ZA_RAZRABOTKA } from '../src/kalkulator/matritsa.js';
import {
  sverkaNaPartida,
  stoynostNaSastoyanie,
  type OtTsenovaLista,
  type StoynostNaSastoyanie,
} from '../src/kalkulator/stoynost.js';
import { listNaTsenite, prochetiTsenovaLista } from '../src/kalkulator/tsenova-lista.js';
import { ekraniraj } from './imoti.js';
import type { Konteks } from './main.js';

/** Прочетеното живее, докато екранът стои отворен — в Журнала влиза избор, не цени. */
let obekti: readonly ProchetenObekt[] = [];
let otLista: ReadonlyMap<string, OtTsenovaLista> = new Map();
let smetnato: StoynostNaSastoyanie | null = null;
let vest = '';
let greshka = '';

export function narisuvayStoynost(): string {
  return `
    <div class="plochki">
      <div class="plochka golyama">
        <span class="etiket">Стойност на Състояние</span>
        <span class="chislo" translate="no">${smetnato ? kakvoPishe(smetnato.obshto_st as never) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `${smetnato.broy} ${smetnato.broy === 1 ? 'обект' : 'обекта'} в движение${
                smetnato.prodadeni ? ` · ${smetnato.prodadeni} продадени не влизат` : ''
              }`
            : 'прочети площообразуването, за да се смята'
        }</span>
      </div>
      <div class="plochka">
        <span class="etiket">Точно, преди закръгляне</span>
        <span class="chislo" translate="no">${smetnato ? kakvoPishe(smetnato.obshto_tochno_st as never) : '—'}</span>
        <span class="pod">${
          smetnato
            ? `закръглено: ${smetnato.razlika_st >= 0 ? '+' : ''}${kakvoPishe(Math.abs(smetnato.razlika_st) as never)}`
            : 'сборът се смята точно и се закръгля веднъж'
        }</span>
      </div>
      <div class="plochka">
        <span class="etiket">Матрица</span>
        <span class="chislo malka" translate="no">${ekraniraj(MATRITSA_ZA_RAZRABOTKA.rayon)}</span>
        <span class="pod">база ${kakvoPishe(MATRITSA_ZA_RAZRABOTKA.baza_st.apartament as never)}/м² за апартамент</span>
      </div>
    </div>

    ${vest ? `<div class="vest dobre">${ekraniraj(vest)}</div>` : ''}
    ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}

    <section>
      <div class="dyalglava">
        <h2>Двата пътя</h2>
        <span>посоката е ЕДНА · бутон, който чете, няма път към писане</span>
      </div>
      <div class="deystviya">
        <button type="button" class="glaven" id="cheti-ploshti">Чети от Площообразуване</button>
        <button type="button" class="vtorichen" id="cheti-tseni">Чети Ценова листа</button>
        <button type="button" class="vtorichen" id="pishi-tseni"${smetnato ? '' : ' disabled'}>Запиши в Ценови листи</button>
      </div>
      <input type="file" id="fayl-ploshti" accept=".xlsx,.csv" hidden>
      <input type="file" id="fayl-tseni" accept=".xlsx,.csv" hidden>
      <p class="drebno">Площообразуването дава <b>обект · етаж · чиста и обща площ</b>; общите части се смятат от разликата. Ценовата листа дава <b>изложение, стаи и тераси</b> и казва кое е <b>ПРОДАДЕН</b>. Таблицата не се пресъздава — взима се само нужното.</p>
    </section>

    ${smetnato ? tablitsaNaStoynostta(smetnato) : ''}`;
}

function tablitsaNaStoynostta(s: StoynostNaSastoyanie): string {
  return `
    <section>
      <div class="dyalglava">
        <h2>Обектите</h2>
        <span>${s.redove.length} реда · сборът отгоре е стойността на състоянието</span>
      </div>
      <div class="tablitsa">
        <div class="glava stoynost">
          <span>Обект</span><span>Етаж</span><span>Вид</span>
          <span class="suma">Чиста</span><span class="suma">Обща</span>
          <span>Изложение</span><span class="suma">Цена</span><span class="suma">€/м²</span>
        </div>
        ${s.redove.map(redNaObekt).join('')}
        <div class="red stoynost sbor" translate="no">
          <span class="kletka"><b>Стойност на Състояние</b><span>без продаденото</span></span>
          <span></span><span></span><span></span><span></span><span></span>
          <span class="suma plateno">${kakvoPishe(s.obshto_st as never)}</span>
          <span></span>
        </div>
      </div>
      <p class="drebno">Цената на всеки обект е закръглена <b>нагоре до стотица</b>; сборът се смята от <b>точните</b> цени и се закръгля веднъж — закръгленото никога не влиза в сбор.</p>
    </section>`;
}

function redNaObekt(r: StoynostNaSastoyanie['redove'][number]): string {
  return `
    <div class="red stoynost${r.prodaden ? ' mahnata' : ''}" translate="no">
      <span class="kletka"><b>${ekraniraj(r.obekt)}</b>${
        r.terasi_kvsm ? `<span>тераса ${kvSmVM2(r.terasi_kvsm)} м²</span>` : ''
      }</span>
      <span>${ekraniraj(r.etazh)}</span>
      <span>${IMENA_NA_VIDOVETE_OBEKT[r.vid]}${r.stai ? ` · ${r.stai} стаи` : ''}</span>
      <span class="suma">${kvSmVM2(r.chista_kvsm)}</span>
      <span class="suma">${kvSmVM2(r.obshta_kvsm)}</span>
      <span>${ekraniraj(r.izlozhenie) || '—'}</span>
      <span class="suma${r.prodaden ? '' : ' plateno'}">${
        r.prodaden ? '<span class="znachka tiha">ПРОДАДЕН</span>' : kakvoPishe(r.tsena_st as never)
      }</span>
      <span class="suma">${r.prodaden ? '' : kakvoPishe(r.evroNaKvadrat_st as never)}</span>
    </div>`;
}

// ── закачането ─────────────────────────────────────────────────────────────
export function zakachiStoynost(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  const presmetni = (): void => {
    smetnato = obekti.length === 0 ? null : stoynostNaSastoyanie(obekti, otLista);
  };

  const poleto = (id: string): HTMLInputElement | null =>
    koren.querySelector<HTMLInputElement>(`#${id}`);

  koren.querySelector<HTMLButtonElement>('#cheti-ploshti')?.addEventListener('click', () => {
    poleto('fayl-ploshti')?.click();
  });
  koren.querySelector<HTMLButtonElement>('#cheti-tseni')?.addEventListener('click', () => {
    poleto('fayl-tseni')?.click();
  });

  poleto('fayl-ploshti')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const t = await tablitsiOtFayl(fayl, eListSPloshti);
      const vsichki: ProchetenObekt[] = [];
      let propusnati = 0;
      for (const tablitsa of t) {
        const r = prochetiPloshti(tablitsa);
        vsichki.push(...r.obekti);
        propusnati += r.propusnati;
      }
      obekti = Object.freeze(vsichki);
      presmetni();
      // Сверката вход↔изход се казва на глас, дори когато е нула (правило 7).
      const sv = smetnato ? sverkaNaPartida(obekti, smetnato) : { vhod: 0, izhod: 0, razlika: 0 };
      vest =
        `Прочетени ${sv.vhod} обекта → ${sv.izhod} реда · разлика ${sv.razlika}` +
        (propusnati ? ` · ${propusnati} пропуснати реда без четими числа` : '');
      greshka = '';
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
    }
    await prerisuvay();
  });

  poleto('fayl-tseni')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const t = await tablitsiOtFayl(fayl, () => true);
      const slyato = new Map<string, OtTsenovaLista>();
      for (const tablitsa of t) {
        for (const [ime, danni] of prochetiTsenovaLista(tablitsa)) slyato.set(ime, danni);
      }
      otLista = slyato;
      presmetni();
      vest = `Ценовата листа даде изложение и състояние за ${slyato.size} обекта.`;
      greshka = '';
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#pishi-tseni')?.addEventListener('click', async () => {
    if (!smetnato) return;
    try {
      const bajtove = await rabotnaKniga([listNaTsenite(smetnato.redove)]);
      const fayl = new Blob([bajtove.slice().buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const adres = URL.createObjectURL(fayl);
      const vruzka = document.createElement('a');
      vruzka.href = adres;
      vruzka.download = `ЦЕНИ-${new Date().toISOString().slice(0, 10)}.xlsx`;
      vruzka.click();
      URL.revokeObjectURL(adres);
      k.vest('dobre', `Ценовата листа е записана: ${smetnato.redove.length} реда с неговия хедър.`);
    } catch (err) {
      greshka = err instanceof Error ? err.message : String(err);
      await prerisuvay();
    }
  });
}

/**
 * Разчита избрания файл и връща листовете, които минават през ситото.
 *
 * Полето за файл живее В РАЗМЕТКАТА, а не се прави в движение: така работи и
 * в браузър без модерния избирач, и машина може да го напълни (проходът).
 */
async function tablitsiOtFayl(
  fayl: File,
  sito: (ime: string) => boolean,
): Promise<Tablitsa[]> {
  const danni = await fayl.arrayBuffer();
  const tablitsi = fayl.name.toLowerCase().endsWith('.csv')
    ? [otCSV(new TextDecoder().decode(danni), fayl.name)]
    : await otXLSX(new Uint8Array(danni), fayl.name);
  const vsichki = tablitsi.map(bezPrazni);
  // Ситото е за книга с МНОГО листове: там „Sheet3" и „разбивка" носят друг
  // обект и биха добавили чужди квадрати. Файл с един лист е самият той —
  // изнесеното от човека рядко се казва „площо".
  if (vsichki.length <= 1) return vsichki;

  const minali = vsichki.filter((t) => sito(t.ime));
  if (minali.length === 0) {
    throw new Error(
      `Във „${fayl.name}" няма лист с площи. От книга с много листове се четат ` +
        'само „площо" и „земя" — останалите носят друг обект или обобщения.',
    );
  }
  return minali;
}
