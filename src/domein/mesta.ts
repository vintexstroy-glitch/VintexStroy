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
      'Мястото няма име. Името е и адресът му — делата сочат мястото по име, ' +
        'значи безименно място не може да се свърже с нищо.',
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
  readonly seq: number;
  readonly kogato: string;
  readonly koy: string;
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
  /** колко ЖИВИ дела стоят на това място */
  readonly dela: number;
  /** КОЙ е записал мястото · извършващият действието (И124 т.7 · правило 14) */
  readonly koy: string;
}

/**
 * САМО ЗАРЕДЕНИТЕ МЕСТА (И124 т.7 · резен 77 · ADR-134).
 *
 * Негова дума, 31.08: „Тук се появяват само заредените обекти и отговорник е
 * този който извършва действието." Тя надживя избора от резен 31, който
 * показваше и само-срещаните по делата с белег „още не е записано" —
 * последната дума бие (правило 28); надживеният избор е записан с датата си
 * в ADR-134. Броят на делата ПАК се смята от живите дела — той е поглед,
 * не запис.
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

  return Object.freeze(
    [...o.mesta.keys()].sort().map((k) => {
      const zapis = o.mesta.get(k)!;
      return Object.freeze({
        ime: zapis.ime,
        firma: zapis.firma,
        papka: zapis.papka,
        dela: broy.get(k) ?? 0,
        koy: zapis.koy,
      });
    }),
  );
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът са ЗАПИСАНИТЕ места в Огледалото; изходът е дължината на списъка.
 * Място, изгубено по пътя, значи запис, който екранът не показва никъде.
 */
export function sveriMestata(
  o: Ogledalo,
  zhiviDela: readonly { readonly myasto: string }[],
  kogato: string,
): Sverka {
  return sverka(
    'местата · записаните',
    o.mesta.size,
    mestata(o, zhiviDela).length,
    kogato,
    MERKA.broy,
  );
}
