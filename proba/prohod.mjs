/**
 * ПРОХОД ПРЕЗ БРАУЗЪРА — целият път, в истински Chromium.
 *
 * Не проверява какво връща кодът, а какво ПИШЕ НА ЕКРАНА. Затова всяко
 * очакване е низ, както го чете човек: „1200,00", не 120000.
 *
 * Пуска се с `npm run proba`. Пада с ненулев код и изброява всяко разминаване.
 */

import { chromium } from 'playwright-core';
import { webcrypto } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as pochakay } from 'node:timers/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Пътят до Chromium · ТЪРСИ СЕ, не се заковава.
 *
 * Дотук пътят беше един закован ред и `npm run proba` работеше САМО на тази
 * машина — а командата е обявена в README като част от пълната проверка.
 *
 * Всеки кандидат се ПРОВЕРЯВА, че съществува. Това не е излишно: тук
 * `chromium.executablePath()` сочи `chromium-1234`, а на диска стои
 * `chromium-1194`. Път, който само изглежда верен, дава грешка две минути
 * по-късно и на съвсем друго място.
 */
function nameriHroma() {
  const kandidati = [
    process.env['PROBA_HROM'],
    (() => {
      try {
        return chromium.executablePath();
      } catch {
        return null;
      }
    })(),
    '/opt/pw-browsers/chromium',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ];
  for (const k of kandidati) {
    if (k && existsSync(k)) return k;
  }
  throw new Error(
    'Не намирам Chromium. Сложи пътя в PROBA_HROM или пусни ' +
      '`npx playwright-core install chromium`.',
  );
}

const HROM = nameriHroma();
const PORT = Number(process.env['PROBA_PORT'] ?? 4178);
const ADRES = `http://localhost:${PORT}/`;

/**
 * Клиентският номер · същият като в `app/vhod-google.ts`.
 *
 * Преписан е нарочно и това е ЕДИНСТВЕНОТО преписване тук: проходът трябва да
 * подписва жетон за същото приложение, а да внася от `app/` значи да вкара
 * TypeScript в скрипт, който върви на голо node. Разминат ли се двата, §26
 * пада с „жетонът е за ДРУГО приложение" — тоест проверката сама си казва.
 */
const KLIENT_NOMER_V_PROHODA =
  '41382209788-ggjrn13mf5upp068flm6kup5u9usg5lg.apps.googleusercontent.com';

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

/**
 * Влиза през подставения бутон · за след всяко изчистване на хранилището.
 *
 * Изтрит `localStorage` значи изтрит запомнен вход. Приложението показва
 * „Влез" — и това е ВЯРНОТО поведение, не пречка за прохода.
 */
/**
 * ДАТА СПРЯМО ДНЕС · YYYY-MM-DD.
 *
 * Заковани дати правят проход, който минава само в един ден от календара.
 * Платено веднага: §24 мина цял ден, а на другата сутрин „делото до 2 дни"
 * вече беше просрочено и броят падна от 2 на 1 — без нито един ред променен
 * код. Светофарът се проверява с числа (7 и 2), значи и датите трябва да са
 * спрямо днес.
 */
function denOtDnes(kolko) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + kolko);
  return d.toISOString().slice(0, 10);
}

async function vlezOtnovo(p) {
  await p.waitForSelector('#podstaven-google');
  await p.click('#podstaven-google');
  await p.waitForSelector('#forma-imot');
}

async function plochka(p, etiket) {
  // паузите се свеждат до обикновени — екранът пише тясната (U+202F), а
  // очакванията в прохода се четат от човек и се пишат с интервал
  const vsichki = await p.$$eval('.plochka', (r) =>
    r.map((x) => [...x.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim())),
  );
  const namerena = vsichki.find((x) => x[0]?.toUpperCase().includes(etiket.toUpperCase()));
  return namerena ? namerena[1] : `НЯМА ПЛОЧКА „${etiket}"`;
}

/** Долният ред на плочка — обяснението под числото. */
async function plochkaPod(p, etiket) {
  const vsichki = await p.$$eval('.plochka', (r) =>
    r.map((x) => [...x.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim())),
  );
  const namerena = vsichki.find((x) => x[0]?.toUpperCase().includes(etiket.toUpperCase()));
  return namerena ? (namerena[2] ?? '') : `НЯМА ПЛОЧКА „${etiket}"`;
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

  // ── ПОДСТАВЕНИЯТ GOOGLE ────────────────────────────────────────────────
  //
  // Проходът върви БЕЗ мрежа и не може да влезе в истински акаунт. Затова тук
  // се прави истинска ключова двойка: страницата подписва жетон с частния
  // ключ, а публичният се сервира на адреса, от който приложението ги чете.
  //
  // Така се тества НАШИЯТ код по целия път — четене, шест проверки, подпис —
  // а не скриптът на Google. Подставен подпис, който минава без проверка, би
  // тествал само това, че сме извикали функция.
  const dvoyka = await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const publichen = await webcrypto.subtle.exportKey('jwk', dvoyka.publicKey);
  const chasten = await webcrypto.subtle.exportKey('jwk', dvoyka.privateKey);

  await stranitsa.route('https://www.googleapis.com/oauth2/v3/certs', (put) =>
    put.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ keys: [{ ...publichen, kid: 'proba', kty: 'RSA', alg: 'RS256', use: 'sig' }] }),
    }),
  );
  await stranitsa.route('https://accounts.google.com/gsi/client', (put) =>
    put.fulfill({ status: 200, contentType: 'text/javascript', body: '/* подставен */' }),
  );
  const greshkiVKonzolata = [];
  let ochakvanaTishina = false;
  stranitsa.on('pageerror', (e) => greshkiVKonzolata.push(`pageerror: ${e.message}`));
  stranitsa.on('console', (m) => {
    // Вече нищо не се тегли отвън — шрифтовете са в пакета. Единственото
    // очаквано мълчание е в раздел 16, където мрежата се къса НАРОЧНО.
    if (m.type() === 'error' && !ochakvanaTishina) {
      greshkiVKonzolata.push(`console: ${m.text()}`);
    }
  });
  // Сторното пита за причина през prompt().
  stranitsa.on('dialog', (d) => d.accept('сгрешена сума'));
  // Модерният избирач на файлове отваря прозорец на самата система, който
  // никой скрипт не може да кара. Проходът минава по стария път — същият,
  // по който върви и браузър без него.
  await stranitsa.addInitScript(
    ({ chasten, nomer }) => {
      delete globalThis.showOpenFilePicker;

      const vBase64URL = (bayta) => {
        let dvoichno = '';
        for (const b of new Uint8Array(bayta)) dvoichno += String.fromCharCode(b);
        return btoa(dvoichno).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };
      const tekstVBase64URL = (t) => vBase64URL(new TextEncoder().encode(t));

      globalThis.__napraviZheton = async (nonce, promeni = {}) => {
        const klyuch = await crypto.subtle.importKey(
          'jwk',
          { ...chasten, alg: 'RS256' },
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const glava = tekstVBase64URL(JSON.stringify({ alg: 'RS256', kid: 'proba', typ: 'JWT' }));
        const tvardeniya = tekstVBase64URL(
          JSON.stringify({
            iss: 'https://accounts.google.com',
            aud: nomer,
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: 'vintexstroy@gmail.com',
            email_verified: true,
            name: 'Иво',
            nonce,
            sub: '1029384756',
            ...promeni,
          }),
        );
        const podpis = await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          klyuch,
          new TextEncoder().encode(`${glava}.${tvardeniya}`),
        );
        return `${glava}.${tvardeniya}.${vBase64URL(podpis)}`;
      };

      let nastroyki = null;
      globalThis.google = {
        accounts: {
          id: {
            initialize: (n) => {
              nastroyki = n;
            },
            prompt: () => {},
            disableAutoSelect: () => {},
            renderButton: (kade) => {
              const b = document.createElement('button');
              b.id = 'podstaven-google';
              b.type = 'button';
              b.textContent = 'Влез с Google';
              b.addEventListener('click', async () => {
                const zheton = await globalThis.__napraviZheton(nastroyki.nonce);
                nastroyki.callback({ credential: zheton });
              });
              kade.append(b);
            },
          },
        },
      };
    },
    { chasten, nomer: KLIENT_NOMER_V_PROHODA },
  );

  const p = stranitsa;

  try {
    // ══ 0 · ВХОДЪТ · преди всичко останало ═══════════════════════════════
    //
    // Влизането гати целия екран: без него няма нито Журнал, нито `actor`.
    // Затова е първият раздел, а не последният.
    razdel = '0 · входът с Google';
    await p.goto(ADRES);

    await p.waitForSelector('#butonat-na-google');
    proveri('без вход се показва „Влез", не празен екран', await tekstNa(p, '.vhod h2'), 'Влез');
    proveri(
      'и казва, че парола няма',
      (await tekstNa(p, '.vhod .drebno')).includes('никога не вижда парола'),
      true,
    );
    proveri('няма имоти преди вход', await p.$('#forma-imot'), null);

    await p.click('#podstaven-google');
    await p.waitForSelector('#forma-imot');
    proveri('след вход се влиза в приложението', Boolean(await p.$('#forma-imot')), true);

    await naEkran(p, 'tablo', '.karta');
    proveri('Таблото казва КОЙ е влязъл', await plochka(p, 'Влязъл като'), 'Иво');
    proveri('и под кой Журнал работи', await plochka(p, 'Кой Журнал'), 'vintexstroy@gmail.com');
    proveri('ролята е неговата дума', await plochka(p, 'Роля'), 'собственик');
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 1 · празно състояние ═════════════════════════════════════════════
    razdel = '1 · празно';
    await p.waitForSelector('#forma-imot');
    proveri('нула събития в началото', await broySabitiya(p), 0);
    proveri('без имоти', (await tekstNa(p, '.prazno')).includes('Още няма нито един имот'), true);

    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('Пари при празно: дължимо', await plochka(p, 'Дължимо общо'), '0,00 €');
    await naEkran(p, 'smetki', '#forma-period');
    proveri('Сметки при празно: ДДС', await plochka(p, 'ДДС за внасяне'), '0,00 €');
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 2 · имоти и наеми ════════════════════════════════════════════════
    razdel = '2 · имоти';
    await dobaviImot(p, 'Малинова', 'АП. № 1', '72,40');
    // Площта е ПЛОЩ, не пари (находка на сверката): паричният форматер
    // изписваше „72,40 € м²" — знак за евро върху квадратни метри.
    proveri('площта се пише без знак за валута',
      (await p.$$eval('.red.imot', (r) => r.map((x) => x.innerText))).some(
        (t) => t.includes('72,40 м²') && !t.includes('€ м²')), true);
    await dobaviImot(p, 'Дианабад', 'ОФИС № 3', '');
    proveri('два имота', await broySabitiya(p), 2);

    // Наемателят нарочно носи опасен текст — минава ли през екранирането.
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: 'Домакинство', suma: '500,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: '<img src=x onerror=alert(1)>', suma: '300,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Стройпласт ЕООД', suma: '1200,00', sektor: 'naem-targovski', padezh: '31' });
    proveri('пет събития', await broySabitiya(p), 5);

    proveri('единици', await plochka(p, 'Единици'), '2');
    proveri('отдадени', await plochka(p, 'Отдадени'), '2 / 2');
    proveri('месечен наем', await plochka(p, 'Месечен наем'), '2 000,00 €');

    const imoti = await redove(p, '.red.imot');
    const malinova = imoti.find((r) => r[0]?.startsWith('Малинова'));
    proveri('имот с два наема · сбор', malinova?.[3], '800,00 €');
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
      proveri(`„${losha}" се отказва`, (await tekstNa(p, '#greshka-naem')).includes('Не е сума'), true);
    }
    proveri('нито един отказан наем не влезе', await broySabitiya(p), 5);

    // ══ 4 · начисляване ══════════════════════════════════════════════════
    razdel = '4 · начисляване';
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));
    proveri('осем събития след начисляване', await broySabitiya(p), 8);
    proveri('дължимо общо', await plochka(p, 'Дължимо общо'), '2 000,00 €');

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
    proveri('частично · остатък', await ostatak(p, 'Стройпласт'), '600,00 €');
    proveri('девет събития', await broySabitiya(p), 9);

    await plati(p, 'Стройпласт', '700,00', 'банка', '2026-02-15');
    proveri('надплатеното излиза от просрочените', await ostatak(p, 'Стройпласт'), 'НЯМА РЕД');
    proveri('дължимо общо след надплащане', await plochka(p, 'Дължимо общо'), '700,00 €');

    const zaStorno = (await redove(p, '.red.plashtane')).find((r) => r[3] === '700,00 €');
    proveri('плащането от 700,00 се вижда', Boolean(zaStorno), true);
    await sSabitie(p, () => p.click(`.red.plashtane:has-text("700,00") [data-storno]`));
    proveri('единайсет събития след сторно', await broySabitiya(p), 11);
    proveri('сторното върна остатъка', await ostatak(p, 'Стройпласт'), '600,00 €');

    await plati(p, 'Стройпласт', '600,00', 'банка', '2026-02-15');
    proveri('дванайсет събития', await broySabitiya(p), 12);
    proveri('дължимо общо накрая', await plochka(p, 'Дължимо общо'), '800,00 €');

    // ══ 6 · сметки и ДДС ═════════════════════════════════════════════════
    razdel = '6 · сметки';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));

    proveri('приход', await plochka(p, 'Приход за'), '2 000,00 €');
    proveri('ДДС за внасяне', await plochka(p, 'ДДС за внасяне'), '200,00 €');
    proveri('разход · още няма', await plochka(p, 'Разход за'), '0,00 €');
    proveri('разлика по сверката', await plochka(p, 'Разлика по сверката'), '0,00 €');

    const smetki = Object.fromEntries((await redove(p, '.red.smetka')).map((r) => [r[0].split(' ')[0], r[3]]));
    proveri('ред Наеми', smetki['Наеми'], '2 000,00 €');
    proveri('ред КЕШ', smetki['КЕШ'], '600,00 €');
    proveri('ред БАНКА', smetki['БАНКА'], '600,00 €');
    proveri('ред Заплати', smetki['Заплати'], '0,00 €');
    proveri('ред Кредити', smetki['Кредити'], '0,00 €');

    const dds = await redove(p, '.red.dds:not(.sbor)');
    const targ = dds.find((r) => r[1]?.startsWith('наем · търговски'));
    const zhil = dds.find((r) => r[1]?.startsWith('наем · жилищен'));
    proveri('търговски · основа', targ?.[3], '1 000,00 €');
    proveri('търговски · ДДС', targ?.[4], '200,00 €');
    proveri('жилищен · основа', zhil?.[3], '800,00 €');
    proveri('жилищен · ДДС', zhil?.[4], '0,00 €');

    const sverki = await redove(p, '.red.sverka:not(.otchet-sverka)');
    proveri('двете сверки затварят', sverki.every((r) => r[4] === 'затваря'), true);
    proveri('паричната сверка е в левове', sverki[0]?.[1], '2 000,00 €');
    proveri('сверката по брой е в бройки', sverki[1]?.[1], '3');

    // ══ 7 · калкулатор ═══════════════════════════════════════════════════
    razdel = '7 · калкулатор';
    await smetni(p, 'фактура 1042', '1200,00', '20');
    await smetni(p, 'жилищен наем', '500,00', '0');
    const smyatane = await redove(p, '.red.smyatane');
    proveri('ред с 20%', smyatane[0]?.slice(2), ['1 000,00 €', '200,00 €', '1 200,00 €'].join(','));
    proveri('ред с 0%', smyatane[1]?.slice(2), ['500,00 €', '0,00 €', '500,00 €'].join(','));
    proveri('сборът', smyatane[2]?.slice(2), ['1 500,00 €', '200,00 €', '1 700,00 €'].join(','));

    // ══ 8 · презареждане — Журналът живее в браузъра ═════════════════════
    razdel = '8 · презареждане';
    await p.reload();
    // Паметта на екрана (ADR-022) връща ПОСЛЕДНИЯ гледан екран, не Имоти —
    // проходът се прибира там изрично, както би направил и човек.
    await p.waitForSelector('.nav');
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('събитията оцеляха', await broySabitiya(p), 12);
    proveri('месечният наем оцеля', await plochka(p, 'Месечен наем'), '2 000,00 €');
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await p.click('#forma-period button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('наем · търговски'));
    proveri('ДДС оцеля', await plochka(p, 'ДДС за внасяне'), '200,00 €');

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
      '1 300,00 €',
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
    proveri('месечният наем спадна', await plochka(p, 'Месечен наем'), '1 600,00 €');

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
    proveri('дължимо преди сторното', await plochka(p, 'Дължимо общо'), '800,00 €');
    await sSabitie(p, () => p.click('.red.vzemane:has-text("Домакинство") [data-storno-vzemane]'));
    proveri('шестнайсет събития', await broySabitiya(p), 16);
    proveri('дължимото падна', await plochka(p, 'Дължимо общо'), '300,00 €');

    // ══ 11в · разходите → входящият ДДС ══════════════════════════════════
    razdel = '11в · разходите';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-02');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('ДДС преди разходите', await plochka(p, 'ДДС за внасяне'), '200,00 €');

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
    proveri('ред Фактури', smetkiR['Фактури'], '600,00 €');
    proveri('ред Заплати', smetkiR['Заплати'], '2 000,00 €');
    proveri('плочка Разход', await plochka(p, 'Разход за'), '2 600,00 €');

    const vhod = (await redove(p, '.red.dds:not(.sbor)')).filter((x) => x[0] === 'вход');
    proveri('две страни „вход" — материали и заплати', vhod.length, 2);
    const materiali = vhod.find((x) => x[1]?.startsWith('покупки · материали'));
    proveri('входящ ДДС от фактурата', materiali?.[4], '100,00 €');
    proveri('заплатите не носят ДДС', vhod.find((x) => x[1]?.startsWith('заплати'))?.[4], '0,00 €');
    proveri('за внасяне пада наполовина', await plochka(p, 'ДДС за внасяне'), '100,00 €');

    const sverkiR = await redove(p, '.red.sverka:not(.otchet-sverka)');
    proveri('четирите сверки затварят', sverkiR.every((x) => x[4] === 'затваря'), true);
    proveri('сверката на разхода', sverkiR[2]?.[1], '2 600,00 €');

    // сторно на фактурата — входящият ДДС си отива с нея
    await sSabitie(p, () => p.click('.red.razhod:has-text("Материали ООД") [data-storno-razhod]'));
    proveri('деветнайсет събития', await broySabitiya(p), 19);
    proveri('за внасяне се връща', await plochka(p, 'ДДС за внасяне'), '200,00 €');
    proveri('разходът остава само заплатите', await plochka(p, 'Разход за'), '2 000,00 €');

    // ══ 11г · източниците · таблица от Драйва ════════════════════════════
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
    proveri('двайсет и две събития', await broySabitiya(p), 22);
    proveri('вестта казва, че сверката е ЗАПИСАНА', (await tekstNa(p, '.vest')).includes('ЗАПИСАНА в Журнала'), true);
    proveri('Фактури пораснаха', (await redove(p, '.red.smetka')).find((x) => x[0].startsWith('Фактури'))?.[3], '1 200,00 €');

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
    proveri('двайсет и шест събития', await broySabitiya(p), 26);
    proveri(
      'Фактури казват това, което казва новият файл',
      (await redove(p, '.red.smetka')).find((x) => x[0].startsWith('Фактури'))?.[3],
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
    proveri('Журналът не е пипан', await broySabitiya(p), 26);

    await naEkran(p, 'imoti', '#forma-imot');
    await p.fill('#imot-adres', 'След инцидента');
    await p.fill('#imot-edinitsa', 'не влиза');
    await p.click('#forma-imot button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-imot')?.textContent !== '');
    proveri('спирателният кран държи записа', (await tekstNa(p, '#greshka-imot')).length > 0, true);
    proveri('нищо ново не влезе', await broySabitiya(p), 26);

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
      return n ? n.children[1].textContent.trim() : '';
    });
    proveri('Таблото казва под кой ключ работи', akauntNaEkrana, 'vintexstroy@gmail.com');
    await naEkran(p, 'imoti', '#forma-imot');

    await p.evaluate(async (akaunt) => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      await new Promise((da, ne) => {
        const t = db.transaction('sabitiya', 'readwrite');
        const hr = t.objectStore('sabitiya');
        hr.delete([akaunt, 25]);
        hr.delete([akaunt, 26]);
        t.oncomplete = () => da(undefined);
        t.onerror = () => ne(t.error);
      });
      db.close();
    }, akauntNaEkrana);

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
    proveri('Журналът остава на 24', await broySabitiya(p), 24);
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
    proveri('изчисленото стои в блока', await plochka(p, 'Изчислено в Сметки'), '200,00 €');

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
    const [arhiv] = await Promise.all([p.waitForEvent('download'), p.click('#arhiv')]);
    const arhivPat = await arhiv.path();
    const parviBajtove = new Uint8Array((await readFile(arhivPat)).buffer).slice(0, 2);
    proveri('архивът е ZIP (PK)', String.fromCharCode(...parviBajtove), 'PK');
    proveri('архивът се казва като файл', (await arhiv.suggestedFilename()).endsWith('.xlsx'), true);

    // ══ 15 · таблото · кой съм, планът, отметките ════════════════════════
    razdel = '15 · таблото';
    await naEkran(p, 'tablo', '.vazmozhnosti');

    // Името вече идва от жетона на Google, не от закован ред (ADR-021).
    proveri('казва кой е влязъл', await plochka(p, 'Влязъл като'), 'Иво');
    proveri('казва през кого', await plochka(p, 'През'), 'Google');
    proveri('казва чие е хранилището', await plochka(p, 'Хранилище'), 'Безплатно');
    proveri('казва ролята', await plochka(p, 'Роля'), 'собственик');
    proveri(
      'никъде не пише „парола" като поле',
      await p.evaluate(() => document.querySelectorAll('input[type=password]').length),
      0,
    );

    // Планът по подразбиране е СТАРТЪПЪТ и носи цялата функционалност.
    proveri(
      'стартъпът е Професионалният в облака',
      (await tekstNa(p, '.red.planred.tuk')).includes('Професионален'),
      true,
    );
    proveri(
      'Личният е описан като САМО един акаунт',
      (await tekstNa(p, '[data-plan-red="lichen"]')).includes('САМО ЕДИН АКАУНТ'),
      true,
    );
    proveri(
      'ИИ е обявен като „скоро", без бутон който лъже',
      (await tekstNa(p, '.vazm:has-text("Свързване на ИИ")')).includes('скоро'),
      true,
    );

    // Отметката гаси бутон ВЕДНАГА — не при следващо влизане.
    proveri('архивът е тук преди отметката', await p.$$eval('#arhiv', (b) => b.length), 1);
    await deystvieSPrerisuvane(p, () =>
      p.click('.vazm input[data-vazmozhnost="arhiv-eksel"]'),
    );
    proveri('бутонът „Архив за Ексел" изчезна', await p.$$eval('#arhiv', (b) => b.length), 0);
    proveri(
      'и си личи, че е ИЗКЛЮЧЕНА, а не липсваща',
      (await tekstNa(p, '.vazm:has-text("Сваля архив")')).includes('изключена'),
      true,
    );
    await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="arhiv-eksel"]'));
    proveri('отметката го връща', await p.$$eval('#arhiv', (b) => b.length), 1);

    // Отметката гаси и цял ЕКРАН от лентата.
    proveri('Сметки са в лентата', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 1);
    await deystvieSPrerisuvane(p, () =>
      p.click('.vazm input[data-vazmozhnost="smetki-dds"]'),
    );
    proveri('Сметки паднаха от лентата', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 0);
    await deystvieSPrerisuvane(p, () => p.click('.vazm input[data-vazmozhnost="smetki-dds"]'));
    proveri('и се връщат', await p.$$eval('[data-ekran="smetki"]', (b) => b.length), 1);

    // Основата не се маха — иначе приложението престава да е приложение.
    proveri(
      'отметката на „Записва през Вратата" е заключена',
      await p.$eval('.vazm input[data-vazmozhnost="zapis"]', (i) => i.disabled),
      true,
    );

    // Личен план: ролите не са изключени — тях просто ги НЯМА там.
    await deystvieSPrerisuvane(p, () => p.click('[data-plan="lichen"]'));
    proveri(
      'планът се смени на Личен',
      (await tekstNa(p, '.red.planred.tuk')).includes('Личен'),
      true,
    );
    proveri(
      'ролите не се предлагат в Личния',
      await p.$eval('.vazm input[data-vazmozhnost="roli-za-dostap"]', (i) => i.disabled),
      true,
    );
    proveri(
      'и е казано защо: няма я в този план',
      (await tekstNa(p, '.vazm:has-text("Роля на всеки добавен имейл")')).includes('няма я'),
      true,
    );

    // Изборът преживява презареждане — иначе е настроение, не нагласа.
    await p.reload();
    await p.waitForSelector('.nav');
    await naEkran(p, 'tablo', '.vazmozhnosti');
    proveri(
      'Личният план се помни след презареждане',
      (await tekstNa(p, '.red.planred.tuk')).includes('Личен'),
      true,
    );
    await deystvieSPrerisuvane(p, () => p.click('[data-plan="profesionalen"]'));

    // ══ 16 · ДЖОБЪТ · отваря ли се БЕЗ мрежа ═══════════════════════════════
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
        const kesh = await caches.open(imena[0]);
        const adresi = (await kesh.keys()).map((z) => z.url);
        const ima = (a) => adresi.some((u) => u.includes(`-${a}-`));
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
        const kesh = await caches.open(moi[0]);
        return (await kesh.keys()).length > 0 ? 'да' : 'празен кеш';
      }),
      'да',
    );

    const predi = await broySabitiya(p);

    // ── и сега истината: мрежата се КЪСА ──
    ochakvanaTishina = true;
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
    ochakvanaTishina = false;

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
    razdel = '18 · моделът на таблица';
    await naEkran(p, 'smetki', '#forma-period');
    await p.fill('#smetki-period', '2026-04');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    // Глава на българско банково извлечение. НЯМА колона „Доставчик" — точно
    // затова старият път по думи не я хваща и приложението трябва да ПИТА.
    const OBB = 'Дата на вальор;Основание;Наредител;Сума по документа;Реф. номер;ДДС %';
    const parvoIzvlechenie = join(tmpdir(), 'izvlechenie-april.csv');
    await writeFile(
      parvoIzvlechenie,
      [
        OBB,
        '05.04.2026;цимент;Материали ООД;600,00;3001;20',
        '12.04.2026;нощувки екип;Хотел ЕООД;109,00;3002;9',
      ].join('\n'),
    );

    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', parvoIzvlechenie);
    await p.waitForSelector('#zapomni-model');
    proveri('непознат хедър → ПИТА, не гадае', await tekstNa(p, '.karta.izbrana .dyalglava h2'), 'Не познавам тази таблица');
    proveri('предлага „дата"', await p.$eval('#karta-data', (e) => e.value), '0');
    proveri('предлага „сума"', await p.$eval('#karta-suma', (e) => e.value), '3');
    proveri('предлага „ДДС"', await p.$eval('#karta-dds', (e) => e.value), '5');
    proveri('НЕ гади „Наредител" за контрагент', await p.$eval('#karta-kontragent', (e) => e.value), '');

    await p.fill('#karta-ime', 'Банка ОББ');
    await p.selectOption('#karta-kontragent', '2');
    await sSabitiya(p, 1, () => p.click('#zapomni-model'));
    await p.waitForSelector('#prilozhi');
    proveri('картата се записва и файлът се чете', (await tekstNa(p, '.karta.izbrana .dyalglava h2')).startsWith('Прочетено'), true);
    proveri('два реда от извлечението', (await redove(p, '.red.razlika')).length, 2);

    await sSabitiya(p, 3, () => p.click('#prilozhi'));
    const vhodM = (await redove(p, '.red.dds:not(.sbor)')).filter((x) => x[0] === 'вход');
    proveri('един сектор, ДВЕ ставки — от колоната, не от сектора', vhodM.length, 2);
    proveri('входящ ДДС на 20%', vhodM.find((x) => x[2] === '20%')?.[4], '100,00 €');
    proveri('входящ ДДС на 9%', vhodM.find((x) => x[2] === '9%')?.[4], '9,00 €');

    // сверката на ДДС · движение в банката без фактура
    proveri('две движения без фактура светят', (await redove(p, '.red.nesvarshen')).length, 2);
    proveri('казва КОЕ липсва, не само колко', (await redove(p, '.red.nesvarshen'))[0]?.[0], 'липсва фактура');

    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-materiali', dostavchik: 'Материали ООД',
      opis: 'цимент', suma: '600,00', nachin: 'банка', data: '2026-04-05', dokument: '3001',
    });
    const ostanali = await redove(p, '.red.nesvarshen');
    proveri('въведената фактура затваря своето движение', ostanali.length, 1);
    proveri('остава точно другото', ostanali[0]?.[1]?.includes('3002'), true);

    // ВТОРИЯТ файл със същата глава — минава без нито един въпрос
    const vtoroIzvlechenie = join(tmpdir(), 'izvlechenie-april-2.csv');
    await writeFile(
      vtoroIzvlechenie,
      [
        OBB,
        '05.04.2026;цимент;Материали ООД;600,00;3001;20',
        '12.04.2026;нощувки екип;Хотел ЕООД;109,00;3002;9',
        '20.04.2026;тухли;Тухли АД;240,00;3003;20',
      ].join('\n'),
    );
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', vtoroIzvlechenie);
    await p.waitForSelector('#prilozhi');
    proveri('вторият файл със същата глава НЕ пита', (await p.$('#zapomni-model')) === null, true);
    proveri('вижда само новия ред', (await redove(p, '.red.razlika')).length, 1);
    await sSabitiya(p, 2, () => p.click('#prilozhi'));
    proveri('новото движение също търси фактурата си', (await redove(p, '.red.nesvarshen')).length, 2);

    // крив ред НЕ се преглъща — влиза в „непрочетени" с думи защо
    const krivo = join(tmpdir(), 'izvlechenie-april-krivo.csv');
    await writeFile(krivo, [OBB, '25.04.2026;боя;Бои ООД;150,00;3004;21'].join('\n'));
    await deystvieSPrerisuvane(p, () => p.click('#vzemi'));
    await p.click('[data-buton="Въведи разходи"]');
    await p.setInputFiles('#fayl-iztochnik', krivo);
    await p.waitForSelector('.red.propusnat');
    proveri('непозволена ставка не се закръгля — казва се', (await redove(p, '.red.propusnat'))[0]?.[1]?.includes('Ставка 21 не съществува'), true);
    await deystvieSPrerisuvane(p, () => p.click('#otkazhi-plan'));


    // ══ 19 · бутонът · моделът на ПЪТЯ ═══════════════════════════════════
    razdel = '19 · бутонът';
    await naEkran(p, 'nastroyki', '#nov-buton');
    proveri('Настройки казват колко пътя са ПОСТРОЕНИ', await plochka(p, 'Построени действия'), '2 / 10');
    proveri('моделът от §18 се вижда тук', (await redove(p, '.red.model')).length, 1);
    // §14 тръгна начисто; оттам насам са двете прилагания на §18.
    proveri('записаните сверки са две', (await redove(p, '.red.zapisanasverka')).length, 2);

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

    await naEkran(p, 'nastroyki', '#nov-buton');
    const posledna = (await redove(p, '.red.zapisanasverka'))[0];
    proveri('последната сверка носи името на бутона', posledna?.[0]?.startsWith('Извлечения ОББ'), true);
    proveri('и казва от колко файла е', posledna?.[0]?.includes('2 файла'), true);
    proveri('разликата ѝ затваря', posledna?.[4], 'затваря');


    // ══ 20 · колонното право · Бамстера и скритата колона ════════════════
    razdel = '20 · колонното право';
    await naEkran(p, 'nastroyki', '#forma-sluzhitel');
    proveri('още няма записан служител', (await p.$$('#izbor-sluzhitel')).length, 0);

    await p.fill('#forma-sluzhitel [name=imeyl]', 'Ivaylo85Petkov@gmail.com');
    await p.fill('#forma-sluzhitel [name=ime]', 'Бамстера');
    await p.selectOption('#forma-sluzhitel [name=rolya]', 'redaktor');
    await sSabitie(p, () => p.click('#forma-sluzhitel button[type=submit]'));

    await p.waitForSelector('.pravo');
    const optsii = await p.$$eval('#izbor-sluzhitel option', (o) => o.map((x) => x.textContent.trim()));
    proveri('служителят е записан с ролята си', optsii.includes('Бамстера · редактира'), true);

    const kletki = await p.$$eval('.pravo', (x) => x.map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
    proveri('скритият ред показва колона по колона', kletki.length, 6);
    proveri('и казва вида на всяка', kletki[0]?.includes('променяща се'), true);
    proveri('нищо не е скрито в началото', (await p.$$('.pravo.skrita')).length, 0);

    // Числото в Сметки ПРЕДИ скриването — то не бива да мръдне.
    await naEkran(p, 'smetki', '#forma-period');
    const razhodPredi = await plochka(p, 'Разход');

    // Скрий колоната „Сума по документа" за Бамстера
    await naEkran(p, 'nastroyki', '.pravo');
    await sSabitie(p, () => p.click('.pravo input'));
    await p.waitForSelector('.pravo.skrita');
    proveri('колоната е скрита за него', (await p.$$('.pravo.skrita')).length, 1);
    proveri('и се казва на глас, че сборът остава', (await tekstNa(p, '.vest')).includes('Сборът ѝ остава'), true);

    await naEkran(p, 'smetki', '#forma-period');
    proveri('СКРИТОТО ПАК СЕ СМЯТА · числото не е мръднало', await plochka(p, 'Разход'), razhodPredi);

    // Върни я — скрий → покажи → скрий не се губи (правило 20)
    await naEkran(p, 'nastroyki', '.pravo');
    await sSabitie(p, () => p.click('.pravo input'));
    proveri('връща се със същата отметка', (await p.$$('.pravo.skrita')).length, 0);
    await sSabitie(p, () => p.click('.pravo input'));
    proveri('и се скрива пак — ключът носи ДЕЙСТВИЕТО', (await p.$$('.pravo.skrita')).length, 1);


    // ══ 21 · Редакторът на хедъри · трите вида номенклатура ══════════════
    razdel = '21 · Редакторът на хедъри';
    await naEkran(p, 'nastroyki', '#litse-hedari');
    proveri('едно място, две лица', (await p.$$('#litse-opis')).length, 1);

    await p.selectOption('#izbor-hedar', { index: 1 });
    await p.waitForSelector('.red.redaktor');
    const koloniPredi = (await redove(p, '.red.redaktor')).length;
    proveri('колоните на хедъра се редят', koloniPredi > 0, true);
    // Клетките на реда: 0 име · 1 вид на колоната · 2 ВИД НА СТОЙНОСТТА ·
    // 3 номенклатура · 4 готово меню. Третата е новата (ADR-014).
    proveri(
      'по подразбиране колоната е БЕЗ падащо меню',
      (await redove(p, '.red.redaktor'))[0]?.[3],
      'без падащо меню',
    );

    // Нова колона с ГОТОВО меню от Описа — вторият вид номенклатура
    await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
    await p.fill('#kolona-ime', 'Начин');
    await p.selectOption('#kolona-nomenklatura', 'opis');
    await p.fill('#kolona-menyu', 'Кеш · Банка');
    await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
    await p.waitForSelector('.red.redaktor');
    const sledDobavyane = await redove(p, '.red.redaktor');
    proveri('колоната е добавена в КРАЯ', sledDobavyane.length, koloniPredi + 1);
    const nova = sledDobavyane[sledDobavyane.length - 1];
    proveri('и носи готовото меню от Описа', nova?.[3], 'готово меню от Описа');
    // Членовете стоят в полето за писане, не в текста на клетката.
    const chlenoveNaEkran = await p.$$eval('[data-menyu-vhod]', (x) => x.map((i) => i.value));
    proveri('членовете са запазени', chlenoveNaEkran.some((v) => v.includes('Кеш · Банка')), true);

    // Описът на Подредба — всичко именувано е ред
    await deystvieSPrerisuvane(p, () => p.click('#litse-opis'));
    await p.waitForSelector('.red.opis');
    const opis = await redove(p, '.red.opis');
    proveri('Описът брои и хедъри, и колони, и членове', opis.length > koloniPredi, true);
    proveri('членът на менюто си има дом', opis.some((r) => r[0] === 'Кеш' && r[1] === 'член на меню'), true);

    // Изтритото меню ЗАКЛЮЧВА името (ред 1994)
    await deystvieSPrerisuvane(p, () => p.click('#litse-hedari'));
    await p.waitForSelector('.red.redaktor');
    await sSabitie(p, () => p.click('[data-iztriy-menyu]'));
    await p.waitForSelector('.red.redaktor input:disabled');
    proveri('изтритото меню заключва името', (await p.$$('.red.redaktor input:disabled')).length, 1);
    proveri(
      'и колоната пада на първия вид',
      (await redove(p, '.red.redaktor')).pop()?.[3],
      'без падащо меню',
    );

    // ── видът на СТОЙНОСТТА · втората половина на ADR-014 ────────────────
    // Дотук `podskazhiVid()` гадаеше по заглавието, а собственият ѝ коментар
    // казваше „човекът потвърждава в Редактора на хедъри" — където нямаше
    // такъв контрол. Ето го, и проходът го пази.
    proveri('всяка колона показва вида на стойността си',
      (await p.$$eval('[data-vid-stoynost]', (e) => e.length)) > 0, true);
    proveri('и казва дали влиза в двата сбора',
      (await p.$$eval('.red.redaktor .kletka > span', (e) => e.map((x) => x.textContent)))
        .some((t) => t === 'влиза в двата сбора' || t === 'не влиза в сбор'), true);

    const parvoto = await p.$eval('[data-vid-stoynost]', (e) => e.value);
    await p.selectOption('[data-vid-stoynost]', parvoto === 'evro' ? 'protsent' : 'evro');
    await sSabitie(p, () => p.click('[data-zapishi-kolona="0"]'));
    proveri('смяната на вида ражда ЕДНО събитие и се задържа',
      await p.$eval('[data-vid-stoynost]', (e) => e.value),
      parvoto === 'evro' ? 'protsent' : 'evro');

    // Числата в Сметки не мърдат от редакция на глава
    await naEkran(p, 'smetki', '#forma-period');
    proveri('РЕДАКЦИЯТА НА ГЛАВА НЕ ПИПА ЧИСЛАТА', await plochka(p, 'Разход'), razhodPredi);


    // ══ 22 · Стойност на Състояние (Калкулатор) ═════════════════════════
    razdel = '22 · Стойност на Състояние';
    // Данните са от НЕГОВИТЕ два файла в Драйва, свити до пет обекта.
    const ploshtiCSV = join(tmpdir(), 'ploshto.csv');
    await writeFile(
      ploshtiCSV,
      [
        'кота;етаж;№;обект;застроена площ, F1;общи части F2;F2;Общо F1+F2;прилежащ (придаден) двор',
        'кота -2,88;подземен;1;Гараж 1;16,00;0,99;2,09;18,09;',
        ';;3;Гараж 3 и склад;19,50;1,21;2,54;22,04;',
        'кота ±0,00;първи;18;Апартамент 1;40,00;2,48;5,22;45,22;22,00',
        ';;19;Апартамент 2;57,00;3,53;7,44;64,44;22,90',
        'кота +2,85;втори;22;Апартамент 5;54,80;3,39;7,15;61,95;',
        ';;;;1614,59;100,00;210,64;1825,23;',
      ].join('\n'),
    );
    const tseniCSV = join(tmpdir(), 'tseni.csv');
    await writeFile(
      tseniCSV,
      [
        'Имоти;Етаж Кота;Стаи;Чиста площ;Общи части;;Обща площ;Изложение;Тераси;Цена с ДДС;Евро / кв.м.',
        'Апартамент 1;етаж 1;2;40;2,48;5,22;45,22;СИ;22;ПРОДАДЕН;',
        'Апартамент 2;;2;57;3,53;7,44;64,44;И;22,9;215400;3342',
        'Апартамент 5;етаж 2;2;54,8;3,39;7,15;61,95;СИ;4,5;ПРОДАДЕН;',
        'Гараж 1;сутерен;;16;0,99;2,09;18,09;;;38700;2139',
        'Гараж 3 и склад;;;19,5;1,21;2,54;22,04;;;ПРОДАДЕН;',
      ].join('\n'),
    );

    await naEkran(p, 'stoynost', '#cheti-ploshti');
    proveri('шестият екран го има', (await tekstNa(p, '.shapka h1')).includes('Стойност на Състояние'), true);
    proveri('А мълчи, докато няма данни', (await plochka(p, 'А · по площ')), '—');
    proveri('Б мълчи също', (await plochka(p, 'Б · по състояние')), '—');
    proveri('и трите пътя са налице', (await p.$$('#cheti-ploshti, #cheti-tseni, #pishi-tseni')).length, 3);
    proveri('изборът коя цена се пуска стои до бутона', (await p.$$('#koya-tsena')).length, 1);

    await deystvieSPrerisuvane(p, () => p.setInputFiles('#fayl-ploshti', ploshtiCSV));
    await p.waitForSelector('.red.stoynost');
    const obekti = await redove(p, '.red.stoynost:not(.sbor)');
    proveri('прочете петте обекта, а контролният ред не влиза', obekti.length, 5);
    proveri('и казва СВЕРКАТА вход↔изход', (await tekstNa(p, '.vest.dobre')).includes('разлика 0'), true);
    proveri('общите части се смятат — чиста 40,00 и обща 45,22', obekti[2]?.[2], '40,00');
    proveri('и общата стои до нея', obekti[2]?.[3], '45,22');
    proveri('видът се познава по името', obekti[0]?.[1].includes('гараж'), true);

    // ДВЕТЕ КОЛОНИ, ЕДНА ДО ДРУГА · негово: „две ценови колони за сравнение"
    // Хедърът минава през text-transform, затова се сверява без регистър.
    const glavaNaStoynostta = (await tekstNa(p, '.glava.stoynost')).toLowerCase();
    proveri('хедърът носи А', glavaNaStoynostta.includes('по площ'), true);
    proveri('хедърът носи Б', glavaNaStoynostta.includes('по състояние'), true);
    proveri('и разликата между тях', glavaNaStoynostta.includes('δ'), true);
    proveri('всеки ред носи и двете цени', obekti[3]?.[6] !== '' && obekti[3]?.[7] !== '', true);
    proveri('и казва ОТКЪДЕ е наемът', obekti[3]?.[5].includes('очакван'), true);

    const bezLista = await plochka(p, 'А · по площ');
    const bezListaB = await plochka(p, 'Б · по състояние');
    proveri('А вече говори', bezLista !== '—', true);
    proveri('Б също', bezListaB !== '—', true);
    proveri('и Б казва с колко стои под А', (await plochkaPod(p, 'Б · по състояние')).includes('%'), true);
    proveri('нищо не е продадено, докато листата мълчи', (await p.$$('.red.stoynost.mahnata')).length, 0);
    proveri('закръглянето се ВИЖДА, не се преглъща', (await plochkaPod(p, 'А · по площ')).includes('закръглено'), true);

    await deystvieSPrerisuvane(p, () => p.setInputFiles('#fayl-tseni', tseniCSV));
    await p.waitForSelector('.red.stoynost.mahnata');
    proveri('ценовата листа каза кое е ПРОДАДЕН', (await p.$$('.red.stoynost.mahnata')).length, 3);
    const sIzlozhenie = await redove(p, '.red.stoynost:not(.sbor)');
    proveri('и даде изложението', sIzlozhenie[3]?.[4], 'И');
    proveri('продаденото НЕ влиза в А', (await plochka(p, 'А · по площ')) !== bezLista, true);
    proveri('нито в Б', (await plochka(p, 'Б · по състояние')) !== bezListaB, true);

    // ПРЕВКЛЮЧВАТЕЛЯТ · „избираш само едната да се вижда"
    proveri('подразбраното е „и двете"', await p.$eval('#koya-tsena', (e) => e.value), 'dvete');
    await deystvieSPrerisuvane(p, () => p.selectOption('#koya-tsena', 'sastoyanie'));
    proveri('изборът се задържа след прерисуване', await p.$eval('#koya-tsena', (e) => e.value), 'sastoyanie');
    proveri('таблицата на екрана НЕ се мени — изборът е за износа', (await redove(p, '.red.stoynost:not(.sbor)')).length, 5);

    // ══ 23 · Отчетите · всяко число с формулата си ═══════════════════════
    razdel = '23 · Отчети';
    await naEkran(p, 'smetki', '#forma-period');

    // Формата за салдата стои ГОРЕ — негова дума: „Редактируеми отгоре в Сметки".
    const redNaSekcii = await p.$$eval('section .dyalglava h2', (h) => h.map((x) => x.textContent.trim()));
    proveri('Салда стои преди Период', redNaSekcii.indexOf('Салда') < redNaSekcii.indexOf('Период'), true);
    proveri('Отчети има своя секция', redNaSekcii.includes('Отчети'), true);

    const poleta = await p.$$eval('.pole-otchet .etiket', (e) => e.map((x) => x.textContent.trim()));
    proveri('четирите полета, в нарочния си ред', poleta.join(' · '),
      'КАПИТАЛ · ЛИКВИДНОСТ · ВЗЕМАНИЯ · СРЕДСТВА');

    // ФОРМУЛАТА не се крие зад клик: съставките се виждат веднага.
    const sastavkiNaKapitala = await p.$$eval(
      '[data-pole="kapital"] .formula .ime', (e) => e.map((x) => x.textContent.trim()));
    proveri('Капиталът показва от какво е съставен', sastavkiNaKapitala.join(' · '),
      'Стойност на Състояние · Ликвидност · Вземания · Кредити · остатъчна главница');

    // Правило 15 · изключено ≠ липсващо: непълното число го КАЗВА.
    // Калкулаторът вече е смятал в §22 и сборът му ВЛИЗА — затова тук се чака
    // само това, което наистина липсва: кредитите (M04 · нула код).
    proveri('Капиталът казва какво чака',
      (await p.$eval('[data-pole="kapital"] .chaka', (e) => e.textContent)).includes('кредит'), true);
    proveri('и НЕ чака Калкулатора — той вече е смятал',
      (await p.$eval('[data-pole="kapital"] .chaka', (e) => e.textContent)).includes('Калкулатора'), false);
    proveri('Вземанията НЕ крият празната половина',
      (await p.$$eval('[data-pole="vzemaniya"] .formula .ime', (e) => e.map((x) => x.textContent))).length, 2);

    // САЛДОТО · записва се, вижда се в Ликвидността, поправя се без втори ред.
    // Ликвидността вече носи движенията от по-ранните раздели, затова се мери
    // РАЗЛИКАТА, не абсолютното число: салдото трябва да добави точно 10 000.
    const likvidnostPredi = await chisloNaPoleto(p, 'likvidnost');
    const predSaldoto = await broySabitiya(p);
    await p.selectOption('#saldo-kade', 'banka');
    await p.fill('#saldo-suma', '10 000,00');
    await p.fill('#saldo-ot', '2026-08-01');
    await sSabitie(p, () => p.click('#forma-saldo button[type=submit]'));
    proveri('салдото роди ЕДНО събитие', (await broySabitiya(p)) - predSaldoto, 1);

    const likvidnost1 = await chisloNaPoleto(p, 'likvidnost');
    proveri('началото добавя ТОЧНО 10 000 към Ликвидността', likvidnost1 - likvidnostPredi, 10_000_00);
    proveri('и вече не чака Банка',
      (await p.$eval('[data-pole="likvidnost"] .chaka', (e) => e.textContent)).includes('Банка'), false);

    // Поправка на същия джоб · последният запис бие, втори ред не се ражда.
    await p.fill('#saldo-suma', '12 500,00');
    await p.fill('#saldo-ot', '2026-08-01');
    await sSabitie(p, () => p.click('#forma-saldo button[type=submit]'));
    const likvidnost2 = await chisloNaPoleto(p, 'likvidnost');
    proveri('поправката добавя разликата, не второ салдо', likvidnost2 - likvidnost1, 2_500_00);
    proveri('Банка се показва веднъж в формулата',
      (await p.$$eval('[data-pole="likvidnost"] .formula .ime',
        (e) => e.filter((x) => x.textContent.includes('Банка')).length)), 1);

    // СВЕРКАТА вход↔изход на Капитала · нулата се ПОКАЗВА (правило 7).
    proveri('сверката на Капитала затваря',
      await p.$eval('.dyalglava:has(h2:text-is("Отчети")) ~ .tablitsa .red.sverka .znachka',
        (e) => e.textContent.trim()), 'затваря');

    // ══ 24 · Гантът · решетката, лентите и диаграмата ════════════════════
    razdel = '24 · Гант';
    await naEkran(p, 'gant', '#forma-delo');

    proveri('седмият екран носи неговото име',
      await p.$eval('.shapka h1', (e) => e.textContent.trim()), 'Управление');
    proveri('и подзаглавието е дословно негово',
      (await p.$eval('.shapka p', (e) => e.textContent)).includes('Времевия Ред в Делата'), true);
    proveri('празният екран го КАЗВА',
      (await p.$eval('.prazno', (e) => e.textContent)).includes('Мястото е първата колона'), true);

    // ТРИТЕ КОЛОНИ · дело БЕЗ обект е нормално (негов случай).
    await zapishiDelo(p, { myasto: 'Малинова', obekt: 'бл. 1', ime: 'Акт 15',
      otgovornik: 'Николай Петков', ot: denOtDnes(0), do: denOtDnes(38), otsenka: 'спешно-важно' });
    await zapishiDelo(p, { myasto: 'Малинова', obekt: 'бл. 1', ime: 'Кофраж',
      otgovornik: 'Тихомир Иванов', ot: denOtDnes(0), do: denOtDnes(1), otsenka: 'спешно-неважно' });
    await zapishiDelo(p, { myasto: 'Хисаря', obekt: '', ime: 'Оглед без обект',
      otgovornik: 'Ивайло Петков', ot: denOtDnes(0), do: denOtDnes(0), otsenka: 'важно-неспешно' });

    proveri('три дела на екрана', (await p.$$eval('.gant-delo', (e) => e.length)), 3);
    proveri('двете места стоят като редове', (await p.$$eval('.gant-myasto', (e) => e.length)), 2);
    proveri('делото без обект се показва с тире',
      (await p.$$eval('.gant-delo .drebno', (e) => e.map((x) => x.textContent)))
        .some((t) => t.startsWith('—')), true);

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
    await deystvieSPrerisuvane(p, () => p.click('[data-takt="sedmitsa"]'));
    const koloniSedmitsa = await p.$$eval('.gant-glava-vreme span', (e) => e.length);
    proveri('месецът дава 31×5 + 31 колони', koloniMesets, 31 * 5 + 31);
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
      await p.$eval('.gant-lenta', (e) => e.draggable), false);

    // ДИАГРАМАТА · дизайнът на графиката, който И56 чака.
    await deystvieSPrerisuvane(p, () => p.click('#kam-diagrama'));
    proveri('диаграмата се появи', await p.$$eval('svg.diagrama', (e) => e.length), 1);
    proveri('носи днешната линия', await p.$$eval('.diagrama-dnes', (e) => e.length), 1);
    proveri('лентите са ленти на време, не клетки',
      await p.$$eval('.diagrama-lenta', (e) => e.length), 3);
    proveri('и всяка носи title за четец на екран',
      await p.$eval('.diagrama-lenta title', (e) => e.textContent.includes('→')), true);
    proveri('таблицата с оцветени полета отстъпи',
      await p.$$eval('.gant-lenta', (e) => e.length), 0);
    await deystvieSPrerisuvane(p, () => p.click('#kam-diagrama'));
    proveri('и се връща с бутон', await p.$$eval('.gant-lenta', (e) => e.length), 3);

    // БУТОНЪТ СЕГА · подрежда, не решава.
    const predSega = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#sega'));
    proveri('СЕГА не пипа нито едно дело', await broySabitiya(p), predSega);
    proveri('СЕГА филтрира по спешно и важно',
      await p.$eval('#f-otsenka', (e) => e.value), 'спешно-важно');

    // ══ 25 · контактите и писмото при закъснение ═════════════════════════
    razdel = '25 · писмото при закъснение';
    await naEkran(p, 'imoti', '#forma-imot');
    await dobaviNaem(p, {
      koy: 'Иван Контактен', suma: '250,00',
      sektor: 'naem-zhilishten', padezh: '5',
      telefon: '0888 123 456', imeyl: 'ivan@primer.bg',
    });
    proveri('телефонът и пощата се четат в реда на наема',
      (await p.$$eval('.red.naem', (r) => r.map((x) => x.innerText)))
        .some((t) => t.includes('0888 123 456') && t.includes('ivan@primer.bg')), true);

    // Начисляваме СТАР период — падежът минава и вземането става просрочено.
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));

    const redSPismo = '.red.vzemane:has-text("Иван Контактен")';
    proveri('просроченият ред носи бутон „Писмо"',
      await p.$$eval(`${redSPismo} [data-pismo]`, (e) => e.length), 1);

    const adres = await p.$eval(`${redSPismo} [data-pismo]`, (e) => e.getAttribute('href'));
    proveri('писмото тръгва към неговата поща',
      adres.startsWith('mailto:ivan%40primer.bg?'), true);
    const chetimo = decodeURIComponent(adres);
    proveri('темата носи сумата', chetimo.includes('250,00'), true);
    proveri('тялото носи периода', chetimo.includes('2026-02'), true);
    proveri('и допуска, че вече е платено', chetimo.includes('вече е направено'), true);

    // БЕЗ ИМЕЙЛ НЯМА БУТОН · „Домакинство" е записан преди двете полета.
    proveri('наем без поща не показва празен бутон',
      await p.$$eval('.red.vzemane:has-text("Домакинство") [data-pismo]', (e) => e.length), 0);

    // ══ 27 · удобството · сортиране, търсене, памет, история, меню ═══════
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
    await p.click('.red.naem:has-text("Домакинство") [data-istoriya]');
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
        const tablitsa = red.closest('.tablitsa');
        const redove = [...tablitsa.querySelectorAll('.red')];
        return { red: redove.indexOf(red), kolona: [...red.children].indexOf(k) };
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
        return l && !l.hidden ? l.textContent : null;
      });
    // Числото след етикета: спира на първия знак, който не е цифра/пауза —
    // кирилското „С" на следващия етикет го реже само.
    const chisloto = (tekst, sled) => {
      const m = new RegExp(`${sled}\\s*(-?[\\d\\s\\u00A0\\u202F]+(?:,\\d+)?)`).exec(tekst);
      return m ? Number(m[1].replace(/[\s\u00A0\u202F]/g, '').replace(',', '.')) : NaN;
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
      chisloto(naLentata ?? '', 'Сбор:'), (sumiPoKletki[0] + sumiPoKletki[1]) / 100);
    proveri('и средното се показва', (naLentata ?? '').includes('Средно'), true);

    // Shift+клик опъва дотам; Ctrl+A хваща целия блок данни.
    const redoveNaEkrana = await p.$$eval('.red.naem', (r) => r.length);
    await p.click('.red.naem > :first-child');
    const parvite = await p.$$('.red.naem > :first-child');
    await parvite[parvite.length - 1].click({ modifiers: ['Shift'] });
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
    await deystvieSPrerisuvane(p, () => p.click('[data-storno-izbrani]'));
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
      await p.$eval('#imot-adres', (e) => e.value), '');
    await p.keyboard.press('Control+z');
    proveri('Ctrl+Z я връща в полето',
      await p.$eval('#imot-adres', (e) => e.value), 'Черновата живее');
    proveri('и НЕ пише в Журнала — границата е Вратата',
      await broySabitiya(p), predaSborove + 2);

    // ЗАПИСАНОТО не се възкресява: изпращането ИЗЯЖДА черновата. Ctrl+Z
    // след „Запиши" вади предишната чернова, не току-що записаните данни —
    // иначе второ „Запиши" прави дубликат в Журнала.
    await dobaviImot(p, 'Записаният имот', 'ап. 9');
    await p.keyboard.press('Control+z');
    const sledZapis = await p.$eval('#imot-adres', (e) => e.value);
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
    await deystvieSPrerisuvane(p, () => p.click('#otkazhi-plan'));
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
    const broyDoTarsachkata = (klyuch) => p.evaluate((kl) => {
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
      let el = g.nextElementSibling;
      let sbor = 0;
      while (el && !el.classList.contains('grupata')) {
        const st = el.querySelector('.suma[data-st]');
        if (st) sbor += Number(st.dataset.st);
        el = el.nextElementSibling;
      }
      return { sbor, pokazano: g.querySelector('.sborove')?.textContent ?? '' };
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
      r.filter((x) => !x.hidden).length);

    // десен бутон върху клетката „Сектор" → „Скрий колоната"
    await p.click('.red.naem .kletka:nth-of-type(3)', { button: 'right' });
    await p.waitForSelector('.kontekstno-menyu');
    proveri('менюто предлага скриване с името на колоната',
      (await tekstNa(p, '.kontekstno-menyu')).includes('Скрий колоната „Сектор"'), true);
    await p.click('.kontekstno-menyu button:has-text("Скрий колоната")');
    proveri('колоната изчезна от главата',
      await p.$$eval('.glava.naem > *', (r) => r.filter((x) => !x.hidden).length),
      vidimiPredi - 1);
    proveri('и от редовете',
      await p.$eval('.red.naem', (red) => [...red.children].some((x) => x.hidden)), true);
    proveri('редът под таблицата казва какво е скрито',
      (await tekstNa(p, '.skrito-koloni')).includes('Скрити колони: 1'), true);

    // СКРИТОТО ПАК СЕ СМЯТА: плочката „Месечен наем" не мърда
    proveri('скритото ПАК се смята — сборът не мърда',
      await plochka(p, 'Месечен наем'), mesechenPredi);

    // презареждането помни скритото; „покажи ги" го връща
    await p.reload();
    await p.waitForSelector('#forma-imot');
    proveri('презареждането помни скритата колона',
      await p.$eval('.red.naem', (red) => [...red.children].some((x) => x.hidden)), true);
    await p.click('[data-pokazhi-koloni="naemi"]');
    proveri('„покажи ги" връща колоната',
      await p.$$eval('.glava.naem > *', (r) => r.filter((x) => !x.hidden).length),
      vidimiPredi);
    proveri('и редът за скритото пада', await p.$('.skrito-koloni'), null);

  } catch (greshka) {
    nahodki.push({ razdel, kakvo: 'проходът се спъна', vidyano: String(greshka).split('\n')[0], ochakvano: 'да мине' });
    // Какво е имало на екрана в мига на спъването — „timeout" сам по себе си
    // не казва нищо, а снимката се гледа чак после.
    const naEkrana = await p
      .evaluate(() => document.getElementById('ekran')?.innerText?.slice(0, 300) ?? 'няма екран')
      .catch(() => 'екранът не се чете');
    console.log(`\n  НА ЕКРАНА В МИГА НА СПЪВАНЕТО:\n  ${naEkrana.replace(/\n/g, '\n  ')}\n`);
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

async function dobaviNaem(p, { imot, koy, suma, sektor, padezh, telefon, imeyl }) {
  // По име, когато е подадено; иначе първият в списъка — по §25 имотите вече са
  // минали през поправки и сторно, и заковано име би се разминало.
  await p.selectOption('#naem-imot', imot ? { label: imot } : { index: 0 });
  await p.fill('#naem-naemetel', koy);
  if (telefon) await p.fill('#naem-telefon', telefon);
  if (imeyl) await p.fill('#naem-imeyl', imeyl);
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

/**
 * Натиска бутон от менюто и ЧАКА той да стане текущият.
 *
 * Обработчикът е асинхронен (чете Огледалото, за да намери бутона). Ако
 * файловете се подадат веднага след клика, те влизат ПРЕДИ бутонът да е избран
 * и партидата тръгва през стария път. Затова се чака името в шапката.
 */
async function natisniButon(p, ime) {
  await p.click(`[data-buton="${ime}"]`);
  await p.waitForFunction((n) => document.querySelector('#vzemi')?.innerText.includes(n), ime);
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

/** Числото на едно поле от Отчети, в цели стотинки — за да се СМЯТА, не да се сравнява текст. */
async function chisloNaPoleto(p, klyuch) {
  const tekst = await p.$eval(`[data-pole="${klyuch}"] .chislo`, (e) => e.textContent.trim());
  // „−12 500,00 €" → −1250000; неразделимите интервали и знакът за евро падат
  const chist = tekst.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.');
  return Math.round(Number(chist) * 100);
}

async function zapishiDelo(p, { myasto, obekt, ime, otgovornik, ot, do: doData, otsenka, nad }) {
  await p.fill('#d-myasto', myasto);
  await p.fill('#d-obekt', obekt);
  await p.fill('#d-ime', ime);
  await p.fill('#d-otgovornik', otgovornik);
  await p.fill('#d-ot', ot);
  await p.fill('#d-do', doData);
  await p.selectOption('#d-otsenka', otsenka);
  if (nad) await p.selectOption('#d-nad', { label: nad });
  await sSabitie(p, () => p.click('#forma-delo button[type=submit]'));
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
