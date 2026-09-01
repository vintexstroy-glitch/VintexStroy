import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { naEkran, natisni, tekstNa } from '../yadro/pomoshtni.ts';

/** 39б · границата на книгата | 39в · пренасянето има БУТОНИ, не само обещание */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '39б · границата на книгата';
    await naEkran(p, 'tablo', '[data-pole="granitsa-na-knigata"]');
    const granitsa = await tekstNa(p, '[data-pole="granitsa-na-knigata"]');
    proveri('Таблото казва, че ключът идва от ТВОЯ имейл',
      granitsa.includes('ТВОЯ имейл'), true);
    // Дотук границата беше и ПРИЗНАНИЕ („това още не е построено"). ADR-055
    // го построи, тъй че текстът вече казва КАК минава пренасянето — а
    // проходът проверява именно новото, вместо да пази старото признание.
    proveri('и че двете книги НЕ се сливат',
      granitsa.includes('НЕ се сливат'), true);
    proveri('и че пренасянето минава през Драйва',
      granitsa.includes('Драйва'), true);
    proveri('и че несъгласията са НАХОДКИ, не тихо решение',
      granitsa.includes('не се решават сами'), true);

    razdel = '39в · пренасянето има БУТОНИ, не само обещание';
    proveri('дърпането стои на екрана',
      await p.$$eval('#drapni-drayv', (e) => e.length), 1);
    proveri('бутането също',
      await p.$$eval('#butni-drayv', (e) => e.length), 1);
    proveri('и екранът КАЗВА, че достъпът е второ съгласие',
      (await tekstNa(p, '[data-sektsiya=prenasyane]')).includes('второ съгласие'), true);

    // ══ 40б · картата на връзките · БРОЕНА на екрана, не преписана ═══════════
}

/** 67 · многото вериги · чуждата верига се появява | 67 · многото вериги · моята верига остава цяла | 67 · многото вериги · сверката КАЗВА сблъсъка | 67 · многото вериги · Таблото казва коя е моята */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '67 · многото вериги · чуждата верига се появява';
    const chuzhdiyat = await p.evaluate(async () => {
      const db = await new Promise((da, ne) => {
        const z = indexedDB.open('masterbook');
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      const vsichki = await new Promise((da, ne) => {
        const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
        z.onsuccess = () => da(z.result);
        z.onerror = () => ne(z.error);
      });
      const kniga = (vsichki as any).map((s: any) => s.naematel).find((n: any) => !n.includes('#'));
      const veriga = `${kniga}#pero:kolega@example.bg`;
      const sabitie = {
        opId: 'kolega-imot-1',
        ts: '2026-08-26T09:00:00.000Z',
        naematel: veriga,
        actor: 'kolega@example.bg',
        seq: 1,
        prevHash: '',
        hash: 'chuzhd-hash-1',
        type: 'ИмотДобавен',
        sashtnost: { vid: 'imot', id: 'IMOT-NA-KOLEGATA' },
        payload: { adres: 'ул. Колегата 7', edinitsa: 'ап. 1', ploshtad_kvsm: 55 },
      };
      await new Promise<void>((da, ne) => {
        const t = (db as any).transaction('sabitiya', 'readwrite');
        const z = t.objectStore('sabitiya').add(sabitie);
        z.onsuccess = () => da();
        z.onerror = () => ne(z.error);
      });
      return { kniga, veriga };
    });

    await p.reload();
    await p.waitForSelector('.nav');
    await naEkran(p, 'imoti', '#forma-imot');
    proveri('имотът на ДРУГИЯ писач се вижда · книгата е сгъната',
      await p.$$eval('.red.imot', (r) => r.some((e) => e.textContent.includes('ул. Колегата 7'))),
      true);

    razdel = '67 · многото вериги · моята верига остава цяла';
    await naEkran(p, 'tablo', '#proveri');
    await natisni(p, '#proveri');
    await p.waitForFunction(() => document.body.innerText.includes('Веригата е цяла'));
    proveri('чуждият хеш НЕ поваля моята проверка',
      (await p.evaluate(() => document.body.innerText)).includes('Веригата е цяла'), true);

    razdel = '67 · многото вериги · сверката КАЗВА сблъсъка';
    // Колегата не е вписан като служител — шестият сблъсък. Сверката тръгва
    // със същия бутон като проверката на веригата и излиза С ДУМИ.
    const sledProverka = await p.evaluate(() => document.body.innerText);
    proveri('сверката е тръгнала със същия бутон', sledProverka.includes('сверката'), true);
    proveri('и назовава невписания писач', sledProverka.includes('kolega@example.bg'), true);
    proveri('и казва, че НИЩО не е поправено',
      sledProverka.includes('Нищо не е поправено'), true);

    razdel = '67 · многото вериги · Таблото казва коя е моята';
    proveri('книгата се вижда на екрана',
      (await p.evaluate(() => document.body.innerText)).includes(chuzhdiyat.kniga), true);

    // ══ 48 · джобът НАКРАЯ · чужда азбука, довлечена от кой да е екран ═══════
    //
    // §16 гледа джоба РАНО — а знак от чужда азбука, сложен на екран, който се
    // отваря по-късно, минаваше незабелязано. Платено с находка: едно „Δ" в
    // Сметки (гръцка буква, U+0394) накара браузъра да дотегли ЦЯЛАТА гръцка
    // азбука — 32 KB шрифт за един знак — и обещанието „джобът пази СВОЯ пакет"
    // се скъса не от джоба, а от съдържанието. Затова СЪЩАТА проверка стои и
    // тук, след като всички екрани вече са минали.
}
