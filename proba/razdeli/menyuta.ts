import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naPodtabNa, broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, napishiSigurno, natisni, plochka, tekstNa, zapishiDelo, zapishiRazhod } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';

/** 57 · Менютата · речникът е от Журнала | 57 · Менютата · четирите състояния | 57 · Менютата · следата СЛЕД записа | 58 · Още огледала · по обект | 58 · Още огледала · по контрагент */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '57 · Менютата · речникът е от Журнала';
    proveri('полето „Имот" носи СПИСЪК, а не само текст',
      await p.$eval('#d-myasto', (e) => e.getAttribute('list')), 'd-myasto-spisak');
    const mestaVSpisaka = await p.$$eval('#d-myasto-spisak option', (o) => o.map((x) => (x as any).value));
    // ОТ РЕЗЕН 100 (И124 т.8 „избор от наличното за дело"): след живите места
    // стоят и ВПИСАНИТЕ Имоти без дело — първите две остават живите.
    proveri('и в списъка стоят ЖИВИТЕ места, най-писаното горе',
      mestaVSpisaka.slice(0, 2), ['Малинова', 'Хисаря']);
    proveri('отговорниците също · речникът е на всяко поле',
      (await p.$$eval('#d-otgovornik-spisak option', (o) => o.map((x) => (x as any).value))).length, 3);
    proveri('и НИЩО ново не е записано за речниците',
      await p.$$eval('#d-myasto-spisak option', (o) => o.length) > 0, true);

    razdel = '57 · Менютата · четирите състояния';
    // ПРАЗНО · нито цвят, нито дума
    await napishiSigurno(p, '#d-myasto', '');
    proveri('празното поле мълчи',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '');

    // ПИСАНО НА РЪКА, ново → ЧЕРНО и „＋ нова стойност"
    await napishiSigurno(p, '#d-myasto', 'Банишора');
    proveri('писаното на ръка ПОЧЕРНЯВА',
      await p.$eval('#d-myasto', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('и ДУМАТА го казва · вторият носител до цвета',
      await p.$eval('[data-znak-za="d-myasto"]', (e) => e.textContent.trim()), '＋ нова стойност');
    proveri('нищо не го спира · полето е валидно',
      await p.$eval('#d-myasto', (e) => (e as any).checkValidity()), true);

    // ПИСАНО НА РЪКА, СЛУЧАЙНО съвпадащо → пак ЧЕРНО, но друга дума
    await napishiSigurno(p, '#d-myasto', 'Малинова');
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
    await napishiSigurno(p, '#d-myasto', 'Хисаря 2');
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

    // ФИЛТРИТЕ · колоните са на ДВИГАТЕЛЯ (резен 75в) — дубльорът-select падна.
    proveri('главата-лента носи стрелка на всяка от четирите колони',
      await p.$$eval('.gant-filtri [data-filtar-glava]', (e) => e.length), 4);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-glava="gant:myasto"]'));
    await deystvieSPrerisuvane(p, () =>
      p.check('[data-filtar-grupa="gant:myasto"][value="Хисаря"]'));
    proveri('филтърът по Място оставя едно дело', (await p.$$eval('.gant-delo', (e) => e.length)), 1);
    proveri('и скритото СЕ КАЗВА под лентата',
      (await tekstNa(p, '[data-sektsiya=gant-izgled] .filtar-skrito')).includes('крие'), true);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-izchisti="gant:myasto"]'));
    // Менюто се затваря, за да не гълта първия клик на следващите проверки.
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-glava="gant:myasto"]'));

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
    await deystvieSPrerisuvane(p, () => natisni(p, '#kam-diagrama'));
    proveri('скрита диаграма НЕ отнема таблицата',
      await p.$$eval('.gant-lenta', (e) => e.length), 3);
    proveri('и диаграмата наистина я няма', await p.$$eval('svg.diagrama', (e) => e.length), 0);
    await deystvieSPrerisuvane(p, () => natisni(p, '#kam-diagrama'));
    proveri('и се връща с бутон', await p.$$eval('svg.diagrama', (e) => e.length), 1);

    // БУТОНЪТ СЕГА · подрежда, не решава.
    const predSega = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => natisni(p, '#sega'));
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
    await napishiSigurno(p, '#naem-naemetel', naemateliVSpisaka[0]);
    proveri('писаното на ръка ПОЧЕРНЯВА и тук',
      await p.$eval('#naem-naemetel', (e) => e.classList.contains('menyu-cherno')), true);
    proveri('а думата казва, че дубликат няма да се създаде',
      await p.$eval('[data-znak-za="naem-naemetel"]', (e) => e.textContent.trim()), '= съществуваща');
    await napishiSigurno(p, '#naem-naemetel', 'Нов Наемател ЕООД');
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
    await naPodtabNa(p, 'smetki', 'razhod', '#razhod-dostavchik');
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
     * ГРАНИЦАТА падна на ДВЕ (И125 · резен 85): „падащо меню за ВСЕКИ таб от
     * менюто", а необходимо е точно когато има избор — от втората секция
     * нагоре. Старият праг ЧЕТИРИ държеше Стойност (три секции) без ред.
     *
     * Проверката НЕ се маха: тя пази НОВИЯ праг от двете посоки — Стойност
     * (три секции) вече носи ред, а екран с ЕДНА секция не бива да го получи.
     */
    proveri('Гант носи ред · мина прага още на четири (резен 30)',
      Boolean(await p.$('.padasht-menyu > [data-ekran=gant]')), true);
    proveri('и Стойност ВЕЧЕ носи · две секции стигат (И125)',
      Boolean(await p.$('.padasht-menyu > [data-ekran=stoynost]')), true);
    proveri('Настройки пази СВОЯ ред · теми, не секции',
      Boolean(await p.$('.menyu-nastroyki #nastroyki-red')), true);

    // ВСЕКИ таб с две и повече ПОМНЕНИ секции носи ред — след като целият
    // проход е минал, паметта на всички е пълна и мярката е реална. Екран с
    // една или нула секции остава гол пункт, и това също се брои.
    const bezRed = await p.$$eval('.nav > [data-ekran], .padasht-menyu > [data-ekran]', (e) =>
      e.filter((x) => x.id !== 'nastroyki-vhod' && !x.closest('.padasht-menyu'))
        .map((x) => x.getAttribute('data-ekran') ?? ''));
    const pametta = await p.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.includes('sektsii.'))
          .map((k) => [k.split('sektsii.')[1], (JSON.parse(localStorage.getItem(k) ?? '[]') as unknown[]).length]),
      ));
    proveri('нито един таб с ≥2 секции не е БЕЗ падащ ред',
      bezRed.filter((k) => (pametta[k] ?? 0) >= 2).join(' · ') || 'няма такъв', 'няма такъв');

    // ══ 146 · МЕНЮТАТА СА АКТИВНИ ОТ ПЪРВИЯ МИГ (И127 т.1 · резен 90) ══════
    //
    // Дотук горната мярка беше вярна ПО ЗАСЛУГА НА ПРОХОДА: той е отварял
    // всеки екран, значи паметта им е пълна. Човек, който тъкмо е влязъл,
    // виждаше голи пунктове — цената, обявена в ADR-057в. Тя пада: паметта се
    // пълни от рисуване НАУМ. Мери се точно това — паметта се ТРИЕ, страницата
    // се презарежда, и редовете трябва да са там още преди да е отворен екран.
    razdel = '146 · падащите менюта са АКТИВНИ от първия миг';
    const predi = await p.$$eval('.padasht-menyu > [data-ekran]', (e) => e.length);
    proveri('преди чистенето редовете ги има · инак мярката долу мери нищо',
      predi >= 2, true);
    await p.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.includes('sektsii.')) localStorage.removeItem(k);
      }
    });
    await p.reload({ waitUntil: 'load' });
    await p.waitForSelector('#forma-imot');
    const sledChistene = await p.$$eval('.padasht-menyu > [data-ekran]', (e) =>
      e.map((x) => x.getAttribute('data-ekran') ?? '').sort());
    proveri('след ТРИТА памет редовете пак са тук · рисуването наум ги връща',
      sledChistene.length >= predi, true);
    proveri('и Баланс носи ред, без да е отварян в тази сесия',
      sledChistene.includes('smetki'), true);
    proveri('и Управление · чужд екран, нула отваряния',
      sledChistene.includes('gant'), true);

    // ══ 146б · ТАБЛИЦИТЕ СА РАЗДЕЛЕНИ · подпункт за всяка именувана ════════
    // „и да са разделени таблиците" — секция с ЕДНА таблица си остава един
    // пункт; секция с ТРИ (Кредити) дава три подпункта с имената им.
    // Кредитите са СЕКЦИЯ на Баланс, не свой екран (ADR-143 · редът на
    // лентата) — редът, който ги изрежда, е неговият.
    await naPodtabNa(p, 'smetki', 'razhod', '[data-sektsiya=krediti]');
    // КЛИКЪТ Е УСЛОВЕН: `naEkran` натиска СЪЩИЯ пункт, за да смени екрана — а
    // пунктът е един бутон с две задачи (ADR-057в), тоест редът вече е
    // отворен. Втори клик щеше да го ЗАТВОРИ, и чакането да виси върху
    // собственото си действие.
    if (await p.$eval('#ekran-red-smetki', (e) => (e as HTMLElement).hidden)) {
      await p.click('.padasht-menyu > [data-ekran=smetki]');
    }
    await p.waitForSelector('#ekran-red-smetki:not([hidden])');
    const podtablitsi = await p.$$eval('#ekran-red-smetki [data-kam-tablitsa]', (e) =>
      e.map((x) => x.getAttribute('data-kam-tablitsa') ?? '').sort());
    proveri('трите таблици на Кредити са РАЗДЕЛЕНИ в менюто',
      podtablitsi.join(' · '), 'krediti · krediti-plan · krediti-predstoyashti');
    proveri('и всеки подпункт носи ИМЕТО на таблицата си, не ключа ѝ',
      (await tekstNa(p, '#ekran-red-smetki')).includes('Предстоящи вноски'), true);
    // Подпунктът ЗАВЕЖДА до своята таблица · подчертаването го казва.
    await p.click('#ekran-red-smetki [data-kam-tablitsa="krediti-plan"]');
    // ЧАКА СЕ ПОДЧЕРТАВАНЕТО, не таблицата: тя вече стои на екрана, а
    // завеждането е асинхронно (отваря екран, прерисува, чак тогава сочи).
    // Белегът живее 1,6 секунди — чакането го хваща, броенето след него не.
    const zavelo = await p
      .waitForSelector('.tablitsa[data-tablitsa=krediti-plan].podchertana', { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    proveri('натиснатият подпункт завежда до СВОЯТА таблица', zavelo, true);
    // ЗАВЕЖДАНЕТО Е АСИНХРОНО · чака се екранът да се УТАЛОЖИ, преди да се
    // тръгне другаде. Без това при бавна машина недовършеното „заведи" връщаше
    // екрана на Сметки СЛЕД като проходът вече е поискал Имоти — и следващият
    // раздел четеше реда на ТЕКУЩИЯ екран (той изрежда само видимия подтаб),
    // тоест находката беше измислена от състезание, не от кода.
    const naEkranaE = async (ime: string): Promise<void> => {
      await p.waitForFunction(
        (t) => document.querySelector('.shapka h1')?.textContent?.trim() === t,
        ime,
        { timeout: 10_000 },
      );
    };
    await naEkranaE('Сметки');
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkranaE('Имоти');

    razdel = '71 · Падащият ред на екрана · какво изрежда';
    const vhodSmetki = '.padasht-menyu > [data-ekran=smetki]';
    proveri('пунктът КАЗВА, че носи ред', await p.$eval(vhodSmetki, (e) => e.getAttribute('aria-expanded')), 'false');
    await p.click(vhodSmetki);
    await p.waitForSelector('#ekran-red-smetki:not([hidden])');
    // ПУНКТЪТ И ЗАВЕЖДА („един бутон с две задачи"): натискането отваря реда
    // И сменя екрана на Сметки, асинхронно. Редът се появява в СТАРИЯ DOM
    // веднага, а прерисуването идва след миг — и всичко, прочетено или
    // натиснато между двете, стъпва върху възел, който след малко го няма
    // („element was detached, retrying" до изтичане на времето). Тринайсет
    // пускания и една сонда, за да се види: превъртането НЕ прерисува (нула
    // мутации), навигацията прерисува. Затова се чака екранът, чак после се чете.
    await naEkranaE('Сметки');
    proveri('и се отваря', await p.$eval(vhodSmetki, (e) => e.getAttribute('aria-expanded')), 'true');
    // ЕДНА СНИМКА, не три четения (честност · обход Е): редът се строи наново
    // при всяко рисуване, а между две четения екранът може да е прерисувал —
    // тогава двете четения описват РАЗЛИЧНИ редове и находката е измислена.
    const snimka = await p.$$eval('#ekran-red-smetki [data-kam-sektsiya]', (e) => ({
      klyuchove: [...new Set(e.map((x) => x.getAttribute('data-kam-sektsiya') ?? ''))],
      dds: e
        .filter((x) => x.getAttribute('data-kam-sektsiya') === 'smetki-dds' && !x.hasAttribute('data-kam-tablitsa'))
        .map((x) => x.textContent!.trim())
        .join(' | '),
    }));
    proveri('изрежда секциите на Сметки · повече от десет', snimka.klyuchove.length > 10, true);
    // ОТ РЕЗЕН 115: редът изрежда секциите на ВСИЧКИТЕ пет подтаба, не само на
    // видимия — иначе би зависел от историята на устройството. На провал се
    // изписва целият списък, за да се вижда КОЕ липсва, не само че липсва.
    proveri('и носи секция от подтаб Баланс',
      snimka.klyuchove.includes('smetki-dds') ? 'да' : `няма · ${snimka.klyuchove.join(' · ')}`, 'да');
    proveri('и всяка носи ИМЕТО си, не ключа', snimka.dds, 'ДДС');

    razdel = '71 · Падащият ред на екрана · води до секцията';
    // Подчертаването живее 1,6 секунди и си отива само — чака се да се появи,
    // вместо да се чете след прерисуването. Показалецът е истински: екранът
    // вече е уталожен (виж по-горе), значи няма кой да откачи бутона.
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
