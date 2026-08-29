/**
 * ПРОХОД ПРЕЗ БРАУЗЪРА — целият път, в истински Chromium.
 *
 * Не проверява какво връща кодът, а какво ПИШЕ НА ЕКРАНА. Затова всяко
 * очакване е низ, както го чете човек: „1200,00", не 120000.
 *
 * Пуска се с `npm run proba`. Пада с ненулев код и изброява всяко разминаване.
 *
 * Тук е само РЪНЪРЪТ: 44-те блока живеят в `razdeli/`, извикани в ТОЧНО
 * оригиналния ред на записване (виж бележката за реда по-долу) — състоянието
 * (брой събития, вече навигиран екран) тече между тях в тази последователност,
 * не по азбучен ред на файловете.
 */

import { chromium, nameriHroma } from '../stroezh/hrom.mjs';
import { Broyach } from './yadro/proverka.ts';
import type { KonteksNaProhoda } from './yadro/kontekst.ts';
import { postaviGoogle } from './yadro/mok-google.ts';
import { pusniServer, pochakaySurvara } from './yadro/server.ts';
import { tishina } from './yadro/tishina.ts';

import * as vhodISamolichnost from './razdeli/vhod-i-samolichnost.ts';
import * as imoti from './razdeli/imoti.ts';
import * as pari from './razdeli/pari.ts';
import * as smetki from './razdeli/smetki.ts';
import * as infrastruktura from './razdeli/infrastruktura.ts';
import * as tablo from './razdeli/tablo.ts';
import * as nastroyki from './razdeli/nastroyki.ts';
import * as stoynost from './razdeli/stoynost.ts';
import * as gant from './razdeli/gant.ts';
import * as menyuta from './razdeli/menyuta.ts';
import * as udobstvoto from './razdeli/udobstvoto.ts';
import * as mnogotoVerigi from './razdeli/mnogoto-verigi.ts';
import * as ii from './razdeli/ii.ts';
import * as tabove from './razdeli/tabove.ts';
import * as lichno from './razdeli/lichno.ts';
import * as prodazhbi from './razdeli/prodazhbi.ts';
import * as krediti from './razdeli/krediti.ts';

async function main(): Promise<void> {
  const server = pusniServer();
  await pochakaySurvara();

  const brauzar = await chromium.launch({ executablePath: nameriHroma() });
  const stranitsa = await brauzar.newPage();

  // ── ПОДСТАВЕНИЯТ GOOGLE (виж `yadro/mok-google.ts`) ────────────────────
  await postaviGoogle(stranitsa);

  const greshkiVKonzolata: string[] = [];
  stranitsa.on('pageerror', (e) => greshkiVKonzolata.push(`pageerror: ${e.message}`));
  stranitsa.on('console', (m) => {
    // Вече нищо не се тегли отвън — шрифтовете са в пакета. Единственото
    // очаквано мълчание е в раздел 16, където мрежата се къса НАРОЧНО
    // (флагът `tishina.ochakvana`, вдиган и свалян в `infrastruktura.ts`).
    if (m.type() === 'error' && !tishina.ochakvana) {
      greshkiVKonzolata.push(`console: ${m.text()}`);
    }
  });
  // Сторното пита за причина през prompt().
  stranitsa.on('dialog', (d) => d.accept('сгрешена сума'));

  const p = stranitsa;
  const broyach = new Broyach();
  const ctx: KonteksNaProhoda = { stranitsa: p, broyach };

  try {
    // Редът тук е ТОЧНО оригиналният ред на записване в стария `prohod.mjs`
    // (виж манифеста, произведен при разрязването) — не азбучен, не по екран.
    // Два чифта носят снимка на състоянието напред: `nastroyki.blok1` →
    // `smetki.blok4` (razhodPredi/koloniPredi) и `lichno.blok1` → `lichno.blok2`
    // (lichniyat) — виж бележките в самите файлове.
    await vhodISamolichnost.blok1(ctx);
    await imoti.blok1(ctx);
    await pari.blok1(ctx);
    await smetki.blok1(ctx);
    await infrastruktura.blok1(ctx);
    await imoti.blok2(ctx);
    await smetki.blok2(ctx);
    await infrastruktura.blok2(ctx);
    await tablo.blok1(ctx);
    await infrastruktura.blok3(ctx);
    await smetki.blok3(ctx);
    const snimkaNastroyki = await nastroyki.blok1(ctx);
    await smetki.blok4(ctx, snimkaNastroyki);
    await stoynost.blok1(ctx);
    await smetki.blok5(ctx);
    await gant.blok1(ctx);
    await menyuta.blok1(ctx);
    await imoti.blok3(ctx);
    await udobstvoto.blok1(ctx);
    await stoynost.blok2(ctx);
    await smetki.blok6(ctx);
    await nastroyki.blok2(ctx);
    await mnogotoVerigi.blok1(ctx);
    await nastroyki.blok3(ctx);
    await ii.blok1(ctx);
    await tabove.blok1(ctx);
    await ii.blok2(ctx);
    await smetki.blok7(ctx);
    await stoynost.blok3(ctx);
    await nastroyki.blok4(ctx);
    const lichniyat = await lichno.blok1(ctx);
    await udobstvoto.blok3(ctx);
    await udobstvoto.blok4(ctx);
    await menyuta.blok2(ctx);
    await lichno.blok2(ctx, lichniyat);
    await menyuta.blok3(ctx);
    await smetki.blok8(ctx);
    await nastroyki.blok5(ctx);
    await smetki.blok9(ctx);
    await smetki.blok10(ctx);
    await smetki.blok11(ctx);
    await smetki.blok12(ctx);
    await udobstvoto.blok2(ctx);
    await nastroyki.blok6(ctx);
    /**
     * §94 и §95 стоят ТУК · и мястото е ИЗМЕРЕНО, не избрано.
     *
     * §95 иска НАСТРОЙКИ, а те не са гол бутон, а ПАДАЩ РЕД (ADR-066): пунктът
     * отваря менюто, екранът се сменя чак от ТЕМАТА. Освен това редът не е
     * достъпен навсякъде в прохода — по-късните блокове менят лентата, и
     * чакането там виси трийсет секунди с „на екрана: Имоти".
     *
     * `nastroyki.blok6` (§63) току-що е доказал, че редът се отваря — затова
     * мястото е точно след него. Редът на блоковете е ЧАСТ ОТ ДОГОВОРА им.
     */
    await prodazhbi.blok1(ctx);
    await prodazhbi.blok2(ctx);
    await prodazhbi.blok3(ctx);
    await krediti.blok1(ctx);
    await krediti.blok2(ctx);
    await tablo.blok2(ctx);
    await tablo.blok3(ctx);
    await vhodISamolichnost.blok2(ctx);
    await infrastruktura.blok4(ctx);
    await mnogotoVerigi.blok2(ctx);
    await infrastruktura.blok5(ctx);
    // §71 стои НАКРАЯ нарочно: обхожда лентата, отваря редове и мени екрана,
    // а дотогава всеки друг блок вече си е взел своето. Блок, който мести
    // състояние под следващия, е по-скъп от липсващ.
    await menyuta.blok4(ctx);
    await udobstvoto.blok5(ctx);
  } catch (greshka) {
    broyach.dobaviNahodka({
      razdel: broyach.posledenRazdel,
      kakvo: 'проходът се спъна',
      vidyano: String(greshka).split('\n')[0] ?? String(greshka),
      ochakvano: 'да мине',
    });
    // ЦЕЛИЯТ дневник на Playwright, не само първият ред. Първият ред казва
    // „page.click: Timeout" и НИЩО повече — а долните редове казват КОЙ
    // локатор и защо („element is not visible"). Струваше четири пуска на
    // прохода, за да се разбере, че спънатият бутон не е онзи, чийто раздел
    // пише отгоре: разделът изостава с една проверка.
    console.log(`\n  ЦЯЛАТА ГРЕШКА:\n  ${String(greshka).replace(/\n/g, '\n  ')}\n`);
    // Какво е имало на екрана в мига на спъването — „timeout" сам по себе си
    // не казва нищо, а снимката се гледа чак после.
    const naEkrana = await p
      .evaluate(() => document.getElementById('ekran')?.innerText?.slice(0, 300) ?? 'няма екран')
      .catch(() => 'екранът не се чете');
    console.log(`\n  НА ЕКРАНА В МИГА НА СПЪВАНЕТО:\n  ${naEkrana.replace(/\n/g, '\n  ')}\n`);

    // НАСЛОЕНОТО · менютата и прозорците висят на `body`, ИЗВЪН `#ekran`.
    // Дъмпът горе не ги вижда, и точно затова „менюто го няма" изглеждаше
    // еднакво с „менюто е там, но е празно". Платено с един пуск на прохода.
    const nasloeno = await p
      .evaluate(() =>
        [...document.body.children]
          .filter((e) => e.id !== 'ekran')
          .map((e) => {
            const r = e.getBoundingClientRect();
            return `${e.tagName.toLowerCase()}.${e.className || '—'} · ${Math.round(r.width)}×${Math.round(
              r.height,
            )} на ${Math.round(r.left)},${Math.round(r.top)} · ${(e as HTMLElement).innerText
              ?.replace(/\s+/g, ' ')
              .slice(0, 120)}`;
          })
          .join('\n') || 'нищо не виси на body извън екрана',
      )
      .catch(() => 'наслоеното не се чете');
    console.log(`\n  НАСЛОЕНО ВЪРХУ BODY:\n  ${nasloeno.replace(/\n/g, '\n  ')}\n`);
    await p.screenshot({ path: 'proba/spanal.png', fullPage: true }).catch(() => {});
  }

  broyach.proveri('—', 'конзолата е чиста', greshkiVKonzolata.join(' | ') || 'чиста', 'чиста');

  await brauzar.close();
  try {
    if (server.pid) process.kill(-server.pid);
  } catch {
    /* вече е спрян */
  }

  console.log(`\nМинали: ${broyach.minali.length}`);
  if (broyach.nahodki.length === 0) {
    console.log('НАХОДКИ: няма. Проходът мина целия път.\n');
    process.exit(0);
  }
  console.log(`\nНАХОДКИ (${broyach.nahodki.length}):\n`);
  for (const n of broyach.nahodki) {
    console.log(`  ✗ [${n.razdel}] ${n.kakvo}`);
    console.log(`      чакано: ${n.ochakvano}`);
    console.log(`      видяно: ${n.vidyano}\n`);
  }
  process.exit(1);
}

await main();
