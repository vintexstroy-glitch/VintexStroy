import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OBB, broySabitiya, chisloNaPoleto2, deystvieSPrerisuvane, naEkran, natisniButon, natisniVGrupata, plochka, redove, sSabitie, sSabitiya, tekstNa } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/** 19 · бутонът | 20 · колонното право | 21 · Редакторът на хедъри */
export async function blok1(ctx: KonteksNaProhoda): Promise<{ razhodPredi: string; koloniPredi: number }> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '19 · бутонът';
    await naEkran(p, 'nastroyki', '#nov-buton');
    // ТРИ ДУМИ, не две (резен 18). Дотук тук стоеше „2 / 10" и второто от
    // двете беше „Създаване на таблица" — път, който Е построен, но до който
    // НИТО ЕДИН бутон не води. Числото беше вярно за механизма и невярно за
    // човека, който натиска. Сега достижимите са ЕДИН, а другият се брои
    // отделно, с думата си.
    proveri('Настройки казват колко пътя са ДОСТИЖИМИ от бутон',
      await plochka(p, 'Построени действия'), '1 / 10');
    const patishta = await tekstNa(p, '[data-sektsiya=patishta]');
    proveri('и казват, че един е построен, но БЕЗ БУТОН',
      patishta.includes('БЕЗ БУТОН'), true);
    proveri('като сочат откъде се извървява днес',
      patishta.includes('Свали образец'), true);
    proveri('моделът от §18 се вижда тук', (await redove(p, '.red.model')).length, 1);
    // §14 тръгна начисто; оттам насам са двете прилагания на §18.
    proveri('записаните сверки са две', (await redove(p, '.red.zapisanasverka')).length, 2);

    await deystvieSPrerisuvane(p, () => p.click('#nov-buton'));
    await p.fill('#buton-ime', 'Извлечения ОББ');
    await p.fill('#buton-papka', 'Извлечения');
    await p.selectOption('#buton-deystvie', 'sveryavane-eksel');
    await p.click('[data-model="Банка ОББ"]');
    await sSabitie(p, () => p.click('#forma-buton button[type=submit]'));

    const redButon = (await redove(p, '.red.buton'))[0];
    proveri('бутонът стои в папката си', redButon?.[0], 'Извлечения ОББ Извлечения');
    proveri('посоката е ЕДНА и се вади от действието', redButon?.[2], 'чете');
    proveri('позволен е точно един модел', redButon?.[3], 'Банка ОББ');

    await naEkran(p, 'smetki', '#forma-period');
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    proveri('менюто вече има ДВА бутона', (await p.$$('[data-buton]')).length, 2);

    // ЧУЖД файл в правилния бутон → отказва се НА ГЛАС
    const chuzhd = join(tmpdir(), 'razhodi-chuzhd.csv');
    await writeFile(chuzhd, ['Доставчик;За какво;Сума;Дата;Документ', 'Х ООД;нещо;10,00;05.05.2026;9'].join('\n'));
    await natisniButon(p, 'Извлечения ОББ');
    await p.setInputFiles('#fayl-iztochnik', chuzhd);
    await p.waitForSelector('.vest.zle');
    proveri('чужд файл се отказва на глас', (await tekstNa(p, '.vest.zle')).includes('не позна нито един лист'), true);
    proveri('и НЕ се чете по стария път', (await p.$('#prilozhi')) === null, true);

    // ДВА файла наведнъж → ЕДНА партида, едно число
    const dvaA = join(tmpdir(), 'obb-may-a.csv');
    const dvaB = join(tmpdir(), 'obb-may-b.csv');
    await writeFile(dvaA, [OBB, '05.05.2026;цимент;Материали ООД;600,00;5001;20'].join('\n'));
    await writeFile(dvaB, [OBB, '12.05.2026;тухли;Тухли АД;240,00;5002;20'].join('\n'));

    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-05');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await natisniButon(p, 'Извлечения ОББ');
    await p.setInputFiles('#fayl-iztochnik', [dvaA, dvaB]);
    await p.waitForSelector('#prilozhi');
    proveri('двата файла са ЕДНА партида', (await tekstNa(p, '.karta.izbrana .dyalglava span')).includes('2 файла'), true);
    proveri('и два реда в нея', (await redove(p, '.red.razlika')).length, 2);

    // знакът · числовите колони се появяват САМИ
    const znatsi = await redove(p, '.red.znak:not(.sbor)');
    proveri('числовата колона се появява сама', znatsi.length, 1);
    proveri('и то със знак /+/', znatsi[0]?.[0], '+');
    proveri('колоната за ДДС като процент НЕ е сума', znatsi.every((x) => !x[1]?.startsWith('ДДС')), true);

    // махането е РЕШЕНИЕ и се записва в модела
    await sSabitie(p, () => p.click('.red.znak [data-znak]'));
    proveri('махнатата колона не е в нито един сбор', (await redove(p, '.red.znak:not(.sbor)'))[0]?.[0], 'махната');
    await sSabitie(p, () => p.click('.red.znak [data-znak]'));
    proveri('и се връща със същия бутон', (await redove(p, '.red.znak:not(.sbor)'))[0]?.[0], '+');

    await sSabitiya(p, 3, () => p.click('#prilozhi'));
    proveri('сверката пак е ЗАПИСАНА', (await tekstNa(p, '.vest')).includes('ЗАПИСАНА в Журнала'), true);

    await naEkran(p, 'nastroyki', '#nov-buton');
    const posledna = (await redove(p, '.red.zapisanasverka'))[0];
    proveri('последната сверка носи името на бутона', posledna?.[0]?.startsWith('Извлечения ОББ'), true);
    proveri('и казва от колко файла е', posledna?.[0]?.includes('2 файла'), true);
    proveri('разликата ѝ затваря', posledna?.[4], 'затваря');


    // ══ 20 · колонното право · Бамстера и скритата колона ════════════════
    //
    // ДОМЪТ Ѝ Е ТАБЪТ СЛУЖИТЕЛИ (И103 · резен 14): „ОТ ТАМ се дават и хедърите
    // на всички таблици." Дотук секцията стоеше в Настройки; темата смени адреса
    // си с ЕДИН ред и §58 по-долу пази, че водù насам.
    razdel = '20 · колонното право';
    await naEkran(p, 'sluzhiteli', '#forma-sluzhitel');
    // СТОПАНИНЪТ СТОИ В СПИСЪКА и без нито един вписан служител — той е първото
    // събитие в Журнала (ADR-043). Значи „още няма никого" се брои по ДРУГИТЕ.
    proveri('още няма вписан служител · само Стопанинът',
      await p.$$eval('#izbor-pravo-chovek option', (o) => o.length), 1);

    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'redaktor');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));

    await p.waitForSelector('.pravo');
    await p.selectOption('#izbor-pravo-chovek', 'ivaylo85petkov@gmail.com');
    await p.waitForSelector('.pravo');
    const optsii = await p.$$eval('[data-chovek]', (o) => o.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    proveri('служителят е записан с ролята си',
      optsii.some((r) => r.includes('Бамстера') && r.includes('редактира')), true);

    // ВНОСНИЯТ хедър „Банка ОББ" · неговите шест колони, не всички на програмата.
    const OBB_RED = '[data-hedar-red="Банка ОББ"]';
    const kletki = await p.$$eval(`${OBB_RED} .pravo`, (x) => x.map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    proveri('скритият ред показва колона по колона', kletki.length, 6);
    proveri('и казва вида на всяка', kletki[0]?.includes('променяща се'), true);

    // ══ ТРИТЕ СТОЙНОСТИ · И105 · „падащо меню с дума на избора, 3 варианта" ══
    const dumite = await p.$$eval(`${OBB_RED} .pravo select option`, (o) =>
      o.slice(0, 3).map((x) => ((x.textContent ?? '').split('\u00b7')[0] ?? '').trim()));
    proveri('всяка колона има ПАДАЩО МЕНЮ с ТРИ думи', dumite, ['редактира', 'вижда', 'скрито']);
    proveri('нищо не е стеснено в началото', (await p.$$('.pravo.pravo-skrito')).length, 0);
    proveri('и по подразбиране стои НАЙ-ШИРОКАТА',
      await p.$eval(`${OBB_RED} .pravo select`, (e) => (e as HTMLSelectElement).value), 'redaktira');

    // Числото в Сметки ПРЕДИ скриването — то не бива да мръдне.
    await naEkran(p, 'smetki', '#forma-period');
    const razhodPredi = await plochka(p, 'Разход');

    // ── СРЕДНАТА дума · новата · „гледа я, но не я пипа" ──────────────────
    await naEkran(p, 'sluzhiteli', OBB_RED);
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'vizhda'));
    await p.waitForSelector('.pravo.pravo-vizhda');
    proveri('свалената до „вижда" СЕ ВИЖДА · не пада от списъка',
      (await p.$$('.pravo.pravo-skrito')).length, 0);
    proveri('и се казва какво значи',
      (await tekstNa(p, '.vest')).includes('ще я ГЛЕДА, но няма да я пипа'), true);

    // ── СКРИЙ колоната „Сума по документа" за Бамстера ────────────────────
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'skrito'));
    await p.waitForSelector('.pravo.pravo-skrito');
    proveri('колоната е скрита за него', (await p.$$('.pravo.pravo-skrito')).length, 1);
    proveri('и се казва на глас, че сборът остава', (await tekstNa(p, '.vest')).includes('Сборът ѝ остава'), true);

    await naEkran(p, 'smetki', '#forma-period');
    proveri('СКРИТОТО ПАК СЕ СМЯТА · числото не е мръднало', await plochka(p, 'Разход'), razhodPredi);

    // Върни я — скрий → върни → скрий не се губи (правило 20)
    await naEkran(p, 'sluzhiteli', OBB_RED);
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'redaktira'));
    proveri('връща се с най-широката', (await p.$$('.pravo.pravo-skrito')).length, 0);
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'skrito'));
    proveri('и се скрива пак — ключът носи ДЕЙСТВИЕТО', (await p.$$('.pravo.pravo-skrito')).length, 1);

    // ── ИЗБОРЪТ САМО СТЕСНЯВА · и когато не действа, се КАЗВА (правило 15) ──
    // Смяна на ролята на СЪЩИЯ имейл: „наблюдава" вече стеснява до „вижда",
    // значи изборът „редактира" стои записан, но не действа — и екранът го
    // казва, вместо да го преглътне. Това е и доказателството, че този екран
    // НЕ е втора врата към достъпа (правило 14 · И57).
    await naEkran(p, 'sluzhiteli', '#forma-sluzhitel');
    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'nablyudatel');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));
    await p.waitForSelector('.pravo [data-ne-deystva]');
    proveri('на наблюдателя „редактира" НЕ действа · и се казва защо',
      (await p.$$eval('.pravo [data-ne-deystva]', (e) =>
        e.map((x) => x.textContent ?? '').join(' '))).includes('наблюдава'), true);
    // Обратно на „редактира" — останалата част от прохода го иска такъв.
    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'redaktor');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));


    // ══ 21 · Редакторът на хедъри · трите вида номенклатура ══════════════
    razdel = '21 · Редакторът на хедъри';
    await naEkran(p, 'nastroyki', '#litse-hedari');
    proveri('едно място, две лица', (await p.$$('#litse-opis')).length, 1);

    await p.selectOption('#izbor-hedar', { index: 1 });
    await p.waitForSelector('.red.redaktor');
    const koloniPredi = (await redove(p, '.red.redaktor')).length;
    proveri('колоните на хедъра се редят', koloniPredi > 0, true);
    // Клетките на реда: 0 име · 1 вид на колоната · 2 ВИД НА СТОЙНОСТТА ·
    // 3 номенклатура · 4 готово меню. Третата е новата (ADR-014).
    proveri(
      'по подразбиране колоната е БЕЗ падащо меню',
      (await redove(p, '.red.redaktor'))[0]?.[3],
      'без падащо меню',
    );

    // ══ 58 · ПЪТ №4 · ОБРАЗЕЦЪТ ОТ МОДЕЛА (ADR-041) ═══════════════════════
    //
    // `src/iznos/ot-model.ts` беше построен в резен 14 и оттогава го викаха
    // само тестовете — пътят „Създаване на таблица" нямаше бутон.

    // §58 продължава в `smetki.ts` (blok4) — там се използват `razhodPredi`
    // и `koloniPredi`, снимани тук.
    return { razhodPredi, koloniPredi };
}

/** 40 · формулната колона */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '40 · формулната колона';
    await naEkran(p, 'nastroyki', '#litse-hedari');
    await p.selectOption('#izbor-hedar', { index: 1 });
    await p.waitForSelector('.red.redaktor');

    await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
    proveri('полетата на формулата стоят СКРИТИ, докато видът не е формулна',
      await p.$eval('#mvsto-za-formula', (e) => (e as any).hidden), true);
    await p.selectOption('#kolona-vid', 'formula');
    await p.waitForFunction(() => document.getElementById('mvsto-za-formula')?.hidden === false);
    proveri('изборът „формулна" ги показва',
      await p.$eval('#mvsto-za-formula', (e) => (e as any).hidden), false);

    // операндите са колоните на СЪЩАТА таблица, с вида си до името
    const operandi = await p.$$eval('#nova-operand1 option', (o) => o.map((x) => x.textContent.trim()));
    proveri('операндите казват вида на всяка колона',
      operandi.some((t) => t.includes('·')), true);

    // Операндите се избират по ВИД, както би направил човек: сборът иска две
    // колони в евро. Избор „по ред" би хванал дата и текст — и формулата пада
    // с думи, вместо да се запише (точно каквото проверката иска да НЕ става).
    const vEvro = await p.$$eval('#nova-operand1 option', (o) =>
      o.filter((x) => x.textContent.includes('евро')).map((x) => (x as any).value));
    proveri('таблицата има поне две колони в евро за сбор', vEvro.length >= 2, true);
    await p.fill('#kolona-ime', 'Общо с ДДС');
    await p.selectOption('#nova-deystvie', 'sbor');
    await p.selectOption('#nova-operand1', vEvro[0]);
    await p.selectOption('#nova-operand2', vEvro[1]);
    await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.redaktor')].some((r) => r.textContent.includes('формула')));

    const redoveNaHedara = await redove(p, '.red.redaktor');
    const formulniyat = redoveNaHedara.find((r) => r.some((k) => k.includes('формула')));
    proveri('формулната колона казва СМЕТКАТА си в реда',
      Boolean(formulniyat?.some((k) => k.includes('сбор('))), true);
    proveri('и се вижда като ЗАТВОРЕНА — в нея не се пише',
      formulniyat?.[1], 'затворена');

    // ПРАВИЛОТО: формулната колона няма „Запиши" и няма „Премахни" — тя е сметка
    const broyKoloni = redoveNaHedara.length;
    proveri('няма бутон „Запиши" за формулната колона',
      await p.$(`[data-zapishi-kolona="${broyKoloni - 1}"]`), null);
    proveri('нито „Премахни"',
      await p.$(`[data-premahni-kolona="${broyKoloni - 1}"]`), null);

    // СМЯНАТА · само Стопанинът, и е ново събитие (правило 1)
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, `[data-smeni-formula="${broyKoloni - 1}"]`));
    await p.waitForSelector('#forma-formula');
    await p.selectOption('#forma-formula [name=deystvie]', 'razlika');
    await sSabitie(p, () => p.click('#forma-formula button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.redaktor')].some((r) => r.textContent.includes('разлика(')));
    proveri('смяната на формулата се вижда в реда',
      (await redove(p, '.red.redaktor')).some((r) => r.some((k) => k.includes('разлика('))), true);

    // и Описът на Подредба носи формулата — „всичко именувано е ред"
    await deystvieSPrerisuvane(p, () => p.click('#litse-opis'));
    await p.waitForSelector('.red.opis');
    proveri('Описът казва формулата на колоната',
      (await redove(p, '.red.opis')).some((r) => r[3]?.includes('формула: разлика(')), true);

    // ══ 20б · ЗАТВОРЕНАТА КОЛОНА И ПРАВОТО · тук, защото ТУК я има ══════════
    //
    // §20 не можеше да я провери: тогава хедърът нямаше нито една затворена
    // колона. Формулната, родена преди малко, Е затворена — тя е СМЕТКА. Значи
    // третата дума не действа за никого върху нея, дори за собственика, и
    // екранът го КАЗВА (правило 15 · ADR-065).
    razdel = '20б · затворената колона и правото';
    // ИЗБОРЪТ НА СЛУЖИТЕЛ Е ПОГЛЕД, не факт: живее в паметта на екрана и
    // презареждането го изчиства (`udobstvoto.blok1` презарежда преди този
    // блок). Затова тук се избира наново — точно каквото прави и човек.
    await naEkran(p, 'sluzhiteli', '#izbor-pravo-chovek');
    await p.selectOption('#izbor-pravo-chovek', 'ivaylo85petkov@gmail.com');
    await p.waitForSelector('.pravo');
    proveri('и до затворената пише ЗАЩО „редактира" не действа',
      (await p.$$eval('.pravo [data-ne-deystva]', (e) =>
        e.map((x) => x.textContent ?? '').join(' '))).includes('СМЕТКА'), true);
    proveri('а самата колона се ВИЖДА · затворена не значи скрита',
      (await p.$$('.pravo.pravo-skrito')).length, 1);

    // ══ 39б · границата на книгата · казана, не премълчана ═══════════════════
}

/** 40б · картата на връзките */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '40б · картата на връзките';
    await naEkran(p, 'nastroyki', '[data-sektsiya="karta"]');
    const karta = await tekstNa(p, '[data-sektsiya="karta"] .dyalglava');
    proveri('картата казва КОЛКО от колко са построени',
      /построени\s+\d+\s+от\s+\d+/.test(karta.replace(/\s+/g, ' ')), true);
    const vrazkiRedove = await redove(p, '[data-sektsiya="karta"] .red.deystvie');
    proveri('всяка връзка стои поименно',
      vrazkiRedove.length > 0, true);
    proveri('обявената НЕ се крие — стои със значка',
      vrazkiRedove.some((r) => r.some((k) => k.includes('обявена'))), true);
    proveri('построената също си личи',
      vrazkiRedove.some((r) => r.some((k) => k.includes('построена'))), true);

    // ══ 41 · ИИ-таблото (И92 т.10) ═══════════════════════════════════════════
}

/** 52 · Журналът от таблица | 52 · Журналът · четене на Журнала | 52 · Журналът · непипнатата таблица | 52 · Журналът · поправената сума | 52 · Журналът · случаят е задължителен | 52 · Журналът · записът и свръзката | 52 · Журналът · разбърканата таблица */
export async function blok4(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '52 · Журналът от таблица';
    await naEkran(p, 'nastroyki', '#zhurnal-iznesi');

    proveri('секцията стои в Настройки, не при Журнала',
      Boolean(await p.$('[data-sektsiya=zhurnalat]')), true);

    // Таблицата се строи от ИСТИНСКИТЕ събития: изнесеният файл носи ключа и
    // отпечатъка, а без тях върнатият ред не може да се свърже с Журнала.
    razdel = '52 · Журналът · четене на Журнала';
    const zhurnalat = await p.evaluate(async () => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      return await new Promise((da, ne) => {
        const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result.sort((a: any, b: any) => a.seq - b.seq));
        z.onerror = () => ne(z.error);
      });
    });
    const zhertva = (zhurnalat as any).find((s: any) => s.type === 'ПлащанеПрието');
    proveri('в Журнала има прието плащане, което да се поправи', Boolean(zhertva), true);

    const glava = ['№', 'Кога', 'Кой', 'Какво', 'Същност', 'Описание', 'Сума', 'Ключ', 'Отпечатък'];
    const kletka = (s: any, novaSuma: any = undefined) => {
      const suma = Object.keys(s.payload).find((k) => k.endsWith('_st') && typeof s.payload[k] === 'number');
      const opis = ['opis', 'prichina', 'ime', 'adres'].find((k) => typeof s.payload[k] === 'string');
      const st = suma ? s.payload[suma] : undefined;
      const pishiSuma = (v: any) =>
        `${Math.floor(v / 100).toLocaleString('bg-BG').replace(/ /g, ' ')},${String(v % 100).padStart(2, '0')}`;
      return [
        s.seq,
        s.ts,
        s.actor,
        s.type,
        `${s.sashtnost.vid}:${s.sashtnost.id}`,
        opis ? s.payload[opis] : '',
        st === undefined ? '' : pishiSuma(s.seq === zhertva.seq && novaSuma !== undefined ? novaSuma : st),
        s.opId,
        s.hash.slice(0, 16),
      ].join(';');
    };

    // НЕПИПНАТАТА таблица · нула промени, и сверката излиза
    const patBez = join(tmpdir(), 'zhurnal-bez-promyana.csv');
    await writeFile(patBez, [glava.join(';'), ...(zhurnalat as any).map((s: any) => kletka(s))].join('\n'), 'utf8');
    razdel = '52 · Журналът · непипнатата таблица';
    await p.setInputFiles('#zhurnal-fayl', patBez);
    await p.waitForFunction(() => document.body.textContent.includes('Какво ще стане'));
    proveri('непипнатата таблица дава НУЛА промени',
      await chisloNaPoleto2(p, 'zhurnal-promeni'), 0);
    proveri('и не предлага запис за файл, който не поправя нищо',
      Boolean(await p.$('#zhurnal-zapishi')), false);

    // ПОПРАВЕНА СУМА · сторно + нов запис + свръзка
    const predPopravka = await broySabitiya(p);
    const novaSuma = zhertva.payload.suma_st + 10_00;
    const patS = join(tmpdir(), 'zhurnal-s-promyana.csv');
    await writeFile(patS, [glava.join(';'), ...(zhurnalat as any).map((s: any) => kletka(s, novaSuma))].join('\n'), 'utf8');
    razdel = '52 · Журналът · поправената сума';
    await p.setInputFiles('#zhurnal-fayl', patS);
    await p.waitForFunction(() => Boolean(document.getElementById('zhurnal-zapishi')));
    proveri('поправената сума се хваща', await chisloNaPoleto2(p, 'zhurnal-promeni'), 1);
    proveri('и се показва „било → става", преди да е записано нещо',
      (await p.$eval('.red.zhurnal-promyana', (e) => e.textContent)).includes('Сума'), true);
    proveri('нищо не е влязло в Журнала още', await broySabitiya(p), predPopravka);

    // СЛУЧАЯТ Е ЗАДЪЛЖИТЕЛЕН · следа, която не обяснява нищо, е по-лоша от липсваща
    razdel = '52 · Журналът · случаят е задължителен';
    await p.click('#zhurnal-zapishi');
    await p.waitForFunction(() => document.body.textContent.includes('Кажи СЛУЧАЯ'));
    proveri('свръзка без СЛУЧАЙ се отказва С ДУМИ', await broySabitiya(p), predPopravka);

    razdel = '52 · Журналът · записът и свръзката';
    await p.fill('#zhurnal-data', '2026-08-20');
    await p.fill('#zhurnal-sluchay', 'сгрешена сума при въвеждане');
    await p.click('#zhurnal-zapishi');
    await p.waitForFunction(() => document.body.textContent.includes('свръзка С'));

    // ТРИ събития: сторно + нов запис + свръзка. Старото стои непокътнато.
    proveri('сторно + нов запис + свръзка · три събития',
      await broySabitiya(p), predPopravka + 3);
    const vestPopravka = await tekstNa(p, '.vest');
    proveri('вестта казва свръзката', vestPopravka.includes('свръзка С'), true);
    proveri('и че старите записи стоят', vestPopravka.includes('непокътнати'), true);

    // СВРЪЗКАТА се вижда · с ДВЕТЕ дати, извън графата на нормалния ред
    await naEkran(p, 'nastroyki', '#zhurnal-iznesi');
    const svrazkata = await p.$eval('.red.svrazka', (e) => e.textContent);
    proveri('свръзката стои в таблицата си', svrazkata.includes('С1'), true);
    proveri('с ДАТАТА НА ФАЙЛА, отделна от датата на записа',
      svrazkata.includes('2026-08-20'), true);
    proveri('и със случая на промяна',
      svrazkata.includes('сгрешена сума при въвеждане'), true);

    // РАЗБЪРКАНАТА таблица се отказва ЦЯЛА · пипнат № не е поправка
    const patRazbarkan = join(tmpdir(), 'zhurnal-razbarkan.csv');
    await writeFile(
      patRazbarkan,
      [glava.join(';'), ...(zhurnalat as any).map((s: any) => kletka(s).replace(/^\d+;/, '999;'))].join('\n'),
      'utf8',
    );
    const predRazbarkan = await broySabitiya(p);
    razdel = '52 · Журналът · разбърканата таблица';
    await p.setInputFiles('#zhurnal-fayl', patRazbarkan);
    await p.waitForFunction(() => document.body.textContent.includes('Заключени колони'));
    proveri('пипнатата заключена колона отказва ЦЯЛОТО внасяне',
      Boolean(await p.$('#zhurnal-zapishi')), false);
    proveri('и казва какво да се направи',
      (await tekstNa(p, '.karta.izbrana .vest.zle')).includes('изнеси я наново'), true);
    proveri('нищо не е влязло в Журнала', await broySabitiya(p), predRazbarkan);

    // ══ 53 · Личният таб · отделният Журнал и преносът (И98) ════════════════
    //
    // Негово: „Личния таб където имаш СЪЩАТА таблица от Управление… Има си и
    // отделен журнал когато се е активирал личния и НИКОГА не се смесват."
}

/** 65 · Проверките при въвеждане */
export async function blok5(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '65 · Проверките при въвеждане';
    await naEkran(p, 'nastroyki', '[data-sektsiya=parametri]');
    proveri('осемте вида стоят на екрана',
      await p.$$eval('.red.parametar', (e) => e.length), 8);
    proveri('замразеният период е ЗАКОВАН · правило 9 не е параметър',
      await p.$eval('[data-parametar="zamrazen-period"] [data-parametar-vklyuchen]', (e) => (e as any).disabled),
      true);

    // ЖИВАТА ПРОМЯНА · „дублират" минава от „спира" на „предупреждава"
    const predParametara = await broySabitiya(p);
    await p.selectOption('[data-parametar="dublikat"] [data-parametar-sila]', 'preduprezhdava');
    await p.fill('[data-parametar="dublikat"] [data-parametar-belezhka]', 'при нас се случва');
    await deystvieSPrerisuvane(p, () =>
      natisniVGrupata(p, '[data-parametar="dublikat"] [data-parametar-zapishi]'),
    );
    proveri('записът влиза в ЖУРНАЛА, не в паметта на екрана',
      await broySabitiya(p), predParametara + 1);
    proveri('и се вижда на екрана след прерисуване',
      await p.$eval('[data-parametar="dublikat"] [data-parametar-sila]', (e) => (e as any).value),
      'preduprezhdava');
    proveri('бележката на Стопанина също',
      await p.$eval('[data-parametar="dublikat"] [data-parametar-belezhka]', (e) => (e as any).value),
      'при нас се случва');

    // ОСТАНАЛИТЕ СЕДЕМ НЕ МЪРДАТ · едно събитие мени един вид.
    proveri('останалите седем са непокътнати',
      await p.$eval('[data-parametar="prazno"] [data-parametar-sila]', (e) => (e as any).value), 'spira');

    // И НАЙ-ВАЖНОТО · параметърът стига до ЖИВАТА проверка на полето.
}

/** 63 · Настройките · падащият ред | 63 · Настройките · редът ВОДИ до темата | 63 · Настройките · изскачащият прозорец */
export async function blok6(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '63 · Настройките · падащият ред';
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('пунктът „Настройки" е ПАДАЩ РЕД, не гол бутон',
      Boolean(await p.$('#nastroyki-vhod')), true);
    proveri('казва на КОГО са темите',
      (await p.$eval('#nastroyki-red', (e) => e.textContent)).includes('Стопанинът'), true);

    // СЪСТОЯНИЕТО СЕ ПОМНИ, докато екранът стои — по-ранните секции вече са
    // минавали през този пункт. Затова се проверява ПОВЕДЕНИЕТО (натискането
    // превключва), а не предполагаемо начално положение.
    const redatBeshe = await p.$eval('#nastroyki-red', (e) => (e as any).hidden);
    await p.click('#nastroyki-vhod');
    await p.waitForFunction((p0) => (document.querySelector('#nastroyki-red') as any)?.hidden !== p0, redatBeshe);
    proveri('натискането го превключва',
      await p.$eval('#nastroyki-red', (e) => (e as any).hidden), !redatBeshe);
    if (redatBeshe === false) {
      await p.click('#nastroyki-vhod');
      await p.waitForFunction(() => (document.querySelector('#nastroyki-red') as any)?.hidden === false);
    }
    proveri('и стига до ОТВОРЕН', await p.$eval('#nastroyki-red', (e) => (e as any).hidden), false);
    proveri('и състоянието се КАЗВА на четеца на екран',
      await p.$eval('#nastroyki-vhod', (e) => e.getAttribute('aria-expanded')), 'true');
    const temiteNaStopanina = await p.$$eval('#nastroyki-red [data-tema]', (b) => b.length);
    proveri('Стопанинът вижда всички теми', temiteNaStopanina >= 12, true);

    razdel = '63 · Настройките · редът ВОДИ до темата';
    // Темата е ПЪТ, не съдържание: води до онова, което вече стои, и го
    // подчертава за миг. Втори дом за същото управление би изостанал.
    // Подчертаването живее 1,6 секунди и си отива само. Затова се ЧАКА да се
    // появи, вместо да се чете след прерисуването: при бавен старт екранът
    // може да се обнови по-късно от белега и проверката да го изпусне.
    await p.click('#nastroyki-red [data-tema="pravata"]');
    await p.waitForFunction(() =>
      document.querySelector('[data-sektsiya=pravata]')?.classList.contains('podchertana'),
    );
    proveri('заведе на екрана, където живее темата',
      Boolean(await p.$('[data-sektsiya=pravata]')), true);
    proveri('и я ПОДЧЕРТА, за да се види къде е стигнало окото', true, true);

    razdel = '63 · Настройките · изскачащият прозорец';
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(() => (document.querySelector('#nastroyki-red') as any)?.hidden === false);
    await p.click('#nastroyki-red [data-tema="ezik"]');
    await p.waitForSelector('.istoriya-karta');
    proveri('темата без своя секция се отваря в ПРОЗОРЕЦ',
      (await tekstNa(p, '.istoriya-karta')).includes('Езикът на'), true);
    proveri('и казва, че езикът НЕ е право',
      (await tekstNa(p, '.istoriya-karta')).includes('НЕ е право'), true);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.istoriya-karta'));
    proveri('Escape го затваря · клавиатурата не остава в капан',
      Boolean(await p.$('.istoriya-karta')), false);

    /**
     * 63б · ПРИБРАНОТО СЕ ПРИБИРА НАИСТИНА (ADR-057г).
     *
     * Дотук тук се четеше само `hidden` — и той казваше истината за
     * РАЗМЕТКАТА, докато на екрана редът си стоеше отворен: авторското
     * `display: flex` бие `[hidden]` от таблицата на браузъра. Реалният екран
     * се е разминавал с проверката от ADR-045 насам, без нито един червен тест.
     *
     * Състоянието се ЧЕТЕ, не се предполага: по-ранните раздели минават през
     * този пункт и Escape също го прибира.
     */
    razdel = '63б · Настройките · прибраното се прибира НАИСТИНА';
    if (await p.$eval('#nastroyki-red', (e) => !(e as any).hidden)) {
      await p.click('#nastroyki-vhod');
      await p.waitForFunction(() => (document.querySelector('#nastroyki-red') as any)?.hidden === true);
    }
    proveri('прибраният ред НЕ се вижда на екрана',
      await p.$eval('#nastroyki-red', (e) => (e as HTMLElement).checkVisibility()), false);

    // ══ 70 · ПЕТТЕ ГРУПИ В ПАДАЩИЯ РЕД (негов избор, 27.08 · ADR-057б) ══════
    //
    // Шестнайсет теми в един стълб се четат като списък с покупки. Заглавието
    // казва КЪДЕ да гледаш, преди да си почнал да четеш.
    razdel = '70 · Настройките · петте групи';
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(() => (document.querySelector('#nastroyki-red') as any)?.hidden === false);
    proveri('Стопанинът вижда ПЕТ заглавия',
      await p.$$eval('#nastroyki-red .grupa-zaglavie', (e) => e.length), 5);
    proveri('и те са неговите думи, в неговия ред',
      (await p.$$eval('#nastroyki-red .grupa-zaglavie', (e) => e.map((x) => x.textContent!.trim()))).join(' · '),
      'МОЕТО · БИЗНЕСЪТ · ХОРА И ПРАВА · СЧЕТОВОДСТВО · СИГУРНОСТ И АРХИВ');

    razdel = '70 · Настройките · заглавието е НАДПИС, не бутон';
    // Клавиатурата спира само там, където има какво да се направи. Спирка,
    // която не прави нищо, е пречка, не ориентир.
    proveri('нито едно заглавие не е бутон',
      await p.$$eval('#nastroyki-red .grupa-zaglavie', (e) => e.filter((x) => x.tagName === 'BUTTON').length), 0);
    proveri('и нито едно не се хваща с Tab',
      await p.$$eval('#nastroyki-red .grupa-zaglavie', (e) => e.filter((x) => x.hasAttribute('tabindex')).length), 0);

    razdel = '70 · Настройките · групата КАЗВА името си на четеца';
    // Само `<p>` със стил би било изгубен текст между бутоните. `role="group"`
    // с `aria-labelledby` прави от надписа ИМЕ на групата.
    proveri('всяка група сочи своето заглавие',
      await p.$$eval('#nastroyki-red [role=group]', (e) =>
        e.filter((g) => {
          const nomer = g.getAttribute('aria-labelledby');
          return nomer !== null && g.querySelector(`#${nomer}`) !== null;
        }).length),
      5);

    razdel = '70 · Настройките · нито една тема не остава извън заглавие';
    const temiVGrupi = await p.$$eval('#nastroyki-red [role=group] [data-tema]', (e) => e.length);
    proveri('всички теми стоят под някое заглавие',
      await p.$$eval('#nastroyki-red [data-tema]', (e) => e.length), temiVGrupi);
    proveri('и са ОСЕМНАЙСЕТ · Стопанинът вижда всичко', temiVGrupi, 18);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 106 · ГОДИНАТА СЕ ЗАТВАРЯ (резен 28 · ADR-088) ═════════════════════
    //
    // Негово: „Става на календарна година автоматично прави пълен годишен архив
    // и променяш само през журнала назад" *(р85·[51])*. Автоматичен ЗАПИС няма
    // — автоматично е ЯВЯВАНЕТО на приключилата година и МЯРКАТА на
    // разминаването.
    //
    // Годината се взима от БРАУЗЪРА, а не се заковава: прикован „2025" щеше да
    // мине днес и да падне на 1 януари, тоест точно когато резенът работи.
    const minalata = String(new Date().getFullYear() - 1);

    razdel = '106 · Годината · приключилата се ЯВЯВА сама';
    await naEkran(p, 'smetki', '#razhod-dostavchik');
    await p.selectOption('#razhod-potok', 'fakturi');
    await p.fill('#razhod-dostavchik', 'Миналогодишен ЕООД');
    await p.fill('#razhod-opis', 'вар от миналата година');
    await p.fill('#razhod-suma', '300,00');
    await p.fill('#razhod-data', `${minalata}-11-12`);
    await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));

    await naEkran(p, 'nastroyki', '[data-sektsiya=godinite]');
    proveri('годината стои в таблицата, без да е търсена',
      Boolean(await p.$(`[data-godina="${minalata}"]`)), true);
    proveri('и състоянието ѝ е „чака затваряне"',
      await p.$eval(`[data-godina="${minalata}"]`, (e) => (e as any).dataset.sastoyanie), 'chaka');
    proveri('секцията БРОИ чакащите',
      await p.$eval('[data-sektsiya=godinite]', (e) => (e as any).dataset.chakat), '1');
    proveri('текущата НЕ се предлага за затваряне · непълна година не е архив',
      await p.$eval(`[data-godina="${String(new Date().getFullYear())}"]`, (e) => (e as any).dataset.sastoyanie),
      'tekushta');

    razdel = '106 · Годината · затварянето е ЕДИН запис';
    await sSabitie(p, () => p.click(`[data-zatvori="${minalata}"]`));
    proveri('състоянието се сменя пред очите',
      await p.$eval(`[data-godina="${minalata}"]`, (e) => (e as any).dataset.sastoyanie), 'zatvorena');
    proveri('разминаването е НУЛА и се КАЗВА',
      await p.$eval(`[data-godina="${minalata}"] [data-raznika]`, (e) => (e as any).innerText),
      'няма разминаване');
    proveri('и екранът обявява проверената нула',
      (await p.$eval('[data-godini-nula]', (e) => (e as any).innerText)),
      'Всички приключили години са затворени.');

    razdel = '106 · Годината · разминаването се МЕРИ, не се отказва';
    const prediRazminavane = await broySabitiya(p);
    await naEkran(p, 'smetki', '#razhod-dostavchik');
    await p.selectOption('#razhod-potok', 'fakturi');
    await p.fill('#razhod-dostavchik', 'Закъснял ЕООД');
    await p.fill('#razhod-opis', 'фактура, дошла късно');
    await p.fill('#razhod-suma', '120,00');
    await p.fill('#razhod-data', `${minalata}-12-20`);
    await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));
    proveri('затворената година НЕ отказва записа',
      await broySabitiya(p), prediRazminavane + 1);

    await naEkran(p, 'nastroyki', '[data-sektsiya=godinite]');
    proveri('и разминаването се появява със ЗНАК',
      await p.$eval(`[data-godina="${minalata}"] [data-raznika]`, (e) => (e as any).dataset.raznika), '1');
    proveri('с думи, разбираеми без легенда',
      await p.$eval(`[data-godina="${minalata}"] [data-raznika]`, (e) => (e as any).innerText),
      '+1 запис СЛЕД затварянето');
    proveri('състоянието става „разминава се"',
      await p.$eval(`[data-godina="${minalata}"]`, (e) => (e as any).dataset.sastoyanie), 'razminava');
    proveri('и втори бутон „Затвори" вече няма',
      await p.$$eval(`[data-zatvori="${minalata}"]`, (e) => e.length), 0);

    // ══ 62 · ТАБОВЕТЕ ОТ ТАБЛОТО · само Стопанинът (И101 т.1) ═══════════════
}
