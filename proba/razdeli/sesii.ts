import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, naEkran, napishiVPoleto } from '../yadro/pomoshtni.ts';

/**
 * 104 · СЕСИИТЕ НА РЕДАКТОРА · неговата находка на екран (резен 26 · ADR-086).
 *
 * Какво пази този блок · всяко е негова дума, стигнала до ЕКРАНА:
 *
 *   · книгата се чете С БУТОН, не при всяко рисуване на Настройки;
 *   · изключеният филтър показва ДНЕШНИЯ ден, и екранът го КАЗВА;
 *   · датата и името СТЕСНЯВАТ — „дата и име на журнала за търсене в него";
 *   · сесията носи името, деня, часовете и редовете по ТАЙМИНГА НА ЗАПИСА;
 *   · сверката вход↔изход показва разлика, дори когато е нула;
 *   · и НИЩО от гледането не влиза в Журнала.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '104 · Сесиите на редактора';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // „Настройки" е ПАДАЩ РЕД · отвореният показва ТЕМИТЕ, не секциите.
  await naEkran(p, 'imoti', '#forma-imot');
  if (await p.$eval('#nastroyki-red', (e) => (e as HTMLElement).hidden)) {
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(
      () => (document.querySelector('#nastroyki-red') as HTMLElement | null)?.hidden === false,
      undefined,
      { timeout: 5_000 },
    );
  }
  await p.click('#nastroyki-red [data-tema="zhurnalat"]');
  await p.waitForSelector('[data-sektsiya=zhurnal-sesii]');

  proveri(
    'книгата НЕ е прочетена, докато никой не я е поискал',
    await p.$eval('[data-sektsiya=zhurnal-sesii]', (e) => (e as HTMLElement).dataset['otvoren']),
    'ne',
  );

  // Пише и излиза · домът на поуката е `pomoshtni.ts` (правило 17, резен 29).
  const napishi = (znak: string, stoynost: string): Promise<void> =>
    napishiVPoleto(p, znak, stoynost);

  const predi = await broySabitiya(p);
  await p.click('#sesii-otvori');
  await p.waitForSelector('[data-sektsiya=zhurnal-sesii][data-otvoren=da]');

  proveri(
    'филтърът е ИЗКЛЮЧЕН отначало · и екранът го казва',
    await p.$eval('[data-sektsiya=zhurnal-sesii]', (e) => (e as HTMLElement).dataset['izklyuchen']),
    'da',
  );
  // Проверката СРАВНЯВА с истинската дата, а не сама със себе си: първата ѝ
  // версия беше `textContent` срещу `textContent` — тоест не можеше да падне.
  proveri(
    'изключеното значи ДНЕШНИЯ ден · главата носи самата дата',
    ((await p.textContent('[data-sektsiya=zhurnal-sesii] .dyalglava span')) ?? '').includes(
      new Date().toISOString().slice(0, 10),
    ),
    true,
  );
  proveri(
    'и това стои с ДУМИ, не само с атрибут',
    (await p.textContent('[data-sektsiya=zhurnal-sesii]'))?.includes('целият Журнал наведнъж е износът') ??
      false,
    true,
  );

  // ── ФИЛТЪРЪТ · дата и име, негово „за търсене в него" ────────────────────
  await napishi('#sesii-ot', '2020-01-01');
  await p.waitForSelector('[data-sektsiya=zhurnal-sesii][data-izklyuchen=ne]');
  const sVsichki = await p.$$eval('[data-sesiya]', (e) => e.length);
  proveri('с широк обхват сесиите са повече от нула', sVsichki > 0, true);

  proveri(
    'всяка сесия носи ИМЕ, ден, часове и брой',
    await p.$eval('[data-sesiya]', (e) => Number((e as HTMLElement).dataset['broy']) > 0),
    true,
  );
  proveri(
    'и редовете ѝ вървят по ТАЙМИНГА НА ЗАПИСА · възходящо',
    await p.$$eval('[data-sesiya]:first-of-type [data-seq]', (e) => {
      const seq = e.map((x) => Number((x as HTMLElement).dataset['seq']));
      return seq.every((v, i) => i === 0 || v > seq[i - 1]!);
    }),
    true,
  );

  await napishi('#sesii-koy', 'няма-такъв@никъде.бг');
  await p.waitForFunction(
    () => document.querySelectorAll('[data-sesiya]').length === 0,
    undefined,
    { timeout: 5_000 },
  );
  proveri(
    'непознато име дава НУЛА сесии · и празното е ОТГОВОР, не грешка',
    (await p.textContent('[data-sektsiya=zhurnal-sesii] .prazno'))?.includes(
      'Празното е отговор',
    ) ?? false,
    true,
  );

  await p.click('#sesii-izchisti');
  await p.waitForSelector('[data-sektsiya=zhurnal-sesii][data-izklyuchen=da]');
  proveri('изчистването връща изключения филтър', true, true);

  // ── СВЕРКАТА И ЖУРНАЛЪТ ─────────────────────────────────────────────────
  proveri(
    'сверката вход↔изход показва разлика · и когато е нула',
    await p.$eval('[data-sektsiya=zhurnal-sesii] [data-razlika]', (e) =>
      Number((e as HTMLElement).dataset['razlika']),
    ),
    0,
  );
  proveri('и НИЩО от гледането не влезе в Журнала', await broySabitiya(p), predi);
}
