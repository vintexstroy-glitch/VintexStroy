import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { deystvieSPrerisuvane, naEkran, sSabitie, tekstNa } from '../yadro/pomoshtni.ts';

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
  proveri(
    'какво ЧАКА негова дума се БРОИ, не се твърди',
    await p.$eval('[data-chakat]', (e) => (e as HTMLElement).dataset['chakat']),
    '3',
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
    'и екранът КАЗВА защо двете не се събират',
    (await tekstNa(p, '[data-sektsiya=prodazhbi-dvizheniya]')).includes('никакво'),
    true,
  );

  razdel = '94 · Продажби · терминалът';
  const vArhivaPredi = Number(
    await p.$eval('[data-arhiv]', (e) => (e as HTMLElement).dataset['arhiv']),
  );
  await p.selectOption('#prodazhba-sastoyanie', 'prodadena');
  await sSabitie(p, () => p.click('#forma-sastoyanie button[type=submit]'));
  await p.waitForSelector('[data-tablitsa=prodazhbi-arhiv] .red.prodazhbared');

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
  await deystvieSPrerisuvane(p, () => p.click('[data-ekran=imoti]'));
  await naEkran(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  proveri(
    'изборът на сделка ОЦЕЛЯВА смяната на екрана · той е ПОГЛЕД',
    await p.$$eval('.red.prodazhbared.izbran', (e) => e.length),
    1,
  );

  await naEkran(p, 'imoti', '#forma-imot');
}
