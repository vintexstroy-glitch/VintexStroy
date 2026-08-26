/**
 * ВЪЗСТАНОВЯВАНЕТО · запасният контакт и връщането на архив (И100 · ADR-044).
 *
 * Негови думи: „дай възможност за въстановяване на акаунт с добавен свързан за
 * сигурност… и да се възстанови архив на друг имейл, от верификация на вкаран
 * преди това имейл и телефон."
 *
 * Тук се пази цялата верига на този път: как се сравнява телефон, какво влиза
 * в Журнала (и какво НЕ влиза), кой може да вземе Журнала и какво става с
 * ролите после.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { SHA } from './pomoshtni.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { pregledayIznos } from '../src/domein/vnos.js';
import {
  mozheDaVzemeZhurnala,
  otpechatakNaTelefon,
  OTKRIVASHTO_SABITIE,
  podravniTelefon,
  poslednite2,
  rolyataNa,
  zapasniyat,
} from '../src/domein/stopanin.js';

const GLAVEN = 'vintexstroy@gmail.com';
const ZAPASEN = 'zhena@example.bg';
const TELEFON = '0888 123 456';

/** Журнал с вписан Стопанин · основата на всичко по-долу. */
async function knigata(actor = GLAVEN) {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({
    dnevnik,
    pravata: new VsichkoRazresheno(),
    sha: SHA,
    parvoto: OTKRIVASHTO_SABITIE,
  });
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor,
    chasovnik: () => '2026-08-25T09:00:00.000Z',
  });
  return { dnevnik, vrata, deystviya };
}

async function sStopanin() {
  const vsichko = await knigata();
  await vsichko.deystviya.zapishiStopanina(
    { imeyl: GLAVEN, ime: 'Иво', dostavchik: 'google' },
    { opId: 'op-0' },
  );
  return vsichko;
}

async function vpishiZapasen(d: Deystviya, opId = 'op-z') {
  return d.zapishiZapasenKontakt(
    {
      imeyl: ZAPASEN,
      telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA),
      poslednite: poslednite2(TELEFON),
    },
    { opId },
  );
}

describe('телефонът · един номер, десет изписвания', () => {
  it('водещата нула и кодът на държавата дават ЕДНО и също', () => {
    const ochakvano = '359888123456';
    expect(podravniTelefon('0888 123 456')).toBe(ochakvano);
    expect(podravniTelefon('+359 888 123 456')).toBe(ochakvano);
    expect(podravniTelefon('00359 888 123 456')).toBe(ochakvano);
    expect(podravniTelefon('0888-123-456')).toBe(ochakvano);
  });

  it('различните номера остават различни', () => {
    expect(podravniTelefon('0888 123 456')).not.toBe(podravniTelefon('0888 123 457'));
  });

  it('отпечатъкът следва номера, не изписването', async () => {
    const a = await otpechatakNaTelefon('0888 123 456', SHA);
    const b = await otpechatakNaTelefon('+359 (888) 123 456', SHA);
    const v = await otpechatakNaTelefon('0888 123 457', SHA);
    expect(a).toBe(b);
    expect(a).not.toBe(v);
  });

  it('празен телефон не става доказателство', async () => {
    await expect(otpechatakNaTelefon('   ', SHA)).rejects.toThrow(/Празен телефон/);
  });

  it('последните две цифри се смятат СЛЕД подравняването', () => {
    expect(poslednite2('0888 123 456')).toBe('56');
    expect(poslednite2('+359 888 123 456')).toBe('56');
  });
});

describe('вписването на запасния контакт', () => {
  it('влиза от Стопанина и се ЧЕТЕ от Огледалото', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(zapasniyat(o)?.imeyl).toBe(ZAPASEN);
    expect(zapasniyat(o)?.poslednite).toBe('56');
  });

  /**
   * НОМЕРЪТ НЕ ВЛИЗА В ЖУРНАЛА — влиза само следата му. Иначе личен телефон би
   * пътувал в изнесения файл, а износът се праща по пощата и стои в драйв.
   */
  it('самият НОМЕР го няма никъде в Журнала', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const kakvoPishe = JSON.stringify(await dnevnik.chetiVsichki('vintexstroy'));
    expect(kakvoPishe).not.toContain('888123456');
    expect(kakvoPishe).not.toContain('0888 123 456');
    expect(kakvoPishe).not.toContain('359888123456');
  });

  it('НЕ влиза от друг · това е пътят обратно към НЕГОВИЯ Журнал', async () => {
    const { dnevnik, vrata } = await sStopanin();
    const chuzhd = new Deystviya({
      vrata,
      dnevnik,
      naematel: 'vintexstroy',
      actor: 'chuzhd@example.bg',
      chasovnik: () => '2026-08-25T09:00:00.000Z',
    });
    await expect(vpishiZapasen(chuzhd, 'op-x')).rejects.toThrow(/само от Стопанина/);
  });

  it('НЕ може да е самият главен имейл', async () => {
    const { deystviya } = await sStopanin();
    await expect(
      deystviya.zapishiZapasenKontakt(
        {
          imeyl: GLAVEN,
          telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA),
          poslednite: '56',
        },
        { opId: 'op-z' },
      ),
    ).rejects.toThrow(/загубата на единия/);
  });

  it('ПОСЛЕДНИЯТ вписан важи · старите остават в Журнала, но не действат', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya, 'op-z1');
    await deystviya.zapishiZapasenKontakt(
      {
        imeyl: 'brat@example.bg',
        telefonOtpechatak: await otpechatakNaTelefon('0899 000 111', SHA),
        poslednite: '11',
      },
      { opId: 'op-z2' },
    );
    const sabitiya = await dnevnik.chetiVsichki('vintexstroy');
    const o = fold(sabitiya);
    expect(zapasniyat(o)?.imeyl).toBe('brat@example.bg');
    // Старият запис си стои — Журналът е само за добавяне (правило 1).
    expect(sabitiya.filter((s) => s.type === 'ЗапасенКонтактЗаписан')).toHaveLength(2);
  });
});

describe('кой може да вземе Журнала · четирите отговора с думи', () => {
  it('без вписан запасен контакт пътят е ЗАТВОРЕН, не заобиколен', async () => {
    const { dnevnik } = await sStopanin();
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    const r = mozheDaVzemeZhurnala({ imeyl: ZAPASEN, telefonOtpechatak: 'каквото и да е', o });
    expect(r.mozhe).toBe(false);
    expect(r.kazva).toContain('ПРЕДИ бедата');
  });

  it('чужд имейл получава отказ, който сочи КЪДЕ да търси', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    const r = mozheDaVzemeZhurnala({
      imeyl: 'chuzhd@example.bg',
      telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA),
      o,
    });
    expect(r.mozhe).toBe(false);
    // Казва последните две цифри, за да се познае кой номер е вписан — но не
    // и самия номер, и не и имейла: чуждият не научава нищо ново за него.
    expect(r.kazva).toContain('…56');
    expect(r.kazva).not.toContain(ZAPASEN);
  });

  it('верният имейл с ГРЕШЕН телефон не минава', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    const r = mozheDaVzemeZhurnala({
      imeyl: ZAPASEN,
      telefonOtpechatak: await otpechatakNaTelefon('0888 999 999', SHA),
      o,
    });
    expect(r.mozhe).toBe(false);
    expect(r.kazva).toContain('не съвпада');
  });

  it('двете заедно минават · и регистърът на имейла не пречи', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    const r = mozheDaVzemeZhurnala({
      imeyl: 'Zhena@Example.BG',
      telefonOtpechatak: await otpechatakNaTelefon('+359 888 123 456', SHA),
      o,
    });
    expect(r.mozhe).toBe(true);
  });
});

describe('смяната на Стопанина · единственият път', () => {
  /** Журнал с вписан запасен, гледан през очите на ЗАПАСНИЯ имейл. */
  async function gotovZaSmyana() {
    const { dnevnik, vrata, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const zapasniyatChovek = new Deystviya({
      vrata,
      dnevnik,
      naematel: 'vintexstroy',
      actor: ZAPASEN,
      chasovnik: () => '2026-09-01T09:00:00.000Z',
    });
    return { dnevnik, zapasniyatChovek };
  }

  it('минава от запасния, с телефона и с причина', async () => {
    const { dnevnik, zapasniyatChovek } = await gotovZaSmyana();
    await zapasniyatChovek.smeniStopanina(
      {
        telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA),
        prichina: 'акаунтът е закрит',
      },
      { opId: 'op-s' },
    );
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(o.stopanin).toBe(ZAPASEN);
  });

  it('и оттам нататък РОЛИТЕ се обръщат', async () => {
    const { dnevnik, zapasniyatChovek } = await gotovZaSmyana();
    await zapasniyatChovek.smeniStopanina(
      { telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA), prichina: 'закрит' },
      { opId: 'op-s' },
    );
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(rolyataNa(ZAPASEN, o)).toBe('sobstvenik');
    // Старият главен имейл не е служител — значи НАБЛЮДАВА. Това не е наказание,
    // а най-тясното: акаунтът му вече не съществува, ако е стигнало дотук.
    expect(rolyataNa(GLAVEN, o)).toBe('nablyudatel');
  });

  it('БЕЗ причина не минава · тя остава в Журнала', async () => {
    const { zapasniyatChovek } = await gotovZaSmyana();
    await expect(
      zapasniyatChovek.smeniStopanina(
        { telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA), prichina: '   ' },
        { opId: 'op-s' },
      ),
    ).rejects.toThrow(/иска причина/);
  });

  it('с ГРЕШЕН телефон не минава, колкото и пъти да се пробва', async () => {
    const { zapasniyatChovek } = await gotovZaSmyana();
    for (const nomer of ['0888 000 000', '0888 123 455', '']) {
      await expect(
        zapasniyatChovek
          .smeniStopanina(
            {
              telefonOtpechatak: nomer === '' ? '' : await otpechatakNaTelefon(nomer, SHA),
              prichina: 'опит',
            },
            { opId: `op-${nomer}` },
          )
          .then(() => 'мина'),
      ).rejects.toThrow();
    }
  });

  /**
   * НАЙ-ВАЖНОТО в този файл. Втората забрана на И97 („не може да назначи друг
   * имейл за главен") НЕ пада: Стопанинът и днес не може да посочи наследник.
   * Смяната я прави САМИЯТ ЗАПАСЕН, към СЕБЕ СИ — не към трети имейл.
   */
  it('дори Стопанинът не може да я направи · той не назначава наследник', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    await expect(
      deystviya.smeniStopanina(
        { telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA), prichina: 'предавам' },
        { opId: 'op-s' },
      ),
    ).rejects.toThrow(/друг имейл/);
    const o = fold(await dnevnik.chetiVsichki('vintexstroy'));
    expect(o.stopanin).toBe(GLAVEN);
  });
});

describe('прегледът на износ · чете, без да пише', () => {
  it('казва чий е файлът и какъв запасен носи', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const tekst = JSON.stringify(await dnevnik.chetiVsichki('vintexstroy'));

    const pregled = pregledayIznos(tekst);
    expect(pregled.naematel).toBe('vintexstroy');
    expect(pregled.broy).toBe(2);
    expect(pregled.ogledalo.stopanin).toBe(GLAVEN);
    expect(zapasniyat(pregled.ogledalo)?.imeyl).toBe(ZAPASEN);
  });

  /**
   * ФАЙЛЪТ НОСИ ДОКАЗАТЕЛСТВОТО СИ. Затова връщането се решава срещу самия
   * износ, а не срещу нещо, което стои на това устройство — човекът идва на
   * чужда машина с празно хранилище и файл в ръката.
   */
  it('и доказателството се проверява СРЕЩУ ФАЙЛА', async () => {
    const { dnevnik, deystviya } = await sStopanin();
    await vpishiZapasen(deystviya);
    const pregled = pregledayIznos(JSON.stringify(await dnevnik.chetiVsichki('vintexstroy')));
    const r = mozheDaVzemeZhurnala({
      imeyl: ZAPASEN,
      telefonOtpechatak: await otpechatakNaTelefon(TELEFON, SHA),
      o: pregled.ogledalo,
    });
    expect(r.mozhe).toBe(true);
  });
});
