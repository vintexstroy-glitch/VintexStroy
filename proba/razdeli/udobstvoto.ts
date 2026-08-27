import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, deystvieSPrerisuvane, dobaviImot, dobaviNaem, naEkran, natisniVGrupata, ostatak, plochka, redove, tekstNa } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';

/** 27 · удобството | 28 · клавиатурата | 29 · статус-лентата | 30 · груповото и черновата | 31 · клипбордният мост | 32 · филтрите навсякъде | 33 · групирането | 34 · скритата колона | 35 · редакцията в клетката | 36 · груповото въвеждане | 37 · скоростта */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '27 · удобството';
    await naEkran(p, 'imoti', '#forma-imot');

    // СОРТИРАНЕТО · клик по „Наем €" → нагоре · още един → надолу · трети → изходно.
    const sumiNaEkrana = () =>
      p.$$eval('.red.naem .suma:first-of-type', (r) =>
        r.map((x) => Number(x.textContent.replace(/[^\d,-]/g, '').replace(',', '.'))));
    const izhodni = await sumiNaEkrana();
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));
    const nagore = await sumiNaEkrana();
    proveri('сортирането подрежда наемите нагоре',
      JSON.stringify(nagore), JSON.stringify([...izhodni].sort((a, b) => a - b)));
    proveri('главата показва посоката', (await tekstNa(p, '[data-podredi="naemi:naem"]')).includes('↑'), true);
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));
    proveri('второто щракване обръща надолу',
      JSON.stringify(await sumiNaEkrana()), JSON.stringify([...izhodni].sort((a, b) => b - a)));
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));
    proveri('третото връща ИЗХОДНИЯ ред', JSON.stringify(await sumiNaEkrana()), JSON.stringify(izhodni));

    // ТЪРСЕНЕТО в цялата таблица · реже и КАЗВА колко крие.
    await p.fill('[data-tarsi-tablitsa="naemi"]', 'контактен');
    await p.waitForFunction(() => document.querySelectorAll('.red.naem').length === 1);
    proveri('търсенето остави един ред', await p.$$eval('.red.naem', (r) => r.length), 1);
    proveri('и казва колко крие', (await tekstNa(p, '.filtar-skrito')).includes('крие'), true);
    proveri('фокусът оцелява прерисуването',
      await p.evaluate(() => document.activeElement?.matches('[data-tarsi-tablitsa]') ?? false), true);

    // ПАМЕТТА · презареждане пази търсенето; „покажи всичко" го маха.
    await p.reload();
    await p.waitForSelector('#forma-imot');
    proveri('след презареждане търсенето стои',
      await p.$$eval('.red.naem', (r) => r.length), 1);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-izchisti-vsichko="naemi"]'));
    proveri('„покажи всичко" маха и търсенето',
      (await p.$$eval('.red.naem', (r) => r.length)) > 1, true);

    // ЗАМРАЗЕНИЯТ ХЕДЪР · свойство на стила, проверено като стил.
    proveri('главата е замразена (sticky)',
      await p.$eval('.tablitsa .glava', (e) => getComputedStyle(e).position), 'sticky');

    // ИСТОРИЯТА НА РЕДА · кой · какво · кога, от Журнала.
    await natisniVGrupata(p, '.red.naem:has-text("Домакинство") [data-istoriya]');
    await p.waitForSelector('.istoriya-karta');
    const istoriyata = await tekstNa(p, '.istoriya-karta');
    proveri('историята казва типа събитие', istoriyata.includes('НаемДобавен'), true);
    proveri('и кой го е писал', istoriyata.includes('vintexstroy@gmail.com'), true);
    await p.click('.istoriya-zatvori');
    proveri('панелът се затваря', await p.$('.istoriya-karta'), null);

    // КОНТЕКСТНОТО МЕНЮ · десният бутон върху ред.
    await p.click('.red.naem:has-text("Домакинство") .kletka', { button: 'right' });
    await p.waitForSelector('.kontekstno-menyu');
    const menyuto = await tekstNa(p, '.kontekstno-menyu');
    proveri('менюто носи „Копирай реда"', menyuto.includes('Копирай реда'), true);
    proveri('и действията на реда', menyuto.includes('Сторно'), true);
    await p.keyboard.press('Escape');
    proveri('Escape го затваря', await p.$('.kontekstno-menyu'), null);

    // ══ 28 · клавиатурната карта · движението на Excel ══════════════════
    razdel = '28 · клавиатурата';
    await naEkran(p, 'imoti', '#forma-imot');

    const izbranaKletka = () =>
      p.evaluate(() => {
        const k = document.querySelector('.kletka-izbrana');
        if (!k) return null;
        const red = k.parentElement;
        const tablitsa = (red as any).closest('.tablitsa');
        const redove = [...(tablitsa as any).querySelectorAll('.red')];
        return { red: redove.indexOf((red as any)), kolona: [...(red as any).children].indexOf(k) };
      });

    // кликът избира; стрелката слиза; Tab отива надясно; Ctrl+стрелка до ръба
    await p.click('.red.naem .kletka');
    proveri('кликът избира клетка', (await izbranaKletka())?.red, 0);
    await p.keyboard.press('ArrowDown');
    proveri('стрелката слиза един ред', (await izbranaKletka())?.red, 1);
    await p.keyboard.press('Tab');
    proveri('Tab отива надясно', (await izbranaKletka())?.kolona, 1);
    await p.keyboard.press('Shift+Tab');
    proveri('Shift+Tab се връща', (await izbranaKletka())?.kolona, 0);
    await p.keyboard.press('Control+ArrowDown');
    const dolu = await izbranaKletka();
    proveri('Ctrl+стрелка скача до последния ред',
      dolu?.red, (await p.$$eval('.red.naem', (r) => r.length)) - 1);
    await p.keyboard.press('Enter');
    proveri('Enter на последния ред стои, не пада', (await izbranaKletka())?.red, dolu?.red);
    await p.keyboard.press('Escape');
    proveri('Escape маха селекцията', await izbranaKletka(), null);

    // а във ФОРМА картата мълчи: стрелката в поле не мести клетки
    await p.click('.red.naem .kletka');
    await p.click('#imot-adres');
    await p.keyboard.press('ArrowDown');
    proveri('в поле картата мълчи',
      await p.evaluate(() => document.activeElement?.id ?? ''), 'imot-adres');

    // ══ 29 · обхватът и статус-лентата · Брой · Сбор · Средно ═══════════
    razdel = '29 · статус-лентата';
    const statusnaLenta = () =>
      p.evaluate(() => {
        const l = document.querySelector('.status-lenta');
        return l && !(l as any).hidden ? l.textContent : null;
      });
    // Числото след етикета: спира на първия знак, който не е цифра/пауза —
    // кирилското „С" на следващия етикет го реже само.
    const chisloto = (tekst: any, sled: any) => {
      const m = new RegExp(`${sled}\\s*(-?[\\d\\s\\u00A0\\u202F]+(?:,\\d+)?)`).exec(tekst);
      return m ? Number((m[1] as any).replace(/[\s\u00A0\u202F]/g, '').replace(',', '.')) : NaN;
    };

    // Shift+стрелка опъва обхват по колоната със сумите; лентата смята.
    const sumiPoKletki = await p.$$eval('.red.naem .suma[data-st]', (r) =>
      r.map((x) => Number(x.dataset.st)));
    proveri('евро-клетките носят стотинките си (data-st)', sumiPoKletki.length > 1, true);
    await p.click('.red.naem .suma');
    proveri('една клетка не вдига лентата', await statusnaLenta(), null);
    await p.keyboard.press('Shift+ArrowDown');
    const naLentata = await statusnaLenta();
    proveri('Shift+стрелка опъва обхват и лентата се показва', naLentata !== null, true);
    proveri('сборът е от стотинките на клетките, не от текста',
      chisloto(naLentata ?? '', 'Сбор:'), ((sumiPoKletki[0] as any) + (sumiPoKletki[1] as any)) / 100);
    proveri('и средното се показва', (naLentata ?? '').includes('Средно'), true);

    // Shift+клик опъва дотам; Ctrl+A хваща целия блок данни.
    const redoveNaEkrana = await p.$$eval('.red.naem', (r) => r.length);
    await p.click('.red.naem > :first-child');
    const parvite = await p.$$('.red.naem > :first-child');
    await (parvite[parvite.length - 1] as any).click({ modifiers: ['Shift'] });
    proveri('Shift+клик опъва обхват от котвата до клика',
      chisloto((await statusnaLenta()) ?? '', 'Брой:'), redoveNaEkrana);
    await p.keyboard.press('Control+a');
    proveri('Ctrl+A хваща целия блок данни',
      chisloto((await statusnaLenta()) ?? '', 'Брой:') > redoveNaEkrana, true);

    // текстови клетки без пари: лентата брои, но не съчинява сбор
    await p.click('.red.naem > :first-child');
    await p.keyboard.press('Shift+ArrowDown');
    const bezPari = (await statusnaLenta()) ?? '';
    proveri('текстов обхват има Брой', bezPari.includes('Брой'), true);
    proveri('но НЯМА сбор — текстът не е пари', bezPari.includes('Сбор'), false);

    // прерисуването убива селекцията — лентата не остава да лъже за мъртви клетки
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('смяната на екрана сваля лентата', await statusnaLenta(), null);

    // ══ 30 · груповото сторно и черновата с Ctrl+Z ══════════════════════
    razdel = '30 · груповото и черновата';
    await naEkran(p, 'imoti', '#forma-imot');

    // два наема, родени само за да бъдат сторнирани заедно
    // без заковано име на имот — по §25 имотите вече са минали през поправки
    await dobaviNaem(p, { koy: 'Групов първи', suma: '111,00', sektor: 'naem-zhilishten', padezh: '1' });
    await dobaviNaem(p, { koy: 'Групов втори', suma: '222,00', sektor: 'naem-zhilishten', padezh: '1' });

    // Ctrl+клик добавя ЦЕЛИЯ ред към избора
    await p.click('.red.naem:has-text("Групов първи") > :first-child');
    await p.click('.red.naem:has-text("Групов втори") > :first-child', { modifiers: ['Control'] });
    const sIzbrani = (await statusnaLenta()) ?? '';
    proveri('Ctrl+клик вдига лентата с групово действие',
      sIzbrani.includes('Сторно на избраните (2)'), true);

    // груповото сторно: една причина (диалогът я дава), запис на ред, вест
    const predaSborove = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '[data-storno-izbrani]'));
    proveri('груповото сторно пише ПО ЕДНО събитие на ред',
      await broySabitiya(p), predaSborove + 2);
    proveri('и казва какво стана', (await tekstNa(p, '.vest')).includes('Сторнирани 2 от 2'), true);
    proveri('сторнираните редове ги няма',
      await p.$$eval('.red.naem', (r) => r.filter((x) => x.textContent.includes('Групов')).length), 0);
    proveri('лентата пада със селекцията', await statusnaLenta(), null);

    // ЧЕРНОВАТА: прерисуването я убива, Ctrl+Z я връща — до Вратата, не след нея
    await p.fill('#imot-adres', 'Черновата живее');
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));
    proveri('прерисуването уби черновата',
      await p.$eval('#imot-adres', (e) => (e as any).value), '');
    await p.keyboard.press('Control+z');
    proveri('Ctrl+Z я връща в полето',
      await p.$eval('#imot-adres', (e) => (e as any).value), 'Черновата живее');
    proveri('и НЕ пише в Журнала — границата е Вратата',
      await broySabitiya(p), predaSborove + 2);

    // ЗАПИСАНОТО не се възкресява: изпращането ИЗЯЖДА черновата. Ctrl+Z
    // след „Запиши" вади предишната чернова, не току-що записаните данни —
    // иначе второ „Запиши" прави дубликат в Журнала.
    await dobaviImot(p, 'Записаният имот', 'ап. 9');
    await p.keyboard.press('Control+z');
    const sledZapis = await p.$eval('#imot-adres', (e) => (e as any).value);
    proveri('Ctrl+Z след Запиши НЕ връща записаното',
      sledZapis === 'Записаният имот', false);
    // подредбата се прибира на изходния ред — два клика довършват цикъла
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="naemi:naem"]'));

    // ══ 31 · клипбордният мост от/към истинския Excel ═══════════════════
    razdel = '31 · клипбордният мост';
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // НАВЪН: две суми → Ctrl+C → чисти числа с таб и нов ред, без € и паузи
    await p.click('.red.naem .suma');
    await p.keyboard.press('Shift+ArrowDown');
    await p.keyboard.press('Control+c');
    await p.waitForFunction(() =>
      document.querySelector('.status-lenta')?.textContent?.includes('Копирано'));
    const vKlipborda = await p.evaluate(() => navigator.clipboard.readText());
    proveri('копирани са два реда', vKlipborda.split('\n').length, 2);
    proveri('парите тръгват като ЧИСТИ числа — Excel смята по тях',
      vKlipborda.split('\n').every((r) => /^\d+,\d\d$/.test(r)), true);
    proveri('и лентата казва „Копирано"',
      ((await statusnaLenta()) ?? '').includes('Копирано · 2 реда'), true);
    await p.keyboard.press('Escape');

    // НАВЪТРЕ: TSV от „Excel" → Ctrl+V → същият път като файл, до разликите
    const predKlipborda = await broySabitiya(p);
    const dnesKlip = new Date().toISOString().slice(0, 10);
    await p.evaluate((dnes) => {
      const dt = new DataTransfer();
      dt.setData(
        'text/plain',
        `Доставчик\tКакво\tДата\tСума\nПробен клипборд ЕООД\tцимент\t${dnes}\t240,00\n`,
      );
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
    }, dnesKlip);
    await p.waitForFunction(() => document.body.textContent.includes('Клипборд.csv'));
    proveri('следата казва откъде е дошло',
      (await p.evaluate(() => document.body.textContent)).includes('Клипборд.csv'), true);
    proveri('редът от клипборда стои в разликите като нов',
      await p.evaluate(() => document.body.textContent.includes('Пробен клипборд ЕООД')), true);
    proveri('и нищо още не е записано — Вратата чака човека',
      await broySabitiya(p), predKlipborda);
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '#otkazhi-plan'));
    proveri('отказът прибира предложението', await p.$('#otkazhi-plan'), null);

    // ══ 32 · фините филтри на ВСИЧКИ таблици ════════════════════════════
    razdel = '32 · филтрите навсякъде';
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('имотите имат търсачка', (await p.$('[data-tarsi-tablitsa="imoti"]')) !== null, true);
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="imoti:myasto"]'));
    proveri('името на колоната сортира и при имотите',
      (await tekstNa(p, '[data-podredi="imoti:myasto"]')).includes('↑'), true);
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="imoti:myasto"]'));
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="imoti:myasto"]')); // изходен ред

    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('плащанията са с филтърни глави',
      (await p.$('[data-podredi="plashtaniya:suma"]')) !== null, true);
    // търси се в която таблица има редове — коя е зависи от дотук изиграното
    const tarsachkaPari = await p.evaluate(() => {
      const t = document.querySelector('[data-tarsi-tablitsa="plashtaniya"], [data-tarsi-tablitsa="prosrocheni"], [data-tarsi-tablitsa="vsrok"]');
      return t?.getAttribute('data-tarsi-tablitsa') ?? null;
    });
    proveri('в Пари има поне една таблица с търсачка', tarsachkaPari !== null, true);
    // редовете се броят В ТАБЛИЦАТА до търсачката — две таблици делят един клас ред
    const broyDoTarsachkata = (klyuch: any) => p.evaluate((kl) => {
      const pole = document.querySelector(`[data-tarsi-tablitsa="${kl}"]`);
      const tablitsa = pole?.closest('.tarsene-v-tablitsa')?.nextElementSibling;
      return tablitsa ? tablitsa.querySelectorAll('.red').length : -1;
    }, klyuch);
    const broyPredi = await broyDoTarsachkata(tarsachkaPari);
    proveri('таблицата до търсачката има редове', broyPredi > 0, true);
    await p.fill(`[data-tarsi-tablitsa="${tarsachkaPari}"]`, 'няма такъв ред никъде');
    await p.waitForFunction((kl) => {
      const pole = document.querySelector(`[data-tarsi-tablitsa="${kl}"]`);
      const tablitsa = pole?.closest('.tarsene-v-tablitsa')?.nextElementSibling;
      return tablitsa !== null && tablitsa !== undefined && tablitsa.querySelectorAll('.red').length === 0;
    }, tarsachkaPari);
    proveri('и казва колко крие', (await tekstNa(p, '.filtar-skrito')).includes('крие'), true);
    await deystvieSPrerisuvane(p, () => p.click(`[data-filtar-izchisti-vsichko="${tarsachkaPari}"]`));
    proveri('„покажи всичко" връща редовете',
      await broyDoTarsachkata(tarsachkaPari), broyPredi);

    // ══ 33 · групирането по колона · групата СУМИРА ═════════════════════
    razdel = '33 · групирането';
    await naEkran(p, 'imoti', '#forma-imot');
    const naemiPredi = await p.$$eval('.red.naem', (r) => r.length);

    // менюто на колоната „Имот" → „Групирай по тази колона"
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-glava="naemi:imot"]'));
    await deystvieSPrerisuvane(p, () => p.click('[data-grupiray="naemi:imot"]'));
    proveri('групите се появиха', (await p.$$eval('.grupata', (r) => r.length)) > 0, true);
    proveri('редовете са си всичките', await p.$$eval('.red.naem', (r) => r.length), naemiPredi);
    proveri('групата носи сбор в евро', (await tekstNa(p, '.grupata')).includes('€'), true);

    // СВЕРКА С НЕЗАВИСИМ ВТОРИ ПЪТ: сборът в шапката = сборът на data-st
    // на редовете под нея (до следващата група).
    const sverkaNaGrupa = await p.evaluate(() => {
      const g = document.querySelector('.grupata');
      let el = (g as any).nextElementSibling;
      let sbor = 0;
      while (el && !el.classList.contains('grupata')) {
        const st = el.querySelector('.suma[data-st]');
        if (st) sbor += Number((st as any).dataset.st);
        el = el.nextElementSibling;
      }
      return { sbor, pokazano: (g as any).querySelector('.sborove')?.textContent ?? '' };
    });
    proveri('сборът на групата е сборът на редовете ѝ, стотинка по стотинка',
      Number(sverkaNaGrupa.pokazano.replace(/[^\d,-]/g, '').replace(',', '.')),
      sverkaNaGrupa.sbor / 100);

    // сгъването крие РЕДОВЕТЕ, не сбора
    await deystvieSPrerisuvane(p, () => p.click('.grupata'));
    proveri('сгънатата група крие редовете си',
      (await p.$$eval('.red.naem', (r) => r.length)) < naemiPredi, true);
    proveri('но сборът ѝ остава на екрана', (await tekstNa(p, '.grupata')).includes('€'), true);
    await deystvieSPrerisuvane(p, () => p.click('.grupata'));
    proveri('разгъването ги връща', await p.$$eval('.red.naem', (r) => r.length), naemiPredi);

    // махането връща таблицата както си беше
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-glava="naemi:imot"]'));
    await deystvieSPrerisuvane(p, () => p.click('[data-grupiray="naemi:imot"]'));
    proveri('„Махни групирането" прибира групите', await p.$('.grupata'), null);

    // ══ 34 · скриването на колона · правило 23 в действие ═══════════════
    razdel = '34 · скритата колона';
    const mesechenPredi = await plochka(p, 'Месечен наем');
    const vidimiPredi = await p.$$eval('.glava.naem > *', (r) =>
      r.filter((x) => !(x as any).hidden).length);

    // десен бутон върху клетката „Сектор" → „Скрий колоната"
    await p.click('.red.naem .kletka:nth-of-type(3)', { button: 'right' });
    await p.waitForSelector('.kontekstno-menyu');
    proveri('менюто предлага скриване с името на колоната',
      (await tekstNa(p, '.kontekstno-menyu')).includes('Скрий колоната „Сектор"'), true);
    await p.click('.kontekstno-menyu button:has-text("Скрий колоната")');
    proveri('колоната изчезна от главата',
      await p.$$eval('.glava.naem > *', (r) => r.filter((x) => !(x as any).hidden).length),
      vidimiPredi - 1);
    proveri('и от редовете',
      await p.$eval('.red.naem', (red) => [...red.children].some((x) => (x as any).hidden)), true);
    proveri('редът под таблицата казва какво е скрито',
      (await tekstNa(p, '.skrito-koloni')).includes('Скрити колони: 1'), true);

    // СКРИТОТО ПАК СЕ СМЯТА: плочката „Месечен наем" не мърда
    proveri('скритото ПАК се смята — сборът не мърда',
      await plochka(p, 'Месечен наем'), mesechenPredi);

    // презареждането помни скритото; „покажи ги" го връща
    await p.reload();
    await p.waitForSelector('#forma-imot');
    proveri('презареждането помни скритата колона',
      await p.$eval('.red.naem', (red) => [...red.children].some((x) => (x as any).hidden)), true);
    await p.click('[data-pokazhi-koloni="naemi"]');
    proveri('„покажи ги" връща колоната',
      await p.$$eval('.glava.naem > *', (r) => r.filter((x) => !(x as any).hidden).length),
      vidimiPredi);
    proveri('и редът за скритото пада', await p.$('.skrito-koloni'), null);

    // ══ 35 · редакцията в клетката · Enter пише ПРЕЗ Вратата ════════════
    razdel = '35 · редакцията в клетката';
    const predRedaktsiya = await broySabitiya(p);

    // Escape отказва — нищо не влиза в Журнала
    await p.dblclick('.red.naem [data-redakt]');
    await p.waitForSelector('.kletka-redaktor');
    await p.keyboard.press('Escape');
    proveri('Escape затваря без запис', await p.$('.kletka-redaktor'), null);
    proveri('и Журналът не мърда', await broySabitiya(p), predRedaktsiya);

    // невалидното ОСТАВА отворено, отказано с думи — и пак нищо не влиза
    await p.dblclick('.red.naem [data-redakt]');
    await p.waitForSelector('.kletka-redaktor');
    await p.fill('.kletka-redaktor', 'абв');
    await p.keyboard.press('Enter');
    proveri('невалидното остава отворено и почервенява',
      await p.$eval('.kletka-redaktor', (e) => e.classList.contains('zle')), true);
    proveri('и нищо не е записано', await broySabitiya(p), predRedaktsiya);

    // истинската поправка: Enter пише едно събитие през Вратата
    await p.fill('.kletka-redaktor', '567,89');
    await p.keyboard.press('Enter');
    await p.waitForFunction((n) =>
      Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1,
      predRedaktsiya);
    proveri('клетката показва новата сума',
      (await tekstNa(p, '.red.naem [data-redakt]')).includes('567,89'), true);
    proveri('вестта казва какво е било и какво става',
      (await tekstNa(p, '.vest')).includes('Поправено'), true);

    // F2 върху избраната клетка също отваря — картата и редакторът са едно
    await p.click('.red.naem [data-redakt]');
    await p.keyboard.press('F2');
    proveri('F2 отваря редактора върху избраната клетка',
      (await p.$('.kletka-redaktor')) !== null, true);
    // същата стойност + Enter = нищо не влиза (белегът „смени ли се")
    await p.keyboard.press('Enter');
    proveri('същата стойност не ражда събитие', await broySabitiya(p), predRedaktsiya + 1);

    // ══ 36 · груповото въвеждане · Ctrl+D и Ctrl+Enter ══════════════════
    razdel = '36 · груповото въвеждане';
    const naemniKletki = await p.$$eval('.red.naem [data-redakt]', (r) => r.length);
    proveri('има поне два наема за груповия жест', naemniKletki >= 2, true);
    const predGrupovoto = await broySabitiya(p);

    // Ctrl+D: най-горната избрана стойност се дърпа надолу — по запис на ред
    await p.click('.red.naem [data-redakt]'); // котва: първата сума (567,89)
    await p.keyboard.press('Shift+ArrowDown'); // обхватът хваща втората
    await p.keyboard.press('Control+d');
    await p.waitForFunction((n) =>
      Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1,
      predGrupovoto);
    proveri('Ctrl+D пише едно събитие за различния ред', await broySabitiya(p), predGrupovoto + 1);
    const dvete = await p.$$eval('.red.naem [data-redakt]', (r) =>
      r.slice(0, 2).map((x) => x.dataset.surovo));
    proveri('и двете клетки носят една стойност', dvete[0] === dvete[1], true);
    proveri('вестта казва колко са поправени', (await tekstNa(p, '.vest')).includes('поправени 1'), true);

    // Ctrl+D върху вече равни: нищо ново — и Журналът не мърда
    await p.click('.red.naem [data-redakt]');
    await p.keyboard.press('Shift+ArrowDown');
    await deystvieSPrerisuvane(p, () => p.keyboard.press('Control+d'));
    proveri('върху равни Ctrl+D не ражда събития', await broySabitiya(p), predGrupovoto + 1);
    proveri('и го КАЗВА, не премълчава', (await tekstNa(p, '.vest')).includes('вече'), true);

    // Ctrl+Enter: опънат избор → F2 → ново число → ляга във ВСИЧКИ
    await p.click('.red.naem [data-redakt]');
    await p.keyboard.press('Shift+ArrowDown');
    await p.keyboard.press('F2');
    await p.waitForSelector('.kletka-redaktor');
    await p.fill('.kletka-redaktor', '444,44');
    await p.keyboard.press('Control+Enter');
    await p.waitForFunction((n) =>
      Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 2,
      predGrupovoto + 1);
    proveri('Ctrl+Enter пише по едно събитие на ред', await broySabitiya(p), predGrupovoto + 3);
    proveri('и двата реда показват новото число',
      await p.$$eval('.red.naem [data-redakt]', (r) =>
        r.slice(0, 2).every((x) => x.textContent.includes('444,44'))), true);

    // ══ 37 · скоростта под договор · бюджет 100 ms на действие ══════════
    razdel = '37 · скоростта';
    // Журналът натежава: шест месеца начисления — така мярката мери
    // истинска работа, не празен екран.
    await naEkran(p, 'pari', '#forma-nachisli');
    for (const m of ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']) {
      await p.fill('#period', m);
      await deystvieSPrerisuvane(p, () => p.click('#forma-nachisli button[type=submit]'));
    }

    // Мери се ВЪТРЕ в страницата — от жеста до новия DOM, без шума на
    // управляващия процес. Наблюдателят пуска, щом прерисуването свърши
    // (белегът на шапката пада с новия DOM).
    const izmeri = (vid: any, selektor: any) => p.evaluate(async (zhest) => {
      (document.querySelector('.shapka') as any).dataset['beleg'] = 'staro';
      const t0 = performance.now();
      const el = document.querySelector(zhest.selektor);
      if (zhest.vid === 'tarsi') {
        el.value = 'с';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.click();
      }
      await new Promise<void>((gotovo) => {
        const nablyudatel = new MutationObserver(() => {
          const shapka = document.querySelector('.shapka');
          if (shapka && !(shapka as any).dataset['beleg']) {
            nablyudatel.disconnect();
            gotovo();
          }
        });
        nablyudatel.observe(document.body, { childList: true, subtree: true });
      });
      return Math.round(performance.now() - t0);
    }, { vid, selektor });

    const vremeSort = await izmeri('klik', '[data-podredi="vsrok:ostatak"]');
    const vremeTarsene = await izmeri('tarsi', '[data-tarsi-tablitsa="vsrok"]');
    const vremeEkran = await izmeri('klik', '[data-ekran="imoti"]');
    console.log(`\n  СКОРОСТТА: сортиране ${vremeSort} ms · търсене ${vremeTarsene} ms · смяна на екран ${vremeEkran} ms · бюджет 100 ms\n`);
    proveri('сортирането е под договора (100 ms)', vremeSort < 100, true);
    proveri('търсенето е под договора (100 ms)', vremeTarsene < 100, true);
    proveri('смяната на екран е под договора (100 ms)', vremeEkran < 100, true);

    // прибиране: търсенето пада, подредбата се връща на изходния ред
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('[data-tarsi-tablitsa="vsrok"]', '');
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="vsrok:ostatak"]'));
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi="vsrok:ostatak"]'));

    // ══ 38 · „ЦЕНИ МД" · файлът → Калкулатора → Имоти и Делата (И92) ════
}

/** 64 · Подредбата на екрана */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '64 · Подредбата на екрана';
    await naEkran(p, 'smetki', '#forma-period');
    // Ключът е маркерът, ако го има; иначе ЗАГЛАВИЕТО — повечето екрани нямат
    // маркер и лостът пак трябва да работи на тях (ADR-045).
    const sektsiiteNaSmetki = () =>
      p.$$eval('.telo > *', (e) =>
        e
          .filter((x) => x.querySelector('.dyalglava'))
          .map((x) => x.dataset.sektsiya ?? x.querySelector('.dyalglava h2, .dyalglava h3')?.textContent?.trim() ?? ''),
      );
    const predRazmestvaneto = await sektsiiteNaSmetki();
    proveri('екранът носи повече от една секция', predRazmestvaneto.length > 1, true);
    proveri('и всяка има свои дребни бутончета',
      (await p.$$eval('.telo [data-premesti]', (e) => e.length)) >= 2, true);

    // Второто слиза на първо място · местенето е една стъпка, без изненади.
    // Второто по ред · първото няма къде да отиде нагоре.
    await p.evaluate(() => {
      const dyalove = [...document.querySelectorAll('.telo > *')].filter((x) => x.querySelector('.dyalglava'));
      (dyalove[1]!.querySelector('[data-premesti="gore"]') as any).click();
    });
    const sledRazmestvaneto = await sektsiiteNaSmetki();
    proveri('натискането разменя съседите',
      sledRazmestvaneto[0], predRazmestvaneto[1]);
    proveri('и нищо не изчезва · същите секции, друг ред',
      [...sledRazmestvaneto].sort().join('|'), [...predRazmestvaneto].sort().join('|'));

    // ПОМНИ СЕ · подредбата е поглед, не факт (ADR-022): преживява смяна на
    // екран, но НЕ влиза в Журнала — тя е негова, не обща.
    const predSabitiya = await broySabitiya(p);
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'smetki', '#forma-period');
    proveri('редът се помни след връщане',
      (await sektsiiteNaSmetki())[0], sledRazmestvaneto[0]);
    proveri('и НИЩО не е записано в Журнала', await broySabitiya(p), predSabitiya);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 63 · НАСТРОЙКИТЕ КАТО ПАДАЩ РЕД · тема по тема (И101 т.2) ══════════
}

/**
 * 68 · Ключът на секцията · маркерът, не заглавието
 *
 * Пуска се СЛЕД §64, което доказва, че лостът за местене работи; този доказва,
 * че работи по СТАБИЛЕН ключ. Дотук маркерът стоеше само там, където някоя
 * тема от Настройки води до него, а останалите секции се ключуваха по ТЕКСТА
 * на заглавието си — значи преименуване (собственическо, по негова дума) щеше
 * да бута секцията накрая, без някой да разбере защо.
 *
 * Проверява се БРОЕНО, не поименно: имената на секциите ще се менят, а
 * правилото „всяка носи свой ключ" — не.
 *
 * ═══ ЗАЩО ТОЧНО ТУК В РЕДА ═══
 *
 * Пунктът „Лично" го има в лентата само докато Личното е ПУСНАТО — §53 го
 * прибира и екранът изчезва. Затова блокът стои веднага след пускането му:
 * това е единственият миг, в който лентата предлага и десетте. И понеже е
 * вмъкнат по средата на прохода, накрая се ВРЪЩА на екрана, от който е
 * тръгнал — блок, който мести състояние под следващия, е по-скъп от липсващ.
 *
 * ═══ ЗАЩО НЕ СЕ ЧАКА ПОЛЕ ═══
 *
 * `naEkran` чака ЕДНО поле, за да е сигурно, че екранът се е нарисувал — а тук
 * екраните са десет и половината им полета са условни (Настройки показва
 * различни секции на различна роля). Затова се чака самото ПРЕРИСУВАНЕ, което
 * важи за всеки екран. Условно поле щеше да прави прохода да пада заради
 * състояние, а не заради ключ.
 *
 * И втора причина да не се чака и белегът „текущ пункт": пунктът „Настройки" е
 * ПАДАЩ РЕД и се рисува от своя модул — той няма `tuk`, защото е и бутон, и
 * път (§63). Общата проверка не бива да предполага, че всички пунктове са
 * еднакви — те не са.
 */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '68 · Ключът на секцията · маркерът, не заглавието';

    const koyEkranE = () =>
      p.evaluate(() => (document.querySelector('.navred.tuk') as HTMLElement | null)?.dataset['ekran'] ?? '');

    /** Завежда на екран · ако вече сме там, не се пипа (клик без прерисуване виси). */
    const zavedi = async (ekran: string): Promise<void> => {
      if ((await koyEkranE()) === ekran) return;
      await deystvieSPrerisuvane(p, () => p.click(`[data-ekran=${ekran}]`));
      // Пунктът „Настройки" върши ДВЕ неща с едно натискане (§63): завежда и
      // отваря падащия си ред. Отвореният ред застава НАД съседния пункт и
      // следващото натискане би паднало върху него — затова се прибира изрично.
      await p.keyboard.press('Escape');
    };

    const ekranite = ['imoti', 'pari', 'stoynost', 'gant', 'smetki',
      'nastroyki', 'ii', 'tabove', 'lichno', 'tablo'] as const;
    const nachalniyat = await koyEkranE();

    let bezMarker = 0;
    let udvoeni = 0;
    let vsichki = 0;
    let obhodeni = 0;
    for (const ekran of ekranite) {
      // Липсващ пункт НЕ се прескача мълчаливо: `obhodeni` пада и проверката
      // отдолу го казва — иначе изгасен екран щеше да мине за проверен.
      if (!(await p.$(`[data-ekran=${ekran}]`))) continue;
      await zavedi(ekran);
      obhodeni += 1;
      const klyuchove = await p.$$eval('.telo > *', (e) =>
        e.filter((x) => x.querySelector('.dyalglava')).map((x) => (x as HTMLElement).dataset['sektsiya'] ?? ''));
      vsichki += klyuchove.length;
      bezMarker += klyuchove.filter((k) => k === '').length;
      udvoeni += klyuchove.length - new Set(klyuchove).size;
    }

    proveri('и десетте екрана се отварят от лентата в този миг', obhodeni, ekranite.length);
    proveri('и заедно носят секции за местене', vsichki > 40, true);
    proveri('НИТО ЕДНА не се ключува по заглавието си', bezMarker, 0);
    // Два еднакви ключа на един екран значат възел, прибавен два пъти при
    // разместване — тоест изчезнала секция. Затова прагът е нула, не „малко".
    proveri('и нито два ключа не съвпадат в един екран', udvoeni, 0);

    if (nachalniyat) await zavedi(nachalniyat);
}


/**
 * 69 · Групата действия · един бутон с дума и стрелкичка (ADR-057)
 *
 * Негово правило, дословно: „**С падащо меню когато е повече от един**…
 * **Когато е една функция си го пише на бутона.**" И механиката: „Избираш
 * действието — **то променя името на бутона**… и **чак когато избереш и
 * натиснеш бутона стартира действието**."
 *
 * Затова НАЙ-ВАЖНАТА проверка тук не е че менюто се отваря, а че изборът от
 * него **не добавя нито едно събитие**. Меню, което действа при избора, би
 * изглеждало еднакво на екрана и би записвало в Журнала без човек да е
 * натиснал — точно разликата, която той поиска.
 */
export async function blok4(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '69 · Групата действия · един бутон и стрелкичка';

    // Блокът е вмъкнат по средата на прохода и затова НЕ мести състояние под
    // следващия: накрая се връща на екрана, от който е тръгнал (същото правило
    // като при §68).
    const nachalniyat = await p.evaluate(
      () => (document.querySelector('.navred.tuk') as HTMLElement | null)?.dataset['ekran'] ?? '',
    );

    // Таблото носи най-простата група: Драйвът е ДВЕ действия в един контейнер.
    await naEkran(p, 'tablo', '#proveri');
    const grupata = '[data-sektsiya=prenasyane] .grupa-deystviya';
    proveri('двете действия на Драйва станаха ЕДНА група',
      await p.$$eval(grupata, (e) => e.length), 1);
    // МЕРИ СЕ ВИДИМОТО, не свойството `hidden`. Първата версия четеше атрибута
    // и казваше „скрит е", докато на екрана стояха четири бутона: авторско
    // правило за `display` бие `[hidden]` от таблицата на браузъра. Скрийншотът
    // го хвана, проходът — не. Оттук нататък го хваща и той.
    proveri('вижда се ЕДНО от тях',
      await p.$$eval(`${grupata} button:not(.strelkichka)`,
        (e) => e.filter((x) => (x as HTMLElement).checkVisibility()).length), 1);
    proveri('и това е първото · редът, в който екранът ги е нарисувал',
      await p.$eval('#drapni-drayv', (e) => (e as HTMLElement).hidden), false);
    proveri('другото стои в DOM-а, само скрито · слушателят му не е пипан',
      await p.$eval('#butni-drayv', (e) => (e as HTMLElement).hidden), true);
    proveri('и наистина не се вижда · не само по атрибут',
      await p.$eval('#butni-drayv', (e) => !(e as HTMLElement).checkVisibility()), true);
    proveri('стрелкичката КАЗВА, че носи меню',
      await p.$eval(`${grupata} .strelkichka`, (e) => e.getAttribute('aria-haspopup')), 'menu');
    proveri('и че е прибрана',
      await p.$eval(`${grupata} .strelkichka`, (e) => e.getAttribute('aria-expanded')), 'false');

    razdel = '69 · Групата действия · менюто ИЗПИСВА думите';
    await p.click(`${grupata} .strelkichka`);
    await p.waitForSelector('.kontekstno-menyu');
    proveri('отвореното се казва на четеца на екран',
      await p.$eval(`${grupata} .strelkichka`, (e) => e.getAttribute('aria-expanded')), 'true');
    proveri('менюто изрежда ВСИЧКИ действия, с думите им',
      (await p.$$eval('.kontekstno-menyu [data-deystvie]', (e) => e.map((x) => x.textContent))).join(' · '),
      'Дръпни от Драйва · Бутни в Драйва');

    razdel = '69 · Групата действия · изборът СМЕНЯ думата, но НЕ действа';
    const predIzbora = await broySabitiya(p);
    await p.click('.kontekstno-menyu [data-deystvie="Бутни в Драйва"]');
    await p.waitForSelector('#butni-drayv:not([hidden])');
    proveri('избраното стана видимото',
      await p.$eval('#butni-drayv', (e) => (e as HTMLElement).hidden), false);
    proveri('а другото се прибра', await p.$eval('#drapni-drayv', (e) => (e as HTMLElement).hidden), true);
    // ТОВА е разликата между „меню" и „меню, което избира".
    proveri('и НИТО ЕДНО събитие не е влязло в Журнала', await broySabitiya(p), predIzbora);
    proveri('менюто се е прибрало след избора',
      await p.$$eval('.kontekstno-menyu', (e) => e.length), 0);

    razdel = '69 · Групата действия · изборът преживява смяна на екран';
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'tablo', '#proveri');
    proveri('върнах се и думата е онази, която избрах',
      await p.$eval('#butni-drayv', (e) => (e as HTMLElement).hidden), false);

    razdel = '69 · Групата действия · едно действие си пише думата';
    // Негово правило: група се прави от ПОВЕЧЕ от едно. „Излез" е сам в своя
    // контейнер и няма какво да избира — значи няма и стрелкичка.
    proveri('самотното действие НЕ е в група',
      await p.$eval('#izlez', (e) => Boolean(e.closest('.grupa-deystviya'))), false);
    proveri('и си е с думата', await p.$eval('#izlez', (e) => e.textContent!.trim()), 'Излез');

    razdel = '69 · Групата действия · голият знак остава отвън';
    // ▲ и ▼ носят `aria-label`, но нямат ДУМА, а той каза „исписване".
    // Стрелка, натискана пет пъти подред, в меню става неизползваема.
    await naEkran(p, 'tabove', '#izbor-tab');
    proveri('местенето с ▲ стои видимо, извън всяка група',
      await p.$eval('[data-sektsiya-gore]', (e) =>
        (e as HTMLElement).hidden || Boolean(e.closest('.grupa-deystviya'))), false);

    if (nachalniyat) {
      await deystvieSPrerisuvane(p, () => p.click(`[data-ekran=${nachalniyat}]`));
      await p.keyboard.press('Escape');
    }
}

/**
 * 73 · Плътността на реда и свитата лента (ADR-058)
 *
 * Негови думи (27.08): „**В менюто да се скрива като при клод и да може да се
 * застопори.** Редовете в таблиците да приличат повече на **Проджект Мениджър
 * и ексел** и да не са толкова високи. Да можеш да видиш максимално **без
 * празни пространства колкото е текста** и **ако колоната е тясна минава на
 * следваш ред**, компактно и подредено."
 *
 * Плътността се МЕРИ, не се оценява: числото тук е праг, който пада при първия
 * върнат назад отстъп. Дотук такъв пазач нямаше — трите резена за плътност
 * (1–3) се провериха с око и скрийншот, а окото не помни колко е било.
 */
export async function blok5(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '73 · Плътността · редът е висок колкото текста си';

    await naEkran(p, 'imoti', '#forma-imot');
    const podlozhkata = await p.$eval('.red', (e) => {
      const st = getComputedStyle(e);
      return `${parseInt(st.paddingTop, 10)}/${parseInt(st.paddingBottom, 10)}`;
    });
    proveri('подложката на реда е дребна · беше 13px', podlozhkata, '4/4');
    // Редът на Имоти носи две реда текст (място и единица) — значи ~48px.
    // Прагът е 56: над него значи, че нещо пак е почнало да вдига реда.
    const visochina = await p.$eval('.red', (e) => Math.round(e.getBoundingClientRect().height));
    console.log(`\n  ВИСОЧИНА НА РЕД: ${visochina}px · праг 56\n`);
    proveri('редът стои под прага си', visochina <= 56, true);

    razdel = '73 · Плътността · тясната колона ПРЕНАСЯ, не реже';
    // Многоточието СКРИВА текст и не казва колко — отрязано име на доставчик
    // изглежда точно като цяло.
    proveri('клетката пренася на нов ред',
      await p.$eval('.kletka b', (e) => getComputedStyle(e).overflowWrap), 'anywhere');
    proveri('и НЕ реже с многоточие',
      await p.$eval('.kletka span', (e) => getComputedStyle(e).textOverflow), 'clip');

    razdel = '73 · Плътността · редовите действия са ЕДИН лост';
    // „История" беше ръчен близнак на второстепенния бутон и затова оставаше
    // ИЗВЪН групата: редът носеше два лоста, те не се побираха и се пренасяха.
    // ЕДИН ред, не всички · `$$eval` събира цялата таблица и числото престава
    // да значи „колко лоста има РЕДЪТ".
    proveri('в реда стои една група, не два лоста',
      await p.$eval('.red', (e) =>
        [...e.querySelectorAll('.butoni > *')].filter((x) => (x as HTMLElement).checkVisibility()).length), 1);

    razdel = '73 · Лентата · свива се и се застопорява';
    proveri('копчето казва, че лентата е ЗАСТОПОРЕНА',
      await p.$eval('#svii-lentata', (e) => e.getAttribute('aria-pressed')), 'true');
    const shirokaBeshe = await p.$eval('.strana', (e) => Math.round(e.getBoundingClientRect().width));
    await deystvieSPrerisuvane(p, () => p.click('#svii-lentata'));
    const svita = await p.$eval('.strana', (e) => Math.round(e.getBoundingClientRect().width));
    proveri('свитата лента е много по-тясна', svita < shirokaBeshe / 3, true);
    proveri('и името на пункта НЕ се вижда · остава знакът',
      await p.$eval('.navred .navime', (e) => (e as HTMLElement).checkVisibility()), false);
    proveri('но го носи цяло за четеца на екран',
      (await p.$eval('.navred .navime', (e) => e.textContent!.trim())).length > 0, true);

    razdel = '73 · Лентата · застопоряването се помни';
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('свитото преживява смяна на екран',
      await p.$eval('.strana', (e) => e.classList.contains('svita')), true);
    await deystvieSPrerisuvane(p, () => p.click('#svii-lentata'));
    proveri('и се връща разтворена',
      await p.$eval('.strana', (e) => e.classList.contains('svita')), false);
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '75 · Хедърът се ЗАДЪРЖА · една скролираща кутия на екран';
    // Негово: „Хедърите също при скрол трябваше да се задържат."
    //
    // МЕРИ СЕ СТАБИЛНОСТ, не абсолютна позиция. Главата се лепи на върха на
    // СЪДЪРЖАНИЕТО на тялото (след подложката му), значи числото ѝ не е върхът
    // на тялото — но е ЕДНО И СЪЩО при два различни скрола. Проверка по
    // абсолютна позиция би паднала при първата смяна на подложката.
    proveri('таблицата НЯМА свой скрол · кутията е една',
      await p.$eval('.tablitsa', (e) => {
        const st = getComputedStyle(e);
        return `${st.overflowX}/${st.overflowY}`;
      }), 'visible/visible');
    proveri('скролиращата кутия е ТЯЛОТО',
      await p.$eval('.telo', (e) => getComputedStyle(e).overflowY), 'auto');
    // Страницата НЕ скролва — инак главата пак си отива с нея. Лентата има
    // свой скрол точно затова: при десет пункта тя надхвърля екрана и БУТАШЕ
    // страницата (премерено 1003px при видими 900).
    proveri('страницата НЕ скролва · нищо не бута тялото',
      await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true);

    const glavataPri = async (kolko: number): Promise<number> => {
      await p.$eval('.telo', (e, s2) => { (e as HTMLElement).scrollTop = s2 as number; }, kolko);
      await p.waitForTimeout(120);
      return p.$eval('.tablitsa .glava', (e) => Math.round(e.getBoundingClientRect().top));
    };
    const glavaA = await glavataPri(900);
    const glavaB = await glavataPri(1300);
    console.log(`\n  ГЛАВАТА при скрол 900 → ${glavaA}px · при 1300 → ${glavaB}px\n`);
    proveri('главата стои на едно и също място при два различни скрола', glavaA, glavaB);

    const parvataPri = async (kolko: number): Promise<number> => {
      await p.$eval('.telo', (e, s2) => { (e as HTMLElement).scrollLeft = s2 as number; }, kolko);
      await p.waitForTimeout(120);
      return p.$eval('.red', (r) => Math.round(r.firstElementChild!.getBoundingClientRect().left));
    };
    const parvaA = await parvataPri(200);
    const parvaB = await parvataPri(600);
    proveri('и първата колона остава замразена настрани', parvaA, parvaB);
    await p.$eval('.telo', (e) => {
      (e as HTMLElement).scrollLeft = 0;
      (e as HTMLElement).scrollTop = 0;
    });

    razdel = '74 · Плочките · числото и думата на ЕДИН ред';
    // Негови думи: „полетата където дават цифри… с текста НЕ над и под цифрата
    // а да е ДО… и да не закриват важността на информацията долу."
    // Прагът е 72, не 60: височината зависи от СЪДЪРЖАНИЕТО — дълъг подтекст
    // („начислено · €" под „МЕСЕЧЕН НАЕМ") се пренася на втори ред в капнатите
    // 240px и плочката става 66 вместо 49. Това не е разхлабване: беше над 90,
    // а истинският сигнал е ПЕЧАТАНОТО число, не прагът.
    const plochka = await p.$eval('.plochka', (e) => Math.round(e.getBoundingClientRect().height));
    console.log(`\n  ВИСОЧИНА НА ПЛОЧКА: ${plochka}px · праг 72\n`);
    proveri('плочката е ниска · под прага си', plochka <= 72, true);
    // ЧИСЛОТО И ЕТИКЕТЪТ СА ЕДИН ДО ДРУГ, не един под друг: мери се дали
    // етикетът почва ВДЯСНО от числото, не под него.
    proveri('етикетът стои ВДЯСНО от числото, не под него',
      await p.$eval('.plochka', (e) => {
        const ch = e.querySelector('.chislo')!.getBoundingClientRect();
        const et = e.querySelector('.etiket')!.getBoundingClientRect();
        return et.left >= ch.right - 1;
      }), true);
    // ДА НЕ ЗАКРИВАТ ВАЖНОТО ОТДОЛУ · мярка, не усещане: под една трета екран.
    const lentata = await p.$eval('.plochki', (e) => e.getBoundingClientRect().height);
    proveri('редът плочки заема под една трета от екрана',
      lentata < (await p.evaluate(() => innerHeight)) / 3, true);
    proveri('и не се разтяга · плочката е капната',
      await p.$eval('.plochka', (e) => Math.round(e.getBoundingClientRect().width) <= 240), true);

}
