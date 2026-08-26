/**
 * ПАРАМЕТРИТЕ ПРИ ВЪВЕЖДАНЕ · осемте вида, настроени за ТОЗИ бизнес
 * (И96 т.1 · ADR-046).
 *
 * Негови думи: „Тези неща са параметри при различни бизнеси и да може да ги
 * контролираш от Настройки, и дори стопанинът да дава негова бележка, когато
 * се случи."
 *
 * Домейнът на самите проверки е тестван от ADR-032. Тук се пази ДРУГО: че
 * параметърът влиза в Журнала като събитие, че го мени само Стопанинът, и че
 * едно събитие мени ЕДИН вид, без да мете останалите седем.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { OTKRIVASHTO_SABITIE } from '../src/domein/stopanin.js';
import {
  nastroykiPoPodrazbirane,
  proveriNastroyka,
  sPromenenaNastroyka,
  VIDOVE_PROBLEM,
} from '../src/domein/vhodni-problemi.js';

const GLAVEN = 'vintexstroy@gmail.com';

async function knigata(actor = GLAVEN) {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: SHA,
    parvoto: OTKRIVASHTO_SABITIE,
  });
  const naStopanina = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: GLAVEN,
    chasovnik: () => '2026-08-25T09:00:00.000Z',
  });
  await naStopanina.zapishiStopanina(
    { imeyl: GLAVEN, ime: 'Иво', dostavchik: 'google' },
    { opId: 'op-0' },
  );
  const deystviya =
    actor === GLAVEN
      ? naStopanina
      : new Deystviya({
          vrata,
          dnevnik,
          naematel: 'vintexstroy',
          actor,
          chasovnik: () => '2026-08-25T09:00:00.000Z',
        });
  return { dnevnik, deystviya };
}

const ogledaloto = async (d: DnevnikVPametta) => fold(await d.chetiVsichki('vintexstroy'));

describe('сливането · едно събитие мени ЕДИН вид', () => {
  it('останалите седем не мърдат', () => {
    const sega = nastroykiPoPodrazbirane();
    const nov = sPromenenaNastroyka(sega, 'dublikat', {
      vklyuchen: false,
      sila: 'preduprezhdava',
      belezhka: 'при нас се случва',
    });
    expect(nov['dublikat'].vklyuchen).toBe(false);
    for (const vid of VIDOVE_PROBLEM) {
      if (vid === 'dublikat') continue;
      expect(nov[vid], vid).toEqual(sega[vid]);
    }
  });

  it('НЕ мени подадената карта · връща нова', () => {
    const sega = nastroykiPoPodrazbirane();
    sPromenenaNastroyka(sega, 'prazno', { vklyuchen: false, sila: 'spira', belezhka: '' });
    expect(sega['prazno'].vklyuchen).toBe(true);
  });
});

describe('проверката · какво не става параметър', () => {
  it('непознат вид пада', () => {
    expect(() =>
      proveriNastroyka('нямагоняма', { vklyuchen: true, sila: 'spira', belezhka: '' }),
    ).toThrow(/Няма такъв вид/);
  });

  it('трета сила няма', () => {
    expect(() =>
      proveriNastroyka('dublikat', { vklyuchen: true, sila: 'може би' as never, belezhka: '' }),
    ).toThrow(/спира/);
  });

  it('бележката има таван · тя допълва легендата, не я заменя', () => {
    expect(() =>
      proveriNastroyka('dublikat', { vklyuchen: true, sila: 'spira', belezhka: 'а'.repeat(201) }),
    ).toThrow(/твърде дълга/);
  });

  /**
   * НАЙ-ВАЖНОТО тук. Правило 9 е ЗАКОН, не параметър по бизнес: подадената
   * справка заключва месеца. Ако този ред можеше да се разхлаби от Настройки,
   * замразяването щеше да е препоръка.
   */
  it('замразеният период НЕ се разхлабва от Настройки', () => {
    expect(() =>
      proveriNastroyka('zamrazen-period', { vklyuchen: false, sila: 'spira', belezhka: '' }),
    ).toThrow(/правило 9/);
    expect(() =>
      proveriNastroyka('zamrazen-period', {
        vklyuchen: true,
        sila: 'preduprezhdava',
        belezhka: '',
      }),
    ).toThrow(/правило 9/);
    // А включен и спиращ — минава.
    expect(() =>
      proveriNastroyka('zamrazen-period', { vklyuchen: true, sila: 'spira', belezhka: 'бележка' }),
    ).not.toThrow();
  });
});

describe('в Журнала · параметърът е събитие, не предпочитание', () => {
  it('записва се и се ЧЕТЕ от Огледалото', async () => {
    const { dnevnik, deystviya } = await knigata();
    await deystviya.zapishiParametarNaVhoda(
      { vid: 'dublikat', vklyuchen: false, sila: 'preduprezhdava', belezhka: 'при нас се случва' },
      { opId: 'op-p' },
    );
    const o = await ogledaloto(dnevnik);
    expect(o.parametriNaVhoda['dublikat']).toEqual({
      vklyuchen: false,
      sila: 'preduprezhdava',
      belezhka: 'при нас се случва',
    });
  });

  it('Огледалото почва от ПОДРАЗБИРАНЕТО, не от празно', async () => {
    const { dnevnik } = await knigata();
    const o = await ogledaloto(dnevnik);
    // Липсващият параметър значи „както казва занаятът", а не „няма проверка".
    expect(o.parametriNaVhoda).toEqual(nastroykiPoPodrazbirane());
  });

  it('вторият запис за същия вид ПОПРАВЯ, не трупа', async () => {
    const { dnevnik, deystviya } = await knigata();
    for (const [i, belezhka] of ['първа', 'втора'].entries()) {
      await deystviya.zapishiParametarNaVhoda(
        { vid: 'prazno', vklyuchen: true, sila: 'spira', belezhka },
        // Различни от `op-0` — той е зает от записа на Стопанина, а повторен
        // opId връща СТАРИЯ резултат (правило 5) и нищо ново не влиза.
        { opId: `op-parametar-${i}` },
      );
    }
    const o = await ogledaloto(dnevnik);
    expect(o.parametriNaVhoda['prazno'].belezhka).toBe('втора');
    // Журналът пази и двете — поправката е ДОБАВЯНЕ (правило 1).
    const sabitiya = await dnevnik.chetiVsichki('vintexstroy');
    expect(sabitiya.filter((s) => s.type === 'ПараметърНаВходаЗаписан')).toHaveLength(2);
  });

  it('и НЕ мете останалите седем', async () => {
    const { dnevnik, deystviya } = await knigata();
    await deystviya.zapishiParametarNaVhoda(
      { vid: 'dublikat', vklyuchen: false, sila: 'preduprezhdava', belezhka: '' },
      { opId: 'op-p' },
    );
    const o = await ogledaloto(dnevnik);
    const po = nastroykiPoPodrazbirane();
    for (const vid of VIDOVE_PROBLEM) {
      if (vid === 'dublikat') continue;
      expect(o.parametriNaVhoda[vid], vid).toEqual(po[vid]);
    }
  });

  it('СЛУЖИТЕЛ не ги мени · те важат за целия бизнес', async () => {
    const { deystviya } = await knigata('petar@example.bg');
    await expect(
      deystviya.zapishiParametarNaVhoda(
        { vid: 'dublikat', vklyuchen: false, sila: 'spira', belezhka: '' },
        { opId: 'op-p' },
      ),
    ).rejects.toThrow(/само от Стопанина/);
  });

  it('и невалиден параметър не влиза изобщо', async () => {
    const { dnevnik, deystviya } = await knigata();
    await expect(
      deystviya.zapishiParametarNaVhoda(
        { vid: 'zamrazen-period', vklyuchen: false, sila: 'spira', belezhka: '' },
        { opId: 'op-p' },
      ),
    ).rejects.toThrow(/правило 9/);
    const sabitiya = await dnevnik.chetiVsichki('vintexstroy');
    expect(sabitiya.filter((s) => s.type === 'ПараметърНаВходаЗаписан')).toHaveLength(0);
  });
});
