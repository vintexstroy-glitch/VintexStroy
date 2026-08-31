/**
 * ЗАКАЧЕНИТЕ ДОКУМЕНТИ · ЕДИН блок, три викащи (резен 17б).
 *
 * Разходът, делото и имотът искат едно и също: „ето хартията към този ред".
 * Затова тук има ЕДИН прозорец и ЕДИН закачач, а трите екрана слагат само по
 * едно копче на реда си. Три отделни блока щяха да се разминат при първата
 * поправка — точно както се разминаха двете копия на изскачащия прозорец
 * (`prozorets.ts`).
 *
 * ═══ ГРАНИЦАТА, ОБЯВЕНА ПРЕДВАРИТЕЛНО ═══
 *
 * Приложението **НЕ качва** файла и **НЕ го пази**. То чете байтовете ВЕДНЪЖ,
 * взима им отпечатъка и ги забравя. В Журнала влизат име · големина · час ·
 * sha256 — доказателство КОЙ файл е бил закачен, не копие от него.
 *
 * Двете му правила, дословно:
 *   „Никакъв файл без изрично разрешение за конкретния файл." *(р89·[20])*
 *   „Да, без качване" · само ЧЕТЕНЕ *(р57·[110])*
 *
 * Затова файлът се избира ПООТДЕЛНО, през прозорчето на браузъра. Нищо не се
 * обхожда и нищо не тръгва навън. Това се КАЗВА на екрана (правило 15), а не
 * се подразбира — обещание, което само разработчикът знае, е обещание, дадено
 * на никого.
 */

import {
  belegNaDokumentite,
  bezDokument,
  bezDokumenti,
  brutoNaDokumentite,
  IMENA_NA_KAM,
  IMENA_NA_VIDOVETE_DOKUMENT,
  klyuchNaDokumenti,
  napraviDokument,
  sDumiDokumentite,
  sZakachen,
  VIDOVE,
  type Dokument,
  type KamKakvo,
  type VidDokument,
  type ZakacheniDokumenti,
} from '../src/domein/dokumenti.js';
import { otpechatak } from '../src/iztochnik/snimka.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { eZamrazen } from '../src/domein/zamrazyavane.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import { ekraniraj } from './obshto.js';
import { dumiZaGreshka } from '../src/yadro/dumi.js';
import { otvoriProzorets } from './prozorets.js';
import { butonSIkona } from './ikoni.js';
import type { Konteks } from './ekranite.js';

/** Ключът на реда, както го носи `data-dokumenti`: „<към какво>·<id>". */
function beleg(kam: KamKakvo, id: string): string {
  return `${kam}·${id}`;
}

/**
 * КОПЧЕТО НА РЕДА · и НУЛАТА се вижда.
 *
 * Ред без закачени показва „0", не празно място. Празното не различава „няма
 * хартия" от „никой не е питал", а точно това различаване е смисълът на целия
 * резен.
 */
export function butonNaDokumentite(
  kam: KamKakvo,
  id: string,
  broy: number,
  /**
   * КРАТЪК ВИД · за реда на Ганта, който е 26px висок в колона от 180px с
   * `overflow: hidden`. Цялата дума там се РЕЖЕ — а рязан бутон не се и
   * натиска. Затова остава ЧИСЛОТО, а думата се мести в подсказката: броят
   * трябва да се ВИЖДА, нулата особено, и точно него краткият вид пази.
   */
  kratko = false,
): string {
  const dumi =
    broy === 0
      ? 'Документи · няма закачени'
      : `Документи · ${broy} ${broy === 1 ? 'закачен' : 'закачени'}`;
  return butonSIkona({
    ikona: 'obrazets',
    tekst: kratko ? String(broy) : `Документи · ${broy}`,
    title: dumi,
    klas: 'vtorichen malak butoncheto-dokumenti',
    danni: { dokumenti: beleg(kam, id) },
  });
}

/** Каквото Огледалото знае за този ред · празното е СЪСТОЯНИЕ, не липса. */
function zakachenoteNa(o: Ogledalo, kam: KamKakvo, id: string): ZakacheniDokumenti {
  return o.dokumenti.get(klyuchNaDokumenti(kam, id)) ?? bezDokumenti(kam, id);
}

/** Колко са закачени за този ред — за копчето на реда. */
export function broyDokumenti(o: Ogledalo, kam: KamKakvo, id: string): number {
  return zakachenoteNa(o, kam, id).dokumenti.length;
}

/** Байтовете в човешка мярка · броят се, не се усещат. */
function golemina(bayta: number): string {
  if (bayta < 1024) return `${bayta} B`;
  if (bayta < 1024 * 1024) return `${(bayta / 1024).toFixed(1)} KB`;
  return `${(bayta / (1024 * 1024)).toFixed(1)} MB`;
}

function redNaDokument(d: Dokument): string {
  return `<div class="dokument-red" translate="no">
    <span class="dokument-ime"><b>${ekraniraj(d.ime)}</b><span>${ekraniraj(
      IMENA_NA_VIDOVETE_DOKUMENT[d.vid],
    )} · ${golemina(d.golemina)} · ${ekraniraj(String(d.promenen).slice(0, 10))}</span></span>
    <span class="dokument-otpechatak" title="${ekraniraj(d.otpechatak)}">${ekraniraj(
      d.otpechatak.slice(0, 12),
    )}…</span>
    <span class="dokument-vrazka">${
      d.vrazka === ''
        ? '<span class="drebno">без връзка към Драйва</span>'
        : `<a href="${ekraniraj(d.vrazka)}" target="_blank" rel="noopener">Отвори в Драйва</a>`
    }</span>
    ${butonSIkona({
      ikona: 'mahni',
      tekst: 'Махни',
      title: 'Махни · пише се нов списък, старият остава в Журнала',
      danni: { 'mahni-dokument': d.otpechatak },
    })}
  </div>`;
}

/**
 * ЗАМРАЗЕНИЯТ МЕСЕЦ НЕ СПИРА ЗАКАЧАНЕТО · и това се КАЗВА.
 *
 * Документът не мени нито едно число — той е доказателство за вече записано.
 * Мълчаливо позволение изглежда като пропуск в ключалката; изречение на екрана
 * го прави решение (правило 9 · правило 15).
 */
function zamrazenoto(o: Ogledalo, kam: KamKakvo, id: string): string {
  if (kam !== 'razhod') return '';
  const r = o.razhodi.get(id);
  if (!r) return '';
  const mesets = String(r.data).slice(0, 7);
  if (!eZamrazen(o, mesets)) return '';
  return `<p class="drebno">Месец <b>${ekraniraj(
    mesets,
  )}</b> е ЗАМРАЗЕН от подадена справка — и закачането пак работи. Документът е доказателство за вече записаното; той не мени нито едно число.</p>`;
}

/** Тялото на прозореца · целият блок, сглобен от Огледалото. */
export function blokNaDokumentite(o: Ogledalo, kam: KamKakvo, id: string): string {
  const z = zakachenoteNa(o, kam, id);
  return `
    <p class="drebno">Приложението <b>не качва</b> и <b>не пази</b> файла и <b>не го отваря</b>. Чете го веднъж, взима му отпечатъка и го забравя: в Журнала влизат име, големина, час и sha256. Оригиналът остава там, където е — в Драйва или на устройството.</p>
    ${zamrazenoto(o, kam, id)}
    <div class="dokumenti-spisak">
      ${
        z.dokumenti.length === 0
          ? '<p class="prazno">Няма закачени документи за този ред.</p>'
          : z.dokumenti.map(redNaDokument).join('')
      }
    </div>
    <p class="drebno" data-dokumenti-sbor>${ekraniraj(sDumiDokumentite(z))} · ${golemina(
      brutoNaDokumentite(z),
    )}</p>
    <form id="forma-dokument" class="dokumenti-forma">
      <label>Вид
        <select name="vid">
          ${VIDOVE.map(
            (v) =>
              `<option value="${v}">${ekraniraj(IMENA_NA_VIDOVETE_DOKUMENT[v])}</option>`,
          ).join('')}
        </select>
      </label>
      <label>Връзка към Драйва · по избор
        <input name="vrazka" type="url" placeholder="адресът на файла в Драйва" />
      </label>
      <label>Файлът
        <input name="fayl" type="file" id="dokument-fayl" />
      </label>
      <button type="submit" class="glaven">Закачи документа</button>
      <p class="greshka" id="greshka-dokument"></p>
    </form>`;
}

/** Отпечатъкът на ИЗБРАНИЯ файл · байтовете се четат веднъж и се пускат. */
async function otpechatakNaFayla(fayl: File): Promise<string> {
  return otpechatak(new Uint8Array(await fayl.arrayBuffer()), sha256Web);
}

async function pokazhi(
  k: Konteks,
  kam: KamKakvo,
  id: string,
  prerisuvay: () => Promise<void>,
): Promise<void> {
  const o = await k.deystviya.ogledalo();
  const zatvori = otvoriProzorets({
    zaglavie: `Документи · ${IMENA_NA_KAM[kam]}`,
    pod: `${id} · закача се доказателство за файла, не самият файл`,
    tyalo: blokNaDokumentite(o, kam, id),
  });

  const forma = document.querySelector<HTMLFormElement>('#forma-dokument');
  const greshka = document.querySelector<HTMLElement>('#greshka-dokument');

  const zapishi = async (nov: ZakacheniDokumenti, predi: string): Promise<void> => {
    // БЕЛЕГЪТ пита „смени ли се нещо изобщо" ПРЕДИ записа. `opId` обаче носи
    // ДЕЙСТВИЕТО, не съдържанието (правило 20): закачи → махни → закачи трябва
    // да мине, а ключ от съдържанието би върнал стария резултат.
    if (belegNaDokumentite(nov) === predi) return;
    await k.deystviya.zakachiDokumenti(nov, {
      opId: `dok:${kam}:${id}:${Date.now()}`,
    });
    zatvori();
    await prerisuvay();
  };

  forma?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (greshka) greshka.textContent = '';
    const danni = new FormData(forma);
    const fayl = (danni.get('fayl') as File | null) ?? null;
    if (!fayl || fayl.name === '') {
      if (greshka) greshka.textContent = 'Изберете файл — закача се конкретен файл, не папка.';
      return;
    }
    try {
      const sega = zakachenoteNa(await k.deystviya.ogledalo(), kam, id);
      const dokument = napraviDokument({
        ime: fayl.name,
        golemina: fayl.size,
        promenen: new Date(fayl.lastModified).toISOString(),
        otpechatak: await otpechatakNaFayla(fayl),
        vid: String(danni.get('vid')) as VidDokument,
        vrazka: String(danni.get('vrazka') ?? ''),
      });
      await zapishi(sZakachen(sega, dokument), belegNaDokumentite(sega));
    } catch (err) {
      if (greshka) greshka.textContent = dumiZaGreshka(err);
    }
  });

  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mahni-dokument]')) {
    b.addEventListener('click', async () => {
      const sega = zakachenoteNa(await k.deystviya.ogledalo(), kam, id);
      await zapishi(bezDokument(sega, b.dataset['mahniDokument']!), belegNaDokumentite(sega));
    });
  }
}

/** Закача се ВЕДНЪЖ на екран — обслужва всички редове с копче в него. */
export function zakachiDokumentite(
  koren: HTMLElement,
  k: Konteks,
  prerisuvay: () => Promise<void>,
): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-dokumenti]')) {
    b.addEventListener('click', async () => {
      // Разделителят е „·", не „:" — двоеточието се среща в самите id-та.
      const zapis = b.dataset['dokumenti']!;
      const tochka = zapis.indexOf('·');
      await pokazhi(
        k,
        zapis.slice(0, tochka) as KamKakvo,
        zapis.slice(tochka + 1),
        prerisuvay,
      );
    });
  }
}
