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

/**
 * ОТКРИВАЩОТО СЪБИТИЕ · Стопанинът стои ПРЕДИ всичко останало (И97 т.8 · ADR-043).
 *
 * Затова всяко абсолютно броене по-долу е „толкова записа ПЛЮС откриващото".
 * Числото се пише така, а не наум, за да остане надписът верен: „два имота"
 * значи два имота, независимо колко събития стоят преди тях.
 */
const OTKRIVASHTOTO = 1;

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
    // Празният Журнал НЕ е празен: първото събитие е Стопанинът, и то влиза
    // при тръгването, преди човекът да е натиснал каквото и да е (ADR-043).
    proveri('в началото стои САМО откриващото събитие', await broySabitiya(p), OTKRIVASHTOTO);

    // ══ 60 · СТОПАНИНЪТ · първото събитие в Журнала (И97 т.8 · ADR-043) ═════
    razdel = '60 · Стопанинът';
    proveri('и то Е Стопанинът',
      await p.evaluate(async () => {
        const db = await new Promise((da) => {
          const z = indexedDB.open('masterbook');
          z.onsuccess = () => da(z.result);
        });
        const vsichki = await new Promise((da) => {
          const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
          z.onsuccess = () => da(z.result);
        });
        const parvo = vsichki.sort((a, b) => a.seq - b.seq)[0];
        return parvo ? `${parvo.type}|${parvo.seq}|${parvo.payload.imeyl}` : 'няма';
      }),
      'СтопанинЗаписан|1|vintexstroy@gmail.com');

    await naEkran(p, 'tablo', '.karta');
    proveri('Таблото го КАЗВА, а не го подразбира',
      await p.$eval('[data-pole="stopanin"] .chislo', (e) => e.textContent.trim()),
      'vintexstroy@gmail.com');
    proveri('и че това е влезлият',
      (await p.$eval('[data-pole="stopanin"] .pod', (e) => e.textContent)).includes('това си ти'),
      true);
    await naEkran(p, 'imoti', '#forma-imot');
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
    proveri('два имота', await broySabitiya(p), 2 + OTKRIVASHTOTO);

    // Наемателят нарочно носи опасен текст — минава ли през екранирането.
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: 'Домакинство', suma: '500,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Малинова · АП. № 1', koy: '<img src=x onerror=alert(1)>', suma: '300,00', sektor: 'naem-zhilishten', padezh: '5' });
    await dobaviNaem(p, { imot: 'Дианабад · ОФИС № 3', koy: 'Стройпласт ЕООД', suma: '1200,00', sektor: 'naem-targovski', padezh: '31' });
    proveri('пет събития', await broySabitiya(p), 5 + OTKRIVASHTOTO);

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
    proveri('нито един отказан наем не влезе', await broySabitiya(p), 5 + OTKRIVASHTOTO);

    // ══ 4 · начисляване ══════════════════════════════════════════════════
    razdel = '4 · начисляване';
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));
    proveri('осем събития след начисляване', await broySabitiya(p), 8 + OTKRIVASHTOTO);
    proveri('дължимо общо', await plochka(p, 'Дължимо общо'), '2 000,00 €');

    const vzemaniya = await redove(p, '.red.vzemane');
    const stroy = vzemaniya.find((r) => r[0]?.startsWith('Стройпласт'));
    proveri('падеж 31 във февруари става 28-и', stroy?.[2]?.startsWith('2026-02-28'), true);

    // втори път — нищо ново
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('вече е начислен'));
    proveri('второто натискане не добави събитие', await broySabitiya(p), 8 + OTKRIVASHTOTO);

    // ══ 5 · плащания, надплащане, сторно ═════════════════════════════════
    razdel = '5 · плащания';
    await plati(p, 'Стройпласт', '600,00', 'в брой', '2026-02-10');
    proveri('частично · остатък', await ostatak(p, 'Стройпласт'), '600,00 €');
    proveri('девет събития', await broySabitiya(p), 9 + OTKRIVASHTOTO);

    await plati(p, 'Стройпласт', '700,00', 'банка', '2026-02-15');
    proveri('надплатеното излиза от просрочените', await ostatak(p, 'Стройпласт'), 'НЯМА РЕД');
    proveri('дължимо общо след надплащане', await plochka(p, 'Дължимо общо'), '700,00 €');

    const zaStorno = (await redove(p, '.red.plashtane')).find((r) => r[3] === '700,00 €');
    proveri('плащането от 700,00 се вижда', Boolean(zaStorno), true);
    await sSabitie(p, () => p.click(`.red.plashtane:has-text("700,00") [data-storno]`));
    proveri('единайсет събития след сторно', await broySabitiya(p), 11 + OTKRIVASHTOTO);
    proveri('сторното върна остатъка', await ostatak(p, 'Стройпласт'), '600,00 €');

    await plati(p, 'Стройпласт', '600,00', 'банка', '2026-02-15');
    proveri('дванайсет събития', await broySabitiya(p), 12 + OTKRIVASHTOTO);
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
    proveri('събитията оцеляха', await broySabitiya(p), 12 + OTKRIVASHTOTO);
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
    proveri('веригата е цяла, 13 звена', await tekstNa(p, '.vest'),
      `Веригата е цяла · ${12 + OTKRIVASHTOTO} от ${12 + OTKRIVASHTOTO} звена.`);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 10 · износ ═══════════════════════════════════════════════════════
    razdel = '10 · износ';
    const [svaleno] = await Promise.all([p.waitForEvent('download'), p.click('#iznesi')]);
    const patyat = await svaleno.path();
    const izneseni = JSON.parse(await readFile(patyat, 'utf8'));
    proveri('изнесени 12 събития + откриващото', izneseni.length, 12 + OTKRIVASHTOTO);
    // ПЪРВОТО В ИЗНОСА Е СТОПАНИНЪТ · законът пътува с файла, не само с базата.
    proveri('и първото в износа е Стопанинът', izneseni[0].type, 'СтопанинЗаписан');
    proveri('всяко носи hash и prevHash', izneseni.every((x) => x.hash && x.prevHash !== undefined), true);

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
    for (const [koy, znak] of [['imoti', '#forma-imot'], ['pari', '#forma-nachisli'], ['smetki', '#forma-period']]) {
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
    razdel = '11б · поправката';
    await naEkran(p, 'imoti', '#forma-imot');

    // поправка на имот — наемът му НЕ се къса
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Дианабад") [data-popravi-imot]'));
    proveri('формата се напълни със стария адрес', await p.inputValue('#imot-adres'), 'Дианабад');
    await p.fill('#imot-adres', 'Дианабад 4');
    await p.fill('#imot-prichina', 'сбъркан номер');
    await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
    proveri('тринайсет събития', await broySabitiya(p), 13 + OTKRIVASHTOTO);
    const sledPopravka = (await redove(p, '.red.imot')).find((x) => x[0].startsWith('Дианабад'));
    proveri('новият адрес се вижда', sledPopravka?.[0], 'Дианабад 4 ОФИС № 3');
    proveri('наемът не се откачи', sledPopravka?.[1]?.startsWith('Стройпласт'), true);

    // поправка на наем — новата сума важи за напред
    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-popravi-naem]'));
    proveri('формата се напълни със старата сума', await p.inputValue('#naem-suma'), '1200,00');
    await p.fill('#naem-suma', '1300,00');
    await p.fill('#naem-prichina', 'вдигнат наем');
    await sSabitie(p, () => p.click('#forma-naem button[type=submit]'));
    proveri('четиринайсет събития', await broySabitiya(p), 14 + OTKRIVASHTOTO);
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
    proveri('петнайсет събития', await broySabitiya(p), 15 + OTKRIVASHTOTO);
    proveri(
      'наемът е прекратен',
      (await redove(p, '.red.naem')).find((x) => x[0].startsWith('Домакинство'))?.[4],
      'прекратен 2026-02-28',
    );
    proveri('месечният наем спадна', await plochka(p, 'Месечен наем'), '1 600,00 €');

    // вратарят отказва, докато нещо живо виси
    await deystvieSPrerisuvane(p, () => p.click('.red.imot:has-text("Малинова") [data-storno-imot]'));
    proveri('сторно на имот с наеми се отказва', (await tekstNa(p, '.vest')).includes('висят'), true);
    proveri('нищо не влезе', await broySabitiya(p), 15 + OTKRIVASHTOTO);

    await deystvieSPrerisuvane(p, () => p.click('.red.naem:has-text("Стройпласт") [data-storno-naem]'));
    proveri(
      'сторно на наем с вземания се отказва',
      (await tekstNa(p, '.vest')).includes('начислено вземане'),
      true,
    );
    proveri('пак нищо не влезе', await broySabitiya(p), 15 + OTKRIVASHTOTO);

    // сторно на начисление БЕЗ плащания — минава
    await naEkran(p, 'pari', '#forma-nachisli');
    proveri('дължимо преди сторното', await plochka(p, 'Дължимо общо'), '800,00 €');
    await sSabitie(p, () => p.click('.red.vzemane:has-text("Домакинство") [data-storno-vzemane]'));
    proveri('шестнайсет събития', await broySabitiya(p), 16 + OTKRIVASHTOTO);
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
    proveri('седемнайсет събития', await broySabitiya(p), 17 + OTKRIVASHTOTO);

    await zapishiRazhod(p, {
      potok: 'zaplati', sektor: 'pokupki-materiali', dostavchik: 'екип',
      opis: 'заплати февруари', suma: '2000,00', nachin: 'в брой', data: '2026-02-28', dokument: '',
    });
    proveri('осемнайсет събития', await broySabitiya(p), 18 + OTKRIVASHTOTO);

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
    proveri('деветнайсет събития', await broySabitiya(p), 19 + OTKRIVASHTOTO);
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
    proveri('двайсет и две събития', await broySabitiya(p), 22 + OTKRIVASHTOTO);
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
    proveri('двайсет и шест събития', await broySabitiya(p), 26 + OTKRIVASHTOTO);
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
      return n ? n.children[1].textContent.trim() : '';
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
        const t = db.transaction('sabitiya', 'readwrite');
        const hr = t.objectStore('sabitiya');
        hr.delete([akaunt, posledniyat - 1]);
        hr.delete([akaunt, posledniyat]);
        t.oncomplete = () => da(undefined);
        t.onerror = () => ne(t.error);
      });
      db.close();
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
    // Таблото на агента (ADR-026) И самото свързване с Клод (ADR-029) са
    // построени — затова етикетът „скоро" СЛЕЗЕ. Надпис „скоро" върху работещ
    // бутон е точно толкова лъжа, колкото бутон върху непостроено.
    proveri(
      'ИИ вече не носи етикет „скоро" — той е построен',
      (await tekstNa(p, '.vazm:has-text("Табло за агент")')).includes('скоро'),
      false,
    );
    proveri(
      'а Таблото казва честно чия е сметката за модела',
      (await p.evaluate(() => document.body.textContent)).includes('сметката за него идва'),
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

    // ══ 58 · ПЪТ №4 · ОБРАЗЕЦЪТ ОТ МОДЕЛА (ADR-041) ═══════════════════════
    //
    // `src/iznos/ot-model.ts` беше построен в резен 14 и оттогава го викаха
    // само тестовете — пътят „Създаване на таблица" нямаше бутон.
    razdel = '58 · Образецът от модела';
    proveri('секцията за образец стои под хедъра',
      Boolean(await p.$('[data-sektsiya=obrazets]')), true);
    proveri('и КАЗВА, че образецът е ЦЯЛ · махната колона го прави непознаваем',
      (await p.$eval('[data-sektsiya=obrazets]', (e) => e.textContent)).includes('непознаваем'), true);

    const predObrazets = await broySabitiya(p);
    await p.fill('#obrazets-redove', '5');
    const [obrazets] = await Promise.all([p.waitForEvent('download'), p.click('#svali-obrazets')]);
    // ИМЕТО НА ФАЙЛА Е АДРЕС, не надпис: моделът се казва „Банка ОББ", а
    // атрибутът `download` не оцелява с кирилица по този път — човекът получава
    // „download", „download (1)"… Затова името се преписва на латиница.
    proveri('името казва „образец" И кой модел е',
      obrazets.suggestedFilename(), `obrazets-Banka-OBB-${new Date().toISOString().slice(0, 10)}.xlsx`);
    // ПЪТЯТ „pishe" води до ФАЙЛ, не до записа: нищо не влиза в Журнала.
    proveri('образецът НЕ пише нищо в Журнала', await broySabitiya(p), predObrazets);
    proveri('и го КАЗВА след свалянето',
      (await tekstNa(p, '.vest')).includes('празни реда'), true);

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
    proveri('и разликата между тях', glavaNaStoynostta.includes('разлика'), true);
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
    await naEkran(p, 'gant', '#d-forma-delo');

    proveri('седмият екран носи неговото име',
      await p.$eval('.shapka h1', (e) => e.textContent.trim()), 'Управление');
    proveri('и подзаглавието е дословно негово',
      (await p.$eval('.shapka p', (e) => e.textContent)).includes('Времевия Ред в Делата'), true);
    // Празният екран КАЗВА и кой е (И98): дотук заглавието се рисуваше само
    // вътре в таблицата, а при нула дела таблица нямаше — празният личен
    // екран не казваше дори че е личен.
    proveri('празният екран го КАЗВА',
      (await p.$eval('.prazno', (e) => e.textContent)).includes('Място · Обект · Дело'), true);
    proveri('и се представя, вместо да мълчи',
      (await p.$eval('.prazno', (e) => e.closest('section').textContent)).includes('Времевия Ред'), true);

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

    // ══ 57 · ЗАКОНЪТ ЗА МЕНЮТАТА · живите речници (И97 · ADR-040) ══════════
    //
    // Речникът НЕ се пази отделно — той Е онова, което вече стои в делата.
    // Трите записани дела току-що го напълниха, без нито едно ново събитие.
    razdel = '57 · Менютата · речникът е от Журнала';
    proveri('полето „Място" носи СПИСЪК, а не само текст',
      await p.$eval('#d-myasto', (e) => e.getAttribute('list')), 'd-myasto-spisak');
    const mestaVSpisaka = await p.$$eval('#d-myasto-spisak option', (o) => o.map((x) => x.value));
    proveri('и в списъка стоят ЖИВИТЕ места, най-писаното горе',
      mestaVSpisaka, ['Малинова', 'Хисаря']);
    proveri('отговорниците също · речникът е на всяко поле',
      (await p.$$eval('#d-otgovornik-spisak option', (o) => o.map((x) => x.value))).length, 3);
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
      await p.$eval('#d-myasto', (e) => e.checkValidity()), true);

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
      e.value = 'Хисаря';
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
        return Boolean(t) && Boolean(d) && d.left >= t.right - 1;
      }), true);
    proveri('носи днешната линия', await p.$$eval('.diagrama-dnes', (e) => e.length), 1);
    proveri('лентите са ленти на време, не клетки',
      await p.$$eval('.diagrama-lenta', (e) => e.length), 3);
    proveri('и всяка носи title за четец на екран',
      await p.$eval('.diagrama-lenta title', (e) => e.textContent.includes('→')), true);

    // Бутонът СКРИВА, не разменя — таблицата остава и в двете състояния.
    await deystvieSPrerisuvane(p, () => p.click('#kam-diagrama'));
    proveri('скрита диаграма НЕ отнема таблицата',
      await p.$$eval('.gant-lenta', (e) => e.length), 3);
    proveri('и диаграмата наистина я няма', await p.$$eval('svg.diagrama', (e) => e.length), 0);
    await deystvieSPrerisuvane(p, () => p.click('#kam-diagrama'));
    proveri('и се връща с бутон', await p.$$eval('svg.diagrama', (e) => e.length), 1);

    // БУТОНЪТ СЕГА · подрежда, не решава.
    const predSega = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#sega'));
    proveri('СЕГА не пипа нито едно дело', await broySabitiya(p), predSega);
    proveri('СЕГА филтрира по спешно и важно',
      await p.$eval('#f-otsenka', (e) => e.value), 'спешно-важно');

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
      (await p.$$eval('#d-myasto-spisak option', (o) => o.map((x) => x.value))).includes('Банишора'), true);

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
      r.map((x) => x.children[2].textContent.replace(/[^0-9,]/g, '').replace(',', '.')).map(Number));
    const sboratDolu = await p.$eval('.red.po-imot.sbor', (e) =>
      Number(e.children[2].textContent.replace(/[^0-9,]/g, '').replace(',', '.')));
    proveri('сборът затваря с колоната над него',
      Math.abs(kolonaNachisleno.reduce((a, b) => a + b, 0) - sboratDolu) < 0.02, true);

    razdel = '58 · Още огледала · по контрагент';
    await naEkran(p, 'pari', '[data-sektsiya=po-kontragent]');
    proveri('изгледът „По контрагент" се показва',
      (await p.$$eval('.red.po-kontragent', (r) => r.length)) > 0, true);
    proveri('и КАЗВА кой как плаща · числото, което не се вижда отникъде другаде',
      (await p.$eval('[data-tablitsa=po-kontragent]', (e) => e.textContent)).includes('Плаща'), true);

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
    const izmeri = (vid, selektor) => p.evaluate(async (zhest) => {
      document.querySelector('.shapka').dataset['beleg'] = 'staro';
      const t0 = performance.now();
      const el = document.querySelector(zhest.selektor);
      if (zhest.vid === 'tarsi') {
        el.value = 'с';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.click();
      }
      await new Promise((gotovo) => {
        const nablyudatel = new MutationObserver(() => {
          const shapka = document.querySelector('.shapka');
          if (shapka && !shapka.dataset['beleg']) {
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
    razdel = '38 · Малинова Долина';
    await naEkran(p, 'stoynost', '#cheti-ploshti');
    await p.setInputFiles('#fayl-ploshti', new URL('../primeri/tseni-md.csv', import.meta.url).pathname);
    await p.waitForFunction(() => document.body.textContent.includes('Прочетени 45'));
    const vestMD = (await tekstNa(p, '.vest')).replace(/[\s\u00A0\u202F]/g, '');
    proveri('45-те обекта влизат · разликата е нула',
      vestMD.includes('Прочетени45обекта→45реда·разлика0'), true);
    proveri('листата носи цените · сбор 2 118 800,00 €',
      vestMD.includes('цениза25обекта·сбор2118800,00€'), true);
    proveri('и разминатите площи на файла се КАЗВАТ, не се преглъщат',
      vestMD.includes('площитенафайланесесверяват'), true);

    // ВПИСВАНЕТО: обектите стават Имоти, задачите — Дела, през Вратата
    const predMD = await broySabitiya(p);
    await p.click('#vpishi-obekti');
    await p.waitForFunction(() => document.body.textContent.includes('Вписано:'));
    const vestVpis = await tekstNa(p, '.vest');
    proveri('вписани са 45 имота', vestVpis.includes('45 имота'), true);
    proveri('и 79 дела (4 на сградата + 3 на всеки непродаден)',
      vestVpis.includes('79 дела'), true);
    proveri('всяко е събитие в Журнала', await broySabitiya(p), predMD + 45 + 79);

    // ПОВТОРНОТО натискане НЕ удвоява — казва „вече бяха вписани"
    await p.click('#vpishi-obekti');
    await p.waitForFunction(() => document.body.textContent.includes('не се удвояват'));
    proveri('повторното вписване не пише нищо', await broySabitiya(p), predMD + 45 + 79);

    // обектите се ДВИЖАТ в другите таблици: Имоти ги вижда
    await naEkran(p, 'imoti', '#forma-imot');
    await p.fill('[data-tarsi-tablitsa="imoti"]', 'Малинова Долина');
    await p.waitForFunction(() =>
      document.querySelectorAll('.red.imot').length === 45);
    proveri('Имоти показва 45-те обекта на Малинова Долина',
      await p.$$eval('.red.imot', (r) => r.length), 45);
    await deystvieSPrerisuvane(p, () => p.click('[data-filtar-izchisti-vsichko="imoti"]'));

    // и Управление вижда делата — с Акт 16 към самата сграда
    await naEkran(p, 'gant', '#d-forma-delo');
    const gantTekst = await p.evaluate(() => document.body.textContent);
    proveri('Гант носи Акт 16', gantTekst.includes('Акт 16'), true);
    proveri('и огледите за продажба или наем', gantTekst.includes('Оглед за продажба или Наем'), true);

    // ══ 39 · диаграмите в Сметки (И92 т.4) ══════════════════════════════════
    razdel = '39 · диаграмите в Сметки';
    await naEkran(p, 'smetki', '#forma-period');
    const smetkiTekst = await p.evaluate(() => document.body.textContent);
    proveri('Сметки носи копието от Управление',
      smetkiTekst.includes('Делата · копието от Управление'), true);
    proveri('и таблицата с оцветени полета е там',
      smetkiTekst.includes('Управление на Времевия Ред в Делата'), true);
    proveri('диаграмата на Ганта стои до копието',
      await p.$$eval('svg.diagrama:not(.stalbove)', (r) => r.length), 1);
    proveri('копието се ЧЕТЕ — няма нито един сгъвач',
      await p.$$eval('#ekran button.sgavach', (r) => r.length), 0);
    // И95 обърна старото „няма форма": „да създаваш както като в Управление".
    proveri('и формата за дело Е там (И95) — един механизъм, два екрана',
      Boolean(await p.$('#d-forma-delo')), true);

    // диаграмата в Отчетите: 12 месеца, стълбовете носят числата си
    proveri('Отчетите носят стълбовете на месеците',
      await p.$$eval('svg.stalbove .stalbove-mesets', (r) => r.length), 12);

    // СВЕРКА ВХОД↔ИЗХОД НА САМИЯ СТЪЛБ: разход с ДНЕШНА дата → стълбът на
    // текущия месец расте ТОЧНО с него. Не се стъпва на закованите стари
    // дати — те излизат от 12-месечния прозорец с времето (урокът от §24).
    const stalbPredi = await p.$eval('svg.stalbove .stalbove-mesets:last-of-type',
      (g) => Number(g.dataset.razhodSt));
    await zapishiRazhod(p, {
      potok: 'fakturi', sektor: 'pokupki-uslugi', dostavchik: 'проба',
      opis: 'проба на стълба', suma: '33,00', nachin: 'банка',
      data: denOtDnes(0), dokument: '9001',
    });
    proveri('стълбът на текущия месец расте точно с новия разход',
      await p.$eval('svg.stalbove .stalbove-mesets:last-of-type', (g) => Number(g.dataset.razhodSt)),
      stalbPredi + 3300);

    // ══ 40 · формулната колона (И92 т.8–9) ═══════════════════════════════════
    razdel = '40 · формулната колона';
    await naEkran(p, 'nastroyki', '#litse-hedari');
    await p.selectOption('#izbor-hedar', { index: 1 });
    await p.waitForSelector('.red.redaktor');

    await deystvieSPrerisuvane(p, () => p.click('#nova-kolona'));
    proveri('полетата на формулата стоят СКРИТИ, докато видът не е формулна',
      await p.$eval('#mvsto-za-formula', (e) => e.hidden), true);
    await p.selectOption('#kolona-vid', 'formula');
    await p.waitForFunction(() => document.getElementById('mvsto-za-formula')?.hidden === false);
    proveri('изборът „формулна" ги показва',
      await p.$eval('#mvsto-za-formula', (e) => e.hidden), false);

    // операндите са колоните на СЪЩАТА таблица, с вида си до името
    const operandi = await p.$$eval('#nova-operand1 option', (o) => o.map((x) => x.textContent.trim()));
    proveri('операндите казват вида на всяка колона',
      operandi.some((t) => t.includes('·')), true);

    // Операндите се избират по ВИД, както би направил човек: сборът иска две
    // колони в евро. Избор „по ред" би хванал дата и текст — и формулата пада
    // с думи, вместо да се запише (точно каквото проверката иска да НЕ става).
    const vEvro = await p.$$eval('#nova-operand1 option', (o) =>
      o.filter((x) => x.textContent.includes('евро')).map((x) => x.value));
    proveri('таблицата има поне две колони в евро за сбор', vEvro.length >= 2, true);
    await p.fill('#kolona-ime', 'Общо с ДДС');
    await p.selectOption('#nova-deystvie', 'sbor');
    await p.selectOption('#nova-operand1', vEvro[0]);
    await p.selectOption('#nova-operand2', vEvro[1]);
    await sSabitie(p, () => p.click('#forma-kolona button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.redaktor')].some((r) => r.textContent.includes('формула')));

    const redoveNaHedara = await redove(p, '.red.redaktor');
    const formulniyat = redoveNaHedara.find((r) => r.some((k) => k.includes('формула')));
    proveri('формулната колона казва СМЕТКАТА си в реда',
      Boolean(formulniyat?.some((k) => k.includes('сбор('))), true);
    proveri('и се вижда като ЗАТВОРЕНА — в нея не се пише',
      formulniyat?.[1], 'затворена');

    // ПРАВИЛОТО: формулната колона няма „Запиши" и няма „Премахни" — тя е сметка
    const broyKoloni = redoveNaHedara.length;
    proveri('няма бутон „Запиши" за формулната колона',
      await p.$(`[data-zapishi-kolona="${broyKoloni - 1}"]`), null);
    proveri('нито „Премахни"',
      await p.$(`[data-premahni-kolona="${broyKoloni - 1}"]`), null);

    // СМЯНАТА · само Стопанинът, и е ново събитие (правило 1)
    await deystvieSPrerisuvane(p, () => p.click(`[data-smeni-formula="${broyKoloni - 1}"]`));
    await p.waitForSelector('#forma-formula');
    await p.selectOption('#forma-formula [name=deystvie]', 'razlika');
    await sSabitie(p, () => p.click('#forma-formula button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.redaktor')].some((r) => r.textContent.includes('разлика(')));
    proveri('смяната на формулата се вижда в реда',
      (await redove(p, '.red.redaktor')).some((r) => r.some((k) => k.includes('разлика('))), true);

    // и Описът на Подредба носи формулата — „всичко именувано е ред"
    await deystvieSPrerisuvane(p, () => p.click('#litse-opis'));
    await p.waitForSelector('.red.opis');
    proveri('Описът казва формулата на колоната',
      (await redove(p, '.red.opis')).some((r) => r[3]?.includes('формула: разлика(')), true);

    // ══ 41 · ИИ-таблото (И92 т.10) ═══════════════════════════════════════════
    razdel = '41 · ИИ-таблото';
    await naEkran(p, 'ii', '#nov-agent');

    // ТРОЙНИЯТ КОНТРОЛ · три плочки, не една (правило 15)
    proveri('правото се вижда само за себе си', await plochka(p, 'Право'), 'дава');
    proveri('отметката — също', await plochka(p, 'Отметка'), 'включена');
    proveri('и кранът е трети', await plochka(p, 'Кран'), 'отворен');

    // ЗАКОНИТЕ · изброени поименно, всеки със своя дом
    proveri('законите са изброени поименно',
      (await p.$$eval('[data-zakon]', (r) => r.length)) >= 6, true);
    const zakonite = await p.evaluate(() => document.body.textContent);
    proveri('и първият е, че агентът не пише',
      zakonite.includes('Агентът не пише в Журнала'), true);

    // НОВ АГЕНТ · протоколът иска забрани поименно и ТРИ умения
    await deystvieSPrerisuvane(p, () => p.click('#nov-agent'));
    await p.fill('#agent-ime', 'Счетоводителят');
    await p.fill('#agent-otgovornik', 'vintexstroy@gmail.com');
    await p.fill('#agent-rabota', 'Чете Сметки, сверява ДДС и предлага поправки.');
    await p.check('[data-obhvat="smetki"]');
    // ЗАБРАНИ ОТ ПРАЗНИ ДУМИ протокол не правят (правило 18). Полето е
    // `required`, значи браузърът вече лови ПРАЗНОТО — тук се проверява
    // онова, което само домейнът вижда: изписани интервали.
    await p.fill('#agent-zabrani', '   ');
    const predAgenta = await broySabitiya(p);
    await p.click('#forma-agent button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-agent')?.textContent !== '');
    proveri('без забрани поименно протокол няма',
      (await tekstNa(p, '#greshka-agent')).includes('ИЗБРОЕНИ ПОИМЕННО'), true);
    proveri('и нищо не влиза в Журнала', await broySabitiya(p), predAgenta);

    await p.fill('#agent-zabrani', 'не пише в Журнала · не вижда Управление');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForSelector('#vklyuchi-agenta');
    proveri('агентът се ражда ИЗКЛЮЧЕН',
      (await redove(p, '.red.agent'))[0]?.[2], 'изключен');

    // УМЕНИЯТА · характеристиката е умение, активирано ПОСТОЯННО (негова поръчка)
    const umeniyaNachalo = await redove(p, '.red.umenie');
    proveri('характеристиката стои в СЪЩИЯ списък като уменията', umeniyaNachalo.length, 1);
    proveri('и е постоянна', umeniyaNachalo[0]?.[0]?.includes('постоянно'), true);
    proveri('постоянното няма бутон за изключване',
      await p.$('[data-prevklyuchi-umenie="harakteristika"]'), null);

    const zaDobavyane = [
      ['matematika', 'матрици, данни и проверки'],
      ['masterbook-data', ''],
      ['refresh', ''],
    ];
    for (let i = 0; i < zaDobavyane.length; i += 1) {
      await p.fill('#umenie-ime', zaDobavyane[i][0]);
      await p.fill('#umenie-tekst', zaDobavyane[i][1]);
      // Уменията вече минават през КОД ОТ ПИСМО (И94 т.1) — и тук, и навсякъде.
      await sKod(p, () => p.click('#forma-umenie button[type=submit]'));
      await p.waitForFunction((n) => document.querySelectorAll('.red.umenie').length === n, i + 2);
    }
    proveri('добавените умения се редят', (await redove(p, '.red.umenie')).length, 4);
    proveri('и новото се ражда ВКЛЮЧЕНО',
      (await redove(p, '.red.umenie'))[1]?.[2], 'включено');

    // ИЗКЛЮЧЕНОТО изчезва от промпта — не е надпис.
    //
    // Промптът стои в СГЪНАТО `<details>`, а сгънатото няма `innerText` —
    // то е празен низ, в който всяка проверка „не съдържа" минава сама.
    // Затова тук се чете `textContent`: то вижда и скритото.
    const promptat = () => p.$eval('#promptat', (e) => e.textContent);
    await sKod(p, () => p.click('[data-prevklyuchi-umenie="matematika"]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes('изключено')));
    proveri('изключеното умение изчезва от промпта',
      (await promptat()).includes('matematika'), false);
    await sKod(p, () => p.click('[data-prevklyuchi-umenie="matematika"]'));
    await p.waitForFunction(() =>
      document.getElementById('promptat')?.textContent.includes('matematika') === true);
    proveri('и се връща със същото действие',
      (await promptat()).includes('matematika'), true);

    // ВКЛЮЧВАНЕТО пита, показва рисковете, и НЕ става без изричната отметка
    await deystvieSPrerisuvane(p, () => p.click('#vklyuchi-agenta'));
    await p.waitForSelector('#saglasieto');
    const saglasie = await tekstNa(p, '#saglasieto');
    proveri('рисковете са ОПИСАНИ, не премълчани',
      saglasie.includes('Подхвърлен текст') && saglasie.includes('Умора от съгласия'), true);
    proveri('отметката НЕ е сложена предварително',
      await p.$eval('#razbrah', (e) => e.checked), false);

    const predVklyuchvane = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.click('#potvardi-vklyuchvane'));
    proveri('без отметка не се включва', await broySabitiya(p), predVklyuchvane);
    proveri('и се казва защо',
      (await p.evaluate(() => document.body.textContent)).includes('прочетох рисковете'), true);

    await deystvieSPrerisuvane(p, () => p.click('#vklyuchi-agenta'));
    await p.check('#razbrah');
    await sSabitie(p, () => p.click('#potvardi-vklyuchvane'));
    proveri('с отметка — включва се', (await redove(p, '.red.agent'))[0]?.[2], 'включен');

    // ПРЕДЛОЖЕНИЕТО · чака моята дума, и сверката се вижда, дори нулева
    await p.fill('#zadacha-tekst', 'сверѝ ДДС за август');
    await p.fill('#zadacha-kakvo', 'Разлика от 12,00 € в акумулатора за услуги.');
    await p.fill('#zadacha-vhod', '1200,00');
    await p.fill('#zadacha-izhod', '1212,00');

    // ЗАДАЧАТА назовава ТРИ умения (правило 25) — с две не тръгва
    await p.selectOption('#zadacha-umenie1', 'matematika');
    await p.selectOption('#zadacha-umenie2', 'refresh');
    const predZadachata = await broySabitiya(p);
    await p.click('#forma-zadacha button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-zadacha')?.textContent !== '');
    proveri('две умения не стигат за задача',
      (await tekstNa(p, '#greshka-zadacha')).includes('ТРИ умения'), true);
    proveri('и предложението не влиза в Журнала', await broySabitiya(p), predZadachata);

    await p.selectOption('#zadacha-umenie3', 'masterbook-data');
    await sSabitie(p, () => p.click('#forma-zadacha button[type=submit]'));
    await p.waitForSelector('.red.predlozhenie');
    const predlozhenieto = await redove(p, '.red.predlozhenie');
    proveri('предложението чака', predlozhenieto[0]?.[4]?.includes('чака'), true);
    proveri('и разликата се вижда', predlozhenieto[0]?.[3], '12,00 €');
    proveri('разминаването се брои', await plochka(p, 'Разминавания'), '1');

    // ПРИСЪДАТА · записва ЧОВЕКЪТ, и предложението остава в Журнала
    await sSabitie(p, () => p.click('[data-priemi]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.predlozhenie')].some((r) => r.textContent.includes('прието')));
    proveri('приемането е ново събитие, не редакция',
      (await redove(p, '.red.predlozhenie')).length, 1);
    proveri('и присъдата носи МОЯ имейл',
      (await tekstNa(p, '.red.predlozhenie')).includes('vintexstroy@gmail.com'), true);
    proveri('приетите се броят', await plochka(p, 'Приети'), '1');

    // ══ 42 · табовете и секциите (И92 т.9) ═══════════════════════════════════
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
      p.click('.karta:has-text("Наемите") [data-sektsiya-svarzhi]'));
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
      !document.querySelector('[data-grupa="diagrama"]')?.hidden);
    await p.selectOption('#sektsiya-iztochnik', 'mesetsi');
    await sSabitie(p, () => p.click('#forma-sektsiya button[type=submit]'));
    proveri('графичната секция носи истинска диаграма',
      await p.$$eval('svg.stalbove', (r) => r.length), 1);

    // МАХАНЕ · връзката пада с нея, а другата секция остава
    await deystvieSPrerisuvane(p, () => p.selectOption('#izbor-tab', 'smetki'));
    const predMahane = await broySabitiya(p);
    await sSabitie(p, () =>
      p.click('.karta:has-text("Обектите") [data-sektsiya-mahni]'));
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
        r.some((x) => x.textContent.includes('Дела') && x.textContent.includes('Мястото'))), true);

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

    // ══ 44 · непроменимият протокол и картата (И94 т.6) ══════════════════════
    razdel = '44 · протоколът и картата';
    await naEkran(p, 'ii', '#nov-agent');

    // КАРТАТА · „къде вижда и къде редактира"
    proveri('картата на достъпа се вижда след създаването',
      (await p.evaluate(() => document.body.textContent)).includes('Къде вижда · къде редактира'), true);
    proveri('РЕДАКТИРА е нула — и стои като ЧИСЛО',
      await p.$eval('[data-redaktira]', (e) => e.textContent.trim()), '0');
    proveri('картата брои колони от истинските хедъри',
      (await p.$$eval('[data-tablitsa="karta-dostap"] .red', (r) => r.length)) > 0, true);
    proveri('и казва през кой имейл се чете',
      (await p.evaluate(() => document.body.textContent)).includes('не вижда повече от отговорника си'), true);

    // ВТОРИЯТ ИМЕЙЛ · неговата проба
    await deystvieSPrerisuvane(p, () => p.click('#nov-agent'));
    await p.fill('#agent-ime', 'Пробният');
    await p.fill('#agent-otgovornik', 'ivaylo85petkov@gmail.com');
    await p.fill('#agent-rabota', 'Проба с втория имейл — чете Пари и предлага.');
    await p.check('[data-obhvat="pari"]');
    await p.fill('#agent-zabrani', 'не пише в Журнала');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.agent')].some((r) => r.textContent.includes('Пробният')));
    proveri('вторият имейл е отговорник на пробния агент',
      (await redove(p, '.red.agent')).some((r) => r.includes('ivaylo85petkov@gmail.com')), true);

    // НЕПРОМЕНИМОТО · екранът го КАЗВА поименно
    proveri('непроменимото е изброено поименно',
      (await p.evaluate(() => document.body.textContent)).includes('НЕПРОМЕНИМО след създаване'), true);

    // ЗАКРИВАНЕТО · „трие се агента и се прави нов"
    const predZakrivane = await broySabitiya(p);
    await sSabitie(p, () => p.click('#zakriy-agenta'));
    proveri('закриването е събитие, не триене', await broySabitiya(p), predZakrivane + 1);
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.agent')].some((r) => r.textContent.includes('ЗАКРИТ')));
    proveri('закритият остава като СЛЕДА',
      (await redove(p, '.red.agent')).some((r) => r.some((x) => x.includes('ЗАКРИТ'))), true);
    proveri('и формата за нов се отваря веднага — това е пътят',
      Boolean(await p.$('#forma-agent')), true);

    // ══ 45 · задачите, потвърждението с имейл и пускането (И94 т.1) ══════════
    razdel = '45 · задачите и потвърждението';

    // Агентът от §44 е ЗАКРИТ; задача се възлага на ЖИВ. Прави се нов.
    await p.fill('#agent-ime', 'Задачарят');
    await p.fill('#agent-otgovornik', 'ivaylo85petkov@gmail.com');
    await p.fill('#agent-rabota', 'Чете Пари, следи разминаванията и предлага.');
    await p.check('[data-obhvat="pari"]');
    await p.fill('#agent-zabrani', 'не пише в Журнала');
    await sSabitie(p, () => p.click('#forma-agent button[type=submit]'));
    await p.waitForSelector('#forma-nova-zadacha');

    // УМЕНИЯТА · и те минават през код от писмо (негови думи, И94 т.1)
    razdel = '45а · кодът пази уменията';
    const predUmenie = await broySabitiya(p);
    await p.fill('#umenie-ime', 'matematika');
    await p.fill('#umenie-tekst', 'матрици, данни и проверки');
    await p.click('#forma-umenie button[type=submit]');
    await p.waitForSelector('#potvarzhdenieto');
    proveri('умението чака КОД, преди да влезе', await broySabitiya(p), predUmenie);
    proveri('кодът НЕ е изписан на екрана',
      /\b\d{6}\b/.test(await p.$eval('#potvarzhdenieto', (e) => e.innerText)), false);

    const pismoto1 = await adresNaPismoto(p);
    proveri('писмото тръгва към отговорника',
      pismoto1.startsWith('mailto:ivaylo85petkov%40gmail.com'), true);

    // СГРЕШЕНИЯТ код се отказва С ДУМИ и не пуска нищо
    await p.fill('#kod', '000000');
    await p.click('#potvardi-koda');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-kod')?.textContent ?? '').trim().length > 0);
    proveri('сгрешеният код казва „не съвпада"',
      (await tekstNa(p, '#greshka-kod')).includes('не съвпада'), true);
    proveri('и нищо не е влязло в Журнала', await broySabitiya(p), predUmenie);

    // ВЕРНИЯТ код пуска действието — и то влиза като ЕДНО събитие
    await p.fill('#kod', kodOtPismoto(pismoto1));
    await sSabitie(p, () => p.click('#potvardi-koda'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes('matematika')));
    proveri('верният код записва умението', await broySabitiya(p), predUmenie + 1);

    for (const ime of ['masterbook-data', 'doklad']) {
      await p.fill('#umenie-ime', ime);
      await sKod(p, () => p.click('#forma-umenie button[type=submit]'));
      await p.waitForFunction((n) =>
        [...document.querySelectorAll('.red.umenie')].some((r) => r.textContent.includes(n)), ime);
    }

    // ЗАДАЧАТА · разписание и ТРИ умения (правило 25)
    razdel = '45б · задачата и разписанието';
    const predZadacha = await broySabitiya(p);
    await p.fill('#nova-zadacha-kakvo', 'сверѝ ДДС за август по акумулатори');
    await p.selectOption('#nova-zadacha-razpisanie', 'sedmichna');
    await p.selectOption('#nova-zadacha-den', '1');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    await sSabitie(p, () => p.click('#forma-nova-zadacha button[type=submit]'));
    await p.waitForSelector('.red.zadacha');
    proveri('задачата влиза в Журнала', await broySabitiya(p), predZadacha + 1);
    proveri('и се ражда НЕПОТВЪРДЕНА',
      (await p.$eval('.red.zadacha', (e) => e.innerText)).includes('чака код'), true);

    // ДВЕ УМЕНИЯ вместо три · правило 25 отказва С ДУМИ
    await p.fill('#nova-zadacha-kakvo', 'непълна задача');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'doklad');
    const predNepalna = await broySabitiya(p);
    await p.click('#forma-nova-zadacha button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-nova-zadacha')?.textContent ?? '').includes('ТРИ умения'));
    proveri('две умения не правят задача', await broySabitiya(p), predNepalna);

    // ПОТВЪРЖДАВАНЕТО на задачата · пак код от писмо
    razdel = '45в · потвърждаването на задачата';
    await p.click('[data-potvardi-zadacha]');
    await p.waitForSelector('#otvori-pismoto');
    const pismoto2 = await adresNaPismoto(p);
    proveri('писмото казва КАКВО се потвърждава',
      decodeURIComponent(pismoto2).includes('сверѝ ДДС за август'), true);
    await p.fill('#kod', kodOtPismoto(pismoto2));
    await sSabitie(p, () => p.click('#potvardi-koda'));
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.red.zadacha')].some((r) => r.innerText.includes('потвърдена')));
    proveri('потвърдената задача показва бутона „Пусни с Клод"',
      Boolean(await p.$('[data-pusni-zadacha]')), true);
    proveri('и седмичната се изключва',
      Boolean(await p.$('[data-prevklyuchi-zadacha]')), true);

    // ПОСТОЯННАТА е НОРМА · бутонът „Изключи" ЛИПСВА, не отказва
    razdel = '45г · постоянната е норма';
    await p.fill('#nova-zadacha-kakvo', 'дневната норма на агента');
    await p.selectOption('#nova-zadacha-razpisanie', 'postoyanna');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    await sSabitie(p, () => p.click('#forma-nova-zadacha button[type=submit]'));
    await p.waitForFunction(() => document.querySelectorAll('.red.zadacha').length === 2);
    const redNorma = '.red.zadacha:has-text("дневната норма")';
    await sKod(p, () => p.click(`${redNorma} [data-potvardi-zadacha]`));
    await p.waitForFunction(() =>
      ([...document.querySelectorAll('.red.zadacha')]
        .find((r) => r.innerText.includes('дневната норма'))?.innerText ?? '').includes('потвърдена'));
    proveri('постоянната НЯМА бутон за изключване — той липсва, не отказва',
      await p.$(`${redNorma} [data-prevklyuchi-zadacha]`), null);
    proveri('и се пада ДНЕС, каквото и да е днес',
      (await p.$eval(redNorma, (e) => e.innerText)).includes('норма'), true);

    // СРОКЪТ иска и двата си края
    razdel = '45д · срокът иска два края';
    await p.fill('#nova-zadacha-kakvo', 'срок без край');
    await p.selectOption('#nova-zadacha-razpisanie', 'srok');
    await p.fill('#nova-zadacha-ot', '2026-09-01');
    await p.selectOption('#nova-zadacha-umenie1', 'matematika');
    await p.selectOption('#nova-zadacha-umenie2', 'masterbook-data');
    await p.selectOption('#nova-zadacha-umenie3', 'doklad');
    const predSrok = await broySabitiya(p);
    await p.click('#forma-nova-zadacha button[type=submit]');
    await p.waitForFunction(() =>
      (document.querySelector('#greshka-nova-zadacha')?.textContent ?? '').includes('и начало, и край'));
    proveri('срок без край не става задача', await broySabitiya(p), predSrok);

    // ПУСКАНЕТО С КЛОД · и то иска свой код, защото харчи и излиза НАВЪН
    razdel = '45е · пускането и ключът';
    await p.click('[data-pusni-zadacha]');
    await p.waitForSelector('#potvarzhdenieto');
    proveri('пускането с Клод също иска код',
      Boolean(await p.$('#potvarzhdenieto')), true);
    proveri('и писмото го казва',
      decodeURIComponent(await adresNaPismoto(p)).includes('пускане на агент'), true);
    await deystvieSPrerisuvane(p, () => p.click('#otkazhi-koda'));
    proveri('отказът маха искането', await p.$('#potvarzhdenieto'), null);

    // КЛЮЧЪТ ЗА КЛОД · местен и казан честно
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('ключ'));
    proveri('без ключ екранът го КАЗВА',
      (await tekstNa(p, '#klod-sastoyanie')).includes('няма ключ'), true);
    const predKlyuchKlod = await broySabitiya(p);
    await p.fill('#klod-klyuch', 'sk-ant-proba-1234');
    await p.click('#zapishi-klyuch-klod');
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('стои'));
    proveri('ключът се вижда само с опашката си',
      (await tekstNa(p, '#klod-sastoyanie')).includes('…1234'), true);
    proveri('и в Журнала НЕ влиза нищо', await broySabitiya(p), predKlyuchKlod);
    // Обхожда се ЦЯЛОТО хранилище: изтичане в паметта на екрана или в печата
    // на износа щеше да мине незабелязано.
    proveri('ключът не е изтекъл в друго гнездо на хранилището',
      await p.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k !== 'masterbook:klod-klyuch')
          .some((k) => (localStorage.getItem(k) ?? '').includes('sk-ant-proba'))), false);
    await p.click('#zabravi-klyuch-klod');
    await p.waitForFunction(() =>
      (document.querySelector('#klod-sastoyanie')?.textContent ?? '').includes('няма ключ'));
    proveri('и „забрави го" го маха', await p.evaluate(() =>
      localStorage.getItem('masterbook:klod-klyuch')), null);

    // ══ 46 · всички потоци през всички акумулатори (И94 т.7) ═════════════════
    //
    // Негови думи: „Изпълни всички потоци в акумолатора и направи сверки и
    // тестове." Тестът в `tests/potoci-akumulatori.test.ts` го прави в домейна;
    // ТУК се доказва другото — че ЕКРАНЪТ ги стига: че формата предлага всеки
    // поток и всеки сектор, че шестте реда се появяват и че четирите сверки
    // затварят, когато в месеца има ВСИЧКО, а не когато има едно.
    razdel = '46 · потоците и акумулаторите';
    await naEkran(p, 'smetki', '#forma-razhod');

    // Отделен месец, за да не се смесва с натрупаното от по-ранните раздели.
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('формата предлага ВСИЧКИ разходни потоци',
      (await p.$$eval('#razhod-potok option', (o) => o.map((x) => x.value))).sort().join('·'),
      'fakturi·krediti·zaplati');
    // Секторът се избира САМО за „Фактури" — трите, които носят ДДС. Заплатите
    // и кредитите взимат акумулатора си ОТ ПОТОКА, вместо да се крият в чужд:
    // затова тук са три, а на „вход" по-долу излизат ПЕТ.
    proveri('секторът предлага трите, които носят ДДС',
      (await p.$$eval('#razhod-sektor option', (o) => o.map((x) => x.value))).sort().join('·'),
      'pokupki-materiali·pokupki-uslugi·uslugi-stroitelni');

    // Шестте записа покриват трите разходни потока и петте разходни
    // акумулатора, а „покупки · услуги" носи ДВЕ ставки — така се вижда, че
    // ставката идва от РЕДА, а не от сектора (ADR-009).
    const razhoditeNaProbata = [
      ['zaplati', '', '3400,00', undefined, 'заплати за ноември'],
      ['krediti', '', '890,00', undefined, 'вноска по кредит'],
      ['fakturi', 'pokupki-materiali', '1440,00', '20', 'цимент'],
      ['fakturi', 'pokupki-uslugi', '654,00', '9', 'нощувки на екипа'],
      ['fakturi', 'uslugi-stroitelni', '2400,00', '20', 'подизпълнител'],
      ['fakturi', 'pokupki-uslugi', '300,00', '0', 'застраховка'],
    ];
    for (let i = 0; i < razhoditeNaProbata.length; i += 1) {
      const [potok, sektor, suma, stavka, opis] = razhoditeNaProbata[i];
      await zapishiRazhod(p, {
        potok, sektor, dostavchik: `Доставчик ${i + 1}`, opis, suma,
        nachin: 'банка', data: '2026-11-12', dokument: `Ф-${3000 + i}`, stavka,
      });
    }

    // Приходната страна · начислява се за СЪЩИЯ месец, за да има и „изход".
    // Начисляването живее в Пари; оттам се връщаме в Сметки за месеца.
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-11');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => !document.querySelector('#forma-nachisli button[type=submit]')?.disabled);
    // ПОТОЦИТЕ „КЕШ" и „БАНКА" · как парите реално са влезли. Едно вземане,
    // платено на две части, пълни и двата — и точно затова те НЕ се събират
    // с „Наеми": иначе едни и същи 300 € биха се броили два пъти.
    for (const [suma, nachin, data] of [['100,00', 'в брой', '2026-11-06'], ['200,00', 'банка', '2026-11-07']]) {
      await p.click('[data-plati]');
      await p.waitForSelector('#forma-plashtane');
      await p.fill('#pl-suma', suma);
      await p.selectOption('#pl-nachin', nachin);
      await p.fill('#pl-data', data);
      await sSabitie(p, () => p.click('#forma-plashtane button[type=submit]'));
    }

    await naEkran(p, 'smetki', '#forma-razhod');
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('шестте потока имат свой ред',
      await p.$$eval('.red.smetka', (r) => r.length), 6);
    proveri('и нито един не остана празен',
      await p.$$eval('.red.smetka', (r) =>
        r.every((x) => Number(x.querySelector('.suma')?.dataset.st ?? 0) > 0)), true);

    // СЕДЕМТЕ АКУМУЛАТОРА · всеки с движение, всеки на своята страна
    const akumulatorite = await p.$$eval('.red.dds', (r) =>
      r.map((x) => `${x.querySelector('.znachka')?.textContent.trim()}|${x.querySelector('b')?.textContent.trim()}`));
    proveri('приходните акумулатори са на страна „изход"',
      akumulatorite.filter((a) => a.startsWith('изход')).length >= 2, true);
    proveri('и петте разходни са на „вход"',
      new Set(akumulatorite.filter((a) => a.startsWith('вход')).map((a) => a.split('|')[1])).size, 5);
    proveri('един акумулатор с ДВЕ ставки дава ДВА реда',
      akumulatorite.filter((a) => a.endsWith('покупки · услуги')).length, 2);

    // ЧЕТИРИТЕ СВЕРКИ · всяка затваря, и нулата се ПОКАЗВА (правило 7)
    const SVERKI = '.red.sverka:not(.otchet-sverka)';
    proveri('четирите сверки са налице', await p.$$eval(SVERKI, (r) => r.length), 4);
    proveri('и всяка затваря',
      await p.$$eval(SVERKI, (r) =>
        r.every((x) => x.textContent.includes('затваря') && !x.textContent.includes('НЕ затваря'))), true);
    // Нулата се ПОКАЗВА, не се премълчава (правило 7): „няма разлика" трябва да
    // е различимо от „не е сверявано", затова клетката носи число, не празно.
    proveri('разликата се показва и когато е нула',
      await p.$$eval(SVERKI, (r) =>
        r.map((x) => (x.querySelectorAll('.suma')[2]?.textContent ?? '').replace(/[^\d,-]/g, ''))),
      ['0,00', '0', '0,00', '0']);

    // ══ 47 · счетоводният агент · пилотът на ADR-005 (резен 15б) ═════════════
    //
    // Негови думи: агентът „смята и предлага, и анализира финансовите
    // показатели и отчети — оценява, предлага и показва" (ADR-005 · И11), но
    // „не записва" (И12). Тук се доказва ЦЕЛИЯТ път: месецът става ТАБЛИЦА,
    // екранът показва какво напуска устройството, и навън НЕ излиза нито едно
    // име на наемател или доставчик.
    razdel = '47 · месецът за агента';
    await naEkran(p, 'smetki', '#forma-razhod');
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));

    proveri('месецът стои като ТАБЛИЦА, не като сборове',
      (await p.$$eval('.red.mesetsat', (r) => r.length)) > 0, true);

    const razdeli = await p.$$eval('.red.mesetsat', (r) =>
      [...new Set(r.map((x) => x.dataset.razdel))].sort());
    proveri('и носи трите раздела', razdeli.join('·'), 'akumulator·pokazatel·potok');
    proveri('шестте потока са всичките',
      await p.$$eval('.red.mesetsat[data-razdel="potok"]', (r) => r.length), 6);

    // Δ се СМЯТА · сравнява се с ПРЕДХОДНИЯ месец, а той тук е празен
    proveri('главата назовава предходния месец',
      (await p.$eval('.glava.mesetsat', (e) => e.innerText)).includes('2026-10'), true);
    const redFakturi = '.red.mesetsat:has-text("Фактури")';
    proveri('Δ на Фактури е точно сега − предходен',
      await p.$eval(redFakturi, (e) => {
        const s = Number(e.querySelectorAll('.suma')[0].dataset.st);
        const pr = Number(e.querySelectorAll('.suma')[1].dataset.st);
        return Number(e.querySelector('[data-delta-st]').dataset.deltaSt) === s - pr;
      }), true);
    proveri('и „от нула на нещо" НЯМА процент',
      (await p.$eval(redFakturi, (e) => e.innerText)).includes('%'), false);

    // ДОСЛОВНИЯТ текст, който получава моделът · сгънатото се чете с textContent
    const navan = await p.$eval('#mesetsat-tekst', (e) => e.textContent);
    proveri('текстът навън носи месеца и сравнението',
      navan.includes('МЕСЕЦ 2026-11') && navan.includes('сравнен с 2026-10'), true);
    proveri('носи и разделите с числата',
      navan.includes('Фактури') && navan.includes('Капитал'), true);
    proveri('сверките излизат С него, и нулата е ИЗПИСАНА',
      navan.includes('СВЕРКИ') && navan.includes('разлика 0.00'), true);
    proveri('и казва, че месецът е цял', navan.includes('Всички сверки затварят.'), true);

    // ГРАНИЦАТА НА ADR-029 · имената НЕ излизат
    for (const ime of ['Стройпласт', 'Домакинство', 'Доставчик 1', 'подизпълнител']) {
      proveri(`„${ime}" НЕ излиза навън`, navan.includes(ime), false);
    }
    proveri('екранът го КАЗВА, вместо да го крие',
      (await p.evaluate(() => document.body.textContent)).includes('Какво НЕ излиза'), true);

    // И таблицата НЕ пише нищо в Журнала — тя се СМЯТА при показване
    const predTablitsa = await broySabitiya(p);
    await p.fill('#smetki-period', '2026-10');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    await p.fill('#smetki-period', '2026-11');
    await deystvieSPrerisuvane(p, () => p.click('#forma-period button[type=submit]'));
    proveri('месецът се СМЯТА, не се записва', await broySabitiya(p), predTablitsa);



    // ══ 49 · чистата диаграма на коефициентите (И96 т.5 · т.6) ═══════════════
    //
    // Негови думи: „чиста диаграма БЕЗ таблица… всички коефициенти изредени с
    // формулата на един ред и под нея сметките за периода."
    razdel = '49 · коефициентите';
    await naEkran(p, 'smetki', '#koef-koefitsient');

    proveri('диаграмата стои и е БЕЗ таблица под себе си',
      await p.$$eval('svg.koef-diagrama', (e) => e.length), 1);
    proveri('формулата е НА ЕДИН РЕД',
      (await p.$eval('#formulata', (e) => e.textContent)).includes('\n'), false);
    proveri('и е истинска формула, не име',
      (await p.$eval('#formulata', (e) => e.textContent)).includes('='), true);
    proveri('параметрите се показват ПОД нея',
      (await p.$$eval('.red.koef-parametar', (r) => r.length)) >= 2, true);
    proveri('всички коефициенти са изредени',
      (await p.$$eval('.red.koef-red', (r) => r.length)) >= 8, true);
    proveri('и всеки носи формулата си',
      await p.$$eval('.red.koef-red .koef-formula', (r) => r.every((x) => x.textContent.includes('='))), true);

    // МЕСЕЧНИТЕ се появяват САМО при стъпка месец
    proveri('при месец събираемостта я ИМА',
      Boolean(await p.$('.red.koef-red[data-koef="sabiraemost"]')), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'godina'));
    proveri('при година събираемостта я НЯМА',
      await p.$('.red.koef-red[data-koef="sabiraemost"]'), null);
    proveri('и екранът КАЗВА защо',
      (await p.evaluate(() => document.body.textContent)).includes('нямат смисъл извън месец'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'mesets'));

    // ПРИРАВНЯВАНЕТО · трите отговора, видими на екрана
    const godishni = await p.$$eval('.red.koef-red', (r) =>
      r.map((x) => `${x.dataset.koef}:${x.querySelector('.znachka')?.textContent.trim()}`));
    proveri('сумата се приравнява', godishni.includes('noi:да'), true);
    proveri('маржът НЕ ТРЯБВА да се приравнява', godishni.includes('marzh:не трябва'), true);
    proveri('ликвидността НЕ МОЖЕ', godishni.includes('likvidnost:не може'), true);

    // Отметката „към година" е ИЗКЛЮЧЕНА за онова, което не се приравнява
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'marzh'));
    proveri('при марж отметката е заключена',
      await p.$eval('#koef-godishna', (e) => e.disabled), true);
    proveri('и казва ЗАЩО, вместо само да не работи',
      (await p.$eval('#zashto-priravnyavane', (e) => e.textContent)).includes('НЕ зависи от периода'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'noi'));
    proveri('при NOI отметката се отключва',
      await p.$eval('#koef-godishna', (e) => e.disabled), false);

    // ВИДЪТ диаграма · дават се всички, но лъжливият се КАЗВА
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'stalbove'));
    proveri('стълбовете се появиха', (await p.$$eval('.koef-stalb', (e) => e.length)) > 0, true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'oer'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'ploshtta'));
    proveri('площ върху ОТНОШЕНИЕ се казва, че лъже',
      (await p.$eval('#kade-lazhe', (e) => e.textContent)).includes('не се сборуват'), true);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-koefitsient', 'noi'));
    proveri('а върху ПАРИ не лъже и предупреждението пада', await p.$('#kade-lazhe'), null);

    // И нищо от това не пипа Журнала — всичко се СМЯТА при показване
    const predKoef = await broySabitiya(p);
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-diagrama', 'liniya'));
    await deystvieSPrerisuvane(p, () => p.selectOption('#koef-stapka', 'trimesechie'));
    proveri('коефициентите не пишат нищо в Журнала', await broySabitiya(p), predKoef);

    // ══ 50 · цветовете при въвеждане (И96 т.1 · т.9) ═════════════════════════
    //
    // Негово: „ако има несъответствие от нея + английски и някаква друга азбука
    // да светне в ЖЪЛТ цвят… да оцветява в различен цвят и с текст да дава
    // ЛЕГЕНДА на цветовете и защо не допуска."
    razdel = '50 · цветовете при въвеждане';
    await naEkran(p, 'smetki', '#razhod-dostavchik');

    // ЛЕГЕНДАТА · осемте вида, всеки с цвят, ЗНАК и дума
    proveri('легендата стои на екрана, не в помощ',
      await p.$$eval('.red.legenda', (r) => r.length), 8);
    proveri('всеки вид носи ЗНАК, не само цвят',
      await p.$$eval('.red.legenda .problem-znak', (r) => r.every((x) => x.textContent.trim() !== '')), true);
    // Легендата стои в СГЪНАТО `<details>`, а сгънатото няма `innerText` — то е
    // празен низ, в който всяка проверка „по-дълго от" минава сама (урокът от §41).
    proveri('и всеки казва ЗАЩО',
      await p.$$eval('.red.legenda', (r) => r.every((x) => x.textContent.length > 40)), true);

    // ЧИСТОТО не свети
    await p.fill('#razhod-dostavchik', 'Материали ООД');
    proveri('чиста кирилица не свети',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-')), false);
    proveri('и не казва нищо', await p.$eval('#kazva-dostavchik', (e) => e.textContent.trim()), '');

    // ЧУЖДАТА АЗБУКА · ЖЪЛТО и само предупреждава.
    //
    // Пробата е с ЙЕРОГЛИФИ, не с гръцко: гръцкият знак, НАПИСАН от човека, е
    // законен вход, и браузърът с право дотегля гръцкия подпакет, за да го
    // покаже. §48 пази ЧЕРУПКАТА на приложението — надписи, бутони, глави — а
    // не онова, което човекът въвежда. Йероглифите нямат наш подпакет и падат
    // на системен шрифт, тъй че пробата не мърда джоба.
    await p.fill('#razhod-dostavchik', '株式会社 ЕООД');
    proveri('чуждата азбука свети ЖЪЛТО',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-zhalto')), true);
    proveri('и КАЗВА кой знак е',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('株'), true);
    proveri('но НЕ спира — тя е предупреждение',
      await p.$eval('#kazva-dostavchik', (e) => e.dataset.spira), 'ne');

    // СМЕСЕНИТЕ АЗБУКИ · ОРАНЖЕВО и СПИРА
    await p.evaluate(() => {
      const pole = document.getElementById('razhod-dostavchik');
      // „Стройпласт" с ЛАТИНСКО „o" · сглобено, за да не влезе смесена дума в кода
      pole.value = `Стр${String.fromCodePoint(0x6f)}йпласт`;
      pole.dispatchEvent(new Event('input', { bubbles: true }));
    });
    proveri('смесените азбуки светят ОРАНЖЕВО',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-oranzhevo')), true);
    proveri('и СПИРАТ — правило 11, преместено на входа',
      await p.$eval('#kazva-dostavchik', (e) => e.dataset.spira), 'da');
    proveri('казва се КОЯ дума е',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('смесва кирилица и латиница'), true);

    // НЕВИДИМИЯТ ЗНАК · сиво, и се казва КОЙ е
    await p.evaluate(() => {
      const pole = document.getElementById('razhod-dostavchik');
      pole.value = `Цимент${String.fromCodePoint(0x200b)}ООД`;
      pole.dispatchEvent(new Event('input', { bubbles: true }));
    });
    proveri('невидимият знак се хваща и се назовава',
      (await p.$eval('#kazva-dostavchik', (e) => e.textContent)).includes('U+200B'), true);

    // И нищо от светенето НЕ пипа Журнала
    const predSvetene = await broySabitiya(p);
    await p.fill('#razhod-dostavchik', 'Материали ООД');
    proveri('светенето не пише нищо в Журнала', await broySabitiya(p), predSvetene);

    // ══ 51 · двете секции на Калкулатора (И96 т.2) ══════════════════════════
    //
    // Негово: „Аз не разбирам как се смята… с разлика в цената в 2 графи КАК СЕ
    // СМЯТА и какви стойности ти трябват… с легенда и пример за коефициент…
    // Ако се налага направи секция Калкулатор и секция Ценова листа."
    razdel = '51 · двете секции на Калкулатора';
    await naEkran(p, 'stoynost', '#cheti-ploshti');

    proveri('секция „Калкулатор" стои горе',
      Boolean(await p.$('[data-sektsiya=kalkulator]')), true);
    proveri('секция „Ценова листа" стои под нея',
      Boolean(await p.$('[data-sektsiya="tsenova-lista"]')), true);

    // ПЕТТЕ КОЕФИЦИЕНТА · меню от ДУМИ, не свободно число („аз не знам")
    proveri('петте коефициента са менюта',
      await p.$$eval('.red.kalk-koef select[data-koef]', (r) => r.length), 5);
    proveri('и всяко е меню от думи, не поле за число',
      await p.$$eval('.red.kalk-koef select[data-koef] option',
        (o) => o.every((x) => /[А-Яа-я]/.test(x.textContent))), true);

    // КАК СЕ СМЯТА · двете графи, ред по ред
    proveri('двете графи стоят една до друга',
      await p.$$eval('.dve-grafi .grafa', (r) => r.length), 2);
    const grafaA = await p.$eval('.dve-grafi .grafa:first-child', (e) => e.textContent);
    proveri('Графа А тръгва от площ × база', grafaA.includes('площ × база'), true);
    proveri('и всеки от петте коефициента е СВОЙ ред',
      ['етаж', 'състояние', 'изложение', 'възраст', 'асансьор']
        .every((d) => grafaA.includes(d)), true);
    const grafaB = await p.$eval('.dve-grafi .grafa:last-child', (e) => e.textContent);
    proveri('Графа Б показва четирите си стъпки',
      ['годишен наем', 'заетост', 'нетен оперативен доход', 'доходност']
        .every((d) => grafaB.includes(d)), true);

    // ПРИМЕРЪТ ЗА КОЕФИЦИЕНТ · негово изрично искане · разгъва се ПОД реда
    proveri('примерът е прибран, докато не се поиска',
      Boolean(await p.$('.red.kalk-primer')), false);
    await deystvieSPrerisuvane(p, () => p.click('[data-primer=etazh]'));
    proveri('примерът се разгъва под реда, без изскачащ прозорец',
      Boolean(await p.$('.red.kalk-primer')), true);
    const parterat = await p.$eval('.red.kalk-primer tr[data-stapka=parter]', (r) => ({
      mnozhitel: r.querySelector('[data-mnozhitel]').textContent.trim(),
      meni: r.querySelector('[data-meni]').textContent.trim(),
      pari: r.querySelector('[data-meni-pari]').textContent.trim(),
    }));
    proveri('множителят стои с три знака', parterat.mnozhitel, '0,920');
    proveri('и до него — с колко процента мени', parterat.meni, '−8,00 %');
    // Числото зависи от обекта, който се разбива; проверява се, че процентът е
    // ПРЕВЕДЕН В ПАРИ и е отрицателен — „0,92" само по себе си не е пример.
    proveri('процентът е преведен в ПАРИ, не оставен сам',
      parterat.pari.startsWith('−') && parterat.pari !== '0,00', true);
    proveri('избраната стъпка е назована с ДУМА, не само с цвят',
      (await p.$eval('.red.kalk-primer', (e) => e.textContent)).includes('избрано'), true);

    // РАЗЛИКАТА · и числото, което свързва двете графи
    const razlikata = await p.$$eval('.plochka .etiket', (e) => e.map((x) => x.textContent));
    proveri('разликата Б − А е показана', razlikata.includes('Разлика · Б − А'), true);
    proveri('и подразбиращата се доходност също',
      razlikata.includes('Подразбираща се доходност'), true);

    // ВРЪЗКАТА МЕЖДУ ДВЕТЕ СЕКЦИИ · смяна горе мени числата долу
    await p.setInputFiles('#fayl-ploshti', new URL('../primeri/tseni-md.csv', import.meta.url).pathname);
    await p.waitForFunction(() => document.body.textContent.includes('Прочетени 45'));
    const predSmyana = await chisloNaPoleto(p, 'stoynost-a');
    // ЧАКА СЕ ЧИСЛОТО, не прерисуването. Обработчикът е асинхронен и прави ДВЕ
    // неща — пресмята листата и прерисува; шапката се отбелязва при второто,
    // тъй че „шапката е нова" не значи „числото е новото". Платено с находка:
    // проверката минаваше през път и падаше през път, което е по-лошо от
    // проверка, която пада винаги.
    await smeniKoefitsient(p, 'sastoyanie', 'novo-luks');
    const sledSmyana = await chisloNaPoleto(p, 'stoynost-a');
    proveri('коефициент, сменен ГОРЕ, мени листата ДОЛУ', sledSmyana > predSmyana, true);

    // и обратно · връщането връща числото точно, без утайка от закръгляне
    await smeniKoefitsient(p, 'sastoyanie', 'dobro');
    proveri('връщането връща същото число', await chisloNaPoleto(p, 'stoynost-a'), predSmyana);

    // И НИЩО ОТ ТОВА НЕ ПИША В ЖУРНАЛА · „няма редакция оттам, а само изчисляване"
    const predKalk = await broySabitiya(p);
    await smeniKoefitsient(p, 'izlozhenie', 'yug');
    proveri('Калкулаторът не пише нищо в Журнала', await broySabitiya(p), predKalk);
    await smeniKoefitsient(p, 'izlozhenie', 'iztok-zapad');

    // ══ 52 · Журналът от таблица (И96 т.8) ═══════════════════════════════════
    //
    // Негово: „Няма редакция, а НОВ ФАЙЛ ЗАЛЕПЕН ЗА СТАРИЯ в журнала… скачени с
    // ТРЕТИ НОМЕР обединяващ и двата… извън графата на нормалния ред."
    razdel = '52 · Журналът от таблица';
    await naEkran(p, 'nastroyki', '#zhurnal-iznesi');

    proveri('секцията стои в Настройки, не при Журнала',
      Boolean(await p.$('[data-sektsiya=zhurnalat]')), true);

    // Таблицата се строи от ИСТИНСКИТЕ събития: изнесеният файл носи ключа и
    // отпечатъка, а без тях върнатият ред не може да се свърже с Журнала.
    razdel = '52 · Журналът · четене на Журнала';
    const zhurnalat = await p.evaluate(async () => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      return await new Promise((da, ne) => {
        const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result.sort((a, b) => a.seq - b.seq));
        z.onerror = () => ne(z.error);
      });
    });
    const zhertva = zhurnalat.find((s) => s.type === 'ПлащанеПрието');
    proveri('в Журнала има прието плащане, което да се поправи', Boolean(zhertva), true);

    const glava = ['№', 'Кога', 'Кой', 'Какво', 'Същност', 'Описание', 'Сума', 'Ключ', 'Отпечатък'];
    const kletka = (s, novaSuma) => {
      const suma = Object.keys(s.payload).find((k) => k.endsWith('_st') && typeof s.payload[k] === 'number');
      const opis = ['opis', 'prichina', 'ime', 'adres'].find((k) => typeof s.payload[k] === 'string');
      const st = suma ? s.payload[suma] : undefined;
      const pishiSuma = (v) =>
        `${Math.floor(v / 100).toLocaleString('bg-BG').replace(/ /g, ' ')},${String(v % 100).padStart(2, '0')}`;
      return [
        s.seq,
        s.ts,
        s.actor,
        s.type,
        `${s.sashtnost.vid}:${s.sashtnost.id}`,
        opis ? s.payload[opis] : '',
        st === undefined ? '' : pishiSuma(s.seq === zhertva.seq && novaSuma !== undefined ? novaSuma : st),
        s.opId,
        s.hash.slice(0, 16),
      ].join(';');
    };

    // НЕПИПНАТАТА таблица · нула промени, и сверката излиза
    const patBez = join(tmpdir(), 'zhurnal-bez-promyana.csv');
    await writeFile(patBez, [glava.join(';'), ...zhurnalat.map((s) => kletka(s))].join('\n'), 'utf8');
    razdel = '52 · Журналът · непипнатата таблица';
    await p.setInputFiles('#zhurnal-fayl', patBez);
    await p.waitForFunction(() => document.body.textContent.includes('Какво ще стане'));
    proveri('непипнатата таблица дава НУЛА промени',
      await chisloNaPoleto2(p, 'zhurnal-promeni'), 0);
    proveri('и не предлага запис за файл, който не поправя нищо',
      Boolean(await p.$('#zhurnal-zapishi')), false);

    // ПОПРАВЕНА СУМА · сторно + нов запис + свръзка
    const predPopravka = await broySabitiya(p);
    const novaSuma = zhertva.payload.suma_st + 10_00;
    const patS = join(tmpdir(), 'zhurnal-s-promyana.csv');
    await writeFile(patS, [glava.join(';'), ...zhurnalat.map((s) => kletka(s, novaSuma))].join('\n'), 'utf8');
    razdel = '52 · Журналът · поправената сума';
    await p.setInputFiles('#zhurnal-fayl', patS);
    await p.waitForFunction(() => Boolean(document.getElementById('zhurnal-zapishi')));
    proveri('поправената сума се хваща', await chisloNaPoleto2(p, 'zhurnal-promeni'), 1);
    proveri('и се показва „било → става", преди да е записано нещо',
      (await p.$eval('.red.zhurnal-promyana', (e) => e.textContent)).includes('Сума'), true);
    proveri('нищо не е влязло в Журнала още', await broySabitiya(p), predPopravka);

    // СЛУЧАЯТ Е ЗАДЪЛЖИТЕЛЕН · следа, която не обяснява нищо, е по-лоша от липсваща
    razdel = '52 · Журналът · случаят е задължителен';
    await p.click('#zhurnal-zapishi');
    await p.waitForFunction(() => document.body.textContent.includes('Кажи СЛУЧАЯ'));
    proveri('свръзка без СЛУЧАЙ се отказва С ДУМИ', await broySabitiya(p), predPopravka);

    razdel = '52 · Журналът · записът и свръзката';
    await p.fill('#zhurnal-data', '2026-08-20');
    await p.fill('#zhurnal-sluchay', 'сгрешена сума при въвеждане');
    await p.click('#zhurnal-zapishi');
    await p.waitForFunction(() => document.body.textContent.includes('свръзка С'));

    // ТРИ събития: сторно + нов запис + свръзка. Старото стои непокътнато.
    proveri('сторно + нов запис + свръзка · три събития',
      await broySabitiya(p), predPopravka + 3);
    const vestPopravka = await tekstNa(p, '.vest');
    proveri('вестта казва свръзката', vestPopravka.includes('свръзка С'), true);
    proveri('и че старите записи стоят', vestPopravka.includes('непокътнати'), true);

    // СВРЪЗКАТА се вижда · с ДВЕТЕ дати, извън графата на нормалния ред
    await naEkran(p, 'nastroyki', '#zhurnal-iznesi');
    const svrazkata = await p.$eval('.red.svrazka', (e) => e.textContent);
    proveri('свръзката стои в таблицата си', svrazkata.includes('С1'), true);
    proveri('с ДАТАТА НА ФАЙЛА, отделна от датата на записа',
      svrazkata.includes('2026-08-20'), true);
    proveri('и със случая на промяна',
      svrazkata.includes('сгрешена сума при въвеждане'), true);

    // РАЗБЪРКАНАТА таблица се отказва ЦЯЛА · пипнат № не е поправка
    const patRazbarkan = join(tmpdir(), 'zhurnal-razbarkan.csv');
    await writeFile(
      patRazbarkan,
      [glava.join(';'), ...zhurnalat.map((s) => kletka(s).replace(/^\d+;/, '999;'))].join('\n'),
      'utf8',
    );
    const predRazbarkan = await broySabitiya(p);
    razdel = '52 · Журналът · разбърканата таблица';
    await p.setInputFiles('#zhurnal-fayl', patRazbarkan);
    await p.waitForFunction(() => document.body.textContent.includes('Заключени колони'));
    proveri('пипнатата заключена колона отказва ЦЯЛОТО внасяне',
      Boolean(await p.$('#zhurnal-zapishi')), false);
    proveri('и казва какво да се направи',
      (await tekstNa(p, '.karta.izbrana .vest.zle')).includes('изнеси я наново'), true);
    proveri('нищо не е влязло в Журнала', await broySabitiya(p), predRazbarkan);

    // ══ 53 · Личният таб · отделният Журнал и преносът (И98) ════════════════
    //
    // Негово: „Личния таб където имаш СЪЩАТА таблица от Управление… Има си и
    // отделен журнал когато се е активирал личния и НИКОГА не се смесват."
    razdel = '53 · Личното · преди активиране';
    await naEkran(p, 'tablo', '[data-sektsiya=tablo-lichno]');
    proveri('Таблото казва, че личното НЕ Е ПУСКАНО · три състояния, не две',
      (await p.$eval('[data-sektsiya=tablo-lichno]', (e) => e.textContent)).includes('не е пускано'), true);
    proveri('и НЕ предлага бутон — първото пускане иска мястото',
      Boolean(await p.$('#tablo-lichno')), false);
    proveri('но пунктът „Лично" се вижда, за да може изобщо да се пусне',
      Boolean(await p.$('[data-ekran=lichno]')), true);

    // И99 · АКТИВАЦИЯТА ИСКА МЯСТО В ЛИЧНИЯ ДРАЙВ, не гол бутон
    razdel = '53 · Личното · активирането иска МЯСТО';
    const predLichno = await broySabitiya(p);
    await naEkran(p, 'lichno', '#lichno-pusni');
    proveri('поканата иска МЯСТО в личния драйв',
      Boolean(await p.$('#lichno-myasto')), true);
    proveri('и КАЗВА, че приложението не споделя папката вместо теб',
      (await p.$eval('[data-sektsiya=lichno-pokana]', (e) => e.textContent)).includes('не я споделя'), true);

    // без място не тръгва
    await p.click('#lichno-pusni');
    await p.waitForFunction(() => document.body.textContent.includes('иска МЯСТО'));
    proveri('без място личното НЕ тръгва', Boolean(await p.$('#l-forma-delo')), false);

    await p.fill('#lichno-myasto', 'MasterBook/Лично');
    await deystvieSPrerisuvane(p, () => p.click('#lichno-pusni'));
    proveri('служебният Журнал НЕ е помръднал', await broySabitiya(p), predLichno);

    // СЪЩАТА ТАБЛИЦА · свои надписи, СВОЙ Журнал
    razdel = '53 · Личното · същата таблица';
    const lichnoTekst = await p.evaluate(() => document.body.textContent);
    proveri('таблицата е СЪЩАТА, с лични надписи',
      lichnoTekst.includes('Моето време') && lichnoTekst.includes('Тема · Обект · Дело'), true);
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
    proveri('преносът казва сверката си · разликата дори когато е нула',
      vestPrenos.includes('разлика 0'), true);
    proveri('и че старото стои непокътнато',
      vestPrenos.includes('непокътнати'), true);
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
        const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      const po = {};
      for (const s of vsichki) (po[s.naematel] ??= []).push(s);
      return Object.entries(po).map(([klyuch, redica]) => ({
        klyuch,
        broy: redica.length,
        parviSeq: Math.min(...redica.map((s) => s.seq)),
        chuzhdi: redica.filter((s) => s.naematel !== klyuch).length,
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
    await p.fill('#dostap-imeyl', 'vintexstroy@gmail.com');
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
      await p.$eval('#lp-pusni', (e) => e.disabled), true);
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
    razdel = '59 · Менютата · личното поле „Кой"';
    proveri('„Кой" носи списък от ЛИЧНИТЕ движения',
      await p.$eval('#lp-r-koy', (e) => e.getAttribute('list')), 'lp-r-koy-spisak');
    proveri('и „Посока" е ЗАКЛЮЧЕНА · приход и разход са фиксирани модели',
      await p.$eval('#lp-r-posoka', (e) => e.tagName), 'SELECT');
    proveri('личният екран · полетата са защитени от превод',
      await p.evaluate(() => {
        const poleta = [...document.querySelectorAll('input:not([type=checkbox]), select')];
        const goli = poleta.filter((e) => e.getAttribute('translate') !== 'no');
        return goli.length === 0 ? 'всички' : `голи: ${goli.map((e) => e.id || e.name).join(' · ')}`;
      }),
      'всички');

    // ══ 56 · ЛИЧНИЯТ ИЗНОС · своя верига, свой файл (ADR-039) ═══════════════
    razdel = '56 · Личният износ · веригата';
    await naEkran(p, 'lichno', '[data-sektsiya=lichen-iznos]');
    proveri('екранът напомня, че личният НЕ Е изнасян',
      (await p.$eval('[data-sektsiya=lichen-iznos]', (e) => e.textContent)).includes('не е изнасян'), true);
    await p.click('#lichno-proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Личната верига е цяла'));
    proveri('личната верига е цяла и се брои ОТДЕЛНО',
      (await tekstNa(p, '.vest')).includes('Личната верига е цяла'), true);

    razdel = '56 · Личният износ · файлът';
    const [svalenLichen] = await Promise.all([p.waitForEvent('download'), p.click('#lichno-iznesi')]);
    const patLichen = await svalenLichen.path();
    const izneseniLichni = JSON.parse(await readFile(patLichen, 'utf8'));
    proveri('името на файла казва ЛИЧЕН, без имейла с наставката',
      svalenLichen.suggestedFilename().startsWith('zhurnal-lichen-'), true);
    proveri('всяко звено е на ЛИЧНИЯ наемател',
      izneseniLichni.every((x) => x.naematel.endsWith('#lichen')), true);
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
        const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
      });
      return vsichki.filter((s) => !s.naematel.endsWith('#lichen'));
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

    // ПРИБИРАНЕТО · пунктът пада, Журналът остава
    razdel = '53 · Личното · прибирането';
    const predPribirane = lichniyat.broy;
    await naEkran(p, 'tablo', '#tablo-lichno');
    proveri('Таблото вече предлага ПРИБИРАНЕ',
      (await p.$eval('#tablo-lichno', (e) => e.textContent)).includes('Прибери'), true);
    await deystvieSPrerisuvane(p, () => p.click('#tablo-lichno'));
    proveri('пунктът падна от лентата',
      Boolean(await p.$('[data-ekran=lichno]')), false);
    proveri('и Таблото предлага да го ВЪРНЕ — мястото вече е записано',
      (await p.$eval('#tablo-lichno', (e) => e.textContent)).includes('Върни'), true);
    const sledPribirane = await p.evaluate(async () => {
      const db = await new Promise((da) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
      });
      const vsichki = await new Promise((da) => {
        const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
      });
      return vsichki.filter((s) => s.naematel.endsWith('#lichen')).length;
    });
    proveri('но Журналът ОСТАНА — прибраното не е изтрито',
      sledPribirane > predPribirane, true);

    // ══ 59 · МЕНЮТАТА ИЗВЪН УПРАВЛЕНИЕ · живото и заключеното (ADR-042) ═════
    //
    // ADR-040 закачи закона за четирите полета на делото. Тук се проверява
    // втората му половина: полетата, които ОПИСВАТ, вече имат речник и на
    // другите екрани; полетата, върху които системата СМЯТА, си остават избор
    // и КАЗВАТ защо.
    razdel = '59 · Менютата · живото поле на Имоти';
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('„Наемател" носи СПИСЪК, а не само текст',
      await p.$eval('#naem-naemetel', (e) => e.getAttribute('list')), 'naem-naemetel-spisak');
    const naemateliVSpisaka = await p.$$eval('#naem-naemetel-spisak option', (o) => o.map((x) => x.value));
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
      (await p.$$eval('#razhod-dostavchik-spisak option', (o) => o.map((x) => x.value)))
        .includes('Нов Доставчик ООД'), true);

    // ══ 66 · ОДИТНИЯТ ФАЙЛ · SAF-T и контрагентите (И96 т.11) ═════════════
    //
    // Проверява се онова, което ТЕСТЪТ не може: че Главната книга стига до
    // ЕКРАНА, че пречките се четат с думи и че вписаните данни МАХАТ своята
    // пречка — тоест че екранът и домейнът гледат едно и също число.
    razdel = '66 · Одитният файл · пречките се четат';
    await naEkran(p, 'smetki', '[data-sektsiya=saf-t]');
    proveri('секцията е на екрана с версията на схемата',
      (await p.$eval('[data-sektsiya=saf-t] .dyalglava span', (e) => e.textContent)).includes('1.0.2'),
      true);
    const prechkiPredi = await p.$$eval('[data-sektsiya=saf-t] .prechki li', (e) => e.length);
    proveri('пречките се ИЗБРОЯВАТ, а не се мълчи за тях', prechkiPredi > 0, true);
    proveri('и се казват с ДУМИ · фирмата липсва поименно',
      (await p.$eval('[data-sektsiya=saf-t] .prechki', (e) => e.textContent)).includes('фирмата'),
      true);

    // ОБОРОТНАТА ВЕДОМОСТ · дебит = кредит на самия екран, не само в теста.
    const sboratNaKnigata = await p.$eval('[data-sektsiya=saf-t] .red.saft.sbor', (e) => {
      const sumi = [...e.querySelectorAll('.suma')].map((s) => Number(s.dataset.st));
      return { debit: sumi[0], kredit: sumi[1] };
    });
    proveri('дебит = кредит на ЕКРАНА', sboratNaKnigata.debit === sboratNaKnigata.kredit, true);
    proveri('и книгата НЕ е празна за този месец', sboratNaKnigata.debit > 0, true);
    proveri('немапнатите сметки се ВИЖДАТ, а не се мълчат',
      (await p.$$eval('[data-sektsiya=saf-t] .red.saft em', (e) => e.length)) > 0, true);

    // ВПИСВАНЕТО МАХА СВОЯТА ПРЕЧКА · екранът и домейнът гледат едно число.
    razdel = '66 · Контрагентът · сбърканият ЕИК пада ТУК';
    await naEkran(p, 'nastroyki', '#forma-kontragent');
    await p.selectOption('#kontragent-vid', 'firma');
    await p.fill('#kontragent-ime', 'ВинтексСтрой ЕООД');
    // Сменена ПОСЛЕДНА цифра: точно грешката при преписване, която контролната
    // цифра лови. Ако минеше, файлът щеше да падне чак при НАП.
    await p.fill('#kontragent-eik', '131071588');
    await p.click('#forma-kontragent button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#greshka-kontragent')?.textContent !== '');
    proveri('сбърканата контролна цифра се КАЗВА в полето',
      (await p.$eval('#greshka-kontragent', (e) => e.textContent)).includes('контролната цифра'),
      true);

    razdel = '66 · Контрагентът · вписаното маха пречката';
    const predKontragenta = await broySabitiya(p);
    await p.fill('#kontragent-eik', '131071587');
    await p.fill('#kontragent-dds', 'BG131071587');
    await p.fill('#kontragent-adres', 'ул. Първа 1');
    await p.fill('#kontragent-grad', 'София');
    await deystvieSPrerisuvane(p, () => p.click('#forma-kontragent button[type=submit]'));
    proveri('записът влиза в ЖУРНАЛА', await broySabitiya(p), predKontragenta + 1);
    proveri('и редът се появява като ПЪЛЕН',
      (await p.$eval('.red.kontragent .znachka', (e) => e.textContent)).trim(), 'пълен');

    await naEkran(p, 'smetki', '[data-sektsiya=saf-t]');
    proveri('пречките са с ЕДНА по-малко',
      (await p.$$eval('[data-sektsiya=saf-t] .prechki li', (e) => e.length)) < prechkiPredi, true);
    proveri('и вече не пише, че фирмата липсва',
      (await p.$eval('[data-sektsiya=saf-t]', (e) => e.textContent)).includes('фирмата няма'),
      false);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 65 · ПРОВЕРКИТЕ ПРИ ВЪВЕЖДАНЕ · параметри по бизнес (И96 т.1) ══════
    //
    // Дотук `nastroykiteNaVhoda` и `smeniNastroykiteNaVhoda` бяха построени и
    // НИКОЙ не ги викаше — функция без екран (ADR-041). Ето го екрана, и ето
    // го доказателството, че параметърът стига до ЖИВАТА проверка на полето.
    razdel = '65 · Проверките при въвеждане';
    await naEkran(p, 'nastroyki', '[data-sektsiya=parametri]');
    proveri('осемте вида стоят на екрана',
      await p.$$eval('.red.parametar', (e) => e.length), 8);
    proveri('замразеният период е ЗАКОВАН · правило 9 не е параметър',
      await p.$eval('[data-parametar="zamrazen-period"] [data-parametar-vklyuchen]', (e) => e.disabled),
      true);

    // ЖИВАТА ПРОМЯНА · „дублират" минава от „спира" на „предупреждава"
    const predParametara = await broySabitiya(p);
    await p.selectOption('[data-parametar="dublikat"] [data-parametar-sila]', 'preduprezhdava');
    await p.fill('[data-parametar="dublikat"] [data-parametar-belezhka]', 'при нас се случва');
    await deystvieSPrerisuvane(p, () =>
      p.click('[data-parametar="dublikat"] [data-parametar-zapishi]'),
    );
    proveri('записът влиза в ЖУРНАЛА, не в паметта на екрана',
      await broySabitiya(p), predParametara + 1);
    proveri('и се вижда на екрана след прерисуване',
      await p.$eval('[data-parametar="dublikat"] [data-parametar-sila]', (e) => e.value),
      'preduprezhdava');
    proveri('бележката на Стопанина също',
      await p.$eval('[data-parametar="dublikat"] [data-parametar-belezhka]', (e) => e.value),
      'при нас се случва');

    // ОСТАНАЛИТЕ СЕДЕМ НЕ МЪРДАТ · едно събитие мени един вид.
    proveri('останалите седем са непокътнати',
      await p.$eval('[data-parametar="prazno"] [data-parametar-sila]', (e) => e.value), 'spira');

    // И НАЙ-ВАЖНОТО · параметърът стига до ЖИВАТА проверка на полето.
    razdel = '65 · Проверките · параметърът стига до полето';
    await naEkran(p, 'smetki', '#razhod-dostavchik');
    await p.fill('#razhod-dostavchik', '株式会社 ЕООД');
    await p.waitForFunction(() =>
      document.querySelector('#kazva-dostavchik')?.textContent !== '',
    );
    proveri('чуждата азбука пак свети',
      await p.$eval('#razhod-dostavchik', (e) => e.className.includes('problem-')), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 64 · ПОДРЕДБАТА · всеки сам мести секциите си (И101 т.2) ═══════════
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
      dyalove[1].querySelector('[data-premesti="gore"]').click();
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
    razdel = '63 · Настройките · падащият ред';
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('пунктът „Настройки" е ПАДАЩ РЕД, не гол бутон',
      Boolean(await p.$('#nastroyki-vhod')), true);
    proveri('казва на КОГО са темите',
      (await p.$eval('#nastroyki-red', (e) => e.textContent)).includes('Стопанинът'), true);

    // СЪСТОЯНИЕТО СЕ ПОМНИ, докато екранът стои — по-ранните секции вече са
    // минавали през този пункт. Затова се проверява ПОВЕДЕНИЕТО (натискането
    // превключва), а не предполагаемо начално положение.
    const redatBeshe = await p.$eval('#nastroyki-red', (e) => e.hidden);
    await p.click('#nastroyki-vhod');
    await p.waitForFunction((p0) => document.querySelector('#nastroyki-red')?.hidden !== p0, redatBeshe);
    proveri('натискането го превключва',
      await p.$eval('#nastroyki-red', (e) => e.hidden), !redatBeshe);
    if (redatBeshe === false) {
      await p.click('#nastroyki-vhod');
      await p.waitForFunction(() => document.querySelector('#nastroyki-red')?.hidden === false);
    }
    proveri('и стига до ОТВОРЕН', await p.$eval('#nastroyki-red', (e) => e.hidden), false);
    proveri('и състоянието се КАЗВА на четеца на екран',
      await p.$eval('#nastroyki-vhod', (e) => e.getAttribute('aria-expanded')), 'true');
    const temiteNaStopanina = await p.$$eval('#nastroyki-red [data-tema]', (b) => b.length);
    proveri('Стопанинът вижда всички теми', temiteNaStopanina >= 12, true);

    razdel = '63 · Настройките · редът ВОДИ до темата';
    // Темата е ПЪТ, не съдържание: води до онова, което вече стои, и го
    // подчертава за миг. Втори дом за същото управление би изостанал.
    // Подчертаването живее 1,6 секунди и си отива само. Затова се ЧАКА да се
    // появи, вместо да се чете след прерисуването: при бавен старт екранът
    // може да се обнови по-късно от белега и проверката да го изпусне.
    await p.click('#nastroyki-red [data-tema="pravata"]');
    await p.waitForFunction(() =>
      document.querySelector('[data-sektsiya=pravata]')?.classList.contains('podchertana'),
    );
    proveri('заведе на екрана, където живее темата',
      Boolean(await p.$('[data-sektsiya=pravata]')), true);
    proveri('и я ПОДЧЕРТА, за да се види къде е стигнало окото', true, true);

    razdel = '63 · Настройките · изскачащият прозорец';
    await p.click('#nastroyki-vhod');
    await p.waitForFunction(() => document.querySelector('#nastroyki-red')?.hidden === false);
    await p.click('#nastroyki-red [data-tema="ezik"]');
    await p.waitForSelector('.istoriya-karta');
    proveri('темата без своя секция се отваря в ПРОЗОРЕЦ',
      (await tekstNa(p, '.istoriya-karta')).includes('Езикът на'), true);
    proveri('и казва, че езикът НЕ е право',
      (await tekstNa(p, '.istoriya-karta')).includes('НЕ е право'), true);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('.istoriya-karta'));
    proveri('Escape го затваря · клавиатурата не остава в капан',
      Boolean(await p.$('.istoriya-karta')), false);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 62 · ТАБОВЕТЕ ОТ ТАБЛОТО · само Стопанинът (И101 т.1) ═══════════════
    razdel = '62 · Табовете от Таблото';
    await naEkran(p, 'tablo', '[data-sektsiya=tablo-tabove]');
    proveri('Таблото носи входа към изгледите',
      Boolean(await p.$('[data-sektsiya=tablo-tabove]')), true);
    proveri('и брои ДОБАВЕНИТЕ, не всички',
      Number(await p.$eval('[data-pole="broy-tabove"] .chislo', (e) => e.textContent.trim())) >= 1,
      true);
    proveri('казва, че правото е само на Стопанина',
      (await tekstNa(p, '[data-sektsiya=tablo-tabove]')).includes('само от Стопанина'), true);
    // Бутонът е ПЪТ, не надпис: води на екрана, без да е част от лентата.
    await deystvieSPrerisuvane(p, () => p.click('[data-sektsiya=tablo-tabove] [data-ekran=tabove]'));
    proveri('и бутонът наистина отваря конструктора',
      Boolean(await p.$('#izbor-tab')), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 61 · ВЪЗСТАНОВЯВАНЕТО · запасният контакт (И100 · ADR-044) ══════════
    //
    // Пътят обратно се вписва ПРЕДИ да потрябва. Тук се проверява и най-важното
    // му свойство: телефонът НЕ пътува в изнесения файл — влиза само следата му.
    razdel = '61 · Възстановяването · запасният контакт';
    await naEkran(p, 'tablo', '.karta');
    proveri('картата стои на Стопанина',
      Boolean(await p.$('[data-sektsiya=zapasen]')), true);
    proveri('и казва, че път назад още НЯМА',
      (await tekstNa(p, '[data-sektsiya=zapasen]')).includes('Няма вписан'), true);

    await p.fill('#zapasen-imeyl', 'zhena@example.bg');
    // ДРУГ номер, не онзи на наемателя Иван: неговият телефон СТОИ в Журнала
    // като поле на наема, и проверката по-долу („номерът не пътува") щеше да
    // го хване него — тоест щеше да пада с вярна причина по грешен адрес.
    await p.fill('#zapasen-telefon', '0899 777 111');
    await deystvieSPrerisuvane(p, () => p.click('#zapishi-zapasen'));
    proveri('след вписването пътят обратно съществува',
      (await tekstNa(p, '[data-sektsiya=zapasen]')).includes('zhena@example.bg'), true);
    proveri('и се вижда КОЙ номер е вписан, без самия номер',
      (await tekstNa(p, '[data-sektsiya=zapasen]')).includes('…11'), true);

    // ИЗМЕРЕНО, не обещано: номерът го няма в изнесения файл.
    razdel = '61 · Възстановяването · телефонът НЕ пътува';
    await naEkran(p, 'nastroyki', '#zhurnal-iznesi');
    const [svalenSZapasen] = await Promise.all([
      p.waitForEvent('download'),
      p.click('#iznesi'),
    ]);
    const tekstNaIznosa = await readFile(await svalenSZapasen.path(), 'utf8');
    proveri('изнесеният файл НЕ носи телефона',
      tekstNaIznosa.includes('899777111') || tekstNaIznosa.includes('0899 777 111'), false);
    proveri('но носи запасния ИМЕЙЛ · той е адресът на връщането',
      tekstNaIznosa.includes('zhena@example.bg'), true);
    proveri('и последните две цифри, за да се познае кой номер е',
      tekstNaIznosa.includes('poslednite') && tekstNaIznosa.includes('"11"'), true);

    // ОТКАЗЪТ Е С ДУМИ · своят файл не се връща на своя си имейл: запасният е
    // друг човек, и точно това пише на екрана.
    razdel = '61 · Възстановяването · отказът е с думи';
    await naEkran(p, 'tablo', '[data-sektsiya=vrashtane]');
    await p.fill('#vrashtane-telefon', '0899 777 111');
    await p.setInputFiles('#vrashtane-fayl', await svalenSZapasen.path());
    await p.waitForFunction(() => document.querySelector('#greshka-vrashtane')?.textContent !== '');
    const otkazat = await tekstNa(p, '#greshka-vrashtane');
    proveri('казва, че запасният е ДРУГ имейл', otkazat.includes('друг имейл'), true);
    proveri('и сочи кой номер е вписан, без да го изписва',
      otkazat.includes('…11') && !otkazat.includes('899 777 111'), true);
    await naEkran(p, 'imoti', '#forma-imot');

    // ══ 17б · ЗАЩИТАТА ОТ ПРЕВОД по ВСИЧКИ екрани ══════════════════════════
    //
    // §17 пазеше САМО екран Имоти и обявяваше „всички" — а полетата на другите
    // екрани никой не гледаше. Точно там се намери пропуснатото: компонентът на
    // живите менюта (ADR-040) рисуваше входа без `translate="no"`, и името на
    // наемател можеше да бъде преформулирано от браузърния превод.
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
    ]) {
      await naEkran(p, ekran, znak);
      proveri(`екран „${ekran}" · полетата са защитени`,
        await p.evaluate(() => {
          const poleta = [...document.querySelectorAll('input:not([type=checkbox]), select')];
          const goli = poleta.filter((e) => e.getAttribute('translate') !== 'no');
          return poleta.length > 0 ? (goli.length === 0 ? 'всички' : `голи: ${goli.map((e) => e.id || e.name).join(' · ')}`) : 'няма полета';
        }),
        'всички');
    }

    // ══ 48 · джобът НАКРАЯ · чужда азбука, довлечена от кой да е екран ═══════
    //
    // §16 гледа джоба РАНО — а знак от чужда азбука, сложен на екран, който се
    // отваря по-късно, минаваше незабелязано. Платено с находка: едно „Δ" в
    // Сметки (гръцка буква, U+0394) накара браузъра да дотегли ЦЯЛАТА гръцка
    // азбука — 32 KB шрифт за един знак — и обещанието „джобът пази СВОЯ пакет"
    // се скъса не от джоба, а от съдържанието. Затова СЪЩАТА проверка стои и
    // тук, след като всички екрани вече са минали.
    razdel = '48 · джобът накрая';
    proveri('нито един екран не е довлякъл чужда азбука',
      await p.evaluate(async () => {
        const imena = (await caches.keys()).filter((i) => i.startsWith('masterbook-'));
        const adresi = [];
        for (const ime of imena) {
          const kesh = await caches.open(ime);
          adresi.push(...(await kesh.keys()).map((z) => z.url));
        }
        const ima = (a) => adresi.some((u) => u.includes(`-${a}-`));
        return `greek:${ima('greek')} vietnamese:${ima('vietnamese')}`;
      }),
      'greek:false vietnamese:false');

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

/** Колко събития стоят в ЛИЧНИЯ Журнал · служебният брояч не ги вижда. */
async function broyLichni(p) {
  return p.evaluate(async () => {
    const db = await new Promise((da) => {
      const z = indexedDB.open('masterbook');
      z.onsuccess = () => da(z.result);
    });
    const vsichki = await new Promise((da) => {
      const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
      z.onsuccess = () => da(z.result);
    });
    return vsichki.filter((s) => s.naematel.endsWith('#lichen')).length;
  });
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

/**
 * ПОТВЪРЖДАВА едно действие с код от писмото (И94 т.1).
 *
 * Кодът НИКОГА не е изписан на екрана — затова проходът го вади оттам,
 * откъдето го вади и човекът: от черновата на писмото. Така се минава по
 * НЕГОВИЯ път, без нито един подставен обект.
 */
async function sKod(p, deystvie) {
  await deystvie();
  await p.waitForSelector('#otvori-pismoto');
  await p.fill('#kod', kodOtPismoto(await adresNaPismoto(p)));
  await sSabitie(p, () => p.click('#potvardi-koda'));
}

/** Черновата, каквато човекът я вижда — оттам чете кода. */
async function adresNaPismoto(p) {
  return p.$eval('#otvori-pismoto', (e) => e.getAttribute('href'));
}

function kodOtPismoto(adres) {
  return decodeURIComponent(adres).match(/КОД:\s*(\d{6})/)[1];
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

async function zapishiRazhod(p, { potok, sektor, dostavchik, opis, suma, nachin, data, dokument, stavka }) {
  await p.selectOption('#razhod-potok', potok);
  // Сектор се избира САМО при „Фактури". Заплатите и кредитите взимат
  // акумулатора си ОТ ПОТОКА (`app/smetki.ts` · `dds.ts`): те не носят ДДС и
  // стоят в свои акумулатори, вместо да се крият в чужд. Затова полето и не
  // ги предлага — а помощникът не се преструва, че ги избира.
  if (potok === 'fakturi') await p.selectOption('#razhod-sektor', sektor);
  await p.fill('#razhod-dostavchik', dostavchik);
  await p.fill('#razhod-opis', opis);
  await p.fill('#razhod-suma', suma);
  await p.selectOption('#razhod-nachin', nachin);
  await p.fill('#razhod-data', data);
  await p.fill('#razhod-dokument', dokument);
  // Ставката е избор НА РЕДА (ADR-009). Не се подава ли — остава каквото
  // формата предлага, точно както при човек, който не я пипа.
  if (stavka !== undefined) await p.selectOption('#razhod-stavka', String(stavka));
  await sSabitie(p, () => p.click('#forma-razhod button[type=submit]'));
}

/** Числото на едно поле от Отчети, в цели стотинки — за да се СМЯТА, не да се сравнява текст. */
/**
 * Сменя коефициент в секция „Калкулатор" и ЧАКА числото долу да го усети.
 *
 * Не чака прерисуването: обработчикът първо пресмята листата и чак после
 * прерисува, тъй че нова шапка не значи ново число. Чака се самото число.
 */
async function smeniKoefitsient(p, klyuch, stapka) {
  const predi = await p.$eval('[data-pole="stoynost-a"] .chislo', (e) => e.textContent.trim());
  await p.selectOption(`select[data-koef=${klyuch}]`, stapka);
  try {
    await p.waitForFunction(
    ([izbrano, staro, koef]) => {
      const s = document.querySelector(`select[data-koef=${koef}]`);
      const chislo = document.querySelector('[data-pole="stoynost-a"] .chislo');
      return Boolean(s) && s.value === izbrano && Boolean(chislo) && chislo.textContent.trim() !== staro;
    },
      [stapka, predi, klyuch],
      { timeout: 8000 },
    );
  } catch {
    const sega = await p.evaluate((koef) => ({
      izbrano: document.querySelector(`select[data-koef=${koef}]`)?.value ?? 'няма селект',
      chislo: document.querySelector('[data-pole="stoynost-a"] .chislo')?.textContent?.trim() ?? 'няма число',
      broySelekti: document.querySelectorAll('select[data-koef]').length,
    }), klyuch);
    throw new Error(
      `смяната на „${klyuch}" към „${stapka}" не стигна до числото · ` +
        `избрано=${sega.izbrano} · число=${sega.chislo} (беше ${predi}) · селекти=${sega.broySelekti}`,
    );
  }
}

/** Цялото число от плочка · за броячи, които не са пари. */
async function chisloNaPoleto2(p, klyuch) {
  const tekst = await p.$eval(`[data-pole="${klyuch}"] .chislo`, (e) => e.textContent.trim());
  return Number(tekst.replace(/[^\d-]/g, ''));
}

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
  await sSabitie(p, () => p.click('#d-forma-delo button[type=submit]'));
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
