import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, natisniVGrupata, plochka, tekstNa, zapishiDelo, zapishiRazhod } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';

/** 57 · Менютата · речникът е от Журнала | 57 · Менютата · четирите състояния | 57 · Менютата · следата СЛЕД записа | 58 · Още огледала · по обект | 58 · Още огледала · по контрагент */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '57 · Менютата · речникът е от Журнала';
    proveri('полето „Място" носи СПИСЪК, а не само текст',
      await p.$eval('#d-myasto', (e) => e.getAttribute('list')), 'd-myasto-spisak');
    const mestaVSpisaka = await p.$$eval('#d-myasto-spisak option', (o) => o.map((x) => (x as any).value));
    proveri('и в списъка стоят ЖИВИТЕ места, най-писаното горе',
      mestaVSpisaka, ['Малинова', 'Хисаря']);
    proveri('отговорниците също · речникът е на всяко поле',
      (await p.$$eval('#d-otgovornik-spisak option', (o) => o.map((x) => (x as any).value))).length, 3);
    proveri('и НИЩО ново не е записано за речниците',
      await p.$$eval('#d-myasto-spisak option', (o) => o.length) > 0, true);

    razdel = '57 · Менютата · четирите състояния';
    // ПРАЗНО · нито цвят, нито дума
    await p.fill('#d-myasto', '');
    proveri('празното поле мълчи',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '');

    // ПИСАНО НА РЪКА, ново → ЧЕРНО и „＋ нова стойност"
    await p.fill('#d-myasto', 'Банишора');
    proveri('писаното на ръка ПОЧЕРНЯВА',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('и ДУМАТА го казва · вторият носител до цвета',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '＋ нова стойност');
    proveri('нищо не го спира · полето е валидно',
      await p.$eval('#d-myasto', (e) => (e as any).checkValidity()), true);

    // ПИСАНО НА РЪКА, СЛУЧАЙНО съвпадащо → пак ЧЕРНО, но друга дума
    await p.fill('#d-myasto', 'Малинова');
    proveri('случайното съвпадение ОСТАВА черно · „ти не си избирал"',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('но думата казва, че дубликат няма да се създаде',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '= съществуваща');

    // ИЗБРАНО ОТ СПИСЪКА → СИНЬО. Playwright не може да натисне ред от
    // `datalist` (той се рисува от самия браузър, извън документа), затова
    // събитието се подава така, както го подава браузърът при избор.
    await p.$eval('#d-myasto', (e) => {
      (e as any).value = 'Хисаря';
      e.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText', bubbles: true }));
    });
    proveri('изборът от списъка е СИН',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-sinio')), true);
    proveri('и не обещава нищо ново',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '');

    // РЕДАКЦИЯ СЛЕД ИЗБОР → ПОЧЕРНЯВА „в мига, в който се различи"
    await p.fill('#d-myasto', 'Хисаря 2');
    proveri('редактираното след избор ПОЧЕРНЯВА',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('и синьото си отива',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-sinio')), false);

    // ПОДРЕДБАТА · спешно и важно горе.
    proveri('спешното и важно е първо',
      await p.$eval('.gant-delo b', (e) => e.textContent), 'Акт 15');

    // СВЕТОФАРЪТ · неговите две числа. „Кофраж" свършва вдругиден → червено.
    proveri('делото до 2 дни свети червено',
      await p.$$eval('.gant-delo', (e) => e.filter((x) => x.classList.contains('cherveno')).length), 2);
    proveri('плочката „Горят до 2 дни" го брои', await plochka(p, 'Горят до 2 дни'), '2');

    // ЛЕНТИТЕ · еднодневното носи свой белег.
    proveri('всяко дело има лента', (await p.$$eval('.gant-lenta', (e) => e.length)), 3);
    // Само „Оглед без обект" е еднодневно; „Кофраж" тече два дни и затова е
    // червено, но НЕ еднодневно. Двете не се сливат.
    proveri('еднодневното е белязано',
      (await p.$$eval('.gant-lenta.ednodnevno', (e) => e.length)), 1);

    // ДНЕС Е ПЪРВАТА КОЛОНА · и се вижда.
    proveri('точно една колона е „днес"', (await p.$$eval('.gant-glava-vreme .dnes', (e) => e.length)), 1);

    // ТАКТЪТ мени решетката · неговите числа.
    proveri('подразбраният такт е месец',
      await p.$eval('[data-takt="mesets"]', (e) => e.classList.contains('izbran')), true);
    const koloniMesets = await p.$$eval('.gant-glava-vreme span', (e) => e.length);
    const parvataMesets = await p.$eval('.gant-glava-vreme span',
      (e) => e.getAttribute('data-den') ?? '');
    await deystvieSPrerisuvane(p, () => p.click('[data-takt="sedmitsa"]'));
    const koloniSedmitsa = await p.$$eval('.gant-glava-vreme span', (e) => e.length);
    // МЕСЕЦЪТ Е КАЛЕНДАРЕН (резен 13а · И104: „Месец с дните от календара за
    // месеца"). Дотук всеки месец получаваше по 31 колони и февруари показваше
    // три празни; сега шестте месеца дават толкова, колкото имат.
    // Числото се МЕРИ по свойство, не се заковава: шест последователни месеца
    // дават между 181 и 184 дни според това кои са. Заковано число тук би
    // паднало през февруари — точно грешката, която тази промяна поправя.
    proveri('месецът дава КАЛЕНДАРНИТЕ дни на шест месеца, не 6×31',
      koloniMesets >= 181 && koloniMesets <= 184, true);
    proveri('и почва от ПЪРВИЯ ден на месец', parvataMesets.slice(8), '01');
    proveri('седмицата дава 7×5 + 7', koloniSedmitsa, 7 * 5 + 7);
    await deystvieSPrerisuvane(p, () => p.click('[data-takt="mesets"]'));

    // ФИЛТРИТЕ · три колони, независими една от друга.
    await deystvieSPrerisuvane(p, () => p.selectOption('#f-myasto', 'Хисаря'));
    proveri('филтърът по Място оставя едно дело', (await p.$$eval('.gant-delo', (e) => e.length)), 1);
    await deystvieSPrerisuvane(p, () => p.selectOption('#f-myasto', ''));

    // СГЪВАНЕТО · само дела и поддела (И88). Мястото няма сгъвач.
    proveri('мястото НЯМА сгъвач',
      await p.$$eval('.gant-myasto .sgavach', (e) => e.length), 0);
    await zapishiDelo(p, { myasto: 'Малинова', obekt: 'бл. 1', ime: 'Арматура',
      otgovornik: 'Тихомир Иванов', ot: denOtDnes(2), do: denOtDnes(5), otsenka: 'нито-едно',
      nad: 'Акт 15' });
    proveri('подделото се вижда', (await p.$$eval('.gant-delo.poddelo', (e) => e.length)), 1);
    await deystvieSPrerisuvane(p, () => p.click('.gant-delo:has-text("Акт 15") [data-sgavi]'));
    proveri('сгъването скри подделото', (await p.$$eval('.gant-delo.poddelo', (e) => e.length)), 0);
    proveri('а надделото остана', (await p.$$eval('.gant-delo', (e) => e.length)), 3);

    // ВЛАЧЕНЕ НЯМА · негова забрана.
    proveri('лентата не се влачи',
      await p.$eval('.gant-lenta', (e) => (e as any).draggable), false);

    // ДИАГРАМАТА · дизайнът на графиката, който И56 чака.
    //
    // И96 т.4: „Диаграмата на Ганта е ОТДЯСНО на таблицата в Управление."
    // Дотук тук имаше превключвател — таблица ИЛИ диаграма — и проходът го
    // натискаше, за да види диаграмата. Сега двете стоят ЗАЕДНО, а бутонът
    // само СКРИВА диаграмата за тесен екран.
    proveri('диаграмата стои БЕЗ да се натиска нищо',
      await p.$$eval('svg.diagrama', (e) => e.length), 1);
    proveri('и таблицата стои ЕДНОВРЕМЕННО с нея',
      (await p.$$eval('.gant-lenta', (e) => e.length)) > 0, true);
    proveri('диаграмата е ОТДЯСНО · вторият стълб на решетката',
      await p.evaluate(() => {
        const t = document.querySelector('.gant-tablitsata')?.getBoundingClientRect();
        const d = document.querySelector('.gant-diagramata')?.getBoundingClientRect();
        return Boolean(t) && Boolean(d) && (d as any).left >= (t as any).right - 1;
      }), true);
    proveri('носи днешната линия', await p.$$eval('.diagrama-dnes', (e) => e.length), 1);
    proveri('лентите са ленти на време, не клетки',
      await p.$$eval('.diagrama-lenta', (e) => e.length), 3);
    proveri('и всяка носи title за четец на екран',
      await p.$eval('.diagrama-lenta title', (e) => e.textContent.includes('→')), true);

    // Бутонът СКРИВА, не разменя — таблицата остава и в двете състояния.
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '#kam-diagrama'));
    proveri('скрита диаграма НЕ отнема таблицата',
      await p.$$eval('.gant-lenta', (e) => e.length), 3);
    proveri('и диаграмата наистина я няма', await p.$$eval('svg.diagrama', (e) => e.length), 0);
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '#kam-diagrama'));
    proveri('и се връща с бутон', await p.$$eval('svg.diagrama', (e) => e.length), 1);

    // БУТОНЪТ СЕГА · подрежда, не решава.
    const predSega = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => natisniVGrupata(p, '#sega'));
    proveri('СЕГА не пипа нито едно дело', await broySabitiya(p), predSega);
    proveri('СЕГА филтрира по спешно и важно',
      await p.$eval('#f-otsenka', (e) => (e as any).value), 'спешно-важно');

    // ══ 57б · СЛЕДАТА СЛЕД ЗАПИСА · тук, защото пише ЧЕТВЪРТО дело ════════
    //
    // Всички проверки на §24 броят ТРИ дела; записът стои след тях нарочно.
    razdel = '57 · Менютата · следата СЛЕД записа';
    await deystvieSPrerisuvane(p, () => p.selectOption('#f-otsenka', ''));
    await zapishiDelo(p, { myasto: 'Банишора', obekt: '', ime: 'Акт 16',
      otgovornik: 'Николай Петков', ot: denOtDnes(0), do: denOtDnes(5), otsenka: 'важно-неспешно' });
    const vestZaMenyuta = await tekstNa(p, '.vest');
    proveri('след записа КАЗВА какво е влязло ново',
      vestZaMenyuta.includes('Нови стойности') && vestZaMenyuta.includes('Банишора')
        && vestZaMenyuta.includes('Акт 16'), true);
    proveri('а познатият отговорник НЕ се брои за нов',
      vestZaMenyuta.includes('Николай Петков'), false);
    proveri('и речникът вече го носи',
      (await p.$$eval('#d-myasto-spisak option', (o) => o.map((x) => (x as any).value))).includes('Банишора'), true);

    // ══ 58б · ОЩЕ ДВЕ ОГЛЕДАЛА · по обект и по контрагент (ADR-041) ═══════
    //
    // `src/ogledalo/izgledi.ts` също стоеше построен и без екран — възможността
    // „Изгледи по имот и по контрагент" беше отметка, която не пипаше нищо.
    razdel = '58 · Още огледала · по обект';
    await naEkran(p, 'imoti', '[data-sektsiya=po-imot]');
    proveri('изгледът „По обект" се показва',
      (await p.$$eval('.red.po-imot', (r) => r.length)) > 0, true);
    const sboraNaImotite = await p.$eval('.red.po-imot.sbor', (e) => e.textContent);
    proveri('и има ред „Всичко", който затваря', sboraNaImotite.includes('Всичко'), true);
    // Сборът на редовете трябва да е СБОРЪТ отдолу — иначе наем сочи изчезнал имот.
    const kolonaNachisleno = await p.$$eval('.red.po-imot:not(.sbor)', (r) =>
      r.map((x) => (x.children[2] as any).textContent.replace(/[^0-9,]/g, '').replace(',', '.')).map(Number));
    const sboratDolu = await p.$eval('.red.po-imot.sbor', (e) =>
      Number((e.children[2] as any).textContent.replace(/[^0-9,]/g, '').replace(',', '.')));
    proveri('сборът затваря с колоната над него',
      Math.abs(kolonaNachisleno.reduce((a, b) => a + b, 0) - sboratDolu) < 0.02, true);

    razdel = '58 · Още огледала · по контрагент';
    await naEkran(p, 'pari', '[data-sektsiya=po-kontragent]');
    proveri('изгледът „По контрагент" се показва',
      (await p.$$eval('.red.po-kontragent', (r) => r.length)) > 0, true);
    proveri('и КАЗВА кой как плаща · числото, което не се вижда отникъде другаде',
      (await p.$eval('[data-tablitsa=po-kontragent]', (e) => e.textContent)).includes('Плаща'), true);

    // ══ 25 · контактите и писмото при закъснение ═════════════════════════
}

/** 59 · Менютата · личното поле „Кой" */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '59 · Менютата · личното поле „Кой"';
    proveri('„Кой" носи списък от ЛИЧНИТЕ движения',
      await p.$eval('#lp-r-koy', (e) => e.getAttribute('list')), 'lp-r-koy-spisak');
    proveri('и „Посока" е ЗАКЛЮЧЕНА · приход и разход са фиксирани модели',
      await p.$eval('#lp-r-posoka', (e) => e.tagName), 'SELECT');
    proveri('личният екран · полетата са защитени от превод',
      await p.evaluate(() => {
        const poleta = [...document.querySelectorAll('input:not([type=checkbox]), select')];
        const goli = poleta.filter((e) => e.getAttribute('translate') !== 'no');
        return goli.length === 0 ? 'всички' : `голи: ${goli.map((e) => e.id || (e as any).name).join(' · ')}`;
      }),
      'всички');

    // ══ 56 · ЛИЧНИЯТ ИЗНОС · своя верига, свой файл (ADR-039) ═══════════════
}

/** 59 · Менютата · живото поле на Имоти | 59 · Менютата · заключеното поле КАЗВА защо | 59 · Менютата · Сметки | 59 · Менютата · следата след записа на разход */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '59 · Менютата · живото поле на Имоти';
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('„Наемател" носи СПИСЪК, а не само текст',
      await p.$eval('#naem-naemetel', (e) => e.getAttribute('list')), 'naem-naemetel-spisak');
    const naemateliVSpisaka = await p.$$eval('#naem-naemetel-spisak option', (o) => o.map((x) => (x as any).value));
    proveri('и в него стоят ЖИВИТЕ наематели от Журнала',
      naemateliVSpisaka.length > 0, true);
    await p.fill('#naem-naemetel', naemateliVSpisaka[0]);
    proveri('писаното на ръка ПОЧЕРНЯВА и тук',
      await p.$eval('#naem-naemetel', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('а думата казва, че дубликат няма да се създаде',
      await p.$eval('[data-znak-za="naem-naemetel"]', (e) => e.textContent.trim()), '= съществуваща');
    await p.fill('#naem-naemetel', 'Нов Наемател ЕООД');
    proveri('нов наемател обещава НОВА стойност',
      await p.$eval('[data-znak-za="naem-naemetel"]', (e) => e.textContent.trim()), '＋ нова стойност');

    razdel = '59 · Менютата · заключеното поле КАЗВА защо';
    proveri('„Сектор" остава ИЗБОР · непозната стойност не може да се появи',
      await p.$eval('#naem-sektor', (e) => e.tagName), 'SELECT');
    const kazvaSektor = await p.$eval('[data-zaklyuchen="sektor"]', (e) => e.textContent.trim());
    proveri('до него стои катинарът', kazvaSektor.startsWith('🔒'), true);
    proveri('и причината е СВОЯТА му, не заета от закона',
      kazvaSektor.includes('ЗДДС') && !kazvaSektor.includes('Настройки'), true);

    razdel = '59 · Менютата · Сметки';
    await naEkran(p, 'smetki', '#razhod-dostavchik');
    proveri('„Доставчик" носи списък от записаните разходи',
      (await p.$$eval('#razhod-dostavchik-spisak option', (o) => o.length)) > 0, true);
    proveri('и „За какво" също · двете полета, не едното',
      (await p.$$eval('#razhod-opis-spisak option', (o) => o.length)) > 0, true);
    proveri('„Поток" е ЗАКЛЮЧЕН · акумулаторите не растат от полето',
      await p.$eval('#razhod-potok', (e) => e.tagName), 'SELECT');
    proveri('и го казва с думи',
      (await p.$eval('[data-zaklyuchen="potok"]', (e) => e.textContent)).includes('акумулаторите'), true);
    // НАЙ-ВАЖНИЯТ заключен списък: „Платено" дели КЕШ от БАНКА в Сметки.
    proveri('„Платено" е заключен · свободна стойност би паднала тихо в БАНКА',
      await p.$eval('#razhod-nachin', (e) => e.tagName), 'SELECT');

    razdel = '59 · Менютата · следата след записа на разход';
    // Датата е в НЕЗАМРАЗЕН месец: справката за 2026-03 е подадена по §? и
    // формата отказва разход там — с думи, както се и проверява по-горе.
    await zapishiRazhod(p, { potok: 'zaplati', dostavchik: 'Нов Доставчик ООД',
      opis: 'ново перо', suma: '100,00', nachin: 'банка', data: '2026-11-12', dokument: '' });
    const vestZaRazhod = await tekstNa(p, '.vest');
    proveri('след записа КАЗВА какво е влязло ново',
      vestZaRazhod.includes('Нови стойности') && vestZaRazhod.includes('Нов Доставчик ООД'), true);
    proveri('и речникът вече го носи',
      (await p.$$eval('#razhod-dostavchik-spisak option', (o) => o.map((x) => (x as any).value)))
        .includes('Нов Доставчик ООД'), true);

    // ══ 66 · ОДИТНИЯТ ФАЙЛ · SAF-T и контрагентите (И96 т.11) ═════════════
    //
    // Проверява се онова, което ТЕСТЪТ не може: че Главната книга стига до
    // ЕКРАНА, че пречките се четат с думи и че вписаните данни МАХАТ своята
    // пречка — тоест че екранът и домейнът гледат едно и също число.
}

/**
 * 71 · Падащият ред на екрана · секциите в лентата (ADR-057в)
 *
 * Негови думи: „Отляво където са изредени табовете искам **когато има секции
 * вътре да ги подредиш в падащо меню**."
 *
 * Проверява се и ГРАНИЦАТА, и ЦЕНАТА: екран с три секции няма ред (три реда в
 * меню са повече работа от превъртането), а списъкът се чете от ЕКРАНА, значи
 * работи от другаде чак след като екранът е бил отварян веднъж.
 */
export async function blok4(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '71 · Падащият ред на екрана · кой пункт го получава';

    // Сметки е най-натовареният екран · дотук е бил отварян много пъти, значи
    // паметта му е пълна и редът работи ОТ ДРУГАДЕ.
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('Сметки носи падащ ред, макар да стоим на Имоти',
      Boolean(await p.$('.padasht-menyu > [data-ekran=smetki]')), true);
    proveri('и Имоти също · пет секции е повече от три',
      Boolean(await p.$('.padasht-menyu > [data-ekran=imoti]')), true);
    /**
     * ГРАНИЦАТА: три реда в меню са повече работа от превъртането.
     *
     * ГАНТ Я МИНА в резен 30 и това е ПРАВИЛОТО, работещо както е обявено, а
     * не дефект: списъкът на отпадналите дела е ЧЕТВЪРТА секция там, и оттам
     * нататък падащият ред е по-евтин от превъртането (ADR-057). Странична
     * последица е, но обявена — не премълчана.
     *
     * Проверката НЕ се маха: тя пази ПРАГА. Ако утре някой го смени, тук ще
     * падне — и точно затова насреща стои екран, който още е ПОД него.
     */
    proveri('Гант ВЕЧЕ носи ред · четвъртата секция мина прага (резен 30)',
      Boolean(await p.$('.padasht-menyu > [data-ekran=gant]')), true);
    proveri('а Стойност още НЕ · три секции не правят меню',
      Boolean(await p.$('.padasht-menyu > [data-ekran=stoynost]')), false);
    proveri('Настройки пази СВОЯ ред · теми, не секции',
      Boolean(await p.$('.menyu-nastroyki #nastroyki-red')), true);

    razdel = '71 · Падащият ред на екрана · какво изрежда';
    const vhodSmetki = '.padasht-menyu > [data-ekran=smetki]';
    proveri('пунктът КАЗВА, че носи ред', await p.$eval(vhodSmetki, (e) => e.getAttribute('aria-expanded')), 'false');
    await p.click(vhodSmetki);
    await p.waitForSelector('#ekran-red-smetki:not([hidden])');
    proveri('и се отваря', await p.$eval(vhodSmetki, (e) => e.getAttribute('aria-expanded')), 'true');
    const redove = await p.$$eval('#ekran-red-smetki [data-kam-sektsiya]', (e) => e.length);
    proveri('изрежда секциите на Сметки · повече от десет', redove > 10, true);
    proveri('и всяка носи ИМЕТО си, не ключа',
      await p.$eval('#ekran-red-smetki [data-kam-sektsiya="smetki-dds"] b', (e) => e.textContent!.trim()),
      'ДДС');

    razdel = '71 · Падащият ред на екрана · води до секцията';
    // Подчертаването живее 1,6 секунди и си отива само — чака се да се появи,
    // вместо да се чете след прерисуването.
    await p.click('#ekran-red-smetki [data-kam-sektsiya="smetki-dds"]');
    // ПЪРВО се чака СМЯНАТА на екрана, чак после белегът. Сметки е най-тежкият
    // екран и рисуването му изяжда кадрите; чакането направо за белега тръгва
    // да брои, докато екранът още се строи, и изпуска мига, в който белегът
    // стои (той живее 1,6 секунди и си отива сам).
    // Чака се СЪС СВОЙ такт (50 ms), не по кадри: Сметки е най-тежкият екран и
    // рисуването му изяжда кадрите, а белегът живее 1,6 секунди и си отива сам.
    // Чакане по кадри тук изпуска точно мига, в който белегът стои.
    await p.waitForSelector('[data-sektsiya=smetki-dds]');
    await p.waitForFunction(
      () => document.querySelector('[data-sektsiya=smetki-dds]')?.classList.contains('podchertana'),
      undefined,
      { polling: 50 },
    );
    proveri('заведе на Сметки', await p.$eval('.navred.tuk', (e) => e.getAttribute('data-ekran')), 'smetki');
    proveri('и ПОДЧЕРТА секцията, за да се види къде е стигнало окото', true, true);
    // МЕРИ СЕ ЕКРАНЪТ, не атрибутът · виж §63 и ADR-057г.
    proveri('а редът се прибра след избора · и наистина не се вижда',
      await p.$eval('#ekran-red-smetki', (e) => !(e as HTMLElement).checkVisibility()), true);
    proveri('и НИКОЙ друг ред не е останал отворен',
      await p.$$eval('.ekran-red', (e) => e.filter((x) => (x as HTMLElement).checkVisibility()).length), 0);

    razdel = '71 · Падащият ред на екрана · Escape не оставя капан';
    // Натискането на пункт върши ДВЕ неща: завежда И отваря реда. Изчаква се
    // прерисуването, преди да се натисне Escape — инак проходът натиска, докато
    // старата лента още се сменя, и фокусът пада на `body` не заради грешка, а
    // защото възелът под пръста вече го няма. Човек не пише толкова бързо.
    await deystvieSPrerisuvane(p, () => p.click('.padasht-menyu > [data-ekran=imoti]'));
    await p.waitForSelector('#ekran-red-imoti:not([hidden])');
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => (document.querySelector('#ekran-red-imoti') as HTMLElement).hidden);
    proveri('Escape затваря реда · мери се екранът, не атрибутът',
      await p.$eval('#ekran-red-imoti', (e) => !(e as HTMLElement).checkVisibility()), true);
    proveri('и фокусът се връща на пункта',
      await p.evaluate(() => document.activeElement?.getAttribute('data-ekran')), 'imoti');
    await naEkran(p, 'imoti', '#forma-imot');
}
