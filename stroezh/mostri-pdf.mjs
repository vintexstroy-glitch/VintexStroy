/**
 * МОСТРИТЕ В ПДФ · правят се тук, не се качват отвън (правило 29).
 *
 * Резени 110 и 117 четат ТРИ истински файла на собственика — линеен график от
 * MS Project, количествено-стойностна сметка и погасителен план от банка. Те
 * не влизат в хранилището:
 * „Поверителните данни не ги съхраняваме ние" (И132 · правило 29), а
 * хранилището е ПУБЛИЧНО (условие на GitHub Pages, ADR-054 §3). Затова
 * мострите се СТРОЯТ — с измислени числа, но със СЪЩАТА направа, която
 * прави истинските файлове трудни:
 *
 *   · текстът е ШЕСТНАЙСЕТИЧЕН (`<0102…> Tj`), не низ в скоби;
 *   · номерата на знаците минават през `/ToUnicode` на шрифта;
 *   · ИНТЕРВАЛЪТ го НЯМА в превода — точно както го изнася MS Project,
 *     затова четецът трябва да го върне като дупка, не да слепи думите;
 *   · всяка клетка е свой текстов блок с `Tm` — тоест ред на клетка.
 *
 * Пуска се с `node stroezh/mostri-pdf.mjs`; резултатът са файловете в
 * `tests/mostri/` — по един на формат, а колко са, се вижда от списъка долу.
 * Не се вика от строежа: мострите се менят, когато се смени форматът, и тогава
 * разликата трябва да се ВИДИ в едно ревю.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Клетките на линейния график · измислен обект, истинска направа.
 *
 * Първото число на реда е СТЕПЕНТА. MS Project не записва нивото никъде — то
 * е колко навътре е нарисувано името, и точно от него излизат „делата и
 * подделата" (И131 т.2). Мострата го носи, за да има какво да лови тестът.
 */
const GRAFIK = [
  [0, 'ID', 'Task Name', 'Duration', 'Start', 'Finish', 'Predecessors'],
  [0, '1', 'Строеж Пример · цялата сграда', '60 days', 'Mon 3/2/26', 'Fri 5/22/26', ''],
  [1, '2', 'Груб строеж', '40 days', 'Mon 3/2/26', 'Fri 4/24/26', ''],
  [2, '3', 'Изкопни работи', '10 days', 'Mon 3/2/26', 'Fri 3/13/26', ''],
  [2, '4', 'Кофраж и армировка', '20 days', 'Mon 3/16/26', 'Fri 4/10/26', '3'],
  [1, '5', 'Покрив', '15 days', 'Mon 5/4/26', 'Fri 5/22/26', '4'],
];

/** Клетките на КСС · шест колони, както в неговата сметка (степен няма). */
const KSS = [
  [0, '№ по ред', 'Описание на строително-монтажни работи', 'Ед. мярка', 'КОЛИЧЕСТВО', 'ЕД. ЦЕНА', 'СТОЙНОСТ'],
  [0, '1', 'Изходни данни и документи', 'бр.', '1.00', '2 000.00', '2 000.00'],
  [0, '2', 'Механизиран изкоп с извозване', 'м3', '250.00', '18.00', '4 500.00'],
  [0, '3', 'Кофраж за плоча', 'м2', '320.00', '25.00', '8 000.00'],
  [0, '4', 'Армировка', 'кг', '4 500.00', '2.20', '9 900.00'],
  [0, '5', 'Бетон С25/30', 'м3', '180.00', '145.00', '26 100.00'],
  [0, 'Общо:', '', '', '', '', '50 500.00'],
];

/**
 * ПОГАСИТЕЛНИЯТ ПЛАН · шапка, осем колони и собствен ред „Общо:" (резен 117).
 *
 * Числата са ИЗМИСЛЕНИ, но капаните на банката са истински:
 *   · шапката е двойки „етикет · стойност" на свои редове;
 *   · датите са НАПРЕД във времето, защото планът показва ОСТАВАЩИТЕ вноски
 *     (`planaNa` реже миналото): план изцяло в миналото е празен екран и не
 *     проверява нищо;
 *   · лихвата е ПРОМЕНЛИВА — вноската СКАЧА от четвъртата (И135б);
 *   · такса има, застраховка е нула — нулата е ЧИСЛО, не липса;
 *   · трите сверки трябва да затворят: главница + лихва = вноска;
 *     вноска + такса + застраховка = общо; сборовете = редът „Общо:".
 */
const PLAN = [
  [0, 'ПОГАСИТЕЛЕН ПЛАН'],
  [0, 'Кредитополучател:', 'ПРИМЕР ЕООД'],
  [0, 'Сделка №:', '1234567'],
  [0, 'Номер на договор:', 'BL00001'],
  [0, 'Начало на усвояване:', '01.01.2035'],
  [0, 'Край на усвояване:', '01.03.2035'],
  [0, 'Начало на издължаване:', '21.02.2035'],
  [0, 'Край на издължаване:', '21.07.2035'],
  [0, 'Салдо по редовна главница:', '2 940.00', 'BGN'],
  [0, '№', 'Дата на вноската', 'Вноска за главница', 'Вноска за лихва', 'Месечна вноска', 'Такса', 'Застраховка', 'Общо'],
  [0, '1', '21.02.2035', '500.00', '100.00', '600.00', '5.00', '0.00', '605.00'],
  [0, '2', '21.03.2035', '500.00', '100.00', '600.00', '5.00', '0.00', '605.00'],
  [0, '3', '21.04.2035', '500.00', '100.00', '600.00', '5.00', '0.00', '605.00'],
  [0, '4', '21.05.2035', '480.00', '140.00', '620.00', '4.00', '0.00', '624.00'],
  [0, '5', '21.06.2035', '480.00', '140.00', '620.00', '4.00', '0.00', '624.00'],
  [0, '6', '21.07.2035', '480.00', '140.00', '620.00', '4.00', '0.00', '624.00'],
  [0, 'Общо:', '', '2 940.00', '720.00', '3 660.00', '27.00', '0.00', '3 687.00'],
];

/**
 * Преводът на шрифта · номер на знак → буква, БЕЗ интервала.
 *
 * Номерата почват от 0x0100, за да са двубайтови като в подмножените шрифтове
 * на банката и на MS Project — там е капанът, който първата версия на четеца
 * не виждаше.
 */
function napraviPrevod(redove) {
  const tekstove = redove.flatMap((red) => red.slice(1));
  const znatsi = [...new Set(tekstove.join('').split(''))].filter((z) => z !== ' ');
  const kam = new Map();
  znatsi.forEach((z, i) => kam.set(z, 0x0100 + i));
  return kam;
}

function kamShestnaysetichno(tekst, prevod) {
  let izhod = '';
  for (const znak of tekst) {
    // ИНТЕРВАЛЪТ ПОЛУЧАВА НОМЕР, но НЕ влиза в `/ToUnicode` — както изнася
    // MS Project. Четецът трябва да върне дупката, не да слепи двете думи.
    const nomer = znak === ' ' ? 0x0003 : prevod.get(znak);
    izhod += nomer.toString(16).padStart(4, '0').toUpperCase();
  }
  return izhod;
}

function cmap(prevod) {
  const dvoyki = [...prevod.entries()].map(
    ([znak, nomer]) =>
      `<${nomer.toString(16).padStart(4, '0')}> <${znak
        .charCodeAt(0)
        .toString(16)
        .padStart(4, '0')}>`,
  );
  // По сто двойки в блок — така го пишат и истинските файлове.
  const blokove = [];
  for (let i = 0; i < dvoyki.length; i += 100) {
    const parche = dvoyki.slice(i, i + 100);
    blokove.push(`${parche.length} beginbfchar\n${parche.join('\n')}\nendbfchar`);
  }
  return `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${blokove.join('\n')}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
}

function sadarzhanie(redove, prevod) {
  let izhod = '';
  let y = 780;
  for (const [stepen, ...kletki] of redove) {
    let x = 40;
    kletki.forEach((kletka, kolona) => {
      if (kletka !== '') {
        // ВТОРАТА колона (името) се мести навътре по СТЕПЕН — това е целият
        // носител на дървото в такъв износ, и точно него четецът брои.
        const otstap = kolona === 1 ? stepen * 12 : 0;
        izhod += `BT /F1 9 Tf 1 0 0 1 ${x + otstap} ${y} Tm <${kamShestnaysetichno(kletka, prevod)}> Tj ET\n`;
      }
      x += 90;
    });
    y -= 18;
  }
  return izhod;
}

function napraviPDF(redove) {
  const prevod = napraviPrevod(redove);
  const potok = deflateSync(Buffer.from(sadarzhanie(redove, prevod), 'latin1'));
  const prevodPotok = deflateSync(Buffer.from(cmap(prevod), 'latin1'));

  const chasti = [];
  const dobavi = (s) => chasti.push(Buffer.isBuffer(s) ? s : Buffer.from(s, 'latin1'));

  const obekti = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> /XObject << /Im1 7 0 R >> >> >>',
    { glava: `<< /Length ${potok.length} /Filter /FlateDecode >>`, potok },
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode 6 0 R >>',
    { glava: `<< /Length ${prevodPotok.length} /Filter /FlateDecode >>`, potok: prevodPotok },
    // Празна „картинка" · четецът трябва да я подмине, а не да я разгъва.
    { glava: '<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /Length 3 >>', potok: Buffer.from([1, 2, 3]) },
  ];

  dobavi('%PDF-1.4\n');
  const kade = [];
  let dalzhina = 9;
  obekti.forEach((o, i) => {
    kade.push(dalzhina);
    const glava = typeof o === 'string' ? o : o.glava;
    const nachalo = `${i + 1} 0 obj\n${glava}\n`;
    dobavi(nachalo);
    dalzhina += nachalo.length;
    if (typeof o !== 'string') {
      dobavi('stream\r\n');
      dobavi(o.potok);
      dobavi('\r\nendstream\n');
      dalzhina += 'stream\r\n'.length + o.potok.length + '\r\nendstream\n'.length;
    }
    dobavi('endobj\n');
    dalzhina += 'endobj\n'.length;
  });
  const nachaloNaXref = dalzhina;
  let xref = `xref\n0 ${obekti.length + 1}\n0000000000 65535 f \n`;
  for (const k of kade) xref += `${String(k).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${obekti.length + 1} /Root 1 0 R >>\nstartxref\n${nachaloNaXref}\n%%EOF\n`;
  dobavi(xref);
  return Buffer.concat(chasti);
}

const kade = (ime) => fileURLToPath(new URL(`../tests/mostri/${ime}`, import.meta.url));
writeFileSync(kade('lineen-grafik.pdf'), napraviPDF(GRAFIK));
writeFileSync(kade('kss.pdf'), napraviPDF(KSS));
writeFileSync(kade('pogasitelen-plan.pdf'), napraviPDF(PLAN));
console.log(
  'Мострите са написани: tests/mostri/lineen-grafik.pdf · kss.pdf · pogasitelen-plan.pdf',
);
