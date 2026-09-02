import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { broySabitiya, denOtDnes, deystvieSPrerisuvane, naEkran, natisni, sSabitie, zapishiDelo } from '../yadro/pomoshtni.ts';

/** 42 · табовете и секциите | 43 · адресната книга */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '42 · табовете и секциите';
    await naEkran(p, 'tabove', '#izbor-tab');

    // СТАЦИОНАРЕН · допълва Сметки с още една секция, без да пипа истинския екран
    await p.selectOption('#izbor-tab', 'smetki');
    await p.waitForSelector('#nova-sektsiya');
    await deystvieSPrerisuvane(p, () => p.click('#nova-sektsiya'));
    await p.fill('#sektsiya-ime', 'Обектите');
    await p.selectOption('#sektsiya-vid', 'tablitsa');
    await p.selectOption('#sektsiya-iztochnik', 'imoti');
    await sSabitie(p, () => p.click('#forma-sektsiya button[type=submit]'));
    await p.waitForSelector('.karta:has-text("Обектите")');
    proveri('секцията се вижда с истински данни (45-те от Малинова Долина)',
      (await p.evaluate(() => document.body.textContent)).includes('Малинова Долина'), true);

    // ВТОРА секция, свързваема — за да пробваме „изборът стеснява"
    await deystvieSPrerisuvane(p, () => p.click('#nova-sektsiya'));
    await p.fill('#sektsiya-ime', 'Наемите');
    await p.selectOption('#sektsiya-vid', 'tablitsa');
    await p.selectOption('#sektsiya-iztochnik', 'naemi');
    await sSabitie(p, () => p.click('#forma-sektsiya button[type=submit]'));
    await p.waitForSelector('.karta:has-text("Наемите")');

    // СВЪРЗВАНЕТО · падащо меню, не текст — „по кое" пита само носителите
    await deystvieSPrerisuvane(p, () =>
      natisni(p, '.karta:has-text("Наемите") [data-sektsiya-svarzhi]'));
    await p.waitForSelector('#forma-svarzhi');
    await p.selectOption('#forma-svarzhi [name=po]', 'imot');
    await p.selectOption('#forma-svarzhi [name=izvor]', { label: 'Обектите' });
    await sSabitie(p, () => p.click('#forma-svarzhi button[type=submit]'));
    await p.waitForFunction(() =>
      document.body.textContent.includes('стеснена от „Обектите"'));

    // РЪЧЕН КРЪГ не се позволява — форма опитва да върже „Обектите" обратно
    // към себе си през „Наемите" не се тества оттук (домейнът го пази с
    // тест); тук се пази ПОЛЗВАНЕТО: изборът реално стеснява.
    const naemiVSektsiyaPredi = await p.$$eval('.karta:has-text("Наемите") [data-sektsiya-red]',
      (r) => r.length);
    await deystvieSPrerisuvane(p, () =>
      p.click('.karta:has-text("Обектите") [data-sektsiya-red]'));
    const naemiVSektsiyaSled = await p.$$eval('.karta:has-text("Наемите") [data-sektsiya-red]',
      (r) => r.length);
    proveri('изборът в изворната секция СТЕСНЯВА вързаната',
      naemiVSektsiyaSled <= naemiVSektsiyaPredi, true);
    proveri('и се вижда че е стеснено', (await p.evaluate(() => document.body.textContent))
      .includes('стеснено от избрания ред'), true);

    // повторен клик на СЪЩИЯ ред разчиства избора
    await deystvieSPrerisuvane(p, () =>
      p.click('.karta:has-text("Обектите") [data-sektsiya-red].izbrana'));
    const naemiVSektsiyaBezIzbor = await p.$$eval('.karta:has-text("Наемите") [data-sektsiya-red]',
      (r) => r.length);
    proveri('повторният клик разчиства избора', naemiVSektsiyaBezIzbor, naemiVSektsiyaPredi);

    // ДОБАВЕН ТАБ · изцяло негов, с графика
    await deystvieSPrerisuvane(p, () => p.click('#nov-tab'));
    await p.fill('#tab-ime', 'Малинова Долина преглед');
    const predTab = await broySabitiya(p);
    await sSabitie(p, () => p.click('#forma-tab button[type=submit]'));
    proveri('новият таб е събитие в Журнала', await broySabitiya(p), predTab + 1);

    await deystvieSPrerisuvane(p, () => p.click('#nova-sektsiya'));
    await p.fill('#sektsiya-ime', 'Приход и разход');
    await p.selectOption('#sektsiya-vid', 'diagrama');
    await p.waitForFunction(() =>
      !(document.querySelector('[data-grupa="diagrama"]') as any)?.hidden);
    await p.selectOption('#sektsiya-iztochnik', 'mesetsi');
    await sSabitie(p, () => p.click('#forma-sektsiya button[type=submit]'));
    proveri('графичната секция носи истинска диаграма',
      await p.$$eval('svg.stalbove', (r) => r.length), 1);

    // МАХАНЕ · връзката пада с нея, а другата секция остава
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-tab', 'smetki'));
    const predMahane = await broySabitiya(p);
    await sSabitie(p, () =>
      natisni(p, '.karta:has-text("Обектите") [data-sektsiya-mahni]'));
    proveri('и махането е събитие', await broySabitiya(p), predMahane + 1);
    proveri('другата секция остава', Boolean(await p.$('.karta:has-text("Наемите")')), true);
    proveri('и вече не е стеснена — връзката падна с махнатата',
      (await p.evaluate(() => document.body.textContent)).includes('стеснена от „Обектите"'), false);

    // ══ 43 · адресната книга (И94 т.2) и копието с форма (И95) ═══════════════
    razdel = '43 · адресната книга';

    // книгата стои на екрана Табове: вградените с номера 1·2·3, моделите с поле
    proveri('адресната книга се вижда',
      (await p.evaluate(() => document.body.textContent)).includes('Адресната книга'), true);
    proveri('вградените носят закованите номера',
      await p.$$eval('[data-tablitsa="adresna-kniga"] .red', (r) =>
        r.some((x) => x.textContent.includes('Дела') && x.textContent.includes('Имотът'))), true);

    // на моделна колона се дава номер · записът е събитие
    const imaModelniKoloni = await p.$$eval('[data-nomer-vhod]', (r) => r.length);
    proveri('моделните колони имат поле за номер', imaModelniKoloni > 0, true);
    const parvoPoleZaNomer = await p.$eval('[data-nomer-vhod]', (e) => e.dataset.nomerVhod);
    await p.fill(`[data-nomer-vhod="${parvoPoleZaNomer}"]`, '100');
    const predNomer = await broySabitiya(p);
    await sSabitie(p, () => p.click(`[data-zapishi-nomer="${parvoPoleZaNomer}"]`));
    proveri('номерът е ново събитие МоделЗаписан', await broySabitiya(p), predNomer + 1);
    proveri('и връзката с един край се КАЗВА',
      (await p.evaluate(() => document.body.textContent)).includes('с ЕДИН край'), true);

    // измислен номер в запазената зона се отказва с думи, нищо не влиза
    await p.fill(`[data-nomer-vhod="${parvoPoleZaNomer}"]`, '7');
    const predLosh = await broySabitiya(p);
    await p.click(`[data-zapishi-nomer="${parvoPoleZaNomer}"]`);
    await p.waitForFunction(() => document.body.textContent.includes('запазени за вградените'));
    proveri('запазената зона се пази', await broySabitiya(p), predLosh);

    // И95 · копието в Сметки: формата за дело Е там, и цифрите носят ключ
    await naEkran(p, 'smetki', '#forma-period');
    proveri('в Сметки може да се СЪЗДАВА — формата от Управление е там',
      Boolean(await p.$('#d-forma-delo')), true);
    proveri('и редът Приходи·Разходи се вижда',
      await p.$$eval('.gant-red.sumi', (r) => r.length), 1);
    const predKlyuch = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#klyuch-tsifrite'));
    proveri('ключът СКРИВА цифрите — екранът, не сметката',
      await p.$$eval('.gant-red.sumi', (r) => r.length), 0);
    proveri('и скриването не пише в Журнала', await broySabitiya(p), predKlyuch);
    await deystvieSPrerisuvane(p, () => p.click('#klyuch-tsifrite'));
    proveri('и се връща', await p.$$eval('.gant-red.sumi', (r) => r.length), 1);

    // създаването от Сметки е СЪЩИЯТ запис като от Управление
    const predDelo = await broySabitiya(p);
    await zapishiDelo(p, {
      myasto: 'Малинова Долина', obekt: '', ime: 'Проба от Сметки',
      otgovornik: 'Иво', ot: denOtDnes(0), do: denOtDnes(3), otsenka: 'важно-неспешно',
    });
    proveri('делото от Сметки влиза в Журнала', await broySabitiya(p), predDelo + 1);
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('и Управление го вижда — един механизъм, два екрана',
      (await p.evaluate(() => document.body.textContent)).includes('Проба от Сметки'), true);

    // ══ 127 · МНОГО-КЪМ-МНОГО · закачки между редове (резен 56 · M17) ════════
    razdel = '127 · закачки между редове';

    await naEkran(p, 'tabove', '#izbor-tab');
    proveri('секцията стои под Адресната книга',
      Boolean(await p.$('[data-sektsiya="tabove-zakachki"]')), true);

    // ДЕЛО ↔ ИМОТ: и двата вида имат редове дотук — делата ги създаде §43.
    await deystvieSPrerisuvane(p, () => p.selectOption('#zak-vid-a', 'delo'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#zak-vid-b', 'imot'));
    proveri('менюто помни избора си',
      await p.$eval('#zak-vid-a', (e) => (e as HTMLSelectElement).value), 'delo');

    await p.fill('#zak-zashto', 'делото е за този имот');
    const predZakachka = await broySabitiya(p);
    await sSabitie(p, () => p.click('#zak-zakachi'));
    proveri('закачането е СЪБИТИЕ', await broySabitiya(p), predZakachka + 1);
    proveri('двойката се вижда в таблицата',
      await p.$$eval('[data-tablitsa="zakachki"] [data-zakachka]', (r) => r.length), 1);
    proveri('и се КАЗВА за какво е закачен избраният ред',
      (await p.$eval('#zakacheno-za', (e) => e.textContent)).includes('Обект'), true);
    proveri('сверката брои живата и не намира висяща',
      (await p.$eval('#sverka-zakachki', (e) => e.textContent)).includes('висящи: 0'), true);

    // РАЗКАЧАНЕТО е ЗАПИС, не триене — Журналът расте, картата се смалява.
    const predRazkachka = await broySabitiya(p);
    await sSabitie(p, () => p.click('[data-razkachi]'));
    proveri('разкачането също е СЪБИТИЕ', await broySabitiya(p), predRazkachka + 1);
    proveri('и двойката си отива от КАРТАТА',
      await p.$$eval('[data-tablitsa="zakachki"] [data-zakachka]', (r) => r.length), 0);
    proveri('а екранът го казва с думи',
      (await p.evaluate(() => document.body.textContent)).includes('Няма нито една закачка'), true);

    // ══ 44 · непроменимият протокол и картата (И94 т.6) ══════════════════════
}
