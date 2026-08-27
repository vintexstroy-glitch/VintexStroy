import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { denOtDnes, naEkran, zapishiDelo } from '../yadro/pomoshtni.ts';

/** 24 · Гант */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
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
      (await p.$eval('.prazno', (e) => (e.closest('section') as any).textContent)).includes('Времевия Ред'), true);

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
}
