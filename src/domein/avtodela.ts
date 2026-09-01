/**
 * АВТО-ДЕЛАТА · вноска / преписка / среща → дело, и ЧЕРВЕНИЯТ СПИСЪК (резен 39).
 *
 * ═══ НЕГОВАТА ДУМА · дословно ═══
 *
 * „**Да — върни авто-делата (вноска/преписка/среща → дело, червен списък)**"
 * *(р65·[68] · 10.08)* — прието предложение, `docs/izvori/02-po-temi.md:687`.
 *
 * И изворът на третия: „за контактите среща добавяш с място, телефо, име, и
 * дата с час" · „**Става дело автоматично**" *(р57·[30])*.
 *
 * ═══ НАХОДКА · ЕДНАТА ТРЕТИНА ВЕЧЕ Я ИМАШЕ ═══
 *
 * Описът на дълга държеше M07 като ⬜ „нула попадения в кода" и твърдеше, че
 * „в целия `src/` и `app/` няма функция, която да ражда дело от вноска, преписка
 * или среща". За ВНОСКАТА това не беше вярно: `krediti.ts` носи секция,
 * озаглавена „АВТО-ДЕЛОТО ЗА ВНОСКАТА", с `predstoyashtiteVnoski` — построена в
 * резен 19, с неговите цитати, и показана в екрана на Кредитите.
 *
 * Тя не се пренаписва тук. Тук ѝ се дава ВТОРИЯТ читател: същият ред, застанал
 * до преписката и срещата в ЕДИН списък.
 *
 * ═══ РЕШЕНИЕТО НА РЕЗЕНА · АВТО-ДЕЛОТО СЕ СМЯТА, НЕ СЕ ЗАПИСВА ═══
 *
 * Думата му е „става дело **автоматично**" — тоест БЕЗ втори човешки запис.
 * Затова авто-делото не е събитие:
 *
 *   · записано при всяко прерисуване, то би раждало дубликат на всяко отваряне
 *     на екрана (същата бележка стои в `krediti.ts` от резен 19);
 *   · поправена преписка би оставила след себе си старото дело, а чистенето в
 *     append-only Журнал е сторно на нещо, което никой човек не е решавал
 *     (правило 1);
 *   · `opId` носи ДЕЙСТВИЕТО (правило 20), а тук няма човешко действие „роди
 *     дело" — човекът е записал преписката; делото е нейната СЯНКА.
 *
 * ЦЕНАТА, казана на глас (правило 15): авто-делото не се редактира, не получава
 * отговорник и не се маркира като завършено. Затваря се ИЗВОРЪТ му — плаща се
 * вноската, взима се преписката, провежда се срещата — и делото си отива само.
 *
 * ═══ ЗАЩО ОТДЕЛЕН ФАЙЛ ═══
 *
 * Този модул чете ТРИ различни домейна и не принадлежи на нито един: сложен в
 * `krediti.ts`, той би вкарал контактите в кредитите; сложен в `kontakti.ts` —
 * кредитите в контактите. Домът на връзката е трети.
 */

import { svetofarNaSroka, dniDoSroka, type Svetofar } from './dela.js';
import {
  predstoyashtiSreshti,
  zakachanetoNa,
  zaVzimane,
  type Prepiska,
  type Sreshta,
} from './kontakti.js';
import { planaNa, predstoyashtiteVnoski } from './krediti.js';
import { sverka, MERKA, type Sverka } from '../yadro/sverka.js';
import type { Ogledalo } from '../ogledalo/ogledalo.js';

/** ТРИТЕ ИЗВОРА · неговите три думи, в неговия ред. */
export const IZVORI_NA_AVTODELO = ['вноска', 'преписка', 'среща'] as const;
export type IzvorNaAvtodelo = (typeof IZVORI_NA_AVTODELO)[number];

export interface AvtoDelo {
  readonly izvor: IzvorNaAvtodelo;
  /** id на кредита · на преписката · на срещата — за да води редът обратно */
  readonly izvorId: string;
  /** какво пише на реда */
  readonly ime: string;
  /** с кого · отговорникът на кредита или контактът; празно се КАЗВА, не се гади */
  readonly kogo: string;
  /** срокът · YYYY-MM-DD */
  readonly do: string;
  readonly svetofar: Svetofar;
  /** колко дни остават · отрицателно значи ПРОСРОЧЕНО */
  readonly dni: number;
}

/**
 * ДОКЪДЕ НАПРЕД ГЛЕДА СПИСЪКЪТ · 45 дни, същото число като при вноските.
 *
 * Не е кръгло случайно: `predstoyashtiteVnoski` го носи от резен 19, и ако тук
 * стоеше друго, един и същ кредит щеше да влиза в единия списък и да липсва в
 * другия. Едно число, един дом.
 */
export const NAPRED_DNI = 45;

function red(
  izvor: IzvorNaAvtodelo,
  izvorId: string,
  ime: string,
  kogo: string,
  do_: string,
  dnes: string,
): AvtoDelo {
  return Object.freeze({
    izvor,
    izvorId,
    ime,
    kogo,
    do: do_,
    svetofar: svetofarNaSroka(do_, dnes),
    dni: dniDoSroka(do_, dnes),
  });
}

/**
 * ТРИТЕ ИЗВОРА В ЕДИН СПИСЪК · подредени по СРОК, не по извор.
 *
 * Подредба по извор би направила три списъка, залепени един под друг — а
 * въпросът, който човек задава сутрин, е „кое гори", не „кое е вноска".
 */
export function avtoDelata(o: Ogledalo, dnes: string): readonly AvtoDelo[] {
  const redove: AvtoDelo[] = [];

  for (const v of predstoyashtiteVnoski(o, dnes, NAPRED_DNI)) {
    redove.push(red('вноска', v.kreditId, `Вноска · ${v.ime}`, v.otgovornik, v.data, dnes));
  }

  const prepiski: readonly Prepiska[] = [...o.prepiski.values()];
  for (const p of zaVzimane(prepiski)) {
    if (dniDoSroka(p.zaVzimane, dnes) > NAPRED_DNI) continue;
    // С КОГО · ОТГОВОРНИКЪТ бие контакта (резен 41). Двамата са различни хора:
    // контактът е онзи, С КОГОТО е преписката; отговорникът — онзи, КОЙТО я
    // върши. В списък „кое гори" човек търси второто, за да знае кой да я хване.
    // Празен отговорник пада обратно на контакта — по-добре нечие име, отколкото
    // тире.
    const kogo = p.otgovornik === '' ? p.kontakt : p.otgovornik;
    // КЪДЕ · СМЯТА се от закачането, не се преписва (правило 17).
    const kade = zakachanetoNa(p, o.imoti, o.dela);
    const ime = kade.kam === '' ? p.kakvo : `${p.kakvo} · ${kade.nadpis}`;
    redove.push(red('преписка', p.id, ime, kogo, p.zaVzimane, dnes));
  }

  const sreshti: readonly Sreshta[] = [...o.sreshti.values()];
  for (const s of predstoyashtiSreshti(sreshti)) {
    if (dniDoSroka(s.data, dnes) > NAPRED_DNI) continue;
    const kade = s.adres === '' ? '' : ` · ${s.adres}`;
    redove.push(red('среща', s.id, `Среща с ${s.kontakt}${kade}`, s.kontakt, s.data, dnes));
  }

  return Object.freeze(
    redove.sort((a, b) => a.do.localeCompare(b.do) || a.ime.localeCompare(b.ime, 'bg')),
  );
}

/**
 * ЧЕРВЕНИЯТ СПИСЪК · онези, които светят червено или вече са просрочени.
 *
 * Праговете НЕ се повтарят тук: те живеят в `svetofarNaSroka` (правило 17).
 * Просроченото влиза заедно с червеното — то е същият сигнал, само по-късно.
 */
export function cherveniyatSpisak(avto: readonly AvtoDelo[]): readonly AvtoDelo[] {
  return Object.freeze(avto.filter((a) => a.svetofar === 'cherveno' || a.svetofar === 'prosrocheno'));
}

/**
 * КРЕДИТИТЕ БЕЗ ПЛАН · пропуснатите, казани поименно (правило 15).
 *
 * Планът е празен, когато вноската не стига за лихвата — тогава кредитът НЕ
 * ражда авто-дело. Мълчаливата липса щеше да изглежда като „нищо не чака" точно
 * при кредита, който е най-зле. Затова се брои и се казва.
 */
export function kreditiBezPlan(o: Ogledalo, dnes: string): readonly string[] {
  const bez: string[] = [];
  for (const k of o.krediti.values()) {
    if (planaNa(o, k, dnes).length === 0) bez.push(k.ime);
  }
  return Object.freeze(bez.sort((a, b) => a.localeCompare(b, 'bg')));
}

/**
 * СВЕРКАТА · вход↔изход, и нулата се записва (правило 7).
 *
 * ВХОД: всички живи ангажименти с дата — кредитите, преписките за взимане и
 * предстоящите срещи, БЕЗ да се гледа хоризонтът.
 * ИЗХОД: авто-делата + кредитите без план + онези, паднали ЗАД хоризонта.
 *
 * Разлика значи ангажимент, изчезнал по пътя — а изчезнал ангажимент е точно
 * онова, което списъкът съществува да не допусне.
 */
export function sveriAvtoDelata(o: Ogledalo, dnes: string, kogato: string): Sverka {
  const prepiski = zaVzimane([...o.prepiski.values()]);
  const sreshti = predstoyashtiSreshti([...o.sreshti.values()]);
  const vhod = o.krediti.size + prepiski.length + sreshti.length;

  const avto = avtoDelata(o, dnes);
  const bezPlan = kreditiBezPlan(o, dnes).length;
  const dalechni =
    prepiski.filter((p) => dniDoSroka(p.zaVzimane, dnes) > NAPRED_DNI).length +
    sreshti.filter((s) => dniDoSroka(s.data, dnes) > NAPRED_DNI).length +
    // Кредит с план, чиято първа вноска пада зад хоризонта, е също „далечен“ —
    // но само ако планът МУ Е тръгнал; инак вече е преброен в `bezPlan`.
    [...o.krediti.values()].filter((k) => {
      const plan = planaNa(o, k, dnes);
      return plan.length > 0 && dniDoSroka(plan[0]!.data, dnes) > NAPRED_DNI;
    }).length;

  return sverka(
    'авто-дела · ангажименти ↔ показани + пропуснати',
    vhod,
    avto.length + bezPlan + dalechni,
    kogato,
    MERKA.broy,
  );
}
