import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, deystvieSPrerisuvane, naEkran, natisni, sSabitie } from '../yadro/pomoshtni.ts';

/**
 * 101 · ТАБЛИЦА ОТ ФАЙЛ · неговият експеримент с Фактури (резен 21 · ADR-081).
 *
 * Какво пази този блок · целият път, от байтовете до записа:
 *
 *   · файлът се ЧЕТЕ, не се качва — и екранът го казва;
 *   · предложението показва колоните, видовете и КОЯ формула е дошла;
 *   · непреведената колона казва ЗАЩО, до самата себе си;
 *   · сверката на сметките показва разлика НУЛА, и това е числото, което
 *     решава дали формулата изобщо се копира;
 *   · потвърждението ражда ЕДНО събитие, не повече.
 */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  const razdel = '101 · Таблица от файл · с формулите, ако се превеждат';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);

  await naEkran(p, 'smetki', '[data-sektsiya=tablitsa-ot-fayl]');

  proveri(
    'преди четене няма предложение · нищо не се измисля',
    await p.$$eval('.plochki[data-predlozhenie]', (e) => e.length),
    0,
  );

  const predi = await broySabitiya(p);
  await p.setInputFiles(
    '#fayl-tablitsa',
    new URL('../../primeri/fakturi-s-formuli.xlsx', import.meta.url).pathname,
  );
  await p.waitForSelector('[data-predlozhenie]', { timeout: 5_000 });

  proveri(
    'ЧЕТЕНЕТО не пише нищо в Журнала · човекът още не е потвърдил',
    await broySabitiya(p),
    predi,
  );
  proveri(
    'предложението носи ПЕТТЕ колони на файла',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-koloni]', (e) => Number((e as HTMLElement).dataset['koloni'])),
    5,
  );
  // ЕДНА, не три: формулата се пази ПО КОЛОНА, а трите ѝ клетки са една и
  // съща сметка, разтеглена надолу.
  proveri(
    'намерена е ЕДНА формула · колоната „Общо", не трите ѝ клетки',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-formuli]', (e) => Number((e as HTMLElement).dataset['formuli'])),
    1,
  );
  proveri(
    'и тя е КОПИРАНА · сборът се превежда',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-kopirani]', (e) => Number((e as HTMLElement).dataset['kopirani'])),
    1,
  );
  proveri(
    'СВЕРКАТА на сметките показва разлика НУЛА',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-razlika]', (e) => Number((e as HTMLElement).dataset['razlika'])),
    0,
  );

  proveri(
    'колоната „Общо" носи сметка, останалите — не',
    await p.$$eval('[data-tablitsa=ot-fayl] .red.otfaylred[data-formula=da]', (e) => e.length),
    1,
  );
  // ВИДЪТ вече е ПАДАЩО МЕНЮ (резен 61): машината предлага, човекът решава.
  // Затова се чете ИЗБРАНОТО, не текстът на клетката — иначе тук стоят всички
  // пет думи слепени и проверката минава за друго.
  proveri(
    'видовете се ПРЕДЛАГАТ от данните · текст, евро, евро, евро, процент',
    (
      await p.$$eval('[data-tablitsa=ot-fayl] .red.otfaylred[data-kolona] select', (e) =>
        e.map((x) => (x as HTMLSelectElement).value),
      )
    ).join(' · '),
    'tekst · evro · evro · evro · protsent',
  );

  // ══ 131 · ГЛАВАТА СЕ ПОЗНАВА · ВИДЪТ СЕ ПОПРАВЯ · ФАЙЛЪТ ВЛИЗА ЦЯЛ ══════
  // (резен 61) Трите неща, без които неговият файл не влиза: главата под
  // заглавен ред, парите като голи числа, и 120 реда, които не се пишат ръчно.
  proveri(
    'екранът казва на кой ред е познал главата',
    Boolean(await p.$('#red-na-glavata')),
    true,
  );
  proveri(
    'видът на всяка колона е ПАДАЩО МЕНЮ, не присъда',
    (await p.$$eval('[data-vid-na]', (e) => e.length)) > 0,
    true,
  );

  // ── ПОТВЪРЖДЕНИЕТО · чак сега се пише ───────────────────────────────────
  await p.fill('#nova-tablitsa-ime', 'Фактури от файл');
  await sSabitie(p, () => p.click('#forma-sazday-tablitsa button[type=submit]'));

  proveri(
    'потвърждението ражда ЕДНО събитие',
    await broySabitiya(p),
    predi + 1,
  );
  proveri(
    'и предложението се прибира · то беше поглед, не състояние',
    await p.$$eval('.plochki[data-predlozhenie]', (e) => e.length),
    0,
  );
  proveri(
    'екранът казва, че файлът НЕ се качва',
    ((await p.textContent('[data-sektsiya=tablitsa-ot-fayl]')) ?? '').includes(
      'Файлът НЕ се качва тук',
    ),
    true,
  );

  // ── ВНОСЪТ · целият лист влиза с едно натискане ─────────────────────────
  proveri(
    'след създаването се предлага ВНОС на редовете',
    Boolean(await p.$('#vnesi-redovete')),
    true,
  );
  proveri(
    'и сверката вход↔изход стои до бутона, с разлика НУЛА',
    ((await p.textContent('#sverka-vnos')) ?? '').replace(/\s+/g, ' ').includes('разлика: 0'),
    true,
  );
  // ВНОСЪТ пише ПО ЕДНО събитие на ред, не едно за партидата — затова тук не
  // се ползва `sSabitie` (той чака точно +1), а се БРОЯТ. Числото е пин: три
  // реда данни има фикстурата, три записа трябва да влязат.
  const predVnos = await broySabitiya(p);
  await deystvieSPrerisuvane(p, () => p.click('#vnesi-redovete'));
  await p.waitForFunction(
    (n) =>
      Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) >= (n as number) + 3,
    predVnos,
  );
  proveri('вносът пише ПО ЕДНО събитие на ред', (await broySabitiya(p)) - predVnos, 3);
  proveri(
    'и те се виждат в таблицата',
    (await p.$$eval('[data-tablitsa=redove-na-sazdadena] [data-red]', (e) => e.length)) > 0,
    true,
  );
  proveri(
    'бутонът си отива · внесеното не се внася втори път',
    await p.$$eval('#vnesi-redovete', (e) => e.length),
    0,
  );

  // ══ 128 · РЕДОВЕТЕ НА СЪЗДАДЕНАТА ТАБЛИЦА (резен 57 · M12) ═══════════════
  // Дотук създадената таблица влизаше в Журнала и ИЗЧЕЗВАШЕ: картата ѝ в
  // Огледалото имаше нула четци. Тук се проверява целият обратен път.
  await p.waitForSelector('[data-sektsiya=sazdadenite-tablitsi]');
  proveri(
    'създадената таблица вече се ВИЖДА, а не изчезва в Журнала',
    ((await p.textContent('[data-sektsiya=sazdadenite-tablitsi]')) ?? '').includes(
      'Фактури от файл',
    ),
    true,
  );

  // Затворената колона НЕ получава поле — тя се смята (правило 23), и го КАЗВА.
  const poleta = await p.$$eval('#forma-red-na-tablitsa input[data-vid]', (e) =>
    e.map((x) => ({ id: x.id, vid: (x as HTMLElement).dataset['vid'] ?? '' })),
  );
  proveri('отворените колони имат поле', poleta.length > 0, true);
  proveri(
    'а затворената казва „смята се" вместо да приеме стойност',
    ((await p.textContent('#forma-red-na-tablitsa')) ?? '').includes('смята се'),
    true,
  );

  const poleTekst = poleta.find((x) => x.vid === 'tekst');
  const poleEvro = poleta.find((x) => x.vid === 'evro');
  proveri('има и текстова, и парична колона за писане', Boolean(poleTekst && poleEvro), true);

  await p.fill('#red-klyuch', 'Ф-1');
  if (poleTekst) await p.fill(`#${poleTekst.id}`, 'Доставчик ООД');
  if (poleEvro) await p.fill(`#${poleEvro.id}`, '120,33');
  const predRed = await broySabitiya(p);
  await sSabitie(p, () => p.click('#forma-red-na-tablitsa button[type=submit]'));
  proveri('редът е СЪБИТИЕ', await broySabitiya(p), predRed + 1);
  // ТРИТЕ ВНЕСЕНИ плюс ТОЗИ на ръка. Числото беше 1, докато вносът го нямаше —
  // и остана 1 след него: проверка, зелена по стара причина. Тя падна чак
  // когато вносът застана пред нея (резен 61).
  proveri(
    'написаният на ръка застава ДО внесените · 3 + 1',
    await p.$$eval('[data-tablitsa=redove-na-sazdadena] [data-red]', (e) => e.length),
    4,
  );
  proveri(
    'парите се показват цели, както ги пише валутата',
    ((await p.textContent('[data-tablitsa=redove-na-sazdadena]')) ?? '').includes('120,33'),
    true,
  );
  proveri(
    'сверката брои трите числа',
    ((await p.textContent('#sverka-redove')) ?? '').replace(/\s+/g, ' ').includes('живи: 4'),
    true,
  );

  // МАХАНЕТО е ЗАПИС: редът си отива от таблицата, Журналът расте.
  //
  // Бутонът се хваща ПО КЛЮЧ, не като „първия махач". Голият селектор беше
  // еднозначен, докато редът беше един; щом вносът сложи три пред него, той
  // започна да маха ЧУЖД ред („Кауфланд"), а проверката отдолу пак минаваше.
  // Точно това брои `chestnost` като гол селектор върху двусмислен белег.
  const predMahane = await broySabitiya(p);
  await sSabitie(p, () => p.click('[data-mahni-red="Ф-1"]'));
  proveri('махането също е СЪБИТИЕ', await broySabitiya(p), predMahane + 1);
  proveri(
    'редът си отива от ТАБЛИЦАТА · и то ТОЗИ ред',
    (await p.$$eval('[data-tablitsa=redove-na-sazdadena] [data-red]', (e) =>
      e.map((x) => (x as HTMLElement).dataset['red'] ?? ''),
    )).join(' '),
    'Кауфланд Пощенска Техномаркет',
  );
  proveri(
    'а сверката помни, че е БИЛ · записани 1 · махнати 1 · живи 0',
    ((await p.textContent('#sverka-redove')) ?? '').replace(/\s+/g, ' ').includes('махнати: 1'),
    true,
  );

  // ══ 129 · ЗАКАЧКА КЪМ РЕД НА СЪЗДАДЕНА ТАБЛИЦА (резен 58 · M17) ══════════
  // Втората половина на M17. Живее ТУК, а не при закачките: там таблицата още
  // не съществува — проходът тече по реда на екраните, не по реда на темите.
  await p.fill('#red-klyuch', 'Ф-7');
  if (poleTekst) await p.fill(`#${poleTekst.id}`, 'За закачане');
  await sSabitie(p, () => p.click('#forma-red-na-tablitsa button[type=submit]'));

  // ══ 130 · РАЗРЕЗЪТ ПО СОБСТВЕНА КОЛОНА (резен 59) ════════════════════════
  proveri(
    'без избор няма разрез · сметка не се появява сама',
    await p.$$eval('[data-tablitsa=razrez]', (e) => e.length),
    0,
  );
  await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-razrez', '0'));
  proveri(
    'изборът вади таблицата на разреза',
    await p.$$eval('[data-tablitsa=razrez] [data-grupa]', (e) => e.length > 0),
    true,
  );
  proveri(
    'и сверката цяло ↔ части излиза на НУЛА',
    ((await p.textContent('#sverka-razrez')) ?? '').replace(/\s+/g, ' ').includes('разлика: 0'),
    true,
  );
  await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-razrez', ''));
  proveri(
    'и се прибира, щом изборът падне',
    await p.$$eval('[data-tablitsa=razrez]', (e) => e.length),
    0,
  );

  await naEkran(p, 'tabove', '#izbor-tab');
  await deystvieSPrerisuvane(p, () => p.selectOption('#zak-vid-a', 'red'));
  proveri(
    'изборът „Ред на таблица" вади ВТОРО меню — коя таблица',
    Boolean(await p.$('#zak-tablitsa-a')),
    true,
  );
  proveri(
    'а при вградена същност второто меню го НЯМА',
    await p.$$eval('#zak-tablitsa-b', (e) => e.length),
    0,
  );
  proveri(
    'предлагат се ЖИВИТЕ редове — внесените и писаният на ръка, а махнатият — не',
    await p.$$eval('#zak-red-a option', (e) => e.map((x) => x.textContent).join(' ')),
    'Кауфланд Пощенска Техномаркет Ф-7',
  );

  await deystvieSPrerisuvane(p, () => p.selectOption('#zak-vid-b', 'imot'));
  const predChuzhda = await broySabitiya(p);
  await sSabitie(p, () => p.click('#zak-zakachi'));
  proveri('закачката към ред на таблица е СЪБИТИЕ', await broySabitiya(p), predChuzhda + 1);
  proveri(
    'и двойката показва В КОЯ таблица е редът',
    ((await p.textContent('[data-tablitsa=zakachki]')) ?? '').includes('Фактури от файл'),
    true,
  );

  // ══ 132а · ВТОРАТА ТАБЛИЦА · за семейството от глави (резен 62) ══════════
  // Втори лист на СЪЩАТА работа, с разместени колони и друга дума за едно и
  // също („Ставка" ↔ „АКТ Ставка"). Едната таблица не може да покаже проблема,
  // за който семейството съществува.
  await naEkran(p, 'smetki', '[data-sektsiya=tablitsa-ot-fayl]');
  await p.setInputFiles(
    '#fayl-tablitsa',
    new URL('../../primeri/fakturi-vtori-obekt.xlsx', import.meta.url).pathname,
  );
  await p.waitForSelector('[data-predlozhenie]', { timeout: 5_000 });
  proveri(
    'вторият лист носи ШЕСТ колони · безименната си има име по номер',
    await p.$eval('[data-sektsiya=tablitsa-ot-fayl] [data-koloni]', (e) =>
      Number((e as HTMLElement).dataset['koloni']),
    ),
    6,
  );
  await p.fill('#nova-tablitsa-ime', 'Втори обект');
  await sSabitie(p, () => p.click('#forma-sazday-tablitsa button[type=submit]'));
  proveri(
    'и двете таблици вече се виждат',
    ((await p.textContent('[data-sektsiya=sazdadenite-tablitsi]')) ?? '').includes('Втори обект'),
    true,
  );

  // ВТОРАТА ТАБЛИЦА СМЕНИ ПОДРАЗБИРАНЕТО: менюто ги дава подредени по име, а
  // „Втори обект" е преди „Фактури от файл" — и той няма нито един ред. Затова
  // таблицата се избира ПОИМЕННО, вместо да се разчита на първата.
  await naEkran(p, 'tabove', '#izbor-tab');
  await deystvieSPrerisuvane(p, () => p.selectOption('#zak-vid-a', 'red'));
  await deystvieSPrerisuvane(p, () => p.selectOption('#zak-tablitsa-a', 'Фактури от файл'));
  proveri(
    'изборът на таблица сменя КОИ редове се предлагат',
    await p.$$eval('#zak-red-a option', (e) => e.map((x) => x.textContent).join(' ')),
    'Кауфланд Пощенска Техномаркет Ф-7',
  );

  // ── СЕМЕЙСТВОТО ЖИВЕЕ ТУК, а не при Настройки ──────────────────────────
  // Първият ми опит го сложи в блока на Настройки — а той върви ПРЕДИ този и
  // тогава създадена таблица още няма нито една. Проходът тече по реда на
  // ЕКРАНИТЕ, не по реда на темите (същата бележка стои и при §129).
  await naEkran(p, 'nastroyki', '#litse-hedari');
  // ══ 132 · СЕМЕЙСТВОТО ОТ ГЛАВИ · две таблици стават една (резен 62) ═════
  //
  // Негово (ред 935): „Фактурите и двете са с еднакъв хедър. Така се
  // групират." Двата листа тук НЕ са с еднакъв хедър — единият носи
  // безименна колона, а „Ставка" се казва „АКТ Ставка". Еднаквостта се ПРАВИ.
  // ТРЕТИЯТ бутон СЕ СВИ В ГРУПАТА (ADR-057) — с два лица нищо не се свиваше,
  // с три вече да. Затова се натиска ПРЕЗ групата, точно както го прави човек:
  // отваря стрелкичката, избира по думата, чак тогава натиска.
  await deystvieSPrerisuvane(p, () => natisni(p, '#litse-semeystva'));
  await p.waitForSelector('[data-sektsiya=semeystva]');
  proveri('третото лице на Редактора се отваря', (await p.$$('#forma-semeystvo')).length, 1);

  const chislo = async (kakvo: string): Promise<number> =>
    Number(await p.$eval('#sverka-semeystvo', (e, k) =>
      (e as HTMLElement).dataset[k as string] ?? '-1', kakvo));

  proveri('еднаквите по име се хващат САМИ · и през интервала накрая', await chislo('ednakvi'), 4);
  proveri('останалото е „само тук" от двете страни · по едно', await chislo('samoA'), 1);
  proveri('и по едно от другата', await chislo('samoB'), 1);
  proveri('без нито една двойка общата глава е СБОРЪТ на различията', await chislo('obshti'), 7);

  proveri(
    'различната дума за едно и също се ПРЕДЛАГА, не се решава',
    (await p.$$eval('[data-tablitsa=predlozheni-dvoyki] .red.opis', (e) =>
      e.map((x) => x.textContent ?? '').join(' '))).includes('АКТ Ставка'),
    true,
  );
  // ПЛЕЙСХОЛДЪРЪТ „Колона 2" стои в общата глава, но НЕ се е слял с нищо:
  // той е наше име по номер, не негова дума.
  proveri(
    'безименната колона стои в общата глава със своето временно име',
    (await p.$$eval('[data-tablitsa=obshtata-glava] .red.opis', (e) =>
      e.map((x) => x.textContent ?? '').join(' '))).includes('Колона 2'),
    true,
  );

  // ПО КЛЮЧ, не „първата отметка": ключът е „своя колона | своя колона".
  // ПЪРВА е „Втори обект" — таблиците идват ПОДРЕДЕНИ по име, а „В" е преди
  // „Ф". Тоест „АКТ Ставка" (№6 там) към „Ставка" (№5 във „Фактури от файл").
  await deystvieSPrerisuvane(p, () => p.click('[data-dvoyka="5|4"]'));
  proveri('потвърдената двойка сваля общата глава с ЕДНО', await chislo('obshti'), 6);

  await p.fill('#ime-semeystvo', 'Фактурите');
  await sSabitie(p, () => p.click('#forma-semeystvo button[type=submit]'));
  proveri(
    'записаното семейство се вижда с двете си таблици',
    ((await p.textContent('[data-tablitsa=semeystvata]')) ?? '').includes('Втори обект'),
    true,
  );

  // РАЗПУСКАНЕТО е ЗАПИС, не триене · Журналът расте, редът си отива от списъка
  await sSabitie(p, () => p.click('[data-razpusni="Фактурите"]'));
  proveri(
    'разпуснатото си отива от списъка · но е ЗАПИС, не триене',
    (await p.$$('[data-semeystvo="Фактурите"]')).length,
    0,
  );
}
