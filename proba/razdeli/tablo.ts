import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { deystvieSPrerisuvane, naEkran, plochka, tekstNa } from '../yadro/pomoshtni.ts';

/** 15 · таблото */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '15 · таблото';
    await naEkran(p, 'tablo', '.vazmozhnosti');

    // Името вече идва от жетона на Google, не от закован ред (ADR-021).
    proveri('казва кой е влязъл', await plochka(p, 'Влязъл като'), 'Иво');
    proveri('казва през кого', await plochka(p, 'През'), 'Google');
    proveri('казва чие е хранилището', await plochka(p, 'Хранилище'), 'Безплатно');
    proveri('казва ролята', await plochka(p, 'Роля'), 'собственик');
    proveri(
      'никъде не пише „парола" като поле',
      await p.evaluate(() => document.querySelectorAll('input[type=password]').length),
      0,
    );

    // Планът по подразбиране е СТАРТЪПЪТ и носи цялата функционалност.
    proveri(
      'стартъпът е Професионалният в облака',
      (await tekstNa(p, '.red.planred.tuk')).includes('Професионален'),
      true,
    );
    proveri(
      'Личният е описан като САМО един акаунт',
      (await tekstNa(p, '[data-plan-red="lichen"]')).includes('САМО ЕДИН АКАУНТ'),
      true,
    );
    // Таблото на агента (ADR-026) И самото свързване с Клод (ADR-029) са
    // построени — затова етикетът „скоро" СЛЕЗЕ. Надпис „скоро" върху работещ
    // бутон е точно толкова лъжа, колкото бутон върху непостроено.
    proveri(
      'ИИ вече не носи етикет „скоро" — той е построен',
      (await tekstNa(p, '.vazm:has-text("Табло за агент")')).includes('скоро'),
      false,
    );
    proveri(
      'а Таблото казва честно чия е сметката за модела',
      (await p.evaluate(() => document.body.textContent)).includes('сметката за него идва'),
      true,
    );

    // Отметката гаси бутон ВЕДНАГА — не при следващо влизане.
    proveri('архивът е тук преди отметката', await p.$$eval('#arhiv', (b) => b.length), 1);
    await deystvieSPrerisuvane(p, () =>
      p.click('.vazm input[data-vazmozhnost="arhiv-eksel"]'),
    );
    proveri('бутонът „Архив за Ексел" изчезна', await p.$$eval('#arhiv', (b) => b.length), 0);
    proveri(
      'и си личи, че е ИЗКЛЮЧЕНА, а не липсваща',
      (await tekstNa(p, '.vazm:has-text("Сваля архив")')).includes('изключена'),
      true,
    );
    await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="arhiv-eksel"]'));
    proveri('отметката го връща', await p.$$eval('#arhiv', (b) => b.length), 1);

    // Отметката гаси и цял ЕКРАН от лентата.
    proveri('Сметки са в лентата', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 1);
    await deystvieSPrerisuvane(p, () =>
      p.click('.vazm input[data-vazmozhnost="smetki-dds"]'),
    );
    proveri('Сметки паднаха от лентата', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 0);
    await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="smetki-dds"]'));
    proveri('и се връщат', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 1);

    // Основата не се маха — иначе приложението престава да е приложение.
    proveri(
      'отметката на „Записва през Вратата" е заключена',
      await p.$eval('.vazm input[data-vazmozhnost="zapis"]', (i) => (i as any).disabled),
      true,
    );

    // Личен план: ролите не са изключени — тях просто ги НЯМА там.
    await deystvieSPrerisuvane(p, () => p.click('[data-plan="lichen"]'));
    proveri(
      'планът се смени на Личен',
      (await tekstNa(p, '.red.planred.tuk')).includes('Личен'),
      true,
    );
    proveri(
      'ролите не се предлагат в Личния',
      await p.$eval('.vazm input[data-vazmozhnost="roli-za-dostap"]', (i) => (i as any).disabled),
      true,
    );
    proveri(
      'и е казано защо: няма я в този план',
      (await tekstNa(p, '.vazm:has-text("Роля на всеки добавен имейл")')).includes('няма я'),
      true,
    );

    // Изборът преживява презареждане — иначе е настроение, не нагласа.
    await p.reload();
    await p.waitForSelector('.nav');
    await naEkran(p, 'tablo', '.vazmozhnosti');
    proveri(
      'Личният план се помни след презареждане',
      (await tekstNa(p, '.red.planred.tuk')).includes('Личен'),
      true,
    );
    await deystvieSPrerisuvane(p, () => p.click('[data-plan="profesionalen"]'));

    // ══ 16 · ДЖОБЪТ · отваря ли се БЕЗ мрежа ═══════════════════════════════
}

/** 62 · Табовете от Таблото */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '62 · Табовете от Таблото';
    await naEkran(p, 'tablo', '[data-sektsiya=tablo-tabove]');
    proveri('Таблото носи входа към изгледите',
      Boolean(await p.$('[data-sektsiya=tablo-tabove]')), true);
    proveri('и брои ДОБАВЕНИТЕ, не всички',
      Number(await p.$eval('[data-pole="broy-tabove"] .chislo', (e) => e.textContent.trim())) >= 1,
      true);
    proveri('казва, че правото е само на Стопанина',
      (await tekstNa(p, '[data-sektsiya=tablo-tabove]')).includes('само от Стопанина'), true);
    // Бутонът е ПЪТ, не надпис: води на екрана, без да е част от лентата.
    await deystvieSPrerisuvane(p, () => p.click('[data-sektsiya=tablo-tabove] [data-ekran=tabove]'));
    proveri('и бутонът наистина отваря конструктора',
      Boolean(await p.$('#izbor-tab')), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 61 · ВЪЗСТАНОВЯВАНЕТО · запасният контакт (И100 · ADR-044) ══════════
    //
    // Пътят обратно се вписва ПРЕДИ да потрябва. Тук се проверява и най-важното
    // му свойство: телефонът НЕ пътува в изнесения файл — влиза само следата му.
}
