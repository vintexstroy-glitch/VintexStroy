import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OTKRIVASHTOTO, broySabitiya, deystvieSPrerisuvane, dobaviImot, dobaviNaem, naEkran, natisni, plochka, redove, sSabitie, sSabitiya, tekstNa, vlezOtnovo } from '../yadro/pomoshtni.ts';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { tishina } from '../yadro/tishina.ts';

/** 8 · презареждане | 9 · верига | 10 · износ | 10б · внасяне | 11 · тесен екран */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '8 · презареждане';
    await p.reload();
    // Паметта на екрана (ADR-022) връща ПОСЛЕДНИЯ гледан екран, не Имоти —
    // проходът се прибира там изрично, както би направил и човек.
    await p.waitForSelector('.nav');
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('събитията оцеляха', await broySabitiya(p), 12 + OTKRIVASHTOTO);
    proveri('месечният наем оцеля', await plochka(p, 'Месечен наем'), '2 000,00 €');
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));
    proveri('ДДС оцеля', await plochka(p, 'ДДС за внасяне'), '200,00 €');

    // ══ 9 · веригата ═════════════════════════════════════════════════════
    razdel = '9 · верига';
    await natisni(p, '#proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Веригата е'));
    // Един бутон, ДВА отговора (ADR-055): „цяла ли е моята верига" и
    // „съгласни ли са веригите помежду си". Тук книгата е с един писач, тъй
    // че вторият е нулевата сверка — и нулата ПАК се казва (правило 7).
    proveri('веригата е цяла, 13 звена', await tekstNa(p, '.vest'),
      `Веригата е цяла · ${12 + OTKRIVASHTOTO} от ${12 + OTKRIVASHTOTO} звена. ` +
      'Сверката на единствената верига: нула сблъсъка.');
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 10 · износ ═══════════════════════════════════════════════════════
    razdel = '10 · износ';
    const [svaleno] = await Promise.all([p.waitForEvent('download'), natisni(p, '#iznesi')]);
    const patyat = await svaleno.path();
    const izneseni = JSON.parse(await readFile(patyat, 'utf8'));
    proveri('изнесени 12 събития + откриващото', izneseni.length, 12 + OTKRIVASHTOTO);
    // ПЪРВОТО В ИЗНОСА Е СТОПАНИНЪТ · законът пътува с файла, не само с базата.
    proveri('и първото в износа е Стопанинът', izneseni[0].type, 'СтопанинЗаписан');
    proveri('всяко носи hash и prevHash', izneseni.every((x: any) => x.hash && x.prevHash !== undefined), true);

    proveri('лентата помни износа', (await tekstNa(p, '.veriga')).includes('Изнесен днес'), true);

    // ══ 10б · внасяне · връщането на изнесеното ══════════════════════════
    razdel = '10б · внасяне';
    await p.setInputFiles('#fayl', patyat);
    await p.waitForFunction(() => document.body.innerText.includes('Файлът вече е тук'));
    proveri('същият файл не добавя нищо', await broySabitiya(p), 12 + OTKRIVASHTOTO);

    // подправен файл — отказва се изцяло
    const podpraven = `${patyat}.podpraven.json`;
    const redica = JSON.parse(await readFile(patyat, 'utf8'));
    redica[3] = { ...redica[3], payload: { ...redica[3].payload, naem_st: 999_99 } };
    await writeFile(podpraven, JSON.stringify(redica));

    await p.setInputFiles('#fayl', podpraven);
    await p.waitForFunction(() => document.body.innerText.includes('Внасянето е отказано'));
    const otkaz = await tekstNa(p, '.vest');
    proveri('казва къде се къса', otkaz.includes('се къса на seq 4'), true);
    proveri('казва, че нищо не е внесено', otkaz.includes('Нищо не е внесено'), true);
    proveri('Журналът не е пипнат', await broySabitiya(p), 12 + OTKRIVASHTOTO);

    // файл, който изобщо не е Журнал
    const bokluk = `${patyat}.boklu.json`;
    await writeFile(bokluk, '{"каквото и да е": 1}');
    await p.setInputFiles('#fayl', bokluk);
    await p.waitForFunction(() => document.body.innerText.includes('не е редица от събития'));
    proveri('и след боклук Журналът е цял', await broySabitiya(p), 12 + OTKRIVASHTOTO);

    // ══ 11 · тесен екран ═════════════════════════════════════════════════
    razdel = '11 · тесен екран';
    await p.setViewportSize({ width: 390, height: 844 });
    for (const [koy, znak] of [['imoti', '#forma-imot'], ['pari', '#forma-nachisli'], ['smetki', '#forma-period']] as const) {
      await naEkran(p, koy, znak);
      /**
       * КАЗВА КОЙ ПРЕЛИВА, не само че прелива.
       *
       * Дотук връщаше `true` и толкова — а после половин час се гадае кой
       * елемент е виновен. Проверка, която знае отговора и го премълчава, е
       * по-скъпа от липсваща: тя спира работата, без да я насочи.
       */
      const izliza = await p.evaluate(() => {
        const koren = document.documentElement;
        // МЯРКАТА си остава същата: скролва ли САМИЯТ документ. Широка таблица
        // в свой скролер не е вина — тя нарочно се дърпа настрани.
        if (koren.scrollWidth <= koren.clientWidth + 1) return 'нищо';
        // Пада ли — казва КОЙ, вместо да остави гадаене. Търси се последният
        // прародител, който НЕ скролва: той е онзи, който бута документа.
        const vinovni = [];
        for (const e of koren.querySelectorAll('*')) {
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.right <= koren.clientWidth + 1) continue;
          let vRoditel = false;
          for (let g = e.parentElement; g && g !== koren; g = g.parentElement) {
            if (getComputedStyle(g).overflowX !== 'visible') { vRoditel = true; break; }
          }
          if (!vRoditel) {
            vinovni.push(`${e.tagName.toLowerCase()}.${(e.className || '-').toString().split(' ')[0]}`);
          }
        }
        return [...new Set(vinovni)].slice(0, 4).join(' · ') || 'документът скролва, но виновник не се намери';
      });
      proveri(`${koy}: нищо не излиза встрани`, izliza, 'нищо');
    }
    await p.setViewportSize({ width: 1280, height: 900 });

    // ══ 11б · поправка, прекратяване, вратарят на сторното ═══════════════
}

/** 11г · източници | 12 · скъсана верига | 13 · хранилище и котва | 14 · справка, архив, филтри */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '11г · източници';
    const GLAVA = 'Доставчик;За какво;Сума;Дата;Документ';
    const parviCSV = join(tmpdir(), 'razhodi-fevruari.csv');
    await writeFile(
      parviCSV,
      [GLAVA, 'Бетон ЕООД;бетон;900,00;10.02.2026;5001', 'Кран ООД;кран;300,00;12.02.2026;5002'].join('\n'),
    );

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    proveri('менюто се отваря с първия бутон', (await p.$$('[data-buton]')).length, 1);

    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', parviCSV);
    await p.waitForSelector('#prilozhi');
    proveri('казва, че е първо четене', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Прочетено'), true);
    proveri('показва отпечатъка на файла', (await tekstNa(p, '.karta.izbrana .dyalglava span')).includes('отпечатък'), true);
    const razlikiPredi = await redove(p, '.red.razlika');
    proveri('два нови реда', razlikiPredi.length, 2);
    proveri('първият е нов', razlikiPredi[0]?.[0], 'нов');

    // +2 записа И +1 СверкаЗаписана: сверката вече живее в Журнала, не в паметта.
    await sSabitiya(p, 3, () => p.click('#prilozhi'));
    proveri('двайсет и две събития', await broySabitiya(p), 22 + OTKRIVASHTOTO);
    proveri('вестта казва, че сверката е ЗАПИСАНА', (await tekstNa(p, '.vest')).includes('ЗАПИСАНА в Журнала'), true);
    proveri('Фактури пораснаха', (await redove(p, '.red.smetka')).find((x) => (x[0] as any).startsWith('Фактури'))?.[3], '1 200,00 €');

    // поправен файл за същия месец: една сума сменена, един ред махнат
    const vtoriCSV = join(tmpdir(), 'razhodi-fevruari-popraven.csv');
    await writeFile(vtoriCSV, [GLAVA, 'Бетон ЕООД;бетон;950,00;10.02.2026;5001'].join('\n'));

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', vtoriCSV);
    await p.waitForSelector('#prilozhi');
    proveri('вече не е първо четене', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Разликите'), true);

    const vidove = (await redove(p, '.red.razlika')).map((x) => x[0]);
    proveri('един поправен и един махнат', vidove.sort().join(','), 'махнат,поправен');
    proveri('филтърът показва само промените', (await redove(p, '.red.razlika')).length, 2);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar=vsichko]'));
    proveri('филтърът „всичко" пак дава два', (await redove(p, '.red.razlika')).length, 2);

    await sSabitiya(p, 4, () => p.click('#prilozhi'));
    proveri('двайсет и шест събития', await broySabitiya(p), 26 + OTKRIVASHTOTO);
    proveri(
      'Фактури казват това, което казва новият файл',
      (await redove(p, '.red.smetka')).find((x) => (x[0] as any).startsWith('Фактури'))?.[3],
      '950,00 €',
    );
    proveri('веригата пак ще е цяла — сторно, не презапис', (await tekstNa(p, '.vest')).includes('сторнирани'), true);

    // ══ 12 · скъсана верига → спирателен кран ════════════════════════════
    razdel = '12 · скъсана верига';
    const podmenen = await p.evaluate(async () => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      return await new Promise((da, ne) => {
        const t = (db as any).transaction('sabitiya', 'readwrite');
        const s = t.objectStore('sabitiya');
        const z = s.getAll();
        z.onsuccess = () => {
          const vsichki = z.result.sort((a: any, b: any) => a.seq - b.seq);
          const zhertva = vsichki[3];
          // Подменяме СЪДЪРЖАНИЕТО, без да пипаме hash — точно това е фалшификатът.
          zhertva.payload = { ...zhertva.payload, naem_st: 999_99 };
          const v = s.put(zhertva);
          v.onsuccess = () => da(zhertva.seq);
          v.onerror = () => ne(v.error);
        };
        z.onerror = () => ne(z.error);
      });
    });

    await p.reload();
    await p.waitForSelector('#proveri');
    await natisni(p, '#proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Веригата се къса'));
    const vest = await tekstNa(p, '.vest');
    proveri('посочва точния seq', vest.includes(`seq ${podmenen}`), true);
    proveri('казва, че Вратата е спряна', vest.includes('Вратата е спряна'), true);
    proveri('Журналът не е пипан', await broySabitiya(p), 26 + OTKRIVASHTOTO);

    await naEkran(p, 'imoti', '#forma-imot');
    await p.fill('#imot-adres', 'След инцидента');
    await p.fill('#imot-edinitsa', 'не влиза');
    await p.click('#forma-imot button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-imot')?.textContent !== '');
    proveri('спирателният кран държи записа', (await tekstNa(p, '#greshka-imot')).length > 0, true);
    proveri('нищо ново не влезе', await broySabitiya(p), 26 + OTKRIVASHTOTO);

    // ══ 13 · хранилището и котвата ═══════════════════════════════════════
    razdel = '13 · хранилище и котва';
    const lentata = await tekstNa(p, '.veriga');
    proveri('лентата казва какво е хранилището', /Хранилището|Постоянството/.test(lentata), true);

    // „Изчезват" последните две събития — направо от IndexedDB, както би
    // направил бъг, чистач на място или зла ръка. Веригата на остатъка е
    // ЦЯЛА — само котвата може да усети липсата.
    // Ключът на акаунта вече НЕ е закован: чете се от Таблото, където екранът
    // го казва. Закован тук, той се разминава с приложението тихо — и котвата
    // „не хваща" нищо, защото трие редове, които ги няма.
    await naEkran(p, 'tablo', '.karta');
    const akauntNaEkrana = await p.$$eval('.plochka', (r) => {
      const n = r.find((x) => x.children[0]?.textContent?.includes('Кой Журнал'));
      return n ? (n.children[1] as any).textContent.trim() : '';
    });
    proveri('Таблото казва под кой ключ работи', akauntNaEkrana, 'vintexstroy@gmail.com');
    await naEkran(p, 'imoti', '#forma-imot');

    await p.evaluate(async ({ akaunt, posledniyat }) => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      await new Promise((da, ne) => {
        const t = (db as any).transaction('sabitiya', 'readwrite');
        const hr = t.objectStore('sabitiya');
        hr.delete([akaunt, posledniyat - 1]);
        hr.delete([akaunt, posledniyat]);
        t.oncomplete = () => da(undefined);
        t.onerror = () => ne(t.error);
      });
      (db as any).close();
    }, { akaunt: akauntNaEkrana, posledniyat: 26 + OTKRIVASHTOTO });

    await p.reload();
    await p.waitForSelector('.vest.zle');
    const trevoga = await tekstNa(p, '.vest.zle');
    proveri('котвата хваща скъсяването отзад', trevoga.includes('скъсяван отзад'), true);
    proveri('казва колко липсват', trevoga.includes('Липсват 2'), true);
    proveri('и че кранът е дръпнат', trevoga.includes('Вратата е спряна'), true);

    await p.waitForSelector('#forma-imot');
    await p.fill('#imot-adres', 'След котвата');
    await p.fill('#imot-edinitsa', 'не влиза');
    await p.click('#forma-imot button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-imot')?.textContent !== '');
    proveri('записът е отказан с думи', (await tekstNa(p, '#greshka-imot')).includes('котвата'), true);
    proveri('Журналът остава на 24', await broySabitiya(p), 24 + OTKRIVASHTOTO);
    // ══ 14 · справката заключва, архивът излиза, филтрите режат ══════════
    razdel = '14 · справка, архив, филтри';
    // Котвата спря Вратата в раздел 13 — за тези проверки се тръгва начисто.
    await p.evaluate(() => {
      indexedDB.deleteDatabase('masterbook');
      localStorage.clear();
    });
    await p.reload();
    // Изтритото хранилище маха и запомнения вход — точно както при истински
    // човек, който си изчисти данните за сайта. Влиза се пак.
    await vlezOtnovo(p);

    await dobaviImot(p, 'Дианабад', 'ОФИС № 3', '');
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Стройпласт ЕООД', suma: '1200,00', sektor: 'naem-targovski', padezh: '5' });
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Домакинство', suma: '400,00', sektor: 'naem-zhilishten', padezh: '5' });

    // фините филтри: сектор „търговски" оставя един ред
    await deystvieSPrerisuvane(p, () => p.click('.glava.naem [data-filtar-glava="naemi:sektor"]'));
    await p.waitForSelector('.filtar-menyu');
    const grupi = await p.$$eval('.otmetka span', (r) => r.map((x) => x.textContent));
    proveri('менюто изброява секторите', grupi.some((g) => g.includes('търговски')), true);
    // По селектор, не по хванат елемент: джобът може да съобщи „нова версия"
    // и да прерисува точно между хващането и щракването — хванатият елемент
    // тогава вече не е закачен. Селекторът се решава в мига на действието.
    await p.check('.otmetka:has-text("търговски") input');
    await p.waitForFunction(() => document.querySelectorAll('.red.naem').length === 1);
    proveri('филтърът остави търговския наем', await p.$$eval('.red.naem', (r) => r.length), 1);
    proveri('и казва колко крие', (await tekstNa(p, '.filtar-skrito')).includes('крие 1'), true);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-izchisti-vsichko="naemi"]'));
    proveri('покажи всичко връща двата', await p.$$eval('.red.naem', (r) => r.length), 2);

    // начисляване и справка → месецът се заключва
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-03');
    await deystvieSPrerisuvane(p, () => p.click('#forma-nachisli button[type=submit]'));

    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-03');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('изчисленото стои в блока', await plochka(p, 'Изчислено в Баланс'), '200,00 €');

    await p.fill('#spravka-data', '2026-04-10');
    await sSabitie(p, () => p.click('#forma-spravka button[type=submit]'));
    proveri('казва, че месецът е заключен', (await tekstNa(p, '.vest')).includes('заключен'), true);

    // заключеният месец отказва разход през формата
    await p.selectOption('#razhod-potok', 'fakturi');
    await p.fill('#razhod-dostavchik', 'Опит ООД');
    await p.fill('#razhod-opis', 'опит');
    await p.fill('#razhod-suma', '100,00');
    await p.fill('#razhod-data', '2026-03-15');
    await p.click('#forma-razhod button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-razhod')?.textContent !== '');
    proveri('формата отказва с думи', (await tekstNa(p, '#greshka-razhod')).includes('заключен'), true);
    // И С НЕГОВИТЕ думи, не с чуждото име на класа. Дотук екранът изброяваше
    // две грешки поименно и падаше на `String(err)` за всяка друга — а
    // отказът на замразен период е точно „всяка друга". Затова човекът
    // виждаше „GreshkaZamrazen: …" залепено пред българското изречение.
    proveri('и БЕЗ латинско име на клас пред изречението',
      /[A-Za-z]{4,}/.test(await tekstNa(p, '#greshka-razhod')), false);

    // внесеното на ръка — на части, разликата свети и после гасне
    await p.fill('#dds-suma', '150,00');
    await p.fill('#dds-data', '2026-04-14');
    await sSabitie(p, () => p.click('#forma-dds-plateno button[type=submit]'));
    proveri('остатъкът свети', await p.evaluate(() => document.body.innerText.includes('остават 50,00')), true);
    await p.fill('#dds-suma', '50,00');
    await p.fill('#dds-data', '2026-04-20');
    await sSabitie(p, () => p.click('#forma-dds-plateno button[type=submit]'));
    proveri('внесено докрай', await p.evaluate(() => document.body.innerText.includes('внесено докрай')), true);

    // архивът за Ексел се сваля и е истински .xlsx (PK отпред)
    const [arhiv] = await Promise.all([p.waitForEvent('download'), natisni(p, '#arhiv')]);
    const arhivPat = await arhiv.path();
    const parviBajtove = new Uint8Array((await readFile(arhivPat)).buffer).slice(0, 2);
    proveri('архивът е ZIP (PK)', String.fromCharCode(...parviBajtove), 'PK');
    proveri('архивът се казва като файл', (await arhiv.suggestedFilename()).endsWith('.xlsx'), true);

    // ══ 15 · таблото · кой съм, планът, отметките ════════════════════════
}

/** 16 · офлайн джобът | 17 · защита от автоматичен превод */
export async function blok3(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '16 · офлайн джобът';

    // Шрифтовете са в пакета, не при Google. Проверява се РЕАЛНО заредено
    // семейство, не само че правилото стои в стила.
    proveri(
      'шрифтовете са наши, не чужди',
      await p.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('600 16px Literata', 'Имоти');
      }),
      true,
    );

    const rabotnikGotov = await p.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'няма поддръжка';
      const zapis = await navigator.serviceWorker.ready;
      return zapis.active ? 'готов' : 'не се активира';
    });
    proveri('служебният работник е активен', rabotnikGotov, 'готов');

    proveri(
      'джобът пази СВОЯ азбучен пакет, не всички',
      await p.evaluate(async () => {
        const imena = (await caches.keys()).filter((i) => i.startsWith('masterbook-'));
        const kesh = await caches.open((imena[0] as any));
        const adresi = (await kesh.keys()).map((z) => z.url);
        const ima = (a: any) => adresi.some((u) => u.includes(`-${a}-`));
        // Пакетът по подразбиране е „bg": латиница и кирилица, нищо друго.
        return `latin:${ima('latin')} cyrillic:${ima('cyrillic')} greek:${ima('greek')}`;
      }),
      'latin:true cyrillic:true greek:false',
    );

    proveri(
      'черупката е в джоба',
      await p.evaluate(async () => {
        const imena = await caches.keys();
        const moi = imena.filter((i) => i.startsWith('masterbook-'));
        if (moi.length !== 1) return `кешове: ${moi.length}`;
        const kesh = await caches.open((moi[0] as any));
        return (await kesh.keys()).length > 0 ? 'да' : 'празен кеш';
      }),
      'да',
    );

    const predi = await broySabitiya(p);

    // ── и сега истината: мрежата се КЪСА ──
    tishina.ochakvana = true;
    await p.context().setOffline(true);
    await p.reload();
    await p.waitForSelector('.nav', { timeout: 15_000 });

    proveri('приложението се отвори БЕЗ мрежа', await p.$$eval('.nav', (n) => n.length), 1);
    proveri('Журналът е непокътнат офлайн', await broySabitiya(p), predi);
    proveri(
      'буква ИЗВЪН старите 187 знака се показва с нашия шрифт',
      await p.evaluate(async () => {
        await document.fonts.ready;
        // „Ѝ" и „Ђ" ги нямаше в подрязания вариант. Сега азбуките са ЦЕЛИ.
        // Две азбуки, но ДВЕ ДУМИ — правило 11 важи и за пробите.
        return document.fonts.check('400 16px "IBM Plex Sans"', 'ЍЂ QW');
      }),
      true,
    );

    proveri(
      'и шрифтовете пак са наши',
      await p.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('600 16px Literata', 'Имоти');
      }),
      true,
    );

    // Работи ли се офлайн, или само се гледа: нов имот трябва да влезе.
    await naEkran(p, 'imoti', '#forma-imot');
    await dobaviImot(p, 'Офлайн', 'без мрежа', '');
    proveri('и се ПИШЕ офлайн', await broySabitiya(p), predi + 1);

    await p.context().setOffline(false);
    tishina.ochakvana = false;

    // ══ 17 · ДАННИТЕ НЕ СЕ ПРЕВЕЖДАТ ══════════════════════════════════════
    razdel = '17 · защита от автоматичен превод';

    // Браузърният превод не различава етикет от съдържание. Пуснат върху
    // счетоводна книга, той би преформулирал имена на фирми, бележки към
    // сторно и документи. Затова редовете с данни и полетата са защитени,
    // а колонните ГЛАВИ остават преводими — те са етикети и помагат.
    await naEkran(p, 'imoti', '#forma-imot');

    proveri(
      'всеки ред с данни е защитен',
      await p.evaluate(() => {
        const redove = [...document.querySelectorAll('.red')];
        // Редът на плановете в Таблото е етикет, не данни — той се превежда.
        const sDanni = redove.filter((r) => !r.classList.contains('planred'));
        const nezashtiteni = sDanni.filter((r) => r.getAttribute('translate') !== 'no');
        return sDanni.length > 0 && nezashtiteni.length === 0
          ? 'всички'
          : `незащитени: ${nezashtiteni.length} от ${sDanni.length}`;
      }),
      'всички',
    );

    proveri(
      'колонните глави ОСТАВАТ преводими',
      await p.evaluate(() =>
        [...document.querySelectorAll('.glava')].every((g) => g.getAttribute('translate') !== 'no'),
      ),
      true,
    );

    proveri(
      'полетата за въвеждане са защитени',
      await p.evaluate(() => {
        const poleta = [...document.querySelectorAll('input:not([type=checkbox]), select')];
        const goli = poleta.filter((e) => e.getAttribute('translate') !== 'no');
        return poleta.length > 0 && goli.length === 0 ? 'всички' : `голи: ${goli.length}`;
      }),
      'всички',
    );

    proveri(
      'числата в блоковете са защитени — те са суми',
      await p.evaluate(() =>
        [...document.querySelectorAll('.chislo')].every((c) => c.getAttribute('translate') === 'no'),
      ),
      true,
    );

    // ══ 18 · четецът, който НАУЧАВА модела ═══════════════════════════════
}

/** 17б · защитата от превод · всички екрани */
export async function blok4(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '17б · защитата от превод · всички екрани';
    for (const [ekran, znak] of [
      ['imoti', '#forma-imot'],
      ['pari', '#forma-nachisli'],
      ['smetki', '#razhod-dostavchik'],
      ['gant', '#d-forma-delo'],
      ['stoynost', '#cheti-ploshti'],
      ['tabove', '#izbor-tab'],
      ['nastroyki', '#nov-buton'],
      ['ii', '#nov-agent'],
      ['tablo', '#tablo-lichno'],
    ] as const) {
      await naEkran(p, ekran, znak);
      proveri(`екран „${ekran}" · полетата са защитени`,
        await p.evaluate(() => {
          const poleta = [...document.querySelectorAll('input:not([type=checkbox]), select')];
          const goli = poleta.filter((e) => e.getAttribute('translate') !== 'no');
          return poleta.length > 0 ? (goli.length === 0 ? 'всички' : `голи: ${goli.map((e) => e.id || (e as any).name).join(' · ')}`) : 'няма полета';
        }),
        'всички');
    }

    // ══ 67 · МНОГОТО ВЕРИГИ · вторият писач в ЕДНА книга (ADR-055) ══════════
    //
    // Тук се симулира онова, което резен 6 ще донесе от Драйва: файлът на ДРУГ
    // писач ляга до моя, под свой ключ `книга#pero:имейл`. Проверява се, че:
    //   · екранът показва СГЪНАТАТА книга, не само моята половина — това е
    //     дупката, която не хвърля и затова е най-опасната;
    //   · МОЯТА верига остава цяла — чуждата не участва в нейната проверка;
    //   · Таблото КАЗВА в коя верига се пише.
}

/**
 * 134 · ПЛЪТНОСТТА НА ЕКРАНА · брои се, не се оценява (резен 64).
 *
 * Негова дума, 31.08: „Искам да е ЖИВ… с ПО-МАЛКИ И СКРИТИ бутони. Пак има
 * ПРАЗНИ ПРОСТРАНСТВА неизползвани."
 *
 * И двете са мерими, значи се МЕРЯТ (правило 17):
 *
 *   · колко управления стоят видими наведнъж — и колко от тях са СВИТИ в
 *     група (ADR-057). Свитото не се брои за шум;
 *   · колко празно остава ОТДЯСНО — ширината на тялото минус най-широкото,
 *     което го запълва.
 *
 * Праговете са ХРАПОВИ: днешното число, което може само да пада. Число, което
 * може да расте, не е праг, а надпис.
 */
export async function blok6(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '134 · плътността на екрана';

    const redove: string[] = [];
    let nayMnogoGoli = 0;
    let nayMnogoPrazno = 0;
    for (const [ekran, znak] of [
      ['imoti', '#forma-imot'],
      ['pari', '#forma-nachisli'],
      ['smetki', '#razhod-dostavchik'],
      ['gant', '#d-forma-delo'],
      ['stoynost', '#cheti-ploshti'],
      ['tabove', '#izbor-tab'],
      ['nastroyki', '#nov-buton'],
      ['ii', '#nov-agent'],
      ['tablo', '#tablo-lichno'],
    ] as const) {
      await naEkran(p, ekran, znak);
      const m = await p.evaluate(() => {
        const vidim = (e: Element): boolean => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const telo = document.querySelector('.telo');
        if (!telo) return { goli: 0, vGrupa: 0, prazno: 0 };
        // БРОИ СЕ ЧЕРУПКАТА, не данните.
        //
        // Първият ми опит броеше ВСИЧКИ бутони под `.telo` и даваше 476 за
        // Ганта — всеки ДЕН от решетката е бутон. Число, което мери данните,
        // не мери претрупаност: то расте с работата на човека.
        //
        // Черупка е онова, което стои в ГЛАВАТА на дял, в реда с ДЕЙСТВИЯ или
        // сред ПОЛЕТАТА на форма. Останалото е съдържание.
        const upravleniya = [...telo.querySelectorAll(
          '.dyalglava button, .dyalglava select, .deystviya button, .deystviya select,' +
          ' .poleta button, .poleta select',
        )]
          .filter(vidim)
          // ЗНАКЪТ ЗА СГЪВАНЕ НЕ СЕ БРОИ · той е управлението, което МАХА
          // черупка, не което я добавя. Броен, той щеше да наказва точно
          // лекарството: всеки нов сгъваем дял вдига числото с едно.
          .filter((b) => !(b as HTMLElement).dataset['sgavane']);
        const shirina = telo.getBoundingClientRect().width;
        let nayShirok = 0;
        for (const v of telo.querySelectorAll('*')) {
          const r = (v as HTMLElement).getBoundingClientRect();
          if (r.height > 0 && r.width > nayShirok && r.width <= shirina + 1) nayShirok = r.width;
        }
        // „В група" вече няма (И124 т.3 · ADR-133): бутоните са самостоятелни
        // по негова дума, значи всяко видимо управление се брои голо.
        return {
          goli: upravleniya.length,
          prazno: Math.round(shirina - nayShirok),
        };
      });
      redove.push(
        `  ${ekran.padEnd(10)} голи ${String(m.goli).padStart(3)} · празно отдясно ${String(m.prazno).padStart(4)}px`,
      );
      if (m.goli > nayMnogoGoli) nayMnogoGoli = m.goli;
      if (m.prazno > nayMnogoPrazno) nayMnogoPrazno = m.prazno;
    }
    console.log(`\n  ПЛЪТНОСТТА НА ЕКРАНА (праг ${PRAG_GOLI} голи · ${PRAG_PRAZNO}px празно)\n${redove.join('\n')}\n`);

    proveri(
      `най-натоварен екран · голи управления под прага ${PRAG_GOLI}`,
      nayMnogoGoli <= PRAG_GOLI ? 'да' : `не · ${nayMnogoGoli}`,
      'да',
    );
    proveri(
      `най-празен екран · неизползвано отдясно под ${PRAG_PRAZNO}px`,
      nayMnogoPrazno <= PRAG_PRAZNO ? 'да' : `не · ${nayMnogoPrazno}px`,
      'да',
    );

    // ── СГЪВАНЕТО НА ДЯЛА · „да е СКРИТО с дребни бутончета" (И101) ────────
    razdel = '134б · дялът се сгъва';
    await naEkran(p, 'smetki', '#forma-period');
    const vidimiPoleta = async (): Promise<number> =>
      p.$$eval('[data-sektsiya=smetki-salda] input, [data-sektsiya=smetki-salda] button:not([data-sgavane])', (e) =>
        e.filter((x) => {
          const r = x.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }).length,
      );
    proveri('всеки дял носи ЕДИН знак за сгъване, не два бутона',
      await p.$$eval('[data-sektsiya=smetki-salda] [data-sgavane]', (e) => e.length), 1);
    proveri('и по подразбиране е РАЗТВОРЕН · нищо не се крие само',
      await p.$eval('[data-sektsiya=smetki-salda] [data-sgavane]', (e) => e.getAttribute('aria-expanded')),
      'true');
    const predSgavane = await vidimiPoleta();
    proveri('дялът показва полетата си', predSgavane > 0, true);

    const predSabitiyaSg = await broySabitiya(p);
    // СГЪВАНЕТО НЕ ПРЕРИСУВА екрана — то е местен превключвател. Затова тук не
    // се чака прерисуване, а самото СЪСТОЯНИЕ: четене веднага след клик е
    // точно това, което обход Е брои (`docs/11`).
    await p.click('[data-sektsiya=smetki-salda] [data-sgavane]');
    await p.waitForSelector('[data-sektsiya=smetki-salda] [data-sgavane][aria-expanded=false]');
    proveri('сгънатият дял не показва НИЩО освен главата си', await vidimiPoleta(), 0);
    proveri('и знакът го КАЗВА на четеца на екран',
      await p.$eval('[data-sektsiya=smetki-salda] [data-sgavane]', (e) => e.getAttribute('aria-expanded')),
      'false');
    proveri('сгъването е ПОГЛЕД · нула събития', await broySabitiya(p), predSabitiyaSg);

    // ПОМНИ СЕ · като всеки друг поглед (ADR-022).
    // ЧАКА СЕ СЕКЦИЯТА, не поле в нея: сгънатият дял НЯМА видимо поле, и
    // чакането щеше да виси трийсет секунди върху собствения си успех.
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'smetki', '[data-sektsiya=smetki-salda]');
    proveri('и остава сгънат след връщане', await vidimiPoleta(), 0);

    // ВСИЧКИ НАВЕДНЪЖ · от Настройки, където той решава кое как работи.
    await naEkran(p, 'nastroyki', '[data-sektsiya=podredbata]');
    // ПРЕЗ ГРУПАТА · трите действия на картата станаха група (ADR-057) и
    // видимо стои само последно избраното. Точно за това е `natisni`.
    await deystvieSPrerisuvane(p, () => natisni(p, '[data-razgani-vsichki="smetki"]'));
    await naEkran(p, 'smetki', '#forma-period');
    proveri('„Разтвори всички" връща дяла разтворен', await vidimiPoleta(), predSgavane);

    // ── ВИСОЧИНАТА СЕ СПАЗВА · на ВСЕКИ екран, не само на Имоти ───────────
    // Неговата т.4 (И124): „височините… са забравени и не са спазени. Намери
    // и ги направи." Дотук §75 мереше САМО `.red.imot` — девет истински
    // <table> таблици и Гантът стояха невидими за мярката, и точно там
    // височината беше декорация. Отсега редът се мери там, където е.
    razdel = '135 · височината се спазва на всеки екран';
    let premereniObshto = 0;
    const schupeniObshto: string[] = [];
    for (const [ekran, znak] of [
      ['imoti', '#forma-imot'],
      ['pari', '#forma-nachisli'],
      ['smetki', '#razhod-dostavchik'],
      ['gant', '#d-forma-delo'],
      ['kontakti', '#forma-kontakt'],
      ['stoynost', '#cheti-ploshti'],
      ['tabove', '#izbor-tab'],
      ['nastroyki', '#nov-buton'],
      ['ii', '#nov-agent'],
      ['tablo', '#tablo-lichno'],
    ] as const) {
      await naEkran(p, ekran, znak);
      const m = await p.evaluate(() => {
        const vidim = (e: Element): boolean => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const schupeni: string[] = [];
        let premereni = 0;
        for (const t of document.querySelectorAll<HTMLElement>('.tablitsa, .gant')) {
          if (!vidim(t)) continue;
          const uslovena = Number.parseFloat(
            getComputedStyle(t).getPropertyValue('--red-visochina'),
          );
          if (!Number.isFinite(uslovena)) {
            schupeni.push(`${t.dataset['tablitsa'] ?? t.className} · без --red-visochina`);
            continue;
          }
          const redove = [
            ...t.querySelectorAll<HTMLElement>('.red, tbody > tr, .gant-delo, .gant-red'),
          ].filter(vidim);
          for (const red of redove) {
            premereni += 1;
            // Височината е МИНИМУМ: съдържание на два реда я разпъва и това е
            // правилно. Счупеното е ред ПОД числото на своята таблица.
            if (red.getBoundingClientRect().height + 1 < uslovena) {
              schupeni.push(
                `${t.dataset['tablitsa'] ?? t.className} · ред ${Math.round(
                  red.getBoundingClientRect().height,
                )}px < ${uslovena}px`,
              );
            }
          }
        }
        return { premereni, schupeni };
      });
      premereniObshto += m.premereni;
      schupeniObshto.push(...m.schupeni.map((s) => `${ekran}: ${s}`));
    }
    console.log(`\n  ВИСОЧИНАТА ПО ЕКРАНИТЕ: ${premereniObshto} премерени реда\n`);
    proveri('има какво да се мери · редове по десетте екрана', premereniObshto > 100, true);
    proveri(
      'нито един ред под височината на своята таблица',
      schupeniObshto.length === 0 ? 'да' : schupeniObshto.slice(0, 5).join(' · '),
      'да',
    );

    // ── ГАНТЪТ · „Редовете в таблицата и колоната са едно" (И104) ──────────
    razdel = '135б · Гантът · редовете са едно';
    await naEkran(p, 'gant', '#d-forma-delo');
    const dvete = await p.evaluate(() => ({
      delo: Math.round(document.querySelector('.gant-delo')!.getBoundingClientRect().height),
      red: Math.round(document.querySelector('.gant-red:not(.prazen):not(.sumi)')!.getBoundingClientRect().height),
    }));
    // 26 е ЗАКОВАНО С РЪКА: подразбраното на Ганта, същото в `stil.css` и в
    // `gant-diagrama.ts`. Смени ли се едното, тази проверка го казва.
    proveri('редът на имената е подразбраните 26px', dvete.delo, 26);
    proveri('редът на времето е СЪЩОТО число', dvete.red, dvete.delo);

    const gantLost = '.gastotata[data-za="gant-redove"]';
    proveri('Гантът има лост за височината · един бутон',
      await p.$$eval(gantLost, (b) => b.length), 1);
    // 26 е най-близо до сбито · кръгът до широко е две натискания.
    proveri('и лостът казва сбито', await p.$eval(gantLost, (e) => (e as HTMLElement).dataset['gastota']), 'sbito');
    await p.click(gantLost);
    await p.waitForSelector(`${gantLost}[data-gastota="sredno"]`);
    await p.click(gantLost);
    await p.waitForSelector(`${gantLost}[data-gastota="shiroko"]`);
    const shiroko = await p.evaluate(() => ({
      delo: Math.round(document.querySelector('.gant-delo')!.getBoundingClientRect().height),
      red: Math.round(document.querySelector('.gant-red:not(.prazen):not(.sumi)')!.getBoundingClientRect().height),
    }));
    proveri('широкото вдига реда на имената', shiroko.delo > dvete.delo, true);
    proveri('и МЕСТИ и колоната на времето · двете са едно', shiroko.red, shiroko.delo);

    // Диаграмата (SVG) смята координати при рисуване — изравнява се при
    // следващото, не по средата на влаченето. Отиване и връщане Е рисуване.
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'gant', '#d-forma-delo');
    const svg = await p.evaluate(() => {
      const lenta = document.querySelector('.diagrama-red:not(.poddelo) rect.diagrama-lenta');
      return lenta === null ? -1 : Math.round(Number.parseFloat(lenta.getAttribute('height') ?? '0'));
    });
    // Лентата е редът минус 8 (по 4 въздух отгоре и отдолу).
    proveri('диаграмата рисува същата височина след прерисуване', svg, 68 - 8);

    // Чистене: гъстотата на Ганта се връща на подразбраната, за да не
    // подпира следващите раздели на чуждо число.
    await p.evaluate(() => localStorage.removeItem('ui.v1.red.visochina.gant-redove'));
    await naEkran(p, 'imoti', '#forma-imot');
    await naEkran(p, 'gant', '#d-forma-delo');
    proveri('връщането на подразбраното връща 26',
      await p.$eval('.gant-delo', (e) => Math.round(e.getBoundingClientRect().height)), 26);

    // ── ВЛАЧЕНЕТО ПО РЪБА · и при истинска <table> ─────────────────────────
    razdel = '135в · влаченето по ръба стига и до <table>';
    // „Местата" е истинска <table> с <tr> — дотук ръбът ѝ беше глух: нито
    // височината я стигаше, нито влаченето. Мери се С РЪКА, не с клик.
    // Редът първо се ДОВЛИЧА в средата на екрана: мишката работи с видими
    // координати, а под сгъвката „r.bottom − 2" сочи извън прозореца.
    const redNaMyasto = await p.$eval('[data-tablitsa=mestata] tbody tr', (e) => {
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.bottom - 2, visok: Math.round(r.height) };
    });
    await p.mouse.move(redNaMyasto.x, redNaMyasto.y);
    await p.mouse.down();
    await p.mouse.move(redNaMyasto.x, redNaMyasto.y + 24, { steps: 6 });
    await p.mouse.up();
    proveri('дърпането надолу вдига реда на истинската <table>',
      await p.$eval('[data-tablitsa=mestata] tbody tr',
        (e) => Math.round(e.getBoundingClientRect().height)) > redNaMyasto.visok, true);
    // И тук се чисти след мярката.
    await p.evaluate(() => localStorage.removeItem('ui.v1.red.visochina.mestata'));
    await naEkran(p, 'imoti', '#forma-imot');
}

/**
 * ХРАПОВИТЕ ПРАГОВЕ · днешните числа, които могат само да ПАДАТ.
 *
 * Вдигане на праг е решение, не поправка: то се вижда в диф-а и иска дума.
 */
const PRAG_GOLI = 78;
const PRAG_PRAZNO = 40;

/** 48 · джобът накрая */
export async function blok5(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '48 · джобът накрая';
    proveri('нито един екран не е довлякъл чужда азбука',
      await p.evaluate(async () => {
        const imena = (await caches.keys()).filter((i) => i.startsWith('masterbook-'));
        const adresi: string[] = [];
        for (const ime of imena) {
          const kesh = await caches.open(ime);
          adresi.push(...(await kesh.keys()).map((z) => z.url));
        }
        const ima = (a: any) => adresi.some((u) => u.includes(`-${a}-`));
        return `greek:${ima('greek')} vietnamese:${ima('vietnamese')}`;
      }),
      'greek:false vietnamese:false');
}
