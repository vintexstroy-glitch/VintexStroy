/**
 * МЯСТОТО СТАВА ЗАПИС · отговорник-ФИРМА и папка на проекта (резен 31).
 *
 * ═══ ЕДНО НЕГОВО ИЗРЕЧЕНИЕ, ДВА РЕДА ОТ ОПИСА ═══
 *
 * „На нивото на проекта дай **линк към папката с проекта**, а за всяка задача
 * дай в мястот за линк връзка с документ ако има нужда задачата от такъв."
 * *(р48·[42])*
 *
 * „в таблицата за отговорник напиши **фирмата която управлява проекта**"
 * *(р48·[42])*
 *
 * И до тях, от следващия ден, границата: „за задачите сме ние тримата които ни
 * знаеш Николай Петков, Ивайло Петков и Тихоми Иванов" *(р48·[44])* — тоест
 * отговорникът на ДЕЛОТО е ЧОВЕК.
 *
 * ═══ ДВА ОТГОВОРНИКА, КОИТО НЕ СЕ СМЕСВАТ ═══
 *
 *   МЯСТОТО (проектът) · отговорникът е ФИРМА — тя го управлява;
 *   ДЕЛОТО (задачата)  · отговорникът е ЧОВЕК — той я върши.
 *
 * `dela.ts` носеше бележката „човек, не фирма — фирмата е отговорник на
 * МЯСТОТО" от резен 12б насам. Решението стоеше в кода като коментар, но поле
 * за него нямаше: мястото беше само ДУМА в делото.
 *
 * ═══ КЛЮЧЪТ Е ИМЕТО, И ТОВА НЕ СЕ МЕНИ ═══
 *
 * Делата сочат мястото по ИМЕ от първия ден (`Delo.myasto`). Ключ-id щеше да
 * иска пренаписване на всяко вече записано дело — тоест смяна на смисъла им
 * назад във времето (правило 1). Затова мястото се адресира със сведеното си
 * име, а свързването е по същото свеждане.
 */

import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';
import type { PayloadMyastoZapisano } from './sabitiya.js';
import type { SastoyanieNaImot } from './sastoyaniya-na-imot.js';

/**
 * СВЕДЕНОТО ИМЕ · за адреса и за свързването.
 *
 * NFC го прави Вратата (правило 12); тук падат само крайните интервали и
 * регистърът. „Малинова Долина" и „малинова долина " са ЕДНО място — инак
 * човек би получил две реда за едно и също и нито един от тях пълен.
 */
export function svedenotoMyasto(ime: string): string {
  return ime.trim().toLocaleLowerCase('bg-BG');
}

/** Адресът на същността · `MST:<сведено име>`. */
export function sashtnostNaMyastoto(ime: string): string {
  return `MST:${svedenotoMyasto(ime)}`;
}

export class GreshkaMyasto extends Error {
  constructor(kakvo: string) {
    super(kakvo);
    this.name = 'GreshkaMyasto';
  }
}

/**
 * ПРОВЕРКАТА при Вратата · какво НЕ се записва.
 *
 * Празно име е единственият отказ. Фирмата и папката са ПО ИЗБОР: мястото има
 * смисъл и само с име (то е онова, което делата вече ползват), а поле, което
 * човек е принуден да измисли, се пълни с боклук и после се брои като данни.
 */
export function proveriMyastoto(ime: string): string {
  const t = ime.trim();
  if (t === '') {
    throw new GreshkaMyasto(
      'Имотът няма име. Името е и адресът му — делата сочат имота по име, ' +
        'значи безименен имот не може да се свърже с нищо.',
    );
  }
  return t;
}

export interface Myasto {
  /** името, ДОСЛОВНО както го е написал човекът */
  readonly ime: string;
  /** ФИРМАТА, която управлява проекта · празно значи „още не е казана" */
  readonly firma: string;
  /** линк към папката на проекта в Драйва · по избор */
  readonly papka: string;
  /** СТОЙНОСТТА · цели центове · нула значи „още не е казана" (резен 99) */
  readonly stoynost_st: number;
  /** КВАДРАТУРАТА · цели кв. сантиметри · нула значи „още не е казана" */
  readonly kvadratura_kvsm: number;
  /** СЪСТОЯНИЕТО · ключ от номенклатурата · празно значи „още не е казано" */
  readonly sastoyanie: string;
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
}

/**
 * ПРОВЕРКАТА НА ТРИТЕ ПОЛЕТА · при Вратата, преди записа (резен 99 · ADR-157).
 *
 * Числата са ЦЕЛИ и не под нулата: стойността е в центове (правило 3), а
 * квадратурата — в кв. сантиметри. Дробно число тук значи, че някой е подал
 * евро вместо центове, и записано веднъж, остава завинаги (правило 1).
 *
 * Състоянието се среща със СПИСЪКА, който се подава отвън: ядрото на мястото не
 * сгъва Огледало, а Вратата вече го е прочела. Непознато състояние се отказва с
 * думи и с изброен списък — иначе менюто щеше да е надпис (правило 15).
 *
 * ЛИПСВАЩОТО поле минава непокътнато: то значи „не го пипам" и сгъването пази
 * старото. Проверява се само подаденото.
 */
export function proveriImota(
  danni: PayloadMyastoZapisano,
  sastoyaniya: readonly SastoyanieNaImot[],
): PayloadMyastoZapisano {
  const ime = proveriMyastoto(danni.ime);
  const tsyaloNadNula = (chislo: number, kakvo: string, edinitsa: string): void => {
    if (!Number.isSafeInteger(chislo) || chislo < 0) {
      throw new GreshkaMyasto(
        `${kakvo} на имота се пази в ${edinitsa} — цяло число, не под нулата. ` +
          `Дошло: „${chislo}".`,
      );
    }
  };
  if (danni.stoynost_st !== undefined) tsyaloNadNula(danni.stoynost_st, 'Стойността', 'цели центове');
  if (danni.kvadratura_kvsm !== undefined) {
    tsyaloNadNula(danni.kvadratura_kvsm, 'Квадратурата', 'цели кв. сантиметри');
  }
  if (danni.sastoyanie !== undefined && danni.sastoyanie !== '') {
    if (!sastoyaniya.some((s) => s.klyuch === danni.sastoyanie)) {
      throw new GreshkaMyasto(
        `„${danni.sastoyanie}" не е състояние на имот. Изброените са: ` +
          `${sastoyaniya.map((s) => s.klyuch).join(' · ')}. Нови се добавят от Настройки.`,
      );
    }
  }
  return { ...danni, ime };
}

/**
 * ПРОВЕРКАТА НА ОБЕКТА · адресът е ИМЕТО на неговия Имот (резен 99 · ADR-157).
 *
 * Негово, 02.09: „Обектите са само към Имот… **Обект без Имот няма**." Пазачът
 * не пита дали Имотът е ВПИСАН — той съществува по построение: адресът Е името
 * му, а списъкът на Имотите реди и изведените от обектите (`mestata`). Пази се
 * само празнотата: обект без адрес виси под безименен имот, а обект без единица
 * не се различава от съседа си на същия адрес.
 */
export function proveriObekta(
  adres: string,
  edinitsa: string,
): { readonly adres: string; readonly edinitsa: string } {
  const a = adres.trim();
  const e = edinitsa.trim();
  if (a === '') {
    throw new GreshkaMyasto(
      'Обектът няма имот. Адресът на обекта Е името на имота му — обект без имот няма.',
    );
  }
  if (e === '') {
    throw new GreshkaMyasto(
      'Обектът няма единица (ап. 4 · гараж 2). Без нея два обекта на един имот не се различават.',
    );
  }
  return { adres: a, edinitsa: e };
}

/**
 * КОЕ МЯСТО НОСИ ЕДНО ДЕЛО · и защо липсата НЕ е грешка.
 *
 * Дело с непознато място си работи както преди: местата се записват, когато
 * човек има какво да каже за тях, а не преди да си запише първото дело.
 * Обратното щеше да направи от резена вратар на вече работещ екран.
 */
export function myastotoNa(o: Ogledalo, imeNaMyastoto: string): Myasto | undefined {
  return o.mesta.get(svedenotoMyasto(imeNaMyastoto));
}

export interface RedNaMyasto {
  readonly ime: string;
  readonly firma: string;
  readonly papka: string;
  /** трите му полета · нулата и празното значат „още не е казано" (резен 99) */
  readonly stoynost_st: number;
  readonly kvadratura_kvsm: number;
  readonly sastoyanie: string;
  /** колко ЖИВИ дела стоят на този имот */
  readonly dela: number;
  /** колко ОБЕКТА носи · те са и причината редът да съществува, ако не е вписан */
  readonly obekti: number;
  /** ВПИСАН ли е · или само се извежда от обектите си (резен 99) */
  readonly vpisan: boolean;
  /** КОЙ е записал имота · извършващият действието (И124 т.7 · правило 14) */
  readonly koy: string;
}

/** Кои имена идват от ОБЕКТИТЕ · сведено име → правописът на първия и броят. */
function poObektite(o: Ogledalo): Map<string, { readonly ime: string; broy: number }> {
  const karta = new Map<string, { ime: string; broy: number }>();
  for (const i of o.imoti.values()) {
    const k = svedenotoMyasto(i.adres);
    if (k === '') continue;
    const veche = karta.get(k);
    if (veche) veche.broy += 1;
    else karta.set(k, { ime: i.adres.trim(), broy: 1 });
  }
  return karta;
}

/**
 * ИМОТИТЕ НА КНИГАТА · вписаните И изведените от обектите (резен 99 · ADR-157).
 *
 * Негова дума, 31.08: „Тук се появяват само заредените обекти и отговорник е
 * този който извършва действието." Тя надживя избора от резен 31, който
 * показваше и само-срещаните ПО ДЕЛАТА с белег „още не е записано" (ADR-134).
 * Това си остава: име, което само се среща по дела, НЕ ражда ред.
 *
 * На 03.09 обаче дойде друг източник. На въпроса какво да става със стари
 * Обекти, чийто Имот никога не е вписван: „**Няма такива. Да се пита, провери
 * или да се измисли и да може да се редактира.**" Тоест Имотът на един Обект
 * СЪЩЕСТВУВА по построение — адресът на обекта Е името му. Такъв ред влиза
 * тук с `vpisan: false`: казва се, че не е вписан (правило 15), и се довършва
 * с един запис от формата.
 *
 * Разликата между двата източника е разликата между ДУМА и ЗАПИС: делото носи
 * името като текст, а обектът виси НА имота — махнеш ли имота, обектът остава
 * без дом.
 */
export function mestata(
  o: Ogledalo,
  zhiviDela: readonly { readonly myasto: string }[],
): readonly RedNaMyasto[] {
  const broy = new Map<string, number>();
  for (const d of zhiviDela) {
    const k = svedenotoMyasto(d.myasto);
    if (k === '') continue;
    broy.set(k, (broy.get(k) ?? 0) + 1);
  }
  const obekti = poObektite(o);

  return Object.freeze(
    [...new Set([...o.mesta.keys(), ...obekti.keys()])].sort().map((k) => {
      const zapis = o.mesta.get(k);
      return Object.freeze({
        // ЗАПИСАНОТО ИМЕ БИЕ · то е написаното нарочно; правописът на обекта е
        // това, което човек е успял да напише в бързината.
        ime: zapis?.ime ?? obekti.get(k)!.ime,
        firma: zapis?.firma ?? '',
        papka: zapis?.papka ?? '',
        stoynost_st: zapis?.stoynost_st ?? 0,
        kvadratura_kvsm: zapis?.kvadratura_kvsm ?? 0,
        sastoyanie: zapis?.sastoyanie ?? '',
        dela: broy.get(k) ?? 0,
        obekti: obekti.get(k)?.broy ?? 0,
        vpisan: zapis !== undefined,
        koy: zapis?.koy ?? '',
      });
    }),
  );
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът се смята ВТОРИ ПЪТ и по друг път: записаните плюс онези адреси на
 * обекти, които нямат запис. Изходът е дължината на списъка. Имот, изгубен по
 * пътя, значи или запис, или цял обект, който екранът не показва никъде.
 */
export function sveriMestata(
  o: Ogledalo,
  zhiviDela: readonly { readonly myasto: string }[],
  kogato: string,
): Sverka {
  const bezZapis = [...poObektite(o).keys()].filter((k) => !o.mesta.has(k)).length;
  return sverka(
    'имотите · вписаните и по обектите',
    o.mesta.size + bezZapis,
    mestata(o, zhiviDela).length,
    kogato,
    MERKA.broy,
  );
}
