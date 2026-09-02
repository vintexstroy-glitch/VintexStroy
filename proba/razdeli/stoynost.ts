import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, chisloNaPoleto, deystvieSPrerisuvane, dokatoStane, naEkran, napishiVPoleto, plochka, plochkaPod, redove, smeniKoefitsient, sSabitiya, tekstNa, tekstNaChisloto } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
// `fileURLToPath`, а НЕ `.pathname` · на Windows второто дава „/C:/…" (ADR-152).
import { fileURLToPath } from 'node:url';

/**
 * СМЕНЯ ЕДНО ПОЛЕ НА КАЛКУЛАТОРА И ЧАКА ИЗХОДЪТ ДА МРЪДНЕ · §84 и §89.
 *
 * Двете проверки падаха по РАЗЛИЧЕН начин, но от една причина (група Ж2,
 * `docs/11`): прерисуване, тръгнало преди писането, подменя възела и `change`
 * се вдига върху СТАРОТО число. §84 висеше 30 s; §89 връщаше „по-стара сграда
 * дава по-ВИСОКА стойност", тоест ЛЪЖЕШЕ, вместо да падне.
 *
 * Общото повтаряне живее в `dokatoStane`; тук стои само кое поле кой изход мени.
 */
async function smeniIChakayIzhoda(
  p: Page,
  znak: string,
  stoynost: string,
  izhod: string,
): Promise<void> {
  const predi = await tekstNaChisloto(p, izhod);
  await dokatoStane(
    p,
    async () => {
      await p.fill(znak, stoynost);
      await p.dispatchEvent(znak, 'change');
    },
    async () => (await tekstNaChisloto(p, izhod)) !== predi,
    `${znak} = ${stoynost} · изходът ${izhod}`,
  );
}

/** 22 · Стойност на Състояние */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '22 · Стойност на Състояние';
    // Данните са от НЕГОВИТЕ два файла в Драйва, свити до пет обекта.
    const ploshtiCSV = join(tmpdir(), 'ploshto.csv');
    await writeFile(
      ploshtiCSV,
      [
        'кота;етаж;№;обект;застроена площ, F1;общи части F2;F2;Общо F1+F2;прилежащ (придаден) двор',
        'кота -2,88;подземен;1;Гараж 1;16,00;0,99;2,09;18,09;',
        ';;3;Гараж 3 и склад;19,50;1,21;2,54;22,04;',
        'кота ±0,00;първи;18;Апартамент 1;40,00;2,48;5,22;45,22;22,00',
        ';;19;Апартамент 2;57,00;3,53;7,44;64,44;22,90',
        'кота +2,85;втори;22;Апартамент 5;54,80;3,39;7,15;61,95;',
        ';;;;1614,59;100,00;210,64;1825,23;',
      ].join('\n'),
    );
    const tseniCSV = join(tmpdir(), 'tseni.csv');
    await writeFile(
      tseniCSV,
      [
        'Имоти;Етаж Кота;Стаи;Чиста площ;Общи части;;Обща площ;Изложение;Тераси;Цена с ДДС;Евро / кв.м.',
        'Апартамент 1;етаж 1;2;40;2,48;5,22;45,22;СИ;22;ПРОДАДЕН;',
        'Апартамент 2;;2;57;3,53;7,44;64,44;И;22,9;215400;3342',
        'Апартамент 5;етаж 2;2;54,8;3,39;7,15;61,95;СИ;4,5;ПРОДАДЕН;',
        'Гараж 1;сутерен;;16;0,99;2,09;18,09;;;38700;2139',
        'Гараж 3 и склад;;;19,5;1,21;2,54;22,04;;;ПРОДАДЕН;',
      ].join('\n'),
    );

    await naEkran(p, 'stoynost', '#cheti-ploshti');
    proveri('шестият екран го има', (await tekstNa(p, '.shapka h1')).includes('Стойност на Състояние'), true);
    proveri('А мълчи, докато няма данни', (await plochka(p, 'А · по площ')), '—');
    proveri('Б мълчи също', (await plochka(p, 'Б · по състояние')), '—');
    proveri('и трите пътя са налице', (await p.$$('#cheti-ploshti, #cheti-tseni, #pishi-tseni')).length, 3);
    proveri('изборът коя цена се пуска стои до бутона', (await p.$$('#koya-tsena')).length, 1);

    await deystvieSPrerisuvane(p, () => p.setInputFiles('#fayl-ploshti', ploshtiCSV));
    await p.waitForSelector('.red.stoynost');
    const obekti = await redove(p, '.red.stoynost:not(.sbor)');
    proveri('прочете петте обекта, а контролният ред не влиза', obekti.length, 5);
    proveri('и казва СВЕРКАТА вход↔изход', (await tekstNa(p, '.vest.dobre')).includes('разлика 0'), true);
    proveri('общите части се смятат — чиста 40,00 и обща 45,22', obekti[2]?.[2], '40,00');
    proveri('и общата стои до нея', obekti[2]?.[3], '45,22');
    proveri('видът се познава по името', (obekti[0]?.[1] as any).includes('гараж'), true);

    // ДВЕТЕ КОЛОНИ, ЕДНА ДО ДРУГА · негово: „две ценови колони за сравнение"
    // Хедърът минава през text-transform, затова се сверява без регистър.
    const glavaNaStoynostta = (await tekstNa(p, '.glava.stoynost')).toLowerCase();
    proveri('хедърът носи А', glavaNaStoynostta.includes('по площ'), true);
    proveri('хедърът носи Б', glavaNaStoynostta.includes('по състояние'), true);
    proveri('и разликата между тях', glavaNaStoynostta.includes('разлика'), true);
    proveri('всеки ред носи и двете цени', obekti[3]?.[6] !== '' && obekti[3]?.[7] !== '', true);
    proveri('и казва ОТКЪДЕ е наемът', (obekti[3]?.[5] as any).includes('очакван'), true);

    const bezLista = await plochka(p, 'А · по площ');
    const bezListaB = await plochka(p, 'Б · по състояние');
    proveri('А вече говори', bezLista !== '—', true);
    proveri('Б също', bezListaB !== '—', true);
    proveri('и Б казва с колко стои под А', (await plochkaPod(p, 'Б · по състояние')).includes('%'), true);
    proveri('нищо не е продадено, докато листата мълчи', (await p.$$('.red.stoynost.mahnata')).length, 0);
    proveri('закръглянето се ВИЖДА, не се преглъща', (await plochkaPod(p, 'А · по площ')).includes('закръглено'), true);

    await deystvieSPrerisuvane(p, () => p.setInputFiles('#fayl-tseni', tseniCSV));
    await p.waitForSelector('.red.stoynost.mahnata');
    proveri('ценовата листа каза кое е ПРОДАДЕН', (await p.$$('.red.stoynost.mahnata')).length, 3);
    const sIzlozhenie = await redove(p, '.red.stoynost:not(.sbor)');
    proveri('и даде изложението', sIzlozhenie[3]?.[4], 'И');
    proveri('продаденото НЕ влиза в А', (await plochka(p, 'А · по площ')) !== bezLista, true);
    proveri('нито в Б', (await plochka(p, 'Б · по състояние')) !== bezListaB, true);

    // ПРЕВКЛЮЧВАТЕЛЯТ · „избираш само едната да се вижда"
    proveri('подразбраното е „и двете"', await p.$eval('#koya-tsena', (e) => (e as any).value), 'dvete');
    await deystvieSPrerisuvane(p, () => p.selectOption('#koya-tsena', 'sastoyanie'));
    proveri('изборът се задържа след прерисуване', await p.$eval('#koya-tsena', (e) => (e as any).value), 'sastoyanie');
    proveri('таблицата на екрана НЕ се мени — изборът е за износа', (await redove(p, '.red.stoynost:not(.sbor)')).length, 5);

    // ══ 107 · „СЪЗДАЙ СГРАДА" · Калкулаторът и РАЖДА (резен 29 · ADR-089) ══
    //
    // Негово: „да ще е най интересно да има създай сграда там . Качваш
    // таблицата и управлваш" *(р83·[20])*, с обхвата от същия ден: „всипки се
    // създават от Упрсвление. Само от там.. При сгради ще е от калкулатова".
    razdel = '107 · Създай сграда · редът се явява при прочетени обекти';
    proveri('редът го има, щом файлът е прочетен',
      Boolean(await p.$('[data-sektsiya=sazday-sgrada]')), true);
    proveri('и бутонът КАЗВА колко обекта ще роди',
      (await tekstNa(p, '#sazday-sgrada')).includes('5 обекта'), true);

    razdel = '107 · Създай сграда · празното име отказва с ДУМИ';
    const prediOtkaz = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#sazday-sgrada'));
    proveri('отказва, вместо да роди безименни имоти',
      (await tekstNa(p, '.vest.zle')).includes('няма име'), true);
    proveri('и НИЩО не влиза в Журнала', await broySabitiya(p), prediOtkaz);

    razdel = '107 · Създай сграда · ражда ИМОТИ, и само тях';
    await napishiVPoleto(p, '#ime-sgrada', 'ул. Опитна 7');
    await sSabitiya(p, 5, () => p.click('#sazday-sgrada'));
    proveri('казва СВЕРКАТА вход↔изход',
      (await tekstNa(p, '.vest.dobre')).includes('разлика 0'), true);
    proveri('и колко нови имота са родени',
      (await tekstNa(p, '.vest.dobre')).includes('5 нови имота'), true);
    proveri('обявява, че дела НЕ се раждат',
      (await tekstNa(p, '.vest.dobre')).includes('Дела не се раждат'), true);

    await naEkran(p, 'imoti', '#forma-imot');
    const sImoti = await redove(p, '[data-tablitsa=imoti] .red');
    proveri('петте обекта СА в Имоти, под неговото име',
      sImoti.filter((r) => String(r[0] ?? '').includes('Опитна 7')).length, 5);

    /**
     * 107 · ВТОРОТО НАТИСКАНЕ · и какво ТОЧНО пази тази проверка.
     *
     * Тя пази, че екранът РАЗПОЗНАВА вече родените и го КАЗВА — не че `opId`-ът
     * е идемпотентен. Разликата излезе от счупване, което МИНА: замених адреса
     * на действието със случайно число и проходът не мигна, защото `zaVpisvane`
     * филтрира съществуващите ПРЕДИ записа и до Вратата не стига нищо.
     *
     * Идемпотентността се пази от `tests/sazdavane-sgrada.test.ts` — там две
     * ЕДНОВРЕМЕННИ раждания виждат едно и също Огледало, и тогава единственото,
     * което спира дубликата, е `opId`-ът.
     */
    razdel = '107 · Създай сграда · вече роденото се РАЗПОЗНАВА и се КАЗВА';
    await naEkran(p, 'stoynost', '#sazday-sgrada');
    const prediVtoro = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#sazday-sgrada'));
    proveri('нито едно ново събитие', await broySabitiya(p), prediVtoro);
    proveri('и екранът КАЗВА, че вече ги е имало',
      (await tekstNa(p, '.vest.dobre')).includes('5 вече ги имаше'), true);

    // ══ 23 · Отчетите · всяко число с формулата си ═══════════════════════
}

/** 38 · Малинова Долина */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '38 · Малинова Долина';
    await naEkran(p, 'stoynost', '#cheti-ploshti');
    await p.setInputFiles('#fayl-ploshti', fileURLToPath(new URL('../../primeri/tseni-md.csv', import.meta.url)));
    await p.waitForFunction(() => document.body.textContent.includes('Прочетени 45'));
    const vestMD = (await tekstNa(p, '.vest')).replace(/[\s\u00A0\u202F]/g, '');
    proveri('45-те обекта влизат · разликата е нула',
      vestMD.includes('Прочетени45обекта→45реда·разлика0'), true);
    proveri('листата носи цените · сбор 2 118 800,00 €',
      vestMD.includes('цениза25обекта·сбор2118800,00€'), true);
    proveri('и разминатите площи на файла се КАЗВАТ, не се преглъщат',
      vestMD.includes('площитенафайланесесверяват'), true);

    // ВПИСВАНЕТО: обектите стават Имоти, задачите — Дела, през Вратата
    const predMD = await broySabitiya(p);
    await p.click('#vpishi-obekti');
    await p.waitForFunction(() => document.body.textContent.includes('Вписано:'));
    const vestVpis = await tekstNa(p, '.vest');
    proveri('вписани са 45 имота', vestVpis.includes('45 имота'), true);
    proveri('и 79 дела (4 на сградата + 3 на всеки непродаден)',
      vestVpis.includes('79 дела'), true);
    proveri('всяко е събитие в Журнала', await broySabitiya(p), predMD + 45 + 79);

    // ПОВТОРНОТО натискане НЕ удвоява — казва „вече бяха вписани"
    await p.click('#vpishi-obekti');
    await p.waitForFunction(() => document.body.textContent.includes('не се удвояват'));
    proveri('повторното вписване не пише нищо', await broySabitiya(p), predMD + 45 + 79);

    // обектите се ДВИЖАТ в другите таблици: Имоти ги вижда
    await naEkran(p, 'imoti', '#forma-imot');
    await p.fill('[data-tarsi-tablitsa="imoti"]', 'Малинова Долина');
    await p.waitForFunction(() =>
      document.querySelectorAll('.red.imot').length === 45);
    proveri('Имоти показва 45-те обекта на Малинова Долина',
      await p.$$eval('.red.imot', (r) => r.length), 45);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-izchisti-vsichko="imoti"]'));

    // и Управление вижда делата — с Акт 16 към самата сграда
    await naEkran(p, 'gant', '#d-forma-delo');
    const gantTekst = await p.evaluate(() => document.body.textContent);
    proveri('Гант носи Акт 16', gantTekst.includes('Акт 16'), true);
    proveri('и огледите за продажба или наем', gantTekst.includes('Оглед за продажба или Наем'), true);

    // ══ 39 · диаграмите в Сметки (И92 т.4) ══════════════════════════════════
}

/** 51 · двете секции на Калкулатора */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '51 · двете секции на Калкулатора';
    await naEkran(p, 'stoynost', '#cheti-ploshti');

    proveri('секция „Калкулатор" стои горе',
      Boolean(await p.$('[data-sektsiya=kalkulator]')), true);
    proveri('секция „Ценова листа" стои под нея',
      Boolean(await p.$('[data-sektsiya="tsenova-lista"]')), true);

    // ПЕТТЕ КОЕФИЦИЕНТА · меню от ДУМИ, не свободно число („аз не знам")
    proveri('петте коефициента са менюта',
      await p.$$eval('.red.kalk-koef select[data-koef]', (r) => r.length), 5);
    proveri('и всяко е меню от думи, не поле за число',
      await p.$$eval('.red.kalk-koef select[data-koef] option',
        (o) => o.every((x) => /[А-Яа-я]/.test(x.textContent))), true);

    // КАК СЕ СМЯТА · графите, ред по ред. От резен 16б са ЧЕТИРИ: трите
    // подхода на занаята плюс съгласуването между тях.
    proveri('четирите графи стоят една до друга',
      await p.$$eval('.dve-grafi .grafa', (r) => r.length), 4);
    const grafaA = await p.$eval('.dve-grafi .grafa:nth-child(1)', (e) => e.textContent);
    proveri('Графа А тръгва от площ × база', grafaA.includes('площ × база'), true);
    proveri('и всеки от петте коефициента е СВОЙ ред',
      ['етаж', 'състояние', 'изложение', 'възраст', 'асансьор']
        .every((d) => grafaA.includes(d)), true);
    const grafaB = await p.$eval('.dve-grafi .grafa:nth-child(2)', (e) => e.textContent);
    proveri('Графа Б показва четирите си стъпки',
      ['годишен наем', 'заетост', 'нетен оперативен доход', 'доходност']
        .every((d) => grafaB.includes(d)), true);

    // ПРИМЕРЪТ ЗА КОЕФИЦИЕНТ · негово изрично искане · разгъва се ПОД реда
    proveri('примерът е прибран, докато не се поиска',
      Boolean(await p.$('.red.kalk-primer')), false);
    await deystvieSPrerisuvane(p, () => p.click('[data-primer=etazh]'));
    proveri('примерът се разгъва под реда, без изскачащ прозорец',
      Boolean(await p.$('.red.kalk-primer')), true);
    const parterat = await p.$eval('.red.kalk-primer tr[data-stapka=parter]', (r) => ({
      mnozhitel: (r.querySelector('[data-mnozhitel]') as any).textContent.trim(),
      meni: (r.querySelector('[data-meni]') as any).textContent.trim(),
      pari: (r.querySelector('[data-meni-pari]') as any).textContent.trim(),
    }));
    proveri('множителят стои с три знака', parterat.mnozhitel, '0,920');
    proveri('и до него — с колко процента мени', parterat.meni, '−8,00 %');
    // Числото зависи от обекта, който се разбива; проверява се, че процентът е
    // ПРЕВЕДЕН В ПАРИ и е отрицателен — „0,92" само по себе си не е пример.
    proveri('процентът е преведен в ПАРИ, не оставен сам',
      parterat.pari.startsWith('−') && parterat.pari !== '0,00', true);
    proveri('избраната стъпка е назована с ДУМА, не само с цвят',
      (await p.$eval('.red.kalk-primer', (e) => e.textContent)).includes('избрано'), true);

    // РАЗЛИКАТА · и числото, което свързва двете графи
    const razlikata = await p.$$eval('.plochka .etiket', (e) => e.map((x) => x.textContent));
    proveri('разликата Б − А е показана', razlikata.includes('Разлика · Б − А'), true);
    proveri('и подразбиращата се доходност също',
      razlikata.includes('Подразбираща се доходност'), true);

    // ВРЪЗКАТА МЕЖДУ ДВЕТЕ СЕКЦИИ · смяна горе мени числата долу
    await p.setInputFiles('#fayl-ploshti', fileURLToPath(new URL('../../primeri/tseni-md.csv', import.meta.url)));
    await p.waitForFunction(() => document.body.textContent.includes('Прочетени 45'));
    const predSmyana = await chisloNaPoleto(p, 'stoynost-a');
    // ЧАКА СЕ ЧИСЛОТО, не прерисуването. Обработчикът е асинхронен и прави ДВЕ
    // неща — пресмята листата и прерисува; шапката се отбелязва при второто,
    // тъй че „шапката е нова" не значи „числото е новото". Платено с находка:
    // проверката минаваше през път и падаше през път, което е по-лошо от
    // проверка, която пада винаги.
    await smeniKoefitsient(p, 'sastoyanie', 'novo-luks');
    const sledSmyana = await chisloNaPoleto(p, 'stoynost-a');
    proveri('коефициент, сменен ГОРЕ, мени листата ДОЛУ', sledSmyana > predSmyana, true);

    // и обратно · връщането връща числото точно, без утайка от закръгляне
    await smeniKoefitsient(p, 'sastoyanie', 'dobro');
    proveri('връщането връща същото число', await chisloNaPoleto(p, 'stoynost-a'), predSmyana);

    // И НИЩО ОТ ТОВА НЕ ПИША В ЖУРНАЛА · „няма редакция оттам, а само изчисляване"
    const predKalk = await broySabitiya(p);
    await smeniKoefitsient(p, 'izlozhenie', 'yug');
    proveri('Калкулаторът не пише нищо в Журнала', await broySabitiya(p), predKalk);
    await smeniKoefitsient(p, 'izlozhenie', 'iztok-zapad');

    // ══ 84 · БАЗИТЕ · дадено срещу чакащо, и петте с поле (резен 16) ════════
    //
    // Негови думи, 23.08: „сложи 3000 евро цена за старт" (И53) и „3000 евро
    // беше цената, която калкулаторът да ползва" (И55). До 30.08 ЕДНО число
    // беше дадено; на 31.08 дойдоха и другите четири („напиши 2 000 евро на
    // всички"), тъй че вече НИТО ЕДНА база не чака него.
    razdel = '84 · Базите · петте полета и кое е НЕГОВО';
    proveri('всеки от петте вида има СВОЕ поле за база',
      await p.$$eval('[data-baza]', (e) => e.length), 5);
    proveri('и до апартамента пише, че числото е НЕГОВО',
      (await p.$eval('[data-otkade=apartament]', (e) => e.textContent ?? '')).includes('НЕГОВО'), true);
    // ВСИЧКИТЕ ПЕТ вече са негови (31.08): апартаментът 3 000 €/м², другите
    // четири по 2 000 €/м² от „Остави ги празни или напиши 2 000 евро на
    // всички". Дотук тук се проверяваше, че гаражът ЧАКА него — вярно до 30.08.
    proveri('и до гаража — също, вече не чака никого',
      (await p.$eval('[data-otkade=garazh]', (e) => e.textContent ?? '')).includes('НЕГОВО'), true);
    proveri('паркомястото КАЗВА двойната си цена',
      (await tekstNa(p, '[data-parkomyasto-dvete]')).includes('ДВЕ цени'), true);

    razdel = '84 · Базите · смяната мени числото ДОЛУ';
    const predBazata = await chisloNaPoleto(p, 'stoynost-a');
    const predSabitiya = await broySabitiya(p);
    await smeniIChakayIzhoda(p, '#kalk-baza', '3500', 'stoynost-a');
    const sledBazata = await chisloNaPoleto(p, 'stoynost-a');
    proveri('по-висока база дава по-висока стойност', sledBazata > predBazata, true);
    proveri('и НИЩО от това не влиза в Журнала', await broySabitiya(p), predSabitiya);
    // Връщането връща числото ТОЧНО — инак закръглянето би оставило утайка.
    // Как се чака смяната, и защо точно така, живее при `smeniBazata` (правило
    // 17): „мръднало е" и „мръднало е точно дотам" са различни неща, тъй че
    // твърдението отдолу пак може да падне.
    const izhodPri3500 = await tekstNaChisloto(p, 'stoynost-a');
    await smeniIChakayIzhoda(p, '#kalk-baza', '3000', 'stoynost-a');
    proveri('връщането връща същото число', await chisloNaPoleto(p, 'stoynost-a'), predBazata);

    razdel = '84 · Базите · и ГАРАЖЪТ вече се пипа';
    // `sBaza` приемаше всеки вид от самото начало; екранът редактираше само
    // апартамента, значи гаражът се смяташе с число, недостижимо за човека.
    // ЧАКА СЕ САМАТА СТОЙНОСТ, не прерисуването: полето се пренаписва СЛЕД
    // записа в паметта, и четене веднага след събитието хваща старото число.
    // А писането се ПОВТАРЯ (Ж2), защото едно чакане не поправя действие, което
    // прерисуването е изяло — тогава чакането просто изтича след 30 s.
    //
    // Сравнява се БЕЗ разстоянията: това поле се пренаписва в свой вид („1 200"),
    // тъй че дословно чакане тук не се сбъдва никога — уроците на §84.
    await dokatoStane(
      p,
      async () => {
        await p.fill('[data-baza=garazh]', '1200');
        await p.dispatchEvent('[data-baza=garazh]', 'change');
      },
      async () =>
        (await p.$eval('[data-baza=garazh]', (e) => (e as HTMLInputElement).value))
          .replace(/\s/g, '')
          .startsWith('1200'),
      'базата на гаража = 1200',
    );
    proveri('новата база на гаража се помни',
      (await p.$eval('[data-baza=garazh]', (e) => (e as HTMLInputElement).value.replace(/\s/g, ''))).startsWith('1200'),
      true);

    // ══ 89 · В · РАЗХОДНИЯТ подход и СЪГЛАСУВАНЕТО (резен 16б) ═══════════════
    //
    // Методологията от 23.08 описва ТРИ подхода и претеглената сметка; кодът
    // правеше два. Отчетът обещаваше нещо, което кодът не изпълняваше.
    razdel = '89 · В · разходният подход';
    proveri('всеки вид има поле за земя и за строителна стойност',
      await p.$$eval('[data-razhod]', (e) => e.length), 10);
    proveri('и до всяко пише, че числото чака него',
      (await tekstNa(p, '[data-sektsiya=kalk-razhod]')).includes('чака него'), true);
    proveri('плочката В показва число',
      (await chisloNaPoleto(p, 'stoynost-v')) > 0, true);
    proveri('и КАЗВА закръглянето си, както А и Б',
      (await tekstNa(p, '[data-pole=stoynost-v] .pod')).includes('закръглено'), true);

    // ЗЕМЯТА НЕ ОВЕХТЯВА · мери се на живо, не се чете от надпис.
    const predVazrastta = await chisloNaPoleto(p, 'stoynost-v');
    // ТРЕТА поправка на този ред. Първата пускаше две събития наведнъж; втората
    // мина на `napishiVPoleto` (пише и излиза от полето) — и пак пропадаше през
    // пускане, защото НИТО ЕДНА от двете не чака ДЕЙСТВИЕТО да е стигнало. Това
    // е група Ж2 и се поправя както §84: пише се пак, докато изходът не мръдне.
    await smeniIChakayIzhoda(p, '#kalk-vazrast', '35', 'stoynost-v');
    const sledVazrastta = await chisloNaPoleto(p, 'stoynost-v');
    proveri('по-стара сграда дава по-ниска разходна стойност',
      sledVazrastta < predVazrastta, true);
    proveri('и екранът казва колко от сградата остава',
      (await tekstNa(p, '[data-ostavashti]')).includes('%'), true);

    // ЗЕМЯТА НЕ ОВЕХТЯВА · и това се мери при ИЗЧЕРПАН живот, не при среден.
    //
    // ПЛАТЕНО С ФАЛШИВА ЗЕЛЕНА: първата версия питаше „по-ниско, но не нула" на
    // средна възраст. Счупих сметката да яде и земята — и проходът МИНА, защото
    // на 35 от 70 години и двете формули дават нещо между нулата и цялото.
    // „По-малко, но не нула" не различава оцеляла земя от свита земя.
    //
    // Тук животът се изчерпва НАПЪЛНО: сградата отива на нула и остава САМО
    // земята. Изяде ли я множителят, числото пада на нула и проверката го
    // хваща с число, не с усещане.
    // Пак Ж2 · писането се повтаря, докато надписът не каже изчерпания живот.
    await dokatoStane(
      p,
      () => napishiVPoleto(p, '#kalk-vazrast', '70'),
      async () => (await tekstNa(p, '[data-ostavashti]')).includes('0,00 %'),
      'изчерпан полезен живот при възраст 70',
    );
    proveri('при ИЗЧЕРПАН полезен живот от сградата не остава нищо',
      (await tekstNa(p, '[data-ostavashti]')).includes('0,00 %'), true);
    proveri('но В пак е НАД нулата · земята не овехтява',
      (await chisloNaPoleto(p, 'stoynost-v')) > 0, true);
    // ЧАКА СЕ САМАТА СТОЙНОСТ, не прерисуването · същият капан като при базите
    // в §84: полето се пренаписва СЛЕД записа в паметта, и попълване веднага
    // след предишното прерисуване пише в възел, който вече е сменен. Едно
    // чакане обаче не поправя писане, което не е стигнало — оттам `dokatoStane`.
    await dokatoStane(
      p,
      () => napishiVPoleto(p, '#kalk-vazrast', '0'),
      async () => (await tekstNa(p, '[data-ostavashti]')).includes('100,00'),
      'върната възраст 0',
    );
    proveri('връщането връща същото число',
      await chisloNaPoleto(p, 'stoynost-v'), predVazrastta);

    razdel = '89 · съгласуването · трите тегла';
    proveri('трите тегла имат поле', await p.$$eval('[data-teglo]', (e) => e.length), 3);
    proveri('сборът им се ПОКАЗВА и затваря',
      (await tekstNa(p, '[data-sbor-tegla]')).includes('затваря'), true);
    const predSluchaya = await p.$eval('[data-teglo=razhoden_bt]', (e) => (e as HTMLInputElement).value);
    await deystvieSPrerisuvane(p, () => p.selectOption('#kalk-sluchay', 'naem'));
    proveri('смяната на СЛУЧАЯ сменя теглата',
      (await p.$eval('[data-teglo=razhoden_bt]', (e) => (e as HTMLInputElement).value)) !== predSluchaya,
      true);
    proveri('и съгласуваната плочка показва избрания случай',
      (await tekstNa(p, '[data-pole=stoynost-saglasuvana] .pod')).includes('под наем'), true);

    // СБОР, РАЗЛИЧЕН ОТ 100 %, се КАЗВА · не се пренормира мълчаливо.
    await dokatoStane(
      p,
      async () => {
        await p.fill('[data-teglo=pazaren_bt]', '80');
        await p.dispatchEvent('[data-teglo=pazaren_bt]', 'change');
      },
      async () => (await tekstNa(p, '[data-sbor-tegla]')).includes('НЕ затваря'),
      'сборът на теглата минава 100 %',
    );
    proveri('сбор над 100 % се казва на глас',
      (await tekstNa(p, '[data-sbor-tegla]')).includes('НЕ затваря'), true);
    proveri('и находката излиза при проверката на настройките',
      (await tekstNa(p, '[data-sektsiya=kalkulator] .vest.zle')).includes('точно 100 %'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#kalk-sluchay', 'novo'));
    proveri('изборът на случай ВРЪЩА сбора на 100 %',
      (await tekstNa(p, '[data-sbor-tegla]')).includes('затваря'), true);

    razdel = '89 · съгласуването · четвъртата колона и износът';
    /**
     * ЧАКА СЕ ИЗМЕРВАНОТО, не прерисуването · находка на резен 18б.
     *
     * Тази проверка падна ВЕДНЪЖ на четири пускания: сборът на теглата вече
     * пишеше „затваря", а плочката още носеше числото от състоянието, в което
     * теглата НЕ затваряха. Тоест двете половини на един и същ екран се
     * прерисуват в различни мигове, а `deystvieSPrerisuvane` пуска при първата.
     *
     * Проверка, която веднъж минава и веднъж пада, е ПО-ЛОША от липсваща
     * (ADR-077 §5). Затова тук се чака САМОТО число, а не рисуването — и се
     * чака ограничено, за да не се превърне мълчаливо в трийсетсекунден
     * таймаут, ако някой ден плочката наистина остане нула.
     */
    await p.waitForFunction(
      () =>
        Number(
          (
            document.querySelector('[data-pole="stoynost-saglasuvana"] .chislo')?.textContent ?? '0'
          ).replace(/[^\d,-]/g, '').replace(',', '.'),
        ) > 0,
      undefined,
      { timeout: 5_000 },
    );
    proveri('съгласуваната плочка показва число',
      (await chisloNaPoleto(p, 'stoynost-saglasuvana')) > 0, true);
    // СТОИ МЕЖДУ ТРИТЕ · претегляне не излиза вън от обхвата им.
    const a89 = await chisloNaPoleto(p, 'stoynost-a');
    const b89 = await chisloNaPoleto(p, 'stoynost-b');
    const v89 = await chisloNaPoleto(p, 'stoynost-v');
    const sag89 = await chisloNaPoleto(p, 'stoynost-saglasuvana');
    proveri('съгласуваната стои МЕЖДУ най-малката и най-голямата от трите',
      sag89 >= Math.min(a89, b89, v89) && sag89 <= Math.max(a89, b89, v89), true);
    proveri('изборът при износа вече е ПЕТ',
      await p.$$eval('#koya-tsena option', (e) => e.length), 5);
    proveri('и първият вече не се преструва, че двете са всичко',
      (await p.$eval('#koya-tsena option', (e) => e.textContent ?? '')).includes('А и Б'), true);
    // ЧЕТИРИТЕ КОЛОНИ СА В ТАБЛИЦАТА · не само в плочките.
    // Хедърът минава през `text-transform: uppercase` — сверява се БЕЗ регистър,
    // както §22 вече го прави. Проверка по главна буква сравнява CSS, не текст.
    const glava89 = (await tekstNa(p, '[data-sektsiya=stoynost-obektite] .glava')).toLowerCase();
    proveri('таблицата носи и В, и Съгласувана',
      glava89.includes('по разход') && glava89.includes('съгласувана'), true);

    // ══ 52 · Журналът от таблица (И96 т.8) ═══════════════════════════════════
    //
    // Негово: „Няма редакция, а НОВ ФАЙЛ ЗАЛЕПЕН ЗА СТАРИЯ в журнала… скачени с
    // ТРЕТИ НОМЕР обединяващ и двата… извън графата на нормалния ред."
}
