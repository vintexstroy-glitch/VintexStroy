/**
 * ДЪРВОТО ПОД ИМОТА · много степени, не две (резен 12б).
 *
 * Негови думи, 27.08: „Да има разрастване на плана под имот за задачи, дела,
 * проекти, цели С МНОГО СТЪПКИ като строителство на сграда в Гант."
 *
 * Тук се пази и ПОПРАВЕН ДЕФЕКТ: сгъването оставяше сираци, защото `vidimi`
 * разчиташе на ред, който `podredi` не гарантира.
 */

import { describe, expect, it } from 'vitest';
import {
  NAY_DALBOKO,
  type Delo,
  nomeraPoDarvo,
  noviyatRoditel,
  obhvatNaDetsata,
  podredeniPoDarvo,
  praviTsikal,
  roditeliSDetsa,
  sObobshteniSrokove,
  stepenNa,
  vidimi,
} from '../src/domein/dela.ts';

const DNES = '2026-08-27';

function delo(n: Partial<Delo> & { id: string }): Delo {
  return {
    seq: 1,
    myasto: 'Малинова Долина',
    obekt: '',
    ime: n.id,
    otgovornik: '',
    ot: '2026-08-01',
    do: '2026-12-31',
    otsenka: 'нито-едно',
    sastoyanie: 'чака',
    nadDelo: '',
    dokument: '',
    promeneno: '2026-08-27T09:00:00.000Z',
    promeniGo: 'vintexstroy@gmail.com',
    ...n,
  };
}

describe('дървото · степента', () => {
  const dela = [
    delo({ id: 'А' }),
    delo({ id: 'А1', nadDelo: 'А' }),
    delo({ id: 'А1а', nadDelo: 'А1' }),
    delo({ id: 'А1а1', nadDelo: 'А1а' }),
  ];

  it('брои степените до корена · четири нива', () => {
    expect(stepenNa(dela, 'А')).toBe(0);
    expect(stepenNa(dela, 'А1')).toBe(1);
    expect(stepenNa(dela, 'А1а')).toBe(2);
    expect(stepenNa(dela, 'А1а1')).toBe(3);
  });

  it('сирак е степен 0, не грешка · както `vidimi` го показва', () => {
    expect(stepenNa([delo({ id: 'сам', nadDelo: 'няма-го' })], 'сам')).toBe(0);
  });

  it('непознато дело е степен 0', () => {
    expect(stepenNa(dela, 'няма-такова')).toBe(0);
  });

  it('ЦИКЪЛ не върти безкрайно · спира на предпазителя', () => {
    const tsikal = [delo({ id: 'а', nadDelo: 'б' }), delo({ id: 'б', nadDelo: 'а' })];
    expect(stepenNa(tsikal, 'а')).toBeLessThanOrEqual(NAY_DALBOKO);
  });
});

describe('дървото · сгъването НЕ оставя сираци (поправен дефект)', () => {
  it('внук ПРЕДИ дядо в реда пак се крие · това чупеше досега', () => {
    // Дядото е „нито-едно" (тежест 3), внукът е „спешно-важно" (тежест 0):
    // подредбата слага внука ПРЕДИ дядото. Старото минаване напред го
    // пропускаше и той оставаше на екрана под скрит родител.
    const razburkani = [
      delo({ id: 'внук', nadDelo: 'син', otsenka: 'спешно-важно' }),
      delo({ id: 'син', nadDelo: 'дядо' }),
      delo({ id: 'дядо' }),
    ];
    expect(vidimi(razburkani, new Set(['дядо'])).map((d) => d.id)).toEqual(['дядо']);
  });

  it('сгънато дело крие ВСИЧКИТЕ си потомци, не само децата', () => {
    const dela = [
      delo({ id: 'А' }),
      delo({ id: 'А1', nadDelo: 'А' }),
      delo({ id: 'А1а', nadDelo: 'А1' }),
      delo({ id: 'Б' }),
    ];
    expect(vidimi(dela, new Set(['А'])).map((d) => d.id)).toEqual(['А', 'Б']);
  });

  it('сирак НЕ се крие мълчешком', () => {
    const dela = [delo({ id: 'сирак', nadDelo: 'изчезнал' })];
    expect(vidimi(dela, new Set(['изчезнал'])).map((d) => d.id)).toEqual([]);
    expect(vidimi(dela, new Set()).map((d) => d.id)).toEqual(['сирак']);
  });

  it('нищо сгънато · всички се виждат', () => {
    const dela = [delo({ id: 'А' }), delo({ id: 'А1', nadDelo: 'А' })];
    expect(vidimi(dela, new Set())).toHaveLength(2);
  });
});

describe('дървото · подредбата', () => {
  it('детето ВИНАГИ след родителя си, колкото и да гори', () => {
    const razburkani = [
      delo({ id: 'внук', nadDelo: 'син', otsenka: 'спешно-важно' }),
      delo({ id: 'син', nadDelo: 'дядо' }),
      delo({ id: 'дядо' }),
    ];
    expect(podredeniPoDarvo(razburkani, DNES).map((d) => d.id)).toEqual([
      'дядо',
      'син',
      'внук',
    ]);
  });

  it('вътре в едно ниво важи НЕГОВАТА подредба · спешното пред неспешното', () => {
    const dela = [
      delo({ id: 'корен' }),
      delo({ id: 'бавно', nadDelo: 'корен', otsenka: 'нито-едно' }),
      delo({ id: 'спешно', nadDelo: 'корен', otsenka: 'спешно-важно' }),
    ];
    expect(podredeniPoDarvo(dela, DNES).map((d) => d.id)).toEqual([
      'корен',
      'спешно',
      'бавно',
    ]);
  });

  it('сиракът НЕ изчезва · върви като самостоятелен', () => {
    const dela = [delo({ id: 'А' }), delo({ id: 'сирак', nadDelo: 'изчезнал' })];
    expect(podredeniPoDarvo(dela, DNES).map((d) => d.id).sort()).toEqual(['А', 'сирак']);
  });

  it('нито едно дело не се губи и не се появява два пъти', () => {
    const dela = [
      delo({ id: 'А' }),
      delo({ id: 'А1', nadDelo: 'А' }),
      delo({ id: 'А2', nadDelo: 'А' }),
      delo({ id: 'Б' }),
      delo({ id: 'Б1', nadDelo: 'Б' }),
    ];
    const red = podredeniPoDarvo(dela, DNES);
    expect(red).toHaveLength(dela.length);
    expect(new Set(red.map((d) => d.id)).size).toBe(dela.length);
  });

  it('ЦИКЪЛ не заключва подредбата', () => {
    const tsikal = [delo({ id: 'а', nadDelo: 'б' }), delo({ id: 'б', nadDelo: 'а' })];
    expect(() => podredeniPoDarvo(tsikal, DNES)).not.toThrow();
  });
});

describe('дървото · номерата 1 · 1.1 · 1.2.3', () => {
  it('брои по нива, като в MS Project', () => {
    const dela = podredeniPoDarvo(
      [
        delo({ id: 'А' }),
        delo({ id: 'А1', nadDelo: 'А', ime: 'а' }),
        delo({ id: 'А2', nadDelo: 'А', ime: 'б' }),
        delo({ id: 'А2а', nadDelo: 'А2' }),
        delo({ id: 'Б' }),
      ],
      DNES,
    );
    const n = nomeraPoDarvo(dela);
    expect(n.get('А')).toBe('1');
    expect(n.get('А1')).toBe('1.1');
    expect(n.get('А2')).toBe('1.2');
    expect(n.get('А2а')).toBe('1.2.1');
    expect(n.get('Б')).toBe('2');
  });

  it('всяко дело получава номер · никое не остава без', () => {
    const dela = podredeniPoDarvo(
      [delo({ id: 'А' }), delo({ id: 'А1', nadDelo: 'А' }), delo({ id: 'сирак', nadDelo: 'х' })],
      DNES,
    );
    const n = nomeraPoDarvo(dela);
    for (const d of dela) expect(n.get(d.id)).toBeTruthy();
  });
});

describe('дървото · обхватът на родителя (обобщената лента)', () => {
  it('покрива от НАЙ-РАННОТО до НАЙ-КЪСНОТО дете', () => {
    const dela = [
      delo({ id: 'А', ot: '2026-05-01', do: '2026-05-02' }),
      delo({ id: 'А1', nadDelo: 'А', ot: '2026-03-01', do: '2026-04-01' }),
      delo({ id: 'А2', nadDelo: 'А', ot: '2026-06-01', do: '2026-09-30' }),
    ];
    expect(obhvatNaDetsata(dela, 'А')).toEqual({ ot: '2026-03-01', do: '2026-09-30' });
  });

  it('стига и до ВНУЦИТЕ, не само до децата', () => {
    const dela = [
      delo({ id: 'А' }),
      delo({ id: 'А1', nadDelo: 'А', ot: '2026-06-01', do: '2026-06-02' }),
      delo({ id: 'А1а', nadDelo: 'А1', ot: '2026-01-01', do: '2026-12-31' }),
    ];
    expect(obhvatNaDetsata(dela, 'А')).toEqual({ ot: '2026-01-01', do: '2026-12-31' });
  });

  it('дело БЕЗ деца връща null · то си има свои срокове', () => {
    // Разликата между „няма деца" и „децата покриват нула дни" е важна.
    expect(obhvatNaDetsata([delo({ id: 'сам' })], 'сам')).toBeNull();
  });

  it('непознато дело връща null, не празен обхват', () => {
    expect(obhvatNaDetsata([delo({ id: 'А' })], 'няма-го')).toBeNull();
  });
});

describe('дървото · Вратата отказва ЦИКЪЛ', () => {
  const dela = [
    delo({ id: 'А' }),
    delo({ id: 'А1', nadDelo: 'А' }),
    delo({ id: 'А1а', nadDelo: 'А1' }),
    delo({ id: 'Б' }),
  ];

  it('дело, само на себе си родител, е цикъл', () => {
    expect(praviTsikal(dela, 'А', 'А')).toBe(true);
  });

  it('дядо под своя внук е цикъл', () => {
    expect(praviTsikal(dela, 'А', 'А1а')).toBe(true);
  });

  it('чужд родител НЕ е цикъл', () => {
    expect(praviTsikal(dela, 'А1а', 'Б')).toBe(false);
  });

  it('изваждането в корена НЕ е цикъл', () => {
    expect(praviTsikal(dela, 'А1', '')).toBe(false);
  });
});

describe('дървото · сгъвачът НЕ изчезва при сгъване (поправен дефект)', () => {
  const dela = [
    delo({ id: 'А' }),
    delo({ id: 'А1', nadDelo: 'А' }),
    delo({ id: 'А1а', nadDelo: 'А1' }),
    delo({ id: 'Б' }),
  ];

  it('брои родителите с ЕДНО минаване · не по един въпрос на ред', () => {
    expect([...roditeliSDetsa(dela)].sort()).toEqual(['А', 'А1']);
  });

  it('дело без деца НЕ е сгъваемо', () => {
    expect(roditeliSDetsa(dela).has('Б')).toBe(false);
  });

  it('СВИТОТО дело ПАК е сгъваемо · това чупеше разгъването', () => {
    // Сметнато от ВИДИМИЯ списък, свитото „А" няма видими деца → сгъвачът му
    // изчезваше и свитото не можеше да се върне. Затова множеството се смята
    // от списъка ПРЕДИ сгъването.
    const naEkrana = vidimi(dela, new Set(['А']));
    expect(roditeliSDetsa(naEkrana).has('А')).toBe(false);
    expect(roditeliSDetsa(dela).has('А')).toBe(true);
  });
});

describe('дървото · обобщената лента на родителя', () => {
  const dela = [
    delo({ id: 'А', ot: '2026-05-01', do: '2026-05-02' }),
    delo({ id: 'А1', nadDelo: 'А', ot: '2026-03-01', do: '2026-04-01' }),
    delo({ id: 'А1а', nadDelo: 'А1', ot: '2026-06-01', do: '2026-09-30' }),
    delo({ id: 'Б', ot: '2026-07-01', do: '2026-07-05' }),
  ];

  it('родителят се РАЗПЪВА до най-ранното и най-късното дете', () => {
    const r = sObobshteniSrokove(dela);
    const a = r.find((d) => d.id === 'А')!;
    expect([a.ot, a.do]).toEqual(['2026-03-01', '2026-09-30']);
  });

  it('дело БЕЗ деца не се пипа · и остава СЪЩИЯТ обект', () => {
    const r = sObobshteniSrokove(dela);
    expect(r.find((d) => d.id === 'Б')).toBe(dela[3]);
  });

  it('НИКОГА не се свива · записаният срок на родителя оцелява', () => {
    // Детето е ВЪТРЕ в срока на родителя: обхватът на децата е по-тесен, а
    // лентата пак покрива записаното. Свиване би скрило факт зад изведено.
    const tesni = [
      delo({ id: 'А', ot: '2026-01-01', do: '2026-12-31' }),
      delo({ id: 'А1', nadDelo: 'А', ot: '2026-06-01', do: '2026-06-02' }),
    ];
    const a = sObobshteniSrokove(tesni).find((d) => d.id === 'А')!;
    expect([a.ot, a.do]).toEqual(['2026-01-01', '2026-12-31']);
  });

  it('СВИТИЯТ родител пак се разпъва · децата се броят от целия списък', () => {
    const naEkrana = vidimi(dela, new Set(['А']));
    const a = sObobshteniSrokove(naEkrana, dela).find((d) => d.id === 'А')!;
    expect([a.ot, a.do]).toEqual(['2026-03-01', '2026-09-30']);
  });

  it('НИЩО не се записва · подаденият списък остава непокътнат', () => {
    sObobshteniSrokove(dela);
    expect(dela[0]!.ot).toBe('2026-05-01');
  });
});

describe('дървото · навътре и навън', () => {
  // Редът е ЕКРАННИЯТ · „навътре" значи „под реда НАД мен на моето ниво".
  const podredeni = [
    delo({ id: 'А' }),
    delo({ id: 'А1', nadDelo: 'А' }),
    delo({ id: 'А2', nadDelo: 'А' }),
    delo({ id: 'А2а', nadDelo: 'А2' }),
    delo({ id: 'Б' }),
  ];

  it('НАВЪТРЕ влиза под предишното на своето ниво', () => {
    expect(noviyatRoditel(podredeni, 'А2', 'navatre')).toBe('А1');
    expect(noviyatRoditel(podredeni, 'Б', 'navatre')).toBe('А');
  });

  it('най-горното на нивото си НЯМА къде да влезе', () => {
    expect(noviyatRoditel(podredeni, 'А', 'navatre')).toBeNull();
    expect(noviyatRoditel(podredeni, 'А1', 'navatre')).toBeNull();
  });

  it('НАВЪН вдига едно ниво · внукът става син', () => {
    expect(noviyatRoditel(podredeni, 'А2а', 'navan')).toBe('А');
  });

  it('навън от първа степен връща в КОРЕНА · празен низ, не null', () => {
    // Двете не се сливат: празният низ е валиден родител, null значи „няма къде".
    expect(noviyatRoditel(podredeni, 'А1', 'navan')).toBe('');
  });

  it('вече в корена · по-навън няма', () => {
    expect(noviyatRoditel(podredeni, 'А', 'navan')).toBeNull();
  });

  it('непознато дело НЕ хвърля · връща „няма къде"', () => {
    expect(noviyatRoditel(podredeni, 'няма-го', 'navatre')).toBeNull();
    expect(noviyatRoditel(podredeni, 'няма-го', 'navan')).toBeNull();
  });

  it('НАВЪТРЕ никога не прави цикъл · предишното не е потомък', () => {
    const nov = noviyatRoditel(podredeni, 'А2', 'navatre')!;
    expect(praviTsikal(podredeni, 'А2', nov)).toBe(false);
  });
});
