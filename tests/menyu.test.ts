/**
 * ЖИВИТЕ ПАДАЩИ МЕНЮТА · законът стига до екрана (И97 · ADR-040).
 *
 * Домейнът (`padashti-menyuta`) е тестван от ADR-033. Тук се пази ДРУГО:
 * че речникът се вади от Журнала, че полето носи каквото трябва, и че
 * съобщението след запис казва какво е влязло ново.
 */

import { describe, expect, it } from 'vitest';
import {
  menyuOtZhivi,
  poleSIzbor,
  poleSMenyu,
  rechnitsite,
  sDumiZaNovite,
  zapomniRechnitsite,
  ZAKLYUCHENITE,
} from '../app/menyu.js';
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

/**
 * ═══ ВТОРОТО ЛИЦЕ НА ЗАКОНА · ЗАКЛЮЧЕНИТЕ СПИСЪЦИ (ADR-042) ═══
 *
 * „Заключените растат само от Настройки" значи, че полето остава ИЗБОР — не
 * че става свободно поле с отказ. Тук се пази точно това: разметката е
 * `select`, думата е ЧЕСТНА, и нито един заключен списък не обещава място,
 * от което не расте.
 */
describe('заключеното поле · избор, катинар и причина', () => {
  const html = poleSIzbor({
    id: 'razhod-potok',
    ime: 'potok',
    etiket: 'Поток',
    spisak: 'potok',
    zadalzhitelno: true,
    opcii: '<option value="zaplati">Заплати</option>',
  });

  it('е SELECT, не текстово поле · непозната стойност не може да се появи', () => {
    expect(html).toContain('<select translate="no" id="razhod-potok"');
    expect(html).not.toContain('<datalist');
    expect(html).not.toContain('list=');
  });

  it('носи КАТИНАРА и причината, с която се заключва', () => {
    expect(html).toContain('🔒');
    expect(html).toContain(ZAKLYUCHENITE['potok']!.kazva);
    expect(html).toContain('data-zaklyuchen="potok"');
  });

  it('данните не се превеждат · правило 19 важи и за избора', () => {
    expect(html).toContain('translate="no"');
  });

  it('`name` пада на id-то, когато не е подадено', () => {
    const bez = poleSIzbor({ id: 'kade', etiket: 'Джоб', spisak: 'dzhob', opcii: '' });
    expect(bez).toContain('name="kade"');
  });

  it('непознат списък не чупи полето · казва общото', () => {
    const chuzhd = poleSIzbor({ id: 'x', etiket: 'Х', spisak: 'nyama-takav', opcii: '' });
    expect(chuzhd).toContain('🔒');
    expect(chuzhd).toContain('заключен');
  });
});

describe('думата на заключените е ЧЕСТНА, не заета от закона', () => {
  it('всеки заключен списък казва СВОЯТА причина', () => {
    for (const z of Object.values(ZAKLYUCHENITE)) {
      expect(z.kazva.trim()).not.toBe('');
      expect(z.ime.trim()).not.toBe('');
    }
  });

  /**
   * НАЙ-ВАЖНИЯТ ред в този файл. Законът казва „растат само от Настройки", но
   * НИТО ЕДИН от днешните заключени списъци не расте оттам: потоците са
   * акумулатори, секторите и ставките са членове от ЗДДС, посоката е фиксиран
   * модел. Надпис „от Настройки" върху такъв списък е ЕКРАН, КОЙТО ЛЪЖЕ —
   * най-скъпата находка на сверката от 24.08.
   *
   * Тестът пада нарочно в деня, в който някой списък наистина порасне от
   * Настройки: тогава думата се сменя ЗАЕДНО с механизма, не преди него.
   */
  it('седемте заключени списъка стоят ПОИМЕННО · екраните ги викат по ключ', () => {
    // Сгрешен ключ в екрана не хвърля — полето казва общото „заключен". Тихо
    // и по-бедно, значи се пази с изброяване, а не с надежда.
    expect(Object.keys(ZAKLYUCHENITE).sort()).toEqual(
      ['dzhob', 'nachin', 'posoka', 'potok', 'sastoyanie-imot', 'sektor', 'stavka'].sort(),
    );
  });

  /**
   * И ЕДИНСТВЕНОТО ИЗКЛЮЧЕНИЕ · поименно, не мимоходом (резен 99 · ADR-157).
   *
   * „Състоянието на Имота" наистина расте от Настройки — там му е секцията, и
   * менюто в Имоти се пълни от нея. Затова думата му МОЖЕ да сочи натам; всяка
   * друга дума пак не може. Изключение, което се брои поименно, е решение;
   * изключение, зашито в правилото, е дупка (правило 15).
   */
  it('само СЪСТОЯНИЕТО обещава Настройки · и то, защото наистина расте оттам', () => {
    const sochat = Object.values(ZAKLYUCHENITE)
      .filter((z) => z.kazva.includes('Настройки'))
      .map((z) => z.klyuch);
    expect(sochat).toEqual(['sastoyanie-imot']);
  });
});

describe('речниците по ключ · личното и служебното не се смесват', () => {
  it('непознат ключ дава ПРАЗНА карта, не грешка', () => {
    expect(rechnitsite('нямагоняма').size).toBe(0);
  });

  it('два ключа държат РАЗЛИЧНИ речници', () => {
    zapomniRechnitsite('sluzhebno', new Map([['koy', menyuOtZhivi('koy', 'Кой', ['ЛИДЛ'])]]));
    zapomniRechnitsite('lichno', new Map([['koy', menyuOtZhivi('koy', 'Кой', ['Кауфланд'])]]));
    expect(predlagani(rechnitsite('sluzhebno').get('koy')!).map((s) => s.tekst)).toEqual(['ЛИДЛ']);
    expect(predlagani(rechnitsite('lichno').get('koy')!).map((s) => s.tekst)).toEqual(['Кауфланд']);
  });
});

describe('живото поле · правило 19 стигна и до него', () => {
  it('входът носи `translate="no"` · името на наемател не се превежда', () => {
    // Пропуснато при ADR-040 и намерено чак когато менютата излязоха от
    // Управление: §17 на прохода пазеше само екран Имоти.
    const m = menyuOtZhivi('naemetel', 'Наемател', ['Петров ЕООД']);
    expect(poleSMenyu({ id: 'naem-naemetel', etiket: 'Наемател', menyu: m })).toContain(
      'translate="no"',
    );
  });

  it('редът с проблема стои ВЪТРЕ в полето', () => {
    const m = menyuOtZhivi('dostavchik', 'Доставчик', []);
    const html = poleSMenyu({
      id: 'razhod-dostavchik',
      etiket: 'Доставчик',
      menyu: m,
      pod: '<p class="kazva-problem" id="kazva-dostavchik"></p>',
    });
    const krayNaPoleto = html.lastIndexOf('</div>');
    expect(html.indexOf('kazva-dostavchik')).toBeLessThan(krayNaPoleto);
  });
});
