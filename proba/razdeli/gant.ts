import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, zapishiDelo } from '../yadro/pomoshtni.ts';

/** 24 · Гант */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '24 · Гант';
    await naEkran(p, 'gant', '#d-forma-delo');

    proveri('седмият екран носи неговото име',
      await p.$eval('.shapka h1', (e) => e.textContent.trim()), 'Управление');
    proveri('и подзаглавието е дословно негово',
      (await p.$eval('.shapka p', (e) => e.textContent)).includes('Времевия Ред в Делата'), true);
    // Празният екран КАЗВА и кой е (И98): дотук заглавието се рисуваше само
    // вътре в таблицата, а при нула дела таблица нямаше — празният личен
    // екран не казваше дори че е личен.
    proveri('празният екран го КАЗВА',
      (await p.$eval('.prazno', (e) => e.textContent)).includes('Място · Обект · Дело'), true);
    proveri('и се представя, вместо да мълчи',
      (await p.$eval('.prazno', (e) => (e.closest('section') as any).textContent)).includes('Времевия Ред'), true);

    // ТРИТЕ КОЛОНИ · дело БЕЗ обект е нормално (негов случай).
    await zapishiDelo(p, { myasto: 'Малинова', obekt: 'бл. 1', ime: 'Акт 15',
      otgovornik: 'Николай Петков', ot: denOtDnes(0), do: denOtDnes(38), otsenka: 'спешно-важно' });
    await zapishiDelo(p, { myasto: 'Малинова', obekt: 'бл. 1', ime: 'Кофраж',
      otgovornik: 'Тихомир Иванов', ot: denOtDnes(0), do: denOtDnes(1), otsenka: 'спешно-неважно' });
    await zapishiDelo(p, { myasto: 'Хисаря', obekt: '', ime: 'Оглед без обект',
      otgovornik: 'Ивайло Петков', ot: denOtDnes(0), do: denOtDnes(0), otsenka: 'важно-неспешно' });

    proveri('три дела на екрана', (await p.$$eval('.gant-delo', (e) => e.length)), 3);
    proveri('двете места стоят като редове', (await p.$$eval('.gant-myasto', (e) => e.length)), 2);
    proveri('делото без обект се показва с тире',
      (await p.$$eval('.gant-delo .drebno', (e) => e.map((x) => x.textContent)))
        .some((t) => t.startsWith('—')), true);

    // ══ 108 · ОТПАДНАЛИТЕ ДЕЛА (резен 30 · ADR-090) ═══════════════════════
    //
    // Негова дума: „остават в отедлно наи тфолу тези които са отпаднали но се
    // пази история като бацк уп". Отпадналото НЕ е сторнирано: сторното казва
    // „това никога не е трябвало да се записва", отпадането — „беше вярно,
    // вече няма предмет".
    razdel = '108 · Отпадналите · блокът КАЗВА и нулата';
    proveri('блокът стои и при НУЛА отпаднали',
      await p.$eval('[data-sektsiya=gant-otpadnali]', (e) => (e as any).dataset.broy), '0');
    proveri('и го КАЗВА с думи',
      (await p.$eval('[data-sektsiya=gant-otpadnali]', (e) => (e as any).innerText))
        .includes('Нито едно отпаднало дело'), true);
    proveri('„отпаднало" е избираемо в менюто на състоянието',
      await p.$$eval('#d-sastoyanie option', (o) => o.map((x) => (x as any).value)),
      ['чака', 'в процес', 'завършено', 'отпаднало']);

    razdel = '108 · Отпадналите · новото не влиза при живите, но ОСТАВА';
    const prediOtpadane = await p.$$eval('.gant-delo', (e) => e.length);
    await zapishiDelo(p, { myasto: 'Хисаря', obekt: '', ime: 'Оглед без обект',
      otgovornik: 'Ивайло Петков', ot: denOtDnes(0), do: denOtDnes(0),
      otsenka: 'важно-неспешно', sastoyanie: 'отпаднало' });

    // Делото е записано ВЕДНАГА като отпаднало, тъй че живите НЕ се менят —
    // а точно това е проверката: новото не влиза при работата.
    proveri('живите НЕ се менят · отпадналото не влиза при тях',
      await p.$$eval('.gant-delo', (e) => e.length), prediOtpadane);
    proveri('но делото СТОИ в своя списък',
      await p.$$eval('[data-tablitsa=otpadnali-dela] [data-otpadnalo]', (e) => e.length), 1);
    proveri('и списъкът казва КОЙ го е отпаднал',
      (await p.$eval('[data-tablitsa=otpadnali-dela] [data-otpadnalo]', (e) => (e as any).innerText))
        .includes('vintexstroy@gmail.com'), true);
    proveri('броят се КАЗВА',
      await p.$eval('[data-sektsiya=gant-otpadnali]', (e) => (e as any).dataset.broy), '1');

    razdel = '108 · Отпадналите · скриването е ЛИЧНО, нула събития';
    const prediSkrivane = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#d-otpadnali-prevkl'));
    proveri('скриването маха таблицата от екрана',
      await p.$$eval('[data-tablitsa=otpadnali-dela]', (e) => e.length), 0);
    proveri('но НЕ пише нищо в Журнала', await broySabitiya(p), prediSkrivane);
    proveri('и блокът пак КАЗВА колко са',
      await p.$eval('[data-sektsiya=gant-otpadnali]', (e) => (e as any).dataset.broy), '1');
    await deystvieSPrerisuvane(p, () => p.click('#d-otpadnali-prevkl'));
    proveri('връщането ги показва пак',
      await p.$$eval('[data-tablitsa=otpadnali-dela] [data-otpadnalo]', (e) => e.length), 1);

    // ══ 57 · ЗАКОНЪТ ЗА МЕНЮТАТА · живите речници (И97 · ADR-040) ══════════
    //
    // Речникът НЕ се пази отделно — той Е онова, което вече стои в делата.
    // Трите записани дела току-що го напълниха, без нито едно ново събитие.
}
