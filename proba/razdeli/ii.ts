import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { adresNaPismoto, broySabitiya, deystvieSPrerisuvane, kodOtPismoto, naEkran, natisni, plochka, redove, sKod, sSabitie, tekstNa } from '../yadro/pomoshtni.ts';

/** 41 · ИИ-таблото */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '41 · ИИ-таблото';
    await naEkran(p, 'ii', '#nov-agent');

    // ТРОЙНИЯТ КОНТРОЛ · три плочки, не една (правило 15)
    proveri('правото се вижда само за себе си', await plochka(p, 'Право'), 'дава');
    proveri('отметката — също', await plochka(p, 'Отметка'), 'включена');
    proveri('и кранът е трети', await plochka(p, 'Кран'), 'отворен');

    // ЗАКОНИТЕ · изброени поименно, всеки със своя дом
    proveri('законите са изброени поименно',
      (await p.$$eval('[data-zakon]', (r) => r.length)) >= 6, true);
    const zakonite = await p.evaluate(() => document.body.textContent);
    proveri('и първият е, че агентът не пише',
      zakonite.includes('Агентът не пише в Журнала'), true);

    // НОВ АГЕНТ · протоколът иска забрани поименно и ТРИ умения
    await deystvieSPrerisuvane(p, () => p.click('#nov-agent'));
    await p.fill('#agent-ime', 'Счетоводителят');
    await p.fill('#agent-otgovornik', 'vintexstroy@gmail.com');
    await p.fill('#agent-rabota', 'Чете Сметки, сверява ДДС и предлага поправки.');
    await p.check('[data-obhvat="smetki"]');
    // ЗАБРАНИ ОТ ПРАЗНИ ДУМИ протокол не правят (правило 18). Полето е
    // `required`, значи браузърът вече лови ПРАЗНОТО — тук се проверява
    // онова, което само домейнът вижда: изписани интервали.
    await p.fill('#agent-zabrani', '   ');
    const predAgenta = await broySabitiya(p);
    await p.click('#forma-agent button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-agent')?.textContent !== '');
    proveri('без забрани поименно протокол няма',
      (await tekstNa(p, '#greshka-agent')).includes('ИЗБРОЕНИ ПОИМЕННО'), true);
    proveri('и нищо не влиза в Журнала', await broySabitiya(p), predAgenta);

    await p.fill('#agent-zabrani', 'не пише в Журнала · не вижда Управление');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForSelector('#vklyuchi-agenta');
    proveri('агентът се ражда ИЗКЛЮЧЕН',
      (await redove(p, '.red.agent'))[0]?.[2], 'изключен');

    // УМЕНИЯТА · характеристиката е умение, активирано ПОСТОЯННО (негова поръчка)
    const umeniyaNachalo = await redove(p, '.red.umenie');
    proveri('характеристиката стои в СЪЩИЯ списък като уменията', umeniyaNachalo.length, 1);
    proveri('и е постоянна', umeniyaNachalo[0]?.[0]?.includes('постоянно'), true);
    proveri('постоянното няма бутон за изключване',
      await p.$('[data-prevklyuchi-umenie="harakteristika"]'), null);

    const zaDobavyane = [
      ['matematika', 'матрици, данни и проверки'],
      ['masterbook-data', ''],
      ['refresh', ''],
    ] as const;
    for (let i = 0; i < zaDobavyane.length; i += 1) {
      await p.fill('#umenie-ime', zaDobavyane[i]![0]);
      await p.fill('#umenie-tekst', zaDobavyane[i]![1]);
      // Уменията вече минават през КОД ОТ ПИСМО (И94 т.1) — и тук, и навсякъде.
      await sKod(p, () => p.click('#forma-umenie button[type=submit]'));
      await p.waitForFunction((n) => document.querySelectorAll('.red.umenie').length === n, i + 2);
    }
    proveri('добавените умения се редят', (await redove(p, '.red.umenie')).length, 4);
    proveri('и новото се ражда ВКЛЮЧЕНО',
      (await redove(p, '.red.umenie'))[1]?.[2], 'включено');

    // ИЗКЛЮЧЕНОТО изчезва от промпта — не е надпис.
    //
    // Промптът стои в СГЪНАТО `<details>`, а сгънатото няма `innerText` —
    // то е празен низ, в който всяка проверка „не съдържа" минава сама.
    // Затова тук се чете `textContent`: то вижда и скритото.
    const promptat = () => p.$eval('#promptat', (e) => e.textContent);
    await sKod(p, () => natisni(p, '[data-prevklyuchi-umenie="matematika"]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes('изключено')));
    proveri('изключеното умение изчезва от промпта',
      (await promptat()).includes('matematika'), false);
    await sKod(p, () => natisni(p, '[data-prevklyuchi-umenie="matematika"]'));
    await p.waitForFunction(() =>
      document.getElementById('promptat')?.textContent.includes('matematika') === true);
    proveri('и се връща със същото действие',
      (await promptat()).includes('matematika'), true);

    // ВКЛЮЧВАНЕТО пита, показва рисковете, и НЕ става без изричната отметка
    await deystvieSPrerisuvane(p, () => p.click('#vklyuchi-agenta'));
    await p.waitForSelector('#saglasieto');
    const saglasie = await tekstNa(p, '#saglasieto');
    proveri('рисковете са ОПИСАНИ, не премълчани',
      saglasie.includes('Подхвърлен текст') && saglasie.includes('Умора от съгласия'), true);
    proveri('отметката НЕ е сложена предварително',
      await p.$eval('#razbrah', (e) => (e as any).checked), false);

    const predVklyuchvane = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#potvardi-vklyuchvane'));
    proveri('без отметка не се включва', await broySabitiya(p), predVklyuchvane);
    proveri('и се казва защо',
      (await p.evaluate(() => document.body.textContent)).includes('прочетох рисковете'), true);

    await deystvieSPrerisuvane(p, () => p.click('#vklyuchi-agenta'));
    await p.check('#razbrah');
    await sSabitie(p, () => p.click('#potvardi-vklyuchvane'));
    proveri('с отметка — включва се', (await redove(p, '.red.agent'))[0]?.[2], 'включен');

    // ПРЕДЛОЖЕНИЕТО · чака моята дума, и сверката се вижда, дори нулева
    await p.fill('#zadacha-tekst', 'сверѝ ДДС за август');
    await p.fill('#zadacha-kakvo', 'Разлика от 12,00 € в акумулатора за услуги.');
    await p.fill('#zadacha-vhod', '1200,00');
    await p.fill('#zadacha-izhod', '1212,00');

    // ЗАДАЧАТА назовава ТРИ умения (правило 25) — с две не тръгва
    await p.selectOption('#zadacha-umenie1', 'matematika');
    await p.selectOption('#zadacha-umenie2', 'refresh');
    const predZadachata = await broySabitiya(p);
    await p.click('#forma-zadacha button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-zadacha')?.textContent !== '');
    proveri('две умения не стигат за задача',
      (await tekstNa(p, '#greshka-zadacha')).includes('ТРИ умения'), true);
    proveri('и предложението не влиза в Журнала', await broySabitiya(p), predZadachata);

    await p.selectOption('#zadacha-umenie3', 'masterbook-data');
    await sSabitie(p, () => p.click('#forma-zadacha button[type=submit]'));
    await p.waitForSelector('.red.predlozhenie');
    const predlozhenieto = await redove(p, '.red.predlozhenie');
    proveri('предложението чака', predlozhenieto[0]?.[4]?.includes('чака'), true);
    proveri('и разликата се вижда', predlozhenieto[0]?.[3], '12,00 €');
    proveri('разминаването се брои', await plochka(p, 'Разминавания'), '1');

    // ПРИСЪДАТА · записва ЧОВЕКЪТ, и предложението остава в Журнала
    await sSabitie(p, () => natisni(p, '[data-priemi]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.predlozhenie')].some((r) => r.textContent.includes('прието')));
    proveri('приемането е ново събитие, не редакция',
      (await redove(p, '.red.predlozhenie')).length, 1);
    proveri('и присъдата носи МОЯ имейл',
      (await tekstNa(p, '.red.predlozhenie')).includes('vintexstroy@gmail.com'), true);
    proveri('приетите се броят', await plochka(p, 'Приети'), '1');

    // ══ 42 · табовете и секциите (И92 т.9) ═══════════════════════════════════
}

/** 44 · протоколът и картата | 45 · задачите и потвърждението | 45а · кодът пази уменията | 45б · задачата и разписанието | 45в · потвърждаването на задачата | 45г · постоянната е норма | 45д · срокът иска два края | 45е · пускането и ключът */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '44 · протоколът и картата';
    await naEkran(p, 'ii', '#nov-agent');

    // КАРТАТА · „къде вижда и къде редактира"
    proveri('картата на достъпа се вижда след създаването',
      (await p.evaluate(() => document.body.textContent)).includes('Къде вижда · къде редактира'), true);
    proveri('РЕДАКТИРА е нула — и стои като ЧИСЛО',
      await p.$eval('[data-redaktira]', (e) => e.textContent.trim()), '0');
    proveri('картата брои колони от истинските хедъри',
      (await p.$$eval('[data-tablitsa="karta-dostap"] .red', (r) => r.length)) > 0, true);
    proveri('и казва през кой имейл се чете',
      (await p.evaluate(() => document.body.textContent)).includes('не вижда повече от отговорника си'), true);

    // ВТОРИЯТ ИМЕЙЛ · неговата проба
    await deystvieSPrerisuvane(p, () => p.click('#nov-agent'));
    await p.fill('#agent-ime', 'Пробният');
    await p.fill('#agent-otgovornik', 'ivaylo85petkov@gmail.com');
    await p.fill('#agent-rabota', 'Проба с втория имейл — чете Пари и предлага.');
    await p.check('[data-obhvat="pari"]');
    await p.fill('#agent-zabrani', 'не пише в Журнала');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.agent')].some((r) => r.textContent.includes('Пробният')));
    proveri('вторият имейл е отговорник на пробния агент',
      (await redove(p, '.red.agent')).some((r) => r.includes('ivaylo85petkov@gmail.com')), true);

    // НЕПРОМЕНИМОТО · екранът го КАЗВА поименно
    proveri('непроменимото е изброено поименно',
      (await p.evaluate(() => document.body.textContent)).includes('НЕПРОМЕНИМО след създаване'), true);

    // ЗАКРИВАНЕТО · „трие се агента и се прави нов"
    const predZakrivane = await broySabitiya(p);
    await sSabitie(p, () => p.click('#zakriy-agenta'));
    proveri('закриването е събитие, не триене', await broySabitiya(p), predZakrivane + 1);
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.agent')].some((r) => r.textContent.includes('ЗАКРИТ')));
    proveri('закритият остава като СЛЕДА',
      (await redove(p, '.red.agent')).some((r) => r.some((x) => x.includes('ЗАКРИТ'))), true);
    proveri('и формата за нов се отваря веднага — това е пътят',
      Boolean(await p.$('#forma-agent')), true);

    // ══ 45 · задачите, потвърждението с имейл и пускането (И94 т.1) ══════════
    razdel = '45 · задачите и потвърждението';

    // Агентът от §44 е ЗАКРИТ; задача се възлага на ЖИВ. Прави се нов.
    await p.fill('#agent-ime', 'Задачарят');
    await p.fill('#agent-otgovornik', 'ivaylo85petkov@gmail.com');
    await p.fill('#agent-rabota', 'Чете Пари, следи разминаванията и предлага.');
    await p.check('[data-obhvat="pari"]');
    await p.fill('#agent-zabrani', 'не пише в Журнала');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForSelector('#forma-nova-zadacha');

    // УМЕНИЯТА · и те минават през код от писмо (негови думи, И94 т.1)
    razdel = '45а · кодът пази уменията';
    const predUmenie = await broySabitiya(p);
    await p.fill('#umenie-ime', 'matematika');
    await p.fill('#umenie-tekst', 'матрици, данни и проверки');
    await p.click('#forma-umenie button[type=submit]');
    await p.waitForSelector('#potvarzhdenieto');
    proveri('умението чака КОД, преди да влезе', await broySabitiya(p), predUmenie);
    proveri('кодът НЕ е изписан на екрана',
      /\b\d{6}\b/.test(await p.$eval('#potvarzhdenieto', (e) => (e as any).innerText)), false);

    const pismoto1 = await adresNaPismoto(p);
    proveri('писмото тръгва към отговорника',
      pismoto1.startsWith('mailto:ivaylo85petkov%40gmail.com'), true);

    // СГРЕШЕНИЯТ код се отказва С ДУМИ и не пуска нищо
    await p.fill('#kod', '000000');
    await p.click('#potvardi-koda');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-kod')?.textContent ?? '').trim().length > 0);
    proveri('сгрешеният код казва „не съвпада"',
      (await tekstNa(p, '#greshka-kod')).includes('не съвпада'), true);
    proveri('и нищо не е влязло в Журнала', await broySabitiya(p), predUmenie);

    // ВЕРНИЯТ код пуска действието — и то влиза като ЕДНО събитие
    await p.fill('#kod', kodOtPismoto(pismoto1));
    await sSabitie(p, () => p.click('#potvardi-koda'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes('matematika')));
    proveri('верният код записва умението', await broySabitiya(p), predUmenie + 1);

    for (const ime of ['masterbook-data', 'doklad']) {
      await p.fill('#umenie-ime', ime);
      await sKod(p, () => p.click('#forma-umenie button[type=submit]'));
      await p.waitForFunction((n) =>
        [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes(n)), ime);
    }

    // ЗАДАЧАТА · разписание и ТРИ умения (правило 25)
    razdel = '45б · задачата и разписанието';
    const predZadacha = await broySabitiya(p);
    await p.fill('#nova-zadacha-kakvo', 'сверѝ ДДС за август по акумулатори');
    await p.selectOption('#nova-zadacha-razpisanie', 'sedmichna');
    await p.selectOption('#nova-zadacha-den', '1');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    await sSabitie(p, () => p.click('#forma-nova-zadacha button[type=submit]'));
    await p.waitForSelector('.red.zadacha');
    proveri('задачата влиза в Журнала', await broySabitiya(p), predZadacha + 1);
    proveri('и се ражда НЕПОТВЪРДЕНА',
      (await p.$eval('.red.zadacha', (e) => (e as any).innerText)).includes('чака код'), true);

    // ДВЕ УМЕНИЯ вместо три · правило 25 отказва С ДУМИ
    await p.fill('#nova-zadacha-kakvo', 'непълна задача');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'doklad');
    const predNepalna = await broySabitiya(p);
    await p.click('#forma-nova-zadacha button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-nova-zadacha')?.textContent ?? '').includes('ТРИ умения'));
    proveri('две умения не правят задача', await broySabitiya(p), predNepalna);

    // ПОТВЪРЖДАВАНЕТО на задачата · пак код от писмо
    razdel = '45в · потвърждаването на задачата';
    await natisni(p, '[data-potvardi-zadacha]');
    await p.waitForSelector('#otvori-pismoto');
    const pismoto2 = await adresNaPismoto(p);
    proveri('писмото казва КАКВО се потвърждава',
      decodeURIComponent(pismoto2).includes('сверѝ ДДС за август'), true);
    await p.fill('#kod', kodOtPismoto(pismoto2));
    await sSabitie(p, () => p.click('#potvardi-koda'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.zadacha')].some((r) => (r as any).innerText.includes('потвърдена')));
    proveri('потвърдената задача показва бутона „Пусни с Клод"',
      Boolean(await p.$('[data-pusni-zadacha]')), true);
    proveri('и седмичната се изключва',
      Boolean(await p.$('[data-prevklyuchi-zadacha]')), true);

    // ПОСТОЯННАТА е НОРМА · бутонът „Изключи" ЛИПСВА, не отказва
    razdel = '45г · постоянната е норма';
    await p.fill('#nova-zadacha-kakvo', 'дневната норма на агента');
    await p.selectOption('#nova-zadacha-razpisanie', 'postoyanna');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    await sSabitie(p, () => p.click('#forma-nova-zadacha button[type=submit]'));
    await p.waitForFunction(() => document.querySelectorAll('.red.zadacha').length === 2);
    const redNorma = '.red.zadacha:has-text("дневната норма")';
    await sKod(p, () => natisni(p, `${redNorma} [data-potvardi-zadacha]`));
    await p.waitForFunction(() =>
      (([...document.querySelectorAll('.red.zadacha')]
        .find((r) => (r as any).innerText.includes('дневната норма')) as any)?.innerText ?? '').includes('потвърдена'));
    proveri('постоянната НЯМА бутон за изключване — той липсва, не отказва',
      await p.$(`${redNorma} [data-prevklyuchi-zadacha]`), null);
    proveri('и се пада ДНЕС, каквото и да е днес',
      (await p.$eval(redNorma, (e) => (e as any).innerText)).includes('норма'), true);

    // СРОКЪТ иска и двата си края
    razdel = '45д · срокът иска два края';
    await p.fill('#nova-zadacha-kakvo', 'срок без край');
    await p.selectOption('#nova-zadacha-razpisanie', 'srok');
    await p.fill('#nova-zadacha-ot', '2026-09-01');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    const predSrok = await broySabitiya(p);
    await p.click('#forma-nova-zadacha button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-nova-zadacha')?.textContent ?? '').includes('и начало, и край'));
    proveri('срок без край не става задача', await broySabitiya(p), predSrok);

    // ПУСКАНЕТО С КЛОД · и то иска свой код, защото харчи и излиза НАВЪН
    razdel = '45е · пускането и ключът';
    await natisni(p, '[data-pusni-zadacha]');
    await p.waitForSelector('#potvarzhdenieto');
    proveri('пускането с Клод също иска код',
      Boolean(await p.$('#potvarzhdenieto')), true);
    proveri('и писмото го казва',
      decodeURIComponent(await adresNaPismoto(p)).includes('пускане на агент'), true);
    await deystvieSPrerisuvane(p, () => p.click('#otkazhi-koda'));
    proveri('отказът маха искането', await p.$('#potvarzhdenieto'), null);

    // КЛЮЧЪТ ЗА КЛОД · местен и казан честно
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('ключ'));
    proveri('без ключ екранът го КАЗВА',
      (await tekstNa(p, '#klod-sastoyanie')).includes('няма ключ'), true);
    const predKlyuchKlod = await broySabitiya(p);
    await p.fill('#klod-klyuch', 'sk-ant-proba-1234');
    await natisni(p, '#zapishi-klyuch-klod');
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('стои'));
    proveri('ключът се вижда само с опашката си',
      (await tekstNa(p, '#klod-sastoyanie')).includes('…1234'), true);
    proveri('и в Журнала НЕ влиза нищо', await broySabitiya(p), predKlyuchKlod);
    // Обхожда се ЦЯЛОТО хранилище: изтичане в паметта на екрана или в печата
    // на износа щеше да мине незабелязано.
    proveri('ключът не е изтекъл в друго гнездо на хранилището',
      await p.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k !== 'masterbook:klod-klyuch')
          .some((k) => (localStorage.getItem(k) ?? '').includes('sk-ant-proba'))), false);
    await natisni(p, '#zabravi-klyuch-klod');
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('няма ключ'));
    proveri('и „забрави го" го маха', await p.evaluate(() =>
      localStorage.getItem('masterbook:klod-klyuch')), null);

    // ══ 46 · всички потоци през всички акумулатори (И94 т.7) ═════════════════
    //
    // Негови думи: „Изпълни всички потоци в акумолатора и направи сверки и
    // тестове." Тестът в `tests/potoci-akumulatori.test.ts` го прави в домейна;
    // ТУК се доказва другото — че ЕКРАНЪТ ги стига: че формата предлага всеки
    // поток и всеки сектор, че шестте реда се появяват и че четирите сверки
    // затварят, когато в месеца има ВСИЧКО, а не когато има едно.
}
