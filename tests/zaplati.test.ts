/**
 * ЗАПЛАТИТЕ · седмицата, кеш-джобът и следата (резен 20 · ADR-080).
 *
 * Единайсетте обещания:
 *
 *   1. Седмичната заплата = дневна × дни, точно · и се СМЯТА, не се пише.
 *   2. Сборът на седмицата = сборът на редовете ѝ · сверка вход↔изход.
 *   3. ISO-седмицата не разцепва заплата между две години.
 *   4. Прехвърлянето ражда ТОЧНО ЕДИН разход по потока „Заплати".
 *   5. Второ прехвърляне ражда НУЛА и КАЗВА за колко е било първото.
 *   6. Празна седмица не се прехвърля · разход от нула никой не обяснява.
 *   7. Сторнирана заплата пада от сбора САМА.
 *   8. Захранването вдига САМО кеша · и се смята, не се пази.
 *   9. Сторнирано захранване сваля кеша обратно.
 *  10. Замразената седмица отказва нов ред · отказът носи ДАТИТЕ ѝ.
 *  11. Месечният катинар и седмичният са ДВА · единият не отваря другия.
 */

import { describe, expect, it } from 'vitest';
import { bankovotoSaldo } from '../src/domein/otcheti.ts';
import { DnevnikVPametta, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import {
  dnitteNaSedmitsata,
  GreshkaZaplata,
  IMETO_NA_DZHOBA,
  keshaNaZaplatite,
  KOLONI_ZAPLATI,
  prehvarlenaLiE,
  sboraNaSedmitsata,
  sedmichnaZaplata,
  sedmitsataNa,
  sedmitsataZaEkrana,
  sedmitsiteSZapisi,
  zamrazenaLiE,
  ZATVORENI_ZAPLATI,
} from '../src/domein/zaplati.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const SEDMITSA = '2026-W35';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 29, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const RED = {
  zaplataId: 'ZP-1',
  sedmitsa: SEDMITSA,
  proektId: '',
  ime: 'Иван Петров',
  dlazhnost: 'зидар',
  obekt: 'бл. 3 · ап. 12',
  dnevna_st: 120_00,
  dni: 5,
};

async function sZaplata(nadgradi: Partial<typeof RED> = {}, opId = 'op-zpl') {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiZaplata({ ...RED, ...nadgradi }, { opId });
  return { dnevnik, deystviya };
}

// ── 1 · СМЯТАНЕТО ──────────────────────────────────────────────────────────

describe('седмичната заплата се СМЯТА · дневна × дни', () => {
  it('е точно произведението · и няма деление, значи няма остатък', () => {
    expect(sedmichnaZaplata({ dnevna_st: 120_00, dni: 5 })).toBe(600_00);
    expect(sedmichnaZaplata({ dnevna_st: 83_33, dni: 7 })).toBe(583_31);
    expect(sedmichnaZaplata({ dnevna_st: 1, dni: 1 })).toBe(1);
  });

  it('иска ЦЕЛИ числа · float в заплата не се преглъща', () => {
    expect(() => sedmichnaZaplata({ dnevna_st: 120.5, dni: 5 })).toThrow(GreshkaZaplata);
    expect(() => sedmichnaZaplata({ dnevna_st: 120_00, dni: 5.5 })).toThrow(/цяло число/);
  });

  it('и я НЯМА в товара на събитието · само двата ѝ множителя', async () => {
    const { dnevnik } = await sZaplata();
    const s = (await dnevnik.chetiVsichki(NAEMATEL)).find((x) => x.type === 'ЗаплатаЗаписана')!;
    const tovar = s.payload as unknown as Record<string, unknown>;
    expect(tovar['dnevna_st']).toBe(120_00);
    expect(tovar['dni']).toBe(5);
    expect(Object.keys(tovar)).not.toContain('sedmichna_st');
  });
});

// ── 3 · СЕДМИЦАТА ──────────────────────────────────────────────────────────

describe('ISO-седмицата · четвъртъкът решава годината', () => {
  it('не разцепва заплата между две години', () => {
    // 1 януари 2027 е ПЕТЪК · седмицата му е 53-та на 2026-а.
    expect(sedmitsataNa('2027-01-01')).toBe('2026-W53');
    expect(sedmitsataNa('2026-12-31')).toBe('2026-W53');
    // А 4 януари 2027 е понеделник · първата седмица на новата година.
    expect(sedmitsataNa('2027-01-04')).toBe('2027-W01');
  });

  it('дава ПОНЕДЕЛНИК и НЕДЕЛЯ · и обратното връща същата седмица', () => {
    const { ot, do_ } = dnitteNaSedmitsata(SEDMITSA);
    expect(ot).toBe('2026-08-24');
    expect(do_).toBe('2026-08-30');
    expect(sedmitsataNa(ot)).toBe(SEDMITSA);
    expect(sedmitsataNa(do_)).toBe(SEDMITSA);
  });

  it('всеки ден от една седмица дава СЪЩАТА седмица', () => {
    const { ot } = dnitteNaSedmitsata(SEDMITSA);
    const den = Date.parse(`${ot}T00:00:00Z`);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(den + i * 86_400_000).toISOString().slice(0, 10);
      expect(sedmitsataNa(d), d).toBe(SEDMITSA);
    }
  });
});

// ── 2 · СБОРЪТ ─────────────────────────────────────────────────────────────

describe('сборът на седмицата · сверка вход↔изход', () => {
  it('е сборът на редовете ѝ, сметнат по ВТОРИ независим път', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.zapishiZaplata(
      { ...RED, zaplataId: 'ZP-2', ime: 'Георги', dnevna_st: 100_00, dni: 3 },
      { opId: 'op-2' },
    );
    const o = await ogledaloto(dnevnik);
    expect(sboraNaSedmitsata(o, SEDMITSA)).toBe(600_00 + 300_00);
    // ВТОРИЯТ ПЪТ: на ръка, от самите редове.
    const naRaka = [...o.zaplati.values()]
      .filter((r) => r.sedmitsa === SEDMITSA)
      .reduce((s, r) => s + r.dnevna_st * r.dni, 0);
    expect(naRaka).toBe(sboraNaSedmitsata(o, SEDMITSA));
  });

  it('чужда седмица НЕ влиза в сбора', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.zapishiZaplata(
      { ...RED, zaplataId: 'ZP-2', sedmitsa: '2026-W36' },
      { opId: 'op-2' },
    );
    const o = await ogledaloto(dnevnik);
    expect(sboraNaSedmitsata(o, SEDMITSA)).toBe(600_00);
    expect(sedmitsiteSZapisi(o)).toEqual(['2026-W36', '2026-W35']);
  });

  it('празна седмица дава НУЛА · истинско число, не липса', async () => {
    const { dnevnik } = stend();
    expect(sboraNaSedmitsata(await ogledaloto(dnevnik), SEDMITSA)).toBe(0);
  });
});

// ── ВРАТАТА ────────────────────────────────────────────────────────────────

describe('Вратата · четирите проверки на реда', () => {
  it('отказва празно име, нулева ставка и дни извън 1–7', async () => {
    const { deystviya } = stend();
    const opit = (n: Partial<typeof RED>, opId: string) =>
      deystviya.zapishiZaplata({ ...RED, ...n }, { opId });
    await expect(opit({ ime: '  ' }, 'o1')).rejects.toThrow(/иска име/);
    await expect(opit({ dnevna_st: 0 }, 'o2')).rejects.toThrow(/повече от нула/);
    await expect(opit({ dni: 0 }, 'o3')).rejects.toThrow(/между 1 и 7/);
    await expect(opit({ dni: 8 }, 'o4')).rejects.toThrow(/между 1 и 7/);
    await expect(opit({ dni: 7 }, 'o5')).resolves.toBeDefined();
  });

  it('празен ПРОЕКТ се приема · и екранът го КАЗВА', async () => {
    const { dnevnik } = await sZaplata({ proektId: '' });
    const o = await ogledaloto(dnevnik);
    expect(o.zaplati.get('ZP-1')!.proektId).toBe('');
  });
});

// ── 4–6 · ПРЕХВЪРЛЯНЕТО ────────────────────────────────────────────────────

describe('прехвърлянето в Разходи · РЪЧНО, с архив и следа', () => {
  it('ражда ТОЧНО ЕДИН разход по потока „Заплати"', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const o = await ogledaloto(dnevnik);

    const nashi = [...o.razhodi.values()].filter((r) => r.potok === 'zaplati');
    expect(nashi).toHaveLength(1);
    expect(nashi[0]!.suma_st).toBe(600_00);
    // ДАТАТА е НЕДЕЛЯТА · седмицата пада в месеца, в който свършва.
    expect(nashi[0]!.data).toBe('2026-08-30');
  });

  it('оставя СЛЕДА · коя седмица, кой разход, за колко, от кого', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const o = await ogledaloto(dnevnik);

    expect(prehvarlenaLiE(o, SEDMITSA)).toBe(true);
    const sledata = o.prehvarleniSedmitsi.get(SEDMITSA)!;
    expect(sledata.suma_st).toBe(600_00);
    expect(sledata.koy).toBe('vintexstroy@gmail.com');
    expect(o.razhodi.has(sledata.razhodId)).toBe(true);
    // И тя се СМЯТА · няма поле „прехвърлена" върху самия ред.
    expect(Object.keys(o.zaplati.get('ZP-1')!)).not.toContain('prehvarlena');
  });

  it('ВТОРО прехвърляне ражда НУЛА и казва за колко е било първото', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const predi = (await dnevnik.chetiVsichki(NAEMATEL)).length;

    await expect(
      deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh-2' }),
    ).rejects.toThrow(/вече е прехвърлена/);
    await expect(
      deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh-2' }),
    ).rejects.toThrow(/60000/);
    expect((await dnevnik.chetiVsichki(NAEMATEL)).length).toBe(predi);
  });

  it('ПРАЗНА седмица не се прехвърля · разход от нула никой не обяснява', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' }),
    ).rejects.toThrow(/нито един ред/);
  });
});

// ── 7 · СТОРНОТО ───────────────────────────────────────────────────────────

describe('сторното · сборът пада САМ', () => {
  it('сторнирана заплата излиза от сбора без нито един ред код за това', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.zapishiZaplata(
      { ...RED, zaplataId: 'ZP-2', ime: 'Георги', dnevna_st: 100_00, dni: 3 },
      { opId: 'op-2' },
    );
    const predi = await ogledaloto(dnevnik);
    expect(sboraNaSedmitsata(predi, SEDMITSA)).toBe(900_00);
    const seq = predi.zaplati.get('ZP-2')!.seq;

    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: seq, prichina: 'човекът не е идвал' },
      { opId: 'op-storno' },
    );
    const sled = await ogledaloto(dnevnik);
    expect(sled.zaplati.has('ZP-2')).toBe(false);
    expect(sboraNaSedmitsata(sled, SEDMITSA)).toBe(600_00);
  });
});

// ── 8–9 · КЕШ-ДЖОБЪТ ───────────────────────────────────────────────────────

describe('кеш-джобът · един, и салдото му се СМЯТА', () => {
  it('захранването вдига кеша · и НЕ пипа банката', async () => {
    const { dnevnik, deystviya } = stend();
    const predi = await ogledaloto(dnevnik);
    expect(keshaNaZaplatite(predi, 0).saldo_st).toBe(0);

    await deystviya.zahraniKesha(
      { zahranvaneId: 'KS-1', suma_st: 2_000_00, data: '2026-08-24', belezhka: 'от касата' },
      { opId: 'op-k' },
    );
    const sled = await ogledaloto(dnevnik);
    const kesh = keshaNaZaplatite(sled, 0);
    expect(kesh.saldo_st).toBe(2_000_00);
    expect(kesh.zahraneno_st).toBe(2_000_00);
    // БАНКАТА не е мръднала: захранването е кеш, не банково движение.
    // (Ръчно банково салдо вече няма — И124 т.9 — банката се СМЯТА.)
    expect(bankovotoSaldo(sled).saldo_st).toBe(bankovotoSaldo(predi).saldo_st);
  });

  it('прехвърлената седмица ИЗВАЖДА от кеша', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.zahraniKesha(
      { zahranvaneId: 'KS-1', suma_st: 2_000_00, data: '2026-08-24', belezhka: '' },
      { opId: 'op-k' },
    );
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    const kesh = keshaNaZaplatite(await ogledaloto(dnevnik), 0);
    expect(kesh.plateno_st).toBe(600_00);
    expect(kesh.saldo_st).toBe(2_000_00 - 600_00);
  });

  it('СТОРНИРАНО захранване сваля кеша обратно', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zahraniKesha(
      { zahranvaneId: 'KS-1', suma_st: 2_000_00, data: '2026-08-24', belezhka: '' },
      { opId: 'op-k' },
    );
    const predi = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: predi.zahranvaniyaNaKesha[0]!.seq, prichina: 'сгрешена сума' },
      { opId: 'op-st' },
    );
    expect(keshaNaZaplatite(await ogledaloto(dnevnik), 0).saldo_st).toBe(0);
  });

  it('отказва нула и лоша дата · и джобът има ЕДНО име на екрана', async () => {
    const { deystviya } = stend();
    await expect(
      deystviya.zahraniKesha(
        { zahranvaneId: 'KS-1', suma_st: 0, data: '2026-08-24', belezhka: '' },
        { opId: 'o1' },
      ),
    ).rejects.toThrow(/повече от нула/);
    await expect(
      deystviya.zahraniKesha(
        { zahranvaneId: 'KS-2', suma_st: 100, data: '24.08.2026', belezhka: '' },
        { opId: 'o2' },
      ),
    ).rejects.toThrow(/ГГГГ-ММ-ДД/);
    expect(IMETO_NA_DZHOBA).toContain('Фактури Кеш');
  });
});

// ── 10–11 · ДВАТА КАТИНАРА ─────────────────────────────────────────────────

describe('„Замрази седмицата" · ВТОРИ, по-тесен катинар', () => {
  it('замразената седмица отказва нов ред · отказът носи ДАТИТЕ ѝ', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, true, { opId: 'op-preh' });
    expect(zamrazenaLiE(await ogledaloto(dnevnik), SEDMITSA)).toBe(true);

    await expect(
      deystviya.zapishiZaplata({ ...RED, zaplataId: 'ZP-9' }, { opId: 'op-9' }),
    ).rejects.toThrow(/2026-08-24 – 2026-08-30/);
  });

  it('прехвърлена БЕЗ замразяване приема поправка на реда', async () => {
    const { deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' });
    await expect(
      deystviya.zapishiZaplata({ ...RED, dni: 6 }, { opId: 'op-popravka' }),
    ).resolves.toBeDefined();
  });

  it('ДРУГА седмица не е засегната · катинарът е тесен', async () => {
    const { deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, true, { opId: 'op-preh' });
    await expect(
      deystviya.zapishiZaplata(
        { ...RED, zaplataId: 'ZP-8', sedmitsa: '2026-W36' },
        { opId: 'op-8' },
      ),
    ).resolves.toBeDefined();
  });

  it('МЕСЕЧНИЯТ катинар е ДРУГ · подадената справка спира прехвърлянето', async () => {
    const { deystviya } = await sZaplata();
    await deystviya.podaySpravka(
      { period: '2026-08', dds_deklarirano_st: 0, data: '2026-09-14', belezhka: '' },
      { opId: 'op-spravka' },
    );
    // Седмицата НЕ е замразена, но разходът пада в замразения АВГУСТ.
    await expect(
      deystviya.prehvarliSedmitsata(SEDMITSA, false, { opId: 'op-preh' }),
    ).rejects.toThrow();
    // А самата заплата минава: тя още не е счетоводен запис.
    await expect(
      deystviya.zapishiZaplata({ ...RED, zaplataId: 'ZP-7' }, { opId: 'op-7' }),
    ).resolves.toBeDefined();
  });
});

// ── ЧЕТИВОТО НА ЕКРАНА ─────────────────────────────────────────────────────

describe('редовете за екрана · и затворената колона', () => {
  it('седемте колони стоят в НЕГОВИЯ ред · с ПРОЕКТА най-отпред', () => {
    expect(KOLONI_ZAPLATI).toHaveLength(7);
    expect(KOLONI_ZAPLATI[0]).toBe('Проект');
    expect(KOLONI_ZAPLATI.join(' · ')).toBe(
      'Проект · Име · Длъжност · Обект · Дневна ставка · Дни · Седмична заплата',
    );
    // СМЕТНАТАТА колона е затворена · тя не се редактира от никого.
    expect(ZATVORENI_ZAPLATI.map((i) => KOLONI_ZAPLATI[i])).toEqual(['Седмична заплата']);
  });

  it('седмицата за екрана носи датите, сбора и състоянието си', async () => {
    const { dnevnik, deystviya } = await sZaplata();
    await deystviya.prehvarliSedmitsata(SEDMITSA, true, { opId: 'op-preh' });
    const s = sedmitsataZaEkrana(await ogledaloto(dnevnik), SEDMITSA);
    expect(s.ot).toBe('2026-08-24');
    expect(s.do_).toBe('2026-08-30');
    expect(s.sbor_st).toBe(600_00);
    expect(s.redove[0]!.sedmichna_st).toBe(600_00);
    expect(s.prehvarlena).toBe(true);
    expect(s.zamrazena).toBe(true);
    expect(s.zashto).toContain('ЗАМРАЗЕНА');
  });
});
