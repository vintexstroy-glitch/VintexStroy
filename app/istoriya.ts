/**
 * ИСТОРИЯТА НА РЕДА · кой · какво · кога, с един клик.
 *
 * Airtable дава две седмици история на безплатния план и продава пълния одитен
 * дневник като най-скъпата си Enterprise функция. MasterBook пази ПЪЛНАТА
 * история завинаги ПО КОНСТРУКЦИЯ — Журналът е само за добавяне — но дотук не
 * я показваше на реда. Този панел е евтин прочит над онова, което вече е там:
 * нищо ново не се записва, нищо не се смята.
 *
 * Показва се ВСЯКО събитие на същността: създаване, поправки, сторна — със
 * seq, дата, actor и съкратен товар. Сторното остава при бутоните на реда;
 * панелът е за гледане, не втори вход за писане.
 */

import { pishi } from '../src/yadro/pari.js';
import { ekraniraj } from './obshto.js';
import type { Sabitie } from '../src/yadro/index.js';
import type { Konteks } from './main.js';

/** Малкият бутон в реда · `vid` и `id` са същността от Журнала. */
export function butonIstoriya(vid: string, id: string): string {
  return `<button type="button" class="butoncheto-istoriya" data-istoriya="${ekraniraj(vid)}·${ekraniraj(id)}"
    aria-label="История на реда" title="История · кой, какво, кога">История</button>`;
}

/**
 * Товарът, съкратен за човешко око.
 *
 * Полетата `_st` са пари и се пишат като пари; `prichina` е думата на човека
 * и влиза цяла; останалото се реже до първите няколко, за да не стане панелът
 * втори Журнал. Който иска всичко — износът го дава.
 */
function opisNaTovara(payload: Readonly<Record<string, unknown>>): string {
  const chasti: string[] = [];
  const prichina = payload['prichina'];
  if (typeof prichina === 'string' && prichina.trim() !== '') {
    chasti.push(`„${prichina}"`);
  }
  for (const [klyuch, stoynost] of Object.entries(payload)) {
    if (chasti.length >= 5) break;
    if (klyuch === 'prichina') continue;
    if (klyuch.endsWith('_st') && typeof stoynost === 'number') {
      chasti.push(`${klyuch.slice(0, -3)}: ${pishi(stoynost)}`);
    } else if (typeof stoynost === 'string' && stoynost !== '' && stoynost.length <= 40) {
      chasti.push(`${klyuch}: ${stoynost}`);
    }
  }
  return chasti.join(' · ');
}

function redNaSabitie(s: Sabitie): string {
  return `<div class="istoriya-sabitie">
    <span class="seq" translate="no">№ ${s.seq}</span>
    <b>${ekraniraj(s.type)}</b>
    <span class="koga" translate="no">${ekraniraj(String(s.ts).slice(0, 16).replace('T', ' · '))} · ${ekraniraj(s.actor)}</span>
    <span class="opis" translate="no">${ekraniraj(opisNaTovara(s.payload))}</span>
  </div>`;
}

async function pokazhi(k: Konteks, vid: string, id: string): Promise<void> {
  const sabitiya = await k.dnevnik.chetiZaSashtnost(k.akaunt, {
    vid: vid as never,
    id,
  });

  const fon = document.createElement('div');
  fon.className = 'istoriya-fon';
  fon.innerHTML = `
    <div class="istoriya-karta" role="dialog" aria-label="История на реда">
      <h3>История</h3>
      <p class="pod" translate="no">${ekraniraj(id)} · ${sabitiya.length} ${
        sabitiya.length === 1 ? 'събитие' : 'събития'
      } · Журналът пази всичко, завинаги</p>
      ${
        sabitiya.length === 0
          ? '<p class="prazno">Няма нито едно събитие — това не би трябвало да се вижда на екрана.</p>'
          : sabitiya.map(redNaSabitie).join('')
      }
      <button type="button" class="vtorichen istoriya-zatvori">Затвори</button>
    </div>`;

  const zatvori = () => {
    fon.remove();
    document.removeEventListener('keydown', priKlavish);
  };
  const priKlavish = (e: KeyboardEvent) => {
    if (e.key === 'Escape') zatvori();
  };
  fon.addEventListener('click', (e) => {
    if (e.target === fon) zatvori();
  });
  fon.querySelector('.istoriya-zatvori')!.addEventListener('click', zatvori);
  document.addEventListener('keydown', priKlavish);
  document.body.append(fon);
}

/** Закача се веднъж на екран — обслужва всички редове с история в него. */
export function zakachiIstoriya(koren: HTMLElement, k: Konteks): void {
  for (const b of koren.querySelectorAll<HTMLButtonElement>('[data-istoriya]')) {
    b.addEventListener('click', async () => {
      // Разделителят е „·", не „:" — двоеточието се среща в самите id-та.
      const beleg = b.dataset['istoriya']!;
      const tochka = beleg.indexOf('·');
      await pokazhi(k, beleg.slice(0, tochka), beleg.slice(tochka + 1));
    });
  }
}
