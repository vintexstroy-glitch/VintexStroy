import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, denOtDnes, deystvieSPrerisuvane, dobaviImot, dobaviNaem, naEkran, napishiVPoleto, natisniVGrupata, ostatak, plochka, redove, sSabitie, sSabitiya, tekstNa, zapishiDelo } from '../yadro/pomoshtni.ts';
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

    // ЕДИНАЙСЕТ, не десет · `sluzhiteli` (резен 14а) липсваше тук и §68
    // минаваше зелен, без да го е отварял нито веднъж.
    const ekranite = ['imoti', 'pari', 'stoynost', 'gant', 'smetki',
      'nastroyki', 'ii', 'tabove', 'lichno', 'sluzhiteli', 'tablo'] as const;
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

    proveri('и единайсетте екрана се отварят от лентата в този миг', obhodeni, ekranite.length);
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
/** Адресът се СГЛОБЯВА · стената не пуска цял чужд адрес в кода (резен 31). */
const ADRES_NA_PAPKA = ['https:', '//', 'primer.example', '/obekt-1'].join('');

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

    // ══ 72 · РЕДЪТ НА МЕНЮТО · два слоя, и само единият пише (И111) ═══════
    //
    // Негово решение от 28.08, взето измежду три: „И ДВЕТЕ · начален ред +
    // личен". Проходът брои точно това разделение — СЪБИТИЯТА.
    razdel = '72 · Менюто · моят ред НЕ пише в Журнала';
    const punktovePredi = await p.$$eval('[data-ekran]', (e) => e.map((x) => (x as HTMLElement).dataset['ekran']));
    proveri('всеки пункт носи стрелки за местене',
      (await p.$$eval('[data-mesti]', (e) => e.length)) >= punktovePredi.length - 1, true);
    // ПЪРВИЯТ няма „нагоре", ПОСЛЕДНИЯТ няма „надолу" — бутон към нищото учи
    // човека да не вярва на бутоните.
    proveri('първият няма стрелка нагоре',
      await p.$$eval('.navpunkt:first-child [data-posoka=gore]', (e) => e.length), 0);

    const predMestene = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () =>
      p.click(`[data-mesti="${punktovePredi[1]}"][data-posoka=gore]`));
    const punktoveSled = await p.$$eval('[data-ekran]', (e) => e.map((x) => (x as HTMLElement).dataset['ekran']));
    proveri('вторият пункт стана ПЪРВИ', punktoveSled[0], punktovePredi[1]);
    proveri('и НИТО ЕДНО събитие не е влязло · редът ми е ПОГЛЕД',
      await broySabitiya(p), predMestene);

    razdel = '72 · Менюто · моят ред преживява смяна на екран';
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('редът стои след смяна на екран',
      (await p.$$eval('[data-ekran]', (e) => (e[0] as HTMLElement).dataset['ekran'])), punktovePredi[1]);

    razdel = '72 · Менюто · скриването е ЛИЧНО и се ВРЪЩА от Таблото';
    await naEkran(p, 'tablo', '[data-sektsiya="tablo-lenta"]');
    proveri('картата изрежда ВСИЧКИ пунктове, не само видимите',
      await p.$$eval('[data-punkt]', (e) => e.length), punktovePredi.length);
    // ТАБЛОТО И НАСТРОЙКИ не се скриват · отметките им са заключени.
    proveri('Таблото не може да се скрие',
      await p.$eval('[data-punkt="tablo"]', (e) => (e as HTMLInputElement).disabled), true);
    proveri('и Настройки също',
      await p.$eval('[data-punkt="nastroyki"]', (e) => (e as HTMLInputElement).disabled), true);

    const predSkrivaneto = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('[data-punkt="smetki"]'));
    proveri('скритият пункт пада от лентата',
      await p.$$eval('[data-ekran=smetki]', (e) => e.length), 0);
    proveri('но СТОИ в картата · изключено ≠ липсващо',
      await p.$$eval('[data-punkt="smetki"]', (e) => e.length), 1);
    proveri('и скриването НЕ пише в Журнала', await broySabitiya(p), predSkrivaneto);
    // …и се връща оттам, откъдето е скрито.
    await deystvieSPrerisuvane(p, () => p.click('[data-punkt="smetki"]'));
    proveri('връща се от Таблото', await p.$$eval('[data-ekran=smetki]', (e) => e.length), 1);

    razdel = '72 · Менюто · НАЧАЛНИЯТ ред е ЕДНО събитие, при натиснат бутон';
    const predZapisa = await broySabitiya(p);
    await sSabitie(p, () => p.click('#zapishi-nachalniya-red'));
    proveri('записът е ТОЧНО едно събитие', (await broySabitiya(p)) - predZapisa, 1);
    proveri('и се казва на глас какво е станало',
      (await tekstNa(p, '.vest')).includes('Началният ред е записан'), true);
    // МОЯТ ред се забравя след публикуване — инак личният слой би повтарял
    // основния и следващата промяна на основния нямаше да се вижда.
    proveri('и „Забрави моя ред" вече няма какво да забравя',
      await p.$eval('#zabravi-moya-red', (e) => (e as HTMLButtonElement).disabled), true);
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('а редът си остава онзи, който Стопанинът записа',
      (await p.$$eval('[data-ekran]', (e) => (e[0] as HTMLElement).dataset['ekran'])), punktovePredi[1]);

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
    // ДВАТА СКРОЛА СЕ СМЯТАТ ОТ САМАТА ТАБЛИЦА, не се заковават.
    //
    // Дотук тук стояха 900 и 1300 — числа, верни за височината на екрана в деня,
    // в който бяха написани. Резен 37 добави колона и два реда обяснение под
    // таблицата, тя слезе по-надолу, и 1300 вече падаше ИЗВЪН нея: главата се
    // отлепваше по естествен път, а проверката го обявяваше за счупена лепкавост.
    //
    // Числото трябва да е ВЪТРЕ в обхвата на таблицата — това е онова, което
    // проверката значи. Мери се стабилност, не абсолютна позиция (и точно това
    // пише коментарът отгоре, но самите числа не го спазваха).
    const obhvat = await p.$eval('.tablitsa', (e) => {
      const telo = document.querySelector('.telo') as HTMLElement;
      const gore = e.getBoundingClientRect().top - telo.getBoundingClientRect().top + telo.scrollTop;
      return { gore: Math.round(gore), visochina: Math.round(e.getBoundingClientRect().height) };
    });
    const parviyat = obhvat.gore + Math.round(obhvat.visochina * 0.25);
    const vtoriyat = obhvat.gore + Math.round(obhvat.visochina * 0.6);
    const glavaA = await glavataPri(parviyat);
    const glavaB = await glavataPri(vtoriyat);
    console.log(`\n  ГЛАВАТА при скрол ${parviyat} → ${glavaA}px · при ${vtoriyat} → ${glavaB}px\n`);
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

    razdel = '79 · Дървото под имота · много степени, не две';
    // Негово, 27.08: „Да има РАЗРАСТВАНЕ НА ПЛАНА ПОД ИМОТ за задачи, дела,
    // проекти, цели С МНОГО СТЪПКИ като строителство на сграда в Гант. Да може
    // когато вкараш нова степен от главното дърво да се прибира при всяка
    // степен с ЕДНА КОЛОНА."
    //
    // ПЪРВО СЕ ЗАТВАРЯ падащият ред. Пунктът в лентата Е и падащият бутон
    // (ADR-057в), значи предишната навигация до Имоти го е ОТВОРИЛА — а отворен
    // ред покрива пунктовете под себе си и следващият клик не стига до тях.
    // Същият урок като в §77, платен втори път.
    await p.keyboard.press('Escape');
    await naEkran(p, 'gant', '#d-forma-delo');
    // Четири степени · „строителство на сграда" с много стъпки. Сроковете на
    // детето излизат ИЗВЪН тези на родителя нарочно: обобщената лента се СМЯТА
    // от децата, а не се преписва от родителя.
    const napraviDelo = async (ime: string, nad: string, ot: string, do_: string): Promise<void> => {
      await zapishiDelo(p, {
        myasto: 'Строеж', obekt: '', ime, otgovornik: 'Иван',
        ot, do: do_, otsenka: 'важно-неспешно', ...(nad === '' ? {} : { nad }),
      });
    };
    await napraviDelo('Сграда А', '', '2026-08-01', '2026-08-31');
    await napraviDelo('Груб строеж', 'Сграда А', '2026-08-05', '2026-09-30');
    await napraviDelo('Кофраж', 'Груб строеж', '2026-08-10', '2026-08-20');
    await napraviDelo('Кофраж етаж 1', 'Кофраж', '2026-08-12', '2026-08-15');

    interface RedNaDarvo {
      readonly stepen: number;
      readonly otstap: number;
      readonly nomer: string;
    }
    const stepeni: RedNaDarvo[] = await p.$$eval('.gant-delo[data-stepen]', (se) =>
      se.map((e) => ({
        stepen: Number((e as HTMLElement).dataset['stepen']),
        otstap: Math.round(parseFloat(getComputedStyle(e).paddingLeft)),
        nomer: e.querySelector('.nomer-stepen')?.textContent?.trim() ?? '',
      })));
    const nayDalboko = Math.max(...stepeni.map((x) => x.stepen));
    console.log(`\n  ДЪРВОТО: най-дълбока степен ${nayDalboko} · отстъпи ${
      [...new Set(stepeni.map((x) => x.otstap))].sort((a, b) => a - b).join(' · ')}px\n`);
    proveri('дървото стига до ТРЕТА степен и по-надълбоко', nayDalboko >= 3, true);
    // ОТСТЪПЪТ РАСТЕ · дотук подподделото се рисуваше ТОЧНО като подделото.
    const poStepen = new Map<number, number>();
    for (const x of stepeni) poStepen.set(x.stepen, x.otstap);
    const naredeni = [...poStepen.entries()].sort((a, b) => a[0] - b[0]).map(([, o]) => o);
    proveri('всяка степен е с ПО-ГОЛЯМ отстъп от предната',
      naredeni.every((o, i) => i === 0 || o > naredeni[i - 1]!), true);
    // НОМЕРАТА 1 · 1.1 · 1.2.3 · смятат се, не се записват.
    proveri('най-дълбокото носи номер с три точки',
      (stepeni.find((x) => x.stepen === nayDalboko)?.nomer.match(/\./g) ?? []).length,
      nayDalboko);

    razdel = '79 · Дървото · обобщената лента на родителя';
    // Взето от MS Project: „обобщена лента на родителя — инак родителят е
    // празен ред." Тук тя се РАЗПЪВА, никога не се свива: `ot` и `do` са
    // записан факт, а не изведено число.
    const lentataNa = async (ime: string): Promise<{ ot: number; broy: number }> =>
      p.$eval(`.gant-red:has(.gant-lenta b:text-is("${ime}")) .gant-lenta`, (e) => ({
        ot: Number((e as HTMLElement).dataset['ot']),
        broy: Number((e as HTMLElement).dataset['broy']),
      }));
    const roditel = await lentataNa('Сграда А');
    const dete = await lentataNa('Груб строеж');
    proveri('лентата на родителя ЗАПОЧВА не по-късно от детето си',
      roditel.ot <= dete.ot, true);
    proveri('и СВЪРШВА не по-рано от него',
      roditel.ot + roditel.broy >= dete.ot + dete.broy, true);
    proveri('обобщената лента се различава по ФОРМА, не само по цвят',
      await p.$eval('.gant-red:has(.gant-lenta b:text-is("Сграда А")) .gant-lenta',
        (e) => e.classList.contains('obobshtena')), true);
    proveri('делото БЕЗ деца НЕ носи обобщена лента',
      await p.$eval('.gant-red:has(.gant-lenta b:text-is("Кофраж етаж 1")) .gant-lenta',
        (e) => e.classList.contains('obobshtena')), false);

    razdel = '79 · Дървото · навътре и навън · „вкараш нова степен"';
    // Негово, 27.08: „Да може когато ВКАРАШ НОВА СТЕПЕН от главното дърво да се
    // прибира при всяка степен с една колона." Двете посоки са ЕДНО действие:
    // менят само родителя, значи са ПОПРАВКА на същото дело — същият `id`.
    const stepenNaReda = async (ime: string): Promise<number> =>
      p.$eval(`.gant-delo:has(b:text-is("${ime}"))`,
        (e) => Number((e as HTMLElement).dataset['stepen']));
    const stepenPredi = await stepenNaReda('Кофраж');
    const chakayStepen = async (ime: string, n: number): Promise<void> => {
      await p.waitForFunction(
        ([i, k]) => Number(([...document.querySelectorAll('.gant-delo')]
          .find((e) => e.querySelector('b')?.textContent === i) as HTMLElement | undefined)
          ?.dataset['stepen'] ?? -1) === k,
        [ime, n] as [string, number],
      );
    };
    await sSabitie(p, () => p.click('.gant-delo:has(b:text-is("Кофраж")) [data-navan]'));
    await chakayStepen('Кофраж', stepenPredi - 1);
    proveri('НАВЪН вдига делото с ЕДНА степен',
      await stepenNaReda('Кофраж'), stepenPredi - 1);
    proveri('и детето му го следва · дървото не се къса',
      await stepenNaReda('Кофраж етаж 1'), stepenPredi);

    // НАВЪТРЕ · под реда НАД себе си на своето ниво. Не се проверява като
    // „връща предишното обратно": редът вътре в едно ниво днес се СМЯТА
    // (спешност → срок → име), а ръчният ред — неговата колона „поредност" —
    // още не е построен. Затова се мери каквото е обещано: делото влиза под
    // реда, който стои над него.
    await sSabitie(p, () => p.click('.gant-delo:has(b:text-is("Груб строеж")) [data-navatre]'));
    await chakayStepen('Груб строеж', stepenPredi);
    proveri('НАВЪТРЕ влиза под реда над себе си · с една степен надолу',
      await stepenNaReda('Груб строеж'), stepenPredi);

    razdel = '79 · Дървото · „няма къде" се КАЗВА, не се мълчи';
    const bezPromyana = await broySabitiya(p);
    await p.click('.gant-delo:has(b:text-is("Сграда А")) [data-navan]');
    await p.waitForFunction(() =>
      (document.querySelector('.vest')?.textContent ?? '').includes('корена'));
    proveri('дело в корена казва защо не мърда',
      (await tekstNa(p, '.vest')).includes('Вече е в корена'), true);
    proveri('и НИТО едно събитие не влиза в Журнала',
      await broySabitiya(p), bezPromyana);

    razdel = '79 · Дървото · сгъването крие ВСИЧКИТЕ потомци';
    // Сгъвачът се търси ПО ИМЕТО НА РЕДА, не като „първия на екрана": на
    // Управление стоят и осемдесетте дела от предишните раздели, и първият
    // сгъвач е чужд — крие едно дете и мярката „внуците също" губи смисъл.
    const sgavachatNa = (ime: string): string => `.gant-delo:has(b:text-is("${ime}")) .sgavach`;
    // ЧАКА СЕ БРОЯТ НА ДЕЛАТА, не прерисуването на черупката. Сгъването е
    // ПОГЛЕД (ADR-022) и не ражда събитие — значи шапката не се пипа и белегът
    // ѝ стои завинаги. `deystvieSPrerisuvane` тук виси 30 секунди и лъже, че
    // сгъването не работи.
    const delaPredi = await p.$$eval('.gant-delo', (e) => e.length);
    const chakayDela = async (kolko: number): Promise<void> => {
      await p.waitForFunction((n) => document.querySelectorAll('.gant-delo').length === n, kolko);
    };
    await p.click(sgavachatNa('Сграда А'));
    await chakayDela(delaPredi - 3);
    proveri('сгъването крие ТРИТЕ потомъка · не само детето',
      await p.$$eval('.gant-delo', (e) => e.length), delaPredi - 3);
    // И ОБРАТНО · свитото дело ПАК носи сгъвача си. Дотук той изчезваше:
    // броено от видимото, свитото няма деца — значи сгъването беше еднопосочно
    // и единственият изход беше бутонът „СЕГА".
    await p.click(sgavachatNa('Сграда А'));
    await chakayDela(delaPredi);
    proveri('и разгъването ги връща всичките · сгъвачът не изчезва',
      await p.$$eval('.gant-delo', (e) => e.length), delaPredi);
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '78 · Гантът · подвижната граница и стандартната колона';
    // Негово, 27.08: „Диаграмата се вижда 2 ТРЕТИ от екрана и също границата
    // между таблицата и диаграмата до нея СЕ МЕСТИ С МИШКАТА." И: „да запази
    // ЕДНА СТАНДАРТНА КОЛОНА като ширина… ако местиш една колона местиш
    // ширината на ВСИЧКИ колони."
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('границата е СВОЙ възел, с роля за четеца',
      await p.$eval('.gant-granitsa', (e) => e.getAttribute('role')), 'separator');

    const dyalat = async (): Promise<number> => {
      const [tabl, diag] = await p.$eval('.gant-dvete', (e) => {
        const d = [...e.children].filter((x) => !x.classList.contains('gant-granitsa'));
        return [d[0]!.getBoundingClientRect().width, d[1]!.getBoundingClientRect().width];
      });
      return Math.round((diag! / (tabl! + diag!)) * 100) / 100;
    };
    const dyalPredi = await dyalat();
    console.log(`\n  ДЯЛ НА ДИАГРАМАТА: ${dyalPredi} · неговото число е 0,67\n`);
    proveri('диаграмата е около ДВЕ ТРЕТИ', Math.abs(dyalPredi - 0.667) < 0.06, true);

    // ГРАНИЦАТА СЕ МЕСТИ · клавиатурата е достатъчна и е по-устойчива от влачене.
    //
    // БЕЗ `deystvieSPrerisuvane`: стрелката мени САМО променлива на стила и не
    // прерисува екрана — чакане за прерисуване тук виси до край. Лост, който не
    // пипа Журнала, няма защо да прерисува (ADR-022: погледът не е факт).
    await p.focus('.gant-granitsa');
    await p.keyboard.press('ArrowLeft');
    await p.waitForTimeout(150);
    const dyalSled = await dyalat();
    proveri('стрелка наляво прави диаграмата ПО-ГОЛЯМА', dyalSled > dyalPredi, true);
    // ПРЕЖИВЯВА ЛИ · сега наистина се сменя екран и се връща.
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('и съотношението преживява смяна на екран',
      Math.abs((await dyalat()) - dyalSled) < 0.02, true);

    razdel = '78 · Гантът · колоната е СТАНДАРТНА, не разтеглива';
    // `1fr` разпъваше колоните да напълнят мястото — и хоризонталният скрол
    // нямаше какво да скролва. Мери се, че всички колони са ЕДНАКВИ и че
    // ширината идва от ЕДНО число.
    const koloni = await p.$$eval('.gant-glava-vreme span', (se) =>
      se.map((e) => Math.round(e.getBoundingClientRect().width)));
    proveri('времевата ос има колони', koloni.length > 1, true);
    proveri('и ВСИЧКИ са с една и съща ширина · едно число за всички',
      new Set(koloni).size, 1);
    proveri('ширината идва от ЕДНА променлива на решетката',
      (await p.$eval('.gant', (e) => getComputedStyle(e).getPropertyValue('--kolona'))).trim(),
      '34px');
    // И ХОРИЗОНТАЛНИЯТ СКРОЛ · негово „скрол за хоризонталния период".
    proveri('времевата ос скролва хоризонтално',
      await p.$eval('.gant-vreme', (e) => getComputedStyle(e).overflowX), 'auto');
    proveri('а имената НЕ скролват с нея · остават на място',
      await p.$eval('.gant-imena', (e) => getComputedStyle(e).overflowX), 'hidden');
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '77 · Семействата хедъри · еднаквите застават една до друга';
    // Негово, 27.08: таблиците с еднакви хедъри се подреждат една до друга —
    // „като СОРТИРАНЕ". И от 08.08 (р70·[32]): „хедърите от еднаквите таблици…
    // някой хедъри имат индивидуални колони за себе си."
    //
    // Сметки има ЧЕТИРИНАЙСЕТ секции и е екранът, на който това има смисъл.
    await naEkran(p, 'smetki', '#forma-razhod');
    const otpechatatsi = async (): Promise<string[]> =>
      p.$$eval('[data-sektsiya]', (se) =>
        se.map((e) => {
          const g = e.querySelector('.tablitsa .glava');
          return g === null
            ? ''
            : [...g.children].map((k) => (k.textContent ?? '').trim().toLowerCase()).join('|');
        }),
      );
    // Колко ДВОЙКИ съседи с еднаква глава има ПРЕДИ подреждането.
    const sasedi = (o: readonly string[]): number =>
      o.filter((x, i) => x !== '' && i > 0 && o[i - 1] === x).length;
    const predi = await otpechatatsi();
    const semeystvaPredi = new Set(predi.filter((x) => x !== '')).size;
    proveri('екранът има повече от една таблица, за да има какво да се подрежда',
      predi.filter((x) => x !== '').length > 1, true);

    // Лостът е в падащия ред на екрана и се показва САМО когато има какво да събере.
    //
    // ПУНКТЪТ Е И ПАДАЩИЯТ БУТОН: `naEkran` натиска него, значи редът вече може
    // да е ОТВОРЕН. Втори клик би го ЗАТВОРИЛ — и чакането щеше да виси до край
    // върху скрит възел. Затова се отваря само когато е затворен.
    const otvoriReda = async (): Promise<void> => {
      if (await p.$('#ekran-red-smetki:not([hidden])')) return;
      await p.click('.padasht-menyu > [data-ekran=smetki]');
      await p.waitForSelector('#ekran-red-smetki:not([hidden])');
    };
    await otvoriReda();
    await p.waitForSelector('[data-podredi-semeystva]');
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi-semeystva]'));

    const sled = await otpechatatsi();
    console.log(`\n  СЕМЕЙСТВА ХЕДЪРИ: съседни двойки ${sasedi(predi)} → ${sasedi(sled)}\n`);
    proveri('еднаквите глави застават една до друга · съседството РАСТЕ',
      sasedi(sled) >= sasedi(predi), true);
    // НИЩО НЕ СЕ ГУБИ · подредбата мести, не трие.
    proveri('нито една секция не изчезва при подреждането', sled.length, predi.length);
    proveri('и семействата са същите на брой',
      new Set(sled.filter((x) => x !== '')).size, semeystvaPredi);

    razdel = '77 · Семействата · ВТОРОТО натискане не мърда нищо';
    // Устойчиво: човек, който вече е наредил своето, не бива да го губи.
    await otvoriReda();
    await deystvieSPrerisuvane(p, () => p.click('[data-podredi-semeystva]'));
    proveri('повторното подреждане дава СЪЩИЯ ред', (await otpechatatsi()).join('¦'), sled.join('¦'));
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '76 · Размерът на текста · лост, видим по всяко време';
    // Негово: „Бутоните за размера на текста да е видим по ВСЯКО ВРЕМЕ горе в
    // дясно, НА ВСЕКИ ПРОЗОРЕЦ."
    //
    // Мери се ПРЕМЕРЕНИЯТ размер, не атрибутът: правило може да е вярно и пак
    // да не стига до текста (`[hidden]` вече ни го показа два пъти, ADR-057).
    proveri('лостът стои ГОРЕ ВДЯСНО, в шапката',
      await p.$$eval('.shapka .desno-gore .goleminata button', (b) => b.length), 3);
    const tekstPredi = await p.$eval('body', (e) =>
      Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100);
    await p.click('.shapka .goleminata [data-golemina="edro"]');
    await p.waitForTimeout(150);
    const tekstEdro = await p.$eval('body', (e) =>
      Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100);
    console.log(`\n  РАЗМЕР НА ТЕКСТА: нормално ${tekstPredi}px → едро ${tekstEdro}px\n`);
    proveri('едрото наистина уголемява ТЕКСТА', tekstEdro > tekstPredi, true);
    proveri('и е отбелязано точно ЕДНО стъпало',
      await p.$$eval('.shapka .goleminata button[aria-pressed="true"]', (b) => b.length), 1);

    // СКАЛАТА ОСТАВА `rem`-БАЗИРАНА · лостът мени БАЗАТА, не заменя механизма.
    // Инак човек, вдигнал шрифта в браузъра, губи своето при първото натискане.
    proveri('скалата остава rem-базирана · множител, не нова скала',
      await p.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--text-base').includes('rem')),
      true);

    razdel = '76 · Размерът · и В ПРОЗОРЕЦА, където текстът е най-дребен';
    // Прозорецът ПОКРИВА шапката — лост зад воала е лост, който го няма.
    await natisniVGrupata(p, '[data-istoriya]');
    await p.waitForSelector('.istoriya-karta');
    proveri('лостът е и в прозореца',
      await p.$$eval('.istoriya-karta .goleminata button', (b) => b.length), 3);
    proveri('и показва СЪЩОТО стъпало като шапката',
      await p.$eval('.istoriya-karta .goleminata button[aria-pressed="true"]',
        (e) => (e as HTMLElement).dataset['golemina']), 'edro');
    await p.keyboard.press('Escape');

    razdel = '76 · Размерът · изборът преживява смяна на екран';
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('лостът го има и на втория екран',
      await p.$$eval('.shapka .goleminata button', (b) => b.length), 3);
    proveri('и текстът е още едър',
      await p.$eval('body', (e) =>
        Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100), tekstEdro);
    await naEkran(p, 'imoti', '#forma-imot');
    await p.click('.shapka .goleminata [data-golemina="normalno"]');
    await p.waitForTimeout(150);
    proveri('и се връща на нормалното',
      await p.$eval('body', (e) =>
        Math.round(parseFloat(getComputedStyle(e).fontSize) * 100) / 100), tekstPredi);

    razdel = '75 · Височината на реда · ЕДНА за цялата таблица';
    // Негово: „Когато местиш една височина на един ред ЗАЕДНО МЕСТИШ НА ВСИЧКИ
    // РЕДОВЕ височината, ЗА КОЛОНИТЕ НЕ ВАЖИ." Двете половини се мерят поотделно.
    const koloniPredi = await p.$eval('.glava.imot', (e) =>
      getComputedStyle(e).gridTemplateColumns);
    const visochiniPredi = await p.$$eval('.red.imot', (r) =>
      r.map((x) => Math.round(x.getBoundingClientRect().height)));
    proveri('таблицата има повече от един ред, за да има какво да се мери',
      visochiniPredi.length > 1, true);

    // ТРИТЕ ГЪСТОТИ · лостът стои в главата на секцията, до стрелките.
    proveri('лостът за височина е в главата на секцията',
      await p.$$eval('[data-sektsiya="imoti-spisak"] .gastotata button', (b) => b.length), 3);
    await p.click('[data-sektsiya="imoti-spisak"] .gastotata button[data-gastota="shiroko"]');
    await p.waitForTimeout(150);
    const shiroki = await p.$$eval('.red.imot', (r) =>
      r.map((x) => Math.round(x.getBoundingClientRect().height)));
    console.log(`\n  ВИСОЧИНА НА РЕД: сбито/средно/широко → ${visochiniPredi[0]} → ${shiroki[0]}px\n`);
    proveri('широкото вдига реда', shiroki[0]! > visochiniPredi[0]!, true);
    // ВСИЧКИ, не един — това е сърцевината на неговото изречение.
    proveri('и вдига ВСИЧКИ редове, не един', new Set(shiroki).size, 1);
    proveri('отбелязана е точно ЕДНА гъстота',
      await p.$$eval('[data-sektsiya="imoti-spisak"] .gastotata button[aria-pressed="true"]',
        (b) => b.length), 1);

    // ЗА КОЛОНИТЕ НЕ ВАЖИ · неговата втора половина, премерена
    proveri('колоните НЕ се менят от височината на реда',
      await p.$eval('.glava.imot', (e) => getComputedStyle(e).gridTemplateColumns), koloniPredi);

    razdel = '75 · Височината · изборът преживява смяна на екран';
    await naEkran(p, 'pari', '#forma-nachisli');
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('широкото си стои след два екрана',
      await p.$eval('.red.imot', (e) => Math.round(e.getBoundingClientRect().height)), shiroki[0]);
    await p.click('[data-sektsiya="imoti-spisak"] .gastotata button[data-gastota="sredno"]');
    await p.waitForTimeout(150);
    proveri('и се връща на средното',
      await p.$eval('.red.imot', (e) => Math.round(e.getBoundingClientRect().height)),
      visochiniPredi[0]);

    razdel = '75 · Зебрата · ивицата се сменя при СМЯНА НА ГРУПАТА';
    // Негово: „сиво и бяло с добър контраст за окото и СЕ РЕДУВАТ КОГАТО СЕ
    // СМЕНЯТ задачи от, в моя случай, Имот."
    //
    // КОНТРАСТЪТ СЕ МЕРИ В БРАУЗЪРА, не се преписва от CSS: правилото може да
    // е вярно и пак да не стига до реда (`[hidden]` вече ни го показа два
    // пъти — ADR-057). Затова числата се смятат от НАРИСУВАНИТЕ цветове.
    const kontrast = await p.evaluate(() => {
      const svetlina = (tsvyat: string): number => {
        const [r, g, b] = tsvyat.match(/\d+/g)!.slice(0, 3).map((n) => Number(n) / 255);
        const p2 = (x: number): number => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
        return 0.2126 * p2(r!) + 0.7152 * p2(g!) + 0.0722 * p2(b!);
      };
      const k = (a: string, b: string): number => {
        const [x, y] = [svetlina(a), svetlina(b)];
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const st = getComputedStyle(document.documentElement);
      const zebra = st.getPropertyValue('--zebra').trim();
      const kam = (c: string): string => {
        const d = document.createElement('div');
        d.style.color = c;
        document.body.append(d);
        const v = getComputedStyle(d).color;
        d.remove();
        return v;
      };
      return {
        zebraKamByalo: Math.round(k(kam(zebra), 'rgb(255,255,255)') * 1000) / 1000,
        mastiloVarhuZebra: Math.round(k(kam(st.getPropertyValue('--mastilo2').trim()), kam(zebra)) * 100) / 100,
        zhaltoVarhuByalo:
          Math.round(k(kam(st.getPropertyValue('--srok-zhalto-tekst').trim()), 'rgb(255,255,255)') * 100) / 100,
      };
    });
    console.log(
      `\n  КОНТРАСТ: зебра↔бяло ${kontrast.zebraKamByalo} · мастило2 върху зебра ` +
        `${kontrast.mastiloVarhuZebra} (праг 4,5) · жълт текст ${kontrast.zhaltoVarhuByalo} (праг 4,5)\n`,
    );
    proveri('ивицата се вижда · зебрата не е бяло', kontrast.zebraKamByalo > 1.08, true);
    proveri('текстът върху ивицата минава AA', kontrast.mastiloVarhuZebra >= 4.5, true);
    // Жълтото като ТЕКСТ падаше на 2,58 — под AA и под 3:1. Лентата си остава
    // с неговия цвят; текстът получи свой, по-тъмен тон.
    proveri('жълтият ТЕКСТ на светофара минава AA', kontrast.zhaltoVarhuByalo >= 4.5, true);

    // ИВИЦАТА СЛЕДВА ГРУПАТА · в Управление редовете са групирани по Място.
    await naEkran(p, 'gant', '#d-forma-delo');
    const ivitsi = await p.$eval('.gant-imena', (t) => {
      const out: { grupa: string; zebra: boolean }[] = [];
      let grupa = '';
      for (const e of t.children) {
        if (e.classList.contains('gant-myasto')) { grupa = e.textContent!.trim(); continue; }
        if (!e.classList.contains('gant-delo')) continue;
        out.push({ grupa, zebra: e.classList.contains('zebra') });
      }
      return out;
    });
    // Вътре в едно Място ивицата е ЕДНА И СЪЩА — тъкмо разликата от `nth-child`.
    const poGrupi = new Map<string, Set<boolean>>();
    for (const r of ivitsi) {
      if (!poGrupi.has(r.grupa)) poGrupi.set(r.grupa, new Set());
      poGrupi.get(r.grupa)!.add(r.zebra);
    }
    proveri('вътре в едно Място ивицата НЕ се мени',
      [...poGrupi.values()].every((v) => v.size === 1), true);
    proveri('и има поне две Места, за да има какво да се редува',
      poGrupi.size >= 2, true);
    // Съседните места носят РАЗЛИЧНИ ивици.
    const redNaGrupite = [...new Set(ivitsi.map((r) => r.grupa))];
    proveri('съседните Места носят различни ивици',
      redNaGrupite.every((g, i) =>
        i === 0 || [...poGrupi.get(g)!][0] !== [...poGrupi.get(redNaGrupite[i - 1]!)!][0]), true);
    await naEkran(p, 'imoti', '#forma-imot');

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

    razdel = '80 · Тактът · ЕДИН речник с ШЕСТ стойности';
    // Негови думи, 27.08 (И104): „Нека са като НАП 5 вида… за деня е от 08:00
    // до 17:00… Искам в такта да има и такъв който сам да избереш. ДЕН с 8
    // часа. Месец с дните от календара за месеца. Тримесечие пак така. Година
    // с 12 месеца."
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('шест такта, не четири',
      await p.$$eval('[data-takt]', (e) => e.length), 6);
    proveri('и тримесечието вече го има на екрана',
      await p.$$eval('[data-takt="trimesechie"]', (e) => e.length), 1);

    const koloniteSa = async (): Promise<number> =>
      p.$$eval('.gant-glava-vreme span', (e) => e.length);

    await deystvieSPrerisuvane(p, () => p.click('[data-takt="den"]'));
    const kolonivDen = await koloniteSa();
    console.log(`\n  ТАКТЪТ „ДЕН": ${kolonivDen} колони · осем часа по шест дни\n`);
    proveri('денят е РАБОТЕН ДЕН · колоните са кратни на осем',
      kolonivDen % 8, 0);
    const glaviteNaDenya = await p.$$eval('.gant-glava-vreme span', (e) =>
      e.slice(0, 3).map((x) => x.textContent));
    proveri('първата колона на деня носи ДЕНЯ, не часа',
      /^[а-я]{2} \d+$/.test(glaviteNaDenya[0] ?? ''), true);
    proveri('а следващите носят ЧАС', glaviteNaDenya[1], '09');
    proveri('обедът НЕ се рисува · от 11 се минава на 13',
      (await p.$$eval('.gant-glava-vreme span', (e) => e.map((x) => x.textContent)))
        .includes('12'), false);
    // Цялото стои в описа · тясната глава реже, но нищо не се губи.
    proveri('описът носи часа И деня',
      await p.$eval('.gant-glava-vreme span:nth-child(2)',
        (e) => (e.getAttribute('title') ?? '').includes('09:00–10:00')), true);

    // ПАРИТЕ НЯМАТ ЧАС · сумата на деня стои ВЕДНЪЖ, разпъната над осемте.
    const sumiteNaDen = await p.$$eval('.gant-suma', (e) => e.length);
    proveri('сумата на деня е ЕДНА клетка, не осем',
      sumiteNaDen * 8, kolonivDen);
    proveri('и се разпъва над осемте си часа',
      await p.$eval('.gant-suma', (e) => (e as HTMLElement).dataset['obhvat']), '8');

    await deystvieSPrerisuvane(p, () => p.click('[data-takt="trimesechie"]'));
    proveri('тримесечието почва от ПЪРВИЯ ден на тримесечие',
      await p.$eval('.gant-glava-vreme span', (e) => {
        const d = e.getAttribute('data-den') ?? '';
        return `${d.slice(5, 7)}-${d.slice(8)}`;
      }).then((x) => ['01-01', '04-01', '07-01', '10-01'].includes(x)), true);

    razdel = '80 · Тактът · СВОЯТ период · „такъв който сам да избереш"';
    await deystvieSPrerisuvane(p, () => p.click('[data-takt="svoy"]'));
    proveri('появяват се двете дати', await p.$$eval('#svoy-ot, #svoy-do', (e) => e.length), 2);
    // Без период не се показва празен екран · пада на месец и го КАЗВА.
    proveri('без период се казва какво липсва',
      (await tekstNa(p, '[data-sektsiya="gant-izgled"] .dyalglava span')).includes('избери ОТ и ДО'),
      true);
    await deystvieSPrerisuvane(p, () => p.fill('#svoy-ot', '2026-08-01'));
    await deystvieSPrerisuvane(p, () => p.fill('#svoy-do', '2026-08-10'));
    proveri('своят период дава ТОЧНО толкова колони', await koloniteSa(), 10);
    proveri('и КАЗВА коя е колоната',
      (await tekstNa(p, '[data-sektsiya="gant-izgled"] .dyalglava span')).includes('колоната е ДЕН'),
      true);
    // Дълъг период · колоната става МЕСЕЦ, и това пак се казва.
    await deystvieSPrerisuvane(p, () => p.fill('#svoy-do', '2026-12-31'));
    proveri('дълъг период дава МЕСЕЧНИ колони', await koloniteSa(), 5);
    proveri('и това се КАЗВА, не се гадае',
      (await tekstNa(p, '[data-sektsiya="gant-izgled"] .dyalglava span')).includes('колоната е МЕСЕЦ'),
      true);
    // Тактът се връща на месец · състоянието не се разсипва под следващите.
    await deystvieSPrerisuvane(p, () => p.click('[data-takt="mesets"]'));
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '81 · Разбивката · „разбий по…" и сверката вход↔изход';
    // Негов въпрос, 27.08 (И102): „…разбивки по контрагенти от банковите
    // извлечения и да се покажат в таблицата СУМИРАНО ЗА ТАКТА на диаграмата…
    // и съответно извлеченията БАНКОВИТЕ ИЛИ КЕШОВИТЕ."
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('лостът „Разбий по" е на екрана', await p.$$eval('#f-razrez', (e) => e.length), 1);
    // ШЕСТ · и шестият („По категории") изпълнява условието на И107, вместо да
    // го заобикаля: категорията е СЪБИТИЕ в Журнала (резен 25 · ADR-085).
    proveri('и предлага ШЕСТ разреза · всеки от поле, което Журналът вече носи',
      await p.$$eval('#f-razrez option', (e) => e.length), 6);
    proveri('подразбраното е БЕЗ разбивка · един ред сборове',
      await p.$$eval('.gant-red.sumi', (e) => e.length), 1);

    /** Сборът на всички числа в редовете със сборове · в стотинки, от текста. */
    const sborNaEkrana = async (): Promise<number> =>
      p.$$eval('.gant-red.sumi .gant-suma', (kletki) =>
        kletki.reduce((s, k) => {
          const chisla = [...k.querySelectorAll('b, i')].map((x) =>
            Math.round(parseFloat((x.textContent ?? '0').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) * 100));
          return s + chisla.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        }, 0));

    const bezRazbivka = await sborNaEkrana();
    const sabitiyaPredi = await broySabitiya(p);

    await deystvieSPrerisuvane(p, () => p.selectOption('#f-razrez', 'kontragent'));
    const redoveKontragent = await p.$$eval('.gant-red.sumi', (e) => e.length);
    console.log(`\n  РАЗБИВКАТА: без разбивка 1 ред → по контрагент ${redoveKontragent} реда\n`);
    proveri('по контрагент дава ПОВЕЧЕ от един ред', redoveKontragent > 1, true);
    proveri('всеки ред носи ИМЕТО си вляво',
      await p.$eval('.gant-sbor', (e) => (e.textContent ?? '').trim().length > 0), true);
    // СВЕРКАТА ВХОД↔ИЗХОД (правило 7) · премерена на ЕКРАНА, не в паметта.
    proveri('и сборът на разрезите Е неразбитият сбор', await sborNaEkrana(), bezRazbivka);

    await deystvieSPrerisuvane(p, () => p.selectOption('#f-razrez', 'nachin'));
    proveri('банка или в брой · сборът пак се събира', await sborNaEkrana(), bezRazbivka);
    proveri('разрезите са толкова, колкото начина има движение',
      (await p.$$eval('.gant-red.sumi', (e) => e.length)) >= 1, true);

    razdel = '81 · Разбивката · парите В ПОЛЕТО на диаграмата';
    // Негов въпрос: „…а в самата диаграма да се РАЗПРЕДЕЛИ В ПОЛЕТО от нея и
    // пресято спрямо такта."
    const lentiVPoleto = await p.$$eval('.diagrama-parichna', (e) => e.length);
    const redoveNaSumite = await p.$$eval('.gant-red.sumi', (e) => e.length);
    console.log(`\n  ПАРИТЕ В ПОЛЕТО: ${lentiVPoleto} ленти в диаграмата\n`);
    proveri('диаграмата носи парична лента за всеки разрез с движение',
      lentiVPoleto > 0 && lentiVPoleto <= redoveNaSumite, true);
    proveri('всяка лента носи ИМЕТО на разреза си',
      await p.$eval('.diagrama-parichna .diagrama-ime',
        (e) => (e.textContent ?? '').trim().length > 0), true);
    proveri('приходът и разходът се различават по ПОСОКА, не само по цвят',
      await p.evaluate(() => {
        const g = document.querySelector('.diagrama-parichna');
        if (!g) return false;
        const nula = Number(g.querySelector('.diagrama-nula')?.getAttribute('y1') ?? 0);
        const gore = [...g.querySelectorAll('.diagrama-pari.prihod')];
        const dolu = [...g.querySelectorAll('.diagrama-pari.razhod')];
        const nad = gore.every((x) => Number(x.getAttribute('y')) <= nula + 0.01);
        const pod = dolu.every((x) => Number(x.getAttribute('y')) >= nula - 0.01);
        return (gore.length > 0 || dolu.length > 0) && nad && pod;
      }), true);
    // ЕДИН МАЩАБ · инак дребният контрагент изглежда като едрия.
    proveri('най-високото стълбче е ТОЧНО едно · мащабът е един за всички ленти',
      await p.evaluate(() => {
        const vsichki = [...document.querySelectorAll('.diagrama-pari')]
          .map((x) => Math.round(Number(x.getAttribute('height')) * 100) / 100);
        if (vsichki.length === 0) return false;
        const nay = Math.max(...vsichki);
        return vsichki.filter((h) => h === nay).length >= 1 && nay <= 10.01;
      }), true);

    razdel = '81 · Разбивката · „разбий по…" и сверката вход↔изход';
    // РАЗРЕЗЪТ Е ПОГЛЕД · нито едно събитие не влиза в Журнала (ADR-022).
    proveri('смяната на разреза НЕ пише в Журнала', await broySabitiya(p), sabitiyaPredi);
    // И преживява смяна на екран · инак изборът скача обратно при всяко влизане.
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('изборът преживява смяна на екран',
      await p.$eval('#f-razrez', (e) => (e as HTMLSelectElement).value), 'nachin');
    await deystvieSPrerisuvane(p, () => p.selectOption('#f-razrez', 'bez'));
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '82 · Служителите · задачата се праща и се ПРИЕМА в програмата';
    // Негови думи, 27.08 (И110): „Да има служители таб и там да се избират от
    // падащо меню и да се пращат задачите ЗА ПРИЕМАНЕ… но в листа на всеки
    // служител СИ СЕДИ." И от 08.08 (р57·[160]): „копче за всяко дело… РЪЧНО."
    await naEkran(p, 'sluzhiteli', '[data-sektsiya="sluzhiteli-horata"]');
    // КОГО ГЛЕДАМ е ЕДИН избор за целия екран — и листът, и правата четат него
    // (ADR-022). §20 остави избран Бамстера; тук се гледа СВОЯТ лист, значи
    // изборът се връща на себе си, точно както би направил човек.
    await deystvieSPrerisuvane(p, () => p.click('[data-chovek="vintexstroy@gmail.com"]'));
    proveri('единайсетият екран е на мястото си',
      await tekstNa(p, '[data-sektsiya="sluzhiteli-horata"] h2'), 'Хората в програмата');
    proveri('хората се изреждат',
      (await p.$$eval('[data-chovek]', (e) => e.length)) >= 1, true);
    proveri('и има падащо меню с тях',
      (await p.$$eval('#z-chovek option', (e) => e.length)) >= 1, true);
    proveri('и падащо меню с делата', (await p.$$eval('#z-delo option', (e) => e.length)) >= 1, true);

    // ИЗПРАЩАНЕТО · точно едно събитие, и то в Журнала.
    const azSam = await p.$eval('#z-chovek', (e) => (e as HTMLSelectElement).value);
    await sSabitie(p, () => p.click('#forma-zadacha button[type=submit]'));
    proveri('изпратената задача влиза в листа',
      (await p.$$eval('[data-zadacha]', (e) => e.length)) >= 1, true);
    proveri('и състоянието ѝ е „чака отговор"',
      (await tekstNa(p, '[data-zadacha]')).includes('чака отговор'), true);
    console.log(`\n  ЗАДАЧАТА: изпратена на ${azSam}\n`);

    // ПРИЕМАНЕТО · в ПРОГРАМАТА, не в Google. Влезлият е Стопанинът и задачата
    // е на него, значи бутоните са негови.
    proveri('на СВОЯ лист стоят бутоните за отговор',
      (await p.$$eval('[data-priemi]', (e) => e.length)) >= 1, true);
    // ДВАТА бутона са в ГРУПА действия (ADR-057): видим е един, другият е зад
    // стрелкичката. Проходът прави трите стъпки на човека, не заобикаля групата.
    await sSabitie(p, () => natisniVGrupata(p, '[data-priemi]'));
    proveri('приемането мени състоянието',
      (await tekstNa(p, '[data-zadacha]')).includes('приета'), true);
    proveri('и бутоните за отговор си отиват · веднъж отговорено е отговорено',
      await p.$$eval('[data-priemi]', (e) => e.length), 0);

    // ОТКАЗАНАТА СИ СЕДИ · негово. Праща се втора и се отказва.
    const zadachiPredi = await p.$$eval('[data-zadacha]', (e) => e.length);
    await sSabitie(p, () => p.click('#forma-zadacha button[type=submit]'));
    await sSabitie(p, () => natisniVGrupata(p, '[data-otkazhi]'));
    proveri('отказаната НЕ изчезва от листа',
      await p.$$eval('[data-zadacha]', (e) => e.length), zadachiPredi + 1);
    proveri('и носи причината си',
      (await p.$$eval('[data-zadacha]', (e) =>
        e.map((x) => x.textContent ?? '').join(' '))).includes('сгрешена сума'), true);

    razdel = '83 · Поканата в календара · ПО ИЗБОР, и границата се КАЗВА';
    // Негови думи, 27.08 (И110): „по имейл ПО ИЗБОР и задължително в програмата…
    // но на Стопанина му показва приел ли е на календара или не."
    proveri('отметката „и по имейл" е на екрана',
      await p.$$eval('#i-po-imeyl', (e) => e.length), 1);
    proveri('и НЕ е сложена предварително',
      await p.$eval('#i-po-imeyl', (e) => (e as HTMLInputElement).checked), false);
    // ГРАНИЦАТА СТОИ ПРЕД ОЧИТЕ, разгъната — не зад „подробности".
    const granitsata = await tekstNa(p, '#kakvo-napuska');
    proveri('казва се какво НАПУСКА устройството',
      granitsata.includes('името на делото'), true);
    proveri('и какво НЕ напуска · поименно',
      granitsata.includes('Мястото и Обектът') && granitsata.includes('наематели'), true);

    // БЕЗ ОТМЕТКА · НУЛА МРЕЖА. Брои се самата ЗАЯВКА, не намерението: обещание
    // „по избор", проверено по надписа на екрана, е обещание, проверено по себе си.
    let kamKalendara = 0;
    p.on('request', (z) => {
      if (z.url().includes('/calendar/v3/')) kamKalendara += 1;
    });
    await sSabitie(p, () => p.click('#forma-zadacha button[type=submit]'));
    proveri('изпращане БЕЗ отметка не пипа мрежата · нула заявки', kamKalendara, 0);

    // СЪГЛАСИЕТО СПИРА · отметка без прочетено не праща покана.
    const predPokanata = await broySabitiya(p);
    await p.check('#i-po-imeyl');
    await p.click('#forma-zadacha button[type=submit]');
    // ЧАКА СЕ САМИЯТ ТЕКСТ · отказът е синхронен (нула мрежа), но екранът се
    // прерисува и `waitForFunction` върху него хваща стар възел.
    await p.waitForSelector('#greshka-zadacha:not(:empty)');
    proveri('без прочетената граница поканата НЕ тръгва',
      (await tekstNa(p, '#greshka-zadacha')).includes('прочетох какво напуска'), true);
    proveri('и НИТО едно събитие не влиза', await broySabitiya(p), predPokanata);

    // С ДВЕТЕ ОТМЕТКИ · записът е ПЪРВИ, поканата ВТОРА, и поправката ги свързва.
    await p.check('#razbrah-kalendar');
    await sSabitiya(p, 2, () => p.click('#forma-zadacha button[type=submit]'));
    proveri('записът и поправката са ДВЕ събития, не едно',
      (await broySabitiya(p)) - predPokanata, 2);
    proveri('и задачата вече носи белега на поканата',
      (await p.$$eval('[data-kalendar]', (e) => e.length)) >= 1, true);
    proveri('и СЕГА мрежата е пипната · точно веднъж', kamKalendara, 1);

    // ОТГОВОРЪТ НА GOOGLE стои ОТДЕЛНО от нашия · пита се, не се записва.
    const predPitaneto = await broySabitiya(p);
    await p.click('#pitay-kalendara');
    await p.waitForFunction(() =>
      [...document.querySelectorAll('[data-kalendar]')].some((e) =>
        (e.textContent ?? '').includes('ПРИЕЛ')));
    proveri('календарът казва своя отговор',
      (await p.$$eval('[data-kalendar]', (e) => e.map((x) => x.textContent ?? '').join(' ')))
        .includes('ПРИЕЛ е поканата'), true);
    proveri('и питането НЕ пише в Журнала · фактът е на Google, не наш',
      await broySabitiya(p), predPitaneto);

    razdel = '82 · Служителите · копчето на всяко дело';
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('всяко дело носи копче за пращане',
      (await p.$$eval('[data-prati]', (e) => e.length)) >= 1, true);
    // Копчето минава през СЪЩАТА врата · пунктът в лентата, не втора форма.
    await deystvieSPrerisuvane(p, () => p.click('[data-prati]'));
    await p.waitForSelector('[data-sektsiya="sluzhiteli-prashtane"]');
    proveri('копчето води до Служители с ИЗБРАНОТО дело',
      await p.$eval('#z-delo', (e) => (e as HTMLSelectElement).value !== ''), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 88 · ХЕДЪРИТЕ ПО ТАБОВЕТЕ · трите обхвата на едно действие (И103) ══
    //
    // Негови думи, 27.08: „от там се дават и хедърите на всички таблици с имена
    // и подредени КАКТО СА ПО ТАБОВЕТЕ В МЕНЮТО и ОТДЕЛЕНИ ПРИ СКРОЛ… можеш по
    // ЦЯЛО МЕНЮ или по отделна ТАБЛИЦА и КОЛОНА от хедъра да дадеш достъп."
    razdel = '88 · хедърите по табовете · трите обхвата';
    await naEkran(p, 'sluzhiteli', '[data-sektsiya="pravata"]');

    // ВГРАДЕНИТЕ ТАБЛИЦИ СА ВЪТРЕ · дотук матрицата знаеше само вносните хедъри.
    // СЕДЕМ от резен 18б насам: Продажби влезе със своите петнайсет колони.
    proveri('вградените таблици влизат в матрицата',
      (await p.$$eval('[data-hedar-red]', (e) =>
        e.map((x) => x.getAttribute('data-hedar-red') ?? ''))).filter((k) => k.startsWith('vgraden:')).length, 7);
    proveri('и вносният хедър стои до тях',
      (await p.$$('[data-hedar-red="Банка ОББ"]')).length, 1);

    // ГРУПИТЕ СА ПО ТАБОВЕ и редът им е РЕДЪТ НА ЛЕНТАТА, не азбучен.
    const grupi = await p.$$eval('[data-grupa-hedari]', (e) =>
      e.map((x) => x.getAttribute('data-grupa-hedari') ?? ''));
    proveri('хедърите са ГРУПИРАНИ по табове', grupi.length >= 3, true);
    const vLentata = await p.$$eval('.nav > [data-ekran]', (e) =>
      e.map((x) => x.getAttribute('data-ekran') ?? ''));
    // САМО ОНЕЗИ, КОИТО ГИ ИМА В ЛЕНТАТА · находка на резен 18в.
    //
    // Дотук се сравняваха ВСИЧКИ групи, а онези без пункт в лентата дават −1.
    // Минус едно се сортира ПРЕДИ нулата, значи проверката настояваше групите
    // БЕЗ пункт да стоят най-отпред — нещо, което никой не е решавал. Новият
    // екран Продажби го изкара наяве: „-1,-1,-1,0,-1" срещу „-1,-1,-1,-1,0".
    //
    // Инвариантът е за ПОДРЕДБАТА на онези, които лентата познава.
    const vRedaNaLentata = grupi
      .filter((g) => g !== '')
      .map((g) => vLentata.indexOf(g))
      .filter((i) => i >= 0);
    proveri('и редът на групите е редът на ЛЕНТАТА',
      vRedaNaLentata,
      [...vRedaNaLentata].sort((a, b) => a - b));

    // ГРУПАТА „ОЩЕ НЕ Е СЛОЖЕН НА ТАБ" се БРОИ · вносният още няма таб.
    proveri('нямащите таб се БРОЯТ и се казват',
      Number(await tekstNa(p, '[data-bez-tab]')) >= 1, true);
    proveri('и стоят в ПОСЛЕДНАТА група', grupi.at(-1), '');

    // ЗАЛЕПВАНЕТО ПРИ СКРОЛ · „отделени при скрол" е негова дума.
    proveri('заглавието на групата е ЗАЛЕПЕНО, не тече с текста',
      await p.$eval('.hedari-zaglavie', (e) => getComputedStyle(e).position), 'sticky');
    proveri('и е НАДПИС, не бутон · клавиатурата не спира на него',
      await p.$eval('.hedari-zaglavie', (e) => e.getAttribute('role')), 'presentation');

    // ══ ЦЯЛАТА ТАБЛИЦА С ЕДНА ДУМА · вторият обхват ═══════════════════════
    const IMOTI_RED = '[data-hedar-red="vgraden:imoti"]';
    const koloniNaImoti = await p.$$eval(`${IMOTI_RED} .pravo`, (e) => e.length);
    proveri('вградената таблица показва колоните си', koloniNaImoti > 1, true);
    const skritiPredi = await p.$$eval('.pravo.pravo-skrito', (e) => e.length);
    await deystvieSPrerisuvane(p, () =>
      p.selectOption(`${IMOTI_RED} select[data-obhvat=tablitsa]`, 'skrito'));
    proveri('„цялата таблица" скрива ВСИЧКИТЕ ѝ колони с ЕДНО действие',
      (await p.$$eval('.pravo.pravo-skrito', (e) => e.length)) - skritiPredi, koloniNaImoti);
    proveri('и казва колко записа е направила',
      (await tekstNa(p, '.vest')).includes('1 таблица'), true);

    // ══ ЦЯЛО МЕНЮ · третият обхват · N таблици, N записа ══════════════════
    // Табът „Имоти" носи ДВЕ вградени таблици — Имоти и Наеми. Едно действие,
    // два записа, защото правото е на двойката (служител, хедър).
    const tablitsiVImoti = await p.$$eval('[data-grupa-hedari=imoti] [data-hedar-red]', (e) => e.length);
    proveri('табът „Имоти" носи повече от една таблица', tablitsiVImoti >= 2, true);
    const kolonivImoti = await p.$$eval('[data-grupa-hedari=imoti] .pravo', (e) => e.length);
    // ЧАКА СЕ ЕКРАНЪТ, не броят събития. `sSabitiya(N)` би паднало с TIMEOUT —
    // изход, който казва „нещо не стана", вместо „чакани 8 скрити, видени 5".
    // Диагноза с число е по-евтина от диагноза с таймаут: счупих обхвата
    // нарочно да пипа само първата таблица и точно това ме научи.
    await deystvieSPrerisuvane(p, () =>
      p.selectOption('[data-grupa-hedari=imoti] select[data-obhvat=menyu]', 'skrito'));
    proveri('„цяло меню" скрива всички колони на ВСИЧКИТЕ му таблици',
      await p.$$eval('[data-grupa-hedari=imoti] .pravo.pravo-skrito', (e) => e.length), kolonivImoti);
    proveri('и записите са по ЕДИН на таблица · право на таб няма',
      (await tekstNa(p, '.vest')).includes(`${tablitsiVImoti} таблици`), true);

    // ВРЪЩАНЕТО · „редактира" изпразва стеснението, не го пълни.
    await deystvieSPrerisuvane(p, () =>
      p.selectOption('[data-grupa-hedari=imoti] select[data-obhvat=menyu]', 'redaktira'));
    proveri('и се връща наведнъж · записват се само отклоненията',
      await p.$$eval('[data-grupa-hedari=imoti] .pravo.pravo-skrito', (e) => e.length), 0);

    // ЗАТВОРЕНАТА КОЛОНА НА ВГРАДЕНАТА · сметка не се редактира от никого.
    proveri('и вградената има затворени колони, и се казва защо',
      (await p.$$eval(`${IMOTI_RED} .pravo [data-ne-deystva]`, (e) =>
        e.map((x) => x.textContent ?? '').join(' '))).includes('СМЕТКА'), true);

    // ГРАНИЦАТА · Управление още не влиза, и това се КАЗВА, не се премълчава.
    proveri('границата стои с думи на екрана',
      (await tekstNa(p, '[data-granitsa-upravlenie]')).includes('Управление'), true);

    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 115 · ПАПКАТА НА ОБЕКТА (резен 37 · ADR-097) ═════════════════════
    //
    // „Различни за различни обекти, но те са гоогле драйва и има достъп от
    // имейлите които влизат в програмата." *(р57·[110])*
    await naEkran(p, 'imoti', '#forma-imot');

    razdel = '115 · Папката · без нея обектът работи';
    proveri('всеки ред казва има ли папка',
      await p.$$eval('.red.imot [data-papka]', (e) => e.length),
      await p.$$eval('.red.imot', (e) => e.length));
    proveri('и всички са БЕЗ папка засега',
      await p.$$eval('.red.imot [data-papka][data-ima=da]', (e) => e.length), 0);
    proveri('броят се КАЗВА, вместо да се мълчи',
      await p.$eval('[data-papki-broy]', (e) => (e as any).dataset.papkiBroy), '0');
    proveri('и екранът казва, че достъпът е при ДОСТАВЧИКА',
      (await tekstNa(p, '[data-papki-broy]')).includes('решава доставчикът'), true);

    razdel = '115 · Папката · лошият адрес не стига до Журнала';
    const prediLoshiya = await broySabitiya(p);
    await p.fill('#imot-adres', 'Витоша');
    await p.fill('#imot-edinitsa', 'МАГ. № 1');
    await p.fill('#imot-papka', 'javascript:alert(1)');
    // ОТКАЗЪТ НЕ ПРЕРИСУВА · той пише в полето за грешка и оставя формата, за
    // да не изгуби човекът написаното. Чака се самата ДУМА, не прерисуване.
    await p.click('#forma-imot button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-imot')?.textContent ?? '').length > 0);
    proveri('отказът се КАЗВА с думи',
      (await tekstNa(p, '#greshka-imot')).includes('не се приема'), true);
    proveri('и НИЩО не влиза в Журнала', await broySabitiya(p), prediLoshiya);

    razdel = '115 · Папката · записва се и се вижда като ЛИНК';
    await p.fill('#imot-papka', ADRES_NA_PAPKA);
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('новият обект носи папка',
      await p.$$eval('.red.imot [data-papka][data-ima=da]', (e) => e.length), 1);
    proveri('и тя е ЛИНК, който се отваря в нов таб',
      await p.$eval('.red.imot [data-ima=da] a', (e) => (e as any).target), '_blank');
    proveri('броят се вдигна', await p.$eval('[data-papki-broy]',
      (e) => (e as any).dataset.papkiBroy), '1');
    proveri('сверката раздяля всички обекти на две кофи',
      (await tekstNa(p, '[data-papki-sverka]')).replace(/\s+/g, ' ').includes('разлика 0'), true);

    razdel = '115 · Папката · ПОПРАВКА без нея не я трие';
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '.red.imot:has-text("Витоша") [data-popravi-imot]'));
    proveri('формата се напълни с линка', await p.inputValue('#imot-papka'), ADRES_NA_PAPKA);
    await p.fill('#imot-ploshtad', '48,00');
    await p.fill('#imot-prichina', 'измерена площ');
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('папката ОСТАВА след поправка на площта',
      await p.$$eval('.red.imot [data-papka][data-ima=da]', (e) => e.length), 1);

    razdel = '115 · Папката · „различни за различни обекти" се БРОИ';
    await p.fill('#imot-adres', 'Витоша');
    await p.fill('#imot-edinitsa', 'МАГ. № 2');
    await p.fill('#imot-papka', ADRES_NA_PAPKA);
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('еднаквата папка НЕ се отказва · тя не е грешка',
      await p.$$eval('.red.imot [data-papka][data-ima=da]', (e) => e.length), 2);
    proveri('но се БРОИ и се КАЗВА',
      await p.$eval('[data-povtoreni-papki]', (e) => (e as any).dataset.povtoreniPapki), '1');
    proveri('с обяснение защо е находка, а не отказ',
      (await tekstNa(p, '[data-papki-broy]')).includes('копирано поле'), true);


    // ══ 116 · КОНТАКТИ И ПРЕПИСКИ · един таб, две секции (резен 38 · ADR-098) ══
    //
    // „Един таб, две секции" *(р57·[30])* · „Има още събери Преписки и контакти…
    // кога са за взимане кто опция и дата" *(р57·[28])* · „КОгато се вкарва
    // човек става от Преписки и контакти" *(р65·[46])*.
    await naEkran(p, 'kontakti', '#forma-kontakt');

    razdel = '116 · Контакти · ЕДИН таб, ДВЕ секции';
    proveri('петнайсетият екран носи неговото име',
      await p.$eval('.shapka h1', (e) => (e as any).textContent.trim()), 'Контакти');
    proveri('и двете секции са НА ЕДИН екран',
      await p.$$eval('[data-sektsiya=prepiski], [data-sektsiya=kontakti]', (e) => e.length), 2);
    proveri('преписките са ПЪРВИ · работата се гледа всеки ден',
      await p.$eval('.telo [data-sektsiya]', (e) => (e as any).dataset.sektsiya), 'prepiski');

    razdel = '116 · Контактът · иска САМО име';
    const prediKontakt = await broySabitiya(p);
    await p.fill('#knt-ime', 'Мария Илиева');
    await sSabitie(p, () => p.click('#forma-kontakt button[type=submit]'));
    proveri('едно събитие, не две', await broySabitiya(p), prediKontakt + 1);
    proveri('контактът стои в списъка',
      await p.$$eval('[data-tablitsa=kontakti] [data-kontakt]', (e) => e.length), 1);
    proveri('и е ЗАПИСАН, не само срещан',
      await p.$eval('[data-kontakt] ', (e) => (e as any).dataset.zapisan), 'da');
    proveri('телефонът и имейлът стоят празни · те са по избор',
      (await p.$eval('[data-kontakt]', (e) => (e as any).innerText)).includes('—'), true);

    razdel = '116 · Контактът · БЕЗ име се отказва с думи';
    const prediOtkaza = await broySabitiya(p);
    await p.fill('#knt-ime', '   ');
    await p.click('#forma-kontakt button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-kontakt')?.textContent ?? '').length > 0);
    proveri('казва ЗАЩО · името е и адресът му',
      (await tekstNa(p, '#greshka-kontakt')).includes('Отговорник'), true);
    proveri('и НИЩО не влиза в Журнала', await broySabitiya(p), prediOtkaza);

    razdel = '116 · Преписката · с кого · за какво · кога';
    await p.fill('#prep-kontakt', 'Мария Илиева');
    await p.fill('#prep-kakvo', 'нотариален акт');
    await p.fill('#prep-data', denOtDnes(3));
    await sSabitie(p, () => p.click('#forma-prepiska button[type=submit]'));
    proveri('преписката стои в своята таблица',
      await p.$$eval('[data-tablitsa=prepiski] [data-prepiska]', (e) => e.length), 1);
    proveri('и брои се при контакта си',
      (await p.$eval('[data-kontakt]', (e) => (e as any).innerText)).includes('1'), true);
    // ТРИ ДНИ ДО СРОКА · неговите прагове са 7 и 2, значи това е ЖЪЛТО.
    proveri('светофарът е НЕГОВИЯТ · седем дни жълто, два червено',
      await p.$eval('[data-prepiska]', (e) => (e as any).dataset.svetofar), 'zhalto');

    razdel = '116 · Преписката · СРЕЩАНИЯТ, но незаписан контакт СТОИ';
    await p.fill('#prep-kontakt', 'Николай Непознат');
    await p.fill('#prep-kakvo', 'скица');
    await sSabitie(p, () => p.click('#forma-prepiska button[type=submit]'));
    proveri('списъкът с контакти порасна',
      await p.$$eval('[data-tablitsa=kontakti] [data-kontakt]', (e) => e.length), 2);
    proveri('и новият е обявен като САМО СРЕЩАН',
      await p.$$eval('[data-kontakt][data-zapisan=ne]', (e) => e.length), 1);
    proveri('с думи на самия ред, не с легенда',
      (await p.$eval('[data-kontakt][data-zapisan=ne]', (e) => (e as any).innerText))
        .includes('само срещан'), true);

    razdel = '116 · Преписката · без дата НЕ свети';
    await p.fill('#prep-kontakt', 'Мария Илиева');
    await p.fill('#prep-kakvo', 'без срок');
    await sSabitie(p, () => p.click('#forma-prepiska button[type=submit]'));
    proveri('всички без дата са „нормално"',
      await p.$$eval('[data-prepiska][data-svetofar=normalno]', (e) => e.length), 2);
    proveri('и екранът КАЗВА защо',
      (await tekstNa(p, '[data-sektsiya=prepiski]')).includes('никой не е бързал'), true);

    razdel = '116 · Преписката · БЕЗ контакт се отказва';
    const prediPrazna = await broySabitiya(p);
    await p.fill('#prep-kontakt', '  ');
    await p.fill('#prep-kakvo', 'нещо');
    await p.click('#forma-prepiska button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-prepiska')?.textContent ?? '').length > 0);
    proveri('и го казва с думи', (await tekstNa(p, '#greshka-prepiska')).includes('С кого'), true);
    proveri('нула нови събития', await broySabitiya(p), prediPrazna);

    razdel = '116 · Контактите · сверката брои преписките по хора';
    proveri('сверката стои на екрана и е нула',
      (await tekstNa(p, '[data-kontakti-sverka]')).replace(/\s+/g, ' ').includes('разлика 0'), true);

    // ═══ 117 · АВТО-ДЕЛАТА · вноска/преписка/среща → дело, червен списък ═══
    //
    // „Да — върни авто-делата (вноска/преписка/среща → дело, червен списък)"
    // *(р65·[68])* · „за контактите среща добавяш" · „Става дело автоматично"
    // *(р57·[30])* · „Не, само дата" · „Адрес на срещата" *(р57·[34])*.
    //
    // Разделът стои НАКРАЯ, защото пише събития: сложен по-нагоре, той щеше да
    // размести абсолютните броячи на всеки следващ раздел (урок от §115).

    razdel = '117 · Срещата · с кого · адрес · само дата';
    const prediSreshta = await broySabitiya(p);
    await p.fill('#sr-kontakt', 'Мария Илиева');
    await p.fill('#sr-adres', 'кантора на нотариуса');
    await p.fill('#sr-data', denOtDnes(1));
    await sSabitie(p, () => p.click('#forma-sreshta button[type=submit]'));
    proveri('едно събитие, не две', await broySabitiya(p), prediSreshta + 1);
    proveri('срещата стои в СВОЯТА таблица',
      await p.$$eval('[data-tablitsa=sreshti] [data-sreshta]', (e) => e.length), 1);
    proveri('и полето за час го НЯМА · „Не, само дата"',
      await p.$$eval('#forma-sreshta input[type=time]', (e) => e.length), 0);
    proveri('адресът е СВОЙ на срещата, не преписан от контакта',
      (await p.$eval('[data-sreshta]', (e) => (e as any).innerText)).includes('кантора'), true);

    razdel = '117 · Срещата · вътре във ВТОРАТА секция, не трета';
    proveri('секциите остават ДВЕ · „Един таб, две секции"',
      await p.$$eval('[data-sektsiya=prepiski], [data-sektsiya=kontakti]', (e) => e.length), 2);
    proveri('а срещите живеят ВЪТРЕ в контактите',
      await p.$$eval('[data-sektsiya=kontakti] [data-blok=sreshti]', (e) => e.length), 1);

    razdel = '117 · Срещата · БЕЗ дата се отказва с думи';
    const prediBezData = await broySabitiya(p);
    await p.fill('#sr-kontakt', 'Мария Илиева');
    await p.$eval('#sr-data', (e) => { (e as HTMLInputElement).removeAttribute('required'); });
    await p.fill('#sr-data', '');
    await p.click('#forma-sreshta button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-sreshta')?.textContent ?? '').length > 0);
    proveri('казва ЗАЩО · без нея не става дело',
      (await tekstNa(p, '#greshka-sreshta')).includes('червения списък'), true);
    proveri('и НИЩО не влиза в Журнала', await broySabitiya(p), prediBezData);

    razdel = '117 · Червеният списък · трите извора на ЕДНО място';
    await naEkran(p, 'gant', '[data-tablitsa=avtodela]');
    const izvori = await p.$$eval('[data-avtodelo]', (e) =>
      [...new Set(e.map((x) => (x as any).dataset.izvor))]);
    // И ТРИТЕ · вноската идва от кредита, вписан по-рано в прохода; преписката
    // и срещата — от Контактите. Това е целият смисъл на резена: един списък.
    proveri('и трите извора стоят в него',
      JSON.stringify([...izvori].sort()), JSON.stringify(['вноска', 'преписка', 'среща']));
    proveri('подредени по СРОК, не по извор', await p.$eval(
      '[data-tablitsa=avtodela] tbody tr', (e) => (e as any).dataset.izvor), 'среща');

    razdel = '117 · Червеният списък · светофарът е НЕГОВИЯТ';
    // Срещата е за УТРЕ (1 ден) → червено; преписката за след 3 дни → жълто.
    proveri('срещата за утре ГОРИ',
      await p.$eval('[data-izvor=среща]', (e) => (e as any).dataset.svetofar), 'cherveno');
    proveri('а преписката за след три дни е жълта',
      await p.$eval('[data-izvor=преписка]', (e) => (e as any).dataset.svetofar), 'zhalto');
    proveri('и червените се БРОЯТ, не се твърдят',
      await p.$eval('[data-avtodela-broy]', (e) => (e as any).dataset.avtodelaBroy), '1');

    razdel = '117 · Червеният списък · СМЯТА се, не се записва';
    const prediPrerisuvane = await broySabitiya(p);
    await p.reload();
    await p.waitForSelector('[data-tablitsa=avtodela]');
    proveri('второто рисуване не ражда нито едно събитие',
      await broySabitiya(p), prediPrerisuvane);
    proveri('и екранът КАЗВА, че редовете се смятат',
      (await tekstNa(p, '[data-sektsiya=avtodela]')).includes('затваря се ИЗВОРЪТ'), true);
    proveri('сверката стои и е нула',
      (await tekstNa(p, '[data-avtodela-sverka]')).replace(/\s+/g, ' ').includes('разлика 0'), true);

    razdel = '117 · Авто-делото си отива, щом изворът се затвори';
    const prediZatvaryane = await p.$$eval('[data-avtodelo]', (e) => e.length);
    await naEkran(p, 'kontakti', '#forma-sreshta');
    // ЗАТВАРЯ СЕ ОТ САМИЯ РЕД, не с нова форма: втори запис през формата би
    // родил ВТОРА среща, а не би затворил първата.
    const prediSmyana = await broySabitiya(p);
    await sSabitie(p, () => p.selectOption('[data-tablitsa=sreshti] select[data-smeni]', 'проведена'));
    proveri('смяната е ЕДНО ново събитие, не презапис',
      await broySabitiya(p), prediSmyana + 1);
    proveri('и срещата остава ЕДНА · същият `id`',
      await p.$$eval('[data-tablitsa=sreshti] [data-sreshta]', (e) => e.length), 1);
    await naEkran(p, 'gant', '[data-tablitsa=avtodela]');
    proveri('проведената среща пада от списъка',
      await p.$$eval('[data-avtodelo]', (e) => e.length), prediZatvaryane - 1);
    proveri('и то БЕЗ сторно · затворен е изворът, не делото',
      await p.$$eval('[data-izvor=среща]', (e) => e.length), 0);

    // ═══ 118 · КАЛЕНДАРЪТ · цифрите в полето на деня (И90 · резен 40) ═══
    //
    // „Както и всички приходи и разходи са с цифри в полето на календара."
    // *(И90 · 23.08)*
    //
    // Разделът СЛЕД §117 по същата причина: той чете екрана Сметки, чиито
    // числа зависят от всичко, писано дотук.

    razdel = '118 · Календарът · седем колони, понеделник пръв';
    await naEkran(p, 'smetki', '[data-sektsiya=smetki-kalendar]');
    proveri('главата носи СЕДЕМ дни',
      await p.$$eval('.kalendar-glava span', (e) => e.length), 7);
    proveri('и първият е ПОНЕДЕЛНИК · българската норма',
      await p.$eval('.kalendar-glava span', (e) => e.textContent.trim()), 'пн');
    const sedmitsi = await p.$$eval('.kalendar-sedmitsa', (e) =>
      e.map((x) => x.children.length));
    proveri('всяка седмица е СЕДЕМ клетки, винаги',
      JSON.stringify([...new Set(sedmitsi)]), JSON.stringify([7]));

    razdel = '118 · Календарът · чуждият ден стои, но е ПРАЗЕН';
    const chuzhdi = await p.$$eval('.kalendar-den[data-chuzhd]', (e) => e.length);
    proveri('мрежата е правоъгълна · има чужди дни',
      chuzhdi > 0, true);
    proveri('и НИТО ЕДИН от тях не носи числа',
      await p.$$eval('.kalendar-den[data-chuzhd] .kalendar-pari', (e) => e.length), 0);
    proveri('екранът КАЗВА защо стоят',
      (await tekstNa(p, '[data-sektsiya=smetki-kalendar]')).includes('държат\n      решетката права')
        || (await tekstNa(p, '[data-sektsiya=smetki-kalendar]')).includes('решетката права'), true);

    razdel = '118 · Календарът · цифрите СТОЯТ в полето на деня';
    const sPari = await p.$$eval('.kalendar-den.s-pari', (e) => e.length);
    proveri('поне един ден носи движение', sPari > 0, true);
    proveri('и броят е СМЕТНАТ, не преписан',
      await p.$eval('[data-kalendar]', (e) => Number((e as any).dataset.dniSPari)), sPari);
    proveri('всяко поле с пари носи ДВЕТЕ числа, не едно',
      await p.$$eval('.kalendar-den.s-pari .kalendar-pari b', (e) => e.length), sPari);
    proveri('и разходът стои до прихода',
      await p.$$eval('.kalendar-den.s-pari .kalendar-pari i', (e) => e.length), sPari);

    razdel = '118 · Календарът · сборът и сверката';
    proveri('месецът има свой сбор',
      (await tekstNa(p, '.kalendar-sbor')).includes('Месецът'), true);
    proveri('сверката стои и е нула',
      (await tekstNa(p, '[data-kalendar-sverka]')).replace(/\s+/g, ' ').includes('разлика 0,00'), true);
    proveri('и екранът казва, че двете числа НЕ се сливат',
      (await tekstNa(p, '[data-sektsiya=smetki-kalendar]')).includes('не е празен ден'), true);

    razdel = '118 · Календарът · слуша СЪЩИЯ месец като Сметки';
    const predi118 = await p.$eval('[data-kalendar]', (e) => (e as any).dataset.kalendar);
    await deystvieSPrerisuvane(p, async () => {
      await napishiVPoleto(p, '#smetki-period', '2026-07');
      await p.click('#forma-period button[type=submit]');
    });
    proveri('смяната на периода мести и календара',
      await p.$eval('[data-kalendar]', (e) => (e as any).dataset.kalendar), '2026-07');
    proveri('и това НЕ е същият месец', predi118 === '2026-07', false);
    proveri('нула събития · изгледът се смята, не се записва',
      await broySabitiya(p), await broySabitiya(p));
}
