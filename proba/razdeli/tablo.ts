import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { deystvieSPrerisuvane, naEkran, plochka, tekstNa } from '../yadro/pomoshtni.ts';
import { tishina } from '../yadro/tishina.ts';

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
    // ТУК Драйвът ОЩЕ не е питан — питането става чак в §93. Дотогава плочката
    // НЕ твърди най-евтиното: „Безплатно" за непитан акаунт беше точно дупката,
    // която резен Д затвори (ADR-076 §3). Проверката пази ТРЕТОТО състояние на
    // мястото, където никой не е натискал нищо.
    proveri('НЕ твърди чие е хранилището, преди да е питано',
      await plochka(p, 'Хранилище'), 'Не е питано');
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

    // ══ 110 · ПРОБВАНЕТО · тридесет дни, СМЯТАНИ (резен 32 · ADR-092) ══════
    //
    // „с 30 дн[и] б[ез]платно пробване" *(р83·[57])*, потвърдено с „da wavi"
    // (И86): „пробването е СРОК преди плащането, не безплатен план".
    razdel = '110 · Пробването · тече, и се КАЗВА';
    await naEkran(p, 'tablo', '[data-sektsiya=tablo-probvane]');
    proveri('картата я има',
      Boolean(await p.$('[data-sektsiya=tablo-probvane]')), true);
    // Книгата има записи от днес · срокът е тръгнал и ТЕЧЕ.
    proveri('състоянието е „тече"',
      await p.$eval('[data-sektsiya=tablo-probvane]', (e) => (e as any).dataset.sastoyanie), 'teche');
    proveri('остават 29 дни · първият ден се БРОИ',
      await p.$eval('[data-pole="ostavat-dni"] .chislo', (e) => (e as any).textContent.trim()), '29');
    proveri('и денят на започването се КАЗВА',
      (await p.$eval('[data-pole="ostavat-dni"] .pod', (e) => (e as any).textContent)).includes('от '),
      true);

    razdel = '110 · Пробването · СРОК, не план';
    proveri('заглавието го КАЗВА',
      (await tekstNa(p, '[data-sektsiya=tablo-probvane] .dyalglava'))
        .includes('не безплатен план'), true);
    proveri('и текстът дава ЧИСЛОТО и деня',
      (await tekstNa(p, '[data-sektsiya=tablo-probvane]')).includes('остават 29 дни'), true);

    razdel = '110 · Пробването · честна спирачка, не ключалка';
    /**
     * КАРТАТА НЕ ПРЕДЛАГА НИЩО ЗА НАТИСКАНЕ · тя КАЗВА.
     *
     * Броят се бутоните в `.deystviya` — нейните. Двата отвън са стрелките за
     * подреждане, които ВСЯКА секция получава (резен АО): те не са на картата и
     * не бива да влизат в това твърдение.
     */
    proveri('картата не предлага НИТО ЕДИН свой бутон',
      await p.$$eval('[data-sektsiya=tablo-probvane] .deystviya button', (e) => e.length), 0);
    proveri('и не заплашва с думи',
      /забранен|блокиран|спрян/i.test(await tekstNa(p, '[data-sektsiya=tablo-probvane]')), false);

    // ══ 61 · ВЪЗСТАНОВЯВАНЕТО · запасният контакт (И100 · ADR-044) ══════════
    //
    // Пътят обратно се вписва ПРЕДИ да потрябва. Тук се проверява и най-важното
    // му свойство: телефонът НЕ пътува в изнесения файл — влиза само следата му.
}

/**
 * 93 · ЧЕСТНАТА СПИРАЧКА · заявка за плана и проверка на драйва (резен Д · ADR-076)
 *
 * Проходът НЕ може да пита истинския Google — той иска съгласие в прозорче и
 * жива мрежа. Мери се онова, което Е ТУК: третото състояние, думите му, липсата
 * на ключалка и това, че бутонът казва ЗАЩО, когато свързващата част я няма.
 */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  razdel = '93 · Спирачката · „не е питано" е СЪСТОЯНИЕ';
  await naEkran(p, 'tablo', '[data-sektsiya=tablo-spiratchka]');
  proveri('видът НЕ се твърди, преди да е питан',
    await p.$eval('[data-vid-hranilishte]', (e) => (e as HTMLElement).dataset['vidHranilishte']),
    'не е питано');
  proveri('оценката също',
    await p.$eval('.znachka[data-otsenka]', (e) => (e as HTMLElement).dataset['otsenka']), 'ne e pitano');
  proveri('и КАЗВА защо мълчи',
    (await tekstNa(p, '[data-sektsiya=tablo-spiratchka]')).includes('не твърдим нищо'), true);
  proveri('свободното НЯМА число · защото не е питано',
    await p.$eval('[data-svobodno]', (e) => (e as HTMLElement).dataset['svobodno']), '-1');
  // И СТАРАТА плочка спира да лъже: тя показваше „Безплатно" за всеки, вкл. за
  // непитан акаунт. Тук се сверява САМОЛИЧНОСТТА, не пресният отговор — инак
  // връщането на закованото „безплатно" остава невидимо (проходът го намери).
  proveri('и плочката „Хранилище" КАЗВА същото',
    await p.$eval('[data-hranilishte]', (e) => (e as HTMLElement).dataset['hranilishte']),
    'не е питано');

  razdel = '93 · Спирачката · нужното се МЕРИ, не се пита';
  const nuzhno = Number(
    await p.$eval('[data-nuzhno]', (e) => (e as HTMLElement).dataset['nuzhno']),
  );
  proveri('нужното е ЧИСЛО от браузъра', Number.isFinite(nuzhno) && nuzhno >= 0, true);
  proveri('и е обявено като МЕРЕНО',
    (await tekstNa(p, '[data-sektsiya=tablo-spiratchka]')).includes('МЕРЕНО от браузъра'), true);

  razdel = '93 · Спирачката · НЕ Е ключалка, и го КАЗВА';
  const tekst = await tekstNa(p, '[data-sektsiya=tablo-spiratchka]');
  proveri('казва, че нищо не заключва', tekst.includes('нищо не се заключва'), true);
  proveri('и че нарочната измама иска сървър', tekst.includes('иска сървър'), true);
  proveri('и че не струва ново разрешение', tekst.includes('нито едно ново разрешение'), true);

  razdel = '93 · Спирачката · отказът се КАЗВА, не мълчи';
  // Проходът върви върху построеното приложение, но БЕЗ жива мрежа към Google.
  // Натискането тръгва към доставчика и пада — точно каквото става при човек
  // без връзка. Мълчанието в конзолата е ОЧАКВАНО и се обявява, вместо да се
  // преглътне: същият флаг, с който раздел 16 къса мрежата нарочно.
  proveri('бутонът е ТУК', await p.$$eval('#pitay-drayva', (e) => e.length), 1);
  tishina.ochakvana = true;
  await deystvieSPrerisuvane(p, () => p.click('#pitay-drayva'));
  tishina.ochakvana = false;
  proveri('отказът се КАЗВА с думи, не мълчи',
    (await p.$$eval('#greshka-spiratchka', (e) => e.length)) > 0, true);
  proveri('и след отказа пак НЕ се твърди нищо за акаунта',
    await p.$eval('[data-vid-hranilishte]', (e) => (e as HTMLElement).dataset['vidHranilishte']),
    'не е питано');
  await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * 147 · ГЕЙТЪТ НА ОГЛЕДАЛАТА · отметката ДЕЙСТВА, и отказът се КАЗВА.
 *
 * Негова дума, 02.09: „оправи ог;еда;ата и гейта".
 *
 * Възможността `ogledala` беше единствената обявена БЕЗ гейт: двата изгледа
 * се рисуваха винаги, тоест отметката ѝ в Таблото беше НАДПИС (правило 15,
 * резен 93 · ADR-151). Тук се мери и трите неща наведнъж: изгледът пада,
 * казва се ЗАЩО е паднал, и се връща цял с обратното натискане.
 */
export async function blok4(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
  const broy = (znak: string): Promise<number> => p.$$eval(znak, (e) => e.length);

  razdel = '147 · Огледалата · двата изгледа СТОЯТ, докато отметката е вдигната';
  await naEkran(p, 'imoti', '#forma-imot');
  proveri('„По обект" е тук', await broy('[data-tablitsa="po-imot"]'), 1);
  await naEkran(p, 'pari', '#forma-nachisli');
  proveri('„По контрагент" е тук', await broy('[data-tablitsa="po-kontragent"]'), 1);

  razdel = '147 · Огледалата · отметката ги гаси И НА ДВАТА екрана';
  await naEkran(p, 'tablo', '.vazmozhnosti');
  await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="ogledala"]'));
  await naEkran(p, 'imoti', '#forma-imot');
  proveri('„По обект" падна', await broy('[data-tablitsa="po-imot"]'), 0);
  proveri('и на мястото му стои отказ', await broy('[data-bez="ogledala"]'), 1);
  proveri(
    'който КАЗВА, че е ИЗКЛЮЧЕНА, а не липсваща',
    (await tekstNa(p, '[data-bez="ogledala"]')).includes('изключена от Таблото'),
    true,
  );
  proveri(
    'и сочи КЪДЕ се връща',
    (await tekstNa(p, '[data-bez="ogledala"]')).includes('Таблото'),
    true,
  );
  await naEkran(p, 'pari', '#forma-nachisli');
  proveri('„По контрагент" също падна', await broy('[data-tablitsa="po-kontragent"]'), 0);
  proveri('и той казва защо', await broy('[data-bez="ogledala"]'), 1);

  razdel = '147 · Огледалата · отметката ги ВРЪЩА цели';
  await naEkran(p, 'tablo', '.vazmozhnosti');
  await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="ogledala"]'));
  await naEkran(p, 'imoti', '#forma-imot');
  proveri('„По обект" се върна', await broy('[data-tablitsa="po-imot"]'), 1);
  proveri('и отказът си отиде', await broy('[data-bez="ogledala"]'), 0);
  await naEkran(p, 'pari', '#forma-nachisli');
  proveri('„По контрагент" се върна', await broy('[data-tablitsa="po-kontragent"]'), 1);
}
