/**
 * ЛИЧНИЯТ ТАБ · отделният Журнал и преносът (И98).
 *
 * Негови думи: „Има си и отделен журнал когато се е активирал личния и
 * **НИКОГА не се смесват**"… и същевременно „делата и задачите там да ги
 * **ПРЕХВЪРЛИШ**".
 *
 * Двете се дърпат, и точно това пази тестът:
 *   · двата Журнала имат СВОИ вериги, всяка цяла сама по себе си;
 *   · нито едно събитие не пресича границата — преносът е ИЗПРАЩАНЕ;
 *   · редът е „пиши първо в получателя, махай последен" — дубъл, не липса;
 *   · сверката вход↔изход се записва И в двата, дори когато е нула;
 *   · чужд човек не пише в чужд личен Журнал — Вратата го спира, не екранът.
 */

import { describe, expect, it } from 'vitest';
import {
  DnevnikVPametta,
  LichnoESamoTvoe,
  proveriVerigata,
  Vrata,
  VsichkoRazresheno,
} from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import {
  NASTAVKA_LICHEN,
  eLichenKlyuch,
  klyuchNaLichniya,
  sDumiZaAkaunta,
  sluzhebniyatNa,
  svediImeyl,
} from '../src/domein/akaunt.js';
import { GreshkaPrenos, mozheLiDaSePrenese, nedovarsheni, prenesiDela } from '../src/domein/prenos.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import type { PayloadDeloZapisano } from '../src/domein/sabitiya.js';
import { SHA } from './pomoshtni.js';

const IMEYL = 'ivo@example.bg';
const SLUZHEBEN = 'firma.bg';
const LICHEN = `${IMEYL}${NASTAVKA_LICHEN}`;

function stend(pravata = new VsichkoRazresheno()) {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata, sha: SHA });
  let tik = 0;
  const chasovnik = () => new Date(Date.UTC(2026, 7, 25, 9, 0, tik++)).toISOString();
  const zaKlyuch = (naematel: string, actor = IMEYL) =>
    new Deystviya({ vrata, dnevnik, naematel, actor, chasovnik });
  return { dnevnik, vrata, zaKlyuch };
}

const DELO = (ime: string, nadDelo = ''): PayloadDeloZapisano => ({
  myasto: 'Малинова Долина',
  obekt: '',
  ime,
  otgovornik: IMEYL,
  ot: '2026-08-01',
  do: '2026-08-31',
  otsenka: 'важно-неспешно',
  sastoyanie: 'чака',
  nadDelo,
  dokument: '',
});

describe('ключът на личния · сблъсък е невъзможен ПО КОНСТРУКЦИЯ', () => {
  it('наставката е в КРАЯ и легален имейл не може да завърши на нея', () => {
    // „#" е позволен в ЛОКАЛНАТА част на имейл (RFC 5322), но не и в домейна.
    expect(klyuchNaLichniya({ imeyl: 'Ivo@Example.BG' } as never)).toBe(LICHEN);
    expect(eLichenKlyuch(LICHEN)).toBe(true);
    expect(eLichenKlyuch(IMEYL)).toBe(false);
    expect(eLichenKlyuch(SLUZHEBEN)).toBe(false);
  });

  it('сведеният имейл и личният ключ никога не съвпадат', () => {
    expect(svediImeyl('IVO@EXAMPLE.BG')).toBe(IMEYL);
    expect(svediImeyl('IVO@EXAMPLE.BG')).not.toBe(LICHEN);
  });

  it('служебният близнак се намира от личния ключ', () => {
    expect(sluzhebniyatNa(LICHEN)).toBe(IMEYL);
    expect(sluzhebniyatNa(IMEYL)).toBe(IMEYL); // не-личният си остава себе си
  });

  it('екранът КАЗВА, че е личният — ключ, който не се вижда, е загубени данни', () => {
    expect(sDumiZaAkaunta(LICHEN)).toContain('ЛИЧНИЯТ');
    expect(sDumiZaAkaunta(LICHEN)).toContain('никога не се смесва');
  });
});

describe('активирането · Журналът СЪЩЕСТВУВА ⟺ личното е пуснато', () => {
  it('преди активиране личният Журнал е празен — не „изключен", а ЛИПСВАЩ', async () => {
    const { dnevnik } = stend();
    expect(await dnevnik.chetiVsichki(LICHEN)).toHaveLength(0);
    expect(fold([]).lichnoVklyucheno).toBe(false);
  });

  it('първото събитие на личния Журнал е самото включване', async () => {
    const { dnevnik, zaKlyuch } = stend();
    const lichni = zaKlyuch(LICHEN);
    await lichni.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN },
      { opId: 'lichno-1' },
    );
    const sabitiya = await dnevnik.chetiVsichki(LICHEN);
    expect(sabitiya).toHaveLength(1);
    expect(sabitiya[0]!.seq).toBe(1);
    expect(sabitiya[0]!.prevHash).toBe(''); // своя верига, от нулата
    expect((await lichni.ogledalo()).lichnoVklyucheno).toBe(true);
  });

  it('прибирането НЕ трие нищо — само сваля пункта', async () => {
    const { dnevnik, zaKlyuch } = stend();
    const lichni = zaKlyuch(LICHEN);
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN }, { opId: 'l1' });
    await lichni.zapishiDelo('D1', DELO('лекар'), { opId: 'd1' });
    await lichni.prevklyuchiLichno({ vklyucheno: false, sluzhebniyat: SLUZHEBEN }, { opId: 'l2' });

    const o = await lichni.ogledalo();
    expect(o.lichnoVklyucheno).toBe(false);
    expect(o.dela.size).toBe(1); // делото си стои
    expect((await dnevnik.chetiVsichki(LICHEN)).length).toBe(3);
  });

  it('включването НЕ оставя нито един ред в служебния Журнал', async () => {
    const { dnevnik, zaKlyuch } = stend();
    await zaKlyuch(LICHEN).prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN },
      { opId: 'l1' },
    );
    // „този човек си е пуснал личен живот" е метаданна; служебният се изнася
    // и се чете от агента — там няма какво да я търси.
    expect(await dnevnik.chetiVsichki(SLUZHEBEN)).toHaveLength(0);
  });
});

describe('двата Журнала · НИКОГА не се смесват', () => {
  async function dvata() {
    const { dnevnik, zaKlyuch } = stend();
    const sluzhebni = zaKlyuch(SLUZHEBEN);
    const lichni = zaKlyuch(LICHEN);
    await sluzhebni.zapishiDelo('S1', DELO('Акт 16'), { opId: 's1' });
    await sluzhebni.zapishiDelo('S2', DELO('Ремонт'), { opId: 's2' });
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN }, { opId: 'l1' });
    await lichni.zapishiDelo('L1', DELO('зъболекар'), { opId: 'l2' });
    return { dnevnik, sluzhebni, lichni, zaKlyuch };
  }

  it('всеки вижда САМО своите дела', async () => {
    const { sluzhebni, lichni } = await dvata();
    expect([...(await sluzhebni.ogledalo()).dela.keys()]).toEqual(['S1', 'S2']);
    expect([...(await lichni.ogledalo()).dela.keys()]).toEqual(['L1']);
  });

  it('всяка верига е ЦЯЛА сама по себе си, от seq 1', async () => {
    const { dnevnik } = await dvata();
    for (const klyuch of [SLUZHEBEN, LICHEN]) {
      const sabitiya = await dnevnik.chetiVsichki(klyuch);
      expect(sabitiya[0]!.seq, klyuch).toBe(1);
      expect((await proveriVerigata(sabitiya, SHA)).tsyala, klyuch).toBe(true);
    }
  });

  it('и НИТО ЕДНО събитие не носи чужд наемател', async () => {
    const { dnevnik } = await dvata();
    for (const klyuch of [SLUZHEBEN, LICHEN]) {
      for (const s of await dnevnik.chetiVsichki(klyuch)) expect(s.naematel).toBe(klyuch);
    }
  });

  it('чужд човек НЕ пише в чужд личен Журнал — Вратата го спира, не екранът', async () => {
    const { zaKlyuch } = stend(new LichnoESamoTvoe(NASTAVKA_LICHEN, svediImeyl) as never);
    // Своят си пише
    await expect(
      zaKlyuch(LICHEN, IMEYL).prevklyuchiLichno(
        { vklyucheno: true, sluzhebniyat: SLUZHEBEN },
        { opId: 'a' },
      ),
    ).resolves.toBeDefined();
    // Чуждият — не
    await expect(
      zaKlyuch(LICHEN, 'chuzhd@example.bg').zapishiDelo('X', DELO('чуждо'), { opId: 'b' }),
    ).rejects.toThrow();
    // А служебният Журнал минава както досега
    await expect(
      zaKlyuch(SLUZHEBEN, 'chuzhd@example.bg').zapishiDelo('Y', DELO('служебно'), { opId: 'c' }),
    ).resolves.toBeDefined();
  });
});

describe('преносът · ИЗПРАЩАНЕ, не преместване', () => {
  async function sDve() {
    const { dnevnik, zaKlyuch } = stend();
    const sluzhebni = zaKlyuch(SLUZHEBEN);
    const lichni = zaKlyuch(LICHEN);
    await sluzhebni.zapishiDelo('D1', DELO('преглед при лекар'), { opId: 's1' });
    await sluzhebni.zapishiDelo('D2', DELO('Акт 16'), { opId: 's2' });
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN }, { opId: 'l1' });
    return { dnevnik, sluzhebni, lichni };
  }

  const prenos = (sluzhebni: Deystviya, lichni: Deystviya, dela: string[], prenosId = 'P1') =>
    prenesiDela({
      ot: sluzhebni,
      kam: lichni,
      otKlyuch: SLUZHEBEN,
      kamKlyuch: LICHEN,
      dela,
      prichina: 'това е мое, не на фирмата',
      prenosId,
    });

  it('делото ИЗЛИЗА от единия и ВЛИЗА в другия, със същия id', async () => {
    const { sluzhebni, lichni } = await sDve();
    const r = await prenos(sluzhebni, lichni, ['D1']);
    expect(r.preneseni).toBe(1);
    expect([...(await sluzhebni.ogledalo()).dela.keys()]).toEqual(['D2']);
    expect([...(await lichni.ogledalo()).dela.keys()]).toEqual(['D1']);
  });

  it('старото събитие ОСТАВА завинаги — нищо не се мести', async () => {
    const { dnevnik, sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1']);
    const sluzhebnite = await dnevnik.chetiVsichki(SLUZHEBEN);
    // създаването си стои, плюс прехвърлянето и разписката
    expect(sluzhebnite.filter((s) => s.type === 'ДелоЗаписано')).toHaveLength(2);
    expect(sluzhebnite.filter((s) => s.type === 'ДелоПрехвърлено')).toHaveLength(1);
    expect((await proveriVerigata(sluzhebnite, SHA)).tsyala).toBe(true);
  });

  it('и следата казва НАКЪДЕ е отишло — в полета, не в свободен текст', async () => {
    const { sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1']);
    const sled = (await sluzhebni.ogledalo()).prehvarleni.get('D1')!;
    expect(sled.kam).toBe(LICHEN);
    expect(sled.prenosId).toBe('P1');
    expect(sled.prichina).toContain('мое');
  });

  it('РАЗПИСКИТЕ са две и се сверяват една с друга (правило 7)', async () => {
    const { sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1', 'D2']);
    const izprashtane = (await sluzhebni.ogledalo()).prenosi.get('P1:izprashtane')!;
    const priemane = (await lichni.ogledalo()).prenosi.get('P1:priemane')!;
    expect(izprashtane.vhod).toBe(2);
    expect(izprashtane.izhod).toBe(2);
    expect(izprashtane.razlika).toBe(0); // нулата СЕ ЗАПИСВА
    expect(priemane.izhod).toBe(izprashtane.vhod); // изходът на единия е входът на другия
    expect(priemane.posoka).toBe('priemane');
  });

  it('ПОВТОРЕНИЯТ пренос със същия номер не удвоява нищо (правило 5)', async () => {
    const { dnevnik, sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1']);
    const predi = (await dnevnik.chetiVsichki(LICHEN)).length;
    await prenos(sluzhebni, lichni, ['D1']).catch(() => undefined);
    expect((await dnevnik.chetiVsichki(LICHEN)).length).toBe(predi);
    expect((await lichni.ogledalo()).dela.size).toBe(1);
  });

  it('прехвърленото дело НЕ се възкресява от запис наново', async () => {
    // Без този вратар следващият внос от МД би върнало делото мълчаливо.
    const { sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1']);
    await expect(
      sluzhebni.zapishiDelo('D1', DELO('преглед при лекар'), { opId: 'нов' }),
    ).rejects.toThrow(/ПРЕХВЪРЛЕНО/);
  });

  it('ОБРАТНИЯТ пренос връща делото и сваля следата', async () => {
    const { sluzhebni, lichni } = await sDve();
    await prenos(sluzhebni, lichni, ['D1']);
    await prenesiDela({
      ot: lichni,
      kam: sluzhebni,
      otKlyuch: LICHEN,
      kamKlyuch: SLUZHEBEN,
      dela: ['D1'],
      prichina: 'сгреших, фирмено е',
      prenosId: 'P2',
    });
    const o = await sluzhebni.ogledalo();
    expect(o.dela.has('D1')).toBe(true);
    expect(o.prehvarleni.has('D1')).toBe(false); // празното място вече няма какво да обяснява
    expect((await lichni.ogledalo()).dela.has('D1')).toBe(false);
  });
});

describe('вратарят на преноса · отказва С ДУМИ', () => {
  it('дело с поддело ИЗВЪН партидата не тръгва самò', async () => {
    const { zaKlyuch } = stend();
    const sluzhebni = zaKlyuch(SLUZHEBEN);
    const lichni = zaKlyuch(LICHEN);
    await sluzhebni.zapishiDelo('D1', DELO('Ремонт'), { opId: 's1' });
    await sluzhebni.zapishiDelo('D2', DELO('Плащане на сметки', 'D1'), { opId: 's2' });

    const o = await sluzhebni.ogledalo();
    expect(mozheLiDaSePrenese(o.dela, 'D1', new Set(['D1'])).mozhe).toBe(false);
    expect(mozheLiDaSePrenese(o.dela, 'D1', new Set(['D1'])).prichina).toContain('сирак');
    // …но заедно минават
    expect(mozheLiDaSePrenese(o.dela, 'D1', new Set(['D1', 'D2'])).mozhe).toBe(true);

    await expect(
      prenesiDela({
        ot: sluzhebni,
        kam: lichni,
        otKlyuch: SLUZHEBEN,
        kamKlyuch: LICHEN,
        dela: ['D1'],
        prichina: 'лично',
        prenosId: 'P9',
      }),
    ).rejects.toThrow(GreshkaPrenos);
  });

  it('надделото ИЗВЪН партидата се изпразва, вместо да сочи в празното', async () => {
    const { zaKlyuch } = stend();
    const sluzhebni = zaKlyuch(SLUZHEBEN);
    const lichni = zaKlyuch(LICHEN);
    await sluzhebni.zapishiDelo('D1', DELO('Ремонт'), { opId: 's1' });
    await sluzhebni.zapishiDelo('D2', DELO('Плащане', 'D1'), { opId: 's2' });
    await prenesiDela({
      ot: sluzhebni,
      kam: lichni,
      otKlyuch: SLUZHEBEN,
      kamKlyuch: LICHEN,
      dela: ['D2'],
      prichina: 'лично',
      prenosId: 'P1',
    });
    expect((await lichni.ogledalo()).dela.get('D2')!.nadDelo).toBe('');
  });

  it('пренос без ПРИЧИНА не тръгва изобщо', async () => {
    const { zaKlyuch } = stend();
    await expect(
      prenesiDela({
        ot: zaKlyuch(SLUZHEBEN),
        kam: zaKlyuch(LICHEN),
        otKlyuch: SLUZHEBEN,
        kamKlyuch: LICHEN,
        dela: ['D1'],
        prichina: '   ',
        prenosId: 'P1',
      }),
    ).rejects.toThrow(/ПРИЧИНАТА/);
  });

  it('липсващо дело се казва, вместо да мълчи', async () => {
    const { zaKlyuch } = stend();
    expect(mozheLiDaSePrenese(new Map(), 'НЯМА', new Set()).prichina).toContain('НЯМА');
    await expect(
      prenesiDela({
        ot: zaKlyuch(SLUZHEBEN),
        kam: zaKlyuch(LICHEN),
        otKlyuch: SLUZHEBEN,
        kamKlyuch: LICHEN,
        dela: [],
        prichina: 'лично',
        prenosId: 'P1',
      }),
    ).rejects.toThrow(/нито едно/);
  });

  it('недовършеният пренос се ВИЖДА — това е цената на реда', async () => {
    // „Пиши първо в получателя, махай последен": прекъсване дава ДУБЛИКАТ,
    // който се вижда и се довършва. Обратният ред дава ЛИПСА, която не се вижда.
    const otDela = new Map([['D1', {} as never], ['D2', {} as never]]);
    const kamDela = new Map([['D1', {} as never]]);
    expect(nedovarsheni(otDela, kamDela)).toEqual(['D1']);
    expect(nedovarsheni(otDela, new Map())).toEqual([]);
  });
});

describe('сторнираното дело не се връща от собствената си поправка', () => {
  it('поправка след сторно на СЪЗДАВАНЕТО не възкресява делото', async () => {
    // Находка на този резен: делото няма отделно „Поправено" събитие — и
    // създаването, и поправката са `ДелоЗаписано` върху същия id. Сторното
    // гасеше само своя seq, а поправката после пак викаше `dela.set(id, …)`.
    const { dnevnik, zaKlyuch } = stend();
    const d = zaKlyuch(SLUZHEBEN);
    await d.zapishiDelo('D1', DELO('Ремонт'), { opId: 's1' });
    await d.zapishiDelo('D1', DELO('Ремонт · поправен срок'), { opId: 's2' });
    const sazdavaneto = (await dnevnik.chetiVsichki(SLUZHEBEN))[0]!;

    await d.storniraj(
      'ST1',
      { pogasyavaSeq: sazdavaneto.seq, prichina: 'сгрешено дело' },
      { opId: 'st1' },
      'delo',
    );
    expect((await d.ogledalo()).dela.has('D1')).toBe(false);
  });
});
