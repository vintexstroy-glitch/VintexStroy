import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naPodtabNa, broySabitiya, deystvieSPrerisuvane, sSabitie } from '../yadro/pomoshtni.ts';
import type { Page } from 'playwright-core';
import { fileURLToPath } from 'node:url';

/**
 * ОТВАРЯ ТЕМАТА „Кредитите" в Настройки.
 *
 * ДВЕ стъпки, не една, и всяка със своя капан:
 *
 *   1. „Настройки" е ПАДАЩ РЕД, не гол бутон, и по-ранен раздел го оставя
 *      ОТВОРЕН. Безусловен клик тогава го ЗАТВАРЯ, а чакането „да е отворен"
 *      виси трийсет секунди (поуката, платена четири пъти в ADR-078 §12);
 *   2. отвореният ред показва ТЕМИТЕ, не секциите. Секцията се появява едва
 *      след като темата се избере — първата версия на този блок чакаше
 *      направо `#krediti-vklyucheni` и увисна точно тук.
 */
async function vNastroyki(p: Page): Promise<void> {
  if (await p.$eval('#nastroyki-red', (e) => (e as HTMLElement).hidden)) {
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(
      () => (document.querySelector('#nastroyki-red') as HTMLElement | null)?.hidden === false,
      undefined,
      { timeout: 5_000 },
    );
  }
  await p.click('#nastroyki-red [data-tema="krediti"]');
  await p.waitForSelector('#krediti-vklyucheni');
}

/**
 * 97 · КРЕДИТИТЕ · таблицата, ред-проекцията и двата процента (резен 19).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · таблицата стои ПОД Разходи, в Сметки — „не той е под реда на разходи";
 *   · редът е ПРОЕКЦИЯ и го КАЗВА — сбор, не запис;
 *   · планът показва ДАТИ и намаляващ остатък — „интерполирай… по дати";
 *   · двата процента стоят един до друг и са РАЗЛИЧНИ числа;
 *   · „вноски още" се СМЯТА и се мени след плащане;
 *   · закачането на документ работи и за кредит — петият адрес.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '97 · Кредитите · таблицата и ред-проекцията';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');

  proveri(
    'секцията Кредити стои в Сметки и е ВКЛЮЧЕНА',
    await p.$eval('[data-sektsiya=krediti]', (e) => (e as HTMLElement).dataset['vklyuchena']),
    'da',
  );
  proveri(
    'редът-проекция стои ОТДЕЛНО от таблицата · той е сбор, не запис',
    await p.$$eval('[data-sektsiya=krediti-red] [data-red-proektsiya]', (e) => e.length),
    1,
  );
  proveri(
    'главата на таблицата носи ЕДИНАЙСЕТ колони',
    await p.$$eval('[data-tablitsa=krediti] .glava .glavicha', (e) => e.length),
    11,
  );
  proveri(
    'и трите СМЕТНАТИ колони са затворени · те не се редактират от никого',
    (
      await p.$$eval('[data-tablitsa=krediti] .glava .glavicha.zatvorena', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Остатък · Лихва към деня · Вноски още',
  );

  // ── ЗАПИСВАМЕ КРЕДИТ ─────────────────────────────────────────────────────
  const predi = await p.$$eval('[data-kredit]', (e) => e.length);

  await p.fill('#kredit-ime', 'Ипотека · Пощенска');
  await p.fill('#kredit-ostatak', '100000,00');
  await p.fill('#kredit-obezpechenie', '200000,00');
  await p.fill('#kredit-lihva', '3,45');
  await p.fill('#kredit-vnoska', '612,34');
  await p.fill('#kredit-den', '15');
  await p.fill('#kredit-otgovornik', 'vintexstroy@gmail.com');
  await sSabitie(p, () => p.click('#forma-kredit button[type=submit]'));
  await p.waitForSelector('[data-kredit]');

  proveri(
    'кредитът влезе в таблицата',
    await p.$$eval('[data-kredit]', (e) => e.length),
    predi + 1,
  );
  proveri(
    'остатъкът е началният · нищо още не е платено',
    await p.$eval('[data-kredit]', (e) => Number((e as HTMLElement).dataset['ostatak'])),
    100_000_00,
  );

  // ── ДВАТА ПРОЦЕНТА ───────────────────────────────────────────────────────
  await p.waitForSelector('[data-sektsiya=krediti-plan]');
  const dogovoren = await p.$eval('[data-sektsiya=krediti-plan] [data-dogovoren]', (e) =>
    Number((e as HTMLElement).dataset['dogovoren']),
  );
  const kamDenya = await p.$eval('[data-sektsiya=krediti-plan] [data-kamdenya]', (e) =>
    Number((e as HTMLElement).dataset['kamdenya']),
  );
  proveri('договорната лихва е неговите 3,45 %', dogovoren, 345);
  proveri('лихвата към деня е ДРУГО число · иначе вторият процент е надпис', kamDenya, 4_695);

  // ── ПЛАНЪТ ПО ДАТИ ───────────────────────────────────────────────────────
  const redoveNaPlana = await p.$$eval('[data-tablitsa=krediti-plan] .red.planred', (e) =>
    e.filter((x) => !x.classList.contains('glava')).length,
  );
  proveri('планът показва вноски по дати', redoveNaPlana > 0, true);

  const ostatatsi = await p.$$eval('[data-tablitsa=krediti-plan] .red.planred[data-ostatak]', (e) =>
    e.map((x) => Number((x as HTMLElement).dataset['ostatak'])),
  );
  proveri(
    'и остатъкът пада с ВСЯКА вноска · нито една стъпка нагоре',
    ostatatsi.every((x, i) => i === 0 || x < ostatatsi[i - 1]!),
    true,
  );

  const mesetsiPredi = await p.$eval('[data-sektsiya=krediti-plan] [data-mesetsi]', (e) =>
    Number((e as HTMLElement).dataset['mesetsi']),
  );
  proveri('и „вноски още" е дължината на плана, не поле', mesetsiPredi > 0, true);

  // ── ПЛАЩАНЕТО ────────────────────────────────────────────────────────────
  await p.fill('#plashtane-data', '2026-09-15');
  await p.fill('#plashtane-suma', '612,34');
  await p.fill('#plashtane-glavnitsa', '324,84');
  await p.fill('#plashtane-lihva', '287,50');
  await sSabitie(p, () => p.click('#forma-plashtane button[type=submit]'));
  await p.waitForFunction(
    () =>
      Number(
        (document.querySelector('[data-kredit]') as HTMLElement | null)?.dataset['ostatak'] ?? '0',
      ) < 100_000_00,
    undefined,
    { timeout: 5_000 },
  );

  proveri(
    'остатъкът падна с ГЛАВНИЦАТА · не със сумата на вноската',
    await p.$eval('[data-kredit]', (e) => Number((e as HTMLElement).dataset['ostatak'])),
    100_000_00 - 324_84,
  );

  // ── ОТКАЗЪТ СЕ КАЗВА ─────────────────────────────────────────────────────
  await p.fill('#plashtane-data', '2026-10-15');
  await p.fill('#plashtane-suma', '612,34');
  await p.fill('#plashtane-glavnitsa', '400,00');
  await p.fill('#plashtane-lihva', '100,00');
  await p.click('#forma-plashtane button[type=submit]');
  await p.waitForFunction(
    () => (document.querySelector('#greshka-plashtane')?.textContent ?? '').length > 0,
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'разминат сбор се ОТКАЗВА · и отказът носи ЧИСЛАТА',
    /не събират вноската/.test(
      (await p.textContent('#greshka-plashtane')) ?? '',
    ),
    true,
  );

  proveri(
    'хартията по кредита се закача · петият адрес е на екрана',
    await p.$$eval('[data-sektsiya=krediti-plan] [data-dokumenti]', (e) => e.length) > 0,
    true,
  );
}

/**
 * 97в · ПОГАСИТЕЛНИЯТ ПЛАН · КАЛКУЛАТОРЪТ · ПРЕДЛОЖЕНАТА ВНОСКА (резен 73).
 *
 * И124 т.12, дословно: „От извлеченията се вкарва и наличните кредити, които
 * работят с вкаран погасителен план и договори свързан в папка за това. В
 * Сметки един прост груп йалкулато за вкарване ръчно на кредит за
 * експеримент на прогноза."
 */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '97в · Погасителният план от договора';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // Дати НАПРЕД от днешния ден · закована дата ще остарее (урокът на §91).
  const den = (mesetsaNapred: number): string => {
    const d = new Date();
    d.setUTCDate(5);
    d.setUTCMonth(d.getUTCMonth() + mesetsaNapred);
    return d.toISOString().slice(0, 10);
  };

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
  // Кредитът от §97 е избран от записа си · планът му е на екрана.
  await p.waitForSelector('[data-sektsiya=krediti-plan][data-plan-izvor]');
  proveri(
    'без вкаран план изворът е ИНТЕРПОЛАЦИЯ и се казва',
    await p.$eval('[data-sektsiya=krediti-plan]', (e) => (e as HTMLElement).dataset['planIzvor']),
    'интерполация',
  );

  // Крив ред се ОТКАЗВА с датата си · частите не се събират.
  await p.fill('#plan-tekst', `${den(1)};700,00;600,00;99,00`);
  await p.click('#forma-plan button[type=submit]');
  await p.waitForFunction(
    () => (document.querySelector('#greshka-plan')?.textContent ?? '').length > 0,
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'вноска, чиито части не се събират, се отказва с ДАТАТА ѝ',
    /не се събира/.test((await p.textContent('#greshka-plan')) ?? ''),
    true,
  );

  // Верният план влиза · договорът БИЕ интерполацията.
  await p.fill('#plan-tekst', `${den(1)};700,00;600,00;100,00\n${den(2)};700,00;610,00;90,00`);
  await sSabitie(p, () => p.click('#forma-plan button[type=submit]'));
  await p.waitForSelector('[data-sektsiya=krediti-plan][data-plan-izvor=договор]');
  proveri(
    'планът вече е ДОГОВОР и заглавието го казва',
    (await p.textContent('[data-sektsiya=krediti-plan] .dyalglava span'))?.includes('ВКАРАНИЯТ план'),
    true,
  );
  proveri(
    'редовете са ДВАТА от договора, по неговите дати',
    await p.$$eval('[data-tablitsa=krediti-plan] .red.planred:not(.glava)', (e) =>
      e.map((x) => (x as HTMLElement).dataset['data']).join(' · '),
    ),
    `${den(1)} · ${den(2)}`,
  );
  proveri(
    'и „вноски още" брои ДОГОВОРА, не интерполацията',
    await p.$eval('[data-sektsiya=krediti-plan] [data-mesetsi]', (e) =>
      Number((e as HTMLElement).dataset['mesetsi']),
    ),
    2,
  );

  // ═══ 117 · ПОГАСИТЕЛНИЯТ ПЛАН ОТ ПДФ НА БАНКАТА (ADR-167) ═══
  //
  // „Кредититер се четат от пдф за погасителния план. Така се зареждат." (И134)
  // Мострата е ИЗМИСЛЕНА (правило 29), но с направата на банката: шапка,
  // осем колони, ПРОМЕНЛИВА лихва и собствен ред „Общо:" за сверката.
  razdel = '117 · планът от ПДФ се ЧЕТЕ, но не се записва';
  const prediPDF = await broySabitiya(p);
  proveri('преди четене няма прочетен план',
    await p.$eval('[data-plan-vnoski]', (e) => (e as HTMLElement).dataset['planVnoski']), '0');
  await p.setInputFiles('#plan-fayl-pdf',
    fileURLToPath(new URL('../../tests/mostri/pogasitelen-plan.pdf', import.meta.url)));
  await p.waitForFunction(() =>
    (document.querySelector('[data-plan-vnoski]') as HTMLElement | null)?.dataset['planVnoski'] === '6');
  proveri('шестте вноски се четат от ПДФ-а', 
    await p.$eval('[data-plan-vnoski]', (e) => (e as HTMLElement).dataset['planVnoski']), '6');
  proveri('и трите сверки затварят · разлика нула',
    await p.$eval('[data-plan-razlika]', (e) => (e as HTMLElement).dataset['planRazlika']), '0');
  proveri('нито един невързан ред · главница + лихва = вноска',
    await p.$eval('[data-plan-nevarzani]', (e) => (e as HTMLElement).dataset['planNevarzani']), '0');
  proveri('четенето НЕ пише · записва човекът (правило 18)', await broySabitiya(p), prediPDF);

  razdel = '117 · планът ражда НОВ кредит от шапката си';
  // По подразбиране изборът е „НОВ кредит от шапката" — така вторият план не
  // застъпва първия кредит, а „Кредититер се четат от пдф… Така се зареждат".
  proveri('изборът по подразбиране е НОВ кредит',
    await p.$eval('#plan-kam-kredit', (e) => (e as HTMLSelectElement).value), '');
  const prediKrediti = await p.$$eval('[data-kredit]', (e) => e.length);
  await deystvieSPrerisuvane(p, () => p.click('#plan-vkaray'));
  proveri('кредитът и планът са ДВЕ събития · записът е на човека',
    await broySabitiya(p), prediPDF + 2);
  proveri('и кредитите станаха с един повече',
    await p.$$eval('[data-kredit]', (e) => e.length), prediKrediti + 1);
  const vestPlan = await p.$eval('.vest', (e) => (e as HTMLElement).textContent ?? '');
  proveri('вестта казва И двете числа · лева и евро (И135б)',
    vestPlan.includes('лв.') && vestPlan.includes('€'), true);
  proveri('и казва, че лихвеният процент НЕ е в плана',
    vestPlan.includes('не е в плана'), true);
  proveri('новият кредит носи номера на договора в името си',
    await p.$$eval('[data-kredit]', (e) =>
      e.some((x) => (x.textContent ?? '').includes('BL00001'))), true);

  // ═══ 117 · КАЛКУЛАТОРЪТ Е ОПЦИЯ И ПО ПОДРАЗБИРАНЕ ГО НЯМА (ADR-167) ═══
  //
  // „За калкулатора за кредии да е по малък и да е като опция само в Сметки за
  // експерименти ДА СЕ ДОБАВЯ." (И134) Затова първо се проверява, че го няма,
  // после се добавя от Настройки — и чак тогава смята.
  razdel = '117 · калкулаторът се ДОБАВЯ от Настройки, не стои постоянно';
  proveri('по подразбиране калкулаторът го НЯМА на екрана',
    await p.$$eval('[data-sektsiya=kredit-kalkulator]', (e) => e.length), 0);
  await vNastroyki(p);
  await deystvieSPrerisuvane(p, () => p.click('#krediti-kalkulator'));
  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
  await p.waitForSelector('#forma-kalkulator');
  proveri('след отметката калкулаторът е там · един, не два',
    await p.$$eval('[data-sektsiya=kredit-kalkulator]', (e) => e.length), 1);

  razdel = '97в · Кредитният калкулатор · нула събития';
  const sabitiyaPredi = await broySabitiya(p);
  await p.fill('#kalk-ostatak', '100000,00');
  await p.fill('#kalk-lihva', '3,45');
  await p.fill('#kalk-vnoska', '1000,00');
  await p.fill('#kalk-den', '15');
  await p.click('#forma-kalkulator button[type=submit]');
  await p.waitForSelector('[data-kalk-mesetsi]');
  proveri(
    'калкулаторът смята месеците на експеримента',
    await p.$eval('[data-kalk-mesetsi]', (e) => Number((e as HTMLElement).dataset['kalkMesetsi'])) >
      0,
    true,
  );
  proveri('и НИЩО не влиза в Журнала · експеримент, не запис',
    await broySabitiya(p), sabitiyaPredi);

  razdel = '97в · Предложената вноска от извлечението';
  // Сверката с извлечението е в подтаб „Баланс" (резен 115 · ADR-161), а
  // калкулаторът отгоре е в „Разход".
  await naPodtabNa(p, 'smetki', 'balans', '[data-sektsiya=smetki-izvlechenie]');
  // Ред на банката с ДУМА от името на кредита · никой запис не го познава.
  // ЧЕТИРИНАЙСЕТ месеца напред, като §91: по-близък месец се оказа ЗАКЛЮЧЕН
  // от ДДС-справката на друг блок и записът тихо отказваше.
  const IZVLECHENIE =
    'Дата;Описание;Сума;Референция;Салдо\n' +
    `${den(14).split('-').reverse().join('.')};ПОЩЕНСКА БАНКА ВНОСКА КРЕДИТ;-612,34;RK-1;5000,00`;
  await p.setInputFiles('#fayl-izvlechenie', {
    name: 'izvlechenie-vnoska.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(IZVLECHENIE, 'utf8'),
  });
  await p.waitForSelector('[data-predlozheni-vnoski]');
  proveri(
    'редът с име на кредит ражда ЕДНО предложение',
    await p.$$eval('[data-predlozhena-vnoska]', (e) => e.length),
    1,
  );
  proveri(
    'и четенето само НЕ пише нищо · машината предлага (правило 18)',
    await broySabitiya(p),
    sabitiyaPredi,
  );

  // ОСТАТЪКЪТ преди · после натискането Е записът на човека.
  //
  // ОТ РЕЗЕН 115 (ADR-161) ДВЕТЕ СА НА РАЗЛИЧНИ ПОДТАБА: предложението идва от
  // сверката с извлечението (Баланс), а кредитът, чийто остатък пада, стои при
  // Разхода. Затова остатъкът се чете там, а записът се прави тук.
  const glavnitsa = await p.$eval('[data-zapishi-vnoska]', (e) =>
    Number((e as HTMLElement).dataset['glavnitsa']),
  );
  await naPodtabNa(p, 'smetki', 'razhod', '[data-kredit]');
  const ostatakPredi = await p.$eval('[data-kredit]', (e) =>
    Number((e as HTMLElement).dataset['ostatak']),
  );
  await naPodtabNa(p, 'smetki', 'balans', '[data-zapishi-vnoska]');
  await sSabitie(p, () => p.click('[data-zapishi-vnoska]'));
  await naPodtabNa(p, 'smetki', 'razhod', '[data-kredit]');
  proveri(
    'остатъкът падна ТОЧНО с предложената главница',
    await p.$eval('[data-kredit]', (e) => Number((e as HTMLElement).dataset['ostatak'])),
    ostatakPredi - glavnitsa,
  );

  // Чисто след себе си · извлечението се забравя, записът остава.
  await naPodtabNa(p, 'smetki', 'balans', '#zabravi-izvlechenie');
  await deystvieSPrerisuvane(p, () => p.click('#zabravi-izvlechenie'));
  proveri('затварянето маха предложенията заедно с извлечението',
    await p.$$eval('[data-predlozheni-vnoski]', (e) => e.length), 0);
}

/**
 * 98 · ИЗКЛЮЧВАНЕТО · „опция да изключваш и последната таблица" *(р83·[39])*.
 *
 * И най-важното, което този блок пази: изключването пипа ЕКРАНА и НИЩО друго.
 * Редът под Разходи остава, остатъкът остава, коефициентите остават —
 * скритото ПАК се смята (правило 23).
 */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '98 · Кредитите · изключената таблица ПАК се смята';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
  const redPredi = await p.$eval('[data-red-proektsiya]', (e) =>
    Number((e as HTMLElement).dataset['redProektsiya']),
  );
  proveri('редът-проекция носи число, преди да пипнем каквото и да е', redPredi > 0, true);

  // Отметката живее в НАСТРОЙКИ · „Настройки" е ПАДАЩ РЕД, не гол бутон.
  //
  // И НЕ СЕ ЧАКА СЪБИТИЕ. Отметката е ЛИЧНА и не влиза в Журнала (ADR-066):
  // `sSabitie` тук виси трийсет секунди, защото събитие никога не идва — и
  // това е точно поведението, което резенът обещава. Чака се ЕКРАНЪТ.
  await vNastroyki(p);
  const sabitiyaPredi = await broySabitiya(p);
  await p.click('#krediti-vklyucheni');
  await p.waitForSelector('[data-tablitsa-vkl=ne]');
  proveri('отметката се изключва и Настройки го КАЗВА', true, true);
  proveri(
    'и НИТО ЕДНО събитие не влиза в Журнала · скриването е лично',
    await broySabitiya(p),
    sabitiyaPredi,
  );

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
  proveri(
    'таблицата вече я НЯМА на екрана',
    await p.$eval('[data-sektsiya=krediti]', (e) => (e as HTMLElement).dataset['vklyuchena']),
    'ne',
  );
  proveri(
    'а редът под Разходи стои с СЪЩОТО число · скритото ПАК се смята',
    await p.$eval('[data-red-proektsiya]', (e) =>
      Number((e as HTMLElement).dataset['redProektsiya']),
    ),
    redPredi,
  );
  proveri(
    'и общият остатък се КАЗВА, вместо да изчезне заедно с таблицата',
    await p.$$eval('[data-sektsiya=krediti] [data-ostatak-obsht]', (e) => e.length),
    1,
  );

  // Връщаме я включена · следващите блокове я чакат на място.
  await vNastroyki(p);
  await p.click('#krediti-vklyucheni');
  await p.waitForSelector('[data-tablitsa-vkl=da]');
  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
  proveri(
    'и се връща обратно · изборът е обратим, защото е екран, не запис',
    await p.$eval('[data-sektsiya=krediti]', (e) => (e as HTMLElement).dataset['vklyuchena']),
    'da',
  );
}
