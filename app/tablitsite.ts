/**
 * РЕГИСТЪРЪТ НА ТАБЛИЦИТЕ · всички хедъри на програмата, на едно място (И103).
 *
 * Негови думи, 27.08: „от там се дават и ХЕДЪРИТЕ НА ВСИЧКИ ТАБЛИЦИ с имена и
 * подредени както са по табовете в менюто."
 *
 * Дотук матрицата „Кой какво вижда" знаеше САМО вносните хедъри (`o.modeli`) —
 * онези, които идват от файл през Редактора. Вградените таблици на програмата
 * (Имоти · Наеми · Вземания · Плащания · Разходи · Обекти) изобщо ги нямаше в
 * нея: не можеше да се скрие нито една тяхна колона от никого. „Всички
 * таблици" беше наполовина вярно.
 *
 * ═══ ЗАЩО ИМЕНАТА НА КОЛОНИТЕ НЕ СЕ ПРЕПИСВАТ ТУК ═══
 *
 * Правило 17: един факт, един дом. Домът на „как се казва колоната" е екранът,
 * който я рисува — `koloniNaImotite` и петте ѝ посестрими. Този файл ги ВИКА и
 * чете `ime`; втори списък с имена щеше да се разминае при първото
 * преименуване, и матрицата щеше да раздава права върху колона с друго име.
 *
 * Затова тук се описва САМО онова, което екранът не знае за себе си: на кой таб
 * стои таблицата и кои са СМЕТНАТИТЕ ѝ колони.
 *
 * ═══ КОЯ КОЛОНА Е ЗАТВОРЕНА · един критерий, не усет ═══
 *
 * ЗАТВОРЕНА е колоната, чиято стойност се СМЯТА или се тегли от ДРУГА същност —
 * тоест няма едно поле, в което да се запише обратно. „Наем / мес." при Имоти е
 * сбор на живите наеми; „Състояние" се смята; „Имот" при Наемите идва от
 * картата на имотите. Такава колона не се редактира от никого, колкото и висока
 * да е ролята (`src/domein/kolonno.ts`, правило 1 от шапката му).
 *
 * ═══ КЛЮЧЪТ · защо вградените носят представка ═══
 *
 * Правото се записва на двойката (служител, КЛЮЧ НА ТАБЛИЦА). Вносният хедър
 * носи ключа, който човекът му е дал („Банка ОББ"), и той НЕ се пипа — инак
 * вече раздадените права биха се откачили от таблицата си. Вградените получават
 * `vgraden:` отпред, за да не може ръчно кръстен хедър да им отнеме правата.
 *
 */

import { koloniNaImotite, koloniNaNaemite } from './imoti.js';
import { KOLONI_SESII } from './zhurnalat.js';
import { koloniNaVzemaniyata, koloniNaPlashtaniyata } from './pari.js';
import { KOLONI_RAZHODI } from './smetki.js';
import { koloniNaObektite } from './stoynost.js';
import { koloniNaProdazhbite } from './prodazhbi.js';
import { koloniNaDelata } from './gant.js';
import type { Ogledalo } from '../src/ogledalo/ogledalo.js';
import type { TablitsaSHedar } from '../src/domein/hedari-po-tabove.js';
import { eVgradenKlyuch } from '../src/domein/dobavki.js';

/** Колкото регистърът чете от един описател — име и нищо повече. */
interface SamoIme {
  readonly ime: string;
}

/**
 * ВГРАДЕНИТЕ · ключ · име · таб · сметнати колони. Броят им го БРОИ тестът
 * (`tests/tablitsite.test.ts`), не тази шапка — тя вече излъга веднъж.
 *
 * Редът е редът на екраните; вътре в екрана — редът, в който таблиците стоят
 * една под друга. Той е и редът в матрицата, защото човек ги търси там, където
 * ги гледа.
 */
interface VgradenaTablitsa {
  readonly klyuch: string;
  readonly ime: string;
  readonly ekran: string;
  readonly zatvoreni: readonly number[];
  readonly koloni: (o: Ogledalo) => readonly SamoIme[];
}

const VGRADENI: readonly VgradenaTablitsa[] = Object.freeze<VgradenaTablitsa[]>([
  {
    klyuch: 'vgraden:imoti',
    ime: 'Имоти',
    ekran: 'imoti',
    // „Място и единица" слепва две полета · „Наемател" и „Наем / мес." идват от
    // наемите · „Състояние" се смята от техния брой.
    zatvoreni: [0, 1, 3, 4],
    koloni: () => koloniNaImotite(new Map()),
  },
  {
    klyuch: 'vgraden:naemi',
    ime: 'Наеми',
    ekran: 'imoti',
    // „Имот" идва от картата на имотите · „Сектор" е името от акумулатора ·
    // „Състояние" се смята от `prekraten`.
    zatvoreni: [1, 4, 6],
    koloni: (o) => koloniNaNaemite(o),
  },
  {
    klyuch: 'vgraden:vzemaniya',
    ime: 'Вземания',
    ekran: 'pari',
    // „Наемател и имот" идва от две чужди същности · „Остатък" е сметка.
    zatvoreni: [0, 3],
    koloni: (o) => koloniNaVzemaniyata(o),
  },
  {
    klyuch: 'vgraden:plashtaniya',
    ime: 'Плащания',
    ekran: 'pari',
    // „Срещу" сочи вземането — то живее другаде.
    zatvoreni: [1],
    koloni: (o) => koloniNaPlashtaniyata(o),
  },
  {
    klyuch: 'vgraden:razhodi',
    ime: 'Разходи',
    ekran: 'smetki',
    // „Поток" и „Сектор" са имена от номенклатура · „ДДС" е сметка от общата.
    zatvoreni: [1, 2, 4],
    koloni: () => KOLONI_RAZHODI,
  },
  {
    klyuch: 'vgraden:prodazhbi',
    ime: 'Продажби',
    ekran: 'prodazhbi',
    // „Обект" и „Място" идват от имота · „проверка" е сметка (`prodazhbi.ts`).
    // Числата са ЕДНИ И СЪЩИ с `ZATVORENI` там — оттам ги чете и екранът.
    zatvoreni: [0, 1, 13],
    koloni: (o) => koloniNaProdazhbite(o),
  },
  {
    klyuch: 'vgraden:dela',
    ime: 'Дела · Управление',
    ekran: 'gant',
    // НИТО ЕДНА затворена: мястото, делото, обектът и отговорникът са полета на
    // самото дело — човек ги пише, нищо не се смята и нищо не се пренася.
    zatvoreni: [],
    koloni: () => koloniNaDelata(),
  },
  {
    klyuch: 'vgraden:obekti',
    ime: 'Обекти · Стойност на състояние',
    ekran: 'stoynost',
    // „Етаж · вид" слепва две полета · трите оценки ги смята Калкулаторът.
    zatvoreni: [1, 6, 7, 8],
    koloni: () => koloniNaObektite(),
  },
  {
    klyuch: 'vgraden:zhurnal',
    ime: 'Журналът · сесии',
    ekran: 'nastroyki',
    // ВСИЧКИ кодови колони са производни от подписаните полета на събитието —
    // в тях не пише никой (резен 82); добавките на Стопанина идват отзад.
    zatvoreni: [0, 1, 2, 3, 4],
    koloni: () => KOLONI_SESII,
  },
]);

/**
 * ВСИЧКИ таблици с хедър · вградените първо, вносните след тях.
 *
 * Вносните идват втори нарочно: вградените ги има при всеки, откакто програмата
 * съществува, и човек ги търси на познатото им място. Новият хедър застава
 * накрая на своя таб, както новият екран застава накрая на лентата (ADR-066).
 */
export function tablitsiteNaProgramata(o: Ogledalo): readonly TablitsaSHedar[] {
  const vgradeni: TablitsaSHedar[] = VGRADENI.map((v) => {
    // ДОБАВКИТЕ НА СТОПАНИНА (резен 79) · наслагваемият модел със същия ключ
    // носи САМО добавените колони — те се долепят след кодовите, а неговите
    // затворени номера се отместват с броя на кодовите. Затова редът му НЕ
    // влиза при вносните долу: същият ключ на две места е двойник в матрицата.
    const dobavki = o.modeli.get(v.klyuch);
    // Новото име на кодова колона (резен 80) бие кръщелното при показване;
    // липсващ запис значи името от кода.
    const kodovi = v.koloni(o).map((k, i) => dobavki?.imenaNaKodovite?.[i] ?? k.ime);
    return {
      klyuch: v.klyuch,
      ime: v.ime,
      ekran: v.ekran,
      glavi: dobavki ? [...kodovi, ...dobavki.glavi] : kodovi,
      zatvoreni: dobavki
        ? [...v.zatvoreni, ...dobavki.zatvoreni.map((z) => z + kodovi.length)]
        : v.zatvoreni,
    };
  });

  const vnosni: TablitsaSHedar[] = [...o.modeli.values()]
    .filter((m) => !eVgradenKlyuch(m.klyuch))
    .map((m) => ({
      klyuch: m.klyuch,
      ime: m.klyuch,
      // Хедър без отговор на въпроса „на кой таб стоиш" пада в последната
      // група — преброен и назован, не скрит (`hedari-po-tabove.ts`).
      ekran: m.ekran ?? '',
      glavi: m.glavi,
      zatvoreni: m.zatvoreni,
    }));

  return Object.freeze([...vgradeni, ...vnosni]);
}

/**
 * ВГРАДЕНА ЛИ Е · вградената таблица няма поле „таб", защото се ражда в кода.
 * Падащото меню за таб се показва само при вносните — избор, който не действа,
 * се КАЗВА, а не се рисува мъртъв (правило 15).
 */
export function eVgradena(klyuch: string): boolean {
  return VGRADENI.some((v) => v.klyuch === klyuch);
}

/** Името на вградена по ключ · домът на имената е този регистър (правило 17). */
export function imeNaVgradena(klyuch: string): string {
  return VGRADENI.find((v) => v.klyuch === klyuch)?.ime ?? klyuch;
}

/**
 * КРЪЩЕЛНИТЕ имена на кодовите колони на една вградена — както кодът ги е
 * дал, БЕЗ преименуванията. Редакторът ги показва до новото име и ги подава
 * на `preimenuvayKodova` за обхвата и сблъсъка (резен 80).
 */
export function kodoviteGlaviNa(klyuch: string, o: Ogledalo): readonly string[] {
  const v = VGRADENI.find((x) => x.klyuch === klyuch);
  return v ? v.koloni(o).map((k) => k.ime) : [];
}
