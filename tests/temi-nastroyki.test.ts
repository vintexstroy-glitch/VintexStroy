/**
 * ТЕМИТЕ НА НАСТРОЙКИТЕ · трите списъка (И101 т.2 · ADR-045).
 *
 * Негови думи: „падащи редове с теми от Настройки, които са РАЗЛИЧНИ от
 * стопанин и служителя с добавен и упълномощен служител."
 *
 * „Различни" е лесно да се напише и трудно да се удържи: първата нова тема,
 * добавена без своя ред в описа, става видима за всички. Тук се пази точно
 * това.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { operatsiya, SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { izborPoPodrazbirane } from '../src/domein/planove.js';
import { OTKRIVASHTO_SABITIE } from '../src/domein/stopanin.js';
import {
  GRUPI,
  KOY_GLEDA,
  koyGleda,
  temaPoKlyuch,
  TEMI,
  temiPoGrupi,
  temiZa,
  vizhdaTemata,
} from '../src/domein/temi-nastroyki.js';
import { imaIkona } from '../app/ikoni.js';
import { EKRANI } from '../app/ekranite.js';

const GLAVEN = 'vintexstroy@gmail.com';

async function knigata(sStopanin = true) {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: SHA,
    ...(sStopanin ? { parvoto: OTKRIVASHTO_SABITIE } : {}),
  });
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: GLAVEN,
    chasovnik: () => '2026-08-25T09:00:00.000Z',
  });
  if (sStopanin) {
    await deystviya.zapishiStopanina(
      { imeyl: GLAVEN, ime: 'Иво', dostavchik: 'google' },
      { opId: 'op-0' },
    );
  } else {
    await vrata.dobavi(operatsiya({ opId: 'op-1' }));
  }
  return { dnevnik, deystviya };
}

describe('описът · какво е една тема', () => {
  it('всяка носи ключ, име, описание и ЖИВА икона', () => {
    for (const t of TEMI) {
      expect(t.klyuch.trim(), t.klyuch).not.toBe('');
      expect(t.ime.trim(), t.klyuch).not.toBe('');
      expect(t.opis.trim(), t.klyuch).not.toBe('');
      expect(imaIkona(t.ikona), `${t.klyuch} · икона ${t.ikona}`).toBe(true);
    }
  });

  it('ключовете са различни · два реда с един ключ водят на едно място', () => {
    const klyuchove = TEMI.map((t) => t.klyuch);
    expect(new Set(klyuchove).size).toBe(klyuchove.length);
  });

  /**
   * ЕДНО МЯСТО, НЕ ДВЕ. Тема, която сочи екран, който го няма, води в нищото —
   * и това не се вижда, докато някой не натисне точно нея.
   */
  it('всяка тема-секция сочи СЪЩЕСТВУВАЩ екран', () => {
    const ekrani = new Set(Object.keys(EKRANI));
    for (const t of TEMI) {
      if (t.kade.vid !== 'sektsiya') continue;
      expect(ekrani.has(t.kade.ekran), `${t.klyuch} → ${t.kade.ekran}`).toBe(true);
      expect(t.kade.sektsiya.trim(), t.klyuch).not.toBe('');
    }
  });

  it('всяка тема се вижда от ПОНЕ един човек', () => {
    for (const t of TEMI) {
      expect(t.za.length, t.klyuch).toBeGreaterThan(0);
      for (const koy of t.za) expect(KOY_GLEDA).toContain(koy);
    }
  });
});

describe('трите списъка са РАЗЛИЧНИ · негова дума', () => {
  it('и трите не са празни', () => {
    for (const koy of KOY_GLEDA) expect(temiZa(koy).length, koy).toBeGreaterThan(0);
  });

  it('Стопанинът вижда най-много, упълномощеният — най-малко', () => {
    const stopanin = temiZa('stopanin').length;
    const sluzhitel = temiZa('sluzhitel').length;
    const upalnomoshten = temiZa('upalnomoshten').length;
    expect(stopanin).toBeGreaterThan(sluzhitel);
    expect(sluzhitel).toBeGreaterThan(upalnomoshten);
  });

  /**
   * СТЪЛБАТА НЕ СЕ ПРЕСИЧА. По-малкото право не бива да дава нещо, което
   * по-голямото няма — иначе „по-малко" престава да значи по-малко и започва
   * да значи „друго", а тогава никой не може да отговори кой какво вижда.
   */
  it('по-тясното е ПОДМНОЖЕСТВО на по-широкото', () => {
    const kluchove = (koy: Parameters<typeof temiZa>[0]) =>
      new Set(temiZa(koy).map((t) => t.klyuch));
    const stopanin = kluchove('stopanin');
    const sluzhitel = kluchove('sluzhitel');
    const upalnomoshten = kluchove('upalnomoshten');
    for (const k of sluzhitel) expect(stopanin.has(k), `служител → ${k}`).toBe(true);
    for (const k of upalnomoshten) expect(sluzhitel.has(k), `упълномощен → ${k}`).toBe(true);
  });

  it('служителят НЕ вижда моделите, бутоните и правата', () => {
    // Изброено поименно, за да падне на глас, ако утре някоя от трите се
    // отвори мимоходом.
    for (const k of ['modeli', 'butoni', 'pravata', 'hedari', 'zapasen', 'izgledi']) {
      expect(vizhdaTemata('sluzhitel', k), k).toBe(false);
      expect(vizhdaTemata('stopanin', k), k).toBe(true);
    }
  });

  it('но вижда СВОИТЕ · езикът и личното са негови', () => {
    for (const k of ['ezik', 'lichno', 'moeto', 'otmetki']) {
      expect(vizhdaTemata('sluzhitel', k), k).toBe(true);
      expect(vizhdaTemata('upalnomoshten', k), k).toBe(true);
    }
  });

  it('непозната тема не се вижда от никого', () => {
    expect(temaPoKlyuch('нямагоняма')).toBeUndefined();
    for (const koy of KOY_GLEDA) expect(vizhdaTemata(koy, 'нямагоняма')).toBe(false);
  });
});

describe('кой гледа · различава се от ЖУРНАЛА, не от екрана', () => {
  it('Стопанинът е стопанин', async () => {
    const { dnevnik } = await knigata();
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(koyGleda(GLAVEN, o)).toBe('stopanin');
    expect(koyGleda('VintexStroy@Gmail.com', o)).toBe('stopanin');
  });

  it('вписаният служител е служител', async () => {
    const { dnevnik, deystviya } = await knigata();
    await deystviya.zapishiSluzhitel(
      { imeyl: 'petar@example.bg', ime: 'Петър', rolya: 'redaktor' },
      { opId: 'op-s' },
    );
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(koyGleda('petar@example.bg', o)).toBe('sluzhitel');
  });

  /**
   * ТРЕТИЯТ СЛУЧАЙ, не празнина. „Упълномощен" е онзи, който НЕ е служител на
   * този наемател, но има даден достъп — И99: „да сподели на външен имейл
   * личната си папка… например на жена си".
   */
  it('чуждият имейл е УПЪЛНОМОЩЕН, не служител', async () => {
    const { dnevnik } = await knigata();
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(koyGleda('zhena@example.bg', o)).toBe('upalnomoshten');
  });

  it('Журнал БЕЗ стопанин не понижава никого', async () => {
    const { dnevnik } = await knigata(false);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(o.stopanin).toBe('');
    expect(koyGleda('kojto-i-da-e@example.bg', o)).toBe('stopanin');
  });
});

/**
 * ПЕТТЕ ГРУПИ · заглавия в падащия ред (негов избор, 27.08 · ADR-057б).
 *
 * Групирането е при РИСУВАНЕ, а описът остава един масив — затова тук се пази
 * не подредбата на екрана, а онова, което би се счупило тихо: тема без група,
 * група без теми, и празно заглавие пред служителя.
 */
describe('групите · пет заглавия, нито едно празно', () => {
  it('ключовете на групите са различни', () => {
    const klyuchove = GRUPI.map((g) => g.klyuch);
    expect(new Set(klyuchove).size).toBe(klyuchove.length);
  });

  /**
   * ТЕМА БЕЗ ГРУПА НЕ СЕ РИСУВА НИКЪДЕ. `temiPoGrupi` минава по `GRUPI` и
   * филтрира — тема с непозната група просто изчезва от падащия ред, тихо.
   * Типът пази срещу правописна грешка; този тест пази срещу изтрита група.
   */
  it('всяка тема сочи СЪЩЕСТВУВАЩА група', () => {
    const imaGrupa = new Set<string>(GRUPI.map((g) => g.klyuch));
    for (const t of TEMI) expect(imaGrupa.has(t.grupa), `${t.klyuch} → ${t.grupa}`).toBe(true);
  });

  it('нито една тема не се губи при групирането · Стопанинът', () => {
    const vGrupi = temiPoGrupi('stopanin').flatMap((g) => g.temi.map((t) => t.klyuch));
    expect([...vGrupi].sort()).toEqual([...temiZa('stopanin').map((t) => t.klyuch)].sort());
  });

  it('и не се удвоява · всяка стои под ЕДНО заглавие', () => {
    const vGrupi = temiPoGrupi('stopanin').flatMap((g) => g.temi.map((t) => t.klyuch));
    expect(new Set(vGrupi).size).toBe(vGrupi.length);
  });

  it('Стопанинът вижда и петте заглавия', () => {
    expect(temiPoGrupi('stopanin').length).toBe(GRUPI.length);
  });

  /**
   * ПРАЗНА ГРУПА НЕ ИЗЛИЗА. Служителят няма нито една тема под „ХОРА И ПРАВА" —
   * заглавие без нищо под себе си не е ориентир, а въпрос: „какво е трябвало да
   * има тук и защо го няма?".
   */
  it('празно заглавие НЕ се рисува · служителят не вижда „ХОРА И ПРАВА"', () => {
    for (const koy of KOY_GLEDA) {
      for (const g of temiPoGrupi(koy)) expect(g.temi.length, `${koy} · ${g.grupa.klyuch}`).toBeGreaterThan(0);
    }
    expect(temiPoGrupi('sluzhitel').map((g) => g.grupa.klyuch)).not.toContain('hora');
  });

  it('редът на заглавията е онзи от описа, не азбучен', () => {
    const red = temiPoGrupi('stopanin').map((g) => g.grupa.klyuch);
    expect(red).toEqual(GRUPI.map((g) => g.klyuch));
  });
});

/**
 * ИЗИСКВАНЕТО ЖИВЕЕ НА ТЕМАТА, НЕ НА ЕКРАНА · дефект от голямата сверка.
 *
 * Дотук `EKRANI.nastroyki.iska` беше `'iztochnitsi'` — възможност, която дава
 * само Драйвът. Пунктът обаче се връща БЕЗУСЛОВНО („Настройки не се скрива от
 * никого", И101 т.2), значи на двата ЛОКАЛНИ плана той стоеше в лентата и
 * натискането го връщаше на Имоти, без дума защо. С него падаха и езикът на
 * интерфейса, и личният таб, и контрагентите, и колонното право.
 */
describe('темите · възможността живее на ТЕМАТА', () => {
  const lokalno = izborPoPodrazbirane('profesionalen-lokalno');
  const oblak = izborPoPodrazbirane('profesionalen');

  it('без избор нищо не отпада · старото поведение остава дословно', () => {
    expect(temiZa('stopanin').length).toBe(TEMI.filter((t) => t.za.includes('stopanin')).length);
  });

  it('локалният план губи САМО темите, които искат Драйва', () => {
    const svsichko = new Set(temiZa('stopanin', oblak).map((t) => t.klyuch));
    const bezDrayv = new Set(temiZa('stopanin', lokalno).map((t) => t.klyuch));
    const padnali = [...svsichko].filter((k) => !bezDrayv.has(k));
    expect(padnali.sort()).toEqual(['butoni', 'modeli']);
  });

  it('а всичко останало ОСТАВА · офлайн изданието не губи Настройки', () => {
    const bezDrayv = temiZa('stopanin', lokalno).map((t) => t.klyuch);
    for (const klyuch of ['ezik', 'lichno', 'kontragenti', 'pravata', 'moeto']) {
      expect(bezDrayv, klyuch).toContain(klyuch);
    }
    expect(bezDrayv.length).toBeGreaterThan(10);
  });

  it('и екранът НЕ носи изискването · иначе целият пункт пада', () => {
    const izvor = readFileSync('app/ekranite.ts', 'utf8');
    const blok = izvor.slice(izvor.indexOf('nastroyki: {'), izvor.indexOf('stoynost: {'));
    expect(blok).not.toMatch(/^\s*iska: /m);
  });
});

describe('пиновете · броевете се твърдят с ръка (резен 46 · група В)', () => {
  it('групите са ПЕТ, а темите — ОСЕМНАЙСЕТ', () => {
    expect(GRUPI).toHaveLength(5);
    expect(TEMI).toHaveLength(18);
  });
});
