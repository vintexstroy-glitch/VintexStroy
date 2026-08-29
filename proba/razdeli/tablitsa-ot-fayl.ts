import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, naEkran, sSabitie } from '../yadro/pomoshtni.ts';

/**
 * 101 · ТАБЛИЦА ОТ ФАЙЛ · неговият експеримент с Фактури (резен 21 · ADR-081).
 *
 * Какво пази този блок · целият път, от байтовете до записа:
 *
 *   · файлът се ЧЕТЕ, не се качва — и екранът го казва;
 *   · предложението показва колоните, видовете и КОЯ формула е дошла;
 *   · непреведената колона казва ЗАЩО, до самата себе си;
 *   · сверката на сметките показва разлика НУЛА, и това е числото, което
 *     решава дали формулата изобщо се копира;
 *   · потвърждението ражда ЕДНО събитие, не повече.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '101 · Таблица от файл · с формулите, ако се превеждат';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naEkran(p, 'smetki', '[data-sektsiya=tablitsa-ot-fayl]');

  proveri(
    'преди четене няма предложение · нищо не се измисля',
    await p.$$eval('[data-predlozhenie]', (e) => e.length),
    0,
  );

  const predi = await broySabitiya(p);
  await p.setInputFiles(
    '#fayl-tablitsa',
    new URL('../../primeri/fakturi-s-formuli.xlsx', import.meta.url).pathname,
  );
  await p.waitForSelector('[data-predlozhenie]', { timeout: 5_000 });

  proveri(
    'ЧЕТЕНЕТО не пише нищо в Журнала · човекът още не е потвърдил',
    await broySabitiya(p),
    predi,
  );
  proveri(
    'предложението носи ПЕТТЕ колони на файла',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-koloni]', (e) => Number((e as HTMLElement).dataset['koloni'])),
    5,
  );
  // ЕДНА, не три: формулата се пази ПО КОЛОНА, а трите ѝ клетки са една и
  // съща сметка, разтеглена надолу.
  proveri(
    'намерена е ЕДНА формула · колоната „Общо", не трите ѝ клетки',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-formuli]', (e) => Number((e as HTMLElement).dataset['formuli'])),
    1,
  );
  proveri(
    'и тя е КОПИРАНА · сборът се превежда',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-kopirani]', (e) => Number((e as HTMLElement).dataset['kopirani'])),
    1,
  );
  proveri(
    'СВЕРКАТА на сметките показва разлика НУЛА',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-razlika]', (e) => Number((e as HTMLElement).dataset['razlika'])),
    0,
  );

  proveri(
    'колоната „Общо" носи сметка, останалите — не',
    await p.$$eval('[data-tablitsa=ot-fayl] .red.otfaylred[data-formula=da]', (e) => e.length),
    1,
  );
  proveri(
    'видовете се СМЯТАТ от данните · текст, евро, евро, евро, процент',
    (
      await p.$$eval('[data-tablitsa=ot-fayl] .red.otfaylred[data-kolona]', (e) =>
        e.map((x) => x.children[1]?.textContent ?? ''),
      )
    ).join(' · '),
    'текст · евро · евро · евро · процент',
  );

  // ── ПОТВЪРЖДЕНИЕТО · чак сега се пише ───────────────────────────────────
  await p.fill('#nova-tablitsa-ime', 'Фактури от файл');
  await sSabitie(p, () => p.click('#forma-sazday-tablitsa button[type=submit]'));

  proveri(
    'потвърждението ражда ЕДНО събитие',
    await broySabitiya(p),
    predi + 1,
  );
  proveri(
    'и предложението се прибира · то беше поглед, не състояние',
    await p.$$eval('[data-predlozhenie]', (e) => e.length),
    0,
  );
  proveri(
    'екранът казва, че файлът НЕ се качва',
    ((await p.textContent('[data-sektsiya=tablitsa-ot-fayl]')) ?? '').includes(
      'Файлът НЕ се качва тук',
    ),
    true,
  );
}
