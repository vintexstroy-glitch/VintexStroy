/**
 * ОДИТНИЯТ ФАЙЛ · SAF-T за НАП, писан със средствата на браузъра (И96 т.11).
 *
 * ═══ КАКВО Е ТОВА ═══
 *
 * Месечен XML: `Header` (кой подава, за кой период), `MasterFiles` (сметкоплан,
 * клиенти, доставчици, данъчни ставки), `GeneralLedgerEntries` (статиите от
 * Главната книга) и `SourceDocuments` (продажби, покупки, плащания).
 *
 * Годишният файл (дълготрайните активи) и файлът при поискване (стоки) НЕ са
 * тук — те са отделни решения, и се казва честно, вместо да се преструва на
 * пълно съответствие.
 *
 * ═══ ПРАВИЛО 10 ИЗДЪРЖА ═══
 *
 * XML се пише с шаблонни низове. Нула зависимости, нищо чуждо в пакета. Ходът
 * е същият като при работната книга на Excel и екранирането е СЪЩОТО
 * (`xml.ts`), не второ копие.
 *
 * ═══ ЧЕСТНАТА ДУМА ═══
 *
 * Файлът НЕ е валидиран срещу истинската XSD-схема на НАП: тя се сваля от
 * nra.bg, а средата, в която е строен този код, няма достъп дотам. Затова:
 *
 *   · структурата е по описанието на схемата, не по самия ѝ файл;
 *   · номенклатурните кодове са ПРАЗНИ, докато не се свалят;
 *   · `prechki` изброява поименно какво спира подаването;
 *   · истинската проверка е ТЕСТОВОТО подаване през портала на НАП.
 *
 * Обявено „готово" тук би било най-скъпата лъжа в целия проект: човекът щеше
 * да разбере, че не е, от акта.
 *
 * ═══ ИМЕНАТА НАПУСКАТ УСТРОЙСТВОТО САМО ТУК, И ТО В НЕГОВИТЕ РЪЦЕ ═══
 *
 * Правилото „имена на наематели и доставчици не напускат устройството" пази от
 * пращане към ЧУЖДА услуга. Този файл се сглобява МЕСТНО и се сваля като файл;
 * приложението не го изпраща наникъде. Кой и кога го подава в НАП, решава
 * човекът — както решава и за всеки друг износ.
 */

import { DnevnikNaSverki, MERKA, sverka, type Sverka } from '../yadro/sverka.js';
import { ekvXML, el, sumaXML } from './xml.js';
import { glavnaKniga, IMENA_NA_DNEVNITSITE, SMETKOPLAN, type GlavnaKniga } from '../domein/glavna-kniga.js';
import { kakvoLipsva, klyuchNaKontragent, type Kontragent } from '../domein/kontragenti.js';
import type { ImeVFayla } from '../domein/nap-dostap.js';
import { ddsOtObshta, stavkaNaReda, STAVKI } from '../domein/dds.js';
import { dniVMeseca } from '../domein/nachislyavane.js';
import { razhodiZaPerioda } from '../domein/smetki.js';
import { kod, prechkiOtShemata, proveriShema, SHEMA, type Shema } from './saf-t-shema.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { Period } from '../domein/nachislyavane.js';

/** Кой прави файла · стои в `Header`, за да знае НАП с какво е писан. */
const SOFTUER = Object.freeze({
  ime: 'MasterBook',
  proizvoditel: 'VintexStroy',
});

interface RezultatSAFT {
  readonly period: Period;
  readonly xml: string;
  /** името на файла · период и ЕИК, за да се различават два месеца в папката */
  readonly ime: string;
  readonly kniga: GlavnaKniga;
  readonly sverki: readonly Sverka[];
  readonly nared: boolean;
  /** какво СПИРА подаването · изречения, не флагове */
  readonly prechki: readonly string[];
  readonly broiStatii: number;
  readonly broiProdazhbi: number;
  readonly broiPokupki: number;
  readonly broiPlashtaniya: number;
  /**
   * ЧИИ ИМЕНА ще носи подаденият файл · от СЪЩОТО място, което ги пише в XML-а.
   *
   * Обещанието на ADR-030 §4 е, че имена не напускат устройството; одитният
   * файл е изричното изключение. Изключение, което не се ВИЖДА поименно, е
   * само обещание с дупка — затова списъкът излиза оттук, а не се пресмята
   * втори път на екрана (правило 17).
   */
  readonly imenata: readonly ImeVFayla[];
}

/** Първият и последният ден на периода — `SelectionCriteria` ги иска. */
function obhvat(period: Period): { ot: string; doo: string } {
  const [g, m] = period.split('-').map(Number);
  return {
    ot: `${period}-01`,
    doo: `${period}-${String(dniVMeseca(g!, m!)).padStart(2, '0')}`,
  };
}

/** Едно име за описа „какво напуска" · ЕИК-ът решава пълно ли заминава. */
function imeVFayla(vid: ImeVFayla['vid'], k: Kontragent): ImeVFayla {
  return Object.freeze({ vid, ime: k.ime, sEIK: k.eik !== '' });
}

/** Контрагентът по име · празен запис, когато още не е вписан. */
function nameriKontragenta(o: Ogledalo, ime: string, vid: Kontragent['vid']): Kontragent {
  return (
    o.kontragenti.get(klyuchNaKontragent(ime)) ?? {
      vid,
      ime,
      eik: '',
      ddsNomer: '',
      adres: '',
      grad: '',
      poshtenskiKod: '',
      darzhava: '',
    }
  );
}

/**
 * Адресът · един елемент, три вида контрагент, едно място.
 *
 * Написан поотделно за фирмата, клиентите и доставчиците, той се разминава при
 * първата поправка — и НАП получава три различни форми на един и същ адрес.
 */
function adresXML(k: Kontragent): string {
  return (
    '<Address>' +
    el('StreetName', k.adres) +
    el('City', k.grad) +
    el('PostalCode', k.poshtenskiKod) +
    el('Country', k.darzhava || SHEMA.darzhava) +
    '</Address>'
  );
}

function kontragentXML(etiket: string, k: Kontragent, smetka: string): string {
  return (
    `<${etiket}>` +
    el(`${etiket}ID`, klyuchNaKontragent(k.ime)) +
    el('AccountID', smetka) +
    el('Name', k.ime) +
    (k.eik ? el('RegistrationNumber', k.eik) : '') +
    (k.ddsNomer ? el('TaxRegistrationNumber', k.ddsNomer) : '') +
    adresXML(k) +
    `</${etiket}>`
  );
}

/**
 * ЕДНА ФАКТУРА · продажба и покупка се пишат с ЕДИН израз.
 *
 * Дотук двата блока стояха дословно еднакви, различни само по четири думи:
 * `CustomerID`/`SupplierID`, сметката, посоката на сумата и откъде идват
 * числата. Обходът за чистота (`npm run chistota`) ги хвана.
 *
 * Разликата НЕ е козметична: този блок носи разбивката на ДДС-то, а тя трябва
 * да е една и съща и от двете страни. Поправена на едното място, тя щеше да
 * остави другото — и файлът щеше да декларира различна аритметика за продажба
 * и за покупка.
 */
interface EdnaFaktura {
  readonly nomer: string;
  readonly data: string;
  readonly strana: 'CustomerID' | 'SupplierID';
  readonly kontragent: string;
  readonly smetka: string;
  readonly opis: string;
  readonly posoka: 'DebitAmount' | 'CreditAmount';
  readonly obshta_st: number;
  readonly stavka: number;
  readonly vidDokument: string;
}

function fakturaXML(f: EdnaFaktura): string {
  const razbivka = ddsOtObshta(f.obshta_st, f.stavka);
  return (
    '<Invoice>' +
    el('InvoiceNo', f.nomer) +
    el('InvoiceDate', f.data) +
    el('InvoiceType', f.vidDokument) +
    el(f.strana, f.kontragent) +
    '<Line>' +
    el('LineNumber', '1') +
    el('AccountID', f.smetka) +
    el('Description', f.opis) +
    el(f.posoka, sumaXML(razbivka.osnova_st)) +
    '<Tax>' +
    el('TaxType', 'VAT') +
    el('TaxCode', String(f.stavka)) +
    el('TaxPercentage', String(f.stavka)) +
    el('TaxAmount', sumaXML(razbivka.dds_st)) +
    '</Tax>' +
    '</Line>' +
    '<DocumentTotals>' +
    el('TaxPayable', sumaXML(razbivka.dds_st)) +
    el('NetTotal', sumaXML(razbivka.osnova_st)) +
    el('GrossTotal', sumaXML(f.obshta_st)) +
    '</DocumentTotals>' +
    '</Invoice>'
  );
}

/**
 * ФАЙЛЪТ за един период · и всичко, което го пази.
 *
 * Статиите НЕ се смятат втори път тук: идват от `glavnaKniga`, която вече ги е
 * уравновесила. Втора сметка на същото число е втори дом (правило 17) и се
 * разминава при първата поправка на едната страна.
 */
export function safT(
  o: Ogledalo,
  period: Period,
  kogato: string,
  shema: Shema = SHEMA,
): RezultatSAFT {
  proveriShema(shema);

  const kniga = glavnaKniga(o, period, kogato);
  const { ot, doo } = obhvat(period);

  const firma = nameriKontragenta(o, [...o.kontragenti.values()].find((k) => k.vid === 'firma')?.ime ?? '', 'firma');

  const vzemaniya = [...o.vzemaniya.values()].filter((v) => v.period === period);
  const plashtaniya = [...o.plashtaniya.values()].filter((p) => p.data.slice(0, 7) === period);
  const razhodi = razhodiZaPerioda(o, period);
  const pokupki = razhodi.filter((r) => r.potok === 'fakturi');

  // ── контрагентите, които ТОЗИ месец докосва · не целият указател ─────────
  const klienti = new Map<string, Kontragent>();
  for (const v of vzemaniya) {
    const ime = o.naemi.get(v.naemId)?.naemetel ?? '';
    if (ime) klienti.set(klyuchNaKontragent(ime), nameriKontragenta(o, ime, 'klient'));
  }
  const dostavchitsi = new Map<string, Kontragent>();
  for (const r of razhodi) {
    if (r.dostavchik) dostavchitsi.set(klyuchNaKontragent(r.dostavchik), nameriKontragenta(o, r.dostavchik, 'dostavchik'));
  }

  // ── ПРЕЧКИТЕ · какво спира подаването, казано с думи ─────────────────────
  const prechki: string[] = [...prechkiOtShemata(shema)];
  if (firma.ime === '') {
    prechki.push('Данните на фирмата не са вписани — файлът няма кой да го подава.');
  } else {
    const lipsva = kakvoLipsva(firma);
    if (lipsva.length > 0) {
      prechki.push(`На фирмата липсва: ${lipsva.join(' · ')}.`);
    }
  }
  const bezNomer = [...klienti.values(), ...dostavchitsi.values()].filter((k) => k.eik === '');
  if (bezNomer.length > 0) {
    prechki.push(
      `${bezNomer.length} контрагент${bezNomer.length === 1 ? '' : 'а'} без ЕИК: ` +
        `${bezNomer.map((k) => k.ime).join(' · ')}.`,
    );
  }
  const nemapnati = kniga.nemapnati;
  if (nemapnati.length > 0) {
    prechki.push(
      `${nemapnati.length} сметки още нямат код по националния сметкоплан: ` +
        `${nemapnati.map((s) => s.nomer).join(' · ')}.`,
    );
  }
  if (!kniga.nared) {
    prechki.push('Главната книга не затваря — сверката вътре в нея казва къде.');
  }
  // Пропуснат източник НЕ е дефект (нула не мести пари), но НЕ се премълчава:
  // цял ден работа, записана с нулеви суми, изглежда като празен месец.
  if (kniga.bezDvizhenie > 0) {
    prechki.push(
      `${kniga.bezDvizhenie} запис${kniga.bezDvizhenie === 1 ? '' : 'а'} не мест${
        kniga.bezDvizhenie === 1 ? 'и' : 'ят'
      } пари (нулева или повредена сума) и не раждат статия — провери ги, преди да подадеш.`,
    );
  }

  // ── HEADER ───────────────────────────────────────────────────────────────
  const header =
    '<Header>' +
    el('AuditFileVersion', shema.versiya) +
    el('AuditFileCountry', shema.darzhava) +
    el('AuditFileDateCreated', kogato.slice(0, 10)) +
    el('SoftwareCompanyName', SOFTUER.proizvoditel) +
    el('SoftwareID', SOFTUER.ime) +
    '<Company>' +
    el('RegistrationNumber', firma.eik) +
    el('Name', firma.ime) +
    adresXML(firma) +
    (firma.ddsNomer ? el('TaxRegistrationNumber', firma.ddsNomer) : '') +
    '</Company>' +
    el('DefaultCurrencyCode', shema.valuta) +
    '<SelectionCriteria>' +
    el('SelectionStartDate', ot) +
    el('SelectionEndDate', doo) +
    el('PeriodStart', period.slice(5)) +
    el('PeriodStartYear', period.slice(0, 4)) +
    '</SelectionCriteria>' +
    el('HeaderComment', `Месечен файл за ${period}`) +
    '</Header>';

  // ── MASTERFILES ──────────────────────────────────────────────────────────
  const smetki =
    '<GeneralLedgerAccounts>' +
    SMETKOPLAN.map(
      (s) =>
        '<Account>' +
        el('AccountID', s.nomer) +
        el('AccountDescription', s.ime) +
        (s.nra ? el('StandardAccountID', s.nra) : '') +
        '</Account>',
    ).join('') +
    '</GeneralLedgerAccounts>';

  const masterFiles =
    '<MasterFiles>' +
    smetki +
    '<Customers>' +
    [...klienti.values()].map((k) => kontragentXML('Customer', k, '411')).join('') +
    '</Customers>' +
    '<Suppliers>' +
    [...dostavchitsi.values()].map((k) => kontragentXML('Supplier', k, '401')).join('') +
    '</Suppliers>' +
    '<TaxTable>' +
    STAVKI.map(
      (s) =>
        '<TaxTableEntry>' +
        el('TaxType', 'VAT') +
        el('Description', `ДДС ${s}%`) +
        '<TaxCodeDetails>' +
        el('TaxCode', String(s)) +
        el('TaxPercentage', String(s)) +
        el('Country', shema.darzhava) +
        '</TaxCodeDetails>' +
        '</TaxTableEntry>',
    ).join('') +
    '</TaxTable>' +
    '</MasterFiles>';

  // ── GENERALLEDGERENTRIES ─────────────────────────────────────────────────
  const poDnevnik = new Map<string, typeof kniga.statii>();
  for (const s of kniga.statii) {
    poDnevnik.set(s.dnevnik, [...(poDnevnik.get(s.dnevnik) ?? []), s]);
  }

  const dnevnitsi = [...poDnevnik.entries()]
    .map(([vid, statii]) => {
      const transakcii = statii
        .map((s) => {
          const redove = s.redove
            .map(
              (r, i) =>
                '<Line>' +
                el('RecordID', `${s.id}-${i + 1}`) +
                el('AccountID', r.smetka) +
                el('SystemEntryDate', s.data) +
                el('Description', r.opis) +
                `<${r.strana === 'debit' ? 'DebitAmount' : 'CreditAmount'}>` +
                el('Amount', sumaXML(r.suma_st)) +
                `</${r.strana === 'debit' ? 'DebitAmount' : 'CreditAmount'}>` +
                '</Line>',
            )
            .join('');
          return (
            '<Transaction>' +
            el('TransactionID', s.id) +
            el('TransactionDate', s.data) +
            el('Description', s.opis) +
            el('SystemEntryDate', s.data) +
            redove +
            '</Transaction>'
          );
        })
        .join('');
      return (
        '<Journal>' +
        el('JournalID', vid) +
        el('Description', IMENA_NA_DNEVNITSITE[vid as keyof typeof IMENA_NA_DNEVNITSITE] ?? vid) +
        transakcii +
        '</Journal>'
      );
    })
    .join('');

  const statiiXML =
    '<GeneralLedgerEntries>' +
    el('NumberOfEntries', String(kniga.statii.length)) +
    el('TotalDebit', sumaXML(kniga.debit_st)) +
    el('TotalCredit', sumaXML(kniga.kredit_st)) +
    dnevnitsi +
    '</GeneralLedgerEntries>';

  // ── SOURCEDOCUMENTS ──────────────────────────────────────────────────────
  const prodazhbi = vzemaniya.map((v) => {
    const naem = o.naemi.get(v.naemId);
    return fakturaXML({
      nomer: v.id,
      data: v.padezh,
      strana: 'CustomerID',
      kontragent: klyuchNaKontragent(naem?.naemetel ?? ''),
      smetka: '703',
      opis: `${v.osnovanie} · ${v.period}`,
      posoka: 'CreditAmount',
      obshta_st: v.nachisleno_st,
      stavka: stavkaNaReda(naem?.sektor),
      vidDokument: kod(shema.vidoveDokument, 'faktura'),
    });
  });

  const pokupkiXML = pokupki.map((r) =>
    fakturaXML({
      nomer: r.dokument || r.id,
      data: r.data,
      strana: 'SupplierID',
      kontragent: klyuchNaKontragent(r.dostavchik),
      smetka: '602',
      opis: r.opis,
      posoka: 'DebitAmount',
      obshta_st: r.suma_st,
      stavka: stavkaNaReda(r.sektor, r.stavka),
      vidDokument: kod(shema.vidoveDokument, 'faktura'),
    }),
  );

  const plashtaniyaXML = plashtaniya.map((p) => {
    const vzemane = o.vzemaniya.get(p.vzemaneId);
    return (
      '<Payment>' +
      el('PaymentRefNo', p.id) +
      el('TransactionDate', p.data) +
      el('PaymentMethod', kod(shema.nachiniNaPlashtane, p.nachin)) +
      '<Line>' +
      el('LineNumber', '1') +
      el('SourceDocumentID', vzemane?.id ?? '') +
      el('DebitAmount', sumaXML(p.suma_st)) +
      '</Line>' +
      '<DocumentTotals>' +
      el('GrossTotal', sumaXML(p.suma_st)) +
      '</DocumentTotals>' +
      '</Payment>'
    );
  });

  const sborNa = (redove: readonly { suma_st: number }[]) =>
    redove.reduce((s, r) => s + r.suma_st, 0);

  const izvori =
    '<SourceDocuments>' +
    '<SalesInvoices>' +
    el('NumberOfEntries', String(prodazhbi.length)) +
    el('TotalDebit', sumaXML(0)) +
    el('TotalCredit', sumaXML(sborNa(vzemaniya.map((v) => ({ suma_st: v.nachisleno_st }))))) +
    prodazhbi.join('') +
    '</SalesInvoices>' +
    '<PurchaseInvoices>' +
    el('NumberOfEntries', String(pokupkiXML.length)) +
    el('TotalDebit', sumaXML(sborNa(pokupki))) +
    el('TotalCredit', sumaXML(0)) +
    pokupkiXML.join('') +
    '</PurchaseInvoices>' +
    '<Payments>' +
    el('NumberOfEntries', String(plashtaniyaXML.length)) +
    el('TotalDebit', sumaXML(sborNa(plashtaniya))) +
    el('TotalCredit', sumaXML(0)) +
    plashtaniyaXML.join('') +
    '</Payments>' +
    '</SourceDocuments>';

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<AuditFile xmlns="${ekvXML(shema.prostranstvo)}">` +
    header +
    masterFiles +
    statiiXML +
    izvori +
    '</AuditFile>';

  // ── СВЕРКАТА ВХОД↔ИЗХОД · брои се ВЪВ ФАЙЛА, не в намерението ────────────
  const dnevnik = new DnevnikNaSverki();
  const broiVav = (etiket: string) => (xml.match(new RegExp(`<${etiket}>`, 'g')) ?? []).length;

  dnevnik.zapishi(
    sverka(`SAF-T ${period} · статии ↔ Transaction във файла`, kniga.statii.length, broiVav('Transaction'), kogato, MERKA.broy),
  );
  dnevnik.zapishi(
    sverka(`SAF-T ${period} · редове на статии ↔ Line в дневниците`,
      kniga.statii.reduce((s, st) => s + st.redove.length, 0),
      broiVav('Line') - prodazhbi.length - pokupkiXML.length - plashtaniyaXML.length,
      kogato,
      MERKA.broy,
    ),
  );
  dnevnik.zapishi(
    sverka(`SAF-T ${period} · вземания ↔ Invoice в продажбите`, vzemaniya.length, prodazhbi.length, kogato, MERKA.broy),
  );
  dnevnik.zapishi(
    sverka(`SAF-T ${period} · фактури ↔ Invoice в покупките`, pokupki.length, pokupkiXML.length, kogato, MERKA.broy),
  );
  dnevnik.zapishi(
    sverka(`SAF-T ${period} · плащания ↔ Payment`, plashtaniya.length, plashtaniyaXML.length, kogato, MERKA.broy),
  );
  dnevnik.zapishi(
    sverka(`SAF-T ${period} · дебит ↔ кредит във файла`, kniga.debit_st, kniga.kredit_st, kogato, MERKA.pari),
  );

  return {
    period,
    xml,
    ime: `SAF-T-${firma.eik || 'bez-eik'}-${period}.xml`,
    kniga,
    sverki: dnevnik.vsichki,
    nared: dnevnik.nezatvoreni.length === 0 && kniga.nared,
    prechki: Object.freeze(prechki),
    broiStatii: kniga.statii.length,
    broiProdazhbi: prodazhbi.length,
    broiPokupki: pokupkiXML.length,
    broiPlashtaniya: plashtaniyaXML.length,
    imenata: Object.freeze([
      ...(firma.ime === '' ? [] : [imeVFayla('firma', firma)]),
      ...[...klienti.values()].map((k) => imeVFayla('klient', k)),
      ...[...dostavchitsi.values()].map((k) => imeVFayla('dostavchik', k)),
    ]),
  };
}
