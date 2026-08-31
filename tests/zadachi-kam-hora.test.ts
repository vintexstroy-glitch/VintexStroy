/**
 * ЗАДАЧИТЕ КЪМ ХОРАТА · праща се, приема се, и си седи в листа (резен 14а).
 *
 * Негови думи, 27.08 (И110): „…да и праща задачите ДА ГИ ПРИЕМАТ… но в листа на
 * всеки служител СИ СЕДИ." И от 08.08 *(р57·[160])*: „копче за всяко дело… да му
 * се праща сигнал към календара РЪЧНО."
 */

import { describe, expect, it } from 'vitest';
import {
  chakashti,
  GreshkaZadacha,
  IMENA_NA_OTGOVORITE,
  IMENA_NA_SASTOYANIYATA,
  napraviIzprashtane,
  napraviOtgovor,
  OTGOVORI,
  sastoyanieNaZadacha,
  zadachiNa,
  zadachiNaDeloto,
  type Izprashtane,
  type OtgovorNaZadacha,
} from '../src/domein/zadachi-kam-hora.js';

const KOGATO = '2026-08-28T09:00:00.000Z';
const HORA = ['ivaylo85petkov@gmail.com', 'petkowi@gmail.com'];

function izprashtane(n: Partial<Parameters<typeof napraviIzprashtane>[0]> = {}): Izprashtane {
  return napraviIzprashtane(
    {
      zadachaId: 'Z-1',
      deloId: 'D-1',
      imeyl: 'ivaylo85petkov@gmail.com',
      ot: '2026-09-01',
      do: '2026-09-03',
      kogato: KOGATO,
      ...n,
    },
    HORA,
  );
}

describe('изпращането · на КОГО и върху КОЕ', () => {
  it('минава, когато човекът е служител и делото е назовано', () => {
    const z = izprashtane();
    expect(z.imeyl).toBe('ivaylo85petkov@gmail.com');
    expect(z.deloId).toBe('D-1');
    expect(z.poImeyl).toBe(false); // по имейл е ПО ИЗБОР (негово)
  });

  it('имейлът се СВЕЖДА · главните букви не правят втори човек', () => {
    expect(izprashtane({ imeyl: 'Ivaylo85Petkov@Gmail.com' }).imeyl)
      .toBe('ivaylo85petkov@gmail.com');
  });

  it('чужд имейл се ОТКАЗВА с думи · няма кой да я приеме', () => {
    expect(() => izprashtane({ imeyl: 'nyakoy@drugade.com' })).toThrow(GreshkaZadacha);
    expect(() => izprashtane({ imeyl: 'nyakoy@drugade.com' })).toThrow(/не е служител тук/);
  });

  it('задача без дело се отказва · тя виси на дело', () => {
    expect(() => izprashtane({ deloId: '  ' })).toThrow(/иска ДЕЛО/);
  });

  it('край преди начало се отказва', () => {
    expect(() => izprashtane({ ot: '2026-09-05', do: '2026-09-01' })).toThrow(/преди началото/);
  });
});

describe('часът · живее в ИЗПРАЩАНЕТО, не в делото', () => {
  it('празен час значи ЦЯЛ ДЕН · и това е нормалният случай', () => {
    const z = izprashtane();
    expect(z.chas).toBe('');
    expect(z.doChas).toBe('');
  });

  it('двата часа минават заедно', () => {
    const z = izprashtane({ chas: '09:00', doChas: '11:30' });
    expect([z.chas, z.doChas]).toEqual(['09:00', '11:30']);
  });

  it('ЕДИН час без другия не е час, а половин уговорка', () => {
    expect(() => izprashtane({ chas: '09:00' })).toThrow(/и НАЧАЛО, и КРАЙ/);
    expect(() => izprashtane({ doChas: '11:00' })).toThrow(/и НАЧАЛО, и КРАЙ/);
  });

  it('нечас се отказва с ДУМИ, не мълчешком', () => {
    expect(() => izprashtane({ chas: '25:00', doChas: '26:00' })).toThrow(/не е час/);
    expect(() => izprashtane({ chas: '9:00', doChas: '11:00' })).toThrow(/не е час/);
  });

  it('в ЕДИН ден краят не може да е преди началото', () => {
    expect(() => izprashtane({ ot: '2026-09-01', do: '2026-09-01', chas: '11:00', doChas: '09:00' }))
      .toThrow(/преди началото/);
    // През ДВА дни обаче е нормално: почва в 17:00, свършва в 09:00 другия ден.
    expect(izprashtane({ ot: '2026-09-01', do: '2026-09-02', chas: '17:00', doChas: '09:00' }).chas)
      .toBe('17:00');
  });
});

describe('отговорът · дума, не булево', () => {
  it('две са · приета и отказана', () => {
    expect([...OTGOVORI]).toEqual(['prieta', 'otkazana']);
    for (const o of OTGOVORI) expect(IMENA_NA_OTGOVORITE[o], o).not.toBe('');
  });

  it('приемането не иска причина', () => {
    expect(napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'prieta', kogato: KOGATO }).prichina).toBe('');
  });

  it('ОТКАЗЪТ иска причина · инак изпращачът гадае', () => {
    expect(() => napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'otkazana', kogato: KOGATO }))
      .toThrow(/иска причина/);
    expect(napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'otkazana', prichina: 'болен съм', kogato: KOGATO }).prichina)
      .toBe('болен съм');
  });

  it('непознат отговор се отказва', () => {
    expect(() => napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'може би', kogato: KOGATO }))
      .toThrow(/Няма такъв отговор/);
  });
});

describe('състоянието · СМЯТА се, не се записва', () => {
  const prazni = new Map<string, OtgovorNaZadacha>();

  it('без отговор задачата ЧАКА · и „чака" не е записано никъде', () => {
    expect(sastoyanieNaZadacha(prazni, 'Z-1')).toBe('chaka');
  });

  it('с отговор състоянието е неговото', () => {
    const s = new Map([['Z-1', napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'prieta', kogato: KOGATO })]]);
    expect(sastoyanieNaZadacha(s, 'Z-1')).toBe('prieta');
  });

  it('и трите състояния носят ДУМА за екрана', () => {
    for (const s of ['chaka', 'prieta', 'otkazana'] as const) {
      expect(IMENA_NA_SASTOYANIYATA[s], s).not.toBe('');
    }
  });
});

describe('листът на служителя · „си седи"', () => {
  const izprateni = new Map<string, Izprashtane>([
    ['Z-1', izprashtane({ zadachaId: 'Z-1', ot: '2026-09-05', do: '2026-09-05' })],
    ['Z-2', izprashtane({ zadachaId: 'Z-2', ot: '2026-09-01', do: '2026-09-02' })],
    ['Z-3', izprashtane({ zadachaId: 'Z-3', imeyl: 'petkowi@gmail.com' })],
  ]);

  it('дава СВОИТЕ на човека, подредени по начало', () => {
    expect(zadachiNa(izprateni, 'ivaylo85petkov@gmail.com').map((z) => z.zadachaId))
      .toEqual(['Z-2', 'Z-1']);
  });

  it('търси се по СВЕДЕН имейл · главните букви не крият листа', () => {
    expect(zadachiNa(izprateni, 'Ivaylo85Petkov@GMAIL.com')).toHaveLength(2);
  });

  it('ОТКАЗАНАТА не изчезва от листа · негово „си седи"', () => {
    const otgovori = new Map([
      ['Z-1', napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'otkazana', prichina: 'зает', kogato: KOGATO })],
    ]);
    const listat = zadachiNa(izprateni, 'ivaylo85petkov@gmail.com');
    expect(listat.map((z) => z.zadachaId)).toContain('Z-1');
    expect(sastoyanieNaZadacha(otgovori, 'Z-1')).toBe('otkazana');
  });

  it('човек без задачи има ПРАЗЕН лист, не грешка', () => {
    expect(zadachiNa(izprateni, 'nyama@go.com')).toEqual([]);
  });
});

describe('броенето · за картата в Таблото', () => {
  const izprateni = new Map<string, Izprashtane>([
    ['Z-1', izprashtane({ zadachaId: 'Z-1' })],
    ['Z-2', izprashtane({ zadachaId: 'Z-2' })],
    ['Z-3', izprashtane({ zadachaId: 'Z-3' })],
  ]);

  it('чакащите са онези БЕЗ отговор', () => {
    const otgovori = new Map([
      ['Z-1', napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'prieta', kogato: KOGATO })],
    ]);
    expect(chakashti(izprateni, otgovori)).toBe(2);
  });

  it('отказаната НЕ чака · тя е отговорена', () => {
    const otgovori = new Map([
      ['Z-1', napraviOtgovor({ zadachaId: 'Z-1', otgovor: 'otkazana', prichina: 'х', kogato: KOGATO })],
      ['Z-2', napraviOtgovor({ zadachaId: 'Z-2', otgovor: 'otkazana', prichina: 'х', kogato: KOGATO })],
    ]);
    expect(chakashti(izprateni, otgovori)).toBe(1);
  });
});

describe('задачите НА ЕДНО ДЕЛО · белегът върху реда в Управление', () => {
  it('връща само висящите на това дело', () => {
    const izprateni = new Map<string, Izprashtane>([
      ['Z-1', izprashtane({ zadachaId: 'Z-1', deloId: 'D-1' })],
      ['Z-2', izprashtane({ zadachaId: 'Z-2', deloId: 'D-2' })],
      ['Z-3', izprashtane({ zadachaId: 'Z-3', deloId: 'D-1', imeyl: 'petkowi@gmail.com' })],
    ]);
    expect(zadachiNaDeloto(izprateni, 'D-1').map((z) => z.zadachaId).sort()).toEqual(['Z-1', 'Z-3']);
    expect(zadachiNaDeloto(izprateni, 'няма-го')).toEqual([]);
  });
});
