import type { KonteksNaProhoda } from '../yadro/kontekst.ts';
import { OTKRIVASHTOTO, broySabitiya, naEkran, ostatak, plati, plochka, redove, sSabitie } from '../yadro/pomoshtni.ts';

/** 4 · начисляване | 5 · плащания */
export async function blok1(ctx: KonteksNaProhoda): Promise<void> {
  const { stranitsa: p, broyach } = ctx;
  let razdel = '—';
  const proveri = (kakvo: string, vidyano: unknown, ochakvano: unknown): boolean =>
    broyach.proveri(razdel, kakvo, vidyano, ochakvano);
    razdel = '4 · начисляване';
    await naEkran(p, 'pari', '#forma-nachisli');
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('Сверката затваря'));
    proveri('осем събития след начисляване', await broySabitiya(p), 11 + OTKRIVASHTOTO);
    proveri('дължимо общо', await plochka(p, 'Дължимо общо'), '2 000,00 €');

    const vzemaniya = await redove(p, '.red.vzemane');
    const stroy = vzemaniya.find((r) => r[0]?.startsWith('Стройпласт'));
    proveri('падеж 31 във февруари става 28-и', stroy?.[2]?.startsWith('2026-02-28'), true);

    // втори път — нищо ново
    await p.fill('#period', '2026-02');
    await p.click('#forma-nachisli button[type=submit]');
    await p.waitForFunction(() => document.body.innerText.includes('вече е начислен'));
    proveri('второто натискане не добави събитие', await broySabitiya(p), 11 + OTKRIVASHTOTO);

    // ══ 5 · плащания, надплащане, сторно ═════════════════════════════════
    razdel = '5 · плащания';
    await plati(p, 'Стройпласт', '600,00', 'в брой', '2026-02-10');
    proveri('частично · остатък', await ostatak(p, 'Стройпласт'), '600,00 €');
    proveri('девет събития', await broySabitiya(p), 12 + OTKRIVASHTOTO);

    await plati(p, 'Стройпласт', '700,00', 'банка', '2026-02-15');
    proveri('надплатеното излиза от просрочените', await ostatak(p, 'Стройпласт'), 'НЯМА РЕД');
    proveri('дължимо общо след надплащане', await plochka(p, 'Дължимо общо'), '700,00 €');

    const zaStorno = (await redove(p, '.red.plashtane')).find((r) => r[3] === '700,00 €');
    proveri('плащането от 700,00 се вижда', Boolean(zaStorno), true);
    await sSabitie(p, () => p.click(`.red.plashtane:has-text("700,00") [data-storno]`));
    proveri('единайсет събития след сторно', await broySabitiya(p), 14 + OTKRIVASHTOTO);
    proveri('сторното върна остатъка', await ostatak(p, 'Стройпласт'), '600,00 €');

    await plati(p, 'Стройпласт', '600,00', 'банка', '2026-02-15');
    proveri('дванайсет събития', await broySabitiya(p), 15 + OTKRIVASHTOTO);
    proveri('дължимо общо накрая', await plochka(p, 'Дължимо общо'), '800,00 €');

    // ══ 6 · сметки и ДДС ═════════════════════════════════════════════════
}
