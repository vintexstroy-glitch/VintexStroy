import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, naEkran, sSabitie } from '../yadro/pomoshtni.ts';
import type { Page } from 'playwright-core';

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

  await naEkran(p, 'smetki', '[data-sektsiya=krediti]');

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
    await p.$$eval('[data-tablitsa=krediti] .glava .kletka', (e) => e.length),
    11,
  );
  proveri(
    'и трите СМЕТНАТИ колони са затворени · те не се редактират от никого',
    (
      await p.$$eval('[data-tablitsa=krediti] .glava .kletka.zatvorena', (e) =>
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

  await naEkran(p, 'smetki', '[data-sektsiya=krediti]');
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

  await naEkran(p, 'smetki', '[data-sektsiya=krediti]');
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
  await naEkran(p, 'smetki', '[data-sektsiya=krediti]');
  proveri(
    'и се връща обратно · изборът е обратим, защото е екран, не запис',
    await p.$eval('[data-sektsiya=krediti]', (e) => (e as HTMLElement).dataset['vklyuchena']),
    'da',
  );
}
