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
import {
  GreshkaDostap,
  type LichenDostap,
  dopusnati,
  dopusnatiImeyli,
  mozheDaPishe,
  napraviDostap,
  pishatImeyli,
  proveriMyasto,
} from '../src/domein/lichen-dostap.js';
import type { Rolya } from '../src/yadro/samolichnost.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import type { PayloadDeloZapisano } from '../src/domein/sabitiya.js';
import { SHA } from './pomoshtni.js';

const IMEYL = 'ivo@example.bg';
const SLUZHEBEN = 'firma.bg';
const LICHEN = `${IMEYL}${NASTAVKA_LICHEN}`;
/** И99: личното се активира с МЯСТО в личния драйв, не с гол бутон. */
const MYASTO = 'MasterBook/Лично';

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
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
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
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO }, { opId: 'l1' });
    await lichni.zapishiDelo('D1', DELO('лекар'), { opId: 'd1' });
    await lichni.prevklyuchiLichno({ vklyucheno: false, sluzhebniyat: SLUZHEBEN }, { opId: 'l2' });

    const o = await lichni.ogledalo();
    expect(o.lichnoVklyucheno).toBe(false);
    expect(o.dela.size).toBe(1); // делото си стои
    expect((await dnevnik.chetiVsichki(LICHEN)).length).toBe(3);
  });

  it('неуспешен първи опит БЕЗ МЯСТО не прави „не е пускано" на „прибрано" (резен 98)', async () => {
    // НАМЕРЕНО ОТ ПРОХОДА (ADR-154 §6): екранът пише откриващото събитие
    // (Стопанинът е първото, ADR-043) ПРЕДИ Вратата да провери мястото, а
    // „пипнато" се смяташе от самото съществуване на Журнала. Неуспешният
    // опит правеше състоянието „прибрано" — а прибраното се връща без поле за
    // място: задънена улица. „Пипнато" пита за ПРЕВКЛЮЧВАНЕ, не за Журнал.
    const { dnevnik, zaKlyuch } = stend();
    const lichni = zaKlyuch(LICHEN);
    await lichni.zapishiStopanina({ imeyl: IMEYL, ime: 'Иво', dostavchik: 'google' }, { opId: 'st' });
    await expect(
      lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: '' }, { opId: 'l0' }),
    ).rejects.toThrow('иска МЯСТО');
    expect(await dnevnik.chetiVsichki(LICHEN)).toHaveLength(1); // Журналът СЪЩЕСТВУВА…
    const predi = await lichni.ogledalo();
    expect(predi.lichnoPipnato).toBe(false); // …но НЕ е пипано
    expect(predi.lichnoVklyucheno).toBe(false);

    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO }, { opId: 'l1' });
    await lichni.prevklyuchiLichno({ vklyucheno: false, sluzhebniyat: SLUZHEBEN }, { opId: 'l2' });
    const sled = await lichni.ogledalo();
    expect(sled.lichnoPipnato).toBe(true); // прибраното Е пипано — и се връща
    expect(sled.lichnoVklyucheno).toBe(false);
  });

  it('включването НЕ оставя нито един ред в служебния Журнал', async () => {
    const { dnevnik, zaKlyuch } = stend();
    await zaKlyuch(LICHEN).prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
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
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO }, { opId: 'l1' });
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
        { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
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
    await lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO }, { opId: 'l1' });
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

// ══ И99 · споделянето в ОБРАТНАТА посока ═══════════════════════════════════

describe('мястото в личния драйв · активацията не е гол бутон (И99)', () => {
  it('без МЯСТО личното не тръгва', async () => {
    const { zaKlyuch } = stend();
    await expect(
      zaKlyuch(LICHEN).prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN }, { opId: 'x' }),
    ).rejects.toThrow(/МЯСТО/);
    await expect(
      zaKlyuch(LICHEN).prevklyuchiLichno(
        { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: '   ' },
        { opId: 'y' },
      ),
    ).rejects.toThrow(/МЯСТО/);
  });

  it('мястото се подравнява, но регистърът НЕ се пипа', () => {
    // „Лично" не е „лично" — имената на папки в драйва различават двете.
    expect(proveriMyasto('  /MasterBook//Лично/  ')).toBe('MasterBook/Лично');
    expect(proveriMyasto('MasterBook\\Лично')).toBe('MasterBook/Лично');
    expect(proveriMyasto('MasterBook/ЛИЧНО')).toBe('MasterBook/ЛИЧНО');
    expect(() => proveriMyasto('x'.repeat(201))).toThrow(GreshkaDostap);
  });

  it('мястото ОСТАВА след прибиране — не се посочва наново', async () => {
    const { zaKlyuch } = stend();
    const lichni = zaKlyuch(LICHEN);
    await lichni.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );
    await lichni.prevklyuchiLichno({ vklyucheno: false, sluzhebniyat: SLUZHEBEN }, { opId: 'l2' });
    expect((await lichni.ogledalo()).lichnoMyasto).toBe(MYASTO);
    // и повторното пускане минава БЕЗ ново място
    await expect(
      lichni.prevklyuchiLichno({ vklyucheno: true, sluzhebniyat: SLUZHEBEN }, { opId: 'l3' }),
    ).resolves.toBeDefined();
  });
});

describe('обратната посока · служителят раздава (И99)', () => {
  async function sLichno() {
    const { dnevnik, zaKlyuch } = stend();
    const lichni = zaKlyuch(LICHEN);
    await lichni.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );
    return { dnevnik, lichni, zaKlyuch };
  }

  const DOSTAP = (imeyl: string, kakav: 'rabotodatel' | 'vanshen', rolya: Rolya = 'nablyudatel') => ({
    imeyl,
    rolya,
    kakvo: 'dvete',
    kakav,
    otnet: false,
  });

  it('дава се на РАБОТОДАТЕЛЯ и на ВЪНШЕН имейл — двата се различават', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichenDostap(DOSTAP('shef@firma.bg', 'rabotodatel'), { opId: 'd1' });
    await lichni.zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen', 'redaktor'), { opId: 'd2' });

    const o = await lichni.ogledalo();
    expect(o.lichniDostapi.size).toBe(2);
    expect(o.lichniDostapi.get('shef@firma.bg')!.kakav).toBe('rabotodatel');
    // Външният НЕ е служител на наемателя и не влиза в екипа му.
    expect(o.lichniDostapi.get('zhena@example.bg')!.kakav).toBe('vanshen');
    expect(o.sluzhiteli.size).toBe(0);
  });

  it('и НИЩО от това не влиза в служебния Журнал', async () => {
    const { dnevnik, lichni } = await sLichno();
    await lichni.zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen'), { opId: 'd1' });
    expect(await dnevnik.chetiVsichki(SLUZHEBEN)).toHaveLength(0);
  });

  it('от СЛУЖЕБНИЯ Журнал личен достъп НЕ се дава', async () => {
    const { zaKlyuch } = await sLichno();
    await expect(
      zaKlyuch(SLUZHEBEN).zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen'), { opId: 'd1' }),
    ).rejects.toThrow(/ЛИЧНИЯ Журнал/);
  });

  it('на СЕБЕ СИ не се дава достъп', async () => {
    const { lichni } = await sLichno();
    await expect(
      lichni.zapishiLichenDostap(DOSTAP(IMEYL, 'vanshen'), { opId: 'd1' }),
    ).rejects.toThrow(/На себе си/);
  });

  it('отнемането е НОВО събитие — редът остава в Журнала', async () => {
    const { dnevnik, lichni } = await sLichno();
    await lichni.zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen'), { opId: 'd1' });
    await lichni.zapishiLichenDostap(
      { ...DOSTAP('zhena@example.bg', 'vanshen'), otnet: true },
      { opId: 'd2' },
    );
    const o = await lichni.ogledalo();
    expect(o.lichniDostapi.get('zhena@example.bg')!.otnet).toBe(true);
    expect(dopusnati(o.lichniDostapi.values())).toHaveLength(0);
    // „дадох ѝ достъп, после го отнех" — историята стои
    expect((await dnevnik.chetiVsichki(LICHEN)).filter((s) => s.type === 'ЛиченДостъпЗаписан'))
      .toHaveLength(2);
  });

  it('ВРАТАТА пуска допуснатия и спира отнетия — не екранът', async () => {
    // Правото се пита от ядрото; иначе „никога не се смесват" е надпис.
    let dopusnatite: ReadonlySet<string> = new Set();
    const pravata = new LichnoESamoTvoe(
      NASTAVKA_LICHEN,
      svediImeyl,
      () => dopusnatite,
      () => dopusnatite,
    );
    const { zaKlyuch } = stend(pravata as never);
    const az = zaKlyuch(LICHEN, IMEYL);
    await az.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );

    // преди даването — чуждият не пише
    const zhena = zaKlyuch(LICHEN, 'zhena@example.bg');
    await expect(zhena.zapishiDelo('Z1', DELO('годишнина'), { opId: 'z1' })).rejects.toThrow();

    // след даването — пише
    await az.zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen', 'redaktor'), { opId: 'd1' });
    dopusnatite = dopusnatiImeyli((await az.ogledalo()).lichniDostapi.values());
    await expect(zhena.zapishiDelo('Z1', DELO('годишнина'), { opId: 'z1' })).resolves.toBeDefined();

    // след отнемането — пак не пише
    await az.zapishiLichenDostap(
      { ...DOSTAP('zhena@example.bg', 'vanshen', 'redaktor'), otnet: true },
      { opId: 'd2' },
    );
    dopusnatite = dopusnatiImeyli((await az.ogledalo()).lichniDostapi.values());
    await expect(zhena.zapishiDelo('Z2', DELO('второ'), { opId: 'z2' })).rejects.toThrow();
  });

  it('НАБЛЮДАТЕЛЯТ вижда, но не пише · трите релета важат и тук', async () => {
    const { lichni } = await sLichno();
    await lichni.zapishiLichenDostap(DOSTAP('shef@firma.bg', 'rabotodatel', 'nablyudatel'), { opId: 'd1' });
    await lichni.zapishiLichenDostap(DOSTAP('zhena@example.bg', 'vanshen', 'redaktor'), { opId: 'd2' });
    const dostapi = (await lichni.ogledalo()).lichniDostapi.values();
    expect(mozheDaPishe(dostapi, 'shef@firma.bg')).toBe(false);
    expect(mozheDaPishe((await lichni.ogledalo()).lichniDostapi.values(), 'zhena@example.bg')).toBe(true);
    // ВИЖДАТ и двамата · разликата е само в писането
    const vsichki = [...(await lichni.ogledalo()).lichniDostapi.values()];
    expect([...dopusnatiImeyli(vsichki)].sort()).toEqual(['shef@firma.bg', 'zhena@example.bg']);
    expect([...pishatImeyli(vsichki)]).toEqual(['zhena@example.bg']);
  });

  /**
   * ДВАТА ЧЕТЕЦА НА ВРАТАТА · намерено при писането на ADR-037.
   *
   * `mozheDaPishe` от домейна знаеше за ролята, но живееше САМО в тестовете:
   * приложението подаваше на Вратата ЕДИН списък „допуснати" и за двата ѝ
   * въпроса. Тоест наблюдателят пишеше — тихо, и без нито един червен тест,
   * защото никой не питаше Вратата вместо домейна.
   *
   * Затова тук се пита ВРАТАТА, с двата списъка така, както ги подава
   * приложението.
   */
  it('наблюдателят ИЗНАСЯ, но Вратата не го пуска да ПИШЕ', async () => {
    let vsichki: readonly LichenDostap[] = [];
    const pravata = new LichnoESamoTvoe(
      NASTAVKA_LICHEN,
      svediImeyl,
      () => dopusnatiImeyli(vsichki),
      () => pishatImeyli(vsichki),
    );
    const { zaKlyuch } = stend(pravata as never);
    const az = zaKlyuch(LICHEN, IMEYL);
    await az.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );
    await az.zapishiLichenDostap(DOSTAP('shef@firma.bg', 'rabotodatel', 'nablyudatel'), { opId: 'd1' });
    vsichki = [...(await az.ogledalo()).lichniDostapi.values()];

    const shefat = zaKlyuch(LICHEN, 'shef@firma.bg');
    await expect(shefat.zapishiDelo('S1', DELO('среща'), { opId: 's1' })).rejects.toThrow();
    // но ВИЖДА — четенето и износът минават
    await expect(pravata.mozheDaIznasya('shef@firma.bg', LICHEN)).resolves.toBe(true);
    await expect(pravata.mozheDaPishe('shef@firma.bg', LICHEN)).resolves.toBe(false);
  });

  it('сгрешен имейл и непозната роля се отказват С ДУМИ', () => {
    expect(() => napraviDostap({ imeyl: 'не-е-имейл', rolya: 'redaktor', kakvo: 'tab', kakav: 'vanshen' }))
      .toThrow(/не прилича на имейл/);
    expect(() =>
      napraviDostap({ imeyl: 'a@b.bg', rolya: 'цар' as never, kakvo: 'tab', kakav: 'vanshen' }),
    ).toThrow(/Непозната роля/);
    // и имейлът се свежда, за да не станат двама от един човек
    expect(napraviDostap({ imeyl: ' Zhena@Example.BG ', rolya: 'redaktor', kakvo: 'tab', kakav: 'vanshen' }).imeyl)
      .toBe('zhena@example.bg');
  });
});

/**
 * ЛИЧНИЯТ ИЗНОС И ВНОС (ADR-039) · границата важи и през ФАЙЛА.
 *
 * „Никога не се смесват" би било надпис, ако изнесен служебен файл можеше да
 * се внесе в личния Журнал — или личният на един човек в личния на друг.
 * Пази го хеш-веригата: `naematel` влиза в `kanonichno()` и чуждото звено
 * пада с NESAVMESTIM, преди каквото и да е да се запише.
 */
describe('личният износ · границата важи и през файла', () => {
  it('СЛУЖЕБЕН файл не влиза в ЛИЧНИЯ Журнал', async () => {
    const { dnevnik, vrata, zaKlyuch } = stend();
    const sluzhebni = zaKlyuch(SLUZHEBEN);
    await sluzhebni.dobaviImot(
      'imot-1',
      { adres: 'Дианабад', edinitsa: 'офис 3', ploshtad_kvsm: 720_000 },
      { opId: 'i1' },
    );
    const iznesen = JSON.stringify(await dnevnik.chetiVsichki(SLUZHEBEN));

    const { vnesiZhurnal } = await import('../src/domein/vnos.js');
    await expect(
      vnesiZhurnal({
        vrata,
        dnevnik,
        naematel: LICHEN,
        actor: IMEYL,
        tekst: iznesen,
        kogato: '2026-08-25T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    // и НИЩО не е влязло — отказът е преди първия запис
    expect(await dnevnik.chetiVsichki(LICHEN)).toHaveLength(0);
  });

  it('ЛИЧНИЯТ на един човек не влиза в личния на ДРУГ', async () => {
    const { dnevnik, vrata, zaKlyuch } = stend();
    const moya = zaKlyuch(LICHEN);
    await moya.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );
    const iznesen = JSON.stringify(await dnevnik.chetiVsichki(LICHEN));

    const chuzhd = `zhena@example.bg${NASTAVKA_LICHEN}`;
    const { vnesiZhurnal } = await import('../src/domein/vnos.js');
    await expect(
      vnesiZhurnal({
        vrata,
        dnevnik,
        naematel: chuzhd,
        actor: 'zhena@example.bg',
        tekst: iznesen,
        kogato: '2026-08-25T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ kod: 'NESAVMESTIM' });
    expect(await dnevnik.chetiVsichki(chuzhd)).toHaveLength(0);
  });

  it('СВОЯТ файл се връща едно към едно · загубеният браузър не е загубен Журнал', async () => {
    const { dnevnik, vrata, zaKlyuch } = stend();
    const moya = zaKlyuch(LICHEN);
    await moya.prevklyuchiLichno(
      { vklyucheno: true, sluzhebniyat: SLUZHEBEN, myasto: MYASTO },
      { opId: 'l1' },
    );
    await moya.zapishiLichnaTema({ temaId: 't1', ime: 'Храна', grupa: '', spryana: false }, { opId: 't1' });
    const iznesen = JSON.stringify(await dnevnik.chetiVsichki(LICHEN));

    // „ново устройство" — празен носител, СЪЩАТА Врата на нов стенд
    const nov = stend();
    const { vnesiZhurnal } = await import('../src/domein/vnos.js');
    const rezultat = await vnesiZhurnal({
      vrata: nov.vrata,
      dnevnik: nov.dnevnik,
      naematel: LICHEN,
      actor: IMEYL,
      tekst: iznesen,
      kogato: '2026-08-25T12:00:00.000Z',
    });
    expect(rezultat.vneseni).toBe(2);
    // и веригата на върнатото е ЦЯЛА
    const varnati = await nov.dnevnik.chetiVsichki(LICHEN);
    expect((await proveriVerigata(varnati, SHA)).tsyala).toBe(true);
    // а Огледалото чете темата, все едно нищо не е било
    const o = await nov.zaKlyuch(LICHEN).ogledalo();
    expect(o.lichniTemi.get('t1')?.ime).toBe('Храна');
  });
});
