/**
 * ПРЕДИЗБРАНИЯТ ИМОТ · памет на модула, не на хранилището (резен 100 · ADR-164).
 *
 * Дръжката от менюто на Имота отваря друг екран с ПРЕДВАРИТЕЛНО избран Имот.
 * Името на Имота е ДАННИ, а паметта на екрана (`pamet-ekran.ts`) е само за
 * погледи — „Данни не влизат никога". Затова предизборът живее тук, в паметта
 * на модула, като `predlozhenoDarvo` в Имоти: задава се преди прерисуване,
 * чете се ВЕДНЪЖ при рисуване и се забравя. Презареждане го губи — и това е
 * вярно: предизборът е движение на ръката, не решение.
 */

export interface Predizbor {
  readonly imot: string;
  /** единицата на Обекта · само когато дръжката е от реда на Обекта */
  readonly obekt: string;
}

let predizbran: { readonly ekran: string; readonly izbor: Predizbor } | null = null;

export function predizberi(ekran: string, izbor: Predizbor): void {
  predizbran = { ekran, izbor };
}

/**
 * ЧЕТЕ, БЕЗ ДА ЗАБРАВЯ · само екранът, за който е предизбрано, го получава.
 *
 * Първата версия забравяше при първото четене — и предизборът изчезваше,
 * защото екранът се рисува повече от веднъж между дръжката и окото (наум за
 * менютата, после наистина). Затова предизборът ОСТАВА, докато човекът е на
 * този екран: второ дело за същия Имот тръгва с Имота вече вписан. Забравя
 * се, щом се нарисува ДРУГ екран (`otbelezhiEkrana`).
 */
export function vzemiPredizbraniya(ekran: string): Predizbor | null {
  return predizbran && predizbran.ekran === ekran ? predizbran.izbor : null;
}

/** Вика се при всяко рисуване · чужд екран значи, че ръката е отишла другаде. */
export function otbelezhiEkrana(ekran: string): void {
  if (predizbran && predizbran.ekran !== ekran) predizbran = null;
}
