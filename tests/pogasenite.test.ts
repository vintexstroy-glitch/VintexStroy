/**
 * СТОРНИРАНОТО СЕ ВИЖДА (резен 27 · ADR-087).
 *
 * Негово, прието: „Сиво + зачертано + малък знак ★" *(р82·[37])*. Журналът пази
 * и записа, и сторното му завинаги — но Огледалото ПРЕСКАЧА погасеното и на
 * екрана редът просто изчезваше. Човек не можеше да различи „сторнирано" от
 * „никога не е било записано".
 *
 * Осемте обещания:
 *
 *   1. Погасеният запис влиза в СВОЙ списък · с причина и с „кой го гаси".
 *   2. И НЕ влиза в картите · сборовете не го виждат, СТРУКТУРНО.
 *   3. Нито в ДДС-акумулаторите · нито в петте сверки на `smetki()`.
 *   4. Самото СТОРНО не е погасен ред · иначе всяка поправка дава ДВА.
 *   5. Сторно на СЪЗДАВАНЕ и на ПОПРАВКА дават РАЗЛИЧНИ редове.
 *   6. Първото сторно решава причината · второ не я пренаписва.
 *   7. Описанието и сумата идват от ЕДИН дом · износът и екранът казват едно.
 *   8. Без сторно списъкът е ПРАЗЕН · и нулата е отговор.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, tsentove, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { fold } from '../src/ogledalo/ogledalo.js';
import { smetki } from '../src/domein/smetki.js';
import { opisaNaZapisa, sumataNaZapisa } from '../src/domein/opis-na-zapisa.js';
import { SHA } from './pomoshtni.js';

const NAEMATEL = 'vintexstroy';
const PERIOD = '2026-08';
const KOGATO = '2026-08-30T12:00:00.000Z';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: NAEMATEL,
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 30, 12, 0, tik++)).toISOString(),
  });
  return { dnevnik, deystviya };
}

const ogledaloto = async (dnevnik: DnevnikVPametta) => fold(await dnevnik.chetiVsichki(NAEMATEL));

const RAZHOD = {
  potok: 'fakturi',
  dostavchik: 'Баумит ЕООД',
  opis: 'вар и цимент',
  suma_st: tsentove(240_00),
  sektor: 'pokupki-materiali',
  nachin: 'банка' as const,
  data: '2026-08-12',
  dokument: '0000001234',
  stavka: 20,
};

/** Един разход, после сторно върху него. */
async function sStorno(prichina = 'сгрешен документ') {
  const { dnevnik, deystviya } = stend();
  await deystviya.zapishiRazhod('RZ-1', RAZHOD, { opId: 'op-r' });
  const predi = await ogledaloto(dnevnik);
  await deystviya.storniraj(
    'ST-1',
    { pogasyavaSeq: predi.razhodi.get('RZ-1')!.seq, prichina },
    { opId: 'op-st' },
  );
  return { dnevnik, deystviya };
}

// ── 1 и 2 · СВОЙ СПИСЪК, ИЗВЪН КАРТИТЕ ────────────────────────────────────

describe('погасеното влиза в СВОЙ списък, не в картите', () => {
  it('редът СЕ ВИЖДА · с причина и с „кой го гаси"', async () => {
    const { dnevnik } = await sStorno();
    const o = await ogledaloto(dnevnik);

    expect(o.pogasenite).toHaveLength(1);
    const p = o.pogasenite[0]!;
    expect(p.vid).toBe('razhod');
    expect(p.id).toBe('RZ-1');
    expect(p.type).toBe('РазходЗаписан');
    expect(p.suma_st).toBe(240_00);
    expect(p.opis).toContain('Баумит');
    expect(p.prichina).toBe('сгрешен документ');
    expect(p.storniranOt).toBeGreaterThan(0);
    expect(p.actor).toBe('vintexstroy@gmail.com');
  });

  it('и НЕ влиза в картата · сборът не го вижда, СТРУКТУРНО', async () => {
    const { dnevnik } = await sStorno();
    const o = await ogledaloto(dnevnik);
    expect(o.razhodi.has('RZ-1')).toBe(false);
    // Оттук идва инвариантът: сборът чете от `razhodi`, а него го няма там.
    expect([...o.razhodi.values()].reduce((s, r) => s + r.suma_st, 0)).toBe(0);
  });
});

// ── 3 · СМЕТКИТЕ ──────────────────────────────────────────────────────────

describe('сторнираното не мърда НИТО ЕДНО число в Сметки', () => {
  it('нито разхода, нито ДДС-то, нито петте сверки', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-1', RAZHOD, { opId: 'op-r' });
    const predi = smetki(await ogledaloto(dnevnik), PERIOD, KOGATO);

    const o1 = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: o1.razhodi.get('RZ-1')!.seq, prichina: 'сгрешен' },
      { opId: 'op-st' },
    );
    const sled = smetki(await ogledaloto(dnevnik), PERIOD, KOGATO);

    expect(predi.razhod_st).toBe(240_00);
    expect(sled.razhod_st).toBe(0);
    expect(sled.dds_vhod_st).toBe(0);
    expect(sled.sverki).toHaveLength(5);
    expect(sled.sverki.every((s) => s.nared)).toBe(true);
  });
});

// ── 4 и 5 · КОЙ Е ПОГАСЕН РЕД ─────────────────────────────────────────────

describe('кой ред е погасен и кой не е', () => {
  it('самото СТОРНО не е погасен ред · иначе всяка поправка дава ДВА', async () => {
    const { dnevnik } = await sStorno();
    const o = await ogledaloto(dnevnik);
    // Огледалото гаси И сторното (за да не се брои втори път), но то е
    // ПОПРАВКАТА, не поправеното.
    expect(o.pogasenite.map((x) => x.type)).toEqual(['РазходЗаписан']);
    expect(o.pogaseni.size).toBe(2);
  });

  it('сторно на ПОПРАВКА дава ДРУГ ред, не създаването', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiDelo(
      'D-1',
      {
        myasto: 'Малинова',
        obekt: 'бл. 3',
        ime: 'Замазка',
        otgovornik: 'vintexstroy@gmail.com',
        ot: '2026-08-01',
        do: '2026-08-20',
        otsenka: 'важно-неспешно',
        sastoyanie: 'чака',
        nadDelo: '',
        dokument: '',
      },
      { opId: 'op-1' },
    );
    await deystviya.zapishiDelo(
      'D-1',
      {
        myasto: 'Малинова',
        obekt: 'бл. 3',
        ime: 'Замазка · поправено',
        otgovornik: 'vintexstroy@gmail.com',
        ot: '2026-08-01',
        do: '2026-08-20',
        otsenka: 'важно-неспешно',
        sastoyanie: 'чака',
        nadDelo: '',
        dokument: '',
      },
      { opId: 'op-2' },
    );
    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    const popravkata = vsichki.filter((x) => x.type === 'ДелоЗаписано').at(-1)!;
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: popravkata.seq, prichina: 'поправката е сгрешена' },
      { opId: 'op-st' },
    );

    const o = await ogledaloto(dnevnik);
    // ДЕЛОТО ОСТАВА · сторнирана е поправката, не създаването.
    expect(o.dela.get('D-1')?.ime).toBe('Замазка');
    expect(o.pogasenite.map((x) => x.seq)).toEqual([popravkata.seq]);
  });
});

// ── 6 · ПЪРВОТО СТОРНО РЕШАВА ─────────────────────────────────────────────

describe('първото сторно решава причината', () => {
  it('второ сторно на същото звено не я пренаписва', async () => {
    const { dnevnik, deystviya } = await sStorno('първата причина');
    const o1 = await ogledaloto(dnevnik);
    const seq = o1.pogasenite[0]!.seq;
    await deystviya.storniraj(
      'ST-2',
      { pogasyavaSeq: seq, prichina: 'втората причина' },
      { opId: 'op-st2' },
    );
    const o2 = await ogledaloto(dnevnik);
    expect(o2.pogasenite[0]!.prichina).toBe('първата причина');
  });
});

// ── 7 · ЕДИН ДОМ ЗА ОПИСАНИЕТО ────────────────────────────────────────────

describe('описанието и сумата идват от ЕДИН дом', () => {
  it('и износът, и екранът четат СЪЩОТО', async () => {
    const { dnevnik } = await sStorno();
    const zapis = (await dnevnik.chetiVsichki(NAEMATEL)).find(
      (x) => x.type === 'РазходЗаписан',
    )!;
    const o = await ogledaloto(dnevnik);
    expect(o.pogasenite[0]!.opis).toBe(opisaNaZapisa(zapis));
    expect(o.pogasenite[0]!.suma_st).toBe(sumataNaZapisa(zapis));
  });

  it('и НЕ гади сумата от кое да е поле на `_st`', async () => {
    // РОДЕНО ОТ СЧУПВАНЕ, КОЕТО МИНА (ADR-087 §7): замених изброените три
    // ключа с „първото поле, което свършва на _st" и НИЩО не падна, защото
    // всички стенди дотук носеха `suma_st` пръв.
    //
    // Разликата е истинска и скъпа. ЗАПЛАТАТА носи `dnevna_st` — ДНЕВНА
    // СТАВКА, не сума; сумата ѝ е ставка × дни и се СМЯТА (правило 17).
    // КРЕДИТЪТ носи `ostatak_st`, `vnoska_st` и `obezpechenie_st` — три числа,
    // нито едно от които е „сумата на записа". Гаданка тук би сложила
    // 100 000 € срещу ред, който не е за 100 000 €, и то пред собственика.
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiZaplata(
      {
        zaplataId: 'ZP-1',
        sedmitsa: '2026-W35',
        proektId: '',
        ime: 'Иван Петров',
        dlazhnost: 'зидар',
        obekt: 'бл. 3',
        dnevna_st: tsentove(120_00),
        dni: 5,
      },
      { opId: 'op-z' },
    );
    await deystviya.zapishiKredit(
      {
        kreditId: 'KR-1',
        ime: 'Ипотека',
        vid: 'ipoteka',
        proektId: '',
        ostatak_st: tsentove(100_000_00),
        ot: '2026-01-01',
        lihva_bp: 345,
        vnoska_st: tsentove(612_34),
        den: 15,
        otgovornik: 'vintexstroy@gmail.com',
        obezpechenie_st: tsentove(200_000_00),
      },
      { opId: 'op-k' },
    );
    const vsichki = await dnevnik.chetiVsichki(NAEMATEL);
    const zaplata = vsichki.find((x) => x.type === 'ЗаплатаЗаписана')!;
    const kredit = vsichki.find((x) => x.type === 'КредитЗаписан')!;

    expect(sumataNaZapisa(zaplata)).toBeUndefined();
    expect(sumataNaZapisa(kredit)).toBeUndefined();
  });

  it('запис БЕЗ сума го КАЗВА с undefined, не с нула', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.dobaviImot(
      'IM-1',
      { adres: 'Малинова', edinitsa: 'ап. 12', ploshtad_kvsm: 0 },
      { opId: 'op-i' },
    );
    const o1 = await ogledaloto(dnevnik);
    await deystviya.storniraj(
      'ST-1',
      { pogasyavaSeq: o1.imoti.get('IM-1')!.seq, prichina: 'дублиран имот' },
      { opId: 'op-st' },
    );
    const o = await ogledaloto(dnevnik);
    expect(o.pogasenite[0]!.suma_st).toBeUndefined();
    expect(o.pogasenite[0]!.opis).toContain('Малинова');
  });
});

// ── 8 · НУЛАТА Е ОТГОВОР ──────────────────────────────────────────────────

describe('без сторно списъкът е ПРАЗЕН', () => {
  it('и това е състояние, не липса', async () => {
    const { dnevnik, deystviya } = stend();
    await deystviya.zapishiRazhod('RZ-1', RAZHOD, { opId: 'op-r' });
    expect((await ogledaloto(dnevnik)).pogasenite).toEqual([]);
  });
});
