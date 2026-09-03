import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { dobaviImotBezObekt, broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, zapishiDelo } from '../yadro/pomoshtni.ts';

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
    // ЦЕЛИ СЕ ПОИМЕННО, не с „първия .prazno на екрана": червеният списък
    // (резен 39) също казва „нищо не чака" и стои НАД таблицата, тъй че гол
    // клас щеше да чете чуждото празно. Същата спънка като `data-myasto` в
    // резен 34 — селекторът лъже мълчаливо, а не пада.
    proveri('празният екран го КАЗВА',
      // ЧЕТИРИТЕ имена, написани с РЪКА (група А): те идват от `koloniNaDelata`,
      // и точно затова очакването тук НЕ бива да се смята от него — инак се
      // мести заедно с кода. Отговорникът е новият: редът винаги го е показвал,
      // а старата глава го премълчаваше (резен 48).
      (await p.$eval('[data-prazno=dela]', (e) => e.textContent))
        .includes('Имот · Дело · Обект · Отговорник'), true);
    proveri('и се представя, вместо да мълчи',
      (await p.$eval('[data-prazno=dela]', (e) => (e.closest('section') as any).textContent)).includes('Времевия Ред'), true);

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

    // ══ 109 · ИМОТИТЕ · отговорник-ФИРМА и папка (резен 31 · ADR-091) ═════
    //
    // Едно негово изречение, два реда от описа: „На нивото на проекта дай линк
    // към папката с проекта" и „в таблицата за отговорник напиши фирмата която
    // управлява проекта" *(р48·[42])*. И границата: отговорникът на ДЕЛОТО е
    // ЧОВЕК *(р48·[44])*.
    //
    // ОТ РЕЗЕН 99 ФОРМАТА Е НА ИМОТИ · „Имоти и обекти се вкарват едновременно"
    // (И132). Тук остава ТАБЛИЦАТА; вписва се оттам, а тези проверки минават
    // през нея.
    razdel = '109 · Имотите · делата САМИ не вписват (И124 т.7)';
    proveri('формата за имот тук вече я НЯМА · един дом (правило 17)',
      Boolean(await p.$('#d-forma-myasto')), false);
    // „Тук се появяват само заредените обекти" (И124 т.7 · ADR-134): име, което
    // само се среща по ДЕЛА, не ражда ред. „Хисаря" е точно такова — дело има,
    // имот няма.
    proveri('имот само от дела НЕ се реди',
      await p.$$eval('[data-tablitsa=mestata] [data-myasto="Хисаря"]', (e) => e.length), 0);
    // А ВПИСАНИТЕ стоят · те влязоха заедно с обектите си от екрана Имоти.
    // А КОИТО СТОЯТ, стоят заради ОБЕКТ или заради ЗАПИС — нито един заради
    // дело. Имената се ПЕЧАТАТ: тук книгата е върнатият архив (§14) и съставът
    // ѝ се мени с всеки внос, значи закован списък би паднал по друга причина,
    // а инвариантът е един — „делата не вписват".
    const imenataNaImotite = await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) =>
      e.map((x) => x.getAttribute('data-myasto') ?? ''));
    console.log(`
  ИМОТИТЕ В УПРАВЛЕНИЕ: ${imenataNaImotite.join(' · ') || 'нито един'}
`);
    proveri('и всеки ред носи белега си · вписан или изведен от обект',
      await p.$$eval('[data-tablitsa=mestata] [data-myasto][data-vpisan]', (e) => e.length),
      imenataNaImotite.length);
    proveri('и екранът казва КЪДЕ се вписва новият',
      (await p.$eval('[data-sektsiya=gant-mesta]', (e) => (e as any).innerText)).includes('Имоти'), true);
    proveri('сверката се КАЗВА, дори когато е нула',
      (await p.$eval('[data-mesta-sverka]', (e) => (e as any).innerText)).includes('разлика 0'), true);

    razdel = '109 · Имотите · фирмата и записалият';
    await naEkran(p, 'imoti', '#forma-imot');
    // ИМОТ БЕЗ ОБЕКТ · „има Имот без Обект" (И131 т.2). „Малинова" вече го има
    // (влезе с обекта си в §2), значи това е ЕДИН запис — само неговите полета.
    await dobaviImotBezObekt(p, 'Малинова', { firma: 'Винтекс Строй ЕООД' });
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('фирмата стои на реда на имота',
      (await p.$eval('[data-myasto="Малинова"]', (e) => (e as any).innerText))
        .includes('Винтекс Строй ЕООД'), true);
    proveri('„отговорник е този който извършва действието" · записалият е на реда',
      (await p.$eval('[data-myasto="Малинова"]', (e) => (e as any).innerText))
        .includes('vintexstroy@gmail.com'), true);
    proveri('броят на делата на имота се КАЗВА',
      (await p.$eval('[data-myasto="Малинова"]', (e) => (e as any).innerText)).includes('2'), true);

    razdel = '109 · Имотите · двата отговорника не се смесват';
    proveri('делото си пази ЧОВЕКА',
      (await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).innerText).join(' ')))
        .includes('Николай Петков'), true);

    razdel = '109б · Обектът и десният бутон (И124 т.3 · т.7 · ADR-134)';
    // Имотът е без папка → менюто го КАЗВА, вместо редът да мълчи.
    await p.click('[data-myasto="Малинова"] [data-mnogotochie]');
    await p.waitForSelector('.kontekstno-menyu');
    proveri('„⋯" вдига менюто на реда · втората дръжка за iOS',
      (await p.$eval('.kontekstno-menyu', (e) => (e as any).innerText))
        .includes('Папката в Драйва'), true);
    proveri('и без линк отказът се КАЗВА, не се крие',
      (await p.$eval('.kontekstno-menyu', (e) => (e as any).innerText))
        .includes('още няма линк'), true);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => document.querySelector('.kontekstno-menyu') === null);

    // С папка → менюто носи ПЪТЯ (бутон, не линк в колоната). Пише се от Имоти.
    await naEkran(p, 'imoti', '#forma-imot');
    await dobaviImotBezObekt(p, 'Малинова', {
      papka: ['https:', '//', 'primer.example', '/malinova'].join(''),
    });
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('линк в колоните НЯМА · пътят е само през менюто',
      await p.$$eval('[data-tablitsa=mestata] a', (e) => e.length), 0);
    await p.click('[data-myasto="Малинова"] [data-mnogotochie]');
    await p.waitForSelector('.kontekstno-menyu');
    proveri('менюто носи „Папката в Драйва" като ДЕЙСТВИЕ',
      await p.$$eval('.kontekstno-menyu button', (e) =>
        e.filter((x) => (x.textContent ?? '').trim() === 'Папката в Драйва').length), 1);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => document.querySelector('.kontekstno-menyu') === null);

    // ══ 100 · ЧЕТИРИТЕ ДРЪЖКИ ОТ МЕНЮТО НА ИМОТА (И124 т.8 · ADR-164) ═══════
    //
    // „Има място където се създават Имоти и отделно Дело или Среща или друго
    // вкарано по избор от стопанина." Мястото е менюто на реда: дръжки към
    // СЪЩИТЕ форми с предизбран Имот. Тук се играе от Управление (редът носи
    // `data-myasto`), после от Имоти (`data-imot`) и от реда на Обекта.
    razdel = '100 · дръжките на Имота · Управление';
    const predDrazhkata = await broySabitiya(p);
    await p.click('[data-tablitsa=mestata] [data-myasto="Малинова"] [data-mnogotochie]');
    await p.waitForSelector('.kontekstno-menyu');
    const punktoveUpravlenie = await p.$$eval('.kontekstno-menyu button', (e) =>
      e.map((x) => (x.textContent ?? '').trim()));
    proveri('менюто на Имота носи трите дръжки ПРЕДИ папката, поименно и в ред',
      punktoveUpravlenie.slice(0, 3).join(' · '), 'Нов обект · Ново дело · Нова среща');
    proveri('и папката, и копирането остават · пет бутона с линк',
      punktoveUpravlenie.join(' · '), 'Нов обект · Ново дело · Нова среща · Папката в Драйва · Копирай реда');
    // „Ново дело" · отваря СЪЩАТА форма в Управление с Имота вече вписан.
    await p.click('.kontekstno-menyu button:has-text("Ново дело")');
    await p.waitForSelector('.kontekstno-menyu', { state: 'detached' });
    await p.waitForSelector('#d-forma-delo');
    proveri('„Ново дело" предизбира Имота във формата на Управление',
      await p.$eval('#d-myasto', (e) => (e as HTMLInputElement).value), 'Малинова');
    proveri('и полето Имот на делото ПРЕДЛАГА вписаните Имоти · „избор от наличното" (И124 т.8)',
      await p.$$eval('#d-myasto-spisak option', (e) =>
        e.some((x) => (x as HTMLOptionElement).value === 'Малинова')), true);
    proveri('предизборът е движение на ръката · нула събития', await broySabitiya(p), predDrazhkata);

    razdel = '100 · дръжките на Имота · Имоти и Контакти';
    await naEkran(p, 'imoti', '#forma-imot');
    await p.click('[data-tablitsa=imotite] [data-imot="Малинова"] [data-mnogotochie]');
    await p.waitForSelector('.kontekstno-menyu');
    proveri('същото меню и от Имоти · един код, два екрана',
      (await p.$$eval('.kontekstno-menyu button', (e) => e.map((x) => (x.textContent ?? '').trim())))
        .slice(0, 3).join(' · '), 'Нов обект · Ново дело · Нова среща');
    // „Нова среща" · Контакти, формата на ангажимента с Имота избран.
    await p.click('.kontekstno-menyu button:has-text("Нова среща")');
    await p.waitForSelector('.kontekstno-menyu', { state: 'detached' });
    await p.waitForSelector('#forma-sreshta');
    proveri('„Нова среща" предизбира Имота в Контакти',
      await p.$eval('#sr-imot', (e) => (e as HTMLSelectElement).value), 'Малинова');
    proveri('и формата предлага всичките видове ангажимент · „Среща ИЛИ друго"',
      await p.$$eval('#spisak-vidove-angazhiment option', (e) => e.length) >= 4, true);
    // „Нов обект" · Имоти, формата с Имота избран и полето за ново име скрито.
    await naEkran(p, 'imoti', '#forma-imot');
    await p.click('[data-tablitsa=imotite] [data-imot="Малинова"] [data-mnogotochie]');
    await p.waitForSelector('.kontekstno-menyu');
    await p.click('.kontekstno-menyu button:has-text("Нов обект")');
    await p.waitForSelector('.kontekstno-menyu', { state: 'detached' });
    await p.waitForFunction(() => (document.querySelector('#imot-imot') as HTMLSelectElement | null)?.value === 'малинова');
    proveri('„Нов обект" предизбира Имота във формата на Имоти',
      await p.$eval('#imot-imot option:checked', (e) => (e as HTMLOptionElement).dataset['ime']), 'Малинова');
    proveri('и полето за ново име е скрито · Имотът вече е избран',
      await p.$eval('[data-pole-ime]', (e) => (e as HTMLElement).hidden), true);

    razdel = '100 · дръжките на Обекта · само „Ново дело"';
    // „Делата са за Имот и за Обект" (И131 т.2) · Обект под Обект той няма.
    // РЕДЪТ СЕ ЧЕТЕ, не се гадае: по-ранни раздели поправят и сторнират
    // обекти, и закован адрес би мерил чуждо състояние. Взима се първият жив
    // Обект на екрана, с адреса и единицата от собствените му белези.
    const obektat = await p.$eval('.red.imot', (e) => ({
      adres: (e as HTMLElement).dataset['obektAdres'] ?? '',
      edinitsa: (e as HTMLElement).dataset['obektEdinitsa'] ?? '',
    }));
    proveri('редът на Обекта носи адреса и единицата си', obektat.adres !== '' && obektat.edinitsa !== '', true);
    await p.click('.red.imot .kletka', { button: 'right' });
    await p.waitForSelector('.kontekstno-menyu');
    const punktoveObekt = await p.$$eval('.kontekstno-menyu button', (e) =>
      e.map((x) => (x.textContent ?? '').trim()));
    proveri('редът на Обекта носи „Ново дело" и НЕ носи „Нов обект" и „Нова среща"',
      `${punktoveObekt.includes('Ново дело')} · ${punktoveObekt.includes('Нов обект')} · ${punktoveObekt.includes('Нова среща')}`,
      'true · false · false');
    await p.click('.kontekstno-menyu button:has-text("Ново дело")');
    await p.waitForSelector('.kontekstno-menyu', { state: 'detached' });
    await p.waitForSelector('#d-forma-delo');
    proveri('от Обекта делото носи и Имота, и Обекта',
      `${await p.$eval('#d-myasto', (e) => (e as HTMLInputElement).value)} · ${await p.$eval('#d-obekt', (e) => (e as HTMLInputElement).value)}`,
      `${obektat.adres} · ${obektat.edinitsa}`);

    razdel = '109 · Имотите · второто записване ПОПРАВЯ';
    const prediPopravka = await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) => e.length);
    await naEkran(p, 'imoti', '#forma-imot');
    // ДРУГИЯТ РЕГИСТЪР е СЪЩИЯТ имот: сведеното име е едно. Пише се като „нов",
    // а Вратата го намира по свеждането и го ПОПРАВЯ.
    await dobaviImotBezObekt(p, 'малинова', { firma: 'Друга Фирма ООД' });
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('редовете НЕ стават повече · сведеното име е ЕДНО',
      await p.$$eval('[data-tablitsa=mestata] [data-myasto]', (e) => e.length), prediPopravka);
    proveri('и фирмата е новата',
      (await p.$eval('[data-myasto="малинова"]', (e) => (e as any).innerText))
        .includes('Друга Фирма ООД'), true);
    // ЗАПИСАНОТО ИМЕ БИЕ · последната дума е в сила (правило 1). Различният
    // регистър не ражда втори имот — той СМЕНЯ изписването на същия.
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

    // ══ 108в · ЗАВЪРШЕНОТО напуска дневния ред (И124 т.6 · ADR-122) ═══════
    //
    // „Завършено се определя от Състояние и когато то е Завършено директно
    // оценката става изключена просто без оценка, не е в дневния ред и влиза
    // в друга таблица която се ползва за архивиране."
    razdel = '108в · Завършеното · оценката се изключва и КАЗВА защо';
    proveri('оценката вече е ЧЕТИРИ квадранта · „завършено" не е сред тях',
      await p.$$eval('#d-otsenka option', (o) => o.map((x) => (x as any).value)),
      ['спешно-важно', 'спешно-неважно', 'важно-неспешно', 'нито-едно']);
    await p.selectOption('#d-sastoyanie', 'завършено');
    // Чака се СЪСТОЯНИЕТО, не се чете веднага след действието (обход Е).
    await p.waitForSelector('#d-otsenka:disabled');
    proveri('изборът „завършено" ИЗКЛЮЧВА оценката',
      await p.$eval('#d-otsenka', (e) => (e as HTMLSelectElement).disabled), true);
    proveri('и изключеното се КАЗВА, не се преглъща (правило 15)',
      (await p.$eval('#d-otsenka', (e) => (e as HTMLSelectElement).title))
        .includes('без оценка'), true);
    await p.selectOption('#d-sastoyanie', 'чака');
    await p.waitForSelector('#d-otsenka:not(:disabled)');
    proveri('връщането отключва оценката',
      await p.$eval('#d-otsenka', (e) => (e as HTMLSelectElement).disabled), false);

    razdel = '108в · Завършеното · извън дневния ред, В архива';
    const prediZavarshvane = await p.$$eval('.gant-delo', (e) => e.length);
    proveri('блокът на завършените стои и при НУЛА в периода',
      Boolean(await p.$('[data-sektsiya=gant-zavarsheni]')), true);
    await zapishiDelo(p, { myasto: 'Хисаря', obekt: '', ime: 'Приключен оглед',
      otgovornik: 'Ивайло Петков', ot: denOtDnes(0), do: denOtDnes(0),
      otsenka: 'спешно-важно', sastoyanie: 'завършено' });
    proveri('дневният ред НЕ порасна · завършеното не е в него',
      await p.$$eval('.gant-delo', (e) => e.length), prediZavarshvane);
    proveri('но делото СТОИ в архива на периода',
      await p.$$eval('[data-tablitsa=zavarsheni-dela] [data-zavarsheno]', (e) => e.length), 1);
    proveri('и блокът брои · в периода',
      await p.$eval('[data-sektsiya=gant-zavarsheni]', (e) => (e as any).dataset.broy), '1');
    proveri('и казва „без оценка, извън дневния ред"',
      (await p.$eval('[data-sektsiya=gant-zavarsheni]', (e) => (e as any).innerText))
        .includes('без оценка'), true);

        razdel = '108в · Завършеното · скриването е ЛИЧНО, нула събития';
    const prediSkrivaneZ = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#d-zavarsheni-prevkl'));
    proveri('скриването маха таблицата',
      await p.$$eval('[data-tablitsa=zavarsheni-dela]', (e) => e.length), 0);
    proveri('но НЕ пише в Журнала', await broySabitiya(p), prediSkrivaneZ);
    await deystvieSPrerisuvane(p, () => p.click('#d-zavarsheni-prevkl'));
    proveri('връщането го показва пак',
      await p.$$eval('[data-tablitsa=zavarsheni-dela] [data-zavarsheno]', (e) => e.length), 1);

    // ══ 112 · РЪЧНИЯТ РЕД ПОБЕЖДАВА (резен 34 · ADR-094) ══════════════════
    //
    // „★ Ръчният ред побеждава (колона „поредност"; Състоянието е бутон
    // „подреди")" *(ред 1496)*; „да може от редактора да местиш РЕДОВЕТЕ, като
    // задържаш на полето и го движиш… както е в MS Project" *(ред 1982)*.

    razdel = '112 · Ръчният ред · преди да е местено, го НЯМА';
    // Отпадналите пак са скрити от §108 — връщаме ги, за да е екранът същият.
    proveri('колоната „поредност" я няма · празна колона от тирета е шум',
      await p.$$eval('.porednost', (e) => e.length), 0);
    proveri('и бутонът „Подреди" го няма · бутон, който не мени нищо, е надпис',
      await p.$$eval('#podredi-avtomatichno', (e) => e.length), 0);
    proveri('но дръжка има на ВСЕКИ ред · пътят се вижда, не се налучква',
      await p.$$eval('.drazhka-red', (e) => e.length),
      await p.$$eval('.gant-delo', (e) => e.length));

    razdel = '112 · Ръчният ред · стрелката мести реда и ПОБЕЖДАВА';
    const redPredi = await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime));
    // Двете дела на „Малинова" са първите два реда: „Акт 15" е спешно-важно и
    // затова сметнатата подредба го вдига пред „Кофраж".
    const prediPodrezhdane = await broySabitiya(p);
    await deystvieSPrerisuvane(p, async () => {
      await p.focus('.gant-delo[data-grupa="Малинова"] .drazhka-red');
      await p.keyboard.press('ArrowDown');
    });
    const redSled = await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime));
    proveri('първите два реда си РАЗМЕНИХА местата',
      [redSled[0], redSled[1]], [redPredi[1], redPredi[0]]);
    proveri('и това е ЕДНО събитие · целият ред, не движението',
      await broySabitiya(p), prediPodrezhdane + 1);

    razdel = '112 · Ръчният ред · колоната „поредност" се ЯВЯВА';
    proveri('номерът стои до всеки ръчно подреден ред',
      await p.$eval('.gant-delo .porednost', (e) => (e as any).innerText), '1');
    proveri('и брои от ЕДНО · чете го човек, не масив',
      await p.$$eval('.porednost', (e) => e.map((x) => (x as any).dataset.porednost).slice(0, 2)),
      ['1', '2']);
    proveri('а бутонът „Подреди" вече ИМА какво да отмени',
      await p.$$eval('#podredi-avtomatichno', (e) => e.length), 1);

    razdel = '112 · Ръчният ред · краят на списъка се КАЗВА ПРЕДИ натискането';
    // Границата е СВОЙСТВО на реда, не отказ след действие: първата версия
    // отговаряше с вест, тоест с цяло прерисуване за движение, което не се е
    // случило. Проходът го хвана — прерисуване не тръгваше, и не биваше.
    proveri('горният ред КАЗВА, че нагоре няма накъде',
      await p.$eval('.gant-delo[data-grupa="Малинова"] .drazhka-red',
        (e) => (e as any).dataset.nagore), 'ne');
    proveri('но надолу има',
      await p.$eval('.gant-delo[data-grupa="Малинова"] .drazhka-red',
        (e) => (e as any).dataset.nadolu), 'da');
    const prediKraya = await broySabitiya(p);
    const redPrediKraya = await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime));
    await p.focus('.gant-delo[data-grupa="Малинова"] .drazhka-red');
    await p.keyboard.press('ArrowUp');
    proveri('и натиснато нагоре, НЕ пише нищо в Журнала',
      await broySabitiya(p), prediKraya);
    proveri('нито мени реда · снимката ПРЕДИ и СЛЕД е една и съща',
      await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime)), redPrediKraya);

    razdel = '112 · Ръчният ред · влаченето с мишка мести СЪЩОТО';
    const prediVlachene = await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime));
    // РЕДЪТ СЕ ДОКАРВА В ПОЛЕЗРЕНИЕТО ПРЕДИ ДА СЕ МЕРИ. `getBoundingClientRect`
    // дава координати спрямо ПРОЗОРЕЦА: ред под сгъвката има y извън него, и
    // мишката тръгва към място, където няма нищо. Клавиатурата не го показа,
    // защото `focus` сама скролва — затова счупването изплува само при мишката.
    await p.$eval('.gant-delo[data-grupa="Малинова"]', (e) =>
      (e as HTMLElement).scrollIntoView({ block: 'center' }));
    const dvete = await p.$$eval('.gant-delo[data-grupa="Малинова"]', (e) =>
      e.slice(0, 2).map((x) => {
        const r = x.getBoundingClientRect();
        const d = x.querySelector('.drazhka-red')!.getBoundingClientRect();
        return { drazhkaX: d.x + d.width / 2, drazhkaY: d.y + d.height / 2,
                 tselX: r.x + r.width / 2, tselY: r.y + r.height / 2 };
      }),
    );
    await deystvieSPrerisuvane(p, async () => {
      await p.mouse.move(dvete[0]!.drazhkaX, dvete[0]!.drazhkaY);
      await p.mouse.down();
      await p.mouse.move(dvete[1]!.tselX, dvete[1]!.tselY, { steps: 6 });
      await p.mouse.up();
    });
    const sledVlachene = await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime));
    proveri('редът, който беше първи, вече е втори',
      [sledVlachene[0], sledVlachene[1]], [prediVlachene[1], prediVlachene[0]]);

    razdel = '112 · Ръчният ред · „Подреди" го връща, и отмяната е СЪБИТИЕ';
    const prediOtmyana = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#podredi-avtomatichno'));
    proveri('колоната „поредност" изчезва · няма какво да брои',
      await p.$$eval('.porednost', (e) => e.length), 0);
    proveri('и подредбата се връща на СМЕТНАТАТА',
      await p.$$eval('.gant-delo', (e) => e.map((x) => (x as any).dataset.ime)), redPredi);
    proveri('но отмяната е ЗАПИС · Журналът не се трие (правило 1)',
      await broySabitiya(p), prediOtmyana + 1);
    proveri('и самият бутон си отива · вече няма какво да отменя',
      await p.$$eval('#podredi-avtomatichno', (e) => e.length), 0);

    // ══ 57 · ЗАКОНЪТ ЗА МЕНЮТАТА · живите речници (И97 · ADR-040) ══════════
    //
    // Речникът НЕ се пази отделно — той Е онова, което вече стои в делата.
    // Трите записани дела току-що го напълниха, без нито едно ново събитие.
}
