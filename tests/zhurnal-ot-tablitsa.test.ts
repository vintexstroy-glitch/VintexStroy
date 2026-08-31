/**
 * ЖУРНАЛЪТ ОТ ТАБЛИЦА · И96 т.8.
 *
 * Негово: „Няма редакция, а НОВ ФАЙЛ ЗАЛЕПЕН ЗА СТАРИЯ… скачени с ТРЕТИ НОМЕР
 * обединяващ и двата… с новите надградени номерация ИЗВЪН графата на нормалния
 * ред."
 *
 * Тестът пази четирите неща, които могат да се изгубят:
 *   · Журналът НЕ се трие — изтрит ред в Ексел не трие събитие;
 *   · заключена колона, пипната в Ексел, отказва ЦЯЛОТО внасяне;
 *   · третият номер СТОИ, а поколението расте;
 *   · сверка вход↔изход върху всяка партида, дори когато е нула.
 */

import { describe, expect, it } from 'vitest';
import { otCSV } from '../src/iztochnik/csv.js';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { SHA } from './pomoshtni.js';
import {
  GLAVA_NA_ZHURNALA,
  GreshkaTablitsa,
  IMENA_NA_SADBITE,
  REDAKTIRUEMI,
  SADBI,
  ZAKLYUCHENI,
  listNaZhurnala,
  novPayload,
  opisanieNa,
  parichnoPole,
  pishiSvrazka,
  sledvashtSvrazkaNomer,
  sumaNa,
  sveriTablitsata,
  svrazkaNaFayla,
  zalepi,
  zapochniSvrazka,
  zashtoNeSePriema,
  type FaylVSvrazka,
} from '../src/domein/zhurnal-ot-tablitsa.js';
import type { Sabitie } from '../src/yadro/index.js';

// ── две събития, каквито Журналът наистина носи ────────────────────────────
function sabitie(n: {
  seq: number;
  opId: string;
  type: string;
  payload: Record<string, unknown>;
}): Sabitie {
  return {
    seq: n.seq,
    opId: n.opId,
    ts: `2026-08-0${n.seq}T09:00:00.000Z`,
    naematel: 'vintexstroy@gmail.com',
    actor: 'vintexstroy@gmail.com',
    type: n.type,
    sashtnost: { vid: 'plashtane', id: `P${n.seq}` },
    payload: n.payload,
    prevHash: '',
    hash: `hash-${n.seq}-0123456789abcdef`,
  };
}

const ZHURNALAT: readonly Sabitie[] = Object.freeze([
  sabitie({
    seq: 1,
    opId: 'op-1',
    type: 'ПлащанеПрието',
    payload: { vzemaneId: 'V1', suma_st: 540_00, nachin: 'банка', opis: 'наем август' },
  }),
  sabitie({
    seq: 2,
    opId: 'op-2',
    type: 'РазходЗаписан',
    payload: { dostavchik: 'Материали ООД', suma_st: 1_250_00, opis: 'цимент' },
  }),
  sabitie({
    seq: 3,
    opId: 'op-3',
    type: 'ДелоЗаписано',
    payload: { myasto: 'Малинова Долина', obekt: '', ime: 'Акт 16' },
  }),
]);

/** Строи CSV точно като изнесената таблица, с възможност да се „редактира". */
function tablitsa(promeni: Record<string, Partial<Record<string, string>>> = {}, bezRedove: readonly string[] = []): ReturnType<typeof otCSV> {
  const redove = [GLAVA_NA_ZHURNALA.join(';')];
  const list = listNaZhurnala(ZHURNALAT);
  for (const red of list.redove) {
    const opId = String(red[7]);
    if (bezRedove.includes(opId)) continue;
    const kletki = red.map(String);
    const p = promeni[opId] ?? {};
    for (const [ime, stoynost] of Object.entries(p)) {
      const i = GLAVA_NA_ZHURNALA.indexOf(ime);
      if (i >= 0 && stoynost !== undefined) kletki[i] = stoynost;
    }
    redove.push(kletki.join(';'));
  }
  return otCSV(redove.join('\n'), 'ЖУРНАЛ');
}

describe('свръзката · третият номер', () => {
  const fayl = (nomer: number, otpechatak: string): FaylVSvrazka => ({
    nomer,
    ime: `ЖУРНАЛ-${nomer}.xlsx`,
    dataNaFayla: '2026-08-20',
    kogato: '2026-08-25',
    actor: 'vintexstroy@gmail.com',
    sluchay: 'сгрешена сума по вноска 1',
    redove: 3,
    otpechatak,
  });

  it('свръзка се прави от ДВА файла — един край не е свръзка', () => {
    expect(() => zapochniSvrazka(7, [fayl(1, 'a')])).toThrow(GreshkaTablitsa);
    expect(() => zapochniSvrazka(0, [fayl(1, 'a'), fayl(2, 'b')])).toThrow(/цяло число над нула/);
  });

  it('първото поколение е „С7" · номерацията е СВОЯ, не seq', () => {
    const s = zapochniSvrazka(7, [fayl(1, 'a'), fayl(2, 'b')]);
    expect(s.nomer).toBe(7);
    expect(s.pokolenie).toBe(1);
    expect(pishiSvrazka(s)).toBe('С7');
    expect(s.fayli).toHaveLength(2);
  });

  it('трета редакция НАДГРАЖДА — номерът стои, поколението расте', () => {
    // Сменен номер прави невярно всяко място, където старият е цитиран
    // (правило 17). Затова расте поколението, не номерът.
    const s = zalepi(zapochniSvrazka(7, [fayl(1, 'a'), fayl(2, 'b')]), fayl(3, 'v'));
    expect(s.nomer).toBe(7);
    expect(s.pokolenie).toBe(2);
    expect(pishiSvrazka(s)).toBe('С7·2');
    expect(s.fayli).toHaveLength(3);
    const chetvarti = zalepi(s, fayl(4, 'g'));
    expect(pishiSvrazka(chetvarti)).toBe('С7·3');
  });

  it('СЪЩИЯТ файл не прави ново поколение', () => {
    const s = zapochniSvrazka(7, [fayl(1, 'a'), fayl(2, 'b')]);
    expect(zalepi(s, fayl(3, 'b'))).toBe(s); // същият отпечатък
  });

  it('следващият номер се БРОИ, не се гадае', () => {
    expect(sledvashtSvrazkaNomer([])).toBe(1);
    const s = zapochniSvrazka(7, [fayl(1, 'a'), fayl(2, 'b')]);
    expect(sledvashtSvrazkaNomer([s])).toBe(8);
  });

  it('свръзката се намира по номер на ФАЙЛ · за тайминга на Журнала', () => {
    const s = zapochniSvrazka(7, [fayl(1, 'a'), fayl(2, 'b')]);
    expect(svrazkaNaFayla([s], 2)?.nomer).toBe(7);
    expect(svrazkaNaFayla([s], 9)).toBeUndefined();
  });

  it('всеки файл носи ДВЕ дати · на файла и на записа', () => {
    // Решаваш в понеделник, връщаш файла в четвъртък. Счетоводството иска
    // истинската дата, следата иска и двете (същото като при сторното, И97).
    const f = fayl(1, 'a');
    expect(f.dataNaFayla).not.toBe(f.kogato);
    expect(f.sluchay).not.toBe('');
  });
});

describe('износът · Журналът като четима таблица', () => {
  it('главата е деветте колони, с КОТВАТА накрая', () => {
    const l = listNaZhurnala(ZHURNALAT);
    // ДЕВЕТТЕ се БРОЯТ. Без този ред заглавието твърди число, което нищо не
    // проверява: сравнението отдолу е на живия изход СРЕЩУ същата константа,
    // тъй че махнеш ли колона, двете страни мърдат заедно и тестът мълчи.
    expect(GLAVA_NA_ZHURNALA).toHaveLength(9);
    expect(l.koloni.map((k) => k.ime)).toEqual([...GLAVA_NA_ZHURNALA]);
    // без ключа върнатият файл не може да се свърже с Журнала
    expect(GLAVA_NA_ZHURNALA).toContain('Ключ');
    expect(GLAVA_NA_ZHURNALA).toContain('Отпечатък');
  });

  it('парите излизат четими, а събитие без пари дава празна клетка', () => {
    const l = listNaZhurnala(ZHURNALAT);
    expect(l.redove[0]![6]).toBe('540,00');
    expect(l.redove[1]![6]).toBe('1 250,00'.replace(/ /g, ' '));
    expect(l.redove[2]![6]).toBe(''); // ДелоЗаписано няма поле за пари
  });

  it('парите се намират по правило, не по таблица от видове', () => {
    expect(parichnoPole({ suma_st: 100, opis: 'х' })).toBe('suma_st');
    expect(parichnoPole({ opis: 'х' })).toBe('');
    // текст в поле за пари не се брои за пари
    expect(parichnoPole({ suma_st: '100' })).toBe('');
    expect(sumaNa(ZHURNALAT[2]!)).toBeUndefined();
    expect(opisanieNa(ZHURNALAT[2]!)).toBe('Акт 16'); // пада на „ime"
  });

  it('заключените и редактируемите заедно дават цялата глава', () => {
    expect([...ZAKLYUCHENI, ...REDAKTIRUEMI].sort()).toEqual([...GLAVA_NA_ZHURNALA].sort());
    expect([...SADBI]).toEqual(['sasht', 'promenen', 'nov', 'lipsva', 'zaklyuchen']);
    for (const s of SADBI) expect(IMENA_NA_SADBITE[s]).not.toBe('');
  });
});

describe('връщането · какво се е променило', () => {
  it('непипнатата таблица дава НУЛА промени — и сверката излиза', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa());
    expect(p.promeni).toHaveLength(0);
    expect(p.sashti).toBe(3);
    expect(p.priema).toBe(true);
    // разликата се връща ДОРИ когато е нула (правило 7)
    expect(p.sverka).toEqual({ vhod: 3, izhod: 3, razlika: 0 });
  });

  /**
   * ДРУГОТО ПИСАНЕ НА ЕДНО „й" НЕ Е ПРОМЯНА.
   *
   * Човек изнася Журнала, отваря го на друга машина, не пипа НИЩО и го връща.
   * Ако клетките се сравняваха байт по байт, всеки ред с „й" се обявяваше за
   * променен — и сверката раждаше сторно плюс нов запис за промяна, каквато
   * никой не е правил. Журнал, който порасва с измислена история.
   *
   * Намерено от независим сверител. Главата вече минаваше през NFC
   * (`svedenaGlava`); съдържанието — не.
   */
  it('РАЗЛОЖЕНО „й" в клетка не е промяна · правило 12', () => {
    // Журнал с ЕДНО събитие, чието описание носи „й" — буквата, която се пише
    // по два начина и изглежда еднакво и в двата.
    const sSKratka: readonly Sabitie[] = Object.freeze([
      sabitie({
        seq: 1,
        opId: 'op-й',
        type: 'РазходЗаписан',
        payload: { dostavchik: 'Строй ООД', suma_st: 100_00, opis: 'ремонт на покрива' },
      }),
    ]);

    const izneseno = listNaZhurnala(sSKratka);
    const kakvotoSeVrashta = [
      GLAVA_NA_ZHURNALA.join(';'),
      // Върнатият файл е ДОСЛОВНО същият, само разложен — както го дава друга
      // машина или друга клавиатура. Нищо не е пипано от човек.
      izneseno.redove[0]!.map(String).join(';').normalize('NFD'),
    ].join('\n');
    expect(kakvotoSeVrashta).not.toBe(kakvotoSeVrashta.normalize('NFC'));

    const p = sveriTablitsata(sSKratka, otCSV(kakvotoSeVrashta, 'ЖУРНАЛ'));
    expect(p.promeni, p.promeni.map((x) => `${x.kolona}: ${x.bilo}`).join(' · ')).toHaveLength(0);
    expect(p.sashti).toBe(1);
  });

  it('поправена СУМА се хваща, с „било" и „става"', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { Сума: '560,00' } }));
    expect(p.promeni).toHaveLength(1);
    const promyana = p.promeni[0]!;
    expect(promyana.seq).toBe(1);
    expect(promyana.kolona).toBe('Сума');
    expect(promyana.bilo).toBe('540,00');
    expect(promyana.stava_st).toBe(560_00);
    expect(promyana.pole).toBe('suma_st');
    expect(p.sashti).toBe(2);
  });

  it('поправено ОПИСАНИЕ се хваща отделно от сумата', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-2': { Описание: 'цимент и вар' } }));
    expect(p.promeni).toHaveLength(1);
    expect(p.promeni[0]!.pole).toBe('opis');
    expect(p.promeni[0]!.stava).toBe('цимент и вар');
  });

  it('двете колони на един ред са ДВЕ промени', () => {
    const p = sveriTablitsata(
      ZHURNALAT,
      tablitsa({ 'op-1': { Сума: '560,00', Описание: 'наем септември' } }),
    );
    expect(p.promeni).toHaveLength(2);
    expect(p.promeni.map((x) => x.kolona).sort()).toEqual(['Описание', 'Сума']);
  });

  it('различно ИЗПИСВАНЕ на същата сума не е промяна', () => {
    // „540.00" и „540,00" са едно число. Текстово сравнение би направило
    // всяка отворена в чужд Ексел таблица на партида поправки.
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { Сума: '540.00' } }));
    expect(p.promeni).toHaveLength(0);
    expect(p.sashti).toBe(3);
  });

  it('новият payload носи СТАРОТО непокътнато, с едно сменено поле', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { Сума: '560,00' } }));
    const nov = novPayload(ZHURNALAT[0]!, p.promeni[0]!);
    expect(nov['suma_st']).toBe(560_00);
    expect(nov['nachin']).toBe('банка'); // не се губи
    expect(nov['opis']).toBe('наем август'); // и бележката остава
  });
});

describe('Журналът НЕ се трие · правило 1 на входа', () => {
  it('изтрит ред в Ексел се КАЗВА и НЕ трие събитие', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({}, ['op-2']));
    expect(p.lipsvashti).toEqual([2]);
    expect(p.promeni).toHaveLength(0);
    // и сверката вход↔изход показва разликата, вместо да я преглътне
    expect(p.sverka).toEqual({ vhod: 3, izhod: 2, razlika: -1 });
    expect(p.priema).toBe(true); // казва се, но не спира останалото
  });

  it('дописан ред без ключ се КАЗВА и НЕ влиза', () => {
    // Ново събитие се въвежда през своя екран: свободно написан ред няма вид
    // и същност, а измисленият вид е по-лош от липсващия.
    const t = tablitsa();
    const redove = [...t.redove, ['', '', '', '', '', 'нещо ново', '100,00', '', '']];
    const p = sveriTablitsata(ZHURNALAT, { ...t, redove });
    expect(p.novi).toEqual([5]); // номерът на реда, както го вижда човекът
    expect(p.promeni).toHaveLength(0);
  });

  it('ключ, който Журналът не познава, също не влиза', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-2': { Ключ: 'op-чужд' } }));
    expect(p.novi).toHaveLength(1);
    expect(p.lipsvashti).toEqual([2]);
  });
});

describe('заключените колони · разбърканата таблица се отказва', () => {
  it('пипнат № отказва ЦЯЛОТО внасяне', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { '№': '99' } }));
    expect(p.priema).toBe(false);
    expect(p.zaklyucheni).toHaveLength(1);
    expect(p.zaklyucheni[0]!.kolona).toBe('№');
    expect(p.zaklyucheni[0]!.bilo).toBe('1');
  });

  it('пипнат отпечатък или актьор — също', () => {
    for (const [kolona, stoynost] of [
      ['Отпечатък', 'друго'],
      ['Кой', 'chuzhd@gmail.com'],
      ['Какво', 'РазходЗаписан'],
      ['Същност', 'imot:X'],
      ['Кога', '2026-01-01T00:00:00.000Z'],
    ] as const) {
      const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { [kolona]: stoynost } }));
      expect(p.priema, kolona).toBe(false);
    }
  });

  it('отказът КАЗВА кой ред, коя колона и какво е било', () => {
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-1': { '№': '99' } }));
    const dumi = zashtoNeSePriema(p);
    expect(dumi).toContain('ред 2');
    expect(dumi).toContain('№');
    expect(dumi).toContain('изнеси я наново');
    expect(zashtoNeSePriema(sveriTablitsata(ZHURNALAT, tablitsa()))).toBe('');
  });

  it('сума, вписана на събитие БЕЗ пари, е грешка — не поправка', () => {
    // „ДелоЗаписано" няма поле за пари. Измислено такова поле би било ново
    // свойство на събитие, а не поправка на записаното.
    const p = sveriTablitsata(ZHURNALAT, tablitsa({ 'op-3': { Сума: '100,00' } }));
    expect(p.priema).toBe(false);
    expect(p.zaklyucheni[0]!.kolona).toBe('Сума');
  });

  it('файл без колона „Ключ" се отказва С ДУМИ', () => {
    const bezKlyuch = otCSV('№;Кога;Сума\n1;2026-08-01;540,00', 'ЖУРНАЛ');
    expect(() => sveriTablitsata(ZHURNALAT, bezKlyuch)).toThrow(/Ключ/);
    expect(() => sveriTablitsata(ZHURNALAT, bezKlyuch)).toThrow(/гадаене/);
  });
});

describe('свръзката ВЛИЗА в Журнала · не живее встрани', () => {
  function stend() {
    const dnevnik = new DnevnikVPametta();
    const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
    let tik = 0;
    const deystviya = new Deystviya({
      vrata,
      dnevnik,
      naematel: 'vintexstroy',
      actor: 'vintexstroy@gmail.com',
      chasovnik: () => new Date(Date.UTC(2026, 7, 25, 9, 0, tik++)).toISOString(),
    });
    return { deystviya };
  }

  const zapis = (fayl: number, pokolenie: number, otpechatak: string, sluchay = 'сгрешена сума') => ({
    nomer: 7,
    pokolenie,
    fayl,
    ime: `ЖУРНАЛ-${fayl}.xlsx`,
    dataNaFayla: '2026-08-20',
    sluchay,
    redove: 3,
    otpechatak,
    promeneni: 1,
  });

  it('всяко ЗАЛЕПВАНЕ е свой запис, не презапис на предишния', async () => {
    // Иначе „кога дойде третият файл" остава без отговор от историята.
    const { deystviya } = stend();
    await deystviya.zapishiSvrazka(zapis(1, 1, 'a'), { opId: 'sv-1' });
    await deystviya.zapishiSvrazka(zapis(2, 1, 'b'), { opId: 'sv-2' });
    await deystviya.zapishiSvrazka(zapis(3, 2, 'v'), { opId: 'sv-3' });

    const o = await deystviya.ogledalo();
    const s = o.svrazki.get(7)!;
    expect(s.nomer).toBe(7);
    expect(s.pokolenie).toBe(2); // последният запис носи текущото поколение
    expect(s.fayli).toHaveLength(3);
    expect(s.fayli.map((f) => f.nomer)).toEqual([1, 2, 3]);
    expect(pishiSvrazka(s)).toBe('С7·2');
  });

  it('свръзка без СЛУЧАЙ се отказва С ДУМИ', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zapishiSvrazka(zapis(1, 1, 'a', '   '), { opId: 'sv-1' }),
    ).rejects.toThrow(/СЛУЧАЙ/);
  });

  it('огледалото пази датата на ФАЙЛА и датата на ЗАПИСА поотделно', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSvrazka(zapis(1, 1, 'a'), { opId: 'sv-1' });
    const f = (await deystviya.ogledalo()).svrazki.get(7)!.fayli[0]!;
    expect(f.dataNaFayla).toBe('2026-08-20');
    expect(f.kogato.slice(0, 10)).toBe('2026-08-25');
    expect(f.actor).toBe('vintexstroy@gmail.com');
  });

  it('повторният opId не прави второ залепване · идемпотентност (правило 5)', async () => {
    const { deystviya } = stend();
    await deystviya.zapishiSvrazka(zapis(1, 1, 'a'), { opId: 'sv-1' });
    await deystviya.zapishiSvrazka(zapis(1, 1, 'a'), { opId: 'sv-1' });
    expect((await deystviya.ogledalo()).svrazki.get(7)!.fayli).toHaveLength(1);
  });
});
