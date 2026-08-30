/**
 * СЕКЦИЯ „ЖУРНАЛЪТ" в Настройки · поправката през таблица (И96 т.8).
 *
 * Негови думи, дословно:
 *
 *   „**Журнала само от Настройки на стопанина** и не се трие пак. Може през
 *    **таблица в ексела** дори създадена от приложението да се редактира… и да
 *    се отчете в Журнала за **случая на промяна и дата на файла**… **Няма
 *    редакция, а НОВ ФАЙЛ ЗАЛЕПЕН ЗА СТАРИЯ** в журнала… скачени с **ТРЕТИ
 *    НОМЕР обединяващ и двата**."
 *
 * ═══ ТРИТЕ КРАЧКИ, И ВСЯКА Е ВИДИМА ═══
 *
 *   1 · ИЗНЕСИ — Журналът слиза като ЧЕТИМА таблица, не като JSON;
 *   2 · ВЪРНИ — редактираната таблица се СВЕРЯВА и показва какво ще стане;
 *   3 · ЗАПИШИ — сторно + нов запис за всяка промяна, и свръзка отгоре.
 *
 * Между 2 и 3 стои човекът. Модулът предлага; записва той (правило 18).
 *
 * ═══ ЗАЩО ЦЕЛИЯТ ПЪТ Е ТУК, А НЕ НА ЕКРАНА С ЖУРНАЛА ═══
 *
 * „само от Настройки на стопанина" е негово изречение. Поправката на минал
 * запис не бива да е на един клик от мястото, където се работи всеки ден.
 */

import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { dnesKato, ekraniraj, svaliFayl } from './obshto.js';
import { otXLSX } from '../src/iztochnik/xlsx.js';
import { otCSV } from '../src/iztochnik/csv.js';
import { bezPrazni } from '../src/iztochnik/tablitsa.js';
import { rabotnaKniga } from '../src/iznos/excel.js';
import {
  GreshkaTablitsa,
  listNaZhurnala,
  otpechatakNaFayla,
  novPayload,
  pishiSvrazka,
  sledvashtSvrazkaNomer,
  sveriTablitsata,
  zashtoNeSePriema,
  type Predlozhenie,
} from '../src/domein/zhurnal-ot-tablitsa.js';
import {
  PRAZEN_FILTAR,
  zhurnalatZaEkrana,
  type FiltarNaZhurnala,
  type Sesiya,
} from '../src/domein/sesii.js';
import type { Sabitie } from '../src/yadro/index.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { Konteks } from './ekranite.js';

/**
 * ЖУРНАЛЪТ, ПРОЧЕТЕН ЗА ГЛЕДАНЕ · живее, докато секцията стои отворена.
 *
 * Не се чете при ВСЯКО рисуване на Настройки: това е цялата книга, а секцията
 * се показва и когато никой не я гледа. Чете се, когато човек поиска.
 */
let kniga: readonly Sabitie[] | null = null;
let filtar: FiltarNaZhurnala = PRAZEN_FILTAR;

/** Прочетеното живее, докато секцията стои отворена. */
let predlozheno: Predlozhenie | null = null;
let imeNaFayla = '';
let otpechatak = '';
/** Датата НА ФАЙЛА · различна от датата на записа, нарочно. */
let dataNaFayla = '';
let sluchay = '';
let greshka = '';

/** Изчиства, когато екранът се напусне или промяната е записана. */
function zabraviTablitsata(): void {
  predlozheno = null;
  imeNaFayla = '';
  otpechatak = '';
  greshka = '';
}

export function sektsiyaZhurnalat(o: Ogledalo, sabitiya: number, dnes: string): string {
  const svrazki = [...o.svrazki.values()];
  return `
    <section data-sektsiya="zhurnalat">
      <div class="dyalglava">
        <h2>Журналът · поправка от таблица</h2>
        <span>само оттук и само от собственика · Журналът НЕ се трие</span>
      </div>

      <div class="deystviya">
        <button type="button" class="glaven" id="zhurnal-iznesi">Изнеси Журнала като таблица</button>
        <button type="button" class="vtorichen" id="zhurnal-varni">Върни редактираната таблица</button>
        <input translate="no" type="file" id="zhurnal-fayl" accept=".xlsx,.csv" hidden>
      </div>
      <p class="drebno"><b>Няма редакция — има нов файл, залепен за стария.</b> Поправеният ред влиза като <b>сторно + нов запис</b> (правило 9); старият остава завинаги. Двата файла се скачват с <b>трети номер</b>, който има СВОЯ номерация — извън графата на нормалния ред. Редактират се само <b>Описание</b> и <b>Сума</b>; всичко останало е заключено, за да не мине сортирана в Ексел таблица за партида поправки.</p>
      <p class="drebno">Изнесеното носи ${sabitiya} ${sabitiya === 1 ? 'събитие' : 'събития'}. Точният износ с хешовете остава <b>JSON</b> — той е за връщане на цял Журнал, не за четене.</p>

      ${greshka ? `<div class="vest zle">${ekraniraj(greshka)}</div>` : ''}
      ${predlozheno ? predlozhenieto(predlozheno) : ''}
      ${svrazki.length ? tablitsaNaSvrazkite(svrazki) : ''}
    </section>

    ${blokNaSesiite(dnes)}`;
}

/**
 * СЕСИИТЕ НА РЕДАКТОРА · неговата находка, стигнала до екран (резен 26).
 *
 * „ако все пак сложим ДАТА И ИМЕ на журнала за търсене в него… промените
 * направени от всеки като СЕСИЯ на всяка стъпка… а когато е ИЗКЛЮЧЕН фултъра
 * там се показва ДНЕВНАТА сесия за всеки редактор" *(р84·[20])*.
 *
 * Книгата се чете С БУТОН, а не при всяко рисуване на Настройки: тя е цялата
 * история, а секцията стои на екрана и когато никой не я гледа.
 */
function blokNaSesiite(dnes: string): string {
  if (kniga === null) {
    return `
    <section data-sektsiya="zhurnal-sesii" data-otvoren="ne">
      <div class="dyalglava">
        <h2>Сесиите на редактора</h2>
        <span>кой какво е пипал · по тайминга на записа</span>
      </div>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="sesii-otvori">Отвори сесиите</button>
      </div>
      <p class="drebno">Книгата се чете чак когато поискаш — тя е цялата история,
      а тази секция стои тук и когато никой не я гледа. <b>Нищо не се записва:</b>
      сесията се СМЯТА от подписаните „кой" и „кога", значи е вярна и върху книга,
      донесена отвън.</p>
    </section>`;
  }

  const izgled = zhurnalatZaEkrana(kniga, filtar, dnes, new Date().toISOString());
  return `
    <section data-sektsiya="zhurnal-sesii" data-otvoren="da"
             data-izklyuchen="${izgled.izklyuchen ? 'da' : 'ne'}">
      <div class="dyalglava">
        <h2>Сесиите на редактора</h2>
        <span data-sesii="${izgled.sesii.length}">${izgled.sesii.length} ${
          izgled.sesii.length === 1 ? 'сесия' : 'сесии'
        }${izgled.izklyuchen ? ` · днешният ден (${ekraniraj(dnes)})` : ' · по филтъра'}</span>
      </div>

      <div class="poleta">
        <label class="pole"><span>От дата</span>
          <input translate="no" type="date" id="sesii-ot" value="${ekraniraj(filtar.ot)}"></label>
        <label class="pole"><span>До дата</span>
          <input translate="no" type="date" id="sesii-do" value="${ekraniraj(filtar.do_)}"></label>
        <label class="pole"><span>Име</span>
          <input translate="no" id="sesii-koy" list="spisak-redaktori"
                 value="${ekraniraj(filtar.koy)}" placeholder="имейл или част от него"></label>
        <label class="pole"><span>Търси</span>
          <input translate="no" id="sesii-tarsi" value="${ekraniraj(filtar.tarsi)}"
                 placeholder="вид · същност · товар"></label>
      </div>
      <datalist id="spisak-redaktori" translate="no">
        ${izgled.redaktori.map((x) => `<option value="${ekraniraj(x)}"></option>`).join('')}
      </datalist>
      <div class="deystviya">
        <button type="button" class="vtorichen" id="sesii-izchisti">Изчисти филтъра</button>
        <button type="button" class="vtorichen" id="sesii-zatvori">Затвори</button>
      </div>

      ${
        izgled.izklyuchen
          ? `<p class="drebno"><b>Филтърът е изключен</b>, затова тук стои
             ДНЕШНИЯТ ден за всеки редактор. Изключено не значи „покажи всичко" —
             целият Журнал наведнъж е износът, не екранът.</p>`
          : ''
      }

      ${
        izgled.sesii.length === 0
          ? '<p class="prazno">Нито една сесия по този филтър. Празното е отговор, не грешка.</p>'
          : izgled.sesii.map(redNaSesiya).join('')
      }

      <div class="tablitsa">
        <div class="red sverka" translate="no">
          <span class="kletka"><b>Сверка вход↔изход</b><span>през филтъра ↔ в сесиите</span></span>
          <span class="suma" data-st="${izgled.sverka.vhod}">${izgled.sverka.vhod}</span>
          <span class="suma" data-st="${izgled.sverka.izhod}">${izgled.sverka.izhod}</span>
          <span class="suma${izgled.sverka.razlika === 0 ? '' : ' duljimo'}"
                data-razlika="${izgled.sverka.razlika}">${izgled.sverka.razlika}</span>
        </div>
      </div>
      <p class="drebno">Разликата се показва и когато е нула. Тя лови точно едно:
      ред, който филтърът е пуснал, а групирането е изгубил — на екран такова нещо
      изглежда като „човекът не е работил", не като грешка.</p>
    </section>`;
}

/** Една сесия · името, денят, часовете, и редовете под тях. */
function redNaSesiya(s: Sesiya): string {
  return `
    <div class="karta sesiya" data-sesiya="${ekraniraj(`${s.den}·${s.koy}`)}"
         data-broy="${s.broy}">
      <div class="dyalglava">
        <h3 translate="no">${ekraniraj(s.koy)}</h3>
        <span translate="no">${ekraniraj(s.den)} · ${ekraniraj(s.ot)}–${ekraniraj(s.do_)} · ${
          s.broy
        } ${s.broy === 1 ? 'запис' : 'записа'}</span>
      </div>
      ${s.redove
        .map(
          (r) => `<div class="istoriya-sabitie" translate="no" data-seq="${r.seq}">
        <span class="seq">№ ${r.seq}</span>
        <b>${ekraniraj(r.type)}</b>
        <span class="koga">${ekraniraj(String(r.ts).slice(11, 16))}</span>
        <span class="opis">${ekraniraj(`${r.sashtnost.vid} · ${r.sashtnost.id}`)}</span>
      </div>`,
        )
        .join('')}
    </div>`;
}

/** Какво ще стане · показва се ПРЕДИ да се запише каквото и да е. */
function predlozhenieto(p: Predlozhenie): string {
  const sv = p.sverka;
  return `
    <div class="karta izbrana">
      <div class="dyalglava">
        <h3>Какво ще стане</h3>
        <span translate="no">${ekraniraj(imeNaFayla)} · ${sv.vhod} в Журнала → ${sv.izhod} във файла · разлика ${sv.razlika}</span>
      </div>

      ${
        p.priema
          ? ''
          : `<div class="vest zle">${ekraniraj(zashtoNeSePriema(p))}</div>`
      }

      <div class="plochki">
        <div class="plochka" data-pole="zhurnal-promeni">
          <span class="etiket">Ще се поправят</span>
          <span class="chislo" translate="no">${p.promeni.length}</span>
          <span class="pod">сторно + нов запис за всяка</span>
        </div>
        <div class="plochka">
          <span class="etiket">Непипнати</span>
          <span class="chislo" translate="no">${p.sashti}</span>
          <span class="pod">нищо не става с тях</span>
        </div>
        <div class="plochka">
          <span class="etiket">Липсват във файла</span>
          <span class="chislo" translate="no">${p.lipsvashti.length}</span>
          <span class="pod">${p.lipsvashti.length ? 'НЕ се трият — Журналът е само за добавяне' : 'нито едно'}</span>
        </div>
        <div class="plochka">
          <span class="etiket">Нови редове</span>
          <span class="chislo" translate="no">${p.novi.length}</span>
          <span class="pod">${p.novi.length ? 'НЕ влизат — новото се въвежда през своя екран' : 'нито един'}</span>
        </div>
      </div>

      ${
        p.promeni.length
          ? `<div class="tablitsa" data-tablitsa="zhurnal-promeni">
              <div class="glava zhurnal-promyana">
                <span>№</span><span>Колона</span><span>Било</span><span>Става</span>
              </div>
              ${p.promeni
                .map(
                  (x) => `<div class="red zhurnal-promyana" translate="no">
                    <span class="suma">${x.seq}</span>
                    <span>${ekraniraj(x.kolona)}</span>
                    <span class="suma zle">${ekraniraj(x.bilo)}</span>
                    <span class="suma plateno">${ekraniraj(x.stava)}</span>
                  </div>`,
                )
                .join('')}
            </div>`
          : '<p class="drebno">Нито един ред не е променен. Свръзка не се прави за файл, който не поправя нищо.</p>'
      }

      ${
        p.priema && p.promeni.length
          ? `<div class="poleta">
              <label class="pole">
                <span>Дата на файла</span>
                <input translate="no" type="date" id="zhurnal-data" value="${ekraniraj(dataNaFayla)}">
              </label>
              <label class="pole">
                <span>Случаят на промяна</span>
                <input translate="no" type="text" id="zhurnal-sluchay" value="${ekraniraj(sluchay)}" placeholder="сгрешена сума по вноска 1">
              </label>
            </div>
            <div class="deystviya">
              <button type="button" class="glaven" id="zhurnal-zapishi">Запиши поправките и залепи файла</button>
              <button type="button" class="vtorichen" id="zhurnal-otkazhi">Откажи</button>
            </div>
            <p class="drebno"><b>Двете дати са отделни нарочно.</b> Датата на файла е кога е поправен той; датата на записа е кога влиза в Журнала. Решаваш в понеделник, връщаш в четвъртък — счетоводството иска истинската дата, следата иска и двете.</p>`
          : ''
      }
    </div>`;
}

/** Свръзките · третият номер, с файловете си, „извън графата на нормалния ред". */
function tablitsaNaSvrazkite(svrazki: readonly { nomer: number; pokolenie: number; fayli: readonly { nomer: number; ime: string; dataNaFayla: string; kogato: string; sluchay: string; redove: number }[] }[]): string {
  return `
    <div class="dyalglava">
      <h3>Свръзките</h3>
      <span>третият номер · своя номерация, извън графата на нормалния ред</span>
    </div>
    <div class="tablitsa" data-tablitsa="svrazki">
      <div class="glava svrazka">
        <span>Свръзка</span><span>Файл</span><span>Дата на файла</span>
        <span>Записан</span><span>Случай</span><span class="suma">Редове</span>
      </div>
      ${svrazki
        .flatMap((s) =>
          s.fayli.map(
            (f, i) => `<div class="red svrazka" translate="no">
              <span class="kletka">${i === 0 ? `<b>${pishiSvrazka(s as never)}</b><span>${s.fayli.length} файла</span>` : ''}</span>
              <span>${ekraniraj(f.ime)}</span>
              <span>${ekraniraj(f.dataNaFayla)}</span>
              <span>${ekraniraj(f.kogato.slice(0, 10))}</span>
              <span>${ekraniraj(f.sluchay)}</span>
              <span class="suma">${f.redove}</span>
            </div>`,
          ),
        )
        .join('')}
    </div>
    <p class="drebno">Номерът на свръзката <b>не се сменя</b> при нова редакция — расте поколението (<b>С7</b> → <b>С7·2</b>). Сменен номер би направил невярно всяко място, където старият е цитиран.</p>`;
}

// ── закачането ─────────────────────────────────────────────────────────────

export function zakachiZhurnalat(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  // ── СЕСИИТЕ · четиво, нула записи (резен 26 · ADR-086) ───────────────────
  koren.querySelector<HTMLButtonElement>('#sesii-otvori')?.addEventListener('click', async () => {
    kniga = await k.dnevnik.chetiVsichki(k.akaunt);
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#sesii-zatvori')?.addEventListener('click', async () => {
    // Пуска книгата от паметта · тя е цялата история и няма защо да стои.
    kniga = null;
    filtar = PRAZEN_FILTAR;
    await prerisuvay();
  });
  koren.querySelector<HTMLButtonElement>('#sesii-izchisti')?.addEventListener('click', async () => {
    filtar = PRAZEN_FILTAR;
    await prerisuvay();
  });
  for (const [znak, pole] of [
    ['#sesii-ot', 'ot'],
    ['#sesii-do', 'do_'],
    ['#sesii-koy', 'koy'],
    ['#sesii-tarsi', 'tarsi'],
  ] as const) {
    koren.querySelector<HTMLInputElement>(znak)?.addEventListener('change', async (e) => {
      filtar = { ...filtar, [pole]: (e.target as HTMLInputElement).value.trim() };
      await prerisuvay();
    });
  }

  koren.querySelector<HTMLButtonElement>('#zhurnal-iznesi')?.addEventListener('click', async () => {
    try {
      const sabitiya = await k.dnevnik.chetiVsichki(k.akaunt);
      const bajtove = await rabotnaKniga([listNaZhurnala(sabitiya, 'ЖУРНАЛ')]);
      const fayl = new Blob([bajtove.slice().buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      svaliFayl(fayl, `ЖУРНАЛ-${dnesKato()}.xlsx`);
      k.vest(
        'dobre',
        `Журналът е свален: ${sabitiya.length} реда. Редактирай само „Описание" и „Сума"; ` +
          'останалите колони са котвата, с която файлът се връзва обратно.',
      );
    } catch (err) {
      greshka = dumiZaGreshka(err);
      await prerisuvay();
    }
  });

  koren.querySelector<HTMLButtonElement>('#zhurnal-varni')?.addEventListener('click', () => {
    koren.querySelector<HTMLInputElement>('#zhurnal-fayl')?.click();
  });

  koren.querySelector<HTMLInputElement>('#zhurnal-fayl')?.addEventListener('change', async (e) => {
    const fayl = (e.target as HTMLInputElement).files?.[0];
    if (!fayl) return;
    try {
      const danni = await fayl.arrayBuffer();
      const tekst = new TextDecoder().decode(danni);
      const tablitsi = fayl.name.toLowerCase().endsWith('.csv')
        ? [otCSV(tekst, fayl.name)]
        : await otXLSX(new Uint8Array(danni), fayl.name);
      const sabitiya = await k.dnevnik.chetiVsichki(k.akaunt);
      predlozheno = sveriTablitsata(sabitiya, bezPrazni(tablitsi[0]!));
      imeNaFayla = fayl.name;
      // Белегът на СЪДЪРЖАНИЕТО: същият файл, качен втори път, не прави второ
      // поколение (правило 20 · „смени ли се нещо изобщо").
      otpechatak = otpechatakNaFayla(tekst);
      dataNaFayla = new Date(fayl.lastModified).toISOString().slice(0, 10);
      greshka = '';
    } catch (err) {
      predlozheno = null;
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLInputElement>('#zhurnal-data')?.addEventListener('change', (e) => {
    dataNaFayla = (e.target as HTMLInputElement).value;
  });
  koren.querySelector<HTMLInputElement>('#zhurnal-sluchay')?.addEventListener('input', (e) => {
    sluchay = (e.target as HTMLInputElement).value;
  });

  koren.querySelector<HTMLButtonElement>('#zhurnal-otkazhi')?.addEventListener('click', async () => {
    zabraviTablitsata();
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#zhurnal-zapishi')?.addEventListener('click', async (e) => {
    if (!predlozheno || !predlozheno.priema) return;
    const buton = e.target as HTMLButtonElement;
    buton.disabled = true;
    try {
      const izhod = await zapishiPopravkite(k, predlozheno);
      k.vest(
        'dobre',
        `Записано: ${izhod.popraveni} ${izhod.popraveni === 1 ? 'поправка' : 'поправки'} ` +
          `(сторно + нов запис за всяка) · свръзка ${izhod.svrazka}. ` +
          'Старите записи стоят в Журнала непокътнати.',
      );
      zabraviTablitsata();
    } catch (err) {
      greshka = dumiZaGreshka(err);
    }
    await prerisuvay();
  });
}

/**
 * ЗАПИСВА ПОПРАВКИТЕ · сторно + нов запис за всяка, и свръзка отгоре.
 *
 * Редът е нарочен: първо сторното, после новият запис. Обратният ред би
 * оставил миг, в който двата записа се броят заедно — и ако нещо прекъсне по
 * средата, сборът остава ЗАВИШЕН, вместо занижен. Занижен сбор се забелязва;
 * завишен изглежда като печалба.
 *
 * СВРЪЗКАТА се записва НАКРАЯ, когато вече се знае колко реда са се променили:
 * свръзка, записана първа и после празна, би обещавала поправка, която я няма.
 */
async function zapishiPopravkite(
  k: Konteks,
  p: Predlozhenie,
): Promise<{ readonly popraveni: number; readonly svrazka: string }> {
  // СЛУЧАЯТ СЕ ИСКА ПЪРВО · платено с находка в прохода.
  //
  // Дотук проверката стоеше при Вратата, в `zapishiSvrazka` — тоест НАКРАЯ.
  // Празният случай отказваше свръзката, но сторното и новият запис вече бяха
  // влезли: поправките оставаха в Журнала БЕЗ файла, който ги обяснява, и
  // свръзката, която ги събира. Точно онова, което този резен трябва да
  // направи невъзможно.
  //
  // Вратата пази СЕБЕ СИ и остава непокътната; тук стои вратарят на ПАРТИДАТА.
  if (sluchay.trim() === '') {
    throw new GreshkaTablitsa(
      'Кажи СЛУЧАЯ на промяна, преди да запишеш. Поправка без причина е следа, ' +
        'която не обяснява нищо — а тя е по-лоша от липсваща.',
    );
  }

  const sabitiya = await k.dnevnik.chetiVsichki(k.akaunt);
  const poSeq = new Map<number, Sabitie>(sabitiya.map((s) => [s.seq, s]));
  let popraveni = 0;

  for (const promyana of p.promeni) {
    const staro = poSeq.get(promyana.seq);
    if (!staro) continue;

    // 1 · СТОРНО · „това не се брои", а не „това го няма".
    await k.deystviya.storniraj(
      crypto.randomUUID(),
      {
        pogasyavaSeq: promyana.seq,
        prichina: `поправка от таблица · „${promyana.kolona}": ${promyana.bilo} → ${promyana.stava}`,
      },
      { opId: `tablitsa-storno:${crypto.randomUUID()}`, svereno: true },
      staro.sashtnost.vid as never,
    );

    // 2 · НОВИЯТ ЗАПИС · същият вид, същата същност, поправено поле.
    await k.deystviya.povtoriPopraveno(staro, novPayload(staro, promyana), {
      opId: `tablitsa-nov:${crypto.randomUUID()}`,
      svereno: true,
    });
    popraveni += 1;
  }

  // 3 · СВРЪЗКАТА · третият номер, който залепва файла за предишния.
  const o = await k.deystviya.ogledalo();
  const svrazki = [...o.svrazki.values()];
  const posledna = svrazki[svrazki.length - 1];
  const nomer = posledna ? posledna.nomer : sledvashtSvrazkaNomer(svrazki);
  const pokolenie = posledna ? posledna.pokolenie + 1 : 1;
  const fayl = posledna ? posledna.fayli.length + 1 : 1;

  await k.deystviya.zapishiSvrazka(
    {
      nomer,
      pokolenie,
      fayl,
      ime: imeNaFayla,
      dataNaFayla: dataNaFayla || dnesKato(),
      sluchay: sluchay.trim(),
      redove: p.sverka.izhod,
      otpechatak,
      promeneni: popraveni,
    },
    { opId: `svrazka:${crypto.randomUUID()}` },
  );

  return { popraveni, svrazka: pishiSvrazka({ nomer, pokolenie, fayli: [] }) };
}
