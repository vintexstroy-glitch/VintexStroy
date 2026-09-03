import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naPodtabNa, broySabitiya, naEkran, sSabitie, tekstNa } from '../yadro/pomoshtni.ts';

/**
 * 103 · ИЗХОДЪТ НА СДЕЛКАТА · Приходи и Вземания (резен 23 · ADR-083).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · вноската се появява в Приходи, „директно с датат" — по СВОЯ месец;
 *   · неустойката НЕ влиза с нея — „никакво нетиране";
 *   · ВЗЕМАНИЯ показва втора съставка с ЧИСЛО, не закована нула;
 *   · капиталовата сверка по два пътя пак затваря на нула;
 *   · и границата на ДДС се КАЗВА, вместо да се начисли тихо.
 *
 * Разчита на §94, което вече е записало сделка 24 000,00 (ПД 10 000 + СМР
 * 14 000) с капаро 2 000,00 на 01.03.2026 и неустойка 500,00 на 01.05.2026.
 * Редът на блоковете е ЧАСТ ОТ ДОГОВОРА им.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '103 · Продажбата стига до Приходи и Вземания';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtabNa(p, 'smetki', 'balans', '[data-sektsiya=smetki-smetki]');

  // ── МЕСЕЦЪТ НА ВНОСКАТА ──────────────────────────────────────────────────
  await p.fill('#smetki-period', '2026-03');
  await p.click('#forma-period button[type=submit]');
  await p.waitForFunction(
    () =>
      (document.querySelector('[data-sektsiya=smetki-smetki] span')?.textContent ?? '').includes(
        '2026-03',
      ),
    undefined,
    { timeout: 5_000 },
  );

  proveri(
    'потокът „Продажби" стои от ПРИХОДНАТА страна',
    await p.$eval('[data-potok=prodazhbi] .znachka', (e) => (e.textContent ?? '').trim()),
    'приход',
  );
  proveri(
    'и носи вноската от МАРТ · „директно с датат"',
    await p.$eval('[data-potok=prodazhbi] .suma', (e) => Number((e as HTMLElement).dataset['st'])),
    2_000_00,
  );

  // ── МАЙ · НЕУСТОЙКАТА НЕ Е ВНОСКА ────────────────────────────────────────
  await p.fill('#smetki-period', '2026-05');
  await p.click('#forma-period button[type=submit]');
  await p.waitForFunction(
    () =>
      (document.querySelector('[data-sektsiya=smetki-smetki] span')?.textContent ?? '').includes(
        '2026-05',
      ),
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'неустойката от МАЙ не влиза в потока · „никакво нетиране"',
    await p.$eval('[data-potok=prodazhbi] .suma', (e) => Number((e as HTMLElement).dataset['st'])),
    0,
  );

  // ── ГРАНИЦАТА НА ДДС СЕ КАЗВА ────────────────────────────────────────────
  proveri(
    'екранът КАЗВА защо вноската не влиза в ДДС-основата',
    (await tekstNa(p, '[data-sektsiya=smetki-smetki]')).includes('чл. 45'),
    true,
  );
  proveri(
    'и БРОИ какво чака · три въпроса, не изречение',
    await p.$eval('[data-chaka-dds]', (e) => (e as HTMLElement).dataset['chakaDds']),
    '3',
  );

  // ── ВЗЕМАНИЯТА ───────────────────────────────────────────────────────────
  //
  // Сделката от §94 е ПРОДАДЕНА, тоест в архива — и точно затова НЕ дължи
  // („след нотариалната сделка сделката е приключила и е в архива, дори с
  // неплатени суми по договор"). Затова блокът си прави СВОЯ, текуща сделка:
  // проверка върху архивна щеше да мине с нула и да не докаже нищо.
  // Числото се мери КАТО РАЗЛИКА, не като абсолютна сума: по-ранни раздели
  // вече са оставили свои сделки, и заковано очакване тук щеше да пада всеки
  // път, когато някой добави сделка другаде — тоест да лъже за собствения си
  // предмет. Платено веднага: първата версия чакаше 48 000 и видя 154 000.
  // Полетата с формула са в подтаб „Отчет" (резен 115 · ADR-161).
  await naPodtabNa(p, 'smetki', 'otchet', '[data-pole=vzemaniya]');
  const vzemanePredi = await p.$$eval('[data-pole=vzemaniya] .formula li .suma', (e) =>
    Number((e[1] as HTMLElement | undefined)?.dataset['st'] ?? NaN),
  );

  await naEkran(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
  await p.fill('#prodazhba-kupuvach', 'Георги Тодоров');
  await p.fill('#prodazhba-telefon', '0888555444');
  await p.fill('#prodazhba-tsena', '60000,00');
  await p.fill('#prodazhba-prodazhba', '58000,00');
  await p.fill('#prodazhba-smr', '4000,00');
  await p.fill('#prodazhba-pd', '50000,00');
  await sSabitie(p, () => p.click('#nova-prodazhba'));
  await p.waitForSelector('#forma-dvizhenie');
  await p.selectOption('#dvizhenie-vid', 'Капаро');
  await p.selectOption('#dvizhenie-nachin', 'банка');
  await p.fill('#dvizhenie-suma', '6000,00');
  await p.fill('#dvizhenie-data', '2026-05-20');
  await p.fill('#dvizhenie-belezhka', 'капаро');
  await sSabitie(p, () => p.click('#forma-dvizhenie button[type=submit]'));

  await naPodtabNa(p, 'smetki', 'balans', '[data-sektsiya=smetki-smetki]');
  await p.fill('#smetki-period', '2026-05');
  await p.click('#forma-period button[type=submit]');
  await p.waitForFunction(
    () =>
      Number(
        (
          document.querySelector('[data-potok=prodazhbi] .suma') as HTMLElement | null
        )?.dataset['st'] ?? '0',
      ) > 0,
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'новата вноска от МАЙ влиза в потока · неустойката до нея — не',
    await p.$eval('[data-potok=prodazhbi] .suma', (e) => Number((e as HTMLElement).dataset['st'])),
    6_000_00,
  );

  const gledanePredi = await broySabitiya(p);
  await naPodtabNa(p, 'smetki', 'otchet', '[data-pole=vzemaniya]');
  const vtoraSastavka = await p.$$eval('[data-pole=vzemaniya] .formula li', (e) =>
    e.map((x) => [
      (x.querySelector('.ime')?.textContent ?? '').trim(),
      (x.querySelector('.otkade')?.textContent ?? '').trim(),
      (x.querySelector('.suma')?.textContent ?? '').trim(),
    ]),
  );
  proveri('ВЗЕМАНИЯ носи ДВЕ съставки', vtoraSastavka.length, 2);
  proveri(
    'и втората е продажбите · вече не „таблица Архив Продажби" без число',
    vtoraSastavka[1]?.[0],
    'От продажби · до Акт 16',
  );
  proveri(
    'която чете от ТАБЛИЦАТА, а не от закована нула',
    (vtoraSastavka[1]?.[1] ?? '').includes('таблица Продажби'),
    true,
  );
  const vzemaneSled = await p.$$eval('[data-pole=vzemaniya] .formula li .suma', (e) =>
    Number((e[1] as HTMLElement | undefined)?.dataset['st'] ?? NaN),
  );
  proveri(
    'и порасна с ТОЧНО неплатеното · сделка 54 000 минус капаро 6 000',
    vzemaneSled - vzemanePredi,
    48_000_00,
  );

  // ── СВЕРКАТА ПО ДВА ПЪТЯ ─────────────────────────────────────────────────
  proveri(
    'Капиталът по два пътя пак затваря · продажбата мина и по двата',
    await p.$$eval('.otchet-sverka .suma', (e) =>
      Number((e[2] as HTMLElement | undefined)?.dataset['st'] ?? NaN),
    ),
    0,
  );

  proveri('и НИЩО от гледането не влезе в Журнала', await broySabitiya(p), gledanePredi);
}
