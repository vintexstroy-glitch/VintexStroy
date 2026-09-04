import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naPodtabNa, broySabitiya, deystvieSPrerisuvane, sSabitie } from '../yadro/pomoshtni.ts';

/**
 * 99 · ЗАПЛАТИТЕ · седмицата, кешът и сборът (резен 20 · ADR-080).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · таблицата стои в Сметки, с ПРОЕКТА най-отпред — негова наредба;
 *   · седмичната заплата е СМЕТНАТА и колоната ѝ е ЗАТВОРЕНА;
 *   · сборът на седмицата се мени с всеки нов ред;
 *   · салдото на общия кеш-джоб расте със захранването.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '99 · Заплатите · седмицата и кешът';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=zaplati]');

  proveri(
    'главата носи СЕДЕМ колони, с ПРОЕКТА най-отпред',
    (
      await p.$$eval('[data-tablitsa=zaplati] .glava .glavicha', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Проект · Име · Длъжност · Обект · Дневна ставка · Дни · Седмична заплата',
  );
  proveri(
    'и СМЕТНАТАТА колона е затворена · тя не се редактира от никого',
    (
      await p.$$eval('[data-tablitsa=zaplati] .glava .glavicha.zatvorena', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Седмична заплата',
  );

  // ── КЕШЪТ ────────────────────────────────────────────────────────────────
  const keshPredi = await p.$eval('[data-kesh]', (e) =>
    Number((e as HTMLElement).dataset['kesh']),
  );
  await p.fill('#zahranvane-suma', '2000,00');
  await p.fill('#zahranvane-data', '2026-08-24');
  await p.fill('#zahranvane-belezhka', 'от касата');
  await sSabitie(p, () => p.click('#forma-zahranvane button[type=submit]'));
  await p.waitForFunction(
    (predi) =>
      Number((document.querySelector('[data-kesh]') as HTMLElement | null)?.dataset['kesh'] ?? '0') >
      (predi as number),
    keshPredi,
    { timeout: 5_000 },
  );
  proveri(
    'захранването вдига кеша с ТОЧНО сумата си',
    await p.$eval('[data-kesh]', (e) => Number((e as HTMLElement).dataset['kesh'])),
    keshPredi + 2_000_00,
  );

  // ── ЕДИН РЕД ─────────────────────────────────────────────────────────────
  const redovePredi = await p.$$eval('[data-zaplata]', (e) => e.length);
  await p.fill('#zaplata-ime', 'Иван Петров');
  await p.fill('#zaplata-dlazhnost', 'зидар');
  await p.fill('#zaplata-obekt', 'бл. 3 · ап. 12');
  await p.fill('#zaplata-dnevna', '120,00');
  await p.fill('#zaplata-dni', '5');
  await p.fill('#zaplata-data', '2026-08-26');
  await sSabitie(p, () => p.click('#forma-zaplata button[type=submit]'));
  await p.waitForSelector('[data-zaplata]');

  proveri(
    'редът влезе в таблицата',
    await p.$$eval('[data-zaplata]', (e) => e.length),
    redovePredi + 1,
  );
  proveri(
    'седмичната заплата е СМЕТНАТА · 120,00 × 5',
    await p.$eval('[data-zaplata]', (e) => Number((e as HTMLElement).dataset['sedmichna'])),
    600_00,
  );
  proveri(
    'и седмицата е изведена от ДАТАТА, не въведена',
    await p.$eval('[data-sektsiya=zaplati]', (e) => (e as HTMLElement).dataset['sedmitsa']),
    '2026-W35',
  );
  proveri(
    'сборът на седмицата отговаря на реда',
    await p.$eval('[data-sbor]', (e) => Number((e as HTMLElement).dataset['sbor'])),
    600_00,
  );
}

/**
 * 100 · ПРЕХВЪРЛЯНЕТО · ръчно, ЕДИН разход, следа, и вторият отказ.
 *
 * И най-важното: „Замрази седмицата" затваря ЗАПЛАТИТЕ ѝ, а месечният катинар
 * си остава друг. Двата не се сливат.
 */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '100 · Заплатите · прехвърлянето и двата катинара';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=zaplati]');
  proveri(
    'седмицата още НЕ е прехвърлена · и екранът го казва',
    await p.$eval('[data-prehvarlena]', (e) => (e as HTMLElement).dataset['prehvarlena']),
    'ne',
  );

  // ПРЕХВЪРЛЯНЕТО ражда ДВЕ събития: разхода и следата.
  const predi = await broySabitiya(p);
  await p.click('#prehvarli-zamrazi');
  await p.click('#forma-prehvarlyane button[type=submit]');
  await p.waitForSelector('[data-sleda]', { timeout: 5_000 });

  proveri(
    'ражда ТОЧНО ДВЕ събития · разходът и следата',
    await broySabitiya(p),
    predi + 2,
  );
  proveri(
    'следата казва КОЙ разход е родила',
    (await p.$eval('[data-sleda]', (e) => (e as HTMLElement).dataset['sleda'] ?? '')).startsWith(
      'RZ-ZPL-',
    ),
    true,
  );
  proveri(
    'и формата за прехвърляне вече я НЯМА · второ натискане не съществува',
    await p.$$eval('#forma-prehvarlyane', (e) => e.length),
    0,
  );

  // ЗАМРАЗЕНАТА седмица не приема нов ред · и го КАЗВА с датите ѝ.
  proveri(
    'замразената седмица няма форма за нов ред',
    await p.$$eval('#forma-zaplata', (e) => e.length),
    0,
  );
  proveri(
    'а отказът носи ДАТИТЕ на седмицата, не само номера ѝ',
    (await p.textContent('[data-zamrazena=da]')) ?? '',
    'Седмица 2026-W35 (2026-08-24 – 2026-08-30) е ЗАМРАЗЕНА. Поправка след ' +
      'замразяване минава през сторно, не през нов ред.',
  );

  // РАЗХОДЪТ го има в Разходи · но за СВОЯ месец.
  //
  // Екранът показва избран период, а по-ранни раздели са го местили. Затова
  // тук месецът се ИЗБИРА, вместо да се предполага: първата версия на този
  // блок търсеше разхода в каквото беше останало на екрана и падна с
  // „чакано true · видяно false" — проверка, която мери чужд месец.
  await p.fill('#smetki-period', '2026-08');
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
  proveri(
    'и разходът стои в Разходи за СВОЯ месец · август',
    await p.$$eval('[data-tablitsa=razhodi] .red.razhod', (e) =>
      e.filter((x) => (x.textContent ?? '').includes('Седмица 2026-W35')).length,
    ),
    1,
  );
}
