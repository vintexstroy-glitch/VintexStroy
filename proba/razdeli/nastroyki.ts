import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naPodtabNa, naPodtab, dokatoStane, dobaviImotBezObekt, OBB, broySabitiya, chisloNaPoleto2, deystvieSPrerisuvane, naEkran, natisniButon, natisni, plochka, redove, sSabitie, sSabitiya, tekstNa, varniSeKatoStopanina, vlezKatoSluzhitelya } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Първият ВНОСЕН хедър в избора. Изборът вече реди и вградените с добавки
 * (резен 79) ПРЕДИ вносните — „избери по номер 1" би хванал вградената Имоти
 * и целият §21 щеше да редактира чужд модел.
 */
async function izberiVnosenHedar(p: KonteksNaProhoda['stranitsa']): Promise<void> {
  const vnosen = await p.$eval('#izbor-hedar', (e) =>
    [...(e as HTMLSelectElement).options].find((o) => o.value && !o.value.startsWith('vgraden:'))!.value);
  await p.selectOption('#izbor-hedar', vnosen);
}

/** 19 · бутонът | 20 · колонното право | 21 · Редакторът на хедъри */
export async function blok1(ctx: KonteksNaProhoda): Promise<{ razhodPredi: string; koloniPredi: number }> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '19 · бутонът';
    await naPodtab(p, 'biznesat', '#nov-buton');
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
    // §14 тръгна начисто; оттам насам са двете прилагания на §18. Сверките
    // живеят в подтаба СЧЕТОВОДСТВО (резен 112) — четат се там и се връщаме.
    await naPodtab(p, 'schetovodstvo', '[data-sektsiya=sverki]');
    proveri('записаните сверки са две', (await redove(p, '.red.zapisanasverka')).length, 2);
    await naPodtab(p, 'biznesat', '#nov-buton');

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

    // СВЕРКАТА НА БУТОНА се чете в подтаба на сверките (резен 112).
    await naPodtab(p, 'schetovodstvo', '[data-sektsiya=sverki]');
    const posledna = (await redove(p, '.red.zapisanasverka'))[0];
    proveri('последната сверка носи името на бутона', posledna?.[0]?.startsWith('Извлечения ОББ'), true);
    proveri('и казва от колко файла е', posledna?.[0]?.includes('2 файла'), true);
    proveri('разликата ѝ затваря', posledna?.[4], 'затваря');


    // ══ 20 · колонното право · Бамстера и скритата колона ════════════════
    //
    // ДОМЪТ Ѝ Е НАСТРОЙКИ (И129 т.2 · резен 97 · ADR-156): „в Главни настойки…
    // с 2 падащи менюта" — служител и хедър, и чак тогава клетките. Вписването
    // на човек остава в Служители — там се РАБОТИ с хора. Дотук (И103 · резен
    // 14) матрицата стоеше при тях; темата смени адреса си с ЕДИН ред и §63
    // по-долу пази, че водù насам.
    razdel = '20 · колонното право';
    await naPodtab(p, 'hora', '#izbor-pravo-chovek');
    // СТОПАНИНЪТ СТОИ В СПИСЪКА и без нито един вписан служител — той е първото
    // събитие в Журнала (ADR-043). Значи „още няма никого" се брои по ДРУГИТЕ.
    proveri('още няма вписан служител · само Стопанинът',
      await p.$$eval('#izbor-pravo-chovek option', (o) => o.length), 1);
    proveri('и без избран хедър матрицата КАЗВА какво чака, вместо да е празна',
      Boolean(await p.$('[data-pravata-izberi]')), true);

    await naPodtab(p, 'hora', '#forma-sluzhitel');
    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'redaktor');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));
    const optsii = await p.$$eval('[data-chovek]', (o) => o.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    proveri('служителят е записан с ролята си',
      optsii.some((r) => r.includes('Бамстера') && r.includes('редактира')), true);

    // ДВЕТЕ ПАДАЩИ · служителят, после хедърът; чак тогава има клетки.
    await naPodtab(p, 'hora', '#izbor-pravo-chovek');
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-pravo-chovek', 'ivaylo85petkov@gmail.com'));
    proveri('вторият човек е в падащото',
      await p.$$eval('#izbor-pravo-chovek option', (o) => o.length), 2);
    proveri('и хедърите са ГРУПИРАНИ по табове в падащото',
      (await p.$$eval('#izbor-pravo-hedar optgroup', (o) => o.length)) >= 3, true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-pravo-hedar', 'Банка ОББ'));
    await p.waitForSelector('.pravo');
    proveri('след избора матрицата показва ЕДИН хедър · един наведнъж',
      await p.$$eval('[data-hedar-red]', (e) => e.length), 1);

    // ВНОСНИЯТ хедър „Банка ОББ" · неговите шест колони, не всички на програмата.
    const OBB_RED = '[data-hedar-red="Банка ОББ"]';
    const kletki = await p.$$eval(`${OBB_RED} .pravo`, (x) => x.map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    proveri('скритият ред показва колона по колона', kletki.length, 6);
    proveri('и казва вида на всяка', kletki[0]?.includes('променяща се'), true);

    // ══ ТРИТЕ СТОЙНОСТИ · И105 · „падащо меню с дума на избора, 3 варианта" ══
    const dumite = await p.$$eval(`${OBB_RED} .pravo select option`, (o) =>
      o.slice(0, 3).map((x) => ((x.textContent ?? '').split('·')[0] ?? '').trim()));
    proveri('всяка колона има ПАДАЩО МЕНЮ с ТРИ думи', dumite, ['редактира', 'вижда', 'скрито']);
    proveri('нищо не е стеснено в началото', (await p.$$('.pravo.pravo-skrito')).length, 0);
    proveri('и по подразбиране стои НАЙ-ШИРОКАТА',
      await p.$eval(`${OBB_RED} .pravo select`, (e) => (e as HTMLSelectElement).value), 'redaktira');

    // Числото в Сметки ПРЕДИ скриването — то не бива да мръдне.
    await naEkran(p, 'smetki', '#forma-period');
    const razhodPredi = await plochka(p, 'Разход');

    // ── СРЕДНАТА дума · новата · „гледа я, но не я пипа" ──────────────────
    await naPodtab(p, 'hora', OBB_RED);
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
    await naPodtab(p, 'hora', OBB_RED);
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'redaktira'));
    proveri('връща се с най-широката', (await p.$$('.pravo.pravo-skrito')).length, 0);
    await sSabitie(p, () => p.selectOption(`${OBB_RED} .pravo select`, 'skrito'));
    proveri('и се скрива пак — ключът носи ДЕЙСТВИЕТО', (await p.$$('.pravo.pravo-skrito')).length, 1);

    // ── ИЗБОРЪТ САМО СТЕСНЯВА · и когато не действа, се КАЗВА (правило 15) ──
    // Смяна на ролята на СЪЩИЯ имейл: „наблюдава" вече стеснява до „вижда",
    // значи изборът „редактира" стои записан, но не действа — и екранът го
    // казва, вместо да го преглътне. Това е и доказателството, че този екран
    // НЕ е втора врата към достъпа (правило 14 · И57).
    await naPodtab(p, 'hora', '#forma-sluzhitel');
    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'nablyudatel');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));
    await naPodtab(p, 'hora', OBB_RED);
    await p.waitForSelector('.pravo [data-ne-deystva]');
    proveri('на наблюдателя „редактира" НЕ действа · и се казва защо',
      (await p.$$eval('.pravo [data-ne-deystva]', (e) =>
        e.map((x) => x.textContent ?? '').join(' '))).includes('наблюдава'), true);
    // Обратно на „редактира" — останалата част от прохода го иска такъв.
    await naPodtab(p, 'hora', '#forma-sluzhitel');
    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'redaktor');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));


    // ══ 21 · Редакторът на хедъри · трите вида номенклатура ══════════════
    razdel = '21 · Редакторът на хедъри';
    await naPodtab(p, 'biznesat', '#litse-hedari');
    proveri('едно място, две лица', (await p.$$('#litse-opis')).length, 1);

    await izberiVnosenHedar(p);
    await p.waitForSelector('.red.redaktor');
    const koloniPredi = (await redove(p, '.red.redaktor')).length;
    proveri('колоните на хедъра се редят', koloniPredi > 0, true);
    // Клетките на реда: 0 РЕД (дръжка и стрелки) · 1 име · 2 вид на колоната ·
    // 3 ВИД НА СТОЙНОСТТА · 4 номенклатура · 5 готово меню. Нулевата е новата
    // (резен 55) и размести всички след себе си — проходът я хвана веднага.
    proveri(
      'по подразбиране колоната е БЕЗ падащо меню',
      (await redove(p, '.red.redaktor'))[0]?.[4],
      'без падащо меню',
    );

    // ══ 126 · КОЛОНАТА СЕ МЕСТИ · стрелки и влачене (резен 55 · M15) ═════
    //
    // Описът я държеше като „ръчно пренареждане чрез влачене" — удобство. То не
    // е: местенето ПРЕНОМЕРИРА, а деветте места, които сочат колоната по номер,
    // трябва да се пренесат заедно с нея.
    razdel = '126 · колоната се мести';

    const imenata = async (): Promise<string[]> =>
      p.$$eval('.red.redaktor [data-ime-vhod]', (e) => e.map((x) => (x as HTMLInputElement).value));
    const predRedbata = await imenata();
    proveri('хедърът има поне ТРИ колони, за да има какво да се мести',
      predRedbata.length >= 3, true);

    // ПЪРВАТА не се вдига нагоре, ПОСЛЕДНАТА не слиза надолу · изключено ≠
    // липсващо: бутоните ги ИМА и се виждат защо не работят (правило 15).
    proveri('стрелката нагоре на първата е изключена',
      await p.$eval('[data-gore="0"]', (e) => (e as HTMLButtonElement).disabled), true);
    proveri('а на втората — не',
      await p.$eval('[data-gore="1"]', (e) => (e as HTMLButtonElement).disabled), false);

    const predSabitieto = await broySabitiya(p);
    await sSabitie(p, () => p.click('[data-gore="1"]'));
    proveri('местенето е ТОЧНО едно събитие', (await broySabitiya(p)) - predSabitieto, 1);

    const sledRedbata = await imenata();
    proveri('двете първи колони си размениха местата',
      [sledRedbata[0], sledRedbata[1]], [predRedbata[1], predRedbata[0]]);
    proveri('и НИТО ЕДНА не се загуби', sledRedbata.length, predRedbata.length);

    // ВРЪЩАНЕТО е същото действие в обратна посока · не е „отмяна".
    await sSabitie(p, () => p.click('[data-dolu="0"]'));
    proveri('обратното местене връща реда', await imenata(), predRedbata);

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
    await naPodtab(p, 'biznesat', '#litse-hedari');
    await izberiVnosenHedar(p);
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
      formulniyat?.[2], 'затворена');

    // ПРАВИЛОТО: формулната колона няма „Запиши" и няма „Премахни" — тя е сметка
    const broyKoloni = redoveNaHedara.length;
    proveri('няма бутон „Запиши" за формулната колона',
      await p.$(`[data-zapishi-kolona="${broyKoloni - 1}"]`), null);
    proveri('нито „Премахни"',
      await p.$(`[data-premahni-kolona="${broyKoloni - 1}"]`), null);

    // СМЯНАТА · само Стопанинът, и е ново събитие (правило 1)
    await deystvieSPrerisuvane(p, () => natisni(p, `[data-smeni-formula="${broyKoloni - 1}"]`));
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
    await naPodtab(p, 'hora', '#izbor-pravo-chovek');
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-pravo-chovek', 'ivaylo85petkov@gmail.com'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-pravo-hedar', 'Банка ОББ'));
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
    await naPodtab(p, 'sigurnost', '[data-sektsiya="karta"]');
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
    await naPodtab(p, 'sigurnost', '#zhurnal-iznesi');

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
    await naPodtab(p, 'sigurnost', '#zhurnal-iznesi');
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
    await naPodtab(p, 'schetovodstvo', '[data-sektsiya=parametri]');
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
      natisni(p, '[data-parametar="dublikat"] [data-parametar-zapishi]'),
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
    proveri('и са ДЕВЕТНАЙСЕТ · Стопанинът вижда всичко', temiVGrupi, 19);
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
    await naPodtabNa(p, 'smetki', 'razhod', '#razhod-dostavchik');
    await p.selectOption('#razhod-potok', 'fakturi');
    await p.fill('#razhod-dostavchik', 'Миналогодишен ЕООД');
    await p.fill('#razhod-opis', 'вар от миналата година');
    await p.fill('#razhod-suma', '300,00');
    await p.fill('#razhod-data', `${minalata}-11-12`);
    await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));

    await naPodtab(p, 'sigurnost', '[data-sektsiya=godinite]');
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
    await naPodtabNa(p, 'smetki', 'razhod', '#razhod-dostavchik');
    await p.selectOption('#razhod-potok', 'fakturi');
    await p.fill('#razhod-dostavchik', 'Закъснял ЕООД');
    await p.fill('#razhod-opis', 'фактура, дошла късно');
    await p.fill('#razhod-suma', '120,00');
    await p.fill('#razhod-data', `${minalata}-12-20`);
    await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));
    proveri('затворената година НЕ отказва записа',
      await broySabitiya(p), prediRazminavane + 1);

    await naPodtab(p, 'sigurnost', '[data-sektsiya=godinite]');
    proveri('и разминаването се появява със ЗНАК',
      await p.$eval(`[data-godina="${minalata}"] [data-raznika]`, (e) => (e as any).dataset.raznika), '1');
    proveri('с думи, разбираеми без легенда',
      await p.$eval(`[data-godina="${minalata}"] [data-raznika]`, (e) => (e as any).innerText),
      '+1 запис СЛЕД затварянето');
    proveri('състоянието става „разминава се"',
      await p.$eval(`[data-godina="${minalata}"]`, (e) => (e as any).dataset.sastoyanie), 'razminava');
    proveri('и втори бутон „Затвори" вече няма',
      await p.$$eval(`[data-zatvori="${minalata}"]`, (e) => e.length), 0);

    // ══ 111 · ПЕТТЕ МОДЕЛА ПО БРАНШ (резен 33 · ADR-093) ═════════

    razdel = '111 · Браншовете · петте стоят с имената си';
    await naPodtab(p, 'biznesat', '[data-sektsiya=branshove]');
    proveri('петте са на екрана · нито четири, нито шест',
      await p.$$eval('[data-tablitsa=branshove] tbody tr', (e) => e.length), 5);
    proveri('секцията ГО КАЗВА · числото е негово',
      await p.$eval('[data-sektsiya=branshove]', (e) => (e as any).dataset.vsichki), '5');
    proveri('и имената са НЕГОВИТЕ, в НЕГОВИЯ ред',
      await p.$$eval('[data-tablitsa=branshove] tbody tr td:first-child',
        (e) => e.map((x) => (x as HTMLElement).innerText).join(' · ')),
      'Строителна фирма · Магазин · Склад · Услуги · Ресторант');

    razdel = '111 · Браншовете · построеният е ЕДИН и се БРОИ';
    proveri('екранът брои построените',
      await p.$eval('[data-sektsiya=branshove]', (e) => (e as any).dataset.postroeni), '1');
    proveri('и това е СТРОИТЕЛНАТА фирма · тя е днешното приложение',
      await p.$eval('[data-bransh=stroitelna] td:nth-child(3)', (e) => (e as HTMLElement).innerText),
      '7 сектора · 7 потока — това е днешното приложение');
    proveri('а четирите казват ЧЕСТНО, че чакат',
      await p.$$eval('[data-tablitsa=branshove] tbody tr.chaka', (e) => e.length), 4);
    proveri('без да показват ЧУЖДИ числа',
      await p.$eval('[data-bransh=magazin] td:nth-child(3)', (e) => (e as HTMLElement).innerText),
      'името е негово · подредената база чака неговата дума');

    razdel = '111 · Браншовете · адресът стои до името';
    // Находка без адрес не се слива (правило 26) — и тук адресите са ДВА,
    // защото двете му изречения от същия ден са ЕДНО решение на две части.
    proveri('първите две сочат първото му изречение',
      await p.$eval('[data-bransh=magazin] td:last-child', (e) => (e as HTMLElement).innerText), 'р83·[132]');
    proveri('а трите останали — второто, същия ден',
      await p.$eval('[data-bransh=restorant] td:last-child', (e) => (e as HTMLElement).innerText), 'р83·[134]');

    razdel = '111 · Браншовете · празният НЕ се предлага за избор';
    // Бутон без последица е надпис (ADR-041): избор на празен модел не би
    // сложил нито един сектор, но човекът би останал с чувство, че е настроил нещо.
    proveri('таблицата няма НИТО ЕДИН бутон за избор',
      await p.$$eval('[data-tablitsa=branshove] button', (e) => e.length), 0);

    razdel = '111 · Браншовете · сверката и нулата';
    proveri('сверката вход↔изход стои на екрана · и нулата се записва',
      (await tekstNa(p, '[data-branshove-sverka]')).replace(/\s+/g, ' ').trim(),
      'Сверка вход↔изход: 5 → 5, разлика 0.');

    // ══ 62 · ТАБОВЕТЕ ОТ ТАБЛОТО · само Стопанинът (И101 т.1) ═══════════════
}

/** 137 · добавената колона на вградена таблица (резен 79 · ADR-137) */
export async function blok7(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '137 · добавената колона на вградената';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ── НАСТРОЙКИ · вградената стои в избора и се редактира като всеки хедър ──
  await naPodtab(p, 'biznesat', '#litse-hedari');
  // §40 остави редактора на лицето „Опис" — изборът на хедър живее в първото.
  await deystvieSPrerisuvane(p, () => p.click('#litse-hedari'));
  await p.waitForSelector('#izbor-hedar');
  const optsii = await p.$$eval('#izbor-hedar option', (o) =>
    o.map((x) => ({ v: (x as HTMLOptionElement).value, t: x.textContent ?? '' })));
  proveri('вградената Имоти стои в избора на хедър, с думата „вградена"',
    optsii.some((x) => x.v === 'vgraden:imoti' && x.t.includes('вградена')), true);

  await p.selectOption('#izbor-hedar', 'vgraden:imoti');
  await p.waitForSelector('[data-bez-tab-vgradena]');
  proveri('табът на вградената не се избира — и се КАЗВА (правило 15)',
    (await p.$$('#izbor-tab-na-hedar')).length, 0);
  proveri('образец по вградена не се сваля — и това се казва',
    (await p.$$('[data-bez-obrazets]')).length, 1);
  proveri('празната казва, че още няма добавки',
    (await tekstNa(p, '[data-sektsiya=hedari]')).includes('Още няма добавени колони'), true);

  // ── РАЖДАНЕТО · първата добавка е ЕДНО събитие МоделЗаписан ──────────────
  await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
  await p.fill('#kolona-ime', 'Изложение');
  await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
  await p.waitForSelector('.red.redaktor');
  proveri('добавката се реди в Редактора · само тя, без кодовите',
    (await redove(p, '.red.redaktor')).length, 1);

  // ── ИМОТИ · добавката застава СЛЕД кодовите, с филтърна глава ────────────
  await naEkran(p, 'imoti', '[data-tablitsa=imoti]');
  await p.waitForSelector('[data-tablitsa=imoti] .glavicha[data-kolona="dobavka-0"]');
  proveri('главата на добавката носи филтърната стрелка на двигателя',
    (await p.$$('[data-tablitsa=imoti] .glavicha[data-kolona="dobavka-0"] [data-filtar-glava]')).length, 1);
  const glavi = await p.$$eval('[data-tablitsa=imoti] .glava .glavicha', (e) =>
    e.map((x) => x.getAttribute('data-ime') ?? ''));
  proveri('и застава СЛЕД кодовите колони', glavi.at(-1), 'Изложение');
  proveri('празната клетка се казва с „—", не с празно',
    await p.$eval('.red.imot [data-redakt^="dobavka·"]', (e) => e.textContent?.trim()), '—');

  // ── КЛЕТКАТА · двоен клик пише през Вратата, стойността ОСТАВА ───────────
  const predi = await broySabitiya(p);
  await p.dblclick('.red.imot [data-redakt^="dobavka·"]');
  await p.waitForSelector('.red.imot .kletka-redaktor');
  await p.fill('.red.imot .kletka-redaktor', 'южно');
  await p.keyboard.press('Enter');
  await p.waitForFunction((b) => {
    const t = document.querySelector('[data-sabitiya]')?.textContent ?? '';
    return Number(t) === b + 1;
  }, predi).catch(() => {});
  proveri('записът на клетката е ТОЧНО едно събитие', (await broySabitiya(p)) - predi, 1);
  await p.waitForFunction(() =>
    [...document.querySelectorAll('.red.imot [data-redakt]')].some((e) => e.textContent?.includes('южно')));
  proveri('клетката показва записаното',
    (await p.$$eval('.red.imot [data-redakt^="dobavka·"]', (e) =>
      e.map((x) => x.textContent?.trim() ?? ''))).includes('южно'), true);

  // смяната на екран не я губи — тя е в Журнала, не в паметта на екрана
  await naPodtab(p, 'biznesat', '#litse-hedari');
  await naEkran(p, 'imoti', '[data-tablitsa=imoti]');
  await p.waitForSelector('[data-tablitsa=imoti] .glavicha[data-kolona="dobavka-0"]');
  proveri('и стои след смяна на екрана — Журналът я носи',
    (await p.$$eval('.red.imot [data-redakt^="dobavka·"]', (e) =>
      e.map((x) => x.textContent?.trim() ?? ''))).includes('южно'), true);
}

/** 138 · името на кодовата колона (резен 80 · ADR-138) */
export async function blok8(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '138 · името на кодовата колона';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naPodtab(p, 'biznesat', '#litse-hedari');
  await deystvieSPrerisuvane(p, () => p.click('#litse-hedari'));
  await p.waitForSelector('#izbor-hedar');
  await p.selectOption('#izbor-hedar', 'vgraden:imoti');
  await p.waitForSelector('.red.kodova');

  const kodovi = await redove(p, '.red.kodova');
  proveri('кодовите колони се редят с кръщелното си име', kodovi.length >= 5, true);
  proveri('и първата е „Място и единица"', kodovi[0]?.[1], 'Имот · Обект');

  // ── НОВОТО ИМЕ · едно събитие МоделЗаписан, показва се навсякъде ─────────
  await p.fill('[data-ime-kodova="0"]', 'Обект');
  await sSabitie(p, () => p.click('[data-zapishi-kodova="0"]'));
  await p.waitForSelector('[data-ime-kodova="0"]');
  proveri('полето помни новото име след прерисуване',
    await p.$eval('[data-ime-kodova="0"]', (e) => (e as HTMLInputElement).value), 'Обект');
  proveri('а кръщелното стои до него — не е изтрито',
    (await redove(p, '.red.kodova'))[0]?.[1], 'Имот · Обект');

  await naEkran(p, 'imoti', '[data-tablitsa=imoti]');
  proveri('Имоти рисува НОВОТО име в главата',
    await p.$eval('[data-tablitsa=imoti] .glava .glavicha', (e) => e.getAttribute('data-ime')), 'Обект');

  // ── ПРАЗНОТО ВРЪЩА кръщелното · връщане, не грешка ───────────────────────
  await naPodtab(p, 'biznesat', '#litse-hedari');
  await p.waitForSelector('[data-ime-kodova="0"]');
  await p.fill('[data-ime-kodova="0"]', '');
  await sSabitie(p, () => p.click('[data-zapishi-kodova="0"]'));
  await naEkran(p, 'imoti', '[data-tablitsa=imoti]');
  proveri('празното връща кръщелното',
    await p.$eval('[data-tablitsa=imoti] .glava .glavicha', (e) => e.getAttribute('data-ime')),
    'Имот · Обект');
}

/** 139 · агрегатът по редове · наблюдателят (резен 81 · ADR-139) */
export async function blok9(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '139 · агрегатът по редове';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ── РАЖДАНЕТО · формулна колона „брой по редове" върху добавка ───────────
  await naPodtab(p, 'biznesat', '#litse-hedari');
  await p.waitForSelector('#izbor-hedar');
  // Изборът прерисува и при ВЕЧЕ избрания хедър — без изчакване кликът долу
  // се брои срещу ГРЕШНОТО прерисуване и формата „закъснява" (гонка, платена
  // с два пуска на прохода).
  await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-hedar', 'vgraden:imoti'));
  await p.waitForSelector('.red.redaktor');

  await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
  await p.waitForSelector('#forma-kolona');
  const deystviya = await p.$$eval('#nova-deystvie option', (o) => o.map((x) => x.textContent ?? ''));
  proveri('конструкторът предлага и действията „по редове"',
    deystviya.some((d) => d.includes('брой по редове')), true);
  // операндът е добавката „Изложение" (§137) · чете се ПРЕДИ действията,
  // защото опциите стоят от отварянето на формата — не ги ражда изборът
  const iztochnik = await p.$$eval('#nova-operand1 option', (o) =>
    o.filter((x) => (x.textContent ?? '').includes('Изложение')).map((x) => (x as HTMLOptionElement).value));
  proveri('източникът се избира от добавките', iztochnik.length, 1);

  await p.fill('#kolona-ime', 'Брой изложения');
  await p.selectOption('#kolona-vid', 'formula');
  await p.waitForFunction(() => document.getElementById('mvsto-za-formula')?.hidden === false);
  await p.selectOption('#nova-deystvie', 'broy-redove');
  // втората колона остава празна — агрегатът иска само източника
  await p.selectOption('#nova-operand1', iztochnik[0]!);
  await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
  await p.waitForFunction(() =>
    [...document.querySelectorAll('.red.redaktor')].some((r) => r.textContent?.includes('брой по редове(')));
  const nablyudatel = (await redove(p, '.red.redaktor')).find((r) =>
    r.some((k) => k.includes('брой по редове(')));
  proveri('редакторът казва сметката ѝ', Boolean(nablyudatel), true);
  proveri('и тя е ЗАТВОРЕНА — наблюдава, не се пише', nablyudatel?.[2], 'затворена');

  // ── ИМОТИ · всеки ред показва СЪЩОТО число ───────────────────────────────
  await naEkran(p, 'imoti', '[data-tablitsa=imoti]');
  await p.waitForSelector('[data-tablitsa=imoti] .glavicha[data-ime="Брой изложения"]');
  const kletki = await p.$$eval('.red.imot', (redoveNaEkrana) =>
    redoveNaEkrana.map((r) => [...r.children].at(-2)?.textContent?.trim() ?? ''));
  proveri('всеки ред показва СЪЩОТО число', new Set(kletki).size, 1);
  proveri('и то е броят на непразните изложения · 1 от §137', kletki[0], '1');

  // ── НАБЛЮДАТЕЛЯТ Е ЖИВ · нова стойност мени броя на ВСИЧКИ редове ────────
  const vtoraKletka = (await p.$$('.red.imot [data-redakt^="dobavka·"]'))[1];
  proveri('има втори ред с клетка за писане', Boolean(vtoraKletka), true);
  await vtoraKletka!.dblclick();
  await p.waitForSelector('.red.imot .kletka-redaktor');
  await p.fill('.red.imot .kletka-redaktor', 'северно');
  await sSabitie(p, () => p.keyboard.press('Enter'));
  await p.waitForFunction(() =>
    [...document.querySelectorAll('.red.imot')].every(
      (r) => [...r.children].at(-2)?.textContent?.trim() === '2'));
  proveri('броят стана 2 · на всички редове наведнъж',
    await p.$eval('.red.imot', (r) => [...r.children].at(-2)?.textContent?.trim()), '2');
}

/** 140 · колоната в САМИЯ Журнал · бележка на сесията (резен 82 · ADR-140) */
export async function blok10(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '140 · колоната в самия Журнал';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ── РАЖДАНЕТО · Журналът стои в избора като вградена ─────────────────────
  await naPodtab(p, 'biznesat', '#litse-hedari');
  await p.waitForSelector('#izbor-hedar');
  proveri('Журналът · сесии стои в избора на хедър',
    (await p.$$eval('#izbor-hedar option', (o) =>
      o.map((x) => x.textContent ?? ''))).some((t) => t.includes('Журналът · сесии')), true);
  await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-hedar', 'vgraden:zhurnal'));
  await p.waitForSelector('#nova-kolona');
  await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
  await p.waitForSelector('#forma-kolona');
  await p.fill('#kolona-ime', 'Бележка на деня');
  await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
  await p.waitForSelector('.red.redaktor');
  proveri('и НЕ отива при „роднини" — празната глава не е семейство',
    (await tekstNa(p, '.vest')).includes('семейството'), false);
  proveri('добавката на Журнала се реди в Редактора',
    (await p.$$eval('.red.redaktor [data-ime-vhod]', (e) =>
      e.map((x) => (x as HTMLInputElement).value))).includes('Бележка на деня'), true);

  // ── СЕСИИТЕ · клетката е бележка върху „ден | кой" ───────────────────────
  // Журналът и сесиите му живеят в подтаба СИГУРНОСТ И АРХИВ (резен 112).
  await naPodtab(p, 'sigurnost', '#sesii-otvori');
  await p.click('#sesii-otvori');
  await p.waitForSelector('[data-sektsiya=zhurnal-sesii][data-otvoren=da]');
  await p.waitForSelector('.sesiya-dobavki [data-redakt^="dobavka·vgraden:zhurnal·"]');
  proveri('всяка сесия носи клетката на добавката',
    (await p.$$('.karta.sesiya')).length,
    (await p.$$('.sesiya-dobavki [data-redakt^="dobavka·vgraden:zhurnal·"]')).length);
  proveri('празната клетка се казва с „—"',
    await p.$eval('.sesiya-dobavki [data-redakt]', (e) => e.textContent?.trim()), '—');

  const predi = await broySabitiya(p);
  await p.dblclick('.sesiya-dobavki [data-redakt^="dobavka·vgraden:zhurnal·"]');
  await p.waitForSelector('.sesiya-dobavki .kletka-redaktor');
  await p.fill('.sesiya-dobavki .kletka-redaktor', 'проверена');
  await sSabitie(p, () => p.keyboard.press('Enter'));
  proveri('записът на бележката е ТОЧНО едно събитие', (await broySabitiya(p)) - predi, 1);
  await p.waitForFunction(() =>
    [...document.querySelectorAll('.sesiya-dobavki [data-redakt]')].some(
      (e) => e.textContent?.includes('проверена')));
  proveri('и сесията я показва',
    (await p.$$eval('.sesiya-dobavki [data-redakt]', (e) =>
      e.map((x) => x.textContent?.trim() ?? ''))).includes('проверена'), true);

  // затварянето пуска книгата · отварянето я чете наново — бележката е ЗАПИС
  await deystvieSPrerisuvane(p, () => p.click('#sesii-zatvori'));
  await p.click('#sesii-otvori');
  await p.waitForSelector('.sesiya-dobavki [data-redakt^="dobavka·vgraden:zhurnal·"]');
  proveri('бележката стои и след затваряне и ново отваряне — Журналът я носи',
    (await p.$$eval('.sesiya-dobavki [data-redakt]', (e) =>
      e.map((x) => x.textContent?.trim() ?? ''))).includes('проверена'), true);
  await deystvieSPrerisuvane(p, () => p.click('#sesii-zatvori'));
}

/**
 * 141 · НАСТРОЙКИТЕ НА СЛУЖИТЕЛЯ · без стопанските (резен 83 · И121 т.1).
 *
 * Негови думи: „ТРябва за служителите да имат достъп до техните възможности
 * за настройки без тези определени само за стопанина които създава трие и
 * променя всичко."
 *
 * Блокът ВЛИЗА като служителя — не пита кода „какво би нарисувал", а гледа
 * какво ПИШЕ НА ЕКРАНА на другия човек. Стои НАКРАЯ на прохода: излизането
 * презарежда страницата и никой блок след него не бива да разчита на
 * състоянието отпреди. Накрая се връща стопанинът — проходът оставя книгата
 * на онзи, който я е почнал.
 *
 * КНИГАТА НА СЛУЖИТЕЛЯ иска стопанската верига ВЪТРЕ (ADR-055). Влизането е
 * ЕДНО за целия проход (`vlezKatoSluzhitelya`), споделено с §53–§56, където
 * и Личното го играе служителят (ADR-154). Дотук веригата тук беше две
 * събития, написани на ръка; сега е ЦЯЛАТА на Стопанина, досипана с новото.
 */
export async function blok11(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '141 · Настройките на служителя';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // ── излизане и влизане като СЛУЖИТЕЛЯ от §20 (редактор „Бамстера") ────────
  await vlezKatoSluzhitelya(p);

  proveri('пунктът Настройки ВОДИ и служителя · не само отваря реда',
    await p.$eval('#nastroyki-vhod', (e) => e.hasAttribute('data-ekran')), true);
  await naEkran(p, 'nastroyki', '[data-samo-tvoite]');
  await p.keyboard.press('Escape'); // падащият ред се отвори с пункта · маха се от пътя
  proveri('падащият ред знае кой гледа',
    (await tekstNa(p, '#nastroyki-red .za-kogo')).includes('служител'), true);
  proveri('стеснението се КАЗВА, веднъж и отгоре',
    (await tekstNa(p, '[data-samo-tvoite]')).includes('Стопанинът'), true);

  // ПОДТАБОВЕТЕ МУ СА ПО-МАЛКО (резен 112 · ADR-158): празен подтаб не се
  // рисува, значи служителят вижда САМО онези, в които има негова секция.
  const negovitePodtabove = await p.$$eval('[data-podtab]', (e) =>
    e.map((x) => x.getAttribute('data-podtab') ?? ''));
  proveri('вижда своите подтабове, не петте',
    negovitePodtabove.join(' · '), 'moeto · hora · schetovodstvo');

  // НЕГОВИТЕ секции стоят · присъдата е на домейна, екранът само пита. Всяка
  // се чете В СВОЯ подтаб: екранът рисува един наведнъж.
  await naPodtab(p, 'schetovodstvo', '[data-sektsiya=sverki]');
  proveri('Записаните сверки СТОЯТ · те са на работещите',
    Boolean(await p.$('[data-sektsiya=sverki]')), true);
  // ЛИЧНАТА е ЕДНА · „темата на натоварването" падна с бутоните си
  // (И127 т.3 · резен 92 · ADR-149), и вече не се брои сред личните.
  await naPodtab(p, 'moeto', '[data-sektsiya=podredbata]');
  proveri('и личната стои · подредбата на екраните',
    Boolean(await p.$('[data-sektsiya=podredbata]')), true);
  // И СВОЯТ ЛИСТ · работата с хора е негова, раздаването на права — не (И57).
  await naPodtab(p, 'hora', '[data-sektsiya="sluzhiteli-horata"]');
  proveri('вижда хората и своя лист',
    Boolean(await p.$('[data-sektsiya="sluzhiteli-listat"]')), true);
  // А ПРАВАТА ги няма ИЗОБЩО в подтаба му: темата е само на Стопанина (И57),
  // значи секцията не се рисува — не се рисува и отказът ѝ. Стеснението е
  // казано ВЕДНЪЖ и отгоре (`data-samo-tvoite`), не по секция.
  proveri('а раздаването на права го няма при него · един подтаб, две присъди',
    Boolean(await p.$('[data-sektsiya=pravata]')), false);
  proveri('а темата на натоварването я НЯМА · падна с бутоните си',
    Boolean(await p.$('[data-sektsiya=tema-natovarvane]')), false);

  // СТОПАНСКИТЕ ги НЯМА · изброени поименно, не „всичко останало".
  for (const s of ['hedari', 'pravata', 'sastoyaniya-imot', 'butoni', 'modeli', 'kontragenti', 'parametri', 'godinite', 'zhurnalat']) {
    proveri(`стопанската секция „${s}" я НЯМА за служителя`,
      Boolean(await p.$(`[data-sektsiya=${s}]`)), false);
  }

  // ── обратно стопанинът · екранът се връща ЦЯЛ ─────────────────────────────
  await varniSeKatoStopanina(p);
  await naPodtab(p, 'biznesat', '[data-sektsiya=hedari]');
  await p.keyboard.press('Escape');
  proveri('за стопанина хедърите пак стоят · нищо не е отнето',
    Boolean(await p.$('[data-sektsiya=hedari]')), true);
  proveri('а казаното стеснение го НЯМА при него',
    Boolean(await p.$('[data-samo-tvoite]')), false);
}

/**
 * 142 · НАЧАЛНИЯТ ИЗГЛЕД от Стопанина за всички (резен 86 · И126 · ADR-144).
 *
 * Зъбът на проверката: личната памет се ТРИЕ, а редът и сгъването остават —
 * значи изгледът е СЪБИТИЕ в Журнала, не поглед на това устройство. Пилотът е
 * Стойност на Състояние: малък екран, който никой по-късен блок не гледа —
 * оставеният начален изглед не мести нищо под чужди проверки.
 */
export async function blok12(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '142 · началният изглед от Стопанина';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  // Стойност се отваря, за да напълни паметта си със секциите.
  await naEkran(p, 'stoynost', '.telo [data-sektsiya]');
  await naPodtab(p, 'moeto', '[data-podredba-ekran="stoynost"]');

  const kartata = '[data-podredba-ekran="stoynost"]';
  const redPredi = await p.$$eval(`${kartata} [data-sektsiya-red]`, (e) =>
    e.map((x) => x.getAttribute('data-sektsiya-red') ?? ''));
  proveri('картата на Стойност реди поне две секции', redPredi.length >= 2, true);

  // ЛИЧНО: първата секция слиза надолу и всичко се сгъва.
  await deystvieSPrerisuvane(p, () =>
    p.click(`${kartata} [data-sektsiya-red="${redPredi[0]}"] [data-posoka=dolu]`));
  await deystvieSPrerisuvane(p, () => p.click(`[data-sgani-vsichki="stoynost"]`));

  // СНИМКАТА СТАВА НАЧАЛНА · по едно събитие на ОТВАРЯН екран, с един бутон:
  // по един бутон на карта беше точно шумът, който мярката на плътността
  // брои (ADR-142) — тя го хвана на първия пуск, 46 → 58 голи.
  const broyEkrani = await p.$$eval('[data-podredba-ekran]', (e) => e.length);
  await sSabitiya(p, broyEkrani, () => p.click('#zapishi-nachalen-izgled'));
  proveri('и екранът го КАЗВА, с броя',
    (await tekstNa(p, '.vest')).includes('Началният изглед е записан'), true);
  proveri('картата отбелязва, че начален изглед ИМА',
    (await tekstNa(p, kartata)).includes('има зададен начален изглед'), true);

  // ЛИЧНАТА ПАМЕТ СЕ ТРИЕ · каквото оцелее, идва от Журнала.
  await p.evaluate(() => {
    localStorage.removeItem('ui.v1.podredba.stoynost');
    const surovo = localStorage.getItem('ui.v1.podredba.sganati');
    if (surovo) {
      const vsichki = JSON.parse(surovo) as Record<string, unknown>;
      delete vsichki['stoynost'];
      localStorage.setItem('ui.v1.podredba.sganati', JSON.stringify(vsichki));
    }
  });
  await naEkran(p, 'stoynost', '.telo [data-sektsiya]');
  proveri('редът ОЦЕЛЯВА изтритата лична памет · начело е преместената',
    await p.$eval('.telo [data-sektsiya]', (e) => e.getAttribute('data-sektsiya')), redPredi[1]);
  proveri('и сгъването оцелява · всички дялове тръгват сгънати',
    await p.$$eval('.telo .sganat', (e) => e.length) >= 2, true);

  // ЛИЧНОТО ПАК БИЕ ОТГОРЕ: едно щракване разтваря само своя дял, за себе си.
  await p.click('.telo [data-sgavane]');
  await p.waitForFunction(() => document.querySelector('.telo [data-sektsiya]:not(.sganat)'));
  proveri('личното разтваряне ляга върху началното, без запис',
    await p.$$eval('.telo .sganat', (e) => e.length) >= 1, true);
  await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * 148 · СЪСТОЯНИЯТА НА ИМОТА · номенклатура като етапите (резен 99 · ADR-157).
 *
 * Негово, 03.09: списъкът да е „номенклатура от Настройки, като етапите".
 * Пази се цялата верига: шестте начални стоят · новото се добавя от Настройки ·
 * веднага се избира в Имоти · и полето там КАЗВА, че расте само оттам (И97).
 */
export async function blok13(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '148 · състоянията на Имота';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  const skrit = async (): Promise<boolean> =>
    p.$eval('#nastroyki-red', (e) => (e as HTMLElement).hidden);
  await dokatoStane(
    p,
    async () => {
      if (await skrit()) await p.click('#nastroyki-vhod');
    },
    async () => !(await skrit()),
    'падащият ред на Настройки се отваря',
  );
  await p.click('#nastroyki-red [data-tema="sastoyaniya-imot"]');
  await p.waitForSelector('[data-sektsiya=sastoyaniya-imot]');

  proveri('шестте начални стоят',
    await p.$eval('[data-sastoyaniya-imot]', (e) => (e as HTMLElement).dataset['sastoyaniyaImot']), '6');
  proveri('и добавени още няма · нулата се КАЗВА',
    await p.$eval('[data-dobaveni-sastoyaniya]', (e) => (e as HTMLElement).dataset['dobaveniSastoyaniya']), '0');
  proveri('„Строителство" е сред тях · оттам тръгва големият строеж',
    await p.$$eval('[data-sastoyanie-imot="Строителство"]', (e) => e.length), 1);

  // БАЗОВОТО НЕ СЕ ПРЕЗАПИСВА · отказът е с думи, на самия екран.
  await p.fill('#sastoyanie-imot-ime', 'Наем');
  await p.click('#forma-sastoyanie-imot button[type=submit]');
  await p.waitForFunction(() =>
    (document.querySelector('#greshka-sastoyanie-imot')?.textContent ?? '') !== '');
  const otkazatNaBazovoto = await tekstNa(p, '#greshka-sastoyanie-imot');
  proveri('негово от начало не се презаписва · и се КАЗВА',
    otkazatNaBazovoto.includes('от начало') ? 'от начало' : otkazatNaBazovoto, 'от начало');

  // НОВОТО РАСТЕ · цялата тройка се повтаря (клас Ж2 · същото като при етапа).
  await dokatoStane(
    p,
    async () => {
      await p.fill('#sastoyanie-imot-ime', 'в ремонт');
      await p.click('#forma-sastoyanie-imot button[type=submit]');
    },
    () => p.$$eval('[data-sastoyanie-imot="в ремонт"]', (e) => e.length > 0),
    'новото състояние „в ремонт" се появява в таблицата',
  );
  proveri('състоянията станаха СЕДЕМ',
    await p.$eval('[data-sastoyaniya-imot]', (e) => (e as HTMLElement).dataset['sastoyaniyaImot']), '7');

  // И ВЕДНАГА СЕ ИЗБИРА В ИМОТИ · менюто расте от Настройки, не от полето.
  await naEkran(p, 'imoti', '#forma-imot');
  proveri('новото стои в менюто на Имоти',
    await p.$$eval('#imot-sastoyanie option', (o) =>
      o.filter((x) => (x as HTMLOptionElement).value === 'в ремонт').length), 1);
  proveri('и полето КАЗВА, че расте само от Настройки',
    (await tekstNa(p, '[data-zaklyuchen="sastoyanie-imot"]')).includes('Настройки'), true);

  // ЗАПИСВА СЕ НА ИМОТ · състоянието е ИЗБОР, не събитие (И131 т.3).
  await dobaviImotBezObekt(p, 'Обеля', { sastoyanie: 'в ремонт' });
  proveri('състоянието стои на реда на имота',
    (await tekstNa(p, '[data-tablitsa=imotite] [data-imot="Обеля"]')).includes('в ремонт'), true);
}
