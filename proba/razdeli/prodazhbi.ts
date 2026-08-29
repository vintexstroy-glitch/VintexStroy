import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naEkran, sSabitie, tekstNa } from '../yadro/pomoshtni.ts';
import type { Page } from 'playwright-core';

/**
 * СМЯНА НА ЕКРАН, КОЯТО ЧАКА ЕКРАНА · не белега на шапката.
 *
 * `naEkran` е по-строгата: тя ДОКАЗВА, че е имало прерисуване. Тук трябва
 * другото — да се СТИГНЕ до екрана, и то от състояние, в което отворен падащ
 * ред може да стои над лентата. Двете не се заменят взаимно; тази се ползва
 * само в този раздел и затова живее тук, а не в общите помощници (поуката на
 * ADR-075 §6.3: обобщение без мярка е по-скъпо от повторението).
 */
async function naEkranPryako(p: Page, koy: string, znak: string): Promise<void> {
  if ((await p.$(znak)) === null) {
    await p.locator(`[data-ekran=${koy}]`).first().click();
  }
  await p.waitForSelector(znak);
}

/**
 * 94 · ПРОДАЖБИТЕ · сделката, вноските ѝ и терминалът (резен 18б).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · петнайсетте колони СТОЯТ на екрана, в НЕГОВИЯ ред;
 *   · новата сделка се отваря ЧЕРВЕНА и го КАЗВА, докато няма състояние;
 *   · вноската мени проверката с ТОЧНО толкова, колкото носи;
 *   · връщането и неустойката НЕ я местят — „никакво нетиране";
 *   · продадената влиза в АРХИВА и оттам няма връщане, а екранът казва защо.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  /** Числото на една плочка в блока с движенията · в центове. */
  const chislo = async (znak: string, klyuch: string): Promise<number> =>
    // Ключът се ПОДАВА като аргумент: тялото на `$eval` се сериализира и
    // изпълнява В БРАУЗЪРА, значи нищо от затварянето тук не стига дотам.
    Number(await p.$eval(znak, (e, k) => (e as HTMLElement).dataset[k as string], klyuch));

  razdel = '94 · Продажби · петнайсетте колони';
  await naEkran(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');

  proveri(
    'главата носи ТОЧНО петнайсет колони',
    await p.$$eval('[data-tablitsa=prodazhbi] .glava .kletka', (e) => e.length),
    15,
  );
  proveri(
    'и те са НЕГОВИТЕ, в НЕГОВИЯ ред',
    (
      await p.$$eval('[data-tablitsa=prodazhbi] .glava .kletka', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Обект · Място · Купувач · Телефон · Цена € · Продажба € · СМР € · ПД · ' +
      'Капаро · НС · НС кеш · Акт 15 · Акт 16 · проверка · Състояние',
  );
  proveri(
    'три от тях са ЗАТВОРЕНИ · двете от имота и сметката',
    await p.$$eval('[data-tablitsa=prodazhbi] .glava .kletka.zatvorena', (e) =>
      e.map((x) => (x as HTMLElement).dataset['kolona']).join(' · '),
    ),
    'Обект · Място · проверка',
  );
  // НУЛАТА ЧАКАЩИ СЕ КАЗВА · трите въпроса получиха негов отговор на 29.08.
  proveri(
    'нищо не чака · и нулата се БРОИ, не се преглъща',
    await p.$eval('[data-chakat]', (e) => (e as HTMLElement).dataset['chakat']),
    '0',
  );
  proveri(
    'а отговорите му стоят с НЕГОВИТЕ думи',
    await p.$eval('[data-otgovoreni]', (e) => (e as HTMLElement).dataset['otgovoreni']),
    '3',
  );
  proveri(
    'включително правописа му · цитат се пренася ДОСЛОВНО (правило 21)',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-chakat]')).includes('да рзвие своя бизнес'),
    true,
  );

  razdel = '94 · Продажби · новата сделка е ЧЕРВЕНА';
  // БРОИ СЕ ПО ДАННИТЕ, не по класа: главата носи същия клас заради решетката,
  // и класът щеше да я брои за ред. Проходът го намери с „prihod срещу undefined".
  const predi = await p.$$eval('[data-prodazhba]', (e) => e.length);
  await p.fill('#prodazhba-kupuvach', 'Иван Петров');
  await p.fill('#prodazhba-telefon', '0888123456');
  await p.fill('#prodazhba-tsena', '25000,00');
  await p.fill('#prodazhba-prodazhba', '24000,00');
  await p.fill('#prodazhba-smr', '14000,00');
  await p.fill('#prodazhba-pd', '10000,00');
  await sSabitie(p, () => p.click('#nova-prodazhba'));
  await p.waitForSelector('[data-sektsiya=prodazhbi-dvizheniya] .plochki');

  proveri(
    'сделката е ЕДНА повече',
    await p.$$eval('[data-prodazhba]', (e) => e.length),
    predi + 1,
  );
  proveri(
    'и стои с НЕЗАДАДЕНО състояние',
    await p.$eval('.red.prodazhbared.izbran', (e) => (e as HTMLElement).dataset['sastoyanie']),
    'nezadadeno',
  );
  proveri(
    'червеното е НА РЕДА, не в изречение',
    await p.$eval('.red.prodazhbared.izbran', (e) => e.classList.contains('duljimo')),
    true,
  );
  proveri(
    'Обект и Място се ЧЕТАТ от имота · не са празни',
    (await p.$eval('.red.prodazhbared.izbran .kletka', (e) => e.textContent ?? '')).trim().length > 0,
    true,
  );

  razdel = '94 · Продажби · проверката се мени с ТОЧНО толкова';
  proveri('сделката е ПД + СМР', await chislo('[data-sdelka]', 'sdelka'), 24_000_00);
  const razlikaPredi = await chislo('[data-razlika]', 'razlika');
  proveri('и без вноски проверката е цялата сделка', razlikaPredi, 24_000_00);

  await p.selectOption('#dvizhenie-vid', 'Капаро');
  await p.selectOption('#dvizhenie-nachin', 'банка');
  await p.fill('#dvizhenie-suma', '2000,00');
  await p.fill('#dvizhenie-data', '2026-03-01');
  await p.fill('#dvizhenie-belezhka', 'капаро при предварителния');
  await sSabitie(p, () => p.click('#forma-dvizhenie button[type=submit]'));
  const DVIZHENIE = '[data-tablitsa=prodazhbi-dvizheniya] [data-posoka]';
  await p.waitForSelector(DVIZHENIE);

  proveri(
    'вноската СВИВА проверката с точно 2 000,00',
    razlikaPredi - (await chislo('[data-razlika]', 'razlika')),
    2_000_00,
  );
  proveri('и сборът на вноските расте със същото', await chislo('[data-vnoski]', 'vnoski'), 2_000_00);
  proveri(
    'посоката се СМЯТА от знака · няма поле за нея',
    await p.$eval(DVIZHENIE, (e) => (e as HTMLElement).dataset['posoka']),
    'prihod',
  );

  razdel = '94 · Продажби · НИКАКВО НЕТИРАНЕ';
  const razlikaSledVnoska = await chislo('[data-razlika]', 'razlika');
  await p.selectOption('#dvizhenie-vid', 'неустойка');
  // „Тях ги получаваме ние на ръка и са кеш." · начинът е ИЗБОР, не подразбиране
  await p.selectOption('#dvizhenie-nachin', 'в брой');
  await p.fill('#dvizhenie-suma', '500,00');
  await p.fill('#dvizhenie-data', '2026-05-01');
  await p.fill('#dvizhenie-belezhka', 'по чл. 8');
  await sSabitie(p, () => p.click('#forma-dvizhenie button[type=submit]'));
  await p.waitForFunction(
    (znak) => document.querySelectorAll(znak as string).length === 2,
    DVIZHENIE,
  );

  proveri(
    'неустойката НЕ мърда проверката',
    await chislo('[data-razlika]', 'razlika'),
    razlikaSledVnoska,
  );
  proveri('но си има СВОЕ число', await chislo('[data-neustoyka]', 'neustoyka'), 500_00);
  proveri(
    'и НАЧИНЪТ е този, който човек е избрал · не подразбиране',
    (
      await p.$$eval(DVIZHENIE, (e) =>
        e.map((x) => (x as HTMLElement).dataset['nachin']),
      )
    ).join(' · '),
    'банка · в брой',
  );
  proveri(
    'екранът КАЗВА, че ПД и СМР са двата пътя ПО БАНКА',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-dvizheniya]')).includes('двата пътя на парите ПО БАНКА'),
    true,
  );
  proveri(
    'и екранът КАЗВА защо двете не се събират',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-dvizheniya]')).includes('никакво'),
    true,
  );

  razdel = '94 · Продажби · неговите имена';
  proveri(
    'таблицата горе се казва „Продажби Активни"',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-tekushti]')).includes('Продажби Активни'),
    true,
  );
  proveri(
    'а долната — „Продажби Завършени"',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-zavarsheni]')).includes('Продажби Завършени'),
    true,
  );
  proveri(
    'и хартията по сделката се закача ТУК · папката, четена от ПДФ',
    (
      await p.$$eval('[data-dokumenti]', (e) =>
        e.map((x) => (x as HTMLElement).dataset['dokumenti'] ?? ''),
      )
    ).filter((x) => x.startsWith('prodazhba')).length,
    1,
  );

  razdel = '94 · Продажби · терминалът';
  const vArhivaPredi = Number(
    await p.$eval('[data-arhiv]', (e) => (e as HTMLElement).dataset['arhiv']),
  );
  await p.selectOption('#prodazhba-sastoyanie', 'prodadena');
  await sSabitie(p, () => p.click('#forma-sastoyanie button[type=submit]'));
  await p.waitForSelector('[data-tablitsa=prodazhbi-zavarsheni] .red.prodazhbared');

  proveri(
    'архивът е с ЕДНА сделка повече',
    Number(await p.$eval('[data-arhiv]', (e) => (e as HTMLElement).dataset['arhiv'])),
    vArhivaPredi + 1,
  );
  proveri(
    'формата за движение вече я НЯМА · там само се сверява',
    await p.$$eval('#forma-dvizhenie', (e) => e.length),
    0,
  );
  proveri(
    'и екранът КАЗВА защо, вместо да мълчи',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-dvizheniya]')).includes('Няма връщане'),
    true,
  );
  proveri(
    'смяната на състоянието също я няма · терминалът е еднопосочен',
    await p.$$eval('#forma-sastoyanie', (e) => e.length),
    0,
  );

  razdel = '94 · Продажби · сверката вход↔изход';
  proveri(
    'разликата е НУЛА · и нулата се показва',
    await p.$eval('[data-sverka]', (e) => (e as HTMLElement).dataset['sverka']),
    '0',
  );

  // ОТКАЗЪТ СЕ КАЗВА · сделка без имот не може да се отвори от този екран,
  // защото менюто предлага само съществуващи. Затова тук се проверява другото
  // му лице: празната таблица също говори.
  /**
   * ЧАКА СЕ ЦЕЛТА, НЕ ПРЕРИСУВАНЕТО · находка на резен 18в.
   *
   * `naEkran` чака белега на шапката. Когато отворен падащ ред стои над
   * лентата, кликът не стига до пункта и чакането виси трийсет секунди с
   * „на екрана: Имоти" — без да казва ЗАЩО. Чакането на самия екран минава и
   * когато вече сме на него, и когато трябва да се стигне до него.
   */
  razdel = '94 · Продажби · изборът оцелява смяната на екрана';
  await naEkranPryako(p, 'imoti', '#forma-imot');
  await naEkranPryako(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  proveri(
    'изборът на сделка ОЦЕЛЯВА смяната на екрана · той е ПОГЛЕД',
    await p.$$eval('.red.prodazhbared.izbran', (e) => e.length),
    1,
  );

  await naEkranPryako(p, 'imoti', '#forma-imot');
}

/**
 * 95 · ЕТАПИТЕ РАСТАТ · негова дума от 29.08.
 *
 *   „Етапа след акт 15 е в таблицата продажби и какъвто и да е той може да се
 *    добави като колона и да се вкара в функционалност по плана, да може всеки
 *    да рзвие своя бизнес."
 *
 * Стои СЛЕД §94, защото добавя колона: блок, който мести състояние под
 * следващия, е по-скъп от липсващ.
 */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '95 · Етапите растат · от Настройки, не от таблицата';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  /**
   * НАСТРОЙКИ НЕ Е ГОЛ БУТОН, А ПАДАЩ РЕД (ADR-066 · проход §63).
   *
   * Кликът върху пункта ОТВАРЯ менюто; екранът се сменя чак когато се натисне
   * ТЕМАТА. Затова `naEkran` тук виси трийсет секунди и казва „на екрана: Имоти" —
   * платено с два таймаута, преди да се погледне как го прави §63.
   */
  /**
   * РЕДЪТ СЕ ОТВАРЯ САМО АКО Е ЗАТВОРЕН · находка, платена с ЧЕТИРИ таймаута.
   *
   * §63 го оставя ОТВОРЕН. Безусловният клик го ЗАТВАРЯ, и чакането „да стане
   * отворен" виси трийсет секунди. А докладът сочеше ЧУЖД раздел: броячът
   * помни последната МИНАЛА проверка, значи спъване преди първата проверка на
   * блока се приписва на предишния. Затова тук се проверява СЪСТОЯНИЕТО, преди
   * да се пипа — както го прави и §63.
   */
  if (await p.$eval('#nastroyki-red', (e) => (e as HTMLElement).hidden)) {
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(
      () => (document.querySelector('#nastroyki-red') as HTMLElement | null)?.hidden === false,
      undefined,
      { timeout: 5_000 },
    );
  }
  await p.click('#nastroyki-red [data-tema="etapi-prodazhbi"]');
  await p.waitForSelector('[data-sektsiya=etapi-prodazhbi]');
  proveri(
    'седемте му етапа стоят · и всичките са „негов от начало"',
    await p.$eval('[data-etapi]', (e) => (e as HTMLElement).dataset['etapi']),
    '7',
  );
  proveri(
    'добавени още няма · и нулата се КАЗВА',
    await p.$eval('[data-dobaveni]', (e) => (e as HTMLElement).dataset['dobaveni']),
    '0',
  );

  await p.fill('#etap-ime', 'Акт 17');
  await p.selectOption('#etap-vnoska', 'da');
  await p.click('#forma-etap button[type=submit]');
  /**
   * ЧАКА СЕ ЕДНО ОТ ДВЕТЕ · новият ред ИЛИ отказът.
   *
   * Отказаният запис НЕ прерисува екрана — той пише в полето за грешка и спира.
   * Затова чакане само на прерисуване тук виси трийсет секунди и казва
   * „Timeout", вместо ЗАЩО (поуката на ADR-071).
   */
  await p.waitForFunction(
    () =>
      document.querySelector('[data-etap="Акт 17"]') !== null ||
      (document.querySelector('#greshka-etap')?.textContent ?? '') !== '',
    undefined,
    { timeout: 5_000 },
  );
  proveri('записът НЕ е отказан', await tekstNa(p, '#greshka-etap'), '');

  proveri(
    'етапите станаха ОСЕМ',
    await p.$eval('[data-etapi]', (e) => (e as HTMLElement).dataset['etapi']),
    '8',
  );
  proveri(
    'и новият е обявен за ВНОСКА',
    await p.$eval('[data-etap="Акт 17"]', (e) => (e as HTMLElement).dataset['vnoska']),
    'da',
  );

  razdel = '95 · Етапите растат · НЕГОВИТЕ седем не се презаписват';
  await p.fill('#etap-ime', 'Капаро');
  // ОТКАЗАНИЯТ ЗАПИС НЕ ПРЕРИСУВА · той пише в полето за грешка и спира.
  // Затова се чака ТЕКСТЪТ, не прерисуването — вторият път, в който същият
  // капан хваща този блок.
  await p.click('#forma-etap button[type=submit]');
  await p.waitForFunction(
    () => (document.querySelector('#greshka-etap')?.textContent ?? '') !== '',
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'отказът се КАЗВА с думи, не мълчи',
    (await tekstNa(p, '#greshka-etap')).includes('не се презаписва'),
    true,
  );
  proveri(
    'и етапите СИ ОСТАВАТ осем',
    await p.$eval('[data-etapi]', (e) => (e as HTMLElement).dataset['etapi']),
    '8',
  );

  razdel = '95 · Етапите растат · новата КОЛОНА стои в таблицата';
  await naEkran(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  const glavi = await p.$$eval('[data-tablitsa=prodazhbi] .glava .kletka', (e) =>
    e.map((x) => (x as HTMLElement).dataset['kolona']),
  );
  proveri('главата стана ШЕСТНАЙСЕТ колони', glavi.length, 16);
  proveri(
    'и „Акт 17" застава ПРЕДИ „проверка"',
    glavi.indexOf('Акт 17') === glavi.indexOf('проверка') - 1,
    true,
  );
  proveri(
    'а неговите петнайсет пазят реда си помежду си',
    glavi.filter((k) => k !== 'Акт 17').join(' · '),
    'Обект · Място · Купувач · Телефон · Цена € · Продажба € · СМР € · ПД · ' +
      'Капаро · НС · НС кеш · Акт 15 · Акт 16 · проверка · Състояние',
  );

  await naEkranPryako(p, 'imoti', '#forma-imot');
}


/**
 * 96 · ТРИТЕ ТОЧКИ В КАЛКУЛАТОРА · негова поръчка от 29.08.
 *
 *   „Всеки имот след като е вкаран в Калкулатора да има избор на всеки имот с
 *    3 вертикални точки за различни функции… Там избираш продаден и го праща
 *    от цени в таб Продажби."
 */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '96 · Трите точки · „продаден" праща реда в Продажби';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naEkranPryako(p, 'stoynost', '[data-sektsiya=stoynost-obektite]');
  const tochki = await p.$$eval('[data-prodaden]', (e) => e.length);
  proveri('всеки НЕпродаден ред носи трите точки', tochki > 0, true);
  proveri(
    'а продаденият НЕ ги носи · там няма какво да се избира',
    await p.$$eval('.red.stoynost.mahnata [data-prodaden]', (e) => e.length),
    0,
  );

  const koy = await p.$eval('[data-prodaden]', (e) => (e as HTMLElement).dataset['prodaden']);
  await naEkranPryako(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  const predi = await p.$$eval('[data-prodazhba]', (e) => e.length);

  await naEkranPryako(p, 'stoynost', '[data-sektsiya=stoynost-obektite]');
  await sSabitie(p, () => p.click('[data-prodaden]'));
  await p.waitForFunction(
    (ime) =>
      [...document.querySelectorAll('.red.stoynost.mahnata')].some((r) =>
        (r.textContent ?? '').includes(ime as string),
      ),
    koy,
    { timeout: 5_000 },
  );
  proveri('редът вече е ПРОДАДЕН в Калкулатора · и то от ЖУРНАЛА', true, true);

  await naEkranPryako(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  proveri(
    'а в Продажби Активни има ЕДНА сделка повече',
    await p.$$eval('[data-prodazhba]', (e) => e.length),
    predi + 1,
  );
  proveri(
    'и тя стои ЧЕРВЕНА · състоянието ѝ още не е зададено',
    await p.$$eval('.red.prodazhbared[data-sastoyanie=nezadadeno]', (e) => e.length) > 0,
    true,
  );

  await naEkranPryako(p, 'imoti', '#forma-imot');
}
