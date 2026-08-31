/**
 * ЖИВИЯТ ХЕДЪР · коя глава стои горе, когато страницата се скролва (M15).
 *
 * ═══ НЕГОВИТЕ ТРИ ИЗРЕЧЕНИЯ, и трите важат наведнъж ═══
 *
 * > „Има стационарни горни редове на таблиците, а когато скролваш и минаваш по
 * > различни таблици, да се сменя нов хедър; а когато караш със скрол страницата
 * > и **вече се вижда повече от половината горна таблица, да се сменя хедърът**,
 * > ако е различна таблица с различен хедър." *(р57 · 09.08)*
 *
 * > „Смяната на хедъра става при видима половина от следващата таблица? Да, но
 * > **само когато се скролва нагоре** страница; а надолу е нормално всичко."
 * > *(р57 · 09.08)*
 *
 * > „…**а когато двете таблици са от едно семейство по хедър и редакция, то си
 * > остава хедърът от първата.** Дано при скролване нагоре не се появява лаг при
 * > смяна на хедъра, а е мигновено!" *(р70 · 10.08)*
 *
 * ═══ ЗАЩО Е ЧИСТА ФУНКЦИЯ, а не код в обработчика на скрола ═══
 *
 * „Мигновено" значи БЕЗ прерисуване: на всяко движение се смятат числа и се
 * сменя ЕДИН клас. Смятането, извадено тук, се проверява с числа вместо с око —
 * половината се твърди с 0,51 и 0,49, не се гледа на екрана. И трите правила
 * стават видими на едно място, вместо да се спорят в три `if`-а из екрана.
 *
 * ═══ ЕДНА ГРАНИЦА, КАЗАНА НА ГЛАС ═══
 *
 * „Семейство по хедър И редакция" — тук се сверява ОТПЕЧАТЪКЪТ на главата.
 * Редакцията (кой какво може да пише) НЕ участва: две таблици с една глава, но с
 * различни права, ще се броят за роднини. Това е стеснение, не решение — и се
 * казва, вместо да мине за пълно (правило 15).
 */

/** Една таблица, както я вижда екранът · числата са в пиксели. */
export interface TablitsaNaEkrana {
  readonly klyuch: string;
  /** върхът ѝ спрямо горния ръб на видимото · отрицателно значи „минала е нагоре" */
  readonly gore: number;
  readonly visochina: number;
  /** отпечатъкът на ГЛАВАТА ѝ · еднакъв отпечатък значи роднини */
  readonly otpechatak: string;
}

export type Posoka = 'nadolu' | 'nagore';

/** Колко от таблицата се вижда СЕГА, в пиксели · нула, ако е извън екрана. */
export function vidimo(t: TablitsaNaEkrana, visochinaNaEkrana: number): number {
  const ot = Math.max(t.gore, 0);
  const do_ = Math.min(t.gore + t.visochina, visochinaNaEkrana);
  return Math.max(do_ - ot, 0);
}

/**
 * Вижда ли се ПОВЕЧЕ ОТ ПОЛОВИНАТА ѝ · строго повече, не „поне".
 *
 * БЕЗ ПАЗАЧ ЗА НУЛЕВА ВИСОЧИНА · той беше тук и се оказа МЪРТЪВ: `vidimo`
 * никога не надхвърля височината, тъй че при нула сравнението е `0 > 0` и вече
 * връща „не". Нарочното счупване го показа — махнах го и нищо не падна. Защита,
 * до която не се стига, крие толкова, колкото пази (урокът на група Г).
 */
export function nadPolovinata(t: TablitsaNaEkrana, visochinaNaEkrana: number): boolean {
  return vidimo(t, visochinaNaEkrana) * 2 > t.visochina;
}

/**
 * КОЯ ГЛАВА Е ЖИВА · връща ключа на таблицата, чийто хедър стои горе.
 *
 * `segashniyat` е онова, което стои в момента — при равни условия то ОСТАВА.
 * Празен низ значи „още нищо не е избрано" (първото рисуване).
 */
export function zhiviyatHedar(
  tablitsi: readonly TablitsaNaEkrana[],
  posoka: Posoka,
  visochinaNaEkrana: number,
  segashniyat = '',
): string {
  if (tablitsi.length === 0) return '';

  // КАНДИДАТЪТ · таблицата, която държи горния ръб. Тя е последната, чийто връх
  // е минал нагоре — тоест онази, върху която стои линията на залепването.
  const minali = tablitsi.filter((t) => t.gore <= 0);

  /**
   * НА САМИЯ ВРЪХ НИКОЯ НЕ ДЪРЖИ ЛИНИЯТА · тогава главата е на ПЪРВАТА, и
   * правилото за половината НЕ важи.
   *
   * НАМЕРЕНО ОТ ПРОХОДА: скролът се връщаше на нула, никоя таблица нямаше връх
   * над линията, а първата стоеше НИСКО под формата — под половин видима. Тогава
   * половината я спираше и горе оставаше главата на таблица, отдавна излязла от
   * екрана. Правилото на половината е за СЪСТЕЗАНИЕ между две таблици за линията;
   * там, където състезание няма, то няма какво да реши.
   */
  if (minali.length === 0) return tablitsi[0]!.klyuch;

  const kandidat = minali[minali.length - 1]!;

  const sega = tablitsi.find((t) => t.klyuch === segashniyat);
  if (sega === undefined) return kandidat.klyuch;
  if (kandidat.klyuch === sega.klyuch) return sega.klyuch;

  // РОДНИНИТЕ НЕ СМЕНЯТ ГЛАВА · „остава хедърът от първата".
  if (kandidat.otpechatak === sega.otpechatak) return sega.klyuch;

  // НАДОЛУ Е НОРМАЛНО ВСИЧКО · сменя се веднага, щом линията смени стопанина си.
  if (posoka === 'nadolu') return kandidat.klyuch;

  // НАГОРЕ · чака се да се види ПОВЕЧЕ ОТ ПОЛОВИНАТА на онази, която идва.
  return nadPolovinata(kandidat, visochinaNaEkrana) ? kandidat.klyuch : sega.klyuch;
}

export interface SverkaNaHedara {
  readonly vhod: number;
  readonly izhod: number;
  readonly razlika: number;
  readonly nared: boolean;
}

/**
 * СВЕРКА ВХОД↔ИЗХОД · толкова таблици влизат, толкова имат жива глава (правило 7).
 *
 * Изходът е броят на РАЗЛИЧНИТЕ живи глави при обхождане на всяка таблица като
 * „сегашна": ако функцията върне ключ, който не е между подадените, разликата
 * светва. Нулата се записва и когато няма таблици.
 */
export function sveriZhiviyaHedar(
  tablitsi: readonly TablitsaNaEkrana[],
  visochinaNaEkrana: number,
): SverkaNaHedara {
  const klyuchove = new Set(tablitsi.map((t) => t.klyuch));
  let namereni = 0;
  for (const t of tablitsi) {
    for (const posoka of ['nadolu', 'nagore'] as const) {
      const zhiv = zhiviyatHedar(tablitsi, posoka, visochinaNaEkrana, t.klyuch);
      if (klyuchove.has(zhiv)) namereni += 1;
    }
  }
  const vhod = tablitsi.length * 2;
  return { vhod, izhod: namereni, razlika: vhod - namereni, nared: vhod === namereni };
}
