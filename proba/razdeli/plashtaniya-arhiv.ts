import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, naEkran } from '../yadro/pomoshtni.ts';

/**
 * 102 · ПЛАЩАНИЯ АРХИВ · седмицата в три листа (резен 22 · ADR-082).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · екранът стои в лентата СЛЕД Продажби — „сложен след Продажби Архив";
 *   · таблицата носи ТРИНАЙСЕТТЕ му колони, в неговия ред;
 *   · заплатата и фактурата пълнят РАЗЛИЧНИ клетки, а празната е тире;
 *   · сверката показва РАЗЛИКА, дори когато е нула;
 *   · свалянето дава ЕДИН файл и НУЛА събития — целият екран е огледало.
 *
 * Разчита на §99, който вече е записал заплата на 26.08.2026 (седмица
 * 2026-W35) за 120,00 € × 5 дни. Редът на блоковете е ЧАСТ ОТ ДОГОВОРА им.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '102 · Плащания Архив · седмицата в три листа';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ── МЯСТОТО В ЛЕНТАТА ────────────────────────────────────────────────────
  const redut = await p.$$eval('[data-ekran]', (e) =>
    e.map((x) => (x as HTMLElement).dataset['ekran'] ?? ''),
  );
  proveri(
    'екранът стои в лентата ВЕДНАГА след Продажби · „сложен след Продажби Архив"',
    redut[redut.indexOf('prodazhbi') + 1],
    'plashtaniya',
  );

  await naEkran(p, 'plashtaniya', '[data-sektsiya=plashtaniya-arhiv]');

  proveri(
    'главата носи ТРИНАЙСЕТТЕ колони',
    await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .kletka', (e) => e.length),
    13,
  );
  proveri(
    'и в НЕГОВИЯ ред · наредба, не подредба при рисуване',
    (
      await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .kletka', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Дата · Място · Обект · Страна · Вид · Начин · Сметка · Бележка · Заплата · Дни · ' +
      'Фактура № · Сверка · Сума €',
  );
  proveri(
    'СМЕТНАТИТЕ четири колони са затворени · не се редактират от никого',
    (
      await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .kletka.zatvorena', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Вид · Сметка · Сверка · Сума €',
  );

  // ── СЕДМИЦАТА НА ЗАПЛАТАТА ───────────────────────────────────────────────
  await p.selectOption('#plashtaniya-sedmitsa', '2026-W35');
  await p.waitForSelector('[data-sektsiya=plashtaniya-arhiv][data-sedmitsa="2026-W35"]');

  proveri(
    'заплатата от §99 е тук · 120,00 × 5 дни',
    await p.$eval('[data-plashtane][data-vid=zaplata]', (e) =>
      Number((e as HTMLElement).dataset['suma']),
    ),
    600_00,
  );

  const kletki = await p.$$eval('[data-plashtane][data-vid=zaplata] .kletka', (e) =>
    e.map((x) => (x.textContent ?? '').trim()),
  );
  // Индексите са от НЕГОВИЯ ред: 8 · Заплата, 9 · Дни, 10 · Фактура №.
  proveri('и пълни „Дни" · това е нейната клетка', kletki[9], '5');
  proveri('а „Фактура №" ѝ е ТИРЕ · празното е честно, не нула', kletki[10], '—');
  proveri('„Сверка" казва къде е стигнала', (kletki[11] ?? '').length > 0, true);

  // ── СВЕРКАТА ─────────────────────────────────────────────────────────────
  proveri(
    'сверката показва РАЗЛИКА · и нулата се записва',
    await p.$eval('[data-sektsiya=plashtaniya-sverka] [data-razlika]', (e) =>
      Number((e as HTMLElement).dataset['razlika']),
    ),
    0,
  );
  proveri(
    'и КАЗВА, че затваря',
    await p.$eval('[data-sektsiya=plashtaniya-sverka] [data-nared]', (e) =>
      (e as HTMLElement).dataset['nared'],
    ),
    'da',
  );

  // ── СВАЛЯНЕТО · ЕДИН файл, НУЛА събития ──────────────────────────────────
  const predi = await broySabitiya(p);
  const [fayl] = await Promise.all([
    p.waitForEvent('download'),
    p.click('#plashtaniya-svali'),
  ]);
  proveri(
    'името носи седмицата · и е на ЛАТИНИЦА, защото кирилицата не оцелява',
    fayl.suggestedFilename(),
    'PLASHTANIYA-2026-W35.xlsx',
  );
  proveri('свалянето НЕ пише нищо в Журнала · екранът е огледало', await broySabitiya(p), predi);
}
