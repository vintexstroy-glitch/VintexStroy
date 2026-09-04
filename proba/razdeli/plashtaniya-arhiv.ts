import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, naEkran, napishiVPoleto, sSabitie } from '../yadro/pomoshtni.ts';

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
  const redut = await p.$$eval('.navred[data-ekran]', (e) =>
    e.map((x) => (x as HTMLElement).dataset['ekran'] ?? ''),
  );
  proveri(
    'екранът стои в лентата ВЕДНАГА след Продажби · „сложен след Продажби Архив"',
    redut[redut.indexOf('prodazhbi') + 1],
    'plashtaniya',
  );

  await naEkran(p, 'plashtaniya', '[data-sektsiya=plashtaniya-arhiv]');

  proveri(
    'главата носи ЧЕТИРИНАЙСЕТ колони · тринайсетте му плюс Категория',
    await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .glavicha', (e) => e.length),
    14,
  );
  proveri(
    'и в НЕГОВИЯ ред · наредба, не подредба при рисуване',
    (
      await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .glavicha', (e) =>
        e.map((x) => (x as HTMLElement).dataset['kolona']),
      )
    ).join(' · '),
    'Дата · Имот · Обект · Страна · Вид · Начин · Сметка · Бележка · Заплата · Дни · ' +
      'Фактура № · Сверка · Сума € · Категория',
  );
  proveri(
    'СМЕТНАТИТЕ четири колони са затворени · не се редактират от никого',
    (
      await p.$$eval('[data-tablitsa=plashtaniya-arhiv] .glava .glavicha.zatvorena', (e) =>
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

  // ── КАТЕГОРИЯТА · единственото тук, което се ПИШЕ (резен 25 · ADR-085) ────
  proveri(
    'клетката „Категория" е ПОЛЕ, не текст · тя е единствената, която се пише',
    await p.$$eval('[data-plashtane] .kletka-kategoriya', (e) => e.length) > 0,
    true,
  );
  proveri(
    'и менюто ѝ предлага вече писаното · „меню от Описа"',
    await p.$$eval('#spisak-kategorii option', (e) => e.length) > 0,
    true,
  );

  const predKategoriya = await broySabitiya(p);
  // ТОЧНО КАКВОТО ПРАВИ ЧОВЕК: пише в клетката и излиза от нея. „change" идва
  // от НАПУСКАНЕТО — едно събитие на решение, не едно на буква.
  //
  // Пише и излиза · двата по-къси пътя паднаха и двата, а поуката живее на
  // ЕДНО място (`pomoshtni.ts` · napishiVPoleto, правило 17).
  await sSabitie(p, () =>
    napishiVPoleto(p, '[data-plashtane][data-vid=zaplata] .kletka-kategoriya', 'Труд'),
  );
  proveri(
    'задаването ражда ТОЧНО ЕДНО събитие',
    (await broySabitiya(p)) - predKategoriya,
    1,
  );
  proveri(
    'и категорията стои в клетката след прерисуване',
    await p.$eval('[data-plashtane][data-vid=zaplata] .kletka-kategoriya', (e) =>
      (e as HTMLInputElement).value,
    ),
    'Труд',
  );
  proveri(
    'разбивката „По категории" я БРОИ · и некатегоризираното не изчезва',
    await p.$$eval('[data-tablitsa=plashtaniya-kategorii] [data-kategoriya]', (e) =>
      e.map((x) => (x as HTMLElement).dataset['kategoriya']).includes('Труд'),
    ),
    true,
  );

  // ── СВАЛЯНЕТО · ЕДИН файл, НУЛА събития ──────────────────────────────────
  //
  // Броячът се чете ТУК, а не в началото на блока: категорията горе НАРОЧНО
  // пише едно събитие, и стар брояч би приписал него на свалянето.
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
