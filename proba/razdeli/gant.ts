import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, napishiVPoleto, sSabitie, zapishiDelo } from '../yadro/pomoshtni.ts';

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

    // ══ 109 · МЕСТАТА · отговорник-ФИРМА и папка (резен 31 · ADR-091) ═════
    //
    // Едно негово изречение, два реда от описа: „На нивото на проекта дай линк
    // към папката с проекта" и „в таблицата за отговорник напиши фирмата която
    // управлява проекта" *(р48·[42])*. И границата: отговорникът на ДЕЛОТО е
    // ЧОВЕК *(р48·[44])*.
    razdel = '109 · Местата · незаписаните се ПОКАЗВАТ';
    proveri('двете места от делата са в списъка',
      await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) => e.length), 2);
    proveri('и двете КАЗВАТ, че още не са записани',
      await p.$eval('[data-sektsiya=gant-mesta]', (e) => (e as any).dataset.bezZapis), '2');
    proveri('сверката се КАЗВА, дори когато е нула',
      (await p.$eval('[data-mesta-sverka]', (e) => (e as any).innerText)).includes('разлика 0'), true);

    razdel = '109 · Местата · фирмата и папката';
    const prediMyasto = await broySabitiya(p);
    await napishiVPoleto(p, '#d-m-ime', 'Малинова');
    await napishiVPoleto(p, '#d-m-firma', 'Винтекс Строй ЕООД');
    await sSabitie(p, () => p.click('#d-forma-myasto button[type=submit]'));
    proveri('записването е ЕДНО събитие', await broySabitiya(p), prediMyasto + 1);
    proveri('фирмата стои на реда на мястото',
      (await p.$eval('[data-myasto="Малинова"]', (e) => (e as any).innerText))
        .includes('Винтекс Строй ЕООД'), true);
    proveri('и редът вече НЕ е „още не е записано"',
      await p.$eval('[data-sektsiya=gant-mesta]', (e) => (e as any).dataset.bezZapis), '1');
    proveri('броят на делата на мястото се КАЗВА',
      (await p.$eval('[data-myasto="Малинова"]', (e) => (e as any).innerText)).includes('2'), true);

    razdel = '109 · Местата · двата отговорника не се смесват';
    proveri('делото си пази ЧОВЕКА',
      (await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).innerText).join(' ')))
        .includes('Николай Петков'), true);
    proveri('а мястото носи ФИРМАТА · заглавието го КАЗВА',
      (await p.$eval('[data-sektsiya=gant-mesta] .dyalglava', (e) => (e as any).innerText))
        .includes('ФИРМА'), true);

    razdel = '109 · Местата · второто записване ПОПРАВЯ';
    const prediPopravka = await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) => e.length);
    await napishiVPoleto(p, '#d-m-ime', 'малинова');
    await napishiVPoleto(p, '#d-m-firma', 'Друга Фирма ООД');
    await sSabitie(p, () => p.click('#d-forma-myasto button[type=submit]'));
    proveri('редовете НЕ стават повече · сведеното име е ЕДНО',
      await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) => e.length), prediPopravka);
    proveri('и фирмата е новата',
      (await p.$eval('[data-myasto="малинова"]', (e) => (e as any).innerText))
        .includes('Друга Фирма ООД'), true);
    // ЗАПИСАНОТО ИМЕ БИЕ · последната дума е в сила (правило 1). Различният
    // регистър не ражда второ място — той СМЕНЯ изписването на същото.
    proveri('и изписването е новото · старото го няма',
      await p.$$eval('[data-myasto="Малинова"]', (e) => e.length), 0);

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
