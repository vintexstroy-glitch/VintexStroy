/**
 * ДЕЙСТВИЯТА, ИЗРАЗЕНИ С ДУМИТЕ НА ЕКРАНА · същата семантика като преди.
 *
 * Четирите двойки, споделящи вътрешна логика (`naEkran`/`deystvieSPrerisuvane`,
 * `plochka`/`plochkaPod`, `chisloNaPoleto`/`chisloNaPoleto2`, и трите действия
 * `dobaviImot`/`dobaviNaem`/`plati`, преизползващи `sSabitie`), пазят СЪЩИТЕ
 * публични имена и подписи — местата, откъдето се викат, не се пипат. Само
 * общото ПОВТОРЕНО тяло помежду им е извадено в частна функция.
 */

import type { Page } from 'playwright-core';

/**
 * ОТКРИВАЩОТО СЪБИТИЕ · Стопанинът стои ПРЕДИ всичко останало (И97 т.8 · ADR-043).
 *
 * Затова всяко абсолютно броене по-долу е „толкова записа ПЛЮС откриващото".
 * Числото се пише така, а не наум, за да остане надписът верен: „два имота"
 * значи два имота, независимо колко събития стоят преди тях.
 */
export const OTKRIVASHTOTO = 1;

/** Заглавният ред на извлечение „Банка ОББ" · споделен между разделите, които го подават. */
export const OBB = 'Дата на вальор;Основание;Наредител;Сума по документа;Реф. номер;ДДС %';

export const tekstNa = (p: Page, izbor: string): Promise<string> =>
  p.$eval(izbor, (e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim());

export const redove = (p: Page, izbor: string): Promise<string[][]> =>
  p.$$eval(izbor, (r) =>
    r.map((x) => [...x.children].map((c) => (c as HTMLElement).innerText.replace(/\s+/g, ' ').trim())),
  );

/**
 * ДАТА СПРЯМО ДНЕС · YYYY-MM-DD.
 *
 * Заковани дати правят проход, който минава само в един ден от календара.
 * Платено веднага: §24 мина цял ден, а на другата сутрин „делото до 2 дни"
 * вече беше просрочено и броят падна от 2 на 1 — без нито един ред променен
 * код. Светофарът се проверява с числа (7 и 2), значи и датите трябва да са
 * спрямо днес.
 */
export function denOtDnes(kolko: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + kolko);
  return d.toISOString().slice(0, 10);
}

/** Влиза през подставения бутон · за след всяко изчистване на хранилището. */
export async function vlezOtnovo(p: Page): Promise<void> {
  await p.waitForSelector('#podstaven-google');
  await p.click('#podstaven-google');
  await p.waitForSelector('#forma-imot');
}

async function vsichkiPlochki(p: Page): Promise<string[][]> {
  return p.$$eval('.plochka', (r) =>
    r.map((x) => [...x.children].map((c) => (c as HTMLElement).innerText.replace(/\s+/g, ' ').trim())),
  );
}

function namerenaPlochka(vsichki: string[][], etiket: string): string[] | undefined {
  return vsichki.find((x) => x[0]?.toUpperCase().includes(etiket.toUpperCase()));
}

export async function plochka(p: Page, etiket: string): Promise<string> {
  const namerena = namerenaPlochka(await vsichkiPlochki(p), etiket);
  return namerena ? namerena[1]! : `НЯМА ПЛОЧКА „${etiket}"`;
}

/** Долният ред на плочка — обяснението под числото. */
export async function plochkaPod(p: Page, etiket: string): Promise<string> {
  const namerena = namerenaPlochka(await vsichkiPlochki(p), etiket);
  return namerena ? (namerena[2] ?? '') : `НЯМА ПЛОЧКА „${etiket}"`;
}

export async function broySabitiya(p: Page): Promise<number> {
  return Number(await p.$eval('[data-broi]', (e) => (e as HTMLElement).dataset['broi']));
}

async function chakayPrerisuvane(p: Page, deystvie: () => Promise<unknown>): Promise<void> {
  await p.evaluate(() => {
    const shapka = document.querySelector('.shapka') as HTMLElement | null;
    if (shapka) shapka.dataset['beleg'] = 'staro';
  });
  await deystvie();
  try {
    await p.waitForFunction(() => {
      const shapka = document.querySelector('.shapka') as HTMLElement | null;
      return Boolean(shapka) && !shapka!.dataset['beleg'];
    });
  } catch {
    // ДИАГНОЗА С ЧИСЛО, НЕ С ТАЙМАУТ (ADR-071).
    //
    // Дотук провалът тук се четеше само като „Timeout 30000ms exceeded" и не
    // казваше НИЩО: изчезнала ли е шапката, или белегът е още там, тоест
    // прерисуване изобщо не е тръгнало. Двете искат различни поправки, а
    // съобщението беше едно и също.
    const sastoyanie = await p.evaluate(() => {
      const shapka = document.querySelector('.shapka') as HTMLElement | null;
      if (!shapka) return 'шапката я НЯМА в страницата';
      return shapka.dataset['beleg'] === 'staro'
        ? 'белегът „staro" стои — прерисуване НЕ е тръгнало'
        : `белегът е „${String(shapka.dataset['beleg'])}"`;
    });
    throw new Error(`Прерисуването не стигна до екрана · ${sastoyanie}`);
  }
}

/**
 * Смяна на екран. Прерисуването е асинхронно и сменя целия DOM — ако се пише
 * веднага след клика, написаното се изтрива под ръцете. Затова шапката се
 * бележи преди клика и се чака да се появи НЕбелязана: значи новият екран е
 * нарисуван докрай.
 */
export async function naEkran(p: Page, koy: string, znak: string): Promise<void> {
  await chakayPrerisuvane(p, () => p.click(`[data-ekran=${koy}]`));
  await p.waitForSelector(znak);
}

/**
 * НАТИСКА бутон от действията на екрана · и през РЕДОВИЯ лост, ако е свит.
 *
 * Групите по секциите и в шапката паднаха (И124 т.3 · ADR-133): „Тези бутони
 * са самостоятелни и са видими" — там натискането е директно. В РЕДОВЕТЕ
 * лостът остана (той пази ниския ред, т.4): скрит редов бутон се стига по
 * трите стъпки на човека — стрелкичка, избор по думата, натискане.
 */
export async function natisni(p: Page, izbor: string): Promise<void> {
  const svit = await p.$eval(izbor, (e) => (e as HTMLElement).hidden);
  if (svit) {
    const duma = await p.$eval(izbor, (e) =>
      (e.querySelector('.duma')?.textContent ?? e.textContent ?? '').trim());
    // `.first()` навсякъде · `page.click` също взема първото съвпадение, а
    // локаторът иначе е строг и би отказал при няколко реда с еднакво действие.
    await p
      .locator(izbor)
      .first()
      .locator('xpath=ancestor::span[contains(@class,"grupa-deystviya")]')
      .locator('.strelkichka')
      .click();
    await p.click(`.kontekstno-menyu [data-deystvie="${duma}"]`);
    // Чака се с ЛОКАТОР, не с `querySelector` в страницата: изборът може да
    // носи `:has-text(…)` — псевдоклас на Playwright, който браузърът не знае
    // и отказва като невалиден селектор.
    await p.locator(izbor).first().waitFor({ state: 'visible' });
  }
  await p.click(izbor);
}

/** Действие, което прерисува екрана, но не добавя събитие (бутон, отказ). */
export async function deystvieSPrerisuvane(p: Page, deystvie: () => Promise<unknown>): Promise<void> {
  await chakayPrerisuvane(p, deystvie);
}

/** Действие, което ТРЯБВА да сложи точно N нови събития в Журнала. */
export async function sSabitiya(p: Page, kolko: number, deystvie: () => Promise<unknown>): Promise<void> {
  const predi = await broySabitiya(p);
  await deystvie();
  await p.waitForFunction(
    ([n, k]) => Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === (n as number) + (k as number),
    [predi, kolko],
  );
}

/** Действие, което ТРЯБВА да сложи точно едно ново събитие в Журнала. */
export async function sSabitie(p: Page, deystvie: () => Promise<unknown>): Promise<void> {
  const predi = await broySabitiya(p);
  await deystvie();
  await p.waitForFunction((n) => {
    return Number(document.querySelector('[data-broi]')?.getAttribute('data-broi') ?? -1) === (n as number) + 1;
  }, predi);
}

export async function dobaviImot(p: Page, adres: string, edinitsa: string, ploshtad?: string): Promise<void> {
  await p.fill('#imot-adres', adres);
  await p.fill('#imot-edinitsa', edinitsa);
  if (ploshtad) await p.fill('#imot-ploshtad', ploshtad);
  await sSabitie(p, () => p.click('#forma-imot button[type=submit]'));
}

export interface NaemVhod {
  readonly imot?: string;
  readonly koy: string;
  readonly suma: string;
  readonly sektor: string;
  readonly padezh: string;
  readonly telefon?: string;
  readonly imeyl?: string;
}

export async function dobaviNaem(p: Page, { imot, koy, suma, sektor, padezh, telefon, imeyl }: NaemVhod): Promise<void> {
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
  await sSabitie(p, () => p.click('#forma-naem button[type=submit]'));
}

/** Колко събития стоят в ЛИЧНИЯ Журнал · служебният брояч не ги вижда. */
export async function broyLichni(p: Page): Promise<number> {
  return p.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((da) => {
      const z = indexedDB.open('masterbook');
      z.onsuccess = () => da(z.result);
    });
    const vsichki = await new Promise<Array<{ naematel: string }>>((da) => {
      const z = db.transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
      z.onsuccess = () => da(z.result as Array<{ naematel: string }>);
    });
    return vsichki.filter((s) => s.naematel.endsWith('#lichen')).length;
  });
}

/**
 * Натиска бутон от менюто и ЧАКА той да стане текущият.
 *
 * Обработчикът е асинхронен (чете Огледалото, за да намери бутона). Ако
 * файловете се подадат веднага след клика, те влизат ПРЕДИ бутонът да е избран
 * и партидата тръгва през стария път. Затова се чака името в шапката.
 */
export async function natisniButon(p: Page, ime: string): Promise<void> {
  await p.click(`[data-buton="${ime}"]`);
  await p.waitForFunction(
    (n) => (document.querySelector('#vzemi') as HTMLElement | null)?.innerText.includes(n as string),
    ime,
  );
}

/**
 * ПОТВЪРЖДАВА едно действие с код от писмото (И94 т.1).
 *
 * Кодът НИКОГА не е изписан на екрана — затова проходът го вади оттам,
 * откъдето го вади и човекът: от черновата на писмото. Така се минава по
 * НЕГОВИЯ път, без нито един подставен обект.
 */
export async function sKod(p: Page, deystvie: () => Promise<unknown>): Promise<void> {
  await deystvie();
  await p.waitForSelector('#otvori-pismoto');
  await p.fill('#kod', kodOtPismoto(await adresNaPismoto(p)));
  await sSabitie(p, () => p.click('#potvardi-koda'));
}

/** Черновата, каквато човекът я вижда — оттам чете кода. */
export async function adresNaPismoto(p: Page): Promise<string> {
  return p.$eval('#otvori-pismoto', (e) => (e as HTMLAnchorElement).getAttribute('href')!);
}

export function kodOtPismoto(adres: string): string {
  return decodeURIComponent(adres).match(/КОД:\s*(\d{6})/)![1]!;
}

export async function ostatak(p: Page, koy: string): Promise<string> {
  const red = (await redove(p, '.red.vzemane')).find((r) => r[0]?.startsWith(koy));
  return red ? red[3]! : 'НЯМА РЕД';
}

export async function plati(p: Page, koy: string, suma: string, nachin: string, data: string): Promise<void> {
  await p.click(`.red.vzemane:has-text("${koy}") [data-plati]`);
  await p.waitForSelector('#forma-plashtane');
  await p.fill('#pl-suma', suma);
  await p.selectOption('#pl-nachin', nachin);
  await p.fill('#pl-data', data);
  await sSabitie(p, () => p.click('#forma-plashtane button[type=submit]'));
}

export interface RazhodVhod {
  readonly potok: string;
  readonly sektor?: string;
  readonly dostavchik: string;
  readonly opis: string;
  readonly suma: string;
  readonly nachin: string;
  readonly data: string;
  readonly dokument: string;
  readonly stavka?: string | number;
}

export async function zapishiRazhod(
  p: Page,
  { potok, sektor, dostavchik, opis, suma, nachin, data, dokument, stavka }: RazhodVhod,
): Promise<void> {
  await p.selectOption('#razhod-potok', potok);
  // Сектор се избира САМО при „Фактури". Заплатите и кредитите взимат
  // акумулатора си ОТ ПОТОКА (`app/smetki.ts` · `dds.ts`): те не носят ДДС и
  // стоят в свои акумулатори, вместо да се крият в чужд. Затова полето и не
  // ги предлага — а помощникът не се преструва, че ги избира.
  if (potok === 'fakturi') await p.selectOption('#razhod-sektor', sektor!);
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

/**
 * Сменя коефициент в секция „Калкулатор" и ЧАКА числото долу да го усети.
 *
 * Не чака прерисуването: обработчикът първо пресмята листата и чак после
 * прерисува, тъй че нова шапка не значи ново число. Чака се самото число.
 */
export async function smeniKoefitsient(p: Page, klyuch: string, stapka: string): Promise<void> {
  const predi = await p.$eval('[data-pole="stoynost-a"] .chislo', (e) => (e as HTMLElement).textContent!.trim());
  await p.selectOption(`select[data-koef=${klyuch}]`, stapka);
  try {
    await p.waitForFunction(
      ([izbrano, staro, koef]) => {
        const s = document.querySelector(`select[data-koef=${koef}]`) as HTMLSelectElement | null;
        const chislo = document.querySelector('[data-pole="stoynost-a"] .chislo');
        return Boolean(s) && s!.value === izbrano && Boolean(chislo) && chislo!.textContent!.trim() !== staro;
      },
      [stapka, predi, klyuch],
      { timeout: 8000 },
    );
  } catch {
    const sega = await p.evaluate(
      (koef) => ({
        izbrano: (document.querySelector(`select[data-koef=${koef}]`) as HTMLSelectElement | null)?.value ?? 'няма селект',
        chislo: document.querySelector('[data-pole="stoynost-a"] .chislo')?.textContent?.trim() ?? 'няма число',
        broySelekti: document.querySelectorAll('select[data-koef]').length,
      }),
      klyuch,
    );
    throw new Error(
      `смяната на „${klyuch}" към „${stapka}" не стигна до числото · ` +
        `избрано=${sega.izbrano} · число=${sega.chislo} (беше ${predi}) · селекти=${sega.broySelekti}`,
    );
  }
}

async function tekstNaPoleto(p: Page, klyuch: string): Promise<string> {
  return p.$eval(`[data-pole="${klyuch}"] .chislo`, (e) => (e as HTMLElement).textContent!.trim());
}

/**
 * СУРОВИЯТ текст на едно поле · за ЧАКАНЕ, не за твърдение (резен 30).
 *
 * Чака се ИЗХОДЪТ да мръдне — нещо, което само пресмятането може да направи.
 * Чакането по ВХОДА (полето, което сам си написал с `fill`) минава веднага и
 * не свидетелства за нищо: точно това остави §84 да трепка след ADR-087 §8.
 */
export async function tekstNaChisloto(p: Page, klyuch: string): Promise<string> {
  return tekstNaPoleto(p, klyuch);
}

/** Цялото число от плочка · за броячи, които не са пари. */
export async function chisloNaPoleto2(p: Page, klyuch: string): Promise<number> {
  const tekst = await tekstNaPoleto(p, klyuch);
  return Number(tekst.replace(/[^\d-]/g, ''));
}

/** Числото на едно поле от Отчети, в цели стотинки — за да се СМЯТА, не да се сравнява текст. */
export async function chisloNaPoleto(p: Page, klyuch: string): Promise<number> {
  const tekst = await tekstNaPoleto(p, klyuch);
  // „−12 500,00 €" → −1250000; неразделимите интервали и знакът за евро падат
  const chist = tekst.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.');
  return Math.round(Number(chist) * 100);
}

export interface DeloVhod {
  readonly myasto: string;
  readonly obekt: string;
  readonly ime: string;
  readonly otgovornik: string;
  readonly ot: string;
  readonly do: string;
  readonly otsenka: string;
  readonly nad?: string;
  /** по избор · подразбраното е първото в менюто, „чака" (резен 30) */
  readonly sastoyanie?: string;
  /** по избор · правото на час (резен 68 · И124 т.1) */
  readonly chas?: string;
}

export async function zapishiDelo(
  p: Page,
  { myasto, obekt, ime, otgovornik, ot, do: doData, otsenka, nad, sastoyanie, chas }: DeloVhod,
): Promise<void> {
  await p.fill('#d-myasto', myasto);
  await p.fill('#d-obekt', obekt);
  await p.fill('#d-ime', ime);
  await p.fill('#d-otgovornik', otgovornik);
  await p.fill('#d-ot', ot);
  await p.fill('#d-do', doData);
  await p.selectOption('#d-otsenka', otsenka);
  if (chas) await p.fill('#d-chas', chas);
  // СЪСТОЯНИЕТО по избор · подразбраното е първото в менюто („чака"), тъй че
  // старите викащи не се менят (резен 30).
  if (sastoyanie) await p.selectOption('#d-sastoyanie', sastoyanie);
  if (nad) await p.selectOption('#d-nad', { label: nad });
  await sSabitie(p, () => p.click('#d-forma-delo button[type=submit]'));
}

export async function smetni(p: Page, opis: string, suma: string, stavka: string): Promise<void> {
  // Екранът се прерисува целият след всяко действие — чака се РЕДЪТ да се появи,
  // не просто таблицата, иначе следващото писане пада върху сменен DOM.
  const predi = await p.$$eval('.red.smyatane', (r) => r.length);
  await p.fill('#smyatane-opis', opis);
  await p.fill('#smyatane-suma', suma);
  await p.selectOption('#smyatane-stavka', stavka);
  await p.click('#forma-smyatane button[type=submit]');
  await p.waitForFunction((n) => document.querySelectorAll('.red.smyatane').length > (n as number), predi);
}

/**
 * ПОВТАРЯ ДЕЙСТВИЕТО, ДОКАТО ПОСЛЕДИЦАТА НЕ СЕ ПОЯВИ · група Ж2 (`docs/11`).
 *
 * ЗАЩО НЕ СТИГА ЕДНО ЧАКАНЕ. Обвивката `deystvieSPrerisuvane` чака
 * прерисуването СЛЕД действието — а опасното е прерисуването ПРЕДИ него: то
 * подменя възела, връща старата стойност, и написаното изчезва, преди `change`
 * изобщо да се вдигне. Тогава изходът не мърда НИКОГА и чакането изтича. Едно
 * чакане, колкото и дълго, не може да поправи действие, което не е стигнало.
 *
 * ЗАЩО НЕ `napishiSigurno`. То чака полето да държи ДОСЛОВНО писаното. Има
 * полета, които екранът пренаписва в СВОЙ вид („3500" → „3 500,00"): там
 * дословното чакане не се сбъдва никога и проходът спира. Опитано и счупено
 * веднъж (записът е в `smeniPoleto`), после проверено пак в резен 44.
 *
 * ЗАЩО НЕ Е ФЛЕЙК. Причината е НАЗОВАНА, а не изтърпяна: действието не е
 * стигнало до екрана. Опитите са БРОЕНИ и свършват — пет по три секунди, после
 * се пада с думи и с ИМЕТО на онова, което не е станало. Безкраен опит би бил
 * премълчан отказ; гол таймаут казва „проходът се спъна" и нищо повече.
 *
 * ДЕЙСТВИЕТО ТРЯБВА ДА Е ПОВТОРИМО. Викащият дава `deystvie`, което може да се
 * изпълни втори път без вреда — клик по превключвател се пази отвътре, а не тук.
 */
export async function dokatoStane(
  p: Page,
  deystvie: () => Promise<void>,
  uslovie: () => Promise<boolean>,
  kakvo: string,
  opiti = 5,
): Promise<void> {
  for (let opit = 1; opit <= opiti; opit += 1) {
    await deystvie();
    for (let chakane = 0; chakane < 20; chakane += 1) {
      if (await uslovie()) return;
      await p.waitForTimeout(150);
    }
  }
  throw new Error(`${kakvo} · не стана след ${opiti} опита`);
}

/**
 * СМЕНЯ едно поле и чака САМАТА СТОЙНОСТ да се появи на екрана.
 *
 * `deystvieSPrerisuvane` чака ПРЕРИСУВАНЕТО. То свършва — но полето се
 * пренаписва СЛЕД записа в паметта на екрана, и следващото попълване пада в
 * МЪРТЪВ ВЪЗЕЛ: написаното се изтрива под ръцете, а проверката отдолу мери
 * старото число.
 *
 * Капанът е платен ТРИ пъти — при базите (§84, ADR-034), при възрастта (§89,
 * ADR-072 §7.4) и при обхвата на справките (§92). Първите два се поправиха НА
 * МЯСТО, всеки със свое чакане; третият получи този дом (правило 17).
 *
 * ═══ И НЕ ВСЯКО ПОЛЕ ГО ТЪРПИ ═══
 *
 * Опитах да го сложа и на §84 — и го СЧУПИХ детерминирано: базата на
 * Калкулатора се пренаписва от екрана в СВОЙ вид, значи чакането на дословната
 * стойност не се сбъдва никога и проходът спира. Затова помощникът НЕ се
 * налага навсякъде: ползва се там, където полето връща онова, което е приело.
 * Обобщение, направено без мярка, е по-скъпо от повторението, което заменя.
 */
export async function smeniPoleto(p: Page, znak: string, stoynost: string): Promise<void> {
  await deystvieSPrerisuvane(p, async () => {
    await p.fill(znak, stoynost);
    await p.dispatchEvent(znak, 'change');
  });
  await p.waitForFunction(
    ([z, v]) => (document.querySelector(z as string) as HTMLInputElement | null)?.value === v,
    [znak, stoynost],
  );
}

/**
 * ПИШЕ В ПОЛЕ И ИЗЛИЗА ОТ НЕГО · точно каквото прави човек (резен 29).
 *
 * ═══ ТРИ ПЪТЯ, И ДВАТА КЪСИ ПАДНАХА ═══
 *
 * Само `fill` НЕ пуска „change" изобщо — проходът увисва, чакайки прерисуване,
 * което няма как да дойде (резен 25 · ADR-085 §7.3; после пак в резен 26).
 * `fill` + ръчен `dispatchEvent` пуска ДВЕ събития: първото прерисува екрана, а
 * второто стига до вече откачения възел, чието затваряне още помни празната
 * стойност (268 срещу 269 събития).
 *
 * Остава третото — онова, което човекът наистина прави: пише и излиза.
 *
 * ═══ ЗАЩО ТУК, А НЕ ТРЕТО КОПИЕ ═══
 *
 * Дословно същите два реда живееха в `razdeli/sesii.ts` и `razdeli/plashtaniya-arhiv.ts`,
 * всеки със своя половин обяснение. Трети викащ е моментът, в който копието се
 * плаща (правило 17) — а поуката е скъпа и не бива да се разказва на части.
 *
 * НЕ Е `smeniPoleto`: онова чака прерисуване и СЛЕД това стойността на полето.
 * Тук прерисуването е решение на викащия — понякога след писането се брои
 * събитие, а не се чака екран.
 */
export async function napishiVPoleto(p: Page, znak: string, stoynost: string): Promise<void> {
  await p.fill(znak, stoynost);
  await p.$eval(znak, (e) => (e as HTMLElement).blur());
}

/**
 * ПИШЕ И ЧАКА ПОЛЕТО ДА ГО ДЪРЖИ · група Е, трета форма (резен 44 · `docs/11`).
 *
 * `fill` слага стойността и вдига `input` — но НЕ обещава, че тя ще ОСТАНЕ:
 * прерисуване, тръгнало преди или заедно с него, подменя възела и написаното
 * изчезва. Тогава следващият клик подава ПРАЗНА форма, Вратата отказва, и
 * докладът казва „иска име" — все едно записът е счупен, а счупено е ПИСАНЕТО.
 *
 * Платено с §95, който падаше веднъж на три пускания (резен 43). Тук чакането е
 * ЕДНО и се вика отвсякъде, вместо всеки раздел да си пише свое.
 *
 * НЕ ЧАКА ПРЕРИСУВАНЕ · то е решение на викащия, точно както при
 * `napishiVPoleto`. Тук се обещава само едно: полето наистина държи писаното.
 */
export async function napishiSigurno(p: Page, znak: string, stoynost: string): Promise<void> {
  await p.fill(znak, stoynost);
  await p.waitForFunction(
    ([z, v]) => (document.querySelector(z as string) as HTMLInputElement | null)?.value === v,
    [znak, stoynost],
    { timeout: 5_000 },
  );
}
