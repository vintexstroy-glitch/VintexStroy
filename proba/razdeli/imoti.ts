import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OTKRIVASHTOTO, broySabitiya, deystvieSPrerisuvane, dobaviImot, dobaviNaem, naEkran, plochka, redove, sSabitie, tekstNa } from '../yadro/pomoshtni.ts';

/** 2 · имоти | 3 · дробни стотинки */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '2 · имоти';
    await dobaviImot(p, 'Малинова', 'АП. № 1', '72,40');
    // Площта е ПЛОЩ, не пари (находка на сверката): паричният форматер
    // изписваше „72,40 € м²" — знак за евро върху квадратни метри.
    proveri('площта се пише без знак за валута',
      (await p.$$eval('.red.imot', (r) => r.map((x) => (x as any).innerText))).some(
        (t) => t.includes('72,40 м²') && !t.includes('€ м²')), true);
    await dobaviImot(p, 'Дианабад', 'ОФИС № 3', '');
    proveri('два имота', await broySabitiya(p), 2 + OTKRIVASHTOTO);

    // Наемателят нарочно носи опасен текст — минава ли през екранирането.
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: 'Домакинство', suma: '500,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: '<img src=x onerror=alert(1)>', suma: '300,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Стройпласт ЕООД', suma: '1200,00', sektor: 'naem-targovski', padezh: '31' });
    proveri('пет събития', await broySabitiya(p), 5 + OTKRIVASHTOTO);

    proveri('единици', await plochka(p, 'Единици'), '2');
    proveri('отдадени', await plochka(p, 'Отдадени'), '2 / 2');
    proveri('месечен наем', await plochka(p, 'Месечен наем'), '2 000,00 €');

    const imoti = await redove(p, '.red.imot');
    const malinova = imoti.find((r) => r[0]?.startsWith('Малинова'));
    proveri('имот с два наема · сбор', malinova?.[3], '800,00 €');
    proveri('имот с два наема · знак', malinova?.[4], '2 наема');
    proveri(
      'опасният текст не се изпълни, а се показва',
      (await p.content()).includes('&lt;img src=x onerror=alert(1)&gt;'),
      true,
    );

    // ══ 3 · дробни стотинки на входа ═════════════════════════════════════
    razdel = '3 · дробни стотинки';
    for (const losha of ['1150,555', '12.34.56', 'абв']) {
      await p.fill('#naem-naemetel', 'опит');
      await p.fill('#naem-suma', losha);
      await p.click('#forma-naem button[type=submit]');
      await p.waitForFunction(() => document.querySelector('#greshka-naem')?.textContent !== '');
      proveri(`„${losha}" се отказва`, (await tekstNa(p, '#greshka-naem')).includes('Не е сума'), true);
    }
    proveri('нито един отказан наем не влезе', await broySabitiya(p), 5 + OTKRIVASHTOTO);

    // ══ 4 · начисляване ══════════════════════════════════════════════════
}

/** 11б · поправката */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '11б · поправката';
    await naEkran(p, 'imoti', '#forma-imot');

    // поправка на имот — наемът му НЕ се къса
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Дианабад") [data-popravi-imot]'));
    proveri('формата се напълни със стария адрес', await p.inputValue('#imot-adres'), 'Дианабад');
    await p.fill('#imot-adres', 'Дианабад 4');
    await p.fill('#imot-prichina', 'сбъркан номер');
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('тринайсет събития', await broySabitiya(p), 13 + OTKRIVASHTOTO);
    const sledPopravka = (await redove(p, '.red.imot')).find((x) => (x[0] as any).startsWith('Дианабад'));
    proveri('новият адрес се вижда', sledPopravka?.[0], 'Дианабад 4 ОФИС № 3');
    proveri('наемът не се откачи', sledPopravka?.[1]?.startsWith('Стройпласт'), true);

    // поправка на наем — новата сума важи за напред
    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-popravi-naem]'));
    proveri('формата се напълни със старата сума', await p.inputValue('#naem-suma'), '1200,00');
    await p.fill('#naem-suma', '1300,00');
    await p.fill('#naem-prichina', 'вдигнат наем');
    await sSabitie(p, () => p.click('#forma-naem button[type=submit]'));
    proveri('четиринайсет събития', await broySabitiya(p), 14 + OTKRIVASHTOTO);
    proveri(
      'новата сума в списъка',
      (await redove(p, '.red.naem')).find((x) => (x[0] as any).startsWith('Стройпласт'))?.[3],
      '1 300,00 €',
    );

    // прекратяване
    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Домакинство") [data-prekrati]'));
    await p.fill('#prekrati-kraj', '2026-02-28');
    await p.fill('#prekrati-prichina', 'изнесоха се');
    await sSabitie(p, () => p.click('#forma-prekrati button[type=submit]'));
    proveri('петнайсет събития', await broySabitiya(p), 15 + OTKRIVASHTOTO);
    proveri(
      'наемът е прекратен',
      (await redove(p, '.red.naem')).find((x) => (x[0] as any).startsWith('Домакинство'))?.[4],
      'прекратен 2026-02-28',
    );
    proveri('месечният наем спадна', await plochka(p, 'Месечен наем'), '1 600,00 €');

    // вратарят отказва, докато нещо живо виси
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Малинова") [data-storno-imot]'));
    proveri('сторно на имот с наеми се отказва', (await tekstNa(p, '.vest')).includes('висят'), true);
    proveri('нищо не влезе', await broySabitiya(p), 15 + OTKRIVASHTOTO);

    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-storno-naem]'));
    proveri(
      'сторно на наем с вземания се отказва',
      (await tekstNa(p, '.vest')).includes('начислено вземане'),
      true,
    );
    proveri('пак нищо не влезе', await broySabitiya(p), 15 + OTKRIVASHTOTO);

    // сторно на начисление БЕЗ плащания — минава
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('дължимо преди сторното', await plochka(p, 'Дължимо общо'), '800,00 €');
    await sSabitie(p, () => p.click('.red.vzemane:has-text("Домакинство") [data-storno-vzemane]'));
    proveri('шестнайсет събития', await broySabitiya(p), 16 + OTKRIVASHTOTO);
    proveri('дължимото падна', await plochka(p, 'Дължимо общо'), '300,00 €');

    // ══ 11в · разходите → входящият ДДС ══════════════════════════════════
}

/** 25 · писмото при закъснение */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '25 · писмото при закъснение';
    await naEkran(p, 'imoti', '#forma-imot');
    await dobaviNaem(p, {
      koy: 'Иван Контактен', suma: '250,00',
      sektor: 'naem-zhilishten', padezh: '5',
      telefon: '0888 123 456', imeyl: 'ivan@primer.bg',
    });
    proveri('телефонът и пощата се четат в реда на наема',
      (await p.$$eval('.red.naem', (r) => r.map((x) => (x as any).innerText)))
        .some((t) => t.includes('0888 123 456') && t.includes('ivan@primer.bg')), true);

    // Начисляваме СТАР период — падежът минава и вземането става просрочено.
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));

    const redSPismo = '.red.vzemane:has-text("Иван Контактен")';
    proveri('просроченият ред носи бутон „Писмо"',
      await p.$$eval(`${redSPismo} [data-pismo]`, (e) => e.length), 1);

    const adres = await p.$eval(`${redSPismo} [data-pismo]`, (e) => e.getAttribute('href'));
    proveri('писмото тръгва към неговата поща',
      (adres as any).startsWith('mailto:ivan%40primer.bg?'), true);
    const chetimo = decodeURIComponent((adres as any));
    proveri('темата носи сумата', chetimo.includes('250,00'), true);
    proveri('тялото носи периода', chetimo.includes('2026-02'), true);
    proveri('и допуска, че вече е платено', chetimo.includes('вече е направено'), true);

    // БЕЗ ИМЕЙЛ НЯМА БУТОН · „Домакинство" е записан преди двете полета.
    proveri('наем без поща не показва празен бутон',
      await p.$$eval('.red.vzemane:has-text("Домакинство") [data-pismo]', (e) => e.length), 0);

    // ══ 27 · удобството · сортиране, търсене, памет, история, меню ═══════
}
