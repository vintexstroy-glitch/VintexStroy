/**
 * MasterBook · местно-първо (ADR-001, носител В).
 *
 * Журналът живее в браузъра на собственика. Няма сървър, няма мрежа,
 * няма чакане. Вратата стои над него и не знае кой носител е отдолу.
 */

import { Vrata, VsichkoRazresheno, proveriVerigata } from '../src/yadro/index.js';
import { otvoriDnevnik, type DnevnikVIndexedDB } from '../src/nositel/dnevnik-indexeddb.js';
import { sha256Web } from '../src/nositel/hash-web.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { ekraniraj, narisuvayImoti, zakachiFormite } from './imoti.js';

const NAEMATEL = 'vintexstroy';
const ACTOR = 'vintexstroy@gmail.com';

export interface Konteks {
  readonly deystviya: Deystviya;
  readonly dnevnik: DnevnikVIndexedDB;
  readonly vrata: Vrata;
  readonly vest: (vid: 'dobre' | 'zle', tekst: string) => void;
}

const koren = document.getElementById('ekran')!;
let poslednaVest: { vid: 'dobre' | 'zle'; tekst: string } | null = null;
let sastoyanieNaVerigata = { tsyala: true, proverena: false, broi: 0 };

async function trugvay(): Promise<void> {
  const dnevnik = await otvoriDnevnik('masterbook');
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: sha256Web });
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: ACTOR,
    chasovnik: () => new Date().toISOString(),
  });

  const k: Konteks = {
    deystviya,
    dnevnik,
    vrata,
    vest: (vid, tekst) => {
      poslednaVest = { vid, tekst };
    },
  };

  async function prerisuvay(): Promise<void> {
    const sabitiya = await dnevnik.chetiVsichki(NAEMATEL);
    sastoyanieNaVerigata = { ...sastoyanieNaVerigata, broi: sabitiya.length };
    const ogledalo = await deystviya.ogledalo();

    koren.innerHTML = `
      ${strana()}
      <main class="glavno">
        <header class="shapka">
          <div>
            <h1>Имоти</h1>
            <p>записва вместо да помни · всичко минава през Вратата</p>
          </div>
          <div class="desno-gore">
            <button type="button" class="vtorichen" id="proveri">Провери веригата</button>
            <button type="button" class="vtorichen" id="iznesi">Изнеси Журнала</button>
          </div>
        </header>
        <div class="telo">
          ${vestHTML()}
          ${narisuvayImoti({ ogledalo, sabitiya: sabitiya.length }, k)}
        </div>
      </main>`;

    poslednaVest = null;
    zakachiFormite(koren, k, prerisuvay);
    zakachiGlavnite(k, prerisuvay);
  }

  await prerisuvay();
}

function strana(): string {
  const v = sastoyanieNaVerigata;
  const tekst = !v.proverena
    ? 'Веригата не е проверявана в тази сесия'
    : v.tsyala
      ? 'Веригата е цяла'
      : 'Веригата е СКЪСАНА';
  return `
    <aside class="strana">
      <div class="marka">
        <b>VintexStroy</b>
        <span>MasterBook</span>
      </div>
      <div class="veriga">
        <div class="redche">
          <span class="tochka ${v.proverena && !v.tsyala ? 'zle' : ''}"></span>${tekst}
        </div>
        <div class="redche">${v.broi} ${v.broi === 1 ? 'събитие' : 'събития'} · местно, в този браузър</div>
      </div>
    </aside>`;
}

function vestHTML(): string {
  if (!poslednaVest) return '';
  return `<div class="vest ${poslednaVest.vid}">${ekraniraj(poslednaVest.tekst)}</div>`;
}

function zakachiGlavnite(k: Konteks, prerisuvay: () => Promise<void>): void {
  koren.querySelector<HTMLButtonElement>('#proveri')?.addEventListener('click', async () => {
    const sabitiya = await k.dnevnik.chetiVsichki(NAEMATEL);
    const rezultat = await proveriVerigata(sabitiya, sha256Web);
    sastoyanieNaVerigata = {
      tsyala: rezultat.tsyala,
      proverena: true,
      broi: sabitiya.length,
    };

    if (rezultat.tsyala) {
      k.vest('dobre', `Веригата е цяла · ${rezultat.proverni} от ${sabitiya.length} звена.`);
    } else {
      // При инцидент Журналът НЕ се пипа — дърпа се спирателният кран.
      k.vrata.zatvori(`скъсана верига на seq ${rezultat.parvoSchupeno}`);
      k.vest(
        'zle',
        `Веригата се къса на seq ${rezultat.parvoSchupeno} (${rezultat.prichina}). ` +
          `Вратата е спряна — четенето работи, записът не. Журналът не се пипа.`,
      );
    }
    await prerisuvay();
  });

  koren.querySelector<HTMLButtonElement>('#iznesi')?.addEventListener('click', async () => {
    const sabitiya = await k.dnevnik.chetiVsichki(NAEMATEL);
    const fayl = new Blob([JSON.stringify(sabitiya, null, 2)], {
      type: 'application/json',
    });
    const adres = URL.createObjectURL(fayl);
    const vruzka = document.createElement('a');
    vruzka.href = adres;
    vruzka.download = `zhurnal-${NAEMATEL}-${new Date().toISOString().slice(0, 10)}.json`;
    vruzka.click();
    URL.revokeObjectURL(adres);
    k.vest('dobre', `Изнесени ${sabitiya.length} събития.`);
    await prerisuvay();
  });
}

trugvay().catch((greshka: unknown) => {
  koren.innerHTML = `<div class="telo"><div class="vest zle">Приложението не тръгна: ${
    ekraniraj(greshka instanceof Error ? greshka.message : String(greshka))
  }</div></div>`;
});
