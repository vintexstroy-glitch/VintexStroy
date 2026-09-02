import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OTKRIVASHTOTO, broySabitiya, deystvieSPrerisuvane, naEkran, natisni, plochka, tekstNa } from '../yadro/pomoshtni.ts';
import { readFile } from 'node:fs/promises';
import { ADRES } from '../yadro/server.ts';

/** 0 · входът с Google | 1 · празно | 60 · Стопанинът */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
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
          const z = (db as any).transaction('sabitiya', 'readonly').objectStore('sabitiya').getAll();
          z.onsuccess = () => da(z.result);
        });
        const parvo = (vsichki as any).sort((a: any, b: any) => a.seq - b.seq)[0];
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
}

/** 61 · Възстановяването · запасният контакт | 61 · Възстановяването · телефонът НЕ пътува | 61 · Възстановяването · отказът е с думи */
export async function blok2(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
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
      natisni(p, '#iznesi'),
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
}
