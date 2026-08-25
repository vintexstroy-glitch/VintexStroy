/**
 * СЪБИТИЯТА · всяко, което Вратата може да напише, има четец в Огледалото.
 *
 * ЗАЩО ТОЗИ ТЕСТ СЪЩЕСТВУВА. `fold()` завършва с `default: break` и това е
 * НАРОЧНО — стар код трябва да може да прочете по-нов Журнал, без да се
 * събори. Но същият този `default` мълчи и когато името е сгрешено: записът
 * влиза в Журнала, брои се като приложен и не мени нищо. Тих загубен запис в
 * система, чието първо правило е нула загуба на данни.
 *
 * Затова строгостта е при ВХОДА: `#pusni` иска `TipSabitie`, не `string`.
 * А този тест пази втората половина — че всеки тип от съюза наистина има
 * `case` в `fold()`.
 *
 * Тестът чете ИЗВОРА, не типовете: типовете се изтриват при компилация, а
 * договорът между писача и четеца трябва да се провери такъв, какъвто е
 * написан. Същият похват като `tests/imena.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SABITIYA = readFileSync('src/domein/sabitiya.ts', 'utf8');
const OGLEDALO = readFileSync('src/ogledalo/ogledalo.ts', 'utf8');
const DEYSTVIYA = readFileSync('src/domein/deystviya.ts', 'utf8');

/** Имената от съюза `TipSabitie`, извадени от самия извор. */
function vidoveOtSayuza(): string[] {
  const nachalo = SABITIYA.indexOf('export type TipSabitie =');
  expect(nachalo, 'TipSabitie трябва да съществува').toBeGreaterThan(-1);
  const kray = SABITIYA.indexOf(';', nachalo);
  const blok = SABITIYA.slice(nachalo, kray);
  return [...blok.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

/** Имената, за които `fold()` има `case`. */
function vidoveSChetets(): string[] {
  return [...OGLEDALO.matchAll(/case '([^']+)':/g)].map((m) => m[1]!);
}

/** Имената, които `Deystviya` наистина подава на Вратата. */
function vidoveSPisach(): string[] {
  return [...DEYSTVIYA.matchAll(/#pusni\(\s*'([^']+)'/g)].map((m) => m[1]!);
}

describe('договорът между писача и четеца', () => {
  it('ВСЯКО събитие от съюза има case в fold() — иначе е тих загубен запис', () => {
    const sayuz = vidoveOtSayuza();
    const chetets = new Set(vidoveSChetets());
    // „Сторно" се обработва в първото минаване на `fold()` (погасяванията),
    // не в switch-а на второто — затова има свое изключение, назовано поименно.
    const OBRABOTENI_INAKVE = new Set(['Сторно']);
    const bezChetets = sayuz.filter((v) => !chetets.has(v) && !OBRABOTENI_INAKVE.has(v));
    expect(bezChetets).toEqual([]);
  });

  it('ВСЯКО име, което Действията подават, е в съюза — не просто низ', () => {
    const sayuz = new Set(vidoveOtSayuza());
    const izvan = vidoveSPisach().filter((v) => !sayuz.has(v));
    expect(izvan).toEqual([]);
  });

  it('Вратата иска ТИПА, не низ — иначе печатна грешка минава мълчешком', () => {
    expect(DEYSTVIYA).toContain('type: TipSabitie');
    expect(DEYSTVIYA).not.toMatch(/#pusni\(\s*\n?\s*type: string/);
  });

  it('fold() ОСТАВА снизходителен — стар код чете по-нов Журнал', () => {
    // Обратното на горното и също толкова важно: строгостта е при ВХОДА, не
    // при изхода. Махне ли се този `default`, едно бъдещо събитие ще събори
    // Огледалото на всеки, който още не се е обновил.
    expect(OGLEDALO).toContain('default:');
    expect(OGLEDALO).toContain('НЕПОЗНАТ тип не събаря Огледалото');
  });

  it('ЗНАЕН, но пренебрегнат тип има ПОИМЕНЕН случай, не пада в default', () => {
    // „ВалутаИзбрана" вече не се пише (ADR-014: валутата е една и живее в
    // колоната). Старите Журнали я носят. Ако падаше в `default`, тя щеше да е
    // неразличима от печатна грешка в име — затова има свой случай.
    expect(OGLEDALO).toContain("case 'ВалутаИзбрана'");
    expect(OGLEDALO).toContain('ЗНАЕН тип, НАРОЧНО пренебрегнат');
  });

  it('сверка вход↔изход · и разликата се КАЗВА, дори когато е нула', () => {
    const sayuz = vidoveOtSayuza();
    const pisachi = new Set(vidoveSPisach());
    const chetets = new Set(vidoveSChetets());

    // Двете изключения са назовани ПОИМЕННО, не хванати с формула. Формулата
    // мълчи, когато светът се промени; поименният списък пада на глас.
    const bezChetets = sayuz.filter((v) => !chetets.has(v));
    const bezPisach = sayuz.filter((v) => !pisachi.has(v));

    // „Сторно" се обработва в ПЪРВОТО минаване на fold() (погасяванията), не
    // в switch-а на второто. Затова няма `case` — и това е нарочно.
    expect(bezChetets).toEqual(['Сторно']);

    // „ВалутаИзбрана" вече не се пише; чете се поименно и се пренебрегва.
    expect(bezPisach).toEqual(['ВалутаИзбрана']);

    // Разликата, изписана: 28 в съюза, 27 писани, 27 четени, по едно изключение
    // от всяка страна — и двете обяснени горе. (Бяха 20/19/19, преди „АгентЗаписан"
    // и „ПредложениеЗаписано" с ИИ-таблото — И92 т.10 · ADR-026; после 22/21/21,
    // преди „ТабЗаписан" с табовете и секциите — И92 т.9 · ADR-027; после 23/22/22,
    // преди „ЗадачаЗаписана" с разписанията — И94 т.1 · ADR-029; после 24/23/23,
    // преди „СвръзкаЗаписана" с Журнала от таблица — И96 т.8 · ADR-035; после
    // 25/24/24, преди ТРИТЕ на личния таб — „ЛичноПревключено", „ДелоПрехвърлено"
    // и „ПреносОтчетен" — И98 · ADR-036; после 28/27/27, преди
    // „ЛиченДостъпЗаписан" — обратната посока на споделянето, И99 · ADR-037;
    // после 29/28/28, преди ПЕТТЕ на личните пари — „ЛичнаТемаЗаписана",
    // „ЛичноДвижениеЗаписано", „ЛиченРедИзключен", „ЛиченКредитЗаписан" и
    // „ЛичноИзвлечениеПрието" — И96 т.10 · ADR-038; после 34/33/33, преди
    // „СтопанинЗаписан" — първото събитие в Журнала, И97 т.8 · ADR-043; после
    // 35/34/34, преди „ЗапасенКонтактЗаписан" и „СтопанинСменен" — пътят
    // обратно, И100 · ADR-044; после 37/36/36, преди „ПараметърНаВходаЗаписан" —
    // параметрите при въвеждане получиха екран, И96 т.1 · ADR-046.)
    expect({ sayuz: sayuz.length, pisachi: pisachi.size, chetets: chetets.size }).toEqual({
      sayuz: 38,
      pisachi: 37,
      chetets: 37,
    });
  });
});
