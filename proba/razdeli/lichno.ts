import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { SLUZHITELYAT, broyLichni, broySabitiya, deystvieSPrerisuvane, naEkran, natisni, ostatak, otvoriProfila, tekstNa, varniSeKatoStopanina, vlezKatoSluzhitelya } from '../yadro/pomoshtni.ts';
import { readFile, writeFile } from 'node:fs/promises';

/** 53 · Личното · Стопанинът е без личен таб | 53 · Личното · преди активиране | 53 · Личното · активирането от Профила иска МЯСТО | 53 · Личното · същата таблица | 53 · Личното · преносът | 53 · Личното · двата Журнала не се смесват | 54 · Личното · кой вижда личното | 55 · Личните пари · деликатно | 55 · Личните пари · темата | 55 · Личните пари · ръчният ред | 55 · Личните пари · изключеният ред | 55 · Личните пари · кредитът | 55 · Личните пари · извлечението | 55 · Личните пари · вторият внос | 55 · Личните пари · служебният пункт е скрит */
export async function blok1(ctx: KonteksNaProhoda): Promise<{ broy: number } | undefined> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    // ══ 53 · СТОПАНИНЪТ НЯМА ЛИЧЕН ТАБ (И131 т.1 · ADR-154) ══════════════════
    razdel = '53 · Личното · Стопанинът е без личен таб';
    await naEkran(p, 'tablo', '#izlez');
    proveri('лентата на Стопанина НЕ носи пункта „Лично"',
      Boolean(await p.$('[data-ekran=lichno]')), false);
    proveri('и Таблото му НЕ рисува картата на личното',
      Boolean(await p.$('[data-sektsiya=tablo-lichno]')), false);
    await otvoriProfila(p);
    proveri('и Профилът му няма нито поле, нито бутон за личното',
      Boolean(await p.$('[data-profil-lichno]')), false);
    await p.keyboard.press('Escape');

    // ══ 53 · СЛУЖИТЕЛЯТ · личното е НЕГОВО · оттук до §56 играе той ══════════
    razdel = '53 · Личното · преди активиране';
    await vlezKatoSluzhitelya(p);
    await naEkran(p, 'tablo', '[data-sektsiya=tablo-lichno]');
    proveri('Таблото на служителя казва, че личното НЕ Е ПУСКАНО · три състояния, не две',
      (await p.$eval('[data-sektsiya=tablo-lichno]', (e) => e.textContent)).includes('не е пускано'), true);
    proveri('и НЕ предлага бутон — първото пускане иска мястото',
      Boolean(await p.$('#tablo-lichno')), false);
    proveri('но пунктът „Лично" се вижда, за да може изобщо да се пусне',
      Boolean(await p.$('[data-ekran=lichno]')), true);

    // И99 · АКТИВАЦИЯТА ИСКА МЯСТО В ЛИЧНИЯ ДРАЙВ, не гол бутон · и е ОТ ПРОФИЛА
    razdel = '53 · Личното · активирането от Профила иска МЯСТО';
    const predLichno = await broySabitiya(p);
    await otvoriProfila(p);
    proveri('Профилът носи блока „Лично" и казва „не е пускано"',
      await p.$eval('[data-profil-lichno]', (e) => (e as HTMLElement).dataset['profilLichno']), 'не е пускано');
    proveri('поканата иска МЯСТО в личния драйв',
      Boolean(await p.$('#profil-lichno-myasto')), true);
    proveri('и КАЗВА, че приложението не споделя папката вместо теб',
      (await p.$eval('[data-profil-lichno]', (e) => e.textContent)).includes('не споделя'), true);

    // без място не тръгва
    await deystvieSPrerisuvane(p, () => p.click('#profil-lichno-pusni'));
    proveri('без място личното НЕ тръгва · отказът е с думи',
      (await tekstNa(p, '.vest')).includes('иска МЯСТО'), true);
    // НАМЕРЕНО ОТ ПРОХОДА (резен 98 · ADR-154 §6): откриващото събитие ляга в
    // личния Журнал ПРЕДИ Вратата да провери мястото, а „пипнато" се смяташе
    // от самото съществуване на Журнала — неуспешният първи опит правеше „не е
    // пускано" на „прибрано", пунктът падаше от лентата, а „Върни личното"
    // няма поле за място: задънена улица. Сега „пипнато" е превключване.
    await otvoriProfila(p);
    proveri('и неуспешният опит НЕ прави личното „прибрано" · пипнато е превключване, не Журнал',
      await p.$eval('[data-profil-lichno]', (e) => (e as HTMLElement).dataset['profilLichno']), 'не е пускано');
    await p.keyboard.press('Escape');
    // ВТОРАТА ПОЛОВИНА НА СЪЩАТА НАХОДКА: лентата смяташе „пипнато" САМА, като
    // позиционен аргумент (`!== null`), и криеше пункта, докато Профилът до нея
    // казваше „не е пускано". Едно число, един дом (правило 17).
    proveri('и пунктът „Лично" още стои в лентата · лентата и Профилът четат ЕДНО и също',
      Boolean(await p.$('[data-ekran=lichno]')), true);
    await naEkran(p, 'lichno', '[data-sektsiya=lichno-pokana]');
    proveri('и екранът „Лично" още КАНИ, не показва таблица', Boolean(await p.$('#l-forma-delo')), false);

    // с място · от ПРОФИЛА, който стои и на този екран (втора дръжка · ADR-134 §3)
    await otvoriProfila(p);
    await p.fill('#profil-lichno-myasto', 'MasterBook/Лично');
    await deystvieSPrerisuvane(p, () => p.click('#profil-lichno-pusni'));
    await p.waitForSelector('#l-forma-delo');
    proveri('служебният Журнал НЕ е помръднал', await broySabitiya(p), predLichno);
    await otvoriProfila(p);
    proveri('Профилът вече казва „включено" и предлага прибиране',
      (await p.$eval('[data-profil-lichno]', (e) => (e as HTMLElement).dataset['profilLichno'])) === 'включено'
        && Boolean(await p.$('#profil-lichno-priberi')), true);
    await p.keyboard.press('Escape');

    // СЕКЦИИТЕ НА ЛИЧНИЯ ЕКРАН носят ключ · §68 брои останалите десет като
    // Стопанина; този екран го има само служителят, и само докато е пуснат.
    const klyuchoveLichno = await p.$$eval('.telo > *', (e) =>
      e.filter((x) => x.querySelector('.dyalglava')).map((x) => (x as HTMLElement).dataset['sektsiya'] ?? ''));
    proveri('личният екран носи секции за местене', klyuchoveLichno.length > 0, true);
    proveri('и НИТО ЕДНА не се ключува по заглавието си', klyuchoveLichno.filter((k) => k === '').length, 0);
    proveri('и нито два ключа не съвпадат', klyuchoveLichno.length - new Set(klyuchoveLichno).size, 0);

    // СЪЩАТА ТАБЛИЦА · свои надписи, СВОЙ Журнал
    razdel = '53 · Личното · същата таблица';
    const lichnoTekst = await p.evaluate(() => document.body.textContent);
    proveri('таблицата е СЪЩАТА, с лични надписи',
      lichnoTekst.includes('Моето време') && lichnoTekst.includes('Тема · Дело · Обект · Отговорник'), true);
    proveri('и почва ПРАЗНА — служебните дела не се виждат тук',
      await p.$$eval('.gant-delo', (r) => r.length), 0);
    proveri('формата носи СВОЯ представка · две „#forma-delo" се бият',
      Boolean(await p.$('#l-myasto')) && Boolean(await p.$('#d-myasto')) === false, true);

    // ПРЕНОСЪТ · служебно дело отива в личното
    razdel = '53 · Личното · преносът';
    // ПЪРВОТО, което МОЖЕ да пътува: делата с поддела са изключени от вратаря
    // („сирак под липсващо дело не се оставя") и техните кутийки са disabled.
    const zaPrenos = await p.$eval(
      '[data-prenesi]:not([disabled])',
      (e) => e.dataset.prenesi,
    );
    await deystvieSPrerisuvane(p, () => p.check(`[data-prenesi="${zaPrenos}"]`));
    await p.fill('#prenos-prichina', 'това е мое, не на фирмата');
    await deystvieSPrerisuvane(p, () => p.click('#prenos-pusni'));
    const vestPrenos = await tekstNa(p, '.vest');
    // При отказ проверката ПОКАЗВА думите на отказа, не „false": иначе
    // находката казва само „не мина" и се търси на сляпо (резен 98).
    proveri('преносът казва сверката си · разликата дори когато е нула',
      vestPrenos.includes('разлика 0') ? 'разлика 0' : vestPrenos, 'разлика 0');
    proveri('и че старото стои непокътнато',
      vestPrenos.includes('непокътнати') ? 'непокътнати' : vestPrenos, 'непокътнати');
    proveri('делото се появи в ЛИЧНАТА таблица',
      await p.$$eval('.gant-delo', (r) => r.length), 1);

    // И ГО НЯМА в служебното Управление
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('и ГО НЯМА в служебното Управление',
      await p.$$eval(`.gant-delo[data-ime="${zaPrenos}"]`, (r) => r.length), 0);

    // ДВАТА ЖУРНАЛА · всеки със своята цяла верига
    razdel = '53 · Личното · двата Журнала не се смесват';
    const dvata = await p.evaluate(async () => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      const vsichki = await new Promise((da, ne) => {
        const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      const po: Record<string, any[]> = {};
      for (const s of (vsichki as any)) (po[s.naematel] ??= []).push(s);
      return Object.entries(po).map(([klyuch, redica]) => ({
        klyuch,
        broy: (redica as any).length,
        parviSeq: Math.min(...(redica as any).map((s: any) => s.seq)),
        chuzhdi: (redica as any).filter((s: any) => s.naematel !== klyuch).length,
      }));
    });
    const lichniyat = dvata.find((x) => x.klyuch.endsWith('#lichen'));
    proveri('личният Журнал СЪЩЕСТВУВА, под свой ключ', Boolean(lichniyat), true);
    proveri('и тръгва от seq 1 · своя верига, от нулата', lichniyat?.parviSeq, 1);
    for (const zh of dvata) {
      proveri(`нито едно чуждо събитие в „${zh.klyuch}"`, zh.chuzhdi, 0);
    }

    // ══ 54 · ОБРАТНАТА ПОСОКА · кой вижда личното (И99) ═══════════════════
    //
    // Дотук правата вървяха в ЕДНА посока: главният акаунт → служителя. Тук
    // раздава СОБСТВЕНИКЪТ НА ЛИЧНОТО — на работодателя си или на съвсем
    // външен имейл („например на жена си"). Проверява се и обратното: че
    // записът НЕ пада в служебния Журнал — кой вижда личното е част от
    // личното, а не сведение за работодателя.
    razdel = '54 · Личното · кой вижда личното';
    await naEkran(p, 'lichno', '[data-sektsiya=lichni-dostapi]');
    proveri('преди да е дадено · „никой освен теб"',
      (await p.$eval('[data-sektsiya=lichni-dostapi]', (e) => e.textContent)).includes('Никой освен теб'), true);
    proveri('и екранът КАЗВА, че приложението не споделя папката вместо теб',
      (await p.$eval('[data-sektsiya=lichni-dostapi]', (e) => e.textContent)).includes('НЕ споделя папката'), true);

    const predDostap = await broySabitiya(p);
    await p.fill('#dostap-imeyl', 'zhena@example.bg');
    await p.selectOption('#dostap-kakav', 'vanshen');
    await p.selectOption('#dostap-rolya', 'nablyudatel');
    await p.selectOption('#dostap-kakvo', 'dvete');
    await deystvieSPrerisuvane(p, () => p.click('#dostap-day'));
    proveri('външният имейл е записан · един ред в списъка',
      await p.$$eval('.red.dostap', (r) => r.length), 1);
    proveri('и се вижда с ролята и с това КАКВО е споделено',
      (await p.$eval('.red.dostap', (e) => e.textContent)).includes('zhena@example.bg')
        && (await p.$eval('.red.dostap', (e) => e.textContent)).includes('папката и таба'), true);
    proveri('служебният Журнал НЕ е помръднал · записът е в ЛИЧНИЯ',
      await broySabitiya(p), predDostap);
    proveri('екранът казва, че външният НЕ става служител',
      (await p.$eval('[data-sektsiya=lichni-dostapi]', (e) => e.textContent)).includes('НЕ става служител'), true);

    // НА СЕБЕ СИ НЕ СЕ ДАВА · иначе отнемането изглежда като заключване
    // извън собствения Журнал.
    await p.fill('#dostap-imeyl', SLUZHITELYAT.email.toLowerCase());
    await deystvieSPrerisuvane(p, () => p.click('#dostap-day'));
    proveri('на СЕБЕ СИ не се дава достъп',
      (await p.evaluate(() => document.body.textContent)).includes('На себе си не се дава достъп'), true);
    proveri('и списъкът НЕ порасна', await p.$$eval('.red.dostap', (r) => r.length), 1);

    // ОТНЕМАНЕТО · ново събитие, не изтрит ред (правило 1)
    await deystvieSPrerisuvane(p, () => p.click('[data-otnemi]'));
    proveri('редът ОСТАНА след отнемането — историята се пази',
      await p.$$eval('.red.dostap', (r) => r.length), 1);
    proveri('но е белязан като отнет',
      (await p.$eval('.red.dostap', (e) => e.textContent)).includes('отнет'), true);
    proveri('и вече няма кой да отнема',
      Boolean(await p.$('[data-otnemi]')), false);

    // ══ 55 · ЛИЧНИТЕ ПАРИ · кредит, приход, разход на едно място (И96 т.10) ══
    razdel = '55 · Личните пари · деликатно';
    await naEkran(p, 'lichno', '[data-sektsiya=lichni-pari]');
    proveri('числата тръгват СКРИТИ · спирачка за случайния поглед',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('•••'), true);
    proveri('и екранът КАЗВА, че това не е сигурност',
      (await p.$eval('[data-sektsiya=lichni-pari]', (e) => e.textContent)).includes('не ключалка'), true);
    proveri('празно е НАРОЧНО · нищо не е попълнено вместо него',
      (await p.$eval('[data-sektsiya=lichni-pari]', (e) => e.textContent)).includes('нищо не е попълнено вместо теб'), true);
    proveri('и НЯМА нито един ред', await p.$$eval('.red.dvizhenie', (r) => r.length), 0);

    await deystvieSPrerisuvane(p, () => p.click(`#${'lp-'}pokazhi`));
    proveri('числата се показват с натискане',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('•••'), false);

    // ТЕМАТА · менюто, което ОПИСВА, расте свободно
    razdel = '55 · Личните пари · темата';
    const predTema = await broySabitiya(p);
    await p.click('[data-forma="lp-tema"] summary');
    await p.fill('#lp-t-ime', 'Храна');
    await p.fill('#lp-t-grupa', 'Дом');
    await deystvieSPrerisuvane(p, () => p.click('#lp-t-zapishi'));
    proveri('темата се записа', await p.$$eval('.red.tema-opis', (r) => r.length), 1);
    proveri('служебният Журнал НЕ е помръднал', await broySabitiya(p), predTema);

    // РЪЧНИЯТ РЕД · „да може да се добавя лично"
    razdel = '55 · Личните пари · ръчният ред';
    await p.click('[data-forma="lp-red"] summary');
    await p.fill('#lp-r-suma', '35,00');
    await p.fill('#lp-r-koy', 'ЛИДЛ');
    await p.selectOption('#lp-r-tema', { label: 'Храна' });
    await deystvieSPrerisuvane(p, () => p.click('#lp-r-zapishi'));
    proveri('редът се вижда', await p.$$eval('.red.dvizhenie', (r) => r.length), 1);
    proveri('и влиза в сбора по ТЕМИ',
      (await p.$eval('[data-tablitsa=lichni-temi]', (e) => e.textContent)).includes('Храна'), true);
    proveri('разходът е 35,00 €',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('35,00'), true);

    // ИЗКЛЮЧВАНЕТО · ред се ИЗКЛЮЧВА, не се трие (правило 23)
    razdel = '55 · Личните пари · изключеният ред';
    // причината е ЗАДЪЛЖИТЕЛНА · без нея действието отказва с думи
    await deystvieSPrerisuvane(p, () => p.click('[data-izklyuchi]'));
    proveri('без причина изключването НЕ минава',
      (await p.evaluate(() => document.body.textContent)).includes('иска ПРИЧИНА'), true);
    proveri('и редът си остава в сборовете',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('нищо не е изключено'), true);

    await p.fill('#lp-prichina', 'върнати пари');
    await deystvieSPrerisuvane(p, () => p.click('[data-izklyuchi]'));
    proveri('редът ОСТАНА в таблицата', await p.$$eval('.red.dvizhenie', (r) => r.length), 1);
    proveri('но е белязан с причината си',
      (await p.$eval('.red.dvizhenie', (e) => e.textContent)).includes('върнати пари'), true);
    proveri('и падна от сборовете',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('1 изключени реда не влизат'), true);
    await deystvieSPrerisuvane(p, () => p.click('[data-vurni]'));
    proveri('връщането го брои пак',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).includes('нищо не е изключено'), true);

    // КРЕДИТЪТ · третото нещо · главницата НЕ е разход
    razdel = '55 · Личните пари · кредитът';
    await p.click('[data-forma="lp-kredit"] summary');
    await p.fill('#lp-k-ime', 'Ипотека · Пощенска');
    await p.fill('#lp-k-ostatak', '100000,00');
    await p.fill('#lp-k-lihva', '345');
    await p.fill('#lp-k-vnoska', '612,34');
    await deystvieSPrerisuvane(p, () => p.click('#lp-k-zapishi'));
    proveri('кредитът се вписа', await p.$$eval('.red.kredit', (r) => r.length), 1);
    proveri('лихвата се изписва като процент',
      (await p.$eval('.red.kredit', (e) => e.textContent)).includes('3,45 %'), true);
    proveri('и остатъкът е СМЕТНАТ, не поле',
      (await p.$eval('.red.kredit', (e) => e.textContent)).replace(/[\s\u202f\u00a0]/g, '').includes('100000,00'), true);

    const predVnoska = Number(
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).match(/Разход\s*([\d\s ]+),/)?.[1]
        ?.replace(/[\s ]/g, '') ?? '0',
    );
    await deystvieSPrerisuvane(p, () => p.click('[data-vnoska]'));
    const sledVnoska = Number(
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).match(/Разход\s*([\d\s ]+),/)?.[1]
        ?.replace(/[\s ]/g, '') ?? '0',
    );
    proveri('вноската влезе като ЛИХВА (287 €), не като цялата вноска (612 €)',
      sledVnoska - predVnoska, 287);
    proveri('а остатъкът по кредита ПАДНА с главницата',
      (await p.$eval('.red.kredit', (e) => e.textContent)).replace(/[\s\u202f\u00a0]/g, '').includes('100000,00'), false);

    // ИЗВЛЕЧЕНИЕТО · планът се ПОКАЗВА, нищо не се пише без натискане
    razdel = '55 · Личните пари · извлечението';
    const IZVLECHENIE =
      'Дата;Описание;Сума;Референция;Салдо\n' +
      '05.07.2026;ОМВ;-80,00;R-1;920,00\n' +
      '31.07.2026;Заплата;2000,00;R-2;2920,00';
    await p.setInputFiles('#lp-fayl', {
      name: 'karta-yuli.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(IZVLECHENIE, 'utf8'),
    });
    await p.waitForSelector('[data-tablitsa=lichni-plan]');
    proveri('планът се ПОКАЗВА, преди да се пише',
      await p.$$eval('.red.plan', (r) => r.length), 2);
    proveri('обхватът се КАЗВА · гледа се само в него',
      (await p.$eval('[data-sektsiya=lichni-pari]', (e) => e.textContent)).includes('2026-07-05 … 2026-07-31'), true);

    const predVnos = await broyLichni(p);
    await deystvieSPrerisuvane(p, () => p.click('#lp-pusni'));
    proveri('двата реда влязоха', (await broyLichni(p)) > predVnos, true);
    proveri('и разписката на партидата е записана',
      await p.$$eval('.red.partida', (r) => r.length), 1);
    proveri('заплатата се брои като ПРИХОД',
      (await p.$eval('[data-tablitsa=lichni-sborove]', (e) => e.textContent)).replace(/[\s\u202f\u00a0]/g, '').includes('2000,00'), true);

    // ВТОРИЯТ ВНОС · същият файл, нула нови · и НИЩО не се гаси
    razdel = '55 · Личните пари · вторият внос';
    const predVtori = await broyLichni(p);
    await p.setInputFiles('#lp-fayl', {
      name: 'karta-yuli-pak.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(IZVLECHENIE, 'utf8'),
    });
    await p.waitForSelector('[data-tablitsa=lichni-plan]');
    proveri('всичко е познато · нищо ново',
      (await p.$eval('[data-tablitsa=lichni-plan]', (e) => e.textContent)).includes('вече го има'), true);
    proveri('бутонът за писане е ИЗКЛЮЧЕН — няма какво да влиза',
      await p.$eval('#lp-pusni', (e) => (e as any).disabled), true);
    proveri('и НИТО ЕДНО събитие не е добавено', await broyLichni(p), predVtori);
    await deystvieSPrerisuvane(p, () => p.click('#lp-otkazhi'));

    // СЛУЖЕБНИЯТ ПЪТ НЕ ВИСИ ТУК · личната карта не влиза в служебния Журнал
    razdel = '55 · Личните пари · служебният пункт е скрит';
    proveri('на личния екран НЯМА служебен пункт за източници',
      Boolean(await p.$('#fayl-iztochnik')), false);
    proveri('нито „Изнеси Журнала" · той изнася СЛУЖЕБНИЯ',
      Boolean(await p.$('#iznesi')), false);
    proveri('нито „Провери веригата" · тя проверява СЛУЖЕБНАТА',
      Boolean(await p.$('#proveri')), false);
    proveri('но екранът КАЗВА защо ги няма',
      (await p.evaluate(() => document.body.textContent)).includes('в секцията си долу'), true);

    // ЖИВОТО МЕНЮ НА ЛИЧНИЯ ЕКРАН (ADR-042) · речникът тук е ЛИЧНИЯТ.
    // Проверява се СЕГА, защото по §53 личният пункт се прибира и екранът
    // после го няма — а §17б обхожда само каквото стои в лентата.

    // §53 „прибирането" продължава в blok2 — снимката на брояча пътува с него.
    return lichniyat;
}

/** 56 · Личният износ · веригата | 56 · Личният износ · файлът | 56 · Личният износ · границата през файла | 53 · Личното · прибирането */
export async function blok2(ctx: KonteksNaProhoda, lichniyat: { broy: number } | undefined): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '56 · Личният износ · веригата';
    await naEkran(p, 'lichno', '[data-sektsiya=lichen-iznos]');
    proveri('екранът напомня, че личният НЕ Е изнасян',
      (await p.$eval('[data-sektsiya=lichen-iznos]', (e) => e.textContent)).includes('не е изнасян'), true);
    await natisni(p, '#lichno-proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Личната верига е цяла'));
    proveri('личната верига е цяла и се брои ОТДЕЛНО',
      (await tekstNa(p, '.vest')).includes('Личната верига е цяла'), true);

    razdel = '56 · Личният износ · файлът';
    const [svalenLichen] = await Promise.all([p.waitForEvent('download'), natisni(p, '#lichno-iznesi')]);
    const patLichen = await svalenLichen.path();
    const izneseniLichni = JSON.parse(await readFile(patLichen, 'utf8'));
    proveri('името на файла казва ЛИЧЕН, без имейла с наставката',
      svalenLichen.suggestedFilename().startsWith('zhurnal-lichen-'), true);
    proveri('всяко звено е на ЛИЧНИЯ наемател',
      izneseniLichni.every((x: any) => x.naematel.endsWith('#lichen')), true);
    proveri('и броят съвпада с личния Журнал', izneseniLichni.length, await broyLichni(p));
    // ЧАКА ПРЕРИСУВАНЕТО, не го предполага. Белегът се пише при клика и екранът
    // се прерисува СЛЕД това — прочетен веднага, текстът е още старият. Тази
    // проверка падаше веднъж на няколко пускания и изглеждаше като случайност;
    // случайността беше състезание, не флейк.
    await p.waitForFunction(() =>
      document.querySelector('[data-sektsiya=lichen-iznos]')?.textContent?.includes('Изнесен днес'),
    );
    proveri('лентата помни ЛИЧНИЯ износ',
      (await p.$eval('[data-sektsiya=lichen-iznos]', (e) => e.textContent)).includes('Изнесен днес'), true);

    razdel = '56 · Личният износ · границата през файла';
    // СЛУЖЕБНИЯТ файл не влиза в личния Журнал — веригата го отказва изцяло.
    const sluzhebenFayl = `${patLichen}.sluzheben.json`;
    const sluzhebniSabitiya = await p.evaluate(async () => {
      const db = await new Promise((da) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
      });
      const vsichki = await new Promise((da) => {
        const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
      });
      return (vsichki as any).filter((s: any) => !s.naematel.endsWith('#lichen'));
    });
    await writeFile(sluzhebenFayl, JSON.stringify(sluzhebniSabitiya));
    const predChuzhdiya = await broyLichni(p);
    await p.setInputFiles('#lichno-fayl', sluzhebenFayl);
    await p.waitForFunction(() => document.body.innerText.includes('Внасянето е отказано'));
    proveri('служебен файл в личния се ОТКАЗВА с думи',
      (await tekstNa(p, '.vest')).includes('Внасянето е отказано'), true);
    proveri('и НИТО ЕДНО събитие не е влязло', await broyLichni(p), predChuzhdiya);

    // а СВОЯТ файл се приема и не добавя нищо — той вече е тук
    await p.setInputFiles('#lichno-fayl', patLichen);
    await p.waitForFunction(() => document.body.innerText.includes('Файлът вече е тук'));
    proveri('своят файл съвпада едно към едно', await broyLichni(p), predChuzhdiya);

    // ПРИБИРАНЕТО · от ПРОФИЛА · пунктът пада, Журналът остава
    razdel = '53 · Личното · прибирането';
    const predPribirane = lichniyat!.broy;
    await naEkran(p, 'tablo', '#tablo-lichno');
    proveri('Таблото вече предлага ПРИБИРАНЕ',
      (await p.$eval('#tablo-lichno', (e) => e.textContent)).includes('Прибери'), true);
    await otvoriProfila(p);
    proveri('и Профилът също · едно действие, две дръжки',
      Boolean(await p.$('#profil-lichno-priberi')), true);
    await deystvieSPrerisuvane(p, () => p.click('#profil-lichno-priberi'));
    proveri('пунктът падна от лентата',
      Boolean(await p.$('[data-ekran=lichno]')), false);
    proveri('и Таблото предлага да го ВЪРНЕ — мястото вече е записано',
      (await p.$eval('#tablo-lichno', (e) => e.textContent)).includes('Върни'), true);
    await otvoriProfila(p);
    proveri('и Профилът казва „прибрано" и предлага същото',
      (await p.$eval('[data-profil-lichno]', (e) => (e as HTMLElement).dataset['profilLichno'])) === 'прибрано'
        && Boolean(await p.$('#profil-lichno-varni')), true);
    await p.keyboard.press('Escape');
    const sledPribirane = await p.evaluate(async () => {
      const db = await new Promise((da) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
      });
      const vsichki = await new Promise((da) => {
        const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
      });
      return (vsichki as any).filter((s: any) => s.naematel.endsWith('#lichen')).length;
    });
    proveri('но Журналът ОСТАНА — прибраното не е изтрито',
      sledPribirane > predPribirane, true);

    // ОБРАТНО СТОПАНИНЪТ · проходът оставя книгата на онзи, който я е почнал.
    await varniSeKatoStopanina(p);
    proveri('и за Стопанина пак няма пункт „Лично" · личното е на служителя',
      Boolean(await p.$('[data-ekran=lichno]')), false);

    // ══ 59 · МЕНЮТАТА ИЗВЪН УПРАВЛЕНИЕ · живото и заключеното (ADR-042) ═════
    //
    // ADR-040 закачи закона за четирите полета на делото. Тук се проверява
    // втората му половина: полетата, които ОПИСВАТ, вече имат речник и на
    // другите екрани; полетата, върху които системата СМЯТА, си остават избор
    // и КАЗВАТ защо.
}
