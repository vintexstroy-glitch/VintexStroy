import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OBB, OTKRIVASHTOTO, smeniPoleto, broySabitiya, chisloNaPoleto, denOtDnes, deystvieSPrerisuvane, naEkran, napishiSigurno, natisniVGrupata, plati, plochka, redove, sSabitie, sSabitiya, smetni, tekstNa, zapishiRazhod } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/** 6 · сметки | 7 · калкулатор */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '6 · сметки';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));

    proveri('приход', await plochka(p, 'Приход за'), '2 000,00 €');
    proveri('ДДС за внасяне', await plochka(p, 'ДДС за внасяне'), '200,00 €');
    proveri('разход · още няма', await plochka(p, 'Разход за'), '0,00 €');
    proveri('разлика по сверката', await plochka(p, 'Разлика по сверката'), '0,00 €');

    const smetki = Object.fromEntries((await redove(p, '.red.smetka')).map((r) => [(r[0] as any).split(' ')[0], r[3]]));
    proveri('ред Наеми', smetki['Наеми'], '2 000,00 €');
    proveri('ред КЕШ', smetki['КЕШ'], '600,00 €');
    proveri('ред БАНКА', smetki['БАНКА'], '600,00 €');
    proveri('ред Заплати', smetki['Заплати'], '0,00 €');
    proveri('ред Кредити', smetki['Кредити'], '0,00 €');

    const dds = await redove(p, '.red.dds:not(.sbor)');
    const targ = dds.find((r) => r[1]?.startsWith('наем · търговски'));
    const zhil = dds.find((r) => r[1]?.startsWith('наем · жилищен'));
    proveri('търговски · основа', targ?.[3], '1 000,00 €');
    proveri('търговски · ДДС', targ?.[4], '200,00 €');
    proveri('жилищен · основа', zhil?.[3], '800,00 €');
    proveri('жилищен · ДДС', zhil?.[4], '0,00 €');

    const sverki = await redove(p, '.red.sverka:not(.otchet-sverka)');
    proveri('двете сверки затварят', sverki.every((r) => r[4] === 'затваря'), true);
    proveri('паричната сверка е в левове', sverki[0]?.[1], '2 000,00 €');
    proveri('сверката по брой е в бройки', sverki[1]?.[1], '3');

    // ══ 7 · калкулатор ═══════════════════════════════════════════════════
    razdel = '7 · калкулатор';
    await smetni(p, 'фактура 1042', '1200,00', '20');
    await smetni(p, 'жилищен наем', '500,00', '0');
    const smyatane = await redove(p, '.red.smyatane');
    proveri('ред с 20%', smyatane[0]?.slice(2), ['1 000,00 €', '200,00 €', '1 200,00 €'].join(','));
    proveri('ред с 0%', smyatane[1]?.slice(2), ['500,00 €', '0,00 €', '500,00 €'].join(','));
    proveri('сборът', smyatane[2]?.slice(2), ['1 500,00 €', '200,00 €', '1 700,00 €'].join(','));

    // ══ 8 · презареждане — Журналът живее в браузъра ═════════════════════
}

/** 11в · разходите */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '11в · разходите';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('ДДС преди разходите', await plochka(p, 'ДДС за внасяне'), '200,00 €');

    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Материали ООД',
      opis: 'цимент', suma: '600,00', nachin: 'банка', data: '2026-02-14', dokument: '1042',
    });
    proveri('седемнайсет събития', await broySabitiya(p), 17 + OTKRIVASHTOTO);

    await zapishiRazhod(p, {
      potok: 'zaplati', sektor: 'pokupki-materiali', dostavchik: 'екип',
      opis: 'заплати февруари', suma: '2000,00', nachin: 'в брой', data: '2026-02-28', dokument: '',
    });
    proveri('осемнайсет събития', await broySabitiya(p), 18 + OTKRIVASHTOTO);

    const smetkiR = Object.fromEntries(
      (await redove(p, '.red.smetka')).map((x) => [(x[0] as any).split(' ')[0], x[3]]),
    );
    proveri('ред Фактури', smetkiR['Фактури'], '600,00 €');
    proveri('ред Заплати', smetkiR['Заплати'], '2 000,00 €');
    proveri('плочка Разход', await plochka(p, 'Разход за'), '2 600,00 €');

    const vhod = (await redove(p, '.red.dds:not(.sbor)')).filter((x) => x[0] === 'вход');
    proveri('две страни „вход" — материали и заплати', vhod.length, 2);
    const materiali = vhod.find((x) => x[1]?.startsWith('покупки · материали'));
    proveri('входящ ДДС от фактурата', materiali?.[4], '100,00 €');
    proveri('заплатите не носят ДДС', vhod.find((x) => x[1]?.startsWith('заплати'))?.[4], '0,00 €');
    proveri('за внасяне пада наполовина', await plochka(p, 'ДДС за внасяне'), '100,00 €');

    const sverkiR = await redove(p, '.red.sverka:not(.otchet-sverka)');
    proveri('четирите сверки затварят', sverkiR.every((x) => x[4] === 'затваря'), true);
    proveri('сверката на разхода', sverkiR[2]?.[1], '2 600,00 €');

    // сторно на фактурата — входящият ДДС си отива с нея
    await sSabitie(p, () => natisniVGrupata(p, '.red.razhod:has-text("Материали ООД") [data-storno-razhod]'));
    proveri('деветнайсет събития', await broySabitiya(p), 19 + OTKRIVASHTOTO);
    proveri('за внасяне се връща', await plochka(p, 'ДДС за внасяне'), '200,00 €');
    proveri('разходът остава само заплатите', await plochka(p, 'Разход за'), '2 000,00 €');

    // ══ 105 · СТОРНИРАНОТО СЕ ВИЖДА (резен 27 · ADR-087) ═══════════════════
    //
    // Негово, прието: „Сиво + зачертано + малък знак ★". Дотук Огледалото
    // прескачаше погасеното и редът просто изчезваше — човек не можеше да
    // различи „сторнирано" от „никога не е било записано".
    razdel = '105 · Сторнираното СЕ ВИЖДА';
    proveri('сторнираният ред ОСТАВА на екрана',
      await p.$$eval('[data-tablitsa=razhodi-pogaseni] [data-pogasen]', (r) => r.length) > 0, true);
    proveri('и е ЗАЧЕРТАН · класът е на реда, не в изречение',
      await p.$eval('[data-pogasen]', (e) => e.classList.contains('pogasen')), true);
    proveri('носи знака ★ и КОЙ го е сторнирал',
      (await p.$eval('[data-pogasen]', (e) => (e as any).innerText)).includes('★ сторниран'), true);
    proveri('броят се КАЗВА',
      Number(await p.$eval('[data-sektsiya=razhodi-pogasenite]', (e) => (e as any).dataset.pogaseni)) > 0, true);
    proveri('и екранът казва, че НЕ влизат в сбора',
      (await p.$eval('[data-sektsiya=razhodi-pogasenite]', (e) => (e as any).innerText)).includes('НЕ влизат в сбора'), true);

    // СКРИВАНЕТО Е ЛИЧНО · нула събития (правило 23 · ADR-022).
    const predSkrivane = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#pogaseni-prevkl'));
    proveri('скриването маха редовете от екрана',
      await p.$$eval('[data-tablitsa=razhodi-pogaseni]', (r) => r.length), 0);
    proveri('но НЕ пише нищо в Журнала', await broySabitiya(p), predSkrivane);
    proveri('и сборът НЕ мърда от скриването', await plochka(p, 'Разход за'), '2 000,00 €');
    await deystvieSPrerisuvane(p, () => p.click('#pogaseni-prevkl'));
    proveri('връщането ги показва пак',
      await p.$$eval('[data-tablitsa=razhodi-pogaseni] [data-pogasen]', (r) => r.length) > 0, true);

    // ══ 11г · източниците · таблица от Драйва ════════════════════════════
}

/** 18 · моделът на таблица */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '18 · моделът на таблица';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-04');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    // Глава на българско банково извлечение. НЯМА колона „Доставчик" — точно
    // затова старият път по думи не я хваща и приложението трябва да ПИТА.
    const parvoIzvlechenie = join(tmpdir(), 'izvlechenie-april.csv');
    await writeFile(
      parvoIzvlechenie,
      [
        OBB,
        '05.04.2026;цимент;Материали ООД;600,00;3001;20',
        '12.04.2026;нощувки екип;Хотел ЕООД;109,00;3002;9',
      ].join('\n'),
    );

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', parvoIzvlechenie);
    await p.waitForSelector('#zapomni-model');
    proveri('непознат хедър → ПИТА, не гадае', await tekstNa(p, '.karta.izbrana .dyalglava h2'), 'Не познавам тази таблица');
    proveri('предлага „дата"', await p.$eval('#karta-data', (e) => (e as any).value), '0');
    proveri('предлага „сума"', await p.$eval('#karta-suma', (e) => (e as any).value), '3');
    proveri('предлага „ДДС"', await p.$eval('#karta-dds', (e) => (e as any).value), '5');
    proveri('НЕ гади „Наредител" за контрагент', await p.$eval('#karta-kontragent', (e) => (e as any).value), '');

    await p.fill('#karta-ime', 'Банка ОББ');
    await p.selectOption('#karta-kontragent', '2');
    await sSabitiya(p, 1, () => p.click('#zapomni-model'));
    await p.waitForSelector('#prilozhi');
    proveri('картата се записва и файлът се чете', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Прочетено'), true);
    proveri('два реда от извлечението', (await redove(p, '.red.razlika')).length, 2);

    await sSabitiya(p, 3, () => p.click('#prilozhi'));
    const vhodM = (await redove(p, '.red.dds:not(.sbor)')).filter((x) => x[0] === 'вход');
    proveri('един сектор, ДВЕ ставки — от колоната, не от сектора', vhodM.length, 2);
    proveri('входящ ДДС на 20%', vhodM.find((x) => x[2] === '20%')?.[4], '100,00 €');
    proveri('входящ ДДС на 9%', vhodM.find((x) => x[2] === '9%')?.[4], '9,00 €');

    // сверката на ДДС · движение в банката без фактура
    proveri('две движения без фактура светят', (await redove(p, '.red.nesvarshen')).length, 2);
    proveri('казва КОЕ липсва, не само колко', (await redove(p, '.red.nesvarshen'))[0]?.[0], 'липсва фактура');

    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Материали ООД',
      opis: 'цимент', suma: '600,00', nachin: 'банка', data: '2026-04-05', dokument: '3001',
    });
    const ostanali = await redove(p, '.red.nesvarshen');
    proveri('въведената фактура затваря своето движение', ostanali.length, 1);
    proveri('остава точно другото', ostanali[0]?.[1]?.includes('3002'), true);

    // ВТОРИЯТ файл със същата глава — минава без нито един въпрос
    const vtoroIzvlechenie = join(tmpdir(), 'izvlechenie-april-2.csv');
    await writeFile(
      vtoroIzvlechenie,
      [
        OBB,
        '05.04.2026;цимент;Материали ООД;600,00;3001;20',
        '12.04.2026;нощувки екип;Хотел ЕООД;109,00;3002;9',
        '20.04.2026;тухли;Тухли АД;240,00;3003;20',
      ].join('\n'),
    );
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', vtoroIzvlechenie);
    await p.waitForSelector('#prilozhi');
    proveri('вторият файл със същата глава НЕ пита', (await p.$('#zapomni-model')) === null, true);
    proveri('вижда само новия ред', (await redove(p, '.red.razlika')).length, 1);
    await sSabitiya(p, 2, () => p.click('#prilozhi'));
    proveri('новото движение също търси фактурата си', (await redove(p, '.red.nesvarshen')).length, 2);

    // крив ред НЕ се преглъща — влиза в „непрочетени" с думи защо
    const krivo = join(tmpdir(), 'izvlechenie-april-krivo.csv');
    await writeFile(krivo, [OBB, '25.04.2026;боя;Бои ООД;150,00;3004;21'].join('\n'));
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', krivo);
    await p.waitForSelector('.red.propusnat');
    proveri('непозволена ставка не се закръгля — казва се', (await redove(p, '.red.propusnat'))[0]?.[1]?.includes('Ставка 21 не съществува'), true);
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '#otkazhi-plan'));


    // ══ 19 · бутонът · моделът на ПЪТЯ ═══════════════════════════════════
}

/** 58 · Образецът от модела */
export async function blok4(
  ctx: KonteksNaProhoda,
  { razhodPredi, koloniPredi }: { razhodPredi: string; koloniPredi: number },
): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '58 · Образецът от модела';
    proveri('секцията за образец стои под хедъра',
      Boolean(await p.$('[data-sektsiya=obrazets]')), true);
    proveri('и КАЗВА, че образецът е ЦЯЛ · махната колона го прави непознаваем',
      (await p.$eval('[data-sektsiya=obrazets]', (e) => e.textContent)).includes('непознаваем'), true);

    const predObrazets = await broySabitiya(p);
    await p.fill('#obrazets-redove', '5');
    const [obrazets] = await Promise.all([p.waitForEvent('download'), p.click('#svali-obrazets')]);
    // ИМЕТО НА ФАЙЛА Е АДРЕС, не надпис: моделът се казва „Банка ОББ", а
    // атрибутът `download` не оцелява с кирилица по този път — човекът получава
    // „download", „download (1)"… Затова името се преписва на латиница.
    proveri('името казва „образец" И кой модел е',
      obrazets.suggestedFilename(), `obrazets-Banka-OBB-${new Date().toISOString().slice(0, 10)}.xlsx`);
    // ПЪТЯТ „pishe" води до ФАЙЛ, не до записа: нищо не влиза в Журнала.
    proveri('образецът НЕ пише нищо в Журнала', await broySabitiya(p), predObrazets);
    // ВЕСТТА СЕ ЧАКА, не се чете веднага. НАДПРЕВАРА, хваната в резен 42:
    // `waitForEvent('download')` се развързва щом файлът тръгне — а вестта се
    // слага СЛЕД това, в същия обработчик. При натоварена машина проходът
    // четеше празен екран и падаше веднъж на три пускания. Проход, който лъже
    // през ден, е по-скъп от липсващ (ADR-051).
    await p.waitForFunction(() =>
      (document.querySelector('.vest')?.textContent ?? '').length > 0);
    proveri('и го КАЗВА след свалянето',
      (await tekstNa(p, '.vest')).includes('празни реда'), true);

    // Нова колона с ГОТОВО меню от Описа — вторият вид номенклатура
    await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
    await p.fill('#kolona-ime', 'Начин');
    await p.selectOption('#kolona-nomenklatura', 'opis');
    await p.fill('#kolona-menyu', 'Кеш · Банка');
    await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
    await p.waitForSelector('.red.redaktor');
    const sledDobavyane = await redove(p, '.red.redaktor');
    proveri('колоната е добавена в КРАЯ', sledDobavyane.length, koloniPredi + 1);
    const nova = sledDobavyane[sledDobavyane.length - 1];
    // Клетка 4 е номенклатурата · нулевата (ред · дръжка и стрелки) я измести
    // с една при резен 55.
    proveri('и носи готовото меню от Описа', nova?.[4], 'готово меню от Описа');
    // Членовете стоят в полето за писане, не в текста на клетката.
    const chlenoveNaEkran = await p.$$eval('[data-menyu-vhod]', (x) => x.map((i) => (i as any).value));
    proveri('членовете са запазени', chlenoveNaEkran.some((v) => v.includes('Кеш · Банка')), true);

    // Описът на Подредба — всичко именувано е ред
    await deystvieSPrerisuvane(p, () => p.click('#litse-opis'));
    await p.waitForSelector('.red.opis');
    const opis = await redove(p, '.red.opis');
    proveri('Описът брои и хедъри, и колони, и членове', opis.length > koloniPredi, true);
    proveri('членът на менюто си има дом', opis.some((r) => r[0] === 'Кеш' && r[1] === 'член на меню'), true);

    // Изтритото меню ЗАКЛЮЧВА името (ред 1994)
    await deystvieSPrerisuvane(p, () => p.click('#litse-hedari'));
    await p.waitForSelector('.red.redaktor');
    await sSabitie(p, () => natisniVGrupata(p, '[data-iztriy-menyu]'));
    await p.waitForSelector('.red.redaktor input:disabled');
    proveri('изтритото меню заключва името', (await p.$$('.red.redaktor input:disabled')).length, 1);
    proveri(
      'и колоната пада на първия вид',
      (await redove(p, '.red.redaktor')).pop()?.[4],
      'без падащо меню',
    );

    // ── видът на СТОЙНОСТТА · втората половина на ADR-014 ────────────────
    // Дотук `podskazhiVid()` гадаеше по заглавието, а собственият ѝ коментар
    // казваше „човекът потвърждава в Редактора на хедъри" — където нямаше
    // такъв контрол. Ето го, и проходът го пази.
    proveri('всяка колона показва вида на стойността си',
      (await p.$$eval('[data-vid-stoynost]', (e) => e.length)) > 0, true);
    proveri('и казва дали влиза в двата сбора',
      (await p.$$eval('.red.redaktor .kletka > span', (e) => e.map((x) => x.textContent)))
        .some((t) => t === 'влиза в двата сбора' || t === 'не влиза в сбор'), true);

    const parvoto = await p.$eval('[data-vid-stoynost]', (e) => (e as any).value);
    await p.selectOption('[data-vid-stoynost]', parvoto === 'evro' ? 'protsent' : 'evro');
    await sSabitie(p, () => natisniVGrupata(p, '[data-zapishi-kolona="0"]'));
    proveri('смяната на вида ражда ЕДНО събитие и се задържа',
      await p.$eval('[data-vid-stoynost]', (e) => (e as any).value),
      parvoto === 'evro' ? 'protsent' : 'evro');

    // Числата в Сметки не мърдат от редакция на глава
    await naEkran(p, 'smetki', '#forma-period');
    proveri('РЕДАКЦИЯТА НА ГЛАВА НЕ ПИПА ЧИСЛАТА', await plochka(p, 'Разход'), razhodPredi);


    // ══ 22 · Стойност на Състояние (Калкулатор) ═════════════════════════
}

/** 23 · Отчети */
export async function blok5(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '23 · Отчети';
    await naEkran(p, 'smetki', '#forma-period');

    // Формата за салдата стои ГОРЕ — негова дума: „Редактируеми отгоре в Сметки".
    const redNaSekcii = await p.$$eval('section .dyalglava h2', (h) => h.map((x) => x.textContent.trim()));
    proveri('Салда стои преди Период', redNaSekcii.indexOf('Салда') < redNaSekcii.indexOf('Период'), true);
    // Дялът вече носи НЕГОВИТЕ ТРИ ИМЕНА (резен 50 · „Слей ги в гнезда"), а не
    // само „Отчети": гнездата са три и заглавието на дяла ги казва и трите.
    proveri('дялът носи трите гнезда', redNaSekcii.includes('Отчети · Пари · Регистър'), true);

    // РЕДЪТ НА ПОЛЕТАТА СЕ СМЕНИ, и то по НЕГОВА дума: „ОТЧЕТ СРЕДСТВА/ОТЧЕТ
    // ФИНАНСИ" *(р80·[48])* слага Средства ПЪРВО. Дотук четирите стояха в един
    // ред без имена помежду си; сега са в двата поименни отчета, а вътре в
    // Финанси редът си остава онзи, който Отчетите връщат.
    // ОБХВАТ: ГНЕЗДОТО „ОТЧЕТИ" · резен 51 сложи и коефициентите на състоянието
    // в карти `.pole-otchet`, тъй че гол селектор върху този белег вече хваща
    // две различни неща. Точно клас Б от `docs/11` — и се лови от собствения му
    // обход в мига, в който вторият ползвател се появи.
    const poleta = await p.$$eval('[data-gnezdo="otcheti"] .pole-otchet .etiket',
      (e) => e.map((x) => x.textContent.trim()));
    proveri('четирите полета, в двата поименни отчета', poleta.join(' · '),
      'СРЕДСТВА · КАПИТАЛ · ЛИКВИДНОСТ · ВЗЕМАНИЯ');

    // ФОРМУЛАТА не се крие зад клик: съставките се виждат веднага.
    const sastavkiNaKapitala = await p.$$eval(
      '[data-pole="kapital"] .formula .ime', (e) => e.map((x) => x.textContent.trim()));
    proveri('Капиталът показва от какво е съставен', sastavkiNaKapitala.join(' · '),
      'Стойност на Състояние · Ликвидност · Вземания · Кредити · остатъчна главница');

    // Правило 15 · изключено ≠ липсващо: непълното число го КАЗВА.
    // Дотук Капиталът чакаше ДВЕ неща; Калкулаторът смята от §22, а кредитите
    // нямаха таблица (M04). Резен 19 им я построи — и „чака" изчезна ЗАЩОТО
    // числото дойде, не защото редът е махнат. Нула кредита значи НУЛА дълг:
    // истинско число, не липсващо.
    proveri('Капиталът вече не чака НИЩО · и двете липси си намериха източник',
      await p.$$eval('[data-pole="kapital"] .chaka', (e) => e.length), 0);
    proveri('а съставката „Кредити" стои с истинската си нула',
      sastavkiNaKapitala.at(-1), 'Кредити · остатъчна главница');
    proveri('Вземанията НЕ крият празната половина',
      (await p.$$eval('[data-pole="vzemaniya"] .formula .ime', (e) => e.map((x) => x.textContent))).length, 2);

    // САЛДОТО · записва се, вижда се в Ликвидността, поправя се без втори ред.
    // Ликвидността вече носи движенията от по-ранните раздели, затова се мери
    // РАЗЛИКАТА, не абсолютното число: салдото трябва да добави точно 10 000.
    const likvidnostPredi = await chisloNaPoleto(p, 'likvidnost');
    const predSaldoto = await broySabitiya(p);
    await p.selectOption('#saldo-kade', 'banka');
    await p.fill('#saldo-suma', '10 000,00');
    await p.fill('#saldo-ot', '2026-08-01');
    await sSabitie(p, () => p.click('#forma-saldo button[type=submit]'));
    proveri('салдото роди ЕДНО събитие', (await broySabitiya(p)) - predSaldoto, 1);

    const likvidnost1 = await chisloNaPoleto(p, 'likvidnost');
    proveri('началото добавя ТОЧНО 10 000 към Ликвидността', likvidnost1 - likvidnostPredi, 10_000_00);
    proveri('и вече не чака Банка',
      (await p.$eval('[data-pole="likvidnost"] .chaka', (e) => e.textContent)).includes('Банка'), false);

    // Поправка на същия джоб · последният запис бие, втори ред не се ражда.
    await p.fill('#saldo-suma', '12 500,00');
    await p.fill('#saldo-ot', '2026-08-01');
    await sSabitie(p, () => p.click('#forma-saldo button[type=submit]'));
    const likvidnost2 = await chisloNaPoleto(p, 'likvidnost');
    proveri('поправката добавя разликата, не второ салдо', likvidnost2 - likvidnost1, 2_500_00);
    proveri('Банка се показва веднъж в формулата',
      (await p.$$eval('[data-pole="likvidnost"] .formula .ime',
        (e) => e.filter((x) => x.textContent.includes('Банка')).length)), 1);

    // СВЕРКАТА вход↔изход на Капитала · нулата се ПОКАЗВА (правило 7).
    // ОБХВАТ: ГНЕЗДОТО „ОТЧЕТИ" · сверката на Капитала живее вътре в него, не е
    // вече съсед на дялглавата. Селекторът тръгва от гнездото, защото то е
    // белегът, който не се мени с думите на заглавието.
    proveri('сверката на Капитала затваря',
      await p.$eval('[data-gnezdo="otcheti"] .tablitsa .red.sverka .znachka',
        (e) => e.textContent.trim()), 'затваря');

    // ══ 122 · ГНЕЗДАТА · Отчети · Пари · Регистър, слети (резен 50) ══════
    //
    // Негови ДВЕ изречения от 11.08: „Слей ги в гнезда (Отчети · Пари ·
    // Регистър)" *(р80·[50])* и „ОТЧЕТ СРЕДСТВА/ОТЧЕТ ФИНАНСИ" *(р80·[48])*.
    // Описът ги броеше с НУЛА попадения — нито гнезда, нито поименни отчети.
    razdel = '122 · гнездата';

    // ОБХВАТ: ЦЯЛАТА СТРАНИЦА · Сметки е единственият екран с гнезда днес, и
    // това е самата проверка: заграждащ селектор би скрил гнездо, родено на
    // грешно място.
    const gnezda = await p.$$eval('[data-gnezdo] .gnezdoglava h3',
      (e) => e.map((x) => x.textContent.trim()));
    proveri('трите гнезда, в НЕГОВИЯ ред', gnezda.join(' · '), 'Отчети · Пари · Регистър');

    const imenaNaOtchetite = await p.$$eval('[data-otchet] .otchetglava h4',
      (e) => e.map((x) => x.textContent.trim()));
    proveri('двата поименни отчета, в НЕГОВИЯ ред', imenaNaOtchetite.join(' · '),
      'Отчет Средства · Отчет Финанси');

    // Всяко гнездо КАЗВА какво е · надпис без изречение е кутия с име.
    proveri('всяко гнездо носи изречението си',
      await p.$$eval('[data-gnezdo] .gnezdoglava span',
        (e) => e.filter((x) => x.textContent.trim().length > 15).length), 3);

    // Кое поле в кой отчет · Средства е ДВИЖЕНИЕ и стои САМО́ в първия.
    proveri('Отчет Средства носи точно едно поле',
      await p.$$eval('[data-otchet="sredstva"] .pole-otchet', (e) => e.length), 1);
    proveri('Отчет Финанси носи другите три',
      await p.$$eval('[data-otchet="finansi"] .pole-otchet', (e) => e.length), 3);

    // СВЕРКАТА ВХОД↔ИЗХОД на самите гнезда · нулата се ПОКАЗВА (правило 7).
    proveri('сверката на гнездата затваря',
      await p.$eval('[data-gnezda-sverka]', (e) => e.getAttribute('data-gnezda-sverka')), '0');
    proveri('и КАЗВА, че разпределението е НАШЕ, не негово',
      (await p.$eval('[data-gnezda-sverka]', (e) => e.textContent)).includes('НАШЕ решение'), true);

    // ГНЕЗДОТО „РЕГИСТЪР" · парите на наемите стигат до Сметки, а границата се
    // казва на глас (правило 15). Пълният Регистър остава на Имоти.
    // ПОИМЕННО, НЕ С ЧИСЛО. Дотук тук стоеше броят, и точно той падна веднъж с
    // „чакано 3 · видяно 2", без да каже КОЯ плочка липсва — а находка, обявена
    // само като число, не може да се провери (правило 28). Сега докладът носи
    // самите ключове, тъй че следващото падане ще каже кой е изчезнал.
    proveri('Регистърът дава трите си числа и тук',
      (await p.$$eval('[data-gnezdo="registar"] [data-gnezdo-registar]',
        (e) => e.map((x) => x.getAttribute('data-gnezdo-registar')))).join(' · '),
      'nachisleno · plateno · ostatak');
    proveri('и границата е КАЗАНА, не преглътната',
      (await p.$eval('[data-gnezdo="registar"] .drebno', (e) => e.textContent)).includes('Имоти'), true);

    // Гнездото „Пари" носи стълбовете на месеците · те бяха на екрана и преди,
    // но без име над себе си.
    proveri('гнездото „Пари" носи стълбовете на месеците',
      await p.$$eval('[data-gnezdo="pari"] .stalbove', (e) => e.length), 1);

    // ══ 123 · ДВЕТЕ ПАДАЩИ МЕНЮТА и СЪСТОЯНИЕТО (резен 51) ═══════════════
    //
    // Негово, 30.08: „Секция отчети в таба Сметки има 2 падащи менюта. През
    // едното избираш как да видиш резултата: таблица, графика, диаграма.
    // Второто падащо меню избираш всички популярни и най-използвани
    // коефициенти… Показваш всички коефициенти и без графика, по всяко време,
    // които са налични и не са за период."
    razdel = '123 · двете падащи менюта';

    const vidoveRezultat = await p.$$eval('#koef-rezultat option',
      (e) => e.map((x) => x.textContent.trim()));
    proveri('първото меню дава ТРИ вида резултат, в неговия ред',
      vidoveRezultat.join(' · '), 'Таблица · Графика · Диаграма');

    // ДВЕ РАЗЛИЧНИ МЕНЮТА, не едно · видът резултат не е вид диаграма.
    const vidoveDiagrama = await p.$$eval('#koef-diagrama option', (e) => e.length);
    proveri('видът диаграма си остава ОТДЕЛНО меню', vidoveDiagrama, 4);

    proveri('второто меню дава коефициентите за графика',
      (await p.$$eval('#koef-koefitsient option', (e) => e.length)) > 10, true);

    // СЪСТОЯНИЕТО се вижда БЕЗ период и БЕЗ графика.
    proveri('състоянието показва СЕДЕМ коефициента, без нито една диаграма',
      await p.$$eval('[data-sektsiya="koef-sastoyanie"] [data-sastoyanie]', (e) => e.length), 7);
    // ИКОНАТА НЕ Е ДИАГРАМА · първото писане на тази проверка броеше всяко `svg`
    // и падна върху тематичната икона на дяла (ADR-057). „Без графика" значи без
    // ДИАГРАМА, а не без чертеж изобщо — затова се брои по белега на диаграмата.
    proveri('и вътре в него НЯМА диаграма',
      await p.$$eval('[data-sektsiya="koef-sastoyanie"] svg:not(.ikona)', (e) => e.length), 0);

    // Всяко число носи ФОРМУЛАТА си · негово изрично искане.
    // ОБХВАТ: СЕКЦИЯТА „СЪСТОЯНИЕ" · белегът `data-sastoyanie` живее в пет
    // екрана, тъй че гол селектор върху него брои чужди неща (клас Б).
    proveri('всеки от седемте носи формулата си',
      await p.$$eval('[data-sektsiya="koef-sastoyanie"] [data-sastoyanie] .formula .ime',
        (e) => e.length > 7), true);

    // ЧАКАЩИТЕ СЕ КАЗВАТ ПОИМЕННО · скрит коефициент учи, че го няма.
    proveri('и КАЗВА колко чакат период',
      await p.$eval('[data-chakat-period]', (e) => e.getAttribute('data-chakat-period')), '12');
    proveri('поименно, не като празно място',
      (await p.$eval('[data-chakat-period]', (e) => e.textContent)).includes('Марж'), true);

    // ══ 125 · СВОЙ КОЕФИЦИЕНТ · от формата до Журнала (резен 54) ═════════
    //
    // Негово, 30.08: „Можеш да вкарваш сам коефициенти."
    razdel = '125 · свой коефициент';

    // ЖИВАТА ФОРМУЛА се сглобява ПРЕДИ натискането · човекът вижда какво пише.
    // ИЗБОРЪТ СЕ ПРАВИ ИЗРИЧНО · първото писане разчиташе, че „средства" е
    // избрано по подразбиране, а по подразбиране стои ПЪРВАТА величина
    // (приходът). Проверка, вързана за подредбата на списък, се чупи при първото
    // разместване — и точно това направи тя.
    await napishiSigurno(p, '#svoy-ime', 'Покритие');
    await p.selectOption('#svoy-gore', 'sredstva_st');
    await p.selectOption('#svoy-dolu', 'zadalzheniya_st');
    proveri('формулата се сглобява преди записа',
      await p.$eval('#svoy-formulata', (e) => e.textContent),
      'Покритие = средства ÷ текущи задължения');

    const predSvoya = await broySabitiya(p);
    await sSabitie(p, () => p.click('#forma-svoy-koef button[type=submit]'));
    proveri('записът е ТОЧНО едно събитие', (await broySabitiya(p)) - predSvoya, 1);
    proveri('и коефициентът стои при СЪСТОЯНИЕТО, с формулата си',
      await p.$eval('[data-svoy="покритие"] .formula .ime', (e) => e.textContent),
      'Покритие = средства ÷ текущи задължения');
    proveri('с ЧИСЛО, не с празно',
      (await p.$eval('[data-svoy="покритие"] .chislo', (e) => e.textContent ?? '')).trim().length > 0,
      true);

    // ВРАТАТА ОТКАЗВА · и отказът се ЧЕТЕ на екрана (правило 15).
    await napishiSigurno(p, '#svoy-ime', 'Едно и също');
    await p.selectOption('#svoy-gore', 'prihod_st');
    await p.selectOption('#svoy-dolu', 'prihod_st');
    const predOtkaza = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#forma-svoy-koef button[type=submit]'));
    proveri('сбърканата рецепта НЕ влиза в Журнала', await broySabitiya(p), predOtkaza);
    proveri('а причината стои на екрана',
      (await p.$eval('#svoy-greshka', (e) => e.textContent ?? '')).includes('едно и също число'),
      true);

    // МАХАНЕТО Е ЗАПИС, не триене · Журналът расте, екранът намалява.
    const predMahaneto = await broySabitiya(p);
    await sSabitie(p, () => p.click('[data-mahni-svoy="покритие"]'));
    proveri('махането също е ЕДНО събитие', (await broySabitiya(p)) - predMahaneto, 1);
    proveri('и картата слиза от екрана',
      await p.$$eval('[data-svoy="покритие"]', (e) => e.length), 0);

    // ══ 24 · Гантът · решетката, лентите и диаграмата ════════════════════
}

/** 39 · диаграмите в Сметки */
export async function blok6(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '39 · диаграмите в Сметки';
    await naEkran(p, 'smetki', '#forma-period');
    const smetkiTekst = await p.evaluate(() => document.body.textContent);
    proveri('Сметки носи копието от Управление',
      smetkiTekst.includes('Делата · копието от Управление'), true);
    proveri('и таблицата с оцветени полета е там',
      smetkiTekst.includes('Управление на Времевия Ред в Делата'), true);
    proveri('диаграмата на Ганта стои до копието',
      await p.$$eval('svg.diagrama:not(.stalbove)', (r) => r.length), 1);
    proveri('копието се ЧЕТЕ — няма нито един сгъвач',
      await p.$$eval('#ekran button.sgavach', (r) => r.length), 0);
    // И95 обърна старото „няма форма": „да създаваш както като в Управление".
    proveri('и формата за дело Е там (И95) — един механизъм, два екрана',
      Boolean(await p.$('#d-forma-delo')), true);

    // диаграмата в Отчетите: 12 месеца, стълбовете носят числата си
    proveri('Отчетите носят стълбовете на месеците',
      await p.$$eval('svg.stalbove .stalbove-mesets', (r) => r.length), 12);

    // СВЕРКА ВХОД↔ИЗХОД НА САМИЯ СТЪЛБ: разход с ДНЕШНА дата → стълбът на
    // текущия месец расте ТОЧНО с него. Не се стъпва на закованите стари
    // дати — те излизат от 12-месечния прозорец с времето (урокът от §24).
    const stalbPredi = await p.$eval('svg.stalbove .stalbove-mesets:last-of-type',
      (g) => Number(g.dataset.razhodSt));
    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-uslugi', dostavchik: 'проба',
      opis: 'проба на стълба', suma: '33,00', nachin: 'банка',
      data: denOtDnes(0), dokument: '9001',
    });
    proveri('стълбът на текущия месец расте точно с новия разход',
      await p.$eval('svg.stalbove .stalbove-mesets:last-of-type', (g) => Number(g.dataset.razhodSt)),
      stalbPredi + 3300);

    // ══ 40 · формулната колона (И92 т.8–9) ═══════════════════════════════════

    // ══ 124 · ТАБЛИЦАТА НА ГАНТА СЕ КРИЕ · и на двете места (резен 52) ═══
    //
    // Живее ТУК, а не при §122: секцията „Делата" се появява едва когато има
    // дела, а те се раждат в този блок. Проверка, сложена преди раждането им,
    // не мери скриване — мери липса.
    //
    // Негово, 31.08: „Да и на двете места. Да може да се крие."
    razdel = '124 · таблицата на Ганта се крие';

    proveri('в Сметки стоят ДВАТА бутона',
      await p.$$eval('[data-izgled-na-delata] button', (e) => e.length), 2);
    proveri('и двата са ЖИВИ, докато и двете се виждат',
      await p.$$eval('[data-izgled-na-delata] button:not([disabled])',
        (e) => e.length), 2);

    // ПОИМЕНЕН БЕЛЕГ, не съседство. Първото писане ползваше
    // `[data-sektsiya="smetki-dela"] ~ .tablitsa` и връщаше НУЛА и в двете
    // състояния — тоест „скритата я няма" минаваше, без изобщо да мери нещо.
    // Проверка, която е зелена по грешна причина, е по-лоша от липсваща.
    const imaTablitsa = async (): Promise<boolean> =>
      (await p.$$eval('[data-smetki-gant=tablitsa]', (e) => e.length)) > 0;

    await deystvieSPrerisuvane(p, () => p.click('#smetki-kam-tablitsa'));
    proveri('скритата таблица я НЯМА', await imaTablitsa(), false);

    // ПОСЛЕДНИЯТ ИЗГЛЕД НЕ СЕ СКРИВА · и причината се КАЗВА, не се преглъща.
    proveri('и вторият бутон вече е изключен',
      await p.$eval('#smetki-kam-diagrama', (e) => (e as HTMLButtonElement).disabled), true);
    proveri('а причината стои на екрана',
      (await p.$eval('[data-izgled-na-delata] [data-posleden-izgled]',
        (e) => e.textContent)).includes('празна'), true);

    await deystvieSPrerisuvane(p, () => p.click('#smetki-kam-tablitsa'));
    proveri('върнатата таблица я ИМА пак', await imaTablitsa(), true);
}

/** 46 · потоците и акумулаторите | 47 · месецът за агента | 49 · коефициентите | 50 · цветовете при въвеждане */
export async function blok7(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '46 · потоците и акумулаторите';
    await naEkran(p, 'smetki', '#forma-razhod');

    // Отделен месец, за да не се смесва с натрупаното от по-ранните раздели.
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('формата предлага ВСИЧКИ разходни потоци',
      (await p.$$eval('#razhod-potok option', (o) => o.map((x) => (x as any).value))).sort().join('·'),
      'fakturi·krediti·zaplati');
    // Секторът се избира САМО за „Фактури" — трите, които носят ДДС. Заплатите
    // и кредитите взимат акумулатора си ОТ ПОТОКА, вместо да се крият в чужд:
    // затова тук са три, а на „вход" по-долу излизат ПЕТ.
    proveri('секторът предлага трите, които носят ДДС',
      (await p.$$eval('#razhod-sektor option', (o) => o.map((x) => (x as any).value))).sort().join('·'),
      'pokupki-materiali·pokupki-uslugi·uslugi-stroitelni');

    // Шестте записа покриват трите разходни потока и петте разходни
    // акумулатора, а „покупки · услуги" носи ДВЕ ставки — така се вижда, че
    // ставката идва от РЕДА, а не от сектора (ADR-009).
    const razhoditeNaProbata: Array<[string, string, string, string | undefined, string]> = [
      ['zaplati', '', '3400,00', undefined, 'заплати за ноември'],
      ['krediti', '', '890,00', undefined, 'вноска по кредит'],
      ['fakturi', 'pokupki-materiali', '1440,00', '20', 'цимент'],
      ['fakturi', 'pokupki-uslugi', '654,00', '9', 'нощувки на екипа'],
      ['fakturi', 'uslugi-stroitelni', '2400,00', '20', 'подизпълнител'],
      ['fakturi', 'pokupki-uslugi', '300,00', '0', 'застраховка'],
    ];
    for (let i = 0; i < razhoditeNaProbata.length; i += 1) {
      const [potok, sektor, suma, stavka, opis] = razhoditeNaProbata[i]!;
      await zapishiRazhod(p, {
        potok, sektor, dostavchik: `Доставчик ${i + 1}`, opis, suma,
        nachin: 'банка', data: '2026-11-12', dokument: `Ф-${3000 + i}`,
        ...(stavka !== undefined ? { stavka } : {}),
      });
    }

    // Приходната страна · начислява се за СЪЩИЯ месец, за да има и „изход".
    // Начисляването живее в Пари; оттам се връщаме в Сметки за месеца.
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-11');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => !(document.querySelector('#forma-nachisli button[type=submit]') as any)?.disabled);
    // ПОТОЦИТЕ „КЕШ" и „БАНКА" · как парите реално са влезли. Едно вземане,
    // платено на две части, пълни и двата — и точно затова те НЕ се събират
    // с „Наеми": иначе едни и същи 300 € биха се броили два пъти.
    for (const [suma, nachin, data] of [['100,00', 'в брой', '2026-11-06'], ['200,00', 'банка', '2026-11-07']]) {
      await p.click('[data-plati]');
      await p.waitForSelector('#forma-plashtane');
      await p.fill('#pl-suma', (suma as any));
      await p.selectOption('#pl-nachin', (nachin as any));
      await p.fill('#pl-data', (data as any));
      await sSabitie(p, () => p.click('#forma-plashtane button[type=submit]'));
    }

    // ПОТОКЪТ „Продажби" · вноска по сделка, за СЪЩИЯ месец (резен 23).
    // Без нея седмият ред щеше да стои на нула и проверката „нито един не
    // остана празен" би паднала — тоест потокът трябва да се ХРАНИ, не да се
    // извади от проверката.
    await naEkran(p, 'prodazhbi', '[data-sektsiya=prodazhbi-tekushti]');
    await p.fill('#prodazhba-kupuvach', 'Мария Иванова');
    await p.fill('#prodazhba-telefon', '0888777666');
    await p.fill('#prodazhba-tsena', '120000,00');
    await p.fill('#prodazhba-prodazhba', '118000,00');
    await p.fill('#prodazhba-smr', '8000,00');
    await p.fill('#prodazhba-pd', '110000,00');
    await sSabitie(p, () => p.click('#nova-prodazhba'));
    await p.waitForSelector('#forma-dvizhenie');
    await p.selectOption('#dvizhenie-vid', 'Капаро');
    await p.selectOption('#dvizhenie-nachin', 'банка');
    await p.fill('#dvizhenie-suma', '12000,00');
    await p.fill('#dvizhenie-data', '2026-11-09');
    await p.fill('#dvizhenie-belezhka', 'капаро по предварителния');
    await sSabitie(p, () => p.click('#forma-dvizhenie button[type=submit]'));

    await naEkran(p, 'smetki', '#forma-razhod');
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('СЕДЕМТЕ потока имат свой ред',
      await p.$$eval('.red.smetka', (r) => r.length), 7);
    proveri('и нито един не остана празен',
      await p.$$eval('.red.smetka', (r) =>
        r.every((x) => Number((x.querySelector('.suma') as any)?.dataset.st ?? 0) > 0)), true);

    // СЕДЕМТЕ АКУМУЛАТОРА · всеки с движение, всеки на своята страна
    const akumulatorite = await p.$$eval('.red.dds', (r) =>
      r.map((x) => `${x.querySelector('.znachka')?.textContent.trim()}|${x.querySelector('b')?.textContent.trim()}`));
    proveri('приходните акумулатори са на страна „изход"',
      akumulatorite.filter((a) => a.startsWith('изход')).length >= 2, true);
    proveri('и петте разходни са на „вход"',
      new Set(akumulatorite.filter((a) => a.startsWith('вход')).map((a) => a.split('|')[1])).size, 5);
    proveri('един акумулатор с ДВЕ ставки дава ДВА реда',
      akumulatorite.filter((a) => a.endsWith('покупки · услуги')).length, 2);

    // ПЕТТЕ СВЕРКИ · всяка затваря, и нулата се ПОКАЗВА (правило 7)
    const SVERKI = '.red.sverka:not(.otchet-sverka)';
    proveri('петте сверки са налице', await p.$$eval(SVERKI, (r) => r.length), 5);
    proveri('и всяка затваря',
      await p.$$eval(SVERKI, (r) =>
        r.every((x) => x.textContent.includes('затваря') && !x.textContent.includes('НЕ затваря'))), true);
    // Нулата се ПОКАЗВА, не се премълчава (правило 7): „няма разлика" трябва да
    // е различимо от „не е сверявано", затова клетката носи число, не празно.
    proveri('разликата се показва и когато е нула',
      await p.$$eval(SVERKI, (r) =>
        r.map((x) => (x.querySelectorAll('.suma')[2]?.textContent ?? '').replace(/[^\d,-]/g, ''))),
      ['0,00', '0', '0,00', '0', '0,00']);

    // ══ 47 · счетоводният агент · пилотът на ADR-005 (резен 15б) ═════════════
    //
    // Негови думи: агентът „смята и предлага, и анализира финансовите
    // показатели и отчети — оценява, предлага и показва" (ADR-005 · И11), но
    // „не записва" (И12). Тук се доказва ЦЕЛИЯТ път: месецът става ТАБЛИЦА,
    // екранът показва какво напуска устройството, и навън НЕ излиза нито едно
    // име на наемател или доставчик.
    razdel = '47 · месецът за агента';
    await naEkran(p, 'smetki', '#forma-razhod');
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('месецът стои като ТАБЛИЦА, не като сборове',
      (await p.$$eval('.red.mesetsat', (r) => r.length)) > 0, true);

    const razdeli = await p.$$eval('.red.mesetsat', (r) =>
      [...new Set(r.map((x) => x.dataset.razdel))].sort());
    proveri('и носи трите раздела', razdeli.join('·'), 'akumulator·pokazatel·potok');
    proveri('седемте потока са всичките',
      await p.$$eval('.red.mesetsat[data-razdel="potok"]', (r) => r.length), 7);

    // Δ се СМЯТА · сравнява се с ПРЕДХОДНИЯ месец, а той тук е празен
    proveri('главата назовава предходния месец',
      (await p.$eval('.glava.mesetsat', (e) => (e as any).innerText)).includes('2026-10'), true);
    const redFakturi = '.red.mesetsat:has-text("Фактури")';
    proveri('Δ на Фактури е точно сега − предходен',
      await p.$eval(redFakturi, (e) => {
        const s = Number((e.querySelectorAll('.suma')[0] as any).dataset.st);
        const pr = Number((e.querySelectorAll('.suma')[1] as any).dataset.st);
        return Number((e.querySelector('[data-delta-st]') as any).dataset.deltaSt) === s - pr;
      }), true);
    proveri('и „от нула на нещо" НЯМА процент',
      (await p.$eval(redFakturi, (e) => (e as any).innerText)).includes('%'), false);

    // ДОСЛОВНИЯТ текст, който получава моделът · сгънатото се чете с textContent
    const navan = await p.$eval('#mesetsat-tekst', (e) => e.textContent);
    proveri('текстът навън носи месеца и сравнението',
      navan.includes('МЕСЕЦ 2026-11') && navan.includes('сравнен с 2026-10'), true);
    proveri('носи и разделите с числата',
      navan.includes('Фактури') && navan.includes('Капитал'), true);
    proveri('сверките излизат С него, и нулата е ИЗПИСАНА',
      navan.includes('СВЕРКИ') && navan.includes('разлика 0.00'), true);
    proveri('и казва, че месецът е цял', navan.includes('Всички сверки затварят.'), true);

    // ГРАНИЦАТА НА ADR-029 · имената НЕ излизат
    for (const ime of ['Стройпласт', 'Домакинство', 'Доставчик 1', 'подизпълнител']) {
      proveri(`„${ime}" НЕ излиза навън`, navan.includes(ime), false);
    }
    proveri('екранът го КАЗВА, вместо да го крие',
      (await p.evaluate(() => document.body.textContent)).includes('Какво НЕ излиза'), true);

    // И таблицата НЕ пише нищо в Журнала — тя се СМЯТА при показване
    const predTablitsa = await broySabitiya(p);
    await p.fill('#smetki-period', '2026-10');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('месецът се СМЯТА, не се записва', await broySabitiya(p), predTablitsa);



    // ══ 49 · чистата диаграма на коефициентите (И96 т.5 · т.6) ═══════════════
    //
    // Негови думи: „чиста диаграма БЕЗ таблица… всички коефициенти изредени с
    // формулата на един ред и под нея сметките за периода."
    razdel = '49 · коефициентите';
    await naEkran(p, 'smetki', '#koef-koefitsient');

    proveri('диаграмата стои и е БЕЗ таблица под себе си',
      await p.$$eval('svg.koef-diagrama', (e) => e.length), 1);
    proveri('формулата е НА ЕДИН РЕД',
      (await p.$eval('#formulata', (e) => e.textContent)).includes('\n'), false);
    proveri('и е истинска формула, не име',
      (await p.$eval('#formulata', (e) => e.textContent)).includes('='), true);
    proveri('параметрите се показват ПОД нея',
      (await p.$$eval('.red.koef-parametar', (r) => r.length)) >= 2, true);
    proveri('всички коефициенти са изредени',
      (await p.$$eval('.red.koef-red', (r) => r.length)) >= 8, true);
    proveri('и всеки носи формулата си',
      await p.$$eval('.red.koef-red .koef-formula', (r) => r.every((x) => x.textContent.includes('='))), true);

    // МЕСЕЧНИТЕ се появяват САМО при стъпка месец
    proveri('при месец събираемостта я ИМА',
      Boolean(await p.$('.red.koef-red[data-koef="sabiraemost"]')), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'godina'));
    proveri('при година събираемостта я НЯМА',
      await p.$('.red.koef-red[data-koef="sabiraemost"]'), null);
    proveri('и екранът КАЗВА защо',
      (await p.evaluate(() => document.body.textContent)).includes('нямат смисъл извън месец'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'mesets'));

    // ПРИРАВНЯВАНЕТО · трите отговора, видими на екрана
    const godishni = await p.$$eval('.red.koef-red', (r) =>
      r.map((x) => `${x.dataset.koef}:${x.querySelector('.znachka')?.textContent.trim()}`));
    proveri('сумата се приравнява', godishni.includes('noi:да'), true);
    proveri('маржът НЕ ТРЯБВА да се приравнява', godishni.includes('marzh:не трябва'), true);
    proveri('ликвидността НЕ МОЖЕ', godishni.includes('likvidnost:не може'), true);

    // Отметката „към година" е ИЗКЛЮЧЕНА за онова, което не се приравнява
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'marzh'));
    proveri('при марж отметката е заключена',
      await p.$eval('#koef-godishna', (e) => (e as any).disabled), true);
    proveri('и казва ЗАЩО, вместо само да не работи',
      (await p.$eval('#zashto-priravnyavane', (e) => e.textContent)).includes('НЕ зависи от периода'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'noi'));
    proveri('при NOI отметката се отключва',
      await p.$eval('#koef-godishna', (e) => (e as any).disabled), false);

    // ВИДЪТ диаграма · дават се всички, но лъжливият се КАЗВА
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'stalbove'));
    proveri('стълбовете се появиха', (await p.$$eval('.koef-stalb', (e) => e.length)) > 0, true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'oer'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'ploshtta'));
    proveri('площ върху ОТНОШЕНИЕ се казва, че лъже',
      (await p.$eval('#kade-lazhe', (e) => e.textContent)).includes('не се сборуват'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'noi'));
    proveri('а върху ПАРИ не лъже и предупреждението пада', await p.$('#kade-lazhe'), null);

    // И нищо от това не пипа Журнала — всичко се СМЯТА при показване
    const predKoef = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'liniya'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'trimesechie'));
    proveri('коефициентите не пишат нищо в Журнала', await broySabitiya(p), predKoef);

    // ══ 113 · СПАРКЛАЙНИ и BULLET (резен 35 · ADR-095) ═══════════════════════
    //
    // „Петте + спарклайни + bullet (препоръката)" *(р59·[94])* — прието
    // предложение за графиките на v1.
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'mesets'));

    razdel = '113 · Спарклайнът · посоката СТОИ до числото';
    proveri('всеки ред носи своя спарклайн или казва защо няма',
      await p.$$eval('.red.koef-red [data-spark]', (e) => e.length),
      await p.$$eval('.red.koef-red', (e) => e.length));
    proveri('и посоката се КАЗВА с дума, не само с линия',
      (await p.$$eval('.red.koef-red [data-spark]', (e) => e.map((x) => (x as any).innerText)))
        .some((t) => /нагоре|надолу|без промяна|няма/.test(t)), true);
    proveri('линията не заменя числото · то стои до нея',
      (await p.$eval('.red.koef-red[data-koef=noi]', (e) => (e as any).innerText)).includes('€'), true);
    proveri('и всеки ред пази ФОРМУЛАТА си · тя е негово изрично искане',
      await p.$$eval('.red.koef-red .koef-formula',
        (r) => r.every((x) => (x as any).textContent.includes('='))), true);

    razdel = '113 · Bullet · само там, където занаятът дава число';
    // ШЕСТТЕ БЕЗ ОРИЕНТИР се броят по ДУМАТА си, а не по липсата на лента:
    // лента няма и когато цел ИМА, но стойност за периода липсва — две различни
    // липси, които не се сливат.
    const postizhki = await p.$$eval('.red.koef-red [data-bullet]',
      (e) => e.map((x) => (x as any).dataset.postizhka));
    // ДЕВЕТ без цел и ДЕСЕТ с цел · бяха шест и шест до резен 51, който донесе
    // седем нови коефициента: четири от тях занаятът мери с число, три не.
    proveri('девет коефициента нямат обичайно число · и го КАЗВАТ',
      postizhki.filter((x) => x === 'nyama-orientir').length, 9);
    proveri('а другите ДЕСЕТ НЕ казват това · те имат цел',
      postizhki.filter((x) => x !== 'nyama-orientir').length, 10);
    proveri('NOI е сред първите · занаятът няма едно число за него',
      await p.$eval('.red.koef-red[data-koef=noi] [data-bullet]',
        (e) => (e as any).dataset.postizhka), 'nyama-orientir');
    proveri('и го казва с ДУМИ, не с празно',
      (await p.$eval('.red.koef-red[data-koef=noi] [data-bullet]', (e) => (e as any).innerText))
        .includes('занаятът'), true);
    // ЛЕНТА СЕ РИСУВА ТОЧНО за онези, които имат И цел, И стойност.
    proveri('лентите са колкото са измеримите · нито повече, нито по-малко',
      await p.$$eval('.red.koef-red .bullet', (e) => e.length),
      postizhki.filter((x) => x === 'v-tsel' || x === 'vun').length);
    proveri('и всяка носи ИЗРЕЧЕНИЕТО на занаята до себе си',
      await p.$$eval('.bullet-kutiya',
        (e) => e.every((x) => (x as any).innerText.trim().length > 0)), true);

    razdel = '113 · Bullet · дяловете идват от JS, не от inline стил';
    // CSP `default-src self` блокира вграден стил · капанът вече е платен
    // веднъж при отстъпа на подделата (резен 12б).
    proveri('целта има сложено свойство, не празно',
      await p.$eval('.bullet-tsel',
        (e) => (e as HTMLElement).style.getPropertyValue('--ot') !== ''), true);
    proveri('и стойността също',
      await p.$eval('.bullet-stoynost',
        (e) => (e as HTMLElement).style.getPropertyValue('--dyal') !== ''), true);

    razdel = '113 · Ориентирите · изречение ↔ число, и нулата се записва';
    proveri('сверката стои на екрана',
      (await tekstNa(p, '[data-orientiri-sverka]')).replace(/\s+/g, ' ').trim(),
      'Сверка вход↔изход: 10 изречения → 10 числа, разлика 0.');

    razdel = '113 · Спарклайните не пишат НИЩО в Журнала';
    const predSpark = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'trimesechie'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'mesets'));
    proveri('нула нови събития · всичко се СМЯТА при показване',
      await broySabitiya(p), predSpark);

    // ══ 50 · цветовете при въвеждане (И96 т.1 · т.9) ═════════════════════════
    //
    // Негово: „ако има несъответствие от нея + английски и някаква друга азбука
    // да светне в ЖЪЛТ цвят… да оцветява в различен цвят и с текст да дава
    // ЛЕГЕНДА на цветовете и защо не допуска."
    razdel = '50 · цветовете при въвеждане';
    await naEkran(p, 'smetki', '#razhod-dostavchik');

    // ЛЕГЕНДАТА · осемте вида, всеки с цвят, ЗНАК и дума
    proveri('легендата стои на екрана, не в помощ',
      await p.$$eval('.red.legenda', (r) => r.length), 8);
    proveri('всеки вид носи ЗНАК, не само цвят',
      await p.$$eval('.red.legenda .problem-znak', (r) => r.every((x) => x.textContent.trim() !== '')), true);
    // Легендата стои в СГЪНАТО `<details>`, а сгънатото няма `innerText` — то е
    // празен низ, в който всяка проверка „по-дълго от" минава сама (урокът от §41).
    proveri('и всеки казва ЗАЩО',
      await p.$$eval('.red.legenda', (r) => r.every((x) => x.textContent.length > 40)), true);

    // ЧИСТОТО не свети
    await napishiSigurno(p, '#razhod-dostavchik', 'Материали ООД');
    proveri('чиста кирилица не свети',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-')), false);
    proveri('и не казва нищо', await p.$eval('#kazva-dostavchik', (e) => e.textContent.trim()), '');

    // ЧУЖДАТА АЗБУКА · ЖЪЛТО и само предупреждава.
    //
    // Пробата е с ЙЕРОГЛИФИ, не с гръцко: гръцкият знак, НАПИСАН от човека, е
    // законен вход, и браузърът с право дотегля гръцкия подпакет, за да го
    // покаже. §48 пази ЧЕРУПКАТА на приложението — надписи, бутони, глави — а
    // не онова, което човекът въвежда. Йероглифите нямат наш подпакет и падат
    // на системен шрифт, тъй че пробата не мърда джоба.
    await napishiSigurno(p, '#razhod-dostavchik', '株式会社 ЕООД');
    proveri('чуждата азбука свети ЖЪЛТО',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-zhalto')), true);
    proveri('и КАЗВА кой знак е',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('株'), true);
    proveri('но НЕ спира — тя е предупреждение',
      await p.$eval('#kazva-dostavchik', (e) => e.dataset.spira), 'ne');

    // СМЕСЕНИТЕ АЗБУКИ · ОРАНЖЕВО и СПИРА
    await p.evaluate(() => {
      const pole = document.getElementById('razhod-dostavchik');
      // „Стройпласт" с ЛАТИНСКО „o" · сглобено, за да не влезе смесена дума в кода
      (pole as any).value = `Стр${String.fromCodePoint(0x6f)}йпласт`;
      (pole as any).dispatchEvent(new Event('input', { bubbles: true }));
    });
    proveri('смесените азбуки светят ОРАНЖЕВО',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-oranzhevo')), true);
    proveri('и СПИРАТ — правило 11, преместено на входа',
      await p.$eval('#kazva-dostavchik', (e) => e.dataset.spira), 'da');
    proveri('казва се КОЯ дума е',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('смесва кирилица и латиница'), true);

    // НЕВИДИМИЯТ ЗНАК · сиво, и се казва КОЙ е
    await p.evaluate(() => {
      const pole = document.getElementById('razhod-dostavchik');
      (pole as any).value = `Цимент${String.fromCodePoint(0x200b)}ООД`;
      (pole as any).dispatchEvent(new Event('input', { bubbles: true }));
    });
    proveri('невидимият знак се хваща и се назовава',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('U+200B'), true);

    // И нищо от светенето НЕ пипа Журнала
    const predSvetene = await broySabitiya(p);
    await p.fill('#razhod-dostavchik', 'Материали ООД');
    proveri('светенето не пише нищо в Журнала', await broySabitiya(p), predSvetene);

    // ══ 51 · двете секции на Калкулатора (И96 т.2) ══════════════════════════
    //
    // Негово: „Аз не разбирам как се смята… с разлика в цената в 2 графи КАК СЕ
    // СМЯТА и какви стойности ти трябват… с легенда и пример за коефициент…
    // Ако се налага направи секция Калкулатор и секция Ценова листа."
}

/** 66 · Одитният файл · пречките се четат | 66 · Контрагентът · сбърканият ЕИК пада ТУК | 66 · Контрагентът · вписаното маха пречката */
export async function blok8(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    // ══ 66 · КОНТРАГЕНТЪТ И ЕИК-ът · без одитния файл (резен 53) ══════════
    //
    // Негово, 31.08: „НАП отпада" — пада ПОДАВАНЕТО. Проверките за одитния файл
    // паднаха с него; ЕИК-ът остава, защото контрагентът е СЧЕТОВОДСТВО, не
    // подаване, и грешният ЕИК пак трябва да пада ТУК, при вписването.
    razdel = '66 · Контрагентът · сбърканият ЕИК пада ТУК';
    await naEkran(p, 'nastroyki', '#forma-kontragent');
    await p.selectOption('#kontragent-vid', 'firma');
    await p.fill('#kontragent-ime', 'ВинтексСтрой ЕООД');
    // Сменена ПОСЛЕДНА цифра: точно грешката при преписване, която контролната
    // цифра лови. Ако минеше, файлът щеше да падне чак при НАП.
    await p.fill('#kontragent-eik', '131071588');
    await p.click('#forma-kontragent button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-kontragent')?.textContent !== '');
    proveri('сбърканата контролна цифра се КАЗВА в полето',
      (await p.$eval('#greshka-kontragent', (e) => e.textContent)).includes('контролната цифра'),
      true);

    razdel = '66 · Контрагентът · вписаното маха пречката';
    const predKontragenta = await broySabitiya(p);
    await p.fill('#kontragent-eik', '131071587');
    await p.fill('#kontragent-dds', 'BG131071587');
    await p.fill('#kontragent-adres', 'ул. Първа 1');
    await p.fill('#kontragent-grad', 'София');
    await deystvieSPrerisuvane(p, () => p.click('#forma-kontragent button[type=submit]'));
    proveri('записът влиза в ЖУРНАЛА', await broySabitiya(p), predKontragenta + 1);
    proveri('и редът се появява като ПЪЛЕН',
      (await p.$eval('.red.kontragent .znachka', (e) => e.textContent)).trim(), 'пълен');

    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 65 · ПРОВЕРКИТЕ ПРИ ВЪВЕЖДАНЕ · параметри по бизнес (И96 т.1) ══════
    //
    // Дотук `nastroykiteNaVhoda` и `smeniNastroykiteNaVhoda` бяха построени и
    // НИКОЙ не ги викаше — функция без екран (ADR-041). Ето го екрана, и ето
    // го доказателството, че параметърът стига до ЖИВАТА проверка на полето.
}

/** 65 · Проверките · параметърът стига до полето */
export async function blok9(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '65 · Проверките · параметърът стига до полето';
    await naEkran(p, 'smetki', '#razhod-dostavchik');
    await p.fill('#razhod-dostavchik', '株式会社 ЕООД');
    await p.waitForFunction(() =>
      document.querySelector('#kazva-dostavchik')?.textContent !== '',
    );
    proveri('чуждата азбука пак свети',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-')), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 64 · ПОДРЕДБАТА · всеки сам мести секциите си (И101 т.2) ═══════════
}

/**
 * 90 · ДОКУМЕНТИТЕ · ЕДИН блок, три викащи (резен 17б · ADR-073)
 *
 * Мери седем неща, и всяко с ЧИСЛО, не с таймаут (поуката на §88): броят на
 * закачените, броят на събитията, редовете в списъка. Диагноза „Timeout"
 * казва „нещо не стана"; диагноза „чакани 1, видени 0" се поправя веднага.
 */
/**
 * РЕДЪТ НА МОЯ разход · познат по СВОЕТО си име, не по позиция.
 *
 * `:has-text` е селектор на Playwright, не на браузъра: минава през
 * `p.$eval`/`p.locator`, но не и през `document.querySelector` в страницата.
 */
const MOYAT = '.red.razhod:has-text("Хартия ООД")';

/** Редът на МОЯ разход в справките · познат по своето име, не по позиция. */
const MOYAT_RED = '.red.spravkared:has-text("Октомври ООД")';

/**
 * ЗАТВАРЯ прозореца и ЧАКА воала да СИ ОТИДЕ.
 *
 * Кликът върху „Затвори" не е краят: воалът се маха в същия миг, но следващият
 * `naEkran` натиска бутон в лентата ЗАД него. Останел ли воалът за миг, кликът
 * отива в него и проходът пада с таймаут — диагноза, която казва „нещо не
 * стана" вместо „воалът е още там".
 */
async function zatvoriProzoretsa(p: KonteksNaProhoda['stranitsa']): Promise<void> {
  await p.click('.istoriya-zatvori');
  await p.waitForSelector('.istoriya-fon', { state: 'detached' });
}

/** Думата на копчето · тя носи БРОЯ, и нулата се чете от нея. */
async function dumataNaKopcheto(p: KonteksNaProhoda['stranitsa']): Promise<string> {
  return (await p.$eval(`${MOYAT} [data-dokumenti] .duma`, (e) => e.textContent ?? '')).trim();
}

export async function blok10(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // Съдържание, което НЕ би оцеляло в име, големина, час и отпечатък. Ако то
  // се появи някъде на екрана или в Журнала, значи файлът е влязъл — точно
  // онова, което двете му правила забраняват.
  const TAYNA = 'TAYNO-SADARZHANIE-NA-FAKTURATA-42';
  const patFaktura = join(tmpdir(), 'faktura-1042.pdf');
  const patPlatezhno = join(tmpdir(), 'platezhno-1042.pdf');
  await writeFile(patFaktura, `${TAYNA}\nпърви файл\n`, 'utf8');
  await writeFile(patPlatezhno, `${TAYNA}\nвтори файл\n`, 'utf8');

  razdel = '90 · Документите · копчето на реда и НУЛАТА';
  await naEkran(p, 'smetki', '#forma-period');
  // СВОЙ разход, познат по СВОЕ име. Февруарските са сторнирани от по-ранен
  // блок, а майските са три и не са мои: проверка, която стъпва върху чуждо
  // състояние, пада в деня, в който онзи блок се промени — не в деня, в който
  // нещо наистина се счупи.
  await p.fill('#smetki-period', '2026-05');
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Хартия ООД',
    opis: 'фактура с документи', suma: '120,00', nachin: 'банка',
    data: '2026-05-12', dokument: '2077',
  });
  proveri('редът на МОЯ разход е точно един',
    await p.$$eval(MOYAT, (e) => e.length), 1);
  proveri('и носи копче за документи',
    await p.$$eval(`${MOYAT} [data-dokumenti]`, (e) => e.length), 1);
  proveri('и НУЛАТА се вижда · празното не различава „няма" от „не е питано"',
    await dumataNaKopcheto(p), 'Документи · 0');

  razdel = '90 · Документите · закачането е ТОЧНО ЕДНО събитие';
  const predi = await broySabitiya(p);
  await natisniVGrupata(p, `${MOYAT} [data-dokumenti]`);
  await p.waitForSelector('#forma-dokument');
  proveri('границата се КАЗВА, не се подразбира',
    (await tekstNa(p, '.istoriya-karta')).includes('не качва'), true);
  proveri('и празният списък си има изречение',
    (await tekstNa(p, '.dokumenti-spisak')).includes('Няма закачени'), true);

  await p.selectOption('#forma-dokument select[name=vid]', 'faktura');
  await p.setInputFiles('#dokument-fayl', patFaktura);
  await deystvieSPrerisuvane(p, () => p.click('#forma-dokument button[type=submit]'));
  proveri('едно събитие, не две', await broySabitiya(p), predi + 1);
  proveri('копчето брои закаченото',
    (await dumataNaKopcheto(p)),
    'Документи · 1');

  razdel = '90 · Документите · СЪЩИЯТ файл втори път е НУЛА събития';
  const predVtoriya = await broySabitiya(p);
  await natisniVGrupata(p, `${MOYAT} [data-dokumenti]`);
  await p.waitForSelector('#forma-dokument');
  proveri('редът на документа стои в списъка',
    await p.$$eval('.dokument-red', (e) => e.length), 1);
  proveri('отпечатъкът се вижда · СЪДЪРЖАНИЕТО не',
    (await tekstNa(p, '.istoriya-karta')).includes(TAYNA), false);
  await p.selectOption('#forma-dokument select[name=vid]', 'faktura');
  await p.setInputFiles('#dokument-fayl', patFaktura);
  await p.click('#forma-dokument button[type=submit]');
  // ЕДНО и СЪЩО чакане за двата изхода, за да излезе ЧИСЛО, а не таймаут.
  // Записал ли е нещо, прозорецът се затваря сам; не е ли — стои отворен и
  // `Escape` го затваря. И в двата случая воалът си отива, и чак СЛЕД това се
  // брои. Чакане, което важи само за верния изход, дава „Timeout" — диагноза,
  // която казва „нещо не стана" (поуката на §88).
  await p.keyboard.press('Escape');
  await p.waitForSelector('.istoriya-fon', { state: 'detached' });
  // И ЕДНО ПРЕРИСУВАНЕ ОТГОРЕ · броячът в лентата се обновява при рисуване.
  // Без него счупен запис се брои ПРЕДИ да е стигнал до екрана, и числото
  // излиза вярно за миг — фалшива зелена, платена веднъж точно тук.
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
  proveri('нищо ново в Журнала · белегът мълчи', await broySabitiya(p), predVtoriya);

  razdel = '90 · Документите · вторият РАЗЛИЧЕН файл влиза';
  const predTretiya = await broySabitiya(p);
  await natisniVGrupata(p, `${MOYAT} [data-dokumenti]`);
  await p.waitForSelector('#forma-dokument');
  await p.selectOption('#forma-dokument select[name=vid]', 'platezhno');
  await p.setInputFiles('#dokument-fayl', patPlatezhno);
  await deystvieSPrerisuvane(p, () => p.click('#forma-dokument button[type=submit]'));
  proveri('едно събитие', await broySabitiya(p), predTretiya + 1);
  proveri('и копчето брои двата', await dumataNaKopcheto(p), 'Документи · 2');

  razdel = '90 · Документите · махането е ЗАПИС, не триене';
  const predMahaneto = await broySabitiya(p);
  await natisniVGrupata(p, `${MOYAT} [data-dokumenti]`);
  await p.waitForSelector('#forma-dokument');
  proveri('двата реда стоят', await p.$$eval('.dokument-red', (e) => e.length), 2);
  await deystvieSPrerisuvane(p, () => p.click('.dokument-red [data-mahni-dokument]'));
  proveri('махането ДОБАВЯ събитие', await broySabitiya(p), predMahaneto + 1);
  proveri('и списъкът намалява',
    (await dumataNaKopcheto(p)),
    'Документи · 1');

  razdel = '90 · Документите · СЪЩИЯТ блок при делото и при имота';
  await naEkran(p, 'imoti', '#forma-imot');
  proveri('имотът носи същото копче',
    (await p.$$eval('.red.imot [data-dokumenti]', (e) => e.length)) > 0, true);
  await natisniVGrupata(p, '.red.imot [data-dokumenti]');
  await p.waitForSelector('#forma-dokument');
  proveri('и същият прозорец се отваря',
    (await tekstNa(p, '.istoriya-karta h3')).includes('имот'), true);
  await zatvoriProzoretsa(p);

  await naEkran(p, 'gant', '.gant-delo');
  proveri('делото носи същото копче',
    (await p.$$eval('.gant-delo [data-dokumenti]', (e) => e.length)) > 0, true);
  await natisniVGrupata(p, '.gant-delo [data-dokumenti]');
  await p.waitForSelector('#forma-dokument');
  proveri('и пак същият прозорец',
    (await tekstNa(p, '.istoriya-karta h3')).includes('дело'), true);
  await zatvoriProzoretsa(p);
  await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * 91 · СВЕРКАТА С ИЗВЛЕЧЕНИЕТО · книгата срещу банката (резен 17в · ADR-074)
 *
 * Мери с ЧИСЛА: колко находки, колко реда, колко събития. Файлът е истински
 * CSV — същият път, по който минава и банковото извлечение на човека.
 */
export async function blok11(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  razdel = '91 · Сверката с извлечението · трите начина';
  // МЕСЕЦЪТ НА СВЕРКАТА Е ПОДВИЖЕН · четиринайсет месеца след „днес".
  // Твърдият септември работеше, докато „днес" не ВЛЕЗЕ в него: разходът
  // „проба" се пише с днешна дата (урокът от §24) и щом календарът стигна
  // 01.09, цъфна в сверката като „липсва". А „два месеца напред" се оказа
  // зает: ноември носи закованите записи на §24 и §88 (Доставчик 1–6,
  // Стройпласт), и „Нов Доставчик" открадна реда на банката. Четиринайсет
  // месеца бягат и от днешното, и от всяка закована 2026 дата — и се МЕСТЯТ
  // с календара, за да не ги настигне никога.
  const MESETSAT = (() => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 14);
    return d.toISOString().slice(0, 7);
  })();
  const denVMesetsa = (den: string): string => `${MESETSAT}-${den}`;
  const bgDen = (den: string): string => `${den}.${MESETSAT.slice(5, 7)}.${MESETSAT.slice(0, 4)}`;
  await naEkran(p, 'smetki', '#forma-period');
  await p.fill('#smetki-period', MESETSAT);
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

  // ТРИ разхода, по един на начин · и СВОИ имена, за да не зависят от чужд блок
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Банка ООД',
    opis: 'по банка', suma: '100,00', nachin: 'банка', data: denVMesetsa('10'), dokument: 'B-1',
  });
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Карта ООД',
    opis: 'с карта', suma: '200,00', nachin: 'карта', data: denVMesetsa('11'), dokument: 'K-1',
  });
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Кеш ООД',
    opis: 'в брой', suma: '300,00', nachin: 'в брой', data: denVMesetsa('12'), dokument: 'V-1',
  });
  proveri('и трите начина се предлагат в падащото меню',
    await p.$$eval('#razhod-nachin option', (e) => e.length), 3);

  proveri('преди файла секцията КАЗВА какво прави',
    (await tekstNa(p, '[data-sektsiya=smetki-izvlechenie]')).includes('не влиза в Журнала'), true);

  razdel = '91 · Сверката с извлечението · банката и картата се намират';
  // Банката носи ДВАТА · кешът НЕ е в нея, и това е нормално, не находка.
  // Редът на картата е с ДЕН по-късно — прозорецът от три дни го лови.
  const IZVLECHENIE =
    'Дата;Описание;Сума;Референция;Салдо\n' +
    `${bgDen('10')};БАНКА ООД;-100,00;R-1;900,00\n` +
    `${bgDen('12')};КАРТА ООД;-200,00;R-2;700,00\n` +
    `${bgDen('20')};НЕПОЗНАТ ЕООД;-777,00;R-3;-77,00`;
  const predSverkata = await broySabitiya(p);
  await p.setInputFiles('#fayl-izvlechenie', {
    name: 'izvlechenie-mesets.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(IZVLECHENIE, 'utf8'),
  });
  await p.waitForSelector('[data-tablitsa=izvlechenie]');
  proveri('четенето НЕ пише в Журнала · машината предлага, човек записва',
    await broySabitiya(p), predSverkata);

  const sadbi = await p.$$eval('[data-tablitsa=izvlechenie] .red.izvlechenie',
    (e) => e.map((x) => (x as HTMLElement).dataset['sadba']));
  proveri('трите записа са на екрана', sadbi.length, 3);
  proveri('по банка · СВЕРЕН', sadbi.filter((x) => x === 'nameren').length, 2);
  proveri('в брой · НЕ се търси и НЕ свети', sadbi.filter((x) => x === 'bezBanka').length, 1);
  proveri('и нищо не липсва', sadbi.filter((x) => x === 'lipsva').length, 0);

  razdel = '91 · Сверката с извлечението · находката СВЕТИ';
  proveri('редът от банката без запис в книгата се БРОИ',
    Number(await p.$eval('[data-samo-v-bankata]', (e) => e.textContent)), 1);
  proveri('и находките са ЕДНА', Number(await p.$eval('[data-nahodki]', (e) => e.textContent)), 1);

  razdel = '91 · Сверката с извлечението · двата списъка за счетоводството';
  proveri('платено на ръка · ЕДИН ред',
    await p.$eval('[data-plateno-na-raka]', (e) => (e as HTMLElement).dataset['platenoNaRaka']), '1');
  proveri('приход на ръка · НУЛА реда, и нулата се вижда',
    await p.$eval('[data-prihod-na-raka]', (e) => (e as HTMLElement).dataset['prihodNaRaka']), '0');
  proveri('кешът стои в сумата на списъка',
    (await tekstNa(p, '[data-plateno-na-raka]')).replace(/[\s\u202f\u00a0]/g, '').includes('300,00'), true);

  // ФИЛТЪРЪТ ПО ДОГОВОР ГО НЯМА ТУК · септемврийското извлечение носи САМО
  // разходи, а разходът няма договор. Филтър без какво да филтрира е надпис
  // (ADR-041).
  //
  // ПЛАТЕНО С ТАВТОЛОГИЯ: първата версия питаше същото СЛЕД „Забрави
  // извлечението" — тоест когато сверка изобщо няма и падащо меню няма как да
  // има. Счупих условието да рисува винаги и проверката пак мина.
  razdel = '114 · Филтърът по договор · без договори го НЯМА';
  proveri('сверката е на екрана', await p.$$eval('[data-tablitsa=izvlechenie]', (e) => e.length), 1);
  proveri('но падащото меню за договор НЕ се рисува · няма какво да филтрира',
    await p.$$eval('#izvlechenie-dogovor', (e) => e.length), 0);

  razdel = '91 · Сверката с извлечението · записът е на ЧОВЕК';
  const predZapisa = await broySabitiya(p);
  await deystvieSPrerisuvane(p, () => p.click('#zapishi-sverka-izvlechenie'));
  proveri('едно събитие, не две', await broySabitiya(p), predZapisa + 1);

  razdel = '91 · Сверката с извлечението · затварянето маха ЕКРАНА, не записа';
  await deystvieSPrerisuvane(p, () => p.click('#zabravi-izvlechenie'));
  proveri('таблицата си отива', await p.$$eval('[data-tablitsa=izvlechenie]', (e) => e.length), 0);
  proveri('и затварянето НЕ пише нищо', await broySabitiya(p), predZapisa + 1);

  // ══ 114 · ФИЛТЪРЪТ ПО КОНКРЕТЕН ДОГОВОР (резен 36 · ADR-096) ══════════════
  //
  // „в извлечения да се сверява с филтър за конкретен избор на договори по
  // филтруте и филттите." *(р84·[28])*
  //
  // ДВА ВИДА РЕДОВЕ В ЕДИН МЕСЕЦ · плащане ПО ДОГОВОР и разход БЕЗ договор.
  // Точно тази смес прави филтъра проверим: без нея стеснението няма какво да
  // махне, а сверката на частите няма „без договор" половина.
  await naEkran(p, 'pari', '.red.vzemane');
  await plati(p, 'Домакинство', '500,00', 'банка', '2026-02-20');
  await naEkran(p, 'smetki', '#razhod-dostavchik');
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Февруари ООД',
    opis: 'разход без договор', suma: '400,00', nachin: 'банка', data: '2026-02-18', dokument: 'F-9',
  });

  razdel = '114 · Филтърът по договор · появява се, щом има какво да филтрира';
  await naEkran(p, 'smetki', '#forma-period');
  await p.fill('#smetki-period', '2026-02');
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
  const FEVRUARI =
    'Дата;Описание;Сума;Референция;Салдо\n' +
    '20.02.2026;ДОМАКИНСТВО;500,00;F-2;500,00\n' +
    '18.02.2026;ФЕВРУАРИ ООД;-400,00;F-4;100,00\n' +
    '25.02.2026;НЕПОЗНАТ ЕООД;999,00;F-3;1 099,00';
  await p.setInputFiles('#fayl-izvlechenie', {
    name: 'izvlechenie-fevruari.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(FEVRUARI, 'utf8'),
  });
  await p.waitForSelector('#izvlechenie-dogovor');
  const broyDogovori = Number(
    await p.$eval('#izvlechenie-dogovor', (e) => (e as any).dataset.broyDogovori),
  );
  // ЕДИН договор, защото един наемател е платил този месец. Разходът НЕ става
  // избор: той няма договор, а липсата не е стойност (правило 15).
  proveri('договорите се четат от САМАТА сверка · само платилите този месец', broyDogovori, 1);
  proveri('и „всички" стои НАД тях, като първи избор',
    await p.$eval('#izvlechenie-dogovor option', (e) => (e as any).value), '');

  razdel = '114 · Филтърът по договор · частите се събират до ЦЯЛОТО';
  proveri('сверката на филтъра стои на екрана и е нула',
    (await tekstNa(p, '[data-chasti-sverka]')).replace(/[\s  ]/g, '').includes('разлика0,00'),
    true);

  razdel = '114 · Филтърът по договор · стеснява ПОГЛЕДА, не сверката';
  const predFiltar = await broySabitiya(p);
  const vsichkiRedove = await p.$$eval('[data-tablitsa=izvlechenie] .red.izvlechenie', (e) => e.length);
  const edinstveniyat = await p.$$eval('#izvlechenie-dogovor option', (e) => (e[1] as any).value);
  await deystvieSPrerisuvane(p, () => p.selectOption('#izvlechenie-dogovor', edinstveniyat));
  const sledFiltar = await p.$$eval('[data-tablitsa=izvlechenie] .red.izvlechenie', (e) => e.length);
  proveri('редовете стават по-малко · разходът отпада', sledFiltar < vsichkiRedove, true);
  proveri('и остава ТОЧНО плащането по договора', sledFiltar, 1);
  proveri('разходът НЕ се появява под договор · той няма наем',
    (await tekstNa(p, '[data-tablitsa=izvlechenie]')).includes('Февруари ООД'), false);
  proveri('екранът КАЗВА, че показва само един договор',
    (await tekstNa(p, '[data-stesneno]')).includes('Показан е САМО договорът'), true);
  proveri('и КАЗВА колко реда само в банката са скрити',
    Number(await p.$eval('[data-skriti-ot-bankata]', (e) => (e as any).dataset.skritiOtBankata)) > 0,
    true);
  proveri('филтърът НЕ пише нищо в Журнала · той е ПОГЛЕД',
    await broySabitiya(p), predFiltar);

  razdel = '114 · Филтърът по договор · „всички" връща всичко';
  await deystvieSPrerisuvane(p, () => p.selectOption('#izvlechenie-dogovor', ''));
  proveri('редовете се връщат до един',
    await p.$$eval('[data-tablitsa=izvlechenie] .red.izvlechenie', (e) => e.length), vsichkiRedove);
  proveri('и обяснението за стеснението си отива',
    await p.$$eval('[data-stesneno]', (e) => e.length), 0);
  await deystvieSPrerisuvane(p, () => p.click('#zabravi-izvlechenie'));

  // ЗАПИСАНИТЕ сверки живеят в Настройки, не в таблицата на Сметки: онази е
  // СМЕТНАТА за текущия изглед, тази чете Журнала. Проверката отива при
  // истинския им дом — инак тя щеше да мери грешната таблица и да мълчи,
  // когато записът изчезне.
  await naEkran(p, 'nastroyki', '[data-sektsiya=sverki]');
  proveri('записаната сверка стои в Журнала и се вижда',
    (await tekstNa(p, '[data-sektsiya=sverki]')).includes('Сверка с извлечението'), true);
  proveri('и носи СВОЯ период',
    (await tekstNa(p, '[data-sektsiya=sverki]')).includes(MESETSAT), true);
  await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * 92 · МЯСТОТО ЗА РАБОТА НА СЧЕТОВОДСТВОТО · четирите справки (резен 17г · ADR-075)
 * Преместени от таба НАП в Сметки (резен 53): пада ПОДАВАНЕТО, не счетоводството.
 *
 * Мери с ЧИСЛА: колко реда във всяка справка, колко месеца чакат подаване,
 * и дали подаването на справка ГАСИ находката.
 */
export async function blok12(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  /**
   * Обхватът се СМЕНЯ през полетата, като човек — и в РЕДА, в който човек го
   * прави: напред се мести първо краят, назад — първо началото. Инак средното
   * състояние е обърнат обхват, екранът отказва (с право) и плочките ги няма.
   *
   * ═══ И НАКРАЯ СЕ ЧАКА ПОКАЗАНОТО, НЕ ПОИСКАНОТО ═══
   *
   * `smeniPoleto` чака СТОЙНОСТТА на полето — а тя се появява от самото писане,
   * преди прерисуването изобщо да е почнало. Затова броенето на редовете хващаше
   * през път екрана със СТАРИЯ обхват: 22 реда вместо 4. Тук се чака надписът,
   * който секцията слага за себе си — той се появява само СЛЕД като редовете са
   * пресметнати с този обхват.
   */
  const obhvat = async (ot: string, do_: string): Promise<void> => {
    const segashnoDo = await p.$eval('#spravki-do', (e) => (e as HTMLInputElement).value);
    if (ot > segashnoDo) {
      await smeniPoleto(p, '#spravki-do', do_);
      await smeniPoleto(p, '#spravki-ot', ot);
    } else {
      await smeniPoleto(p, '#spravki-ot', ot);
      await smeniPoleto(p, '#spravki-do', do_);
    }
    const iskan = `${ot}·${do_}`;
    try {
      await p.waitForSelector(`[data-sektsiya=nap-spravki][data-obhvat="${iskan}"]`, {
        timeout: 5_000,
      });
    } catch {
      // ДИАГНОЗА С ЧИСЛО, НЕ С ТАЙМАУТ (поуката на ADR-071). Гол таймаут казва
      // „нещо не стана"; тези два надписа казват КОЕ не е стигнало до екрана.
      const pokazan = await p.$eval(
        '[data-sektsiya=nap-spravki]',
        (e) => (e as HTMLElement).dataset['obhvat'],
      );
      throw new Error(`Обхватът не стигна до екрана · искан: ${iskan} · показан: ${pokazan}`);
    }
  };

  /** Числото на една плочка · в центове, както го носи `data-st`. */
  const plochkaNaSpravka = async (klyuch: string): Promise<number> =>
    Number(await p.$eval(`[data-spravka=${klyuch}]`, (e) => (e as HTMLElement).dataset['st']));

  razdel = '92 · Справките · обхватът е СВОЙ, не месецът на файла';
  await naEkran(p, 'smetki', '[data-sektsiya=nap-spravki]');
  proveri('обхватът има свои две полета',
    await p.$$eval('#spravki-ot, #spravki-do', (e) => e.length), 2);

  // ОБЪРНАТИЯТ ОБХВАТ · „от" след „до". Човек, който мести началото напред,
  // минава ПРЕЗ това състояние, и екранът трябва да го КАЖЕ, не да падне
  // (правило 15). Проходът го намери сам: първата версия на §92 нареждаше
  // полетата точно така и се спъна.
  // ПРЕЗ `smeniPoleto`, като съседния обхват: същото поле, същият идиом. Голото
  // `fill` + `change` тук е формата на група Ж — прерисуване, тръгнало преди
  // писането, изяжда написаното и `change` се вдига върху старото (резен 44).
  await smeniPoleto(p, '#spravki-ot', '2027-06');
  proveri('обърнатият обхват се КАЗВА с думи, не срива екрана',
    (await tekstNa(p, '[data-sektsiya=nap-spravki]')).includes('Краят е преди началото'), true);

  // ПРАЗЕН обхват · далеч напред, където никой блок не пише
  await obhvat('2027-06', '2027-06');
  proveri('празният обхват го КАЗВА',
    (await tekstNa(p, '[data-tablitsa=spravki-redove]')).includes('Няма нито един ред'), true);
  proveri('и нулата чакащи месеци също се казва',
    await p.$eval('[data-sektsiya=nap-spravki] [data-chakat]', (e) => (e as HTMLElement).dataset['chakat']), '0');

  razdel = '92 · Справките · платено и НЕдекларирано СВЕТИ';
  // МЕРИ СЕ ПРЕДИ И СЛЕД · абсолютните числа зависят от чужди блокове, а
  // разликата — не (същата поука като в §90).
  await obhvat('2026-10', '2026-10');
  // И екранът КАЗВА с какъв обхват е нарисуван · инак броенето отдолу мери
  // предишното състояние и пада ПРЕЗ ПЪТ (резен 18).
  proveri('секцията казва с какъв обхват е нарисувана',
    await p.$eval('[data-sektsiya=nap-spravki]', (e) => (e as HTMLElement).dataset['obhvat']),
    '2026-10·2026-10');
  const predRedove = await p.$$eval('.red.spravkared', (e) => e.length);
  const predNedeklarirani = await plochkaNaSpravka('nedeklariraniNoPlateni');
  const predPlateni = await plochkaNaSpravka('plateni');

  await naEkran(p, 'smetki', '#forma-period');
  await p.fill('#smetki-period', '2026-10');
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Октомври ООД',
    opis: 'платено, но недекларирано', suma: '400,00', nachin: 'банка',
    data: '2026-10-08', dokument: 'O-1',
  });

  await naEkran(p, 'smetki', '[data-sektsiya=nap-spravki]');
  proveri('редът влиза в справките', await p.$$eval('.red.spravkared', (e) => e.length), predRedove + 1);
  proveri('и е ПЛАТЕН · разходът се записва вече платен',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['plateno']), 'plateno');
  proveri('и НЕ е деклариран · октомври не е подаван',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['deklarirano']), 'nedeklarirano');
  proveri('сумата на „недекларирани, но платени" расте с точно 400,00',
    (await plochkaNaSpravka('nedeklariraniNoPlateni')) - predNedeklarirani, 40_000);
  proveri('и на „платени" — със същото',
    (await plochkaNaSpravka('plateni')) - predPlateni, 40_000);
  proveri('един месец ЧАКА подаване',
    await p.$eval('[data-sektsiya=nap-spravki] [data-chakat]', (e) => e.textContent), '1');
  proveri('и той е ОКТОМВРИ',
    (await p.$$eval('[data-chaka]', (e) => e.map((x) => (x as HTMLElement).dataset['chaka']))).join(),
    '2026-10');

  razdel = '92 · Справките · четирите плочки и сверката';
  proveri('четирите справки са на екрана',
    await p.$$eval('[data-spravka]', (e) => e.length), 4);
  proveri('сверката вход↔изход затваря',
    await p.$eval('[data-sverka-spravki]', (e) => (e as HTMLElement).dataset['sverkaSpravki']), 'nared');
  proveri('и границата се БРОИ, не се твърди',
    await p.$eval('[data-lipsvashti]', (e) => (e as HTMLElement).dataset['lipsvashti']), '1');

  razdel = '92 · Справките · подаването ГАСИ находката';
  await naEkran(p, 'smetki', '#forma-period');
  await p.fill('#spravka-data', '2026-11-14');
  await sSabitie(p, () => p.click('#forma-spravka button[type=submit]'));

  await naEkran(p, 'smetki', '[data-sektsiya=nap-spravki]');
  proveri('нито един месец вече не чака',
    await p.$eval('[data-sektsiya=nap-spravki] [data-chakat]', (e) => (e as HTMLElement).dataset['chakat']), '0');
  proveri('редът вече е ДЕКЛАРИРАН',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['deklarirano']), 'deklarirano');
  proveri('и си ОСТАВА платен · подаването не мени парите',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['plateno']), 'plateno');
  proveri('а „недекларирани, но платени" се СВИВА с точно 400,00',
    predNedeklarirani - (await plochkaNaSpravka('nedeklariraniNoPlateni')) + 40_000, 40_000);
  await naEkran(p, 'imoti', '#forma-imot');
}
