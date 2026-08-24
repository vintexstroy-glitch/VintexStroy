/**
 * МЕСЕЦЪТ КАТО ТАБЛИЦА · храната на счетоводния агент (резен 15б · ADR-005).
 *
 * Пази пет неща, всяко платено с причина:
 *   · таблицата носи ТРИТЕ раздела — потоци, акумулатори, показатели;
 *   · Δ се СМЯТА, не се записва (правило 20), и „от нула" няма процент;
 *   · четирите сверки пътуват С таблицата и затварят (правило 7);
 *   · празният месец пак дава таблица — нулата е проверена, не липсваща;
 *   · **навън НЕ излизат имена** на наематели и доставчици (ADR-029).
 *
 * Последното е границата, отвъд която бутон „анализирай" би станал бутон
 * „изпрати клиентите ми навън" — затова има свой тест, а не коментар.
 */

import { describe, expect, it } from 'vitest';
import { DnevnikVPametta, stotinki, Vrata, VsichkoRazresheno } from '../src/yadro/index.js';
import { Deystviya } from '../src/domein/deystviya.js';
import { nachisliZaPeriod } from '../src/domein/nachislyavane.js';
import { smetki } from '../src/domein/smetki.js';
import {
  IMENA_NA_RAZDELITE,
  RAZDELI,
  delta,
  deltaProtsentiDeseti,
  kamTekst,
  mesetsatKatoTablitsa,
  predishniyatPeriod,
} from '../src/domein/mesetsat.js';
import { SHA } from './pomoshtni.js';

const PERIOD = '2026-08';
const PREDI = '2026-07';
const KOGATO = '2026-08-24T09:00:00.000Z';

/** Имена, които НЕ БИВА да излязат навън — нарочно разпознаваеми. */
const NAEMATEL = 'Домакинство Петрови';
const FIRMA = 'Стройпласт Уникален ЕООД';
const DOSTAVCHIK = 'Материали Разпознаваеми ООД';

function stend() {
  const dnevnik = new DnevnikVPametta();
  const vrata = new Vrata({ dnevnik, pravata: new VsichkoRazresheno(), sha: SHA });
  let tik = 0;
  const deystviya = new Deystviya({
    vrata,
    dnevnik,
    naematel: 'vintexstroy',
    actor: 'vintexstroy@gmail.com',
    chasovnik: () => new Date(Date.UTC(2026, 7, 24, 9, 0, tik++)).toISOString(),
  });
  return { deystviya };
}

/** Два месеца поред, за да има какво да се сравнява. */
async function dvaMeseca(d: Deystviya): Promise<void> {
  await d.dobaviImot('I-1', { adres: 'Малинова', edinitsa: 'бл. 1', ploshtad_kvsm: 0 }, {
    opId: 'op-imot',
  });
  await d.dobaviNaem(
    'N-zhil',
    {
      imotId: 'I-1',
      naemetel: NAEMATEL,
      naem_st: stotinki(500_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-zhilishten',
    },
    { opId: 'op-n-zhil' },
  );
  await d.dobaviNaem(
    'N-targ',
    {
      imotId: 'I-1',
      naemetel: FIRMA,
      naem_st: stotinki(1200_00),
      padezhDen: 5,
      ot: '2024-01-01',
      do: '',
      depozit_st: 0,
      sektor: 'naem-targovski',
    },
    { opId: 'op-n-targ' },
  );

  await nachisliZaPeriod({ deystviya: d, period: PREDI, kogato: KOGATO });
  await nachisliZaPeriod({ deystviya: d, period: PERIOD, kogato: KOGATO });

  // Разход в предходния месец и ДВОЙНО повече в текущия — за да мърда Δ.
  for (const [i, [period, suma]] of [
    [PREDI, 600_00],
    [PERIOD, 1200_00],
  ].entries()) {
    await d.zapishiRazhod(
      `R-${i}`,
      {
        potok: 'fakturi',
        dostavchik: DOSTAVCHIK,
        opis: 'цимент',
        suma_st: stotinki(suma as number),
        sektor: 'pokupki-materiali',
        nachin: 'банка',
        data: `${period as string}-12`,
        dokument: `Ф-${100 + i}`,
        stavka: 20,
      },
      { opId: `op-razhod-${i}` },
    );
  }
}

describe('трите раздела', () => {
  it('са изброени ПОИМЕННО и всеки има име на български', () => {
    expect([...RAZDELI]).toEqual(['potok', 'akumulator', 'pokazatel']);
    for (const r of RAZDELI) expect(IMENA_NA_RAZDELITE[r]).not.toBe('');
  });

  it('таблицата носи и трите — не само сборове', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);

    for (const razdel of RAZDELI) {
      expect(t.redove.some((r) => r.razdel === razdel), razdel).toBe(true);
    }
    // Шестте потока стоят всичките — и празният поток е факт, не липса.
    expect(t.redove.filter((r) => r.razdel === 'potok')).toHaveLength(6);
  });

  it('главите са изписани и Разликата е между тях', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);
    expect([...t.glavi]).toEqual(['Раздел', 'Ред', 'Сега', 'Предходен', 'Разлика', 'Брой']);
  });
});

describe('Δ се СМЯТА, не се записва (правило 20)', () => {
  it('разликата е точно сега − предходен', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);

    const fakturi = t.redove.find((r) => r.razdel === 'potok' && r.ime === 'Фактури')!;
    expect(fakturi.stoynost_st).toBe(1200_00);
    expect(fakturi.predi_st).toBe(600_00);
    expect(delta(fakturi)).toBe(600_00);
    // и в самия ред НЯМА записано поле „делта" — то се смята
    expect(Object.keys(fakturi)).not.toContain('delta_st');
  });

  it('удвоеното е +100,0 %', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);
    const fakturi = t.redove.find((r) => r.razdel === 'potok' && r.ime === 'Фактури')!;
    expect(deltaProtsentiDeseti(fakturi)).toBe(1000);
  });

  it('„от нула на нещо" НЯМА процент — липсата се казва, не се запълва', () => {
    const otNula = {
      razdel: 'potok' as const,
      ime: 'Кредити',
      stoynost_st: 890_00,
      broy: 1,
      predi_st: 0,
      kakvo: '',
    };
    expect(delta(otNula)).toBe(890_00);
    expect(deltaProtsentiDeseti(otNula)).toBeUndefined();
  });

  it('спадът е отрицателен и в двете мерки', () => {
    const spad = {
      razdel: 'potok' as const,
      ime: 'Фактури',
      stoynost_st: 300_00,
      broy: 1,
      predi_st: 600_00,
      kakvo: '',
    };
    expect(delta(spad)).toBe(-300_00);
    expect(deltaProtsentiDeseti(spad)).toBe(-500);
  });
});

describe('предходният месец', () => {
  it('минава границата на годината назад', () => {
    expect(predishniyatPeriod('2026-01')).toBe('2025-12');
    expect(predishniyatPeriod('2026-08')).toBe('2026-07');
    expect(predishniyatPeriod('2026-10')).toBe('2026-09');
  });

  it('ред, който го е нямало миналия месец, тръгва от НУЛА', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    await deystviya.zapishiRazhod(
      'R-nov',
      {
        potok: 'zaplati',
        dostavchik: DOSTAVCHIK,
        opis: 'заплати',
        suma_st: stotinki(3400_00),
        sektor: 'zaplati',
        nachin: 'банка',
        data: '2026-08-28',
        dokument: '',
      },
      { opId: 'op-zaplati' },
    );
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);
    const zaplati = t.redove.find((r) => r.razdel === 'potok' && r.ime === 'Заплати')!;
    expect(zaplati.stoynost_st).toBe(3400_00);
    expect(zaplati.predi_st).toBe(0);
  });
});

describe('сверките пътуват С таблицата (правило 7)', () => {
  it('четирите са налице и всяка затваря', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO);

    expect(t.sverki).toHaveLength(4);
    for (const s of t.sverki) expect(s.razlika, s.kakvo).toBe(0);
    expect(t.nared).toBe(true);
  });

  it('приходният ред е СЪЩИЯТ, който Сметки казва — не втора сметка', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const o = await deystviya.ogledalo();
    const t = mesetsatKatoTablitsa(o, PERIOD, KOGATO);
    const s = smetki(o, PERIOD, KOGATO);

    const naemi = t.redove.find((r) => r.razdel === 'potok' && r.ime === 'Наеми')!;
    expect(naemi.stoynost_st).toBe(s.prihod_st);
  });

  it('празният месец ПАК дава таблица · проверената нула не е липсваща', async () => {
    const { deystviya } = stend();
    const t = mesetsatKatoTablitsa(await deystviya.ogledalo(), '2030-01', KOGATO);

    expect(t.redove.filter((r) => r.razdel === 'potok')).toHaveLength(6);
    expect(t.redove.every((r) => r.razdel !== 'potok' || r.stoynost_st === 0)).toBe(true);
    expect(t.sverki).toHaveLength(4);
    expect(t.nared).toBe(true);
  });
});

describe('какво излиза НАВЪН · границата на ADR-029', () => {
  it('в текста НЯМА нито едно име на наемател или доставчик', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const tekst = kamTekst(mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO));

    for (const ime of [NAEMATEL, FIRMA, DOSTAVCHIK]) {
      expect(tekst, `„${ime}" изтече навън`).not.toContain(ime);
    }
    // и нито един откъслек от тях — не само пълното изписване
    for (const parche of ['Петрови', 'Уникален', 'Разпознаваеми']) {
      expect(tekst, `„${parche}" изтече навън`).not.toContain(parche);
    }
  });

  it('но носи РАЗДЕЛИТЕ и числата, иначе анализът е мнение', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const tekst = kamTekst(mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO));

    expect(tekst).toContain('МЕСЕЦ 2026-08');
    expect(tekst).toContain('сравнен с 2026-07');
    expect(tekst).toContain('Фактури');
    expect(tekst).toContain('наем · търговски');
    expect(tekst).toContain('Капитал');
    // Δ-та се изписва със знак — посоката е половината от смисъла
    expect(tekst).toMatch(/\+600\.00 \(\+100\.0%\)/);
  });

  it('сверките ИЗЛИЗАТ с него — агентът вижда дали месецът е цял', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const tekst = kamTekst(mesetsatKatoTablitsa(await deystviya.ogledalo(), PERIOD, KOGATO));

    expect(tekst).toContain('СВЕРКИ');
    expect(tekst).toContain('Всички сверки затварят.');
    // и нулата е ИЗПИСАНА, не премълчана
    expect(tekst).toContain('разлика 0.00');
  });

  it('сумите са в евро с точка, а вътре стотинката остава ЦЯЛА', async () => {
    const { deystviya } = stend();
    await dvaMeseca(deystviya);
    const o = await deystviya.ogledalo();
    const t = mesetsatKatoTablitsa(o, PERIOD, KOGATO);

    for (const r of t.redove) {
      expect(Number.isSafeInteger(r.stoynost_st), `${r.ime} не е цели стотинки`).toBe(true);
      expect(Number.isSafeInteger(r.predi_st), `${r.ime} не е цели стотинки`).toBe(true);
    }
    expect(kamTekst(t)).toContain('1200.00');
  });
});
