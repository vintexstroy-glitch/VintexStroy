/**
 * ЧЕТЕЦЪТ НА .xlsb · инвариантите на резен 60.
 *
 * ФАЙЛЪТ ЗА ПРОБА СЕ СТРОИ ТУК, байт по байт. Истинският му файл („приходи ·
 * Винтекс Строй АД") носи имена, телефони и имейли на купувачи — той се чете,
 * но НЕ влиза в хранилището. Тест, който иска чужди лични данни, за да мине,
 * е тест, който ги разнася.
 */
import { describe, expect, it } from 'vitest';
import { GreshkaXLSB, otXLSB } from '../src/iztochnik/xlsb.js';

// ── строим .xlsb ───────────────────────────────────────────────────────────

/** Един запис BIFF12: номер · дължина · съдържание, по 7 бита на байт. */
function zapis(nomer: number, tyalo: Uint8Array): Uint8Array {
  const glava: number[] = [];
  if (nomer < 0x80) glava.push(nomer);
  else glava.push((nomer & 0x7f) | 0x80, (nomer >> 7) & 0x7f);
  let n = tyalo.length;
  do {
    const b = n & 0x7f;
    n >>= 7;
    glava.push(n > 0 ? b | 0x80 : b);
  } while (n > 0);
  return new Uint8Array([...glava, ...tyalo]);
}

function slepi(...chasti: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chasti.reduce((s, c) => s + c.length, 0));
  let i = 0;
  for (const c of chasti) {
    out.set(c, i);
    i += c.length;
  }
  return out;
}

/** Низ по мярката на Excel: дължина в ЗНАЦИ + UTF-16. */
function niz(s: string): Uint8Array {
  const b = new Uint8Array(4 + 2 * s.length);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, s.length, true);
  for (let i = 0; i < s.length; i += 1) dv.setUint16(4 + 2 * i, s.charCodeAt(i), true);
  return b;
}

function kletka(kolona: number, opashka: Uint8Array): Uint8Array {
  const glava = new Uint8Array(8);
  new DataView(glava.buffer).setUint32(0, kolona, true);
  return slepi(glava, opashka);
}

function chetiri(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function osem(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, n, true);
  return b;
}

/** ZIP БЕЗ свиване — четецът приема метод 0 и не проверява контролна сума. */
function zip(chasti: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const mestni: Uint8Array[] = [];
  const opis: Uint8Array[] = [];
  let mesto = 0;
  for (const [ime, danni] of chasti) {
    const imeB = new TextEncoder().encode(ime);
    const m = new Uint8Array(30 + imeB.length + danni.length);
    const dvm = new DataView(m.buffer);
    dvm.setUint32(0, 0x04034b50, true);
    dvm.setUint32(18, danni.length, true);
    dvm.setUint32(22, danni.length, true);
    dvm.setUint16(26, imeB.length, true);
    m.set(imeB, 30);
    m.set(danni, 30 + imeB.length);
    mestni.push(m);

    const c = new Uint8Array(46 + imeB.length);
    const dvc = new DataView(c.buffer);
    dvc.setUint32(0, 0x02014b50, true);
    dvc.setUint16(10, 0, true);
    dvc.setUint32(20, danni.length, true);
    dvc.setUint32(24, danni.length, true);
    dvc.setUint16(28, imeB.length, true);
    dvc.setUint32(42, mesto, true);
    c.set(imeB, 46);
    opis.push(c);
    mesto += m.length;
  }
  const tyaloOpis = slepi(...opis);
  const kray = new Uint8Array(22);
  const dvk = new DataView(kray.buffer);
  dvk.setUint32(0, 0x06054b50, true);
  dvk.setUint16(8, chasti.size, true);
  dvk.setUint16(10, chasti.size, true);
  dvk.setUint32(12, tyaloOpis.length, true);
  dvk.setUint32(16, mesto, true);
  return slepi(...mestni, tyaloOpis, kray);
}

/** RK · цялото число се пише в горните 30 бита; двата долни носят вида. */
function rkTsyalo(n: number, naSto = false): Uint8Array {
  return chetiri(((n << 2) | 2 | (naSto ? 1 : 0)) >>> 0);
}

function rkDrobno(n: number, naSto = false): Uint8Array {
  const b = new ArrayBuffer(8);
  new DataView(b).setFloat64(0, n, true);
  const gorni = new DataView(b).getUint32(4, true);
  return chetiri(((gorni & ~3) | (naSto ? 1 : 0)) >>> 0);
}

const APP = `<?xml version="1.0"?><Properties><TitlesOfParts><vt:vector>
<vt:lpstr>Малинова</vt:lpstr><vt:lpstr>Терме</vt:lpstr></vt:vector></TitlesOfParts></Properties>`;

function faylZaProba(): Uint8Array {
  const nizove = slepi(
    zapis(19, slepi(new Uint8Array([0]), niz('апартамент'))),
    zapis(19, slepi(new Uint8Array([0]), niz('цена'))),
    zapis(19, slepi(new Uint8Array([0]), niz('апартамент № 3'))),
  );

  const list1 = slepi(
    zapis(0, chetiri(1)), // ред 2 (броенето е от нула)
    zapis(7, kletka(0, chetiri(0))),
    zapis(7, kletka(1, chetiri(1))),
    zapis(0, chetiri(2)), // ред 3
    zapis(7, kletka(0, chetiri(2))),
    zapis(2, kletka(1, rkTsyalo(147800))),
    zapis(5, kletka(3, osem(63.31))),
    zapis(6, kletka(4, niz('лев'))),
    zapis(4, kletka(5, new Uint8Array([1]))),
  );

  const list2 = slepi(
    zapis(0, chetiri(0)),
    zapis(2, kletka(0, rkDrobno(1.25))),
    zapis(2, kletka(1, rkTsyalo(415, true))),
  );

  return zip(
    new Map([
      ['docProps/app.xml', new TextEncoder().encode(APP)],
      ['xl/sharedStrings.bin', nizove],
      ['xl/worksheets/sheet1.bin', list1],
      ['xl/worksheets/sheet2.bin', list2],
    ]),
  );
}

describe('.xlsb · двоичната работна книга', () => {
  it('чете листовете с ИМЕНАТА им, по реда в книгата', async () => {
    const t = await otXLSB(faylZaProba(), 'проба');
    expect(t.map((x) => x.ime)).toEqual(['Малинова', 'Терме']);
  });

  it('общите низове стигат до клетките', async () => {
    const [malinova] = await otXLSB(faylZaProba(), 'проба');
    expect(malinova!.redove[1]).toEqual(['апартамент', 'цена']);
    expect(malinova!.redove[2]![0]).toBe('апартамент № 3');
  });

  it('ПРАЗНИЯТ ред отпред се пази · иначе данните се качват нагоре', async () => {
    const [malinova] = await otXLSB(faylZaProba(), 'проба');
    // Листът почва от ред 2; ред 1 е празен и ОСТАВА празен.
    expect(malinova!.redove[0]).toEqual([]);
    expect(malinova!.redove.length).toBe(3);
  });

  it('RK чете и цяло, и дробно, и делено на сто', async () => {
    const t = await otXLSB(faylZaProba(), 'проба');
    // Числата са ПИСАНИ С РЪКА: сравнение срещу самия четец не мери нищо.
    expect(t[0]!.redove[2]![1]).toBe('147800');
    // 1,25 се ПОБИРА в RK-дробното: то пази само горните 30 бита на числото,
    // и Excel го ползва само когато долните 32 са нули. Първата ми проба беше
    // с 0,05 — то не се побира, четецът върна 0,0499999523162842, и тестът
    // хвана МОЯТА проба, не кода. (В неговия файл 0,05 идва като ЦЯЛО 5 със
    // знак „делено на сто" — другият клон, който също се проверява тук.)
    expect(t[1]!.redove[0]![0]).toBe('1.25');
    expect(t[1]!.redove[0]![1]).toBe('4.15');
  });

  it('числото с плаваща точка НЕ се разваля на изхода', async () => {
    const [malinova] = await otXLSB(faylZaProba(), 'проба');
    // 63,31 · записано като double, прочетено като „63.31", не „63.310000000001"
    expect(malinova!.redove[2]![3]).toBe('63.31');
  });

  it('текстът в клетка и логическото ДА/НЕ се четат', async () => {
    const [malinova] = await otXLSB(faylZaProba(), 'проба');
    expect(malinova!.redove[2]![4]).toBe('лев');
    expect(malinova!.redove[2]![5]).toBe('ДА');
  });

  it('файл, който не е архив, се отказва с думи', async () => {
    await expect(otXLSB(new TextEncoder().encode('това не е xlsb'))).rejects.toThrow(GreshkaXLSB);
  });

  it('архив без нито един лист се отказва, и КАЗВА името на файла', async () => {
    const prazen = zip(new Map([['docProps/app.xml', new TextEncoder().encode(APP)]]));
    await expect(otXLSB(prazen, 'празният')).rejects.toThrow(/празният/);
  });
});
