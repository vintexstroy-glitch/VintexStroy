import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OBB, OTKRIVASHTOTO, smeniPoleto, broySabitiya, chisloNaPoleto, denOtDnes, deystvieSPrerisuvane, naEkran, natisniVGrupata, plati, plochka, redove, sSabitie, sSabitiya, smetni, tekstNa, zapishiRazhod } from '../yadro/pomoshtni.ts';
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
    proveri('и носи готовото меню от Описа', nova?.[3], 'готово меню от Описа');
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
      (await redove(p, '.red.redaktor')).pop()?.[3],
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
    proveri('Отчети има своя секция', redNaSekcii.includes('Отчети'), true);

    const poleta = await p.$$eval('.pole-otchet .etiket', (e) => e.map((x) => x.textContent.trim()));
    proveri('четирите полета, в нарочния си ред', poleta.join(' · '),
      'КАПИТАЛ · ЛИКВИДНОСТ · ВЗЕМАНИЯ · СРЕДСТВА');

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
    proveri('сверката на Капитала затваря',
      await p.$eval('.dyalglava:has(h2:text-is("Отчети")) ~ .tablitsa .red.sverka .znachka',
        (e) => e.textContent.trim()), 'затваря');

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
    await p.fill('#razhod-dostavchik', 'Материали ООД');
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
    await p.fill('#razhod-dostavchik', '株式会社 ЕООД');
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
    // ══ 85 · НАП · ПРЕДИ активиране НЯМА такъв пункт (резен 17 · И108) ══════
    razdel = '85 · НАП · пунктът се появява СЛЕД активиране';
    proveri('преди активиране НЯМА пункт „НАП" в лентата',
      await p.$$eval('[data-ekran=nap]', (e) => e.length), 0);

    await naEkran(p, 'nastroyki', '[data-sektsiya=nap]');
    proveri('но в Настройки СТОИ картата със съгласието',
      await p.$$eval('#razbrah-nap', (e) => e.length), 1);
    proveri('и кутийката НЕ е сложена предварително',
      await p.$eval('#razbrah-nap', (e) => (e as HTMLInputElement).checked), false);
    // ПЕТТЕ РИСКА се КАЗВАТ, не се подразбират.
    const riskovete = await tekstNa(p, '[data-sektsiya=nap]');
    proveri('казва се, че отговорността е на данъчно задълженото лице',
      riskovete.includes('отговаря данъчно задълженото лице'), true);
    proveri('и че електронният подпис е НЕДОСТИЖИМ от браузър',
      riskovete.includes('смарт-карта'), true);
    proveri('и че приложението НЕ подава',
      riskovete.includes('НЕ подава'), true);

    // БЕЗ ОТМЕТКА · нула събития и нула пункт.
    const predNAP = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#vklyuchi-nap'));
    proveri('без отметка връзката НЕ се включва', await broySabitiya(p), predNAP);
    proveri('и се казва защо',
      (await tekstNa(p, '.vest')).includes('не е сложена'), true);

    // С ОТМЕТКА · ЕДНО събитие, и пунктът се появява.
    await p.check('#razbrah-nap');
    await sSabitie(p, () => p.click('#vklyuchi-nap'));
    proveri('с отметка влиза ТОЧНО едно събитие', await broySabitiya(p), predNAP + 1);
    await p.waitForSelector('[data-ekran=nap]');
    proveri('и пунктът „НАП" се появява в лентата',
      await p.$$eval('[data-ekran=nap]', (e) => e.length), 1);
    proveri('а Настройки показва КОЙ е дал съгласието',
      (await tekstNa(p, '[data-sektsiya=nap]')).includes('vintexstroy@gmail.com'), true);

    razdel = '85 · НАП · типовите таблици с ЧЕСТЕН статус';
    await naEkran(p, 'nap', '[data-sektsiya=nap-tipovi]');
    proveri('деветте типови таблици се изреждат',
      await p.$$eval('[data-tipova]', (e) => e.length), 9);
    // ТРИ думи, не две · „частично" е онова, което две думи биха скрили.
    const dokade = await p.$$eval('[data-dokade]', (e) =>
      e.map((x) => (x as HTMLElement).dataset['dokade']));
    proveri('и трите състояния присъстват',
      new Set(dokade).size, 3);
    proveri('поне едно е ЧАСТИЧНО · половин работа не минава за цяла',
      dokade.includes('chastichno'), true);

    razdel = '85 · НАП · празните кодове се БРОЯТ';
    proveri('немапнатите сметки се броят на екрана',
      Number(await p.$eval('[data-broi-kodove]', (e) => (e as HTMLElement).dataset['broiKodove'])),
      13);
    proveri('и се казва ЗАЩО стоят празни',
      (await tekstNa(p, '[data-sektsiya=nap-kodove]')).includes('чл. 277а'), true);

    // ══ 86 · НАП · КАКВО НАПУСКА и достъпът за счетоводителя (резен 17в) ═══
    razdel = '86 · НАП · какво напуска устройството · ПОИМЕННО';
    await naEkran(p, 'nap', '[data-sektsiya=nap-napuska]');
    const broyImena = Number(
      await p.$eval('[data-broi-imena]', (e) => (e as HTMLElement).dataset['broiImena']),
    );
    proveri('обявява се БРОЯТ на имената, които файлът ще носи', broyImena > 0, true);
    // Сверка вход↔изход НА ЕКРАНА: обявеното число = изредените редове.
    proveri('и толкова реда наистина се изреждат',
      await p.$$eval('[data-ime-v-fayla]', (e) => e.length), broyImena);

    // ПОИМЕННО и БЕЗ КЛИК · имената са изключението от стоящо обещание, а
    // изключение, което иска клик, е обещание с една стъпка пред него.
    // (`innerText` не вижда затворено `<details>` — точно както и окото.)
    const napuska = await tekstNa(p, '[data-sektsiya=nap-napuska]');
    // Всяко обявено име се ЧЕТЕ на екрана · без да се отваря нищо. Имената идват
    // от самия екран, не от познат фиксиран текст: тестът пази СВОЙСТВОТО
    // („всяко обявено е и видяно"), а не една конкретна фирма от прохода.
    const obyaveni = await p.$$eval('[data-ime-v-fayla]', (e) =>
      e.map((x) => (x as HTMLElement).dataset['imeVFayla']!));
    proveri('всяко обявено име се ЧЕТЕ поименно, без да се отваря нищо',
      obyaveni.length > 0 && obyaveni.every((ime) => napuska.includes(ime)), true);
    proveri('казва се, че файлът НЕ тръгва сам',
      napuska.includes('НЕ тръгва наникъде сам'), true);
    proveri('и непълните се отделят с ДУМИ, не само с бройка',
      napuska.includes('БЕЗ ЕИК'), true);

    // Категориите са СПРАВКА и стоят прибрани · но се отварят и се четат.
    await p.click('[data-sektsiya=nap-napuska] details:last-of-type summary');
    proveri('изброява се и какво НЕ влиза · включително самият Журнал',
      (await tekstNa(p, '[data-sektsiya=nap-napuska]')).includes('самият Журнал'), true);

    razdel = '86 · НАП · достъпът за счетоводителя · чете и сваля, не пише';
    const dostap = await tekstNa(p, '[data-sektsiya=nap-schetovoditel]');
    proveri('двата реда стоят · ТУК и ИЗВЪН програмата',
      await p.$$eval('[data-dostap]', (e) => e.length), 2);
    proveri('трите стъпки навън са назовани · портал, тестово подаване, разписка',
      dostap.includes('portal.nra.bg') && dostap.includes('ТЕСТОВО'), true);
    proveri('и се казва, че КЕП-ът е недостижим от браузър',
      dostap.includes('смарт-карта'), true);
    // НУЛА ПЪТ КЪМ ВРАТАТА · целият екран, не само тази секция. Няма нито една
    // форма за подаване — свойство, не пропуск (пази го и `tests/nap.test.ts`).
    proveri('на целия екран НЯМА форма, която да пише',
      await p.$$eval('.telo form', (e) => e.length), 0);

    razdel = '86 · НАП · правило 23 · скритата колона ПАК се смята';
    // Сборът и броят събития се запомнят ПРЕДИ скриването — то не бива да
    // помръдне нито едното, нито другото.
    const predSkrivane = await p.$eval('[data-sektsiya=saf-t] .red.saft.sbor .suma',
      (e) => (e as HTMLElement).dataset['st']);
    const predSabitiya = await broySabitiya(p);
    await p.click('[data-tablitsa=nap-smetkoplan] .red.opis >> nth=0 >> span >> nth=2',
      { button: 'right' });
    await p.waitForSelector('.kontekstno-menyu');
    await p.click('.kontekstno-menyu button:has-text("Скрий колоната")');
    proveri('колоната изчезва от очите',
      await p.$eval('[data-tablitsa=nap-smetkoplan] .glava > span:nth-child(3)',
        (e) => (e as HTMLElement).hidden), true);
    proveri('а сборът в книгата НЕ мърда · скритото ПАК се смята',
      await p.$eval('[data-sektsiya=saf-t] .red.saft.sbor .suma',
        (e) => (e as HTMLElement).dataset['st']), predSkrivane);
    proveri('и скриването НЕ влиза в Журнала', await broySabitiya(p), predSabitiya);

    razdel = '66 · Одитният файл · пречките се четат';
    // ДОШЪЛ Е В СВОЙ ЕКРАН (резен 17б). Секцията пази `data-sektsiya=saf-t`,
    // затова всички проверки долу оцеляват — сменя се само откъде се стига.
    await naEkran(p, 'nap', '[data-sektsiya=saf-t]');
    proveri('секцията е на екрана с версията на схемата',
      (await p.$eval('[data-sektsiya=saf-t] .dyalglava span', (e) => e.textContent)).includes('1.0.2'),
      true);
    const prechkiPredi = await p.$$eval('[data-sektsiya=saf-t] .prechki li', (e) => e.length);
    proveri('пречките се ИЗБРОЯВАТ, а не се мълчи за тях', prechkiPredi > 0, true);
    proveri('и се казват с ДУМИ · фирмата липсва поименно',
      (await p.$eval('[data-sektsiya=saf-t] .prechki', (e) => e.textContent)).includes('фирмата'),
      true);

    // ОБОРОТНАТА ВЕДОМОСТ · дебит = кредит на самия екран, не само в теста.
    const sboratNaKnigata = await p.$eval('[data-sektsiya=saf-t] .red.saft.sbor', (e) => {
      const sumi = [...e.querySelectorAll('.suma')].map((s) => Number((s as any).dataset.st));
      return { debit: sumi[0], kredit: sumi[1] };
    });
    proveri('дебит = кредит на ЕКРАНА', sboratNaKnigata.debit === sboratNaKnigata.kredit, true);
    proveri('и книгата НЕ е празна за този месец', (sboratNaKnigata.debit as any) > 0, true);
    proveri('немапнатите сметки се ВИЖДАТ, а не се мълчат',
      (await p.$$eval('[data-sektsiya=saf-t] .red.saft em', (e) => e.length)) > 0, true);

    // ВПИСВАНЕТО МАХА СВОЯТА ПРЕЧКА · екранът и домейнът гледат едно число.
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

    await naEkran(p, 'nap', '[data-sektsiya=saf-t]');
    proveri('пречките са с ЕДНА по-малко',
      (await p.$$eval('[data-sektsiya=saf-t] .prechki li', (e) => e.length)) < prechkiPredi, true);
    proveri('и вече не пише, че фирмата липсва',
      (await p.$eval('[data-sektsiya=saf-t]', (e) => e.textContent)).includes('фирмата няма'),
      false);
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
  await naEkran(p, 'smetki', '#forma-period');
  await p.fill('#smetki-period', '2026-09');
  await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

  // ТРИ разхода, по един на начин · и СВОИ имена, за да не зависят от чужд блок
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Банка ООД',
    opis: 'по банка', suma: '100,00', nachin: 'банка', data: '2026-09-10', dokument: 'B-1',
  });
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Карта ООД',
    opis: 'с карта', suma: '200,00', nachin: 'карта', data: '2026-09-11', dokument: 'K-1',
  });
  await zapishiRazhod(p, {
    potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Кеш ООД',
    opis: 'в брой', suma: '300,00', nachin: 'в брой', data: '2026-09-12', dokument: 'V-1',
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
    '10.09.2026;БАНКА ООД;-100,00;R-1;900,00\n' +
    '12.09.2026;КАРТА ООД;-200,00;R-2;700,00\n' +
    '20.09.2026;НЕПОЗНАТ ЕООД;-777,00;R-3;-77,00';
  const predSverkata = await broySabitiya(p);
  await p.setInputFiles('#fayl-izvlechenie', {
    name: 'izvlechenie-septemvri.csv',
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

  razdel = '91 · Сверката с извлечението · записът е на ЧОВЕК';
  const predZapisa = await broySabitiya(p);
  await deystvieSPrerisuvane(p, () => p.click('#zapishi-sverka-izvlechenie'));
  proveri('едно събитие, не две', await broySabitiya(p), predZapisa + 1);

  razdel = '91 · Сверката с извлечението · затварянето маха ЕКРАНА, не записа';
  await deystvieSPrerisuvane(p, () => p.click('#zabravi-izvlechenie'));
  proveri('таблицата си отива', await p.$$eval('[data-tablitsa=izvlechenie]', (e) => e.length), 0);
  proveri('и затварянето НЕ пише нищо', await broySabitiya(p), predZapisa + 1);

  // ЗАПИСАНИТЕ сверки живеят в Настройки, не в таблицата на Сметки: онази е
  // СМЕТНАТА за текущия изглед, тази чете Журнала. Проверката отива при
  // истинския им дом — инак тя щеше да мери грешната таблица и да мълчи,
  // когато записът изчезне.
  await naEkran(p, 'nastroyki', '[data-sektsiya=sverki]');
  proveri('записаната сверка стои в Журнала и се вижда',
    (await tekstNa(p, '[data-sektsiya=sverki]')).includes('Сверка с извлечението'), true);
  proveri('и носи СВОЯ период',
    (await tekstNa(p, '[data-sektsiya=sverki]')).includes('2026-09'), true);
  await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * 92 · МЯСТОТО НА СЧЕТОВОДСТВОТО В НАП · четирите справки (резен 17г · ADR-075)
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
  await naEkran(p, 'nap', '[data-sektsiya=nap-spravki]');
  proveri('обхватът има свои две полета',
    await p.$$eval('#spravki-ot, #spravki-do', (e) => e.length), 2);

  // ОБЪРНАТИЯТ ОБХВАТ · „от" след „до". Човек, който мести началото напред,
  // минава ПРЕЗ това състояние, и екранът трябва да го КАЖЕ, не да падне
  // (правило 15). Проходът го намери сам: първата версия на §92 нареждаше
  // полетата точно така и се спъна.
  await deystvieSPrerisuvane(p, async () => {
    await p.fill('#spravki-ot', '2027-06');
    await p.dispatchEvent('#spravki-ot', 'change');
  });
  proveri('обърнатият обхват се КАЗВА с думи, не срива екрана',
    (await tekstNa(p, '[data-sektsiya=nap-spravki]')).includes('Краят е преди началото'), true);

  // ПРАЗЕН обхват · далеч напред, където никой блок не пише
  await obhvat('2027-06', '2027-06');
  proveri('празният обхват го КАЗВА',
    (await tekstNa(p, '[data-tablitsa=spravki-redove]')).includes('Няма нито един ред'), true);
  proveri('и нулата чакащи месеци също се казва',
    await p.$eval('[data-chakat]', (e) => (e as HTMLElement).dataset['chakat']), '0');

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

  await naEkran(p, 'nap', '[data-sektsiya=nap-spravki]');
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
    await p.$eval('[data-chakat]', (e) => e.textContent), '1');
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

  await naEkran(p, 'nap', '[data-sektsiya=nap-spravki]');
  proveri('нито един месец вече не чака',
    await p.$eval('[data-chakat]', (e) => (e as HTMLElement).dataset['chakat']), '0');
  proveri('редът вече е ДЕКЛАРИРАН',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['deklarirano']), 'deklarirano');
  proveri('и си ОСТАВА платен · подаването не мени парите',
    await p.$eval(MOYAT_RED, (e) => (e as HTMLElement).dataset['plateno']), 'plateno');
  proveri('а „недекларирани, но платени" се СВИВА с точно 400,00',
    predNedeklarirani - (await plochkaNaSpravka('nedeklariraniNoPlateni')) + 40_000, 40_000);
  await naEkran(p, 'imoti', '#forma-imot');
}
