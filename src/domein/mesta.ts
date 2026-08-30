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
  /** записано ли е · или само се среща по делата */
  readonly zapisano: boolean;
}

/**
 * ВСИЧКИ МЕСТА · и записаните, и онези, които само се срещат по делата.
 *
 * Вторите се показват СЪС същия ред, но с `zapisano: false` — така човек вижда
 * къде има какво да допълни, вместо мястото да го няма, докато не се сети да го
 * запише. Списък само от записаните щеше да крие точно работата.
 */
export function mestata(
  o: Ogledalo,
  zhiviDela: readonly { readonly myasto: string }[],
): readonly RedNaMyasto[] {
  const broy = new Map<string, number>();
  const dosloven = new Map<string, string>();
  for (const d of zhiviDela) {
    const k = svedenotoMyasto(d.myasto);
    if (k === '') continue;
    broy.set(k, (broy.get(k) ?? 0) + 1);
    if (!dosloven.has(k)) dosloven.set(k, d.myasto);
  }

  const klyuchove = new Set<string>([...o.mesta.keys(), ...broy.keys()]);
  const redove: RedNaMyasto[] = [];
  for (const k of [...klyuchove].sort()) {
    const zapis = o.mesta.get(k);
    redove.push(
      Object.freeze({
        // Записаното име бие: то е онова, което човекът е написал НАРОЧНО.
        ime: zapis?.ime ?? dosloven.get(k) ?? k,
        firma: zapis?.firma ?? '',
        papka: zapis?.papka ?? '',
        dela: broy.get(k) ?? 0,
        zapisano: zapis !== undefined,
      }),
    );
  }
  return Object.freeze(redove);
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * Входът са РАЗЛИЧНИТЕ места, които книгата познава (по делата и по записите);
 * изходът е дължината на списъка. Място, изгубено по пътя, значи дело, чието
 * място не се вижда никъде.
 */
export function sveriMestata(
  o: Ogledalo,
  zhiviDela: readonly { readonly myasto: string }[],
  kogato: string,
): Sverka {
  const razlichni = new Set<string>(o.mesta.keys());
  for (const d of zhiviDela) {
    const k = svedenotoMyasto(d.myasto);
    if (k !== '') razlichni.add(k);
  }
  return sverka(
    'местата · различни имена',
    razlichni.size,
    mestata(o, zhiviDela).length,
    kogato,
    MERKA.broy,
  );
}
