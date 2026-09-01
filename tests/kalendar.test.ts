/**
 * КАЛЕНДАРЪТ · какво ТОЧНО заминава, и как се сглобява поканата (резен 14б).
 *
 * Негови думи, 27.08 (И110): „Когато се изпрати поканата, тя е по имейл ПО
 * ИЗБОР… но на Стопанина му показва приел ли е на календара или не."
 *
 * Тестът, който този файл пази най-строго, е ГРАНИЦАТА: нищо извън обявения
 * списък не бива да се промъкне в поканата. ADR-030 §4 казва, че имена на
 * наематели и доставчици не напускат устройството — а делото носи ПЕТ свободни
 * текстови полета, всяко от които може да е адрес на имот.
 */

import { describe, expect, it } from 'vitest';
import {
  chetiOtgovora,
  GreshkaKalendar,
  IMENA_NA_OTGOVORITE_OT_KALENDARA,
  KAKVO_NAPUSKA,
  KAKVO_NE_NAPUSKA,
  OTGOVORI_NA_KALENDARA,
  sabitieZaKalendar,
} from '../src/domein/kalendar.js';
import { napraviIzprashtane, type Izprashtane } from '../src/domein/zadachi-kam-hora.js';
import type { Delo } from '../src/domein/dela.js';

const KOGATO = '2026-08-28T09:00:00.000Z';
const HORA = ['ivaylo85petkov@gmail.com'];

function izprashtane(n: Record<string, unknown> = {}): Izprashtane {
  return napraviIzprashtane(
    {
      zadachaId: 'Z-1',
      deloId: 'D-1',
      imeyl: 'ivaylo85petkov@gmail.com',
      chas: '',
      ot: '2026-09-01',
      do: '2026-09-03',
      kogato: KOGATO,
      ...n,
    } as Parameters<typeof napraviIzprashtane>[0],
    HORA,
  );
}

const DELO: Delo = {
  id: 'D-1',
  seq: 1,
  myasto: 'Малинова Долина, бл. 21',
  obekt: 'ап. 4 · Стройпласт ЕООД',
  ime: 'Кофраж на етаж 1',
  otgovornik: 'Тихомир Иванов',
  chas: '',
  ot: '2026-09-01',
  do: '2026-09-03',
  otsenka: 'важно-неспешно',
  sastoyanie: 'чака',
  nadDelo: '',
  dokument: 'фактура 4412',
    promeneno: '2026-08-27T09:00:00.000Z',
    promeniGo: 'vintexstroy@gmail.com',
};

describe('границата · какво напуска и какво НЕ', () => {
  it('и двата списъка са поименни и непразни', () => {
    expect(KAKVO_NAPUSKA.length).toBeGreaterThan(0);
    expect(KAKVO_NE_NAPUSKA.length).toBeGreaterThan(0);
    for (const red of [...KAKVO_NAPUSKA, ...KAKVO_NE_NAPUSKA]) expect(red.trim()).not.toBe('');
  });

  it('МЯСТОТО и ОБЕКТЪТ на делото НЕ заминават · те носят адреси (ADR-030 §4)', () => {
    const s = JSON.stringify(sabitieZaKalendar(izprashtane(), DELO));
    expect(s).not.toContain('Малинова');
    expect(s).not.toContain('Стройпласт');
    expect(s).not.toContain('бл. 21');
  });

  it('отговорникът и документът също НЕ заминават', () => {
    const s = JSON.stringify(sabitieZaKalendar(izprashtane(), DELO));
    expect(s).not.toContain('Тихомир');
    expect(s).not.toContain('4412');
  });

  it('заминава ТОЧНО обявеното · име, бележка, дати, имейл', () => {
    const s = sabitieZaKalendar(izprashtane({ belezhka: 'вземи ключа' }), DELO);
    expect(s.summary).toBe('Кофраж на етаж 1');
    expect(s.description).toBe('вземи ключа');
    expect(s.attendees.map((u) => u.email)).toEqual(['ivaylo85petkov@gmail.com']);
    // и НИЩО повече · полетата на събитието са точно пет
    expect(Object.keys(s).sort()).toEqual(['attendees', 'description', 'end', 'start', 'summary']);
  });

  it('празната бележка не вкарва нищо чуждо на нейно място', () => {
    expect(sabitieZaKalendar(izprashtane(), DELO).description).toBe('');
  });
});

describe('цялодневно срещу с ЧАС', () => {
  it('без час събитието е ЦЯЛОДНЕВНО · с `date`, не `dateTime`', () => {
    const s = sabitieZaKalendar(izprashtane(), DELO);
    expect(s.start.date).toBe('2026-09-01');
    expect(s.start.dateTime).toBeUndefined();
  });

  it('краят на цялодневното е ИЗКЛЮЧВАЩ · денят СЛЕД последния', () => {
    // Без този ден еднодневната задача изчезва от календара напълно.
    const s = sabitieZaKalendar(izprashtane({ ot: '2026-09-01', do: '2026-09-01' }), DELO);
    expect(s.start.date).toBe('2026-09-01');
    expect(s.end.date).toBe('2026-09-02');
  });

  it('с час събитието носи `dateTime` · неговото „дело с час → събитие с час"', () => {
    const s = sabitieZaKalendar(izprashtane({ chas: '09:00', doChas: '11:30' }), DELO);
    expect(s.start.dateTime).toBe('2026-09-01T09:00:00');
    expect(s.end.dateTime).toBe('2026-09-03T11:30:00');
    expect(s.start.date).toBeUndefined();
  });
});

describe('покана без дело НЕ се прави', () => {
  it('хвърля с думи · покана за нищо не се праща', () => {
    expect(() => sabitieZaKalendar(izprashtane(), undefined)).toThrow(GreshkaKalendar);
    expect(() => sabitieZaKalendar(izprashtane(), undefined)).toThrow(/покана за нищо/);
  });

  it('дело без име получава дума, не празно заглавие', () => {
    expect(sabitieZaKalendar(izprashtane(), { ...DELO, ime: '   ' }).summary).toBe('Задача');
  });
});

describe('отговорът от календара · неговият, не нашият', () => {
  it('четирите на Google и петата ни дума за непознатото', () => {
    expect([...OTGOVORI_NA_KALENDARA]).toEqual([
      'needsAction',
      'accepted',
      'declined',
      'tentative',
    ]);
    for (const o of [...OTGOVORI_NA_KALENDARA, 'nepoznat' as const]) {
      expect(IMENA_NA_OTGOVORITE_OT_KALENDARA[o], o).not.toBe('');
    }
  });

  it('познатото минава непокътнато', () => {
    expect(chetiOtgovora('accepted')).toBe('accepted');
    expect(chetiOtgovora('needsAction')).toBe('needsAction');
  });

  it('НЕПОЗНАТОТО не се превежда в „не е отговорил" · това би било измислен отговор', () => {
    expect(chetiOtgovora('нещо ново')).toBe('nepoznat');
    expect(chetiOtgovora(undefined)).toBe('nepoznat');
    expect(chetiOtgovora(null)).toBe('nepoznat');
  });
});

describe('„по имейл: да" без номер е ЛЪЖА · правило 7', () => {
  it('записът се отказва, докато Google не е върнал id', () => {
    expect(() => izprashtane({ poImeyl: true })).toThrow(/преди Google да е върнал/);
  });

  it('с номер минава · това е поправката СЛЕД повикването', () => {
    const z = izprashtane({ poImeyl: true, kalendarId: 'sabitie-42' });
    expect([z.poImeyl, z.kalendarId]).toEqual([true, 'sabitie-42']);
  });

  it('без покана номерът е празен, не измислен', () => {
    expect(izprashtane().kalendarId).toBe('');
  });
});
