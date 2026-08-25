/**
 * ЖИВИТЕ ПАДАЩИ МЕНЮТА · законът стига до екрана (И97 · ADR-040).
 *
 * Домейнът (`padashti-menyuta`) е тестван от ADR-033. Тук се пази ДРУГО:
 * че речникът се вади от Журнала, че полето носи каквото трябва, и че
 * съобщението след запис казва какво е влязло ново.
 */

import { describe, expect, it } from 'vitest';
import { menyuOtZhivi, poleSMenyu, sDumiZaNovite } from '../app/menyu.js';
import { predlagani, sastoyanieNaPoleto, veche } from '../src/domein/padashti-menyuta.js';

describe('речникът се вади от ЖИВИТЕ записи', () => {
  it('събира стойностите и маха празните', () => {
    const m = menyuOtZhivi('myasto', 'Място', ['Малинова', '', 'Дианабад', '   ']);
    expect(predlagani(m).map((s) => s.tekst)).toEqual(['Дианабад', 'Малинова']);
  });

  it('подрежда по ЧЕСТОТА, после по азбука · най-писаното стои горе', () => {
    const m = menyuOtZhivi('myasto', 'Място', [
      'Дианабад',
      'Малинова',
      'Малинова',
      'Малинова',
      'Банишора',
      'Банишора',
    ]);
    expect(predlagani(m).map((s) => s.tekst)).toEqual(['Малинова', 'Банишора', 'Дианабад']);
  });

  it('подравнява, но НЕ пипа главните букви (И97 т.13)', () => {
    const m = menyuOtZhivi('ime', 'Дело', ['  Акт   15 ', 'акт 15']);
    // Двете остават РАЗЛИЧНИ — „Акт 15" и „акт 15" може да са различни неща.
    // Редът между тях е азбучен и не е обещание; броят и запазеният регистър са.
    expect(predlagani(m)).toHaveLength(2);
    expect(predlagani(m).map((s) => s.tekst).sort()).toEqual(['Акт 15', 'акт 15'].sort());
  });

  it('едно и също, писано по два начина, е ЕДНА стойност', () => {
    const m = menyuOtZhivi('ime', 'Дело', ['Акт 15', 'Акт  15', ' Акт 15 ']);
    expect(predlagani(m)).toHaveLength(1);
    expect(veche(m, 'акт 15')).toBe(false); // регистърът различава
    expect(veche(m, '  Акт  15  ')).toBe(true); // интервалите — не
  });

  it('празният речник е НОРМАЛНО състояние · първото дело няма от какво да избира', () => {
    const m = menyuOtZhivi('myasto', 'Място', []);
    expect(predlagani(m)).toHaveLength(0);
    // и полето пак приема — „нищо не спира човека"
    expect(sastoyanieNaPoleto({ menyu: m, vaveden: 'Първото' }).priema).toBe(true);
  });
});

describe('полето · какво носи разметката', () => {
  const m = menyuOtZhivi('myasto', 'Място', ['Малинова', 'Дианабад']);
  const html = poleSMenyu({ id: 'd-myasto', ime: 'myasto', etiket: 'Място', menyu: m, zadalzhitelno: true });

  it('вход и СПИСЪК, вързани с list', () => {
    expect(html).toContain('list="d-myasto-spisak"');
    expect(html).toContain('<datalist id="d-myasto-spisak"');
    expect(html).toContain('<option value="Малинова">');
  });

  it('носи ключа и ВИДА на менюто · законът чете оттам', () => {
    expect(html).toContain('data-menyu="myasto"');
    expect(html).toContain('data-vid="otvoreno"');
  });

  it('има МЯСТО за думата · вторият носител (ADR-032)', () => {
    expect(html).toContain('data-znak-za="d-myasto"');
    expect(html).toContain('aria-live="polite"');
  });

  it('`autocomplete="off"` · паметта на БРАУЗЪРА не е речникът на Журнала', () => {
    // Иначе списъкът показва чужди стойности от други сайтове до нашите.
    expect(html).toContain('autocomplete="off"');
  });

  it('екранира стойностите · име с кавичка не чупи разметката', () => {
    const opasno = menyuOtZhivi('ime', 'Дело', ['Акт "15"']);
    const h = poleSMenyu({ id: 'x', etiket: 'Дело', menyu: opasno });
    expect(h).toContain('&quot;15&quot;');
    expect(h).not.toContain('value="Акт "15""');
  });
});

describe('думата след записа · следа, не въпрос', () => {
  it('мълчи, когато нищо ново не влиза', () => {
    expect(sDumiZaNovite([])).toBe('');
  });

  it('казва ЕДНАТА нова стойност', () => {
    expect(sDumiZaNovite([{ menyu: 'Място', tekst: 'Банишора' }])).toBe(
      ' Нова стойност: „Банишора" в „Място".',
    );
  });

  it('и няколко наведнъж', () => {
    expect(
      sDumiZaNovite([
        { menyu: 'Място', tekst: 'Банишора' },
        { menyu: 'Дело', tekst: 'Акт 16' },
      ]),
    ).toBe(' Нови стойности: „Банишора" в „Място" · „Акт 16" в „Дело".');
  });
});

/**
 * ЧЕТИРИТЕ СЪСТОЯНИЯ, гледани ОТ ЕКРАНА · същият закон, но с речник, който
 * идва от живите дела. Домейнът ги тества сам; тук се проверява, че
 * съединяването на двете не ги е разместило.
 */
describe('законът върху жив речник', () => {
  const m = menyuOtZhivi('myasto', 'Място', ['Малинова', 'Дианабад']);

  it('натиснато и непипано → СИНЬО', () => {
    const r = sastoyanieNaPoleto({ menyu: m, vaveden: 'Малинова', izbrano: 'Малинова' });
    expect(r.tsvyat).toBe('sinio');
    expect(r.shteDobavi).toBe(false);
  });

  it('писано на ръка → ЧЕРНО, и КАЗВА, че ще влезе', () => {
    const r = sastoyanieNaPoleto({ menyu: m, vaveden: 'Банишора' });
    expect(r.tsvyat).toBe('cherno');
    expect(r.znak).toBe('＋ нова стойност');
    expect(r.shteDobavi).toBe(true);
  });

  it('натиснато, после редактирано → ПОЧЕРНЯВА в мига на разликата', () => {
    const r = sastoyanieNaPoleto({ menyu: m, vaveden: 'Малинова 2', izbrano: 'Малинова' });
    expect(r.tsvyat).toBe('cherno');
    expect(r.shteDobavi).toBe(true);
  });

  it('писано на ръка, СЛУЧАЙНО съвпадащо → пак ЧЕРНО, но нищо не се добавя', () => {
    // Неговото най-фино правило: „ти не си избирал — съвпадението е случайно."
    const r = sastoyanieNaPoleto({ menyu: m, vaveden: 'Малинова' });
    expect(r.tsvyat).toBe('cherno');
    expect(r.znak).toBe('= съществуваща');
    expect(r.shteDobavi).toBe(false);
    expect(r.priema).toBe(true);
  });

  /**
   * ЗАЩО НЕРАЗПОЗНАТИЯТ ИЗБОР Е БЕЗОПАСЕН.
   *
   * Екранът разбира „натиснал" от „писал" по `inputType`; където браузърът
   * мълчи, полето пада на ЧЕРНО. Тестът доказва, че тази посока не може да
   * развали запис: черното при съществуваща стойност пак дава `shteDobavi:
   * false`, тоест дубликат не се създава — сгрешено е само оцветяването.
   */
  it('неразпознат избор не поражда дубликат · само по-предпазлива дума', () => {
    const razpoznat = sastoyanieNaPoleto({ menyu: m, vaveden: 'Малинова', izbrano: 'Малинова' });
    const nerazpoznat = sastoyanieNaPoleto({ menyu: m, vaveden: 'Малинова' });
    expect(razpoznat.tsvyat).not.toBe(nerazpoznat.tsvyat); // цветът се различава
    expect(razpoznat.shteDobavi).toBe(nerazpoznat.shteDobavi); // а записът — НЕ
    expect(nerazpoznat.shteDobavi).toBe(false);
    expect(nerazpoznat.priema).toBe(true);
  });
});
