/**
 * ПРОХОД ПРЕЗ БРАУЗЪРА — целият път, в истински Chromium.
 *
 * Не проверява какво връща кодът, а какво ПИШЕ НА ЕКРАНА. Затова всяко
 * очакване е низ, както го чете човек: „1200,00", не 120000.
 *
 * Пуска се с `npm run proba`. Пада с ненулев код и изброява всяко разминаване.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as pochakay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HROM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env['PROBA_PORT'] ?? 4178);
const ADRES = `http://localhost:${PORT}/`;

const nahodki = [];
const minali = [];
let razdel = '—';

function proveri(kakvo, vidyano, ochakvano) {
  const naredE = String(vidyano) === String(ochakvano);
  if (naredE) minali.push(`${razdel} · ${kakvo}`);
  else nahodki.push({ razdel, kakvo, vidyano: String(vidyano), ochakvano: String(ochakvano) });
  return naredE;
}

function pusniServer() {
  const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  });
  p.unref();
  return p;
}

async function pochakaySurvara() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const otgovor = await fetch(ADRES);
      if (otgovor.ok) return;
    } catch {
      /* още не е вдигнат */
    }
    await pochakay(250);
  }
  throw new Error(`Сървърът на ${ADRES} не тръгна.`);
}

// ── дребни помощници над страницата ────────────────────────────────────────
const tekstNa = (p, izbor) => p.$eval(izbor, (e) => e.innerText.replace(/\s+/g, ' ').trim());
const redove = (p, izbor) =>
  p.$$eval(izbor, (r) => r.map((x) => [...x.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim())));

async function plochka(p, etiket) {
  const vsichki = await p.$$eval('.plochka', (r) =>
    r.map((x) => [...x.children].map((c) => c.innerText.trim())),
  );
  const namerena = vsichki.find((x) => x[0]?.toUpperCase().includes(etiket.toUpperCase()));
  return namerena ? namerena[1] : `НЯМА ПЛОЧКА „${etiket}"`;
}

async function broySabitiya(p) {
  return Number(await p.$eval('[data-broi]', (e) => e.dataset.broi));
}

/**
 * Смяна на екран. Прерисуването е асинхронно и сменя целия DOM — ако се пише
 * веднага след клика, написаното се изтрива под ръцете. Затова шапката се
 * бележи преди клика и се чака да се появи НЕбелязана: значи новият екран е
 * нарисуван докрай.
 */
async function naEkran(p, koy, znak) {
  await p.evaluate(() => {
    const shapka = document.querySelector('.shapka');
    if (shapka) shapka.dataset['beleg'] = 'staro';
  });
  await p.click(`[data-ekran=${koy}]`);
  await p.waitForFunction(() => {
    const shapka = document.querySelector('.shapka');
    return Boolean(shapka) && !shapka.dataset['beleg'];
  });
  await p.waitForSelector(znak);
}

async function main() {
  const server = pusniServer();
  await pochakaySurvara();

  const brauzar = await chromium.launch({ executablePath: HROM });
  const stranitsa = await brauzar.newPage();
  const greshkiVKonzolata = [];
  stranitsa.on('pageerror', (e) => greshkiVKonzolata.push(`pageerror: ${e.message}`));
  stranitsa.on('console', (m) => {
    // Шрифтовете на Google не се теглят в тази кутия — това не е повреда.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      greshkiVKonzolata.push(`console: ${m.text()}`);
    }
  });
  // Сторното пита за причина през prompt().
  stranitsa.on('dialog', (d) => d.accept('сгрешена сума'));
  // Модерният избирач на файлове отваря прозорец на самата система, който
  // никой скрипт не може да кара. Проходът минава по стария път — същият,
  // по който върви и браузър без него.
  await stranitsa.addInitScript(() => {
    delete globalThis.showOpenFilePicker;
  });

  const p = stranitsa;

  try {
    // ══ 1 · празно състояние ═════════════════════════════════════════════
    razdel = '1 · празно';
    await p.goto(ADRES);
    await p.waitForSelector('#forma-imot');
    proveri('нула събития в началото', await broySabitiya(p), 0);
    proveri('без имоти', (await tekstNa(p, '.prazno')).includes('Още няма нито един имот'), true);

    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('Пари при празно: дължимо', await plochka(p, 'Дължимо общо'), '0,00');
    await naEkran(p, 'smetki', '#forma-period');
    proveri('Сметки при празно: ДДС', await plochka(p, 'ДДС за внасяне'), '0,00');
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 2 · имоти и наеми ════════════════════════════════════════════════
    razdel = '2 · имоти';
    await dobaviImot(p, 'Малинова', 'АП. № 1', '72,40');
    await dobaviImot(p, 'Дианабад', 'ОФИС № 3', '');
    proveri('два имота', await broySabitiya(p), 2);

    // Наемателят нарочно носи опасен текст — минава ли през екранирането.
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: 'Домакинство', suma: '500,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: '<img src=x onerror=alert(1)>', suma: '300,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Стройпласт ЕООД', suma: '1200,00', sektor: 'naem-targovski', padezh: '31' });
    proveri('пет събития', await broySabitiya(p), 5);

    proveri('единици', await plochka(p, 'Единици'), '2');
    proveri('отдадени', await plochka(p, 'Отдадени'), '2 / 2');
    proveri('месечен наем', await plochka(p, 'Месечен наем'), '2000,00');

    const imoti = await redove(p, '.red.imot');
    const malinova = imoti.find((r) => r[0]?.startsWith('Малинова'));
    proveri('имот с два наема · сбор', malinova?.[3], '800,00');
    proveri('имот с два наема · знак', malinova?.[4], '2 наема');
    proveri(
      'опасният текст не се изпълни, а се показва',
      (await p.content()).includes('&lt;img src=x onerror=alert(1)&gt;'),
      true,
    );

    // ══ 3 · дробни стотинки на входа ═════════════════════════════════════
    razdel = '3 · дробни стотинки';
    for (const losha of ['1150,555', '12.34.56', 'абв']) {
      await p.fill('#naem-naemetel', 'опит');
      await p.fill('#naem-suma', losha);
      await p.click('#forma-naem button[type=submit]');
      await p.waitForFunction(() => document.querySelector('#greshka-naem')?.textContent !== '');
      proveri(`„${losha}" се отказва`, (await tekstNa(p, '#greshka-naem')).includes('Не е сума в левове'), true);
    }
    proveri('нито един отказан наем не влезе', await broySabitiya(p), 5);

    // ══ 4 · начисляване ══════════════════════════════════════════════════
    razdel = '4 · начисляване';
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));
    proveri('осем събития след начисляване', await broySabitiya(p), 8);
    proveri('дължимо общо', await plochka(p, 'Дължимо общо'), '2000,00');

    const vzemaniya = await redove(p, '.red.vzemane');
    const stroy = vzemaniya.find((r) => r[0]?.startsWith('Стройпласт'));
    proveri('падеж 31 във февруари става 28-и', stroy?.[2]?.startsWith('2026-02-28'), true);

    // втори път — нищо ново
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('вече е начислен'));
    proveri('второто натискане не добави събитие', await broySabitiya(p), 8);

    // ══ 5 · плащания, надплащане, сторно ═════════════════════════════════
    razdel = '5 · плащания';
    await plati(p, 'Стройпласт', '600,00', 'в брой', '2026-02-10');
    proveri('частично · остатък', await ostatak(p, 'Стройпласт'), '600,00');
    proveri('девет събития', await broySabitiya(p), 9);

    await plati(p, 'Стройпласт', '700,00', 'банка', '2026-02-15');
    proveri('надплатеното излиза от просрочените', await ostatak(p, 'Стройпласт'), 'НЯМА РЕД');
    proveri('дължимо общо след надплащане', await plochka(p, 'Дължимо общо'), '700,00');

    const zaStorno = (await redove(p, '.red.plashtane')).find((r) => r[3] === '700,00');
    proveri('плащането от 700,00 се вижда', Boolean(zaStorno), true);
    await sSabitie(p, () => p.click(`.red.plashtane:has-text("700,00") [data-storno]`));
    proveri('единайсет събития след сторно', await broySabitiya(p), 11);
    proveri('сторното върна остатъка', await ostatak(p, 'Стройпласт'), '600,00');

    await plati(p, 'Стройпласт', '600,00', 'банка', '2026-02-15');
    proveri('дванайсет събития', await broySabitiya(p), 12);
    proveri('дължимо общо накрая', await plochka(p, 'Дължимо общо'), '800,00');

    // ══ 6 · сметки и ДДС ═════════════════════════════════════════════════
    razdel = '6 · сметки';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));

    proveri('приход', await plochka(p, 'Приход за'), '2000,00');
    proveri('ДДС за внасяне', await plochka(p, 'ДДС за внасяне'), '200,00');
    proveri('разход · още няма', await plochka(p, 'Разход за'), '0,00');
    proveri('разлика по сверката', await plochka(p, 'Разлика по сверката'), '0,00');

    const smetki = Object.fromEntries((await redove(p, '.red.smetka')).map((r) => [r[0].split(' ')[0], r[3]]));
    proveri('ред Наеми', smetki['Наеми'], '2000,00');
    proveri('ред КЕШ', smetki['КЕШ'], '600,00');
    proveri('ред БАНКА', smetki['БАНКА'], '600,00');
    proveri('ред Заплати', smetki['Заплати'], '0,00');
    proveri('ред Кредити', smetki['Кредити'], '0,00');

    const dds = await redove(p, '.red.dds:not(.sbor)');
    const targ = dds.find((r) => r[1]?.startsWith('наем · търговски'));
    const zhil = dds.find((r) => r[1]?.startsWith('наем · жилищен'));
    proveri('търговски · основа', targ?.[3], '1000,00');
    proveri('търговски · ДДС', targ?.[4], '200,00');
    proveri('жилищен · основа', zhil?.[3], '800,00');
    proveri('жилищен · ДДС', zhil?.[4], '0,00');

    const sverki = await redove(p, '.red.sverka');
    proveri('двете сверки затварят', sverki.every((r) => r[4] === 'затваря'), true);
    proveri('паричната сверка е в левове', sverki[0]?.[1], '2000,00');
    proveri('сверката по брой е в бройки', sverki[1]?.[1], '3');

    // ══ 7 · калкулатор ═══════════════════════════════════════════════════
    razdel = '7 · калкулатор';
    await smetni(p, 'фактура 1042', '1200,00', '20');
    await smetni(p, 'жилищен наем', '500,00', '0');
    const smyatane = await redove(p, '.red.smyatane');
    proveri('ред с 20%', smyatane[0]?.slice(2), ['1000,00', '200,00', '1200,00'].join(','));
    proveri('ред с 0%', smyatane[1]?.slice(2), ['500,00', '0,00', '500,00'].join(','));
    proveri('сборът', smyatane[2]?.slice(2), ['1500,00', '200,00', '1700,00'].join(','));

    // ══ 8 · презареждане — Журналът живее в браузъра ═════════════════════
    razdel = '8 · презареждане';
    await p.reload();
    await p.waitForSelector('#forma-imot');
    proveri('събитията оцеляха', await broySabitiya(p), 12);
    proveri('месечният наем оцеля', await plochka(p, 'Месечен наем'), '2000,00');
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));
    proveri('ДДС оцеля', await plochka(p, 'ДДС за внасяне'), '200,00');

    // ══ 9 · веригата ═════════════════════════════════════════════════════
    razdel = '9 · верига';
    await p.click('#proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Веригата е'));
    proveri('веригата е цяла, 12 звена', await tekstNa(p, '.vest'), 'Веригата е цяла · 12 от 12 звена.');
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 10 · износ ═══════════════════════════════════════════════════════
    razdel = '10 · износ';
    const [svaleno] = await Promise.all([p.waitForEvent('download'), p.click('#iznesi')]);
    const patyat = await svaleno.path();
    const izneseni = JSON.parse(await readFile(patyat, 'utf8'));
    proveri('изнесени 12 събития', izneseni.length, 12);
    proveri('всяко носи hash и prevHash', izneseni.every((x) => x.hash && x.prevHash !== undefined), true);

    proveri('лентата помни износа', (await tekstNa(p, '.veriga')).includes('Изнесен днес'), true);

    // ══ 10б · внасяне · връщането на изнесеното ══════════════════════════
    razdel = '10б · внасяне';
    await p.setInputFiles('#fayl', patyat);
    await p.waitForFunction(() => document.body.innerText.includes('Файлът вече е тук'));
    proveri('същият файл не добавя нищо', await broySabitiya(p), 12);

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
    proveri('Журналът не е пипнат', await broySabitiya(p), 12);

    // файл, който изобщо не е Журнал
    const bokluk = `${patyat}.boklu.json`;
    await writeFile(bokluk, '{"каквото и да е": 1}');
    await p.setInputFiles('#fayl', bokluk);
    await p.waitForFunction(() => document.body.innerText.includes('не е редица от събития'));
    proveri('и след боклук Журналът е цял', await broySabitiya(p), 12);

    // ══ 11 · тесен екран ═════════════════════════════════════════════════
    razdel = '11 · тесен екран';
    await p.setViewportSize({ width: 390, height: 844 });
    for (const [koy, znak] of [['imoti', '#forma-imot'], ['pari', '#forma-nachisli'], ['smetki', '#forma-period']]) {
      await naEkran(p, koy, znak);
      const izliza = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      proveri(`${koy}: нищо не излиза встрани`, izliza, false);
    }
    await p.setViewportSize({ width: 1280, height: 900 });

    // ══ 11б · поправка, прекратяване, вратарят на сторното ═══════════════
    razdel = '11б · поправката';
    await naEkran(p, 'imoti', '#forma-imot');

    // поправка на имот — наемът му НЕ се къса
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Дианабад") [data-popravi-imot]'));
    proveri('формата се напълни със стария адрес', await p.inputValue('#imot-adres'), 'Дианабад');
    await p.fill('#imot-adres', 'Дианабад 4');
    await p.fill('#imot-prichina', 'сбъркан номер');
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('тринайсет събития', await broySabitiya(p), 13);
    const sledPopravka = (await redove(p, '.red.imot')).find((x) => x[0].startsWith('Дианабад'));
    proveri('новият адрес се вижда', sledPopravka?.[0], 'Дианабад 4 ОФИС № 3');
    proveri('наемът не се откачи', sledPopravka?.[1]?.startsWith('Стройпласт'), true);

    // поправка на наем — новата сума важи за напред
    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-popravi-naem]'));
    proveri('формата се напълни със старата сума', await p.inputValue('#naem-suma'), '1200,00');
    await p.fill('#naem-suma', '1300,00');
    await p.fill('#naem-prichina', 'вдигнат наем');
    await sSabitie(p, () => p.click('#forma-naem button[type=submit]'));
    proveri('четиринайсет събития', await broySabitiya(p), 14);
    proveri(
      'новата сума в списъка',
      (await redove(p, '.red.naem')).find((x) => x[0].startsWith('Стройпласт'))?.[3],
      '1300,00',
    );

    // прекратяване
    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Домакинство") [data-prekrati]'));
    await p.fill('#prekrati-kraj', '2026-02-28');
    await p.fill('#prekrati-prichina', 'изнесоха се');
    await sSabitie(p, () => p.click('#forma-prekrati button[type=submit]'));
    proveri('петнайсет събития', await broySabitiya(p), 15);
    proveri(
      'наемът е прекратен',
      (await redove(p, '.red.naem')).find((x) => x[0].startsWith('Домакинство'))?.[4],
      'прекратен 2026-02-28',
    );
    proveri('месечният наем спадна', await plochka(p, 'Месечен наем'), '1600,00');

    // вратарят отказва, докато нещо живо виси
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Малинова") [data-storno-imot]'));
    proveri('сторно на имот с наеми се отказва', (await tekstNa(p, '.vest')).includes('висят'), true);
    proveri('нищо не влезе', await broySabitiya(p), 15);

    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-storno-naem]'));
    proveri(
      'сторно на наем с вземания се отказва',
      (await tekstNa(p, '.vest')).includes('начислено вземане'),
      true,
    );
    proveri('пак нищо не влезе', await broySabitiya(p), 15);

    // сторно на начисление БЕЗ плащания — минава
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('дължимо преди сторното', await plochka(p, 'Дължимо общо'), '800,00');
    await sSabitie(p, () => p.click('.red.vzemane:has-text("Домакинство") [data-storno-vzemane]'));
    proveri('шестнайсет събития', await broySabitiya(p), 16);
    proveri('дължимото падна', await plochka(p, 'Дължимо общо'), '300,00');

    // ══ 11в · разходите → входящият ДДС ══════════════════════════════════
    razdel = '11в · разходите';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('ДДС преди разходите', await plochka(p, 'ДДС за внасяне'), '200,00');

    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Материали ООД',
      opis: 'цимент', suma: '600,00', nachin: 'банка', data: '2026-02-14', dokument: '1042',
    });
    proveri('седемнайсет събития', await broySabitiya(p), 17);

    await zapishiRazhod(p, {
      potok: 'zaplati', sektor: 'pokupki-materiali', dostavchik: 'екип',
      opis: 'заплати февруари', suma: '2000,00', nachin: 'в брой', data: '2026-02-28', dokument: '',
    });
    proveri('осемнайсет събития', await broySabitiya(p), 18);

    const smetkiR = Object.fromEntries(
      (await redove(p, '.red.smetka')).map((x) => [x[0].split(' ')[0], x[3]]),
    );
    proveri('ред Фактури', smetkiR['Фактури'], '600,00');
    proveri('ред Заплати', smetkiR['Заплати'], '2000,00');
    proveri('плочка Разход', await plochka(p, 'Разход за'), '2600,00');

    const vhod = (await redove(p, '.red.dds:not(.sbor)')).filter((x) => x[0] === 'вход');
    proveri('две страни „вход" — материали и заплати', vhod.length, 2);
    const materiali = vhod.find((x) => x[1]?.startsWith('покупки · материали'));
    proveri('входящ ДДС от фактурата', materiali?.[4], '100,00');
    proveri('заплатите не носят ДДС', vhod.find((x) => x[1]?.startsWith('заплати'))?.[4], '0,00');
    proveri('за внасяне пада наполовина', await plochka(p, 'ДДС за внасяне'), '100,00');

    const sverkiR = await redove(p, '.red.sverka');
    proveri('четирите сверки затварят', sverkiR.every((x) => x[4] === 'затваря'), true);
    proveri('сверката на разхода', sverkiR[2]?.[1], '2600,00');

    // сторно на фактурата — входящият ДДС си отива с нея
    await sSabitie(p, () => p.click('.red.razhod:has-text("Материали ООД") [data-storno-razhod]'));
    proveri('деветнайсет събития', await broySabitiya(p), 19);
    proveri('за внасяне се връща', await plochka(p, 'ДДС за внасяне'), '200,00');
    proveri('разходът остава само заплатите', await plochka(p, 'Разход за'), '2000,00');

    // ══ 11г · източниците · таблица от Драйва ════════════════════════════
    razdel = '11г · източници';
    const GLAVA = 'Доставчик;За какво;Сума;Дата;Документ';
    const parviCSV = join(tmpdir(), 'razhodi-fevruari.csv');
    await writeFile(
      parviCSV,
      [GLAVA, 'Бетон ЕООД;бетон;900,00;10.02.2026;5001', 'Кран ООД;кран;300,00;12.02.2026;5002'].join('\n'),
    );

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    proveri('менюто се отваря с четирите източника', (await p.$$('[data-iztochnik]')).length, 4);

    await p.click('[data-iztochnik=csv]');
    await p.setInputFiles('#fayl-iztochnik', parviCSV);
    await p.waitForSelector('#prilozhi');
    proveri('казва, че е първо четене', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Прочетено'), true);
    proveri('показва отпечатъка на файла', (await tekstNa(p, '.karta.izbrana .dyalglava span')).includes('отпечатък'), true);
    const razlikiPredi = await redove(p, '.red.razlika');
    proveri('два нови реда', razlikiPredi.length, 2);
    proveri('първият е нов', razlikiPredi[0]?.[0], 'нов');

    await sSabitiya(p, 2, () => p.click('#prilozhi'));
    proveri('двайсет и едно събития', await broySabitiya(p), 21);
    proveri('Фактури пораснаха', (await redove(p, '.red.smetka')).find((x) => x[0].startsWith('Фактури'))?.[3], '1200,00');

    // поправен файл за същия месец: една сума сменена, един ред махнат
    const vtoriCSV = join(tmpdir(), 'razhodi-fevruari-popraven.csv');
    await writeFile(vtoriCSV, [GLAVA, 'Бетон ЕООД;бетон;950,00;10.02.2026;5001'].join('\n'));

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-iztochnik=csv]');
    await p.setInputFiles('#fayl-iztochnik', vtoriCSV);
    await p.waitForSelector('#prilozhi');
    proveri('вече не е първо четене', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Разликите'), true);

    const vidove = (await redove(p, '.red.razlika')).map((x) => x[0]);
    proveri('един поправен и един махнат', vidove.sort().join(','), 'махнат,поправен');
    proveri('филтърът показва само промените', (await redove(p, '.red.razlika')).length, 2);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar=vsichko]'));
    proveri('филтърът „всичко" пак дава два', (await redove(p, '.red.razlika')).length, 2);

    await sSabitiya(p, 3, () => p.click('#prilozhi'));
    proveri('двайсет и четири събития', await broySabitiya(p), 24);
    proveri(
      'Фактури казват това, което казва новият файл',
      (await redove(p, '.red.smetka')).find((x) => x[0].startsWith('Фактури'))?.[3],
      '950,00',
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
        const t = db.transaction('sabitiya', 'readwrite');
        const s = t.objectStore('sabitiya');
        const z = s.getAll();
        z.onsuccess = () => {
          const vsichki = z.result.sort((a, b) => a.seq - b.seq);
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
    await p.click('#proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Веригата се къса'));
    const vest = await tekstNa(p, '.vest');
    proveri('посочва точния seq', vest.includes(`seq ${podmenen}`), true);
    proveri('казва, че Вратата е спряна', vest.includes('Вратата е спряна'), true);
    proveri('Журналът не е пипан', await broySabitiya(p), 24);

    await naEkran(p, 'imoti', '#forma-imot');
    await p.fill('#imot-adres', 'След инцидента');
    await p.fill('#imot-edinitsa', 'не влиза');
    await p.click('#forma-imot button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-imot')?.textContent !== '');
    proveri('спирателният кран държи записа', (await tekstNa(p, '#greshka-imot')).length > 0, true);
    proveri('нищо ново не влезе', await broySabitiya(p), 24);
  } catch (greshka) {
    nahodki.push({ razdel, kakvo: 'проходът се спъна', vidyano: String(greshka).split('\n')[0], ochakvano: 'да мине' });
    await p.screenshot({ path: 'proba/spanal.png', fullPage: true }).catch(() => {});
  }

  proveri('конзолата е чиста', greshkiVKonzolata.join(' | ') || 'чиста', 'чиста');

  await brauzar.close();
  try {
    process.kill(-server.pid);
  } catch {
    /* вече е спрян */
  }

  console.log(`\nМинали: ${minali.length}`);
  if (nahodki.length === 0) {
    console.log('НАХОДКИ: няма. Проходът мина целия път.\n');
    process.exit(0);
  }
  console.log(`\nНАХОДКИ (${nahodki.length}):\n`);
  for (const n of nahodki) {
    console.log(`  ✗ [${n.razdel}] ${n.kakvo}`);
    console.log(`      чакано: ${n.ochakvano}`);
    console.log(`      видяно: ${n.vidyano}\n`);
  }
  process.exit(1);
}

// ── действията, изразени с думите на екрана ────────────────────────────────
async function dobaviImot(p, adres, edinitsa, ploshtad) {
  await p.fill('#imot-adres', adres);
  await p.fill('#imot-edinitsa', edinitsa);
  if (ploshtad) await p.fill('#imot-ploshtad', ploshtad);
  const predi = await broySabitiya(p);
  await p.click('#forma-imot button[type=submit]');
  await p.waitForFunction((n) => {
    return Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1;
  }, predi);
}

async function dobaviNaem(p, { imot, koy, suma, sektor, padezh }) {
  await p.selectOption('#naem-imot', { label: imot });
  await p.fill('#naem-naemetel', koy);
  await p.fill('#naem-suma', suma);
  await p.selectOption('#naem-sektor', sektor);
  await p.fill('#naem-padezh', padezh);
  await p.fill('#naem-ot', '2026-01-01');
  const predi = await broySabitiya(p);
  await p.click('#forma-naem button[type=submit]');
  await p.waitForFunction((n) => {
    return Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1;
  }, predi);
}

/** Действие, което прерисува екрана, но не добавя събитие (бутон, отказ). */
async function deystvieSPrerisuvane(p, deystvie) {
  await p.evaluate(() => {
    const shapka = document.querySelector('.shapka');
    if (shapka) shapka.dataset['beleg'] = 'staro';
  });
  await deystvie();
  await p.waitForFunction(() => {
    const shapka = document.querySelector('.shapka');
    return Boolean(shapka) && !shapka.dataset['beleg'];
  });
}

/** Действие, което ТРЯБВА да сложи точно N нови събития в Журнала. */
async function sSabitiya(p, kolko, deystvie) {
  const predi = await broySabitiya(p);
  await deystvie();
  await p.waitForFunction(
    ([n, k]) => Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + k,
    [predi, kolko],
  );
}

/** Действие, което ТРЯБВА да сложи точно едно ново събитие в Журнала. */
async function sSabitie(p, deystvie) {
  const predi = await broySabitiya(p);
  await deystvie();
  await p.waitForFunction((n) => {
    return Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1;
  }, predi);
}

async function ostatak(p, koy) {
  const red = (await redove(p, '.red.vzemane')).find((r) => r[0]?.startsWith(koy));
  return red ? red[3] : 'НЯМА РЕД';
}

async function plati(p, koy, suma, nachin, data) {
  await p.click(`.red.vzemane:has-text("${koy}") [data-plati]`);
  await p.waitForSelector('#forma-plashtane');
  await p.fill('#pl-suma', suma);
  await p.selectOption('#pl-nachin', nachin);
  await p.fill('#pl-data', data);
  const predi = await broySabitiya(p);
  await p.click('#forma-plashtane button[type=submit]');
  await p.waitForFunction((n) => {
    return Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === n + 1;
  }, predi);
}

async function zapishiRazhod(p, { potok, sektor, dostavchik, opis, suma, nachin, data, dokument }) {
  await p.selectOption('#razhod-potok', potok);
  await p.selectOption('#razhod-sektor', sektor);
  await p.fill('#razhod-dostavchik', dostavchik);
  await p.fill('#razhod-opis', opis);
  await p.fill('#razhod-suma', suma);
  await p.selectOption('#razhod-nachin', nachin);
  await p.fill('#razhod-data', data);
  await p.fill('#razhod-dokument', dokument);
  await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));
}

async function smetni(p, opis, suma, stavka) {
  // Екранът се прерисува целият след всяко действие — чака се РЕДЪТ да се появи,
  // не просто таблицата, иначе следващото писане пада върху сменен DOM.
  const predi = await p.$$eval('.red.smyatane', (r) => r.length);
  await p.fill('#smyatane-opis', opis);
  await p.fill('#smyatane-suma', suma);
  await p.selectOption('#smyatane-stavka', stavka);
  await p.click('#forma-smyatane button[type=submit]');
  await p.waitForFunction((n) => document.querySelectorAll('.red.smyatane').length > n, predi);
}

await main();
