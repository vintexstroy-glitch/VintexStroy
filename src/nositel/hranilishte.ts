/**
 * ХРАНИЛИЩЕТО НА БРАУЗЪРА · постоянство, място, ключалка между раздели.
 *
 * IndexedDB по подразбиране е ИЗТРИВАЕМО хранилище: при натиск за място
 * браузърът има право да го махне, без да пита. За система с девиз „нула
 * загуба на данни" това не е дребен шрифт — това е дупката. Затова:
 *
 *   1. иска се постоянство (`navigator.storage.persist()`) и полученият
 *      отговор се КАЗВА на собственика, не се преглъща;
 *   2. мери се заетото място;
 *   3. Web Locks държи един-единствен писач между разделите — опашката на
 *      Вратата пази реда в един раздел, ключалката — между няколко.
 */

type Postoyanstvo = 'постоянно' | 'изтриваемо' | 'неизвестно';

export interface SastoyanieNaHranilishteto {
  readonly postoyanstvo: Postoyanstvo;
  /** заето, в байтове; -1 когато браузърът не казва */
  readonly zaeto: number;
  /** позволено, в байтове; -1 когато браузърът не казва */
  readonly pozvoleno: number;
}

/** Иска постоянство и мери мястото. Безопасно за среда без тези API-та. */
export async function osiguriHranilishte(): Promise<SastoyanieNaHranilishteto> {
  let postoyanstvo: Postoyanstvo = 'неизвестно';
  try {
    if (navigator.storage?.persist) {
      // persisted() първо — persist() пита наново само когато трябва.
      const veche = await navigator.storage.persisted();
      const dadeno = veche || (await navigator.storage.persist());
      postoyanstvo = dadeno ? 'постоянно' : 'изтриваемо';
    }
  } catch {
    postoyanstvo = 'неизвестно';
  }

  let zaeto = -1;
  let pozvoleno = -1;
  try {
    const merka = await navigator.storage?.estimate?.();
    if (merka) {
      zaeto = merka.usage ?? -1;
      pozvoleno = merka.quota ?? -1;
    }
  } catch {
    // Няма мярка — няма драма; числото просто липсва.
  }

  return { postoyanstvo, zaeto, pozvoleno };
}

/**
 * Ключалка между раздели върху Web Locks. Връща функция със сигнатурата,
 * която Вратата очаква. Където Web Locks липсва (стар браузър, тестове),
 * връща undefined — Вратата тогава разчита на повторението при сблъсък.
 */
export function klyuchalkaMezhduRazdeli():
  | (<T>(naematel: string, rabota: () => Promise<T>) => Promise<T>)
  | undefined {
  const locks = (navigator as { locks?: LockManager }).locks;
  if (!locks) return undefined;
  return <T>(naematel: string, rabota: () => Promise<T>): Promise<T> =>
    locks.request(`masterbook:vrata:${naematel}`, rabota) as Promise<T>;
}

/** За човешки очи: 3 481 600 → „3,3 МБ". */
export function kolkoMyasto(baytove: number): string {
  if (baytove < 0) return '—';
  if (baytove < 1024) return `${baytove} Б`;
  if (baytove < 1024 * 1024) return `${(baytove / 1024).toFixed(1).replace('.', ',')} КБ`;
  return `${(baytove / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
}
